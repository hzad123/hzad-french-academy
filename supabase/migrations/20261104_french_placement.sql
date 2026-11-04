-- Additive placement assessment. Apply only after review; no production data edits.
begin;
create schema if not exists academy_placement;
revoke all on schema academy_placement from public, anon, authenticated;

create table academy_placement.questions (
 version text not null,
 position integer not null check (position between 1 and 56),
 id text not null,
 level text not null check (level in ('A0','A1','A2','B1','B2','C1','C2')),
 skill text not null check (skill in ('grammar','vocabulary','reading','listening')),
 prompt text not null,
 options jsonb not null check (jsonb_array_length(options)=4),
 answer integer not null check (answer between 0 and 3),
 audio_text text,
 primary key(version,position), unique(version,id)
);
create table academy_placement.attempts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 version text not null default 'fr-placement-2026-11-v1',
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 status text not null default 'active' check (status in ('active','completed','expired')),
 next_position integer not null default 1 check (next_position between 1 and 57),
 answers jsonb not null default '{}'::jsonb,
 result jsonb
);
create unique index academy_placement_one_active on academy_placement.attempts(user_id) where status='active';
create index academy_placement_history on academy_placement.attempts(user_id,started_at desc);
alter table academy_placement.questions enable row level security;
alter table academy_placement.attempts enable row level security;
revoke all on all tables in schema academy_placement from public, anon, authenticated;

-- Email verification and current purchase authorization are checked on EVERY RPC.
create function academy_placement.require_access() returns uuid
language plpgsql stable security definer set search_path=''
as $$
declare u uuid := auth.uid();
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null)
    or not public.academy_has_access() then
   raise exception 'Verified email and active academy access required' using errcode='42501';
 end if;
 return u;
end;
$$;

-- Internal deterministic policy: each stage has 8 items / 2 per skill.
-- A stage is mastered at >=6/8 AND >=1/2 in EVERY skill. Prerequisites are
-- contiguous. With transcript fallback, listening is excluded; >=5/6 across
-- the other three skills and >=1/2 each gives a provisional recommendation.
create function academy_placement.score(p_version text,p_answers jsonb) returns jsonb
language plpgsql stable set search_path=''
as $$
declare
 lev text; sk text; levels text[]:=array['A0','A1','A2','B1','B2','C1','C2'];
 passed integer:=0; n integer; c integer; heard integer; stage_ok boolean;
 skills jsonb:='{}'; stages jsonb:='[]'; st jsonb; total_n integer; total_c integer;
 provisional boolean:=false; boundary boolean:=false;
begin
 foreach sk in array array['grammar','vocabulary','reading','listening'] loop
  select count(*),count(*) filter(where (p_answers->q.id->>'choice')::integer=q.answer)
  into n,c from academy_placement.questions q
  where q.version=p_version and p_answers ? q.id
    and q.skill=sk and (sk<>'listening' or p_answers->q.id->>'mode'='audio');
  skills:=skills||jsonb_build_object(sk,jsonb_build_object('correct',c,'total',n,'percent',case when n>0 then round(100.0*c/n) else null end));
 end loop;
 foreach lev in array levels loop
  select count(*) into n from academy_placement.questions q where q.version=p_version and q.level=lev and p_answers ? q.id;
  if n<>8 then exit; end if;
  select count(*) into heard from academy_placement.questions q where q.version=p_version and q.level=lev
    and q.skill='listening' and p_answers->q.id->>'mode'='audio';
  provisional:=provisional or heard<>2;
  total_n:=0;total_c:=0;stage_ok:=true;st:='{}';
  foreach sk in array array['grammar','vocabulary','reading','listening'] loop
   if sk='listening' and heard<>2 then continue; end if;
   select count(*),count(*) filter(where (p_answers->q.id->>'choice')::integer=q.answer)
    into n,c from academy_placement.questions q where q.version=p_version and q.level=lev and q.skill=sk and p_answers ? q.id;
   total_n:=total_n+n; total_c:=total_c+c;stage_ok:=stage_ok and n=2 and c>=1;
   st:=st||jsonb_build_object(sk,jsonb_build_object('correct',c,'total',n));
  end loop;
  stage_ok:=stage_ok and total_c>=case when heard=2 then 6 else 5 end;
  stages:=stages||jsonb_build_array(jsonb_build_object('level',lev,'correct',total_c,'total',total_n,'mastered',stage_ok,'skills',st));
  if not stage_ok then
   boundary:=total_c>=case when heard=2 then 5 else 4 end;
   exit;
  end if;
  passed:=passed+1;
 end loop;
 return jsonb_build_object('recommendedLevel',levels[least(passed+1,7)],'skills',skills,'stages',stages,
   'provisional',provisional,'boundary',boundary,
   'rationale',case when passed=7 then 'Strong evidence across all seven stages. Begin C2 and review any weaker skills.'
    when boundary then 'Evidence is near a mastery boundary or uneven across skills. Start conservatively at this level and review your weaker skills.'
    else 'Begin at the first stage without consistent prerequisite mastery. Higher-level strengths do not replace foundational evidence.' end,
   'notice','This is a recommended learning starting point, not an official CEFR certificate. Speaking and writing were not assessed.');
end;
$$;

create function academy_placement.state(p_attempt uuid default null) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare u uuid:=academy_placement.require_access(); a academy_placement.attempts; q academy_placement.questions; history jsonb;
begin
 if p_attempt is null then
  select * into a from academy_placement.attempts where user_id=u order by (status='active') desc,started_at desc limit 1;
 else
  select * into a from academy_placement.attempts where id=p_attempt and user_id=u;
  if not found then raise exception 'Attempt not found' using errcode='42501'; end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'startedAt',h.started_at,'status',h.status,'result',h.result) order by h.started_at desc),'[]') into history
  from (select * from academy_placement.attempts where user_id=u order by started_at desc limit 20) h;
 if a.id is null then return jsonb_build_object('attempt',null,'history',history); end if;
 if a.status='active' and a.started_at<now()-interval '7 days' then
  update academy_placement.attempts set status='expired' where id=a.id;
  a.status:='expired';
 end if;
 if a.status='active' then
  select * into strict q from academy_placement.questions where version=a.version and position=a.next_position;
 end if;
 return jsonb_build_object('attempt',jsonb_build_object('id',a.id,'version',a.version,'startedAt',a.started_at,'status',a.status,
  'answered',a.next_position-1,'maximum',56,'result',a.result,
  'question',case when q.id is null then null else jsonb_build_object('id',q.id,'level',q.level,'skill',q.skill,'prompt',q.prompt,'options',q.options,'audioText',q.audio_text) end),'history',history);
end;
$$;

create function academy_placement.start() returns jsonb
language plpgsql security definer set search_path=''
as $$
declare u uuid:=academy_placement.require_access(); a uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(u::text,71204));
 update academy_placement.attempts set status='expired' where user_id=u and status='active' and started_at<now()-interval '7 days';
 select id into a from academy_placement.attempts where user_id=u and status='active';
 if a is not null then return academy_placement.state(a); end if;
 if (select count(*) from academy_placement.attempts where user_id=u and started_at>now()-interval '24 hours')>=3 then
  raise exception 'Limit: three new placement attempts per rolling 24 hours. Please return later.' using errcode='P0001';
 end if;
 if (select count(*) from academy_placement.questions where version='fr-placement-2026-11-v1')<>56 then raise exception 'Placement bank unavailable'; end if;
 insert into academy_placement.attempts(user_id) values(u) returning id into a;
 return academy_placement.state(a);
end;
$$;

create function academy_placement.answer(p_attempt uuid,p_question text,p_choice integer,p_mode text default 'standard') returns jsonb
language plpgsql security definer set search_path=''
as $$
declare u uuid:=academy_placement.require_access(); a academy_placement.attempts; q academy_placement.questions; r jsonb; entry jsonb; pos integer;
begin
 -- Row lock serializes duplicate/concurrent answers; the first valid answer wins.
 select * into a from academy_placement.attempts where id=p_attempt and user_id=u for update;
 if not found then raise exception 'Attempt not found' using errcode='42501'; end if;
 if p_choice is null or p_choice not between 0 and 3 or p_mode is null or p_mode not in ('standard','audio','transcript') then raise exception 'Invalid answer'; end if;
 entry:=jsonb_build_object('choice',p_choice,'mode',p_mode);
 if a.answers ? p_question then
  if a.answers->p_question=entry then return academy_placement.state(a.id); end if;
  raise exception 'Answer already recorded';
 end if;
 if a.status<>'active' or a.started_at<now()-interval '7 days' then raise exception 'Attempt is not active'; end if;
 select * into q from academy_placement.questions where version=a.version and position=a.next_position and id=p_question;
 if not found then raise exception 'Question is not eligible'; end if;
 if (q.skill='listening' and p_mode='standard') or (q.skill<>'listening' and p_mode<>'standard') then raise exception 'Invalid answer mode'; end if;
 a.answers:=a.answers||jsonb_build_object(p_question,entry);pos:=a.next_position+1;
 if q.position%8=0 then
  r:=academy_placement.score(a.version,a.answers);
  if not (r->'stages'->-1->>'mastered')::boolean or q.position=56 then
   a.status:='completed';
  else r:=null; end if;
 end if;
 update academy_placement.attempts set answers=a.answers,next_position=pos,status=a.status,result=r,
  completed_at=case when a.status='completed' then now() else null end where id=a.id;
 return academy_placement.state(a.id);
end;
$$;

-- Public Data API exposes invoker wrappers only. Privileged implementations
-- live in a non-exposed schema; even direct SQL calls recheck identity/access.
create function public.academy_placement_state(p_attempt uuid default null) returns jsonb
 language sql security invoker set search_path='' as $$select academy_placement.state(p_attempt)$$;
create function public.academy_placement_start() returns jsonb
 language sql security invoker set search_path='' as $$select academy_placement.start()$$;
create function public.academy_placement_answer(p_attempt uuid,p_question text,p_choice integer,p_mode text default 'standard') returns jsonb
 language sql security invoker set search_path='' as $$select academy_placement.answer(p_attempt,p_question,p_choice,p_mode)$$;
revoke all on all functions in schema academy_placement from public,anon,authenticated;
grant usage on schema academy_placement to authenticated;
grant execute on function academy_placement.state(uuid),academy_placement.start(),academy_placement.answer(uuid,text,integer,text) to authenticated;
revoke all on function public.academy_placement_state(uuid) from public,anon;
revoke all on function public.academy_placement_start() from public,anon;
revoke all on function public.academy_placement_answer(uuid,text,integer,text) from public,anon;
grant execute on function public.academy_placement_state(uuid),public.academy_placement_start(),public.academy_placement_answer(uuid,text,integer,text) to authenticated;

-- The versioned seed below is generated from supabase/placement/bank-v1.json.
insert into academy_placement.questions(version,position,id,level,skill,prompt,options,answer,audio_text) values
('fr-placement-2026-11-v1','1','fr-v1-1','A0','grammar','Je ___ Léa.','["suis","est","sommes","êtes"]','0',null),
('fr-placement-2026-11-v1','2','fr-v1-2','A0','grammar','___ livre est bleu.','["Une","Les","Le","Des"]','2',null),
('fr-placement-2026-11-v1','3','fr-v1-3','A0','vocabulary','Which word means ‘thank you’?','["Demain","Merci","Ici","Jamais"]','1',null),
('fr-placement-2026-11-v1','4','fr-v1-4','A0','vocabulary','Which number is trois?','["2","4","5","3"]','3',null),
('fr-placement-2026-11-v1','5','fr-v1-5','A0','reading','Lina écrit : « Bonjour ! Je m’appelle Lina. » Quel est son prénom ?','["Bonjour","Lina","Madame","Salut"]','1',null),
('fr-placement-2026-11-v1','6','fr-v1-6','A0','reading','Sur la porte : « Café ouvert ». Le café est…','["fermé","loin","ouvert","cher"]','2',null),
('fr-placement-2026-11-v1','7','fr-v1-7','A0','listening','Quel prénom entendez-vous ?','["Paul","Luc","Marc","Hugo"]','0','Bonjour, je m’appelle Paul.'),
('fr-placement-2026-11-v1','8','fr-v1-8','A0','listening','Quel mot de politesse termine le message ?','["Bonjour","Pardon","Merci","Bonsoir"]','2','Un café, s’il vous plaît. Merci.'),
('fr-placement-2026-11-v1','9','fr-v1-9','A1','grammar','Nous ___ à Montréal.','["habite","habites","habitent","habitons"]','3',null),
('fr-placement-2026-11-v1','10','fr-v1-10','A1','grammar','Je ne mange ___ viande.','["pas de","pas des","pas du","pas la de"]','0',null),
('fr-placement-2026-11-v1','11','fr-v1-11','A1','vocabulary','Pour acheter du pain, je vais à la…','["piscine","boulangerie","gare","mairie"]','1',null),
('fr-placement-2026-11-v1','12','fr-v1-12','A1','vocabulary','Le contraire de ‘petit’ est…','["jeune","court","grand","lent"]','2',null),
('fr-placement-2026-11-v1','13','fr-v1-13','A1','reading','« Le cours commence à neuf heures. Arrivez dix minutes avant. » À quelle heure faut-il arriver ?','["8 h 50","9 h 10","10 h","9 h 50"]','0',null),
('fr-placement-2026-11-v1','14','fr-v1-14','A1','reading','« Je travaille du lundi au vendredi. Le samedi, je visite ma sœur. » Quand a lieu la visite ?','["Lundi","Vendredi","Dimanche","Samedi"]','3',null),
('fr-placement-2026-11-v1','15','fr-v1-15','A1','listening','Où faut-il attendre ?','["Au parc","Devant la gare","À la banque","Au café"]','1','Le train arrive bientôt. Attends-moi devant la gare.'),
('fr-placement-2026-11-v1','16','fr-v1-16','A1','listening','Combien de billets souhaite la personne ?','["Un","Trois","Deux","Quatre"]','2','Bonjour, je voudrais deux billets pour Lyon, s’il vous plaît.'),
('fr-placement-2026-11-v1','17','fr-v1-17','A2','grammar','Hier, elles ___ au marché.','["sont allées","ont allé","sont allé","allaient demain"]','0',null),
('fr-placement-2026-11-v1','18','fr-v1-18','A2','grammar','Tu connais Marie ? Oui, je ___ connais.','["lui","y","en","la"]','3',null),
('fr-placement-2026-11-v1','19','fr-v1-19','A2','vocabulary','Un billet aller-retour permet de…','["voyager gratuitement","revenir au point de départ","changer de nom","réserver un hôtel"]','1',null),
('fr-placement-2026-11-v1','20','fr-v1-20','A2','vocabulary','Si vous êtes en retard, vous arrivez…','["avant l’heure prévue","sans bagage","après l’heure prévue","au bon endroit"]','2',null),
('fr-placement-2026-11-v1','21','fr-v1-21','A2','reading','« La bibliothèque ferme à 18 h, sauf le jeudi où elle reste ouverte jusqu’à 20 h. » Quand peut-on y aller à 19 h ?','["Lundi","Samedi","Mardi","Jeudi"]','3',null),
('fr-placement-2026-11-v1','22','fr-v1-22','A2','reading','« Appartement à louer dès juin. Animaux acceptés, parking non compris. » Que faut-il payer séparément ?','["Les animaux","Le stationnement","Le mois de juin","La visite"]','1',null),
('fr-placement-2026-11-v1','23','fr-v1-23','A2','listening','Pourquoi le rendez-vous change-t-il ?','["Le médecin est absent","Le patient déménage","Le cabinet ferme définitivement","Le bus est en panne"]','0','Votre médecin sera absent mardi. Nous vous proposons un rendez-vous mercredi matin à la place.'),
('fr-placement-2026-11-v1','24','fr-v1-24','A2','listening','Que doit apporter la personne ?','["Son ordinateur","Une photo","Une pièce d’identité","Un repas"]','2','Pour retirer votre colis, venez avant dix-sept heures avec une pièce d’identité.'),
('fr-placement-2026-11-v1','25','fr-v1-25','B1','grammar','Si j’avais plus de temps, je ___ une association.','["rejoindrai","rejoins","rejoindrais","ai rejoint"]','2',null),
('fr-placement-2026-11-v1','26','fr-v1-26','B1','grammar','C’est le collègue ___ je t’ai parlé.','["dont","que","où","lequel"]','0',null),
('fr-placement-2026-11-v1','27','fr-v1-27','B1','vocabulary','‘Reporter une réunion’ signifie…','["en rédiger le compte rendu","la rendre publique","y participer à distance","la déplacer à une date ultérieure"]','3',null),
('fr-placement-2026-11-v1','28','fr-v1-28','B1','vocabulary','Une personne fiable est quelqu’un…','["qui change souvent d’avis","sur qui on peut compter","qui parle très fort","qui arrive par hasard"]','1',null),
('fr-placement-2026-11-v1','29','fr-v1-29','B1','reading','« Le télétravail m’épargne deux heures de transport. Pourtant, les échanges spontanés avec mes collègues me manquent ; je souhaite donc revenir au bureau deux jours par semaine. » Quelle solution est préférée ?','["Un travail entièrement à distance","Un changement de métier","Une organisation hybride","Un bureau plus éloigné"]','2',null),
('fr-placement-2026-11-v1','30','fr-v1-30','B1','reading','« Les inscriptions restent ouvertes jusqu’au 15 mai, mais les places sont attribuées dans l’ordre des dossiers complets. Un dossier incomplet ne réserve aucune place. » Que faut-il faire pour être prioritaire ?','["Envoyer tôt un dossier complet","Envoyer seulement son nom","Attendre le dernier jour","Payer après la clôture"]','0',null),
('fr-placement-2026-11-v1','31','fr-v1-31','B1','listening','Quel compromis est proposé ?','["Annuler toute la sortie","Changer de ville","Partir malgré la pluie","Visiter le musée avant de décider pour le parc"]','3','On annonce de la pluie le matin, mais le ciel devrait se dégager. Commençons par le musée ; nous déciderons ensuite si nous allons au parc.'),
('fr-placement-2026-11-v1','32','fr-v1-32','B1','listening','Quelle est l’intention de la personne ?','["Refuser définitivement","Accepter sous réserve d’un changement d’horaire","Demander une augmentation","Proposer de travailler seule"]','1','Le projet m’intéresse et je veux bien participer, à condition de décaler nos réunions après seize heures.'),
('fr-placement-2026-11-v1','33','fr-v1-33','B2','grammar','Bien qu’il ___ compétent, il demande conseil.','["est","soit","sera","serait"]','1',null),
('fr-placement-2026-11-v1','34','fr-v1-34','B2','grammar','Les mesures qu’elle a ___ ont réduit les délais.','["pris","prise","prendre","prises"]','3',null),
('fr-placement-2026-11-v1','35','fr-v1-35','B2','vocabulary','‘Nuancer une affirmation’, c’est…','["en préciser les limites","la répéter plus fort","la traduire mot à mot","la retirer sans explication"]','0',null),
('fr-placement-2026-11-v1','36','fr-v1-36','B2','vocabulary','Un effet ‘à double tranchant’ peut…','["être uniquement bénéfique","être mesuré deux fois","présenter des avantages et des risques","être sans conséquence"]','2',null),
('fr-placement-2026-11-v1','37','fr-v1-37','B2','reading','« La gratuité des transports peut séduire. Toutefois, si elle réduit les recettes sans financement de remplacement, elle risque d’espacer les passages. Le prix ne saurait donc être l’unique levier d’attractivité. » Quelle thèse est défendue ?','["La gratuité garantit la fréquentation","La qualité du service doit aussi être financée","Les transports devraient disparaître","Les recettes sont inutiles"]','1',null),
('fr-placement-2026-11-v1','38','fr-v1-38','B2','reading','« Une enquête menée auprès des seuls abonnés conclut que le journal représente fidèlement l’opinion publique. Or les non-lecteurs, absents de l’échantillon, pourraient avoir des opinions différentes. » Quelle limite est soulignée ?','["Le coût du papier","L’absence de date","Le nombre de journalistes","Un biais de sélection"]','3',null),
('fr-placement-2026-11-v1','39','fr-v1-39','B2','listening','Quelle réserve exprime l’intervenante ?','["Le résultat ne suffit pas à prouver un lien causal","Les chiffres sont tous inventés","La mesure est trop ancienne","Les participants sont anonymes"]','0','Les ventes ont augmenté après la campagne. Cela reste encourageant, mais la saison touristique a commencé au même moment : attribuer toute la hausse à la publicité serait prématuré.'),
('fr-placement-2026-11-v1','40','fr-v1-40','B2','listening','Que recommande l’intervenant ?','["Généraliser immédiatement","Supprimer l’évaluation","Tester à petite échelle avant d’étendre","Abandonner toute innovation"]','2','Le dispositif semble prometteur. Je suggère pourtant de l’expérimenter dans deux quartiers, puis d’en évaluer les effets avant de le généraliser.'),
('fr-placement-2026-11-v1','41','fr-v1-41','C1','grammar','Encore faudrait-il que ces engagements ___ d’effets.','["sont suivis","seraient suivis","soient suivis","ont été suivis"]','2',null),
('fr-placement-2026-11-v1','42','fr-v1-42','C1','grammar','___ ses qualités, cette méthode ne convient pas à tous les contextes.','["Quelles que soient","Quelque soient","Quoi que sont","Quelles que sont"]','0',null),
('fr-placement-2026-11-v1','43','fr-v1-43','C1','vocabulary','Une décision ‘prise à contre-cœur’ est prise…','["avec enthousiasme","sans aucune réflexion","par simple hasard","malgré une réticence personnelle"]','3',null),
('fr-placement-2026-11-v1','44','fr-v1-44','C1','vocabulary','‘Éluder une objection’ signifie…','["la réfuter point par point","éviter de la traiter","en reconnaître la justesse","en préciser la portée"]','1',null),
('fr-placement-2026-11-v1','45','fr-v1-45','C1','reading','« À force de ne valoriser que ce qui se compte, l’évaluation peut rendre invisible ce qui compte : l’entraide informelle ou le temps consacré à un usager. Ce n’est pas la mesure qu’il faut récuser, mais sa prétention à épuiser la valeur du travail. » Quelle position l’auteur adopte-t-il ?','["Rejeter tout indicateur","Réduire le travail aux résultats chiffrés","Employer des indicateurs sans les tenir pour exhaustifs","Remplacer les usagers par des statistiques"]','2',null),
('fr-placement-2026-11-v1','46','fr-v1-46','C1','reading','« L’autonomie annoncée aux équipes s’accompagne d’un contrôle toujours plus fin de leurs procédures. La liberté porte dès lors sur les objectifs que l’on nous fixe, et non sur les moyens que l’on nous laisse choisir. » Quel paradoxe est dénoncé ?','["Une autonomie de façade sous contrôle procédural","Des objectifs laissés entièrement libres","L’absence de procédures","Un refus de toute responsabilité"]','0',null),
('fr-placement-2026-11-v1','47','fr-v1-47','C1','listening','Que suggère la formulation de l’oratrice ?','["Une adhésion sans réserve","Un changement de sujet","Une ignorance du dossier","Une approbation prudente assortie d’une exigence"]','3','Je ne conteste pas l’ambition de la réforme, bien au contraire. Reste à savoir si les moyens annoncés seront à la hauteur ; sans quoi nos promesses risquent de demeurer purement incantatoires.'),
('fr-placement-2026-11-v1','48','fr-v1-48','C1','listening','Quelle distinction est essentielle ?','["Le public et le privé","La consultation et le pouvoir effectif de décision","L’écrit et l’oral","La rapidité et la lenteur"]','1','Multiplier les consultations n’équivaut pas à partager la décision. Tant que les contributions ne peuvent infléchir le projet, la participation demeure davantage un affichage qu’un transfert de pouvoir.'),
('fr-placement-2026-11-v1','49','fr-v1-49','C2','grammar','___-il raison sur le fond, sa manière de procéder resterait contestable.','["A-t","Aura-t","Ait","Eût"]','3',null),
('fr-placement-2026-11-v1','50','fr-v1-50','C2','grammar','Il s’en est fallu de peu que le compromis ne ___ rejeté.','["fut","fût","serait","est"]','1',null),
('fr-placement-2026-11-v1','51','fr-v1-51','C2','vocabulary','‘Donner le change’ signifie ici…','["Donner une impression trompeuse","Rendre la monnaie exacte","Accepter une autre monnaie","Reconnaître ouvertement son erreur"]','0',null),
('fr-placement-2026-11-v1','52','fr-v1-52','C2','vocabulary','Qualifier un éloge de ‘dithyrambique’ en souligne…','["la concision factuelle","le caractère insultant","l’enthousiasme excessif","l’ambiguïté juridique"]','2',null),
('fr-placement-2026-11-v1','53','fr-v1-53','C2','reading','« Notre époque a le goût des ruptures, pourvu qu’elles ne dérangent aucune habitude. On baptise révolution l’ajout d’une option au menu ; le vocabulaire prend ainsi à sa charge le bouleversement que les pratiques se gardent d’accomplir. » Sur quoi repose l’ironie ?','["La disparition des menus","L’impossibilité de toute innovation","L’éloge littéral des nouvelles options","Le décalage entre emphase verbale et continuité réelle"]','3',null),
('fr-placement-2026-11-v1','54','fr-v1-54','C2','reading','« Que l’archive se taise ne prouve pas que l’événement n’eut pas lieu. Mais faire de ce silence la preuve de sa dissimulation reviendrait à transformer toute absence de trace en confirmation de l’hypothèse. » Quelle exigence méthodologique est formulée ?','["Croire tout récit non documenté","Ne pas confondre absence de preuve et preuve positive","Tenir toute archive pour mensongère","Déduire une conspiration de chaque lacune"]','1',null),
('fr-placement-2026-11-v1','55','fr-v1-55','C2','listening','Quelle fonction remplit la concession initiale ?','["Reconnaître un mérite pour mieux circonscrire sa portée","Retirer toute critique","Annoncer une adhésion totale","Introduire une chronologie neutre"]','0','Accordons à ce rapport le mérite de la clarté. C’est précisément cette netteté qui inquiète : elle tient moins à la résolution des contradictions qu’à leur éviction préalable du champ de l’analyse.'),
('fr-placement-2026-11-v1','56','fr-v1-56','C2','listening','Quelle critique implicite vise l’intervenante ?','["Le manque de textes réglementaires","La lenteur des communications","Une conformité formelle qui évite l’examen du fond","Une absence de consensus sur les mots"]','2','Tout est donc conforme, nous dit-on. Voilà qui rassure, à condition de ne pas demander à quoi. Lorsque la procédure devient sa propre justification, l’irréprochable peut fort bien tenir lieu de l’injustifiable.');
commit;

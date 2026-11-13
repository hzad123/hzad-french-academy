-- Standalone TCF listening pilot: original recordings, server clock and raw marking.
-- No existing academy data, entitlements, prices, wallets or policies are changed.
begin;
create schema academy_tcf_listening;
revoke all on schema academy_tcf_listening from public,anon,authenticated,service_role;
create table academy_tcf_listening.papers(
 id text not null,version text not null,content jsonb not null,
 primary key(id,version),
 check(jsonb_typeof(content->'questions')='array' and jsonb_array_length(content->'questions')=39 and (content->>'seconds')::integer=2100)
);
create table academy_tcf_listening.attempts(
 id uuid primary key,user_id uuid not null references auth.users(id),
 test_id text not null,version text not null,
 status text not null default 'active' check(status in ('active','completed')),
 answers jsonb not null default '{}' check(jsonb_typeof(answers)='object'),
 revision integer not null default 0,
 started_at timestamptz not null default now(),
 deadline timestamptz not null default now()+interval '35 minutes',
 submitted_at timestamptz,result jsonb,
 foreign key(test_id,version) references academy_tcf_listening.papers(id,version),
 check((status='active' and submitted_at is null and result is null) or (status='completed' and submitted_at is not null and result is not null))
);
create unique index listening_one_active on academy_tcf_listening.attempts(user_id,test_id,version) where status='active';
create index listening_owned_history on academy_tcf_listening.attempts(user_id,started_at desc);
alter table academy_tcf_listening.papers enable row level security;
alter table academy_tcf_listening.attempts enable row level security;
revoke all on all tables in schema academy_tcf_listening from public,anon,authenticated,service_role;
create function academy_tcf_listening.freeze_paper() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Listening paper is immutable';end;$$;
create trigger listening_paper_immutable before update or delete on academy_tcf_listening.papers for each row execute function academy_tcf_listening.freeze_paper();
create function academy_tcf_listening.freeze_identity() returns trigger language plpgsql set search_path='' as $$
begin
 if (new.id,new.user_id,new.test_id,new.version) is distinct from (old.id,old.user_id,old.test_id,old.version) then raise exception 'Listening attempt identity is immutable';end if;
 return new;
end;$$;
create trigger listening_identity_immutable before update on academy_tcf_listening.attempts for each row execute function academy_tcf_listening.freeze_identity();

insert into academy_tcf_listening.papers(id,version,content) values('tcf-listening-01','tcf-listening-2026-11-v1',$paper${
  "id": "tcf-listening-01",
  "version": "tcf-listening-2026-11-v1",
  "title": "TCF Listening · Test 01",
  "seconds": 2100,
  "questions": [
    {
      "number": 1,
      "kind": "image",
      "question": "Quelle proposition correspond à l'image ?",
      "options": [
        "Proposition A",
        "Proposition B",
        "Proposition C",
        "Proposition D"
      ],
      "correct": "B",
      "transcript": "Question 1.\nÉcoutez les quatre propositions. Choisissez celle qui correspond à l'image. A. Il prépare le repas. B. Il porte des sacs de courses. C. Il lit un journal. D. Il dort sur le canapé.",
      "explanation": "La proposition B décrit l'homme qui porte deux sacs de courses. Il ne cuisine pas, ne lit pas et ne dort pas.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 1."
        },
        {
          "voice": "female",
          "text": "Écoutez les quatre propositions. Choisissez celle qui correspond à l'image. A. Il prépare le repas. B. Il porte des sacs de courses. C. Il lit un journal. D. Il dort sur le canapé."
        }
      ],
      "image": "q-01.svg",
      "audio": "q-01.mp3",
      "audioSeconds": 17.293,
      "slotSeconds": 35
    },
    {
      "number": 2,
      "kind": "image",
      "question": "Quelle proposition correspond à l'image ?",
      "options": [
        "Proposition A",
        "Proposition B",
        "Proposition C",
        "Proposition D"
      ],
      "correct": "D",
      "transcript": "Question 2.\nÉcoutez les quatre propositions. A. Elle ouvre sa valise. B. Elle lave une assiette. C. Elle conduit une voiture. D. Elle arrose une plante.",
      "explanation": "La proposition D correspond à la femme qui arrose une plante avec un arrosoir.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 2."
        },
        {
          "voice": "female",
          "text": "Écoutez les quatre propositions. A. Elle ouvre sa valise. B. Elle lave une assiette. C. Elle conduit une voiture. D. Elle arrose une plante."
        }
      ],
      "image": "q-02.svg",
      "audio": "q-02.mp3",
      "audioSeconds": 13.662,
      "slotSeconds": 31
    },
    {
      "number": 3,
      "kind": "image",
      "question": "Quelle proposition correspond à l'image ?",
      "options": [
        "Proposition A",
        "Proposition B",
        "Proposition C",
        "Proposition D"
      ],
      "correct": "A",
      "transcript": "Question 3.\nÉcoutez les quatre propositions. A. Ils jouent aux échecs. B. Ils attendent le bus. C. Ils font la cuisine. D. Ils courent dans le parc.",
      "explanation": "Les deux personnes sont assises face à un échiquier. La proposition A est donc la bonne.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 3."
        },
        {
          "voice": "male",
          "text": "Écoutez les quatre propositions. A. Ils jouent aux échecs. B. Ils attendent le bus. C. Ils font la cuisine. D. Ils courent dans le parc."
        }
      ],
      "image": "q-03.svg",
      "audio": "q-03.mp3",
      "audioSeconds": 14.315,
      "slotSeconds": 32
    },
    {
      "number": 4,
      "kind": "image",
      "question": "Quelle proposition correspond à l'image ?",
      "options": [
        "Proposition A",
        "Proposition B",
        "Proposition C",
        "Proposition D"
      ],
      "correct": "C",
      "transcript": "Question 4.\nÉcoutez les quatre propositions. A. Elle peint un mur. B. Elle descend un escalier. C. Elle gonfle le pneu de son vélo. D. Elle range ses vêtements.",
      "explanation": "La personne utilise une pompe reliée à la roue du vélo : elle gonfle le pneu.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 4."
        },
        {
          "voice": "female",
          "text": "Écoutez les quatre propositions. A. Elle peint un mur. B. Elle descend un escalier. C. Elle gonfle le pneu de son vélo. D. Elle range ses vêtements."
        }
      ],
      "image": "q-04.svg",
      "audio": "q-04.mp3",
      "audioSeconds": 14.629,
      "slotSeconds": 32
    },
    {
      "number": 5,
      "kind": "response",
      "question": "Quelle réponse convient à la situation ?",
      "options": [
        "Réponse A",
        "Réponse B",
        "Réponse C",
        "Réponse D"
      ],
      "correct": "A",
      "transcript": "Question 5.\nBonjour, cette place est libre ?\nA. Oui, vous pouvez vous asseoir. B. Il est trois heures. C. Je préfère le café. D. Elle habite à Lyon.",
      "explanation": "À la demande d'une place libre, la réponse A accepte que la personne s'assoie. Les autres réponses ne répondent pas à cette demande.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 5."
        },
        {
          "voice": "male",
          "text": "Bonjour, cette place est libre ?"
        },
        {
          "voice": "female",
          "text": "A. Oui, vous pouvez vous asseoir. B. Il est trois heures. C. Je préfère le café. D. Elle habite à Lyon."
        }
      ],
      "audio": "q-05.mp3",
      "audioSeconds": 14.916,
      "slotSeconds": 32
    },
    {
      "number": 6,
      "kind": "response",
      "question": "Quelle réponse convient à la situation ?",
      "options": [
        "Réponse A",
        "Réponse B",
        "Réponse C",
        "Réponse D"
      ],
      "correct": "C",
      "transcript": "Question 6.\nExcusez-moi, où est l'arrêt du bus vingt-deux ?\nA. Je suis arrivé hier. B. Il coûte deux euros. C. Juste devant la pharmacie. D. Non, merci, j'ai déjà mangé.",
      "explanation": "La personne demande où se trouve l'arrêt de bus. La réponse C lui indique un lieu : devant la pharmacie.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 6."
        },
        {
          "voice": "female",
          "text": "Excusez-moi, où est l'arrêt du bus vingt-deux ?"
        },
        {
          "voice": "male",
          "text": "A. Je suis arrivé hier. B. Il coûte deux euros. C. Juste devant la pharmacie. D. Non, merci, j'ai déjà mangé."
        }
      ],
      "audio": "q-06.mp3",
      "audioSeconds": 17.659,
      "slotSeconds": 35
    },
    {
      "number": 7,
      "kind": "response",
      "question": "Quelle réponse convient à la situation ?",
      "options": [
        "Réponse A",
        "Réponse B",
        "Réponse C",
        "Réponse D"
      ],
      "correct": "D",
      "transcript": "Question 7.\nTu veux venir marcher avec nous dimanche matin ?\nA. C'est au deuxième étage. B. Je cherche mon billet. C. Il en reste dans le réfrigérateur. D. Avec plaisir ! On se retrouve à neuf heures ?",
      "explanation": "L'invitation porte sur une promenade dimanche matin. La réponse D accepte et propose une heure de rendez-vous.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 7."
        },
        {
          "voice": "male",
          "text": "Tu veux venir marcher avec nous dimanche matin ?"
        },
        {
          "voice": "female",
          "text": "A. C'est au deuxième étage. B. Je cherche mon billet. C. Il en reste dans le réfrigérateur. D. Avec plaisir ! On se retrouve à neuf heures ?"
        }
      ],
      "audio": "q-07.mp3",
      "audioSeconds": 17.685,
      "slotSeconds": 36
    },
    {
      "number": 8,
      "kind": "response",
      "question": "Quelle réponse convient à la situation ?",
      "options": [
        "Réponse A",
        "Réponse B",
        "Réponse C",
        "Réponse D"
      ],
      "correct": "B",
      "transcript": "Question 8.\nCette chemise est trop petite. Est-ce que je peux l'échanger ?\nA. Le train part dans dix minutes. B. Bien sûr, je vais chercher la taille au-dessus. C. Non, je n'aime pas le thé. D. Il fait beau aujourd'hui.",
      "explanation": "La cliente demande à échanger une chemise trop petite. La réponse B propose la taille supérieure.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 8."
        },
        {
          "voice": "female",
          "text": "Cette chemise est trop petite. Est-ce que je peux l'échanger ?"
        },
        {
          "voice": "male",
          "text": "A. Le train part dans dix minutes. B. Bien sûr, je vais chercher la taille au-dessus. C. Non, je n'aime pas le thé. D. Il fait beau aujourd'hui."
        }
      ],
      "audio": "q-08.mp3",
      "audioSeconds": 18.39,
      "slotSeconds": 37
    },
    {
      "number": 9,
      "kind": "announcement",
      "question": "Où les voyageurs doivent-ils attendre le train ?",
      "options": [
        "Sur le quai deux.",
        "Devant la gare.",
        "Sur le quai quatre.",
        "Dans le parking."
      ],
      "correct": "C",
      "transcript": "Question 9.\nVotre attention, s'il vous plaît. Le train pour Tours, prévu à dix heures vingt sur le quai deux, arrivera sur le quai quatre. Son heure de départ ne change pas. Merci de rejoindre ce nouveau quai.\nOù les voyageurs doivent-ils attendre le train ?",
      "explanation": "L'annonce précise que le train arrive désormais sur le quai quatre, et non sur le quai deux.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 9."
        },
        {
          "voice": "female",
          "text": "Votre attention, s'il vous plaît. Le train pour Tours, prévu à dix heures vingt sur le quai deux, arrivera sur le quai quatre. Son heure de départ ne change pas. Merci de rejoindre ce nouveau quai."
        },
        {
          "voice": "female",
          "text": "Où les voyageurs doivent-ils attendre le train ?"
        }
      ],
      "audio": "q-09.mp3",
      "audioSeconds": 17.345,
      "slotSeconds": 36
    },
    {
      "number": 10,
      "kind": "dialogue",
      "question": "À quelle heure les deux amis vont-ils se retrouver ?",
      "options": [
        "À dix-huit heures.",
        "À dix-neuf heures.",
        "À dix-neuf heures trente.",
        "À vingt heures."
      ],
      "correct": "B",
      "transcript": "Question 10.\nOn se retrouve à dix-huit heures devant le cinéma ?\nJe termine mon travail à dix-huit heures trente. Dix-neuf heures, ce serait mieux.\nD'accord, à dix-neuf heures. Je prendrai les billets avant ton arrivée.\nÀ quelle heure les deux amis vont-ils se retrouver ?",
      "explanation": "La première heure proposée est dix-huit heures, mais les amis choisissent finalement dix-neuf heures.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 10."
        },
        {
          "voice": "male",
          "text": "On se retrouve à dix-huit heures devant le cinéma ?"
        },
        {
          "voice": "female",
          "text": "Je termine mon travail à dix-huit heures trente. Dix-neuf heures, ce serait mieux."
        },
        {
          "voice": "male",
          "text": "D'accord, à dix-neuf heures. Je prendrai les billets avant ton arrivée."
        },
        {
          "voice": "female",
          "text": "À quelle heure les deux amis vont-ils se retrouver ?"
        }
      ],
      "audio": "q-10.mp3",
      "audioSeconds": 20.14,
      "slotSeconds": 39
    },
    {
      "number": 11,
      "kind": "announcement",
      "question": "Que faut-il apporter pour participer à l’atelier ?",
      "options": [
        "Des ciseaux.",
        "Un repas.",
        "Un ordinateur.",
        "Un vêtement à réparer."
      ],
      "correct": "D",
      "transcript": "Question 11.\nSamedi, notre atelier de réparation ouvre à quatorze heures. Nous fournissons les aiguilles, le fil et les ciseaux. Apportez simplement un vêtement que vous voulez réparer. L'inscription est gratuite, mais les places sont limitées.\nQue faut-il apporter pour participer à l’atelier ?",
      "explanation": "Les outils sont fournis ; les participants doivent seulement apporter un vêtement à réparer.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 11."
        },
        {
          "voice": "male",
          "text": "Samedi, notre atelier de réparation ouvre à quatorze heures. Nous fournissons les aiguilles, le fil et les ciseaux. Apportez simplement un vêtement que vous voulez réparer. L'inscription est gratuite, mais les places sont limitées."
        },
        {
          "voice": "female",
          "text": "Que faut-il apporter pour participer à l’atelier ?"
        }
      ],
      "audio": "q-11.mp3",
      "audioSeconds": 21.995,
      "slotSeconds": 40
    },
    {
      "number": 12,
      "kind": "dialogue",
      "question": "Pourquoi la cliente revient-elle au magasin ?",
      "options": [
        "Pour récupérer une commande.",
        "Pour demander un remboursement.",
        "Pour acheter un cadeau.",
        "Pour signaler une erreur de prix."
      ],
      "correct": "A",
      "transcript": "Question 12.\nBonjour, j'ai reçu votre message pour ma lampe.\nVous venez la chercher ? Elle est prête, au comptoir du fond.\nParfait. Je l'ai déjà payée en ligne. Voici le numéro de ma commande.\nPourquoi la cliente revient-elle au magasin ?",
      "explanation": "La cliente a déjà payé sa lampe et vient la récupérer après avoir reçu le message du magasin.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 12."
        },
        {
          "voice": "female",
          "text": "Bonjour, j'ai reçu votre message pour ma lampe."
        },
        {
          "voice": "male",
          "text": "Vous venez la chercher ? Elle est prête, au comptoir du fond."
        },
        {
          "voice": "female",
          "text": "Parfait. Je l'ai déjà payée en ligne. Voici le numéro de ma commande."
        },
        {
          "voice": "female",
          "text": "Pourquoi la cliente revient-elle au magasin ?"
        }
      ],
      "audio": "q-12.mp3",
      "audioSeconds": 19.853,
      "slotSeconds": 38
    },
    {
      "number": 13,
      "kind": "announcement",
      "question": "Quel changement concerne la piscine ?",
      "options": [
        "Le prix d'entrée augmente.",
        "Elle ouvre plus tôt le lundi.",
        "Elle ferme mercredi matin.",
        "Le cours des enfants est annulé toute la semaine."
      ],
      "correct": "C",
      "transcript": "Question 13.\nEn raison d'une intervention technique, la piscine sera fermée mercredi de huit heures à midi. Les cours reprendront à quatorze heures. Les autres jours de la semaine, les horaires habituels seront conservés. Merci de votre compréhension.\nQuel changement concerne la piscine ?",
      "explanation": "La piscine sera fermée mercredi matin pour une intervention. Les activités reprennent à quatorze heures.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 13."
        },
        {
          "voice": "female",
          "text": "En raison d'une intervention technique, la piscine sera fermée mercredi de huit heures à midi. Les cours reprendront à quatorze heures. Les autres jours de la semaine, les horaires habituels seront conservés. Merci de votre compréhension."
        },
        {
          "voice": "female",
          "text": "Quel changement concerne la piscine ?"
        }
      ],
      "audio": "q-13.mp3",
      "audioSeconds": 20.584,
      "slotSeconds": 40
    },
    {
      "number": 14,
      "kind": "dialogue",
      "question": "Qu’est-ce que Paul propose finalement ?",
      "options": [
        "De commander un repas.",
        "De cuisiner avec ce qu'ils ont.",
        "De faire des courses ensemble.",
        "De reporter le dîner."
      ],
      "correct": "B",
      "transcript": "Question 14.\nPaul, je n'ai pas eu le temps de faire les courses. Il n'y a plus de pain.\nCe n'est pas grave. On a des légumes et des pommes de terre. Je peux préparer une soupe.\nBonne idée, je vais mettre la table.\nQu’est-ce que Paul propose finalement ?",
      "explanation": "Paul propose une soupe avec les légumes disponibles. Le manque de pain ne conduit pas à annuler le dîner.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 14."
        },
        {
          "voice": "female",
          "text": "Paul, je n'ai pas eu le temps de faire les courses. Il n'y a plus de pain."
        },
        {
          "voice": "male",
          "text": "Ce n'est pas grave. On a des légumes et des pommes de terre. Je peux préparer une soupe."
        },
        {
          "voice": "female",
          "text": "Bonne idée, je vais mettre la table."
        },
        {
          "voice": "female",
          "text": "Qu’est-ce que Paul propose finalement ?"
        }
      ],
      "audio": "q-14.mp3",
      "audioSeconds": 19.409,
      "slotSeconds": 39
    },
    {
      "number": 15,
      "kind": "announcement",
      "question": "Comment les habitants peuvent-ils donner leur avis ?",
      "options": [
        "En appelant uniquement le maire.",
        "En venant obligatoirement samedi.",
        "En répondant avant la fin de la journée.",
        "En remplissant un formulaire ou en participant à la réunion."
      ],
      "correct": "D",
      "transcript": "Question 15.\nLa mairie prépare l'aménagement de la place des Érables et souhaite connaître vos habitudes. Un formulaire est disponible sur son site et à l'accueil jusqu'au vingt mai. Une réunion aura également lieu samedi à dix heures. Vous n'avez pas besoin d'assister à la réunion pour remplir le formulaire. Les propositions seront ensuite présentées au conseil municipal.\nComment les habitants peuvent-ils donner leur avis ?",
      "explanation": "Deux moyens sont proposés : le formulaire disponible en ligne et à l'accueil, ou la réunion publique.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 15."
        },
        {
          "voice": "male",
          "text": "La mairie prépare l'aménagement de la place des Érables et souhaite connaître vos habitudes. Un formulaire est disponible sur son site et à l'accueil jusqu'au vingt mai. Une réunion aura également lieu samedi à dix heures. Vous n'avez pas besoin d'assister à la réunion pour remplir le formulaire. Les propositions seront ensuite présentées au conseil municipal."
        },
        {
          "voice": "female",
          "text": "Comment les habitants peuvent-ils donner leur avis ?"
        }
      ],
      "audio": "q-15.mp3",
      "audioSeconds": 29.205,
      "slotSeconds": 49
    },
    {
      "number": 16,
      "kind": "dialogue",
      "question": "Pourquoi la responsable modifie-t-elle le planning ?",
      "options": [
        "Pour tenir compte du nouvel horaire d'un collègue.",
        "Pour fermer le service un jour de plus.",
        "Pour supprimer les pauses du personnel.",
        "Pour accueillir moins de clients."
      ],
      "correct": "A",
      "transcript": "Question 16.\nKarim, tu m'as dit que les horaires de la crèche allaient changer ?\nOui, à partir de lundi, je ne pourrai plus être ici avant neuf heures trente.\nAlors, je prendrai l'accueil du matin et tu assureras ma permanence de fin de journée. Comme cela, nous conserverons les mêmes heures d'ouverture.\nMerci, cette organisation me convient.\nPourquoi la responsable modifie-t-elle le planning ?",
      "explanation": "Karim ne peut plus commencer avant neuf heures trente. La responsable déplace sa permanence sans réduire l'ouverture du service.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 16."
        },
        {
          "voice": "female",
          "text": "Karim, tu m'as dit que les horaires de la crèche allaient changer ?"
        },
        {
          "voice": "male",
          "text": "Oui, à partir de lundi, je ne pourrai plus être ici avant neuf heures trente."
        },
        {
          "voice": "female",
          "text": "Alors, je prendrai l'accueil du matin et tu assureras ma permanence de fin de journée. Comme cela, nous conserverons les mêmes heures d'ouverture."
        },
        {
          "voice": "male",
          "text": "Merci, cette organisation me convient."
        },
        {
          "voice": "female",
          "text": "Pourquoi la responsable modifie-t-elle le planning ?"
        }
      ],
      "audio": "q-16.mp3",
      "audioSeconds": 28.97,
      "slotSeconds": 48
    },
    {
      "number": 17,
      "kind": "announcement",
      "question": "Que permet la nouvelle formule de la bibliothèque ?",
      "options": [
        "D'emprunter sans aucune date de retour.",
        "De garder les nouveautés pendant trois mois.",
        "De recevoir des livres à domicile dans certaines situations.",
        "D'acheter les livres empruntés à moitié prix."
      ],
      "correct": "C",
      "transcript": "Question 17.\nLa bibliothèque lance un service de portage pour les habitants qui ont des difficultés à se déplacer, même temporairement. Après un échange sur leurs goûts, un bénévole leur apportera une sélection de livres à domicile. Les prêts restent gratuits et les dates de retour seront convenues avec l'équipe. Pour demander ce service, contactez l'accueil ; une carte de bibliothèque ne suffit pas à déclencher automatiquement une livraison.\nQue permet la nouvelle formule de la bibliothèque ?",
      "explanation": "Le portage concerne les habitants qui ne peuvent pas se déplacer ; un bénévole leur apporte une sélection de livres.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 17."
        },
        {
          "voice": "female",
          "text": "La bibliothèque lance un service de portage pour les habitants qui ont des difficultés à se déplacer, même temporairement. Après un échange sur leurs goûts, un bénévole leur apportera une sélection de livres à domicile. Les prêts restent gratuits et les dates de retour seront convenues avec l'équipe. Pour demander ce service, contactez l'accueil ; une carte de bibliothèque ne suffit pas à déclencher automatiquement une livraison."
        },
        {
          "voice": "female",
          "text": "Que permet la nouvelle formule de la bibliothèque ?"
        }
      ],
      "audio": "q-17.mp3",
      "audioSeconds": 31.19,
      "slotSeconds": 51
    },
    {
      "number": 18,
      "kind": "dialogue",
      "question": "Quelle solution les collègues choisissent-ils pour la présentation ?",
      "options": [
        "La refaire entièrement sur papier.",
        "Utiliser une copie enregistrée sur un ordinateur.",
        "Annuler la réunion prévue.",
        "Demander aux participants de revenir demain."
      ],
      "correct": "B",
      "transcript": "Question 18.\nLa connexion coupe encore. Si nous ouvrons les diapositives en ligne, la présentation va s'interrompre.\nJ'ai enregistré une copie sur mon ordinateur ce matin. Il manque seulement le dernier graphique.\nUtilisons cette version. Je pourrai expliquer le graphique à l'oral et envoyer le document complet après la réunion.\nD'accord, je branche mon ordinateur au projecteur.\nQuelle solution les collègues choisissent-ils pour la présentation ?",
      "explanation": "La connexion fonctionne mal, mais une copie locale des diapositives est disponible. Les collègues vont donc projeter cette version depuis l'ordinateur.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 18."
        },
        {
          "voice": "male",
          "text": "La connexion coupe encore. Si nous ouvrons les diapositives en ligne, la présentation va s'interrompre."
        },
        {
          "voice": "female",
          "text": "J'ai enregistré une copie sur mon ordinateur ce matin. Il manque seulement le dernier graphique."
        },
        {
          "voice": "male",
          "text": "Utilisons cette version. Je pourrai expliquer le graphique à l'oral et envoyer le document complet après la réunion."
        },
        {
          "voice": "female",
          "text": "D'accord, je branche mon ordinateur au projecteur."
        },
        {
          "voice": "female",
          "text": "Quelle solution les collègues choisissent-ils pour la présentation ?"
        }
      ],
      "audio": "q-18.mp3",
      "audioSeconds": 32.575,
      "slotSeconds": 52
    },
    {
      "number": 19,
      "kind": "announcement",
      "question": "Pourquoi le musée propose-t-il une visite en petit groupe ?",
      "options": [
        "Pour vendre davantage de billets.",
        "Pour remplacer les guides absents.",
        "Pour réserver l'exposition aux spécialistes.",
        "Pour faciliter les échanges avec les visiteurs."
      ],
      "correct": "D",
      "transcript": "Question 19.\nÀ partir de ce mois-ci, le musée propose une visite du jeudi limitée à douze personnes. Le guide prendra le temps de répondre aux questions et de discuter des objets que vous aurez envie d'observer. Il ne s'agit pas d'un cours réservé aux spécialistes : aucune connaissance préalable n'est nécessaire. Le tarif habituel s'applique. Pensez toutefois à réserver, car nous ne pourrons pas agrandir le groupe.\nPourquoi le musée propose-t-il une visite en petit groupe ?",
      "explanation": "Les groupes sont réduits afin que chacun puisse poser ses questions et discuter des objets ; aucune connaissance préalable n'est exigée.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 19."
        },
        {
          "voice": "male",
          "text": "À partir de ce mois-ci, le musée propose une visite du jeudi limitée à douze personnes. Le guide prendra le temps de répondre aux questions et de discuter des objets que vous aurez envie d'observer. Il ne s'agit pas d'un cours réservé aux spécialistes : aucune connaissance préalable n'est nécessaire. Le tarif habituel s'applique. Pensez toutefois à réserver, car nous ne pourrons pas agrandir le groupe."
        },
        {
          "voice": "female",
          "text": "Pourquoi le musée propose-t-il une visite en petit groupe ?"
        }
      ],
      "audio": "q-19.mp3",
      "audioSeconds": 30.668,
      "slotSeconds": 51
    },
    {
      "number": 20,
      "kind": "dialogue",
      "question": "Quelle est la principale hésitation de la locataire ?",
      "options": [
        "La durée du trajet vers son travail.",
        "Le montant de la caution.",
        "La taille de la cuisine.",
        "La présence d'un ascenseur."
      ],
      "correct": "A",
      "transcript": "Question 20.\nL'appartement me plaît. La cuisine est lumineuse et le loyer correspond à mon budget.\nVous souhaitez déposer un dossier aujourd'hui ?\nJe voudrais d'abord essayer le trajet en bus demain matin. Sur le plan, ce n'est pas loin de mon travail, mais il y a une correspondance.\nBien sûr. Je vous enverrai les horaires des deux lignes, et nous pourrons nous rappeler ensuite.\nQuelle est la principale hésitation de la locataire ?",
      "explanation": "L'appartement plaît à la locataire, mais elle veut vérifier le temps du trajet en bus avant de s'engager.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 20."
        },
        {
          "voice": "female",
          "text": "L'appartement me plaît. La cuisine est lumineuse et le loyer correspond à mon budget."
        },
        {
          "voice": "male",
          "text": "Vous souhaitez déposer un dossier aujourd'hui ?"
        },
        {
          "voice": "female",
          "text": "Je voudrais d'abord essayer le trajet en bus demain matin. Sur le plan, ce n'est pas loin de mon travail, mais il y a une correspondance."
        },
        {
          "voice": "male",
          "text": "Bien sûr. Je vous enverrai les horaires des deux lignes, et nous pourrons nous rappeler ensuite."
        },
        {
          "voice": "female",
          "text": "Quelle est la principale hésitation de la locataire ?"
        }
      ],
      "audio": "q-20.mp3",
      "audioSeconds": 30.328,
      "slotSeconds": 51
    },
    {
      "number": 21,
      "kind": "announcement",
      "question": "Pourquoi l’association demande-t-elle une inscription préalable ?",
      "options": [
        "Pour vérifier le niveau sportif des participants.",
        "Pour préparer les outils et répartir les tâches.",
        "Pour rendre la journée payante.",
        "Pour sélectionner uniquement les habitants du quartier."
      ],
      "correct": "B",
      "transcript": "Question 21.\nNotre journée de jardinage collectif aura lieu dimanche, de neuf heures à midi. Tous les habitants sont les bienvenus, y compris ceux qui n'ont jamais jardiné. Merci de vous inscrire avant vendredi : nous pourrons prévoir assez d'outils et organiser les petits groupes. Vous pouvez signaler si vous préférez une tâche assise ou si vous devez partir plus tôt. L'inscription ne vous engage pas à participer aux prochaines séances.\nPourquoi l’association demande-t-elle une inscription préalable ?",
      "explanation": "L'inscription permet d'estimer le matériel et de préparer des tâches adaptées aux possibilités de chacun.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 21."
        },
        {
          "voice": "female",
          "text": "Notre journée de jardinage collectif aura lieu dimanche, de neuf heures à midi. Tous les habitants sont les bienvenus, y compris ceux qui n'ont jamais jardiné. Merci de vous inscrire avant vendredi : nous pourrons prévoir assez d'outils et organiser les petits groupes. Vous pouvez signaler si vous préférez une tâche assise ou si vous devez partir plus tôt. L'inscription ne vous engage pas à participer aux prochaines séances."
        },
        {
          "voice": "female",
          "text": "Pourquoi l’association demande-t-elle une inscription préalable ?"
        }
      ],
      "audio": "q-21.mp3",
      "audioSeconds": 30.119,
      "slotSeconds": 51
    },
    {
      "number": 22,
      "kind": "interview",
      "question": "Quel bénéfice la cycliste souligne-t-elle surtout ?",
      "options": [
        "Elle dépense moins pour acheter du matériel.",
        "Elle évite toutes les intempéries.",
        "Elle connaît désormais mieux son quartier.",
        "Elle arrive toujours plus vite qu'en métro."
      ],
      "correct": "C",
      "transcript": "Question 22.\nDepuis un an, vous allez au travail à vélo. Vous gagnez du temps ?\nPas forcément. Quand il pleut ou qu'il y a des travaux, le métro serait parfois plus rapide. Mais j'ai découvert des rues que je ne traversais jamais, une petite librairie, un marché. Le trajet fait maintenant partie de ma journée, au lieu d'être seulement un temps à supprimer. C'est cela que j'apprécie le plus.\nQuel bénéfice la cycliste souligne-t-elle surtout ?",
      "explanation": "Elle ne prétend pas gagner du temps chaque jour. Elle apprécie surtout les rues et commerces découverts grâce à ses trajets à vélo.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 22."
        },
        {
          "voice": "male",
          "text": "Depuis un an, vous allez au travail à vélo. Vous gagnez du temps ?"
        },
        {
          "voice": "female",
          "text": "Pas forcément. Quand il pleut ou qu'il y a des travaux, le métro serait parfois plus rapide. Mais j'ai découvert des rues que je ne traversais jamais, une petite librairie, un marché. Le trajet fait maintenant partie de ma journée, au lieu d'être seulement un temps à supprimer. C'est cela que j'apprécie le plus."
        },
        {
          "voice": "female",
          "text": "Quel bénéfice la cycliste souligne-t-elle surtout ?"
        }
      ],
      "audio": "q-22.mp3",
      "audioSeconds": 29.336,
      "slotSeconds": 50
    },
    {
      "number": 23,
      "kind": "dialogue",
      "question": "Pourquoi les organisateurs vont-ils déplacer une partie des activités ?",
      "options": [
        "Les participants ne veulent plus venir en groupe.",
        "La salle principale sera fermée définitivement.",
        "Le budget ne permet plus de louer de tables.",
        "L'expérience a révélé un problème de bruit."
      ],
      "correct": "D",
      "transcript": "Question 23.\nLa journée de samedi a bien fonctionné, mais plusieurs familles ont trouvé les lectures difficiles à entendre.\nOui, les jeux de construction étaient installés juste à côté. Nous avions prévu les espaces selon le nombre de tables, sans penser au bruit.\nLa prochaine fois, gardons les jeux dans la grande salle et installons les lectures dans la pièce voisine.\nIl faudra améliorer les panneaux pour que chacun trouve les deux espaces. Je peux préparer un plan simple et demander aux bénévoles d'accompagner les nouveaux arrivants.\nPourquoi les organisateurs vont-ils déplacer une partie des activités ?",
      "explanation": "La salle est adaptée aux jeux, mais trop bruyante pour les lectures. Celles-ci seront installées dans une pièce voisine.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 23."
        },
        {
          "voice": "female",
          "text": "La journée de samedi a bien fonctionné, mais plusieurs familles ont trouvé les lectures difficiles à entendre."
        },
        {
          "voice": "male",
          "text": "Oui, les jeux de construction étaient installés juste à côté. Nous avions prévu les espaces selon le nombre de tables, sans penser au bruit."
        },
        {
          "voice": "female",
          "text": "La prochaine fois, gardons les jeux dans la grande salle et installons les lectures dans la pièce voisine."
        },
        {
          "voice": "male",
          "text": "Il faudra améliorer les panneaux pour que chacun trouve les deux espaces. Je peux préparer un plan simple et demander aux bénévoles d'accompagner les nouveaux arrivants."
        },
        {
          "voice": "female",
          "text": "Pourquoi les organisateurs vont-ils déplacer une partie des activités ?"
        }
      ],
      "audio": "q-23.mp3",
      "audioSeconds": 39.549,
      "slotSeconds": 60
    },
    {
      "number": 24,
      "kind": "interview",
      "question": "Quelle limite la chercheuse signale-t-elle dans les résultats ?",
      "options": [
        "Les personnes interrogées ne représentent pas tous les usagers.",
        "Aucun participant n'a répondu aux questions.",
        "Les chiffres ont été volontairement inventés.",
        "L'enquête ne portait pas sur les transports."
      ],
      "correct": "A",
      "transcript": "Question 24.\nVotre enquête montre que les voyageurs sont satisfaits des nouveaux horaires. Peut-on dire que la réforme est un succès ?\nC'est un signal intéressant, mais notre questionnaire a surtout été distribué dans les bus en journée. Les salariés qui travaillent la nuit sont peu présents dans les réponses. Nous n'avons pas non plus interrogé ceux qui ont cessé de prendre cette ligne. Avant de conclure, il faut les contacter. Une enquête auprès des usagers actuels décrit une partie de la situation ; elle ne dit pas automatiquement ce que vivent les personnes absentes.\nQuelle limite la chercheuse signale-t-elle dans les résultats ?",
      "explanation": "Les réponses viennent surtout des voyageurs présents en journée. Les travailleurs de nuit et certains anciens usagers manquent à l'enquête.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 24."
        },
        {
          "voice": "male",
          "text": "Votre enquête montre que les voyageurs sont satisfaits des nouveaux horaires. Peut-on dire que la réforme est un succès ?"
        },
        {
          "voice": "female",
          "text": "C'est un signal intéressant, mais notre questionnaire a surtout été distribué dans les bus en journée. Les salariés qui travaillent la nuit sont peu présents dans les réponses. Nous n'avons pas non plus interrogé ceux qui ont cessé de prendre cette ligne. Avant de conclure, il faut les contacter. Une enquête auprès des usagers actuels décrit une partie de la situation ; elle ne dit pas automatiquement ce que vivent les personnes absentes."
        },
        {
          "voice": "female",
          "text": "Quelle limite la chercheuse signale-t-elle dans les résultats ?"
        }
      ],
      "audio": "q-24.mp3",
      "audioSeconds": 38.008,
      "slotSeconds": 59
    },
    {
      "number": 25,
      "kind": "announcement",
      "question": "Quelle idée le reportage met-il en avant ?",
      "options": [
        "Il faut remplacer tous les meubles anciens.",
        "Le prêt d’outils suppose aussi un accompagnement.",
        "Les ateliers doivent réserver les outils aux professionnels.",
        "Le prix d'achat indique toujours si un objet est réparable."
      ],
      "correct": "B",
      "transcript": "Question 25.\nDans cet atelier de quartier, on peut emprunter une perceuse ou une ponceuse. Pourtant, la nouveauté n'est pas seulement dans les étagères remplies d'outils. Une bénévole prend le temps d'expliquer les gestes, de vérifier le matériau et de dire quand il vaut mieux renoncer. Un participant résume : j'avais déjà accès à une perceuse, mais je n'osais pas m'en servir. Le projet rappelle qu'un équipement partagé devient réellement utile quand les personnes savent l'utiliser et peuvent demander de l'aide.\nQuelle idée le reportage met-il en avant ?",
      "explanation": "Le lieu prête des outils, mais montre aussi les gestes, les limites et les précautions : l'accès matériel seul ne suffit pas.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 25."
        },
        {
          "voice": "male",
          "text": "Dans cet atelier de quartier, on peut emprunter une perceuse ou une ponceuse. Pourtant, la nouveauté n'est pas seulement dans les étagères remplies d'outils. Une bénévole prend le temps d'expliquer les gestes, de vérifier le matériau et de dire quand il vaut mieux renoncer. Un participant résume : j'avais déjà accès à une perceuse, mais je n'osais pas m'en servir. Le projet rappelle qu'un équipement partagé devient réellement utile quand les personnes savent l'utiliser et peuvent demander de l'aide."
        },
        {
          "voice": "female",
          "text": "Quelle idée le reportage met-il en avant ?"
        }
      ],
      "audio": "q-25.mp3",
      "audioSeconds": 35.291,
      "slotSeconds": 57
    },
    {
      "number": 26,
      "kind": "interview",
      "question": "Pourquoi la restauratrice a-t-elle réduit la carte ?",
      "options": [
        "Pour servir uniquement les clients habituels.",
        "Pour supprimer tous les plats végétariens.",
        "Pour mieux organiser le travail et limiter les pertes.",
        "Pour éviter de s'approvisionner auprès de producteurs."
      ],
      "correct": "C",
      "transcript": "Question 26.\nDepuis ce printemps, votre restaurant propose moins de plats. Vous cherchez surtout à aller plus vite ?\nLa rapidité compte, mais nous voulions surtout mieux travailler. Avec une carte très longue, nous conservions trop de produits différents et certains finissaient à la poubelle. Maintenant, nous choisissons quelques recettes selon les livraisons des producteurs. Les cuisiniers peuvent les préparer avec davantage d'attention. Certains clients ont d'abord regretté leurs habitudes ; nous leur expliquons les changements et gardons toujours une possibilité végétarienne. Réduire le nombre de lignes n'a pas réduit notre envie de bien accueillir.\nPourquoi la restauratrice a-t-elle réduit la carte ?",
      "explanation": "Une carte plus courte aide l'équipe à préparer les produits disponibles et réduit les aliments jetés ; elle ne correspond pas à une réduction du soin apporté aux repas.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 26."
        },
        {
          "voice": "female",
          "text": "Depuis ce printemps, votre restaurant propose moins de plats. Vous cherchez surtout à aller plus vite ?"
        },
        {
          "voice": "male",
          "text": "La rapidité compte, mais nous voulions surtout mieux travailler. Avec une carte très longue, nous conservions trop de produits différents et certains finissaient à la poubelle. Maintenant, nous choisissons quelques recettes selon les livraisons des producteurs. Les cuisiniers peuvent les préparer avec davantage d'attention. Certains clients ont d'abord regretté leurs habitudes ; nous leur expliquons les changements et gardons toujours une possibilité végétarienne. Réduire le nombre de lignes n'a pas réduit notre envie de bien accueillir."
        },
        {
          "voice": "female",
          "text": "Pourquoi la restauratrice a-t-elle réduit la carte ?"
        }
      ],
      "audio": "q-26.mp3",
      "audioSeconds": 44.434,
      "slotSeconds": 66
    },
    {
      "number": 27,
      "kind": "dialogue",
      "question": "Quel compromis les habitants recherchent-ils ?",
      "options": [
        "Interdire toute activité sur la place.",
        "Organiser les usages pour permettre leur coexistence.",
        "Remplacer les bancs par un parking.",
        "Confier toutes les décisions à un seul commerçant."
      ],
      "correct": "B",
      "transcript": "Question 27.\nLes joueurs de ballon demandent de garder la place ouverte, mais des voisins se plaignent du bruit près des bancs.\nOn ne réglera pas cela en décidant que seuls les enfants ou seuls les adultes ont le droit d'être là.\nNous pourrions déplacer les bancs vers le jardin et définir des horaires pour les jeux les plus bruyants.\nEssayons pendant un mois. Il faudra écouter aussi les personnes qui traversent la place et les commerçants. Le but n'est pas de faire disparaître les différences, mais d'éviter que chaque usage rende les autres impossibles.\nQuel compromis les habitants recherchent-ils ?",
      "explanation": "Ils veulent conserver jeux et repos en adaptant les espaces et les horaires, plutôt que supprimer l'un des usages.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 27."
        },
        {
          "voice": "female",
          "text": "Les joueurs de ballon demandent de garder la place ouverte, mais des voisins se plaignent du bruit près des bancs."
        },
        {
          "voice": "male",
          "text": "On ne réglera pas cela en décidant que seuls les enfants ou seuls les adultes ont le droit d'être là."
        },
        {
          "voice": "female",
          "text": "Nous pourrions déplacer les bancs vers le jardin et définir des horaires pour les jeux les plus bruyants."
        },
        {
          "voice": "male",
          "text": "Essayons pendant un mois. Il faudra écouter aussi les personnes qui traversent la place et les commerçants. Le but n'est pas de faire disparaître les différences, mais d'éviter que chaque usage rende les autres impossibles."
        },
        {
          "voice": "female",
          "text": "Quel compromis les habitants recherchent-ils ?"
        }
      ],
      "audio": "q-27.mp3",
      "audioSeconds": 38.269,
      "slotSeconds": 60
    },
    {
      "number": 28,
      "kind": "interview",
      "question": "Que reproche l’invitée au calendrier du projet ?",
      "options": [
        "Il réserve trop de temps à l'entretien futur.",
        "Il laisse les habitants décider des dépenses.",
        "Il commence après la saison des pluies.",
        "Il prévoit les travaux avant de clarifier les besoins."
      ],
      "correct": "D",
      "transcript": "Question 28.\nLa rénovation du centre culturel doit commencer dès cet été. Vous avez pourtant demandé un report. Êtes-vous opposée au projet ?\nAu contraire, le bâtiment a besoin de travaux. Mais on a choisi le plan des salles avant de demander aux associations ce qu'elles y feront. Certaines ont besoin de calme, d'autres d'un sol résistant ou de rangement. Si nous construisons d'abord, nous adapterons ensuite les activités aux murs, alors que l'inverse serait préférable. Quelques semaines d'étude maintenant peuvent éviter des modifications coûteuses. Accélérer le début du chantier ne signifie pas toujours gagner du temps sur l'ensemble du projet.\nQue reproche l’invitée au calendrier du projet ?",
      "explanation": "L'invitée ne conteste pas l'objectif de rénovation ; elle critique l'ordre des étapes, car les usages n'ont pas encore été étudiés.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 28."
        },
        {
          "voice": "male",
          "text": "La rénovation du centre culturel doit commencer dès cet été. Vous avez pourtant demandé un report. Êtes-vous opposée au projet ?"
        },
        {
          "voice": "female",
          "text": "Au contraire, le bâtiment a besoin de travaux. Mais on a choisi le plan des salles avant de demander aux associations ce qu'elles y feront. Certaines ont besoin de calme, d'autres d'un sol résistant ou de rangement. Si nous construisons d'abord, nous adapterons ensuite les activités aux murs, alors que l'inverse serait préférable. Quelques semaines d'étude maintenant peuvent éviter des modifications coûteuses. Accélérer le début du chantier ne signifie pas toujours gagner du temps sur l'ensemble du projet."
        },
        {
          "voice": "female",
          "text": "Que reproche l’invitée au calendrier du projet ?"
        }
      ],
      "audio": "q-28.mp3",
      "audioSeconds": 45.636,
      "slotSeconds": 67
    },
    {
      "number": 29,
      "kind": "announcement",
      "question": "Quelle conclusion le journaliste tire-t-il de cette expérience ?",
      "options": [
        "Un service doit être évalué au-delà du nombre d'inscriptions.",
        "L'application a remplacé tous les échanges entre voisins.",
        "Les objets chers sont nécessairement les plus utiles.",
        "Le prêt ne peut fonctionner que dans les petites villes."
      ],
      "correct": "A",
      "transcript": "Question 29.\nL'application de prêt d'objets du quartier compte déjà deux mille inscrits. Un chiffre impressionnant, qui ne dit pourtant pas combien de voisins ont effectivement emprunté quelque chose. L'équipe vient donc d'étudier les demandes abandonnées. Certains objets étaient trop loin ; d'autres ne pouvaient être récupérés qu'aux heures de travail. Les responsables vont proposer des points de rencontre et préciser les disponibilités. Leur prochain bilan distinguera les comptes créés, les prêts réalisés et les difficultés rencontrées. La popularité annoncée est un début d'information, pas encore la preuve que le service répond aux besoins quotidiens.\nQuelle conclusion le journaliste tire-t-il de cette expérience ?",
      "explanation": "Le nombre d'inscrits semblait élevé, mais l'équipe examine aussi les prêts réellement réalisés et les abandons pour comprendre les difficultés.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 29."
        },
        {
          "voice": "female",
          "text": "L'application de prêt d'objets du quartier compte déjà deux mille inscrits. Un chiffre impressionnant, qui ne dit pourtant pas combien de voisins ont effectivement emprunté quelque chose. L'équipe vient donc d'étudier les demandes abandonnées. Certains objets étaient trop loin ; d'autres ne pouvaient être récupérés qu'aux heures de travail. Les responsables vont proposer des points de rencontre et préciser les disponibilités. Leur prochain bilan distinguera les comptes créés, les prêts réalisés et les difficultés rencontrées. La popularité annoncée est un début d'information, pas encore la preuve que le service répond aux besoins quotidiens."
        },
        {
          "voice": "female",
          "text": "Quelle conclusion le journaliste tire-t-il de cette expérience ?"
        }
      ],
      "audio": "q-29.mp3",
      "audioSeconds": 42.815,
      "slotSeconds": 64
    },
    {
      "number": 30,
      "kind": "interview",
      "question": "Quelle conception du patrimoine la conservatrice défend-elle ?",
      "options": [
        "Les bâtiments anciens doivent rester sans usage.",
        "Une restauration doit faire disparaître toute trace récente.",
        "La conservation peut intégrer des usages actuels discutés.",
        "La fréquentation touristique suffit à décider des choix."
      ],
      "correct": "C",
      "transcript": "Question 30.\nInstaller une bibliothèque dans une ancienne usine, n'est-ce pas dénaturer le patrimoine ?\nTout dépend des interventions. Nous voulons conserver ce qui permet de comprendre le travail qui s'y faisait : les volumes, certaines machines, les circulations. Mais un bâtiment vide, entretenu uniquement pour être regardé, n'est pas la seule façon de transmettre son histoire. Les nouveaux usages peuvent lui donner une place dans la vie locale. Il faut expliquer les choix, rendre les transformations lisibles et accepter d'en discuter. Préserver ne signifie pas immobiliser chaque détail ; cela demande de savoir ce que l'on veut transmettre et dans quelles conditions les habitants pourront s'en saisir.\nQuelle conception du patrimoine la conservatrice défend-elle ?",
      "explanation": "Elle défend une discussion entre protection et usages présents, en rendant les interventions lisibles plutôt qu'en figeant le lieu.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 30."
        },
        {
          "voice": "male",
          "text": "Installer une bibliothèque dans une ancienne usine, n'est-ce pas dénaturer le patrimoine ?"
        },
        {
          "voice": "female",
          "text": "Tout dépend des interventions. Nous voulons conserver ce qui permet de comprendre le travail qui s'y faisait : les volumes, certaines machines, les circulations. Mais un bâtiment vide, entretenu uniquement pour être regardé, n'est pas la seule façon de transmettre son histoire. Les nouveaux usages peuvent lui donner une place dans la vie locale. Il faut expliquer les choix, rendre les transformations lisibles et accepter d'en discuter. Préserver ne signifie pas immobiliser chaque détail ; cela demande de savoir ce que l'on veut transmettre et dans quelles conditions les habitants pourront s'en saisir."
        },
        {
          "voice": "female",
          "text": "Quelle conception du patrimoine la conservatrice défend-elle ?"
        }
      ],
      "audio": "q-30.mp3",
      "audioSeconds": 48.196,
      "slotSeconds": 71
    },
    {
      "number": 31,
      "kind": "interview",
      "question": "Quelle distinction la sociologue juge-t-elle nécessaire ?",
      "options": [
        "Le temps non occupé sur le calendrier et le temps réellement disponible.",
        "Le travail en ville et le travail à la campagne.",
        "Les loisirs gratuits et les activités sportives.",
        "Les préférences des adultes et celles des enfants."
      ],
      "correct": "A",
      "transcript": "Question 31.\nOn affirme souvent que les personnes disposent de davantage de temps libre. Votre étude invite à nuancer cette idée. Pourquoi ?\nParce qu'une heure vide sur un calendrier n'est pas nécessairement une heure dont on peut disposer. Attendre le retour d'un proche, surveiller un enfant qui dort ou rester joignable pour son travail limite les possibilités. On peut lire quelques pages, mais pas forcément rejoindre une activité loin de chez soi. Nous avons donc demandé non seulement combien de temps restait, mais aussi ce que les personnes pouvaient en faire. Sans cette distinction, on risque d'interpréter une faible participation comme un manque d'intérêt alors qu'elle résulte de contraintes très concrètes.\nQuelle distinction la sociologue juge-t-elle nécessaire ?",
      "explanation": "Attendre un proche tout en devant rester joignable n'offre pas la même liberté qu'une heure sans contrainte. La durée seule ne décrit pas la disponibilité.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 31."
        },
        {
          "voice": "female",
          "text": "On affirme souvent que les personnes disposent de davantage de temps libre. Votre étude invite à nuancer cette idée. Pourquoi ?"
        },
        {
          "voice": "male",
          "text": "Parce qu'une heure vide sur un calendrier n'est pas nécessairement une heure dont on peut disposer. Attendre le retour d'un proche, surveiller un enfant qui dort ou rester joignable pour son travail limite les possibilités. On peut lire quelques pages, mais pas forcément rejoindre une activité loin de chez soi. Nous avons donc demandé non seulement combien de temps restait, mais aussi ce que les personnes pouvaient en faire. Sans cette distinction, on risque d'interpréter une faible participation comme un manque d'intérêt alors qu'elle résulte de contraintes très concrètes."
        },
        {
          "voice": "female",
          "text": "Quelle distinction la sociologue juge-t-elle nécessaire ?"
        }
      ],
      "audio": "q-31.mp3",
      "audioSeconds": 48.483,
      "slotSeconds": 71
    },
    {
      "number": 32,
      "kind": "interview",
      "question": "Que signifie, pour le scientifique, présenter une incertitude ?",
      "options": [
        "Renoncer à comparer les observations.",
        "Préciser la portée des résultats sans les rendre inutiles.",
        "Reconnaître que toutes les opinions sont équivalentes.",
        "Éviter de publier les méthodes de recherche."
      ],
      "correct": "B",
      "transcript": "Question 32.\nQuand vous dites que votre estimation comporte une incertitude, certains auditeurs comprennent que vous ne savez rien. Comment leur répondez-vous ?\nJe leur donne un exemple. Prévoir une zone de risque ne permet pas de dire quelle maison sera touchée à quelle date. Cela reste pourtant utile pour préparer les secours ou éviter une construction mal située. L'incertitude indique la portée de ce que nous pouvons affirmer. Nous devons expliquer les observations, la méthode et ce qui pourrait modifier la conclusion. Présenter un chiffre sans ces repères donne une apparence de précision, mais pas nécessairement une meilleure information. Reconnaître des limites n'oblige pas à traiter comme équivalentes toutes les affirmations.\nQue signifie, pour le scientifique, présenter une incertitude ?",
      "explanation": "L'incertitude précise les conditions et les limites d'une conclusion. Elle n'annule ni les observations ni leur utilité pour décider.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 32."
        },
        {
          "voice": "male",
          "text": "Quand vous dites que votre estimation comporte une incertitude, certains auditeurs comprennent que vous ne savez rien. Comment leur répondez-vous ?"
        },
        {
          "voice": "female",
          "text": "Je leur donne un exemple. Prévoir une zone de risque ne permet pas de dire quelle maison sera touchée à quelle date. Cela reste pourtant utile pour préparer les secours ou éviter une construction mal située. L'incertitude indique la portée de ce que nous pouvons affirmer. Nous devons expliquer les observations, la méthode et ce qui pourrait modifier la conclusion. Présenter un chiffre sans ces repères donne une apparence de précision, mais pas nécessairement une meilleure information. Reconnaître des limites n'oblige pas à traiter comme équivalentes toutes les affirmations."
        },
        {
          "voice": "female",
          "text": "Que signifie, pour le scientifique, présenter une incertitude ?"
        }
      ],
      "audio": "q-32.mp3",
      "audioSeconds": 47.229,
      "slotSeconds": 70
    },
    {
      "number": 33,
      "kind": "announcement",
      "question": "Quelle réserve le chroniqueur exprime-t-il sur cet indicateur ?",
      "options": [
        "Il décrit trop précisément les conditions d'emploi.",
        "Il empêche toute comparaison entre deux périodes.",
        "Il additionne des données qui ne concernent pas la ville.",
        "Il masque certains effets du développement touristique."
      ],
      "correct": "D",
      "transcript": "Question 33.\nLa station annonce une saison exceptionnelle : les nuitées ont augmenté de douze pour cent. Ce résultat mérite d'être connu, mais il ne raconte pas toute l'année vécue sur place. Des restaurants ont manqué de personnel parce que les salariés ne trouvaient pas à se loger. La consommation d'eau a progressé pendant une période sèche, tandis que certains commerces ont fermé dès septembre. Le nombre de nuitées reste utile pour suivre la fréquentation. Il devient trompeur si on lui fait résumer à lui seul la qualité du développement local. Un bilan plus complet regarderait aussi les conditions d'emploi, les ressources mobilisées et la possibilité, pour ceux qui travaillent dans la station, d'y vivre durablement.\nQuelle réserve le chroniqueur exprime-t-il sur cet indicateur ?",
      "explanation": "Le total des nuitées ne décrit pas les emplois, le logement ou les ressources consommées. Le chroniqueur demande de compléter l'indicateur, pas de l'abandonner.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 33."
        },
        {
          "voice": "male",
          "text": "La station annonce une saison exceptionnelle : les nuitées ont augmenté de douze pour cent. Ce résultat mérite d'être connu, mais il ne raconte pas toute l'année vécue sur place. Des restaurants ont manqué de personnel parce que les salariés ne trouvaient pas à se loger. La consommation d'eau a progressé pendant une période sèche, tandis que certains commerces ont fermé dès septembre. Le nombre de nuitées reste utile pour suivre la fréquentation. Il devient trompeur si on lui fait résumer à lui seul la qualité du développement local. Un bilan plus complet regarderait aussi les conditions d'emploi, les ressources mobilisées et la possibilité, pour ceux qui travaillent dans la station, d'y vivre durablement."
        },
        {
          "voice": "female",
          "text": "Quelle réserve le chroniqueur exprime-t-il sur cet indicateur ?"
        }
      ],
      "audio": "q-33.mp3",
      "audioSeconds": 50.338,
      "slotSeconds": 73
    },
    {
      "number": 34,
      "kind": "dialogue",
      "question": "Sur quel point les deux intervenants se rejoignent-ils ?",
      "options": [
        "La mise en ligne doit supprimer toute permanence physique.",
        "Les usagers doivent adapter seuls leurs pratiques au site.",
        "L'accès numérique doit être accompagné pour devenir effectif.",
        "Les formations rendent inutile l'amélioration du site."
      ],
      "correct": "C",
      "transcript": "Question 34.\nNous avons mis toutes les démarches en ligne, mais les files d'attente à l'accueil n'ont presque pas diminué.\nCela ne m'étonne pas. Une personne peut avoir un téléphone sans savoir joindre un document ou comprendre pourquoi son dossier est bloqué.\nIl faudrait donc multiplier les formations ?\nOui, pour certains besoins. Mais il faut aussi simplifier les écrans et garder un contact humain. Sinon, nous demandons aux usagers d'apprendre à contourner une difficulté que le service pourrait supprimer.\nEssayons les deux : une permanence accompagnée et des tests du formulaire avec des personnes qui le découvrent. Nous verrons où elles hésitent réellement.\nSur quel point les deux intervenants se rejoignent-ils ?",
      "explanation": "L'un évoque les difficultés d'accès, l'autre propose des essais accompagnés et une interface plus claire. Tous deux distinguent mise en ligne et accès réel.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 34."
        },
        {
          "voice": "female",
          "text": "Nous avons mis toutes les démarches en ligne, mais les files d'attente à l'accueil n'ont presque pas diminué."
        },
        {
          "voice": "male",
          "text": "Cela ne m'étonne pas. Une personne peut avoir un téléphone sans savoir joindre un document ou comprendre pourquoi son dossier est bloqué."
        },
        {
          "voice": "female",
          "text": "Il faudrait donc multiplier les formations ?"
        },
        {
          "voice": "male",
          "text": "Oui, pour certains besoins. Mais il faut aussi simplifier les écrans et garder un contact humain. Sinon, nous demandons aux usagers d'apprendre à contourner une difficulté que le service pourrait supprimer."
        },
        {
          "voice": "female",
          "text": "Essayons les deux : une permanence accompagnée et des tests du formulaire avec des personnes qui le découvrent. Nous verrons où elles hésitent réellement."
        },
        {
          "voice": "female",
          "text": "Sur quel point les deux intervenants se rejoignent-ils ?"
        }
      ],
      "audio": "q-34.mp3",
      "audioSeconds": 47.02,
      "slotSeconds": 70
    },
    {
      "number": 35,
      "kind": "interview",
      "question": "Quelle idée l’architecte remet-il en cause ?",
      "options": [
        "Toute rénovation devrait commencer par un diagnostic.",
        "Une solution technique serait efficace indépendamment des usages.",
        "Les occupants devraient pouvoir comprendre leurs équipements.",
        "L'entretien influence le résultat d'un bâtiment."
      ],
      "correct": "B",
      "transcript": "Question 35.\nVotre bâtiment a reçu plusieurs équipements très performants. Pourtant, les consommations dépassent les prévisions. Comment l'expliquez-vous ?\nOn a évalué chaque élément séparément, avec des hypothèses d'utilisation qui ne correspondaient pas toujours à la vie du lieu. Certains réglages se contredisaient. Les occupants, de leur côté, évitaient une commande trop complexe et ouvraient les fenêtres quand ils avaient trop chaud. Ce n'est pas une raison pour leur reprocher de ne pas vivre comme dans une simulation. Il faut regarder l'ensemble : conception, installation, entretien et gestes quotidiens. Une fiche technique peut nous renseigner sur un appareil ; elle ne décrit pas automatiquement le service réellement obtenu. Nous avons donc commencé par observer les usages avant d'ajouter du matériel.\nQuelle idée l’architecte remet-il en cause ?",
      "explanation": "Il critique l'idée qu'additionner des équipements performants suffit. Leur interaction, leurs réglages et leur utilisation déterminent aussi les résultats.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 35."
        },
        {
          "voice": "female",
          "text": "Votre bâtiment a reçu plusieurs équipements très performants. Pourtant, les consommations dépassent les prévisions. Comment l'expliquez-vous ?"
        },
        {
          "voice": "male",
          "text": "On a évalué chaque élément séparément, avec des hypothèses d'utilisation qui ne correspondaient pas toujours à la vie du lieu. Certains réglages se contredisaient. Les occupants, de leur côté, évitaient une commande trop complexe et ouvraient les fenêtres quand ils avaient trop chaud. Ce n'est pas une raison pour leur reprocher de ne pas vivre comme dans une simulation. Il faut regarder l'ensemble : conception, installation, entretien et gestes quotidiens. Une fiche technique peut nous renseigner sur un appareil ; elle ne décrit pas automatiquement le service réellement obtenu. Nous avons donc commencé par observer les usages avant d'ajouter du matériel."
        },
        {
          "voice": "female",
          "text": "Quelle idée l’architecte remet-il en cause ?"
        }
      ],
      "audio": "q-35.mp3",
      "audioSeconds": 52.454,
      "slotSeconds": 75
    },
    {
      "number": 36,
      "kind": "interview",
      "question": "Quelle condition rend le rapprochement des générations souhaitable selon l’invitée ?",
      "options": [
        "Le respect du choix de participer et des intérêts réels.",
        "L'obligation de partager tous les repas.",
        "L'attribution d'un rôle identique à chaque personne d'un même âge.",
        "L'abandon des espaces privés dans la résidence."
      ],
      "correct": "A",
      "transcript": "Question 36.\nVotre résidence rassemble des étudiants et des retraités. Peut-on considérer que la proximité règle à elle seule le problème de l'isolement ?\nNon. Elle crée des occasions de rencontre, ce qui est précieux, mais elle ne fabrique pas automatiquement une relation. Au début, nous avions prévu beaucoup d'activités collectives. Certains habitants se sentaient obligés de venir pour ne pas paraître indifférents. Nous avons revu le programme. Chacun peut refuser une invitation et proposer une activité qui l'intéresse. Nous évitons aussi de supposer que les jeunes apprendront forcément l'informatique aux plus âgés, qui leur raconteront ensuite le passé. Les envies circulent autrement. Une personne de quatre-vingts ans peut vouloir parler de cinéma contemporain et un étudiant découvrir le jardinage. Ce qui compte, c'est la possibilité de choisir et la confiance qui se construit, pas le nombre de rencontres inscrit dans notre bilan.\nQuelle condition rend le rapprochement des générations souhaitable selon l’invitée ?",
      "explanation": "La proximité facilite les rencontres, mais le projet doit préserver les choix et éviter de distribuer les intérêts selon l'âge. L'invitée rejette une sociabilité obligatoire.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 36."
        },
        {
          "voice": "male",
          "text": "Votre résidence rassemble des étudiants et des retraités. Peut-on considérer que la proximité règle à elle seule le problème de l'isolement ?"
        },
        {
          "voice": "female",
          "text": "Non. Elle crée des occasions de rencontre, ce qui est précieux, mais elle ne fabrique pas automatiquement une relation. Au début, nous avions prévu beaucoup d'activités collectives. Certains habitants se sentaient obligés de venir pour ne pas paraître indifférents. Nous avons revu le programme. Chacun peut refuser une invitation et proposer une activité qui l'intéresse. Nous évitons aussi de supposer que les jeunes apprendront forcément l'informatique aux plus âgés, qui leur raconteront ensuite le passé. Les envies circulent autrement. Une personne de quatre-vingts ans peut vouloir parler de cinéma contemporain et un étudiant découvrir le jardinage. Ce qui compte, c'est la possibilité de choisir et la confiance qui se construit, pas le nombre de rencontres inscrit dans notre bilan."
        },
        {
          "voice": "female",
          "text": "Quelle condition rend le rapprochement des générations souhaitable selon l’invitée ?"
        }
      ],
      "audio": "q-36.mp3",
      "audioSeconds": 62.824,
      "slotSeconds": 86
    },
    {
      "number": 37,
      "kind": "interview",
      "question": "Quelle fonction l’historienne attribue-t-elle aux témoignages divergents ?",
      "options": [
        "Remplacer systématiquement toutes les archives écrites.",
        "Prouver que chaque événement possède une seule interprétation.",
        "Dispenser le chercheur de vérifier les dates.",
        "Éclairer les expériences différentes d'un même événement."
      ],
      "correct": "D",
      "transcript": "Question 37.\nQuand deux témoins racontent différemment la fermeture d'une usine, comment décidez-vous lequel dit vrai ?\nNous vérifions les faits qui peuvent l'être : les dates, les décisions, les effectifs. Mais toutes les différences ne se ramènent pas à une erreur. Un cadre, une ouvrière et un commerçant voisin n'ont pas vécu la même journée, même s'ils parlent du même événement. Leurs récits montrent ce qu'ils pouvaient voir, ce qu'ils redoutaient et ce qu'ils ont retenu. Nous gardons donc les circonstances de chaque entretien et comparons les témoignages avec les archives. Il ne s'agit pas de déclarer que tout se vaut, ni d'effacer les contradictions pour produire un récit plus confortable. Les écarts peuvent devenir une source d'information, à condition d'être examinés plutôt que simplement juxtaposés ou utilisés pour accuser d'emblée l'un des témoins de mentir.\nQuelle fonction l’historienne attribue-t-elle aux témoignages divergents ?",
      "explanation": "Les écarts entre récits peuvent révéler des positions et des expériences différentes. Ils restent à confronter aux autres sources ; ils ne sont ni une preuve automatique de mensonge ni un motif pour abandonner l'enquête.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 37."
        },
        {
          "voice": "female",
          "text": "Quand deux témoins racontent différemment la fermeture d'une usine, comment décidez-vous lequel dit vrai ?"
        },
        {
          "voice": "male",
          "text": "Nous vérifions les faits qui peuvent l'être : les dates, les décisions, les effectifs. Mais toutes les différences ne se ramènent pas à une erreur. Un cadre, une ouvrière et un commerçant voisin n'ont pas vécu la même journée, même s'ils parlent du même événement. Leurs récits montrent ce qu'ils pouvaient voir, ce qu'ils redoutaient et ce qu'ils ont retenu. Nous gardons donc les circonstances de chaque entretien et comparons les témoignages avec les archives. Il ne s'agit pas de déclarer que tout se vaut, ni d'effacer les contradictions pour produire un récit plus confortable. Les écarts peuvent devenir une source d'information, à condition d'être examinés plutôt que simplement juxtaposés ou utilisés pour accuser d'emblée l'un des témoins de mentir."
        },
        {
          "voice": "female",
          "text": "Quelle fonction l’historienne attribue-t-elle aux témoignages divergents ?"
        }
      ],
      "audio": "q-37.mp3",
      "audioSeconds": 56.424,
      "slotSeconds": 80
    },
    {
      "number": 38,
      "kind": "announcement",
      "question": "Quelle contradiction le reportage invite-t-il à examiner ?",
      "options": [
        "Une protection du site qui empêcherait toute étude scientifique.",
        "Des visiteurs qui réclament toujours moins d'informations.",
        "Une promesse de solitude fragilisée par son propre succès.",
        "Des habitants qui refusent toute activité économique locale."
      ],
      "correct": "C",
      "transcript": "Question 38.\nSur les affiches, une seule silhouette regarde un lac au milieu des montagnes. Sur place, certains jours, une file se forme pour reproduire exactement cette photographie. La destination attire par une promesse de solitude que son succès contribue à défaire. Les responsables pourraient diffuser d'autres points de vue, mais cela risquerait seulement de déplacer la pression vers des espaces encore fragiles. Ils discutent donc avec les habitants et les gestionnaires : quelles visites souhaite-t-on favoriser, à quelles périodes, avec quels accès et quelles limites ? Il ne suffit pas d'annoncer un nombre de visiteurs plus élevé comme une réussite évidente. La question est aussi de savoir si les conditions qui rendent le lieu désirable peuvent être maintenues. Une communication plus honnête devra montrer un territoire habité et fréquenté, sans réduire son avenir à l'image qui attire le plus de clics.\nQuelle contradiction le reportage invite-t-il à examiner ?",
      "explanation": "Les images de nature solitaire attirent le public sur les mêmes points de vue et menacent ainsi l'expérience annoncée. Le reportage propose de repenser communication et accueil, sans déplacer simplement la pression.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 38."
        },
        {
          "voice": "female",
          "text": "Sur les affiches, une seule silhouette regarde un lac au milieu des montagnes. Sur place, certains jours, une file se forme pour reproduire exactement cette photographie. La destination attire par une promesse de solitude que son succès contribue à défaire. Les responsables pourraient diffuser d'autres points de vue, mais cela risquerait seulement de déplacer la pression vers des espaces encore fragiles. Ils discutent donc avec les habitants et les gestionnaires : quelles visites souhaite-t-on favoriser, à quelles périodes, avec quels accès et quelles limites ? Il ne suffit pas d'annoncer un nombre de visiteurs plus élevé comme une réussite évidente. La question est aussi de savoir si les conditions qui rendent le lieu désirable peuvent être maintenues. Une communication plus honnête devra montrer un territoire habité et fréquenté, sans réduire son avenir à l'image qui attire le plus de clics."
        },
        {
          "voice": "female",
          "text": "Quelle contradiction le reportage invite-t-il à examiner ?"
        }
      ],
      "audio": "q-38.mp3",
      "audioSeconds": 56.764,
      "slotSeconds": 80
    },
    {
      "number": 39,
      "kind": "interview",
      "question": "Quelle approche l’économiste défend-il pour évaluer l’expérimentation ?",
      "options": [
        "La prolonger automatiquement puisque le public l'apprécie.",
        "Examiner les ressources nécessaires à sa continuité.",
        "Mesurer uniquement le nombre d'inscriptions initiales.",
        "Écarter les bénévoles de toute décision future."
      ],
      "correct": "B",
      "transcript": "Question 39.\nLe café associatif a fait le plein pendant ses trois mois d'essai. Pourquoi ne pas le maintenir exactement sous cette forme ?\nParce que l'essai reposait sur des conditions particulières. Le local était prêté et plusieurs bénévoles avaient accepté un effort exceptionnel. Leur enthousiasme montre que le lieu répond à une envie, mais il ne crée pas à lui seul un budget ni du temps disponible chaque semaine. Il faut maintenant préciser les coûts, partager les responsabilités et envisager plusieurs soutiens. Cela peut conduire à réduire certains horaires ou à rémunérer une partie de l'accueil. Ce n'est pas trahir l'expérience : c'est chercher les conditions de sa durée. Nous devons écouter les visiteurs et ceux qui font fonctionner le service. Le succès d'un projet temporaire constitue une information précieuse ; il ne dispense pas de transformer son organisation lorsqu'on souhaite en faire une institution quotidienne.\nQuelle approche l’économiste défend-il pour évaluer l’expérimentation ?",
      "explanation": "Un essai peut reposer sur une mobilisation exceptionnelle et des moyens prêtés. La réussite initiale ne prouve pas que ces conditions dureront ; il faut organiser et financer la suite.",
      "segments": [
        {
          "voice": "female",
          "text": "Question 39."
        },
        {
          "voice": "female",
          "text": "Le café associatif a fait le plein pendant ses trois mois d'essai. Pourquoi ne pas le maintenir exactement sous cette forme ?"
        },
        {
          "voice": "male",
          "text": "Parce que l'essai reposait sur des conditions particulières. Le local était prêté et plusieurs bénévoles avaient accepté un effort exceptionnel. Leur enthousiasme montre que le lieu répond à une envie, mais il ne crée pas à lui seul un budget ni du temps disponible chaque semaine. Il faut maintenant préciser les coûts, partager les responsabilités et envisager plusieurs soutiens. Cela peut conduire à réduire certains horaires ou à rémunérer une partie de l'accueil. Ce n'est pas trahir l'expérience : c'est chercher les conditions de sa durée. Nous devons écouter les visiteurs et ceux qui font fonctionner le service. Le succès d'un projet temporaire constitue une information précieuse ; il ne dispense pas de transformer son organisation lorsqu'on souhaite en faire une institution quotidienne."
        },
        {
          "voice": "female",
          "text": "Quelle approche l’économiste défend-il pour évaluer l’expérimentation ?"
        }
      ],
      "audio": "q-39.mp3",
      "audioSeconds": 62.903,
      "slotSeconds": 86
    }
  ]
}$paper$::jsonb);

create function academy_tcf_listening.grade(p_paper jsonb,p_answers jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object(
 'correct',count(*) filter(where p_answers->>(q->>'number')=q->>'correct'),'total',count(*),
 'percentage',round(100.0*count(*) filter(where p_answers->>(q->>'number')=q->>'correct')/count(*),2),
 'unanswered',count(*) filter(where not (p_answers ? (q->>'number'))),
 'rows',jsonb_agg(jsonb_build_object('number',q->'number','selected',p_answers->(q->>'number'),'correct',q->>'correct',
 'isCorrect',coalesce(p_answers->>(q->>'number')=q->>'correct',false),'explanation',q->>'explanation','transcript',q->>'transcript') order by (q->>'number')::int))
 from jsonb_array_elements(p_paper->'questions') q;
$$;

-- The public endpoint returns an explicit allowlist. Scripts, keys and correction
-- evidence remain private until submission/expiry; clients cannot supply a grade.
create function public.academy_tcf_listening_command(p_action text,p_id uuid default null,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid();a academy_tcf_listening.attempts;paper jsonb;history jsonb;
 question_no text;choice text;current_no integer;slot_start numeric;slot_end numeric;
 elapsed numeric;question_start timestamptz;question_end timestamptz;
begin
 perform academy_ai.require_access(u);
 if p_action is null or p_action not in ('catalog','start','read','answer','submit') or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>1000 then raise exception 'Invalid listening action';end if;
 if exists(select 1 from jsonb_object_keys(p_payload) k where not (k=any(case p_action when 'start' then array['testId','version'] when 'answer' then array['number','choice','revision'] when 'submit' then array['revision'] else array[]::text[] end))) then raise exception 'Invalid listening request';end if;
 if p_action='catalog' then
  select coalesce(jsonb_agg(to_jsonb(h) order by h."startedAt" desc),'[]') into history from (
   select id,test_id "testId",version,status,started_at "startedAt",deadline from academy_tcf_listening.attempts where user_id=u order by started_at desc limit 50) h;
  return jsonb_build_object('tests',(select jsonb_agg(jsonb_build_object('id',id,'version',version,'title',content->>'title','questions',39,'seconds',2100) order by id) from academy_tcf_listening.papers),'history',history,'serverNow',now());
 end if;
 if p_id is null then raise exception 'Invalid listening attempt';end if;
 if p_action='start' then perform 1 from auth.users where id=u for update;end if;
 select * into a from academy_tcf_listening.attempts where id=p_id for update;
 if found and a.user_id<>u then raise exception 'Listening attempt not found' using errcode='42501';end if;
 if p_action='start' then
  if p_payload->>'testId' is distinct from 'tcf-listening-01' or p_payload->>'version' is distinct from 'tcf-listening-2026-11-v1' then raise exception 'Listening paper changed. Refresh before starting';end if;
  if a.id is not null and (a.test_id<>p_payload->>'testId' or a.version<>p_payload->>'version') then raise exception 'Listening attempt already used';end if;
  if a.id is null then
   update academy_tcf_listening.attempts t set status='completed',submitted_at=t.deadline,result=academy_tcf_listening.grade(p.content,t.answers),revision=t.revision+1
    from academy_tcf_listening.papers p where t.user_id=u and t.status='active' and now()>=t.deadline and p.id=t.test_id and p.version=t.version;
   select * into a from academy_tcf_listening.attempts where user_id=u and status='active' and test_id=p_payload->>'testId' and version=p_payload->>'version' for update;
   if a.id is null then insert into academy_tcf_listening.attempts(id,user_id,test_id,version) values(p_id,u,p_payload->>'testId',p_payload->>'version') returning * into a;end if;
  end if;
 end if;
 if a.id is null then raise exception 'Listening attempt not found' using errcode='42501';end if;
 select content into paper from academy_tcf_listening.papers where id=a.test_id and version=a.version;
 if a.status='active' and now()>=a.deadline then
  update academy_tcf_listening.attempts set status='completed',submitted_at=deadline,result=academy_tcf_listening.grade(paper,answers),revision=revision+1 where id=a.id returning * into a;
 end if;
 if a.status='active' then
  elapsed:=greatest(0,extract(epoch from now()-a.started_at));
  select s.number,s.finish-s.duration,s.finish into current_no,slot_start,slot_end from (
   select (q->>'number')::int number,(q->>'slotSeconds')::numeric duration,
    sum((q->>'slotSeconds')::numeric) over(order by (q->>'number')::int) finish
   from jsonb_array_elements(paper->'questions') q) s where elapsed>=s.finish-s.duration and elapsed<s.finish order by s.number limit 1;
  if current_no is null then raise exception 'Listening timing unavailable. Reload your saved test';end if;
  question_start:=a.started_at+slot_start*interval '1 second';question_end:=a.started_at+slot_end*interval '1 second';
 end if;
 if a.status='active' and p_action in ('answer','submit') then
  if p_payload->'revision' is distinct from to_jsonb(a.revision) then raise exception 'Listening answers changed in another tab. Reload saved answers';end if;
  if p_action='answer' then
   if jsonb_typeof(p_payload->'number') is distinct from 'number' or p_payload->>'number' !~ '^([1-9]|[12][0-9]|3[0-9])$' or not (p_payload ? 'choice') or (p_payload->'choice'<>'null'::jsonb and (jsonb_typeof(p_payload->'choice')<>'string' or p_payload->>'choice' not in ('A','B','C','D'))) then raise exception 'Invalid listening choice';end if;
   if (p_payload->>'number')::int<>current_no then raise exception 'This listening question has ended. Continue with the current question';end if;
   question_no:=p_payload->>'number';choice:=p_payload->>'choice';
   update academy_tcf_listening.attempts set answers=case when choice is null then answers-question_no else jsonb_set(answers,array[question_no],to_jsonb(choice)) end,revision=revision+1 where id=a.id returning * into a;
  else
   update academy_tcf_listening.attempts set status='completed',submitted_at=now(),result=academy_tcf_listening.grade(paper,answers),revision=revision+1 where id=a.id returning * into a;
  end if;
 end if;
 if a.status='completed' then current_no:=null;question_start:=null;question_end:=null;end if;
 return jsonb_build_object('id',a.id,'testId',a.test_id,'version',a.version,'status',a.status,'answers',a.answers,'revision',a.revision,'startedAt',a.started_at,'deadline',a.deadline,'submittedAt',a.submitted_at,'serverNow',now(),
 'currentQuestion',current_no,'questionStartedAt',question_start,'questionEndsAt',question_end,
 'paper',jsonb_build_object('id',a.test_id,'version',a.version,'title',paper->>'title','seconds',paper->'seconds','questions',(
  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('number',q->'number','kind',q->'kind','question',q->'question','options',q->'options','image',q->'image','audio',q->'audio','audioSeconds',q->'audioSeconds','slotSeconds',q->'slotSeconds')) order by (q->>'number')::int)
  from jsonb_array_elements(paper->'questions') q)),
 'result',a.result);
end;$$;
revoke all on all functions in schema academy_tcf_listening from public,anon,authenticated,service_role;
revoke all on function public.academy_tcf_listening_command(text,uuid,jsonb) from public,anon,service_role;
grant execute on function public.academy_tcf_listening_command(text,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;

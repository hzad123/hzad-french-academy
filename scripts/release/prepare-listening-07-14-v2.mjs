// Eight new immutable TCF listening banks. Edits are restricted to the
// written alternatives (Q9-39): the verified French audio and picture stimuli
// remain identical. Each correction tests one source-specific distinction.
// This script never publishes or modifies any existing paper.
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {sourceInvariant} from '../lib/listening-contrast-quality.mjs';
import {choiceStats} from '../lib/listening-quality.mjs';
const root='work/tcf-listening-07-14-v2';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const sha=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const from=(c,r,k)=>{const m=c.match(r);if(!m)throw Error('Cannot extract '+k+' from '+c);return m[1].trim();};
const lower=s=>s.charAt(0).toLowerCase()+s.slice(1);
function variants(n,c){
 let x,short,wrong;
 switch(n){
 case 9:
  short=c.charAt(0).toUpperCase()+c.slice(1).replace(/\.$/,'')+'.';
  wrong=['Une adaptation des tarifs des activités déjà annoncées.',
   'Un nouveau lieu d’accueil pour les visiteurs inscrits.',
   'Un changement des modalités des réservations actuelles.'];break;
 case 10:
  x=from(c,/plus tard à (.+?) à cause/u,'activité');
  short='Le rendez-vous est décalé parce qu’une réunion finit plus tard.';
  wrong=['Le rendez-vous pour '+x+' est avancé d’une demi-heure.',
   'Le rendez-vous pour '+x+' est reporté au lendemain.',
   'Un autre créneau est proposé pour '+x+' en raison des transports.'];break;
 case 11:
  x=from(c,/pour (.+?) avant jeudi/u,'événement');
  short='Remplir le formulaire d’inscription en ligne avant jeudi.';
  wrong=['Réserver sa place pour '+x+' par téléphone avant jeudi.',
   'Envoyer le formulaire de '+x+' par courriel avant vendredi.',
   'Déposer sa demande pour '+x+' à l’accueil le jour même.'];break;
 case 12:
  x=from(c,/pour (.+?) à l’accueil/u,'activité');
  short='Montrer le courriel de confirmation à l’accueil pour retrouver son inscription.';
  wrong=['Présenter une pièce d’identité à l’accueil pour accéder à '+x+'.',
   'Remplir un nouveau formulaire d’inscription pour participer à '+x+'.',
   'Demander une confirmation écrite après la fin de '+x+'.'];break;
 case 13:
  x=from(c,/pour (.+?) commence/u,'activité');
  short='La séance est décalée de quatorze à quinze heures, au même endroit.';
  wrong=['La séance de '+x+' commence une heure plus tôt que prévu.',
   'La séance de '+x+' est reportée au lendemain à la même heure.',
   'La séance de '+x+' change de salle mais garde le même horaire.'];break;
 case 14:
  x=from(c,/Conserver (.+?) et envoyer/u,'activité');
  short='Maintenir l’introduction et transmettre la démonstration plus tard.';
  wrong=['Maintenir '+x+' avec une démonstration réalisée sans le matériel.',
   'Reporter '+x+' jusqu’à ce que le matériel soit disponible.',
   'Garder '+x+' mais renoncer à fournir la démonstration prévue.'];break;
 case 15:
  x=from(c,/Dans (.+?), la nouvelle mesure/u,'lieu');
  short='La mesure répond à un besoin local, mais certaines difficultés persistent.';
  wrong=['Dans '+x+', la mesure a été suspendue faute de participants.',
   'Dans '+x+', les difficultés ont été réglées avant le lancement.',
   'Dans '+x+', l’initiative est désormais réservée aux habitués.'];break;
 case 16:
  x=from(c,/accueil pour (.+?) toute la journée/u,'service');
  short='Maintenir un accueil sans interruption malgré les changements de service.';
  wrong=['Avancer les horaires de '+x+' en supprimant le relais du soir.',
   'Réserver les permanences de '+x+' aux inscriptions du matin.',
   'Répartir les permanences de '+x+' entre deux lieux différents.'];break;
 case 17:
  x=from(c,/obstacles dans (.+?)\./u,'lieu');
  short='Les usagers qui ont du mal à accéder aux services habituels.';
  wrong=['Les visiteurs ayant déjà terminé leurs démarches dans '+x+'.',
   'Les personnes qui fréquentent régulièrement les ateliers de '+x+'.',
   'Les employés chargés d’accueillir et d’orienter les visiteurs de '+x+'.'];break;
 case 18:
  x=from(c,/prévue pour (.+?)\./u,'événement');
  short='Elle travaille encore à l’heure du rendez-vous proposé.';
  wrong=['Elle ne peut se rendre à '+x+' à cause d’un retard de transport.',
   'Elle souhaite déplacer '+x+' à cause d’un changement de salle.',
   'Elle demande un autre horaire pour '+x+' afin d’accompagner un proche.'];break;
 case 19:
  x=from(c,/pendant (.+?)\./u,'événement');
  short='Permettre à chaque participant de poser ses questions et d’échanger.';
  wrong=['Réduire le groupe de '+x+' pour utiliser moins de matériel.',
   'Adapter le nombre de places de '+x+' à la taille de la salle.',
   'Répartir les participants de '+x+' selon leur expérience.'];break;
 case 20:
  x=from(c,/précisions sur (.+?)\./u,'préoccupation');
  short='Elle souhaite savoir comment sera pris en compte '+x+'.';
  wrong=['Elle demande des précisions sur le nombre de places prévues dans le projet.',
   'Elle veut savoir comment les horaires des séances seront communiqués.',
   'Elle cherche à connaître le prix définitif de sa participation au projet.'];break;
 case 21:
  x=from(c,/pour (.+?)\./u,'événement');
  short='Organiser les permanences selon les horaires disponibles des bénévoles.';
  wrong=['Adapter les tâches des bénévoles aux compétences requises pour '+x+'.',
   'Prévoir le matériel nécessaire selon les inscriptions à '+x+'.',
   'Définir les activités prioritaires selon le public attendu pour '+x+'.'];break;
 case 22:
  x=from(c,/autour de (.+?)\./u,'activité');
  short='La confiance née des rencontres entre des participants différents.';
  wrong=['Les connaissances pratiques acquises au cours de '+x+'.',
   'Les nouveaux contacts professionnels pris pendant '+x+'.',
   'La meilleure organisation des activités obtenue grâce à '+x+'.'];break;
 case 23:
  x=from(c,/Expérimenter (.+?), recueillir/u,'projet');
  short='Tester '+x+', consulter les usagers puis publier un bilan.';
  wrong=['Mettre en place '+x+' partout avant de mesurer les résultats.',
   'Consulter les habitants sur '+x+' sans mener d’essai concret.',
   'Expérimenter '+x+' mais ne publier aucun retour des participants.'];break;
 case 24:
  x=from(c,/L’étude de (.+?) exclut/u,'service');
  short='Les usagers qui ont abandonné '+x+' sont peu représentés.';
  wrong=['L’étude de '+x+' donne peu de place aux nouveaux inscrits.',
   'L’étude de '+x+' comprend surtout des personnes en attente.',
   'L’étude de '+x+' s’appuie principalement sur les réponses des agents.'];break;
 case 25:
  x=from(c,/Concilier (.+?) avec/u,'mesures');
  short='Adapter '+x+' en tenant compte des préoccupations des personnes concernées.';
  wrong=['Poursuivre '+x+' en donnant priorité aux seuls participants.',
   'Limiter '+x+' sans rechercher les effets sur les riverains.',
   'Maintenir '+x+' puis étudier les difficultés seulement après.'];break;
 case 26:
  x=from(c,/La nouvelle mesure, (.+?), doit/u,'mesure');
  short='Les premiers résultats sont positifs, mais il faut mesurer les effets durables.';
  wrong=['Le projet de '+x+' est annoncé mais n’a pas encore été lancé.',
   'Les résultats de '+x+' concernent uniquement les coûts de gestion.',
   'L’équipe souhaite interrompre '+x+' dès la fin des premiers essais.'];break;
 case 27:
  x=from(c,/Adapter les horaires de (.+?) sans/u,'service');
  short='Ouvrir plus tôt sans priver les usagers des permanences du soir.';
  wrong=['Ouvrir '+x+' plus tôt en supprimant les créneaux tardifs.',
   'Conserver les horaires de '+x+' malgré les demandes du matin.',
   'Réserver les créneaux matinaux de '+x+' aux seuls abonnés.'];break;
 case 28:
  x=from(c,/Concevoir (.+?) avant/u,'équipement');
  short='Choisir les équipements avant d’interroger ceux qui vont les utiliser.';
  wrong=['Préparer le budget de '+x+' avant de calculer son entretien.',
   'Adapter les équipements de '+x+' après consultation des équipes.',
   'Tester '+x+' sur un seul site avant de l’ouvrir à tous.'];break;
 case 29:
  x=from(c,/cet indicateur : (.+?); l’autre/u,'indicateur');
  short='L’un privilégie '+x+' ; l’autre veut aussi recueillir des témoignages.';
  wrong=['L’un veut comparer les coûts de '+x+' ; l’autre mesure la fréquentation.',
   'L’un défend les entretiens, l’autre réclame surtout les données financières.',
   'L’un veut des statistiques d’usage et l’autre propose d’écarter les chiffres.'];break;
 case 30:
  x=from(c,/lieu accueillant (.+?) tout en/u,'activité');
  short='Préserver l’histoire du lieu tout en lui donnant de nouvelles fonctions.';
  wrong=['Rénover le lieu de '+x+' sans changer l’usage actuel des espaces.',
   'Conserver le bâtiment de '+x+' uniquement pour ses activités passées.',
   'Moderniser les salles de '+x+' en effaçant les anciennes traces.'];break;
 case 31:
  if(c.includes('prévisions d’un modèle')){
   short='Comparer les prévisions du modèle à ce qui se passe sur le terrain.';
   wrong=['Comparer les prévisions de plusieurs modèles entre elles.',
   'Vérifier seulement si le modèle retrouve les données de départ.',
   'Réviser les hypothèses avant toute observation de terrain.'];
  }else if(c.includes('corrélation')){
   short='Ne pas confondre une corrélation statistique et une cause démontrée.';
   wrong=['Comparer la force d’une corrélation dans plusieurs échantillons.',
   'Déduire un effet causal lorsque deux tendances se répètent.',
   'Établir une cause unique à partir de deux changements simultanés.'];
  }else if(c.includes('amélioration immédiate')){
   short='Vérifier si le progrès constaté au départ se maintient dans le temps.';
   wrong=['Comparer les progrès enregistrés lors des deux premières semaines.',
   'Mesurer l’évolution d’un projet uniquement pendant son lancement.',
   'Suivre seulement les personnes arrivées au cours du premier mois.'];
  }else{
   short='Examiner les différences entre groupes, cachées par une moyenne.';
   wrong=['Calculer une nouvelle moyenne globale avec davantage de données.',
   'Comparer la moyenne d’un groupe à la moyenne de l’ensemble.',
   'Privilégier les chiffres globaux plutôt que les résultats détaillés.'];
  }break;
 case 32:
  x=from(c,/concernant (.+?)\./u,'service');
  short='Expliquer les hypothèses et les incertitudes derrière les prévisions.';
  wrong=['Publier une moyenne sur '+x+' sans détailler les hypothèses.',
   'Présenter plusieurs scénarios de '+x+' comme s’ils étaient équivalents.',
   'Annoncer un résultat précis pour '+x+' sans donner les limites.'];break;
 case 33:
  x=from(c,/dans (.+?) ne suffit/u,'lieu');
  short='La hausse des visites ne démontre pas un bénéfice durable du projet.';
  wrong=['La fréquentation de '+x+' varie trop selon les saisons.',
   'Les chiffres de '+x+' ne tiennent pas compte du prix des activités.',
   'La hausse des visites à '+x+' vient surtout des horaires étendus.'];break;
 case 34:
  x=from(c,/Faire tester (.+?) par/u,'service');
  short='Consulter des publics variés et maintenir un accompagnement humain.';
  wrong=['Faire tester '+x+' uniquement par les usagers réguliers.',
   'Maintenir une aide humaine à '+x+' pendant le seul lancement.',
   'Évaluer '+x+' auprès de tous puis supprimer l’accueil individuel.'];break;
 case 35:
  x=from(c,/installée dans (.+?) garantit/u,'lieu');
  short='Les résultats annoncés suffisent, même si les usages réels diffèrent.';
  wrong=['La performance du dispositif de '+x+' exige un entretien régulier.',
   'Les usages quotidiens du matériel de '+x+' peuvent changer ses effets.',
   'Les conditions de terrain de '+x+' influencent les résultats observés.'];break;
 case 36:
  x=from(c,/à (.+?)\./u,'activité');
  short='Une participation volontaire, fondée sur des échanges réciproques.';
  wrong=['Assurer une présence régulière aux séances de '+x+' sans échanger.',
   'Répartir les rôles de '+x+' entre des participants désignés à l’avance.',
   'Évaluer le lien créé à '+x+' uniquement par le nombre de présences.'];break;
 case 37:
  x=from(c,/concernant (.+?) aux/u,'service');
  short='Confronter des récits divergents aux documents vérifiables.';
  wrong=['Conserver les récits de '+x+' qui concordent avec la majorité.',
   'Classer les témoignages de '+x+' selon l’ancienneté de leurs auteurs.',
   'Comparer les récits de '+x+' sans consulter les archives disponibles.'];break;
 case 38:
  x=from(c,/Une initiative comme (.+?) peut/u,'initiative');
  short='La popularité du projet peut exercer une pression sur les usagers.';
  wrong=['Le succès de '+x+' réduit les demandes des services voisins.',
   'La fréquentation de '+x+' ralentit la promotion du dispositif.',
   'La croissance de '+x+' augmente le budget sans effet sur les usagers.'];break;
 case 39:
  x=from(c,/suivre (.+?) pour poursuivre/u,'indicateur');
  short='Stabiliser les moyens et suivre '+x+' dans la durée.';
  wrong=['Suivre '+x+' en comptant sur les bénévoles actuels.',
   'Obtenir des moyens durables mais ne plus mesurer '+x+'.',
   'Étendre le service en privilégiant seulement les premiers résultats de '+x+'.'];break;
 default:throw Error('Unexpected written listening question '+n);
 }
 if(!short||wrong.length!==3||new Set([short,...wrong]).size!==4)throw Error('Invalid editorial alternatives '+n);
 return {short,wrong};
}
function balanceOptions(q,numero){
 const original=q.options['ABCD'.indexOf(q.correct)],{short,wrong}=variants(q.number,original);
 // The key's role remains unchanged. No auto-generated stem or audio change.
 const copy=structuredClone(q),key='ABCD'.indexOf(copy.correct);
 const rem=[...wrong];
 // Rotate other positions per test instead of repeating a visible deck pattern.
 let start=(numero+copy.number)%3;
 for(let j=0;j<4;j++)if(j!==key)copy.options[j]=rem[start++%3];
 copy.options[key]=short;
 copy.explanation='Le document permet de retenir « '+short+' ». Les autres propositions modifient un élément décisif de la situation enregistrée.';
 // Only the screen alternatives and learner explanation change.
 if(JSON.stringify(copy.segments)!==JSON.stringify(q.segments)||copy.transcript!==q.transcript||copy.audio!==q.audio)throw Error('Recording changed');
 return copy;
}
const all=[],flags=[];
await mkdir(root,{recursive:true});
for(let n=7;n<=14;n++){
 const nn=String(n).padStart(2,'0'),sourcePath='supabase/exams/tcf-listening-test'+nn+'.json';
 const original=await readFile(sourcePath,'utf8').then(JSON.parse),paper=structuredClone(original);
 if(paper.id!=='tcf-listening-'+nn||paper.version!=='tcf-listening-2026-11-test'+nn+'-v1'||paper.questions.length!==39||paper.seconds!==2100)throw Error('Unexpected source '+nn);
 paper.version='tcf-listening-2026-11-test'+nn+'-v2';
 paper.questions=paper.questions.map(q=>q.number<=8?q:balanceOptions(q,n));
 sourceInvariant(original,paper);
 for(const [i,q] of paper.questions.entries()){
  const old=original.questions[i];
  if(q.correct!==old.correct||q.slotSeconds!==old.slotSeconds||q.audioSeconds!==old.audioSeconds||JSON.stringify(q.segments)!==JSON.stringify(old.segments))throw Error('Key, timing or recording changed on '+nn+' Q'+q.number);
  if(q.number>=9){
   const stats=choiceStats(q);if(stats.ratio>1.5)flags.push({test:n,q:q.number,ratio:stats.ratio,choices:q.options.map(x=>x.length)});
  }
 }
 const fromAsset='assets/tcf-listening/'+original.version,toAsset='assets/tcf-listening/'+paper.version;
 await cp(fromAsset,toAsset,{recursive:true});
 const manifest=await read(toAsset+'/manifest.json');
 if(manifest.version!==original.version||manifest.files.length!==39||manifest.state!=='MEDIA_VERIFIED')throw Error('Original media incomplete '+nn);
 manifest.version=paper.version;manifest.retainedUnchangedSource=original.version;
 await writeFile(toAsset+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 await writeFile('supabase/exams/tcf-listening-test'+nn+'-v2.json',JSON.stringify(paper,null,2)+'\n');
 all.push({test:n,oldVersion:original.version,newVersion:paper.version,questions:39,unchangedRecordedQuestions:39,editedWrittenOptions:31,correctLongest:paper.questions.slice(8).filter(q=>choiceStats(q).correctLongest).length});
}
const summary={tests:all,totalQuestions:312,editedWrittenOptions:248,unchangedAudio:312,answerPositionsPreserved:true,mediaSource:'existing-verified-v1',longOptionFlags:flags,createdAt:new Date().toISOString()};
await writeFile(root+'/summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));

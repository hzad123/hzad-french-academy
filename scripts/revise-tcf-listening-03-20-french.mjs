// Second editorial pass: context-specific answers, idiomatic French, diversified
// scenario introductions. Applied before ANY final audio recording is generated.
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const {contexts}=JSON.parse(await readFile('curriculum/tcf-listening-03-20-editorial-contexts.json','utf8'));
const letters='ABCD';
const revise=(q,c)=>{
 const n=q.number;
 const substitute=(before,after)=>{
  q.segments=q.segments.map(s=>({...s,text:s.text.replace(before,after)}));
 };
 const named=c.theme;
 const common=[
  [`consacrée à ${named.toLowerCase()}`,`sur le thème « ${named} »`],
  [`concernant ${c.theme.toLowerCase()}`,`sur le thème « ${named} »`],
  [`dans le domaine de ${named.toLowerCase()}`,`pour le thème « ${named} »`],
  [`du domaine de ${named.toLowerCase()}`,`du thème « ${named} »`],
  [`à ${named.toLowerCase()}`,`au thème « ${named} »`],
  [`la question de ${c.concern}`,`cette question : ${c.concern}`],
  [`veiller à ${c.concern}`,`tenir compte de cet enjeu : ${c.concern}`],
  [`à l’occasion de ${c.event}`,`pour préparer ${c.event}`],
  [`À l'occasion de ${c.event}`,`Pour ${c.event}`],
  [`participants de ${c.activity}`,`participants inscrits pour ${c.activity}`],
  [`depuis ${c.change}`,`depuis l'annonce de cette mesure : ${c.change}`],
  [`Une rencontre autour de ${named.toLowerCase()}`,`Une rencontre sur le thème « ${named} »`],
  [`mesurer ${c.metric}`,`suivre cet indicateur : ${c.metric}`],
  [`Votre programme, qui concerne ${c.service},`,`Votre initiative, liée à ${c.service},`],
  [`le domaine de ${named.toLowerCase()}`,`le thème « ${named} »`],
 ];
 for(const [from,to] of common)substitute(from,to);
 if(n===5&&/^(une visite|une sortie|une promenade)/i.test(c.activity)){
  q.segments[1].text='Excusez-moi, où commence '+c.activity+' ?';
  q.explanation="La réponse précise le point de départ de l'activité.";
 }
 if(n===20)substitute(`comment vous protégez ${c.concern}`,`comment vous prenez en compte ${c.concern}`);
 if(n===21)substitute(`Dans ${c.place}, à l’occasion de ${c.event}`,`Dans ${c.place}, pour préparer ${c.event}`);
 if(n===31)substitute(`le domaine suivant : ${named.toLowerCase()}`,`le thème « ${named} »`);
 if(n===33)substitute(`la fréquentation a augmenté depuis ${c.change}`,`la fréquentation a augmenté après l'annonce d'une nouvelle mesure : ${c.change}`);
 if(n===34)substitute(`Cela pose notamment la question de ${c.concern}`,`Cela soulève aussi cette inquiétude : ${c.concern}`);
 if(n===35)substitute(`Le nouvel équipement de ${c.feature}`,`Le dispositif installé dans ${c.venue}`);
 if(n===38)substitute('Le cas étudié relève du domaine de '+named.toLowerCase(), 'Le cas étudié concerne le thème « '+named+' »');
 // Correct responses remain grounded in the audio, but no longer repeat
 // exactly the same generic phrase across 18 different examinations.
 const answers={
 5:'Le point de départ est devant l’accueil.',
 9:c.change,
 10:'La personne arrivera plus tard à '+c.activity+' à cause d’une autre obligation.',
 11:'Remplir en ligne le formulaire d’inscription pour '+c.event+' avant jeudi.',
 12:'Présenter le message de confirmation pour '+c.activity+' à l’accueil.',
 13:'La séance prévue pour '+c.activity+' commence une heure plus tard.',
 14:'Conserver '+c.activity+' et envoyer ensuite la démonstration manquante.',
 15:'Dans '+c.place+', la nouvelle mesure répond à un besoin, mais certaines difficultés persistent.',
 16:'Réorganiser les permanences afin de maintenir un accueil pour '+c.service+' toute la journée.',
 17:'Les personnes qui rencontrent des obstacles dans '+c.place+'.',
 18:'La personne travaille à l’heure prévue pour '+c.event+'.',
 19:'Le petit groupe permet d’échanger davantage pendant '+c.event+'.',
 20:'La visiteuse souhaite des précisions sur '+c.concern+'.',
 21:'Répartir les bénévoles selon les horaires prévus pour '+c.event+'.',
 22:'Les relations de confiance créées autour de '+c.activity+'.',
 23:'Expérimenter '+c.solution+', recueillir les avis et publier un bilan.',
 24:'L’étude de '+c.service+' exclut presque ceux qui ont cessé de l’utiliser.',
 25:'Concilier '+c.solution+' avec les préoccupations des personnes concernées.',
 26:'La nouvelle mesure, '+c.change+', doit encore être évaluée sur la durée.',
 27:'Adapter les horaires de '+c.service+' sans pénaliser les usagers du soir.',
 28:'Concevoir '+c.feature+' avant de comprendre les besoins réels des utilisateurs.',
 29:'L’un veut suivre cet indicateur : '+c.metric+'; l’autre demande aussi des témoignages.',
 30:'Conserver l’identité du lieu accueillant '+c.activity+' tout en permettant de nouveaux usages.',
 31:null,
 32:'Exposer les hypothèses et incertitudes des projections concernant '+c.service+'.',
 33:'La hausse de fréquentation dans '+c.place+' ne suffit pas à mesurer les résultats durables.',
 34:'Faire tester '+c.service+' par différents publics et maintenir une aide humaine.',
 35:'Une technologie installée dans '+c.venue+' garantit un bon résultat sans tenir compte des usages.',
 36:'Permettre une participation volontaire et réciproque à '+c.activity+'.',
 37:'Comparer les récits concernant '+c.service+' aux faits vérifiables.',
 38:'Une initiative comme '+c.change+' peut devenir victime de son succès et fragiliser les usagers.',
 39:'Organiser des ressources durables et suivre '+c.metric+' pour poursuivre '+c.service+'.'
 };
 if(n<=8){
   const current=q.segments[q.segments.length-1].text;
   const opts=current.match(/(?:^|\s)([ABCD])\.\s/g);
   if(!opts||opts.length!==4)throw Error('Spoken answer choices missing '+c.n+' Q'+n);
   // The original distractors remain distinct and clearly mismatched. For
   // visit-like activities the answer instead names a start location.
   if(n===5&&/^(une visite|une sortie|une promenade)/i.test(c.activity)){
     const idx=letters.indexOf(q.correct);
     const parts=current.split(/\s(?=[ABCD]\. )/);
     if(parts.length!==4)throw Error('Spoken choice split '+c.n);
     parts[idx]=q.correct+'. '+answers[5];
     q.segments[q.segments.length-1].text=parts.join(' ');
   }
 }else if(n!==31){
   const correct=answers[n];
   if(!correct)throw Error('Missing contextual correct answer '+c.n+' Q'+n);
   const idx=letters.indexOf(q.correct);
   q.options[idx]=correct;
   // One distractor per question names a plausible but explicitly absent
   // interpretation of the same topic, reducing answer memorization.
   const wrongIdx=(idx+1+(c.n%2))%4;
   const contextual={
    9:'La fermeture définitive des lieux d’accueil.',
    10:'Le remplacement de '+c.activity+' par un autre programme.',
    11:'Le paiement obligatoire du nouvel événement '+c.event+'.',
    12:'La suppression de toute inscription à '+c.activity+'.',
    13:'Le déplacement de '+c.activity+' vers une autre région.',
    14:'L’annulation intégrale de l’activité prévue, sans information.',
    15:'La disparition de toute difficulté concernant '+c.concern+'.',
    16:'La fermeture de l’accueil destiné à '+c.service+'.',
    17:'Uniquement les personnes ayant déjà terminé leurs démarches pour '+c.service+'.',
    18:'La disparition de toutes les places pour '+c.event+'.',
    19:'L’accès réservé uniquement aux spécialistes.',
    20:'Le manque de place pour participer à '+c.event+'.',
    21:'La suppression de toutes les activités prévues pendant '+c.event+'.',
    22:'La garantie d’un résultat financier immédiat pour '+c.activity+'.',
    23:'L’adoption immédiate du projet, sans consultation.',
    24:'La représentation parfaite de tous les habitants dans l’étude de '+c.service+'.',
    25:'L’absence de toute conséquence sociale du projet concernant '+c.concern+'.',
    26:'La réussite définitivement prouvée du dispositif.',
    27:'La fermeture complète des permanences du soir.',
    28:'Le refus d’écouter les personnes qui utilisent '+c.feature+'.',
    29:'La suppression des observations de terrain sur le thème « '+c.theme+' ».',
    30:'L’effacement de toute trace des activités organisées sur place.',
    32:'La certitude absolue des projections concernant '+c.service+'.',
    33:'La fréquentation comme preuve suffisante du succès de '+c.change+'.',
    34:'La suppression de tout soutien humain pour '+c.service+'.',
    35:'La preuve que '+c.feature+' fonctionne de la même façon partout.',
    36:'L’obligation de participer chaque semaine à '+c.activity+'.',
    37:'L’idée que tous les témoignages sur '+c.service+' sont parfaitement exacts.',
    38:'La certitude que le nouveau dispositif ne produira jamais d’effets négatifs.',
    39:'La confiance exclusive dans l’enthousiasme initial autour du projet.'
   };
   q.options[wrongIdx]=contextual[n];
 }
 if(n===23&&c.n%3===1){
  const first=q.segments.findIndex(s=>s.text.includes('Pour avancer, nous devons agir rapidement'));
  if(first<0)throw Error('Missing panel turn');
  q.segments[first].text='Nous avons discuté de '+c.solution+', mais les réactions restent partagées. Il nous faut une décision praticable, pas seulement un slogan.';
  q.segments[first+1].text='Les usagers craignent surtout '+c.concern+'. Une application immédiate, sans consultation, risquerait de perdre leur confiance.';
  q.segments[first+2].text='Alors fixons une période d’essai, relevons les résultats et laissons les participants nous signaler les difficultés.';
 }
 if(n===29&&c.n%3===2){
  const i=q.segments.findIndex(s=>s.text.includes('Pour évaluer le projet, regardons des indicateurs vérifiables'));
  if(i>=0){
    q.segments[i].text='Sans chiffres comparables, impossible de dire si '+c.change+' apporte un bénéfice mesurable. Nous devons étudier '+c.metric+'.';
    q.segments[i+1].text='Les chiffres sont nécessaires, mais nous devons comprendre les expériences des personnes touchées. '+c.problem.charAt(0).toUpperCase()+c.problem.slice(1)+'.';
  }
 }
 // Rebuild authoritative transcript from precisely the speech segments used
 // by the offline renderer, so the correction sheet never diverges.
 q.transcript=q.segments.map(s=>s.text).join('\n');
 if(q.options.length!==4||new Set(q.options).size!==4)throw Error('Duplicate answers after revisions '+c.n+' Q'+n);
 return q;
};
for(const c of contexts){
 const label=String(c.n).padStart(2,'0');
 const path=join('curriculum/tcf-listening-build','test'+label+'-audio-pending.json');
 const paper=JSON.parse(await readFile(path,'utf8'));
 paper.questions=paper.questions.map(q=>revise(q,c));
 await writeFile(path,JSON.stringify(paper,null,2)+'\n');
 console.log('Edited Test '+label+': idiomatic French, contextual answers and differentiated exam stimuli');
}

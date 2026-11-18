import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// An independent editorial reference for which semantic proposition is keyed.
// Guards against correct-option misalignment during later distractor reordering.
// It does not replace independent source-based validity review.
const anchors={
  "1": [
    "La fatigue touche",
    "La démarche de Clémence",
    "Associer prévention",
    "Ouvrir différentes",
    "Le dérèglement",
    "Le rôle climatique",
    "L'intérêt pédagogique",
    "La reconversion associe",
    "Le récit manque",
    "La valeur accordée",
    "Le souvenir pourrait",
    "La création culinaire",
    "La pérennité",
    "Les niveaux réunis",
    "La place des trottinettes"
  ],
  "2": [
    "Répartir les sujets",
    "Vérifier les conditions souterraines",
    "La baisse constatée",
    "Apporter une aide matérielle",
    "Veiller à ce que l'usage collectif",
    "La présence d'un espace commun",
    "Ajouter des indicateurs",
    "La gratuité peut être maintenue",
    "La sobriété d'un logement",
    "Concilier la stabilité",
    "Maintenir une rue active",
    "Une baisse par rapport au marché",
    "Les modalités de participation",
    "L'attractivité accrue",
    "Standardiser des éléments"
  ],
  "3": [
    "Articuler des exercices",
    "Rendre visibles des trajectoires",
    "Certaines décisions requièrent",
    "Les contraintes d'horaires",
    "La possibilité de revoir",
    "Le temps de connexion",
    "Les exigences du métier",
    "Croiser des indices",
    "Conserver des spécialistes",
    "L'apprentissage d'une compétence",
    "Une marge de choix",
    "Les acquis d'un métier",
    "Le choix entre traiter",
    "Une expertise opérationnelle",
    "Modifier les modalités"
  ],
  "4": [
    "Améliorer le dernier segment",
    "Préférer des séjours",
    "Aider chacun à juger",
    "La méthode de validation",
    "La possibilité d'étaler",
    "Un volume d'entrées élevé",
    "Des horaires mieux raccordés",
    "Le flou sur la part de mise",
    "La continuité de parcours",
    "La possibilité de conserver",
    "Signaler les marges",
    "L'écart entre un segment",
    "Une offre de logement",
    "Une baisse de fréquentation",
    "Un conseil individuel"
  ],
  "5": [
    "Évaluer les bâtiments",
    "Comparer les parcelles",
    "La durée d'usage",
    "Affecter les volumes",
    "Renoncer à mieux voir",
    "Dans les décisions initiales",
    "Des remplacements dus",
    "Parce qu'un alignement",
    "Faire correspondre le message",
    "Assimiler la récupération",
    "La présence de nouveaux hectares",
    "La part des sacs effectivement",
    "Il peut masquer",
    "Le décalage possible",
    "Présenter une capture future"
  ],
  "6": [
    "Une transformation des choix",
    "Exprimer d'abord son regard",
    "Protéger des pièces sensibles",
    "Une coexistence de supports",
    "Préserver dans la durée",
    "Un droit d'entrée doit parfois",
    "Rendre les interventions lisibles",
    "Une audience numérique",
    "Conserver l'interactivité",
    "Proposer des contraintes partagées",
    "Relier les chiffres",
    "Le rythme de visite",
    "Un même groupe",
    "Partir de certains goûts",
    "Réserver du temps"
  ]
};
for (const [testNo,expected] of Object.entries(anchors)){
 test(`TCF reading Test ${testNo}: keyed answer matches each of 15 expected meanings`,async()=>{
  const paper=JSON.parse(await readFile(`supabase/exams/tcf-reading-v5/test-${String(testNo).padStart(2,'0')}.json`,'utf8'));
  assert.equal(expected.length,15);
  for(let i=0;i<15;i++){
   const q=paper.questions[i+24],selected=q.options['ABCD'.indexOf(q.correct)];
   assert(selected.includes(expected[i]),`Test ${testNo} Q${q.number} selected ${JSON.stringify(selected)} does not match editorial anchor ${expected[i]}`);
  }
 });
}

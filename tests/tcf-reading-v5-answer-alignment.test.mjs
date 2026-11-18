import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Exact correct meanings independently reviewed against original source passages.
// These assertions catch accidental correct-letter drift when updating foils.
const editorialAnswerReference=[
  [
    "Le manque de repos affecte à la fois les fonctions cognitives et l'humeur",
    "L'expérience d'écriture aboutit à un accord pour publier son premier livre",
    "Limiter les risques liés à l'ascension et préserver un milieu sensible",
    "Rendre différentes formes de culture accessibles à davantage de publics",
    "Les cycles de repos de la faune et la possibilité d'observer les astres",
    "Un mécanisme régulateur du climat peut fragiliser les milieux marins",
    "L'intérêt pour l'approche précède les résultats de son évaluation prolongée",
    "Le projet associe nouvelles pratiques urbaines et effets environnementaux",
    "L'intrigue peine à maintenir l'intérêt malgré des qualités de style",
    "La réussite personnelle est davantage associée aux expériences qu'aux achats",
    "Le souvenir pourrait être facilité par les émotions associées à une mélodie",
    "La créativité des plats élargit l'attrait d'une cuisine centrée sur les légumes",
    "La pérennité du travail hybride exige des ajustements dans la vie des équipes",
    "L'organisation multiâge favorise entraide et autonomie malgré des contraintes",
    "L'avenir de ce transport dépend d'une coexistence sécurisée en ville"
  ],
  [
    "Répartir les sujets entre questionnaire préalable et discussion collective",
    "Anticiper les contraintes souterraines avant d'implanter durablement les arbres",
    "La baisse observée pourrait correspondre à un rejet des déchets dans la rue",
    "Soutenir le déplacement sans se substituer aux décisions des personnes",
    "Veiller à ce que l'usage collectif ne détériore pas la cour des élèves",
    "La seule présence d'un espace partagé suffirait à rapprocher les habitants",
    "Les conditions vécues par les occupants doivent compléter les chiffres de rénovation",
    "La gratuité peut être maintenue grâce à d'autres revenus du lieu",
    "La sobriété d'un logement dépend aussi de services accessibles à proximité",
    "Préserver la continuité des usages tout en répondant à des besoins nouveaux",
    "Maintenir une rue active tout en négociant des limites aux gênes",
    "Une baisse par rapport au marché n'indique pas la charge réelle pour les ménages",
    "Diversifier les formes de participation tout en préservant les échanges",
    "L'attractivité accrue peut fragiliser les activités qui faisaient vivre le quartier",
    "Standardiser des éléments tout en permettant plusieurs configurations de vie"
  ],
  [
    "Articuler des exercices utilisables et une réflexion sur leurs situations d'emploi",
    "Montrer que les parcours professionnels peuvent évoluer et comporter des hésitations",
    "Certaines décisions requièrent une expérience sensible transmise en situation",
    "Les contraintes de calendrier limitent l'exercice d'un droit existant",
    "La possibilité de revoir régulièrement les mêmes interlocuteurs",
    "La durée en ligne peut refléter la complexité des tâches sans mesurer leur valeur",
    "L'engagement professionnel s'opposerait à des conditions de travail soutenables",
    "Croiser des indices différents plutôt que laisser un seul critère décider",
    "Conserver des spécialistes tout en préparant des relais en leur absence",
    "L'apprentissage d'une compétence ne donne pas à lui seul accès au marché du travail",
    "La liberté de choix reste liée à des exigences collectives explicites",
    "Les acquis d'un métier demandent d'être réinterprétés selon les règles du suivant",
    "Le choix entre traiter plus de dossiers et mieux accompagner les cas difficiles",
    "La maîtrise d'un métier ne garantit pas les compétences nécessaires pour animer une équipe",
    "Changer les procédures qui excluent sans mesurer les compétences recherchées"
  ],
  [
    "Améliorer le dernier segment piéton depuis le stationnement extérieur",
    "Préférer une exploration approfondie qui laisse place à l'imprévu",
    "Aider chacun à juger l'accessibilité réelle avant de s'engager",
    "Certains trajets n'apparaissaient pas dans l'indicateur utilisé",
    "La possibilité d'étaler l'activité économique et les emplois dans l'année",
    "Le nombre de passages ne renseigne pas à lui seul sur les bénéfices pour l'économie locale",
    "Des horaires mieux raccordés pour permettre les correspondances",
    "Une expérience présentée comme spontanée peut être organisée pour les touristes",
    "Sécuriser le trajet entier, particulièrement là où le réseau s'interrompt",
    "L'accès habituel des résidents doit être pris en compte dans le financement",
    "Présenter des durées adaptées à des vitesses de déplacement différentes",
    "L'écart entre un segment chronométré et la durée complète vécue par l'usager",
    "Une offre de logement compatible avec le rythme d'un trajet à étapes",
    "Une baisse de fréquentation sur les créneaux réservés accompagnée d'un report ailleurs",
    "Une destination peu connue peut devenir saturée après des recommandations massives"
  ],
  [
    "Écarter du bilan les déplacements supplémentaires liés à l'implantation",
    "Suivre les effets par rapport à un témoin et sur plusieurs saisons",
    "La longévité réelle des objets au regard des entretiens nécessaires",
    "Moduler l'arrosage selon les besoins urgents et les quantités disponibles",
    "Accepter une visibilité réduite pour préserver les zones de refuge",
    "Pour anticiper les difficultés de séparation dans les choix de conception",
    "Des pertes liées à la casse qui annulent les matières économisées",
    "Une plantation uniforme reste exposée à un risque sanitaire commun",
    "Des solutions de proximité qui rendent les comportements annoncés réalisables",
    "Compter la récupération comme une économie avant de vérifier le réemploi",
    "Elle ne garantit pas les déplacements entre des habitats séparés",
    "La quantité de sacs parvenant réellement au traitement approprié",
    "Un indicateur isolé peut masquer les rythmes différents des effets observés",
    "Les gains sont calculés sur un équipement alors que les usages se multiplient",
    "Présenter un stockage encore incertain comme une compensation déjà réalisée"
  ],
  [
    "La contrainte matérielle influence la recherche et les choix de mise en scène",
    "L'impression initiale sert de point de départ avant l'apport d'explications",
    "La fréquence des visites est adaptée pour éviter d'endommager les pièces",
    "Les formats répondent à des besoins distincts sans se remplacer mutuellement",
    "La viabilité des éditions suivantes dépend aussi de l'expérience des bénévoles",
    "L'accès officiel au programme ne donne pas nécessairement les moyens de s'y orienter",
    "La restauration doit faire comprendre l'œuvre sans faire disparaître son histoire",
    "Le public réuni impose d'adapter une réussite initialement obtenue en ligne",
    "La visite conserve les dispositifs mais ménage davantage d'observation directe",
    "Le cadre commun permet de distinguer les contributions au sein d'un ensemble cohérent",
    "L'évaluation complète les données d'affluence par l'approfondissement vécu",
    "L'obligation de montrer un résultat risquerait d'orienter le travail vers des gestes démonstratifs",
    "La visibilité médiatique est assimilée à une voix représentative et uniforme",
    "Des centres d'intérêt existants servent de passage vers des lectures moins familières",
    "La salle accepte moins de passages pour permettre un accueil plus approfondi"
  ]
];

for (let i=0;i<6;i++) {
 test(`Test ${i+1}: all 15 advanced questions retain the editorially checked answer meaning`,async()=>{
  const filename=`supabase/exams/tcf-reading-v5/test-${String(i+1).padStart(2,'0')}.json`;
  const paper=JSON.parse(await readFile(filename,'utf8'));
  assert.equal(paper.questions.length,39);
  for(let j=0;j<15;j++){
   const q=paper.questions[j+24],correctIndex='ABCD'.indexOf(q.correct);
   assert(correctIndex>=0);
   assert.equal(q.options[correctIndex],editorialAnswerReference[i][j],
     `${paper.id} Q${q.number}: selected option changed; re-review question and evidence`);
  }
 });
}

// Editorial candidates for an independent diagnostic, not approved production questions.
// All source passages, visual data, points, key positions and test metadata are kept intact.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const rows=[
  [
    1,
    28,
    "À quelles deux opérations la seconde vérification sera-t-elle appliquée ?",
    [
      "Consulter les relevés et modifier les coordonnées",
      "Consulter les relevés et modifier le mode de règlement",
      "Consulter les factures et modifier les coordonnées",
      "Consulter les factures et modifier le mode de règlement"
    ],
    "la consultation des relevés et la modification de vos coordonnées exigeront une seconde vérification",
    "verification-scope-releves-coordonnees"
  ],
  [
    1,
    29,
    "Quel calendrier l'avis indique-t-il pour le traitement des demandes écrites et la reprise de l'accueil téléphonique ?",
    [
      "Demandes traitées dès 16 h ; téléphone rouvert le lendemain",
      "Demandes traitées le lendemain ; téléphone rouvert dès 16 h",
      "Demandes traitées dès 16 h ; téléphone rouvert à la même heure",
      "Demandes traitées le lendemain ; téléphone rouvert le même jour"
    ],
    "Les demandes reçues seront traitées à partir de 16 h. La ligne téléphonique rouvrira le lendemain",
    "maintenance-asymmetric-reopening"
  ],
  [
    1,
    38,
    "À quel acteur le texte attribue-t-il la proposition de répartir certains frais de stockage ?",
    [
      "Aux gestionnaires des halles",
      "Aux responsables des municipalités",
      "Aux commerçants installés dans les halles",
      "Aux jeunes producteurs candidats à un stand"
    ],
    "Des gestionnaires envisagent de partager certains frais de stockage",
    "food-halls-storage-sharing-actor"
  ],
  [
    1,
    39,
    "À quelle condition certaines familles apprécient-elles la souplesse des programmes ?",
    [
      "Que les hôtes les aient informées de cette souplesse",
      "Que des activités de remplacement leur soient proposées",
      "Que les modifications soient décidées avec les familles",
      "Qu'un nouvel horaire soit fixé pour les activités reportées"
    ],
    "Plusieurs familles apprécient justement cette souplesse, à condition qu'elle ait été annoncée clairement",
    "farm-stay-conditional-family-approval"
  ],
  [
    2,
    28,
    "Quel critère détermine le remboursement de l'acompte en cas de désistement après le 1er octobre ?",
    [
      "La reprise de la place par une personne en liste d'attente",
      "La présentation d'un justificatif concernant le désistement",
      "Le nombre de jours restant avant le début du stage",
      "La possibilité de transférer l'inscription à une autre session"
    ],
    "il ne pourra être remboursé que si une personne sur liste d'attente reprend votre place",
    "photo-deposit-post-cutoff-condition"
  ],
  [
    2,
    29,
    "À quel moment la bibliothèque réunira-t-elle les futurs bénévoles pour la préparation des ateliers ?",
    [
      "Au début du mois de janvier",
      "À la fin du mois de décembre",
      "Au milieu du mois de janvier",
      "À la fin du mois de janvier"
    ],
    "Une réunion de préparation sera organisée début janvier",
    "library-volunteer-preparation-date"
  ],
  [
    2,
    38,
    "Quel effet les comptoirs communs ont-ils sur l'organisation des cantines ?",
    [
      "Ils augmentent les coûts logistiques initiaux mais évitent une gestion séparée des retours.",
      "Ils réduisent les coûts logistiques initiaux mais maintiennent une gestion séparée des retours.",
      "Ils augmentent les coûts logistiques initiaux mais simplifient surtout le lavage des boîtes.",
      "Ils réduisent les coûts logistiques initiaux mais nécessitent un stockage supplémentaire."
    ],
    "Cela augmente leurs coûts logistiques à court terme, mais permet d'éviter que chaque restaurant organise seul le stockage et la récupération",
    "shared-containers-cost-and-organization"
  ],
  [
    2,
    39,
    "Quels deux indicateurs l'autorité souhaite-t-elle suivre pour évaluer le projet de desserte ?",
    [
      "Le nombre de voyageurs et les correspondances manquées",
      "Le nombre de voyageurs et la durée des trajets en train",
      "La ponctualité des trains et la durée des trajets en bus",
      "La ponctualité des trains et les correspondances manquées"
    ],
    "mesurer le nombre de voyageurs mais aussi les correspondances manquées",
    "rail-project-evaluation-indicators"
  ],
  [
    3,
    28,
    "Quelle combinaison caractérise l'accompagnement proposé au candidat ?",
    [
      "Un mentor d'un secteur proche et au moins une rencontre par mois",
      "Un mentor de la même entreprise et au moins une rencontre par mois",
      "Un mentor d'un secteur proche et au moins une rencontre par trimestre",
      "Un mentor de la même entreprise et au moins une rencontre par trimestre"
    ],
    "Vous serez mis en relation avec une personne travaillant dans un secteur proche du vôtre, et non nécessairement dans la même entreprise. Les échanges se dérouleront pendant quatre mois, à raison d'au moins une rencontre mensuelle",
    "mentorship-sector-and-frequency"
  ],
  [
    3,
    29,
    "Sur quels éléments le comité fondera-t-il la sélection des exposants ?",
    [
      "La cohérence des créations et la diversité des techniques",
      "La cohérence des créations et l'expérience des exposants",
      "La diversité des techniques et les prix des objets proposés",
      "L'expérience des exposants et les prix des objets proposés"
    ],
    "Le comité examinera la cohérence du travail proposé et la diversité des techniques représentées",
    "market-exhibitor-selection-criteria"
  ],
  [
    3,
    38,
    "Sur quel critère le collectif entend-il évaluer le résultat de son travail ?",
    [
      "La fiabilité des parcours proposés aux marcheurs",
      "La rapidité de traitement des signalements reçus",
      "L'étendue du réseau de chemins cartographiés",
      "Le nombre de contributeurs régulièrement actifs"
    ],
    "Le collectif évaluera la qualité du projet non au nombre de kilomètres ajoutés, mais à la fiabilité des itinéraires proposés aux marcheurs",
    "mapping-collective-evaluation-criterion"
  ],
  [
    3,
    39,
    "Quel aspect du projet préoccupait les associations de riverains ?",
    [
      "La possibilité de faire respecter un calendrier souple",
      "La possibilité d'établir des horaires identiques pour les sites",
      "La possibilité de mesurer la puissance sonore des concerts",
      "La possibilité de recueillir les plaintes après les spectacles"
    ],
    "Des associations de riverains redoutaient au contraire qu'un calendrier souple ne soit impossible à contrôler",
    "festival-resident-concern-calendar-enforcement"
  ],
  [
    4,
    28,
    "De quels éléments extérieurs aux mesures des capteurs la synthèse trimestrielle tiendra-t-elle compte ?",
    [
      "Des conditions météorologiques et du débit du ruisseau",
      "Des conditions météorologiques et de la fréquence des signalements",
      "Du débit du ruisseau et de la fréquence des prélèvements",
      "De la fréquence des prélèvements et de celle des signalements"
    ],
    "une synthèse tenant compte de la météo et du débit",
    "stream-report-context-variables"
  ],
  [
    4,
    29,
    "À quel poste de dépenses correspond l'aide soumise à une candidature distincte ?",
    [
      "Aux déplacements jusqu'au lieu de résidence",
      "À l'hébergement pendant les ateliers d'écriture",
      "À l'utilisation des locaux et du matériel de travail",
      "À l'organisation des rencontres avec le public"
    ],
    "Les candidatures à l'aide au transport sont étudiées séparément",
    "residency-separate-transport-aid"
  ],
  [
    4,
    38,
    "Quel usage des résultats de recherche le musée a-t-il choisi ?",
    [
      "Les rendre publics par étapes, même avant la fin des recherches",
      "Les rendre publics par collection, après validation des origines",
      "Les réunir dans une publication annuelle consacrée aux acquisitions",
      "Les présenter lors des rencontres avec les communautés concernées"
    ],
    "Le musée a choisi de publier les résultats progressivement, y compris lorsque les recherches sont incomplètes",
    "museum-research-publication-approach"
  ],
  [
    4,
    39,
    "Quelle proposition de certaines entreprises suscite l'opposition des responsables universitaires ?",
    [
      "Résumer la reconnaissance des compétences par un score numérique",
      "Définir la reconnaissance des compétences par un volume horaire",
      "Fonder la reconnaissance des compétences sur l'expérience professionnelle",
      "Organiser la reconnaissance des compétences par secteur d'activité"
    ],
    "Certaines entreprises demandent cependant une reconnaissance encore plus simple, par exemple un seul score numérique. Les responsables universitaires s'y opposent",
    "microcredential-company-proposal-disputed"
  ],
  [
    5,
    28,
    "Quel parcours de publication antérieure est explicitement compatible avec la candidature ?",
    [
      "Avoir diffusé des textes en revue ou sur son propre site",
      "Avoir publié un recueil chez un éditeur de livres numériques",
      "Avoir publié un roman chez un éditeur à faible tirage",
      "Avoir cosigné un livre paru chez un éditeur indépendant"
    ],
    "Les candidats peuvent toutefois avoir déjà diffusé des textes dans une revue ou sur un site personnel",
    "contest-eligible-publication-history"
  ],
  [
    5,
    29,
    "À quelle étape le donateur recevra-t-il son justificatif de don ?",
    [
      "Après l'établissement de l'inventaire du matériel",
      "Lors de la prise en charge des cartons déposés",
      "Après la remise des appareils aux centres de formation",
      "Lors de la demande d'enlèvement collectif des appareils"
    ],
    "Un reçu de don sera remis après inventaire",
    "computer-donation-receipt-timing"
  ],
  [
    5,
    38,
    "Quelles informations les annonces affichées risquent-elles de ne pas révéler ?",
    [
      "Les loyers finalement négociés et les logements restés vacants",
      "Les charges demandées et la durée des contrats de location",
      "La date de mise sur le marché et la superficie habitable",
      "La durée des contrats et la date de mise sur le marché"
    ],
    "sans montrer les loyers finalement négociés ni les logements restés vacants",
    "rent-algorithm-missing-market-data"
  ],
  [
    5,
    39,
    "Dans quelle situation les organisateurs ont-ils remarqué une prise de parole plus fréquente ?",
    [
      "Quand les participants échangent à propos d'une tâche concrète",
      "Quand les participants commentent des dialogues enregistrés",
      "Quand les participants préparent ensemble un récit à présenter",
      "Quand les participants travaillent avec un partenaire de même niveau"
    ],
    "les participants prennent davantage la parole lorsqu'ils discutent d'une tâche concrète",
    "regional-language-observed-speaking-context"
  ],
  [
    6,
    28,
    "Quelle condition particulière concerne l'inscription des équipes interprofessionnelles ?",
    [
      "Communiquer à l'avance les rôles de leurs membres",
      "Communiquer à l'avance les spécialités exercées par leurs membres",
      "Désigner à l'avance un responsable de la préparation en ligne",
      "Choisir à l'avance les scénarios qu'elles souhaitent simuler"
    ],
    "Les équipes interprofessionnelles sont admises si leurs rôles sont communiqués à l'avance",
    "simulation-team-role-disclosure"
  ],
  [
    6,
    29,
    "Quels éléments seront pris en compte pour composer le programme de la soirée ?",
    [
      "La durée totale de la soirée et la diversité des genres",
      "La durée totale de la soirée et le nombre de comédiens",
      "La diversité des genres et les besoins en équipement",
      "Le nombre de comédiens et les besoins en équipement"
    ],
    "en tenant compte de la durée totale de la soirée et de la diversité des genres",
    "open-stage-program-selection-criteria"
  ],
  [
    6,
    38,
    "Quelles informations la présentation expérimentée par l'association met-elle en avant ?",
    [
      "L'évolution des notes, leur répartition et les motifs récurrents des critiques",
      "L'évolution des notes, la durée des visites et les différences de tarifs",
      "La répartition des notes, les périodes de visite et les profils des clients",
      "Les périodes de visite, les différences de tarifs et les motifs récurrents des critiques"
    ],
    "l'évolution des notes dans le temps, leur répartition et les motifs récurrents des critiques",
    "review-platform-presentation-metrics"
  ],
  [
    6,
    39,
    "Sur quelle base les ingénieurs recommandent-ils de décider où réaliser les aménagements les plus ambitieux ?",
    [
      "Les performances au fil des saisons et l'adéquation du sol et des usages",
      "Les performances lors des premiers essais et la popularité des aménagements",
      "La fréquence des orages et l'ancienneté des réseaux d'évacuation",
      "La pente des rues et l'importance de la circulation routière"
    ],
    "comparer les performances sur plusieurs saisons et de réserver les projets les plus ambitieux aux lieux où le sol et les usages rendent l'infiltration réellement possible",
    "permeable-streets-engineer-priority-criteria"
  ]
];
const root='work/tef-reading-editorial-pilot';
const files=['tef-reading-test01-v3.json','tef-reading-test02-v3.json',...[3,4,5,6].map(i=>'tef-reading-test0'+i+'-v2.json')];
const docs=await Promise.all(files.map(async f=>JSON.parse(await readFile('supabase/exams/'+f,'utf8'))));
await mkdir(root,{recursive:true});
const changes=[];
for(const [test,n,question,choices,quote,concept] of rows){
 const p=docs[test-1],old=p.questions[n-1],key='ABCD'.indexOf(old.correct);
 if(old.number!==n||key<0||!old.passage.includes(quote)||choices.length!==4||new Set(choices).size!==4)throw Error('Invalid candidate T'+test+' Q'+n);
 const options=choices.slice(1);options.splice(key,0,choices[0]);
 const updated={...old,question,options,explanation:'Le document précise : « '+quote+' ». La réponse correspond à cette information.',semantic:{concept,evidence:quote}};
 p.questions[n-1]=updated;
 changes.push({test,number:n,before:{question:old.question,options:old.options,correct:old.correct},after:{question,options,correct:old.correct,explanation:updated.explanation}});
}
for(let i=0;i<files.length;i++)await writeFile(root+'/'+files[i],JSON.stringify(docs[i],null,2)+'\n');
await writeFile(root+'/changes.json',JSON.stringify(changes,null,2)+'\n');
console.log('Staged '+changes.length+' editorial candidates; no production publication.');

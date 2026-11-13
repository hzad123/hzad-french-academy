// Higher-level listening passages: interview, report, debate, academic
// lecture, group discussion and public presentation. All authored French.
import {qgens,input,source,S,narrator,speaker,voice} from './listening-03-20-authoring-part1.mjs';
const advanced=[
(c)=>S(c,21,'announcement',"Pour quelle raison les volontaires doivent-ils préciser leurs disponibilités ?",[
 narrator('Annonce locale. Dans '+c.place+', à l’occasion de '+c.event+', nous recherchons des volontaires pour l’accueil, la préparation des salles et l’orientation des visiteurs. Certaines personnes pourront rester toute la journée, d’autres seulement une heure. Afin d’éviter de réunir trop de monde en début de matinée et de manquer d’aide en fin d’après-midi, veuillez indiquer vos horaires avant mercredi. Vous recevrez ensuite un planning personnalisé. Aucune expérience préalable n’est exigée.')
],"Pour répartir les équipes selon les besoins des différents créneaux.",[
"Pour sélectionner uniquement les personnes ayant déjà travaillé dans le secteur.",
"Pour annuler les activités prévues après midi.",
"Pour demander le paiement anticipé d’une inscription."
],"Les organisateurs veulent équilibrer les effectifs tout au long de la journée."),
(c)=>S(c,22,'interview',"Quel avantage l'invitée juge-t-elle le plus important ?",[
 speaker('Vous participez à '+c.activity+'. Qu’est-ce que cette expérience vous a apporté ?'),
 narrator('Au départ, je voulais surtout obtenir des informations pratiques. Mais les rencontres avec des gens d’horizons différents ont changé ma manière de voir les choses. Nous avons parfois des désaccords, et c’est justement en les discutant que nous trouvons des idées auxquelles personne n’aurait pensé seul. Je sais que les difficultés ne disparaissent pas immédiatement, notamment parce que '+c.problem+'. Pourtant, j’apprécie surtout les relations de confiance qui se sont créées. Elles me donnent envie de continuer à m’impliquer, même lorsque les résultats visibles se font attendre.')
],"Les échanges durables et les liens de confiance entre les participants.",[
"Le gain financier assuré dès la première séance.",
"La disparition complète des difficultés d’organisation.",
"L’obligation de poursuivre l’activité chaque semaine."
],"L’invitée insiste sur les liens humains et les idées partagées plutôt que sur un bénéfice immédiat."),
(c)=>S(c,23,'panel-discussion',"Sur quelle démarche les participants se mettent-ils d'accord ?",[
 narrator('Vous écoutez une table ronde consacrée à '+c.theme.toLowerCase()+'.'),
 speaker('Pour avancer, nous devons agir rapidement. Nos équipes ont déjà élaboré '+c.solution+'.'),
 narrator('Mais nous n’avons pas encore consulté les personnes qui risquent d’être gênées. La difficulté est réelle : '+c.problem+'.'),
 speaker('Il faudrait un essai limité dans le temps, avec des observations précises plutôt qu’une décision irréversible.'),
 narrator('Je suis d’accord, à condition que les habitants puissent donner leur avis pendant l’expérience, et pas seulement à la fin.'),
 speaker('Alors nous lancerons une expérimentation de trois mois, publierons les résultats et ajusterons le dispositif avant de décider.'),
 narrator('Cette méthode me paraît acceptable, car elle laisse la possibilité de corriger ce qui ne fonctionne pas.')
],"Tester la solution, consulter les personnes concernées et publier un bilan.",[
"Appliquer définitivement le projet sans recueillir d’avis.",
"Supprimer les réunions publiques et toutes les mesures.",
"Attendre que les désaccords disparaissent spontanément."
],"Le compromis consiste en une expérimentation limitée, évaluée et ouverte aux retours."),
(c)=>S(c,24,'interview',"Quelle limite méthodologique la spécialiste identifie-t-elle ?",[
 speaker('Votre enquête semble montrer une forte satisfaction concernant '+c.service+'. Peut-on en conclure que le dispositif fonctionne pour tout le monde ?'),
 narrator('Pas encore. Nos questionnaires ont été distribués aux personnes qui utilisent déjà ce service. Celles qui ont renoncé à cause des obstacles rencontrés sont presque absentes de l’échantillon. C’est un problème particulièrement important ici, car '+c.problem+'. Nous risquons donc de mesurer la satisfaction des utilisateurs réguliers sans comprendre les raisons de l’exclusion des autres. Dans la prochaine phase, nous contacterons également les anciens usagers et les personnes qui n’ont jamais réussi à s’inscrire. Une moyenne élevée ne suffit pas si elle masque des expériences très différentes.')
],"L'enquête interroge surtout les utilisateurs présents et ignore les personnes écartées du service.",[
"Les enquêteurs ont choisi un questionnaire trop long pour être imprimé.",
"Les résultats portent sur une activité qui n’existe plus.",
"Les personnes interrogées ont toutes répondu dans plusieurs langues."
],"Les personnes ayant abandonné le service ne sont pas représentées dans l’enquête."),
(c)=>S(c,25,'television-report',"Quelle tension centrale le reportage souligne-t-il ?",[
 narrator('Vous regardez un reportage régional. Dans '+c.place+', une initiative propose '+c.solution+'. Les responsables espèrent ainsi répondre à une difficulté bien connue : '+c.problem+'.'),
 speaker('Nous soutenons l’objectif général, mais il faut prendre en compte '+c.concern+'. Une décision utile à certains peut compliquer la vie d’autres personnes.'),
 narrator('Les organisateurs reconnaissent cette difficulté et annoncent un calendrier progressif, avec des étapes de consultation. Ils affirment que '+c.longterm+'. Pourtant, '+c.short+'. La réussite du projet dépendra de la manière dont ces exigences pourront être conciliées.')
],"Le besoin d'améliorer le service sans négliger les effets sur d'autres usagers.",[
"La volonté unanime de supprimer toute activité dans la région.",
"L’absence complète d’obstacles techniques et sociaux.",
"Une décision de remplacer les responsables par des visiteurs."
],"Le reportage oppose l’objectif d’amélioration aux préoccupations concrètes des personnes affectées."),
(c)=>S(c,26,'interview',"Pourquoi la responsable refuse-t-elle d'annoncer une réussite définitive ?",[
 speaker('Vous avez lancé '+c.change+'. Quels résultats retenez-vous après les premières semaines ?'),
 narrator('Il y a des signes encourageants, notamment une meilleure information des usagers. Cependant, nous devons rester prudents. '+c.short.charAt(0).toUpperCase()+c.short.slice(1)+'. Et nous n’avons pas encore assez de recul pour mesurer '+c.metric+'. Le dispositif a été préparé avec les équipes, mais les situations rencontrées sont plus diverses que prévu. Nous allons modifier certaines consignes et poursuivre les entretiens avec les usagers. Ce serait une erreur d’évaluer la réussite uniquement à partir du nombre de personnes venues à l’ouverture.')
],"Les premiers résultats sont encourageants, mais le suivi à long terme reste insuffisant.",[
"Le service n’a jamais accueilli le moindre participant.",
"Toutes les étapes du projet ont été abandonnées avant le lancement.",
"La responsable souhaite désormais éviter de rencontrer les usagers."
],"Elle souligne la persistance de difficultés et l’absence de recul sur les résultats."),
(c)=>S(c,27,'dialogue',"Quel compromis les deux collègues souhaitent-ils préserver ?",[
 narrator('Plusieurs personnes demandent que '+c.service+' ouvre plus tôt. C’est compréhensible, mais nous sommes déjà peu nombreux en fin de journée.'),
 speaker('Si nous avançons tous les horaires, les usagers qui terminent tard leur travail ne pourront plus venir.'),
 narrator('Pourrions-nous répartir les permanences différemment, sans supprimer celles du soir ?'),
 speaker('Oui. Mais discutons d’abord avec les équipes et les personnes concernées. Nous pourrions tester deux horaires pendant un mois.'),
 narrator('D’accord. Notre objectif doit rester le même : faciliter l’accès au service plutôt que déplacer le problème d’un groupe à un autre.')
],"Améliorer l'accès le matin tout en maintenant une possibilité de visite en soirée.",[
"Fermer le service chaque après-midi pour réduire les coûts.",
"Interdire aux utilisateurs de changer leurs rendez-vous.",
"Réserver le dispositif aux employés travaillant tôt."
],"Ils cherchent à répondre aux besoins de deux catégories d’usagers, pas à en exclure une."),
(c)=>S(c,28,'interview',"Quelle erreur de conception l'experte dénonce-t-elle ?",[
 speaker('Le projet de '+c.feature+' a été présenté comme une innovation. Pourquoi demandez-vous une révision ?'),
 narrator('Les concepteurs ont d’abord choisi les équipements, puis seulement interrogé leurs futurs utilisateurs. Or, il est difficile d’anticiper les usages réels sans observer les pratiques quotidiennes. Certaines personnes ont besoin d’explications supplémentaires, d’autres rencontrent des obstacles physiques ou techniques. La question de '+c.concern+' est aussi apparue très tard. On risque alors de multiplier les corrections coûteuses. Nous recommandons de commencer par des essais avec des publics divers et de laisser leurs retours modifier le projet, plutôt que de les consulter uniquement pour confirmer des décisions déjà prises.')
],"Avoir choisi les solutions avant de comprendre les besoins des utilisateurs.",[
"Avoir consacré trop de temps à rencontrer des usagers très différents.",
"Avoir demandé une évaluation du service après son ouverture.",
"Avoir supprimé toutes les dépenses de matériel dès le départ."
],"L’experte critique une conception descendante sans consultation préalable."),
(c)=>S(c,29,'debate',"Quelle divergence méthodologique oppose les intervenants ?",[
 narrator('Vous écoutez un débat consacré à '+c.theme.toLowerCase()+'.'),
 speaker('Pour évaluer le projet, regardons des indicateurs vérifiables. Nous pourrions mesurer '+c.metric+' et comparer les périodes avant de décider.'),
 narrator('C’est utile, mais il faut aussi rencontrer les personnes concernées. '+c.problem.charAt(0).toUpperCase()+c.problem.slice(1)+'. Cette réalité risque de disparaître derrière une moyenne flatteuse.'),
 speaker('Je ne nie pas l’intérêt des témoignages. Mais nous ne pouvons pas attendre plusieurs années avant d’ajuster le programme.'),
 narrator('Nous pouvons suivre des chiffres dès maintenant et mener des observations sur le terrain. Le désaccord porte sur ce que nous considérons comme une preuve suffisante, pas sur le besoin d’agir.')
],"L'un privilégie les indicateurs chiffrés, l'autre réclame aussi des observations qualitatives.",[
"L’un souhaite interdire toute mesure, l’autre veut supprimer les témoignages.",
"Les invités défendent tous deux le remplacement des résultats par des opinions.",
"Le débat oppose deux lieux sans rapport avec l’évaluation."
],"L’opposition porte sur l’importance relative des chiffres et des observations de terrain."),
(c)=>S(c,30,'interview',"Quelle conception du patrimoine ou de l'héritage collectif l'invitée défend-elle ?",[
 speaker('Votre établissement doit évoluer. Certaines personnes craignent qu’il perde son identité. Que leur répondez-vous ?'),
 narrator('Nous ne devons pas confondre conservation et immobilité. Les éléments qui racontent l’histoire d’un endroit méritent d’être documentés et protégés. Mais si un bâtiment ou une institution ne répond plus aux besoins actuels, son avenir peut aussi passer par de nouveaux usages. Il faut expliquer les transformations, garder les traces significatives et écouter les personnes attachées au lieu. Le projet ne réussira pas si l’on gomme toute mémoire ; il ne réussira pas davantage si l’on interdit toute adaptation. L’enjeu est de transmettre un sens sans empêcher la vie de continuer.')
],"Conserver les traces significatives tout en permettant des usages adaptés aux besoins actuels.",[
"Interdire chaque modification, même mineure, pour toujours.",
"Effacer toutes les traces historiques avant de réutiliser le lieu.",
"Transformer nécessairement chaque site en commerce privé."
],"L’invitée défend une conservation compatible avec l’évolution des usages."),
(c)=> {
const variants=[
['association','Lorsqu\'un phénomène augmente en même temps qu\'un autre, cela ne prouve pas que le premier soit la cause du second. De multiples facteurs peuvent influencer les mesures, y compris les ressources disponibles et les habitudes des personnes observées.','Distinguer une corrélation observée de la preuve d’un effet causal.',['Considérer que deux évolutions simultanées ont toujours la même origine.','Rejeter l’ensemble des données dès qu’elles sont comparées.','Affirmer qu’une seule observation suffit à identifier tous les mécanismes.']],
['durée','Une amélioration relevée quelques jours après une intervention n\'est pas nécessairement durable. Les changements de saison, la composition des participants et les adaptations successives peuvent modifier les résultats. Seul un suivi suffisamment long permet de comprendre ce qui se maintient et ce qui disparaît.','Distinguer une amélioration immédiate d’un changement durable.',['Mesurer seulement les résultats du premier jour.','Considérer que toutes les transformations se produisent à la même vitesse.','Éviter de suivre les participants une fois le projet ouvert.']],
['moyenne','Une moyenne permet de résumer un ensemble, mais elle peut masquer des situations opposées. Deux quartiers ou deux groupes peuvent obtenir le même résultat global tout en connaissant des contraintes très différentes. Pour comprendre ce que les chiffres racontent, il faut examiner leur répartition et les personnes qui restent invisibles.','Regarder les différences entre groupes plutôt qu’une seule moyenne globale.',['Supposer que tous les participants vivent la même situation.','Abandonner la comparaison des données entre les périodes.','Privilégier systématiquement le chiffre le plus élevé.']],
['modèle','Une simulation décrit ce qui devrait se produire si certaines hypothèses se réalisent. Or, sur le terrain, les comportements, les conditions matérielles et les ressources peuvent différer de ces hypothèses. Il est donc nécessaire de comparer régulièrement les prévisions aux observations et de réviser le modèle lorsque les écarts deviennent significatifs.','Confronter les prévisions d’un modèle aux observations réelles.',['Considérer les hypothèses initiales comme des certitudes immuables.','Choisir systématiquement le modèle qui annonce les meilleurs résultats.','Remplacer toute expérience de terrain par une simulation unique.']]
];
const v=variants[c.n%4];
return S(c,31,'academic-monologue',"Quelle précaution méthodologique la conférencière recommande-t-elle ?",[
narrator('Vous écoutez un extrait de conférence universitaire. Nous examinons plusieurs projets locaux et, plus précisément, '+c.metric+'. '+v[1]+' Cette prudence est particulièrement importante ici : '+c.problem+'. Les décideurs ont besoin de résultats compréhensibles, mais la simplicité d’une présentation ne doit jamais faire oublier les limites de la méthode. Une interprétation responsable indique à la fois ce que l’on sait, ce que l’on suppose et ce qui reste à examiner.')
],v[2],v[3],"La conférencière recommande de "+v[2].charAt(0).toLowerCase()+v[2].slice(1))},
(c)=>S(c,32,'interview',"Comment la spécialiste souhaite-t-elle communiquer les limites de ses prévisions ?",[
 speaker('Vous avancez des projections concernant '+c.service+', mais sans annoncer de résultat certain. Cela ne risque-t-il pas de troubler le public ?'),
 narrator('Au contraire, il faut expliquer ce que nos données permettent d’affirmer. Nous pouvons décrire des tendances, identifier des facteurs de risque et proposer plusieurs scénarios. Mais nous ne connaissons pas à l’avance chaque décision individuelle ni toutes les conditions qui modifieront le résultat. Cette incertitude n’annule pas l’utilité de la recherche : elle invite à préparer des mesures adaptées et à les réévaluer. Un chiffre extrêmement précis, présenté sans contexte, peut donner une fausse impression de certitude. Il vaut mieux communiquer les hypothèses, une fourchette raisonnable et ce qui pourrait modifier nos conclusions.')
],"Expliquer les hypothèses, les marges d'incertitude et les conditions de révision.",[
"Présenter une prédiction unique comme absolument certaine.",
"Renoncer à communiquer toute information tant que les résultats ne sont pas parfaits.",
"Mettre sur le même plan toutes les estimations, indépendamment des preuves."
],"Elle défend une communication transparente sur les limites et la robustesse des prévisions."),
(c)=>S(c,33,'commentary',"Quelle critique la chroniqueuse formule-t-elle à propos des chiffres présentés ?",[
 narrator('Dans '+c.place+', les responsables mettent en avant un résultat spectaculaire : la fréquentation a augmenté depuis '+c.change+'. C’est une information utile, mais elle ne suffit pas à juger de la qualité du dispositif. Qui a pu en bénéficier ? Les personnes les plus éloignées du service y ont-elles réellement accès ? Et surtout, comment observer '+c.metric+' ? Un indicateur de volume n’est pas automatiquement un indicateur de progrès. Il faut aussi regarder les effets indirects, les coûts pour certains groupes et la stabilité des résultats dans le temps. Sans cela, un succès de communication peut masquer un problème qui n’a pas été résolu.')
],"Le nombre de visiteurs ou de participants ne suffit pas à mesurer les bénéfices réels.",[
"La hausse de fréquentation prouve à elle seule le succès de toutes les mesures.",
"Les données chiffrées ne peuvent jamais apporter d’information utile.",
"L’évaluation doit porter exclusivement sur le coût du matériel."
],"La chroniqueuse distingue un indicateur de fréquentation et une véritable mesure des effets."),
(c)=>S(c,34,'roundtable',"Quelle condition commune les participants retiennent-ils ?",[
 narrator('Vous écoutez une table ronde sur les difficultés rencontrées dans '+c.place+'.'),
 speaker('Nous avons mis en place des outils, mais les usagers signalent encore des difficultés inattendues.'),
 narrator('Certaines personnes n’arrivent pas à terminer la démarche sans aide. Cela pose notamment la question de '+c.concern+'.'),
 speaker('Dans notre évaluation, nous avons surtout compté les connexions ou les visites, pas l’achèvement des démarches.'),
 narrator('Nous devons donc inviter des personnes de profils différents à essayer le service et observer leurs parcours.'),
 speaker('Et prévoir une assistance humaine pour celles qui en ont besoin, sans les obliger à passer par une procédure impossible à comprendre.'),
 narrator('Oui. Les retours doivent réellement modifier nos décisions et pas simplement illustrer notre rapport annuel.')
],"Tester le service avec divers usagers et conserver une aide humaine accessible.",[
"Supprimer tous les guichets avant d'étudier les difficultés.",
"Considérer que le nombre de connexions mesure à lui seul la réussite.",
"Limiter toute consultation aux personnes ayant conçu le dispositif."
],"Les intervenants conviennent d’associer les usagers à l’évaluation et de maintenir une assistance."),
(c)=>S(c,35,'interview',"Quelle idée la spécialiste conteste-t-elle ?",[
 speaker('Le dispositif que vous avez installé dans '+c.venue+' affiche d’excellentes performances. Pourquoi les résultats observés restent-ils décevants ?'),
 narrator('Les chiffres du fabricant ont été obtenus dans des conditions idéales. Sur le terrain, les personnes utilisent les équipements d’une manière plus variée. Les conditions matérielles changent aussi d’un lieu à l’autre. Nous avons sous-estimé le temps nécessaire pour l’entretien, et certains réglages sont difficiles à comprendre. Il serait injuste d’en conclure que les utilisateurs sont simplement responsables. Nous devons comparer les hypothèses techniques aux pratiques réelles, former les équipes et revoir les procédures. Un appareil efficace en laboratoire ne garantit pas à lui seul une amélioration dans tous les contextes.')
],"Un équipement performant sur le papier garantit automatiquement un résultat sur le terrain.",[
"Les usages réels et l’entretien influencent les résultats obtenus.",
"Une étude de terrain peut conduire à modifier une installation.",
"Les utilisateurs ont parfois besoin d’explications adaptées."
],"L’invitée conteste précisément l’idée que la performance technique suffise à garantir l’efficacité réelle."),
(c)=>S(c,36,'interview',"À quelle condition l'engagement des participants produit-il des bénéfices durables ?",[
 speaker('Votre initiative autour de '+c.activity+' réunit plusieurs générations et différents milieux. Peut-on dire que la participation suffit à créer des liens ?'),
 narrator('Non, car une présence imposée ne produit pas nécessairement un échange sincère. Nous avons d’abord prévu un programme très détaillé, en attribuant à chacun un rôle selon son âge ou son expérience. Certains ne s’y reconnaissaient pas. Les activités ont mieux fonctionné lorsque nous avons laissé les personnes proposer des idées, refuser un atelier et avancer à leur rythme. Il faut également veiller à '+c.concern+'. Nous cherchons une relation réciproque, pas un simple nombre de présences enregistré dans un tableau. Les effets se construisent progressivement.')
],"Lorsque chacun peut choisir ses activités et participer librement.",[
"Lorsque tous les participants sont obligés d’assister à chaque réunion.",
"Lorsque les organisateurs imposent les mêmes rôles à toutes les générations.",
"Lorsque le seul critère retenu est le nombre de présences."
],"L’invitée met l’accent sur le volontariat, le choix et la réciprocité."),
(c)=>S(c,37,'interview',"Pourquoi la chercheuse conserve-t-elle des témoignages contradictoires ?",[
 speaker('Dans votre étude concernant '+c.service+', les participants racontent parfois des expériences très différentes. Comment traiter ces contradictions ?'),
 narrator('Nous commençons par vérifier les faits que les documents permettent de confirmer. Les dates, les décisions et les chiffres ne sont pas de simples opinions. Mais il arrive que plusieurs personnes aient vécu le même événement depuis des positions différentes. Leurs récits nous renseignent alors sur ce qu’elles ont observé, ce qu’elles craignaient et ce qu’elles ignoraient. Notre travail consiste à conserver le contexte des entretiens et à confronter les versions, plutôt qu’à en choisir une uniquement parce qu’elle paraît plus convaincante. Cela ne signifie pas que toutes les affirmations se valent. Au contraire, leurs différences nous obligent à préciser la nature des preuves.')
],"Leurs différences révèlent des points de vue qu'il faut confronter aux faits vérifiables.",[
"Parce que toutes les affirmations contradictoires sont nécessairement exactes.",
"Parce qu’il faut éviter de vérifier les dates et les décisions.",
"Parce que la version la plus émouvante doit toujours être retenue."
],"Elle distingue les faits vérifiables des expériences vécues et situe les témoignages dans leur contexte."),
(c)=>S(c,38,'public-lecture',"Quel paradoxe l'exposé met-il principalement en évidence ?",[
 narrator('Vous écoutez une conférence publique sur la manière d’évaluer les politiques locales. Le cas étudié relève du domaine de '+c.theme.toLowerCase()+'.  Une initiative conçue pour résoudre un problème peut parfois le déplacer ou en créer de nouveaux. Ainsi, '+c.change+' peut susciter un véritable enthousiasme. Mais si le nombre de participants augmente sans adaptation des moyens, '+c.problem+'. Il serait tentant de célébrer immédiatement la fréquentation, sans examiner '+c.concern+'. Nous devons distinguer le succès d’un lancement de ses effets durables. Une politique pertinente doit pouvoir évoluer lorsque de nouveaux besoins apparaissent. Il ne s’agit ni de refuser toute innovation ni de considérer qu’une forte demande suffit à prouver une réussite. Il s’agit de choisir les conditions dans lesquelles les bénéfices peuvent se maintenir sans fragiliser ceux qui en dépendent.')
],"Une initiative populaire peut fragiliser les conditions mêmes de sa réussite.",[
"Une forte fréquentation garantit toujours la durabilité d’un projet.",
"La prudence exige de refuser toute expérimentation nouvelle.",
"Le seul enjeu est de rendre la communication plus spectaculaire."
],"L’exposé souligne le risque de confondre popularité immédiate et progrès durable."),
(c)=>S(c,39,'interview',"Quelle approche la spécialiste juge-t-elle nécessaire pour assurer l'avenir du projet ?",[
 speaker('Votre programme, qui concerne '+c.service+', a suscité beaucoup d’intérêt durant ses premiers mois. Pourquoi ne pas conserver exactement son organisation actuelle ?'),
 narrator('Parce que cet essai a bénéficié de circonstances exceptionnelles. Une partie du matériel a été prêtée et plusieurs bénévoles ont fourni un effort qu’il serait difficile de maintenir chaque semaine. La fréquentation démontre un besoin, mais ne nous dit pas comment répartir équitablement le travail ni comment financer les frais réguliers. Il faut aussi anticiper '+c.short+'. Nous proposons donc d’établir un budget réaliste, de discuter des responsabilités et de suivre '+c.metric+'. L’idée n’est pas d’abandonner l’ambition de départ : '+c.longterm+'. Pour durer, une initiative doit pouvoir fonctionner lorsque l’enthousiasme des premiers jours se transforme en activité quotidienne.')
],"Prévoir des ressources durables, répartir les responsabilités et évaluer les effets réels.",[
"Prolonger indéfiniment l’effort exceptionnel des premiers bénévoles.",
"Considérer la fréquentation initiale comme une garantie suffisante de financement.",
"Supprimer toute évaluation afin d’accélérer la croissance."
],"L’invitée insiste sur la viabilité financière et humaine, ainsi que sur le suivi à long terme.")
];
if(advanced.length!==19)throw Error('Advanced items missing: '+advanced.length);
const all=[...qgens,...advanced];
if(all.length!==39||input.contexts.length!==18)throw Error('Format structure mismatch');
await mkdir('curriculum/tcf-listening-build',{recursive:true});
for(const c of input.contexts){
 const n=String(c.n).padStart(2,'0'),questions=all.map((fn,i)=>fn(c));
 const seen=new Set();for(let i=0;i<39;i++){
  const item=questions[i];
  if(item.number!==i+1||item.kind!==formats[i]||item.options.length!==4||seen.has(item.transcript)||!item.correct)
   throw Error('Quality failure Test '+n+' Q'+(i+1));
  seen.add(item.transcript);
 }
 const version='tcf-listening-2026-11-test'+n+'-v1';
 const paper={id:'tcf-listening-'+n,version,title:'TCF Listening · Test '+n,seconds:2100,questions};
 await writeFile(join('curriculum/tcf-listening-build','test'+n+'-audio-pending.json'),JSON.stringify(paper,null,2)+'\n');
 console.log('Authored Test '+n+'; 39 unique French source scripts; matching TCF order and answer key; 35-minute slots');
}

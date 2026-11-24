// Test 02: original advanced source material. The four shared recordings each
// support two distinct comprehension tasks, with no answer copied across panels.
const entretienManuscrits=`— Bonjour, vous dirigez la numérisation d'une collection de manuscrits très fragiles. On entend souvent dire que mettre ces textes en ligne suffit à les sauver. Est-ce votre objectif principal ?
— Pas exactement. La mise en ligne réduit les manipulations et ouvre des textes autrefois réservés à quelques spécialistes. Mais un fichier ne remplace jamais l'objet. Les encres peuvent se dégrader, les reliures se déformer et les traces laissées par les lecteurs anciens disparaître si l'on ne s'occupe pas du support original.
— Alors pourquoi investir autant dans la numérisation ?
— Parce qu'elle permet de confronter des exemplaires conservés dans différents pays. Un détail presque invisible sur une page devient parfois lisible lorsqu'on agrandit l'image. Cela change notre manière de faire de la recherche, sans supprimer le travail matériel des restaurateurs.
— Vous photographiez donc tous les volumes sans distinction ?
— Non. Certains sont si instables qu'il faudrait les ouvrir davantage qu'ils ne peuvent le supporter. Pour eux, nous préparons d'abord des supports sur mesure, ou nous reportons la prise de vue.
— Les internautes voient-ils la même chose que les chercheurs ?
— Les images sont identiques, mais les notices explicatives peuvent évoluer. Nous tenons à indiquer ce qui est une transcription certaine, une restitution probable ou une hypothèse. Dans le passé, les catalogues présentaient parfois des lectures incertaines comme des faits acquis.
— N'est-ce pas décourageant pour un visiteur ordinaire ?
— Je pense l'inverse. Montrer qu'un texte peut susciter plusieurs interprétations aide le public à comprendre la recherche. L'accès ne doit pas créer une illusion de certitude.
— Votre projet pourrait-il finir par remplacer les salles de consultation ?
— Ce n'est ni prévu ni souhaitable. Certaines questions portent sur le papier, les coutures ou les retouches visibles sous un éclairage particulier. L'image ouvre des pistes; elle ne clôt pas l'enquête.`;
const entretienHydrologie=`— Vous travaillez avec des habitants qui relèvent eux-mêmes le niveau des rivières. Pourquoi ne pas vous contenter des stations automatiques ?
— Les stations professionnelles offrent des séries fiables, mais elles sont espacées. Lorsqu'un affluent réagit très vite à un orage localisé, une observation supplémentaire peut aider à comprendre ce qui se passe entre deux points de mesure.
— Est-ce que n'importe quelle photo envoyée par téléphone peut servir ?
— Elle peut signaler une situation anormale, mais il faut la replacer dans son contexte. Nous demandons aux bénévoles de photographier une règle graduée fixe et de noter l'heure. Sinon, deux clichés du même endroit peuvent donner des impressions trompeuses à cause du cadrage.
— Les participants ont-ils reçu une formation scientifique ?
— Une formation courte, plutôt pratique. Nous voulons surtout qu'ils distinguent ce qu'ils voient de ce qu'ils supposent. Dire « l'eau atteint la troisième marque » n'est pas la même chose que prédire une inondation.
— Pourtant, sur les réseaux sociaux, certains messages annoncent aussitôt une catastrophe.
— C'est justement un risque. Nous vérifions les observations avant de les utiliser dans nos modèles et nous expliquons publiquement pourquoi une valeur a pu être écartée. Une mesure isolée, même exacte, ne suffit pas à annoncer le danger pour tout un bassin.
— Quel est alors le rôle de ces données citoyennes ?
— Elles améliorent la description locale et peuvent conduire à examiner une station plus attentivement. Mais les décisions d'alerte reposent sur plusieurs sources, notamment les pluies prévues et l'état des sols.
— Le projet va-t-il remplacer une partie du matériel officiel ?
— Non. Il complète un réseau qui reste indispensable. Nous préférons une contribution modeste mais bien documentée à une multiplication de chiffres qu'on ne sait pas interpréter.`;
const entretienApprovisionnement=`— Vous êtes cheffe d'un restaurant qui travaille avec de petits producteurs. Le public imagine parfois qu'acheter localement signifie commander chaque matin ce qui se trouve sur les étals.
— Ce serait romantique, mais difficile à tenir pour une équipe qui doit préparer cinquante couverts. Nous discutons des volumes à l'avance avec les producteurs, tout en laissant de la place aux changements liés à la météo.
— Pourquoi ne pas signer un prix fixe pour toute la saison ?
— Pour certains produits, nous le faisons. Cela protège les deux parties des variations les plus brutales. Mais imposer un prix fixe à une récolte très incertaine pourrait mettre un maraîcher en difficulté, surtout après une mauvaise semaine.
— Vous acceptez donc de modifier la carte ?
— Oui, mais de manière organisée. Nous prévoyons des ingrédients substituables et nous informons les clients lorsque l'origine change. L'idée n'est pas de promettre une tomate particulière à tout prix, c'est d'assurer une relation durable.
— Votre fournisseur, monsieur Perrin, vous êtes d'accord ?
— Dans l'ensemble. Je préférerais cependant connaître plus tôt les quantités approximatives. Quand plusieurs restaurants appellent la veille, je peux vendre une récolte, mais je ne peux pas décider une semaine plus tôt de la quantité à planter.
— Certains restaurateurs disent qu'un contrat les enferme.
— Un contrat mal conçu, oui. Nous avons prévu une fourchette de quantités et une discussion avant les périodes difficiles. Ce qui nous gêne davantage qu'un prix variable, c'est une commande annoncée comme certaine puis annulée sans prévenir.
— Finalement, quel serait le bon indicateur d'une relation réussie ?
— Pas seulement le prix payé au kilo. Il faut regarder les pertes évitées, la régularité des échanges et la capacité de chacun à s'adapter sans transférer tout le risque sur l'autre.`;
const reportageGarde=`Dans une petite ville industrielle, les horaires de travail décalés compliquent souvent l'organisation familiale. Une coopérative de garde d'enfants vient d'ouvrir trois soirs par semaine dans des locaux prêtés par une association. Les familles adhérentes participent à la gestion et une équipe de professionnels qualifiés assure l'accueil.
Au départ, les organisateurs avaient prévu des ouvertures jusqu'à minuit. Après consultation, ils ont choisi de terminer à vingt-trois heures: plusieurs parents ont expliqué que l'essentiel de leurs besoins se situait entre la sortie de l'école et la fin d'un service du soir.
La responsable souligne que cette initiative ne cherche pas à remplacer les crèches ordinaires. Elle veut surtout répondre aux horaires que les dispositifs traditionnels couvrent mal. Les parents paient une contribution calculée en partie selon leurs revenus, mais la coopérative dépend encore d'une aide municipale pour maintenir les tarifs.
Une première évaluation indique que les places sont très demandées le jeudi, tandis que le lundi reste peu fréquenté. Plutôt que d'ouvrir immédiatement davantage de soirées, l'équipe envisage de revoir les modalités de réservation. Certains parents travaillent selon un planning publié seulement quelques jours à l'avance, alors que la coopérative demande actuellement une inscription deux semaines avant.
Les administrateurs souhaitent tester une petite réserve de places souples avant de prendre des engagements financiers supplémentaires. Ils rappellent aussi qu'un dispositif utile ne doit pas épuiser les salariés qui y travaillent. Une nouvelle enquête auprès des familles et de l'équipe est prévue avant la prochaine rentrée scolaire.`;
export const questions02b=[
{
transcript:`Au pied d'une falaise, des archéologues ont découvert des traces de vie qui remontent à plusieurs siècles. Cette trouvaille attire déjà les visiteurs, et la commune imagine un parcours de découverte. Mais les chercheurs demandent de la prudence. Une partie des vestiges est exposée à l'humidité et aux variations de température. Ouvrir trop rapidement le site pourrait accélérer leur dégradation. La directrice des fouilles ne s'oppose pas au tourisme; elle propose d'abord un relevé complet, puis une présentation de reproductions dans un espace couvert. Les élus devront choisir entre un accès immédiat et une valorisation progressive qui laisse le temps d'étudier les objets.`,
question:"Quelle tension principale le chroniqueur présente-t-il ?",
options:["Le coût des recherches et la durée de formation des archéologues.","L'envie d'ouvrir le site et la nécessité de préserver les vestiges.","La compétition entre les communes pour attirer les spécialistes.","Le choix entre une exposition locale et un prêt à un musée."],correct:"B",
explanation:"L'enjeu est de concilier l'intérêt public et la conservation de découvertes fragiles."
},
{
transcript:`Un centre de formation aéronautique utilise depuis peu un simulateur qui reproduit des situations météorologiques rares. Les stagiaires peuvent ainsi s'entraîner à réagir à une panne sans exposer personne au danger. Les responsables rappellent toutefois que la maîtrise technique n'est pas le seul objectif. Dans un cockpit, les décisions doivent être partagées et les informations échangées clairement. Or, un stagiaire peut réussir un exercice isolé tout en communiquant mal avec son collègue. Le centre prévoit donc des séances où les instructeurs évaluent non seulement la manoeuvre, mais aussi les questions posées, les hésitations signalées et la manière dont les responsabilités sont réparties.`,
question:"Quelle limite d'une formation fondée uniquement sur le simulateur individuel est soulignée ?",
options:["Elle risque de négliger la coopération entre membres de l'équipage.","Elle empêche de s'exercer à des conditions météorologiques extrêmes.","Elle réduit la possibilité de répéter une manoeuvre difficile.","Elle nécessite trop de matériel pour reproduire les pannes courantes."],correct:"A",
explanation:"Le chroniqueur souligne que réussir une manoeuvre n'assure pas une bonne communication entre collègues."
},
{
transcript:entretienManuscrits,
question:"Quel bénéfice de la numérisation la conservatrice met-elle principalement en avant ?",
options:["Elle facilite la comparaison de documents auparavant difficiles à réunir.","Elle élimine le besoin d'étudier les reliures des manuscrits.","Elle assure que chaque transcription proposée soit définitive.","Elle rend possible la photographie de tous les volumes sans risque."],correct:"A",
explanation:"La conservatrice souligne la comparaison de manuscrits dispersés et le repérage de détails."
},
{
transcript:entretienManuscrits,
question:"Pourquoi la conservatrice maintient-elle l'accès aux originaux ?",
options:["Parce que les fichiers publiés ne sont disponibles qu'à certains chercheurs.","Parce que les notices numériques doivent d'abord être traduites.","Parce que les lecteurs refusent généralement les reproductions.","Parce que certaines propriétés matérielles échappent aux images."],correct:"D",
explanation:"Le papier, les coutures et les retouches nécessitent parfois un examen physique."
},
{
transcript:entretienHydrologie,
question:"Quelle précaution est demandée aux observateurs bénévoles ?",
options:["Comparer chaque relevé à une prévision météorologique à long terme.","Utiliser un repère fixe et noter précisément le moment du relevé.","Envoyer une photographie seulement si l'eau dépasse un seuil connu.","Interpréter la mesure avant de la communiquer à l'équipe scientifique."],correct:"B",
explanation:"La règle fixe et l'heure rendent les observations comparables."
},
{
transcript:entretienHydrologie,
question:"Comment la chercheuse considère-t-elle une mesure citoyenne isolée ?",
options:["Comme un signal qui remplace un contrôle professionnel lorsque l'orage est local.","Comme une mesure suffisante pour déclencher une alerte sur un affluent.","Comme une donnée à vérifier et à croiser avec d'autres informations.","Comme une observation utile seulement après la fin de l'épisode pluvieux."],correct:"C",
explanation:"Les relevés complètent le réseau et doivent être vérifiés avant toute interprétation."
},
{
transcript:entretienApprovisionnement,
question:"Pourquoi la cheffe évite-t-elle un prix fixe pour certains produits ?",
options:["Parce que les restaurants souhaitent changer leurs fournisseurs chaque semaine.","Parce que les acheteurs ne peuvent pas annoncer de volumes approximatifs.","Parce qu'un tarif négocié empêcherait toute substitution sur la carte.","Parce qu'une récolte incertaine ferait porter trop de risque au producteur."],correct:"D",
explanation:"Un prix imposé pour une récolte imprévisible peut fragiliser le maraîcher."
},
{
transcript:entretienApprovisionnement,
question:"Quelle attente le fournisseur exprime-t-il plus particulièrement ?",
options:["Disposer plus tôt d'indications fiables sur les quantités envisagées.","Pouvoir supprimer les commandes pendant les périodes de pluie.","Recevoir un paiement plus rapide pour chaque livraison effectuée.","Conserver le même assortiment pendant la totalité de la saison."],correct:"A",
explanation:"Il demande une anticipation des volumes et critique les annulations imprévues."
},
{
transcript:reportageGarde,
question:"Pourquoi la coopérative a-t-elle choisi de fermer à vingt-trois heures ?",
options:["Les locaux ne peuvent pas accueillir d'enfants plus tard.","La majorité des familles n'a pas besoin d'une ouverture jusqu'à minuit.","La réglementation municipale interdit le travail de nuit.","Les professionnels refusent toute intervention après vingt-deux heures."],correct:"B",
explanation:"La consultation a révélé que les besoins étaient surtout concentrés avant vingt-trois heures."
},
{
transcript:reportageGarde,
question:"Quel changement l'équipe envisage-t-elle avant d'élargir le service ?",
options:["Supprimer l'aide municipale au fonctionnement.","Réduire les journées d'accueil les moins fréquentées.","Assouplir les réservations pour les familles aux plannings tardifs.","Réserver les places souples aux parents ayant adhéré depuis un an."],correct:"C",
explanation:"La coopérative souhaite tester une réserve de places pouvant être réservées plus tard."
},
{
transcript:`Une historienne enregistre les récits d'anciens habitants pour reconstituer la vie d'un quartier portuaire. Elle observe que les transcriptions rédigées effacent souvent les hésitations, les silences ou les reprises de phrase. Pourtant, ces détails peuvent signaler un souvenir fragile ou une difficulté à attribuer un événement à la bonne période. Elle ne propose pas de conserver toutes les erreurs de langage dans les textes destinés au public. En revanche, elle demande de garder les fichiers sonores et d'indiquer clairement les passages réorganisés. Ainsi, un lecteur pourra profiter d'un récit fluide sans confondre le travail de montage avec les mots exacts d'un témoin.`,
question:"Quelle distinction l'historienne souhaite-t-elle préserver ?",
options:["La différence entre la parole enregistrée et le récit édité.","La différence entre les habitants récents et les témoins anciens.","La différence entre l'histoire officielle et les souvenirs personnels.","La différence entre les entretiens publiés et ceux restés privés."],correct:"A",
explanation:"Elle veut conserver les enregistrements et signaler les modifications éditoriales."
},
{
transcript:`Une économiste examine un nouveau tarif de l'eau destiné à décourager le gaspillage. Les premiers mètres cubes seraient vendus à prix réduit, puis le tarif augmenterait avec la consommation. Ce système paraît équitable si l'on suppose que les ménages qui consomment davantage disposent de plus de moyens. Mais une famille nombreuse ou un logement mal isolé sur le plan hydraulique peut utiliser beaucoup d'eau sans être particulièrement riche. La chercheuse recommande donc d'analyser les besoins essentiels et l'état des bâtiments avant de conclure qu'un tarif progressif récompense toujours les comportements responsables. Une grille simple à lire n'est pas nécessairement simple à justifier.`,
question:"Quelle réserve l'économiste formule-t-elle ?",
options:["Un tarif progressif ne modifie jamais les habitudes de consommation.","Une forte consommation ne traduit pas nécessairement un usage excessif.","Les familles nombreuses devraient payer le même montant que les autres.","Les premières quantités d'eau devraient être plus chères pour tous."],correct:"B",
explanation:"Les besoins des familles et les fuites peuvent expliquer de gros volumes sans gaspillage."
},
{
transcript:`Un écologue s'inquiète de la disparition des abeilles sauvages dans les zones agricoles. Plusieurs communes ont réagi en installant des ruches d'abeilles domestiques. La démarche attire l'attention sur les pollinisateurs, mais elle ne résout pas le problème principal: les espèces sauvages ont besoin de sites de nidification variés et de fleurs à différentes saisons. Dans certains milieux, une multiplication excessive de ruches peut même accentuer la concurrence pour les ressources. Le chercheur ne souhaite pas interdire l'apiculture. Il conseille plutôt de restaurer les haies, de laisser certaines parcelles fleurir et de mesurer les effets avant d'étendre les installations.`,
question:"Pourquoi le chercheur juge-t-il les nouvelles ruches insuffisantes ?",
options:["Elles coûtent davantage à entretenir que les espaces fleuris.","Elles ne garantissent pas la reproduction des espèces sauvages.","Elles nécessitent une surveillance permanente des exploitants.","Elles risquent de limiter la vente de produits apicoles locaux."],correct:"B",
explanation:"Les ruches domestiques n'apportent pas directement les habitats variés nécessaires aux abeilles sauvages."
},
{
transcript:`Une programmatrice musicale compare ses choix à ceux d'un outil de recommandation. L'algorithme détecte les chansons proches de celles qu'un auditeur aime déjà et évite parfois de proposer une oeuvre qui pourrait le dérouter. La programmatrice estime que cette prudence favorise une écoute agréable, mais qu'elle peut enfermer l'auditeur dans des habitudes. À l'inverse, une sélection entièrement fondée sur la surprise risque de perdre son public. Elle construit donc ses listes autour de quelques repères familiers, entre lesquels elle insère des découvertes plus exigeantes. Son critère de réussite n'est pas seulement le nombre d'écoutes, mais la capacité à éveiller une curiosité durable.`,
question:"Quelle logique guide le travail de la programmatrice ?",
options:["Écarter les titres familiers pour renouveler totalement l'écoute.","Reproduire la sélection algorithmique en ajoutant plus de morceaux.","Privilégier les titres qui génèrent le plus d'écoutes immédiates.","Associer des repères connus à des découvertes moins attendues."],correct:"D",
explanation:"Elle combine familiarité et surprise pour susciter une curiosité durable."
},
{
transcript:`Un chercheur étudie l'origine d'une peinture conservée dans une collection privée. Les documents juridiques indiquent qu'elle a été acquise il y a plusieurs décennies conformément aux règles alors en vigueur. Cependant, de nouvelles archives montrent que son précédent propriétaire avait probablement subi des pressions pour la vendre. Le chercheur insiste sur une différence: la légalité d'une transaction ne répond pas toujours à toutes les questions éthiques qu'elle soulève. Il invite les responsables de la collection à publier les documents, consulter les héritiers concernés et examiner plusieurs solutions, sans annoncer à l'avance la restitution comme seule issue possible.`,
question:"Quelle démarche le chercheur préconise-t-il ?",
options:["Annuler immédiatement la transaction ancienne sans examen complémentaire.","Rendre les documents publics et discuter avec les parties concernées.","Considérer la légalité ancienne comme une réponse définitive.","Attendre une décision judiciaire avant toute publication des archives."],correct:"B",
explanation:"Il demande une enquête transparente et un dialogue avant de décider de la suite."
},
{
transcript:`Une architecte présente une résidence construite autour d'une cuisine commune, d'un atelier et d'un jardin partagé. Le projet promet de réduire certains coûts en mutualisant les équipements. Après plusieurs mois, les habitants soulignent aussi des tensions: certains utilisent fréquemment les espaces, d'autres contribuent financièrement mais y vont rarement. L'architecte recommande de ne pas confondre partage et disponibilité permanente. Des règles de réservation, des responsabilités d'entretien et des zones privées clairement définies sont nécessaires. Elle estime que le modèle est intéressant, non parce qu'il supprime les conflits, mais parce qu'il permet de les traiter ouvertement.`,
question:"Quelle condition l'architecte juge-t-elle importante pour ce type d'habitat ?",
options:["Rendre l'utilisation des espaces communs identique pour tous.","Réduire la taille des logements au profit des ateliers.","Définir clairement les usages et les obligations des résidents.","Attribuer l'entretien exclusivement aux habitants les plus présents."],correct:"C",
explanation:"L'architecte préconise des règles explicites de réservation et d'entretien."
},
{
transcript:`Une biologiste suit des cultures d'algues sur une côte où les pêcheurs cherchent de nouvelles activités. Certaines espèces poussent rapidement et absorbent des éléments nutritifs présents dans l'eau. Mais le rendement varie fortement selon la température, la salinité et la circulation marine. Une bonne récolte obtenue pendant un été ne garantit donc pas une production stable toute l'année. La chercheuse étudie aussi l'impact des structures de culture sur les petites embarcations et sur d'autres espèces du littoral. Elle demande aux investisseurs de considérer l'ensemble du milieu plutôt que de présenter les algues comme une solution universelle aux problèmes écologiques de la région.`,
question:"Pourquoi la chercheuse reste-t-elle prudente devant les premiers rendements ?",
options:["Les conditions locales peuvent modifier sensiblement la production.","Les algues cultivées ne peuvent pas être vendues hors de la région.","La plupart des récoltes doivent être stockées pendant une année.","Les installations étudiées empêchent déjà toute navigation côtière."],correct:"A",
explanation:"La production dépend de facteurs environnementaux variables selon les saisons."
},
{
transcript:`Un spécialiste du tourisme régional analyse un projet de liaison ferroviaire directe vers une vallée préservée. Les habitants espèrent que le train remplacera une partie des voitures, mais craignent aussi qu'il attire davantage de visiteurs lors des week-ends les plus fréquentés. Le plan initial prévoit de nombreux départs rapides sans examiner les capacités des sentiers et des hébergements. L'expert recommande une stratégie plus large: coordonner les horaires avec les transports locaux, mesurer la fréquentation et protéger les zones les plus fragiles. Il souligne que le transport collectif peut réduire l'impact d'un déplacement individuel tout en augmentant le nombre total de déplacements.`,
question:"Quelle contradiction le spécialiste met-il en évidence ?",
options:["Un train direct réduit toujours les capacités des hébergements.","Une offre collective peut diminuer l'usage de la voiture tout en attirant plus de visiteurs.","Les horaires rapides ne sont utiles qu'aux touristes déjà motorisés.","Les sentiers protégés demandent nécessairement de nouvelles routes."],correct:"B",
explanation:"Le train peut réduire l'impact par trajet, mais augmenter la fréquentation totale."
},
{
transcript:`Une spécialiste de l'analyse sensorielle compare deux méthodes de contrôle des aliments. Les appareils mesurent précisément l'acidité et certains composés aromatiques. Les dégustateurs, eux, peuvent repérer une impression d'amertume ou une texture inhabituelle, mais leurs avis varient selon les habitudes et le contexte. La chercheuse refuse d'opposer les deux approches. Un chiffre de laboratoire peut expliquer une sensation sans prédire à lui seul l'acceptation d'un produit par les consommateurs. De même, l'enthousiasme d'un petit groupe de dégustateurs ne garantit pas la stabilité d'une recette. Elle recommande de croiser mesures, dégustations répétées et conditions de fabrication.`,
question:"Quel principe guide l'évaluation proposée ?",
options:["Remplacer la dégustation par des appareils plus sensibles.","Conserver uniquement les préférences exprimées par les consommateurs.","Analyser les recettes uniquement après leur mise en vente.","Combiner mesures objectives et appréciations sensorielles."],correct:"D",
explanation:"Les mesures et les perceptions apportent des informations différentes, à comparer."
},
{
transcript:`Une interprète travaille sur des entretiens enregistrés avec des personnes qui parlent plusieurs variétés régionales du français. Certaines expressions ont un sens littéral, mais leur emploi renvoie aussi à une forme d'humour ou à un rapport particulier entre les interlocuteurs. Traduire chaque mot avec exactitude peut alors donner une phrase grammaticalement correcte qui manque pourtant l'intention. L'interprète consulte les locuteurs lorsque c'est possible et fournit parfois une brève note culturelle. Elle met cependant en garde contre l'excès d'explications: une traduction chargée de commentaires peut interrompre l'échange. Son objectif est de restituer la relation entre les personnes autant que leurs mots.`,
question:"Quelle difficulté l'interprète cherche-t-elle surtout à résoudre ?",
options:["L'impossibilité de trouver un équivalent grammatical aux expressions régionales.","Le manque d'enregistrements suffisamment clairs pour établir les mots.","La restitution des intentions et du contexte au-delà du sens littéral.","La nécessité de transformer toutes les expressions en français standard."],correct:"C",
explanation:"Le problème est de traduire les sous-entendus et la relation sans se limiter aux mots."
}
];

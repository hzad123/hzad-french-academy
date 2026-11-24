// Test 02: independently authored French source passages 01-20.
// These are ORIGINAL editorial drafts. They are not publishable until every
// question passes blind and semantic review and audio is rendered and measured.
export const questions02a=[
{
transcript:`— Bonjour, j'ai réservé deux places pour l'atelier de poterie de samedi, mais je ne vois aucune indication pour récupérer nos objets après la cuisson.
— La séance comprend le façonnage. Nous appliquons l'émail mardi, puis les pièces restent trois jours au four et sur les étagères de refroidissement.
— Donc nous ne repartons pas avec nos bols samedi ?
— Non, vous pourrez revenir le vendredi suivant à l'accueil ou demander un envoi, dont les frais ne sont pas inclus.`,
question:"Que précise l'employée au sujet des objets fabriqués ?",
options:["Ils doivent être décorés par les participants après le cours.","Ils seront livrés sans supplément aux participants inscrits.","Ils seront récupérables plusieurs jours après l'atelier.","Ils ne seront conservés que jusqu'au samedi suivant."],correct:"C",
explanation:"Le façonnage a lieu samedi, mais la finition et la cuisson imposent un retrait le vendredi suivant."
},
{
transcript:`— Bonjour, je pars pour l'île de Bréhat. Est-ce que mon billet couvre aussi la navette qui traverse la baie ?
— Il couvre la traversée principale, pas la navette du port nord. Vous devrez acheter un second titre sur place.
— Et si je prends la correspondance de quinze heures ?
— Il faut d'abord faire valider votre billet principal à cette borne. Sinon, même avec une réservation, l'agent à bord ne pourra pas vous laisser embarquer.`,
question:"Que doit faire le passager avant la traversée principale ?",
options:["Faire valider le billet qu'il possède déjà.","Réserver une seconde place au guichet central.","Présenter le reçu d'une navette complémentaire.","Changer son billet pour une autre traversée."],correct:"A",
explanation:"L'agent indique que la validation à la borne est nécessaire avant l'embarquement."
},
{
transcript:`— Excusez-moi, où se déroule l'observation des étoiles ? Je croyais que le rendez-vous était dans la coupole.
— Ce soir, les télescopes sont installés dans le jardin, près du vieux cadran solaire. La coupole accueille uniquement une exposition.
— Même avec ce vent ?
— Nous déciderons à vingt heures si l'observation est possible. En attendant, vous pouvez assister à la présentation du ciel dans la salle de conférence.`,
question:"Où les visiteurs doivent-ils se présenter pour observer le ciel, si la météo le permet ?",
options:["Dans la coupole ouverte au public.","Dans la salle de conférence du bâtiment.","Près du centre d'accueil des visiteurs.","Dans le jardin, à côté du cadran solaire."],correct:"D",
explanation:"Le lieu prévu pour les télescopes est le jardin, la coupole n'accueillant que l'exposition."
},
{
transcript:`— Bonjour, j'organise un dîner et j'aimerais préparer ce bar au four. Est-ce que vous pouvez enlever les écailles et les arêtes ?
— Je peux l'écailler et le vider. En revanche, si je retire toutes les arêtes, il faudra le lever en filets.
— Je souhaite le cuire entier.
— Dans ce cas, je laisse l'arête centrale et je prépare le poisson pour une cuisson entière. Je peux aussi garder la tête si vous le préférez.`,
question:"Comment le poissonnier préparera-t-il finalement le poisson ?",
options:["En filets complètement désarêtés.","Entier, nettoyé mais avec l'arête centrale.","En portions déjà assaisonnées pour le four.","Sans tête ni peau, prêt à être poêlé."],correct:"B",
explanation:"La cliente veut une cuisson entière; le poissonnier conserve donc l'arête centrale."
},
{
transcript:`Attention, annonce à l'attention des voyageurs du train régional pour Saint-Malo. Le départ de seize heures vingt est maintenu et la composition du train ne change pas. En raison de travaux sur la signalisation, les voitures seront toutefois accessibles depuis la zone C et non depuis la zone A indiquée sur certains billets. Les agents présents sur le quai pourront orienter les passagers qui ont besoin d'assistance. Nous vous invitons à rejoindre cette zone avant l'arrivée du train.`,
question:"Quel changement concerne le train annoncé ?",
options:["La composition des voitures sera différente.","Les passagers doivent rejoindre une autre zone du quai.","L'arrivée du train a été avancée de quelques minutes.","Les voyageurs doivent demander de nouveaux billets."],correct:"B",
explanation:"L'annonce conserve l'horaire et les voitures, mais déplace l'accès vers la zone C."
},
{
transcript:`La piscine municipale informe ses usagers que le bassin sportif restera ouvert toute la matinée de jeudi. De dix heures à onze heures, le couloir situé contre les grandes fenêtres sera réservé à une séance de natation adaptée. Les autres couloirs pourront être utilisés normalement, à condition de respecter le sens de circulation affiché. Les leçons pour enfants prévues dans le petit bassin ne sont pas concernées. L'accueil remercie les nageurs de faciliter l'accès aux personnes inscrites à cette activité.`,
question:"Quelle restriction temporaire est annoncée ?",
options:["Le bassin sportif ferme pendant une heure.","Les cours pour enfants changent de bassin.","L'entrée principale devient inaccessible.","Un seul couloir est réservé à une activité."],correct:"D",
explanation:"La séance adaptée occupe uniquement un couloir pendant une heure."
},
{
transcript:`Le festival des lettres annonce un changement pour la lecture publique prévue demain à onze heures. Les rafales de vent attendues rendent l'installation de la scène du parc incertaine. La rencontre avec les deux autrices aura finalement lieu dans la salle des fêtes, à côté de la mairie. L'horaire reste identique et les réservations déjà effectuées demeurent valables. Les personnes ayant demandé une place accessible sont invitées à emprunter l'entrée latérale. La séance de dédicaces prévue en fin d'après-midi ne change pas.`,
question:"Que doivent retenir les personnes ayant réservé la lecture ?",
options:["Elles doivent se rendre à un autre lieu à la même heure.","Elles pourront assister à une séance ajoutée le soir.","Elles doivent refaire leur réservation pour la salle.","Elles verront une seule autrice au lieu de deux."],correct:"A",
explanation:"Seul le lieu de la lecture change, pas son horaire ni la validité des réservations."
},
{
transcript:`En raison de la visite de contrôle des câbles, le téléphérique du Mont-Argent ouvrira dimanche à neuf heures trente au lieu de huit heures. Les billets datés du dimanche restent valables toute la journée, mais les départs annoncés avant neuf heures trente sont supprimés. Les visiteurs qui doivent rejoindre une randonnée accompagnée pourront prendre une navette terrestre gratuite jusqu'au point de rendez-vous. Le dernier trajet du soir, lui, n'est pas modifié.`,
question:"Quelle conséquence la visite de contrôle entraîne-t-elle ?",
options:["Le dernier départ du soir est avancé.","La navette terrestre devient obligatoire pour tous.","L'ouverture du téléphérique est retardée.","Les billets du dimanche doivent être échangés."],correct:"C",
explanation:"Le téléphérique ouvre une heure et demie plus tard que prévu."
},
{
transcript:`Bonjour, c'est le jardin botanique de la ville. Nous appelons à propos de votre carte annuelle. Elle est prête depuis hier, mais nous ne pouvons pas encore l'expédier: votre dossier ne comporte pas de pièce d'identité vérifiée. Si vous passez à l'accueil avec un document officiel, nous pourrons vous remettre la carte immédiatement. Vous n'avez pas besoin de régler une seconde fois la cotisation, car votre paiement figure bien dans notre système. N'hésitez pas à nous rappeler si vous préférez venir la semaine prochaine.`,
question:"Pourquoi la carte n'a-t-elle pas été envoyée ?",
options:["Une vérification d'identité reste à effectuer.","Le paiement annuel n'a pas été enregistré.","L'accueil attend la fin de la période d'inscription.","Le demandeur a choisi un retrait le mois prochain."],correct:"A",
explanation:"Le paiement est enregistré; seule la pièce d'identité doit être vérifiée."
},
{
transcript:`Bonsoir, ici l'atelier des vents. Votre clarinette est réparée: la fuite qui affectait le registre grave a été corrigée et l'instrument a été testé ce matin. Vous pouvez venir le récupérer dès demain. J'ai toutefois remarqué que les clés pourraient bénéficier d'un polissage. Cette prestation est facultative et demanderait deux jours supplémentaires. Je n'ai rien engagé sans votre accord. Merci de nous dire si vous souhaitez ce travail supplémentaire, sinon nous vous rendrons l'instrument dans son état actuel, parfaitement jouable.`,
question:"Que propose le réparateur ?",
options:["De remplacer le mécanisme principal avant le retrait.","De repousser obligatoirement la livraison de deux jours.","De reprendre une réparation qui n'a pas fonctionné.","D'effectuer une finition facultative avec l'accord du client."],correct:"D",
explanation:"La réparation est terminée; un polissage facultatif reste proposé."
},
{
transcript:`Bonjour, vous êtes inscrite à la course des remparts de dimanche. Les dossards seront distribués samedi au gymnase de dix heures à dix-huit heures. Un retrait reste possible le dimanche matin, mais uniquement pour les coureurs ayant signalé une arrivée tardive lors de l'inscription. Il faut apporter la confirmation envoyée par courrier électronique. Les bénévoles ne pourront pas imprimer les justificatifs sur place. Nous vous conseillons donc de préparer le document avant de vous déplacer.`,
question:"Quelle démarche est recommandée à la participante ?",
options:["Modifier son inscription avant la course.","Télécharger un nouveau certificat médical.","Préparer sa confirmation pour le retrait du dossard.","Se présenter uniquement le dimanche matin."],correct:"C",
explanation:"Le message demande la confirmation d'inscription pour retirer le dossard."
},
{
transcript:`Bonjour, service des consignes automatiques. Nous vous informons que les casiers du secteur est seront indisponibles vendredi entre huit et quatorze heures en raison d'une mise à jour. Si votre colis y est actuellement conservé, son délai de retrait sera automatiquement prolongé de vingt-quatre heures. Le code reçu par SMS restera le même. Vous n'avez pas besoin de contacter l'expéditeur ni de demander un nouveau numéro. Les autres casiers du bâtiment fonctionneront normalement.`,
question:"Que se passe-t-il pour les colis déjà déposés dans le secteur concerné ?",
options:["Ils sont transférés vers le secteur ouest.","Leur délai de retrait est prolongé automatiquement.","Le destinataire doit solliciter un nouveau code.","L'expéditeur doit confirmer leur conservation."],correct:"B",
explanation:"La maintenance entraîne automatiquement un délai supplémentaire sans changement de code."
},
{
transcript:`— Je trouve intéressante l'idée de partager des perceuses et des outils qu'on utilise rarement, mais je ne suis pas certain que la cotisation soit suffisante pour éviter les pertes.
— C'est pour cela qu'une caution est demandée lors de l'emprunt.
— Justement, je ne suis pas opposé à la caution. Ce que je voudrais, c'est comprendre comment on décide si une rayure normale justifie une retenue. Il faudrait publier des critères précis, plutôt que laisser chaque bénévole décider seul. Une règle claire rassurerait aussi les membres qui prêtent leurs propres équipements.`,
question:"Quelle préoccupation principale cette personne exprime-t-elle ?",
options:["La difficulté de trouver des bénévoles pour gérer le matériel.","Le manque de variété des outils proposés aux adhérents.","L'absence d'une cotisation suffisamment élevée.","Le besoin de règles transparentes sur les cautions."],correct:"D",
explanation:"Il accepte la caution en principe mais veut des critères de retenue explicites."
},
{
transcript:`— Au café, on nous propose désormais un gobelet réutilisable, et je suis plutôt favorable à l'idée.
— Vous l'utilisez à chaque fois ?
— Pas vraiment. Quand la file est longue, il faut demander au serveur comment le rendre, parfois laisser une petite consigne, et les gens derrière s'impatientent. Le dispositif fonctionnerait mieux si le retour était clairement indiqué et accessible sans refaire toute la queue. Je ne demande pas de supprimer les gobelets réutilisables; au contraire, j'aimerais qu'ils deviennent la solution la plus simple.`,
question:"Quelle amélioration cette personne souhaite-t-elle ?",
options:["Un parcours plus pratique pour rendre les gobelets.","Un prix plus bas pour les boissons à emporter.","Un choix de gobelets réutilisables plus important.","Une obligation d'apporter son propre contenant."],correct:"A",
explanation:"La personne réclame un retour accessible sans refaire la queue."
},
{
transcript:`— L'école voudrait avancer le déjeuner des élèves de vingt minutes. Ça pourrait réduire l'attente au réfectoire, c'est vrai.
— Donc vous êtes favorable au changement ?
— Oui, à condition de revoir l'arrivée des autocars. Les enfants qui habitent loin n'ont pas forcément le temps de prendre une collation avant le cours, et une modification isolée du repas ne règlera rien. Il faudrait que la direction consulte aussi les chauffeurs et les familles. Le changement peut avoir un sens, mais il doit s'inscrire dans l'ensemble de la journée.`,
question:"À quelle condition la personne accepte-t-elle la proposition ?",
options:["Si les parents prennent en charge le transport.","Si le déjeuner devient moins long pour tous.","Si l'organisation des transports est aussi revue.","Si les cours du matin sont raccourcis."],correct:"C",
explanation:"Elle insiste sur la coordination avec les arrivées en autocar et la journée scolaire."
},
{
transcript:`— Vous avez vu la nouvelle fresque que la ville veut installer devant la gare ?
— J'ai vu l'appel à propositions. Le projet me plaît, mais ce qu'on appelle une consultation n'est pas un vote. Les habitants pourront commenter les esquisses, tandis que le comité artistique gardera la décision finale.
— Ça vous dérange ?
— Pas nécessairement. Je voudrais seulement que la mairie explique clairement à quoi serviront les avis recueillis. Si l'on laisse croire que les citoyens choisissent l'œuvre, les déceptions seront inévitables.`,
question:"Quel point cette personne juge-t-elle essentiel ?",
options:["Que le comité artistique abandonne son rôle.","Que l'usage des avis des habitants soit explicité.","Que chaque proposition fasse l'objet d'un vote direct.","Que la fresque soit réalisée avant la consultation."],correct:"B",
explanation:"Elle ne réclame pas un vote obligatoire, mais de la clarté sur le poids des avis."
},
{
transcript:`— Depuis qu'on a mis en place les bacs de compost, les voisins participent volontiers. Pourtant, le résultat n'est pas toujours bon.
— Il manque des collectes ?
— Non, les collectes sont régulières. Le problème, c'est que certains déposent des sacs soi-disant biodégradables qui ne conviennent pas au système, ou mélangent les déchets de cuisine avec du plastique. À mon avis, il vaut mieux consacrer un peu de temps à l'explication des consignes que multiplier immédiatement le nombre de bacs.`,
question:"Quelle priorité la personne défend-elle ?",
options:["Renforcer la fréquence des collectes du quartier.","Remplacer les bacs par un service à domicile.","Mettre en place des sacs fournis par la mairie.","Mieux expliquer le tri avant d'augmenter les équipements."],correct:"D",
explanation:"Elle précise que les collectes fonctionnent; les erreurs de tri doivent être corrigées."
},
{
transcript:`— Les billets de théâtre à tarif variable, vous en pensez quoi ?
— Je comprends pourquoi le théâtre les propose. Les spectacles très demandés financent parfois des petites productions qui ont moins de public.
— Vous trouvez ça juste ?
— Seulement si les spectateurs savent à l'avance pourquoi les prix évoluent. Je préfère payer un peu plus pour une représentation populaire que découvrir, au dernier moment, un montant impossible à anticiper. Le problème n'est pas le principe d'un tarif modulé; c'est l'opacité des règles de calcul.`,
question:"Qu'est-ce que la personne critique surtout ?",
options:["L'incertitude entourant le calcul des prix.","Le financement des spectacles moins populaires.","L'existence de plusieurs catégories de sièges.","Le maintien des tarifs réduits pour certains publics."],correct:"A",
explanation:"Elle distingue la tarification modulée, qu'elle accepte, du manque de transparence."
},
{
transcript:`— On parle de construire trois nouvelles fontaines publiques cet été.
— C'est utile de pouvoir remplir sa bouteille quand on marche, mais il existe déjà deux fontaines près du centre qui ne fonctionnent presque jamais.
— Vous préféreriez arrêter le projet ?
— Je commencerais plutôt par réparer les équipements en panne et publier les dates d'entretien. Sinon, on risque de financer des installations visibles le jour de l'inauguration mais inutilisables quelques mois plus tard. Ensuite, pourquoi pas de nouvelles fontaines dans les quartiers qui en manquent.`,
question:"Quelle action cette personne préconise-t-elle d'abord ?",
options:["Étudier uniquement les quartiers sans fontaine.","Faire payer l'entretien aux usagers réguliers.","Remettre en service les fontaines existantes.","Installer de nouveaux points d'eau au centre."],correct:"C",
explanation:"Elle propose de réparer les fontaines en panne avant d'en créer d'autres."
},
{
transcript:`— La ville veut tirer au sort les membres d'un jury citoyen pour discuter des projets d'aménagement.
— Je trouve cela préférable à un groupe composé uniquement de personnes déjà engagées. Mais il faut penser à celles qui travaillent le soir ou gardent un proche.
— Vous voulez des indemnités ?
— Parfois une aide à la garde ou au déplacement suffit. Sans ces moyens pratiques, le tirage au sort donnera une impression de diversité, mais ceux qui pourront réellement participer appartiendront encore aux mêmes catégories. Le principe est bon, les conditions de participation doivent suivre.`,
question:"Quelle limite potentielle est soulignée ?",
options:["Le jury pourrait manquer de sujets à examiner.","Le tirage au sort favoriserait automatiquement les élus.","Les citoyens engagés seraient exclus de toute consultation.","Certaines personnes sélectionnées ne pourraient pas participer."],correct:"D",
explanation:"Sans soutien matériel, des personnes tirées au sort ne pourront pas assister aux réunions."
}
];

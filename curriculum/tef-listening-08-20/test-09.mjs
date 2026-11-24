/* Original Test 09: source awaiting measured audio and editorial review. */
export const clips = [
  {
    "start": 1,
    "topic": "réglage d’un microscope de laboratoire",
    "script": "— L’image est nette au centre, mais je ne vois pas les détails sur les bords.\n— Changez d’objectif, puis tournez doucement cette petite molette. Votre lame est légèrement inclinée.\n— Je dois ajouter une goutte d’eau sur l’échantillon ?\n— Pas cette fois. Commencez par observer la préparation telle qu’elle est. Nous comparerons ensuite les résultats avec une préparation humide.\n— Je vais noter le grossissement utilisé.",
    "questions": [
      {
        "stem": "Quelle activité est en cours ?",
        "correct": "Observer un échantillon au microscope.",
        "wrong": [
          "Examiner un négatif de photographie.",
          "Réparer l’objectif d’un appareil photo.",
          "Mesurer la température d’une préparation."
        ],
        "explanation": "Le grossissement, la lame et l’objectif servent à observer un échantillon.",
        "illustrationIcons": [
          "🔬",
          "🎞️",
          "📷",
          "🌡️"
        ]
      }
    ]
  },
  {
    "start": 2,
    "topic": "tri de vêtements pour un spectacle",
    "script": "— Les costumes de la première scène sont sur ce portant, mais il manque encore deux vestes.\n— Regarde dans les housses bleues. Les étiquettes portent les noms des comédiens.\n— Je les place dans l’ordre des entrées sur scène ?\n— Exactement. Pendant la représentation, ils auront très peu de temps pour se changer. Laisse aussi les accessoires dans les paniers correspondants.",
    "questions": [
      {
        "stem": "Quelle scène correspond au dialogue ?",
        "correct": "La préparation des costumes dans les coulisses.",
        "wrong": [
          "Le classement des vêtements dans une boutique.",
          "Le rangement des bagages dans un vestiaire.",
          "La mise en rayon des accessoires d’un magasin."
        ],
        "explanation": "Les vêtements sont classés pour les changements rapides des comédiens.",
        "illustrationIcons": [
          "🎭",
          "🛍️",
          "🧳",
          "🧢"
        ]
      }
    ]
  },
  {
    "start": 3,
    "topic": "réparation d’une fermeture éclair de tente",
    "script": "— Le curseur se bloque toujours au même endroit quand je ferme l’entrée.\n— Je vois : deux dents sont déformées. Le tissu lui-même est encore en bon état.\n— Est-ce que vous devez remplacer toute la toile ?\n— Non, je vais changer la fermeture et vérifier l’étanchéité de la couture. Vous pourrez camper avec cette tente dès le week-end prochain.",
    "questions": [
      {
        "stem": "Quelle intervention est prévue ?",
        "correct": "Réparer l’ouverture d’une tente de camping.",
        "wrong": [
          "Remplacer la sangle d’un sac de voyage.",
          "Raccourcir la fermeture d’une veste de pluie.",
          "Changer le mécanisme d’un store extérieur."
        ],
        "explanation": "La fermeture de l’entrée de la tente est défectueuse, pas la toile.",
        "illustrationIcons": [
          "⛺",
          "🎒",
          "🧥",
          "🪟"
        ]
      }
    ]
  },
  {
    "start": 4,
    "topic": "réglage d’une machine à coudre le cuir",
    "script": "— L’aiguille traverse mal les deux épaisseurs. Je sens que la machine force.\n— Pour ce type de cuir, il vous faut une aiguille plus épaisse et un fil solide. Réduisez aussi la vitesse.\n— Est-ce que je peux découdre et recommencer ?\n— Évitez de faire de nouveaux trous au même endroit. Entraînez-vous d’abord sur cette chute, puis reprenez la couture du sac.",
    "questions": [
      {
        "stem": "Quelle activité est en cours ?",
        "correct": "Assembler un sac en cuir à la machine.",
        "wrong": [
          "Réparer la semelle d’une chaussure.",
          "Broder un motif sur une veste.",
          "Poser une fermeture sur un rideau."
        ],
        "explanation": "L’aiguille et le fil adaptés au cuir servent à assembler le sac.",
        "illustrationIcons": [
          "👜",
          "👞",
          "🧥",
          "🪟"
        ]
      }
    ]
  },
  {
    "start": 5,
    "topic": "nouvelle zone de dépose à l’aéroport",
    "script": "Les voyageurs accompagnés en voiture à l’aéroport sont priés d’utiliser la nouvelle zone de dépose située devant le terminal B. Les passagers du terminal A pourront rejoindre leur bâtiment par la galerie couverte, sans quitter l’aéroport. La zone de dépose est gratuite pour un arrêt de moins de dix minutes. Pour les personnes souhaitant attendre un voyageur à son arrivée, le parking de courte durée reste accessible.",
    "questions": [
      {
        "stem": "À qui s’adresse principalement cette annonce ?",
        "correct": "Aux personnes qui conduisent des voyageurs à l’aéroport.",
        "wrong": [
          "Aux voyageurs qui attendent l’ouverture de leur porte d’embarquement.",
          "Aux conducteurs qui viennent récupérer un voyageur à son arrivée.",
          "Aux passagers qui souhaitent réserver un stationnement de longue durée."
        ],
        "explanation": "La nouvelle zone concerne les conducteurs déposant des voyageurs."
      }
    ]
  },
  {
    "start": 6,
    "topic": "contrôle technique d’un ascenseur de résidence",
    "script": "Les résidents de l’immeuble des Acacias sont informés que l’ascenseur fera l’objet d’un contrôle vendredi entre neuf heures et midi. Pendant cette période, l’escalier reste accessible. Une personne à mobilité réduite qui doit sortir impérativement pendant le contrôle peut contacter le gardien avant jeudi soir afin d’organiser une assistance. Le technicien ne pourra pas interrompre les essais à chaque demande. L’accès normal sera rétabli après le contrôle.",
    "questions": [
      {
        "stem": "Que propose-t-on aux habitants qui ont des difficultés à se déplacer ?",
        "correct": "Organiser une aide avant le contrôle.",
        "wrong": [
          "Demander au technicien d’interrompre les essais à leur arrivée.",
          "Utiliser l’ascenseur par un accès réservé aux résidents.",
          "Reporter automatiquement leur sortie au samedi matin."
        ],
        "explanation": "Le gardien peut organiser une assistance si on le contacte avant jeudi soir."
      }
    ]
  },
  {
    "start": 7,
    "topic": "conditions d’accès à une patinoire éphémère",
    "script": "La patinoire du parc ouvrira exceptionnellement à midi dimanche, afin de permettre une opération de nettoyage de la glace. Les séances prévues en matinée seront reportées à une autre date au choix des personnes inscrites. La location des patins reste comprise dans le prix du billet. Pour les créneaux de l’après-midi, aucune démarche n’est nécessaire. Les casiers seront disponibles dès l’ouverture du site.",
    "questions": [
      {
        "stem": "Qui doit modifier sa réservation ?",
        "correct": "Les personnes inscrites à une séance du matin.",
        "wrong": [
          "Les visiteurs qui souhaitent louer des patins sur place.",
          "Les participants aux séances de l’après-midi.",
          "Les personnes qui ont besoin d’un casier."
        ],
        "explanation": "Seules les séances de la matinée sont reportées."
      }
    ]
  },
  {
    "start": 8,
    "topic": "relevé des compteurs d’eau",
    "script": "La compagnie des eaux procédera au relevé des compteurs de la rue des Peupliers mercredi prochain. Si votre compteur est accessible depuis la rue, votre présence n’est pas nécessaire. Dans le cas contraire, vous pouvez transmettre une photographie de l’index par le portail client avant mardi soir. Pensez à vérifier que le numéro du compteur apparaît clairement sur la photo. Aucun paiement ne sera demandé par les agents.",
    "questions": [
      {
        "stem": "Dans quel cas peut-on envoyer une photographie ?",
        "correct": "Lorsque le compteur n’est pas accessible de l’extérieur.",
        "wrong": [
          "Lorsque l’agent demande un règlement lors de son passage.",
          "Lorsque le relevé précédent a été effectué en ligne.",
          "Lorsque le numéro du compteur n’est plus lisible."
        ],
        "explanation": "La photo remplace la visite si l’accès depuis la rue est impossible."
      }
    ]
  },
  {
    "start": 9,
    "topic": "commande de carrelage pour une rénovation",
    "script": "Bonjour Monsieur Lopes, ici le magasin de matériaux. Les cartons de carrelage que vous attendiez sont arrivés. Nous avons toutefois constaté qu’une partie du lot présentait une nuance légèrement différente. Nous vous proposons de venir comparer les échantillons avant de charger votre commande. Si vous souhaitez une teinte parfaitement uniforme, il faudra attendre la livraison de la semaine prochaine. Les quantités et le prix initial restent inchangés.",
    "questions": [
      {
        "stem": "Pourquoi le magasin contacte-t-il son client ?",
        "correct": "Pour lui faire vérifier l’aspect du carrelage reçu.",
        "wrong": [
          "Pour lui demander de modifier les quantités commandées.",
          "Pour l’informer que tous les cartons arriveront la semaine prochaine.",
          "Pour lui annoncer un changement de prix des échantillons."
        ],
        "explanation": "La différence de nuance nécessite que le client compare les échantillons."
      }
    ]
  },
  {
    "start": 10,
    "topic": "dépôt d’un dossier de bourse étudiante",
    "script": "Bonjour Sofia, c’est le service des bourses. Nous avons bien reçu votre dossier. L’attestation de revenus est lisible, mais le justificatif d’inscription correspond à l’année précédente. Il suffit de nous envoyer le document de l’année en cours avant le quinze décembre. Il n’est pas nécessaire de recommencer la demande sur le site. Votre place dans la file de traitement sera conservée. Vous recevrez ensuite une confirmation par courrier électronique.",
    "questions": [
      {
        "stem": "Que doit faire Sofia ?",
        "correct": "Fournir une attestation d’inscription plus récente.",
        "wrong": [
          "Demander une nouvelle attestation de revenus à son établissement.",
          "Recommencer intégralement sa demande avant le quinze décembre.",
          "Attendre la décision avant de transmettre un justificatif."
        ],
        "explanation": "Seul le justificatif d’inscription doit correspondre à l’année en cours."
      }
    ]
  },
  {
    "start": 11,
    "topic": "récupération d’un appareil loué pour un chantier",
    "script": "Bonjour, c’est l’agence de location. Votre ponceuse devait nous être rapportée demain matin, mais le chauffeur qui passe dans votre secteur a encore de la place dans son véhicule. Nous pouvons donc venir la chercher directement chez vous cet après-midi entre quatorze et seize heures. Il n’y aura aucun frais supplémentaire. Assurez-vous seulement que le bac à poussière est vidé et que les accessoires sont réunis dans la mallette.",
    "questions": [
      {
        "stem": "Quel service supplémentaire est proposé ?",
        "correct": "Reprendre l’appareil à domicile.",
        "wrong": [
          "Prolonger gratuitement la location jusqu’au lendemain soir.",
          "Échanger la ponceuse contre un modèle plus récent.",
          "Fournir une nouvelle mallette d’accessoires au client."
        ],
        "explanation": "Le chauffeur peut passer récupérer l’appareil sans supplément."
      }
    ]
  },
  {
    "start": 12,
    "topic": "inscription à un cours de langue",
    "script": "Bonjour Adam, je vous appelle au sujet des cours du soir. Après votre entretien de placement, l’enseignante pense que le groupe intermédiaire vous conviendrait davantage que le groupe débutant. Les deux cours ont lieu le mercredi, mais le groupe intermédiaire commence trente minutes plus tard. Si vous acceptez ce changement, nous transférerons votre paiement automatiquement. Vous pouvez aussi assister gratuitement à une première séance avant de confirmer votre choix.",
    "questions": [
      {
        "stem": "Quelle possibilité Adam a-t-il avant de décider ?",
        "correct": "Essayer gratuitement le cours intermédiaire.",
        "wrong": [
          "Suivre les deux cours le même soir pendant un mois.",
          "Récupérer son paiement auprès de l’enseignante.",
          "Passer un nouvel entretien avec les élèves débutants."
        ],
        "explanation": "Il peut assister à une première séance sans frais avant de confirmer."
      }
    ]
  },
  {
    "start": 13,
    "topic": "casiers de livraison dans un immeuble",
    "script": "Je comprends que les livreurs aient du mal à trouver quelqu’un chez soi en pleine journée. Des casiers communs seraient utiles, à condition de ne pas les transformer en espaces de stockage permanent. Un colis devrait être retiré dans un délai raisonnable. Sinon, ceux qui attendent une livraison n’auront jamais de place disponible. Le règlement pourrait prévoir un rappel lorsque le colis reste plusieurs jours dans le casier.",
    "questions": [
      {
        "stem": "Quelle condition cette personne associe-t-elle aux casiers ?",
        "correct": "Limiter la durée pendant laquelle les colis y restent.",
        "wrong": [
          "Réserver les casiers aux livraisons effectuées en journée.",
          "Attribuer un casier personnel à chaque appartement.",
          "Faire payer les livreurs qui utilisent les casiers communs."
        ],
        "explanation": "Elle veut assurer la rotation grâce à un délai de retrait raisonnable."
      }
    ]
  },
  {
    "start": 14,
    "topic": "cours de natation en eau libre",
    "script": "J’apprécie les sorties en lac, mais lorsque j’ai commencé, le plus difficile était de me repérer sans les lignes au fond d’une piscine. Les nouveaux inscrits devraient pouvoir faire quelques séances près de la rive avant de traverser une grande distance. Ce n’est pas seulement une question de forme physique : il faut apprendre à observer les repères et à gérer les changements de direction.",
    "questions": [
      {
        "stem": "Quelle adaptation propose cette personne ?",
        "correct": "Préparer les débutants à s’orienter près de la rive.",
        "wrong": [
          "Réserver les sorties en lac aux nageurs les plus rapides.",
          "Organiser les premières séances uniquement en piscine.",
          "Installer des lignes flottantes sur tout le parcours."
        ],
        "explanation": "Elle souhaite un apprentissage progressif des repères en eau libre."
      }
    ]
  },
  {
    "start": 15,
    "topic": "prix des produits vendus en vrac",
    "script": "Je voudrais acheter davantage en vrac, mais les prix sont parfois affichés par cent grammes et parfois au kilo. Au moment de comparer deux produits, je dois faire des calculs. Je ne demande pas que les magasins proposent tous les mêmes tarifs. Une présentation uniforme des prix, en revanche, permettrait de choisir en connaissance de cause, surtout quand on achète plusieurs produits différents au cours de la même visite.",
    "questions": [
      {
        "stem": "Quelle amélioration souhaiterait-elle ?",
        "correct": "Afficher les prix selon une unité de comparaison commune.",
        "wrong": [
          "Appliquer un tarif identique dans les magasins du quartier.",
          "Réduire le prix des produits achetés en petite quantité.",
          "Indiquer sur les étiquettes le prix du panier complet."
        ],
        "explanation": "Elle demande une unité uniforme pour faciliter la comparaison des prix."
      }
    ]
  },
  {
    "start": 16,
    "topic": "horaires d’un espace de travail partagé",
    "script": "Je travaille parfois avec des collègues installés dans d’autres fuseaux horaires. La salle commune ferme tôt, alors je dois rentrer chez moi pour mes dernières réunions. Il ne serait pas nécessaire de garder tout l’espace ouvert jusqu’à minuit. Une ou deux petites salles réservables après dix-neuf heures suffiraient à mon avis. Les personnes qui les utilisent pourraient sortir avec leur badge sans mobiliser le personnel d’accueil.",
    "questions": [
      {
        "stem": "Quel aménagement serait suffisant à ses yeux ?",
        "correct": "Ouvrir quelques salles sur réservation en soirée.",
        "wrong": [
          "Prolonger les heures d’accueil de l’ensemble de l’établissement.",
          "Déplacer les réunions vers des espaces de travail à domicile.",
          "Créer un abonnement spécial pour les travailleurs étrangers."
        ],
        "explanation": "Seules quelques salles réservables le soir répondraient à son besoin."
      }
    ]
  },
  {
    "start": 17,
    "topic": "ateliers de dessin dans un musée",
    "script": "Les enfants aiment reproduire les tableaux, mais je trouve qu’on leur demande parfois de copier trop fidèlement. Lors de ma dernière visite, une animatrice a proposé de choisir un détail puis d’inventer ce qui se trouvait en dehors du cadre. Les enfants ont observé davantage les couleurs et les personnages avant de dessiner. J’aimerais que cette approche soit utilisée plus souvent dans les ateliers proposés aux familles.",
    "questions": [
      {
        "stem": "Quel type d’exercice préfère-t-elle ?",
        "correct": "Partir d’un détail observé pour imaginer une nouvelle scène.",
        "wrong": [
          "Apprendre à reproduire les tableaux avec les mêmes proportions.",
          "Dessiner librement sans avoir à regarder les œuvres exposées.",
          "Comparer les techniques des artistes avant de réaliser une copie."
        ],
        "explanation": "L’activité associe l’observation d’un détail à l’invention de ce qui dépasse le cadre."
      }
    ]
  },
  {
    "start": 18,
    "topic": "installation de composteurs en restauration collective",
    "script": "Dans notre cantine, le composteur est arrivé avant qu’on organise le tri. Résultat : on trouve régulièrement des couverts jetables dans les déchets alimentaires. Je pense qu’il faudrait expliquer le fonctionnement aux personnes qui débarrassent les tables et installer des bacs clairement distincts. Acheter un équipement plus grand ne résoudrait pas le problème si on continue à mélanger des matériaux qui ne se décomposent pas ensemble.",
    "questions": [
      {
        "stem": "Quelle priorité défend cette personne ?",
        "correct": "Améliorer le tri en amont du compostage.",
        "wrong": [
          "Augmenter la capacité du composteur de la cantine.",
          "Remplacer tous les couverts jetables par des couverts compostables.",
          "Réduire la quantité de repas servis chaque jour."
        ],
        "explanation": "Elle insiste sur la séparation des déchets et la formation des personnes."
      }
    ]
  },
  {
    "start": 19,
    "topic": "accueil des nouveaux habitants dans un village",
    "script": "Notre mairie distribue un livret aux nouveaux habitants. C’est utile pour trouver les horaires des services, mais ce n’est pas forcément ce dont on a besoin quand on ne connaît personne. Je proposerais une promenade organisée par des bénévoles, qui présenterait aussi les associations et les lieux de rencontre. Cela donnerait aux gens l’occasion de poser des questions qu’ils n’auraient pas pensé à formuler en lisant une brochure.",
    "questions": [
      {
        "stem": "Que souhaiterait ajouter cette personne au livret ?",
        "correct": "Une rencontre permettant de découvrir la vie locale.",
        "wrong": [
          "Une liste plus détaillée des horaires de chaque service.",
          "Un formulaire pour sélectionner les associations à rejoindre.",
          "Une carte proposant des promenades à effectuer seul."
        ],
        "explanation": "La promenade collective doit faciliter les rencontres et les questions."
      }
    ]
  },
  {
    "start": 20,
    "topic": "éclairage des escaliers d’un bâtiment public",
    "script": "Quand je descends l’escalier de la mairie, l’éclairage est assez fort, mais je distingue mal le bord des marches parce que le sol est partout de la même couleur. Plutôt que d’ajouter des lampes, je pense qu’une bande contrastée sur la première et la dernière marche serait utile. Il faut améliorer la visibilité des changements de niveau, pas simplement augmenter la quantité de lumière dans tout le bâtiment.",
    "questions": [
      {
        "stem": "Quelle solution préconise-t-il ?",
        "correct": "Rendre les changements de niveau plus visibles par contraste.",
        "wrong": [
          "Installer des luminaires supplémentaires le long de l’escalier.",
          "Uniformiser la couleur des marches et des paliers.",
          "Remplacer les escaliers par un autre accès au bâtiment."
        ],
        "explanation": "Il préconise des bandes contrastées plutôt qu’un éclairage plus intense."
      }
    ]
  },
  {
    "start": 21,
    "topic": "reconstitution d’anciens paysages par les pollens",
    "script": "Dans notre chronique scientifique, une palynologue présente les résultats d’une étude sur les pollens conservés au fond d’un étang. Certaines couches contiennent beaucoup de pollen d’arbres, d’autres davantage de plantes herbacées. Ces différences peuvent suggérer une évolution du paysage, mais l’interprétation nécessite de tenir compte des conditions de transport. Le pollen d’une espèce peut voyager bien plus loin que celui d’une autre, et un arbre très productif peut être représenté en quantité disproportionnée. L’équipe compare donc les données du site avec celles de plusieurs étangs voisins et avec les traces d’activités humaines disponibles dans les archives. Le but est de reconstituer les grandes transformations régionales, sans prétendre connaître la végétation exacte de chaque parcelle ancienne.",
    "questions": [
      {
        "stem": "Pourquoi multiplier les sources d’information ?",
        "correct": "Pour nuancer ce que les proportions de pollen indiquent sur le paysage.",
        "wrong": [
          "Pour identifier la date de chaque activité humaine autour de l’étang.",
          "Pour déterminer quelle espèce produit le plus de pollen dans la région.",
          "Pour localiser précisément les arbres présents sur chaque ancienne parcelle."
        ],
        "explanation": "La production et le transport du pollen faussent une lecture directe des proportions."
      }
    ]
  },
  {
    "start": 22,
    "topic": "mesure de la ponctualité dans les réseaux de bus",
    "script": "Une nouvelle façon de mesurer la régularité des bus est testée sur les lignes à haute fréquence. Jusqu’à présent, les véhicules étaient évalués en fonction de leur écart à un horaire théorique. Or, pour un usager qui arrive sans consulter le tableau des départs, le problème principal est parfois de voir deux bus passer ensemble après une longue attente. L’indicateur expérimental mesure plutôt les intervalles entre deux véhicules successifs. Selon le responsable du réseau, il ne s’agit pas de supprimer les horaires sur toutes les lignes : pour les dessertes peu fréquentes, une heure de passage fiable reste essentielle. Les deux méthodes pourront donc coexister selon le type de service rendu aux voyageurs.",
    "questions": [
      {
        "stem": "Quelle approche est privilégiée pour les lignes très fréquentes ?",
        "correct": "Évaluer la régularité de l’espacement entre les bus.",
        "wrong": [
          "Mesurer l’écart de chaque départ par rapport à l’horaire affiché.",
          "Comparer la fréquentation selon le nombre de véhicules en circulation.",
          "Calculer le temps de trajet moyen entre les terminus de la ligne."
        ],
        "explanation": "Sur ces lignes, l’attente entre deux bus est plus pertinente que l’horaire théorique."
      }
    ]
  },
  {
    "start": 23,
    "topic": "restauration de manuscrits endommagés par l’humidité",
    "script": "— Vous dirigez un atelier qui traite des manuscrits ayant souffert d’un dégât des eaux. Les documents sont-ils toujours restaurés dès leur arrivée ?\n— Non, la priorité immédiate est de stabiliser leur état. Quand plusieurs milliers de feuilles sont humides, on ne peut pas les examiner toutes en quelques heures. Nous faisons donc un premier tri selon le risque de dégradation, puis nous choisissons des procédés adaptés à la nature du papier et des encres. Ce qui paraît simple pour une feuille récente peut être risqué pour un manuscrit ancien.\n— Est-ce que le séchage fait disparaître les traces du sinistre ?\n— Pas nécessairement. Certains documents restent déformés, et les encres peuvent avoir migré avant même leur arrivée. Notre rôle n’est pas de rendre tous les manuscrits visuellement neufs. Il faut préserver ce qui permet de lire et d’étudier le document. Une intervention trop poussée pourrait effacer des marques utiles pour comprendre son histoire.\n— Comment décidez-vous du traitement à effectuer ?\n— Nous discutons avec les conservateurs et parfois avec les chercheurs qui connaissent le fonds. Une annotation presque illisible peut avoir plus d’intérêt qu’une page entière en bon état. Le restaurateur ne décide donc pas seulement d’après l’apparence du papier.\n— Les reproductions numériques changent-elles votre travail ?\n— Oui, elles permettent de consulter certains textes sans manipuler constamment les originaux. Mais elles ne remplacent pas toutes les informations portées par le support, comme les traces de fabrication ou les changements d’encre. Nous documentons aussi nos propres interventions, afin que les futurs chercheurs distinguent ce qui appartient au manuscrit de ce qui résulte d’un traitement récent.\n— Est-ce que votre équipe traite les documents dans leur ordre d’arrivée ?\n— Pas systématiquement. Nous réévaluons les priorités lorsque de nouvelles informations apparaissent, sans perdre la trace des décisions prises précédemment.",
    "questions": [
      {
        "stem": "Quel principe guide les premières interventions ?",
        "correct": "Stabiliser les documents selon leur risque de dégradation.",
        "wrong": [
          "Restaurer les documents les plus anciens avant tous les autres.",
          "Traiter en priorité les feuilles dont les annotations sont les plus lisibles.",
          "Rendre rapidement consultables les manuscrits destinés à être numérisés."
        ],
        "explanation": "La stabilisation initiale est organisée selon le risque de dégradation."
      },
      {
        "stem": "Pourquoi ne cherche-t-on pas toujours à rendre le manuscrit comme neuf ?",
        "correct": "Certaines traces témoignent de son histoire.",
        "wrong": [
          "Les techniques de séchage ne peuvent pas agir sur les déformations du papier.",
          "Les reproductions numériques donnent une image plus fidèle du texte que les originaux.",
          "Les conservateurs privilégient les manuscrits déjà en bon état pour leurs recherches."
        ],
        "explanation": "Les marques conservées peuvent être utiles aux recherches historiques."
      }
    ]
  },
  {
    "start": 25,
    "topic": "équilibrage d’un réseau de chaleur urbain",
    "script": "— Votre équipe accompagne des immeubles raccordés à un réseau de chaleur. Vous avez constaté que certains bâtiments consommaient davantage après avoir été isolés. Comment expliquer ce résultat surprenant ?\n— Il faut distinguer la chaleur réellement nécessaire au bâtiment de la manière dont le chauffage est réglé. Lorsqu’un immeuble est rénové, ses pertes diminuent. Mais si les réglages restent ceux d’avant les travaux, les appartements peuvent recevoir trop de chaleur. Les habitants ouvrent alors les fenêtres pour retrouver une température agréable. L’économie attendue est réduite.\n— Faut-il changer toutes les installations ?\n— Dans plusieurs cas, nous avons simplement ajusté les températures de départ et les débits dans les différentes parties du bâtiment. Nous avons aussi vérifié que les logements éloignés de la chaufferie recevaient suffisamment de chaleur. Un bon réglage ne consiste pas à réduire partout la même quantité d’énergie.\n— Comment vérifiez-vous les résultats ?\n— Nous comparons les données sur plusieurs semaines en tenant compte de la température extérieure. Nous recueillons aussi l’avis des habitants, car un indicateur de consommation ne nous renseigne pas à lui seul sur le confort réel. Une baisse importante peut masquer des appartements mal chauffés.\n— Les économies peuvent-elles être garanties à l’avance ?\n— On peut donner une estimation raisonnable, mais les conditions d’occupation varient. Dans certains bâtiments, les habitants ont changé leurs habitudes après les travaux. Il serait imprudent d’attribuer toute la variation de consommation aux seuls réglages.\n— Que conseillez-vous aux gestionnaires ?\n— De prévoir une période de suivi après la rénovation. Trop souvent, le chantier est considéré comme terminé dès que le dernier artisan a quitté les lieux. Pourtant, il faut parfois plusieurs semaines de fonctionnement pour repérer les problèmes d’équilibrage. Les ajustements sont alors plus faciles à justifier auprès des habitants.",
    "questions": [
      {
        "stem": "Quel problème peut limiter les économies après l’isolation ?",
        "correct": "Le maintien de réglages devenus inadaptés.",
        "wrong": [
          "La baisse du débit dans les appartements les plus proches de la chaufferie.",
          "Le remplacement des habitudes de chauffage par une gestion centralisée.",
          "L’impossibilité de mesurer la température extérieure après les travaux."
        ],
        "explanation": "L’installation peut continuer à délivrer trop de chaleur malgré les pertes réduites."
      },
      {
        "stem": "Pourquoi compléter les relevés par l’avis des habitants ?",
        "correct": "La consommation ne reflète pas à elle seule le confort.",
        "wrong": [
          "Les habitants peuvent estimer précisément les pertes de chaleur de leur logement.",
          "Les données recueillies sur plusieurs semaines ignorent les températures extérieures.",
          "Les témoignages permettent de calculer la consommation avant la rénovation."
        ],
        "explanation": "Une baisse de consommation peut cacher des logements insuffisamment chauffés."
      }
    ]
  },
  {
    "start": 27,
    "topic": "transformation des postes de secours sur les plages",
    "script": "— Vous avez analysé la façon dont les communes organisent les secours sur leurs plages. Les statistiques d’intervention suffisent-elles à répartir les équipes ?\n— Elles constituent un point de départ, mais elles peuvent être trompeuses. Une plage très surveillée peut enregistrer beaucoup d’interventions légères parce que les sauveteurs repèrent les problèmes tôt. Ailleurs, des difficultés comparables passent inaperçues, jusqu’à ce qu’une situation plus grave soit signalée. Comparer uniquement les nombres d’interventions peut donc donner une image inversée du risque.\n— Quelles informations ajoutez-vous ?\n— Nous observons les conditions de baignade, les accès au rivage et les variations de fréquentation. Nous nous intéressons aussi à la visibilité dont disposent les sauveteurs depuis leur poste. Une plage de petite taille peut être difficile à surveiller si certaines zones sont cachées par des rochers.\n— Les solutions sont-elles toujours coûteuses ?\n— Pas forcément. Sur un site, le déplacement d’un point de surveillance a amélioré la visibilité sans augmenter le nombre de personnes présentes. Dans une autre commune, il a fallu modifier l’organisation des patrouilles à certains moments de la journée.\n— Comment savez-vous qu’une intervention préventive a évité un accident ?\n— On ne peut pas démontrer ce qui se serait produit dans chaque situation individuelle. C’est pourquoi nous cherchons à mesurer des éléments observables, comme la rapidité de détection des difficultés ou le nombre de personnes réorientées vers une zone plus sûre. Cela nous aide à discuter des pratiques sans promettre une précision que les données ne permettent pas.\n— Que retenez-vous de ces études ?\n— La qualité de la surveillance dépend autant de l’adaptation de l’organisation au site que du nombre d’agents présents. Il faut aussi réexaminer les dispositifs lorsque le paysage ou les usages de la plage changent.",
    "questions": [
      {
        "stem": "Pourquoi les nombres d’interventions peuvent-ils être trompeurs ?",
        "correct": "Une surveillance efficace peut augmenter le nombre de situations détectées.",
        "wrong": [
          "Les interventions légères sont enregistrées uniquement sur les plages peu fréquentées.",
          "Les statistiques regroupent les incidents de baignade et les accidents sur la route.",
          "Les plages les plus surveillées enregistrent généralement moins de visiteurs."
        ],
        "explanation": "La détection précoce peut produire davantage d’interventions recensées."
      },
      {
        "stem": "Quelle limite reconnaît le spécialiste à l’évaluation de la prévention ?",
        "correct": "On ne peut connaître le résultat d’une situation sans intervention.",
        "wrong": [
          "Les mesures de rapidité sont impossibles à comparer entre deux journées.",
          "Les incidents graves ne peuvent être distingués des interventions légères.",
          "Les données recueillies ne permettent pas d’observer la fréquentation réelle."
        ],
        "explanation": "Le scénario contrefactuel de chaque situation individuelle reste inconnu."
      }
    ]
  },
  {
    "start": 29,
    "topic": "expérimentation de vergers en altitude",
    "script": "Dans un programme agricole régional, des producteurs ont installé de petits vergers sur des parcelles situées plus haut que les zones de culture habituelles. Les températures moyennes y sont désormais compatibles avec certaines variétés de fruits. Mais les résultats des trois premières années ne permettent pas de conclure que toutes ces plantations sont adaptées à l’altitude. Sur certaines parcelles, les arbres ont bien poussé, tout en produisant peu de fruits. Les agronomes expliquent que la date de floraison et la présence d’insectes pollinisateurs peuvent évoluer de manière différente avec les conditions météorologiques. Un arbre peut ainsi fleurir pendant une période où les pollinisateurs sont encore peu actifs. Ailleurs, des gelées tardives ont surtout affecté les variétés dont les fleurs s’ouvrent rapidement au printemps. Les producteurs ont commencé à diversifier les variétés et à préserver des zones de végétation spontanée autour des vergers. Les chercheurs souhaitent désormais comparer des parcelles exposées différemment au vent et au soleil. Ils ne recommandent pas pour l’instant un déplacement général des cultures vers les hauteurs : la possibilité de cultiver un arbre ne garantit ni une récolte régulière ni la rentabilité de son exploitation. Les exploitants participants tiennent un carnet des dépenses et des opérations nécessaires, notamment lorsque les parcelles sont difficiles d’accès. Le programme doit permettre d’identifier les conditions dans lesquelles ces nouvelles cultures seraient viables. Les chercheurs souhaitent également disposer de plusieurs années de récoltes avant de comparer les résultats économiques, car une seule saison favorable ne suffit pas à établir la stabilité d’une production. Les nouvelles parcelles sont donc envisagées comme des essais, plutôt que comme un modèle à appliquer immédiatement.",
    "questions": [
      {
        "stem": "Quel constat nuance l’intérêt des vergers d’altitude ?",
        "correct": "Une bonne croissance ne garantit pas une production régulière de fruits.",
        "wrong": [
          "Les variétés choisies ne supportent pas les températures moyennes des hauteurs.",
          "Les parcelles les plus accessibles connaissent davantage de gelées tardives.",
          "La végétation spontanée empêche les insectes de rejoindre les arbres fruitiers."
        ],
        "explanation": "Les arbres peuvent croître correctement tout en fructifiant peu."
      },
      {
        "stem": "Pourquoi les exploitants consignent-ils leurs dépenses ?",
        "correct": "Pour apprécier la viabilité économique des nouvelles cultures.",
        "wrong": [
          "Pour calculer le coût des variétés produites dans les zones traditionnelles.",
          "Pour déterminer la part du budget consacrée à la protection des pollinisateurs.",
          "Pour obtenir une compensation lorsque la production baisse d’une année à l’autre."
        ],
        "explanation": "L’expérimentation porte aussi sur les coûts et la rentabilité des parcelles."
      }
    ]
  },
  {
    "start": 31,
    "topic": "réutilisation des eaux de pluie dans les serres horticoles",
    "script": "Une entreprise horticole récupère l’eau qui s’écoule des toitures de ses serres. Au début du projet, elle avait dimensionné les réservoirs d’après la quantité annuelle de pluie. Les responsables ont ensuite constaté que des périodes de fortes précipitations pouvaient être suivies de longues semaines sèches. Une partie de l’eau débordait au printemps alors que les réserves devenaient insuffisantes en été. L’entreprise a donc revu sa méthode de calcul en examinant la succession des périodes de pluie et de sécheresse. Elle étudie aussi les possibilités d’adapter ses besoins en eau selon les cultures et leur calendrier. L’objectif n’est pas nécessairement de construire des réservoirs capables de stocker toute l’eau disponible, mais d’obtenir un équilibre raisonnable entre capacité de stockage et consommation.",
    "questions": [
      {
        "stem": "Quelle limite de la méthode initiale est apparue ?",
        "correct": "Elle ignorait la répartition des précipitations dans le temps.",
        "wrong": [
          "Elle sous-estimait les pertes d’eau au moment du captage.",
          "Elle supposait que les cultures avaient des besoins identiques.",
          "Elle ne tenait pas compte de la surface des serres équipées."
        ],
        "explanation": "Le cumul annuel ne décrit pas la succession des périodes humides et sèches."
      }
    ]
  },
  {
    "start": 32,
    "topic": "choix de points de collecte de médicaments inutilisés",
    "script": "Une enquête a comparé plusieurs dispositifs de récupération de médicaments non utilisés. Dans un quartier, des collectes ponctuelles avaient attiré beaucoup de participants lors de leur inauguration, mais les quantités rapportées avaient rapidement diminué. Dans un autre, les habitants pouvaient déposer les médicaments à l’occasion de leurs achats habituels en pharmacie. Les quantités collectées chaque semaine étaient moins spectaculaires, mais plus stables. Les auteurs rappellent que les chiffres d’une campagne de lancement ne permettent pas de juger de l’intégration du geste dans les habitudes quotidiennes. Ils recommandent de suivre les dépôts dans la durée et de distinguer les personnes qui vident un stock accumulé depuis des années de celles qui adoptent une pratique régulière. Les deux comportements restent utiles, mais ne correspondent pas au même résultat.",
    "questions": [
      {
        "stem": "Quelle distinction les auteurs jugent-ils importante ?",
        "correct": "Entre la mobilisation ponctuelle et l’installation d’une habitude.",
        "wrong": [
          "Entre les médicaments achetés en pharmacie et ceux prescrits à l’hôpital.",
          "Entre les quartiers fortement peuplés et ceux disposant de moins de pharmacies.",
          "Entre les collectes destinées aux particuliers et celles réservées aux professionnels."
        ],
        "explanation": "Une collecte initiale importante ne témoigne pas forcément d’un comportement durable."
      }
    ]
  },
  {
    "start": 33,
    "topic": "adaptation des partitions pour chorales intergénérationnelles",
    "script": "Dans une chorale réunissant des adolescents et des retraités, le chef de chœur a revu la manière de répartir les voix. Il avait d’abord confié les lignes les plus simples aux personnes arrivées récemment, indépendamment de leurs préférences musicales. Les répétitions ont révélé que certaines d’entre elles pouvaient aborder une ligne complexe si les passages difficiles étaient préparés séparément. À l’inverse, des choristes expérimentés préféraient parfois une partie plus accessible afin de se concentrer sur la justesse de l’ensemble. Le chef propose désormais plusieurs parcours de préparation avant de distribuer les voix. Il veut éviter que l’ancienneté dans le groupe devienne un critère permanent de répartition des rôles. Les choristes pourront changer de ligne lors des projets suivants en fonction de ce qu’ils souhaitent travailler.",
    "questions": [
      {
        "stem": "Quel principe le chef de chœur remet-il en question ?",
        "correct": "L’attribution des rôles selon l’ancienneté des choristes.",
        "wrong": [
          "La préparation séparée de certaines difficultés musicales.",
          "La possibilité de confier une ligne simple à un membre expérimenté.",
          "L’organisation de répétitions réunissant plusieurs générations."
        ],
        "explanation": "Il ne veut plus assimiler la nouveauté à un niveau musical déterminé."
      }
    ]
  },
  {
    "start": 34,
    "topic": "suivi de l’usure des passerelles piétonnes",
    "script": "Des ingénieurs ont placé des capteurs sur plusieurs passerelles pour enregistrer leurs vibrations au fil des saisons. Un changement de fréquence peut parfois signaler une modification de la rigidité d’une structure. Cependant, les données varient aussi avec la température et le nombre de piétons présents. Les premiers résultats ont conduit l’équipe à établir, pour chaque passerelle, un profil de fonctionnement habituel dans différentes conditions. Les alertes seront déclenchées lorsque les nouvelles observations s’écartent de ce profil, plutôt qu’au-delà d’une valeur identique sur tous les ouvrages. Les ingénieurs précisent que le système ne remplace pas les inspections visuelles : il permet de décider quels éléments méritent un examen plus approfondi entre deux visites programmées. L’évaluation finale comparera les alertes aux défauts constatés sur le terrain.",
    "questions": [
      {
        "stem": "Pourquoi établir un profil propre à chaque passerelle ?",
        "correct": "Pour distinguer les variations ordinaires des changements inhabituels.",
        "wrong": [
          "Pour supprimer les inspections visuelles sur les ouvrages les plus récents.",
          "Pour déterminer la fréquence idéale de vibration de tous les ouvrages.",
          "Pour mesurer uniquement les effets de la fréquentation sur les structures."
        ],
        "explanation": "Le profil tient compte des variations normales propres à la structure."
      }
    ]
  },
  {
    "start": 35,
    "topic": "évaluation des logements temporaires pour saisonniers",
    "script": "Une collectivité a ouvert des logements meublés destinés aux travailleurs saisonniers. Le premier bilan faisait état d’un taux d’occupation élevé, ce qui avait été interprété comme un succès. Une enquête auprès des occupants a ensuite montré que certains parcouraient encore de longues distances pour rejoindre leur lieu de travail, tandis que d’autres quittaient leur logement avant la fin de la saison à cause d’horaires de transport incompatibles avec leur emploi. Les responsables envisagent maintenant de prendre en compte la localisation des emplois et les horaires réels des salariés lorsqu’ils attribuent les logements. Ils souhaitent également examiner les motifs de départ anticipé. Pour eux, un logement occupé n’est pas nécessairement un logement qui répond convenablement à la situation professionnelle de son occupant. Le programme restera ouvert aux nouveaux employeurs de la région.",
    "questions": [
      {
        "stem": "Quelle insuffisance du premier bilan a été relevée ?",
        "correct": "Il ne mesurait pas l’adéquation entre logement et emploi.",
        "wrong": [
          "Il ne recensait pas tous les logements occupés au début de la saison.",
          "Il accordait trop d’importance au prix payé par les travailleurs.",
          "Il ignorait les variations du nombre d’emplois entre deux saisons."
        ],
        "explanation": "L’occupation seule ne permet pas d’évaluer les trajets et les contraintes horaires."
      }
    ]
  },
  {
    "start": 36,
    "topic": "conception d’étiquettes pour produits allergènes",
    "script": "Des spécialistes de l’information ont testé plusieurs présentations d’étiquettes alimentaires auprès de consommateurs ayant des allergies. Une version utilisait des caractères très grands pour signaler les allergènes présents, tandis qu’une autre séparait clairement les ingrédients déclarés et les mentions de contamination éventuelle. Les participants lisaient rapidement la première version, mais certains confondaient présence certaine et risque de traces. La seconde présentation demandait un peu plus de temps et réduisait cette confusion. Les chercheurs estiment que la facilité de repérage ne doit pas être évaluée uniquement par la vitesse de lecture. Ils souhaitent poursuivre les essais avec des emballages de formats différents, afin de vérifier si les distinctions restent perceptibles lorsque l’espace disponible est réduit. Les résultats doivent servir à améliorer la compréhension, et pas seulement l’apparence des étiquettes.",
    "questions": [
      {
        "stem": "Quel résultat conduit à revoir l’évaluation des étiquettes ?",
        "correct": "La lecture rapide ne garantit pas une interprétation exacte.",
        "wrong": [
          "Les grands caractères deviennent illisibles sur les emballages réduits.",
          "La présence de traces est plus facile à repérer que celle d’un ingrédient.",
          "Les consommateurs connaissent mal la liste des produits qu’ils doivent éviter."
        ],
        "explanation": "Les lecteurs rapides pouvaient confondre présence avérée et contamination éventuelle."
      }
    ]
  },
  {
    "start": 37,
    "topic": "maintien des commerces pendant les travaux de voirie",
    "script": "Une commune a comparé deux façons d’organiser les travaux dans ses rues commerçantes. Dans la première, une rue était entièrement traitée en peu de temps ; dans la seconde, les chantiers étaient divisés en portions successives pour maintenir certains accès. Les commerçants interrogés n’avaient pas tous la même préférence. Les établissements fréquentés sur rendez-vous pouvaient organiser leur activité autour d’une interruption courte et clairement annoncée. Les boutiques dépendant des passages spontanés craignaient davantage une fermeture complète, même temporaire. La mairie souhaite désormais analyser les modes de fréquentation avant de déterminer le calendrier des chantiers. Elle conserve aussi la possibilité de proposer une signalisation temporaire indiquant les itinéraires d’accès. Il ne s’agit pas de choisir systématiquement la durée de travaux la plus courte, mais de limiter les perturbations économiques réelles.",
    "questions": [
      {
        "stem": "Quel critère la commune souhaite-t-elle intégrer à ses décisions ?",
        "correct": "La manière dont les clients fréquentent les commerces concernés.",
        "wrong": [
          "La durée totale des travaux rapportée à la superficie de la rue.",
          "Le nombre de rendez-vous que chaque établissement peut déplacer.",
          "La facilité d’installation des panneaux de signalisation temporaires."
        ],
        "explanation": "Les préférences varient selon la dépendance aux passages spontanés ou aux rendez-vous."
      }
    ]
  },
  {
    "start": 38,
    "topic": "diffusion d’œuvres dans les collections itinérantes",
    "script": "Un réseau de petites médiathèques fait circuler des œuvres graphiques prêtées par un fonds départemental. Jusqu’ici, les responsables choisissaient les œuvres principalement en fonction de leur popularité lors des précédentes expositions. Ils craignaient cependant de créer un cercle où les mêmes artistes étaient constamment présentés et où les autres restaient inconnus du public. Le réseau a donc décidé de constituer des ensembles associant des œuvres déjà appréciées et des propositions moins familières. Les médiateurs recueilleront les réactions des visiteurs après la présentation, mais les choix futurs ne dépendront pas automatiquement d’un classement de popularité. L’objectif est de permettre des découvertes sans négliger l’intérêt que le public manifeste pour certaines œuvres. Les responsables veulent aussi observer si une œuvre suscite des échanges différents selon le contexte de présentation.",
    "questions": [
      {
        "stem": "Quel risque le nouveau dispositif vise-t-il à réduire ?",
        "correct": "La répétition des choix fondés sur une popularité déjà acquise.",
        "wrong": [
          "La diminution de la fréquentation liée au déplacement des œuvres entre bibliothèques.",
          "La concurrence entre les médiateurs pour obtenir les artistes les plus connus.",
          "La difficulté de comparer les réactions des visiteurs dans différents établissements."
        ],
        "explanation": "Un classement de popularité peut favoriser durablement les mêmes artistes."
      }
    ]
  },
  {
    "start": 39,
    "topic": "évaluation d’un programme de prêt de vélos aux salariés",
    "script": "Une entreprise a proposé des vélos à ses salariés pendant trois mois pour encourager les déplacements domicile-travail. Les premiers résultats montrent que plusieurs participants ont utilisé leur vélo chaque jour pendant les deux premières semaines. L’utilisation a ensuite diminué, notamment chez ceux qui devaient déposer leurs enfants avant de rejoindre le bureau. Les responsables avaient initialement prévu de mesurer le succès à partir du nombre total de prêts accordés. Ils souhaitent maintenant distinguer la découverte du vélo, son utilisation occasionnelle et l’adoption durable d’un nouvel itinéraire. Certains employés ont d’ailleurs conservé l’habitude de pédaler uniquement pour une partie de leur trajet. Le programme sera adapté en tenant compte des contraintes de transport plutôt que de considérer chaque trajet motorisé comme un échec. Des entretiens permettront de comprendre les changements réalisables selon les situations.",
    "questions": [
      {
        "stem": "Quelle évolution est envisagée dans l’évaluation du programme ?",
        "correct": "Distinguer plusieurs degrés de changement des habitudes de déplacement.",
        "wrong": [
          "Mesurer le nombre de salariés qui ont acheté un vélo à la fin du prêt.",
          "Écarter les participants qui combinent le vélo avec un moyen motorisé.",
          "Comparer le nombre de prêts avec le temps moyen passé au bureau."
        ],
        "explanation": "La découverte, l’usage ponctuel et l’adoption durable sont des résultats différents."
      }
    ]
  },
  {
    "start": 40,
    "topic": "comparaison des méthodes d’accueil des visiteurs d’un monument",
    "script": "Dans un monument historique, deux dispositifs d’accueil ont été expérimentés. Le premier proposait une présentation complète avant la visite ; le second donnait quelques repères au début, puis invitait les visiteurs à demander des explications au fil du parcours. Les questionnaires de fin de visite montraient que les informations factuelles étaient mieux retenues après la présentation initiale. En revanche, les visiteurs du second groupe formulaient davantage de questions sur les éléments qu’ils avaient remarqués eux-mêmes. Les responsables ne cherchent pas à établir une méthode gagnante pour toutes les visites. Ils souhaitent choisir l’approche selon qu’ils privilégient la transmission de connaissances précises ou l’engagement dans l’observation. Ils étudient aussi un dispositif combiné qui préserverait le temps disponible pour découvrir les lieux. Le choix dépendra du public et des objectifs de la visite.",
    "questions": [
      {
        "stem": "Quelle conclusion tirent les responsables ?",
        "correct": "Le choix du dispositif dépend de l’objectif pédagogique.",
        "wrong": [
          "La présentation complète convient surtout aux visiteurs connaissant déjà le monument.",
          "L’accueil progressif devrait précéder systématiquement une présentation détaillée.",
          "La mémorisation des faits est le meilleur indicateur de qualité d’une visite."
        ],
        "explanation": "Les deux dispositifs favorisent des résultats pédagogiques différents."
      }
    ]
  }
];

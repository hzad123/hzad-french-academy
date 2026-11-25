/* Original authored TEF paper; revised substantive recordings, pending measured and editorial QA. */
export const clips = [
  {
    "start": 1,
    "topic": "préparation d’un appareil de mesure de tension électrique",
    "script": "— L’écran affiche zéro, même lorsque je touche les deux bornes.\n— Vérifie le réglage du sélecteur. Tu dois choisir la mesure de tension, pas celle de résistance.\n— Le câble rouge se branche à cet endroit ?\n— Oui, et le noir sur la borne commune. Nous allons d’abord mesurer la pile de démonstration avant d’utiliser l’appareil sur un autre montage.",
    "questions": [
      {
        "stem": "Quel appareil apprend-on à utiliser ?",
        "correct": "Un multimètre électrique.",
        "wrong": [
          "Un thermomètre numérique.",
          "Une balance électronique.",
          "Un compteur de vitesse."
        ],
        "explanation": "Les bornes, le sélecteur et la mesure de tension caractérisent un multimètre.",
        "illustrationIcons": [
          "⚡",
          "🌡️",
          "⚖️",
          "🚗"
        ]
      }
    ]
  },
  {
    "start": 2,
    "topic": "installation d’un support pour plantes grimpantes",
    "script": "— Les tiges commencent à tomber sur le côté du pot.\n— Fixe ce treillis à l’arrière, puis attache les tiges sans trop serrer les liens.\n— Est-ce que je dois couper celles qui dépassent ?\n— Pas encore. Oriente-les vers les espaces libres du support. Dans quelques semaines, elles pourront couvrir une plus grande partie du treillis.",
    "questions": [
      {
        "stem": "Quelle activité est en cours ?",
        "correct": "Installer un support pour une plante grimpante.",
        "wrong": [
          "Préparer un bouquet de fleurs coupées.",
          "Construire une clôture autour d’un potager.",
          "Remplacer la terre d’une plante d’intérieur."
        ],
        "explanation": "Les tiges sont attachées à un treillis pour poursuivre leur croissance.",
        "illustrationIcons": [
          "🌿",
          "💐",
          "🪴",
          "🧱"
        ]
      }
    ]
  },
  {
    "start": 3,
    "topic": "fabrication d’une ceinture en tissu",
    "script": "— J’ai cousu les deux bandes, mais la boucle ne passe pas dans l’ouverture.\n— Replie légèrement le bord et vérifie la largeur avant de refaire la couture.\n— Je dois placer les trous après avoir essayé la ceinture ?\n— Oui, marque d’abord la position qui te convient. Ensuite, nous renforcerons le tissu autour des ouvertures pour qu’il ne s’effiloche pas.",
    "questions": [
      {
        "stem": "Quel objet fabrique-t-on ?",
        "correct": "Une ceinture en tissu.",
        "wrong": [
          "Une sangle de sac à dos.",
          "Un bandeau pour les cheveux.",
          "Une housse de coussin."
        ],
        "explanation": "La boucle et les ouvertures réglées à la taille servent à réaliser une ceinture.",
        "illustrationIcons": [
          "👖",
          "🎒",
          "🎀",
          "🛋️"
        ]
      }
    ]
  },
  {
    "start": 4,
    "topic": "réglage d’un rouleau de peinture décorative",
    "script": "— Le motif n’apparaît pas de façon régulière quand je passe sur la plaque.\n— Tu mets probablement trop de peinture sur le rouleau. Fais un premier passage sur le carton d’essai.\n— Je dois appuyer plus fort pour obtenir les détails ?\n— Non, garde une pression constante et suis le repère tracé au début. Nous commencerons le mur seulement quand le motif sera net.",
    "questions": [
      {
        "stem": "Quelle activité prépare-t-on ?",
        "correct": "Appliquer un motif décoratif sur un mur.",
        "wrong": [
          "Imprimer une photographie sur du papier.",
          "Nettoyer une surface avec une brosse.",
          "Découper des motifs dans du carton."
        ],
        "explanation": "Le rouleau est testé avant de peindre un motif sur le mur.",
        "illustrationIcons": [
          "🎨",
          "📷",
          "🧽",
          "✂️"
        ]
      }
    ]
  },
  {
    "start": 5,
    "topic": "réservation de places pour un spectacle de marionnettes",
    "script": "Les familles inscrites au spectacle de marionnettes de samedi matin sont informées que la représentation aura lieu dans la petite salle du centre culturel. En raison de sa disposition, les poussettes devront être déposées dans un espace surveillé près de l’entrée. Les places numérotées initialement réservées seront remplacées par un placement libre. Les portes ouvriront vingt minutes avant le début du spectacle, et les billets déjà obtenus restent valables.",
    "questions": [
      {
        "stem": "Quelle règle change pour les places des spectateurs ?",
        "correct": "Elles seront choisies librement à l’arrivée.",
        "wrong": [
          "Elles seront attribuées selon l’âge des enfants.",
          "Elles devront être réservées une deuxième fois.",
          "Elles seront distribuées près du dépôt des poussettes."
        ],
        "explanation": "Le placement numéroté est remplacé par un placement libre."
      }
    ]
  },
  {
    "start": 6,
    "topic": "modification des conditions de retrait de matériel de vote",
    "script": "Les responsables des bureaux de vote sont priés de récupérer les documents nécessaires au scrutin vendredi entre quatorze et dix-huit heures. Le point de distribution se trouve désormais dans le bâtiment administratif annexe. Les personnes qui ne peuvent se présenter pendant ce créneau doivent contacter le secrétariat avant jeudi midi. Les urnes seront livrées directement dans chaque bureau ; il n’est pas nécessaire de les transporter avec les documents.",
    "questions": [
      {
        "stem": "Quel matériel sera livré directement dans les bureaux ?",
        "correct": "Les urnes utilisées pour le scrutin.",
        "wrong": [
          "Les documents retirés par les responsables.",
          "Les panneaux indiquant le nouveau bâtiment.",
          "Les listes envoyées par le secrétariat."
        ],
        "explanation": "Les urnes ne doivent pas être récupérées au point de distribution."
      }
    ]
  },
  {
    "start": 7,
    "topic": "organisation d’une visite de château pendant des travaux",
    "script": "Les visiteurs du château de Montfaucon sont informés que l’escalier de la tour ouest sera inaccessible jusqu’à la fin du mois. Les visites guidées suivent temporairement un parcours différent qui comprend la galerie du premier étage et les jardins intérieurs. Le tarif reste inchangé. Les personnes ayant acheté un billet spécifique pour la montée dans la tour pourront obtenir le remboursement de cette option à l’accueil, sans annuler leur visite principale.",
    "questions": [
      {
        "stem": "Quelle prestation peut être remboursée séparément ?",
        "correct": "La montée dans la tour ouest.",
        "wrong": [
          "La visite guidée de la galerie.",
          "L’accès aux jardins intérieurs.",
          "Le billet principal du château."
        ],
        "explanation": "Le remboursement concerne l’option devenue inaccessible."
      }
    ]
  },
  {
    "start": 8,
    "topic": "règles de participation à un atelier d’écriture",
    "script": "L’atelier d’écriture de dimanche se déroulera dans la salle des Associations. Les participants doivent apporter un court texte qu’ils souhaitent retravailler. Il peut s’agir d’un récit, d’une lettre ou d’un article, mais il ne doit pas dépasser deux pages. Le matériel d’écriture sera fourni. Les textes ne seront pas publiés à l’issue de l’atelier sans l’accord de leurs auteurs. Une deuxième séance facultative sera proposée le mois prochain.",
    "questions": [
      {
        "stem": "Que doivent apporter les participants ?",
        "correct": "Un texte personnel de deux pages au maximum.",
        "wrong": [
          "Un ordinateur contenant plusieurs articles publiés.",
          "Une autorisation de publication déjà signée.",
          "Le matériel nécessaire pour organiser la deuxième séance."
        ],
        "explanation": "Chaque participant apporte un court texte à retravailler."
      }
    ]
  },
  {
    "start": 9,
    "topic": "confirmation de réservation d’un véhicule utilitaire",
    "script": "Bonjour Monsieur Renaud, ici l’agence de location. Le véhicule utilitaire que vous avez réservé pour vendredi est disponible. Nous avons cependant remarqué que votre réservation prévoit un retour le dimanche soir, alors que notre agence ferme exceptionnellement à quinze heures. Vous pourrez déposer le véhicule après la fermeture en utilisant la boîte sécurisée pour les clés. Nous vous expliquerons la procédure lors du retrait, et aucun supplément ne sera appliqué.",
    "questions": [
      {
        "stem": "Quelle information l’agence souhaite-t-elle communiquer ?",
        "correct": "La procédure de retour après la fermeture.",
        "wrong": [
          "Le changement du tarif de location du week-end.",
          "La nécessité de rendre le véhicule vendredi soir.",
          "Le remplacement du véhicule par un modèle plus grand."
        ],
        "explanation": "La boîte à clés permet un retour en dehors des horaires d’ouverture."
      }
    ]
  },
  {
    "start": 10,
    "topic": "demande de modification d’une commande de rideaux",
    "script": "Bonjour Madame Faure, c’est l’atelier de confection. Nous avons bien reçu votre choix de tissu pour les rideaux. Avant la découpe, nous devons confirmer si vous souhaitez que le bas touche le sol ou reste légèrement au-dessus. Les dimensions que vous nous avez envoyées permettent les deux finitions. Une fois le tissu coupé, il sera plus difficile de modifier la longueur. Merci de nous répondre avant mercredi matin.",
    "questions": [
      {
        "stem": "Quel choix doit confirmer la cliente ?",
        "correct": "La longueur finale des rideaux par rapport au sol.",
        "wrong": [
          "La couleur du tissu déjà sélectionné.",
          "Le nombre de fenêtres à équiper.",
          "La position des supports muraux."
        ],
        "explanation": "L’atelier attend la décision sur la finition avant la découpe."
      }
    ]
  },
  {
    "start": 11,
    "topic": "inscription à un atelier de découverte de la radio",
    "script": "Bonjour Thomas, c’est la radio associative. Votre inscription à l’atelier de samedi est confirmée. Nous vous avions demandé de préparer une question pour l’entretien avec notre invité. Celui-ci a changé, mais vous pourrez travailler sur votre question initiale et l’adapter pendant la première partie de l’atelier. Il n’est donc pas nécessaire de préparer un nouvel entretien complet avant samedi. Nous vous présenterons le nouvel invité au début de la séance.",
    "questions": [
      {
        "stem": "Que doit faire Thomas avant l’atelier ?",
        "correct": "Conserver sa question et prévoir de l’adapter sur place.",
        "wrong": [
          "Préparer un entretien complet avec le nouvel invité.",
          "Choisir un autre atelier consacré à la radio.",
          "Envoyer une liste de questions au nouvel intervenant."
        ],
        "explanation": "La question initiale pourra être adaptée lors de la séance."
      }
    ]
  },
  {
    "start": 12,
    "topic": "validation d’un devis pour une réparation de toiture",
    "script": "Bonjour, c’est l’entreprise qui a examiné votre toiture. Le devis que nous vous avons transmis comprend le remplacement des tuiles endommagées. Nous pouvons également nettoyer la gouttière pendant l’intervention, mais cette opération n’est pas incluse dans le montant indiqué. Si vous souhaitez l’ajouter, nous vous enverrons un devis actualisé avant de commencer les travaux. Le créneau que nous vous avons proposé reste disponible jusqu’à vendredi.",
    "questions": [
      {
        "stem": "Quelle prestation est facultative et supplémentaire ?",
        "correct": "Le nettoyage de la gouttière.",
        "wrong": [
          "Le remplacement des tuiles abîmées.",
          "L’examen préalable de la toiture.",
          "La réservation du créneau d’intervention."
        ],
        "explanation": "Le nettoyage n’est pas inclus dans le devis initial."
      }
    ]
  },
  {
    "start": 13,
    "topic": "organisation des rendez-vous chez les artisans qui travaillent à domicile",
    "script": "Quand un artisan vient chez moi, on me donne souvent une plage horaire de plusieurs heures. Je comprends que la durée des interventions précédentes puisse varier. Ce qui m’aiderait serait de recevoir un message lorsque l’artisan termine son rendez-vous précédent et prévoit de partir vers mon domicile. Je pourrais ainsi organiser mes activités sans demander à l’entreprise de garantir une heure précise dès le début de la journée.",
    "questions": [
      {
        "stem": "Quel service cette personne souhaiterait-elle ?",
        "correct": "Être informée lorsque l’artisan s’apprête à venir.",
        "wrong": [
          "Obtenir un horaire fixe plusieurs jours avant l’intervention.",
          "Choisir l’ordre des rendez-vous de l’artisan.",
          "Réserver systématiquement le premier créneau de la journée."
        ],
        "explanation": "Elle demande une information actualisée plutôt qu’une heure garantie."
      }
    ]
  },
  {
    "start": 14,
    "topic": "présentation des consignes dans les espaces de baignade",
    "script": "À la plage, on voit parfois de grands panneaux comportant beaucoup de règles. Je pense que les informations les plus urgentes devraient être facilement visibles depuis les accès. Les explications plus détaillées pourraient rester disponibles près du poste de surveillance. Il ne s’agit pas de supprimer les règles, mais de permettre aux personnes qui arrivent de comprendre rapidement quelles zones sont ouvertes et quelles précautions particulières s’appliquent ce jour-là.",
    "questions": [
      {
        "stem": "Quelle organisation de l’information propose-t-il ?",
        "correct": "Mettre en évidence les consignes immédiatement utiles à l’arrivée.",
        "wrong": [
          "Afficher toutes les règles uniquement au poste de surveillance.",
          "Remplacer les panneaux par des annonces sonores régulières.",
          "Présenter les mêmes consignes quelle que soit la situation du jour."
        ],
        "explanation": "Il distingue les informations urgentes et les explications détaillées."
      }
    ]
  },
  {
    "start": 15,
    "topic": "choix des fournitures dans les cours de peinture",
    "script": "Je suis inscrite à un cours de peinture pour adultes. Au début, on nous demande d’acheter beaucoup de matériel, alors que nous ne savons pas encore quelles techniques nous préférerons. Je proposerais un ensemble de base pour les premières séances, avec du matériel supplémentaire à essayer sur place. Ensuite, chacun pourrait compléter ses achats selon ses besoins. Cela éviterait d’acheter des fournitures qui ne seront utilisées qu’une seule fois.",
    "questions": [
      {
        "stem": "Quelle organisation souhaiterait-elle ?",
        "correct": "Commencer avec un matériel de base et essayer le reste avant achat.",
        "wrong": [
          "Acheter l’ensemble des fournitures recommandées avant le premier cours.",
          "Choisir une technique définitive dès l’inscription.",
          "Réserver le matériel de l’atelier aux élèves expérimentés."
        ],
        "explanation": "Elle veut acheter progressivement après avoir essayé différentes techniques."
      }
    ]
  },
  {
    "start": 16,
    "topic": "utilisation des espaces de stockage dans les logements collectifs",
    "script": "Dans notre immeuble, un local sert à entreposer des objets volumineux que les habitants utilisent rarement. Je trouve ce service pratique, mais il est parfois difficile de savoir à qui appartient un objet et depuis combien de temps il est là. Je proposerais une étiquette simple avec un nom ou un numéro d’appartement et une date. On pourrait ensuite contacter les propriétaires lorsqu’un objet occupe beaucoup de place sans être utilisé.",
    "questions": [
      {
        "stem": "Quelle mesure propose-t-elle ?",
        "correct": "Identifier les objets stockés et la date de leur dépôt.",
        "wrong": [
          "Fixer une durée identique de stockage pour tous les objets.",
          "Réserver le local aux habitants des petits appartements.",
          "Remplacer le local par des espaces de rangement individuels."
        ],
        "explanation": "L’étiquetage permettrait de retrouver les propriétaires et de gérer les objets."
      }
    ]
  },
  {
    "start": 17,
    "topic": "organisation des essais de chaussures de randonnée",
    "script": "Quand je choisis des chaussures de randonnée, je peux généralement marcher quelques mètres dans le magasin. Pourtant, ce n’est pas la même chose que monter ou descendre sur un terrain irrégulier. J’apprécierais un petit parcours d’essai avec différentes inclinaisons, qui permette de sentir si le pied glisse ou si la chaussure serre au niveau des orteils. Cela serait particulièrement utile pour les personnes qui achètent leur première paire.",
    "questions": [
      {
        "stem": "Quel aménagement serait utile selon cette personne ?",
        "correct": "Un parcours simulant plusieurs conditions de marche.",
        "wrong": [
          "Un espace permettant de comparer le poids des chaussures.",
          "Une réduction réservée aux acheteurs débutants.",
          "Une présentation détaillée des itinéraires de randonnée locaux."
        ],
        "explanation": "Elle veut tester les chaussures en pente et sur un terrain irrégulier."
      }
    ]
  },
  {
    "start": 18,
    "topic": "organisation de la circulation des informations dans un club sportif",
    "script": "Dans notre club, les changements d’horaire sont annoncés sur plusieurs groupes de discussion. Certaines personnes consultent un groupe mais pas les autres et découvrent les modifications trop tard. Je pense qu’il faudrait conserver un calendrier de référence où chaque changement serait indiqué. Les messages resteraient utiles pour prévenir les adhérents, mais ils devraient renvoyer vers une information commune que tout le monde puisse vérifier.",
    "questions": [
      {
        "stem": "Quelle solution propose cette personne ?",
        "correct": "Centraliser les horaires dans un calendrier de référence.",
        "wrong": [
          "Créer un groupe de discussion différent pour chaque changement.",
          "Remplacer les horaires variables par un programme fixe.",
          "Envoyer les changements uniquement aux responsables des équipes."
        ],
        "explanation": "Elle souhaite une source commune complétée par des notifications."
      }
    ]
  },
  {
    "start": 19,
    "topic": "accueil de personnes découvrant des activités de bénévolat",
    "script": "Je me suis renseignée sur plusieurs missions de bénévolat. Les annonces indiquent souvent les tâches à réaliser, mais pas toujours le niveau d’engagement attendu. J’aimerais savoir si l’on peut participer une fois de temps en temps ou si une présence régulière est nécessaire. Cela permettrait de proposer une aide adaptée à ses disponibilités sans s’engager dans une mission dont on ne pourra pas respecter les conditions.",
    "questions": [
      {
        "stem": "Quelle information manque parfois dans les annonces ?",
        "correct": "La fréquence de participation attendue.",
        "wrong": [
          "Le lieu où se déroulent les missions.",
          "Les compétences techniques demandées.",
          "Le nombre total de bénévoles inscrits."
        ],
        "explanation": "Elle veut connaître la régularité de l’engagement avant de s’inscrire."
      }
    ]
  },
  {
    "start": 20,
    "topic": "organisation des prêts de livres dans les salles d’attente",
    "script": "Dans le cabinet où je travaille, nous avons installé quelques livres dans la salle d’attente. Les patients apprécient de pouvoir lire, mais certains aimeraient emporter un ouvrage commencé pour le rendre à leur prochaine visite. Je proposerais un petit système de prêt très simple, avec une liste où chacun indique le titre et la date. Il ne faudrait pas transformer la salle d’attente en bibliothèque complète, mais permettre aux personnes de terminer leur lecture.",
    "questions": [
      {
        "stem": "Quelle possibilité cette personne souhaite-t-elle ajouter ?",
        "correct": "Emprunter temporairement un livre commencé en salle d’attente.",
        "wrong": [
          "Réserver les livres aux patients qui viennent régulièrement.",
          "Remplacer les livres par des magazines plus courts.",
          "Organiser une consultation dédiée aux prêts de livres."
        ],
        "explanation": "Elle propose un prêt simple pour poursuivre la lecture chez soi."
      }
    ]
  },
  {
    "start": 21,
    "topic": "étude de la conservation des couleurs dans les textiles exposés",
    "script": "Des chercheurs ont comparé la stabilité de différentes teintures utilisées dans des textiles anciens. Les premiers essais mesuraient les modifications de couleur après une exposition à une lumière d’intensité constante. Ils ont ensuite examiné l’influence de périodes d’éclairage séparées par des temps de repos. Certaines teintures réagissaient surtout à la quantité totale de lumière reçue, tandis que d’autres semblaient sensibles à des conditions particulières d’exposition. Les responsables souhaitent rapprocher ces résultats des conditions réelles de présentation des textiles dans les musées. Ils ne cherchent pas à définir une durée unique d’exposition pour toutes les pièces, mais à proposer des recommandations tenant compte des matériaux et de leur état de conservation.",
    "questions": [
      {
        "stem": "Pourquoi les chercheurs comparent-ils plusieurs conditions d’exposition ?",
        "correct": "Les teintures ne réagissent pas toutes de la même manière à la lumière.",
        "wrong": [
          "Les textiles anciens ont toujours été exposés à une intensité constante.",
          "La durée de repos permet de restituer les couleurs initiales de toutes les pièces.",
          "Les musées souhaitent comparer les textiles selon leur valeur commerciale."
        ],
        "explanation": "Les effets peuvent dépendre de la quantité de lumière et de ses modalités d’exposition."
      }
    ]
  },
  {
    "start": 22,
    "topic": "étude des pratiques de chargement des véhicules électriques professionnels",
    "script": "Une entreprise de services a équipé plusieurs équipes de véhicules électriques. Les responsables pensaient que les véhicules pourraient être rechargés principalement pendant la nuit. Les premières semaines ont montré que certains véhicules restaient inutilisés pendant de longues périodes en journée, alors que d’autres étaient sollicités pour des déplacements successifs. L’entreprise a donc étudié les possibilités de recharge pendant les moments où chaque véhicule est disponible. Elle souhaite éviter d’installer une borne dédiée pour chaque véhicule si plusieurs équipes peuvent partager les équipements à des horaires différents. Les responsables tiennent toutefois compte des interventions imprévues, qui exigent que certains véhicules restent suffisamment chargés même lorsqu’ils ne sont pas utilisés au moment prévu.",
    "questions": [
      {
        "stem": "Quel principe guide la réflexion sur les bornes ?",
        "correct": "Adapter la recharge aux périodes de disponibilité et aux besoins des véhicules.",
        "wrong": [
          "Recharger tous les véhicules pendant la nuit pour simplifier l’organisation.",
          "Installer des bornes uniquement pour les véhicules les plus souvent utilisés.",
          "Réserver la recharge en journée aux interventions imprévues."
        ],
        "explanation": "Les usages différents permettent un partage, avec des réserves pour les imprévus."
      }
    ]
  },
  {
    "start": 23,
    "topic": "méthodes de conservation des semences dans les banques végétales",
    "script": "— Vous travaillez dans une banque de semences qui conserve des graines de différentes plantes. Pourquoi ne suffit-il pas de stocker un grand nombre de graines ?\n— Il faut aussi savoir si elles restent capables de germer au fil du temps. Les conditions de conservation peuvent ralentir leur dégradation, mais les espèces ne réagissent pas toutes de la même façon. Nous effectuons donc des tests sur des échantillons à intervalles réguliers.\n— Que faites-vous lorsqu’un lot présente une baisse de germination ?\n— Nous examinons d’abord si les conditions du test conviennent à l’espèce. Certaines graines nécessitent des conditions particulières avant de germer. Si la baisse est confirmée, il peut être nécessaire de renouveler le lot en cultivant une partie des graines conservées.\n— Le renouvellement ne risque-t-il pas de modifier les caractéristiques du lot ?\n— C’est effectivement une question importante. Nous cherchons à conserver la diversité présente dans le lot initial. Les conditions de culture et le nombre de plantes utilisées doivent être adaptés, afin d’éviter de favoriser involontairement certains individus.\n— Les semences conservées sont-elles toutes destinées à être distribuées ?\n— Non, certaines sont accessibles pour des recherches ou des programmes de culture, tandis que d’autres font l’objet de restrictions particulières. Nous conservons des informations sur leur origine et les conditions dans lesquelles elles ont été recueillies.\n— Comment évaluez-vous le travail de la banque ?\n— Le nombre de lots conservés est un indicateur utile, mais il faut aussi suivre leur état, la qualité des informations associées et les possibilités de renouvellement. Une collection importante perdrait une partie de son intérêt si les graines n’étaient plus utilisables ou si leur provenance devenait impossible à établir.\n— Les résultats des tests sont-ils conservés avec les semences ?\n— Oui, nous documentons les conditions et les dates de chaque essai. Ces renseignements permettent de comparer les observations successives sans attribuer à une dégradation ce qui pourrait provenir d'une modification de la méthode.",
    "questions": [
      {
        "stem": "Pourquoi vérifier les conditions du test avant de renouveler un lot ?",
        "correct": "Une faible germination peut résulter d’un test inadapté à l’espèce.",
        "wrong": [
          "Les graines anciennes doivent toujours être cultivées avant d’être testées.",
          "Les conditions de conservation sont identiques pour toutes les espèces.",
          "Le renouvellement d’un lot supprime la nécessité de connaître sa provenance."
        ],
        "explanation": "Certaines espèces exigent des conditions particulières pour germer."
      },
      {
        "stem": "Quel risque doit être limité lors du renouvellement ?",
        "correct": "Une modification involontaire de la diversité du lot.",
        "wrong": [
          "Une augmentation excessive du nombre d’échantillons disponibles.",
          "Une perte de toutes les informations sur les tests précédents.",
          "Une réduction de la durée des opérations de culture."
        ],
        "explanation": "La culture peut favoriser certains individus et modifier la diversité initiale."
      }
    ]
  },
  {
    "start": 25,
    "topic": "conception de formations pour les équipes qui accueillent des visiteurs étrangers",
    "script": "— Vous accompagnez des entreprises dont les équipes reçoivent des visiteurs de plusieurs pays. La formation porte-t-elle principalement sur les différences culturelles ?\n— Nous abordons certaines pratiques, mais nous évitons de présenter chaque nationalité comme un ensemble de comportements prévisibles. Deux personnes venant du même pays peuvent avoir des attentes très différentes. Nous travaillons surtout sur les situations où les interlocuteurs ne partagent pas les mêmes repères.\n— Pouvez-vous donner un exemple ?\n— Lorsqu’une personne ne comprend pas une consigne, l’employé peut penser qu’elle ne maîtrise pas suffisamment la langue. Pourtant, le problème vient parfois d’une expression propre à l’entreprise ou d’une étape que l’on considère comme évidente. Nous entraînons les équipes à reformuler et à vérifier ce qui a été compris.\n— Les formations comprennent-elles des listes d’expressions utiles ?\n— Oui, mais nous les accompagnons de mises en situation. Une expression apprise peut être correcte sans convenir au moment où elle est utilisée. Les participants apprennent notamment à demander une précision sans donner l’impression de mettre en cause la compétence de leur interlocuteur.\n— Comment évaluez-vous les résultats ?\n— Nous observons si les équipes identifient plus rapidement les malentendus et trouvent des manières de poursuivre l’échange. Nous ne cherchons pas uniquement à mesurer le nombre de mots appris ou la connaissance de faits sur différents pays.\n— Que conseillez-vous aux responsables ?\n— De considérer les difficultés récurrentes comme des informations sur leur organisation. Si plusieurs visiteurs ne comprennent pas la même procédure, il peut être préférable de revoir sa présentation plutôt que demander à chaque employé de résoudre individuellement le même problème.\n— Les responsables assistent-ils à certaines séances ?\n— Nous les invitons à observer les situations dans lesquelles une consigne interne pose problème. Cela peut conduire à revoir les supports d'accueil et à clarifier la répartition des responsabilités entre les services.",
    "questions": [
      {
        "stem": "Quelle réserve la formatrice exprime-t-elle sur les différences culturelles ?",
        "correct": "L’origine nationale ne permet pas de prévoir toutes les attentes individuelles.",
        "wrong": [
          "Les pratiques culturelles n’ont aucun effet sur les échanges professionnels.",
          "Les visiteurs étrangers doivent apprendre les procédures internes avant leur arrivée.",
          "Les entreprises doivent utiliser des formulations différentes pour chaque nationalité."
        ],
        "explanation": "Des personnes du même pays peuvent avoir des attentes différentes."
      },
      {
        "stem": "Que peut révéler la répétition d’un même malentendu ?",
        "correct": "Une procédure dont la présentation mérite d’être revue.",
        "wrong": [
          "Une insuffisance de vocabulaire chez tous les employés.",
          "La nécessité d’adapter les règles à chaque visiteur.",
          "Un manque de connaissances culturelles chez les responsables."
        ],
        "explanation": "Des incompréhensions récurrentes peuvent signaler un problème de présentation."
      }
    ]
  },
  {
    "start": 27,
    "topic": "étude des conditions de conservation d’objets en bois dans les lieux historiques",
    "script": "— Vous conseillez des responsables de bâtiments historiques qui conservent des objets en bois. Faut-il maintenir partout une température et une humidité constantes ?\n— Il faut surtout éviter des conditions susceptibles d’endommager les objets. Le bois réagit aux changements d’humidité, mais les risques dépendent de sa composition, de son état et des assemblages utilisés. Un objet qui a longtemps été conservé dans un environnement relativement stable peut réagir différemment d’un objet exposé à des variations régulières.\n— Comment choisissez-vous les mesures à prendre ?\n— Nous commençons par observer les conditions dans lesquelles les objets se trouvent. Des capteurs indiquent les variations de température et d’humidité, mais il faut aussi examiner l’emplacement des objets. Une pièce située près d’une porte fréquemment ouverte peut subir des changements plus importants que ceux enregistrés au centre de la salle.\n— Les équipements de climatisation constituent-ils toujours la meilleure solution ?\n— Pas nécessairement. Dans certains bâtiments, déplacer un objet ou modifier les horaires d’ouverture d’une fenêtre peut réduire les variations les plus fortes. Nous évaluons ces solutions avant d’envisager des installations plus complexes, notamment lorsque le bâtiment lui-même impose des contraintes.\n— Comment vérifiez-vous qu’une mesure est efficace ?\n— Nous suivons les conditions dans le temps et examinons régulièrement les objets. Un changement d’humidité plus faible ne garantit pas que tous les risques ont disparu. Certaines dégradations peuvent être liées à des événements passés ou à d’autres facteurs.\n— Quel est votre objectif ?\n— Définir des conditions adaptées aux objets et aux lieux, en évitant de transformer une valeur de référence en règle automatique. La conservation exige de comprendre les risques particuliers plutôt que d’appliquer les mêmes réglages partout.\n— Comment transmettez-vous les observations aux personnes qui travaillent quotidiennement dans ces bâtiments ?\n— Nous préparons des consignes adaptées aux lieux. Les responsables peuvent ainsi signaler les modifications d'usage qui risquent d'influencer les conditions de conservation, notamment lors d'une manifestation.",
    "questions": [
      {
        "stem": "Pourquoi la mesure au centre d’une salle peut-elle être insuffisante ?",
        "correct": "Les conditions peuvent varier près de l’emplacement réel de l’objet.",
        "wrong": [
          "Les capteurs ne fonctionnent pas correctement dans les bâtiments historiques.",
          "Les objets en bois modifient systématiquement les mesures d’humidité.",
          "Les variations enregistrées au centre sont toujours supérieures à celles près des portes."
        ],
        "explanation": "Un objet proche d’une porte peut être soumis à des variations locales plus fortes."
      },
      {
        "stem": "Quelle approche le spécialiste recommande-t-il avant d’installer un système complexe ?",
        "correct": "Évaluer des adaptations simples aux conditions du lieu.",
        "wrong": [
          "Remplacer les objets les plus fragiles par des reproductions.",
          "Maintenir les fenêtres fermées dans tous les bâtiments historiques.",
          "Définir les mêmes valeurs de température pour toutes les salles."
        ],
        "explanation": "Le déplacement ou la modification des usages peuvent réduire certaines variations."
      }
    ]
  },
  {
    "start": 29,
    "topic": "création d’une filière de transformation de fruits déclassés",
    "script": "Dans une région productrice de fruits, plusieurs exploitations cherchent à valoriser les récoltes qui ne répondent pas aux critères habituels de vente en magasin. Ces fruits peuvent être trop petits, présenter des marques superficielles ou avoir une forme irrégulière. Les producteurs envisageaient au départ de créer une unité capable de transformer toutes les récoltes déclassées en jus. Les premiers essais ont montré que certains fruits étaient particulièrement adaptés à la fabrication de compotes, tandis que d’autres donnaient de meilleurs résultats dans des préparations séchées. La qualité du produit transformé dépendait également du degré de maturité au moment de la collecte. Les responsables ont donc commencé à distinguer les lots selon leurs caractéristiques, au lieu de les regrouper dans une seule catégorie. Une difficulté supplémentaire concerne les quantités disponibles. Les fruits déclassés représentent une part variable de la récolte selon les conditions météorologiques et les exigences des acheteurs. Une installation dimensionnée pour une année exceptionnelle pourrait être sous-utilisée pendant les années suivantes. Le collectif étudie donc plusieurs formes de coopération, notamment le partage d’équipements avec des producteurs qui transforment déjà une partie de leurs fruits. Les responsables souhaitent aussi établir des débouchés correspondant à des volumes réalistes. Ils rappellent que la transformation ne constitue pas automatiquement une solution rentable : il faut tenir compte du tri, du transport, de la préparation et de la commercialisation. Le projet sera développé progressivement, en tenant compte des caractéristiques des fruits disponibles et des besoins des utilisateurs.\nLe collectif doit également examiner les conditions de collecte des fruits. Certains lots doivent être transformés rapidement après leur récolte, tandis que d'autres peuvent attendre quelques jours. Les producteurs souhaitent établir des procédures simples pour communiquer ces informations aux ateliers. Des essais de conditionnement seront réalisés avec les partenaires afin de limiter les dommages pendant le transport. Le projet tiendra compte des coûts supplémentaires que ces opérations peuvent représenter pour les exploitations.",
    "questions": [
      {
        "stem": "Pourquoi les lots ne sont-ils plus regroupés dans une catégorie unique ?",
        "correct": "Leurs caractéristiques correspondent à des transformations différentes.",
        "wrong": [
          "Les magasins exigent que chaque lot provienne d’une seule exploitation.",
          "Les fruits déclassés ne peuvent pas être transformés avec les mêmes équipements.",
          "Les producteurs souhaitent fixer un prix selon la forme des fruits."
        ],
        "explanation": "Les essais montrent des usages différents selon les fruits et leur maturité."
      },
      {
        "stem": "Quel risque concerne le dimensionnement de la future installation ?",
        "correct": "Les quantités à transformer varient selon les années.",
        "wrong": [
          "Les producteurs ne pourront plus vendre de fruits aux magasins.",
          "Les équipements partagés exigent une collecte quotidienne des récoltes.",
          "Les produits transformés se conservent moins longtemps que les fruits frais."
        ],
        "explanation": "Une année exceptionnelle peut conduire à prévoir une capacité trop importante."
      }
    ]
  },
  {
    "start": 31,
    "topic": "évolution des modalités de réservation dans les ateliers de réparation automobile",
    "script": "Un garage a introduit un système de réservation en ligne pour certaines interventions. Les premiers créneaux correspondaient à des durées fixées selon la catégorie de service choisie par le client. Les mécaniciens ont constaté que les descriptions fournies par les clients ne permettaient pas toujours de déterminer le temps nécessaire. Une même catégorie pouvait correspondre à un contrôle rapide ou à une recherche de panne plus longue. Le garage souhaite donc distinguer les interventions dont la durée est prévisible de celles qui nécessitent un premier examen. Pour ces dernières, le système proposera un créneau de diagnostic, puis un autre rendez-vous si des travaux supplémentaires sont nécessaires. Les responsables espèrent ainsi réduire les retards sans obliger les clients à identifier eux-mêmes la cause d’un problème avant de prendre rendez-vous.",
    "questions": [
      {
        "stem": "Quelle limite du premier système a été constatée ?",
        "correct": "La catégorie choisie ne reflétait pas toujours la durée réelle de l’intervention.",
        "wrong": [
          "Les mécaniciens ne pouvaient pas consulter les réservations en ligne.",
          "Les clients choisissaient principalement les créneaux les plus courts.",
          "Le nombre de rendez-vous disponibles variait selon le type de véhicule."
        ],
        "explanation": "Une même catégorie pouvait recouvrir un contrôle rapide ou une recherche de panne."
      }
    ]
  },
  {
    "start": 32,
    "topic": "évaluation des formations à l’utilisation de logiciels de gestion",
    "script": "Une entreprise a proposé des formations à un nouveau logiciel de gestion. Les premières séances expliquaient successivement les différentes fonctions de l’outil. Les salariés réussissaient souvent les exercices guidés, mais certains hésitaient lorsqu’ils devaient réaliser une opération réelle qui nécessitait plusieurs fonctions. Les formateurs ont donc introduit des situations de travail complètes, dans lesquelles les participants doivent choisir eux-mêmes les étapes à effectuer. Les démonstrations restent disponibles sous forme de supports courts pour retrouver une fonction précise. La formation souhaite désormais distinguer la connaissance des commandes et la capacité à les mobiliser dans une tâche professionnelle. Les évaluations porteront aussi sur les erreurs que les participants savent repérer et corriger sans demander immédiatement l’intervention d’un formateur.",
    "questions": [
      {
        "stem": "Quelle capacité la nouvelle formation cherche-t-elle à mieux développer ?",
        "correct": "Choisir et combiner les fonctions adaptées à une tâche réelle.",
        "wrong": [
          "Mémoriser l’emplacement de toutes les commandes du logiciel.",
          "Réduire le nombre d’opérations réalisées pendant chaque exercice.",
          "Utiliser le logiciel uniquement à partir de démonstrations enregistrées."
        ],
        "explanation": "Les situations complètes exigent de sélectionner et d’enchaîner des fonctions."
      }
    ]
  },
  {
    "start": 33,
    "topic": "étude des effets de la circulation d’air dans les logements rénovés",
    "script": "Des chercheurs ont examiné plusieurs logements après des travaux destinés à améliorer leur isolation. Les mesures indiquaient une réduction des échanges d’air involontaires avec l’extérieur. Cependant, dans certains logements, l’humidité augmentait lorsque les occupants utilisaient rarement les équipements de ventilation. Les chercheurs souhaitent donc analyser ensemble les caractéristiques du bâtiment, les réglages des équipements et les pratiques quotidiennes. Ils précisent qu’une amélioration de l’isolation ne signifie pas qu’il faut supprimer les renouvellements d’air nécessaires. Les recommandations doivent permettre de conserver les bénéfices énergétiques des travaux tout en maintenant des conditions intérieures adaptées. L’équipe prévoit également de vérifier si les consignes données aux habitants sont suffisamment compréhensibles pour permettre un usage régulier des équipements installés.",
    "questions": [
      {
        "stem": "Quelle relation les chercheurs souhaitent-ils mieux comprendre ?",
        "correct": "L’interaction entre isolation, ventilation et habitudes des occupants.",
        "wrong": [
          "L’effet de la température extérieure sur le prix des équipements.",
          "Le lien entre la superficie des logements et le coût des travaux.",
          "La relation entre le nombre d’occupants et l’épaisseur des murs."
        ],
        "explanation": "L’humidité peut augmenter lorsque l’isolation progresse sans ventilation adaptée."
      }
    ]
  },
  {
    "start": 34,
    "topic": "conception de systèmes d’affichage pour les horaires des traversées maritimes",
    "script": "Une compagnie maritime a modifié les informations diffusées dans ses terminaux. Les anciens écrans indiquaient principalement l’heure prévue de départ et le numéro du quai. Lorsqu’une traversée était retardée, l’horaire affiché était parfois remplacé par une nouvelle estimation, sans préciser si celle-ci était confirmée. Les voyageurs ne savaient donc pas toujours s’ils pouvaient quitter temporairement le terminal ou devaient rester près de l’embarquement. La compagnie souhaite maintenant distinguer les horaires confirmés des estimations et indiquer le moment où une nouvelle information sera disponible. Elle conserve les annonces sonores pour les changements immédiats. Le but n’est pas de fournir une précision impossible lorsque les conditions évoluent, mais de rendre l’incertitude suffisamment claire pour permettre aux voyageurs d’organiser leur attente.",
    "questions": [
      {
        "stem": "Quel problème le nouvel affichage vise-t-il à résoudre ?",
        "correct": "L’absence de distinction entre les horaires confirmés et les estimations.",
        "wrong": [
          "La difficulté d’identifier le numéro du quai sur les anciens écrans.",
          "Le manque d’informations sur les tarifs des traversées retardées.",
          "La fréquence excessive des annonces sonores dans les terminaux."
        ],
        "explanation": "Une estimation non identifiée rendait les décisions difficiles pour les voyageurs."
      }
    ]
  },
  {
    "start": 35,
    "topic": "analyse des conditions de conservation des aliments dans les cantines",
    "script": "Une collectivité a étudié les pertes alimentaires observées dans plusieurs cantines. Les premiers relevés portaient sur les quantités jetées après le service. Les responsables ont ensuite distingué les aliments préparés mais non servis de ceux qui revenaient dans les assiettes. Ces deux catégories peuvent avoir des causes différentes : une estimation excessive du nombre de repas ou un plat qui ne correspond pas aux attentes des convives. Les équipes souhaitent adapter les actions à ces causes, plutôt que réduire uniformément les portions. Elles prévoient également d’examiner les conditions dans lesquelles certains aliments non servis peuvent être conservés conformément aux règles applicables. L’objectif est de mieux utiliser les informations recueillies pour choisir les mesures pertinentes, sans supposer que toutes les pertes se réduisent de la même manière.",
    "questions": [
      {
        "stem": "Pourquoi distinguer les aliments non servis de ceux laissés dans les assiettes ?",
        "correct": "Les causes des pertes et les solutions possibles peuvent différer.",
        "wrong": [
          "Les aliments non servis ne représentent jamais une perte économique.",
          "Les portions individuelles déterminent uniquement les pertes avant le service.",
          "Les aliments laissés dans les assiettes peuvent être conservés pour un autre repas."
        ],
        "explanation": "Les surplus de préparation et les restes des convives ont des origines différentes."
      }
    ]
  },
  {
    "start": 36,
    "topic": "étude des modalités d’accès aux formations de premiers secours",
    "script": "Un organisme a analysé la participation à ses formations de premiers secours. Les cours étaient proposés principalement sous forme de journées complètes. Les personnes interrogées qui n’avaient pas pu s’inscrire évoquaient souvent des difficultés à libérer une journée entière, même lorsqu’elles étaient motivées. L’organisme teste donc un format réparti sur plusieurs séances courtes. Il souhaite cependant vérifier que les participants peuvent pratiquer les gestes suffisamment longtemps et que les connaissances acquises lors d’une séance restent disponibles à la suivante. Les responsables ne considèrent pas qu’un format plus flexible soit automatiquement équivalent au format initial. Ils compareront les possibilités d’accès, la continuité de l’apprentissage et les résultats des exercices pratiques, afin de déterminer dans quelles conditions les deux formes de formation peuvent répondre aux mêmes objectifs.",
    "questions": [
      {
        "stem": "Quelle réserve accompagne le nouveau format ?",
        "correct": "Il faut vérifier que la répartition des séances préserve les acquis pratiques.",
        "wrong": [
          "Les formations courtes sont accessibles uniquement aux personnes déjà formées.",
          "Les journées complètes ne permettent pas de pratiquer suffisamment les gestes.",
          "Le nouveau format devrait remplacer tous les cours existants dès son ouverture."
        ],
        "explanation": "La flexibilité doit être comparée à la continuité de l’apprentissage et à la pratique."
      }
    ]
  },
  {
    "start": 37,
    "topic": "gestion de la disponibilité des outils dans les ateliers de maintenance",
    "script": "Une entreprise a installé un système permettant de suivre les outils utilisés par ses équipes de maintenance. Les premiers relevés montraient que certains outils étaient rarement présents dans leur emplacement de rangement. Les responsables ont d’abord envisagé d’en acheter davantage. Une observation des interventions a cependant montré que plusieurs outils restaient dans les véhicules après la fin des travaux, alors qu’ils pourraient servir à d’autres équipes. L’entreprise souhaite donc améliorer les procédures de retour et distinguer les outils réellement nécessaires en permanence de ceux qui peuvent être partagés. Elle conserve la possibilité d’acquérir de nouveaux équipements lorsque les besoins simultanés le justifient. Le but est d’éviter de confondre un outil indisponible en raison de son emplacement avec un manque réel de matériel.",
    "questions": [
      {
        "stem": "Quel constat conduit à revoir la décision d’achat ?",
        "correct": "Certains outils indisponibles ne sont pas utilisés au moment de la recherche.",
        "wrong": [
          "Les équipements rarement rangés doivent être remplacés plus fréquemment.",
          "Les véhicules de maintenance ne disposent pas de rangement sécurisé.",
          "Les équipes utilisent toutes les mêmes outils pendant leurs interventions."
        ],
        "explanation": "Des outils restent dans les véhicules alors qu’ils ne sont plus nécessaires."
      }
    ]
  },
  {
    "start": 38,
    "topic": "évaluation des modalités de consultation des dossiers dans les services sociaux",
    "script": "Un service social a introduit un espace numérique permettant aux personnes accompagnées de consulter certains documents de leur dossier. Les premiers résultats portaient sur le nombre de connexions. Les responsables ont ensuite constaté que certaines personnes consultaient plusieurs fois un document parce qu’elles ne comprenaient pas quelle démarche il impliquait. Ils souhaitent donc distinguer l’accès à l’information de sa compréhension et de la capacité à agir. Le service envisage d’ajouter des indications sur les étapes suivantes, ainsi que la possibilité de demander une explication. Il ne cherche pas à rendre tous les échanges numériques, mais à permettre aux personnes qui souhaitent utiliser l’espace de le faire de manière utile. Les évaluations incluront les situations où la consultation a évité une démarche supplémentaire ou facilité un échange avec un conseiller.",
    "questions": [
      {
        "stem": "Quelle distinction guide l’évolution du service ?",
        "correct": "Consulter un document ne signifie pas nécessairement savoir quelle action entreprendre.",
        "wrong": [
          "Les personnes qui se connectent souvent ont toujours besoin d’un accompagnement régulier.",
          "Les documents numériques contiennent davantage d’informations que les documents papier.",
          "Les échanges avec les conseillers doivent être réservés aux personnes sans accès numérique."
        ],
        "explanation": "L’accès doit être distingué de la compréhension et de la possibilité d’agir."
      }
    ]
  },
  {
    "start": 39,
    "topic": "analyse des conditions de partage de véhicules entre petites associations",
    "script": "Plusieurs associations souhaitent partager un véhicule utilisé pour transporter du matériel lors d’événements. Les responsables avaient initialement prévu un calendrier commun de réservation. Ils ont ensuite constaté que les événements se déroulaient souvent aux mêmes périodes, ce qui limitait les possibilités de partage. Certains déplacements pouvaient toutefois être effectués avant ou après l’événement, notamment pour déposer du matériel dans un espace sécurisé. Les associations étudient donc leurs besoins plus précisément, en distinguant les horaires réellement imposés des horaires qui peuvent être adaptés. Elles souhaitent aussi prévoir une solution de remplacement lorsqu’un véhicule devient indisponible. Le partage sera évalué en fonction des déplacements effectivement réalisables, et pas simplement du nombre d’associations participant au dispositif.",
    "questions": [
      {
        "stem": "Quel élément permettrait de faciliter certains partages ?",
        "correct": "Identifier les déplacements dont l’horaire peut être modifié.",
        "wrong": [
          "Réserver le véhicule uniquement aux événements les plus importants.",
          "Organiser toutes les activités associatives à des périodes différentes.",
          "Augmenter le nombre d’associations utilisant le même calendrier."
        ],
        "explanation": "Les livraisons de matériel peuvent parfois être déplacées dans le temps."
      }
    ]
  },
  {
    "start": 40,
    "topic": "comparaison des formats de présentation de résultats scientifiques au public",
    "script": "Un centre scientifique a testé deux formats pour présenter les résultats d’une étude au public. Le premier résumait les conclusions à l’aide de graphiques simples. Le second proposait également un exemple des données recueillies et expliquait comment elles avaient été interprétées. Les visiteurs du premier format retenaient rapidement les principaux résultats. Ceux du second identifiaient plus facilement les limites de l’étude et les raisons pour lesquelles certaines conclusions restaient prudentes. Les responsables envisagent donc de proposer plusieurs niveaux de lecture, en permettant aux visiteurs d’accéder aux méthodes lorsqu’ils souhaitent approfondir une question. Ils ne souhaitent pas rendre chaque présentation aussi détaillée qu’un article scientifique, mais éviter que la simplification des résultats donne une impression de certitude supérieure à celle que les données permettent réellement.",
    "questions": [
      {
        "stem": "Quelle complémentarité le centre cherche-t-il à conserver ?",
        "correct": "La compréhension rapide des résultats et l’accès à leurs limites.",
        "wrong": [
          "La présentation des graphiques et le classement des visiteurs par niveau scientifique.",
          "La diffusion des conclusions et l’abandon des méthodes détaillées.",
          "La mémorisation des données et la comparaison des résultats avec d’autres études."
        ],
        "explanation": "Les deux formats favorisent respectivement la lecture rapide et la compréhension des limites."
      }
    ]
  }
];

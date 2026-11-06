// Original HZad teaching material. Server-only; release to the owner content
// reviewer or after a completed paid attempt, never during active assessment.
export const DEBRIEF_VERSION='hzad-mock-debrief-01-20261105';
export const DEBRIEFS={
 'tef01-ee-a':{
  title:'Continue a local news story',
  checklist:['Continue the supplied story rather than rewriting its opening.','Explain how the employee searches for the owner.','Connect the photograph and Friday deadline to a plausible resolution.','Use a coherent sequence of past events and a newspaper-style voice.','Write at least 80 words.'],
  modelLabel:'Example continuation',
  modelResponse:`Elle a d’abord confié la valise au service des objets trouvés, puis a publié une annonce sans révéler le contenu de la photographie. Quelques heures plus tard, un homme âgé s’est présenté à la gare. Il a décrit précisément la valise et expliqué que la photographie représentait sa sœur, dont il avait perdu la trace après un déménagement.

Le document devait parvenir à sa nièce avant vendredi, jour où la famille préparait une exposition pour les quatre-vingts ans de sa sœur. L’homme avait retrouvé cette image dans les affaires de ses parents, mais avait oublié sa valise en descendant du train.

Après avoir vérifié son identité, l’employée lui a rendu ses affaires et l’a aidé à organiser l’envoi. Le lendemain, la nièce a confirmé la réception de la photographie. Invitée à l’exposition, l’employée a découvert que son geste avait permis de réunir plusieurs générations autour d’un souvenir presque oublié.`,
  whyItWorks:['The continuation accounts for the suitcase, photograph and deadline introduced in the prompt.','D’abord, quelques heures plus tard and le lendemain make the chronology easy to follow.','The imperfect supplies background; completed events move the story forward.'],
  pitfalls:['Do not change the discovered object or forget the Friday deadline.','Avoid switching between unrelated past and present events.','Give a resolution supported by details from the opening.'],
  practice:{instruction:'Rewrite the discovery and the first action using an imperfect background and a completed event.',example:'La gare était presque vide quand l’employée a aperçu une valise sur le banc.'}
 },
 'tef01-ee-b':{
  title:'Defend a position in a letter to a newspaper',
  checklist:['Address the proposal to replace printed books with entirely digital resources.','State a clear position and develop supporting arguments.','Use concrete examples, not only a list of opinions.','Address a relevant objection and conclude consistently.','Use a suitable letter register and at least 200 words.'],
  modelLabel:'Example opinion letter',
  modelResponse:`Madame, Monsieur,

Votre journal propose que les bibliothèques consacrent tout leur budget aux ressources numériques. Je comprends l’intérêt de moderniser leurs services, mais je suis opposée à la disparition des livres imprimés.

D’abord, une bibliothèque doit rester accessible à des publics très différents. Certains habitants ne possèdent ni tablette ni connexion stable. D’autres, notamment des personnes âgées, ont besoin d’un accompagnement pour utiliser les outils numériques. Leur proposer uniquement des fichiers risquerait donc de transformer un service public ouvert en un dispositif difficile à utiliser.

Ensuite, les supports répondent à des besoins complémentaires. Les ressources en ligne permettent de consulter rapidement un article ou d’emprunter un ouvrage sans se déplacer. Un livre imprimé convient davantage à certains enfants qui apprennent à lire, ainsi qu’aux lecteurs qui souhaitent s’éloigner des écrans. Dans ma famille, nous utilisons les deux formats selon le moment et l’activité.

On objectera que conserver des rayonnages coûte cher. Cet argument mérite d’être étudié, mais les licences numériques, les équipements et leur renouvellement représentent également des dépenses. Il faudrait comparer les coûts réels plutôt que supposer qu’un fichier reste disponible sans frais dans la durée.

Je propose donc une répartition progressive du budget, décidée après consultation des usagers. La bibliothèque pourrait développer les services numériques tout en maintenant une collection imprimée diversifiée et un personnel capable de conseiller chacun. Moderniser devrait élargir les possibilités de lecture, pas imposer un support unique.

Veuillez agréer, Madame, Monsieur, mes salutations distinguées.`,
  whyItWorks:['The opening states a position on the exact all-digital proposal.','Access, complementary uses and actual costs form distinct arguments supported by examples.','The counterargument is answered, then the conclusion offers a practical alternative.'],
  pitfalls:['Do not discuss technology in general without addressing library budgets and printed books.','Develop the reason behind each argument instead of accumulating connectors.','Keep the concluding recommendation consistent with the opening position.'],
  practice:{instruction:'Write a counterargument and a qualified response using Certes and toutefois.',example:'Certes, le numérique facilite les emprunts à distance ; toutefois, il ne répond pas à tous les besoins des lecteurs.'}
 },
 'tcf01-ee-1':{
  title:'Invite newly arrived colleagues on an outing',
  checklist:['Explain the proposed outing to the new colleagues.','Give a meeting place and time.','Explain the planned transport.','Say what participants should bring.','Write a clear message of 60–120 words.'],
  modelLabel:'Example message',
  modelResponse:`Bonjour à toutes et à tous,

Pour vous faire découvrir notre ville, je vous propose une promenade au bord du fleuve samedi prochain. Retrouvons-nous à 10 heures devant la bibliothèque municipale. Nous prendrons ensemble le bus numéro 12 ; le trajet dure environ vingt minutes. Prévoyez huit dollars pour les billets aller-retour.

Nous visiterons ensuite le petit marché et pique-niquerons dans le parc. Apportez un sandwich, une bouteille d’eau et une veste, car il peut faire frais près du fleuve. Des chaussures confortables seront également utiles.

Merci de me confirmer votre présence avant jeudi. À bientôt !`,
  whyItWorks:['The outing, meeting details, bus and items to bring are all explicit.','The tone suits a friendly message to colleagues.','Short paragraphs separate logistics from the programme and closing request.'],
  pitfalls:['Check that no requested practical detail is missing.','Stay inside both word limits.','Avoid a long introduction that leaves no space for transport and equipment.'],
  practice:{instruction:'Change the outing while keeping the four practical details.',example:'Rendez-vous dimanche à 9 h devant la gare ; nous irons au musée en tramway. Pensez à apporter votre carte de transport.'}
 },
 'tcf01-ee-2':{
  title:'Describe a first workshop experience and evaluate it',
  checklist:['Identify the shared-skill workshop and the circumstances of your participation.','Tell what happened using a clear sequence.','Explain specifically what you learned.','Give a supported opinion for the association website.','Write 120–150 words.'],
  modelLabel:'Example association post',
  modelResponse:`Samedi dernier, j’ai participé pour la première fois à un atelier de cuisine organisé par notre association. Une habitante du quartier nous a appris à préparer un repas avec des légumes de saison et un petit budget.

Au début, je craignais de ralentir le groupe, car je cuisine rarement. Pourtant, nous avons travaillé par deux et chacun a pu poser ses questions. J’ai surtout appris à utiliser les fanes de carottes dans une sauce, au lieu de les jeter. En rentrant, j’ai refait cette recette pour ma famille.

J’ai trouvé cette activité utile et conviviale : elle permet de découvrir une technique tout en rencontrant ses voisins. Le groupe était toutefois un peu nombreux pour une seule cuisine. Je conseillerais de limiter les inscriptions à huit personnes afin que chacun puisse davantage pratiquer lors d’une prochaine séance.`,
  whyItWorks:['The account moves from expectations to the activity and a concrete learning outcome.','The opinion is supported by social and practical benefits.','A specific limitation and suggestion add evaluation beyond a simple positive conclusion.'],
  pitfalls:['Include comments or opinions, not only a chronology.','Replace vague claims such as j’ai appris beaucoup de choses with an example.','Check the upper limit before adding a second story.'],
  practice:{instruction:'Write one benefit and one improvement about a different shared-skill activity.',example:'L’atelier photo m’a appris à cadrer un portrait ; un groupe plus petit aurait permis de comparer davantage de prises de vue.'}
 },
 'tcf01-ee-3':{
  title:'Compare two views on pedestrian streets and give your opinion',
  checklist:['Represent both Nora’s and Malik’s views accurately.','Compare the benefits for shops with concerns about mobility and transport.','Clearly distinguish the source summary from your own opinion.','Support your position with a reason or concrete example.','Write 120–180 words overall.'],
  modelLabel:'Example synthesis and opinion',
  modelResponse:`Les deux témoignages présentent des effets différents de la fermeture des rues le dimanche. Nora apprécie une ambiance agréable qui attire les familles et peut favoriser les commerces. Malik souligne plutôt les difficultés des personnes à mobilité réduite, aggravées par une offre de bus limitée. Ils invitent ainsi à considérer les usages du quartier sous plusieurs angles.

Pour ma part, je suis favorable à des dimanches piétons, à condition de préparer des solutions accessibles. Dans mon quartier, une rue sans voitures permettrait aux enfants de se promener plus librement et aux habitants de se rencontrer. Cependant, cet avantage ne devrait pas empêcher une personne âgée de rentrer chez elle. Il faudrait maintenir des points de dépose proches des immeubles et renforcer certains bus. Une expérimentation annoncée à l’avance permettrait ensuite de consulter les commerçants et les résidents. Je préfère donc une fermeture organisée et évaluée à une interdiction uniforme qui ignorerait les besoins particuliers.`,
  whyItWorks:['Each source is attributed accurately and neither is reduced to a caricature.','Pour ma part clearly marks the move from synthesis to the writer’s own view.','The position is developed through safeguards and an example, not merely stated.'],
  pitfalls:['Do not attribute Nora’s commercial benefits to Malik.','Paraphrase both sources rather than copying their paragraphs.','A personal opinion alone does not fulfil the comparison requirement.'],
  practice:{instruction:'Reformulate one concern from each source without copying its wording.',example:'La commerçante attend davantage de passages, tandis que l’habitant demande des accès adaptés aux personnes qui ne peuvent pas marcher longtemps.'}
 },
 'tef01-eo-a':{
  title:'Ask a workshop organiser for practical information',
  checklist:['Take the initiative and ask questions appropriate to a telephone enquiry.','Clarify the schedule, price, conditions and equipment before deciding.','Use follow-up questions based on the organiser’s answers.','Maintain suitable politeness and intelligible connected speech.'],
  modelLabel:'Example enquiry exchanges',
  exampleTurns:[
   {role:'learner',text:'Bonjour, je vous appelle au sujet de l’atelier vélo. Quels jours proposez-vous des séances ?'},
   {role:'interlocutor',text:'Nous avons une séance le mercredi à 18 h et une autre le samedi à 10 h.'},
   {role:'learner',text:'Le samedi m’intéresse. Combien de temps dure la séance, et quel est le tarif ?'},
   {role:'interlocutor',text:'Elle dure deux heures et coûte 35 dollars. Un tarif réduit de 20 dollars est prévu pour les étudiants et les personnes à faible revenu, avec un justificatif.'},
   {role:'learner',text:'Je suis étudiant. Quel justificatif dois-je présenter ? Faut-il l’envoyer avant la séance ?'},
   {role:'interlocutor',text:'Pour le justificatif précis et son envoi, nous pouvons vérifier les modalités avec l’accueil.'},
   {role:'learner',text:'D’accord. Je débute complètement : pourrai-je suivre l’atelier sans expérience ? Et dois-je apporter mon vélo ou mes propres outils ?'},
   {role:'interlocutor',text:'Les débutants sont acceptés. Apportez votre vélo ; nous prêtons les outils.'},
   {role:'learner',text:'Si je dois annuler, jusqu’à quand puis-je obtenir un remboursement ?'},
   {role:'interlocutor',text:'L’annulation est remboursée si vous prévenez au moins 48 heures avant.'},
   {role:'learner',text:'Merci. L’entrée est-elle accessible sans escalier ? Je vais vérifier mes disponibilités avant de m’inscrire.'}
  ],
  whyItWorks:['The candidate initiates each information request rather than waiting to be interviewed.','The student-discount answer leads to a relevant follow-up.','Questions have a purpose: judging whether the workshop fits the candidate’s needs.'],
  pitfalls:['Do not recite unrelated questions without listening to the reply.','Avoid answering your own questions or supplying facts the organiser has not given.','If information is unclear, reformulate instead of changing subject immediately.'],
  practice:{instruction:'Turn a general question into a follow-up that checks a condition.',example:'Vous prêtez les outils : est-ce que je dois quand même apporter du matériel de protection ?'}
 },
 'tef01-eo-b':{
  title:'Persuade a friend to join a repair-volunteering day',
  checklist:['Make a clear proposal and connect its benefits to your friend’s concerns.','Respond to the actual objection before introducing another argument.','Offer practical solutions using the scenario facts.','Use an appropriate friendly register and sustain the exchange.'],
  modelLabel:'Example persuasion exchanges',
  exampleTurns:[
   {role:'learner',text:'Tu voudrais venir avec moi au centre communautaire samedi ? Il y a une journée où l’on aide les habitants à réparer leurs objets.'},
   {role:'interlocutor',text:'Je ne suis pas très manuel. J’aurais peur d’abîmer quelque chose.'},
   {role:'learner',text:'Justement, des bénévoles expérimentés seront là. Et tu pourrais commencer par l’accueil ou le tri : tu n’es pas obligé de réparer tout de suite.'},
   {role:'interlocutor',text:'Peut-être, mais je n’ai pas toute la journée.'},
   {role:'learner',text:'La journée va de 10 h à 16 h, mais on peut participer seulement une heure. On pourrait venir en fin de matinée, puis déjeuner ensemble.'},
   {role:'interlocutor',text:'Le week-end, j’aime surtout me reposer.'},
   {role:'learner',text:'Je comprends. Ce serait une petite activité, pas une obligation pour tout le samedi. On rencontrerait des voisins et on apprendrait peut-être à réparer un objet dont on a besoin chez nous.'},
   {role:'interlocutor',text:'Et si je ne me sens pas à l’aise ?'},
   {role:'learner',text:'On pourra choisir une tâche simple avec l’équipe. Le but est de donner un coup de main, pas de se présenter comme expert. Viens essayer une heure avec moi : qu’est-ce qui te ferait hésiter encore ?'}
  ],
  whyItWorks:['Each answer responds to the friend’s latest concern.','The candidate offers a limited visit and suitable non-repair roles instead of denying the objections.','The tone remains friendly and leaves room for the other person to respond.'],
  pitfalls:['Do not repeat the same environmental argument after every objection.','Do not invent guarantees about insurance, childcare or transport that the scenario does not provide.','Persuasion needs interaction, not an uninterrupted speech to the friend.'],
  practice:{instruction:'Acknowledge an objection, then propose a specific compromise.',example:'Je comprends que tu sois occupé ; si nous venions seulement une heure, est-ce que ce serait possible ?'}
 },
 'tcf01-eo-1':{
  title:'Introduce yourself and respond naturally in an interview',
  checklist:['Answer the interviewer’s actual question with relevant personal information.','Develop brief answers with a reason, example or detail.','Connect everyday life, interests and plans coherently.','Adapt politely to follow-up questions rather than delivering a fixed script.'],
  modelLabel:'Example interview exchanges',
  exampleTurns:[
   {role:'interlocutor',text:'Bonjour. Pouvez-vous vous présenter ?'},
   {role:'learner',text:'Bonjour. Je m’appelle Camille et j’habite à Winnipeg depuis deux ans. Je travaille dans une petite entreprise de transport. Pendant mon temps libre, j’aime marcher et cuisiner avec des amis.'},
   {role:'interlocutor',text:'Qu’appréciez-vous dans votre quartier ?'},
   {role:'learner',text:'J’apprécie surtout le parc près de chez moi. J’y vais après le travail, parce que cela me permet de me détendre. En hiver, je retrouve plutôt mes voisins au centre communautaire.'},
   {role:'interlocutor',text:'Avez-vous un projet pour les prochains mois ?'},
   {role:'learner',text:'Oui, je voudrais améliorer mon français pour participer plus facilement aux réunions. Je vais suivre un atelier de conversation et essayer de parler un peu chaque jour.'}
  ],
  whyItWorks:['Answers include details and reasons while leaving space for the interviewer.','The follow-up about the neighbourhood receives a relevant answer rather than a return to a memorised introduction.','The future plan connects an objective with concrete actions.'],
  pitfalls:['Do not force a memorised biography into every answer.','A one-word answer gives little language evidence; add a useful detail.','If you do not understand a question, request a brief reformulation.'],
  practice:{instruction:'Answer a question about a hobby with a reason and a recent example.',example:'J’aime la randonnée parce qu’elle me permet de découvrir la région. Le week-end dernier, j’ai suivi un nouveau sentier avec une amie.'}
 },
 'tcf01-eo-2':{
  title:'Obtain information before joining an evening association',
  checklist:['Use preparation to identify the information needed for a decision.','Ask questions yourself, using the roles in the prompt.','Follow up on activities, scheduling, membership and registration.','Clarify an answer and bring the enquiry to a natural conclusion.'],
  modelLabel:'Example information exchanges',
  exampleTurns:[
   {role:'learner',text:'Bonjour, je cherche une activité après le travail. Quelles activités proposez-vous en soirée ?'},
   {role:'interlocutor',text:'Nous proposons du théâtre le mardi, de la randonnée urbaine le jeudi et de la cuisine le vendredi, de 18 h 30 à 20 h.'},
   {role:'learner',text:'La randonnée m’intéresse. Est-ce qu’elle convient à une personne débutante ?'},
   {role:'interlocutor',text:'Oui, nous accueillons tous les niveaux. Prévoyez des chaussures confortables.'},
   {role:'learner',text:'Très bien. Combien coûte l’adhésion et puis-je essayer avant de m’inscrire ?'},
   {role:'interlocutor',text:'L’adhésion coûte 25 dollars par trimestre. Une séance d’essai est gratuite.'},
   {role:'learner',text:'Comment faut-il réserver cette séance ? Et pour l’inscription, dois-je venir sur place ?'},
   {role:'interlocutor',text:'Pour l’inscription, vous pouvez passer à l’accueil ou utiliser le site avant la première séance. Nous pouvons vérifier avec l’accueil la réservation de l’essai.'},
   {role:'learner',text:'Merci. Si je dois manquer une séance, quand faut-il vous prévenir ?'},
   {role:'interlocutor',text:'Prévenez-nous la veille.'},
   {role:'learner',text:'D’accord, je vais commencer par l’essai du jeudi. Merci pour vos renseignements.'}
  ],
  whyItWorks:['The candidate gathers information to choose a suitable activity.','The follow-up narrows the general activities answer to a beginner’s needs.','Membership, trial, registration and absence are distinguished rather than confused.'],
  pitfalls:['Use the preparation for a question plan, not a long speech about yourself.','Do not wait for the responsible person to ask all the questions.','Distinguish a free trial from free membership.'],
  practice:{instruction:'Prepare five different information needs, then formulate one follow-up for a possible answer.',example:'Vous proposez une séance gratuite : est-ce que je dois réserver ma place à l’avance ?'}
 },
 'tcf01-eo-3':{
  title:'Develop a sustained opinion about learning alone or in a group',
  checklist:['Answer the comparison in the question and establish a clear position.','Develop arguments with concrete examples instead of listing slogans.','Discuss a limitation or opposing view.','Organise a sustained response with links and a conclusion.','Use the available speaking time to develop your own ideas.'],
  modelLabel:'Example argument development',
  modelResponse:`À mon avis, apprendre seul grâce à Internet peut être très efficace, mais cela ne remplace pas toujours un cours en groupe. Le meilleur choix dépend de la compétence que l’on veut acquérir, de son expérience et de sa façon de travailler.

Le premier avantage des ressources en ligne est la souplesse. On peut choisir son horaire, revoir une explication et avancer à son rythme. Par exemple, une personne qui apprend à utiliser un logiciel peut arrêter une vidéo pour reproduire chaque manipulation. Elle n’a pas besoin d’attendre que tout un groupe arrive au même point. Pour quelqu’un qui travaille avec des horaires variables, cette liberté est essentielle.

Cependant, l’autonomie demande de savoir organiser son travail et repérer ses erreurs. Quand on débute, on peut répéter un geste incorrect sans s’en rendre compte. Un professeur ou un autre participant peut alors apporter un retour que la vidéo ne fournit pas. Dans un cours de langue, par exemple, comprendre une règle sur un écran ne suffit pas pour apprendre à réagir dans une conversation.

Le groupe peut aussi soutenir la motivation. Avoir un rendez-vous régulier aide certaines personnes à continuer lorsqu’elles rencontrent une difficulté. En contrepartie, un rythme commun ne convient pas à tous : on peut s’ennuyer ou se sentir dépassé.

Je ne choisirais donc pas une solution unique pour toutes les situations. Pour commencer une activité complexe, je privilégierais un accompagnement, puis j’utiliserais des ressources en ligne pour pratiquer. Si l’objectif est plus limité et que l’on sait déjà travailler seul, Internet peut suffire. L’essentiel est de disposer d’une méthode et d’un retour sur ses progrès, quel que soit le support.`,
  whyItWorks:['The position answers the choice in the prompt while allowing conditions.','Each mode is supported by concrete learning situations and limits.','The conclusion synthesises the reasoning instead of introducing a new unrelated issue.'],
  pitfalls:['Avoid using the entire task to introduce the topic without developing an argument.','Examples should support the reason they follow.','A balanced answer still needs an identifiable position.'],
  practice:{instruction:'Develop one reason into a short argument: claim, explanation, example and limitation.',example:'Le groupe peut soutenir la motivation : les rendez-vous réguliers encouragent la pratique. Toutefois, ils doivent rester compatibles avec les disponibilités des participants.'}
 }
};

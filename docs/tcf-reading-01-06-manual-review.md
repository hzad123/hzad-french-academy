# Final manual editorial review — TCF Reading 01–06

Review date: 18 November 2026. **GitHub draft PR #64 only. Do NOT publish.** Baseline: feature-branch commit `48e909087818e45f78b534a384eed60b17b6071b` (the candidate as it stood when the user requested this correction). Test content: `tcf-reading-2026-11-advanced-v5`.

## Verification method and honesty limits

Every Q25–Q39 passage, stem, and all four alternatives in Tests 01–06 was read **without displaying the existing JSON answer key or explanation**. The correct letter was derived from the source passage, then independently recorded with a distinctive supporting passage quotation and rationale. Only **after** those decisions was the set of 90 keys compared with the actual JSON. The 90 source-derivation records live at `tests/fixtures/tcf-reading-01-06-independent-evidence.json`. Regression tests consume that file, not previous guesses or copied answer-key assertions.

This establishes passage-based editorial judgments. It cannot prove real student guessing rates, guarantee that every proficient reader finds the tests challenging, or certify official FEI psychometric level. No AI review pipeline or external AI API was used. The original passage topics were preserved.

## Incorrect keys found and corrected

- **Test 01, Question 30 (oceans): C → B.** The passage says the same oceanic CO₂ absorption helps regulate climate yet acidifies marine waters. B alone makes this connection. The previous test incorrectly expected C. The regression now explicitly asserts **B** and requires supporting ocean-acidification evidence.
- **Test 01, Question 37: B → C solely for answer-option shuffling**, not because the educational answer changed. The correct option about managing hybrid-team coordination moved from B to C to restore an even A/B/C/D distribution after correcting Q30. The source-supported meaning remains identical.
- **No other mismatched advanced answer keys** were found in the 90-item passage-first comparison after those changes.

## All questions rewritten in this final pass

61 distinct Q25–Q39 items received changes. Fields include answer options, question stems where needed, explanations, and corrected key positions. Each item's original passage remains unchanged.


### Test 1 — 13 questions changed

| Question | Edited fields |
|---:|---|
| 25 | options |
| 26 | options |
| 27 | options |
| 28 | options |
| 29 | options |
| 30 | options, correct, explanation |
| 31 | options, explanation |
| 32 | options |
| 33 | options, explanation |
| 34 | options |
| 35 | options, explanation |
| 37 | options, correct |
| 39 | options, explanation |

### Test 2 — 10 questions changed

| Question | Edited fields |
|---:|---|
| 25 | options |
| 27 | options |
| 29 | options |
| 32 | options, explanation |
| 33 | options, explanation |
| 35 | options, explanation |
| 36 | options, explanation |
| 37 | options |
| 38 | options, explanation |
| 39 | options, explanation |

### Test 3 — 10 questions changed

| Question | Edited fields |
|---:|---|
| 25 | options |
| 27 | options |
| 28 | options |
| 29 | options |
| 30 | options, explanation |
| 32 | options, explanation |
| 33 | options |
| 36 | options, explanation |
| 37 | options, explanation |
| 39 | options, explanation |

### Test 4 — 10 questions changed

| Question | Edited fields |
|---:|---|
| 25 | options |
| 27 | options |
| 29 | options |
| 30 | options, explanation |
| 31 | options |
| 33 | options |
| 36 | options, explanation |
| 37 | options |
| 38 | options, explanation |
| 39 | options, explanation |

### Test 5 — 8 questions changed

| Question | Edited fields |
|---:|---|
| 25 | options |
| 26 | options |
| 29 | options |
| 30 | options, explanation |
| 31 | options |
| 35 | options |
| 37 | options, explanation |
| 39 | question, options, explanation |

### Test 6 — 10 questions changed

| Question | Edited fields |
|---:|---|
| 25 | options |
| 26 | options |
| 29 | options |
| 30 | options |
| 31 | options, explanation |
| 35 | options, explanation |
| 36 | options, explanation |
| 37 | options, explanation |
| 38 | options |
| 39 | question, options, explanation |

## Passage-first evidence and meaning for each of the 90 questions

This table records *independently determined* answers and evidence, not the previously stored answer keys.


### Test 1

| Q | Key | Exact supporting excerpt | Independently identified distinction |
|---:|:---:|---|---|
| 25 | C | concentration, la mémoire et le moral | sleep deprivation affects cognition and mood |
| 26 | A | proposition de contrat pour publication | a contract is offered for first manuscript |
| 27 | D | responsabiliser les randonneurs et à préserver l’environnement | safety and environmental goals |
| 28 | B | rendre la culture accessible à tous | cultural access across groups |
| 29 | B | cycle de sommeil des animaux et empêche l’observation astronomique | disturbs wildlife and astronomy |
| 30 | B | cette absorption entraîne l’acidification des eaux marines | carbon uptake also acidifies water |
| 31 | B | Les résultats des élèves à long terme sont en cours d’évaluation | long-term evaluation pending |
| 32 | B | favorise la biodiversité et le bien-être | new uses and biodiversity |
| 33 | A | peine à captiver le lecteur | weak suspense despite style |
| 34 | C | les expériences plutôt que les possessions matérielles | experiences exceed possessions |
| 35 | B | Ce lien émotionnel semble renforcer | possible emotional memory mechanism |
| 36 | A | des plats créatifs, riches en saveurs | creative food attracts varied audience |
| 37 | C | repenser leurs méthodes de suivi et de communication | hybrid teams require coordination |
| 38 | D | favorise également l’entraide entre les âges | multiage autonomy and cooperation |
| 39 | A | leur intégration harmonieuse dans l’espace urbain | safe urban coexistence prerequisite |

### Test 2

| Q | Key | Exact supporting excerpt | Independently identified distinction |
|---:|:---:|---|---|
| 25 | A | un document court envoyé à l'avance, puis un échange collectif | both consultation methods retained |
| 26 | D | revoir le sous-sol avant la plantation | check underground conditions first |
| 27 | C | un déplacement du problème vers la rue annulerait ce bénéfice | displaced rubbish undermines gain |
| 28 | B | laissent les bénéficiaires choisir leurs achats et leur rythme | aid without substituting decisions |
| 29 | C | les élèves retrouvent un lieu propre le lundi | clean courtyard condition |
| 30 | B | un salon commun ne crée pas à lui seul des relations | common lounge not sufficient |
| 31 | B | d'ajouter le confort d'été et les charges des occupants | add lived comfort and bills |
| 32 | B | entre location ponctuelle de salle et recettes habituelles | cross-subsidize free sessions |
| 33 | A | si le quartier fournit des services accessibles | services affect total resource budget |
| 34 | D | conserver une certaine stabilité | balance stable use and new access |
| 35 | C | des accords locaux qui maintiennent les services tout en limitant les nuisances | negotiated local rules |
| 36 | D | ignore les revenus des ménages visés | market comparisons ignore incomes |
| 37 | D | un autre créneau ou participer autrement | flexible community participation |
| 38 | B | attractivité tout en fragilisant certaines fonctions | displacement despite revitalization |
| 39 | D | des composants communs tout en permettant des transformations | standardized yet adaptable |

### Test 3

| Q | Key | Exact supporting excerpt | Independently identified distinction |
|---:|:---:|---|---|
| 25 | C | Le programme final conserve les deux approches | practical and reflective training |
| 26 | D | parcours rarement linéaires | nonlinear careers |
| 27 | B | sensations que l'image seule explique mal | tacit skill not on video |
| 28 | D | Les horaires proposés coïncident avec leurs obligations familiales | scheduling blocks training |
| 29 | B | une formule stable pour retrouver les mêmes voisins | regular neighbor contact |
| 30 | C | une présence numérique longue ne dit rien de la difficulté | hours not complexity |
| 31 | B | qualité du service tout en demandant des moyens et des horaires soutenables | commitment compatible with fair hours |
| 32 | A | croisement des informations qu'ils apportent | triangulate hiring evidence |
| 33 | A | comprennent suffisamment les tâches voisines | specialization with backup |
| 34 | C | distinguent l'apprentissage d'une technique de l'accès effectif à un emploi | skills do not equal job access |
| 35 | D | le choix de leurs méthodes, mais maintient des objectifs de sécurité communs | autonomy within safety criteria |
| 36 | A | Son expérience constitue un appui, pas une équivalence totale | transfer with adaptation |
| 37 | C | le nombre de dossiers | workload volume versus care quality |
| 38 | A | d'autres aptitudes que réparer une machine | technical ability not management |
| 39 | D | revoir les procédures qui excluent des candidats | remove access filters not standards |

### Test 4

| Q | Key | Exact supporting excerpt | Independently identified distinction |
|---:|:---:|---|---|
| 25 | B | financent l'entretien du chemin | parking funds pedestrian final access |
| 26 | A | temps pour improviser et connaître la vie quotidienne | slower travel for spontaneous immersion |
| 27 | D | ce qui peut être adapté et ce qui ne peut pas l'être | honest limitations before joining |
| 28 | B | plusieurs abonnements n'exigeaient pas de validation | tap counts miss trips |
| 29 | B | activité moins concentrée et des emplois plus stables | stable activity outside peak |
| 30 | A | la durée des séjours et les dépenses réalisées | arrivals not local contribution |
| 31 | A | les horaires restent mal coordonnés | fares integrated but schedules aren't |
| 32 | A | une mise en scène conçue pour eux | staged vs spontaneous ambiguity |
| 33 | B | son point le plus difficile | route safety at discontinuities |
| 34 | B | continuer à fréquenter un lieu | residents customary access |
| 35 | C | marge pour les personnes se déplaçant lentement | walking-speed accessibility |
| 36 | B | Il devient trompeur lorsqu'il est compris comme la durée totale | segment not end-to-end |
| 37 | C | hébergements refusent encore les séjours d'une seule nuit | one-night stops needed |
| 38 | D | déplacer la pression plutôt que la diminuer | displaced rather than decreased activity |
| 39 | D | transforme ce lieu discret en nouvelle attraction | recommendations cause concentration |

### Test 5

| Q | Key | Exact supporting excerpt | Independently identified distinction |
|---:|:---:|---|---|
| 25 | B | l'allongement des trajets automobiles | induced car trips missing |
| 26 | A | un secteur témoin | comparison across seasons and control |
| 27 | D | un objet partagé longtemps peut être utile | lifetime and maintenance |
| 28 | D | affectées en priorité aux jeunes plantations | prioritize young plants |
| 29 | B | Mieux voir n'autorise pas à perturber | wildlife protection over visibility |
| 30 | D | Un designer travaille donc sur la conception initiale | treatment expertise influences design |
| 31 | A | les économies d'emballage peuvent être dépassées | breakage can outweigh material saving |
| 32 | C | Une plantation homogène peut être vulnérable à une maladie | uniform trees share disease risk |
| 33 | D | solutions pratiques : réparateurs accessibles | behavior needs usable infrastructure |
| 34 | D | compter tous les éléments récupérés comme des économies déjà assurées | recovered is not yet reused |
| 35 | B | la continuité des habitats compte autant que leur superficie | connectivity not only area |
| 36 | B | quantités effectivement orientées vers le bon traitement | actual recovery |
| 37 | B | suivi de plusieurs indicateurs sur plusieurs années | many timescales and indicators |
| 38 | C | nombre d'appareils augmente | per unit versus total |
| 39 | A | faire passer une promesse future pour un résultat déjà acquis | future promise not immediate offset |

### Test 6

| Q | Key | Exact supporting excerpt | Independently identified distinction |
|---:|:---:|---|---|
| 25 | B | La sobriété matérielle devient un choix artistique | constraints shape stage choices |
| 26 | B | recueille les impressions avant d'expliquer | first personal response before guidance |
| 27 | C | fragilités matérielles justifient de limiter les visites physiques | conserve fragile collection |
| 28 | D | Les deux formats répondent à différents usages | different complementary formats |
| 29 | D | compromettre les éditions suivantes | volunteer morale sustains next festivals |
| 30 | A | disposer d'un droit d'entrée ne suffit pas toujours | formal access not actionable orientation |
| 31 | A | rendre l'œuvre lisible en respectant son histoire | preserve historical layers while legible |
| 32 | C | ne dispense pas d'adapter le spectacle | online success needs stage adaptation |
| 33 | B | un équilibre entre médiation et présence des œuvres | interaction plus direct viewing |
| 34 | A | La règle n'efface donc pas les différences individuelles | common rules allow individuality |
| 35 | C | quantité des entrées ne décrit pas à elle seule | depth of experience adds to counts |
| 36 | A | gestes les plus faciles à montrer, au détriment du travail | performance threatens research |
| 37 | D | parole unique qui effacerait les différences internes | reject homogeneous group voice |
| 38 | B | un déplacement accompagné de ces repères | guided move beyond preferences |
| 39 | C | groupes plus petits malgré une baisse du chiffre annoncé | fewer admissions for richer exchanges |

## Structural, progress and release safeguards

- All six original source passages and question numbers are preserved at each position. Exactly 39 questions and four distinct alternatives each, 3600 seconds, and 699 practice points per test.
- Existing student progress/attempts/scores are untouched because **no Supabase migration, publication pointer change, or frontend change** was made in this PR. The other 14 tests are not edited.
- In every test the correct-letter distribution is 9–10 uses of each letter; the former repeating ABCD key in Test 01 is removed.
- `tests/tcf-reading-v5-answer-alignment.test.mjs` validates all 90 independently derived keys and exact selected options; Q30 also has a standalone proof test.
- `tests/tcf-reading-01-06-v5.test.mjs` verifies source/structure integrity, variation, and the absence of the Test 01 cycle.
- CI must pass the complete `npm test` and `npm run build` steps. The build verifies compilation, **not** logged-in student experience. Do not claim live publication from CI success.

## Remaining limitations / potentially easy cases

The original shorter source passages in **Test 01 Q25–34** allow relatively direct comprehension even after rewriting their options; matching truly demanding advanced TCF items may require deeper passage content or new reasoning tasks in a subsequent separately reviewed revision. **Test 03 Q25–29**, **Test 05 Q30**, and **Test 06 Q39** also have explicit central claims that a proficient reader may recognize quickly. Their foils were improved, but no unseen-student calibration has established that they meet an advanced difficulty threshold. Consequently it would be inaccurate to promise zero guessing opportunities.

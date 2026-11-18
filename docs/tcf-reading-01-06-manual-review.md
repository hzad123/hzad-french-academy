# Final independent editorial review — TCF Reading Tests 01–06

**Review date:** 18 November 2026. **Status: Unpublished candidate only, draft PR #64.** Comparison baseline: commit `48e909087818e45f78b534a384eed60b17b6071b`.

## Method and answer-key correction

The passages, questions and four French options for **all 90 advanced questions (25–39 × six tests)** were read without displaying their saved answer keys or existing explanations. An answer and short supporting source quotation were recorded before comparing the 90 decisions with the candidate JSON. The independent evidence fixture is `tests/fixtures/tcf-reading-01-06-independent-evidence.json`, and the regression test now reads that fixture rather than previous expected letters.

**Educational key error discovered:** Test 01 Q30, oceans, **C → B**. The passage directly shows that absorbing CO₂ contributes to climate regulation while acidifying water and threatening ecosystems. Option B expresses this; C misinterpreted the causal relationship. The JSON, answer explanation and standalone regression assertion were corrected.

**Display-only key-position change:** Test 01 Q37 moved **B → C** after reordering the two options to keep answer letters balanced following Q30. Its correct *meaning* did not change. This is not an educational key error.

No other wrong advanced keys emerged from the passage-first comparison. This is an editorial verification, not a claim of official TCF calibration or a guarantee against guessing.

## Detailed changes in this pass

**62 distinct questions** had revised distractors, stems, key positions or explanations compared with the baseline. None of the 90 original passages was replaced, and no earlier/intermediate question wording was changed.


### Test 1: 13 corrected questions

| Question | Fields revised |
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

### Test 2: 10 corrected questions

| Question | Fields revised |
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

### Test 3: 11 corrected questions

| Question | Fields revised |
|---:|---|
| 25 | options |
| 27 | options |
| 28 | options |
| 29 | options |
| 30 | options, explanation |
| 31 | options, explanation |
| 32 | options, explanation |
| 33 | options |
| 36 | options, explanation |
| 37 | options, explanation |
| 39 | options, explanation |

### Test 4: 10 corrected questions

| Question | Fields revised |
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

### Test 5: 8 corrected questions

| Question | Fields revised |
|---:|---|
| 25 | options |
| 26 | options |
| 29 | options |
| 30 | options, explanation |
| 31 | options |
| 35 | options |
| 37 | options, explanation |
| 39 | question, options, explanation |

### Test 6: 10 corrected questions

| Question | Fields revised |
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

## Individually verified answers and passage evidence

| Test | Q | Source-derived answer | Supporting passage phrase | Reason for selection |
|---:|---:|:---:|---|---|
| 1 | 25 | C | concentration, la mémoire et le moral | sleep deprivation affects cognition and mood |
| 1 | 26 | A | proposition de contrat pour publication | a contract is offered for first manuscript |
| 1 | 27 | D | responsabiliser les randonneurs et à préserver l’environnement | safety and environmental goals |
| 1 | 28 | B | rendre la culture accessible à tous | cultural access across groups |
| 1 | 29 | B | cycle de sommeil des animaux et empêche l’observation astronomique | disturbs wildlife and astronomy |
| 1 | 30 | B | cette absorption entraîne l’acidification des eaux marines | carbon uptake also acidifies water |
| 1 | 31 | B | Les résultats des élèves à long terme sont en cours d’évaluation | long-term evaluation pending |
| 1 | 32 | B | favorise la biodiversité et le bien-être | new uses and biodiversity |
| 1 | 33 | A | peine à captiver le lecteur | weak suspense despite style |
| 1 | 34 | C | les expériences plutôt que les possessions matérielles | experiences exceed possessions |
| 1 | 35 | B | Ce lien émotionnel semble renforcer | possible emotional memory mechanism |
| 1 | 36 | A | des plats créatifs, riches en saveurs | creative food attracts varied audience |
| 1 | 37 | C | repenser leurs méthodes de suivi et de communication | hybrid teams require coordination |
| 1 | 38 | D | favorise également l’entraide entre les âges | multiage autonomy and cooperation |
| 1 | 39 | A | leur intégration harmonieuse dans l’espace urbain | safe urban coexistence prerequisite |
| 2 | 25 | A | un document court envoyé à l'avance, puis un échange collectif | both consultation methods retained |
| 2 | 26 | D | revoir le sous-sol avant la plantation | check underground conditions first |
| 2 | 27 | C | un déplacement du problème vers la rue annulerait ce bénéfice | displaced rubbish undermines gain |
| 2 | 28 | B | laissent les bénéficiaires choisir leurs achats et leur rythme | aid without substituting decisions |
| 2 | 29 | C | les élèves retrouvent un lieu propre le lundi | clean courtyard condition |
| 2 | 30 | B | un salon commun ne crée pas à lui seul des relations | common lounge not sufficient |
| 2 | 31 | B | d'ajouter le confort d'été et les charges des occupants | add lived comfort and bills |
| 2 | 32 | B | entre location ponctuelle de salle et recettes habituelles | cross-subsidize free sessions |
| 2 | 33 | A | si le quartier fournit des services accessibles | services affect total resource budget |
| 2 | 34 | D | conserver une certaine stabilité | balance stable use and new access |
| 2 | 35 | C | des accords locaux qui maintiennent les services tout en limitant les nuisances | negotiated local rules |
| 2 | 36 | D | ignore les revenus des ménages visés | market comparisons ignore incomes |
| 2 | 37 | D | un autre créneau ou participer autrement | flexible community participation |
| 2 | 38 | B | attractivité tout en fragilisant certaines fonctions | displacement despite revitalization |
| 2 | 39 | D | des composants communs tout en permettant des transformations | standardized yet adaptable |
| 3 | 25 | C | Le programme final conserve les deux approches | practical and reflective training |
| 3 | 26 | D | parcours rarement linéaires | nonlinear careers |
| 3 | 27 | B | sensations que l'image seule explique mal | tacit skill not on video |
| 3 | 28 | D | Les horaires proposés coïncident avec leurs obligations familiales | scheduling blocks training |
| 3 | 29 | B | une formule stable pour retrouver les mêmes voisins | regular neighbor contact |
| 3 | 30 | C | une présence numérique longue ne dit rien de la difficulté | hours not complexity |
| 3 | 31 | B | qualité du service tout en demandant des moyens et des horaires soutenables | commitment compatible with fair hours |
| 3 | 32 | A | croisement des informations qu'ils apportent | triangulate hiring evidence |
| 3 | 33 | A | comprennent suffisamment les tâches voisines | specialization with backup |
| 3 | 34 | C | distinguent l'apprentissage d'une technique de l'accès effectif à un emploi | skills do not equal job access |
| 3 | 35 | D | le choix de leurs méthodes, mais maintient des objectifs de sécurité communs | autonomy within safety criteria |
| 3 | 36 | A | Son expérience constitue un appui, pas une équivalence totale | transfer with adaptation |
| 3 | 37 | C | le nombre de dossiers | workload volume versus care quality |
| 3 | 38 | A | d'autres aptitudes que réparer une machine | technical ability not management |
| 3 | 39 | D | revoir les procédures qui excluent des candidats | remove access filters not standards |
| 4 | 25 | B | financent l'entretien du chemin | parking funds pedestrian final access |
| 4 | 26 | A | temps pour improviser et connaître la vie quotidienne | slower travel for spontaneous immersion |
| 4 | 27 | D | ce qui peut être adapté et ce qui ne peut pas l'être | honest limitations before joining |
| 4 | 28 | B | plusieurs abonnements n'exigeaient pas de validation | tap counts miss trips |
| 4 | 29 | B | activité moins concentrée et des emplois plus stables | stable activity outside peak |
| 4 | 30 | A | la durée des séjours et les dépenses réalisées | arrivals not local contribution |
| 4 | 31 | A | les horaires restent mal coordonnés | fares integrated but schedules aren't |
| 4 | 32 | A | une mise en scène conçue pour eux | staged vs spontaneous ambiguity |
| 4 | 33 | B | son point le plus difficile | route safety at discontinuities |
| 4 | 34 | B | continuer à fréquenter un lieu | residents customary access |
| 4 | 35 | C | marge pour les personnes se déplaçant lentement | walking-speed accessibility |
| 4 | 36 | B | Il devient trompeur lorsqu'il est compris comme la durée totale | segment not end-to-end |
| 4 | 37 | C | hébergements refusent encore les séjours d'une seule nuit | one-night stops needed |
| 4 | 38 | D | déplacer la pression plutôt que la diminuer | displaced rather than decreased activity |
| 4 | 39 | D | transforme ce lieu discret en nouvelle attraction | recommendations cause concentration |
| 5 | 25 | B | l'allongement des trajets automobiles | induced car trips missing |
| 5 | 26 | A | un secteur témoin | comparison across seasons and control |
| 5 | 27 | D | un objet partagé longtemps peut être utile | lifetime and maintenance |
| 5 | 28 | D | affectées en priorité aux jeunes plantations | prioritize young plants |
| 5 | 29 | B | Mieux voir n'autorise pas à perturber | wildlife protection over visibility |
| 5 | 30 | D | Un designer travaille donc sur la conception initiale | treatment expertise influences design |
| 5 | 31 | A | les économies d'emballage peuvent être dépassées | breakage can outweigh material saving |
| 5 | 32 | C | Une plantation homogène peut être vulnérable à une maladie | uniform trees share disease risk |
| 5 | 33 | D | solutions pratiques : réparateurs accessibles | behavior needs usable infrastructure |
| 5 | 34 | D | compter tous les éléments récupérés comme des économies déjà assurées | recovered is not yet reused |
| 5 | 35 | B | la continuité des habitats compte autant que leur superficie | connectivity not only area |
| 5 | 36 | B | quantités effectivement orientées vers le bon traitement | actual recovery |
| 5 | 37 | B | suivi de plusieurs indicateurs sur plusieurs années | many timescales and indicators |
| 5 | 38 | C | nombre d'appareils augmente | per unit versus total |
| 5 | 39 | A | faire passer une promesse future pour un résultat déjà acquis | future promise not immediate offset |
| 6 | 25 | B | La sobriété matérielle devient un choix artistique | constraints shape stage choices |
| 6 | 26 | B | recueille les impressions avant d'expliquer | first personal response before guidance |
| 6 | 27 | C | fragilités matérielles justifient de limiter les visites physiques | conserve fragile collection |
| 6 | 28 | D | Les deux formats répondent à différents usages | different complementary formats |
| 6 | 29 | D | compromettre les éditions suivantes | volunteer morale sustains next festivals |
| 6 | 30 | A | disposer d'un droit d'entrée ne suffit pas toujours | formal access not actionable orientation |
| 6 | 31 | A | rendre l'œuvre lisible en respectant son histoire | preserve historical layers while legible |
| 6 | 32 | C | ne dispense pas d'adapter le spectacle | online success needs stage adaptation |
| 6 | 33 | B | un équilibre entre médiation et présence des œuvres | interaction plus direct viewing |
| 6 | 34 | A | La règle n'efface donc pas les différences individuelles | common rules allow individuality |
| 6 | 35 | C | quantité des entrées ne décrit pas à elle seule | depth of experience adds to counts |
| 6 | 36 | A | gestes les plus faciles à montrer, au détriment du travail | performance threatens research |
| 6 | 37 | D | parole unique qui effacerait les différences internes | reject homogeneous group voice |
| 6 | 38 | B | un déplacement accompagné de ces repères | guided move beyond preferences |
| 6 | 39 | C | groupes plus petits malgré une baisse du chiffre annoncé | fewer admissions for richer exchanges |

## Safeguards and remaining difficulty concerns

- All six papers retain **39 questions, 4 distinct answer choices per question, 3600 seconds, and 699 practice points**, with passages, topics, question identifiers and point bands unchanged.
- Answer keys are reasonably balanced (9–10 per letter per test), and Test 01 no longer repeats ABCD cyclically.
- `tests/tcf-reading-v5-answer-alignment.test.mjs` checks all 90 source-derived answers and their selected option text. It expressly tests that Test 01 Q30 is B for the correct oceanic reason.
- `tests/tcf-reading-01-06-v5.test.mjs` checks source and structural preservation, no topic duplication, and the former predictable key pattern.
- **No Supabase migration or new published-paper pointer has been applied.** Other 14 tests, student attempts, scores and stored progress are unchanged. Backend read/write permissions and frontend were not touched.
- Some advanced questions are constrained by the **short, direct source passages**, notably Test 01 Q25–34 and Test 03 Q25–29. Test 05 Q30 and Test 06 Q39 still test an overt central distinction, although their distractors are more competitive. Educational difficulty has not been psychometrically calibrated using real test takers. Do not call these equivalent in difficulty to official TCF exam questions based on static review alone.
- Release remains **blocked intentionally** until owner authorizes publishing. Passing tests/build does not imply live publication or an authenticated browser review.

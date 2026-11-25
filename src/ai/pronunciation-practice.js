// Selecting another exercise is local and free. Count apostrophe/hyphen-separated words conservatively.
export const pronunciationPhrases={
 "A0": [
  "Bonjour, je m’appelle Camille.",
  "Je suis ici.",
  "Merci beaucoup, bonne journée à vous !",
  "J’ai deux frères.",
  "Voici mon ami.",
  "Il fait beau dans notre ville aujourd’hui.",
  "Je parle un peu français.",
  "Nous sommes ici.",
  "Tu as un chat ?",
  "À demain, tout le monde !",
  "Un café, merci.",
  "Les enfants sont dans la cour ce matin.",
  "Je suis prêt.",
  "Elle aime les fleurs rouges.",
  "Vous avez un petit chien très gentil."
 ],
 "A1": [
  "Je voudrais un café, s’il vous plaît.",
  "Vous habitez ici ?",
  "J’achète trois pommes et du pain frais.",
  "Mes amis arrivent.",
  "Nous avons un rendez-vous à huit heures.",
  "Elle prend le bus tous les matins.",
  "Il pleut dehors.",
  "Les enfants jouent dans le jardin après déjeuner.",
  "Je préfère le jus de fruits.",
  "Où est la gare ?",
  "La boutique ferme à six heures ce soir.",
  "Je cherche une chambre.",
  "Nous partons demain pour visiter la vieille ville.",
  "Elle a faim.",
  "Il porte un manteau bleu et des bottes."
 ],
 "A2": [
  "Nous allons prendre le train demain matin.",
  "Je suis en retard.",
  "Hier, nous avons oublié nos clés chez Paul.",
  "Il faut tourner à gauche.",
  "Nous avons réservé une table pour quatre personnes.",
  "Elle est arrivée en avance à la réunion.",
  "Le musée ferme bientôt.",
  "Pendant les vacances, nous visitions souvent ce musée.",
  "Je préfère rester ici.",
  "Vous pouvez traverser la rue devant la pharmacie.",
  "Tout est prêt.",
  "Nous aimerions découvrir les villages près du lac.",
  "Il répond rarement.",
  "On a finalement trouvé une solution assez simple.",
  "Je voudrais en savoir davantage."
 ],
 "B1": [
  "Si je pouvais, je voyagerais davantage.",
  "Cela me surprend.",
  "Nous aurions préféré partir avant les premiers embouteillages.",
  "Je doute de sa réponse.",
  "Les habitants se sont réunis pour discuter ensemble.",
  "Bien que fatiguée, elle poursuivit sa route.",
  "Il vaut mieux attendre.",
  "Nous devons prévenir les autres avant toute décision.",
  "Elle hésite encore.",
  "Si vous acceptez, nous pourrons commencer dès demain.",
  "Je reconnais mon erreur.",
  "Le public semblait apprécier la qualité du spectacle.",
  "Ce projet me plaît.",
  "Nous avons enfin obtenu les renseignements nécessaires.",
  "Il aurait fallu réfléchir."
 ],
 "B2": [
  "Il est essentiel que chacun exprime son opinion.",
  "Cela reste incertain.",
  "Les résultats confirment une tendance jusque-là peu visible.",
  "Cette hypothèse paraît fragile.",
  "Les efforts entrepris commencent enfin à porter leurs fruits.",
  "Il convient de nuancer.",
  "Nous cherchons une solution adaptée aux contraintes locales.",
  "Le délai semble excessif.",
  "Si nécessaire, nous réviserons les critères de sélection.",
  "Cette mesure suscite des réserves.",
  "Les participants souhaitent approfondir plusieurs aspects du dossier.",
  "Il faut relativiser.",
  "Ces conclusions méritent une analyse plus rigoureuse.",
  "Rien ne garantit cela.",
  "Toute modification devra respecter les engagements déjà pris."
 ],
 "C1": [
  "Cette hypothèse mérite une analyse approfondie.",
  "Cette distinction importe.",
  "Les divergences révèlent la complexité des enjeux sous-jacents.",
  "Il serait réducteur de conclure.",
  "Les transformations successives ont fragilisé un équilibre précaire.",
  "La nuance est déterminante.",
  "Ces avancées ne sauraient occulter les difficultés persistantes.",
  "Cette objection demeure pertinente.",
  "Les effets observés contredisent parfois les intentions affichées.",
  "Cela exige des précautions.",
  "Toute interprétation suppose une connaissance précise du contexte.",
  "Le raisonnement paraît contestable.",
  "Cette réforme appelle une réflexion sur ses conséquences.",
  "Il convient de relativiser.",
  "Les témoignages recueillis éclairent plusieurs dimensions du débat."
 ],
 "C2": [
  "Encore fallait-il que les circonstances soient favorables.",
  "Ce constat appelle réserve.",
  "Nul ne saurait préjuger des répercussions de cette réforme.",
  "La distinction demeure ténue.",
  "Ces formulations révèlent les présupposés implicites du discours.",
  "Cela relève du paradoxe.",
  "Le dispositif risque pourtant de cristalliser les tensions.",
  "Le propos reste équivoque.",
  "Cette interprétation ne saurait épuiser toutes les nuances.",
  "Cette prémisse est discutable.",
  "Les témoignages concordants ne dissipent pas toute ambiguïté.",
  "Il serait vain de spéculer.",
  "Une telle inflexion bouleverserait les équilibres institutionnels.",
  "La portée reste indéterminée.",
  "Ces conclusions appellent une réévaluation des critères retenus."
 ]
};
export const pronunciationWordCount=s=>(String(s||'').match(/[\p{L}\p{N}]+/gu)||[]).length;
export const validPronunciationPhrase=s=>typeof s==='string'&&s.trim().length>0&&s.length<=240&&pronunciationWordCount(s)>=1&&pronunciationWordCount(s)<=9;
const normalize=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('fr').replace(/[\p{P}\p{S}\s]+/gu,'');
export function nextPronunciationPhrase(level,submitted,suggestion,used=[]){
 const bank=pronunciationPhrases[level]||pronunciationPhrases.A0;
 const previous=normalize(submitted),seen=new Set(used.map(normalize));seen.add(previous);
 const candidate=typeof suggestion==='string'?suggestion.trim():'';
 const wantLong=pronunciationWordCount(submitted)<=5;
 const varied=p=>wantLong?pronunciationWordCount(p)>=6:pronunciationWordCount(p)<=5;
 if(validPronunciationPhrase(candidate)&&varied(candidate)&&!seen.has(normalize(candidate)))return candidate;
 const fresh=bank.filter(p=>!seen.has(normalize(p)));
 const available=fresh.length?fresh:bank.filter(p=>normalize(p)!==previous);
 return available.find(varied)||available[0];
}

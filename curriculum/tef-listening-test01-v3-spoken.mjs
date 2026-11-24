// Original TEF practice scripts for v3. Preserve the original 36 sources and
// extend only the four shared recordings with meaningful interview/report
// material. These are proposed scripts pending independent French editorial QA.
import {scripts as v2Scripts, sharedPairs} from './tef-listening-test01-v2-spoken.mjs';
export {sharedPairs};
export const scripts=[...v2Scripts];
const append=(i,text)=>{scripts[i]=scripts[i].trim()+"\n"+text.trim()};
append(22,`— Revenons à l'accessibilité. Certains commerçants disent que l'ancien marché possédait un charme particulier. Est-ce un sacrifice nécessaire ?
— Nous avons conservé les producteurs et les animations qui faisaient son identité. En revanche, une place pittoresque ne doit pas empêcher les habitants à mobilité réduite de faire leurs courses. C'est précisément ce que nous voulons éviter.
— Avez-vous prévu une consultation des riverains ?
— Oui. Nous recueillons leurs observations à l'entrée du marché et lors de réunions mensuelles. Si l'accès depuis le centre s'avère trop compliqué, nous étudierons une navette les jours de forte affluence. Rien n'est décidé à ce stade. Ce qui compte, c'est d'évaluer la situation avant de modifier encore l'organisation.`);
append(23,`— Cette approche individualisée signifie-t-elle que vous abandonnez les séances collectives ?
— Non, les ateliers communs restent utiles, notamment pour reconnaître les tentatives de fraude ou comprendre les démarches administratives. Simplement, ils ne constituent plus le point de départ obligatoire pour tout le monde.
— Et comment faites-vous avec les participants les plus hésitants ?
— Nous les encourageons d'abord à décrire ce qu'ils souhaitent accomplir, même s'ils ne connaissent aucun terme informatique. Ensuite, nous les guidons sans prendre systématiquement la souris à leur place. 
— Vous mesurez donc davantage l'autonomie que la vitesse ?
— Exactement. Les progrès peuvent sembler modestes, mais ils ont souvent des effets durables.`);
append(24,`— Les élus préfèrent pourtant disposer d'un indicateur facile à comparer. Que leur répondez-vous ?
— Un chiffre global permet d'ouvrir la discussion, pas de la terminer. Quand les nuisances se concentrent sur un trajet scolaire, une moyenne sur vingt-quatre heures risque de masquer le problème.
— Faudrait-il recueillir davantage de témoignages ?
— Oui, mais en prenant soin de ne pas interroger uniquement les personnes les plus mécontentes. Nous cherchons des observations à différentes heures et auprès d'habitants dont les habitudes varient.
— Et si les mesures de circulation ne produisent pas les effets attendus ?
— Nous devons accepter de les adapter. La recherche ne fournit pas un plan valable partout, elle aide les collectivités à tester des réponses et à vérifier leurs conséquences, y compris les effets imprévus dans les rues voisines.`);
append(25,`Les responsables du projet rappellent toutefois qu'il ne suffit pas de rouvrir un bâtiment pour rendre des services accessibles. Il faut former les agents, maintenir les permanences et prévoir des dépenses régulières d'entretien.
Une association locale propose d'aider les habitants à préparer leurs dossiers avant les rendez-vous, tandis qu'un groupe de bénévoles envisage d'accompagner ceux qui ne peuvent pas se déplacer. Ces propositions seront examinées progressivement. La municipalité souhaite avant tout éviter que l'affluence actuelle, très encourageante, masque les difficultés des usagers les moins autonomes. Elle publiera un bilan après une année complète de fonctionnement, en tenant compte des coûts, de la qualité de l'accueil et de la diversité des publics concernés.`);

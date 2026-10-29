// Authored, deterministic learning material. No AI requests.
export const a0Lessons = [
{id:'a0-01',title:'Bonjour ! Greetings',minutes:12,objectives:['Greet someone politely','Say goodbye','Recognize formal and informal greetings'],sections:[
{heading:'Meeting someone',body:'Use Bonjour during the day and Bonsoir in the evening. Salut is informal, for friends and people you know. Au revoir means goodbye.'},
{heading:'Mini dialogue',body:'— Bonjour ! Comment ça va ?\n— Ça va bien, merci. Et vous ?\n— Très bien, merci. Au revoir !'}],
vocabulary:[['Bonjour','Hello / good day'],['Bonsoir','Good evening'],['Salut','Hi / bye (informal)'],['Au revoir','Goodbye'],['Merci','Thank you'],['S’il vous plaît','Please (formal)'],['Ça va ?','How are you?'],['Très bien','Very well']],
quiz:[{id:'g1',type:'choice',prompt:'Which greeting is most appropriate for a teacher during the day?',options:['Salut','Bonjour','Bonne nuit'],answer:1,explanation:'Bonjour is a polite daytime greeting.'},{id:'g2',type:'choice',prompt:'What does « Au revoir » mean?',options:['Goodbye','Please','Thank you'],answer:0,explanation:'Au revoir is used when leaving.'},{id:'g3',type:'choice',prompt:'Which expression is informal?',options:['S’il vous plaît','Bonjour','Salut'],answer:2,explanation:'Salut is an informal greeting.'}]},
{id:'a0-02',title:'Je m’appelle… Introductions',minutes:15,objectives:['Introduce yourself','Ask someone’s name','Use tu and vous appropriately'],sections:[
{heading:'Your name',body:'Je m’appelle… means My name is… To ask informally, say Comment tu t’appelles ? To ask politely or to more than one person, say Comment vous vous appelez ?'},
{heading:'Mini dialogue',body:'— Bonjour ! Je m’appelle Amira. Et toi ?\n— Moi, c’est Lucas. Enchanté !\n— Enchantée !'}],
vocabulary:[['Je m’appelle','My name is'],['Comment tu t’appelles ?','What is your name? (informal)'],['Comment vous vous appelez ?','What is your name? (formal/plural)'],['Enchanté / Enchantée','Nice to meet you'],['Et toi ?','And you? (informal)'],['Et vous ?','And you? (formal/plural)']],
quiz:[{id:'i1',type:'choice',prompt:'How do you say “My name is Léa”?',options:['Je suis appelle Léa','Je m’appelle Léa','Tu t’appelles Léa'],answer:1,explanation:'Je m’appelle is the standard way to introduce your name.'},{id:'i2',type:'choice',prompt:'Which question is more polite when meeting an adult stranger?',options:['Comment vous vous appelez ?','Comment tu t’appelles ?','Et toi ?'],answer:0,explanation:'Vous is used for formal or plural address.'},{id:'i3',type:'choice',prompt:'What does « Et toi ? » mean?',options:['Good evening','And you?','Thank you'],answer:1,explanation:'Et toi ? asks the other person the same question informally.'}]},
{id:'a0-03',title:'Numbers 0–20',minutes:15,objectives:['Recognize numbers from zero to twenty','Say a simple age','Practice number pronunciation'],sections:[
{heading:'Count in French',body:'0 zéro · 1 un · 2 deux · 3 trois · 4 quatre · 5 cinq · 6 six · 7 sept · 8 huit · 9 neuf · 10 dix · 11 onze · 12 douze · 13 treize · 14 quatorze · 15 quinze · 16 seize · 17 dix-sept · 18 dix-huit · 19 dix-neuf · 20 vingt'},
{heading:'Your age',body:'To say your age, use avoir (to have): J’ai vingt ans. In French, you “have” twenty years rather than “are” twenty years.'}],
vocabulary:[['zéro','0'],['cinq','5'],['dix','10'],['onze','11'],['quinze','15'],['vingt','20'],['J’ai vingt ans','I am twenty years old']],
quiz:[{id:'n1',type:'choice',prompt:'What number is « quinze »?',options:['5','15','16'],answer:1,explanation:'Quinze means fifteen.'},{id:'n2',type:'choice',prompt:'How do you say “I am twenty years old”?',options:['Je suis vingt ans','J’ai vingt ans','Je fais vingt ans'],answer:1,explanation:'French uses avoir (to have) for age.'},{id:'n3',type:'choice',prompt:'What comes after « dix-neuf »?',options:['vingt','dix-huit','seize'],answer:0,explanation:'Vingt is twenty.'}]}
];
export function gradeQuiz(lesson,answers){
 const questions=lesson.quiz;
 const correct=questions.reduce((sum,q)=>sum+(answers[q.id]===q.answer?1:0),0);
 return {correct,total:questions.length,percent:Math.round(100*correct/questions.length),passed:correct/questions.length>=0.7,
 feedback:questions.map(q=>({id:q.id,correct:answers[q.id]===q.answer,answer:q.options[q.answer],explanation:q.explanation}))};
}

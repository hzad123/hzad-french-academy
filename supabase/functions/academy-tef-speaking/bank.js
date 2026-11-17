import bank from '../../exams/tef-speaking-tests.json' with {type:'json'};
export const BANK=bank;
const byId=new Map(bank.tests.map(p=>[p.id,p]));
export function resolveTest(id,version){
 const t=byId.get(id);
 if(!t||version!==bank.version)throw Error('Cette épreuve TEF n’est pas disponible.');
 return t;
}
export function attemptTest(attempt){return resolveTest(attempt.test_id,attempt.version)}
export function publicTest(t){
 return {id:t.id,version:t.version,title:t.title,sections:t.sections.map(
  ({letter,seconds,type,objective,heading,document,instructions,opening})=>({letter,seconds,type,objective,heading,document,instructions,opening})
 )};
}
export const publicCatalog=()=>bank.tests.map(publicTest);

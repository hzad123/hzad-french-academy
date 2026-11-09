import current from '../../exams/tcf-writing-tests.json' with {type:'json'};
import original from '../../exams/tcf-writing-tests-v1.json' with {type:'json'};
export const CURRENT_BANK=current;
export const LEGACY_BANK=original;
const banks=new Map([current,original].map(bank=>[bank.version,new Map(bank.tests.map(paper=>[paper.id,paper]))]));
export function paperForAttempt(attempt){
 const paper=banks.get(attempt.version)?.get(attempt.testId);
 if(!paper)throw Error('Unsupported writing test version.');return paper;
}
export const withPaper=attempt=>({...attempt,paper:paperForAttempt(attempt)});

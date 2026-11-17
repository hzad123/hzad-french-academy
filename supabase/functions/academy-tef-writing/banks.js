import current from '../../exams/tef-writing-tests.json' with {type:'json'};
export const CURRENT_BANK=current;
const tests=new Map(current.tests.map(p=>[p.id,p]));
export function paperForAttempt(attempt){
 if(attempt.version!==current.version)throw Error('Unsupported TEF writing test version.');
 const paper=tests.get(attempt.testId);if(!paper)throw Error('Unknown TEF writing paper.');return paper;
}
export const withPaper=attempt=>({...attempt,paper:paperForAttempt(attempt)});

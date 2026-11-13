import {test} from 'node:test';
import assert from 'node:assert/strict';
import {estimateListeningPractice,listeningNclc,LISTENING_MODEL_VERSION} from '../src/exams/tcf-listening/scoring.js';
const sheet=choice=>({rows:Array.from({length:39},(_,i)=>({number:i+1,isCorrect:choice(i+1)}))});
test('TCF listening estimator is monotonic, bounded, and explicitly unvalidated',()=>{
 const none=estimateListeningPractice(sheet(()=>false));
 const all=estimateListeningPractice(sheet(()=>true));
 const half=estimateListeningPractice(sheet(n=>n<=20));
 assert.equal(none.score,100);assert.equal(all.score,699);
 assert(half.score>none.score&&half.score<all.score);
 assert.equal(half.model,LISTENING_MODEL_VERSION);
 assert.match(half.basis,/unvalidated/i);
 assert.equal(none.nclc,'Below 4');assert.equal(all.nclc,'10+');
 assert(half.lower<=half.score&&half.upper>=half.score);
});
test('official IRCC listening thresholds are used on the proxy only',()=>{
 const data=[[330,'Below 4'],[331,'4'],[368,'4'],[369,'5'],[397,'5'],[398,'6'],[457,'6'],[458,'7'],[502,'7'],[503,'8'],[522,'8'],[523,'9'],[548,'9'],[549,'10+'],[699,'10+']];
 for(const [score,level] of data)assert.equal(listeningNclc(score),level);
 for(const score of [99,700,NaN,Infinity])assert.equal(listeningNclc(score),null);
});
test('rejects incomplete, duplicate, and malformed marked result rows',()=>{
 assert.equal(estimateListeningPractice(null),null);
 assert.equal(estimateListeningPractice({rows:[]}),null);
 const bad=sheet(()=>false);bad.rows[1].number=1;assert.equal(estimateListeningPractice(bad),null);
 const corrupt=sheet(()=>false);corrupt.rows[4].isCorrect='yes';assert.equal(estimateListeningPractice(corrupt),null);
});
test('advanced correctly answered questions count more under disclosed practice model',()=>{
 const early=estimateListeningPractice(sheet(n=>n<=10));
 const late=estimateListeningPractice(sheet(n=>n>=30));
 assert(late.score>early.score);
});

// Unofficial HZad practice estimator for the original 39-question listening bank.
// Official FEI TCF scaled scores use calibrated item parameters which are NOT
// available to HZad; no formula can recover an official score from these answers.
// This transparent monotonic difficulty-weighted proxy is for study feedback only.
// IRCC listening NCLC cutoffs are applied to the proxy, NOT to a certified score.
// https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/documents/examen-linguistique.html
export const LISTENING_MODEL_VERSION='hzad-unvalidated-listening-proxy-v1';
export const NCLC_LISTENING_THRESHOLDS=Object.freeze([
 {minimum:549,label:'10+'},{minimum:523,label:'9'},
 {minimum:503,label:'8'},{minimum:458,label:'7'},
 {minimum:398,label:'6'},{minimum:369,label:'5'},
 {minimum:331,label:'4'}
]);
export function listeningNclc(scaled){
 if(!Number.isFinite(scaled)||scaled<100||scaled>699)return null;
 return NCLC_LISTENING_THRESHOLDS.find(t=>scaled>=t.minimum)?.label||'Below 4';
}
export function estimateListeningPractice(result){
 if(!result||!Array.isArray(result.rows)||result.rows.length!==39)return null;
 // Authenticated RPC's marked rows are the sole input; the model does not
 // accept student-submitted totals, grades, keys or difficulty parameters.
 const numbers=new Set();
 let earned=0,possible=0;
 for(const row of result.rows){
  const n=row.number;
  if(!Number.isInteger(n)||n<1||n>39||numbers.has(n)||typeof row.isCorrect!=='boolean')return null;
  numbers.add(n);
  const weight=1+0.8*(n-1)/38;
  possible+=weight;
  if(row.isCorrect)earned+=weight;
 }
 if(numbers.size!==39)return null;
 const score=Math.max(100,Math.min(699,Math.round(100+599*earned/possible)));
 // Deliberately broad indicative range to avoid pretending calibrated precision.
 const lower=Math.max(100,score-50),upper=Math.min(699,score+50);
 return {
  model:LISTENING_MODEL_VERSION,
  score,
  lower,upper,
  nclc:listeningNclc(score),
  nclcLow:listeningNclc(lower),
  nclcHigh:listeningNclc(upper),
  basis:'An unvalidated, difficulty-weighted practice estimate, not an official TCF score.'
 };
}

// Preview-only progress. Local storage is NOT an authoritative or cross-device record.
const KEY='hzad-a0-preview-progress-v1';
export function readPreviewProgress(storage=globalThis.localStorage){
 try{return JSON.parse(storage.getItem(KEY)||'{}')}catch{return {}}
}
export function recordPreviewAttempt(lessonId,result,storage=globalThis.localStorage){
 const all=readPreviewProgress(storage);
 const prev=all[lessonId]||{attempts:0,best:0,completed:false};
 all[lessonId]={attempts:prev.attempts+1,best:Math.max(prev.best,result.percent),completed:prev.completed||result.passed,updatedAt:new Date().toISOString()};
 storage.setItem(KEY,JSON.stringify(all));return all[lessonId];
}
export function progressPercent(lessons,records){return Math.round(100*lessons.filter(l=>records[l.id]?.completed).length/lessons.length)}

// A completed quiz means every question was answered and the server saved it.
// A passing score (70%+) is still recorded independently for feedback/mastery.
export function withSavedQuizCompletion(progress,unitId,receipt){
 if(!unitId||!receipt||!Number.isInteger(receipt.percent)||receipt.percent<0||receipt.percent>100){
   throw Error('Invalid saved quiz result: completion could not be confirmed.');
 }
 const previous=progress[unitId]||{};
 return {
   ...progress,
   [unitId]:{
     ...previous,
     completed:true,
     attempts:(previous.attempts||0)+1,
     best:Math.max(previous.best||0,receipt.percent)
   }
 };
}

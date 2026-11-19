// Targeted, source-specific editorial corrections for two defective spoken passages.
// These are proposed for NEW recordings only; never overwrite immutable historical v1.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const revisions={
  15:{
    before:"Ils affirment que financer des enquêtes approfondies et garder des équipes locales.",
    after:"Ils affirment vouloir financer des enquêtes approfondies tout en maintenant des équipes locales.",
    question:"Quelle difficulté les rédactions doivent-elles concilier ?",
    options:[
      "Maintenir les effectifs en supprimant les enquêtes difficiles à vérifier.",
      "Financer les enquêtes grâce aux annonceurs sans définir de garde-fous.",
      "Renforcer la vérification sans compromettre l’indépendance de la rédaction.",
      "Accélérer la diffusion des informations en reportant leur vérification."
    ],
    explanation:"Les responsables souhaitent financer des enquêtes et maintenir des équipes locales, mais ils doivent préserver l’indépendance éditoriale face aux financeurs, malgré les contraintes de temps. Les autres réponses abandonnent la vérification, acceptent la dépendance financière ou introduisent une stratégie absente du reportage.",
    correct:"C"
  },
  20:{
    before:"Ils affirment que assurer la continuité du suivi après les premiers mois.",
    after:"Ils affirment vouloir assurer la continuité du suivi au-delà des premiers mois.",
    question:"Quel défi reste à résoudre pour ce dispositif d’accueil ?",
    options:[
      "Remplacer l’accompagnement multilingue par une information écrite commune.",
      "Réduire le nombre de rendez-vous pour éviter les demandes internationales.",
      "Réserver le suivi de longue durée aux personnes déjà accompagnées.",
      "Assurer un suivi durable malgré les périodes de saturation des rendez-vous."
    ],
    explanation:"Le reportage présente un accompagnement multilingue et un suivi au-delà des premiers mois, tandis que les créneaux de rentrée sont déjà saturés. Les autres propositions imposent des restrictions ou des changements de service qui ne sont pas annoncés.",
    correct:"D"
  }
};
const output=[];
for(const [number,edit] of Object.entries(revisions)){
 const id=String(number).padStart(2,'0');
 const source=JSON.parse(await readFile('supabase/exams/tcf-listening-test'+id+'.json','utf8'));
 const q=structuredClone(source.questions[24]);
 assert.equal(q.number,25);
 assert.equal(q.correct,edit.correct);
 assert(q.transcript.includes(edit.before),'Source drift in Test'+id);
 const clips=q.segments.filter(s=>s.text.includes(edit.before));
 assert.equal(clips.length,1,'Must replace one spoken segment');
 const oldHash=createHash('sha256').update(JSON.stringify(q.segments)).digest('hex');
 clips[0].text=clips[0].text.replace(edit.before,edit.after);
 q.transcript=q.segments.map(s=>s.text).join('\n');
 assert(!q.transcript.includes(edit.before));
 assert(q.transcript.includes(edit.after));
 q.question=edit.question;
 q.segments.at(-1).text=edit.question;
 q.transcript=q.segments.map(s=>s.text).join('\n');
 q.options=edit.options;
 q.explanation=edit.explanation;
 assert.equal(q.options.length,4);
 assert.equal(new Set(q.options).size,4);
 assert.equal(q.correct,source.questions[24].correct);
 assert.equal(q.slotSeconds,source.questions[24].slotSeconds);
 const newHash=createHash('sha256').update(JSON.stringify(q.segments)).digest('hex');
 assert.notEqual(newHash,oldHash);
 // Do not carry forward the old measured duration or claim a valid audio asset.
 delete q.audioSeconds;
 delete q.audio;
 q.audioStatus='RERECORD_REQUIRED';
 q.sourceVersion=source.version;
 q.previousSegmentsSha256=oldHash;
 q.targetSegmentsSha256=newHash;
 output.push({test:Number(number),question:25,correction:q});
}
await mkdir('work/tcf-listening-15-20-v2/editorial',{recursive:true});
await writeFile('work/tcf-listening-15-20-v2/editorial/q25-audio-corrections.json',JSON.stringify({state:'UNRECORDED_DO_NOT_PUBLISH',items:output},null,2)+'\n');
console.log(JSON.stringify({state:'UNRECORDED_DO_NOT_PUBLISH',corrections:output.map(x=>({test:x.test,question:25,correct:x.correction.correct,sourceVersion:x.correction.sourceVersion,oldDurationInvalidated:true}))},null,2));

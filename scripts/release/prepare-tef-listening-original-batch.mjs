import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const number=Number(process.argv[2]);
assert(Number.isInteger(number)&&number>=2&&number<=7,'Expected test number 2-7');
const nn=String(number).padStart(2,'0');
const questionsA=(await import('../../curriculum/tef-listening-test'+nn+'-original-q01-20.mjs'))['questions'+nn+'a'];
const questionsB=(await import('../../curriculum/tef-listening-test'+nn+'-original-q21-40.mjs'))['questions'+nn+'b'];
import {QUESTION_KINDS,PAIRED_STARTS,PAIRED_SECONDS,previewSeconds,validateDraft,normalizeSource} from '../../curriculum/tef-listening-02-07-authoring-contract.mjs';
const baseline=JSON.parse(await readFile('supabase/exams/tef-listening-test01-v3.json','utf8'));
const authored=[...questionsA,...questionsB];
assert.equal(authored.length,40);
const id='tef-listening-'+nn,version='tef-listening-2026-11-test'+nn+'-v1',root='assets/tef-listening/'+version;
const paper={id,version,title:'TEF Listening · Test '+nn,seconds:2400,questions:[]};
const pairStarts=new Map(PAIRED_STARTS.map(n=>[n+1,n]));
const normalize=transcript=>transcript.trim().split(/\n(?=—\s)/u).map(x=>x.replace(/^—\s*/u,'').trim()).filter(Boolean);
for(let i=0;i<40;i++){
 const n=i+1,a=authored[i],base=baseline.questions[i],start=pairStarts.get(n)||n;
 const transcript=a.transcript.trim(),textSegments=normalize(transcript);
 assert(textSegments.length>0,'empty spoken section '+n);
 const q={
   number:n,kind:QUESTION_KINDS[i],question:a.question,options:a.options,
   correct:a.correct,explanation:a.explanation,transcript,
   segments:textSegments.map((text,i)=>({voice:i%2?'male':'female',text})),
   audio:'q-'+String(start).padStart(2,'0')+'.mp3',
   audioSeconds:0,
   slotSeconds:base.slotSeconds,
   previewSeconds:previewSeconds(n)
 };
 if(n<=4)q.image='q-'+String(n).padStart(2,'0')+'.svg';
 if(PAIRED_STARTS.includes(n)){q.groupStart=n;q.groupEnd=n+1}
 if(PAIRED_SECONDS.has(n)){q.groupStart=start;q.groupEnd=n;q.slotSeconds=0}
 paper.questions.push(q);
}
for(const first of PAIRED_STARTS){
 const a=paper.questions[first-1],b=paper.questions[first];
 assert.equal(a.transcript,b.transcript,'paired audio needs exact same recording '+first);
 assert.deepEqual(a.segments,b.segments);
}
assert.equal(paper.questions.reduce((s,q)=>s+q.slotSeconds,0),2400);
const priorSources=baseline.questions.filter(q=>q.slotSeconds>0).map(q=>normalizeSource(q.transcript));
const report=validateDraft(paper,priorSources);
if(report.errors.length)throw Error('Test '+nn+' original authoring validation failed: '+JSON.stringify(report.errors));
if(Object.values(report.keys).some(n=>n!==10))throw Error('Unbalanced keys in Test '+nn+': '+JSON.stringify(report.keys));
await mkdir(root+'/images',{recursive:true});
await mkdir(root+'/audio',{recursive:true});
const imageSets={
  '02':[
   [['🪑','✏️','🏺','🔧'],['Atelier de meubles','Fournitures scolaires','Atelier de poterie','Service de réparation']],
   [['⛴️','✈️','🚠','🚌'],['Terminal maritime','Aéroport régional','Station de ski','Autocar touristique']],
   [['🎬','🧪','🗿','🔭'],['Salle de cinéma','Laboratoire','Exposition de sculptures','Observation des étoiles']],
   [['🥖','🐟','🥩','🍎'],['Boulangerie','Poissonnerie','Boucherie','Marché de fruits']]
  ],
  '03':[
   [['📗','🖨️','🎨','🖼️'],['Reliure artisanale','Imprimerie de quartier','Fournitures scolaires','Galerie de tableaux']],
   [['🚢','🚂','✈️','🛶'],['Bateau de croisière','Train touristique','Hall d’aéroport','Location de kayaks']],
   [['🧗','🤸','🎢','💃'],['Salle d’escalade','Salle de gymnastique','Parc couvert','École de danse']],
   [['🏕️','🧳','⛺','🌳'],['Magasin de sport','Hall d’hôtel','Location de camping','Réservation de parc']]
  ],
  '04':[
   [['🥖','🐠','🛠️','🍇'],['Atelier de boulangerie','Aquarium','Réparation de scooter','Visite viticole']],
   [['🎼','🐠','🩺','🎭'],['Salle de musique','Aquarium marin','Centre de santé','Salle de théâtre']],
   [['🏍️','🚲','🔧','⛽'],['Atelier de motos','Station de vélos','Garage de réparation','Station-service']],
   [['🏞️','🍷','🏭','🌻'],['Parc naturel','Centre viticole','Usine agroalimentaire','Jardin botanique']]
  ],
  '05':[
   [['👓','💊','🎨','📚'],['Opticien','Pharmacie','Atelier de peinture','Librairie']],
   [['📮','🏦','🚂','🛳️'],['Bureau de poste','Banque','Gare','Terminal de ferry']],
   [['💒','🏢','🎟️','🏨'],['Service des mariages','Bureau du logement','Billeterie','Accueil d’hôtel']],
   [['🧵','👞','🧼','🪴'],['Atelier textile','Cordonnerie','Pressing','Pépinière']]
  ],
  '06':[
   [['🛥️','🚌','✈️','🚇'],['Guichet du port','Gare routière','Aéroport','Métro']],
   [['👗','🪡','🎨','📦'],['Boutique de vêtements','Atelier de couture','Galerie','Centre de livraison']],
   [['🎥','🏟️','🎺','🎪'],['Cinéma','Stade','Salle de musique','Chapiteau']],
   [['🧀','🐟','🥬','🍞'],['Fromagerie','Poissonnerie','Marché maraîcher','Boulangerie']]
  ],
  '07':[
   [['🎙️','🗞️','📸','🎧'],['Studio de radio','Rédaction','Studio photo','Magasin audio']],
   [['🏋️','🏊','🏃','🧗'],['Salle de sport','Piscine','Stade','Salle d’escalade']],
   [['🗣️','📚','🎓','🧮'],['École de langues','Bibliothèque','Université','Cours de mathématiques']],
   [['🖼️','⌚','📱','🧵'],['Galerie','Horlogerie','Réparation de téléphones','Atelier textile']]
  ]
};
const icons=imageSets[nn].map(x=>x[0]),titleSets=imageSets[nn].map(x=>x[1]);
const escapes=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(let n=1;n<=4;n++){
 const x=icons[n-1],t=titleSets[n-1];
 let svg='<svg xmlns="http://www.w3.org/2000/svg" width="820" height="520" viewBox="0 0 820 520" role="img" aria-label="Quatre scènes A à D"><rect width="820" height="520" fill="#ffffff"/>';
 for(let i=0;i<4;i++){
  const left=28+(i%2)*396,top=24+Math.floor(i/2)*239;
  const palette=['#e6f3f7','#fff0e3','#e5f3e6','#f2ebff'][i];
  svg+=`<rect x="${left}" y="${top}" width="375" height="220" rx="20" fill="${palette}" stroke="#51677d" stroke-width="2"/><text x="${left+72}" y="${top+111}" text-anchor="middle" font-size="64">${x[i]}</text><text x="${left+152}" y="${top+84}" font-family="Arial,sans-serif" font-size="30" font-weight="bold" fill="#273f54">${'ABCD'[i]}</text><foreignObject x="${left+151}" y="${top+105}" width="210" height="93"><div xmlns="http://www.w3.org/1999/xhtml" style="font:19px Arial,sans-serif;color:#273f54;line-height:1.3;overflow-wrap:break-word">${escapes(t[i])}</div></foreignObject>`;
 }
 svg+='</svg>';
 await writeFile(root+'/images/q-'+String(n).padStart(2,'0')+'.svg',svg);
}
await writeFile('supabase/exams/tef-listening-test'+nn+'-v1.json',JSON.stringify(paper,null,2)+'\n');
await writeFile(root+'/AUTHORING-REPORT.json',JSON.stringify({state:'EDITORIAL_DRAFT_AUDIO_UNRENDERED',questions:40,uniqueRecordings:36,keys:report.keys,errors:report.errors,warnings:report.warnings,source:'original Test '+nn+' scripts',qualityNote:'Do not treat validation or unreviewed text as independent linguistic QA'},null,2)+'\n');
console.log(JSON.stringify({draft:id,status:'UNRELEASED',questions:40,recordings:36,keys:report.keys,warnings:report.warnings},null,2));

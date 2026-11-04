import {speakFrench} from './a0-ui.js';

// A focused reading workspace. A draft is a draft even when it is published;
// longer passages and certified CEFR assessments require separate editorial QA.
export function countFrenchWords(value) {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed.split(/\s+/u).filter(token => /[\p{L}\p{N}]/u.test(token)).length : 0;
}
export function readingGuidance(level) {
  const guides = {
    A0: 'Find familiar words, names, and greetings. Read aloud once.',
    A1: 'Identify people, places, and the main action. Notice present-tense verbs.',
    A2: 'Find the sequence of events, useful time expressions, and the main idea.',
    B1: 'Distinguish context, key events, and the speaker’s point of view.',
    B2: 'Identify the argument, supporting evidence, and contrasting viewpoints.',
    C1: 'Trace implicit assumptions, rhetorical choices, and the author’s stance.',
    C2: 'Examine connotation, ambiguity, register, and possible rival interpretations.'
  };
  return guides[level] || guides.A1;
}
export function renderReadingWorkshop(target, reading, level='A0') {
  if (!reading || typeof reading.french !== 'string' || !reading.french.trim()) return;
  const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);return node;};
  const panel=el('section');panel.className='hz-reading-workshop';
  panel.setAttribute('aria-label',level+' guided reading');
  const kicker=el('p','GUIDED READING · '+level);kicker.className='hz-reading-kicker';
  const title=el('h4',reading.title || 'Reading practice');
  const instructions=el('p',readingGuidance(level));instructions.className='hz-reading-guidance';
  const french=el('p',reading.french);french.lang='fr';french.className='hz-reading-french';
  const actions=el('div');actions.className='hz-reading-actions';
  const status=el('span');status.setAttribute('role','status');status.className='hz-reading-status';
  const play=el('button','🔊 Listen to the passage');play.type='button';play.className='hz-practice-button';
  play.addEventListener('click',()=>speakFrench(reading.french,play,status,.86));
  const slow=el('button','Play slowly');slow.type='button';slow.className='hz-practice-button is-secondary';
  slow.addEventListener('click',()=>speakFrench(reading.french,slow,status,.72));
  actions.append(play,slow);
  const translation=el('details');translation.className='hz-reading-translation';
  translation.append(el('summary','Show English support after reading'));
  translation.append(el('p',reading.english || 'An English translation is not available yet.'));
  const reflection=el('details');reflection.className='hz-reading-reflection';
  reflection.append(el('summary','Reflect on the passage'));
  const prompts=el('ol');
  const questions=Array.isArray(reading.comprehension_prompts) && reading.comprehension_prompts.length
    ? reading.comprehension_prompts
    : ['Summarize the central idea in your own French words.',
       'Find two expressions that support your interpretation.',
       'Retell or challenge one idea without copying the original wording.'];
  for (const prompt of questions) prompts.append(el('li',prompt));
  reflection.append(prompts);
  const count=countFrenchWords(reading.french);
  const lengthNote=reading.length_target_met === true
    ? 'Extended editorial draft — not independently CEFR-assessed'
    : reading.cefr_length_met === true ? 'Length target marked as met'
    : 'Short practice text — not a full-length CEFR reading';
  const meta=el('p',count+' French words · '+lengthNote);
  meta.className='hz-reading-meta';
  panel.append(kicker,title,instructions,french,actions,status,translation,reflection,meta);
  target.append(panel);
}

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync('src/exams/tcf-speaking/ui.js','utf8');
const css=readFileSync('src/styles/academy.css','utf8');
const home=ui.split(' if(!attempt){\n  const papers=')[1]?.split(' }else if(attempt.phase===1){')[0];

test('TCF home is a clean test selector with history in its own accessible tab',()=>{
 assert(home,'TCF catalog must have a standalone home renderer');
 assert(home.includes("role','tablist"));
 assert(home.includes("role','tab'"));
 assert(home.includes("role','tabpanel"));
 assert(home.includes("aria-selected"));
 assert(home.includes("makeTab('tests','Choose a test')"));
 assert(home.includes("makeTab('history','My test history"));
 assert(home.includes("if(catalogTab==='history'){"));
 assert(home.includes("if(!catalog.history?.length)"));
 assert(home.includes("else{\n    panel.append(el('span','20 SPEAKING TESTS'"));
 const historyStart=home.indexOf("if(catalogTab==='history'){");
 const selectorStart=home.indexOf("else{\n    panel.append(el('span','20 SPEAKING TESTS'");
 const historyButtons=home.indexOf("for(const row of catalog.history)");
 assert(historyStart>=0&&historyButtons>historyStart&&historyButtons<selectorStart,
  'Saved attempts must be rendered ONLY inside the History tab');
 assert(home.includes("'hz-tcf-speaking-history-item'"));
 assert(home.includes("'hz-tcf-speaking-history-state'"));
 assert(!home.includes("for(const row of catalog.history)area.append(button("),
  'Never append a wall of history buttons to the selector');
 assert(home.includes("event.key==='ArrowLeft'")||home.includes("'ArrowLeft','ArrowRight'"),
  'Tabs should support keyboard navigation');
});

test('TCF selected paper opens a Start button, then untimed preflight before attempting the exam',()=>{
 assert(home.includes("const startButton=button('Start Test '+selected.id.slice(-2),()=>{preflight=true;render()},false)"));
 assert(home.includes("select.onchange=()=>{selectedTestId=select.value;startButton.textContent='Start Test '+selectedTestId.slice(-2)}"));
 assert(home.includes("if(preflight){"));
 assert(home.includes("intro.dataset.tcfPreflight='true'"));
 assert(home.includes("'Read the instructions before you begin'"));
 assert(home.includes("'Your exam has not started. Take as much time as you need to read these instructions.'"));
 assert(home.includes("['Task 2 · Information gathering',['2 minutes preparation (no microphone)','Then 3 minutes 30 seconds speaking']]"));
 assert(home.includes("['Task 1 · Interview',['2 minutes speaking','No preparation']]"));
 assert(home.includes("['Task 3 · Opinion',['4 minutes 30 seconds speaking','No preparation']]"));
 assert(!home.includes("['Task 2 · Conversation'"),'Preparation and conversation must not be separate task cards');
 assert(!home.includes("item.classList.add('is-preparation')"),'Task 2 should not be orange or highlighted differently');
 assert(!css.includes('.hz-tcf-speaking-timing-item.is-preparation'),'All three tasks must use matching neutral card styles');
 const tasks=home.split("   const steps=[")[1]?.split("   ];")[0]||'';
 assert.equal((tasks.match(/\['Task [123] ·/g)||[]).length,3,'Instructions must display exactly three task cards');
 assert(home.includes("Task 2 includes 2 minutes of preparation."));
 assert(home.includes("button('Start TCF Speaking Test '+selected.id.slice(-2)"));
 const selectionBranch=home.slice(home.indexOf("const startButton="),home.indexOf("   area.append(panel);"));
 assert(!selectionBranch.includes("kind:'start'"),'Clicking first Start must not create a timed attempt');
 assert(selectionBranch.includes("preflight=true;render()"),'First Start must display instructions');
 const preflightStart=home.slice(home.indexOf("if(preflight){"),home.indexOf("}else{\n   // History"));
 assert(preflightStart.includes("voice().unlock()"));
 assert(preflightStart.includes("store.send({kind:'start'"));
 assert(preflightStart.indexOf("voice().unlock()")<preflightStart.indexOf("await microphone().prepare()"));
 assert(preflightStart.includes("button('Back to test selection'"));
});

test('TCF Task 2 still receives server-controlled 120-second preparation separate from instruction preflight',()=>{
 assert(ui.includes("else if(attempt.phase===1)"));
 assert(ui.includes("prep.dataset.tcfPreparation='true'"));
 assert(ui.includes("progress.max=120"));
 assert(ui.includes("if(n===0&&!switching&&!busy&&!attempt.pending)"));
 assert(ui.includes("switching=true;clearInterval(timer);advance()"));
 const source=readFileSync('supabase/functions/academy-tcf-speaking/test.js','utf8');
 assert(source.includes("name:'Task 2 · Preparation',seconds:120"));
 assert(source.includes("name:'Task 2 · Information role-play',seconds:210"));
});

test('TCF home design remains compact and responsive on phone screens',()=>{
 for(const cls of ['hz-tcf-speaking-tabs','hz-tcf-speaking-tab','hz-tcf-speaking-panel',
  'hz-tcf-speaking-history','hz-tcf-speaking-history-item','hz-tcf-speaking-preflight',
  'hz-tcf-speaking-three-tasks','hz-tcf-speaking-select-field']){
  assert(css.includes(cls),cls+' style missing');
 }
 assert(css.includes('@media(max-width:520px)'));
 assert(css.includes("hz-tcf-speaking-history-item{grid-template-columns:1fr"));
});

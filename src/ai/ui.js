import {formatCredits,creditLabel} from './credit-scale.js';
import {makeAiStore} from './store.js';
import {mountRecorder} from './audio.js';
import {pronunciationPhrases,nextPronunciationPhrase,validPronunciationPhrase,pronunciationWordCount} from './pronunciation-practice.js';
import {recordHome,recordView} from '../ui/navigation.js';
const LEVELS=['A0','A1','A2','B1','B2','C1','C2'];
const trainers={
 pronunciation:['mic','Pronunciation trainer','Speak with clearer French pronunciation.',['Listen to a French practice example','Record your own voice','Get feedback on sounds, rhythm and liaison'],'review','Speak & improve'],
 conversation:['chat','Written roleplays','Practise real-life French through interactive written conversations.',['Choose a realistic situation','Type your French responses','Get corrections and explanations after every reply'],'reply','Start roleplay'],
 writing:['pen','Writing trainer','Make your French writing more natural and accurate.',['Get a corrected version of your text','Understand grammar and word-choice errors','Apply practical improvement tips'],'review','Review your writing']
};
const tutor=['book','HZad French Tutor','Get help whenever you have a French question.',['Translate words, phrases and sentences','Understand grammar and conjugation','Ask follow-up questions and get examples'],'message','Open French tutor'];
const iconPaths={
 mic:['M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z','M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M9 22h6'],
 chat:['M20 11a7 7 0 0 1-7 7H7l-4 3v-7a7 7 0 0 1 7-10h3a7 7 0 0 1 7 7Z','M8 11h.01M12 11h.01M16 11h.01'],
 pen:['M4 20h5l11-11-5-5L4 15v5ZM13 6l5 5','M4 22h16'],
 book:['M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2ZM12 6v15','M5 9h3M16 9h3M5 13h3M16 13h3'],
 wallet:['M3 6h16a2 2 0 0 1 2 2v11H3a1 1 0 0 1-1-1V6l3-3h13','M21 10h-6a2 2 0 0 0 0 4h6M16 12h.01']
};
function studioIcon(kind){
 const wrapper=el('span',undefined,'hz-studio-icon hz-studio-icon-'+kind);wrapper.setAttribute('aria-hidden','true');
 if(!document.createElementNS){wrapper.textContent={mic:'◉',chat:'◌',pen:'✎',book:'▤',wallet:'▣'}[kind];return wrapper}
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round'}))svg.setAttribute(k,v);
 for(const d of iconPaths[kind]){const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);svg.append(p)}
 wrapper.append(svg);return wrapper;
}
const scenarios={cafe:'At a café',travel:'Travel and directions',daily:'Daily life',work:'At work',interview:'Job interview',debate:'Ideas and debate',custom:'Custom scenario'};
const phrases=Object.fromEntries(Object.entries(pronunciationPhrases).map(([level,bank])=>[level,bank[0]]));
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(label,fn,alt=false)=>{const b=el('button',label,'hz-btn'+(alt?' hz-btn-alt':''));b.type='button';b.addEventListener('click',fn);return b};
export function wireAiLearning(root,client,{fetcher,recorderFactory=mountRecorder}={}){
 const area=root.querySelector('#hz-ai-learning'),launch=root.querySelector('#hz-ai-launch'),chooser=root.querySelector('#hz-course-chooser');
 if(!area||!launch)return;
 const store=makeAiStore(client,fetcher);
 let state={tab:'home',level:'A0',scenario:'cafe',customScenario:'',snapshot:null,walletStale:false,drafts:{},pronunciationRuns:{},conversation:null,result:null,pending:null},epoch=0,busy=false,requestController=null,recorder=null,viewer=null,pollTimer=null,pollCount=0;
 const draftKey=()=>state.tab+':'+state.level;
 function clear(){clearTimeout(pollTimer);pollTimer=null;pollCount=0;epoch++;busy=false;requestController?.abort();requestController=null;recorder?.dispose();recorder=null;globalThis.speechSynthesis?.cancel();area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden')}
 function reset(){clear();state={tab:'home',level:'A0',scenario:'cafe',customScenario:'',snapshot:null,walletStale:false,drafts:{},pronunciationRuns:{},conversation:null,result:null,pending:null}}
 root.addEventListener('hzad-route-reset',clear);root.addEventListener('hzad-clear-lessons',reset);root.addEventListener('hzad-close-ai',clear);
 client.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT'){viewer=null;reset()}else if(session?.user?.id){if(viewer&&viewer!==session.user.id)reset();viewer=session.user.id}});
 const status=(text,error=false)=>{const n=el('p',text,'hz-ai-status');n.setAttribute('role',error?'alert':'status');area.append(n);return n};
 const remember=()=>{const tab=state.tab,level=state.level,id=state.conversation?.id;recordView(root,'ai:'+tab+':'+(id||level),()=>open(tab,{level,conversationId:tab==='conversation'?id:null}))};
 async function run(work){
  if(busy)return;busy=true;const ticket=epoch;requestController=new AbortController();
  area.querySelectorAll('button,input,textarea,select').forEach(n=>{n.disabled=true});
  area.querySelectorAll('.hz-ai-status').forEach(n=>n.remove());const progress=status('Working on your AI practice…');
  const slow=setTimeout(()=>{if(ticket===epoch)progress.textContent='Still processing. Your request is being checked; you will not be charged twice.'},15000);
  try{await work(requestController.signal,()=>ticket===epoch)}catch(error){if(ticket===epoch){render();status(error.name==='AbortError'?'Connection interrupted. Check saved activity before starting again.':error.message||'AI Learning could not connect.',true)}}
  finally{clearTimeout(slow);progress.remove();if(ticket===epoch){busy=false;requestController=null;renderControls();if(state.pending?.kind==='conversation')schedulePending()}}
 }
 function schedulePending(){clearTimeout(pollTimer);if(!state.pending||pollCount>=20)return;const id=state.pending.id,ticket=epoch;pollTimer=setTimeout(()=>{if(ticket!==epoch||state.pending?.id!==id)return;if(busy){schedulePending();return}pollCount++;void run(async(signal,current)=>{try{const result=await store.activity(id,signal);if(current())await receive(result,signal,current)}catch(error){if(current()){render();status('Still retrieving the saved reply. No extra credits are charged.')}}})},2000)}
 function renderControls(){
  area.querySelectorAll('button,input,textarea,select').forEach(n=>{n.disabled=busy||n.dataset.locked==='true'});
 }
 async function load(signal){const snapshot=await store.state(signal);if(!snapshot||!snapshot.activities||!Array.isArray(snapshot.history))throw Error('Your AI practice could not load.');return snapshot}
 async function open(tab='home',options={}){
  root.dispatchEvent(new CustomEvent('hzad-route-reset'));
  state.tab=tab;state.level=options.level||state.level;state.snapshot=null;
  if(tab==='conversation'&&!options.conversationId&&state.conversation?.level!==state.level)state.conversation=null;
  chooser.classList.add('hz-hidden');render();
  await run(async(signal,current)=>{
   const snapshot=await load(signal);let conversation=null;
   if(options.conversationId)conversation=await store.conversation(options.conversationId,signal);
   if(!current())return;state.snapshot=snapshot;state.walletStale=false;
   if(conversation){state.conversation=conversation;state.level=conversation.level;state.scenario=conversation.scenario.startsWith('custom:')?'custom':conversation.scenario;state.customScenario=conversation.scenario.startsWith('custom:')?conversation.scenario.slice(7):''}
   render();
  });
 }
 function creditButton(label,fn){
  const activity=state.snapshot?.activities[state.tab],credits=activity?.credits;
  const b=button(Number.isSafeInteger(credits)?`${label} · ${creditLabel(credits)}`:label,fn);
  const wallet=state.snapshot?.wallet;
  b.dataset.locked=String(state.walletStale||!state.snapshot?.enabled||!activity?.enabled||!Number.isSafeInteger(credits)||!wallet||wallet.available<credits||!wallet.budgetAvailable||Date.parse(wallet.expiresAt)<=Date.now()||!!state.pending||!!state.conversation?.busy&&state.tab==='conversation');
  b.disabled=b.dataset.locked==='true';return b;
 }
 function speak(text){
  const speech=globalThis.speechSynthesis,voice=speech?.getVoices().find(v=>/^fr(?:[-_]|$)/i.test(v.lang));
  if(!speech||!globalThis.SpeechSynthesisUtterance){status('Enable speech playback in your browser.');return}
  try{speech.cancel();const audio=new SpeechSynthesisUtterance(text);audio.lang='fr-FR';if(voice)audio.voice=voice;audio.rate=.9;speech.speak(audio);speech.resume?.()}catch{status('Speech playback was unavailable.')}
 }
 function corrections(items,parent){
  if(!items?.length){parent.append(el('p','Keep going—no specific corrections in this response.'));return}
  const list=el('div',undefined,'hz-ai-corrections');
  for(const item of items){const card=el('article',undefined,'hz-ai-feedback-card');card.append(el('p',item.original,'hz-ai-original'),el('p',item.corrected,'hz-ai-corrected'),el('p',item.explanation));list.append(card)}parent.append(list);
 }
 function feedback(result,kind=state.tab){
  if(!result)return;
  const block=el('section',undefined,'hz-ai-feedback');block.append(el('h4','Your feedback'));
  if(kind==='writing'){
   block.append(el('p',result.summary),el('h5','Improved French'),el('p',result.correctedText,'hz-ai-corrected-text'),el('h5','Corrections explained'));corrections(result.corrections,block);
   const list=el('ul');for(const s of result.suggestions)list.append(el('li',s));block.append(el('h5','Try this next'),list);
  }else if(kind==='pronunciation'){
   if(state.result?.reviewedReference)block.append(el('p','Reviewed sentence: '+state.result.reviewedReference,'hz-small'));
   block.append(el('p',result.feedback));if(result.heardText)block.append(el('p','Heard: '+result.heardText));
   const strengths=el('ul');for(const s of result.strengths)strengths.append(el('li',s));block.append(strengths);
   for(const focus of result.focus){const card=el('article',undefined,'hz-ai-feedback-card');card.append(el('h5',focus.sound),el('p',focus.example,'hz-ai-corrected'),el('p',focus.tip));block.append(card)}
   if(!state.result?.nextPronunciation&&validPronunciationPhrase(result.practicePhrase))block.append(el('h5','Suggested practice'),el('p',result.practicePhrase,'hz-ai-practice-phrase'),button('Hear practice phrase',()=>speak(result.practicePhrase),true));
  }else{
   appendRoleplayFeedback(block,result);
  }
  area.append(block);
 }
 function appendRoleplayFeedback(parent,result){
  if(!result?.transcript)return;
  const card=el('section',undefined,'hz-roleplay-feedback');
  card.append(el('h5','Your French feedback'));
  if(result.correctedReply)card.append(el('p','Better French','hz-small'),el('p',result.correctedReply,'hz-ai-corrected'));
  if(result.feedback)card.append(el('p',result.feedback));
  if(result.corrections?.length){card.append(el('h5','Corrections explained'));corrections(result.corrections,card)}
  else if(!result.feedback)card.append(el('p','No specific correction was saved for this reply.'));
  parent.append(card);
 }
 async function receive(response,signal,current){
  if(!current())return;
  if(response.status==='completed'){
   const completed=state.pending;
   const kind=completed?.kind||response.kind||state.tab;
   state.result={kind,data:response.result,conversationId:response.conversationId,requestId:response.id||completed?.id};if(kind==='conversation'&&completed?.payload?.text)state.drafts['conversation:'+state.level]='';
   if(kind==='pronunciation'&&completed&&response.result){
    const level=completed.payload?.level||response.level||state.level;
    const key='pronunciation:'+level;
    const session=state.pronunciationRuns[level]||{completed:0,used:[],lastId:null};
    const submitted=completed.payload?.reference??state.drafts[key]??phrases[level];
    if(session.lastId!==completed.id){
     session.used.push(submitted);
     const next=nextPronunciationPhrase(level,submitted,response.result.practicePhrase,session.used);
     state.drafts[key]=next;session.completed++;session.lastId=completed.id;session.lastReference=submitted;
     state.pronunciationRuns[level]=session;
    }
    state.result.reviewedReference=session.lastReference;
    state.result.nextPronunciation=true;
    state.tab='pronunciation';state.level=level;
   }
   state.pending=null;clearTimeout(pollTimer);pollCount=0;
   if(response.conversationId){const previous=state.conversation?.id===response.conversationId?state.conversation:null;const messages=[...(previous?.messages||[])];messages.push({role:'user',content:response.result?.transcript||'[Conversation started]'},{role:'assistant',content:response.result?.reply||''});state.conversation={id:response.conversationId,level:state.level,scenario:completed?.payload?.scenario||previous?.scenario||state.scenario,messages,busy:false};}
   if(!current())return;

  }else if(response.status==='failed')state.pending=null;
  else if(state.pending?.kind==='conversation'){render();return}
  if(!current())return;
  // Refresh the balance after displaying the completed response.
  state.walletStale=true;render();
  try{const snapshot=await load(signal);if(!current())return;state.snapshot=snapshot;state.walletStale=false;render()}
  catch{if(!current())return;status('Feedback is saved. Refresh balance before starting another paid review.',true)}
  if(response.status==='failed'){status('This activity could not complete. Your credits were returned.',true);}
  else if(response.status!=='completed')status('Your written reply is being retrieved automatically. No extra credits are charged.');
 }
 async function send(payload,signal,current){
  try{
   let response=await store.submit(payload,signal);
   // A processing response is not a new submission. Check the existing request.
   if(current()&&['processing','reserved','dispatched'].includes(response.status)){
    try{response=await store.activity(payload.id,signal)}catch{}
   }
   await receive(response,signal,current);
  }
  catch(error){
   if(!current())return;
   if(error.activityStatus==='failed'||[400,401,403,409,413].includes(error.status)){
    state.pending=null;state.walletStale=true;try{const snapshot=await load(signal);if(current()){state.snapshot=snapshot;state.walletStale=false}}catch{}
   }else{
    // Lost connection is ambiguous: recover by the same request ID, never charge again.
    try{const saved=await store.activity(payload.id,signal);if(current()){await receive(saved,signal,current);return}}catch{}
   }
   throw error;
  }
 }
 function submit(){
  if(busy||state.pending||state.walletStale)return;
  if(recorder?.isRecording?.()){status('Stop your recording before sending it.',true);return}
  const input={id:crypto.randomUUID(),kind:state.tab,level:state.level,expectedCredits:state.snapshot?.activities[state.tab]?.credits};
  if(state.tab==='writing'){input.text=(state.drafts[draftKey()]||'').trim();if(!input.text){status('Write a French response first.',true);return}}
  if(state.tab==='pronunciation'){input.reference=state.drafts[draftKey()]??phrases[state.level];if(!validPronunciationPhrase(input.reference)){status('Use a French practice sentence containing one to nine words.',true);return}input.audio=recorder?.getAudio();if(!input.audio){status('Record the French sentence first.',true);return}}
  if(state.tab==='conversation'){
   input.scenario=state.conversation?.scenario||(state.scenario==='custom'?'custom:'+state.customScenario.trim():state.scenario);input.conversationId=state.conversation?.id||null;
   if(state.scenario==='custom'&&!state.customScenario.trim()){status('Describe your preferred situation first.',true);return}
   if(!input.conversationId){input.start=true}else{input.text=(state.drafts[draftKey()]||'').trim();if(!input.text){status('Type your French reply first.',true);return}}
  }
  pollCount=0;state.pending={id:input.id,kind:input.kind,payload:input};
  if(input.kind==='conversation')render();void run((signal,current)=>send(input,signal,current));
 }
 function pending(){
  if(!state.pending)return;
  const block=el('div',undefined,'hz-ai-pending');if(state.pending.kind==='conversation'&&pollCount<20){block.append(el('p',busy?'Processing your written reply…':'Automatically checking your saved reply…'));area.append(block);return}block.append(el('p','Check this activity before starting another.'));
  block.append(button('Check activity',()=>run(async(signal,current)=>receive(await store.activity(state.pending.id,signal),signal,current)),true));
  if(state.pending.payload)block.append(button('Retry same request',()=>run((signal,current)=>send(state.pending.payload,signal,current)),true));
  area.append(block);
 }
 function history(){
  const snapshot=state.snapshot;if(!snapshot)return;
  const detail=el('section',undefined,'hz-studio-history');detail.append(el('h4','Saved AI practice'),el('p','Revisit feedback or continue a previous conversation without starting a new paid activity.','hz-studio-muted'));
  const rows=el('div',undefined,'hz-studio-history-list');
  const entries=snapshot.history.filter(item=>Object.hasOwn(trainers,item.kind));
  for(const item of entries){
   const label={completed:'Completed',failed:'Try a new activity',reserved:'In progress',dispatched:'In progress'}[item.status]||'In progress';
   const title=`${trainers[item.kind]?.[1]||'AI activity'} · ${item.level} · ${new Date(item.createdAt).toLocaleDateString()} · ${label}`;
   const row=button(title,()=>{
    if(item.status==='completed'){
     state.tab=item.kind;state.level=item.level;state.result={kind:item.kind,data:item.result,conversationId:item.conversationId,requestId:item.id};
     if(item.kind==='conversation'&&item.conversationId){void open('conversation',{level:item.level,conversationId:item.conversationId});return}render();
    }else if(item.status!=='failed'){state.tab=item.kind;state.level=item.level;state.pending={id:item.id,kind:item.kind};render()}
   },true);row.classList.add('hz-studio-history-row');row.disabled=item.status==='failed';row.dataset.locked=String(item.status==='failed');rows.append(row);
  }
  if(!entries.length)rows.append(el('p','Your feedback will appear here after your first activity.','hz-studio-empty'));
  detail.append(rows);
  const conversations=snapshot.conversations||[];
  if(conversations.length){detail.append(el('h4','Continue a conversation'));for(const c of conversations)detail.append(button(`Resume ${c.level} · ${scenarios[c.scenario]||(c.scenario.startsWith('custom:')?'Custom scenario':'Conversation')}`,()=>open('conversation',{level:c.level,conversationId:c.id}),true))}
  area.append(detail);
 }
 function render(){
  recorder?.dispose();recorder=null;area.replaceChildren();area.classList.remove('hz-hidden');
  const top=el('div',undefined,'hz-studio-top');
  const back=button('← All levels',()=>{clear();recordHome(root)},true);back.classList.add('hz-studio-back');top.append(back);
  const nav=el('nav',undefined,'hz-studio-nav');nav.setAttribute('aria-label','AI trainers');
  const overview=button('Practice tools',()=>{state.tab='home';state.result=null;render()},true);overview.setAttribute('aria-current',state.tab==='home'?'page':'false');
  const saved=button('Saved practice',()=>{state.tab='history';state.result=null;render()},true);saved.setAttribute('aria-current',state.tab==='history'?'page':'false');nav.append(overview,saved);top.append(nav);area.append(top);
  const hero=el('header',undefined,'hz-ai-hero hz-studio-hero'),intro=el('div',undefined,'hz-studio-intro');
  const h=el('h3',state.tab==='home'?'French Practice Studio':state.tab==='history'?'Your practice history':trainers[state.tab][1]);h.tabIndex=-1;
  intro.append(el('p','HZAD FRENCH ACADEMY','hz-studio-kicker'),h,el('p',state.tab==='home'?'Real practice. Personal feedback. Build confidence in French, one skill at a time.':state.tab==='history'?'Keep learning from your previous work.':trainers[state.tab][2]));
  hero.append(intro);
  if(state.snapshot?.wallet){
   const snap=state.snapshot,w=snap.wallet,wallet=el('aside',undefined,'hz-studio-wallet'),head=el('div',undefined,'hz-studio-wallet-head');
   head.append(studioIcon('wallet'),el('span','Your AI credits'));wallet.append(head,el('strong',formatCredits(w.available),'hz-studio-credit-value'),el('span','credits available','hz-studio-credit-label'));
   if(w.reserved>0)wallet.append(el('span',w.reserved+' reserved','hz-studio-muted'));
   const expiry=new Date(w.expiresAt);if(Number.isFinite(expiry.getTime()))wallet.append(el('span','Valid until '+expiry.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}),'hz-studio-muted'));
   const refresh=button('Refresh balance',()=>void run(async(signal,current)=>{const next=await load(signal);if(current()){state.snapshot=next;state.walletStale=false;render()}}),true);refresh.classList.add('hz-studio-refresh');wallet.append(refresh);hero.append(wallet);
  }
  area.append(hero);
  if(!state.snapshot){area.append(el('p','Opening your AI practice…','hz-studio-empty'));remember();return}
  const snap=state.snapshot;
  if(!snap.enabled)status('AI Learning is being prepared. Please return soon.');
  else if(snap.wallet&&(Date.parse(snap.wallet.expiresAt)<=Date.now()||!snap.wallet.budgetAvailable||snap.wallet.available===0)){
   status('Your AI credit allowance is used. Purchase additional AI credits to continue.');
   let checkout;try{const url=new URL(snap.topUpUrl);if(url.protocol==='https:')checkout=url.href}catch{}
   if(checkout){const link=el('a','Purchase AI credits','hz-btn');link.href=checkout;link.target='_blank';link.rel='noopener noreferrer';area.append(link)}
   else status('Contact the academy to arrange a paid AI credit top-up.');
  }
  if(state.tab==='home'){
   const heading=el('div',undefined,'hz-studio-section-head');heading.append(el('h4','Choose a skill'),el('p','Each tool shows its credit cost before you begin.','hz-studio-muted'));area.append(heading);
   const cards=el('div',undefined,'hz-ai-cards hz-studio-grid');
   for(const [key,[icon,title,description,benefits,unit,cta]] of [...Object.entries(trainers),['tutor',tutor]]){
    const card=el('article',undefined,'hz-ai-card hz-studio-card hz-studio-card-'+key),topline=el('div',undefined,'hz-studio-card-top');
    const activity=snap.activities[key],cost=activity?.credits;
    topline.append(studioIcon(icon),el('span',Number.isSafeInteger(cost)?`${creditLabel(cost)} / ${unit}`:'Price unavailable','hz-studio-price'));card.append(topline,el('h4',title),el('p',description,'hz-studio-card-description'));
    const list=el('ul',undefined,'hz-studio-benefits');for(const benefit of benefits)list.append(el('li',benefit));card.append(list);
    const action=button(cta+' →',()=>{if(key==='tutor'){root.dispatchEvent(new CustomEvent('hzad-open-french-tutor'));return}state.tab=key;state.result=null;render()});action.classList.add('hz-studio-card-action');action.dataset.locked=String(!snap.enabled||!activity?.enabled);action.disabled=action.dataset.locked==='true';card.append(action);cards.append(card);
   }area.append(cards);
   const how=el('section',undefined,'hz-studio-how');how.append(el('h4','How your credits work'),el('p','All practice tools and the French Tutor share one credit balance. Displayed charges are maximum quotes; unused reserved credits are returned after a successful review when usage-based pricing is active. Opening tools, viewing saved feedback and checking your balance are free. Credits are deducted only for a new AI activity; failed activities return the credits.'));if(snap.testingCad)how.append(el('p',`Testing allowance: up to CAD $${Number(snap.testingCad).toFixed(2)}.`,'hz-studio-muted'));area.append(how);
  }else if(state.tab==='history'){
   history();
  }else{
   const levelLabel=el('label','French level','hz-studio-level'),level=el('select');level.setAttribute('aria-label','AI French level');for(const l of LEVELS){const o=el('option',l);o.value=l;level.append(o)}level.value=state.level;
   level.dataset.locked=String(!!state.pending);
   level.addEventListener('change',()=>{state.level=level.value;state.conversation=null;state.result=null;render()});levelLabel.append(level);area.append(levelLabel);
   const benefit=el('div',undefined,'hz-studio-exercise-summary');benefit.append(studioIcon(trainers[state.tab][0]),el('p',trainers[state.tab][3].join(' · ')));area.append(benefit);
   if(state.tab==='writing'){
    const label=el('label','Your French writing'),input=el('textarea');input.rows=8;input.maxLength=4000;input.required=true;input.setAttribute('aria-label','Your French writing');input.value=state.drafts[draftKey()]||'';
    const count=el('p',`${input.value.length}/4000 characters`,'hz-small');input.addEventListener('input',()=>{state.drafts[draftKey()]=input.value;count.textContent=`${input.value.length}/4000 characters`});label.append(input);area.append(label,count,creditButton('Review my writing',submit));
   }else if(state.tab==='pronunciation'){
    const completed=state.pronunciationRuns[state.level]?.completed||0;
    if(state.result?.kind==='pronunciation')feedback(state.result.data);
    const exercise=el('section',undefined,'hz-ai-pronunciation-next');
    exercise.append(el('p','EXERCISE '+(completed+1),'hz-studio-kicker'),el('h4',completed?'Next pronunciation exercise':'Your pronunciation exercise'),el('p',completed?'Listen to the new sentence, record yourself and submit for feedback when ready.':'Listen to the example, then record yourself reading the sentence.'));
    const label=el('label','Practice sentence'),reference=el('textarea');reference.rows=2;reference.maxLength=240;reference.setAttribute('aria-label','Practice sentence');reference.value=state.drafts[draftKey()]??phrases[state.level];reference.lang='fr';const wordCount=el('p',pronunciationWordCount(reference.value)+'/9 words','hz-small');reference.addEventListener('input',()=>{state.drafts[draftKey()]=reference.value;wordCount.textContent=pronunciationWordCount(reference.value)+'/9 words'});label.append(reference,wordCount);exercise.append(label,button('Hear French example',()=>speak(reference.value),true));
    recorder=recorderFactory(exercise);exercise.append(creditButton('Get pronunciation feedback',submit));area.append(exercise);
   }else{
    const label=el('label','Roleplay scenario'),scenario=el('select');scenario.setAttribute('aria-label','Conversation scenario');for(const [key,name] of Object.entries(scenarios)){const o=el('option',name);o.value=key;scenario.append(o)}scenario.value=state.scenario;scenario.dataset.locked=String(!!state.conversation||!!state.pending);scenario.addEventListener('change',()=>{state.scenario=scenario.value;render()});label.append(scenario);area.append(label);
    if(state.scenario==='custom'){const customLabel=el('label','Describe your situation'),custom=el('textarea');custom.rows=3;custom.maxLength=500;custom.placeholder='For example: I want to rent an apartment.';custom.value=state.customScenario||'';custom.dataset.locked=String(!!state.conversation||!!state.pending);custom.addEventListener('input',()=>{state.customScenario=custom.value});customLabel.append(custom);area.append(customLabel)}
    const log=el('div',undefined,'hz-ai-chat hz-roleplay-chat');log.setAttribute('role','log');log.setAttribute('aria-label','Written French roleplay');
    const entries=(snap.history||[]).filter(x=>x.kind==='conversation'&&x.status==='completed'&&x.conversationId===state.conversation?.id&&x.result?.transcript);
    const latest=state.result?.kind==='conversation'&&state.result.conversationId===state.conversation?.id?state.result:null;
    if(latest?.data?.transcript&&!entries.some(x=>x.id===latest.requestId))entries.push({id:latest.requestId,result:latest.data});
    entries.sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
    const used=new Set();let previousUser=null;
    for(const m of state.conversation?.messages||[]){
     if(m.role==='user'&&m.content==='[Conversation started]')continue;
     const bubble=el('article',undefined,'hz-ai-bubble '+(m.role==='assistant'?'is-partner':'is-learner'));bubble.append(el('strong',m.role==='assistant'?'French partner':'You'),el('p',m.content));log.append(bubble);
     if(m.role==='user')previousUser=m.content;
     else if(previousUser!==null){const index=entries.findIndex((x,i)=>!used.has(i)&&x.result.transcript===previousUser&&x.result.reply===m.content);if(index>=0){used.add(index);appendRoleplayFeedback(log,entries[index].result)}previousUser=null}
    }
    if(log.childNodes.length)area.append(log);
    if(latest?.data?.englishHelp){const help=el('details');help.append(el('summary','English translation of the latest partner reply'),el('p',latest.data.englishHelp));area.append(help)}
    const complete=(state.conversation?.messages?.length||0)>=24;
    if(!state.conversation){area.append(creditButton('Start roleplay',submit));}
    else if(!complete){
     const composer=el('section',undefined,'hz-roleplay-composer'),replyLabel=el('label','Your French reply'),input=el('textarea');input.rows=4;input.maxLength=2000;input.lang='fr';input.placeholder='Écrivez votre réponse en français…';input.setAttribute('aria-label','Your French reply');input.value=state.drafts[draftKey()]||'';input.dataset.locked=String(!!state.pending);
     const sendButton=creditButton('Send reply',submit);sendButton.classList.add('hz-roleplay-send');const allowed=sendButton.dataset.locked!=='true';const sync=()=>{state.drafts[draftKey()]=input.value;sendButton.dataset.locked=String(!allowed||!input.value.trim());sendButton.disabled=busy||sendButton.dataset.locked==='true'};input.addEventListener('input',sync);input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();if(!sendButton.disabled)submit()}});replyLabel.append(input);composer.append(replyLabel,sendButton);sync();area.append(composer);
    }else area.append(el('p','Roleplay complete. Start a new situation to continue.'));
    if(state.conversation){const fresh=button('New roleplay',()=>{state.conversation=null;state.result=null;state.drafts[draftKey()]='';render()},true);fresh.dataset.locked=String(!!state.pending);area.append(fresh)}

   }
   if(state.tab==='writing'&&state.result?.kind==='writing')feedback(state.result.data);
  }
  pending();remember();renderControls();
 }
 launch.addEventListener('click',()=>{if(!busy)void open()});
}

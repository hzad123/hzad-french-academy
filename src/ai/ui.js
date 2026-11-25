import {makeAiStore} from './store.js';
import {mountRecorder} from './audio.js';
import {recordHome,recordView} from '../ui/navigation.js';
const LEVELS=['A0','A1','A2','B1','B2','C1','C2'];
const trainers={
 pronunciation:['mic','Pronunciation trainer','Speak with clearer French pronunciation.',['Listen to a French practice example','Record your own voice','Get feedback on sounds, rhythm and liaison'],'review','Speak & improve'],
 conversation:['chat','Conversation simulator','Build confidence in everyday conversations.',['Practise realistic situations','Reply by typing or recording','Get corrections and suggested replies'],'reply','Start practising'],
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
const scenarios={cafe:'At a café',travel:'Travel and directions',daily:'Daily life',work:'At work',interview:'Job interview',debate:'Ideas and debate'};
const phrases={A0:'Bonjour, je m’appelle Camille.',A1:'Je voudrais un café et un croissant, s’il vous plaît.',A2:'Nous allons prendre le train demain matin.',B1:'Si j’avais plus de temps, je voyagerais davantage.',B2:'Il est essentiel que chacun puisse exprimer son opinion.',C1:'Quoi qu’il en soit, cette hypothèse mérite d’être approfondie.',C2:'Encore eût-il fallu que les circonstances s’y prêtassent.'};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(label,fn,alt=false)=>{const b=el('button',label,'hz-btn'+(alt?' hz-btn-alt':''));b.type='button';b.addEventListener('click',fn);return b};
export function wireAiLearning(root,client,{fetcher,recorderFactory=mountRecorder}={}){
 const area=root.querySelector('#hz-ai-learning'),launch=root.querySelector('#hz-ai-launch'),chooser=root.querySelector('#hz-course-chooser');
 if(!area||!launch)return;
 const store=makeAiStore(client,fetcher);
 let state={tab:'home',level:'A0',scenario:'cafe',snapshot:null,drafts:{},conversation:null,result:null,pending:null},epoch=0,busy=false,requestController=null,recorder=null,viewer=null;
 const draftKey=()=>state.tab+':'+state.level;
 function clear(){epoch++;busy=false;requestController?.abort();requestController=null;recorder?.dispose();recorder=null;globalThis.speechSynthesis?.cancel();area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden')}
 function reset(){clear();state={tab:'home',level:'A0',scenario:'cafe',snapshot:null,drafts:{},conversation:null,result:null,pending:null}}
 root.addEventListener('hzad-route-reset',clear);root.addEventListener('hzad-clear-lessons',reset);root.addEventListener('hzad-close-ai',clear);
 client.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT'){viewer=null;reset()}else if(session?.user?.id){if(viewer&&viewer!==session.user.id)reset();viewer=session.user.id}});
 const status=(text,error=false)=>{const n=el('p',text,'hz-ai-status');n.setAttribute('role',error?'alert':'status');area.append(n);return n};
 const remember=()=>{const tab=state.tab,level=state.level,id=state.conversation?.id;recordView(root,'ai:'+tab+':'+(id||level),()=>open(tab,{level,conversationId:tab==='conversation'?id:null}))};
 async function run(work){
  if(busy)return;busy=true;const ticket=epoch;requestController=new AbortController();
  area.querySelectorAll('button,input,textarea,select').forEach(n=>{n.disabled=true});
  area.querySelectorAll('.hz-ai-status').forEach(n=>n.remove());status('Working on your AI practice…');
  try{await work(requestController.signal,()=>ticket===epoch)}catch(error){if(ticket===epoch){render();status(error.name==='AbortError'?'Connection interrupted. Check saved activity before starting again.':error.message||'AI Learning could not connect.',true)}}
  finally{if(ticket===epoch){busy=false;renderControls()}}
 }
 function renderControls(){
  area.querySelectorAll('button,input,textarea,select').forEach(n=>{n.disabled=n.dataset.locked==='true'});
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
   if(!current())return;state.snapshot=snapshot;
   if(conversation){state.conversation=conversation;state.level=conversation.level;state.scenario=conversation.scenario}
   render();
  });
 }
 function creditButton(label,fn){
  const activity=state.snapshot?.activities[state.tab],credits=activity?.credits;
  const b=button(Number.isSafeInteger(credits)?`${label} · ${credits} ${credits===1?'credit':'credits'}`:label,fn);
  const wallet=state.snapshot?.wallet;
  b.dataset.locked=String(!state.snapshot?.enabled||!activity?.enabled||!Number.isSafeInteger(credits)||!wallet||wallet.available<credits||!wallet.budgetAvailable||Date.parse(wallet.expiresAt)<=Date.now()||!!state.pending||!!state.conversation?.busy&&state.tab==='conversation');
  b.disabled=b.dataset.locked==='true';return b;
 }
 function speak(text){
  const speech=globalThis.speechSynthesis,voice=speech?.getVoices().find(v=>/^fr[-_]/i.test(v.lang));
  if(!speech||!voice||!globalThis.SpeechSynthesisUtterance){status('Enable a French voice in your device settings for playback.');return}
  speech.cancel();const audio=new SpeechSynthesisUtterance(text);audio.lang='fr-FR';audio.voice=voice;audio.rate=.9;speech.speak(audio);
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
   block.append(el('p',result.feedback));if(result.heardText)block.append(el('p','Heard: '+result.heardText));
   const strengths=el('ul');for(const s of result.strengths)strengths.append(el('li',s));block.append(strengths);
   for(const focus of result.focus){const card=el('article',undefined,'hz-ai-feedback-card');card.append(el('h5',focus.sound),el('p',focus.example,'hz-ai-corrected'),el('p',focus.tip));block.append(card)}
   block.append(el('p',result.practicePhrase,'hz-ai-practice-phrase'),button('Hear practice phrase',()=>speak(result.practicePhrase),true));
  }else{
   block.append(el('p',result.reply,'hz-ai-french-reply'),button('Hear French reply',()=>speak(result.reply),true));
   const help=el('details');help.append(el('summary','English help'),el('p',result.englishHelp));block.append(help);corrections(result.corrections,block);
   for(const suggestion of result.suggestedReplies)block.append(button(suggestion,()=>{state.drafts[draftKey()]=suggestion;render()},true));
  }
  area.append(block);
 }
 async function receive(response,signal,current){
  if(!current())return;
  if(response.status==='completed'){
   state.result={kind:state.pending?.kind||response.kind||state.tab,data:response.result};state.pending=null;
   if(response.conversationId){try{const conversation=await store.conversation(response.conversationId,signal);if(current())state.conversation=conversation}catch{if(current())state.conversation={id:response.conversationId,level:state.level,scenario:state.scenario,messages:[]}}}
   if(!current())return;
   if(state.result.kind==='conversation')state.drafts['conversation:'+state.level]='';
  }else if(response.status==='failed')state.pending=null;
  const snapshot=await load(signal);if(current()){state.snapshot=snapshot;render();if(response.status==='failed')status('This activity could not complete. Your credits were returned.',true);else if(response.status!=='completed')status('Your activity is being checked. Use Check activity to retrieve it.')}
 }
 async function send(payload,signal,current){
  try{await receive(await store.submit(payload,signal),signal,current)}
  catch(error){
   if(current()&&(error.activityStatus==='failed'||[400,401,403,409,413].includes(error.status))){state.pending=null;try{state.snapshot=await load(signal)}catch{}}
   throw error;
  }
 }
 function submit(){
  if(recorder?.isRecording?.()){status('Stop your recording before sending it.',true);return}
  const input={id:crypto.randomUUID(),kind:state.tab,level:state.level,expectedCredits:state.snapshot?.activities[state.tab]?.credits};
  if(state.tab==='writing'){input.text=(state.drafts[draftKey()]||'').trim();if(!input.text){status('Write a French response first.',true);return}}
  if(state.tab==='pronunciation'){input.reference=state.drafts[draftKey()]??phrases[state.level];if(!input.reference.trim()){status('Enter a French practice sentence first.',true);return}input.audio=recorder?.getAudio();if(!input.audio){status('Record the French sentence first.',true);return}}
  if(state.tab==='conversation'){
   input.scenario=state.scenario;input.conversationId=state.conversation?.id||null;input.audio=recorder?.getAudio();
   if(!input.audio){delete input.audio;input.text=(state.drafts[draftKey()]||'').trim()||(!input.conversationId?'Bonjour !':'');if(!input.text){status('Type or record your next reply.',true);return}}
  }
  state.pending={id:input.id,kind:input.kind,payload:input};
  void run((signal,current)=>send(input,signal,current));
 }
 function pending(){
  if(!state.pending)return;
  const block=el('div',undefined,'hz-ai-pending');block.append(el('p','Check this activity before starting another.'));
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
     state.tab=item.kind;state.level=item.level;state.result={kind:item.kind,data:item.result};
     if(item.kind==='conversation'&&item.conversationId){void open('conversation',{level:item.level,conversationId:item.conversationId});return}render();
    }else if(item.status!=='failed'){state.tab=item.kind;state.level=item.level;state.pending={id:item.id,kind:item.kind};render()}
   },true);row.classList.add('hz-studio-history-row');row.disabled=item.status==='failed';row.dataset.locked=String(item.status==='failed');rows.append(row);
  }
  if(!entries.length)rows.append(el('p','Your feedback will appear here after your first activity.','hz-studio-empty'));
  detail.append(rows);
  const conversations=snapshot.conversations||[];
  if(conversations.length){detail.append(el('h4','Continue a conversation'));for(const c of conversations)detail.append(button(`Resume ${c.level} · ${scenarios[c.scenario]||'Conversation'}`,()=>open('conversation',{level:c.level,conversationId:c.id}),true))}
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
   head.append(studioIcon('wallet'),el('span','Your AI credits'));wallet.append(head,el('strong',String(w.available),'hz-studio-credit-value'),el('span','credits available','hz-studio-credit-label'));
   if(w.reserved>0)wallet.append(el('span',w.reserved+' reserved','hz-studio-muted'));
   const expiry=new Date(w.expiresAt);if(Number.isFinite(expiry.getTime()))wallet.append(el('span','Valid until '+expiry.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}),'hz-studio-muted'));
   const refresh=button('Refresh balance',()=>void run(async(signal,current)=>{const next=await load(signal);if(current()){state.snapshot=next;render()}}),true);refresh.classList.add('hz-studio-refresh');wallet.append(refresh);hero.append(wallet);
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
    topline.append(studioIcon(icon),el('span',Number.isSafeInteger(cost)?`${cost} ${cost===1?'credit':'credits'} / ${unit}`:'Price unavailable','hz-studio-price'));card.append(topline,el('h4',title),el('p',description,'hz-studio-card-description'));
    const list=el('ul',undefined,'hz-studio-benefits');for(const benefit of benefits)list.append(el('li',benefit));card.append(list);
    const action=button(cta+' →',()=>{if(key==='tutor'){root.dispatchEvent(new CustomEvent('hzad-open-french-tutor'));return}state.tab=key;state.result=null;render()});action.classList.add('hz-studio-card-action');action.dataset.locked=String(!snap.enabled||!activity?.enabled);action.disabled=action.dataset.locked==='true';card.append(action);cards.append(card);
   }area.append(cards);
   const how=el('section',undefined,'hz-studio-how');how.append(el('h4','How your credits work'),el('p','All practice tools and the French Tutor share one credit balance. Opening tools, viewing saved feedback and checking your balance are free. Credits are deducted only for a new AI activity; failed activities return the credits.'));if(snap.testingCad)how.append(el('p',`Testing allowance: up to CAD $${Number(snap.testingCad).toFixed(2)}.`,'hz-studio-muted'));area.append(how);
  }else if(state.tab==='history'){
   history();
  }else{
   const levelLabel=el('label','French level','hz-studio-level'),level=el('select');level.setAttribute('aria-label','AI French level');for(const l of LEVELS){const o=el('option',l);o.value=l;level.append(o)}level.value=state.level;
   level.addEventListener('change',()=>{state.level=level.value;state.conversation=null;state.result=null;render()});levelLabel.append(level);area.append(levelLabel);
   const benefit=el('div',undefined,'hz-studio-exercise-summary');benefit.append(studioIcon(trainers[state.tab][0]),el('p',trainers[state.tab][3].join(' · ')));area.append(benefit);
   if(state.tab==='writing'){
    const label=el('label','Your French writing'),input=el('textarea');input.rows=8;input.maxLength=4000;input.required=true;input.setAttribute('aria-label','Your French writing');input.value=state.drafts[draftKey()]||'';
    const count=el('p',`${input.value.length}/4000 characters`,'hz-small');input.addEventListener('input',()=>{state.drafts[draftKey()]=input.value;count.textContent=`${input.value.length}/4000 characters`});label.append(input);area.append(label,count,creditButton('Review my writing',submit));
   }else if(state.tab==='pronunciation'){
    const label=el('label','Practice sentence'),reference=el('textarea');reference.rows=2;reference.maxLength=240;reference.setAttribute('aria-label','Practice sentence');reference.value=state.drafts[draftKey()]??phrases[state.level];reference.lang='fr';reference.addEventListener('input',()=>{state.drafts[draftKey()]=reference.value});label.append(reference);area.append(label,button('Hear French example',()=>speak(reference.value),true));
    recorder=recorderFactory(area);area.append(creditButton('Get pronunciation feedback',submit));
   }else{
    const label=el('label','Conversation scenario'),scenario=el('select');scenario.setAttribute('aria-label','Conversation scenario');for(const [key,name] of Object.entries(scenarios)){const o=el('option',name);o.value=key;scenario.append(o)}scenario.value=state.scenario;scenario.disabled=!!state.conversation;scenario.dataset.locked=String(!!state.conversation);scenario.addEventListener('change',()=>{state.scenario=scenario.value;render()});label.append(scenario);area.append(label);
    const log=el('div',undefined,'hz-ai-chat');log.setAttribute('role','log');log.setAttribute('aria-label','French conversation');
    for(const m of state.conversation?.messages||[]){const bubble=el('article',undefined,'hz-ai-bubble '+(m.role==='assistant'?'is-partner':'is-learner'));bubble.append(el('strong',m.role==='assistant'?'French partner':'You'),el('p',m.content));log.append(bubble)}area.append(log);
    const inputLabel=el('label','Your French reply'),input=el('textarea');input.rows=3;input.maxLength=2000;input.setAttribute('aria-label','Your French reply');input.value=state.drafts[draftKey()]||'';input.addEventListener('input',()=>{state.drafts[draftKey()]=input.value});inputLabel.append(input);area.append(inputLabel);
    recorder=recorderFactory(area,audio=>{input.disabled=!!audio;input.dataset.locked=String(!!audio)});
    const complete=(state.conversation?.messages?.length||0)>=24;
    if(!complete)area.append(creditButton(state.conversation?'Send reply':'Start conversation',submit));else area.append(el('p','Great practice! Start a new scenario to continue.'));
    if(state.conversation)area.append(button('New conversation',()=>{state.conversation=null;state.result=null;state.drafts[draftKey()]='';render()},true));
   }
   if(state.result?.kind===state.tab)feedback(state.result.data);
  }
  pending();remember();renderControls();
 }
 launch.addEventListener('click',()=>{if(!busy)void open()});
}

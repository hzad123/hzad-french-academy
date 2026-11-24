const NS='http://www.w3.org/2000/svg';
const html=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n};
function shape(tag,attrs={},txt){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(txt!==undefined)e.textContent=txt;return e}
function newerScene(scene){
 const configs={
 observatory:{sky:'#172b4c',ground:'#263a62',accent:'#eac76f',kind:'telescope'},
 radio:{sky:'#f3e7da',ground:'#dba775',accent:'#70408f',kind:'microphone'},
 lighthouse:{sky:'#dceff8',ground:'#7bb0cb',accent:'#b84040',kind:'tower'},
 greenhouse:{sky:'#e7f4df',ground:'#91bd8b',accent:'#278459',kind:'glasshouse'},
 'heritage-train':{sky:'#e6eef4',ground:'#819d8e',accent:'#8e4554',kind:'train'},
 canoe:{sky:'#def0ef',ground:'#72aeb8',accent:'#db8245',kind:'canoe'},
 cinema:{sky:'#29314e',ground:'#4e567b',accent:'#e5c56b',kind:'screen'},
 weatherballoon:{sky:'#dfeffc',ground:'#85b9d9',accent:'#e67b55',kind:'balloon'},
 orchard:{sky:'#ebf4df',ground:'#9bca8b',accent:'#ca755d',kind:'trees'}
 };
 const c=configs[scene];if(!c)return null;
 const v=shape('svg',{viewBox:'0 0 640 230',role:'img','aria-label':'Illustration : '+scene.replace(/-/g,' '),class:'hz-tef-illustration'});
 v.append(shape('rect',{x:0,y:0,width:640,height:230,rx:18,fill:c.sky}),shape('rect',{x:0,y:188,width:640,height:42,fill:c.ground}));
 if(c.kind==='telescope'){
  v.append(shape('circle',{cx:528,cy:45,r:24,fill:c.accent}));
  for(const [x,y] of [[70,54],[130,37],[224,68],[350,39],[460,76]])v.append(shape('circle',{cx:x,cy:y,r:3,fill:'#f1e9cc'}));
  v.append(shape('path',{d:'M176 113 L403 66 L412 91 L187 145 Z',fill:'#bed8e6',stroke:'#354a69','stroke-width':5}),shape('rect',{x:370,y:61,width:52,height:35,rx:7,fill:'#4c698e'}),shape('line',{x1:290,y1:127,x2:260,y2:195,stroke:'#d0ac70','stroke-width':8}),shape('line',{x1:290,y1:127,x2:350,y2:193,stroke:'#d0ac70','stroke-width':8}),shape('line',{x1:290,y1:127,x2:285,y2:190,stroke:'#d0ac70','stroke-width':8}));
 }else if(c.kind==='microphone'){
  v.append(shape('rect',{x:150,y:52,width:340,height:135,rx:16,fill:'#efcfab'}),shape('circle',{cx:322,cy:112,r:61,fill:'#624b85'}),shape('rect',{x:302,y:59,width:40,height:92,rx:19,fill:'#f1c973'}),shape('path',{d:'M286 120 A36 36 0 0 0 358 120',fill:'none',stroke:'#f0f0f0','stroke-width':8}),shape('line',{x1:322,y1:160,x2:322,y2:191,stroke:'#f0f0f0','stroke-width':8}),shape('rect',{x:270,y:190,width:104,height:8,rx:4,fill:'#f0f0f0'}));
 }else if(c.kind==='tower'){
  v.append(shape('path',{d:'M0 180 Q180 154 320 177 T640 180 V230 H0Z',fill:'#7bb5bb'}),shape('path',{d:'M264 180 L281 61 L365 61 L386 180 Z',fill:'#f0e8d8',stroke:'#9a7774','stroke-width':4}),shape('rect',{x:275,y:48,width:98,height:22,rx:5,fill:'#af4e4e'}),shape('rect',{x:300,y:25,width:48,height:28,rx:5,fill:'#f5d08b'}),shape('line',{x1:323,y1:26,x2:323,y2:8,stroke:'#44576a','stroke-width':5}),shape('rect',{x:306,y:103,width:32,height:45,rx:6,fill:'#6f9aa8'}));
 }else if(c.kind==='glasshouse'){
  v.append(shape('path',{d:'M120 172 L200 55 L450 55 L520 172 Z',fill:'#d5f1ee',stroke:'#41947b','stroke-width':10}),shape('line',{x1:205,y1:58,x2:205,y2:177,stroke:'#4b987d','stroke-width':7}),shape('line',{x1:322,y1:58,x2:322,y2:179,stroke:'#4b987d','stroke-width':7}),shape('line',{x1:441,y1:58,x2:441,y2:177,stroke:'#4b987d','stroke-width':7}));
  for(const x of [174,270,374,463])v.append(shape('line',{x1:x,y1:177,x2:x,y2:132,stroke:'#458c63','stroke-width':8}),shape('circle',{cx:x,cy:119,r:23,fill:'#6fb179'}));
 }else if(c.kind==='train'){
  v.append(shape('rect',{x:103,y:93,width:435,height:96,rx:20,fill:c.accent}),shape('rect',{x:126,y:105,width:70,height:45,rx:7,fill:'#b5dbe7'}),shape('rect',{x:224,y:105,width:68,height:45,rx:7,fill:'#b5dbe7'}),shape('rect',{x:316,y:105,width:68,height:45,rx:7,fill:'#b5dbe7'}),shape('rect',{x:415,y:105,width:70,height:45,rx:7,fill:'#b5dbe7'}));
  for(const x of [168,330,475])v.append(shape('circle',{cx:x,cy:192,r:19,fill:'#394456'}));
  v.append(shape('line',{x1:58,y1:213,x2:587,y2:213,stroke:'#475366','stroke-width':6}));
 }else if(c.kind==='canoe'){
  v.append(shape('rect',{x:0,y:143,width:640,height:87,fill:'#70b6be'}),shape('path',{d:'M124 145 L523 145 Q476 192 317 196 Q176 192 124 145 Z',fill:'#c97c46'}),shape('line',{x1:272,y1:101,x2:407,y2:185,stroke:'#654833','stroke-width':8}),shape('ellipse',{cx:421,cy:189,rx:37,ry:8,fill:'#e6d3ac'}),shape('circle',{cx:303,cy:94,r:21,fill:'#cba27a'}),shape('path',{d:'M284 117 Q316 101 345 142 L310 158 Z',fill:'#386f8c'}));
 }else if(c.kind==='screen'){
  v.append(shape('rect',{x:80,y:34,width:480,height:152,rx:12,fill:'#edf0db'}),shape('path',{d:'M97 161 L198 85 L275 131 L360 61 L540 162 Z',fill:'#91b6a7'}),shape('circle',{cx:432,cy:80,r:26,fill:c.accent}));
  for(const x of [112,186,262,338,414,488,546])v.append(shape('circle',{cx:x,cy:200,r:17,fill:'#15283d'}));
 }else if(c.kind==='balloon'){
  v.append(shape('ellipse',{cx:320,cy:74,rx:63,ry:70,fill:c.accent}),shape('line',{x1:283,y1:123,x2:309,y2:171,stroke:'#72594e','stroke-width':4}),shape('line',{x1:358,y1:123,x2:331,y2:171,stroke:'#72594e','stroke-width':4}),shape('rect',{x:300,y:170,width:44,height:29,rx:4,fill:'#98744c'}));
  for(const x of [95,470])v.append(shape('ellipse',{cx:x,cy:78,rx:77,ry:20,fill:'#f8fcff'}));
 }else if(c.kind==='trees'){
  for(const x of [125,263,404,535]){
   v.append(shape('rect',{x:x-10,y:111,width:20,height:83,fill:'#795b41'}),shape('circle',{cx:x,cy:89,r:53,fill:'#5a9d66'}));
   for(const [dx,dy] of [[-20,-12],[15,-27],[24,18],[-13,23]])v.append(shape('circle',{cx:x+dx,cy:89+dy,r:9,fill:c.accent}));
  }
 }
 return v;
}

function illustration(scene){
 const selected=newerScene(scene);if(selected)return selected;
 const svg=shape('svg',{viewBox:'0 0 640 230',role:'img','aria-label':({garden:'Illustration de jardin collectif avec plantes et arrosoir',fair:'Illustration de forum associatif avec stands et visiteurs',workshop:'Illustration d’un atelier de réparation avec outils et appareils',festival:'Illustration d’un festival en plein air avec scène et public'})[scene]||'Illustration',class:'hz-tef-illustration'});
 svg.append(shape('rect',{x:0,y:0,width:640,height:230,rx:18,fill:scene==='garden'?'#eaf9ed':'#eaf3fc'}));
 if(scene==='workshop'){
  svg.append(shape('rect',{x:30,y:145,width:580,height:30,rx:6,fill:'#c49765'}),shape('rect',{x:50,y:175,width:25,height:42,fill:'#7f6447'}),shape('rect',{x:565,y:175,width:25,height:42,fill:'#7f6447'}));
  for(const [x,c] of [[155,'#5594b1'],[305,'#d8a54c'],[458,'#64a784']]){
   svg.append(shape('rect',{x:x-44,y:55,width:88,height:90,rx:10,fill:c}),shape('circle',{cx:x,y:98,r:23,fill:'#edf5f8'}),shape('circle',{cx:x,y:98,r:9,fill:'#a1b8c7'}));
  }
  svg.append(shape('path',{d:'M250 181 l38 -20 l23 10 l-38 20 Z',fill:'#5b7085'}),shape('circle',{cx:290,cy:168,r:7,fill:'#c4d9e3'}));
 }else if(scene==='festival'){
  svg.append(shape('rect',{x:100,y:100,width:440,height:100,rx:8,fill:'#365a87'}),shape('path',{d:'M80 105 L320 25 L560 105 Z',fill:'#d89743'}));
  for(const x of [170,320,470])svg.append(shape('circle',{cx:x,cy:86,r:16,fill:'#f4d178'}),shape('line',{x1:x,y1:105,x2:x,y2:175,stroke:'#f3e2bf','stroke-width':5}));
  svg.append(shape('rect',{x:154,y:148,width:340,height:15,rx:6,fill:'#aac3df'}));
  for(const x of [80,130,190,270,350,430,510,570])svg.append(shape('circle',{cx:x,cy:205,r:16,fill:'#567c89'}));
 }else if(scene==='garden'){
  svg.append(shape('circle',{cx:530,cy:53,r:27,fill:'#f4ca58'}),shape('path',{d:'M0 186 Q140 164 320 183 T640 178 V230 H0Z',fill:'#a6d7ab'}));
  for(const x of [58,142,245,347,448,540]){
   svg.append(shape('line',{x1:x,y1:192,x2:x,y2:103,stroke:'#39824b','stroke-width':8,'stroke-linecap':'round'}));
   for(const [dy,side] of [[-30,1],[-54,-1]])svg.append(shape('ellipse',{cx:x+side*21,cy:153+dy,rx:24,ry:12,fill:'#55a868',transform:'rotate('+(-side*26)+' '+(x+side*21)+' '+(153+dy)+')'}));
   svg.append(shape('circle',{cx:x,cy:99,r:17,fill:x%2?'#f18e70':'#e5bd4a'}));
  }
  svg.append(shape('rect',{x:275,y:155,width:82,height:36,rx:8,fill:'#5b95bc'}),shape('path',{d:'M349 161 Q393 134 400 173',fill:'none',stroke:'#5b95bc','stroke-width':10}));
 }else{
  for(const [x,c] of [[42,'#f3bc5b'],[245,'#88bee2'],[450,'#f3a9a1']]){
   svg.append(shape('rect',{x,y:85,width:147,height:105,rx:8,fill:'#fff',stroke:'#bed0df','stroke-width':3}),shape('path',{d:'M'+x+' 91 h147 l-16 -36 h-115 Z',fill:c}));
   svg.append(shape('rect',{x:x+17,y:116,width:113,height:45,rx:5,fill:'#e9f0f5'}));
  }
  for(const x of [115,212,410,560]){
   svg.append(shape('circle',{cx:x,cy:164,r:14,fill:'#b58162'}),shape('rect',{x:x-17,y:181,width:34,height:45,rx:12,fill:x%2?'#2e74a3':'#d0a04e'}));
  }
 }
 return svg;
}
// All four alternatives in a question must have the same, data-driven scale.
export function tefChartScale(series){
 const values=series.flat();
 const low=Math.min(0,...values),high=Math.max(0,...values);
 const span=high-low||1;
 const raw=span*1.1/4;
 const magnitude=10**Math.floor(Math.log10(raw));
 const step=([1,2,2.5,5,10].find(n=>n*magnitude>=raw)||10)*magnitude;
 const min=Math.floor((low<0?low-span*.05:0)/step)*step;
 const max=Math.ceil((high>0?high+span*.05:low===0?1:0)/step)*step;
 const ticks=Array.from({length:Math.round((max-min)/step)+1},(_,i)=>Number((min+i*step).toPrecision(12)));
 return {min,max,ticks};
}
function graph(values,index,media,scale){
 const svg=shape('svg',{viewBox:'0 0 415 245',role:'img','aria-label':'Graphique '+(index+1)+' : valeurs de '+values.join(', '),class:'hz-tef-chart'});
 const x=i=>62+i*322/Math.max(1,values.length-1),y=v=>196-(v-scale.min)/(scale.max-scale.min)*150;
 const format=new Intl.NumberFormat('fr-CA',{maximumSignificantDigits:8});
 svg.append(shape('text',{x:207,y:20,'text-anchor':'middle','font-size':16,'font-weight':700,fill:'#163b61'},'Graphique '+(index+1)));
 for(const v of scale.ticks){const yy=y(v);svg.append(shape('line',{x1:58,y1:yy,x2:390,y2:yy,stroke:'#dbe4ed','stroke-width':1}),shape('text',{x:49,y:yy+4,'text-anchor':'end','font-size':11,fill:'#53677c'},format.format(v)))}
 svg.append(shape('line',{x1:58,y1:y(0),x2:390,y2:y(0),stroke:'#627e96','stroke-width':1.5}));
 for(let i=0;i<values.length;i++)svg.append(shape('text',{x:x(i),y:216,'text-anchor':'middle','font-size':11,fill:'#506781'},media.years?.[i]||String(i+1)));
 const color=['#167e8f','#ba5b64','#6f60bd','#b98929'][index];
 svg.append(shape('polyline',{points:values.map((v,i)=>x(i)+','+y(v)).join(' '),fill:'none',stroke:color,'stroke-width':3.2,'stroke-linecap':'round','stroke-linejoin':'round'}));
 for(let i=0;i<values.length;i++)svg.append(shape('circle',{cx:x(i),cy:y(values[i]),r:4,fill:color}));
 return svg;
}
export function renderTefMedia(media){
 if(!media)return null;
 const wrap=html('section',undefined,'hz-tef-media hz-tef-media-'+media.kind);wrap.lang='fr';
 if(media.kind==='notice'){
  const banner=html('div',undefined,'hz-tef-notice');banner.style.setProperty('--tef-accent',media.accent||'#27649a');banner.append(html('span',media.icon,'hz-tef-notice-icon'),html('strong',media.heading));wrap.append(banner);
 }else if(media.kind==='illustration'){
  wrap.append(illustration(media.scene),html('strong',media.heading,'hz-tef-media-heading'));
 }else if(media.kind==='offers'){
  wrap.append(html('h5',media.heading));
  const grid=html('div',undefined,'hz-tef-offer-grid');
  for(const [i,item] of media.items.entries()){const c=html('article',undefined,'hz-tef-offer');c.append(html('strong','Offre '+(i+1)),html('p',item));grid.append(c)}
  wrap.append(grid);
 }else if(media.kind==='chart-grid'){
  wrap.append(html('h5',media.heading),html('p',media.unit||'Valeurs annuelles','hz-small'));
  const grid=html('div',undefined,'hz-tef-chart-grid');
  const scale=tefChartScale(media.series);
  for(const [i,values] of media.series.entries())grid.append(graph(values,i,media,scale));
  wrap.append(grid);
 }
 return wrap;
}

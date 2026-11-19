const NS='http://www.w3.org/2000/svg';
const html=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n};
function shape(tag,attrs={},txt){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(txt!==undefined)e.textContent=txt;return e}
function illustration(scene){
 const svg=shape('svg',{viewBox:'0 0 640 230',role:'img','aria-label':scene==='garden'?'Illustration de jardin collectif avec plantes et arrosoir':'Illustration de forum associatif avec stands et visiteurs',class:'hz-tef-illustration'});
 svg.append(shape('rect',{x:0,y:0,width:640,height:230,rx:18,fill:scene==='garden'?'#eaf9ed':'#eaf3fc'}));
 if(scene==='garden'){
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
function graph(values,index,media){
 const svg=shape('svg',{viewBox:'0 0 415 245',role:'img','aria-label':'Graphique '+(index+1)+' : valeurs de '+values.join(', '),class:'hz-tef-chart'});
 const x=i=>48+i*82,y=v=>196-v*4.6;
 svg.append(shape('text',{x:207,y:20,'text-anchor':'middle','font-size':16,'font-weight':700,fill:'#163b61'},'Graphique '+(index+1)));
 for(const v of [0,10,20,30]){const yy=y(v);svg.append(shape('line',{x1:45,y1:yy,x2:390,y2:yy,stroke:'#dbe4ed','stroke-width':1}),shape('text',{x:35,y:yy+4,'text-anchor':'end','font-size':11,fill:'#53677c'},v))}
 svg.append(shape('line',{x1:45,y1:196,x2:390,y2:196,stroke:'#627e96','stroke-width':1.5}));
 for(let i=0;i<5;i++)svg.append(shape('text',{x:x(i),y:216,'text-anchor':'middle','font-size':11,fill:'#506781'},media.years?.[i]||String(i+1)));
 svg.append(shape('polyline',{points:values.map((v,i)=>x(i)+','+y(v)).join(' '),fill:'none',stroke:['#167e8f','#ba5b64','#6f60bd','#b98929'][index],'stroke-width':3.2,'stroke-linecap':'round','stroke-linejoin':'round'}));
 for(let i=0;i<5;i++)svg.append(shape('circle',{cx:x(i),cy:y(values[i]),r:4,fill:['#167e8f','#ba5b64','#6f60bd','#b98929'][index]}));
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
  for(const [i,values] of media.series.entries())grid.append(graph(values,i,media));
  wrap.append(grid);
 }
 return wrap;
}

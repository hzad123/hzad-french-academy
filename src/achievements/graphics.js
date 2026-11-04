// Local vector artwork. No remote images or icon dependencies.
const NS='http://www.w3.org/2000/svg';let serial=0;
function node(tag,attributes={}){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attributes))n.setAttribute(k,String(v));return n}
const symbols={
 'first-lesson':'M39 45q10-5 21 2q11-7 21-2v27q-11-5-21 2q-11-7-21-2z M60 47v27',
 'five-lessons':'M42 73l9-24l9 12l10-21l10 33 M42 73h38',
 'twenty-five-lessons':'M35 74l18-31l10 17l9-13l15 27z M47 54l6 4l5-4',
 'three-day-streak':'M62 37c2 13 17 18 16 32c-1 18-31 22-36 4c-4-12 8-19 11-27c2 7 6 10 7 13c5-8 4-14 2-22z',
 'seven-day-streak':'M40 45h40v32H40z M40 54h40 M49 39v12 M71 39v12 M51 65l6 6l13-12',
 'thirty-day-streak':'M60 45a15 15 0 1 0 0 30a15 15 0 1 0 0-30 M60 34v6 M60 80v6 M34 60h6 M80 60h6 M42 42l4 4 M74 74l4 4 M42 78l4-4 M74 46l4-4',
 'first-revision':'M41 61l13 13l25-29',
 'ten-revisions':'M40 55a22 22 0 0 1 37-12l4 5 M81 37v12H69 M80 65a22 22 0 0 1-37 12l-4-5 M39 83V71h12',
 'first-certificate':'M45 39h30v29H45z M51 48h18 M51 55h14 M53 68l-4 16l11-6l11 6l-4-16',
 'seven-certificates':'M38 46l10 10l12-18l12 18l10-10l-5 29H43z M44 81h32'
};
export function badgeGraphic(code,earned){
 const svg=node('svg',{viewBox:'0 0 120 140','aria-hidden':'true',focusable:'false',class:'hz-badge-art'});
 const index=Math.max(0,Object.keys(symbols).indexOf(code));
 const colors=[['#13c6c2','#1267cb'],['#8d65ec','#4540b4'],['#f5b53b','#d16a15']][index%3];
 const id='hz-medal-'+(++serial),defs=node('defs'),gradient=node('linearGradient',{id,x1:0,y1:0,x2:1,y2:1});
 gradient.append(node('stop',{offset:0,'stop-color':colors[0]}),node('stop',{offset:1,'stop-color':colors[1]}));defs.append(gradient);svg.append(defs);
 svg.append(node('path',{d:'M33 84L24 126L47 117L59 132L65 88 M61 88L75 132L87 117L109 126L88 80',fill:colors[1],opacity:.8}));
 svg.append(node('circle',{cx:60,cy:61,r:48,fill:'url(#'+id+')'}),node('circle',{cx:60,cy:61,r:41,fill:'none',stroke:'#fff','stroke-opacity':.4,'stroke-width':1.5}));
 svg.append(node('path',{d:symbols[code]||symbols['first-certificate'],fill:'none',stroke:'white','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'}));
 if(!earned){const lock=node('g');lock.append(node('circle',{cx:94,cy:97,r:14,fill:'#233958'}),node('path',{d:'M89 95v-4a5 5 0 0 1 10 0v4 M87 95h14v11H87z',fill:'none',stroke:'white','stroke-width':2}));svg.append(lock)}
 return svg;
}
export function certificateGraphic(level,earned=false){
 const svg=node('svg',{viewBox:'0 0 240 145','aria-hidden':'true',focusable:'false',class:'hz-certificate-art'});
 svg.append(node('rect',{x:12,y:8,width:216,height:128,rx:12,fill:earned?'#102b59':'#f2f6ff'}),node('rect',{x:23,y:19,width:194,height:106,rx:5,fill:'none',stroke:earned?'#f5c85f':'#b7c9e9','stroke-width':1.5}));
 svg.append(node('path',{d:'M42 40h85 M42 47h55 M42 104h112 M42 112h70',stroke:earned?'#a9bddf':'#a7b8d0','stroke-width':3,'stroke-linecap':'round'}));
 const title=node('text',{x:40,y:88,fill:earned?'white':'#143c78','font-size':37,'font-family':'Georgia,serif','font-weight':700});title.textContent=level;svg.append(title);
 svg.append(node('path',{d:'M177 81l-12 40l18-7l12 12l5-41',fill:'#d39723'}),node('circle',{cx:187,cy:72,r:23,fill:'#efc25a'}),node('circle',{cx:187,cy:72,r:17,fill:'none',stroke:'#fff2c7','stroke-width':2}));
 svg.append(node('path',{d:'M176 72l7 7l14-16',fill:'none',stroke:'#7e4d0d','stroke-width':3,'stroke-linecap':'round'}));return svg;
}

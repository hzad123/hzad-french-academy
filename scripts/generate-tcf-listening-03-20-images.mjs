// Original illustrated listening stimuli. No external images or purchased assets.
// Each scene has a different layout and theme-specific French signage.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const {contexts}=JSON.parse(await readFile('curriculum/tcf-listening-03-20-editorial-contexts.json','utf8'));
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const caps=(s,max=31)=>s.toLocaleUpperCase('fr').replace(/^(UN|UNE|LE|LA|LES|L')\s*/,'').slice(0,max);
const palettes=[['#e7efff','#1b4976','#e8a32b'],['#fff3db','#25536b','#2c9a98'],['#edf4e5','#2c557c','#df8e41'],['#e9f1fa','#2a526f','#c77e56']];
const svg=(c,n)=>{
 const [bg,ink,accent]=palettes[(c.n+n)%palettes.length];
 const theme=escape(caps(c.theme,35));
 const label=escape(caps(n===1?c.object:n===2?c.theme:n===3?c.event:c.place,31));
 let scene='';
 if(n===1)scene=`
 <!-- A person reading a marked document at a desk -->
 <rect x="130" y="325" width="610" height="30" rx="12" fill="#967451"/>
 <rect x="175" y="346" width="25" height="145" rx="7" fill="#967451"/><rect x="666" y="346" width="25" height="145" rx="7" fill="#967451"/>
 <circle cx="345" cy="171" r="48" fill="#ddb089"/><path d="M310 142Q347 101 383 144" stroke="#554136" stroke-width="22" fill="none" stroke-linecap="round"/>
 <path d="M289 229Q350 200 402 233L441 334H269Z" fill="${accent}"/>
 <path d="M312 274L437 323M389 272L477 323" stroke="#ddb089" stroke-width="19" stroke-linecap="round"/>
 <path d="M475 240L645 255 619 345 448 330Z" fill="#fffdf6" stroke="${ink}" stroke-width="6"/>
 <path d="M493 290H610M489 307H580" stroke="#95a8bb" stroke-width="5"/>
 <text x="545" y="278" text-anchor="middle" font-family="Arial" font-size="17" font-weight="bold" fill="${ink}">${label}</text>
 <path d="M310 352L290 450M385 352L410 450" stroke="${ink}" stroke-width="20" stroke-linecap="round"/>`;
 else if(n===2)scene=`
 <!-- A presenter points to an illustrated group notice -->
 <rect x="335" y="119" width="390" height="252" rx="12" fill="#fffef9" stroke="${ink}" stroke-width="9"/>
 <rect x="360" y="145" width="340" height="70" rx="9" fill="${accent}"/>
 <text x="530" y="188" text-anchor="middle" font-family="Arial" font-size="22" font-weight="bold" fill="${ink}">${label}</text>
 <circle cx="485" cy="265" r="27" fill="#eeb76a"/><path d="M480 295L435 341H550Z" fill="#6e9d8a"/>
 <path d="M568 252H662M568 276H653M568 300H631" stroke="#8ba7b7" stroke-width="6"/>
 <circle cx="240" cy="167" r="39" fill="#ddb089"/><path d="M200 213L281 213 309 343H170Z" fill="#4e84a5"/>
 <path d="M269 245L360 227" stroke="#ddb089" stroke-width="19" stroke-linecap="round"/>
 <path d="M215 344L200 462M263 344L274 462" stroke="${ink}" stroke-width="21" stroke-linecap="round"/>
 <g fill="${ink}"><circle cx="425" cy="405" r="23"/><circle cx="520" cy="405" r="23"/><circle cx="615" cy="405" r="23"/></g>
 <path d="M396 450Q426 419 455 450M492 450Q520 419 551 450M586 450Q615 419 645 450" fill="none" stroke="${ink}" stroke-width="18"/>`;
 else if(n===3)scene=`
 <!-- Two colleagues prepare a public event around a planning table -->
 <rect x="110" y="96" width="658" height="188" rx="14" fill="#fff8ea" stroke="${ink}" stroke-width="7"/>
 <rect x="145" y="125" width="590" height="69" rx="8" fill="${accent}"/><text x="439" y="169" text-anchor="middle" font-size="22" font-weight="bold" font-family="Arial" fill="${ink}">${label}</text>
 <path d="M185 232H678" stroke="#aebbc7" stroke-width="7"/>
 <rect x="202" y="378" width="480" height="30" rx="12" fill="#8f684d"/><path d="M246 408L223 492M644 408L667 492" stroke="#8f684d" stroke-width="19"/>
 <circle cx="260" cy="300" r="34" fill="#dbab85"/><path d="M220 337L305 338 322 424H213Z" fill="#4c8eb6"/>
 <path d="M292 351L384 391" stroke="#dbab85" stroke-width="14" stroke-linecap="round"/>
 <circle cx="620" cy="300" r="34" fill="#e3b28a"/><path d="M576 337L663 337 675 421H559Z" fill="#bc7d56"/>
 <path d="M579 348L487 392" stroke="#e3b28a" stroke-width="14" stroke-linecap="round"/>
 <rect x="388" y="355" width="96" height="46" rx="5" fill="#fff" stroke="${ink}" stroke-width="4"/><path d="M399 366H470M399 378H460M399 389H455" stroke="#99aebe" stroke-width="3"/>`;
 else scene=`
 <!-- A person carrying a bag before a venue entrance -->
 <rect x="85" y="99" width="710" height="330" rx="12" fill="#e9d9bf" stroke="${ink}" stroke-width="7"/>
 <rect x="124" y="128" width="635" height="69" rx="9" fill="${accent}"/>
 <text x="438" y="172" text-anchor="middle" font-family="Arial" font-size="22" font-weight="bold" fill="${ink}">${label}</text>
 <rect x="235" y="215" width="210" height="210" rx="8" fill="#9ac5d8" stroke="${ink}" stroke-width="7"/>
 <path d="M340 215V425" stroke="#e3f3fb" stroke-width="11"/>
 <rect x="540" y="240" width="116" height="150" rx="8" fill="#b4cfd8" stroke="${ink}" stroke-width="5"/>
 <circle cx="510" cy="250" r="33" fill="#dba67c"/><path d="M470 288L540 287 552 405H468Z" fill="#3d80af"/>
 <path d="M485 405L472 480M527 404L540 480" stroke="${ink}" stroke-width="18" stroke-linecap="round"/>
 <path d="M527 329L604 358" stroke="#dba67c" stroke-width="14" stroke-linecap="round"/>
 <rect x="582" y="350" width="66" height="87" rx="9" fill="${accent}" stroke="${ink}" stroke-width="6"/>
 <path d="M600 352Q612 320 630 352" fill="none" stroke="${ink}" stroke-width="6"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="520" viewBox="0 0 880 520" role="img" aria-label="Illustration pour une question de compréhension orale"><rect width="880" height="520" fill="${bg}"/><rect x="0" y="466" width="880" height="54" fill="#d7e5d8"/><text x="440" y="54" text-anchor="middle" font-family="Arial" font-size="26" fill="${ink}" font-weight="bold">${theme}</text>${scene}</svg>\n`;
};
for(const c of contexts){
 const version='tcf-listening-2026-11-test'+String(c.n).padStart(2,'0')+'-v1';
 const dir=join('assets/tcf-listening',version,'images');
 await mkdir(dir,{recursive:true});
 for(let n=1;n<=4;n++)await writeFile(join(dir,'q-'+String(n).padStart(2,'0')+'.svg'),svg(c,n));
 console.log('Illustrated Test '+c.n+' (4 original SVG scenes)');
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderCourseCards} from '../src/dashboard/courses.js';

test('all seven level buttons render with centered selector metadata and available status',()=>{
 const prior=globalThis.document;
 const makeNode=tag=>({
  tag,children:[],dataset:{},attributes:{},textContent:'',className:'',
  setAttribute(key,value){this.attributes[key]=value},
  append(...nodes){this.children.push(...nodes)}
 });
 try{
  globalThis.document={createElement:makeNode};
  const container={children:[],replaceChildren(...children){this.children=children}};
  renderCourseCards(container);
  assert.equal(container.children.length,7);
  const levels=['A0','A1','A2','B1','B2','C1','C2'];
  const counts=['30 interactive lessons','49 lessons','54 lessons','69 lessons','69 lessons','61 lessons','60 lessons'];
  container.children.forEach((card,i)=>{
   assert.equal(card.tag,'button');
   assert.equal(card.type,'button');
   assert.equal(card.dataset.courseLevel,levels[i]);
   assert.match(card.attributes['aria-label'],new RegExp('Open '+levels[i]));
   assert.equal(card.children[0].children[1].textContent,'Available now');
   assert.equal(card.children[2].textContent,counts[i]);
   assert.match(card.children[3].textContent,/Explore lessons/);
  });
 }finally{globalThis.document=prior}
});

test('dashboard navigation has a level chooser and a working back control, not an A0-only start CTA',()=>{
 const ui=readFileSync(new URL('../src/ui/template.js',import.meta.url),'utf8');
 const nav=readFileSync(new URL('../src/learning/dashboard-integration.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/styles/academy.css',import.meta.url),'utf8');
 assert.match(ui,/id="hz-course-chooser"/);
 assert.match(ui,/id="hz-back-to-levels"/);
 assert.doesNotMatch(ui,/Early-access drafts|courses are being developed|id="hz-open-a0"/i);
 assert.match(nav,/back\.addEventListener\('click'/);
 assert.match(nav,/checkAcademyAccess\(client\)/);
 assert.match(nav,/mountSecureA0\(area,client,level\)/);
 assert.match(css,/#hz-courses\.hz-grid\{display:flex;flex-wrap:wrap;justify-content:center/);
});

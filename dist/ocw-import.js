import {safeUrl,validCourse} from './course-model.js';
const decode=s=>String(s??'').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const k=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return k<=0x10ffff?String.fromCodePoint(k):'';}).replace(/&(amp|lt|gt|quot|apos|nbsp|ndash|mdash);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—'}[n]));
export const text=s=>decode(String(s??'').replace(/\{\{%\s*resource_link\s+"[^"]*"\s+"([^"]*)"[^}]*%\}\}/g,'$1').replace(/\{\{[%<][\s\S]*?[>%]\}\}/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const rows=s=>[...String(s).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
const cells=s=>[...s.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
const anchors=s=>[...String(s).matchAll(/<a\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>({url:decode(m[1]),title:text(m[2])}));
const unique=rs=>rs.filter((r,i)=>rs.findIndex(x=>x.url===r.url)===i);
function normalizePath(p){p=p.replace(/\\/g,'/');if(p.startsWith('/')||p.split('/').includes('..')||p.includes('\0'))throw Error('This package contains an unsafe file path.');return p.replace(/^\.\//,'');}
export function parsePackage(input){
 const all=new Map();for(const [p,d] of Object.entries(input))all.set(normalizePath(p),d);
 const roots=[...all.entries()].filter(([p,d])=>p.endsWith('data.json')&&d?.course_title&&d?.site_url_path);
 if(roots.length!==1)throw Error(roots.length?'Choose one course package at a time.':'This is not a supported MIT OCW package. Include the course’s data.json, pages, and resources folders.');
 const [rootPath,meta]=roots[0],prefix=rootPath.slice(0,-'data.json'.length);
 const entries=new Map([...all].filter(([p])=>p.startsWith(prefix)).map(([p,d])=>[p.slice(prefix.length),d]));
 const id=String(meta.site_url_path).replace(/^\/?courses\//,'').replace(/\/$/,'').toLowerCase();if(!/^[-a-z0-9]{3,180}$/.test(id))throw Error('The package has an invalid OCW course identifier.');
 const base='https://ocw.mit.edu/courses/'+id+'/';
 const docs=[...entries].map(([path,data])=>({path,...data})).filter(d=>d.title||d.content);
 const resources=docs.filter(d=>d.content_type==='resource'),byPath=new Map(resources.map(d=>[d.path.replace(/data\.json$/,'index.html'),d]));
 const byFile=new Map(resources.filter(d=>d.file).map(d=>[d.file.split('/').pop().replace(/^[a-f0-9]{32}_/,''),d]));
 const warnings=[];
 function resourceUrl(d){const vid=d.video_metadata?.youtube_id;if(/^[\w-]{11}$/.test(vid||''))return 'https://www.youtube.com/watch?v='+vid;if(d.file){const u=new URL(d.file,'https://ocw.mit.edu');if(u.hostname==='ocw.mit.edu')return safeUrl(u.href);}return base+d.path.replace(/data\.json$/,'');}
 function resolve(href,path){
  if(/^(?:https?:)?\/\//i.test(href))return safeUrl(new URL(href,'https://ocw.mit.edu').href);
  if(href.startsWith('#'))return '';
  if(href.startsWith('/courses/'))return safeUrl('https://ocw.mit.edu'+href);
  const local=new URL(href,'https://package.invalid/'+path.replace(/data\.json$/,'index.html')).pathname.slice(1);
  const resource=byPath.get(local)||byFile.get(local.split('/').pop());if(resource)return resourceUrl(resource);
  if(/^(pages|video_galleries|resources|external-resources)\//.test(local))return base+local.replace(/index\.html$/,'');
  if(/^(?:mailto|javascript|data|file):/i.test(href))return '';
  return '';
 }
 const links=(s,path)=>unique(anchors(s).map(r=>({...r,url:resolve(r.url,path)})).filter(r=>r.url&&r.title));
 const modules=[],lessons=new Map(),assignments=[];
 const addModule=title=>{let idx=modules.findIndex(m=>m.title===title);if(idx<0){idx=modules.length;modules.push({title,description:'Follow the original course resources.',icon:'▤',range:''});}return idx;};
 const ensure=(n,title,module=0)=>{if(!lessons.has(n))lessons.set(n,{id:n,title:title||'Session '+n,module,videos:[],notebooks:[]});return lessons.get(n);};
 const materials=docs.find(d=>/course materials/i.test(d.title||''));
 if(materials){
  const sectionNames=['Images & abstraction','Data & epidemic models','Simulation & ray tracing','Climate & scientific computing'];
  for(const row of rows(materials.content)){const cs=cells(row),m=text(cs[0]).match(/^(\d+)\.\s*(.+)/);if(!m||cs.length<3)continue;const n=Number(m[1]),module=id.startsWith('18-s191-')?(n<=6?0:n<=13?1:n<=19?2:3):0;while(modules.length<=module)addModule(sectionNames[modules.length]||'Course sessions');const l=ensure(n,m[2],module);l.videos=links(cs[1],materials.path);l.notebooks=links(cs[2],materials.path);}
 }
 if(!lessons.size){
  addModule('Course sessions');
  for(const r of resources){const m=r.title?.match(/^Lecture\s+(\d+)\s*[:.\-–]?\s*(.*)/i);if(!m)continue;const n=Number(m[1]),l=ensure(n,m[2]||r.title);if(r.video_metadata?.youtube_id){l.title=m[2]||r.title;l.videos.push({title:r.title,url:resourceUrl(r)});}else if(r.file)l.notebooks.push({title:r.title,url:resourceUrl(r)});}
  for(const d of docs.filter(d=>/lecture notes/i.test(d.title||'')&&d.content))for(const row of rows(d.content)){const cs=cells(row),n=Number(text(cs[0]));if(!Number.isInteger(n)||n<1)continue;const rs=cs.slice(1).flatMap(c=>links(c,d.path));if(!rs.length)continue;const l=ensure(n,rs[0].title.replace(/^Lecture\s+\d+:?\s*/i,'').replace(/\s*notes\s*\(PDF\)/i,''));l.notebooks.push(...rs);}
  // Reading-only packages use the course's actual session and unit table.
  if(!lessons.size){modules.length=0;for(const d of docs.filter(d=>/readings|lecture notes/i.test(d.title||'')&&d.content)){let module=addModule('Course sessions');for(const row of rows(d.content)){const cs=cells(row),label=text(cs[0]),n=Number(label);if(cs.length===1&&/unit|part|section/i.test(label)){module=addModule(label);continue;}if(!Number.isInteger(n)||n<1||cs.length<2)continue;const rs=cs.slice(1).flatMap(c=>links(c,d.path));if(!rs.length)continue;const l=ensure(n,'Session '+n+' · '+rs.map(r=>r.title.replace(/\s*\(PDF\)/i,'')).join(' / '),module);l.notebooks.push(...rs);}}}
 }
 for(const d of docs.filter(d=>/assignments|problem sets/i.test(d.title||'')&&d.content)){
  for(const row of rows(d.content)){const cs=cells(row);if(!cs.length)continue;const rs=links(row,d.path);if(!rs.length)continue;const numbered=text(cs[0]).match(/^\s*(\d+)$/);const match=rs.find(r=>/problem set|homework|assignment/i.test(r.title))?.title.match(/(?:problem set|homework|assignment)\s*(\d+)/i);if(!match&&!numbered)continue;const n=match?Number(match[1]):Number(numbered[1]);if(assignments.some(a=>a.number===n))continue;const milestone=cs[2]?text(cs[2]).match(/\d+/):null;assignments.push({id:assignments.length+1,number:n,title:'Problem Set '+n,url:rs[0].url,links:rs,lecture:milestone?Number(milestone[0]):null});
  }
 }
 if(!lessons.size){for(const d of docs.filter(d=>d.content_type==='page'&&d.content&&!/syllabus|calendar|assignments|home/i.test(d.title||''))){const rs=links(d.content,d.path);if(rs.length){const l=ensure(lessons.size+1,d.title,addModule('Course resources'));l.notebooks=rs;}}}
 if(!lessons.size)throw Error('No study sessions could be found. This package format needs a custom mapping.');
 const used=new Set([...lessons.values()].flatMap(l=>[...l.videos,...l.notebooks]).concat(assignments.flatMap(a=>a.links)).map(r=>r.url));
 const shelf=unique(docs.filter(d=>d.content&&d.title&&!/course materials|lecture notes|readings|assignments|problem sets/i.test(d.title)).flatMap(d=>[{title:d.title,url:base+d.path.replace(/data\.json$/,'')},...links(d.content,d.path)])).filter(r=>!used.has(r.url));
 const textbooks=resources.filter(r=>(r.learning_resource_types||[]).includes('Open Textbooks')).map(r=>({title:r.title,url:resourceUrl(r)}));
 const lectures=[...lessons.values()].sort((a,b)=>a.id-b.id).map(l=>({...l,videos:unique(l.videos),notebooks:unique(l.notebooks)}));
 const active=modules.map((m,i)=>({m,i})).filter(({i})=>lectures.some(l=>l.module===i));const finalModules=active.map(({m,i})=>{const ls=lectures.filter(l=>l.module===i);return {...m,range:String(ls[0].id).padStart(2,'0')+'–'+String(ls.at(-1).id).padStart(2,'0')};});for(const l of lectures)l.module=active.findIndex(({i})=>i===l.module);
 if(!assignments.length)warnings.push('No assignment section was found; no assignments have been invented.');if(!lectures.some(l=>l.videos.length))warnings.push('This package has no lecture videos. The journey follows its reading sessions.');
 const syllabus=docs.find(d=>/syllabus/i.test(d.title||''));
 const c={version:1,id,title:text(meta.course_title),number:text(meta.primary_course_number),term:text([meta.term,meta.year].filter(Boolean).join(' ')),url:base,description:text(meta.course_description||meta.course_description_html),instructors:(meta.instructors||[]).map(x=>text(x.title||[x.first_name,x.last_name].join(' '))),modules:finalModules,lectures,assignments,resources:unique([...textbooks,...shelf]),setup:materials?links(materials.content.split('<table>')[0],materials.path).slice(0,3):[],syllabus:text(syllabus?.content||''),warnings};
 if(!validCourse(c))throw Error('The package produced an invalid course. It has not been added.');
 return c;
}
export const MAX_JSON=2_000_000,MAX_TOTAL=20_000_000,MAX_ENTRIES=15000;
export function checkMetadataSize(size,total){if(size>MAX_JSON||total>MAX_TOTAL)throw Error('The package’s course metadata exceeds the import limit.');}
export async function readFolder(files){if(files.length>MAX_ENTRIES)throw Error('This folder has too many files.');const records=Object.create(null);let total=0;for(const f of files){const path=f.webkitRelativePath||f.name;if(!/data\.json$/i.test(path)||path.includes('__MACOSX/'))continue;total+=f.size;checkMetadataSize(f.size,total);try{records[path]=JSON.parse(await f.text());}catch{throw Error('Could not read metadata file: '+path);}}return parsePackage(records);}

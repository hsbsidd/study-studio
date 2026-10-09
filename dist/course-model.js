export const ORIGINAL_ID='18-s191-introduction-to-computational-thinking-fall-2020';
export const blankProgress=()=>({version:1,name:'',pace:2,lectures:{},resources:{},assignments:{},notes:{},bookmarks:[],setup:{}});
export const safeUrl=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
export function validCourse(c){
 if(!c||c.version!==1||!/^[-a-z0-9]{3,180}$/.test(c.id)||typeof c.title!=='string'||!c.title||c.title.length>300||!safeUrl(c.url)||new URL(c.url).hostname!=='ocw.mit.edu')return false;
 if(!Array.isArray(c.modules)||!c.modules.length||!Array.isArray(c.lectures)||!c.lectures.length||c.lectures.length>1000||!Array.isArray(c.assignments)||!Array.isArray(c.resources))return false;
 const resource=r=>r&&typeof r.title==='string'&&r.title.length<=600&&!!safeUrl(r.url);
 const ids=new Set();
 for(const l of c.lectures){if(!Number.isInteger(l.id)||l.id<1||ids.has(l.id)||typeof l.title!=='string'||l.title.length>600||!Number.isInteger(l.module)||!c.modules[l.module]||!Array.isArray(l.videos)||!Array.isArray(l.notebooks)||!l.videos.every(resource)||!l.notebooks.every(resource))return false;ids.add(l.id);}
 const aids=new Set();for(const a of c.assignments){if(!Number.isInteger(a.id)||a.id<1||aids.has(a.id)||!resource(a)||(a.links&&!a.links.every(resource)))return false;aids.add(a.id);}
 return c.resources.every(resource)&&c.modules.every(m=>m&&typeof m.title==='string'&&m.title.length<=300)&&typeof c.description==='string'&&c.description.length<=20000&&typeof c.syllabus==='string'&&c.syllabus.length<=100000;
}
export function validProgress(s,c){
 if(!s||s.version!==1||typeof s.name!=='string'||s.name.length>80||!Number.isInteger(s.pace)||s.pace<1||s.pace>7)return false;
 for(const k of ['lectures','resources','assignments','notes','setup'])if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))return false;
 const ids=new Set(c.lectures.map(l=>String(l.id))),aids=new Set(c.assignments.map(a=>String(a.id)));
 return Object.entries(s.lectures).every(([k,v])=>ids.has(k)&&typeof v==='boolean')&&Object.entries(s.resources).every(([k,v])=>/^\d+-(video|notebook)-\d+$/.test(k)&&typeof v==='boolean')&&Object.entries(s.assignments).every(([k,v])=>aids.has(k)&&['not-started','working','review','complete'].includes(v))&&Object.entries(s.notes).every(([k,v])=>/^(lecture-\d+|homework-\d+|journal)$/.test(k)&&typeof v==='string'&&v.length<=200000)&&Array.isArray(s.bookmarks)&&s.bookmarks.every(n=>ids.has(String(n)))&&Object.entries(s.setup).every(([k,v])=>/^[\w-]{1,80}$/.test(k)&&typeof v==='boolean');
}
export function summary(c,s){const sessions=c.lectures.filter(l=>s.lectures[l.id]).length,assignments=c.assignments.filter(a=>s.assignments[a.id]==='complete').length,total=c.lectures.length+c.assignments.length;return {completed:sessions+assignments,total,percent:total?Math.round((sessions+assignments)/total*100):0};}
// Only these numerical fields leave the private progress document.
export function sharedSummary(c,s){return {courseId:c.id,...summary(c,s)};}

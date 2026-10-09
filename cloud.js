import {nextRevision,serializeProgress} from './sync-core.js';
import {blankProgress,validCourse,validProgress,sharedSummary,ORIGINAL_ID} from './course-model.js';
const sdk='https://www.gstatic.com/firebasejs/12.19.0/';
let auth,db,a,d,hooks,currentUser=null,accessReady=false,progressReady=false,active=null,revision=0;
let pending=null,writing=null,timer=null,generation=0,selection=0,fault=null,mine=[],profiles=[],partnerRows=[],subscriptions=[];
const definitions=new Map();
const ref=(...path)=>d.doc(db,...path);
const progressRef=(uid,id)=>ref('learners',uid,'progress',id);
const catalogRef=(uid,id)=>ref('catalogues',uid,'courses',id);
const status=text=>hooks.status(text);
const errorMessage=e=>({'auth/invalid-credential':'The email or password is incorrect.','auth/email-already-in-use':'An account may already use this email. Try signing in or resetting your password.','auth/invalid-email':'Enter a valid email address.','auth/weak-password':'Choose a password with at least 8 characters.','auth/too-many-requests':'Too many attempts. Please wait a moment.','auth/network-request-failed':'Could not connect. Check your internet connection.','permission-denied':'This studio is reserved for your two verified accounts. If this is your account, check the allowed email addresses in Firebase.','unavailable':'Could not reach the server. Check your connection and retry.'}[e.code]||e.message||'Something went wrong. Please try again.');
function reset(){subscriptions.forEach(fn=>fn());subscriptions=[];mine=[];profiles=[];partnerRows=[];accessReady=false;progressReady=false;active=null;pending=null;fault=null;revision=0;clearTimeout(timer);}
async function definition(id){if(definitions.has(id))return definitions.get(id);const snap=await d.getDocFromServer(ref('courseDefinitions',id));if(!snap.exists())throw Error('This course definition is missing.');const course=JSON.parse(snap.data().payload);if(!validCourse(course)||course.id!==id)throw Error('This course definition is invalid.');definitions.set(id,course);return course;}
function emitCatalog(){hooks.catalog(mine,profiles.filter(p=>p.uid!==currentUser?.uid),partnerRows);}
async function rowsFrom(snapshot){return Promise.all(snapshot.docs.map(async row=>({...row.data(),course:await definition(row.id)})));}
async function loadUser(user){
 const epoch=++generation;reset();currentUser=user;hooks.session(user?{uid:user.uid,email:user.email,verified:user.emailVerified}:null);
 if(!user){status('Sign in to save progress');return;}if(!user.emailVerified){status('Verify your email to save');return;}
 status('Loading your catalogue…');
 try{
  const settings=await d.getDocFromServer(ref('studio','settings'));
  if(!settings.exists()||!settings.data().allowedEmails?.includes(user.email.toLowerCase()))throw Error('This studio is reserved for the two configured email addresses.');
  const legacy=await d.getDocFromServer(ref('progress',user.uid));
  const existing=await d.getDocs(d.collection(db,'catalogues',user.uid,'courses'));
  if(epoch!==generation)return;
  mine=await rowsFrom(existing);
  if(legacy.exists()&&!mine.some(x=>x.courseId===ORIGINAL_ID)){
   const previous=JSON.parse(legacy.data().payload),original=await definition(ORIGINAL_ID);
   if(!validProgress(previous,original))throw Error('Your previous progress needs a manual migration. It has been kept safe.');
   await addCourse(original,'migration',previous,true);
  }
  const profile=await d.getDocFromServer(ref('profiles',user.uid));if(!profile.exists())await d.setDoc(ref('profiles',user.uid),{uid:user.uid,email:user.email,name:user.email.split('@')[0]});
  if(epoch!==generation)return;accessReady=true;status('All changes saved');emitCatalog();
  subscriptions.push(d.onSnapshot(d.collection(db,'catalogues',user.uid,'courses'),async snap=>{try{const rows=await rowsFrom(snap);if(epoch!==generation)return;mine=rows;emitCatalog();}catch(e){hooks.error(errorMessage(e));}},e=>hooks.error(errorMessage(e))));
  let partnerOff=null,partnerUid=null;
  subscriptions.push(()=>partnerOff?.());
  subscriptions.push(d.onSnapshot(d.collection(db,'profiles'),snap=>{
   if(epoch!==generation)return;profiles=snap.docs.map(x=>x.data());const partner=profiles.find(p=>p.uid!==user.uid);emitCatalog();
   if(partner?.uid===partnerUid)return;partnerOff?.();partnerUid=partner?.uid;partnerRows=[];emitCatalog();
   if(partnerUid)partnerOff=d.onSnapshot(d.collection(db,'catalogues',partnerUid,'courses'),async snap=>{try{const rows=await rowsFrom(snap);if(epoch!==generation)return;partnerRows=rows;emitCatalog();}catch(e){hooks.error(errorMessage(e));}},e=>hooks.error(errorMessage(e)));
  },e=>hooks.error(errorMessage(e))));
 }catch(e){if(epoch===generation){fault=e;status('Catalogue unavailable');hooks.error(errorMessage(e));}}
}
async function addCourse(course,source='upload',initial=blankProgress(),migrating=false){
 if(!currentUser?.emailVerified||(!accessReady&&!migrating))throw Error('Sign in with your verified studio account first.');
 if(!validCourse(course)||!validProgress(initial,course))throw Error('This course or progress is invalid.');
 const payload=JSON.stringify(course);if(new TextEncoder().encode(payload).length>700000)throw Error('This course has too much metadata to store.');
 const uid=currentUser.uid,epoch=generation;
 const result=await d.runTransaction(db,async tx=>{
  const definitionRef=ref('courseDefinitions',course.id),entryRef=catalogRef(uid,course.id),privateRef=progressRef(uid,course.id);
  const [known,entry,privateRow]=await Promise.all([tx.get(definitionRef),tx.get(entryRef),tx.get(privateRef)]);
  const chosen=known.exists()?JSON.parse(known.data().payload):course;if(!validCourse(chosen)||chosen.id!==course.id)throw Error('The existing course definition is invalid.');
  if(entry.exists())return {course:chosen,added:false};
  if(!known.exists())tx.set(definitionRef,{payload,createdBy:uid,createdAt:d.serverTimestamp()});
  const state=privateRow.exists()?JSON.parse(privateRow.data().payload):initial;
  if(!privateRow.exists())tx.set(privateRef,{payload:serializeProgress(state),revision:1,updatedAt:d.serverTimestamp()});
  tx.set(entryRef,{...sharedSummary(chosen,state),source,addedAt:d.serverTimestamp(),updatedAt:d.serverTimestamp()});
  return {course:chosen,added:true};
 });
 if(epoch===generation){definitions.set(course.id,result.course);if(!mine.some(x=>x.courseId===course.id))mine.push({...sharedSummary(result.course,initial),source,course:result.course});emitCatalog();}
 return result;
}
export const cloud={
 async init(config,callbacks,starterCourses=[]){hooks=callbacks;starterCourses.forEach(c=>definitions.set(c.id,c));if(!config.apiKey||!config.projectId)return false;try{const [app,authApi,dbApi]=await Promise.all([import(sdk+'firebase-app.js'),import(sdk+'firebase-auth.js'),import(sdk+'firebase-firestore.js')]);a=authApi;d=dbApi;const instance=app.initializeApp(config);auth=a.getAuth(instance);db=d.getFirestore(instance);await a.setPersistence(auth,a.browserLocalPersistence);a.onAuthStateChanged(auth,loadUser);return true;}catch(e){status('Sign-in unavailable');hooks.error(errorMessage(e));return false;}},
 get user(){return currentUser;},get ready(){return accessReady&&progressReady;},get catalogReady(){return accessReady;},get activeId(){return active;},get dirty(){return !!pending||!!writing;},
 definition,addCourse,
 async open(id){const selected=++selection;await cloud.flush();if(!accessReady||!mine.some(x=>x.courseId===id))throw Error('Add this course to your catalogue first.');const epoch=generation;progressReady=false;status('Loading your course…');const course=await definition(id);const row=await d.getDocFromServer(progressRef(currentUser.uid,id));if(epoch!==generation||selected!==selection)return null;const state=row.exists()?JSON.parse(row.data().payload):blankProgress();if(!validProgress(state,course))throw Error('Saved progress is invalid. Export your backup before continuing.');active=id;revision=row.data()?.revision||0;progressReady=true;fault=null;status('All changes saved');return {course,state};},
 async action(mode,email,password){if(!auth)throw Error('Email accounts are not configured.');const settings={url:new URL('./',location.href).href};try{
  if(mode==='signup'){if(password.length<8)throw Error('Use at least 8 characters.');const r=await a.createUserWithEmailAndPassword(auth,email,password);await a.sendEmailVerification(r.user,settings);return 'Check your email, verify your address, then select “I verified my email.”';}
  if(mode==='signin'){await a.signInWithEmailAndPassword(auth,email,password);return 'Signed in.';}
  if(mode==='reset'){await a.sendPasswordResetEmail(auth,email,settings);return 'If an account exists, a password reset link has been sent. Check your inbox and spam folder.';}
  if(mode==='resend'){await a.sendEmailVerification(auth.currentUser,settings);return 'Verification email sent.';}
  if(mode==='verify'){await a.reload(auth.currentUser);await auth.currentUser.getIdToken(true);await loadUser(auth.currentUser);if(!auth.currentUser.emailVerified)throw Error('Open the link in your verification email first.');return 'Email verified.';}
 }catch(e){throw Error(errorMessage(e));}},
 save(state,course){if(!cloud.ready||active!==course.id)return false;try{pending={payload:serializeProgress(state),summary:sharedSummary(course,state),uid:currentUser.uid,id:active,epoch:generation};}catch(e){hooks.error(errorMessage(e));status('Not saved · export a backup');return false;}status(fault?'Not synced · retry in Account':'Saving…');clearTimeout(timer);timer=setTimeout(()=>cloud.flush().catch(()=>{}),650);return true;},
 async flush(){clearTimeout(timer);if(writing){await writing;return cloud.flush();}if(!pending)return;if(fault)throw fault;const job=pending;pending=null;writing=(async()=>{try{const expected=revision;const next=await d.runTransaction(db,async tx=>{const privateRef=progressRef(job.uid,job.id),entryRef=catalogRef(job.uid,job.id);const [row,entry]=await Promise.all([tx.get(privateRef),tx.get(entryRef)]);const rev=nextRevision(row.exists()?row.data().revision:0,expected);if(!entry.exists())throw Error('Course catalogue entry is missing.');tx.set(privateRef,{payload:job.payload,revision:rev,updatedAt:d.serverTimestamp()});tx.update(entryRef,{...job.summary,updatedAt:d.serverTimestamp()});return rev;});if(job.epoch===generation){revision=next;status(pending?'Saving…':'All changes saved');}}catch(e){if(job.epoch===generation){pending=pending||job;fault=e;status(e.code==='sync/conflict'?'Sync conflict · export your draft':'Not synced · retry in Account');hooks.error(errorMessage(e));}throw e;}finally{writing=null;}})();await writing;if(pending)return cloud.flush();},
 async retry(){if(fault?.code==='sync/conflict')throw Error(errorMessage(fault));fault=null;if(!accessReady)return loadUser(currentUser);if(!progressReady&&active)return cloud.open(active);return cloud.flush();},
 async signout(){await cloud.flush();await a.signOut(auth);}
};
window.addEventListener('beforeunload',e=>{if(cloud.dirty){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')cloud.flush().catch(()=>{});});

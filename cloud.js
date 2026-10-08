import {nextRevision, serializeProgress} from './sync-core.js';
const sdk = 'https://www.gstatic.com/firebasejs/12.19.0/';
let auth, db, authApi, dbApi, currentUser=null, revision=0, ready=false;
let pending=null, writing=null, timer=null, generation=0, hooks, fault=null;
const copy = value=>JSON.parse(JSON.stringify(value));
const safeError=error=>({
 'auth/invalid-credential':'The email or password is incorrect.',
 'auth/email-already-in-use':'An account may already use this email. Try signing in or resetting your password.',
 'auth/invalid-email':'Enter a valid email address.',
 'auth/weak-password':'Choose a stronger password with at least 8 characters.',
 'auth/too-many-requests':'Too many attempts. Please wait a moment and try again.',
 'auth/network-request-failed':'Could not connect. Check your internet connection.',
 'auth/operation-not-allowed':'Email sign-in has not been enabled yet. Please contact the site owner.',
 'permission-denied':'Could not access your progress. Verify your email, then try again. The site owner may also need to publish the database rules.',
 'unavailable':'Progress could not reach the server. Check your connection and retry.'
}[error.code]||error.message||'Something went wrong. Please try again.');
function status(text){hooks.status(text);}
async function loadUser(user){
 const epoch=++generation;ready=false;pending=null;fault=null;revision=0;clearTimeout(timer);currentUser=user;
 hooks.session(user ? {email:user.email,verified:user.emailVerified}:null);
 if(!user){status('Sign in to save progress');return;}
 if(!user.emailVerified){status('Verify your email to save');return;}
 status('Loading your progress…');
 try{
  const snapshot=await dbApi.getDocFromServer(dbApi.doc(db,'progress',user.uid));
  if(epoch!==generation)return;
  const row=snapshot.exists()?snapshot.data():null;
  const data=row?JSON.parse(row.payload):null;
  if(data&&!hooks.validate(data))throw new Error('Saved progress is not in a supported format. Please contact the site owner.');
  revision=row?.revision||0;hooks.data(data);ready=true;status('All changes saved');
 }catch(e){if(epoch===generation){fault=e;status('Progress unavailable');hooks.error(safeError(e));}}
}
export const cloud={
 async init(config,callbacks){
  hooks=callbacks;
  if(!config.apiKey||!config.projectId||!config.authDomain||!config.appId){status('Accounts are being set up');return false;}
  try{
   const [appApi,a,d]=await Promise.all([import(sdk+'firebase-app.js'),import(sdk+'firebase-auth.js'),import(sdk+'firebase-firestore.js')]);
   authApi=a;dbApi=d;const app=appApi.initializeApp(config);auth=a.getAuth(app);db=d.getFirestore(app);
   await a.setPersistence(auth,a.browserLocalPersistence);
   a.onAuthStateChanged(auth,loadUser);return true;
  }catch(e){status('Sign-in unavailable');hooks.error(safeError(e));return false;}
 },
 get user(){return currentUser;}, get ready(){return ready;}, get dirty(){return !!pending||!!writing;},
 async action(mode,email,password){
  if(!auth)throw new Error('Email accounts are not configured yet. Please try again after setup is complete.');
  const settings={url:new URL('./',location.href).href};
  try{
   if(mode==='signup'){
    if(password.length<8)throw new Error('Use at least 8 characters for your password.');
    const result=await authApi.createUserWithEmailAndPassword(auth,email,password);
    await authApi.sendEmailVerification(result.user,settings);
    return 'Account created. Check your email, verify your address, then choose “I verified my email.”';
   }
   if(mode==='signin'){await authApi.signInWithEmailAndPassword(auth,email,password);return 'Signed in.';}
   if(mode==='reset'){await authApi.sendPasswordResetEmail(auth,email,settings);return 'If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.';}
   if(mode==='resend'){await authApi.sendEmailVerification(auth.currentUser,settings);return 'Verification email sent. Check your inbox and spam folder.';}
   if(mode==='verify'){
    await authApi.reload(auth.currentUser);await auth.currentUser.getIdToken(true);
    await loadUser(auth.currentUser);
    if(!auth.currentUser.emailVerified)throw new Error('Your email is not verified yet. Open the link in your email first.');
    return 'Email verified. Your account is ready.';
   }
  }catch(e){throw new Error(safeError(e));}
 },
 save(state){
  if(!ready||!currentUser?.emailVerified){return false;}
  try{pending={payload:serializeProgress(copy(state)),uid:currentUser.uid,epoch:generation};}
  catch(e){hooks.error(safeError(e));status('Not saved · export a backup');return false;}
  status(fault?'Not synced · retry in Account':'Saving…');clearTimeout(timer);timer=setTimeout(()=>cloud.flush().catch(()=>{}),650);return true;
 },
 async flush(){
  clearTimeout(timer);
  if(writing){await writing;return cloud.flush();}
  if(!pending)return;
  if(fault)throw fault;
  const job=pending;pending=null;
  writing=(async()=>{
   try{
    const expected=revision;
    const updated=await dbApi.runTransaction(db,async transaction=>{
     const ref=dbApi.doc(db,'progress',job.uid),snapshot=await transaction.get(ref);
     const next=nextRevision(snapshot.exists()?snapshot.data().revision:0,expected);
     transaction.set(ref,{payload:job.payload,revision:next,updatedAt:dbApi.serverTimestamp()});return next;
    });
    if(job.epoch===generation){revision=updated;status(pending?'Saving…':'All changes saved');}
   }catch(e){if(job.epoch===generation){pending=pending||job;fault=e;status(e.code==='sync/conflict'?'Sync conflict · export your draft':'Not synced · retry in Account');hooks.error(safeError(e));}throw e;}
   finally{writing=null;}
  })();
  await writing;if(pending)return cloud.flush();
 },
 async retry(){if(fault?.code==='sync/conflict')throw new Error(safeError(fault));fault=null;if(!ready&&currentUser)return loadUser(currentUser);return cloud.flush();},
 async signout(){await cloud.flush();await authApi.signOut(auth);},
};
window.addEventListener('beforeunload',event=>{if(cloud.dirty){event.preventDefault();event.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')cloud.flush().catch(()=>{});});

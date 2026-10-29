/* ═══ workout/wake ═══
   Mantener la pantalla activa durante el entreno.
   Define: ffWL, ffWake
*/
let ffWL=null;
const ffWake=async()=>{try{const want=!!(((W&&!W.p&&S.awk!==0)||(WDS&&!WDS.pa&&!WDS.done))&&document.visibilityState=='visible');if(want&&!ffWL&&navigator.wakeLock){const l=await navigator.wakeLock.request('screen');ffWL=l;l.addEventListener('release',()=>{if(ffWL===l)ffWL=null})}else if(!want&&ffWL){const l=ffWL;ffWL=null;await l.release()}}catch(e){ffWL=null}};
document.addEventListener('visibilitychange',ffWake);

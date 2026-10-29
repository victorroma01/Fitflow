/* ═══ core/state ═══
   Estado global S, guardado sv/th y banderas de interfaz.
   Define: S, W, ND, CM, VW, AD, RS, sv, th, zOV, zWV
*/
let S=Object.assign({tab:0,prog:0,plan:parse(0),wk:1,sel:0,done:{},logs:[],last:{},rest:120,theme:'',notif:1,pf:{},nu:{k:1942,c:50,p:20,f:30,n:3},meals:{},lib:[],cf:[],cx:[]},L(Store.K.app)||{});
let W=null,ND=0,CM=0,VW=0,AD=null,RS=0;
const sv=()=>L(Store.K.app,S),th=()=>{S.theme?document.documentElement.dataset.theme=S.theme:document.documentElement.removeAttribute('data-theme')};
let zOV=0,zWV=0;

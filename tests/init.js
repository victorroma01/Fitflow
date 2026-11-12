// Se ejecuta antes de la app: azar determinista, contador de pitidos y vibración neutra.
(function(){let a=0x9E3779B9;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 window.__beeps=0;if(window.OscillatorNode){const o=OscillatorNode.prototype.start;OscillatorNode.prototype.start=function(){window.__beeps++;try{return o.apply(this,arguments)}catch(e){}}}
 try{navigator.vibrate=function(){return true}}catch(e){}
})();
// y cada bloqueo de la CSP (build.py) queda en window.__csp: las pruebas comprueban que la app no choca con ella
document.addEventListener('securitypolicyviolation',function(e){(window.__csp=window.__csp||[]).push(e.violatedDirective+' '+String(e.blockedURI).slice(0,80))});
// Sesión de prueba: sin cuenta, la app solo enseña el inicio de sesión (account/login). tests/cloud.py prueba la cuenta de
// verdad y la quita antes con window.__sfNoSession.
if(!window.__sfNoSession)try{if(!localStorage.getItem('ffacct')){localStorage.setItem('ffacct',JSON.stringify({uid:'prueba',u:'Prueba',it:'x.e30.x',rt:'x',exp:4102444800000}));localStorage.setItem('ffown','prueba')}}catch(e){}
// con el recorrido de la primera vez (system/tour) ya visto, para que no tape las pantallas de las pruebas: tests/experience.py
// lo prueba quitándolo (delete S.tourSeen) y tests/cloud.py, con cuentas nuevas de verdad
if(!window.__sfNoSession)try{if(!localStorage.getItem('ff'))localStorage.setItem('ff',JSON.stringify({_parts:1,tour:1}))}catch(e){}
// y sin red hacia Firebase: la sincronización ve «sin conexión», sin errores en la consola (tests/cloud.py pone su servidor
// de prueba con window.__sfNet)
if(!window.__sfNet){const f=window.fetch;window.fetch=function(u){if(/googleapis\.com/.test(String(u&&u.url||u)))return Promise.reject(new TypeError('Failed to fetch'));return f.apply(this,arguments)}}
// Lo guardado por la app, completo (core/persist): el núcleo de localStorage y las partes (entrenos, historial y comidas), de
// IndexedDB o de localStorage. Promesa con el estado con sus claves guardadas, o null; tras guardar, después de savesDone().
window.__stored=function(){
 var core=JSON.parse(localStorage.getItem('ff')||'null');if(!core)return Promise.resolve(null);
 var local=function(){var o={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf('ff:')==0)o[k]=localStorage.getItem(k)}return Promise.resolve(o)};
 var idb=function(){return new Promise(function(res,rej){var r=indexedDB.open('ffdata',1);r.onupgradeneeded=function(){r.result.createObjectStore('parts')};r.onerror=function(){rej(r.error)};r.onsuccess=function(){var db=r.result,o={},tx=db.transaction('parts','readonly'),st=tx.objectStore('parts'),ks=st.getAllKeys(),vs=st.getAll();tx.oncomplete=function(){ks.result.forEach(function(k,i){o[k]=vs.result[i]});db.close();res(o)};tx.onerror=function(){db.close();rej(tx.error)}}})};
 return (core._parts>=2?idb():local()).then(function(parts){
  var s=Object.assign({},core);delete s._parts;delete s._pk;
  ['logs','hist','meals'].forEach(function(k){if(s[k]!=='ff:'+k)return;if(k=='meals'){var m={};Object.keys(parts).sort().forEach(function(p){if(p.indexOf('ff:meals:')==0)Object.assign(m,JSON.parse(parts[p]))});s.meals=m}else s[k]=parts['ff:'+k]?JSON.parse(parts['ff:'+k]):(k=='logs'?[]:{})});
  return s})};

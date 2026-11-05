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
// lo prueba quitándolo (delete S.tour) y tests/cloud.py, con cuentas nuevas de verdad
if(!window.__sfNoSession)try{if(!localStorage.getItem('ff'))localStorage.setItem('ff',JSON.stringify({_parts:1,tour:1}))}catch(e){}
// y sin red hacia Firebase: la sincronización ve «sin conexión», sin errores en la consola (tests/cloud.py pone su servidor
// de prueba con window.__sfNet)
if(!window.__sfNet){const f=window.fetch;window.fetch=function(u){if(/googleapis\.com/.test(String(u&&u.url||u)))return Promise.reject(new TypeError('Failed to fetch'));return f.apply(this,arguments)}}

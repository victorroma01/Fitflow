// Se ejecuta antes de la app: azar determinista, contador de pitidos y vibración neutra.
(function(){let a=0x9E3779B9;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 window.__beeps=0;if(window.OscillatorNode){const o=OscillatorNode.prototype.start;OscillatorNode.prototype.start=function(){window.__beeps++;try{return o.apply(this,arguments)}catch(e){}}}
 try{navigator.vibrate=function(){return true}}catch(e){}
})();
// y cada bloqueo de la CSP (build.py) queda en window.__csp: las pruebas comprueban que la app no choca con ella
document.addEventListener('securitypolicyviolation',function(e){(window.__csp=window.__csp||[]).push(e.violatedDirective+' '+String(e.blockedURI).slice(0,80))});

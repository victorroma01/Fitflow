/* ═══ profile/feedback ═══
   Sonido, vibración y avisos de descanso.
   Define: zac, zA, zbp, ffCanVib, ffVib, sndVol, sndSeq, setX  · acciones/registros: 8
*/
let zac=null;
const zA=()=>{const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;zac=zac||new C();if(zac.state=='suspended')zac.resume();return zac};
document.addEventListener('pointerdown',()=>{try{zA()}catch(e){}},{once:true});
const zbp=f=>{if(S.snd===0)return;try{const c=zA(),n=c.currentTime;sndSeq(f).forEach(([hz,s,d])=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,n+s);g.gain.linearRampToValueAtTime(.22*sndVol(),n+s+.01);g.gain.exponentialRampToValueAtTime(.001,n+s+d);o.connect(g);g.connect(c.destination);o.start(n+s);o.stop(n+s+d+.02)})}catch(e){}};
C.snd=e=>{S.snd=e.checked?1:0;sv()};
A.zsnd=()=>{[0,700,1400].forEach(t=>setTimeout(()=>zbp(0),t));setTimeout(()=>zbp(1),2100)};
const ffCanVib=()=>typeof navigator!='undefined'&&typeof navigator.vibrate=='function';
const ffVib=p=>{if(S.vib===0)return;try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
const sndVol=()=>[.45,1,1.8][S.vol==null?1:S.vol]||1;
const sndSeq=f=>{const t=S.snt||0;return t==1?(f?[[659,0,.2],[880,.22,.5]]:[[523,0,.14]]):t==2?(f?[[1175,0,.14],[1175,.2,.14],[1568,.4,.4]]:[[1047,0,.1]]):(f?[[1319,0,.18],[1976,.2,.45]]:[[784,0,.12]])};
C.vib=e=>{S.vib=e.checked?1:0;sv();if(e.checked)ffVib([60,40,60])};
C.ar=e=>{S.ar=e.checked?1:0;sv()};
C.awk=e=>{S.awk=e.checked?1:0;sv()};
A.vol=(i,b)=>{S.vol=+b.dataset.v;sv();R();A.zsnd1()};
A.snt=(i,b)=>{S.snt=+b.dataset.v;sv();R();A.zsnd1()};
A.zsnd1=()=>{zbp(0);setTimeout(()=>zbp(1),420)};
const setX=()=>'<label>Avisos de descanso</label>'
 +'<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" style="width:auto" '+(S.vib===0?'':'checked')+' data-c="vib"> Vibración al terminar el descanso</label>'
 +(ffCanVib()?'':'<small class="mu" style="display:block;margin:-2px 0 6px">Este dispositivo no permite vibrar desde la web (iPhone). El aviso será por sonido.</small>')
 +'<small class="mu" style="display:block">Volumen del aviso</small>'+ffSeg('vol',S.vol==null?1:S.vol,[[0,'Bajo'],[1,'Medio'],[2,'Alto']])
 +'<small class="mu" style="display:block;margin-top:8px">Sonido</small>'+ffSeg('snt',S.snt||0,[[0,'Clásico'],[1,'Suave'],[2,'Alarma']])
 +'<small class="mu" style="display:block;margin-top:4px">Si no oyes nada, comprueba el interruptor de silencio del móvil.</small>'
 +'<label style="display:flex;gap:8px;align-items:center;margin:10px 0 6px"><input type="checkbox" style="width:auto" '+(S.ar===0?'':'checked')+' data-c="ar"> Iniciar el descanso al marcar una serie</label>'
 +'<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" style="width:auto" '+(S.awk===0?'':'checked')+' data-c="awk"> Mantener la pantalla encendida en el entreno</label>';

/* — manejadores de esta función (registros A / C / U) — */
C.nt=e=>{S.notif=e.checked?1:0;sv()};

/* ═══ profile/feedback ═══
   Sonido, vibración y avisos de descanso.
   Define: audioCtx, audioContext, beep, canVibrate, buzz, soundVolume, soundSequence, alertSettings  · acciones/registros: 8
*/
import { A, C } from '../core/registry.js';
import { S, saveState } from '../core/state.js';
import { segmented } from '../core/ui.js';
import { R } from '../core/render.js';
let audioCtx = null;
const audioContext = () => {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C)
    return null;
  audioCtx = audioCtx || new C();
  if (audioCtx.state == 'suspended')
    audioCtx.resume();
  return audioCtx;
};
document.addEventListener('pointerdown', () => {
  try {
    audioContext();
  }
  catch (e) {
    /* audio opcional: se activa con el primer toque */
  }
}, { once: true });
export const beep = f => {
  if (S.snd === 0)
    return;
  try {
    const c = audioContext();
    const n = c.currentTime;
    soundSequence(f).forEach(([hz, s, d]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = hz;
      g.gain.setValueAtTime(0, n + s);
      g.gain.linearRampToValueAtTime(.22 * soundVolume(), n + s + .01);
      g.gain.exponentialRampToValueAtTime(.001, n + s + d);
      o.connect(g);
      g.connect(c.destination);
      o.start(n + s);
      o.stop(n + s + d + .02);
    });
  }
  catch (e) {
    /* audio no disponible en este navegador: el aviso sigue siendo visual */
  }
};
C.snd = e => {
  S.snd = e.checked ? 1 : 0;
  saveState();
};
A.zsnd = () => {
  [0, 700, 1400].forEach(t => setTimeout(() => beep(0), t));
  setTimeout(() => beep(1), 2100);
};
const canVibrate = () => typeof navigator != 'undefined' && typeof navigator.vibrate == 'function';
export const buzz = p => {
  if (S.vib === 0)
    return;
  try {
    navigator.vibrate && navigator.vibrate(p);
  }
  catch (e) {
    /* vibración opcional (iPhone no la permite en web) */
  }
};
const soundVolume = () => [.45, 1, 1.8][S.vol == null ? 1 : S.vol] || 1;
const soundSequence = f => {
  const t = S.snt || 0;
  return t == 1 ? (f ? [[659, 0, .2], [880, .22, .5]] : [[523, 0, .14]]) : t == 2 ? (f ? [[1175, 0, .14], [1175, .2, .14], [1568, .4, .4]] : [[1047, 0, .1]]) : (f ? [[1319, 0, .18], [1976, .2, .45]] : [[784, 0, .12]]);
};
C.vib = e => {
  S.vib = e.checked ? 1 : 0;
  saveState();
  if (e.checked)
    buzz([60, 40, 60]);
};
C.ar = e => {
  S.ar = e.checked ? 1 : 0;
  saveState();
};
C.awk = e => {
  S.awk = e.checked ? 1 : 0;
  saveState();
};
A.vol = (i, b) => {
  S.vol = +b.dataset.v;
  saveState();
  R();
  A.zsnd1();
};
A.snt = (i, b) => {
  S.snt = +b.dataset.v;
  saveState();
  R();
  A.zsnd1();
};
A.zsnd1 = () => {
  beep(0);
  setTimeout(() => beep(1), 420);
};
export const alertSettings = () => '<label>Avisos de descanso</label>'
  + '<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" style="width:auto" ' + (S.vib === 0 ? '' : 'checked') + ' data-c="vib"> Vibración al terminar el descanso</label>'
  + (canVibrate() ? '' : '<small class="mu" style="display:block;margin:-2px 0 6px">Este dispositivo no permite vibrar desde la web (iPhone). El aviso será por sonido.</small>')
  + '<small class="mu" style="display:block">Volumen del aviso</small>' + segmented('vol', S.vol == null ? 1 : S.vol, [[0, 'Bajo'], [1, 'Medio'], [2, 'Alto']])
  + '<small class="mu" style="display:block;margin-top:8px">Sonido</small>' + segmented('snt', S.snt || 0, [[0, 'Clásico'], [1, 'Suave'], [2, 'Alarma']])
  + '<small class="mu" style="display:block;margin-top:4px">Si no oyes nada, comprueba el interruptor de silencio del móvil.</small>'
  + '<label style="display:flex;gap:8px;align-items:center;margin:10px 0 6px"><input type="checkbox" style="width:auto" ' + (S.ar === 0 ? '' : 'checked') + ' data-c="ar"> Iniciar el descanso al marcar una serie</label>'
  + '<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" style="width:auto" ' + (S.awk === 0 ? '' : 'checked') + ' data-c="awk"> Mantener la pantalla encendida en el entreno</label>';
/* — manejadores de esta función (registros A / C / U) — */
C.nt = e => {
  S.notif = e.checked ? 1 : 0;
  saveState();
};

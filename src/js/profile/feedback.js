/* ═══ profile/feedback ═══
   Sonido, vibración y avisos de descanso.
   Define: audioCtx, audioReady, audioFails, audioWaking, audioIdleTimer, AUDIO_IDLE_MS, AUDIO_WAKE_MS, audioContext, wakeAudio, audioRest, playTones, audioUnlock, beep, canVibrate, buzz, soundVolume, soundSequence, alertCheck, alertSettings  · acciones/registros: 8
*/
import { A, C } from '../core/registry.js';
import { S, saveState } from '../core/state.js';
import { segmented } from '../core/ui.js';
import { R } from '../core/render.js';
import { html, raw } from '../core/html.js';
/* ── sonido ──
   Un solo AudioContext, en marcha solo mientras suena algo: se reanuda antes de cada aviso y se suspende al poco de acabar el
   último. Así no gasta batería en silencio y, en iPhone, cada aviso vuelve a activar la salida de sonido con el estado del
   móvil en ese momento: al quitarle el silencio, o tras una llamada, el siguiente aviso ya suena sin salir de la app (I-21).
   Allí el contexto puede quedar, además de «suspended», «interrupted»: se reanuda igual. Un aviso que no puede sonar a tiempo se
   pierde (no se guarda para después), y si el contexto no responde a dos seguidos, el siguiente toque crea uno nuevo. */
let audioCtx = null;
/* 1 cuando el contexto ya ha sonado alguna vez (el navegador solo deja arrancar el sonido con un toque: el primero lo desbloquea) */
let audioReady = 0;
/* avisos seguidos que no han podido sonar */
let audioFails = 0;
/* peticiones de arranque del contexto que aún esperan respuesta */
let audioWaking = 0;
let audioIdleTimer = 0;
/* tras el último sonido, lo que tarda en suspenderse; y lo que se espera a que arranque antes de dar el aviso por perdido */
const AUDIO_IDLE_MS = 3000;
const AUDIO_WAKE_MS = 1200;
/* el contexto de sonido, creándolo si hace falta; null si el navegador no tiene */
const audioContext = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC)
    return null;
  if (!audioCtx || audioCtx.state == 'closed') {
    audioCtx = new AC();
    audioReady = 0;
    audioFails = 0;
  }
  return audioCtx;
};
/* Pone en marcha el contexto c (suspendido o interrumpido). Resuelve true si queda sonando, false si no arranca a tiempo. */
const wakeAudio = c => new Promise(done => {
  let waiting = 1;
  /* la primera respuesta decide; si arranca cuando ya no se le esperaba, al menos queda listo para el siguiente aviso */
  const end = ok => {
    if (ok)
      audioReady = 1;
    if (!waiting)
      return;
    waiting = 0;
    audioWaking--;
    clearTimeout(t);
    done(ok);
  };
  audioWaking++;
  const t = setTimeout(() => end(false), AUDIO_WAKE_MS);
  try {
    Promise.resolve(c.resume()).then(() => end(c.state == 'running'), () => end(false));
  }
  catch (e) {
    end(false);
  }
});
/* al poco de acabar el último sonido, el contexto se suspende */
const audioRest = sec => {
  clearTimeout(audioIdleTimer);
  audioIdleTimer = setTimeout(() => {
    try {
      if (audioCtx && audioCtx.state == 'running')
        Promise.resolve(audioCtx.suspend()).catch(() => {
        });
    }
    catch (e) {
      /* si no se puede suspender, sigue en marcha */
    }
  }, sec * 1e3 + AUDIO_IDLE_MS);
};
/* programa los tonos [hercios, empieza a los s, dura s] en el contexto c, ya en marcha */
const playTones = (c, tones) => {
  const n = c.currentTime;
  let last = 0;
  tones.forEach(([hz, s, d]) => {
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
    last = Math.max(last, s + d);
  });
  audioRest(last);
};
/* con cada toque: el primero desbloquea el sonido; después, solo si el último aviso no pudo sonar (a los dos avisos perdidos,
   con un contexto nuevo: el viejo no responde) */
const audioUnlock = () => {
  if (S.sound === 0 || audioWaking)
    return;
  try {
    if (audioCtx && audioFails >= 2) {
      const old = audioCtx;
      audioCtx = null;
      Promise.resolve(old.close()).catch(() => {
      });
    }
    const c = audioContext();
    if (!c || c.state == 'running' || audioReady && !audioFails)
      return;
    wakeAudio(c).then(ok => {
      if (!ok)
        return;
      audioFails = 0;
      audioRest(0);
    });
  }
  catch (e) {
    /* audio opcional */
  }
};
['touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, audioUnlock, { capture: true, passive: true }));
/** Aviso sonoro: f = 0, el corto (cuenta atrás, toque); 1, el de fin (del descanso, del temporizador). */
export const beep = f => {
  if (S.sound === 0)
    return;
  try {
    const c = audioContext();
    if (!c)
      return;
    const play = () => {
      audioFails = 0;
      try {
        playTones(c, soundSequence(f));
      }
      catch (e) {
        /* audio no disponible en este navegador: el aviso sigue siendo visual */
      }
    };
    if (c.state == 'running')
      play();
    else
      wakeAudio(c).then(ok => ok ? play() : audioFails++);
  }
  catch (e) {
    /* sin audio: el aviso sigue siendo visual */
  }
};
C.soundToggle = e => {
  S.sound = e.checked ? 1 : 0;
  saveState();
};
A.soundTest = () => {
  [0, 700, 1400].forEach(t => setTimeout(() => beep(0), t));
  setTimeout(() => beep(1), 2100);
};
const canVibrate = () => typeof navigator != 'undefined' && typeof navigator.vibrate == 'function';
export const buzz = p => {
  if (S.vibration === 0)
    return;
  try {
    navigator.vibrate && navigator.vibrate(p);
  }
  catch (e) {
    /* vibración opcional (iPhone no la permite en web) */
  }
};
const soundVolume = () => [.45, 1, 1.8][S.volume == null ? 1 : S.volume] || 1;
const soundSequence = f => {
  const t = S.soundTone || 0;
  return t == 1 ? (f ? [[659, 0, .2], [880, .22, .5]] : [[523, 0, .14]]) : t == 2 ? (f ? [[1175, 0, .14], [1175, .2, .14], [1568, .4, .4]] : [[1047, 0, .1]]) : (f ? [[1319, 0, .18], [1976, .2, .45]] : [[784, 0, .12]]);
};
C.vibrationToggle = e => {
  S.vibration = e.checked ? 1 : 0;
  saveState();
  if (e.checked)
    buzz([60, 40, 60]);
};
C.autoRestToggle = e => {
  S.autoRest = e.checked ? 1 : 0;
  saveState();
};
C.keepAwakeToggle = e => {
  S.keepAwake = e.checked ? 1 : 0;
  saveState();
};
A.soundChooseVolume = (i, b) => {
  S.volume = +b.dataset.v;
  saveState();
  R();
  A.soundPreview();
};
A.soundChooseTone = (i, b) => {
  S.soundTone = +b.dataset.v;
  saveState();
  R();
  A.soundPreview();
};
A.soundPreview = () => {
  beep(0);
  setTimeout(() => beep(1), 420);
};
/* una casilla de Ajustes → Sonido y avisos: activada salvo que el ajuste valga 0 */
const alertCheck = (change, value, text, margin) => html`<label style="display:flex;gap:8px;align-items:center;margin:${raw(margin)}"><input type="checkbox" style="width:auto" ${value === 0 ? '' : 'checked'} data-c="${change}"> ${raw(text)}</label>`;
/** Ajustes → Sonido y avisos: vibración, volumen, tipo de sonido, descanso automático y pantalla encendida. */
export const alertSettings = () => html`<label>Avisos de descanso</label>${alertCheck('vibrationToggle', S.vibration, 'Vibración al terminar el descanso', '6px 0')}${raw(canVibrate() ? '' : '<small class="mu" style="display:block;margin:-2px 0 6px">Este dispositivo no permite vibrar desde la web (iPhone). El aviso será por sonido.</small>')}<small class="mu" style="display:block">Volumen del aviso</small>${segmented('soundChooseVolume', S.volume == null ? 1 : S.volume, [[0, 'Bajo'], [1, 'Medio'], [2, 'Alto']])}<small class="mu" style="display:block;margin-top:8px">Sonido</small>${segmented('soundChooseTone', S.soundTone || 0, [[0, 'Clásico'], [1, 'Suave'], [2, 'Alarma']])}<small class="mu" style="display:block;margin-top:4px">Si no oyes nada, comprueba el interruptor de silencio del móvil.</small>${alertCheck('autoRestToggle', S.autoRest, 'Iniciar el descanso al marcar una serie', '10px 0 6px')}${alertCheck('keepAwakeToggle', S.keepAwake, 'Mantener la pantalla encendida en el entreno', '6px 0')}`;
/* — manejadores de esta función (registros A / C / U) — */

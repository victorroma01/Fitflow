/* ═══ core/state ═══
   Estado global S (se guarda con saveState), sesión en curso W, tema y banderas de interfaz.
   Define: stateRecovered, loadSavedState, S, W, nutriDayOffset, calMonthOffset, weekView, addState, resetArmed, saveState, applyTheme, overviewMode, weightView
*/
/** 1 si al arrancar había datos guardados que no se pudieron leer (se apartan en Store.K.bad; core/boot lo avisa). */
let stateRecovered = 0;
/** Estado guardado. Si existe pero está dañado, guarda una copia aparte antes de empezar de cero, para poder recuperarlo. */
const loadSavedState = () => {
  let raw = null;
  try {
    raw = Store.get(Store.K.app);
  }
  catch (e) {
    logError('leer estado', e);
    return {};
  }
  if (raw == null)
    return {};
  try {
    const o = JSON.parse(raw);
    if (o === null)
      return {};
    if (typeof o == 'object' && !Array.isArray(o))
      return o;
    throw new Error('el estado guardado no es un objeto');
  }
  catch (e) {
    logError('estado dañado', e);
    stateRecovered = 1;
    try {
      Store.set(Store.K.bad, JSON.stringify({ t: Date.now(), raw }));
    }
    catch (x) {
      logError('apartar estado dañado', x);
    }
    return {};
  }
};
let S = Object.assign({ tab: 0, prog: 0, plan: parseProgram(0), wk: 1, sel: 0, done: {}, logs: [], last: {}, rest: 120, theme: '', notif: 1, pf: {}, nu: { k: 1942, c: 50, p: 20, f: 30, n: 3 }, meals: {}, lib: [], cf: [], cx: [] }, loadSavedState());
let W = null;
let nutriDayOffset = 0;
let calMonthOffset = 0;
let weekView = 0;
let addState = null;
let resetArmed = 0;
const saveState = () => storeJson(Store.K.app, S);
const applyTheme = () => {
  S.theme ? document.documentElement.dataset.theme = S.theme : document.documentElement.removeAttribute('data-theme');
};
let overviewMode = 0;
let weightView = 0;

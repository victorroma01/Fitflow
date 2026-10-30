/* ═══ core/state ═══
   Estado global S (se guarda con saveState: core/persist), sesión en curso W, tema y banderas de interfaz.
   Define: S, W, nutriDayOffset, calMonthOffset, weekView, addState, applyTheme, overviewMode, weightView
*/
let S = Object.assign({ tab: 0, prog: 0, plan: parseProgram(0), wk: 1, sel: 0, done: {}, logs: [], last: {}, rest: 120, theme: '', notif: 1, pf: {}, nu: { k: 1942, c: 50, p: 20, f: 30, n: 3 }, meals: {}, lib: [], cf: [], cx: [] }, loadSavedState());
let W = null;
let nutriDayOffset = 0;
let calMonthOffset = 0;
let weekView = 0;
let addState = null;
const applyTheme = () => {
  S.theme ? document.documentElement.dataset.theme = S.theme : document.documentElement.removeAttribute('data-theme');
};
let overviewMode = 0;
let weightView = 0;

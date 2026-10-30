/* ═══ core/state ═══
   Estado global S (se guarda con saveState: core/persist), sesión en curso W, tema y banderas de interfaz.
   Define: S, saveState, flushState, W, nutriDayOffset, calMonthOffset, weekView, addState, applyTheme, overviewMode, weightView, wodRun
*/
import { loadSavedState, scheduleWrite, writeState } from './persist.js';
import { parseProgram } from '../data/library.js';
export let S = Object.assign({ tab: 0, prog: 0, plan: parseProgram(0), wk: 1, sel: 0, done: {}, logs: [], last: {}, rest: 120, theme: '', notif: 1, pf: {}, nu: { k: 1942, c: 50, p: 20, f: 30, n: 3 }, meals: {}, lib: [], cf: [], cx: [] }, loadSavedState());
/** Guarda S al terminar la acción en curso; solo se escribe lo que ha cambiado (core/persist). */
export const saveState = () => scheduleWrite(S);
/** Guarda S ya, sin esperar al final de la acción. Devuelve false si no se pudo. */
export const flushState = () => writeState(S);
export let W = null;
/** Cambia `W` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setW = v => {
  W = v;
};
export let nutriDayOffset = 0;
/** Cambia `nutriDayOffset` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setNutriDayOffset = v => {
  nutriDayOffset = v;
};
export let calMonthOffset = 0;
/** Cambia `calMonthOffset` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setCalMonthOffset = v => {
  calMonthOffset = v;
};
export let weekView = 0;
/** Cambia `weekView` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setWeekView = v => {
  weekView = v;
};
export let addState = null;
/** Cambia `addState` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setAddState = v => {
  addState = v;
};
export const applyTheme = () => {
  S.theme ? document.documentElement.dataset.theme = S.theme : document.documentElement.removeAttribute('data-theme');
  /* color de la barra del sistema (theme-color). Las dos etiquetas de la página siguen el tema del móvil; con un tema
     elegido a mano va delante otra sin media (vale la primera que encaja) con el fondo de ese tema; en automático se quita */
  const m = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!S.theme) {
    m && m.remove();
    return;
  }
  const t = m || document.createElement('meta');
  t.name = 'theme-color';
  t.content = S.theme == 'light' ? '#f3f3f7' : '#0b0b0d';
  m || document.head.insertBefore(t, document.querySelector('meta[name="theme-color"]'));
};
export let overviewMode = 0;
/** Cambia `overviewMode` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setOverviewMode = v => {
  overviewMode = v;
};
export let weightView = 0;
/** Cambia `weightView` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setWeightView = v => {
  weightView = v;
};
/** WOD en marcha (extras/wod, que se carga al usarlo) o null; workout/wake lo mira para mantener la pantalla encendida. */
export let wodRun = null;
/** Cambia `wodRun` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setWodRun = v => {
  wodRun = v;
};

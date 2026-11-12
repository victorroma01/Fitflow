/* ═══ system/welcome ═══
   Bienvenida de una cuenta nueva (I-23). La primera vez que se abre la app tras registrarse (S.welcomePending, que pone account/login), y
   antes que nada:
   1. una ventana da las gracias por instalar la app y apoyar su desarrollo y avisa de la fase de pruebas: puede haber errores,
      que se agradece contar en Ajustes → Informar de un fallo, y se pueden perder datos. «Siguiente» lleva a
   2. los datos biométricos, todos obligatorios: sexo, edad, altura, peso, actividad y objetivo, con por qué hacen falta (con
      ellos se calculan las calorías y los macros y se ordenan los programas). Se pueden cambiar después en Perfil.
   Al guardarlos se cierra y sigue lo que diga quien la abre (system/tour: el recorrido). Ni «atrás» ni deslizar la cierran
   (core/back). Las cuentas que ya existían no la ven.
   Define: BIO_NUMBERS, welcome, welcomeRoot, welcomeView, sexButtons, bioNumbers, bioFormView, welcomeRender, readBioForm, bioProblem, welcomeShow  · acciones/registros: 3
*/
import { $ } from '../core/util.js';
import { A } from '../core/registry.js';
import { S, saveState } from '../core/state.js';
import { brandLogo } from '../core/brand.js';
import { R } from '../core/render.js';
import { ACTIVITY_LEVELS, applyDiet, GOAL_DIET, GOAL_LABELS } from '../nutrition/diet.js';
import { html, raw } from '../core/html.js';
/** Los datos con número: [clave en S.biometrics, rótulo, unidad, mínimo, máximo]. */
const BIO_NUMBERS = [['age', 'Edad', 'años', 14, 99], ['h', 'Altura', 'cm', 120, 230], ['w', 'Peso', 'kg', 30, 300]];
/* la bienvenida abierta: { step: 1 la bienvenida | 2 los datos, sex: el elegido, done: lo que se hace al acabar } */
let welcome = null;
const welcomeRoot = () => {
  let r = $('#wlc');
  if (!r) {
    r = document.createElement('div');
    r.id = 'wlc';
    document.body.appendChild(r);
  }
  return r;
};
/* paso 1: la bienvenida */
const welcomeView = () => html`<div class="bk"></div><div class="sp" role="dialog" aria-modal="true" aria-labelledby="wlh"><div class="trw">${brandLogo('wlg')}<h3 id="wlh">Te damos la bienvenida a StrataFit</h3><p class="mu">Gracias por instalar la app y por apoyar su desarrollo.</p><p class="mu">StrataFit está en fase de pruebas, así que puede haber errores. Si encuentras alguno, cuéntanoslo en Ajustes → Informar de un fallo: nos ayuda mucho a mejorarla.</p><p class="mu wlw">Durante la fase de pruebas existe el riesgo de pérdida total o parcial de los datos.</p><button class="pr" data-a="welcomeNext">Siguiente</button></div></div>`;
/* el sexo: Hombre o Mujer, como botones de opción */
const sexButtons = sx => html`<label>Sexo</label><div class="seg s2" role="radiogroup" aria-label="Sexo">${[['M', 'Hombre'], ['F', 'Mujer']].map(x => html`<button class="${sx == x[0] ? 'on' : ''}" data-a="welcomeSex" data-v="${x[0]}" role="radio" aria-checked="${sx == x[0] ? 'true' : 'false'}">${raw(x[1])}</button>`)}</div>`;
/* edad, altura y peso, con lo ya guardado */
const bioNumbers = b => html`<div class="wln3">${BIO_NUMBERS.map(([k, l, u]) => html`<div><label for="wl_${k}">${l}</label><input id="wl_${k}" data-i="${k}" type="number" inputmode="${k == 'w' ? 'decimal' : 'numeric'}" placeholder="${u}" value="${b[k] || ''}"></div>`)}</div>`;
/* paso 2: los datos biométricos (con lo ya guardado, si lo hay) */
const bioFormView = () => {
  const b = S.biometrics || {};
  const sx = welcome.sex;
  const sel = (k, l, list) => html`<label for="wl_${k}">${l}</label><select id="wl_${k}" data-i="${k}"><option value=""${b[k] == null || b[k] === '' ? ' selected' : ''} disabled>Elige…</option>${list.map((t, i) => html`<option value="${i}"${b[k] !== '' && b[k] != null && +b[k] == i ? ' selected' : ''}>${raw(t)}</option>`)}</select>`;
  return html`<div class="bk"></div><div class="sp wlb" role="dialog" aria-modal="true" aria-labelledby="wlh"><h3 id="wlh">Tus datos</h3><p class="mu">Antes de empezar, la app necesita unos datos básicos. Con ellos calcula tus calorías y tus macros de cada día y te recomienda los programas que mejor encajan contigo. Puedes cambiarlos cuando quieras en Perfil.</p>${sexButtons(sx)}${bioNumbers(b)}${raw(sel('act', 'Actividad diaria', ACTIVITY_LEVELS.map(a => a[0] + ' · ' + a[1])))}${raw(sel('goal', 'Objetivo físico', GOAL_LABELS))}<p id="wle" class="wle" role="alert"></p><button class="pr" data-a="welcomeSave">Guardar y continuar</button></div>`;
};
const welcomeRender = () => {
  const r = welcomeRoot();
  r.innerHTML = welcome.step == 1 ? welcomeView() : bioFormView();
  const b = r.querySelector('button.pr');
  if (b)
    b.focus({ preventScroll: true });
};
/* lo escrito en el formulario: { sex, age, h, w, act, goal }, como textos */
const readBioForm = () => {
  const o = { sex: welcome.sex };
  document.querySelectorAll('#wlc [data-i]').forEach(e => o[e.dataset.i] = String(e.value || '').trim().replace(',', '.'));
  return o;
};
/* el primer dato que falta o no vale: [id del campo, qué decir], o null si están todos */
const bioProblem = f => {
  if (f.sex != 'M' && f.sex != 'F')
    return ['', 'Elige tu sexo.'];
  for (const [k, l, u, lo, hi] of BIO_NUMBERS) {
    const v = +f[k];
    if (!f[k] || !(v >= lo && v <= hi))
      return ['wl_' + k, 'Escribe tu ' + l.toLowerCase() + ' en ' + u + ', de ' + lo + ' a ' + hi + '.'];
  }
  if (f.act === '')
    return ['wl_act', 'Elige tu actividad diaria.'];
  if (f.goal === '')
    return ['wl_goal', 'Elige tu objetivo físico.'];
  return null;
};
/** Abre la bienvenida (system/tour, si S.welcomePending). done: lo que se hace al guardar los datos. */
export const welcomeShow = done => {
  const sx = S.biometrics && S.biometrics.sex;
  welcome = { step: 1, sex: sx == 'M' || sx == 'F' ? sx : '', done };
  welcomeRender();
};
/* — manejadores de esta función (registros A / C / U) — */
/* «Siguiente»: a los datos */
A.welcomeNext = () => {
  if (!welcome)
    return;
  welcome.step = 2;
  welcomeRender();
};
/* el sexo, sin pintar de nuevo el formulario (lo escrito se queda) */
A.welcomeSex = (i, b) => {
  if (!welcome)
    return;
  welcome.sex = b.dataset.v;
  document.querySelectorAll('#wlc [data-a=welcomeSex]').forEach(e => {
    const on = e == b;
    e.classList.toggle('on', on);
    e.setAttribute('aria-checked', on ? 'true' : 'false');
  });
};
/* «Guardar y continuar»: con todos los datos bien, se guardan, se calculan los objetivos de nutrición y se cierra */
A.welcomeSave = () => {
  if (!welcome)
    return;
  const f = readBioForm();
  const bad = bioProblem(f);
  document.querySelectorAll('#wlc .bad').forEach(e => e.classList.remove('bad'));
  if (bad) {
    const e = bad[0] && $('#' + bad[0]);
    if (e) {
      e.classList.add('bad');
      e.focus();
    }
    $('#wle').textContent = bad[1];
    return;
  }
  S.biometrics = { ...(S.biometrics || {}), sex: f.sex, age: f.age, h: f.h, w: f.w, act: f.act, goal: f.goal };
  S.nutritionGoals.dt = GOAL_DIET[+f.goal];
  applyDiet(true);
  delete S.welcomePending;
  saveState();
  const done = welcome.done;
  welcome = null;
  $('#wlc').remove();
  R();
  if (done)
    done();
};

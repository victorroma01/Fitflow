/* ═══ library/custom ═══
   Ejercicios propios: se crean desde el selector (library/picker) y aquí se renombran y se eliminan, desde su ficha en la
   librería. El nombre es la clave de todo lo de un ejercicio (historial, récords, último peso, notas, días del plan y workouts),
   así que al renombrarlo se cambia en todos esos sitios a la vez y nada se queda con el nombre viejo. No se elimina uno que esté
   en el plan, en un programa propio o en un workout: antes hay que quitarlo de ahí. Con un entreno en curso no se toca ninguno.
*/
import { typedName } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A } from '../core/registry.js';
import { S, saveState, W } from '../core/state.js';
import { confirmDialog, dialog, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { pendingResume } from '../workout/resume.js';
import { exAll } from './model.js';
import { html } from '../core/html.js';
/* un nombre sin mayúsculas, tildes ni espacios de más, para comparar */
const plainName = n => String(n).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
/** El ejercicio (de la librería o propio) que ya se llama `n`, sin mirar mayúsculas, tildes ni espacios de más. */
export const exerciseNamed = n => exAll().find(e => plainName(e.n) == plainName(n));
/** ¿`n` es un ejercicio creado por el usuario? */
export const isCustomExercise = n => S.customExercises.some(e => e.n == n);
/* lo que se guarda por nombre de ejercicio */
const BY_NAME = ['exerciseHistory', 'records', 'lastWeights', 'exerciseNotes', 'stagnationDismissed'];
/* con un entreno en curso (o a medias, por reanudar) no se renombra ni se elimina: sus series van por nombre */
const trainingNow = () => {
  if (!W && !pendingResume)
    return false;
  toast('Termina o descarta antes el entreno en curso');
  return true;
};
/* dónde está el ejercicio `n`: días del plan, programas propios y workouts personalizados */
const exerciseUses = n => {
  const days = pl => pl.filter(d => d.ex.some(e => e.n == n || e.o == n));
  const out = [];
  const count = (k, one, many) => k && out.push(k == 1 ? one : k + ' ' + many);
  count(days(S.plan).length, 'un día de tu plan', 'días de tu plan');
  count(S.ownPrograms.filter(p => days(p.plan).length).length, 'un programa propio', 'programas propios');
  count(S.routines.filter(r => r.bl.some(b => b.ex.includes(n))).length, 'un workout personalizado', 'workouts personalizados');
  return out;
};
/* cambia el nombre `old` por `nn` en la librería propia, en el plan, en los programas propios, en los workouts y en todo lo
   guardado por nombre. Si con el nombre nuevo ya había historial (de un ejercicio eliminado), se junta con el suyo */
const renameExercise = (old, nn) => {
  S.customExercises.forEach(e => {
    if (e.n == old)
      e.n = nn;
  });
  const inPlan = pl => pl.forEach(d => d.ex.forEach(e => {
    if (e.n == old)
      e.n = nn;
    if (e.o == old)
      e.o = nn;
  }));
  inPlan(S.plan);
  S.ownPrograms.forEach(p => inPlan(p.plan));
  S.routines.forEach(r => r.bl.forEach(b => {
    b.ex = b.ex.map(n => n == old ? nn : n);
  }));
  BY_NAME.forEach(k => {
    const o = S[k];
    if (!o || !Object.prototype.hasOwnProperty.call(o, old))
      return;
    o[nn] = k == 'exerciseHistory' && Array.isArray(o[nn]) ? o[nn].concat(o[old]).sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0) : o[old];
    delete o[old];
  });
  saveState();
};
/* quita el ejercicio `n` de la librería propia y, si se pide, todo lo guardado con su nombre */
const deleteExercise = (n, withHistory) => {
  S.customExercises = S.customExercises.filter(e => e.n != n);
  if (withHistory)
    BY_NAME.forEach(k => {
      if (S[k])
        delete S[k][n];
    });
  saveState();
};
/** En la ficha de un ejercicio propio (`i`: su índice en la librería): «Renombrar» y «Eliminar». */
export const customTools = i => html`<h4 class="ph">Ejercicio propio</h4><div class="g2"><button data-a="customRenamePage" data-i="${i}">Renombrar</button><button data-a="customDeleteAsk" data-i="${i}" class="c-ctx">Eliminar</button></div>`;
/* — manejadores de esta función (registros A / C / U) — */
A.customRenamePage = i => {
  const e = exAll()[i];
  if (!e || !isCustomExercise(e.n) || trainingNow())
    return;
  sheet(html`<div class="row"><button data-a="exerciseDetail" data-i="${i}" aria-label="Volver" class="bd-0 bg-none fs-24 p-6-10">←</button></div><h1 class="pgt">Renombrar ejercicio</h1><label for="cxn">Nombre</label><input id="cxn" maxlength="80" value="${e.n}" data-enter="customRename" data-i="${i}"><p class="mu fs-13">Su historial, sus récords y sus notas pasan al nombre nuevo, igual que los días y los workouts en los que está.</p><button class="pr w-full mt-10" data-a="customRename" data-i="${i}">Guardar</button>`);
};
/* (desde el botón o con Intro en el campo: el índice va en el propio elemento) */
A.customRename = (i, b) => {
  const k = +b.dataset.i;
  const e = exAll()[k];
  const field = document.getElementById('cxn');
  if (!e || !field || !isCustomExercise(e.n) || trainingNow())
    return;
  const nn = typedName(field.value, '', 80);
  if (!nn) {
    toast('Escribe un nombre');
    return;
  }
  const had = exerciseNamed(nn);
  if (had && had !== e) {
    toast('Ya hay un ejercicio que se llama «' + had.n + '»');
    return;
  }
  if (nn != e.n) {
    renameExercise(e.n, nn);
    toast('Ejercicio renombrado');
    R();
  }
  A.exerciseDetail(k);
};
/* el ejercicio que se va a eliminar (su nombre), mientras se pregunta */
let deleting = '';
A.customDeleteAsk = i => {
  const e = exAll()[i];
  if (!e || !isCustomExercise(e.n) || trainingNow())
    return;
  const uses = exerciseUses(e.n);
  if (uses.length) {
    dialog('Antes, quítalo de donde está', html`«${e.n}» está en ${uses.length > 1 ? uses.slice(0, -1).join(', ') + ' y ' + uses[uses.length - 1] : uses[0]}. Quítalo de ahí o cámbialo por otro y vuelve a eliminarlo.`, [['Entendido', 'doNothing', 'pr']]);
    return;
  }
  deleting = e.n;
  const n = ((S.exerciseHistory || {})[e.n] || []).length;
  if (n)
    dialog(html`¿Eliminar «${e.n}»?`, 'Tiene ' + n + (n == 1 ? ' sesión registrada' : ' sesiones registradas') + '. Puedes eliminar solo el ejercicio y conservar su historial en tus gráficas y récords, o eliminarlo con su historial.', [['Cancelar', 'doNothing', ''], ['Solo el ejercicio', 'customDelete', ''], ['Con su historial', 'customDeleteAll', 'c-ctx']]);
  else
    confirmDialog(html`¿Eliminar «${e.n}»?`, 'Dejará de salir en la librería.', 'customDelete', 'Eliminar');
};
/* tras eliminarlo, de vuelta a la librería */
const customDeleted = withHistory => {
  if (!deleting || !isCustomExercise(deleting))
    return;
  deleteExercise(deleting, withHistory);
  deleting = '';
  toast('Ejercicio eliminado');
  R();
  A.libraryBack();
};
A.customDelete = () => customDeleted(false);
A.customDeleteAll = () => customDeleted(true);

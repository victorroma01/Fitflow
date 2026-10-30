/* ═══ core/render ═══
   Render principal R() y cambio de pestaña.
   Define: lastTab, lastScreen, R  · acciones/registros: 1
*/
import { $ } from './util.js';
import { morph } from './morph.js';
import { A } from './registry.js';
import { overviewMode, S, setWeekView, W, weightView } from './state.js';
import { workoutTab } from '../workout/day.js';
import { sessionView } from '../workout/session.js';
import { resumeSync, saveSession } from '../workout/resume.js';
import { overviewPage } from '../workout/overview.js';
import { deloadWeekSync } from '../workout/deload.js';
import { setLevelMenuOpen } from '../programs/levels.js';
import { nutritionTab } from '../nutrition/water.js';
import { dashboardTab } from '../dashboard/home.js';
import { weightPage } from '../dashboard/weight.js';
import { profileTab } from '../profile/home.js';
import { glSync } from '../profile/appearance.js';
import { updatePopupSync } from '../system/updates.js';
import { settingsSync } from '../profile/settings.js';
let lastTab = -1;
/** Pantalla pintada en el último R() (pestaña, entreno, overview o peso). */
let lastScreen = '';
export function R() {
  glSync();
  deloadWeekSync();
  resumeSync();
  const od = [...document.querySelectorAll('#app details')].map(d => d.open);
  const screen = W ? 'entreno' : overviewMode ? 'overview' : weightView && S.tab == 2 ? 'peso' : 'pestaña ' + S.tab;
  const h = W ? sessionView() : overviewMode ? overviewPage() : weightView && S.tab == 2 ? weightPage() : [workoutTab, nutritionTab, dashboardTab, profileTab][S.tab]();
  /* en la misma pantalla solo cambia lo distinto (core/morph: se conservan el foco y el desplazamiento); otra pantalla se pinta de cero */
  if (screen == lastScreen)
    morph($('#app'), h);
  else
    $('#app').innerHTML = h;
  lastScreen = screen;
  if (lastTab == S.tab)
    document.querySelectorAll('#app details').forEach((d, i) => d.open = !!od[i]);
  lastTab = S.tab;
  document.querySelectorAll('nav button').forEach((b, i) => b.classList.toggle('on', i == S.tab));
  $('nav').style.display = W || overviewMode ? 'none' : 'flex';
  saveSession();
  updatePopupSync();
  /* si hay una página de Ajustes abierta, que refleje el cambio (tema, color, unidades…) */
  settingsSync();
}
A.tab = (i, b) => {
  setLevelMenuOpen(false);
  S.tab = i;
  setWeekView(0);
  R();
};

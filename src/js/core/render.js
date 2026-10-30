/* ═══ core/render ═══
   Render principal R() y cambio de pestaña.
   Define: lastTab, R  · acciones/registros: 1
*/
let lastTab = -1;
function R() {
  glSync();
  deloadWeekSync();
  resumeSync();
  const od = [...document.querySelectorAll('#app details')].map(d => d.open);
  $('#app').innerHTML = W ? sessionView() : overviewMode ? overviewPage() : weightView && S.tab == 2 ? weightPage() : [workoutTab, nutritionTab, dashboardTab, profileTab][S.tab]();
  if (lastTab == S.tab)
    document.querySelectorAll('#app details').forEach((d, i) => d.open = !!od[i]);
  lastTab = S.tab;
  document.querySelectorAll('nav button').forEach((b, i) => b.classList.toggle('on', i == S.tab));
  $('nav').style.display = W || overviewMode ? 'none' : 'flex';
  saveSession();
  updateBannerSync();
}
A.tab = (i, b) => {
  levelMenuOpen = false;
  S.tab = i;
  weekView = 0;
  R();
};

/* ═══ profile/units ═══
   Unidades de carga kg/lb.
   Define: weightUnit, toDisplayWeight, fromDisplayWeight, volumeText, usesLb, unitsCard  · acciones/registros: 1
*/
const weightUnit = () => S.un == 'lb' ? 'lb' : 'kg';
const toDisplayWeight = v => {
  v = +v || 0;
  return S.un == 'lb' ? Math.round(v * 2.20462 * 10) / 10 : Math.round(v * 100) / 100;
};
const fromDisplayWeight = v => {
  v = +v || 0;
  return S.un == 'lb' ? Math.round(v / 2.20462 * 100) / 100 : v;
};
const volumeText = (v, d) => {
  const x = (S.un == 'lb' ? toDisplayWeight(v) : v) / 1000;
  return (d ? round1(x) : roundInt(x)) + (S.un == 'lb' ? ' k lb' : ' t');
};
const usesLb = () => S.un == 'lb';
const unitsCard = () => '<label>Unidades de carga</label>' + segmented('un', usesLb() ? 'lb' : 'kg', [['kg', 'Kilos (kg)'], ['lb', 'Libras (lb)']]) + '<small class="mu" style="display:block;margin-top:4px">Cambia pesos, discos, volumen y récords. El peso corporal sigue en kg.</small>';
A.un = (i, b) => {
  S.un = b.dataset.v == 'lb' ? 'lb' : 'kg';
  plateTotal = usesLb() ? 135 : 60;
  plateBar = usesLb() ? 45 : 20;
  saveState();
  R();
};

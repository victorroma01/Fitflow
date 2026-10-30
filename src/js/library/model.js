/* ═══ library/model ═══
   Modelo de ejercicios: lista completa, músculos, filas y orden.
   Define: groupOfName, overlapCount, exAll, exOrder, exMuscles, exSearchText, exSubtitle, exMusclesHtml, exCellHtml, exRowHtml, exCompare, categoryOf
*/
const groupOfName = n => {
  const e = EXERCISES.concat(S.cx).find(x => x.n == n);
  return e ? groupOf(e) : 'Propio';
};
const overlapCount = (a, b) => a.filter(x => b.includes(x)).length;
const exAll = () => EXERCISES.concat(S.cx);
const exOrder = e => e.k == null ? 9999 : e.k;
const exMuscles = (e, k) => (e[k] || []).map(c => MUSCLES[c]).filter(Boolean);
const exSearchText = e => {
  const s = (e.n + ' ' + (e.t || '') + ' ' + (e.q || '') + ' ' + exMuscles(e, 'p').concat(exMuscles(e, 's')).join(' ') + ' ' + (EX_ALIASES[e.n] || '')).toLowerCase();
  return s + ' ' + s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};
const exSubtitle = e => X((e.q || 'Personalizado') + (e.t && e.t != 'Otros' ? ' · ' + e.t : ''));
const exMusclesHtml = e => (exMuscles(e, 'p').length ? '<small style="color:var(--a1)">Principal: ' + X(exMuscles(e, 'p').join(', ')) + '</small>' : '') + (exMuscles(e, 's').length ? '<br><small class="mu">Secundarios: ' + X(exMuscles(e, 's').join(', ')) + '</small>' : '');
const exCellHtml = e => '<i class="exth">' + exAnatomy(e.n, 48) + exBadge(e.n) + '</i><span class="ext"><b>' + X(e.n) + '</b><br><small>' + exSubtitle(e) + '</small><br>' + exMusclesHtml(e) + '</span>';
const exRowHtml = (o, btn, act) => '<div class="it exr"><span class="exc" data-a="' + (act || 'exd') + '" data-i="' + o.i + '">' + exCellHtml(o.e) + '</span>' + btn + '</div>';
const exCompare = (a, b) => GROUPS.indexOf(groupOf(a)) - GROUPS.indexOf(groupOf(b)) || exOrder(a) - exOrder(b);
const categoryOf = g => ['CrossFit', 'Hyrox', 'Funcional', 'Cardio'].includes(g) ? g : 'Culturismo';

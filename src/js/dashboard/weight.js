/* ═══ dashboard/weight ═══
   Peso corporal y gráfica.
   Define: weekKey, bmiLabel, weightPage  · acciones/registros: 4
*/
import { $, dayKey, roundInt } from '../core/util.js';
import { A } from '../core/registry.js';
import { S, saveState, setWeightView } from '../core/state.js';
import { R } from '../core/render.js';
import { applyDiet } from '../nutrition/diet.js';
import { html, raw } from '../core/html.js';
const weekKey = s => {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return dayKey(d);
};
const bmiLabel = v => v < 18.5 ? 'Delgadez' : v < 25 ? 'Peso correcto' : v < 30 ? 'Sobrepeso moderado' : 'Sobrepeso extremo';
export function weightPage() {
  const L = (S.wl || []).slice().sort((a, b) => a.d < b.d ? -1 : 1);
  const r = S.rg || 0;
  const ky = d => r == 2 ? d.slice(0, 4) : r == 1 ? d.slice(0, 7) : weekKey(d);
  const bk = {};
  L.forEach(p => bk[ky(p.d)] = p.w);
  const ks = Object.keys(bk).sort().slice(r == 2 ? -5 : -12);
  const v = ks.map(k => bk[k]);
  const lo = Math.min(...v) - 1;
  const hi = Math.max(...v) + 1;
  const pt = v.map((y, i) => [ks.length > 1 ? 20 + i * 280 / (ks.length - 1) : 160, 130 - (y - lo) / (hi - lo) * 110]);
  const h = +S.bio.h;
  const cur = L.length ? L[L.length - 1].w : 0;
  const w0 = L.length ? L[0].w : 0;
  const all = L.map(p => p.w);
  const bm = h && cur ? cur / ((h / 100) ** 2) : 0;
  return html`<div class="hd"><button data-a="zwvb">‹ Atrás</button><h1>Evolución del peso</h1></div><div class="cd"><div class="g2"><input id="wv" type="number" inputmode="decimal" placeholder="Peso (kg)"><input id="wd" type="date" value="${raw(dayKey(new Date))}"></div><button class="pr" data-a="zwva" style="width:100%;margin-top:8px">Registrar peso</button></div><div class="cd"><div>${['Semanas', 'Meses', 'Años'].map((x, i) => html`<button class="chip${r == i ? ' on' : ''}" data-a="zrg" data-i="${i}">${raw(x)}</button>`)}</div>${raw(v.length ? html`<svg viewBox="0 0 320 160" width="100%" style="margin-top:10px"><polyline fill="none" stroke="var(--a2)" stroke-width="2.5" stroke-linejoin="round" points="${raw(pt.map(p => p.join(',')).join(' '))}"/>${pt.map((p, i) => html`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--a1)"/><text x="${p[0]}" y="${p[1] - 8}" font-size="9" text-anchor="middle" fill="var(--mu)">${raw(v[i])}</text>`)}<text x="4" y="154" font-size="9" fill="var(--mu)">${raw(ks[0])}</text><text x="316" y="154" font-size="9" text-anchor="end" fill="var(--mu)">${raw(ks[ks.length - 1])}</text></svg>` : '<p class="mu">Registra tu peso para ver la gráfica.</p>')}</div>${L.length ? html`<div class="cd"><b>Actual: ${raw(cur)} kg</b><div class="g2" style="margin-top:8px"><div><small>Máx. ganado</small><br><b style="color:#e5484d">+${Math.max(0, Math.max(...all) - w0).toFixed(1)} kg</b></div><div><small>Máx. perdido</small><br><b style="color:#2ecc71">−${Math.max(0, w0 - Math.min(...all)).toFixed(1)} kg</b></div></div>${raw(bm ? html`<p><b>IMC ${bm.toFixed(1)} · ${bmiLabel(bm)}</b><br><small>Peso saludable para tu altura (OMS): ${roundInt(18.5 * (h / 100) ** 2)}-${roundInt(24.9 * (h / 100) ** 2)} kg. El IMC puede sobrestimar el sobrepeso en personas con mucha masa muscular.</small></p>` : '<p class="mu"><small>Añade tu altura en Perfil para clasificar tu peso según el IMC (OMS).</small></p>')}</div>` : ''}`;
}
A.zwv = () => {
  setWeightView(1);
  R();
};
A.zwvb = () => {
  setWeightView(0);
  R();
};
A.zrg = i => {
  S.rg = i;
  saveState();
  R();
};
A.zwva = () => {
  const w = +$('#wv').value;
  const d = $('#wd').value;
  if (!w || !d)
    return;
  S.wl = (S.wl || []).filter(p => p.d != d).concat({ d, w });
  S.bio.w = S.wl.slice().sort((a, b) => a.d < b.d ? -1 : 1).pop().w;
  applyDiet();
  saveState();
  R();
};

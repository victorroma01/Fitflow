/* ═══ extras/summary ═══
   Resumen del entreno e imagen para compartir.
   Define: pctChange, signed, summaryData, deltaChip, showSummary, summaryImage  · acciones/registros: 1
*/
import { est1RM, fmtDateShort } from '../core/util.js';
import { toast } from '../core/toast.js';
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { S } from '../core/state.js';
import { icon } from '../core/icons.js';
import { dialog, sheet } from '../core/ui.js';
import { lastSummary, newRecords, setLastSummary } from '../workout/finish.js';
import { weekStats } from '../dashboard/home.js';
import { toDisplayWeight, volumeText, weightUnit } from '../profile/units.js';
import { checkAchievements } from './achievements.js';
import { html, raw } from '../core/html.js';
const pctChange = (a, b) => {
  if (!(b > 0))
    return null;
  return Math.round((a - b) / b * 100);
};
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
function summaryData() {
  const l = S.logs[S.logs.length - 1];
  if (!l)
    return null;
  const sn = lastSummary && lastSummary.n == l.n ? lastSummary : null;
  const o = { l, n: l.n, d: l.d, pr: [], ex: [], dv: null, ds: null, dm: null, volRec: false, st: 0 };
  if (sn) {
    sn.ex.forEach(e => {
      let b = null;
      e.sets.forEach(s => {
        if (s[1] > 0 && (!b || est1RM(s[1], s[0]) > est1RM(b[1], b[0])))
          b = s;
      });
      const isPr = (newRecords || []).indexOf(e.n) >= 0;
      o.ex.push({ n: e.n, k: e.sets.length, b, u: e.u, pr: isPr });
      if (isPr && b)
        o.pr.push({ n: e.n, w: b[1], r: b[0] });
    });
    if (sn.pv) {
      o.dv = pctChange(l.v, sn.pv.v);
      o.ds = l.s - sn.pv.s;
      o.dm = (+l.m || 0) - (+sn.pv.m || 0);
    }
    if (sn.old.length >= 2 && l.v > 0 && sn.old.every(x => x.v < l.v))
      o.volRec = true;
  }
  try {
    o.st = weekStats().st;
  }
  catch (e) {
    logError('resumen: racha semanal', e);
  }
  return o;
}
const deltaChip = (txt, cl) => html`<span class="f2dc ${raw(cl || '')}">${raw(txt)}</span>`;
export function showSummary() {
  try {
    const o = summaryData();
    if (!o)
      return;
    setLastSummary(lastSummary || {});
    lastSummary.sm = o;
    const l = o.l;
    let h = html`<h3 style="margin:0">Entreno guardado</h3><small class="mu">${l.n} · ${raw(fmtDateShort(l.d, { weekday: 'long', day: 'numeric', month: 'long' }))}</small><div class="g2 f2tl"><div class="cd"><b>${raw(l.s)}</b><small>${l.s == 1 ? 'Serie' : 'Series'}</small></div><div class="cd"><b>${raw(volumeText(l.v, 1))}</b><small>Volumen</small></div><div class="cd"><b>${raw(l.m)} min</b><small>Tiempo</small></div><div class="cd"><b>${raw(l.q > 0 ? l.q : '—')}</b><small>Esfuerzo (RPE)</small></div></div>`;
    const ch = [];
    if (o.dv != null)
      ch.push(deltaChip(signed(o.dv) + ' % volumen', o.dv > 0 ? 'up' : o.dv < 0 ? 'dn' : ''));
    if (o.ds)
      ch.push(deltaChip(signed(o.ds) + (Math.abs(o.ds) == 1 ? ' serie' : ' series')));
    if (o.dm)
      ch.push(deltaChip(signed(o.dm) + ' min'));
    if (o.volRec)
      ch.push(deltaChip('Más volumen que nunca en este entreno', 'up'));
    if (ch.length)
      h += html`<div class="f2cmp"><small class="mu">Frente al entreno anterior</small><div>${raw(ch.join(''))}</div></div>`;
    if (o.pr.length)
      h += html`<div class="cd f2prc"><b>${raw(o.pr.length == 1 ? 'Récord personal' : o.pr.length + ' récords personales')}</b>${o.pr.map(p => html`<div class="it" style="grid-template-columns:1fr auto"><span>${p.n}</span><b>${toDisplayWeight(p.w)} ${weightUnit()} × ${raw(p.r)}</b></div>`)}</div>`;
    if (o.ex.length)
      h += html`<details class="cd"${o.pr.length ? '' : ' open'}><summary>Resumen por ejercicio</summary>${o.ex.slice(0, 14).map(e => html`<div class="it" style="grid-template-columns:1fr auto"><span>${e.n}<br><small>${raw(e.k)}${e.k == 1 ? ' serie' : ' series'}</small></span><small>${raw(e.b && !e.u ? toDisplayWeight(e.b[1]) + ' ' + weightUnit() + ' × ' + e.b[0] : '')}</small></div>`)}</details>`;
    if (o.st >= 2)
      h += html`<p class="mu" style="font-size:13px;margin:6px 2px">Llevas ${o.st} semanas seguidas cumpliendo tu objetivo.</p>`;
    h += html`<div class="g2" style="margin-top:12px"><button data-a="f2sh">${icon('shr', 18)} Compartir</button><button class="pr" data-a="cl">Listo</button></div>`;
    sheet(h);
    summaryImage(o).then(b => {
      if (lastSummary)
        lastSummary.blob = b;
    }).catch(() => {
    });
    setTimeout(checkAchievements, 400);
  }
  catch (e) {
    const l = S.logs[S.logs.length - 1];
    if (l)
      dialog('Entreno guardado', l.s + ' series · ' + l.m + ' min', [['Listo', 'zno', 'pr']]);
  }
}
function summaryImage(o) {
  return new Promise((res, rej) => {
    try {
      const W_ = 1080;
      const H_ = 1350;
      const c = document.createElement('canvas');
      c.width = W_;
      c.height = H_;
      const g = c.getContext('2d');
      const st = getComputedStyle(document.documentElement);
      const a1 = st.getPropertyValue('--a1').trim() || '#b183ff';
      const a2 = st.getPropertyValue('--a2').trim() || '#7a45ee';
      const FNT = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
      let bg = g.createLinearGradient(0, 0, 0, H_);
      bg.addColorStop(0, '#0e0d14');
      bg.addColorStop(1, '#07070a');
      g.fillStyle = bg;
      g.fillRect(0, 0, W_, H_);
      let gl = g.createRadialGradient(180, 60, 0, 180, 60, 900);
      gl.addColorStop(0, a2 + 'aa');
      gl.addColorStop(1, '#0000');
      g.fillStyle = gl;
      g.fillRect(0, 0, W_, H_);
      const rr = (x, y, w, h, r) => {
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
      };
      const tx = (t, x, y, sz, wt, col, al) => {
        g.font = wt + ' ' + sz + 'px ' + FNT;
        g.fillStyle = col;
        g.textAlign = al || 'left';
        g.textBaseline = 'alphabetic';
        g.fillText(t, x, y);
      };
      const fit = (t, max, sz, wt) => {
        g.font = wt + ' ' + sz + 'px ' + FNT;
        if (g.measureText(t).width <= max)
          return t;
        while (t.length > 1 && g.measureText(t + '…').width > max)
          t = t.slice(0, -1);
        return t + '…';
      };
      const P = 84;
      let x = P;
      'STRATAFIT'.split('').forEach(ch => {
        tx(ch, x, 128, 34, 800, a1);
        g.font = '800 34px ' + FNT;
        x += g.measureText(ch).width + 9;
      });
      const l = o.l;
      const words = String(l.n).split(' ');
      let ln = [''];
      let mw = W_ - 2 * P;
      g.font = '800 92px ' + FNT;
      words.forEach(w => {
        const t = (ln[ln.length - 1] + ' ' + w).trim();
        if (g.measureText(t).width <= mw || !ln[ln.length - 1])
          ln[ln.length - 1] = t;
        else
          ln.push(w);
      });
      ln = ln.slice(0, 2);
      let y = 250;
      ln.forEach(t => {
        tx(fit(t, mw, 92, 800), P, y, 92, 800, '#fff');
        y += 104;
      });
      tx(fmtDateShort(l.d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), P, y - 10, 38, 500, '#a9a9b8');
      const ty = ln.length > 1 ? 500 : 430;
      const TW = (W_ - 2 * P - 36) / 2;
      const TH = 230;
      const tiles = [[String(l.s), l.s == 1 ? 'serie' : 'series'], [volumeText(l.v, 1), 'volumen'], [l.m + ' min', 'tiempo'], [l.q > 0 ? String(l.q) : '—', 'esfuerzo (RPE)']];
      tiles.forEach((t, i) => {
        const tx0 = P + (i % 2) * (TW + 36);
        const ty0 = ty + Math.floor(i / 2) * (TH + 36);
        rr(tx0, ty0, TW, TH, 36);
        g.fillStyle = '#ffffff12';
        g.fill();
        g.strokeStyle = '#ffffff22';
        g.lineWidth = 2;
        g.stroke();
        tx(t[0], tx0 + 40, ty0 + 128, 92, 800, '#fff');
        tx(t[1], tx0 + 40, ty0 + 190, 34, 500, '#a9a9b8');
      });
      let yy = ty + 2 * TH + 36 + 90;
      const lines = [];
      if (o.pr.length) {
        lines.push(['Récords personales', a1]);
        o.pr.slice(0, 3).forEach(p => lines.push([fit(p.n, 560, 40, 600) + '|' + toDisplayWeight(p.w) + ' ' + weightUnit() + ' × ' + p.r, '#fff']));
      }
      else if (o.ex.length) {
        lines.push(['Mejores series', a1]);
        o.ex.filter(e => e.b && !e.u).slice(0, 3).forEach(e => lines.push([fit(e.n, 560, 40, 600) + '|' + toDisplayWeight(e.b[1]) + ' ' + weightUnit() + ' × ' + e.b[0], '#fff']));
      }
      lines.forEach((r, i) => {
        if (i == 0) {
          tx(r[0], P, yy, 36, 800, r[1]);
          yy += 62;
        }
        else {
          const p = r[0].split('|');
          tx(p[0], P, yy, 40, 600, '#fff');
          tx(p[1], W_ - P, yy, 40, 800, '#fff', 'right');
          yy += 62;
        }
      });
      const cm = [];
      if (o.dv != null)
        cm.push(signed(o.dv) + ' % de volumen');
      if (o.ds)
        cm.push(signed(o.ds) + (Math.abs(o.ds) == 1 ? ' serie' : ' series'));
      if (cm.length)
        tx(cm.join('  ·  ') + ' vs. el entreno anterior', P, Math.max(yy + 30, 1215), 34, 600, '#7ee0b5');
      tx('Registrado con StrataFit', W_ / 2, 1295, 28, 500, '#7c7c8c', 'center');
      c.toBlob(b => b ? res(b) : rej('blob'), 'image/png');
    }
    catch (e) {
      rej(e);
    }
  });
}
A.f2sh = async () => {
  try {
    let b = lastSummary && lastSummary.blob;
    if (!b) {
      const o = lastSummary && lastSummary.sm || summaryData();
      b = await summaryImage(o);
      if (lastSummary)
        lastSummary.blob = b;
    }
    const f = new File([b], 'stratafit-entreno.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try {
        await navigator.share({ files: [f], title: 'Mi entreno' });
        return;
      }
      catch (e) {
        if (e && e.name == 'AbortError')
          return;
      }
    }
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'stratafit-entreno.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
    toast('Imagen guardada');
  }
  catch (e) {
    toast('No se pudo crear la imagen');
  }
};

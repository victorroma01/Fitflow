/* ═══ extras/measures ═══
   Medidas corporales y fotos de progreso.
   Define: MEASURES, PHOTO_ANGLES, measureState, photoCache, photoCount, photoDbPromise, openPhotoDb, photoDb, photoTx, measuresShown, loadPhotos, preparePhoto, photoFull, allPhotosFull, validPhoto, mergePhotos, … (+7)  · acciones/registros: 15
*/
import { dayKey, fmtDateShort, newId, round1 } from '../core/util.js';
import { toast } from '../core/toast.js';
import { logError } from '../core/errors.js';
import { A, C } from '../core/registry.js';
import { S, saveState } from '../core/state.js';
import { icon } from '../core/icons.js';
import { confirmDialog, fullPage, pgHead, sheet } from '../core/ui.js';
import { checkAchievements } from './achievements.js';
import { html, raw } from '../core/html.js';
export const MEASURES = [['cu', 'Cuello'], ['ho', 'Hombros'], ['pe', 'Pecho'], ['br', 'Brazo'], ['ci', 'Cintura'], ['ca', 'Cadera'], ['mu', 'Muslo'], ['ge', 'Gemelo']];
const PHOTO_ANGLES = { f: 'Frente', s: 'Lado', b: 'Espalda' };
let measureState = { tab: 0, ang: 'f', k: 'ci', cmp: 0, sel: [] };
let photoCache = [];
export let photoCount = 0;
let photoDbPromise = null;
const openPhotoDb = () => new Promise((res, rej) => {
  try {
    if (!window.indexedDB)
      return rej('no');
    const r = indexedDB.open('ffph', 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('m'))
        db.createObjectStore('m', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('f'))
        db.createObjectStore('f', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error || 'err');
    r.onblocked = () => rej('blk');
  }
  catch (e) {
    rej(e);
  }
});
const photoDb = () => photoDbPromise || (photoDbPromise = openPhotoDb().catch(e => {
  photoDbPromise = null;
  throw e;
}));
const photoTx = (st, mode, fn) => photoDb().then(db => new Promise((res, rej) => {
  let tx;
  try {
    tx = db.transaction(st, mode);
  }
  catch (e) {
    rej(e);
    return;
  }
  let rq;
  tx.oncomplete = () => res(rq && 'result' in rq ? rq.result : undefined);
  tx.onerror = () => rej(tx.error || 'tx');
  tx.onabort = () => rej(tx.error || 'abort');
  try {
    rq = fn(tx);
  }
  catch (e) {
    try {
      tx.abort();
    }
    catch (_) {
      /* la transacción ya se cerró */
    }
    rej(e);
  }
}));
const measuresShown = () => !!document.querySelector('#sh.full #f2ms');
export const loadPhotos = () => photoTx('m', 'readonly', tx => tx.objectStore('m').getAll()).then(a => {
  photoCache = (a || []).filter(x => x && x.id && typeof x.t == 'string').sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : (a.id < b.id ? 1 : -1));
  photoCount = photoCache.length;
  if (measuresShown() && measureState.tab == 1 && !measureState.view)
    fullPage(measuresPage());
}).catch(() => {
});
async function preparePhoto(f) {
  let bm;
  try {
    bm = await createImageBitmap(f, { imageOrientation: 'from-image' });
  }
  catch (e) {
    bm = await new Promise((res, rej) => {
      const u = URL.createObjectURL(f);
      const im = new Image();
      im.onload = () => {
        URL.revokeObjectURL(u);
        res(im);
      };
      im.onerror = () => {
        URL.revokeObjectURL(u);
        rej('img');
      };
      im.src = u;
    });
  }
  const W0 = bm.width || bm.naturalWidth;
  const H0 = bm.height || bm.naturalHeight;
  if (!W0 || !H0)
    throw 'dim';
  const enc = (mx, q) => {
    const k = Math.min(1, mx / Math.max(W0, H0));
    const w = Math.max(1, Math.round(W0 * k));
    const h = Math.max(1, Math.round(H0 * k));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    g.drawImage(bm, 0, 0, w, h);
    return c.toDataURL('image/jpeg', q);
  };
  const r = { u: enc(960, .72), t: enc(300, .65) };
  if (bm.close)
    bm.close();
  return r;
}
C.f2ph = async (e) => {
  const f = e.files && e.files[0];
  e.value = '';
  if (!f)
    return;
  if (photoCount >= 60) {
    toast('Límite de 60 fotos: borra alguna antes');
    return;
  }
  toast('Guardando foto…');
  try {
    const r = await preparePhoto(f);
    const id = newId();
    const d = dayKey(new Date);
    const a = measureState.ang;
    await photoTx(['m', 'f'], 'readwrite', tx => {
      tx.objectStore('m').put({ id, d, a, t: r.t });
      tx.objectStore('f').put({ id, u: r.u });
    });
    try {
      navigator.storage && navigator.storage.persist && navigator.storage.persist();
    }
    catch (_) {
      /* almacenamiento persistente opcional */
    }
    await loadPhotos();
    checkAchievements();
    if (measuresShown())
      fullPage(measuresPage());
    toast('Foto guardada');
  }
  catch (x) {
    toast('No se pudo guardar la foto en este dispositivo');
  }
};
const photoFull = id => photoTx('f', 'readonly', tx => tx.objectStore('f').get(id)).then(r => r && r.u);
export const allPhotosFull = async () => {
  const [m, f] = await Promise.all([photoTx('m', 'readonly', tx => tx.objectStore('m').getAll()), photoTx('f', 'readonly', tx => tx.objectStore('f').getAll())]);
  const fm = {};
  (f || []).forEach(x => {
    if (x && x.id)
      fm[x.id] = x.u;
  });
  return (m || []).filter(x => x && x.id && fm[x.id]).map(x => ({ id: x.id, d: x.d, a: x.a, t: x.t, u: fm[x.id] }));
};
const validPhoto = p => p && typeof p.id == 'string' && p.id.length <= 40 && /^[\w-]+$/.test(p.id) && /^\d{4}-\d{2}-\d{2}$/.test(p.d || '') && PHOTO_ANGLES[p.a] && typeof p.t == 'string' && typeof p.u == 'string' && p.t.length < 4e5 && p.u.length < 2.5e6 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.t) && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.u);
export const mergePhotos = async (arr) => {
  const L = (Array.isArray(arr) ? arr : []).filter(validPhoto).slice(0, 80);
  if (!L.length)
    return 0;
  await photoTx(['m', 'f'], 'readwrite', tx => {
    L.forEach(p => {
      tx.objectStore('m').put({ id: p.id, d: p.d, a: p.a, t: p.t });
      tx.objectStore('f').put({ id: p.id, u: p.u });
    });
  });
  await loadPhotos();
  return L.length;
};
export function measureList() {
  return (Array.isArray(S.ms) ? S.ms : []).filter(m => m && typeof m.d == 'string' && m.v && typeof m.v == 'object');
}
function measureDelta(k) {
  const L = measureList().filter(m => +m.v[k] > 0);
  if (!L.length)
    return null;
  const a = L[L.length - 1];
  const b = L[L.length - 2];
  return { v: +a.v[k], d: a.d, p: b ? +b.v[k] : null, pd: b ? b.d : null };
}
function measureChart(k) {
  const nm = (MEASURES.find(x => x[0] == k) || [0, ''])[1];
  const pts = measureList().filter(m => +m.v[k] > 0).map(m => ({ d: m.d, y: +m.v[k] }));
  if (pts.length < 2)
    return html`<p class="mu" style="font-size:13px;margin:8px 2px">Con dos mediciones de «${raw(nm)}» verás aquí su evolución.</p>`;
  const w = 300;
  const h = 120;
  const px = 14;
  const py = 18;
  const ys = pts.map(p => p.y);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const sp = Math.max(1, hi - lo);
  const xx = i => px + i * (w - 2 * px) / (pts.length - 1);
  const yy = y => h - py - (y - lo) / sp * (h - 2 * py);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + xx(i).toFixed(1) + ' ' + yy(p.y).toFixed(1)).join(' ');
  return html`<svg viewBox="0 0 ${w} ${h}" class="f2ch" role="img" aria-label="Evolución de ${raw(nm)}"><path d="${raw(d)}" fill="none" stroke="var(--a1)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((p, i) => html`<circle cx="${xx(i).toFixed(1)}" cy="${yy(p.y).toFixed(1)}" r="${i == pts.length - 1 ? 4.5 : 3}" fill="${i == pts.length - 1 ? 'var(--a1)' : 'var(--bg)'}" stroke="var(--a1)" stroke-width="2"/>`)}<text x="${px}" y="${h - 2}" font-size="10" fill="var(--mu)">${raw(fmtDateShort(pts[0].d, { day: 'numeric', month: 'short' }))}</text><text x="${w - px}" y="${h - 2}" font-size="10" text-anchor="end" fill="var(--mu)">${raw(fmtDateShort(pts[pts.length - 1].d, { day: 'numeric', month: 'short' }))}</text><text x="${w - px}" y="11" font-size="11" font-weight="700" text-anchor="end" fill="var(--tx)">${round1(pts[pts.length - 1].y)} cm</text></svg>`;
}
function measuresTab() {
  const L = measureList();
  const has = MEASURES.filter(x => measureDelta(x[0]));
  let h = '<button class="pr" data-a="msnew" style="width:100%;margin-top:12px">Nueva medición</button>';
  if (!L.length)
    return html`${raw(h)}<p class="mu" style="margin:14px 2px;font-size:14px">Mide con una cinta métrica, siempre en el mismo punto y a la misma hora. Cada pocas semanas basta para ver cómo cambia tu cuerpo, aunque el peso no se mueva.</p>`;
  if (!has.some(x => x[0] == measureState.k))
    measureState.k = has[0][0];
  h += html`<div style="margin-top:10px">${has.map(x => html`<button class="chip ${measureState.k == x[0] ? 'on' : ''}" data-a="msk" data-v="${raw(x[0])}">${raw(x[1])}</button>`)}</div><div class="cd" style="margin-top:8px">${measureChart(measureState.k)}</div>`;
  h += html`<div class="cd"><div class="row"><b>Última medición</b><small>${raw(fmtDateShort(L[L.length - 1].d, { day: 'numeric', month: 'long' }))}</small></div>${has.map(x => {
    const t = measureDelta(x[0]);
    const df = t.p != null ? Math.round((t.v - t.p) * 10) / 10 : null;
    return html`<div class="it" style="grid-template-columns:1fr auto auto;gap:12px"><span>${raw(x[1])}</span><b>${round1(t.v)} cm</b><small style="min-width:52px;text-align:right">${raw(df == null ? '' : df == 0 ? 'igual' : (df > 0 ? '+' : '−') + Math.abs(df))}</small></div>`;
  })}</div>`;
  h += html`<details class="cd"><summary>Historial (${L.length})</summary>${L.slice().reverse().map((m, i) => html`<div class="it exr" data-a="msdel" data-i="${L.length - 1 - i}" style="cursor:pointer"><span><b>${raw(fmtDateShort(m.d, { day: 'numeric', month: 'long', year: 'numeric' }))}</b><br><small>${raw(MEASURES.filter(x => +m.v[x[0]] > 0).map(x => x[1] + ' ' + round1(+m.v[x[0]])).join(' · '))}</small></span></div>`)}<p class="mu" style="font-size:12px;margin:8px 0 0">Toca una medición para borrarla.</p></details>`;
  return h;
}
function photosTab() {
  let h = html`<div class="seg" style="margin-top:12px">${Object.keys(PHOTO_ANGLES).map(k => html`<button class="${measureState.ang == k ? 'on' : ''}" data-a="pha" data-v="${raw(k)}">${raw(PHOTO_ANGLES[k])}</button>`)}</div><div class="g2" style="margin-top:10px"><label class="btnl pr" style="margin:0;font-weight:700">${icon('camera', 18)}&nbsp;Añadir foto<input type="file" accept="image/*" hidden data-c="f2ph"></label><button data-a="phcmp" class="${measureState.cmp ? 'on' : ''}" style="${measureState.cmp ? 'background:var(--a2);color:var(--ft);border-color:var(--a2)' : ''}">${measureState.cmp ? 'Cancelar' : 'Comparar'}</button></div><p class="mu" style="font-size:12px;margin:8px 2px">Las fotos se guardan solo en este dispositivo. Entran en la copia de seguridad en archivo, no en la copia como texto.</p>`;
    if (measureState.cmp)
        h += html`<div class="cd" style="margin:8px 0;padding:10px;text-align:center">${measureState.sel.length == 0 ? 'Elige la primera foto' : 'Elige la segunda foto'}</div>`;
    if (!photoCache.length)
        return html`${raw(h)}<p class="mu" style="margin:14px 2px;font-size:14px">Aún no hay fotos. Haz una cada pocas semanas con la misma luz, distancia y pose.</p>`;
    h += html`<div class="f2gr">${photoCache.map((p, i) => html`<button class="f2th${measureState.sel.indexOf(p.id) >= 0 ? ' sl' : ''}" data-a="phv" data-i="${i}"><img src="${raw(p.t)}" alt="${raw(PHOTO_ANGLES[p.a])} ${raw(fmtDateShort(p.d))}" loading="lazy"><span>${raw(fmtDateShort(p.d))} · ${raw(PHOTO_ANGLES[p.a])}</span></button>`)}</div>`;
    return h;
}
function measuresPage() {
    measureState.view = 0;
    return html`<div id="f2ms">${pgHead('Medidas y fotos')}<div class="seg" style="grid-template-columns:1fr 1fr"><button class="${measureState.tab == 0 ? 'on' : ''}" data-a="mstab" data-v="0">Medidas</button><button class="${measureState.tab == 1 ? 'on' : ''}" data-a="mstab" data-v="1">Fotos</button></div>${raw(measureState.tab == 0 ? measuresTab() : photosTab())}<div style="height:30px"></div></div>`;
}
A.f2ms = () => {
    measureState.cmp = 0;
    measureState.sel = [];
    fullPage(measuresPage());
    loadPhotos();
};
A.mstab = (i, b) => {
    measureState.tab = +b.dataset.v;
    measureState.cmp = 0;
    measureState.sel = [];
    sheet(measuresPage());
};
A.msk = (i, b) => {
    measureState.k = b.dataset.v;
    sheet(measuresPage());
};
A.pha = (i, b) => {
    measureState.ang = b.dataset.v;
    sheet(measuresPage());
};
A.phcmp = () => {
    measureState.cmp = measureState.cmp ? 0 : 1;
    measureState.sel = [];
    sheet(measuresPage());
};
A.msb = () => {
    sheet(measuresPage());
};
A.msnew = () => {
    const td = dayKey(new Date);
    const last = {};
    MEASURES.forEach(x => {
        const t = measureDelta(x[0]);
        if (t)
            last[x[0]] = t.v;
    });
    sheet(html`<div id="f2ms">${pgHead('Nueva medición', 'msb')}<label>Fecha</label><input id="f2md" type="date" value="${raw(td)}" max="${raw(td)}"><p class="mu" style="font-size:13px;margin:10px 2px 0">Rellena solo lo que midas. Valores en centímetros.</p><div class="g2">${MEASURES.map(x => html`<div><label>${raw(x[1])} (cm)</label><input id="f2m_${raw(x[0])}" type="number" inputmode="decimal" step="0.1" min="10" max="300" placeholder="${last[x[0]] ? round1(last[x[0]]) : ''}"></div>`)}</div><div style="height:90px"></div><div class="sb"><button class="pr" data-a="mssv" style="width:100%;padding:14px">Guardar medición</button></div></div>`);
};
A.mssv = () => {
    const g = id => document.getElementById(id);
    const d0 = (g('f2md') || {}).value;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(d0 || '') && d0 <= dayKey(new Date) ? d0 : dayKey(new Date);
    const v = {};
    MEASURES.forEach(x => {
        const e = g('f2m_' + x[0]);
        const n = e ? parseFloat(String(e.value).replace(',', '.')) : NaN;
        if (n >= 10 && n <= 300)
            v[x[0]] = Math.round(n * 10) / 10;
    });
    if (!Object.keys(v).length) {
        toast('Indica al menos una medida');
        return;
    }
    const L = measureList().filter(m => m.d != d);
    const old = measureList().find(m => m.d == d);
    S.ms = L.concat({ d, v: Object.assign({}, old ? old.v : {}, v) }).sort((a, b) => a.d < b.d ? -1 : 1);
    saveState();
    checkAchievements();
    toast('Medición guardada');
    sheet(measuresPage());
};
A.msdel = i => {
    const m = measureList()[i];
    if (!m)
        return;
    measureState.di = i;
    confirmDialog('¿Borrar esta medición?', fmtDateShort(m.d, { day: 'numeric', month: 'long', year: 'numeric' }), 'msdl', 'Borrar');
};
A.msdl = () => {
    const m = measureList()[measureState.di];
    if (m) {
        S.ms = measureList().filter(x => x !== m);
        saveState();
    }
    measureState.di = -1;
    sheet(measuresPage());
};
A.phv = async (i, b) => {
    const p = photoCache[i];
    if (!p)
        return;
    if (measureState.cmp) {
        const k = measureState.sel.indexOf(p.id);
        if (k >= 0)
            measureState.sel.splice(k, 1);
        else
            measureState.sel.push(p.id);
        if (measureState.sel.length == 2) {
            comparePhotos();
            return;
        }
        sheet(measuresPage());
        return;
    }
    measureState.view = 1;
    sheet(html`<div id="f2ms">${pgHead('Foto', 'msb')}<div class="f2pv" id="f2pi"><div class="mu" style="padding:40px 0;text-align:center">Cargando…</div></div><div class="row" style="margin:10px 2px"><b>${raw(fmtDateShort(p.d, { day: 'numeric', month: 'long', year: 'numeric' }))}</b><small>${raw(PHOTO_ANGLES[p.a])}</small></div><div class="g2"><button data-a="phold" data-i="${raw(i)}">Comparar con la primera</button><button data-a="phdel" data-i="${raw(i)}" style="color:var(--c)">Borrar</button></div></div>`);
    try {
        const u = await photoFull(p.id);
        const e = document.getElementById('f2pi');
        if (e && u)
            e.innerHTML = html`<img src="${raw(u)}" alt="${raw(PHOTO_ANGLES[p.a])}">`;
    }
    catch (x) {
        logError('ver foto de progreso', x);
    }
};
A.phold = i => {
    const p = photoCache[i];
    if (!p)
        return;
    const same = photoCache.filter(x => x.a == p.a && x.id != p.id).sort((a, b) => a.d < b.d ? -1 : 1)[0];
    if (!same) {
        toast('No hay otra foto del mismo ángulo');
        return;
    }
    measureState.sel = [same.id, p.id];
    comparePhotos();
};
A.phdel = i => {
    const p = photoCache[i];
    if (!p)
        return;
    measureState.pi = p.id;
    confirmDialog('¿Borrar esta foto?', fmtDateShort(p.d, { day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + PHOTO_ANGLES[p.a], 'phdl', 'Borrar');
};
A.phdl = async () => {
    const id = measureState.pi;
    measureState.pi = null;
    if (!id)
        return;
    try {
        await photoTx(['m', 'f'], 'readwrite', tx => {
            tx.objectStore('m').delete(id);
            tx.objectStore('f').delete(id);
        });
        await loadPhotos();
    }
    catch (e) {
        toast('No se pudo borrar');
    }
    measureState.sel = [];
    measureState.cmp = 0;
    sheet(measuresPage());
};
async function comparePhotos() {
    const ps = measureState.sel.map(id => photoCache.find(p => p.id == id)).filter(Boolean).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
    if (ps.length < 2) {
        measureState.sel = [];
        sheet(measuresPage());
        return;
    }
    measureState.view = 1;
    const dd = Math.round((new Date(ps[1].d + 'T12:00:00') - new Date(ps[0].d + 'T12:00:00')) / 864e5);
    sheet(html`<div id="f2ms">${pgHead('Antes y después', 'msb')}<div class="f2cm"><div><div class="f2pv" id="f2ca"><div class="mu" style="padding:30px 0;text-align:center">…</div></div><b>${raw(fmtDateShort(ps[0].d, { day: 'numeric', month: 'short', year: 'numeric' }))}</b><small>${raw(PHOTO_ANGLES[ps[0].a])}</small></div><div><div class="f2pv" id="f2cb"><div class="mu" style="padding:30px 0;text-align:center">…</div></div><b>${raw(fmtDateShort(ps[1].d, { day: 'numeric', month: 'short', year: 'numeric' }))}</b><small>${raw(PHOTO_ANGLES[ps[1].a])}</small></div></div><p class="mu" style="text-align:center;margin:12px 0">${raw(dd == 0 ? 'Mismo día' : dd + (dd == 1 ? ' día' : ' días') + ' entre las dos fotos')}</p></div>`);
    measureState.cmp = 0;
    measureState.sel = [];
    try {
        const [a, b] = await Promise.all([photoFull(ps[0].id), photoFull(ps[1].id)]);
        const ea = document.getElementById('f2ca');
        const eb = document.getElementById('f2cb');
        if (ea && a)
            ea.innerHTML = html`<img src="${raw(a)}" alt="">`;
        if (eb && b)
            eb.innerHTML = html`<img src="${raw(b)}" alt="">`;
    }
    catch (x) {
        logError('comparar fotos', x);
    }
}

/* ═══ extras/foods-online ═══
   Alimentos en línea (Open Food Facts) y escáner de códigos.
   Define: onlineFoods, onlineTimer, fetchTimeout, offProduct, searchOnline, EAN_L, EAN_G, EAN_R, EAN_PARITY, EAN_LEFT, EAN_RIGHT, eanDigit, eanFromRuns, eanFromRow, … (+7)  · acciones/registros: 6
*/
import { $, X } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A, U } from '../core/registry.js';
import { addState, S, saveState } from '../core/state.js';
import { onSheetClose, sheet } from '../core/ui.js';
import { addSheet, foodList } from '../nutrition/add.js';
var onlineFoods = [];
let onlineTimer = 0;
async function fetchTimeout(url, ms) {
  const ac = typeof AbortController != 'undefined' ? new AbortController() : null;
  const t = ac ? setTimeout(() => ac.abort(), ms || 9000) : 0;
  try {
    const r = await fetch(url, { signal: ac ? ac.signal : undefined, headers: { Accept: 'application/json' } });
    if (r.status == 429 || r.status == 503)
      throw 'busy';
    if (r.status == 404)
      return { _nf: 1 };
    if (!r.ok)
      throw 'http';
    return await r.json();
  }
  finally {
    if (t)
      clearTimeout(t);
  }
}
function offProduct(p) {
  try {
    if (!p || typeof p != 'object')
      return null;
    const nm = String(p.product_name_es || p.product_name || '').trim();
    if (!nm)
      return null;
    const m = p.nutriments && typeof p.nutriments == 'object' ? p.nutriments : {};
    const num = k => {
      const v = parseFloat(m[k]);
      return isFinite(v) ? v : null;
    };
    let kc = num('energy-kcal_100g');
    if (kc == null) {
      const kj = num('energy_100g');
      if (kj != null)
        kc = kj / 4.184;
    }
    if (kc == null)
      return null;
    const c = num('carbohydrates_100g') || 0;
    const pr = num('proteins_100g') || 0;
    const f = num('fat_100g') || 0;
    const fi = num('fiber_100g') || 0;
    let sa = num('salt_100g');
    if (sa == null) {
      const so = num('sodium_100g');
      sa = so != null ? so * 2.5 : 0;
    }
    if (kc < 0 || kc > 950 || c < 0 || pr < 0 || f < 0 || c > 100 || pr > 100 || f > 100 || c + pr + f > 105)
      return null;
    const brs = Array.isArray(p.brands) ? p.brands[0] : String(p.brands || '');
    const br = String(brs || '').split(',')[0].trim();
    const r1 = v => Math.round(v * 10) / 10;
    return { n: nm.slice(0, 60) + (br ? ' (' + br.slice(0, 24) + ')' : ''), b: [Math.round(kc), r1(c), r1(pr), r1(f), r1(Math.max(0, fi)), Math.round(Math.max(0, sa) * 100) / 100], ean: String(p.code || p._id || '').replace(/\D/g, '').slice(0, 14) };
  }
  catch (e) {
    return null;
  }
}
async function searchOnline(q) {
  const fl_ = 'code,product_name,product_name_es,brands,nutriments';
  let j;
  try {
    j = await fetchTimeout('https://world.openfoodfacts.org/cgi/search.pl?search_terms=' + encodeURIComponent(q) + '&search_simple=1&action=process&json=1&page_size=24&sort_by=unique_scans_n&fields=' + fl_, 10000);
  }
  catch (e) {
    if (e === 'busy')
      throw e;
    j = await fetchTimeout('https://search.openfoodfacts.org/search?q=' + encodeURIComponent(q) + '&page_size=24&langs=es&fields=' + fl_, 10000);
  }
  const arr = j && Array.isArray(j.products) ? j.products : j && Array.isArray(j.hits) ? j.hits : [];
  const seen = new Set();
  return arr.map(offProduct).filter(x => {
    if (!x || seen.has(x.n))
      return false;
    seen.add(x.n);
    return true;
  });
}
A.f2os = async () => {
  const inp = document.querySelector('input[data-u="fs"]');
  const q = ((inp && inp.value) || '').trim();
  const e = $('#rs');
  if (!e)
    return;
  if (q.length < 2) {
    toast('Escribe al menos 2 letras');
    return;
  }
  if (Date.now() - onlineTimer < 6000) {
    toast('Espera unos segundos entre búsquedas');
    return;
  }
  onlineTimer = Date.now();
  e.innerHTML = '<p class="mu" style="margin:10px 2px">Buscando en Open Food Facts…</p>';
  try {
    const L = await searchOnline(q);
    onlineFoods = L;
    const e2 = $('#rs');
    if (!e2)
      return;
    e2.innerHTML = L.length ? '<small class="mu" style="display:block;margin:6px 2px">Valores por 100 g · datos de Open Food Facts (ODbL)</small>' + L.map((f, i) => '<div class="it" style="grid-template-columns:1fr auto" data-a="f2op" data-i="' + i + '"><span>' + X(f.n) + '</span><small>' + f.b[0] + ' kcal</small></div>').join('') : '<p class="mu" style="margin:10px 2px">No hay resultados para «' + X(q) + '». Prueba con otra palabra o crea el alimento en «Nuevo».</p>';
  }
  catch (x) {
    const e2 = $('#rs');
    if (e2)
      e2.innerHTML = '<p class="mu" style="margin:10px 2px">' + (x === 'busy' ? 'Open Food Facts está saturado. Prueba en un minuto.' : 'No se pudo consultar. Comprueba tu conexión e inténtalo de nuevo.') + '</p>';
  }
};
A.f2op = i => {
  const f = onlineFoods[i];
  if (!f)
    return;
  addState.pick = { n: f.n, b: f.b.slice() };
  sheet(addSheet());
  U.gr(100);
};
const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const EAN_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
const EAN_LEFT = {};
const EAN_RIGHT = {};
EAN_L.forEach((b, d) => EAN_LEFT[b] = ['L', d]);
EAN_G.forEach((b, d) => EAN_LEFT[b] = ['G', d]);
EAN_R.forEach((b, d) => EAN_RIGHT[b] = d);
function eanDigit(r, p, startBar) {
  const t = r[p] + r[p + 1] + r[p + 2] + r[p + 3];
  const m = t / 7;
  let s = '';
  let sum = 0;
  const q = [];
  for (let k = 0; k < 4; k++) {
    const v = Math.round(r[p + k] / m);
    if (v < 1 || v > 4)
      return null;
    q.push(v);
    sum += v;
  }
  if (sum != 7)
    return null;
  for (let k = 0; k < 4; k++) {
    const bar = startBar ? k % 2 == 0 : k % 2 == 1;
    s += (bar ? '1' : '0').repeat(q[k]);
  }
  return s;
}
function eanFromRuns(r, firstDark) {
  const N = r.length;
  for (let i = 0; i + 59 <= N; i++) {
    const dark = firstDark ? i % 2 == 0 : i % 2 == 1;
    if (!dark)
      continue;
    const u = (r[i] + r[i + 1] + r[i + 2]) / 3;
    if (u < 1.2)
      continue;
    if (Math.abs(r[i] - u) > u * .6 || Math.abs(r[i + 1] - u) > u * .6 || Math.abs(r[i + 2] - u) > u * .6)
      continue;
    let p = i + 3;
    let ok = 1;
    let par = '';
    let dg = [];
    for (let d = 0; d < 6 && ok; d++) {
      const b = eanDigit(r, p, false);
      if (!b) {
        ok = 0;
        break;
      }
      const e = EAN_LEFT[b];
      if (!e) {
        ok = 0;
        break;
      }
      par += e[0];
      dg.push(e[1]);
      p += 4;
    }
    if (!ok)
      continue;
    let mg = 0;
    for (let k = 0; k < 5; k++)
      mg += r[p + k];
    if (Math.abs(mg - 5 * u) > u * 2.2)
      continue;
    p += 5;
    for (let d = 0; d < 6 && ok; d++) {
      const b = eanDigit(r, p, true);
      if (!b) {
        ok = 0;
        break;
      }
      const e = EAN_RIGHT[b];
      if (e == null) {
        ok = 0;
        break;
      }
      dg.push(e);
      p += 4;
    }
    if (!ok)
      continue;
    const first = EAN_PARITY.indexOf(par);
    if (first < 0)
      continue;
    const all = [first].concat(dg);
    let s = 0;
    for (let k = 0; k < 12; k++)
      s += all[k] * (k % 2 ? 3 : 1);
    if ((10 - s % 10) % 10 != all[12])
      continue;
    return all.join('');
  }
  return null;
}
function eanFromRow(a) {
  const n = a.length;
  if (n < 80)
    return null;
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = a[i - 1] != null ? a[i - 1] : a[i];
    const z = a[i + 1] != null ? a[i + 1] : a[i];
    s[i] = (x + a[i] * 2 + z) / 4;
  }
  let mn = 255;
  let mx = 0;
  for (let i = 0; i < n; i++) {
    if (s[i] < mn)
      mn = s[i];
    if (s[i] > mx)
      mx = s[i];
  }
  if (mx - mn < 35)
    return null;
  const pre = new Float32Array(n + 1);
  for (let i = 0; i < n; i++)
    pre[i + 1] = pre[i] + s[i];
  const tryBin = (thr) => {
    const bin = new Uint8Array(n);
    for (let i = 0; i < n; i++)
      bin[i] = s[i] < thr(i) ? 1 : 0;
    const runs = [];
    let c = bin[0];
    let l = 1;
    for (let i = 1; i < n; i++) {
      if (bin[i] == c)
        l++;
      else {
        runs.push(l);
        c = bin[i];
        l = 1;
      }
    }
    runs.push(l);
    const fd = bin[0] == 1;
    let r = eanFromRuns(runs, fd);
    if (r)
      return r;
    const rr = runs.slice().reverse();
    const lastDark = (runs.length % 2 == 1) ? fd : !fd;
    return eanFromRuns(rr, lastDark);
  };
  const mid = (mn + mx) / 2;
  let r = tryBin(() => mid);
  if (r)
    return r;
  const w = Math.max(12, n >> 4);
  r = tryBin(i => {
    const a0 = Math.max(0, i - w);
    const b0 = Math.min(n, i + w + 1);
    return (pre[b0] - pre[a0]) / (b0 - a0);
  });
  return r;
}
function eanFromFrame(img) {
  const W_ = img.width;
  const H_ = img.height;
  const d = img.data;
  const gray = new Uint8Array(W_ * H_);
  for (let i = 0, j = 0; i < d.length; i += 4, j++)
    gray[j] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
  const rows = [.5, .45, .55, .4, .6, .35, .65, .3, .7, .25, .75];
  for (const f of rows) {
    const y = Math.min(H_ - 1, Math.round(H_ * f));
    const row = gray.subarray(y * W_, y * W_ + W_);
    const r = eanFromRow(row);
    if (r)
      return r;
  }
  for (const f of rows) {
    const x = Math.min(W_ - 1, Math.round(W_ * f));
    const col = new Uint8Array(H_);
    for (let y = 0; y < H_; y++)
      col[y] = gray[y * W_ + x];
    const r = eanFromRow(col);
    if (r)
      return r;
  }
  return null;
}
let scanState = null;
const scanMsg = t => {
  const e = document.getElementById('f2sm');
  if (e)
    e.textContent = t;
};
function stopScan() {
  if (scanState) {
    scanState.run = 0;
    try {
      scanState.st.getTracks().forEach(t => t.stop());
    }
    catch (e) {
      /* la cámara ya estaba parada */
    }
    scanState = null;
  }
}
/* al cerrar la hoja (A.cl, core/ui) se apaga la cámara si estaba encendida */
onSheetClose.push(stopScan);
A.f2sc = () => {
  addState.pick = null;
  sheet('<h3>Escanear código de barras</h3><div class="f2sv"><video id="f2v" playsinline muted autoplay></video><div class="f2gd"></div></div><p id="f2sm" class="mu" style="margin:8px 2px;font-size:13px">Abriendo la cámara…</p>'
    + '<label>O escribe el código (8 a 14 cifras)</label><div class="g2" style="grid-template-columns:1fr auto"><input id="f2ean" inputmode="numeric" maxlength="14" placeholder="Por ejemplo 8410000000000"><button class="pr" data-a="f2ln">Buscar</button></div>'
    + '<p class="mu" style="font-size:12px;margin:10px 2px">Solo se envía el número del código a Open Food Facts. La imagen de la cámara no sale del móvil.</p><button data-a="f2bk" style="width:100%">Volver</button>');
  startScan();
};
A.f2bk = () => {
  stopScan();
  sheet(addSheet());
  foodList('');
};
A.f2ln = () => {
  const v = String((document.getElementById('f2ean') || {}).value || '').replace(/\D/g, '');
  if (v.length < 8 || v.length > 14) {
    scanMsg('El código debe tener entre 8 y 14 cifras');
    return;
  }
  stopScan();
  lookupBarcode(v);
};
async function startScan() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    scanMsg('Este navegador no permite usar la cámara. Escribe el código.');
    return;
  }
  try {
    const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    const v = document.getElementById('f2v');
    if (!v) {
      st.getTracks().forEach(t => t.stop());
      return;
    }
    v.srcObject = st;
    try {
      await v.play();
    }
    catch (e) {
      /* el vídeo arranca solo en cuanto el navegador lo permite */
    }
    let bd = null;
    try {
      if ('BarcodeDetector' in window)
        bd = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    }
    catch (e) {
      bd = null;
    }
    scanState = { st, v, run: 1, last: '', n: 0, bd };
    scanMsg('Apunta al código de barras del envase.');
    scanLoop();
  }
  catch (e) {
    scanMsg(e && e.name == 'NotAllowedError' ? 'Permiso de cámara denegado. Puedes escribir el código.' : 'No se pudo abrir la cámara. Puedes escribir el código.');
  }
}
async function scanLoop() {
  const me = scanState;
  if (!me)
    return;
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d', { willReadFrequently: true });
  while (scanState === me && me.run) {
    if (!document.getElementById('f2v')) {
      stopScan();
      return;
    }
    const v = me.v;
    if (document.visibilityState == 'visible' && v.readyState >= 2 && v.videoWidth) {
      let code = null;
      try {
        if (me.bd) {
          const r = await me.bd.detect(v);
          if (r && r.length)
            code = r[0].rawValue;
        }
      }
      catch (e) {
        me.bd = null;
      }
      if (!code) {
        const w = Math.min(720, v.videoWidth);
        const h = Math.round(v.videoHeight * w / v.videoWidth);
        cv.width = w;
        cv.height = h;
        g.drawImage(v, 0, 0, w, h);
        code = eanFromFrame(g.getImageData(0, 0, w, h));
      }
      if (code && /^\d{8,14}$/.test(code)) {
        if (code === me.last)
          me.n++;
        else {
          me.last = code;
          me.n = 1;
        }
        if (me.n >= 2 || me.bd) {
          stopScan();
          lookupBarcode(code);
          return;
        }
      }
    }
    await new Promise(r => setTimeout(r, 170));
  }
}
async function lookupBarcode(code) {
  scanMsg('Buscando ' + code + '…');
  try {
    const c = S.bc && S.bc[code];
    let it = c && Array.isArray(c.b) && c.b.length == 6 ? { n: String(c.n || '').slice(0, 80), b: c.b.map(Number) } : null;
    if (!it) {
      const F_ = 'code,product_name,product_name_es,brands,nutriments';
      let j = null;
      try {
        j = await fetchTimeout('https://world.openfoodfacts.org/api/v3/product/' + code + '.json?fields=' + F_, 9000);
      }
      catch (e) {
        if (e === 'busy')
          throw e;
        j = null;
      }
      if (!j || (!j.product && !j._nf))
        j = await fetchTimeout('https://world.openfoodfacts.org/api/v2/product/' + code + '.json?fields=' + F_, 9000);
      const p = j && j.product;
      it = p ? offProduct(p) : null;
      if (!it) {
        scanMsg(p ? 'Este producto no tiene información nutricional completa. Créalo a mano en «Nuevo».' : 'Ese código no está en Open Food Facts. Créalo a mano en «Nuevo».');
        return;
      }
      S.bc = S.bc && typeof S.bc == 'object' ? S.bc : {};
      S.bc[code] = { n: it.n, b: it.b, t: Date.now() };
      const ks = Object.keys(S.bc);
      if (ks.length > 200) {
        ks.sort((a, b) => (S.bc[a].t || 0) - (S.bc[b].t || 0)).slice(0, ks.length - 200).forEach(k => delete S.bc[k]);
      }
      saveState();
    }
    addState.pick = { n: it.n, b: it.b.slice() };
    sheet(addSheet());
    U.gr(100);
  }
  catch (x) {
    scanMsg(x === 'busy' ? 'Open Food Facts está saturado. Prueba en un minuto.' : 'No se pudo consultar. Comprueba tu conexión; los productos ya escaneados funcionan sin conexión.');
  }
}
/* — manejadores de esta función (registros A / C / U) — */

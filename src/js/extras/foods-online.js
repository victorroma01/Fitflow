/* ═══ extras/foods-online ═══
   Alimentos en línea (Open Food Facts) y escáner de códigos.
   Define: onlineFoods, onlineQuery, onlineBusy, OFF_ERRORS, offErrorText, isOffline, pause, offFetch, offName, offProduct, OFF_FIELDS, SEARCH_SIZE, SEARCH_KEEP_MS, searchCache, luceneSafe, searchNewUrl, searchOldUrl, searchResult, searchOnline, searchNote, EAN_L, EAN_G, EAN_R, EAN_PARITY, EAN_LEFT, EAN_RIGHT, eanDigit, eanFromRuns, eanFromRow, eanFromFrame, scanState, scanTry, scanMsg, stopScan, startScan, scanLoop, offBarcode, lookupBarcode  · acciones/registros: 5
*/
import { $ } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A, U } from '../core/registry.js';
import { addState, S, saveState } from '../core/state.js';
import { onSheetClose, sheet } from '../core/ui.js';
import { addSheet, nutriScore, nutriScoreBadge } from '../nutrition/add.js';
import { html, raw } from '../core/html.js';
var onlineFoods = [];
/* el texto de la última búsqueda lanzada (solo se pinta su respuesta) y el de la que está en marcha ('' si no hay) */
let onlineQuery = '';
let onlineBusy = '';
/* ── Open Food Facts ──
   Qué puede fallar al pedirle algo, para decírselo al usuario con claridad (I-22):
   'offline', el móvil no tiene conexión; 'busy', el servicio está saturado (429 o 503); 'slow', no contesta a tiempo;
   'net', la petición no llega o la respuesta no vale. */
const OFF_ERRORS = {
  offline: 'No hay conexión a internet. Los alimentos de la lista y los ya escaneados siguen funcionando.',
  busy: 'Open Food Facts está saturado ahora mismo. Prueba de nuevo en un minuto.',
  slow: 'Open Food Facts tarda demasiado en responder. Prueba de nuevo en un momento.',
  net: 'No se ha podido consultar Open Food Facts. Comprueba la conexión e inténtalo de nuevo.',
};
const offErrorText = e => OFF_ERRORS[e] || OFF_ERRORS.net;
const isOffline = () => typeof navigator != 'undefined' && navigator.onLine === false;
const pause = ms => new Promise(ok => setTimeout(ok, ms));
/* Pide a Open Food Facts la dirección url y devuelve su JSON ({ _nf: 1 } si no existe: 404). Si falla, lanza uno de OFF_ERRORS. */
async function offFetch(url, ms) {
  if (isOffline())
    throw 'offline';
  const ac = typeof AbortController != 'undefined' ? new AbortController() : null;
  const t = ac ? setTimeout(() => ac.abort(), ms) : 0;
  try {
    const r = await fetch(url, { signal: ac ? ac.signal : undefined, headers: { Accept: 'application/json' } });
    if (r.status == 429 || r.status == 503)
      throw 'busy';
    if (r.status == 404)
      return { _nf: 1 };
    if (!r.ok)
      throw 'net';
    return await r.json();
  }
  catch (e) {
    if (typeof e == 'string')
      throw e;
    throw e && e.name == 'AbortError' ? 'slow' : isOffline() ? 'offline' : 'net';
  }
  finally {
    if (t)
      clearTimeout(t);
  }
}
/* el nombre de un producto: un texto o, en el buscador nuevo, a veces un objeto por idiomas ({ main, es, en… }) */
const offName = v => typeof v == 'string' ? v : v && typeof v == 'object' ? String(v.es || v.main || v.en || Object.values(v).find(x => typeof x == 'string') || '') : '';
function offProduct(p) {
  try {
    if (!p || typeof p != 'object')
      return null;
    const nm = (offName(p.product_name_es) || offName(p.product_name)).trim();
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
    /* Nutri-Score (F-43): la letra, si Open Food Facts la tiene */
    const ns = nutriScore(String(p.nutriscore_grade || '').toLowerCase());
    return { n: nm.slice(0, 60) + (br ? ' (' + br.slice(0, 24) + ')' : ''), b: [Math.round(kc), r1(c), r1(pr), r1(f), r1(Math.max(0, fi)), Math.round(Math.max(0, sa) * 100) / 100], ean: String(p.code || p._id || '').replace(/\D/g, '').slice(0, 14), ns };
  }
  catch (e) {
    return null;
  }
}
/* ── buscar por nombre ──
   Dos buscadores de Open Food Facts, por este orden:
   1. el nuevo (search.openfoodfacts.org), el que Open Food Facts recomienda para buscar por texto. Entiende la sintaxis de
      Lucene, así que al texto del usuario se le quitan los signos que allí son órdenes (dos puntos, comillas, paréntesis…);
   2. el antiguo (cgi/search.pl), más lento y limitado a 10 búsquedas por minuto: solo si el nuevo falla o no trae nada.
   Si fallan los dos, se espera un momento y se prueba el nuevo otra vez. Lo ya buscado se recuerda un rato (SEARCH_KEEP_MS). */
const OFF_FIELDS = 'code,product_name,product_name_es,brands,nutriments,nutriscore_grade';
const SEARCH_SIZE = 24;
const SEARCH_KEEP_MS = 6e5;
/* texto → { t: cuándo, r: resultado } */
const searchCache = new Map();
const luceneSafe = q => q.toLowerCase().replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, ' ').replace(/\s+/g, ' ').trim();
const searchNewUrl = q => 'https://search.openfoodfacts.org/search?q=' + encodeURIComponent(luceneSafe(q)) + '&langs=es,en&page_size=' + SEARCH_SIZE + '&fields=' + OFF_FIELDS;
const searchOldUrl = q => 'https://world.openfoodfacts.org/cgi/search.pl?search_terms=' + encodeURIComponent(q) + '&search_simple=1&action=process&json=1&page_size=' + SEARCH_SIZE + '&sort_by=unique_scans_n&fields=' + OFF_FIELDS;
/* de la respuesta de un buscador: { list: alimentos que valen, sin repetir; dropped: productos sin nombre o sin calorías } */
const searchResult = j => {
  const arr = j && Array.isArray(j.hits) ? j.hits : j && Array.isArray(j.products) ? j.products : [];
  const foods = arr.map(offProduct).filter(Boolean);
  const seen = new Set();
  const list = foods.filter(x => {
    if (seen.has(x.n))
      return false;
    seen.add(x.n);
    return true;
  });
  return { list, dropped: arr.length - foods.length };
};
/** Busca q en Open Food Facts. Devuelve { list, dropped } o lanza uno de OFF_ERRORS. onRetry avisa de que va a reintentarlo. */
async function searchOnline(q, onRetry) {
  const key = q.toLowerCase();
  const kept = searchCache.get(key);
  if (kept && Date.now() - kept.t < SEARCH_KEEP_MS)
    return kept.r;
  let found = null;
  let error = '';
  const tryOne = async (url, ms) => {
    try {
      const r = searchResult(await offFetch(url, ms));
      if (!found || r.list.length)
        found = r;
    }
    catch (e) {
      error = e;
    }
  };
  await tryOne(searchNewUrl(q), 7000);
  if ((!found || !found.list.length) && error != 'offline')
    await tryOne(searchOldUrl(q), 8000);
  if (!found && error != 'offline') {
    if (onRetry)
      onRetry();
    await pause(1500);
    await tryOne(searchNewUrl(q), 7000);
  }
  if (!found)
    throw error || 'net';
  if (searchCache.size >= 30)
    searchCache.delete(searchCache.keys().next().value);
  searchCache.set(key, { t: Date.now(), r: found });
  return found;
}
const searchNote = t => html`<p class="mu m-10-2">${t}</p>`;
A.searchFoodOnline = async () => {
  const inp = $('#f2q') || document.querySelector('input[data-u="foodSearch"]');
  const q = ((inp && inp.value) || '').trim();
  const e = $('#rs');
  if (!e)
    return;
  if (q.length < 2) {
    toast('Escribe al menos 2 letras');
    return;
  }
  /* un toque doble no lanza dos veces la misma búsqueda */
  if (onlineBusy == q)
    return;
  onlineBusy = q;
  onlineQuery = q;
  e.innerHTML = searchNote('Buscando en Open Food Facts…');
  /* la respuesta solo se pinta si sigue siendo la de la última búsqueda y la hoja sigue abierta */
  const show = h => {
    const e2 = $('#rs');
    if (e2 && onlineQuery == q)
      e2.innerHTML = h;
  };
  try {
    const r = await searchOnline(q, () => show(searchNote('Open Food Facts tarda en responder. Probando otra vez…')));
    if (onlineQuery == q)
      onlineFoods = r.list;
    show(r.list.length ? html`<small class="mu d-block m-6-2">Valores por 100 g · datos de Open Food Facts (ODbL)</small>${r.list.map((f, i) => html`<div class="it cols-1fr-auto" data-a="onlineFoodPick" data-i="${i}" role="button" tabindex="0"><span>${f.n}${raw(nutriScoreBadge(f.ns))}</span><small>${raw(f.b[0])} kcal</small></div>`)}` : searchNote(r.dropped ? 'Hay ' + r.dropped + (r.dropped == 1 ? ' producto' : ' productos') + ' para «' + q + '», pero sin datos nutricionales. Prueba con otra palabra o crea el alimento en «Nuevo».' : 'No hay resultados para «' + q + '». Prueba con otra palabra o crea el alimento en «Nuevo».'));
  }
  catch (x) {
    show(html`${raw(searchNote(offErrorText(x)))}<button data-a="searchFoodOnline" class="w-full">Reintentar</button>`);
  }
  finally {
    if (onlineBusy == q)
      onlineBusy = '';
  }
};
A.onlineFoodPick = i => {
  const f = onlineFoods[i];
  if (!f)
    return;
  /* off: viene de Open Food Facts; al añadirlo a una comida se guarda en «Mis alimentos» (nutrition/add, F-44) */
  addState.pick = { n: f.n, b: f.b.slice(), ns: f.ns, ean: f.ean, off: 1 };
  sheet(addSheet());
  U.foodGrams(100);
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
/* cada apertura de la cámara lleva su número; buscar un código escrito a mano o cerrar la hoja (stopScan) la deja atrás, así que
   una cámara que contesta tarde se apaga sin tocar el mensaje de la búsqueda */
let scanTry = 0;
const scanMsg = t => {
  const e = document.getElementById('f2sm');
  if (e)
    e.textContent = t;
};
function stopScan() {
  scanTry++;
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
/* al cerrar la hoja (A.closeSheet, core/ui) se apaga la cámara si estaba encendida */
onSheetClose.push(stopScan);
A.openScanner = () => {
  addState.pick = null;
  sheet(html`<h3>Escanear código de barras</h3><div class="f2sv"><video id="f2v" playsinline muted autoplay></video><div class="f2gd"></div></div><p id="f2sm" class="mu m-8-2 fs-13">Abriendo la cámara…</p><label>O escribe el código (8 a 14 cifras)</label><div class="g2 cols-1fr-auto"><input id="f2ean" aria-label="Código de barras" data-enter="scannerLookupTyped" inputmode="numeric" maxlength="14" placeholder="Por ejemplo 8410000000000"><button class="pr" data-a="scannerLookupTyped">Buscar</button></div><p class="mu fs-12 m-10-2">Solo se envía el número del código a Open Food Facts. La imagen de la cámara no sale del móvil.</p><button data-a="scannerClose" class="w-full">Cerrar</button>`);
  startScan();
};
/* el escáner se abre desde el botón «Scan» de una comida: cerrarlo vuelve a Nutrición */
A.scannerClose = () => {
  stopScan();
  sheet();
};
A.scannerLookupTyped = () => {
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
  const mine = ++scanTry;
  /* ¿sigue siendo esta la apertura que vale? Si no, apaga la cámara que acaba de llegar */
  const still = st => {
    if (mine === scanTry && document.getElementById('f2v'))
      return true;
    st.getTracks().forEach(t => t.stop());
    return false;
  };
  try {
    const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    if (!still(st))
      return;
    const v = document.getElementById('f2v');
    v.srcObject = st;
    try {
      await v.play();
    }
    catch (e) {
      /* el vídeo arranca solo en cuanto el navegador lo permite */
    }
    if (!still(st))
      return;
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
    if (mine === scanTry)
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
/* El producto del código de barras code en Open Food Facts: su JSON, o null si no lo tiene. Prueba la API v3 y, si falla o no
   trae el producto, la v2; si fallan las dos, espera un momento y lo intenta una vez más. Lanza uno de OFF_ERRORS. */
async function offBarcode(code) {
  const urls = ['v3', 'v2'].map(v => 'https://world.openfoodfacts.org/api/' + v + '/product/' + code + '.json?fields=' + OFF_FIELDS);
  let error = '';
  for (let round = 0; round < 2; round++) {
    if (round)
      await pause(1500);
    let answered = false;
    for (const url of urls) {
      try {
        const j = await offFetch(url, 9000);
        if (j && j.product)
          return j.product;
        answered = true;
        if (j && j._nf)
          return null;
      }
      catch (e) {
        error = e;
        if (e == 'offline')
          throw e;
      }
    }
    /* alguna ha contestado, y sin producto: no está */
    if (answered)
      return null;
  }
  throw error;
}
async function lookupBarcode(code) {
  /* vale mientras siga abierta la hoja del escáner y no empiece otra búsqueda (stopScan y startScan cambian scanTry): una
     respuesta que llega después no abre nada ni cambia el mensaje */
  const mine = scanTry;
  const current = () => mine === scanTry && !!document.getElementById('f2sm');
  scanMsg('Buscando ' + code + '…');
  try {
    const c = S.barcodeCache && S.barcodeCache[code];
    let it = c && Array.isArray(c.b) && c.b.length == 6 ? { n: String(c.n || '').slice(0, 80), b: c.b.map(Number), ns: nutriScore(c.ns) } : null;
    if (!it) {
      const p = await offBarcode(code);
      if (!current())
        return;
      it = p ? offProduct(p) : null;
      if (!it) {
        scanMsg(p ? 'Este producto no tiene información nutricional completa. Créalo a mano con «+», en «Nuevo».' : 'Ese código no está en Open Food Facts. Créalo a mano con «+», en «Nuevo».');
        return;
      }
      S.barcodeCache = S.barcodeCache && typeof S.barcodeCache == 'object' ? S.barcodeCache : {};
      S.barcodeCache[code] = { n: it.n, b: it.b, t: Date.now() };
      if (it.ns)
        S.barcodeCache[code].ns = it.ns;
      const ks = Object.keys(S.barcodeCache);
      if (ks.length > 200) {
        ks.sort((a, b) => (S.barcodeCache[a].t || 0) - (S.barcodeCache[b].t || 0)).slice(0, ks.length - 200).forEach(k => delete S.barcodeCache[k]);
      }
      saveState();
    }
    addState.pick = { n: it.n, b: it.b.slice(), ns: it.ns, ean: code, off: 1 };
    sheet(addSheet());
    U.foodGrams(100);
  }
  catch (x) {
    if (current())
      scanMsg(offErrorText(x) + (x == 'offline' ? '' : ' Los productos ya escaneados funcionan sin conexión.'));
  }
}
/* — manejadores de esta función (registros A / C / U) — */

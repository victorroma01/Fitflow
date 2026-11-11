/* ═══ profile/appearance ═══
   Apariencia (F-31): tema, color de acento (los de serie o uno elegido a mano, con sus tonos y el color del texto calculados para
   que se lea bien), estilo Cristal y reducir animaciones. lookSync deja en <html> las clases del estilo en cada R().
   Define: ACCENTS, DEFAULT_ACCENT, HEX, hexRgb, rgbHex, rgbHsl, hslRgb, luminance, customAccentLast, customAccent, accentNow, setAccentVars, accentApplied, applyAccent, accentPreview, accentSwatches, themeSegment, glassMode, GLASS_LEVELS, GLASS_INFO, glassCard, motionCard, lookSync, ACCENT_SETTLE_MS, accentPick, accentFrame, accentTimer, previewAccent, commitAccent, pickAccent  · acciones/registros: 8
*/
import { $ } from '../core/util.js';
import { logError } from '../core/errors.js';
import { A, C, U } from '../core/registry.js';
import { applyTheme, S, saveState } from '../core/state.js';
import { R } from '../core/render.js';
import { html, raw } from '../core/html.js';
/** Colores de serie: [nombre, claro (a1), principal (a2), oscuro (a3), texto sobre el principal (ft)]. El orden no cambia
  (S.acc es la posición); los nuevos van al final. */
export const ACCENTS = [['Morado', '#b183ff', '#7a45ee', '#4b2a90', '#fff'], ['Azul eléctrico', '#4da3ff', '#1565ff', '#0b3a9c', '#fff'], ['Azul oscuro', '#5a7be0', '#2443b0', '#0f1f66', '#fff'], ['Verde oscuro', '#3fbf7f', '#14804a', '#0c4a2b', '#fff'], ['Amarillo', '#ffd84d', '#e8b400', '#6e5300', '#1a1400'], ['Rojo', '#ff7a7a', '#d62839', '#6a1020', '#fff'], ['Naranja', '#ffa04d', '#e8590c', '#702a05', '#fff'], ['Rosa', '#ff8fc8', '#d6337f', '#6b1440', '#fff'], ['Turquesa', '#4fd6cf', '#0d8a85', '#064a47', '#fff'], ['Lima', '#c8ee62', '#8cc61b', '#3f5c06', '#142000'], ['Grafito', '#b9bdc9', '#5b6170', '#2a2e37', '#fff']];
/** El color con el que empieza la app, mientras no se elija otro: Azul eléctrico, el del logo (F-40; hasta la V1.0.0, Morado). */
const DEFAULT_ACCENT = 1;
/** Un color #rrggbb (el de «Personalizado», S.acx). */
export const HEX = /^#[0-9a-f]{6}$/i;
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgbHex = c => '#' + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
/** [tono 0-360, saturación 0-1, luminosidad 0-1] */
const rgbHsl = c => {
  const [r, g, b] = c.map(v => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (!d)
    return [0, 0, l];
  const h = mx == r ? ((g - b) / d + 6) % 6 : mx == g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, d / (1 - Math.abs(2 * l - 1)), l];
};
const hslRgb = (h, s, l) => {
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map(n => {
    const k = (n + h / 30) % 12;
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  });
};
/* luminancia relativa (WCAG) */
const luminance = c => c.reduce((s, v, i) => {
  const x = v / 255;
  return s + [.2126, .7152, .0722][i] * (x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
}, 0);
/* el último color propio calculado: [#rrggbb, sus tonos]. Se pide en cada pintado (Ajustes, análisis…) y casi siempre es el mismo */
let customAccentLast = ['', null];
/** Los tonos de un color elegido a mano, como los de serie. El principal es ese color, aclarado u oscurecido solo si hace falta
  para que se vea sobre el fondo oscuro y sobre el claro; el texto encima, blanco si se lee bien y, si no, casi negro. */
export const customAccent = hex => {
  if (customAccentLast[0] == hex)
    return customAccentLast[1];
  const [h, s, l] = rgbHsl(hexRgb(hex));
  const m = Math.min(.62, Math.max(.3, l));
  const a2 = hslRgb(h, s, m);
  const ft = 1.05 / (luminance(a2) + .05) >= 3.2 ? '#fff' : rgbHex(hslRgb(h, s * .5, .07));
  const tones = ['Personalizado', rgbHex(hslRgb(h, s, Math.min(.84, m + .18))), rgbHex(a2), rgbHex(hslRgb(h, s * .8, Math.max(.1, m - .24))), ft];
  customAccentLast = [hex, tones];
  return tones;
};
/** El color de acento en uso: [nombre, a1, a2, a3, ft]. S.acc es la posición en ACCENTS, o -1 con un color propio en S.acx. */
export const accentNow = () => S.acc == -1 && HEX.test(S.acx || '') ? customAccent(S.acx) : ACCENTS[S.acc >= 0 && S.acc < ACCENTS.length ? S.acc : DEFAULT_ACCENT];
/* las variables de color de los tonos a ([nombre, a1, a2, a3, ft]) en el elemento el: en <html>, el color de toda la app */
const setAccentVars = (el, a) => {
  el.style.setProperty('--a1', a[1]);
  el.style.setProperty('--a2', a[2]);
  el.style.setProperty('--a3', a[3]);
  el.style.setProperty('--ft', a[4]);
  el.style.setProperty('--ac', a[2]);
};
/* los tonos que tiene puestos la app: cambiarlos obliga a pintarla entera, así que solo se tocan si son otros */
let accentApplied = '';
export function applyAccent() {
  const a = accentNow();
  if (accentApplied == a.join())
    return;
  accentApplied = a.join();
  setAccentVars(document.documentElement, a);
}
/* lo principal que cambia con el color: cabecera de un día, botón, chip, barra de progreso y la burbuja de las pestañas */
const accentPreview = () => html`<div class="acp" aria-hidden="true"><div class="acph"><small>Vista previa</small><b>Pecho</b><span class="acpr"><i></i></span><span class="acpk"><span class="acpb">Empezar</span><span class="chip on">Hoy</span><span class="chip">Mañana</span></span></div><div class="acpn"><span class="on">Workout</span><span>Nutrición</span><span>Dashboard</span><span>Perfil</span></div></div>`;
export const accentSwatches = () => {
  const own = HEX.test(S.acx || '');
  const cur = S.acc == -1 && own ? -1 : S.acc >= 0 && S.acc < ACCENTS.length ? S.acc : DEFAULT_ACCENT;
  const sw = a => 'background:linear-gradient(135deg,' + a[1] + ',' + a[2] + ');color:' + a[4];
  /* sin color propio todavía, el círculo de «Personalizado» lleva todos los colores */
  const cs = own ? sw(customAccent(S.acx)) : '';
  return html`${accentPreview()}<div class="swg">${ACCENTS.map((a, i) => html`<button class="swb${cur == i ? ' on' : ''}" data-a="zac" data-i="${i}" aria-pressed="${cur == i ? 'true' : 'false'}"><i style="${sw(a)}">${cur == i ? '✓' : ''}</i><small>${raw(a[0])}</small></button>`)}<label class="swb swc${cur == -1 ? ' on' : ''}"><i class="${own ? '' : 'swr'}" style="${cs}">${cur == -1 ? '✓' : ''}<input type="color" value="${own ? S.acx.toLowerCase() : ACCENTS[cur][2]}" data-c="acx" data-u="acxl" aria-label="Elegir un color propio"></i><small>Personalizado</small></label></div><small class="mu acn">Con «Personalizado» eliges cualquier color: la app ajusta sus tonos para que todo se lea bien, con el tema oscuro y con el claro.</small>`;
};
export const themeSegment = () => html`<div class="seg">${[['', 'Auto'], ['dark', 'Oscuro'], ['light', 'Claro']].map(x => html`<button class="${(S.theme || '') == x[0] ? 'on' : ''}" data-a="zth" data-v="${x[0]}">${raw(x[1])}</button>`)}</div>`;
export const glassMode = () => {
  const m = S.gm;
  return (m === 0 || m === 1 || m === 2 || m === 3) ? m : (S.gl === 0 ? 0 : 2);
};
const GLASS_LEVELS = [['3', 'Máximo'], ['2', 'Medio'], ['1', 'Mínimo']];
const GLASS_INFO = { 3: 'Más transparencia, desenfoque y brillo. Es el más vistoso y el que más batería usa.', 2: 'Equilibrado: se nota el cristal sin perder legibilidad.', 1: 'Cristal discreto: casi opaco, con brillos suaves. Muy ligero.' };
export const glassCard = () => {
  const m = glassMode();
  const g = m > 0;
  return html`<label>Estilo</label><div class="gst"><button class="gso${g ? ' on' : ''}" data-a="glk" data-v="1" aria-pressed="${g}"><i class="gpv gc"></i><b>Cristal</b><small>Translúcido y con brillos</small></button><button class="gso${g ? '' : ' on'}" data-a="glk" data-v="0" aria-pressed="${!g}"><i class="gpv fl"></i><b>Clásico</b><small>Sólido, sin transparencias</small></button></div>${raw(g ? html`<label>Intensidad del Cristal</label><div class="seg">${GLASS_LEVELS.map(x => html`<button class="${m == x[0] ? 'on' : ''}" data-a="gl" data-v="${x[0]}">${raw(x[1])}</button>`)}</div><small class="mu" style="display:block;margin-top:4px">${raw(GLASS_INFO[m])}${m > 1 ? ' Si notas lentitud, elige Mínimo o Clásico.' : ''}</small>` : '<small class="mu" style="display:block;margin-top:4px">Modo Clásico: el aspecto de siempre y el más ligero. Pulsa Cristal para elegir su intensidad.</small>')}`;
};
/** «Reducir animaciones» (S.rm): sin deslizamientos ni fundidos al abrir páginas y ventanas. */
export const motionCard = () => html`<label>Animaciones</label><label class="srk"><input type="checkbox" data-c="rm"${S.rm ? ' checked' : ''}> Reducir animaciones</label><small class="mu" style="display:block;margin-top:-4px">Las páginas y ventanas aparecen sin deslizarse. Si en el móvil tienes activado «Reducir movimiento», la app ya lo hace siempre.</small>`;
/** Tras cada R(): las clases de <html> del estilo Cristal (gl, data-gm) y de reducir animaciones (rm), como diga S. */
export const lookSync = () => {
  try {
    const m = glassMode();
    const d = document.documentElement;
    if (d.classList.contains('gl') !== (m > 0))
      d.classList.toggle('gl', m > 0);
    if (m > 0) {
      if (d.dataset.gm != m)
        d.dataset.gm = m;
    }
    else if (d.hasAttribute('data-gm'))
      d.removeAttribute('data-gm');
    if (d.classList.contains('rm') !== !!S.rm)
      d.classList.toggle('rm', !!S.rm);
  }
  catch (e) {
    logError('estilo cristal', e);
  }
};
/* Color propio (I-18). El selector de color del sistema avisa con cada tono por el que pasa el dedo y, en Safari, cada uno de
   esos avisos llega además como «cambio hecho» (change), no solo al cerrarlo. Mientras el dedo se mueve solo se pinta la vista
   previa, como mucho una vez por fotograma; el color se aplica a toda la app, se guarda y se sincroniza una sola vez, cuando el
   selector lleva ACCENT_SETTLE_MS quieto. Antes, cada tono repintaba la app entera, la guardaba y la sincronizaba. */
const ACCENT_SETTLE_MS = 350;
/* el color que se está eligiendo ('' si ninguno), el fotograma pedido para la vista previa y la espera para aplicarlo */
let accentPick = '';
let accentFrame = 0;
let accentTimer = 0;
const previewAccent = () => {
  accentFrame = 0;
  const box = $('.acp');
  if (!box || !accentPick)
    return;
  const a = customAccent(accentPick);
  setAccentVars(box, a);
  const dot = $('.swc i');
  if (dot) {
    dot.style.background = 'linear-gradient(135deg,' + a[1] + ',' + a[2] + ')';
    dot.style.color = a[4];
  }
};
const commitAccent = () => {
  accentTimer = 0;
  if (!accentPick)
    return;
  S.acc = -1;
  S.acx = accentPick;
  accentPick = '';
  applyAccent();
  saveState();
  R();
};
const pickAccent = v => {
  if (!HEX.test(v))
    return;
  accentPick = v.toLowerCase();
  if (!accentFrame)
    accentFrame = requestAnimationFrame(previewAccent);
  clearTimeout(accentTimer);
  accentTimer = setTimeout(commitAccent, ACCENT_SETTLE_MS);
};
/* — manejadores de esta función (registros A / C / U) — */
A.zac = i => {
  /* un color de serie deja sin efecto el propio que aún no se había aplicado */
  accentPick = '';
  clearTimeout(accentTimer);
  S.acc = i;
  applyAccent();
  saveState();
  R();
};
U.acxl = pickAccent;
C.acx = e => pickAccent(e.value);
A.zth = (i, b) => {
  S.theme = b.dataset.v;
  applyTheme();
  saveState();
  R();
};
A.glk = (i, b) => {
  const v = +b.dataset.v;
  const m = glassMode();
  if (v) {
    S.gm = (S.gk >= 1 && S.gk <= 3) ? S.gk : 2;
  }
  else {
    if (m > 0)
      S.gk = m;
    S.gm = 0;
  }
  S.gl = S.gm ? 1 : 0;
  saveState();
  R();
};
A.gl = (i, b) => {
  const v = +b.dataset.v;
  S.gm = (v >= 1 && v <= 3) ? v : 2;
  S.gk = S.gm;
  S.gl = 1;
  saveState();
  R();
};
C.rm = e => {
  S.rm = e.checked ? 1 : 0;
  saveState();
  R();
};
C.tm = e => {
  S.theme = e.value;
  applyTheme();
  saveState();
};

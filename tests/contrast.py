"""Contraste de los textos (WCAG 2.1, nivel AA): cada texto que se ve en cada pantalla, contra lo que tiene detrás de verdad.

Por cada pantalla de tests/shots.py se hacen dos capturas, una normal y otra con las letras transparentes: la segunda es el
fondo real de cada texto (color, degradado, foto, Cristal…) y la diferencia entre las dos dice si el texto se llega a pintar
ahí. El color de la letra es el calculado por el navegador (con su opacidad). Un texto normal necesita 4,5:1 y uno grande
(24 px, o 18,66 px en negrita) o un signo suelto que hace de icono (✓, ›, ✕…), 3:1. No cuentan los controles desactivados, lo que es solo decorativo (aria-hidden) ni los
logotipos. Se recorre desplazando cada pantalla hasta el final; antes de medir se espera a que la pantalla se quede quieta, y
lo que no llega se mide dos veces.

Configuraciones: los dos temas con el estilo de serie en todas las pantallas; sin Cristal y con el Cristal suave y el intenso,
y cada color de acento (y uno propio) en los dos temas, en las pantallas donde más se usan.

  python3 tests/contrast.py dist/stratafit.html            (todo; falla si algún texto no llega)
  python3 tests/contrast.py dist/stratafit.html --list     (además, cada pareja de colores que no llega, con dónde sale)
  python3 tests/contrast.py dist/stratafit.html --only=claro --only="acento 4"     (solo las configuraciones con ese nombre)
  python3 tests/contrast.py dist/stratafit.html --near     (además, lo que pasa por poco: conviene que no haya nada)
"""
import io, os, re, sys
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from shots import SCR, SEED, EXTRA, INIT  # noqa: E402
from browser import app_url, context_opts  # noqa: E402

# las pantallas donde más se ven el acento y el Cristal (para las configuraciones que no recorren todas)
MAIN = ['workout', 'nutri', 'dash', 'perfil_open', 'go', 'go_rest', 'menu', 'dlg', 'prog', 'ajustes_tema', 'nutri_my', 'ach', 'analisis', 'cal']
ACCENTS = 11

SIGN = re.compile(r'^[✓✔✕✖×›‹«»+−–—?…·•→←↑↓⋯☰▾▸◂▴]{1,3}$')
# las letras, transparentes (sin tocar `color`: los iconos y bordes que usan currentColor se quedan como están)
HIDE = """*,*::before,*::after{-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important;caret-color:transparent!important}
::placeholder{-webkit-text-fill-color:transparent!important}svg text,svg tspan{fill:transparent!important;stroke:transparent!important}"""

# cada trozo de texto a la vista: dónde está, su color, su tamaño y de qué elemento es
TEXTS = r"""() => {
  const out = [], vw = innerWidth, vh = innerHeight;
  const rgba = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const opacity = el => { let o = 1; for (let e = el; e && e.nodeType == 1; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
  const name = el => { const c = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.'); const p = el.parentElement; const pc = p ? (p.getAttribute('class') || '').trim().split(/\s+/)[0] : ''; return (pc ? p.tagName.toLowerCase() + '.' + pc + ' > ' : '') + el.tagName.toLowerCase() + (c ? '.' + c : ''); };
  const skip = el => !!el.closest('[disabled],[aria-disabled="true"],[aria-hidden="true"],.brl,[inert]');
  const add = (el, text, rects, color, ph) => {
    const cs = getComputedStyle(el);
    if (cs.visibility == 'hidden' || cs.display == 'none' || skip(el)) return;
    const c = rgba(color);
    if (!c) return;
    const a = c[3] * opacity(el);
    if (a < .02) return;
    for (const r of rects) {
      /* entero dentro de la pantalla (al desplazarla, cada texto acaba estándolo) y sin nada encima en el centro ni en las
         esquinas: lo que queda debajo de la barra de pestañas, de un botón fijo o del velo de una hoja abierta no se lee ahí */
      if (r.width < 3 || r.height < 5 || r.top < 0 || r.bottom > vh || r.left < 0 || r.right > vw) continue;
      const mine = (x, y) => { const top = document.elementFromPoint(Math.min(vw - 1, x), Math.min(vh - 1, y)); return !!top && (top === el || el.contains(top) || top.contains(el)); };
      if (![[(r.left + r.right) / 2, (r.top + r.bottom) / 2], [r.left + 1, r.top + 1], [r.right - 1, r.top + 1], [r.left + 1, r.bottom - 1], [r.right - 1, r.bottom - 1]].every(q => mine(q[0], q[1]))) continue;
      out.push({ t: text.slice(0, 40), x: r.left, y: r.top, w: r.width, h: r.height, c: [c[0], c[1], c[2], a], size: parseFloat(cs.fontSize), bold: +cs.fontWeight >= 700, el: name(el) + (ph ? '::placeholder' : '') });
    }
  };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.nodeValue.trim(), el = n.parentElement;
    if (!t || !el || /^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA)$/.test(el.tagName)) continue;
    const r = document.createRange();
    r.selectNodeContents(n);
    const svg = el.namespaceURI == 'http://www.w3.org/2000/svg';
    add(el, t, [...r.getClientRects()], svg ? getComputedStyle(el).fill : getComputedStyle(el).color);
  }
  /* lo escrito en los campos y sus textos de ayuda (placeholder) */
  for (const el of document.querySelectorAll('input,textarea,select')) {
    if (/^(checkbox|radio|range|color|file|hidden)$/.test(el.type)) continue;
    const cs = getComputedStyle(el), b = el.getBoundingClientRect();
    const box = { left: b.left + parseFloat(cs.paddingLeft) + 2, right: b.right - parseFloat(cs.paddingRight) - 2, top: b.top + b.height / 2 - parseFloat(cs.fontSize) / 2, bottom: b.top + b.height / 2 + parseFloat(cs.fontSize) / 2 };
    box.width = box.right - box.left; box.height = box.bottom - box.top;
    const shown = el.tagName == 'SELECT' ? (el.selectedOptions[0] || {}).textContent || '' : el.value;
    if (shown) add(el, shown, [box], cs.color);
    else if (el.placeholder) add(el, el.placeholder, [box], getComputedStyle(el, '::placeholder').color, 1);
  }
  return out;
}"""

# la pantalla, quieta: tres vistazos seguidos (cada 60 ms) sin cambios en la página ni transiciones o animaciones en marcha. Con
# vistazos y no con el reloj: la fecha de la prueba está fija
QUIET = r"""() => new Promise(done => {
  let changed = 0, calm = 0, looks = 0;
  const mo = new MutationObserver(() => { changed = 1; });
  mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  const look = () => {
    const moving = document.getAnimations().some(a => a.playState == 'running' && a.effect && a.effect.getComputedTiming().iterations !== Infinity);
    calm = changed || moving ? 0 : calm + 1;
    changed = 0;
    if (calm >= 3 || ++looks > 50) { mo.disconnect(); done(looks); }
    else setTimeout(look, 60);
  };
  setTimeout(look, 60);
})"""

# lo que se desplaza en la pantalla abierta (la ventana de arriba del todo), para recorrerla entera
SCROLLER = r"""() => {
  const can = e => e && e.scrollHeight > e.clientHeight + 8 && /auto|scroll/.test(getComputedStyle(e).overflowY);
  const tops = ['#upd', '#dg', '#tour', '#mn', '#sh'].map(s => document.querySelector(s)).filter(e => e && e.firstElementChild);
  let el = null;
  for (const t of tops) { el = [t, ...t.querySelectorAll('*')].find(can); if (el) break; if (t.id != 'sh' || t.firstElementChild) { el = null; break; } }
  if (!el && !tops.length) el = document.scrollingElement;
  window.__scr = el;
  return el ? [el.scrollTop, el.scrollHeight, el.clientHeight || innerHeight] : null;
}"""


def lum(c):
    c = np.asarray(c, dtype=float) / 255
    c = np.where(c <= .03928, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    return .2126 * c[..., 0] + .7152 * c[..., 1] + .0722 * c[..., 2]


def ratio(fg, bg):
    """Contraste de cada píxel del fondo `bg` (n × 3) con la letra `fg` (r, g, b, opacidad), ya mezclada con ese fondo."""
    f = np.asarray(fg[:3], dtype=float) * fg[3] + bg * (1 - fg[3])
    a, b = lum(f), lum(bg)
    return (np.maximum(a, b) + .05) / (np.minimum(a, b) + .05)


def hexc(c):
    return '#%02x%02x%02x' % tuple(int(round(float(v))) for v in c[:3])


def quiet(pg):
    """Espera a que la pantalla se quede quieta: sin cambios en la página ni transiciones en marcha durante tres vistazos
    seguidos (o 3 s). Sin esto, lo que aparece justo después de un toque (el descanso tras marcar una serie) se medía a medias."""
    pg.evaluate(QUIET)


def once(pg):
    """Los textos de lo que se ve ahora: [contraste, mínimo exigido, texto, elemento, letra, fondo]."""
    texts = pg.evaluate(TEXTS)
    a = np.asarray(Image.open(io.BytesIO(pg.screenshot(animations='disabled'))).convert('RGB'), dtype=float)
    # (con el CSSOM: la política de seguridad de la app no deja añadir una etiqueta <style>)
    pg.evaluate("css => { const s = new CSSStyleSheet(); s.replaceSync(css); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; window.__hide = s; }", HIDE)
    b = np.asarray(Image.open(io.BytesIO(pg.screenshot(animations='disabled'))).convert('RGB'), dtype=float)
    pg.evaluate("document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== window.__hide)")
    out = []
    for t in texts:
        x0, y0, x1, y1 = int(t['x']) + 1, int(t['y']) + 1, int(t['x'] + t['w']) - 1, int(t['y'] + t['h']) - 1
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(a.shape[1], x1), min(a.shape[0], y1)
        if x1 - x0 < 2 or y1 - y0 < 3:
            continue
        bg = b[y0:y1, x0:x1].reshape(-1, 3)
        # ¿se llega a pintar ahí? (un texto tapado por otra cosa o recortado por su caja no cuenta)
        if np.abs(a[y0:y1, x0:x1].reshape(-1, 3) - bg).max(axis=1).max() < 12:
            continue
        r = ratio(t['c'], bg)
        # un signo suelto (✓, ›, ✕, +…) hace de icono: como cualquier gráfico, pide 3:1 (WCAG 1.4.11)
        need = 3.0 if t['size'] >= 24 or (t['size'] >= 18.66 and t['bold']) or SIGN.match(t['t']) else 4.5
        mid = np.median(bg, axis=0)
        out.append([float(np.percentile(r, 10)), need, t['t'], t['el'], hexc(np.asarray(t['c'][:3]) * t['c'][3] + mid * (1 - t['c'][3])), hexc(mid)])
    return out


def measure(pg):
    """Mide lo que se ve, con la pantalla quieta. Si algún texto no llega, se mide otra vez: solo cuenta lo que falla las dos
    (así una transición que aún no había terminado no da un fallo que no existe)."""
    quiet(pg)
    out = once(pg)
    if any(r[0] < r[1] - .005 for r in out):
        pg.wait_for_timeout(400)
        quiet(pg)
        again = {(r[2], r[3]): r for r in once(pg)}
        for r in out:
            o = again.get((r[2], r[3]))
            if r[0] < r[1] - .005 and o:
                r[0], r[4], r[5] = max(r[0], o[0]), o[4], o[5]
    return out


def walk(pg, steps=14):
    """Mide la pantalla abierta de arriba abajo, desplazándola."""
    out = measure(pg)
    info = pg.evaluate(SCROLLER)
    if not info:
        return out
    for _ in range(steps):
        top, full, view = pg.evaluate("(()=>{const e=window.__scr;return [e.scrollTop,e.scrollHeight,e.clientHeight||innerHeight]})()")
        if top + view >= full - 4:
            break
        # (de golpe, sin el desplazamiento suave: las posiciones de los textos tienen que ser las de la captura)
        pg.evaluate("(e=>e.scrollTo({top:e.scrollTop+Math.round((e.clientHeight||innerHeight)*.75),behavior:'instant'}))(window.__scr)")
        for _ in range(20):
            pg.wait_for_timeout(60)
            if pg.evaluate("(e=>{const same=e.scrollTop===window.__last;window.__last=e.scrollTop;return same})(window.__scr)"):
                break
        out += measure(pg)
    return out


def look_js(scheme, glass, accent):
    js = "S.glassLevel=%d;S.glassOn=%d;S.theme='%s';S.reduceMotion=1;" % (glass, 1 if glass else 0, scheme)
    if isinstance(accent, int):
        js += 'S.accent=%d;' % accent
    elif accent:
        js += "S.accent=-1;S.accentColor='%s';" % accent
    return js + 'saveState()'


def run_configs(args):
    """Mide unas cuantas configuraciones (en su propio navegador: se reparten entre varios procesos)."""
    path, configs = args
    url = app_url(path)
    bad, near, total, errs = {}, {}, 0, []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, scheme, glass, accent, screens in configs:
            c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, color_scheme=scheme, has_touch=True, is_mobile=True, **context_opts(path))
            c.add_init_script(INIT)
            pg = c.new_page()
            pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
            for k in screens:
                try:
                    pg.goto(url)
                    pg.evaluate('localStorage.clear()')
                    pg.reload()
                    pg.clock.set_fixed_time('2026-10-29T12:00:00')
                    pg.evaluate(SEED)
                    pg.evaluate(EXTRA)
                    pg.evaluate(look_js(scheme, glass, accent))
                    pg.reload()
                    pg.clock.set_fixed_time('2026-10-29T12:00:00')
                    js = SCR[k]
                    # (la pantalla del color propio pone el suyo; en las demás configuraciones se queda el de la configuración)
                    pg.evaluate(js if k != 'acento' or accent is None else js.replace("S.accent=-1;S.accentColor='#ff2d55';", ''))
                    pg.wait_for_timeout(700 if k in ('edit', 'overview', 'go_open') else 300)
                    found = walk(pg)
                except Exception as e:
                    errs.append('%s %s: %s' % (name, k, str(e)[:160]))
                    continue
                total += len(found)
                for r, need, text, el, fg, bg in found:
                    # (lo que no llega y, aparte, lo que pasa por menos de un 6 %: otra versión del navegador pinta algo distinto)
                    if r < need * 1.06:
                        d = (bad if r < need - .005 else near).setdefault((fg, bg, el), [r, need, text, []])
                        d[0] = min(d[0], r)
                        d[3].append('%s · %s' % (name, k))
            c.close()
        b.close()
    return bad, near, total, errs


def all_configs(only=None):
    configs = [('oscuro', 'dark', 2, None, list(SCR)), ('claro', 'light', 2, None, list(SCR)),
               ('oscuro sin Cristal', 'dark', 0, None, MAIN), ('claro sin Cristal', 'light', 0, None, MAIN),
               ('oscuro, Cristal suave', 'dark', 1, None, MAIN), ('claro, Cristal suave', 'light', 1, None, MAIN),
               ('oscuro, Cristal intenso', 'dark', 3, None, MAIN), ('claro, Cristal intenso', 'light', 3, None, MAIN)]
    for i in range(ACCENTS):
        configs += [('oscuro, acento %d' % i, 'dark', 2, i, MAIN[:8]), ('claro, acento %d' % i, 'light', 2, i, MAIN[:8])]
    configs += [('oscuro, color propio', 'dark', 2, '#ff2d55', MAIN[:8]), ('claro, color propio', 'light', 2, '#ff2d55', MAIN[:8])]
    return [c for c in configs if not only or any(o in c[0] for o in only)]


def main(path, listing, only, close):
    configs = all_configs(only)
    # las configuraciones largas (todas las pantallas), partidas en trozos, para repartir el trabajo entre los procesos
    jobs = []
    for name, scheme, glass, accent, screens in configs:
        for i in range(0, len(screens), 12):
            jobs.append((name, scheme, glass, accent, screens[i:i + 12]))
    n = max(1, min(4, os.cpu_count() or 1, len(jobs)))
    chunks = [jobs[i::n] for i in range(n)]
    bad, near, total, errs = {}, {}, 0, []
    with ProcessPoolExecutor(max_workers=n) as ex:
        for b, nr, t, e in ex.map(run_configs, [(path, c) for c in chunks]):
            total += t
            errs += e
            for into, part in ((bad, b), (near, nr)):
                for key, d in part.items():
                    o = into.setdefault(key, [d[0], d[1], d[2], []])
                    o[0] = min(o[0], d[0])
                    o[3] += d[3]
    print('%d textos medidos en %d configuraciones' % (total, len(configs)))
    if close:
        print('Pasan por poco (menos de un 6 %% de margen): %d parejas' % len(near))
        for (fg, bg, el), d in sorted(near.items(), key=lambda x: x[1][0] / x[1][1]):
            w = sorted(set(d[3]))
            print('  %.2f (pide %.1f)  %s sobre %s  %s  «%s»  %s%s' % (d[0], d[1], fg, bg, el, d[2], '; '.join(w[:3]), ' (+%d)' % (len(w) - 3) if len(w) > 3 else ''))
    rows = sorted(bad.items(), key=lambda x: x[1][0])
    for (fg, bg, el), d in (rows if listing else rows[:25]):
        w = sorted(set(d[3]))
        print('  %.2f (pide %.1f)  %s sobre %s  %s  «%s»  %s%s' % (d[0], d[1], fg, bg, el, d[2], '; '.join(w[:3]), ' (+%d)' % (len(w) - 3) if len(w) > 3 else ''))
    if rows and not listing and len(rows) > 25:
        print('  … y %d más (--list las enseña todas)' % (len(rows) - 25))
    if errs:
        print('ERRORES:', errs[:5])
    if rows or errs:
        print('\nFALLA el contraste: %d parejas de colores no llegan' % len(rows))
        sys.exit(1)
    print('TODO CORRECTO')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    main(args[0] if args else os.path.join(HERE, '..', 'dist', 'stratafit.html'), '--list' in sys.argv, [a[7:] for a in sys.argv if a.startswith('--only=')], '--near' in sys.argv)

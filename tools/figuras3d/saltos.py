# Saltos en la animación: cuánto cambia cada fotograma respecto al anterior (rasterizado en el navegador).
# Un salto (algo que cambia de orden de golpe) sale como un pico muy por encima de la mediana.
import os, sys, json
from playwright.sync_api import sync_playwright
names = sys.argv[1].split('|') if len(sys.argv) > 1 and sys.argv[1] else None
JS = r'''
async (names) => {
  const S = 150, N = 48, out = [];
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const cx = cv.getContext('2d', { willReadFrequently: true });
  const raster = svg => new Promise(res => { const img = new Image(); img.onload = () => { cx.fillStyle = '#000'; cx.fillRect(0, 0, S, S); cx.drawImage(img, 0, 0, S, S); res(cx.getImageData(0, 0, S, S).data); }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  for (const name of names || Object.keys(EXS)) {
    const ex = EXS[name], cam = Fig3D.camera(ex.yaw, ex.pitch), vb = fit(boxOf(ex, cam, [0, .25, .5, .75, 1]));
    let prev = null; const d = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="${vb.join(' ')}"><defs>${Fig3D.DEFS}</defs>${Fig3D.draw(ex, t, cam, 's')}</svg>`;
      const px = await raster(svg);
      if (prev) { let s = 0; for (let j = 0; j < px.length; j += 4) s += Math.abs(px[j] - prev[j]) + Math.abs(px[j + 1] - prev[j + 1]) + Math.abs(px[j + 2] - prev[j + 2]); d.push([s / 1000, t]); }
      prev = px;
    }
    const v = d.map(x => x[0]).sort((a, b) => a - b), med = v[v.length >> 1], mx = d.reduce((a, b) => b[0] > a[0] ? b : a);
    const k = d.indexOf(mx); out.push([name, +(mx[0] / med).toFixed(2), +mx[1].toFixed(3), d.slice(Math.max(0, k - 3), k + 4).map(x => +(x[0] / med).toFixed(2))]);
  }
  return out;
}
'''
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto('file://' + os.path.abspath('salida/banco.html')); pg.wait_for_timeout(300)
    r = pg.evaluate(JS, names)
    r.sort(key=lambda x: -x[1])
    for x in r: print(f'{x[1]:>6}  t={x[2]:<6} {x[0]}  {x[3]}')
    b.close()

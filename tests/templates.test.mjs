// Plantillas html`…` en varias líneas (tools/templates.js), sin navegador:  node --test tests/templates.test.mjs
// La regla: un salto de línea no forma parte del HTML (dentro de una etiqueta separa dos atributos). Aplanar la aplica y
// rechaza los saltos donde se esperaría un espacio; ordenar reparte las plantillas en líneas sin cambiar ninguna; y los
// módulos de la app, repartidos con cualquier ancho, siguen siendo el mismo código.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { flatten, layout, WIDTH } = require('../tools/templates.js');
const { format } = require('../tools/format.js');
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const JS = join(ROOT, 'src', 'js');
const modules = (function walk(d) { return readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.js') ? [join(d, e.name)] : []); })(JS);
const lines = (...l) => l.join('\n');

test('aplanar: un salto de línea no forma parte del HTML', () => {
  const same = [
    // entre etiquetas, y justo dentro de un elemento
    [lines('html`', '  <div class="cd">', '    <b>${x}</b>', '  </div>`'), 'html`<div class="cd"><b>${x}</b></div>`'],
    // junto a un ${…} que no lleva texto al lado, y entre dos
    [lines('html`<ul>', '  ${a}', '  ${b}', '</ul>`'), 'html`<ul>${a}${b}</ul>`'],
    // el texto de un elemento, en su propia línea
    [lines('html`<p class="mu">', '  Hola <b>tú</b>, ¿qué tal?', '</p>`'), 'html`<p class="mu">Hola <b>tú</b>, ¿qué tal?</p>`'],
    // tras un <br> se puede saltar; el ` de cierre, en su línea; y las líneas en blanco tampoco cuentan
    [lines('html`', '  <p>uno<br>', '    dos</p>', '', '  <p>tres</p>', '`'), 'html`<p>uno<br>dos</p><p>tres</p>`'],
    // un texto junto a una etiqueta que no es de texto
    [lines('html`<label>', '  Peso', '  <input id="w">', '</label>`'), 'html`<label>Peso<input id="w"></label>`'],
    // las plantillas de dentro de un ${…}, cada una con la regla
    [lines('html`<ul>${xs.map(x => html`', '  <li>${x}</li>`)}', '</ul>`'), 'html`<ul>${xs.map(x => html`<li>${x}</li>`)}</ul>`'],
  ];
  for (const [multi, flat] of same) assert.equal(flatten(multi, 'x.js'), flat);
});

test('aplanar: dentro de una etiqueta, un salto de línea separa dos atributos', () => {
  assert.equal(flatten(lines('html`<input id="w" type="number"', '    min="30" max="300"', '    aria-label="${l}">`'), 'x.js'), 'html`<input id="w" type="number" min="30" max="300" aria-label="${l}">`');
  assert.equal(flatten(lines('html`<div ${attrs}', '    class="x">a</div>`'), 'x.js'), 'html`<div ${attrs} class="x">a</div>`');
});

test('aplanar no toca lo que no es una plantilla html`…`', () => {
  for (const code of [lines('const t = `uno', '  dos`;'), lines('const s = raw(`<p>uno', '  dos</p>`);'), lines('const a = {', '  b: 1', '};'), 'const h = html`<p>uno dos</p>`;'])
    assert.equal(flatten(code, 'x.js'), code);
});

test('aplanar rechaza un salto de línea donde se esperaría un espacio, con su archivo y su línea', () => {
  const bad = [
    [lines('html`<p>hola', '  mundo</p>`'), /^x\.js:1: salto de línea entre dos textos/],
    [lines('html`<p>', '  Peso:', '  ${w} kg</p>`'), /^x\.js:2: salto de línea entre un texto y un \$\{…\}/],
    [lines('html`<p>${w}', '  kg</p>`'), /^x\.js:1: salto de línea entre un texto y un \$\{…\}/],
    [lines('html`<p>Hola', '  <b>tú</b></p>`'), /^x\.js:1: salto de línea entre un texto y la etiqueta de texto/],
    [lines('html`<p><b>tú</b>', '  y yo</p>`'), /^x\.js:1: salto de línea entre un texto y la etiqueta de texto/],
    [lines('html`<p>uno', '  <br>dos</p>`'), /^x\.js:1: salto de línea entre un texto y la etiqueta de texto/],
    [lines('html`<p>uno</p> ', '<p>dos</p>`'), /^x\.js:1: espacios al final de la línea/],
    [lines('html`<p class="a', '  b">x</p>`'), /^x\.js:1: salto de línea dentro del valor de un atributo/],
    [lines('const a = 1;', 'const h = html`<p>x</p>\\', '<p>y</p>`;'), /^x\.js:2: barra invertida antes de un salto de línea/],
  ];
  for (const [code, message] of bad) assert.throws(() => flatten(code, 'x.js'), { message });
});

// cada caso: el ancho, el código en una línea y cómo queda ordenado
const CASES = {
  'un elemento que no cabe pone cada hijo en su línea; el que cabe se queda entero': [90,
    'const card = () => html`<div class="cd"><div class="row"><b>Agua</b><b>${v / 1000} / ${g / 1000} L</b></div><div class="g2"><button data-a="addWater" data-i="250">+250 ml</button><button data-a="addWater" data-i="500">+500 ml</button></div></div>`;',
    lines('const card = () => html`',
      '  <div class="cd">',
      '    <div class="row"><b>Agua</b><b>${v / 1000} / ${g / 1000} L</b></div>',
      '    <div class="g2">',
      '      <button data-a="addWater" data-i="250">+250 ml</button>',
      '      <button data-a="addWater" data-i="500">+500 ml</button>',
      '    </div>',
      '  </div>`;')],
  'una etiqueta que no cabe sigue entre dos atributos, y un texto corto va detrás de ella': [70,
    'const b = html`<button class="pr w-full" data-a="${done ? \'repeat\' : \'start\'}" data-i="${i}" aria-label="${label}">Empezar</button>`;',
    lines('const b = html`',
      '  <button class="pr w-full" data-a="${done ? \'repeat\' : \'start\'}"',
      '      data-i="${i}" aria-label="${label}">Empezar</button>`;')],
  'si a la plantilla le sigue más código, su ` de cierre va en una línea propia': [70,
    'const chart = n ? html`<svg viewBox="0 0 320 160"><polyline points="${pts}"/>${marks.map(m => html`<circle cx="${m[0]}" cy="${m[1]}" r="3"/>`)}</svg>` : \'<p class="mu">Registra tu peso para ver la gráfica.</p>\';',
    lines('const chart = n ? html`',
      '  <svg viewBox="0 0 320 160">',
      '    <polyline points="${pts}"/>',
      '    ${marks.map(m => html`<circle cx="${m[0]}" cy="${m[1]}" r="3"/>`)}',
      '  </svg>',
      '` : \'<p class="mu">Registra tu peso para ver la gráfica.</p>\';')],
  'una frase (texto, ${…} y etiquetas de texto) va entera en su línea': [70,
    'const note = html`<div class="cd"><p class="mu">Llevas <b>${n}</b> semanas con los mismos accesorios.</p><button data-a="rotate">Ver cambios</button></div>`;',
    lines('const note = html`',
      '  <div class="cd">',
      '    <p class="mu">',
      '      Llevas <b>${n}</b> semanas con los mismos accesorios.',
      '    </p>',
      '    <button data-a="rotate">Ver cambios</button>',
      '  </div>`;')],
  'un <br> cierra su línea': [50,
    'const d = html`<button class="dy" data-a="selectDay" data-i="${j}">DÍA<br>${n}</button><span class="sub">${a}</span>`;',
    lines('const d = html`',
      '  <button class="dy" data-a="selectDay"',
      '      data-i="${j}">',
      '    DÍA<br>',
      '    ${n}',
      '  </button>',
      '  <span class="sub">${a}</span>`;')],
  'una plantilla corta en medio de mucho código no se abre': [70,
    "const head = '<div class=\"row\"><h2>' + X(e.n) + '</h2><div class=\"chips\">' + tags.filter(Boolean).map(x => html`<span class=\"tg\">${x}</span>`).join('') + '</div></div>';",
    "const head = '<div class=\"row\"><h2>' + X(e.n) + '</h2><div class=\"chips\">' + tags.filter(Boolean).map(x => html`<span class=\"tg\">${x}</span>`).join('') + '</div></div>';"],
  'el código de varias líneas de un ${…} conserva su forma, sangrado donde le toca': [60,
    lines('function f() {',
      '  return html`<div class="cd"><b>Medidas</b>${rows.map(x => {',
      '    const d = delta(x);',
      '    return html`<div class="it"><span>${x.n}</span><b>${d}</b></div>`;',
      '  })}</div>`;',
      '}'),
    lines('function f() {',
      '  return html`',
      '    <div class="cd">',
      '      <b>Medidas</b>',
      '      ${rows.map(x => {',
      '        const d = delta(x);',
      '        return html`',
      '          <div class="it">',
      '            <span>${x.n}</span>',
      '            <b>${d}</b>',
      '          </div>`;',
      '      })}',
      '    </div>`;',
      '}')],
  'un elemento que se abre en una plantilla y se cierra en otra': [20,
    lines('const a = html`<div class="cd"><b>Título</b>`;', 'const b = html`</div><div class="h-96"></div>`;'),
    lines('const a = html`', '  <div class="cd">', '    <b>Título</b>`;', 'const b = html`', '  </div>', '  <div class="h-96"></div>`;')],
};
for (const [name, [width, code, expected]] of Object.entries(CASES))
  test('ordenar: ' + name, () => {
    assert.equal(layout(code, 'x.js', width), expected);
    // y es el mismo código: aplanado, queda como estaba (salvo la sangría del código de varias líneas de un ${…})
    assert.equal(flatten(expected, 'x.js').replace(/^ +/gm, ''), code.replace(/^ +/gm, ''));
  });

test('ordenar: lo que cabe en la línea no se toca', () => {
  const code = lines('const a = html`<b class="x">${n}</b>`;', 'const f = () => html`<div class="row"><b>Agua</b><b>${v} L</b></div>`;', '');
  assert.equal(layout(code, 'x.js'), code);
  assert.equal(format(code), code);
});

test('formatear dos veces da lo mismo que una', () => {
  for (const [name, [, code]] of Object.entries(CASES)) {
    const once = format(code + '\n');
    assert.equal(format(once), once, name);
  }
});

// la garantía sobre el código de verdad: cada módulo, repartido con cualquier ancho, aplanado es el mismo
test('los módulos de la app: repartir sus plantillas no cambia ninguna, con ningún ancho', () => {
  const code = s => s.replace(/^[ \t]+/gm, '');
  let templates = 0;
  for (const f of modules) {
    const name = relative(JS, f), src = readFileSync(f, 'utf8'), flat = flatten(src, name);
    assert.equal(flatten(flat, name), flat, name + ': aplanado no le quedan saltos de línea en las plantillas');
    templates += (flat.match(/\bhtml`/g) || []).length;
    for (const width of [30, 60, 100, WIDTH, 200])
      assert.equal(code(flatten(layout(flat, name, width), name)), code(flat), name + ' con ancho ' + width);
  }
  assert.ok(templates > 500, 'se han leído las plantillas de la app: ' + templates);
});

test('node tools/templates.js --flat aplana una carpeta, y falla con el archivo y la línea si no puede', () => {
  const tool = join(ROOT, 'tools', 'templates.js');
  const ok = mkdtempSync(join(tmpdir(), 'sf-tpl-'));
  writeFileSync(join(ok, 'a.js'), lines('export const a = html`', '  <p>', '    ${x}', '  </p>`;', ''));
  let r = spawnSync(process.execPath, [tool, '--flat', ok], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(join(ok, 'a.js'), 'utf8'), 'export const a = html`<p>${x}</p>`;\n');
  const bad = mkdtempSync(join(tmpdir(), 'sf-tpl-'));
  writeFileSync(join(bad, 'b.js'), lines('export const b = html`<p>hola', '  mundo</p>`;', ''));
  r = spawnSync(process.execPath, [tool, '--flat', bad], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^b\.js:1: salto de línea entre dos textos/);
});

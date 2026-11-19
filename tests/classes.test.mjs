// El renombrado de clases CSS (tools/classes.js), sin navegador:  node --test tests/classes.test.mjs
// Sobre un proyecto de juguete: cambia el nombre en los estilos, en el código (solo donde es una clase) y en las pruebas, sigue
// de dónde sale una clase (una condición, una constante, lo que se le pasa a una función) y avisa de lo que no sabe decidir.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL = join(fileURLToPath(new URL('..', import.meta.url)), 'tools', 'classes.js');
const lines = (...l) => l.join('\n') + '\n';
function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'sf-cls-'));
  for (const d of ['src/css', 'src/js', 'tests', 'docs']) mkdirSync(join(root, d), { recursive: true });
  for (const [f, text] of Object.entries(files)) { mkdirSync(dirname(join(root, f)), { recursive: true }); writeFileSync(join(root, f), text); }
  return { root, read: f => readFileSync(join(root, f), 'utf8'), run: (...args) => spawnSync(process.execPath, [TOOL, join(root, 'mapa.txt'), '--root=' + root, ...args], { encoding: 'utf8' }) };
}
const CSS = lines('/* la tarjeta (.cd) y su estado */', '.cd { color:red; }', '.cd.on,.row>.it:not(.ok) { margin:0; }', 'html.gl .cd { content:".cd"; }', '.ok { top:.5px; }', '.keep { top:0; }');
const MAPA = lines('# de prueba', 'K cd card', 'K it item', 'K gl glass', 'K ok fine');

test('en el CSS cambia los selectores (y las menciones de los comentarios), no los valores', () => {
  const p = project({ 'mapa.txt': MAPA, 'src/css/a.css': CSS });
  assert.equal(p.run().status, 0);
  assert.equal(p.read('src/css/a.css'), lines('/* la tarjeta (.card) y su estado */', '.card { color:red; }', '.card.on,.row>.item:not(.fine) { margin:0; }', 'html.glass .card { content:".cd"; }', '.fine { top:.5px; }', '.keep { top:0; }'));
});

test('en el código cambia el nombre donde es una clase, y solo ahí', () => {
  const p = project({ 'mapa.txt': MAPA, 'src/css/a.css': CSS, 'src/js/a.js': lines(
    "const view = (on, x) => html`<div class=\"cd${on ? ' on' : ''} it\" data-v=\"cd\"><b class=\"${x.ok ? 'ok' : ''}\">cd</b></div>`;",
    "const old = '<p class=\"it keep\">' + (state.ok ? 'ok' : 'cd') + '</p>';",
    "el.classList.toggle('gl', level > 0);",
    "const first = document.querySelector('#app .cd.on > .it[data-k=\"cd\"]');",
    "const data = { ok: 1, cd: 'cd' };",
    "if (res.ok && key == 'it') save('gl');") });
  assert.equal(p.run().status, 0);
  assert.equal(p.read('src/js/a.js'), lines(
    "const view = (on, x) => html`<div class=\"card${on ? ' on' : ''} item\" data-v=\"cd\"><b class=\"${x.ok ? 'fine' : ''}\">cd</b></div>`;",
    "const old = '<p class=\"item keep\">' + (state.ok ? 'ok' : 'cd') + '</p>';",
    "el.classList.toggle('glass', level > 0);",
    "const first = document.querySelector('#app .card.on > .item[data-k=\"cd\"]');",
    "const data = { ok: 1, cd: 'cd' };",
    "if (res.ok && key == 'it') save('gl');"));
});

test('sigue de dónde sale una clase: una constante, una tabla, lo que se le pasa a una función y los botones de una lista', () => {
  const p = project({ 'mapa.txt': MAPA, 'src/css/a.css': CSS, 'src/js/a.js': lines(
    "const BASE = 'cd';",
    "const KIND = { a: 'it', b: 'keep' };",
    "const chip = (text, cls) => html`<span class=\"${cls || ''}\">${text}</span>`;",
    "const box = k => html`<div class=\"${BASE} ${KIND[k]}\">${chip('uno', 'ok')}${chip('dos', k ? 'it' : '')}</div>`;",
    "const dialog = (title, buttons) => html`<h3>${title}</h3>${buttons.map(b => html`<button class=\"${b[2]}\" data-a=\"${b[1]}\">${b[0]}</button>`)}`;",
    "dialog('cd', [['No', 'close', ''], ['ok', 'save', 'ok']]);") });
  const r = p.run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(p.read('src/js/a.js'), lines(
    "const BASE = 'card';",
    "const KIND = { a: 'item', b: 'keep' };",
    "const chip = (text, cls) => html`<span class=\"${cls || ''}\">${text}</span>`;",
    "const box = k => html`<div class=\"${BASE} ${KIND[k]}\">${chip('uno', 'fine')}${chip('dos', k ? 'item' : '')}</div>`;",
    "const dialog = (title, buttons) => html`<h3>${title}</h3>${buttons.map(b => html`<button class=\"${b[2]}\" data-a=\"${b[1]}\">${b[0]}</button>`)}`;",
    "dialog('cd', [['No', 'close', ''], ['ok', 'save', 'fine']]);"));
  assert.match(r.stdout, /TABLA src\/js\/a\.js:2: KIND/);
});

test('lo que no sabe decidir lo dice y no lo toca', () => {
  const p = project({ 'mapa.txt': MAPA, 'src/css/a.css': CSS, 'src/js/a.js': lines(
    "const a = html`<i class=\"${row.kind}\"></i>`;",
    "const b = html`<i class=\"it${n}\"></i>`;",
    "const c = { state: 'ok', label: 'El lote está ok' };") });
  const r = p.run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(p.read('src/js/a.js').split('\n')[1], 'const b = html`<i class="it${n}"></i>`;');
  assert.match(r.stdout, /SIN RESOLVER src\/js\/a\.js:1: row\.kind/);
  assert.match(r.stdout, /A TROZOS src\/js\/a\.js:2: it /);
  assert.match(r.stdout, /QUEDA src\/js\/a\.js:3: ok en ok/);
  assert.match(r.stdout, /QUEDA src\/js\/a\.js:3: ok en El lote está ok/);
});

test('en las pruebas cambia los selectores y los classList, no el código que se les parece', () => {
  const p = project({ 'mapa.txt': MAPA, 'src/css/a.css': CSS, 'tests/a.py': lines(
    "n = ev(\"document.querySelectorAll('#app .cd.on, button.it').length\")",
    "check('cristal', ev(\"document.documentElement.classList.contains('gl')\") and r.ok and o.dataset.it == 'x')",
    "rows = [P.ok, P.cd]",
    "html = '<div class=\"cd it\">' + CSS + '}.cd.hero{top:0}'") });
  assert.equal(p.run().status, 0);
  assert.equal(p.read('tests/a.py'), lines(
    "n = ev(\"document.querySelectorAll('#app .card.on, button.item').length\")",
    "check('cristal', ev(\"document.documentElement.classList.contains('glass')\") and r.ok and o.dataset.it == 'x')",
    "rows = [P.ok, P.cd]",
    "html = '<div class=\"card item\">' + CSS + '}.card.hero{top:0}'"));
});

test('el mapa crece por lotes: lo ya aplicado no se repite, y se niega si un nombre nuevo ya existe', () => {
  const p = project({ 'mapa.txt': MAPA, 'src/css/a.css': CSS, 'src/js/a.js': "const a = html`<i class=\"cd\"></i>`;\n" });
  assert.equal(p.run().status, 0);
  const again = p.run();
  assert.equal(again.status, 0);
  assert.match(again.stdout, /0 clases · 0 archivos cambiados/);
  assert.equal(p.read('src/js/a.js'), "const a = html`<i class=\"card\"></i>`;\n");
  writeFileSync(join(p.root, 'mapa.txt'), MAPA + 'K keep card\n');
  const clash = p.run();
  assert.equal(clash.status, 1);
  assert.match(clash.stderr, /«card» \(para «keep»\) ya es una clase/);
});

test('--check: una clase que el código pone o busca y no está en el CSS es un error, con su archivo y su línea', () => {
  const good = project({ 'mapa.txt': MAPA, 'src/css/a.css': CSS, 'src/js/a.js': lines(
    "const a = html`<div class=\"cd${on ? ' on' : ''} keep\">${x}</div>`;",
    "const b = document.querySelector('.row > .it');") });
  const ok = good.run('--check');
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^Clases correctas/);
  assert.equal(good.read('src/js/a.js').split('\n')[1], "const b = document.querySelector('.row > .it');", '--check no cambia nada');
  // tras renombrar el CSS, el código que sigue con los nombres viejos (una rama de antes, fusionada después) y una errata
  const stale = project({ 'mapa.txt': MAPA, 'src/css/a.css': CSS.replace(/\.cd\b/g, '.card').replace(/\.it\b/g, '.item').replace(/\.gl\b/g, '.glass').replace(/\.ok\b/g, '.fine'), 'src/js/a.js': lines(
    "const a = html`<div class=\"cd keep\">${x}</div>`;",
    "const b = document.querySelector('.row > .it');",
    "const c = html`<b class=\"kepe\"></b>`;") });
  const bad = stale.run('--check');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /src\/js\/a\.js:1: la clase «cd» no está en src\/css \(se renombró: mapa\.txt\)/);
  assert.match(bad.stderr, /src\/js\/a\.js:2: la clase «it» no está en src\/css \(se renombró/);
  assert.match(bad.stderr, /src\/js\/a\.js:3: la clase «kepe» no está en src\/css\n/);
});

test('--dry cuenta y no escribe', () => {
  const p = project({ 'mapa.txt': MAPA, 'src/css/a.css': CSS });
  const r = p.run('--dry');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /cd → card: 3 \/ 0 \/ 0 \/ 0/);
  assert.equal(p.read('src/css/a.css'), CSS);
});

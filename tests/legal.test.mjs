// Los textos legales (data/legal y su traducción, i18n/en-legal) y el Markdown mínimo en que van escritos (profile/legaltext),
// sin navegador:
//   node --test tests/legal.test.mjs
// · Ningún dato pendiente: ni un marcador entre corchetes de los borradores, ni un correo, una dirección postal o un NIF que el
//   titular no ha confirmado.
// · Lo decidido está escrito: 16 años, dos años sin actividad, sin delegado de protección de datos, y reCAPTCHA sin remitir a
//   las condiciones de Google (Google lo trata por encargo desde el 2 de abril de 2026 y pide no nombrarlas). Y el
//   consentimiento informado para los datos de salud: el texto entero de la segunda casilla, que dice lo mismo que ella.
// · El inglés es el mismo texto: los mismos apartados, con los mismos párrafos, listas y enlaces, y dice que vale el español.
// · Los enlaces: a otra pantalla de la app o a una dirección https de las conocidas; nada más sale como enlace, y lo que se
//   escribe se escapa.
// · La versión y la fecha de cada texto (cloud/consent) y la de lo que se da por aceptado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { legalBlock, parseLegal } from '../src/js/profile/legaltext.js';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
/* los textos de un módulo (terms, privacy, consent y cards), tal como están escritos */
const texts = f => {
  const src = read(f);
  const part = k => {
    const m = new RegExp('\\n  ' + k + ': `\\n([\\s\\S]*?)\\n`').exec(src);
    assert.ok(m, f + ': falta ' + k);
    return m[1];
  };
  return { terms: part('terms'), privacy: part('privacy'), consent: part('consent'), cards: part('cards') };
};
const ES = texts('src/js/data/legal.js');
const EN = texts('src/js/i18n/en-legal.js');
const esc = s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');
const html = doc => doc.intro.concat(doc.sections.flatMap(s => s.b)).map(b => legalBlock(b, esc)).join('');
const links = t => [...t.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].map(m => m[2]);
/* la forma de un texto: de cada apartado, qué es cada bloque (p, o una lista con tantos elementos) */
const shape = doc => [doc.intro].concat(doc.sections.map(s => s.b)).map(bs => bs.map(b => Array.isArray(b) ? 'ul' + b.length : 'p').join(' '));
const HOSTS = ['world.openfoodfacts.org', 'opendatacommons.org', 'firebase.google.com', 'docs.github.com', 'www.aepd.es'];

test('el Markdown mínimo: título, lema, apartados, párrafos y listas', () => {
  const d = parseLegal('\n# Título\n> Lema\n\nUno.\n\nDos.\n\n## 1. Primero\n\nTexto.\n\n- a\n- b\n\nOtro.\n\n- c\n\n## 2. Segundo\nSin línea en blanco.\n');
  assert.equal(d.title, 'Título');
  assert.equal(d.motto, 'Lema');
  assert.deepEqual(d.intro, ['Uno.', 'Dos.']);
  assert.deepEqual(d.sections, [{ t: '1. Primero', b: ['Texto.', ['a', 'b'], 'Otro.', ['c']] }, { t: '2. Segundo', b: ['Sin línea en blanco.'] }]);
});

test('lo escrito se escapa; solo salen negritas y enlaces a la app o a una dirección https', () => {
  const p = s => legalBlock(s, esc);
  assert.equal(p('Un <b>texto</b> & "más"'), '<p>Un &#60;b&#62;texto&#60;/b&#62; &#38; &#34;más&#34;</p>');
  assert.equal(p('**Negrita.** Y sigue.'), '<p><b>Negrita.</b> Y sigue.</p>');
  assert.equal(p('Ve a [Privacidad](#privacy).'), '<p>Ve a <button class="legal-link" data-a="openLegal" data-v="privacy">Privacidad</button>.</p>');
  assert.equal(p('[Aviso](#terms) y [contacto](#contact)'), '<p><button class="legal-link" data-a="openLegal" data-v="terms">Aviso</button> y <button class="legal-link" data-a="openPrivacyContact" data-v="">contacto</button></p>');
  assert.equal(p('[AEPD](https://www.aepd.es/)'), '<p><a class="legal-link" href="https://www.aepd.es/" target="_blank" rel="noopener noreferrer">AEPD</a></p>');
  /* lo que no es ni una cosa ni la otra se queda en su texto: sin http, sin javascript:, sin atributos colados, sin otras pantallas */
  for (const bad of ['http://www.aepd.es/', 'javascript:alert(1)', 'https://a.b/"onclick="x', '#otra', '#constructor', 'mailto:a@b.c', 'https://']) {
    const out = p('[texto](' + bad + ')');
    assert.ok(!/<a |<button /.test(out), bad + ' → ' + out);
    assert.ok(out.includes('texto'));
  }
  assert.equal(legalBlock(['uno', '**dos**'], esc), '<ul><li>uno</li><li><b>dos</b></li></ul>');
});

test('los textos, enteros: 16 apartados el aviso, 20 la política y 9 el consentimiento, numerados, con título y sin restos del borrador', () => {
  for (const [lang, T] of [['es', ES], ['en', EN]]) {
    const terms = parseLegal(T.terms);
    const privacy = parseLegal(T.privacy);
    const consent = parseLegal(T.consent);
    assert.equal(terms.sections.length, 16, lang);
    assert.equal(privacy.sections.length, 20, lang);
    assert.equal(consent.sections.length, 9, lang);
    for (const d of [terms, privacy, consent]) {
      assert.ok(d.title.length > 10, lang + ': título');
      d.sections.forEach((s, i) => {
        assert.ok(s.t.startsWith(i + 1 + '. '), lang + ': ' + s.t);
        assert.ok(s.b.length, lang + ': apartado vacío: ' + s.t);
      });
    }
    assert.ok(privacy.motto, lang + ': lema');
    const cards = T.cards.trim().split('\n').map(l => l.split('|'));
    assert.equal(cards.length, 6, lang + ': seis tarjetas');
    assert.ok(cards.every(c => c.length == 2 && c[0].trim() && c[1].trim()), lang);
    const all = T.terms + T.privacy + T.consent + T.cards;
    /* marcadores de los borradores ([FECHA_VIGENCIA], [CORREO OFICIAL DE SOPORTE]…) y corchetes sueltos que no son un enlace */
    assert.deepEqual(all.match(/\[[A-ZÁÉÍÓÚÑ_ ,]{4,}\]/g), null, lang);
    assert.deepEqual(all.replace(/\[[^\]\n]+\]\([^)\s]+\)/g, '').match(/[\[\]]/g), null, lang + ': corchetes que no son enlaces');
    /* nada pendiente de confirmar por el titular: ni correo, ni NIF, ni dirección de la app */
    assert.ok(!/@[\w-]+\.\w|\bNIF\b|\bDNI\b|github\.io|mailto:/i.test(all), lang + ': un dato sin confirmar');
    assert.ok(!/TODO|PENDIENTE|XXX/.test(all), lang);
    /* el HTML que sale no lleva nada sin cerrar ni etiquetas que no sean las cinco de siempre */
    for (const d of [terms, privacy, consent]) {
      const h = html(d);
      assert.deepEqual([...new Set((h.match(/<\/?([a-z]+)/g) || []).map(x => x.replace(/[</]/g, '')))].sort(), ['a', 'b', 'button', 'li', 'p', 'ul'].filter(t => new RegExp('<' + t + '[ >]').test(h)), lang);
      for (const t of ['p', 'b', 'ul', 'li', 'a', 'button'])
        assert.equal((h.match(new RegExp('<' + t + '[ >]', 'g')) || []).length, (h.match(new RegExp('</' + t + '>', 'g')) || []).length, lang + ': <' + t + '>');
      assert.ok(!/\*\*|\]\(/.test(h), lang + ': Markdown sin pasar a HTML');
    }
  }
});

test('los enlaces: a las pantallas de la app y a direcciones https conocidas', () => {
  for (const [lang, T] of [['es', ES], ['en', EN]]) {
    const all = links(T.terms).concat(links(T.privacy), links(T.consent));
    assert.ok(all.length >= 12, lang);
    for (const u of all)
      assert.ok(['#privacy', '#terms', '#consent', '#contact'].includes(u) || HOSTS.includes(new URL(u).host) && u.startsWith('https://'), lang + ': ' + u);
    /* cada texto lleva al otro, y los dos al contacto; la política, al consentimiento, y este a la política y al contacto */
    assert.ok(links(T.terms).includes('#privacy') && links(T.privacy).includes('#terms'), lang);
    assert.ok(links(T.terms).includes('#contact') && links(T.privacy).includes('#contact'), lang);
    assert.ok(links(T.privacy).includes('#consent') && links(T.consent).includes('#privacy') && links(T.consent).includes('#contact'), lang);
    /* el consentimiento solo lleva a la app: nada de otras webs */
    assert.ok(links(T.consent).every(u => u.startsWith('#')), lang);
    assert.equal(links(T.cards).length, 0);
  }
});

test('lo decidido por el titular está escrito', () => {
  const terms = ES.terms;
  const privacy = ES.privacy;
  assert.match(terms, /tener 16 años o más y aceptar expresamente estas condiciones/);
  assert.match(privacy, /personas de 16 años o más/);
  assert.match(privacy, /Si pasan dos años sin actividad, la cuenta y todos sus datos se eliminan automáticamente/);
  assert.match(terms, /dos años sin actividad se eliminan automáticamente/);
  assert.match(privacy, /no tiene designado un delegado de protección de datos/);
  assert.match(privacy, /Eliminar tu cuenta\.\*\* Puedes eliminarla tú mismo desde Ajustes → Cuenta → Eliminar cuenta/);
  assert.match(privacy, /Retirar el consentimiento\.\*\*/);
  /* el contacto es el de la app, que existe; el titular, como firma la app */
  for (const t of [terms, privacy]) {
    assert.match(t, /\[Perfil → Fallos y sugerencias\]\(#contact\)/);
    assert.match(t, /V\. M\. Rodriguez Mazuelas/);
    assert.match(t, /«Privacidad y datos»/);
  }
  /* reCAPTCHA: Google lo trata por encargo; ni su política de privacidad ni sus condiciones se nombran a su cuenta */
  for (const T of [ES, EN]) {
    assert.ok(!/policies\.google\.com/.test(T.privacy + T.terms));
    const recaptcha = parseLegal(T.privacy).sections[9];
    assert.match(recaptcha.t, /^10\. /);
    assert.equal(links(recaptcha.b.join(' ')).length, 0);
  }
  assert.match(ES.privacy, /Google trata esa información por cuenta de StrataFit, como encargado del tratamiento/);
  /* el consentimiento: lo que dice la casilla, su base, quién lo ve, qué pasa sin él y al retirarlo, y su constancia */
  const consent = ES.consent;
  const box = read('src/js/account/login.js').replace(/\s+/g, ' ');
  const said = /«(Acepto el tratamiento de mis datos de salud por StrataFit)»/.exec(consent);
  assert.ok(said && box.includes(said[1] + ' según el <button type="button" class="legal-link" data-a="openLegal" data-v="consent">Consentimiento informado</button>'), 'la casilla dice lo que cita el texto');
  assert.match(consent, /^# Consentimiento informado para el tratamiento de datos de salud$/m);
  assert.match(consent, /artículo 9\.2\.a del Reglamento General de Protección de Datos/);
  assert.match(consent, /El administrador de StrataFit no ve tus entrenamientos, tus comidas, tus medidas ni tu copia de seguridad/);
  assert.match(consent, /sin tu consentimiento no puedes usar la aplicación con tu cuenta/);
  assert.match(consent, /Privacidad → Tus datos → Retirar el consentimiento/);
  assert.match(consent, /Retirarlo no afecta a la licitud del tratamiento anterior/);
  assert.match(consent, /la versión de este texto que aceptaste, la fecha y la hora/);
  assert.match(EN.consent, /"I accept the processing of my health data by StrataFit"/);
  /* sin pagos ni precios */
  assert.ok(!/€|\beuros?\b|14 días/i.test(terms + privacy));
});

test('el inglés es el mismo texto: mismos apartados, bloques y enlaces, y dice que vale el español', () => {
  for (const k of ['terms', 'privacy', 'consent']) {
    const es = parseLegal(ES[k]);
    const en = parseLegal(EN[k]);
    /* el inglés lleva un párrafo más antes del primer apartado: el que dice que es una traducción */
    const [esIntro, ...esRest] = shape(es);
    const [enIntro, ...enRest] = shape(en);
    assert.equal(enIntro, ('p ' + esIntro).trim(), k + ': introducción');
    assert.deepEqual(enRest, esRest, k + ': los bloques de cada apartado');
    assert.match(en.intro[0], /translation.*Spanish version prevails/);
    /* los mismos enlaces, en el mismo orden (el de Firebase, sin pedir la página en español) */
    assert.deepEqual(links(EN[k]), links(ES[k]).map(u => u.replace('?hl=es', '')), k + ': enlaces');
    /* los números de los apartados y lo que no se traduce */
    assert.deepEqual(en.sections.map(s => parseInt(s.t)), es.sections.map(s => parseInt(s.t)));
    for (const same of ['V. M. Rodriguez Mazuelas', 'Open Food Facts', 'ODbL', 'Firebase', 'reCAPTCHA Enterprise', 'GitHub Pages'])
      assert.equal(EN[k].split(same).length, ES[k].split(same).length, k + ': ' + same);
    /* y está en inglés: ni una letra ni un signo que solo lleva el español */
    assert.deepEqual(EN[k].match(/[áéíóúñ¿¡«»]/gi), null, k);
  }
  assert.deepEqual(EN.cards.match(/[áéíóúñ¿¡«»]/gi), null);
  assert.match(EN.terms, /be 16 or older/);
  assert.match(EN.privacy, /If two years pass without activity/);
});

test('versión y fecha de cada texto, y lo que se da por aceptado', async () => {
  const src = read('src/js/cloud/consent.js');
  const m = /export const LEGAL = (\{[\s\S]*?\n\});/.exec(src);
  assert.ok(m);
  const LEGAL = Function('return ' + m[1])();
  for (const k of ['terms', 'privacy', 'health']) {
    assert.match(LEGAL[k].v, /^\d+\.\d+$/);
    assert.match(LEGAL[k].date, /^20\d\d-\d\d-\d\d$/);
    assert.ok(!Number.isNaN(Date.parse(LEGAL[k].date + 'T12:00:00')));
  }
  /* la versión vigente de las condiciones y la del consentimiento están entre las que valen: quien acepta hoy, entra */
  assert.ok(LEGAL.terms.valid.includes(LEGAL.terms.v));
  assert.ok(LEGAL.health.valid.includes(LEGAL.health.v));
  /* la sesión de las pruebas (tests/init.js) lleva aceptadas las versiones vigentes */
  const init = read('tests/init.js');
  assert.ok(init.includes("cs:{t:{v:'" + LEGAL.terms.v + "',at:1},h:{v:'" + LEGAL.health.v + "',at:1,st:1}}"));
});

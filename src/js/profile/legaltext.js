/* ═══ profile/legaltext ═══
   El Markdown mínimo en que van escritos los textos legales (data/legal; en inglés, i18n/en-legal): leerlo y pasarlo a HTML.
   Código puro, sin la página, probado aparte (tests/legal.test.mjs); lo usa profile/legal, que pinta las páginas.
   De un texto solo salen párrafos, listas, negritas y enlaces: a otra pantalla de la app (LEGAL_LINKS: un botón con su acción)
   o a una dirección https, que se abre aparte y sin dar a la otra página acceso a esta. Todo lo demás se escapa.
   Define: parseLegal, LEGAL_LINKS, legalInline, legalBlock
*/
/** Lee un texto legal: «# » el título, «> » el lema, «## » cada apartado, «- » una lista y una línea en blanco entre párrafos.
    Devuelve { title, motto, intro: bloques, sections: [{ t: título, b: bloques }] }; un bloque es un párrafo (un texto) o una
    lista (varios).
    @param {string} src */
export const parseLegal = src => {
  /** @type {{ title: string, motto: string, intro: any[], sections: { t: string, b: any[] }[] }} */
  const doc = { title: '', motto: '', intro: [], sections: [] };
  let into = doc.intro;
  /** @type {string[] | null} */
  let list = null;
  for (const line of String(src).trim().split('\n')) {
    const l = line.trim();
    if (!l)
      list = null;
    else if (l.startsWith('## ')) {
      doc.sections.push({ t: l.slice(3), b: into = [] });
      list = null;
    }
    else if (l.startsWith('# '))
      doc.title = l.slice(2);
    else if (l.startsWith('> '))
      doc.motto = l.slice(2);
    else if (l.startsWith('- ')) {
      if (!list)
        into.push(list = []);
      list.push(l.slice(2));
    }
    else {
      into.push(l);
      list = null;
    }
  }
  return doc;
};
/* A dónde lleva un enlace de los textos a otra pantalla de la app: [acción, dato]. (#privacy) la Política de privacidad,
   (#terms) el Aviso legal y (#contact) el contacto de privacidad (system/report). */
/** @type {Record<string, [string, string]>} */
const LEGAL_LINKS = { '#privacy': ['openLegal', 'privacy'], '#terms': ['openLegal', 'terms'], '#consent': ['openLegal', 'consent'], '#contact': ['openPrivacyContact', ''] };
/* El texto de un párrafo, ya en HTML: escapado con `esc` (core/util, X), con sus **negritas** y sus [enlaces](destino). Un
   enlace a otra cosa que una pantalla de la app o una dirección https se queda en su texto. */
/** @param {string} s
    @param {(s: string) => string} esc */
const legalInline = (s, esc) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => {
  const to = Object.prototype.hasOwnProperty.call(LEGAL_LINKS, u) ? LEGAL_LINKS[u] : null;
  if (to)
    return '<button class="legal-link" data-a="' + to[0] + '" data-v="' + to[1] + '">' + t + '</button>';
  return /^https:\/\/[\w.-]+\/[\w./?=%-]*$/.test(u) ? '<a class="legal-link" href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a>' : t;
});
/** Un bloque, ya en HTML: un párrafo o una lista.
    @param {string | string[]} b
    @param {(s: string) => string} esc */
export const legalBlock = (b, esc) => Array.isArray(b) ? '<ul>' + b.map(x => '<li>' + legalInline(x, esc) + '</li>').join('') + '</ul>' : '<p>' + legalInline(b, esc) + '</p>';

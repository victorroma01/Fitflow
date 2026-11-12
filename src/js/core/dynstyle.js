/* ═══ core/dynstyle ═══
   Estilos que dependen de un dato (el ancho de una barra de progreso, el alto de una columna, la foto de un día, los tonos de
   un color), sin estilos en línea (I-14): la política de seguridad (CSP) no deja style="…" en el HTML, pero sí cambiar el estilo
   desde el código (CSSOM). Se escribe data-style="width:37%" y aquí se aplica, con un MutationObserver, a todo lo que se pinta
   (con innerHTML o con core/morph) y otra vez si data-style cambia. Lo fijo va en clases (css/99-utilities). core/morph y las
   hojas, avisos y menú de core/ui lo aplican además al momento (applyStyles), para que nada mida la página sin esos estilos.
   Define: applied, parseStyle, applyStyle, applyStyles, watchStyles
*/
/* lo aplicado a cada elemento ({ propiedad: valor }), para quitar lo que ya no está en data-style */
const applied = new WeakMap();
/* las declaraciones de un data-style ({ propiedad: valor }); un ; dentro de paréntesis (url(data:image/webp;base64,…)) no
   separa */
const parseStyle = text => {
  const out = {};
  let depth = 0;
  let from = 0;
  const take = to => {
    const d = text.slice(from, to);
    const i = d.indexOf(':');
    if (i > 0)
      out[d.slice(0, i).trim()] = d.slice(i + 1).trim();
    from = to + 1;
  };
  for (let i = 0; i < text.length; i++)
    if (text[i] == '(')
      depth++;
    else if (text[i] == ')')
      depth--;
    else if (text[i] == ';' && !depth)
      take(i);
  take(text.length);
  return out;
};
/* aplica el data-style de el con el CSSOM: propiedad a propiedad, sin tocar lo que otro código haya puesto */
const applyStyle = el => {
  const now = parseStyle(el.getAttribute('data-style') || '');
  const before = applied.get(el) || {};
  for (const p in before)
    if (!(p in now))
      el.style.removeProperty(p);
  for (const p in now)
    if (el.style.getPropertyValue(p) !== now[p])
      el.style.setProperty(p, now[p]);
  applied.set(el, now);
};
/** Aplica ya el data-style del elemento y de lo que tenga dentro (sin esperar al observador). */
export const applyStyles = node => {
  if (node.nodeType !== 1)
    return;
  if (node.hasAttribute('data-style'))
    applyStyle(node);
  for (const el of node.querySelectorAll('[data-style]'))
    applyStyle(el);
};
/** Desde el arranque (main.js lo carga antes de pintar nada): vigila todo el documento. */
const watchStyles = () => {
  if (typeof MutationObserver == 'undefined')
    return;
  new MutationObserver(records => {
    for (const r of records)
      if (r.type == 'attributes')
        applyStyle(r.target);
      else
        r.addedNodes.forEach(applyStyles);
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-style'] });
  applyStyles(document.documentElement);
};
watchStyles();

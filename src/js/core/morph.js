/* ═══ core/morph ═══
   Pintar sin rehacer: deja un elemento con el contenido de un HTML nuevo cambiando solo lo que es distinto. Lo que sigue
   igual no se vuelve a crear: se conservan el desplazamiento, el foco y lo que se está escribiendo, y las imágenes no se
   vuelven a cargar. El resultado es el mismo HTML que con innerHTML (atributos, valores de los campos y marcas).
   Define: morph, sameNode, syncAttrs, syncFields, morphChildren
*/
/** ¿Se puede actualizar `a` para que sea `b`, o hay que sustituirlo? (otro tipo, otra etiqueta u otro id). Los <canvas> y
    los <video> siempre se sustituyen: su contenido no está en el HTML. */
const sameNode = (a, b) => {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName)
    return false;
  if (a.nodeType !== 1)
    return true;
  if (a.namespaceURI !== b.namespaceURI || a.nodeName === 'CANVAS' || a.nodeName === 'VIDEO')
    return false;
  return a.id === b.id;
};
/** Atributos de `a` iguales a los de `b`, en el mismo orden (así el HTML resultante es idéntico al de pintar de cero). */
const syncAttrs = (a, b) => {
  const x = a.attributes;
  const y = b.attributes;
  let same = x.length === y.length;
  for (let i = 0; same && i < y.length; i++)
    same = x[i].name === y[i].name;
  if (same) {
    for (let i = 0; i < y.length; i++)
      if (x[i].value !== y[i].value)
        x[i].value = y[i].value;
    return;
  }
  while (x.length)
    a.removeAttributeNode(x[0]);
  for (let i = 0; i < y.length; i++)
    a.setAttributeNS(y[i].namespaceURI, y[i].name, y[i].value);
};
/** Estado de los campos de formulario, que no está en los atributos: el valor escrito, la casilla marcada, la opción elegida. */
const syncFields = (a, b) => {
  const t = a.nodeName;
  if (t === 'INPUT') {
    if (a.type === 'checkbox' || a.type === 'radio')
      a.checked = b.checked;
    else if (a.type !== 'file' && a.value !== b.value)
      a.value = b.value;
  }
  else if ((t === 'TEXTAREA' || t === 'SELECT') && a.value !== b.value)
    a.value = b.value;
};
/** Hijos de `a` iguales a los de `b` (b es un fragmento recién leído: sus nodos se pueden mover a `a`). */
const morphChildren = (a, b) => {
  let x = a.firstChild;
  let y = b.firstChild;
  while (y) {
    const next = y.nextSibling;
    if (!x)
      a.appendChild(y);
    else if (sameNode(x, y)) {
      if (x.nodeType === 1) {
        syncAttrs(x, y);
        morphChildren(x, y);
        syncFields(x, y);
      }
      else if (x.nodeValue !== y.nodeValue)
        x.nodeValue = y.nodeValue;
      x = x.nextSibling;
    }
    else {
      const after = x.nextSibling;
      a.replaceChild(y, x);
      x = after;
    }
    y = next;
  }
  while (x) {
    const after = x.nextSibling;
    a.removeChild(x);
    x = after;
  }
};
/** Deja `el` con el contenido `html` cambiando solo lo necesario. */
export const morph = (el, html) => {
  const t = document.createElement('template');
  t.innerHTML = html;
  if (el.firstChild)
    morphChildren(el, t.content);
  else
    el.appendChild(t.content);
};

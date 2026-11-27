/* ═══ system/files ═══
   Descarga, copia, «Compartir» y codificación de archivos. Es lo que habla con el sistema para sacar algo de la app (guardar un
   archivo, compartirlo, copiarlo): en una app nativa, lo que cambia por sus complementos (docs/tecnica/movil.md).
   Define: isStandalone, saveBlob, shareFiles, canShareText, shareText, downloadFile, readTextFile, copyText, toBase64, fromBase64, cleanText  · acciones/registros: 1
*/
import { $ } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A } from '../core/registry.js';
import { S, saveState } from '../core/state.js';
export const isStandalone = () => {
  try {
    return navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  }
  catch (e) {
    return false;
  }
};
/** Descarga un archivo (un Blob) con su nombre, como al pulsar un enlace de descarga. */
export const saveBlob = (blob, name) => {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
};
/** «Compartir» del sistema con archivos (una imagen, una copia): 'shared' si se compartieron, 'declined' si la persona lo
    canceló y '' si aquí no se pueden compartir (entonces se guardan de otra forma). `title`, si se da, va con ellos. */
export const shareFiles = async (files, title = '') => {
  if (!navigator.canShare || !navigator.canShare({ files }))
    return '';
  try {
    await navigator.share(title ? { files, title } : { files });
    return 'shared';
  }
  catch (e) {
    return e && e.name == 'AbortError' ? 'declined' : '';
  }
};
/** Si hay «Compartir» del sistema para un texto (el botón dice entonces «Compartir»; si no, «Copiar»). */
export const canShareText = () => !!navigator.share;
/** «Compartir» del sistema con un texto: lo mismo que shareFiles. */
export const shareText = async (title, text) => {
  if (!canShareText())
    return '';
  try {
    await navigator.share({ title, text });
    return 'shared';
  }
  catch (e) {
    return e && e.name == 'AbortError' ? 'declined' : '';
  }
};
/** Guarda un archivo en el móvil: en la app instalada, con «Compartir» (en el iPhone, «Guardar en Archivos»); si no, como
    descarga. `type`: su tipo (JSON si no se dice). Devuelve 'saved', 'declined' o 'fail'. */
export const downloadFile = async (name, data, type = 'application/json') => {
  if (isStandalone() && typeof File != 'undefined') {
    let shared = '';
    try {
      shared = await shareFiles([new File([data], name, { type })]);
    }
    catch (e) {
      /* sin File con contenido: se descarga */
    }
    if (shared)
      return shared == 'shared' ? 'saved' : 'declined';
  }
  try {
    saveBlob(new Blob([data], { type }), name);
    return 'saved';
  }
  catch (e) {
    return 'fail';
  }
};
/** Lee como texto el archivo elegido en un campo de archivo y se lo pasa a `then`; el campo queda vacío, para poder elegir
    después el mismo archivo. Si pasa de `max` bytes no se lee, y se avisa con `tooBig`. */
export const readTextFile = (input, then, max = Infinity, tooBig = '') => {
  const f = input.files && input.files[0];
  if (!f)
    return;
  if (f.size > max)
    toast(tooBig);
  else {
    const r = new FileReader();
    r.onload = () => then(String(r.result));
    r.onerror = () => toast('No se pudo leer el archivo');
    r.readAsText(f);
  }
  input.value = '';
};
/** Copia un texto al portapapeles. Sin permiso para el portapapeles, si se da el campo que lo enseña (`el`), lo selecciona y
    lo copia de la forma antigua. Devuelve si se copió. */
export const copyText = async (t, el) => {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  }
  catch (e) {
    /* sin permiso para el portapapeles: se prueba el método alternativo */
  }
  if (!el)
    return false;
  try {
    el.focus();
    el.select();
    el.setSelectionRange && el.setSelectionRange(0, t.length + 1);
    return document.execCommand && document.execCommand('copy');
  }
  catch (e) {
    return false;
  }
};
A.backupCopyText = () => {
  const e = $('#bk');
  try {
    navigator.clipboard.writeText(e.value);
  }
  catch (x) {
    e.select();
  }
  S.lastBackupDate = Date.now();
  saveState();
  toast('Texto copiado');
};
export const toBase64 = s => {
  const b = new TextEncoder().encode(s);
  let t = '';
  b.forEach(c => t += String.fromCharCode(c));
  return btoa(t);
};
export const fromBase64 = s => {
  const t = atob(s);
  const b = new Uint8Array(t.length);
  for (let i = 0; i < t.length; i++)
    b[i] = t.charCodeAt(i);
  return new TextDecoder().decode(b);
};
export const cleanText = (v, n) => String(v).replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

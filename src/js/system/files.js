/* ═══ system/files ═══
   Descarga, copia y codificación de archivos.
   Define: isStandalone, saveBlob, downloadFile, readTextFile, copyText, toBase64, fromBase64, cleanText  · acciones/registros: 1
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
/** Guarda un archivo en el móvil: en la app instalada, con «Compartir» (en el iPhone, «Guardar en Archivos»); si no, como
    descarga. `type`: su tipo (JSON si no se dice). Devuelve 'saved', 'declined' o 'fail'. */
export const downloadFile = async (name, data, type = 'application/json') => {
  if (isStandalone() && navigator.canShare && typeof File != 'undefined') {
    try {
      const f = new File([data], name, { type });
      if (navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f] });
        return 'saved';
      }
    }
    catch (e) {
      if (e && e.name == 'AbortError')
        return 'declined';
    }
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
export const copyText = async (t, el) => {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  }
  catch (e) {
    /* sin permiso para el portapapeles: se prueba el método alternativo */
  }
  try {
    if (el) {
      el.focus();
      el.select();
      el.setSelectionRange && el.setSelectionRange(0, t.length + 1);
    }
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

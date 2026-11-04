/* ═══ system/pdf ═══
   PDF hecho en el móvil, sin bibliotecas: páginas A4 con texto (Helvetica y Helvetica-Bold, las fuentes que trae todo lector
   de PDF, con los caracteres de Windows-1252: tildes, ñ, ¿, ¡, €…), rectángulos (también redondeados), líneas, polilíneas y
   círculos. Las medidas se dan desde la esquina de arriba a la izquierda, en puntos (1/72 de pulgada), y la página mide
   595 × 842. Lo usa el análisis mensual (profile/analysis, F-26 y T-15); se carga al usarlo y se apunta en core/lazy.
   Define: HELV, HELVB, WIN, NL, PAGE_W, PAGE_H, winByte, pdfText, glyphWidth, num, rgb, pdfDoc
*/
import { setPdfMaker } from '../core/lazy.js';
const HELV = '11611616322c22c37929b0bf14d14d18524811614d11611622c22c22c22c22c22c22c22c22c22c11611624824824822c3f729b29b2d22d229b26330a2d21161f429b22c3412d230a29b30a2d229b2632d229b3b029b29b2631161161161d522c14d22c22c1f422c22c11622c22c0de0de1f40de34122c22c22c22c14d1f411622c1f42d21f41f41f414e10414e24822c22c22c0de22c14d3e822c22c14d3e829b14d3e822c26322c22c0de0de14d14d15e22c3e814d3e81f414d3b022c1f429b11614d22c22c22c22c10422c14d2e117222c24814d2e114d19024814d14d14d22c21911614d14d16d22c34234234226329b29b29b29b29b29b3e82d229b29b29b29b1161161161162d22d230a30a30a30a30a24830a2d22d22d22d229b29b26322c22c22c22c22c22c3791f422c22c22c22c11611611611622c22c22c22c22c22c22c24826322c22c22c22c1f422c1f4';
const HELVB = '11614d1da22c22c3792d20ee14d14d18524811614d11611622c22c22c22c22c22c22c22c22c22c14d14d2482482482633cf2d22d22d22d229b26330a2d211622c2d22633412d230a29b30a2d229b2632d229b3b029b29b26314d11614d24822c14d22c26322c26322c14d26326311611622c11637926326326326318522c14d26322c30a22c22c1f418511818524822c22c22c11622c1f43e822c22c14d3e829b14d3e822c26322c22c1161161f41f415e22c3e814d3e822c14d3b022c1f429b11614d22c22c22c22c11822c14d2e117222c24814d2e114d19024814d14d14d26322c11614d14d16d22c3423423422632d22d22d22d22d22d23e82d229b29b29b29b1161161161162d22d230a30a30a30a30a24830a2d22d22d22d229b29b26322c22c22c22c22c22c37922c22c22c22c22c11611611611626326326326326326326324826326326326326322c26322c'; /* de Unicode a Windows-1252 (los 32 de 0x80 a 0x9F; de 0xA0 a 0xFF coinciden con Unicode) */
const WIN = { 8364: 128, 8218: 130, 402: 131, 8222: 132, 8230: 133, 8224: 134, 8225: 135, 710: 136, 8240: 137, 352: 138, 8249: 139, 338: 140, 381: 142, 8216: 145, 8217: 146, 8220: 147, 8221: 148, 8226: 149, 8211: 150, 8212: 151, 732: 152, 8482: 153, 353: 154, 8250: 155, 339: 156, 382: 158, 376: 159 };
/* fin de línea del archivo: CR LF (así cada entrada de la tabla de objetos mide los 20 bytes que pide el formato) */
const NL = '\r\n';
const PAGE_W = 595.28;
const PAGE_H = 841.89;
/** Código Windows-1252 de un carácter (63, «?», si no lo tiene). */
const winByte = ch => {
  const c = ch.codePointAt(0);
  if (c >= 32 && c < 127 || c >= 160 && c < 256)
    return c;
  return WIN[c] || (c == 8722 ? 45 : c == 8201 || c == 8239 || c == 160 ? 32 : 63);
};
/** Texto como cadena de un PDF: bytes de Windows-1252, con ( ) \ escapados. */
const pdfText = s => Array.from(String(s).replace(/[\r\n\t]+/g, ' '), ch => {
  const b = winByte(ch);
  return b == 40 || b == 41 || b == 92 ? '\\' + String.fromCharCode(b) : String.fromCharCode(b);
}).join('');
const glyphWidth = (b, bold) => parseInt((bold ? HELVB : HELV).substr((b - 32) * 3, 3), 16) || 556;
const num = v => (Math.round(v * 100) / 100).toString();
/** Color [r, g, b] de 0 a 255 (o '#rrggbb') como operandos de PDF (de 0 a 1). */
const rgb = c => {
  if (typeof c == 'string') {
    const m = /^#?([0-9a-f]{6})$/i.exec(c);
    c = m ? [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16)) : [0, 0, 0];
  }
  return c.map(v => num(Math.max(0, Math.min(255, v)) / 255)).join(' ');
};
/** Documento nuevo. Métodos: page(), text(), width(), wrap(), rect(), line(), poly(), circle(), count() y bytes(). */
const pdfDoc = (title = 'StrataFit') => {
  const pages = [];
  let cur = null;
  const op = s => {
    if (!cur)
      doc.page();
    cur.push(s);
  };
  const Y = y => num(PAGE_H - y);
  const doc = {
    W: PAGE_W,
    H: PAGE_H,
    /** Empieza una página nueva. */
    page() {
      cur = [];
      pages.push(cur);
      return doc;
    },
    /** Ancho de un texto, en puntos. */
    width(s, size = 10, bold = false) {
      let w = 0;
      for (const ch of String(s))
        w += glyphWidth(winByte(ch), bold);
      return w * size / 1000;
    },
    /** Parte un texto en líneas de como mucho `max` puntos (por palabras; una palabra más larga se corta). */
    wrap(s, max, size = 10, bold = false) {
      const out = [];
      let line = '';
      for (const w of String(s).split(/\s+/).filter(Boolean)) {
        const t = line ? line + ' ' + w : w;
        if (doc.width(t, size, bold) <= max) {
          line = t;
          continue;
        }
        if (line)
          out.push(line);
        line = w;
        while (doc.width(line, size, bold) > max && line.length > 1) {
          let k = line.length - 1;
          while (k > 1 && doc.width(line.slice(0, k), size, bold) > max)
            k--;
          out.push(line.slice(0, k));
          line = line.slice(k);
        }
      }
      if (line)
        out.push(line);
      return out;
    },
    /** Texto con su línea base en `y`. o: { size, bold, color, align: 'left' | 'center' | 'right' }. */
    text(x, y, s, o = {}) {
      const size = o.size || 10;
      const w = o.align == 'right' || o.align == 'center' ? doc.width(s, size, o.bold) : 0;
      const x0 = o.align == 'right' ? x - w : o.align == 'center' ? x - w / 2 : x;
      op('BT /' + (o.bold ? 'F2' : 'F1') + ' ' + num(size) + ' Tf ' + rgb(o.color || [17, 17, 17]) + ' rg ' + num(x0) + ' ' + Y(y) + ' Td (' + pdfText(s) + ') Tj ET');
    },
    /** Rectángulo. o: { fill, stroke, lw, r: radio de las esquinas }. */
    rect(x, y, w, h, o = {}) {
      const r = Math.min(o.r || 0, w / 2, h / 2);
      let p;
      if (r > 0) {
        const k = r * .5523;
        const L = x;
        const R = x + w;
        const T = y;
        const B = y + h;
        p = [num(L + r) + ' ' + Y(T) + ' m', num(R - r) + ' ' + Y(T) + ' l', num(R - r + k) + ' ' + Y(T) + ' ' + num(R) + ' ' + Y(T + r - k) + ' ' + num(R) + ' ' + Y(T + r) + ' c', num(R) + ' ' + Y(B - r) + ' l', num(R) + ' ' + Y(B - r + k) + ' ' + num(R - r + k) + ' ' + Y(B) + ' ' + num(R - r) + ' ' + Y(B) + ' c', num(L + r) + ' ' + Y(B) + ' l', num(L + r - k) + ' ' + Y(B) + ' ' + num(L) + ' ' + Y(B - r + k) + ' ' + num(L) + ' ' + Y(B - r) + ' c', num(L) + ' ' + Y(T + r) + ' l', num(L) + ' ' + Y(T + r - k) + ' ' + num(L + r - k) + ' ' + Y(T) + ' ' + num(L + r) + ' ' + Y(T) + ' c', 'h'].join(' ');
      }
      else
        p = num(x) + ' ' + Y(y + h) + ' ' + num(w) + ' ' + num(h) + ' re';
      op((o.fill ? rgb(o.fill) + ' rg ' : '') + (o.stroke ? rgb(o.stroke) + ' RG ' + num(o.lw || 1) + ' w ' : '') + p + ' ' + (o.fill && o.stroke ? 'B' : o.fill ? 'f' : 'S'));
    },
    /** Línea. o: { color, lw, dash }. */
    line(x1, y1, x2, y2, o = {}) {
      op(rgb(o.color || [200, 200, 205]) + ' RG ' + num(o.lw || 1) + ' w ' + (o.dash ? '[' + o.dash.join(' ') + '] 0 d ' : '') + num(x1) + ' ' + Y(y1) + ' m ' + num(x2) + ' ' + Y(y2) + ' l S' + (o.dash ? ' [] 0 d' : ''));
    },
    /** Polilínea por los puntos [[x, y], …], con las uniones redondeadas. */
    poly(pts, o = {}) {
      if (pts.length < 2)
        return;
      op('1 J 1 j ' + rgb(o.color || [17, 17, 17]) + ' RG ' + num(o.lw || 1.5) + ' w ' + pts.map((p, i) => num(p[0]) + ' ' + Y(p[1]) + (i ? ' l' : ' m')).join(' ') + ' S 0 J 0 j');
    },
    /** Círculo. o: { fill, stroke, lw }. */
    circle(cx, cy, r, o = {}) {
      const k = r * .5523;
      const p = [num(cx + r) + ' ' + Y(cy) + ' m', num(cx + r) + ' ' + Y(cy - k) + ' ' + num(cx + k) + ' ' + Y(cy - r) + ' ' + num(cx) + ' ' + Y(cy - r) + ' c', num(cx - k) + ' ' + Y(cy - r) + ' ' + num(cx - r) + ' ' + Y(cy - k) + ' ' + num(cx - r) + ' ' + Y(cy) + ' c', num(cx - r) + ' ' + Y(cy + k) + ' ' + num(cx - k) + ' ' + Y(cy + r) + ' ' + num(cx) + ' ' + Y(cy + r) + ' c', num(cx + k) + ' ' + Y(cy + r) + ' ' + num(cx + r) + ' ' + Y(cy + k) + ' ' + num(cx + r) + ' ' + Y(cy) + ' c'].join(' ');
      op((o.fill ? rgb(o.fill) + ' rg ' : '') + (o.stroke ? rgb(o.stroke) + ' RG ' + num(o.lw || 1) + ' w ' : '') + p + ' ' + (o.fill && o.stroke ? 'B' : o.fill ? 'f' : 'S'));
    },
    /** Número de páginas hasta ahora. */
    count: () => pages.length,
    /** El archivo PDF (Uint8Array). `foot(i, n)`: lo que se pinta al pie de cada página (se llama con la página, desde 0). */
    bytes(foot) {
      if (!pages.length)
        doc.page();
      if (foot)
        pages.forEach((p, i) => {
          cur = p;
          foot(i, pages.length);
        });
      /* título del documento en UTF-16 (admite cualquier carácter) */
      const t16 = Array.from(String(title), ch => {
        const c = ch.codePointAt(0);
        return c > 0xffff ? '003F' : c.toString(16).toUpperCase().padStart(4, '0');
      }).join('');
      const objs = [];
      const add = s => objs.push(s) && objs.length;
      add('<< /Type /Catalog /Pages 2 0 R >>');
      add('');
      add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const d = new Date();
      const pad = v => String(v).padStart(2, '0');
      add('<< /Title <FEFF' + t16 + '> /Producer (StrataFit) /CreationDate (D:' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + ') >>');
      const kids = [];
      for (const p of pages) {
        const c = p.join(NL);
        const ci = add('<< /Length ' + c.length + ' >>' + NL + 'stream' + NL + c + NL + 'endstream');
        kids.push(add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PAGE_W + ' ' + PAGE_H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + ci + ' 0 R >>'));
      }
      objs[1] = '<< /Type /Pages /Kids [' + kids.map(k => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
      let out = '%PDF-1.4' + NL + '%\xE2\xE3\xCF\xD3' + NL;
      const off = [];
      objs.forEach((o, i) => {
        off.push(out.length);
        out += (i + 1) + ' 0 obj' + NL + o + NL + 'endobj' + NL;
      });
      const xref = out.length;
      /* cada entrada de la tabla, 20 bytes: «0000000123 00000 n» y el fin de línea de dos caracteres */
      out += 'xref' + NL + '0 ' + (objs.length + 1) + NL + '0000000000 65535 f' + NL + off.map(o => String(o).padStart(10, '0') + ' 00000 n' + NL).join('') + 'trailer' + NL + '<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info 5 0 R >>' + NL + 'startxref' + NL + xref + NL + '%%EOF' + NL;
      const b = new Uint8Array(out.length);
      for (let i = 0; i < out.length; i++)
        b[i] = out.charCodeAt(i) & 255;
      return b;
    }
  };
  return doc;
};
setPdfMaker(pdfDoc);

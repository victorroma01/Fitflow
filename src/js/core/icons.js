/* ═══ core/icons ═══
   Mapa de iconos IC e icon()/groupIcon() (los iconos de cada función se añaden junto a ella).
   Define: IC, icon, groupIcon
*/
import { groupAnatomy } from '../extras/anatomy.js';
import { html, raw } from './html.js';
const IC = { workout: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>', nutri: '<path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M17 3c-2 2-3 5-3 8h3v10"/>', dash: '<path d="M5 20V10M12 20V4M19 20v-7"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', lib: '<path d="M4 5h16v4H4zM4 11h16v4H4zM4 17h16v3H4z"/>', prog: '<path d="M8 6h12M8 12h12M8 18h12M4 6h1M4 12h1M4 18h1"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', log: '<path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/>', reset: '<path d="M4 12a8 8 0 108-8M4 4v5h5"/>', camera: '<path d="M4 8h4l2-3h4l2 3h4v11H4z"/><circle cx="12" cy="13" r="3.5"/>', CrossFit: '<circle cx="12" cy="14" r="6"/><path d="M8 9a4 4 0 018 0"/>', Hyrox: '<path d="M3 17h18M6 17V9h8v8M14 12h5"/>', Funcional: '<path d="M12 3v18M3 12h18M7 7l10 10M17 7L7 17"/>', Cardio: '<path d="M3 12h4l2-5 4 10 2-5h6"/>', Propio: '<path d="M12 5v14M5 12h14"/>' };
export const icon = (n, s) => html`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${raw(IC[n])}</svg>`;
export const groupIcon = (g, s) => IC[g] ? html`<span style="display:grid;place-items:center;height:${s}px">${icon(g, s * .6)}</span>` : groupAnatomy(g, s);
IC.prv = '<path d="M6 5v14M19 5L9 12l10 7z"/>';
IC.nxt = '<path d="M18 5v14M5 5l10 7-10 7z"/>';
IC.pau = '<path d="M8 5v14M16 5v14" stroke-width="3"/>';
IC.ply = '<path d="M7 5l12 7-12 7z"/>';
IC.swp = '<path d="M8 20V4M4 8l4-4 4 4M16 4v16M12 16l4 4 4-4"/>';
IC.chev = '<path d="M6 9l6 6 6-6"/>';
IC.chk = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';
IC.x = '<path d="M6 6l12 12M18 6L6 18"/>';
IC.timer = '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>';
IC.pulse = '<path d="M3 12h4l2-6 4 12 2-6h6"/>';
IC.ruler = '<path d="M3 17L17 3l4 4L7 21zM8 12l2 2M11 9l2 2M14 6l2 2"/>';
IC.trf = '<path d="M8 4h8v5a4 4 0 01-8 0zM8 6H4v2a3 3 0 003 3M16 6h4v2a3 3 0 01-3 3M12 13v4M8 21h8M10 17h4"/>';
IC.dwn = '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>';
IC.scan = '<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10"/>';
IC.shr = '<path d="M12 15V3M8 7l4-4 4 4M5 12v8h14v-8"/>';
IC.globe = '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>';
IC.trnd = '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>';
/* v1.24: Nutrición (Mi nutrición, botones de comida), Perfil y Ajustes */
IC.fk = '<g transform="rotate(-42 12 12)"><path d="M9.6 2.6v5.2a2.4 2.4 0 0 0 4.8 0V2.6M12 2.6v4.8M12 10.2v11.2"/></g><g transform="rotate(42 12 12)"><path d="M13.4 2.4v9.8h-3.3c0-4.4 1.2-7.5 3.3-9.8zM11.8 12.2v9.2"/></g>';
IC.plus = '<path d="M12 5v14M5 12h14"/>';
IC.bkm = '<path d="M7.5 3.5h9a1 1 0 0 1 1 1V20.5l-5.5-3.8-5.5 3.8V4.5a1 1 0 0 1 1-1z"/>';
IC.srch = '<circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.5 15.5l4.5 4.5"/>';
IC.bar = '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M8 8.5v7M10.6 8.5v7M13.2 8.5v7M16 8.5v7" stroke-width="1.6"/>';
IC.tgt = '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>';
IC.moon = '<path d="M19.5 14.6A8 8 0 0 1 9.4 4.5 8 8 0 1 0 19.5 14.6z"/>';
IC.chr = '<path d="M9.5 5.5l6.5 6.5-6.5 6.5"/>';
IC.idc = '<rect x="3" y="5" width="18" height="14" rx="2.6"/><circle cx="9" cy="10.8" r="2.1"/><path d="M5.9 16c.6-1.5 1.7-2.3 3.1-2.3s2.5.8 3.1 2.3M14.6 10h3.8M14.6 13.4h2.8"/>';
IC.bio = '<path d="M12 20.2s-7.6-4.5-7.6-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.6 2.3c0 5.8-7.6 10.3-7.6 10.3z"/><path d="M7.4 12.4h2.4l1.3-2.3 1.8 4.4 1.3-2.1h2.4"/>';
IC.gear = '<circle cx="12" cy="12" r="3.1"/><path d="M12 3.2v2.5M12 18.3v2.5M3.2 12h2.5M18.3 12h2.5M5.8 5.8l1.8 1.8M16.4 16.4l1.8 1.8M5.8 18.2l1.8-1.8M16.4 7.6l1.8-1.8"/><circle cx="12" cy="12" r="6.6"/>';
IC.pal = '<path d="M12 3.6a8.4 8.4 0 1 0 0 16.8c1.3 0 1.9-.9 1.6-1.9-.4-1.3.5-2.6 1.9-2.6h1.6a3.3 3.3 0 0 0 3.3-3.3c0-5-3.9-9-8.4-9z"/><circle cx="7.9" cy="11.2" r="1.1" fill="currentColor"/><circle cx="10.4" cy="7.7" r="1.1" fill="currentColor"/><circle cx="14.8" cy="7.9" r="1.1" fill="currentColor"/>';
IC.kgw = '<path d="M9.2 7.4a2.8 2.8 0 1 1 5.6 0"/><path d="M5.4 8.6h13.2l1.7 11.4H3.7z"/><path d="M9.6 15.6h4.8"/>';
IC.snd = '<path d="M4 9.6h3.4L12 5.6v12.8l-4.6-4H4z"/><path d="M15.4 9.1a4 4 0 0 1 0 5.8M17.9 6.6a7.6 7.6 0 0 1 0 10.8"/>';
IC.bkp = '<path d="M7.2 18.6h9.9a3.9 3.9 0 0 0 .5-7.8 5.9 5.9 0 0 0-11.3-1.3 4.6 4.6 0 0 0 .9 9.1z"/><path d="M12 16.2v-5.1M9.9 13.1L12 11l2.1 2.1"/>';
IC.del = '<path d="M4.5 7h15M9.6 7V4.6h4.8V7M6.6 7l1 13h8.8l1-13M10.2 11v5.4M13.8 11v5.4"/>';
IC.upd = '<path d="M19.4 12a7.4 7.4 0 0 1-13.2 4.6M4.6 12a7.4 7.4 0 0 1 13.2-4.6"/><path d="M18.4 3.6v4.1h-4.1M5.6 20.4v-4.1h4.1"/>';
IC.shd = '<path d="M12 3l7.4 2.9v5.6c0 4.6-3.2 8-7.4 9.5-4.2-1.5-7.4-4.9-7.4-9.5V5.9z"/><path d="M12 10.6v5M12 7.9v.1"/>';
IC.doc = '<path d="M6.6 3h7.8l4 4v13a1 1 0 0 1-1 1H6.6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14.4 3v4h4M8.8 12.4h6.4M8.8 16h6.4"/>';
IC.drop = '<path d="M12 3.4c3.1 3.7 6.1 7 6.1 10.6a6.1 6.1 0 0 1-12.2 0c0-3.6 3-6.9 6.1-10.6z"/><path d="M9.2 14.6a2.9 2.9 0 0 0 2.4 2.6"/>';
IC.bug = '<path d="M8.4 9.6a3.6 3.6 0 0 1 7.2 0"/><rect x="7" y="9.6" width="10" height="10.4" rx="5"/><path d="M12 13v7M3.8 13.4H7M17 13.4h3.2M4.6 8.6l2.6 1.8M19.4 8.6l-2.6 1.8M4.6 19l2.8-1.8M19.4 19l-2.8-1.8M9.6 4.6l1 1.8M14.4 4.6l-1 1.8"/>';

/* ═══ core/icons ═══
   Mapa de iconos IC e icon()/groupIcon() (los iconos de cada función se añaden junto a ella).
   Define: IC, icon, groupIcon
*/
const IC = { workout: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>', nutri: '<path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M17 3c-2 2-3 5-3 8h3v10"/>', dash: '<path d="M5 20V10M12 20V4M19 20v-7"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', lib: '<path d="M4 5h16v4H4zM4 11h16v4H4zM4 17h16v3H4z"/>', prog: '<path d="M8 6h12M8 12h12M8 18h12M4 6h1M4 12h1M4 18h1"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', log: '<path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/>', reset: '<path d="M4 12a8 8 0 108-8M4 4v5h5"/>', camera: '<path d="M4 8h4l2-3h4l2 3h4v11H4z"/><circle cx="12" cy="13" r="3.5"/>', CrossFit: '<circle cx="12" cy="14" r="6"/><path d="M8 9a4 4 0 018 0"/>', Hyrox: '<path d="M3 17h18M6 17V9h8v8M14 12h5"/>', Funcional: '<path d="M12 3v18M3 12h18M7 7l10 10M17 7L7 17"/>', Cardio: '<path d="M3 12h4l2-5 4 10 2-5h6"/>', Propio: '<path d="M12 5v14M5 12h14"/>' };
const icon = (n, s) => '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + IC[n] + '</svg>';
const groupIcon = (g, s) => IC[g] ? '<span style="display:grid;place-items:center;height:' + s + 'px">' + icon(g, s * .6) + '</span>' : groupAnatomy(g, s);
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

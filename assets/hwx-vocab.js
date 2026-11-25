/* HelloWorld hub: the vocabulary, icons and generated art (window.HWX, part one).
   Everything here comes from window.HW_CONFIG (assets/hub-config.js) or is drawn from brand assets
   only. No network, no DOM writes, no storage. Load after hub-config.js, before hwx-data.js.

   API
   Vocabulary (arrays are ordered; maps are Object.create(null), id -> the same object):
     HWX.CATS   [{id, label, blurb, stage, icon}]   categories in line order (stage by stage)
     HWX.CAT    map;  HWX.cat(id) -> category, or the "Not sorted yet" stand-in (id '_none')
     HWX.STAGES [{id, n, label, blurb, icon, cats: [ids]}]   Idea to live, in order
     HWX.STAGE  map;  HWX.stage(id);  HWX.stageOf(catId) -> stage or null
     HWX.KINDS  [{id, label, plural, size 1-3, form, explain, demo, icon, motif}]
     HWX.KIND   map;  HWX.kind(id) -> kind or a blank stand-in;  HWX.KIND_ORDER [ids];  HWX.kindCount(id) -> size
     HWX.AUD    [{id, label}];  HWX.AUDIENCE map;  HWX.aud(id)
     HWX.STATUSES [{id, label}];  HWX.STATUS map;  HWX.status(id)
     HWX.LEVELS [{id, label}]   overview, built, code
     HWX.PLATFORMS  name -> one-line explanation;  HWX.platform(name) -> {name, text} or null (any case)
     HWX.TERMS  [{term, text}]  the glossary;  HWX.LANG_WORDS  language -> plain words
     HWX.own(obj, key)
   Icons (24 x 24 line icons, stroke 2, round ends; filled where noted):
     HWX.ICON   name -> inner SVG markup
     HWX.icon(name, {size, cls, label, stroke}) -> '<svg ...>' (aria-hidden unless a label is given)
     HWX.svg(inner, opts) -> the same wrapper round any markup
     HWX.catIcon(id, opts), HWX.stageIcon(id, opts), HWX.kindIcon(id, opts)
   Art:
     HWX.hash(str) -> uint32;  HWX.rand(seed) -> function () -> [0, 1)
     HWX.shade(hex, amount -1..1) -> hex (negative darker);  HWX.mix(hexA, hexB, t) -> hex
     HWX.cubeSVG(kind | colour, {n, size, cls}) -> eye-pill glyph for a kind (1 to 3 pills by size)
     HWX.rowIcon(info, opts) -> the kind's icon for a list row
     HWX.botSVG({head, eye, cls, label}) -> the static bot mark
     HWX.coverSVG(info, {titled, label, cls}) -> generated cover art (brief 14.5), an SVG string
       with viewBox 0 0 1600 1000 that fills its box (16:10). Deterministic by repo name; text-free
       unless titled. Classes for hover life: hwx-cv, hwx-cv-card, hwx-cv-bot, hwx-cv-eyes, hwx-cv-pill.
     HWX.COVER_GROUNDS, HWX.coverGround(category) -> {id, from, to, pill, line, eye, dark} */
(function () {
  'use strict';

  var CFG = window.HW_CONFIG || {};
  var HWX = window.HWX = window.HWX || {};
  var hasOwn = Object.prototype.hasOwnProperty;
  function own(o, k) { return o != null && typeof k === 'string' && hasOwn.call(o, k); }
  function map() { return Object.create(null); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function entries(o) { var out = []; for (var k in o) if (own(o, k)) out.push([k, o[k]]); return out; }
  HWX.own = own;

  /* ---------- icons ---------- */
  var F = ' fill="currentColor" stroke="none"';
  var ICON = {
    // general
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'arrow-left': '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-up': '<path d="m18 15-6-6-6 6"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    github: '<path' + F + ' d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/>',
    play: '<path' + F + ' d="M7 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L8.5 4.64A1 1 0 0 0 7 5.5Z"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    code: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    guide: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    list: '<path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    map: '<path d="M14.11 5.55a2 2 0 0 0 1.78 0l3.66-1.83A1 1 0 0 1 21 4.62v12.76a1 1 0 0 1-.55.9l-4.56 2.27a2 2 0 0 1-1.78 0l-4.22-2.1a2 2 0 0 0-1.78 0l-3.66 1.83A1 1 0 0 1 3 19.38V6.62a1 1 0 0 1 .55-.9l4.56-2.27a2 2 0 0 1 1.78 0z"/><path d="M15 5.76v15"/><path d="M9 3.24v15"/>',
    city: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    line: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    connect: '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.5 6h9"/><path d="m6.3 8.2 4.4 7.6"/><path d="m17.7 8.2-4.4 7.6"/>',
    discover: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.8 5.41a2 2 0 0 1-1.27 1.27L7.76 16.24l1.8-5.41a2 2 0 0 1 1.27-1.27z"/>',
    news: '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/><path d="M19 3v4"/><path d="M21 5h-4"/>',
    filter: '<path d="M10 20a1 1 0 0 0 .55.9l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .52-1.34L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.74 1.67l7.22 7.99A2 2 0 0 1 10 14z"/>',
    sort: '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"' + F + '/>',
    layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
    walk: '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>',
    tour: '<path d="M12 13v8"/><path d="M12 3v3"/><path d="M4 6a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h13a2 2 0 0 0 1.15-.37l3.42-2.31a1 1 0 0 0 0-1.64l-3.42-2.31A2 2 0 0 0 17 6z"/>',
    eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.58 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    branch: '<path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
    commit: '<circle cx="12" cy="12" r="3"/><path d="M3 12h6"/><path d="M15 12h6"/>',
    issue: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1.5"' + F + '/>',
    activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
    expand: '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/>',
    // kinds
    'web-app': '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    website: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20"/><path d="M6 6.5h.01"/><path d="M9 6.5h.01"/>',
    plugin: '<path d="M15.39 4.39a1 1 0 0 0 1.68-.47 2.5 2.5 0 1 1 3.01 3.01 1 1 0 0 0-.47 1.68l1.68 1.68a2.41 2.41 0 0 1 0 3.42l-1.68 1.68a1 1 0 0 1-1.68-.47 2.5 2.5 0 1 0-3.01 3.01 1 1 0 0 1 .47 1.68l-1.68 1.68a2.41 2.41 0 0 1-3.42 0l-1.68-1.68a1 1 0 0 0-1.68.47 2.5 2.5 0 1 1-3.01-3.01 1 1 0 0 0 .47-1.68l-1.68-1.68a2.41 2.41 0 0 1 0-3.42l1.68-1.68a1 1 0 0 1 1.68.47 2.5 2.5 0 1 0 3.01-3.01 1 1 0 0 1-.47-1.68l1.68-1.68a2.41 2.41 0 0 1 3.42 0z"/>',
    theme: '<path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2.5a1.5 1.5 0 0 0-1.06 2.56A1.5 1.5 0 0 1 12 22Z"/><circle cx="7.5" cy="11.5" r="1"' + F + '/><circle cx="10.5" cy="7" r="1"' + F + '/><circle cx="15.5" cy="7.5" r="1"' + F + '/>',
    game: '<path d="M6 11h4"/><path d="M8 9v4"/><path d="M15 12h.01"/><path d="M18 10h.01"/><path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.55-.6-6.58-.69-7.26A4 4 0 0 0 17.32 5z"/>',
    mobile: '<rect width="14" height="20" x="5" y="2" rx="3"/><path d="M10.5 5.5h3"/><path d="M12 18h.01"/>',
    library: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.7 4.73a2 2 0 0 0 2 0L20.7 7"/>',
    scripts: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m6 9 3 3-3 3"/><path d="M12 15h5"/>',
    docs: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    template: '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/>',
    // categories
    products: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    client: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    websites: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    wordpress: '<path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="10" y="6" rx="1"/>',
    ai: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
    games: '<path d="M6 11h4"/><path d="M8 9v4"/><path d="M15 12h.01"/><path d="M18 10h.01"/><path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.55-.6-6.58-.69-7.26A4 4 0 0 0 17.32 5z"/>',
    tools: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    ops: '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/><path d="M10 6h8"/><path d="M10 18h8"/>',
    labs: '<path d="M10 2v7.53a2 2 0 0 1-.21.9L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.07-10.13A2 2 0 0 1 14 9.53V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
    unsorted: '<circle cx="12" cy="12" r="9" stroke-dasharray="3.2 3.2"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    // stages (Idea to live): the config names these spark, build, ship, run
    spark: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    build: '<rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3"/>',
    ship: '<path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.02.94l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/>',
    run: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'
  };
  HWX.ICON = ICON;

  function svg(inner, o) {
    o = o || {};
    var size = typeof o.size === 'number' && o.size > 0 && o.size < 1000 ? ' width="' + o.size + '" height="' + o.size + '"' : '';
    var sw = typeof o.stroke === 'number' && o.stroke > 0 && o.stroke < 6 ? o.stroke : 2;
    var a11y = o.label ? ' role="img" aria-label="' + esc(o.label) + '"' : ' aria-hidden="true" focusable="false"';
    return '<svg class="hwx-ico' + (o.cls ? ' ' + esc(o.cls) : '') + '" viewBox="0 0 24 24"' + size + ' fill="none" stroke="currentColor" stroke-width="' + sw +
      '" stroke-linecap="round" stroke-linejoin="round"' + a11y + '>' + (o.label ? '<title>' + esc(o.label) + '</title>' : '') + inner + '</svg>';
  }
  function icon(name, o) { return svg(own(ICON, name) ? ICON[name] : ICON.unsorted, o); }
  HWX.svg = svg;
  HWX.icon = icon;

  /* ---------- vocabulary from the config ---------- */
  var catsCfg = CFG.categories || {}, blurbs = CFG.category_blurbs || {}, stagesCfg = CFG.stages || {};
  var STAGES = [], STAGE = map(), CATS = [], CAT = map(), stageOfCat = map();
  entries(stagesCfg).forEach(function (e, i) {
    var s = e[1] || {};
    var st = { id: e[0], n: i + 1, label: String(s.label || e[0]), blurb: String(s.blurb || ''),
      icon: own(ICON, s.icon) ? s.icon : 'spark', cats: (Array.isArray(s.categories) ? s.categories : []).filter(function (c) { return own(catsCfg, c); }) };
    STAGES.push(st); STAGE[st.id] = st;
    st.cats.forEach(function (c) { if (!stageOfCat[c]) stageOfCat[c] = st.id; });
  });
  function addCat(id) {
    if (CAT[id]) return;
    var c = { id: id, label: String(catsCfg[id]), blurb: own(blurbs, id) ? String(blurbs[id]) : '', stage: stageOfCat[id] || null, icon: own(ICON, id) ? id : 'unsorted' };
    CATS.push(c); CAT[id] = c;
  }
  STAGES.forEach(function (s) { s.cats.forEach(addCat); });
  Object.keys(catsCfg).forEach(addCat);
  var CAT_NONE = { id: '_none', label: 'Not sorted yet', blurb: 'Projects whose card has no category yet.', stage: null, icon: 'unsorted' };

  var kindsCfg = CFG.kinds || {}, kd = CFG.kind_details || {}, demoKinds = CFG.demo_kinds || [];
  var MOTIF = { 'web-app': 'dashboard', website: 'answer', plugin: 'library', theme: 'library', template: 'library',
    library: 'code', scripts: 'code', docs: 'document', game: 'game', mobile: 'mobile' };
  var KINDS = [], KIND = map();
  Object.keys(kindsCfg).forEach(function (id) {
    var d = own(kd, id) && kd[id] ? kd[id] : {};
    var size = Math.max(1, Math.min(3, Math.round(Number(d.size) || 1)));
    var k = { id: id, label: String(kindsCfg[id]), plural: String(d.plural || kindsCfg[id]), size: size, form: String(d.form || ''),
      explain: String(d.explain || ''), demo: demoKinds.indexOf(id) >= 0, icon: own(ICON, id) ? id : 'file', motif: own(MOTIF, id) ? MOTIF[id] : 'answer' };
    KINDS.push(k); KIND[id] = k;
  });
  var KIND_NONE = { id: '', label: '', plural: '', size: 1, form: '', explain: '', demo: false, icon: 'file', motif: 'answer' };

  var AUD = [], AUDIENCE = map();
  entries(CFG.audiences || {}).forEach(function (e) { var a = { id: e[0], label: String(e[1]) }; AUD.push(a); AUDIENCE[a.id] = a; });
  var STATUSES = [], STATUS = map();
  entries(CFG.statuses || {}).forEach(function (e) { var s = { id: e[0], label: String(e[1]) }; STATUSES.push(s); STATUS[s.id] = s; });

  var PLATFORMS = map(), platLower = map();
  entries(CFG.platforms || {}).forEach(function (e) { PLATFORMS[e[0]] = String(e[1]); platLower[e[0].toLowerCase()] = e[0]; });
  var TERMS = entries(CFG.terms || {}).map(function (e) { return { term: e[0], text: String(e[1]) }; });

  HWX.CATS = CATS; HWX.CAT = CAT; HWX.CAT_NONE = CAT_NONE;
  HWX.cat = function (id) { return own(CAT, id) ? CAT[id] : CAT_NONE; };
  HWX.STAGES = STAGES; HWX.STAGE = STAGE;
  HWX.stage = function (id) { return own(STAGE, id) ? STAGE[id] : null; };
  HWX.stageOf = function (catId) { return own(stageOfCat, catId) ? STAGE[stageOfCat[catId]] : null; };
  HWX.KINDS = KINDS; HWX.KIND = KIND; HWX.KIND_ORDER = KINDS.map(function (k) { return k.id; });
  HWX.kind = function (id) { return own(KIND, id) ? KIND[id] : KIND_NONE; };
  HWX.kindCount = function (id) { return HWX.kind(id).size; };
  HWX.AUD = AUD; HWX.AUDIENCE = AUDIENCE;
  HWX.aud = function (id) { return own(AUDIENCE, id) ? AUDIENCE[id] : null; };
  HWX.STATUSES = STATUSES; HWX.STATUS = STATUS;
  HWX.status = function (id) { return own(STATUS, id) ? STATUS[id] : null; };
  HWX.LEVELS = [{ id: 'overview', label: 'Overview' }, { id: 'built', label: 'How it\u2019s built' }, { id: 'code', label: 'Code' }];
  HWX.PLATFORMS = PLATFORMS;
  HWX.platform = function (name) {
    if (typeof name !== 'string') return null;
    var k = own(PLATFORMS, name) ? name : (own(platLower, name.toLowerCase()) ? platLower[name.toLowerCase()] : null);
    return k ? { name: k, text: PLATFORMS[k] } : null;
  };
  HWX.TERMS = TERMS;
  // Plain words for the languages GitHub reports, for "How it's built".
  var LANG_WORDS = map();
  [['JavaScript', 'Makes web pages do things; also runs servers.'], ['TypeScript', 'JavaScript with types, checked before it runs.'],
    ['HTML', 'The structure of a web page.'], ['CSS', 'How a web page looks.'], ['SCSS', 'CSS with extras, turned into CSS when built.'],
    ['Python', 'A general language, often for scripts, data and AI.'], ['PHP', 'Runs on the server; WordPress is written in it.'],
    ['Shell', 'Commands for the computer\u2019s terminal.'], ['Svelte', 'Interface components that compile to plain JavaScript.'],
    ['Vue', 'Interface components for web apps.'], ['Astro', 'Pages built ahead of time, with little JavaScript sent.'],
    ['Swift', 'Apps for iPhone, iPad and Mac.'], ['Kotlin', 'Apps for Android.'], ['Dart', 'The language of Flutter apps.'],
    ['Go', 'Fast server programs and tools.'], ['Rust', 'Fast, careful programs and tools.'], ['Java', 'Servers and Android apps.'],
    ['C#', 'Windows apps, servers and games.'], ['Ruby', 'Web servers and scripts.'], ['Lua', 'Small scripts inside games and tools.'],
    ['GLSL', 'Programs that run on the graphics card.'], ['Dockerfile', 'Instructions to package an app with what it needs.'],
    ['MDX', 'Writing in Markdown with components inside.'], ['Jupyter Notebook', 'Code, notes and results kept together.'],
    ['PowerShell', 'Commands for Windows.'], ['Batchfile', 'Commands for Windows.'], ['Makefile', 'Steps to build a project.']
  ].forEach(function (p) { LANG_WORDS[p[0]] = p[1]; });
  HWX.LANG_WORDS = LANG_WORDS;

  HWX.catIcon = function (id, o) { return icon(HWX.cat(id).icon, o); };
  HWX.stageIcon = function (id, o) { var s = HWX.stage(id); return icon(s ? s.icon : 'spark', o); };
  HWX.kindIcon = function (id, o) { return icon(HWX.kind(id).icon, o); };

  /* ---------- art helpers ---------- */
  function hash(s) { s = String(s == null ? '' : s); var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rand(seed) {
    var a = (typeof seed === 'number' ? seed : hash(seed)) | 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function rgb(hex) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return [109, 68, 224];
    var h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function hex(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); t = Math.max(0, Math.min(1, Number(t) || 0)); return hex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; })); }
  // Darker toward Void (the brand's darkest), lighter toward white: stays inside the palette's family.
  function shade(c, amt) { amt = Math.max(-1, Math.min(1, Number(amt) || 0)); return amt < 0 ? mix(c, '#15121d', -amt) : mix(c, '#ffffff', amt); }
  HWX.hash = hash; HWX.rand = rand; HWX.mix = mix; HWX.shade = shade;

  // A kind's glyph: eye pills (the brand's only shape), one to three by the kind's size.
  function cubeSVG(what, o) {
    o = o || {};
    var k = typeof what === 'string' && own(KIND, what) ? KIND[what] : null;
    var n = Math.max(1, Math.min(3, Math.round(o.n || (k ? k.size : 1))));
    var colour = typeof what === 'string' && /^#[0-9a-f]{3,6}$/i.test(what) ? what : (o.colour && /^#[0-9a-f]{3,6}$/i.test(o.colour) ? o.colour : 'currentColor');
    var shapes = { 1: [[9, 3.5, 6, 15]], 2: [[5.6, 4.5, 5.2, 13], [13.2, 4.5, 5.2, 13]], 3: [[2.6, 7, 4.8, 12], [9.6, 3, 4.8, 12], [16.6, 7, 4.8, 12]] }[n];
    var size = typeof o.size === 'number' && o.size > 0 && o.size < 1000 ? ' width="' + o.size + '" height="' + o.size + '"' : '';
    return '<svg class="hwx-glyph' + (o.cls ? ' ' + esc(o.cls) : '') + '" viewBox="0 0 24 24"' + size + ' aria-hidden="true" focusable="false">' +
      shapes.map(function (s, i) { return '<rect x="' + s[0] + '" y="' + s[1] + '" width="' + s[2] + '" height="' + s[3] + '" rx="' + s[2] / 2 + '" fill="' + colour + '"' + (n === 3 && i !== 1 ? ' fill-opacity=".55"' : '') + '/>'; }).join('') + '</svg>';
  }
  HWX.cubeSVG = cubeSVG;
  HWX.rowIcon = function (info, o) { return HWX.kindIcon(info && info.kind, Object.assign({ cls: 'hwx-row-ico' }, o || {})); };

  /* ---------- the bot mark (brand asset: assets/brand/bot-mark-*.svg) ---------- */
  var BOT = {
    head: 'M131.3,279.4c-6.6.5-11.2-4.1-11.2-10.6v-34.4c0,0-.6-3.4-.6-3.4h-12.8c0-.1-12.6-1.5-12.6-1.5-31.7-5-58.7-27.8-69.3-58.1-.6-1.6-.7-3.3-2.7-3.6-14.5-2.1-24.1-15.3-21.7-30.3,1.4-8.8,8.4-16.9,17.3-19.7,2.2-.7,4.3-1.2,6.3-2.1,9.9-31.1,36.6-54.9,68.5-60.5,1.8-.4,4.5-1.1,6.4-1.1l46.7-.3v-16.9c-9.6-4.5-13.4-12.7-11.3-23.1,1.3-6.2,7.8-12.5,14-13.4,2.9-.4,6.4-.6,9.3,0,18.1,4.4,19.4,29.9,2.2,36.3v17.1s47.3.2,47.3.2l4.5,1c32.6,5,60.1,29.6,70.1,61l5,1.3c26.5,7.1,25.2,45.2-1.7,50.2-1,.1-3.2.7-3.5,1.6-3.3,10.8-8.6,20-15.6,28.7-13.9,17.1-33.2,28.4-55.1,31.8l-12.1,1.3-11.8.3-49.3,46c-1.8,1.7-4.1,2.2-6.3,2.3h0ZM209,208.4c27.2-4.7,49.3-26.7,54.2-53.5l1.1-6.5c1.2-5.8-.3-13.2-1.2-19l-.9-4.6-1-3.7c-1.6-6.2-5.2-11.9-8.8-17.2-11.5-16-29.6-26.7-49.2-28.6h-100.2c-2.7,0-5.8.8-8.3,1.3-34.3,6.8-58.6,41.4-52.6,76,4,27.7,27.2,52.1,55.1,55.9l10.7,1.2,25,.3c5.1,0,8.4,5.2,8.5,10l.3,24.3c2.7-2.4,8.4-7.6,11-10.1l21.5-19.9c1.9-1.8,4-4.2,6.7-4.3l17.4-.3,10.9-1.3h0Z',
    e1: 'M128.3,158.4c-.3,6.2-5.9,10.2-11.1,10.2-6.6,0-11.3-4.6-11.5-11.4-.3-12.1-.5-24.2,0-36.3.3-6.1,6.2-10.2,11.4-10.2,5.9.1,10.9,4.6,11.1,11.1.4,12.1.5,24.2,0,36.5h0Z',
    e2: 'M200.2,159.3c-1.5,7-7.6,10.6-14.5,8.9-3.4-1.4-7.7-4.9-7.7-9.2l-.2-35.9c0-6.4,3.9-11.5,10.3-12.3,5.2-.6,12,3.5,12,9.7l.2,38.8h0Z'
  };
  HWX.BOT = BOT;
  function botInner(head, eye) {
    return '<g transform="translate(0 13.2)"><path fill="' + head + '" d="' + BOT.head + '"/><g class="hwx-cv-eyes"><path fill="' + eye + '" d="' + BOT.e1 + '"/><path fill="' + eye + '" d="' + BOT.e2 + '"/></g></g>';
  }
  HWX.botSVG = function (o) {
    o = o || {};
    var head = /^(#[0-9a-f]{3,8}|currentColor)$/i.test(o.head || '') ? o.head : 'currentColor';
    var eye = /^(#[0-9a-f]{3,8}|currentColor)$/i.test(o.eye || '') ? o.eye : '#6d44e0';
    var a11y = o.label ? ' role="img" aria-label="' + esc(o.label) + '"' : ' aria-hidden="true" focusable="false"';
    return '<svg class="hw-botmark' + (o.cls ? ' ' + esc(o.cls) : '') + '" viewBox="0 0 306 306"' + a11y + '>' + botInner(head, eye) + '</svg>';
  };

  /* ---------- generated cover art (brand brief 14.5; the site's recipe in site/cover.js) ----------
     1600 x 1000: a white card (853 x 533, radius 35) on one of the four brand grounds, a motif by
     kind drawn in rounded bars, the bot perched on the card's top-right corner with lilac eyes,
     one filled eye pill off a top corner and one outline pill off the bottom edge. Pill side, card
     tilt and bot angle come from the repo name's hash, so the covers in a grid differ. */
  var W = 1600, H = 1000;
  var GROUNDS = {
    violet: { id: 'violet', from: '#6d44e0', to: '#4a2bb0', stretch: 1, pill: 'rgba(255,255,255,.14)', line: 'rgba(255,255,255,.22)', eye: '#ffffff', chip: 'rgba(255,255,255,.16)', dark: false },
    dark: { id: 'dark', from: '#1b1726', to: '#15121d', stretch: 1, pill: 'rgba(169,139,255,.16)', line: 'rgba(169,139,255,.30)', eye: '#a98bff', chip: 'rgba(169,139,255,.18)', dark: true },
    deep: { id: 'deep', from: '#4a2bb0', to: '#2a1656', stretch: 1, pill: 'rgba(169,139,255,.18)', line: 'rgba(255,255,255,.20)', eye: '#a98bff', chip: 'rgba(255,255,255,.14)', dark: false },
    ink: { id: 'ink', from: '#262430', to: '#4a2bb0', stretch: 1.2, pill: 'rgba(109,68,224,.30)', line: 'rgba(169,139,255,.30)', eye: '#a98bff', chip: 'rgba(255,255,255,.14)', dark: false }
  };
  // Ground by category (the brief's proposal): products, websites, AI violet; tools, ops dark;
  // client, WordPress deep; games, labs ink to violet. Anything else: violet.
  var GROUND_BY_CAT = { products: 'violet', websites: 'violet', ai: 'violet', tools: 'dark', ops: 'dark', client: 'deep', wordpress: 'deep', games: 'ink', labs: 'ink' };
  HWX.COVER_GROUNDS = GROUNDS;
  HWX.coverGround = function (cat) { return GROUNDS[own(GROUND_BY_CAT, cat) ? GROUND_BY_CAT[cat] : 'violet']; };

  var PAL_LIGHT = { card: '#ffffff', ink: '#262430', acc: '#6d44e0', soft: 'rgba(109,68,224,.12)', good: '#16a34a', bad: '#a23b3b', amber: '#f59e0b' };
  var PAL_DARK = { card: '#211c2e', ink: '#f2f0f8', acc: '#a98bff', soft: 'rgba(169,139,255,.16)', good: '#4ade80', bad: '#f87171', amber: '#fbbf24' };

  // Each motif draws inside the 640 x 400 card. ink = text bars, acc = the accent, soft = accent tint.
  function motif(m, c) {
    var L = function (x, y, w, o, h) { o = o == null ? 1 : o; h = h || 12; return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + h / 2 + '" fill="' + c.ink + '" fill-opacity="' + o + '"/>'; };
    var A = function (x, y, w, h) { h = h || 12; return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + h / 2 + '" fill="' + c.acc + '"/>'; };
    var S = function (x, y, w, h, r) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r == null ? 10 : r) + '" fill="' + c.soft + '"/>'; };
    var dot = function (x, y, r, f, o) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + f + '"' + (o != null ? ' fill-opacity="' + o + '"' : '') + '/>'; };
    var tick = function (x, y, ok) {
      var col = ok ? c.good : c.bad;
      return dot(x, y, 13, col, 0.18) + '<path d="' + (ok ? 'M' + (x - 6) + ' ' + y + ' l4 4 l8 -9' : 'M' + (x - 5) + ' ' + (y - 5) + ' l10 10 M' + (x + 5) + ' ' + (y - 5) + ' l-10 10') +
        '" stroke="' + col + '" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    };
    var out = '', i, r, k;
    switch (m) {
      case 'dashboard':
        return S(40, 40, 260, 150) + S(320, 40, 280, 150) + S(40, 210, 560, 150) +
          '<circle cx="170" cy="125" r="52" fill="none" stroke="' + c.ink + '" stroke-opacity=".12" stroke-width="16"/>' +
          '<circle cx="170" cy="125" r="52" fill="none" stroke="' + c.acc + '" stroke-width="16" stroke-dasharray="230 400" transform="rotate(-90 170 125)" stroke-linecap="round"/>' +
          L(350, 76, 150, 0.6, 14) + L(350, 106, 210, 0.3) + L(350, 132, 180, 0.3) + A(350, 160, 90) +
          '<path d="M70 320 L150 300 L230 312 L310 270 L390 280 L470 240 L570 226" stroke="' + c.acc + '" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
      case 'code':
        out = S(32, 32, 576, 44, 12) + dot(60, 54, 7, c.bad) + dot(84, 54, 7, c.amber) + dot(108, 54, 7, c.good) + L(150, 48, 120, 0.35);
        for (i = 0; i < 7; i++) out += '<text x="56" y="' + (124 + i * 38) + '" font-size="20" font-weight="700" fill="' + c.ink + '" fill-opacity=".3">' + (i + 1) + '</text>';
        return out + A(96, 110, 150) + L(256, 110, 170, 0.55) + L(96, 148, 80, 0.55) + A(186, 148, 26) + L(96, 186, 210, 0.35) + L(96, 224, 150, 0.55) +
          L(256, 224, 120, 0.35) + L(96, 262, 80, 0.55) + A(186, 262, 26) + L(96, 300, 160, 0.35) + tick(560, 160, true) + tick(560, 276, true);
      case 'document':
        return S(60, 36, 300, 328) + L(92, 72, 180, 0.7, 16) + L(92, 108, 236, 0.3) + L(92, 130, 220, 0.3) + L(92, 152, 236, 0.3) + A(92, 190, 120, 14) +
          L(92, 218, 236, 0.3) + L(92, 240, 200, 0.3) + L(92, 262, 226, 0.3) + L(92, 300, 236, 0.3) + L(92, 322, 170, 0.3) +
          '<path d="M404 118 q0 -34 34 -40 v18 q-16 4 -16 22 h16 v36 h-34z M470 118 q0 -34 34 -40 v18 q-16 4 -16 22 h16 v36 h-34z" fill="' + c.acc + '"/>' +
          L(400, 200, 180, 0.6, 14) + L(400, 228, 150, 0.3) + L(400, 252, 166, 0.3) + S(400, 296, 110, 26, 13);
      case 'library':
        for (r = 0; r < 3; r++) for (k = 0; k < 3; k++) {
          var x = 40 + k * 192, y = 34 + r * 116, hot = r === 1 && k === 1;
          out += '<rect x="' + x + '" y="' + y + '" width="176" height="100" rx="14" fill="' + (hot ? c.card : 'none') + '" stroke="' + (hot ? c.acc : c.ink) + '" stroke-opacity="' + (hot ? 1 : 0.14) + '" stroke-width="' + (hot ? 3 : 2) + '"/>' +
            '<rect x="' + (x + 14) + '" y="' + (y + 14) + '" width="' + (hot ? 90 : 70) + '" height="12" rx="6" fill="' + (hot ? c.acc : c.soft) + '"/>' +
            L(x + 14, y + 40, 140, hot ? 0.7 : 0.35, 11) + L(x + 14, y + 60, 110, 0.25, 9) + L(x + 14, y + 76, 124, 0.25, 9);
        }
        return out;
      case 'game':
        // A small level on a board, a score, and a pad: drawn in the same bars and panels.
        out = L(48, 44, 170, 0.7, 16) + L(48, 72, 110, 0.3) + S(440, 40, 160, 44, 22) + dot(466, 62, 9, c.acc) + L(486, 56, 92, 0.45);
        out += S(40, 104, 312, 256, 18);
        var path = { '0,3': 1, '1,3': 1, '1,2': 1, '2,2': 1, '2,1': 1, '3,1': 1 };
        for (r = 0; r < 4; r++) for (k = 0; k < 5; k++) {
          var tx = 60 + k * 56, ty = 122 + r * 56, on = path[k + ',' + r], me = k === 3 && r === 1;
          out += '<rect x="' + tx + '" y="' + ty + '" width="46" height="46" rx="11" fill="' + (me ? c.acc : on ? c.soft : c.card) + '" stroke="' + c.ink + '" stroke-opacity="' + (me || on ? 0 : 0.1) + '" stroke-width="2"/>';
        }
        out += dot(60 + 4 * 56 + 23, 122 + 23, 9, c.ink, 0.3);
        out += '<rect x="420" y="200" width="44" height="124" rx="14" fill="' + c.ink + '" fill-opacity=".12"/><rect x="380" y="240" width="124" height="44" rx="14" fill="' + c.ink + '" fill-opacity=".12"/>' +
          dot(442, 262, 8, c.ink, 0.25) + dot(556, 226, 24, c.soft) + dot(556, 226, 10, c.acc) + dot(574, 296, 24, c.soft) + L(380, 140, 150, 0.35) + L(380, 162, 110, 0.25, 10);
        return out;
      case 'mobile':
        // A phone with an app on it, and what the app says beside it.
        out = '<rect x="64" y="22" width="204" height="356" rx="34" fill="' + c.card + '" stroke="' + c.ink + '" stroke-opacity=".16" stroke-width="4"/>' +
          L(136, 40, 60, 0.2, 10) + L(92, 76, 110, 0.7, 14) + S(92, 104, 148, 92, 16) +
          '<circle cx="132" cy="150" r="26" fill="none" stroke="' + c.ink + '" stroke-opacity=".12" stroke-width="9"/>' +
          '<circle cx="132" cy="150" r="26" fill="none" stroke="' + c.acc + '" stroke-width="9" stroke-dasharray="110 200" transform="rotate(-90 132 150)" stroke-linecap="round"/>' +
          L(172, 136, 52, 0.55, 11) + L(172, 156, 40, 0.3, 9);
        for (i = 0; i < 3; i++) out += dot(104, 224 + i * 40, 10, c.soft) + L(124, 216 + i * 40, [96, 80, 104][i], 0.45, 10) + L(124, 232 + i * 40, [64, 72, 52][i], 0.22, 8);
        out += '<rect x="64" y="338" width="204" height="1.5" fill="' + c.ink + '" fill-opacity=".1"/>';
        for (i = 0; i < 4; i++) out += dot(102 + i * 42, 358, 6, i === 0 ? c.acc : c.ink, i === 0 ? null : 0.22);
        return out + L(316, 70, 230, 0.7, 16) + L(316, 104, 270, 0.3) + L(316, 128, 240, 0.3) +
          S(316, 168, 284, 68, 16) + dot(348, 202, 14, c.acc) + L(374, 190, 150, 0.55, 11) + L(374, 210, 190, 0.25, 9) +
          S(316, 252, 284, 68, 16) + dot(348, 286, 14, c.ink, 0.18) + L(374, 274, 130, 0.55, 11) + L(374, 294, 170, 0.25, 9);
      default: // 'answer'
        out = S(40, 36, 560, 52, 26) + A(64, 56, 30) + L(108, 56, 300, 0.45) + dot(70, 136, 22, c.acc) + L(108, 118, 360, 0.7, 14) + L(108, 146, 440, 0.35) +
          L(108, 170, 410, 0.35) + S(108, 196, 150, 34, 17) + L(272, 207, 200, 0.35) + L(108, 248, 420, 0.35) + L(108, 272, 300, 0.35);
        for (i = 0; i < 3; i++) out += S(108 + i * 150, 310, 136, 40, 12) + dot(130 + i * 150, 330, 8, c.acc) + L(146 + i * 150, 325, 80, 0.4, 10);
        return out;
    }
  }

  function n1(v) { return Math.round(v * 10) / 10; }
  function pill(cx, cy, w, deg, fill, line, sw) {
    var h = w * 2.5;
    if (line) { var iw = w - sw, ih = h - sw; return '<rect class="hwx-cv-pill" x="' + n1(-iw / 2) + '" y="' + n1(-ih / 2) + '" width="' + n1(iw) + '" height="' + n1(ih) + '" rx="' + n1(iw / 2) + '" fill="none" stroke="' + line + '" stroke-width="' + sw + '" transform="translate(' + n1(cx) + ' ' + n1(cy) + ') rotate(' + deg + ')"/>'; }
    return '<rect class="hwx-cv-pill" x="' + n1(-w / 2) + '" y="' + n1(-h / 2) + '" width="' + n1(w) + '" height="' + n1(h) + '" rx="' + n1(w / 2) + '" fill="' + fill + '" transform="translate(' + n1(cx) + ' ' + n1(cy) + ') rotate(' + deg + ')"/>';
  }
  // The CSS gradient "125deg" across a 1600 x 1000 box, as SVG user-space end points.
  function groundGradient(id, g) {
    var a = 125 * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
    var len = Math.abs(W * dx) + Math.abs(H * dy);
    var x1 = W / 2 - dx * len / 2, y1 = H / 2 - dy * len / 2;
    var x2 = x1 + dx * len * g.stretch, y2 = y1 + dy * len * g.stretch;
    return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + n1(x1) + '" y1="' + n1(y1) + '" x2="' + n1(x2) + '" y2="' + n1(y2) + '">' +
      '<stop offset="0" stop-color="' + g.from + '"/><stop offset="1" stop-color="' + g.to + '"/></linearGradient>';
  }
  function words(text, max) {
    var out = [], line = '';
    String(text).split(/\s+/).forEach(function (w) {
      if (!w) return;
      if (line && (line + ' ' + w).length > max) { out.push(line); line = w; } else line = line ? line + ' ' + w : w;
    });
    if (line) out.push(line);
    return out;
  }

  var coverSeq = 0;
  HWX.coverSVG = function (info, o) {
    o = o || {};
    info = info || {};
    var slug = String((info.repo && info.repo.name) || info.key || info.slug || info.name || '');
    var g = HWX.coverGround(info.category);
    var v = hash(slug) % 3;
    var pal = g.dark ? PAL_DARK : PAL_LIGHT;
    var uid = 'hwcv' + (++coverSeq).toString(36);
    var font = ' font-family="\'Plus Jakarta Sans\', system-ui, sans-serif"';
    var a11y = o.label ? ' role="img" aria-label="' + esc(o.label) + '"' : ' aria-hidden="true" focusable="false"';
    var s = '<svg class="hwx-cv' + (o.titled ? ' hwx-cv-titled' : '') + (o.cls ? ' ' + esc(o.cls) : '') + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice"' +
      ' data-ground="' + g.id + '" data-v="' + v + '"' + a11y + font + '>' +
      '<defs>' + groundGradient(uid + 'g', g) +
      '<filter id="' + uid + 's" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="53"/></filter>' +
      '<filter id="' + uid + 'b" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="21" stdDeviation="16" flood-color="#0a061e" flood-opacity=".35"/></filter>' +
      '</defs><rect width="' + W + '" height="' + H + '" fill="url(#' + uid + 'g)"/>';

    if (o.titled) {
      var name = String(info.name || info.title || slug), cat = HWX.cat(info.category).label, kindLabel = HWX.kind(info.kind).label || 'Project';
      var size = name.length > 70 ? 72 : name.length > 48 ? 83 : 96;
      var lines = words(name, Math.max(10, Math.floor(1240 / (size * 0.6)))).slice(0, 3);
      s += pill(v === 1 ? 1538.7 : 1557.1, v === 1 ? 214.7 : 153.3, 306.7, 14, g.pill) +
        pill(W - (v === 2 ? 293.3 : 160) - 100, 1040, 200, -24, null, g.line, 8) +
        (v === 0 ? pill(5.9, 963.3, 146.7, 18, g.pill) : '');
      var chipText = cat.toUpperCase(), chipW = Math.round(chipText.length * 27 * 0.8 + 54);
      s += '<rect x="96" y="85" width="' + chipW + '" height="56" rx="28" fill="' + g.chip + '"/>' +
        '<text x="123" y="123" font-size="27" font-weight="800" letter-spacing="2.7" fill="#ffffff">' + esc(chipText) + '</text>';
      var lh = size * 1.06, last = 803 - size * 0.24;
      lines.forEach(function (ln, i) {
        s += '<text x="96" y="' + n1(last - (lines.length - 1 - i) * lh) + '" font-size="' + size + '" font-weight="800" letter-spacing="' + n1(-0.035 * size) + '" fill="#ffffff">' + esc(ln) + '</text>';
      });
      s += '<g transform="translate(96 856) scale(' + n1(59 / 306 * 1000) / 1000 + ')">' + botInner('#ffffff', '#a98bff') + '</g>' +
        '<text x="174" y="898" font-size="35" font-weight="700" letter-spacing="-.7" fill="#ffffff">Hello<tspan font-weight="800">World</tspan><tspan fill="' + g.eye + '">.ie</tspan>' +
        '<tspan dx="18" fill="' + g.eye + '">\u2022</tspan><tspan dx="18" font-size="29" font-weight="500" fill-opacity=".8" letter-spacing="0">' + esc(kindLabel) + '</tspan></text>';
      return s + '</svg>';
    }

    // Pills behind the card.
    s += pill(v === 1 ? 49.1 : 1557.1, 153.3, 306.7, v === 1 ? -14 : 14, g.pill) +
      pill(v === 2 ? 226.7 : 1386.7, 1053.3, 213.3, -24, null, g.line, 8);
    // The card, its shadow and the motif (drawn in 640 x 400, scaled by 4/3).
    var cw = 853.3, ch = 533.3, cx = 800, cy = 500 - 0.48 * ch + ch / 2, tilt = [-1.5, 0, 1.5][v];
    s += '<g class="hwx-cv-card" transform="translate(' + cx + ' ' + n1(cy) + ') rotate(' + tilt + ')">' +
      '<rect x="' + n1(-cw / 2 + 40) + '" y="' + n1(-ch / 2 + 40 + 53.3) + '" width="' + n1(cw - 80) + '" height="' + n1(ch - 80) + '" rx="12" fill="#0a061e" fill-opacity=".55" filter="url(#' + uid + 's)"/>' +
      '<rect x="' + n1(-cw / 2) + '" y="' + n1(-ch / 2) + '" width="' + cw + '" height="' + ch + '" rx="34.7" fill="' + pal.card + '" stroke="#ffffff" stroke-opacity=".08" stroke-width="2.7"/>' +
      '<g transform="translate(' + n1(-cw / 2) + ' ' + n1(-ch / 2) + ') scale(1.3333)">' + motif(HWX.kind(info.kind).motif, pal) + '</g></g>';
    // The bot, perched on the card's top-right corner.
    var bx = 1221.3, by = 254.7, rot = [8, -6, 4][v];
    s += '<g filter="url(#' + uid + 'b)"><g class="hwx-cv-bot"><g transform="translate(' + bx + ' ' + by + ') rotate(' + rot + ') scale(' + n1(176 / 306 * 1000) / 1000 + ') translate(-153 -153)">' +
      botInner(g.dark ? '#f2f0f8' : '#ffffff', '#a98bff') + '</g></g></g>';
    return s + '</svg>';
  };
})();

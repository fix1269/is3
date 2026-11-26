/* imgsfix — photo-collage.js
   100% client-side Smart Photo Collage Maker (Tool #8 — Completing Smart Studio):
   - 60 Geometric & Creative Layouts across 4 categories (16 Grids & Bento, 16 Editorial, 14 Filmstrips & Polaroids, 14 Shapes)
   - Up to 12 photos (drag & drop onto canvas/slot, multi-select upload, Ctrl+V clipboard paste)
   - Interactive direct per-frame Pan, Wheel/Pinch Zoom (50%–250%), Rotate 90deg, Flip H, Swap Photo, Replace & Smart Shuffle
   - Custom Inner Spacing (0-40px), Outer Margin (0-60px), Corner Radius (0-50px), Soft Depth Shadows
   - 42 Curated Studio Backgrounds + Transparent PNG + Custom BG Upload
   - 6 Color Filters (Global or Per-Frame) & Unified 24 EN/AR Font Library Typography Overlay
   - Strict SVG Sanitizer, 30MB / 12000px limits, URL.revokeObjectURL cleanup, up to 3000px PNG/JPG & 300 DPI A4/Letter PDF export
*/
import { jsPDF } from 'jspdf';

(function () {
  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = I.$$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  /* ----- Security & Memory Constants ----- */
  var MAX_FILE_BYTES = 30 * 1024 * 1024;
  var MAX_IMAGE_DIM = 12000;
  var MAX_PHOTOS = 12;
  var MAX_UNDO = 20;
  var ALLOWED_MIMES = {
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/bmp': true,
    'image/gif': true,
    'image/svg+xml': true,
  };
  var DANGEROUS_SVG_TAGS = {
    script: true,
    foreignobject: true,
    iframe: true,
    object: true,
    embed: true,
    link: true,
    meta: true,
    base: true,
    audio: true,
    video: true,
    canvas: true,
    frame: true,
    frameset: true,
  };

  var ASPECT_SPECS = {
    '1:1':  { id: '1:1',  w: 1000, h: 1000, labelKey: 'pc_asp_11' },
    '4:5':  { id: '4:5',  w: 800,  h: 1000, labelKey: 'pc_asp_45' },
    '9:16': { id: '9:16', w: 563,  h: 1000, labelKey: 'pc_asp_916' },
    '16:9': { id: '16:9', w: 1000, h: 563,  labelKey: 'pc_asp_169' },
    'a4_p': { id: 'A4',   w: 827,  h: 1169, labelKey: 'pc_asp_a4' },
    'a4_l': { id: 'A4-L', w: 1169, h: 827,  labelKey: 'pc_asp_a4l' },
  };

  /* Unified 24-Font Library (12 Arabic + 12 English) */
  var FONT_LIBRARY = [
    { id: 'cairo',      group: 'ar', label: 'Cairo',                family: 'Cairo',                weight: '900', css: '"Cairo", system-ui, sans-serif',              sample: 'ذكريات جميلة' },
    { id: 'tajawal',    group: 'ar', label: 'Tajawal',              family: 'Tajawal',              weight: '800', css: '"Tajawal", "Cairo", sans-serif',              sample: 'ذكريات جميلة' },
    { id: 'changa',     group: 'ar', label: 'Changa',               family: 'Changa',               weight: '800', css: '"Changa", "Cairo", sans-serif',               sample: 'ذكريات جميلة' },
    { id: 'almarai',    group: 'ar', label: 'Almarai',              family: 'Almarai',              weight: '800', css: '"Almarai", "Cairo", sans-serif',              sample: 'ذكريات جميلة' },
    { id: 'ibm_ar',     group: 'ar', label: 'IBM Plex Sans Arabic', family: 'IBM Plex Sans Arabic', weight: '700', css: '"IBM Plex Sans Arabic", "Cairo", sans-serif', sample: 'ذكريات جميلة' },
    { id: 'readex',     group: 'ar', label: 'Readex Pro',           family: 'Readex Pro',           weight: '700', css: '"Readex Pro", "Cairo", sans-serif',           sample: 'ذكريات جميلة' },
    { id: 'amiri',      group: 'ar', label: 'Amiri',                family: 'Amiri',                weight: '700', css: '"Amiri", Georgia, serif',                     sample: 'ذكريات جميلة' },
    { id: 'aref_ruqaa', group: 'ar', label: 'Aref Ruqaa',           family: 'Aref Ruqaa',           weight: '700', css: '"Aref Ruqaa", "Amiri", serif',                sample: 'ذكريات جميلة' },
    { id: 'lalezar',    group: 'ar', label: 'Lalezar',              family: 'Lalezar',              weight: '400', css: '"Lalezar", "Cairo", sans-serif',              sample: 'ذكريات جميلة' },
    { id: 'reem_kufi',  group: 'ar', label: 'Reem Kufi',            family: 'Reem Kufi',            weight: '700', css: '"Reem Kufi", "Cairo", sans-serif',            sample: 'ذكريات جميلة' },
    { id: 'el_messiri', group: 'ar', label: 'El Messiri',           family: 'El Messiri',           weight: '700', css: '"El Messiri", "Cairo", sans-serif',           sample: 'ذكريات جميلة' },
    { id: 'lemonada',   group: 'ar', label: 'Lemonada',             family: 'Lemonada',             weight: '700', css: '"Lemonada", "Cairo", sans-serif',             sample: 'ذكريات جميلة' },
    { id: 'impact',     group: 'en', label: 'Impact',           family: 'Impact',           weight: '900', css: 'Impact, "Arial Black", sans-serif',       sample: 'SUMMER VIBES' },
    { id: 'anton',      group: 'en', label: 'Anton',            family: 'Anton',            weight: '400', css: '"Anton", Impact, sans-serif',             sample: 'SUMMER VIBES' },
    { id: 'bebas',      group: 'en', label: 'Bebas Neue',       family: 'Bebas Neue',       weight: '400', css: '"Bebas Neue", Impact, sans-serif',        sample: 'SUMMER VIBES' },
    { id: 'montserrat', group: 'en', label: 'Montserrat',       family: 'Montserrat',       weight: '900', css: '"Montserrat", system-ui, sans-serif',     sample: 'Summer Vibes' },
    { id: 'oswald',     group: 'en', label: 'Oswald',           family: 'Oswald',           weight: '700', css: '"Oswald", Impact, sans-serif',            sample: 'SUMMER VIBES' },
    { id: 'poppins',    group: 'en', label: 'Poppins',          family: 'Poppins',          weight: '800', css: '"Poppins", system-ui, sans-serif',        sample: 'Summer Vibes' },
    { id: 'roboto',     group: 'en', label: 'Roboto',           family: 'Roboto',           weight: '900', css: '"Roboto", system-ui, sans-serif',         sample: 'Summer Vibes' },
    { id: 'luckiest',   group: 'en', label: 'Luckiest Guy',     family: 'Luckiest Guy',     weight: '400', css: '"Luckiest Guy", Impact, sans-serif',      sample: 'Summer Vibes' },
    { id: 'bangers',    group: 'en', label: 'Bangers',          family: 'Bangers',          weight: '400', css: '"Bangers", Impact, sans-serif',           sample: 'SUMMER VIBES' },
    { id: 'playfair',   group: 'en', label: 'Playfair Display', family: 'Playfair Display', weight: '900', css: '"Playfair Display", Georgia, serif',      sample: 'Summer Vibes' },
    { id: 'pacifico',   group: 'en', label: 'Pacifico',         family: 'Pacifico',         weight: '400', css: '"Pacifico", cursive',                     sample: 'Summer Vibes' },
    { id: 'permanent',  group: 'en', label: 'Permanent Marker', family: 'Permanent Marker', weight: '400', css: '"Permanent Marker", cursive',             sample: 'Summer Vibes' },
  ];

  /* ----- Layout Geometry Builders (60 Distinct Layouts Across 4 Categories) ----- */
  function gridRows(rowsSpec, cat, id, key, opts) {
    var slots = [];
    var totalH = rowsSpec.length;
    var y = 0;
    for (var r = 0; r < totalH; r++) {
      var item = rowsSpec[r];
      var cols = Array.isArray(item) ? item : null;
      var nCols = cols ? cols.length : item;
      var rh = (opts && opts.rowHeights && opts.rowHeights[r]) ? opts.rowHeights[r] : (1 / totalH);
      var x = 0;
      for (var c = 0; c < nCols; c++) {
        var cw = cols ? cols[c] : (1 / nCols);
        slots.push({ x: x, y: y, w: cw, h: rh });
        x += cw;
      }
      y += rh;
    }
    return { id: id, cat: cat, key: key, kind: (opts && opts.kind) || 'rect', slots: slots };
  }

  function makePolaroidSlots(coords, id, key) {
    return {
      id: id,
      cat: 'film',
      key: key,
      kind: 'polaroid',
      slots: coords.map(function (c) {
        return { x: c[0], y: c[1], w: c[2], h: c[3], rot: c[4] || 0, shape: 'polaroid' };
      }),
    };
  }

  function makeFilmstripLayout(count, vertical, id, key, dual) {
    var slots = [];
    if (dual) {
      var perStrip = count / 2;
      if (vertical) {
        for (var c = 0; c < 2; c++) {
          var sx = c === 0 ? 0.04 : 0.52;
          for (var r = 0; r < perStrip; r++) {
            var sh = 0.90 / perStrip;
            slots.push({ x: sx + 0.06, y: 0.05 + r * sh + 0.015, w: 0.32, h: sh - 0.03, shape: 'film', stripBox: { x: sx, y: 0.02, w: 0.44, h: 0.96, vert: true } });
          }
        }
      } else {
        for (var r2 = 0; r2 < 2; r2++) {
          var sy = r2 === 0 ? 0.04 : 0.52;
          for (var c2 = 0; c2 < perStrip; c2++) {
            var sw = 0.90 / perStrip;
            slots.push({ x: 0.05 + c2 * sw + 0.015, y: sy + 0.06, w: sw - 0.03, h: 0.32, shape: 'film', stripBox: { x: 0.02, y: sy, w: 0.96, h: 0.44, vert: false } });
          }
        }
      }
    } else if (vertical) {
      var hStep = 0.92 / count;
      for (var i = 0; i < count; i++) {
        slots.push({ x: 0.24, y: 0.04 + i * hStep + 0.015, w: 0.52, h: hStep - 0.03, shape: 'film', stripBox: { x: 0.14, y: 0.02, w: 0.72, h: 0.96, vert: true } });
      }
    } else {
      var wStep = 0.92 / count;
      for (var j = 0; j < count; j++) {
        slots.push({ x: 0.04 + j * wStep + 0.015, y: 0.24, w: wStep - 0.03, h: 0.52, shape: 'film', stripBox: { x: 0.02, y: 0.14, w: 0.96, h: 0.72, vert: false } });
      }
    }
    return { id: id, cat: 'film', key: key, kind: 'film', slots: slots };
  }

  var LAYOUTS = [
    /* === CATEGORY A: Classic & Bento Grids (16) === */
    gridRows([[0.5, 0.5]], 'grids', 'g_2h', 'pc_lay_g_2h'),
    gridRows([1, 1], 'grids', 'g_2v', 'pc_lay_g_2v'),
    gridRows([[0.3333, 0.3334, 0.3333]], 'grids', 'g_3v', 'pc_lay_g_3v'),
    gridRows([[0.5, 0.5], [0.5, 0.5]], 'grids', 'g_2x2', 'pc_lay_g_2x2'),
    {
      id: 'g_bento_4', cat: 'grids', key: 'pc_lay_g_bento4', kind: 'rect',
      slots: [
        { x: 0, y: 0, w: 0.56, h: 1 },
        { x: 0.56, y: 0, w: 0.44, h: 0.42 },
        { x: 0.56, y: 0.42, w: 0.22, h: 0.58 },
        { x: 0.78, y: 0.42, w: 0.22, h: 0.58 },
      ],
    },
    gridRows([[0.5, 0.5], [0.3333, 0.3334, 0.3333]], 'grids', 'g_bento_5', 'pc_lay_g_bento5', { rowHeights: [0.56, 0.44] }),
    gridRows([[0.3333, 0.3334, 0.3333], [0.3333, 0.3334, 0.3333]], 'grids', 'g_3x2', 'pc_lay_g_3x2'),
    {
      id: 'g_bento_6', cat: 'grids', key: 'pc_lay_g_bento6', kind: 'rect',
      slots: [
        { x: 0, y: 0, w: 0.5, h: 0.62 },
        { x: 0.5, y: 0, w: 0.5, h: 0.31 },
        { x: 0.5, y: 0.31, w: 0.25, h: 0.31 },
        { x: 0.75, y: 0.31, w: 0.25, h: 0.31 },
        { x: 0, y: 0.62, w: 0.35, h: 0.38 },
        { x: 0.35, y: 0.62, w: 0.65, h: 0.38 },
      ],
    },
    gridRows([2, 3, 2], 'grids', 'g_bento_7', 'pc_lay_g_bento7', { rowHeights: [0.33, 0.34, 0.33] }),
    gridRows([4, 4], 'grids', 'g_4x2', 'pc_lay_g_4x2'),
    {
      id: 'g_bento_8', cat: 'grids', key: 'pc_lay_g_bento8', kind: 'rect',
      slots: [
        { x: 0, y: 0, w: 0.48, h: 0.66 },
        { x: 0.48, y: 0, w: 0.26, h: 0.33 },
        { x: 0.74, y: 0, w: 0.26, h: 0.33 },
        { x: 0.48, y: 0.33, w: 0.26, h: 0.33 },
        { x: 0.74, y: 0.33, w: 0.26, h: 0.33 },
        { x: 0, y: 0.66, w: 0.333, h: 0.34 },
        { x: 0.333, y: 0.66, w: 0.334, h: 0.34 },
        { x: 0.667, y: 0.66, w: 0.333, h: 0.34 },
      ],
    },
    gridRows([3, 3, 3], 'grids', 'g_3x3', 'pc_lay_g_3x3'),
    {
      id: 'g_bento_9', cat: 'grids', key: 'pc_lay_g_bento9', kind: 'rect',
      slots: [
        { x: 0, y: 0, w: 0.28, h: 0.333 }, { x: 0.28, y: 0, w: 0.44, h: 0.24 }, { x: 0.72, y: 0, w: 0.28, h: 0.333 },
        { x: 0, y: 0.333, w: 0.28, h: 0.334 }, { x: 0.28, y: 0.24, w: 0.44, h: 0.52 }, { x: 0.72, y: 0.333, w: 0.28, h: 0.334 },
        { x: 0, y: 0.667, w: 0.28, h: 0.333 }, { x: 0.28, y: 0.76, w: 0.44, h: 0.24 }, { x: 0.72, y: 0.667, w: 0.28, h: 0.333 },
      ],
    },
    gridRows([2, 3, 3, 2], 'grids', 'g_10grid', 'pc_lay_g_10'),
    gridRows([3, 4, 4], 'grids', 'g_11bento', 'pc_lay_g_11', { rowHeights: [0.38, 0.31, 0.31] }),
    gridRows([4, 4, 4], 'grids', 'g_4x3', 'pc_lay_g_4x3'),

    /* === CATEGORY B: Editorial & Magazine Layouts (16) === */
    {
      id: 'ed_split_ba', cat: 'editorial', key: 'pc_lay_ed_ba', kind: 'rect',
      slots: [
        { x: 0, y: 0.08, w: 0.49, h: 0.84 },
        { x: 0.51, y: 0.08, w: 0.49, h: 0.84 },
      ],
    },
    {
      id: 'ed_hero_2', cat: 'editorial', key: 'pc_lay_ed_hero2', kind: 'rect',
      slots: [
        { x: 0, y: 0, w: 1, h: 1 },
        { x: 0.54, y: 0.54, w: 0.40, h: 0.40, borderCard: true },
      ],
    },
    {
      id: 'ed_hero_3l', cat: 'editorial', key: 'pc_lay_ed_hero3l', kind: 'rect',
      slots: [
        { x: 0, y: 0, w: 0.60, h: 1 },
        { x: 0.60, y: 0, w: 0.40, h: 0.5 },
        { x: 0.60, y: 0.5, w: 0.40, h: 0.5 },
      ],
    },
    gridRows([1, 2], 'editorial', 'ed_hero_3t', 'pc_lay_ed_hero3t', { rowHeights: [0.60, 0.40] }),
    {
      id: 'ed_lshape_4', cat: 'editorial', key: 'pc_lay_ed_l4', kind: 'rect',
      slots: [
        { x: 0, y: 0, w: 0.65, h: 0.65 },
        { x: 0.65, y: 0, w: 0.35, h: 0.325 },
        { x: 0.65, y: 0.325, w: 0.35, h: 0.325 },
        { x: 0, y: 0.65, w: 1, h: 0.35 },
      ],
    },
    gridRows([1, 3], 'editorial', 'ed_tshape_4', 'pc_lay_ed_t4', { rowHeights: [0.58, 0.42] }),
    {
      id: 'ed_catalog_4', cat: 'editorial', key: 'pc_lay_ed_cat4', kind: 'rect',
      slots: [
        { x: 0.08, y: 0, w: 0.84, h: 0.62 },
        { x: 0.08, y: 0.64, w: 0.27, h: 0.34 },
        { x: 0.365, y: 0.64, w: 0.27, h: 0.34 },
        { x: 0.65, y: 0.64, w: 0.27, h: 0.34 },
      ],
    },
    {
      id: 'ed_hero_5', cat: 'editorial', key: 'pc_lay_ed_hero5', kind: 'rect',
      slots: [
        { x: 0, y: 0, w: 0.52, h: 1 },
        { x: 0.52, y: 0, w: 0.24, h: 0.5 },
        { x: 0.76, y: 0, w: 0.24, h: 0.5 },
        { x: 0.52, y: 0.5, w: 0.24, h: 0.5 },
        { x: 0.76, y: 0.5, w: 0.24, h: 0.5 },
      ],
    },
    {
      id: 'ed_center_5', cat: 'editorial', key: 'pc_lay_ed_cen5', kind: 'rect',
      slots: [
        { x: 0, y: 0, w: 0.28, h: 0.5 },
        { x: 0, y: 0.5, w: 0.28, h: 0.5 },
        { x: 0.28, y: 0, w: 0.44, h: 1 },
        { x: 0.72, y: 0, w: 0.28, h: 0.5 },
        { x: 0.72, y: 0.5, w: 0.28, h: 0.5 },
      ],
    },
    gridRows([2, 4], 'editorial', 'ed_lookbook_6', 'pc_lay_ed_look6', { rowHeights: [0.60, 0.40] }),
    {
      id: 'ed_cover_7', cat: 'editorial', key: 'pc_lay_ed_cov7', kind: 'rect',
      slots: [
        { x: 0, y: 0, w: 0.48, h: 1 },
        { x: 0.48, y: 0, w: 0.26, h: 0.333 }, { x: 0.74, y: 0, w: 0.26, h: 0.333 },
        { x: 0.48, y: 0.333, w: 0.26, h: 0.334 }, { x: 0.74, y: 0.333, w: 0.26, h: 0.334 },
        { x: 0.48, y: 0.667, w: 0.26, h: 0.333 }, { x: 0.74, y: 0.667, w: 0.26, h: 0.333 },
      ],
    },
    gridRows([2, 3, 3], 'editorial', 'ed_cover_8', 'pc_lay_ed_cov8', { rowHeights: [0.46, 0.27, 0.27] }),
    {
      id: 'ed_spread_9', cat: 'editorial', key: 'pc_lay_ed_spr9', kind: 'rect',
      slots: [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.25, h: 0.25 }, { x: 0.75, y: 0, w: 0.25, h: 0.25 },
        { x: 0.5, y: 0.25, w: 0.25, h: 0.25 }, { x: 0.75, y: 0.25, w: 0.25, h: 0.25 },
        { x: 0, y: 0.5, w: 0.25, h: 0.5 }, { x: 0.25, y: 0.5, w: 0.25, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.25, h: 0.5 }, { x: 0.75, y: 0.5, w: 0.25, h: 0.5 },
      ],
    },
    gridRows([2, 4, 4], 'editorial', 'ed_catalog_10', 'pc_lay_ed_cat10', { rowHeights: [0.50, 0.25, 0.25] }),
    {
      id: 'ed_spread_11', cat: 'editorial', key: 'pc_lay_ed_spr11', kind: 'rect',
      slots: [
        { x: 0, y: 0, w: 0.5, h: 0.44 }, { x: 0.5, y: 0, w: 0.5, h: 0.44 },
        { x: 0, y: 0.44, w: 0.333, h: 0.28 }, { x: 0.333, y: 0.44, w: 0.334, h: 0.28 }, { x: 0.667, y: 0.44, w: 0.333, h: 0.28 },
        { x: 0, y: 0.72, w: 0.166, h: 0.28 }, { x: 0.166, y: 0.72, w: 0.166, h: 0.28 }, { x: 0.332, y: 0.72, w: 0.168, h: 0.28 },
        { x: 0.5, y: 0.72, w: 0.166, h: 0.28 }, { x: 0.666, y: 0.72, w: 0.167, h: 0.28 }, { x: 0.833, y: 0.72, w: 0.167, h: 0.28 },
      ],
    },
    gridRows([2, 5, 5], 'editorial', 'ed_yearbook_12', 'pc_lay_ed_yb12', { rowHeights: [0.46, 0.27, 0.27] }),

    /* === CATEGORY C: Cinema Filmstrips & Polaroid Frames (14) === */
    makePolaroidSlots([[0.06, 0.16, 0.44, 0.58, -6], [0.50, 0.20, 0.44, 0.58, 5]], 'fm_polaroid_2', 'pc_lay_fm_pol2'),
    makeFilmstripLayout(3, true, 'fm_film_3v', 'pc_lay_fm_3v', false),
    makePolaroidSlots([[0.05, 0.10, 0.38, 0.52, -7], [0.31, 0.22, 0.38, 0.52, 2], [0.57, 0.12, 0.38, 0.52, 7]], 'fm_polaroid_3', 'pc_lay_fm_pol3'),
    makeFilmstripLayout(4, true, 'fm_film_4v', 'pc_lay_fm_4v', false),
    makeFilmstripLayout(4, false, 'fm_film_4h', 'pc_lay_fm_4h', false),
    makePolaroidSlots([
      [0.06, 0.06, 0.40, 0.44, -5], [0.52, 0.08, 0.40, 0.44, 4],
      [0.08, 0.50, 0.40, 0.44, 3], [0.52, 0.50, 0.40, 0.44, -4],
    ], 'fm_polaroid_4', 'pc_lay_fm_pol4'),
    makePolaroidSlots([
      [0.04, 0.05, 0.32, 0.42, -6], [0.64, 0.05, 0.32, 0.42, 6],
      [0.04, 0.53, 0.32, 0.42, 5], [0.64, 0.53, 0.32, 0.42, -5],
      [0.31, 0.22, 0.38, 0.56, 0],
    ], 'fm_polaroid_5', 'pc_lay_fm_pol5'),
    makePolaroidSlots([
      [0.04, 0.05, 0.29, 0.42, -5], [0.355, 0.07, 0.29, 0.42, 3], [0.67, 0.04, 0.29, 0.42, -4],
      [0.05, 0.51, 0.29, 0.42, 4], [0.355, 0.49, 0.29, 0.42, -3], [0.66, 0.52, 0.29, 0.42, 5],
    ], 'fm_scrap_6', 'pc_lay_fm_scr6'),
    makeFilmstripLayout(6, true, 'fm_film_6d', 'pc_lay_fm_6d', true),
    makePolaroidSlots([
      [0.04, 0.04, 0.28, 0.38, -5], [0.36, 0.04, 0.28, 0.38, 2], [0.68, 0.05, 0.28, 0.38, 5],
      [0.18, 0.33, 0.28, 0.38, -3], [0.54, 0.33, 0.28, 0.38, 4],
      [0.06, 0.58, 0.28, 0.38, 3], [0.66, 0.58, 0.28, 0.38, -4],
    ], 'fm_scrap_7', 'pc_lay_fm_scr7'),
    makeFilmstripLayout(8, false, 'fm_film_8d', 'pc_lay_fm_8d', true),
    makePolaroidSlots([
      [0.03, 0.03, 0.29, 0.30, -3], [0.355, 0.03, 0.29, 0.30, 2], [0.68, 0.03, 0.29, 0.30, -2],
      [0.03, 0.35, 0.29, 0.30, 2], [0.355, 0.35, 0.29, 0.30, -1], [0.68, 0.35, 0.29, 0.30, 3],
      [0.03, 0.67, 0.29, 0.30, -2], [0.355, 0.67, 0.29, 0.30, 3], [0.68, 0.67, 0.29, 0.30, -3],
    ], 'fm_polaroid_9', 'pc_lay_fm_pol9'),
    makePolaroidSlots([
      [0.03, 0.04, 0.23, 0.30, -4], [0.27, 0.05, 0.23, 0.30, 3], [0.51, 0.04, 0.23, 0.30, -2], [0.74, 0.05, 0.23, 0.30, 4],
      [0.14, 0.35, 0.23, 0.30, 2], [0.62, 0.35, 0.23, 0.30, -3],
      [0.03, 0.66, 0.23, 0.30, 3], [0.27, 0.65, 0.23, 0.30, -3], [0.51, 0.66, 0.23, 0.30, 2], [0.74, 0.65, 0.23, 0.30, -4],
    ], 'fm_scrap_10', 'pc_lay_fm_scr10'),
    makeFilmstripLayout(12, true, 'fm_film_12', 'pc_lay_fm_12', true),

    /* === CATEGORY D: Geometric & Artistic Shapes (14) === */
    {
      id: 'sh_diag_2', cat: 'shapes', key: 'pc_lay_sh_diag2', kind: 'poly',
      slots: [
        { x: 0, y: 0, w: 1, h: 1, shape: 'poly', poly: [[0, 0], [0.97, 0], [0.03, 1], [0, 1]] },
        { x: 0, y: 0, w: 1, h: 1, shape: 'poly', poly: [[1, 0], [1, 1], [0.06, 1], [0.99, 0.03]] },
      ],
    },
    {
      id: 'sh_circle_2', cat: 'shapes', key: 'pc_lay_sh_circ2', kind: 'circle',
      slots: [
        { x: 0.04, y: 0.16, w: 0.44, h: 0.68, shape: 'circle' },
        { x: 0.52, y: 0.16, w: 0.44, h: 0.68, shape: 'circle' },
      ],
    },
    {
      id: 'sh_diag_3', cat: 'shapes', key: 'pc_lay_sh_diag3', kind: 'poly',
      slots: [
        { x: 0, y: 0, w: 1, h: 1, shape: 'poly', poly: [[0, 0], [0.42, 0], [0.24, 1], [0, 1]] },
        { x: 0, y: 0, w: 1, h: 1, shape: 'poly', poly: [[0.44, 0], [0.76, 0], [0.58, 1], [0.26, 1]] },
        { x: 0, y: 0, w: 1, h: 1, shape: 'poly', poly: [[0.78, 0], [1, 0], [1, 1], [0.60, 1]] },
      ],
    },
    {
      id: 'sh_arch_3', cat: 'shapes', key: 'pc_lay_sh_arch3', kind: 'arch',
      slots: [
        { x: 0.02, y: 0.08, w: 0.30, h: 0.84, shape: 'arch' },
        { x: 0.35, y: 0.08, w: 0.30, h: 0.84, shape: 'arch' },
        { x: 0.68, y: 0.08, w: 0.30, h: 0.84, shape: 'arch' },
      ],
    },
    {
      id: 'sh_diamond_4', cat: 'shapes', key: 'pc_lay_sh_dia4', kind: 'poly',
      slots: [
        { x: 0.25, y: 0.02, w: 0.50, h: 0.46, shape: 'diamond' },
        { x: 0.02, y: 0.27, w: 0.46, h: 0.46, shape: 'diamond' },
        { x: 0.52, y: 0.27, w: 0.46, h: 0.46, shape: 'diamond' },
        { x: 0.25, y: 0.52, w: 0.50, h: 0.46, shape: 'diamond' },
      ],
    },
    {
      id: 'sh_hex_4', cat: 'shapes', key: 'pc_lay_sh_hex4', kind: 'hex',
      slots: [
        { x: 0.06, y: 0.05, w: 0.42, h: 0.44, shape: 'hex' },
        { x: 0.52, y: 0.05, w: 0.42, h: 0.44, shape: 'hex' },
        { x: 0.06, y: 0.51, w: 0.42, h: 0.44, shape: 'hex' },
        { x: 0.52, y: 0.51, w: 0.42, h: 0.44, shape: 'hex' },
      ],
    },
    {
      id: 'sh_arch_5', cat: 'shapes', key: 'pc_lay_sh_arch5', kind: 'arch',
      slots: [
        { x: 0.28, y: 0.06, w: 0.44, h: 0.88, shape: 'arch' },
        { x: 0.02, y: 0.06, w: 0.23, h: 0.42, shape: 'arch' },
        { x: 0.75, y: 0.06, w: 0.23, h: 0.42, shape: 'arch' },
        { x: 0.02, y: 0.52, w: 0.23, h: 0.42, shape: 'circle' },
        { x: 0.75, y: 0.52, w: 0.23, h: 0.42, shape: 'circle' },
      ],
    },
    {
      id: 'sh_star_5', cat: 'shapes', key: 'pc_lay_sh_star5', kind: 'circle',
      slots: [
        { x: 0.34, y: 0.02, w: 0.32, h: 0.32, shape: 'circle' },
        { x: 0.03, y: 0.34, w: 0.32, h: 0.32, shape: 'circle' },
        { x: 0.34, y: 0.34, w: 0.32, h: 0.32, shape: 'diamond' },
        { x: 0.65, y: 0.34, w: 0.32, h: 0.32, shape: 'circle' },
        { x: 0.34, y: 0.66, w: 0.32, h: 0.32, shape: 'circle' },
      ],
    },
    {
      id: 'sh_hex_6', cat: 'shapes', key: 'pc_lay_sh_hex6', kind: 'hex',
      slots: [
        { x: 0.03, y: 0.08, w: 0.30, h: 0.40, shape: 'hex' },
        { x: 0.35, y: 0.08, w: 0.30, h: 0.40, shape: 'hex' },
        { x: 0.67, y: 0.08, w: 0.30, h: 0.40, shape: 'hex' },
        { x: 0.03, y: 0.52, w: 0.30, h: 0.40, shape: 'hex' },
        { x: 0.35, y: 0.52, w: 0.30, h: 0.40, shape: 'hex' },
        { x: 0.67, y: 0.52, w: 0.30, h: 0.40, shape: 'hex' },
      ],
    },
    {
      id: 'sh_hex_7', cat: 'shapes', key: 'pc_lay_sh_hex7', kind: 'hex',
      slots: [
        { x: 0.19, y: 0.03, w: 0.29, h: 0.31, shape: 'hex' }, { x: 0.52, y: 0.03, w: 0.29, h: 0.31, shape: 'hex' },
        { x: 0.03, y: 0.345, w: 0.29, h: 0.31, shape: 'hex' }, { x: 0.355, y: 0.345, w: 0.29, h: 0.31, shape: 'hex' }, { x: 0.68, y: 0.345, w: 0.29, h: 0.31, shape: 'hex' },
        { x: 0.19, y: 0.66, w: 0.29, h: 0.31, shape: 'hex' }, { x: 0.52, y: 0.66, w: 0.29, h: 0.31, shape: 'hex' },
      ],
    },
    {
      id: 'sh_circle_8', cat: 'shapes', key: 'pc_lay_sh_circ8', kind: 'circle',
      slots: [
        { x: 0.02, y: 0.12, w: 0.22, h: 0.34, shape: 'circle' }, { x: 0.26, y: 0.12, w: 0.22, h: 0.34, shape: 'circle' },
        { x: 0.52, y: 0.12, w: 0.22, h: 0.34, shape: 'circle' }, { x: 0.76, y: 0.12, w: 0.22, h: 0.34, shape: 'circle' },
        { x: 0.02, y: 0.54, w: 0.22, h: 0.34, shape: 'circle' }, { x: 0.26, y: 0.54, w: 0.22, h: 0.34, shape: 'circle' },
        { x: 0.52, y: 0.54, w: 0.22, h: 0.34, shape: 'circle' }, { x: 0.76, y: 0.54, w: 0.22, h: 0.34, shape: 'circle' },
      ],
    },
    {
      id: 'sh_heart_9', cat: 'shapes', key: 'pc_lay_sh_heart9', kind: 'heart',
      slots: [
        { x: 0.12, y: 0.08, w: 0.26, h: 0.26, shape: 'circle' }, { x: 0.62, y: 0.08, w: 0.26, h: 0.26, shape: 'circle' },
        { x: 0.04, y: 0.30, w: 0.22, h: 0.24, shape: 'rect' }, { x: 0.27, y: 0.24, w: 0.22, h: 0.28, shape: 'rect' },
        { x: 0.51, y: 0.24, w: 0.22, h: 0.28, shape: 'rect' }, { x: 0.74, y: 0.30, w: 0.22, h: 0.24, shape: 'rect' },
        { x: 0.16, y: 0.54, w: 0.32, h: 0.22, shape: 'rect' }, { x: 0.52, y: 0.54, w: 0.32, h: 0.22, shape: 'rect' },
        { x: 0.34, y: 0.76, w: 0.32, h: 0.20, shape: 'diamond' },
      ],
    },
    {
      id: 'sh_diamond_10', cat: 'shapes', key: 'pc_lay_sh_dia10', kind: 'diamond',
      slots: [
        { x: 0.38, y: 0.02, w: 0.24, h: 0.24, shape: 'diamond' },
        { x: 0.25, y: 0.20, w: 0.24, h: 0.24, shape: 'diamond' }, { x: 0.51, y: 0.20, w: 0.24, h: 0.24, shape: 'diamond' },
        { x: 0.12, y: 0.38, w: 0.24, h: 0.24, shape: 'diamond' }, { x: 0.38, y: 0.38, w: 0.24, h: 0.24, shape: 'diamond' }, { x: 0.64, y: 0.38, w: 0.24, h: 0.24, shape: 'diamond' },
        { x: 0.25, y: 0.56, w: 0.24, h: 0.24, shape: 'diamond' }, { x: 0.51, y: 0.56, w: 0.24, h: 0.24, shape: 'diamond' },
        { x: 0.12, y: 0.74, w: 0.24, h: 0.24, shape: 'circle' }, { x: 0.64, y: 0.74, w: 0.24, h: 0.24, shape: 'circle' },
      ],
    },
    {
      id: 'sh_honey_12', cat: 'shapes', key: 'pc_lay_sh_hex12', kind: 'hex',
      slots: [
        { x: 0.02, y: 0.04, w: 0.22, h: 0.29, shape: 'hex' }, { x: 0.26, y: 0.04, w: 0.22, h: 0.29, shape: 'hex' }, { x: 0.52, y: 0.04, w: 0.22, h: 0.29, shape: 'hex' }, { x: 0.76, y: 0.04, w: 0.22, h: 0.29, shape: 'hex' },
        { x: 0.02, y: 0.355, w: 0.22, h: 0.29, shape: 'hex' }, { x: 0.26, y: 0.355, w: 0.22, h: 0.29, shape: 'hex' }, { x: 0.52, y: 0.355, w: 0.22, h: 0.29, shape: 'hex' }, { x: 0.76, y: 0.355, w: 0.22, h: 0.29, shape: 'hex' },
        { x: 0.02, y: 0.67, w: 0.22, h: 0.29, shape: 'hex' }, { x: 0.26, y: 0.67, w: 0.22, h: 0.29, shape: 'hex' }, { x: 0.52, y: 0.67, w: 0.22, h: 0.29, shape: 'hex' }, { x: 0.76, y: 0.67, w: 0.22, h: 0.29, shape: 'hex' },
      ],
    },
  ];

  /* 42 Curated Studio Backgrounds across 4 Groups */
  var BACKGROUNDS = [
    /* 10 Solids */
    { id: 'sol_white',     cat: 'solid',    key: 'pc_bg_sol_white',    c1: '#FFFFFF' },
    { id: 'sol_ivory',     cat: 'solid',    key: 'pc_bg_sol_ivory',    c1: '#FAF7F0' },
    { id: 'sol_alabaster', cat: 'solid',    key: 'pc_bg_sol_alab',     c1: '#F8FAFC' },
    { id: 'sol_gray',      cat: 'solid',    key: 'pc_bg_sol_gray',     c1: '#E2E8F0' },
    { id: 'sol_sand',      cat: 'solid',    key: 'pc_bg_sol_sand',     c1: '#F3EDE2' },
    { id: 'sol_sage',      cat: 'solid',    key: 'pc_bg_sol_sage',     c1: '#E6EFEA' },
    { id: 'sol_blush',     cat: 'solid',    key: 'pc_bg_sol_blush',    c1: '#FCE7F3' },
    { id: 'sol_sky',       cat: 'solid',    key: 'pc_bg_sol_sky',      c1: '#E0F2FE' },
    { id: 'sol_slate',     cat: 'solid',    key: 'pc_bg_sol_slate',    c1: '#CBD5E1' },
    { id: 'sol_charcoal',  cat: 'solid',    key: 'pc_bg_sol_charcoal', c1: '#334155', dark: true },
    /* 12 Aurora Gradients */
    { id: 'grd_morning',   cat: 'gradient', key: 'pc_bg_grd_morning',  c1: '#EFF6FF', c2: '#E0E7FF', c3: '#F5D0FE' },
    { id: 'grd_peach',     cat: 'gradient', key: 'pc_bg_grd_peach',    c1: '#FFF7ED', c2: '#FFEDD5', c3: '#FECDD3' },
    { id: 'grd_nordic',    cat: 'gradient', key: 'pc_bg_grd_nordic',   c1: '#E0F2FE', c2: '#F1F5F9', c3: '#DBEAFE' },
    { id: 'grd_lavender',  cat: 'gradient', key: 'pc_bg_grd_lavender', c1: '#EDE9FE', c2: '#F5F3FF', c3: '#FCE7F3' },
    { id: 'grd_mint',      cat: 'gradient', key: 'pc_bg_grd_mint',     c1: '#DCFCE7', c2: '#CCFBF1', c3: '#E0F2FE' },
    { id: 'grd_rose',      cat: 'gradient', key: 'pc_bg_grd_rose',     c1: '#FFE4E6', c2: '#FBCFE8', c3: '#F5D0FE' },
    { id: 'grd_champ',     cat: 'gradient', key: 'pc_bg_grd_champ',    c1: '#FEF9C3', c2: '#FDE68A', c3: '#FED7AA' },
    { id: 'grd_ocean',     cat: 'gradient', key: 'pc_bg_grd_ocean',    c1: '#E0F2FE', c2: '#BAE6FD', c3: '#A5F3FC' },
    { id: 'grd_golden',    cat: 'gradient', key: 'pc_bg_grd_golden',   c1: '#FEF3C7', c2: '#FDBA74', c3: '#FCA5A5' },
    { id: 'grd_coral',     cat: 'gradient', key: 'pc_bg_grd_coral',    c1: '#FFEDD5', c2: '#FDA4AF', c3: '#F9A8D4' },
    { id: 'grd_indigo',    cat: 'gradient', key: 'pc_bg_grd_indigo',   c1: '#312E81', c2: '#4F46E5', c3: '#0EA5E9', dark: true },
    { id: 'grd_emerald',   cat: 'gradient', key: 'pc_bg_grd_emerald',  c1: '#064E3B', c2: '#059669', c3: '#34D399', dark: true },
    /* 10 Paper & Marble Textures */
    { id: 'tex_linen',     cat: 'texture',  key: 'pc_bg_tex_linen',    kind: 'linen',    c1: '#F1ECE1', c2: '#E2D9C8' },
    { id: 'tex_paper',     cat: 'texture',  key: 'pc_bg_tex_paper',    kind: 'paper',    c1: '#FAF8F5', c2: '#EFECE6' },
    { id: 'tex_marble',    cat: 'texture',  key: 'pc_bg_tex_marble',   kind: 'marble',   c1: '#F8FAFC', c2: '#CBD5E1' },
    { id: 'tex_terrazzo',  cat: 'texture',  key: 'pc_bg_tex_terrazzo', kind: 'terrazzo', c1: '#F7F4EE', c2: '#E6DFD3' },
    { id: 'tex_kraft',     cat: 'texture',  key: 'pc_bg_tex_kraft',    kind: 'kraft',    c1: '#D6B78D', c2: '#BC9667' },
    { id: 'tex_concrete',  cat: 'texture',  key: 'pc_bg_tex_concrete', kind: 'concrete', c1: '#E2E8F0', c2: '#CBD5E1' },
    { id: 'tex_oak',       cat: 'texture',  key: 'pc_bg_tex_oak',      kind: 'wood',     c1: '#D8B184', c2: '#B58453' },
    { id: 'tex_grid',      cat: 'texture',  key: 'pc_bg_tex_grid',     kind: 'grid',     c1: '#F8FAFC', c2: '#E2E8F0' },
    { id: 'tex_dots',      cat: 'texture',  key: 'pc_bg_tex_dots',     kind: 'dots',     c1: '#F1F5F9', c2: '#CBD5E1' },
    { id: 'tex_cork',      cat: 'texture',  key: 'pc_bg_tex_cork',     kind: 'cork',     c1: '#C89B6E', c2: '#A9784C' },
    /* 10 Dark Editorial */
    { id: 'drk_obsidian',  cat: 'dark',     key: 'pc_bg_drk_obsidian', c1: '#09090B', c2: '#18181B', c3: '#27272A', dark: true },
    { id: 'drk_indigo',    cat: 'dark',     key: 'pc_bg_drk_indigo',   c1: '#0B1026', c2: '#1E3A8A', c3: '#312E81', dark: true },
    { id: 'drk_pitch',     cat: 'dark',     key: 'pc_bg_drk_pitch',    c1: '#020617', c2: '#0F172A', c3: '#1E293B', dark: true },
    { id: 'drk_crimson',   cat: 'dark',     key: 'pc_bg_drk_crimson',  c1: '#1F070D', c2: '#4C0519', c3: '#881337', dark: true },
    { id: 'drk_navy',      cat: 'dark',     key: 'pc_bg_drk_navy',     c1: '#020617', c2: '#172554', c3: '#1D4ED8', dark: true },
    { id: 'drk_cyber',     cat: 'dark',     key: 'pc_bg_drk_cyber',    c1: '#042F2E', c2: '#0F172A', c3: '#0891B2', dark: true },
    { id: 'drk_bronze',    cat: 'dark',     key: 'pc_bg_drk_bronze',   c1: '#1C1917', c2: '#451A03', c3: '#B45309', dark: true },
    { id: 'drk_emerald',   cat: 'dark',     key: 'pc_bg_drk_emerald',  c1: '#022C22', c2: '#064E3B', c3: '#047857', dark: true },
    { id: 'drk_violet',    cat: 'dark',     key: 'pc_bg_drk_violet',   c1: '#1E1B4B', c2: '#4C1D95', c3: '#6D28D9', dark: true },
    { id: 'drk_carbon',    cat: 'dark',     key: 'pc_bg_drk_carbon',   c1: '#111827', c2: '#1F2937', c3: '#374151', dark: true },
  ];

  var FILTER_CSS = {
    none:      'none',
    warm:      'sepia(0.28) saturate(1.22) brightness(1.04) contrast(1.03)',
    vivid:     'saturate(1.42) contrast(1.12) brightness(1.03)',
    cinematic: 'contrast(1.18) saturate(0.88) brightness(0.95) sepia(0.12)',
    vintage:   'sepia(0.42) contrast(0.92) brightness(1.05) saturate(0.82)',
    bw:        'grayscale(1) contrast(1.16) brightness(1.03)',
  };

  /* ----- DOM References ----- */
  var pcActiveLayoutLabel = $('#pcActiveLayoutLabel');
  var pcSpecMeta = $('#pcSpecMeta');
  var btnPcTopUpload = $('#btnPcTopUpload');
  var btnPcTopShuffle = $('#btnPcTopShuffle');
  var btnPcOpenExportModal = $('#btnPcOpenExportModal');
  var aspectBtns = $$('.pc-aspect-btn[data-aspect]', $('#pcAspectBar'));

  var pcPhotosInput = $('#pcPhotosInput');
  var pcReplaceInput = $('#pcReplaceInput');
  var pcCustomBgInput = $('#pcCustomBgInput');

  var pcViewport = $('#pcViewport');
  var pcCanvasWrap = $('#pcCanvasWrap');
  var pcPreviewCanvas = $('#pcPreviewCanvas');

  var btnPcMqExport = $('#btnPcMqExport');
  var btnPcMqUpload = $('#btnPcMqUpload');
  var btnPcMqShuffle = $('#btnPcMqShuffle');
  var btnPcMqUndo = $('#btnPcMqUndo');

  var btnPcStageShuffle = $('#btnPcStageShuffle');
  var btnPcResetSlots = $('#btnPcResetSlots');
  var btnPcUndo = $('#btnPcUndo');
  var btnPcRedo = $('#btnPcRedo');
  var btnPcClearAll = $('#btnPcClearAll');

  var dockTabs = $$('.pc-dock-tab');
  var dockPanes = $$('.pc-step-pane');

  var pcPhotoCountBadge = $('#pcPhotoCountBadge');
  var btnPcDockUpload = $('#btnPcDockUpload');
  var btnPcDockShuffle = $('#btnPcDockShuffle');
  var pcPhotoStrip = $('#pcPhotoStrip');

  var pcSlotPanel = $('#pcSlotPanel');
  var pcSlotTitle = $('#pcSlotTitle');
  var btnPcSwapMode = $('#btnPcSwapMode');
  var btnPcSlotClear = $('#btnPcSlotClear');
  var pcSlotZoom = $('#pcSlotZoom');
  var pcSlotZoomVal = $('#pcSlotZoomVal');
  var btnPcSlotRotate = $('#btnPcSlotRotate');
  var btnPcSlotFlip = $('#btnPcSlotFlip');
  var btnPcSlotReplace = $('#btnPcSlotReplace');

  var pcMatchCountToggle = $('#pcMatchCountToggle');
  var layoutCatBtns = $$('.pc-chip-btn[data-lcat]', $('#pcLayoutCatRow'));
  var pcLayoutGrid = $('#pcLayoutGrid');

  var pcGapRange = $('#pcGapRange');
  var pcGapVal = $('#pcGapVal');
  var pcPadRange = $('#pcPadRange');
  var pcPadVal = $('#pcPadVal');
  var pcRadiusRange = $('#pcRadiusRange');
  var pcRadiusVal = $('#pcRadiusVal');
  var pcFrameShadowToggle = $('#pcFrameShadowToggle');

  var btnPcTransparent = $('#btnPcTransparent');
  var bgCatBtns = $$('.pc-chip-btn[data-bgcat]', $('#pcBgCatRow'));
  var pcBgGrid = $('#pcBgGrid');
  var btnPcUploadBg = $('#btnPcUploadBg');
  var btnPcClearBg = $('#btnPcClearBg');

  var filterScopeBtns = $$('.pc-chip-btn[data-fscope]', $('#pcFilterScopeRow'));
  var filterBtns = $$('.pc-filter-btn[data-filter]', $('#pcFilterGrid'));
  var textPosBtns = $$('.pc-chip-btn[data-tpos]', $('#pcTextPosRow'));
  var pcTitleInput = $('#pcTitleInput');
  var pcSubInput = $('#pcSubInput');
  var btnPcPickFont = $('#btnPcPickFont');
  var pcFontName = $('#pcFontName');
  var pcTextColor = $('#pcTextColor');
  var pcTextSizeRange = $('#pcTextSizeRange');
  var pcTextSizeVal = $('#pcTextSizeVal');

  var pcFontModal = $('#pcFontModal');
  var btnPcCloseFontModal = $('#btnPcCloseFontModal');
  var pcFontList = $('#pcFontList');

  var pcExportModal = $('#pcExportModal');
  var btnPcCloseExportModal = $('#btnPcCloseExportModal');
  var scaleBtns = $$('.pc-chip-btn[data-scale]', $('#pcScaleRow'));
  var pdfPaperBtns = $$('.pc-chip-btn[data-paper]', $('#pcPdfPaperRow'));
  var pcExportSummary = $('#pcExportSummary');
  var btnPcExportPng = $('#btnPcExportPng');
  var btnPcExportJpg = $('#btnPcExportJpg');
  var btnPcExportPdf = $('#btnPcExportPdf');

  /* ----- Offscreen Canvases & Resources ----- */
  var demoCanvases = [];
  var activeObjectUrls = new Set();
  var loadedFonts = new Set();

  function createEmptySlotState(photoIdx) {
    return {
      photoIdx: photoIdx,
      panX: 0,
      panY: 0,
      zoom: 100,
      rot: 0,
      flipX: false,
      filter: 'inherit',
    };
  }

  /* ----- Studio State ----- */
  var state = {
    aspect: '1:1',
    exportScale: 2,
    pdfPaper: 'a4',

    layoutCat: 'all',
    matchCount: false,
    layoutId: 'g_2x2',

    gapPx: 14,
    padPx: 24,
    radiusPx: 14,
    frameShadow: true,

    bgCat: 'all',
    bgId: 'sol_white',
    transparentBg: false,
    customBgImg: null,

    globalFilter: 'none',
    filterScope: 'global',

    textPos: 'none',
    titleText: '',
    subText: '',
    fontId: 'cairo',
    textColor: '#0F172A',
    textSize: 46,

    photos: [], // { img, thumbUrl, name, isDemo }
    slots: [0, 1, 2, 3].map(function (i) { return createEmptySlotState(i); }),
    selectedSlot: 0,
    swapSourceSlot: -1,
    lastLayoutComputed: [],
    loadGenBg: 0,
  };

  var undoStack = [];
  var redoStack = [];
  var renderRaf = 0;
  var replaceTargetSlot = -1;
  var activePointers = new Map();
  var isPanning = false;
  var panStartClient = { x: 0, y: 0 };
  var panStartValues = { x: 0, y: 0 };
  var pinchStartDist = 0;
  var pinchStartZoom = 100;
  var dragUndoPushed = false;
  var wheelUndoTimer = 0;

  /* ----- Helpers ----- */
  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function sanitizeHex(hex, fallback) {
    var s = String(hex || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : (fallback || '#0F172A');
  }

  function sanitizeFilenameBase(name) {
    var base = String(name || 'photo-collage').replace(/\.[^.]+$/, '');
    base = base.replace(/[\/\\:*?"<>|\x00-\x1F]+/g, '_').replace(/^\.+|\.+$/g, '').trim();
    return base || 'photo-collage';
  }

  function cleanupCanvas(c) {
    if (!c) return;
    try {
      var ctx = c.getContext('2d');
      if (ctx && c.width && c.height) ctx.clearRect(0, 0, c.width, c.height);
      c.width = 0;
      c.height = 0;
    } catch (_e) {}
  }

  function revokeUrl(url) {
    if (!url) return;
    try { URL.revokeObjectURL(url); } catch (_e) {}
    activeObjectUrls.delete(url);
  }

  function revokeAllObjectUrls() {
    activeObjectUrls.forEach(function (u) {
      try { URL.revokeObjectURL(u); } catch (_e) {}
    });
    activeObjectUrls.clear();
  }

  function getLayoutObj(id) {
    for (var i = 0; i < LAYOUTS.length; i++) {
      if (LAYOUTS[i].id === id) return LAYOUTS[i];
    }
    return LAYOUTS[3]; // g_2x2 fallback
  }

  function getBgObj(id) {
    for (var i = 0; i < BACKGROUNDS.length; i++) {
      if (BACKGROUNDS[i].id === id) return BACKGROUNDS[i];
    }
    return BACKGROUNDS[0];
  }

  function getFontObj(id) {
    for (var i = 0; i < FONT_LIBRARY.length; i++) {
      if (FONT_LIBRARY[i].id === id) return FONT_LIBRARY[i];
    }
    return FONT_LIBRARY[0];
  }

  function ensureFontLoaded(fontObj) {
    if (!fontObj || loadedFonts.has(fontObj.id) || !document.fonts || !document.fonts.load) return;
    loadedFonts.add(fontObj.id);
    try {
      document.fonts.load(fontObj.weight + ' 32px "' + fontObj.family + '"').then(function () {
        scheduleRender();
      }).catch(function () {});
    } catch (_e) {}
  }

  function syncDocumentMeta() {
    document.title = t('t_collage_t') + ' — imgsfix';
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', t('pc_meta_desc'));
  }

  /* ----- Strict SVG Sanitizer ----- */
  function resolveImageMime(file) {
    var mime = String(file && file.type ? file.type : '').toLowerCase();
    if (!mime && file && file.name && /\.svg$/i.test(file.name)) return 'image/svg+xml';
    return mime;
  }

  function containsUnsafeCssValue(val) {
    if (!val) return false;
    var v = String(val).toLowerCase();
    return v.indexOf('url(') !== -1 || v.indexOf('expression(') !== -1 || v.indexOf('javascript:') !== -1 || v.indexOf('@import') !== -1;
  }

  function sanitizeSvgNode(el) {
    var tag = el.tagName ? el.tagName.toLowerCase() : '';
    if (DANGEROUS_SVG_TAGS[tag]) {
      if (el.parentNode) el.parentNode.removeChild(el);
      return;
    }
    if (tag === 'style' && containsUnsafeCssValue(el.textContent || '')) {
      if (el.parentNode) el.parentNode.removeChild(el);
      return;
    }
    var attrs = Array.prototype.slice.call(el.attributes || []);
    attrs.forEach(function (attr) {
      var name = attr.name.toLowerCase();
      var val = String(attr.value || '').trim();
      var low = val.toLowerCase();
      if (name.indexOf('on') === 0 || (name === 'style' && containsUnsafeCssValue(val))) {
        el.removeAttribute(attr.name);
        return;
      }
      if ((name === 'href' || name === 'xlink:href' || name === 'src') && (/^(javascript:|data:text|https?:\/\/|\/\/)/i.test(low) || (low.indexOf('#') !== 0 && low.indexOf('data:image/') !== 0))) {
        el.removeAttribute(attr.name);
      }
    });
    Array.prototype.slice.call(el.children || []).forEach(sanitizeSvgNode);
  }

  function sanitizeSvgFileToBlobUrl(file) {
    return file.text().then(function (rawText) {
      var doc = new DOMParser().parseFromString(rawText, 'image/svg+xml');
      if (!doc || !doc.documentElement || doc.querySelector('parsererror') || doc.documentElement.tagName.toLowerCase() !== 'svg') {
        throw new Error('Invalid SVG');
      }
      sanitizeSvgNode(doc.documentElement);
      var serialized = new XMLSerializer().serializeToString(doc.documentElement);
      return URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml' }));
    });
  }

  function makeSafeThumbDataUrl(img) {
    var c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    try {
      var ctx = c.getContext('2d');
      var sw = img.naturalWidth || img.width || 96;
      var sh = img.naturalHeight || img.height || 96;
      var sc = Math.max(96 / sw, 96 / sh);
      var dw = sw * sc, dh = sh * sc;
      ctx.drawImage(img, (96 - dw) * 0.5, (96 - dh) * 0.5, dw, dh);
      var url = c.toDataURL('image/jpeg', 0.8);
      cleanupCanvas(c);
      return url;
    } catch (_e) {
      cleanupCanvas(c);
      return '';
    }
  }

  function decodeSafeImageFile(file) {
    return new Promise(function (resolve, reject) {
      var mime = resolveImageMime(file);
      if (!ALLOWED_MIMES[mime]) {
        reject(new Error('ms_err_type'));
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        reject(new Error('ms_err_size'));
        return;
      }

      function decodeUrl(url) {
        activeObjectUrls.add(url);
        var img = new Image();
        img.onload = function () {
          revokeUrl(url);
          var nw = img.naturalWidth || img.width;
          var nh = img.naturalHeight || img.height;
          if (!nw || !nh || nw > MAX_IMAGE_DIM || nh > MAX_IMAGE_DIM) {
            reject(new Error('ms_err_dims'));
            return;
          }
          resolve({ img: img, thumbUrl: makeSafeThumbDataUrl(img), name: sanitizeFilenameBase(file.name), isDemo: false });
        };
        img.onerror = function () {
          revokeUrl(url);
          reject(new Error('ms_err_type'));
        };
        img.src = url;
      }

      if (mime === 'image/svg+xml') {
        sanitizeSvgFileToBlobUrl(file).then(decodeUrl).catch(function () {
          reject(new Error('ms_err_type'));
        });
      } else {
        decodeUrl(URL.createObjectURL(file));
      }
    });
  }

  /* ----- Procedural Built-In Demo Tiles (Zero Network Requests) ----- */
  function buildDemoPhotos() {
    var palettes = [
      ['#0F172A', '#2563EB', '#38BDF8', '01'],
      ['#7C2D12', '#EA580C', '#FDBA74', '02'],
      ['#064E3B', '#059669', '#6EE7B7', '03'],
      ['#4C1D95', '#7C3AED', '#F472B6', '04'],
      ['#831843', '#DB2777', '#FDA4AF', '05'],
      ['#1E293B', '#0284C7', '#7DD3FC', '06'],
    ];
    demoCanvases.forEach(cleanupCanvas);
    demoCanvases = [];
    return palettes.map(function (p, idx) {
      var c = document.createElement('canvas');
      c.width = 640;
      c.height = 640;
      var ctx = c.getContext('2d');
      var g = ctx.createLinearGradient(0, 0, 640, 640);
      g.addColorStop(0, p[0]);
      g.addColorStop(0.55, p[1]);
      g.addColorStop(1, p[2]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 640, 640);

      /* Abstract Sun & Horizon Art */
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.beginPath();
      ctx.arc(460, 180, 95, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(15,23,42,0.22)';
      ctx.beginPath();
      ctx.moveTo(0, 470);
      ctx.quadraticCurveTo(210, 350, 420, 445);
      ctx.quadraticCurveTo(540, 495, 640, 410);
      ctx.lineTo(640, 640);
      ctx.lineTo(0, 640);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = '800 54px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p[3], 320, 310);
      ctx.font = '600 24px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.fillText('IMGSFIX COLLAGE', 320, 368);

      demoCanvases.push(c);
      return {
        img: c,
        thumbUrl: c.toDataURL('image/jpeg', 0.8),
        name: 'demo-' + (idx + 1),
        isDemo: true,
      };
    });
  }

  /* ----- Undo / Redo Snapshots ----- */
  function cloneSlots(arr) {
    return arr.map(function (s) {
      return {
        photoIdx: s.photoIdx,
        panX: s.panX,
        panY: s.panY,
        zoom: s.zoom,
        rot: s.rot,
        flipX: Boolean(s.flipX),
        filter: s.filter || 'inherit',
      };
    });
  }

  function captureSnapshot() {
    return {
      aspect: state.aspect,
      layoutId: state.layoutId,
      gapPx: state.gapPx,
      padPx: state.padPx,
      radiusPx: state.radiusPx,
      frameShadow: state.frameShadow,
      bgId: state.bgId,
      transparentBg: state.transparentBg,
      globalFilter: state.globalFilter,
      textPos: state.textPos,
      titleText: state.titleText,
      subText: state.subText,
      fontId: state.fontId,
      textColor: state.textColor,
      textSize: state.textSize,
      slots: cloneSlots(state.slots),
      selectedSlot: state.selectedSlot,
    };
  }

  function applySnapshot(snap) {
    if (!snap) return;
    Object.keys(snap).forEach(function (k) {
      if (k === 'slots') {
        state.slots = cloneSlots(snap.slots);
      } else {
        state[k] = snap[k];
      }
    });
    state.swapSourceSlot = -1;
    syncSlotArrayToLayout();
    syncAllUI();
    scheduleRender();
  }

  function pushUndo() {
    undoStack.push(captureSnapshot());
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
    syncUndoButtons();
  }

  function handleUndo() {
    if (!undoStack.length) return;
    redoStack.push(captureSnapshot());
    applySnapshot(undoStack.pop());
  }

  function handleRedo() {
    if (!redoStack.length) return;
    undoStack.push(captureSnapshot());
    applySnapshot(redoStack.pop());
  }

  function syncUndoButtons() {
    var canUndo = undoStack.length > 0;
    var canRedo = redoStack.length > 0;
    if (btnPcUndo) btnPcUndo.disabled = !canUndo;
    if (btnPcMqUndo) btnPcMqUndo.disabled = !canUndo;
    if (btnPcRedo) btnPcRedo.disabled = !canRedo;
  }

  function syncSlotArrayToLayout() {
    var layout = getLayoutObj(state.layoutId);
    var n = layout.slots.length;
    var pCount = Math.max(1, state.photos.length);
    while (state.slots.length < n) {
      var idx = state.slots.length;
      state.slots.push(createEmptySlotState(idx % pCount));
    }
    if (state.slots.length > n) {
      state.slots.length = n;
    }
    state.slots.forEach(function (s, i) {
      if (s.photoIdx >= state.photos.length) {
        s.photoIdx = state.photos.length ? (i % state.photos.length) : -1;
      }
    });
    state.selectedSlot = clamp(state.selectedSlot, 0, Math.max(0, n - 1));
  }

  /* ----- Canvas Shape & Background Drawing ----- */
  function drawRoundedRectPath(ctx, x, y, w, h, r) {
    var rad = clamp(r, 0, Math.min(w, h) * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }

  function traceSlotClipPath(ctx, slotGeo, radiusPx) {
    var x = slotGeo.x, y = slotGeo.y, w = slotGeo.w, h = slotGeo.h;
    if (slotGeo.shape === 'poly' && slotGeo.poly) {
      ctx.beginPath();
      slotGeo.poly.forEach(function (pt, idx) {
        var px = x + pt[0] * w;
        var py = y + pt[1] * h;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      return;
    }
    if (slotGeo.shape === 'circle') {
      var r = Math.min(w, h) * 0.5;
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.5, r, 0, Math.PI * 2);
      ctx.closePath();
      return;
    }
    if (slotGeo.shape === 'hex') {
      var cx = x + w * 0.5, cy = y + h * 0.5;
      var rx = w * 0.5, ry = h * 0.5;
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var ang = (Math.PI / 3) * i - Math.PI / 2;
        var hx = cx + rx * Math.cos(ang);
        var hy = cy + ry * Math.sin(ang);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      return;
    }
    if (slotGeo.shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y);
      ctx.lineTo(x + w, y + h * 0.5);
      ctx.lineTo(x + w * 0.5, y + h);
      ctx.lineTo(x, y + h * 0.5);
      ctx.closePath();
      return;
    }
    if (slotGeo.shape === 'arch') {
      var ar = w * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + ar);
      ctx.arc(x + ar, y + ar, ar, Math.PI, 0, false);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      return;
    }
    drawRoundedRectPath(ctx, x, y, w, h, radiusPx);
  }

  function renderCollageBackground(ctx, W, H) {
    if (state.transparentBg) {
      ctx.clearRect(0, 0, W, H);
      return;
    }
    if (state.customBgImg) {
      var iw = state.customBgImg.naturalWidth || state.customBgImg.width || W;
      var ih = state.customBgImg.naturalHeight || state.customBgImg.height || H;
      var sc = Math.max(W / iw, H / ih);
      ctx.drawImage(state.customBgImg, (W - iw * sc) * 0.5, (H - ih * sc) * 0.5, iw * sc, ih * sc);
      return;
    }

    var bg = getBgObj(state.bgId);
    if (bg.cat === 'solid') {
      ctx.fillStyle = bg.c1;
      ctx.fillRect(0, 0, W, H);
      return;
    }
    if (bg.cat === 'gradient' || bg.cat === 'dark') {
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, bg.c1);
      g.addColorStop(0.55, bg.c2);
      g.addColorStop(1, bg.c3);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    /* Textures */
    var tg = ctx.createLinearGradient(0, 0, 0, H);
    tg.addColorStop(0, bg.c1);
    tg.addColorStop(1, bg.c2);
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (bg.kind === 'grid') {
      var step = Math.max(20, Math.round(Math.min(W, H) * 0.055));
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
      ctx.lineWidth = 1;
      for (var gx = 0; gx < W; gx += step) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (var gy = 0; gy < H; gy += step) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
    } else if (bg.kind === 'dots') {
      var dStep = Math.max(18, Math.round(Math.min(W, H) * 0.045));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
      for (var dy = dStep * 0.5; dy < H; dy += dStep) {
        for (var dx = dStep * 0.5; dx < W; dx += dStep) {
          ctx.beginPath(); ctx.arc(dx, dy, Math.max(1.5, dStep * 0.08), 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (bg.kind === 'marble') {
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.18)';
      ctx.lineWidth = Math.max(1.5, W * 0.003);
      for (var m = 0; m < 6; m++) {
        ctx.beginPath();
        ctx.moveTo(W * (m * 0.2 - 0.1), 0);
        ctx.bezierCurveTo(W * (m * 0.2 + 0.1), H * 0.4, W * (m * 0.2 - 0.05), H * 0.7, W * (m * 0.2 + 0.18), H);
        ctx.stroke();
      }
    } else if (bg.kind === 'wood') {
      ctx.strokeStyle = 'rgba(120, 68, 28, 0.16)';
      ctx.lineWidth = Math.max(1, W * 0.002);
      for (var wy = 0; wy < H; wy += H * 0.05) {
        ctx.beginPath();
        ctx.moveTo(0, wy);
        ctx.bezierCurveTo(W * 0.35, wy + H * 0.015, W * 0.65, wy - H * 0.015, W, wy + H * 0.005);
        ctx.stroke();
      }
    } else if (bg.kind === 'terrazzo') {
      var chips = [[0.14, 0.2, '#C2410C', 0.014], [0.28, 0.72, '#0F766E', 0.018], [0.72, 0.18, '#1E293B', 0.015], [0.85, 0.65, '#B45309', 0.019], [0.45, 0.14, '#94A3B8', 0.013], [0.62, 0.84, '#BE123C', 0.014]];
      chips.forEach(function (d) {
        ctx.fillStyle = d[2]; ctx.globalAlpha = 0.24;
        ctx.beginPath(); ctx.arc(d[0] * W, d[1] * H, Math.min(W, H) * d[3], 0, Math.PI * 2); ctx.fill();
      });
    } else if (bg.kind === 'linen') {
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.04)';
      ctx.lineWidth = 1;
      for (var lx = 0; lx < W; lx += 8) { ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, H); ctx.stroke(); }
      for (var ly = 0; ly < H; ly += 8) { ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke(); }
    }
    ctx.restore();
  }

  function drawFilmstripBackings(ctx, layout, contentX, contentY, contentW, contentH) {
    if (layout.kind !== 'film') return;
    var drawn = {};
    layout.slots.forEach(function (s) {
      if (!s.stripBox) return;
      var k = [s.stripBox.x, s.stripBox.y, s.stripBox.w, s.stripBox.h].join(':');
      if (drawn[k]) return;
      drawn[k] = true;

      var sx = contentX + s.stripBox.x * contentW;
      var sy = contentY + s.stripBox.y * contentH;
      var sw = s.stripBox.w * contentW;
      var sh = s.stripBox.h * contentH;

      ctx.save();
      if (state.frameShadow) {
        ctx.shadowColor = 'rgba(2, 6, 23, 0.34)';
        ctx.shadowBlur = Math.min(W_last, H_last) * 0.025;
        ctx.shadowOffsetY = Math.min(W_last, H_last) * 0.012;
      }
      ctx.fillStyle = '#111827';
      drawRoundedRectPath(ctx, sx, sy, sw, sh, 8);
      ctx.fill();
      ctx.restore();

      /* 35mm Sprocket Perforation Holes */
      ctx.fillStyle = '#E2E8F0';
      if (s.stripBox.vert) {
        var holeW = sw * 0.075, holeH = holeW * 1.35;
        for (var hy = sy + holeH; hy < sy + sh - holeH; hy += holeH * 1.9) {
          drawRoundedRectPath(ctx, sx + sw * 0.04, hy, holeW, holeH, 3);
          ctx.fill();
          drawRoundedRectPath(ctx, sx + sw - sw * 0.04 - holeW, hy, holeW, holeH, 3);
          ctx.fill();
        }
      } else {
        var hHoleH = sh * 0.075, hHoleW = hHoleH * 1.35;
        for (var hx = sx + hHoleW; hx < sx + sw - hHoleW; hx += hHoleW * 1.9) {
          drawRoundedRectPath(ctx, hx, sy + sh * 0.04, hHoleW, hHoleH, 3);
          ctx.fill();
          drawRoundedRectPath(ctx, hx, sy + sh - sh * 0.04 - hHoleH, hHoleW, hHoleH, 3);
          ctx.fill();
        }
      }
    });
  }

  var W_last = 1000, H_last = 1000;

  function renderCollageToCanvas(targetCanvas, W, H, isExport) {
    if (!targetCanvas) return;
    if (targetCanvas.width !== W || targetCanvas.height !== H) {
      targetCanvas.width = W;
      targetCanvas.height = H;
    }
    W_last = W;
    H_last = H;
    var ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    renderCollageBackground(ctx, W, H);

    var scaleFactor = Math.min(W, H) / 1000;
    var pad = state.padPx * scaleFactor;
    var gap = state.gapPx * scaleFactor;
    var radius = state.radiusPx * scaleFactor;

    /* Reserve room for Top or Bottom Title Banner if active */
    var hasTitle = (state.textPos !== 'none') && Boolean((state.titleText || '').trim() || (state.subText || '').trim());
    var topExtra = (hasTitle && state.textPos === 'top') ? (H * 0.13) : 0;
    var botExtra = (hasTitle && state.textPos === 'bottom') ? (H * 0.13) : 0;

    var contentX = pad;
    var contentY = pad + topExtra;
    var contentW = Math.max(40, W - pad * 2);
    var contentH = Math.max(40, H - pad * 2 - topExtra - botExtra);

    var layout = getLayoutObj(state.layoutId);
    syncSlotArrayToLayout();

    drawFilmstripBackings(ctx, layout, contentX, contentY, contentW, contentH);

    var computedSlots = [];

    layout.slots.forEach(function (tplSlot, idx) {
      var slotState = state.slots[idx] || createEmptySlotState(idx);
      var halfGap = (tplSlot.shape === 'poly' || tplSlot.shape === 'polaroid' || tplSlot.shape === 'film') ? 0 : (gap * 0.5);

      var sx = contentX + tplSlot.x * contentW + halfGap;
      var sy = contentY + tplSlot.y * contentH + halfGap;
      var sw = Math.max(8, tplSlot.w * contentW - halfGap * 2);
      var sh = Math.max(8, tplSlot.h * contentH - halfGap * 2);
      var cx = sx + sw * 0.5;
      var cy = sy + sh * 0.5;
      var rot = tplSlot.rot || 0;

      computedSlots.push({ idx: idx, x: sx, y: sy, w: sw, h: sh, cx: cx, cy: cy, rot: rot, shape: tplSlot.shape || 'rect', poly: tplSlot.poly || null });

      ctx.save();
      ctx.translate(cx, cy);
      if (rot !== 0) ctx.rotate((rot * Math.PI) / 180);

      var localBox = {
        x: -sw * 0.5,
        y: -sh * 0.5,
        w: sw,
        h: sh,
        shape: tplSlot.shape || 'rect',
        poly: tplSlot.poly || null,
      };

      /* Optional Polaroid Card Frame Mat */
      var photoBox = localBox;
      if (tplSlot.shape === 'polaroid') {
        var mSide = Math.min(sw, sh) * 0.065;
        var mBot = Math.min(sw, sh) * 0.21;
        ctx.save();
        if (state.frameShadow) {
          ctx.shadowColor = 'rgba(2, 6, 23, 0.26)';
          ctx.shadowBlur = Math.min(W, H) * 0.022;
          ctx.shadowOffsetY = Math.min(W, H) * 0.010;
        }
        ctx.fillStyle = '#FFFFFF';
        drawRoundedRectPath(ctx, localBox.x, localBox.y, sw, sh, Math.min(radius, 12 * scaleFactor));
        ctx.fill();
        ctx.restore();

        photoBox = {
          x: localBox.x + mSide,
          y: localBox.y + mSide,
          w: Math.max(8, sw - mSide * 2),
          h: Math.max(8, sh - mSide - mBot),
          shape: 'rect',
          poly: null,
        };
      } else if (tplSlot.borderCard || (state.frameShadow && layout.kind !== 'poly' && layout.kind !== 'film')) {
        ctx.save();
        ctx.shadowColor = 'rgba(2, 6, 23, 0.22)';
        ctx.shadowBlur = Math.min(W, H) * 0.018;
        ctx.shadowOffsetY = Math.min(W, H) * 0.008;
        ctx.fillStyle = tplSlot.borderCard ? '#FFFFFF' : '#E2E8F0';
        traceSlotClipPath(ctx, localBox, radius);
        ctx.fill();
        ctx.restore();
      }

      if (tplSlot.borderCard) {
        var bPad = Math.min(sw, sh) * 0.04;
        photoBox = {
          x: localBox.x + bPad,
          y: localBox.y + bPad,
          w: Math.max(8, sw - bPad * 2),
          h: Math.max(8, sh - bPad * 2),
          shape: 'rect',
          poly: null,
        };
      }

      /* Clip Frame & Draw Photo */
      ctx.save();
      traceSlotClipPath(ctx, photoBox, tplSlot.shape === 'polaroid' ? 2 : radius);
      ctx.clip();

      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h);

      var photoObj = (slotState.photoIdx >= 0 && state.photos[slotState.photoIdx]) ? state.photos[slotState.photoIdx] : null;
      if (photoObj && photoObj.img) {
        var img = photoObj.img;
        var iw = img.naturalWidth || img.width || 400;
        var ih = img.naturalHeight || img.height || 400;

        /* Account for bounding box of polygon when shape === 'poly' */
        var targetX = photoBox.x, targetY = photoBox.y, targetW = photoBox.w, targetH = photoBox.h;
        if (photoBox.shape === 'poly' && photoBox.poly) {
          var minPx = 1, minPy = 1, maxPx = 0, maxPy = 0;
          photoBox.poly.forEach(function (pt) {
            if (pt[0] < minPx) minPx = pt[0];
            if (pt[1] < minPy) minPy = pt[1];
            if (pt[0] > maxPx) maxPx = pt[0];
            if (pt[1] > maxPy) maxPy = pt[1];
          });
          targetX = photoBox.x + minPx * photoBox.w;
          targetY = photoBox.y + minPy * photoBox.h;
          targetW = Math.max(8, (maxPx - minPx) * photoBox.w);
          targetH = Math.max(8, (maxPy - minPy) * photoBox.h);
        }

        var rot90 = (Math.abs(slotState.rot) % 180) === 90;
        var effW = rot90 ? ih : iw;
        var effH = rot90 ? iw : ih;
        var baseScale = Math.max(targetW / effW, targetH / effH);
        var drawScale = baseScale * (slotState.zoom / 100);

        var activeFilter = (slotState.filter && slotState.filter !== 'inherit') ? slotState.filter : state.globalFilter;
        var cssFilter = FILTER_CSS[activeFilter] || 'none';
        if (typeof ctx.filter !== 'undefined') ctx.filter = cssFilter;

        ctx.save();
        ctx.translate(
          targetX + targetW * 0.5 + (slotState.panX / 100) * targetW * 0.5,
          targetY + targetH * 0.5 + (slotState.panY / 100) * targetH * 0.5
        );
        if (slotState.rot) ctx.rotate((slotState.rot * Math.PI) / 180);
        if (slotState.flipX) ctx.scale(-1, 1);
        ctx.drawImage(img, -iw * drawScale * 0.5, -ih * drawScale * 0.5, iw * drawScale, ih * drawScale);
        ctx.restore();
        if (typeof ctx.filter !== 'undefined') ctx.filter = 'none';
      } else {
        /* Clean Empty Slot Placeholder */
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h);
        ctx.fillStyle = '#475569';
        ctx.font = '700 ' + Math.round(Math.min(photoBox.w, photoBox.h) * 0.16) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+' + (idx + 1), photoBox.x + photoBox.w * 0.5, photoBox.y + photoBox.h * 0.5);
      }
      ctx.restore();

      /* Preview-Only Selection / Swap Outline (NEVER rendered on final export!) */
      if (!isExport && (idx === state.selectedSlot || idx === state.swapSourceSlot)) {
        ctx.save();
        traceSlotClipPath(ctx, localBox, tplSlot.shape === 'polaroid' ? Math.min(radius, 12 * scaleFactor) : radius);
        ctx.lineWidth = Math.max(3, 3.5 * scaleFactor);
        ctx.setLineDash(idx === state.swapSourceSlot ? [8 * scaleFactor, 6 * scaleFactor] : []);
        ctx.strokeStyle = idx === state.swapSourceSlot ? '#F59E0B' : '#1A5FFF';
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    });

    state.lastLayoutComputed = computedSlots;

    /* Typography Title / Caption Overlay */
    if (hasTitle) {
      renderTitleOverlay(ctx, W, H, topExtra, botExtra);
    }
  }

  function renderTitleOverlay(ctx, W, H, topExtra, botExtra) {
    var title = (state.titleText || '').trim();
    var sub = (state.subText || '').trim();
    if (!title && !sub) return;

    var fontObj = getFontObj(state.fontId);
    ensureFontLoaded(fontObj);
    var col = sanitizeHex(state.textColor, '#0F172A');
    var sc = Math.min(W, H) / 1000;
    var fSize = Math.round(clamp(state.textSize * sc, 16, 180));

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (state.textPos === 'center') {
      var boxW = Math.min(W * 0.72, Math.max(W * 0.36, Math.max(title.length, sub.length) * fSize * 0.62));
      var boxH = sub ? (fSize * 2.55) : (fSize * 1.75);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.shadowColor = 'rgba(2, 6, 23, 0.25)';
      ctx.shadowBlur = 18 * sc;
      drawRoundedRectPath(ctx, W * 0.5 - boxW * 0.5, H * 0.5 - boxH * 0.5, boxW, boxH, 16 * sc);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    var centerY = H * 0.5;
    if (state.textPos === 'top') centerY = Math.max(fSize * 0.7, topExtra * 0.56);
    else if (state.textPos === 'bottom') centerY = H - Math.max(fSize * 0.7, botExtra * 0.56);

    ctx.fillStyle = col;
    ctx.font = fontObj.weight + ' ' + fSize + 'px ' + fontObj.css;
    if (title) {
      ctx.fillText(title, W * 0.5, sub ? (centerY - fSize * 0.32) : centerY, W * 0.88);
    }
    if (sub) {
      ctx.globalAlpha = 0.78;
      ctx.font = '600 ' + Math.round(fSize * 0.48) + 'px ' + fontObj.css;
      ctx.fillText(sub, W * 0.5, title ? (centerY + fSize * 0.44) : centerY, W * 0.84);
    }
    ctx.restore();
  }

  function renderPreview() {
    var asp = ASPECT_SPECS[state.aspect] || ASPECT_SPECS['1:1'];
    renderCollageToCanvas(pcPreviewCanvas, asp.w, asp.h, false);
  }

  function scheduleRender() {
    if (renderRaf) return;
    renderRaf = requestAnimationFrame(function () {
      renderRaf = 0;
      renderPreview();
    });
  }

  /* ----- Hit Testing Canvas Coordinates to Collage Slot Index ----- */
  function pointInPolygon(px, py, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1];
      var xj = pts[j][0], yj = pts[j][1];
      var intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function findSlotAtCanvasPoint(cx, cy) {
    var slots = state.lastLayoutComputed || [];
    for (var i = slots.length - 1; i >= 0; i--) {
      var s = slots[i];
      var dx = cx - s.cx;
      var dy = cy - s.cy;
      if (s.rot) {
        var rad = (-s.rot * Math.PI) / 180;
        var cos = Math.cos(rad), sin = Math.sin(rad);
        var rx = dx * cos - dy * sin;
        var ry = dx * sin + dy * cos;
        dx = rx;
        dy = ry;
      }
      var halfW = s.w * 0.5, halfH = s.h * 0.5;
      if (dx >= -halfW && dx <= halfW && dy >= -halfH && dy <= halfH) {
        if (s.shape === 'poly' && s.poly) {
          var nx = (dx + halfW) / Math.max(1, s.w);
          var ny = (dy + halfH) / Math.max(1, s.h);
          if (pointInPolygon(nx, ny, s.poly)) return s.idx;
        } else {
          return s.idx;
        }
      }
    }
    return -1;
  }

  function clientToCanvasPoint(clientX, clientY) {
    if (!pcPreviewCanvas) return { x: 0, y: 0 };
    var rect = pcPreviewCanvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / Math.max(1, rect.width)) * pcPreviewCanvas.width,
      y: ((clientY - rect.top) / Math.max(1, rect.height)) * pcPreviewCanvas.height,
    };
  }

  /* ----- Dynamic UI Builders (Strict Zero innerHTML) ----- */
  function createLayoutMiniSvg(layout) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'pc-layout-svg');
    svg.setAttribute('aria-hidden', 'true');

    var bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('x', '2');
    bg.setAttribute('y', '2');
    bg.setAttribute('width', '96');
    bg.setAttribute('height', '96');
    bg.setAttribute('rx', '8');
    bg.setAttribute('fill', 'none');
    bg.setAttribute('stroke', 'currentColor');
    bg.setAttribute('stroke-opacity', '0.28');
    bg.setAttribute('stroke-width', '2');
    svg.appendChild(bg);

    layout.slots.forEach(function (s) {
      var pad = 6;
      var x = pad + s.x * 88 + 1.5;
      var y = pad + s.y * 88 + 1.5;
      var w = Math.max(4, s.w * 88 - 3);
      var h = Math.max(4, s.h * 88 - 3);

      var shapeEl;
      if (s.shape === 'poly' && s.poly) {
        shapeEl = document.createElementNS(ns, 'polygon');
        var ptsStr = s.poly.map(function (pt) {
          return (pad + pt[0] * 88).toFixed(1) + ',' + (pad + pt[1] * 88).toFixed(1);
        }).join(' ');
        shapeEl.setAttribute('points', ptsStr);
      } else if (s.shape === 'circle') {
        shapeEl = document.createElementNS(ns, 'circle');
        shapeEl.setAttribute('cx', (x + w * 0.5).toFixed(1));
        shapeEl.setAttribute('cy', (y + h * 0.5).toFixed(1));
        shapeEl.setAttribute('r', (Math.min(w, h) * 0.46).toFixed(1));
      } else if (s.shape === 'diamond') {
        shapeEl = document.createElementNS(ns, 'polygon');
        shapeEl.setAttribute('points', [
          (x + w * 0.5).toFixed(1) + ',' + y.toFixed(1),
          (x + w).toFixed(1) + ',' + (y + h * 0.5).toFixed(1),
          (x + w * 0.5).toFixed(1) + ',' + (y + h).toFixed(1),
          x.toFixed(1) + ',' + (y + h * 0.5).toFixed(1),
        ].join(' '));
      } else if (s.shape === 'hex') {
        shapeEl = document.createElementNS(ns, 'polygon');
        var cx = x + w * 0.5, cy = y + h * 0.5, rx = w * 0.48, ry = h * 0.48;
        var hPts = [];
        for (var k = 0; k < 6; k++) {
          var a = (Math.PI / 3) * k - Math.PI / 2;
          hPts.push((cx + rx * Math.cos(a)).toFixed(1) + ',' + (cy + ry * Math.sin(a)).toFixed(1));
        }
        shapeEl.setAttribute('points', hPts.join(' '));
      } else {
        shapeEl = document.createElementNS(ns, 'rect');
        shapeEl.setAttribute('x', x.toFixed(1));
        shapeEl.setAttribute('y', y.toFixed(1));
        shapeEl.setAttribute('width', w.toFixed(1));
        shapeEl.setAttribute('height', h.toFixed(1));
        shapeEl.setAttribute('rx', s.shape === 'arch' ? (w * 0.48).toFixed(1) : '3');
      }
      shapeEl.setAttribute('fill', 'currentColor');
      shapeEl.setAttribute('fill-opacity', '0.24');
      shapeEl.setAttribute('stroke', 'currentColor');
      shapeEl.setAttribute('stroke-width', '2');
      if (s.rot) {
        shapeEl.setAttribute('transform', 'rotate(' + s.rot + ' ' + (x + w * 0.5).toFixed(1) + ' ' + (y + h * 0.5).toFixed(1) + ')');
      }
      svg.appendChild(shapeEl);
    });
    return svg;
  }

  function renderPhotoStrip() {
    if (!pcPhotoStrip) return;
    while (pcPhotoStrip.firstChild) pcPhotoStrip.removeChild(pcPhotoStrip.firstChild);

    state.photos.forEach(function (ph, idx) {
      var wrap = document.createElement('div');
      var activeSlot = state.slots[state.selectedSlot];
      wrap.className = 'pc-photo-thumb' + (activeSlot && activeSlot.photoIdx === idx ? ' is-selected' : '');

      var imgEl = document.createElement('img');
      imgEl.src = ph.thumbUrl;
      imgEl.alt = ph.name || ('Photo ' + (idx + 1));

      var num = document.createElement('span');
      num.className = 'pc-thumb-num';
      num.textContent = String(idx + 1);

      wrap.appendChild(imgEl);
      wrap.appendChild(num);

      if (state.photos.length > 1) {
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'pc-thumb-del';
        del.textContent = '×';
        del.setAttribute('aria-label', 'Remove photo');
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          removePhotoAt(idx);
        });
        wrap.appendChild(del);
      }

      wrap.addEventListener('click', function () {
        if (!state.slots[state.selectedSlot]) return;
        pushUndo();
        state.slots[state.selectedSlot].photoIdx = idx;
        state.slots[state.selectedSlot].panX = 0;
        state.slots[state.selectedSlot].panY = 0;
        state.slots[state.selectedSlot].zoom = 100;
        syncAllUI();
        scheduleRender();
      });

      pcPhotoStrip.appendChild(wrap);
    });
  }

  function renderLayoutGrid() {
    if (!pcLayoutGrid) return;
    while (pcLayoutGrid.firstChild) pcLayoutGrid.removeChild(pcLayoutGrid.firstChild);

    var uploadedCount = clamp(state.photos.filter(function (p) { return !p.isDemo; }).length || state.photos.length, 2, 12);

    LAYOUTS.filter(function (l) {
      if (state.layoutCat !== 'all' && l.cat !== state.layoutCat) return false;
      if (state.matchCount && l.slots.length !== uploadedCount) return false;
      return true;
    }).forEach(function (l) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pc-layout-card' + (state.layoutId === l.id ? ' active' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', state.layoutId === l.id ? 'true' : 'false');

      btn.appendChild(createLayoutMiniSvg(l));

      var nm = document.createElement('span');
      nm.className = 'pc-layout-name';
      nm.textContent = t(l.key);

      var badge = document.createElement('span');
      badge.className = 'pc-layout-badge';
      badge.textContent = l.slots.length + ' ' + t('pc_photos_unit');

      btn.appendChild(nm);
      btn.appendChild(badge);

      btn.addEventListener('click', function () {
        if (state.layoutId === l.id) return;
        pushUndo();
        state.layoutId = l.id;
        state.swapSourceSlot = -1;
        syncSlotArrayToLayout();
        syncAllUI();
        scheduleRender();
      });

      pcLayoutGrid.appendChild(btn);
    });
  }

  function renderBgGrid() {
    if (!pcBgGrid) return;
    while (pcBgGrid.firstChild) pcBgGrid.removeChild(pcBgGrid.firstChild);

    BACKGROUNDS.filter(function (bg) {
      return state.bgCat === 'all' || bg.cat === state.bgCat;
    }).forEach(function (bg) {
      var btn = document.createElement('button');
      btn.type = 'button';
      var active = !state.transparentBg && !state.customBgImg && state.bgId === bg.id;
      btn.className = 'pc-bg-item' + (active ? ' active' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', active ? 'true' : 'false');

      var sw = document.createElement('span');
      sw.className = 'pc-bg-swatch';
      if (bg.c3) sw.style.background = 'linear-gradient(135deg, ' + bg.c1 + ', ' + bg.c2 + ', ' + bg.c3 + ')';
      else if (bg.c2) sw.style.background = 'linear-gradient(180deg, ' + bg.c1 + ', ' + bg.c2 + ')';
      else sw.style.backgroundColor = bg.c1;

      var lbl = document.createElement('span');
      lbl.className = 'pc-bg-name';
      lbl.textContent = t(bg.key);

      btn.appendChild(sw);
      btn.appendChild(lbl);

      btn.addEventListener('click', function () {
        pushUndo();
        state.bgId = bg.id;
        state.transparentBg = false;
        state.customBgImg = null;
        if (bg.dark && sanitizeHex(state.textColor) === '#0F172A') state.textColor = '#F8FAFC';
        else if (!bg.dark && sanitizeHex(state.textColor) === '#F8FAFC') state.textColor = '#0F172A';
        syncAllUI();
        scheduleRender();
      });

      pcBgGrid.appendChild(btn);
    });
  }

  function renderFontModalList() {
    if (!pcFontList) return;
    while (pcFontList.firstChild) pcFontList.removeChild(pcFontList.firstChild);
    [{ key: 'ar', label: 'ms_fonts_ar' }, { key: 'en', label: 'ms_fonts_en' }].forEach(function (grp) {
      var hdr = document.createElement('div');
      hdr.className = 'ms-font-group-title';
      hdr.textContent = t(grp.label);
      pcFontList.appendChild(hdr);

      var grid = document.createElement('div');
      grid.className = 'ms-font-grid';
      FONT_LIBRARY.filter(function (f) { return f.group === grp.key; }).forEach(function (f) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ms-font-card' + (state.fontId === f.id ? ' active' : '');

        var sample = document.createElement('span');
        sample.className = 'ms-font-card-sample';
        sample.style.fontFamily = f.css;
        sample.style.fontWeight = f.weight;
        sample.textContent = f.sample;

        var nm = document.createElement('span');
        nm.className = 'ms-font-card-name';
        nm.textContent = f.label;

        btn.appendChild(sample);
        btn.appendChild(nm);
        btn.addEventListener('click', function () {
          pushUndo();
          state.fontId = f.id;
          ensureFontLoaded(f);
          if (pcFontName) pcFontName.textContent = f.label;
          closeFontModal();
          scheduleRender();
        });
        grid.appendChild(btn);
      });
      pcFontList.appendChild(grid);
    });
  }

  function syncAllUI() {
    var layout = getLayoutObj(state.layoutId);
    var asp = ASPECT_SPECS[state.aspect] || ASPECT_SPECS['1:1'];
    var outW = Math.min(3000, asp.w * state.exportScale);
    var outH = Math.min(3000, asp.h * state.exportScale);

    if (pcActiveLayoutLabel) pcActiveLayoutLabel.textContent = t(layout.key);
    if (pcSpecMeta) pcSpecMeta.textContent = asp.id + ' · ' + outW + ' × ' + outH + ' px';
    if (pcExportSummary) {
      var transTxt = state.transparentBg ? (' · ' + t('ms_btn_trans_short')) : '';
      pcExportSummary.textContent = outW + ' × ' + outH + ' px (' + state.exportScale + 'x)' + transTxt;
    }

    var userCount = state.photos.filter(function (p) { return !p.isDemo; }).length;
    if (pcPhotoCountBadge) {
      pcPhotoCountBadge.textContent = userCount > 0
        ? (userCount + ' / ' + MAX_PHOTOS + ' ' + t('pc_photos_unit'))
        : t('pc_demo_badge');
    }

    aspectBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-aspect') === state.aspect); });
    layoutCatBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-lcat') === state.layoutCat); });
    bgCatBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-bgcat') === state.bgCat); });
    scaleBtns.forEach(function (b) { b.classList.toggle('active', parseInt(b.getAttribute('data-scale'), 10) === state.exportScale); });
    pdfPaperBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-paper') === state.pdfPaper); });
    filterScopeBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-fscope') === state.filterScope); });
    textPosBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tpos') === state.textPos); });

    if (pcMatchCountToggle) pcMatchCountToggle.checked = Boolean(state.matchCount);

    var curSlot = state.slots[state.selectedSlot] || createEmptySlotState(0);
    if (pcSlotTitle) {
      pcSlotTitle.textContent = state.swapSourceSlot >= 0
        ? t('pc_swap_pick')
        : (t('pc_frame_num') + ' #' + (state.selectedSlot + 1));
    }
    if (btnPcSwapMode) {
      btnPcSwapMode.classList.toggle('active', state.swapSourceSlot >= 0);
    }
    if (pcSlotZoom) pcSlotZoom.value = String(curSlot.zoom);
    if (pcSlotZoomVal) pcSlotZoomVal.textContent = curSlot.zoom + '%';

    var activeFilter = state.filterScope === 'slot'
      ? (curSlot.filter === 'inherit' ? state.globalFilter : curSlot.filter)
      : state.globalFilter;
    filterBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-filter') === activeFilter); });

    if (pcGapRange) pcGapRange.value = String(state.gapPx);
    if (pcGapVal) pcGapVal.textContent = state.gapPx + ' px';
    if (pcPadRange) pcPadRange.value = String(state.padPx);
    if (pcPadVal) pcPadVal.textContent = state.padPx + ' px';
    if (pcRadiusRange) pcRadiusRange.value = String(state.radiusPx);
    if (pcRadiusVal) pcRadiusVal.textContent = state.radiusPx + ' px';
    if (pcFrameShadowToggle) pcFrameShadowToggle.checked = Boolean(state.frameShadow);

    if (pcCanvasWrap) pcCanvasWrap.classList.toggle('is-transparent', Boolean(state.transparentBg));
    if (btnPcTransparent) {
      btnPcTransparent.classList.toggle('btn-primary', state.transparentBg);
      btnPcTransparent.classList.toggle('btn-secondary', !state.transparentBg);
    }
    if (btnPcClearBg) btnPcClearBg.classList.toggle('hide', !state.customBgImg);

    var fontObj = getFontObj(state.fontId);
    if (pcFontName) pcFontName.textContent = fontObj.label;
    if (pcTextColor) pcTextColor.value = sanitizeHex(state.textColor, '#0F172A');
    if (pcTextSizeRange) pcTextSizeRange.value = String(state.textSize);
    if (pcTextSizeVal) pcTextSizeVal.textContent = state.textSize + ' px';

    renderPhotoStrip();
    renderLayoutGrid();
    renderBgGrid();
    syncUndoButtons();
  }

  /* ----- Photo Addition, Removal, Shuffle & Slot Operations ----- */
  function addPhotoFiles(fileList, targetSlotIdx) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;

    Promise.all(files.map(function (f) {
      return decodeSafeImageFile(f).catch(function (err) {
        toast(t(err.message || 'ms_err_type'), 'err');
        return null;
      });
    })).then(function (decoded) {
      var valid = decoded.filter(Boolean);
      if (!valid.length) return;

      pushUndo();
      /* First real upload replaces demo tiles cleanly */
      var hadOnlyDemo = state.photos.every(function (p) { return p.isDemo; });
      if (hadOnlyDemo) {
        state.photos = [];
        state.slots.forEach(function (s) { s.photoIdx = -1; });
      }

      var insertedIndices = [];
      valid.forEach(function (p) {
        if (state.photos.length < MAX_PHOTOS) {
          insertedIndices.push(state.photos.length);
          state.photos.push(p);
        }
      });

      if (valid.length > insertedIndices.length) {
        toast(t('pc_err_max12'), 'err');
      }

      if (typeof targetSlotIdx === 'number' && targetSlotIdx >= 0 && state.slots[targetSlotIdx] && insertedIndices.length) {
        state.slots[targetSlotIdx].photoIdx = insertedIndices[0];
        state.slots[targetSlotIdx].panX = 0;
        state.slots[targetSlotIdx].panY = 0;
        state.slots[targetSlotIdx].zoom = 100;
        state.selectedSlot = targetSlotIdx;
      } else {
        /* Auto-fill unassigned slots or cycle nicely */
        var ptr = 0;
        state.slots.forEach(function (s, i) {
          if (s.photoIdx < 0 || hadOnlyDemo) {
            s.photoIdx = i % state.photos.length;
          } else if (ptr < insertedIndices.length && i >= (state.slots.length - insertedIndices.length)) {
            s.photoIdx = insertedIndices[ptr++];
          }
        });
      }

      /* Smart layout auto-pick on first upload if user hasn't picked a custom large count */
      if (hadOnlyDemo && state.photos.length >= 2) {
        var matched = LAYOUTS.find(function (l) { return l.slots.length === state.photos.length; });
        if (matched) state.layoutId = matched.id;
      }

      syncSlotArrayToLayout();
      syncAllUI();
      scheduleRender();
      toast(t('pc_loaded_ok'), 'ok');
    });
  }

  function removePhotoAt(idx) {
    if (idx < 0 || idx >= state.photos.length || state.photos.length <= 1) return;
    pushUndo();
    state.photos.splice(idx, 1);
    state.slots.forEach(function (s, i) {
      if (s.photoIdx === idx) s.photoIdx = i % state.photos.length;
      else if (s.photoIdx > idx) s.photoIdx--;
    });
    syncAllUI();
    scheduleRender();
  }

  function smartShuffle() {
    var layout = getLayoutObj(state.layoutId);
    if (!state.photos.length || layout.slots.length < 2) return;
    pushUndo();
    var pLen = state.photos.length;
    var order = [];
    for (var i = 0; i < layout.slots.length; i++) {
      order.push(i % pLen);
    }
    /* Fisher-Yates shuffle */
    for (var k = order.length - 1; k > 0; k--) {
      var j = Math.floor(Math.random() * (k + 1));
      var tmp = order[k];
      order[k] = order[j];
      order[j] = tmp;
    }
    /* Ensure at least first slot shifts if identical */
    if (order[0] === state.slots[0].photoIdx && order.length > 1) {
      var sw = order[0]; order[0] = order[1]; order[1] = sw;
    }
    state.slots.forEach(function (s, idx) {
      s.photoIdx = order[idx];
      s.panX = 0;
      s.panY = 0;
    });
    syncAllUI();
    scheduleRender();
  }

  function resetAllToDemo() {
    pushUndo();
    state.photos = buildDemoPhotos();
    state.layoutId = 'g_2x2';
    state.slots = [0, 1, 2, 3].map(function (i) { return createEmptySlotState(i); });
    state.selectedSlot = 0;
    state.swapSourceSlot = -1;
    syncAllUI();
    scheduleRender();
  }

  /* ----- Modals & PNG / JPG / 300 DPI PDF Export ----- */
  function openFontModal() {
    renderFontModalList();
    if (pcFontModal) pcFontModal.classList.remove('hide');
  }
  function closeFontModal() {
    if (pcFontModal) pcFontModal.classList.add('hide');
  }
  function openExportModal() {
    syncAllUI();
    if (pcExportModal) pcExportModal.classList.remove('hide');
  }
  function closeExportModal() {
    if (pcExportModal) pcExportModal.classList.add('hide');
  }

  function handleExport(format) {
    var asp = ASPECT_SPECS[state.aspect] || ASPECT_SPECS['1:1'];
    var rawW = asp.w * state.exportScale;
    var rawH = asp.h * state.exportScale;
    var cap = (format === 'pdf' && (state.aspect === 'a4_p' || state.aspect === 'a4_l')) ? 3508 : 3000;
    var scaleDown = Math.max(rawW, rawH) > cap ? (cap / Math.max(rawW, rawH)) : 1;
    var outW = Math.round(rawW * scaleDown);
    var outH = Math.round(rawH * scaleDown);

    var outCanvas = document.createElement('canvas');
    try {
      var prevTransparent = state.transparentBg;
      if ((format === 'jpg' || format === 'pdf') && state.transparentBg) {
        state.transparentBg = false;
      }
      renderCollageToCanvas(outCanvas, outW, outH, true);
      state.transparentBg = prevTransparent;

      var firstReal = state.photos.find(function (p) { return !p.isDemo; });
      var baseName = sanitizeFilenameBase(firstReal ? firstReal.name : 'photo-collage');
      var fileBase = baseName + '-imgsfix-' + state.layoutId + '-' + outW + 'x' + outH;

      if (format === 'pdf') {
        var isLand = outW > outH;
        var paperW = state.pdfPaper === 'letter' ? 215.9 : 210;
        var paperH = state.pdfPaper === 'letter' ? 279.4 : 297;
        var pageW = isLand ? paperH : paperW;
        var pageH = isLand ? paperW : paperH;

        var pdf = new jsPDF({
          orientation: isLand ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [pageW, pageH],
        });

        /* Fit collage proportionally inside print margin (0mm bleed if A4 matches, else 8mm clean print margin) */
        var marginMm = (state.aspect === 'a4_p' || state.aspect === 'a4_l') ? 0 : 8;
        var availW = pageW - marginMm * 2;
        var availH = pageH - marginMm * 2;
        var imgSc = Math.min(availW / outW, availH / outH);
        var drawW = outW * imgSc;
        var drawH = outH * imgSc;
        var offX = (pageW - drawW) * 0.5;
        var offY = (pageH - drawH) * 0.5;

        var jpgData = outCanvas.toDataURL('image/jpeg', 0.96);
        cleanupCanvas(outCanvas);
        pdf.addImage(jpgData, 'JPEG', offX, offY, drawW, drawH, undefined, 'NONE');
        var pdfBlob = pdf.output('blob');
        if (typeof I.triggerDownload === 'function') {
          I.triggerDownload(pdfBlob, fileBase + '-300dpi.pdf');
        }
        toast(t('pc_export_ok'), 'ok');
        return;
      }

      var mime = format === 'png' ? 'image/png' : 'image/jpeg';
      var ext = format === 'png' ? 'png' : 'jpg';
      outCanvas.toBlob(function (blob) {
        cleanupCanvas(outCanvas);
        if (!blob) {
          toast(t('pc_export_err'), 'err');
          return;
        }
        if (typeof I.triggerDownload === 'function') {
          I.triggerDownload(blob, fileBase + '.' + ext);
        } else {
          var u = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = u;
          a.download = fileBase + '.' + ext;
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            if (a.parentNode) a.parentNode.removeChild(a);
            try { URL.revokeObjectURL(u); } catch (_e) {}
          }, 2500);
        }
        toast(t('pc_export_ok'), 'ok');
      }, mime, format === 'png' ? 1.0 : 0.95);
    } catch (err) {
      cleanupCanvas(outCanvas);
      console.error('Collage export error:', err);
      toast(t('pc_export_err'), 'err');
    }
  }

  /* ----- Event Wiring ----- */
  dockTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-tab');
      dockTabs.forEach(function (tb) {
        var active = tb === tab;
        tb.classList.toggle('active', active);
        tb.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      dockPanes.forEach(function (pane) {
        pane.classList.toggle('active', pane.getAttribute('data-pane') === target);
      });
    });
  });

  aspectBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var asp = b.getAttribute('data-aspect');
      if (!asp || state.aspect === asp) return;
      pushUndo();
      state.aspect = asp;
      syncAllUI();
      scheduleRender();
    });
  });

  layoutCatBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var cat = b.getAttribute('data-lcat');
      if (!cat || state.layoutCat === cat) return;
      state.layoutCat = cat;
      syncAllUI();
    });
  });

  if (pcMatchCountToggle) {
    pcMatchCountToggle.addEventListener('change', function () {
      state.matchCount = Boolean(pcMatchCountToggle.checked);
      syncAllUI();
    });
  }

  bgCatBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var cat = b.getAttribute('data-bgcat');
      if (!cat || state.bgCat === cat) return;
      state.bgCat = cat;
      syncAllUI();
    });
  });

  if (btnPcTransparent) {
    btnPcTransparent.addEventListener('click', function () {
      pushUndo();
      state.transparentBg = !state.transparentBg;
      if (state.transparentBg) state.customBgImg = null;
      syncAllUI();
      scheduleRender();
    });
  }

  [btnPcTopUpload, btnPcDockUpload, btnPcMqUpload].forEach(function (b) {
    if (b && pcPhotosInput) b.addEventListener('click', function () { pcPhotosInput.click(); });
  });
  if (pcPhotosInput) {
    pcPhotosInput.addEventListener('change', function () {
      if (pcPhotosInput.files && pcPhotosInput.files.length) {
        addPhotoFiles(pcPhotosInput.files, -1);
      }
      pcPhotosInput.value = '';
    });
  }

  if (btnPcSlotReplace && pcReplaceInput) {
    btnPcSlotReplace.addEventListener('click', function () {
      replaceTargetSlot = state.selectedSlot;
      pcReplaceInput.click();
    });
    pcReplaceInput.addEventListener('change', function () {
      if (pcReplaceInput.files && pcReplaceInput.files[0]) {
        addPhotoFiles([pcReplaceInput.files[0]], replaceTargetSlot >= 0 ? replaceTargetSlot : state.selectedSlot);
      }
      replaceTargetSlot = -1;
      pcReplaceInput.value = '';
    });
  }

  if (btnPcUploadBg && pcCustomBgInput) {
    btnPcUploadBg.addEventListener('click', function () { pcCustomBgInput.click(); });
    pcCustomBgInput.addEventListener('change', function () {
      if (pcCustomBgInput.files && pcCustomBgInput.files[0]) {
        var gen = ++state.loadGenBg;
        decodeSafeImageFile(pcCustomBgInput.files[0]).then(function (res) {
          if (gen !== state.loadGenBg) return;
          pushUndo();
          state.customBgImg = res.img;
          state.transparentBg = false;
          syncAllUI();
          scheduleRender();
        }).catch(function (err) {
          toast(t(err.message || 'ms_err_type'), 'err');
        });
      }
      pcCustomBgInput.value = '';
    });
  }
  if (btnPcClearBg) {
    btnPcClearBg.addEventListener('click', function () {
      pushUndo();
      state.loadGenBg++;
      state.customBgImg = null;
      syncAllUI();
      scheduleRender();
    });
  }

  /* Drag & Drop onto Stage (Hit-tests exact slot if dropped on one!) */
  if (pcViewport) {
    pcViewport.addEventListener('dragover', function (e) {
      e.preventDefault();
      pcViewport.classList.add('is-dragover');
    });
    pcViewport.addEventListener('dragleave', function () {
      pcViewport.classList.remove('is-dragover');
    });
    pcViewport.addEventListener('drop', function (e) {
      e.preventDefault();
      pcViewport.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        var pt = clientToCanvasPoint(e.clientX, e.clientY);
        var hit = findSlotAtCanvasPoint(pt.x, pt.y);
        addPhotoFiles(e.dataTransfer.files, e.dataTransfer.files.length === 1 ? hit : -1);
      }
    });
  }

  document.addEventListener('paste', function (e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    var pasted = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image/') === 0) {
        var f = items[i].getAsFile();
        if (f) pasted.push(f);
      }
    }
    if (pasted.length) addPhotoFiles(pasted, pasted.length === 1 ? state.selectedSlot : -1);
  });

  /* Canvas Interactive Frame Click Select / Swap / Direct Pan & Pinch-Zoom */
  if (pcCanvasWrap) {
    pcCanvasWrap.addEventListener('pointerdown', function (e) {
      pcCanvasWrap.setPointerCapture(e.pointerId);
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragUndoPushed = false;

      var pt = clientToCanvasPoint(e.clientX, e.clientY);
      var hitSlot = findSlotAtCanvasPoint(pt.x, pt.y);

      if (state.swapSourceSlot >= 0 && hitSlot >= 0 && hitSlot !== state.swapSourceSlot) {
        pushUndo();
        var sA = state.slots[state.swapSourceSlot];
        var sB = state.slots[hitSlot];
        var tmpIdx = sA.photoIdx;
        sA.photoIdx = sB.photoIdx;
        sB.photoIdx = tmpIdx;
        state.selectedSlot = hitSlot;
        state.swapSourceSlot = -1;
        syncAllUI();
        scheduleRender();
        return;
      }

      if (hitSlot >= 0 && hitSlot !== state.selectedSlot) {
        state.selectedSlot = hitSlot;
        syncAllUI();
        scheduleRender();
      }

      var curSlot = state.slots[state.selectedSlot];
      if (!curSlot) return;

      if (activePointers.size === 2) {
        isPanning = false;
        var pts = Array.from(activePointers.values());
        pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        pinchStartZoom = curSlot.zoom;
        return;
      }
      isPanning = true;
      panStartClient = { x: e.clientX, y: e.clientY };
      panStartValues = { x: curSlot.panX, y: curSlot.panY };
    });

    pcCanvasWrap.addEventListener('pointermove', function (e) {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      var curSlot = state.slots[state.selectedSlot];
      if (!curSlot) return;

      if (activePointers.size === 2) {
        var pts = Array.from(activePointers.values());
        var dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        if (pinchStartDist > 0) {
          if (!dragUndoPushed) { pushUndo(); dragUndoPushed = true; }
          curSlot.zoom = clamp(Math.round(pinchStartZoom * (dist / pinchStartDist)), 50, 250);
          if (pcSlotZoom) pcSlotZoom.value = String(curSlot.zoom);
          if (pcSlotZoomVal) pcSlotZoomVal.textContent = curSlot.zoom + '%';
          scheduleRender();
        }
        return;
      }
      if (!isPanning) return;
      var moveDist = Math.hypot(e.clientX - panStartClient.x, e.clientY - panStartClient.y);
      if (moveDist > 2 && !dragUndoPushed) {
        pushUndo();
        dragUndoPushed = true;
      }
      var rect = pcCanvasWrap.getBoundingClientRect();
      var dxPct = ((e.clientX - panStartClient.x) / Math.max(80, rect.width)) * 260;
      var dyPct = ((e.clientY - panStartClient.y) / Math.max(80, rect.height)) * 260;
      curSlot.panX = clamp(Math.round(panStartValues.x + dxPct), -100, 100);
      curSlot.panY = clamp(Math.round(panStartValues.y + dyPct), -100, 100);
      scheduleRender();
    });

    ['pointerup', 'pointercancel'].forEach(function (evt) {
      pcCanvasWrap.addEventListener(evt, function (e) {
        activePointers.delete(e.pointerId);
        if (activePointers.size < 2) pinchStartDist = 0;
        isPanning = false;
        dragUndoPushed = false;
      });
    });

    pcCanvasWrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      var pt = clientToCanvasPoint(e.clientX, e.clientY);
      var hit = findSlotAtCanvasPoint(pt.x, pt.y);
      if (hit >= 0 && hit !== state.selectedSlot) {
        state.selectedSlot = hit;
        syncAllUI();
      }
      var curSlot = state.slots[state.selectedSlot];
      if (!curSlot) return;
      if (!wheelUndoTimer) pushUndo();
      clearTimeout(wheelUndoTimer);
      wheelUndoTimer = setTimeout(function () { wheelUndoTimer = 0; }, 350);
      curSlot.zoom = clamp(curSlot.zoom + (e.deltaY < 0 ? 6 : -6), 50, 250);
      if (pcSlotZoom) pcSlotZoom.value = String(curSlot.zoom);
      if (pcSlotZoomVal) pcSlotZoomVal.textContent = curSlot.zoom + '%';
      scheduleRender();
    }, { passive: false });
  }

  /* Slot Editing Actions */
  if (pcSlotZoom) {
    var zoomPushed = false;
    pcSlotZoom.addEventListener('input', function () {
      var curSlot = state.slots[state.selectedSlot];
      if (!curSlot) return;
      if (!zoomPushed) { pushUndo(); zoomPushed = true; }
      curSlot.zoom = clamp(parseInt(pcSlotZoom.value, 10) || 100, 50, 250);
      if (pcSlotZoomVal) pcSlotZoomVal.textContent = curSlot.zoom + '%';
      scheduleRender();
    });
    pcSlotZoom.addEventListener('change', function () { zoomPushed = false; });
  }

  if (btnPcSlotRotate) {
    btnPcSlotRotate.addEventListener('click', function () {
      var curSlot = state.slots[state.selectedSlot];
      if (!curSlot) return;
      pushUndo();
      curSlot.rot = (curSlot.rot + 90) % 360;
      scheduleRender();
    });
  }
  if (btnPcSlotFlip) {
    btnPcSlotFlip.addEventListener('click', function () {
      var curSlot = state.slots[state.selectedSlot];
      if (!curSlot) return;
      pushUndo();
      curSlot.flipX = !curSlot.flipX;
      scheduleRender();
    });
  }
  if (btnPcSlotClear) {
    btnPcSlotClear.addEventListener('click', function () {
      var curSlot = state.slots[state.selectedSlot];
      if (!curSlot) return;
      pushUndo();
      curSlot.photoIdx = -1;
      curSlot.panX = 0;
      curSlot.panY = 0;
      curSlot.zoom = 100;
      syncAllUI();
      scheduleRender();
    });
  }
  if (btnPcSwapMode) {
    btnPcSwapMode.addEventListener('click', function () {
      if (state.swapSourceSlot >= 0) {
        state.swapSourceSlot = -1;
      } else {
        state.swapSourceSlot = state.selectedSlot;
      }
      syncAllUI();
      scheduleRender();
    });
  }

  /* Sliders for Spacing, Margin, Radius, Shadow */
  function bindStateSlider(el, valEl, key, suffix) {
    if (!el) return;
    var pushed = false;
    el.addEventListener('input', function () {
      if (!pushed) { pushUndo(); pushed = true; }
      state[key] = parseInt(el.value, 10) || 0;
      if (valEl) valEl.textContent = state[key] + suffix;
      scheduleRender();
    });
    el.addEventListener('change', function () { pushed = false; });
  }
  bindStateSlider(pcGapRange, pcGapVal, 'gapPx', ' px');
  bindStateSlider(pcPadRange, pcPadVal, 'padPx', ' px');
  bindStateSlider(pcRadiusRange, pcRadiusVal, 'radiusPx', ' px');
  bindStateSlider(pcTextSizeRange, pcTextSizeVal, 'textSize', ' px');

  if (pcFrameShadowToggle) {
    pcFrameShadowToggle.addEventListener('change', function () {
      pushUndo();
      state.frameShadow = Boolean(pcFrameShadowToggle.checked);
      scheduleRender();
    });
  }

  /* Filters & Typography */
  filterScopeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var sc = b.getAttribute('data-fscope');
      if (!sc || state.filterScope === sc) return;
      state.filterScope = sc;
      syncAllUI();
    });
  });

  filterBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var flt = b.getAttribute('data-filter');
      if (!flt) return;
      pushUndo();
      if (state.filterScope === 'slot') {
        var curSlot = state.slots[state.selectedSlot];
        if (curSlot) curSlot.filter = flt;
      } else {
        state.globalFilter = flt;
        state.slots.forEach(function (s) { s.filter = 'inherit'; });
      }
      syncAllUI();
      scheduleRender();
    });
  });

  textPosBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var pos = b.getAttribute('data-tpos');
      if (!pos || state.textPos === pos) return;
      pushUndo();
      state.textPos = pos;
      syncAllUI();
      scheduleRender();
    });
  });
  if (pcTitleInput) {
    pcTitleInput.addEventListener('input', function () {
      state.titleText = pcTitleInput.value;
      if (state.textPos === 'none' && state.titleText.trim()) {
        state.textPos = 'top';
        syncAllUI();
      }
      scheduleRender();
    });
  }
  if (pcSubInput) {
    pcSubInput.addEventListener('input', function () {
      state.subText = pcSubInput.value;
      scheduleRender();
    });
  }
  if (pcTextColor) {
    pcTextColor.addEventListener('input', function () {
      state.textColor = sanitizeHex(pcTextColor.value, '#0F172A');
      scheduleRender();
    });
  }

  /* Stage Actions & Modals */
  [btnPcTopShuffle, btnPcStageShuffle, btnPcDockShuffle, btnPcMqShuffle].forEach(function (b) {
    if (b) b.addEventListener('click', smartShuffle);
  });
  if (btnPcResetSlots) {
    btnPcResetSlots.addEventListener('click', function () {
      pushUndo();
      state.slots.forEach(function (s) { s.panX = 0; s.panY = 0; s.zoom = 100; s.rot = 0; s.flipX = false; });
      syncAllUI();
      scheduleRender();
    });
  }
  if (btnPcClearAll) btnPcClearAll.addEventListener('click', resetAllToDemo);
  if (btnPcUndo) btnPcUndo.addEventListener('click', handleUndo);
  if (btnPcMqUndo) btnPcMqUndo.addEventListener('click', handleUndo);
  if (btnPcRedo) btnPcRedo.addEventListener('click', handleRedo);

  if (btnPcPickFont) btnPcPickFont.addEventListener('click', openFontModal);
  if (btnPcCloseFontModal) btnPcCloseFontModal.addEventListener('click', closeFontModal);
  if (pcFontModal) pcFontModal.addEventListener('click', function (e) { if (e.target === pcFontModal) closeFontModal(); });

  if (btnPcOpenExportModal) btnPcOpenExportModal.addEventListener('click', openExportModal);
  if (btnPcMqExport) btnPcMqExport.addEventListener('click', openExportModal);
  if (btnPcCloseExportModal) btnPcCloseExportModal.addEventListener('click', closeExportModal);
  if (pcExportModal) pcExportModal.addEventListener('click', function (e) { if (e.target === pcExportModal) closeExportModal(); });

  scaleBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.exportScale = clamp(parseInt(b.getAttribute('data-scale'), 10) || 2, 1, 3);
      syncAllUI();
    });
  });
  pdfPaperBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.pdfPaper = b.getAttribute('data-paper') === 'letter' ? 'letter' : 'a4';
      syncAllUI();
    });
  });

  if (btnPcExportPng) btnPcExportPng.addEventListener('click', function () { handleExport('png'); });
  if (btnPcExportJpg) btnPcExportJpg.addEventListener('click', function () { handleExport('jpg'); });
  if (btnPcExportPdf) btnPcExportPdf.addEventListener('click', function () { handleExport('pdf'); });

  /* ----- Keyboard Shortcuts (Layout-Independent via e.code) ----- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeFontModal();
      closeExportModal();
      if (state.swapSourceSlot >= 0) {
        state.swapSourceSlot = -1;
        syncAllUI();
        scheduleRender();
      }
      return;
    }

    var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
    var isRange = tag === 'input' && e.target.type === 'range';
    var isTyping = (tag === 'input' && !isRange) || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable);
    if (isTyping) return;

    var mod = e.ctrlKey || e.metaKey;
    var lower = e.key ? e.key.toLowerCase() : '';
    var code = e.code || '';

    if (mod && (lower === 's' || code === 'KeyS')) {
      e.preventDefault();
      openExportModal();
      return;
    }
    if (mod && (lower === 'y' || code === 'KeyY' || (e.shiftKey && (lower === 'z' || code === 'KeyZ')))) {
      e.preventDefault();
      handleRedo();
      return;
    }
    if (mod && (lower === 'z' || code === 'KeyZ')) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if (!mod && (lower === 's' || code === 'KeyS')) {
      e.preventDefault();
      smartShuffle();
      return;
    }

    var curSlot = state.slots[state.selectedSlot];
    if (!mod && curSlot) {
      var step = e.shiftKey ? 10 : 4;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        pushUndo();
        curSlot.photoIdx = -1;
        syncAllUI();
        scheduleRender();
        return;
      }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); curSlot.panX = clamp(curSlot.panX - step, -100, 100); scheduleRender(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); curSlot.panX = clamp(curSlot.panX + step, -100, 100); scheduleRender(); return; }
      if (e.key === 'ArrowUp')    { e.preventDefault(); curSlot.panY = clamp(curSlot.panY - step, -100, 100); scheduleRender(); return; }
      if (e.key === 'ArrowDown')  { e.preventDefault(); curSlot.panY = clamp(curSlot.panY + step, -100, 100); scheduleRender(); return; }
      if (e.key === '+' || e.key === '=' || code === 'NumpadAdd') {
        e.preventDefault();
        curSlot.zoom = clamp(curSlot.zoom + 8, 50, 250);
        syncAllUI();
        scheduleRender();
        return;
      }
      if (e.key === '-' || code === 'NumpadSubtract') {
        e.preventDefault();
        curSlot.zoom = clamp(curSlot.zoom - 8, 50, 250);
        syncAllUI();
        scheduleRender();
      }
    }
  });

  /* ----- Language & Memory Cleanup ----- */
  document.addEventListener('imgsfix:langchange', function () {
    syncDocumentMeta();
    syncAllUI();
    scheduleRender();
  });

  window.addEventListener('beforeunload', function () {
    revokeAllObjectUrls();
    demoCanvases.forEach(cleanupCanvas);
    demoCanvases = [];
    cleanupCanvas(pcPreviewCanvas);
  });

  /* ----- Boot ----- */
  state.photos = buildDemoPhotos();
  syncSlotArrayToLayout();
  syncDocumentMeta();
  syncAllUI();
  renderPreview();
})();

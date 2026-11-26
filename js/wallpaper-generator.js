/* imgsfix — wallpaper-generator.js
   100% client-side 4K Generative Wallpaper & Seamless Pattern Studio:
   - 0 KB external libraries: pure Vanilla JS + HTML5 Canvas 2D + clean Vector SVG builder
   - 5 Procedural Styles: Mesh & Aurora Gradients, Layered Waves & Blobs, Geometric & Islamic Patterns (with Seamless Tile), Low-Poly Crystal Triangles, Minimalist Abstract & Bauhaus
   - Magic Shuffle ✨ engine + 18 Designer Palettes + Custom 3–5 Color Pickers + Reverse + Film Grain
   - Screen Presets up to true 4K (4096px) + Live Phone Lock-Screen Readability Overlay
   - 20-step Undo History Stack + True Full-Res PNG/JPG & Vector SVG Export
*/
'use strict';

(function () {
  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = I.$$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  /* ----- Constants ----- */
  var MAX_DIM = 4096;
  var MIN_DIM = 256;
  var PREVIEW_MAX_SIDE = 1120;
  var MAX_UNDO = 20;

  var MAX_FILE_BYTES = 30 * 1024 * 1024;
  var MAX_IMAGE_DIM = 12000;
  var ALLOWED_BASE_MIMES = {
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

  var STYLE_LABELS = {
    mesh: 'wg_style_mesh_t',
    waves: 'wg_style_waves_t',
    pattern: 'wg_style_pattern_t',
    lowpoly: 'wg_style_lowpoly_t',
    abstract: 'wg_style_abstract_t',
    nebula: 'wg_style_nebula_t',
    mountain: 'wg_style_mountain_t',
    city: 'wg_style_city_t',
    topo: 'wg_style_topo_t',
  };

  var SVG_SUPPORTED_STYLES = {
    waves: true,
    pattern: true,
    lowpoly: true,
    abstract: true,
    mountain: true,
    city: true,
    topo: true,
  };

  var SCREEN_PRESETS = {
    mobile:    { id: 'mobile',    labelKey: 'wg_size_mobile',  w: 1170, h: 2532 },
    desktop4k: { id: 'desktop4k', labelKey: 'wg_size_4k',      w: 3840, h: 2160 },
    fhd:       { id: 'fhd',       labelKey: 'wg_size_fhd',     w: 1920, h: 1080 },
    tablet:    { id: 'tablet',    labelKey: 'wg_size_tablet',  w: 2048, h: 2732 },
    square:    { id: 'square',    labelKey: 'wg_size_square',  w: 1080, h: 1080 },
  };

  var CURATED_PALETTES = [
    { id: 'aurora',     key: 'wg_pal_aurora',     colors: ['#0B1026', '#1B3B6F', '#06B6D4', '#34D399', '#A855F7'] },
    { id: 'sunset',     key: 'wg_pal_sunset',     colors: ['#1E1B4B', '#7C2D12', '#EA580C', '#FB923C', '#FDE047'] },
    { id: 'royalgold',  key: 'wg_pal_royalgold',  colors: ['#0F172A', '#1E293B', '#B45309', '#F59E0B', '#FEF3C7'] },
    { id: 'pastel',     key: 'wg_pal_pastel',     colors: ['#FDF2F8', '#FBCFE8', '#DDD6FE', '#BAE6FD', '#A7F3D0'] },
    { id: 'cyberneon',  key: 'wg_pal_cyberneon',  colors: ['#09090B', '#3B0764', '#EC4899', '#06B6D4', '#22D3EE'] },
    { id: 'oceandeep',  key: 'wg_pal_oceandeep',  colors: ['#042F2E', '#0F766E', '#0284C7', '#38BDF8', '#E0F2FE'] },
    { id: 'desertsand', key: 'wg_pal_desertsand', colors: ['#451A03', '#92400E', '#D97706', '#FCD34D', '#FFFBEB'] },
    { id: 'monochrome', key: 'wg_pal_monochrome', colors: ['#09090B', '#27272A', '#71717A', '#D4D4D8', '#FAFAFA'] },
    { id: 'emerald',    key: 'wg_pal_emerald',    colors: ['#022C22', '#065F46', '#10B981', '#6EE7B7', '#ECFDF5'] },
    { id: 'rosequartz', key: 'wg_pal_rosequartz', colors: ['#4C0519', '#9F1239', '#F43F5E', '#FDA4AF', '#FFF1F2'] },
    { id: 'nordic',     key: 'wg_pal_nordic',     colors: ['#0F172A', '#334155', '#64748B', '#CBD5E1', '#F8FAFC'] },
    { id: 'volcanic',   key: 'wg_pal_volcanic',   colors: ['#18181B', '#7F1D1D', '#DC2626', '#F97316', '#FED7AA'] },
    { id: 'lavender',   key: 'wg_pal_lavender',   colors: ['#2E1065', '#5B21B6', '#8B5CF6', '#C4B5FD', '#F5F3FF'] },
    { id: 'midnight',   key: 'wg_pal_midnight',   colors: ['#020617', '#1E3A8A', '#2563EB', '#60A5FA', '#DBEAFE'] },
    { id: 'terracotta', key: 'wg_pal_terracotta', colors: ['#292524', '#7C2D12', '#C2410C', '#FDBA74', '#FEF3C7'] },
    { id: 'mintsoda',   key: 'wg_pal_mintsoda',   colors: ['#064E3B', '#0D9488', '#2DD4BF', '#99F6E4', '#F0FDFA'] },
    { id: 'warmlatte',  key: 'wg_pal_warmlatte',  colors: ['#271C19', '#573B2E', '#9A6B52', '#D6B39A', '#FAF5F0'] },
    { id: 'imperial',   key: 'wg_pal_imperial',   colors: ['#082F49', '#0E7490', '#14B8A6', '#FBBF24', '#FEF9C3'] },
  ];

  /* ----- DOM Elements ----- */
  var wgActiveStylePill = $('#wgActiveStylePill');
  var wgSpecMeta = $('#wgSpecMeta');
  var btnTopShuffle = $('#btnTopShuffle');
  var btnLockPreview = $('#btnLockPreview');
  var btnOpenExportModal = $('#btnOpenExportModal');

  var wgPreviewCanvas = $('#wgPreviewCanvas');
  var wgLockOverlay = $('#wgLockOverlay');
  var wgLockDate = $('#wgLockDate');
  var wgLockTime = $('#wgLockTime');

  var btnMqDownload = $('#btnMqDownload');
  var btnMqShuffle = $('#btnMqShuffle');
  var btnMqLock = $('#btnMqLock');
  var btnMqUndo = $('#btnMqUndo');

  var btnStageShuffle = $('#btnStageShuffle');
  var btnStageLock = $('#btnStageLock');
  var btnStageUndo = $('#btnStageUndo');
  var btnResetAll = $('#btnResetAll');

  var dockTabs = $$('.wg-dock-tab');
  var dockPanes = $$('.wg-step-pane');

  var styleCards = $$('.wg-style-card', $('#wgStyleGrid'));
  var sizeBtns = $$('.wg-size-pill', $('#wgSizeGrid'));
  var wgCustomDims = $('#wgCustomDims');
  var wgCustomW = $('#wgCustomW');
  var wgCustomH = $('#wgCustomH');
  var btnApplyCustomDims = $('#btnApplyCustomDims');
  var btnCloseCustomDims = $('#btnCloseCustomDims');

  var wgPaletteGrid = $('#wgPaletteGrid');
  var btnPaletteShuffle = $('#btnPaletteShuffle');
  var btnReverseColors = $('#btnReverseColors');
  var colorCountBtns = $$('.wg-chip-btn[data-count]', $('#wgColorCountRow'));
  var wgColorPickers = $('#wgColorPickers');

  var wgDensity = $('#wgDensity');
  var wgDensityVal = $('#wgDensityVal');
  var wgAngle = $('#wgAngle');
  var wgAngleVal = $('#wgAngleVal');
  var wgSmoothness = $('#wgSmoothness');
  var wgSmoothnessVal = $('#wgSmoothnessVal');
  var btnReseedOnly = $('#btnReseedOnly');

  var wgPatternOptions = $('#wgPatternOptions');
  var motifBtns = $$('.wg-chip-btn[data-motif]', $('#wgMotifRow'));
  var wgSeamlessToggle = $('#wgSeamlessToggle');

  var wgGrain = $('#wgGrain');
  var wgGrainVal = $('#wgGrainVal');

  var btnUploadBasePhoto = $('#btnUploadBasePhoto');
  var btnClearBasePhoto = $('#btnClearBasePhoto');
  var wgBasePhotoInput = $('#wgBasePhotoInput');
  var wgBasePhotoControls = $('#wgBasePhotoControls');
  var wgPhotoBlur = $('#wgPhotoBlur');
  var wgPhotoBlurVal = $('#wgPhotoBlurVal');
  var wgPhotoOverlay = $('#wgPhotoOverlay');
  var wgPhotoOverlayVal = $('#wgPhotoOverlayVal');
  var photoBlendBtns = $$('.wg-chip-btn[data-blend]', $('#wgPhotoBlendRow'));

  var wgExportModal = $('#wgExportModal');
  var btnCloseExportModal = $('#btnCloseExportModal');
  var wgExportSummary = $('#wgExportSummary');
  var btnExportPng = $('#btnExportPng');
  var btnExportJpg = $('#btnExportJpg');
  var btnExportSvg = $('#btnExportSvg');
  var wgSvgNote = $('#wgSvgNote');

  /* ----- Offscreen Grain & Base Photo Caches ----- */
  var grainTileCanvas = document.createElement('canvas');
  var grainTileSeed = -1;
  var basePhotoTempCanvas = document.createElement('canvas');

  /* ----- State ----- */
  var DEFAULT_COLORS = CURATED_PALETTES[0].colors.slice(0, 4);

  var state = {
    styleId: 'mesh',
    motif: 'star8',
    seamless: true,
    seed: 104729,
    density: 55,
    angle: 35,
    smoothness: 68,
    grain: 14,
    sizeId: 'mobile',
    width: 1170,
    height: 2532,
    paletteId: 'aurora',
    colorCount: 4,
    colors: DEFAULT_COLORS.slice(),
    lockPreview: false,
    baseImage: null,
    baseImageW: 0,
    baseImageH: 0,
    photoBlur: 14,
    photoOverlay: 42,
    photoBlend: 'screen',
  };

  var undoStack = [];
  var renderRaf = 0;
  var baseLoadGen = 0;
  var customPopoverOpen = false;

  /* ----- Seeded PRNG & Color Utilities ----- */
  function mulberry32(a) {
    var s = a >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var tVal = Math.imul(s ^ (s >>> 15), 1 | s);
      tVal = (tVal + Math.imul(tVal ^ (tVal >>> 7), 61 | tVal)) ^ tVal;
      return ((tVal ^ (tVal >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function sanitizeHex(hex) {
    var s = String(hex || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : '#1A5FFF';
  }

  function hexToRgb(hex) {
    var h = sanitizeHex(hex);
    return {
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16),
    };
  }

  function rgbaStr(hex, alpha) {
    var c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + clamp(alpha, 0, 1).toFixed(3) + ')';
  }

  function rgbToHex(r, g, b) {
    var toHex = function (n) {
      var s = clamp(Math.round(n), 0, 255).toString(16);
      return s.length === 1 ? '0' + s : s;
    };
    return ('#' + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
  }

  function hslToHex(h, s, l) {
    var hh = ((h % 360) + 360) % 360;
    var ss = clamp(s, 0, 100) / 100;
    var ll = clamp(l, 0, 100) / 100;
    var c = (1 - Math.abs(2 * ll - 1)) * ss;
    var x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    var m = ll - c / 2;
    var r = 0, g = 0, b = 0;
    if (hh < 60) { r = c; g = x; }
    else if (hh < 120) { r = x; g = c; }
    else if (hh < 180) { g = c; b = x; }
    else if (hh < 240) { g = x; b = c; }
    else if (hh < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }

  function lerpColor(hexA, hexB, f) {
    var a = hexToRgb(hexA);
    var b = hexToRgb(hexB);
    var tClamped = clamp(f, 0, 1);
    return rgbToHex(
      a.r + (b.r - a.r) * tClamped,
      a.g + (b.g - a.g) * tClamped,
      a.b + (b.b - a.b) * tClamped
    );
  }

  function adjustBrightness(hex, factor) {
    var c = hexToRgb(hex);
    if (factor >= 0) {
      return rgbToHex(
        c.r + (255 - c.r) * factor,
        c.g + (255 - c.g) * factor,
        c.b + (255 - c.b) * factor
      );
    }
    var k = 1 + factor;
    return rgbToHex(c.r * k, c.g * k, c.b * k);
  }

  function samplePalette(colors, pos) {
    if (!colors.length) return '#1A5FFF';
    if (colors.length === 1) return colors[0];
    var p = clamp(pos, 0, 1) * (colors.length - 1);
    var idx = Math.floor(p);
    var frac = p - idx;
    if (idx >= colors.length - 1) return colors[colors.length - 1];
    return lerpColor(colors[idx], colors[idx + 1], frac);
  }

  function getActiveColors() {
    var out = [];
    for (var i = 0; i < state.colorCount; i++) {
      out.push(sanitizeHex(state.colors[i] || CURATED_PALETTES[0].colors[i % 5]));
    }
    return out;
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

  /* ----- Snapshot / Undo Stack (MAX_UNDO = 20) ----- */
  function takeSnapshot() {
    return {
      styleId: state.styleId,
      motif: state.motif,
      seamless: state.seamless,
      seed: state.seed,
      density: state.density,
      angle: state.angle,
      smoothness: state.smoothness,
      grain: state.grain,
      sizeId: state.sizeId,
      width: state.width,
      height: state.height,
      paletteId: state.paletteId,
      colorCount: state.colorCount,
      colors: state.colors.slice(),
    };
  }

  function pushUndo() {
    undoStack.push(takeSnapshot());
    if (undoStack.length > MAX_UNDO) {
      undoStack.shift();
    }
    syncUndoButtons();
  }

  function applySnapshot(snap) {
    if (!snap) return;
    state.styleId = snap.styleId;
    state.motif = snap.motif;
    state.seamless = snap.seamless;
    state.seed = snap.seed;
    state.density = snap.density;
    state.angle = snap.angle;
    state.smoothness = snap.smoothness;
    state.grain = snap.grain;
    state.sizeId = snap.sizeId;
    state.width = snap.width;
    state.height = snap.height;
    state.paletteId = snap.paletteId;
    state.colorCount = snap.colorCount;
    state.colors = snap.colors.slice();
    syncAllUI();
    scheduleRender();
  }

  function handleUndo() {
    if (!undoStack.length) return;
    var snap = undoStack.pop();
    syncUndoButtons();
    applySnapshot(snap);
  }

  function syncUndoButtons() {
    var canUndo = undoStack.length > 0;
    if (btnStageUndo) btnStageUndo.disabled = !canUndo;
    if (btnMqUndo) btnMqUndo.disabled = !canUndo;
  }

  /* ----- Sync Meta, Lock Screen, UI ----- */
  function syncDocumentMeta() {
    document.title = t('t_wallpaper_t') + ' — imgsfix';
    var descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', t('wg_meta_desc'));
  }

  function syncLockScreenClock() {
    if (!wgLockTime || !wgLockDate) return;
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, '0');
    var mm = String(now.getMinutes()).padStart(2, '0');
    wgLockTime.textContent = hh + ':' + mm;
    try {
      var locale = I.lang === 'ar' ? 'ar-EG' : 'en-US';
      wgLockDate.textContent = new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(now);
    } catch (_e) {
      wgLockDate.textContent = now.toDateString();
    }
  }

  function updateSpecUI() {
    var styleKey = STYLE_LABELS[state.styleId] || 'wg_style_mesh_t';
    if (wgActiveStylePill) {
      wgActiveStylePill.setAttribute('data-i18n', styleKey);
      wgActiveStylePill.textContent = t(styleKey);
    }
    var sizeLabel = SCREEN_PRESETS[state.sizeId] ? t(SCREEN_PRESETS[state.sizeId].labelKey) : t('wg_size_custom');
    var specStr = sizeLabel + ' · ' + state.width + ' × ' + state.height + ' px';
    if (state.styleId === 'pattern' && state.seamless) {
      specStr += ' · ' + t('wg_badge_seamless');
    }
    if (wgSpecMeta) wgSpecMeta.textContent = specStr;
    if (wgExportSummary) wgExportSummary.textContent = t(styleKey) + ' · ' + specStr;

    var svgOk = Boolean(SVG_SUPPORTED_STYLES[state.styleId]) && !state.baseImage;
    if (btnExportSvg) btnExportSvg.disabled = !svgOk;
    if (wgSvgNote) {
      var key = state.baseImage ? 'wg_svg_note_photo' : (svgOk ? 'wg_svg_note_supported' : 'wg_svg_note_raster');
      wgSvgNote.setAttribute('data-i18n', key);
      wgSvgNote.textContent = t(key);
    }
  }

  function syncSlidersUI() {
    if (wgDensity) wgDensity.value = String(state.density);
    if (wgDensityVal) wgDensityVal.textContent = state.density + '%';
    if (wgAngle) wgAngle.value = String(state.angle);
    if (wgAngleVal) wgAngleVal.textContent = state.angle + '°';
    if (wgSmoothness) wgSmoothness.value = String(state.smoothness);
    if (wgSmoothnessVal) wgSmoothnessVal.textContent = state.smoothness + '%';
    if (wgGrain) wgGrain.value = String(state.grain);
    if (wgGrainVal) wgGrainVal.textContent = state.grain + '%';
    if (wgPhotoBlur) wgPhotoBlur.value = String(state.photoBlur);
    if (wgPhotoBlurVal) wgPhotoBlurVal.textContent = state.photoBlur + 'px';
    if (wgPhotoOverlay) wgPhotoOverlay.value = String(state.photoOverlay);
    if (wgPhotoOverlayVal) wgPhotoOverlayVal.textContent = state.photoOverlay + '%';
  }

  function renderPaletteButtons() {
    if (!wgPaletteGrid) return;
    while (wgPaletteGrid.firstChild) {
      wgPaletteGrid.removeChild(wgPaletteGrid.firstChild);
    }
    CURATED_PALETTES.forEach(function (pal) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wg-palette-btn' + (state.paletteId === pal.id ? ' active' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', state.paletteId === pal.id ? 'true' : 'false');
      btn.setAttribute('data-palette', pal.id);

      var bar = document.createElement('span');
      bar.className = 'wg-palette-swatches';
      pal.colors.forEach(function (hex) {
        var chip = document.createElement('span');
        chip.style.backgroundColor = hex;
        bar.appendChild(chip);
      });

      var nameEl = document.createElement('span');
      nameEl.className = 'wg-palette-name';
      nameEl.textContent = t(pal.key);

      btn.appendChild(bar);
      btn.appendChild(nameEl);

      btn.addEventListener('click', function () {
        pushUndo();
        state.paletteId = pal.id;
        state.colors = pal.colors.slice();
        renderPaletteButtons();
        renderColorPickers();
        scheduleRender();
      });

      wgPaletteGrid.appendChild(btn);
    });
  }

  function renderColorPickers() {
    if (!wgColorPickers) return;
    while (wgColorPickers.firstChild) {
      wgColorPickers.removeChild(wgColorPickers.firstChild);
    }
    for (var i = 0; i < state.colorCount; i++) {
      (function (idx) {
        var hex = sanitizeHex(state.colors[idx] || '#1A5FFF');
        var wrap = document.createElement('div');
        wrap.className = 'wg-picker-item';

        var inp = document.createElement('input');
        inp.type = 'color';
        inp.value = hex;
        inp.setAttribute('aria-label', t('wg_color_slot') + ' ' + (idx + 1));

        var hexLabel = document.createElement('span');
        hexLabel.className = 'wg-picker-hex';
        hexLabel.textContent = hex;

        var preEditPushed = false;
        inp.addEventListener('input', function () {
          if (!preEditPushed) {
            pushUndo();
            preEditPushed = true;
          }
          var val = sanitizeHex(inp.value);
          state.colors[idx] = val;
          state.paletteId = 'custom';
          hexLabel.textContent = val;
          $$('.wg-palette-btn', wgPaletteGrid).forEach(function (b) {
            b.classList.remove('active');
            b.setAttribute('aria-checked', 'false');
          });
          scheduleRender();
        });
        inp.addEventListener('change', function () {
          preEditPushed = false;
        });

        wrap.appendChild(inp);
        wrap.appendChild(hexLabel);
        wgColorPickers.appendChild(wrap);
      })(i);
    }
  }

  function syncAllUI() {
    styleCards.forEach(function (card) {
      var active = card.getAttribute('data-style') === state.styleId;
      card.classList.toggle('active', active);
      card.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    sizeBtns.forEach(function (btn) {
      var active = btn.getAttribute('data-size') === state.sizeId;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    if (wgCustomDims) {
      wgCustomDims.classList.toggle('hide', !customPopoverOpen);
    }
    if (wgCustomW) wgCustomW.value = String(state.width);
    if (wgCustomH) wgCustomH.value = String(state.height);

    colorCountBtns.forEach(function (b) {
      b.classList.toggle('active', parseInt(b.getAttribute('data-count'), 10) === state.colorCount);
    });
    if (wgPatternOptions) {
      wgPatternOptions.classList.toggle('hide', state.styleId !== 'pattern');
    }
    motifBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-motif') === state.motif);
    });
    if (wgSeamlessToggle) {
      wgSeamlessToggle.checked = Boolean(state.seamless);
    }
    var hasBase = Boolean(state.baseImage);
    if (btnClearBasePhoto) btnClearBasePhoto.classList.toggle('hide', !hasBase);
    if (wgBasePhotoControls) wgBasePhotoControls.classList.toggle('hide', !hasBase);
    photoBlendBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-blend') === state.photoBlend);
    });

    syncSlidersUI();
    renderPaletteButtons();
    renderColorPickers();
    syncUndoButtons();
    updateSpecUI();
  }

  /* ----- Engine 1: Mesh & Aurora Gradients (Pure Canvas 2D) ----- */
  function renderMeshToCanvas(ctx, W, H, colors, rng) {
    var rad = (state.angle * Math.PI) / 180;
    var dx = Math.cos(rad) * W * 0.5;
    var dy = Math.sin(rad) * H * 0.5;
    var bgGrad = ctx.createLinearGradient(W * 0.5 - dx, H * 0.5 - dy, W * 0.5 + dx, H * 0.5 + dy);
    bgGrad.addColorStop(0, colors[0]);
    bgGrad.addColorStop(1, colors[colors.length - 1]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    var maxDim = Math.max(W, H);
    var minDim = Math.min(W, H);
    var blobCount = Math.round(5 + (state.density / 100) * 10);
    var spread = 0.48 + (state.smoothness / 100) * 0.52;

    /* Multi-point radial color clouds */
    ctx.save();
    for (var i = 0; i < blobCount; i++) {
      var col = colors[i % colors.length];
      var cx = (0.05 + rng() * 0.9) * W;
      var cy = (0.05 + rng() * 0.9) * H;
      var r = (0.35 + rng() * 0.55) * maxDim * spread;
      var rxScale = 0.72 + rng() * 0.75;
      var ryScale = 0.72 + rng() * 0.75;
      var rot = rad + (rng() - 0.5) * 1.4;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(rxScale, ryScale);
      ctx.globalCompositeOperation = (i % 3 === 0) ? 'source-over' : 'screen';

      var peakAlpha = 0.42 + (state.smoothness / 100) * 0.36;
      var rg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      rg.addColorStop(0, rgbaStr(col, peakAlpha));
      rg.addColorStop(0.38, rgbaStr(col, peakAlpha * 0.62));
      rg.addColorStop(0.72, rgbaStr(col, peakAlpha * 0.18));
      rg.addColorStop(1, rgbaStr(col, 0));

      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* Sweeping Aurora Light Ribbons */
    var ribbonCount = 2 + Math.round((state.density / 100) * 3);
    ctx.globalCompositeOperation = 'screen';
    for (var j = 0; j < ribbonCount; j++) {
      var rCol = colors[(j + 1) % colors.length];
      var yBase = (0.2 + (j / Math.max(1, ribbonCount)) * 0.65) * H;
      var amp = (0.12 + rng() * 0.22) * minDim;
      ctx.save();
      ctx.translate(W * 0.5, H * 0.5);
      ctx.rotate((rad - 0.6) * 0.35);
      ctx.translate(-W * 0.5, -H * 0.5);

      var ribbonGrad = ctx.createLinearGradient(0, yBase - amp * 2, 0, yBase + amp * 2);
      ribbonGrad.addColorStop(0, rgbaStr(rCol, 0));
      ribbonGrad.addColorStop(0.5, rgbaStr(rCol, 0.22 + (state.smoothness / 100) * 0.22));
      ribbonGrad.addColorStop(1, rgbaStr(rCol, 0));

      ctx.fillStyle = ribbonGrad;
      ctx.beginPath();
      ctx.moveTo(-W * 0.2, yBase - amp * 1.4);
      ctx.bezierCurveTo(
        W * 0.25, yBase - amp * (1.8 + rng()),
        W * 0.72, yBase + amp * (0.4 + rng()),
        W * 1.2, yBase - amp * 0.8
      );
      ctx.lineTo(W * 1.2, yBase + amp * 1.7);
      ctx.bezierCurveTo(
        W * 0.7, yBase + amp * (2.2 + rng()),
        W * 0.25, yBase + amp * 0.3,
        -W * 0.2, yBase + amp * 1.3
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /* ----- Engine 2: Layered Waves & Blobs (Canvas + SVG Builder) ----- */
  function buildWavesGeometry(W, H, colors, rng) {
    var layers = Math.round(4 + (state.density / 100) * 6);
    var smoothness = state.smoothness / 100;
    var ampScale = (0.045 + (1 - smoothness * 0.45) * 0.09) * H;
    var freq = 1.2 + (state.density / 100) * 2.2;
    var angleOffset = ((state.angle - 180) / 180) * H * 0.14;
    var paths = [];

    for (var l = 0; l < layers; l++) {
      var progress = (l + 0.65) / (layers + 0.5);
      var baseY = progress * H * 0.92;
      var phase = rng() * Math.PI * 2;
      var phase2 = rng() * Math.PI * 2;
      var pts = [];
      var steps = 16;

      for (var s = 0; s <= steps; s++) {
        var u = s / steps;
        var x = u * W;
        var tiltY = (u - 0.5) * angleOffset;
        var wave1 = Math.sin(u * Math.PI * freq + phase) * ampScale;
        var wave2 = Math.cos(u * Math.PI * freq * 1.85 + phase2) * (ampScale * 0.42);
        pts.push({ x: x, y: baseY + tiltY + wave1 + wave2 });
      }

      var cA = samplePalette(colors, (l + 1) / layers);
      var cB = adjustBrightness(cA, -0.22);
      paths.push({
        pts: pts,
        colorTop: cA,
        colorBot: cB,
      });
    }

    /* Decorative glowing organic blobs behind/between upper waves */
    var blobs = [];
    var blobN = 2 + Math.round(rng() * 3);
    for (var b = 0; b < blobN; b++) {
      blobs.push({
        cx: (0.12 + rng() * 0.76) * W,
        cy: (0.10 + rng() * 0.52) * H,
        r: (0.06 + rng() * 0.13) * Math.min(W, H),
        color: colors[(b + 1) % colors.length],
        alpha: 0.25 + rng() * 0.35,
      });
    }

    return { paths: paths, blobs: blobs };
  }

  function drawSmoothWavePath(ctx, pts, W, H) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(pts[0].x, pts[0].y);
    for (var i = 0; i < pts.length - 1; i++) {
      var xc = (pts[i].x + pts[i + 1].x) * 0.5;
      var yc = (pts[i].y + pts[i + 1].y) * 0.5;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    var last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.lineTo(W, H);
    ctx.closePath();
  }

  function wavePathToSvgD(pts, W, H) {
    var parts = ['M 0 ' + H.toFixed(1), 'L ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1)];
    for (var i = 0; i < pts.length - 1; i++) {
      var xc = (pts[i].x + pts[i + 1].x) * 0.5;
      var yc = (pts[i].y + pts[i + 1].y) * 0.5;
      parts.push('Q ' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1) + ' ' + xc.toFixed(1) + ' ' + yc.toFixed(1));
    }
    var last = pts[pts.length - 1];
    parts.push('L ' + last.x.toFixed(1) + ' ' + last.y.toFixed(1));
    parts.push('L ' + W.toFixed(1) + ' ' + H.toFixed(1) + ' Z');
    return parts.join(' ');
  }

  function renderWavesToCanvas(ctx, W, H, colors, rng) {
    var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, colors[0]);
    bgGrad.addColorStop(1, samplePalette(colors, 0.35));
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    var geom = buildWavesGeometry(W, H, colors, rng);

    geom.blobs.forEach(function (bl) {
      ctx.save();
      var g = ctx.createRadialGradient(bl.cx, bl.cy, 0, bl.cx, bl.cy, bl.r);
      g.addColorStop(0, rgbaStr(bl.color, bl.alpha));
      g.addColorStop(1, rgbaStr(bl.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bl.cx, bl.cy, bl.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    geom.paths.forEach(function (layer) {
      ctx.save();
      ctx.shadowColor = 'rgba(2, 6, 23, 0.32)';
      ctx.shadowBlur = Math.max(8, Math.round(H * 0.018));
      ctx.shadowOffsetY = -Math.max(3, Math.round(H * 0.005));

      var lg = ctx.createLinearGradient(0, layer.pts[0].y - H * 0.1, 0, H);
      lg.addColorStop(0, layer.colorTop);
      lg.addColorStop(1, layer.colorBot);
      ctx.fillStyle = lg;
      drawSmoothWavePath(ctx, layer.pts, W, H);
      ctx.fill();
      ctx.restore();
    });
  }

  /* ----- Engine 3: Geometric & Islamic Seamless Patterns (Canvas + SVG <pattern>) ----- */
  function drawTileMotifOnCtx(ctx, tw, th, motif, colors, strokeAlpha) {
    var c0 = colors[0];
    var c1 = colors[1 % colors.length];
    var c2 = colors[2 % colors.length];
    var c3 = colors[3 % colors.length];
    var cx = tw * 0.5;
    var cy = th * 0.5;
    var lw = Math.max(1.2, tw * 0.022);

    ctx.fillStyle = c0;
    ctx.fillRect(0, 0, tw, th);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (motif === 'star8') {
      /* Classic Islamic 8-Pointed Khatam Star & Interlocking Octagons */
      var s = tw * 0.31;
      /* Corner quarters for seamless edge wrapping */
      var centers = [
        [cx, cy],
        [0, 0],
        [tw, 0],
        [0, th],
        [tw, th],
      ];
      centers.forEach(function (pt, idx) {
        ctx.save();
        ctx.translate(pt[0], pt[1]);
        ctx.fillStyle = idx === 0 ? rgbaStr(c1, 0.72) : rgbaStr(c2, 0.55);
        ctx.strokeStyle = rgbaStr(c3, strokeAlpha);
        ctx.lineWidth = lw;
        ctx.fillRect(-s, -s, s * 2, s * 2);
        ctx.strokeRect(-s, -s, s * 2, s * 2);

        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = idx === 0 ? rgbaStr(c2, 0.68) : rgbaStr(c1, 0.58);
        ctx.fillRect(-s, -s, s * 2, s * 2);
        ctx.strokeRect(-s, -s, s * 2, s * 2);

        ctx.beginPath();
        ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = c3;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    } else if (motif === 'hex') {
      /* Isometric / Faceted Hexagons */
      var r = tw * 0.48;
      var hexCenters = [
        [cx, cy],
        [0, 0],
        [tw, 0],
        [0, th],
        [tw, th],
      ];
      hexCenters.forEach(function (pt, idx) {
        ctx.save();
        ctx.translate(pt[0], pt[1]);
        for (var k = 0; k < 6; k++) {
          var a1 = (Math.PI / 3) * k - Math.PI / 6;
          var a2 = (Math.PI / 3) * (k + 1) - Math.PI / 6;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
          ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
          ctx.closePath();
          var colIdx = (k + idx) % 3;
          var fillCol = colIdx === 0 ? c1 : (colIdx === 1 ? c2 : c3);
          ctx.fillStyle = rgbaStr(fillCol, 0.84);
          ctx.fill();
          ctx.strokeStyle = rgbaStr(c0, strokeAlpha);
          ctx.lineWidth = lw * 0.85;
          ctx.stroke();
        }
        ctx.restore();
      });
    } else if (motif === 'circles') {
      /* Interlocking Flower-of-Life Overlapping Circles */
      var radC = tw * 0.5;
      var ptsC = [
        [cx, cy, c1],
        [0, 0, c2],
        [tw, 0, c2],
        [0, th, c2],
        [tw, th, c2],
        [cx, 0, c3],
        [cx, th, c3],
        [0, cy, c3],
        [tw, cy, c3],
      ];
      ptsC.forEach(function (p) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], radC, 0, Math.PI * 2);
        ctx.strokeStyle = rgbaStr(p[2], strokeAlpha);
        ctx.lineWidth = lw * 1.15;
        ctx.fillStyle = rgbaStr(p[2], 0.14);
        ctx.fill();
        ctx.stroke();
      });
    } else {
      /* Sacred Tessellated Triangles */
      var halfW = tw * 0.5;
      var halfH = th * 0.5;
      var tris = [
        [[0, 0], [halfW, 0], [0, halfH], c1],
        [[halfW, 0], [halfW, halfH], [0, halfH], c2],
        [[halfW, 0], [tw, 0], [tw, halfH], c3],
        [[halfW, 0], [tw, halfH], [halfW, halfH], c1],
        [[0, halfH], [halfW, halfH], [0, th], c3],
        [[halfW, halfH], [halfW, th], [0, th], c1],
        [[halfW, halfH], [tw, halfH], [halfW, th], c2],
        [[tw, halfH], [tw, th], [halfW, th], c3],
      ];
      tris.forEach(function (tr) {
        ctx.beginPath();
        ctx.moveTo(tr[0][0], tr[0][1]);
        ctx.lineTo(tr[1][0], tr[1][1]);
        ctx.lineTo(tr[2][0], tr[2][1]);
        ctx.closePath();
        ctx.fillStyle = rgbaStr(tr[3], 0.82);
        ctx.fill();
        ctx.strokeStyle = rgbaStr(c0, strokeAlpha * 0.85);
        ctx.lineWidth = lw * 0.75;
        ctx.stroke();
      });
    }
  }

  function renderPatternToCanvas(ctx, W, H, colors) {
    var repeatTarget = Math.max(3, Math.round(3 + (state.density / 100) * 11));
    var tileW, tileH;

    if (state.seamless) {
      /* Exact integer tile subdivision for seamless 4-edge repeat */
      var cols = repeatTarget;
      tileW = W / cols;
      var rows = Math.max(2, Math.round(H / tileW));
      tileH = state.motif === 'hex' ? H / rows : tileW * ((H / rows) / tileW);
      /* Keep tile square when possible by locking H/rows near tileW */
      tileH = H / Math.max(1, Math.round(H / tileW));
    } else {
      tileW = Math.min(W, H) / repeatTarget;
      tileH = tileW;
    }

    var strokeAlpha = 0.35 + (state.smoothness / 100) * 0.65;
    var tileCanvas = document.createElement('canvas');
    tileCanvas.width = Math.max(32, Math.round(tileW));
    tileCanvas.height = Math.max(32, Math.round(tileH));
    var tctx = tileCanvas.getContext('2d');
    drawTileMotifOnCtx(tctx, tileCanvas.width, tileCanvas.height, state.motif, colors, strokeAlpha);

    ctx.save();
    if (!state.seamless && state.angle % 360 !== 0) {
      ctx.translate(W * 0.5, H * 0.5);
      ctx.rotate((state.angle * Math.PI) / 180);
      ctx.translate(-W * 0.5, -H * 0.5);
      var patR = ctx.createPattern(tileCanvas, 'repeat');
      ctx.fillStyle = patR;
      var diag = Math.hypot(W, H);
      ctx.fillRect(-diag, -diag, diag * 3, diag * 3);
    } else {
      var pat = ctx.createPattern(tileCanvas, 'repeat');
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    cleanupCanvas(tileCanvas);
  }

  /* ----- Engine 4: Low-Poly Crystal Triangles (Canvas + SVG) ----- */
  function buildLowPolyTriangles(W, H, colors, rng) {
    var cols = Math.round(6 + (state.density / 100) * 16);
    var rows = Math.max(4, Math.round(cols * (H / W)));
    var cellW = W / cols;
    var cellH = H / rows;
    var jitter = 0.38;

    var grid = [];
    for (var r = 0; r <= rows; r++) {
      var rowArr = [];
      for (var c = 0; c <= cols; c++) {
        var px = c * cellW;
        var py = r * cellH;
        if (c > 0 && c < cols) px += (rng() - 0.5) * 2 * cellW * jitter;
        if (r > 0 && r < rows) py += (rng() - 0.5) * 2 * cellH * jitter;
        rowArr.push({ x: px, y: py });
      }
      grid.push(rowArr);
    }

    var rad = (state.angle * Math.PI) / 180;
    var cosA = Math.cos(rad);
    var sinA = Math.sin(rad);
    var contrast = 0.08 + (state.smoothness / 100) * 0.22;
    var tris = [];

    function makeTri(p1, p2, p3) {
      var cx = (p1.x + p2.x + p3.x) / 3;
      var cy = (p1.y + p2.y + p3.y) / 3;
      var nx = cx / W - 0.5;
      var ny = cy / H - 0.5;
      var gradPos = clamp(0.5 + nx * cosA + ny * sinA, 0, 1);
      var baseCol = samplePalette(colors, gradPos);
      var shade = (rng() - 0.45) * 2 * contrast;
      var col = adjustBrightness(baseCol, shade);
      tris.push({ p1: p1, p2: p2, p3: p3, color: col });
    }

    for (var rr = 0; rr < rows; rr++) {
      for (var cc = 0; cc < cols; cc++) {
        var tl = grid[rr][cc];
        var tr = grid[rr][cc + 1];
        var bl = grid[rr + 1][cc];
        var br = grid[rr + 1][cc + 1];
        if (rng() > 0.5) {
          makeTri(tl, tr, br);
          makeTri(tl, br, bl);
        } else {
          makeTri(tl, tr, bl);
          makeTri(tr, br, bl);
        }
      }
    }
    return tris;
  }

  function renderLowPolyToCanvas(ctx, W, H, colors, rng) {
    var tris = buildLowPolyTriangles(W, H, colors, rng);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(0.8, W * 0.0008);
    tris.forEach(function (tr) {
      ctx.beginPath();
      ctx.moveTo(tr.p1.x, tr.p1.y);
      ctx.lineTo(tr.p2.x, tr.p2.y);
      ctx.lineTo(tr.p3.x, tr.p3.y);
      ctx.closePath();
      ctx.fillStyle = tr.color;
      ctx.strokeStyle = tr.color;
      ctx.fill();
      ctx.stroke();
    });
  }

  /* ----- Engine 5: Minimalist Abstract & Bauhaus (Canvas + SVG) ----- */
  function buildAbstractShapes(W, H, colors, rng) {
    var cols = Math.round(3 + (state.density / 100) * 4);
    var rows = Math.max(3, Math.round(cols * (H / W)));
    var cellW = W / cols;
    var cellH = H / rows;
    var shapes = [];
    var fgColors = colors.length > 1 ? colors.slice(1) : colors.slice();

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (rng() < 0.14) continue; /* Intentional minimalist breathing space */
        var x = c * cellW;
        var y = r * cellH;
        var col = fgColors[Math.floor(rng() * fgColors.length)];
        var colAlt = fgColors[Math.floor(rng() * fgColors.length)];
        var kind = Math.floor(rng() * 6);
        var orient = Math.floor(rng() * 4);
        shapes.push({
          kind: kind,
          orient: orient,
          x: x,
          y: y,
          w: cellW,
          h: cellH,
          color: col,
          colorAlt: colAlt,
        });
      }
    }
    return { bg: colors[0], shapes: shapes };
  }

  function renderAbstractToCanvas(ctx, W, H, colors, rng) {
    var scene = buildAbstractShapes(W, H, colors, rng);
    ctx.fillStyle = scene.bg;
    ctx.fillRect(0, 0, W, H);

    scene.shapes.forEach(function (s) {
      var m = Math.min(s.w, s.h);
      var cx = s.x + s.w * 0.5;
      var cy = s.y + s.h * 0.5;
      ctx.save();
      ctx.fillStyle = s.color;
      ctx.strokeStyle = s.color;

      if (s.kind === 0) {
        /* Quarter-circle Bauhaus arc from cell corner */
        var corners = [
          [s.x, s.y, 0, Math.PI * 0.5],
          [s.x + s.w, s.y, Math.PI * 0.5, Math.PI],
          [s.x + s.w, s.y + s.h, Math.PI, Math.PI * 1.5],
          [s.x, s.y + s.h, Math.PI * 1.5, Math.PI * 2],
        ];
        var cn = corners[s.orient];
        ctx.beginPath();
        ctx.moveTo(cn[0], cn[1]);
        ctx.arc(cn[0], cn[1], m * 0.94, cn[2], cn[3]);
        ctx.closePath();
        ctx.fill();
      } else if (s.kind === 1) {
        /* Solid circle + concentric ring */
        ctx.beginPath();
        ctx.arc(cx, cy, m * 0.42, 0, Math.PI * 2);
        ctx.fill();
        if (s.colorAlt !== s.color) {
          ctx.beginPath();
          ctx.arc(cx, cy, m * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = s.colorAlt;
          ctx.fill();
        }
      } else if (s.kind === 2) {
        /* Diagonal cut triangle */
        ctx.beginPath();
        if (s.orient % 2 === 0) {
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + s.w, s.y);
          ctx.lineTo(s.x, s.y + s.h);
        } else {
          ctx.moveTo(s.x + s.w, s.y);
          ctx.lineTo(s.x + s.w, s.y + s.h);
          ctx.lineTo(s.x, s.y + s.h);
        }
        ctx.closePath();
        ctx.fill();
      } else if (s.kind === 3) {
        /* Rounded capsule / arch */
        var pad = m * 0.14;
        var bw = s.w - pad * 2;
        var bh = s.h - pad * 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(s.x + pad, s.y + pad, bw, bh, Math.min(bw, bh) * 0.5);
        else ctx.rect(s.x + pad, s.y + pad, bw, bh);
        ctx.fill();
      } else if (s.kind === 4) {
        /* Precision Bauhaus parallel line stripes */
        var lines = 5;
        ctx.lineWidth = Math.max(2, m * 0.055);
        ctx.lineCap = 'round';
        for (var k = 0; k < lines; k++) {
          var tFrac = (k + 0.5) / lines;
          ctx.beginPath();
          if (s.orient % 2 === 0) {
            var lx = s.x + s.w * tFrac;
            ctx.moveTo(lx, s.y + s.h * 0.14);
            ctx.lineTo(lx, s.y + s.h * 0.86);
          } else {
            var ly = s.y + s.h * tFrac;
            ctx.moveTo(s.x + s.w * 0.14, ly);
            ctx.lineTo(s.x + s.w * 0.86, ly);
          }
          ctx.stroke();
        }
      } else {
        /* Half-moon split disc */
        ctx.beginPath();
        var startA = s.orient * (Math.PI * 0.5);
        ctx.arc(cx, cy, m * 0.44, startA, startA + Math.PI);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  }

  /* ----- Engine 6: Cosmic Nebula & Bokeh Lights (Canvas 2D) ----- */
  function renderNebulaToCanvas(ctx, W, H, colors, rng) {
    var rad = (state.angle * Math.PI) / 180;
    var minDim = Math.min(W, H);
    var maxDim = Math.max(W, H);

    var spaceBg = ctx.createRadialGradient(
      W * (0.5 + Math.cos(rad) * 0.2),
      H * (0.45 + Math.sin(rad) * 0.2),
      minDim * 0.05,
      W * 0.5,
      H * 0.5,
      maxDim * 0.9
    );
    spaceBg.addColorStop(0, lerpColor(colors[0], colors[1 % colors.length], 0.28));
    spaceBg.addColorStop(0.55, colors[0]);
    spaceBg.addColorStop(1, adjustBrightness(colors[0], -0.45));
    ctx.fillStyle = spaceBg;
    ctx.fillRect(0, 0, W, H);

    /* Cosmic Nebula Clouds */
    ctx.save();
    var cloudN = 5 + Math.round((state.density / 100) * 6);
    var glowStrength = 0.25 + (state.smoothness / 100) * 0.35;
    for (var i = 0; i < cloudN; i++) {
      var col = colors[1 + (i % Math.max(1, colors.length - 1))] || colors[0];
      var cx = (0.1 + rng() * 0.8) * W;
      var cy = (0.1 + rng() * 0.8) * H;
      var cr = (0.28 + rng() * 0.42) * maxDim;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rad + (rng() - 0.5) * 1.6);
      ctx.scale(0.65 + rng() * 0.8, 0.45 + rng() * 0.65);
      ctx.globalCompositeOperation = 'screen';
      var cg = ctx.createRadialGradient(0, 0, 0, 0, 0, cr);
      cg.addColorStop(0, rgbaStr(col, glowStrength));
      cg.addColorStop(0.45, rgbaStr(col, glowStrength * 0.48));
      cg.addColorStop(1, rgbaStr(col, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* Pinpoint Starfield */
    var starCount = Math.round(90 + (state.density / 100) * 260);
    ctx.globalCompositeOperation = 'screen';
    for (var s = 0; s < starCount; s++) {
      var sx = rng() * W;
      var sy = rng() * H;
      var sr = (0.4 + rng() * 1.45) * (maxDim / 1080);
      var sAlpha = 0.35 + rng() * 0.62;
      var sCol = rng() > 0.72 ? colors[colors.length - 1] : '#FFFFFF';
      ctx.fillStyle = rgbaStr(sCol, sAlpha);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.7, sr), 0, Math.PI * 2);
      ctx.fill();
    }

    /* Cinematic Bokeh Lights (soft discs + crisp bright rings) */
    var bokehCount = Math.round(14 + (state.density / 100) * 28);
    var bokehBlurFactor = 0.25 + (state.smoothness / 100) * 0.55;
    for (var b = 0; b < bokehCount; b++) {
      var bx = rng() * W;
      var by = rng() * H;
      var br = (0.015 + rng() * 0.065) * minDim;
      var bCol = colors[1 + (b % Math.max(1, colors.length - 1))] || '#FFFFFF';
      var bAlpha = 0.10 + rng() * 0.26;
      var bgGrad = ctx.createRadialGradient(bx, by, br * 0.2, bx, by, br);
      bgGrad.addColorStop(0, rgbaStr(bCol, bAlpha * (1 - bokehBlurFactor * 0.35)));
      bgGrad.addColorStop(0.75, rgbaStr(bCol, bAlpha * 0.85));
      bgGrad.addColorStop(0.92, rgbaStr(bCol, bAlpha * 1.25));
      bgGrad.addColorStop(1, rgbaStr(bCol, 0));
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();

      if (rng() > 0.52) {
        ctx.strokeStyle = rgbaStr(adjustBrightness(bCol, 0.35), bAlpha * 0.9);
        ctx.lineWidth = Math.max(1, br * 0.045);
        ctx.beginPath();
        ctx.arc(bx, by, br * 0.88, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    /* 4-Point Diffraction Starlight Sparkles */
    var sparkleCount = Math.round(6 + (state.density / 100) * 12);
    for (var sp = 0; sp < sparkleCount; sp++) {
      var px = (0.08 + rng() * 0.84) * W;
      var py = (0.08 + rng() * 0.84) * H;
      var arm = (0.014 + rng() * 0.028) * minDim;
      var spCol = rng() > 0.4 ? '#FFFFFF' : colors[colors.length - 1];
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rad * 0.25);
      var coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, arm * 0.65);
      coreG.addColorStop(0, rgbaStr('#FFFFFF', 0.95));
      coreG.addColorStop(0.4, rgbaStr(spCol, 0.45));
      coreG.addColorStop(1, rgbaStr(spCol, 0));
      ctx.fillStyle = coreG;
      ctx.beginPath();
      ctx.arc(0, 0, arm * 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = rgbaStr(spCol, 0.88);
      ctx.beginPath();
      ctx.moveTo(0, -arm);
      ctx.quadraticCurveTo(arm * 0.08, -arm * 0.08, arm, 0);
      ctx.quadraticCurveTo(arm * 0.08, arm * 0.08, 0, arm);
      ctx.quadraticCurveTo(-arm * 0.08, arm * 0.08, -arm, 0);
      ctx.quadraticCurveTo(-arm * 0.08, -arm * 0.08, 0, -arm);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /* ----- Engine 7: Minimalist Mountain & Sunset Silhouette (Canvas + SVG) ----- */
  function buildMountainScene(W, H, colors, rng) {
    var layerCount = Math.round(4 + (state.density / 100) * 3);
    var smoothness = state.smoothness / 100;
    var sunXNorm = clamp(0.2 + ((state.angle % 360) / 360) * 0.6, 0.16, 0.84);
    var sunYNorm = 0.22 + (1 - smoothness) * 0.12;
    var sunR = Math.min(W, H) * (0.09 + smoothness * 0.05);

    var sunCol = colors[colors.length - 1];
    var horizonCol = colors[Math.max(1, colors.length - 2)];
    var skyTop = colors[0];
    var skyMid = lerpColor(skyTop, colors[1 % colors.length], 0.55);

    var ridges = [];
    for (var l = 0; l < layerCount; l++) {
      var frac = (l + 1) / layerCount;
      var baseY = H * (0.44 + frac * 0.44);
      var amp = H * (0.05 + (1 - frac * 0.4) * 0.085) * (1.1 - smoothness * 0.32);
      var steps = 28;
      var phase1 = rng() * Math.PI * 2;
      var phase2 = rng() * Math.PI * 2;
      var phase3 = rng() * Math.PI * 2;
      var pts = [];
      for (var s = 0; s <= steps; s++) {
        var u = s / steps;
        var x = u * W;
        var ridgeH =
          Math.sin(u * Math.PI * (2.2 + l * 0.6) + phase1) * 0.55 +
          Math.cos(u * Math.PI * (5.1 + l * 1.1) + phase2) * 0.30 +
          Math.sin(u * Math.PI * 11.3 + phase3) * 0.15;
        /* Jagged peaks for sharp minimal aesthetic */
        var triWave = Math.abs(((u * (2.4 + l * 0.5) + phase1) % 2) - 1) * 2 - 1;
        var combined = ridgeH * (0.45 + smoothness * 0.4) + triWave * (0.55 - smoothness * 0.35);
        pts.push({ x: x, y: baseY - combined * amp });
      }
      var ridgeTopCol = lerpColor(horizonCol, adjustBrightness(colors[0], -0.45), frac * 0.88);
      var ridgeBotCol = lerpColor(ridgeTopCol, horizonCol, 0.35 * (1 - frac * 0.55));
      var trees = [];
      if (l >= layerCount - 2) {
        var treeStep = Math.max(1, Math.floor(steps / 14));
        for (var tIdx = 1; tIdx < pts.length - 1; tIdx += treeStep) {
          if (rng() > 0.38) {
            trees.push({
              x: pts[tIdx].x,
              y: pts[tIdx].y,
              h: Math.min(W, H) * (0.018 + rng() * 0.018) * (0.75 + frac * 0.45),
            });
          }
        }
      }
      ridges.push({ pts: pts, topCol: ridgeTopCol, botCol: ridgeBotCol, trees: trees });
    }

    return {
      sunX: sunXNorm * W,
      sunY: sunYNorm * H,
      sunR: sunR,
      sunCol: sunCol,
      skyTop: skyTop,
      skyMid: skyMid,
      horizonCol: horizonCol,
      ridges: ridges,
    };
  }

  function renderMountainToCanvas(ctx, W, H, colors, rng) {
    var sc = buildMountainScene(W, H, colors, rng);
    var skyG = ctx.createLinearGradient(0, 0, 0, H * 0.72);
    skyG.addColorStop(0, sc.skyTop);
    skyG.addColorStop(0.55, sc.skyMid);
    skyG.addColorStop(1, sc.horizonCol);
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, W, H);

    /* Glowing Sun / Moon Orb */
    var halo = ctx.createRadialGradient(sc.sunX, sc.sunY, sc.sunR * 0.5, sc.sunX, sc.sunY, sc.sunR * 3.2);
    halo.addColorStop(0, rgbaStr(sc.sunCol, 0.62));
    halo.addColorStop(0.45, rgbaStr(sc.sunCol, 0.22));
    halo.addColorStop(1, rgbaStr(sc.sunCol, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(sc.sunX, sc.sunY, sc.sunR * 3.2, 0, Math.PI * 2);
    ctx.fill();

    var sunG = ctx.createLinearGradient(0, sc.sunY - sc.sunR, 0, sc.sunY + sc.sunR);
    sunG.addColorStop(0, adjustBrightness(sc.sunCol, 0.35));
    sunG.addColorStop(1, sc.sunCol);
    ctx.fillStyle = sunG;
    ctx.beginPath();
    ctx.arc(sc.sunX, sc.sunY, sc.sunR, 0, Math.PI * 2);
    ctx.fill();

    /* Mountain Ridges + Mist + Pine Silhouettes */
    sc.ridges.forEach(function (ridge) {
      var minY = H;
      ridge.pts.forEach(function (p) { if (p.y < minY) minY = p.y; });

      var mg = ctx.createLinearGradient(0, minY, 0, H);
      mg.addColorStop(0, ridge.topCol);
      mg.addColorStop(1, ridge.botCol);
      ctx.fillStyle = mg;

      ctx.beginPath();
      ctx.moveTo(0, H);
      ridge.pts.forEach(function (p) { ctx.lineTo(p.x, p.y); });
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();

      /* Pine tree silhouettes */
      if (ridge.trees.length) {
        ctx.fillStyle = ridge.topCol;
        ridge.trees.forEach(function (tr) {
          var tw = tr.h * 0.42;
          ctx.beginPath();
          ctx.moveTo(tr.x, tr.y - tr.h);
          ctx.lineTo(tr.x - tw, tr.y + tr.h * 0.15);
          ctx.lineTo(tr.x + tw, tr.y + tr.h * 0.15);
          ctx.closePath();
          ctx.fill();
        });
      }
    });
  }

  /* ----- Engine 8: Night Cityscape Skyline (Canvas + SVG) ----- */
  function buildCityScene(W, H, colors, rng) {
    var horizonY = H * 0.76;
    var moonX = W * clamp(0.18 + ((state.angle % 360) / 360) * 0.64, 0.14, 0.86);
    var moonY = H * 0.22;
    var moonR = Math.min(W, H) * 0.065;
    var buildingTarget = Math.round(12 + (state.density / 100) * 18);
    var layers = [
      { depth: 0, count: buildingTarget, maxH: H * 0.34, minH: H * 0.12, fill: adjustBrightness(colors[0], 0.12), winAlpha: 0.38 },
      { depth: 1, count: Math.max(8, Math.round(buildingTarget * 0.78)), maxH: H * 0.48, minH: H * 0.16, fill: adjustBrightness(colors[0], -0.32), winAlpha: 0.88 },
    ];

    var stars = [];
    var starN = Math.round(45 + (state.smoothness / 100) * 65);
    for (var s = 0; s < starN; s++) {
      stars.push({
        x: rng() * W,
        y: rng() * horizonY * 0.85,
        r: Math.max(0.8, (0.6 + rng() * 1.4) * (Math.max(W, H) / 1400)),
        a: 0.3 + rng() * 0.65,
      });
    }

    var winColors = [colors[colors.length - 1], colors[Math.max(1, colors.length - 2)], '#FDE68A'];
    var builtLayers = layers.map(function (lay) {
      var bldgs = [];
      var curX = -W * 0.02;
      while (curX < W * 1.02) {
        var bw = (W / lay.count) * (0.72 + rng() * 0.75);
        var bh = lay.minH + rng() * (lay.maxH - lay.minH);
        var topY = horizonY - bh;
        var roofKind = Math.floor(rng() * 3); /* 0 flat, 1 spire, 2 stepped */
        var windows = [];
        var padX = bw * 0.16;
        var padY = bh * 0.08;
        var colsW = Math.max(2, Math.floor((bw - padX * 2) / Math.max(8, W * 0.012)));
        var stepX = (bw - padX * 2) / colsW;
        var stepY = Math.max(10, stepX * 1.45);
        var rowsW = Math.max(2, Math.floor((bh - padY * 2) / stepY));
        var winW = stepX * 0.48;
        var winH = stepY * 0.46;

        for (var rr = 0; rr < rowsW; rr++) {
          for (var cc = 0; cc < colsW; cc++) {
            if (rng() > (0.45 - (state.smoothness / 100) * 0.15)) {
              windows.push({
                x: curX + padX + cc * stepX,
                y: topY + padY + rr * stepY,
                w: winW,
                h: winH,
                color: winColors[Math.floor(rng() * winColors.length)],
              });
            }
          }
        }

        bldgs.push({
          x: curX,
          y: topY,
          w: bw,
          h: bh,
          roofKind: roofKind,
          windows: windows,
        });
        curX += bw * (0.86 + rng() * 0.22);
      }
      return { fill: lay.fill, winAlpha: lay.winAlpha, bldgs: bldgs };
    });

    return {
      horizonY: horizonY,
      moonX: moonX,
      moonY: moonY,
      moonR: moonR,
      skyTop: adjustBrightness(colors[0], -0.25),
      skyBot: colors[1 % colors.length],
      waterTop: lerpColor(colors[0], colors[1 % colors.length], 0.3),
      waterBot: adjustBrightness(colors[0], -0.45),
      glowCol: colors[colors.length - 1],
      stars: stars,
      layers: builtLayers,
    };
  }

  function renderCityToCanvas(ctx, W, H, colors, rng) {
    var sc = buildCityScene(W, H, colors, rng);
    var horizonY = sc.horizonY;

    /* Sky */
    var skyG = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyG.addColorStop(0, sc.skyTop);
    skyG.addColorStop(1, sc.skyBot);
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, W, horizonY + 2);

    /* Stars */
    sc.stars.forEach(function (st) {
      ctx.fillStyle = rgbaStr('#FFFFFF', st.a);
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    });

    /* Moon & Glow */
    var moonHalo = ctx.createRadialGradient(sc.moonX, sc.moonY, sc.moonR * 0.4, sc.moonX, sc.moonY, sc.moonR * 3);
    moonHalo.addColorStop(0, rgbaStr(sc.glowCol, 0.42));
    moonHalo.addColorStop(1, rgbaStr(sc.glowCol, 0));
    ctx.fillStyle = moonHalo;
    ctx.beginPath();
    ctx.arc(sc.moonX, sc.moonY, sc.moonR * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = adjustBrightness(sc.glowCol, 0.35);
    ctx.beginPath();
    ctx.arc(sc.moonX, sc.moonY, sc.moonR, 0, Math.PI * 2);
    ctx.fill();

    /* Draw Skyline Buildings Helper */
    function drawBuildings(layer, flipped) {
      layer.bldgs.forEach(function (b) {
        ctx.fillStyle = layer.fill;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.roofKind === 1) {
          ctx.fillRect(b.x + b.w * 0.46, b.y - b.h * 0.14, Math.max(2, b.w * 0.08), b.h * 0.14);
        } else if (b.roofKind === 2) {
          ctx.fillRect(b.x + b.w * 0.16, b.y - b.h * 0.08, b.w * 0.68, b.h * 0.08);
        }
        ctx.save();
        ctx.globalAlpha = flipped ? layer.winAlpha * 0.34 : layer.winAlpha;
        b.windows.forEach(function (win) {
          ctx.fillStyle = win.color;
          ctx.fillRect(win.x, win.y, win.w, win.h);
        });
        ctx.restore();
      });
    }

    sc.layers.forEach(function (lay) { drawBuildings(lay, false); });

    /* Water Base & Mirrored City Reflection */
    var waterG = ctx.createLinearGradient(0, horizonY, 0, H);
    waterG.addColorStop(0, sc.waterTop);
    waterG.addColorStop(1, sc.waterBot);
    ctx.fillStyle = waterG;
    ctx.fillRect(0, horizonY, W, H - horizonY);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizonY, W, H - horizonY);
    ctx.clip();
    ctx.translate(0, horizonY * 2);
    ctx.scale(1, -0.58);
    ctx.globalAlpha = 0.45;
    sc.layers.forEach(function (lay) { drawBuildings(lay, true); });
    ctx.restore();

    /* Calm Horizontal Water Ripples */
    var rippleCount = 26;
    for (var r = 0; r < rippleCount; r++) {
      var rf = r / rippleCount;
      var ry = horizonY + rf * (H - horizonY);
      ctx.fillStyle = rgbaStr(sc.glowCol, (1 - rf) * 0.12);
      var segW = W * (0.12 + rng() * 0.25);
      var segX = clamp(sc.moonX - segW * 0.5 + (rng() - 0.5) * W * 0.45, 0, W - segW);
      ctx.fillRect(segX, ry, segW, Math.max(1.2, (H - horizonY) * 0.008));
    }
  }

  /* ----- Engine 9: Topographic Contour Lines (Marching Squares, Canvas + SVG) ----- */
  function buildTopoContours(W, H, colors, rng) {
    var gx = 84;
    var gy = Math.max(48, Math.round(gx * (H / W)));
    var rad = (state.angle * Math.PI) / 180;
    var cosA = Math.cos(rad);
    var sinA = Math.sin(rad);

    /* Seeded multi-octave organic elevation scalar field */
    var freqBase = 2.2 + (state.density / 100) * 2.2;
    var p1 = rng() * Math.PI * 2;
    var p2 = rng() * Math.PI * 2;
    var p3 = rng() * Math.PI * 2;
    var p4 = rng() * Math.PI * 2;

    var field = [];
    for (var y = 0; y <= gy; y++) {
      var row = new Float32Array(gx + 1);
      var ny = y / gy - 0.5;
      for (var x = 0; x <= gx; x++) {
        var nx = x / gx - 0.5;
        var rx = nx * cosA - ny * sinA;
        var ry = nx * sinA + ny * cosA;
        var v =
          Math.sin(rx * freqBase * 2.1 + p1) * Math.cos(ry * freqBase * 2.1 + p2) * 0.5 +
          Math.sin((rx * 1.4 - ry * 1.1) * freqBase * 3.1 + p3) * 0.3 +
          Math.cos(Math.hypot(rx + 0.15, ry - 0.12) * freqBase * 4.2 + p4) * 0.22;
        row[x] = v;
      }
      field.push(row);
    }

    var levelsCount = Math.round(7 + (state.density / 100) * 14);
    var contourPolylines = [];
    var cw = W / gx;
    var ch = H / gy;

    function interp(x1, y1, v1, x2, y2, v2, iso) {
      var dv = v2 - v1;
      var f = Math.abs(dv) < 1e-6 ? 0.5 : clamp((iso - v1) / dv, 0, 1);
      return { x: (x1 + (x2 - x1) * f) * cw, y: (y1 + (y2 - y1) * f) * ch };
    }

    for (var lv = 0; lv < levelsCount; lv++) {
      var frac = (lv + 0.5) / levelsCount;
      var iso = -0.82 + frac * 1.64;
      var segs = [];
      for (var yy = 0; yy < gy; yy++) {
        for (var xx = 0; xx < gx; xx++) {
          var tl = field[yy][xx];
          var tr = field[yy][xx + 1];
          var br = field[yy + 1][xx + 1];
          var bl = field[yy + 1][xx];
          var idx =
            (tl >= iso ? 8 : 0) |
            (tr >= iso ? 4 : 0) |
            (br >= iso ? 2 : 0) |
            (bl >= iso ? 1 : 0);
          if (idx === 0 || idx === 15) continue;

          var topPt = interp(xx, yy, tl, xx + 1, yy, tr, iso);
          var rightPt = interp(xx + 1, yy, tr, xx + 1, yy + 1, br, iso);
          var botPt = interp(xx + 1, yy + 1, br, xx, yy + 1, bl, iso);
          var leftPt = interp(xx, yy + 1, bl, xx, yy, tl, iso);

          switch (idx) {
            case 1: case 14: segs.push([leftPt, botPt]); break;
            case 2: case 13: segs.push([botPt, rightPt]); break;
            case 3: case 12: segs.push([leftPt, rightPt]); break;
            case 4: case 11: segs.push([topPt, rightPt]); break;
            case 5: segs.push([leftPt, topPt], [botPt, rightPt]); break;
            case 6: case 9: segs.push([topPt, botPt]); break;
            case 7: case 8: segs.push([leftPt, topPt]); break;
            case 10: segs.push([topPt, rightPt], [leftPt, botPt]); break;
          }
        }
      }
      var fgPalette = colors.length > 1 ? colors.slice(1) : colors;
      var lineCol = samplePalette(fgPalette, frac);
      var isIndexLine = (lv % 4 === 0);
      contourPolylines.push({ segs: segs, color: lineCol, major: isIndexLine });
    }

    return { bgTop: colors[0], bgBot: adjustBrightness(colors[0], -0.22), levels: contourPolylines };
  }

  function renderTopoToCanvas(ctx, W, H, colors, rng) {
    var sc = buildTopoContours(W, H, colors, rng);
    var bgG = ctx.createLinearGradient(0, 0, W, H);
    bgG.addColorStop(0, sc.bgTop);
    bgG.addColorStop(1, sc.bgBot);
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, W, H);

    var baseThick = Math.max(1.2, (Math.min(W, H) / 1000) * (1.1 + (state.smoothness / 100) * 3.4));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    sc.levels.forEach(function (lv) {
      if (!lv.segs.length) return;
      ctx.strokeStyle = rgbaStr(lv.color, lv.major ? 0.92 : 0.58);
      ctx.lineWidth = lv.major ? baseThick * 1.75 : baseThick;
      ctx.beginPath();
      for (var i = 0; i < lv.segs.length; i++) {
        var sg = lv.segs[i];
        ctx.moveTo(sg[0].x, sg[0].y);
        ctx.lineTo(sg[1].x, sg[1].y);
      }
      ctx.stroke();
    });
  }

  /* ----- Fast Photographic Film Grain Overlay ----- */
  function ensureGrainTile() {
    if (grainTileSeed === state.seed && grainTileCanvas.width === 256) return;
    grainTileSeed = state.seed;
    grainTileCanvas.width = 256;
    grainTileCanvas.height = 256;
    var gctx = grainTileCanvas.getContext('2d');
    var imgData = gctx.createImageData(256, 256);
    var d = imgData.data;
    var rng = mulberry32(state.seed ^ 0x9E3779B9);
    for (var i = 0; i < d.length; i += 4) {
      var n = Math.floor((rng() + rng()) * 0.5 * 255);
      d[i] = n;
      d[i + 1] = n;
      d[i + 2] = n;
      d[i + 3] = 255;
    }
    gctx.putImageData(imgData, 0, 0);
  }

  function applyFilmGrain(ctx, W, H) {
    if (state.grain <= 0) return;
    ensureGrainTile();
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = clamp((state.grain / 100) * 0.42, 0, 0.45);
    var pat = ctx.createPattern(grainTileCanvas, 'repeat');
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  /* ----- Base Photo Glassmorphism & Gradient Overlay Helper ----- */
  function renderBasePhotoWithOverlay(ctx, W, H, colors) {
    var img = state.baseImage;
    var iw = state.baseImageW;
    var ih = state.baseImageH;
    var baseScale = Math.max(W / iw, H / ih);
    var bleedScale = state.photoBlur > 0 ? 1.07 : 1.0;
    var dw = iw * baseScale * bleedScale;
    var dh = ih * baseScale * bleedScale;
    var dx = (W - dw) * 0.5;
    var dy = (H - dh) * 0.5;

    ctx.save();
    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, W, H);

    if (state.photoBlur > 0) {
      var scaledBlur = Math.max(1, (state.photoBlur / 1120) * Math.max(W, H));
      ctx.filter = 'blur(' + scaledBlur.toFixed(1) + 'px)';
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
    ctx.restore();

    if (state.photoOverlay > 0) {
      var rad = (state.angle * Math.PI) / 180;
      var ox = Math.cos(rad) * W * 0.5;
      var oy = Math.sin(rad) * H * 0.5;
      var grad = ctx.createLinearGradient(W * 0.5 - ox, H * 0.5 - oy, W * 0.5 + ox, H * 0.5 + oy);
      for (var i = 0; i < colors.length; i++) {
        grad.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), colors[i]);
      }
      ctx.save();
      ctx.globalCompositeOperation = state.photoBlend || 'screen';
      ctx.globalAlpha = clamp(state.photoOverlay / 100, 0, 0.95);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  /* ----- Master Canvas Renderer (Preview + True 4K Export) ----- */
  function renderWallpaperToCanvas(canvas, targetW, targetH) {
    if (!canvas) return;
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    var colors = getActiveColors();
    var rng = mulberry32(state.seed);

    if (state.baseImage) {
      renderBasePhotoWithOverlay(ctx, targetW, targetH, colors);
    } else if (state.styleId === 'mesh') {
      renderMeshToCanvas(ctx, targetW, targetH, colors, rng);
    } else if (state.styleId === 'waves') {
      renderWavesToCanvas(ctx, targetW, targetH, colors, rng);
    } else if (state.styleId === 'pattern') {
      renderPatternToCanvas(ctx, targetW, targetH, colors);
    } else if (state.styleId === 'lowpoly') {
      renderLowPolyToCanvas(ctx, targetW, targetH, colors, rng);
    } else if (state.styleId === 'nebula') {
      renderNebulaToCanvas(ctx, targetW, targetH, colors, rng);
    } else if (state.styleId === 'mountain') {
      renderMountainToCanvas(ctx, targetW, targetH, colors, rng);
    } else if (state.styleId === 'city') {
      renderCityToCanvas(ctx, targetW, targetH, colors, rng);
    } else if (state.styleId === 'topo') {
      renderTopoToCanvas(ctx, targetW, targetH, colors, rng);
    } else {
      renderAbstractToCanvas(ctx, targetW, targetH, colors, rng);
    }

    applyFilmGrain(ctx, targetW, targetH);
  }

  function renderPreview() {
    updateSpecUI();
    if (!wgPreviewCanvas) return;
    var scale = Math.min(1, PREVIEW_MAX_SIDE / Math.max(state.width, state.height));
    var pw = Math.max(120, Math.round(state.width * scale));
    var ph = Math.max(120, Math.round(state.height * scale));
    renderWallpaperToCanvas(wgPreviewCanvas, pw, ph);
  }

  function scheduleRender() {
    if (renderRaf) return;
    renderRaf = requestAnimationFrame(function () {
      renderRaf = 0;
      renderPreview();
    });
  }

  /* ----- Vector SVG Builder (Clean XML Escaped, 0 External Deps) ----- */
  function buildVectorSvg() {
    var W = state.width;
    var H = state.height;
    var colors = getActiveColors();
    var rng = mulberry32(state.seed);
    var lines = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">');

    if (state.styleId === 'waves') {
      var geom = buildWavesGeometry(W, H, colors, rng);
      lines.push('  <defs>');
      lines.push('    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">');
      lines.push('      <stop offset="0%" stop-color="' + colors[0] + '"/>');
      lines.push('      <stop offset="100%" stop-color="' + samplePalette(colors, 0.35) + '"/>');
      lines.push('    </linearGradient>');
      geom.blobs.forEach(function (bl, bi) {
        lines.push('    <radialGradient id="blob' + bi + '" cx="50%" cy="50%" r="50%">');
        lines.push('      <stop offset="0%" stop-color="' + bl.color + '" stop-opacity="' + bl.alpha.toFixed(2) + '"/>');
        lines.push('      <stop offset="100%" stop-color="' + bl.color + '" stop-opacity="0"/>');
        lines.push('    </radialGradient>');
      });
      geom.paths.forEach(function (layer, li) {
        lines.push('    <linearGradient id="wg' + li + '" x1="0" y1="0" x2="0" y2="1">');
        lines.push('      <stop offset="0%" stop-color="' + layer.colorTop + '"/>');
        lines.push('      <stop offset="100%" stop-color="' + layer.colorBot + '"/>');
        lines.push('    </linearGradient>');
      });
      lines.push('  </defs>');
      lines.push('  <rect width="' + W + '" height="' + H + '" fill="url(#bg)"/>');
      geom.blobs.forEach(function (bl, bi) {
        lines.push('  <circle cx="' + bl.cx.toFixed(1) + '" cy="' + bl.cy.toFixed(1) + '" r="' + bl.r.toFixed(1) + '" fill="url(#blob' + bi + ')"/>');
      });
      geom.paths.forEach(function (layer, li) {
        lines.push('  <path d="' + wavePathToSvgD(layer.pts, W, H) + '" fill="url(#wg' + li + ')"/>');
      });
    } else if (state.styleId === 'pattern') {
      var repeatTarget = Math.max(3, Math.round(3 + (state.density / 100) * 11));
      var tw = state.seamless ? (W / repeatTarget) : (Math.min(W, H) / repeatTarget);
      var th = state.seamless ? (H / Math.max(1, Math.round(H / tw))) : tw;
      var cx = tw * 0.5;
      var cy = th * 0.5;
      var c0 = colors[0], c1 = colors[1 % colors.length], c2 = colors[2 % colors.length], c3 = colors[3 % colors.length];
      var sAlpha = (0.35 + (state.smoothness / 100) * 0.65).toFixed(2);
      var lw = Math.max(1.2, tw * 0.022).toFixed(2);
      var rotAttr = (!state.seamless && state.angle % 360 !== 0)
        ? ' patternTransform="rotate(' + state.angle + ' ' + (W * 0.5).toFixed(1) + ' ' + (H * 0.5).toFixed(1) + ')"'
        : '';

      lines.push('  <defs>');
      lines.push('    <pattern id="wgTile" width="' + tw.toFixed(2) + '" height="' + th.toFixed(2) + '" patternUnits="userSpaceOnUse"' + rotAttr + '>');
      lines.push('      <rect width="' + tw.toFixed(2) + '" height="' + th.toFixed(2) + '" fill="' + c0 + '"/>');

      if (state.motif === 'star8') {
        var st = tw * 0.31;
        [[cx, cy, c1, c2], [0, 0, c2, c1], [tw, 0, c2, c1], [0, th, c2, c1], [tw, th, c2, c1]].forEach(function (p) {
          lines.push('      <g transform="translate(' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ')">');
          lines.push('        <rect x="' + (-st).toFixed(2) + '" y="' + (-st).toFixed(2) + '" width="' + (st * 2).toFixed(2) + '" height="' + (st * 2).toFixed(2) + '" fill="' + p[2] + '" fill-opacity="0.68" stroke="' + c3 + '" stroke-opacity="' + sAlpha + '" stroke-width="' + lw + '"/>');
          lines.push('        <rect x="' + (-st).toFixed(2) + '" y="' + (-st).toFixed(2) + '" width="' + (st * 2).toFixed(2) + '" height="' + (st * 2).toFixed(2) + '" transform="rotate(45)" fill="' + p[3] + '" fill-opacity="0.62" stroke="' + c3 + '" stroke-opacity="' + sAlpha + '" stroke-width="' + lw + '"/>');
          lines.push('        <circle cx="0" cy="0" r="' + (st * 0.45).toFixed(2) + '" fill="' + c3 + '" stroke="' + c3 + '" stroke-opacity="' + sAlpha + '" stroke-width="' + lw + '"/>');
          lines.push('      </g>');
        });
      } else if (state.motif === 'hex') {
        var rH = tw * 0.48;
        [[cx, cy], [0, 0], [tw, 0], [0, th], [tw, th]].forEach(function (pt, idx) {
          for (var k = 0; k < 6; k++) {
            var a1 = (Math.PI / 3) * k - Math.PI / 6;
            var a2 = (Math.PI / 3) * (k + 1) - Math.PI / 6;
            var x1 = pt[0] + Math.cos(a1) * rH, y1 = pt[1] + Math.sin(a1) * rH;
            var x2 = pt[0] + Math.cos(a2) * rH, y2 = pt[1] + Math.sin(a2) * rH;
            var colIdx = (k + idx) % 3;
            var fillCol = colIdx === 0 ? c1 : (colIdx === 1 ? c2 : c3);
            lines.push('      <polygon points="' + pt[0].toFixed(1) + ',' + pt[1].toFixed(1) + ' ' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' ' + x2.toFixed(1) + ',' + y2.toFixed(1) + '" fill="' + fillCol + '" fill-opacity="0.84" stroke="' + c0 + '" stroke-opacity="' + sAlpha + '" stroke-width="' + lw + '"/>');
          }
        });
      } else if (state.motif === 'circles') {
        var radC = tw * 0.5;
        [[cx, cy, c1], [0, 0, c2], [tw, 0, c2], [0, th, c2], [tw, th, c2], [cx, 0, c3], [cx, th, c3], [0, cy, c3], [tw, cy, c3]].forEach(function (p) {
          lines.push('      <circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + radC.toFixed(1) + '" fill="' + p[2] + '" fill-opacity="0.14" stroke="' + p[2] + '" stroke-opacity="' + sAlpha + '" stroke-width="' + lw + '"/>');
        });
      } else {
        var hw = tw * 0.5, hh = th * 0.5;
        [
          [[0, 0], [hw, 0], [0, hh], c1],
          [[hw, 0], [hw, hh], [0, hh], c2],
          [[hw, 0], [tw, 0], [tw, hh], c3],
          [[hw, 0], [tw, hh], [hw, hh], c1],
          [[0, hh], [hw, hh], [0, th], c3],
          [[hw, hh], [hw, th], [0, th], c1],
          [[hw, hh], [tw, hh], [hw, th], c2],
          [[tw, hh], [tw, th], [hw, th], c3],
        ].forEach(function (tr) {
          var ptsStr = tr[0][0].toFixed(1) + ',' + tr[0][1].toFixed(1) + ' ' + tr[1][0].toFixed(1) + ',' + tr[1][1].toFixed(1) + ' ' + tr[2][0].toFixed(1) + ',' + tr[2][1].toFixed(1);
          lines.push('      <polygon points="' + ptsStr + '" fill="' + tr[3] + '" fill-opacity="0.82" stroke="' + c0 + '" stroke-opacity="' + sAlpha + '" stroke-width="' + lw + '"/>');
        });
      }

      lines.push('    </pattern>');
      lines.push('  </defs>');
      lines.push('  <rect width="' + W + '" height="' + H + '" fill="url(#wgTile)"/>');
    } else if (state.styleId === 'lowpoly') {
      var tris = buildLowPolyTriangles(W, H, colors, rng);
      tris.forEach(function (tr) {
        var ptsStr = tr.p1.x.toFixed(1) + ',' + tr.p1.y.toFixed(1) + ' ' + tr.p2.x.toFixed(1) + ',' + tr.p2.y.toFixed(1) + ' ' + tr.p3.x.toFixed(1) + ',' + tr.p3.y.toFixed(1);
        lines.push('  <polygon points="' + ptsStr + '" fill="' + tr.color + '" stroke="' + tr.color + '" stroke-width="0.9" stroke-linejoin="round"/>');
      });
    } else if (state.styleId === 'mountain') {
      var mScene = buildMountainScene(W, H, colors, rng);
      lines.push('  <defs>');
      lines.push('    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">');
      lines.push('      <stop offset="0%" stop-color="' + mScene.skyTop + '"/>');
      lines.push('      <stop offset="55%" stop-color="' + mScene.skyMid + '"/>');
      lines.push('      <stop offset="100%" stop-color="' + mScene.horizonCol + '"/>');
      lines.push('    </linearGradient>');
      lines.push('    <radialGradient id="sunHalo" cx="50%" cy="50%" r="50%">');
      lines.push('      <stop offset="0%" stop-color="' + mScene.sunCol + '" stop-opacity="0.62"/>');
      lines.push('      <stop offset="50%" stop-color="' + mScene.sunCol + '" stop-opacity="0.22"/>');
      lines.push('      <stop offset="100%" stop-color="' + mScene.sunCol + '" stop-opacity="0"/>');
      lines.push('    </radialGradient>');
      mScene.ridges.forEach(function (ridge, ri) {
        lines.push('    <linearGradient id="mg' + ri + '" x1="0" y1="0" x2="0" y2="1">');
        lines.push('      <stop offset="0%" stop-color="' + ridge.topCol + '"/>');
        lines.push('      <stop offset="100%" stop-color="' + ridge.botCol + '"/>');
        lines.push('    </linearGradient>');
      });
      lines.push('  </defs>');
      lines.push('  <rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>');
      lines.push('  <circle cx="' + mScene.sunX.toFixed(1) + '" cy="' + mScene.sunY.toFixed(1) + '" r="' + (mScene.sunR * 3.2).toFixed(1) + '" fill="url(#sunHalo)"/>');
      lines.push('  <circle cx="' + mScene.sunX.toFixed(1) + '" cy="' + mScene.sunY.toFixed(1) + '" r="' + mScene.sunR.toFixed(1) + '" fill="' + mScene.sunCol + '"/>');
      mScene.ridges.forEach(function (ridge, ri) {
        var ptsStr = ['0,' + H];
        ridge.pts.forEach(function (p) { ptsStr.push(p.x.toFixed(1) + ',' + p.y.toFixed(1)); });
        ptsStr.push(W + ',' + H);
        lines.push('  <polygon points="' + ptsStr.join(' ') + '" fill="url(#mg' + ri + ')"/>');
        ridge.trees.forEach(function (tr) {
          var tw = tr.h * 0.42;
          var tPts = tr.x.toFixed(1) + ',' + (tr.y - tr.h).toFixed(1) + ' ' + (tr.x - tw).toFixed(1) + ',' + (tr.y + tr.h * 0.15).toFixed(1) + ' ' + (tr.x + tw).toFixed(1) + ',' + (tr.y + tr.h * 0.15).toFixed(1);
          lines.push('  <polygon points="' + tPts + '" fill="' + ridge.topCol + '"/>');
        });
      });
    } else if (state.styleId === 'city') {
      var cScene = buildCityScene(W, H, colors, rng);
      var hy = cScene.horizonY;
      lines.push('  <defs>');
      lines.push('    <linearGradient id="csky" x1="0" y1="0" x2="0" y2="1">');
      lines.push('      <stop offset="0%" stop-color="' + cScene.skyTop + '"/>');
      lines.push('      <stop offset="100%" stop-color="' + cScene.skyBot + '"/>');
      lines.push('    </linearGradient>');
      lines.push('    <linearGradient id="cwater" x1="0" y1="0" x2="0" y2="1">');
      lines.push('      <stop offset="0%" stop-color="' + cScene.waterTop + '"/>');
      lines.push('      <stop offset="100%" stop-color="' + cScene.waterBot + '"/>');
      lines.push('    </linearGradient>');
      lines.push('    <clipPath id="waterClip"><rect x="0" y="' + hy.toFixed(1) + '" width="' + W + '" height="' + (H - hy).toFixed(1) + '"/></clipPath>');
      lines.push('  </defs>');
      lines.push('  <rect width="' + W + '" height="' + hy.toFixed(1) + '" fill="url(#csky)"/>');
      cScene.stars.forEach(function (st) {
        lines.push('  <circle cx="' + st.x.toFixed(1) + '" cy="' + st.y.toFixed(1) + '" r="' + st.r.toFixed(1) + '" fill="#FFFFFF" fill-opacity="' + st.a.toFixed(2) + '"/>');
      });
      lines.push('  <circle cx="' + cScene.moonX.toFixed(1) + '" cy="' + cScene.moonY.toFixed(1) + '" r="' + cScene.moonR.toFixed(1) + '" fill="' + adjustBrightness(cScene.glowCol, 0.35) + '"/>');
      cScene.layers.forEach(function (lay) {
        lay.bldgs.forEach(function (b) {
          lines.push('  <rect x="' + b.x.toFixed(1) + '" y="' + b.y.toFixed(1) + '" width="' + b.w.toFixed(1) + '" height="' + b.h.toFixed(1) + '" fill="' + lay.fill + '"/>');
          b.windows.forEach(function (w) {
            lines.push('  <rect x="' + w.x.toFixed(1) + '" y="' + w.y.toFixed(1) + '" width="' + w.w.toFixed(1) + '" height="' + w.h.toFixed(1) + '" fill="' + w.color + '" fill-opacity="' + lay.winAlpha.toFixed(2) + '"/>');
          });
        });
      });
      lines.push('  <rect x="0" y="' + hy.toFixed(1) + '" width="' + W + '" height="' + (H - hy).toFixed(1) + '" fill="url(#cwater)"/>');
      lines.push('  <g clip-path="url(#waterClip)" transform="translate(0 ' + (hy * 2).toFixed(1) + ') scale(1 -0.58)" opacity="0.42">');
      cScene.layers.forEach(function (lay) {
        lay.bldgs.forEach(function (b) {
          lines.push('    <rect x="' + b.x.toFixed(1) + '" y="' + b.y.toFixed(1) + '" width="' + b.w.toFixed(1) + '" height="' + b.h.toFixed(1) + '" fill="' + lay.fill + '"/>');
        });
      });
      lines.push('  </g>');
    } else if (state.styleId === 'topo') {
      var tScene = buildTopoContours(W, H, colors, rng);
      var baseThickSvg = Math.max(1.2, (Math.min(W, H) / 1000) * (1.1 + (state.smoothness / 100) * 3.4));
      lines.push('  <defs>');
      lines.push('    <linearGradient id="tbg" x1="0" y1="0" x2="1" y2="1">');
      lines.push('      <stop offset="0%" stop-color="' + tScene.bgTop + '"/>');
      lines.push('      <stop offset="100%" stop-color="' + tScene.bgBot + '"/>');
      lines.push('    </linearGradient>');
      lines.push('  </defs>');
      lines.push('  <rect width="' + W + '" height="' + H + '" fill="url(#tbg)"/>');
      tScene.levels.forEach(function (lv) {
        if (!lv.segs.length) return;
        var dParts = [];
        for (var i = 0; i < lv.segs.length; i++) {
          var sg = lv.segs[i];
          dParts.push('M' + sg[0].x.toFixed(1) + ',' + sg[0].y.toFixed(1) + 'L' + sg[1].x.toFixed(1) + ',' + sg[1].y.toFixed(1));
        }
        var sw = (lv.major ? baseThickSvg * 1.75 : baseThickSvg).toFixed(2);
        lines.push('  <path d="' + dParts.join(' ') + '" fill="none" stroke="' + lv.color + '" stroke-opacity="' + (lv.major ? '0.92' : '0.58') + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>');
      });
    } else {
      /* Minimalist Abstract & Bauhaus */
      var scene = buildAbstractShapes(W, H, colors, rng);
      lines.push('  <rect width="' + W + '" height="' + H + '" fill="' + scene.bg + '"/>');
      scene.shapes.forEach(function (s) {
        var m = Math.min(s.w, s.h);
        var cx = s.x + s.w * 0.5;
        var cy = s.y + s.h * 0.5;
        if (s.kind === 0) {
          var rQ = m * 0.94;
          var corners = [
            [s.x, s.y, s.x + rQ, s.y, s.x, s.y + rQ],
            [s.x + s.w, s.y, s.x + s.w, s.y + rQ, s.x + s.w - rQ, s.y],
            [s.x + s.w, s.y + s.h, s.x + s.w - rQ, s.y + s.h, s.x + s.w, s.y + s.h - rQ],
            [s.x, s.y + s.h, s.x, s.y + s.h - rQ, s.x + rQ, s.y + s.h],
          ];
          var cn = corners[s.orient];
          var dQ = 'M ' + cn[0].toFixed(1) + ' ' + cn[1].toFixed(1) + ' L ' + cn[2].toFixed(1) + ' ' + cn[3].toFixed(1) +
                   ' A ' + rQ.toFixed(1) + ' ' + rQ.toFixed(1) + ' 0 0 1 ' + cn[4].toFixed(1) + ' ' + cn[5].toFixed(1) + ' Z';
          lines.push('  <path d="' + dQ + '" fill="' + s.color + '"/>');
        } else if (s.kind === 1) {
          lines.push('  <circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (m * 0.42).toFixed(1) + '" fill="' + s.color + '"/>');
          if (s.colorAlt !== s.color) {
            lines.push('  <circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (m * 0.2).toFixed(1) + '" fill="' + s.colorAlt + '"/>');
          }
        } else if (s.kind === 2) {
          var pStr = s.orient % 2 === 0
            ? s.x.toFixed(1) + ',' + s.y.toFixed(1) + ' ' + (s.x + s.w).toFixed(1) + ',' + s.y.toFixed(1) + ' ' + s.x.toFixed(1) + ',' + (s.y + s.h).toFixed(1)
            : (s.x + s.w).toFixed(1) + ',' + s.y.toFixed(1) + ' ' + (s.x + s.w).toFixed(1) + ',' + (s.y + s.h).toFixed(1) + ' ' + s.x.toFixed(1) + ',' + (s.y + s.h).toFixed(1);
          lines.push('  <polygon points="' + pStr + '" fill="' + s.color + '"/>');
        } else if (s.kind === 3) {
          var pad = m * 0.14;
          var bw = s.w - pad * 2, bh = s.h - pad * 2, rx = Math.min(bw, bh) * 0.5;
          lines.push('  <rect x="' + (s.x + pad).toFixed(1) + '" y="' + (s.y + pad).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="' + rx.toFixed(1) + '" fill="' + s.color + '"/>');
        } else if (s.kind === 4) {
          var sw = Math.max(2, m * 0.055).toFixed(1);
          for (var k = 0; k < 5; k++) {
            var frac = (k + 0.5) / 5;
            if (s.orient % 2 === 0) {
              var lx = (s.x + s.w * frac).toFixed(1);
              lines.push('  <line x1="' + lx + '" y1="' + (s.y + s.h * 0.14).toFixed(1) + '" x2="' + lx + '" y2="' + (s.y + s.h * 0.86).toFixed(1) + '" stroke="' + s.color + '" stroke-width="' + sw + '" stroke-linecap="round"/>');
            } else {
              var ly = (s.y + s.h * frac).toFixed(1);
              lines.push('  <line x1="' + (s.x + s.w * 0.14).toFixed(1) + '" y1="' + ly + '" x2="' + (s.x + s.w * 0.86).toFixed(1) + '" y2="' + ly + '" stroke="' + s.color + '" stroke-width="' + sw + '" stroke-linecap="round"/>');
            }
          }
        } else {
          var rH2 = m * 0.44;
          var aStart = s.orient * (Math.PI * 0.5);
          var xA = cx + Math.cos(aStart) * rH2, yA = cy + Math.sin(aStart) * rH2;
          var xB = cx + Math.cos(aStart + Math.PI) * rH2, yB = cy + Math.sin(aStart + Math.PI) * rH2;
          var dH = 'M ' + xA.toFixed(1) + ' ' + yA.toFixed(1) + ' A ' + rH2.toFixed(1) + ' ' + rH2.toFixed(1) + ' 0 0 1 ' + xB.toFixed(1) + ' ' + yB.toFixed(1) + ' Z';
          lines.push('  <path d="' + dH + '" fill="' + s.color + '"/>');
        }
      });
    }

    lines.push('</svg>');
    return lines.join('\n');
  }

  /* ----- Actions: Magic Shuffle, Reverse, Lock-Screen, Export ----- */
  function generateHarmoniousPalette() {
    var baseHue = Math.floor(Math.random() * 360);
    var scheme = Math.floor(Math.random() * 3);
    var darkFirst = Math.random() > 0.28;
    var bgL = darkFirst ? (8 + Math.random() * 10) : (88 + Math.random() * 8);

    var hues;
    if (scheme === 0) {
      hues = [baseHue, baseHue + 32, baseHue + 68, baseHue + 108, baseHue + 145];
    } else if (scheme === 1) {
      hues = [baseHue, baseHue + 150, baseHue + 210, baseHue + 24, baseHue + 185];
    } else {
      hues = [baseHue, baseHue + 120, baseHue + 240, baseHue + 35, baseHue + 155];
    }

    var palette = [hslToHex(hues[0], 45 + Math.random() * 30, bgL)];
    for (var i = 1; i < 5; i++) {
      var lVal = darkFirst ? clamp(28 + i * 14 + (Math.random() - 0.5) * 12, 22, 86) : clamp(74 - i * 12, 20, 82);
      var sVal = 58 + Math.random() * 32;
      palette.push(hslToHex(hues[i], sVal, lVal));
    }
    return palette;
  }

  function handleMagicShuffle() {
    pushUndo();
    state.seed = Math.floor(Math.random() * 999999999) + 1;
    state.angle = Math.floor(Math.random() * 360);

    if (Math.random() < 0.55) {
      var pal = CURATED_PALETTES[Math.floor(Math.random() * CURATED_PALETTES.length)];
      state.paletteId = pal.id;
      state.colors = pal.colors.slice();
    } else {
      state.paletteId = 'custom';
      state.colors = generateHarmoniousPalette();
    }

    if (state.styleId === 'pattern') {
      var motifs = ['star8', 'hex', 'circles', 'triangles'];
      state.motif = motifs[Math.floor(Math.random() * motifs.length)];
    }

    syncAllUI();
    scheduleRender();
  }

  function toggleLockPreview() {
    state.lockPreview = !state.lockPreview;
    if (wgLockOverlay) {
      syncLockScreenClock();
      wgLockOverlay.classList.toggle('hide', !state.lockPreview);
    }
    [btnLockPreview, btnStageLock, btnMqLock].forEach(function (btn) {
      if (!btn) return;
      btn.classList.toggle('is-active', state.lockPreview);
      btn.setAttribute('aria-pressed', state.lockPreview ? 'true' : 'false');
    });
  }

  function openExportModal() {
    if (!wgExportModal) return;
    updateSpecUI();
    wgExportModal.classList.remove('hide');
  }

  function closeExportModal() {
    if (wgExportModal) wgExportModal.classList.add('hide');
  }

  function handleExport(format) {
    var baseName = 'imgsfix-wallpaper-' + state.styleId + '-' + state.width + 'x' + state.height;

    if (format === 'svg') {
      if (!SVG_SUPPORTED_STYLES[state.styleId] || state.baseImage) {
        toast(t(state.baseImage ? 'wg_svg_note_photo' : 'wg_svg_note_raster'), 'err');
        return;
      }
      try {
        var svgText = buildVectorSvg();
        var svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        if (typeof I.triggerDownload === 'function') {
          I.triggerDownload(svgBlob, baseName + '.svg');
        }
        toast(t('wg_export_ok'), 'ok');
      } catch (err) {
        console.error('SVG export error:', err);
        toast(t('wg_export_err'), 'err');
      }
      return;
    }

    var exportCanvas = document.createElement('canvas');
    try {
      renderWallpaperToCanvas(exportCanvas, state.width, state.height);
      var mime = format === 'png' ? 'image/png' : 'image/jpeg';
      var ext = format === 'png' ? 'png' : 'jpg';
      var quality = format === 'png' ? 1.0 : 0.95;

      exportCanvas.toBlob(function (blob) {
        cleanupCanvas(exportCanvas);
        if (!blob) {
          toast(t('wg_export_err'), 'err');
          return;
        }
        if (typeof I.triggerDownload === 'function') {
          I.triggerDownload(blob, baseName + '.' + ext);
        } else {
          var u = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = u;
          a.download = baseName + '.' + ext;
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            if (a.parentNode) a.parentNode.removeChild(a);
            try { URL.revokeObjectURL(u); } catch (_e) {}
          }, 2500);
        }
        toast(t('wg_export_ok'), 'ok');
      }, mime, quality);
    } catch (err) {
      cleanupCanvas(exportCanvas);
      console.error('Wallpaper export error:', err);
      toast(t('wg_export_err'), 'err');
    }
  }

  /* ----- Event Wiring ----- */
  function setActiveStyle(styleId) {
    if (!STYLE_LABELS[styleId] || state.styleId === styleId) return;
    pushUndo();
    state.styleId = styleId;
    syncAllUI();
    scheduleRender();
  }

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

  styleCards.forEach(function (card) {
    card.addEventListener('click', function () {
      setActiveStyle(card.getAttribute('data-style'));
    });
  });

  sizeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-size');
      if (id === 'custom') {
        customPopoverOpen = (state.sizeId === 'custom') ? !customPopoverOpen : true;
        state.sizeId = 'custom';
        syncAllUI();
        if (customPopoverOpen && wgCustomW) wgCustomW.focus();
        return;
      }
      var spec = SCREEN_PRESETS[id];
      if (!spec) return;
      customPopoverOpen = false;
      pushUndo();
      state.sizeId = id;
      state.width = spec.w;
      state.height = spec.h;
      syncAllUI();
      scheduleRender();
    });
  });

  if (btnApplyCustomDims) {
    btnApplyCustomDims.addEventListener('click', function () {
      var rw = clamp(parseInt(wgCustomW ? wgCustomW.value : '2560', 10) || 2560, MIN_DIM, MAX_DIM);
      var rh = clamp(parseInt(wgCustomH ? wgCustomH.value : '1440', 10) || 1440, MIN_DIM, MAX_DIM);
      pushUndo();
      state.sizeId = 'custom';
      state.width = rw;
      state.height = rh;
      customPopoverOpen = false;
      syncAllUI();
      scheduleRender();
      toast(t('wg_size_applied'), 'ok');
    });
  }
  if (btnCloseCustomDims) {
    btnCloseCustomDims.addEventListener('click', function () {
      customPopoverOpen = false;
      syncAllUI();
    });
  }

  if (btnTopShuffle) btnTopShuffle.addEventListener('click', handleMagicShuffle);
  if (btnStageShuffle) btnStageShuffle.addEventListener('click', handleMagicShuffle);
  if (btnPaletteShuffle) btnPaletteShuffle.addEventListener('click', handleMagicShuffle);
  if (btnMqShuffle) btnMqShuffle.addEventListener('click', handleMagicShuffle);

  if (btnLockPreview) btnLockPreview.addEventListener('click', toggleLockPreview);
  if (btnStageLock) btnStageLock.addEventListener('click', toggleLockPreview);
  if (btnMqLock) btnMqLock.addEventListener('click', toggleLockPreview);

  if (btnStageUndo) btnStageUndo.addEventListener('click', handleUndo);
  if (btnMqUndo) btnMqUndo.addEventListener('click', handleUndo);

  if (btnReverseColors) {
    btnReverseColors.addEventListener('click', function () {
      pushUndo();
      var active = getActiveColors().reverse();
      for (var i = 0; i < active.length; i++) {
        state.colors[i] = active[i];
      }
      state.paletteId = 'custom';
      syncAllUI();
      scheduleRender();
    });
  }

  colorCountBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var count = clamp(parseInt(btn.getAttribute('data-count'), 10) || 4, 3, 5);
      if (state.colorCount === count) return;
      pushUndo();
      state.colorCount = count;
      syncAllUI();
      scheduleRender();
    });
  });

  function bindRange(el, valEl, key, suffix) {
    if (!el) return;
    var pushed = false;
    el.addEventListener('input', function () {
      if (!pushed) {
        pushUndo();
        pushed = true;
      }
      var v = parseInt(el.value, 10) || 0;
      state[key] = v;
      if (valEl) valEl.textContent = v + suffix;
      scheduleRender();
    });
    el.addEventListener('change', function () {
      pushed = false;
    });
  }
  bindRange(wgDensity, wgDensityVal, 'density', '%');
  bindRange(wgAngle, wgAngleVal, 'angle', '°');
  bindRange(wgSmoothness, wgSmoothnessVal, 'smoothness', '%');
  bindRange(wgGrain, wgGrainVal, 'grain', '%');
  bindRange(wgPhotoBlur, wgPhotoBlurVal, 'photoBlur', 'px');
  bindRange(wgPhotoOverlay, wgPhotoOverlayVal, 'photoOverlay', '%');

  function isUnsafeSvgUri(val, allowRasterData) {
    var clean = String(val || '').replace(/[\u0000-\u0020\u007F-\u009F]+/g, '').trim();
    if (!clean) return false;
    var low = clean.toLowerCase();
    if (
      low.indexOf('javascript:') === 0 ||
      low.indexOf('vbscript:') === 0 ||
      low.indexOf('data:text/html') === 0 ||
      low.indexOf('data:image/svg') === 0 ||
      low.indexOf('http://') === 0 ||
      low.indexOf('https://') === 0 ||
      low.indexOf('//') === 0 ||
      low.indexOf('ftp:') === 0 ||
      low.indexOf('file:') === 0
    ) {
      return true;
    }
    if (low.indexOf('data:') === 0) {
      if (!allowRasterData) return true;
      return !/^data:image\/(png|jpeg|jpg|webp|gif|bmp);base64,[a-z0-9+/=]+$/i.test(clean);
    }
    return clean.charAt(0) !== '#';
  }

  function hasUnsafeSvgCss(cssText) {
    var s = String(cssText || '');
    if (/@import|expression\s*\(|javascript:|vbscript:|data:text\/html|data:image\/svg|https?:|\/\//i.test(s)) {
      return true;
    }
    var urlMatches = s.match(/url\s*\([^)]*\)/gi);
    if (urlMatches) {
      for (var i = 0; i < urlMatches.length; i++) {
        var inner = urlMatches[i].replace(/^url\s*\(\s*['"]?|['"]?\s*\)$/gi, '').trim();
        if (inner && inner.charAt(0) !== '#') return true;
      }
    }
    return false;
  }

  function sanitizeSvgNode(el) {
    var kids = Array.prototype.slice.call(el.childNodes || []);
    for (var i = 0; i < kids.length; i++) {
      var child = kids[i];
      if (child.nodeType !== 1) continue;
      var tag = (child.localName || child.nodeName || '').toLowerCase();
      if (DANGEROUS_SVG_TAGS[tag]) {
        el.removeChild(child);
        continue;
      }
      if (tag === 'style' && hasUnsafeSvgCss(child.textContent)) {
        el.removeChild(child);
        continue;
      }
      var attrs = Array.prototype.slice.call(child.attributes || []);
      for (var j = 0; j < attrs.length; j++) {
        var aName = attrs[j].name || '';
        var aLocal = (attrs[j].localName || aName).toLowerCase();
        var aVal = attrs[j].value || '';
        if (/^on/i.test(aLocal)) {
          child.removeAttribute(aName);
          continue;
        }
        if (aLocal === 'style' && hasUnsafeSvgCss(aVal)) {
          child.removeAttribute(aName);
          continue;
        }
        if (aLocal === 'href' || aLocal === 'src' || aLocal === 'action' || aLocal === 'formaction' || aLocal === 'poster' || aLocal === 'data' || aLocal === 'codebase') {
          var allowRaster = tag === 'image' || tag === 'feimage';
          if (isUnsafeSvgUri(aVal, allowRaster)) {
            child.removeAttribute(aName);
          }
        }
      }
      sanitizeSvgNode(child);
    }
  }

  function sanitizeSvgFileToBlobUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var text = typeof reader.result === 'string' ? reader.result : '';
          var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
          if (!doc || doc.querySelector('parsererror')) {
            reject(new Error('Invalid SVG markup'));
            return;
          }
          var root = doc.documentElement;
          if (!root || (root.localName || root.nodeName || '').toLowerCase() !== 'svg') {
            reject(new Error('Missing SVG root'));
            return;
          }
          var rootAttrs = Array.prototype.slice.call(root.attributes || []);
          for (var i = 0; i < rootAttrs.length; i++) {
            var rn = (rootAttrs[i].localName || rootAttrs[i].name || '').toLowerCase();
            if (/^on/i.test(rn) || (rn === 'style' && hasUnsafeSvgCss(rootAttrs[i].value))) {
              root.removeAttribute(rootAttrs[i].name);
            }
          }
          sanitizeSvgNode(root);

          var rawW = root.getAttribute('width') || '';
          var rawH = root.getAttribute('height') || '';
          var pw = /%/.test(rawW) ? 0 : parseFloat(rawW);
          var ph = /%/.test(rawH) ? 0 : parseFloat(rawH);
          if ((pw > MAX_IMAGE_DIM) || (ph > MAX_IMAGE_DIM)) {
            reject(new Error('SVG dimensions exceed limit'));
            return;
          }
          if (!(pw > 0 && ph > 0)) {
            var vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/);
            var vw = vb.length === 4 ? parseFloat(vb[2]) : 0;
            var vh = vb.length === 4 ? parseFloat(vb[3]) : 0;
            if (vw > 0 && vh > 0) {
              var scale = Math.max(vw, vh) < 512 ? (1024 / Math.max(vw, vh)) : (Math.max(vw, vh) > 2048 ? (2048 / Math.max(vw, vh)) : 1);
              pw = clamp(Math.round(vw * scale), 64, 4096);
              ph = clamp(Math.round(vh * scale), 64, 4096);
            } else {
              pw = 1024;
              ph = 1024;
            }
            root.setAttribute('width', String(pw));
            root.setAttribute('height', String(ph));
          }

          var serialized = new XMLSerializer().serializeToString(root);
          var blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
          resolve(URL.createObjectURL(blob));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function () { reject(new Error('Failed to read SVG file')); };
      reader.readAsText(file, 'UTF-8');
    });
  }

  function loadBaseImageFromUrl(url, gen) {
    var img = new Image();
    img.onload = function () {
      try { URL.revokeObjectURL(url); } catch (_e) {}
      if (gen !== baseLoadGen) return;
      var nw = img.naturalWidth || img.width;
      var nh = img.naturalHeight || img.height;
      if (!nw || !nh || nw > MAX_IMAGE_DIM || nh > MAX_IMAGE_DIM) {
        toast(t('wg_photo_err_dims'), 'err');
        return;
      }
      basePhotoTempCanvas.width = nw;
      basePhotoTempCanvas.height = nh;
      var bctx = basePhotoTempCanvas.getContext('2d');
      bctx.clearRect(0, 0, nw, nh);
      bctx.drawImage(img, 0, 0, nw, nh);

      state.baseImage = basePhotoTempCanvas;
      state.baseImageW = nw;
      state.baseImageH = nh;
      syncAllUI();
      scheduleRender();
      toast(t('wg_photo_loaded'), 'ok');
    };
    img.onerror = function () {
      try { URL.revokeObjectURL(url); } catch (_e) {}
      toast(t('wg_photo_err_type'), 'err');
    };
    img.src = url;
  }

  function handleBasePhotoFile(file) {
    if (!file) return;
    var type = (file.type || '').toLowerCase().split(';')[0].trim();
    if ((!type || type === 'application/octet-stream') && file.name) {
      var m = file.name.toLowerCase().match(/\.(jpe?g|png|webp|bmp|gif|svg)$/);
      if (m) {
        if (m[1] === 'svg') type = 'image/svg+xml';
        else if (m[1] === 'jpg' || m[1] === 'jpeg') type = 'image/jpeg';
        else type = 'image/' + m[1];
      }
    }
    if (!ALLOWED_BASE_MIMES[type]) {
      toast(t('wg_photo_err_type'), 'err');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast(t('wg_photo_err_size'), 'err');
      return;
    }

    var gen = ++baseLoadGen;
    if (type === 'image/svg+xml') {
      sanitizeSvgFileToBlobUrl(file).then(function (safeUrl) {
        if (gen !== baseLoadGen) {
          try { URL.revokeObjectURL(safeUrl); } catch (_e) {}
          return;
        }
        loadBaseImageFromUrl(safeUrl, gen);
      }).catch(function () {
        if (gen === baseLoadGen) toast(t('wg_photo_err_type'), 'err');
      });
      return;
    }

    var url = URL.createObjectURL(file);
    loadBaseImageFromUrl(url, gen);
  }

  function clearBasePhoto() {
    baseLoadGen++;
    state.baseImage = null;
    state.baseImageW = 0;
    state.baseImageH = 0;
    cleanupCanvas(basePhotoTempCanvas);
    if (wgBasePhotoInput) wgBasePhotoInput.value = '';
    syncAllUI();
    scheduleRender();
  }

  if (btnUploadBasePhoto && wgBasePhotoInput) {
    btnUploadBasePhoto.addEventListener('click', function () {
      wgBasePhotoInput.click();
    });
    wgBasePhotoInput.addEventListener('change', function () {
      if (wgBasePhotoInput.files && wgBasePhotoInput.files[0]) {
        handleBasePhotoFile(wgBasePhotoInput.files[0]);
      }
    });
  }
  if (btnClearBasePhoto) {
    btnClearBasePhoto.addEventListener('click', clearBasePhoto);
  }
  photoBlendBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var blend = btn.getAttribute('data-blend');
      if (!blend || state.photoBlend === blend) return;
      state.photoBlend = blend;
      syncAllUI();
      scheduleRender();
    });
  });

  if (btnReseedOnly) {
    btnReseedOnly.addEventListener('click', function () {
      pushUndo();
      state.seed = Math.floor(Math.random() * 999999999) + 1;
      scheduleRender();
    });
  }

  motifBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var m = btn.getAttribute('data-motif');
      if (!m || state.motif === m) return;
      pushUndo();
      state.motif = m;
      syncAllUI();
      scheduleRender();
    });
  });

  if (wgSeamlessToggle) {
    wgSeamlessToggle.addEventListener('change', function () {
      pushUndo();
      state.seamless = Boolean(wgSeamlessToggle.checked);
      updateSpecUI();
      scheduleRender();
    });
  }

  if (btnResetAll) {
    btnResetAll.addEventListener('click', function () {
      pushUndo();
      state.styleId = 'mesh';
      state.motif = 'star8';
      state.seamless = true;
      state.seed = 104729;
      state.density = 55;
      state.angle = 35;
      state.smoothness = 68;
      state.grain = 14;
      state.sizeId = 'mobile';
      state.width = 1170;
      state.height = 2532;
      state.paletteId = 'aurora';
      state.colorCount = 4;
      state.colors = DEFAULT_COLORS.slice();
      state.photoBlur = 14;
      state.photoOverlay = 42;
      state.photoBlend = 'screen';
      clearBasePhoto();
      syncAllUI();
      scheduleRender();
      toast(t('tc_reset'), 'ok');
    });
  }

  /* Export Modal */
  if (btnOpenExportModal) btnOpenExportModal.addEventListener('click', openExportModal);
  if (btnMqDownload) btnMqDownload.addEventListener('click', openExportModal);
  if (btnCloseExportModal) btnCloseExportModal.addEventListener('click', closeExportModal);
  if (wgExportModal) {
    wgExportModal.addEventListener('click', function (e) {
      if (e.target === wgExportModal) closeExportModal();
    });
  }
  if (btnExportPng) btnExportPng.addEventListener('click', function () { handleExport('png'); });
  if (btnExportJpg) btnExportJpg.addEventListener('click', function () { handleExport('jpg'); });
  if (btnExportSvg) btnExportSvg.addEventListener('click', function () { handleExport('svg'); });

  /* ----- Keyboard Shortcuts (Layout-independent via e.code) ----- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (customPopoverOpen) {
        customPopoverOpen = false;
        syncAllUI();
      }
      if (wgExportModal && !wgExportModal.classList.contains('hide')) {
        closeExportModal();
      }
      return;
    }

    var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
    var isRange = tag === 'input' && e.target.type === 'range';
    var isTyping = (tag === 'input' && !isRange) || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable);
    if (isTyping) return;

    var mod = e.ctrlKey || e.metaKey;
    var lowerKey = e.key ? e.key.toLowerCase() : '';
    var code = e.code || '';

    if (mod && (lowerKey === 's' || code === 'KeyS')) {
      e.preventDefault();
      openExportModal();
      return;
    }
    if (mod && (lowerKey === 'z' || code === 'KeyZ')) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if (code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) handleMagicShuffle();
      return;
    }
    if (!mod && (lowerKey === 'l' || code === 'KeyL')) {
      e.preventDefault();
      toggleLockPreview();
      return;
    }
    if (!mod) {
      if (e.key === '1' || code === 'Digit1') { e.preventDefault(); setActiveStyle('mesh'); return; }
      if (e.key === '2' || code === 'Digit2') { e.preventDefault(); setActiveStyle('waves'); return; }
      if (e.key === '3' || code === 'Digit3') { e.preventDefault(); setActiveStyle('pattern'); return; }
      if (e.key === '4' || code === 'Digit4') { e.preventDefault(); setActiveStyle('lowpoly'); return; }
      if (e.key === '5' || code === 'Digit5') { e.preventDefault(); setActiveStyle('abstract'); return; }
      if (e.key === '6' || code === 'Digit6') { e.preventDefault(); setActiveStyle('nebula'); return; }
      if (e.key === '7' || code === 'Digit7') { e.preventDefault(); setActiveStyle('mountain'); return; }
      if (e.key === '8' || code === 'Digit8') { e.preventDefault(); setActiveStyle('city'); return; }
      if (e.key === '9' || code === 'Digit9') { e.preventDefault(); setActiveStyle('topo'); return; }
    }
  });

  /* ----- Language Change & Cleanup ----- */
  document.addEventListener('imgsfix:langchange', function () {
    syncDocumentMeta();
    syncLockScreenClock();
    renderPaletteButtons();
    renderColorPickers();
    updateSpecUI();
  });

  window.addEventListener('beforeunload', function () {
    cleanupCanvas(grainTileCanvas);
    cleanupCanvas(basePhotoTempCanvas);
    cleanupCanvas(wgPreviewCanvas);
  });

  /* ----- Boot ----- */
  syncDocumentMeta();
  syncLockScreenClock();
  syncAllUI();
  renderPreview();
})();

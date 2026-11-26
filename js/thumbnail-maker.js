/* imgsfix — thumbnail-maker.js
   100% client-side YouTube & Social Thumbnail Studio:
   - Multi-platform presets (YouTube 16:9 720p/1080p, Shorts/Reels 9:16, Post 1:1, Portrait 4:5)
   - Toggleable Safe-Zone Guides (YouTube duration badge, Shorts/Reels UI rails)
   - 1-click Pro Starter Templates (Tech, Gaming, Podcast, VS Split, News, Vlog)
   - Unlimited local image/logo/sticker layers + Custom Background upload
   - Local AI background removal (@imgly/background-removal, isnet_fp16, GPU->CPU fallback, preload)
   - Per-image Corner Radius, Border/Die-Cut Outline, Backlight Rim Glow & Drop Shadow
   - Categorized Arabic & English High-CTR Font Library with live previews
   - Expanded Arrows, Shapes/Frames, Bilingual Hook Badges & Expressive Emojis
   - Direct canvas layer selection, drag, corner resize, rotation knob, 2-finger pinch/rotate & lock support
   - Live YouTube Feed Preview Modal (Desktop & Mobile, Dark & Light) with offline sample cards
*/
'use strict';

import { removeBackground, preload } from '@imgly/background-removal';

(function () {
  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = I.$$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  /* ----- Constants ----- */
  var MAX_FILE_BYTES = 30 * 1024 * 1024;
  var MAX_IMAGE_DIM = 12000;
  var MAX_UNDO = 30;
  var ALLOWED_MIMES = {
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/bmp': true,
    'image/gif': true,
  };

  var PLATFORM_SIZES = {
    yt_hd:  { w: 1280, h: 720,  type: '16:9', slug: 'youtube-720p' },
    yt_fhd: { w: 1920, h: 1080, type: '16:9', slug: 'youtube-1080p' },
    shorts: { w: 1080, h: 1920, type: '9:16', slug: 'shorts-reels' },
    sq_1_1: { w: 1080, h: 1080, type: '1:1',  slug: 'square-1x1' },
    ig_4_5: { w: 1080, h: 1350, type: '4:5',  slug: 'portrait-4x5' },
  };

  /* Categorized High-CTR Arabic & English Font Library (12 AR + 12 EN = 24 Fonts) */
  var FONT_LIBRARY = [
    /* 12 Arabic Fonts */
    { id: 'cairo',      group: 'ar', label: 'Cairo',                family: 'Cairo',                weight: '900', css: '"Cairo", system-ui, sans-serif',              sample: 'نص بارز' },
    { id: 'tajawal',    group: 'ar', label: 'Tajawal',              family: 'Tajawal',              weight: '800', css: '"Tajawal", "Cairo", sans-serif',              sample: 'نص بارز' },
    { id: 'changa',     group: 'ar', label: 'Changa',               family: 'Changa',               weight: '800', css: '"Changa", "Cairo", sans-serif',               sample: 'نص بارز' },
    { id: 'almarai',    group: 'ar', label: 'Almarai',              family: 'Almarai',              weight: '800', css: '"Almarai", "Cairo", sans-serif',              sample: 'نص بارز' },
    { id: 'ibm_ar',     group: 'ar', label: 'IBM Plex Sans Arabic', family: 'IBM Plex Sans Arabic', weight: '700', css: '"IBM Plex Sans Arabic", "Cairo", sans-serif', sample: 'نص بارز' },
    { id: 'readex',     group: 'ar', label: 'Readex Pro',           family: 'Readex Pro',           weight: '700', css: '"Readex Pro", "Cairo", sans-serif',           sample: 'نص بارز' },
    { id: 'amiri',      group: 'ar', label: 'Amiri',                family: 'Amiri',                weight: '700', css: '"Amiri", Georgia, serif',                     sample: 'نص بارز' },
    { id: 'aref_ruqaa', group: 'ar', label: 'Aref Ruqaa',           family: 'Aref Ruqaa',           weight: '700', css: '"Aref Ruqaa", "Amiri", serif',                sample: 'نص بارز' },
    { id: 'lalezar',    group: 'ar', label: 'Lalezar',              family: 'Lalezar',              weight: '400', css: '"Lalezar", "Cairo", sans-serif',              sample: 'نص بارز' },
    { id: 'reem_kufi',  group: 'ar', label: 'Reem Kufi',            family: 'Reem Kufi',            weight: '700', css: '"Reem Kufi", "Cairo", sans-serif',            sample: 'نص بارز' },
    { id: 'el_messiri', group: 'ar', label: 'El Messiri',           family: 'El Messiri',           weight: '700', css: '"El Messiri", "Cairo", sans-serif',           sample: 'نص بارز' },
    { id: 'lemonada',   group: 'ar', label: 'Lemonada',             family: 'Lemonada',             weight: '700', css: '"Lemonada", "Cairo", sans-serif',             sample: 'نص بارز' },
    /* 12 English Fonts */
    { id: 'impact',     group: 'en', label: 'Impact',           family: 'Impact',           weight: '900', css: 'Impact, "Arial Black", sans-serif',       sample: 'CLICK NOW' },
    { id: 'anton',      group: 'en', label: 'Anton',            family: 'Anton',            weight: '400', css: '"Anton", Impact, sans-serif',             sample: 'CLICK NOW' },
    { id: 'bebas',      group: 'en', label: 'Bebas Neue',       family: 'Bebas Neue',       weight: '400', css: '"Bebas Neue", Impact, sans-serif',        sample: 'CLICK NOW' },
    { id: 'montserrat', group: 'en', label: 'Montserrat',       family: 'Montserrat',       weight: '900', css: '"Montserrat", system-ui, sans-serif',     sample: 'CLICK NOW' },
    { id: 'oswald',     group: 'en', label: 'Oswald',           family: 'Oswald',           weight: '700', css: '"Oswald", Impact, sans-serif',            sample: 'CLICK NOW' },
    { id: 'poppins',    group: 'en', label: 'Poppins',          family: 'Poppins',          weight: '800', css: '"Poppins", system-ui, sans-serif',        sample: 'CLICK NOW' },
    { id: 'roboto',     group: 'en', label: 'Roboto',           family: 'Roboto',           weight: '900', css: '"Roboto", system-ui, sans-serif',         sample: 'CLICK NOW' },
    { id: 'luckiest',   group: 'en', label: 'Luckiest Guy',     family: 'Luckiest Guy',     weight: '400', css: '"Luckiest Guy", Impact, sans-serif',      sample: 'CLICK NOW' },
    { id: 'bangers',    group: 'en', label: 'Bangers',          family: 'Bangers',          weight: '400', css: '"Bangers", Impact, sans-serif',           sample: 'CLICK NOW' },
    { id: 'playfair',   group: 'en', label: 'Playfair Display', family: 'Playfair Display', weight: '900', css: '"Playfair Display", Georgia, serif',      sample: 'CLICK NOW' },
    { id: 'pacifico',   group: 'en', label: 'Pacifico',         family: 'Pacifico',         weight: '400', css: '"Pacifico", Georgia, cursive',            sample: 'Click Now' },
    { id: 'marker',     group: 'en', label: 'Permanent Marker', family: 'Permanent Marker', weight: '400', css: '"Permanent Marker", Impact, cursive',     sample: 'CLICK NOW' },
  ];

  /* ----- DOM References ----- */
  var dockTabs = $$('.tm-dock-tab');
  var dockPanes = $$('.tm-pane');
  var tplCards = $$('.tm-tpl-card');
  var aspectBtns = $$('.tm-aspect-btn');

  var tmMainCanvas = $('#tmMainCanvas');
  var tmSafeOverlayCanvas = $('#tmSafeOverlayCanvas');
  var tmCanvasWrap = $('#tmCanvasWrap');
  var tmViewport = $('#tmViewport');
  var tmDimMeta = $('#tmDimMeta');
  var btnToggleSafeZone = $('#btnToggleSafeZone');
  var btnOpenFeedPreview = $('#btnOpenFeedPreview');
  var btnOpenExportModal = $('#btnOpenExportModal');
  var tmExportModal = $('#tmExportModal');
  var btnCloseExportModal = $('#btnCloseExportModal');
  var tmAiOverlay = $('#tmAiOverlay');
  var tmAiStatus = $('#tmAiStatus');

  /* Background controls */
  var tmBgColor1 = $('#tmBgColor1');
  var tmBgColor2 = $('#tmBgColor2');
  var tmBgAngle = $('#tmBgAngle');
  var tmBgAngleVal = $('#tmBgAngleVal');
  var bgPresetChips = $$('.tm-bg-chip');
  var btnUploadBgImg = $('#btnUploadBgImg');
  var btnClearBgImg = $('#btnClearBgImg');
  var tmBgBlur = $('#tmBgBlur');
  var tmBgBlurVal = $('#tmBgBlurVal');
  var tmBgVignette = $('#tmBgVignette');
  var tmBgVignetteVal = $('#tmBgVignetteVal');
  var tmBgInput = $('#tmBgInput');

  /* Multi-Image & Cutout Dock controls */
  var btnUploadSubject = $('#btnUploadSubject');
  var tmImgTargetHint = $('#tmImgTargetHint');
  var btnAutoCutoutSubject = $('#btnAutoCutoutSubject');
  var btnRestoreOrigSubject = $('#btnRestoreOrigSubject');
  var tmImgRadius = $('#tmImgRadius');
  var tmImgRadiusVal = $('#tmImgRadiusVal');
  var tmSubjOutline = $('#tmSubjOutline');
  var tmSubjOutlineVal = $('#tmSubjOutlineVal');
  var tmSubjOutlineColor = $('#tmSubjOutlineColor');
  var tmSubjGlow = $('#tmSubjGlow');
  var tmSubjGlowVal = $('#tmSubjGlowVal');
  var tmSubjGlowColor = $('#tmSubjGlowColor');
  var tmImgShadow = $('#tmImgShadow');
  var tmImgShadowVal = $('#tmImgShadowVal');
  var tmSubjInput = $('#tmSubjInput');

  /* Elements controls */
  var btnAddHeadline = $('#btnAddHeadline');
  var ctrBtns = $$('[data-add-ctr]');
  var shapeBtns = $$('[data-add-shape]');
  var badgeChips = $$('[data-add-badge]');
  var emojiBtns = $$('[data-add-emoji]');

  /* Export controls */
  var tmExportName = $('#tmExportName');
  var exportFmtRadios = $$('input[name="tmExportFormat"]');
  var tmJpgQualWrap = $('#tmJpgQualWrap');
  var tmJpgQuality = $('#tmJpgQuality');
  var tmJpgQualityVal = $('#tmJpgQualityVal');
  var btnDownloadThumb = $('#btnDownloadThumb');
  var btnCopyThumb = $('#btnCopyThumb');

  /* Footer & Mobile Quickbar */
  var btnUndo = $('#btnUndo');
  var btnRedo = $('#btnRedo');
  var btnDupSelected = $('#btnDupSelected');
  var btnDelSelected = $('#btnDelSelected');
  var btnResetStudio = $('#btnResetStudio');

  var btnMqAddText = $('#btnMqAddText');
  var btnMqSubject = $('#btnMqSubject');
  var btnMqFeed = $('#btnMqFeed');
  var btnMqUndo = $('#btnMqUndo');
  var btnMqDownload = $('#btnMqDownload');

  /* Right Inspector Controls */
  var tmSelectedTypeTag = $('#tmSelectedTypeTag');
  var tmNoSelectionMsg = $('#tmNoSelectionMsg');
  var tmTextProps = $('#tmTextProps');
  var tmImageProps = $('#tmImageProps');
  var tmBadgeProps = $('#tmBadgeProps');
  var tmVectorProps = $('#tmVectorProps');
  var tmTransformProps = $('#tmTransformProps');
  var tmSubjectQuickBtns = $('#tmSubjectQuickBtns');

  var tmPropTextVal = $('#tmPropTextVal');
  var tmFontPicker = $('#tmFontPicker');
  var tmFontTrigger = $('#tmFontTrigger');
  var tmFontTriggerLabel = $('#tmFontTriggerLabel');
  var tmFontMenu = $('#tmFontMenu');
  var tmPropFontSize = $('#tmPropFontSize');
  var btnTextCenter = $('#btnTextCenter');
  var tmPropFill1 = $('#tmPropFill1');
  var tmPropFill2 = $('#tmPropFill2');
  var tmPropUseGrad = $('#tmPropUseGrad');
  var tmPropStrokeW = $('#tmPropStrokeW');
  var tmPropStrokeWVal = $('#tmPropStrokeWVal');
  var tmPropStrokeColor = $('#tmPropStrokeColor');
  var tmPropShadow = $('#tmPropShadow');
  var tmPropShadowVal = $('#tmPropShadowVal');
  var tmPropBannerOn = $('#tmPropBannerOn');
  var tmBannerOpts = $('#tmBannerOpts');
  var tmPropBannerColor = $('#tmPropBannerColor');
  var tmPropBannerSkew = $('#tmPropBannerSkew');

  /* Right Inspector Image Controls */
  var btnInspCutout = $('#btnInspCutout');
  var btnInspRestore = $('#btnInspRestore');
  var tmInspImgRadius = $('#tmInspImgRadius');
  var tmInspImgRadiusVal = $('#tmInspImgRadiusVal');
  var tmInspImgOutline = $('#tmInspImgOutline');
  var tmInspImgOutlineVal = $('#tmInspImgOutlineVal');
  var tmInspImgOutlineColor = $('#tmInspImgOutlineColor');
  var tmInspImgGlow = $('#tmInspImgGlow');
  var tmInspImgGlowVal = $('#tmInspImgGlowVal');
  var tmInspImgGlowColor = $('#tmInspImgGlowColor');
  var tmInspImgShadow = $('#tmInspImgShadow');
  var tmInspImgShadowVal = $('#tmInspImgShadowVal');

  var tmPropBadgeText = $('#tmPropBadgeText');
  var tmPropBadgeBg = $('#tmPropBadgeBg');
  var tmPropBadgeFg = $('#tmPropBadgeFg');

  var tmPropVectorColor = $('#tmPropVectorColor');
  var tmPropVectorStroke = $('#tmPropVectorStroke');
  var btnFlipLayer = $('#btnFlipLayer');

  var tmPropScale = $('#tmPropScale');
  var tmPropScaleVal = $('#tmPropScaleVal');
  var tmPropRot = $('#tmPropRot');
  var tmPropRotVal = $('#tmPropRotVal');
  var tmPropOpacity = $('#tmPropOpacity');
  var tmPropOpacityVal = $('#tmPropOpacityVal');
  var btnSubjFlipH = $('#btnSubjFlipH');
  var btnSubjCenter = $('#btnSubjCenter');

  var tmLayerList = $('#tmLayerList');
  var tmLayersCount = $('#tmLayersCount');

  /* YouTube Feed Preview Modal */
  var tmFeedModal = $('#tmFeedModal');
  var btnCloseFeedModal = $('#btnCloseFeedModal');
  var feedDeviceBtns = $$('[data-feed-device]');
  var feedThemeBtns = $$('[data-feed-theme]');
  var tmFeedTitleInput = $('#tmFeedTitleInput');
  var tmFeedChannelInput = $('#tmFeedChannelInput');
  var tmFeedStage = $('#tmFeedStage');
  var tmYtGrid = $('#tmYtGrid');

  /* ----- Working Canvases & Multi-Asset Registry ----- */
  var bgAsset = { img: null, url: null };
  var bgBlurCacheCanvas = document.createElement('canvas');
  var bgBlurCacheKey = '';

  /* assetId -> { assetId, name, img, w, h, origData, maskAlpha, hasCutout, rawOrigCanvas, rawCutoutCanvas } */
  var imageAssets = new Map();
  /* layerId -> { canvas, pad, key } */
  var layerCompCache = new Map();

  var activeDevice = 'cpu';
  var preloadPromise = null;
  var nextLayerId = 1;
  var nextAssetId = 1;
  var rafId = 0;

  /* ----- Studio State ----- */
  var state = {
    sizeId: 'yt_hd',
    templateId: 'tech',
    showSafeZone: true,
    isProcessingAi: false,
    isPeeking: false,

    bg: {
      c1: '#0F172A',
      c2: '#1D4ED8',
      angle: 135,
      blur: 0,
      vignette: 35,
      motif: 'tech',
    },

    layers: [],
    selectedId: null,

    exportFormat: 'png',
    jpgQuality: 94,

    feedDevice: 'desktop',
    feedTheme: 'dark',

    undoStack: [],
    redoStack: [],
  };

  /* Interactive Canvas Manipulation State */
  var canvasPointers = new Map();
  var dragAction = null; /* null | 'move' | 'scale' | 'rotate' | 'pinch' */
  var dragStart = null;
  var layerBoxes = {};
  var activeSnapX = false;
  var activeSnapY = false;

  /* ----- Helpers ----- */
  function isArabicUI() {
    return (document.documentElement.lang || '').toLowerCase() === 'ar';
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function sanitizeHex(hex, fallback) {
    var s = String(hex || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : (fallback || '#FFFFFF');
  }

  function sanitizeFilename(name) {
    var s = String(name || 'youtube-thumbnail').replace(/\.[^.]+$/, '');
    s = s.replace(/[\/\\:*?"<>|\x00-\x1F]+/g, '_').replace(/^\.+|\.+$/g, '').trim();
    return s || 'youtube-thumbnail';
  }

  function revokeAssetUrl(url) {
    if (url) {
      try { URL.revokeObjectURL(url); } catch (_e) {}
    }
  }

  function cleanupCanvas(c) {
    if (!c) return;
    var ctx = c.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, c.width, c.height);
    c.width = 0;
    c.height = 0;
  }

  function validateFile(file) {
    if (!file) return false;
    var type = (file.type || '').toLowerCase();
    if (!type && file.name) {
      var m = file.name.toLowerCase().match(/\.(jpe?g|png|webp|bmp|gif)$/);
      if (m) type = (m[1] === 'jpg' || m[1] === 'jpeg') ? 'image/jpeg' : 'image/' + m[1];
    }
    if (!ALLOWED_MIMES[type]) {
      toast(t('pp_err_type'), 'err');
      return false;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast(t('pp_err_size'), 'err');
      return false;
    }
    return true;
  }

  function syncDocumentMeta() {
    document.title = t('t_thumbnail_t') + ' — imgsfix';
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('tm_meta_desc'));
  }

  function getDim() {
    return PLATFORM_SIZES[state.sizeId] || PLATFORM_SIZES.yt_hd;
  }

  function getScaleRef() {
    var d = getDim();
    return Math.min(d.w, d.h) / 720;
  }

  function isImageLayer(L) {
    return Boolean(L && (L.type === 'image' || L.type === 'subject'));
  }

  function getFontEntry(fontCssOrId) {
    var key = String(fontCssOrId || '');
    if (key === 'lateef') return getFontEntry('amiri');
    for (var i = 0; i < FONT_LIBRARY.length; i++) {
      if (FONT_LIBRARY[i].id === key || FONT_LIBRARY[i].css === key || key.indexOf(FONT_LIBRARY[i].family) !== -1) {
        return FONT_LIBRARY[i];
      }
    }
    return FONT_LIBRARY[0];
  }

  function ensureFontLoaded(fontEntry) {
    if (!fontEntry || !document.fonts || typeof document.fonts.load !== 'function') return;
    var spec = fontEntry.weight + ' 64px "' + fontEntry.family + '"';
    document.fonts.load(spec).then(function () {
      scheduleRender();
    }).catch(function () {});
  }

  /* ----- Rounded Rect Helper ----- */
  function roundRectPath(ctx, x, y, w, h, r) {
    var rad = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, rad);
    } else {
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
  }

  /* ----- Undo / Redo Snapshot Stack ----- */
  function cloneLayers(arr) {
    return arr.map(function (l) {
      return Object.assign({}, l);
    });
  }

  function pushUndo() {
    state.undoStack.push({
      sizeId: state.sizeId,
      templateId: state.templateId,
      bg: Object.assign({}, state.bg),
      layers: cloneLayers(state.layers),
      selectedId: state.selectedId,
    });
    if (state.undoStack.length > MAX_UNDO) state.undoStack.shift();
    state.redoStack = [];
    syncUndoButtons();
  }

  function applySnapshot(snap) {
    if (!snap) return;
    state.sizeId = snap.sizeId;
    state.templateId = snap.templateId;
    state.bg = Object.assign({}, snap.bg);
    state.layers = cloneLayers(snap.layers);
    state.selectedId = snap.selectedId;
    bgBlurCacheKey = '';
    layerCompCache.forEach(function (c) { c.key = ''; });
    syncSizeButtons();
    syncBgUI();
    syncImageDockControls();
    syncInspectorUI();
    renderLayerList();
    renderAll();
  }

  function handleUndo() {
    if (!state.undoStack.length) return;
    state.redoStack.push({
      sizeId: state.sizeId,
      templateId: state.templateId,
      bg: Object.assign({}, state.bg),
      layers: cloneLayers(state.layers),
      selectedId: state.selectedId,
    });
    var snap = state.undoStack.pop();
    applySnapshot(snap);
    syncUndoButtons();
  }

  function handleRedo() {
    if (!state.redoStack.length) return;
    state.undoStack.push({
      sizeId: state.sizeId,
      templateId: state.templateId,
      bg: Object.assign({}, state.bg),
      layers: cloneLayers(state.layers),
      selectedId: state.selectedId,
    });
    var snap = state.redoStack.pop();
    applySnapshot(snap);
    syncUndoButtons();
  }

  function syncUndoButtons() {
    var canU = state.undoStack.length > 0;
    var canR = state.redoStack.length > 0;
    if (btnUndo) btnUndo.disabled = !canU;
    if (btnMqUndo) btnMqUndo.disabled = !canU;
    if (btnRedo) btnRedo.disabled = !canR;
  }

  /* ----- AI Background Removal (@imgly/background-removal) ----- */
  async function detectPreferredDevice() {
    try {
      if (typeof navigator !== 'undefined' && navigator.gpu && typeof navigator.gpu.requestAdapter === 'function') {
        var adapter = await navigator.gpu.requestAdapter();
        if (adapter) return 'gpu';
      }
    } catch (_e) {}
    return 'cpu';
  }

  function getImglyConfig(dev) {
    return {
      model: 'isnet_fp16',
      device: dev || activeDevice,
      proxyToWorker: false,
      rescale: true,
      fetchArgs: { cache: 'force-cache' },
      output: { format: 'image/png', quality: 1.0 },
    };
  }

  function startSilentPreload() {
    if (preloadPromise) return preloadPromise;
    preloadPromise = (async function () {
      activeDevice = await detectPreferredDevice();
      try {
        await preload(getImglyConfig(activeDevice));
      } catch (_gpuErr) {
        if (activeDevice === 'gpu') {
          activeDevice = 'cpu';
          await preload(getImglyConfig('cpu'));
        }
      }
    })().catch(function () {
      preloadPromise = null;
    });
    return preloadPromise;
  }

  function decodeBlobToImage(blob) {
    return new Promise(function (resolve, reject) {
      var u = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        revokeAssetUrl(u);
        resolve(img);
      };
      img.onerror = function () {
        revokeAssetUrl(u);
        reject(new Error('Decode error'));
      };
      img.src = u;
    });
  }

  function extractSmoothMask(aiImg, w, h) {
    var mc = document.createElement('canvas');
    mc.width = w;
    mc.height = h;
    var mctx = mc.getContext('2d');
    mctx.imageSmoothingEnabled = true;
    mctx.imageSmoothingQuality = 'high';
    mctx.clearRect(0, 0, w, h);
    mctx.drawImage(aiImg, 0, 0, w, h);
    var pixels = mctx.getImageData(0, 0, w, h).data;
    cleanupCanvas(mc);

    var total = w * h;
    var raw = new Uint8ClampedArray(total);
    for (var i = 0; i < total; i++) raw[i] = pixels[i * 4 + 3];

    var out = new Uint8ClampedArray(total);
    for (var y = 0; y < h; y++) {
      var yP = y > 0 ? y - 1 : 0;
      var yN = y < h - 1 ? y + 1 : h - 1;
      var row = y * w;
      var rP = yP * w;
      var rN = yN * w;
      for (var x = 0; x < w; x++) {
        var c = raw[row + x];
        if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
          if (c === 255 && raw[row + x - 1] === 255 && raw[row + x + 1] === 255 && raw[rP + x] === 255 && raw[rN + x] === 255) {
            out[row + x] = 255;
            continue;
          }
          if (c === 0 && raw[row + x - 1] === 0 && raw[row + x + 1] === 0 && raw[rP + x] === 0 && raw[rN + x] === 0) {
            out[row + x] = 0;
            continue;
          }
        }
        var xP = x > 0 ? x - 1 : 0;
        var xN = x < w - 1 ? x + 1 : w - 1;
        var sm = (
          raw[rP + xP] + raw[rP + x] * 2 + raw[rP + xN] +
          raw[row + xP] * 2 + c * 4 + raw[row + xN] * 2 +
          raw[rN + xP] + raw[rN + x] * 2 + raw[rN + xN]
        ) >> 4;
        if (sm < 64) out[row + x] = 0;
        else if (sm >= 242) out[row + x] = 255;
        else out[row + x] = sm;
      }
    }
    return out;
  }

  function buildAssetCutoutCanvas(asset) {
    if (!asset || !asset.origData || !asset.maskAlpha) return;
    var w = asset.w;
    var h = asset.h;
    if (!asset.rawCutoutCanvas) asset.rawCutoutCanvas = document.createElement('canvas');
    asset.rawCutoutCanvas.width = w;
    asset.rawCutoutCanvas.height = h;
    var ctx = asset.rawCutoutCanvas.getContext('2d');
    var imgData = ctx.createImageData(w, h);
    var src = asset.origData.data;
    var dst = imgData.data;
    var mask = asset.maskAlpha;
    for (var i = 0; i < w * h; i++) {
      var p4 = i * 4;
      dst[p4] = src[p4];
      dst[p4 + 1] = src[p4 + 1];
      dst[p4 + 2] = src[p4 + 2];
      dst[p4 + 3] = mask[i];
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function getBakedImageComposite(layer, asset) {
    var peek = Boolean(state.isPeeking);
    var useCut = !peek && Boolean(layer.useCutout && asset.hasCutout && asset.rawCutoutCanvas);
    var radPct = peek ? 0 : clamp(layer.cornerRadius || 0, 0, 50);
    var outPx = peek ? 0 : clamp(layer.outlinePx || 0, 0, 24);
    var outCol = sanitizeHex(layer.outlineColor, '#FFFFFF');
    var glBlur = peek ? 0 : clamp(layer.glowBlur || 0, 0, 60);
    var glCol = sanitizeHex(layer.glowColor, '#38BDF8');
    var shBlur = peek ? 0 : clamp(layer.shadowBlur !== undefined ? layer.shadowBlur : 12, 0, 48);

    var cacheKey = [
      asset.assetId,
      useCut ? 1 : 0,
      radPct,
      outPx,
      outCol,
      glBlur,
      glCol,
      shBlur,
    ].join('|');

    var cached = layerCompCache.get(layer.id);
    if (cached && cached.key === cacheKey && cached.canvas && cached.canvas.width > 0) {
      return cached;
    }

    var srcCanvas = useCut ? asset.rawCutoutCanvas : asset.rawOrigCanvas;
    var maxSide = 1200;
    var sRatio = Math.min(1, maxSide / Math.max(asset.w, asset.h));
    var baseW = Math.max(1, Math.round(asset.w * sRatio));
    var baseH = Math.max(1, Math.round(asset.h * sRatio));

    var outScaled = outPx * 1.4;
    var glScaled = glBlur * 1.25;
    var shScaled = shBlur * 1.2;
    var pad = Math.ceil(outScaled + glScaled * 1.45 + shScaled * 1.3 + 8);
    var compW = baseW + pad * 2;
    var compH = baseH + pad * 2;

    var comp = (cached && cached.canvas) ? cached.canvas : document.createElement('canvas');
    comp.width = compW;
    comp.height = compH;
    var ctx = comp.getContext('2d');
    ctx.clearRect(0, 0, compW, compH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    /* Step 1: Masked & Corner-Rounded Foreground */
    var fg = document.createElement('canvas');
    fg.width = baseW;
    fg.height = baseH;
    var fctx = fg.getContext('2d');
    fctx.imageSmoothingEnabled = true;
    fctx.imageSmoothingQuality = 'high';
    if (radPct > 0) {
      var radPx = Math.min(baseW, baseH) * (radPct / 100);
      roundRectPath(fctx, 0, 0, baseW, baseH, radPx);
      fctx.clip();
    }
    fctx.drawImage(srcCanvas, 0, 0, baseW, baseH);

    /* Step 2: Backlight Rim Glow */
    if (glScaled > 0) {
      var glowSil = document.createElement('canvas');
      glowSil.width = baseW;
      glowSil.height = baseH;
      var gsctx = glowSil.getContext('2d');
      gsctx.drawImage(fg, 0, 0);
      gsctx.globalCompositeOperation = 'source-in';
      gsctx.fillStyle = glCol;
      gsctx.fillRect(0, 0, baseW, baseH);

      ctx.save();
      ctx.shadowColor = glCol;
      ctx.shadowBlur = glScaled;
      ctx.drawImage(glowSil, pad, pad);
      ctx.drawImage(glowSil, pad, pad);
      ctx.restore();
      cleanupCanvas(glowSil);
    }

    /* Step 3: Drop Shadow */
    if (shScaled > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = shScaled;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.round(shScaled * 0.35);
      ctx.drawImage(fg, pad, pad);
      ctx.restore();
    }

    /* Step 4: Crisp Multi-Angle Border / Die-Cut Outline */
    if (outScaled > 0) {
      var outSil = document.createElement('canvas');
      outSil.width = baseW;
      outSil.height = baseH;
      var osctx = outSil.getContext('2d');
      osctx.drawImage(fg, 0, 0);
      osctx.globalCompositeOperation = 'source-in';
      osctx.fillStyle = outCol;
      osctx.fillRect(0, 0, baseW, baseH);

      var steps = 20;
      for (var i = 0; i < steps; i++) {
        var ang = (i / steps) * Math.PI * 2;
        ctx.drawImage(outSil, pad + Math.cos(ang) * outScaled, pad + Math.sin(ang) * outScaled);
      }
      if (outScaled > 9) {
        var halfR = outScaled * 0.5;
        for (var j = 0; j < 12; j++) {
          var ang2 = (j / 12) * Math.PI * 2;
          ctx.drawImage(outSil, pad + Math.cos(ang2) * halfR, pad + Math.sin(ang2) * halfR);
        }
      }
      cleanupCanvas(outSil);
    }

    /* Step 5: Foreground Image on Top */
    ctx.drawImage(fg, pad, pad);
    cleanupCanvas(fg);

    var entry = { canvas: comp, pad: pad, baseW: baseW, baseH: baseH, key: cacheKey };
    layerCompCache.set(layer.id, entry);
    return entry;
  }

  /* ----- Starter Layer Builders & Pro Templates ----- */
  function createTextLayer(opts) {
    var fontEntry = getFontEntry(opts.font || 'cairo');
    ensureFontLoaded(fontEntry);
    return {
      id: 'L' + (nextLayerId++),
      type: 'text',
      nx: opts.nx !== undefined ? opts.nx : 0.34,
      ny: opts.ny !== undefined ? opts.ny : 0.44,
      scale: opts.scale !== undefined ? opts.scale : 1,
      rot: opts.rot !== undefined ? opts.rot : 0,
      opacity: 100,
      visible: true,
      locked: false,
      flipH: false,
      text: opts.text || (isArabicUI() ? 'عنوان خاطف للانتباه!' : 'CRAZY RESULT!'),
      font: fontEntry.css,
      fontSize: opts.fontSize || 92,
      fill1: opts.fill1 || '#FFFFFF',
      fill2: opts.fill2 || '#FACC15',
      useGrad: Boolean(opts.useGrad),
      strokeW: opts.strokeW !== undefined ? opts.strokeW : 12,
      strokeColor: opts.strokeColor || '#090D16',
      shadowBlur: opts.shadowBlur !== undefined ? opts.shadowBlur : 16,
      bannerOn: Boolean(opts.bannerOn),
      bannerColor: opts.bannerColor || '#EF4444',
      bannerSkew: opts.bannerSkew !== undefined ? opts.bannerSkew : -8,
    };
  }

  function createCtrLayer(subtype, nx, ny) {
    var color = '#EF4444';
    var strokeColor = '#090D16';
    if (subtype === 'arrow_curved_yellow' || subtype === 'arrow_yellow') color = '#FACC15';
    else if (subtype === 'arrow_double') color = '#38BDF8';
    else if (subtype === 'arrow_trend_up') color = '#22C55E';
    return {
      id: 'L' + (nextLayerId++),
      type: 'arrow',
      subtype: subtype,
      nx: nx !== undefined ? nx : 0.56,
      ny: ny !== undefined ? ny : 0.52,
      scale: 1,
      rot: (subtype.indexOf('trend') !== -1 || subtype === 'arrow_double' || subtype === 'arrow_straight') ? 0 : -12,
      opacity: 100,
      visible: true,
      locked: false,
      flipH: false,
      color: color,
      strokeColor: strokeColor,
    };
  }

  function createShapeLayer(subtype, nx, ny) {
    var color = '#EF4444';
    var strokeColor = '#FFFFFF';
    if (subtype === 'box_rounded') { color = '#1D4ED8'; strokeColor = '#FFFFFF'; }
    else if (subtype === 'ribbon_slanted') { color = '#FACC15'; strokeColor = '#090D16'; }
    else if (subtype === 'starburst') { color = '#F97316'; strokeColor = '#FEF08A'; }
    else if (subtype === 'speech_bubble') { color = '#FFFFFF'; strokeColor = '#090D16'; }
    else if (subtype === 'neon_frame') { color = '#A855F7'; strokeColor = '#E879F9'; }
    else if (subtype === 'ring_focus' || subtype === 'circle_red') { color = '#EF4444'; strokeColor = '#090D16'; }
    return {
      id: 'L' + (nextLayerId++),
      type: 'shape',
      subtype: subtype,
      nx: nx !== undefined ? nx : 0.52,
      ny: ny !== undefined ? ny : 0.50,
      scale: 1,
      rot: 0,
      opacity: 100,
      visible: true,
      locked: false,
      flipH: false,
      color: color,
      strokeColor: strokeColor,
    };
  }

  function createBadgeLayer(label, bgColor, fgColor, nx, ny) {
    return {
      id: 'L' + (nextLayerId++),
      type: 'badge',
      nx: nx !== undefined ? nx : 0.22,
      ny: ny !== undefined ? ny : 0.2,
      scale: 1,
      rot: -6,
      opacity: 100,
      visible: true,
      locked: false,
      flipH: false,
      text: label || 'NEW',
      bgColor: bgColor || '#EF4444',
      fgColor: fgColor || '#FFFFFF',
    };
  }

  function createEmojiLayer(emojiChar, nx, ny) {
    return {
      id: 'L' + (nextLayerId++),
      type: 'emoji',
      nx: nx !== undefined ? nx : 0.65,
      ny: ny !== undefined ? ny : 0.3,
      scale: 1,
      rot: 8,
      opacity: 100,
      visible: true,
      locked: false,
      flipH: false,
      emoji: emojiChar || '😱',
    };
  }

  function createImageLayer(asset, indexOffset) {
    var offset = (indexOffset || 0) * 0.04;
    return {
      id: 'L' + (nextLayerId++),
      type: 'image',
      assetId: asset.assetId,
      name: asset.name || 'image.png',
      nx: clamp(0.72 - offset, 0.15, 0.85),
      ny: clamp(0.55 + offset, 0.20, 0.85),
      scale: 1,
      rot: 0,
      opacity: 100,
      visible: true,
      locked: false,
      flipH: false,
      useCutout: Boolean(asset.hasCutout),
      cornerRadius: 0,
      outlinePx: 0,
      outlineColor: '#FFFFFF',
      glowBlur: 0,
      glowColor: '#38BDF8',
      shadowBlur: 12,
    };
  }

  function applyTemplate(tplId, recordUndo) {
    if (recordUndo) pushUndo();
    state.templateId = tplId;
    tplCards.forEach(function (c) {
      c.classList.toggle('active', c.getAttribute('data-template') === tplId);
    });

    var ar = isArabicUI();
    /* Preserve all uploaded image/logo/sticker layers across template changes */
    var keptImages = state.layers.filter(function (l) { return isImageLayer(l); }).map(function (l) {
      return Object.assign({}, l);
    });
    var layers = keptImages.slice();

    if (tplId === 'tech') {
      state.bg = { c1: '#0F172A', c2: '#1D4ED8', angle: 135, blur: state.bg.blur, vignette: 40, motif: 'tech' };
      layers.push(createBadgeLayer(ar ? 'شرح شامل' : 'FULL GUIDE', '#0EA5E9', '#FFFFFF', 0.24, 0.21));
      layers.push(createTextLayer({
        text: ar ? 'أفضل طريقة\nبخطوة واحدة!' : '3X FASTER\nWORKFLOW!',
        font: ar ? 'cairo' : 'montserrat',
        nx: 0.34, ny: 0.49, fontSize: 88, fill1: '#FFFFFF', fill2: '#38BDF8', useGrad: true, strokeW: 12, strokeColor: '#020617',
      }));
      layers.push(createTextLayer({
        text: ar ? 'بدون برامج معقدة' : 'PRO SECRETS REVEALED',
        font: ar ? 'tajawal' : 'oswald',
        nx: 0.33, ny: 0.76, fontSize: 40, fill1: '#0F172A', bannerOn: true, bannerColor: '#FACC15', bannerSkew: -6, strokeW: 0, shadowBlur: 8,
      }));
      layers.push(createCtrLayer('arrow_curved_yellow', 0.62, 0.52));
    } else if (tplId === 'gaming') {
      state.bg = { c1: '#2E1065', c2: '#BE123C', angle: 135, blur: state.bg.blur, vignette: 35, motif: 'gaming' };
      layers.push(createTextLayer({
        text: ar ? 'تحدي\nالمستحيل!' : 'IMPOSSIBLE\nCLUTCH!',
        font: ar ? 'changa' : 'anton',
        nx: 0.33, ny: 0.44, fontSize: 96, fill1: '#FACC15', fill2: '#F97316', useGrad: true, strokeW: 14, strokeColor: '#1E0738', rot: -4,
      }));
      layers.push(createBadgeLayer('100%', '#EF4444', '#FFFFFF', 0.20, 0.74));
      layers.push(createCtrLayer('arrow_curved_red', 0.58, 0.55));
      layers.push(createEmojiLayer('🔥', 0.76, 0.24));
    } else if (tplId === 'podcast') {
      state.bg = { c1: '#090D16', c2: '#92400E', angle: 120, blur: state.bg.blur, vignette: 55, motif: 'podcast' };
      layers.push(createBadgeLayer('LIVE', '#DC2626', '#FFFFFF', 0.19, 0.20));
      layers.push(createTextLayer({
        text: ar ? 'الحقيقة الكاملة\nلأول مرة!' : 'THE REAL\nTRUTH!',
        font: ar ? 'almarai' : 'bebas',
        nx: 0.35, ny: 0.52, fontSize: 96, fill1: '#FFFFFF', fill2: '#FDE68A', useGrad: true, strokeW: 10, strokeColor: '#000000',
      }));
      layers.push(createTextLayer({
        text: ar ? 'حوار حصري ومباشر' : 'UNCUT INTERVIEW',
        font: ar ? 'cairo' : 'poppins',
        nx: 0.34, ny: 0.78, fontSize: 36, fill1: '#FFFFFF', bannerOn: true, bannerColor: '#D97706', bannerSkew: -4, strokeW: 0,
      }));
    } else if (tplId === 'vs') {
      state.bg = { c1: '#1E3A8A', c2: '#991B1B', angle: 90, blur: state.bg.blur, vignette: 30, motif: 'vs' };
      layers.push(createBadgeLayer('VS', '#FACC15', '#111827', 0.50, 0.50));
      layers.push(createTextLayer({
        text: ar ? 'قبل' : 'BEFORE',
        font: ar ? 'cairo' : 'impact',
        nx: 0.24, ny: 0.23, fontSize: 66, fill1: '#FFFFFF', bannerOn: true, bannerColor: '#2563EB', bannerSkew: -8, strokeW: 6, strokeColor: '#0F172A',
      }));
      layers.push(createTextLayer({
        text: ar ? 'بعد!' : 'AFTER!',
        font: ar ? 'cairo' : 'impact',
        nx: 0.76, ny: 0.23, fontSize: 66, fill1: '#FFFFFF', bannerOn: true, bannerColor: '#EF4444', bannerSkew: -8, strokeW: 6, strokeColor: '#0F172A',
      }));
      layers.push(createCtrLayer('arrow_straight', 0.50, 0.24));
    } else if (tplId === 'news') {
      state.bg = { c1: '#7F1D1D', c2: '#111827', angle: 160, blur: state.bg.blur, vignette: 45, motif: 'news' };
      layers.push(createBadgeLayer(ar ? 'حصري' : 'BREAKING', '#FACC15', '#111827', 0.22, 0.20));
      layers.push(createTextLayer({
        text: ar ? 'تحديث خطير\nيغيّر كل شيء!' : 'MAJOR UPDATE\nEVERYTHING CHANGED!',
        font: ar ? 'ibm_ar' : 'roboto',
        nx: 0.38, ny: 0.52, fontSize: 80, fill1: '#FFFFFF', strokeW: 12, strokeColor: '#000000',
      }));
      layers.push(createShapeLayer('ring_focus', 0.72, 0.48));
    } else if (tplId === 'vlog') {
      state.bg = { c1: '#F97316', c2: '#DB2777', angle: 135, blur: state.bg.blur, vignette: 20, motif: 'vlog' };
      layers.push(createTextLayer({
        text: ar ? '٢٤ ساعة في\nأجمل مدينة!' : '24 HOURS\nMY BEST DAY!',
        font: ar ? 'readex' : 'luckiest',
        nx: 0.34, ny: 0.48, fontSize: 86, fill1: '#FFFFFF', strokeW: 12, strokeColor: '#1E1B4B', rot: -3,
      }));
      layers.push(createBadgeLayer(ar ? 'مفاجأة!' : 'NEW VLOG', '#FFFFFF', '#DB2777', 0.24, 0.22));
      layers.push(createEmojiLayer('🚀', 0.76, 0.25));
    }

    state.layers = layers;
    state.selectedId = layers.length ? layers[layers.length - 1].id : null;
    bgBlurCacheKey = '';
    syncBgUI();
    syncImageDockControls();
    syncInspectorUI();
    renderLayerList();
    renderAll();
  }

  /* ----- Canvas Rendering Pipeline ----- */
  function renderBackdrop(ctx, w, h) {
    var ang = ((state.bg.angle || 135) * Math.PI) / 180;
    var r = Math.hypot(w, h) / 2;
    var gx = Math.cos(ang) * r;
    var gy = Math.sin(ang) * r;
    var grad = ctx.createLinearGradient(w / 2 - gx, h / 2 - gy, w / 2 + gx, h / 2 + gy);
    grad.addColorStop(0, sanitizeHex(state.bg.c1, '#0F172A'));
    grad.addColorStop(1, sanitizeHex(state.bg.c2, '#1D4ED8'));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    var motif = state.bg.motif;
    ctx.save();
    if (motif === 'tech') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = Math.max(1, w / 640);
      var step = Math.round(w / 18);
      for (var x = 0; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (var y = 0; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      var rg = ctx.createRadialGradient(w * 0.76, h * 0.45, 0, w * 0.76, h * 0.45, w * 0.42);
      rg.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      rg.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    } else if (motif === 'gaming') {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
      ctx.beginPath();
      ctx.moveTo(w * 0.56, 0); ctx.lineTo(w * 0.74, 0);
      ctx.lineTo(w * 0.48, h); ctx.lineTo(w * 0.30, h);
      ctx.closePath();
      ctx.fill();
    } else if (motif === 'podcast') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      var bars = 28;
      for (var b = 0; b < bars; b++) {
        var bx = (b / bars) * w;
        var bh = h * (0.08 + ((b * 37) % 10) * 0.025);
        ctx.fillRect(bx, h - bh, Math.max(4, w / 48), bh);
      }
    } else if (motif === 'vs') {
      ctx.fillStyle = sanitizeHex(state.bg.c1, '#1E3A8A');
      ctx.fillRect(0, 0, w * 0.5, h);
      ctx.fillStyle = sanitizeHex(state.bg.c2, '#991B1B');
      ctx.fillRect(w * 0.5, 0, w * 0.5, h);
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = Math.max(6, w * 0.01);
      ctx.beginPath();
      ctx.moveTo(w * 0.52, 0);
      ctx.lineTo(w * 0.48, h * 0.48);
      ctx.lineTo(w * 0.52, h * 0.52);
      ctx.lineTo(w * 0.48, h);
      ctx.stroke();
    } else if (motif === 'news') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fillRect(0, h * 0.86, w, h * 0.14);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(w * 0.65, 0); ctx.lineTo(w, 0);
      ctx.lineTo(w, h); ctx.lineTo(w * 0.45, h);
      ctx.closePath();
      ctx.fill();
    } else if (motif === 'vlog') {
      var rg2 = ctx.createRadialGradient(w * 0.25, h * 0.2, 0, w * 0.25, h * 0.2, w * 0.5);
      rg2.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
      rg2.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = rg2;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    if (bgAsset.img && bgAsset.img.naturalWidth) {
      var blur = state.isPeeking ? 0 : clamp(state.bg.blur || 0, 0, 24);
      var key = w + 'x' + h + 'b' + blur;
      if (bgBlurCacheKey !== key) {
        bgBlurCacheCanvas.width = w;
        bgBlurCacheCanvas.height = h;
        var bctx = bgBlurCacheCanvas.getContext('2d');
        bctx.clearRect(0, 0, w, h);
        var img = bgAsset.img;
        var cover = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        var dw = img.naturalWidth * cover * (blur > 0 ? 1.06 : 1);
        var dh = img.naturalHeight * cover * (blur > 0 ? 1.06 : 1);
        if (blur > 0) bctx.filter = 'blur(' + blur + 'px)';
        bctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        bctx.filter = 'none';
        bgBlurCacheKey = key;
      }
      ctx.drawImage(bgBlurCacheCanvas, 0, 0);
    }

    var vig = state.isPeeking ? 0 : clamp(state.bg.vignette || 0, 0, 90) / 100;
    if (vig > 0) {
      var vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,' + vig.toFixed(2) + ')');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function measureAndDrawLayer(ctx, layer, w, h, sRef) {
    if (!layer || !layer.visible) return null;
    var cx = layer.nx * w;
    var cy = layer.ny * h;
    var sc = clamp(layer.scale || 1, 0.2, 4);
    var rotRad = ((layer.rot || 0) * Math.PI) / 180;
    var halfW = 60;
    var halfH = 40;

    ctx.save();
    ctx.globalAlpha = clamp((layer.opacity !== undefined ? layer.opacity : 100) / 100, 0.05, 1);
    ctx.translate(cx, cy);
    ctx.rotate(rotRad);
    ctx.scale(sc * (layer.flipH ? -1 : 1), sc);

    if (isImageLayer(layer)) {
      var asset = imageAssets.get(layer.assetId);
      if (!asset || !asset.img || !asset.w || !asset.h) {
        ctx.restore();
        return null;
      }
      var baked = getBakedImageComposite(layer, asset);
      var targetH = h * 0.78;
      var ratio = targetH / Math.max(1, baked.baseH);
      /* Keep logos/wide banners from blowing up past 82% width */
      var maxW = w * 0.82;
      if (baked.baseW * ratio > maxW) ratio = maxW / Math.max(1, baked.baseW);

      var drawW = baked.canvas.width * ratio;
      var drawH = baked.canvas.height * ratio;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(baked.canvas, -drawW / 2, -drawH / 2, drawW, drawH);
      halfW = (baked.baseW * ratio) / 2;
      halfH = (baked.baseH * ratio) / 2;
    } else if (layer.type === 'text') {
      var fEntry = getFontEntry(layer.font);
      var fSize = Math.round((layer.fontSize || 92) * sRef);
      var lines = String(layer.text || '').split('\n');
      if (lines.length === 1 && lines[0] === '') lines = [' '];
      ctx.font = fEntry.weight + ' ' + fSize + 'px ' + fEntry.css;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      var maxLW = 0;
      for (var i = 0; i < lines.length; i++) {
        var lw = ctx.measureText(lines[i]).width;
        if (lw > maxLW) maxLW = lw;
      }
      var lineH = fSize * 1.15;
      var blockH = lines.length * lineH;
      var padX = fSize * 0.34;
      var padY = fSize * 0.18;

      if (layer.bannerOn) {
        ctx.save();
        var skewRad = ((layer.bannerSkew || -8) * Math.PI) / 180;
        ctx.transform(1, 0, Math.tan(skewRad), 1, 0, 0);
        ctx.fillStyle = sanitizeHex(layer.bannerColor, '#EF4444');
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 18 * sRef;
        ctx.shadowOffsetY = 8 * sRef;
        roundRectPath(ctx, -maxLW / 2 - padX, -blockH / 2 - padY, maxLW + padX * 2, blockH + padY * 2, 12 * sRef);
        ctx.fill();
        ctx.restore();
      }

      var sh = (layer.shadowBlur !== undefined ? layer.shadowBlur : 14) * sRef;
      if (sh > 0) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
        ctx.shadowBlur = sh;
        ctx.shadowOffsetX = 4 * sRef;
        ctx.shadowOffsetY = 6 * sRef;
      }

      var fillStyle;
      if (layer.useGrad) {
        fillStyle = ctx.createLinearGradient(0, -blockH / 2, 0, blockH / 2);
        fillStyle.addColorStop(0, sanitizeHex(layer.fill1, '#FFFFFF'));
        fillStyle.addColorStop(1, sanitizeHex(layer.fill2, '#FACC15'));
      } else {
        fillStyle = sanitizeHex(layer.fill1, '#FFFFFF');
      }

      var stW = (layer.strokeW !== undefined ? layer.strokeW : 10) * sRef;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;

      for (var li = 0; li < lines.length; li++) {
        var ty = -blockH / 2 + lineH * (li + 0.5);
        if (stW > 0) {
          ctx.strokeStyle = sanitizeHex(layer.strokeColor, '#090D16');
          ctx.lineWidth = stW;
          ctx.strokeText(lines[li], 0, ty);
        }
        ctx.fillStyle = fillStyle;
        ctx.fillText(lines[li], 0, ty);
      }

      halfW = maxLW / 2 + (layer.bannerOn ? padX : 12 * sRef);
      halfH = blockH / 2 + (layer.bannerOn ? padY : 10 * sRef);
    } else if (layer.type === 'badge') {
      var bf = Math.round(44 * sRef);
      ctx.font = '900 ' + bf + 'px Cairo, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var bTxt = String(layer.text || 'NEW');
      var bw = Math.max(bf * 2.1, ctx.measureText(bTxt).width + bf * 1.15);
      var bh = bf * 1.55;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 16 * sRef;
      ctx.shadowOffsetY = 6 * sRef;
      ctx.fillStyle = sanitizeHex(layer.bgColor, '#EF4444');
      roundRectPath(ctx, -bw / 2, -bh / 2, bw, bh, 14 * sRef);
      ctx.fill();
      ctx.lineWidth = Math.max(2, 4 * sRef);
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = sanitizeHex(layer.fgColor, '#FFFFFF');
      ctx.fillText(bTxt, 0, 2 * sRef);
      halfW = bw / 2;
      halfH = bh / 2;
    } else if (layer.type === 'arrow') {
      var aCol = sanitizeHex(layer.color, '#EF4444');
      var aStroke = sanitizeHex(layer.strokeColor, '#090D16');
      var sub = layer.subtype || 'arrow_curved_red';
      var aw = 220 * sRef;
      var ah = 136 * sRef;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.58)';
      ctx.shadowBlur = 14 * sRef;
      ctx.shadowOffsetY = 6 * sRef;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      function traceSubArrow() {
        if (sub === 'arrow_straight') {
          ctx.beginPath();
          ctx.moveTo(-aw * 0.46, 0);
          ctx.lineTo(aw * 0.36, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(aw * 0.16, -ah * 0.28);
          ctx.lineTo(aw * 0.44, 0);
          ctx.lineTo(aw * 0.16, ah * 0.28);
        } else if (sub === 'arrow_double') {
          ctx.beginPath();
          ctx.moveTo(-aw * 0.36, 0);
          ctx.lineTo(aw * 0.36, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(aw * 0.18, -ah * 0.26);
          ctx.lineTo(aw * 0.44, 0);
          ctx.lineTo(aw * 0.18, ah * 0.26);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-aw * 0.18, -ah * 0.26);
          ctx.lineTo(-aw * 0.44, 0);
          ctx.lineTo(-aw * 0.18, ah * 0.26);
        } else if (sub === 'arrow_trend_up') {
          ctx.beginPath();
          ctx.moveTo(-aw * 0.44, ah * 0.34);
          ctx.lineTo(-aw * 0.12, ah * 0.04);
          ctx.lineTo(aw * 0.04, ah * 0.18);
          ctx.lineTo(aw * 0.38, -ah * 0.32);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(aw * 0.14, -ah * 0.34);
          ctx.lineTo(aw * 0.42, -ah * 0.36);
          ctx.lineTo(aw * 0.39, -ah * 0.06);
        } else if (sub === 'arrow_trend_down') {
          ctx.beginPath();
          ctx.moveTo(-aw * 0.44, -ah * 0.34);
          ctx.lineTo(-aw * 0.12, -ah * 0.04);
          ctx.lineTo(aw * 0.04, -ah * 0.18);
          ctx.lineTo(aw * 0.38, ah * 0.32);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(aw * 0.14, ah * 0.34);
          ctx.lineTo(aw * 0.42, ah * 0.36);
          ctx.lineTo(aw * 0.39, ah * 0.06);
        } else {
          ctx.beginPath();
          ctx.moveTo(-aw * 0.45, -ah * 0.28);
          ctx.quadraticCurveTo(0, -ah * 0.55, aw * 0.34, ah * 0.16);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(aw * 0.12, ah * 0.25);
          ctx.lineTo(aw * 0.42, ah * 0.28);
          ctx.lineTo(aw * 0.34, -ah * 0.08);
        }
      }

      ctx.strokeStyle = aStroke;
      ctx.lineWidth = 26 * sRef;
      traceSubArrow();
      ctx.stroke();

      ctx.strokeStyle = aCol;
      ctx.lineWidth = 15 * sRef;
      traceSubArrow();
      ctx.stroke();
      ctx.restore();

      halfW = aw * 0.5;
      halfH = ah * 0.46;
    } else if (layer.type === 'shape' || layer.type === 'spotlight') {
      var fCol = sanitizeHex(layer.color, '#EF4444');
      var oCol = sanitizeHex(layer.strokeColor, '#FFFFFF');
      var shSub = layer.subtype || 'ring_focus';
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.52)';
      ctx.shadowBlur = 16 * sRef;
      ctx.shadowOffsetY = 6 * sRef;

      if (shSub === 'box_rounded') {
        var rw = 300 * sRef;
        var rh = 150 * sRef;
        ctx.fillStyle = fCol;
        roundRectPath(ctx, -rw / 2, -rh / 2, rw, rh, 22 * sRef);
        ctx.fill();
        ctx.lineWidth = 6 * sRef;
        ctx.strokeStyle = oCol;
        ctx.stroke();
        halfW = rw / 2;
        halfH = rh / 2;
      } else if (shSub === 'ribbon_slanted') {
        var rbw = 330 * sRef;
        var rbh = 104 * sRef;
        ctx.transform(1, 0, Math.tan((-10 * Math.PI) / 180), 1, 0, 0);
        ctx.fillStyle = fCol;
        roundRectPath(ctx, -rbw / 2, -rbh / 2, rbw, rbh, 12 * sRef);
        ctx.fill();
        ctx.lineWidth = 6 * sRef;
        ctx.strokeStyle = oCol;
        ctx.stroke();
        halfW = rbw / 2 + 12 * sRef;
        halfH = rbh / 2;
      } else if (shSub === 'starburst') {
        var pts = 16;
        var rOut = 120 * sRef;
        var rIn = 86 * sRef;
        ctx.beginPath();
        for (var pi = 0; pi < pts * 2; pi++) {
          var radPt = pi % 2 === 0 ? rOut : rIn;
          var angPt = (pi / (pts * 2)) * Math.PI * 2;
          var px = Math.cos(angPt) * radPt;
          var py = Math.sin(angPt) * radPt;
          if (pi === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = fCol;
        ctx.fill();
        ctx.lineWidth = 6 * sRef;
        ctx.strokeStyle = oCol;
        ctx.lineJoin = 'round';
        ctx.stroke();
        halfW = rOut;
        halfH = rOut;
      } else if (shSub === 'speech_bubble') {
        var sbw = 270 * sRef;
        var sbh = 160 * sRef;
        var radB = 26 * sRef;
        ctx.beginPath();
        ctx.moveTo(-sbw / 2 + radB, -sbh / 2);
        ctx.lineTo(sbw / 2 - radB, -sbh / 2);
        ctx.quadraticCurveTo(sbw / 2, -sbh / 2, sbw / 2, -sbh / 2 + radB);
        ctx.lineTo(sbw / 2, sbh / 2 - radB);
        ctx.quadraticCurveTo(sbw / 2, sbh / 2, sbw / 2 - radB, sbh / 2);
        ctx.lineTo(-sbw * 0.1, sbh / 2);
        ctx.lineTo(-sbw * 0.28, sbh / 2 + 40 * sRef);
        ctx.lineTo(-sbw * 0.22, sbh / 2);
        ctx.lineTo(-sbw / 2 + radB, sbh / 2);
        ctx.quadraticCurveTo(-sbw / 2, sbh / 2, -sbw / 2, sbh / 2 - radB);
        ctx.lineTo(-sbw / 2, -sbh / 2 + radB);
        ctx.quadraticCurveTo(-sbw / 2, -sbh / 2, -sbw / 2 + radB, -sbh / 2);
        ctx.closePath();
        ctx.fillStyle = fCol;
        ctx.fill();
        ctx.lineWidth = 7 * sRef;
        ctx.strokeStyle = oCol;
        ctx.lineJoin = 'round';
        ctx.stroke();
        halfW = sbw / 2;
        halfH = sbh / 2 + 22 * sRef;
      } else if (shSub === 'neon_frame') {
        var nfw = 380 * sRef;
        var nfh = 240 * sRef;
        ctx.shadowColor = fCol;
        ctx.shadowBlur = 28 * sRef;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = fCol;
        ctx.lineWidth = 10 * sRef;
        roundRectPath(ctx, -nfw / 2, -nfh / 2, nfw, nfh, 20 * sRef);
        ctx.stroke();
        ctx.strokeStyle = oCol;
        ctx.lineWidth = 4 * sRef;
        ctx.stroke();
        halfW = nfw / 2 + 8 * sRef;
        halfH = nfh / 2 + 8 * sRef;
      } else {
        /* Focus Ring / Circle */
        var rad = 95 * sRef;
        if (shSub === 'circle_yellow') {
          var sg = ctx.createRadialGradient(0, 0, rad * 0.15, 0, 0, rad * 1.35);
          sg.addColorStop(0, 'rgba(250, 204, 21, 0.32)');
          sg.addColorStop(0.7, 'rgba(250, 204, 21, 0.08)');
          sg.addColorStop(1, 'rgba(250, 204, 21, 0)');
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(0, 0, rad * 1.35, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = oCol;
        ctx.lineWidth = 18 * sRef;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = fCol;
        ctx.lineWidth = 10 * sRef;
        ctx.stroke();
        halfW = rad * 1.15;
        halfH = rad * 1.15;
      }
      ctx.restore();
    } else if (layer.type === 'emoji') {
      var eSize = Math.round(128 * sRef);
      ctx.font = eSize + 'px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 16 * sRef;
      ctx.shadowOffsetY = 6 * sRef;
      ctx.fillText(layer.emoji || '🔥', 0, 0);
      halfW = eSize * 0.56;
      halfH = eSize * 0.56;
    }

    ctx.restore();

    var whw = halfW * sc;
    var whh = halfH * sc;
    var cosR = Math.cos(rotRad);
    var sinR = Math.sin(rotRad);
    function toWorld(lx, ly) {
      return {
        x: cx + lx * cosR - ly * sinR,
        y: cy + lx * sinR + ly * cosR,
      };
    }
    return {
      cx: cx,
      cy: cy,
      hw: whw,
      hh: whh,
      rotRad: rotRad,
      corners: [
        toWorld(-whw, -whh),
        toWorld(whw, -whh),
        toWorld(whw, whh),
        toWorld(-whw, whh),
      ],
      rotHandle: toWorld(0, -whh - 34 * sRef),
    };
  }

  function renderMainCanvas() {
    if (!tmMainCanvas) return;
    var d = getDim();
    if (tmMainCanvas.width !== d.w || tmMainCanvas.height !== d.h) {
      tmMainCanvas.width = d.w;
      tmMainCanvas.height = d.h;
    }
    var ctx = tmMainCanvas.getContext('2d');
    ctx.clearRect(0, 0, d.w, d.h);
    renderBackdrop(ctx, d.w, d.h);

    var sRef = getScaleRef();
    layerBoxes = {};
    for (var i = 0; i < state.layers.length; i++) {
      var L = state.layers[i];
      var box = measureAndDrawLayer(ctx, L, d.w, d.h, sRef);
      if (box) layerBoxes[L.id] = box;
    }
  }

  function renderOverlayCanvas() {
    if (!tmSafeOverlayCanvas) return;
    var d = getDim();
    if (tmSafeOverlayCanvas.width !== d.w || tmSafeOverlayCanvas.height !== d.h) {
      tmSafeOverlayCanvas.width = d.w;
      tmSafeOverlayCanvas.height = d.h;
    }
    var octx = tmSafeOverlayCanvas.getContext('2d');
    octx.clearRect(0, 0, d.w, d.h);
    if (state.isPeeking) return;

    var sRef = getScaleRef();
    var preset = getDim();

    if (state.showSafeZone) {
      octx.save();
      octx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      octx.lineWidth = Math.max(1.5, 2 * sRef);
      octx.setLineDash([10 * sRef, 8 * sRef]);
      octx.strokeRect(d.w * 0.04, d.h * 0.04, d.w * 0.92, d.h * 0.92);

      if (preset.type === '16:9') {
        var bw = d.w * 0.115;
        var bh = d.h * 0.095;
        var bx = d.w * 0.975 - bw;
        var by = d.h * 0.955 - bh;
        octx.setLineDash([]);
        octx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        roundRectPath(octx, bx, by, bw, bh, 8 * sRef);
        octx.fill();
        octx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
        octx.lineWidth = 2 * sRef;
        octx.stroke();

        octx.fillStyle = '#FACC15';
        octx.font = '800 ' + Math.round(24 * sRef) + 'px Cairo, sans-serif';
        octx.textAlign = 'center';
        octx.textBaseline = 'middle';
        octx.fillText('12:34', bx + bw / 2, by + bh / 2);
      } else if (preset.type === '9:16') {
        octx.setLineDash([8 * sRef, 6 * sRef]);
        octx.fillStyle = 'rgba(239, 68, 68, 0.16)';
        octx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
        octx.lineWidth = 2 * sRef;
        octx.fillRect(d.w * 0.83, d.h * 0.42, d.w * 0.15, d.h * 0.36);
        octx.strokeRect(d.w * 0.83, d.h * 0.42, d.w * 0.15, d.h * 0.36);
        octx.fillRect(d.w * 0.03, d.h * 0.79, d.w * 0.94, d.h * 0.18);
        octx.strokeRect(d.w * 0.03, d.h * 0.79, d.w * 0.94, d.h * 0.18);
      }
      octx.restore();
    }

    if (activeSnapX || activeSnapY) {
      octx.save();
      octx.strokeStyle = '#38BDF8';
      octx.lineWidth = 2 * sRef;
      octx.setLineDash([8 * sRef, 6 * sRef]);
      if (activeSnapX) { octx.beginPath(); octx.moveTo(d.w / 2, 0); octx.lineTo(d.w / 2, d.h); octx.stroke(); }
      if (activeSnapY) { octx.beginPath(); octx.moveTo(0, d.h / 2); octx.lineTo(d.w, d.h / 2); octx.stroke(); }
      octx.restore();
    }

    var selL = getSelectedLayer();
    var selBox = (selL && !selL.locked) ? layerBoxes[selL.id] : null;
    if (selBox) {
      octx.save();
      octx.strokeStyle = '#38BDF8';
      octx.lineWidth = Math.max(2, 3 * sRef);
      octx.beginPath();
      octx.moveTo(selBox.corners[0].x, selBox.corners[0].y);
      octx.lineTo(selBox.corners[1].x, selBox.corners[1].y);
      octx.lineTo(selBox.corners[2].x, selBox.corners[2].y);
      octx.lineTo(selBox.corners[3].x, selBox.corners[3].y);
      octx.closePath();
      octx.stroke();

      var topMidX = (selBox.corners[0].x + selBox.corners[1].x) / 2;
      var topMidY = (selBox.corners[0].y + selBox.corners[1].y) / 2;
      octx.beginPath();
      octx.moveTo(topMidX, topMidY);
      octx.lineTo(selBox.rotHandle.x, selBox.rotHandle.y);
      octx.stroke();

      var hR = Math.max(7, 9 * sRef);
      selBox.corners.forEach(function (pt) {
        octx.fillStyle = '#FFFFFF';
        octx.strokeStyle = '#1D4ED8';
        octx.lineWidth = 2.5 * sRef;
        octx.beginPath();
        octx.arc(pt.x, pt.y, hR, 0, Math.PI * 2);
        octx.fill();
        octx.stroke();
      });

      octx.fillStyle = '#FACC15';
      octx.strokeStyle = '#0F172A';
      octx.beginPath();
      octx.arc(selBox.rotHandle.x, selBox.rotHandle.y, hR * 1.1, 0, Math.PI * 2);
      octx.fill();
      octx.stroke();
      octx.restore();
    }
  }

  function renderAll() {
    renderMainCanvas();
    renderOverlayCanvas();
  }

  function scheduleRender() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      renderAll();
    });
  }

  /* ----- Categorized Font Picker Builder (Strict createElement + textContent) ----- */
  function populateFontMenu(selectedCss) {
    if (!tmFontMenu) return;
    while (tmFontMenu.firstChild) tmFontMenu.removeChild(tmFontMenu.firstChild);

    var curEntry = getFontEntry(selectedCss);
    if (tmFontTriggerLabel) {
      tmFontTriggerLabel.textContent = curEntry.label;
      tmFontTriggerLabel.style.fontFamily = curEntry.css;
      tmFontTriggerLabel.style.fontWeight = curEntry.weight;
    }

    var groups = [
      { key: 'ar', title: t('tm_fonts_ar_grp') },
      { key: 'en', title: t('tm_fonts_en_grp') },
    ];

    groups.forEach(function (grp) {
      var hdr = document.createElement('div');
      hdr.className = 'tm-font-group-hdr';
      hdr.textContent = grp.title;
      tmFontMenu.appendChild(hdr);

      FONT_LIBRARY.filter(function (f) { return f.group === grp.key; }).forEach(function (f) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tm-font-opt' + (f.id === curEntry.id ? ' active' : '');
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', f.id === curEntry.id ? 'true' : 'false');
        btn.style.fontFamily = f.css;
        btn.style.fontWeight = f.weight;

        var nameSpan = document.createElement('span');
        nameSpan.textContent = f.label;

        var sampleSpan = document.createElement('span');
        sampleSpan.className = 'tm-font-sample';
        sampleSpan.textContent = f.sample;

        btn.appendChild(nameSpan);
        btn.appendChild(sampleSpan);

        btn.addEventListener('click', function () {
          var L = getSelectedLayer();
          if (!L || L.type !== 'text') return;
          pushUndo();
          L.font = f.css;
          ensureFontLoaded(f);
          if (tmFontMenu) tmFontMenu.classList.add('hide');
          if (tmFontTrigger) tmFontTrigger.setAttribute('aria-expanded', 'false');
          populateFontMenu(L.font);
          renderAll();
        });

        tmFontMenu.appendChild(btn);
      });
    });
  }

  /* ----- UI Synchronization & Safe DOM Layer List ----- */
  function getSelectedLayer() {
    if (!state.selectedId) return null;
    return state.layers.find(function (l) { return l.id === state.selectedId; }) || null;
  }

  function getTargetImageLayer() {
    var sel = getSelectedLayer();
    if (isImageLayer(sel)) return sel;
    for (var i = state.layers.length - 1; i >= 0; i--) {
      if (isImageLayer(state.layers[i])) return state.layers[i];
    }
    return null;
  }

  function syncSizeButtons() {
    var d = getDim();
    aspectBtns.forEach(function (b) {
      var active = b.getAttribute('data-size') === state.sizeId;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (tmDimMeta) tmDimMeta.textContent = d.w + ' × ' + d.h + ' px';
  }

  function syncBgUI() {
    if (tmBgColor1) tmBgColor1.value = sanitizeHex(state.bg.c1, '#0F172A');
    if (tmBgColor2) tmBgColor2.value = sanitizeHex(state.bg.c2, '#1D4ED8');
    if (tmBgAngle) tmBgAngle.value = String(state.bg.angle);
    if (tmBgAngleVal) tmBgAngleVal.textContent = state.bg.angle + '°';
    if (tmBgBlur) tmBgBlur.value = String(state.bg.blur);
    if (tmBgBlurVal) tmBgBlurVal.textContent = state.bg.blur + ' px';
    if (tmBgVignette) tmBgVignette.value = String(state.bg.vignette);
    if (tmBgVignetteVal) tmBgVignetteVal.textContent = state.bg.vignette + '%';
    if (btnClearBgImg) btnClearBgImg.classList.toggle('hide', !bgAsset.img);
  }

  function syncImageDockControls() {
    var imgL = getTargetImageLayer();
    var asset = imgL ? imageAssets.get(imgL.assetId) : null;
    var hasImg = Boolean(imgL && asset && asset.img);

    if (tmImgTargetHint) {
      tmImgTargetHint.textContent = hasImg
        ? (t('tm_img_editing') + ': ' + (imgL.name || t('tm_ltype_image')))
        : t('tm_img_multi_note');
    }

    if (btnAutoCutoutSubject) btnAutoCutoutSubject.disabled = !hasImg || state.isProcessingAi;
    if (btnRestoreOrigSubject) {
      btnRestoreOrigSubject.classList.toggle('hide', !(hasImg && asset.hasCutout && imgL.useCutout));
    }

    var rad = hasImg ? clamp(imgL.cornerRadius || 0, 0, 50) : 0;
    var outW = hasImg ? clamp(imgL.outlinePx || 0, 0, 24) : 0;
    var outC = hasImg ? sanitizeHex(imgL.outlineColor, '#FFFFFF') : '#FFFFFF';
    var glW = hasImg ? clamp(imgL.glowBlur || 0, 0, 60) : 0;
    var glC = hasImg ? sanitizeHex(imgL.glowColor, '#38BDF8') : '#38BDF8';
    var shW = hasImg ? clamp(imgL.shadowBlur !== undefined ? imgL.shadowBlur : 12, 0, 48) : 12;

    if (tmImgRadius) { tmImgRadius.disabled = !hasImg; tmImgRadius.value = String(rad); }
    if (tmImgRadiusVal) tmImgRadiusVal.textContent = rad + '%';
    if (tmSubjOutline) { tmSubjOutline.disabled = !hasImg; tmSubjOutline.value = String(outW); }
    if (tmSubjOutlineVal) tmSubjOutlineVal.textContent = outW + ' px';
    if (tmSubjOutlineColor) { tmSubjOutlineColor.disabled = !hasImg; tmSubjOutlineColor.value = outC; }
    if (tmSubjGlow) { tmSubjGlow.disabled = !hasImg; tmSubjGlow.value = String(glW); }
    if (tmSubjGlowVal) tmSubjGlowVal.textContent = glW + ' px';
    if (tmSubjGlowColor) { tmSubjGlowColor.disabled = !hasImg; tmSubjGlowColor.value = glC; }
    if (tmImgShadow) { tmImgShadow.disabled = !hasImg; tmImgShadow.value = String(shW); }
    if (tmImgShadowVal) tmImgShadowVal.textContent = shW + ' px';

    /* Mirror into Right Inspector image controls */
    if (btnInspCutout) btnInspCutout.disabled = !hasImg || state.isProcessingAi;
    if (btnInspRestore) {
      btnInspRestore.classList.toggle('hide', !(hasImg && asset.hasCutout && imgL.useCutout));
    }
    if (tmInspImgRadius) tmInspImgRadius.value = String(rad);
    if (tmInspImgRadiusVal) tmInspImgRadiusVal.textContent = rad + '%';
    if (tmInspImgOutline) tmInspImgOutline.value = String(outW);
    if (tmInspImgOutlineVal) tmInspImgOutlineVal.textContent = outW + ' px';
    if (tmInspImgOutlineColor) tmInspImgOutlineColor.value = outC;
    if (tmInspImgGlow) tmInspImgGlow.value = String(glW);
    if (tmInspImgGlowVal) tmInspImgGlowVal.textContent = glW + ' px';
    if (tmInspImgGlowColor) tmInspImgGlowColor.value = glC;
    if (tmInspImgShadow) tmInspImgShadow.value = String(shW);
    if (tmInspImgShadowVal) tmInspImgShadowVal.textContent = shW + ' px';
  }

  function syncInspectorUI() {
    var L = getSelectedLayer();
    if (btnDupSelected) btnDupSelected.disabled = !L;
    if (btnDelSelected) btnDelSelected.disabled = !L;

    if (!L) {
      if (tmSelectedTypeTag) tmSelectedTypeTag.classList.add('hide');
      if (tmNoSelectionMsg) tmNoSelectionMsg.classList.remove('hide');
      if (tmTextProps) tmTextProps.classList.add('hide');
      if (tmImageProps) tmImageProps.classList.add('hide');
      if (tmBadgeProps) tmBadgeProps.classList.add('hide');
      if (tmVectorProps) tmVectorProps.classList.add('hide');
      if (tmTransformProps) tmTransformProps.classList.add('hide');
      syncImageDockControls();
      return;
    }

    if (tmNoSelectionMsg) tmNoSelectionMsg.classList.add('hide');
    if (tmTransformProps) tmTransformProps.classList.remove('hide');

    if (tmSelectedTypeTag) {
      tmSelectedTypeTag.classList.remove('hide');
      var typeKey = L.type === 'subject' ? 'tm_ltype_image' : (L.type === 'spotlight' ? 'tm_ltype_shape' : 'tm_ltype_' + L.type);
      tmSelectedTypeTag.textContent = t(typeKey);
    }

    if (tmTextProps) tmTextProps.classList.toggle('hide', L.type !== 'text');
    if (tmImageProps) tmImageProps.classList.toggle('hide', !isImageLayer(L));
    if (tmBadgeProps) tmBadgeProps.classList.toggle('hide', L.type !== 'badge');
    if (tmVectorProps) tmVectorProps.classList.toggle('hide', L.type !== 'arrow' && L.type !== 'shape' && L.type !== 'spotlight');
    if (tmSubjectQuickBtns) tmSubjectQuickBtns.classList.toggle('hide', !isImageLayer(L));

    if (L.type === 'text') {
      if (tmPropTextVal) tmPropTextVal.value = L.text || '';
      populateFontMenu(L.font);
      if (tmPropFontSize) tmPropFontSize.value = String(L.fontSize || 92);
      if (tmPropFill1) tmPropFill1.value = sanitizeHex(L.fill1, '#FFFFFF');
      if (tmPropFill2) tmPropFill2.value = sanitizeHex(L.fill2, '#FACC15');
      if (tmPropUseGrad) tmPropUseGrad.checked = Boolean(L.useGrad);
      if (tmPropStrokeW) tmPropStrokeW.value = String(L.strokeW !== undefined ? L.strokeW : 10);
      if (tmPropStrokeWVal) tmPropStrokeWVal.textContent = (L.strokeW !== undefined ? L.strokeW : 10) + ' px';
      if (tmPropStrokeColor) tmPropStrokeColor.value = sanitizeHex(L.strokeColor, '#090D16');
      if (tmPropShadow) tmPropShadow.value = String(L.shadowBlur !== undefined ? L.shadowBlur : 14);
      if (tmPropShadowVal) tmPropShadowVal.textContent = (L.shadowBlur !== undefined ? L.shadowBlur : 14) + ' px';
      if (tmPropBannerOn) tmPropBannerOn.checked = Boolean(L.bannerOn);
      if (tmBannerOpts) tmBannerOpts.classList.toggle('hide', !L.bannerOn);
      if (tmPropBannerColor) tmPropBannerColor.value = sanitizeHex(L.bannerColor, '#EF4444');
      if (tmPropBannerSkew) tmPropBannerSkew.value = String(L.bannerSkew !== undefined ? L.bannerSkew : -8);
    } else if (L.type === 'badge') {
      if (tmPropBadgeText) tmPropBadgeText.value = L.text || '';
      if (tmPropBadgeBg) tmPropBadgeBg.value = sanitizeHex(L.bgColor, '#EF4444');
      if (tmPropBadgeFg) tmPropBadgeFg.value = sanitizeHex(L.fgColor, '#FFFFFF');
    } else if (L.type === 'arrow' || L.type === 'shape' || L.type === 'spotlight') {
      if (tmPropVectorColor) tmPropVectorColor.value = sanitizeHex(L.color, '#EF4444');
      if (tmPropVectorStroke) tmPropVectorStroke.value = sanitizeHex(L.strokeColor, '#090D16');
    }

    if (tmPropScale) tmPropScale.value = String(Math.round((L.scale || 1) * 100));
    if (tmPropScaleVal) tmPropScaleVal.textContent = Math.round((L.scale || 1) * 100) + '%';
    if (tmPropRot) tmPropRot.value = String(Math.round(L.rot || 0));
    if (tmPropRotVal) tmPropRotVal.textContent = Math.round(L.rot || 0) + '°';
    if (tmPropOpacity) tmPropOpacity.value = String(Math.round(L.opacity !== undefined ? L.opacity : 100));
    if (tmPropOpacityVal) tmPropOpacityVal.textContent = Math.round(L.opacity !== undefined ? L.opacity : 100) + '%';

    syncImageDockControls();
  }

  /* Strict XSS-safe Layers Manager List using createElement + textContent only */
  function getLayerDisplayLabel(L) {
    if (L.type === 'text') return (L.text || '').replace(/\n/g, ' ').trim() || t('tm_ltype_text');
    if (L.type === 'badge') return L.text || t('tm_ltype_badge');
    if (L.type === 'emoji') return L.emoji || '🔥';
    if (isImageLayer(L)) return L.name || t('tm_ltype_image');
    if (L.type === 'arrow') return t('tm_ltype_arrow');
    if (L.type === 'shape' || L.type === 'spotlight') return t('tm_ltype_shape');
    return t('tm_layers_title');
  }

  function renderLayerList() {
    if (!tmLayerList) return;
    while (tmLayerList.firstChild) tmLayerList.removeChild(tmLayerList.firstChild);
    if (tmLayersCount) tmLayersCount.textContent = String(state.layers.length);

    for (var idx = state.layers.length - 1; idx >= 0; idx--) {
      (function (i) {
        var L = state.layers[i];
        var row = document.createElement('div');
        row.className = 'tm-layer-row' + (L.id === state.selectedId ? ' active' : '') + (L.locked ? ' is-locked' : '');

        var mainBtn = document.createElement('button');
        mainBtn.type = 'button';
        mainBtn.className = 'tm-layer-select';
        mainBtn.addEventListener('click', function () {
          state.selectedId = L.id;
          syncInspectorUI();
          renderLayerList();
          renderOverlayCanvas();
        });

        var kindKey = (L.type === 'subject' || L.type === 'image')
          ? 'tm_ltype_image'
          : (L.type === 'spotlight' || L.type === 'shape' ? 'tm_ltype_shape' : 'tm_ltype_' + L.type);

        var typePill = document.createElement('span');
        typePill.className = 'tm-layer-kind';
        typePill.textContent = t(kindKey);

        var nameSpan = document.createElement('span');
        nameSpan.className = 'tm-layer-name';
        nameSpan.textContent = getLayerDisplayLabel(L);

        mainBtn.appendChild(typePill);
        mainBtn.appendChild(nameSpan);

        var actions = document.createElement('div');
        actions.className = 'tm-layer-actions';

        function makeIconBtn(label, titleText, disabled, activeFlag, onClick) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'tm-lbtn' + (activeFlag ? ' is-on' : '');
          b.textContent = label;
          b.title = titleText;
          b.setAttribute('aria-label', titleText);
          b.disabled = Boolean(disabled);
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            onClick();
          });
          return b;
        }

        actions.appendChild(makeIconBtn(L.visible ? '●' : '○', t('tm_layer_vis'), false, false, function () {
          pushUndo();
          L.visible = !L.visible;
          renderLayerList();
          renderAll();
        }));
        actions.appendChild(makeIconBtn(L.locked ? '🔒' : '🔓', t('tm_layer_lock'), false, Boolean(L.locked), function () {
          pushUndo();
          L.locked = !L.locked;
          renderLayerList();
          renderOverlayCanvas();
        }));
        actions.appendChild(makeIconBtn('↑', t('tm_layer_up'), i === state.layers.length - 1, false, function () {
          pushUndo();
          var tmp = state.layers[i + 1];
          state.layers[i + 1] = L;
          state.layers[i] = tmp;
          renderLayerList();
          renderAll();
        }));
        actions.appendChild(makeIconBtn('↓', t('tm_layer_down'), i === 0, false, function () {
          pushUndo();
          var tmp = state.layers[i - 1];
          state.layers[i - 1] = L;
          state.layers[i] = tmp;
          renderLayerList();
          renderAll();
        }));
        actions.appendChild(makeIconBtn('⧉', t('tm_btn_dup'), false, false, function () {
          duplicateLayerById(L.id);
        }));
        actions.appendChild(makeIconBtn('×', t('tm_btn_delete'), false, false, function () {
          deleteLayerById(L.id);
        }));

        row.appendChild(mainBtn);
        row.appendChild(actions);
        tmLayerList.appendChild(row);
      })(idx);
    }
  }

  /* ----- Dock Tab Switching ----- */
  function setDockTab(tabName) {
    dockTabs.forEach(function (tab) {
      var active = tab.getAttribute('data-tab') === tabName;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    dockPanes.forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-pane') === tabName);
    });
  }

  dockTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      setDockTab(tab.getAttribute('data-tab'));
    });
  });

  /* ----- File Uploads (Unlimited Image/Logo/Sticker Layers & Custom Background) ----- */
  function loadSingleImageLayer(file, offsetIdx) {
    if (!validateFile(file)) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      revokeAssetUrl(url);
      if (!w || !h || w > MAX_IMAGE_DIM || h > MAX_IMAGE_DIM) {
        toast(t('pp_err_dims'), 'err');
        return;
      }

      var rawOrig = document.createElement('canvas');
      rawOrig.width = w;
      rawOrig.height = h;
      var octx = rawOrig.getContext('2d');
      octx.drawImage(img, 0, 0, w, h);
      var origData = octx.getImageData(0, 0, w, h);

      var assetId = 'A' + (nextAssetId++);
      var asset = {
        assetId: assetId,
        name: file.name || 'image.png',
        img: img,
        w: w,
        h: h,
        origData: origData,
        maskAlpha: null,
        hasCutout: false,
        rawOrigCanvas: rawOrig,
        rawCutoutCanvas: null,
      };
      imageAssets.set(assetId, asset);

      pushUndo();
      var imgLayer = createImageLayer(asset, offsetIdx || 0);
      state.layers.push(imgLayer);
      state.selectedId = imgLayer.id;
      syncInspectorUI();
      renderLayerList();
      renderAll();
      toast(t('tm_subj_loaded'), 'ok');
    };
    img.onerror = function () {
      revokeAssetUrl(url);
      toast(t('tc_img_load_err'), 'err');
    };
    img.src = url;
  }

  function loadImageFiles(fileList) {
    if (!fileList || !fileList.length) return;
    for (var i = 0; i < fileList.length; i++) {
      loadSingleImageLayer(fileList[i], i);
    }
  }

  function loadBackgroundFile(file) {
    if (!validateFile(file)) return;
    revokeAssetUrl(bgAsset.url);
    bgAsset.url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      revokeAssetUrl(bgAsset.url);
      bgAsset.url = null;
      if (!w || !h || w > MAX_IMAGE_DIM || h > MAX_IMAGE_DIM) {
        toast(t('pp_err_dims'), 'err');
        return;
      }
      bgAsset.img = img;
      bgBlurCacheKey = '';
      syncBgUI();
      renderAll();
      toast(t('tm_bg_loaded'), 'ok');
    };
    img.onerror = function () {
      revokeAssetUrl(bgAsset.url);
      bgAsset.url = null;
      toast(t('tc_img_load_err'), 'err');
    };
    img.src = bgAsset.url;
  }

  async function handleAutoRemoveImageBg() {
    var imgL = getTargetImageLayer();
    var asset = imgL ? imageAssets.get(imgL.assetId) : null;
    if (!imgL || !asset || !asset.img || !asset.origData) {
      toast(t('tm_need_subj'), 'err');
      return;
    }
    if (state.isProcessingAi) return;

    /* Fast reuse if this shared asset was already segmented */
    if (asset.hasCutout && asset.rawCutoutCanvas) {
      pushUndo();
      imgL.useCutout = true;
      state.selectedId = imgL.id;
      syncInspectorUI();
      renderLayerList();
      renderAll();
      toast(t('tm_cutout_ok'), 'ok');
      return;
    }

    state.isProcessingAi = true;
    syncImageDockControls();
    if (tmAiOverlay) tmAiOverlay.classList.remove('hide');
    if (tmAiStatus) tmAiStatus.textContent = t('tm_ai_working');

    try {
      if (preloadPromise) {
        await preloadPromise;
      } else {
        activeDevice = await detectPreferredDevice();
      }

      var inputBlob = await new Promise(function (resolve) {
        asset.rawOrigCanvas.toBlob(resolve, 'image/png');
      });

      var outBlob;
      try {
        outBlob = await removeBackground(inputBlob, getImglyConfig(activeDevice));
      } catch (gpuErr) {
        if (activeDevice === 'gpu') {
          activeDevice = 'cpu';
          outBlob = await removeBackground(inputBlob, getImglyConfig('cpu'));
        } else {
          throw gpuErr;
        }
      }

      var aiImg = await decodeBlobToImage(outBlob);

      pushUndo();
      asset.maskAlpha = extractSmoothMask(aiImg, asset.w, asset.h);
      asset.hasCutout = true;
      buildAssetCutoutCanvas(asset);
      imgL.useCutout = true;

      state.selectedId = imgL.id;
      syncInspectorUI();
      renderLayerList();
      renderAll();
      toast(t('tm_cutout_ok'), 'ok');
    } catch (err) {
      console.error('Thumbnail image AI cutout error:', err);
      toast(t('tc_removebg_fail'), 'err');
    } finally {
      state.isProcessingAi = false;
      if (tmAiOverlay) tmAiOverlay.classList.add('hide');
      syncImageDockControls();
    }
  }

  /* ----- Canvas Layer Selection, Move, Corner Scale, Rotate, Pinch/Twist ----- */
  function clientToCanvasCoords(clientX, clientY) {
    var rect = tmMainCanvas.getBoundingClientRect();
    var d = getDim();
    if (!rect.width || !rect.height) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) * (d.w / rect.width),
      y: (clientY - rect.top) * (d.h / rect.height),
    };
  }

  function pointInBox(px, py, box) {
    var dx = px - box.cx;
    var dy = py - box.cy;
    var cos = Math.cos(-box.rotRad);
    var sin = Math.sin(-box.rotRad);
    var lx = dx * cos - dy * sin;
    var ly = dx * sin + dy * cos;
    return Math.abs(lx) <= box.hw + 10 && Math.abs(ly) <= box.hh + 10;
  }

  function hitTestHandles(px, py) {
    var selL = getSelectedLayer();
    if (!selL || selL.locked) return null;
    var sel = layerBoxes[selL.id];
    if (!sel) return null;
    var hitRad = Math.max(22, 26 * getScaleRef());

    if (Math.hypot(px - sel.rotHandle.x, py - sel.rotHandle.y) <= hitRad) {
      return { action: 'rotate', id: selL.id };
    }
    for (var i = 0; i < sel.corners.length; i++) {
      if (Math.hypot(px - sel.corners[i].x, py - sel.corners[i].y) <= hitRad) {
        return { action: 'scale', id: selL.id };
      }
    }
    return null;
  }

  function hitTestLayer(px, py) {
    for (var i = state.layers.length - 1; i >= 0; i--) {
      var L = state.layers[i];
      if (!L.visible || L.locked) continue;
      var box = layerBoxes[L.id];
      if (box && pointInBox(px, py, box)) return L;
    }
    return null;
  }

  if (tmCanvasWrap) {
    tmCanvasWrap.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      canvasPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { tmCanvasWrap.setPointerCapture(e.pointerId); } catch (_err) {}

      if (canvasPointers.size === 2) {
        var L = getSelectedLayer();
        if (!L || L.locked) return;
        var pts = Array.from(canvasPointers.values());
        var p0 = clientToCanvasCoords(pts[0].x, pts[0].y);
        var p1 = clientToCanvasCoords(pts[1].x, pts[1].y);
        pushUndo();
        dragAction = 'pinch';
        dragStart = {
          dist: Math.max(10, Math.hypot(p1.x - p0.x, p1.y - p0.y)),
          angle: Math.atan2(p1.y - p0.y, p1.x - p0.x),
          midX: (p0.x + p1.x) / 2,
          midY: (p0.y + p1.y) / 2,
          scale: L.scale || 1,
          rot: L.rot || 0,
          nx: L.nx,
          ny: L.ny,
        };
        return;
      }

      var pt = clientToCanvasCoords(e.clientX, e.clientY);
      var handleHit = hitTestHandles(pt.x, pt.y);
      if (handleHit) {
        var selL = getSelectedLayer();
        var box = layerBoxes[selL.id];
        pushUndo();
        dragAction = handleHit.action;
        dragStart = {
          cx: box.cx,
          cy: box.cy,
          dist: Math.max(12, Math.hypot(pt.x - box.cx, pt.y - box.cy)),
          angle: Math.atan2(pt.y - box.cy, pt.x - box.cx),
          scale: selL.scale || 1,
          rot: selL.rot || 0,
        };
        return;
      }

      var hitL = hitTestLayer(pt.x, pt.y);
      if (hitL) {
        state.selectedId = hitL.id;
        syncInspectorUI();
        renderLayerList();
        renderOverlayCanvas();
        pushUndo();
        dragAction = 'move';
        dragStart = {
          px: pt.x,
          py: pt.y,
          nx: hitL.nx,
          ny: hitL.ny,
        };
      } else {
        state.selectedId = null;
        dragAction = null;
        syncInspectorUI();
        renderLayerList();
        renderOverlayCanvas();
      }
    });

    tmCanvasWrap.addEventListener('pointermove', function (e) {
      if (!canvasPointers.has(e.pointerId)) return;
      canvasPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      var L = getSelectedLayer();
      if (!L || L.locked || !dragAction || !dragStart) return;
      var d = getDim();

      if (canvasPointers.size === 2 && dragAction === 'pinch') {
        var pts = Array.from(canvasPointers.values());
        var p0 = clientToCanvasCoords(pts[0].x, pts[0].y);
        var p1 = clientToCanvasCoords(pts[1].x, pts[1].y);
        var dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        var ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        var midX = (p0.x + p1.x) / 2;
        var midY = (p0.y + p1.y) / 2;

        L.scale = clamp(dragStart.scale * (dist / dragStart.dist), 0.2, 2.8);
        L.rot = dragStart.rot + ((ang - dragStart.angle) * 180) / Math.PI;
        L.nx = dragStart.nx + (midX - dragStart.midX) / d.w;
        L.ny = dragStart.ny + (midY - dragStart.midY) / d.h;
        syncInspectorUI();
        scheduleRender();
        return;
      }

      var pt = clientToCanvasCoords(e.clientX, e.clientY);
      if (dragAction === 'move') {
        var nextNx = dragStart.nx + (pt.x - dragStart.px) / d.w;
        var nextNy = dragStart.ny + (pt.y - dragStart.py) / d.h;
        activeSnapX = Math.abs(nextNx - 0.5) < 0.014;
        activeSnapY = Math.abs(nextNy - 0.5) < 0.018;
        L.nx = activeSnapX ? 0.5 : clamp(nextNx, -0.2, 1.2);
        L.ny = activeSnapY ? 0.5 : clamp(nextNy, -0.2, 1.2);
        scheduleRender();
      } else if (dragAction === 'scale') {
        var curDist = Math.max(10, Math.hypot(pt.x - dragStart.cx, pt.y - dragStart.cy));
        L.scale = clamp(dragStart.scale * (curDist / dragStart.dist), 0.2, 2.8);
        syncInspectorUI();
        scheduleRender();
      } else if (dragAction === 'rotate') {
        var curAng = Math.atan2(pt.y - dragStart.cy, pt.x - dragStart.cx);
        var deg = dragStart.rot + ((curAng - dragStart.angle) * 180) / Math.PI;
        while (deg > 180) deg -= 360;
        while (deg < -180) deg += 360;
        L.rot = Math.round(deg);
        syncInspectorUI();
        scheduleRender();
      }
    });

    function endCanvasPointer(e) {
      canvasPointers.delete(e.pointerId);
      try { tmCanvasWrap.releasePointerCapture(e.pointerId); } catch (_err) {}
      if (canvasPointers.size === 0) {
        dragAction = null;
        dragStart = null;
        activeSnapX = false;
        activeSnapY = false;
        renderOverlayCanvas();
      }
    }
    tmCanvasWrap.addEventListener('pointerup', endCanvasPointer);
    tmCanvasWrap.addEventListener('pointercancel', endCanvasPointer);
  }

  /* ----- Actions: Add, Duplicate, Delete, Reset ----- */
  function duplicateLayerById(id) {
    var L = state.layers.find(function (item) { return item.id === id; });
    if (!L) return;
    pushUndo();
    var copy = Object.assign({}, L, {
      id: 'L' + (nextLayerId++),
      nx: clamp(L.nx + 0.04, 0.05, 0.95),
      ny: clamp(L.ny + 0.05, 0.05, 0.95),
      locked: false,
    });
    state.layers.push(copy);
    state.selectedId = copy.id;
    syncInspectorUI();
    renderLayerList();
    renderAll();
  }

  function deleteLayerById(id) {
    var idx = state.layers.findIndex(function (l) { return l.id === id; });
    if (idx < 0) return;
    pushUndo();
    state.layers.splice(idx, 1);
    state.selectedId = state.layers.length ? state.layers[Math.min(idx, state.layers.length - 1)].id : null;
    syncInspectorUI();
    renderLayerList();
    renderAll();
  }

  function addHeadlineAndFocus() {
    pushUndo();
    var L = createTextLayer({
      text: isArabicUI() ? 'نص بارز هنا' : 'BIG HOOK TEXT',
      font: isArabicUI() ? 'cairo' : 'montserrat',
      nx: 0.42,
      ny: 0.35 + ((state.layers.length % 3) * 0.1),
    });
    state.layers.push(L);
    state.selectedId = L.id;
    syncInspectorUI();
    renderLayerList();
    renderAll();
    if (tmPropTextVal) {
      tmPropTextVal.focus();
      tmPropTextVal.select();
    }
  }

  /* ----- Live YouTube Feed Preview Modal (100% Client-Side Procedural Sample Cards) ----- */
  function generateSampleFeedThumbData(themeIndex, titleStr, pillStr) {
    var c = document.createElement('canvas');
    c.width = 480;
    c.height = 270;
    var ctx = c.getContext('2d');
    var palettes = [
      ['#0F172A', '#3B82F6', '#FACC15'],
      ['#1E1B4B', '#EC4899', '#FFFFFF'],
      ['#064E3B', '#10B981', '#FEF08A'],
      ['#450A0A', '#EF4444', '#FFFFFF'],
      ['#1F2937', '#F59E0B', '#FFFFFF'],
    ];
    var pal = palettes[themeIndex % palettes.length];
    var g = ctx.createLinearGradient(0, 0, 480, 270);
    g.addColorStop(0, pal[0]);
    g.addColorStop(1, pal[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 480, 270);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(380, 120, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pal[2];
    ctx.font = '900 38px Cairo, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText(titleStr, 28, 125);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    roundRectPath(ctx, 28, 175, 116, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 18px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pillStr, 86, 194);

    var url = c.toDataURL('image/jpeg', 0.85);
    cleanupCanvas(c);
    return url;
  }

  function renderYouTubeFeed() {
    if (!tmYtGrid) return;
    renderMainCanvas();
    var userDataUrl = tmMainCanvas.toDataURL('image/jpeg', 0.92);

    while (tmYtGrid.firstChild) tmYtGrid.removeChild(tmYtGrid.firstChild);

    if (tmFeedStage) {
      tmFeedStage.classList.toggle('is-dark', state.feedTheme === 'dark');
      tmFeedStage.classList.toggle('is-light', state.feedTheme === 'light');
      tmFeedStage.classList.toggle('is-desktop', state.feedDevice === 'desktop');
      tmFeedStage.classList.toggle('is-mobile', state.feedDevice === 'mobile');
    }

    var userTitle = (tmFeedTitleInput && tmFeedTitleInput.value.trim()) || t('tm_feed_default_title');
    var userChannel = (tmFeedChannelInput && tmFeedChannelInput.value.trim()) || t('tm_feed_default_chan');
    var ar = isArabicUI();

    var cards = [
      {
        isUser: true,
        img: userDataUrl,
        title: userTitle,
        channel: userChannel,
        meta: ar ? '142 ألف مشاهدة · قبل ساعتين' : '142K views · 2 hours ago',
        dur: '12:34',
        avatarBg: '#1A5FFF',
        initials: userChannel.slice(0, 2).toUpperCase(),
      },
      {
        isUser: false,
        img: generateSampleFeedThumbData(0, ar ? 'أسرار المونتاج' : 'PRO EDITING', '4K HDR'),
        title: ar ? '٥ أسرار تجعل فيديوهاتك تتصدر المقترحات بسرعة' : '5 Editing Habits That Keep Viewers Watching to the End',
        channel: ar ? 'أكاديمية الصناع' : 'Creator Lab',
        meta: ar ? '89 ألف مشاهدة · قبل يوم' : '89K views · 1 day ago',
        dur: '09:42',
        avatarBg: '#0EA5E9',
        initials: 'CL',
      },
      {
        isUser: false,
        img: generateSampleFeedThumbData(1, ar ? 'تجربة جديدة' : 'WAIT FOR IT', '2026'),
        title: ar ? 'اختبرنا أقوى إعدادات التصوير والمقارنة كانت مفاجئة' : 'We Tested Every Studio Setup So You Do Not Have To',
        channel: ar ? 'تك بالعربي' : 'Tech Pulse',
        meta: ar ? '310 ألف مشاهدة · قبل 3 أيام' : '310K views · 3 days ago',
        dur: '16:18',
        avatarBg: '#DB2777',
        initials: 'TP',
      },
    ];

    for (var i = 0; i < cards.length; i++) {
      var item = cards[i];
      var cardEl = document.createElement('article');
      cardEl.className = 'tm-yt-card' + (item.isUser ? ' is-yours' : '');

      var thumbBox = document.createElement('div');
      thumbBox.className = 'tm-yt-thumb';
      var imgEl = document.createElement('img');
      imgEl.src = item.img;
      imgEl.alt = item.title;
      var durSpan = document.createElement('span');
      durSpan.className = 'tm-yt-dur';
      durSpan.textContent = item.dur;
      thumbBox.appendChild(imgEl);
      thumbBox.appendChild(durSpan);

      if (item.isUser) {
        var yourTag = document.createElement('span');
        yourTag.className = 'tm-yt-yours-tag';
        yourTag.textContent = t('tm_feed_yours');
        thumbBox.appendChild(yourTag);
      }

      var infoRow = document.createElement('div');
      infoRow.className = 'tm-yt-info';
      var av = document.createElement('div');
      av.className = 'tm-yt-avatar';
      av.style.background = item.avatarBg;
      av.textContent = item.initials;

      var txtCol = document.createElement('div');
      txtCol.className = 'tm-yt-txt';
      var h3 = document.createElement('h3');
      h3.textContent = item.title;
      var ch = document.createElement('span');
      ch.className = 'tm-yt-meta';
      ch.textContent = item.channel;
      var mt = document.createElement('span');
      mt.className = 'tm-yt-meta';
      mt.textContent = item.meta;

      txtCol.appendChild(h3);
      txtCol.appendChild(ch);
      txtCol.appendChild(mt);
      infoRow.appendChild(av);
      infoRow.appendChild(txtCol);

      cardEl.appendChild(thumbBox);
      cardEl.appendChild(infoRow);
      tmYtGrid.appendChild(cardEl);
    }
  }

  function setPeeking(active) {
    state.isPeeking = Boolean(active);
    renderAll();
  }

  function openExportModal() {
    if (!tmExportModal) return;
    tmExportModal.classList.remove('hide');
  }

  function closeExportModal() {
    if (!tmExportModal) return;
    tmExportModal.classList.add('hide');
  }

  function openFeedModal() {
    if (!tmFeedModal) return;
    state.isPeeking = false;
    tmFeedModal.classList.remove('hide');
    renderYouTubeFeed();
  }

  function closeFeedModal() {
    if (!tmFeedModal) return;
    tmFeedModal.classList.add('hide');
  }

  /* ----- Export PNG / JPG / Clipboard ----- */
  function exportThumbnail() {
    state.isPeeking = false;
    renderMainCanvas();
    var d = getDim();
    var fmt = state.exportFormat === 'jpg' ? 'jpg' : 'png';
    var mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
    var qual = fmt === 'jpg' ? clamp(state.jpgQuality, 70, 100) / 100 : 1.0;
    var fname = sanitizeFilename(tmExportName ? tmExportName.value : 'thumbnail') + '_' + d.slug + '.' + fmt;

    if (typeof I.downloadCanvas === 'function') {
      I.downloadCanvas(
        tmMainCanvas,
        fname,
        mime,
        qual,
        function () { toast(t('tm_export_ok'), 'ok'); },
        function () { toast(t('tm_export_err'), 'err'); }
      );
    } else {
      tmMainCanvas.toBlob(function (blob) {
        if (!blob) {
          toast(t('tm_export_err'), 'err');
          return;
        }
        var u = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = u;
        a.download = fname;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          if (a.parentNode) a.parentNode.removeChild(a);
          revokeAssetUrl(u);
        }, 2000);
        toast(t('tm_export_ok'), 'ok');
      }, mime, qual);
    }
  }

  function copyThumbnailToClipboard() {
    renderMainCanvas();
    if (!navigator.clipboard || typeof window.ClipboardItem !== 'function') {
      toast(t('tm_copy_unsupported'), 'err');
      return;
    }
    tmMainCanvas.toBlob(async function (blob) {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
        toast(t('tm_copy_ok'), 'ok');
      } catch (_err) {
        toast(t('tm_copy_unsupported'), 'err');
      }
    }, 'image/png');
  }

  /* ----- Event Wiring ----- */
  aspectBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-size');
      if (!PLATFORM_SIZES[id] || id === state.sizeId) return;
      pushUndo();
      state.sizeId = id;
      bgBlurCacheKey = '';
      syncSizeButtons();
      renderAll();
    });
  });

  tplCards.forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTemplate(btn.getAttribute('data-template'), true);
    });
  });

  if (btnToggleSafeZone) {
    btnToggleSafeZone.addEventListener('click', function () {
      state.showSafeZone = !state.showSafeZone;
      btnToggleSafeZone.classList.toggle('active', state.showSafeZone);
      btnToggleSafeZone.setAttribute('aria-pressed', state.showSafeZone ? 'true' : 'false');
      renderOverlayCanvas();
    });
  }

  if (btnOpenFeedPreview) btnOpenFeedPreview.addEventListener('click', openFeedModal);
  if (btnCloseFeedModal) btnCloseFeedModal.addEventListener('click', closeFeedModal);
  if (tmFeedModal) {
    tmFeedModal.addEventListener('click', function (e) {
      if (e.target === tmFeedModal) closeFeedModal();
    });
  }
  if (btnOpenExportModal) btnOpenExportModal.addEventListener('click', openExportModal);
  if (btnCloseExportModal) btnCloseExportModal.addEventListener('click', closeExportModal);
  if (tmExportModal) {
    tmExportModal.addEventListener('click', function (e) {
      if (e.target === tmExportModal) closeExportModal();
    });
  }
  feedDeviceBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.feedDevice = b.getAttribute('data-feed-device') === 'mobile' ? 'mobile' : 'desktop';
      feedDeviceBtns.forEach(function (x) { x.classList.toggle('active', x === b); });
      renderYouTubeFeed();
    });
  });
  feedThemeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.feedTheme = b.getAttribute('data-feed-theme') === 'light' ? 'light' : 'dark';
      feedThemeBtns.forEach(function (x) { x.classList.toggle('active', x === b); });
      renderYouTubeFeed();
    });
  });
  if (tmFeedTitleInput) tmFeedTitleInput.addEventListener('input', renderYouTubeFeed);
  if (tmFeedChannelInput) tmFeedChannelInput.addEventListener('input', renderYouTubeFeed);

  /* Background Events */
  if (tmBgColor1) tmBgColor1.addEventListener('input', function () { state.bg.c1 = sanitizeHex(tmBgColor1.value); scheduleRender(); });
  if (tmBgColor2) tmBgColor2.addEventListener('input', function () { state.bg.c2 = sanitizeHex(tmBgColor2.value); scheduleRender(); });
  if (tmBgAngle) {
    tmBgAngle.addEventListener('input', function () {
      state.bg.angle = clamp(parseInt(tmBgAngle.value, 10) || 135, 0, 360);
      if (tmBgAngleVal) tmBgAngleVal.textContent = state.bg.angle + '°';
      scheduleRender();
    });
  }
  bgPresetChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      pushUndo();
      var parts = (chip.getAttribute('data-bg') || '').split(',');
      state.bg.c1 = sanitizeHex(parts[0], '#0F172A');
      state.bg.c2 = sanitizeHex(parts[1], '#1D4ED8');
      syncBgUI();
      renderAll();
    });
  });
  if (btnUploadBgImg && tmBgInput) btnUploadBgImg.addEventListener('click', function () { tmBgInput.click(); });
  if (tmBgInput) {
    tmBgInput.addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) loadBackgroundFile(e.target.files[0]);
      tmBgInput.value = '';
    });
  }
  if (btnClearBgImg) {
    btnClearBgImg.addEventListener('click', function () {
      bgAsset.img = null;
      revokeAssetUrl(bgAsset.url);
      bgAsset.url = null;
      bgBlurCacheKey = '';
      if (tmBgInput) tmBgInput.value = '';
      syncBgUI();
      renderAll();
    });
  }
  if (tmBgBlur) {
    tmBgBlur.addEventListener('input', function () {
      state.bg.blur = clamp(parseInt(tmBgBlur.value, 10) || 0, 0, 24);
      if (tmBgBlurVal) tmBgBlurVal.textContent = state.bg.blur + ' px';
      scheduleRender();
    });
  }
  if (tmBgVignette) {
    tmBgVignette.addEventListener('input', function () {
      state.bg.vignette = clamp(parseInt(tmBgVignette.value, 10) || 0, 0, 90);
      if (tmBgVignetteVal) tmBgVignetteVal.textContent = state.bg.vignette + '%';
      scheduleRender();
    });
  }

  /* Multi-Image Upload, AI Cutout & Frame/Outline/Glow/Shadow Events */
  if (btnUploadSubject && tmSubjInput) btnUploadSubject.addEventListener('click', function () { tmSubjInput.click(); });
  if (tmSubjInput) {
    tmSubjInput.addEventListener('change', function (e) {
      if (e.target.files && e.target.files.length) loadImageFiles(e.target.files);
      tmSubjInput.value = '';
    });
  }

  function restoreTargetImageOrig() {
    var imgL = getTargetImageLayer();
    if (!imgL) return;
    pushUndo();
    imgL.useCutout = false;
    syncImageDockControls();
    renderAll();
  }

  if (btnAutoCutoutSubject) btnAutoCutoutSubject.addEventListener('click', handleAutoRemoveImageBg);
  if (btnInspCutout) btnInspCutout.addEventListener('click', handleAutoRemoveImageBg);
  if (btnRestoreOrigSubject) btnRestoreOrigSubject.addEventListener('click', restoreTargetImageOrig);
  if (btnInspRestore) btnInspRestore.addEventListener('click', restoreTargetImageOrig);

  function updateTargetImageProp(prop, val) {
    var imgL = getTargetImageLayer();
    if (!imgL) return;
    imgL[prop] = val;
    syncImageDockControls();
    scheduleRender();
  }

  [tmImgRadius, tmInspImgRadius].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', function () {
      updateTargetImageProp('cornerRadius', clamp(parseInt(el.value, 10) || 0, 0, 50));
    });
  });
  [tmSubjOutline, tmInspImgOutline].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', function () {
      updateTargetImageProp('outlinePx', clamp(parseInt(el.value, 10) || 0, 0, 24));
    });
  });
  [tmSubjOutlineColor, tmInspImgOutlineColor].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', function () {
      updateTargetImageProp('outlineColor', sanitizeHex(el.value, '#FFFFFF'));
    });
  });
  $$('[data-subj-outline]').forEach(function (sw) {
    sw.addEventListener('click', function () {
      var imgL = getTargetImageLayer();
      if (!imgL) return;
      imgL.outlineColor = sanitizeHex(sw.getAttribute('data-subj-outline'), '#FFFFFF');
      if (!imgL.outlinePx) imgL.outlinePx = 8;
      syncImageDockControls();
      renderAll();
    });
  });
  [tmSubjGlow, tmInspImgGlow].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', function () {
      updateTargetImageProp('glowBlur', clamp(parseInt(el.value, 10) || 0, 0, 60));
    });
  });
  [tmSubjGlowColor, tmInspImgGlowColor].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', function () {
      updateTargetImageProp('glowColor', sanitizeHex(el.value, '#38BDF8'));
    });
  });
  $$('[data-subj-glow]').forEach(function (sw) {
    sw.addEventListener('click', function () {
      var imgL = getTargetImageLayer();
      if (!imgL) return;
      imgL.glowColor = sanitizeHex(sw.getAttribute('data-subj-glow'), '#38BDF8');
      if (!imgL.glowBlur) imgL.glowBlur = 24;
      syncImageDockControls();
      renderAll();
    });
  });
  [tmImgShadow, tmInspImgShadow].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', function () {
      updateTargetImageProp('shadowBlur', clamp(parseInt(el.value, 10) || 0, 0, 48));
    });
  });

  /* Add CTR Arrows, Shapes, Badges, Emojis & Text */
  if (btnAddHeadline) btnAddHeadline.addEventListener('click', addHeadlineAndFocus);
  ctrBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      pushUndo();
      var item = createCtrLayer(b.getAttribute('data-add-ctr'), 0.52, 0.52);
      state.layers.push(item);
      state.selectedId = item.id;
      syncInspectorUI();
      renderLayerList();
      renderAll();
    });
  });
  shapeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      pushUndo();
      var item = createShapeLayer(b.getAttribute('data-add-shape'), 0.50, 0.50);
      state.layers.push(item);
      state.selectedId = item.id;
      syncInspectorUI();
      renderLayerList();
      renderAll();
    });
  });
  badgeChips.forEach(function (b) {
    b.addEventListener('click', function () {
      pushUndo();
      var parts = (b.getAttribute('data-add-badge') || 'NEW|#EF4444|#FFFFFF').split('|');
      var item = createBadgeLayer(parts[0], parts[1], parts[2], 0.25, 0.25);
      state.layers.push(item);
      state.selectedId = item.id;
      syncInspectorUI();
      renderLayerList();
      renderAll();
    });
  });
  emojiBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      pushUndo();
      var item = createEmojiLayer(b.getAttribute('data-add-emoji'), 0.65, 0.35);
      state.layers.push(item);
      state.selectedId = item.id;
      syncInspectorUI();
      renderLayerList();
      renderAll();
    });
  });

  /* Categorized Font Dropdown Toggle */
  if (tmFontTrigger && tmFontMenu) {
    tmFontTrigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var opening = tmFontMenu.classList.contains('hide');
      tmFontMenu.classList.toggle('hide', !opening);
      tmFontTrigger.setAttribute('aria-expanded', opening ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (tmFontPicker && !tmFontPicker.contains(e.target) && !tmFontMenu.classList.contains('hide')) {
        tmFontMenu.classList.add('hide');
        tmFontTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* Selected Layer Inspector Bindings */
  if (tmPropTextVal) {
    tmPropTextVal.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      L.text = tmPropTextVal.value;
      renderLayerList();
      scheduleRender();
    });
  }
  if (tmPropFontSize) {
    tmPropFontSize.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      L.fontSize = clamp(parseInt(tmPropFontSize.value, 10) || 92, 24, 240);
      scheduleRender();
    });
  }
  if (btnTextCenter) {
    btnTextCenter.addEventListener('click', function () {
      var L = getSelectedLayer();
      if (!L) return;
      pushUndo();
      L.nx = 0.5;
      renderAll();
    });
  }
  if (tmPropFill1) {
    tmPropFill1.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      L.fill1 = sanitizeHex(tmPropFill1.value, '#FFFFFF');
      scheduleRender();
    });
  }
  if (tmPropFill2) {
    tmPropFill2.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      L.fill2 = sanitizeHex(tmPropFill2.value, '#FACC15');
      scheduleRender();
    });
  }
  if (tmPropUseGrad) {
    tmPropUseGrad.addEventListener('change', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      pushUndo();
      L.useGrad = Boolean(tmPropUseGrad.checked);
      renderAll();
    });
  }
  if (tmPropStrokeW) {
    tmPropStrokeW.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      L.strokeW = clamp(parseInt(tmPropStrokeW.value, 10) || 0, 0, 28);
      if (tmPropStrokeWVal) tmPropStrokeWVal.textContent = L.strokeW + ' px';
      scheduleRender();
    });
  }
  if (tmPropStrokeColor) {
    tmPropStrokeColor.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      L.strokeColor = sanitizeHex(tmPropStrokeColor.value, '#090D16');
      scheduleRender();
    });
  }
  if (tmPropShadow) {
    tmPropShadow.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      L.shadowBlur = clamp(parseInt(tmPropShadow.value, 10) || 0, 0, 40);
      if (tmPropShadowVal) tmPropShadowVal.textContent = L.shadowBlur + ' px';
      scheduleRender();
    });
  }
  if (tmPropBannerOn) {
    tmPropBannerOn.addEventListener('change', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      pushUndo();
      L.bannerOn = Boolean(tmPropBannerOn.checked);
      if (tmBannerOpts) tmBannerOpts.classList.toggle('hide', !L.bannerOn);
      renderAll();
    });
  }
  if (tmPropBannerColor) {
    tmPropBannerColor.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      L.bannerColor = sanitizeHex(tmPropBannerColor.value, '#EF4444');
      scheduleRender();
    });
  }
  if (tmPropBannerSkew) {
    tmPropBannerSkew.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'text') return;
      L.bannerSkew = clamp(parseInt(tmPropBannerSkew.value, 10) || 0, -20, 20);
      scheduleRender();
    });
  }

  if (tmPropBadgeText) {
    tmPropBadgeText.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'badge') return;
      L.text = tmPropBadgeText.value;
      renderLayerList();
      scheduleRender();
    });
  }
  if (tmPropBadgeBg) {
    tmPropBadgeBg.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'badge') return;
      L.bgColor = sanitizeHex(tmPropBadgeBg.value, '#EF4444');
      scheduleRender();
    });
  }
  if (tmPropBadgeFg) {
    tmPropBadgeFg.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || L.type !== 'badge') return;
      L.fgColor = sanitizeHex(tmPropBadgeFg.value, '#FFFFFF');
      scheduleRender();
    });
  }

  if (tmPropVectorColor) {
    tmPropVectorColor.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || (L.type !== 'arrow' && L.type !== 'shape' && L.type !== 'spotlight')) return;
      L.color = sanitizeHex(tmPropVectorColor.value, '#EF4444');
      scheduleRender();
    });
  }
  if (tmPropVectorStroke) {
    tmPropVectorStroke.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L || (L.type !== 'arrow' && L.type !== 'shape' && L.type !== 'spotlight')) return;
      L.strokeColor = sanitizeHex(tmPropVectorStroke.value, '#090D16');
      scheduleRender();
    });
  }
  if (btnFlipLayer) {
    btnFlipLayer.addEventListener('click', function () {
      var L = getSelectedLayer();
      if (!L) return;
      pushUndo();
      L.flipH = !L.flipH;
      renderAll();
    });
  }
  if (btnSubjFlipH) {
    btnSubjFlipH.addEventListener('click', function () {
      var L = getSelectedLayer();
      if (!L) return;
      pushUndo();
      L.flipH = !L.flipH;
      renderAll();
    });
  }
  if (btnSubjCenter) {
    btnSubjCenter.addEventListener('click', function () {
      var L = getSelectedLayer();
      if (!L) return;
      pushUndo();
      L.nx = 0.5;
      L.ny = 0.5;
      renderAll();
    });
  }

  if (tmPropScale) {
    tmPropScale.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L) return;
      var val = clamp(parseInt(tmPropScale.value, 10) || 100, 20, 280);
      L.scale = val / 100;
      if (tmPropScaleVal) tmPropScaleVal.textContent = val + '%';
      scheduleRender();
    });
  }
  if (tmPropRot) {
    tmPropRot.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L) return;
      var deg = clamp(parseInt(tmPropRot.value, 10) || 0, -180, 180);
      L.rot = deg;
      if (tmPropRotVal) tmPropRotVal.textContent = deg + '°';
      scheduleRender();
    });
  }
  if (tmPropOpacity) {
    tmPropOpacity.addEventListener('input', function () {
      var L = getSelectedLayer();
      if (!L) return;
      var op = clamp(parseInt(tmPropOpacity.value, 10) || 100, 10, 100);
      L.opacity = op;
      if (tmPropOpacityVal) tmPropOpacityVal.textContent = op + '%';
      scheduleRender();
    });
  }

  /* Export & Footer Buttons */
  exportFmtRadios.forEach(function (r) {
    r.addEventListener('change', function () {
      if (r.checked) {
        state.exportFormat = r.value === 'jpg' ? 'jpg' : 'png';
        if (tmJpgQualWrap) tmJpgQualWrap.classList.toggle('hide', state.exportFormat !== 'jpg');
      }
    });
  });
  if (tmJpgQualWrap) tmJpgQualWrap.classList.add('hide');
  if (tmJpgQuality) {
    tmJpgQuality.addEventListener('input', function () {
      state.jpgQuality = clamp(parseInt(tmJpgQuality.value, 10) || 94, 70, 100);
      if (tmJpgQualityVal) tmJpgQualityVal.textContent = state.jpgQuality + '%';
    });
  }

  if (btnDownloadThumb) btnDownloadThumb.addEventListener('click', exportThumbnail);
  if (btnCopyThumb) btnCopyThumb.addEventListener('click', copyThumbnailToClipboard);

  if (btnUndo) btnUndo.addEventListener('click', handleUndo);
  if (btnRedo) btnRedo.addEventListener('click', handleRedo);
  if (btnDupSelected) {
    btnDupSelected.addEventListener('click', function () {
      if (state.selectedId) duplicateLayerById(state.selectedId);
    });
  }
  if (btnDelSelected) {
    btnDelSelected.addEventListener('click', function () {
      if (state.selectedId) deleteLayerById(state.selectedId);
    });
  }
  if (btnResetStudio) {
    btnResetStudio.addEventListener('click', function () {
      applyTemplate(state.templateId || 'tech', true);
      toast(t('tc_reset'), 'ok');
    });
  }

  /* Mobile Quickbar Wiring */
  if (btnMqAddText) btnMqAddText.addEventListener('click', addHeadlineAndFocus);
  if (btnMqSubject) {
    btnMqSubject.addEventListener('click', function () {
      setDockTab('subject');
      if (tmSubjInput) tmSubjInput.click();
    });
  }
  if (btnMqFeed) btnMqFeed.addEventListener('click', openFeedModal);
  if (btnMqUndo) btnMqUndo.addEventListener('click', handleUndo);
  if (btnMqDownload) btnMqDownload.addEventListener('click', openExportModal);

  /* Stage Drag & Drop / Clipboard Paste for Adding Images */
  if (tmViewport) {
    tmViewport.addEventListener('dragover', function (e) {
      e.preventDefault();
      tmViewport.classList.add('is-dragover');
    });
    tmViewport.addEventListener('dragleave', function () {
      tmViewport.classList.remove('is-dragover');
    });
    tmViewport.addEventListener('drop', function (e) {
      e.preventDefault();
      tmViewport.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        loadImageFiles(e.dataTransfer.files);
      }
    });
  }

  document.addEventListener('paste', function (e) {
    var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length) {
      loadImageFiles(e.clipboardData.files);
    }
  });

  /* Keyboard Shortcuts (EN & AR layout-independent via e.code) */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (tmFontMenu && !tmFontMenu.classList.contains('hide')) {
        tmFontMenu.classList.add('hide');
        if (tmFontTrigger) tmFontTrigger.setAttribute('aria-expanded', 'false');
        return;
      }
      if (tmExportModal && !tmExportModal.classList.contains('hide')) {
        closeExportModal();
        return;
      }
      if (tmFeedModal && !tmFeedModal.classList.contains('hide')) {
        closeFeedModal();
        return;
      }
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
    if (mod && (lowerKey === 'd' || code === 'KeyD')) {
      e.preventDefault();
      if (state.selectedId) duplicateLayerById(state.selectedId);
      return;
    }
    if (mod && (lowerKey === 'z' || code === 'KeyZ')) {
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
      return;
    }
    if (mod && (lowerKey === 'y' || code === 'KeyY')) {
      e.preventDefault();
      handleRedo();
      return;
    }

    if (code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) setPeeking(true);
      return;
    }

    if (!mod && (lowerKey === 'p' || code === 'KeyP')) {
      e.preventDefault();
      if (tmFeedModal && !tmFeedModal.classList.contains('hide')) closeFeedModal();
      else openFeedModal();
      return;
    }

    var L = getSelectedLayer();
    if (!L) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      deleteLayerById(L.id);
      return;
    }

    if (L.locked) return;

    var stepPx = e.shiftKey ? 10 : 1;
    var d = getDim();
    if (e.key === 'ArrowLeft') { e.preventDefault(); L.nx -= stepPx / d.w; scheduleRender(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); L.nx += stepPx / d.w; scheduleRender(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); L.ny -= stepPx / d.h; scheduleRender(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); L.ny += stepPx / d.h; scheduleRender(); }
  });

  document.addEventListener('keyup', function (e) {
    if ((e.code === 'Space' || e.key === ' ') && state.isPeeking) {
      e.preventDefault();
      setPeeking(false);
    }
  });

  window.addEventListener('blur', function () {
    if (state.isPeeking) setPeeking(false);
  });

  /* Language Switch & Unload Cleanup */
  document.addEventListener('imgsfix:langchange', function () {
    syncDocumentMeta();
    syncInspectorUI();
    renderLayerList();
  });

  window.addEventListener('beforeunload', function () {
    revokeAssetUrl(bgAsset.url);
    cleanupCanvas(bgBlurCacheCanvas);
    imageAssets.forEach(function (a) {
      cleanupCanvas(a.rawOrigCanvas);
      cleanupCanvas(a.rawCutoutCanvas);
    });
    layerCompCache.forEach(function (c) {
      cleanupCanvas(c.canvas);
    });
    imageAssets.clear();
    layerCompCache.clear();
  });

  function consumeYtHandoff() {
    var raw = '';
    try {
      raw = sessionStorage.getItem('imgsfix_yt_thumb_handoff') || '';
      if (raw) sessionStorage.removeItem('imgsfix_yt_thumb_handoff');
    } catch (_e) {
      return;
    }
    if (!raw) return;
    var payload;
    try {
      payload = JSON.parse(raw);
    } catch (_e) {
      return;
    }
    if (!payload || typeof payload.dataUrl !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/i.test(payload.dataUrl)) {
      return;
    }
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      if (!w || !h || w > MAX_IMAGE_DIM || h > MAX_IMAGE_DIM) return;
      revokeAssetUrl(bgAsset.url);
      bgAsset.url = null;
      bgAsset.img = img;
      bgBlurCacheKey = '';
      if (state.sizeId !== 'yt_hd' && state.sizeId !== 'yt_fhd') {
        state.sizeId = 'yt_hd';
        syncSizeButtons();
      }
      syncBgUI();
      renderAll();
      toast(t('tm_bg_loaded'), 'ok');
    };
    img.src = payload.dataUrl;
  }

  /* ----- Boot ----- */
  syncDocumentMeta();
  syncSizeButtons();
  applyTemplate('tech', false);
  syncImageDockControls();
  syncUndoButtons();
  startSilentPreload();
  consumeYtHandoff();
})();

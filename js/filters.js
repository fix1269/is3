/* imgsfix — filters.js
   60fps Photographic & Cinematic Color-Grading Studio (100% Client-Side):
   - 18 curated photographic & cinematic presets with live bilingual EN/AR thumbnail grid
   - GPU-accelerated Canvas 2D compositing + cached heavy passes (Teal & Orange, Sharpen)
     coalesced on requestAnimationFrame for smooth 60fps slider feedback
   - 5 fine-tuning sliders: Filter Intensity (0..100%), Brightness (-50..+50),
     Contrast (-50..+50), Saturation (-50..+50), and radial Vignette (0..100%)
   - Interactive Before/After comparison slider (#baWrap) + Advanced Editor bridge support
   - Original-format full-resolution export (JPG, WebP, PNG) at 0.92 quality
*/

(function () {
  'use strict';

  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  /* ----- Constants ----- */
  var MAX_FILE_BYTES = 50 * 1024 * 1024;
  var MAX_DIMENSION = 16384;
  var MAX_PIXELS = 64000000;
  var MAX_WORK_DIM = 1280;
  var THUMB_W = 120;
  var THUMB_H = 75;
  var EXPORT_QUALITY = 0.92;

  /* ----- 18 Photographic & Cinematic Presets ----- */
  var PRESETS = [
    { id: 'original',    key: 'tc_fp_original',    filter: 'none' },
    { id: 'grayscale',   key: 'tc_fp_grayscale',   filter: 'grayscale(100%) contrast(106%)' },
    { id: 'sepia',       key: 'tc_fp_sepia',       filter: 'sepia(92%) contrast(104%) brightness(102%)' },
    { id: 'vintage',     key: 'tc_fp_vintage',     filter: 'sepia(46%) contrast(94%) brightness(103%) saturate(86%)', overlay: 'rgba(253, 230, 185, 0.14)', blend: 'soft-light' },
    { id: 'cool',        key: 'tc_fp_cool',        filter: 'contrast(105%) saturate(108%) brightness(102%)', overlay: 'rgba(56, 189, 248, 0.18)', blend: 'soft-light' },
    { id: 'warm',        key: 'tc_fp_warm',        filter: 'sepia(20%) saturate(122%) brightness(103%)', overlay: 'rgba(249, 115, 22, 0.14)', blend: 'soft-light' },
    { id: 'vivid',       key: 'tc_fp_vivid',       filter: 'saturate(156%) contrast(116%) brightness(102%)' },
    { id: 'noir',        key: 'tc_fp_noir',        filter: 'grayscale(100%) contrast(148%) brightness(92%)', extraVignette: 0.34 },
    { id: 'faded',       key: 'tc_fp_faded',       filter: 'contrast(84%) brightness(108%) saturate(74%)', overlay: 'rgba(226, 232, 240, 0.16)', blend: 'lighten' },
    { id: 'invert',      key: 'tc_fp_invert',      filter: 'invert(100%)' },
    { id: 'blur',        key: 'tc_fp_blur',        blurRatio: 0.008 },
    { id: 'sharpen',     key: 'tc_fp_sharpen',     pixelPass: 'sharpen', filter: 'contrast(110%) saturate(106%)' },
    { id: 'golden_hour', key: 'tc_fp_golden_hour', filter: 'brightness(106%) contrast(106%) saturate(126%) sepia(22%)', sunGlow: true },
    { id: 'teal_orange', key: 'tc_fp_teal_orange', pixelPass: 'teal_orange', filter: 'contrast(114%) saturate(114%)' },
    { id: 'dramatic',    key: 'tc_fp_dramatic',    filter: 'contrast(138%) brightness(94%) saturate(112%)', extraVignette: 0.25 },
    { id: 'soft_pastel', key: 'tc_fp_soft_pastel', filter: 'brightness(110%) contrast(88%) saturate(88%)', overlay: 'rgba(244, 214, 255, 0.18)', blend: 'screen' },
    { id: 'retro_film',  key: 'tc_fp_retro_film',  filter: 'sepia(26%) contrast(108%) brightness(101%) saturate(112%)', overlay: 'rgba(251, 191, 36, 0.12)', blend: 'soft-light', shadowLift: 'rgba(18, 28, 36, 0.12)' },
    { id: 'bright_airy', key: 'tc_fp_bright_airy', filter: 'brightness(112%) contrast(96%) saturate(108%)' }
  ];

  /* ----- DOM references ----- */
  var filterGrid = $('#filterGrid');
  var intensityEl = $('#intensity');
  var intValEl = $('#intVal');
  var brightnessEl = $('#brightness');
  var brightValEl = $('#brightVal');
  var contrastEl = $('#contrast');
  var contrastValEl = $('#contrastVal');
  var saturationEl = $('#saturation');
  var satValEl = $('#satVal');
  var vignetteEl = $('#vignette');
  var vigValEl = $('#vigVal');
  var btnNoFilter = $('#btnNoFilter');
  var btnApply = $('#btnApply');

  var emptyState = $('#emptyState');
  var dropZone = $('#dropZone');
  var fileInput = $('#fileInput');
  var btnUpload = $('#btnUpload');
  var baWrap = $('#baWrap');
  var beforeCanvas = $('#beforeCanvas');
  var afterCanvas = $('#afterCanvas');
  var progressEl = $('#progress');
  var progressText = $('#progressText');
  var resultActions = $('#resultActions');
  var infoBar = $('#infoBar');

  var btnDownload = $('#btnDownload');
  var btnReset = $('#btnReset');
  var btnClear = $('#btnClear');

  /* ----- State ----- */
  var originalFile = null;
  var originalImage = null;
  var objectUrl = null;
  var currentFileName = 'image';
  var loadSeq = 0;

  var activePreset = 'original';
  var intensity = 100;
  var brightness = 0;
  var contrast = 0;
  var saturation = 0;
  var vignette = 0;

  var workCanvas = document.createElement('canvas');
  var layerCanvas = document.createElement('canvas');
  var stageCanvas = document.createElement('canvas');
  var samplePhotoCanvas = null;
  var presetCache = {};
  var thumbCards = {};
  var rafId = 0;
  var sliderDragging = false;
  var ctxFilterSupported = null;

  /* ----- Helpers ----- */
  function clamp255(v) {
    return v < 0 ? 0 : (v > 255 ? 255 : (v | 0));
  }

  function supportsCtxFilter() {
    if (ctxFilterSupported !== null) return ctxFilterSupported;
    try {
      var testC = document.createElement('canvas');
      var tctx = testC.getContext('2d');
      tctx.filter = 'brightness(110%)';
      ctxFilterSupported = (tctx.filter === 'brightness(110%)');
    } catch (_e) {
      ctxFilterSupported = false;
    }
    return ctxFilterSupported;
  }

  function sanitizeFilenameBase(name) {
    var base = String(name || 'image').replace(/\.[^.]+$/, '');
    base = base.replace(/[\/\\:*?"<>|\x00-\x1F]+/g, '_').replace(/^\.+|\.+$/g, '').trim();
    return base || 'image';
  }

  function getOriginalExt(file) {
    var f = file || originalFile;
    var name = f ? (f.name || '') : '';
    var m = name.match(/\.([a-zA-Z0-9]+)$/);
    var ext = m ? m[1].toLowerCase() : '';
    if (ext) return ext;
    var mime = f ? f.type : '';
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/webp') return 'webp';
    return 'png';
  }

  function getOriginalMime(file) {
    var f = file || originalFile;
    if (f && /^image\/(jpeg|png|webp|gif|bmp|avif)$/i.test(f.type)) {
      return f.type.toLowerCase();
    }
    var ext = getOriginalExt(f);
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'bmp') return 'image/bmp';
    if (ext === 'avif') return 'image/avif';
    return '';
  }

  function getExportFormat() {
    var origMime = getOriginalMime(originalFile);
    var origExt = getOriginalExt(originalFile);
    if (origMime === 'image/jpeg') {
      return { mime: 'image/jpeg', ext: origExt === 'jpeg' ? 'jpeg' : 'jpg' };
    }
    if (origMime === 'image/webp' || origMime === 'image/avif') {
      return { mime: 'image/webp', ext: 'webp' };
    }
    return { mime: 'image/png', ext: 'png' };
  }

  function validateFile(file) {
    if (!file) return false;
    var mime = getOriginalMime(file);
    if (!mime) {
      toast(t('tc_img_only'), 'err');
      return false;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast(t('tc_file_too_large'), 'err');
      return false;
    }
    return true;
  }

  function revokeObjectUrl() {
    if (objectUrl) {
      try { URL.revokeObjectURL(objectUrl); } catch (_e) { /* noop */ }
      objectUrl = null;
    }
  }

  function clearPresetCache() {
    Object.keys(presetCache).forEach(function (k) {
      var c = presetCache[k];
      if (c) {
        c.width = 0;
        c.height = 0;
      }
    });
    presetCache = {};
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / 1024 / 1024).toFixed(2) + 'MB';
  }

  /* ----- Lightweight Scenic Canvas Sample (Zero External Files) ----- */
  function createSamplePhotoCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var ctx = c.getContext('2d');

    /* Sunset sky gradient with cool zenith and warm horizon */
    var sky = ctx.createLinearGradient(0, 0, 0, h * 0.68);
    sky.addColorStop(0, '#1d4ed8');
    sky.addColorStop(0.45, '#60a5fa');
    sky.addColorStop(0.82, '#fdba74');
    sky.addColorStop(1, '#fde047');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    /* Warm sun + atmospheric glow */
    var glow = ctx.createRadialGradient(w * 0.68, h * 0.42, 2, w * 0.68, h * 0.42, w * 0.34);
    glow.addColorStop(0, 'rgba(255, 251, 235, 0.96)');
    glow.addColorStop(0.28, 'rgba(253, 224, 71, 0.58)');
    glow.addColorStop(1, 'rgba(253, 186, 116, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.arc(w * 0.68, h * 0.42, Math.min(w, h) * 0.11, 0, Math.PI * 2);
    ctx.fill();

    /* Far misty ridge */
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.64);
    ctx.lineTo(w * 0.24, h * 0.46);
    ctx.lineTo(w * 0.46, h * 0.58);
    ctx.lineTo(w * 0.74, h * 0.43);
    ctx.lineTo(w, h * 0.56);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    /* Rich foreground emerald hills */
    var hillGrad = ctx.createLinearGradient(0, h * 0.52, 0, h);
    hillGrad.addColorStop(0, '#15803d');
    hillGrad.addColorStop(1, '#064e3b');
    ctx.fillStyle = hillGrad;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.62);
    ctx.quadraticCurveTo(w * 0.28, h * 0.54, w * 0.55, h * 0.66);
    ctx.quadraticCurveTo(w * 0.80, h * 0.58, w, h * 0.66);
    ctx.lineTo(w, h * 0.75);
    ctx.lineTo(0, h * 0.75);
    ctx.closePath();
    ctx.fill();

    /* Mirror lake water + sun shimmer */
    var water = ctx.createLinearGradient(0, h * 0.68, 0, h);
    water.addColorStop(0, '#0284c7');
    water.addColorStop(0.55, '#0369a1');
    water.addColorStop(1, '#0f172a');
    ctx.fillStyle = water;
    ctx.fillRect(0, h * 0.68, w, h * 0.32);

    ctx.fillStyle = 'rgba(254, 240, 138, 0.58)';
    for (var row = 0; row < 5; row++) {
      var ry = h * (0.72 + row * 0.055);
      var rw = w * (0.16 - row * 0.02);
      ctx.fillRect(w * 0.68 - rw / 2, ry, rw, 2.2);
    }

    return c;
  }

  /* ----- Fast Pixel Grading Passes (Cached Once Per Image for 60fps Dragging) ----- */
  function buildSharpenCanvas(srcCanvas) {
    var w = srcCanvas.width;
    var h = srcCanvas.height;
    var out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    var octx = out.getContext('2d');
    octx.drawImage(srcCanvas, 0, 0);

    var imgData = octx.getImageData(0, 0, w, h);
    var src = imgData.data;
    var dst = new Uint8ClampedArray(src.length);
    var amount = 0.55;

    for (var y = 0; y < h; y++) {
      var yPrev = y > 0 ? y - 1 : 0;
      var yNext = y < h - 1 ? y + 1 : h - 1;
      for (var x = 0; x < w; x++) {
        var xPrev = x > 0 ? x - 1 : 0;
        var xNext = x < w - 1 ? x + 1 : w - 1;
        var idx = (y * w + x) * 4;
        var up = (yPrev * w + x) * 4;
        var dn = (yNext * w + x) * 4;
        var lf = (y * w + xPrev) * 4;
        var rt = (y * w + xNext) * 4;

        for (var ch = 0; ch < 3; ch++) {
          var lap = 4 * src[idx + ch] - src[up + ch] - src[dn + ch] - src[lf + ch] - src[rt + ch];
          dst[idx + ch] = clamp255(src[idx + ch] + lap * amount);
        }
        dst[idx + 3] = src[idx + 3];
      }
    }
    octx.putImageData(new ImageData(dst, w, h), 0, 0);
    return out;
  }

  function buildTealOrangeCanvas(srcCanvas) {
    var w = srcCanvas.width;
    var h = srcCanvas.height;
    var out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    var octx = out.getContext('2d');
    octx.drawImage(srcCanvas, 0, 0);

    var imgData = octx.getImageData(0, 0, w, h);
    var d = imgData.data;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      /* Split-tone LUT: Teal shadows (lum < 0.5), Warm Orange highlights (lum >= 0.5) */
      var shadowW = lum < 0.52 ? (0.52 - lum) / 0.52 : 0;
      var highW = lum > 0.42 ? (lum - 0.42) / 0.58 : 0;

      r = r - shadowW * 26 + highW * 30;
      g = g + shadowW * 12 + highW * 8;
      b = b + shadowW * 32 - highW * 28;

      /* Punchy cinematic contrast curve around midpoint */
      r = (r - 128) * 1.12 + 128;
      g = (g - 128) * 1.10 + 128;
      b = (b - 128) * 1.12 + 128;

      d[i] = clamp255(r);
      d[i + 1] = clamp255(g);
      d[i + 2] = clamp255(b);
    }
    octx.putImageData(imgData, 0, 0);
    return out;
  }

  function getCachedPixelPreset(srcCanvas, presetId, cacheObj) {
    if (cacheObj && cacheObj[presetId]) return cacheObj[presetId];
    var built = (presetId === 'sharpen')
      ? buildSharpenCanvas(srcCanvas)
      : buildTealOrangeCanvas(srcCanvas);
    if (cacheObj) cacheObj[presetId] = built;
    return built;
  }

  /* ----- Software Pixel Fallback (Only if ctx.filter unsupported) ----- */
  function applyCssFilterFallback(canvas, filterStr) {
    if (!filterStr || filterStr === 'none') return;
    var w = canvas.width, h = canvas.height;
    var ctx = canvas.getContext('2d');
    var imgData = ctx.getImageData(0, 0, w, h);
    var d = imgData.data;

    var grayM = (filterStr.match(/grayscale\((\d+(?:\.\d+)?)%\)/) || [])[1];
    var sepM = (filterStr.match(/sepia\((\d+(?:\.\d+)?)%\)/) || [])[1];
    var invM = (filterStr.match(/invert\((\d+(?:\.\d+)?)%\)/) || [])[1];
    var brM = (filterStr.match(/brightness\((\d+(?:\.\d+)?)%\)/) || [])[1];
    var ctM = (filterStr.match(/contrast\((\d+(?:\.\d+)?)%\)/) || [])[1];
    var stM = (filterStr.match(/saturate\((\d+(?:\.\d+)?)%\)/) || [])[1];

    var gAmt = grayM ? parseFloat(grayM) / 100 : 0;
    var sepAmt = sepM ? parseFloat(sepM) / 100 : 0;
    var invAmt = invM ? parseFloat(invM) / 100 : 0;
    var brMul = brM ? parseFloat(brM) / 100 : 1;
    var ctMul = ctM ? parseFloat(ctM) / 100 : 1;
    var stMul = stM ? parseFloat(stM) / 100 : 1;

    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      if (gAmt > 0) {
        var lg = 0.299 * r + 0.587 * g + 0.114 * b;
        r = r * (1 - gAmt) + lg * gAmt;
        g = g * (1 - gAmt) + lg * gAmt;
        b = b * (1 - gAmt) + lg * gAmt;
      }
      if (sepAmt > 0) {
        var sr = 0.393 * r + 0.769 * g + 0.189 * b;
        var sg = 0.349 * r + 0.686 * g + 0.168 * b;
        var sb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = r * (1 - sepAmt) + sr * sepAmt;
        g = g * (1 - sepAmt) + sg * sepAmt;
        b = b * (1 - sepAmt) + sb * sepAmt;
      }
      if (invAmt > 0) {
        r = r * (1 - invAmt) + (255 - r) * invAmt;
        g = g * (1 - invAmt) + (255 - g) * invAmt;
        b = b * (1 - invAmt) + (255 - b) * invAmt;
      }
      r *= brMul; g *= brMul; b *= brMul;
      r = (r - 128) * ctMul + 128;
      g = (g - 128) * ctMul + 128;
      b = (b - 128) * ctMul + 128;
      if (stMul !== 1) {
        var ls = 0.299 * r + 0.587 * g + 0.114 * b;
        r = ls + (r - ls) * stMul;
        g = ls + (g - ls) * stMul;
        b = ls + (b - ls) * stMul;
      }
      d[i] = clamp255(r);
      d[i + 1] = clamp255(g);
      d[i + 2] = clamp255(b);
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function applyAdjustmentsFallback(canvas, bShift, cShift, sShift) {
    if (bShift === 0 && cShift === 0 && sShift === 0) return;
    var str = 'brightness(' + (100 + bShift).toFixed(0) + '%) contrast(' + (100 + cShift).toFixed(0) + '%) saturate(' + Math.max(0, 100 + sShift).toFixed(0) + '%)';
    applyCssFilterFallback(canvas, str);
  }

  /* ----- Unified GPU-Accelerated Grading Renderer (Thumbnails, Preview & Full-Res Export) ----- */
  function renderGradedFrame(srcCanvas, outCanvas, presetId, opts, cacheObj, scratchStage, scratchLayer) {
    var w = srcCanvas.width;
    var h = srcCanvas.height;
    if (!w || !h) return;

    var def = PRESETS.find(function (p) { return p.id === presetId; }) || PRESETS[0];
    var k = Math.max(0, Math.min(1, (opts.intensity !== undefined ? opts.intensity : 100) / 100));
    var b = opts.brightness || 0;
    var c = opts.contrast || 0;
    var s = opts.saturation || 0;
    var vig = Math.max(0, Math.min(1, (opts.vignette || 0) / 100));

    if (outCanvas.width !== w || outCanvas.height !== h) {
      outCanvas.width = w;
      outCanvas.height = h;
    }
    var stg = scratchStage || document.createElement('canvas');
    if (stg.width !== w || stg.height !== h) {
      stg.width = w;
      stg.height = h;
    }
    var stgCtx = stg.getContext('2d');
    stgCtx.clearRect(0, 0, w, h);

    /* 1. Draw base photo onto intermediate stage */
    stgCtx.globalCompositeOperation = 'source-over';
    stgCtx.globalAlpha = 1;
    stgCtx.filter = 'none';
    stgCtx.drawImage(srcCanvas, 0, 0, w, h);

    /* 2. Composite selected preset blended at k (0..1) */
    if (def.id !== 'original' && k > 0.001) {
      var lyr = scratchLayer || document.createElement('canvas');
      if (lyr.width !== w || lyr.height !== h) {
        lyr.width = w;
        lyr.height = h;
      }
      var lyrCtx = lyr.getContext('2d');
      lyrCtx.clearRect(0, 0, w, h);
      lyrCtx.globalCompositeOperation = 'source-over';
      lyrCtx.globalAlpha = 1;

      var presetSrc = def.pixelPass
        ? getCachedPixelPreset(srcCanvas, def.pixelPass, cacheObj)
        : srcCanvas;

      var filterParts = [];
      if (def.filter && def.filter !== 'none') filterParts.push(def.filter);
      if (def.blurRatio) {
        var blurPx = Math.max(0.8, Math.min(w, h) * def.blurRatio);
        filterParts.push('blur(' + blurPx.toFixed(1) + 'px)');
      }

      var joinedFilter = filterParts.join(' ');
      var hasFilter = filterParts.length > 0 && supportsCtxFilter();
      lyrCtx.filter = hasFilter ? joinedFilter : 'none';
      lyrCtx.drawImage(presetSrc, 0, 0, w, h);
      lyrCtx.filter = 'none';
      if (filterParts.length > 0 && !hasFilter) {
        applyCssFilterFallback(lyr, joinedFilter);
      }

      /* Subtle tonal wash / lighting overlays */
      if (def.overlay) {
        lyrCtx.save();
        lyrCtx.globalCompositeOperation = def.blend || 'soft-light';
        lyrCtx.fillStyle = def.overlay;
        lyrCtx.fillRect(0, 0, w, h);
        lyrCtx.restore();
      }

      if (def.shadowLift) {
        lyrCtx.save();
        lyrCtx.globalCompositeOperation = 'lighten';
        lyrCtx.fillStyle = def.shadowLift;
        lyrCtx.fillRect(0, 0, w, h);
        lyrCtx.restore();
      }

      if (def.sunGlow) {
        lyrCtx.save();
        lyrCtx.globalCompositeOperation = 'screen';
        var sun = lyrCtx.createRadialGradient(w * 0.78, h * 0.16, 0, w * 0.78, h * 0.16, Math.max(w, h) * 0.9);
        sun.addColorStop(0, 'rgba(255, 224, 130, 0.42)');
        sun.addColorStop(0.45, 'rgba(251, 146, 60, 0.22)');
        sun.addColorStop(1, 'rgba(251, 146, 60, 0)');
        lyrCtx.fillStyle = sun;
        lyrCtx.fillRect(0, 0, w, h);
        lyrCtx.restore();
      }

      stgCtx.save();
      stgCtx.globalAlpha = k;
      stgCtx.drawImage(lyr, 0, 0, w, h);
      stgCtx.restore();

      if (!scratchLayer) {
        lyr.width = 0;
        lyr.height = 0;
      }
    }

    /* 3. Apply fine-tune Brightness, Contrast, Saturation in a single GPU pass onto outCanvas */
    var outCtx = outCanvas.getContext('2d');
    outCtx.clearRect(0, 0, w, h);
    outCtx.globalCompositeOperation = 'source-over';
    outCtx.globalAlpha = 1;

    var adjParts = [];
    if (b !== 0) adjParts.push('brightness(' + (100 + b * 1.4).toFixed(0) + '%)');
    if (c !== 0) adjParts.push('contrast(' + (100 + c * 1.4).toFixed(0) + '%)');
    if (s !== 0) adjParts.push('saturate(' + Math.max(0, 100 + s * 1.8).toFixed(0) + '%)');

    if (adjParts.length > 0 && supportsCtxFilter()) {
      outCtx.filter = adjParts.join(' ');
      outCtx.drawImage(stg, 0, 0, w, h);
      outCtx.filter = 'none';
    } else {
      outCtx.filter = 'none';
      outCtx.drawImage(stg, 0, 0, w, h);
      if (adjParts.length > 0) {
        applyAdjustmentsFallback(outCanvas, b * 1.4, c * 1.4, s * 1.8);
      }
    }

    /* 4. Apply radial Vignette (user Vignette slider + subtle preset cinematic vignette) */
    var totalVig = Math.min(0.92, vig * 0.85 + ((def.extraVignette || 0) * k * (1 - vig * 0.4)));
    if (totalVig > 0.005) {
      var cx = w * 0.5;
      var cy = h * 0.5;
      var innerR = Math.min(w, h) * 0.28;
      var outerR = Math.hypot(cx, cy) * 1.05;
      var vigGrad = outCtx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(0.58, 'rgba(6, 8, 15, ' + (totalVig * 0.25).toFixed(3) + ')');
      vigGrad.addColorStop(1, 'rgba(3, 5, 10, ' + totalVig.toFixed(3) + ')');
      outCtx.save();
      outCtx.fillStyle = vigGrad;
      outCtx.fillRect(0, 0, w, h);
      outCtx.restore();
    }

    if (!scratchStage) {
      stg.width = 0;
      stg.height = 0;
    }
  }

  /* ----- Thumbnail Gallery Construction & Rendering ----- */
  function buildPresetGallery() {
    if (!filterGrid) return;
    while (filterGrid.firstChild) filterGrid.removeChild(filterGrid.firstChild);
    thumbCards = {};

    PRESETS.forEach(function (p) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-preset-card' + (p.id === activePreset ? ' active' : '');
      btn.setAttribute('data-preset', p.id);
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', p.id === activePreset ? 'true' : 'false');

      var thumbCanvas = document.createElement('canvas');
      thumbCanvas.className = 'filter-preset-thumb';
      thumbCanvas.width = THUMB_W;
      thumbCanvas.height = THUMB_H;

      var label = document.createElement('span');
      label.className = 'filter-preset-name';
      label.setAttribute('data-i18n', p.key);
      label.textContent = t(p.key);

      btn.appendChild(thumbCanvas);
      btn.appendChild(label);

      btn.addEventListener('click', function () {
        selectPreset(p.id);
      });

      filterGrid.appendChild(btn);
      thumbCards[p.id] = { btn: btn, canvas: thumbCanvas };
    });
  }

  function renderAllThumbnails(sourceCanvasOrImg) {
    var srcEl = sourceCanvasOrImg;
    if (!srcEl) {
      if (!samplePhotoCanvas) {
        samplePhotoCanvas = createSamplePhotoCanvas(THUMB_W * 2, THUMB_H * 2);
      }
      srcEl = samplePhotoCanvas;
    }

    var sw = srcEl.naturalWidth || srcEl.width || THUMB_W;
    var sh = srcEl.naturalHeight || srcEl.height || THUMB_H;
    var scale = Math.max(THUMB_W / sw, THUMB_H / sh);
    var drawW = sw * scale;
    var drawH = sh * scale;
    var dx = (THUMB_W - drawW) / 2;
    var dy = (THUMB_H - drawH) / 2;

    var baseThumb = document.createElement('canvas');
    baseThumb.width = THUMB_W;
    baseThumb.height = THUMB_H;
    var bctx = baseThumb.getContext('2d');
    bctx.imageSmoothingEnabled = true;
    bctx.imageSmoothingQuality = 'high';
    bctx.drawImage(srcEl, dx, dy, drawW, drawH);

    var thumbCache = {};
    var tStage = document.createElement('canvas');
    var tLayer = document.createElement('canvas');

    PRESETS.forEach(function (p) {
      var card = thumbCards[p.id];
      if (!card || !card.canvas) return;
      renderGradedFrame(
        baseThumb,
        card.canvas,
        p.id,
        { intensity: 100, brightness: 0, contrast: 0, saturation: 0, vignette: 0 },
        thumbCache,
        tStage,
        tLayer
      );
    });

    Object.keys(thumbCache).forEach(function (k) {
      if (thumbCache[k]) {
        thumbCache[k].width = 0;
        thumbCache[k].height = 0;
      }
    });
    baseThumb.width = 0; baseThumb.height = 0;
    tStage.width = 0; tStage.height = 0;
    tLayer.width = 0; tLayer.height = 0;
  }

  function syncPresetCardsUI() {
    PRESETS.forEach(function (p) {
      var card = thumbCards[p.id];
      if (!card || !card.btn) return;
      var isAct = p.id === activePreset;
      card.btn.classList.toggle('active', isAct);
      card.btn.setAttribute('aria-checked', isAct ? 'true' : 'false');
    });
  }

  function syncSlidersUI() {
    if (intensityEl) intensityEl.value = String(intensity);
    if (intValEl) intValEl.textContent = intensity + '%';
    if (brightnessEl) brightnessEl.value = String(brightness);
    if (brightValEl) brightValEl.textContent = (brightness > 0 ? '+' : '') + brightness;
    if (contrastEl) contrastEl.value = String(contrast);
    if (contrastValEl) contrastValEl.textContent = (contrast > 0 ? '+' : '') + contrast;
    if (saturationEl) saturationEl.value = String(saturation);
    if (satValEl) satValEl.textContent = (saturation > 0 ? '+' : '') + saturation;
    if (vignetteEl) vignetteEl.value = String(vignette);
    if (vigValEl) vigValEl.textContent = vignette + '%';
  }

  function renderPreviewNow(showToastMsg) {
    if (!originalImage || !afterCanvas || !workCanvas.width) return;
    renderGradedFrame(
      workCanvas,
      afterCanvas,
      activePreset,
      {
        intensity: intensity,
        brightness: brightness,
        contrast: contrast,
        saturation: saturation,
        vignette: vignette
      },
      presetCache,
      stageCanvas,
      layerCanvas
    );
    if (showToastMsg) {
      toast(t('tc_done'), 'ok');
    }
  }

  function scheduleRender() {
    if (!originalImage) return;
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      renderPreviewNow(false);
    });
  }

  function selectPreset(presetId) {
    var exists = PRESETS.some(function (p) { return p.id === presetId; });
    activePreset = exists ? presetId : 'original';
    if (activePreset !== 'original' && intensity === 0) {
      intensity = 100;
      syncSlidersUI();
    }
    syncPresetCardsUI();
    if (originalImage) {
      scheduleRender();
    }
  }

  /* ----- Interactive Before / After Comparison Slider ----- */
  function setSlider(pct) {
    pct = Math.max(0, Math.min(100, pct));
    var clip = $('.ba-clip', baWrap);
    var slider = $('.ba-slider', baWrap);
    var handle = $('.ba-handle', baWrap);
    if (clip) {
      clip.style.width = '100%';
      var isRTL = document.documentElement.getAttribute('dir') === 'rtl';
      var clipVal = isRTL
        ? 'inset(0 ' + (100 - pct) + '% 0 0)'
        : 'inset(0 0 0 ' + pct + '%)';
      clip.style.clipPath = clipVal;
      clip.style.webkitClipPath = clipVal;
    }
    if (slider) slider.style.left = pct + '%';
    if (handle) handle.style.left = pct + '%';
  }

  function initBeforeAfterSlider() {
    if (!baWrap) return;
    function move(e) {
      if (!sliderDragging) return;
      var rect = baWrap.getBoundingClientRect();
      if (!rect.width) return;
      var clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
      var pct = ((clientX - rect.left) / rect.width) * 100;
      setSlider(pct);
    }
    baWrap.addEventListener('pointerdown', function (e) {
      sliderDragging = true;
      move(e);
    });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', function () { sliderDragging = false; });
    window.addEventListener('pointercancel', function () { sliderDragging = false; });
  }

  /* ----- Load / Reset / Clear / Full-Res Download ----- */
  function resetAdjustments(showMsg) {
    activePreset = 'original';
    intensity = 100;
    brightness = 0;
    contrast = 0;
    saturation = 0;
    vignette = 0;
    syncSlidersUI();
    syncPresetCardsUI();
    if (originalImage) {
      setSlider(50);
      renderPreviewNow(false);
    }
    if (showMsg) toast(t('tc_reset'), 'ok');
  }

  function loadFile(file) {
    if (!validateFile(file)) return;
    var seq = ++loadSeq;
    revokeObjectUrl();
    clearPresetCache();
    currentFileName = sanitizeFilenameBase(file.name || 'image');

    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      if (seq !== loadSeq) {
        try { URL.revokeObjectURL(url); } catch (_e) { /* noop */ }
        return;
      }
      var natW = img.naturalWidth || img.width;
      var natH = img.naturalHeight || img.height;
      if (!natW || !natH || natW > MAX_DIMENSION || natH > MAX_DIMENSION || (natW * natH) > MAX_PIXELS) {
        try { URL.revokeObjectURL(url); } catch (_e) { /* noop */ }
        toast(t('tc_compress_bomb'), 'err');
        clearAll();
        return;
      }

      originalFile = file;
      originalImage = img;
      objectUrl = url;

      var scale = Math.min(1, MAX_WORK_DIM / Math.max(natW, natH));
      var w = Math.max(1, Math.round(natW * scale));
      var h = Math.max(1, Math.round(natH * scale));

      workCanvas.width = w;
      workCanvas.height = h;
      var wctx = workCanvas.getContext('2d');
      wctx.imageSmoothingEnabled = true;
      wctx.imageSmoothingQuality = 'high';
      wctx.clearRect(0, 0, w, h);
      wctx.drawImage(img, 0, 0, w, h);

      if (beforeCanvas) {
        beforeCanvas.width = w;
        beforeCanvas.height = h;
        beforeCanvas.getContext('2d').drawImage(workCanvas, 0, 0);
      }

      if (emptyState) emptyState.classList.add('hide');
      if (dropZone) dropZone.classList.add('hide');
      if (baWrap) {
        baWrap.classList.remove('hide');
        baWrap.style.aspectRatio = w + ' / ' + h;
      }
      if (resultActions) {
        resultActions.classList.remove('hide');
        resultActions.style.display = '';
      }
      if (btnApply) btnApply.disabled = false;
      if (btnDownload) btnDownload.disabled = false;
      if (infoBar) {
        infoBar.textContent = natW + ' × ' + natH + ' px · ' + formatSize(file.size);
      }

      setSlider(50);
      renderPreviewNow(false);

      requestAnimationFrame(function () {
        if (seq === loadSeq) {
          renderAllThumbnails(workCanvas);
        }
      });
    };
    img.onerror = function () {
      try { URL.revokeObjectURL(url); } catch (_e) { /* noop */ }
      toast(t('tc_img_load_err'), 'err');
    };
    img.src = url;
  }

  function clearAll() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    loadSeq++;
    revokeObjectUrl();
    clearPresetCache();

    originalFile = null;
    originalImage = null;
    currentFileName = 'image';

    workCanvas.width = 0; workCanvas.height = 0;
    stageCanvas.width = 0; stageCanvas.height = 0;
    layerCanvas.width = 0; layerCanvas.height = 0;

    if (beforeCanvas) { beforeCanvas.width = 0; beforeCanvas.height = 0; }
    if (afterCanvas) { afterCanvas.width = 0; afterCanvas.height = 0; }
    if (baWrap) {
      baWrap.classList.add('hide');
      baWrap.style.aspectRatio = '';
    }
    if (progressEl) progressEl.classList.add('hide');
    if (resultActions) {
      resultActions.classList.add('hide');
      resultActions.style.display = 'none';
    }
    if (dropZone) dropZone.classList.add('hide');
    if (emptyState) emptyState.classList.remove('hide');
    if (infoBar) infoBar.textContent = '';
    if (btnApply) btnApply.disabled = true;
    if (fileInput) fileInput.value = '';

    resetAdjustments(false);
    renderAllThumbnails(null);
  }

  function downloadResult() {
    if (!originalFile || !originalImage) {
      toast(t('tc_load_first'), 'err');
      return;
    }

    var fmt = getExportFormat();
    var filename = sanitizeFilenameBase(currentFileName) + '_filter_imgsfix.' + fmt.ext;
    var natW = originalImage.naturalWidth || originalImage.width;
    var natH = originalImage.naturalHeight || originalImage.height;

    var exportCanvas = afterCanvas;
    var isTemp = false;

    if (natW !== workCanvas.width || natH !== workCanvas.height) {
      /* Render full native resolution cleanly (capped only for massive >4096px safety) */
      var capScale = Math.min(1, 4096 / Math.max(natW, natH));
      var ew = Math.max(1, Math.round(natW * capScale));
      var eh = Math.max(1, Math.round(natH * capScale));

      var fullSrc = document.createElement('canvas');
      fullSrc.width = ew;
      fullSrc.height = eh;
      var fctx = fullSrc.getContext('2d');
      fctx.imageSmoothingEnabled = true;
      fctx.imageSmoothingQuality = 'high';
      fctx.drawImage(originalImage, 0, 0, ew, eh);

      exportCanvas = document.createElement('canvas');
      isTemp = true;
      renderGradedFrame(
        fullSrc,
        exportCanvas,
        activePreset,
        {
          intensity: intensity,
          brightness: brightness,
          contrast: contrast,
          saturation: saturation,
          vignette: vignette
        },
        null,
        null,
        null
      );

      fullSrc.width = 0;
      fullSrc.height = 0;
    }

    var cleanupTemp = function () {
      if (isTemp && exportCanvas) {
        exportCanvas.width = 0;
        exportCanvas.height = 0;
      }
    };

    if (typeof I.downloadCanvas === 'function') {
      I.downloadCanvas(exportCanvas, filename, fmt.mime, EXPORT_QUALITY, function () {
        cleanupTemp();
        toast(t('tc_done'), 'ok');
      }, function () {
        cleanupTemp();
        toast(t('tc_img_load_err'), 'err');
      });
    } else {
      exportCanvas.toBlob(function (blob) {
        cleanupTemp();
        if (!blob) return;
        var dlUrl = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = dlUrl;
        a.download = filename;
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          if (a.parentNode) a.parentNode.removeChild(a);
          try { URL.revokeObjectURL(dlUrl); } catch (_e) { /* noop */ }
        }, 4000);
        toast(t('tc_done'), 'ok');
      }, fmt.mime, EXPORT_QUALITY);
    }
  }

  /* ----- Slider & Button Event Bindings ----- */
  if (intensityEl) {
    intensityEl.addEventListener('input', function () {
      intensity = parseInt(intensityEl.value, 10) || 0;
      if (intValEl) intValEl.textContent = intensity + '%';
      scheduleRender();
    });
  }
  if (brightnessEl) {
    brightnessEl.addEventListener('input', function () {
      brightness = parseInt(brightnessEl.value, 10) || 0;
      if (brightValEl) brightValEl.textContent = (brightness > 0 ? '+' : '') + brightness;
      scheduleRender();
    });
  }
  if (contrastEl) {
    contrastEl.addEventListener('input', function () {
      contrast = parseInt(contrastEl.value, 10) || 0;
      if (contrastValEl) contrastValEl.textContent = (contrast > 0 ? '+' : '') + contrast;
      scheduleRender();
    });
  }
  if (saturationEl) {
    saturationEl.addEventListener('input', function () {
      saturation = parseInt(saturationEl.value, 10) || 0;
      if (satValEl) satValEl.textContent = (saturation > 0 ? '+' : '') + saturation;
      scheduleRender();
    });
  }
  if (vignetteEl) {
    vignetteEl.addEventListener('input', function () {
      vignette = parseInt(vignetteEl.value, 10) || 0;
      if (vigValEl) vigValEl.textContent = vignette + '%';
      scheduleRender();
    });
  }

  if (btnNoFilter) {
    btnNoFilter.addEventListener('click', function () {
      resetAdjustments(Boolean(originalImage));
    });
  }
  if (btnApply) {
    btnApply.addEventListener('click', function () {
      if (!originalImage) { toast(t('tc_load_first'), 'err'); return; }
      renderPreviewNow(true);
    });
  }
  if (btnDownload) btnDownload.addEventListener('click', downloadResult);
  if (btnReset) btnReset.addEventListener('click', function () { resetAdjustments(true); });
  if (btnClear) btnClear.addEventListener('click', clearAll);

  /* Upload entry points & clipboard paste */
  [emptyState, dropZone].forEach(function (target) {
    if (!target) return;
    target.addEventListener('click', function () { if (fileInput) fileInput.click(); });
    target.addEventListener('dragover', function (e) { e.preventDefault(); target.classList.add('drag'); });
    target.addEventListener('dragleave', function () { target.classList.remove('drag'); });
    target.addEventListener('drop', function (e) {
      e.preventDefault();
      target.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        loadFile(e.dataTransfer.files[0]);
      }
    });
  });

  if (btnUpload) {
    btnUpload.addEventListener('click', function (e) {
      e.stopPropagation();
      if (fileInput) fileInput.click();
    });
  }
  if (fileInput) {
    fileInput.addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) loadFile(e.target.files[0]);
    });
  }
  document.addEventListener('paste', function (e) {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files[0]) {
      loadFile(e.clipboardData.files[0]);
    }
  });

  if (progressText) progressText.textContent = '';

  window.addEventListener('beforeunload', function () {
    if (rafId) cancelAnimationFrame(rafId);
    revokeObjectUrl();
    clearPresetCache();
  });

  /* ----- Initialize Preset Gallery & Comparison Slider ----- */
  buildPresetGallery();
  syncSlidersUI();
  renderAllThumbnails(null);
  initBeforeAfterSlider();
})();

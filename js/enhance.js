/* imgsfix — enhance.js
   Intelligent Photo Enhancement Studio (100% Client-Side):
   - Histogram & scene analysis (luminance percentiles, clipping, saturation, skin-tone & noise estimation)
   - Automatic Smart Auto-Enhance on upload + prominent #btnAutoEnhance action
   - 4 Smart Enhancement Modes: Auto Balance, HD Clarity & Crisp, Portrait Glow, Low-Light Fix
   - Edge-preserving bilateral Denoise (LUT-accelerated), Tone-Curve + Smart Vibrance,
     and true separable Gaussian Unsharp Mask (Clarity / Sharpness)
   - 60fps requestAnimationFrame preview on screen-sized buffer + full-res Apply, Download & Editor Bridge
   - Original-format export (.jpg, .webp, .png) at 0.92 quality
*/

(function () {
  'use strict';

  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = I.$$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  /* ----- Constants ----- */
  var MAX_FILE_BYTES = 50 * 1024 * 1024;
  var MAX_DIMENSION = 16384;
  var MAX_PIXELS = 64000000;
  var MAX_WORK_DIM = 1280;
  var ANALYSIS_MAX_DIM = 256;
  var EXPORT_QUALITY = 0.92;

  /* ----- DOM ----- */
  var btnAutoEnhance = $('#btnAutoEnhance');
  var enhanceModesEl = $('#enhanceModes');
  var modeButtons = $$('.enhance-mode-btn', enhanceModesEl);

  var briEl = $('#brightness');
  var briValEl = $('#briVal');
  var conEl = $('#contrast');
  var conValEl = $('#conVal');
  var satEl = $('#saturation');
  var satValEl = $('#satVal');
  var shpEl = $('#sharpness');
  var shpValEl = $('#shpVal');
  var denEl = $('#denoise');
  var denValEl = $('#denVal');
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

  var activeMode = null;
  var cachedStats = null;
  var params = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpness: 0,
    denoise: 0,
    oldPhotoRestore: false
  };

  var workCanvas = document.createElement('canvas');
  var workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  var fullCacheCanvas = null;
  var fullCacheKey = '';
  var rafId = 0;
  var sliderDragging = false;

  /* ----- Safe Helpers ----- */
  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function clamp255(v) {
    return v < 0 ? 0 : (v > 255 ? 255 : (v + 0.5) | 0);
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

  function clearFullCache() {
    if (fullCacheCanvas) {
      fullCacheCanvas.width = 0;
      fullCacheCanvas.height = 0;
      fullCacheCanvas = null;
    }
    fullCacheKey = '';
  }

  function getParamsKey() {
    return [
      params.brightness,
      params.contrast,
      params.saturation,
      params.sharpness,
      params.denoise,
      params.oldPhotoRestore ? 1 : 0
    ].join('|');
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / 1024 / 1024).toFixed(2) + 'MB';
  }

  function hasTransparentPixels(canvas) {
    try {
      var sw = Math.min(128, canvas.width);
      var sh = Math.min(128, canvas.height);
      if (!sw || !sh) return false;
      var probe = document.createElement('canvas');
      probe.width = sw;
      probe.height = sh;
      var pctx = probe.getContext('2d');
      pctx.drawImage(canvas, 0, 0, sw, sh);
      var data = pctx.getImageData(0, 0, sw, sh).data;
      probe.width = 0;
      probe.height = 0;
      for (var idx = 3; idx < data.length; idx += 4) {
        if (data[idx] < 252) return true;
      }
    } catch (_e) { /* noop */ }
    return false;
  }

  /* ----- Histogram & Scene Analysis ----- */
  function analyzeImageStats(srcCanvas) {
    var sw = srcCanvas.width;
    var sh = srcCanvas.height;
    var scale = Math.min(1, ANALYSIS_MAX_DIM / Math.max(sw, sh));
    var aw = Math.max(8, Math.round(sw * scale));
    var ah = Math.max(8, Math.round(sh * scale));

    var probe = document.createElement('canvas');
    probe.width = aw;
    probe.height = ah;
    var pctx = probe.getContext('2d', { willReadFrequently: true });
    pctx.drawImage(srcCanvas, 0, 0, aw, ah);
    var data = pctx.getImageData(0, 0, aw, ah).data;
    probe.width = 0;
    probe.height = 0;

    var hist = new Uint32Array(256);
    var rHist = new Uint32Array(256);
    var gHist = new Uint32Array(256);
    var bHist = new Uint32Array(256);
    var totalOpaque = 0;
    var shadowClip = 0;
    var highlightClip = 0;
    var satSum = 0;
    var satCount = 0;
    var skinCount = 0;
    var chromaSum = 0;

    var lumaGrid = new Float32Array(aw * ah);

    for (var y = 0; y < ah; y++) {
      for (var x = 0; x < aw; x++) {
        var idx = (y * aw + x) * 4;
        var a = data[idx + 3];
        var r = data[idx];
        var g = data[idx + 1];
        var b = data[idx + 2];
        var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        lumaGrid[y * aw + x] = lum;

        if (a < 20) continue;
        totalOpaque++;
        var bin = lum < 0 ? 0 : (lum > 255 ? 255 : lum | 0);
        hist[bin]++;
        rHist[r]++;
        gHist[g]++;
        bHist[b]++;
        if (bin < 20) shadowClip++;
        if (bin > 235) highlightClip++;

        var maxC = r > g ? (r > b ? r : b) : (g > b ? g : b);
        var minC = r < g ? (r < b ? r : b) : (g < b ? g : b);
        chromaSum += (maxC - minC);
        if (maxC > 24 && minC < 245) {
          satSum += (maxC - minC) / maxC;
          satCount++;
        }

        if (r > 85 && g > 40 && b > 20 && r > g && r > b && (r - g) > 12 && (maxC - minC) > 14) {
          skinCount++;
        }
      }
    }

    if (totalOpaque === 0) {
      return {
        p02: 20, p25: 75, p50: 128, p75: 180, p98: 235,
        r02: 20, r98: 235, g02: 20, g98: 235, b02: 20, b98: 235,
        meanChroma: 12,
        shadowClipRatio: 0, highlightClipRatio: 0,
        meanSat: 0.35, skinRatio: 0, noiseEstimate: 0
      };
    }

    /* Percentiles from luminance & per-channel histograms */
    var c02 = totalOpaque * 0.02;
    var c25 = totalOpaque * 0.25;
    var c50 = totalOpaque * 0.50;
    var c75 = totalOpaque * 0.75;
    var c98 = totalOpaque * 0.98;
    var cum = 0, rCum = 0, gCum = 0, bCum = 0;
    var p02 = 0, p25 = 0, p50 = 0, p75 = 0, p98 = 255;
    var r02 = 0, r98 = 255, g02 = 0, g98 = 255, b02 = 0, b98 = 255;
    var got02 = false, got25 = false, got50 = false, got75 = false, got98 = false;
    var gotR02 = false, gotR98 = false, gotG02 = false, gotG98 = false, gotB02 = false, gotB98 = false;

    for (var i = 0; i < 256; i++) {
      cum += hist[i];
      rCum += rHist[i];
      gCum += gHist[i];
      bCum += bHist[i];
      if (!got02 && cum >= c02) { p02 = i; got02 = true; }
      if (!got25 && cum >= c25) { p25 = i; got25 = true; }
      if (!got50 && cum >= c50) { p50 = i; got50 = true; }
      if (!got75 && cum >= c75) { p75 = i; got75 = true; }
      if (!got98 && cum >= c98) { p98 = i; got98 = true; }

      if (!gotR02 && rCum >= c02) { r02 = i; gotR02 = true; }
      if (!gotR98 && rCum >= c98) { r98 = i; gotR98 = true; }
      if (!gotG02 && gCum >= c02) { g02 = i; gotG02 = true; }
      if (!gotG98 && gCum >= c98) { g98 = i; gotG98 = true; }
      if (!gotB02 && bCum >= c02) { b02 = i; gotB02 = true; }
      if (!gotB98 && bCum >= c98) { b98 = i; gotB98 = true; }
    }

    /* Estimate micro-noise via local Laplacian variance in smoother regions */
    var noiseAccum = 0;
    var noiseSamples = 0;
    for (var ny = 1; ny < ah - 1; ny += 2) {
      for (var nx = 1; nx < aw - 1; nx += 2) {
        var cIdx = ny * aw + nx;
        var center = lumaGrid[cIdx];
        var localAvg = 0.25 * (lumaGrid[cIdx - 1] + lumaGrid[cIdx + 1] + lumaGrid[cIdx - aw] + lumaGrid[cIdx + aw]);
        var diff = Math.abs(center - localAvg);
        if (diff < 18) {
          noiseAccum += diff;
          noiseSamples++;
        }
      }
    }

    return {
      p02: p02,
      p25: p25,
      p50: p50,
      p75: p75,
      p98: p98,
      r02: r02,
      r98: r98,
      g02: g02,
      g98: g98,
      b02: b02,
      b98: b98,
      meanChroma: chromaSum / totalOpaque,
      shadowClipRatio: shadowClip / totalOpaque,
      highlightClipRatio: highlightClip / totalOpaque,
      meanSat: satCount > 0 ? (satSum / satCount) : 0.3,
      skinRatio: skinCount / totalOpaque,
      noiseEstimate: noiseSamples > 0 ? (noiseAccum / noiseSamples) : 0
    };
  }

  function computeAutoParams(stats) {
    var s = stats || {
      p02: 15, p25: 75, p50: 128, p75: 180, p98: 235,
      shadowClipRatio: 0, highlightClipRatio: 0,
      meanSat: 0.35, skinRatio: 0, noiseEstimate: 1.5
    };

    /* Exposure / Brightness */
    var brightness = 100;
    if (s.p50 < 120) {
      var darkDeficit = (124 - s.p50) / 124;
      var shadowPull = s.p25 < 60 ? (60 - s.p25) / 60 : 0;
      var headroom = clamp((248 - s.p98) / 48, 0.35, 1.0);
      brightness = Math.round(100 + (darkDeficit * 26 + shadowPull * 10) * headroom);
    } else if (s.p50 > 158 && s.highlightClipRatio > 0.05) {
      brightness = Math.round(100 - clamp((s.p50 - 155) * 0.25 + s.highlightClipRatio * 45, 3, 14));
    } else if (s.p25 < 52 && s.p98 < 228) {
      brightness = 107;
    }
    brightness = clamp(brightness, 86, 134);

    /* Dynamic Range / Contrast */
    var spread = Math.max(24, s.p98 - s.p02);
    var contrast = 106;
    if (spread < 195) {
      contrast = Math.round(104 + ((195 - spread) / 195) * 24);
    } else if (s.shadowClipRatio > 0.14 && s.highlightClipRatio > 0.08) {
      contrast = 96;
    }
    contrast = clamp(contrast, 94, 128);

    /* Smart Vibrance / Saturation (attenuated when portraits detected) */
    var skinDamp = clamp(1 - s.skinRatio * 0.85, 0.45, 1.0);
    var satBoost = 10;
    if (s.meanSat < 0.44) {
      satBoost = 8 + ((0.44 - s.meanSat) / 0.44) * 24 * skinDamp;
    } else {
      satBoost = 4 * skinDamp;
    }
    var saturation = clamp(Math.round(100 + satBoost), 102, 132);

    /* Denoise from micro-noise estimate */
    var denoise = 0;
    if (s.noiseEstimate > 2.4) {
      denoise = clamp(Math.round((s.noiseEstimate - 2.2) * 9.5), 6, 36);
    } else if (s.p50 < 78) {
      denoise = 14;
    }

    /* Crisp Clarity / Sharpness */
    var sharpness = Math.round(28 - denoise * 0.3);
    if (s.skinRatio > 0.24) sharpness = Math.min(sharpness, 20);
    sharpness = clamp(sharpness, 16, 36);

    return {
      brightness: brightness,
      contrast: contrast,
      saturation: saturation,
      sharpness: sharpness,
      denoise: denoise
    };
  }

  function getPresetModeParams(mode, stats) {
    var auto = computeAutoParams(stats);
    if (mode === 'auto') {
      return {
        brightness: auto.brightness,
        contrast: auto.contrast,
        saturation: auto.saturation,
        sharpness: auto.sharpness,
        denoise: auto.denoise,
        oldPhotoRestore: false
      };
    }
    if (mode === 'clarity') {
      return {
        brightness: clamp(auto.brightness, 96, 118),
        contrast: clamp(auto.contrast + 8, 110, 132),
        saturation: clamp(auto.saturation + 2, 104, 126),
        sharpness: 64,
        denoise: Math.min(10, auto.denoise),
        oldPhotoRestore: false
      };
    }
    if (mode === 'portrait') {
      return {
        brightness: clamp(Math.max(104, auto.brightness), 103, 115),
        contrast: clamp(Math.min(110, auto.contrast), 102, 110),
        saturation: clamp(Math.min(110, auto.saturation), 104, 110),
        sharpness: 14,
        denoise: 38,
        oldPhotoRestore: false
      };
    }
    if (mode === 'lowlight') {
      return {
        brightness: clamp(Math.max(118, auto.brightness + 12), 116, 138),
        contrast: clamp(auto.contrast, 105, 118),
        saturation: clamp(auto.saturation + 4, 108, 126),
        sharpness: 18,
        denoise: 54,
        oldPhotoRestore: false
      };
    }
    if (mode === 'old_photo') {
      var s = stats || { p50: 120, noiseEstimate: 2.5 };
      var oldBri = s.p50 < 105 ? clamp(Math.round(104 + (112 - s.p50) * 0.28), 104, 118) : 103;
      var oldDen = clamp(Math.round(24 + (s.noiseEstimate || 0) * 2.5), 24, 38);
      return {
        brightness: oldBri,
        contrast: 118,
        saturation: 112,
        sharpness: 52,
        denoise: oldDen,
        oldPhotoRestore: true
      };
    }
    return {
      brightness: auto.brightness,
      contrast: auto.contrast,
      saturation: auto.saturation,
      sharpness: auto.sharpness,
      denoise: auto.denoise,
      oldPhotoRestore: false
    };
  }

  /* ----- Pro Computer Vision Processing Pipeline ----- */
  function buildToneLut(brightnessPct, contrastPct) {
    var lut = new Uint8Array(256);
    var bRatio = (brightnessPct - 100) / 100;
    var cFactor = contrastPct / 100;
    /* Exposure gain + shadow lift when lifting brightness, soft highlight roll-off */
    var gain = brightnessPct >= 100 ? (1 + bRatio * 0.72) : (1 + bRatio * 0.9);
    var lift = brightnessPct > 100 ? (bRatio * 26) : (bRatio * 14);

    for (var i = 0; i < 256; i++) {
      var x = i / 255;
      /* Smooth highlight protection curve when boosting exposure */
      var v;
      if (brightnessPct >= 100) {
        var lifted = i * gain + lift * (1 - x * x);
        /* Soft knee above 215 to prevent harsh highlight clipping */
        if (lifted > 215) {
          var over = (lifted - 215) / 120;
          lifted = 215 + 40 * (over / (1 + over));
        }
        v = lifted;
      } else {
        v = i * gain + lift;
      }
      /* Centered contrast curve */
      v = (v - 127.5) * cFactor + 127.5;
      lut[i] = clamp255(v);
    }
    return lut;
  }

  function applyBilateralDenoise(src, w, h, denoiseVal) {
    var dst = new Uint8ClampedArray(src.length);
    var sigmaR = 12 + denoiseVal * 0.44;
    var invTwoSigmaR2 = 1 / (2 * sigmaR * sigmaR);

    /* Precompute 256-entry luminance difference weight table (zero Math.exp inside loop) */
    var rangeLut = new Float32Array(256);
    for (var d = 0; d < 256; d++) {
      rangeLut[d] = Math.exp(-(d * d) * invTwoSigmaR2);
    }

    /* Fast 9-tap bilateral kernel: step=1 for mild denoise, step=2 for heavy low-light denoise */
    var step = denoiseVal > 52 ? 2 : 1;
    var blend = clamp(denoiseVal / 85, 0.25, 1.0);
    var invBlend = 1 - blend;

    for (var y = 0; y < h; y++) {
      var ym = y - step; if (ym < 0) ym = 0;
      var yp = y + step; if (yp >= h) yp = h - 1;
      var row0 = ym * w;
      var row1 = y * w;
      var row2 = yp * w;

      for (var x = 0; x < w; x++) {
        var xm = x - step; if (xm < 0) xm = 0;
        var xp = x + step; if (xp >= w) xp = w - 1;

        var cIdx = (row1 + x) * 4;
        var cr = src[cIdx];
        var cg = src[cIdx + 1];
        var cb = src[cIdx + 2];
        var ca = src[cIdx + 3];

        if (ca === 0) {
          dst[cIdx] = cr; dst[cIdx + 1] = cg; dst[cIdx + 2] = cb; dst[cIdx + 3] = 0;
          continue;
        }

        var cLum = (cr * 77 + cg * 150 + cb * 29) >> 8;

        /* 8 surrounding taps + center */
        var n0 = (row0 + xm) * 4, n1 = (row0 + x) * 4, n2 = (row0 + xp) * 4;
        var n3 = (row1 + xm) * 4,                       n4 = (row1 + xp) * 4;
        var n5 = (row2 + xm) * 4, n6 = (row2 + x) * 4, n7 = (row2 + xp) * 4;

        var sumR = cr * 1.35;
        var sumG = cg * 1.35;
        var sumB = cb * 1.35;
        var sumW = 1.35;

        var taps = [n0, n1, n2, n3, n4, n5, n6, n7];
        var spatialW = [0.65, 0.9, 0.65, 0.9, 0.9, 0.65, 0.9, 0.65];

        for (var k = 0; k < 8; k++) {
          var ni = taps[k];
          var nr = src[ni], ng = src[ni + 1], nb = src[ni + 2];
          var nLum = (nr * 77 + ng * 150 + nb * 29) >> 8;
          var diff = cLum - nLum;
          if (diff < 0) diff = -diff;
          var weight = spatialW[k] * rangeLut[diff];
          sumR += nr * weight;
          sumG += ng * weight;
          sumB += nb * weight;
          sumW += weight;
        }

        var invW = 1 / sumW;
        var fr = sumR * invW;
        var fg = sumG * invW;
        var fb = sumB * invW;

        dst[cIdx]     = clamp255(cr * invBlend + fr * blend);
        dst[cIdx + 1] = clamp255(cg * invBlend + fg * blend);
        dst[cIdx + 2] = clamp255(cb * invBlend + fb * blend);
        dst[cIdx + 3] = ca;
      }
    }
    return dst;
  }

  function applyToneAndVibranceInPlace(buf, totalPixels, brightnessPct, contrastPct, saturationPct) {
    var needTone = (brightnessPct !== 100 || contrastPct !== 100);
    var needSat = (saturationPct !== 100);
    if (!needTone && !needSat) return;

    var toneLut = needTone ? buildToneLut(brightnessPct, contrastPct) : null;
    var sDiff = (saturationPct - 100) / 50; /* -1.0 .. +1.0 */

    for (var p = 0; p < totalPixels; p++) {
      var idx = p * 4;
      if (buf[idx + 3] === 0) continue;

      var r = toneLut ? toneLut[buf[idx]] : buf[idx];
      var g = toneLut ? toneLut[buf[idx + 1]] : buf[idx + 1];
      var b = toneLut ? toneLut[buf[idx + 2]] : buf[idx + 2];

      if (needSat) {
        var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (sDiff < 0) {
          /* Smooth linear desaturation toward 0.5x..1.0x */
          var factor = 1 + sDiff * 0.9;
          r = lum + (r - lum) * factor;
          g = lum + (g - lum) * factor;
          b = lum + (b - lum) * factor;
        } else {
          /* Smart Vibrance: boost muted pixels more than already-vivid pixels, protect skin tones */
          var maxC = r > g ? (r > b ? r : b) : (g > b ? g : b);
          var minC = r < g ? (r < b ? r : b) : (g < b ? g : b);
          var sat = maxC > 0 ? (maxC - minC) / 255 : 0;
          var isSkin = (r > 90 && g > 40 && r > g && r > b && (r - g) > 12);
          var skinFactor = isSkin ? 0.45 : 1.0;
          var amt = sDiff * (1 - sat * 0.72) * 0.85 * skinFactor;
          var vScale = 1 + amt;
          r = lum + (r - lum) * vScale;
          g = lum + (g - lum) * vScale;
          b = lum + (b - lum) * vScale;
        }
      }

      buf[idx]     = clamp255(r);
      buf[idx + 1] = clamp255(g);
      buf[idx + 2] = clamp255(b);
    }
  }

  function separableBlur5(srcArr, tmpArr, dstArr, w, h) {
    /* Horizontal pass: [1, 4, 6, 4, 1] / 16 */
    for (var y = 0; y < h; y++) {
      var row = y * w;
      for (var x = 0; x < w; x++) {
        var x0 = x - 2; if (x0 < 0) x0 = 0;
        var x1 = x - 1; if (x1 < 0) x1 = 0;
        var x3 = x + 1; if (x3 >= w) x3 = w - 1;
        var x4 = x + 2; if (x4 >= w) x4 = w - 1;
        tmpArr[row + x] = (
          srcArr[row + x0] +
          4 * srcArr[row + x1] +
          6 * srcArr[row + x] +
          4 * srcArr[row + x3] +
          srcArr[row + x4]
        ) * 0.0625;
      }
    }
    /* Vertical pass: [1, 4, 6, 4, 1] / 16 */
    for (var vy = 0; vy < h; vy++) {
      var y0 = vy - 2; if (y0 < 0) y0 = 0;
      var y1 = vy - 1; if (y1 < 0) y1 = 0;
      var y3 = vy + 1; if (y3 >= h) y3 = h - 1;
      var y4 = vy + 2; if (y4 >= h) y4 = h - 1;
      var r0 = y0 * w, r1 = y1 * w, r2 = vy * w, r3 = y3 * w, r4 = y4 * w;
      for (var vx = 0; vx < w; vx++) {
        dstArr[r2 + vx] = (
          tmpArr[r0 + vx] +
          4 * tmpArr[r1 + vx] +
          6 * tmpArr[r2 + vx] +
          4 * tmpArr[r3 + vx] +
          tmpArr[r4 + vx]
        ) * 0.0625;
      }
    }
  }

  function applyUnsharpMaskInPlace(buf, w, h, sharpnessVal, denoiseVal) {
    var total = w * h;
    var lum = new Float32Array(total);
    var tmp = new Float32Array(total);
    var blur = new Float32Array(total);

    for (var i = 0; i < total; i++) {
      var p = i * 4;
      lum[i] = 0.2126 * buf[p] + 0.7152 * buf[p + 1] + 0.0722 * buf[p + 2];
    }

    separableBlur5(lum, tmp, blur, w, h);
    /* Second pass for wider local-contrast clarity when sharpness > 40 */
    if (sharpnessVal > 40) {
      separableBlur5(blur, tmp, blur, w, h);
    }

    var amount = (sharpnessVal / 100) * 1.85;
    var threshold = denoiseVal > 20 ? 2.4 : 1.0;
    var maxDelta = 44;

    for (var j = 0; j < total; j++) {
      var idx = j * 4;
      if (buf[idx + 3] === 0) continue;
      var detail = lum[j] - blur[j];
      var absD = detail < 0 ? -detail : detail;
      if (absD <= threshold) continue;

      /* Smooth threshold ramp + soft halo clamp */
      var scaled = detail * amount;
      if (scaled > maxDelta) scaled = maxDelta + (scaled - maxDelta) * 0.15;
      else if (scaled < -maxDelta) scaled = -maxDelta + (scaled + maxDelta) * 0.15;

      buf[idx]     = clamp255(buf[idx] + scaled);
      buf[idx + 1] = clamp255(buf[idx + 1] + scaled);
      buf[idx + 2] = clamp255(buf[idx + 2] + scaled);
    }
  }

  function buildChannelStretchLut(lo, hi, strength) {
    var lut = new Uint8Array(256);
    var span = Math.max(24, hi - lo);
    var invSpan = 248 / span;
    var invStrength = 1 - strength;
    for (var i = 0; i < 256; i++) {
      var stretched = (i - lo) * invSpan + 4;
      if (stretched < 0) stretched = 0;
      else if (stretched > 255) stretched = 255;
      lut[i] = clamp255(i * invStrength + stretched * strength);
    }
    return lut;
  }

  function applyOldPhotoLevelsInPlace(buf, totalPixels, stats) {
    if (!stats) return;
    /* Blend per-channel stretch with luminance stretch to remove faded haze and mild sepia/yellow cast
       without inventing false color on true monochrome scans. */
    var castStrength = stats.meanChroma < 8 ? 0.25 : 0.68;
    var rLo = Math.round(stats.p02 * (1 - castStrength) + stats.r02 * castStrength);
    var rHi = Math.round(stats.p98 * (1 - castStrength) + stats.r98 * castStrength);
    var gLo = Math.round(stats.p02 * (1 - castStrength) + stats.g02 * castStrength);
    var gHi = Math.round(stats.p98 * (1 - castStrength) + stats.g98 * castStrength);
    var bLo = Math.round(stats.p02 * (1 - castStrength) + stats.b02 * castStrength);
    var bHi = Math.round(stats.p98 * (1 - castStrength) + stats.b98 * castStrength);

    var rLut = buildChannelStretchLut(rLo, rHi, 0.72);
    var gLut = buildChannelStretchLut(gLo, gHi, 0.72);
    var bLut = buildChannelStretchLut(bLo, bHi, 0.72);

    for (var p = 0; p < totalPixels; p++) {
      var idx = p * 4;
      if (buf[idx + 3] === 0) continue;
      buf[idx]     = rLut[buf[idx]];
      buf[idx + 1] = gLut[buf[idx + 1]];
      buf[idx + 2] = bLut[buf[idx + 2]];
    }
  }

  function renderEnhancedFrame(srcCanvas, dstCanvas, p) {
    var w = srcCanvas.width;
    var h = srcCanvas.height;
    if (!w || !h) return;

    if (dstCanvas.width !== w) dstCanvas.width = w;
    if (dstCanvas.height !== h) dstCanvas.height = h;

    var sctx = srcCanvas.getContext('2d', { willReadFrequently: true });
    var dctx = dstCanvas.getContext('2d');

    if (!p.oldPhotoRestore && p.brightness === 100 && p.contrast === 100 && p.saturation === 100 && p.sharpness === 0 && p.denoise === 0) {
      dctx.clearRect(0, 0, w, h);
      dctx.drawImage(srcCanvas, 0, 0);
      return;
    }

    var imgData = sctx.getImageData(0, 0, w, h);
    var pixels = imgData.data;

    if (p.denoise > 0) {
      var denoised = applyBilateralDenoise(pixels, w, h, p.denoise);
      pixels.set(denoised);
    }

    if (p.oldPhotoRestore && cachedStats) {
      applyOldPhotoLevelsInPlace(pixels, w * h, cachedStats);
    }

    applyToneAndVibranceInPlace(pixels, w * h, p.brightness, p.contrast, p.saturation);

    if (p.sharpness > 0) {
      applyUnsharpMaskInPlace(pixels, w, h, p.sharpness, p.denoise);
    }

    dctx.putImageData(imgData, 0, 0);
  }

  /* ----- Full-Resolution Render & Cache ----- */
  function buildFullResolutionCanvas() {
    if (!originalImage) return null;
    var natW = originalImage.naturalWidth || originalImage.width;
    var natH = originalImage.naturalHeight || originalImage.height;
    if (!natW || !natH) return null;

    var key = getParamsKey();
    if (fullCacheCanvas && fullCacheKey === key && fullCacheCanvas.width > 0) {
      return fullCacheCanvas;
    }

    clearFullCache();

    var fullSrc = document.createElement('canvas');
    fullSrc.width = natW;
    fullSrc.height = natH;
    var fctx = fullSrc.getContext('2d');
    fctx.imageSmoothingEnabled = true;
    fctx.imageSmoothingQuality = 'high';
    fctx.drawImage(originalImage, 0, 0, natW, natH);

    var outCanvas = document.createElement('canvas');
    renderEnhancedFrame(fullSrc, outCanvas, params);

    fullSrc.width = 0;
    fullSrc.height = 0;

    fullCacheCanvas = outCanvas;
    fullCacheKey = key;
    return fullCacheCanvas;
  }

  /* ----- UI Synchronization ----- */
  function syncSlidersUI() {
    if (briEl) briEl.value = params.brightness;
    if (briValEl) briValEl.textContent = String(params.brightness);

    if (conEl) conEl.value = params.contrast;
    if (conValEl) conValEl.textContent = String(params.contrast);

    if (satEl) satEl.value = params.saturation;
    if (satValEl) satValEl.textContent = String(params.saturation);

    if (shpEl) shpEl.value = params.sharpness;
    if (shpValEl) shpValEl.textContent = String(params.sharpness);

    if (denEl) denEl.value = params.denoise;
    if (denValEl) denValEl.textContent = String(params.denoise);
  }

  function syncModeButtonsUI() {
    modeButtons.forEach(function (btn) {
      var mode = btn.getAttribute('data-mode');
      var isActive = (activeMode !== null && mode === activeMode);
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function setControlsEnabled(enabled) {
    if (btnAutoEnhance) btnAutoEnhance.disabled = !enabled;
    if (btnApply) btnApply.disabled = !enabled;
    if (btnDownload) btnDownload.disabled = !enabled;
    modeButtons.forEach(function (btn) {
      btn.disabled = !enabled;
    });
  }

  function renderPreviewNow() {
    if (!originalImage || !afterCanvas || !workCanvas.width) return;
    renderEnhancedFrame(workCanvas, afterCanvas, params);
  }

  function scheduleRender() {
    if (!originalImage) return;
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      renderPreviewNow();
    });
  }

  function applySmartMode(mode, notify) {
    if (!originalImage) {
      toast(t('tc_load_first'), 'err');
      return;
    }
    if (!cachedStats) {
      cachedStats = analyzeImageStats(workCanvas);
    }
    var nextParams = getPresetModeParams(mode, cachedStats);
    params.brightness = nextParams.brightness;
    params.contrast = nextParams.contrast;
    params.saturation = nextParams.saturation;
    params.sharpness = nextParams.sharpness;
    params.denoise = nextParams.denoise;
    params.oldPhotoRestore = Boolean(nextParams.oldPhotoRestore);
    activeMode = mode;
    clearFullCache();
    syncSlidersUI();
    syncModeButtonsUI();
    renderPreviewNow();
    if (notify) {
      toast(mode === 'auto' ? t('tc_auto_applied') : t('tc_done'), 'ok');
    }
  }

  /* ----- Before/After Comparison Slider ----- */
  function setSlider(pct) {
    pct = clamp(pct, 0, 100);
    if (!baWrap) return;
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
      if (e.target && e.target.closest && e.target.closest('.preview-bg-switcher')) return;
      sliderDragging = true;
      move(e);
    });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', function () { sliderDragging = false; });
    window.addEventListener('pointercancel', function () { sliderDragging = false; });
  }

  /* ----- File Loading, Reset, Clear, Download ----- */
  function loadFile(file) {
    if (!validateFile(file)) return;
    var seq = ++loadSeq;
    revokeObjectUrl();
    clearFullCache();
    cachedStats = null;
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
      workCtx.imageSmoothingEnabled = true;
      workCtx.imageSmoothingQuality = 'high';
      workCtx.clearRect(0, 0, w, h);
      workCtx.drawImage(img, 0, 0, w, h);

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
      if (infoBar) {
        infoBar.textContent = natW + ' × ' + natH + ' px · ' + formatSize(file.size);
      }

      setControlsEnabled(true);
      setSlider(50);

      /* Immediately run smart histogram Auto-Enhance so the user sees an instant Before/After */
      cachedStats = analyzeImageStats(workCanvas);
      applySmartMode('auto', false);
      toast(t('tc_auto_applied'), 'ok');
    };
    img.onerror = function () {
      try { URL.revokeObjectURL(url); } catch (_e) { /* noop */ }
      toast(t('tc_img_load_err'), 'err');
    };
    img.src = url;
  }

  function resetAdjustments(showMsg) {
    activeMode = null;
    params.brightness = 100;
    params.contrast = 100;
    params.saturation = 100;
    params.sharpness = 0;
    params.denoise = 0;
    params.oldPhotoRestore = false;
    clearFullCache();
    syncSlidersUI();
    syncModeButtonsUI();
    if (originalImage) {
      setSlider(50);
      renderPreviewNow();
    }
    if (showMsg) toast(t('tc_reset'), 'ok');
  }

  function clearAll() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    loadSeq++;
    revokeObjectUrl();
    clearFullCache();
    cachedStats = null;

    originalFile = null;
    originalImage = null;
    currentFileName = 'image';

    workCanvas.width = 0;
    workCanvas.height = 0;

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
    if (fileInput) fileInput.value = '';

    setControlsEnabled(false);
    resetAdjustments(false);
  }

  function downloadResult() {
    if (!originalFile || !originalImage) {
      toast(t('tc_load_first'), 'err');
      return;
    }

    var exportCanvas = buildFullResolutionCanvas();
    if (!exportCanvas || !exportCanvas.width || !exportCanvas.height) {
      toast(t('tc_enhance_export_err'), 'err');
      return;
    }

    var fmt = getExportFormat();
    var filename = sanitizeFilenameBase(currentFileName) + '_enhanced_imgsfix.' + fmt.ext;

    if (typeof I.downloadCanvas === 'function') {
      I.downloadCanvas(exportCanvas, filename, fmt.mime, EXPORT_QUALITY, function () {
        toast(t('tc_done'), 'ok');
      }, function () {
        toast(t('tc_enhance_export_err'), 'err');
      });
    } else {
      exportCanvas.toBlob(function (blob) {
        if (!blob) {
          toast(t('tc_enhance_export_err'), 'err');
          return;
        }
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

  /* ----- Unified Editor Bridge (Full-Res Transfer) ----- */
  if (typeof I.registerEditorBridgeSource === 'function') {
    I.registerEditorBridgeSource(function () {
      if (!originalImage) return null;
      var fullCanvas = buildFullResolutionCanvas();
      if (!fullCanvas || !fullCanvas.width || !fullCanvas.height) return null;
      var clone = document.createElement('canvas');
      clone.width = fullCanvas.width;
      clone.height = fullCanvas.height;
      clone.getContext('2d').drawImage(fullCanvas, 0, 0);
      return {
        canvas: clone,
        preserveAlpha: hasTransparentPixels(clone),
        name: sanitizeFilenameBase(currentFileName) + '_enhanced',
        cleanup: function () {
          clone.width = 0;
          clone.height = 0;
        }
      };
    });
  }

  /* ----- Event Bindings ----- */
  function bindSlider(el, valEl, key) {
    if (!el) return;
    el.addEventListener('input', function () {
      var val = parseInt(el.value, 10);
      if (isNaN(val)) return;
      params[key] = val;
      if (valEl) valEl.textContent = String(val);
      activeMode = null;
      clearFullCache();
      syncModeButtonsUI();
      scheduleRender();
    });
  }

  bindSlider(briEl, briValEl, 'brightness');
  bindSlider(conEl, conValEl, 'contrast');
  bindSlider(satEl, satValEl, 'saturation');
  bindSlider(shpEl, shpValEl, 'sharpness');
  bindSlider(denEl, denValEl, 'denoise');

  if (btnAutoEnhance) {
    btnAutoEnhance.addEventListener('click', function () {
      applySmartMode('auto', true);
    });
  }

  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mode = btn.getAttribute('data-mode');
      if (mode) applySmartMode(mode, true);
    });
  });

  if (btnApply) {
    btnApply.addEventListener('click', function () {
      if (!originalImage) {
        toast(t('tc_load_first'), 'err');
        return;
      }
      var fullCanvas = buildFullResolutionCanvas();
      if (fullCanvas && afterCanvas && workCanvas.width && workCanvas.height) {
        if (afterCanvas.width !== workCanvas.width) afterCanvas.width = workCanvas.width;
        if (afterCanvas.height !== workCanvas.height) afterCanvas.height = workCanvas.height;
        var actx = afterCanvas.getContext('2d');
        actx.imageSmoothingEnabled = true;
        actx.imageSmoothingQuality = 'high';
        actx.clearRect(0, 0, afterCanvas.width, afterCanvas.height);
        actx.drawImage(fullCanvas, 0, 0, afterCanvas.width, afterCanvas.height);
      }
      toast(t('tc_done'), 'ok');
    });
  }

  if (btnDownload) btnDownload.addEventListener('click', downloadResult);
  if (btnReset) btnReset.addEventListener('click', function () { resetAdjustments(true); });
  if (btnClear) btnClear.addEventListener('click', clearAll);

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
    clearFullCache();
  });

  /* ----- Initialize ----- */
  setControlsEnabled(false);
  syncSlidersUI();
  syncModeButtonsUI();
  initBeforeAfterSlider();
})();

/* imgsfix — cartoon.js
   Visual Cartoon & Illustration Studio (100% Client-Side):
   - 12 distinct artistic cartoon & drawing styles (NO photographic color filters)
   - Proper CV pipeline: Edge-preserving bilateral smoothing -> vibrant cel-shading /
     style synthesis -> crisp Sobel/DoG ink lines composited ON TOP
   - Built-in lightweight Canvas vector portrait generator for all 12 style cards
     before upload, automatically regenerated with user's photo upon upload
   - Interactive Before/After comparison slider (#baWrap), 3 adaptive sliders with fast
     debounce, instant default apply on upload, and original-format full-res download
*/

(function () {
  'use strict';

  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = I.$$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  /* ----- constants ----- */
  var MAX_FILE_BYTES = 50 * 1024 * 1024;
  var MAX_DIMENSION = 16384;
  var MAX_PIXELS = 64000000;
  var MAX_WORK_DIM = 1280;
  var THUMB_W = 112;
  var THUMB_H = 78;
  var EXPORT_QUALITY = 0.92;

  /* ----- 12 Distinct Cartoon & Illustration Styles ----- */
  var STYLES = [
    { id: 'classic',      key: 'tc_cs_classic',      detail: 55, levels: 6 },
    { id: 'anime',        key: 'tc_cs_anime',        detail: 48, levels: 7 },
    { id: 'comic',        key: 'tc_cs_comic',        detail: 68, levels: 5 },
    { id: 'soft_toon',    key: 'tc_cs_soft_toon',    detail: 28, levels: 8 },
    { id: 'pencil',       key: 'tc_cs_pencil',       detail: 62, levels: 10 },
    { id: 'color_pencil', key: 'tc_cs_color_pencil', detail: 54, levels: 7 },
    { id: 'ink_pen',      key: 'tc_cs_ink_pen',      detail: 60, levels: 4 },
    { id: 'watercolor',   key: 'tc_cs_watercolor',   detail: 45, levels: 8 },
    { id: 'oil_paint',    key: 'tc_cs_oil_paint',    detail: 58, levels: 9 },
    { id: 'pop_art',      key: 'tc_cs_pop_art',      detail: 64, levels: 4 },
    { id: 'neon_toon',    key: 'tc_cs_neon_toon',    detail: 70, levels: 6 },
    { id: 'pixel_art',    key: 'tc_cs_pixel_art',    detail: 52, levels: 6 }
  ];

  /* ----- DOM references ----- */
  var styleGrid = $('#styleGrid');
  var strengthEl = $('#strength');
  var strengthVal = $('#strengthVal');
  var edgeEl = $('#edge');
  var edgeVal = $('#edgeVal');
  var levelsEl = $('#levels');
  var lvlVal = $('#lvlVal');
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

  /* ----- state ----- */
  var originalFile = null;
  var originalImage = null;
  var objectUrl = null;
  var currentFileName = 'image';
  var loadSeq = 0;

  var activeStyle = 'classic';
  var strength = 100;
  var detailIntensity = 55;
  var colorLevels = 6;

  var workCanvas = document.createElement('canvas');
  var workImageData = null;
  var samplePortraitCanvas = null;
  var thumbCards = {};
  var renderTimer = null;
  var sliderDragging = false;

  /* ----- helpers ----- */
  function clamp255(v) {
    return v < 0 ? 0 : (v > 255 ? 255 : (v | 0));
  }

  function sanitizeFilenameBase(name) {
    var base = String(name || 'image').replace(/\.[^.]+$/, '');
    base = base.replace(/[\/\\:*?"<>|\x00-\x1F]+/g, '_').replace(/^\.+|\.+$/g, '').trim();
    return base || 'image';
  }

  function getOriginalExt(file) {
    var name = file ? (file.name || '') : (originalFile ? (originalFile.name || '') : '');
    var m = name.match(/\.([a-zA-Z0-9]+)$/);
    var ext = m ? m[1].toLowerCase() : '';
    if (ext) return ext;
    var mime = file ? file.type : (originalFile ? originalFile.type : '');
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

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / 1024 / 1024).toFixed(2) + 'MB';
  }

  var SAMPLE_PORTRAIT_SIZE = 240;

  /* ----- Modern Editorial Minimalist Sample Portrait Generator (240x240 Offscreen Canvas) ----- */
  function createSamplePortraitCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w || SAMPLE_PORTRAIT_SIZE;
    c.height = h || SAMPLE_PORTRAIT_SIZE;
    var cw = c.width;
    var ch = c.height;
    var ctx = c.getContext('2d');

    /* Soft pastel studio backdrop */
    var bg = ctx.createLinearGradient(0, 0, cw, ch);
    bg.addColorStop(0, '#eef2ff');
    bg.addColorStop(0.5, '#fce7f3');
    bg.addColorStop(1, '#fef3c7');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);

    /* Subtle warm studio halo behind character */
    var halo = ctx.createRadialGradient(cw * 0.5, ch * 0.45, cw * 0.06, cw * 0.5, ch * 0.45, cw * 0.46);
    halo.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
    halo.addColorStop(0.6, 'rgba(224, 231, 255, 0.36)');
    halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, cw, ch);

    /* Soft editorial geometric accent arc in background */
    ctx.fillStyle = 'rgba(129, 140, 248, 0.14)';
    ctx.beginPath();
    ctx.arc(cw * 0.78, ch * 0.25, cw * 0.16, 0, Math.PI * 2);
    ctx.fill();

    /* Modern minimalist sweater / shoulders */
    var coatGrad = ctx.createLinearGradient(cw * 0.25, ch * 0.72, cw * 0.75, ch);
    coatGrad.addColorStop(0, '#3b82f6');
    coatGrad.addColorStop(0.55, '#2563eb');
    coatGrad.addColorStop(1, '#1e40af');
    ctx.fillStyle = coatGrad;
    ctx.beginPath();
    ctx.moveTo(cw * 0.14, ch);
    ctx.quadraticCurveTo(cw * 0.20, ch * 0.74, cw * 0.50, ch * 0.74);
    ctx.quadraticCurveTo(cw * 0.80, ch * 0.74, cw * 0.86, ch);
    ctx.closePath();
    ctx.fill();

    /* Clean white crew collar accent */
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(cw * 0.50, ch * 0.755, cw * 0.115, ch * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Neck with gentle chin shadow */
    var neckGrad = ctx.createLinearGradient(0, ch * 0.61, 0, ch * 0.76);
    neckGrad.addColorStop(0, '#d99b7e');
    neckGrad.addColorStop(0.55, '#f2bfa2');
    neckGrad.addColorStop(1, '#f7cbb2');
    ctx.fillStyle = neckGrad;
    ctx.beginPath();
    ctx.moveTo(cw * 0.435, ch * 0.62);
    ctx.lineTo(cw * 0.565, ch * 0.62);
    ctx.lineTo(cw * 0.565, ch * 0.725);
    ctx.quadraticCurveTo(cw * 0.565, ch * 0.765, cw * 0.50, ch * 0.765);
    ctx.quadraticCurveTo(cw * 0.435, ch * 0.765, cw * 0.435, ch * 0.725);
    ctx.closePath();
    ctx.fill();

    /* Back hair volume silhouette */
    var hairDark = ctx.createLinearGradient(cw * 0.28, ch * 0.20, cw * 0.72, ch * 0.66);
    hairDark.addColorStop(0, '#312e81');
    hairDark.addColorStop(0.55, '#1e1b4b');
    hairDark.addColorStop(1, '#3730a3');
    ctx.fillStyle = hairDark;
    ctx.beginPath();
    ctx.ellipse(cw * 0.50, ch * 0.42, cw * 0.205, ch * 0.235, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Soft ears */
    ctx.fillStyle = '#efc0a4';
    ctx.beginPath();
    ctx.ellipse(cw * 0.34, ch * 0.495, cw * 0.028, ch * 0.045, 0, 0, Math.PI * 2);
    ctx.ellipse(cw * 0.66, ch * 0.495, cw * 0.028, ch * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Smooth editorial face oval with warm skin-tone gradient */
    var skinGrad = ctx.createRadialGradient(cw * 0.47, ch * 0.44, cw * 0.03, cw * 0.50, ch * 0.49, cw * 0.21);
    skinGrad.addColorStop(0, '#ffe4d4');
    skinGrad.addColorStop(0.68, '#f8cab0');
    skinGrad.addColorStop(1, '#eab193');
    ctx.fillStyle = skinGrad;
    ctx.beginPath();
    ctx.ellipse(cw * 0.50, ch * 0.48, cw * 0.155, ch * 0.195, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Subtle warm cheek blush */
    var blushL = ctx.createRadialGradient(cw * 0.415, ch * 0.535, 0, cw * 0.415, ch * 0.535, cw * 0.055);
    blushL.addColorStop(0, 'rgba(244, 114, 128, 0.34)');
    blushL.addColorStop(1, 'rgba(244, 114, 128, 0)');
    ctx.fillStyle = blushL;
    ctx.beginPath();
    ctx.arc(cw * 0.415, ch * 0.535, cw * 0.055, 0, Math.PI * 2);
    ctx.fill();

    var blushR = ctx.createRadialGradient(cw * 0.585, ch * 0.535, 0, cw * 0.585, ch * 0.535, cw * 0.055);
    blushR.addColorStop(0, 'rgba(244, 114, 128, 0.34)');
    blushR.addColorStop(1, 'rgba(244, 114, 128, 0)');
    ctx.fillStyle = blushR;
    ctx.beginPath();
    ctx.arc(cw * 0.585, ch * 0.535, cw * 0.055, 0, Math.PI * 2);
    ctx.fill();

    /* Stylish layered front hair swoop */
    ctx.fillStyle = hairDark;
    ctx.beginPath();
    ctx.moveTo(cw * 0.325, ch * 0.46);
    ctx.bezierCurveTo(cw * 0.32, ch * 0.21, cw * 0.64, ch * 0.17, cw * 0.68, ch * 0.44);
    ctx.bezierCurveTo(cw * 0.61, ch * 0.34, cw * 0.48, ch * 0.35, cw * 0.42, ch * 0.39);
    ctx.quadraticCurveTo(cw * 0.36, ch * 0.41, cw * 0.325, ch * 0.46);
    ctx.closePath();
    ctx.fill();

    /* Soft silky hair highlight ribbons */
    ctx.strokeStyle = 'rgba(165, 180, 252, 0.45)';
    ctx.lineWidth = Math.max(2, cw * 0.018);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cw * 0.40, ch * 0.275);
    ctx.quadraticCurveTo(cw * 0.52, ch * 0.235, cw * 0.62, ch * 0.295);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(199, 210, 254, 0.28)';
    ctx.lineWidth = Math.max(1.2, cw * 0.01);
    ctx.beginPath();
    ctx.moveTo(cw * 0.43, ch * 0.305);
    ctx.quadraticCurveTo(cw * 0.52, ch * 0.275, cw * 0.59, ch * 0.32);
    ctx.stroke();

    /* Clean minimalist eyebrows (no heavy blocks) */
    ctx.strokeStyle = '#312e81';
    ctx.lineWidth = Math.max(1.5, cw * 0.011);
    ctx.beginPath();
    ctx.moveTo(cw * 0.40, ch * 0.435);
    ctx.quadraticCurveTo(cw * 0.432, ch * 0.422, cw * 0.462, ch * 0.435);
    ctx.moveTo(cw * 0.538, ch * 0.435);
    ctx.quadraticCurveTo(cw * 0.568, ch * 0.422, cw * 0.60, ch * 0.435);
    ctx.stroke();

    /* Expressive minimalist eyes without harsh rings */
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(cw * 0.432, ch * 0.478, cw * 0.016, cw * 0.021, 0, 0, Math.PI * 2);
    ctx.ellipse(cw * 0.568, ch * 0.478, cw * 0.016, cw * 0.021, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Subtle eye catchlights */
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cw * 0.427, ch * 0.471, cw * 0.006, 0, Math.PI * 2);
    ctx.arc(cw * 0.563, ch * 0.471, cw * 0.006, 0, Math.PI * 2);
    ctx.fill();

    /* Subtle nose bridge shadow */
    ctx.strokeStyle = 'rgba(180, 110, 88, 0.45)';
    ctx.lineWidth = Math.max(1.2, cw * 0.008);
    ctx.beginPath();
    ctx.moveTo(cw * 0.502, ch * 0.485);
    ctx.quadraticCurveTo(cw * 0.512, ch * 0.525, cw * 0.495, ch * 0.536);
    ctx.stroke();

    /* Gentle warm smile */
    ctx.strokeStyle = '#c25959';
    ctx.lineWidth = Math.max(1.5, cw * 0.011);
    ctx.beginPath();
    ctx.arc(cw * 0.50, ch * 0.558, cw * 0.044, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.stroke();

    return c;
  }

  /* ----- Computer Vision / Image Processing Building Blocks ----- */

  /* Edge-preserving fast bilateral filter using precomputed range LUT */
  function bilateralFilter(src, w, h, radius, sigmaColor) {
    var out = new Uint8ClampedArray(src.length);
    var twoSigSq = 2 * sigmaColor * sigmaColor;
    var rangeLut = new Float32Array(768);
    for (var i = 0; i < 768; i++) {
      rangeLut[i] = Math.exp(-(i * i) / twoSigSq);
    }

    var step = radius >= 3 ? 2 : 1;
    var sigS = Math.max(1, radius * 0.85);
    var twoSigS = 2 * sigS * sigS;

    var offsets = [];
    var spatialWeights = [];
    for (var dy = -radius; dy <= radius; dy += step) {
      for (var dx = -radius; dx <= radius; dx += step) {
        offsets.push([dx, dy]);
        spatialWeights.push(Math.exp(-(dx * dx + dy * dy) / twoSigS));
      }
    }
    var kLen = offsets.length;

    for (var y = 0; y < h; y++) {
      var rowBase = y * w;
      for (var x = 0; x < w; x++) {
        var idx = (rowBase + x) * 4;
        var a = src[idx + 3];
        if (a < 8) {
          out[idx] = src[idx]; out[idx + 1] = src[idx + 1]; out[idx + 2] = src[idx + 2]; out[idx + 3] = a;
          continue;
        }
        var cr = src[idx], cg = src[idx + 1], cb = src[idx + 2];
        var sumR = 0, sumG = 0, sumB = 0, sumW = 0;

        for (var k = 0; k < kLen; k++) {
          var nx = x + offsets[k][0];
          var ny = y + offsets[k][1];
          if (nx < 0) nx = 0; else if (nx >= w) nx = w - 1;
          if (ny < 0) ny = 0; else if (ny >= h) ny = h - 1;
          var nIdx = (ny * w + nx) * 4;
          var nr = src[nIdx], ng = src[nIdx + 1], nb = src[nIdx + 2];
          var diff = Math.abs(nr - cr) + Math.abs(ng - cg) + Math.abs(nb - cb);
          if (diff > 767) diff = 767;
          var weight = spatialWeights[k] * rangeLut[diff];
          sumR += nr * weight;
          sumG += ng * weight;
          sumB += nb * weight;
          sumW += weight;
        }

        var invW = sumW > 0 ? 1 / sumW : 1;
        out[idx] = sumR * invW;
        out[idx + 1] = sumG * invW;
        out[idx + 2] = sumB * invW;
        out[idx + 3] = a;
      }
    }
    return out;
  }

  function computeLuminance(src, w, h) {
    var gray = new Float32Array(w * h);
    for (var i = 0, p = 0; i < gray.length; i++, p += 4) {
      gray[i] = 0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2];
    }
    return gray;
  }

  function boxBlurGray(gray, w, h, radius) {
    var tmp = new Float32Array(w * h);
    var out = new Float32Array(w * h);
    var win = radius * 2 + 1;

    for (var y = 0; y < h; y++) {
      var row = y * w;
      var acc = 0;
      for (var dx = -radius; dx <= radius; dx++) {
        var cx = dx < 0 ? 0 : (dx >= w ? w - 1 : dx);
        acc += gray[row + cx];
      }
      tmp[row] = acc / win;
      for (var x = 1; x < w; x++) {
        var addX = x + radius; if (addX >= w) addX = w - 1;
        var remX = x - radius - 1; if (remX < 0) remX = 0;
        acc += gray[row + addX] - gray[row + remX];
        tmp[row + x] = acc / win;
      }
    }

    for (var x2 = 0; x2 < w; x2++) {
      var acc2 = 0;
      for (var dy = -radius; dy <= radius; dy++) {
        var cy = dy < 0 ? 0 : (dy >= h ? h - 1 : dy);
        acc2 += tmp[cy * w + x2];
      }
      out[x2] = acc2 / win;
      for (var y2 = 1; y2 < h; y2++) {
        var addY = y2 + radius; if (addY >= h) addY = h - 1;
        var remY = y2 - radius - 1; if (remY < 0) remY = 0;
        acc2 += tmp[addY * w + x2] - tmp[remY * w + x2];
        out[y2 * w + x2] = acc2 / win;
      }
    }
    return out;
  }

  /* Returns soft ink edge darkness [0..1] (0 = background, 1 = solid ink line).
     For small preview thumbnails (isThumb = true), raises edge threshold and scales
     line opacity to ~0.6x so delicate facial contours never clump or blacken. */
  function detectInkEdges(src, w, h, detail, thickLines, isThumb) {
    var gray = computeLuminance(src, w, h);
    var smoothGray = boxBlurGray(gray, w, h, 1);
    var wideGray = boxBlurGray(gray, w, h, (!isThumb && thickLines) ? 3 : 2);
    var edgeMask = new Float32Array(w * h);

    var sensitivity = Math.max(0.1, detail / 100);
    var sobelThresh = isThumb ? (176 - sensitivity * 82) : (135 - sensitivity * 92);
    var dogBias = isThumb ? (13 - sensitivity * 6.0) : (9 - sensitivity * 6.5);
    var sobelDiv = isThumb ? 115 : 90;
    var dogDiv = isThumb ? 18 : 14;
    var lineOpacity = isThumb ? 0.6 : 1.0;

    for (var y = 1; y < h - 1; y++) {
      var r0 = (y - 1) * w;
      var r1 = y * w;
      var r2 = (y + 1) * w;
      for (var x = 1; x < w - 1; x++) {
        var p00 = smoothGray[r0 + x - 1], p01 = smoothGray[r0 + x], p02 = smoothGray[r0 + x + 1];
        var p10 = smoothGray[r1 + x - 1],                           p12 = smoothGray[r1 + x + 1];
        var p20 = smoothGray[r2 + x - 1], p21 = smoothGray[r2 + x], p22 = smoothGray[r2 + x + 1];

        var gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
        var gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;
        var mag = Math.abs(gx) + Math.abs(gy);

        var dog = wideGray[r1 + x] - smoothGray[r1 + x];
        var sScore = (mag - sobelThresh) / sobelDiv;
        var dScore = (dog - dogBias) / dogDiv;
        var score = Math.max(sScore, dScore);
        if (score > 0) {
          edgeMask[r1 + x] = (score > 1 ? 1 : score) * lineOpacity;
        }
      }
    }

    if (!isThumb && thickLines && detail >= 45) {
      var dilated = new Float32Array(edgeMask.length);
      for (var y2 = 1; y2 < h - 1; y2++) {
        for (var x2 = 1; x2 < w - 1; x2++) {
          var i = y2 * w + x2;
          var m = Math.max(
            edgeMask[i],
            edgeMask[i - 1] * 0.75,
            edgeMask[i + 1] * 0.75,
            edgeMask[i - w] * 0.75,
            edgeMask[i + w] * 0.75
          );
          dilated[i] = m;
        }
      }
      return dilated;
    }

    return edgeMask;
  }

  function applyCelQuantizeAndSat(buf, levels, satBoost, lift) {
    var lv = Math.max(2, levels);
    var step = 255 / (lv - 1);
    for (var i = 0; i < buf.length; i += 4) {
      var r = buf[i] + lift;
      var g = buf[i + 1] + lift;
      var b = buf[i + 2] + lift;
      var lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * satBoost;
      g = lum + (g - lum) * satBoost;
      b = lum + (b - lum) * satBoost;
      buf[i] = clamp255(Math.round(clamp255(r) / step) * step);
      buf[i + 1] = clamp255(Math.round(clamp255(g) / step) * step);
      buf[i + 2] = clamp255(Math.round(clamp255(b) / step) * step);
    }
  }

  /* Fast Kuwahara filter for authentic painterly watercolor blotches */
  function kuwaharaFilter(src, w, h, radius) {
    var out = new Uint8ClampedArray(src.length);
    var r = Math.max(1, radius);
    var qAreas = [
      [-r, 0, -r, 0],
      [0, r, -r, 0],
      [-r, 0, 0, r],
      [0, r, 0, r]
    ];

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var idx = (y * w + x) * 4;
        if (src[idx + 3] < 8) {
          out[idx] = src[idx]; out[idx + 1] = src[idx + 1]; out[idx + 2] = src[idx + 2]; out[idx + 3] = src[idx + 3];
          continue;
        }
        var bestVar = Infinity;
        var bestR = src[idx], bestG = src[idx + 1], bestB = src[idx + 2];

        for (var q = 0; q < 4; q++) {
          var x0 = qAreas[q][0], x1 = qAreas[q][1];
          var y0 = qAreas[q][2], y1 = qAreas[q][3];
          var sr = 0, sg = 0, sb = 0, sr2 = 0, sg2 = 0, sb2 = 0, cnt = 0;
          for (var dy = y0; dy <= y1; dy++) {
            var ny = y + dy;
            if (ny < 0) ny = 0; else if (ny >= h) ny = h - 1;
            for (var dx = x0; dx <= x1; dx++) {
              var nx = x + dx;
              if (nx < 0) nx = 0; else if (nx >= w) nx = w - 1;
              var nIdx = (ny * w + nx) * 4;
              var pr = src[nIdx], pg = src[nIdx + 1], pb = src[nIdx + 2];
              sr += pr; sg += pg; sb += pb;
              sr2 += pr * pr; sg2 += pg * pg; sb2 += pb * pb;
              cnt++;
            }
          }
          var mr = sr / cnt, mg = sg / cnt, mb = sb / cnt;
          var variance = (sr2 / cnt - mr * mr) + (sg2 / cnt - mg * mg) + (sb2 / cnt - mb * mb);
          if (variance < bestVar) {
            bestVar = variance;
            bestR = mr; bestG = mg; bestB = mb;
          }
        }
        out[idx] = clamp255(bestR);
        out[idx + 1] = clamp255(bestG);
        out[idx + 2] = clamp255(bestB);
        out[idx + 3] = src[idx + 3];
      }
    }
    return out;
  }

  /* Classic histogram-mode oil painting intensity clustering */
  function oilPaintFilter(src, w, h, radius, intensityBins) {
    var out = new Uint8ClampedArray(src.length);
    var bins = Math.max(4, Math.min(24, intensityBins));
    var countBin = new Int32Array(bins);
    var sumR = new Int32Array(bins);
    var sumG = new Int32Array(bins);
    var sumB = new Int32Array(bins);

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var idx = (y * w + x) * 4;
        if (src[idx + 3] < 8) {
          out[idx] = src[idx]; out[idx + 1] = src[idx + 1]; out[idx + 2] = src[idx + 2]; out[idx + 3] = src[idx + 3];
          continue;
        }
        countBin.fill(0); sumR.fill(0); sumG.fill(0); sumB.fill(0);

        for (var dy = -radius; dy <= radius; dy++) {
          var ny = y + dy;
          if (ny < 0) ny = 0; else if (ny >= h) ny = h - 1;
          for (var dx = -radius; dx <= radius; dx++) {
            var nx = x + dx;
            if (nx < 0) nx = 0; else if (nx >= w) nx = w - 1;
            var nIdx = (ny * w + nx) * 4;
            var nr = src[nIdx], ng = src[nIdx + 1], nb = src[nIdx + 2];
            var curBin = Math.min(bins - 1, (((nr + ng + nb) / 3) * bins / 256) | 0);
            countBin[curBin]++;
            sumR[curBin] += nr;
            sumG[curBin] += ng;
            sumB[curBin] += nb;
          }
        }

        var maxC = 0, bestB = 0;
        for (var b = 0; b < bins; b++) {
          if (countBin[b] > maxC) { maxC = countBin[b]; bestB = b; }
        }
        var d = maxC || 1;
        out[idx] = clamp255(sumR[bestB] / d);
        out[idx + 1] = clamp255(sumG[bestB] / d);
        out[idx + 2] = clamp255(sumB[bestB] / d);
        out[idx + 3] = src[idx + 3];
      }
    }
    return out;
  }

  /* ----- Style Pipeline Dispatcher (All 12 Styles) ----- */
  function renderCartoonStyle(srcData, w, h, styleId, opts, isThumb) {
    var src = srcData.data;
    var detail = opts.detail;
    var levels = opts.levels;
    var mix = Math.max(0, Math.min(1, opts.strength / 100));
    var out = new Uint8ClampedArray(src.length);

    var smoothR = isThumb ? 1 : 2;

    if (styleId === 'classic') {
      /* 1. Classic 2D Cartoon: Bilateral smooth -> Vibrant cel-shading -> Crisp black ink ON TOP */
      var smoothed = bilateralFilter(src, w, h, smoothR, 42);
      applyCelQuantizeAndSat(smoothed, levels, 1.24, 4);
      var edges = detectInkEdges(src, w, h, detail, !isThumb, isThumb);
      for (var i = 0, p = 0; i < edges.length; i++, p += 4) {
        var e = edges[i];
        out[p]     = smoothed[p]     * (1 - e) + 18 * e;
        out[p + 1] = smoothed[p + 1] * (1 - e) + 21 * e;
        out[p + 2] = smoothed[p + 2] * (1 - e) + 31 * e;
        out[p + 3] = src[p + 3];
      }
    } else if (styleId === 'anime') {
      /* 2. Anime Glow: Silky bilateral skin + luminous highlights + fine dark contours */
      var aBuf = bilateralFilter(src, w, h, isThumb ? 2 : 3, 52);
      applyCelQuantizeAndSat(aBuf, Math.min(16, levels + 2), 1.32, 12);
      var aEdges = detectInkEdges(src, w, h, detail * 0.9, false, isThumb);
      for (var i2 = 0, p2 = 0; i2 < aEdges.length; i2++, p2 += 4) {
        var ae = aEdges[i2] * 0.85;
        out[p2]     = aBuf[p2]     * (1 - ae) + 34 * ae;
        out[p2 + 1] = aBuf[p2 + 1] * (1 - ae) + 27 * ae;
        out[p2 + 2] = aBuf[p2 + 2] * (1 - ae) + 54 * ae;
        out[p2 + 3] = src[p2 + 3];
      }
    } else if (styleId === 'comic') {
      /* 3. Comic Book (Halftone): Vibrant CMYK pop + Ben-Day halftone dots + bold ink */
      var cBuf = bilateralFilter(src, w, h, smoothR, 40);
      applyCelQuantizeAndSat(cBuf, Math.max(3, levels - 1), 1.36, 6);
      var cEdges = detectInkEdges(src, w, h, Math.min(100, detail + 14), !isThumb, isThumb);
      var cell = isThumb ? 4 : Math.max(5, Math.round(Math.min(w, h) / 110));
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var ci = y * w + x;
          var cp = ci * 4;
          var cr = cBuf[cp], cg = cBuf[cp + 1], cb = cBuf[cp + 2];
          var lum = (0.299 * cr + 0.587 * cg + 0.114 * cb) / 255;

          var gx = ((x + (y & 1 ? 0 : cell * 0.5)) % cell) - cell * 0.5;
          var gy = (y % cell) - cell * 0.5;
          var dist = Math.hypot(gx, gy) / (cell * 0.5);
          var dotR = (1 - lum) * 0.78;
          if (lum < 0.72 && dist < dotR) {
            cr *= 0.72; cg *= 0.72; cb *= 0.72;
          }
          var ce = cEdges[ci];
          out[cp]     = cr * (1 - ce) + 12 * ce;
          out[cp + 1] = cg * (1 - ce) + 14 * ce;
          out[cp + 2] = cb * (1 - ce) + 22 * ce;
          out[cp + 3] = src[cp + 3];
        }
      }
    } else if (styleId === 'soft_toon') {
      /* 4. 3D / Soft Toon: Double bilateral creamy shading + warm specular & soft AO */
      var s1 = bilateralFilter(src, w, h, isThumb ? 2 : 3, 56);
      var s2 = bilateralFilter(s1, w, h, isThumb ? 1 : 2, 46);
      applyCelQuantizeAndSat(s2, Math.min(16, levels + 3), 1.20, 8);
      var sEdges = detectInkEdges(s1, w, h, detail, false, isThumb);
      for (var si = 0, sp = 0; si < sEdges.length; si++, sp += 4) {
        var ao = 1 - sEdges[si] * 0.34;
        out[sp]     = clamp255(s2[sp] * ao + 4);
        out[sp + 1] = clamp255(s2[sp + 1] * ao + 2);
        out[sp + 2] = clamp255(s2[sp + 2] * ao);
        out[sp + 3] = src[sp + 3];
      }
    } else if (styleId === 'pencil') {
      /* 5. Pencil Sketch: Color-dodge graphite shading + fine hatch on warm paper */
      var grayP = computeLuminance(src, w, h);
      var inv = new Float32Array(grayP.length);
      for (var gi = 0; gi < grayP.length; gi++) inv[gi] = 255 - grayP[gi];
      var blurInv = boxBlurGray(inv, w, h, isThumb ? 3 : 6);
      var strengthFactor = (isThumb ? 0.62 : 0.75) + (detail / 100) * (isThumb ? 0.42 : 0.6);
      for (var py = 0; py < h; py++) {
        for (var px = 0; px < w; px++) {
          var pi = py * w + px;
          var pp = pi * 4;
          var denom = Math.max(8, 256 - blurInv[pi]);
          var dodge = Math.min(255, (grayP[pi] * 255) / denom);
          var tone = 255 - (255 - dodge) * strengthFactor;
          /* Subtle diagonal graphite hatch in shadows */
          if (grayP[pi] < 130 && ((px + py) % 4 === 0)) {
            tone -= (130 - grayP[pi]) * (isThumb ? 0.1 : 0.16);
          }
          tone = clamp255(tone);
          out[pp]     = clamp255(tone * 0.99);
          out[pp + 1] = clamp255(tone * 0.985);
          out[pp + 2] = clamp255(tone * 0.965);
          out[pp + 3] = src[pp + 3];
        }
      }
    } else if (styleId === 'color_pencil') {
      /* 6. Colored Pencil: Pastel hand-drawn fill + directional texture + graphite lines */
      var cpBuf = bilateralFilter(src, w, h, smoothR, 38);
      applyCelQuantizeAndSat(cpBuf, Math.max(4, levels + 1), 0.92, 20);
      var cpEdges = detectInkEdges(src, w, h, detail, false, isThumb);
      for (var cy = 0; cy < h; cy++) {
        for (var cx = 0; cx < w; cx++) {
          var cpi = cy * w + cx;
          var cpp = cpi * 4;
          var grain = (((cx * 2 + cy) % 5) - 2) * 4;
          var edgeDark = 1 - cpEdges[cpi] * 0.65;
          out[cpp]     = clamp255((cpBuf[cpp] + grain) * edgeDark);
          out[cpp + 1] = clamp255((cpBuf[cpp + 1] + grain) * edgeDark);
          out[cpp + 2] = clamp255((cpBuf[cpp + 2] + grain) * edgeDark);
          out[cpp + 3] = src[cpp + 3];
        }
      }
    } else if (styleId === 'ink_pen') {
      /* 7. Ink & Pen Art: High-contrast monochrome ink brush + cross-hatching */
      var inkGray = computeLuminance(src, w, h);
      var localMean = boxBlurGray(inkGray, w, h, isThumb ? 3 : 6);
      var inkEdges = detectInkEdges(src, w, h, Math.min(100, detail + 18), false, isThumb);
      var bias = (50 - detail) * 0.25;
      var inkThresh = isThumb ? 0.24 : 0.35;
      var lumDelta = isThumb ? 13 : 9;
      var floorInk = isThumb ? 40 : 48;
      for (var iy = 0; iy < h; iy++) {
        for (var ix = 0; ix < w; ix++) {
          var ii = iy * w + ix;
          var ip = ii * 4;
          var g = inkGray[ii];
          var lm = localMean[ii];
          var isInk = inkEdges[ii] > inkThresh || g < lm - lumDelta - bias || g < floorInk;
          var isHatch = !isInk && g < 115 && ((ix + iy) % 4 === 0);
          var isCross = !isInk && g < 78 && ((ix - iy + 1024) % 4 === 0);
          var val = (isInk || isHatch || isCross) ? 22 : 251;
          out[ip] = val; out[ip + 1] = val; out[ip + 2] = val + (val < 50 ? 6 : 2);
          out[ip + 3] = src[ip + 3];
        }
      }
    } else if (styleId === 'watercolor') {
      /* 8. Watercolor Art: Kuwahara pigment pools + wet edge darkening + paper tooth */
      var wBuf = kuwaharaFilter(src, w, h, isThumb ? 1 : 2);
      applyCelQuantizeAndSat(wBuf, Math.min(16, levels + 2), 1.18, 10);
      var wEdges = detectInkEdges(wBuf, w, h, detail * 0.65, false, isThumb);
      for (var wy = 0; wy < h; wy++) {
        for (var wx = 0; wx < w; wx++) {
          var wi = wy * w + wx;
          var wp = wi * 4;
          var rim = 1 - wEdges[wi] * 0.32;
          var paper = (((wx * 7 + wy * 13) % 7) - 3) * 1.5;
          out[wp]     = clamp255(wBuf[wp] * rim + paper);
          out[wp + 1] = clamp255(wBuf[wp + 1] * rim + paper);
          out[wp + 2] = clamp255(wBuf[wp + 2] * rim + paper);
          out[wp + 3] = src[wp + 3];
        }
      }
    } else if (styleId === 'oil_paint') {
      /* 9. Oil Painting: Histogram mode painterly brush clustering + rich saturation */
      var oilR = isThumb ? 2 : 3;
      var oilBuf = oilPaintFilter(src, w, h, oilR, Math.max(6, levels + 4));
      applyCelQuantizeAndSat(oilBuf, 16, 1.28, -2);
      for (var oy = 0; oy < h; oy++) {
        for (var ox = 0; ox < w; ox++) {
          var op = (oy * w + ox) * 4;
          var weave = ((ox % 4 === 0) ? 4 : 0) + ((oy % 4 === 0) ? -4 : 0);
          out[op]     = clamp255(oilBuf[op] + weave);
          out[op + 1] = clamp255(oilBuf[op + 1] + weave);
          out[op + 2] = clamp255(oilBuf[op + 2] + weave);
          out[op + 3] = src[op + 3];
        }
      }
    } else if (styleId === 'pop_art') {
      /* 10. Pop Art Poster: High-contrast Andy Warhol graphic screenprint palette */
      var popSmooth = bilateralFilter(src, w, h, smoothR, 45);
      var popEdges = detectInkEdges(src, w, h, Math.min(100, detail + 10), !isThumb, isThumb);
      var palette = [
        [15, 23, 42],    /* Deep navy ink */
        [244, 63, 94],   /* Hot coral red */
        [6, 182, 212],   /* Electric cyan */
        [250, 204, 21],  /* Pop yellow */
        [253, 244, 255]  /* Crisp highlight */
      ];
      var pCount = Math.max(3, Math.min(palette.length, Math.round(levels / 3) + 2));
      for (var pi2 = 0, pp2 = 0; pi2 < popEdges.length; pi2++, pp2 += 4) {
        var pr = popSmooth[pp2], pg = popSmooth[pp2 + 1], pb = popSmooth[pp2 + 2];
        var l = (0.299 * pr + 0.587 * pg + 0.114 * pb) / 255;
        var slot = Math.min(pCount - 1, Math.floor(l * pCount));
        var col = palette[slot];
        var pe = popEdges[pi2];
        out[pp2]     = col[0] * (1 - pe) + 15 * pe;
        out[pp2 + 1] = col[1] * (1 - pe) + 23 * pe;
        out[pp2 + 2] = col[2] * (1 - pe) + 42 * pe;
        out[pp2 + 3] = src[pp2 + 3];
      }
    } else if (styleId === 'neon_toon') {
      /* 11. Neon Line-Art: Glowing cyan/magenta electric ink outlines on midnight backdrop */
      var nEdges = detectInkEdges(src, w, h, Math.min(100, detail + 16), !isThumb, isThumb);
      var glow = boxBlurGray(nEdges, w, h, isThumb ? 2 : 3);
      var coreScale = isThumb ? 1.45 : 1.0;
      for (var ny = 0; ny < h; ny++) {
        for (var nx = 0; nx < w; nx++) {
          var ni = ny * w + nx;
          var np = ni * 4;
          var tGrad = (nx / Math.max(1, w - 1) + ny / Math.max(1, h - 1)) * 0.5;
          var core = Math.min(1, nEdges[ni] * coreScale);
          var halo = Math.min(1, glow[ni] * 2.2);

          var neonR = 34 + (244 - 34) * tGrad;
          var neonG = 211 + (63 - 211) * tGrad;
          var neonB = 238 + (180 - 238) * tGrad;

          out[np]     = clamp255(9 + neonR * halo * 0.8 + 220 * core);
          out[np + 1] = clamp255(13 + neonG * halo * 0.8 + 230 * core);
          out[np + 2] = clamp255(26 + neonB * halo * 0.8 + 255 * core);
          out[np + 3] = src[np + 3];
        }
      }
    } else {
      /* 12. pixel_art — 8-Bit Pixel Art: Crisp pixel-grid downsampling + arcade palette */
      var blockScale = Math.max(2, Math.round(3 + (100 - detail) * 0.1));
      var block = isThumb ? Math.max(3, Math.round(blockScale * 0.55)) : Math.max(4, Math.round(blockScale * Math.max(1, Math.min(w, h) / 420)));
      var lvP = Math.max(3, levels);
      var stepP = 255 / (lvP - 1);

      for (var by = 0; by < h; by += block) {
        var yEnd = Math.min(h, by + block);
        for (var bx = 0; bx < w; bx += block) {
          var xEnd = Math.min(w, bx + block);
          var sr2 = 0, sg2 = 0, sb2 = 0, sa2 = 0, cnt2 = 0;
          for (var yy = by; yy < yEnd; yy++) {
            for (var xx = bx; xx < xEnd; xx++) {
              var si2 = (yy * w + xx) * 4;
              sr2 += src[si2]; sg2 += src[si2 + 1]; sb2 += src[si2 + 2]; sa2 += src[si2 + 3];
              cnt2++;
            }
          }
          var mr = sr2 / cnt2, mg = sg2 / cnt2, mb = sb2 / cnt2;
          var lumP = 0.299 * mr + 0.587 * mg + 0.114 * mb;
          mr = lumP + (mr - lumP) * 1.3;
          mg = lumP + (mg - lumP) * 1.3;
          mb = lumP + (mb - lumP) * 1.3;
          var qr = clamp255(Math.round(clamp255(mr) / stepP) * stepP);
          var qg = clamp255(Math.round(clamp255(mg) / stepP) * stepP);
          var qb = clamp255(Math.round(clamp255(mb) / stepP) * stepP);
          var qa = Math.round(sa2 / cnt2);

          for (var yy2 = by; yy2 < yEnd; yy2++) {
            for (var xx2 = bx; xx2 < xEnd; xx2++) {
              var di = (yy2 * w + xx2) * 4;
              out[di] = qr; out[di + 1] = qg; out[di + 2] = qb; out[di + 3] = qa;
            }
          }
        }
      }
    }

    /* Smooth Effect Strength blend (0%..100%) between original & stylized */
    if (mix < 0.999) {
      var invMix = 1 - mix;
      for (var k = 0; k < out.length; k += 4) {
        out[k]     = out[k] * mix + src[k] * invMix;
        out[k + 1] = out[k + 1] * mix + src[k + 1] * invMix;
        out[k + 2] = out[k + 2] * mix + src[k + 2] * invMix;
      }
    }

    return new ImageData(out, w, h);
  }

  /* ----- Thumbnail Gallery Construction & Live Rendering ----- */
  function buildStyleGallery() {
    if (!styleGrid) return;
    while (styleGrid.firstChild) styleGrid.removeChild(styleGrid.firstChild);
    thumbCards = {};

    STYLES.forEach(function (st) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cartoon-style-card' + (st.id === activeStyle ? ' active' : '');
      btn.setAttribute('data-style', st.id);
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', st.id === activeStyle ? 'true' : 'false');

      var thumbCanvas = document.createElement('canvas');
      thumbCanvas.className = 'cartoon-style-thumb';
      thumbCanvas.width = THUMB_W;
      thumbCanvas.height = THUMB_H;

      var label = document.createElement('span');
      label.className = 'cartoon-style-name';
      label.setAttribute('data-i18n', st.key);
      label.textContent = t(st.key);

      btn.appendChild(thumbCanvas);
      btn.appendChild(label);

      btn.addEventListener('click', function () {
        selectStyle(st.id, true);
      });

      styleGrid.appendChild(btn);
      thumbCards[st.id] = { btn: btn, canvas: thumbCanvas };
    });
  }

  function renderAllThumbnails(sourceCanvasOrImg) {
    var srcEl = sourceCanvasOrImg;
    if (!srcEl) {
      if (!samplePortraitCanvas) {
        samplePortraitCanvas = createSamplePortraitCanvas(SAMPLE_PORTRAIT_SIZE, SAMPLE_PORTRAIT_SIZE);
      }
      srcEl = samplePortraitCanvas;
    }

    var sw = srcEl.naturalWidth || srcEl.width || THUMB_W;
    var sh = srcEl.naturalHeight || srcEl.height || THUMB_H;
    var scale = Math.max(THUMB_W / sw, THUMB_H / sh);
    var drawW = sw * scale;
    var drawH = sh * scale;
    var dx = (THUMB_W - drawW) / 2;
    var dy = (THUMB_H - drawH) / 2;

    var baseCanvas = document.createElement('canvas');
    baseCanvas.width = THUMB_W;
    baseCanvas.height = THUMB_H;
    var bctx = baseCanvas.getContext('2d');
    bctx.imageSmoothingEnabled = true;
    bctx.imageSmoothingQuality = 'high';
    bctx.drawImage(srcEl, dx, dy, drawW, drawH);
    var baseImgData = bctx.getImageData(0, 0, THUMB_W, THUMB_H);

    STYLES.forEach(function (st) {
      var card = thumbCards[st.id];
      if (!card || !card.canvas) return;
      var stylized = renderCartoonStyle(baseImgData, THUMB_W, THUMB_H, st.id, {
        strength: 100,
        detail: st.detail,
        levels: st.levels
      }, true);
      var cctx = card.canvas.getContext('2d');
      cctx.putImageData(stylized, 0, 0);
    });

    baseCanvas.width = 0;
    baseCanvas.height = 0;
  }

  function syncStyleCardsUI() {
    STYLES.forEach(function (st) {
      var card = thumbCards[st.id];
      if (!card || !card.btn) return;
      var isAct = st.id === activeStyle;
      card.btn.classList.toggle('active', isAct);
      card.btn.setAttribute('aria-checked', isAct ? 'true' : 'false');
    });
  }

  function syncSlidersUI() {
    if (strengthEl) strengthEl.value = String(strength);
    if (strengthVal) strengthVal.textContent = strength + '%';
    if (edgeEl) edgeEl.value = String(detailIntensity);
    if (edgeVal) edgeVal.textContent = String(detailIntensity);
    if (levelsEl) levelsEl.value = String(colorLevels);
    if (lvlVal) lvlVal.textContent = String(colorLevels);
  }

  function selectStyle(styleId, adaptSliders) {
    var def = STYLES.find(function (s) { return s.id === styleId; }) || STYLES[0];
    activeStyle = def.id;
    if (adaptSliders) {
      detailIntensity = def.detail;
      colorLevels = def.levels;
      if (strength === 0) strength = 100;
      syncSlidersUI();
    }
    syncStyleCardsUI();
    if (originalImage) {
      schedulePreviewRender(false);
    }
  }

  /* ----- Main Preview & Debounced Rendering ----- */
  function renderPreviewNow(showToastMsg) {
    if (!originalImage || !workImageData || !afterCanvas) return;
    var w = workCanvas.width;
    var h = workCanvas.height;
    if (!w || !h) return;

    var outData = renderCartoonStyle(workImageData, w, h, activeStyle, {
      strength: strength,
      detail: detailIntensity,
      levels: colorLevels
    }, false);

    afterCanvas.width = w;
    afterCanvas.height = h;
    var actx = afterCanvas.getContext('2d');
    actx.putImageData(outData, 0, 0);

    if (showToastMsg) {
      toast(t('tc_done'), 'ok');
    }
  }

  function schedulePreviewRender(showToastMsg) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(function () {
      requestAnimationFrame(function () {
        renderPreviewNow(showToastMsg);
      });
    }, showToastMsg ? 0 : 75);
  }

  /* ----- Before / After Interactive Comparison Slider ----- */
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
  function loadFile(file) {
    if (!validateFile(file)) return;
    var seq = ++loadSeq;
    revokeObjectUrl();
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
      workImageData = wctx.getImageData(0, 0, w, h);

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

  function resetAll() {
    if (!originalImage) return;
    clearTimeout(renderTimer);
    activeStyle = 'classic';
    strength = 100;
    detailIntensity = STYLES[0].detail;
    colorLevels = STYLES[0].levels;
    syncSlidersUI();
    syncStyleCardsUI();
    setSlider(50);
    renderPreviewNow(false);
    toast(t('tc_reset'), 'ok');
  }

  function clearAll() {
    clearTimeout(renderTimer);
    loadSeq++;
    revokeObjectUrl();

    originalFile = null;
    originalImage = null;
    workImageData = null;
    currentFileName = 'image';

    workCanvas.width = 0;
    workCanvas.height = 0;

    if (beforeCanvas) {
      beforeCanvas.width = 0;
      beforeCanvas.height = 0;
    }
    if (afterCanvas) {
      afterCanvas.width = 0;
      afterCanvas.height = 0;
    }
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

    renderAllThumbnails(null);
  }

  function downloadResult() {
    if (!originalFile || !originalImage) {
      toast(t('tc_load_first'), 'err');
      return;
    }

    var fmt = getExportFormat();
    var filename = sanitizeFilenameBase(currentFileName) + '_cartoon_imgsfix.' + fmt.ext;
    var natW = originalImage.naturalWidth || originalImage.width;
    var natH = originalImage.naturalHeight || originalImage.height;

    /* Export directly if native dims match preview, otherwise render full-res once */
    var exportCanvas = afterCanvas;
    var isTemp = false;

    if (natW !== workCanvas.width || natH !== workCanvas.height) {
      /* Guard massive ultra-res exports cleanly */
      var capScale = Math.min(1, 3200 / Math.max(natW, natH));
      var ew = Math.max(1, Math.round(natW * capScale));
      var eh = Math.max(1, Math.round(natH * capScale));
      exportCanvas = document.createElement('canvas');
      exportCanvas.width = ew;
      exportCanvas.height = eh;
      isTemp = true;

      var ectx = exportCanvas.getContext('2d');
      ectx.imageSmoothingEnabled = true;
      ectx.imageSmoothingQuality = 'high';
      ectx.drawImage(originalImage, 0, 0, ew, eh);
      var fullData = ectx.getImageData(0, 0, ew, eh);
      var styledFull = renderCartoonStyle(fullData, ew, eh, activeStyle, {
        strength: strength,
        detail: detailIntensity,
        levels: colorLevels
      }, false);
      ectx.putImageData(styledFull, 0, 0);
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

  /* ----- Event Bindings ----- */
  if (strengthEl) {
    strengthEl.addEventListener('input', function () {
      strength = parseInt(strengthEl.value, 10) || 0;
      if (strengthVal) strengthVal.textContent = strength + '%';
      if (originalImage) schedulePreviewRender(false);
    });
  }
  if (edgeEl) {
    edgeEl.addEventListener('input', function () {
      detailIntensity = parseInt(edgeEl.value, 10) || 0;
      if (edgeVal) edgeVal.textContent = String(detailIntensity);
      if (originalImage) schedulePreviewRender(false);
    });
  }
  if (levelsEl) {
    levelsEl.addEventListener('input', function () {
      colorLevels = Math.max(2, parseInt(levelsEl.value, 10) || 6);
      if (lvlVal) lvlVal.textContent = String(colorLevels);
      if (originalImage) schedulePreviewRender(false);
    });
  }

  if (btnApply) {
    btnApply.addEventListener('click', function () {
      if (!originalImage) { toast(t('tc_load_first'), 'err'); return; }
      renderPreviewNow(true);
    });
  }
  if (btnDownload) btnDownload.addEventListener('click', downloadResult);
  if (btnReset) btnReset.addEventListener('click', resetAll);
  if (btnClear) btnClear.addEventListener('click', clearAll);

  /* Upload entry points & paste */
  [emptyState, dropZone].forEach(function (target) {
    if (!target) return;
    target.addEventListener('click', function () { if (fileInput) fileInput.click(); });
    target.addEventListener('dragover', function (e) { e.preventDefault(); target.classList.add('drag'); });
    target.addEventListener('dragleave', function () { target.classList.remove('drag'); });
    target.addEventListener('drop', function (e) {
      e.preventDefault(); target.classList.remove('drag');
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
    clearTimeout(renderTimer);
    revokeObjectUrl();
  });

  /* ----- Initialize Gallery & Vector Portrait Thumbnails ----- */
  buildStyleGallery();
  syncSlidersUI();
  renderAllThumbnails(null);
  initBeforeAfterSlider();
})();

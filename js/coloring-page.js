/* imgsfix — coloring-page.js
   100% client-side Photo to Coloring Page Studio:
   - 4 HTML5 Canvas line-art algorithms (Classic Kids, Bold Comic Ink, Artistic Pencil Sketch, Detailed Mandala)
   - On-demand lazy local AI subject isolation (@imgly/background-removal, isnet_fp16, GPU->CPU fallback)
   - Real-time Line Thickness & Background Whiteness / Denoise sliders
   - Interactive White Clean-Up Eraser brush with 25-step dirty-rect Undo
   - Printable 300 DPI sheets (A4 Portrait/Landscape, US Letter, Square 1:1)
   - Decorative border frames (Classic Double, Scalloped Kids, Corner Stars, Rounded Clean)
   - Custom top header title / child's name (Cairo AR / Luckiest Guy EN) in Colorable Outline or Solid Ink
   - Direct Print (window.print), 300 DPI PDF (jsPDF), High-Res PNG, JPG exports
*/
'use strict';

import { removeBackground } from '@imgly/background-removal';
import { jsPDF } from 'jspdf';

(function () {
  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = I.$$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  /* ----- Constants ----- */
  var MAX_FILE_BYTES = 30 * 1024 * 1024;
  var MAX_IMAGE_DIM = 12000;
  var MAX_WORK_DIM = 1400;
  var MAX_UNDO = 25;
  var ALLOWED_MIMES = {
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/bmp': true,
    'image/gif': true,
  };

  var STYLE_LABELS = {
    classic: 'cp_style_classic_t',
    comic: 'cp_style_comic_t',
    pencil: 'cp_style_pencil_t',
    mandala: 'cp_style_mandala_t',
  };

  var PAPER_FORMATS = {
    a4p:    { id: 'a4p',    labelKey: 'cp_paper_a4p',    wMm: 210,   hMm: 297,   wPx: 2480, hPx: 3508 },
    a4l:    { id: 'a4l',    labelKey: 'cp_paper_a4l',    wMm: 297,   hMm: 210,   wPx: 3508, hPx: 2480 },
    letter: { id: 'letter', labelKey: 'cp_paper_letter', wMm: 215.9, hMm: 279.4, wPx: 2550, hPx: 3300 },
    square: { id: 'square', labelKey: 'cp_paper_square', wMm: 210,   hMm: 210,   wPx: 2480, hPx: 2480 },
  };

  /* ----- DOM Elements ----- */
  var cpActiveStylePill = $('#cpActiveStylePill');
  var cpSpecMeta = $('#cpSpecMeta');
  var btnReplacePhoto = $('#btnReplacePhoto');
  var btnOpenExportModal = $('#btnOpenExportModal');
  var cpViewport = $('#cpViewport');
  var cpEmptyState = $('#cpEmptyState');
  var btnUploadEmpty = $('#btnUploadEmpty');
  var cpPaperWrap = $('#cpPaperWrap');
  var cpMainCanvas = $('#cpMainCanvas');
  var cpBrushCursor = $('#cpBrushCursor');
  var cpAiOverlay = $('#cpAiOverlay');
  var cpAiStatusText = $('#cpAiStatusText');
  var cpFileInput = $('#cpFileInput');

  /* Mobile Quickbar & Footer */
  var btnMqDownload = $('#btnMqDownload');
  var btnMqPeek = $('#btnMqPeek');
  var btnMqEraser = $('#btnMqEraser');
  var btnMqUndo = $('#btnMqUndo');
  var btnStagePeek = $('#btnStagePeek');
  var btnStageEraser = $('#btnStageEraser');
  var btnStageUndo = $('#btnStageUndo');
  var btnResetAll = $('#btnResetAll');
  var btnClearAll = $('#btnClearAll');

  /* Tabs & Panes */
  var dockTabs = $$('.cp-dock-tab');
  var dockPanes = $$('.cp-step-pane');

  /* Tab 1: Style & AI Isolation */
  var styleCards = $$('.cp-style-card', $('#cpStyleGrid'));
  var btnIsolateSubject = $('#btnIsolateSubject');
  var btnRestoreFullBg = $('#btnRestoreFullBg');

  /* Tab 2: Refine & Clean-Up */
  var cpThickness = $('#cpThickness');
  var cpThicknessVal = $('#cpThicknessVal');
  var cpDenoise = $('#cpDenoise');
  var cpDenoiseVal = $('#cpDenoiseVal');
  var btnToggleEraser = $('#btnToggleEraser');
  var cpEraserSize = $('#cpEraserSize');
  var cpEraserSizeVal = $('#cpEraserSizeVal');
  var btnUndoEraser = $('#btnUndoEraser');
  var btnClearEraser = $('#btnClearEraser');

  /* Tab 3: Page & Title */
  var paperBtns = $$('.cp-paper-btn', $('#cpPaperGrid'));
  var cpFrameToggle = $('#cpFrameToggle');
  var frameStyleBtns = $$('.cp-chip-btn[data-fstyle]', $('#cpFrameStyleRow'));
  var cpCustomTitle = $('#cpCustomTitle');
  var titleStyleBtns = $$('.cp-chip-btn[data-tstyle]', $('#cpTitleStyleRow'));

  /* Export & Print Modal */
  var cpExportModal = $('#cpExportModal');
  var btnCloseExportModal = $('#btnCloseExportModal');
  var cpExportSummary = $('#cpExportSummary');
  var btnDirectPrint = $('#btnDirectPrint');
  var btnExportPdf = $('#btnExportPdf');
  var btnExportPng = $('#btnExportPng');
  var btnExportJpg = $('#btnExportJpg');

  /* ----- Offscreen Canvases ----- */
  var workCanvas = document.createElement('canvas');
  var workCtx = workCanvas.getContext('2d');
  var lineArtCanvas = document.createElement('canvas');
  var lineArtCtx = lineArtCanvas.getContext('2d');
  var eraserCanvas = document.createElement('canvas');
  var eraserCtx = eraserCanvas.getContext('2d');

  /* ----- Application State ----- */
  var state = {
    currentFile: null,
    currentFileName: 'coloring-page',
    objectURL: null,
    originalImage: null,
    origWidth: 0,
    origHeight: 0,
    workW: 0,
    workH: 0,
    workRgb: null,
    isoMaskAlpha: null,
    useIsolated: false,
    isProcessingAi: false,
    loadGen: 0,

    styleId: 'classic', /* classic | comic | pencil | mandala */
    thickness: 4,
    denoise: 45,

    eraserActive: false,
    eraserSize: 32,
    isErasing: false,
    lastErasePt: null,
    strokeBBox: null,
    preStrokeSnapshot: null,
    undoStack: [],

    paperId: 'a4p',
    showFrame: true,
    frameStyle: 'classic', /* classic | scallop | stars | rounded */
    customTitle: '',
    titleStyle: 'outline', /* outline | solid */

    artRect: { x: 0, y: 0, w: 0, h: 0 },
    isPeeking: false,
  };

  var activeDevice = 'cpu';
  var lineArtRaf = 0;
  var sheetRaf = 0;

  /* ----- Helpers ----- */
  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function sanitizeFilenameBase(name) {
    var base = String(name || 'coloring-page').replace(/\.[^.]+$/, '');
    var cleaned = base.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]+/g, '-').replace(/^-+|-+$/g, '');
    return cleaned ? cleaned.slice(0, 60) : 'coloring-page';
  }

  function revokeObjectUrl() {
    if (state.objectURL) {
      try { URL.revokeObjectURL(state.objectURL); } catch (_e) {}
      state.objectURL = null;
    }
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

  function isValidImageFile(file) {
    if (!file) return false;
    var mime = (file.type || '').toLowerCase();
    var hasValidExt = /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name || '');
    if (!ALLOWED_MIMES[mime] && !hasValidExt) {
      toast(t('tc_img_only'), 'err');
      return false;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast(t('tc_file_too_large'), 'err');
      return false;
    }
    return true;
  }

  function containsArabic(str) {
    return /[\u0600-\u06FF]/.test(str || '');
  }

  function getPaperSpec() {
    return PAPER_FORMATS[state.paperId] || PAPER_FORMATS.a4p;
  }

  function syncDocumentMeta() {
    var titleText = t('t_coloring_t') + ' — imgsfix';
    if (titleText) document.title = titleText;
    var descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', t('cp_meta_desc'));
    if (cpCustomTitle) {
      cpCustomTitle.setAttribute('placeholder', t('cp_title_ph'));
    }
  }

  function updateSpecUI() {
    var paper = getPaperSpec();
    var styleKey = STYLE_LABELS[state.styleId] || 'cp_style_classic_t';
    if (cpActiveStylePill) {
      cpActiveStylePill.setAttribute('data-i18n', styleKey);
      cpActiveStylePill.textContent = t(styleKey);
    }
    var summaryText = t(paper.labelKey) + ' · ' + paper.wPx + ' × ' + paper.hPx + ' px · 300 DPI';
    if (cpSpecMeta) cpSpecMeta.textContent = summaryText;
    if (cpExportSummary) cpExportSummary.textContent = summaryText;
  }

  function syncUndoButtons() {
    var hasImg = !!state.originalImage && !state.isProcessingAi;
    var canUndo = hasImg && state.undoStack.length > 0;
    if (btnStageUndo) btnStageUndo.disabled = !canUndo;
    if (btnUndoEraser) btnUndoEraser.disabled = !canUndo;
    if (btnMqUndo) btnMqUndo.disabled = !canUndo;
    if (btnClearEraser) btnClearEraser.disabled = !hasImg;
  }

  function syncControlsState() {
    var hasImg = !!state.originalImage;
    var locked = !hasImg || state.isProcessingAi;

    if (btnReplacePhoto) btnReplacePhoto.classList.toggle('hide', !hasImg);
    if (btnOpenExportModal) btnOpenExportModal.disabled = locked;
    if (btnMqDownload) btnMqDownload.disabled = locked;
    if (btnMqPeek) btnMqPeek.disabled = locked;
    if (btnMqEraser) btnMqEraser.disabled = locked;
    if (btnStagePeek) btnStagePeek.disabled = locked;
    if (btnStageEraser) btnStageEraser.disabled = locked;
    if (btnResetAll) btnResetAll.disabled = locked;
    if (btnClearAll) btnClearAll.disabled = !hasImg || state.isProcessingAi;

    if (btnIsolateSubject) btnIsolateSubject.disabled = locked;
    if (btnRestoreFullBg) {
      btnRestoreFullBg.classList.toggle('hide', !(hasImg && state.isoMaskAlpha && state.useIsolated));
      btnRestoreFullBg.disabled = locked;
    }

    if (cpThickness) cpThickness.disabled = locked;
    if (cpDenoise) cpDenoise.disabled = locked;
    if (btnToggleEraser) btnToggleEraser.disabled = locked;
    if (cpEraserSize) cpEraserSize.disabled = locked;

    if (btnDirectPrint) btnDirectPrint.disabled = locked;
    if (btnExportPdf) btnExportPdf.disabled = locked;
    if (btnExportPng) btnExportPng.disabled = locked;
    if (btnExportJpg) btnExportJpg.disabled = locked;

    syncUndoButtons();
  }

  function syncSlidersUI() {
    if (cpThickness) cpThickness.value = String(state.thickness);
    if (cpThicknessVal) cpThicknessVal.textContent = String(state.thickness);
    if (cpDenoise) cpDenoise.value = String(state.denoise);
    if (cpDenoiseVal) cpDenoiseVal.textContent = state.denoise + '%';
    if (cpEraserSize) cpEraserSize.value = String(state.eraserSize);
    if (cpEraserSizeVal) cpEraserSizeVal.textContent = state.eraserSize + ' px';
  }

  /* ----- O(W*H) Fast Separable Box Blur & Morphological Helpers ----- */
  function boxBlurGray(src, w, h, radius) {
    if (radius <= 0) return new Float32Array(src);
    var tmp = new Float32Array(w * h);
    var dst = new Float32Array(w * h);
    var win = radius * 2 + 1;

    /* Horizontal pass */
    for (var y = 0; y < h; y++) {
      var row = y * w;
      var sum = 0;
      for (var k = -radius; k <= radius; k++) {
        var cx = k < 0 ? 0 : (k >= w ? w - 1 : k);
        sum += src[row + cx];
      }
      for (var x = 0; x < w; x++) {
        tmp[row + x] = sum / win;
        var addX = x + radius + 1;
        var subX = x - radius;
        sum += src[row + (addX >= w ? w - 1 : addX)] - src[row + (subX < 0 ? 0 : subX)];
      }
    }

    /* Vertical pass */
    for (var vx = 0; vx < w; vx++) {
      var vSum = 0;
      for (var vk = -radius; vk <= radius; vk++) {
        var cy = vk < 0 ? 0 : (vk >= h ? h - 1 : vk);
        vSum += tmp[cy * w + vx];
      }
      for (var vy = 0; vy < h; vy++) {
        dst[vy * w + vx] = vSum / win;
        var addY = vy + radius + 1;
        var subY = vy - radius;
        vSum += tmp[(addY >= h ? h - 1 : addY) * w + vx] - tmp[(subY < 0 ? 0 : subY) * w + vx];
      }
    }
    return dst;
  }

  function dilateDarkLines(gray, w, h, radius) {
    if (radius <= 0) return gray;
    var tmp = new Uint8ClampedArray(w * h);
    var dst = new Uint8ClampedArray(w * h);

    for (var y = 0; y < h; y++) {
      var row = y * w;
      for (var x = 0; x < w; x++) {
        var minVal = 255;
        var x0 = x - radius < 0 ? 0 : x - radius;
        var x1 = x + radius >= w ? w - 1 : x + radius;
        for (var kx = x0; kx <= x1; kx++) {
          var v = gray[row + kx];
          if (v < minVal) minVal = v;
        }
        tmp[row + x] = minVal;
      }
    }

    for (var vx = 0; vx < w; vx++) {
      for (var vy = 0; vy < h; vy++) {
        var vMin = 255;
        var y0 = vy - radius < 0 ? 0 : vy - radius;
        var y1 = vy + radius >= h ? h - 1 : vy + radius;
        for (var ky = y0; ky <= y1; ky++) {
          var vv = tmp[ky * w + vx];
          if (vv < vMin) vMin = vv;
        }
        dst[vy * w + vx] = vMin;
      }
    }
    return dst;
  }

  function computeSobelMagnitude(gray, w, h) {
    var mag = new Float32Array(w * h);
    for (var y = 1; y < h - 1; y++) {
      var rUp = (y - 1) * w;
      var rMd = y * w;
      var rDn = (y + 1) * w;
      for (var x = 1; x < w - 1; x++) {
        var tl = gray[rUp + x - 1], tc = gray[rUp + x], tr = gray[rUp + x + 1];
        var ml = gray[rMd + x - 1],                      mr = gray[rMd + x + 1];
        var bl = gray[rDn + x - 1], bc = gray[rDn + x], br = gray[rDn + x + 1];

        var gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
        var gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
        mag[rMd + x] = Math.abs(gx) + Math.abs(gy);
      }
    }
    return mag;
  }

  function buildLuminanceBuffer() {
    var w = state.workW;
    var h = state.workH;
    var total = w * h;
    var lum = new Float32Array(total);
    var rgb = state.workRgb;
    var mask = (state.useIsolated && state.isoMaskAlpha) ? state.isoMaskAlpha : null;

    for (var i = 0; i < total; i++) {
      var p4 = i * 4;
      var l = 0.299 * rgb[p4] + 0.587 * rgb[p4 + 1] + 0.114 * rgb[p4 + 2];
      var imgA = rgb[p4 + 3] / 255;
      var isoA = mask ? (mask[i] / 255) : 1.0;
      var a = imgA * isoA;
      lum[i] = l * a + 255 * (1 - a);
    }
    return lum;
  }

  /* ----- 4 Line-Art Conversion Algorithms (Pure #FFFFFF Paper + Crisp Black Ink) ----- */
  function renderLineArtBuffer() {
    if (!state.originalImage || !state.workRgb || !state.workW || !state.workH) return;

    var w = state.workW;
    var h = state.workH;
    var total = w * h;
    var lum = buildLuminanceBuffer();
    var thick = state.thickness;
    var denoise = state.denoise / 100;
    var mask = (state.useIsolated && state.isoMaskAlpha) ? state.isoMaskAlpha : null;

    var outGray = new Uint8ClampedArray(total);
    outGray.fill(255);

    if (state.styleId === 'classic') {
      /* Style 1: Classic Kids Coloring — clean outer contours & wide open crayon spaces */
      var rPreC = 1 + Math.round(denoise * 3.5);
      var s1C = boxBlurGray(lum, w, h, rPreC);
      var sWideC = boxBlurGray(s1C, w, h, 3 + Math.round(thick * 0.45));
      var gradC = computeSobelMagnitude(s1C, w, h);
      var threshC = 28 + denoise * 46;

      for (var ic = 0; ic < total; ic++) {
        var dogC = Math.max(0, sWideC[ic] - s1C[ic]);
        var scoreC = gradC[ic] * 0.46 + dogC * 3.4;
        var inkC = clamp((scoreC - threshC) * 7.0, 0, 255);
        outGray[ic] = Math.round(255 - inkC);
      }
      var dRadC = thick <= 2 ? 0 : Math.min(3, Math.floor((thick - 1) / 3));
      if (dRadC > 0) outGray = dilateDarkLines(outGray, w, h, dRadC);
    } else if (state.styleId === 'comic') {
      /* Style 2: Bold Comic Ink — thick high-contrast comic outlines */
      var rPreK = 1 + Math.round(denoise * 2.5);
      var s1K = boxBlurGray(lum, w, h, rPreK);
      var s2K = boxBlurGray(s1K, w, h, 4);
      var gradK = computeSobelMagnitude(s1K, w, h);
      var threshK = 22 + denoise * 42;

      for (var ik = 0; ik < total; ik++) {
        var dogK = Math.max(0, s2K[ik] - s1K[ik]);
        var scoreK = gradK[ik] * 0.62 + dogK * 4.2;
        var inkK = scoreK > threshK ? clamp((scoreK - threshK) * 11.5, 0, 255) : 0;
        outGray[ik] = Math.round(255 - inkK);
      }
      var dRadK = 1 + Math.min(4, Math.floor(thick / 2.2));
      outGray = dilateDarkLines(outGray, w, h, dRadK);
    } else if (state.styleId === 'pencil') {
      /* Style 3: Artistic Pencil Sketch — authentic color-dodge graphite shading */
      var blurRadius = 6 + thick * 2;
      var blurLum = boxBlurGray(lum, w, h, blurRadius);
      var gradP = computeSobelMagnitude(lum, w, h);
      var whiteLift = 247 - Math.round(denoise * 34);
      var contrastP = 1.0 + thick * 0.14;

      for (var ip = 0; ip < total; ip++) {
        var denom = Math.max(8, blurLum[ip]);
        var dodge = Math.min(255, (lum[ip] * 255) / denom);
        var edgeSub = clamp(gradP[ip] * 0.12 * (1 + thick * 0.08), 0, 110);
        var val = Math.max(0, dodge - edgeSub);

        /* Stretch near-white background cleanly to #FFFFFF while keeping graphite shading */
        if (val >= whiteLift) {
          val = 255;
        } else {
          val = (val / whiteLift) * 255;
          val = 255 * Math.pow(val / 255, contrastP);
        }
        outGray[ip] = clamp(Math.round(val), 0, 255);
      }
    } else {
      /* Style 4: Detailed Mandala / Fine Lines — intricate high-frequency extraction */
      var rPreM = Math.round(denoise * 1.4);
      var sBaseM = rPreM > 0 ? boxBlurGray(lum, w, h, rPreM) : lum;
      var sFineM = boxBlurGray(sBaseM, w, h, 2 + Math.floor(thick / 4));
      var gradM = computeSobelMagnitude(sBaseM, w, h);
      var threshM = 12 + denoise * 28;

      for (var im = 0; im < total; im++) {
        var dogM = Math.max(0, sFineM[im] - sBaseM[im]);
        var scoreM = gradM[im] * 0.56 + dogM * 4.6;
        var inkM = clamp((scoreM - threshM) * 7.8, 0, 255);
        outGray[im] = Math.round(255 - inkM);
      }
      if (thick >= 6) {
        outGray = dilateDarkLines(outGray, w, h, 1);
      }
    }

    /* Enforce pure white background outside AI mask & crisp outer contour */
    if (mask) {
      for (var y = 1; y < h - 1; y++) {
        var row = y * w;
        for (var x = 1; x < w - 1; x++) {
          var idx = row + x;
          var a = mask[idx];
          if (a < 24) {
            outGray[idx] = 255;
          } else if (a < 230) {
            var edgeDiff = Math.abs(mask[idx - 1] - mask[idx + 1]) + Math.abs(mask[idx - w] - mask[idx + w]);
            if (edgeDiff > 90) {
              outGray[idx] = Math.min(outGray[idx], 32);
            }
          }
        }
      }
    }

    if (lineArtCanvas.width !== w || lineArtCanvas.height !== h) {
      lineArtCanvas.width = w;
      lineArtCanvas.height = h;
    }
    var imgData = lineArtCtx.createImageData(w, h);
    var d = imgData.data;
    for (var j = 0; j < total; j++) {
      var v = outGray[j];
      var j4 = j * 4;
      d[j4] = v;
      d[j4 + 1] = v;
      d[j4 + 2] = v;
      d[j4 + 3] = 255;
    }
    lineArtCtx.putImageData(imgData, 0, 0);
  }

  /* ----- Decorative Border Frame & Title Compositor (Full 300 DPI) ----- */
  function drawCornerStar(ctx, cx, cy, outerR, innerR) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 === 0 ? outerR : innerR;
      var angle = (Math.PI / 5) * i - Math.PI / 2;
      var px = cx + Math.cos(angle) * r;
      var py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function renderFrameAndTitle(ctx, W, H, margin, titleAreaH) {
    var topBoxY = margin + (titleAreaH > 0 ? titleAreaH + Math.round(W * 0.012) : 0);
    var fx = margin;
    var fy = topBoxY;
    var fw = W - margin * 2;
    var fh = H - margin - topBoxY;

    /* Decorative Frame */
    if (state.showFrame && fw > 100 && fh > 100) {
      ctx.save();
      ctx.strokeStyle = '#111111';
      ctx.fillStyle = '#FFFFFF';
      var baseW = Math.max(4, Math.round(W * 0.0024));

      if (state.frameStyle === 'classic') {
        ctx.lineWidth = baseW * 1.45;
        ctx.strokeRect(fx, fy, fw, fh);
        var inset = Math.round(baseW * 3.2);
        ctx.lineWidth = baseW * 0.75;
        ctx.strokeRect(fx + inset, fy + inset, fw - inset * 2, fh - inset * 2);
      } else if (state.frameStyle === 'rounded') {
        var r = Math.round(Math.min(fw, fh) * 0.032);
        ctx.lineWidth = baseW * 1.65;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(fx, fy, fw, fh, r);
        else ctx.rect(fx, fy, fw, fh);
        ctx.stroke();
      } else if (state.frameStyle === 'stars') {
        ctx.lineWidth = baseW * 1.4;
        ctx.strokeRect(fx, fy, fw, fh);
        var starR = Math.round(Math.min(fw, fh) * 0.024);
        var innerR = starR * 0.45;
        var corners = [
          [fx, fy],
          [fx + fw, fy],
          [fx, fy + fh],
          [fx + fw, fy + fh],
        ];
        ctx.lineWidth = baseW * 1.1;
        corners.forEach(function (pt) {
          drawCornerStar(ctx, pt[0], pt[1], starR, innerR);
          ctx.fill();
          ctx.stroke();
        });
      } else if (state.frameStyle === 'scallop') {
        var insetS = Math.round(baseW * 4.5);
        ctx.lineWidth = baseW * 1.25;
        var innerX = fx + insetS;
        var innerY = fy + insetS;
        var innerW = fw - insetS * 2;
        var innerH = fh - insetS * 2;
        ctx.strokeRect(innerX, innerY, innerW, innerH);

        var arcR = Math.max(22, Math.round(Math.min(innerW, innerH) * 0.024));
        ctx.lineWidth = baseW * 1.0;

        /* Top & bottom scalloped arcs */
        var countX = Math.max(6, Math.floor(innerW / (arcR * 2)));
        var stepX = innerW / countX;
        for (var ix = 0; ix < countX; ix++) {
          var cx = innerX + (ix + 0.5) * stepX;
          ctx.beginPath();
          ctx.arc(cx, innerY, stepX * 0.5, Math.PI, 0, false);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, innerY + innerH, stepX * 0.5, 0, Math.PI, false);
          ctx.stroke();
        }
        /* Left & right scalloped arcs */
        var countY = Math.max(6, Math.floor(innerH / (arcR * 2)));
        var stepY = innerH / countY;
        for (var iy = 0; iy < countY; iy++) {
          var cy = innerY + (iy + 0.5) * stepY;
          ctx.beginPath();
          ctx.arc(innerX, cy, stepY * 0.5, Math.PI * 0.5, Math.PI * 1.5, false);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(innerX + innerW, cy, stepY * 0.5, -Math.PI * 0.5, Math.PI * 0.5, false);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    /* Custom Top Header Title / Child's Name */
    var rawTitle = (state.customTitle || '').trim();
    if (rawTitle) {
      ctx.save();
      var isAr = containsArabic(rawTitle);
      var fontSize = Math.round(W * 0.044);
      var fontFamily = isAr ? 'Cairo, sans-serif' : '"Luckiest Guy", Cairo, sans-serif';
      var weight = isAr ? '900 ' : '';
      ctx.font = weight + fontSize + 'px ' + fontFamily;
      var maxTextW = W - margin * 2.2;
      var measured = ctx.measureText(rawTitle).width;
      if (measured > maxTextW && measured > 0) {
        fontSize = Math.max(24, Math.floor(fontSize * (maxTextW / measured)));
        ctx.font = weight + fontSize + 'px ' + fontFamily;
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = isAr ? 'rtl' : 'ltr';
      var ty = margin + titleAreaH * 0.5;

      if (state.titleStyle === 'outline') {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = Math.max(4, Math.round(fontSize * 0.13));
        ctx.strokeText(rawTitle, W * 0.5, ty);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(rawTitle, W * 0.5, ty);
      } else {
        ctx.fillStyle = '#111111';
        ctx.fillText(rawTitle, W * 0.5, ty);
      }
      ctx.restore();
    }

    return {
      x: fx,
      y: fy,
      w: fw,
      h: fh,
    };
  }

  function renderSheetToCanvas() {
    updateSpecUI();
    if (!state.originalImage || !cpMainCanvas) return;

    var spec = getPaperSpec();
    var W = spec.wPx;
    var H = spec.hPx;
    if (cpMainCanvas.width !== W || cpMainCanvas.height !== H) {
      cpMainCanvas.width = W;
      cpMainCanvas.height = H;
    }

    var ctx = cpMainCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    var margin = Math.round(Math.min(W, H) * 0.048);
    var hasTitle = (state.customTitle || '').trim().length > 0;
    var titleAreaH = hasTitle ? Math.round(H * 0.072) : 0;

    var box = renderFrameAndTitle(ctx, W, H, margin, titleAreaH);
    var pad = state.showFrame ? Math.round(Math.min(box.w, box.h) * 0.045) : Math.round(Math.min(box.w, box.h) * 0.02);
    var availX = box.x + pad;
    var availY = box.y + pad;
    var availW = Math.max(10, box.w - pad * 2);
    var availH = Math.max(10, box.h - pad * 2);

    var srcW = state.isPeeking ? state.origWidth : state.workW;
    var srcH = state.isPeeking ? state.origHeight : state.workH;
    var fitScale = Math.min(availW / srcW, availH / srcH);
    var drawW = Math.round(srcW * fitScale);
    var drawH = Math.round(srcH * fitScale);
    var drawX = Math.round(availX + (availW - drawW) / 2);
    var drawY = Math.round(availY + (availH - drawH) / 2);

    state.artRect = { x: drawX, y: drawY, w: drawW, h: drawH };

    if (state.isPeeking) {
      ctx.drawImage(state.originalImage, drawX, drawY, drawW, drawH);
    } else if (lineArtCanvas.width > 0 && lineArtCanvas.height > 0) {
      ctx.drawImage(lineArtCanvas, drawX, drawY, drawW, drawH);
      if (eraserCanvas.width > 0 && eraserCanvas.height > 0) {
        ctx.drawImage(eraserCanvas, drawX, drawY, drawW, drawH);
      }
    }
  }

  function scheduleLineArtRender() {
    if (lineArtRaf) return;
    lineArtRaf = requestAnimationFrame(function () {
      lineArtRaf = 0;
      renderLineArtBuffer();
      renderSheetToCanvas();
    });
  }

  function scheduleSheetRender() {
    if (sheetRaf) return;
    sheetRaf = requestAnimationFrame(function () {
      sheetRaf = 0;
      renderSheetToCanvas();
    });
  }

  /* ----- Local AI Background Isolation (Lazy On-Demand Only) ----- */
  async function detectPreferredDevice() {
    try {
      if (typeof navigator !== 'undefined' && navigator.gpu && typeof navigator.gpu.requestAdapter === 'function') {
        var adapter = await navigator.gpu.requestAdapter();
        if (adapter) return 'gpu';
      }
    } catch (_e) {}
    return 'cpu';
  }

  function getImglyConfig(device) {
    return {
      model: 'isnet_fp16',
      device: device,
      proxyToWorker: false,
      rescale: true,
      fetchArgs: { cache: 'force-cache' },
      output: { format: 'image/png', quality: 1.0 },
    };
  }

  function decodeBlobToImage(blob) {
    return new Promise(function (resolve, reject) {
      var u = URL.createObjectURL(blob);
      var im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(u);
        resolve(im);
      };
      im.onerror = function () {
        URL.revokeObjectURL(u);
        reject(new Error('Failed to decode AI output'));
      };
      im.src = u;
    });
  }

  function extractAlphaToWorkSize(aiImg, w, h) {
    var mc = document.createElement('canvas');
    mc.width = w;
    mc.height = h;
    var mctx = mc.getContext('2d');
    mctx.imageSmoothingEnabled = true;
    mctx.imageSmoothingQuality = 'high';
    mctx.drawImage(aiImg, 0, 0, w, h);
    var d = mctx.getImageData(0, 0, w, h).data;
    var alpha = new Uint8ClampedArray(w * h);
    for (var i = 0; i < alpha.length; i++) {
      var a = d[i * 4 + 3];
      alpha[i] = a < 18 ? 0 : (a > 240 ? 255 : a);
    }
    cleanupCanvas(mc);
    return alpha;
  }

  async function handleIsolateSubject() {
    if (!state.originalImage || !state.currentFile || state.isProcessingAi) return;

    if (state.isoMaskAlpha) {
      state.useIsolated = true;
      renderLineArtBuffer();
      renderSheetToCanvas();
      syncControlsState();
      toast(t('cp_isolated_ok'), 'ok');
      return;
    }

    var activeGen = state.loadGen;
    state.isProcessingAi = true;
    setEraserActive(false);
    syncControlsState();
    if (cpAiOverlay) cpAiOverlay.classList.remove('hide');
    if (cpAiStatusText) cpAiStatusText.textContent = t('cp_ai_working');

    try {
      activeDevice = await detectPreferredDevice();
      if (activeGen !== state.loadGen) return;

      var outBlob;
      try {
        outBlob = await removeBackground(state.currentFile, getImglyConfig(activeDevice));
      } catch (gpuErr) {
        if (activeDevice === 'gpu') {
          activeDevice = 'cpu';
          outBlob = await removeBackground(state.currentFile, getImglyConfig('cpu'));
        } else {
          throw gpuErr;
        }
      }

      if (activeGen !== state.loadGen) return;
      var aiImg = await decodeBlobToImage(outBlob);
      if (activeGen !== state.loadGen) return;

      state.isoMaskAlpha = extractAlphaToWorkSize(aiImg, state.workW, state.workH);
      state.useIsolated = true;
      renderLineArtBuffer();
      renderSheetToCanvas();
      syncControlsState();
      toast(t('cp_isolated_ok'), 'ok');
    } catch (err) {
      if (activeGen !== state.loadGen) return;
      console.error('Coloring AI isolation error:', err);
      toast(t('tc_removebg_fail'), 'err');
    } finally {
      if (activeGen === state.loadGen) {
        state.isProcessingAi = false;
        if (cpAiOverlay) cpAiOverlay.classList.add('hide');
        syncControlsState();
      }
    }
  }

  /* ----- Manual Clean-Up White Eraser + Dirty-Rect Undo ----- */
  function setEraserActive(active) {
    var next = Boolean(active) && !!state.originalImage && !state.isProcessingAi;
    state.eraserActive = next;
    if (cpPaperWrap) cpPaperWrap.classList.toggle('is-eraser-active', next);
    if (btnToggleEraser) {
      btnToggleEraser.classList.toggle('is-active', next);
      btnToggleEraser.setAttribute('aria-pressed', next ? 'true' : 'false');
    }
    if (btnStageEraser) {
      btnStageEraser.classList.toggle('is-active', next);
      btnStageEraser.setAttribute('aria-pressed', next ? 'true' : 'false');
    }
    if (btnMqEraser) {
      btnMqEraser.classList.toggle('is-active', next);
      btnMqEraser.setAttribute('aria-pressed', next ? 'true' : 'false');
    }
    if (!next && cpBrushCursor) cpBrushCursor.classList.add('hide');
  }

  function clientToWorkCoords(clientX, clientY) {
    if (!cpMainCanvas || !state.artRect.w || !state.artRect.h) return null;
    var rect = cpMainCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    var sheetX = (clientX - rect.left) * (cpMainCanvas.width / rect.width);
    var sheetY = (clientY - rect.top) * (cpMainCanvas.height / rect.height);

    var wx = ((sheetX - state.artRect.x) / state.artRect.w) * state.workW;
    var wy = ((sheetY - state.artRect.y) / state.artRect.h) * state.workH;
    return { x: wx, y: wy };
  }

  function getWorkBrushRadius() {
    if (!cpMainCanvas || !state.artRect.w) return 12;
    var rect = cpMainCanvas.getBoundingClientRect();
    var displayW = rect.width > 0 ? rect.width : cpMainCanvas.width;
    var sheetRadius = (state.eraserSize / 2) * (cpMainCanvas.width / displayW);
    return Math.max(2, sheetRadius * (state.workW / state.artRect.w));
  }

  function updateBrushCursor(clientX, clientY) {
    if (!cpBrushCursor || !cpPaperWrap || !state.eraserActive || state.isPeeking) {
      if (cpBrushCursor) cpBrushCursor.classList.add('hide');
      return;
    }
    var wrapRect = cpPaperWrap.getBoundingClientRect();
    cpBrushCursor.style.width = state.eraserSize + 'px';
    cpBrushCursor.style.height = state.eraserSize + 'px';
    cpBrushCursor.style.left = (clientX - wrapRect.left) + 'px';
    cpBrushCursor.style.top = (clientY - wrapRect.top) + 'px';
    cpBrushCursor.classList.remove('hide');
  }

  function expandBBox(x, y, r) {
    var x0 = clamp(Math.floor(x - r - 2), 0, state.workW);
    var y0 = clamp(Math.floor(y - r - 2), 0, state.workH);
    var x1 = clamp(Math.ceil(x + r + 2), 0, state.workW);
    var y1 = clamp(Math.ceil(y + r + 2), 0, state.workH);
    if (!state.strokeBBox) {
      state.strokeBBox = { x0: x0, y0: y0, x1: x1, y1: y1 };
    } else {
      if (x0 < state.strokeBBox.x0) state.strokeBBox.x0 = x0;
      if (y0 < state.strokeBBox.y0) state.strokeBBox.y0 = y0;
      if (x1 > state.strokeBBox.x1) state.strokeBBox.x1 = x1;
      if (y1 > state.strokeBBox.y1) state.strokeBBox.y1 = y1;
    }
  }

  function drawEraserDab(pt, r) {
    eraserCtx.save();
    eraserCtx.fillStyle = '#FFFFFF';
    eraserCtx.beginPath();
    eraserCtx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    eraserCtx.fill();
    eraserCtx.restore();
    expandBBox(pt.x, pt.y, r);
  }

  function drawEraserSegment(p0, p1, r) {
    eraserCtx.save();
    eraserCtx.strokeStyle = '#FFFFFF';
    eraserCtx.lineWidth = r * 2;
    eraserCtx.lineCap = 'round';
    eraserCtx.lineJoin = 'round';
    eraserCtx.beginPath();
    eraserCtx.moveTo(p0.x, p0.y);
    eraserCtx.lineTo(p1.x, p1.y);
    eraserCtx.stroke();
    eraserCtx.restore();
    expandBBox(p0.x, p0.y, r);
    expandBBox(p1.x, p1.y, r);
  }

  function commitEraserUndo() {
    if (!state.strokeBBox || !state.preStrokeSnapshot) {
      state.strokeBBox = null;
      state.preStrokeSnapshot = null;
      return;
    }
    var b = state.strokeBBox;
    var bw = b.x1 - b.x0;
    var bh = b.y1 - b.y0;
    if (bw > 0 && bh > 0) {
      /* Extract dirty rect from pre-stroke canvas snapshot */
      var src = state.preStrokeSnapshot.data;
      var w = state.workW;
      var patch = new Uint8ClampedArray(bw * bh * 4);
      for (var row = 0; row < bh; row++) {
        var srcStart = ((b.y0 + row) * w + b.x0) * 4;
        var dstStart = row * bw * 4;
        patch.set(src.subarray(srcStart, srcStart + bw * 4), dstStart);
      }
      state.undoStack.push({ x: b.x0, y: b.y0, w: bw, h: bh, data: patch });
      if (state.undoStack.length > MAX_UNDO) {
        state.undoStack.shift();
      }
      syncUndoButtons();
    }
    state.strokeBBox = null;
    state.preStrokeSnapshot = null;
  }

  function handleUndoEraser() {
    if (!state.undoStack.length || !state.workW || !state.workH) return;
    var item = state.undoStack.pop();
    var imgData = eraserCtx.createImageData(item.w, item.h);
    imgData.data.set(item.data);
    eraserCtx.putImageData(imgData, item.x, item.y);
    syncUndoButtons();
    renderSheetToCanvas();
  }

  function handleClearEraser() {
    if (!state.originalImage || !state.workW || !state.workH) return;
    if (state.undoStack.length > 0) {
      state.undoStack = [];
    }
    eraserCtx.clearRect(0, 0, state.workW, state.workH);
    syncUndoButtons();
    renderSheetToCanvas();
    toast(t('cp_eraser_cleared'), 'ok');
  }

  /* ----- Image Load / Reset / Clear ----- */
  function loadFile(file) {
    if (!isValidImageFile(file)) return;

    state.loadGen += 1;
    var activeGen = state.loadGen;
    state.isProcessingAi = false;
    if (cpAiOverlay) cpAiOverlay.classList.add('hide');

    revokeObjectUrl();
    state.currentFile = file;
    state.currentFileName = sanitizeFilenameBase(file.name);
    state.objectURL = URL.createObjectURL(file);

    var img = new Image();
    img.onload = function () {
      if (activeGen !== state.loadGen) return;
      var nw = img.naturalWidth || img.width;
      var nh = img.naturalHeight || img.height;
      if (!nw || !nh || nw > MAX_IMAGE_DIM || nh > MAX_IMAGE_DIM) {
        toast(t('cp_err_dims'), 'err');
        clearAll();
        return;
      }

      state.originalImage = img;
      state.origWidth = nw;
      state.origHeight = nh;

      var scale = Math.min(1, MAX_WORK_DIM / Math.max(nw, nh));
      var wW = Math.max(32, Math.round(nw * scale));
      var wH = Math.max(32, Math.round(nh * scale));
      state.workW = wW;
      state.workH = wH;

      workCanvas.width = wW;
      workCanvas.height = wH;
      workCtx.imageSmoothingEnabled = true;
      workCtx.imageSmoothingQuality = 'high';
      workCtx.clearRect(0, 0, wW, wH);
      workCtx.drawImage(img, 0, 0, wW, wH);
      state.workRgb = new Uint8ClampedArray(workCtx.getImageData(0, 0, wW, wH).data);

      eraserCanvas.width = wW;
      eraserCanvas.height = wH;
      eraserCtx.clearRect(0, 0, wW, wH);

      state.isoMaskAlpha = null;
      state.useIsolated = false;
      state.undoStack = [];
      state.isPeeking = false;
      setEraserActive(false);

      if (cpEmptyState) cpEmptyState.classList.add('hide');
      if (cpPaperWrap) cpPaperWrap.classList.remove('hide');

      renderLineArtBuffer();
      renderSheetToCanvas();
      syncControlsState();
      toast(t('cp_img_loaded'), 'ok');
    };
    img.onerror = function () {
      if (activeGen !== state.loadGen) return;
      toast(t('tc_img_load_err'), 'err');
      clearAll();
    };
    img.src = state.objectURL;
  }

  function resetAllEdits() {
    if (!state.originalImage) return;
    state.loadGen += 1;
    state.isProcessingAi = false;
    if (cpAiOverlay) cpAiOverlay.classList.add('hide');

    state.styleId = 'classic';
    state.thickness = 4;
    state.denoise = 45;
    state.useIsolated = false;
    state.paperId = 'a4p';
    state.showFrame = true;
    state.frameStyle = 'classic';
    state.customTitle = '';
    state.titleStyle = 'outline';
    state.undoStack = [];
    state.isPeeking = false;

    if (eraserCanvas.width && eraserCanvas.height) {
      eraserCtx.clearRect(0, 0, eraserCanvas.width, eraserCanvas.height);
    }

    styleCards.forEach(function (c) {
      var a = c.getAttribute('data-style') === 'classic';
      c.classList.toggle('active', a);
      c.setAttribute('aria-checked', a ? 'true' : 'false');
    });
    paperBtns.forEach(function (b) {
      var a = b.getAttribute('data-paper') === 'a4p';
      b.classList.toggle('active', a);
      b.setAttribute('aria-checked', a ? 'true' : 'false');
    });
    if (cpFrameToggle) cpFrameToggle.checked = true;
    frameStyleBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-fstyle') === 'classic'); });
    if (cpCustomTitle) cpCustomTitle.value = '';
    titleStyleBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tstyle') === 'outline'); });

    setEraserActive(false);
    syncSlidersUI();
    renderLineArtBuffer();
    renderSheetToCanvas();
    syncControlsState();
    toast(t('tc_reset'), 'ok');
  }

  function clearAll() {
    state.loadGen += 1;
    state.isProcessingAi = false;
    if (cpAiOverlay) cpAiOverlay.classList.add('hide');

    revokeObjectUrl();
    state.currentFile = null;
    state.originalImage = null;
    state.origWidth = 0;
    state.origHeight = 0;
    state.workW = 0;
    state.workH = 0;
    state.workRgb = null;
    state.isoMaskAlpha = null;
    state.useIsolated = false;
    state.undoStack = [];
    state.isPeeking = false;

    setEraserActive(false);
    cleanupCanvas(workCanvas);
    cleanupCanvas(lineArtCanvas);
    cleanupCanvas(eraserCanvas);
    cleanupCanvas(cpMainCanvas);

    if (cpPaperWrap) cpPaperWrap.classList.add('hide');
    if (cpEmptyState) cpEmptyState.classList.remove('hide');
    if (cpFileInput) cpFileInput.value = '';

    syncControlsState();
    updateSpecUI();
  }

  /* ----- Peek Original & Export Modal ----- */
  function setPeeking(active) {
    if (!state.originalImage) return;
    state.isPeeking = Boolean(active);
    if (btnStagePeek) btnStagePeek.classList.toggle('is-peeking', state.isPeeking);
    if (btnMqPeek) btnMqPeek.classList.toggle('is-peeking', state.isPeeking);
    if (cpBrushCursor && state.isPeeking) cpBrushCursor.classList.add('hide');
    renderSheetToCanvas();
  }

  function openExportModal() {
    if (!state.originalImage) {
      toast(t('tc_load_first'), 'err');
      return;
    }
    if (!cpExportModal) return;
    updateSpecUI();
    cpExportModal.classList.remove('hide');
  }

  function closeExportModal() {
    if (cpExportModal) cpExportModal.classList.add('hide');
  }

  function handleDirectPrint() {
    if (!state.originalImage) {
      toast(t('tc_load_first'), 'err');
      return;
    }
    state.isPeeking = false;
    renderSheetToCanvas();
    closeExportModal();
    setTimeout(function () {
      try {
        window.print();
      } catch (err) {
        console.error('Print error:', err);
        toast(t('cp_export_err'), 'err');
      }
    }, 60);
  }

  function handleExport(format) {
    if (!state.originalImage) {
      toast(t('tc_load_first'), 'err');
      return;
    }
    state.isPeeking = false;
    renderSheetToCanvas();

    var spec = getPaperSpec();
    var fileBase = state.currentFileName + '_coloring_' + state.styleId + '_' + state.paperId;

    if (format === 'pdf') {
      try {
        var orientation = spec.wMm >= spec.hMm ? 'landscape' : 'portrait';
        var pdf = new jsPDF({
          orientation: orientation,
          unit: 'mm',
          format: [spec.wMm, spec.hMm],
        });
        var jpgData = cpMainCanvas.toDataURL('image/jpeg', 0.96);
        pdf.addImage(jpgData, 'JPEG', 0, 0, spec.wMm, spec.hMm, undefined, 'NONE');
        var pdfBlob = pdf.output('blob');
        if (typeof I.triggerDownload === 'function') {
          I.triggerDownload(pdfBlob, fileBase + '.pdf');
        }
        toast(t('cp_export_ok'), 'ok');
      } catch (err) {
        console.error('Coloring PDF export error:', err);
        toast(t('cp_export_err'), 'err');
      }
      return;
    }

    var mime = format === 'png' ? 'image/png' : 'image/jpeg';
    var ext = format === 'png' ? 'png' : 'jpg';
    var quality = format === 'png' ? 1.0 : 0.96;

    if (typeof I.downloadCanvas === 'function') {
      I.downloadCanvas(
        cpMainCanvas,
        fileBase + '.' + ext,
        mime,
        quality,
        function () { toast(t('cp_export_ok'), 'ok'); },
        function () { toast(t('cp_export_err'), 'err'); }
      );
    } else {
      cpMainCanvas.toBlob(function (blob) {
        if (!blob) {
          toast(t('cp_export_err'), 'err');
          return;
        }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fileBase + '.' + ext;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          if (a.parentNode) a.parentNode.removeChild(a);
          try { URL.revokeObjectURL(url); } catch (_e) {}
        }, 2500);
        toast(t('cp_export_ok'), 'ok');
      }, mime, quality);
    }
  }

  /* ----- UI & Event Wiring ----- */
  function setActiveStyle(styleId) {
    if (!STYLE_LABELS[styleId]) return;
    state.styleId = styleId;
    styleCards.forEach(function (c) {
      var active = c.getAttribute('data-style') === styleId;
      c.classList.toggle('active', active);
      c.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    updateSpecUI();
    if (state.originalImage) {
      scheduleLineArtRender();
    }
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

  if (btnIsolateSubject) btnIsolateSubject.addEventListener('click', handleIsolateSubject);
  if (btnRestoreFullBg) {
    btnRestoreFullBg.addEventListener('click', function () {
      if (!state.originalImage) return;
      state.useIsolated = false;
      renderLineArtBuffer();
      renderSheetToCanvas();
      syncControlsState();
      toast(t('cp_restored_full'), 'ok');
    });
  }

  if (cpThickness) {
    cpThickness.addEventListener('input', function () {
      state.thickness = clamp(parseInt(cpThickness.value, 10) || 4, 1, 10);
      if (cpThicknessVal) cpThicknessVal.textContent = String(state.thickness);
      if (state.originalImage) scheduleLineArtRender();
    });
  }
  if (cpDenoise) {
    cpDenoise.addEventListener('input', function () {
      state.denoise = clamp(parseInt(cpDenoise.value, 10) || 0, 0, 100);
      if (cpDenoiseVal) cpDenoiseVal.textContent = state.denoise + '%';
      if (state.originalImage) scheduleLineArtRender();
    });
  }

  function toggleEraser() {
    setEraserActive(!state.eraserActive);
  }
  if (btnToggleEraser) btnToggleEraser.addEventListener('click', toggleEraser);
  if (btnStageEraser) btnStageEraser.addEventListener('click', toggleEraser);
  if (btnMqEraser) btnMqEraser.addEventListener('click', toggleEraser);

  if (cpEraserSize) {
    cpEraserSize.addEventListener('input', function () {
      state.eraserSize = clamp(parseInt(cpEraserSize.value, 10) || 32, 8, 100);
      if (cpEraserSizeVal) cpEraserSizeVal.textContent = state.eraserSize + ' px';
    });
  }

  if (btnUndoEraser) btnUndoEraser.addEventListener('click', handleUndoEraser);
  if (btnStageUndo) btnStageUndo.addEventListener('click', handleUndoEraser);
  if (btnMqUndo) btnMqUndo.addEventListener('click', handleUndoEraser);
  if (btnClearEraser) btnClearEraser.addEventListener('click', handleClearEraser);

  paperBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-paper');
      if (!PAPER_FORMATS[id]) return;
      state.paperId = id;
      paperBtns.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-checked', active ? 'true' : 'false');
      });
      updateSpecUI();
      if (state.originalImage) scheduleSheetRender();
    });
  });

  if (cpFrameToggle) {
    cpFrameToggle.addEventListener('change', function () {
      state.showFrame = Boolean(cpFrameToggle.checked);
      if (state.originalImage) scheduleSheetRender();
    });
  }

  frameStyleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.frameStyle = btn.getAttribute('data-fstyle') || 'classic';
      frameStyleBtns.forEach(function (b) { b.classList.toggle('active', b === btn); });
      if (!state.showFrame && cpFrameToggle) {
        state.showFrame = true;
        cpFrameToggle.checked = true;
      }
      if (state.originalImage) scheduleSheetRender();
    });
  });

  if (cpCustomTitle) {
    cpCustomTitle.addEventListener('input', function () {
      state.customTitle = cpCustomTitle.value;
      if (state.originalImage) scheduleSheetRender();
    });
  }

  titleStyleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.titleStyle = btn.getAttribute('data-tstyle') || 'outline';
      titleStyleBtns.forEach(function (b) { b.classList.toggle('active', b === btn); });
      if (state.originalImage) scheduleSheetRender();
    });
  });

  /* Canvas Clean-Up Eraser Pointer Events */
  if (cpPaperWrap) {
    cpPaperWrap.addEventListener('pointerdown', function (e) {
      if (!state.originalImage || !state.eraserActive || state.isPeeking) return;
      var pt = clientToWorkCoords(e.clientX, e.clientY);
      if (!pt) return;
      e.preventDefault();
      try { cpPaperWrap.setPointerCapture(e.pointerId); } catch (_err) {}

      state.isErasing = true;
      state.lastErasePt = pt;
      state.strokeBBox = null;
      state.preStrokeSnapshot = eraserCtx.getImageData(0, 0, state.workW, state.workH);

      var r = getWorkBrushRadius();
      drawEraserDab(pt, r);
      updateBrushCursor(e.clientX, e.clientY);
      renderSheetToCanvas();
    });

    cpPaperWrap.addEventListener('pointermove', function (e) {
      if (!state.originalImage || !state.eraserActive || state.isPeeking) return;
      updateBrushCursor(e.clientX, e.clientY);
      if (!state.isErasing) return;
      var pt = clientToWorkCoords(e.clientX, e.clientY);
      if (!pt) return;
      e.preventDefault();
      var r = getWorkBrushRadius();
      drawEraserSegment(state.lastErasePt || pt, pt, r);
      state.lastErasePt = pt;
      renderSheetToCanvas();
    });

    function finishErase(e) {
      if (!state.isErasing) return;
      state.isErasing = false;
      state.lastErasePt = null;
      try { cpPaperWrap.releasePointerCapture(e.pointerId); } catch (_err) {}
      commitEraserUndo();
      renderSheetToCanvas();
    }

    cpPaperWrap.addEventListener('pointerup', finishErase);
    cpPaperWrap.addEventListener('pointercancel', finishErase);
    cpPaperWrap.addEventListener('pointerleave', function () {
      if (!state.isErasing && cpBrushCursor) cpBrushCursor.classList.add('hide');
    });
  }

  /* Stage Actions & Peek */
  function bindHoldPeek(btn) {
    if (!btn) return;
    btn.addEventListener('pointerdown', function (e) {
      if (btn.disabled) return;
      e.preventDefault();
      setPeeking(true);
    });
    btn.addEventListener('pointerup', function () { setPeeking(false); });
    btn.addEventListener('pointercancel', function () { setPeeking(false); });
    btn.addEventListener('pointerleave', function () { if (state.isPeeking) setPeeking(false); });
  }
  bindHoldPeek(btnStagePeek);
  bindHoldPeek(btnMqPeek);

  if (btnResetAll) btnResetAll.addEventListener('click', resetAllEdits);
  if (btnClearAll) btnClearAll.addEventListener('click', clearAll);

  /* Export & Print Modal */
  if (btnOpenExportModal) btnOpenExportModal.addEventListener('click', openExportModal);
  if (btnMqDownload) btnMqDownload.addEventListener('click', openExportModal);
  if (btnCloseExportModal) btnCloseExportModal.addEventListener('click', closeExportModal);
  if (cpExportModal) {
    cpExportModal.addEventListener('click', function (e) {
      if (e.target === cpExportModal) closeExportModal();
    });
  }
  if (btnDirectPrint) btnDirectPrint.addEventListener('click', handleDirectPrint);
  if (btnExportPdf) btnExportPdf.addEventListener('click', function () { handleExport('pdf'); });
  if (btnExportPng) btnExportPng.addEventListener('click', function () { handleExport('png'); });
  if (btnExportJpg) btnExportJpg.addEventListener('click', function () { handleExport('jpg'); });

  /* Upload, Drag & Drop, Paste */
  function openFilePicker() {
    if (cpFileInput) cpFileInput.click();
  }
  if (btnUploadEmpty) btnUploadEmpty.addEventListener('click', function (e) { e.stopPropagation(); openFilePicker(); });
  if (btnReplacePhoto) btnReplacePhoto.addEventListener('click', openFilePicker);
  if (cpEmptyState) {
    cpEmptyState.addEventListener('click', openFilePicker);
    cpEmptyState.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFilePicker();
      }
    });
  }
  if (cpFileInput) {
    cpFileInput.addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) {
        loadFile(e.target.files[0]);
      }
    });
  }
  if (cpViewport) {
    cpViewport.addEventListener('dragover', function (e) {
      e.preventDefault();
      cpViewport.classList.add('is-dragover');
    });
    cpViewport.addEventListener('dragleave', function () {
      cpViewport.classList.remove('is-dragover');
    });
    cpViewport.addEventListener('drop', function (e) {
      e.preventDefault();
      cpViewport.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        loadFile(e.dataTransfer.files[0]);
      }
    });
  }

  document.addEventListener('paste', function (e) {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files[0]) {
      loadFile(e.clipboardData.files[0]);
    }
  });

  /* ----- Desktop Keyboard Shortcuts (Layout-independent via e.code) ----- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (cpExportModal && !cpExportModal.classList.contains('hide')) {
        closeExportModal();
      } else if (state.eraserActive) {
        setEraserActive(false);
      }
      return;
    }
    var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
    var isRange = tag === 'input' && e.target.type === 'range';
    var isTyping = (tag === 'input' && !isRange) || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable);
    if (isTyping || !state.originalImage) return;

    var mod = e.ctrlKey || e.metaKey;
    var lowerKey = e.key ? e.key.toLowerCase() : '';
    var code = e.code || '';

    if (mod && (lowerKey === 's' || code === 'KeyS')) {
      e.preventDefault();
      openExportModal();
      return;
    }
    if (mod && (lowerKey === 'p' || code === 'KeyP')) {
      e.preventDefault();
      handleDirectPrint();
      return;
    }
    if (mod && (lowerKey === 'z' || code === 'KeyZ')) {
      e.preventDefault();
      handleUndoEraser();
      return;
    }

    if (code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) setPeeking(true);
      return;
    }

    if (!mod && (lowerKey === 'e' || code === 'KeyE')) {
      e.preventDefault();
      toggleEraser();
      return;
    }

    if (!mod) {
      if (e.key === '1' || code === 'Digit1') { e.preventDefault(); setActiveStyle('classic'); return; }
      if (e.key === '2' || code === 'Digit2') { e.preventDefault(); setActiveStyle('comic'); return; }
      if (e.key === '3' || code === 'Digit3') { e.preventDefault(); setActiveStyle('pencil'); return; }
      if (e.key === '4' || code === 'Digit4') { e.preventDefault(); setActiveStyle('mandala'); return; }
    }
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

  /* ----- Language Change & Cleanup ----- */
  document.addEventListener('imgsfix:langchange', function () {
    syncDocumentMeta();
    syncControlsState();
    updateSpecUI();
    if (state.originalImage) renderSheetToCanvas();
  });

  window.addEventListener('beforeunload', function () {
    revokeObjectUrl();
    cleanupCanvas(workCanvas);
    cleanupCanvas(lineArtCanvas);
    cleanupCanvas(eraserCanvas);
    cleanupCanvas(cpMainCanvas);
  });

  /* ----- Boot ----- */
  syncDocumentMeta();
  syncSlidersUI();
  syncControlsState();
  updateSpecUI();
})();

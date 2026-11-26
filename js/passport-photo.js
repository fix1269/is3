/* imgsfix — passport-photo.js
   100% client-side Biometric Passport & Visa Photo Editor:
   - Official country presets & custom dimensions at true 300 DPI
   - Local AI background removal (@imgly/background-removal, isnet_fp16, GPU->CPU fallback, silent preload)
   - Full-resolution alpha mask extraction (3x3 Gaussian smoothing + residual haze cleanup) onto untouched RGB
   - Interactive Restore/Erase Edge Refine Brush with dirty-rect compositing & 25-step Undo/Redo
   - Interactive Biometric Alignment Guide (crown/chin 70-80%, eye line, center axis)
   - Smooth pan/drag, wheel & pinch zoom, tilt, 90° rotation, flip H, auto-center
   - 100% Canvas Portrait Studio Lighting & edge-preserving Natural Skin Smoothness
   - 300 DPI Single Photo & auto-tiled Print Sheet (4x6, 5x7, A4) with cut marks & JPG/PNG/PDF export (jsPDF)
*/
'use strict';

import { removeBackground, preload } from '@imgly/background-removal';
import { jsPDF } from 'jspdf';

(function () {
  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = I.$$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  /* ----- Constants ----- */
  var DPI = 300;
  var MM_PER_INCH = 25.4;
  var MM_TO_PX = DPI / MM_PER_INCH;
  var MAX_FILE_BYTES = 30 * 1024 * 1024;
  var MAX_IMAGE_DIM = 12000;
  var MAX_UNDO = 25;
  var ALLOWED_MIMES = {
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/bmp': true,
    'image/gif': true,
  };

  var PRESETS = {
    '40x60': { wMm: 40, hMm: 60, labelKey: 'pp_preset_40x60', slug: '40x60mm' },
    '35x45': { wMm: 35, hMm: 45, labelKey: 'pp_preset_35x45', slug: '35x45mm' },
    '51x51': { wMm: 50.8, hMm: 50.8, labelKey: 'pp_preset_51x51', slug: '51x51mm', displayDim: '51 × 51 mm (2 × 2 in)' },
    '50x70': { wMm: 50, hMm: 70, labelKey: 'pp_preset_50x70', slug: '50x70mm' },
    '50x60': { wMm: 50, hMm: 60, labelKey: 'pp_preset_50x60', slug: '50x60mm' },
    '30x40': { wMm: 30, hMm: 40, labelKey: 'pp_preset_30x40', slug: '30x40mm' },
    '25x35': { wMm: 25, hMm: 35, labelKey: 'pp_preset_25x35', slug: '25x35mm' },
  };

  var PAPERS = {
    '4x6': { wMm: 101.6, hMm: 152.4, minMarginMm: 0, label: '4×6 in' },
    '5x7': { wMm: 127.0, hMm: 177.8, minMarginMm: 0, label: '5×7 in' },
    'a4':  { wMm: 210.0, hMm: 297.0, minMarginMm: 5, label: 'A4' },
  };

  /* ----- DOM Elements ----- */
  var btnViewSingle = $('#btnViewSingle');
  var btnViewSheet = $('#btnViewSheet');
  var ppSpecMeta = $('#ppSpecMeta');
  var btnReplacePhoto = $('#btnReplacePhoto');
  var ppViewport = $('#ppViewport');
  var ppEmptyState = $('#ppEmptyState');
  var btnUploadEmpty = $('#btnUploadEmpty');
  var ppFileInput = $('#ppFileInput');

  var ppSingleFrame = $('#ppSingleFrame');
  var ppSingleCanvas = $('#ppSingleCanvas');
  var ppOrigPeekCanvas = $('#ppOrigPeekCanvas');
  var ppGuideCanvas = $('#ppGuideCanvas');
  var ppBrushCursor = $('#ppBrushCursor');

  var ppSheetFrame = $('#ppSheetFrame');
  var ppSheetCanvas = $('#ppSheetCanvas');
  var ppAiOverlay = $('#ppAiOverlay');
  var ppAiStatusText = $('#ppAiStatusText');

  /* Mobile Quickbar */
  var btnMobilePeek = $('#btnMobilePeek');
  var btnMobileCenter = $('#btnMobileCenter');
  var btnMobileTiltLeft = $('#btnMobileTiltLeft');
  var btnMobileTiltRight = $('#btnMobileTiltRight');
  var btnMobileUndo = $('#btnMobileUndo');
  var btnMobileToggleView = $('#btnMobileToggleView');
  var mobileToggleViewLabel = $('#mobileToggleViewLabel');

  /* Stage Footer */
  var btnStagePeek = $('#btnStagePeek');
  var btnToggleGuide = $('#btnToggleGuide');
  var btnResetAll = $('#btnResetAll');
  var btnClearAll = $('#btnClearAll');

  /* Dock Tabs & Panes */
  var dockTabs = $$('.pp-dock-tab');
  var dockPanes = $$('.pp-step-pane');

  /* Step 1: Size */
  var presetBtns = $$('.pp-preset-btn', $('#ppPresetGrid'));
  var ppCustomSizeBox = $('#ppCustomSizeBox');
  var ppCustomW = $('#ppCustomW');
  var ppCustomH = $('#ppCustomH');
  var ppCustomUnit = $('#ppCustomUnit');
  var btnApplyCustomSize = $('#btnApplyCustomSize');

  /* Step 2: Background & Brush */
  var btnAutoBg = $('#btnAutoBg');
  var btnKeepOrigBg = $('#btnKeepOrigBg');
  var ppBgHexBadge = $('#ppBgHexBadge');
  var swatchBtns = $$('.pp-swatch[data-color]', $('#ppSwatches'));
  var ppCustomBgLabel = $('#ppCustomBgLabel');
  var ppCustomBgColor = $('#ppCustomBgColor');
  var ppBrushHint = $('#ppBrushHint');
  var btnToolPan = $('#btnToolPan');
  var btnBrushRestore = $('#btnBrushRestore');
  var btnBrushErase = $('#btnBrushErase');
  var ppBrushSize = $('#ppBrushSize');
  var ppBrushSizeVal = $('#ppBrushSizeVal');
  var btnUndoMask = $('#btnUndoMask');
  var btnRedoMask = $('#btnRedoMask');

  /* Step 3: Align & Retouch */
  var btnAutoCenter = $('#btnAutoCenter');
  var ppZoom = $('#ppZoom');
  var ppZoomVal = $('#ppZoomVal');
  var ppTilt = $('#ppTilt');
  var ppTiltVal = $('#ppTiltVal');
  var btnRotateLeft = $('#btnRotateLeft');
  var btnRotateRight = $('#btnRotateRight');
  var btnFlipH = $('#btnFlipH');

  var btnAutoLight = $('#btnAutoLight');
  var ppBrightness = $('#ppBrightness');
  var ppBrightnessVal = $('#ppBrightnessVal');
  var ppContrast = $('#ppContrast');
  var ppContrastVal = $('#ppContrastVal');
  var ppWarmth = $('#ppWarmth');
  var ppWarmthVal = $('#ppWarmthVal');
  var ppSharpness = $('#ppSharpness');
  var ppSharpnessVal = $('#ppSharpnessVal');
  var ppSkinSmooth = $('#ppSkinSmooth');
  var ppSkinSmoothVal = $('#ppSkinSmoothVal');

  /* Step 4: Print & Export */
  var ppCopyBadge = $('#ppCopyBadge');
  var paperBtns = $$('.pp-paper-btn', $('#ppPaperGrid'));
  var ppSheetGap = $('#ppSheetGap');
  var ppSheetGapVal = $('#ppSheetGapVal');
  var ppCutGuides = $('#ppCutGuides');
  var exportTargetRadios = $$('input[name="ppExportTarget"]');
  var btnExportJpg = $('#btnExportJpg');
  var btnExportPng = $('#btnExportPng');
  var btnExportPdf = $('#btnExportPdf');
  var btnOpenExportModal = $('#btnOpenExportModal');
  var btnMobileExport = $('#btnMobileExport');
  var ppExportModal = $('#ppExportModal');
  var btnCloseExportModal = $('#btnCloseExportModal');

  /* ----- Offscreen Working Canvases ----- */
  var subjectCanvas = document.createElement('canvas');
  var subjectCtx = subjectCanvas.getContext('2d');
  var subjectImageData = null;

  var fgCanvas = document.createElement('canvas');
  var fgCtx = fgCanvas.getContext('2d');

  var sheetExportCanvas = document.createElement('canvas');

  /* ----- Application State ----- */
  var state = {
    presetId: '40x60',
    photoWMm: 40,
    photoHMm: 60,
    photoWPx: Math.round(40 * MM_TO_PX),
    photoHPx: Math.round(60 * MM_TO_PX),

    viewMode: 'single', /* 'single' | 'sheet' */
    exportTarget: 'single', /* 'single' | 'sheet' */
    showGuide: true,

    /* Image data */
    currentFile: null,
    currentFileName: 'passport-photo',
    objectURL: null,
    originalImage: null,
    origWidth: 0,
    origHeight: 0,
    origImageData: null,
    loadGen: 0,

    /* Background & Cutout */
    hasCutout: false,
    bgMode: 'original', /* 'auto' | 'original' */
    bgColor: '#FFFFFF',
    maskAlpha: null,
    isProcessingAi: false,

    /* Brush & Undo/Redo */
    brushMode: null, /* null | 'restore' | 'erase' */
    brushSizePx: 28,
    undoStack: [],
    redoStack: [],
    isPainting: false,
    preStrokeAlpha: null,
    strokeMinX: 0,
    strokeMinY: 0,
    strokeMaxX: 0,
    strokeMaxY: 0,
    strokeDirty: false,
    lastPaintX: 0,
    lastPaintY: 0,

    /* Alignment */
    panX: 0,
    panY: 0,
    zoomPct: 100,
    tiltDeg: 0,
    rot90: 0,
    flipH: false,

    /* Retouch */
    brightness: 0,
    contrast: 0,
    warmth: 0,
    sharpness: 0,
    skinSmooth: 0,

    /* Print Sheet */
    paperId: '4x6',
    sheetGapMm: 2,
    showCutGuides: true,

    /* Peek */
    isPeeking: false,
  };

  /* Pointer gesture state */
  var activePointers = new Map();
  var isPanning = false;
  var panStartX = 0;
  var panStartY = 0;
  var panOrigX = 0;
  var panOrigY = 0;
  var pinchStartDist = 0;
  var pinchStartZoom = 100;
  var pinchMidStart = null;
  var sliderCursorTimer = 0;
  var rafRenderId = 0;

  /* AI Preload State */
  var activeDevice = 'cpu';
  var preloadPromise = null;

  /* ----- Utility Helpers ----- */
  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function sanitizeHexColor(hex) {
    var s = String(hex || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : '#FFFFFF';
  }

  function hexToRgb(hex) {
    var clean = sanitizeHexColor(hex);
    return [
      parseInt(clean.slice(1, 3), 16),
      parseInt(clean.slice(3, 5), 16),
      parseInt(clean.slice(5, 7), 16),
    ];
  }

  function sanitizeFilenameBase(name) {
    var base = String(name || 'passport').replace(/\.[^.]+$/, '');
    base = base.replace(/[\/\\:*?"<>|\x00-\x1F]+/g, '_').replace(/^\.+|\.+$/g, '').trim();
    return base || 'passport';
  }

  function revokeObjectUrl() {
    if (state.objectURL) {
      try { URL.revokeObjectURL(state.objectURL); } catch (_e) {}
      state.objectURL = null;
    }
  }

  function cleanupCanvas(c) {
    if (!c) return;
    var ctx = c.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, c.width, c.height);
    c.width = 0;
    c.height = 0;
  }

  function isValidImageFile(file) {
    if (!file) return false;
    var type = (file.type || '').toLowerCase();
    if (!type && file.name) {
      var m = file.name.toLowerCase().match(/\.(jpe?g|png|webp|bmp|gif)$/);
      if (m) {
        type = m[1] === 'jpg' || m[1] === 'jpeg' ? 'image/jpeg' : 'image/' + m[1];
      }
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

  /* ----- Dynamic Title & Meta Description (EN / AR) ----- */
  function syncDocumentMeta() {
    var titleText = t('t_passport_t') + ' — imgsfix';
    document.title = titleText;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', t('pp_meta_desc'));
    }
  }

  /* ----- Photo Geometry & Sheet Tiling Math ----- */
  function getEffectiveRotDims() {
    if (!state.origWidth || !state.origHeight) return { w: 1, h: 1 };
    var swapped = (state.rot90 % 180) !== 0;
    return {
      w: swapped ? state.origHeight : state.origWidth,
      h: swapped ? state.origWidth : state.origHeight,
    };
  }

  function getBaseCoverScale() {
    var dims = getEffectiveRotDims();
    return Math.max(state.photoWPx / dims.w, state.photoHPx / dims.h);
  }

  function computeSheetLayout() {
    var paper = PAPERS[state.paperId] || PAPERS['4x6'];
    var gap = clamp(state.sheetGapMm, 0, 4);
    var pW = state.photoWMm;
    var pH = state.photoHMm;
    var margin = paper.minMarginMm;

    function calcOrientation(sw, sh) {
      var usableW = Math.max(1, sw - margin * 2);
      var usableH = Math.max(1, sh - margin * 2);
      var cols = Math.floor((usableW + gap + 0.01) / (pW + gap));
      var rows = Math.floor((usableH + gap + 0.01) / (pH + gap));
      return {
        sheetWMm: sw,
        sheetHMm: sh,
        cols: Math.max(0, cols),
        rows: Math.max(0, rows),
        count: Math.max(0, cols) * Math.max(0, rows),
      };
    }

    var portrait = calcOrientation(paper.wMm, paper.hMm);
    var landscape = calcOrientation(paper.hMm, paper.wMm);
    var best = (landscape.count > portrait.count) ? landscape : portrait;
    if (best.count === 0) {
      best = portrait;
    }
    return best;
  }

  function updateSpecUI() {
    state.photoWPx = Math.max(30, Math.round(state.photoWMm * MM_TO_PX));
    state.photoHPx = Math.max(30, Math.round(state.photoHMm * MM_TO_PX));

    var preset = PRESETS[state.presetId];
    var mmLabel = (preset && preset.displayDim)
      ? preset.displayDim
      : (Number(state.photoWMm.toFixed(1)) + ' × ' + Number(state.photoHMm.toFixed(1)) + ' mm');

    var layout = computeSheetLayout();
    if (ppSpecMeta) {
      if (state.viewMode === 'sheet') {
        var paper = PAPERS[state.paperId] || PAPERS['4x6'];
        ppSpecMeta.textContent = paper.label + ' · ' + layout.count + ' ' + t('pp_copies_unit') + ' · 300 DPI';
      } else {
        ppSpecMeta.textContent = mmLabel + ' · ' + state.photoWPx + ' × ' + state.photoHPx + ' px · 300 DPI';
      }
    }
    if (ppCopyBadge) {
      ppCopyBadge.textContent = layout.count + ' ' + t('pp_copies_unit');
    }
  }

  /* ----- @imgly/background-removal Setup & Preload ----- */
  async function detectPreferredDevice() {
    try {
      if (typeof navigator !== 'undefined' && navigator.gpu && typeof navigator.gpu.requestAdapter === 'function') {
        var adapter = await navigator.gpu.requestAdapter();
        if (adapter) return 'gpu';
      }
    } catch (_err) {
      /* Fallback to CPU */
    }
    return 'cpu';
  }

  function getImglyConfig(device) {
    return {
      model: 'isnet_fp16',
      device: device || activeDevice,
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
      var tempUrl = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        try { URL.revokeObjectURL(tempUrl); } catch (_e) {}
        resolve(img);
      };
      img.onerror = function () {
        try { URL.revokeObjectURL(tempUrl); } catch (_e) {}
        reject(new Error('Failed to decode AI output image'));
      };
      img.src = tempUrl;
    });
  }

  function extractAndRefineMask(aiImg, w, h) {
    var maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    var mctx = maskCanvas.getContext('2d');
    mctx.imageSmoothingEnabled = true;
    mctx.imageSmoothingQuality = 'high';
    mctx.clearRect(0, 0, w, h);
    mctx.drawImage(aiImg, 0, 0, w, h);

    var rawPixels = mctx.getImageData(0, 0, w, h).data;
    cleanupCanvas(maskCanvas);

    var total = w * h;
    var rawAlpha = new Uint8ClampedArray(total);
    for (var i = 0; i < total; i++) {
      rawAlpha[i] = rawPixels[i * 4 + 3];
    }

    var outAlpha = new Uint8ClampedArray(total);
    for (var y = 0; y < h; y++) {
      var yPrev = y > 0 ? y - 1 : 0;
      var yNext = y < h - 1 ? y + 1 : h - 1;
      var row = y * w;
      var rowPrev = yPrev * w;
      var rowNext = yNext * w;

      for (var x = 0; x < w; x++) {
        var c = rawAlpha[row + x];
        if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
          if (c === 255 && rawAlpha[row + x - 1] === 255 && rawAlpha[row + x + 1] === 255 && rawAlpha[rowPrev + x] === 255 && rawAlpha[rowNext + x] === 255) {
            outAlpha[row + x] = 255;
            continue;
          }
          if (c === 0 && rawAlpha[row + x - 1] === 0 && rawAlpha[row + x + 1] === 0 && rawAlpha[rowPrev + x] === 0 && rawAlpha[rowNext + x] === 0) {
            outAlpha[row + x] = 0;
            continue;
          }
        }
        var xPrev = x > 0 ? x - 1 : 0;
        var xNext = x < w - 1 ? x + 1 : w - 1;
        var smoothed = (
          rawAlpha[rowPrev + xPrev] + rawAlpha[rowPrev + x] * 2 + rawAlpha[rowPrev + xNext] +
          rawAlpha[row + xPrev] * 2 + c * 4 + rawAlpha[row + xNext] * 2 +
          rawAlpha[rowNext + xPrev] + rawAlpha[rowNext + x] * 2 + rawAlpha[rowNext + xNext]
        ) >> 4;

        if (smoothed < 64) {
          outAlpha[row + x] = 0;
        } else if (smoothed >= 242) {
          outAlpha[row + x] = 255;
        } else {
          outAlpha[row + x] = smoothed;
        }
      }
    }
    return outAlpha;
  }

  /* ----- Dirty-Rect Subject Layer Compositing (Untouched Original RGB) ----- */
  function syncSubjectRect(x0, y0, x1, y1) {
    if (!state.origImageData || !subjectImageData || !subjectCtx) return;
    var w = state.origWidth;
    var h = state.origHeight;
    var rx0 = Math.max(0, x0);
    var ry0 = Math.max(0, y0);
    var rx1 = Math.min(w - 1, x1);
    var ry1 = Math.min(h - 1, y1);
    if (rx0 > rx1 || ry0 > ry1) return;

    var orig = state.origImageData.data;
    var out = subjectImageData.data;
    var useMask = state.hasCutout && state.bgMode === 'auto' && state.maskAlpha;

    for (var y = ry0; y <= ry1; y++) {
      var row = y * w;
      for (var x = rx0; x <= rx1; x++) {
        var p = row + x;
        var p4 = p * 4;
        out[p4] = orig[p4];
        out[p4 + 1] = orig[p4 + 1];
        out[p4 + 2] = orig[p4 + 2];
        out[p4 + 3] = useMask ? state.maskAlpha[p] : orig[p4 + 3];
      }
    }

    subjectCtx.putImageData(subjectImageData, 0, 0, rx0, ry0, rx1 - rx0 + 1, ry1 - ry0 + 1);
  }

  function syncSubjectFull() {
    if (!state.origWidth || !state.origHeight) return;
    if (subjectCanvas.width !== state.origWidth || subjectCanvas.height !== state.origHeight) {
      subjectCanvas.width = state.origWidth;
      subjectCanvas.height = state.origHeight;
      subjectImageData = subjectCtx.createImageData(state.origWidth, state.origHeight);
    }
    syncSubjectRect(0, 0, state.origWidth - 1, state.origHeight - 1);
  }

  /* ----- Portrait Lighting & Edge-Preserving Skin Smoothness (100% Canvas) ----- */
  function applyPortraitRetouch(imgData) {
    var bVal = state.brightness;
    var cVal = state.contrast;
    var wVal = state.warmth;
    var sharpVal = state.sharpness;
    var smoothVal = state.skinSmooth;

    if (bVal === 0 && cVal === 0 && wVal === 0 && sharpVal === 0 && smoothVal === 0) {
      return;
    }

    var w = imgData.width;
    var h = imgData.height;
    var data = imgData.data;
    var len = w * h;

    /* 1. Tone, Contrast & Warmth */
    if (bVal !== 0 || cVal !== 0 || wVal !== 0) {
      var bShift = bVal * 1.35;
      var cFactor = (259 * (cVal * 1.45 + 255)) / (255 * (259 - cVal * 1.45));
      var rWarm = wVal * 0.85;
      var gWarm = wVal * 0.12;
      var bWarm = -wVal * 0.85;

      for (var i = 0; i < len; i++) {
        var idx = i * 4;
        if (data[idx + 3] === 0) continue;

        var r = data[idx] + bShift + rWarm;
        var g = data[idx + 1] + bShift + gWarm;
        var b = data[idx + 2] + bShift + bWarm;

        if (cVal !== 0) {
          r = cFactor * (r - 128) + 128;
          g = cFactor * (g - 128) + 128;
          b = cFactor * (b - 128) + 128;
        }

        data[idx] = r < 0 ? 0 : (r > 255 ? 255 : r);
        data[idx + 1] = g < 0 ? 0 : (g > 255 ? 255 : g);
        data[idx + 2] = b < 0 ? 0 : (b > 255 ? 255 : b);
      }
    }

    /* 2. Edge-preserving Natural Skin Smoothness (preserves eyes, eyebrows, hair & sharp edges) */
    if (smoothVal > 0) {
      var strength = (smoothVal / 100) * 0.78;
      var rangeSigma = 26 + (smoothVal / 100) * 28;
      var invTwoSigma2 = 1 / (2 * rangeSigma * rangeSigma);
      var src = new Uint8ClampedArray(data);
      var radius = smoothVal > 55 ? 3 : 2;
      var step = smoothVal > 55 ? 2 : 1;

      for (var y = 0; y < h; y++) {
        var row = y * w;
        for (var x = 0; x < w; x++) {
          var p4 = (row + x) * 4;
          if (src[p4 + 3] < 20) continue;

          var cr = src[p4];
          var cg = src[p4 + 1];
          var cb = src[p4 + 2];

          /* Skin / midtone mask: protect very dark hair/pupils and blown specular whites */
          var lum = 0.299 * cr + 0.587 * cg + 0.114 * cb;
          if (lum < 38 || lum > 246) continue;

          /* Subtle warm/skin affinity weighting while allowing gentle midtone smoothing */
          var skinBias = (cr >= cg && cr >= cb * 0.92) ? 1.0 : 0.45;
          var localBlend = strength * skinBias;

          var sumR = cr;
          var sumG = cg;
          var sumB = cb;
          var wSum = 1.0;

          for (var dy = -radius; dy <= radius; dy += step) {
            var ny = y + dy;
            if (ny < 0 || ny >= h) continue;
            var nRow = ny * w;
            for (var dx = -radius; dx <= radius; dx += step) {
              if (dx === 0 && dy === 0) continue;
              var nx = x + dx;
              if (nx < 0 || nx >= w) continue;
              var np4 = (nRow + nx) * 4;
              if (src[np4 + 3] < 128) continue;

              var nr = src[np4];
              var ng = src[np4 + 1];
              var nb = src[np4 + 2];

              var dr = nr - cr;
              var dg = ng - cg;
              var db = nb - cb;
              var colorDist2 = (dr * dr + dg * dg + db * db) * 0.3333;
              var weight = Math.exp(-colorDist2 * invTwoSigma2);

              sumR += nr * weight;
              sumG += ng * weight;
              sumB += nb * weight;
              wSum += weight;
            }
          }

          var avgR = sumR / wSum;
          var avgG = sumG / wSum;
          var avgB = sumB / wSum;

          data[p4] = Math.round(cr + (avgR - cr) * localBlend);
          data[p4 + 1] = Math.round(cg + (avgG - cg) * localBlend);
          data[p4 + 2] = Math.round(cb + (avgB - cb) * localBlend);
        }
      }
    }

    /* 3. Luminance-aware Unsharp Mask Sharpness */
    if (sharpVal > 0) {
      var amt = (sharpVal / 100) * 1.1;
      var sCopy = new Uint8ClampedArray(data);
      for (var sy = 1; sy < h - 1; sy++) {
        var sRow = sy * w;
        var sRowUp = (sy - 1) * w;
        var sRowDn = (sy + 1) * w;
        for (var sx = 1; sx < w - 1; sx++) {
          var sp4 = (sRow + sx) * 4;
          if (sCopy[sp4 + 3] < 20) continue;

          for (var c = 0; c < 3; c++) {
            var center = sCopy[sp4 + c];
            var blur = (
              sCopy[(sRowUp + sx) * 4 + c] +
              sCopy[(sRowDn + sx) * 4 + c] +
              sCopy[(sRow + sx - 1) * 4 + c] +
              sCopy[(sRow + sx + 1) * 4 + c]
            ) * 0.25;
            var diff = center - blur;
            var sharpened = center + diff * amt;
            data[sp4 + c] = sharpened < 0 ? 0 : (sharpened > 255 ? 255 : sharpened);
          }
        }
      }
    }
  }

  /* ----- Rendering Pipeline (Single Photo + Print Sheet + Biometric Guide) ----- */
  function renderSingleToCanvas(targetCanvas, forceOriginalPeek) {
    var outW = state.photoWPx;
    var outH = state.photoHPx;
    if (targetCanvas.width !== outW || targetCanvas.height !== outH) {
      targetCanvas.width = outW;
      targetCanvas.height = outH;
    }

    var ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (!state.originalImage || !state.origWidth) {
      ctx.clearRect(0, 0, outW, outH);
      return;
    }

    var drawBg = !forceOriginalPeek && state.hasCutout && state.bgMode === 'auto';
    if (drawBg) {
      ctx.fillStyle = sanitizeHexColor(state.bgColor);
      ctx.fillRect(0, 0, outW, outH);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outW, outH);
    }

    /* Render transformed foreground */
    if (fgCanvas.width !== outW || fgCanvas.height !== outH) {
      fgCanvas.width = outW;
      fgCanvas.height = outH;
    }
    fgCtx.clearRect(0, 0, outW, outH);
    fgCtx.imageSmoothingEnabled = true;
    fgCtx.imageSmoothingQuality = 'high';

    var scale = getBaseCoverScale() * (state.zoomPct / 100);
    fgCtx.save();
    fgCtx.translate(outW / 2 + state.panX, outH / 2 + state.panY);
    fgCtx.rotate((state.tiltDeg * Math.PI) / 180);
    fgCtx.scale(scale * (state.flipH ? -1 : 1), scale);
    fgCtx.rotate((state.rot90 * Math.PI) / 180);

    var drawSource = forceOriginalPeek ? state.originalImage : subjectCanvas;
    fgCtx.drawImage(drawSource, -state.origWidth / 2, -state.origHeight / 2);
    fgCtx.restore();

    if (!forceOriginalPeek) {
      var hasAdjust =
        state.brightness !== 0 ||
        state.contrast !== 0 ||
        state.warmth !== 0 ||
        state.sharpness !== 0 ||
        state.skinSmooth !== 0;
      if (hasAdjust) {
        var fgData = fgCtx.getImageData(0, 0, outW, outH);
        applyPortraitRetouch(fgData);
        fgCtx.putImageData(fgData, 0, 0);
      }
    }

    ctx.drawImage(fgCanvas, 0, 0);
  }

  function renderBiometricGuide() {
    if (!ppGuideCanvas || !ppSingleCanvas) return;
    var show = state.showGuide && state.viewMode === 'single' && !!state.originalImage && !state.isPeeking;
    ppGuideCanvas.classList.toggle('hide', !show);
    if (!show) return;

    var w = state.photoWPx;
    var h = state.photoHPx;
    if (ppGuideCanvas.width !== w || ppGuideCanvas.height !== h) {
      ppGuideCanvas.width = w;
      ppGuideCanvas.height = h;
    }

    var gctx = ppGuideCanvas.getContext('2d');
    gctx.clearRect(0, 0, w, h);

    var lw = Math.max(1.5, w / 300);

    /* Subtle Crown & Chin 70%-80% compliance bands */
    var crownTopY = h * 0.06;
    var crownBotY = h * 0.13;
    var chinTopY = h * 0.78;
    var chinBotY = h * 0.86;
    var eyeY = h * 0.44;
    var centerX = w * 0.5;

    gctx.save();
    gctx.fillStyle = 'rgba(26, 95, 255, 0.10)';
    gctx.fillRect(0, crownTopY, w, crownBotY - crownTopY);
    gctx.fillRect(0, chinTopY, w, chinBotY - chinTopY);

    /* Horizontal guide lines */
    gctx.lineWidth = lw;
    gctx.setLineDash([lw * 4, lw * 3]);

    /* Crown line */
    gctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
    gctx.beginPath();
    gctx.moveTo(w * 0.18, h * 0.095);
    gctx.lineTo(w * 0.82, h * 0.095);
    gctx.stroke();

    /* Eye level line */
    gctx.strokeStyle = 'rgba(6, 182, 212, 0.92)';
    gctx.beginPath();
    gctx.moveTo(w * 0.08, eyeY);
    gctx.lineTo(w * 0.92, eyeY);
    gctx.stroke();

    /* Chin line */
    gctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
    gctx.beginPath();
    gctx.moveTo(w * 0.18, h * 0.82);
    gctx.lineTo(w * 0.82, h * 0.82);
    gctx.stroke();

    /* Vertical center axis */
    gctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    gctx.beginPath();
    gctx.moveTo(centerX, h * 0.04);
    gctx.lineTo(centerX, h * 0.96);
    gctx.stroke();

    /* Biometric face oval */
    gctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    gctx.lineWidth = lw * 1.15;
    gctx.setLineDash([lw * 5, lw * 4]);
    gctx.beginPath();
    gctx.ellipse(centerX, h * 0.46, w * 0.29, h * 0.365, 0, 0, Math.PI * 2);
    gctx.stroke();

    /* Subtle dark shadow halo for oval visibility on white backgrounds */
    gctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
    gctx.lineWidth = lw * 0.7;
    gctx.stroke();

    /* Eye markers */
    gctx.setLineDash([]);
    gctx.strokeStyle = 'rgba(6, 182, 212, 0.95)';
    gctx.lineWidth = lw * 1.2;
    var eyeSpan = w * 0.125;
    var tick = h * 0.018;
    [centerX - eyeSpan, centerX + eyeSpan].forEach(function (ex) {
      gctx.beginPath();
      gctx.moveTo(ex, eyeY - tick);
      gctx.lineTo(ex, eyeY + tick);
      gctx.stroke();
    });

    /* Compliance labels */
    var fontSize = Math.max(10, Math.round(w * 0.026));
    gctx.font = '700 ' + fontSize + 'px Cairo, sans-serif';
    gctx.textBaseline = 'middle';

    function drawTag(txt, x, y, bg) {
      var padX = fontSize * 0.45;
      var tw = gctx.measureText(txt).width;
      var boxW = tw + padX * 2;
      var boxH = fontSize * 1.45;
      gctx.fillStyle = bg;
      gctx.beginPath();
      var rx = x - boxW / 2;
      var ry = y - boxH / 2;
      if (typeof gctx.roundRect === 'function') {
        gctx.roundRect(rx, ry, boxW, boxH, 4);
      } else {
        gctx.rect(rx, ry, boxW, boxH);
      }
      gctx.fill();
      gctx.fillStyle = '#ffffff';
      gctx.textAlign = 'center';
      gctx.fillText(txt, x, y + 0.5);
    }

    drawTag(t('pp_guide_crown'), centerX, h * 0.095, 'rgba(5, 150, 105, 0.82)');
    drawTag(t('pp_guide_eyes'), w * 0.16, eyeY - fontSize * 1.05, 'rgba(8, 145, 178, 0.85)');
    drawTag(t('pp_guide_chin'), centerX, h * 0.82, 'rgba(5, 150, 105, 0.82)');

    gctx.restore();
  }

  function renderSheetToCanvas(targetCanvas, sourcePhotoCanvas) {
    var layout = computeSheetLayout();
    var sheetW = Math.round(layout.sheetWMm * MM_TO_PX);
    var sheetH = Math.round(layout.sheetHMm * MM_TO_PX);

    if (targetCanvas.width !== sheetW || targetCanvas.height !== sheetH) {
      targetCanvas.width = sheetW;
      targetCanvas.height = sheetH;
    }

    var ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, sheetW, sheetH);

    if (!sourcePhotoCanvas || !sourcePhotoCanvas.width || !layout.count) return layout;

    var tileW = Math.round(state.photoWMm * MM_TO_PX);
    var tileH = Math.round(state.photoHMm * MM_TO_PX);
    var gapPx = Math.round(state.sheetGapMm * MM_TO_PX);

    var blockW = layout.cols * tileW + Math.max(0, layout.cols - 1) * gapPx;
    var blockH = layout.rows * tileH + Math.max(0, layout.rows - 1) * gapPx;
    var startX = Math.round((sheetW - blockW) / 2);
    var startY = Math.round((sheetH - blockH) / 2);

    for (var r = 0; r < layout.rows; r++) {
      for (var c = 0; c < layout.cols; c++) {
        var tx = startX + c * (tileW + gapPx);
        var ty = startY + r * (tileH + gapPx);
        ctx.drawImage(sourcePhotoCanvas, tx, ty, tileW, tileH);

        if (state.showCutGuides) {
          ctx.save();
          ctx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
          ctx.lineWidth = Math.max(1.5, Math.round(MM_TO_PX * 0.15));
          ctx.strokeRect(tx, ty, tileW, tileH);

          /* Corner crop ticks */
          var tickLen = Math.round(MM_TO_PX * 2.2);
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
          ctx.lineWidth = Math.max(2, Math.round(MM_TO_PX * 0.2));
          ctx.beginPath();
          /* TL */
          ctx.moveTo(tx - tickLen, ty); ctx.lineTo(tx, ty); ctx.lineTo(tx, ty - tickLen);
          /* TR */
          ctx.moveTo(tx + tileW + tickLen, ty); ctx.lineTo(tx + tileW, ty); ctx.lineTo(tx + tileW, ty - tickLen);
          /* BL */
          ctx.moveTo(tx - tickLen, ty + tileH); ctx.lineTo(tx, ty + tileH); ctx.lineTo(tx, ty + tileH + tickLen);
          /* BR */
          ctx.moveTo(tx + tileW + tickLen, ty + tileH); ctx.lineTo(tx + tileW, ty + tileH); ctx.lineTo(tx + tileW, ty + tileH + tickLen);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    return layout;
  }

  function renderActiveStage() {
    updateSpecUI();
    if (!state.originalImage) return;

    renderSingleToCanvas(ppSingleCanvas, false);

    if (state.viewMode === 'single') {
      ppSingleFrame.classList.remove('hide');
      ppSheetFrame.classList.add('hide');
      if (state.isPeeking) {
        renderSingleToCanvas(ppOrigPeekCanvas, true);
        ppOrigPeekCanvas.classList.remove('hide');
        ppSingleCanvas.classList.add('hide');
      } else {
        ppOrigPeekCanvas.classList.add('hide');
        ppSingleCanvas.classList.remove('hide');
      }
      renderBiometricGuide();
    } else {
      ppSingleFrame.classList.add('hide');
      ppSheetFrame.classList.remove('hide');
      renderSheetToCanvas(ppSheetCanvas, ppSingleCanvas);
    }
  }

  function scheduleRender() {
    if (rafRenderId) return;
    rafRenderId = requestAnimationFrame(function () {
      rafRenderId = 0;
      renderActiveStage();
    });
  }

  /* ----- Controls Enable / Sync ----- */
  function updateUndoRedoButtons() {
    var hasImg = !!state.originalImage;
    var canUndo = hasImg && state.undoStack.length > 0;
    var canRedo = hasImg && state.redoStack.length > 0;
    if (btnUndoMask) btnUndoMask.disabled = !canUndo;
    if (btnRedoMask) btnRedoMask.disabled = !canRedo;
    if (btnMobileUndo) btnMobileUndo.disabled = !canUndo;
  }

  function setBrushMode(mode) {
    if (!state.hasCutout || state.bgMode !== 'auto') mode = null;
    state.brushMode = mode;

    if (btnToolPan) {
      var panActive = mode === null;
      btnToolPan.classList.toggle('active', panActive);
      btnToolPan.setAttribute('aria-pressed', panActive ? 'true' : 'false');
    }
    if (btnBrushRestore) {
      var rActive = mode === 'restore';
      btnBrushRestore.classList.toggle('active', rActive);
      btnBrushRestore.setAttribute('aria-pressed', rActive ? 'true' : 'false');
    }
    if (btnBrushErase) {
      var eActive = mode === 'erase';
      btnBrushErase.classList.toggle('active', eActive);
      btnBrushErase.setAttribute('aria-pressed', eActive ? 'true' : 'false');
    }
    if (ppSingleFrame) {
      ppSingleFrame.classList.toggle('is-brushing', mode !== null);
    }
    if (ppBrushCursor) {
      ppBrushCursor.classList.toggle('mode-restore', mode === 'restore');
      ppBrushCursor.classList.toggle('mode-erase', mode === 'erase');
      if (mode === null) ppBrushCursor.classList.add('hide');
    }
  }

  function syncControlsState() {
    var hasImg = !!state.originalImage;
    var hasAi = hasImg && state.hasCutout;
    var brushEnabled = hasAi && state.bgMode === 'auto';

    if (btnReplacePhoto) btnReplacePhoto.classList.toggle('hide', !hasImg);
    if (btnResetAll) btnResetAll.disabled = !hasImg;
    if (btnClearAll) btnClearAll.disabled = !hasImg;
    if (btnStagePeek) btnStagePeek.disabled = !hasImg;
    if (btnMobilePeek) btnMobilePeek.disabled = !hasImg;
    if (btnMobileCenter) btnMobileCenter.disabled = !hasImg;
    if (btnMobileTiltLeft) btnMobileTiltLeft.disabled = !hasImg;
    if (btnMobileTiltRight) btnMobileTiltRight.disabled = !hasImg;
    if (btnOpenExportModal) btnOpenExportModal.disabled = !hasImg;
    if (btnMobileExport) btnMobileExport.disabled = !hasImg;

    if (btnAutoBg) btnAutoBg.disabled = !hasImg || state.isProcessingAi;
    if (btnKeepOrigBg) {
      btnKeepOrigBg.disabled = !hasImg;
      var keepOrig = state.bgMode === 'original' || !state.hasCutout;
      btnKeepOrigBg.classList.toggle('active', keepOrig);
      btnKeepOrigBg.setAttribute('aria-pressed', keepOrig ? 'true' : 'false');
    }

    if (btnToolPan) btnToolPan.disabled = !hasImg;
    if (btnBrushRestore) btnBrushRestore.disabled = !brushEnabled;
    if (btnBrushErase) btnBrushErase.disabled = !brushEnabled;
    if (ppBrushSize) ppBrushSize.disabled = !brushEnabled;
    if (ppBrushHint) {
      ppBrushHint.textContent = brushEnabled
        ? t('pp_brush_ready')
        : (hasAi ? t('pp_brush_auto_mode') : t('pp_brush_need_cutout'));
    }

    if (btnAutoCenter) btnAutoCenter.disabled = !hasImg;
    if (ppZoom) ppZoom.disabled = !hasImg;
    if (ppTilt) ppTilt.disabled = !hasImg;
    if (btnRotateLeft) btnRotateLeft.disabled = !hasImg;
    if (btnRotateRight) btnRotateRight.disabled = !hasImg;
    if (btnFlipH) btnFlipH.disabled = !hasImg;

    if (btnAutoLight) btnAutoLight.disabled = !hasImg;
    if (ppBrightness) ppBrightness.disabled = !hasImg;
    if (ppContrast) ppContrast.disabled = !hasImg;
    if (ppWarmth) ppWarmth.disabled = !hasImg;
    if (ppSharpness) ppSharpness.disabled = !hasImg;
    if (ppSkinSmooth) ppSkinSmooth.disabled = !hasImg;

    if (btnExportJpg) btnExportJpg.disabled = !hasImg;
    if (btnExportPng) btnExportPng.disabled = !hasImg;
    if (btnExportPdf) btnExportPdf.disabled = !hasImg;

    updateUndoRedoButtons();
  }

  function syncSlidersUI() {
    if (ppZoom) ppZoom.value = String(state.zoomPct);
    if (ppZoomVal) ppZoomVal.textContent = Math.round(state.zoomPct) + '%';
    if (ppTilt) ppTilt.value = String(state.tiltDeg);
    if (ppTiltVal) ppTiltVal.textContent = Number(state.tiltDeg).toFixed(1) + '°';

    if (ppBrightness) ppBrightness.value = String(state.brightness);
    if (ppBrightnessVal) ppBrightnessVal.textContent = (state.brightness > 0 ? '+' : '') + state.brightness;
    if (ppContrast) ppContrast.value = String(state.contrast);
    if (ppContrastVal) ppContrastVal.textContent = (state.contrast > 0 ? '+' : '') + state.contrast;
    if (ppWarmth) ppWarmth.value = String(state.warmth);
    if (ppWarmthVal) ppWarmthVal.textContent = (state.warmth > 0 ? '+' : '') + state.warmth;
    if (ppSharpness) ppSharpness.value = String(state.sharpness);
    if (ppSharpnessVal) ppSharpnessVal.textContent = String(state.sharpness);
    if (ppSkinSmooth) ppSkinSmooth.value = String(state.skinSmooth);
    if (ppSkinSmoothVal) ppSkinSmoothVal.textContent = String(state.skinSmooth);
  }

  /* ----- View & Dock Step Switching ----- */
  function setViewMode(mode, syncExportRadio) {
    state.viewMode = mode === 'sheet' ? 'sheet' : 'single';
    if (btnViewSingle) {
      btnViewSingle.classList.toggle('active', state.viewMode === 'single');
      btnViewSingle.setAttribute('aria-selected', state.viewMode === 'single' ? 'true' : 'false');
    }
    if (btnViewSheet) {
      btnViewSheet.classList.toggle('active', state.viewMode === 'sheet');
      btnViewSheet.setAttribute('aria-selected', state.viewMode === 'sheet' ? 'true' : 'false');
    }
    if (mobileToggleViewLabel) {
      var nextKey = state.viewMode === 'single' ? 'pp_view_sheet' : 'pp_view_single';
      mobileToggleViewLabel.setAttribute('data-i18n', nextKey);
      mobileToggleViewLabel.textContent = t(nextKey);
    }
    if (syncExportRadio !== false) {
      state.exportTarget = state.viewMode;
      exportTargetRadios.forEach(function (r) {
        r.checked = r.value === state.exportTarget;
      });
    }
    if (state.viewMode === 'sheet') {
      setBrushMode(null);
    }
    renderActiveStage();
  }

  function setDockStep(stepId) {
    dockTabs.forEach(function (tab) {
      var active = tab.getAttribute('data-step') === stepId;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    dockPanes.forEach(function (pane) {
      pane.classList.toggle('active', pane.getAttribute('data-step-pane') === stepId);
    });
  }

  /* ----- Image Loading, Reset & Clear ----- */
  function loadFile(file) {
    if (!isValidImageFile(file)) return;

    state.loadGen += 1;
    var activeGen = state.loadGen;
    state.isProcessingAi = false;
    if (ppAiOverlay) ppAiOverlay.classList.add('hide');

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
        toast(t('pp_err_dims'), 'err');
        clearAll();
        return;
      }

      state.originalImage = img;
      state.origWidth = nw;
      state.origHeight = nh;

      var probe = document.createElement('canvas');
      probe.width = nw;
      probe.height = nh;
      var pctx = probe.getContext('2d');
      pctx.drawImage(img, 0, 0, nw, nh);
      state.origImageData = pctx.getImageData(0, 0, nw, nh);
      cleanupCanvas(probe);

      state.hasCutout = false;
      state.bgMode = 'original';
      state.maskAlpha = null;
      state.undoStack = [];
      state.redoStack = [];
      state.panX = 0;
      state.panY = 0;
      state.zoomPct = 100;
      state.tiltDeg = 0;
      state.rot90 = 0;
      state.flipH = false;
      state.brightness = 0;
      state.contrast = 0;
      state.warmth = 0;
      state.sharpness = 0;
      state.skinSmooth = 0;

      syncSubjectFull();
      syncSlidersUI();
      setBrushMode(null);
      resetStudioBaseline();

      if (ppEmptyState) ppEmptyState.classList.add('hide');
      syncControlsState();
      renderActiveStage();
      toast(t('pp_img_loaded'), 'ok');
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
    if (ppAiOverlay) ppAiOverlay.classList.add('hide');

    state.hasCutout = false;
    state.bgMode = 'original';
    state.maskAlpha = null;
    state.undoStack = [];
    state.redoStack = [];
    state.panX = 0;
    state.panY = 0;
    state.zoomPct = 100;
    state.tiltDeg = 0;
    state.rot90 = 0;
    state.flipH = false;
    state.brightness = 0;
    state.contrast = 0;
    state.warmth = 0;
    state.sharpness = 0;
    state.skinSmooth = 0;
    state.isPeeking = false;

    setBrushMode(null);
    syncSubjectFull();
    syncSlidersUI();
    resetStudioBaseline();
    syncControlsState();
    renderActiveStage();
    toast(t('tc_reset'), 'ok');
  }

  function clearAll() {
    state.loadGen += 1;
    state.isProcessingAi = false;
    if (ppAiOverlay) ppAiOverlay.classList.add('hide');

    revokeObjectUrl();
    state.currentFile = null;
    state.originalImage = null;
    state.origImageData = null;
    state.origWidth = 0;
    state.origHeight = 0;
    state.hasCutout = false;
    state.bgMode = 'original';
    state.maskAlpha = null;
    state.undoStack = [];
    state.redoStack = [];
    state.isPeeking = false;
    subjectImageData = null;

    setBrushMode(null);
    cleanupCanvas(subjectCanvas);
    cleanupCanvas(fgCanvas);
    cleanupCanvas(ppSingleCanvas);
    cleanupCanvas(ppOrigPeekCanvas);
    cleanupCanvas(ppGuideCanvas);
    cleanupCanvas(ppSheetCanvas);
    cleanupCanvas(sheetExportCanvas);

    if (ppSingleFrame) ppSingleFrame.classList.add('hide');
    if (ppSheetFrame) ppSheetFrame.classList.add('hide');
    if (ppEmptyState) ppEmptyState.classList.remove('hide');
    if (ppFileInput) ppFileInput.value = '';

    syncControlsState();
    updateSpecUI();
  }

  /* ----- Smart Background Removal & Official Swatches ----- */
  async function handleAutoRemoveBg() {
    if (!state.originalImage || !state.currentFile || !state.origImageData) {
      toast(t('tc_load_first'), 'err');
      return;
    }
    if (state.isProcessingAi) return;

    var activeGen = state.loadGen;
    state.isProcessingAi = true;
    setBrushMode(null);
    syncControlsState();
    if (ppAiOverlay) ppAiOverlay.classList.remove('hide');
    if (ppAiStatusText) ppAiStatusText.textContent = t('pp_ai_working');

    try {
      if (preloadPromise) {
        await preloadPromise;
        if (activeGen !== state.loadGen) return;
      } else {
        activeDevice = await detectPreferredDevice();
        if (activeGen !== state.loadGen) return;
      }

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

      state.maskAlpha = extractAndRefineMask(aiImg, state.origWidth, state.origHeight);
      state.hasCutout = true;
      state.bgMode = 'auto';
      state.undoStack = [];
      state.redoStack = [];

      syncSubjectFull();
      resetStudioBaseline();
      syncControlsState();
      renderActiveStage();
      toast(t('pp_bg_done'), 'ok');
    } catch (err) {
      if (activeGen !== state.loadGen) return;
      console.error('Passport AI background error:', err);
      toast(t('tc_removebg_fail'), 'err');
    } finally {
      if (activeGen === state.loadGen) {
        state.isProcessingAi = false;
        if (ppAiOverlay) ppAiOverlay.classList.add('hide');
        syncControlsState();
      }
    }
  }

  function selectBgColor(hex, fromCustomPicker) {
    var clean = sanitizeHexColor(hex);
    state.bgColor = clean;
    if (ppBgHexBadge) ppBgHexBadge.textContent = clean;

    swatchBtns.forEach(function (btn) {
      var active = !fromCustomPicker && btn.getAttribute('data-color').toUpperCase() === clean;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    if (ppCustomBgLabel) {
      ppCustomBgLabel.classList.toggle('active', Boolean(fromCustomPicker));
    }
    if (ppCustomBgColor && !fromCustomPicker) {
      ppCustomBgColor.value = clean;
    }

    if (state.hasCutout && state.bgMode !== 'auto') {
      state.bgMode = 'auto';
      syncSubjectFull();
      syncControlsState();
    }
    if (state.originalImage) {
      scheduleStudioCommit();
      scheduleRender();
    }
  }

  /* ----- Brush Coordinate Inverse Transform & Painting ----- */
  function clientToOrigImageCoords(clientX, clientY) {
    var rect = ppSingleCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: 0, y: 0 };

    var ox = (clientX - rect.left) * (state.photoWPx / rect.width);
    var oy = (clientY - rect.top) * (state.photoHPx / rect.height);

    var dx = ox - (state.photoWPx / 2 + state.panX);
    var dy = oy - (state.photoHPx / 2 + state.panY);

    var tiltRad = (-state.tiltDeg * Math.PI) / 180;
    var cosT = Math.cos(tiltRad);
    var sinT = Math.sin(tiltRad);
    var tx = dx * cosT - dy * sinT;
    var ty = dx * sinT + dy * cosT;

    var scale = getBaseCoverScale() * (state.zoomPct / 100);
    var sx = tx / (scale * (state.flipH ? -1 : 1));
    var sy = ty / scale;

    var r90Rad = (-state.rot90 * Math.PI) / 180;
    var cosR = Math.cos(r90Rad);
    var sinR = Math.sin(r90Rad);
    var rx = sx * cosR - sy * sinR;
    var ry = sx * sinR + sy * cosR;

    return {
      x: rx + state.origWidth / 2,
      y: ry + state.origHeight / 2,
    };
  }

  function getBrushRadiusInImagePx() {
    var rect = ppSingleCanvas.getBoundingClientRect();
    var displayW = rect.width > 0 ? rect.width : state.photoWPx;
    var cssDiameter = state.brushSizePx;
    var scale = getBaseCoverScale() * (state.zoomPct / 100);
    return Math.max(1, (cssDiameter / 2) * (state.photoWPx / displayW) / scale);
  }

  function updateBrushCursor(clientX, clientY) {
    if (!ppBrushCursor || !ppSingleFrame || !state.brushMode || !state.hasCutout || state.bgMode !== 'auto' || state.isPeeking || state.viewMode !== 'single') {
      if (ppBrushCursor) ppBrushCursor.classList.add('hide');
      return;
    }
    var frameRect = ppSingleFrame.getBoundingClientRect();
    ppBrushCursor.style.width = state.brushSizePx + 'px';
    ppBrushCursor.style.height = state.brushSizePx + 'px';
    ppBrushCursor.style.left = (clientX - frameRect.left) + 'px';
    ppBrushCursor.style.top = (clientY - frameRect.top) + 'px';
    ppBrushCursor.classList.remove('hide');
  }

  function paintDab(cx, cy, radius, mode) {
    if (!state.maskAlpha) return;
    var w = state.origWidth;
    var h = state.origHeight;
    var rInt = Math.ceil(radius);
    var x0 = Math.max(0, Math.floor(cx - rInt));
    var y0 = Math.max(0, Math.floor(cy - rInt));
    var x1 = Math.min(w - 1, Math.ceil(cx + rInt));
    var y1 = Math.min(h - 1, Math.ceil(cy + rInt));
    if (x0 > x1 || y0 > y1) return;

    var r2 = radius * radius;
    var isRestore = mode === 'restore';

    for (var y = y0; y <= y1; y++) {
      var dy = y - cy;
      var dy2 = dy * dy;
      var row = y * w;
      for (var x = x0; x <= x1; x++) {
        var dx = x - cx;
        var d2 = dx * dx + dy2;
        if (d2 > r2) continue;

        var norm = Math.sqrt(d2) / radius;
        var falloff = norm <= 0.6 ? 1 : 1 - Math.pow((norm - 0.6) / 0.4, 2);
        var p = row + x;
        if (isRestore) {
          var targetR = Math.round(255 * falloff);
          if (targetR > state.maskAlpha[p]) state.maskAlpha[p] = targetR;
        } else {
          var targetE = Math.round(255 * (1 - falloff));
          if (targetE < state.maskAlpha[p]) state.maskAlpha[p] = targetE;
        }
      }
    }

    if (!state.strokeDirty) {
      state.strokeMinX = x0;
      state.strokeMinY = y0;
      state.strokeMaxX = x1;
      state.strokeMaxY = y1;
      state.strokeDirty = true;
    } else {
      if (x0 < state.strokeMinX) state.strokeMinX = x0;
      if (y0 < state.strokeMinY) state.strokeMinY = y0;
      if (x1 > state.strokeMaxX) state.strokeMaxX = x1;
      if (y1 > state.strokeMaxY) state.strokeMaxY = y1;
    }

    syncSubjectRect(x0, y0, x1, y1);
    scheduleRender();
  }

  function paintStrokeSegment(x0, y0, x1, y1, radius, mode) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var dist = Math.hypot(dx, dy);
    var step = Math.max(1, radius * 0.25);
    var steps = Math.max(1, Math.ceil(dist / step));
    for (var s = 0; s <= steps; s++) {
      var f = s / steps;
      paintDab(x0 + dx * f, y0 + dy * f, radius, mode);
    }
  }

  function commitBrushStroke() {
    if (!state.strokeDirty || !state.preStrokeAlpha || !state.maskAlpha) {
      state.preStrokeAlpha = null;
      state.strokeDirty = false;
      return;
    }
    var w = state.strokeMaxX - state.strokeMinX + 1;
    var h = state.strokeMaxY - state.strokeMinY + 1;
    var beforePatch = new Uint8ClampedArray(w * h);
    var afterPatch = new Uint8ClampedArray(w * h);
    var changed = false;

    for (var py = 0; py < h; py++) {
      var srcRow = (state.strokeMinY + py) * state.origWidth + state.strokeMinX;
      var dstRow = py * w;
      for (var px = 0; px < w; px++) {
        var bv = state.preStrokeAlpha[srcRow + px];
        var av = state.maskAlpha[srcRow + px];
        beforePatch[dstRow + px] = bv;
        afterPatch[dstRow + px] = av;
        if (bv !== av) changed = true;
      }
    }

    if (changed) {
      state.undoStack.push({
        type: 'mask',
        x: state.strokeMinX,
        y: state.strokeMinY,
        w: w,
        h: h,
        before: beforePatch,
        after: afterPatch,
      });
      if (state.undoStack.length > MAX_UNDO) state.undoStack.shift();
      state.redoStack = [];
      updateUndoRedoButtons();
    }

    state.preStrokeAlpha = null;
    state.strokeDirty = false;
  }

  var committedStudio = null;
  var studioCommitTimer = 0;

  function captureStudioSnapshot() {
    return {
      bgMode: state.bgMode,
      bgColor: state.bgColor,
      panX: state.panX,
      panY: state.panY,
      zoomPct: state.zoomPct,
      tiltDeg: state.tiltDeg,
      rot90: state.rot90,
      flipH: state.flipH,
      brightness: state.brightness,
      contrast: state.contrast,
      warmth: state.warmth,
      sharpness: state.sharpness,
      skinSmooth: state.skinSmooth,
    };
  }

  function studioSnapshotsEqual(a, b) {
    if (!a || !b) return false;
    return (
      a.bgMode === b.bgMode &&
      a.bgColor === b.bgColor &&
      a.panX === b.panX &&
      a.panY === b.panY &&
      a.zoomPct === b.zoomPct &&
      a.tiltDeg === b.tiltDeg &&
      a.rot90 === b.rot90 &&
      a.flipH === b.flipH &&
      a.brightness === b.brightness &&
      a.contrast === b.contrast &&
      a.warmth === b.warmth &&
      a.sharpness === b.sharpness &&
      a.skinSmooth === b.skinSmooth
    );
  }

  function resetStudioBaseline() {
    clearTimeout(studioCommitTimer);
    committedStudio = state.originalImage ? captureStudioSnapshot() : null;
  }

  function commitStudioChange() {
    clearTimeout(studioCommitTimer);
    if (!state.originalImage) return;
    var next = captureStudioSnapshot();
    if (!committedStudio) {
      committedStudio = next;
      return;
    }
    if (studioSnapshotsEqual(committedStudio, next)) return;
    state.undoStack.push({
      type: 'studio',
      before: committedStudio,
      after: next,
    });
    if (state.undoStack.length > MAX_UNDO) state.undoStack.shift();
    state.redoStack = [];
    committedStudio = next;
    updateUndoRedoButtons();
  }

  function scheduleStudioCommit() {
    clearTimeout(studioCommitTimer);
    studioCommitTimer = setTimeout(commitStudioChange, 240);
  }

  function applyStudioSnapshot(snap) {
    if (!snap) return;
    var prevBgMode = state.bgMode;
    state.bgMode = snap.bgMode === 'auto' && state.hasCutout ? 'auto' : 'original';
    state.bgColor = sanitizeHexColor(snap.bgColor);
    state.panX = snap.panX;
    state.panY = snap.panY;
    state.zoomPct = snap.zoomPct;
    state.tiltDeg = snap.tiltDeg;
    state.rot90 = snap.rot90;
    state.flipH = Boolean(snap.flipH);
    state.brightness = snap.brightness;
    state.contrast = snap.contrast;
    state.warmth = snap.warmth;
    state.sharpness = snap.sharpness;
    state.skinSmooth = snap.skinSmooth;

    if (ppBgHexBadge) ppBgHexBadge.textContent = state.bgColor;
    swatchBtns.forEach(function (btn) {
      var active = btn.getAttribute('data-color').toUpperCase() === state.bgColor;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    if (ppCustomBgColor) ppCustomBgColor.value = state.bgColor;
    if (prevBgMode !== state.bgMode) {
      if (state.bgMode !== 'auto') setBrushMode(null);
      syncSubjectFull();
      syncControlsState();
    }
    committedStudio = captureStudioSnapshot();
    syncSlidersUI();
    renderActiveStage();
  }

  function applyMaskPatch(entry, useAfter) {
    var patch = useAfter ? entry.after : entry.before;
    for (var py = 0; py < entry.h; py++) {
      var dstRow = (entry.y + py) * state.origWidth + entry.x;
      var srcRow = py * entry.w;
      for (var px = 0; px < entry.w; px++) {
        state.maskAlpha[dstRow + px] = patch[srcRow + px];
      }
    }
    syncSubjectRect(entry.x, entry.y, entry.x + entry.w - 1, entry.y + entry.h - 1);
    renderActiveStage();
  }

  function handleUndoMask() {
    if (!state.originalImage || state.undoStack.length === 0) return;
    var entry = state.undoStack.pop();
    state.redoStack.push(entry);
    if (entry.type === 'studio') {
      applyStudioSnapshot(entry.before);
    } else if (state.hasCutout && state.bgMode === 'auto' && state.maskAlpha) {
      applyMaskPatch(entry, false);
    }
    updateUndoRedoButtons();
  }

  function handleRedoMask() {
    if (!state.originalImage || state.redoStack.length === 0) return;
    var entry = state.redoStack.pop();
    state.undoStack.push(entry);
    if (entry.type === 'studio') {
      applyStudioSnapshot(entry.after);
    } else if (state.hasCutout && state.bgMode === 'auto' && state.maskAlpha) {
      applyMaskPatch(entry, true);
    }
    updateUndoRedoButtons();
  }

  /* ----- Studio Auto-Light Analysis ----- */
  function handleStudioAutoLight() {
    if (!state.originalImage) {
      toast(t('tc_load_first'), 'err');
      return;
    }

    renderSingleToCanvas(ppSingleCanvas, false);
    var data = fgCtx.getImageData(0, 0, state.photoWPx, state.photoHPx).data;
    var hist = new Uint32Array(256);
    var totalLum = 0;
    var sumR = 0;
    var sumG = 0;
    var sumB = 0;
    var count = 0;

    for (var i = 0; i < data.length; i += 16) {
      if (data[i + 3] < 200) continue;
      var r = data[i];
      var g = data[i + 1];
      var b = data[i + 2];
      var lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      hist[clamp(lum, 0, 255)] += 1;
      totalLum += lum;
      sumR += r;
      sumG += g;
      sumB += b;
      count += 1;
    }

    if (count < 20) return;

    var p10 = 0;
    var p90 = 255;
    var acc = 0;
    for (var k = 0; k < 256; k++) {
      acc += hist[k];
      if (acc >= count * 0.1 && p10 === 0) p10 = k;
      if (acc >= count * 0.9) { p90 = k; break; }
    }

    var meanLum = totalLum / count;
    var targetBrightness = clamp(Math.round((134 - meanLum) * 0.45), -18, 26);
    var spread = Math.max(40, p90 - p10);
    var targetContrast = clamp(Math.round((165 - spread) * 0.18), -10, 22);

    var avgR = sumR / count;
    var avgB = sumB / count;
    var rbDiff = avgR - avgB;
    var targetWarmth = clamp(Math.round((18 - rbDiff) * 0.28), -14, 16);

    state.brightness = targetBrightness;
    state.contrast = targetContrast;
    state.warmth = targetWarmth;
    state.sharpness = 22;
    state.skinSmooth = 24;

    syncSlidersUI();
    renderActiveStage();
    commitStudioChange();
    toast(t('pp_auto_light_ok'), 'ok');
  }

  /* ----- Peek Before/After ----- */
  function setPeeking(active) {
    if (!state.originalImage) return;
    if (state.viewMode !== 'single' && active) {
      setViewMode('single');
    }
    state.isPeeking = Boolean(active);
    if (btnStagePeek) btnStagePeek.classList.toggle('is-peeking', state.isPeeking);
    if (btnMobilePeek) btnMobilePeek.classList.toggle('is-peeking', state.isPeeking);
    if (ppBrushCursor && state.isPeeking) ppBrushCursor.classList.add('hide');
    renderActiveStage();
  }

  /* ----- Export & Print Modal ----- */
  function openExportModal() {
    if (!state.originalImage) {
      toast(t('tc_load_first'), 'err');
      return;
    }
    if (!ppExportModal) return;
    updateSpecUI();
    ppExportModal.classList.remove('hide');
  }

  function closeExportModal() {
    if (ppExportModal) ppExportModal.classList.add('hide');
  }

  /* ----- Export JPG / PNG / Millimeter-Accurate PDF (300 DPI) ----- */
  function handleExport(format) {
    if (!state.originalImage) {
      toast(t('tc_load_first'), 'err');
      return;
    }

    /* Always render fresh single photo at full 300 DPI resolution */
    renderSingleToCanvas(ppSingleCanvas, false);

    var exportCanvas = ppSingleCanvas;
    var physWMm = state.photoWMm;
    var physHMm = state.photoHMm;
    var suffix = state.presetId;

    if (state.exportTarget === 'sheet') {
      var layout = renderSheetToCanvas(sheetExportCanvas, ppSingleCanvas);
      exportCanvas = sheetExportCanvas;
      physWMm = layout.sheetWMm;
      physHMm = layout.sheetHMm;
      suffix = state.presetId + '-' + state.paperId + '-' + layout.count + 'copies';
    }

    var fileBase = state.currentFileName + '_passport_' + suffix + '_300dpi';

    if (format === 'pdf') {
      try {
        var orientation = physWMm >= physHMm ? 'landscape' : 'portrait';
        var pdf = new jsPDF({
          orientation: orientation,
          unit: 'mm',
          format: [physWMm, physHMm],
        });
        var jpgData = exportCanvas.toDataURL('image/jpeg', 0.96);
        pdf.addImage(jpgData, 'JPEG', 0, 0, physWMm, physHMm, undefined, 'NONE');
        var pdfBlob = pdf.output('blob');
        if (typeof I.triggerDownload === 'function') {
          I.triggerDownload(pdfBlob, fileBase + '.pdf');
        }
        toast(t('pp_export_ok'), 'ok');
      } catch (err) {
        console.error('Passport PDF export error:', err);
        toast(t('pp_export_err'), 'err');
      }
      return;
    }

    var mime = format === 'png' ? 'image/png' : 'image/jpeg';
    var ext = format === 'png' ? 'png' : 'jpg';
    var quality = format === 'png' ? 1.0 : 0.96;

    if (typeof I.downloadCanvas === 'function') {
      I.downloadCanvas(
        exportCanvas,
        fileBase + '.' + ext,
        mime,
        quality,
        function () { toast(t('pp_export_ok'), 'ok'); },
        function () { toast(t('pp_export_err'), 'err'); }
      );
    } else {
      exportCanvas.toBlob(function (blob) {
        if (!blob) {
          toast(t('pp_export_err'), 'err');
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
        toast(t('pp_export_ok'), 'ok');
      }, mime, quality);
    }
  }

  /* ----- Event Wiring ----- */
  /* Dock Step Tabs */
  dockTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      setDockStep(tab.getAttribute('data-step'));
    });
  });

  /* View Segment */
  if (btnViewSingle) btnViewSingle.addEventListener('click', function () { setViewMode('single'); });
  if (btnViewSheet) btnViewSheet.addEventListener('click', function () { setViewMode('sheet'); });

  /* Step 1: Official Presets & Custom Size */
  presetBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-preset');
      state.presetId = id;
      presetBtns.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-checked', active ? 'true' : 'false');
      });

      if (id === 'custom') {
        if (ppCustomSizeBox) ppCustomSizeBox.classList.remove('hide');
      } else {
        if (ppCustomSizeBox) ppCustomSizeBox.classList.add('hide');
        var p = PRESETS[id];
        if (p) {
          state.photoWMm = p.wMm;
          state.photoHMm = p.hMm;
          renderActiveStage();
        }
      }
    });
  });

  if (btnApplyCustomSize) {
    btnApplyCustomSize.addEventListener('click', function () {
      var rawW = parseFloat(ppCustomW ? ppCustomW.value : '40');
      var rawH = parseFloat(ppCustomH ? ppCustomH.value : '60');
      var unit = ppCustomUnit ? ppCustomUnit.value : 'mm';

      if (!Number.isFinite(rawW) || !Number.isFinite(rawH) || rawW <= 0 || rawH <= 0) {
        toast(t('pp_err_custom_dim'), 'err');
        return;
      }

      var wMm = rawW;
      var hMm = rawH;
      if (unit === 'cm') {
        wMm = rawW * 10;
        hMm = rawH * 10;
      } else if (unit === 'in') {
        wMm = rawW * MM_PER_INCH;
        hMm = rawH * MM_PER_INCH;
      } else if (unit === 'px') {
        wMm = rawW / MM_TO_PX;
        hMm = rawH / MM_TO_PX;
      }

      wMm = clamp(wMm, 10, 297);
      hMm = clamp(hMm, 10, 297);
      state.photoWMm = wMm;
      state.photoHMm = hMm;
      renderActiveStage();
      toast(t('pp_size_updated'), 'ok');
    });
  }

  /* Step 2: Background & Swatches */
  if (btnAutoBg) btnAutoBg.addEventListener('click', handleAutoRemoveBg);
  if (btnKeepOrigBg) {
    btnKeepOrigBg.addEventListener('click', function () {
      if (!state.originalImage) return;
      state.bgMode = 'original';
      setBrushMode(null);
      syncSubjectFull();
      syncControlsState();
      renderActiveStage();
      commitStudioChange();
    });
  }

  swatchBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectBgColor(btn.getAttribute('data-color'), false);
    });
  });
  if (ppCustomBgColor) {
    ppCustomBgColor.addEventListener('input', function () {
      selectBgColor(ppCustomBgColor.value, true);
    });
  }

  if (btnToolPan) btnToolPan.addEventListener('click', function () { setBrushMode(null); });
  if (btnBrushRestore) {
    btnBrushRestore.addEventListener('click', function () {
      setBrushMode(state.brushMode === 'restore' ? null : 'restore');
    });
  }
  if (btnBrushErase) {
    btnBrushErase.addEventListener('click', function () {
      setBrushMode(state.brushMode === 'erase' ? null : 'erase');
    });
  }
  if (ppBrushSize) {
    ppBrushSize.addEventListener('input', function () {
      state.brushSizePx = clamp(parseInt(ppBrushSize.value, 10) || 28, 8, 110);
      if (ppBrushSizeVal) ppBrushSizeVal.textContent = state.brushSizePx + ' px';
      if (ppBrushCursor && ppSingleFrame && state.brushMode && state.hasCutout && state.bgMode === 'auto') {
        var r = ppSingleFrame.getBoundingClientRect();
        ppBrushCursor.style.width = state.brushSizePx + 'px';
        ppBrushCursor.style.height = state.brushSizePx + 'px';
        ppBrushCursor.style.left = (r.width / 2) + 'px';
        ppBrushCursor.style.top = (r.height / 2) + 'px';
        ppBrushCursor.classList.remove('hide');
        clearTimeout(sliderCursorTimer);
        sliderCursorTimer = setTimeout(function () {
          if (!state.isPainting && ppBrushCursor) ppBrushCursor.classList.add('hide');
        }, 800);
      }
    });
  }
  if (btnUndoMask) btnUndoMask.addEventListener('click', handleUndoMask);
  if (btnRedoMask) btnRedoMask.addEventListener('click', handleRedoMask);

  /* Step 3: Alignment & Studio Retouch */
  if (btnAutoCenter) {
    btnAutoCenter.addEventListener('click', function () {
      if (!state.originalImage) return;
      state.panX = 0;
      state.panY = 0;
      state.zoomPct = 100;
      state.tiltDeg = 0;
      syncSlidersUI();
      renderActiveStage();
      commitStudioChange();
    });
  }
  if (ppZoom) {
    ppZoom.addEventListener('input', function () {
      state.zoomPct = clamp(parseFloat(ppZoom.value) || 100, 50, 300);
      if (ppZoomVal) ppZoomVal.textContent = Math.round(state.zoomPct) + '%';
      scheduleRender();
    });
    ppZoom.addEventListener('change', commitStudioChange);
  }
  if (ppTilt) {
    ppTilt.addEventListener('input', function () {
      state.tiltDeg = clamp(parseFloat(ppTilt.value) || 0, -15, 15);
      if (ppTiltVal) ppTiltVal.textContent = state.tiltDeg.toFixed(1) + '°';
      scheduleRender();
    });
    ppTilt.addEventListener('change', commitStudioChange);
  }
  if (btnRotateLeft) {
    btnRotateLeft.addEventListener('click', function () {
      if (!state.originalImage) return;
      state.rot90 = (state.rot90 + 270) % 360;
      renderActiveStage();
      commitStudioChange();
    });
  }
  if (btnRotateRight) {
    btnRotateRight.addEventListener('click', function () {
      if (!state.originalImage) return;
      state.rot90 = (state.rot90 + 90) % 360;
      renderActiveStage();
      commitStudioChange();
    });
  }
  if (btnFlipH) {
    btnFlipH.addEventListener('click', function () {
      if (!state.originalImage) return;
      state.flipH = !state.flipH;
      renderActiveStage();
      commitStudioChange();
    });
  }

  if (btnAutoLight) btnAutoLight.addEventListener('click', handleStudioAutoLight);

  function bindRetouchSlider(el, valEl, key) {
    if (!el) return;
    el.addEventListener('input', function () {
      var val = parseInt(el.value, 10) || 0;
      state[key] = val;
      if (valEl) {
        var prefix = (key === 'brightness' || key === 'contrast' || key === 'warmth') && val > 0 ? '+' : '';
        valEl.textContent = prefix + val;
      }
      scheduleRender();
    });
    el.addEventListener('change', commitStudioChange);
  }
  bindRetouchSlider(ppBrightness, ppBrightnessVal, 'brightness');
  bindRetouchSlider(ppContrast, ppContrastVal, 'contrast');
  bindRetouchSlider(ppWarmth, ppWarmthVal, 'warmth');
  bindRetouchSlider(ppSharpness, ppSharpnessVal, 'sharpness');
  bindRetouchSlider(ppSkinSmooth, ppSkinSmoothVal, 'skinSmooth');

  /* Export & Print Modal */
  if (btnOpenExportModal) btnOpenExportModal.addEventListener('click', openExportModal);
  if (btnMobileExport) btnMobileExport.addEventListener('click', openExportModal);
  if (btnCloseExportModal) btnCloseExportModal.addEventListener('click', closeExportModal);
  if (ppExportModal) {
    ppExportModal.addEventListener('click', function (e) {
      if (e.target === ppExportModal) closeExportModal();
    });
  }

  paperBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.paperId = btn.getAttribute('data-paper') || '4x6';
      paperBtns.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-checked', active ? 'true' : 'false');
      });
      if (state.originalImage && state.viewMode !== 'sheet') {
        setViewMode('sheet');
      } else {
        renderActiveStage();
      }
    });
  });

  if (ppSheetGap) {
    ppSheetGap.addEventListener('input', function () {
      state.sheetGapMm = clamp(parseFloat(ppSheetGap.value) || 0, 0, 4);
      if (ppSheetGapVal) ppSheetGapVal.textContent = state.sheetGapMm.toFixed(1) + ' mm';
      if (state.viewMode === 'sheet' && state.originalImage) {
        scheduleRender();
      } else {
        updateSpecUI();
      }
    });
  }
  if (ppCutGuides) {
    ppCutGuides.addEventListener('change', function () {
      state.showCutGuides = Boolean(ppCutGuides.checked);
      if (state.viewMode === 'sheet' && state.originalImage) {
        scheduleRender();
      }
    });
  }
  exportTargetRadios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (radio.checked) {
        state.exportTarget = radio.value === 'sheet' ? 'sheet' : 'single';
      }
    });
  });

  if (btnExportJpg) btnExportJpg.addEventListener('click', function () { handleExport('jpg'); });
  if (btnExportPng) btnExportPng.addEventListener('click', function () { handleExport('png'); });
  if (btnExportPdf) btnExportPdf.addEventListener('click', function () { handleExport('pdf'); });

  /* Stage Actions & Mobile Quickbar */
  if (btnToggleGuide) {
    btnToggleGuide.addEventListener('click', function () {
      state.showGuide = !state.showGuide;
      btnToggleGuide.setAttribute('aria-pressed', state.showGuide ? 'true' : 'false');
      btnToggleGuide.classList.toggle('active', state.showGuide);
      renderBiometricGuide();
    });
    btnToggleGuide.classList.add('active');
  }
  if (btnResetAll) btnResetAll.addEventListener('click', resetAllEdits);
  if (btnClearAll) btnClearAll.addEventListener('click', clearAll);

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
  bindHoldPeek(btnMobilePeek);

  if (btnMobileCenter && btnAutoCenter) {
    btnMobileCenter.addEventListener('click', function () { btnAutoCenter.click(); });
  }
  if (btnMobileTiltLeft) {
    btnMobileTiltLeft.addEventListener('click', function () {
      if (!state.originalImage) return;
      state.tiltDeg = clamp(state.tiltDeg - 1, -15, 15);
      syncSlidersUI();
      renderActiveStage();
      commitStudioChange();
    });
  }
  if (btnMobileTiltRight) {
    btnMobileTiltRight.addEventListener('click', function () {
      if (!state.originalImage) return;
      state.tiltDeg = clamp(state.tiltDeg + 1, -15, 15);
      syncSlidersUI();
      renderActiveStage();
      commitStudioChange();
    });
  }
  if (btnMobileUndo) {
    btnMobileUndo.addEventListener('click', handleUndoMask);
  }
  if (btnMobileToggleView) {
    btnMobileToggleView.addEventListener('click', function () {
      setViewMode(state.viewMode === 'single' ? 'sheet' : 'single');
    });
  }

  /* ----- Interactive Canvas Gestures (Pan, Pinch-to-Zoom, Wheel, Brush) ----- */
  if (ppSingleFrame) {
    ppSingleFrame.addEventListener('pointerdown', function (e) {
      if (!state.originalImage || state.isProcessingAi || state.viewMode !== 'single' || state.isPeeking) return;
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;

      e.preventDefault();
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { ppSingleFrame.setPointerCapture(e.pointerId); } catch (_err) {}

      if (activePointers.size === 2) {
        /* Switch into 2-finger pinch-to-zoom */
        state.isPainting = false;
        isPanning = false;
        var pts = Array.from(activePointers.values());
        pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        pinchStartZoom = state.zoomPct;
        pinchMidStart = {
          x: (pts[0].x + pts[1].x) / 2,
          y: (pts[0].y + pts[1].y) / 2,
        };
        panOrigX = state.panX;
        panOrigY = state.panY;
        return;
      }

      if (state.brushMode && state.hasCutout && state.bgMode === 'auto') {
        state.isPainting = true;
        state.preStrokeAlpha = new Uint8ClampedArray(state.maskAlpha);
        state.strokeDirty = false;
        var pt = clientToOrigImageCoords(e.clientX, e.clientY);
        state.lastPaintX = pt.x;
        state.lastPaintY = pt.y;
        updateBrushCursor(e.clientX, e.clientY);
        paintDab(pt.x, pt.y, getBrushRadiusInImagePx(), state.brushMode);
      } else {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panOrigX = state.panX;
        panOrigY = state.panY;
      }
    });

    ppSingleFrame.addEventListener('pointermove', function (e) {
      if (!state.originalImage || state.viewMode !== 'single') return;
      if (state.brushMode && !state.isPeeking && activePointers.size <= 1) {
        updateBrushCursor(e.clientX, e.clientY);
      }
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 2 && pinchStartDist > 0) {
        e.preventDefault();
        var pts = Array.from(activePointers.values());
        var dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        state.zoomPct = clamp(pinchStartZoom * (dist / pinchStartDist), 50, 300);

        if (pinchMidStart) {
          var rect = ppSingleCanvas.getBoundingClientRect();
          var ratio = rect.width > 0 ? state.photoWPx / rect.width : 1;
          var midX = (pts[0].x + pts[1].x) / 2;
          var midY = (pts[0].y + pts[1].y) / 2;
          state.panX = panOrigX + (midX - pinchMidStart.x) * ratio;
          state.panY = panOrigY + (midY - pinchMidStart.y) * ratio;
        }
        syncSlidersUI();
        scheduleRender();
        return;
      }

      if (state.isPainting && state.brushMode) {
        e.preventDefault();
        var pt = clientToOrigImageCoords(e.clientX, e.clientY);
        paintStrokeSegment(state.lastPaintX, state.lastPaintY, pt.x, pt.y, getBrushRadiusInImagePx(), state.brushMode);
        state.lastPaintX = pt.x;
        state.lastPaintY = pt.y;
      } else if (isPanning) {
        e.preventDefault();
        var cRect = ppSingleCanvas.getBoundingClientRect();
        var cRatio = cRect.width > 0 ? state.photoWPx / cRect.width : 1;
        state.panX = panOrigX + (e.clientX - panStartX) * cRatio;
        state.panY = panOrigY + (e.clientY - panStartY) * cRatio;
        scheduleRender();
      }
    });

    function endPointer(e) {
      activePointers.delete(e.pointerId);
      try { ppSingleFrame.releasePointerCapture(e.pointerId); } catch (_err) {}
      if (activePointers.size < 2) {
        pinchStartDist = 0;
        pinchMidStart = null;
      }
      if (state.isPainting) {
        state.isPainting = false;
        commitBrushStroke();
      }
      if (activePointers.size === 0) {
        if (isPanning) {
          isPanning = false;
          commitStudioChange();
        }
      }
    }

    ppSingleFrame.addEventListener('pointerup', endPointer);
    ppSingleFrame.addEventListener('pointercancel', endPointer);
    ppSingleFrame.addEventListener('pointerleave', function () {
      if (!state.isPainting && ppBrushCursor) {
        ppBrushCursor.classList.add('hide');
      }
    });

    ppSingleFrame.addEventListener('wheel', function (e) {
      if (!state.originalImage || state.viewMode !== 'single') return;
      e.preventDefault();
      var delta = e.deltaY < 0 ? 5 : -5;
      state.zoomPct = clamp(state.zoomPct + delta, 50, 300);
      syncSlidersUI();
      scheduleRender();
      scheduleStudioCommit();
    }, { passive: false });
  }

  /* ----- File Upload, Drag & Drop, Paste ----- */
  function openFilePicker() {
    if (ppFileInput) ppFileInput.click();
  }
  if (btnUploadEmpty) btnUploadEmpty.addEventListener('click', function (e) { e.stopPropagation(); openFilePicker(); });
  if (btnReplacePhoto) btnReplacePhoto.addEventListener('click', openFilePicker);
  if (ppEmptyState) {
    ppEmptyState.addEventListener('click', openFilePicker);
    ppEmptyState.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFilePicker();
      }
    });
  }
  if (ppFileInput) {
    ppFileInput.addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) {
        loadFile(e.target.files[0]);
      }
    });
  }
  if (ppViewport) {
    ppViewport.addEventListener('dragover', function (e) {
      e.preventDefault();
      ppViewport.classList.add('is-dragover');
    });
    ppViewport.addEventListener('dragleave', function () {
      ppViewport.classList.remove('is-dragover');
    });
    ppViewport.addEventListener('drop', function (e) {
      e.preventDefault();
      ppViewport.classList.remove('is-dragover');
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

  /* ----- Desktop Keyboard Shortcuts (EN & AR layout-independent via e.code) ----- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (ppExportModal && !ppExportModal.classList.contains('hide')) {
        closeExportModal();
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
    if (mod && (lowerKey === 'z' || code === 'KeyZ')) {
      e.preventDefault();
      if (e.shiftKey) handleRedoMask();
      else handleUndoMask();
      return;
    }
    if (mod && (lowerKey === 'y' || code === 'KeyY')) {
      e.preventDefault();
      handleRedoMask();
      return;
    }

    if (code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) setPeeking(true);
      return;
    }

    if (!mod && (lowerKey === 'g' || code === 'KeyG')) {
      e.preventDefault();
      if (btnToggleGuide) btnToggleGuide.click();
      return;
    }
    if (e.key === '[' || code === 'BracketLeft') {
      e.preventDefault();
      state.tiltDeg = clamp(state.tiltDeg - 0.5, -15, 15);
      syncSlidersUI();
      scheduleRender();
      scheduleStudioCommit();
      return;
    }
    if (e.key === ']' || code === 'BracketRight') {
      e.preventDefault();
      state.tiltDeg = clamp(state.tiltDeg + 0.5, -15, 15);
      syncSlidersUI();
      scheduleRender();
      scheduleStudioCommit();
      return;
    }
    if (e.key === '+' || e.key === '=' || code === 'Equal' || code === 'NumpadAdd') {
      e.preventDefault();
      state.zoomPct = clamp(state.zoomPct + 5, 50, 300);
      syncSlidersUI();
      scheduleRender();
      scheduleStudioCommit();
      return;
    }
    if (e.key === '-' || e.key === '_' || code === 'Minus' || code === 'NumpadSubtract') {
      e.preventDefault();
      state.zoomPct = clamp(state.zoomPct - 5, 50, 300);
      syncSlidersUI();
      scheduleRender();
      scheduleStudioCommit();
      return;
    }

    var step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft') { e.preventDefault(); state.panX -= step; scheduleRender(); scheduleStudioCommit(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); state.panX += step; scheduleRender(); scheduleStudioCommit(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); state.panY -= step; scheduleRender(); scheduleStudioCommit(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); state.panY += step; scheduleRender(); scheduleStudioCommit(); }
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
    renderBiometricGuide();
  });

  window.addEventListener('beforeunload', function () {
    revokeObjectUrl();
    cleanupCanvas(subjectCanvas);
    cleanupCanvas(fgCanvas);
    cleanupCanvas(sheetExportCanvas);
  });

  /* ----- Boot ----- */
  syncDocumentMeta();
  syncControlsState();
  updateSpecUI();
  startSilentPreload();
})();

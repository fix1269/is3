/* imgsfix — remove-bg.js
   100% client-side AI background removal using @imgly/background-removal (isnet_fp16).
   Full-resolution mask compositing, silent background preloading, Canva-style scan overlay,
   and interactive Restore/Erase refinement brushes with Undo and Hold-to-Compare.
*/
'use strict';

import { removeBackground, preload } from '@imgly/background-removal';

(function () {
  var I = window.imgsfix;
  if (!I) return;
  var $ = I.$;
  var t = I.t;
  var toast = I.toast;

  /* ----- DOM ----- */
  var outputMode = $('#outputMode');
  var customColorRow = $('#customColorRow');
  var customColor = $('#customColor');
  var btnApply = $('#btnApply');
  var btnDownload = $('#btnDownload');
  var btnReset = $('#btnReset');
  var btnClear = $('#btnClear');
  var btnUpload = $('#btnUpload');
  var emptyState = $('#emptyState');
  var dropZone = $('#dropZone');
  var previewWrap = $('#previewWrap');
  var srcCanvas = $('#srcCanvas');
  var resultCanvas = $('#resultCanvas');
  var fileInput = $('#fileInput');
  var resultActions = $('#resultActions');
  var infoBar = $('#infoBar');

  /* Overlay & refinement DOM */
  var aiOverlay = $('#aiOverlay');
  var aiSparkles = $('#aiSparkles');
  var refineBar = $('#refineBar');
  var btnBrushRestore = $('#btnBrushRestore');
  var btnBrushErase = $('#btnBrushErase');
  var brushSize = $('#brushSize');
  var brushSizeVal = $('#brushSizeVal');
  var btnUndo = $('#btnUndo');
  var btnPeek = $('#btnPeek');
  var brushCursor = $('#brushCursor');

  /* ----- Safe SVG helpers (zero innerHTML) ----- */
  function createUploadSvg() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'ic-upload');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '48');
    svg.setAttribute('height', '48');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    ['M12 16V4', 'M7 9l5-5 5 5', 'M5 20h14'].forEach(function (d) {
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    });
    return svg;
  }

  function injectUploadIcon(container) {
    if (!container) return;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(createUploadSvg());
  }

  function populateSparkles() {
    if (!aiSparkles) return;
    while (aiSparkles.firstChild) {
      aiSparkles.removeChild(aiSparkles.firstChild);
    }
    var ns = 'http://www.w3.org/2000/svg';
    var specs = [
      { left: '10%', top: '16%', size: 18, delay: '0s', dur: '2.1s' },
      { left: '22%', top: '72%', size: 14, delay: '0.4s', dur: '2.4s' },
      { left: '30%', top: '28%', size: 22, delay: '0.8s', dur: '2.0s' },
      { left: '44%', top: '14%', size: 15, delay: '1.2s', dur: '2.5s' },
      { left: '56%', top: '78%', size: 20, delay: '0.3s', dur: '2.2s' },
      { left: '68%', top: '22%', size: 17, delay: '1.0s', dur: '2.3s' },
      { left: '78%', top: '64%', size: 22, delay: '0.6s', dur: '1.9s' },
      { left: '88%', top: '34%', size: 14, delay: '1.4s', dur: '2.4s' },
      { left: '16%', top: '48%', size: 16, delay: '1.1s', dur: '2.2s' },
      { left: '38%', top: '64%', size: 13, delay: '1.6s', dur: '2.1s' },
      { left: '62%', top: '44%', size: 16, delay: '0.2s', dur: '2.6s' },
      { left: '84%', top: '82%', size: 15, delay: '0.9s', dur: '2.0s' },
      { left: '50%', top: '34%', size: 12, delay: '1.5s', dur: '2.3s' },
      { left: '72%', top: '52%', size: 13, delay: '0.5s', dur: '2.5s' },
    ];
    specs.forEach(function (sp) {
      var wrap = document.createElement('span');
      wrap.className = 'ai-sparkle';
      wrap.style.left = sp.left;
      wrap.style.top = sp.top;
      wrap.style.width = sp.size + 'px';
      wrap.style.height = sp.size + 'px';
      wrap.style.animationDelay = sp.delay;
      wrap.style.animationDuration = sp.dur;

      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'currentColor');
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d', 'M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z');
      svg.appendChild(path);
      wrap.appendChild(svg);
      aiSparkles.appendChild(wrap);
    });
  }

  injectUploadIcon(emptyState ? $('.es-icon', emptyState) : null);
  injectUploadIcon(dropZone ? $('.dz-icon', dropZone) : null);
  populateSparkles();

  /* ----- State ----- */
  var originalImage = null;
  var currentFile = null;
  var objectURL = null;
  var currentFileName = 'image.png';

  /* Full-resolution compositing & mask refinement state */
  var imgWidth = 0;
  var imgHeight = 0;
  var origImageData = null;     /* Full-res RGBA from originalImage */
  var maskAlpha = null;         /* Uint8ClampedArray(w * h), 0..255 */
  var resultImageData = null;   /* Reusable ImageData for resultCanvas */
  var hasCutout = false;

  /* Brush & Undo state */
  var brushMode = null;         /* 'restore' | 'erase' | null */
  var isPainting = false;
  var activePointerId = null;
  var lastPaintX = 0;
  var lastPaintY = 0;
  var preStrokeAlpha = null;
  var strokeMinX = 0;
  var strokeMinY = 0;
  var strokeMaxX = 0;
  var strokeMaxY = 0;
  var strokeDirty = false;
  var undoStack = [];
  var MAX_UNDO = 30;
  var isPeeking = false;
  var sliderPreviewTimer = null;

  /* AI lifecycle & concurrency guard */
  var isProcessing = false;
  var loadGeneration = 0;
  var activeDevice = 'cpu';
  var preloadPromise = null;

  /* ----- Helpers ----- */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / 1048576).toFixed(2) + 'MB';
  }

  function validateFile(file) {
    if (!file) return false;
    if (!file.type || !file.type.startsWith('image/')) {
      toast(t('tc_removebg_img_only'), 'err');
      return false;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast(t('tc_removebg_file_large'), 'err');
      return false;
    }
    return true;
  }

  function showOverlay(visible) {
    if (!aiOverlay) return;
    if (visible) {
      aiOverlay.classList.remove('hide');
    } else {
      aiOverlay.classList.add('hide');
    }
  }

  function updateUndoButton() {
    if (btnUndo) btnUndo.disabled = undoStack.length === 0;
  }

  function setBrushMode(mode) {
    if (!hasCutout) mode = null;
    brushMode = mode;

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
    if (previewWrap) {
      previewWrap.classList.toggle('brush-active', mode !== null);
    }
    if (brushCursor) {
      brushCursor.classList.toggle('mode-restore', mode === 'restore');
      brushCursor.classList.toggle('mode-erase', mode === 'erase');
      if (mode === null) {
        brushCursor.classList.add('hide');
      }
    }
  }

  function showRefineBar(visible) {
    if (!refineBar) return;
    if (visible) {
      refineBar.classList.remove('hide');
    } else {
      refineBar.classList.add('hide');
      setBrushMode(null);
    }
  }

  function parseCustomHex(hex) {
    if (!hex || hex.charAt(0) !== '#' || hex.length < 7) {
      return [0, 170, 255];
    }
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return [
      Number.isFinite(r) ? r : 0,
      Number.isFinite(g) ? g : 170,
      Number.isFinite(b) ? b : 255,
    ];
  }

  function getOutputBgParams() {
    var mode = outputMode ? outputMode.value : 'transparent';
    if (mode === 'white') {
      return { solid: true, r: 255, g: 255, b: 255 };
    }
    if (mode === 'custom') {
      var rgb = parseCustomHex(customColor ? customColor.value : '#00aaff');
      return { solid: true, r: rgb[0], g: rgb[1], b: rgb[2] };
    }
    return { solid: false, r: 0, g: 0, b: 0 };
  }

  /* ----- AI device & silent preload ----- */
  async function detectPreferredDevice() {
    try {
      if (typeof navigator !== 'undefined' && navigator.gpu && typeof navigator.gpu.requestAdapter === 'function') {
        var adapter = await navigator.gpu.requestAdapter();
        if (adapter) return 'gpu';
      }
    } catch (_err) {
      // Fallback to WASM CPU when WebGPU is unavailable
    }
    return 'cpu';
  }

  function getBaseConfig(device) {
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
        await preload(getBaseConfig(activeDevice));
      } catch (_gpuErr) {
        if (activeDevice === 'gpu') {
          activeDevice = 'cpu';
          await preload(getBaseConfig('cpu'));
        }
      }
    })().catch(function () {
      preloadPromise = null;
    });

    return preloadPromise;
  }

  /* ----- Full-Resolution Alpha Extraction, Smoothing & Haze Cleanup ----- */
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
    var total = w * h;
    var rawAlpha = new Uint8ClampedArray(total);
    for (var i = 0; i < total; i++) {
      rawAlpha[i] = rawPixels[i * 4 + 3];
    }

    /* Subtle 3x3 Gaussian-weighted edge smoothing + residual haze cleanup (< 0.25 alpha) */
    var outAlpha = new Uint8ClampedArray(total);
    for (var y = 0; y < h; y++) {
      var yPrev = y > 0 ? y - 1 : 0;
      var yNext = y < h - 1 ? y + 1 : h - 1;
      var row = y * w;
      var rowPrev = yPrev * w;
      var rowNext = yNext * w;

      for (var x = 0; x < w; x++) {
        var c = rawAlpha[row + x];
        /* Fast path for interior solid / transparent pixels */
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

        /* Remove faint residual fog/bokeh (alpha < 0.25 => < 64) and lock crisp solids */
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

  /* ----- Dirty-Rect Canvas Compositing onto Untouched Original RGB ----- */
  function renderRect(x0, y0, x1, y1) {
    if (!hasCutout || !origImageData || !maskAlpha || !resultCanvas || !resultImageData) return;
    if (imgWidth <= 0 || imgHeight <= 0) return;

    var rx0 = Math.max(0, x0);
    var ry0 = Math.max(0, y0);
    var rx1 = Math.min(imgWidth - 1, x1);
    var ry1 = Math.min(imgHeight - 1, y1);
    if (rx0 > rx1 || ry0 > ry1) return;

    var orig = origImageData.data;
    var out = resultImageData.data;
    var bg = getOutputBgParams();

    for (var y = ry0; y <= ry1; y++) {
      var rowOffset = y * imgWidth;
      for (var x = rx0; x <= rx1; x++) {
        var p = rowOffset + x;
        var p4 = p * 4;
        var a = maskAlpha[p];
        if (!bg.solid) {
          out[p4] = orig[p4];
          out[p4 + 1] = orig[p4 + 1];
          out[p4 + 2] = orig[p4 + 2];
          out[p4 + 3] = a;
        } else if (a === 255) {
          out[p4] = orig[p4];
          out[p4 + 1] = orig[p4 + 1];
          out[p4 + 2] = orig[p4 + 2];
          out[p4 + 3] = 255;
        } else if (a === 0) {
          out[p4] = bg.r;
          out[p4 + 1] = bg.g;
          out[p4 + 2] = bg.b;
          out[p4 + 3] = 255;
        } else {
          var af = a / 255;
          var inv = 1 - af;
          out[p4] = Math.round(orig[p4] * af + bg.r * inv);
          out[p4 + 1] = Math.round(orig[p4 + 1] * af + bg.g * inv);
          out[p4 + 2] = Math.round(orig[p4 + 2] * af + bg.b * inv);
          out[p4 + 3] = 255;
        }
      }
    }

    var rctx = resultCanvas.getContext('2d');
    rctx.putImageData(resultImageData, 0, 0, rx0, ry0, rx1 - rx0 + 1, ry1 - ry0 + 1);
  }

  function renderFullResult() {
    if (!hasCutout || !resultCanvas) return;
    if (resultCanvas.width !== imgWidth || resultCanvas.height !== imgHeight) {
      resultCanvas.width = imgWidth;
      resultCanvas.height = imgHeight;
    }
    if (!resultImageData || resultImageData.width !== imgWidth || resultImageData.height !== imgHeight) {
      resultImageData = resultCanvas.getContext('2d').createImageData(imgWidth, imgHeight);
    }
    renderRect(0, 0, imgWidth - 1, imgHeight - 1);
    if (!isPeeking) {
      if (srcCanvas) srcCanvas.style.display = 'none';
      resultCanvas.style.display = 'block';
    }
  }

  /* ----- Manual Brush Painting (Restore / Erase) ----- */
  function getBrushRadiusInImagePx() {
    if (!resultCanvas || imgWidth <= 0) return 16;
    var rect = resultCanvas.getBoundingClientRect();
    var displayW = rect.width > 0 ? rect.width : imgWidth;
    var cssDiameter = brushSize ? Number(brushSize.value) || 32 : 32;
    return Math.max(1, (cssDiameter / 2) * (imgWidth / displayW));
  }

  function clientToImageCoords(clientX, clientY) {
    var rect = resultCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: 0, y: 0 };
    var x = (clientX - rect.left) * (imgWidth / rect.width);
    var y = (clientY - rect.top) * (imgHeight / rect.height);
    return { x: x, y: y };
  }

  function updateCursorPosition(clientX, clientY) {
    if (!brushCursor || !previewWrap || !brushMode || !hasCutout || isPeeking || isProcessing) {
      if (brushCursor) brushCursor.classList.add('hide');
      return;
    }
    var wrapRect = previewWrap.getBoundingClientRect();
    var cssDiameter = brushSize ? Number(brushSize.value) || 32 : 32;
    brushCursor.style.width = cssDiameter + 'px';
    brushCursor.style.height = cssDiameter + 'px';
    brushCursor.style.left = (clientX - wrapRect.left) + 'px';
    brushCursor.style.top = (clientY - wrapRect.top) + 'px';
    brushCursor.classList.remove('hide');
  }

  function paintDab(cx, cy, radius, mode) {
    var rInt = Math.ceil(radius);
    var x0 = Math.max(0, Math.floor(cx - rInt));
    var y0 = Math.max(0, Math.floor(cy - rInt));
    var x1 = Math.min(imgWidth - 1, Math.ceil(cx + rInt));
    var y1 = Math.min(imgHeight - 1, Math.ceil(cy + rInt));
    if (x0 > x1 || y0 > y1) return;

    var r2 = radius * radius;
    var isRestore = mode === 'restore';

    for (var y = y0; y <= y1; y++) {
      var dy = y - cy;
      var dy2 = dy * dy;
      var row = y * imgWidth;
      for (var x = x0; x <= x1; x++) {
        var dx = x - cx;
        var d2 = dx * dx + dy2;
        if (d2 > r2) continue;

        var norm = Math.sqrt(d2) / radius;
        var falloff = norm <= 0.6 ? 1 : 1 - Math.pow((norm - 0.6) / 0.4, 2);
        var p = row + x;
        if (isRestore) {
          var targetRestore = Math.round(255 * falloff);
          if (targetRestore > maskAlpha[p]) {
            maskAlpha[p] = targetRestore;
          }
        } else {
          var targetErase = Math.round(255 * (1 - falloff));
          if (targetErase < maskAlpha[p]) {
            maskAlpha[p] = targetErase;
          }
        }
      }
    }

    if (!strokeDirty) {
      strokeMinX = x0;
      strokeMinY = y0;
      strokeMaxX = x1;
      strokeMaxY = y1;
      strokeDirty = true;
    } else {
      if (x0 < strokeMinX) strokeMinX = x0;
      if (y0 < strokeMinY) strokeMinY = y0;
      if (x1 > strokeMaxX) strokeMaxX = x1;
      if (y1 > strokeMaxY) strokeMaxY = y1;
    }

    renderRect(x0, y0, x1, y1);
  }

  function paintStrokeSegment(x0, y0, x1, y1, radius, mode) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var dist = Math.hypot(dx, dy);
    var step = Math.max(1, radius * 0.25);
    var steps = Math.max(1, Math.ceil(dist / step));
    for (var s = 0; s <= steps; s++) {
      var tFrac = s / steps;
      paintDab(x0 + dx * tFrac, y0 + dy * tFrac, radius, mode);
    }
  }

  function commitStrokeUndo() {
    if (!strokeDirty || !preStrokeAlpha || !maskAlpha) {
      preStrokeAlpha = null;
      strokeDirty = false;
      return;
    }
    var w = strokeMaxX - strokeMinX + 1;
    var h = strokeMaxY - strokeMinY + 1;
    var changed = false;
    var patch = new Uint8ClampedArray(w * h);

    for (var py = 0; py < h; py++) {
      var srcRow = (strokeMinY + py) * imgWidth + strokeMinX;
      var dstRow = py * w;
      for (var px = 0; px < w; px++) {
        var prevVal = preStrokeAlpha[srcRow + px];
        patch[dstRow + px] = prevVal;
        if (prevVal !== maskAlpha[srcRow + px]) {
          changed = true;
        }
      }
    }

    if (changed) {
      undoStack.push({
        x: strokeMinX,
        y: strokeMinY,
        w: w,
        h: h,
        data: patch,
      });
      if (undoStack.length > MAX_UNDO) {
        undoStack.shift();
      }
      updateUndoButton();
    }

    preStrokeAlpha = null;
    strokeDirty = false;
  }

  function handleUndo() {
    if (!hasCutout || !maskAlpha || undoStack.length === 0) return;
    var entry = undoStack.pop();
    for (var py = 0; py < entry.h; py++) {
      var dstRow = (entry.y + py) * imgWidth + entry.x;
      var srcRow = py * entry.w;
      for (var px = 0; px < entry.w; px++) {
        maskAlpha[dstRow + px] = entry.data[srcRow + px];
      }
    }
    renderRect(entry.x, entry.y, entry.x + entry.w - 1, entry.y + entry.h - 1);
    updateUndoButton();
  }

  /* ----- Before/After Interactive Hold ----- */
  function setPeeking(active) {
    if (!hasCutout || !srcCanvas || !resultCanvas) return;
    isPeeking = active;
    if (btnPeek) btnPeek.classList.toggle('is-peeking', active);
    if (active) {
      if (brushCursor) brushCursor.classList.add('hide');
      resultCanvas.style.display = 'none';
      srcCanvas.style.display = 'block';
    } else {
      srcCanvas.style.display = 'none';
      resultCanvas.style.display = 'block';
    }
  }

  /* ----- Clear / Reset / Load ----- */
  function wipeResult() {
    hasCutout = false;
    maskAlpha = null;
    resultImageData = null;
    preStrokeAlpha = null;
    strokeDirty = false;
    isPainting = false;
    activePointerId = null;
    undoStack = [];
    updateUndoButton();
    setPeeking(false);
    showOverlay(false);
    showRefineBar(false);

    if (resultCanvas) {
      var rctx = resultCanvas.getContext('2d');
      rctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
      resultCanvas.width = 0;
      resultCanvas.height = 0;
      resultCanvas.style.display = 'none';
    }
    if (srcCanvas) srcCanvas.style.display = 'block';
  }

  function loadFile(file) {
    if (!validateFile(file)) return;
    loadGeneration += 1;
    isProcessing = false;
    if (btnApply) btnApply.disabled = false;

    wipeResult();
    origImageData = null;
    imgWidth = 0;
    imgHeight = 0;

    if (objectURL) {
      try { URL.revokeObjectURL(objectURL); } catch (_e) {}
      objectURL = null;
    }

    currentFile = file;
    currentFileName = file.name || 'image.png';
    objectURL = URL.createObjectURL(file);

    var activeGen = loadGeneration;
    var img = new Image();
    img.onload = function () {
      if (activeGen !== loadGeneration) return;
      originalImage = img;
      imgWidth = img.naturalWidth || img.width;
      imgHeight = img.naturalHeight || img.height;

      if (emptyState) emptyState.classList.add('hide');
      if (dropZone) dropZone.classList.add('hide');
      if (previewWrap) previewWrap.classList.remove('hide');
      if (resultActions) {
        resultActions.classList.remove('hide');
        resultActions.style.display = '';
      }

      var sctx = srcCanvas.getContext('2d');
      srcCanvas.width = imgWidth;
      srcCanvas.height = imgHeight;
      sctx.clearRect(0, 0, imgWidth, imgHeight);
      sctx.drawImage(img, 0, 0, imgWidth, imgHeight);
      origImageData = sctx.getImageData(0, 0, imgWidth, imgHeight);
      srcCanvas.style.display = 'block';
      resultCanvas.style.display = 'none';

      if (infoBar) {
        infoBar.textContent = imgWidth + ' × ' + imgHeight + 'px · ' + formatSize(file.size);
      }
    };
    img.onerror = function () {
      if (activeGen !== loadGeneration) return;
      toast(t('tc_removebg_img_err'), 'err');
      clearAll();
    };
    img.src = objectURL;
  }

  function resetState() {
    loadGeneration += 1;
    isProcessing = false;
    if (btnApply) btnApply.disabled = false;

    if (outputMode) outputMode.value = 'transparent';
    if (customColorRow) customColorRow.style.display = 'none';
    if (customColor) customColor.value = '#00aaff';

    wipeResult();

    if (originalImage && srcCanvas && imgWidth > 0 && imgHeight > 0) {
      var sctx = srcCanvas.getContext('2d');
      sctx.clearRect(0, 0, imgWidth, imgHeight);
      sctx.drawImage(originalImage, 0, 0, imgWidth, imgHeight);
      srcCanvas.style.display = 'block';
    }
    toast(t('tc_reset'), 'ok');
  }

  function clearAll() {
    loadGeneration += 1;
    isProcessing = false;
    if (btnApply) btnApply.disabled = false;

    if (objectURL) {
      try { URL.revokeObjectURL(objectURL); } catch (_e) {}
      objectURL = null;
    }
    originalImage = null;
    currentFile = null;
    origImageData = null;
    imgWidth = 0;
    imgHeight = 0;
    currentFileName = 'image.png';

    wipeResult();

    if (srcCanvas) {
      var sctx = srcCanvas.getContext('2d');
      sctx.clearRect(0, 0, srcCanvas.width, srcCanvas.height);
      srcCanvas.width = 0;
      srcCanvas.height = 0;
      srcCanvas.style.display = 'block';
    }

    if (previewWrap) previewWrap.classList.add('hide');
    if (resultActions) {
      resultActions.classList.add('hide');
      resultActions.style.display = 'none';
    }
    if (dropZone) dropZone.classList.add('hide');
    if (emptyState) emptyState.classList.remove('hide');
    if (infoBar) infoBar.textContent = '';

    if (outputMode) outputMode.value = 'transparent';
    if (customColorRow) customColorRow.style.display = 'none';
    if (customColor) customColor.value = '#00aaff';
    if (fileInput) fileInput.value = '';
  }

  /* ----- One-Click Automatic AI Background Removal ----- */
  async function handleAutoRemove() {
    if (!originalImage || !currentFile || !origImageData) {
      toast(t('tc_removebg_load_first'), 'err');
      return;
    }
    if (isProcessing) return;

    var activeGen = loadGeneration;
    isProcessing = true;
    setBrushMode(null);
    setPeeking(false);
    if (btnApply) btnApply.disabled = true;
    showOverlay(true);

    try {
      if (preloadPromise) {
        await preloadPromise;
        if (activeGen !== loadGeneration) return;
      } else {
        activeDevice = await detectPreferredDevice();
        if (activeGen !== loadGeneration) return;
      }

      var outBlob;
      try {
        outBlob = await removeBackground(currentFile, getBaseConfig(activeDevice));
      } catch (gpuErr) {
        if (activeDevice === 'gpu') {
          activeDevice = 'cpu';
          outBlob = await removeBackground(currentFile, getBaseConfig('cpu'));
        } else {
          throw gpuErr;
        }
      }

      if (activeGen !== loadGeneration) return;

      var aiImg = await decodeBlobToImage(outBlob);
      if (activeGen !== loadGeneration) return;

      maskAlpha = extractAndRefineMask(aiImg, imgWidth, imgHeight);
      undoStack = [];
      updateUndoButton();
      hasCutout = true;

      renderFullResult();
      showOverlay(false);
      showRefineBar(true);
      toast(t('tc_done'), 'ok');
    } catch (err) {
      if (activeGen !== loadGeneration) return;
      console.error('Background removal error:', err);
      showOverlay(false);
      toast(t('tc_removebg_fail'), 'err');
    } finally {
      if (activeGen === loadGeneration) {
        isProcessing = false;
        if (btnApply) btnApply.disabled = false;
      }
    }
  }

  /* ----- Event Listeners ----- */
  if (btnApply) btnApply.addEventListener('click', handleAutoRemove);

  if (outputMode) {
    outputMode.addEventListener('change', function () {
      if (customColorRow) {
        customColorRow.style.display = outputMode.value === 'custom' ? 'block' : 'none';
      }
      if (hasCutout) renderFullResult();
    });
  }

  if (customColor) {
    customColor.addEventListener('input', function () {
      if (hasCutout && outputMode && outputMode.value === 'custom') {
        renderFullResult();
      }
    });
  }

  /* Refinement Toolbar Listeners */
  if (btnBrushRestore) {
    btnBrushRestore.addEventListener('click', function () {
      setBrushMode(brushMode === 'restore' ? null : 'restore');
    });
  }

  if (btnBrushErase) {
    btnBrushErase.addEventListener('click', function () {
      setBrushMode(brushMode === 'erase' ? null : 'erase');
    });
  }

  if (brushSize) {
    brushSize.addEventListener('input', function () {
      if (brushSizeVal) brushSizeVal.textContent = brushSize.value + 'px';
      if (!brushMode && hasCutout) {
        setBrushMode('restore');
      }
      if (brushCursor && previewWrap && brushMode && hasCutout && !isPeeking) {
        var wrapRect = previewWrap.getBoundingClientRect();
        var sizePx = Number(brushSize.value) || 32;
        brushCursor.style.width = sizePx + 'px';
        brushCursor.style.height = sizePx + 'px';
        if (brushCursor.classList.contains('hide')) {
          brushCursor.style.left = (wrapRect.width / 2) + 'px';
          brushCursor.style.top = (wrapRect.height / 2) + 'px';
          brushCursor.classList.remove('hide');
          clearTimeout(sliderPreviewTimer);
          sliderPreviewTimer = setTimeout(function () {
            if (!isPainting && brushCursor) brushCursor.classList.add('hide');
          }, 900);
        }
      }
    });
  }

  if (btnUndo) btnUndo.addEventListener('click', handleUndo);

  if (btnPeek) {
    btnPeek.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      setPeeking(true);
    });
    btnPeek.addEventListener('pointerup', function () { setPeeking(false); });
    btnPeek.addEventListener('pointercancel', function () { setPeeking(false); });
    btnPeek.addEventListener('pointerleave', function () { if (isPeeking) setPeeking(false); });
    btnPeek.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setPeeking(true);
      }
    });
    btnPeek.addEventListener('keyup', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        setPeeking(false);
      }
    });
  }

  /* Canvas Pointer Painting & Cursor Tracking */
  if (resultCanvas) {
    resultCanvas.addEventListener('pointerdown', function (e) {
      if (!brushMode || !hasCutout || isProcessing || isPeeking) return;
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;

      e.preventDefault();
      isPainting = true;
      activePointerId = e.pointerId;
      try { resultCanvas.setPointerCapture(e.pointerId); } catch (_err) {}

      preStrokeAlpha = new Uint8ClampedArray(maskAlpha);
      strokeDirty = false;

      var pt = clientToImageCoords(e.clientX, e.clientY);
      lastPaintX = pt.x;
      lastPaintY = pt.y;
      updateCursorPosition(e.clientX, e.clientY);
      paintDab(pt.x, pt.y, getBrushRadiusInImagePx(), brushMode);
    });

    resultCanvas.addEventListener('pointermove', function (e) {
      if (!brushMode || !hasCutout || isProcessing || isPeeking) return;
      updateCursorPosition(e.clientX, e.clientY);
      if (!isPainting || (activePointerId !== null && e.pointerId !== activePointerId)) return;

      e.preventDefault();
      var pt = clientToImageCoords(e.clientX, e.clientY);
      paintStrokeSegment(lastPaintX, lastPaintY, pt.x, pt.y, getBrushRadiusInImagePx(), brushMode);
      lastPaintX = pt.x;
      lastPaintY = pt.y;
    });

    function finishPointerStroke(e) {
      if (!isPainting) return;
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      isPainting = false;
      activePointerId = null;
      try { resultCanvas.releasePointerCapture(e.pointerId); } catch (_err) {}
      commitStrokeUndo();
    }

    resultCanvas.addEventListener('pointerup', finishPointerStroke);
    resultCanvas.addEventListener('pointercancel', finishPointerStroke);
    resultCanvas.addEventListener('pointerleave', function () {
      if (!isPainting && brushCursor) {
        brushCursor.classList.add('hide');
      }
    });
  }

  /* Download full-resolution PNG */
  if (btnDownload) {
    btnDownload.disabled = false;
    btnDownload.addEventListener('click', function () {
      if (!originalImage) {
        toast(t('tc_removebg_load_first'), 'err');
        return;
      }
      var canvas = hasCutout && resultCanvas && resultCanvas.width > 0 ? resultCanvas : srcCanvas;
      if (!canvas || canvas.width === 0) {
        toast(t('tc_removebg_nothing'), 'err');
        return;
      }
      canvas.toBlob(function (blob) {
        if (!blob) {
          toast(t('tc_removebg_export_err'), 'err');
          return;
        }
        var filename = currentFileName.replace(/\.[^.]+$/, '') + '_nobg_imgsfix.png';
        if (typeof I.triggerDownload === 'function') {
          I.triggerDownload(blob, filename);
        } else {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            if (a.parentNode) a.parentNode.removeChild(a);
            try { URL.revokeObjectURL(url); } catch (_e) {}
          }, 4000);
        }
        toast(t('tc_done'), 'ok');
      }, 'image/png');
    });
  }

  if (btnReset) btnReset.addEventListener('click', resetState);
  if (btnClear) btnClear.addEventListener('click', clearAll);

  /* Upload Entry Points */
  if (emptyState) {
    emptyState.addEventListener('click', function () {
      if (fileInput) fileInput.click();
    });
    emptyState.addEventListener('dragover', function (e) {
      e.preventDefault();
      emptyState.classList.add('drag');
    });
    emptyState.addEventListener('dragleave', function () {
      emptyState.classList.remove('drag');
    });
    emptyState.addEventListener('drop', function (e) {
      e.preventDefault();
      emptyState.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        loadFile(e.dataTransfer.files[0]);
      }
    });
  }

  if (dropZone) {
    dropZone.addEventListener('click', function () {
      if (fileInput) fileInput.click();
    });
    dropZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropZone.classList.add('drag');
    });
    dropZone.addEventListener('dragleave', function () {
      dropZone.classList.remove('drag');
    });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        loadFile(e.dataTransfer.files[0]);
      }
    });
  }

  if (btnUpload) {
    btnUpload.addEventListener('click', function (e) {
      e.stopPropagation();
      if (fileInput) fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) {
        loadFile(e.target.files[0]);
      }
    });
  }

  document.addEventListener('paste', function (e) {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files[0]) {
      loadFile(e.clipboardData.files[0]);
    }
  });

  /* 100% silent background model preload on page open */
  startSilentPreload();
})();

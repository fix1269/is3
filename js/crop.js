/* imgsfix — crop.js
   Zero-dependency 60fps Custom HTML5 Canvas Crop Engine (Lightshot-inspired):
   - Single-canvas high-DPI rendering with image-aligned shade, Rule-of-Thirds grid,
     #1a5fff border, 8 tactile resize handles, floating dimension pill & hover cursors
   - Continuous Multi-Step Cropping: Apply commits the cropped result synchronously
     as the new active working image inside #cropCanvas with an 85% centered follow-up box
   - Snapshot-based Undo / Redo across both selection edits and applied crops
   - Pointer (mouse + touch) interactions + Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Arrows, Enter, Escape)
   - Aspect ratio presets + Circle/Avatar crop + two-way Custom W×H px + Rotate/Flip/Straighten
   - Full-resolution extraction preserving original format (PNG for circle alpha) +
     "Open in Advanced Editor" bridge via sessionStorage
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
  var MAX_PREVIEW_DIM = 1400;
  var EXPORT_QUALITY = 0.92;
  var CANVAS_PAD = 14;
  var MAX_HISTORY = 60;
  var PRIMARY_COLOR = '#1a5fff';

  /* ----- DOM references ----- */
  var emptyState = $('#emptyState');
  var dropZone = $('#dropZone');
  var fileInput = $('#fileInput');
  var btnUpload = $('#btnUpload');
  var cropperContainer = $('#cropperContainer');
  var cropCanvas = $('#cropCanvas');
  var previewWrap = $('#previewWrap');
  var afterCanvas = $('#afterCanvas');
  var shortcutHint = $('#shortcutHint');
  var resultActions = $('#resultActions');
  var infoBar = $('#infoBar');
  var cropInfo = $('#cropInfo');

  var ratioButtons = $$('[data-ratio]');
  var btnCircleCrop = $('#btnCircleCrop');
  var cropWidthInput = $('#cropWidth');
  var cropHeightInput = $('#cropHeight');

  var btnUndoCrop = $('#btnUndoCrop');
  var btnRedoCrop = $('#btnRedoCrop');
  var btnRotLeft = $('#btnRotLeft');
  var btnRotRight = $('#btnRotRight');
  var btnFlipH = $('#btnFlipH');
  var btnFlipV = $('#btnFlipV');
  var straightenRange = $('#straightenRange');
  var straightenVal = $('#straightenVal');
  var btnStraightenReset = $('#btnStraightenReset');

  var btnApply = $('#btnApply');
  var btnDownload = $('#btnDownload');
  var btnCropAgain = $('#btnCropAgain');
  var btnReset = $('#btnReset');
  var btnClear = $('#btnClear');

  /* ----- state ----- */
  var originalFile = null;
  var uploadedImage = null;
  var originalImageSrc = null;
  var workingSource = null;
  var workingHasAlpha = false;
  var workingIsCircle = false;
  var isPreviewMode = false;
  var cropDepth = 0;
  var justCommittedCrop = false;
  var currentFileName = 'image';
  var loadSeq = 0;

  /* Transform state: 2x2 screen-space orthogonal matrix [m00, m10, m01, m11] + straighten (-45..+45) */
  var baseMatrix = [1, 0, 0, 1];
  var straightenDeg = 0;

  /* Transformed natural dimensions + fast screen-resolution preview canvas */
  var tWidth = 0;
  var tHeight = 0;
  var previewBitmapCanvas = document.createElement('canvas');

  /* Crop selection in natural transformed pixel coordinates [0..tWidth, 0..tHeight] */
  var sel = { x: 0, y: 0, w: 0, h: 0 };
  var activeRatioKey = 'free';
  var lastNonCircleRatioKey = 'free';
  var isCircle = false;

  /* Layout cache for current #cropCanvas frame */
  var layout = { cw: 0, ch: 0, dpr: 1, imgX: 0, imgY: 0, dispW: 0, dispH: 0, dispScale: 1 };
  var rafId = 0;

  /* Pointer interaction state */
  var dragState = null;

  /* History stack for Undo / Redo */
  var historyStack = [];
  var historyIndex = -1;
  var dimInputTimer = null;
  var nudgeHistoryTimer = null;
  var isSyncingInputs = false;

  /* ----- helpers ----- */
  function sanitizeFilenameBase(name) {
    var base = String(name || 'image').replace(/\.[^.]+$/, '');
    base = base.replace(/[\/\\:*?"<>|\x00-\x1F]+/g, '_').replace(/^\.+|\.+$/g, '').trim();
    return base || 'image';
  }

  function getSourceDims(src) {
    if (!src) return { w: 0, h: 0 };
    return {
      w: src.naturalWidth || src.width || 0,
      h: src.naturalHeight || src.height || 0
    };
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
    if (isCircle || workingHasAlpha) {
      return { mime: 'image/png', ext: 'png' };
    }
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

  function revokeOriginalUrl() {
    if (originalImageSrc) {
      try { URL.revokeObjectURL(originalImageSrc); } catch (_e) { /* noop */ }
      originalImageSrc = null;
    }
  }

  function getLockedRatioValue() {
    if (isCircle) return 1;
    if (activeRatioKey === 'free') return 0;
    var r = parseFloat(activeRatioKey);
    return (Number.isFinite(r) && r > 0) ? r : 0;
  }

  function getCombinedMatrix() {
    var rad = (straightenDeg * Math.PI) / 180;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var m00 = baseMatrix[0], m10 = baseMatrix[1], m01 = baseMatrix[2], m11 = baseMatrix[3];
    return [
      cos * m00 - sin * m10,
      sin * m00 + cos * m10,
      cos * m01 - sin * m11,
      sin * m01 + cos * m11
    ];
  }

  /* ----- Transformed natural dimensions & fast screen preview cache ----- */
  function rebuildTransformedPreview() {
    if (!workingSource) return;
    var dims = getSourceDims(workingSource);
    var natW = dims.w;
    var natH = dims.h;
    if (!natW || !natH) return;
    var u = getCombinedMatrix();

    tWidth = Math.max(1, Math.round(Math.abs(u[0] * natW) + Math.abs(u[2] * natH)));
    tHeight = Math.max(1, Math.round(Math.abs(u[1] * natW) + Math.abs(u[3] * natH)));

    var scale = Math.min(1, MAX_PREVIEW_DIM / Math.max(tWidth, tHeight));
    var pw = Math.max(1, Math.round(tWidth * scale));
    var ph = Math.max(1, Math.round(tHeight * scale));

    previewBitmapCanvas.width = pw;
    previewBitmapCanvas.height = ph;
    var pctx = previewBitmapCanvas.getContext('2d');
    pctx.clearRect(0, 0, pw, ph);
    pctx.imageSmoothingEnabled = true;
    pctx.imageSmoothingQuality = 'high';
    pctx.save();
    pctx.translate(pw / 2, ph / 2);
    pctx.scale(scale, scale);
    pctx.transform(u[0], u[1], u[2], u[3], 0, 0);
    pctx.drawImage(workingSource, -natW / 2, -natH / 2, natW, natH);
    pctx.restore();
  }

  /* ----- Selection clamping & ratio fitting ----- */
  function clampSelection(box, ratio) {
    if (!tWidth || !tHeight) return { x: 0, y: 0, w: 0, h: 0 };
    var minDim = Math.min(tWidth, tHeight, 8);
    var w = Math.max(minDim, Math.min(tWidth, box.w));
    var h = Math.max(minDim, Math.min(tHeight, box.h));

    if (ratio > 0) {
      if (w / h > ratio) w = h * ratio;
      else h = w / ratio;
      if (w > tWidth) { w = tWidth; h = w / ratio; }
      if (h > tHeight) { h = tHeight; w = h * ratio; }
    }

    var x = Math.max(0, Math.min(tWidth - w, box.x));
    var y = Math.max(0, Math.min(tHeight - h, box.y));
    return { x: x, y: y, w: w, h: h };
  }

  function makeCenteredSelection(coverage, ratio) {
    if (!tWidth || !tHeight) return { x: 0, y: 0, w: 0, h: 0 };
    var cov = coverage || 0.85;
    var w = tWidth * cov;
    var h = tHeight * cov;
    if (ratio > 0) {
      if (w / h > ratio) w = h * ratio;
      else h = w / ratio;
      if (w > tWidth * 0.92) { w = tWidth * 0.92; h = w / ratio; }
      if (h > tHeight * 0.92) { h = tHeight * 0.92; w = h * ratio; }
    }
    return {
      x: Math.max(0, (tWidth - w) / 2),
      y: Math.max(0, (tHeight - h) / 2),
      w: w,
      h: h
    };
  }

  /* ----- UI synchronization ----- */
  function syncRatioButtonsUI() {
    ratioButtons.forEach(function (btn) {
      var key = btn.getAttribute('data-ratio');
      btn.classList.toggle('active', key === activeRatioKey);
    });
    if (btnCircleCrop) {
      btnCircleCrop.classList.toggle('active', isCircle);
      btnCircleCrop.setAttribute('aria-pressed', isCircle ? 'true' : 'false');
    }
  }

  function renderAfterPreviewCanvas() {
    if (!workingSource || !afterCanvas) return;
    var dims = getSourceDims(workingSource);
    if (!dims.w || !dims.h) return;
    afterCanvas.width = dims.w;
    afterCanvas.height = dims.h;
    var actx = afterCanvas.getContext('2d');
    actx.clearRect(0, 0, dims.w, dims.h);
    actx.imageSmoothingEnabled = true;
    actx.imageSmoothingQuality = 'high';
    actx.drawImage(workingSource, 0, 0, dims.w, dims.h);
    if (previewWrap) {
      previewWrap.classList.toggle('is-circle-crop', Boolean(workingIsCircle));
    }
  }

  function syncStageView() {
    if (!workingSource) {
      if (cropperContainer) cropperContainer.classList.add('hide');
      if (previewWrap) previewWrap.classList.add('hide');
      if (shortcutHint) shortcutHint.classList.add('hide');
      if (btnCropAgain) btnCropAgain.classList.add('hide');
      return;
    }

    if (isPreviewMode) {
      renderAfterPreviewCanvas();
      if (cropperContainer) cropperContainer.classList.add('hide');
      if (previewWrap) previewWrap.classList.remove('hide');
      if (shortcutHint) shortcutHint.classList.add('hide');
      if (btnCropAgain) btnCropAgain.classList.remove('hide');
    } else {
      if (previewWrap) previewWrap.classList.add('hide');
      if (cropperContainer) cropperContainer.classList.remove('hide');
      if (shortcutHint) shortcutHint.classList.remove('hide');
      if (btnCropAgain) btnCropAgain.classList.add('hide');
    }
  }

  function ensureCropperActive() {
    if (!workingSource || !isPreviewMode) return;
    isPreviewMode = false;
    syncStageView();
    scheduleDraw();
  }

  function updateStraightenUI() {
    if (straightenRange) straightenRange.value = String(straightenDeg);
    if (straightenVal) straightenVal.textContent = straightenDeg + '°';
  }

  function updateReadouts() {
    if (!workingSource || !tWidth || !tHeight) {
      if (cropInfo) cropInfo.textContent = '—';
      return;
    }
    var outW = Math.max(1, Math.round(sel.w));
    var outH = Math.max(1, Math.round(sel.h));
    if (cropInfo) {
      cropInfo.textContent = outW + ' × ' + outH + ' px';
    }
    if (!isSyncingInputs) {
      var activeEl = document.activeElement;
      if (cropWidthInput && activeEl !== cropWidthInput) {
        cropWidthInput.value = String(outW);
      }
      if (cropHeightInput && activeEl !== cropHeightInput) {
        cropHeightInput.value = String(outH);
      }
    }
  }

  function updateHistoryButtons() {
    if (btnUndoCrop) btnUndoCrop.disabled = historyIndex <= 0;
    if (btnRedoCrop) btnRedoCrop.disabled = historyIndex < 0 || historyIndex >= historyStack.length - 1;
  }

  /* ----- History Stack (Undo / Redo across edits and applied crops) ----- */
  function pruneUnusedSnapshotCanvases(discarded) {
    if (!discarded || !discarded.length) return;
    discarded.forEach(function (snap) {
      var src = snap && snap.workingSource;
      if (!src || src === uploadedImage || src === workingSource) return;
      var stillReferenced = historyStack.some(function (entry) {
        return entry && entry.workingSource === src;
      });
      if (!stillReferenced) {
        try {
          src.width = 0;
          src.height = 0;
        } catch (_e) { /* noop */ }
      }
    });
  }

  function clearHistoryStack() {
    var old = historyStack;
    historyStack = [];
    historyIndex = -1;
    pruneUnusedSnapshotCanvases(old);
    updateHistoryButtons();
  }

  function captureSnapshot() {
    return {
      workingSource: workingSource,
      workingHasAlpha: workingHasAlpha,
      workingIsCircle: workingIsCircle,
      isPreviewMode: isPreviewMode,
      cropDepth: cropDepth,
      justCommittedCrop: justCommittedCrop,
      sel: { x: sel.x, y: sel.y, w: sel.w, h: sel.h },
      baseMatrix: baseMatrix.slice(),
      straightenDeg: straightenDeg,
      activeRatioKey: activeRatioKey,
      lastNonCircleRatioKey: lastNonCircleRatioKey,
      isCircle: isCircle
    };
  }

  function snapshotsEqual(a, b) {
    if (!a || !b) return false;
    return a.workingSource === b.workingSource &&
      a.workingHasAlpha === b.workingHasAlpha &&
      a.workingIsCircle === b.workingIsCircle &&
      a.isPreviewMode === b.isPreviewMode &&
      a.cropDepth === b.cropDepth &&
      a.justCommittedCrop === b.justCommittedCrop &&
      Math.abs(a.sel.x - b.sel.x) < 0.5 &&
      Math.abs(a.sel.y - b.sel.y) < 0.5 &&
      Math.abs(a.sel.w - b.sel.w) < 0.5 &&
      Math.abs(a.sel.h - b.sel.h) < 0.5 &&
      a.baseMatrix[0] === b.baseMatrix[0] &&
      a.baseMatrix[1] === b.baseMatrix[1] &&
      a.baseMatrix[2] === b.baseMatrix[2] &&
      a.baseMatrix[3] === b.baseMatrix[3] &&
      a.straightenDeg === b.straightenDeg &&
      a.activeRatioKey === b.activeRatioKey &&
      a.isCircle === b.isCircle;
  }

  function pushHistory(snap) {
    var next = snap || captureSnapshot();
    if (historyIndex >= 0 && snapshotsEqual(historyStack[historyIndex], next)) {
      return;
    }
    var discarded = [];
    if (historyIndex < historyStack.length - 1) {
      discarded = historyStack.slice(historyIndex + 1);
      historyStack = historyStack.slice(0, historyIndex + 1);
    }
    historyStack.push(next);
    if (historyStack.length > MAX_HISTORY) {
      discarded.push(historyStack.shift());
    }
    historyIndex = historyStack.length - 1;
    pruneUnusedSnapshotCanvases(discarded);
    updateHistoryButtons();
  }

  function restoreSnapshot(snap) {
    if (!snap || !snap.workingSource) return;
    var sourceChanged = workingSource !== snap.workingSource;
    var transformChanged =
      sourceChanged ||
      baseMatrix[0] !== snap.baseMatrix[0] ||
      baseMatrix[1] !== snap.baseMatrix[1] ||
      baseMatrix[2] !== snap.baseMatrix[2] ||
      baseMatrix[3] !== snap.baseMatrix[3] ||
      straightenDeg !== snap.straightenDeg;

    workingSource = snap.workingSource;
    workingHasAlpha = Boolean(snap.workingHasAlpha);
    workingIsCircle = Boolean(snap.workingIsCircle);
    isPreviewMode = Boolean(snap.isPreviewMode);
    cropDepth = snap.cropDepth || 0;
    justCommittedCrop = Boolean(snap.justCommittedCrop);
    baseMatrix = snap.baseMatrix.slice();
    straightenDeg = snap.straightenDeg;
    activeRatioKey = snap.activeRatioKey;
    lastNonCircleRatioKey = snap.lastNonCircleRatioKey;
    isCircle = snap.isCircle;

    if (transformChanged) {
      rebuildTransformedPreview();
    }
    sel = clampSelection(snap.sel, getLockedRatioValue());

    if (infoBar) {
      var dims = getSourceDims(workingSource);
      infoBar.textContent = dims.w + ' × ' + dims.h + ' px';
    }
    syncStageView();
    syncRatioButtonsUI();
    updateStraightenUI();
    updateReadouts();
    updateHistoryButtons();
    if (!isPreviewMode) {
      scheduleDraw();
    }
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    restoreSnapshot(historyStack[historyIndex]);
  }

  function redo() {
    if (historyIndex < 0 || historyIndex >= historyStack.length - 1) return;
    historyIndex++;
    restoreSnapshot(historyStack[historyIndex]);
  }

  /* ----- Single-Canvas Layout & 60fps Renderer ----- */
  function computeLayout() {
    if (!cropCanvas || !cropperContainer || !tWidth || !tHeight) return false;
    var cw = cropperContainer.clientWidth || cropCanvas.clientWidth || 400;
    var ch = cropperContainer.clientHeight || cropCanvas.clientHeight || 360;
    if (cw <= 0 || ch <= 0) return false;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var targetPxW = Math.round(cw * dpr);
    var targetPxH = Math.round(ch * dpr);
    if (cropCanvas.width !== targetPxW || cropCanvas.height !== targetPxH) {
      cropCanvas.width = targetPxW;
      cropCanvas.height = targetPxH;
    }

    var availW = Math.max(24, cw - CANVAS_PAD * 2);
    var availH = Math.max(24, ch - CANVAS_PAD * 2);
    var dispScale = Math.min(availW / tWidth, availH / tHeight);
    var dispW = tWidth * dispScale;
    var dispH = tHeight * dispScale;
    var imgX = (cw - dispW) / 2;
    var imgY = (ch - dispH) / 2;

    layout = {
      cw: cw, ch: ch, dpr: dpr,
      imgX: imgX, imgY: imgY, dispW: dispW, dispH: dispH,
      dispScale: dispScale
    };
    return true;
  }

  function getSelectionCssRect() {
    return {
      x: layout.imgX + sel.x * layout.dispScale,
      y: layout.imgY + sel.y * layout.dispScale,
      w: sel.w * layout.dispScale,
      h: sel.h * layout.dispScale
    };
  }

  function getHandlePoints(r) {
    var mx = r.x + r.w / 2;
    var my = r.y + r.h / 2;
    return [
      { id: 'nw', x: r.x, y: r.y, cursor: 'nwse-resize', corner: true },
      { id: 'ne', x: r.x + r.w, y: r.y, cursor: 'nesw-resize', corner: true },
      { id: 'se', x: r.x + r.w, y: r.y + r.h, cursor: 'nwse-resize', corner: true },
      { id: 'sw', x: r.x, y: r.y + r.h, cursor: 'nesw-resize', corner: true },
      { id: 'n', x: mx, y: r.y, cursor: 'ns-resize', corner: false },
      { id: 's', x: mx, y: r.y + r.h, cursor: 'ns-resize', corner: false },
      { id: 'e', x: r.x + r.w, y: my, cursor: 'ew-resize', corner: false },
      { id: 'w', x: r.x, y: my, cursor: 'ew-resize', corner: false }
    ];
  }

  function drawCropCanvas() {
    rafId = 0;
    if (!workingSource || !cropCanvas) return;
    if (!computeLayout()) return;

    var ctx = cropCanvas.getContext('2d');
    ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
    ctx.clearRect(0, 0, layout.cw, layout.ch);

    /* 1. Draw transformed preview image */
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(previewBitmapCanvas, layout.imgX, layout.imgY, layout.dispW, layout.dispH);

    var r = getSelectionCssRect();

    /* 2. Semi-transparent dark backdrop (rgba(0,0,0,0.55)) outside selection */
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.rect(layout.imgX, layout.imgY, layout.dispW, layout.dispH);
    if (isCircle) {
      var rad = Math.min(r.w, r.h) / 2;
      ctx.moveTo(r.x + r.w / 2 + rad, r.y + r.h / 2);
      ctx.arc(r.x + r.w / 2, r.y + r.h / 2, rad, 0, Math.PI * 2, false);
    } else {
      ctx.rect(r.x, r.y, r.w, r.h);
    }
    ctx.fill('evenodd');
    ctx.restore();

    /* 3. Rule-of-Thirds grid lines inside selection */
    if (r.w >= 18 && r.h >= 18) {
      ctx.save();
      ctx.beginPath();
      if (isCircle) {
        ctx.arc(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) / 2, 0, Math.PI * 2);
      } else {
        ctx.rect(r.x, r.y, r.w, r.h);
      }
      ctx.clip();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      var x1 = Math.round(r.x + r.w / 3) + 0.5;
      var x2 = Math.round(r.x + (r.w * 2) / 3) + 0.5;
      var y1 = Math.round(r.y + r.h / 3) + 0.5;
      var y2 = Math.round(r.y + (r.h * 2) / 3) + 0.5;
      ctx.moveTo(x1, r.y); ctx.lineTo(x1, r.y + r.h);
      ctx.moveTo(x2, r.y); ctx.lineTo(x2, r.y + r.h);
      ctx.moveTo(r.x, y1); ctx.lineTo(r.x + r.w, y1);
      ctx.moveTo(r.x, y2); ctx.lineTo(r.x + r.w, y2);
      ctx.stroke();
      ctx.restore();
    }

    /* 4. Bright primary border (#1a5fff) + circle ring when Circle mode is active */
    ctx.save();
    ctx.strokeStyle = PRIMARY_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    if (isCircle) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    /* 5. 8 tactile resize handles */
    var handles = getHandlePoints(r);
    ctx.save();
    handles.forEach(function (h) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = PRIMARY_COLOR;
      ctx.lineWidth = 2;
      if (h.corner) {
        var sz = 10;
        ctx.beginPath();
        ctx.rect(h.x - sz / 2, h.y - sz / 2, sz, sz);
        ctx.fill();
        ctx.stroke();
      } else {
        var isHoriz = (h.id === 'n' || h.id === 's');
        var hw = isHoriz ? 16 : 6;
        var hh = isHoriz ? 6 : 16;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(h.x - hw / 2, h.y - hh / 2, hw, hh, 3);
        } else {
          ctx.rect(h.x - hw / 2, h.y - hh / 2, hw, hh);
        }
        ctx.fill();
        ctx.stroke();
      }
    });
    ctx.restore();

    /* 6. Floating pixel dimension pill above (or inside top of) selection */
    var label = Math.max(1, Math.round(sel.w)) + ' × ' + Math.max(1, Math.round(sel.h)) + ' px';
    ctx.save();
    ctx.font = '600 11px system-ui, -apple-system, sans-serif';
    var tw = ctx.measureText(label).width;
    var pillW = tw + 14;
    var pillH = 20;
    var pillX = Math.max(4, Math.min(layout.cw - pillW - 4, r.x));
    var pillY = (r.y >= pillH + 8) ? (r.y - pillH - 6) : Math.min(layout.ch - pillH - 4, r.y + 6);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(pillX, pillY, pillW, pillH, 4);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pillX + 7, pillY + pillH / 2 + 0.5);
    ctx.restore();
  }

  function scheduleDraw() {
    if (!rafId) {
      rafId = requestAnimationFrame(drawCropCanvas);
    }
  }

  /* ----- Hit testing & Lightshot-style pointer resizing ----- */
  function hitTest(px, py, isTouch) {
    var r = getSelectionCssRect();
    var handles = getHandlePoints(r);
    var hitR = isTouch ? 20 : 12;

    for (var i = 0; i < handles.length; i++) {
      var h = handles[i];
      if (Math.hypot(px - h.x, py - h.y) <= hitR) {
        return { mode: 'resize', handle: h.id, cursor: h.cursor };
      }
    }

    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
      return { mode: 'move', handle: null, cursor: 'move' };
    }

    return { mode: 'draw', handle: null, cursor: 'crosshair' };
  }

  function canvasPtToNat(px, py) {
    return {
      x: Math.max(0, Math.min(tWidth, (px - layout.imgX) / layout.dispScale)),
      y: Math.max(0, Math.min(tHeight, (py - layout.imgY) / layout.dispScale))
    };
  }

  function resizeWithHandle(startBox, handle, px, py, ratio) {
    var pt = canvasPtToNat(px, py);
    var minNat = Math.max(4, Math.min(tWidth, tHeight, 12 / layout.dispScale));

    if (ratio <= 0) {
      var left = startBox.x;
      var top = startBox.y;
      var right = startBox.x + startBox.w;
      var bottom = startBox.y + startBox.h;

      if (handle.indexOf('w') !== -1) left = Math.max(0, Math.min(right - minNat, pt.x));
      if (handle.indexOf('e') !== -1) right = Math.min(tWidth, Math.max(left + minNat, pt.x));
      if (handle.indexOf('n') !== -1) top = Math.max(0, Math.min(bottom - minNat, pt.y));
      if (handle.indexOf('s') !== -1) bottom = Math.min(tHeight, Math.max(top + minNat, pt.y));

      return { x: left, y: top, w: right - left, h: bottom - top };
    }

    var ax, ay, signX, signY, maxW, maxH, w, h;

    if (handle === 'nw' || handle === 'ne' || handle === 'se' || handle === 'sw') {
      ax = (handle.indexOf('w') !== -1) ? (startBox.x + startBox.w) : startBox.x;
      ay = (handle.indexOf('n') !== -1) ? (startBox.y + startBox.h) : startBox.y;
      signX = (handle.indexOf('w') !== -1) ? -1 : 1;
      signY = (handle.indexOf('n') !== -1) ? -1 : 1;

      maxW = (signX < 0) ? ax : (tWidth - ax);
      maxH = (signY < 0) ? ay : (tHeight - ay);
      if (maxW / maxH > ratio) maxW = maxH * ratio;
      else maxH = maxW / ratio;

      var rawW = Math.max(minNat, (pt.x - ax) * signX);
      var rawH = Math.max(minNat, (pt.y - ay) * signY);
      if (rawW / ratio >= rawH) {
        w = Math.min(maxW, rawW);
        h = w / ratio;
      } else {
        h = Math.min(maxH, rawH);
        w = h * ratio;
      }
      if (w < minNat) { w = minNat; h = w / ratio; }
      if (h < minNat) { h = minNat; w = h * ratio; }
      if (w > maxW) { w = maxW; h = w / ratio; }
      if (h > maxH) { h = maxH; w = h * ratio; }

      return {
        x: (signX < 0) ? (ax - w) : ax,
        y: (signY < 0) ? (ay - h) : ay,
        w: w,
        h: h
      };
    }

    if (handle === 'n' || handle === 's') {
      var cx = startBox.x + startBox.w / 2;
      ay = (handle === 'n') ? (startBox.y + startBox.h) : startBox.y;
      signY = (handle === 'n') ? -1 : 1;
      maxH = (signY < 0) ? ay : (tHeight - ay);
      var maxHalfW = Math.min(cx, tWidth - cx);
      var maxWByX = maxHalfW * 2;
      if (maxWByX / maxH > ratio) maxW = maxH * ratio;
      else { maxW = maxWByX; maxH = maxW / ratio; }

      h = Math.max(minNat, Math.min(maxH, (pt.y - ay) * signY));
      w = h * ratio;
      if (w < minNat) { w = minNat; h = w / ratio; }
      return {
        x: cx - w / 2,
        y: (signY < 0) ? (ay - h) : ay,
        w: w,
        h: h
      };
    }

    var cy = startBox.y + startBox.h / 2;
    ax = (handle === 'w') ? (startBox.x + startBox.w) : startBox.x;
    signX = (handle === 'w') ? -1 : 1;
    maxW = (signX < 0) ? ax : (tWidth - ax);
    var maxHalfH = Math.min(cy, tHeight - cy);
    var maxHByY = maxHalfH * 2;
    if (maxW / maxHByY > ratio) { maxH = maxHByY; maxW = maxH * ratio; }
    else { maxH = maxW / ratio; }

    w = Math.max(minNat, Math.min(maxW, (pt.x - ax) * signX));
    h = w / ratio;
    if (h < minNat) { h = minNat; w = h * ratio; }
    return {
      x: (signX < 0) ? (ax - w) : ax,
      y: cy - h / 2,
      w: w,
      h: h
    };
  }

  function drawNewBoxFromAnchor(axNat, ayNat, px, py, ratio) {
    var pt = canvasPtToNat(px, py);
    var dx = pt.x - axNat;
    var dy = pt.y - ayNat;
    var signX = dx < 0 ? -1 : 1;
    var signY = dy < 0 ? -1 : 1;
    var w = Math.abs(dx);
    var h = Math.abs(dy);

    var maxW = signX < 0 ? axNat : (tWidth - axNat);
    var maxH = signY < 0 ? ayNat : (tHeight - ayNat);

    if (ratio > 0) {
      if (w / Math.max(1, h) > ratio) h = w / ratio;
      else w = h * ratio;
      if (w > maxW) { w = maxW; h = w / ratio; }
      if (h > maxH) { h = maxH; w = h * ratio; }
    } else {
      w = Math.min(maxW, w);
      h = Math.min(maxH, h);
    }

    return {
      x: signX < 0 ? (axNat - w) : axNat,
      y: signY < 0 ? (ayNat - h) : ayNat,
      w: Math.max(2, w),
      h: Math.max(2, h)
    };
  }

  function bindCanvasPointerEvents() {
    if (!cropCanvas) return;

    cropCanvas.addEventListener('pointerdown', function (e) {
      if (!workingSource || !tWidth || !tHeight) return;
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();

      var rect = cropCanvas.getBoundingClientRect();
      var px = e.clientX - rect.left;
      var py = e.clientY - rect.top;
      var hit = hitTest(px, py, e.pointerType === 'touch');

      try { cropCanvas.setPointerCapture(e.pointerId); } catch (_e) { /* noop */ }

      dragState = {
        pointerId: e.pointerId,
        mode: hit.mode,
        handle: hit.handle,
        startPx: px,
        startPy: py,
        startBox: { x: sel.x, y: sel.y, w: sel.w, h: sel.h },
        anchorNat: canvasPtToNat(px, py),
        movedEnough: false
      };
    });

    cropCanvas.addEventListener('pointermove', function (e) {
      if (!workingSource || !tWidth || !tHeight) return;
      var rect = cropCanvas.getBoundingClientRect();
      var px = e.clientX - rect.left;
      var py = e.clientY - rect.top;

      if (!dragState) {
        var hover = hitTest(px, py, e.pointerType === 'touch');
        cropCanvas.style.cursor = hover.cursor;
        return;
      }

      if (e.pointerId !== dragState.pointerId) return;
      e.preventDefault();

      var ratio = getLockedRatioValue();
      if (dragState.mode === 'move') {
        var dxNat = (px - dragState.startPx) / layout.dispScale;
        var dyNat = (py - dragState.startPy) / layout.dispScale;
        var nx = Math.max(0, Math.min(tWidth - dragState.startBox.w, dragState.startBox.x + dxNat));
        var ny = Math.max(0, Math.min(tHeight - dragState.startBox.h, dragState.startBox.y + dyNat));
        sel = { x: nx, y: ny, w: dragState.startBox.w, h: dragState.startBox.h };
        dragState.movedEnough = true;
      } else if (dragState.mode === 'resize') {
        sel = resizeWithHandle(dragState.startBox, dragState.handle, px, py, ratio);
        dragState.movedEnough = true;
      } else if (dragState.mode === 'draw') {
        var dist = Math.hypot(px - dragState.startPx, py - dragState.startPy);
        if (dist > 4 || dragState.movedEnough) {
          dragState.movedEnough = true;
          sel = drawNewBoxFromAnchor(dragState.anchorNat.x, dragState.anchorNat.y, px, py, ratio);
        }
      }

      if (dragState.movedEnough) {
        justCommittedCrop = false;
        updateReadouts();
        scheduleDraw();
      }
    });

    function finishDrag(e) {
      if (!dragState || (e.pointerId !== undefined && e.pointerId !== dragState.pointerId)) return;
      try {
        if (cropCanvas.hasPointerCapture && cropCanvas.hasPointerCapture(dragState.pointerId)) {
          cropCanvas.releasePointerCapture(dragState.pointerId);
        }
      } catch (_e) { /* noop */ }

      if (dragState.movedEnough) {
        justCommittedCrop = false;
        sel = clampSelection(sel, getLockedRatioValue());
        updateReadouts();
        scheduleDraw();
        pushHistory();
      }
      dragState = null;
    }

    cropCanvas.addEventListener('pointerup', finishDrag);
    cropCanvas.addEventListener('pointercancel', finishDrag);
  }

  /* ----- Custom W × H px sync ----- */
  function applyCustomDimensions(editedAxis) {
    if (!workingSource || !tWidth || !tHeight) return;
    ensureCropperActive();
    var reqW = parseInt(cropWidthInput ? cropWidthInput.value : '', 10);
    var reqH = parseInt(cropHeightInput ? cropHeightInput.value : '', 10);
    if (!Number.isFinite(reqW) || reqW < 1) reqW = 1;
    if (!Number.isFinite(reqH) || reqH < 1) reqH = 1;

    var ratio = getLockedRatioValue();
    if (ratio > 0) {
      if (editedAxis === 'h') {
        reqH = Math.min(reqH, tHeight);
        reqW = Math.max(1, Math.round(reqH * ratio));
        if (reqW > tWidth) {
          reqW = tWidth;
          reqH = Math.max(1, Math.round(reqW / ratio));
        }
      } else {
        reqW = Math.min(reqW, tWidth);
        reqH = Math.max(1, Math.round(reqW / ratio));
        if (reqH > tHeight) {
          reqH = tHeight;
          reqW = Math.max(1, Math.round(reqH * ratio));
        }
      }
      isSyncingInputs = true;
      if (cropWidthInput) cropWidthInput.value = String(reqW);
      if (cropHeightInput) cropHeightInput.value = String(reqH);
      isSyncingInputs = false;
    } else {
      reqW = Math.min(reqW, tWidth);
      reqH = Math.min(reqH, tHeight);
    }

    var cx = sel.x + sel.w / 2;
    var cy = sel.y + sel.h / 2;
    justCommittedCrop = false;
    sel = clampSelection({
      x: cx - reqW / 2,
      y: cy - reqH / 2,
      w: reqW,
      h: reqH
    }, ratio);

    updateReadouts();
    scheduleDraw();
    pushHistory();
  }

  /* ----- Load / Reset / Clear ----- */
  function loadFile(file) {
    if (!validateFile(file)) return;
    var seq = ++loadSeq;
    revokeOriginalUrl();
    currentFileName = sanitizeFilenameBase(file.name || 'image');

    var previewUrl = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      if (seq !== loadSeq) {
        try { URL.revokeObjectURL(previewUrl); } catch (_e) { /* noop */ }
        return;
      }
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      if (!w || !h || w > MAX_DIMENSION || h > MAX_DIMENSION || (w * h) > MAX_PIXELS) {
        try { URL.revokeObjectURL(previewUrl); } catch (_e) { /* noop */ }
        toast(t('tc_compress_bomb'), 'err');
        clearAll();
        return;
      }

      clearHistoryStack();
      originalFile = file;
      uploadedImage = img;
      originalImageSrc = previewUrl;
      workingSource = img;
      workingHasAlpha = false;
      workingIsCircle = false;
      isPreviewMode = false;
      cropDepth = 0;
      justCommittedCrop = false;

      baseMatrix = [1, 0, 0, 1];
      straightenDeg = 0;
      activeRatioKey = 'free';
      lastNonCircleRatioKey = 'free';
      isCircle = false;

      rebuildTransformedPreview();
      sel = makeCenteredSelection(0.85, 0);

      updateStraightenUI();
      syncRatioButtonsUI();

      if (emptyState) emptyState.classList.add('hide');
      if (dropZone) dropZone.classList.add('hide');
      syncStageView();
      if (resultActions) {
        resultActions.classList.remove('hide');
        resultActions.style.display = '';
      }
      if (btnApply) btnApply.disabled = false;
      if (btnDownload) btnDownload.disabled = false;
      if (infoBar) infoBar.textContent = w + ' × ' + h + ' px';

      pushHistory();
      updateReadouts();
      scheduleDraw();
    };
    img.onerror = function () {
      try { URL.revokeObjectURL(previewUrl); } catch (_e) { /* noop */ }
      toast(t('tc_img_load_err'), 'err');
    };
    img.src = previewUrl;
  }

  function resetAll() {
    if (!uploadedImage) return;
    clearTimeout(dimInputTimer);
    clearTimeout(nudgeHistoryTimer);

    workingSource = uploadedImage;
    workingHasAlpha = false;
    workingIsCircle = false;
    isPreviewMode = false;
    cropDepth = 0;
    justCommittedCrop = false;
    baseMatrix = [1, 0, 0, 1];
    straightenDeg = 0;
    activeRatioKey = 'free';
    lastNonCircleRatioKey = 'free';
    isCircle = false;

    rebuildTransformedPreview();
    sel = makeCenteredSelection(0.85, 0);

    updateStraightenUI();
    syncRatioButtonsUI();
    syncStageView();
    if (infoBar) {
      var dims = getSourceDims(uploadedImage);
      infoBar.textContent = dims.w + ' × ' + dims.h + ' px';
    }

    pushHistory();
    updateReadouts();
    scheduleDraw();
    toast(t('tc_reset'), 'ok');
  }

  function clearAll() {
    clearTimeout(dimInputTimer);
    clearTimeout(nudgeHistoryTimer);
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    loadSeq++;
    revokeOriginalUrl();

    originalFile = null;
    uploadedImage = null;
    workingSource = null;
    workingHasAlpha = false;
    workingIsCircle = false;
    isPreviewMode = false;
    cropDepth = 0;
    justCommittedCrop = false;
    currentFileName = 'image';
    dragState = null;

    clearHistoryStack();

    baseMatrix = [1, 0, 0, 1];
    straightenDeg = 0;
    tWidth = 0;
    tHeight = 0;
    sel = { x: 0, y: 0, w: 0, h: 0 };
    activeRatioKey = 'free';
    lastNonCircleRatioKey = 'free';
    isCircle = false;

    updateStraightenUI();
    syncRatioButtonsUI();
    syncStageView();

    previewBitmapCanvas.width = 0;
    previewBitmapCanvas.height = 0;

    if (cropCanvas) {
      var cctx = cropCanvas.getContext('2d');
      cctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
      cropCanvas.width = 0;
      cropCanvas.height = 0;
    }
    if (afterCanvas) {
      var actx = afterCanvas.getContext('2d');
      actx.clearRect(0, 0, afterCanvas.width, afterCanvas.height);
      afterCanvas.width = 0;
      afterCanvas.height = 0;
    }

    if (cropWidthInput) cropWidthInput.value = '';
    if (cropHeightInput) cropHeightInput.value = '';
    if (cropInfo) cropInfo.textContent = '—';
    if (infoBar) infoBar.textContent = '';

    if (resultActions) {
      resultActions.classList.add('hide');
      resultActions.style.display = 'none';
    }
    if (dropZone) dropZone.classList.add('hide');
    if (emptyState) emptyState.classList.remove('hide');
    if (btnApply) btnApply.disabled = true;
    if (fileInput) fileInput.value = '';
  }

  /* ----- Full-Resolution Crop Extraction ----- */
  function renderFullResCropCanvas() {
    if (!workingSource || !tWidth || !tHeight || sel.w < 1 || sel.h < 1) {
      throw new Error('No active selection');
    }

    var dims = getSourceDims(workingSource);
    var natW = dims.w;
    var natH = dims.h;
    var u = getCombinedMatrix();
    var fmt = getExportFormat();

    var outW = Math.max(1, Math.round(sel.w));
    var outH = Math.max(1, Math.round(sel.h));
    var scale = 1;

    if (outW > MAX_DIMENSION || outH > MAX_DIMENSION || (outW * outH) > MAX_PIXELS) {
      scale = Math.min(
        MAX_DIMENSION / outW,
        MAX_DIMENSION / outH,
        Math.sqrt(MAX_PIXELS / (outW * outH))
      );
      outW = Math.max(1, Math.floor(outW * scale));
      outH = Math.max(1, Math.floor(outH * scale));
    }

    var outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    var ctx = outCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (isCircle) {
      ctx.clearRect(0, 0, outW, outH);
      ctx.save();
      ctx.beginPath();
      ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    } else if (fmt.mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);
    } else {
      ctx.clearRect(0, 0, outW, outH);
      ctx.save();
    }

    ctx.scale(scale, scale);
    ctx.translate(-sel.x + tWidth / 2, -sel.y + tHeight / 2);
    ctx.transform(u[0], u[1], u[2], u[3], 0, 0);
    ctx.drawImage(workingSource, -natW / 2, -natH / 2, natW, natH);

    if (isCircle || fmt.mime !== 'image/jpeg') {
      ctx.restore();
    }

    return { canvas: outCanvas, fmt: fmt };
  }

  function buildExportResult() {
    if (justCommittedCrop && workingSource) {
      var fmt = getExportFormat();
      if (workingSource instanceof HTMLCanvasElement && fmt.mime !== 'image/jpeg') {
        return { canvas: workingSource, fmt: fmt, isTempCanvas: false };
      }
      var dims = getSourceDims(workingSource);
      var copy = document.createElement('canvas');
      copy.width = dims.w;
      copy.height = dims.h;
      var ctx = copy.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (fmt.mime === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, dims.w, dims.h);
      }
      ctx.drawImage(workingSource, 0, 0, dims.w, dims.h);
      return { canvas: copy, fmt: fmt, isTempCanvas: true };
    }
    var rendered = renderFullResCropCanvas();
    return { canvas: rendered.canvas, fmt: rendered.fmt, isTempCanvas: true };
  }

  function canvasToBlobAsync(canvasEl, mime, quality) {
    return new Promise(function (resolve, reject) {
      try {
        canvasEl.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('Blob export failed'));
        }, mime, quality);
      } catch (err) {
        reject(err);
      }
    });
  }

  /* ----- Event Listeners: Ratios & Circle Crop ----- */
  ratioButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var ratioKey = btn.getAttribute('data-ratio') || 'free';
      activeRatioKey = ratioKey;
      if (ratioKey !== '1' || !isCircle) {
        lastNonCircleRatioKey = ratioKey;
      }
      if (isCircle && ratioKey !== '1') {
        isCircle = false;
      }
      syncRatioButtonsUI();
      if (!workingSource) return;
      ensureCropperActive();

      justCommittedCrop = false;
      var locked = getLockedRatioValue();
      if (locked > 0) {
        var cx = sel.x + sel.w / 2;
        var cy = sel.y + sel.h / 2;
        var nw = sel.w;
        var nh = nw / locked;
        if (nh > tHeight * 0.92) { nh = tHeight * 0.92; nw = nh * locked; }
        if (nw > tWidth * 0.92) { nw = tWidth * 0.92; nh = nw / locked; }
        sel = clampSelection({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh }, locked);
      }
      updateReadouts();
      scheduleDraw();
      pushHistory();
    });
  });

  if (btnCircleCrop) {
    btnCircleCrop.addEventListener('click', function () {
      isCircle = !isCircle;
      if (isCircle) {
        if (activeRatioKey !== '1') lastNonCircleRatioKey = activeRatioKey;
        activeRatioKey = '1';
      } else {
        activeRatioKey = lastNonCircleRatioKey || 'free';
      }
      syncRatioButtonsUI();
      if (!workingSource) return;
      ensureCropperActive();

      justCommittedCrop = false;
      var locked = getLockedRatioValue();
      if (locked > 0) {
        var cx = sel.x + sel.w / 2;
        var cy = sel.y + sel.h / 2;
        var side = Math.min(sel.w, sel.h);
        sel = clampSelection({ x: cx - side / 2, y: cy - side / 2, w: side, h: side }, locked);
      }
      updateReadouts();
      scheduleDraw();
      pushHistory();
    });
  }

  /* ----- Event Listeners: Custom W × H px ----- */
  function bindDimInput(el, axis) {
    if (!el) return;
    el.addEventListener('input', function () {
      clearTimeout(dimInputTimer);
      dimInputTimer = setTimeout(function () {
        applyCustomDimensions(axis);
      }, 150);
    });
    el.addEventListener('change', function () {
      clearTimeout(dimInputTimer);
      applyCustomDimensions(axis);
    });
  }
  bindDimInput(cropWidthInput, 'w');
  bindDimInput(cropHeightInput, 'h');

  /* ----- Event Listeners: Undo/Redo & Transforms ----- */
  if (btnUndoCrop) btnUndoCrop.addEventListener('click', undo);
  if (btnRedoCrop) btnRedoCrop.addEventListener('click', redo);

  function applyQuickTransform(fn) {
    if (!workingSource) return;
    ensureCropperActive();
    justCommittedCrop = false;
    var oldW = tWidth;
    var oldH = tHeight;
    fn(oldW, oldH);
    rebuildTransformedPreview();
    sel = clampSelection(sel, getLockedRatioValue());
    updateReadouts();
    scheduleDraw();
    pushHistory();
  }

  if (btnRotLeft) {
    btnRotLeft.addEventListener('click', function () {
      applyQuickTransform(function (oldW) {
        var m00 = baseMatrix[0], m10 = baseMatrix[1], m01 = baseMatrix[2], m11 = baseMatrix[3];
        baseMatrix = [m10, -m00, m11, -m01];
        if (getLockedRatioValue() === 0) {
          sel = { x: sel.y, y: Math.max(0, oldW - sel.x - sel.w), w: sel.h, h: sel.w };
        } else {
          var cx = sel.y + sel.h / 2;
          var cy = Math.max(0, oldW - (sel.x + sel.w / 2));
          sel = { x: cx - sel.w / 2, y: cy - sel.h / 2, w: sel.w, h: sel.h };
        }
      });
    });
  }

  if (btnRotRight) {
    btnRotRight.addEventListener('click', function () {
      applyQuickTransform(function (_oldW, oldH) {
        var m00 = baseMatrix[0], m10 = baseMatrix[1], m01 = baseMatrix[2], m11 = baseMatrix[3];
        baseMatrix = [-m10, m00, -m11, m01];
        if (getLockedRatioValue() === 0) {
          sel = { x: Math.max(0, oldH - sel.y - sel.h), y: sel.x, w: sel.h, h: sel.w };
        } else {
          var cx = Math.max(0, oldH - (sel.y + sel.h / 2));
          var cy = sel.x + sel.w / 2;
          sel = { x: cx - sel.w / 2, y: cy - sel.h / 2, w: sel.w, h: sel.h };
        }
      });
    });
  }

  if (btnFlipH) {
    btnFlipH.addEventListener('click', function () {
      applyQuickTransform(function (oldW) {
        baseMatrix = [-baseMatrix[0], baseMatrix[1], -baseMatrix[2], baseMatrix[3]];
        sel = { x: Math.max(0, oldW - sel.x - sel.w), y: sel.y, w: sel.w, h: sel.h };
      });
    });
  }

  if (btnFlipV) {
    btnFlipV.addEventListener('click', function () {
      applyQuickTransform(function (_oldW, oldH) {
        baseMatrix = [baseMatrix[0], -baseMatrix[1], baseMatrix[2], -baseMatrix[3]];
        sel = { x: sel.x, y: Math.max(0, oldH - sel.y - sel.h), w: sel.w, h: sel.h };
      });
    });
  }

  if (straightenRange) {
    straightenRange.addEventListener('input', function () {
      var val = parseFloat(straightenRange.value);
      straightenDeg = Number.isFinite(val) ? Math.max(-45, Math.min(45, val)) : 0;
      if (straightenVal) straightenVal.textContent = straightenDeg + '°';
      if (!workingSource) return;
      ensureCropperActive();
      justCommittedCrop = false;
      rebuildTransformedPreview();
      sel = clampSelection(sel, getLockedRatioValue());
      updateReadouts();
      scheduleDraw();
    });
    straightenRange.addEventListener('change', function () {
      if (workingSource) pushHistory();
    });
  }

  if (btnStraightenReset) {
    btnStraightenReset.addEventListener('click', function () {
      if (straightenDeg === 0) return;
      straightenDeg = 0;
      updateStraightenUI();
      if (!workingSource) return;
      ensureCropperActive();
      justCommittedCrop = false;
      rebuildTransformedPreview();
      sel = clampSelection(sel, getLockedRatioValue());
      updateReadouts();
      scheduleDraw();
      pushHistory();
    });
  }

  /* ----- Continuous Multi-Step Apply / Download / Open in Advanced Editor ----- */
  function applyCrop() {
    if (!workingSource) { toast(t('tc_load_first'), 'err'); return; }
    if (sel.w < 1 || sel.h < 1) { toast(t('tc_make_selection'), 'err'); return; }

    if (btnApply) btnApply.disabled = true;
    try {
      var rendered = renderFullResCropCanvas();
      var committedCanvas = rendered.canvas;
      var dims = getSourceDims(committedCanvas);

      workingSource = committedCanvas;
      workingHasAlpha = Boolean(isCircle || (workingHasAlpha && rendered.fmt.mime !== 'image/jpeg'));
      workingIsCircle = Boolean(isCircle);
      cropDepth += 1;
      justCommittedCrop = true;
      isPreviewMode = true;

      baseMatrix = [1, 0, 0, 1];
      straightenDeg = 0;
      updateStraightenUI();

      rebuildTransformedPreview();
      sel = makeCenteredSelection(0.85, getLockedRatioValue());

      syncStageView();
      if (infoBar) {
        infoBar.textContent = dims.w + ' × ' + dims.h + ' px';
      }

      pushHistory();
      updateReadouts();
      toast(t('tc_done'), 'ok');
    } catch (err) {
      console.error(err);
      toast(t('tc_crop_fail'), 'err');
    } finally {
      if (btnApply) btnApply.disabled = false;
    }
  }

  function enterCropAgainMode() {
    if (!workingSource) return;
    isPreviewMode = false;
    syncStageView();
    scheduleDraw();
    pushHistory();
  }

  if (btnApply) {
    btnApply.addEventListener('click', applyCrop);
  }
  if (btnCropAgain) {
    btnCropAgain.addEventListener('click', enterCropAgainMode);
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', async function () {
      if (!originalFile || !workingSource) {
        toast(t('tc_load_first'), 'err');
        return;
      }

      var exported = null;
      try {
        exported = buildExportResult();
        var blobToSave = await canvasToBlobAsync(exported.canvas, exported.fmt.mime, EXPORT_QUALITY);
        var extToUse = exported.fmt.ext || 'png';
        var filename = sanitizeFilenameBase(currentFileName) + '_cropped_imgsfix.' + extToUse;

        if (typeof I.triggerDownload === 'function') {
          I.triggerDownload(blobToSave, filename);
        } else {
          var url = URL.createObjectURL(blobToSave);
          var a = document.createElement('a');
          a.download = filename;
          a.href = url;
          a.rel = 'noopener';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            if (a.parentNode) a.parentNode.removeChild(a);
            try { URL.revokeObjectURL(url); } catch (_e) { /* noop */ }
          }, 4000);
        }
        toast(t('tc_done'), 'ok');
      } catch (err) {
        console.error(err);
        toast(t('tc_crop_fail'), 'err');
      } finally {
        if (exported && exported.isTempCanvas && exported.canvas) {
          exported.canvas.width = 0;
          exported.canvas.height = 0;
        }
      }
    });
  }

  if (typeof I.registerEditorBridgeSource === 'function') {
    I.registerEditorBridgeSource(function () {
      if (!workingSource) return null;
      var exported = buildExportResult();
      var needAlpha = Boolean(isCircle || workingHasAlpha);
      return {
        canvas: exported.canvas,
        preserveAlpha: needAlpha,
        name: sanitizeFilenameBase(currentFileName) + '_cropped',
        cleanup: function () {
          if (exported && exported.isTempCanvas && exported.canvas) {
            exported.canvas.width = 0;
            exported.canvas.height = 0;
          }
        }
      };
    });
  }

  if (btnReset) btnReset.addEventListener('click', resetAll);
  if (btnClear) btnClear.addEventListener('click', clearAll);

  /* ----- Keyboard Shortcuts (Desktop Power-User Workflow) ----- */
  document.addEventListener('keydown', function (e) {
    if (!workingSource) return;
    var activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT' ||
        (document.activeElement && document.activeElement.isContentEditable)) {
      return;
    }

    var mod = e.ctrlKey || e.metaKey;
    var code = e.code || '';
    var key = (e.key || '').toLowerCase();

    if (mod && (code === 'KeyZ' || key === 'z') && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if (mod && (code === 'KeyY' || key === 'y' || ((code === 'KeyZ' || key === 'z') && e.shiftKey))) {
      e.preventDefault();
      redo();
      return;
    }

    if (mod) return;

    var isCropperActive = cropperContainer && !cropperContainer.classList.contains('hide');
    if (!isCropperActive) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      applyCrop();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      justCommittedCrop = false;
      sel = makeCenteredSelection(0.85, getLockedRatioValue());
      updateReadouts();
      scheduleDraw();
      pushHistory();
      return;
    }

    var step = e.shiftKey ? 10 : 1;
    var moved = false;
    if (e.key === 'ArrowLeft') {
      sel.x = Math.max(0, sel.x - step);
      moved = true;
    } else if (e.key === 'ArrowRight') {
      sel.x = Math.min(Math.max(0, tWidth - sel.w), sel.x + step);
      moved = true;
    } else if (e.key === 'ArrowUp') {
      sel.y = Math.max(0, sel.y - step);
      moved = true;
    } else if (e.key === 'ArrowDown') {
      sel.y = Math.min(Math.max(0, tHeight - sel.h), sel.y + step);
      moved = true;
    }

    if (moved) {
      e.preventDefault();
      justCommittedCrop = false;
      updateReadouts();
      scheduleDraw();
      clearTimeout(nudgeHistoryTimer);
      nudgeHistoryTimer = setTimeout(function () { pushHistory(); }, 250);
    }
  });

  /* ----- Upload entry points & paste ----- */
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

  /* ----- Responsive Canvas ResizeObserver ----- */
  if (cropperContainer && typeof ResizeObserver === 'function') {
    var ro = new ResizeObserver(function () {
      if (workingSource && !cropperContainer.classList.contains('hide')) {
        scheduleDraw();
      }
    });
    ro.observe(cropperContainer);
  }
  window.addEventListener('resize', function () {
    if (workingSource && cropperContainer && !cropperContainer.classList.contains('hide')) {
      scheduleDraw();
    }
  });

  window.addEventListener('beforeunload', function () {
    clearTimeout(dimInputTimer);
    clearTimeout(nudgeHistoryTimer);
    if (rafId) cancelAnimationFrame(rafId);
    workingSource = null;
    clearHistoryStack();
    revokeOriginalUrl();
  });

  bindCanvasPointerEvents();
})();

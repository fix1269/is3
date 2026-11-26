/* imgsfix — resize.js
   Dimension Resizing Studio (100% Client-Side):
   - Dual mode: By Pixels (px) with Lock Aspect Ratio & Social/Web Quick Presets,
     and By Percentage (%) with slider, numeric input & 25/50/75/150% quick buttons
   - "Do not enlarge if original is smaller" clamp option + 16,384px / 64MP safety guard
   - Multi-step 50% iterative downscaling with high-quality Canvas smoothing
   - Clean result preview (#previewWrap + #afterCanvas) with live dimension & file-size badge
   - Original-format export (.jpg, .webp, .png) at 0.92 quality + Advanced Editor bridge
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
  var EXPORT_QUALITY = 0.92;
  var RENDER_DEBOUNCE_MS = 120;

  /* ----- DOM ----- */
  var modeTabs = $$('.resize-mode-tab', $('#resizeModeTabs'));
  var pixelsPanel = $('#pixelsPanel');
  var percentPanel = $('#percentPanel');

  var widthEl = $('#widthEl');
  var heightEl = $('#heightEl');
  var lockAr = $('#lockAr');
  var presetPills = $$('.resize-preset-pill', $('#resizePresets'));

  var percentRange = $('#percentRange');
  var percentInput = $('#percentInput');
  var percentValLabel = $('#percentValLabel');
  var percentBtns = $$('.resize-percent-btn', $('#percentPresets'));
  var percentResultDims = $('#percentResultDims');

  var noEnlargeEl = $('#noEnlarge');
  var btnApply = $('#btnApply');

  var emptyState = $('#emptyState');
  var previewWrap = $('#previewWrap');
  var afterCanvas = $('#afterCanvas');
  var resizeSummary = $('#resizeSummary');
  var dropZone = $('#dropZone');
  var fileInput = $('#fileInput');
  var btnUpload = $('#btnUpload');
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

  var origW = 0;
  var origH = 0;
  var aspectRatio = 1;
  var mode = 'pixels'; /* 'pixels' | 'percent' */
  var currentPercent = 100;
  var targetW = 0;
  var targetH = 0;

  var renderTimer = 0;
  var rafId = 0;
  var blobSeq = 0;
  var cachedBlob = null;
  var cachedBlobDims = '';
  var estimatedNewBytes = null;

  /* ----- Helpers ----- */
  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
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

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
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

  /* ----- Safe Dimension Clamping & "Do Not Enlarge" Guard ----- */
  function sanitizeTargetDimensions(rawW, rawH, preserveAspect) {
    var w = parseInt(rawW, 10);
    var h = parseInt(rawH, 10);
    if (!isFinite(w) || w < 1) w = 1;
    if (!isFinite(h) || h < 1) h = 1;

    w = clamp(w, 1, MAX_DIMENSION);
    h = clamp(h, 1, MAX_DIMENSION);

    if (noEnlargeEl && noEnlargeEl.checked && origW > 0 && origH > 0) {
      if (preserveAspect) {
        var scaleDown = Math.min(1, origW / w, origH / h);
        if (scaleDown < 1) {
          w = Math.max(1, Math.round(w * scaleDown));
          h = Math.max(1, Math.round(h * scaleDown));
        }
      } else {
        w = Math.min(w, origW);
        h = Math.min(h, origH);
      }
    }

    /* Prevent exceeding MAX_PIXELS (64MP) */
    if (w * h > MAX_PIXELS) {
      var pixScale = Math.sqrt(MAX_PIXELS / (w * h));
      w = Math.max(1, Math.floor(w * pixScale));
      h = Math.max(1, Math.floor(h * pixScale));
    }

    return { w: w, h: h };
  }

  /* ----- Multi-Step High-Quality Canvas Resizer ----- */
  function drawResizedMultiStep(img, dstCanvas, w, h) {
    var curW = img.naturalWidth || img.width;
    var curH = img.naturalHeight || img.height;
    if (!curW || !curH || !w || !h) return;

    /* Iterative 50% halving steps when downscaling > 2x for crisp anti-aliased quality */
    if (curW > w * 2 || curH > h * 2) {
      var stepCanvas = document.createElement('canvas');
      var nextW = curW > w * 2 ? Math.max(w, Math.floor(curW * 0.5)) : curW;
      var nextH = curH > h * 2 ? Math.max(h, Math.floor(curH * 0.5)) : curH;
      stepCanvas.width = nextW;
      stepCanvas.height = nextH;
      var sctx = stepCanvas.getContext('2d');
      sctx.imageSmoothingEnabled = true;
      sctx.imageSmoothingQuality = 'high';
      sctx.drawImage(img, 0, 0, nextW, nextH);

      while (nextW > w * 2 || nextH > h * 2) {
        var prevW = nextW;
        var prevH = nextH;
        nextW = nextW > w * 2 ? Math.max(w, Math.floor(nextW * 0.5)) : nextW;
        nextH = nextH > h * 2 ? Math.max(h, Math.floor(nextH * 0.5)) : nextH;

        var tmp = document.createElement('canvas');
        tmp.width = nextW;
        tmp.height = nextH;
        var tctx = tmp.getContext('2d');
        tctx.imageSmoothingEnabled = true;
        tctx.imageSmoothingQuality = 'high';
        tctx.drawImage(stepCanvas, 0, 0, prevW, prevH, 0, 0, nextW, nextH);

        stepCanvas.width = 0;
        stepCanvas.height = 0;
        stepCanvas = tmp;
      }

      dstCanvas.width = w;
      dstCanvas.height = h;
      var dctx = dstCanvas.getContext('2d');
      dctx.imageSmoothingEnabled = true;
      dctx.imageSmoothingQuality = 'high';
      dctx.clearRect(0, 0, w, h);
      dctx.drawImage(stepCanvas, 0, 0, stepCanvas.width, stepCanvas.height, 0, 0, w, h);

      stepCanvas.width = 0;
      stepCanvas.height = 0;
      return;
    }

    dstCanvas.width = w;
    dstCanvas.height = h;
    var ctx = dstCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
  }

  /* ----- Safe Summary Badge DOM Rendering (Zero innerHTML) ----- */
  function updateSummaryBadge() {
    if (!resizeSummary) return;
    if (!originalImage || !originalFile || !targetW || !targetH) {
      resizeSummary.classList.add('hide');
      while (resizeSummary.firstChild) resizeSummary.removeChild(resizeSummary.firstChild);
      return;
    }

    while (resizeSummary.firstChild) resizeSummary.removeChild(resizeSummary.firstChild);

    var origLabel = document.createElement('span');
    origLabel.textContent = t('tc_resize_orig_label') + ':';

    var origVals = document.createElement('strong');
    origVals.className = 'resize-summary-vals';
    origVals.textContent = origW + ' × ' + origH + ' px (' + formatSize(originalFile.size) + ')';

    var arrow = document.createElement('span');
    arrow.className = 'resize-summary-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = document.documentElement.getAttribute('dir') === 'rtl' ? '←' : '→';

    var newLabel = document.createElement('span');
    newLabel.textContent = t('tc_resize_new_label') + ':';

    var newVals = document.createElement('strong');
    newVals.className = 'resize-summary-vals';
    var sizeStr = estimatedNewBytes !== null ? (' (~' + formatSize(estimatedNewBytes) + ')') : '';
    newVals.textContent = targetW + ' × ' + targetH + ' px' + sizeStr;

    resizeSummary.appendChild(origLabel);
    resizeSummary.appendChild(origVals);
    resizeSummary.appendChild(arrow);
    resizeSummary.appendChild(newLabel);
    resizeSummary.appendChild(newVals);
    resizeSummary.classList.remove('hide');
  }

  function updatePercentReadout() {
    if (percentValLabel) percentValLabel.textContent = String(currentPercent);
    if (percentResultDims) {
      percentResultDims.textContent = (originalImage && targetW && targetH)
        ? (targetW + ' × ' + targetH + ' px')
        : '—';
    }
    percentBtns.forEach(function (btn) {
      var p = parseInt(btn.getAttribute('data-pct'), 10);
      var active = (p === currentPercent);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function syncPresetPillsActive() {
    presetPills.forEach(function (pill) {
      var pw = parseInt(pill.getAttribute('data-w'), 10);
      var ph = parseInt(pill.getAttribute('data-h'), 10);
      var active = (mode === 'pixels' && originalImage && targetW === pw && targetH === ph);
      pill.classList.toggle('active', active);
      pill.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setControlsEnabled(enabled) {
    if (widthEl) widthEl.disabled = !enabled;
    if (heightEl) heightEl.disabled = !enabled;
    if (percentRange) percentRange.disabled = !enabled;
    if (percentInput) percentInput.disabled = !enabled;
    if (btnApply) btnApply.disabled = !enabled;
    if (btnDownload) btnDownload.disabled = !enabled;
    presetPills.forEach(function (p) { p.disabled = !enabled; });
    percentBtns.forEach(function (b) { b.disabled = !enabled; });
  }

  /* ----- Render & Live Size Measurement ----- */
  function measureOutputBlob() {
    if (!afterCanvas || !afterCanvas.width || !afterCanvas.height || !originalFile) return;
    var seq = ++blobSeq;
    var fmt = getExportFormat();
    var dimsKey = afterCanvas.width + 'x' + afterCanvas.height + '|' + fmt.mime;

    if (typeof afterCanvas.toBlob !== 'function') return;
    afterCanvas.toBlob(function (blob) {
      if (seq !== blobSeq) return;
      if (blob) {
        cachedBlob = blob;
        cachedBlobDims = dimsKey;
        estimatedNewBytes = blob.size;
        updateSummaryBadge();
      }
    }, fmt.mime, EXPORT_QUALITY);
  }

  function renderResizeNow(showToast) {
    if (!originalImage || !afterCanvas) return;
    if (!targetW || !targetH) {
      toast(t('tc_resize_invalid'), 'err');
      return;
    }

    cachedBlob = null;
    cachedBlobDims = '';
    drawResizedMultiStep(originalImage, afterCanvas, targetW, targetH);

    /* Quick proportional fallback estimate before async toBlob finishes */
    if (origW > 0 && origH > 0 && originalFile) {
      var areaRatio = (targetW * targetH) / (origW * origH);
      estimatedNewBytes = Math.max(512, Math.round(originalFile.size * Math.pow(areaRatio, 0.88)));
    }
    updateSummaryBadge();
    updatePercentReadout();
    syncPresetPillsActive();
    measureOutputBlob();

    if (showToast) toast(t('tc_done'), 'ok');
  }

  function scheduleRender() {
    if (!originalImage) return;
    updateSummaryBadge();
    updatePercentReadout();
    syncPresetPillsActive();
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(function () {
      renderTimer = 0;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(function () {
        rafId = 0;
        renderResizeNow(false);
      });
    }, RENDER_DEBOUNCE_MS);
  }

  /* ----- Mode Switching & Input Calculations ----- */
  function switchMode(nextMode) {
    mode = nextMode === 'percent' ? 'percent' : 'pixels';
    modeTabs.forEach(function (tab) {
      var isAct = tab.getAttribute('data-mode') === mode;
      tab.classList.toggle('active', isAct);
      tab.setAttribute('aria-selected', isAct ? 'true' : 'false');
    });
    if (pixelsPanel) pixelsPanel.classList.toggle('hide', mode !== 'pixels');
    if (percentPanel) percentPanel.classList.toggle('hide', mode !== 'percent');

    if (originalImage) {
      if (mode === 'percent') {
        applyPercentage(currentPercent, true);
      } else {
        syncPresetPillsActive();
      }
    }
  }

  function applyPercentage(pctVal, triggerRender) {
    var pct = clamp(parseInt(pctVal, 10) || 100, 10, 400);
    currentPercent = pct;
    if (percentRange) percentRange.value = String(pct);
    if (percentInput) percentInput.value = String(pct);

    if (originalImage && origW > 0 && origH > 0) {
      var rawW = Math.max(1, Math.round((origW * pct) / 100));
      var rawH = Math.max(1, Math.round((origH * pct) / 100));
      var clamped = sanitizeTargetDimensions(rawW, rawH, true);
      targetW = clamped.w;
      targetH = clamped.h;
      if (widthEl) widthEl.value = String(targetW);
      if (heightEl) heightEl.value = String(targetH);
      updatePercentReadout();
      if (triggerRender) scheduleRender();
    } else {
      updatePercentReadout();
    }
  }

  function applyPixelDimensions(rawW, rawH, preserveAspect) {
    var clamped = sanitizeTargetDimensions(rawW, rawH, preserveAspect);
    targetW = clamped.w;
    targetH = clamped.h;
    if (widthEl) widthEl.value = String(targetW);
    if (heightEl) heightEl.value = String(targetH);
    if (origW > 0) {
      currentPercent = clamp(Math.round((targetW / origW) * 100), 10, 400);
      if (percentRange) percentRange.value = String(currentPercent);
      if (percentInput) percentInput.value = String(currentPercent);
      if (percentValLabel) percentValLabel.textContent = String(currentPercent);
    }
    scheduleRender();
  }

  /* ----- File Loading, Reset, Clear, Download ----- */
  function loadFile(file) {
    if (!validateFile(file)) return;
    var seq = ++loadSeq;
    revokeObjectUrl();
    cachedBlob = null;
    cachedBlobDims = '';
    estimatedNewBytes = null;
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
      origW = natW;
      origH = natH;
      aspectRatio = natW / natH;

      targetW = natW;
      targetH = natH;
      currentPercent = 100;

      if (widthEl) widthEl.value = String(natW);
      if (heightEl) heightEl.value = String(natH);
      if (percentRange) percentRange.value = '100';
      if (percentInput) percentInput.value = '100';
      if (percentValLabel) percentValLabel.textContent = '100';

      if (emptyState) emptyState.classList.add('hide');
      if (dropZone) dropZone.classList.add('hide');
      if (previewWrap) previewWrap.classList.remove('hide');
      if (resultActions) {
        resultActions.classList.remove('hide');
        resultActions.style.display = '';
      }
      if (infoBar) infoBar.textContent = '';

      setControlsEnabled(true);
      renderResizeNow(false);
    };
    img.onerror = function () {
      try { URL.revokeObjectURL(url); } catch (_e) { /* noop */ }
      toast(t('tc_img_load_err'), 'err');
    };
    img.src = url;
  }

  function resetFields(showMsg) {
    if (!originalImage) return;
    targetW = origW;
    targetH = origH;
    currentPercent = 100;
    if (lockAr) lockAr.checked = true;
    if (noEnlargeEl) noEnlargeEl.checked = false;
    if (widthEl) widthEl.value = String(origW);
    if (heightEl) heightEl.value = String(origH);
    if (percentRange) percentRange.value = '100';
    if (percentInput) percentInput.value = '100';
    if (percentValLabel) percentValLabel.textContent = '100';
    renderResizeNow(false);
    if (showMsg) toast(t('tc_reset'), 'ok');
  }

  function clearAll() {
    if (renderTimer) { clearTimeout(renderTimer); renderTimer = 0; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    loadSeq++;
    blobSeq++;
    revokeObjectUrl();

    originalFile = null;
    originalImage = null;
    currentFileName = 'image';
    origW = 0;
    origH = 0;
    aspectRatio = 1;
    targetW = 0;
    targetH = 0;
    currentPercent = 100;
    cachedBlob = null;
    cachedBlobDims = '';
    estimatedNewBytes = null;

    if (afterCanvas) { afterCanvas.width = 0; afterCanvas.height = 0; }
    if (previewWrap) previewWrap.classList.add('hide');
    if (resizeSummary) {
      resizeSummary.classList.add('hide');
      while (resizeSummary.firstChild) resizeSummary.removeChild(resizeSummary.firstChild);
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

    if (widthEl) widthEl.value = '0';
    if (heightEl) heightEl.value = '0';
    if (lockAr) lockAr.checked = true;
    if (noEnlargeEl) noEnlargeEl.checked = false;
    if (percentRange) percentRange.value = '100';
    if (percentInput) percentInput.value = '100';
    if (percentValLabel) percentValLabel.textContent = '100';

    setControlsEnabled(false);
    updatePercentReadout();
    syncPresetPillsActive();
  }

  function downloadResult() {
    if (!originalFile || !originalImage || !afterCanvas) {
      toast(t('tc_load_first'), 'err');
      return;
    }
    if (!targetW || !targetH) {
      toast(t('tc_resize_invalid'), 'err');
      return;
    }

    if (afterCanvas.width !== targetW || afterCanvas.height !== targetH) {
      drawResizedMultiStep(originalImage, afterCanvas, targetW, targetH);
      cachedBlob = null;
      cachedBlobDims = '';
    }

    var fmt = getExportFormat();
    var filename = sanitizeFilenameBase(currentFileName) + '_resized_imgsfix.' + fmt.ext;
    var dimsKey = targetW + 'x' + targetH + '|' + fmt.mime;

    if (cachedBlob && cachedBlobDims === dimsKey && typeof I.triggerDownload === 'function') {
      I.triggerDownload(cachedBlob, filename);
      toast(t('tc_done'), 'ok');
      return;
    }

    if (typeof I.downloadCanvas === 'function') {
      I.downloadCanvas(afterCanvas, filename, fmt.mime, EXPORT_QUALITY, function () {
        toast(t('tc_done'), 'ok');
      }, function () {
        toast(t('tc_resize_export_err'), 'err');
      });
    } else {
      afterCanvas.toBlob(function (blob) {
        if (!blob) {
          toast(t('tc_resize_export_err'), 'err');
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

  /* ----- Unified Editor Bridge ----- */
  if (typeof I.registerEditorBridgeSource === 'function') {
    I.registerEditorBridgeSource(function () {
      if (!originalImage || !afterCanvas || !targetW || !targetH) return null;
      if (afterCanvas.width !== targetW || afterCanvas.height !== targetH) {
        drawResizedMultiStep(originalImage, afterCanvas, targetW, targetH);
      }
      return {
        canvas: afterCanvas,
        preserveAlpha: hasTransparentPixels(afterCanvas),
        name: sanitizeFilenameBase(currentFileName) + '_resized'
      };
    });
  }

  /* ----- Event Bindings ----- */
  modeTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchMode(tab.getAttribute('data-mode'));
    });
  });

  if (widthEl) {
    widthEl.addEventListener('input', function () {
      if (!originalImage) return;
      var w = parseInt(widthEl.value, 10);
      if (isNaN(w) || w < 1) return;
      var h = parseInt(heightEl ? heightEl.value : '1', 10) || 1;
      var locked = Boolean(lockAr && lockAr.checked && aspectRatio > 0);
      if (locked) {
        h = Math.max(1, Math.round(w / aspectRatio));
      }
      applyPixelDimensions(w, h, locked);
    });
  }

  if (heightEl) {
    heightEl.addEventListener('input', function () {
      if (!originalImage) return;
      var h = parseInt(heightEl.value, 10);
      if (isNaN(h) || h < 1) return;
      var w = parseInt(widthEl ? widthEl.value : '1', 10) || 1;
      var locked = Boolean(lockAr && lockAr.checked && aspectRatio > 0);
      if (locked) {
        w = Math.max(1, Math.round(h * aspectRatio));
      }
      applyPixelDimensions(w, h, locked);
    });
  }

  if (lockAr) {
    lockAr.addEventListener('change', function () {
      if (!originalImage || !lockAr.checked || !aspectRatio) return;
      var w = parseInt(widthEl ? widthEl.value : String(origW), 10) || origW;
      var h = Math.max(1, Math.round(w / aspectRatio));
      applyPixelDimensions(w, h, true);
    });
  }

  presetPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      if (!originalImage) {
        toast(t('tc_load_first'), 'err');
        return;
      }
      var pw = parseInt(pill.getAttribute('data-w'), 10);
      var ph = parseInt(pill.getAttribute('data-h'), 10);
      if (!pw || !ph) return;
      var presetRatio = pw / ph;
      if (lockAr && Math.abs(presetRatio - aspectRatio) > 0.01) {
        lockAr.checked = false;
      }
      applyPixelDimensions(pw, ph, Boolean(lockAr && lockAr.checked));
    });
  });

  if (percentRange) {
    percentRange.addEventListener('input', function () {
      applyPercentage(percentRange.value, true);
    });
  }

  if (percentInput) {
    percentInput.addEventListener('input', function () {
      var val = parseInt(percentInput.value, 10);
      if (isNaN(val)) return;
      if (val < 10 || val > 400) return;
      applyPercentage(val, true);
    });
    percentInput.addEventListener('change', function () {
      applyPercentage(percentInput.value, true);
    });
  }

  percentBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pct = parseInt(btn.getAttribute('data-pct'), 10);
      if (!pct) return;
      applyPercentage(pct, true);
    });
  });

  if (noEnlargeEl) {
    noEnlargeEl.addEventListener('change', function () {
      if (!originalImage) return;
      if (mode === 'percent') {
        applyPercentage(currentPercent, true);
      } else {
        var w = parseInt(widthEl ? widthEl.value : String(origW), 10) || origW;
        var h = parseInt(heightEl ? heightEl.value : String(origH), 10) || origH;
        applyPixelDimensions(w, h, Boolean(lockAr && lockAr.checked));
      }
    });
  }

  if (btnApply) {
    btnApply.addEventListener('click', function () {
      if (!originalImage) {
        toast(t('tc_load_first'), 'err');
        return;
      }
      if (renderTimer) { clearTimeout(renderTimer); renderTimer = 0; }
      if (mode === 'percent') {
        applyPercentage(currentPercent, false);
      } else {
        var w = parseInt(widthEl ? widthEl.value : '0', 10);
        var h = parseInt(heightEl ? heightEl.value : '0', 10);
        if (!w || !h || w < 1 || h < 1) {
          toast(t('tc_resize_invalid'), 'err');
          return;
        }
        var clamped = sanitizeTargetDimensions(w, h, Boolean(lockAr && lockAr.checked));
        targetW = clamped.w;
        targetH = clamped.h;
        if (widthEl) widthEl.value = String(targetW);
        if (heightEl) heightEl.value = String(targetH);
      }
      renderResizeNow(true);
    });
  }

  if (btnDownload) btnDownload.addEventListener('click', downloadResult);
  if (btnReset) btnReset.addEventListener('click', function () { resetFields(true); });
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

  document.addEventListener('imgsfix:langchange', function () {
    updateSummaryBadge();
  });

  if (progressText) progressText.textContent = '';

  window.addEventListener('beforeunload', function () {
    if (renderTimer) clearTimeout(renderTimer);
    if (rafId) cancelAnimationFrame(rafId);
    revokeObjectUrl();
  });

  /* ----- Initialize ----- */
  setControlsEnabled(false);
  switchMode('pixels');
  updatePercentReadout();
})();

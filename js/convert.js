/* imgsfix — convert.js
   Multi-Format Image Converter Studio (100% Client-Side):
   - 7 output formats: JPG, PNG (with upng-js smart quantization), WebP,
     AVIF (graceful native feature detection), ICO (pure JS binary multi-size
     16/32/48px or single square), PDF (single-page auto-fit via jspdf), BMP (24-bit binary)
   - Transparent background fill selector for opaque formats (JPG, BMP)
   - Auto-convert on load + smooth live re-conversion + exact Blob size comparison badge
   - Unified Advanced Editor bridge + strict memory hygiene & XSS safety
*/
import UPNG from 'upng-js';
import { jsPDF } from 'jspdf';

(function () {
  'use strict';

  var upngApi = (UPNG && typeof UPNG.encode === 'function')
    ? UPNG
    : (UPNG && UPNG.default && typeof UPNG.default.encode === 'function' ? UPNG.default : UPNG);

  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = I.$$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  /* ----- Constants ----- */
  var MAX_FILE_BYTES = 50 * 1024 * 1024;
  var MAX_DIMENSION = 16384;
  var MAX_PIXELS = 64000000;
  var MAX_BMP_BYTES = 128 * 1024 * 1024;
  var DEBOUNCE_MS = 180;

  /* ----- DOM ----- */
  var formatGrid = $('#formatGrid');
  var formatPills = $$('.convert-format-pill', formatGrid);
  var avifNotice = $('#avifNotice');

  var qualityRow = $('#qualityRow');
  var qualityEl = $('#quality');
  var qualVal = $('#qualVal');

  var smartPngRow = $('#smartPngRow');
  var smartPngEl = $('#smartPng');

  var bgFillRow = $('#bgFillRow');
  var bgSwatches = $('#bgSwatches');
  var bgBtns = $$('.convert-bg-btn', bgSwatches);
  var bgCustomLabel = $('#bgCustomLabel');
  var bgFillCustom = $('#bgFillCustom');

  var icoSizeRow = $('#icoSizeRow');
  var icoSizeEl = $('#icoSizeEl');

  var btnApply = $('#btnApply');

  var emptyState = $('#emptyState');
  var previewWrap = $('#previewWrap');
  var afterCanvas = $('#afterCanvas');
  var convertSummary = $('#convertSummary');
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
  var convertSeq = 0;

  var selectedFormat = 'jpg';
  var selectedBgColor = '#ffffff';
  var bgCustomActive = false;
  var avifSupported = null; /* null = probing, boolean once resolved */

  var convertedBlob = null;
  var convertedFormat = '';
  var convertedMetaKey = '';
  var debounceTimer = 0;

  /* ----- Helpers ----- */
  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function nextFrame() {
    return new Promise(function (resolve) {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () { setTimeout(resolve, 0); });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  function sanitizeFilenameBase(name) {
    var base = String(name || 'image').replace(/\.[^.]+$/, '');
    base = base.replace(/[\/\\:*?"<>|\x00-\x1F]+/g, '_').replace(/^\.+|\.+$/g, '').trim();
    return base || 'image';
  }

  function sanitizeHexColor(val) {
    var s = String(val || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : '#ffffff';
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
    if (mime === 'image/avif') return 'avif';
    if (mime === 'image/bmp') return 'bmp';
    if (mime === 'image/gif') return 'gif';
    if (mime === 'image/x-icon' || mime === 'image/vnd.microsoft.icon') return 'ico';
    return 'png';
  }

  function getOriginalMime(file) {
    var f = file || originalFile;
    if (f && /^image\/(jpeg|png|webp|gif|bmp|avif|x-icon|vnd\.microsoft\.icon)$/i.test(f.type)) {
      return f.type.toLowerCase();
    }
    var ext = getOriginalExt(f);
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'bmp') return 'image/bmp';
    if (ext === 'avif') return 'image/avif';
    if (ext === 'ico') return 'image/x-icon';
    return '';
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
    if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  function showProgress(pct, label) {
    if (!progressEl) return;
    if (pct === null) {
      progressEl.classList.add('hide');
      if (progressText) progressText.textContent = '';
      return;
    }
    progressEl.classList.remove('hide');
    var bar = $('.progress-bar', progressEl);
    if (bar) bar.style.width = clamp(pct, 0, 100) + '%';
    if (progressText) progressText.textContent = label || '';
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

  function canvasToBlobAsync(canvas, mime, quality) {
    return new Promise(function (resolve) {
      if (!canvas || typeof canvas.toBlob !== 'function') {
        resolve(null);
        return;
      }
      try {
        canvas.toBlob(function (blob) {
          resolve(blob || null);
        }, mime, quality);
      } catch (_e) {
        resolve(null);
      }
    });
  }

  /* ----- AVIF Native Support Detection ----- */
  var avifProbePromise = null;
  function detectAvifSupport() {
    if (avifSupported !== null) return Promise.resolve(avifSupported);
    if (avifProbePromise) return avifProbePromise;

    avifProbePromise = new Promise(function (resolve) {
      var done = false;
      function finish(ok) {
        if (done) return;
        done = true;
        avifSupported = Boolean(ok);
        applyAvifAvailabilityUI();
        resolve(avifSupported);
      }

      var timer = setTimeout(function () { finish(false); }, 600);
      try {
        var c = document.createElement('canvas');
        c.width = 4;
        c.height = 4;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, 0, 4, 4);
        if (typeof c.toBlob !== 'function') {
          clearTimeout(timer);
          c.width = 0;
          c.height = 0;
          finish(false);
          return;
        }
        c.toBlob(function (blob) {
          clearTimeout(timer);
          c.width = 0;
          c.height = 0;
          finish(Boolean(blob && blob.type === 'image/avif' && blob.size > 0));
        }, 'image/avif', 0.8);
      } catch (_e) {
        clearTimeout(timer);
        finish(false);
      }
    });
    return avifProbePromise;
  }

  function applyAvifAvailabilityUI() {
    var avifPill = formatPills.filter(function (p) { return p.getAttribute('data-fmt') === 'avif'; })[0];
    if (!avifPill) return;
    if (avifSupported === false) {
      avifPill.disabled = true;
      avifPill.setAttribute('title', t('tc_convert_avif_unsupported'));
      if (avifNotice) {
        avifNotice.textContent = t('tc_convert_avif_unsupported');
        avifNotice.classList.remove('hide');
      }
      if (selectedFormat === 'avif') {
        selectFormat('webp', false);
      }
    } else {
      avifPill.disabled = false;
      avifPill.removeAttribute('title');
      if (avifNotice) {
        avifNotice.textContent = '';
        avifNotice.classList.add('hide');
      }
    }
  }

  /* ----- Format Controls Visibility ----- */
  function syncFormatControls() {
    var fmt = selectedFormat;
    var showQuality = (fmt === 'jpg' || fmt === 'webp' || fmt === 'avif');
    var showSmartPng = (fmt === 'png');
    var showBgFill = (fmt === 'jpg' || fmt === 'bmp');
    var showIcoSize = (fmt === 'ico');

    if (qualityRow) qualityRow.classList.toggle('hide', !showQuality);
    if (smartPngRow) smartPngRow.classList.toggle('hide', !showSmartPng);
    if (bgFillRow) bgFillRow.classList.toggle('hide', !showBgFill);
    if (icoSizeRow) icoSizeRow.classList.toggle('hide', !showIcoSize);

    formatPills.forEach(function (pill) {
      var active = pill.getAttribute('data-fmt') === fmt;
      pill.classList.toggle('active', active);
      pill.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  function selectFormat(fmt, triggerConvert) {
    var allowed = ['jpg', 'png', 'webp', 'avif', 'ico', 'pdf', 'bmp'];
    if (allowed.indexOf(fmt) === -1) fmt = 'jpg';
    if (fmt === 'avif' && avifSupported === false) {
      toast(t('tc_convert_avif_unsupported'), 'err');
      return;
    }
    selectedFormat = fmt;
    syncFormatControls();
    if (triggerConvert && originalImage) {
      scheduleConvert(true);
    }
  }

  function setControlsEnabled(enabled) {
    if (qualityEl) qualityEl.disabled = !enabled;
    if (smartPngEl) smartPngEl.disabled = !enabled;
    if (icoSizeEl) icoSizeEl.disabled = !enabled;
    if (bgFillCustom) bgFillCustom.disabled = !enabled;
    if (btnApply) btnApply.disabled = !enabled;
    if (btnDownload) btnDownload.disabled = !enabled;
    bgBtns.forEach(function (b) { b.disabled = !enabled; });
  }

  function getCurrentMetaKey() {
    var q = qualityEl ? qualityEl.value : '90';
    var sp = (smartPngEl && smartPngEl.checked) ? '1' : '0';
    var ico = icoSizeEl ? icoSizeEl.value : 'multi';
    return selectedFormat + '|q=' + q + '|sp=' + sp + '|bg=' + selectedBgColor + '|ico=' + ico;
  }

  /* ----- Canvas Rendering Helpers ----- */
  function renderSourceToCanvas(img, dstCanvas, fillBgColor) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    dstCanvas.width = w;
    dstCanvas.height = h;
    var ctx = dstCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (fillBgColor) {
      ctx.fillStyle = sanitizeHexColor(fillBgColor);
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
  }

  function renderContainedSquareIcon(img, size) {
    var srcW = img.naturalWidth || img.width;
    var srcH = img.naturalHeight || img.height;
    var scale = Math.min(size / srcW, size / srcH);
    var drawW = Math.max(1, Math.round(srcW * scale));
    var drawH = Math.max(1, Math.round(srcH * scale));
    var offX = Math.floor((size - drawW) / 2);
    var offY = Math.floor((size - drawH) / 2);

    /* Multi-step 50% downscaling for crisp favicon detail */
    var curSource = img;
    var curW = srcW;
    var curH = srcH;
    var tempCanvases = [];

    while (curW > drawW * 2 || curH > drawH * 2) {
      var nextW = curW > drawW * 2 ? Math.max(drawW, Math.floor(curW * 0.5)) : curW;
      var nextH = curH > drawH * 2 ? Math.max(drawH, Math.floor(curH * 0.5)) : curH;
      var step = document.createElement('canvas');
      step.width = nextW;
      step.height = nextH;
      var sctx = step.getContext('2d');
      sctx.imageSmoothingEnabled = true;
      sctx.imageSmoothingQuality = 'high';
      sctx.drawImage(curSource, 0, 0, curW, curH, 0, 0, nextW, nextH);
      tempCanvases.push(step);
      curSource = step;
      curW = nextW;
      curH = nextH;
    }

    var iconCanvas = document.createElement('canvas');
    iconCanvas.width = size;
    iconCanvas.height = size;
    var ictx = iconCanvas.getContext('2d');
    ictx.imageSmoothingEnabled = true;
    ictx.imageSmoothingQuality = 'high';
    ictx.clearRect(0, 0, size, size);
    ictx.drawImage(curSource, 0, 0, curW, curH, offX, offY, drawW, drawH);

    tempCanvases.forEach(function (tc) {
      tc.width = 0;
      tc.height = 0;
    });
    return iconCanvas;
  }

  /* ----- Binary Encoders (ICO & BMP) & Specialized Encoders (Smart PNG, PDF) ----- */
  async function encodeIcoBlob(img, sizeMode) {
    var sizes = (sizeMode === 'multi')
      ? [16, 32, 48]
      : [clamp(parseInt(sizeMode, 10) || 64, 16, 256)];

    var entries = [];
    for (var i = 0; i < sizes.length; i++) {
      var s = sizes[i];
      var iconCanvas = renderContainedSquareIcon(img, s);
      var pngBlob = await canvasToBlobAsync(iconCanvas, 'image/png', 1);
      iconCanvas.width = 0;
      iconCanvas.height = 0;
      if (!pngBlob) return null;
      var pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
      entries.push({ size: s, bytes: pngBytes });
    }

    var headerLen = 6 + entries.length * 16;
    var totalPayloadLen = entries.reduce(function (acc, item) { return acc + item.bytes.length; }, 0);
    var totalLen = headerLen + totalPayloadLen;
    var out = new Uint8Array(totalLen);
    var view = new DataView(out.buffer);

    /* ICONDIR */
    view.setUint16(0, 0, true); /* reserved */
    view.setUint16(2, 1, true); /* type = 1 (icon) */
    view.setUint16(4, entries.length, true);

    var offset = headerLen;
    for (var idx = 0; idx < entries.length; idx++) {
      var entry = entries[idx];
      var dirOff = 6 + idx * 16;
      var dimByte = entry.size >= 256 ? 0 : entry.size;
      out[dirOff] = dimByte;
      out[dirOff + 1] = dimByte;
      out[dirOff + 2] = 0; /* color count */
      out[dirOff + 3] = 0; /* reserved */
      view.setUint16(dirOff + 4, 1, true); /* color planes */
      view.setUint16(dirOff + 6, 32, true); /* bits per pixel */
      view.setUint32(dirOff + 8, entry.bytes.length, true);
      view.setUint32(dirOff + 12, offset, true);

      out.set(entry.bytes, offset);
      offset += entry.bytes.length;
    }

    return new Blob([out], { type: 'image/x-icon' });
  }

  function encodeBmpBlob(canvas) {
    var w = canvas.width;
    var h = canvas.height;
    if (!w || !h) return null;
    var rowStride = Math.floor((w * 3 + 3) / 4) * 4;
    var pixelDataSize = rowStride * h;
    var fileSize = 54 + pixelDataSize;
    if (fileSize > MAX_BMP_BYTES) return null;

    var ctx = canvas.getContext('2d');
    var rgba = ctx.getImageData(0, 0, w, h).data;
    var buf = new ArrayBuffer(fileSize);
    var view = new DataView(buf);
    var bytes = new Uint8Array(buf);

    /* BITMAPFILEHEADER (14 bytes) */
    bytes[0] = 0x42; /* 'B' */
    bytes[1] = 0x4d; /* 'M' */
    view.setUint32(2, fileSize, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint32(10, 54, true);

    /* BITMAPINFOHEADER (40 bytes) */
    view.setUint32(14, 40, true);
    view.setInt32(18, w, true);
    view.setInt32(22, h, true); /* positive height = bottom-up DIB */
    view.setUint16(26, 1, true); /* planes */
    view.setUint16(28, 24, true); /* 24-bit BGR */
    view.setUint32(30, 0, true); /* BI_RGB */
    view.setUint32(34, pixelDataSize, true);
    view.setInt32(38, 2835, true); /* ~72 DPI */
    view.setInt32(42, 2835, true);
    view.setUint32(46, 0, true);
    view.setUint32(50, 0, true);

    /* Pixel rows bottom-up */
    for (var y = 0; y < h; y++) {
      var srcRow = (h - 1 - y) * w * 4;
      var dstRow = 54 + y * rowStride;
      for (var x = 0; x < w; x++) {
        var sIdx = srcRow + x * 4;
        var dIdx = dstRow + x * 3;
        bytes[dIdx] = rgba[sIdx + 2];     /* B */
        bytes[dIdx + 1] = rgba[sIdx + 1]; /* G */
        bytes[dIdx + 2] = rgba[sIdx];     /* R */
      }
    }

    return new Blob([buf], { type: 'image/bmp' });
  }

  async function encodeSmartPngBlob(canvas, useSmart) {
    var w = canvas.width;
    var h = canvas.height;
    if (!w || !h) return null;

    if (useSmart && upngApi && typeof upngApi.encode === 'function' && (w * h) <= 24000000) {
      try {
        await nextFrame();
        var ctx = canvas.getContext('2d');
        var imgData = ctx.getImageData(0, 0, w, h);
        var buf = upngApi.encode([imgData.data.buffer], w, h, 256);
        if (buf && buf.byteLength > 0) {
          var qBlob = new Blob([buf], { type: 'image/png' });
          /* Guard against rare lossless/palette inflation */
          var rawCheck = await canvasToBlobAsync(canvas, 'image/png', 1);
          if (rawCheck && rawCheck.size < qBlob.size) {
            return rawCheck;
          }
          return qBlob;
        }
      } catch (_e) {
        /* fallback to native canvas PNG */
      }
    }
    return canvasToBlobAsync(canvas, 'image/png', 1);
  }

  function encodePdfBlob(canvas) {
    var w = canvas.width;
    var h = canvas.height;
    if (!w || !h) return null;

    var orientation = w >= h ? 'landscape' : 'portrait';
    var hasAlpha = hasTransparentPixels(canvas);
    var pdf = new jsPDF({
      orientation: orientation,
      unit: 'px',
      format: [w, h],
      hotfixes: ['px_scaling']
    });

    if (hasAlpha) {
      var pngDataUrl = canvas.toDataURL('image/png');
      pdf.addImage(pngDataUrl, 'PNG', 0, 0, w, h);
    } else {
      var jpgDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(jpgDataUrl, 'JPEG', 0, 0, w, h);
    }
    return pdf.output('blob');
  }

  /* ----- Safe Summary Badge DOM Rendering (Zero innerHTML) ----- */
  function updateSummaryBadge() {
    if (!convertSummary) return;
    if (!originalFile || !originalImage || !convertedBlob) {
      convertSummary.classList.add('hide');
      while (convertSummary.firstChild) convertSummary.removeChild(convertSummary.firstChild);
      return;
    }

    while (convertSummary.firstChild) convertSummary.removeChild(convertSummary.firstChild);

    var origExt = getOriginalExt(originalFile).toUpperCase();
    var outExt = (convertedFormat || selectedFormat).toUpperCase();
    var origSize = originalFile.size || 0;
    var outSize = convertedBlob.size || 0;

    var origLabel = document.createElement('span');
    origLabel.textContent = t('tc_convert_orig') + ':';

    var origVal = document.createElement('strong');
    origVal.className = 'resize-summary-vals';
    origVal.textContent = origExt + ' · ' + formatSize(origSize);

    var arrow = document.createElement('span');
    arrow.className = 'resize-summary-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = document.documentElement.getAttribute('dir') === 'rtl' ? '←' : '→';

    var outLabel = document.createElement('span');
    outLabel.textContent = t('tc_convert_out') + ':';

    var outVal = document.createElement('strong');
    outVal.className = 'resize-summary-vals';
    outVal.textContent = outExt + ' · ' + formatSize(outSize);

    convertSummary.appendChild(origLabel);
    convertSummary.appendChild(origVal);
    convertSummary.appendChild(arrow);
    convertSummary.appendChild(outLabel);
    convertSummary.appendChild(outVal);

    if (origSize > 0) {
      var pct = Math.round(((outSize - origSize) / origSize) * 100);
      var delta = document.createElement('span');
      if (pct < 0) {
        delta.className = 'convert-delta-pos';
        delta.textContent = '(' + pct + '%)';
      } else if (pct > 0) {
        delta.className = 'convert-delta-neg';
        delta.textContent = '(+' + pct + '%)';
      } else {
        delta.className = 'convert-delta-neg';
        delta.textContent = '(0%)';
      }
      convertSummary.appendChild(delta);
    }

    convertSummary.classList.remove('hide');
  }

  /* ----- Main Conversion Pipeline ----- */
  async function runConvert(showToast) {
    if (!originalImage || !afterCanvas) return false;
    var seq = ++convertSeq;
    var fmt = selectedFormat;
    var q = clamp((parseInt(qualityEl ? qualityEl.value : '90', 10) || 90) / 100, 0.1, 1);
    var useSmartPng = Boolean(smartPngEl && smartPngEl.checked);
    var bgFill = (fmt === 'jpg' || fmt === 'bmp') ? selectedBgColor : null;
    var icoSizeMode = icoSizeEl ? icoSizeEl.value : 'multi';

    if (fmt === 'avif') {
      var avifOk = await detectAvifSupport();
      if (seq !== convertSeq) return false;
      if (!avifOk) {
        toast(t('tc_convert_avif_unsupported'), 'err');
        return false;
      }
    }

    showProgress(40, '');
    await nextFrame();
    if (seq !== convertSeq) return false;

    /* Render stage preview */
    if (fmt === 'ico') {
      var previewPx = icoSizeMode === 'multi' ? 128 : clamp(parseInt(icoSizeMode, 10) || 64, 32, 128);
      var iconPrev = renderContainedSquareIcon(originalImage, previewPx);
      afterCanvas.width = previewPx;
      afterCanvas.height = previewPx;
      var actx = afterCanvas.getContext('2d');
      actx.clearRect(0, 0, previewPx, previewPx);
      actx.drawImage(iconPrev, 0, 0);
      iconPrev.width = 0;
      iconPrev.height = 0;
    } else {
      renderSourceToCanvas(originalImage, afterCanvas, bgFill);
    }

    var blob = null;
    try {
      if (fmt === 'jpg') {
        blob = await canvasToBlobAsync(afterCanvas, 'image/jpeg', q);
      } else if (fmt === 'png') {
        blob = await encodeSmartPngBlob(afterCanvas, useSmartPng);
      } else if (fmt === 'webp') {
        blob = await canvasToBlobAsync(afterCanvas, 'image/webp', q);
      } else if (fmt === 'avif') {
        blob = await canvasToBlobAsync(afterCanvas, 'image/avif', q);
        if (blob && blob.type !== 'image/avif') {
          avifSupported = false;
          applyAvifAvailabilityUI();
          blob = null;
        }
      } else if (fmt === 'ico') {
        blob = await encodeIcoBlob(originalImage, icoSizeMode);
      } else if (fmt === 'pdf') {
        blob = encodePdfBlob(afterCanvas);
      } else if (fmt === 'bmp') {
        blob = encodeBmpBlob(afterCanvas);
      }
    } catch (_e) {
      blob = null;
    }

    if (seq !== convertSeq) return false;
    showProgress(null, '');

    if (!blob) {
      convertedBlob = null;
      convertedFormat = '';
      convertedMetaKey = '';
      updateSummaryBadge();
      toast(t('tc_convert_err'), 'err');
      return false;
    }

    convertedBlob = blob;
    convertedFormat = fmt;
    convertedMetaKey = getCurrentMetaKey();
    updateSummaryBadge();

    if (showToast) toast(t('tc_done'), 'ok');
    return true;
  }

  function scheduleConvert(immediate) {
    if (!originalImage) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = 0;
    }
    if (immediate) {
      runConvert(false);
    } else {
      debounceTimer = setTimeout(function () {
        debounceTimer = 0;
        runConvert(false);
      }, DEBOUNCE_MS);
    }
  }

  /* ----- File Loading, Reset, Clear, Download ----- */
  function loadFile(file) {
    if (!validateFile(file)) return;
    var seq = ++loadSeq;
    convertSeq++;
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = 0; }
    revokeObjectUrl();

    convertedBlob = null;
    convertedFormat = '';
    convertedMetaKey = '';
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

      if (emptyState) emptyState.classList.add('hide');
      if (dropZone) dropZone.classList.add('hide');
      if (previewWrap) previewWrap.classList.remove('hide');
      if (resultActions) {
        resultActions.classList.remove('hide');
        resultActions.style.display = '';
      }
      if (infoBar) infoBar.textContent = natW + ' × ' + natH + ' px · ' + formatSize(file.size);

      setControlsEnabled(true);
      applyAvifAvailabilityUI();
      runConvert(false);
    };
    img.onerror = function () {
      try { URL.revokeObjectURL(url); } catch (_e) { /* noop */ }
      toast(t('tc_img_load_err'), 'err');
    };
    img.src = url;
  }

  function applyBgColor(hex, isCustom) {
    var clean = sanitizeHexColor(hex);
    selectedBgColor = clean;
    bgCustomActive = Boolean(isCustom);
    if (bgFillCustom && clean !== bgFillCustom.value.toLowerCase()) {
      bgFillCustom.value = clean;
    }
    bgBtns.forEach(function (btn) {
      var active = !bgCustomActive && btn.getAttribute('data-bg') === clean;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (bgCustomLabel) bgCustomLabel.classList.toggle('active', bgCustomActive);
  }

  function resetFields(showMsg) {
    if (!originalImage) return;
    selectedFormat = 'jpg';
    if (qualityEl) qualityEl.value = '90';
    if (qualVal) qualVal.textContent = '90';
    if (smartPngEl) smartPngEl.checked = true;
    if (icoSizeEl) icoSizeEl.value = 'multi';
    applyBgColor('#ffffff', false);
    syncFormatControls();
    runConvert(false);
    if (showMsg) toast(t('tc_reset'), 'ok');
  }

  function clearAll() {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = 0; }
    loadSeq++;
    convertSeq++;
    revokeObjectUrl();

    originalFile = null;
    originalImage = null;
    currentFileName = 'image';
    convertedBlob = null;
    convertedFormat = '';
    convertedMetaKey = '';

    if (afterCanvas) { afterCanvas.width = 0; afterCanvas.height = 0; }
    if (previewWrap) previewWrap.classList.add('hide');
    updateSummaryBadge();
    showProgress(null, '');

    if (resultActions) {
      resultActions.classList.add('hide');
      resultActions.style.display = 'none';
    }
    if (dropZone) dropZone.classList.add('hide');
    if (emptyState) emptyState.classList.remove('hide');
    if (infoBar) infoBar.textContent = '';
    if (fileInput) fileInput.value = '';

    selectedFormat = 'jpg';
    if (qualityEl) qualityEl.value = '90';
    if (qualVal) qualVal.textContent = '90';
    if (smartPngEl) smartPngEl.checked = true;
    if (icoSizeEl) icoSizeEl.value = 'multi';
    applyBgColor('#ffffff', false);
    syncFormatControls();
    setControlsEnabled(false);
    applyAvifAvailabilityUI();
  }

  async function downloadResult() {
    if (!originalFile || !originalImage) {
      toast(t('tc_load_first'), 'err');
      return;
    }
    var currentKey = getCurrentMetaKey();
    if (!convertedBlob || convertedMetaKey !== currentKey) {
      var ok = await runConvert(false);
      if (!ok || !convertedBlob) return;
    }

    var ext = convertedFormat || selectedFormat || 'jpg';
    var filename = sanitizeFilenameBase(currentFileName) + '_converted_imgsfix.' + ext;

    if (typeof I.triggerDownload === 'function') {
      I.triggerDownload(convertedBlob, filename);
    } else {
      var dlUrl = URL.createObjectURL(convertedBlob);
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
    }
    toast(t('tc_done'), 'ok');
  }

  /* ----- Unified Editor Bridge ----- */
  if (typeof I.registerEditorBridgeSource === 'function') {
    I.registerEditorBridgeSource(function () {
      if (!originalImage || !afterCanvas || !afterCanvas.width || !afterCanvas.height) return null;
      var usesOpaqueBg = (selectedFormat === 'jpg' || selectedFormat === 'bmp');
      return {
        canvas: afterCanvas,
        preserveAlpha: !usesOpaqueBg && hasTransparentPixels(afterCanvas),
        name: sanitizeFilenameBase(currentFileName) + '_converted'
      };
    });
  }

  /* ----- Event Bindings ----- */
  formatPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var fmt = pill.getAttribute('data-fmt');
      if (!fmt) return;
      selectFormat(fmt, true);
    });
  });

  if (qualityEl) {
    qualityEl.addEventListener('input', function () {
      if (qualVal) qualVal.textContent = qualityEl.value;
      scheduleConvert(false);
    });
  }

  if (smartPngEl) {
    smartPngEl.addEventListener('change', function () {
      scheduleConvert(true);
    });
  }

  bgBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var bg = btn.getAttribute('data-bg');
      applyBgColor(bg, false);
      scheduleConvert(true);
    });
  });

  if (bgFillCustom) {
    bgFillCustom.addEventListener('input', function () {
      applyBgColor(bgFillCustom.value, true);
      scheduleConvert(false);
    });
    bgFillCustom.addEventListener('change', function () {
      applyBgColor(bgFillCustom.value, true);
      scheduleConvert(true);
    });
  }

  if (icoSizeEl) {
    icoSizeEl.addEventListener('change', function () {
      scheduleConvert(true);
    });
  }

  if (btnApply) {
    btnApply.addEventListener('click', function () {
      if (!originalImage) {
        toast(t('tc_load_first'), 'err');
        return;
      }
      if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = 0; }
      runConvert(true);
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
    applyAvifAvailabilityUI();
    updateSummaryBadge();
  });

  window.addEventListener('beforeunload', function () {
    if (debounceTimer) clearTimeout(debounceTimer);
    revokeObjectUrl();
  });

  /* ----- Initialize ----- */
  setControlsEnabled(false);
  applyBgColor('#ffffff', false);
  syncFormatControls();
  detectAvifSupport();
})();

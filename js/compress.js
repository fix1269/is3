/* imgsfix — compress.js
   High-efficiency 100% client-side image compression tool:
   - True 8-bit perceptual PNG quantization via upng-js (preserves full alpha transparency)
   - Web-worker-backed JPEG/WebP compression via browser-image-compression
   - Smart Size Guard (dynamic maxSizeMB, quality-step retry, zero file inflation)
   - Optional Target File Size (KB) binary/step search
   - Instant auto-compress on load + 350ms debounced live updates + direct Blob download
*/
import imageCompression from 'browser-image-compression';
import UPNG from 'upng-js';

(function () {
  'use strict';

  var upngApi = (UPNG && typeof UPNG.encode === 'function')
    ? UPNG
    : (UPNG && UPNG.default && typeof UPNG.default.encode === 'function' ? UPNG.default : UPNG);

  /* ----- imgsfix API (provided by main.js) ----- */
  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = I.$$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  /* ----- constants ----- */
  var DEFAULT_QUALITY = 75;
  var DEFAULT_MAX_WIDTH = 1920;
  var MAX_FILE_BYTES = 50 * 1024 * 1024;
  var MAX_DIMENSION = 16384;
  var MAX_PIXELS = 64000000;
  var DEBOUNCE_MS = 350;

  /* ----- DOM references ----- */
  var quality = $('#quality');
  var qualityVal = $('#qualityVal');
  var maxWidth = $('#maxWidth');
  var targetSizeKB = $('#targetSizeKB');
  var presetsWrap = $('#compressPresets');
  var presetBtns = $$('.compress-preset-btn', presetsWrap);
  var btnApply = $('#btnApply');
  var btnDownload = $('#btnDownload');
  var btnReset = $('#btnReset');
  var btnClear = $('#btnClear');
  var btnUpload = $('#btnUpload');
  var sizeInfo = $('#sizeInfo');
  var sizeBefore = $('#sizeBefore');
  var sizeAfter = $('#sizeAfter');
  var sizeSaved = $('#sizeSaved');
  var compressStatus = $('#compressStatus');
  var emptyState = $('#emptyState');
  var dropZone = $('#dropZone');
  var baWrap = $('#baWrap');
  var beforeCanvas = $('#beforeCanvas');
  var afterCanvas = $('#afterCanvas');
  var fileInput = $('#fileInput');
  var progress = $('#progress');
  var progressText = $('#progressText');
  var resultActions = $('#resultActions');
  var infoBar = $('#infoBar');

  /* ----- state ----- */
  var originalFile = null;
  var originalImage = null;
  var objectURL = null;
  var compressedBlob = null;
  var compressedBlobUrl = null;
  var currentFileName = 'image.png';
  var currentOutputExt = 'png';
  var lastStatusState = null; /* { key, tone, detail } */
  var debounceTimer = null;
  var activeJobId = 0;
  var isCompressing = false;

  /* ----- helpers ----- */
  function nextFrame() {
    return new Promise(function (resolve) {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () { setTimeout(resolve, 0); });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  function formatSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '0B';
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / 1024 / 1024).toFixed(2) + 'MB';
  }

  function clampInt(val, min, max, fallback) {
    var n = parseInt(val, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function getQualityPct() {
    return clampInt(quality ? quality.value : DEFAULT_QUALITY, 10, 100, DEFAULT_QUALITY);
  }

  function getMaxWidth() {
    return clampInt(maxWidth ? maxWidth.value : DEFAULT_MAX_WIDTH, 16, MAX_DIMENSION, DEFAULT_MAX_WIDTH);
  }

  function getTargetBytes() {
    if (!targetSizeKB) return null;
    var raw = String(targetSizeKB.value || '').trim();
    if (!raw) return null;
    var kb = Number(raw);
    if (!Number.isFinite(kb) || kb <= 0) return null;
    var clampedKb = Math.max(1, Math.min(102400, kb));
    return Math.round(clampedKb * 1024);
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
    if (mime === 'image/gif') return 'gif';
    if (mime === 'image/bmp') return 'bmp';
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

  function extFromMime(mime, fallbackExt) {
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'image/jpeg') return (fallbackExt === 'jpeg') ? 'jpeg' : 'jpg';
    if (mime === 'image/gif') return 'gif';
    if (mime === 'image/bmp') return 'bmp';
    if (mime === 'image/avif') return 'avif';
    return fallbackExt || 'png';
  }

  function showProgress(pct, label) {
    if (!progress) return;
    var bar = $('.progress-bar', progress);
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (progressText) progressText.textContent = label || '';
  }

  function renderStatusBadge() {
    if (!compressStatus) return;
    if (!lastStatusState || !lastStatusState.key) {
      compressStatus.textContent = '';
      compressStatus.className = 'compress-status hide';
      return;
    }
    var msg = t(lastStatusState.key);
    if (lastStatusState.detail) {
      msg += ' (' + lastStatusState.detail + ')';
    }
    compressStatus.textContent = msg;
    compressStatus.className = 'compress-status is-' + (lastStatusState.tone || 'info');
  }

  function setStatusBadge(key, tone, detail) {
    lastStatusState = key ? { key: key, tone: tone || 'info', detail: detail || '' } : null;
    renderStatusBadge();
  }

  function syncPresetButtons(qPct) {
    presetBtns.forEach(function (btn) {
      var pq = parseInt(btn.getAttribute('data-quality'), 10);
      btn.classList.toggle('active', pq === qPct);
    });
  }

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

  function initSlider() {
    if (!baWrap) return;
    var dragging = false;
    function move(e) {
      if (!dragging) return;
      var rect = baWrap.getBoundingClientRect();
      if (!rect.width) return;
      var clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
      var x = clientX - rect.left;
      var pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSlider(pct);
    }
    baWrap.addEventListener('pointerdown', function (e) {
      dragging = true;
      move(e);
    });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', function () { dragging = false; });
    window.addEventListener('pointercancel', function () { dragging = false; });
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

  function revokeCompressedUrl() {
    if (compressedBlobUrl) {
      try { URL.revokeObjectURL(compressedBlobUrl); } catch (_e) { /* noop */ }
      compressedBlobUrl = null;
    }
  }

  function revokeOriginalUrl() {
    if (objectURL) {
      try { URL.revokeObjectURL(objectURL); } catch (_e) { /* noop */ }
      objectURL = null;
    }
  }

  /* ----- RULE 2: wipe metadata before a fresh load ----- */
  function wipeMetadata() {
    if (sizeInfo) sizeInfo.style.display = 'none';
    if (sizeBefore) sizeBefore.textContent = '—';
    if (sizeAfter) sizeAfter.textContent = '—';
    if (sizeSaved) sizeSaved.textContent = '—';
    compressedBlob = null;
    setStatusBadge(null);
    revokeCompressedUrl();
  }

  /* ----- draw a blob URL to the after canvas ----- */
  function drawAfter(url, jobId) {
    return new Promise(function (resolve) {
      var tmp = new Image();
      tmp.onload = function () {
        if (jobId !== undefined && jobId !== activeJobId) {
          resolve();
          return;
        }
        var ac = afterCanvas;
        if (ac) {
          var actx = ac.getContext('2d');
          ac.width = tmp.width;
          ac.height = tmp.height;
          actx.clearRect(0, 0, ac.width, ac.height);
          actx.drawImage(tmp, 0, 0);
        }
        resolve();
      };
      tmp.onerror = function () { resolve(); };
      tmp.src = url;
    });
  }

  /* ----- PNG perceptual 8-bit indexed quantization via upng-js ----- */
  function mapQualityToColors(qPct) {
    if (qPct >= 95) return 256;
    if (qPct >= 85) return 224;
    if (qPct >= 75) return 160;
    if (qPct >= 60) return 112;
    if (qPct >= 45) return 64;
    if (qPct >= 30) return 32;
    if (qPct >= 20) return 24;
    return 16;
  }

  function preparePngRgba(image, maxDim) {
    var largest = Math.max(image.width, image.height);
    var scale = largest > maxDim ? (maxDim / largest) : 1;
    var w = Math.max(1, Math.round(image.width * scale));
    var h = Math.max(1, Math.round(image.height * scale));
    var canvasEl = document.createElement('canvas');
    canvasEl.width = w;
    canvasEl.height = h;
    var ctx = canvasEl.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, w, h);
    var imgData = ctx.getImageData(0, 0, w, h);
    var rgbaCopy = new Uint8Array(imgData.data);
    canvasEl.width = 0;
    canvasEl.height = 0;
    return { rgba: rgbaCopy, width: w, height: h };
  }

  function encodePngFromPrepared(prepared, qPct, lossless) {
    var cnum = lossless ? 0 : mapQualityToColors(qPct);
    var ab = upngApi.encode([prepared.rgba.slice().buffer], prepared.width, prepared.height, cnum);
    return new Blob([ab], { type: 'image/png' });
  }

  async function compressPngPass(image, maxW, qPct, cachedPrepared, lossless) {
    await nextFrame();
    var prepared = cachedPrepared || preparePngRgba(image, maxW);
    await nextFrame();
    var blob = encodePngFromPrepared(prepared, qPct, lossless);
    return { blob: blob, prepared: prepared };
  }

  /* ----- Lossy JPEG / WebP compression via browser-image-compression ----- */
  async function compressRasterPass(file, image, origMime, maxW, qPct, targetMaxBytes, allowDownscaleForTarget) {
    var origMB = file.size / (1024 * 1024);
    var dynamicMB = origMB * (qPct / 100);
    if (targetMaxBytes && targetMaxBytes > 0) {
      dynamicMB = Math.min(origMB, targetMaxBytes / (1024 * 1024));
    }
    var maxSizeMB = Math.max(0.004, Math.min(origMB, dynamicMB));
    var needsResize = Math.max(image.width, image.height) > maxW;

    var opts = {
      maxSizeMB: maxSizeMB,
      maxWidthOrHeight: maxW,
      useWebWorker: true,
      libURL: (I.BASE || './') + 'assets/browser-image-compression.js',
      initialQuality: qPct / 100,
      fileType: origMime,
      alwaysKeepResolution: !allowDownscaleForTarget && !needsResize,
      maxIteration: allowDownscaleForTarget ? 10 : 6
    };

    var out = await imageCompression(file, opts);
    if (!out || !(out instanceof Blob)) {
      throw new Error('Compression returned empty output');
    }
    return out;
  }

  /* ----- Unified single-pass compressor ----- */
  async function compressAt(file, image, origMime, origExt, maxW, qPct, targetMaxBytes, allowDownscale, pngCache) {
    if (origMime === 'image/png') {
      var cacheKey = String(maxW);
      var cached = pngCache ? pngCache[cacheKey] : null;
      var pngRes = await compressPngPass(image, maxW, qPct, cached, false);
      if (pngCache) pngCache[cacheKey] = pngRes.prepared;
      return { blob: pngRes.blob, ext: 'png', convertedFromLegacy: false };
    }

    if (origMime === 'image/gif' || origMime === 'image/bmp') {
      /* Browsers cannot natively encode GIF/BMP via canvas; test lossless/quantized PNG */
      var cacheKeyLegacy = 'legacy_' + maxW;
      var cachedLegacy = pngCache ? pngCache[cacheKeyLegacy] : null;
      var lossless = !targetMaxBytes;
      var legacyRes = await compressPngPass(image, maxW, qPct, cachedLegacy, lossless);
      if (pngCache) pngCache[cacheKeyLegacy] = legacyRes.prepared;
      return {
        blob: legacyRes.blob,
        ext: 'png',
        convertedFromLegacy: true,
        origExt: origExt
      };
    }

    var targetMime = (origMime === 'image/avif') ? 'image/webp' : origMime;
    var outBlob = await compressRasterPass(file, image, targetMime, maxW, qPct, targetMaxBytes, allowDownscale);
    var actualMime = outBlob.type || targetMime;
    var actualExt = extFromMime(actualMime, origExt);
    return {
      blob: outBlob,
      ext: actualExt,
      convertedFromLegacy: false
    };
  }

  /* ----- Main compression workflow (Smart Size Guard + Target KB binary/step search) ----- */
  async function runCompression(opts) {
    opts = opts || {};
    if (!originalFile || !originalImage) {
      if (!opts.silentToast) toast(t('tc_load_first'), 'err');
      return;
    }

    var jobId = ++activeJobId;
    isCompressing = true;
    if (btnApply) {
      btnApply.disabled = true;
      btnApply.setAttribute('aria-busy', 'true');
    }

    var qPct = getQualityPct();
    var maxW = getMaxWidth();
    var targetBytes = getTargetBytes();
    var origMime = getOriginalMime(originalFile);
    var origExt = getOriginalExt(originalFile);
    var origBytes = originalFile.size;
    var pngCache = Object.create(null);

    if (progress) progress.classList.remove('hide');
    showProgress(15, t('tc_processing'));

    try {
      var chosen = null;
      var statusKey = null;
      var statusTone = 'info';
      var statusDetail = '';

      if (targetBytes !== null) {
        /* ===== Target File Size (KB) Mode ===== */
        var firstPass = await compressAt(originalFile, originalImage, origMime, origExt, maxW, qPct, targetBytes, false, pngCache);
        if (jobId !== activeJobId) return;
        showProgress(35, t('tc_processing'));

        var bestUnderTarget = (firstPass.blob.size <= targetBytes && firstPass.blob.size < origBytes) ? firstPass : null;
        var smallestOverall = firstPass;

        if (!bestUnderTarget && origBytes > targetBytes) {
          /* Phase A: Binary search across quality [12 .. qPct - 1] at current maxW */
          var lowQ = 12;
          var highQ = Math.max(12, qPct - 1);
          for (var iter = 0; iter < 6 && lowQ <= highQ; iter++) {
            var midQ = Math.floor((lowQ + highQ) / 2);
            var probe = await compressAt(originalFile, originalImage, origMime, origExt, maxW, midQ, targetBytes, false, pngCache);
            if (jobId !== activeJobId) return;

            if (probe.blob.size < smallestOverall.blob.size) {
              smallestOverall = probe;
            }
            if (probe.blob.size <= targetBytes) {
              bestUnderTarget = probe;
              lowQ = midQ + 1;
              if (probe.blob.size >= targetBytes * 0.9 && highQ - lowQ <= 4) break;
            } else {
              highQ = midQ - 1;
            }
            showProgress(40 + Math.round(((iter + 1) / 6) * 30), t('tc_processing'));
          }

          /* Phase B: If quality alone couldn't reach targetBytes, step down resolution scale */
          if (!bestUnderTarget) {
            var baseMaxDim = Math.min(maxW, Math.max(originalImage.width, originalImage.height));
            var scaleFactors = [0.8, 0.64, 0.5, 0.38, 0.28];
            for (var sIdx = 0; sIdx < scaleFactors.length; sIdx++) {
              var scaledMaxW = Math.max(120, Math.round(baseMaxDim * scaleFactors[sIdx]));
              if (scaledMaxW >= baseMaxDim && sIdx > 0) continue;
              var qSteps = [35, 18];
              for (var qIdx = 0; qIdx < qSteps.length; qIdx++) {
                var sProbe = await compressAt(originalFile, originalImage, origMime, origExt, scaledMaxW, qSteps[qIdx], targetBytes, true, pngCache);
                if (jobId !== activeJobId) return;
                if (sProbe.blob.size < smallestOverall.blob.size) {
                  smallestOverall = sProbe;
                }
                if (sProbe.blob.size <= targetBytes) {
                  bestUnderTarget = sProbe;
                  break;
                }
              }
              showProgress(72 + Math.round(((sIdx + 1) / scaleFactors.length) * 20), t('tc_processing'));
              if (bestUnderTarget) break;
            }
          }
        }

        var candidate = bestUnderTarget || smallestOverall;
        if (candidate.blob.size >= origBytes) {
          chosen = { blob: originalFile, ext: origExt, convertedFromLegacy: false };
          statusKey = 'tc_already_opt';
          statusTone = 'info';
        } else {
          chosen = candidate;
          if (chosen.blob.size <= targetBytes) {
            statusKey = 'tc_target_reached';
            statusTone = 'success';
            statusDetail = '≤ ' + formatSize(targetBytes);
          } else {
            statusKey = 'tc_target_closest';
            statusTone = 'warn';
            statusDetail = formatSize(chosen.blob.size);
          }
        }
      } else {
        /* ===== Standard Quality + Smart Size Guard Mode ===== */
        var pass1 = await compressAt(originalFile, originalImage, origMime, origExt, maxW, qPct, null, false, pngCache);
        if (jobId !== activeJobId) return;
        showProgress(65, t('tc_processing'));

        var finalCandidate = pass1;

        /* Smart Size Guard: if pass 1 inflated or matched original size, retry with lower quality step when q > 30 */
        if (pass1.blob.size >= origBytes && qPct > 30) {
          var retryQ = Math.max(30, qPct - (origMime === 'image/png' ? 20 : 15));
          var pass2 = await compressAt(originalFile, originalImage, origMime, origExt, maxW, retryQ, null, false, pngCache);
          if (jobId !== activeJobId) return;
          if (pass2.blob.size < finalCandidate.blob.size) {
            finalCandidate = pass2;
          }
        }

        if (finalCandidate.blob.size >= origBytes) {
          chosen = { blob: originalFile, ext: origExt, convertedFromLegacy: false };
          statusKey = 'tc_already_opt';
          statusTone = 'info';
        } else {
          chosen = finalCandidate;
          if (chosen.convertedFromLegacy) {
            statusKey = 'tc_png_fallback';
            statusTone = 'info';
          }
        }
      }

      if (jobId !== activeJobId) return;

      /* Commit final compressed blob (never re-encoded on download) */
      compressedBlob = chosen.blob;
      currentOutputExt = chosen.ext || origExt || 'png';

      revokeCompressedUrl();
      compressedBlobUrl = URL.createObjectURL(compressedBlob);
      await drawAfter(compressedBlobUrl, jobId);
      if (jobId !== activeJobId) return;

      /* Update Size comparison card */
      var afterBytes = compressedBlob.size;
      var savedBytes = Math.max(0, origBytes - afterBytes);
      var savedPct = origBytes > 0 ? Math.max(0, Math.round((savedBytes / origBytes) * 100)) : 0;

      if (sizeBefore) sizeBefore.textContent = formatSize(origBytes);
      if (sizeAfter) sizeAfter.textContent = formatSize(afterBytes);
      if (sizeSaved) sizeSaved.textContent = formatSize(savedBytes) + ' (' + savedPct + '%)';
      if (sizeInfo) sizeInfo.style.display = 'block';
      setStatusBadge(statusKey, statusTone, statusDetail);

      showProgress(100, t('tc_done'));
      setTimeout(function () {
        if (jobId === activeJobId && progress) progress.classList.add('hide');
      }, 600);

      if (!opts.silentToast) {
        toast(t('tc_done'), 'ok');
      }
    } catch (err) {
      if (jobId !== activeJobId) return;
      console.error(err);
      if (progress) progress.classList.add('hide');
      toast(t('tc_compress_err'), 'err');
    } finally {
      if (jobId === activeJobId) {
        isCompressing = false;
        if (btnApply) {
          btnApply.disabled = false;
          btnApply.removeAttribute('aria-busy');
        }
      }
    }
  }

  function scheduleCompression(delayMs) {
    clearTimeout(debounceTimer);
    if (!originalFile || !originalImage) return;
    debounceTimer = setTimeout(function () {
      runCompression({ silentToast: true });
    }, typeof delayMs === 'number' ? delayMs : DEBOUNCE_MS);
  }

  /* ----- RULE 1: load file, show before/after, auto-compress ----- */
  function loadFile(file) {
    if (!validateFile(file)) return;
    clearTimeout(debounceTimer);
    activeJobId++;
    wipeMetadata();
    revokeOriginalUrl();

    originalFile = file;
    currentFileName = file.name || 'image.png';
    currentOutputExt = getOriginalExt(file) || 'png';
    objectURL = URL.createObjectURL(file);

    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      if (!w || !h || w > MAX_DIMENSION || h > MAX_DIMENSION || (w * h) > MAX_PIXELS) {
        toast(t('tc_compress_bomb'), 'err');
        clearAll();
        return;
      }
      originalImage = img;
      showBeforeAfter(img);
      if (infoBar) {
        infoBar.textContent = w + ' × ' + h + 'px · ' + formatSize(file.size);
      }
      /* Instant auto-compress on upload */
      runCompression({ silentToast: true });
    };
    img.onerror = function () {
      toast(t('tc_img_load_err'), 'err');
      clearAll();
    };
    img.src = objectURL;
  }

  function showBeforeAfter(img) {
    if (emptyState) emptyState.classList.add('hide');
    if (dropZone) dropZone.classList.add('hide');
    if (baWrap) {
      baWrap.classList.remove('hide');
      baWrap.style.aspectRatio = img.width + ' / ' + img.height;
    }
    if (progress) progress.classList.add('hide');
    if (resultActions) {
      resultActions.classList.remove('hide');
      resultActions.style.display = '';
    }
    if (btnDownload) btnDownload.disabled = false;

    var bc = beforeCanvas;
    if (bc) {
      var bctx = bc.getContext('2d');
      bc.width = img.width;
      bc.height = img.height;
      bctx.clearRect(0, 0, bc.width, bc.height);
      bctx.drawImage(img, 0, 0);
      bc.style.display = 'block';
    }

    var ac = afterCanvas;
    if (ac) {
      var actx = ac.getContext('2d');
      ac.width = img.width;
      ac.height = img.height;
      actx.clearRect(0, 0, ac.width, ac.height);
      actx.drawImage(img, 0, 0);
    }

    setSlider(50);
  }

  /* ----- RULE 3: reset (restore defaults & re-compress cleanly) ----- */
  function resetState() {
    clearTimeout(debounceTimer);
    if (quality) quality.value = String(DEFAULT_QUALITY);
    if (qualityVal) qualityVal.textContent = String(DEFAULT_QUALITY);
    syncPresetButtons(DEFAULT_QUALITY);
    if (maxWidth) maxWidth.value = String(DEFAULT_MAX_WIDTH);
    if (targetSizeKB) targetSizeKB.value = '';

    if (originalImage && afterCanvas) {
      var actx = afterCanvas.getContext('2d');
      afterCanvas.width = originalImage.width;
      afterCanvas.height = originalImage.height;
      actx.clearRect(0, 0, afterCanvas.width, afterCanvas.height);
      actx.drawImage(originalImage, 0, 0);
    }
    wipeMetadata();
    toast(t('tc_reset'), 'ok');
    if (originalFile && originalImage) {
      runCompression({ silentToast: true });
    }
  }

  /* ----- RULE 3: clear (HARD RESET — null everything) ----- */
  function clearAll() {
    clearTimeout(debounceTimer);
    debounceTimer = null;
    activeJobId++;
    isCompressing = false;
    if (btnApply) {
      btnApply.disabled = false;
      btnApply.removeAttribute('aria-busy');
    }
    revokeOriginalUrl();
    revokeCompressedUrl();

    originalFile = null;
    originalImage = null;
    compressedBlob = null;
    currentFileName = 'image.png';
    currentOutputExt = 'png';
    setStatusBadge(null);

    if (beforeCanvas) {
      var bctx = beforeCanvas.getContext('2d');
      bctx.clearRect(0, 0, beforeCanvas.width, beforeCanvas.height);
      beforeCanvas.width = 0;
      beforeCanvas.height = 0;
      beforeCanvas.style.display = 'none';
    }
    if (afterCanvas) {
      var actx = afterCanvas.getContext('2d');
      actx.clearRect(0, 0, afterCanvas.width, afterCanvas.height);
      afterCanvas.width = 0;
      afterCanvas.height = 0;
    }

    if (baWrap) {
      baWrap.classList.add('hide');
      baWrap.style.aspectRatio = '';
    }
    if (progress) progress.classList.add('hide');
    if (resultActions) {
      resultActions.classList.add('hide');
      resultActions.style.display = 'none';
    }
    if (dropZone) dropZone.classList.add('hide');
    if (emptyState) emptyState.classList.remove('hide');
    if (infoBar) infoBar.textContent = '';

    if (sizeInfo) sizeInfo.style.display = 'none';
    if (sizeBefore) sizeBefore.textContent = '—';
    if (sizeAfter) sizeAfter.textContent = '—';
    if (sizeSaved) sizeSaved.textContent = '—';

    if (quality) quality.value = String(DEFAULT_QUALITY);
    if (qualityVal) qualityVal.textContent = String(DEFAULT_QUALITY);
    syncPresetButtons(DEFAULT_QUALITY);
    if (maxWidth) maxWidth.value = String(DEFAULT_MAX_WIDTH);
    if (targetSizeKB) targetSizeKB.value = '';

    if (fileInput) fileInput.value = '';
  }

  /* ===== wire up events ===== */
  if (quality) {
    quality.addEventListener('input', function () {
      var q = getQualityPct();
      if (qualityVal) qualityVal.textContent = String(q);
      syncPresetButtons(q);
      scheduleCompression(DEBOUNCE_MS);
    });
  }

  presetBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var q = clampInt(btn.getAttribute('data-quality'), 10, 100, DEFAULT_QUALITY);
      if (quality) quality.value = String(q);
      if (qualityVal) qualityVal.textContent = String(q);
      syncPresetButtons(q);
      scheduleCompression(DEBOUNCE_MS);
    });
  });

  if (maxWidth) {
    maxWidth.addEventListener('input', function () {
      scheduleCompression(DEBOUNCE_MS);
    });
  }

  if (targetSizeKB) {
    targetSizeKB.addEventListener('input', function () {
      scheduleCompression(DEBOUNCE_MS);
    });
  }

  /* upload entry points */
  if (emptyState) {
    emptyState.addEventListener('click', function () { if (fileInput) fileInput.click(); });
    emptyState.addEventListener('dragover', function (e) {
      e.preventDefault(); emptyState.classList.add('drag');
    });
    emptyState.addEventListener('dragleave', function () {
      emptyState.classList.remove('drag');
    });
    emptyState.addEventListener('drop', function (e) {
      e.preventDefault(); emptyState.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        loadFile(e.dataTransfer.files[0]);
      }
    });
  }
  if (dropZone) {
    dropZone.addEventListener('click', function () { if (fileInput) fileInput.click(); });
    dropZone.addEventListener('dragover', function (e) {
      e.preventDefault(); dropZone.classList.add('drag');
    });
    dropZone.addEventListener('dragleave', function () {
      dropZone.classList.remove('drag');
    });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault(); dropZone.classList.remove('drag');
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
      if (e.target.files && e.target.files[0]) loadFile(e.target.files[0]);
    });
  }

  /* paste support */
  document.addEventListener('paste', function (e) {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files[0]) {
      loadFile(e.clipboardData.files[0]);
    }
  });

  /* manual Compress button — cancels pending debounce and forces immediate compression pass */
  if (btnApply) {
    btnApply.addEventListener('click', function () {
      clearTimeout(debounceTimer);
      debounceTimer = null;
      runCompression({ silentToast: false, force: true });
    });
  }

  /* direct Blob download (never re-encodes afterCanvas) */
  if (btnDownload) {
    btnDownload.addEventListener('click', function () {
      if (!originalFile) {
        toast(t('tc_load_first'), 'err');
        return;
      }
      if (isCompressing) {
        toast(t('tc_processing'), 'info');
        return;
      }
      var blobToSave = compressedBlob || originalFile;
      var ext = compressedBlob ? (currentOutputExt || getOriginalExt(originalFile)) : getOriginalExt(originalFile);
      var filename = sanitizeFilenameBase(currentFileName) + '_compressed_imgsfix.' + (ext || 'png');

      if (typeof I.triggerDownload === 'function') {
        I.triggerDownload(blobToSave, filename);
      } else {
        var dlUrl = URL.createObjectURL(blobToSave);
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
    });
  }

  if (btnReset) btnReset.addEventListener('click', resetState);
  if (btnClear) btnClear.addEventListener('click', clearAll);

  document.addEventListener('imgsfix:langchange', function () {
    renderStatusBadge();
  });

  window.addEventListener('beforeunload', function () {
    clearTimeout(debounceTimer);
    revokeOriginalUrl();
    revokeCompressedUrl();
  });

  syncPresetButtons(getQualityPct());
  initSlider();
})();

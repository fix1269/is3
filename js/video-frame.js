/* imgsfix — video-frame.js
   100% Client-Side Pro Video Frame Grabber & Burst Capture Studio:
   - Streams local video strictly via URL.createObjectURL(file) — never loads multi-GB files into RAM
   - Strict media validation (videoWidth > 0 && videoHeight > 0), max canvas guard 8192x8192
   - Frame-by-frame stepping (1/30s), +/-1s, playback speed (0.25x-2x), interactive scrubber (MM:SS.ms)
   - Smart Auto-Burst Capture (5 / 10 / 20 evenly spaced frames) with live progress & cancel support
   - Up to 40 frames in gallery with PNG / JPG (95%) / WebP exports, JSZip batch pack, & Thumbnail Maker handoff
   - Zero innerHTML with dynamic data (createElement / textContent only) & strict ObjectURL + Canvas cleanup
*/
import JSZip from 'jszip';

(function () {
  'use strict';

  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};

  var MAX_FRAMES = 40;
  var MAX_CANVAS_DIM = 8192;
  var FRAME_STEP = 1 / 30;
  var THUMB_MAX_W = 480;
  var HANDOFF_MAX_DIM = 1920;
  var HANDOFF_KEY = 'imgsfix_yt_thumb_handoff';
  var VALID_EXT_RE = /\.(mp4|webm|mov|mkv|ogg|ogv|m4v)$/i;

  var vfFileInput = $('#vfFileInput');
  var vfDropzone = $('#vfDropzone');
  var btnVfBrowse = $('#btnVfBrowse');
  var vfErrorBanner = $('#vfErrorBanner');
  var vfWorkspace = $('#vfWorkspace');

  var vfFileName = $('#vfFileName');
  var vfMetaRes = $('#vfMetaRes');
  var vfMetaDur = $('#vfMetaDur');
  var vfMetaAr = $('#vfMetaAr');
  var btnVfReplace = $('#btnVfReplace');
  var btnVfClearVideo = $('#btnVfClearVideo');

  var vfVideo = $('#vfVideo');
  var vfShutterFlash = $('#vfShutterFlash');
  var vfTcCurrent = $('#vfTcCurrent');
  var vfTcTotal = $('#vfTcTotal');
  var vfScrubber = $('#vfScrubber');

  var btnVfStepBack1s = $('#btnVfStepBack1s');
  var btnVfStepBack1f = $('#btnVfStepBack1f');
  var btnVfPlayPause = $('#btnVfPlayPause');
  var vfPlayIcon = $('#vfPlayIcon');
  var vfPlayLabel = $('#vfPlayLabel');
  var btnVfStepFwd1f = $('#btnVfStepFwd1f');
  var btnVfStepFwd1s = $('#btnVfStepFwd1s');
  var speedBtns = Array.prototype.slice.call(document.querySelectorAll('[data-vf-speed]'));

  var btnVfCapture = $('#btnVfCapture');
  var burstBtns = Array.prototype.slice.call(document.querySelectorAll('[data-vf-burst]'));
  var vfBurstProgressWrap = $('#vfBurstProgressWrap');
  var vfBurstStatusText = $('#vfBurstStatusText');
  var vfBurstCountText = $('#vfBurstCountText');
  var vfBurstProgressBar = $('#vfBurstProgressBar');
  var btnVfCancelBurst = $('#btnVfCancelBurst');

  var vfFrameCount = $('#vfFrameCount');
  var btnVfDownloadZip = $('#btnVfDownloadZip');
  var btnVfClearFrames = $('#btnVfClearFrames');
  var vfGalleryEmpty = $('#vfGalleryEmpty');
  var vfGalleryGrid = $('#vfGalleryGrid');

  var state = {
    videoObjectUrl: '',
    videoLoaded: false,
    baseName: 'video',
    videoWidth: 0,
    videoHeight: 0,
    duration: 0,
    playbackRate: 1,
    frames: [],
    nextFrameId: 1,
    isScrubbing: false,
    isBursting: false,
    burstToken: 0,
    isZipping: false,
    loadToken: 0
  };

  function clearEl(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function sanitizeFilename(raw) {
    var noExt = String(raw || 'video').replace(/\.[^/.]+$/, '');
    var cleaned = noExt
      .replace(/[/\\:*?"<>|\x00-\x1F]/g, '-')
      .replace(/\s+/g, '_')
      .replace(/-+/g, '-')
      .replace(/^[._-]+|[._-]+$/g, '');
    return cleaned.slice(0, 80) || 'video';
  }

  function syncDocumentMeta() {
    var titlePrefix = t('t_video_frame_t');
    if (titlePrefix && titlePrefix !== 't_video_frame_t') {
      document.title = titlePrefix + ' — imgsfix';
    }
    var metaDesc = document.querySelector('meta[name="description"]');
    var descVal = t('vf_meta_desc');
    if (metaDesc && descVal && descVal !== 'vf_meta_desc') {
      metaDesc.setAttribute('content', descVal);
    }
  }

  function showError(msg) {
    if (!vfErrorBanner) return;
    vfErrorBanner.textContent = msg;
    vfErrorBanner.classList.remove('hide');
  }

  function hideError() {
    if (!vfErrorBanner) return;
    vfErrorBanner.textContent = '';
    vfErrorBanner.classList.add('hide');
  }

  function zeroCanvas(canvas) {
    if (!canvas) return;
    canvas.width = 0;
    canvas.height = 0;
  }

  function gcd(a, b) {
    var x = Math.abs(Math.round(a));
    var y = Math.abs(Math.round(b));
    while (y) {
      var tmp = y;
      y = x % y;
      x = tmp;
    }
    return x || 1;
  }

  function formatAspectRatio(w, h) {
    if (!w || !h) return '--';
    var d = gcd(w, h);
    var rw = Math.round(w / d);
    var rh = Math.round(h / d);
    if (rw > 40 || rh > 40) {
      return (w / h).toFixed(2) + ':1';
    }
    return rw + ':' + rh;
  }

  function formatTimecode(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00.00';
    var totalCs = Math.round(seconds * 100);
    var cs = totalCs % 100;
    var totalSec = Math.floor(totalCs / 100);
    var sec = totalSec % 60;
    var totalMin = Math.floor(totalSec / 60);
    var hr = Math.floor(totalMin / 60);
    var min = totalMin % 60;
    var mm = String(min).padStart(2, '0');
    var ss = String(sec).padStart(2, '0');
    var ms = String(cs).padStart(2, '0');
    if (hr > 0) {
      return String(hr).padStart(2, '0') + ':' + mm + ':' + ss + '.' + ms;
    }
    return mm + ':' + ss + '.' + ms;
  }

  function formatFileTimeTag(seconds) {
    return formatTimecode(seconds).replace(/:/g, '-').replace(/\./g, '_');
  }

  function computeBoundedSize(w, h, maxDim) {
    var cw = Math.max(1, Math.round(w));
    var ch = Math.max(1, Math.round(h));
    if (cw <= maxDim && ch <= maxDim) {
      return { width: cw, height: ch };
    }
    var scale = Math.min(maxDim / cw, maxDim / ch);
    return {
      width: Math.max(1, Math.round(cw * scale)),
      height: Math.max(1, Math.round(ch * scale))
    };
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise(function (resolve, reject) {
      try {
        canvas.toBlob(function (blob) {
          if (blob && blob.size > 0) resolve(blob);
          else reject(new Error('Canvas export returned empty blob'));
        }, mime, quality);
      } catch (err) {
        reject(err);
      }
    });
  }

  function triggerBlobDownload(blob, filename) {
    if (!blob) return;
    var url = URL.createObjectURL(blob);
    try {
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(function () {
        try { URL.revokeObjectURL(url); } catch (_e) {}
      }, 1500);
    }
  }

  function revokeVideoUrl() {
    if (state.videoObjectUrl) {
      try { URL.revokeObjectURL(state.videoObjectUrl); } catch (_e) {}
      state.videoObjectUrl = '';
    }
  }

  function clearAllFrames(silent) {
    for (var i = 0; i < state.frames.length; i++) {
      var f = state.frames[i];
      if (f.thumbUrl) {
        try { URL.revokeObjectURL(f.thumbUrl); } catch (_e) {}
      }
      f.pngBlob = null;
      f.thumbUrl = '';
    }
    state.frames = [];
    renderGallery();
    if (!silent) {
      toast(t('vf_cleared_ok'), 'ok');
    }
  }

  function removeFrameById(id) {
    var next = [];
    for (var i = 0; i < state.frames.length; i++) {
      var f = state.frames[i];
      if (f.id === id) {
        if (f.thumbUrl) {
          try { URL.revokeObjectURL(f.thumbUrl); } catch (_e) {}
        }
        f.pngBlob = null;
        f.thumbUrl = '';
      } else {
        next.push(f);
      }
    }
    state.frames = next;
    renderGallery();
  }

  function cancelBurst() {
    if (!state.isBursting) return;
    state.burstToken += 1;
    state.isBursting = false;
    updateBurstUi(false, 0, 0);
    updateControlStates();
    toast(t('vf_burst_cancelled'), 'ok');
  }

  function unloadVideo() {
    if (state.isBursting) {
      state.burstToken += 1;
      state.isBursting = false;
      updateBurstUi(false, 0, 0);
    }
    state.loadToken += 1;
    if (vfVideo) {
      try { vfVideo.pause(); } catch (_e) {}
      vfVideo.removeAttribute('src');
      try { vfVideo.load(); } catch (_e) {}
    }
    revokeVideoUrl();
    state.videoLoaded = false;
    state.videoWidth = 0;
    state.videoHeight = 0;
    state.duration = 0;
    if (vfFileInput) vfFileInput.value = '';
    if (vfScrubber) {
      vfScrubber.value = '0';
      vfScrubber.style.setProperty('--vf-prog', '0%');
    }
    if (vfTcCurrent) vfTcCurrent.textContent = '00:00.00';
    if (vfTcTotal) vfTcTotal.textContent = '00:00.00';
    if (vfWorkspace) vfWorkspace.classList.add('hide');
    if (vfDropzone) vfDropzone.classList.remove('hide');
    hideError();
    updatePlayUi();
    updateControlStates();
  }

  function updatePlayUi() {
    if (!vfVideo || !vfPlayIcon || !vfPlayLabel) return;
    var playing = state.videoLoaded && !vfVideo.paused && !vfVideo.ended;
    vfPlayIcon.textContent = playing ? '❚❚' : '▶';
    vfPlayLabel.textContent = playing ? t('vf_btn_pause') : t('vf_btn_play');
    if (btnVfPlayPause) {
      btnVfPlayPause.setAttribute('aria-pressed', playing ? 'true' : 'false');
    }
  }

  function updateTimeUi() {
    if (!vfVideo) return;
    var dur = Number.isFinite(vfVideo.duration) && vfVideo.duration > 0 ? vfVideo.duration : state.duration;
    var cur = Number.isFinite(vfVideo.currentTime) ? Math.max(0, vfVideo.currentTime) : 0;
    if (vfTcCurrent) vfTcCurrent.textContent = formatTimecode(cur);
    if (vfTcTotal) {
      vfTcTotal.textContent = dur > 0 ? formatTimecode(dur) : '--:--.--';
    }
    if (vfScrubber && !state.isScrubbing) {
      var ratio = dur > 0 ? Math.min(1, Math.max(0, cur / dur)) : 0;
      vfScrubber.value = String(Math.round(ratio * 1000));
      vfScrubber.style.setProperty('--vf-prog', (ratio * 100).toFixed(2) + '%');
    }
  }

  function updateControlStates() {
    var ready = state.videoLoaded && !state.isBursting;
    var hasDur = ready && Number.isFinite(state.duration) && state.duration > 0;
    var atCap = state.frames.length >= MAX_FRAMES;

    if (vfScrubber) vfScrubber.disabled = !hasDur;
    if (btnVfStepBack1s) btnVfStepBack1s.disabled = !ready;
    if (btnVfStepBack1f) btnVfStepBack1f.disabled = !ready;
    if (btnVfPlayPause) btnVfPlayPause.disabled = !ready;
    if (btnVfStepFwd1f) btnVfStepFwd1f.disabled = !ready;
    if (btnVfStepFwd1s) btnVfStepFwd1s.disabled = !ready;
    if (btnVfCapture) btnVfCapture.disabled = !ready || atCap;

    for (var i = 0; i < burstBtns.length; i++) {
      burstBtns[i].disabled = !hasDur || atCap;
    }
    if (btnVfReplace) btnVfReplace.disabled = state.isBursting;
    if (btnVfClearVideo) btnVfClearVideo.disabled = state.isBursting;

    var hasFrames = state.frames.length > 0;
    if (btnVfDownloadZip) btnVfDownloadZip.disabled = !hasFrames || state.isZipping || state.isBursting;
    if (btnVfClearFrames) btnVfClearFrames.disabled = !hasFrames || state.isBursting;
    if (vfFrameCount) vfFrameCount.textContent = state.frames.length + ' / ' + MAX_FRAMES;
  }

  function updateBurstUi(visible, done, total) {
    if (!vfBurstProgressWrap) return;
    if (!visible) {
      vfBurstProgressWrap.classList.add('hide');
      if (vfBurstProgressBar) vfBurstProgressBar.style.width = '0%';
      return;
    }
    vfBurstProgressWrap.classList.remove('hide');
    if (vfBurstStatusText) vfBurstStatusText.textContent = t('vf_burst_running');
    if (vfBurstCountText) vfBurstCountText.textContent = done + ' / ' + total;
    var pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    if (vfBurstProgressBar) vfBurstProgressBar.style.width = pct + '%';
  }

  function flashShutter() {
    if (!vfShutterFlash) return;
    vfShutterFlash.classList.remove('is-active');
    void vfShutterFlash.offsetWidth;
    vfShutterFlash.classList.add('is-active');
  }

  function isAcceptedVideoFile(file) {
    if (!file) return false;
    if (file.type && file.type.indexOf('video/') === 0) return true;
    return VALID_EXT_RE.test(file.name || '');
  }

  function loadVideoFile(file) {
    hideError();
    if (!file) return;
    if (!isAcceptedVideoFile(file)) {
      var msgBad = t('vf_err_invalid_video');
      showError(msgBad);
      toast(msgBad, 'err');
      return;
    }

    if (state.isBursting) {
      state.burstToken += 1;
      state.isBursting = false;
      updateBurstUi(false, 0, 0);
    }

    var token = ++state.loadToken;
    var objectUrl = URL.createObjectURL(file);

    revokeVideoUrl();
    state.videoObjectUrl = objectUrl;
    state.videoLoaded = false;
    state.baseName = sanitizeFilename(file.name);

    var cleanedMeta = false;
    function cleanupListeners() {
      vfVideo.removeEventListener('loadedmetadata', onLoadedMeta);
      vfVideo.removeEventListener('error', onVideoError);
    }

    function onVideoError() {
      if (cleanedMeta) return;
      cleanedMeta = true;
      cleanupListeners();
      if (token !== state.loadToken) return;
      revokeVideoUrl();
      state.videoLoaded = false;
      var msgErr = t('vf_err_invalid_video');
      showError(msgErr);
      toast(msgErr, 'err');
      updateControlStates();
    }

    function onLoadedMeta() {
      if (cleanedMeta) return;
      cleanedMeta = true;
      cleanupListeners();
      if (token !== state.loadToken) return;

      var vw = vfVideo.videoWidth || 0;
      var vh = vfVideo.videoHeight || 0;
      if (vw <= 0 || vh <= 0) {
        onVideoError();
        return;
      }

      state.videoWidth = vw;
      state.videoHeight = vh;
      state.duration = Number.isFinite(vfVideo.duration) && vfVideo.duration > 0 ? vfVideo.duration : 0;
      state.videoLoaded = true;

      vfVideo.playbackRate = state.playbackRate;
      vfVideo.defaultPlaybackRate = state.playbackRate;

      var bounded = computeBoundedSize(vw, vh, MAX_CANVAS_DIM);
      if (vfFileName) vfFileName.textContent = file.name ? String(file.name).slice(0, 90) : state.baseName;
      if (vfMetaRes) {
        vfMetaRes.textContent = bounded.width + ' × ' + bounded.height;
      }
      if (vfMetaDur) {
        vfMetaDur.textContent = state.duration > 0 ? formatTimecode(state.duration) : t('vf_dur_unknown');
      }
      if (vfMetaAr) {
        vfMetaAr.textContent = formatAspectRatio(vw, vh);
      }

      if (vfDropzone) vfDropzone.classList.add('hide');
      if (vfWorkspace) vfWorkspace.classList.remove('hide');

      updateTimeUi();
      updatePlayUi();
      updateControlStates();
      toast(t('vf_loaded_ok'), 'ok');
    }

    vfVideo.addEventListener('loadedmetadata', onLoadedMeta);
    vfVideo.addEventListener('error', onVideoError);
    vfVideo.src = objectUrl;
    vfVideo.load();
  }

  async function captureCurrentFrameToEntry(sharedCapCanvas, sharedThumbCanvas) {
    if (!state.videoLoaded || !vfVideo || vfVideo.videoWidth <= 0 || vfVideo.videoHeight <= 0) {
      throw new Error('Video frame unavailable');
    }
    if (state.frames.length >= MAX_FRAMES) {
      throw new Error('GALLERY_FULL');
    }

    var target = computeBoundedSize(vfVideo.videoWidth, vfVideo.videoHeight, MAX_CANVAS_DIM);
    var ownCap = !sharedCapCanvas;
    var ownThumb = !sharedThumbCanvas;
    var capCanvas = sharedCapCanvas || document.createElement('canvas');
    var thumbCanvas = sharedThumbCanvas || document.createElement('canvas');

    try {
      capCanvas.width = target.width;
      capCanvas.height = target.height;
      var ctx = capCanvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('2D context unavailable');
      ctx.drawImage(vfVideo, 0, 0, target.width, target.height);

      var pngBlob = await canvasToBlob(capCanvas, 'image/png');

      var thumbSize = computeBoundedSize(target.width, target.height, THUMB_MAX_W);
      thumbCanvas.width = thumbSize.width;
      thumbCanvas.height = thumbSize.height;
      var tctx = thumbCanvas.getContext('2d', { alpha: false });
      var thumbUrl = '';
      if (tctx) {
        tctx.drawImage(capCanvas, 0, 0, thumbSize.width, thumbSize.height);
        var thumbBlob = await canvasToBlob(thumbCanvas, 'image/jpeg', 0.84);
        thumbUrl = URL.createObjectURL(thumbBlob);
      } else {
        thumbUrl = URL.createObjectURL(pngBlob);
      }

      var curTime = Number.isFinite(vfVideo.currentTime) ? vfVideo.currentTime : 0;
      var entry = {
        id: state.nextFrameId++,
        timeSec: curTime,
        timeLabel: formatTimecode(curTime),
        fileTimeTag: formatFileTimeTag(curTime),
        width: target.width,
        height: target.height,
        pngBlob: pngBlob,
        thumbUrl: thumbUrl
      };
      return entry;
    } finally {
      if (ownCap) zeroCanvas(capCanvas);
      if (ownThumb) zeroCanvas(thumbCanvas);
    }
  }

  async function handleCaptureSingle() {
    if (!state.videoLoaded || state.isBursting) return;
    if (state.frames.length >= MAX_FRAMES) {
      toast(t('vf_err_gallery_full'), 'err');
      return;
    }
    try {
      flashShutter();
      var entry = await captureCurrentFrameToEntry();
      state.frames.unshift(entry);
      renderGallery();
      toast(t('vf_captured_ok'), 'ok');
    } catch (err) {
      if (err && err.message === 'GALLERY_FULL') {
        toast(t('vf_err_gallery_full'), 'err');
      } else {
        toast(t('vf_err_capture'), 'err');
      }
    }
  }

  function seekVideoTo(targetSec, token) {
    return new Promise(function (resolve) {
      if (token !== state.burstToken) {
        resolve(false);
        return;
      }
      var dur = Number.isFinite(vfVideo.duration) && vfVideo.duration > 0 ? vfVideo.duration : state.duration;
      var clamped = dur > 0 ? Math.min(Math.max(0, targetSec), Math.max(0, dur - 0.001)) : 0;
      if (Math.abs(vfVideo.currentTime - clamped) < 0.002 && vfVideo.readyState >= 2) {
        resolve(true);
        return;
      }

      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        vfVideo.removeEventListener('seeked', onSeeked);
        resolve(token === state.burstToken);
      }, 4500);

      function onSeeked() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        vfVideo.removeEventListener('seeked', onSeeked);
        resolve(token === state.burstToken);
      }

      vfVideo.addEventListener('seeked', onSeeked);
      try {
        vfVideo.currentTime = clamped;
      } catch (_e) {
        clearTimeout(timer);
        vfVideo.removeEventListener('seeked', onSeeked);
        resolve(false);
      }
    });
  }

  async function runAutoBurst(requestedCount) {
    if (!state.videoLoaded || state.isBursting) return;
    var dur = Number.isFinite(vfVideo.duration) && vfVideo.duration > 0 ? vfVideo.duration : state.duration;
    if (!dur || dur <= 0) {
      toast(t('vf_err_no_duration'), 'err');
      return;
    }
    var room = MAX_FRAMES - state.frames.length;
    if (room <= 0) {
      toast(t('vf_err_gallery_full'), 'err');
      return;
    }

    var count = Math.min(requestedCount, room);
    var token = ++state.burstToken;
    state.isBursting = true;
    try { vfVideo.pause(); } catch (_e) {}
    updatePlayUi();
    updateControlStates();
    updateBurstUi(true, 0, count);

    var capCanvas = document.createElement('canvas');
    var thumbCanvas = document.createElement('canvas');
    var captured = 0;

    try {
      var startT = Math.min(dur * 0.02, 0.25);
      var endT = Math.max(startT, dur * 0.98);
      for (var i = 0; i < count; i++) {
        if (token !== state.burstToken) break;
        var tSec = count === 1 ? startT : startT + ((endT - startT) * i) / (count - 1);
        var okSeek = await seekVideoTo(tSec, token);
        if (!okSeek || token !== state.burstToken) break;

        // Wait one paint frame so decoder presents the seeked texture reliably
        await new Promise(function (r) { requestAnimationFrame(r); });
        if (token !== state.burstToken) break;

        var entry = await captureCurrentFrameToEntry(capCanvas, thumbCanvas);
        state.frames.push(entry);
        captured += 1;
        updateTimeUi();
        updateBurstUi(true, captured, count);
        renderGallery();
      }
      if (token === state.burstToken && captured > 0) {
        toast(t('vf_burst_done').replace('{n}', String(captured)), 'ok');
      }
    } catch (_err) {
      if (token === state.burstToken) {
        toast(t('vf_err_capture'), 'err');
      }
    } finally {
      zeroCanvas(capCanvas);
      zeroCanvas(thumbCanvas);
      if (token === state.burstToken) {
        state.isBursting = false;
        updateBurstUi(false, 0, 0);
        updateControlStates();
      }
    }
  }

  async function decodePngBlobToCanvas(pngBlob, maxDim) {
    var canvas = document.createElement('canvas');
    if (typeof createImageBitmap === 'function') {
      var bitmap = await createImageBitmap(pngBlob);
      try {
        var size = computeBoundedSize(bitmap.width, bitmap.height, maxDim);
        canvas.width = size.width;
        canvas.height = size.height;
        var ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('2D context unavailable');
        ctx.drawImage(bitmap, 0, 0, size.width, size.height);
        return canvas;
      } finally {
        if (typeof bitmap.close === 'function') bitmap.close();
      }
    }

    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(pngBlob);
      var img = new Image();
      img.onload = function () {
        try {
          var size = computeBoundedSize(img.naturalWidth || 1, img.naturalHeight || 1, maxDim);
          canvas.width = size.width;
          canvas.height = size.height;
          var ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) throw new Error('2D context unavailable');
          ctx.drawImage(img, 0, 0, size.width, size.height);
          resolve(canvas);
        } catch (err) {
          zeroCanvas(canvas);
          reject(err);
        } finally {
          try { URL.revokeObjectURL(url); } catch (_e) {}
        }
      };
      img.onerror = function () {
        try { URL.revokeObjectURL(url); } catch (_e) {}
        zeroCanvas(canvas);
        reject(new Error('Image decode error'));
      };
      img.src = url;
    });
  }

  async function exportSingleFrame(frame, format) {
    if (!frame || !frame.pngBlob) return;
    var base = sanitizeFilename(state.baseName);
    var filename = base + '_frame_' + frame.fileTimeTag + '.' + format;

    if (format === 'png') {
      triggerBlobDownload(frame.pngBlob, filename);
      toast(t('vf_dl_ok'), 'ok');
      return;
    }

    var canvas = null;
    try {
      canvas = await decodePngBlobToCanvas(frame.pngBlob, MAX_CANVAS_DIM);
      var mime = format === 'webp' ? 'image/webp' : 'image/jpeg';
      var quality = format === 'webp' ? 0.92 : 0.95;
      var outBlob = await canvasToBlob(canvas, mime, quality);
      triggerBlobDownload(outBlob, filename);
      toast(t('vf_dl_ok'), 'ok');
    } catch (_err) {
      toast(t('vf_err_export'), 'err');
    } finally {
      zeroCanvas(canvas);
    }
  }

  async function sendFrameToThumbnailMaker(frame) {
    if (!frame || !frame.pngBlob) return;
    var canvas = null;
    try {
      canvas = await decodePngBlobToCanvas(frame.pngBlob, HANDOFF_MAX_DIM);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      if (dataUrl.length > 3500000) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      }
      var payload = {
        dataUrl: dataUrl,
        name: sanitizeFilename(state.baseName + '_' + frame.fileTimeTag),
        width: canvas.width,
        height: canvas.height
      };
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
      window.location.href = './thumbnail-maker.html';
    } catch (_err) {
      toast(t('vf_err_handoff'), 'err');
    } finally {
      zeroCanvas(canvas);
    }
  }

  async function downloadAllAsZip() {
    if (state.frames.length === 0 || state.isZipping || state.isBursting) return;
    state.isZipping = true;
    updateControlStates();

    try {
      var zip = new JSZip();
      var base = sanitizeFilename(state.baseName);
      for (var i = 0; i < state.frames.length; i++) {
        var f = state.frames[i];
        if (!f.pngBlob) continue;
        var num = String(i + 1).padStart(2, '0');
        var fname = base + '_frame_' + num + '_' + f.fileTimeTag + '.png';
        zip.file(fname, f.pngBlob);
      }
      var zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE'
      });
      triggerBlobDownload(zipBlob, base + '_frames.zip');
      toast(t('vf_zip_ok'), 'ok');
    } catch (_err) {
      toast(t('vf_err_zip'), 'err');
    } finally {
      state.isZipping = false;
      updateControlStates();
    }
  }

  function renderGallery() {
    if (!vfGalleryGrid || !vfGalleryEmpty) return;
    clearEl(vfGalleryGrid);

    if (state.frames.length === 0) {
      vfGalleryGrid.classList.add('hide');
      vfGalleryEmpty.classList.remove('hide');
      updateControlStates();
      return;
    }

    vfGalleryEmpty.classList.add('hide');
    vfGalleryGrid.classList.remove('hide');

    var frag = document.createDocumentFragment();
    for (var i = 0; i < state.frames.length; i++) {
      (function (frame) {
        var card = document.createElement('article');
        card.className = 'vf-frame-card';
        card.setAttribute('role', 'listitem');

        var media = document.createElement('div');
        media.className = 'vf-frame-media';

        var img = document.createElement('img');
        img.src = frame.thumbUrl;
        img.alt = t('vf_frame_alt') + ' ' + frame.timeLabel;
        img.loading = 'lazy';
        media.appendChild(img);

        var timeBadge = document.createElement('span');
        timeBadge.className = 'vf-frame-time';
        timeBadge.setAttribute('dir', 'ltr');
        timeBadge.textContent = frame.timeLabel;
        media.appendChild(timeBadge);

        var resBadge = document.createElement('span');
        resBadge.className = 'vf-frame-res';
        resBadge.setAttribute('dir', 'ltr');
        resBadge.textContent = frame.width + '×' + frame.height;
        media.appendChild(resBadge);

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'vf-frame-remove';
        removeBtn.setAttribute('aria-label', t('vf_btn_remove'));
        removeBtn.title = t('vf_btn_remove');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', function () {
          removeFrameById(frame.id);
        });
        media.appendChild(removeBtn);

        var body = document.createElement('div');
        body.className = 'vf-frame-body';

        var fmtRow = document.createElement('div');
        fmtRow.className = 'vf-frame-fmt-row';

        var formats = ['png', 'jpg', 'webp'];
        for (var k = 0; k < formats.length; k++) {
          (function (fmt) {
            var dlBtn = document.createElement('button');
            dlBtn.type = 'button';
            dlBtn.className = fmt === 'png'
              ? 'btn btn-primary btn-sm vf-dl-fmt-btn'
              : 'btn btn-secondary btn-sm vf-dl-fmt-btn';
            dlBtn.textContent = fmt.toUpperCase();
            dlBtn.addEventListener('click', function () {
              exportSingleFrame(frame, fmt);
            });
            fmtRow.appendChild(dlBtn);
          })(formats[k]);
        }

        var editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn btn-secondary btn-sm vf-edit-thumb-btn';
        editBtn.textContent = t('vf_btn_edit_thumb');
        editBtn.addEventListener('click', function () {
          sendFrameToThumbnailMaker(frame);
        });

        body.appendChild(fmtRow);
        body.appendChild(editBtn);

        card.appendChild(media);
        card.appendChild(body);
        frag.appendChild(card);
      })(state.frames[i]);
    }

    vfGalleryGrid.appendChild(frag);
    updateControlStates();
  }

  function stepVideoBy(deltaSec) {
    if (!state.videoLoaded || !vfVideo || state.isBursting) return;
    if (!vfVideo.paused) {
      try { vfVideo.pause(); } catch (_e) {}
      updatePlayUi();
    }
    var dur = Number.isFinite(vfVideo.duration) && vfVideo.duration > 0 ? vfVideo.duration : state.duration;
    var next = (vfVideo.currentTime || 0) + deltaSec;
    if (next < 0) next = 0;
    if (dur > 0 && next > dur) next = dur;
    try {
      vfVideo.currentTime = next;
    } catch (_e) {}
    updateTimeUi();
  }

  function togglePlayPause() {
    if (!state.videoLoaded || !vfVideo || state.isBursting) return;
    if (vfVideo.paused || vfVideo.ended) {
      var p = vfVideo.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {});
      }
    } else {
      vfVideo.pause();
    }
  }

  function setPlaybackRate(rate) {
    state.playbackRate = rate;
    if (vfVideo) {
      vfVideo.playbackRate = rate;
      vfVideo.defaultPlaybackRate = rate;
    }
    for (var i = 0; i < speedBtns.length; i++) {
      var r = parseFloat(speedBtns[i].getAttribute('data-vf-speed') || '1');
      speedBtns[i].classList.toggle('is-active', Math.abs(r - rate) < 0.01);
    }
  }

  /* ----- Event Wiring ----- */
  if (btnVfBrowse && vfFileInput) {
    btnVfBrowse.addEventListener('click', function (e) {
      e.stopPropagation();
      vfFileInput.click();
    });
  }

  if (btnVfReplace && vfFileInput) {
    btnVfReplace.addEventListener('click', function () {
      if (state.isBursting) return;
      vfFileInput.click();
    });
  }

  if (btnVfClearVideo) {
    btnVfClearVideo.addEventListener('click', function () {
      unloadVideo();
    });
  }

  if (vfDropzone && vfFileInput) {
    vfDropzone.addEventListener('click', function () {
      vfFileInput.click();
    });
    vfDropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        vfFileInput.click();
      }
    });
    vfDropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      vfDropzone.classList.add('is-dragover');
    });
    vfDropzone.addEventListener('dragleave', function () {
      vfDropzone.classList.remove('is-dragover');
    });
    vfDropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      vfDropzone.classList.remove('is-dragover');
      var files = e.dataTransfer ? e.dataTransfer.files : null;
      if (files && files[0]) loadVideoFile(files[0]);
    });
  }

  if (vfFileInput) {
    vfFileInput.addEventListener('change', function () {
      var file = vfFileInput.files && vfFileInput.files[0];
      if (file) loadVideoFile(file);
    });
  }

  if (vfVideo) {
    vfVideo.addEventListener('click', togglePlayPause);
    vfVideo.addEventListener('play', updatePlayUi);
    vfVideo.addEventListener('pause', updatePlayUi);
    vfVideo.addEventListener('ended', updatePlayUi);
    vfVideo.addEventListener('timeupdate', updateTimeUi);
    vfVideo.addEventListener('seeked', updateTimeUi);
    vfVideo.addEventListener('durationchange', function () {
      if (Number.isFinite(vfVideo.duration) && vfVideo.duration > 0) {
        state.duration = vfVideo.duration;
        if (vfMetaDur) vfMetaDur.textContent = formatTimecode(state.duration);
        updateTimeUi();
        updateControlStates();
      }
    });
  }

  if (vfScrubber) {
    vfScrubber.addEventListener('pointerdown', function () { state.isScrubbing = true; });
    vfScrubber.addEventListener('pointerup', function () { state.isScrubbing = false; });
    vfScrubber.addEventListener('input', function () {
      if (!state.videoLoaded || state.isBursting) return;
      var dur = Number.isFinite(vfVideo.duration) && vfVideo.duration > 0 ? vfVideo.duration : state.duration;
      if (!dur || dur <= 0) return;
      var ratio = parseFloat(vfScrubber.value || '0') / 1000;
      vfScrubber.style.setProperty('--vf-prog', (ratio * 100).toFixed(2) + '%');
      var target = ratio * dur;
      if (vfTcCurrent) vfTcCurrent.textContent = formatTimecode(target);
      try { vfVideo.currentTime = target; } catch (_e) {}
    });
    vfScrubber.addEventListener('change', function () {
      state.isScrubbing = false;
      updateTimeUi();
    });
  }

  if (btnVfStepBack1s) btnVfStepBack1s.addEventListener('click', function () { stepVideoBy(-1); });
  if (btnVfStepBack1f) btnVfStepBack1f.addEventListener('click', function () { stepVideoBy(-FRAME_STEP); });
  if (btnVfPlayPause) btnVfPlayPause.addEventListener('click', togglePlayPause);
  if (btnVfStepFwd1f) btnVfStepFwd1f.addEventListener('click', function () { stepVideoBy(FRAME_STEP); });
  if (btnVfStepFwd1s) btnVfStepFwd1s.addEventListener('click', function () { stepVideoBy(1); });

  for (var si = 0; si < speedBtns.length; si++) {
    speedBtns[si].addEventListener('click', function () {
      var r = parseFloat(this.getAttribute('data-vf-speed') || '1');
      if (Number.isFinite(r) && r > 0) setPlaybackRate(r);
    });
  }

  if (btnVfCapture) btnVfCapture.addEventListener('click', handleCaptureSingle);

  for (var bi = 0; bi < burstBtns.length; bi++) {
    burstBtns[bi].addEventListener('click', function () {
      var cnt = parseInt(this.getAttribute('data-vf-burst') || '5', 10);
      if (Number.isFinite(cnt) && cnt > 0) runAutoBurst(cnt);
    });
  }

  if (btnVfCancelBurst) btnVfCancelBurst.addEventListener('click', cancelBurst);
  if (btnVfDownloadZip) btnVfDownloadZip.addEventListener('click', downloadAllAsZip);
  if (btnVfClearFrames) btnVfClearFrames.addEventListener('click', function () { clearAllFrames(false); });

  /* Global Keyboard Shortcuts */
  document.addEventListener('keydown', function (e) {
    var active = document.activeElement;
    var tag = active && active.tagName ? active.tagName.toLowerCase() : '';
    var inputType = active && active.type ? String(active.type).toLowerCase() : '';
    var isTextEntry = (tag === 'textarea') ||
      (tag === 'input' && inputType !== 'range' && inputType !== 'button' && inputType !== 'submit') ||
      (active && active.isContentEditable);
    if (isTextEntry) return;

    var mod = e.ctrlKey || e.metaKey;
    var lower = e.key ? e.key.toLowerCase() : '';
    var code = e.code || '';

    if (mod && (lower === 's' || code === 'KeyS')) {
      if (state.frames.length > 0 && !state.isBursting) {
        e.preventDefault();
        downloadAllAsZip();
      }
      return;
    }

    if (!state.videoLoaded || state.isBursting) return;

    if (code === 'Space' || e.key === ' ') {
      e.preventDefault();
      togglePlayPause();
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepVideoBy(e.shiftKey ? -1 : -FRAME_STEP);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepVideoBy(e.shiftKey ? 1 : FRAME_STEP);
      return;
    }

    if (!mod && !e.altKey && (lower === 'c' || code === 'KeyC')) {
      e.preventDefault();
      handleCaptureSingle();
      return;
    }

    if (!mod && !e.altKey && e.key === 'Enter') {
      if (tag !== 'button' && tag !== 'a') {
        e.preventDefault();
        handleCaptureSingle();
      }
    }
  });

  document.addEventListener('imgsfix:langchange', function () {
    syncDocumentMeta();
    updatePlayUi();
    if (state.videoLoaded && vfMetaDur && (!state.duration || state.duration <= 0)) {
      vfMetaDur.textContent = t('vf_dur_unknown');
    }
    if (state.isBursting && vfBurstStatusText) {
      vfBurstStatusText.textContent = t('vf_burst_running');
    }
    renderGallery();
  });

  window.addEventListener('beforeunload', function () {
    unloadVideo();
    clearAllFrames(true);
  });

  /* ----- Boot ----- */
  syncDocumentMeta();
  updatePlayUi();
  updateControlStates();
  renderGallery();
})();

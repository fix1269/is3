/* imgsfix — yt-thumbnail.js
   100% client-side YouTube Thumbnail & Cover Grabber:
   - Strict 11-char Video ID validation (/^[a-zA-Z0-9_-]{11}$/) from Watch, youtu.be, Shorts, Live, Embed, or raw IDs
   - Strictly constructs image URLs from https://i.ytimg.com/vi/<VIDEO_ID>/<RES>.jpg (zero arbitrary URL rendering)
   - Probes all 4 official resolutions (MaxRes 1280x720, SD 640x480, HQ 480x360, MQ 320x180)
   - Verified pixel dimension badges, green "Highest Available HD" badge when naturalWidth >= 1200, graceful SD/HQ fallback
   - Direct JPG & PNG export via crossOrigin="anonymous" HTML5 Canvas 2D + immediate URL.revokeObjectURL cleanup
   - Smart cross-tool handoff to pages/tools/thumbnail-maker.html via sessionStorage
   - Local recent history (up to 6 Video IDs in localStorage), zero external dependencies, zero innerHTML
*/
'use strict';

(function () {
  var I = window.imgsfix || {};
  var $ = I.$ || function (s, r) { return (r || document).querySelector(s); };
  var t = I.t || function (k) { return k; };
  var toast = I.toast || function () {};
  var triggerDownload = I.triggerDownload || function () {};

  var YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
  var HISTORY_KEY = 'imgsfix_yt_history_v1';
  var HANDOFF_KEY = 'imgsfix_yt_thumb_handoff';
  var MAX_HISTORY = 6;
  var SAMPLE_URL = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';

  var RES_SPECS = [
    {
      key: 'maxres',
      file: 'maxresdefault.jpg',
      expectedW: 1280,
      expectedH: 720,
      featured: true,
      titleKey: 'yt_res_maxres',
      descKey: 'yt_res_maxres_d'
    },
    {
      key: 'sd',
      file: 'sddefault.jpg',
      expectedW: 640,
      expectedH: 480,
      featured: false,
      titleKey: 'yt_res_sd',
      descKey: 'yt_res_sd_d'
    },
    {
      key: 'hq',
      file: 'hqdefault.jpg',
      expectedW: 480,
      expectedH: 360,
      featured: false,
      titleKey: 'yt_res_hq',
      descKey: 'yt_res_hq_d'
    },
    {
      key: 'mq',
      file: 'mqdefault.jpg',
      expectedW: 320,
      expectedH: 180,
      featured: false,
      titleKey: 'yt_res_mq',
      descKey: 'yt_res_mq_d'
    }
  ];

  var ytForm = $('#ytForm');
  var ytUrlInput = $('#ytUrlInput');
  var btnYtPaste = $('#btnYtPaste');
  var btnYtFetch = $('#btnYtFetch');
  var btnYtSample = $('#btnYtSample');
  var btnYtClear = $('#btnYtClear');
  var btnYtEmptySample = $('#btnYtEmptySample');
  var ytErrorBanner = $('#ytErrorBanner');
  var ytHistoryBar = $('#ytHistoryBar');
  var ytHistoryList = $('#ytHistoryList');
  var btnYtClearHistory = $('#btnYtClearHistory');
  var ytEmptyState = $('#ytEmptyState');
  var ytResultsSection = $('#ytResultsSection');
  var ytVideoIdVal = $('#ytVideoIdVal');
  var ytAvailSummary = $('#ytAvailSummary');
  var btnYtDownloadBest = $('#btnYtDownloadBest');
  var btnYtEditBest = $('#btnYtEditBest');
  var ytFeaturedSlot = $('#ytFeaturedSlot');
  var ytCardsGrid = $('#ytCardsGrid');

  var state = {
    videoId: '',
    fetchSeq: 0,
    results: [],
    history: []
  };

  function isArabicUI() {
    return document.documentElement.getAttribute('lang') === 'ar';
  }

  function syncDocumentMeta() {
    var titlePrefix = t('t_yt_thumb_t');
    if (titlePrefix && titlePrefix !== 't_yt_thumb_t') {
      document.title = titlePrefix + ' — imgsfix';
    }
    var metaDesc = document.querySelector('meta[name="description"]');
    var descVal = t('yt_meta_desc');
    if (metaDesc && descVal && descVal !== 'yt_meta_desc') {
      metaDesc.setAttribute('content', descVal);
    }
  }

  function clearEl(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function sanitizeFilename(raw) {
    var s = String(raw || 'youtube-thumbnail').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return s || 'youtube-thumbnail';
  }

  function buildThumbUrl(videoId, file) {
    if (!YT_ID_RE.test(videoId)) return '';
    return 'https://i.ytimg.com/vi/' + videoId + '/' + file;
  }

  function extractVideoId(rawInput) {
    var val = String(rawInput || '').trim();
    if (!val) return null;
    if (YT_ID_RE.test(val)) return val;

    var candidate = /^https?:\/\//i.test(val) ? val : 'https://' + val;
    var parsed;
    try {
      parsed = new URL(candidate);
    } catch (_e) {
      return null;
    }

    var host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    if (host === 'youtu.be') {
      var shortSeg = parsed.pathname.split('/').filter(Boolean)[0] || '';
      return YT_ID_RE.test(shortSeg) ? shortSeg : null;
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
      var vParam = parsed.searchParams.get('v');
      if (vParam && YT_ID_RE.test(vParam)) return vParam;

      var parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        var prefix = parts[0].toLowerCase();
        if (prefix === 'shorts' || prefix === 'live' || prefix === 'embed' || prefix === 'v') {
          if (YT_ID_RE.test(parts[1])) return parts[1];
        }
      }
    }

    return null;
  }

  function computeAspectLabel(w, h) {
    if (!w || !h) return '16:9';
    var ratio = w / h;
    if (Math.abs(ratio - (16 / 9)) < 0.08) return '16:9';
    if (Math.abs(ratio - (4 / 3)) < 0.08) return '4:3';
    return w + ':' + h;
  }

  function showError(msg) {
    if (!ytErrorBanner) return;
    ytErrorBanner.textContent = msg;
    ytErrorBanner.classList.remove('hide');
  }

  function clearError() {
    if (!ytErrorBanner) return;
    ytErrorBanner.textContent = '';
    ytErrorBanner.classList.add('hide');
  }

  function loadHistoryFromStorage() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (id) {
        return typeof id === 'string' && YT_ID_RE.test(id);
      }).slice(0, MAX_HISTORY);
    } catch (_e) {
      return [];
    }
  }

  function saveHistoryToStorage(list) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
    } catch (_e) {
      /* Ignore storage quota errors cleanly */
    }
  }

  function addToHistory(videoId) {
    if (!YT_ID_RE.test(videoId)) return;
    var next = [videoId];
    for (var i = 0; i < state.history.length; i++) {
      if (state.history[i] !== videoId && next.length < MAX_HISTORY) {
        next.push(state.history[i]);
      }
    }
    state.history = next;
    saveHistoryToStorage(state.history);
    renderHistoryBar();
  }

  function clearHistory() {
    state.history = [];
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (_e) {}
    renderHistoryBar();
    toast(t('yt_hist_cleared'), 'ok');
  }

  function renderHistoryBar() {
    if (!ytHistoryBar || !ytHistoryList) return;
    clearEl(ytHistoryList);
    if (!state.history.length) {
      ytHistoryBar.classList.add('hide');
      return;
    }
    ytHistoryBar.classList.remove('hide');

    for (var i = 0; i < state.history.length; i++) {
      (function (id) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'yt-hist-chip' + (state.videoId === id ? ' active' : '');
        btn.setAttribute('role', 'listitem');

        var thumb = document.createElement('img');
        thumb.className = 'yt-hist-thumb';
        thumb.alt = id;
        thumb.loading = 'lazy';
        thumb.src = buildThumbUrl(id, 'mqdefault.jpg');
        btn.appendChild(thumb);

        var span = document.createElement('span');
        span.className = 'yt-hist-id';
        span.textContent = id;
        btn.appendChild(span);

        btn.addEventListener('click', function () {
          if (ytUrlInput) ytUrlInput.value = 'https://www.youtube.com/watch?v=' + id;
          fetchVideoThumbnails(id);
        });
        ytHistoryList.appendChild(btn);
      })(state.history[i]);
    }
  }

  function probeResolution(videoId, spec) {
    return new Promise(function (resolve) {
      var url = buildThumbUrl(videoId, spec.file);
      var img = new Image();
      img.crossOrigin = 'anonymous';
      var settled = false;

      function finish(ok) {
        if (settled) return;
        settled = true;
        var nw = img.naturalWidth || 0;
        var nh = img.naturalHeight || 0;
        var valid = ok && nw > 120 && nh > 90;
        if (spec.key === 'maxres') {
          valid = ok && nw >= 1200;
        }
        resolve({
          spec: spec,
          videoId: videoId,
          url: url,
          img: valid ? img : null,
          available: valid,
          width: valid ? nw : spec.expectedW,
          height: valid ? nh : spec.expectedH,
          aspect: computeAspectLabel(valid ? nw : spec.expectedW, valid ? nh : spec.expectedH)
        });
      }

      img.onload = function () { finish(true); };
      img.onerror = function () { finish(false); };
      img.src = url;
    });
  }

  function getBestAvailableItem() {
    for (var i = 0; i < state.results.length; i++) {
      if (state.results[i].available && state.results[i].img) {
        return state.results[i];
      }
    }
    return null;
  }

  function renderToCanvas(img, width, height) {
    var c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    return c;
  }

  function exportItemAs(item, format) {
    if (!item || !item.available || !item.img) {
      toast(t('yt_err_unavail'), 'err');
      return;
    }
    var mime = format === 'png' ? 'image/png' : 'image/jpeg';
    var ext = format === 'png' ? 'png' : 'jpg';
    var quality = format === 'png' ? undefined : 0.94;
    var filename = sanitizeFilename('yt-' + item.videoId + '-' + item.spec.key + '-' + item.width + 'x' + item.height) + '.' + ext;

    try {
      var canvas = renderToCanvas(item.img, item.width, item.height);
      canvas.toBlob(function (blob) {
        canvas.width = 0;
        canvas.height = 0;
        if (!blob) {
          toast(t('yt_dl_err'), 'err');
          return;
        }
        if (I.triggerDownload) {
          triggerDownload(blob, filename);
        } else {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () {
            try { URL.revokeObjectURL(url); } catch (_e) {}
          }, 100);
        }
        toast(t('yt_dl_ok'), 'ok');
      }, mime, quality);
    } catch (_err) {
      toast(t('yt_dl_err'), 'err');
    }
  }

  async function copyThumbUrl(url) {
    if (!url) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        var ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast(t('yt_copy_ok'), 'ok');
    } catch (_e) {
      toast(t('yt_copy_err'), 'err');
    }
  }

  function sendToThumbnailMaker(item) {
    if (!item || !item.available || !item.img) {
      toast(t('yt_err_unavail'), 'err');
      return;
    }
    try {
      var canvas = renderToCanvas(item.img, item.width, item.height);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.94);
      canvas.width = 0;
      canvas.height = 0;
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({
        dataUrl: dataUrl,
        name: sanitizeFilename('yt-' + item.videoId + '-' + item.spec.key),
        videoId: item.videoId,
        width: item.width,
        height: item.height
      }));
      window.location.href = './thumbnail-maker.html';
    } catch (_e) {
      toast(t('yt_handoff_err'), 'err');
    }
  }

  function createSvgIcon(paths, size) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    var px = String(size || 16);
    svg.setAttribute('width', px);
    svg.setAttribute('height', px);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < paths.length; i++) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', paths[i]);
      svg.appendChild(p);
    }
    return svg;
  }

  function buildResolutionCard(item, bestItem, isFeaturedSlot) {
    var card = document.createElement('article');
    card.className = 'yt-card' + (isFeaturedSlot ? ' yt-card-featured' : '') + (!item.available ? ' is-unavailable' : '');

    var isHighest = Boolean(bestItem && bestItem.spec.key === item.spec.key);
    var displayItem = item;
    if (isFeaturedSlot && !item.available && bestItem) {
      displayItem = bestItem;
    }

    /* Media Preview Column */
    var mediaWrap = document.createElement('div');
    mediaWrap.className = 'yt-card-media';

    var previewImg = document.createElement('img');
    previewImg.className = 'yt-card-img';
    previewImg.crossOrigin = 'anonymous';
    previewImg.alt = t(item.spec.titleKey) + ' — ' + item.videoId;
    previewImg.src = displayItem.url;
    mediaWrap.appendChild(previewImg);

    var topOverlay = document.createElement('div');
    topOverlay.className = 'yt-media-badges';

    if (isHighest && item.available) {
      var hdBadge = document.createElement('span');
      hdBadge.className = 'yt-badge yt-badge-hd';
      hdBadge.textContent = item.spec.key === 'maxres' ? t('yt_badge_highest') : t('yt_badge_best_fallback');
      topOverlay.appendChild(hdBadge);
    } else if (isFeaturedSlot && !item.available) {
      var fbBadge = document.createElement('span');
      fbBadge.className = 'yt-badge yt-badge-fallback';
      fbBadge.textContent = t('yt_badge_hd_missing');
      topOverlay.appendChild(fbBadge);
    }

    var ratioBadge = document.createElement('span');
    ratioBadge.className = 'yt-badge yt-badge-ratio';
    ratioBadge.textContent = displayItem.aspect;
    topOverlay.appendChild(ratioBadge);

    mediaWrap.appendChild(topOverlay);
    card.appendChild(mediaWrap);

    /* Info & Actions Column */
    var body = document.createElement('div');
    body.className = 'yt-card-body';

    var head = document.createElement('div');
    head.className = 'yt-card-head';

    var title = document.createElement('h3');
    title.className = 'yt-card-title';
    title.textContent = t(item.spec.titleKey);
    head.appendChild(title);

    var dimsBadge = document.createElement('span');
    dimsBadge.className = 'yt-dims-pill';
    dimsBadge.textContent = displayItem.width + ' × ' + displayItem.height + ' px';
    head.appendChild(dimsBadge);

    body.appendChild(head);

    var desc = document.createElement('p');
    desc.className = 'yt-card-desc';
    if (isFeaturedSlot && !item.available) {
      desc.textContent = t('yt_maxres_fallback');
    } else {
      desc.textContent = t(item.spec.descKey);
    }
    body.appendChild(desc);

    var urlRow = document.createElement('div');
    urlRow.className = 'yt-card-url';
    urlRow.textContent = displayItem.url;
    body.appendChild(urlRow);

    var actionItem = isFeaturedSlot && !item.available && bestItem ? bestItem : item;
    var canExport = Boolean(actionItem && actionItem.available && actionItem.img);

    var actions = document.createElement('div');
    actions.className = 'yt-card-actions';

    var dlJpgBtn = document.createElement('button');
    dlJpgBtn.type = 'button';
    dlJpgBtn.className = 'btn btn-primary btn-sm yt-card-btn';
    dlJpgBtn.disabled = !canExport;
    dlJpgBtn.appendChild(createSvgIcon(['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'], 15));
    var jpgLbl = document.createElement('span');
    jpgLbl.textContent = t('yt_btn_dl_jpg');
    dlJpgBtn.appendChild(jpgLbl);
    dlJpgBtn.addEventListener('click', function () {
      exportItemAs(actionItem, 'jpg');
    });
    actions.appendChild(dlJpgBtn);

    var dlPngBtn = document.createElement('button');
    dlPngBtn.type = 'button';
    dlPngBtn.className = 'btn btn-secondary btn-sm yt-card-btn';
    dlPngBtn.disabled = !canExport;
    dlPngBtn.appendChild(createSvgIcon(['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'], 15));
    var pngLbl = document.createElement('span');
    pngLbl.textContent = t('yt_btn_dl_png');
    dlPngBtn.appendChild(pngLbl);
    dlPngBtn.addEventListener('click', function () {
      exportItemAs(actionItem, 'png');
    });
    actions.appendChild(dlPngBtn);

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn btn-secondary btn-sm yt-card-btn';
    copyBtn.disabled = !actionItem || !actionItem.url;
    copyBtn.appendChild(createSvgIcon(['M9 9h13v13H9z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'], 15));
    var copyLbl = document.createElement('span');
    copyLbl.textContent = t('yt_btn_copy_url');
    copyBtn.appendChild(copyLbl);
    copyBtn.addEventListener('click', function () {
      copyThumbUrl(actionItem.url);
    });
    actions.appendChild(copyBtn);

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-secondary btn-sm yt-card-btn yt-btn-studio';
    editBtn.disabled = !canExport;
    editBtn.appendChild(createSvgIcon(['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'], 15));
    var editLbl = document.createElement('span');
    editLbl.textContent = t('yt_btn_edit_maker');
    editBtn.appendChild(editLbl);
    editBtn.addEventListener('click', function () {
      sendToThumbnailMaker(actionItem);
    });
    actions.appendChild(editBtn);

    body.appendChild(actions);
    card.appendChild(body);
    return card;
  }

  function renderResults() {
    if (!state.videoId || !state.results.length) {
      if (ytEmptyState) ytEmptyState.classList.remove('hide');
      if (ytResultsSection) ytResultsSection.classList.add('hide');
      return;
    }

    if (ytEmptyState) ytEmptyState.classList.add('hide');
    if (ytResultsSection) ytResultsSection.classList.remove('hide');
    if (ytVideoIdVal) ytVideoIdVal.textContent = state.videoId;

    var bestItem = getBestAvailableItem();
    var availCount = 0;
    for (var i = 0; i < state.results.length; i++) {
      if (state.results[i].available) availCount++;
    }

    if (ytAvailSummary) {
      if (bestItem) {
        ytAvailSummary.textContent = availCount + '/4 ' + t('yt_avail_lbl') + ' · ' + bestItem.width + ' × ' + bestItem.height + ' px';
      } else {
        ytAvailSummary.textContent = t('yt_none_avail');
      }
    }

    if (btnYtDownloadBest) btnYtDownloadBest.disabled = !bestItem;
    if (btnYtEditBest) btnYtEditBest.disabled = !bestItem;

    clearEl(ytFeaturedSlot);
    clearEl(ytCardsGrid);

    for (var r = 0; r < state.results.length; r++) {
      var item = state.results[r];
      if (item.spec.featured) {
        ytFeaturedSlot.appendChild(buildResolutionCard(item, bestItem, true));
      } else {
        ytCardsGrid.appendChild(buildResolutionCard(item, bestItem, false));
      }
    }
  }

  async function fetchVideoThumbnails(rawIdOrUrl) {
    clearError();
    var id = extractVideoId(rawIdOrUrl);
    if (!id) {
      showError(t('yt_err_invalid'));
      toast(t('yt_err_invalid'), 'err');
      return;
    }

    var seq = ++state.fetchSeq;
    state.videoId = id;
    if (btnYtFetch) btnYtFetch.disabled = true;

    try {
      var probes = RES_SPECS.map(function (spec) {
        return probeResolution(id, spec);
      });
      var settled = await Promise.all(probes);
      if (seq !== state.fetchSeq) return;

      state.results = settled;
      var best = getBestAvailableItem();
      if (!best) {
        showError(t('yt_err_not_found'));
        if (ytEmptyState) ytEmptyState.classList.remove('hide');
        if (ytResultsSection) ytResultsSection.classList.add('hide');
        return;
      }

      addToHistory(id);
      renderResults();
      toast(t('yt_fetch_ok'), 'ok');
    } finally {
      if (seq === state.fetchSeq && btnYtFetch) {
        btnYtFetch.disabled = false;
      }
    }
  }

  function resetAll() {
    clearError();
    state.fetchSeq++;
    state.videoId = '';
    state.results = [];
    if (ytUrlInput) ytUrlInput.value = '';
    renderHistoryBar();
    renderResults();
  }

  /* ----- Event Wiring ----- */
  if (ytForm) {
    ytForm.addEventListener('submit', function (e) {
      e.preventDefault();
      fetchVideoThumbnails(ytUrlInput ? ytUrlInput.value : '');
    });
  }

  if (btnYtPaste) {
    btnYtPaste.addEventListener('click', async function () {
      try {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          toast(t('yt_paste_manual'), 'err');
          if (ytUrlInput) ytUrlInput.focus();
          return;
        }
        var clip = await navigator.clipboard.readText();
        var trimmed = String(clip || '').trim();
        if (!trimmed) {
          toast(t('yt_paste_empty'), 'err');
          return;
        }
        if (ytUrlInput) ytUrlInput.value = trimmed;
        fetchVideoThumbnails(trimmed);
      } catch (_e) {
        toast(t('yt_paste_manual'), 'err');
        if (ytUrlInput) ytUrlInput.focus();
      }
    });
  }

  function handleTrySample() {
    if (ytUrlInput) ytUrlInput.value = SAMPLE_URL;
    fetchVideoThumbnails(SAMPLE_URL);
  }

  if (btnYtSample) btnYtSample.addEventListener('click', handleTrySample);
  if (btnYtEmptySample) btnYtEmptySample.addEventListener('click', handleTrySample);
  if (btnYtClear) btnYtClear.addEventListener('click', resetAll);
  if (btnYtClearHistory) btnYtClearHistory.addEventListener('click', clearHistory);

  if (btnYtDownloadBest) {
    btnYtDownloadBest.addEventListener('click', function () {
      exportItemAs(getBestAvailableItem(), 'jpg');
    });
  }

  if (btnYtEditBest) {
    btnYtEditBest.addEventListener('click', function () {
      sendToThumbnailMaker(getBestAvailableItem());
    });
  }

  /* Global Paste & Keyboard Shortcuts */
  document.addEventListener('paste', function (e) {
    var active = document.activeElement;
    if (active === ytUrlInput) return;
    var tag = active && active.tagName ? active.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || (active && active.isContentEditable)) return;

    var pasted = e.clipboardData ? e.clipboardData.getData('text') : '';
    if (pasted && extractVideoId(pasted)) {
      e.preventDefault();
      if (ytUrlInput) ytUrlInput.value = pasted.trim();
      fetchVideoThumbnails(pasted.trim());
    }
  });

  document.addEventListener('keydown', function (e) {
    var mod = e.ctrlKey || e.metaKey;
    var lower = e.key ? e.key.toLowerCase() : '';
    var code = e.code || '';

    if (mod && (lower === 's' || code === 'KeyS')) {
      var best = getBestAvailableItem();
      if (best) {
        e.preventDefault();
        exportItemAs(best, 'jpg');
      }
    }
  });

  document.addEventListener('imgsfix:langchange', function () {
    syncDocumentMeta();
    renderHistoryBar();
    renderResults();
  });

  /* ----- Boot ----- */
  state.history = loadHistoryFromStorage();
  syncDocumentMeta();
  renderHistoryBar();
})();

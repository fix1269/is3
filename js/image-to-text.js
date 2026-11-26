/* ==========================================================================
   imgsfix — Image to Text (OCR) Studio
   100% Client-Side Vanilla ES Module · Tesseract.js Web Worker · Strict XSS Safety
   ========================================================================== */

import { createWorker, OEM } from 'tesseract.js';

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_CANVAS_DIM = 8192;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/gif'
]);
const ALLOWED_EXT_RE = /\.(jpe?g|png|webp|bmp|gif)$/i;

const WORD_TOKEN_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'()[\]{}،؛]+/gi;
const PHONE_RE = /(?:\+?\d[\d\s().\-]{5,18}\d)/g;
const LIST_LINE_START_RE = /^(?:[-*•●▪◦]|\d+[.)])\s+/;

export function fixBrokenOcrLines(text) {
  if (!text) return '';
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return '';

  const paragraphs = normalized.split(/\n[ \t]*\n+/);
  const rebuilt = [];

  for (let p = 0; p < paragraphs.length; p++) {
    const rawLines = paragraphs[p].split('\n');
    let buffer = '';

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].replace(/[\t \u00A0]+/g, ' ').trim();
      if (!line) continue;

      if (!buffer) {
        buffer = line;
        continue;
      }

      if (LIST_LINE_START_RE.test(line)) {
        buffer += `\n${line}`;
        continue;
      }

      if (/[A-Za-z]-$/.test(buffer) && /^[A-Za-z]/.test(line)) {
        buffer = buffer.slice(0, -1) + line;
      } else if (/[.!?:؛؟]$/.test(buffer) && buffer.length < 52) {
        buffer += `\n${line}`;
      } else {
        buffer += ` ${line}`;
      }
    }

    if (buffer) {
      rebuilt.push(buffer.replace(/[ \t]{2,}/g, ' ').trim());
    }
  }

  return rebuilt.join('\n\n');
}

export function extractContactEntities(text) {
  const safe = typeof text === 'string' ? text : '';
  const emails = [];
  const urls = [];
  const phones = [];

  const emailSeen = new Set();
  for (const m of (safe.match(EMAIL_RE) || [])) {
    const clean = m.trim();
    const key = clean.toLowerCase();
    if (!emailSeen.has(key)) {
      emailSeen.add(key);
      emails.push(clean);
    }
  }

  const urlSeen = new Set();
  for (const m of (safe.match(URL_RE) || [])) {
    const clean = m.replace(/[.,;:!?)\]}'"]+$/, '').trim();
    if (clean && !urlSeen.has(clean.toLowerCase())) {
      urlSeen.add(clean.toLowerCase());
      urls.push(clean);
    }
  }

  const phoneSeen = new Set();
  for (const m of (safe.match(PHONE_RE) || [])) {
    const clean = m.replace(/\s+/g, ' ').trim();
    if (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(clean)) continue; // Ignore dates
    const digits = clean.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) continue;
    if (!phoneSeen.has(digits)) {
      phoneSeen.add(digits);
      phones.push(clean);
    }
  }

  return { emails, phones, urls };
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isArabicMajority(text) {
  const arMatches = text.match(/[\u0600-\u06FF]/g);
  const enMatches = text.match(/[A-Za-z]/g);
  const arCount = arMatches ? arMatches.length : 0;
  const enCount = enMatches ? enMatches.length : 0;
  return arCount > 0 && arCount >= enCount;
}

export function preprocessCanvasForOcr(sourceCanvas) {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  if (!srcW || !srcH) return sourceCanvas;

  // Upscale smaller images (< 1600px max dimension) 2x smoothly for small screenshot fonts and handwriting
  const maxSide = Math.max(srcW, srcH);
  const scale = maxSide < 1600 ? 2 : 1;
  const outW = Math.min(MAX_CANVAS_DIM, Math.max(1, Math.round(srcW * scale)));
  const outH = Math.min(MAX_CANVAS_DIM, Math.max(1, Math.round(srcH * scale)));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, outW, outH);

  const imgData = ctx.getImageData(0, 0, outW, outH);
  const data = imgData.data;
  const pixelCount = outW * outH;
  const lum = new Uint8ClampedArray(pixelCount);
  const hist = new Uint32Array(256);

  // 1. Luminance grayscale conversion (composite alpha over white)
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const a = data[i + 3];
    const bg = 255 - a;
    const r = (data[i] * a + bg * 255) / 255;
    const g = (data[i + 1] * a + bg * 255) / 255;
    const b = (data[i + 2] * a + bg * 255) / 255;
    const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    lum[p] = y;
    hist[y] += 1;
  }

  // 2. Global contrast normalization (2nd to 98th percentile stretch)
  const lowCut = Math.floor(pixelCount * 0.02);
  const highCut = Math.ceil(pixelCount * 0.98);
  let acc = 0;
  let minL = 0;
  let maxL = 255;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= lowCut) {
      minL = i;
      break;
    }
  }
  acc = 0;
  for (let i = 255; i >= 0; i--) {
    acc += hist[i];
    if (acc >= pixelCount - highCut) {
      maxL = i;
      break;
    }
  }
  const span = Math.max(16, maxL - minL);
  const norm = new Uint8ClampedArray(pixelCount);
  for (let p = 0; p < pixelCount; p++) {
    const v = ((lum[p] - minL) * 255) / span;
    norm[p] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
  }

  // 3. Light adaptive thresholding via summed-area table (clean background, crisp ink/handwriting)
  const stride = outW + 1;
  const sat = new Float64Array(stride * (outH + 1));
  for (let y = 0; y < outH; y++) {
    let rowSum = 0;
    const srcRow = y * outW;
    const dstRow = (y + 1) * stride;
    const prevRow = y * stride;
    for (let x = 0; x < outW; x++) {
      rowSum += norm[srcRow + x];
      sat[dstRow + x + 1] = sat[prevRow + x + 1] + rowSum;
    }
  }

  const radius = Math.min(20, Math.max(8, Math.round(Math.min(outW, outH) / 50)));
  const adapted = new Uint8ClampedArray(pixelCount);
  for (let y = 0; y < outH; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(outH - 1, y + radius);
    const topOff = y0 * stride;
    const botOff = (y1 + 1) * stride;
    const rowOff = y * outW;
    const hWin = y1 - y0 + 1;
    for (let x = 0; x < outW; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(outW - 1, x + radius);
      const area = (x1 - x0 + 1) * hWin;
      const sum = sat[botOff + x1 + 1] - sat[topOff + x1 + 1] - sat[botOff + x0] + sat[topOff + x0];
      const localMean = sum / area;
      const px = norm[rowOff + x];

      let v = px;
      if (px < localMean - 7 || px < 85) {
        // Ink / handwriting foreground: deepen smoothly
        v = px * 0.6;
      } else if (px >= localMean - 2) {
        // Paper / screenshot background: lift toward clean white while keeping edges smooth
        v = px + (255 - px) * 0.65;
      }
      adapted[rowOff + x] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
    }
  }

  // 4. Gentle 3x3 sharpening pass to keep small Arabic dots & serif glyphs crisp
  for (let y = 0; y < outH; y++) {
    const rowOff = y * outW;
    const upOff = (y > 0 ? y - 1 : 0) * outW;
    const dnOff = (y < outH - 1 ? y + 1 : outH - 1) * outW;
    for (let x = 0; x < outW; x++) {
      const idx = rowOff + x;
      const center = adapted[idx];
      const left = adapted[rowOff + (x > 0 ? x - 1 : 0)];
      const right = adapted[rowOff + (x < outW - 1 ? x + 1 : outW - 1)];
      const up = adapted[upOff + x];
      const down = adapted[dnOff + x];
      const sharp = center + 0.35 * (4 * center - left - right - up - down);
      const val = sharp < 0 ? 0 : sharp > 255 ? 255 : Math.round(sharp);
      const d = idx * 4;
      data[d] = val;
      data[d + 1] = val;
      data[d + 2] = val;
      data[d + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return outCanvas;
}

function initImageToText() {
  const previewCanvas = document.getElementById('ocrPreviewCanvas');
  const cropOverlay = document.getElementById('ocrCropOverlay');
  const ocrOutput = document.getElementById('ocrOutput');
  if (!previewCanvas || !cropOverlay || !ocrOutput) return;

  const t = (key) => (window.imgsfix && typeof window.imgsfix.t === 'function' ? window.imgsfix.t(key) : key);
  const toast = (msg, type) => {
    if (window.imgsfix && typeof window.imgsfix.toast === 'function') {
      window.imgsfix.toast(msg, type);
    }
  };
  const getLang = () => (window.imgsfix && window.imgsfix.getLang && window.imgsfix.getLang()) || document.documentElement.lang || 'en';

  const fileInput = document.getElementById('fileInput');
  const ocrStage = document.getElementById('ocrStage');
  const ocrDropZone = document.getElementById('ocrDropZone');
  const ocrCanvasWrap = document.getElementById('ocrCanvasWrap');
  const ocrCropHint = document.getElementById('ocrCropHint');
  const imgMetaNote = document.getElementById('imgMetaNote');

  const btnUploadImage = document.getElementById('btnUploadImage');
  const btnBrowseEmpty = document.getElementById('btnBrowseEmpty');
  const btnPasteImage = document.getElementById('btnPasteImage');
  const btnPasteEmpty = document.getElementById('btnPasteEmpty');
  const btnRotateLeft = document.getElementById('btnRotateLeft');
  const btnRotateRight = document.getElementById('btnRotateRight');
  const btnToggleCrop = document.getElementById('btnToggleCrop');
  const btnResetCrop = document.getElementById('btnResetCrop');
  const btnClearImage = document.getElementById('btnClearImage');

  const ocrLangSelect = document.getElementById('ocrLang');
  const optEnhanceOcr = document.getElementById('optEnhanceOcr');
  const btnExtract = document.getElementById('btnExtract');
  const btnCancelOcr = document.getElementById('btnCancelOcr');

  const ocrProgressWrap = document.getElementById('ocrProgressWrap');
  const ocrProgressStatus = document.getElementById('ocrProgressStatus');
  const ocrProgressPct = document.getElementById('ocrProgressPct');
  const ocrProgressBar = document.getElementById('ocrProgressBar');

  const ocrConfidence = document.getElementById('ocrConfidence');
  const outWords = document.getElementById('outWords');
  const outChars = document.getElementById('outChars');

  const btnCopy = document.getElementById('btnCopy');
  const btnListen = document.getElementById('btnListen');
  const btnFixLines = document.getElementById('btnFixLines');
  const btnSendToFormatter = document.getElementById('btnSendToFormatter');
  const btnDownloadTxt = document.getElementById('btnDownloadTxt');
  const btnDownloadDoc = document.getElementById('btnDownloadDoc');
  const btnClearText = document.getElementById('btnClearText');

  const ocrEntitiesBar = document.getElementById('ocrEntitiesBar');
  const ocrEntitiesList = document.getElementById('ocrEntitiesList');

  // Offscreen working canvas stores the current full-resolution (up to 8192px) rotated image
  const workCanvas = document.createElement('canvas');

  const state = {
    hasImage: false,
    cropMode: false,
    cropNorm: null, // { x, y, w, h } normalized [0..1]
    isDragging: false,
    dragStart: null, // { nx, ny }
    processing: false,
    activeJobId: 0,
    activeWorker: null,
    activeObjectUrl: null,
    lastConfidence: null,
    speaking: false,
    speechQueueId: 0
  };

  function revokeActiveObjectUrl() {
    if (state.activeObjectUrl) {
      URL.revokeObjectURL(state.activeObjectUrl);
      state.activeObjectUrl = null;
    }
  }

  function updateOutputState() {
    const text = ocrOutput.value || '';
    const wordsArr = text.match(WORD_TOKEN_RE);
    const wordCount = wordsArr ? wordsArr.length : 0;
    if (outWords) outWords.textContent = String(wordCount);
    if (outChars) outChars.textContent = String(text.length);

    const hasText = text.trim().length > 0;
    btnCopy.disabled = !hasText;
    btnListen.disabled = !hasText;
    btnFixLines.disabled = !hasText;
    if (btnSendToFormatter) btnSendToFormatter.disabled = !hasText;
    btnDownloadTxt.disabled = !hasText;
    btnDownloadDoc.disabled = !hasText;
    btnClearText.disabled = text.length === 0;

    renderEntities(text);
  }

  function renderConfidenceBadge() {
    if (!ocrConfidence) return;
    if (typeof state.lastConfidence !== 'number') {
      ocrConfidence.classList.add('hide');
      ocrConfidence.textContent = '';
      return;
    }
    ocrConfidence.classList.remove('hide');
    ocrConfidence.textContent = `${t('ocr_accuracy')}: ${state.lastConfidence}%`;
  }

  function renderEntities(text) {
    if (!ocrEntitiesBar || !ocrEntitiesList) return;
    while (ocrEntitiesList.firstChild) {
      ocrEntitiesList.removeChild(ocrEntitiesList.firstChild);
    }

    const { emails, phones, urls } = extractContactEntities(text);
    const items = [];
    for (let i = 0; i < emails.length; i++) items.push({ kind: t('ocr_ent_email'), value: emails[i] });
    for (let i = 0; i < phones.length; i++) items.push({ kind: t('ocr_ent_phone'), value: phones[i] });
    for (let i = 0; i < urls.length; i++) items.push({ kind: t('ocr_ent_url'), value: urls[i] });

    if (items.length === 0) {
      ocrEntitiesBar.classList.add('hide');
      return;
    }

    ocrEntitiesBar.classList.remove('hide');
    const frag = document.createDocumentFragment();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ocr-entity-btn';
      chip.setAttribute('aria-label', `${item.kind}: ${item.value}`);

      const kindSpan = document.createElement('span');
      kindSpan.className = 'ocr-entity-kind';
      kindSpan.textContent = item.kind;

      const valSpan = document.createElement('span');
      valSpan.className = 'ocr-entity-val';
      valSpan.setAttribute('dir', 'ltr');
      valSpan.textContent = item.value;

      chip.appendChild(kindSpan);
      chip.appendChild(valSpan);
      chip.addEventListener('click', () => copyStringToClipboard(item.value));
      frag.appendChild(chip);
    }
    ocrEntitiesList.appendChild(frag);
  }

  async function copyStringToClipboard(str) {
    if (!str) return;
    try {
      await navigator.clipboard.writeText(str);
      toast(t('ts_copied_ok'), 'ok');
    } catch (_) {
      const tmp = document.createElement('textarea');
      tmp.value = str;
      tmp.style.position = 'fixed';
      tmp.style.opacity = '0';
      document.body.appendChild(tmp);
      tmp.select();
      try {
        document.execCommand('copy');
        toast(t('ts_copied_ok'), 'ok');
      } catch (_e2) {
        toast(t('ts_copy_err'), 'err');
      }
      document.body.removeChild(tmp);
    }
  }

  function syncCropHint() {
    if (!ocrCropHint) return;
    if (!state.hasImage) {
      ocrCropHint.classList.add('hide');
      ocrCropHint.textContent = '';
      return;
    }

    if (state.cropNorm) {
      const w = Math.max(1, Math.round(state.cropNorm.w * workCanvas.width));
      const h = Math.max(1, Math.round(state.cropNorm.h * workCanvas.height));
      ocrCropHint.textContent = `${t('ocr_crop_selected')}: ${w} × ${h} px`;
      ocrCropHint.classList.remove('hide');
    } else if (state.cropMode) {
      ocrCropHint.textContent = t('ocr_crop_drag_hint');
      ocrCropHint.classList.remove('hide');
    } else {
      ocrCropHint.classList.add('hide');
      ocrCropHint.textContent = '';
    }
  }

  function drawCropOverlay() {
    cropOverlay.width = previewCanvas.width;
    cropOverlay.height = previewCanvas.height;
    const ctx = cropOverlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cropOverlay.width, cropOverlay.height);

    if (!state.cropNorm) return;

    const x = Math.round(state.cropNorm.x * cropOverlay.width);
    const y = Math.round(state.cropNorm.y * cropOverlay.height);
    const w = Math.round(state.cropNorm.w * cropOverlay.width);
    const h = Math.round(state.cropNorm.h * cropOverlay.height);
    if (w < 4 || h < 4) return;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(0, 0, cropOverlay.width, cropOverlay.height);
    ctx.clearRect(x, y, w, h);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = Math.max(2, Math.round(cropOverlay.width / 320));
    ctx.setLineDash([8, 5]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }

  function renderPreviewFromWorkCanvas() {
    if (!workCanvas.width || !workCanvas.height) return;
    previewCanvas.width = workCanvas.width;
    previewCanvas.height = workCanvas.height;
    const ctx = previewCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      ctx.drawImage(workCanvas, 0, 0);
    }
    if (imgMetaNote) {
      imgMetaNote.textContent = `${workCanvas.width} × ${workCanvas.height} px`;
    }
    drawCropOverlay();
    syncCropHint();
  }

  function updateControlsState() {
    const ready = state.hasImage && !state.processing;
    btnRotateLeft.disabled = !ready;
    btnRotateRight.disabled = !ready;
    btnToggleCrop.disabled = !ready;
    btnClearImage.disabled = !ready;
    btnExtract.disabled = !ready;
    btnUploadImage.disabled = state.processing;
    btnPasteImage.disabled = state.processing;

    btnToggleCrop.classList.toggle('active', state.cropMode);
    btnToggleCrop.setAttribute('aria-pressed', state.cropMode ? 'true' : 'false');
    ocrCanvasWrap.classList.toggle('is-cropping', state.cropMode);
    btnResetCrop.classList.toggle('hide', !state.cropNorm);
    btnCancelOcr.classList.toggle('hide', !state.processing);
  }

  function setProgress(pct, statusKeyOrText) {
    if (!ocrProgressWrap) return;
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    ocrProgressWrap.classList.remove('hide');
    if (ocrProgressBar) ocrProgressBar.style.width = `${clamped}%`;
    if (ocrProgressPct) ocrProgressPct.textContent = `${clamped}%`;
    if (ocrProgressStatus) ocrProgressStatus.textContent = statusKeyOrText;
  }

  function hideProgress() {
    if (ocrProgressWrap) ocrProgressWrap.classList.add('hide');
    if (ocrProgressBar) ocrProgressBar.style.width = '0%';
    if (ocrProgressPct) ocrProgressPct.textContent = '0%';
  }

  async function terminateActiveWorker() {
    state.activeJobId += 1;
    const worker = state.activeWorker;
    state.activeWorker = null;
    if (worker) {
      try {
        await worker.terminate();
      } catch (_) {
        // Ignore termination cleanup errors
      }
    }
  }

  function resetImageWorkspace() {
    revokeActiveObjectUrl();
    state.hasImage = false;
    state.cropMode = false;
    state.cropNorm = null;
    state.isDragging = false;
    state.dragStart = null;
    workCanvas.width = 0;
    workCanvas.height = 0;
    previewCanvas.width = 0;
    previewCanvas.height = 0;
    cropOverlay.width = 0;
    cropOverlay.height = 0;
    if (imgMetaNote) imgMetaNote.textContent = '';
    ocrDropZone.classList.remove('hide');
    ocrCanvasWrap.classList.add('hide');
    ocrStage.classList.remove('has-image');
    syncCropHint();
    updateControlsState();
  }

  function isValidImageFile(file) {
    if (!file) return false;
    if (file.size > MAX_FILE_BYTES) {
      toast(t('ocr_err_size'), 'err');
      return false;
    }
    const typeOk = file.type ? ALLOWED_MIME_TYPES.has(file.type.toLowerCase()) : false;
    const extOk = file.name ? ALLOWED_EXT_RE.test(file.name) : false;
    if (!typeOk && !extOk) {
      toast(t('ocr_err_type'), 'err');
      return false;
    }
    return true;
  }

  function loadImageFile(file) {
    if (!isValidImageFile(file)) return;
    revokeActiveObjectUrl();

    const objUrl = URL.createObjectURL(file);
    state.activeObjectUrl = objUrl;

    const img = new Image();
    img.onload = () => {
      if (state.activeObjectUrl === objUrl) {
        URL.revokeObjectURL(objUrl);
        state.activeObjectUrl = null;
      }
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (!nw || !nh) {
        toast(t('ocr_err_decode'), 'err');
        return;
      }

      let w = nw;
      let h = nh;
      if (w > MAX_CANVAS_DIM || h > MAX_CANVAS_DIM) {
        const scale = MAX_CANVAS_DIM / Math.max(w, h);
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
      }

      workCanvas.width = w;
      workCanvas.height = h;
      const ctx = workCanvas.getContext('2d');
      if (!ctx) {
        toast(t('ocr_err_decode'), 'err');
        return;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      state.hasImage = true;
      state.cropNorm = null;
      state.cropMode = false;
      ocrDropZone.classList.add('hide');
      ocrCanvasWrap.classList.remove('hide');
      ocrStage.classList.add('has-image');
      renderPreviewFromWorkCanvas();
      updateControlsState();
      toast(t('ocr_img_loaded'), 'ok');
    };

    img.onerror = () => {
      if (state.activeObjectUrl === objUrl) {
        URL.revokeObjectURL(objUrl);
        state.activeObjectUrl = null;
      }
      toast(t('ocr_err_decode'), 'err');
    };

    img.src = objUrl;
  }

  function rotateWorkingImage(degrees) {
    if (!state.hasImage || state.processing) return;
    const oldW = workCanvas.width;
    const oldH = workCanvas.height;
    if (!oldW || !oldH) return;

    const tmp = document.createElement('canvas');
    tmp.width = oldH;
    tmp.height = oldW;
    const ctx = tmp.getContext('2d');
    if (!ctx) return;

    ctx.translate(tmp.width / 2, tmp.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(workCanvas, -oldW / 2, -oldH / 2);

    workCanvas.width = tmp.width;
    workCanvas.height = tmp.height;
    const wCtx = workCanvas.getContext('2d');
    if (wCtx) {
      wCtx.clearRect(0, 0, workCanvas.width, workCanvas.height);
      wCtx.drawImage(tmp, 0, 0);
    }

    state.cropNorm = null;
    renderPreviewFromWorkCanvas();
    updateControlsState();
  }

  /* ----- Interactive Crop Selection (Pointer Events) ----- */
  function getNormCoords(evt) {
    const rect = cropOverlay.getBoundingClientRect();
    if (!rect.width || !rect.height) return { nx: 0, ny: 0 };
    const nx = Math.max(0, Math.min(1, (evt.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (evt.clientY - rect.top) / rect.height));
    return { nx, ny };
  }

  cropOverlay.addEventListener('pointerdown', (e) => {
    if (!state.cropMode || !state.hasImage || state.processing) return;
    e.preventDefault();
    cropOverlay.setPointerCapture(e.pointerId);
    const { nx, ny } = getNormCoords(e);
    state.isDragging = true;
    state.dragStart = { nx, ny };
    state.cropNorm = { x: nx, y: ny, w: 0, h: 0 };
    drawCropOverlay();
  });

  cropOverlay.addEventListener('pointermove', (e) => {
    if (!state.isDragging || !state.dragStart) return;
    e.preventDefault();
    const { nx, ny } = getNormCoords(e);
    const x = Math.min(state.dragStart.nx, nx);
    const y = Math.min(state.dragStart.ny, ny);
    const w = Math.abs(nx - state.dragStart.nx);
    const h = Math.abs(ny - state.dragStart.ny);
    state.cropNorm = { x, y, w, h };
    drawCropOverlay();
  });

  function finishCropDrag(e) {
    if (!state.isDragging) return;
    state.isDragging = false;
    state.dragStart = null;
    try {
      if (e && e.pointerId !== undefined && cropOverlay.hasPointerCapture(e.pointerId)) {
        cropOverlay.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}

    const rect = cropOverlay.getBoundingClientRect();
    if (!state.cropNorm || (state.cropNorm.w * rect.width) < 12 || (state.cropNorm.h * rect.height) < 12) {
      state.cropNorm = null;
    }
    drawCropOverlay();
    syncCropHint();
    updateControlsState();
  }

  cropOverlay.addEventListener('pointerup', finishCropDrag);
  cropOverlay.addEventListener('pointercancel', finishCropDrag);

  /* ----- OCR Extraction Engine (Tesseract.js Worker) ----- */
  function formatLoggerStatus(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('loading language') || s.includes('traineddata') || s.includes('fetching')) {
      return t('ocr_status_lang');
    }
    if (s.includes('loading tesseract') || s.includes('initializing')) {
      return t('ocr_status_init');
    }
    if (s.includes('recognizing')) {
      return t('ocr_status_recognizing');
    }
    return t('ocr_status_working');
  }

  function buildTargetOcrCanvas() {
    let sx = 0;
    let sy = 0;
    let sw = workCanvas.width;
    let sh = workCanvas.height;

    if (state.cropNorm) {
      sx = Math.max(0, Math.floor(state.cropNorm.x * workCanvas.width));
      sy = Math.max(0, Math.floor(state.cropNorm.y * workCanvas.height));
      sw = Math.max(1, Math.min(workCanvas.width - sx, Math.round(state.cropNorm.w * workCanvas.width)));
      sh = Math.max(1, Math.min(workCanvas.height - sy, Math.round(state.cropNorm.h * workCanvas.height)));
    }

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = sw;
    cropCanvas.height = sh;
    const ctx = cropCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(workCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    }

    if (optEnhanceOcr && optEnhanceOcr.checked) {
      return preprocessCanvasForOcr(cropCanvas);
    }
    return cropCanvas;
  }

  async function runOcrExtraction() {
    if (!state.hasImage || state.processing) return;

    await terminateActiveWorker();
    const jobId = state.activeJobId + 1;
    state.activeJobId = jobId;
    state.processing = true;
    state.lastConfidence = null;
    renderConfidenceBadge();
    updateControlsState();
    setProgress(2, t('ocr_status_init'));

    const lang = (ocrLangSelect && ocrLangSelect.value) || 'ara+eng';
    const ocrCanvas = buildTargetOcrCanvas();

    let worker = null;
    try {
      worker = await createWorker(lang, OEM.LSTM_ONLY, {
        logger: (msg) => {
          if (state.activeJobId !== jobId) return;
          const pct = typeof msg.progress === 'number'
            ? (msg.status === 'recognizing text' ? 25 + msg.progress * 75 : msg.progress * 25)
            : 10;
          setProgress(pct, formatLoggerStatus(msg.status));
        },
        errorHandler: () => {}
      });

      if (state.activeJobId !== jobId) {
        await worker.terminate();
        return;
      }
      state.activeWorker = worker;

      const result = await worker.recognize(ocrCanvas);
      if (state.activeJobId !== jobId) return;

      const extracted = (result && result.data && typeof result.data.text === 'string')
        ? result.data.text.trim()
        : '';
      const conf = (result && result.data && typeof result.data.confidence === 'number')
        ? Math.max(0, Math.min(100, Math.round(result.data.confidence)))
        : null;

      ocrOutput.value = extracted;
      state.lastConfidence = extracted ? conf : null;
      renderConfidenceBadge();
      updateOutputState();
      setProgress(100, t('ocr_status_done'));

      if (extracted) {
        toast(t('ocr_done_ok'), 'ok');
      } else {
        toast(t('ocr_done_empty'), 'err');
      }
    } catch (_) {
      if (state.activeJobId === jobId) {
        toast(t('ocr_err_run'), 'err');
        hideProgress();
      }
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (_) {}
      }
      if (state.activeWorker === worker) {
        state.activeWorker = null;
      }
      if (state.activeJobId === jobId) {
        state.processing = false;
        updateControlsState();
      }
    }
  }

  /* ----- Input Triggers: File Browse, Drag/Drop & Clipboard Paste ----- */
  function openFilePicker() {
    if (state.processing) return;
    fileInput.value = '';
    fileInput.click();
  }

  btnUploadImage.addEventListener('click', openFilePicker);
  btnBrowseEmpty.addEventListener('click', (e) => {
    e.stopPropagation();
    openFilePicker();
  });

  ocrDropZone.addEventListener('click', openFilePicker);
  ocrDropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFilePicker();
    }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (file) loadImageFile(file);
  });

  ['dragenter', 'dragover'].forEach((evtName) => {
    ocrStage.addEventListener(evtName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!state.processing) ocrStage.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((evtName) => {
    ocrStage.addEventListener(evtName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      ocrStage.classList.remove('dragover');
    });
  });

  ocrStage.addEventListener('drop', (e) => {
    if (state.processing) return;
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files[0]) {
      loadImageFile(files[0]);
    }
  });

  async function pasteImageFromClipboard() {
    if (state.processing) return;
    if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') {
      toast(t('ocr_paste_hint'), 'err');
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (let i = 0; i < items.length; i++) {
        const types = items[i].types || [];
        const imgType = types.find((tp) => tp.startsWith('image/'));
        if (imgType) {
          const blob = await items[i].getType(imgType);
          const file = new File([blob], 'clipboard-image.png', { type: imgType });
          loadImageFile(file);
          return;
        }
      }
      toast(t('ocr_paste_empty'), 'err');
    } catch (_) {
      toast(t('ocr_paste_hint'), 'err');
    }
  }

  btnPasteImage.addEventListener('click', pasteImageFromClipboard);
  btnPasteEmpty.addEventListener('click', (e) => {
    e.stopPropagation();
    pasteImageFromClipboard();
  });

  document.addEventListener('paste', (e) => {
    if (state.processing) return;
    const active = document.activeElement;
    if (active === ocrOutput) return; // Keep native text paste working inside output textarea
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          loadImageFile(blob);
        }
        break;
      }
    }
  });

  /* ----- Canvas Tools & OCR Controls ----- */
  btnRotateLeft.addEventListener('click', () => rotateWorkingImage(-90));
  btnRotateRight.addEventListener('click', () => rotateWorkingImage(90));

  btnToggleCrop.addEventListener('click', () => {
    if (!state.hasImage || state.processing) return;
    state.cropMode = !state.cropMode;
    syncCropHint();
    updateControlsState();
  });

  btnResetCrop.addEventListener('click', () => {
    state.cropNorm = null;
    drawCropOverlay();
    syncCropHint();
    updateControlsState();
  });

  btnClearImage.addEventListener('click', async () => {
    await terminateActiveWorker();
    state.processing = false;
    hideProgress();
    resetImageWorkspace();
  });

  btnExtract.addEventListener('click', runOcrExtraction);

  btnCancelOcr.addEventListener('click', async () => {
    await terminateActiveWorker();
    state.processing = false;
    hideProgress();
    updateControlsState();
    toast(t('ocr_cancelled'));
  });

  /* ----- Output Workspace Actions ----- */
  ocrOutput.addEventListener('input', updateOutputState);

  btnCopy.addEventListener('click', () => {
    const val = ocrOutput.value.trim();
    if (val) copyStringToClipboard(ocrOutput.value);
  });

  btnFixLines.addEventListener('click', () => {
    const raw = ocrOutput.value;
    if (!raw.trim()) return;
    ocrOutput.value = fixBrokenOcrLines(raw);
    updateOutputState();
    toast(t('ocr_lines_fixed'), 'ok');
  });

  if (btnSendToFormatter) {
    btnSendToFormatter.addEventListener('click', () => {
      const text = ocrOutput.value;
      if (!text.trim()) return;
      try {
        sessionStorage.setItem('imgsfix_transfer_text', text);
      } catch (_) {
        // Ignore storage quota errors
      }
      const targetUrl = (window.imgsfix && typeof window.imgsfix.link === 'function')
        ? window.imgsfix.link('pages/tools/text-formatter.html')
        : './text-formatter.html';
      window.location.href = targetUrl;
    });
  }

  btnClearText.addEventListener('click', () => {
    stopSpeech();
    ocrOutput.value = '';
    state.lastConfidence = null;
    renderConfidenceBadge();
    updateOutputState();
  });

  /* ----- Web Speech API Playback ----- */
  function updateSpeakButtonUI(isPlaying) {
    state.speaking = isPlaying;
    btnListen.classList.toggle('is-speaking', isPlaying);
    btnListen.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    btnListen.textContent = t(isPlaying ? 'ts_btn_stop' : 'ts_btn_listen');
  }

  function stopSpeech() {
    state.speechQueueId += 1;
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    updateSpeakButtonUI(false);
  }

  function refreshVoices() {
    if (!('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices() || [];
  }

  function ensureVoicesLoaded() {
    if (!('speechSynthesis' in window)) return Promise.resolve([]);
    const current = refreshVoices();
    if (current.length > 0) return Promise.resolve(current);
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve(refreshVoices());
      };
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
      }
      setTimeout(done, 250);
    });
  }

  btnListen.addEventListener('click', async () => {
    if (!('speechSynthesis' in window)) {
      toast(t('ts_tts_unsupported'), 'err');
      return;
    }
    if (state.speaking) {
      stopSpeech();
      return;
    }

    const text = ocrOutput.value.trim();
    if (!text) return;

    stopSpeech();
    const queueId = state.speechQueueId;
    const isAr = isArabicMajority(text);
    const voices = await ensureVoicesLoaded();
    if (queueId !== state.speechQueueId) return;

    const prefix = isAr ? 'ar' : 'en';
    const voice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix)) || null;
    if (isAr && !voice) {
      toast(t('ts_no_ar_voice'), 'err');
      return;
    }

    const targetLang = isAr ? ((voice && voice.lang) || 'ar-SA') : ((voice && voice.lang) || 'en-US');
    const chunks = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (!chunks.length) return;

    updateSpeakButtonUI(true);
    let idx = 0;

    const speakNext = () => {
      if (queueId !== state.speechQueueId) return;
      if (idx >= chunks.length) {
        updateSpeakButtonUI(false);
        return;
      }
      const utter = new SpeechSynthesisUtterance(chunks[idx]);
      utter.lang = targetLang;
      if (voice) utter.voice = voice;
      utter.rate = 1.0;
      utter.onend = () => {
        idx += 1;
        speakNext();
      };
      utter.onerror = () => {
        if (queueId === state.speechQueueId) updateSpeakButtonUI(false);
      };
      window.speechSynthesis.speak(utter);
    };

    speakNext();
  });

  /* ----- Export Downloads (.txt and Word .doc) ----- */
  function triggerFileDownload(blob, filename) {
    if (window.imgsfix && typeof window.imgsfix.triggerDownload === 'function') {
      window.imgsfix.triggerDownload(blob, filename);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  btnDownloadTxt.addEventListener('click', () => {
    const text = ocrOutput.value;
    if (!text.trim()) return;
    const blob = new Blob([`\uFEFF${text}`], { type: 'text/plain;charset=utf-8' });
    triggerFileDownload(blob, 'imgsfix-ocr-text.txt');
    toast(t('ocr_dl_txt_ok'), 'ok');
  });

  btnDownloadDoc.addEventListener('click', () => {
    const text = ocrOutput.value.trim();
    if (!text) return;

    const isRtl = isArabicMajority(text) || getLang() === 'ar';
    const dir = isRtl ? 'rtl' : 'ltr';
    const title = t('t_ocr_t');
    const dateStr = new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US');

    const lines = text.split(/\n/);
    const bodyHtml = lines
      .map((line) => (line.trim() === ''
        ? '<p style="margin:0 0 8pt;">&nbsp;</p>'
        : `<p style="margin:0 0 8pt;line-height:1.7;">${escapeHtml(line)}</p>`))
      .join('');

    const docHtml = `\uFEFF<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Cairo, Arial, sans-serif; color: #111827; direction: ${dir}; text-align: ${isRtl ? 'right' : 'left'}; margin: 28pt; }
    h1 { color: #0c3bb8; font-size: 18pt; margin-bottom: 6pt; }
    .meta { color: #4b5563; font-size: 10pt; margin-bottom: 16pt; border-bottom: 1pt solid #e5e7eb; padding-bottom: 8pt; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(dateStr)}</div>
  ${bodyHtml}
</body>
</html>`;

    const blob = new Blob([docHtml], { type: 'application/msword;charset=utf-8' });
    triggerFileDownload(blob, 'imgsfix-ocr-document.doc');
    toast(t('ocr_dl_doc_ok'), 'ok');
  });

  document.addEventListener('imgsfix:langchange', () => {
    renderConfidenceBadge();
    syncCropHint();
    renderEntities(ocrOutput.value);
    btnListen.textContent = t(state.speaking ? 'ts_btn_stop' : 'ts_btn_listen');
  });

  window.addEventListener('beforeunload', () => {
    stopSpeech();
    revokeActiveObjectUrl();
    terminateActiveWorker();
  });

  updateControlsState();
  updateOutputState();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageToText);
  } else {
    initImageToText();
  }
}

/* ==========================================================================
   imgsfix — Text Formatter & Cleaner
   100% Client-Side Vanilla ES Module · Instant < 15ms · Strict XSS Safety
   ========================================================================== */

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_TEXT_CHARS = 500000;
const MAX_UNDO_HISTORY = 50;

const WORD_TOKEN_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
const AR_TASHKEEL_RE = /[\u064B-\u065F\u0670\u0640]/g;
const EMAIL_EXTRACT_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const URL_EXTRACT_RE = /(?:https?:\/\/|www\.)[^\s<>"'()[\]{}،؛]+/gi;
const LIST_LINE_START_RE = /^(?:[-*•●▪◦]|\d+[.)])\s+/;

export function countBasicStats(text) {
  const safe = typeof text === 'string' ? text : '';
  const chars = safe.length;
  const wordsArr = safe.match(WORD_TOKEN_RE);
  const words = wordsArr ? wordsArr.length : 0;
  const lines = safe === '' ? 0 : safe.replace(/\r\n?/g, '\n').split('\n').length;
  return { chars, words, lines };
}

export function fixPdfLineBreaks(text) {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return '';

  // Split by blank lines (real paragraph breaks)
  const rawParagraphs = normalized.split(/\n[ \t]*\n+/);
  const rebuilt = [];

  for (let p = 0; p < rawParagraphs.length; p++) {
    const rawLines = rawParagraphs[p].split('\n');
    let buffer = '';

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;

      if (!buffer) {
        buffer = line;
        continue;
      }

      // Preserve list bullets or numbered items on their own lines
      if (LIST_LINE_START_RE.test(line)) {
        buffer += `\n${line}`;
        continue;
      }

      // Join English hyphenated word splits across wrapped lines (e.g. "inter-\nnational")
      if (/[A-Za-z]-$/.test(buffer) && /^[A-Za-z]/.test(line)) {
        buffer = buffer.slice(0, -1) + line;
      } else {
        buffer += ` ${line}`;
      }
    }

    if (buffer) {
      rebuilt.push(buffer.replace(/[ \t]{2,}/g, ' '));
    }
  }

  return rebuilt.join('\n\n');
}

export function removeExtraSpaces(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t \u00A0]+/g, ' ').trim())
    .join('\n');
}

export function removeEmptyLines(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n');
}

export function removeDuplicateLines(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const seen = new Set();
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = line.trim();
    if (key === '') {
      if (!seen.has('')) {
        seen.add('');
        out.push('');
      }
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      out.push(line);
    }
  }
  return out.join('\n');
}

export function removeArabicDiacritics(text) {
  return text.replace(AR_TASHKEEL_RE, '');
}

export function stripHtmlTagsSafe(text) {
  if (!text) return '';
  if (typeof DOMParser === 'undefined') {
    return text.replace(/<[^>]*>/g, '');
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  const body = doc.body;
  if (!body) return '';

  // Remove non-visible executable/style nodes on the inert parsed document
  const hidden = body.querySelectorAll('script, style, noscript');
  for (let i = 0; i < hidden.length; i++) {
    hidden[i].remove();
  }

  const blockTags = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DIV', 'DL', 'DT',
    'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3',
    'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE',
    'SECTION', 'TABLE', 'TR', 'UL'
  ]);

  const chunks = [];
  function walk(node) {
    if (node.nodeType === 3) {
      chunks.push(node.nodeValue || '');
      return;
    }
    if (node.nodeType !== 1) return;

    const tag = node.nodeName;
    if (tag === 'BR') {
      chunks.push('\n');
      return;
    }

    const isBlock = blockTags.has(tag);
    if (isBlock && chunks.length > 0) {
      chunks.push('\n');
    }
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      walk(children[i]);
    }
    if (isBlock) {
      chunks.push('\n');
    } else if (tag === 'TD' || tag === 'TH') {
      chunks.push(' ');
    }
  }

  walk(body);

  return chunks
    .join('')
    .replace(/[ \t\u00A0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const LINE_COLLATOR = typeof Intl !== 'undefined' && Intl.Collator
  ? new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
  : null;

export function sortLinesAsc(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const nonEmpty = lines.filter((l) => l.trim() !== '');
  if (LINE_COLLATOR) {
    nonEmpty.sort(LINE_COLLATOR.compare);
  } else {
    nonEmpty.sort();
  }
  return nonEmpty.join('\n');
}

export function reverseLines(text) {
  return text.replace(/\r\n?/g, '\n').split('\n').reverse().join('\n');
}

export function addLineNumbers(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines.map((line, idx) => `${idx + 1}. ${line.replace(/^\d+\.\s+/, '')}`).join('\n');
}

export function toTitleCase(text) {
  return text
    .toLowerCase()
    .replace(/(^|[\s\-/(\["'“‘])([a-z])/g, (_, sep, ch) => `${sep}${ch.toUpperCase()}`);
}

export function toSentenceCase(text) {
  return text
    .toLowerCase()
    .replace(/(^\s*|[.!?]\s+|\n+\s*)([a-z])/g, (_, lead, ch) => `${lead}${ch.toUpperCase()}`);
}

export function extractEmails(text) {
  const matches = text.match(EMAIL_EXTRACT_RE) || [];
  const seen = new Set();
  const out = [];
  for (let i = 0; i < matches.length; i++) {
    const clean = matches[i].trim();
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  }
  return out;
}

export function extractUrls(text) {
  const matches = text.match(URL_EXTRACT_RE) || [];
  const seen = new Set();
  const out = [];
  for (let i = 0; i < matches.length; i++) {
    const clean = matches[i].replace(/[.,;:!?)\]}'"]+$/, '').trim();
    if (!clean) continue;
    if (!seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out;
}

function getLang() {
  return (window.imgsfix && window.imgsfix.getLang && window.imgsfix.getLang()) ||
    document.documentElement.lang || 'en';
}

function t(key) {
  return (window.imgsfix && window.imgsfix.t) ? window.imgsfix.t(key) : key;
}

function toast(msg, type) {
  if (window.imgsfix && window.imgsfix.toast) {
    window.imgsfix.toast(msg, type);
  }
}

function initTextFormatter() {
  const editorEl = document.getElementById('textEditor');
  if (!editorEl) return;

  const $ = (sel) => document.querySelector(sel);
  const btnUndo = $('#btnUndo');
  const btnCopy = $('#btnCopy');
  const btnPaste = $('#btnPaste');
  const btnSample = $('#btnSample');
  const btnUpload = $('#btnUpload');
  const btnSelectAll = $('#btnSelectAll');
  const btnDownloadTxt = $('#btnDownloadTxt');
  const btnClear = $('#btnClear');
  const fileInput = $('#fileInput');

  const statChars = $('#statChars');
  const statWords = $('#statWords');
  const statLines = $('#statLines');
  const statBeforeText = $('#statBeforeText');
  const statAfterText = $('#statAfterText');
  const actionButtons = Array.from(document.querySelectorAll('#actionDeck [data-action]'));

  const undoStack = [];
  let baselineStats = countBasicStats('');

  function formatNumber(n) {
    return n.toLocaleString('en-US');
  }

  function formatCompact(s) {
    return `${formatNumber(s.chars)} · ${formatNumber(s.words)} · ${formatNumber(s.lines)}`;
  }

  function updateStatsUI(resetBaseline) {
    let val = editorEl.value;
    if (val.length > MAX_TEXT_CHARS) {
      val = val.slice(0, MAX_TEXT_CHARS);
      editorEl.value = val;
      toast(t('ts_text_too_long'), 'err');
    }

    const current = countBasicStats(val);
    if (resetBaseline) {
      baselineStats = current;
    }

    statChars.textContent = formatNumber(current.chars);
    statWords.textContent = formatNumber(current.words);
    statLines.textContent = formatNumber(current.lines);
    statBeforeText.textContent = formatCompact(baselineStats);
    statAfterText.textContent = formatCompact(current);
    btnUndo.disabled = undoStack.length === 0;
  }

  function pushUndoSnapshot(textSnapshot) {
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === textSnapshot) {
      return;
    }
    undoStack.push(textSnapshot);
    if (undoStack.length > MAX_UNDO_HISTORY) {
      undoStack.shift();
    }
  }

  function applyTransform(action) {
    const current = editorEl.value;
    if (!current.trim()) {
      toast(t('ts_enter_text_first'), 'err');
      editorEl.focus();
      return;
    }

    let next = current;
    let feedbackKey = 'tf_applied_ok';

    switch (action) {
      case 'fix-pdf':
        next = fixPdfLineBreaks(current);
        break;
      case 'clean-spaces':
        next = removeExtraSpaces(current);
        break;
      case 'remove-empty':
        next = removeEmptyLines(current);
        break;
      case 'dedupe-lines':
        next = removeDuplicateLines(current);
        break;
      case 'remove-tashkeel':
        next = removeArabicDiacritics(current);
        break;
      case 'strip-html':
        next = stripHtmlTagsSafe(current);
        break;
      case 'sort-asc':
        next = sortLinesAsc(current);
        break;
      case 'reverse-lines':
        next = reverseLines(current);
        break;
      case 'number-lines':
        next = addLineNumbers(current);
        break;
      case 'case-upper':
        next = current.toUpperCase();
        break;
      case 'case-lower':
        next = current.toLowerCase();
        break;
      case 'case-title':
        next = toTitleCase(current);
        break;
      case 'case-sentence':
        next = toSentenceCase(current);
        break;
      case 'extract-emails': {
        const list = extractEmails(current);
        if (list.length === 0) {
          toast(t('tf_no_emails'), 'err');
          return;
        }
        next = list.join('\n');
        feedbackKey = 'tf_extracted_ok';
        break;
      }
      case 'extract-urls': {
        const list = extractUrls(current);
        if (list.length === 0) {
          toast(t('tf_no_urls'), 'err');
          return;
        }
        next = list.join('\n');
        feedbackKey = 'tf_extracted_ok';
        break;
      }
      default:
        return;
    }

    if (next === current) {
      toast(t('tf_no_changes'));
      return;
    }

    pushUndoSnapshot(current);
    editorEl.value = next;
    updateStatsUI(false);
    toast(t(feedbackKey), 'ok');
  }

  editorEl.addEventListener('input', () => {
    updateStatsUI(true);
  });

  actionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyTransform(btn.dataset.action);
    });
  });

  btnUndo.addEventListener('click', () => {
    if (undoStack.length === 0) return;
    const prev = undoStack.pop();
    editorEl.value = prev;
    updateStatsUI(false);
    toast(t('tf_undone_ok'));
    editorEl.focus();
  });

  btnCopy.addEventListener('click', async () => {
    const val = editorEl.value;
    if (!val) {
      toast(t('ts_enter_text_first'), 'err');
      return;
    }
    try {
      await navigator.clipboard.writeText(val);
      toast(t('wc_copied_text_ok'), 'ok');
    } catch (_) {
      editorEl.focus();
      editorEl.select();
      const ok = document.execCommand && document.execCommand('copy');
      toast(ok ? t('wc_copied_text_ok') : t('ts_copy_err'), ok ? 'ok' : 'err');
    }
  });

  btnPaste.addEventListener('click', async () => {
    if (editorEl.value) {
      pushUndoSnapshot(editorEl.value);
    }
    editorEl.value = '';
    updateStatsUI(true);

    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        const clip = await navigator.clipboard.readText();
        if (!clip || !clip.trim()) {
          toast(t('ts_clipboard_empty'), 'err');
          editorEl.focus();
          return;
        }
        editorEl.value = clip.slice(0, MAX_TEXT_CHARS);
        updateStatsUI(true);
        toast(t('ts_pasted_ok'), 'ok');
        return;
      } catch (_) {
        // Fallback when browser denies programmatic clipboard read
      }
    }
    editorEl.focus();
    toast(t('ts_paste_fallback'));
  });

  btnSample.addEventListener('click', () => {
    if (editorEl.value) {
      pushUndoSnapshot(editorEl.value);
    }
    const lang = getLang();
    if (lang === 'ar') {
      editorEl.value =
        'مَرْحَباً   بِكُمْ   فِي   أَدَاةِ   تَنْسِيقِ   وَتَنْظِيفِ   النُّصُوصِ!\n' +
        'مَرْحَباً   بِكُمْ   فِي   أَدَاةِ   تَنْسِيقِ   وَتَنْظِيفِ   النُّصُوصِ!\n\n' +
        'هذا   نَصٌّ  تَجْرِيبِيٌّ   مَقْطُوعُ\n' +
        'الأسْطُرِ   مِنْ   مَلَفِّ\n' +
        'PDF   مَعَ   مَسَافَاتٍ   زَائِدَةٍ.\n\n' +
        'للتواصل:   support@imgsfix.com   أو   sales@example.org\n' +
        'الموقع: https://imgsfix.com/tools و https://example.com/docs';
    } else {
      editorEl.value =
        'Welcome   to   the   imgsfix   Text\n' +
        'Formatter   and   Cleaner   workspace!\n' +
        'Welcome   to   the   imgsfix   Text\n' +
        'Formatter   and   Cleaner   workspace!\n\n' +
        'this  paragraph  has   broken  mid-sentence\n' +
        'line wraps  copied  from a PDF\n' +
        'document,  plus  inconsistent  CASE.\n\n' +
        'Contact us at support@imgsfix.com or team@example.org\n' +
        'Visit https://imgsfix.com/guide and https://example.com/blog for details.';
    }
    updateStatsUI(true);
    editorEl.focus();
  });

  btnUpload.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.txt') && !lower.endsWith('.md')) {
      toast(t('wc_file_type_err'), 'err');
      fileInput.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast(t('ts_file_size_err'), 'err');
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      if (!content.trim()) {
        toast(t('ts_file_empty_err'), 'err');
        return;
      }
      if (editorEl.value) {
        pushUndoSnapshot(editorEl.value);
      }
      editorEl.value = content.slice(0, MAX_TEXT_CHARS);
      updateStatsUI(true);
      toast(t('ts_file_loaded_ok'), 'ok');
    };
    reader.onerror = () => {
      toast(t('ts_file_read_err'), 'err');
    };
    reader.readAsText(file, 'UTF-8');
  });

  btnSelectAll.addEventListener('click', () => {
    editorEl.focus();
    editorEl.select();
  });

  btnDownloadTxt.addEventListener('click', () => {
    const content = editorEl.value;
    if (!content.trim()) {
      toast(t('ts_enter_text_first'), 'err');
      return;
    }
    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
    const stamp = new Date().toISOString().slice(0, 10);
    if (window.imgsfix && window.imgsfix.triggerDownload) {
      window.imgsfix.triggerDownload(blob, `formatted_text_${stamp}_imgsfix.txt`);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formatted_text_${stamp}_imgsfix.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    toast(t('tc_done'), 'ok');
  });

  btnClear.addEventListener('click', () => {
    if (editorEl.value) {
      pushUndoSnapshot(editorEl.value);
    }
    editorEl.value = '';
    fileInput.value = '';
    updateStatsUI(true);
    editorEl.focus();
  });

  try {
    const transferred = sessionStorage.getItem('imgsfix_transfer_text');
    if (transferred) {
      editorEl.value = transferred.slice(0, MAX_TEXT_CHARS);
      sessionStorage.removeItem('imgsfix_transfer_text');
    }
  } catch (_) {
    // Ignore storage access errors
  }

  updateStatsUI(true);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTextFormatter);
  } else {
    initTextFormatter();
  }
}

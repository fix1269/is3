/* ==========================================================================
   imgsfix — Word, Character & Reading Time Counter + SEO Keyword Analyzer
   100% Client-Side Vanilla ES Module · Instant < 15ms Analysis · Strict XSS Safety
   ========================================================================== */

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_TEXT_CHARS = 500000;
const WPM_READING = 200;
const WPM_SPEAKING = 130;
const TOP_KEYWORD_LIMIT = 10;

const LIMITS = [
  { key: 'meta', limit: 160, labelKey: 'wc_limit_meta', countId: '#limitCountMeta', statusId: '#limitStatusMeta', fillId: '#limitFillMeta' },
  { key: 'twitter', limit: 280, labelKey: 'wc_limit_x', countId: '#limitCountX', statusId: '#limitStatusX', fillId: '#limitFillX' },
  { key: 'instagram', limit: 2200, labelKey: 'wc_limit_ig', countId: '#limitCountIg', statusId: '#limitStatusIg', fillId: '#limitFillIg' }
];

const EN_STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'cannot', 'could', 'couldn',
  'did', 'didn', 'do', 'does', 'doesn', 'doing', 'don', 'down', 'during',
  'each', 'few', 'for', 'from', 'further',
  'had', 'hadn', 'has', 'hasn', 'have', 'haven', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'isn', 'it', 'its', 'itself',
  'just', 'let', 'll', 'me', 'more', 'most', 'mustn', 'my', 'myself',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  're', 'same', 'shan', 'she', 'should', 'shouldn', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 've', 'very', 'was', 'wasn', 'we', 'were', 'weren', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'won', 'would', 'wouldn',
  'you', 'your', 'yours', 'yourself', 'yourselves', 'also', 'many', 'much', 'via', 'per', 'etc'
]);

const AR_STOP_WORDS_RAW = [
  'في', 'من', 'على', 'إلى', 'عن', 'مع', 'بين', 'حتى', 'منذ', 'خلال', 'عبر', 'نحو', 'ضد', 'تحت', 'فوق', 'أمام', 'خلف', 'حول', 'عند', 'لدى',
  'هذا', 'هذه', 'هؤلاء', 'ذلك', 'تلك', 'أولئك', 'هنا', 'هناك',
  'الذي', 'التي', 'الذين', 'اللاتي', 'اللواتي', 'اللذان', 'اللتان', 'ما', 'من', 'أي',
  'هو', 'هي', 'هم', 'هن', 'هما', 'أنا', 'نحن', 'أنت', 'أنتِ', 'أنتم', 'أنتن', 'أنتما',
  'كان', 'كانت', 'كانوا', 'يكون', 'تكون', 'أصبح', 'أمسى', 'ظل', 'صار', 'ليس', 'ليست',
  'إن', 'أن', 'لعل', 'ليت', 'لكن', 'كأن', 'بأن', 'لأن', 'إذ', 'إذا', 'لو', 'لولا',
  'و', 'أو', 'ثم', 'بل', 'لا', 'لم', 'لن', 'قد', 'سوف', 'هل', 'كيف', 'أين', 'متى', 'لماذا', 'كم',
  'كل', 'بعض', 'جميع', 'معظم', 'غير', 'سوى', 'مثل', 'كما', 'أيضاً', 'أيضا', 'جداً', 'جدا', 'فقط', 'بعد', 'قبل', 'أكثر', 'أقل', 'عليه', 'عليها', 'عليهم', 'منه', 'منها', 'منهم', 'له', 'لها', 'لهم', 'فيه', 'فيها', 'فيهم', 'بها', 'به', 'بهم'
];

const AR_DIACRITICS_RE = /[\u064B-\u065F\u0670\u0640]/g;
const ARABIC_CHAR_RE = /[\u0600-\u06FF]/;
const WORD_TOKEN_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
const STREAM_TOKEN_RE = /([\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*)|([.!?؟،,;:\n\r()[\]{}"«»]+)/gu;
const WHITESPACE_GLOBAL_RE = /\s+/g;
const ALPHA_NUM_RE = /[\p{L}\p{N}]/u;
const DECIMAL_DOT_RE = /(\d)\.(\d)/g;

function normalizeArabic(word) {
  return word
    .replace(AR_DIACRITICS_RE, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

const AR_STOP_WORDS = new Set(AR_STOP_WORDS_RAW.map((w) => normalizeArabic(w)));

function normalizeTermKey(token, isAr) {
  if (isAr) return normalizeArabic(token);
  return token.toLowerCase().replace(/^['’\-]+|['’\-]+$/g, '');
}

function isStopWord(normKey, isArabic) {
  if (!normKey || normKey.length <= 1) return true;
  if (/^\d+$/.test(normKey)) return true;
  if (isArabic) {
    if (AR_STOP_WORDS.has(normKey)) return true;
    if (normKey.length > 2 && 'وفبكل'.includes(normKey[0]) && AR_STOP_WORDS.has(normKey.slice(1))) {
      return true;
    }
    return false;
  }
  return EN_STOP_WORDS.has(normKey);
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

function formatDuration(words, wpm) {
  const lang = getLang();
  if (!words || words <= 0) {
    return lang === 'ar' ? '0 ث' : '0s';
  }
  const totalSeconds = Math.max(1, Math.round((words / wpm) * 60));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  if (lang === 'ar') {
    if (mins === 0) return `${secs} ث`;
    if (secs === 0) return `${mins} د`;
    return `${mins} د ${secs} ث`;
  }
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

function countSentences(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const safe = trimmed
    .replace(DECIMAL_DOT_RE, '$1\u0000$2')
    .replace(/\b(e\.g|i\.e|vs|Mr|Mrs|Ms|Dr|Prof|Jr|Sr|Inc|Ltd|etc)\./gi, '$1\u0001');

  const parts = safe.split(/[.!?؟]+\s+|\n+/);
  let count = 0;
  for (let i = 0; i < parts.length; i++) {
    if (ALPHA_NUM_RE.test(parts[i])) {
      count += 1;
    }
  }
  return count;
}

function countParagraphs(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const blocks = trimmed.split(/\n+/);
  let count = 0;
  for (let i = 0; i < blocks.length; i++) {
    if (ALPHA_NUM_RE.test(blocks[i])) {
      count += 1;
    }
  }
  return count;
}

export function analyzeText(text, ngramSize = 1) {
  const safeText = typeof text === 'string' ? text : '';
  const charsWithSpaces = safeText.length;
  if (!charsWithSpaces || !safeText.trim()) {
    return {
      words: 0,
      charsWithSpaces,
      charsNoSpaces: safeText.replace(WHITESPACE_GLOBAL_RE, '').length,
      sentences: 0,
      paragraphs: 0,
      keywords: []
    };
  }

  const charsNoSpaces = safeText.replace(WHITESPACE_GLOBAL_RE, '').length;
  const sentences = countSentences(safeText);
  const paragraphs = countParagraphs(safeText);

  const tokenCache = new Map();
  function resolveToken(raw) {
    let cached = tokenCache.get(raw);
    if (cached !== undefined) return cached;
    const isAr = ARABIC_CHAR_RE.test(raw);
    const norm = normalizeTermKey(raw, isAr);
    if (isStopWord(norm, isAr)) {
      cached = null;
    } else {
      cached = {
        norm,
        display: isAr ? raw.replace(AR_DIACRITICS_RE, '') : raw.toLowerCase(),
        isAr
      };
    }
    tokenCache.set(raw, cached);
    return cached;
  }

  const counts = new Map();
  const displayForms = new Map();
  let words = 0;

  if (ngramSize === 1) {
    WORD_TOKEN_RE.lastIndex = 0;
    let m;
    while ((m = WORD_TOKEN_RE.exec(safeText)) !== null) {
      words += 1;
      const info = resolveToken(m[0]);
      if (!info) continue;
      counts.set(info.norm, (counts.get(info.norm) || 0) + 1);
      if (!displayForms.has(info.norm)) {
        displayForms.set(info.norm, info.display);
      }
    }
  } else {
    STREAM_TOKEN_RE.lastIndex = 0;
    let prev = null;
    let prevEnd = 0;
    let m;
    while ((m = STREAM_TOKEN_RE.exec(safeText)) !== null) {
      if (m[1]) {
        words += 1;
        const info = resolveToken(m[1]);
        if (info && prev && prev.isAr === info.isAr && m.index >= prevEnd) {
          const biKey = `${prev.norm} ${info.norm}`;
          counts.set(biKey, (counts.get(biKey) || 0) + 1);
          if (!displayForms.has(biKey)) {
            displayForms.set(biKey, `${prev.display} ${info.display}`);
          }
        }
        prev = info;
        prevEnd = m.index + m[1].length;
      } else {
        // Decimal dot check: e.g. 3.14 should not reset clause boundary
        const sep = m[2];
        if (sep === '.' && m.index > 0 && /\d/.test(safeText[m.index - 1]) && /\d/.test(safeText[m.index + 1] || '')) {
          continue;
        }
        prev = null;
      }
    }
  }

  const denominator = ngramSize === 2 ? Math.max(1, words - 1) : Math.max(1, words);
  const keywords = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, TOP_KEYWORD_LIMIT)
    .map(([key, count]) => ({
      term: displayForms.get(key) || key,
      count,
      density: (count / denominator) * 100
    }));

  return {
    words,
    charsWithSpaces,
    charsNoSpaces,
    sentences,
    paragraphs,
    keywords
  };
}

function initWordCounter() {
  const inputEl = document.getElementById('inputText');
  if (!inputEl) return;

  const $ = (sel) => document.querySelector(sel);
  const wcWords = $('#wcWords');
  const wcCharsWith = $('#wcCharsWith');
  const wcCharsNo = $('#wcCharsNo');
  const wcSentences = $('#wcSentences');
  const wcParagraphs = $('#wcParagraphs');
  const wcReadTime = $('#wcReadTime');
  const wcSpeakTime = $('#wcSpeakTime');
  const keywordTableWrap = $('#keywordTable');

  const btnPaste = $('#btnPaste');
  const btnSample = $('#btnSample');
  const btnUpload = $('#btnUpload');
  const btnSelectAll = $('#btnSelectAll');
  const btnCopy = $('#btnCopy');
  const btnClear = $('#btnClear');
  const btnCopyReport = $('#btnCopyReport');
  const fileInput = $('#fileInput');
  const ngramBtns = Array.from(document.querySelectorAll('#ngramToggle .ts-ratio-btn'));

  let currentNgram = 1;
  let lastAnalysis = analyzeText('', 1);

  function formatNumber(n) {
    return n.toLocaleString('en-US');
  }

  function renderLimits(charsWithSpaces) {
    LIMITS.forEach((cfg) => {
      const countEl = $(cfg.countId);
      const statusEl = $(cfg.statusId);
      const fillEl = $(cfg.fillId);
      if (!countEl || !statusEl || !fillEl) return;

      const pct = Math.min(100, (charsWithSpaces / cfg.limit) * 100);
      countEl.textContent = `${formatNumber(charsWithSpaces)} / ${formatNumber(cfg.limit)}`;
      fillEl.style.width = `${pct.toFixed(1)}%`;

      statusEl.className = 'wc-limit-status';
      fillEl.className = 'wc-limit-fill';

      if (charsWithSpaces === 0) {
        statusEl.textContent = t('wc_status_empty');
      } else if (charsWithSpaces > cfg.limit) {
        const over = charsWithSpaces - cfg.limit;
        statusEl.classList.add('is-over');
        fillEl.classList.add('is-over');
        statusEl.textContent = `${t('wc_status_over')} (+${formatNumber(over)})`;
      } else if (charsWithSpaces >= cfg.limit * 0.85) {
        statusEl.classList.add('is-warn');
        fillEl.classList.add('is-warn');
        statusEl.textContent = t('wc_status_near');
      } else {
        statusEl.classList.add('is-ok');
        fillEl.classList.add('is-ok');
        statusEl.textContent = t('wc_status_ok');
      }
    });
  }

  function renderKeywordTable(keywords) {
    while (keywordTableWrap.firstChild) {
      keywordTableWrap.removeChild(keywordTableWrap.firstChild);
    }

    if (!keywords || keywords.length === 0) {
      const emptyP = document.createElement('p');
      emptyP.className = 'wc-kw-empty';
      emptyP.textContent = lastAnalysis.words > 0 ? t('wc_kw_none') : t('wc_kw_empty');
      keywordTableWrap.appendChild(emptyP);
      return;
    }

    const maxDensity = keywords[0].density || 1;
    const table = document.createElement('table');
    table.className = 'wc-kw-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const headers = [
      '#',
      t('wc_col_keyword'),
      t('wc_col_count'),
      t('wc_col_density')
    ];
    headers.forEach((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    keywords.forEach((item, index) => {
      const tr = document.createElement('tr');

      const tdRank = document.createElement('td');
      tdRank.className = 'wc-kw-num';
      tdRank.textContent = String(index + 1);

      const tdTerm = document.createElement('td');
      tdTerm.className = 'wc-kw-term';
      tdTerm.setAttribute('dir', 'auto');
      tdTerm.textContent = item.term;

      const tdCount = document.createElement('td');
      tdCount.className = 'wc-kw-num';
      tdCount.textContent = formatNumber(item.count);

      const tdDensity = document.createElement('td');
      tdDensity.className = 'wc-kw-density-cell';

      const densityRow = document.createElement('div');
      densityRow.className = 'wc-kw-density-row';

      const pctSpan = document.createElement('span');
      pctSpan.textContent = `${item.density.toFixed(1)}%`;

      const bar = document.createElement('div');
      bar.className = 'wc-kw-bar';
      const fill = document.createElement('div');
      fill.className = 'wc-kw-fill';
      fill.style.width = `${Math.max(6, Math.round((item.density / maxDensity) * 100))}%`;
      bar.appendChild(fill);

      densityRow.appendChild(pctSpan);
      densityRow.appendChild(bar);
      tdDensity.appendChild(densityRow);

      tr.appendChild(tdRank);
      tr.appendChild(tdTerm);
      tr.appendChild(tdCount);
      tr.appendChild(tdDensity);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    keywordTableWrap.appendChild(table);
  }

  function updateUI() {
    let raw = inputEl.value;
    if (raw.length > MAX_TEXT_CHARS) {
      raw = raw.slice(0, MAX_TEXT_CHARS);
      inputEl.value = raw;
      toast(t('ts_text_too_long'), 'err');
    }

    lastAnalysis = analyzeText(raw, currentNgram);

    wcWords.textContent = formatNumber(lastAnalysis.words);
    wcCharsWith.textContent = formatNumber(lastAnalysis.charsWithSpaces);
    wcCharsNo.textContent = formatNumber(lastAnalysis.charsNoSpaces);
    wcSentences.textContent = formatNumber(lastAnalysis.sentences);
    wcParagraphs.textContent = formatNumber(lastAnalysis.paragraphs);
    wcReadTime.textContent = formatDuration(lastAnalysis.words, WPM_READING);
    wcSpeakTime.textContent = formatDuration(lastAnalysis.words, WPM_SPEAKING);

    renderLimits(lastAnalysis.charsWithSpaces);
    renderKeywordTable(lastAnalysis.keywords);
  }

  inputEl.addEventListener('input', updateUI);

  ngramBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.ngram === '2' ? 2 : 1;
      if (next === currentNgram) return;
      currentNgram = next;
      ngramBtns.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      updateUI();
    });
  });

  btnPaste.addEventListener('click', async () => {
    inputEl.value = '';
    updateUI();

    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        const clipText = await navigator.clipboard.readText();
        if (!clipText || !clipText.trim()) {
          toast(t('ts_clipboard_empty'), 'err');
          inputEl.focus();
          return;
        }
        inputEl.value = clipText.slice(0, MAX_TEXT_CHARS);
        updateUI();
        toast(t('ts_pasted_ok'), 'ok');
        return;
      } catch (_) {
        // Fallback below if browser blocks programmatic clipboard read
      }
    }
    inputEl.focus();
    toast(t('ts_paste_fallback'));
  });

  btnSample.addEventListener('click', () => {
    const lang = getLang();
    if (lang === 'ar') {
      inputEl.value =
        'تحسين محركات البحث وكتابة المحتوى الرقمي يعتمدان على الوضوح والدقة في اختيار الكلمات المفتاحية المناسبة.\n\n' +
        'عند إعداد مقال احترافي أو منشور على منصات التواصل الاجتماعي، يساعدك تتبع عدد الكلمات ووقت القراءة على تقديم تجربة قراءة متوازنة ومريحة للزوار. ' +
        'كما أن مراقبة كثافة الكلمات المفتاحية تمنع التكرار المبالغ فيه وتحافظ على جودة النص وسلاسته للقارئ ومحركات البحث على حد سواء.\n\n' +
        'استخدم هذه الأداة محلياً داخل متصفحك لقياس طول النصوص بدقة والحفاظ على خصوصية مسوداتك بالكامل.';
    } else {
      inputEl.value =
        'Search engine optimization and clear digital writing depend on concise phrasing and thoughtful keyword balance.\n\n' +
        'When drafting a blog article, meta description, or social media post, tracking word count and estimated reading time helps keep readers engaged from start to finish. ' +
        'Monitoring keyword density prevents unnatural repetition while highlighting the main topics search engines look for.\n\n' +
        'Everything runs instantaneously inside your browser, keeping every draft and content audit 100% private on your device.';
    }
    updateUI();
    inputEl.focus();
  });

  btnUpload.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.txt') && !lowerName.endsWith('.md')) {
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
      inputEl.value = content.slice(0, MAX_TEXT_CHARS);
      updateUI();
      toast(t('ts_file_loaded_ok'), 'ok');
    };
    reader.onerror = () => {
      toast(t('ts_file_read_err'), 'err');
    };
    reader.readAsText(file, 'UTF-8');
  });

  btnSelectAll.addEventListener('click', () => {
    inputEl.focus();
    inputEl.select();
  });

  btnCopy.addEventListener('click', async () => {
    const text = inputEl.value;
    if (!text) {
      toast(t('ts_enter_text_first'), 'err');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast(t('wc_copied_text_ok'), 'ok');
    } catch (_) {
      inputEl.focus();
      inputEl.select();
      const copied = document.execCommand && document.execCommand('copy');
      toast(copied ? t('wc_copied_text_ok') : t('ts_copy_err'), copied ? 'ok' : 'err');
    }
  });

  btnClear.addEventListener('click', () => {
    inputEl.value = '';
    fileInput.value = '';
    updateUI();
    inputEl.focus();
  });

  btnCopyReport.addEventListener('click', async () => {
    const a = lastAnalysis;
    const lines = [
      t('txt_counter_t'),
      '='.repeat(30),
      `${t('ts_words')}: ${formatNumber(a.words)}`,
      `${t('wc_chars_with')}: ${formatNumber(a.charsWithSpaces)}`,
      `${t('wc_chars_no')}: ${formatNumber(a.charsNoSpaces)}`,
      `${t('ts_sentences')}: ${formatNumber(a.sentences)}`,
      `${t('wc_paragraphs')}: ${formatNumber(a.paragraphs)}`,
      `${t('wc_read_time')}: ${formatDuration(a.words, WPM_READING)}`,
      `${t('wc_speak_time')}: ${formatDuration(a.words, WPM_SPEAKING)}`,
      '',
      t('wc_limits_title'),
      '-'.repeat(24)
    ];

    LIMITS.forEach((cfg) => {
      const pct = Math.round((a.charsWithSpaces / cfg.limit) * 100);
      lines.push(`${t(cfg.labelKey)}: ${formatNumber(a.charsWithSpaces)} / ${formatNumber(cfg.limit)} (${pct}%)`);
    });

    if (a.keywords.length > 0) {
      lines.push('');
      lines.push(`${t('wc_kw_title')} (${currentNgram === 2 ? t('wc_ngram_2') : t('wc_ngram_1')})`);
      lines.push('-'.repeat(24));
      a.keywords.forEach((kw, idx) => {
        lines.push(`${idx + 1}. ${kw.term} — ${kw.count} (${kw.density.toFixed(1)}%)`);
      });
    }

    const report = lines.join('\n');
    try {
      await navigator.clipboard.writeText(report);
      toast(t('wc_report_copied_ok'), 'ok');
    } catch (_) {
      toast(t('ts_copy_err'), 'err');
    }
  });

  document.addEventListener('imgsfix:langchange', updateUI);
  updateUI();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWordCounter);
  } else {
    initWordCounter();
  }
}

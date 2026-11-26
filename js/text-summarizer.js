/* imgsfix — Smart Text Summarizer & Key Points Extractor (100% Client-Side ES Module) */

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_INPUT_CHARS = 500000;

/* ----- Stop-words (Arabic & English) ----- */
const EN_STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just', 'like', 'may', 'me', 'might', 'more', 'most', 'must', 'my', 'myself',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves', 'also', 'many', 'much', 'often', 'since', 'still', 'well', 'within', 'without', 'however', 'therefore', 'thus'
]);

const AR_STOP_WORDS_RAW = [
  'في', 'من', 'على', 'إلى', 'الى', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك', 'هؤلاء', 'أولئك',
  'التي', 'الذي', 'الذين', 'اللواتي', 'اللذان', 'اللتان', 'ما', 'لا', 'لم', 'لن', 'قد', 'لقد',
  'أن', 'ان', 'إن', 'أنه', 'انه', 'إنها', 'انها', 'كان', 'كانت', 'يكون', 'تكون', 'ليس', 'ليست',
  'ثم', 'أو', 'او', 'و', 'ف', 'بل', 'لكن', 'كما', 'حيث', 'بين', 'عند', 'منذ', 'حتى', 'كل', 'بعض',
  'غير', 'أكثر', 'اكثر', 'أقل', 'اقل', 'جدا', 'جداً', 'أيضا', 'أيضاً', 'ايضا', 'فقط',
  'هو', 'هي', 'هم', 'هن', 'هما', 'نحن', 'أنا', 'انا', 'أنت', 'انت', 'أنتم', 'انتن',
  'هناك', 'هنا', 'بعد', 'قبل', 'خلال', 'حول', 'ضد', 'تحت', 'فوق', 'أمام', 'امام', 'وراء',
  'نحو', 'دون', 'سوى', 'مثل', 'نفس', 'ذات', 'أحد', 'احد', 'إحدى', 'احدى', 'ضمن', 'وفق', 'عبر',
  'لدى', 'إذ', 'اذ', 'إذا', 'اذا', 'لو', 'لولا', 'كي', 'لكي', 'متى', 'أين', 'اين', 'كيف',
  'لماذا', 'ماذا', 'أي', 'اي', 'كم', 'بما', 'مما', 'عما', 'فيما', 'إنما', 'انما', 'كلما', 'بينما',
  'تعد', 'يعد', 'تعتبر', 'يعتبر', 'يمكن', 'يجب', 'تم', 'يتم', 'تتم', 'سوف', 'الآن', 'الان',
  'علما', 'علماً', 'حالي', 'حاليا', 'بشكل', 'خلاله', 'عليها', 'عليه', 'عليهم', 'فيها', 'فيه',
  'فيهم', 'منها', 'منه', 'منهم', 'إليها', 'إليه', 'إليهم', 'لها', 'له', 'لهم', 'بها', 'به', 'بهم',
  'التى', 'الذى', 'معا', 'معاً', 'أو', 'أم', 'ام', 'نعم', 'كلا', 'إلا', 'الا', 'فإن', 'فان', 'وإن', 'وان'
];

function normalizeArabicForMatch(word) {
  return String(word || '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .trim();
}

const AR_STOP_WORDS = new Set(AR_STOP_WORDS_RAW.map(normalizeArabicForMatch));

function normalizeArabicKeyToken(word) {
  let w = normalizeArabicForMatch(word);
  if (w.length > 4 && /^(وال|بال|كال|فال|لل)/.test(w)) {
    w = w.slice(2);
    if (w.startsWith('ل') && w.length > 3 && !w.startsWith('ال')) {
      w = 'ا' + w;
    }
  } else if (w.length > 4 && w.startsWith('ال')) {
    w = w.slice(2);
  } else if (w.length > 3 && /^[وبفكل]/.test(w)) {
    const stripped = w.slice(1);
    if (AR_STOP_WORDS.has(stripped)) return stripped;
  }
  return w;
}

function stemEnglishForMatch(word) {
  const w = word.toLowerCase();
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function isArabicToken(token) {
  return /[\u0600-\u06FF]/.test(token);
}

function detectDirection(text) {
  const arMatches = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const enMatches = (text.match(/[A-Za-z]/g) || []).length;
  if (arMatches === 0 && enMatches === 0) {
    return (window.imgsfix && window.imgsfix.lang === 'ar') ? 'rtl' : 'ltr';
  }
  return arMatches >= enMatches ? 'rtl' : 'ltr';
}

/* ----- Bilingual Sample Texts ----- */
const SAMPLES = {
  en: `Photosynthesis is defined as the biological process by which green plants, algae, and certain bacteria convert light energy into chemical energy. In order to perform this essential reaction, plants absorb carbon dioxide from the atmosphere and water from the soil. Because chlorophyll inside chloroplasts captures sunlight, the plant can transform these raw inputs into glucose and oxygen. This process consists of two main stages: first, the light-dependent reactions that occur in the thylakoid membranes, and second, the Calvin cycle that builds sugar molecules in the stroma.

In addition to that, recent environmental studies show a significant increase in agricultural efficiency when farms monitor soil moisture and light exposure. During the 2025 field report, precision irrigation reduced water consumption by 32% while crop yields increased by 18% across 140 test plots. On the other hand, prolonged heat stress can reduce photosynthetic output and damage cellular membranes if temperatures exceed critical thresholds.

In conclusion, protecting plant ecosystems is an important global priority for food security and climate stability. We recommend adopting data-driven irrigation methods, preserving forest cover, and investing in resilient crop research as immediate next steps. Ultimately, understanding these core principles helps students, researchers, and decision-makers create effective long-term environmental solutions.`,

  ar: `يُعرّف التعلّم النشط بأنه منهجية تعليمية تجعل الطالب محوراً أساسياً في العملية التعليمية بدلاً من الاقتصار على التلقي السلبي للمعلومات. وينقسم هذا الأسلوب إلى عدة استراتيجيات رئيسية، أولاً: المناقشة الجماعية وحل المشكلات، وثانياً: التعلّم القائم على المشاريع والتجارب العملية. وتُعد هذه القواعد التربوية مهمة لأنها تؤدي إلى ترسيخ المفاهيم في الذاكرة طويلة المدى وتنمية مهارات التفكير النقدي لدى المتعلمين.

بالإضافة إلى ذلك، أظهرت نتائج دراسة ميدانية حديثة أُجريت على 450 طالباً خلال عام 2025 ارتفاع نسبة الاستيعاب بنسبة 38% وتحسن الأداء في الاختبارات التحليلية بنسبة 24% مقارنة بالأساليب التقليدية. ومن الجدير بالذكر أن توظيف التلخيص الذكي وتدوين الملاحظات المنظمة يساعد الطلاب على مراجعة الدروس في وقت أسرع وبكفاءة أعلى، غير أن غياب التخطيط الزمني قد يقلل من فاعلية المراجعة قبل الامتحانات.

خلاصة القول، فإن تحسين جودة التعليم يتطلب دمج الوسائل التفاعلية مع مهارات تنظيم المعرفة. لذلك نوصي باعتماد خطة مراجعة أسبوعية تتضمن استخراج المصطلحات الأساسية وكتابة ملخصات مركزة لكل وحدة دراسية، مما يضمن تحقيق نتائج أكاديمية متقدمة ومستدامة.`
};

/* ----- Sentence Segmentation & Tokenization ----- */
function splitSentences(rawText) {
  const cleaned = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (!cleaned) return [];

  const DOT_PLACEHOLDER = '\uE000';
  const masked = cleaned
    .replace(/(\d)\.(\d)/g, `$1${DOT_PLACEHOLDER}$2`)
    .replace(/\b(Dr|Mr|Mrs|Ms|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|U\.S|U\.K)\./gi, (m) => m.slice(0, -1) + DOT_PLACEHOLDER)
    .replace(/(أ\.د|د\.|م\.|ص\.|هـ\.)/g, (m) => m.replace(/\./g, DOT_PLACEHOLDER));

  const paragraphs = masked.split(/\n+/);
  const sentences = [];

  paragraphs.forEach((para, pIdx) => {
    const trimmedPara = para.trim();
    if (!trimmedPara) return;

    const chunks = trimmedPara.match(/[^.!?؟؛]+(?:[.!?؟؛]+|$)/g) || [trimmedPara];
    chunks.forEach((chunk, cIdx) => {
      const restored = chunk.replace(/\uE000/g, '.').trim();
      if (restored.length >= 3) {
        sentences.push({
          text: restored,
          paraIndex: pIdx,
          isParaStart: cIdx === 0
        });
      }
    });
  });

  return sentences;
}

function tokenizeWords(text) {
  const rawMatches = String(text || '').match(/[A-Za-z0-9\u0600-\u06FF\u064B-\u065F\u0670'-]+/g) || [];
  const tokens = [];

  for (const raw of rawMatches) {
    if (/^\d+$/.test(raw)) continue;
    if (isArabicToken(raw)) {
      const stripped = raw.replace(/[^\u0600-\u06FF]/g, '');
      if (stripped.length < 2) continue;
      const norm = normalizeArabicForMatch(stripped);
      if (AR_STOP_WORDS.has(norm)) continue;
      const key = normalizeArabicKeyToken(stripped);
      if (!key || key.length < 2 || AR_STOP_WORDS.has(key)) continue;
      tokens.push({ key, display: stripped, isArabic: true });
    } else {
      const clean = raw.replace(/^['-]+|['-]+$/g, '');
      if (clean.length < 3) continue;
      const low = clean.toLowerCase();
      if (EN_STOP_WORDS.has(low)) continue;
      const key = stemEnglishForMatch(low);
      if (!key || key.length < 3 || EN_STOP_WORDS.has(key)) continue;
      tokens.push({ key, display: clean, isArabic: false });
    }
  }
  return tokens;
}

function countAllWords(text) {
  const m = String(text || '').trim().match(/[A-Za-z0-9\u0600-\u06FF\u064B-\u065F\u0670'-]+/g);
  return m ? m.length : 0;
}

/* ----- Key Terms & Concepts Extractor ----- */
function extractKeyTerms(sentences, maxTerms = 9) {
  const termStats = new Map();

  sentences.forEach((sObj) => {
    const tokens = tokenizeWords(sObj.text);
    const seenInSent = new Set();

    tokens.forEach((tok) => {
      let entry = termStats.get(tok.key);
      if (!entry) {
        entry = {
          key: tok.key,
          freq: 0,
          sentSpread: 0,
          variants: new Map(),
          isArabic: tok.isArabic
        };
        termStats.set(tok.key, entry);
      }
      entry.freq += 1;
      if (!seenInSent.has(tok.key)) {
        entry.sentSpread += 1;
        seenInSent.add(tok.key);
      }
      const cleanDisp = tok.isArabic
        ? tok.display.replace(/[\u064B-\u065F\u0670]/g, '')
        : tok.display;
      entry.variants.set(cleanDisp, (entry.variants.get(cleanDisp) || 0) + 1);
    });
  });

  const ranked = [];
  termStats.forEach((entry) => {
    if (entry.freq < 1) return;
    let bestDisp = entry.key;
    let bestCount = -1;
    entry.variants.forEach((cnt, variant) => {
      const score = cnt + (entry.isArabic && variant.startsWith('ال') ? 0.2 : 0);
      if (score > bestCount) {
        bestCount = score;
        bestDisp = variant;
      }
    });
    const score = (1 + Math.log(entry.freq)) * (1 + entry.sentSpread * 0.55);
    ranked.push({
      key: entry.key,
      label: bestDisp,
      score,
      freq: entry.freq
    });
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, maxTerms).map((item) => item.label);
}

/* ----- Mode-Specific Sentence Scoring ----- */
function scoreSentences(sentences, mode) {
  const total = sentences.length;
  const freqMap = new Map();
  const sentTokens = sentences.map((s) => tokenizeWords(s.text));

  sentTokens.forEach((tokens) => {
    tokens.forEach((tok) => {
      freqMap.set(tok.key, (freqMap.get(tok.key) || 0) + 1);
    });
  });

  let maxFreq = 1;
  freqMap.forEach((v) => { if (v > maxFreq) maxFreq = v; });

  return sentences.map((sObj, idx) => {
    const text = sObj.text;
    const tokens = sentTokens[idx];
    const wordCount = countAllWords(text);

    let tfSum = 0;
    const uniqueKeys = new Set();
    tokens.forEach((tok) => {
      const f = freqMap.get(tok.key) || 0;
      const weight = (f / maxFreq) * (uniqueKeys.has(tok.key) ? 0.25 : 1);
      tfSum += weight;
      uniqueKeys.add(tok.key);
    });
    const normFactor = Math.max(4, Math.sqrt(Math.max(4, wordCount)));
    let score = (tfSum / normFactor) * 4.5;

    if (wordCount < 5) score *= 0.45;
    else if (wordCount > 65) score *= 0.85;

    if (idx === 0) score += 0.9;
    else if (sObj.isParaStart) score += 0.45;
    if (idx === total - 1 && total > 3) score += 0.55;

    if (mode === 'study') {
      if (/\b(is defined as|defined as|refers to|known as|means that|stands for)\b/i.test(text) ||
          /(يُعرّف|يعرف|تعريف|بأنه|عبارة عن|يقصد بـ|مصطلح|يعني أن)/.test(text) ||
          /:/.test(text)) {
        score += 2.2;
      }
      if (/\b(rule|law|principle|formula|theorem|must|always|required|condition)\b/i.test(text) ||
          /(قاعدة|قانون|مبدأ|نظرية|معادلة|يجب|يشترط|أساسي|قواعد)/.test(text)) {
        score += 1.9;
      }
      if (/\b(because|therefore|thus|hence|leads to|results in|due to|causes)\b/i.test(text) ||
          /(بسبب|لذلك|وبالتالي|مما يؤدي|يؤدي إلى|تؤدي إلى|ينتج عن|نتيجة لـ)/.test(text)) {
        score += 1.7;
      }
      if (/\b(types of|categories|consists of|divided into|first|second|third|stages?)\b/i.test(text) ||
          /(أنواع|أقسام|ينقسم إلى|يتكون من|استراتيجيات|أولاً|ثانياً|ثالثاً|مراحل)/.test(text) ||
          /^\s*(\d+[.)\-]|[•\-])/.test(text)) {
        score += 1.7;
      }
    } else if (mode === 'executive') {
      if (/\d+%|\d+٪|[$€£¥]|\b\d{2,}([.,]\d+)?\b|(مليون|مليار|ألف|ريال|دولار|نسبة)/.test(text)) {
        score += 2.3;
      }
      if (/\b(in conclusion|overall|summary|net|revenue|profit|cost|growth|yield|output|achieved|result)\b/i.test(text) ||
          /(خلاصة|الخلاصة|النتيجة|نتائج|تحقيق|نمو|إيرادات|أرباح|تكلفة|ارتفاع|تحسن|نسبة)/.test(text)) {
        score += 2.0;
      }
      if (/\b(recommend|decision|approved|propose|action|priority|next steps?|strategy|target|plan)\b/i.test(text) ||
          /(نوصي|التوصية|قرار|اعتماد|مقترح|أولوية|الخطوة|خطة|استراتيجية|يتطلب|الهدف)/.test(text)) {
        score += 1.9;
      }
    } else if (mode === 'article') {
      if (idx <= 1 || idx >= total - 2) score += 1.9;
      if (/\b(however|importantly|notably|crucially|essentially|in fact|meanwhile|ultimately|core)\b/i.test(text) ||
          /(غير أن|ومع ذلك|واللافت|من الجدير بالذكر|في الواقع|جوهر|الفكرة|ختاماً|في نهاية المطاف)/.test(text)) {
        score += 1.65;
      }
    } else if (mode === 'bullets') {
      if (wordCount >= 8 && wordCount <= 28) score += 1.4;
      if (/\d+%|\d+٪|\b(first|second|key|main|important|recommend|because|therefore)\b/i.test(text) ||
          /(أولاً|ثانياً|مهم|رئيسي|بسبب|لذلك|نوصي|النتيجة|أظهرت)/.test(text)) {
        score += 1.2;
      }
    }

    return {
      index: idx,
      text,
      score,
      tokenSet: uniqueKeys
    };
  });
}

function jaccardSimilarity(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  setA.forEach((v) => { if (setB.has(v)) intersection++; });
  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}

function selectSummarySentences(scored, ratio, mode) {
  const total = scored.length;
  if (total === 0) return [];
  let targetCount = Math.round(total * ratio);
  if (total >= 3 && ratio >= 0.4 && targetCount < 2) targetCount = 2;
  targetCount = Math.max(1, Math.min(total, targetCount));

  const remaining = scored.slice();
  const chosen = [];
  const redundancyWeight = mode === 'bullets' ? 2.4 : 1.5;

  while (chosen.length < targetCount && remaining.length > 0) {
    let bestIdx = 0;
    let bestAdjusted = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      let maxSim = 0;
      for (let j = 0; j < chosen.length; j++) {
        const sim = jaccardSimilarity(cand.tokenSet, chosen[j].tokenSet);
        if (sim > maxSim) maxSim = sim;
      }
      const adjusted = cand.score - maxSim * redundancyWeight;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIdx = i;
      }
    }

    chosen.push(remaining.splice(bestIdx, 1)[0]);
  }

  chosen.sort((a, b) => a.index - b.index);
  return chosen;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ----- Main Controller ----- */
(function initTextSummarizer() {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const t = (key) => (window.imgsfix && typeof window.imgsfix.t === 'function' ? window.imgsfix.t(key) : key);
  const toast = (msg, kind) => {
    if (window.imgsfix && typeof window.imgsfix.toast === 'function') {
      window.imgsfix.toast(msg, kind);
    }
  };

  const inputEl = $('#inputText');
  const inWordsEl = $('#inWords');
  const inCharsEl = $('#inChars');
  const inSentencesEl = $('#inSentences');

  const modeBtns = $$('#audienceModes .ts-mode-btn');
  const ratioBtns = $$('#ratioGroup .ts-ratio-btn');
  const btnSummarize = $('#btnSummarize');

  const btnPaste = $('#btnPaste');
  const btnSample = $('#btnSample');
  const btnUpload = $('#btnUpload');
  const fileInput = $('#fileInput');
  const btnSelectAll = $('#btnSelectAll');
  const btnClear = $('#btnClear');

  const emptyOutput = $('#emptyOutput');
  const summaryContent = $('#summaryContent');
  const termsSection = $('#termsSection');
  const keyTermsEl = $('#keyTerms');

  const statOrigWords = $('#statOrigWords');
  const statSumWords = $('#statSumWords');
  const statReduction = $('#statReduction');
  const statDuration = $('#statDuration');

  const btnCopy = $('#btnCopy');
  const btnSpeak = $('#btnSpeak');
  const btnExportWord = $('#btnExportWord');
  const btnExportPdf = $('#btnExportPdf');
  const btnExportTxt = $('#btnExportTxt');

  const printOverlay = $('#tsPrintOverlay');
  const printSheet = $('#tsPrintSheet');
  const btnClosePrint = $('#btnClosePrint');
  const btnCancelPrint = $('#btnCancelPrint');
  const btnConfirmPrint = $('#btnConfirmPrint');

  if (!inputEl || !btnSummarize) return;

  const state = {
    mode: 'study',
    ratio: 0.40,
    items: [],       // Array<{ dir, text }>
    keyTerms: [],    // Array<string>
    origWords: 0,
    speaking: false,
    speechQueueId: 0
  };

  /* ----- Input Counters & Ctrl+Enter Shortcut ----- */
  function updateInputCounters() {
    const val = inputEl.value || '';
    inWordsEl.textContent = String(countAllWords(val));
    inCharsEl.textContent = String(val.length);
    const sents = splitSentences(val);
    inSentencesEl.textContent = String(sents.length);
  }

  inputEl.addEventListener('input', updateInputCounters);

  inputEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runSummarize();
    }
  });

  /* ----- Mode & Ratio Controls ----- */
  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode || 'study';
      modeBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      if (inputEl.value.trim()) runSummarize();
    });
  });

  ratioBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.ratio = parseFloat(btn.dataset.ratio || '0.40');
      ratioBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      if (inputEl.value.trim()) runSummarize();
    });
  });

  /* ----- Sticky Action Toolbar Buttons ----- */
  btnSummarize.addEventListener('click', runSummarize);

  btnPaste.addEventListener('click', async () => {
    // Always clear any existing text (including sample text) first
    stopSpeech();
    inputEl.value = '';
    updateInputCounters();

    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      try {
        const clip = await navigator.clipboard.readText();
        if (!clip || !clip.trim()) {
          inputEl.focus();
          toast(t('ts_clipboard_empty'));
          return;
        }
        if (clip.length > MAX_INPUT_CHARS) {
          toast(t('ts_text_too_long'), 'err');
          inputEl.focus();
          return;
        }
        inputEl.value = clip;
        updateInputCounters();
        toast(t('ts_pasted_ok'), 'ok');
        return;
      } catch (_err) {
        // Permission denied or blocked — keep box empty and focused with clear instructions
      }
    }
    inputEl.focus();
    toast(t('ts_paste_fallback'));
  });

  btnSample.addEventListener('click', () => {
    const activeLang = (window.imgsfix && window.imgsfix.lang === 'ar') ? 'ar' : 'en';
    inputEl.value = SAMPLES[activeLang];
    updateInputCounters();
    runSummarize();
  });

  btnUpload.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  function applyLoadedFileText(content) {
    if (!content || !content.trim()) {
      toast(t('ts_file_empty_err'), 'err');
      return;
    }
    if (content.length > MAX_INPUT_CHARS) {
      toast(t('ts_text_too_long'), 'err');
      return;
    }
    inputEl.value = content;
    updateInputCounters();
    runSummarize();
    toast(t('ts_file_loaded_ok'), 'ok');
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    const isPlainText = /\.(txt|md|csv)$/i.test(file.name) ||
      /^(text\/(plain|markdown|csv)|application\/(vnd\.ms-excel|csv))$/i.test(file.type || '');

    if (!isPlainText) {
      toast(t('ts_file_type_err'), 'err');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast(t('ts_file_size_err'), 'err');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      applyLoadedFileText(content);
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

  btnClear.addEventListener('click', () => {
    stopSpeech();
    inputEl.value = '';
    state.items = [];
    state.keyTerms = [];
    state.origWords = 0;
    updateInputCounters();
    renderEmptyState();
    inputEl.focus();
  });

  /* ----- Summarize Execution ----- */
  function runSummarize() {
    const raw = (inputEl.value || '').trim();
    if (!raw) {
      toast(t('ts_enter_text_first'), 'err');
      inputEl.focus();
      return;
    }
    if (raw.length > MAX_INPUT_CHARS) {
      toast(t('ts_text_too_long'), 'err');
      return;
    }

    stopSpeech();

    const t0 = performance.now();
    const sentences = splitSentences(raw);
    if (sentences.length === 0) {
      toast(t('ts_enter_text_first'), 'err');
      return;
    }

    const scored = scoreSentences(sentences, state.mode);
    const chosen = selectSummarySentences(scored, state.ratio, state.mode);
    state.items = chosen.map((s) => ({
      dir: detectDirection(s.text),
      text: s.text
    }));
    state.keyTerms = extractKeyTerms(sentences, 9);
    state.origWords = countAllWords(raw);
    const elapsed = Math.max(1, Math.round(performance.now() - t0));

    renderOutput(elapsed);
  }

  /* ----- Safe DOM Rendering (Zero innerHTML) ----- */
  function setExportsEnabled(enabled) {
    btnCopy.disabled = !enabled;
    btnSpeak.disabled = !enabled;
    btnExportWord.disabled = !enabled;
    btnExportPdf.disabled = !enabled;
    btnExportTxt.disabled = !enabled;
  }

  function renderEmptyState() {
    emptyOutput.classList.remove('hide');
    summaryContent.classList.add('hide');
    termsSection.classList.add('hide');
    while (summaryContent.firstChild) summaryContent.removeChild(summaryContent.firstChild);
    while (keyTermsEl.firstChild) keyTermsEl.removeChild(keyTermsEl.firstChild);
    statOrigWords.textContent = '0';
    statSumWords.textContent = '0';
    statReduction.textContent = '0%';
    statDuration.textContent = '';
    setExportsEnabled(false);
  }

  function updateSummaryStats() {
    const plain = getPlainSummaryText();
    const sumWords = countAllWords(plain);
    const orig = state.origWords || 0;
    const red = orig > 0 ? Math.max(0, Math.round(((orig - sumWords) / orig) * 100)) : 0;
    statOrigWords.textContent = String(orig);
    statSumWords.textContent = String(sumWords);
    statReduction.textContent = `${red}%`;
  }

  function renderOutput(elapsedMs) {
    if (!state.items.length) {
      renderEmptyState();
      return;
    }

    emptyOutput.classList.add('hide');
    summaryContent.classList.remove('hide');
    while (summaryContent.firstChild) summaryContent.removeChild(summaryContent.firstChild);

    const asList = state.mode === 'study' || state.mode === 'bullets';

    if (asList) {
      const ul = document.createElement('ul');
      ul.className = 'ts-summary-list';
      state.items.forEach((item) => {
        const li = document.createElement('li');
        li.setAttribute('dir', item.dir);
        li.textContent = item.text;
        ul.appendChild(li);
      });
      summaryContent.appendChild(ul);
    } else {
      const groupSize = state.items.length >= 4 ? 2 : 1;
      for (let i = 0; i < state.items.length; i += groupSize) {
        const slice = state.items.slice(i, i + groupSize);
        const p = document.createElement('p');
        p.className = 'ts-summary-para';
        p.setAttribute('dir', slice[0].dir);
        p.textContent = slice.map((item) => item.text).join(' ');
        summaryContent.appendChild(p);
      }
    }

    while (keyTermsEl.firstChild) keyTermsEl.removeChild(keyTermsEl.firstChild);
    if (state.keyTerms.length > 0) {
      termsSection.classList.remove('hide');
      state.keyTerms.forEach((term) => {
        const chip = document.createElement('span');
        chip.className = 'ts-term-chip';
        chip.setAttribute('dir', detectDirection(term));
        chip.textContent = term;
        keyTermsEl.appendChild(chip);
      });
    } else {
      termsSection.classList.add('hide');
    }

    updateSummaryStats();
    if (typeof elapsedMs === 'number') {
      statDuration.textContent = `${elapsedMs} ms`;
    }
    setExportsEnabled(true);
  }

  /* ----- Plain Summary Helpers ----- */
  function getPlainLines() {
    return state.items.map((item) => item.text.trim()).filter(Boolean);
  }

  function getPlainSummaryText() {
    const lines = getPlainLines();
    if (state.mode === 'study' || state.mode === 'bullets') {
      return lines.map((l) => `• ${l}`).join('\n');
    }
    return lines.join(' ');
  }

  /* ----- Copy Summary ----- */
  btnCopy.addEventListener('click', async () => {
    const lines = getPlainLines();
    if (!lines.length) return;
    let out = getPlainSummaryText();
    if (state.keyTerms.length) {
      out += `\n\n${t('ts_key_terms')}: ${state.keyTerms.join(', ')}`;
    }
    try {
      await navigator.clipboard.writeText(out);
      toast(t('ts_copied_ok'), 'ok');
    } catch (_err) {
      const tmp = document.createElement('textarea');
      tmp.value = out;
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
  });

  /* ----- Listen / Read Aloud (speechSynthesis) ----- */
  function updateSpeakButtonUI(isPlaying) {
    state.speaking = isPlaying;
    btnSpeak.classList.toggle('is-speaking', isPlaying);
    btnSpeak.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    btnSpeak.textContent = t(isPlaying ? 'ts_btn_stop' : 'ts_btn_listen');
  }

  function stopSpeech() {
    state.speechQueueId += 1;
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_e) {}
    }
    updateSpeakButtonUI(false);
  }

  let cachedVoices = [];
  function refreshVoices() {
    if (!('speechSynthesis' in window)) return [];
    cachedVoices = window.speechSynthesis.getVoices() || [];
    return cachedVoices;
  }

  if ('speechSynthesis' in window) {
    refreshVoices();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    } else {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
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

  function pickVoiceForLang(voices, isArabic) {
    const prefix = isArabic ? 'ar' : 'en';
    return voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix)) || null;
  }

  btnSpeak.addEventListener('click', async () => {
    if (!('speechSynthesis' in window)) {
      toast(t('ts_tts_unsupported'), 'err');
      return;
    }
    if (state.speaking) {
      stopSpeech();
      return;
    }

    const lines = getPlainLines();
    if (!lines.length) return;

    stopSpeech();
    const queueId = state.speechQueueId;
    const joined = lines.join(' ');
    const isAr = detectDirection(joined) === 'rtl' || /[\u0600-\u06FF]/.test(joined);
    const voices = await ensureVoicesLoaded();
    if (queueId !== state.speechQueueId) return;

    const voice = pickVoiceForLang(voices, isAr);
    if (isAr && !voice) {
      toast(t('ts_no_ar_voice'), 'err');
      return;
    }

    const targetLang = isAr ? (voice.lang || 'ar-SA') : ((voice && voice.lang) || 'en-US');
    updateSpeakButtonUI(true);

    let index = 0;
    const speakNext = () => {
      if (queueId !== state.speechQueueId) return;
      if (index >= lines.length) {
        updateSpeakButtonUI(false);
        return;
      }
      const utter = new SpeechSynthesisUtterance(lines[index]);
      utter.lang = targetLang;
      if (voice) utter.voice = voice;
      utter.rate = 1.0;
      utter.onend = () => {
        index += 1;
        speakNext();
      };
      utter.onerror = () => {
        if (queueId === state.speechQueueId) {
          updateSpeakButtonUI(false);
        }
      };
      window.speechSynthesis.speak(utter);
    };

    speakNext();
  });

  document.addEventListener('imgsfix:langchange', () => {
    btnSpeak.textContent = t(state.speaking ? 'ts_btn_stop' : 'ts_btn_listen');
  });

  window.addEventListener('beforeunload', stopSpeech);

  /* ----- Export as Word (.doc) ----- */
  btnExportWord.addEventListener('click', () => {
    const lines = getPlainLines();
    if (!lines.length) return;

    const dir = detectDirection(lines.join(' '));
    const isRtl = dir === 'rtl';
    const title = t('t_summarizer_t');
    const termsTitle = t('ts_key_terms');
    const modeLabel = t(`ts_mode_${state.mode}`);
    const dateStr = new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US');

    const bodyMarkup = (state.mode === 'study' || state.mode === 'bullets')
      ? `<ul>${lines.map((l) => `<li style="margin-bottom:8pt;line-height:1.7;">${escapeHtml(l)}</li>`).join('')}</ul>`
      : lines.map((l) => `<p style="margin:0 0 10pt;line-height:1.7;">${escapeHtml(l)}</p>`).join('');

    const termsMarkup = state.keyTerms.length
      ? `<p style="margin-top:16pt;font-weight:bold;color:#0c3bb8;">${escapeHtml(termsTitle)}:</p><p style="color:#1f2937;">${state.keyTerms.map((k) => escapeHtml(k)).join(' &bull; ')}</p>`
      : '';

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
  <div class="meta">${escapeHtml(modeLabel)} &bull; ${escapeHtml(dateStr)}</div>
  ${bodyMarkup}
  ${termsMarkup}
</body>
</html>`;

    const blob = new Blob([docHtml], { type: 'application/msword;charset=utf-8' });
    const stamp = new Date().toISOString().slice(0, 10);
    window.imgsfix.triggerDownload(blob, `summary_${stamp}_imgsfix.doc`);
    toast(t('tc_done'), 'ok');
  });

  /* ----- Export / Print PDF (Clean Cairo Print Sheet + window.print) ----- */
  function closePrintModal() {
    document.body.classList.remove('ts-printing');
    if (printOverlay) printOverlay.classList.remove('show');
  }

  function buildPrintSheet() {
    const lines = getPlainLines();
    if (!lines.length) return false;
    const dir = detectDirection(lines.join(' '));
    const isRtl = dir === 'rtl';

    while (printSheet.firstChild) printSheet.removeChild(printSheet.firstChild);
    printSheet.setAttribute('dir', dir);

    const h2 = document.createElement('h2');
    h2.textContent = t('t_summarizer_t');
    printSheet.appendChild(h2);

    const meta = document.createElement('div');
    meta.className = 'ts-print-meta';
    const dateStr = new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US');
    const sumWords = countAllWords(getPlainSummaryText());
    meta.textContent = `${t(`ts_mode_${state.mode}`)} · ${dateStr} · ${t('ts_orig_words')}: ${state.origWords} → ${t('ts_sum_words')}: ${sumWords}`;
    printSheet.appendChild(meta);

    const body = document.createElement('div');
    body.className = 'ts-print-body';
    if (state.mode === 'study' || state.mode === 'bullets') {
      const ul = document.createElement('ul');
      lines.forEach((l) => {
        const li = document.createElement('li');
        li.textContent = l;
        ul.appendChild(li);
      });
      body.appendChild(ul);
    } else {
      lines.forEach((l) => {
        const p = document.createElement('p');
        p.textContent = l;
        body.appendChild(p);
      });
    }
    printSheet.appendChild(body);

    if (state.keyTerms.length) {
      const label = document.createElement('div');
      label.style.fontWeight = '700';
      label.style.fontSize = '13px';
      label.style.marginTop = '16px';
      label.style.color = '#0c3bb8';
      label.textContent = t('ts_key_terms');
      printSheet.appendChild(label);

      const termsWrap = document.createElement('div');
      termsWrap.className = 'ts-print-terms';
      state.keyTerms.forEach((term) => {
        const chip = document.createElement('span');
        chip.textContent = term;
        termsWrap.appendChild(chip);
      });
      printSheet.appendChild(termsWrap);
    }
    return true;
  }

  function triggerPrintPdf() {
    document.body.classList.add('ts-printing');
    window.print();
  }

  window.addEventListener('afterprint', () => {
    document.body.classList.remove('ts-printing');
  });

  btnExportPdf.addEventListener('click', () => {
    if (!buildPrintSheet()) return;
    printOverlay.classList.add('show');
    requestAnimationFrame(() => {
      setTimeout(triggerPrintPdf, 80);
    });
  });

  btnConfirmPrint.addEventListener('click', triggerPrintPdf);
  btnClosePrint.addEventListener('click', closePrintModal);
  btnCancelPrint.addEventListener('click', closePrintModal);
  printOverlay.addEventListener('click', (e) => {
    if (e.target === printOverlay) closePrintModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && printOverlay && printOverlay.classList.contains('show')) {
      closePrintModal();
    }
  });

  /* ----- Export as TXT ----- */
  btnExportTxt.addEventListener('click', () => {
    const lines = getPlainLines();
    if (!lines.length) return;
    let out = `${t('t_summarizer_t')}\n${'='.repeat(28)}\n\n${getPlainSummaryText()}`;
    if (state.keyTerms.length) {
      out += `\n\n${t('ts_key_terms')}: ${state.keyTerms.join(', ')}`;
    }
    const blob = new Blob([out], { type: 'text/plain;charset=utf-8' });
    const stamp = new Date().toISOString().slice(0, 10);
    window.imgsfix.triggerDownload(blob, `summary_${stamp}_imgsfix.txt`);
    toast(t('tc_done'), 'ok');
  });

  updateInputCounters();
})();

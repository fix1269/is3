/* ==========================================================================
   imgsfix — Fancy Text & Symbols Generator Studio
   100% Client-Side Vanilla ES Module · Instant Unicode Engine (< 5ms) · Strict XSS Safety
   ========================================================================== */

const FAVS_STORAGE_KEY = 'imgsfix_fancy_favs';
const MAX_INPUT_LEN = 300;

export const FRAME_OPTIONS = [
  { key: 'none', labelKey: 'ft_frame_none', label: '✕', prefix: '', suffix: '' },
  // Modern Minimalist
  { key: 'jp1', label: '「 ... 」', prefix: '「 ', suffix: ' 」' },
  { key: 'jp2', label: '『 ... 』', prefix: '『 ', suffix: ' 』' },
  { key: 'lens', label: '【 ... 】', prefix: '【 ', suffix: ' 】' },
  { key: 'shell', label: '〔 ... 〕', prefix: '〔 ', suffix: ' 〕' },
  { key: 'curved', label: '⦗ ... ⦘', prefix: '⦗ ', suffix: ' ⦘' },
  { key: 'chev', label: '❮ ... ❯', prefix: '❮ ', suffix: ' ❯' },
  { key: 'diamond', label: '◈ ... ◈', prefix: '◈ ', suffix: ' ◈' },
  { key: 'ornate4', label: '❖ ... ❖', prefix: '❖ ', suffix: ' ❖' },
  { key: 'spark', label: '✦ ... ✦', prefix: '✦ ', suffix: ' ✦' },
  { key: 'starlight', label: '✧ ... ✧', prefix: '✧ ', suffix: ' ✧' },
  { key: 'bar', label: '┊ ... ┊', prefix: '┊ ', suffix: ' ┊' },
  { key: 'divider', label: '• ── ... ── •', prefix: '• ── ', suffix: ' ── •' },
  // Royal & Aesthetic
  { key: 'queen', label: '♛ ... ♛', prefix: '♛ ', suffix: ' ♛' },
  { key: 'king', label: '♔ ... ♔', prefix: '♔ ', suffix: ' ♔' },
  { key: 'sparkles', label: '✨ ... ✨', prefix: '✨ ', suffix: ' ✨' },
  { key: 'leaf', label: '🌿 ... 🌿', prefix: '🌿 ', suffix: ' 🌿' },
  { key: 'butterfly', label: '🦋 ... 🦋', prefix: '🦋 ', suffix: ' 🦋' },
  { key: 'moon', label: '🌙 ... 🌙', prefix: '🌙 ', suffix: ' 🌙' },
  { key: 'gem', label: '💎 ... 💎', prefix: '💎 ', suffix: ' 💎' },
  { key: 'crown', label: '👑 ... 👑', prefix: '👑 ', suffix: ' 👑' },
  // Classic Gaming & Clans
  { key: 'clan', label: '꧁༒☬ ... ☬༒꧂', prefix: '꧁༒☬ ', suffix: ' ☬༒꧂' },
  { key: 'starclan', label: '★彡[ ... ]彡★', prefix: '★彡[ ', suffix: ' ]彡★' },
  { key: 'tsu', label: 'ツ ... ツ', prefix: 'ツ ', suffix: ' ツ' },
  { key: 'me', label: '么 ... 么', prefix: '么 ', suffix: ' 么' }
];

const FRAME_MAP = new Map(FRAME_OPTIONS.map((f) => [f.key, f]));

export const SYMBOL_GROUPS = {
  faces: [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤯',
    '😳', '🤔', '🤭', '🤫', '🤥', '😴', '🤤'
  ],
  hands: [
    '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
    '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
    '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
    '🙏', '✍️', '💪', '🦾', '🫶', '❤️‍🔥', '💯', '🔥', '✨', '⭐'
  ],
  stars: [
    '✦', '✧', '✩', '✪', '✫', '✬', '✭', '✮', '✯', '✰',
    '✨', '💫', '⭐', '🌟', '✴️', '✳️', '❇️', '❂', '❁', '❀',
    '✿', '✾', '✽', '✼', '✻', '✺', '✹', '✸', '✷', '✶'
  ],
  brackets: [
    '「', '」', '『', '』', '【', '】', '〔', '〕', '⦗', '⦘',
    '❮', '❯', '◈', '◇', '◆', '❖', '┊', '┆', '•', '·',
    '─', '━', '═', '┄', '┅', '┈', '┉', '⋆', '⋇', '⋈'
  ],
  nature: [
    '♛', '♚', '♕', '♔', '👑', '💎', '🏆', '🥇', '🎯', '🎉',
    '🎊', '🎈', '🎀', '🎁', '🌿', '🍃', '🍀', '🌱', '🌸', '🌺',
    '🌻', '🌷', '🌹', '🥀', '🦋', '🕊️', '🦅', '🌙', '☀️', '🌤️',
    '⛅', '🌈', '☁️', '🌊', '❄️', '🔥', '🎶', '🎵', '🎧', '🚀'
  ],
  hearts: [
    '♡', '♥', '❥', '❣', '❤️', '🩷', '🧡', '💛', '💚', '💙',
    '🩵', '💜', '🤎', '🖤', '🩶', '🤍', '💖', '💗', '💓', '💞',
    '💕', '💟', '💌', '➔', '➜', '➤', '➥', '➦', '➧', '➨',
    '➢', '➣', '✓', '✔', '✦'
  ]
};

const ALPHA_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHA_LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';

function buildOffsetMap(upperStart, lowerStart, digitStart = null, overrides = {}) {
  const map = new Map();
  for (let i = 0; i < 26; i++) {
    const uc = ALPHA_UPPER[i];
    const lc = ALPHA_LOWER[i];
    map.set(uc, overrides[uc] || String.fromCodePoint(upperStart + i));
    map.set(lc, overrides[lc] || String.fromCodePoint(lowerStart + i));
  }
  if (digitStart !== null) {
    for (let d = 0; d < 10; d++) {
      const ch = DIGITS[d];
      map.set(ch, overrides[ch] || String.fromCodePoint(digitStart + d));
    }
  }
  return map;
}

function buildStringMap(upperStr, lowerStr, digitStr = '') {
  const map = new Map();
  const uArr = Array.from(upperStr);
  const lArr = Array.from(lowerStr);
  const dArr = Array.from(digitStr);
  for (let i = 0; i < 26; i++) {
    if (uArr[i]) map.set(ALPHA_UPPER[i], uArr[i]);
    if (lArr[i]) map.set(ALPHA_LOWER[i], lArr[i]);
  }
  for (let d = 0; d < 10; d++) {
    if (dArr[d]) map.set(DIGITS[d], dArr[d]);
  }
  return map;
}

function applyCharMap(text, map) {
  let out = '';
  for (const ch of text) {
    out += map.get(ch) ?? ch;
  }
  return out;
}

function applyCombining(text, mark) {
  let out = '';
  for (const ch of text) {
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      out += ch;
    } else {
      out += ch + mark;
    }
  }
  return out;
}

// Compiled English Unicode character maps
const MAP_BOLD_SERIF = buildOffsetMap(0x1D400, 0x1D41A, 0x1D7CE);
const MAP_ITALIC_SERIF = buildOffsetMap(0x1D434, 0x1D44E, null, { h: '\u210E' });
const MAP_BOLD_ITALIC_SERIF = buildOffsetMap(0x1D468, 0x1D482);
const MAP_SANS_BOLD = buildOffsetMap(0x1D5D4, 0x1D5EE, 0x1D7EC);
const MAP_SANS_ITALIC = buildOffsetMap(0x1D608, 0x1D622);
const MAP_SANS_BOLD_ITALIC = buildOffsetMap(0x1D63C, 0x1D656);
const MAP_MONOSPACE = buildOffsetMap(0x1D670, 0x1D68A, 0x1D7F6);
const MAP_SCRIPT = buildOffsetMap(0x1D49C, 0x1D4B6, null, {
  B: '\u212C', E: '\u2130', F: '\u2131', H: '\u210B', I: '\u2110',
  L: '\u2112', M: '\u2133', R: '\u211B', e: '\u212F', g: '\u210A', o: '\u2134'
});
const MAP_BOLD_SCRIPT = buildOffsetMap(0x1D4D0, 0x1D4EA);
const MAP_FRAKTUR = buildOffsetMap(0x1D504, 0x1D51E, null, {
  C: '\u212D', H: '\u210C', I: '\u2111', R: '\u211C', Z: '\u2128'
});
const MAP_BOLD_FRAKTUR = buildOffsetMap(0x1D56C, 0x1D586);
const MAP_DOUBLE_STRUCK = buildOffsetMap(0x1D538, 0x1D552, 0x1D7D8, {
  C: '\u2102', H: '\u210D', N: '\u2115', P: '\u2119', Q: '\u211A', R: '\u211D', Z: '\u2124'
});

const MAP_SMALL_CAPS = buildStringMap(
  'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ',
  'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ'
);

const MAP_FULLWIDTH = (() => {
  const m = new Map();
  for (let code = 33; code <= 126; code++) {
    m.set(String.fromCharCode(code), String.fromCodePoint(0xFF01 + (code - 33)));
  }
  m.set(' ', '\u3000');
  return m;
})();

const MAP_CIRCLED = buildStringMap(
  'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
  'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
  '⓪①②③④⑤⑥⑦⑧⑨'
);

const MAP_BUBBLE_FILLED = buildStringMap(
  '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩',
  '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩',
  '⓿❶❷❸❹❺❻❼❽❾'
);

const MAP_SQUARED = buildStringMap(
  '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
  '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉'
);

const MAP_NEG_SQUARED = buildStringMap(
  '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉',
  '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉'
);

const MAP_PAREN = buildStringMap(
  '🄐🄑🄒🄓🄔🄕🄖🄗🄘🄙🄚🄛🄜🄝🄞🄟🄠🄡🄢🄣🄤🄥🄦🄧🄨🄩',
  '⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵',
  '0⑴⑵⑶⑷⑸⑹⑺⑻⑼'
);

const MAP_SUPERSCRIPT = buildStringMap(
  'ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾQᴿˢᵀᵁⱽᵂˣʸᶻ',
  'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖqʳˢᵗᵘᵛʷˣʸᶻ',
  '⁰¹²³⁴⁵⁶⁷⁸⁹'
);

const MAP_SUBSCRIPT = buildStringMap(
  'ₐBCDₑFGₕᵢⱼₖₗₘₙₒₚQᵣₛₜᵤᵥWₓᵧZ',
  'ₐbcdₑfgₕᵢⱼₖₗₘₙₒₚqᵣₛₜᵤᵥwₓᵧz',
  '₀₁₂₃₄₅₆₇₈₉'
);

const MAP_UPSIDE_DOWN = (() => {
  const m = buildStringMap(
    '∀qƆpƎℲפHIſʞ˥WNOԀQɹS┴∩ΛMX⅄Z',
    'ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz',
    '0ƖᄅƐㄣϛ9ㄥ86'
  );
  m.set('.', '˙');
  m.set(',', '\'');
  m.set('?', '¿');
  m.set('!', '¡');
  m.set('(', ')');
  m.set(')', '(');
  m.set('[', ']');
  m.set(']', '[');
  return m;
})();

function flipUpsideDown(text) {
  const chars = Array.from(text);
  const out = [];
  for (let i = chars.length - 1; i >= 0; i--) {
    out.push(MAP_UPSIDE_DOWN.get(chars[i]) ?? chars[i]);
  }
  return out.join('');
}

function reverseMirror(text) {
  return Array.from(text).reverse().join('');
}

function joinWithSeparator(text, sep) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word).join(sep))
    .join('   ');
}

// ==========================================================================
// Smart Arabic Joining & Ornate Unicode Engine
// ==========================================================================

const AR_NON_LEFT_JOIN = new Set([
  'ا', 'أ', 'إ', 'آ', 'ٱ', 'ى', 'د', 'ذ', 'ر', 'ز', 'و', 'ؤ', 'ة', 'ء',
  'ژ', 'ڈ', 'ڑ', 'ے', 'ۆ', 'ۇ', 'ە', 'ٮ'
]);
const AR_ALEF_FORMS = new Set(['ا', 'أ', 'إ', 'آ', 'ٱ']);
const AR_DIACRITIC_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/;
const AR_LETTER_RE = /[\u0621-\u064A\u066E-\u066F\u0671-\u06D3\u06FA-\u06FF]/;

function canArabicJoinAfter(chars, index) {
  const ch = chars[index];
  if (!AR_LETTER_RE.test(ch) || AR_NON_LEFT_JOIN.has(ch)) return false;

  let nextIdx = index + 1;
  while (nextIdx < chars.length && AR_DIACRITIC_RE.test(chars[nextIdx])) {
    nextIdx += 1;
  }
  if (nextIdx >= chars.length) return false;
  const nextCh = chars[nextIdx];
  if (!AR_LETTER_RE.test(nextCh) || nextCh === 'ء') return false;

  if (ch === 'ل' && AR_ALEF_FORMS.has(nextCh)) return false;

  return true;
}

export function applyArabicKashida(text, kashidaCount = 1, mode = 'all') {
  const chars = Array.from(text);
  const tatweel = '\u0640';

  if (mode === 'ends') {
    const validSlots = new Set();
    let lastSlot = -1;
    for (let i = 0; i < chars.length; i++) {
      if (/\s/.test(chars[i])) {
        if (lastSlot !== -1) validSlots.add(lastSlot);
        lastSlot = -1;
      } else if (canArabicJoinAfter(chars, i)) {
        lastSlot = i;
      }
    }
    if (lastSlot !== -1) validSlots.add(lastSlot);

    let out = '';
    for (let i = 0; i < chars.length; i++) {
      out += chars[i];
      if (validSlots.has(i)) {
        while (i + 1 < chars.length && AR_DIACRITIC_RE.test(chars[i + 1])) {
          i += 1;
          out += chars[i];
        }
        out += tatweel.repeat(kashidaCount);
      }
    }
    return out;
  }

  let out = '';
  let toggle = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    out += ch;
    if (canArabicJoinAfter(chars, i)) {
      while (i + 1 < chars.length && AR_DIACRITIC_RE.test(chars[i + 1])) {
        i += 1;
        out += chars[i];
      }
      if (mode === 'alternating') {
        out += tatweel.repeat(toggle % 2 === 0 ? kashidaCount + 1 : kashidaCount);
        toggle += 1;
      } else {
        out += tatweel.repeat(kashidaCount);
      }
    }
  }
  return out;
}

const AR_PERSIAN_SWAPS = new Map([
  ['ك', 'ک'],
  ['ي', 'ی'],
  ['ى', 'ی'],
  ['ه', 'ھ'],
  ['ة', 'ۃ']
]);

const AR_PERSIAN_SOFT = new Map([
  ['ك', 'ک'],
  ['ي', 'ی'],
  ['ق', 'ڨ']
]);

const AR_DOTLESS_MAP = new Map([
  ['ب', 'ٮ'], ['ت', 'ٮ'], ['ث', 'ٮ'], ['ن', 'ٮ'], ['ي', 'ى'],
  ['ج', 'ح'], ['خ', 'ح'],
  ['ذ', 'د'], ['ز', 'ر'],
  ['ش', 'س'], ['ض', 'ص'], ['ظ', 'ط'], ['غ', 'ع'],
  ['ف', 'ڡ'], ['ق', 'ٯ'], ['ة', 'ه']
]);

function mapArabicChars(text, map) {
  let out = '';
  for (const ch of text) {
    out += map.get(ch) ?? ch;
  }
  return out;
}

function addArtisticTashkeel(text, mode = 'soft') {
  const chars = Array.from(text);
  const softMarks = ['َ', 'ُ', 'ِ', 'ْ'];
  const ornateMarks = ['ّ', 'ٰ', 'َ', 'ُ', 'ِ', 'ْ'];
  const palette = mode === 'ornate' ? ornateMarks : softMarks;
  let step = 0;
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    out += ch;
    if (AR_LETTER_RE.test(ch) && ch !== 'ا' && ch !== 'أ' && ch !== 'إ' && ch !== 'آ' && ch !== 'ء') {
      const next = chars[i + 1];
      if (!next || !AR_DIACRITIC_RE.test(next)) {
        if (step % 2 === 0) {
          out += palette[(step >> 1) % palette.length];
        }
        step += 1;
      }
    }
  }
  return out;
}

function wrapTrimmed(text, prefix, suffix) {
  return text.trim() ? `${prefix}${text}${suffix}` : '';
}

// ==========================================================================
// Unified Style Definitions Registry (66 Clean Bilingual Styles)
// ==========================================================================

export const FANCY_STYLES = [
  // ---- Modern Social & Bio (30 English Unicode styles) ----
  { id: 'en_sans_bold', category: 'social', nameEn: 'Sans Bold', nameAr: 'عريض هندسي', transform: (s) => applyCharMap(s, MAP_SANS_BOLD) },
  { id: 'en_sans_italic', category: 'social', nameEn: 'Sans Italic', nameAr: 'مائل عصري', transform: (s) => applyCharMap(s, MAP_SANS_ITALIC) },
  { id: 'en_sans_bi', category: 'social', nameEn: 'Sans Bold Italic', nameAr: 'عريض مائل عصري', transform: (s) => applyCharMap(s, MAP_SANS_BOLD_ITALIC) },
  { id: 'en_serif_bold', category: 'social', nameEn: 'Serif Bold', nameAr: 'كلاسيكي عريض', transform: (s) => applyCharMap(s, MAP_BOLD_SERIF) },
  { id: 'en_serif_italic', category: 'social', nameEn: 'Serif Italic', nameAr: 'كلاسيكي مائل', transform: (s) => applyCharMap(s, MAP_ITALIC_SERIF) },
  { id: 'en_serif_bi', category: 'social', nameEn: 'Serif Bold Italic', nameAr: 'كلاسيكي عريض مائل', transform: (s) => applyCharMap(s, MAP_BOLD_ITALIC_SERIF) },
  { id: 'en_mono', category: 'social', nameEn: 'Monospace', nameAr: 'آلة كاتبة', transform: (s) => applyCharMap(s, MAP_MONOSPACE) },
  { id: 'en_script', category: 'social', nameEn: 'Cursive Script', nameAr: 'خط يدوي متصل', transform: (s) => applyCharMap(s, MAP_SCRIPT) },
  { id: 'en_bold_script', category: 'social', nameEn: 'Bold Script', nameAr: 'خط يدوي عريض', transform: (s) => applyCharMap(s, MAP_BOLD_SCRIPT) },
  { id: 'en_small_caps', category: 'social', nameEn: 'Small Caps', nameAr: 'أحرف صغيرة مصقولة', transform: (s) => applyCharMap(s, MAP_SMALL_CAPS) },
  { id: 'en_double', category: 'social', nameEn: 'Double-Struck', nameAr: 'خط مزدوج', transform: (s) => applyCharMap(s, MAP_DOUBLE_STRUCK) },
  { id: 'en_fraktur', category: 'social', nameEn: 'Gothic Fraktur', nameAr: 'خط قوطي', transform: (s) => applyCharMap(s, MAP_FRAKTUR) },
  { id: 'en_bold_fraktur', category: 'social', nameEn: 'Bold Gothic', nameAr: 'قوطي عريض', transform: (s) => applyCharMap(s, MAP_BOLD_FRAKTUR) },
  { id: 'en_fullwidth', category: 'social', nameEn: 'Aesthetic Fullwidth', nameAr: 'عريض متباعد', transform: (s) => applyCharMap(s, MAP_FULLWIDTH) },
  { id: 'en_spaced', category: 'social', nameEn: 'Wide Spaced', nameAr: 'مسافات متباعدة', transform: (s) => joinWithSeparator(s, ' ') },
  { id: 'en_circled', category: 'social', nameEn: 'Circled Bubble', nameAr: 'فقاعات دائرية', transform: (s) => applyCharMap(s, MAP_CIRCLED) },
  { id: 'en_bubble_fill', category: 'social', nameEn: 'Negative Circled', nameAr: 'دوائر داكنة ممتلئة', transform: (s) => applyCharMap(s, MAP_BUBBLE_FILLED) },
  { id: 'en_squared', category: 'social', nameEn: 'Squared', nameAr: 'مربعات مفرغة', transform: (s) => applyCharMap(s, MAP_SQUARED) },
  { id: 'en_neg_squared', category: 'social', nameEn: 'Negative Squared', nameAr: 'مربعات داكنة', transform: (s) => applyCharMap(s, MAP_NEG_SQUARED) },
  { id: 'en_paren', category: 'social', nameEn: 'Parenthesized', nameAr: 'أقواس مصغّرة', transform: (s) => applyCharMap(s, MAP_PAREN) },
  { id: 'en_super', category: 'social', nameEn: 'Superscript Mini', nameAr: 'خط مرتفع مصغر', transform: (s) => applyCharMap(s, MAP_SUPERSCRIPT) },
  { id: 'en_sub', category: 'social', nameEn: 'Subscript Mini', nameAr: 'خط منخفض مصغر', transform: (s) => applyCharMap(s, MAP_SUBSCRIPT) },
  { id: 'en_upside', category: 'social', nameEn: 'Upside-Down', nameAr: 'مقلوب رأساً على عقب', transform: (s) => flipUpsideDown(s) },
  { id: 'en_mirror', category: 'social', nameEn: 'Mirror Reversed', nameAr: 'معكوس بالمرآة', transform: (s) => reverseMirror(s) },
  { id: 'en_strike', category: 'social', nameEn: 'Strikethrough', nameAr: 'خط مشطوب', transform: (s) => applyCombining(s, '\u0336') },
  { id: 'en_dbl_strike', category: 'social', nameEn: 'Double Strikethrough', nameAr: 'شطب مزدوج', transform: (s) => applyCombining(s, '\u0336\u0335') },
  { id: 'en_underline', category: 'social', nameEn: 'Underlined', nameAr: 'خط تحته سطر', transform: (s) => applyCombining(s, '\u0332') },
  { id: 'en_wave_under', category: 'social', nameEn: 'Wave Underlined', nameAr: 'خط مموج تحته', transform: (s) => applyCombining(s, '\u0330') },
  { id: 'en_slash', category: 'social', nameEn: 'Slash Through', nameAr: 'شرطة مائلة', transform: (s) => applyCombining(s, '\u0337') },
  { id: 'en_dotted', category: 'social', nameEn: 'Vaporwave Dotted', nameAr: 'منقوط أنيق', transform: (s) => joinWithSeparator(s, '·') },

  // ---- Arabic Ornate & Calligraphy (22 authentic Arabic styles) ----
  { id: 'ar_kashida_1', category: 'arabic', nameEn: 'Geometric Kashida (Short)', nameAr: 'كشيدة هندسية ناعمة', transform: (s) => applyArabicKashida(s, 1, 'all') },
  { id: 'ar_kashida_2', category: 'arabic', nameEn: 'Geometric Kashida (Medium)', nameAr: 'كشيدة هندسية متوسطة', transform: (s) => applyArabicKashida(s, 2, 'all') },
  { id: 'ar_kashida_3', category: 'arabic', nameEn: 'Royal Long Kashida', nameAr: 'تطويل ملوكي ممتد', transform: (s) => applyArabicKashida(s, 3, 'all') },
  { id: 'ar_kashida_end', category: 'arabic', nameEn: 'Tail-End Calligraphy', nameAr: 'مدّ أواخر الكلمات', transform: (s) => applyArabicKashida(s, 3, 'ends') },
  { id: 'ar_kashida_alt', category: 'arabic', nameEn: 'Rhythmic Kashida', nameAr: 'كشيدة إيقاعية متدرجة', transform: (s) => applyArabicKashida(s, 1, 'alternating') },
  { id: 'ar_tashkeel_soft', category: 'arabic', nameEn: 'Minimalist Diacritics', nameAr: 'تشكيل فني خفيف', transform: (s) => addArtisticTashkeel(s, 'soft') },
  { id: 'ar_tashkeel_kashida', category: 'arabic', nameEn: 'Kashida + Minimal Tashkeel', nameAr: 'كشيدة مع تشكيل أنيق', transform: (s) => applyArabicKashida(addArtisticTashkeel(s, 'soft'), 1, 'all') },
  { id: 'ar_tashkeel_ornate', category: 'arabic', nameEn: 'Ornate Diacritic Accents', nameAr: 'حركات زخرفية متناغمة', transform: (s) => applyArabicKashida(addArtisticTashkeel(s, 'ornate'), 2, 'ends') },
  { id: 'ar_persian_soft', category: 'arabic', nameEn: 'Nastaliq Variant Letters', nameAr: 'حروف فارسية ناعمة', transform: (s) => applyArabicKashida(mapArabicChars(s, AR_PERSIAN_SOFT), 1, 'all') },
  { id: 'ar_persian_ornate', category: 'arabic', nameEn: 'Calligraphic Variant', nameAr: 'خط مزخرف بحروف متصلة', transform: (s) => applyArabicKashida(mapArabicChars(s, AR_PERSIAN_SWAPS), 2, 'all') },
  { id: 'ar_dotless_kufic', category: 'arabic', nameEn: 'Dotless Classical Kufic', nameAr: 'رسم كوفي قديم بلا نقاط', transform: (s) => applyArabicKashida(mapArabicChars(s, AR_DOTLESS_MAP), 1, 'ends') },
  { id: 'ar_dotless_pure', category: 'arabic', nameEn: 'Pure Dotless Manuscript', nameAr: 'مخطوطة عربية بلا نقاط', transform: (s) => mapArabicChars(s, AR_DOTLESS_MAP) },
  { id: 'ar_frame_rub', category: 'arabic', nameEn: 'Andalusian Medallion', nameAr: 'إطار زخرفي أندلسي ۞', transform: (s) => wrapTrimmed(applyArabicKashida(s, 1, 'ends'), '۞ ', ' ۞') },
  { id: 'ar_frame_floral', category: 'arabic', nameEn: 'Calligraphic Wing', nameAr: 'أجنحة الخط العربي ༺ ༻', transform: (s) => wrapTrimmed(applyArabicKashida(s, 1, 'all'), '༺ ', ' ༻') },
  { id: 'ar_frame_guillemet', category: 'arabic', nameEn: 'Editorial Quotes', nameAr: 'تنصيص أدبي « »', transform: (s) => wrapTrimmed(applyArabicKashida(s, 1, 'ends'), '« ', ' »') },
  { id: 'ar_frame_bloom', category: 'arabic', nameEn: 'Floral Arabic Crest', nameAr: 'تاج الورد ❀', transform: (s) => wrapTrimmed(applyArabicKashida(s, 2, 'ends'), '❀ ', ' ❀') },
  { id: 'ar_frame_crescent', category: 'arabic', nameEn: 'Crescent Night', nameAr: 'زخرفة الهلال 🌙', transform: (s) => wrapTrimmed(applyArabicKashida(s, 1, 'all'), '🌙 ✦ ', ' ✦ 🌙') },
  { id: 'ar_frame_divider', category: 'arabic', nameEn: 'Signature Divider', nameAr: 'توقيع مذهّب ───', transform: (s) => wrapTrimmed(applyArabicKashida(s, 2, 'ends'), '• ── ✦ ', ' ✦ ── •') },
  { id: 'ar_frame_royal', category: 'arabic', nameEn: 'Royal Crest Arabic', nameAr: 'تاج ملكي عربي ♛', transform: (s) => wrapTrimmed(applyArabicKashida(mapArabicChars(s, AR_PERSIAN_SOFT), 2, 'ends'), '♛ 『 ', ' 』 ♛') },
  { id: 'ar_frame_sajdah', category: 'arabic', nameEn: 'Classic Ornament Frame', nameAr: 'زخرفة كلاسيكية ۩', transform: (s) => wrapTrimmed(applyArabicKashida(addArtisticTashkeel(s, 'soft'), 1, 'ends'), '۩ ', ' ۩') },
  { id: 'ar_frame_pearl', category: 'arabic', nameEn: 'Sparkle Calligraphy', nameAr: 'خط متلألئ ✨', transform: (s) => wrapTrimmed(applyArabicKashida(s, 2, 'all'), '✨ ◈ ', ' ◈ ✨') },
  { id: 'ar_frame_olive', category: 'arabic', nameEn: 'Botanical Script', nameAr: 'خط الغصن الهادئ 🌿', transform: (s) => wrapTrimmed(applyArabicKashida(s, 1, 'ends'), '🌿 「 ', ' 」 🌿') },

  // ---- Gaming & Clans (14 Clean Pro-Gaming & Clan Formats — Zero Violence) ----
  { id: 'gm_diamond', category: 'gaming', nameEn: 'Pro Diamond Tag', nameAr: 'تاج الماس الاحترافي', transform: (s) => `◈ ${applyCharMap(s, MAP_SANS_BOLD)} ◈` },
  { id: 'gm_volt', category: 'gaming', nameEn: 'Volt Pro Tag', nameAr: 'تاج البرق السريع', transform: (s) => `⚡ ${applyCharMap(s, MAP_SANS_BOLD)} ⚡` },
  { id: 'gm_jp_clean', category: 'gaming', nameEn: 'Esports Bracket', nameAr: 'قوس الرياضات الإلكترونية', transform: (s) => `「 ${applyCharMap(s, MAP_SMALL_CAPS)} 」` },
  { id: 'gm_lens', category: 'gaming', nameEn: 'Tactical Frame', nameAr: 'إطار تكتيكي أنيق', transform: (s) => `【 ${applyCharMap(s, MAP_SANS_BOLD)} 】` },
  { id: 'gm_arrow_duo', category: 'gaming', nameEn: 'Apex Converge', nameAr: 'أسهم القمة ▸ ◂', transform: (s) => `▸ ${applyCharMap(s, MAP_SANS_BOLD_ITALIC)} ◂` },
  { id: 'gm_ornament_4', category: 'gaming', nameEn: 'Guild Crest', nameAr: 'شعار النقابة ❖', transform: (s) => `❖ ${applyCharMap(s, MAP_SANS_BOLD)} ❖` },
  { id: 'gm_shell', category: 'gaming', nameEn: 'Minimalist Tag', nameAr: 'تاج النخبة 〘 〙', transform: (s) => `〘 ${applyCharMap(s, MAP_MONOSPACE)} 〙` },
  { id: 'gm_clan_legend', category: 'gaming', nameEn: 'Classic Clan Legend', nameAr: 'زخرفة كلانات أسطورية ꧁༒☬', transform: (s) => `꧁༒☬${applyCharMap(s, MAP_BOLD_FRAKTUR)}☬༒꧂` },
  { id: 'gm_star_shinobi', category: 'gaming', nameEn: 'Star Shinobi Clan', nameAr: 'كلان النجمة ★彡', transform: (s) => `★彡[${applyCharMap(s, MAP_SANS_BOLD)}]彡★` },
  { id: 'gm_crown_clan', category: 'gaming', nameEn: 'Royal Champion Clan', nameAr: 'كلان التاج الملكي ♛『 』♛', transform: (s) => `♛『${applyCharMap(s, MAP_SANS_BOLD)}』♛` },
  { id: 'gm_x_jp', category: 'gaming', nameEn: 'Arena Clan Mark', nameAr: 'علامة الحلبة 乡', transform: (s) => `乡${applyCharMap(s, MAP_SANS_BOLD)}乡` },
  { id: 'gm_tsu_smile', category: 'gaming', nameEn: 'Pro Smile Tag', nameAr: 'وسم اللاعب المحترف ツ', transform: (s) => `ツ ${applyCharMap(s, MAP_SANS_BOLD)} ツ` },
  { id: 'gm_gem_elite', category: 'gaming', nameEn: 'Diamond League', nameAr: 'دوري الألماس 💎', transform: (s) => `💎 「 ${applyCharMap(s, MAP_SANS_BOLD)} 」 💎` },
  { id: 'gm_trophy_mvp', category: 'gaming', nameEn: 'MVP Champion', nameAr: 'تاج البطولة 🏆', transform: (s) => `🏆 ◈ ${applyCharMap(s, MAP_SMALL_CAPS)} ◈ 🏆` }
];

export function formatFancyText(rawText, style, frameKey = 'none') {
  const transformed = style.transform(rawText);
  const frame = FRAME_MAP.get(frameKey) || FRAME_OPTIONS[0];
  return `${frame.prefix}${transformed}${frame.suffix}`;
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

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => typeof id === 'string'));
  } catch (_) {
    return new Set();
  }
}

function saveFavorites(favSet) {
  try {
    localStorage.setItem(FAVS_STORAGE_KEY, JSON.stringify(Array.from(favSet)));
  } catch (_) {
    // Ignore storage quota errors
  }
}

function initFancyText() {
  const inputEl = document.getElementById('fancyInput');
  const cardsGrid = document.getElementById('fancyCardsGrid');
  if (!inputEl || !cardsGrid) return;

  const btnSample = document.getElementById('btnSample');
  const btnPaste = document.getElementById('btnPaste');
  const btnClear = document.getElementById('btnClear');
  const charCountEl = document.getElementById('charCount');

  const frameSelector = document.getElementById('frameSelector');
  const btnFramePrev = document.getElementById('btnFramePrev');
  const btnFrameNext = document.getElementById('btnFrameNext');

  const symbolGroupTabs = document.getElementById('symbolGroupTabs');
  const symbolsStrip = document.getElementById('symbolsStrip');
  const btnSymPrev = document.getElementById('btnSymPrev');
  const btnSymNext = document.getElementById('btnSymNext');

  const catTabsWrap = document.getElementById('fancyCategoryTabs');
  const favCountBadge = document.getElementById('favCountBadge');
  const stylesCountNote = document.getElementById('stylesCountNote');

  let activeCategory = 'all';
  let activeFrame = 'none';
  let activeSymbolGroup = 'faces';
  let sampleCycleIdx = 0;
  const favorites = loadFavorites();
  const copyTimers = new WeakMap();

  const SAMPLES_EN = ['imgsfix', 'Nova Creative', 'Golden Horizon'];
  const SAMPLES_AR = ['إبداع', 'أحمد السالم', 'آفاق التصميم'];

  function getDisplayText() {
    const val = inputEl.value;
    if (val.trim() !== '') return val;
    return getLang() === 'ar' ? 'إبداع' : 'imgsfix';
  }

  function updateCharCounter() {
    if (charCountEl) {
      charCountEl.textContent = String(inputEl.value.length);
    }
  }

  function updateFavCount() {
    if (favCountBadge) {
      favCountBadge.textContent = `(${favorites.size})`;
    }
  }

  function scrollHorizontalStrip(stripEl, direction) {
    if (!stripEl) return;
    const isRtl = document.documentElement.dir === 'rtl' || getLang() === 'ar';
    const delta = (isRtl ? -1 : 1) * direction * 180;
    stripEl.scrollBy({ left: delta, behavior: 'smooth' });
  }

  function selectFrame(key) {
    activeFrame = key;
    document.querySelectorAll('.ft-frame-btn[data-frame]').forEach((b) => {
      const isAct = b.dataset.frame === activeFrame;
      b.classList.toggle('active', isAct);
      b.setAttribute('aria-pressed', isAct ? 'true' : 'false');
    });
    renderCards();
  }

  function createFrameButton(frameOpt) {
    const active = frameOpt.key === activeFrame;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `ft-frame-btn${active ? ' active' : ''}`;
    btn.dataset.frame = frameOpt.key;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    if (frameOpt.labelKey) {
      btn.setAttribute('aria-label', t(frameOpt.labelKey));
    }
    btn.textContent = frameOpt.label;
    btn.addEventListener('click', () => {
      selectFrame(frameOpt.key);
    });
    return btn;
  }

  function renderFrames() {
    if (!frameSelector) return;
    while (frameSelector.firstChild) frameSelector.removeChild(frameSelector.firstChild);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < FRAME_OPTIONS.length; i++) {
      frag.appendChild(createFrameButton(FRAME_OPTIONS[i]));
    }
    frameSelector.appendChild(frag);
  }

  async function handleSymbolPick(sym, btnEl) {
    const start = inputEl.selectionStart ?? inputEl.value.length;
    const end = inputEl.selectionEnd ?? inputEl.value.length;
    const next = inputEl.value.slice(0, start) + sym + inputEl.value.slice(end);
    inputEl.value = next.slice(0, MAX_INPUT_LEN);
    inputEl.focus();
    const pos = Math.min(start + sym.length, inputEl.value.length);
    inputEl.setSelectionRange(pos, pos);
    renderCards();

    let copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(sym);
        copied = true;
      } catch (_) {
        copied = false;
      }
    }
    btnEl.classList.add('is-done');
    setTimeout(() => btnEl.classList.remove('is-done'), 900);
    toast(copied ? t('ft_sym_inserted_copied') : t('ft_sym_appended_ok'), 'ok');
  }

  function createSymbolButton(sym) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ft-sym-btn';
    btn.textContent = sym;
    btn.setAttribute('aria-label', sym);
    btn.addEventListener('click', () => {
      handleSymbolPick(sym, btn);
    });
    return btn;
  }

  function renderSymbols() {
    if (!symbolsStrip) return;
    const items = SYMBOL_GROUPS[activeSymbolGroup] || SYMBOL_GROUPS.faces;
    while (symbolsStrip.firstChild) symbolsStrip.removeChild(symbolsStrip.firstChild);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < items.length; i++) {
      frag.appendChild(createSymbolButton(items[i]));
    }
    symbolsStrip.appendChild(frag);
    symbolsStrip.scrollLeft = 0;
  }

  function getOrderedStyles() {
    let list;
    if (activeCategory === 'favorites') {
      list = FANCY_STYLES.filter((st) => favorites.has(st.id));
    } else if (activeCategory === 'all') {
      list = FANCY_STYLES.slice();
    } else {
      list = FANCY_STYLES.filter((st) => st.category === activeCategory);
    }

    const favs = [];
    const rest = [];
    for (let i = 0; i < list.length; i++) {
      if (favorites.has(list[i].id)) {
        favs.push(list[i]);
      } else {
        rest.push(list[i]);
      }
    }
    return favs.concat(rest);
  }

  async function copyCardOutput(text, cardEl, copyBtnEl) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      toast(t('ts_copy_err'), 'err');
      return;
    }

    const prevTimer = copyTimers.get(copyBtnEl);
    if (prevTimer) clearTimeout(prevTimer);

    cardEl.classList.add('is-copied');
    copyBtnEl.classList.add('is-copied');
    copyBtnEl.textContent = t('ft_copied_btn');
    toast(t('ft_copied_ok'), 'ok');

    const timer = setTimeout(() => {
      cardEl.classList.remove('is-copied');
      copyBtnEl.classList.remove('is-copied');
      copyBtnEl.textContent = t('ts_btn_copy');
    }, 1600);
    copyTimers.set(copyBtnEl, timer);
  }

  function renderCards() {
    const lang = getLang();
    const sourceText = getDisplayText();
    const list = getOrderedStyles();

    updateCharCounter();
    updateFavCount();
    if (stylesCountNote) {
      stylesCountNote.textContent = `${list.length} ${t('ft_styles_unit')}`;
    }

    while (cardsGrid.firstChild) {
      cardsGrid.removeChild(cardsGrid.firstChild);
    }

    if (list.length === 0) {
      const emptyBox = document.createElement('div');
      emptyBox.className = 'ft-empty-box';
      const p = document.createElement('p');
      p.textContent = t('ft_favs_empty');
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'btn btn-primary btn-sm';
      backBtn.textContent = t('ft_tab_all');
      backBtn.addEventListener('click', () => {
        setCategory('all');
      });
      emptyBox.appendChild(p);
      emptyBox.appendChild(backBtn);
      cardsGrid.appendChild(emptyBox);
      return;
    }

    const frag = document.createDocumentFragment();

    for (let i = 0; i < list.length; i++) {
      const style = list[i];
      const output = formatFancyText(sourceText, style, activeFrame);
      const isFav = favorites.has(style.id);

      const card = document.createElement('div');
      card.className = 'ft-style-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${lang === 'ar' ? style.nameAr : style.nameEn}: ${t('ts_btn_copy')}`);

      const topRow = document.createElement('div');
      topRow.className = 'ft-card-top';

      const meta = document.createElement('div');
      meta.className = 'ft-style-meta';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'ft-style-name';
      nameSpan.textContent = lang === 'ar' ? style.nameAr : style.nameEn;
      meta.appendChild(nameSpan);

      const actions = document.createElement('div');
      actions.className = 'ft-card-actions';

      const favBtn = document.createElement('button');
      favBtn.type = 'button';
      favBtn.className = `ft-fav-btn${isFav ? ' is-fav' : ''}`;
      favBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      favBtn.setAttribute('aria-label', t('ft_toggle_fav'));
      favBtn.textContent = isFav ? '★' : '☆';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'ft-copy-btn';
      copyBtn.textContent = t('ts_btn_copy');

      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (favorites.has(style.id)) {
          favorites.delete(style.id);
        } else {
          favorites.add(style.id);
        }
        saveFavorites(favorites);
        renderCards();
      });

      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyCardOutput(output, card, copyBtn);
      });

      card.addEventListener('click', () => {
        copyCardOutput(output, card, copyBtn);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (document.activeElement === favBtn || document.activeElement === copyBtn) return;
          e.preventDefault();
          copyCardOutput(output, card, copyBtn);
        }
      });

      actions.appendChild(favBtn);
      actions.appendChild(copyBtn);
      topRow.appendChild(meta);
      topRow.appendChild(actions);

      const preview = document.createElement('div');
      preview.className = 'ft-style-preview';
      preview.setAttribute('dir', 'auto');
      preview.textContent = output;

      card.appendChild(topRow);
      card.appendChild(preview);
      frag.appendChild(card);
    }

    cardsGrid.appendChild(frag);
  }

  function setCategory(cat) {
    activeCategory = cat;
    if (catTabsWrap) {
      catTabsWrap.querySelectorAll('.ft-cat-tab').forEach((btn) => {
        const active = btn.dataset.cat === cat;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }
    renderCards();
    cardsGrid.scrollLeft = 0;
  }

  inputEl.addEventListener('input', () => {
    if (inputEl.value.length > MAX_INPUT_LEN) {
      inputEl.value = inputEl.value.slice(0, MAX_INPUT_LEN);
    }
    renderCards();
  });

  if (btnSample) {
    btnSample.addEventListener('click', () => {
      const pool = getLang() === 'ar' ? SAMPLES_AR : SAMPLES_EN;
      inputEl.value = pool[sampleCycleIdx % pool.length];
      sampleCycleIdx += 1;
      renderCards();
      inputEl.focus();
    });
  }

  if (btnPaste) {
    btnPaste.addEventListener('click', async () => {
      inputEl.value = '';
      if (navigator.clipboard && navigator.clipboard.readText) {
        try {
          const clip = await navigator.clipboard.readText();
          if (!clip || !clip.trim()) {
            toast(t('ts_clipboard_empty'), 'err');
            inputEl.focus();
            renderCards();
            return;
          }
          inputEl.value = clip.trim().slice(0, MAX_INPUT_LEN);
          renderCards();
          toast(t('ts_pasted_ok'), 'ok');
          return;
        } catch (_) {
          // Fallback below
        }
      }
      inputEl.focus();
      renderCards();
      toast(t('ts_paste_fallback'));
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      inputEl.value = '';
      renderCards();
      inputEl.focus();
    });
  }

  if (btnFramePrev) btnFramePrev.addEventListener('click', () => scrollHorizontalStrip(frameSelector, -1));
  if (btnFrameNext) btnFrameNext.addEventListener('click', () => scrollHorizontalStrip(frameSelector, 1));
  if (btnSymPrev) btnSymPrev.addEventListener('click', () => scrollHorizontalStrip(symbolsStrip, -1));
  if (btnSymNext) btnSymNext.addEventListener('click', () => scrollHorizontalStrip(symbolsStrip, 1));

  if (catTabsWrap) {
    catTabsWrap.querySelectorAll('.ft-cat-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        setCategory(btn.dataset.cat || 'all');
      });
    });
  }

  if (symbolGroupTabs) {
    symbolGroupTabs.querySelectorAll('.ft-sym-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeSymbolGroup = btn.dataset.symgroup || 'faces';
        symbolGroupTabs.querySelectorAll('.ft-sym-tab').forEach((b) => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        renderSymbols();
      });
    });
  }

  document.addEventListener('imgsfix:langchange', () => {
    renderFrames();
    renderCards();
  });

  renderFrames();
  renderCards();
  renderSymbols();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFancyText);
  } else {
    initFancyText();
  }
}

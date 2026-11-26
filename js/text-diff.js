/* ==========================================================================
   imgsfix — Text Diff & Compare Tool
   100% Client-Side Vanilla ES Module · Fast LCS Engine (< 20ms) · Strict XSS Safety
   ========================================================================== */

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_TEXT_CHARS = 500000;
const MAX_DP_CELLS = 1800000;

const WORD_PIECE_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*|\r\n|\n|[ \t]+|\S/gu;
const HORIZ_WS_RE = /^[ \t]+$/;

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

/**
 * Core LCS sequence diff on arrays `a` and `b` using `keyFn` for equality.
 * Uses prefix/suffix trimming + Int32Array DP matrix, with a fast anchor-based
 * fallback when changed slices exceed MAX_DP_CELLS to stay < 20ms.
 */
function lcsDiffSlices(a, b, keyFn) {
  const lenA = a.length;
  const lenB = b.length;

  let prefix = 0;
  while (prefix < lenA && prefix < lenB && keyFn(a[prefix]) === keyFn(b[prefix])) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < lenA - prefix &&
    suffix < lenB - prefix &&
    keyFn(a[lenA - 1 - suffix]) === keyFn(b[lenB - 1 - suffix])
  ) {
    suffix += 1;
  }

  const ops = [];
  for (let i = 0; i < prefix; i++) {
    ops.push({ type: 'eq', oldVal: a[i], newVal: b[i] });
  }

  const midA = a.slice(prefix, lenA - suffix);
  const midB = b.slice(prefix, lenB - suffix);
  const m = midA.length;
  const n = midB.length;

  if (m === 0 && n > 0) {
    for (let j = 0; j < n; j++) ops.push({ type: 'add', newVal: midB[j] });
  } else if (n === 0 && m > 0) {
    for (let i = 0; i < m; i++) ops.push({ type: 'del', oldVal: midA[i] });
  } else if (m > 0 && n > 0) {
    if (m * n <= MAX_DP_CELLS) {
      const cols = n + 1;
      const dp = new Int32Array((m + 1) * cols);

      const keysA = midA.map(keyFn);
      const keysB = midB.map(keyFn);

      for (let i = 1; i <= m; i++) {
        const ki = keysA[i - 1];
        const rowOff = i * cols;
        const prevOff = (i - 1) * cols;
        for (let j = 1; j <= n; j++) {
          if (ki === keysB[j - 1]) {
            dp[rowOff + j] = dp[prevOff + (j - 1)] + 1;
          } else {
            const up = dp[prevOff + j];
            const left = dp[rowOff + (j - 1)];
            dp[rowOff + j] = up >= left ? up : left;
          }
        }
      }

      const rev = [];
      let i = m;
      let j = n;
      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && keysA[i - 1] === keysB[j - 1]) {
          rev.push({ type: 'eq', oldVal: midA[i - 1], newVal: midB[j - 1] });
          i -= 1;
          j -= 1;
        } else if (j > 0 && (i === 0 || dp[i * cols + (j - 1)] >= dp[(i - 1) * cols + j])) {
          rev.push({ type: 'add', newVal: midB[j - 1] });
          j -= 1;
        } else {
          rev.push({ type: 'del', oldVal: midA[i - 1] });
          i -= 1;
        }
      }
      for (let k = rev.length - 1; k >= 0; k--) {
        ops.push(rev[k]);
      }
    } else {
      // Fast O(m + n) anchor fallback for gigantic unmatched diffs
      const bIndex = new Map();
      for (let j = 0; j < n; j++) {
        const k = keyFn(midB[j]);
        if (!bIndex.has(k)) bIndex.set(k, []);
        bIndex.get(k).push(j);
      }

      let i = 0;
      let j = 0;
      while (i < m && j < n) {
        const ka = keyFn(midA[i]);
        const kb = keyFn(midB[j]);
        if (ka === kb) {
          ops.push({ type: 'eq', oldVal: midA[i], newVal: midB[j] });
          i += 1;
          j += 1;
          continue;
        }
        const matches = bIndex.get(ka);
        let nextJ = -1;
        if (matches) {
          for (let q = 0; q < matches.length; q++) {
            if (matches[q] >= j && matches[q] - j <= 120) {
              nextJ = matches[q];
              break;
            }
          }
        }
        if (nextJ !== -1) {
          while (j < nextJ) {
            ops.push({ type: 'add', newVal: midB[j] });
            j += 1;
          }
          ops.push({ type: 'eq', oldVal: midA[i], newVal: midB[j] });
          i += 1;
          j += 1;
        } else {
          ops.push({ type: 'del', oldVal: midA[i] });
          i += 1;
        }
      }
      while (i < m) {
        ops.push({ type: 'del', oldVal: midA[i] });
        i += 1;
      }
      while (j < n) {
        ops.push({ type: 'add', newVal: midB[j] });
        j += 1;
      }
    }
  }

  for (let s = suffix; s > 0; s--) {
    ops.push({ type: 'eq', oldVal: a[lenA - s], newVal: b[lenB - s] });
  }

  return ops;
}

function tokenizeWords(text, ignoreWhitespace) {
  const normalized = text.replace(/\r\n?/g, '\n');
  let raw = normalized.match(WORD_PIECE_RE) || [];
  if (ignoreWhitespace) {
    // Trim leading/trailing spaces per line and collapse horizontal runs to single space
    const compact = [];
    for (let i = 0; i < raw.length; i++) {
      const tok = raw[i];
      if (HORIZ_WS_RE.test(tok)) {
        const prev = compact[compact.length - 1];
        if (!prev || prev === '\n' || prev === ' ') continue;
        compact.push(' ');
      } else if (tok === '\n') {
        if (compact[compact.length - 1] === ' ') compact.pop();
        compact.push('\n');
      } else {
        compact.push(tok);
      }
    }
    while (compact[compact.length - 1] === ' ' || compact[compact.length - 1] === '\n') {
      compact.pop();
    }
    raw = compact;
  }
  return raw;
}

export function computeWordDiff(origText, modText, opts = {}) {
  const ignoreWhitespace = Boolean(opts.ignoreWhitespace);
  const ignoreCase = Boolean(opts.ignoreCase);

  const tokensA = tokenizeWords(origText, ignoreWhitespace);
  const tokensB = tokenizeWords(modText, ignoreWhitespace);

  // When comparing word-by-word on multi-paragraph documents, first align paragraphs/lines
  // if needed so DP stays tiny and fast even for long contracts/articles.
  const keyFn = (tok) => (ignoreCase ? tok.toLowerCase() : tok);

  let rawOps;
  if (tokensA.length * tokensB.length > MAX_DP_CELLS) {
    // Paragraph-level anchor alignment then word-level diff inside paired blocks
    const linesA = origText.replace(/\r\n?/g, '\n').split('\n');
    const linesB = modText.replace(/\r\n?/g, '\n').split('\n');
    const lineKey = (line) => {
      let s = line;
      if (ignoreWhitespace) s = s.replace(/[ \t]+/g, ' ').trim();
      if (ignoreCase) s = s.toLowerCase();
      return s;
    };
    const lineOps = lcsDiffSlices(linesA, linesB, lineKey);
    rawOps = [];
    let pendingDel = [];
    let pendingAdd = [];

    const flushPending = () => {
      if (pendingDel.length > 0 || pendingAdd.length > 0) {
        const subA = tokenizeWords(pendingDel.join('\n'), ignoreWhitespace);
        const subB = tokenizeWords(pendingAdd.join('\n'), ignoreWhitespace);
        const subOps = lcsDiffSlices(subA, subB, keyFn);
        for (let k = 0; k < subOps.length; k++) rawOps.push(subOps[k]);
        if (rawOps.length > 0) {
          rawOps.push({ type: 'eq', oldVal: '\n', newVal: '\n' });
        }
        pendingDel = [];
        pendingAdd = [];
      }
    };

    for (let i = 0; i < lineOps.length; i++) {
      const op = lineOps[i];
      if (op.type === 'eq') {
        flushPending();
        const eqToks = tokenizeWords(op.newVal + (i < lineOps.length - 1 ? '\n' : ''), ignoreWhitespace);
        for (let k = 0; k < eqToks.length; k++) {
          rawOps.push({ type: 'eq', oldVal: eqToks[k], newVal: eqToks[k] });
        }
      } else if (op.type === 'del') {
        pendingDel.push(op.oldVal);
      } else {
        pendingAdd.push(op.newVal);
      }
    }
    flushPending();
  } else {
    rawOps = lcsDiffSlices(tokensA, tokensB, keyFn);
  }

  // Merge contiguous segments of same op type & count non-whitespace tokens
  const segments = [];
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (let i = 0; i < rawOps.length; i++) {
    const op = rawOps[i];
    const text = op.type === 'del' ? op.oldVal : op.newVal;
    const isMeaningful = /\S/.test(text);

    if (op.type === 'add') {
      if (isMeaningful) additions += 1;
    } else if (op.type === 'del') {
      if (isMeaningful) deletions += 1;
    } else {
      if (isMeaningful) unchanged += 1;
    }

    const last = segments[segments.length - 1];
    if (last && last.type === op.type) {
      last.text += text;
    } else {
      segments.push({ type: op.type, text });
    }
  }

  // Re-order contiguous del+add pairs consistently: del immediately before add
  const ordered = [];
  let idx = 0;
  while (idx < segments.length) {
    if (
      idx + 1 < segments.length &&
      segments[idx].type === 'add' &&
      segments[idx + 1].type === 'del'
    ) {
      ordered.push(segments[idx + 1], segments[idx]);
      idx += 2;
    } else {
      ordered.push(segments[idx]);
      idx += 1;
    }
  }

  return {
    mode: 'word',
    segments: ordered,
    additions,
    deletions,
    unchanged,
    identical: additions === 0 && deletions === 0 && ordered.every((s) => s.type === 'eq')
  };
}

export function computeLineDiff(origText, modText, opts = {}) {
  const ignoreWhitespace = Boolean(opts.ignoreWhitespace);
  const ignoreCase = Boolean(opts.ignoreCase);

  const linesA = origText === '' ? [] : origText.replace(/\r\n?/g, '\n').split('\n');
  const linesB = modText === '' ? [] : modText.replace(/\r\n?/g, '\n').split('\n');

  const keyFn = (line) => {
    let s = line;
    if (ignoreWhitespace) s = s.replace(/[ \t]+/g, ' ').trim();
    if (ignoreCase) s = s.toLowerCase();
    return s;
  };

  const rawOps = lcsDiffSlices(linesA, linesB, keyFn);
  const rows = [];
  let lnA = 0;
  let lnB = 0;
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (let i = 0; i < rawOps.length; i++) {
    const op = rawOps[i];
    if (op.type === 'eq') {
      lnA += 1;
      lnB += 1;
      unchanged += 1;
      rows.push({ type: 'eq', origLn: lnA, modLn: lnB, text: op.newVal });
    } else if (op.type === 'del') {
      lnA += 1;
      deletions += 1;
      rows.push({ type: 'del', origLn: lnA, modLn: null, text: op.oldVal });
    } else {
      lnB += 1;
      additions += 1;
      rows.push({ type: 'add', origLn: null, modLn: lnB, text: op.newVal });
    }
  }

  return {
    mode: 'line',
    rows,
    additions,
    deletions,
    unchanged,
    identical: additions === 0 && deletions === 0
  };
}

function initTextDiff() {
  const origEl = document.getElementById('originalText');
  const modEl = document.getElementById('modifiedText');
  if (!origEl || !modEl) return;

  const $ = (sel) => document.querySelector(sel);
  const btnCompare = $('#btnCompare');
  const btnSwap = $('#btnSwap');
  const btnSample = $('#btnSample');
  const btnClear = $('#btnClear');

  const modeBtns = Array.from(document.querySelectorAll('#diffModeToggle .ts-ratio-btn'));
  const optIgnoreWs = $('#optIgnoreWs');
  const optIgnoreCase = $('#optIgnoreCase');

  const btnOrigPaste = $('#btnOrigPaste');
  const btnOrigUpload = $('#btnOrigUpload');
  const btnOrigSelectAll = $('#btnOrigSelectAll');
  const btnOrigClear = $('#btnOrigClear');
  const origFileInput = $('#origFileInput');

  const btnModPaste = $('#btnModPaste');
  const btnModUpload = $('#btnModUpload');
  const btnModSelectAll = $('#btnModSelectAll');
  const btnModClear = $('#btnModClear');
  const modFileInput = $('#modFileInput');

  const statAdds = $('#statAdds');
  const statDels = $('#statDels');
  const statSame = $('#statSame');
  const statIdentical = $('#statIdentical');
  const diffOutput = $('#diffOutput');
  const btnCopyReport = $('#btnCopyReport');
  const btnDownloadReport = $('#btnDownloadReport');

  let currentMode = 'word';
  let lastResult = null;

  function formatNumber(n) {
    return n.toLocaleString('en-US');
  }

  function updateStatsBar(result) {
    if (!result) {
      statAdds.textContent = `+0 ${t('td_stat_additions')}`;
      statDels.textContent = `-0 ${t('td_stat_deletions')}`;
      statSame.textContent = `0 ${t('td_stat_unchanged')}`;
      statIdentical.classList.add('hide');
      return;
    }

    statAdds.textContent = `+${formatNumber(result.additions)} ${t('td_stat_additions')}`;
    statDels.textContent = `-${formatNumber(result.deletions)} ${t('td_stat_deletions')}`;
    statSame.textContent = `${formatNumber(result.unchanged)} ${t('td_stat_unchanged')}`;
    statIdentical.classList.toggle('hide', !result.identical);
  }

  function clearDiffOutput() {
    lastResult = null;
    btnCopyReport.disabled = true;
    btnDownloadReport.disabled = true;
    updateStatsBar(null);

    while (diffOutput.firstChild) {
      diffOutput.removeChild(diffOutput.firstChild);
    }

    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'ts-empty-output';

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '42');
    svg.setAttribute('height', '42');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    const r1 = document.createElementNS(ns, 'rect');
    r1.setAttribute('x', '3');
    r1.setAttribute('y', '4');
    r1.setAttribute('width', '8');
    r1.setAttribute('height', '16');
    r1.setAttribute('rx', '1.5');
    const r2 = document.createElementNS(ns, 'rect');
    r2.setAttribute('x', '13');
    r2.setAttribute('y', '4');
    r2.setAttribute('width', '8');
    r2.setAttribute('height', '16');
    r2.setAttribute('rx', '1.5');
    const p1 = document.createElementNS(ns, 'path');
    p1.setAttribute('d', 'M6 9h2');
    const p2 = document.createElementNS(ns, 'path');
    p2.setAttribute('d', 'M16 9h2');
    const p3 = document.createElementNS(ns, 'path');
    p3.setAttribute('d', 'M16 13h2');
    svg.appendChild(r1);
    svg.appendChild(r2);
    svg.appendChild(p1);
    svg.appendChild(p2);
    svg.appendChild(p3);

    const p = document.createElement('p');
    p.textContent = t('td_empty_hint');

    emptyDiv.appendChild(svg);
    emptyDiv.appendChild(p);
    diffOutput.appendChild(emptyDiv);
  }

  function renderWordDiff(result) {
    while (diffOutput.firstChild) {
      diffOutput.removeChild(diffOutput.firstChild);
    }

    const wrap = document.createElement('div');
    wrap.className = 'td-inline-view';
    wrap.setAttribute('dir', 'auto');

    for (let i = 0; i < result.segments.length; i++) {
      const seg = result.segments[i];
      if (seg.type === 'add') {
        const ins = document.createElement('ins');
        ins.className = 'td-ins';
        ins.textContent = seg.text;
        wrap.appendChild(ins);
      } else if (seg.type === 'del') {
        const del = document.createElement('del');
        del.className = 'td-del';
        del.textContent = seg.text;
        wrap.appendChild(del);
      } else {
        wrap.appendChild(document.createTextNode(seg.text));
      }
    }

    diffOutput.appendChild(wrap);
  }

  function renderLineDiff(result) {
    while (diffOutput.firstChild) {
      diffOutput.removeChild(diffOutput.firstChild);
    }

    const table = document.createElement('table');
    table.className = 'td-line-table';
    const tbody = document.createElement('tbody');

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      const tr = document.createElement('tr');
      tr.className = `td-line-row ${row.type === 'add' ? 'is-add' : row.type === 'del' ? 'is-del' : 'is-eq'}`;

      const tdOrig = document.createElement('td');
      tdOrig.className = 'td-ln';
      tdOrig.textContent = row.origLn !== null ? String(row.origLn) : '';

      const tdMod = document.createElement('td');
      tdMod.className = 'td-ln';
      tdMod.textContent = row.modLn !== null ? String(row.modLn) : '';

      const tdSign = document.createElement('td');
      tdSign.className = 'td-sign';
      tdSign.textContent = row.type === 'add' ? '+' : row.type === 'del' ? '-' : '·';

      const tdCode = document.createElement('td');
      tdCode.className = 'td-line-code';
      tdCode.setAttribute('dir', 'auto');
      tdCode.textContent = row.text === '' ? ' ' : row.text;

      tr.appendChild(tdOrig);
      tr.appendChild(tdMod);
      tr.appendChild(tdSign);
      tr.appendChild(tdCode);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    diffOutput.appendChild(table);
  }

  function enforceMaxLen(el) {
    if (el.value.length > MAX_TEXT_CHARS) {
      el.value = el.value.slice(0, MAX_TEXT_CHARS);
      toast(t('ts_text_too_long'), 'err');
    }
  }

  function runCompare(silentIfEmpty) {
    enforceMaxLen(origEl);
    enforceMaxLen(modEl);

    const a = origEl.value;
    const b = modEl.value;

    if (!a && !b) {
      if (!silentIfEmpty) {
        toast(t('td_enter_both'), 'err');
      }
      clearDiffOutput();
      return;
    }

    const opts = {
      ignoreWhitespace: optIgnoreWs.checked,
      ignoreCase: optIgnoreCase.checked
    };

    lastResult = currentMode === 'line'
      ? computeLineDiff(a, b, opts)
      : computeWordDiff(a, b, opts);

    updateStatsBar(lastResult);
    if (lastResult.mode === 'line') {
      renderLineDiff(lastResult);
    } else {
      renderWordDiff(lastResult);
    }

    btnCopyReport.disabled = false;
    btnDownloadReport.disabled = false;
  }

  function buildPlainReport(result) {
    const modeLabel = result.mode === 'line' ? t('td_mode_line') : t('td_mode_word');
    const lines = [
      t('t_diff_t'),
      '='.repeat(30),
      `${modeLabel} · +${formatNumber(result.additions)} ${t('td_stat_additions')} · -${formatNumber(result.deletions)} ${t('td_stat_deletions')} · ${formatNumber(result.unchanged)} ${t('td_stat_unchanged')}`,
      result.identical ? t('td_identical') : '',
      '-'.repeat(30)
    ].filter(Boolean);

    if (result.mode === 'line') {
      result.rows.forEach((row) => {
        const prefix = row.type === 'add' ? '+ ' : row.type === 'del' ? '- ' : '  ';
        lines.push(`${prefix}${row.text}`);
      });
    } else {
      let inline = '';
      result.segments.forEach((seg) => {
        if (seg.type === 'add') {
          inline += `[+${seg.text}]`;
        } else if (seg.type === 'del') {
          inline += `[-${seg.text}]`;
        } else {
          inline += seg.text;
        }
      });
      lines.push(inline);
    }

    return lines.join('\n');
  }

  function bindPaneControls(textarea, pasteBtn, uploadBtn, fileInput, selectAllBtn, clearBtn) {
    pasteBtn.addEventListener('click', async () => {
      textarea.value = '';
      if (navigator.clipboard && navigator.clipboard.readText) {
        try {
          const clip = await navigator.clipboard.readText();
          if (!clip || !clip.trim()) {
            toast(t('ts_clipboard_empty'), 'err');
            textarea.focus();
            return;
          }
          textarea.value = clip.slice(0, MAX_TEXT_CHARS);
          toast(t('ts_pasted_ok'), 'ok');
          return;
        } catch (_) {
          // Fallback below
        }
      }
      textarea.focus();
      toast(t('ts_paste_fallback'));
    });

    uploadBtn.addEventListener('click', () => {
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
        textarea.value = content.slice(0, MAX_TEXT_CHARS);
        toast(t('ts_file_loaded_ok'), 'ok');
      };
      reader.onerror = () => {
        toast(t('ts_file_read_err'), 'err');
      };
      reader.readAsText(file, 'UTF-8');
    });

    selectAllBtn.addEventListener('click', () => {
      textarea.focus();
      textarea.select();
    });

    clearBtn.addEventListener('click', () => {
      textarea.value = '';
      fileInput.value = '';
      textarea.focus();
      if (!origEl.value && !modEl.value) {
        clearDiffOutput();
      }
    });
  }

  bindPaneControls(origEl, btnOrigPaste, btnOrigUpload, origFileInput, btnOrigSelectAll, btnOrigClear);
  bindPaneControls(modEl, btnModPaste, btnModUpload, modFileInput, btnModSelectAll, btnModClear);

  btnCompare.addEventListener('click', () => runCompare(false));

  btnSwap.addEventListener('click', () => {
    const tmp = origEl.value;
    origEl.value = modEl.value;
    modEl.value = tmp;
    if (origEl.value || modEl.value) {
      runCompare(true);
    }
    toast(t('td_swapped_ok'));
  });

  btnSample.addEventListener('click', () => {
    const lang = getLang();
    if (lang === 'ar') {
      origEl.value =
        'اتفاقية مستوى الخدمة (البند الرابع):\n' +
        'يلتزم مزود الخدمة بتسليم جميع التقارير الشهرية خلال خمسة أيام عمل من نهاية كل شهر ميلادي.\n' +
        'يُسمح للعميل بمراجعة النسخة الأولية وإبداء الملاحظات خلال 48 ساعة فقط.\n' +
        'تُطبق شروط الخصوصية القياسية على كافة الملفات المرفوعة.';
      modEl.value =
        'اتفاقية مستوى الخدمة (البند الرابع - محدّث):\n' +
        'يلتزم مزود الخدمة بتسليم جميع التقارير الشهرية التفصيلية خلال ثلاثة أيام عمل من نهاية كل شهر ميلادي.\n' +
        'يُسمح للعميل بمراجعة النسخة الأولية وإبداء الملاحظات والتعديلات خلال 72 ساعة عمل.\n' +
        'تُعالج كافة الملفات محلياً 100٪ داخل المتصفح وتُطبق شروط الخصوصية المعززة.';
    } else {
      origEl.value =
        'Service Level Agreement (Clause 4):\n' +
        'The provider shall deliver monthly analytics reports within five business days after month end.\n' +
        'Client review feedback must be submitted within 48 hours of initial delivery.\n' +
        'Standard data retention policies apply to all uploaded assets.';
      modEl.value =
        'Service Level Agreement (Clause 4 - Revised):\n' +
        'The provider shall deliver detailed monthly analytics reports within three business days after month end.\n' +
        'Client review feedback and revision requests must be submitted within 72 hours of initial delivery.\n' +
        'All files remain 100% private in-browser under zero-upload privacy rules.';
    }
    runCompare(true);
  });

  btnClear.addEventListener('click', () => {
    origEl.value = '';
    modEl.value = '';
    origFileInput.value = '';
    modFileInput.value = '';
    clearDiffOutput();
    origEl.focus();
  });

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.mode === 'line' ? 'line' : 'word';
      if (next === currentMode) return;
      currentMode = next;
      modeBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      if (origEl.value || modEl.value) {
        runCompare(true);
      }
    });
  });

  [optIgnoreWs, optIgnoreCase].forEach((cb) => {
    cb.addEventListener('change', () => {
      if (origEl.value || modEl.value) {
        runCompare(true);
      }
    });
  });

  // Ctrl+Enter / Cmd+Enter shortcut to compare texts without blocking normal Ctrl+A/C/V/Z
  [origEl, modEl].forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCompare(false);
      }
    });
  });

  btnCopyReport.addEventListener('click', async () => {
    if (!lastResult) return;
    const report = buildPlainReport(lastResult);
    try {
      await navigator.clipboard.writeText(report);
      toast(t('td_report_copied_ok'), 'ok');
    } catch (_) {
      toast(t('ts_copy_err'), 'err');
    }
  });

  btnDownloadReport.addEventListener('click', () => {
    if (!lastResult) return;
    const report = buildPlainReport(lastResult);
    const blob = new Blob(['\uFEFF' + report], { type: 'text/plain;charset=utf-8' });
    const stamp = new Date().toISOString().slice(0, 10);
    if (window.imgsfix && window.imgsfix.triggerDownload) {
      window.imgsfix.triggerDownload(blob, `text_diff_report_${stamp}_imgsfix.txt`);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `text_diff_report_${stamp}_imgsfix.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    toast(t('tc_done'), 'ok');
  });

  document.addEventListener('imgsfix:langchange', () => {
    updateStatsBar(lastResult);
    if (!lastResult) {
      clearDiffOutput();
    }
  });

  clearDiffOutput();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTextDiff);
  } else {
    initTextDiff();
  }
}

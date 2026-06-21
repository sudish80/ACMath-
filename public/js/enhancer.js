// ─── QUESTION ENHANCER ──────────────────────────────────

let selectedOperation = null;
let enhanceTimer = null;

function fixTypos(text) {
    const lower = text.toLowerCase();
    let fixed = text;
    const corrections = [];
    for (const [wrong, right] of Object.entries(TYPO_MAP)) {
        const re = new RegExp(wrong, 'gi');
        if (re.test(lower)) {
            fixed = fixed.replace(re, right);
            corrections.push(`${wrong} → ${right}`);
        }
    }
    return { fixed, corrections };
}

function detectOperation(raw) {
    const lower = raw.toLowerCase();
    if (/\\?int|integrate|∫/.test(lower)) return 'INTEGRATE';
    if (/\\?frac|derivative|d[\/\\]dx|d\/dt|differentiate/.test(lower) && !/\\?frac/.test(lower)) return 'DIFFERENTIATE';
    if (/\\?lim|limit/.test(lower)) return 'EVALUATE';
    if (/\\?sum|summation|∑/.test(lower)) return 'EVALUATE';
    if (/simplif/.test(lower)) return 'SIMPLIFY';
    if (/factor/.test(lower)) return 'FACTOR';
    if (/expand/.test(lower)) return 'EXPAND';
    if (/solve|find.*root|find.*zero/.test(lower)) return 'SOLVE';
    if (/evaluate|compute|calculate/.test(lower)) return 'EVALUATE';
    if (/plot|graph/.test(lower)) return 'EVALUATE';
    if (/[=<>]/.test(raw)) return 'SOLVE';
    return 'SIMPLIFY';
}

function buildSuggestionChips(raw, activeOp) {
    const container = document.getElementById('suggestionChips');
    if (!container) return;
    container.innerHTML = '<span class="hint">⟫ AS</span>';
    const ops = ['ORIGINAL', ...ALL_OPERATIONS];
    ops.forEach(op => {
        const chip = document.createElement('span');
        chip.className = 'suggestion-chip' + (op === activeOp ? ' active' : '');
        chip.textContent = op === 'ORIGINAL' ? 'ORIGINAL' : op;
        chip.dataset.op = op;
        chip.addEventListener('click', () => {
            selectedOperation = op === activeOp ? null : (op === 'ORIGINAL' ? null : op);
            refreshEnhancerUI(raw);
        });
        container.appendChild(chip);
    });
}

function refreshEnhancerUI(raw) {
    const preview = document.getElementById('enhancerPreview');
    const textEl = document.getElementById('enhancedText');
    const badge = document.getElementById('statusBadge');
    const typoNotice = document.getElementById('typoNotice');
    const typoFixed = document.getElementById('typoFixed');

    if (!preview || !raw) {
        if (preview) preview.classList.remove('visible');
        renderDemoGraph('');
        return;
    }

    const { fixed, corrections } = fixTypos(raw);
    if (corrections.length > 0 && typoFixed) {
        typoFixed.textContent = corrections.join(' · ');
        typoNotice.classList.add('visible');
    } else if (typoNotice) {
        typoNotice.classList.remove('visible');
    }

    let enhanced = fixed;
    for (const [char, tex] of Object.entries(UNICODE_MAP)) {
        enhanced = enhanced.replaceAll(char, tex);
    }

    const hasMath = MATH_PATTERN.test(raw) || /\\[a-zA-Z]/.test(raw) || /[∫∑∞πθαβγλμσ]/.test(raw);
    const isValid = hasMath && raw.length >= 2;

    const detected = detectOperation(fixed);
    const activeOp = selectedOperation || detected;

    if (textEl) {
        textEl.innerHTML = `\\(\\displaystyle ${enhanced}\\)`;
        if (window.MathJax && MathJax.typesetPromise) {
            clearTimeout(enhanceTimer);
            enhanceTimer = setTimeout(() => {
                MathJax.typesetPromise([textEl]).catch(() => {});
            }, 200);
        }
    }

    if (badge) {
        badge.className = 'status-badge ' + (isValid ? 'valid' : 'invalid');
        badge.textContent = isValid ? activeOp : 'INVALID';
    }

    buildSuggestionChips(raw, activeOp);
    preview.classList.add('visible');
    renderDemoGraph(raw);
}

function getEnhancedQuestion() {
    const input = document.getElementById('questionInput');
    if (!input) return '';
    const raw = input.value.trim();
    const { fixed } = fixTypos(raw);
    let q = fixed;
    for (const [char, tex] of Object.entries(UNICODE_MAP)) {
        q = q.replaceAll(char, tex);
    }
    if (selectedOperation) {
        return `${selectedOperation.toLowerCase()}: ${q}`;
    }
    return q;
}

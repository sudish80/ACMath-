// Unit tests for Math Cinema
// Run with: npx node --test tests/*.test.js

const assert = require('node:assert');
const { describe, it } = require('node:test');

// ─── FIX TYPOS ───────────────────────────────────
const TYPO_MAP = {
    intergrate: 'integrate', intergral: 'integral', intregrate: 'integrate',
    diferentiate: 'differentiate', differntiate: 'differentiate', diffrentiate: 'differentiate',
    derivative: 'differentiate', simplfy: 'simplify', simplifty: 'simplify',
    simplfiy: 'simplify', simplife: 'simplify', evaluate: 'evaluate',
    calcuate: 'calculate', calcualte: 'calculate', eqution: 'equation',
    equasion: 'equation', solv: 'solve', fator: 'factor',
    factrise: 'factorise', expantion: 'expansion', expnad: 'expand',
    polynomail: 'polynomial', polynomal: 'polynomial',
    simplification: 'simplify',
};

function fixTypos(text) {
    const lower = text.toLowerCase();
    let fixed = text;
    const corrections = [];
    for (const [wrong, right] of Object.entries(TYPO_MAP)) {
        const re = new RegExp(wrong, 'gi');
        if (re.test(lower)) {
            fixed = fixed.replace(re, right);
            corrections.push(wrong + ' -> ' + right);
        }
    }
    return { fixed, corrections };
}

function detectOperation(raw) {
    const lower = raw.toLowerCase();
    if (/int|integrate|∫/.test(lower)) return 'INTEGRATE';
    if (/differentiate|ddx|d\/dt/.test(lower)) return 'DIFFERENTIATE';
    if (/lim|limit/.test(lower)) return 'EVALUATE';
    if (/sum|∑/.test(lower)) return 'EVALUATE';
    if (/simplif/.test(lower)) return 'SIMPLIFY';
    if (/factor/.test(lower)) return 'FACTOR';
    if (/expand/.test(lower)) return 'EXPAND';
    if (/solve|root/.test(lower)) return 'SOLVE';
    if (/evaluate|compute|calculate/.test(lower)) return 'EVALUATE';
    if (/[=<>]/.test(raw)) return 'SOLVE';
    return 'SIMPLIFY';
}

function chunkSteps(steps, maxLinesPerStep) {
    maxLinesPerStep = maxLinesPerStep || 3;
    if (!Array.isArray(steps)) return [];
    const chunks = [];
    for (const step of steps) {
        if (Array.isArray(step)) {
            for (let i = 0; i < step.length; i += maxLinesPerStep) {
                chunks.push(step.slice(i, i + maxLinesPerStep));
            }
        } else {
            chunks.push([String(step)]);
        }
    }
    return chunks;
}

function validateSteps(steps) {
    if (!Array.isArray(steps) || steps.length === 0) return null;
    for (const step of steps) {
        if (!Array.isArray(step) || step.length === 0) return null;
        for (const line of step) {
            if (typeof line !== 'string' || line.trim().length === 0) return null;
        }
    }
    return steps;
}

describe('fixTypos', () => {
    it('fixes intergrate to integrate', () => {
        const r = fixTypos('intergrate x^2');
        assert.equal(r.fixed, 'integrate x^2');
        assert.ok(r.corrections.length > 0);
    });

    it('fixes simplfy to simplify', () => {
        const r = fixTypos('simplfy 2x + 2');
        assert.equal(r.fixed, 'simplify 2x + 2');
    });

    it('returns original with no corrections', () => {
        const r = fixTypos('integrate x^2');
        assert.equal(r.fixed, 'integrate x^2');
        assert.equal(r.corrections.length, 0);
    });

    it('fixes multiple typos', () => {
        const r = fixTypos('intergrate and simplfy');
        assert.ok(r.fixed.includes('integrate'));
        assert.ok(r.fixed.includes('simplify'));
    });
});

describe('detectOperation', () => {
    it('detects INTEGRATE', () => {
        assert.equal(detectOperation('integrate x^2'), 'INTEGRATE');
    });

    it('detects DIFFERENTIATE', () => {
        assert.equal(detectOperation('differentiate sin(x)'), 'DIFFERENTIATE');
    });

    it('detects SOLVE from = sign', () => {
        assert.equal(detectOperation('x^2 + 1 = 0'), 'SOLVE');
    });

    it('defaults to SIMPLIFY', () => {
        assert.equal(detectOperation('hello world'), 'SIMPLIFY');
    });
});

describe('chunkSteps', () => {
    it('chunks multi-line steps', () => {
        const steps = [['a', 'b', 'c', 'd']];
        const result = chunkSteps(steps, 2);
        assert.equal(result.length, 2);
        assert.deepEqual(result[0], ['a', 'b']);
        assert.deepEqual(result[1], ['c', 'd']);
    });

    it('wraps strings in arrays', () => {
        const steps = ['hello'];
        const result = chunkSteps(steps);
        assert.equal(result.length, 1);
        assert.deepEqual(result[0], ['hello']);
    });

    it('returns empty for non-array', () => {
        const result = chunkSteps(null);
        assert.deepEqual(result, []);
    });
});

describe('validateSteps', () => {
    it('validates correct steps', () => {
        const steps = [['a'], ['b', 'c']];
        assert.deepEqual(validateSteps(steps), steps);
    });

    it('returns null for empty array', () => {
        assert.equal(validateSteps([]), null);
    });

    it('returns null for non-array step', () => {
        assert.equal(validateSteps([null]), null);
    });

    it('returns null for empty step', () => {
        assert.equal(validateSteps([[]]), null);
    });
});

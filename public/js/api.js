// ─── API LAYER ────────────────────────────────────────────

class TimeoutError extends Error {
    constructor(msg) { super(msg); this.name = 'TimeoutError'; }
}

let conversationId = null;

function smartChunk(steps, maxLinesPerStep) {
    if (maxLinesPerStep === undefined) maxLinesPerStep = 3;
    if (!Array.isArray(steps)) return [];
    const chunks = [];
    for (const step of steps) {
        if (Array.isArray(step)) {
            const merged = step.join(' \\\\, ');
            const splitPoints = [];
            if (merged.includes(' \\\\, ') && merged.length > 80) {
                const parts = merged.split(' \\\\, ');
                let current = [];
                let len = 0;
                for (const p of parts) {
                    if (len + p.length > 80 && current.length > 0) {
                        splitPoints.push(current.join(' \\\\, '));
                        current = [p];
                        len = p.length;
                    } else {
                        current.push(p);
                        len += p.length + 5;
                    }
                }
                if (current.length > 0) splitPoints.push(current.join(' \\\\, '));
                for (let i = 0; i < splitPoints.length; i += maxLinesPerStep) {
                    chunks.push(splitPoints.slice(i, i + maxLinesPerStep));
                }
            } else {
                for (let i = 0; i < step.length; i += maxLinesPerStep) {
                    chunks.push(step.slice(i, i + maxLinesPerStep));
                }
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

async function solveQuestion(enhanced, raw, operation, useFallback) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), useFallback ? 240000 : 480000);

    try {
        const modelSelect = document.getElementById('modelSelect');
        const selected = modelSelect ? modelSelect.value : 'auto';

        let model;
        if (useFallback) {
            model = 'meta/llama-3.1-8b-instruct';
        } else if (selected === '70b') {
            model = 'meta/llama-3.1-70b-instruct';
        } else if (selected === '8b') {
            model = 'meta/llama-3.1-8b-instruct';
        }

        const body = { question: enhanced, raw, operation, model, conversationId };

        const res = await fetch('/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await res.json();

        if (!res.ok) {
            if (res.status === 504 || (data.error && (data.error.toLowerCase().includes('timed out') || data.error.toLowerCase().includes('timeout')))) {
                throw new TimeoutError(data.error);
            }
            if (res.status === 429) {
                throw new Error('Rate limited. Please wait a moment before trying again.');
            }
            throw new Error(data.error || 'Something went wrong.');
        }

        if (data.conversationId) conversationId = data.conversationId;

        const valid = validateSteps(data.steps);
        if (!valid) {
            throw new Error('No valid solution steps returned. Try rephrasing your question.');
        }

        return {
            steps: smartChunk(valid),
            totalSteps: valid.length,
            raw: data.steps,
            method: data.method || null,
        };
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new TimeoutError('Request timed out. The API took too long to respond.');
        }
        throw err;
    }
}

function resetConversation() {
    conversationId = null;
}

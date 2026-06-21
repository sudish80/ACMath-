const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const LLM_API_KEY = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
const LLM_BASE_URL = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

// ─── CACHE ─────────────────────────────────────────────────
const solutionCache = new Map();
const CACHE_MAX = 200;
function cacheKey(question, operation, model) {
  return crypto.createHash('md5').update(JSON.stringify([question, operation || '', model || ''])).digest('hex');
}
function cacheGet(key) { return solutionCache.get(key); }
function cacheSet(key, val) {
  if (solutionCache.size >= CACHE_MAX) {
    const firstKey = solutionCache.keys().next().value;
    solutionCache.delete(firstKey);
  }
  solutionCache.set(key, val);
}

// ─── RATE LIMITER ──────────────────────────────────────────
const rateMap = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const win = rateMap.get(ip) || [];
  const recent = win.filter(t => now - t < 60000);
  if (recent.length >= 10) return false;
  recent.push(now);
  rateMap.set(ip, recent);
  return true;
}

// ─── CONVERSATION HISTORY ──────────────────────────────────
const conversations = new Map();
const CONV_MAX = 50;

// ─── ERROR LOG ─────────────────────────────────────────────
const errorLog = [];
function logError(msg) {
  errorLog.push({ msg, time: new Date().toISOString() });
  if (errorLog.length > 50) errorLog.shift();
}

// ─── SYSTEM PROMPT ─────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert math professor. Solve any math problem with extremely detailed, step-by-step reasoning and return the solution as a JSON object.

The JSON object must have this structure:
{
  "steps": [ ... ],
  "method": "name of the primary method used (e.g. Integration by Parts, u-Substitution, Quadratic Formula, Partial Fractions, etc.)"
}

The "steps" field is an array. Each element in the array is a "step" — an array of 1-3 TeX strings displayed on screen at that step.
- The first step shows the original problem.
- Each intermediate step shows ONE small logical progression. DO NOT skip steps. Show every algebraic manipulation, every substitution, every limit evaluation, every integral break-down explicitly.
- The final step MUST have the answer inside \\boxed{}.
- For complex/deep problems, produce 10-30+ steps. The more steps the better — each step should be a single, clear transformation.

Rules:
- Use proper LaTeX with \\\\ for backslashes (JSON-escaped).
- Use \\\\displaystyle for all inline math.
- Use \\\\tfrac for fractions inside inline.
- For integrals, use \\\\int, \\\\, for thin spaces.
- For limits, use \\\\lim_{x \\\\to a}.
- For sums, use \\\\sum.
- For square roots, use \\\\sqrt{}.
- For trigonometric functions, use \\\\sin, \\\\cos, \\\\tan, \\\\sec, etc.
- For complex numbers, i is the imaginary unit (i = \\\\sqrt{-1}).
- Never wrap the entire JSON in markdown code fences.
- Return ONLY valid JSON, no other text before or after.
- Identify what the user is asking: simplify, evaluate, integrate, differentiate, solve, factor, expand, etc. and do exactly that.
- If this is a follow-up question (explain step 3, show another method, etc.), answer the follow-up directly.

Example output for "integrate sec^3 x":
{
  "steps": [
    ["\\\\displaystyle I = \\\\int \\\\sec^3(x) \\\\, dx"],
    ["\\\\displaystyle I = \\\\int \\\\sec x \\\\cdot \\\\sec^2(x) \\\\, dx"],
    ["\\\\displaystyle \\\\text{Let } u = \\\\sec x, \\\\, dv = \\\\sec^2 x \\\\, dx"],
    ["\\\\displaystyle du = \\\\sec x \\\\tan x \\\\, dx, \\\\, v = \\\\tan x"],
    ["\\\\displaystyle I = \\\\sec x \\\\tan x - \\\\int \\\\sec x \\\\tan^2 x \\\\, dx"],
    ["\\\\displaystyle I = \\\\sec x \\\\tan x - \\\\int \\\\sec x (\\\\sec^2 x - 1) \\\\, dx"],
    ["\\\\displaystyle I = \\\\sec x \\\\tan x - \\\\int \\\\sec^3 x \\\\, dx + \\\\int \\\\sec x \\\\, dx"],
    ["\\\\displaystyle I = \\\\sec x \\\\tan x - I + \\\\ln |\\\\sec x + \\\\tan x|"],
    ["\\\\displaystyle 2I = \\\\sec x \\\\tan x + \\\\ln |\\\\sec x + \\\\tan x|"],
    ["\\\\displaystyle \\\\boxed{I = \\\\tfrac{1}{2} \\\\sec x \\\\tan x + \\\\tfrac{1}{2} \\\\ln |\\\\sec x + \\\\tan x| + C}"]
  ],
  "method": "Integration by Parts"
}`;

// ─── LLM CALL ──────────────────────────────────────────────
async function callLLM(messages, model, signal) {
  const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || LLM_MODEL,
      messages,
      temperature: 0.2,
        max_tokens: 8192,
    }),
    signal,
  });
  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${errBody || response.statusText}`);
  }
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

function parseSolution(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*"steps"/);
    if (match) {
      try {
        parsed = JSON.parse(content.slice(match.index));
        const end = content.lastIndexOf('}');
        if (end > match.index) parsed = JSON.parse(content.slice(match.index, end + 1));
      } catch {
        const arrMatch = content.match(/\[\s*\[/);
        if (arrMatch) {
          const steps = JSON.parse(content.slice(arrMatch.index));
          return { steps, method: 'Unknown' };
        }
        throw new Error('Failed to parse LLM response as JSON');
      }
    } else {
      throw new Error('Failed to parse LLM response as JSON');
    }
  }
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('LLM returned an empty or invalid response');
  }
  return { steps: parsed.steps, method: parsed.method || 'Unknown' };
}

// ─── ENHANCE QUESTION ──────────────────────────────────────
function enhanceQuestion(raw) {
  let q = raw.trim();
  const rawLower = raw.toLowerCase();
  let operation = '';
  if (/\\?int|integrate|∫/.test(rawLower)) operation = 'integrate';
  else if (/\\?(?:frac|d[\/\\\\]dx|d\/dt)|derivative|differentiate/.test(rawLower)) operation = 'differentiate';
  else if (/\\?lim|limit/.test(rawLower)) operation = 'limit';
  else if (/\\?sum/.test(rawLower)) operation = 'sum';
  else if (/solve|find.*root|find.*zero/.test(rawLower)) operation = 'solve';
  else if (/factor/.test(rawLower)) operation = 'factor';
  else if (/simplify/.test(rawLower)) operation = 'simplify';
  else if (/expand/.test(rawLower)) operation = 'expand';
  else if (/plot|graph/.test(rawLower)) operation = 'graph';
  else if (/evaluate|compute|calculate/.test(rawLower)) operation = 'evaluate';

  q = q.replace(/^(?:please\s+)?(?:solve|compute|evaluate|find|calculate|determine|integrate|differentiate|simplify|factor|expand)\s+/i, '');

  let context = '';
  if (/[^a-zA-Z]i[^a-zA-Z]/.test(q) || /^i[^a-zA-Z]/.test(q) || /i$/.test(q.trim())) {
    context = '(Note: i is the imaginary unit, i = √-1. Treat it as a complex number operation.) ';
  }

  q = q.replace(/(?<!\\)([a-z]+)(?=\s*\{|\s*\()/g, (m) => {
    const cmds = ['sin','cos','tan','sec','csc','cot','log','ln','lim','int','sum','prod','sqrt','frac','boxed'];
    return cmds.includes(m.toLowerCase()) ? '\\' + m : m;
  });

  if (operation) return `${operation}: ${context}${q}`;
  return context ? `${context}${q}` : q;
}

// ─── API ENDPOINTS ─────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: LLM_MODEL,
    uptime: process.uptime(),
    cacheSize: solutionCache.size,
    conversations: conversations.size,
    errors: errorLog.length,
  });
});

app.get('/api/logs', (req, res) => {
  res.json(errorLog.slice(-50));
});

app.post('/api/solve', async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  if (!rateLimit(clientIP)) {
    return res.status(429).json({ error: 'Too many requests. Please wait before sending another.' });
  }

  try {
    const { question, raw, operation, model, conversationId } = req.body;

    let finalQuestion;
    if (operation) {
      const cleaned = raw || question;
      finalQuestion = `${operation.toLowerCase()}: ${cleaned.replace(/^(?:please\s+)?(?:solve|compute|evaluate|find|calculate|determine|integrate|differentiate|simplify|factor|expand)\s+/i, '')}`;
    } else {
      finalQuestion = enhanceQuestion(raw || question);
    }
    if (!finalQuestion || !finalQuestion.trim()) {
      return res.status(400).json({ error: 'Please provide a math question.' });
    }

    // Cache check
    const cKey = cacheKey(finalQuestion, operation, model || LLM_MODEL);
    const cached = cacheGet(cKey);
    if (cached && !conversationId) {
      console.log(`[CACHE] hit for "${finalQuestion.slice(0, 60)}"`);
      return res.json(cached);
    }

    const isFallback = model && model.includes('8b');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), isFallback ? 300000 : 600000);

    try {
      // Build messages with conversation history
      let messages;
      if (conversationId && conversations.has(conversationId)) {
        const conv = conversations.get(conversationId);
        messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conv.history,
          { role: 'user', content: `Solve this math problem step by step, showing clear logical progression:\n${finalQuestion}` }
        ];
      } else {
        messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Solve this math problem step by step, showing clear logical progression:\n${finalQuestion}` }
        ];
      }

      console.log(`[${isFallback ? 'FALLBACK' : 'PRIMARY'}] model=${model || LLM_MODEL} conv=${conversationId || 'new'} question="${finalQuestion.slice(0, 80)}"`);

      let content;
      let retries = 0;
      while (true) {
        try {
          content = await callLLM(messages, model || LLM_MODEL, controller.signal);
          break;
        } catch (err) {
          if (retries < 2 && err.message.includes('parse')) {
            console.log(`[RETRY] parse failed, retry ${retries + 1} with stricter prompt`);
            messages[messages.length - 1].content += '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no extra text. Start with `{` and end with `}`.';
            retries++;
            continue;
          }
          throw err;
        }
      }

      clearTimeout(timeout);

      const result = parseSolution(content);

      const responseData = {
        steps: result.steps,
        totalSteps: result.steps.length,
        method: result.method,
        conversationId: conversationId || crypto.randomUUID(),
      };

      // Cache only non-conversation requests
      if (!conversationId) cacheSet(cKey, responseData);

      // Store conversation history
      const convId = conversationId || responseData.conversationId;
      if (!conversations.has(convId)) {
        if (conversations.size >= CONV_MAX) {
          const firstKey = conversations.keys().next().value;
          conversations.delete(firstKey);
        }
        conversations.set(convId, { history: [] });
      }
      const conv = conversations.get(convId);
      conv.history.push({ role: 'user', content: finalQuestion });
      conv.history.push({ role: 'assistant', content });

      res.json(responseData);
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  } catch (err) {
    console.error('Solve error:', err.message);
    logError(err.message);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out. The API took too long to respond.' });
    }
    res.status(500).json({
      error: err.message,
      hint: 'Check your API key in .env file.',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Math Cinema running at http://localhost:${PORT}`);
  console.log(`Using API: ${LLM_BASE_URL} | Model: ${LLM_MODEL}`);
});

# Math Cinema

**AI-powered cinematic step-by-step math solver** — renders LLM-generated solutions with GSAP animations, MathJax typography, and interactive SVG graphs.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520" style="max-width:100%;height:auto;border-radius:12px;margin:16px 0;">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1424"/><stop offset="1" stop-color="#162040"/></linearGradient>
    <linearGradient id="glowG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b6eff" stop-opacity=".3"/><stop offset="1" stop-color="#3b6eff" stop-opacity="0"/></linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000" flood-opacity=".5"/></filter>
  </defs>
  <rect width="900" height="520" fill="url(#bg)" rx="16"/>
  <!-- Input Overlay (left) -->
  <rect x="20" y="16" width="360" height="488" rx="14" fill="#14203a" stroke="#2a3f66" stroke-width="1" filter="url(#shadow)"/>
  <text x="200" y="56" fill="#3b6eff" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">MATH CINEMA</text>
  <text x="200" y="74" fill="#6b8fc4" font-family="sans-serif" font-size="11" text-anchor="middle">AI-Powered Step-by-Step Solver</text>
  <rect x="36" y="90" width="328" height="60" rx="8" fill="#0f1b30" stroke="#2a3f66"/>
  <text x="200" y="128" fill="#6b8fc4" font-family="monospace" font-size="14" text-anchor="middle" font-style="italic">∫ sec³(x) dx</text>
  <rect x="36" y="160" width="328" height="100" rx="8" fill="#0f1b30" stroke="#2a3f66"/>
  <rect x="44" y="168" width="56" height="18" rx="4" fill="#3b6eff" opacity=".2"/>
  <text x="72" y="181" fill="#3b6eff" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">ENHANCED</text>
  <text x="200" y="216" fill="#cfdfff" font-family="serif" font-size="16" font-style="italic" text-anchor="middle">\(\displaystyle \int \sec^3(x)\,dx\)</text>
  <rect x="36" y="272" width="328" height="40" rx="6" fill="#3b6eff"/>
  <text x="200" y="298" fill="#fff" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">SOLVE</text>
  <!-- Cinema (right) -->
  <rect x="400" y="16" width="480" height="360" rx="14" fill="#14203a" stroke="#2a3f66" stroke-width="1" filter="url(#shadow)"/>
  <!-- Cinema header -->
  <rect x="400" y="16" width="480" height="38" rx="14" fill="#1c2e50"/>
  <rect x="416" y="26" width="28" height="18" rx="4" fill="#3b6eff"/><text x="430" y="39" fill="#fff" font-family="sans-serif" font-size="9" text-anchor="middle">∫</text>
  <text x="452" y="39" fill="#8aadde" font-family="sans-serif" font-size="11">∫ sec³(x) dx</text>
  <rect x="690" y="26" width="66" height="18" rx="4" fill="#22c55e" opacity=".15"/>
  <text x="723" y="39" fill="#22c55e" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">INTEGRATION</text>
  <circle cx="852" cy="35" r="8" fill="#ff4757" opacity=".6"/>
  <text x="852" y="39" fill="#fff" font-family="sans-serif" font-size="8" text-anchor="middle">✕</text>
  <!-- SVG Stage (math rendering area) -->
  <rect x="416" y="62" width="448" height="240" rx="8" fill="#0f1b30" stroke="#1c2e50"/>
  <rect x="416" y="62" width="448" height="240" rx="8" fill="url(#glowG)" opacity=".3"/>
  <!-- Step text -->
  <text x="640" y="146" fill="#cfdfff" font-family="serif" font-size="18" font-style="italic" text-anchor="middle" opacity=".9">\(\displaystyle \int \sec^3(x)\,dx\)</text>
  <text x="640" y="176" fill="#59ff6b" font-family="serif" font-size="16" font-style="italic" text-anchor="middle">\(\displaystyle = \int \sec(x){\color{#59ff6b}{dx}}\)</text>
  <text x="640" y="206" fill="#cfdfff" font-family="serif" font-size="16" font-style="italic" text-anchor="middle">\(\displaystyle \text{Let } u = \sec(x), \, dv = \sec^2(x)\)</text>
  <text x="640" y="236" fill="#cfdfff" font-family="serif" font-size="16" font-style="italic" text-anchor="middle">\(\displaystyle \int \sec^3(x)\,dx = \frac{1}{2}\sec(x)\tan(x)\)</text>
  <text x="640" y="258" fill="#ffd700" font-family="serif" font-size="16" font-style="italic" text-anchor="middle">\(\displaystyle + \frac{{\color{white}{1}}}{{\color{white}{2}}}\ln|\sec(x)+\tan(x)| + C\)</text>
  <!-- Progress dots -->
  <circle cx="470" cy="285" r="5" fill="#3b6eff"/><text x="470" y="288" fill="#fff" font-family="sans-serif" font-size="7" text-anchor="middle">1</text>
  <circle cx="510" cy="285" r="5" fill="#2a3f66"/><text x="510" y="288" fill="#8aadde" font-family="sans-serif" font-size="7" text-anchor="middle">2</text>
  <circle cx="550" cy="285" r="5" fill="#2a3f66"/><text x="550" y="288" fill="#8aadde" font-family="sans-serif" font-size="7" text-anchor="middle">3</text>
  <circle cx="590" cy="285" r="5" fill="#2a3f66"/><text x="590" y="288" fill="#8aadde" font-family="sans-serif" font-size="7" text-anchor="middle">4</text>
  <circle cx="630" cy="285" r="5" fill="#2a3f66"/><text x="630" y="288" fill="#8aadde" font-family="sans-serif" font-size="7" text-anchor="middle">5</text>
  <text x="700" y="288" fill="#6b8fc4" font-family="sans-serif" font-size="10">STEP 1 / 5</text>
  <!-- Controls bar -->
  <rect x="400" y="310" width="480" height="36" rx="0" fill="#1c2e50"/>
  <rect x="412" y="316" width="100" height="24" rx="6" fill="#3b6eff"/><text x="462" y="333" fill="#fff" font-family="sans-serif" font-size="11" text-anchor="middle">⏸ PAUSE</text>
  <rect x="518" y="316" width="64" height="24" rx="6" fill="#2a3f66"/><text x="550" y="333" fill="#8aadde" font-family="sans-serif" font-size="11" text-anchor="middle">↺ RESET</text>
  <rect x="588" y="316" width="50" height="24" rx="6" fill="#2a3f66"/><text x="613" y="333" fill="#8aadde" font-family="sans-serif" font-size="11" text-anchor="middle">⏩ 2x</text>
  <rect x="644" y="316" width="62" height="24" rx="6" fill="#2a3f66"/><text x="675" y="333" fill="#8aadde" font-family="sans-serif" font-size="11" text-anchor="middle">📈 GRAPH</text>
  <rect x="712" y="316" width="70" height="24" rx="6" fill="#2a3f66"/><text x="747" y="333" fill="#8aadde" font-family="sans-serif" font-size="11" text-anchor="middle">📄 EXPORT</text>
  <!-- Graph Panel (bottom-right) -->
  <rect x="400" y="352" width="480" height="154" rx="0 0 14 14" fill="#0f1b30" stroke="#1c2e50" stroke-width="1"/>
  <rect x="400" y="352" width="480" height="28" fill="#1c2e50"/>
  <text x="420" y="370" fill="#3b6eff" font-family="sans-serif" font-size="11" font-weight="bold">GRAPH</text>
  <rect x="810" y="356" width="56" height="18" rx="4" fill="#2a3f66"/><text x="838" y="369" fill="#8aadde" font-family="sans-serif" font-size="9" text-anchor="middle">◉ TRACE</text>
  <!-- Graph axes -->
  <line x1="480" y1="490" x2="860" y2="490" stroke="#2a3f66" stroke-width="1"/>
  <line x1="670" y1="395" x2="670" y2="490" stroke="#2a3f66" stroke-width="1"/>
  <path d="M500,490 Q550,430 600,450 Q650,420 700,460 Q750,440 800,480 Q820,460 840,470" stroke="#3b6eff" stroke-width="2" fill="none" opacity=".8"/>
  <path d="M500,490 Q550,460 600,475 Q650,455 700,470 Q750,460 800,485 Q820,475 840,480" stroke="#59ff6b" stroke-width="1.5" fill="none" opacity=".5" stroke-dasharray="4,3"/>
  <text x="670" y="500" fill="#6b8fc4" font-family="sans-serif" font-size="8" text-anchor="middle">click for coordinates · scroll to zoom · drag to pan</text>
  <!-- Examples bar below input -->
  <rect x="36" y="344" width="328" height="30" rx="6" fill="none"/>
  <rect x="36" y="344" width="56" height="22" rx="10" fill="#1c2e50" stroke="#2a3f66"/><text x="64" y="359" fill="#8aadde" font-family="sans-serif" font-size="8" text-anchor="middle">∫ sec³(x)</text>
  <rect x="96" y="344" width="50" height="22" rx="10" fill="#1c2e50" stroke="#2a3f66"/><text x="121" y="359" fill="#8aadde" font-family="sans-serif" font-size="8" text-anchor="middle">x²+2x+1</text>
  <rect x="150" y="344" width="56" height="22" rx="10" fill="#1c2e50" stroke="#2a3f66"/><text x="178" y="359" fill="#8aadde" font-family="sans-serif" font-size="8" text-anchor="middle">d/dx sin(x²)</text>
  <rect x="210" y="344" width="44" height="22" rx="10" fill="#1c2e50" stroke="#2a3f66"/><text x="232" y="359" fill="#8aadde" font-family="sans-serif" font-size="8" text-anchor="middle">∑ 1/n²</text>
  <!-- Follow-up chat (bottom left) -->
  <rect x="20" y="400" width="360" height="104" rx="14" fill="#14203a" stroke="#2a3f66" stroke-width="1"/>
  <rect x="20" y="400" width="360" height="28" rx="14 14 0 0" fill="#1c2e50"/>
  <text x="40" y="418" fill="#3b6eff" font-family="sans-serif" font-size="11" font-weight="bold">CONVERSATION</text>
  <text x="304" y="418" fill="#6b8fc4" font-family="sans-serif" font-size="9">Ask a follow-up…</text>
  <rect x="30" y="438" width="340" height="34" rx="8" fill="#0f1b30"/>
  <text x="200" y="460" fill="#4a6a94" font-family="sans-serif" font-size="10" text-anchor="middle">💬 Ask a follow-up question about the current solution</text>
  <rect x="30" y="478" width="300" height="18" rx="6" fill="#0f1b30" stroke="#2a3f66"/>
  <text x="180" y="491" fill="#4a6a94" font-family="sans-serif" font-size="8" text-anchor="middle">Type your question…</text>
  <circle cx="346" cy="487" r="10" fill="#3b6eff"/><text x="346" y="490" fill="#fff" font-family="sans-serif" font-size="9" text-anchor="middle">→</text>
</svg>

```text
                        ╔═══════════════════════════╗
                        ║   MATH CINEMA             ║
                        ║   AI · Step-by-Step · 3D  ║
                        ╚═══════════════════════════╝
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                             │
│                                                                      │
│  loader.js ──→ config.js ──→ graph.js ──→ enhancer.js ──→ api.js   │
│         sequential chunk loading with progress bar                  │
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────────────┐ │
│  │  INPUT       │   │  ENHANCER    │   │  CINEMA                 │ │
│  │  OVERLAY     │──→│  · typo fix  │──→│  · GSAP timeline        │ │
│  │  · textarea  │   │  · operation │   │  · MathJax rendering    │ │
│  │  · examples  │   │    detect    │   │  · progress dots        │ │
│  │  · model     │   │  · preview   │   │  · playback controls    │ │
│  │    selector  │   │  · demo graph│   │  · zoom/pan SVG stage   │ │
│  └──────────────┘   └──────────────┘   └─────────────────────────┘ │
│                                                  │                  │
│         ┌────────────────────────────────────────┘                  │
│         ▼                                                            │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐│
│  │  FOLLOW-UP CHAT  │   │  GRAPH PANEL     │   │  EXPORT PDF      ││
│  │  · conversation  │   │  · 9 viz types   │   │  · html2pdf.js   ││
│  │  · thinking dots │   │  · interactive   │   │  · A4 formatted  ││
│  │  · auto-scroll   │   │  · per-step morph│   │  · all steps incl││
│  └──────────────────┘   └──────────────────┘   └──────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP / JSON
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        SERVER (Node.js / Express)                   │
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────────────┐ │
│  │  LLM PROXY   │   │  CACHE       │   │  RATE LIMITER           │ │
│  │  · NVIDIA    │   │  · LRU 200   │   │  · 10 req/min per IP   │ │
│  │    API call  │   │  · MD5 keyed │   │  · 429 response         │ │
│  │  · fallback  │   │  · skips     │   │                         │ │
│  │    70b → 8b  │   │    convos    │   │  ┌─────────────────────┐│ │
│  │  · retry x2  │   └──────────────┘   │  │  MONITORING         ││ │
│  │  · 10/5 min  │                      │  │  · /api/health      ││ │
│  │    timeouts  │   ┌──────────────┐   │  │  · /api/logs        ││ │
│  │              │   │  HISTORY     │   │  │  · error count      ││ │
│  │              │   │  · per-conv  │   │  └─────────────────────┘│ │
│  │              │   │  · multi-turn│   │                         │ │
│  │              │   └──────────────┘   └─────────────────────────┘ │
│  └──────────────┘                                                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Workflow

```text
                  ┌─────────────────────────────┐
                  │   USER ENTERS QUESTION      │
                  │   e.g. "∫ sec³(x) dx"       │
                  └─────────────┬───────────────┘
                                ▼
                  ┌─────────────────────────────┐
                  │   ENHANCER                  │
                  │   · fix typos (40+ map)     │◄──── "intergrate" → "integrate"
                  │   · detect operation        │◄──── derivative, integral, etc.
                  │   · show preview (MathJax)  │
                  │   · render demo graph       │
                  └─────────────┬───────────────┘
                                ▼
                  ┌─────────────────────────────┐
                  │   SOLVE BUTTON              │
                  │   · validate math input     │
                  │   · show "SOLVING..."       │
                  │   · phase messages          │
                  └─────────────┬───────────────┘
                                ▼
          ┌──────────────────────────────────────────────┐
          │           API LAYER (api.js)                 │
          │                                              │
          │  ┌─────────────┐    ┌───────────────────┐    │
          │  │ JSON.parse  │    │  MODEL SELECTOR   │    │
          │  │ retry x2    │    │  Auto / 70b / 8b  │    │
          │  │ on failure  │    │                   │    │
          │  └─────────────┘    └───────────────────┘    │
          │                                              │
          │  ┌──────────────────────────────────────┐    │
          │  │  smartChunk() — split on \\,         │    │
          │  │  max 80 chars per line, 3 lines/step │    │
          │  └──────────────────────────────────────┘    │
          └──────────────┬───────────────────────────────┘
                         ▼
          ┌──────────────────────────────────────────────┐
          │              SERVER                          │
          │                                              │
          │  1. Check cache (MD5 of question+op+model)  │
          │  2. If miss → call NVIDIA API (70b)         │
          │  3. If 70b timeout → fallback to 8b model   │
          │  4. Cache result (unless conversation)      │
          │  5. Return JSON { steps, method }           │
          └──────────────┬───────────────────────────────┘
                         ▼
          ┌──────────────────────────────────────────────┐
          │  CINEMA RENDERER                             │
          │                                              │
          │  ┌──────────────┐   ┌────────────────────┐   │
          │  │  Step 0      │   │  Each subsequent   │   │
          │  │  (question)  │   │  step:              │   │
          │  │  with glow   │   │  · camera zoom      │   │
          │  │  entrance    │   │  · back-out easing  │   │
          │  └──────────────┘   │  · colorizeTeX      │   │
          │                     │  · update graph     │   │
          │  · progress dots    └────────────────────┘   │
          │  · method badge                              │
          │  · zoom/pan SVG stage                        │
          └──────────────────────────────────────────────┘
```

---

## Graph Visualizations

```text
  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐
  │ 2D PLOT  │   │ MULTI-   │   │ RIEMANN  │   │ 3D SURFACE│
  │ y = f(x) │   │ TRACE    │   │ SUMS     │   │ z = f(x,y)│
  │ tangent  │   │ overlay  │   │ animated │   │ isometric │
  │ shade    │   │ + legend │   │ bars     │   │ rotation  │
  └─────────┘   └──────────┘   └──────────┘   └───────────┘

  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐
  │ VECTOR   │   │ PHASE    │   │ TAYLOR   │   │ PARAMETRIC│
  │ FIELD    │   │ PLANE    │   │ SERIES   │   │ CURVE     │
  │ arrows   │   │ nullcline │   │ T₁–T₅    │   │ TRACE     │
  │ density  │   │ trajectory│   │ converge │   │ ◉ animate │
  └──────────┘   └──────────┘   └──────────┘   └───────────┘

  Interactive features:
  · Click to show coordinates      · Scroll to zoom (0.5×–3×)
  · Drag to pan viewport           · Reset with R key
  · ◉ TRACE button / key T         · Per-step graph morphing
```

---

## Features

| Feature | Detail |
|---------|--------|
| Chunk Loader | 6 JS modules loaded in dependency order with progress bar |
| Typo Fixer | 40+ common math misspellings auto-corrected |
| Operation Detection | Regex-based: derivative, integral, limit, sum, equation, etc. |
| Model Selector | Auto (70b→8b fallback), 70b precise, 8b fast |
| Retry Logic | JSON parse failure → 2 retries with stricter instructions |
| Timeout Recovery | 70b: 10min server / 8min client; auto-fallback to 8b |
| LRU Cache | 200 entries keyed by MD5 of question+op+model |
| Rate Limiter | 10 requests/min per IP |
| ColorizeTeX | Differentials (green), constants (gold), numbers (white) |
| GSAP Cinema | Back-out easing, glow, camera zoom per step |
| Progress Dots | Numbered, clickable, hover tooltips |
| Zoom/Pan Stage | Mouse wheel zoom, click-drag pan, reset |
| Graph Panel | 520px, togglable, 9 visualization types |
| Follow-up Chat | Conversation history, thinking indicator, auto-scroll |
| PDF Export | A4 with graph + all steps via html2pdf.js |
| Server Monitoring | `/api/health`, `/api/logs`, error tracking |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` / `→` | Previous / Next step |
| `R` | Reset to step 1 |
| `G` | Toggle graph panel |
| `T` | Toggle curve trace |
| `F` | Open follow-up chat |
| `E` | Export PDF |
| `Enter` | Solve (from input) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS (no framework), GSAP 3.12, MathJax 3, html2pdf.js 0.10 |
| Backend | Node.js, Express |
| LLM | NVIDIA API via `meta/llama-3.1-70b-instruct` (fallback: 8b) |
| Graphs | Custom SVG engine (no external API) |
| CSS | Dark theme, no framework |

---

## File Structure

```
math-cinema/
├── public/
│   ├── index.html          # Shell: loader, input, cinema, graph, chat
│   ├── css/
│   │   └── style.css       # All styles (dark theme, animations)
│   └── js/
│       ├── loader.js       # Chunk loader with progress bar
│       ├── config.js       # Constants, maps, operation list
│       ├── graph.js        # SVG plot engine (9 viz types)
│       ├── enhancer.js     # Typo fix, operation detection, preview
│       ├── api.js          # API calls, smartChunk, validateSteps
│       ├── cinema.js       # GSAP renderer, playback, PDF export
│       └── app.js          # Main init, solve flow, keyboard shortcuts
├── tests/
│   └── core.test.js        # 15 unit tests
├── server.js               # Express server, cache, rate limiter
├── package.json
└── .env                    # OPENAI_API_KEY, LLM_BASE_URL, LLM_MODEL
```

---

## Setup

```bash
git clone https://github.com/sudish80/ACMath-.git
cd math-cinema
npm install
```

Create `.env`:
```
OPENAI_API_KEY=nvapi-...
LLM_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_MODEL=meta/llama-3.1-70b-instruct
PORT=3000
```

Run:
```bash
npm start
```

Open `http://localhost:3000` in a browser.

---

## Tests

```bash
npx mocha tests/core.test.js
```

15 tests covering `fixTypos`, `detectOperation`, `chunkSteps`, `validateSteps`.

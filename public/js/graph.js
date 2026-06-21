// ─── GRAPH RENDERER (Canvas 2D) ─────────────────────────
// Animated Canvas-based graph engine with dark/light theme,
// Riemann strips, multi-trace, 3D surfaces, vector fields,
// phase planes, Taylor series, curve tracing, param sliders.

let graphRendered = false;

// ─── EXTRACT PLOT EXPRESSION ──────────────────────────
function extractPlotExpr(qText, rawText) {
    const text = (qText || rawText || '').toLowerCase();
    let fn = '';
    let clean = (qText || rawText || '')
        .replace(/^(?:please\s+)?(?:solve|compute|evaluate|find|calculate|determine|integrate|differentiate|simplify|factor|expand|plot|graph|surface|vector\s*field|phase\s*plane|taylor\s*series)\s*:/i, '')
        .replace(/^(?:solve|compute|evaluate|find|calculate|determine|integrate|differentiate|simplify|factor|expand|plot|graph|surface|vector\s+field|phase\s+plane|taylor\s+series)\s+/i, '')
        .replace(/^[a-z]+\s*:\s*/i, '')
        .replace(/\\displaystyle/g, '').replace(/\\\\/g, '\\').replace(/\\,/g, '').replace(/∫/g, '').replace(/∫/g, '').trim();
    if (!clean || clean.length < 2) { clean = rawText || 'x^2'; }
    clean = clean
        .replace(/\\sin/g, 'sin').replace(/\\cos/g, 'cos').replace(/\\tan/g, 'tan')
        .replace(/\\sec/g, 'sec').replace(/\\csc/g, 'csc').replace(/\\cot/g, 'cot')
        .replace(/\\ln/g, 'ln').replace(/\\log/g, 'log')
        .replace(/\\sqrt\{([^}]*)\}/g, 'sqrt($1)')
        .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
        .replace(/\\pi/g, 'pi').replace(/\\theta/g, 'x')
        .replace(/\\to/g, '->').replace(/\\infty/g, 'inf')
        .replace(/\\int.*$/, '').replace(/\\sum.*$/, '')
        .replace(/x\^(\d+)/g, 'x^$1').replace(/\^2/g, '^2').replace(/\^3/g, '^3');
    if (/integrate|∫/.test(text)) {
        const m = clean.match(/(?:int\s+)?(.+?)\s*d\s*[a-z]/i) || clean.match(/(.+?)\s+from\s+/i);
        fn = m ? m[1].trim() : clean; fn = fn.replace(/^\\?int\s*/, '');
        fn = fn.replace(/\s+from\s+.*$/, '').replace(/\s+d\s*[a-z].*$/, '').trim();
    } else if (/differentiate|derivative/.test(text)) {
        const m = clean.match(/d[\/\\]d[a-z]\s*(.+)/i) || clean.match(/d\/dx\s*(.+)/i);
        fn = m ? m[1].trim() : clean || 'x^2';
    } else if (/surface|3[dD]/.test(text) && /z\s*=/.test(clean)) {
        fn = clean.replace(/z\s*=\s*/i, '').trim() || 'sin(x)*cos(y)';
    } else if (/=/.test(clean) && !/z\s*=/.test(clean)) {
        const sides = clean.split('=');
        if (sides.length >= 2) { const l = sides[0].replace(/^(?:solve|find)\s*/i, '').trim(), r = sides[1].trim(); fn = `(${l}) - (${r})`; } else fn = clean;
    } else if (/lim|limit/.test(text)) { const m = clean.match(/lim[^a-z]*([a-z].+)/i); fn = m ? m[1].trim() : 'sin(x)/x';
    } else if (/sum|∑/.test(text)) { fn = '1/x^2';
    } else { fn = clean || 'x^2'; }
    fn = fn.replace(/[{}]/g, '').trim();
    if (!fn || fn.length < 1) fn = 'x^2';
    return fn;
}

// ─── COMPILE MATH EXPRESSION ──────────────────────────
function compileExpr(fnText) {
    const js = fnText.replace(/\^/g, '**');
    try { return new Function('x', 'with (Math) { try { return (' + js + '); } catch(e) { return NaN; } }'); }
    catch (e) { return function() { return NaN; }; }
}
function compileExpr2(fnText) {
    const js = fnText.replace(/\^/g, '**');
    try { return new Function('x', 'y', 'with (Math) { try { return (' + js + '); } catch(e) { return NaN; } }'); }
    catch (e) { return function() { return NaN; }; }
}

// ─── THEME COLORS ─────────────────────────────────────
let _dk = null;
function isDark() { if (_dk === null) _dk = matchMedia('(prefers-color-scheme: dark)').matches; return _dk; }
const TH = {
    get bg() { return isDark() ? '#0d1425' : '#f2f6fe'; },
    get grid() { return isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; },
    get axis() { return isDark() ? 'rgba(200,220,250,0.2)' : 'rgba(40,60,100,0.2)'; },
    get txt() { return isDark() ? 'rgba(160,190,230,0.55)' : 'rgba(60,80,120,0.6)'; },
    get lbl() { return isDark() ? 'rgba(160,210,200,0.3)' : 'rgba(20,90,70,0.4)'; },
    get pos() { return isDark() ? 'rgba(80,180,190,0.7)' : 'rgba(40,140,150,0.65)'; },
    get neg() { return isDark() ? 'rgba(220,100,100,0.65)' : 'rgba(180,60,60,0.6)'; },
    get curve() { return isDark() ? '#f0b37a' : '#b85c10'; },
    get dot() { return isDark() ? '#fff5e6' : '#b85c10'; },
};
// ─── ANIMATION STATE ──────────────────────────────────
let _sweepAnim = { phase: 0, running: false, raf: null, lastT: null, bounds: null, fnText: '', traces: null };

// ─── CANVAS MATH GRAPH ENGINE ─────────────────────────
function plotFunction(traces, bounds, opts) {
    bounds = bounds || { xMin: -6, xMax: 6, yMin: -4, yMax: 4 };
    opts = opts || {};
    if (typeof traces === 'string') traces = [{ fn: traces, color: '#3b6eff', label: 'y = ' + traces }];
    if (!Array.isArray(traces)) traces = [{ fn: 'x^2', color: '#3b6eff', label: 'y = x^2' }];

    const W = 800, H = 420, P = { t: 32, b: 38, l: 52, r: 24 };
    const GW = W - P.l - P.r, GH = H - P.t - P.b;
    function mx(x) { return P.l + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * GW; }
    function my(y) { return P.t + GH - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * GH; }

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;height:100%;display:block';
    const ctx = canvas.getContext('2d');

    // Sweep animation support
    const sweepX = opts.sweepX !== undefined ? opts.sweepX : bounds.xMax + 1;
    const sweepProgress = (sweepX - bounds.xMin) / (bounds.xMax - bounds.xMin);

    // Background
    ctx.fillStyle = TH.bg; ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.lineWidth = 0.6; ctx.strokeStyle = TH.grid;
    for (let xg = Math.ceil(bounds.xMin); xg <= bounds.xMax; xg++) {
        if (xg === 0) continue;
        ctx.beginPath(); ctx.moveTo(mx(xg), P.t); ctx.lineTo(mx(xg), H - P.b); ctx.stroke();
    }
    for (let yg = Math.ceil(bounds.yMin); yg <= bounds.yMax; yg++) {
        if (yg === 0) continue;
        ctx.beginPath(); ctx.moveTo(P.l, my(yg)); ctx.lineTo(W - P.r, my(yg)); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = TH.axis; ctx.lineWidth = 1.0;
    if (bounds.xMin < 0 && bounds.xMax > 0) { ctx.beginPath(); ctx.moveTo(mx(0), P.t); ctx.lineTo(mx(0), H - P.b); ctx.stroke(); }
    if (bounds.yMin < 0 && bounds.yMax > 0) { ctx.beginPath(); ctx.moveTo(P.l, my(0)); ctx.lineTo(W - P.r, my(0)); ctx.stroke(); }

    // Tick labels
    ctx.fillStyle = TH.txt; ctx.font = '10px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let xg = Math.ceil(bounds.xMin); xg <= bounds.xMax; xg++) { if (xg === 0) continue; ctx.fillText(String(xg), mx(xg), H - P.b + 4); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let yg = Math.ceil(bounds.yMin); yg <= bounds.yMax; yg++) { if (yg === 0) continue; ctx.fillText(String(yg), P.l - 6, my(yg)); }
    if (bounds.xMin < 0 && bounds.xMax > 0 && bounds.yMin < 0 && bounds.yMax > 0) {
        ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('0', mx(0) - 4, my(0) + 3);
    }
    ctx.fillStyle = TH.txt; ctx.font = '11px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('x', W - P.r - 2, my(0) - 4);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('y', mx(0) + 4, P.t + 4);

    const compiledTraces = [];
    const legendItems = [];
    traces.forEach((tr, idx) => {
        const color = tr.color || ['#3b6eff', '#59ff6b', '#ff6b6b', '#ffbd3b', '#bd6bff', '#6bffbd', '#ff6bbd', '#6bbdff'][idx % 8];
        const fn = tr.fn;
        const label = tr.label || '';
        const compiled = typeof fn === 'function' ? fn : compileExpr(fn);
        compiledTraces.push({ compiled, tr, color, label });

        // Faded full curve behind
        ctx.beginPath(); ctx.strokeStyle = isDark() ? 'rgba(100,130,190,0.13)' : 'rgba(80,110,160,0.1)'; ctx.lineWidth = 1;
        let started = false;
        for (let i = 0; i <= 500; i++) {
            const x = bounds.xMin + i / 500 * (bounds.xMax - bounds.xMin);
            const yv = compiled(x);
            if (isFinite(yv) && yv > bounds.yMin - 2 && yv < bounds.yMax + 2) {
                if (!started) { ctx.moveTo(mx(x), my(yv)); started = true; } else ctx.lineTo(mx(x), my(yv));
            } else { started = false; }
        }
        ctx.stroke();

        // Animated Riemann strips (sweep)
        if (tr.riemann) {
            const N_MIN = 40, N_MAX = 320;
            const t = Math.pow(Math.max(0, Math.min(1, sweepProgress)), 1.6);
            const N = Math.round(N_MIN + t * (N_MAX - N_MIN));
            const a = tr.riemann.a !== undefined ? tr.riemann.a : bounds.xMin;
            const b = tr.riemann.b !== undefined ? tr.riemann.b : bounds.xMax;
            const dx = (b - a) / N;
            const pxW = Math.max(0.5, mx(a + dx) - mx(a));
            const pyB = my(0);

            let area = 0;
            for (let i = 0; i < N; i++) {
                const xL = a + i * dx;
                if (xL >= sweepX) break;
                const xM = xL + dx / 2;
                const yv = compiled(xM);
                if (!isFinite(yv)) continue;
                area += yv * dx;
                const pyT = my(yv), rTop = Math.min(pyT, pyB), rH = Math.abs(pyT - pyB);
                if (yv >= 0) {
                    const hue = 160 + 20 * ((xM - bounds.xMin) / (bounds.xMax - bounds.xMin));
                    ctx.fillStyle = isDark() ? `hsla(${hue},60%,50%,0.68)` : `hsla(${hue},65%,30%,0.60)`;
                } else {
                    ctx.fillStyle = isDark() ? 'hsla(0,65%,58%,0.68)' : 'hsla(0,60%,36%,0.60)';
                }
                ctx.fillRect(mx(xL), rTop, pxW, rH);
                if (pxW > 5) {
                    ctx.strokeStyle = isDark() ? 'rgba(220,240,230,0.12)' : 'rgba(0,80,40,0.1)';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(mx(xL), rTop, pxW, rH);
                }
            }

            // Stage label
            const stage = N <= 80 ? 'wide blocks →' : N <= 160 ? 'shrinking →' : N <= 250 ? 'getting thinner →' : 'thin strips ✓';
            ctx.fillStyle = isDark() ? 'rgba(180,220,210,0.35)' : 'rgba(30,100,80,0.4)';
            ctx.font = '12px monospace';
            ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText(`n = ${N}  ${stage}`, P.l + 10, P.t + 6);

            // Bright curve up to sweepX
            if (sweepX > bounds.xMin + 0.05) {
                ctx.beginPath(); ctx.strokeStyle = TH.curve; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
                const steps = Math.max(60, Math.round(sweepProgress * 380));
                started = false;
                for (let i = 0; i <= steps; i++) {
                    const x = bounds.xMin + i / steps * (sweepX - bounds.xMin);
                    const yv = compiled(x);
                    if (isFinite(yv) && yv > bounds.yMin - 2 && yv < bounds.yMax + 2) {
                        if (!started) { ctx.moveTo(mx(x), my(yv)); started = true; } else ctx.lineTo(mx(x), my(yv));
                    } else { started = false; }
                }
                ctx.stroke();
            }

            // Glowing dot at sweep front
            const dotY = compiled(sweepX);
            if (isFinite(dotY)) {
                ctx.fillStyle = TH.dot;
                ctx.beginPath(); ctx.arc(mx(sweepX), my(dotY), 5, 0, 2 * Math.PI); ctx.fill();
            }

            // Dashed vertical marker
            ctx.strokeStyle = isDark() ? 'rgba(200,210,240,0.15)' : 'rgba(50,80,160,0.15)';
            ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
            ctx.beginPath(); ctx.moveTo(mx(sweepX), P.t); ctx.lineTo(mx(sweepX), H - P.b); ctx.stroke();
            ctx.setLineDash([]);
        }

        // Integral shading (static, behind sweep)
        if (tr.integral && sweepX >= bounds.xMax) {
            try {
                const a = tr.integral[0] || 0, b = tr.integral[1] || 3;
                const dx = (b - a) / 120;
                for (let xv = a; xv <= b; xv += dx) {
                    const yv = compiled(xv);
                    if (!isFinite(yv)) continue;
                    const px = mx(xv), pw2 = Math.max(0.5, mx(xv + dx) - mx(xv));
                    const pyT = my(yv), pyB = my(0);
                    const rTop = Math.min(pyT, pyB), rH = Math.abs(pyT - pyB);
                    ctx.fillStyle = yv >= 0 ? TH.pos : TH.neg;
                    ctx.fillRect(px, rTop, pw2, rH);
                }
            } catch (e) {}
        }

        // Derivative tangent
        if (tr.derivative) {
            try {
                const hh = 0.001, txv = 0.5;
                const tf = compiled(txv), tfd = (compiled(txv + hh) - compiled(txv - hh)) / (2 * hh);
                if (isFinite(tf) && isFinite(tfd)) {
                    const tlx = bounds.xMin, trx = bounds.xMax;
                    const tly = tf + tfd * (tlx - txv), trY = tf + tfd * (trx - txv);
                    if (isFinite(tly) && isFinite(trY)) {
                        ctx.strokeStyle = 'rgba(240,179,122,0.4)'; ctx.lineWidth = 1.5;
                        ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(mx(tlx), my(tly)); ctx.lineTo(mx(trx), my(trY)); ctx.stroke(); ctx.setLineDash([]);
                        ctx.fillStyle = 'rgba(240,179,122,0.5)'; ctx.beginPath(); ctx.arc(mx(txv), my(tf), 4, 0, 2 * Math.PI); ctx.fill();
                    }
                }
            } catch (e) {}
        }

        // Non-sweep curve (drawn when no riemann or sweep complete)
        if (!tr.riemann || sweepX >= bounds.xMax) {
            ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            started = false;
            const drawLimit = tr.riemann ? sweepX : bounds.xMax;
            for (let i = 0; i <= 500; i++) {
                const x = bounds.xMin + i / 500 * (drawLimit - bounds.xMin);
                const yv = compiled(x);
                if (isFinite(yv) && yv > bounds.yMin - 2 && yv < bounds.yMax + 2) {
                    if (!started) { ctx.moveTo(mx(x), my(yv)); started = true; } else ctx.lineTo(mx(x), my(yv));
                } else { started = false; }
            }
            ctx.stroke();
        }

        if (label) legendItems.push({ color, label });
    });

    // Legend
    if (opts.showLegend !== false && legendItems.length > 1) {
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        let ly = P.t + 10;
        legendItems.forEach(li => {
            ctx.fillStyle = li.color; ctx.fillRect(P.l + 4, ly - 2, 14, 2.5);
            ctx.fillStyle = TH.txt; ctx.font = '9px monospace';
            ctx.fillText(li.label, P.l + 22, ly); ly += 16;
        });
    }

    if (traces[0] && traces[0].label && legendItems.length <= 1) {
        ctx.fillStyle = TH.txt; ctx.font = '10px monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(traces[0].label, P.l + 8, P.t + 6);
    }

    return canvas;
}

// ─── SWEEP ANIMATION ─────────────────────────────────
let _sweepSpeed = 0.7;

function setSweepSpeed(v) { _sweepSpeed = Math.max(0.1, Math.min(3, v)); }

function startGraphSweepAnimation(fnText, bounds, opts) {
    stopGraphSweepAnimation();
    const container = document.getElementById('desmosContainer');
    if (!container) return;
    _sweepAnim = { phase: 0, running: true, raf: null, lastT: null, bounds: { ...bounds }, fnText };
    const sweepOpts = opts || {};
    const traces = sweepOpts.traces || [{ fn: fnText, color: '#3b6eff', label: 'y = ' + fnText, riemann: { a: bounds.xMin, b: bounds.xMax } }];

    // Draw first frame synchronously so a canvas exists for initGraphInteraction
    function renderFrame(phase) {
        const sweepX = bounds.xMin + phase;
        const canvas = plotFunction(traces, bounds, { sweepX });
        container.innerHTML = '';
        container.appendChild(canvas);
        if (_graphState) _graphState._canvas = canvas;
    }
    renderFrame(0);

    function drawFrame(ts) {
        if (!_sweepAnim.running) return;
        if (!_sweepAnim.lastT) _sweepAnim.lastT = ts;
        const dt = (ts - _sweepAnim.lastT) / 1000;
        _sweepAnim.lastT = ts;
        _sweepAnim.phase = (_sweepAnim.phase + dt * _sweepSpeed * 0.5) % (bounds.xMax - bounds.xMin);
        renderFrame(_sweepAnim.phase);
        _sweepAnim.raf = requestAnimationFrame(drawFrame);
    }
    _sweepAnim.raf = requestAnimationFrame(drawFrame);
}

function stopGraphSweepAnimation() {
    if (_sweepAnim.raf) { cancelAnimationFrame(_sweepAnim.raf); _sweepAnim.raf = null; }
    _sweepAnim.running = false;
    _sweepAnim.lastT = null;
}

// ─── 3D SURFACE (Canvas) ──────────────────────────────
function plotSurface3D(fnText, bounds) {
    bounds = bounds || { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
    const W = 800, H = 420;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;height:100%;display:block';
    const ctx = canvas.getContext('2d');
    const compiled = compileExpr2(fnText);
    const gridRes = 20;
    const zScale = 1.2;

    function project(x, y, z) {
        const sx = (x - bounds.xMin) / (bounds.xMax - bounds.xMin) - 0.5;
        const sy = (y - bounds.yMin) / (bounds.yMax - bounds.yMin) - 0.5;
        const sz = z * zScale;
        return { x: 400 + (sx - sy) * 220, y: 220 + (sx + sy) * 120 - sz * 40 };
    }

    const grid = [];
    for (let i = 0; i <= gridRes; i++) {
        const row = [];
        for (let j = 0; j <= gridRes; j++) {
            const x = bounds.xMin + (bounds.xMax - bounds.xMin) * i / gridRes;
            const y = bounds.yMin + (bounds.yMax - bounds.yMin) * j / gridRes;
            let z = 0; try { z = compiled(x, y); if (!isFinite(z)) z = 0; } catch (e) { z = 0; }
            row.push(project(x, y, z));
        }
        grid.push(row);
    }

    ctx.fillStyle = TH.bg; ctx.fillRect(0, 0, W, H);

    // Floor grid
    ctx.strokeStyle = isDark() ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridRes; i++) {
        ctx.beginPath();
        for (let j = 0; j <= gridRes; j++) {
            const p = project(bounds.xMin + (bounds.xMax - bounds.xMin) * i / gridRes,
                bounds.yMin + (bounds.yMax - bounds.yMin) * j / gridRes, 0);
            j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.beginPath();
        for (let j = 0; j <= gridRes; j++) {
            const p = project(bounds.xMin + (bounds.xMax - bounds.xMin) * j / gridRes,
                bounds.yMin + (bounds.yMax - bounds.yMin) * i / gridRes, 0);
            j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
    }

    // Surface mesh
    for (let i = 0; i < gridRes; i++) {
        for (let j = 0; j < gridRes; j++) {
            const p00 = grid[i][j], p10 = grid[i + 1][j], p01 = grid[i][j + 1], p11 = grid[i + 1][j + 1];
            let s = 0, c = 0;
            try { s += compiled(bounds.xMin + (bounds.xMax - bounds.xMin) * i / gridRes, bounds.yMin + (bounds.yMax - bounds.yMin) * j / gridRes); c++; } catch (e) { }
            try { s += compiled(bounds.xMin + (bounds.xMax - bounds.xMin) * (i + 1) / gridRes, bounds.yMin + (bounds.yMax - bounds.yMin) * (j + 1) / gridRes); c++; } catch (e) { }
            const avgZ = c ? s / c : 0;
            const z01 = Math.max(0, Math.min(1, (avgZ + 1) / 2));
            const r = Math.round(20 + z01 * 40), g = Math.round(60 + z01 * 80), b = Math.round(200 - z01 * 100);
            ctx.fillStyle = `rgba(${r},${g},${b},0.12)`;
            ctx.strokeStyle = `rgba(59,110,255,0.06)`;
            ctx.lineWidth = 0.3;
            ctx.beginPath();
            ctx.moveTo(p00.x, p00.y); ctx.lineTo(p10.x, p10.y);
            ctx.lineTo(p11.x, p11.y); ctx.lineTo(p01.x, p01.y); ctx.closePath();
            ctx.fill(); ctx.stroke();
        }
    }

    ctx.fillStyle = TH.txt; ctx.font = '10px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('x', 60, 230);
    ctx.textAlign = 'right'; ctx.fillText('y', 740, 230);
    ctx.textAlign = 'center'; ctx.fillText('z', 400, 20);
    return canvas;
}

// ─── VECTOR FIELD (Canvas) ────────────────────────────
function plotVectorField(dxText, dyText, bounds) {
    bounds = bounds || { xMin: -5, xMax: 5, yMin: -4, yMax: 4 };
    const W = 800, H = 420, P = { t: 32, b: 38, l: 52, r: 24 };
    const GW = W - P.l - P.r, GH = H - P.t - P.b;
    const dxCompiled = compileExpr2(dxText);
    const dyCompiled = compileExpr2(dyText);
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;height:100%;display:block';
    const ctx = canvas.getContext('2d');

    function mx(x) { return P.l + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * GW; }
    function my(y) { return P.t + GH - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * GH; }

    ctx.fillStyle = TH.bg; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = TH.grid; ctx.lineWidth = 0.5;
    for (let gx = Math.ceil(bounds.xMin); gx <= bounds.xMax; gx++) { if (gx === 0) continue; ctx.beginPath(); ctx.moveTo(mx(gx), P.t); ctx.lineTo(mx(gx), H - P.b); ctx.stroke(); }
    for (let gy = Math.ceil(bounds.yMin); gy <= bounds.yMax; gy++) { if (gy === 0) continue; ctx.beginPath(); ctx.moveTo(P.l, my(gy)); ctx.lineTo(W - P.r, my(gy)); ctx.stroke(); }

    ctx.strokeStyle = TH.axis; ctx.lineWidth = 0.8;
    if (bounds.xMin < 0 && bounds.xMax > 0) { ctx.beginPath(); ctx.moveTo(mx(0), P.t); ctx.lineTo(mx(0), H - P.b); ctx.stroke(); }
    if (bounds.yMin < 0 && bounds.yMax > 0) { ctx.beginPath(); ctx.moveTo(P.l, my(0)); ctx.lineTo(W - P.r, my(0)); ctx.stroke(); }

    const spacing = 1.2, scale = 0.35;
    for (let gx = Math.ceil(bounds.xMin / spacing) * spacing; gx <= bounds.xMax; gx += spacing) {
        for (let gy = Math.ceil(bounds.yMin / spacing) * spacing; gy <= bounds.yMax; gy += spacing) {
            if (Math.abs(gx) < 0.3 && Math.abs(gy) < 0.3) continue;
            let dx, dy;
            try { dx = dxCompiled(gx, gy); dy = dyCompiled(gx, gy); } catch (e) { continue; }
            if (!isFinite(dx) || !isFinite(dy) || (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001)) continue;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / len, ny = dy / len;
            const arrLen = Math.min(0.8, len * scale);
            const sx = mx(gx), sy = my(gy), ex = mx(gx + nx * arrLen), ey = my(gy + ny * arrLen);
            ctx.strokeStyle = isDark() ? 'rgba(59,110,255,0.2)' : 'rgba(59,110,255,0.15)'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
            const angle = Math.atan2(ny, nx), ah = 4;
            ctx.fillStyle = isDark() ? 'rgba(59,110,255,0.2)' : 'rgba(59,110,255,0.15)';
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - ah * Math.cos(angle - 0.4), ey - ah * Math.sin(angle - 0.4));
            ctx.lineTo(ex - ah * Math.cos(angle + 0.4), ey - ah * Math.sin(angle + 0.4));
            ctx.closePath(); ctx.fill();
        }
    }
    return canvas;
}

// ─── PHASE PLANE (Canvas) ─────────────────────────────
function plotPhasePlane(dxText, dyText, bounds) {
    bounds = bounds || { xMin: -4, xMax: 4, yMin: -4, yMax: 4 };
    const W = 800, H = 420, P = { t: 32, b: 38, l: 52, r: 24 };
    const GW = W - P.l - P.r, GH = H - P.t - P.b;
    const dxCompiled = compileExpr2(dxText);
    const dyCompiled = compileExpr2(dyText);
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;height:100%;display:block';
    const ctx = canvas.getContext('2d');

    function mx(x) { return P.l + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * GW; }
    function my(y) { return P.t + GH - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * GH; }

    ctx.fillStyle = TH.bg; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = TH.grid; ctx.lineWidth = 0.5;
    for (let gx = Math.ceil(bounds.xMin); gx <= bounds.xMax; gx++) { if (gx === 0) continue; ctx.beginPath(); ctx.moveTo(mx(gx), P.t); ctx.lineTo(mx(gx), H - P.b); ctx.stroke(); }
    for (let gy = Math.ceil(bounds.yMin); gy <= bounds.yMax; gy++) { if (gy === 0) continue; ctx.beginPath(); ctx.moveTo(P.l, my(gy)); ctx.lineTo(W - P.r, my(gy)); ctx.stroke(); }
    ctx.strokeStyle = TH.axis; ctx.lineWidth = 0.8;
    if (bounds.xMin < 0 && bounds.xMax > 0) { ctx.beginPath(); ctx.moveTo(mx(0), P.t); ctx.lineTo(mx(0), H - P.b); ctx.stroke(); }
    if (bounds.yMin < 0 && bounds.yMax > 0) { ctx.beginPath(); ctx.moveTo(P.l, my(0)); ctx.lineTo(W - P.r, my(0)); ctx.stroke(); }

    // Nullclines as scatter
    function drawNullcline(expr, color) {
        const fn = compileExpr2(expr);
        for (let xv = bounds.xMin; xv <= bounds.xMax; xv += (bounds.xMax - bounds.xMin) / 150) {
            for (let yv = bounds.yMin; yv <= bounds.yMax; yv += (bounds.yMax - bounds.yMin) / 150) {
                try { const v = fn(xv, yv); if (isFinite(v) && Math.abs(v) < 0.15) { ctx.fillStyle = color; ctx.fillRect(mx(xv) - 0.5, my(yv) - 0.5, 1, 1); } } catch (e) { }
            }
        }
    }
    drawNullcline(dxText, 'rgba(255,107,107,0.3)');
    drawNullcline(dyText, 'rgba(107,255,107,0.3)');

    // Direction arrows
    ctx.strokeStyle = isDark() ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.8;
    const spacing = 1.5;
    for (let gx = Math.ceil(bounds.xMin / spacing) * spacing; gx <= bounds.xMax; gx += spacing) {
        for (let gy = Math.ceil(bounds.yMin / spacing) * spacing; gy <= bounds.yMax; gy += spacing) {
            if (Math.abs(gx) < 0.3 && Math.abs(gy) < 0.3) continue;
            let dx, dy;
            try { dx = dxCompiled(gx, gy); dy = dyCompiled(gx, gy); } catch (e) { continue; }
            if (!isFinite(dx) || !isFinite(dy) || Math.sqrt(dx * dx + dy * dy) < 0.01) continue;
            const len = Math.sqrt(dx * dx + dy * dy), nx = dx / len, ny = dy / len;
            const sx = mx(gx), sy = my(gy), ex = mx(gx + nx * 0.5), ey = my(gy + ny * 0.5);
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        }
    }

    // Trajectories
    function traceTrajectory(x0, y0, color) {
        const dt = 0.05; let cx = x0, cy = y0;
        ctx.strokeStyle = color; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(mx(cx), my(cy));
        for (let i = 0; i < 200; i++) {
            if (cx < bounds.xMin || cx > bounds.xMax || cy < bounds.yMin || cy > bounds.yMax) break;
            ctx.lineTo(mx(cx), my(cy));
            try { const dx = dxCompiled(cx, cy), dy = dyCompiled(cx, cy); cx += dx * dt; cy += dy * dt; } catch (e) { break; }
        }
        ctx.stroke();
    }
    traceTrajectory(1, 1, 'rgba(59,110,255,0.5)');
    traceTrajectory(-1, -1, 'rgba(107,255,189,0.5)');
    traceTrajectory(1, -2, 'rgba(255,107,189,0.5)');

    ctx.fillStyle = TH.txt; ctx.font = '9px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('Phase Plane', P.l + 6, P.t + 6);
    return canvas;
}

// ─── TAYLOR SERIES (Canvas) ───────────────────────────
function generateTaylorTerms(fnText, n) {
    const compiled = compileExpr(fnText);
    const terms = [], h = 0.001;
    const coeffs = [[1], [-1, 1], [1, -2, 1], [-1, 3, -3, 1], [1, -4, 6, -4, 1], [-1, 5, -10, 10, -5, 1], [1, -6, 15, -20, 15, -6, 1]];
    for (let k = 0; k <= n; k++) {
        let deriv = 0;
        if (k === 0) { deriv = compiled(0); } else {
            const c = coeffs[Math.min(k, coeffs.length - 1)] || [];
            let sum = 0;
            for (let i = 0; i < c.length; i++) { const yv = compiled((i - (c.length - 1) / 2) * h * 2); if (isFinite(yv)) sum += c[i] * yv; }
            deriv = sum / Math.pow(2 * h, k);
        }
        if (isFinite(deriv) && Math.abs(deriv) > 1e-10) terms.push({ coeff: deriv / factorial(k), order: k });
    }
    return terms;
}
function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
function taylorEval(terms, x) { let s = 0; for (const t of terms) s += t.coeff * Math.pow(x, t.order); return s; }

function renderTaylorSeries(fnText, bounds, maxN) {
    maxN = maxN || 5;
    const terms = generateTaylorTerms(fnText, maxN);
    const traces = [{ fn: fnText, label: 'f(x)' }];
    const colors = ['#ff6b6b', '#ffbd3b', '#6bffbd', '#bd6bff', '#ff6bbd', '#6bbdff'];
    for (let k = 1; k <= Math.min(maxN, terms.length); k++) {
        const partialTerms = terms.slice(0, k);
        traces.push({ fn: function (x) { return taylorEval(partialTerms, x); }, color: colors[(k - 1) % colors.length], label: 'T_' + k + '(x)' });
    }
    return plotFunction(traces, bounds, { showLegend: true });
}

// ─── CURVE TRACING ANIMATION (Canvas) ─────────────────
let _traceAnimation = null;
function animateCurveTrace(fnText, bounds) {
    stopCurveTrace();
    const compiled = compileExpr(fnText);
    const pts = [];
    for (let xv = bounds.xMin; xv <= bounds.xMax; xv += (bounds.xMax - bounds.xMin) / 200) {
        const yv = compiled(xv);
        if (isFinite(yv)) pts.push({ x: xv, y: yv });
    }
    if (pts.length < 2) return;

    const container = document.getElementById('desmosContainer');
    if (!container) return;
    const traces = _storedArgs ? [_storedArgs.fn] : [fnText];
    const canvas = plotFunction(traces, bounds);
    container.innerHTML = '';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, P = { t: 32, b: 38, l: 52, r: 24 };
    const GW = W - P.l - P.r, GH = H - P.t - P.b;

    let idx = 0, trailPts = [];
    _traceAnimation = setInterval(() => {
        if (idx >= pts.length) { idx = 0; trailPts = []; }
        trailPts.push(pts[idx]);

        // Redraw base plot
        ctx.fillStyle = TH.bg; ctx.fillRect(0, 0, W, H);

        // Re-draw axes and curve (simplified: re-plot on same canvas)
        const tempCanvas = plotFunction(traces, bounds);
        ctx.drawImage(tempCanvas, 0, 0);

        // Draw trail
        if (trailPts.length > 1) {
            ctx.strokeStyle = 'rgba(89,255,107,0.15)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath();
            trailPts.forEach((p, i) => {
                const sx = P.l + ((p.x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * GW;
                const sy = P.t + GH - ((p.y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * GH;
                i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
            });
            ctx.stroke();
        }

        // Draw dot
        if (trailPts.length > 0) {
            const p = pts[idx];
            const sx = P.l + ((p.x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * GW;
            const sy = P.t + GH - ((p.y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * GH;
            ctx.fillStyle = '#59ff6b'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 2 * Math.PI); ctx.fill();
            ctx.shadowColor = '#59ff6b'; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 2 * Math.PI); ctx.fill();
            ctx.shadowBlur = 0;
        }
        idx += 3;
    }, 30);
}

function stopCurveTrace() {
    if (_traceAnimation) { clearInterval(_traceAnimation); _traceAnimation = null; }
}

// ─── GRAPH-PER-STEP MORPHING ──────────────────────────
let _stepGraphs = [];
function setStepGraphs(stepGraphData) { _stepGraphs = stepGraphData || []; }
function renderGraphForStep(stepIndex) {
    if (!_stepGraphs || _stepGraphs.length === 0) return;
    const sg = _stepGraphs[stepIndex];
    if (!sg) return;
    const container = document.getElementById('desmosContainer');
    const panel = document.getElementById('graphPanel');
    if (!container) return;
    const bounds = (sg.bounds || (_storedArgs ? _storedArgs.bounds : { xMin: -6, xMax: 6, yMin: -4, yMax: 4 }));
    const canvas = plotFunction(sg.traces || [sg.fn || 'x^2'], bounds, sg.opts || {});
    container.innerHTML = ''; container.appendChild(canvas);
    if (panel && !panel.classList.contains('visible')) panel.classList.add('visible');
    initGraphInteraction(sg.fn || 'x^2', bounds);
}
function clearStepGraphs() { _stepGraphs = []; }

// ─── GRAPH INTERACTION (Canvas) ──────────────────────
let _graphState = null;

function mxFromBounds(x, bounds) {
    const P = { t: 32, b: 38, l: 52, r: 24 };
    const GW = 800 - P.l - P.r;
    return P.l + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * GW;
}

function initGraphInteraction(fnText, bounds) {
    const container = document.getElementById('desmosContainer');
    if (!container) return;

    if (!_graphState) {
        const tip = document.createElement('div');
        tip.className = 'graph-tooltip';
        tip.style.cssText = 'position:absolute;background:rgba(10,10,20,0.92);color:#cfdfff;padding:4px 8px;border-radius:5px;font-size:11px;font-family:monospace;pointer-events:none;opacity:0;transition:opacity 0.15s;z-index:100;border:0.5px solid rgba(255,255,255,0.08);';
        container.appendChild(tip);
        _graphState = { fn: fnText, bounds: { ...bounds }, dragging: false, wasDragged: false, dragInfo: null, tooltip: tip };
    } else {
        _graphState.fn = fnText;
        _graphState.bounds = { ...bounds };
    }

    if (container.dataset.graphReady) return;
    const firstCanvas = container.querySelector('canvas');
    if (!firstCanvas) return;
    container.dataset.graphReady = '1';

    function getLiveCanvas() { return container.querySelector('canvas') || firstCanvas; }

    function screenToMath(cx, cy) {
        const cv = getLiveCanvas();
        if (!cv) return { x: NaN, y: NaN };
        const rect = cv.getBoundingClientRect();
        const sx = (cx - rect.left) * (cv.width / rect.width);
        const sy = (cy - rect.top) * (cv.height / rect.height);
        const P = { t: 32, b: 38, l: 52, r: 24 };
        const GW = cv.width - P.l - P.r, GH = cv.height - P.t - P.b;
        const b = _graphState.bounds;
        const mx = b.xMin + ((sx - P.l) / GW) * (b.xMax - b.xMin);
        const my = b.yMax - ((sy - P.t) / GH) * (b.yMax - b.yMin);
        return { x: mx, y: my };
    }

    function reRender() {
        stopGraphSweepAnimation();
        const curFn = _storedArgs ? _storedArgs.fn : _graphState.fn;
        const newCanvas = plotFunction(curFn, _graphState.bounds);
        container.innerHTML = '';
        container.appendChild(newCanvas);
        container.dataset.graphReady = '1';
        if (_storedArgs) _storedArgs.bounds = { ..._graphState.bounds };
        if (_graphState && _graphState.tooltip) _graphState.tooltip.style.opacity = '0';
    }

    container.addEventListener('mousedown', (e) => {
        if (!_graphState || e.button !== 0) return;
        const cv = getLiveCanvas();
        if (!cv || !cv.contains(e.target)) return;
        _graphState.dragging = true;
        _graphState.wasDragged = false;
        _graphState.dragInfo = { startX: e.clientX, startY: e.clientY, boundsStart: { ..._graphState.bounds } };
        container.style.cursor = 'grabbing';
        if (_graphState.tooltip) _graphState.tooltip.style.opacity = '0';
    });

    document.addEventListener('mousemove', (e) => {
        if (!_graphState || !_graphState.dragging || !_graphState.dragInfo) return;
        if (Math.abs(e.clientX - _graphState.dragInfo.startX) > 3 || Math.abs(e.clientY - _graphState.dragInfo.startY) > 3) _graphState.wasDragged = true;
        const b = _graphState.dragInfo.boundsStart;
        const cv = getLiveCanvas(); if (!cv) return;
        const rect = cv.getBoundingClientRect();
        const dx = (e.clientX - _graphState.dragInfo.startX) * (cv.width / rect.width) / (cv.width - 80) * (b.xMax - b.xMin);
        const dy = (_graphState.dragInfo.startY - e.clientY) * (cv.height / rect.height) / (cv.height - 80) * (b.yMax - b.yMin);
        _graphState.bounds = { xMin: b.xMin - dx, xMax: b.xMax - dx, yMin: b.yMin - dy, yMax: b.yMax - dy };
        reRender();
    });

    document.addEventListener('mouseup', () => {
        if (!_graphState) return;
        if (_graphState.dragging) { _graphState.dragging = false; _graphState.dragInfo = null; container.style.cursor = 'default'; }
    });

    container.addEventListener('click', (e) => {
        if (!_graphState) return;
        if (_graphState.wasDragged) { _graphState.wasDragged = false; return; }
        if (_graphState.dragging) return;
        const cv = getLiveCanvas(); if (!cv || !cv.contains(e.target)) return;
        const c = screenToMath(e.clientX, e.clientY);
        if (!isFinite(c.x) || !isFinite(c.y)) return;
        const tip = _graphState.tooltip;
        tip.textContent = '(' + c.x.toFixed(3) + ', ' + c.y.toFixed(3) + ')';
        const crect = container.getBoundingClientRect();
        tip.style.left = Math.min(e.clientX - crect.left + 12, container.clientWidth - 120) + 'px';
        tip.style.top = Math.max(e.clientY - crect.top - 30, 4) + 'px';
        tip.style.opacity = '1';
    });

    container.addEventListener('wheel', (e) => {
        if (!_graphState) return;
        e.preventDefault();
        const cv = getLiveCanvas(); if (!cv) return;
        const rect = cv.getBoundingClientRect();
        const sx = (e.clientX - rect.left) * (cv.width / rect.width);
        const sy = (e.clientY - rect.top) * (cv.height / rect.height);
        const P = { t: 32, b: 38, l: 52, r: 24 };
        const GW = cv.width - P.l - P.r, GH = cv.height - P.t - P.b;
        const b = _graphState.bounds;
        const mx = b.xMin + ((sx - P.l) / GW) * (b.xMax - b.xMin);
        const my = b.yMax - ((sy - P.t) / GH) * (b.yMax - b.yMin);
        const factor = e.deltaY > 0 ? 1.15 : 0.85;
        const rx = (b.xMax - b.xMin) * factor / 2;
        const ry = (b.yMax - b.yMin) * factor / 2;
        _graphState.bounds = { xMin: mx - rx, xMax: mx + rx, yMin: my - ry, yMax: my + ry };
        reRender();
    }, { passive: false });

    _graphState._canvas = firstCanvas;
}

// ─── PARAMETER SLIDERS ────────────────────────────────
let _sliderState = { params: {}, active: false };
function initParamSliders(paramDefs, onUpdate) {
    const panel = document.getElementById('graphPanel');
    if (!panel) return;
    const existing = document.getElementById('paramSliderArea');
    if (existing) existing.remove();
    const area = document.createElement('div');
    area.id = 'paramSliderArea';
    area.style.cssText = 'position:absolute;bottom:0;left:0;right:0;padding:0.5rem 1rem;background:rgba(11,20,36,0.88);border-top:1px solid rgba(255,255,255,0.04);z-index:20;';
    area.innerHTML = '<div style="color:rgba(255,255,255,0.2);font-size:0.65rem;letter-spacing:1px;margin-bottom:0.4rem;">PARAMETERS</div>';
    _sliderState.params = {};
    paramDefs.forEach((def) => {
        const val = def.default !== undefined ? def.default : 1;
        _sliderState.params[def.name] = val;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:0.5rem;align-items:center;margin-bottom:0.3rem;';
        const label = document.createElement('span');
        label.textContent = def.name + ' = ' + Number(val).toFixed(1);
        label.style.cssText = 'color:rgba(255,255,255,0.3);font-size:0.75rem;width:50px;font-family:monospace;';
        const input = document.createElement('input');
        input.type = 'range';
        input.min = def.min !== undefined ? def.min : -5;
        input.max = def.max !== undefined ? def.max : 5;
        input.step = def.step !== undefined ? def.step : 0.1;
        input.value = val;
        input.style.cssText = 'flex:1;height:4px;-webkit-appearance:none;appearance:none;background:rgba(59,110,255,0.2);border-radius:2px;outline:none;cursor:pointer;';
        input.addEventListener('input', () => {
            const v = parseFloat(input.value);
            _sliderState.params[def.name] = v;
            label.textContent = def.name + ' = ' + Number(v).toFixed(1);
            if (onUpdate) onUpdate({ ..._sliderState.params });
        });
        row.appendChild(label);
        row.appendChild(input);
        area.appendChild(row);
    });
    panel.appendChild(area);
    _sliderState.active = true;
}
function removeParamSliders() {
    const area = document.getElementById('paramSliderArea');
    if (area) area.remove();
    _sliderState.active = false;
    _sliderState.params = {};
}
function getSliderParams() { return { ..._sliderState.params }; }

// ─── DETECT BOUNDS ────────────────────────────────────
function detectBounds(qt, raw, fnText) {
    const lower = (qt || raw || '').toLowerCase();
    if (/integrate|∫/.test(lower)) return { xMin: -1, xMax: 7, yMin: -3, yMax: 3 };
    if (/differentiate|derivative/.test(lower)) return { xMin: -4, xMax: 4, yMin: -5, yMax: 5 };
    if (/lim|limit/.test(lower)) return { xMin: -10, xMax: 10, yMin: -2, yMax: 3 };
    if (/sum|∑/.test(lower)) return { xMin: 0, xMax: 12, yMin: -0.5, yMax: 3 };
    if (/quadratic|parabola|x\^2|x²/.test(lower)) return { xMin: -5, xMax: 5, yMin: -3, yMax: 8 };
    if (/sin|cos|tan|trig/.test(lower)) return { xMin: -7, xMax: 7, yMin: -3, yMax: 3 };
    if (/surface|3[dD]/.test(lower)) return { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
    if (/vector\s*field|direction\s*field/.test(lower)) return { xMin: -5, xMax: 5, yMin: -4, yMax: 4 };
    if (/phase\s*plane/.test(lower)) return { xMin: -4, xMax: 4, yMin: -4, yMax: 4 };
    if (/taylor|series/.test(lower)) return { xMin: -5, xMax: 5, yMin: -4, yMax: 6 };
    return { xMin: -6, xMax: 6, yMin: -4, yMax: 4 };
}

// ─── RENDER (public API) ──────────────────────────────
function renderGraphOnce(qt, raw) {
    const container = document.getElementById('desmosContainer');
    const panel = document.getElementById('graphPanel');
    if (!container) return;

    const fnText = extractPlotExpr(qt, raw);
    const bounds = detectBounds(qt, raw, fnText);
    const lower = (qt || raw || '').toLowerCase();

    let canvas;
    if (/vector\s*field|direction\s*field|slope\s*field/i.test(lower)) {
        const dxMatch = lower.match(/dx\s*=\s*([^,]+)/i);
        const dyMatch = lower.match(/dy\s*=\s*([^,]+)/i);
        canvas = plotVectorField(dxMatch ? dxMatch[1].trim() : 'y', dyMatch ? dyMatch[1].trim() : '-x', bounds);
    } else if (/phase\s*plane|trajectory/i.test(lower)) {
        const dxMatch = lower.match(/dx\s*=\s*([^,]+)/i);
        const dyMatch = lower.match(/dy\s*=\s*([^,]+)/i);
        canvas = plotPhasePlane(dxMatch ? dxMatch[1].trim() : 'y', dyMatch ? dyMatch[1].trim() : '-x - y', bounds);
    } else if (/surface|3[dD]|z\s*=/.test(lower) && /[xy]/.test(fnText)) {
        canvas = plotSurface3D(fnText, bounds);
    } else if (/taylor|series|approximation|polynomial/i.test(lower)) {
        canvas = renderTaylorSeries(fnText, bounds, 5);
    } else {
        const traces = [{ fn: fnText, color: '#3b6eff', label: 'y = ' + fnText, width: 3 }];
        if (/integrate|∫/.test(lower)) { traces[0].integral = [0, 3]; traces[0].riemann = { a: bounds.xMin, b: bounds.xMax }; }
        if (/differentiate|derivative/.test(lower)) traces[0].derivative = true;

        // Start sweep animation for integral problems
        if (/integrate|∫/.test(lower)) {
            container.innerHTML = '';
            graphRendered = true;
            storeGraphArgs(qt, raw, fnText, bounds);
            startGraphSweepAnimation(fnText, bounds, { traces });
            initGraphInteraction(fnText, bounds);
            if (panel) panel.classList.add('visible');
            return;
        }

        canvas = plotFunction(traces, bounds, {});
    }

    container.innerHTML = '';
    container.appendChild(canvas);
    graphRendered = true;
    storeGraphArgs(qt, raw, fnText, bounds);

    if (/quadratic|parabola/i.test(lower) && !document.getElementById('paramSliderArea')) {
        initParamSliders([
            { name: 'a', default: 1, min: -5, max: 5 },
            { name: 'b', default: 0, min: -5, max: 5 },
            { name: 'c', default: 0, min: -5, max: 5 },
        ], (params) => {
            const expr = `${params.a}*x^2 + ${params.b}*x + ${params.c}`;
            _storedArgs.fn = expr;
            const c = document.getElementById('desmosContainer');
            if (c) { c.innerHTML = ''; c.appendChild(plotFunction(expr, _storedArgs.bounds)); initGraphInteraction(expr, _storedArgs.bounds); }
        });
    }

    initGraphInteraction(fnText, bounds);
    if (panel) panel.classList.add('visible');
}

let _storedArgs = null;
function storeGraphArgs(qt, raw, fn, bounds) { _storedArgs = { qt, raw, fn, bounds }; }
function getStoredGraphArgs() { return _storedArgs; }

function reShowGraph() {
    const args = _storedArgs;
    const container = document.getElementById('desmosContainer');
    const panel = document.getElementById('graphPanel');
    if (!container) return;

    if (!args) {
        container.innerHTML = '';
        container.appendChild(plotFunction([{ fn: 'x^2', label: 'y = x^2' }], null, {}));
        if (panel) panel.classList.add('visible');
        return;
    }

    const lower = (args.qt || args.raw || '').toLowerCase();
    let canvas;
    if (/vector\s*field|direction\s*field|slope\s*field/i.test(lower)) {
        const dxMatch = lower.match(/dx\s*=\s*([^,]+)/i);
        const dyMatch = lower.match(/dy\s*=\s*([^,]+)/i);
        canvas = plotVectorField(dxMatch?.[1]?.trim() || 'y', dyMatch?.[1]?.trim() || '-x', args.bounds);
    } else if (/phase\s*plane|trajectory/i.test(lower)) {
        const dxMatch = lower.match(/dx\s*=\s*([^,]+)/i);
        const dyMatch = lower.match(/dy\s*=\s*([^,]+)/i);
        canvas = plotPhasePlane(dxMatch?.[1]?.trim() || 'y', dyMatch?.[1]?.trim() || '-x-y', args.bounds);
    } else if (/surface|3[dD]|z\s*=/.test(lower) && /[xy]/.test(args.fn)) {
        canvas = plotSurface3D(args.fn, args.bounds);
    } else if (/taylor|series|approximation/i.test(lower)) {
        canvas = renderTaylorSeries(args.fn, args.bounds, 5);
    } else {
        const traces = [{ fn: args.fn, color: '#3b6eff', label: 'y = ' + args.fn, width: 3 }];
        if (/integrate|∫/.test(lower)) { traces[0].integral = [0, 3]; traces[0].riemann = { a: args.bounds.xMin, b: args.bounds.xMax }; }
        if (/differentiate|derivative/.test(lower)) traces[0].derivative = true;

        if (/integrate|∫/.test(lower)) {
            startGraphSweepAnimation(args.fn, args.bounds, { traces });
            if (panel) panel.classList.add('visible');
            return;
        }

        canvas = plotFunction(traces, args.bounds, {});
    }

    container.innerHTML = '';
    container.appendChild(canvas);
    initGraphInteraction(args.fn, args.bounds);
    if (panel) panel.classList.add('visible');
}

function destroyGraph() {
    stopGraphSweepAnimation();
    stopCurveTrace();
    removeParamSliders();
    _graphState = null;
    const panel = document.getElementById('graphPanel');
    if (panel) panel.classList.remove('visible');
    const container = document.getElementById('desmosContainer');
    if (container) { container.innerHTML = ''; container.removeAttribute('data-graph-ready'); }
    graphRendered = false;
    _storedArgs = null;
    _stepGraphs = [];
}

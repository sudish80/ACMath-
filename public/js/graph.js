// ─── GRAPH RENDERER ──────────────────────────────────────
// SVG math graph engine with multi-trace, 3D surfaces,
// vector fields, phase planes, Riemann sums, Taylor series,
// curve tracing, parameter sliders, and per-step morphing.

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
        const m = clean.match(/(?:int\s+)?(.+?)\s*d[a-z]/i);
        fn = m ? m[1].trim() : 'sin(x)'; fn = fn.replace(/^\\?int\s*/, '');
    } else if (/differentiate|derivative/.test(text)) {
        const m = clean.match(/d[\/\\]d[a-z]\s*(.+)/i) || clean.match(/d\/dx\s*(.+)/i);
        fn = m ? m[1].trim() : clean || 'sin(x)';
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
    try { return new Function('x', 'with (Math) { try { return (' + fnText + '); } catch(e) { return NaN; } }'); }
    catch (e) { return function() { return NaN; }; }
}

function compileExpr2(fnText) {
    // For multi-variable (x,y) expressions
    try { return new Function('x', 'y', 'with (Math) { try { return (' + fnText + '); } catch(e) { return NaN; } }'); }
    catch (e) { return function() { return NaN; }; }
}

// ─── SVG MATH GRAPH ENGINE ────────────────────────────
// traces: string or array of {fn, color, label, width, dash, derivative, integral, riemann}
// opts: {bounds, qText, params, showLegend}

function hexToRgba(hex, alpha) {
    if (/^rgba?\(/.test(hex)) return hex.replace(/[\d.]+\)$/, alpha + ')').replace(/rgb\(/, 'rgba(');
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    return m ? 'rgba(' + parseInt(m[1],16) + ',' + parseInt(m[2],16) + ',' + parseInt(m[3],16) + ',' + alpha + ')' : hex;
}

function plotFunction(traces, bounds, opts) {
    bounds = bounds || { xMin: -6, xMax: 6, yMin: -4, yMax: 4 };
    opts = opts || {};
    if (typeof traces === 'string') traces = [{ fn: traces, color: '#3b6eff', label: 'y = ' + traces }];
    if (!Array.isArray(traces)) traces = [{ fn: 'x^2', color: '#3b6eff', label: 'y = x^2' }];

    const w = 900, h = 500, pad = 50;
    const pw = w - 2 * pad, ph = h - 2 * pad;
    const x0 = pad + (bounds.xMin < 0 && bounds.xMax > 0 ? (0 - bounds.xMin) / (bounds.xMax - bounds.xMin) * pw : 0);
    const y0 = pad + ph - (bounds.yMin < 0 && bounds.yMax > 0 ? (0 - bounds.yMin) / (bounds.yMax - bounds.yMin) * ph : 0);

    function toSX(x) { return pad + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * pw; }
    function toSY(y) { return pad + ph - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * ph; }
    function l(x1, y1, x2, y2, s, w, d) { return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w||1}"${d?' stroke-dasharray="'+d+'"':''}/>`; }
    function tx(x, y, t, f, sz) { return `<text x="${x}" y="${y}" fill="${f||'rgba(255,255,255,0.15)'}" font-size="${sz||10}" text-anchor="${x<w/2?'start':x>w/2?'end':'middle'}" dominant-baseline="middle" font-family="inherit">${t}</text>`; }
    function samplePoints(fn, xMin, xMax, yMin, yMax, steps) {
        const compiled = typeof fn === 'function' ? fn : compileExpr(fn);
        const pts = [];
        for (let xv = xMin; xv <= xMax; xv += (xMax - xMin) / (steps || 400)) {
            const yv = compiled(xv); const sx = toSX(xv), sy = toSY(yv);
            if (yv !== undefined && yv !== null && isFinite(yv) && yv > yMin - 2 && yv < yMax + 2) pts.push({ x: sx, y: sy });
            else if (pts.length > 1) pts.push({ break: true });
        }
        return pts;
    }
    function polyline(pts, s, w) {
        if (pts.length < 2) return '';
        const segs = []; let seg = [];
        for (const p of pts) {
            if (p.break) { if (seg.length > 1) segs.push(seg.map(pt => pt.x+','+pt.y).join(' ')); seg = []; }
            else seg.push(p);
        }
        if (seg.length > 1) segs.push(seg.map(pt => pt.x+','+pt.y).join(' '));
        return segs.map(sg => `<polyline points="${sg}" fill="none" stroke="${s||'#3b6eff'}" stroke-width="${w||2.5}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
    }

    let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">`;
    // Axes
    const x0a = toSX(0), y0a = toSY(0);
    if (bounds.xMin < 0 && bounds.xMax > 0) svg += l(x0a, pad, x0a, h-pad, 'rgba(255,255,255,0.12)', 1.2);
    if (bounds.yMin < 0 && bounds.yMax > 0) svg += l(pad, y0a, w-pad, y0a, 'rgba(255,255,255,0.12)', 1.2);
    svg += l(pad, pad, pad, h-pad, 'rgba(255,255,255,0.06)', 0.5);
    svg += l(pad, h-pad, w-pad, h-pad, 'rgba(255,255,255,0.06)', 0.5);
    // Grid
    for (let gx = Math.ceil(bounds.xMin); gx <= bounds.xMax; gx++) { if (gx === 0) continue; const sx = toSX(gx); svg += l(sx, pad, sx, h-pad, 'rgba(255,255,255,0.03)', 0.5); svg += tx(sx, y0a+16, String(gx), 'rgba(255,255,255,0.12)', 9); }
    for (let gy = Math.ceil(bounds.yMin); gy <= bounds.yMax; gy++) { if (gy === 0) continue; const sy = toSY(gy); svg += l(pad, sy, w-pad, sy, 'rgba(255,255,255,0.03)', 0.5); svg += tx(x0a-14, sy, String(gy), 'rgba(255,255,255,0.12)', 9); }
    svg += tx(w-pad-2, y0a-10, 'x', 'rgba(255,255,255,0.2)', 12);
    svg += tx(x0a+10, pad+8, 'y', 'rgba(255,255,255,0.2)', 12);
    if (bounds.xMin < 0 && bounds.xMax > 0 && bounds.yMin < 0 && bounds.yMax > 0) svg += tx(x0a-8, y0a+14, '0', 'rgba(255,255,255,0.1)', 8);

    // Render each trace
    let legendItems = [];
    traces.forEach((tr, idx) => {
        const color = tr.color || ['#3b6eff','#59ff6b','#ff6b6b','#ffbd3b','#bd6bff','#6bffbd','#ff6bbd','#6bbdff'][idx % 8];
        const fn = tr.fn; const label = tr.label || '';
        const pts = samplePoints(fn, bounds.xMin, bounds.xMax, bounds.yMin, bounds.yMax, 400);
        const compiled = typeof fn === 'function' ? fn : compileExpr(fn);

        // Curve
        svg += polyline(pts, color, tr.width || 3);
        if (pts.length > 2) svg += polyline(pts, hexToRgba(color, 0.06), (tr.width||3)+6);

        // Derivative tangent (if flagged)
        if (tr.derivative) {
            try { const hh = 0.001; const txv = 0.5; const tf = compiled(txv); const tfd = (compiled(txv+hh)-compiled(txv-hh))/(2*hh);
                if (isFinite(tf) && isFinite(tfd)) { const tlx=bounds.xMin,trx=bounds.xMax; const tly=tf+tfd*(tlx-txv),trY=tf+tfd*(trx-txv);
                    if (isFinite(tly)&&isFinite(trY)) { svg+=l(toSX(tlx),toSY(tly),toSX(trx),toSY(trY),hexToRgba(color,0.35),1.5,'4,3'); svg+=`<circle cx="${toSX(txv)}" cy="${toSY(tf)}" r="4" fill="${hexToRgba(color,0.4)}"/>`; } }
            } catch(e) {}
        }

        // Integral shading
        if (tr.integral) {
            try { const a=tr.integral[0]||0, b=tr.integral[1]||3; const shade=[]; const x0s=toSX(a),x0e=toSX(b);
                for (let xv=a;xv<=b;xv+=(b-a)/100) { const yv=compiled(xv); if (isFinite(yv)) { if (!shade.length) shade.push({x:toSX(xv),y:toSY(0)}); shade.push({x:toSX(xv),y:toSY(yv)}); } }
                if (shade.length>1) { shade.push({x:toSX(b),y:toSY(0)}); const poly=shade.map(p=>p.x+','+p.y).join(' '); svg+=`<polygon points="${poly}" fill="${hexToRgba(color,0.08)}" stroke="none"/>`; svg+=l(x0s,toSY(0),x0s,toSY(0)-20,hexToRgba(color,0.15),1); svg+=l(x0e,toSY(0),x0e,toSY(0)-20,hexToRgba(color,0.15),1); svg+=tx(x0s,toSY(0)+14,'a','rgba(255,255,255,0.2)',9); svg+=tx(x0e,toSY(0)+14,'b','rgba(255,255,255,0.2)',9); } }
            catch(e) {}
        }

        // Riemann sums
        if (tr.riemann) {
            const n = tr.riemann.n || 6; const a = tr.riemann.a !== undefined ? tr.riemann.a : 0; const b = tr.riemann.b !== undefined ? tr.riemann.b : 3;
            const riemannColor = hexToRgba(color, 0.12);
            const riemannStroke = hexToRgba(color, 0.25);
            for (let i = 0; i < n; i++) {
                const xl = a + (b-a)*i/n; const xr = a + (b-a)*(i+1)/n; const xm = (xl+xr)/2;
                const ym = compiled(xm); if (!isFinite(ym)) continue;
                const rxl = toSX(xl), rxr = toSX(xr), rym = toSY(ym), ryo = toSY(0);
                svg += `<rect x="${rxl}" y="${Math.min(rym,ryo)}" width="${rxr-rxl}" height="${Math.abs(rym-ryo)}" fill="${riemannColor}" stroke="${riemannStroke}" stroke-width="0.5"/>`;
            }
        }

        if (label) legendItems.push({ color, label, idx });
    });

    // Legend
    if (opts.showLegend !== false && legendItems.length > 1) {
        let ly = pad + 6;
        legendItems.forEach(li => {
            svg += `<rect x="${pad+4}" y="${ly-4}" width="14" height="3" rx="1.5" fill="${li.color}"/>`;
            svg += tx(pad+22, ly, li.label, 'rgba(255,255,255,0.25)', 9);
            ly += 16;
        });
    }

    // Function label (first trace)
    if (traces[0] && traces[0].label && legendItems.length <= 1) {
        svg += tx(pad+12, pad+18, traces[0].label, 'rgba(59,110,255,0.4)', 10);
    }

    // Parameter sliders indicator
    if (opts.params) {
        svg += tx(w-pad-8, h-pad-4, '⚙ sliders active', 'rgba(255,255,255,0.1)', 8);
    }

    svg += '</svg>';
    return svg;
}

// ─── 3D SURFACE PLOT (isometric projection) ──────────
function plotSurface3D(fnText, bounds) {
    bounds = bounds || { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
    const w = 900, h = 500;
    const compiled = compileExpr2(fnText);
    const zScale = 1.2;

    // Isometric projection
    function project(x, y, z) {
        const sx = (x - bounds.xMin) / (bounds.xMax - bounds.xMin) - 0.5;
        const sy = (y - bounds.yMin) / (bounds.yMax - bounds.yMin) - 0.5;
        const sz = z * zScale;
        const px = 450 + (sx - sy) * 260;
        const py = 260 + (sx + sy) * 140 - sz * 50;
        return { x: px, y: py };
    }

    const gridRes = 20;
    const grid = [];
    for (let i = 0; i <= gridRes; i++) {
        const row = [];
        for (let j = 0; j <= gridRes; j++) {
            const x = bounds.xMin + (bounds.xMax - bounds.xMin) * i / gridRes;
            const y = bounds.yMin + (bounds.yMax - bounds.yMin) * j / gridRes;
            let z = 0;
            try { z = compiled(x, y); if (!isFinite(z)) z = 0; } catch(e) { z = 0; }
            row.push(project(x, y, z));
        }
        grid.push(row);
    }

    let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">`;

    // Floor grid
    for (let i = 0; i <= gridRes; i++) {
        let pts = '';
        for (let j = 0; j <= gridRes; j++) {
            const p = project(
                bounds.xMin + (bounds.xMax - bounds.xMin) * i / gridRes,
                bounds.yMin + (bounds.yMax - bounds.yMin) * j / gridRes, 0);
            pts += (j === 0 ? '' : ' ') + p.x + ',' + p.y;
        }
        svg += `<polyline points="${pts}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>`;
        pts = '';
        for (let j = 0; j <= gridRes; j++) {
            const p = project(
                bounds.xMin + (bounds.xMax - bounds.xMin) * j / gridRes,
                bounds.yMin + (bounds.yMax - bounds.yMin) * i / gridRes, 0);
            pts += (j === 0 ? '' : ' ') + p.x + ',' + p.y;
        }
        svg += `<polyline points="${pts}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>`;
    }

    // Surface mesh (back to front)
    for (let i = 0; i < gridRes; i++) {
        for (let j = 0; j < gridRes; j++) {
            const p00 = grid[i][j], p10 = grid[i+1][j], p01 = grid[i][j+1], p11 = grid[i+1][j+1];
            const avgZ = (() => {
                let s = 0, c = 0;
                try { s += compileExpr2(fnText)(bounds.xMin+(bounds.xMax-bounds.xMin)*i/gridRes, bounds.yMin+(bounds.yMax-bounds.yMin)*j/gridRes); c++; } catch(e) {}
                try { s += compileExpr2(fnText)(bounds.xMin+(bounds.xMax-bounds.xMin)*(i+1)/gridRes, bounds.yMin+(bounds.yMax-bounds.yMin)*(j+1)/gridRes); c++; } catch(e) {}
                return c ? s/c : 0;
            })();
            const z01 = Math.max(0, Math.min(1, (avgZ + 1) / 2));
            const r = Math.round(20 + z01 * 40);
            const g = Math.round(60 + z01 * 80);
            const b = Math.round(200 - z01 * 100);
            const fill = `rgba(${r},${g},${b},0.15)`;
            const pts = `${p00.x},${p00.y} ${p10.x},${p10.y} ${p11.x},${p11.y} ${p01.x},${p01.y}`;
            svg += `<polygon points="${pts}" fill="${fill}" stroke="rgba(59,110,255,0.08)" stroke-width="0.3"/>`;
        }
    }

    // Axes labels
    svg += tx(80, 260, 'x', 'rgba(255,255,255,0.15)', 10);
    svg += tx(820, 260, 'y', 'rgba(255,255,255,0.15)', 10);
    svg += tx(440, 30, 'z', 'rgba(255,255,255,0.15)', 10);

    svg += `</svg>`;
    return svg;
}

// ─── VECTOR FIELD PLOT ───────────────────────────────
function plotVectorField(dxText, dyText, bounds) {
    bounds = bounds || { xMin: -5, xMax: 5, yMin: -4, yMax: 4 };
    const w = 900, h = 500, pad = 50;
    const pw = w - 2*pad, ph = h - 2*pad;
    const dxCompiled = compileExpr2(dxText);
    const dyCompiled = compileExpr2(dyText);

    function toSX(x) { return pad + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * pw; }
    function toSY(y) { return pad + ph - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * ph; }

    let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">`;

    // Background
    for (let gx = Math.ceil(bounds.xMin); gx <= bounds.xMax; gx++) { if (gx===0) continue; const sx=toSX(gx); svg+=`<line x1="${sx}" y1="${pad}" x2="${sx}" y2="${h-pad}" stroke="rgba(255,255,255,0.03)" stroke-width="0.5"/>`; }
    for (let gy = Math.ceil(bounds.yMin); gy <= bounds.yMax; gy++) { if (gy===0) continue; const sy=toSY(gy); svg+=`<line x1="${pad}" y1="${sy}" x2="${w-pad}" y2="${sy}" stroke="rgba(255,255,255,0.03)" stroke-width="0.5"/>`; }
    const x0a=toSX(0),y0a=toSY(0);
    if (bounds.xMin<0&&bounds.xMax>0) svg+=`<line x1="${x0a}" y1="${pad}" x2="${x0a}" y2="${h-pad}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
    if (bounds.yMin<0&&bounds.yMax>0) svg+=`<line x1="${pad}" y1="${y0a}" x2="${w-pad}" y2="${y0a}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;

    // Arrows
    const spacing = 1.2;
    const scale = 0.35;
    for (let gx = Math.ceil(bounds.xMin/spacing)*spacing; gx <= bounds.xMax; gx += spacing) {
        for (let gy = Math.ceil(bounds.yMin/spacing)*spacing; gy <= bounds.yMax; gy += spacing) {
            if (Math.abs(gx) < 0.3 && Math.abs(gy) < 0.3) continue;
            let dx, dy;
            try { dx = dxCompiled(gx, gy); dy = dyCompiled(gx, gy); } catch(e) { continue; }
            if (!isFinite(dx) || !isFinite(dy) || (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001)) continue;
            const len = Math.sqrt(dx*dx + dy*dy);
            const nx = dx/len, ny = dy/len;
            const arrLen = Math.min(0.8, len * scale);
            const sx = toSX(gx), sy = toSY(gy);
            const ex = toSX(gx + nx * arrLen), ey = toSY(gy + ny * arrLen);
            svg += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="rgba(59,110,255,0.25)" stroke-width="1.5" stroke-linecap="round"/>`;
            // Arrowhead
            const angle = Math.atan2(ny, nx);
            const ah = 5;
            svg += `<polygon points="${ex},${ey} ${ex-ah*Math.cos(angle-0.4)},${ey-ah*Math.sin(angle-0.4)} ${ex-ah*Math.cos(angle+0.4)},${ey-ah*Math.sin(angle+0.4)}" fill="rgba(59,110,255,0.25)" stroke="none"/>`;
        }
    }

    svg += tx(w-pad-8, pad+10, 'Vector Field', 'rgba(255,255,255,0.12)', 9);
    svg += `</svg>`;
    return svg;
}

// ─── PHASE PLANE PLOT ────────────────────────────────
function plotPhasePlane(dxText, dyText, bounds) {
    bounds = bounds || { xMin: -4, xMax: 4, yMin: -4, yMax: 4 };
    const w = 900, h = 500, pad = 50;
    const pw = w - 2*pad, ph = h - 2*pad;
    const dxCompiled = compileExpr2(dxText);
    const dyCompiled = compileExpr2(dyText);

    function toSX(x) { return pad + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * pw; }
    function toSY(y) { return pad + ph - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * ph; }

    let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">`;

    // Background
    for (let gx = Math.ceil(bounds.xMin); gx <= bounds.xMax; gx++) { if (gx===0) continue; const sx=toSX(gx); svg+=`<line x1="${sx}" y1="${pad}" x2="${sx}" y2="${h-pad}" stroke="rgba(255,255,255,0.03)" stroke-width="0.5"/>`; }
    for (let gy = Math.ceil(bounds.yMin); gy <= bounds.yMax; gy++) { if (gy===0) continue; const sy=toSY(gy); svg+=`<line x1="${pad}" y1="${sy}" x2="${w-pad}" y2="${sy}" stroke="rgba(255,255,255,0.03)" stroke-width="0.5"/>`; }
    const x0a=toSX(0),y0a=toSY(0);
    if (bounds.xMin<0&&bounds.xMax>0) svg+=`<line x1="${x0a}" y1="${pad}" x2="${x0a}" y2="${h-pad}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
    if (bounds.yMin<0&&bounds.yMax>0) svg+=`<line x1="${pad}" y1="${y0a}" x2="${w-pad}" y2="${y0a}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
    svg += tx(x0a-14, y0a+16, '0', 'rgba(255,255,255,0.08)', 8);
    svg += tx(w-pad-4, y0a-6, 'x', 'rgba(255,255,255,0.15)', 11);
    svg += tx(x0a+8, pad+6, 'y', 'rgba(255,255,255,0.15)', 11);

    // Nullclines
    function traceNullcline(expr, color) {
        const fn = compileExpr2(expr);
        const pts = [];
        for (let xv = bounds.xMin; xv <= bounds.xMax; xv += (bounds.xMax-bounds.xMin)/200) {
            for (let yv = bounds.yMin; yv <= bounds.yMax; yv += (bounds.yMax-bounds.yMin)/200) {
                try { const v = fn(xv, yv); if (isFinite(v) && Math.abs(v) < 0.15) pts.push({ x: toSX(xv), y: toSY(yv) }); } catch(e) {}
            }
        }
        if (pts.length > 2) {
            svg += `<polyline points="${pts.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="3,3" opacity="0.4"/>`;
        }
    }
    traceNullcline(dxText, 'rgba(255,107,107,0.4)');   // x-nullcline (dx=0) in red
    traceNullcline(dyText, 'rgba(107,255,107,0.4)');   // y-nullcline (dy=0) in green

    // Direction arrows
    const spacing = 1.5;
    for (let gx = Math.ceil(bounds.xMin/spacing)*spacing; gx <= bounds.xMax; gx += spacing) {
        for (let gy = Math.ceil(bounds.yMin/spacing)*spacing; gy <= bounds.yMax; gy += spacing) {
            if (Math.abs(gx) < 0.3 && Math.abs(gy) < 0.3) continue;
            let dx, dy;
            try { dx = dxCompiled(gx, gy); dy = dyCompiled(gx, gy); } catch(e) { continue; }
            if (!isFinite(dx) || !isFinite(dy)) continue;
            const len = Math.sqrt(dx*dx + dy*dy);
            if (len < 0.01) continue;
            const nx = dx/len, ny = dy/len;
            const arrLen = 0.5;
            const sx = toSX(gx), sy = toSY(gy);
            const ex = toSX(gx + nx * arrLen), ey = toSY(gy + ny * arrLen);
            svg += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-linecap="round"/>`;
        }
    }

    // Sample trajectory
    function traceTrajectory(x0, y0, color, tSteps) {
        tSteps = tSteps || 200; const dt = 0.05;
        let pts = []; let cx = x0, cy = y0;
        for (let i = 0; i < tSteps; i++) {
            const sx = toSX(cx), sy = toSY(cy);
            if (cx < bounds.xMin || cx > bounds.xMax || cy < bounds.yMin || cy > bounds.yMax) break;
            pts.push({ x: sx, y: sy });
            try { const dx = dxCompiled(cx, cy); const dy = dyCompiled(cx, cy); cx += dx * dt; cy += dy * dt; } catch(e) { break; }
        }
        if (pts.length > 2) {
            svg += `<polyline points="${pts.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`;
            svg += `<circle cx="${pts[0].x}" cy="${pts[0].y}" r="3" fill="${color}" opacity="0.6"/>`;
        }
    }
    traceTrajectory(1, 1, '#3b6eff');
    traceTrajectory(-1, -1, '#6bffbd');
    traceTrajectory(1, -2, '#ff6bbd');
    traceTrajectory(-2, 1.5, '#ffbd3b');

    svg += tx(pad+8, pad+12, 'Phase Plane', 'rgba(255,255,255,0.12)', 9);
    svg += tx(pad+8, pad+24, '— nullclines (dashed)', 'rgba(255,255,255,0.08)', 8);
    svg += `</svg>`;
    return svg;
}

// ─── TAYLOR SERIES ────────────────────────────────────
function generateTaylorTerms(fnText, n) {
    // Generate symbolic Taylor terms around x=0 using finite differences
    const compiled = compileExpr(fnText);
    const terms = [];
    const h = 0.001;
    for (let k = 0; k <= n; k++) {
        // k-th derivative via finite difference
        let deriv = 0;
        if (k === 0) {
            deriv = compiled(0);
    } else if (/z\s*=/.test(clean)) {
        fn = clean.replace(/z\s*=\s*/i, '').trim() || 'sin(x)*cos(y)';
    } else {
            // Use central difference for higher derivatives
            const coeffs = [[1], [-1,1], [1,-2,1], [-1,3,-3,1], [1,-4,6,-4,1], [-1,5,-10,10,-5,1], [1,-6,15,-20,15,-6,1]];
            const c = coeffs[Math.min(k, coeffs.length-1)] || [];
            let sum = 0;
            for (let i = 0; i < c.length; i++) {
                const xv = (i - (c.length-1)/2) * h * 2;
                const yv = compiled(xv);
                if (isFinite(yv)) sum += c[i] * yv;
            }
            deriv = sum / Math.pow(2*h, k);
        }
        if (isFinite(deriv) && Math.abs(deriv) > 1e-10) {
            terms.push({ coeff: deriv / factorial(k), order: k });
        }
    }
    return terms;
}

function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }

function taylorEval(terms, x) {
    let s = 0;
    for (const t of terms) s += t.coeff * Math.pow(x, t.order);
    return s;
}

function renderTaylorSeries(fnText, bounds, maxN) {
    maxN = maxN || 5;
    const terms = generateTaylorTerms(fnText, maxN);
    const traces = [{ fn: fnText, color: '#3b6eff', label: 'f(x)', width: 3 }];
    const colors = ['#ff6b6b','#ffbd3b','#6bffbd','#bd6bff','#ff6bbd','#6bbdff'];
    for (let k = 1; k <= Math.min(maxN, terms.length); k++) {
        const partialTerms = terms.slice(0, k);
        const tFn = function(x) { return taylorEval(partialTerms, x); };
        traces.push({ fn: tFn, color: colors[(k-1) % colors.length], label: 'T_' + k + '(x)', width: 1.5, dash: '3,3' });
    }
    return plotFunction(traces, bounds, { showLegend: true });
}

// ─── CURVE TRACING ANIMATION ─────────────────────────
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

    // Re-render with overlay
    const container = document.getElementById('desmosContainer');
    if (!container) return;
    const traces = _storedArgs ? [_storedArgs.fn] : [fnText];
    container.innerHTML = plotFunction(traces, bounds);

    const svg = container.querySelector('svg');
    if (!svg) return;
    const pad = 50;
    const pw = 900 - 2*pad, ph = 500 - 2*pad;
    function toSX(x) { return pad + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * pw; }
    function toSY(y) { return pad + ph - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * ph; }

    const ns = 'http://www.w3.org/2000/svg';
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('r', '5');
    dot.setAttribute('fill', '#59ff6b');
    dot.setAttribute('filter', 'url(#glow)');
    const trail = document.createElementNS(ns, 'path');
    trail.setAttribute('fill', 'none');
    trail.setAttribute('stroke', 'rgba(89,255,107,0.15)');
    trail.setAttribute('stroke-width', '3');
    trail.setAttribute('stroke-linecap', 'round');
    svg.appendChild(trail);
    svg.appendChild(dot);

    let idx = 0; let trailData = '';
    _traceAnimation = setInterval(() => {
        if (idx >= pts.length) { idx = 0; trailData = ''; }
        const p = pts[idx];
        const sx = toSX(p.x), sy = toSY(p.y);
        dot.setAttribute('cx', sx);
        dot.setAttribute('cy', sy);
        trailData += (idx === 0 ? 'M' : 'L') + sx + ',' + sy;
        trail.setAttribute('d', trailData);
        idx += 3;
    }, 30);
}

function stopCurveTrace() {
    if (_traceAnimation) { clearInterval(_traceAnimation); _traceAnimation = null; }
}

// ─── GRAPH-PER-STEP MORPHING ────────────────────────
let _stepGraphs = [];  // array of trace configs per step

function setStepGraphs(stepGraphData) {
    _stepGraphs = stepGraphData || [];
}

function renderGraphForStep(stepIndex) {
    if (!_stepGraphs || _stepGraphs.length === 0) return;
    const sg = _stepGraphs[stepIndex];
    if (!sg) return;
    const container = document.getElementById('desmosContainer');
    const panel = document.getElementById('graphPanel');
    if (!container) return;
    const bounds = (sg.bounds || (_storedArgs ? _storedArgs.bounds : { xMin: -6, xMax: 6, yMin: -4, yMax: 4 }));
    container.innerHTML = plotFunction(sg.traces || [sg.fn || 'x^2'], bounds, sg.opts || {});
    if (panel && !panel.classList.contains('visible')) panel.classList.add('visible');
    initGraphInteraction(sg.fn || 'x^2', bounds);
}

function clearStepGraphs() {
    _stepGraphs = [];
}

// ─── GRAPH INTERACTION ──────────────────────────────
let _graphState = null;

function initGraphInteraction(fnText, bounds) {
    const container = document.getElementById('desmosContainer');
    if (!container) return;

    if (!_graphState) {
        const tip = document.createElement('div');
        tip.className = 'graph-tooltip';
        tip.style.cssText = 'position:absolute;background:rgba(10,10,20,0.92);color:#cfdfff;padding:5px 10px;border-radius:6px;font-size:12px;font-family:monospace;pointer-events:none;opacity:0;transition:opacity 0.2s;z-index:100;border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(4px);';
        container.appendChild(tip);
        _graphState = { fn: fnText, bounds: { ...bounds }, dragging: false, wasDragged: false, dragInfo: null, tooltip: tip, traceTimer: null };
    } else {
        _graphState.fn = fnText;
        _graphState.bounds = { ...bounds };
    }

    if (container.dataset.graphReady) return;
    container.dataset.graphReady = '1';

    function svgFromContainer() { return container.querySelector('svg'); }
    function screenToMath(cx, cy) {
        const svg = svgFromContainer();
        if (!svg) return { x: NaN, y: NaN };
        const rect = svg.getBoundingClientRect();
        const vb = svg.viewBox.baseVal;
        const sx = (cx - rect.left) * (vb.width / rect.width);
        const sy = (cy - rect.top) * (vb.height / rect.height);
        const pad = 50;
        const pw = vb.width - 2 * pad, ph = vb.height - 2 * pad;
        const mx = _graphState.bounds.xMin + ((sx - pad) / pw) * (_graphState.bounds.xMax - _graphState.bounds.xMin);
        const my = _graphState.bounds.yMax - ((sy - pad) / ph) * (_graphState.bounds.yMax - _graphState.bounds.yMin);
        return { x: mx, y: my };
    }
    function reRender() {
        const curFn = _storedArgs ? _storedArgs.fn : _graphState.fn;
        container.innerHTML = plotFunction(curFn, _graphState.bounds);
        if (_storedArgs) _storedArgs.bounds = { ..._graphState.bounds };
        if (_graphState.tooltip) _graphState.tooltip.style.opacity = '0';
    }

    container.addEventListener('click', (e) => {
        if (!_graphState) return;
        if (_graphState.wasDragged) { _graphState.wasDragged = false; return; }
        if (_graphState.dragging) return;
        const svg = svgFromContainer();
        if (!svg || !svg.contains(e.target)) return;
        const c = screenToMath(e.clientX, e.clientY);
        if (!isFinite(c.x) || !isFinite(c.y)) return;
        const tip = _graphState.tooltip;
        tip.textContent = `(${c.x.toFixed(3)}, ${c.y.toFixed(3)})`;
        const crect = container.getBoundingClientRect();
        tip.style.left = Math.min(e.clientX - crect.left + 14, container.clientWidth - 130) + 'px';
        tip.style.top = Math.max(e.clientY - crect.top - 34, 6) + 'px';
        tip.style.opacity = '1';
    });

    container.addEventListener('mousedown', (e) => {
        if (!_graphState || e.button !== 0) return;
        const svg = svgFromContainer();
        if (!svg || !svg.contains(e.target)) return;
        _graphState.dragging = true;
        _graphState.wasDragged = false;
        _graphState.dragInfo = { startX: e.clientX, startY: e.clientY, boundsStart: { ..._graphState.bounds } };
        container.style.cursor = 'grabbing';
        if (_graphState.tooltip) _graphState.tooltip.style.opacity = '0';
    });

    document.addEventListener('mousemove', (e) => {
        if (!_graphState || !_graphState.dragging || !_graphState.dragInfo) return;
        if (Math.abs(e.clientX - _graphState.dragInfo.startX) > 3 || Math.abs(e.clientY - _graphState.dragInfo.startY) > 3) { _graphState.wasDragged = true; }
        const svg = svgFromContainer();
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const vb = svg.viewBox.baseVal;
        const b = _graphState.dragInfo.boundsStart;
        const dx = (e.clientX - _graphState.dragInfo.startX) * (vb.width / rect.width) / (vb.width - 100) * (b.xMax - b.xMin);
        const dy = (_graphState.dragInfo.startY - e.clientY) * (vb.height / rect.height) / (vb.height - 100) * (b.yMax - b.yMin);
        _graphState.bounds.xMin = b.xMin - dx;
        _graphState.bounds.xMax = b.xMax - dx;
        _graphState.bounds.yMin = b.yMin - dy;
        _graphState.bounds.yMax = b.yMax - dy;
        reRender();
    });

    document.addEventListener('mouseup', () => {
        if (!_graphState) return;
        if (_graphState.dragging) { _graphState.dragging = false; _graphState.dragInfo = null; container.style.cursor = 'default'; }
    });

    container.addEventListener('wheel', (e) => {
        if (!_graphState) return;
        e.preventDefault();
        const svg = svgFromContainer();
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const vb = svg.viewBox.baseVal;
        const sx = (e.clientX - rect.left) * (vb.width / rect.width);
        const sy = (e.clientY - rect.top) * (vb.height / rect.height);
        const pad = 50;
        const pw = vb.width - 2 * pad, ph = vb.height - 2 * pad;
        const b = _graphState.bounds;
        const mx = b.xMin + ((sx - pad) / pw) * (b.xMax - b.xMin);
        const my = b.yMax - ((sy - pad) / ph) * (b.yMax - b.yMin);
        const factor = e.deltaY > 0 ? 1.15 : 0.85;
        const rx = (b.xMax - b.xMin) * factor / 2;
        const ry = (b.yMax - b.yMin) * factor / 2;
        b.xMin = mx - rx; b.xMax = mx + rx;
        b.yMin = my - ry; b.yMax = my + ry;
        reRender();
    });
}

// ─── INTERACTIVE PARAMETER SLIDERS ──────────────────
let _sliderState = { params: {}, active: false };

function initParamSliders(paramDefs, onUpdate) {
    const header = document.querySelector('.graph-panel-header');
    if (!header) return;
    const existing = document.getElementById('paramSliderArea');
    if (existing) existing.remove();

    const area = document.createElement('div');
    area.id = 'paramSliderArea';
    area.style.cssText = 'padding:0.5rem 1rem;border-bottom:1px solid rgba(255,255,255,0.04);flex-shrink:0;';
    area.innerHTML = `<div style="color:rgba(255,255,255,0.2);font-size:0.65rem;letter-spacing:1px;margin-bottom:0.4rem;">PARAMETERS</div>`;
    _sliderState.params = {};

    paramDefs.forEach((def, idx) => {
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

    header.parentNode.insertBefore(area, header.nextSibling);
    _sliderState.active = true;
}

function removeParamSliders() {
    const area = document.getElementById('paramSliderArea');
    if (area) area.remove();
    _sliderState.active = false;
    _sliderState.params = {};
}

function getSliderParams() { return { ..._sliderState.params }; }

// ─── RENDER (public API) ────────────────────────────
function renderGraphOnce(qt, raw) {
    const container = document.getElementById('desmosContainer');
    const panel = document.getElementById('graphPanel');
    if (!container) return;

    const fnText = extractPlotExpr(qt, raw);
    const bounds = detectBounds(qt, raw, fnText);
    const lower = (qt || raw || '').toLowerCase();

    let svgHtml;
    // Auto-detect which renderer to use
    if (/vector\s*field|direction\s*field|slope\s*field/i.test(lower)) {
        // Extract dx, dy from text
        const dxMatch = lower.match(/dx\s*=\s*([^,]+)/i);
        const dyMatch = lower.match(/dy\s*=\s*([^,]+)/i);
        const dxText = dxMatch ? dxMatch[1].trim() : 'y';
        const dyText = dyMatch ? dyMatch[1].trim() : '-x';
        svgHtml = plotVectorField(dxText, dyText, bounds);
    } else if (/phase\s*plane|trajectory/i.test(lower)) {
        const dxMatch = lower.match(/dx\s*=\s*([^,]+)/i);
        const dyMatch = lower.match(/dy\s*=\s*([^,]+)/i);
        const dxText = dxMatch ? dxMatch[1].trim() : 'y';
        const dyText = dyMatch ? dyMatch[1].trim() : '-x - y';
        svgHtml = plotPhasePlane(dxText, dyText, bounds);
    } else if (/surface|3[dD]|z\s*=/.test(lower) && /[xy]/.test(fnText)) {
        svgHtml = plotSurface3D(fnText, bounds);
    } else if (/taylor|series|approximation|polynomial/i.test(lower)) {
        svgHtml = renderTaylorSeries(fnText, bounds, 5);
    } else {
        // Default: build traces with smart features
        const traces = [{ fn: fnText, color: '#3b6eff', label: 'y = ' + fnText, width: 3 }];
        if (/integrate|∫/.test(lower)) {
            traces[0].integral = [0, 3];
            traces[0].riemann = { n: 6, a: 0, b: 3 };
        }
        if (/differentiate|derivative/.test(lower)) {
            traces[0].derivative = true;
        }
        svgHtml = plotFunction(traces, bounds, { });
    }

    container.innerHTML = svgHtml;
    graphRendered = true;
    storeGraphArgs(qt, raw, fnText, bounds);

    // Auto-show parameter sliders for explicit quadratic/parabola problems
    if (/quadratic|parabola/i.test(lower) && !document.getElementById('paramSliderArea')) {
        initParamSliders([
            { name: 'a', default: 1, min: -5, max: 5 },
            { name: 'b', default: 0, min: -5, max: 5 },
            { name: 'c', default: 0, min: -5, max: 5 },
        ], (params) => {
            const expr = `${params.a}*x^2 + ${params.b}*x + ${params.c}`;
            _storedArgs.fn = expr;
            const container = document.getElementById('desmosContainer');
            if (container) {
                container.innerHTML = plotFunction(expr, _storedArgs.bounds);
                initGraphInteraction(expr, _storedArgs.bounds);
            }
        });
    }

    initGraphInteraction(fnText, bounds);
    if (panel) panel.classList.add('visible');
}

let _storedArgs = null;
function storeGraphArgs(qt, raw, fn, bounds) { _storedArgs = { qt, raw, fn, bounds }; }
function getStoredGraphArgs() { return _storedArgs; }

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

function reShowGraph() {
    const args = _storedArgs;
    if (!args) return;
    const container = document.getElementById('desmosContainer');
    const panel = document.getElementById('graphPanel');
    if (!container) return;
    const lower = (args.qt || args.raw || '').toLowerCase();
    let svgHtml;
    if (/vector\s*field|direction\s*field|slope\s*field/i.test(lower)) {
        const dxMatch = lower.match(/dx\s*=\s*([^,]+)/i);
        const dyMatch = lower.match(/dy\s*=\s*([^,]+)/i);
        svgHtml = plotVectorField(dxMatch?.[1]?.trim()||'y', dyMatch?.[1]?.trim()||'-x', args.bounds);
    } else if (/phase\s*plane|trajectory/i.test(lower)) {
        const dxMatch = lower.match(/dx\s*=\s*([^,]+)/i);
        const dyMatch = lower.match(/dy\s*=\s*([^,]+)/i);
        svgHtml = plotPhasePlane(dxMatch?.[1]?.trim()||'y', dyMatch?.[1]?.trim()||'-x-y', args.bounds);
    } else if (/surface|3[dD]|z\s*=/.test(lower) && /[xy]/.test(args.fn)) {
        svgHtml = plotSurface3D(args.fn, args.bounds);
    } else if (/taylor|series|approximation/i.test(lower)) {
        svgHtml = renderTaylorSeries(args.fn, args.bounds, 5);
    } else {
        const traces = [{ fn: args.fn, color: '#3b6eff', label: 'y = ' + args.fn, width: 3 }];
        if (/integrate|∫/.test(lower)) { traces[0].integral = [0, 3]; traces[0].riemann = { n: 6, a: 0, b: 3 }; }
        if (/differentiate|derivative/.test(lower)) traces[0].derivative = true;
        svgHtml = plotFunction(traces, args.bounds, { });
    }
    container.innerHTML = svgHtml;
    initGraphInteraction(args.fn, args.bounds);
    if (panel) panel.classList.add('visible');
}

function destroyGraph() {
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

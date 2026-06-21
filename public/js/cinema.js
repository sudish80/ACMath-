// ─── CINEMATIC RENDERER ─────────────────────────────────

const BASE_INTERVAL = 2500;
let speedMultiplier = 1;
let currentInterval = BASE_INTERVAL;

let stepTeX = [];
let totalSteps = 0;
let currentStep = 0;
let isPlaying = true;
let isTransitioning = false;
let animationTimer = null;
let mainTimeline = null;

// ─── COLORIZE LaTeX ───────────────────────────────────
// Units / differentials → green, Constants → yellow, Numbers → white
function colorizeTeX(tex) {
    // Differentials (dx, dy, dt, du, dv) → green
    tex = tex.replace(/\b(d[a-z])\b/g, '{\\color{#59ff6b}{$1}}');
    // Constants → gold
    tex = tex.replace(/\\pi\b/g, '{\\color{#ffd700}{\\pi}}');
    tex = tex.replace(/\\infty\b/g, '{\\color{#ffd700}{\\infty}}');
    tex = tex.replace(/π/g, '{\\color{#ffd700}{π}}');
    tex = tex.replace(/\b(i|e)\b(?=\s|$|[^a-zA-Z])/g, '{\\color{#ffd700}{$1}}');
    // Numbers → white (wrapped in braces so ^/_ still work)
    tex = tex.replace(/\b(\d+(?:\.\d+)?)\b/g, '{\\color{white}{$1}}');
    return tex;
}

// ─── ZOOM/PAN STATE ──────────────────────────────────
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragPanX = 0;
let dragPanY = 0;

function initZoomPan() {
    const svg = document.getElementById('svgStage');
    if (!svg) return;

    svg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoomLevel = Math.max(0.5, Math.min(3, zoomLevel + delta));
        applyTransform();
    });

    svg.addEventListener('mousedown', (e) => {
        if (e.target !== svg && e.target.closest('.ctrl-btn, .dot, .new-problem-btn, .problem-label, .method-badge')) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragPanX = panX;
        dragPanY = panY;
        svg.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panX = dragPanX + (e.clientX - dragStartX) * 0.5;
        panY = dragPanY + (e.clientY - dragStartY) * 0.5;
        applyTransform();
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            const svg = document.getElementById('svgStage');
            if (svg) svg.style.cursor = 'grab';
        }
    });

    if (svg) svg.style.cursor = 'grab';
}

// ─── EXPORT PDF ──────────────────────────────────────
async function exportPDF() {
    const btn = document.getElementById('exportBtn');
    if (btn) { btn.textContent = '⏳ EXPORTING...'; btn.disabled = true; }

    try {
        // Off-screen container that stacks all steps vertically + graph
        const doc = document.createElement('div');
        doc.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:#0b1424;padding:40px 30px;font-family:inherit;';
        document.body.appendChild(doc);

        // Title
        doc.innerHTML = `
            <div style="color:#cfdfff;font-size:26px;text-align:center;font-weight:300;letter-spacing:3px;margin-bottom:4px;">Math Cinema</div>
            <div style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;letter-spacing:1px;margin-bottom:28px;">Step-by-Step Solution</div>
        `;

        // Problem label
        const label = document.getElementById('problemLabel');
        if (label) {
            const p = document.createElement('div');
            p.style.cssText = 'color:rgba(255,255,255,0.35);font-size:13px;margin-bottom:24px;padding:12px 16px;background:rgba(59,110,255,0.04);border-radius:8px;border:1px solid rgba(59,110,255,0.08);';
            p.textContent = 'Problem: ' + (label.textContent || '');
            doc.appendChild(p);
        }

        // Graph (clone the rendered SVG)
        const graphSvg = document.getElementById('desmosContainer')?.querySelector('svg');
        if (graphSvg) {
            const g = document.createElement('div');
            g.style.cssText = 'width:100%;max-width:720px;margin:0 auto 28px;';
            const svgCopy = graphSvg.cloneNode(true);
            svgCopy.setAttribute('style', 'width:100%;height:auto;display:block;');
            g.appendChild(svgCopy);
            doc.appendChild(g);
        }

        // All steps
        for (let i = 0; i < stepTeX.length; i++) {
            const lines = stepTeX[i];
            if (!lines || !Array.isArray(lines) || lines.length === 0) continue;

            const block = document.createElement('div');
            block.style.cssText = 'margin-bottom:14px;padding:14px 18px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.04);';

            const hdr = document.createElement('div');
            hdr.style.cssText = 'color:rgba(59,110,255,0.3);font-size:10px;letter-spacing:1px;margin-bottom:5px;';
            hdr.textContent = 'STEP ' + (i + 1) + ' / ' + stepTeX.length;
            block.appendChild(hdr);

            for (const line of lines) {
                const ln = document.createElement('div');
                ln.style.cssText = 'color:#cfdfff;font-size:17px;font-style:italic;padding:2px 0;font-family:STIX,"Times New Roman",serif;line-height:1.5;';
                ln.innerHTML = '\\(\\displaystyle ' + colorizeTeX(line) + '\\)';
                block.appendChild(ln);
            }
            doc.appendChild(block);
        }

        // Render LaTeX via MathJax then capture
        if (window.MathJax && MathJax.typesetPromise) {
            await MathJax.typesetPromise([doc]).catch(() => {});
        }

        await html2pdf().from(doc).set({
            margin: [8, 8, 8, 8],
            filename: 'math-solution.pdf',
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, backgroundColor: '#0b1424', useCORS: true, logging: false },
            jsPDF: { orientation: 'p', unit: 'mm', format: 'a4' },
        }).save();

        document.body.removeChild(doc);
    } catch (e) {
        console.error('Export PDF failed:', e);
    }
    if (btn) { btn.textContent = '📄 EXPORT PDF'; btn.disabled = false; }
}

function resetZoomPan() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    applyTransform();
}

function applyTransform() {
    const group = document.getElementById('equationGroup');
    if (!group) return;
    const baseX = 700, baseY = 430;
    group.setAttribute('transform', `translate(${baseX + panX}, ${baseY + panY}) scale(${zoomLevel})`);
}

// ─── INIT ────────────────────────────────────────────
function initCinema() {
    const overlay = document.getElementById('inputOverlay');
    const container = document.getElementById('cinemaContainer');
    const placeholder = document.getElementById('cinemaPlaceholder');
    const banner = document.getElementById('solutionEndBanner');
    const btn = document.getElementById('solveBtn');

    if (overlay) overlay.classList.add('hidden');
    if (container) container.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');
    if (banner) banner.classList.remove('visible');
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }

    if (animationTimer) clearInterval(animationTimer);
    if (mainTimeline) mainTimeline.kill();

    resetZoomPan();

    isPlaying = true;
    isTransitioning = false;
    currentStep = 0;
    speedMultiplier = 1;
    currentInterval = BASE_INTERVAL;

    const speedBtn = document.getElementById('speedBtn');
    const playBtn = document.getElementById('playBtn');
    if (speedBtn) speedBtn.textContent = '⏩ 2x';
    if (playBtn) { playBtn.textContent = '⏸ PAUSE'; playBtn.classList.add('active'); }

    buildDots();
    renderStep(0);
    setTimeout(() => { startPlay(); }, 800);
}

function buildDots() {
    const dotsContainer = document.getElementById('dotsContainer');
    const totalStepsEl = document.getElementById('totalSteps');
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalSteps; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.dataset.index = i;
        dot.title = `Step ${i + 1}`;
        const num = document.createElement('span');
        num.className = 'dot-num';
        num.textContent = i + 1;
        dot.appendChild(num);
        dot.addEventListener('click', () => {
            if (isTransitioning) return;
            pausePlay();
            goToStep(i);
        });
        dotsContainer.appendChild(dot);
    }
    if (totalStepsEl) totalStepsEl.textContent = totalSteps;
}

// ─── SET METHOD ──────────────────────────────────────
function setMethod(methodName) {
    const badge = document.getElementById('methodBadge');
    if (!badge) return;
    if (methodName) {
        badge.textContent = methodName;
        badge.classList.add('visible');
    } else {
        badge.classList.remove('visible');
    }
}

// ─── RENDER ─────────────────────────────────────────────
function renderStep(index) {
    if (isTransitioning) return;
    isTransitioning = true;

    const texLines = stepTeX[index];
    if (!texLines || !Array.isArray(texLines) || texLines.length === 0) {
        isTransitioning = false;
        return;
    }
    const group = document.getElementById('equationGroup');
    if (!group) { isTransitioning = false; return; }
    group.innerHTML = '';

    const lineHeight = 80;
    const startY = -((texLines.length - 1) * lineHeight) / 2;
    const foWidth = 1800;
    const foX = -foWidth / 2;

    texLines.forEach((tex, lineIdx) => {
        const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        fo.setAttribute('x', foX);
        fo.setAttribute('y', startY + lineIdx * lineHeight);
        fo.setAttribute('width', foWidth);
        fo.setAttribute('height', 120);
        fo.style.opacity = '0';
        fo.style.transform = 'translateY(40px) scale(0.85) rotateX(10deg)';
        fo.style.transition = 'none';

        const div = document.createElement('div');
        div.style.cssText = `
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            font-size: 28px; color: #cfdfff;
            font-family: 'STIX', 'Times New Roman', serif;
            font-style: italic; text-align: center;
            padding: 0 20px;
            background: ${lineIdx === texLines.length - 1 ? 'rgba(59,110,255,0.05)' : 'transparent'};
            border-radius: 16px;
            border: ${lineIdx === texLines.length - 1 ? '1px solid rgba(59,110,255,0.1)' : 'none'};
        `;
        div.innerHTML = `\\(\\displaystyle ${colorizeTeX(tex)}\\)`;
        fo.appendChild(div);
        fo.dataset.lineIdx = lineIdx;
        group.appendChild(fo);
    });

    // Update dots
    document.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    const stepNum = document.getElementById('stepNum');
    if (stepNum) stepNum.textContent = index + 1;

    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise().then(() => {
            const fos = group.querySelectorAll('foreignObject');
            const tl = gsap.timeline({ onComplete: () => {
                isTransitioning = false;
                if (typeof renderGraphForStep === 'function') renderGraphForStep(index);
                updateGraphForStep(index);
            } });
            const svg = document.getElementById('svgStage');

            const prevFos = group.querySelectorAll('.prev-foreignObject');
            prevFos.forEach(el => el.remove());

            fos.forEach((fo, i) => {
                tl.to(fo, { opacity: 1, y: 0, scale: 1, rotationX: 0, duration: 0.9, ease: 'back.out(2.2)', delay: i * 0.12 }, 0);
                tl.to(fo, { y: -6, duration: 0.15, ease: 'power1.out', yoyo: true, repeat: 1, delay: i * 0.12 + 0.4 }, 0);
                tl.to(fo, { filter: 'drop-shadow(0 0 25px rgba(59,110,255,0.3))', duration: 0.5, ease: 'elastic.out(1, 0.3)', yoyo: true, repeat: 1, delay: i * 0.12 + 0.2 }, 0);
            });

            const camTarget = index === 0 ? { scale: zoomLevel, x: panX, y: panY } :
                index === 1 ? { scale: zoomLevel * 1.02, x: panX, y: panY - 10 } :
                index === 2 ? { scale: zoomLevel * 1.04, x: panX, y: panY } :
                index === 3 ? { scale: zoomLevel * 1.06, x: panX, y: panY + 10 } :
                { scale: zoomLevel * 1.08, x: panX, y: panY + 15 };

            if (svg) {
                tl.to(svg, { scale: camTarget.scale, x: camTarget.x, y: camTarget.y, duration: 1.3, ease: 'back.out(1.8)', transformOrigin: '50% 50%' }, 0);
                tl.to(svg, { scale: camTarget.scale * 1.01, duration: 0.15, ease: 'power1.out', yoyo: true, repeat: 1, delay: 0.7 }, 0);
            }

            if (index === 0 && fos[0]) {
                tl.to(fos[0], { backgroundColor: 'rgba(59,110,255,0.08)', borderColor: 'rgba(59,110,255,0.15)', duration: 0.6, ease: 'power1.out' }, 0.2);
            }
            if (index === totalSteps - 1 && fos[0]) {
                tl.to(fos[0], { backgroundColor: 'rgba(255,215,0,0.08)', borderColor: 'rgba(255,215,0,0.3)', duration: 0.8, ease: 'power1.out' }, 0.2);
                tl.to(fos[0], { boxShadow: '0 0 80px rgba(255,215,0,0.15)', duration: 1, ease: 'elastic.out(1, 0.4)' }, 0.3);
                tl.to(fos[0], { scale: 1.02, duration: 0.2, ease: 'power1.out', yoyo: true, repeat: 2, delay: 0.6 }, 0);
            }
            mainTimeline = tl;
        }).catch(() => { isTransitioning = false; });
    } else {
        const fos = group.querySelectorAll('foreignObject');
        fos.forEach(fo => { fo.style.opacity = '1'; fo.style.transform = 'translateY(0) scale(1)'; });
        isTransitioning = false;
        if (typeof renderGraphForStep === 'function') renderGraphForStep(index);
        updateGraphForStep(index);
    }
}

function updateGraphForStep(index) {
    const gp = document.getElementById('graphPanel');
    if (!gp) return;
    if (index === 0 && typeof graphRendered !== 'undefined' && graphRendered) {
        gp.classList.add('visible');
    } else if (!gp.dataset.userToggled) {
        gp.classList.remove('visible');
    }
}

// ─── NAVIGATION ─────────────────────────────────────────
function goToStep(index) {
    if (index < 0) index = 0;
    if (index >= totalSteps) index = totalSteps - 1;
    if (mainTimeline) mainTimeline.kill();
    currentStep = index;

    const banner = document.getElementById('solutionEndBanner');
    if (banner) {
        if (index < totalSteps - 1) banner.classList.remove('visible');
        else if (totalSteps > 0) banner.classList.add('visible');
    }
    renderStep(index);
}

function nextStep() {
    if (isTransitioning) return;
    const next = currentStep + 1;
    if (next >= totalSteps) {
        if (isPlaying) pausePlay();
        const banner = document.getElementById('solutionEndBanner');
        if (banner) banner.classList.add('visible');
        return;
    }
    const banner = document.getElementById('solutionEndBanner');
    if (banner) banner.classList.remove('visible');
    goToStep(next);
}

function prevStep() {
    if (isTransitioning) return;
    if (currentStep > 0) goToStep(currentStep - 1);
}

// ─── PLAYBACK ───────────────────────────────────────────
function startPlay() {
    if (animationTimer) clearInterval(animationTimer);
    isPlaying = true;
    const playBtn = document.getElementById('playBtn');
    if (playBtn) { playBtn.textContent = '⏸ PAUSE'; playBtn.classList.add('active'); }
    if (currentStep === totalSteps - 1) goToStep(0);
    if (totalSteps <= 1) return;
    animationTimer = setInterval(() => {
        if (!isTransitioning) nextStep();
    }, currentInterval);
}

function pausePlay() {
    if (animationTimer) { clearInterval(animationTimer); animationTimer = null; }
    isPlaying = false;
    const playBtn = document.getElementById('playBtn');
    if (playBtn) { playBtn.textContent = '▶ PLAY'; playBtn.classList.remove('active'); }
}

function togglePlay() {
    isPlaying ? pausePlay() : startPlay();
}

function resetAll() {
    pausePlay();
    if (mainTimeline) mainTimeline.kill();
    resetZoomPan();
    goToStep(0);
    setTimeout(() => { if (!isPlaying) startPlay(); }, 400);
}

// ─── SPEED ──────────────────────────────────────────────
let speedLevel = 0;
const speeds = [1, 2, 3.5];

function toggleSpeed() {
    speedLevel = (speedLevel + 1) % speeds.length;
    const mult = speeds[speedLevel];
    speedMultiplier = mult;
    currentInterval = BASE_INTERVAL / mult;
    const labels = ['1x', '2x', '3.5x'];
    const speedBtn = document.getElementById('speedBtn');
    if (speedBtn) speedBtn.textContent = `⏩ ${labels[speedLevel]}`;
    if (isPlaying && animationTimer) {
        clearInterval(animationTimer);
        animationTimer = setInterval(() => {
            if (!isTransitioning) nextStep();
        }, currentInterval);
    }
}

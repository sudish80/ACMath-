// ─── MAIN APP ────────────────────────────────────────────
(function() {
    function init() {

    const inputOverlay = document.getElementById('inputOverlay');
    const cinemaContainer = document.getElementById('cinemaContainer');
    const questionInput = document.getElementById('questionInput');
    const solveBtn = document.getElementById('solveBtn');
    const errorMsg = document.getElementById('errorMsg');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const solvingPhase = document.getElementById('solvingPhase');
    const timeoutRecovery = document.getElementById('timeoutRecovery');
    const retryBtn = document.getElementById('retryBtn');
    const simplifyBtn = document.getElementById('simplifyBtn');
    const newProblemBtn = document.getElementById('newProblemBtn');
    const problemLabel = document.getElementById('problemLabel');
    const followUpBtn = document.getElementById('followUpBtn');
    const followUpModal = document.getElementById('followUpModal');
    const followUpInput = document.getElementById('followUpInput');
    const sendFollowUp = document.getElementById('sendFollowUp');
    const closeFollowUp = document.getElementById('closeFollowUp');
    const modelSelect = document.getElementById('modelSelect');

    let lastRaw = '';
    let lastEnhanced = '';
    let lastResult = null;

    function prependQuestion(steps, qText) {
        if (qText) steps.unshift([qText]);
        return steps;
    }

    // ─── EXAMPLE CHIPS ──────────────────────────────────
    document.querySelectorAll('.example-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            questionInput.value = chip.textContent;
            questionInput.focus();
            refreshEnhancerUI(questionInput.value.trim());
        });
    });

    // ─── INPUT EVENTS ──────────────────────────────────
    questionInput.addEventListener('input', () => {
        refreshEnhancerUI(questionInput.value.trim());
    });

    questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            solve();
        }
    });

    // ─── MODEL SELECTOR ─────────────────────────────────
    if (modelSelect) {
        modelSelect.addEventListener('change', () => {
            resetConversation();
        });
    }

    // ─── SOLVE ──────────────────────────────────────────
    async function solve() {
        const raw = questionInput.value.trim();
        lastRaw = raw;
        if (!raw) {
            showError('Please enter a math question.');
            return;
        }

        const hasMath = MATH_PATTERN.test(raw) || /\\[a-zA-Z]/.test(raw) || /[∫∑∞πθαβγλμσ]/.test(raw);
        if (!hasMath || raw.length < 2) {
            refreshEnhancerUI(raw);
            showError('This doesn\'t look like a math question. Try something like "∫ sec³(x) dx" or "solve x² + 1 = 0".');
            return;
        }

        const enhanced = getEnhancedQuestion();

        solveBtn.disabled = true;
        solveBtn.classList.add('loading');
        errorMsg.classList.remove('visible');
        timeoutRecovery.classList.remove('visible');
        loadingOverlay.classList.add('visible');
        solvingPhase.textContent = 'calling LLM · generating steps';

        const phases = [
            { t: 15000,  msg: 'receiving response · parsing LaTeX' },
            { t: 60000,  msg: 'still working · deep problem detected' },
            { t: 150000, msg: 'generating detailed steps · almost there' },
            { t: 300000, msg: 'complex problem · LLM is writing full solution' },
        ];
        const phaseTimers = phases.map(p => setTimeout(() => { solvingPhase.textContent = p.msg; }, p.t));

        try {
            const result = await solveQuestion(enhanced, raw, selectedOperation);
            lastResult = result;

            phaseTimers.forEach(clearTimeout);
            loadingOverlay.classList.remove('visible');

            stepTeX = prependQuestion(result.steps, enhanced);
            totalSteps = stepTeX.length;

            problemLabel.textContent = (raw.length > 50 ? raw.slice(0, 50) + '…' : raw);
            setMethod(result.method || null);
            initCinema();
            initZoomPan();
            renderGraphOnce(enhanced, raw);
        } catch (err) {
            phaseTimers.forEach(clearTimeout);
            loadingOverlay.classList.remove('visible');

            if (err instanceof TimeoutError) {
                solvingPhase.textContent = 'fallback model working · lighter LLM generating solution';
                loadingOverlay.classList.add('visible');
                try {
                    const result = await solveQuestion(enhanced, raw, selectedOperation, true);
                    lastResult = result;
                    loadingOverlay.classList.remove('visible');
                    stepTeX = prependQuestion(result.steps, enhanced);
                    totalSteps = stepTeX.length;
                    problemLabel.textContent = (raw.length > 50 ? raw.slice(0, 50) + '…' : raw);
                    setMethod(result.method || null);
                    initCinema();
                    initZoomPan();
                    renderGraphOnce(enhanced, raw);
                    return;
                } catch (fallbackErr) {
                    loadingOverlay.classList.remove('visible');
                    showError('The API took too long. Try a simpler question or switch to SIMPLIFY.');
                    timeoutRecovery.classList.add('visible');
                }
            } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
                showError('Network error. Check your connection and try again.');
            } else {
                showError(err.message);
            }
            solveBtn.disabled = false;
            solveBtn.classList.remove('loading');
        }
    }

    solveBtn.addEventListener('click', solve);

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.add('visible');
    }

    // ─── NEW PROBLEM ────────────────────────────────────
    newProblemBtn.addEventListener('click', () => {
        pausePlay();
        if (mainTimeline) mainTimeline.kill();

        cinemaContainer.classList.add('hidden');
        inputOverlay.classList.remove('hidden');
        const placeholder = document.getElementById('cinemaPlaceholder');
        if (placeholder) placeholder.classList.remove('hidden');
        const banner = document.getElementById('solutionEndBanner');
        if (banner) banner.classList.remove('visible');
        if (problemLabel) problemLabel.textContent = '⏎ AWAITING QUESTION';
        questionInput.value = '';
        questionInput.focus();
        errorMsg.classList.remove('visible');
        timeoutRecovery.classList.remove('visible');
        resetConversation();
        lastResult = null;
        setMethod(null);
        destroyGraph();
        const gp = document.getElementById('graphPanel');
        if (gp) gp.dataset.userToggled = '0';
        // Reset trace button
        const traceBtn = document.getElementById('traceBtn');
        if (traceBtn) { traceBtn.classList.remove('active'); traceBtn.textContent = '◉ TRACE'; }
        tracing = false;
        // Clear follow-up chat
        const thread = document.getElementById('chatThread');
        if (thread) {
            thread.querySelectorAll('.chat-msg').forEach(el => el.remove());
        }
        const ph = document.getElementById('chatPlaceholder');
        if (ph) ph.classList.remove('hidden');
    });

    // ─── FOLLOW-UP CHAT ──────────────────────────────
    function addChatMessage(type, text) {
        const thread = document.getElementById('chatThread');
        const ph = document.getElementById('chatPlaceholder');
        if (!thread) return;
        if (ph) ph.classList.add('hidden');
        const msg = document.createElement('div');
        msg.className = 'chat-msg chat-msg-' + type;
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = text;
        msg.appendChild(bubble);
        thread.appendChild(msg);
        thread.scrollTop = thread.scrollHeight;
    }
    function showChatThinking() {
        const el = document.getElementById('chatThinking');
        if (el) el.classList.remove('hidden');
    }
    function hideChatThinking() {
        const el = document.getElementById('chatThinking');
        if (el) el.classList.add('hidden');
    }

    if (followUpBtn) {
        followUpBtn.addEventListener('click', () => {
            if (followUpModal) followUpModal.classList.remove('hidden');
            if (followUpInput) { followUpInput.value = ''; followUpInput.focus(); }
        });
    }
    if (closeFollowUp) {
        closeFollowUp.addEventListener('click', () => {
            followUpModal.classList.add('hidden');
        });
    }
    if (sendFollowUp) {
        sendFollowUp.addEventListener('click', async () => {
            const text = followUpInput.value.trim();
            if (!text || sendFollowUp.disabled) return;
            followUpInput.value = '';
            sendFollowUp.disabled = true;

            addChatMessage('user', text);
            showChatThinking();

            // Include original problem context so the LLM knows what we're talking about
            const context = lastRaw ? text + ' (follow-up to: ' + lastRaw.slice(0, 80) + ')' : text;
            lastRaw = text;

            try {
                // Always pass null for operation on follow-ups — just a conversational question
                const result = await solveQuestion(context, text, null);
                lastResult = result;
                stepTeX = prependQuestion(result.steps, text);
                totalSteps = stepTeX.length;
                problemLabel.textContent = (text.length > 50 ? text.slice(0, 50) + '…' : text);
                setMethod(result.method || null);
                initCinema();
                initZoomPan();
                renderGraphOnce(context, text);
                hideChatThinking();
                addChatMessage('assistant', (result.method || 'Auto') + ' · ' + result.totalSteps + ' steps');
            } catch (err) {
                if (err instanceof TimeoutError) {
                    try {
                        showChatThinking();
                        const result = await solveQuestion(context, text, null, true);
                        lastResult = result;
                        stepTeX = prependQuestion(result.steps, text);
                        totalSteps = stepTeX.length;
                        problemLabel.textContent = (text.length > 50 ? text.slice(0, 50) + '…' : text);
                        setMethod(result.method || null);
                        initCinema();
                        initZoomPan();
                        renderGraphOnce(context, text);
                        hideChatThinking();
                        addChatMessage('assistant', '8b fallback · ' + (result.method || 'Auto') + ' — ' + result.totalSteps + ' steps');
                    } catch (fe) {
                        hideChatThinking();
                        addChatMessage('assistant', '⚠ Request timed out.');
                    }
                } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
                    hideChatThinking();
                    addChatMessage('assistant', '⚠ Network error. Check your connection.');
                } else {
                    hideChatThinking();
                    addChatMessage('assistant', '⚠ ' + err.message);
                }
            }
            sendFollowUp.disabled = false;
        });
    }
    if (followUpModal) {
        followUpModal.addEventListener('click', (e) => {
            if (e.target === followUpModal) followUpModal.classList.add('hidden');
        });
    }
    followUpInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendFollowUp.click();
        }
    });
    // Auto-resize textarea
    followUpInput.addEventListener('input', () => {
        followUpInput.style.height = '';
        followUpInput.style.height = Math.min(followUpInput.scrollHeight, 120) + 'px';
    });

    // ─── TIMEOUT RECOVERY ───────────────────────────────
    retryBtn.addEventListener('click', () => {
        timeoutRecovery.classList.remove('visible');
        solve();
    });
    simplifyBtn.addEventListener('click', () => {
        timeoutRecovery.classList.remove('visible');
        const raw = questionInput.value;
        questionInput.value = 'simplify ' + raw.replace(/^(?:please\s+)?(?:solve|compute|evaluate|find|calculate|determine|integrate|differentiate|simplify|factor|expand)\s+/i, '');
        selectedOperation = 'SIMPLIFY';
        refreshEnhancerUI(questionInput.value.trim());
        solve();
    });

    // ─── CINEMA CONTROLS ────────────────────────────────
    document.getElementById('playBtn')?.addEventListener('click', togglePlay);
    document.getElementById('resetBtn')?.addEventListener('click', resetAll);
    document.getElementById('speedBtn')?.addEventListener('click', toggleSpeed);
    document.getElementById('exportBtn')?.addEventListener('click', exportPDF);

    // ─── GRAPH PANEL ────────────────────────────────────
    const graphBtn = document.getElementById('graphBtn');
    const graphPanel = document.getElementById('graphPanel');
    const closeGraphPanel = document.getElementById('closeGraphPanel');

    if (graphBtn) {
        graphBtn.addEventListener('click', () => {
            if (graphPanel && graphPanel.classList.contains('visible')) {
                graphPanel.classList.remove('visible');
                graphPanel.dataset.userToggled = '0';
            } else if (lastRaw) {
                graphPanel.dataset.userToggled = '1';
                reShowGraph();
            }
        });
    }
    if (closeGraphPanel) {
        closeGraphPanel.addEventListener('click', () => {
            graphPanel.classList.remove('visible');
            graphPanel.dataset.userToggled = '0';
        });
    }

    // ─── TRACE BTN ──────────────────────────────────────
    const traceBtn = document.getElementById('traceBtn');
    let tracing = false;
    if (traceBtn) {
        traceBtn.addEventListener('click', () => {
            tracing = !tracing;
            if (tracing) {
                traceBtn.classList.add('active');
                traceBtn.textContent = '◉ STOP';
                const args = getStoredGraphArgs();
                if (args) animateCurveTrace(args.fn, args.bounds);
            } else {
                traceBtn.classList.remove('active');
                traceBtn.textContent = '◉ TRACE';
                stopCurveTrace();
                reShowGraph();
            }
        });
    }

    // ─── KEYBOARD ────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
        if (e.key === ' ' || e.key === 'Space') { e.preventDefault(); togglePlay(); }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            if (!isPlaying) { e.preventDefault(); nextStep(); }
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            if (!isPlaying) { e.preventDefault(); prevStep(); }
        }
        if (e.key === 'r' || e.key === 'R') { resetAll(); }
        if (e.key === 'f' || e.key === 'F') { followUpBtn?.click(); }
        if (e.key === 'g' || e.key === 'G') { graphBtn?.click(); }
        if (e.key === 'e' || e.key === 'E') { exportPDF(); }
        if (e.key === 't' || e.key === 'T') { traceBtn?.click(); }
    });

    // ─── INIT ──────────────────────────────────────────
    refreshEnhancerUI('');
    console.log('Math Cinema loaded — chunks: config, graph, enhancer, api, cinema, app');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function onReady() {
            document.removeEventListener('DOMContentLoaded', onReady);
            init();
        });
    } else {
        if (document.querySelector('#chunkLoader.loaded') || !document.getElementById('chunkLoader')) {
            init();
        } else {
            document.addEventListener('chunksReady', init);
        }
    }
})();

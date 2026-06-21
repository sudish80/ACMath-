// ─── CHUNK LOADER ────────────────────────────────────────
// Loads JS chunks in order with progress indication

(function() {
    var CHUNKS = [
        { name: 'config',   file: 'js/config.js' },
        { name: 'graph',    file: 'js/graph.js' },
        { name: 'enhancer', file: 'js/enhancer.js' },
        { name: 'api',      file: 'js/api.js' },
        { name: 'cinema',   file: 'js/cinema.js' },
        { name: 'app',      file: 'js/app.js' },
    ];

    var loaded = 0;
    var total = CHUNKS.length;
    var hasError = false;

    var overlay = document.getElementById('chunkLoader');
    var bar = document.getElementById('chunkBar');
    var label = document.getElementById('chunkLabel');
    var status = document.getElementById('chunkStatus');

    function updateProgress(name) {
        loaded++;
        var pct = Math.round((loaded / total) * 100);
        if (bar) bar.style.width = pct + '%';
        if (label) label.textContent = name;
        if (status) status.textContent = loaded + ' / ' + total;
    }

    function loadNext(index) {
        if (index >= total) {
            if (!hasError) {
                if (overlay) overlay.classList.add('loaded');
                setTimeout(function() {
                    if (overlay) overlay.style.display = 'none';
                }, 500);
                // Dispatch event so app.js knows chunks are ready
                document.dispatchEvent(new Event('chunksReady'));
            }
            return;
        }

        var chunk = CHUNKS[index];
        var script = document.createElement('script');
        script.src = chunk.file;
        script.async = false;
        script.onload = function() {
            if (!hasError) {
                updateProgress(chunk.name);
                loadNext(index + 1);
            }
        };
        script.onerror = function() {
            if (!hasError) {
                hasError = true;
                if (overlay) overlay.classList.add('error');
                if (label) label.textContent = 'FAILED: ' + chunk.name;
                if (status) status.textContent = 'LOAD ERROR';
                // Still try to load remaining chunks
                setTimeout(function() { loadNext(index + 1); }, 300);
            }
        };
        document.body.appendChild(script);
    }

    // Start loading after a small delay to let the overlay render
    setTimeout(function() { loadNext(0); }, 100);
})();

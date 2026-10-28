// ─── Line numbers ──────────────────────────
// Every rendered line gets a number, including the second line of a wrapped row.
// Without this script the CSS counter still numbers rows.
(() => {
    const doc = document.querySelector('.doc');
    if (!doc) return;
    let pending = 0;
    function number() {
        pending = 0;
        const plan = [];
        let n = 0;
        for (const row of doc.querySelectorAll('.l')) {
            if (!row.getClientRects().length) { plan.push([row, null, 0]); continue; }
            const lh = parseFloat(getComputedStyle(row).lineHeight) || 27;
            const lines = Math.max(1, Math.round(row.getBoundingClientRect().height / lh));
            const nums = [];
            for (let i = 0; i < lines; i++) nums.push(++n);
            plan.push([row, nums.join('\n'), lh]);
        }
        for (const [row, text, lh] of plan) {
            if (text === null) { delete row.dataset.ln; continue; }
            if (row.dataset.ln !== text) row.dataset.ln = text;
            row.style.setProperty('--ln-lh', lh + 'px');
        }
    }
    const schedule = () => { if (!pending) pending = requestAnimationFrame(number); };
    const ro = new ResizeObserver(schedule);
    doc.querySelectorAll('.l').forEach(r => ro.observe(r));
    new MutationObserver(schedule).observe(doc, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    if (document.fonts) document.fonts.ready.then(schedule);
    schedule();
})();

// ─── Typewriter with deliberate mistake ────
(() => {
    const heroName = document.getElementById('hero-name');
    if (!heroName) return;

    const TYPE_MS = 100;
    const DELETE_MS = 80;
    const PAUSE_MS = 650;
    const PREFIX = "Hello, I'm ";

    const render = (name) => {
        heroName.innerHTML = PREFIX + name + '<span class="cursor" aria-hidden="true">_</span>';
    };

    const frames = [];
    const wrong = 'Poorva';
    for (let i = 1; i <= wrong.length; i++) frames.push({ name: wrong.slice(0, i), delay: TYPE_MS });
    frames[frames.length - 1].delay = PAUSE_MS;
    frames.push({ name: 'Poorv', delay: DELETE_MS });
    frames.push({ name: 'Poor', delay: PAUSE_MS / 2 });
    const correct = 'Poorav Rawat';
    for (let i = 'Poor'.length + 1; i <= correct.length; i++) frames.push({ name: correct.slice(0, i), delay: TYPE_MS });

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { render(correct); return; }

    let frameIndex = 0;
    render('');
    function runFrame() {
        if (frameIndex >= frames.length) return;
        const { name, delay } = frames[frameIndex++];
        render(name);
        setTimeout(runFrame, delay);
    }
    setTimeout(runFrame, 600);
})();

// ─── Expandable rows ───────────────────────
document.querySelectorAll('.toggle[aria-controls]').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = document.getElementById(btn.getAttribute('aria-controls'));
        if (!target) return;
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        target.hidden = !open;
        const mk = btn.querySelector('.mk');
        if (mk) mk.textContent = open ? '[-]' : '[+]';
    });
});

// ─── Dot-matrix portrait ───────────────────
// The photo is error-diffused onto a dot grid in the ink colour.
// data-crop="x y w h" (fractions of the photo) picks the framed region.
(() => {
    const canvas = document.getElementById('portrait');
    if (!canvas) return;
    const img = new Image();
    img.src = canvas.dataset.src;
    const crop = (canvas.dataset.crop || '0 0 1 1').split(' ').map(Number);
    const CELL = 2.5;

    function draw() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h || !img.naturalWidth) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        const cols = Math.floor(w / CELL), rows = Math.floor(h / CELL);

        const off = document.createElement('canvas');
        off.width = cols; off.height = rows;
        const o = off.getContext('2d', { willReadFrequently: true });
        const sx = crop[0] * img.naturalWidth, sy = crop[1] * img.naturalHeight;
        const sw = crop[2] * img.naturalWidth, sh = crop[3] * img.naturalHeight;
        const scale = Math.max(cols / sw, rows / sh);
        const dw = sw * scale, dh = sh * scale;
        o.filter = 'grayscale(1) brightness(1.15) contrast(1.35)';
        o.drawImage(img, sx, sy, sw, sh, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
        const px = o.getImageData(0, 0, cols, rows).data;

        const lum = new Float32Array(cols * rows);
        for (let i = 0; i < lum.length; i++) lum[i] = Math.pow(px[i * 4] / 255, 0.6);

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = getComputedStyle(canvas).color;
        const r = CELL * 0.45;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const i = y * cols + x;
                const v = lum[i];
                const on = v < 0.5;
                const err = v - (on ? 0 : 1);
                if (x + 1 < cols) lum[i + 1] += err * 7 / 16;
                if (y + 1 < rows) {
                    if (x > 0) lum[i + cols - 1] += err * 3 / 16;
                    lum[i + cols] += err * 5 / 16;
                    if (x + 1 < cols) lum[i + cols + 1] += err * 1 / 16;
                }
                if (on) {
                    ctx.beginPath();
                    ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    img.addEventListener('load', draw);
    new ResizeObserver(draw).observe(canvas);
})();

// ─── Exhibit meters ────────────────────────
// Each bar fills in steps the first time it scrolls into view.
(() => {
    const bars = [...document.querySelectorAll('.bar[data-fill]')];
    if (!bars.length) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cellsFor = (bar) => {
        const probe = document.createElement('span');
        probe.textContent = '0000000000';
        probe.style.visibility = 'hidden';
        probe.style.position = 'absolute';
        bar.appendChild(probe);
        const ch = probe.getBoundingClientRect().width / 10 || 9;
        probe.remove();
        return Math.max(4, Math.floor(bar.clientWidth / ch) - 2);
    };

    const paint = (bar, filled, cells) => {
        bar.innerHTML = '[<b>' + '#'.repeat(filled) + '</b>' + '.'.repeat(cells - filled) + ']';
    };

    const run = (bar) => {
        const cells = cellsFor(bar);
        const goal = Math.round(cells * parseFloat(bar.dataset.fill));
        if (reduce) { paint(bar, goal, cells); return; }
        let i = 0;
        const tick = () => {
            paint(bar, i, cells);
            if (i++ < goal) setTimeout(tick, 28);
        };
        tick();
    };

    bars.forEach(bar => paint(bar, 0, cellsFor(bar)));
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) { io.unobserve(e.target); run(e.target); }
        });
    }, { threshold: 0.6 });
    bars.forEach(bar => io.observe(bar));
})();

// ─── Console Easter Egg ────────────────────
console.log(`
==========================================
 POORAV RAWAT
 CS @ GEORGIA STATE
 AI / ML + SOFTWARE ENGINEERING
==========================================
`);

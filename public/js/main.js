const scriptSrc = document.currentScript ? document.currentScript.src : location.href;

// ─── Line numbers ──────────────────────────
// Every rendered line gets a number, including the second line of a wrapped row.
// Without this script the CSS counter still numbers rows.
(() => {
    const doc = document.querySelector('.doc');
    if (!doc) return;
    let pending = 0;
    const rows = () => [...doc.querySelectorAll('.l')];
    const rowForLine = (line) => rows().find(row => {
        const first = Number(row.dataset.first);
        const count = row.dataset.ln ? row.dataset.ln.split('\n').length : 0;
        return first && line >= first && line < first + count;
    });
    const highlight = (row) => {
        doc.querySelectorAll('.l.hl').forEach(item => item.classList.remove('hl'));
        if (row) row.classList.add('hl');
        return row;
    };
    const resolveHash = () => {
        const match = location.hash.match(/^#L(\d+)$/i);
        if (!match) return;
        const row = rowForLine(Number(match[1]));
        if (row) {
            highlight(row);
            row.scrollIntoView({ block: 'center' });
        }
    };
    const jump = (value) => {
        const line = Number(value);
        if (!Number.isInteger(line) || line < 1) return false;
        const row = rowForLine(line);
        if (!row) return false;
        history.replaceState(null, '', '#L' + line);
        highlight(row);
        row.scrollIntoView({ block: 'center' });
        return row;
    };
    function number() {
        pending = 0;
        const plan = [];
        let n = 0;
        for (const row of rows()) {
            if (!row.getClientRects().length) { plan.push([row, null, 0, 0]); continue; }
            const first = n + 1;
            const lh = parseFloat(getComputedStyle(row).lineHeight) || 27;
            const lines = Math.max(1, Math.round(row.getBoundingClientRect().height / lh));
            const nums = [];
            for (let i = 0; i < lines; i++) nums.push(++n);
            plan.push([row, nums.join('\n'), lh, first]);
        }
        for (const [row, text, lh, first] of plan) {
            if (text === null) { delete row.dataset.ln; delete row.dataset.first; continue; }
            if (row.dataset.ln !== text) row.dataset.ln = text;
            row.dataset.first = String(first);
            row.style.setProperty('--ln-lh', lh + 'px');
        }
    }
    const schedule = () => { if (!pending) pending = requestAnimationFrame(number); };
    const ro = new ResizeObserver(schedule);
    rows().forEach(r => ro.observe(r));
    new MutationObserver(schedule).observe(doc, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    window.siteLines = { jump, resolveHash };
    window.addEventListener('hashchange', resolveHash);
    if (document.fonts) document.fonts.ready.then(() => { number(); resolveHash(); });
    schedule();

    doc.addEventListener('click', async e => {
        const row = e.target.closest('.l');
        if (!row || !row.dataset.first || e.clientX >= row.getBoundingClientRect().left) return;
        const lh = parseFloat(getComputedStyle(row).lineHeight) || 27;
        const count = row.dataset.ln.split('\n').length;
        const offset = Math.max(0, Math.floor((e.clientY - row.getBoundingClientRect().top) / lh));
        const line = Number(row.dataset.first) + Math.min(offset, count - 1);
        if (!jump(line)) return;
        try {
            await navigator.clipboard.writeText(location.href);
        } catch (_) {}
        window.showCommandStatus?.('copied link to line ' + line);
    });
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
// data-focus and data-zoom frame an EXIF-oriented photo without distortion.
(() => {
    const canvas = document.getElementById('portrait');
    if (!canvas) return;
    const img = new Image();
    img.src = canvas.dataset.src;
    const focus = (canvas.dataset.focus || '0.25 0.52').split(/\s+/).map(Number);
    const zoom = Math.max(1, Number(canvas.dataset.zoom) || 1);
    const CELL = 2.5;

    function draw() {
        const w = canvas.clientWidth;
        const h = canvas.getBoundingClientRect().height;
        if (!w || !h || !img.naturalWidth) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        const cols = Math.floor(w / CELL), rows = Math.floor(h / CELL);

        const off = document.createElement('canvas');
        off.width = cols; off.height = rows;
        const o = off.getContext('2d', { willReadFrequently: true });
        const aspect = cols / rows;
        let sw = img.naturalWidth, sh = img.naturalHeight;
        if (sw / sh > aspect) sw = sh * aspect;
        else sh = sw / aspect;
        sw /= zoom;
        sh /= zoom;
        const fx = Math.max(0, Math.min(1, focus[0] || 0)) * img.naturalWidth;
        const fy = Math.max(0, Math.min(1, focus[1] || 0)) * img.naturalHeight;
        const sx = Math.max(0, Math.min(img.naturalWidth - sw, fx - sw / 2));
        const sy = Math.max(0, Math.min(img.naturalHeight - sh, fy - sh / 2));
        o.filter = 'grayscale(1) brightness(1.15) contrast(1.35)';
        o.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
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

// ─── Command line ──────────────────────────
(() => {
    const bar = document.createElement('section');
    bar.className = 'command-bar';
    bar.hidden = true;
    bar.setAttribute('aria-label', 'Command line');
    const output = document.createElement('div');
    output.className = 'command-output';
    output.setAttribute('aria-live', 'polite');
    const form = document.createElement('form');
    form.className = 'command-form';
    const prompt = document.createElement('span');
    prompt.className = 'command-prompt';
    prompt.setAttribute('aria-hidden', 'true');
    prompt.textContent = '>';
    const input = document.createElement('input');
    input.className = 'command-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'command');
    form.append(prompt, input);
    const inner = document.createElement('div');
    inner.className = 'command-inner';
    inner.append(output, form);
    bar.append(inner);
    document.body.append(bar);

    const commands = ['help', 'info', 'home', 'feed', 'resume', 'ls', 'open', 'cd', 'whoami', 'goto', 'github', 'linkedin', 'codeforces', 'email', 'clear'];
    const blogSlugs = ['sre-internship-blog', 'blog-formalization-of-intelligence'];
    const LINK_URLS = {
        github: 'https://github.com/pooravrawat1',
        linkedin: 'https://www.linkedin.com/in/pooravrawat/',
        codeforces: 'https://codeforces.com/profile/prawat2',
        email: 'mailto:pooravrawat@gmail.com',
    };
    let history = [];
    try {
        const saved = JSON.parse(sessionStorage.getItem('command-history') || '[]');
        if (Array.isArray(saved)) history = saved.filter(item => typeof item === 'string');
    } catch (_) {}
    let historyIndex = 0, previousFocus = null, closeTimer = 0;
    const page = path => new URL(path, scriptSrc).href;
    const show = lines => {
        output.textContent = lines.slice(-8).join('\n');
        bar.hidden = false;
    };
    const close = () => {
        if (bar.hidden) return;
        bar.hidden = true;
        clearTimeout(closeTimer);
        if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    };
    const open = (focus = true) => {
        if (bar.hidden) previousFocus = document.activeElement;
        bar.hidden = false;
        if (focus) input.focus();
    };
    window.showCommandStatus = message => {
        show([message]);
        clearTimeout(closeTimer);
        closeTimer = setTimeout(close, 2600);
    };
    const print = (...lines) => show(lines.flatMap(line => String(line).split('\n')));
    const go = href => { location.href = href; };
    const navigateBlog = slug => {
        const clean = slug.replace(/\.html$/i, '');
        if (!blogSlugs.includes(clean)) {
            print('blog not found: ' + slug);
            return;
        }
        go(page('../blogs/' + clean + '.html'));
    };
    const externalLinks = () => [...document.querySelectorAll('.chips a')].map(link => [
        link.textContent.trim().toLowerCase(), link.href
    ]);

    function execute(raw) {
        const text = raw.trim().toLowerCase();
        if (!text) return;
        history.push(text);
        if (history.length > 100) history.shift();
        try {
            sessionStorage.setItem('command-history', JSON.stringify(history));
        } catch (_) {}
        historyIndex = history.length;
        input.value = '';
        const [command, ...args] = text.split(/\s+/);
        const arg = args[0] || '';
        if (command === 'help') {
            print(
                'help — list commands · info / home — go to index',
                'feed — open feed · resume — open resume pdf',
                'ls [blogs] — list pages or blog slugs · open <slug> — open a blog',
                'cd ~ / cd .. — go to index · cd feed — open feed',
                'whoami — print a short bio · goto <n> or :<n> — jump to line',
                'github / linkedin / codeforces / email — open a link',
                'clear — clear output'
            );
        } else if (['info', 'home', 'cd'].includes(command) && (command !== 'cd' || ['~', '..'].includes(arg))) {
            go(page('../index.html'));
        } else if (command === 'feed' || (command === 'cd' && arg === 'feed')) {
            go(page('../feed.html'));
        } else if (command === 'resume') {
            window.open(page('../assets/Poorav_Rawat_Resume.pdf'), '_blank', 'noopener');
        } else if (command === 'ls') {
            if (arg === 'blogs') print(blogSlugs.join('  '));
            else print('info  feed  resume  blogs/');
        } else if (command === 'open') {
            if (arg) navigateBlog(arg);
            else print('usage: open <slug>');
        } else if (command === 'cd' && arg.startsWith('blogs/')) {
            navigateBlog(arg.slice('blogs/'.length));
        } else if (command === 'whoami') {
            print('poorav rawat — cs @ georgia state. ai/ml research + software engineering.');
        } else if (command === 'goto' || /^:\d+$/.test(command)) {
            const line = command[0] === ':' ? command.slice(1) : arg;
            if (!window.siteLines?.jump(line)) print('line not found: ' + line);
        } else if (['github', 'linkedin', 'codeforces', 'email'].includes(command)) {
            const match = externalLinks().find(([name]) => name === command);
            window.open(match ? match[1] : LINK_URLS[command], '_blank', 'noopener');
        } else if (command === 'clear') {
            output.textContent = '';
        } else {
            print('command not found: ' + text + ' — try "help"');
        }
    }

    document.addEventListener('keydown', e => {
        const active = document.activeElement;
        if (e.key === '/' && !active.matches('input, textarea')) {
            e.preventDefault();
            open();
        } else if (e.key === 'Escape' && !bar.hidden) {
            e.preventDefault();
            close();
        }
    });
    document.addEventListener('click', e => {
        if (!bar.hidden && !bar.contains(e.target)) close();
    });
    form.addEventListener('submit', e => {
        e.preventDefault();
        execute(input.value);
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp' && history.length) {
            e.preventDefault();
            historyIndex = Math.max(0, historyIndex - 1);
            input.value = history[historyIndex];
        } else if (e.key === 'ArrowDown' && history.length) {
            e.preventDefault();
            historyIndex = Math.min(history.length, historyIndex + 1);
            input.value = historyIndex === history.length ? '' : history[historyIndex];
        } else if (e.key === 'Tab') {
            const value = input.value.trim().toLowerCase();
            const parts = value.split(/\s+/);
            let matches = [];
            if (parts[0] === 'open' && parts[1]) {
                matches = blogSlugs.filter(slug => slug.startsWith(parts[1]));
                if (matches.length === 1) input.value = 'open ' + matches[0];
            } else if (parts[0] === 'cd' && parts[1]?.startsWith('blogs/')) {
                const prefix = parts[1].slice(6);
                matches = blogSlugs.filter(slug => slug.startsWith(prefix));
                if (matches.length === 1) input.value = 'cd blogs/' + matches[0];
            } else if (parts.length === 1) {
                matches = commands.filter(item => item.startsWith(parts[0]));
                if (matches.length === 1) input.value = matches[0];
            }
            if (matches.length === 1) e.preventDefault();
        }
    });
})();

// ─── Console Easter Egg ────────────────────
console.log(`
==========================================
 POORAV RAWAT
 CS @ GEORGIA STATE
 AI / ML + SOFTWARE ENGINEERING
==========================================
`);

const scriptSrc = document.currentScript ? document.currentScript.src : location.href;

// ─── Theme ─────────────────────────────────
(() => {
    const toggle = document.getElementById('theme-toggle');
    const setTheme = (theme) => {
        const dark = theme === 'dark';
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        localStorage.setItem('theme', dark ? 'dark' : 'light');
        if (toggle) {
            toggle.textContent = dark ? 'light' : 'dark';
            toggle.setAttribute('aria-pressed', String(dark));
        }
        window.dispatchEvent(new Event('themechange'));
    };
    window.setTheme = setTheme;
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    if (toggle) toggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
})();

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
        const dark = document.documentElement.dataset.theme === 'dark';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = getComputedStyle(canvas).color;
        const r = CELL * 0.45;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const i = y * cols + x;
                const v = lum[i];
                const on = dark ? v >= 0.5 : v < 0.5;
                const err = v - (on ? (dark ? 1 : 0) : (dark ? 0 : 1));
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
    window.addEventListener('themechange', draw);
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

// ─── Gridworld learner ─────────────────────
(() => {
    const exhibit = document.getElementById('agent-exhibit');
    if (!exhibit) return;
    const rows = [...exhibit.querySelectorAll('.grid-row')];
    const statEpisode = exhibit.querySelector('[data-stat="episode"]');
    const statSteps = exhibit.querySelector('[data-stat="steps"]');
    const statEpsilon = exhibit.querySelector('[data-stat="epsilon"]');
    const statBest = exhibit.querySelector('[data-stat="best"]');
    const status = exhibit.querySelector('[data-agent-status]');
    const pauseButton = exhibit.querySelector('[data-agent-pause]');
    const WALLS = [
        '.........#........',
        '....#........#....',
        '....#........#....',
        '....#........#....',
        '....#........#....',
        '....#........#....',
        '....#........#....',
    ];
    const WIDTH = 18, HEIGHT = 7, ACTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const ALPHA = 0.5, GAMMA = 0.95, EPSILON_FLOOR = 0.05;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(entries => {
        for (const entry of entries) {
            visible = entry.isIntersecting;
            if (visible && !converged && !paused) {
                if (reduce) trainSynchronously();
                else requestFrame();
            }
        }
    }, { threshold: 0.1 });
    let q, visited, episode, steps, lastSteps, epsilon, best, lastLengths;
    let x, y, episodeDone, visible = false, paused = false, converged = false, frame = 0;

    const index = (cx, cy) => cy * WIDTH + cx;
    const wall = (cx, cy) => WALLS[cy][cx] === '#';
    const legal = (cx, cy) => cx >= 0 && cx < WIDTH && cy >= 0 && cy < HEIGHT && !wall(cx, cy);

    function reset() {
        cancelAnimationFrame(frame);
        frame = 0;
        q = Array.from({ length: WIDTH * HEIGHT }, () => [0, 0, 0, 0]);
        visited = new Uint8Array(WIDTH * HEIGHT);
        episode = 0;
        steps = 0;
        lastSteps = 0;
        epsilon = 1;
        best = Infinity;
        lastLengths = [];
        x = 0;
        y = HEIGHT - 1;
        episodeDone = false;
        converged = false;
        paused = false;
        pauseButton.textContent = 'pause';
        pauseButton.setAttribute('aria-pressed', 'false');
        if (visible) {
            if (reduce) trainSynchronously();
            else requestFrame();
        } else render();
    }

    function chooseAction(state) {
        if (Math.random() < epsilon) return Math.floor(Math.random() * ACTIONS.length);
        const max = Math.max(...q[state]);
        const ties = q[state].map((value, i) => value === max ? i : -1).filter(i => i >= 0);
        return ties[Math.floor(Math.random() * ties.length)];
    }

    function trainStep() {
        if (episodeDone) {
            x = 0;
            y = HEIGHT - 1;
            steps = 0;
            episodeDone = false;
        }
        const state = index(x, y);
        visited[state] = 1;
        const action = chooseAction(state);
        const [dx, dy] = ACTIONS[action];
        const nx = x + dx, ny = y + dy;
        const moved = legal(nx, ny);
        const tx = moved ? nx : x, ty = moved ? ny : y;
        const terminal = tx === WIDTH - 1 && ty === 0;
        const next = index(tx, ty);
        visited[next] = 1;
        const reward = terminal ? 10 : -1;
        const future = terminal ? 0 : Math.max(...q[next]);
        q[state][action] += ALPHA * (reward + GAMMA * future - q[state][action]);
        x = tx;
        y = ty;
        steps++;
        if (terminal || steps >= 200) finishEpisode(terminal);
    }

    function finishEpisode(reachedGoal) {
        lastSteps = steps;
        if (reachedGoal) best = Math.min(best, steps);
        lastLengths.push(reachedGoal ? steps : 200);
        if (lastLengths.length > 5) lastLengths.shift();
        episode++;
        epsilon = Math.max(EPSILON_FLOOR, epsilon * 0.97);
        episodeDone = true;
        converged = epsilon <= EPSILON_FLOOR && best < Infinity &&
            lastLengths.length === 5 && lastLengths.every(length => length === best);
    }

    function greedyPath() {
        const path = new Map();
        let cx = 0, cy = HEIGHT - 1;
        const seen = new Set();
        for (let i = 0; i < 200 && !(cx === WIDTH - 1 && cy === 0); i++) {
            const state = index(cx, cy);
            if (seen.has(state)) break;
            seen.add(state);
            const max = Math.max(...q[state]);
            const action = q[state].indexOf(max);
            const [dx, dy] = ACTIONS[action];
            const nx = cx + dx, ny = cy + dy;
            if (!legal(nx, ny)) break;
            path.set(state, ['↑', '→', '↓', '←'][action]);
            cx = nx;
            cy = ny;
        }
        return path;
    }

    function render() {
        const maxima = [];
        for (let i = 0; i < visited.length; i++) {
            if (visited[i]) maxima.push(Math.max(...q[i]));
        }
        const min = maxima.length ? Math.min(...maxima) : 0;
        const max = maxima.length ? Math.max(...maxima) : 0;
        const ramp = ' .·:-=+';
        const path = converged ? greedyPath() : new Map();
        for (let cy = 0; cy < HEIGHT; cy++) {
            const cells = [];
            for (let cx = 0; cx < WIDTH; cx++) {
                if (wall(cx, cy)) {
                    cells.push('<span class="grid-wall">#</span>');
                    continue;
                }
                const cell = index(cx, cy);
                if (cx === WIDTH - 1 && cy === 0) {
                    cells.push('<span class="grid-goal">G</span>');
                } else if (converged && path.has(cell)) {
                    cells.push('<span class="agent-path">' + path.get(cell) + '</span>');
                } else if (!converged && cx === x && cy === y && !episodeDone) {
                    cells.push('<span class="grid-agent">@</span>');
                } else if (visited[cell]) {
                    const value = Math.max(...q[cell]);
                    const ratio = max === min ? 0 : (value - min) / (max - min);
                    const rampIndex = Math.min(ramp.length - 1, Math.floor(ratio * (ramp.length - 1)));
                    cells.push('<span class="grid-value" style="--shade:' + Math.round(ratio * 100) + '%">' + ramp[rampIndex] + '</span>');
                } else {
                    cells.push('<span class="grid-value"> </span>');
                }
            }
            rows[cy].innerHTML = cells.join(' ');
        }
        statEpisode.textContent = String(episode);
        statSteps.textContent = String(lastSteps);
        statEpsilon.textContent = epsilon.toFixed(2);
        statBest.textContent = best === Infinity ? '—' : String(best);
        status.textContent = converged ? 'converged' : paused ? 'paused' : 'training';
    }

    function trainSynchronously() {
        while (!converged) {
            const count = Math.min(64, 1 + Math.floor(episode / 3));
            for (let i = 0; i < count && !converged; i++) trainStep();
        }
        render();
    }

    function requestFrame() {
        if (!visible || paused || converged || frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            if (!visible || paused || converged) return;
            const count = Math.min(64, 1 + Math.floor(episode / 3));
            for (let i = 0; i < count && !converged; i++) trainStep();
            render();
            requestFrame();
        });
    }

    pauseButton.addEventListener('click', () => {
        paused = !paused;
        pauseButton.textContent = paused ? 'resume' : 'pause';
        pauseButton.setAttribute('aria-pressed', String(paused));
        if (paused) {
            cancelAnimationFrame(frame);
            frame = 0;
        }
        else if (visible) {
            if (reduce) trainSynchronously();
            else requestFrame();
        }
        render();
    });
    exhibit.querySelector('[data-agent-reset]').addEventListener('click', reset);
    window.learningAgent = { reset };
    io.observe(exhibit);
    reset();
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

    const commands = ['help', 'info', 'home', 'feed', 'resume', 'ls', 'open', 'cd', 'whoami', 'theme', 'dark', 'light', 'goto', 'github', 'linkedin', 'codeforces', 'email', 'train', 'reset', 'clear'];
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
    const externalLinks = () => [...document.querySelectorAll('.chips a.chip')].map(link => [
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
                'whoami — print a short bio · theme [dark|light] — change theme',
                'dark / light — set theme · goto <n> or :<n> — jump to line',
                'github / linkedin / codeforces / email — open a link',
                'train / reset — restart agent · clear — clear output'
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
        } else if (command === 'theme') {
            const current = document.documentElement.dataset.theme;
            const next = arg === 'dark' || arg === 'light' ? arg : (current === 'dark' ? 'light' : 'dark');
            window.setTheme(next);
            print('theme: ' + next);
        } else if (command === 'dark' || command === 'light') {
            window.setTheme(command);
            print('theme: ' + command);
        } else if (command === 'goto' || /^:\d+$/.test(command)) {
            const line = command[0] === ':' ? command.slice(1) : arg;
            if (!window.siteLines?.jump(line)) print('line not found: ' + line);
        } else if (['github', 'linkedin', 'codeforces', 'email'].includes(command)) {
            const match = externalLinks().find(([name]) => name === command);
            window.open(match ? match[1] : LINK_URLS[command], '_blank', 'noopener');
        } else if (command === 'train' || command === 'reset') {
            if (window.learningAgent) window.learningAgent.reset();
            else print('no agent on this page');
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

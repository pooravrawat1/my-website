document.addEventListener('DOMContentLoaded', () => {

    // ─── Typewriter with deliberate mistake ──
    const heroName = document.getElementById('hero-name');
    if (heroName) {

        const TYPE_MS = 100;   // ms per character typed
        const DELETE_MS = 80;    // ms per character deleted
        const PAUSE_MS = 650;   // ms pause when noticing the mistake

        const PREFIX = "Hello, I'm ";

        // Render helper — prefix is always static, only `name` animates
        const render = (name) => {
            heroName.innerHTML =
                PREFIX + name + '<span class="ascii-cursor">_</span>';
        };

        // Pre-build every frame: { name, delay }
        const frames = [];

        // ── Phase 1: type the wrong name "Poorva" ──
        const wrong = 'Poorva';
        for (let i = 1; i <= wrong.length; i++) {
            frames.push({ name: wrong.slice(0, i), delay: TYPE_MS });
        }
        frames[frames.length - 1].delay = PAUSE_MS; // pause at mistake

        // ── Phase 2: delete "va" (2 backspaces) ──
        frames.push({ name: 'Poorv', delay: DELETE_MS });
        frames.push({ name: 'Poor', delay: PAUSE_MS / 2 });

        // ── Phase 3: type the correct ending "av Rawat" ──
        const correct = 'Poorav Rawat';
        const base = 'Poor'.length;
        for (let i = base + 1; i <= correct.length; i++) {
            frames.push({ name: correct.slice(0, i), delay: TYPE_MS });
        }

        // Kick off the sequence
        let frameIndex = 0;
        render(''); // start with just the cursor

        function runFrame() {
            if (frameIndex >= frames.length) return;
            const { name, delay } = frames[frameIndex++];
            render(name);
            setTimeout(runFrame, delay);
        }

        setTimeout(runFrame, 600); // initial pause before first keystroke
    }

    // ─── Smooth scroll for in-page links ───
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

});

// ─── Console Easter Egg ─────────────────────
console.log(`
╭──────────────────────────────────────╮
│  poorav rawat                        │
│  cs @ georgia state                  │
│  ──────────────────────────────────  │
│  ai / ml + software engineering      │
╰──────────────────────────────────────╯
`);

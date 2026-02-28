// ═══════════════════════════════════════════
//  poorav rawat — main.js
//  Terminal-style interactions
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // ─── ASCII Name Animation ───────────────
    const heroName = document.getElementById('hero-name');
    if (heroName) {
        const targetText = 'poorav rawat';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*-_+=<>';
        let iteration = 0;
        let interval = null;
        let resolved = new Array(targetText.length).fill(false);

        function scramble() {
            const display = targetText
                .split('')
                .map((char, i) => {
                    if (char === ' ') return ' ';
                    if (resolved[i]) return char;
                    if (i < Math.floor(iteration)) {
                        resolved[i] = true;
                        return char;
                    }
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join('');

            heroName.innerHTML = display + '<span class="ascii-cursor">_</span>';

            if (iteration >= targetText.length) {
                clearInterval(interval);
                heroName.innerHTML = targetText + '<span class="ascii-cursor">_</span>';
            }
            iteration += 0.4;
        }

        // Start after a brief delay
        setTimeout(() => {
            interval = setInterval(scramble, 40);
        }, 200);
    }

    // ─── Vim Keybinds ──────────────────────
    const overlay = document.getElementById('keybinds-overlay');
    const triggerBtn = document.getElementById('keybind-trigger');
    let gPressed = false;
    let gTimer = null;

    function toggleKeybinds() {
        if (!overlay) return;
        overlay.classList.toggle('active');
    }

    function closeKeybinds() {
        if (!overlay) return;
        overlay.classList.remove('active');
    }

    if (triggerBtn) {
        triggerBtn.addEventListener('click', toggleKeybinds);
    }

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeKeybinds();
        });
    }

    document.addEventListener('keydown', (e) => {
        const tag = document.activeElement.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;

        const isOverlayOpen = overlay && overlay.classList.contains('active');

        switch (e.key) {
            case '?':
                e.preventDefault();
                toggleKeybinds();
                break;

            case 'Escape':
                closeKeybinds();
                break;

            case 'j':
                if (!isOverlayOpen) window.scrollBy({ top: 80, behavior: 'smooth' });
                break;

            case 'k':
                if (!isOverlayOpen) window.scrollBy({ top: -80, behavior: 'smooth' });
                break;

            case 'g':
                if (!isOverlayOpen) {
                    if (gPressed) {
                        // gg — go to top
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        gPressed = false;
                        clearTimeout(gTimer);
                    } else {
                        gPressed = true;
                        gTimer = setTimeout(() => { gPressed = false; }, 500);
                    }
                }
                break;

            case 'G':
                if (!isOverlayOpen) {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
                break;

            case '1':
                if (!isOverlayOpen) window.location.href = 'index.html';
                break;

            case '2':
                if (!isOverlayOpen) window.location.href = 'feed.html';
                break;
        }
    });

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
│                                      │
│  press ? for keybinds                │
╰──────────────────────────────────────╯
`);

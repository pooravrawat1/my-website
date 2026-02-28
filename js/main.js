// ═══════════════════════════════════════════
//  poorav rawat — main.js
//  Terminal-style interactions
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // ─── ASCII Name Animation ───────────────
    const heroName = document.getElementById('hero-name');
    if (heroName) {
        const prefix = 'Hello, I\'m ';
        const nameText = 'Poorav Rawat';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*-_+=<>';
        let iteration = 0;
        let interval = null;
        let resolved = new Array(nameText.length).fill(false);

        // Show prefix immediately
        heroName.innerHTML = prefix + '<span class="ascii-cursor">_</span>';

        function scramble() {
            const display = nameText
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

            heroName.innerHTML = prefix + display + '<span class="ascii-cursor">_</span>';

            if (iteration >= nameText.length) {
                clearInterval(interval);
                heroName.innerHTML = prefix + nameText + '<span class="ascii-cursor">_</span>';
            }
            iteration += 0.4;
        }

        // Start after a longer delay (1 second)
        setTimeout(() => {
            interval = setInterval(scramble, 40);
        }, 1000);
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

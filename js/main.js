/**
 * Minimal JavaScript for Poorav Rawat's Portfolio
 * Liam Ellison Style - Simplified
 */

document.addEventListener('DOMContentLoaded', () => {
    // Smooth scroll for anchor links
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

    // Update active nav on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${entry.target.id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, { rootMargin: '-50% 0px' });

    sections.forEach(section => observer.observe(section));

    // P-R rotation on scroll
    const initials = document.querySelector('.initials');
    const sidebarLocation = document.querySelector('.sidebar-location');
    
    if (initials && sidebarLocation) {
        // Calculate scroll thresholds based on viewport - faster rotation
        const getThresholds = () => ({
            start: window.innerHeight * 0.05,  // Start sooner
            end: window.innerHeight * 0.25     // End much sooner for faster rotation
        });
        
        let thresholds = getThresholds();
        
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const { start, end } = thresholds;
            
            let rotation = 0;
            let translateY = 0;
            let translateX = 0;
            
            if (scrollY < start) {
                // Before animation starts
                rotation = 0;
                translateY = 0;
                translateX = 0;
            } else if (scrollY >= start && scrollY <= end) {
                // During transition
                const rawProgress = (scrollY - start) / (end - start);
                const progress = 1 - Math.pow(1 - rawProgress, 3); // Cubic ease-out
                rotation = progress * -90;
                
                // Move down slightly - just 40px down from original position
                translateY = progress * 40;
                // Shift right slightly when rotating to align with text
                translateX = progress * 30;
            } else {
                // After animation completes - keep it just 40px below original position
                rotation = -90;
                translateY = 270;
                translateX = 70;
            }
            
            // Apply translate before rotate to keep it on the left
            initials.style.transform = `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`;
        });
        
        // Recalculate thresholds on resize
        window.addEventListener('resize', () => {
            thresholds = getThresholds();
        });
    }

    // Cursor follower
    const cursorFollower = document.createElement('div');
    cursorFollower.className = 'cursor-follower';
    document.body.appendChild(cursorFollower);

    let mouseX = 0;
    let mouseY = 0;
    let followerX = 0;
    let followerY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Smooth animation loop
    function animateCursor() {
        // Smooth following with delay
        const speed = 0.15;
        followerX += (mouseX - followerX) * speed;
        followerY += (mouseY - followerY) * speed;

        cursorFollower.style.left = followerX + 'px';
        cursorFollower.style.top = followerY + 'px';

        requestAnimationFrame(animateCursor);
    }

    animateCursor();

    // Initialize tsParticles
    if (typeof tsParticles !== 'undefined') {
        tsParticles.load('tsparticles', {
            particles: {
                number: {
                    value: 100,
                    density: {
                        enable: true,
                        value_area: 800
                    }
                },
                color: {
                    value: '#1a1a1a'
                },
                shape: {
                    type: 'circle'
                },
                opacity: {
                    value: 0.3,
                    random: true,
                    anim: {
                        enable: true,
                        speed: 1,
                        opacity_min: 0.1,
                        sync: false
                    }
                },
                size: {
                    value: 2,
                    random: true,
                    anim: {
                        enable: true,
                        speed: 2,
                        size_min: 0.3,
                        sync: false
                    }
                },
                line_linked: {
                    enable: false
                },
                move: {
                    enable: true,
                    speed: 0.5,
                    direction: 'none',
                    random: true,
                    straight: false,
                    out_mode: 'out',
                    bounce: false
                }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: {
                        enable: true,
                        mode: 'light'
                    },
                    onclick: {
                        enable: true,
                        mode: 'push'
                    },
                    resize: true
                },
                modes: {
                    light: {
                        area: {
                            gradient: {
                                start: {
                                    value: '#0077C5'
                                },
                                stop: {
                                    value: '#000000'
                                }
                            },
                            radius: 300
                        },
                        shadow: {
                            color: {
                                value: '#0077C5'
                            },
                            length: 2000
                        }
                    },
                    push: {
                        particles_nb: 4
                    }
                }
            },
            retina_detect: true
        });
    }
});

// Console greeting
console.log(`
╭─────────────────────────────────╮
│  poorav rawat                   │
│  ai & ml research               │
│  ─────────────────────────────  │
│  building intelligent systems   │
╰─────────────────────────────────╯
`);

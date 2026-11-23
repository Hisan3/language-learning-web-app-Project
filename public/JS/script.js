// script.js
// Replicates Framer Motion behavior using GSAP and ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Floating emojis animation (infinite)
document.querySelectorAll('#floating-emoji-wrap .floating').forEach((el) => {
  try {
    const data = JSON.parse(el.getAttribute('data-anim') || '{}');
    gsap.to(el, {
      y: data.y ? data.y[1] : -10,
      rotation: data.rotate ? data.rotate[1] : 0,
      duration: data.duration || 4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: data.delay || 0
    });
  } catch (e) {
    // fallback simple animation
    gsap.to(el, { y: -10, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }
});

// Header reveal animations (on load)
gsap.from('.nav-brand', { opacity: 0, x: -20, duration: 0.6 });
gsap.from('.nav-actions', { opacity: 0, x: 20, duration: 0.6 });

// Hero reveal
gsap.from('.hero-left', { opacity: 0, y: 30, duration: 0.8 });
gsap.from('.hero-right', { opacity: 0, scale: 0.9, duration: 0.8, delay: 0.2 });

// Floating small cards in hero
document.querySelectorAll('.float-card').forEach((el, idx) => {
  const data = JSON.parse(el.getAttribute('data-anim') || '{}');
  gsap.to(el, {
    y: data.y ? data.y[1] : -10,
    duration: data.duration || 3,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });
});

// While-in-view animations for sections (mimic Framer Motion whileInView)
document.querySelectorAll('section .card, section .xp-bar, section .hero-left > div, .card, .xp-bar').forEach((el) => {
  gsap.from(el, {
    scrollTrigger: {
      trigger: el,
      start: 'top 85%',
      toggleActions: 'play none none none',
      once: true
    },
    opacity: 0,
    y: 30,
    duration: 0.6,
    stagger: 0.15
  });
});

// Progress bars animate when visible
document.querySelectorAll('.progress, .xp-progress').forEach((el) => {
  let parent = el.closest('section') || document;
  gsap.fromTo(el, { width: '0%' }, {
    width: el.style.width || '75%',
    duration: 1.2,
    scrollTrigger: {
      trigger: el,
      start: 'top 90%',
      toggleActions: 'play none none none',
      once: true
    },
    ease: 'power2.out'
  });
});

// Rotating sparkle in XP bar
gsap.to('.sparkle-rot', { rotation: 10, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut' });

// Small hover effects: scale on card hover (left to CSS but we add micro-interaction)
document.querySelectorAll('.card').forEach((card) => {
  card.addEventListener('mouseenter', () => gsap.to(card, { scale: 1.05, y: -10, duration: 0.25 }));
  card.addEventListener('mouseleave', () => gsap.to(card, { scale: 1, y: 0, duration: 0.25 }));
});

// Buttons click handlers (map to onGetStarted)
function onGetStarted() {
  // For parity with the original React handler, we just show a small pulse animation
  const btns = document.querySelectorAll('#loginBtn, #signupBtn, #startJourneyBtn, #finalCtaBtn');
  btns.forEach(b => gsap.fromTo(b, { scale: 0.98 }, { scale: 1.02, duration: 0.18, yoyo: true, repeat: 1 }));
  // No navigation — original just called a handler. Keep parity.
}
['loginBtn','signupBtn','startJourneyBtn','finalCtaBtn'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', onGetStarted);
});

// Ensure lucide icons are replaced (in case they are loaded after scripts)
if (window.lucide) {
  try { lucide.replace(); } catch(e){ /* ignore */ }
}

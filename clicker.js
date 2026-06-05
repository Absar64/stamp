// ===== Heart Box Clicker product page =====

// sticky nav background on scroll
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 12);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// mobile menu
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav__links');
navToggle?.addEventListener('click', () => navLinks.classList.toggle('is-open'));

// entrance animations
requestAnimationFrame(() => document.body.classList.add('is-ready'));

// ===== Finish swatches: recolour the heart box =====
const device = document.getElementById('ckDevice');
const finishName = document.getElementById('ckFinishName');
const captionFinish = document.getElementById('ckCaptionFinish');
document.querySelectorAll('#ckFinish .ck-swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    document.querySelectorAll('#ckFinish .ck-swatch').forEach(s => s.classList.remove('is-active'));
    sw.classList.add('is-active');
    device.style.setProperty('--finish', getComputedStyle(sw).getPropertyValue('--s').trim());
    device.style.setProperty('--accent', sw.dataset.accent);
    if (finishName) finishName.textContent = sw.dataset.name;
    if (captionFinish) captionFinish.textContent = sw.dataset.name;
  });
});

// currency + live pricing are handled globally in store.js

// ===== Tiny synth so the "speaker" actually makes a sound =====
let audio;
function tone({ type = 'sine', freq = 440, dur = 0.18, vol = 0.18, slideTo = null }) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch (e) { /* audio not available — demo still works visually */ }
}
const playBoom  = () => tone({ type: 'sine',     freq: 160, slideTo: 55, dur: 0.45, vol: 0.3 });
const playClick = () => tone({ type: 'triangle', freq: 660, dur: 0.09, vol: 0.16 });
const playChime = () => { tone({ freq: 660, dur: 0.16, vol: 0.14 }); setTimeout(() => tone({ freq: 880, dur: 0.22, vol: 0.14 }), 110); };

// ===== Live demo: three programmable buttons =====
(function initDemo() {
  const status = document.getElementById('ckStatus');
  const waves = document.getElementById('ckWaves');
  if (!status) return;

  let lit = false;
  const setStatus = (text, cls) => {
    status.textContent = text;
    status.className = 'ck-demo__status' + (cls ? ' ' + cls : '');
  };

  const actions = {
    lights() {
      lit = !lit;
      setStatus(lit ? 'Lights on 💡' : 'Lights off', lit ? 'is-on' : '');
      playClick();
    },
    boom() {
      setStatus('Boom! 🔊', 'is-sound');
      waves.classList.add('is-playing');
      playBoom();
      clearTimeout(waves._t);
      waves._t = setTimeout(() => waves.classList.remove('is-playing'), 850);
    },
    miss() {
      setStatus("Sent “I miss you” 💌", 'is-love');
      playChime();
    },
  };

  document.querySelectorAll('.ck-bigkey').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.add('is-pressed');
      setTimeout(() => btn.classList.remove('is-pressed'), 150);
      actions[btn.dataset.do]?.();
    });
  });
})();

// ===== Fidget mode: pure tactile clicking, no action =====
(function initFidget() {
  const clicker = document.getElementById('ckClicker');
  const count = document.getElementById('ckCount');
  if (!clicker) return;

  let n = 0;
  const press = () => {
    clicker.classList.add('is-down');
    count.textContent = ++n;
    playClick(); // just the satisfying click — does nothing else
  };
  const release = () => clicker.classList.remove('is-down');

  clicker.addEventListener('pointerdown', press);
  clicker.addEventListener('pointerup', release);
  clicker.addEventListener('pointerleave', release);

  // keyboard support (space / enter)
  clicker.addEventListener('keydown', e => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); }
  });
  clicker.addEventListener('keyup', e => {
    if (e.key === ' ' || e.key === 'Enter') release();
  });
})();

// ===== FAQ: one open at a time =====
const faqItems = document.querySelectorAll('#ckFaq .ck-faq__item');
faqItems.forEach(item => {
  item.addEventListener('toggle', () => {
    if (item.open) faqItems.forEach(o => { if (o !== item) o.open = false; });
  });
});

// ===== Reveal on scroll =====
const revealEls = document.querySelectorAll('.ck-reveal');
const revealer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); revealer.unobserve(e.target); }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => revealer.observe(el));

// ===== For couples: each button sends a message to the phone =====
(function initCouples() {
  const notifs = document.getElementById('ckPhoneNotifs');
  if (!notifs) return;
  const hint = document.getElementById('ckPhoneHint');

  document.querySelectorAll('.ck-couples__btn').forEach(btn => {
    // svg keys aren't native buttons — support enter/space too
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.dispatchEvent(new Event('click')); }
    });
    btn.addEventListener('click', () => {
      btn.classList.add('is-pressed');
      setTimeout(() => btn.classList.remove('is-pressed'), 150);
      if (hint) hint.remove();

      // build a lock-screen notification
      const n = document.createElement('div');
      n.className = 'ck-notif';
      n.innerHTML = '<span class="ck-notif__app">❤️</span>' +
        '<div class="ck-notif__body"><div class="ck-notif__row"><strong>Stamp</strong><span>now</span></div><p></p></div>';
      n.querySelector('p').textContent = btn.dataset.msg;   // textContent = no injection
      notifs.prepend(n);
      requestAnimationFrame(() => n.classList.add('is-in'));
      playChime();

      // keep only the latest few
      notifs.querySelectorAll('.ck-notif').forEach((el, i) => { if (i >= 4) el.remove(); });
    });
  });
})();

// ===== Sticky nav background on scroll =====
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 12);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// ===== Mobile menu =====
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav__links');
navToggle?.addEventListener('click', () => navLinks.classList.toggle('is-open'));
navLinks?.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => navLinks.classList.remove('is-open'))
);

// ===== Hero rotator + chips =====
const phrases = [
  'turn the lights on in your bedroom',
  'let your partner know you miss them',
  'queue your focus playlist',
  'start the kettle from your desk',
  'capture the moment, hands-free',
  'lock the front door',
];
const rotator = document.getElementById('rotator');
const chips = [...document.querySelectorAll('.hero__chips .chip')];
let rIdx = 0;
function cycle() {
  rIdx = (rIdx + 1) % phrases.length;
  rotator.classList.add('is-out');
  setTimeout(() => {
    rotator.textContent = phrases[rIdx];
    rotator.classList.remove('is-out');
    chips.forEach((c, i) => c.classList.toggle('is-active', i === rIdx));
  }, 300);
}
let rTimer = setInterval(cycle, 2600);

// ===== Active nav link via scroll spy =====
const sections = ['home', 'products', 'accessories', 'support']
  .map(id => document.getElementById(id))
  .filter(Boolean);
const linkFor = id => document.querySelector(`.nav__link[href="#${id}"]`);
const spy = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      document.querySelectorAll('.nav__link').forEach(l => l.classList.remove('is-active'));
      linkFor(e.target.id)?.classList.add('is-active');
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(s => spy.observe(s));

// ===== Reveal on scroll =====
const revealEls = document.querySelectorAll('.duo__card, .poss, .card, .config__panel, .support, .band__title');
revealEls.forEach(el => el.classList.add('reveal'));
const revealer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); revealer.unobserve(e.target); }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => revealer.observe(el));

// ===== Live room demo (press a key → the bedroom reacts) =====
const room = document.getElementById('room');
const roomStatus = document.getElementById('roomStatus');

// each key maps to a room state class + on/off labels
const roomActions = {
  lights: { cls: 'is-lit',     on: 'Lights on',    off: 'Lights off' },
  music:  { cls: 'is-playing', on: 'Music playing', off: 'Music stopped' },
  lock:   { cls: 'is-locked',  on: 'Door locked',  off: 'Door unlocked' },
};

function refreshRoomStatus() {
  if (!room || !roomStatus) return;
  const active = Object.values(roomActions).filter(a => room.classList.contains(a.cls));
  if (active.length === 0) {
    roomStatus.textContent = 'All quiet';
    roomStatus.style.color = 'var(--muted)';
  } else {
    roomStatus.textContent = active.map(a => a.on).join(' · ');
    roomStatus.style.color = 'var(--green)';
  }
}

document.querySelectorAll('.keycap').forEach(cap => {
  cap.addEventListener('click', () => {
    const action = roomActions[cap.dataset.action];
    if (!action || !room) return;
    // tactile press feedback
    cap.classList.add('is-pressed');
    setTimeout(() => cap.classList.remove('is-pressed'), 160);
    // toggle the device and keep the key lit while it's on
    const on = room.classList.toggle(action.cls);
    cap.classList.toggle('is-active', on);
    refreshRoomStatus();
  });
});

// ===== Letter box live demo (send images between two desks) =====
(function initLetterbox() {
  const section = document.querySelector('.letterbox');
  if (!section) return;

  const screens = {
    boy: section.querySelector('[data-screen="boy"]'),
    girl: section.querySelector('[data-screen="girl"]'),
  };

  // drop the received image on the target screen + flash "New letter!"
  function deliver(screen, emoji) {
    const img = screen.querySelector('.lb__screen-img');
    img.textContent = emoji;
    screen.classList.remove('has-letter');
    void screen.offsetWidth; // restart the pop animation
    screen.classList.add('has-letter');
  }

  // animate the emoji flying from the button across to the other desk
  function fly(btn, screen, emoji) {
    const sRect = section.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    const tRect = screen.getBoundingClientRect();
    const startX = bRect.left - sRect.left + bRect.width / 2;
    const startY = bRect.top - sRect.top + bRect.height / 2;
    const dx = (tRect.left - sRect.left + tRect.width / 2) - startX;
    const dy = (tRect.top - sRect.top + tRect.height / 2) - startY;

    const note = document.createElement('div');
    note.className = 'lb__fly';
    note.textContent = emoji;
    note.style.left = startX + 'px';
    note.style.top = startY + 'px';
    section.appendChild(note);

    requestAnimationFrame(() => {
      note.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.55)`;
      note.style.opacity = '0.2';
    });
    setTimeout(() => { note.remove(); deliver(screen, emoji); }, 720);
  }

  section.querySelectorAll('.lb__tray').forEach(tray => {
    const to = tray.dataset.from === 'boy' ? 'girl' : 'boy';
    tray.querySelectorAll('.lb__img').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.add('is-pressed');
        setTimeout(() => btn.classList.remove('is-pressed'), 160);
        fly(btn, screens[to], btn.textContent.trim());
      });
    });
  });
})();

// ===== Cart counter (demo) =====
let cartCount = 2;
const countEl = document.querySelector('.cart__count');
document.querySelectorAll('.btn--card').forEach(btn => {
  btn.addEventListener('click', () => {
    cartCount++;
    countEl.textContent = cartCount;
    const original = btn.innerHTML;
    btn.innerHTML = 'Added ✓';
    btn.style.background = 'var(--green)';
    btn.style.color = '#06160d';
    btn.style.borderColor = 'var(--green)';
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 1300);
  });
});

// pause rotator when tab hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearInterval(rTimer);
  else rTimer = setInterval(cycle, 2600);
});

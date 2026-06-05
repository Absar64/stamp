// ===== Aero — shared interactions for every sister-site page =====

// swap in all [data-aero] svgs from the asset map first
AeroAssets.hydrate();

// sticky nav shadow
const aeroNav = document.getElementById('nav');
if (aeroNav) {
  const onScroll = () => aeroNav.classList.toggle('is-stuck', window.scrollY > 10);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// mobile menu
const aeroToggle = document.getElementById('navToggle');
aeroToggle?.addEventListener('click', () => {
  document.querySelector('.nav__links')?.classList.toggle('is-open');
});

// ===== floating sky: clouds + glassy bubbles =====
(function buildSky() {
  const sky = document.getElementById('aeroSky');
  if (!sky) return;

  // foreground layer: bubbles that float in front of page content
  const skyFg = document.createElement('div');
  skyFg.className = 'aero-sky--fg';
  document.body.appendChild(skyFg);

  // drifting clouds at variable speeds + heights
  const clouds = [
    { top: '8%',  w: 200, dur: 60, delay: -8,  op: .95 },
    { top: '18%', w: 160, dur: 78, delay: -18, op: .65 },
    { top: '34%', w: 240, dur: 72, delay: -52, op: .85 },
    { top: '56%', w: 130, dur: 96, delay: -12, op: .6  },
    { top: '72%', w: 180, dur: 66, delay: -44, op: .75 },
    { top: '88%', w: 110, dur: 88, delay: -34, op: .5  },
  ];
  clouds.forEach(c => {
    const el = document.createElement('div');
    el.className = 'aero-cloud';
    el.style.cssText = `top:${c.top};width:${c.w}px;opacity:${c.op};animation:aeroDrift ${c.dur}s linear ${c.delay}s infinite`;
    el.innerHTML = AeroAssets.get('cloud');
    sky.appendChild(el);
  });

  // rising bubbles — wobble on hover, burst into sparkles on click
  const tints = ['var(--sky)', 'var(--lime)', 'var(--peach)', 'var(--pink)'];

  // fg:true = floats in front of content (skyFg container, z-index:6)
  // slow, lazy drift — long durations so they hang in the air
  const spawnBubble = (fg = false) => {
    const b = document.createElement('div');
    const size = (fg ? 18 : 26) + Math.random() * (fg ? 34 : 52);
    b.className = 'aero-bubble is-sky';
    b.style.cssText = `left:${Math.random() * 96}vw;width:${size}px;height:${size}px;` +
      `--t:${(fg ? 16 : 20) + Math.random() * 14}s;--drift:${(Math.random() * 6 - 3).toFixed(1)}vw;` +
      `color:${tints[(Math.random() * tints.length) | 0]}`;
    b.innerHTML = AeroAssets.get('bubble');
    b.addEventListener('click', e => popBubble(b, e.clientX, e.clientY));
    b.addEventListener('animationend', ev => { if (ev.animationName === 'aeroFloat') b.remove(); });
    (fg ? skyFg : sky).appendChild(b);
  };

  // seed a full sky: 30 background + 14 foreground
  for (let i = 0; i < 30; i++) setTimeout(() => spawnBubble(false), i * 280);
  for (let i = 0; i < 14; i++) setTimeout(() => spawnBubble(true),  i * 480 + 400);

  // keep a steady stream — 48 bg max, 20 fg max
  setInterval(() => {
    const all = document.querySelectorAll('.aero-bubble');
    const fgCount = skyFg.querySelectorAll('.aero-bubble').length;
    if (all.length < 48) spawnBubble(false);
    if (fgCount < 20)    spawnBubble(true);
  }, 1500);
})();

// burst a bubble into sparkles
function popBubble(bubble, x, y) {
  bubble.classList.add('is-pop');
  for (let i = 0; i < 7; i++) {
    const s = document.createElement('div');
    const ang = (Math.PI * 2 * i) / 7;
    const dist = 30 + Math.random() * 40;
    s.className = 'aero-spark';
    s.style.cssText = `left:${x}px;top:${y}px;color:${['var(--peach)','var(--pink)','var(--sky)','var(--lime)'][i % 4]};` +
      `--sx:${Math.cos(ang) * dist}px;--sy:${Math.sin(ang) * dist}px;animation:aeroSpark .6s var(--ease) forwards`;
    s.innerHTML = AeroAssets.get('sparkle');
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }
  setTimeout(() => bubble.remove(), 320);
}

// ===== hero chips: just a friendly active state =====
document.querySelectorAll('.aero-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.aero-chip').forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
  });
});

// ===== atmosphere demo: switch the liminal scene's mood =====
(function initMoods() {
  const scene = document.getElementById('aeroScene');
  if (!scene) return;
  const status = document.getElementById('aeroSceneStatus');
  const labels = {
    day:   'Clear, sunlit afternoon ☀️',
    dusk:  'Golden hour, soft and warm 🌇',
    rain:  'Quiet rain on the hills 🌧️',
    night: 'Still, dreaming, a little eerie 🌙',
  };
  document.querySelectorAll('.aero-mood').forEach(btn => {
    btn.addEventListener('click', () => {
      const mood = btn.dataset.mood;
      scene.dataset.mood = mood;
      if (status) status.textContent = labels[mood] || '';
      document.querySelectorAll('.aero-mood').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });
})();

// ===== product page: finish swatches recolour the framed art =====
(function initSwatches() {
  const frame = document.getElementById('aeroFrame');
  const finishName = document.getElementById('aeroFinishName');
  document.querySelectorAll('#aeroFinish .aero-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('#aeroFinish .aero-swatch').forEach(s => s.classList.remove('is-active'));
      sw.classList.add('is-active');
      if (frame) frame.style.background = getComputedStyle(sw).getPropertyValue('--s').trim();
      if (finishName) finishName.textContent = sw.dataset.name;
    });
  });
})();

// ===== product page: pack picker updates price =====
(function initPacks() {
  const priceEl = document.getElementById('aeroPrice');
  const saveEl = document.getElementById('aeroSave');
  document.querySelectorAll('#aeroPack .aero-pack').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('#aeroPack .aero-pack').forEach(x => x.classList.remove('is-active'));
      p.classList.add('is-active');
      if (priceEl) priceEl.textContent = '$' + p.dataset.price;
      if (saveEl && p.dataset.save) saveEl.textContent = p.dataset.save;
    });
  });
})();

// ===== FAQ: one open at a time =====
const aeroFaq = document.querySelectorAll('.aero-faq__item');
aeroFaq.forEach(item => {
  item.addEventListener('toggle', () => {
    if (item.open) aeroFaq.forEach(o => { if (o !== item) o.open = false; });
  });
});

// ===== reveal on scroll =====
const aeroReveal = document.querySelectorAll('.aero-reveal');
if (aeroReveal.length) {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  aeroReveal.forEach(el => obs.observe(el));
}

// currency + live pricing are handled globally in store.js

// ===== success page: friendly, non-identifying order ref =====
(function orderRef() {
  const el = document.getElementById('aeroOkRef');
  if (!el) return;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let ref = '';
  for (let i = 0; i < 6; i++) ref += chars[(Math.random() * chars.length) | 0];
  el.textContent = 'STAMP-' + ref;
})();

// ===== music player (bottom-left) =====
(function initMusicPlayer() {
  const player = document.createElement('div');
  player.id = 'aeroPlayer';
  player.className = 'aero-player glass is-paused';
  player.innerHTML =
    `<audio id="aeroAudio" src="assets/aero/song1.mp3" loop preload="none"></audio>` +
    `<button class="aero-player__btn" id="aeroPlayBtn" aria-label="Play music">` +
      `<svg id="aeroPlayIco" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>` +
      `<svg id="aeroPauseIco" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>` +
    `</button>` +
    `<span class="aero-player__label">Now drifting</span>` +
    `<div class="aero-player__bars" aria-hidden="true"><span></span><span></span><span></span></div>`;
  document.body.appendChild(player);

  const audio   = document.getElementById('aeroAudio');
  const btn     = document.getElementById('aeroPlayBtn');
  const playIco = document.getElementById('aeroPlayIco');
  const pauseIco= document.getElementById('aeroPauseIco');

  // reflect playing/paused state in the ui
  const paint = () => {
    const playing = !audio.paused;
    playIco.style.display  = playing ? 'none'  : 'block';
    pauseIco.style.display = playing ? 'block' : 'none';
    btn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    player.classList.toggle('is-paused', !playing);
  };
  audio.addEventListener('play',  paint);
  audio.addEventListener('pause', paint);

  btn.addEventListener('click', () => { audio.paused ? audio.play() : audio.pause(); });

  // ===== autostart =====
  // browsers block autoplay-with-sound until the user interacts. try anyway;
  // if blocked, kick it off on the very first gesture anywhere on the page.
  const tryStart = () => audio.play().catch(() => {});
  audio.volume = 0.6;
  tryStart();
  const firstGesture = () => {
    tryStart();
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
      window.removeEventListener(ev, firstGesture));
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    window.addEventListener(ev, firstGesture, { once: false, passive: true }));
})();

// ===== Canvas product page =====

// sticky nav background on scroll
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 12);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// mobile menu
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav__links');
navToggle?.addEventListener('click', () => navLinks.classList.toggle('is-open'));

// trigger entrance animations once the page is up
requestAnimationFrame(() => document.body.classList.add('is-ready'));

// ===== Hero screen: cycle through a few moments =====
const screenImg = document.getElementById('cvScreenImg');
const heroMoments = ['❤️', '📸', '🌙', '🎨', '😘', '⭐'];
let hIdx = 0;
setInterval(() => {
  hIdx = (hIdx + 1) % heroMoments.length;
  if (screenImg) screenImg.textContent = heroMoments[hIdx];
}, 2400);

// ===== Finish swatches: recolour the device =====
const device = document.getElementById('cvDevice');
const finishName = document.getElementById('cvFinishName');
const captionFinish = document.getElementById('cvCaptionFinish');
document.querySelectorAll('#cvFinish .cv-swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    document.querySelectorAll('#cvFinish .cv-swatch').forEach(s => s.classList.remove('is-active'));
    sw.classList.add('is-active');
    // the swatch background is the finish; its data-accent drives the glow
    const finish = getComputedStyle(sw).getPropertyValue('--s').trim();
    device.style.setProperty('--finish', finish);
    device.style.setProperty('--accent', sw.dataset.accent);
    if (finishName) finishName.textContent = sw.dataset.name;
    if (captionFinish) captionFinish.textContent = sw.dataset.name;
  });
});

// ===== Pack picker: update the headline price =====
const priceEl = document.getElementById('cvPrice');
const saveEl = document.getElementById('cvSave');
document.querySelectorAll('#cvPack .cv-pack').forEach(p => {
  p.addEventListener('click', () => {
    document.querySelectorAll('#cvPack .cv-pack').forEach(x => x.classList.remove('is-active'));
    p.classList.add('is-active');
    priceEl.textContent = '£' + p.dataset.price;
    saveEl.textContent = p.dataset.save;
  });
});

// ===== Live demo: pick a friend + a moment, watch it land =====
(function initDemo() {
  const screen = document.getElementById('cvDemoScreen');
  const img = document.getElementById('cvDemoImg');
  const notif = document.getElementById('cvDemoNotif');
  const toLabel = document.getElementById('cvDemoTo');
  if (!screen) return;

  let friend = 'Mia';
  document.querySelectorAll('#cvFriends .cv-friend:not(.cv-friend--add)').forEach(f => {
    f.addEventListener('click', () => {
      document.querySelectorAll('#cvFriends .cv-friend').forEach(x => x.classList.remove('is-active'));
      f.classList.add('is-active');
      friend = f.dataset.name;
    });
  });

  document.querySelectorAll('#cvMoments .cv-moment').forEach(btn => {
    btn.addEventListener('click', () => {
      // press feedback
      btn.classList.add('is-pressed');
      setTimeout(() => btn.classList.remove('is-pressed'), 150);
      // deliver: restart the pop, set the image, flash the notif
      img.textContent = btn.textContent.trim();
      screen.classList.remove('has-letter');
      void screen.offsetWidth;
      screen.classList.add('has-letter');
      notif.textContent = 'From you · now';
      toLabel.innerHTML = 'Delivered to <strong>' + friend + '</strong> ✓';
    });
  });
})();

// ===== FAQ: keep it tidy (only one open at a time) =====
const faqItems = document.querySelectorAll('#cvFaq .cv-faq__item');
faqItems.forEach(item => {
  item.addEventListener('toggle', () => {
    if (item.open) faqItems.forEach(o => { if (o !== item) o.open = false; });
  });
});

// ===== Reveal on scroll =====
const revealEls = document.querySelectorAll('.cv-reveal');
const revealer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); revealer.unobserve(e.target); }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => revealer.observe(el));

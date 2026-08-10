// ===== Stamp store: live product data (Firestore) + currency + Google sign-in =====
// product pricing, discount, claimed and sold counts live in your Firestore
// `products` collection (one doc per product). currency conversion runs across
// every page and the visitor's currency is auto-detected on first visit.
// Google sign-in adds a nav button; each signed-in email is written to the
// `accounts` collection (doc id = user uid). sessions persist, so returning
// customers stay signed in.
//
// Firestore shape — collection `products`, doc id = clicker | canvas | level94 | omori:
//   price     (number) regular price in USD            e.g. 109
//   discount  (number) amount off in USD               e.g. 20   → headline = price - discount
//   claimed   (number) units claimed                   e.g. 125
//   goal      (number) target (denominator of claimed) e.g. 1000
//   sold      (number) units sold                       e.g. 40
//   stock     (boolean) true = buyable · false = out of stock (hides the buy button)
//   delivery  (string)  production delivery estimate, e.g. "Early August"

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, getDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// ---- supported currencies ----
const RATES = { USD:1, GBP:.79, EUR:.92, AUD:1.52, CAD:1.37 };
const SYMS  = { USD:'$', GBP:'£', EUR:'€', AUD:'A$', CAD:'C$' };
const SELECTORS = '#currencySelect, .currency-select, .aero-currency';

// rough country → currency map (estimate only, not exhaustive)
const EURO = ['AT','BE','HR','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','NL','PT','SK','SI','ES'];
function curForCountry(cc) {
  if (!cc) return null;
  cc = cc.toUpperCase();
  if (cc === 'US') return 'USD';
  if (cc === 'GB') return 'GBP';
  if (cc === 'AU') return 'AUD';
  if (cc === 'CA') return 'CAD';
  if (EURO.includes(cc)) return 'EUR';
  return null;
}

let cur = 'USD';
const products = {};   // id -> { price, discount, claimed, goal, sold }
const num = el => { const n = parseFloat((el.textContent.match(/[\d.]+/) || ['0'])[0]); return isNaN(n) ? 0 : n; };

// ---- auth/db refs (set once Firebase boots) used by buy-gates, popups, profile ----
let currentUser = null;
let dbRef = null, authRef = null, providerRef = null;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

// ---- seed values from the page so prices/currency work before Firestore answers ----
function seedFromDom() {
  const get = id => (products[id] = products[id] || {});
  document.querySelectorAll('[data-was]').forEach(el => { const p = get(el.dataset.was); if (p.price == null) p.price = num(el); });
  document.querySelectorAll('[data-save]').forEach(el => { const p = get(el.dataset.save); if (p.discount == null) p.discount = num(el); });
  document.querySelectorAll('[data-price]').forEach(el => { const p = get(el.dataset.price); if (p._sale == null) p._sale = num(el); });
  document.querySelectorAll('[data-claimed]').forEach(el => { const p = get(el.dataset.claimed); if (p.claimed == null) p.claimed = num(el); });
  document.querySelectorAll('[data-goal]').forEach(el => { const p = get(el.dataset.goal); if (p.goal == null) p.goal = num(el); });
  document.querySelectorAll('[data-sold]').forEach(el => { const p = get(el.dataset.sold); if (p.sold == null) p.sold = num(el); });
  // when only the headline price is on the page (catalog cards), derive the rest
  Object.values(products).forEach(p => {
    if (p.discount == null) p.discount = 0;
    if (p.price == null) p.price = (p._sale || 0) + p.discount;
  });
}

// ---- paint every bound element in the active currency ----
const money = usd => SYMS[cur] + Math.round((usd || 0) * RATES[cur]);

function render() {
  document.querySelectorAll(SELECTORS).forEach(s => { s.value = cur; });

  document.querySelectorAll('[data-price]').forEach(el => {
    const p = products[el.dataset.price]; if (!p) return;
    el.textContent = money((p.price || 0) - (p.discount || 0));
  });
  document.querySelectorAll('[data-was]').forEach(el => {
    const p = products[el.dataset.was]; if (!p) return;
    el.textContent = money(p.price);
  });
  document.querySelectorAll('[data-save]').forEach(el => {
    const p = products[el.dataset.save]; if (!p) return;
    el.textContent = 'Save ' + money(p.discount);
  });
  // counts are plain numbers, not money
  document.querySelectorAll('[data-claimed]').forEach(el => { const p = products[el.dataset.claimed]; if (p && p.claimed != null) el.textContent = p.claimed; });
  document.querySelectorAll('[data-goal]').forEach(el => { const p = products[el.dataset.goal]; if (p && p.goal != null) el.textContent = p.goal; });
  document.querySelectorAll('[data-sold]').forEach(el => { const p = products[el.dataset.sold]; if (p && p.sold != null) el.textContent = p.sold; });
  // production delivery estimate (free text)
  document.querySelectorAll('[data-delivery]').forEach(el => { const p = products[el.dataset.delivery]; if (p && p.delivery) el.textContent = p.delivery; });

  // stock + login gating:
  //  · the real order block (the one holding the <stripe-buy-button>) shows only
  //    when in stock AND the customer is signed in — checkout requires an account
  //  · when in stock but signed out, the "sign in to order" gate shows instead
  //  · out of stock always shows the sold-out state
  const loggedIn = !!currentUser;
  Object.keys(products).forEach(id => {
    const inStock = products[id].stock !== false;   // default in-stock unless explicitly false
    document.querySelectorAll('[data-buy="' + id + '"]').forEach(el => {
      const isOrder = !!el.querySelector('stripe-buy-button');   // the actual checkout block
      el.style.display = isOrder ? ((inStock && loggedIn) ? '' : 'none') : (inStock ? '' : 'none');
    });
    document.querySelectorAll('[data-loginbuy="' + id + '"]').forEach(el => { el.style.display = (inStock && !loggedIn) ? '' : 'none'; });
    document.querySelectorAll('[data-soldout="' + id + '"]').forEach(el => { el.style.display = inStock ? 'none' : ''; });
    document.querySelectorAll('[data-stockbadge="' + id + '"]').forEach(el => { el.style.display = inStock ? 'none' : ''; });
  });
}

// ---- one global currency-select handler (works on every page) ----
document.addEventListener('change', e => {
  if (e.target.matches(SELECTORS)) {
    cur = e.target.value;
    localStorage.setItem('stampCur', cur);
    render();
  }
});

// ---- buy CTA anchors: signed-out shoppers are sent to sign-in first ----
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[data-buy]');
  if (a && !currentUser) { e.preventDefault(); doSignIn(); }
});

// ---- starting currency: saved choice → geo estimate → USD ----
async function pickCurrency() {
  const saved = localStorage.getItem('stampCur');
  if (saved && RATES[saved]) return saved;
  try {
    const d = await fetch('https://ipwho.is/').then(r => r.json());
    const c = curForCountry(d && d.country_code);
    if (c) return c;
  } catch (e) { /* offline or blocked — fall through */ }
  try {
    const c = curForCountry(navigator.language.split('-')[1] || '');
    if (c) return c;
  } catch (e) {}
  return 'USD';
}

// ---- live product data (Firestore) + Google sign-in ----
function startFirebase() {
  let app;
  try { app = initializeApp(firebaseConfig); }
  catch (e) { console.warn('[stamp] add your Firebase config in firebase-config.js'); return; }
  const db = getFirestore(app);
  dbRef = db;

  const toNum = v => (v === '' || v == null || isNaN(v)) ? undefined : Number(v);
  onSnapshot(collection(db, 'products'),
    snap => {
      snap.forEach(docSnap => {
        const d = docSnap.data(), clean = {};
        // accept numbers stored as strings too; ignore blanks
        ['price', 'discount', 'claimed', 'goal', 'sold'].forEach(k => {
          const n = toNum(d[k]); if (n !== undefined) clean[k] = n;
        });
        // stock is a boolean (also accept the strings "true"/"false")
        if (d.stock !== undefined) clean.stock = (d.stock === true || d.stock === 'true');
        // delivery is a free-text string
        if (typeof d.delivery === 'string' && d.delivery.trim()) clean.delivery = d.delivery.trim();
        products[docSnap.id] = { ...products[docSnap.id], ...clean };
      });
      render();
    },
    err => console.warn('[stamp] Firestore not connected:', err.message)
  );

  initAuth(app, db);
}

// multicolour Google "G" used by the nav button and the buy-gate
function googleSvg() {
  return '<svg viewBox="0 0 48 48" aria-hidden="true">' +
    '<path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>' +
    '<path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>' +
    '<path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>' +
    '<path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>' +
  '</svg>';
}

// trigger the Google popup; on a fresh sign-in show the newsletter opt-in
function doSignIn() {
  if (!authRef || !providerRef) return;
  signInWithPopup(authRef, providerRef)
    .then(res => { if (res && res.user) showNewsletterModal(res.user); })
    .catch(e => console.warn('[stamp] sign-in:', e.code || e.message));
}

// ---- Google sign-in / profile control in the nav + record the account ----
function initAuth(app, db) {
  authRef = getAuth(app);
  providerRef = new GoogleAuthProvider();
  injectAuthStyles();
  setupLoginGates();
  render();   // paint the sign-in-to-order gate straight away (signed out by default)

  const actions = document.querySelector('.nav__actions');
  if (actions) {
    const wrap = document.createElement('div');
    wrap.className = 'auth';
    wrap.innerHTML =
      '<button class="auth__login" type="button" aria-label="Sign in with Google">' +
        googleSvg() + '<span>Sign in</span>' +
      '</button>' +
      '<button class="auth__user" type="button" aria-label="Your profile" ' +
        'style="display:none;align-items:center;gap:8px;background:transparent;border:0;cursor:pointer;font:inherit;color:inherit;padding:0">' +
        '<img class="auth__avatar" alt="" referrerpolicy="no-referrer" />' +
        '<span class="auth__name" style="font-weight:600">Profile</span>' +
      '</button>';
    actions.insertBefore(wrap, actions.querySelector('.nav__toggle'));
    wrap.querySelector('.auth__login').addEventListener('click', doSignIn);
    wrap.querySelector('.auth__user').addEventListener('click', openProfile);
  }

  // session persists by default, so returning customers stay signed in
  onAuthStateChanged(authRef, user => {
    currentUser = user || null;
    const on = !!user;
    document.querySelectorAll('.auth__login').forEach(b => { b.style.display = on ? 'none' : ''; });
    document.querySelectorAll('.auth__user').forEach(b => { b.style.display = on ? 'inline-flex' : 'none'; });
    if (on) {
      document.querySelectorAll('.auth__avatar').forEach(av => {
        if (user.photoURL) { av.src = user.photoURL; av.style.display = ''; }
        else av.style.display = 'none';
      });
      document.querySelectorAll('.auth__name').forEach(n => {
        n.textContent = user.displayName ? user.displayName.split(' ')[0] : 'Profile';
      });
      saveAccount(db, user);
    }
    render();   // refresh the buy / sign-in-to-order gates
  });
}

// inject a sign-in gate next to every real checkout block (the one with the
// stripe button). it shows only while signed out — see render() for toggling.
function setupLoginGates() {
  document.querySelectorAll('[data-buy]').forEach(wrap => {
    if (!wrap.querySelector('stripe-buy-button')) return;   // skip badges/links
    if (wrap.dataset.gated) return;
    wrap.dataset.gated = '1';
    const id = wrap.dataset.buy;
    const gate = document.createElement('div');
    gate.className = 'buy-gate';
    gate.setAttribute('data-loginbuy', id);
    gate.style.display = 'none';
    gate.innerHTML =
      '<button class="buy-gate__btn" type="button">' + googleSvg() + '<span>Sign in with Google to order</span></button>' +
      '<p class="buy-gate__note">Pre-orders need an account so we can keep you posted on your order.</p>';
    wrap.parentNode.insertBefore(gate, wrap.nextSibling);
    gate.querySelector('.buy-gate__btn').addEventListener('click', doSignIn);
  });
}

// ---- newsletter opt-in popup shown right after a fresh sign-in ----
function showNewsletterModal(user) {
  closeOverlay();
  let warned = false;
  const ov = document.createElement('div');
  ov.className = 'np-overlay';
  ov.innerHTML =
    '<div class="np-card" role="dialog" aria-modal="true" aria-labelledby="npTitle">' +
      '<h3 id="npTitle" class="np-card__title">You’re in 🎉</h3>' +
      '<p class="np-card__msg">Stay in the loop with new drops and members-only offers.</p>' +
      '<label class="np-check"><input type="checkbox" class="np-check__box" />' +
        '<span>I would like to receive newsletters and exclusive offers via email.</span></label>' +
      '<button class="np-card__done" type="button">Done</button>' +
    '</div>';
  document.body.appendChild(ov);
  const card = ov.querySelector('.np-card');
  const box  = ov.querySelector('.np-check__box');
  const msg  = ov.querySelector('.np-card__msg');
  ov.querySelector('.np-card__done').addEventListener('click', () => {
    if (box.checked) { saveOptin(user, true); ov.remove(); return; }
    if (!warned) {
      // first refusal: nudge with a shake, don't close yet
      warned = true;
      msg.textContent = 'Are you sure you dont want email updates?';
      card.classList.remove('np-shake'); void card.offsetWidth; card.classList.add('np-shake');
      return;
    }
    // refused again — opt out and close
    saveOptin(user, false);
    ov.remove();
  });
}

// ---- profile panel: name, email, and a live newsletter opt in/out ----
function openProfile() {
  if (!currentUser) return;
  const user = currentUser;
  closeOverlay();
  const ov = document.createElement('div');
  ov.className = 'np-overlay';
  ov.innerHTML =
    '<div class="np-card pf-card" role="dialog" aria-modal="true">' +
      '<button class="pf-close" type="button" aria-label="Close">×</button>' +
      '<div class="pf-head">' +
        (user.photoURL ? '<img class="pf-avatar" referrerpolicy="no-referrer" src="' + esc(user.photoURL) + '" alt="" />' : '') +
        '<div><div class="pf-name">' + esc(user.displayName || 'Your account') + '</div>' +
        '<div class="pf-email">' + esc(user.email || '') + '</div></div>' +
      '</div>' +
      '<label class="np-check pf-check"><input type="checkbox" class="pf-optin" />' +
        '<span>Receive newsletters and exclusive offers via email.</span></label>' +
      '<button class="pf-signout" type="button">Sign out</button>' +
    '</div>';
  document.body.appendChild(ov);
  const optinBox = ov.querySelector('.pf-optin');
  // reflect the saved preference
  if (dbRef) getDoc(doc(dbRef, 'accounts', user.uid))
    .then(s => { optinBox.checked = !!(s.exists() && s.data().optin === true); })
    .catch(() => {});
  optinBox.addEventListener('change', () => saveOptin(user, optinBox.checked));
  ov.querySelector('.pf-close').addEventListener('click', () => ov.remove());
  ov.querySelector('.pf-signout').addEventListener('click', () => { ov.remove(); signOut(authRef); });
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
}

function closeOverlay() { document.querySelectorAll('.np-overlay').forEach(o => o.remove()); }

// write the newsletter choice onto the account doc
function saveOptin(user, value) {
  if (!user || !dbRef) return;
  setDoc(doc(dbRef, 'accounts', user.uid), { optin: !!value }, { merge: true })
    .catch(e => console.warn('[stamp] optin:', e.code || e.message));
}

// styles for the buy-gate, newsletter popup and profile panel (injected once
// so both the dark and light themes get an identical, self-contained look)
function injectAuthStyles() {
  if (document.getElementById('stampAuthCss')) return;
  const css =
    '.np-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,10,18,.55);backdrop-filter:blur(4px)}' +
    '.np-card{position:relative;width:100%;max-width:380px;background:#fff;color:#16181d;border-radius:18px;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,.4);font-family:inherit}' +
    '.np-card__title{margin:0 0 6px;font-size:1.25rem;font-weight:800}' +
    '.np-card__msg{margin:0 0 16px;font-size:.95rem;color:#5a6172;line-height:1.4}' +
    '.np-check{display:flex;gap:10px;align-items:flex-start;font-size:.9rem;line-height:1.35;cursor:pointer;margin-bottom:20px;color:#16181d}' +
    '.np-check__box,.pf-optin{margin-top:1px;width:18px;height:18px;flex:0 0 auto;accent-color:#6a5cff;cursor:pointer}' +
    '.np-card__done{width:100%;border:0;border-radius:12px;padding:12px;font-weight:700;font-size:1rem;color:#fff;cursor:pointer;background:linear-gradient(135deg,#7c5cff,#3aa0ff)}' +
    '.np-card__done:hover{filter:brightness(1.05)}' +
    '@keyframes npShake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-8px)}40%,60%{transform:translateX(8px)}}' +
    '.np-shake{animation:npShake .5s}' +
    '.buy-gate{margin:0}' +
    '.buy-gate__btn{display:inline-flex;align-items:center;gap:10px;border:0;border-radius:12px;padding:13px 20px;font-weight:700;font-size:1rem;color:#fff;cursor:pointer;background:linear-gradient(135deg,#7c5cff,#3aa0ff);box-shadow:0 10px 24px rgba(70,90,255,.28)}' +
    '.buy-gate__btn:hover{filter:brightness(1.05)}' +
    '.buy-gate__btn svg{width:20px;height:20px;background:#fff;border-radius:4px;padding:2px;box-sizing:border-box}' +
    '.buy-gate__note{margin:10px 0 0;font-size:.82rem;opacity:.7}' +
    '.pf-card{max-width:360px}' +
    '.pf-close{position:absolute;top:10px;right:14px;border:0;background:transparent;font-size:1.6rem;line-height:1;cursor:pointer;color:#9aa0ad}' +
    '.pf-head{display:flex;gap:14px;align-items:center;margin-bottom:18px}' +
    '.pf-avatar{width:54px;height:54px;border-radius:50%;flex:0 0 auto}' +
    '.pf-name{font-weight:800;font-size:1.1rem}' +
    '.pf-email{font-size:.88rem;color:#5a6172;word-break:break-all}' +
    '.pf-signout{margin-top:18px;width:100%;border:1px solid #e2e4ea;background:#f6f7f9;color:#16181d;border-radius:12px;padding:11px;font-weight:700;cursor:pointer}' +
    '.pf-signout:hover{background:#eceef3}';
  const tag = document.createElement('style');
  tag.id = 'stampAuthCss';
  tag.textContent = css;
  document.head.appendChild(tag);
}

// store the signed-in email in the `accounts` collection (one doc per user)
function saveAccount(db, user) {
  if (!user || !user.email) return;
  setDoc(doc(db, 'accounts', user.uid), {
    email: user.email,
    name: user.displayName || '',
    lastLogin: serverTimestamp()
  }, { merge: true }).catch(e => console.warn('[stamp] account save:', e.code || e.message));
}

// ---- boot ----
seedFromDom();
render();                                          // immediate paint from page data
pickCurrency().then(c => { cur = c; render(); });  // then switch to detected currency
startFirebase();                                   // live Firestore data + Google sign-in

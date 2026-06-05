// ===== Stamp store: live product data (Firestore) + global currency =====
// product pricing, discount, claimed and sold counts live in your Firestore
// `products` collection (one doc per product). currency conversion runs across
// every page and the visitor's currency is auto-detected on first visit.
//
// Firestore shape — collection `products`, doc id = clicker | canvas | level94 | omori:
//   price     (number) regular price in USD            e.g. 109
//   discount  (number) amount off in USD               e.g. 20   → headline = price - discount
//   claimed   (number) units claimed                   e.g. 125
//   goal      (number) target (denominator of claimed) e.g. 1000
//   sold      (number) units sold                       e.g. 40

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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
}

// ---- one global currency-select handler (works on every page) ----
document.addEventListener('change', e => {
  if (e.target.matches(SELECTORS)) {
    cur = e.target.value;
    localStorage.setItem('stampCur', cur);
    render();
  }
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

// ---- live product data from Firestore ----
function startFirestore() {
  try {
    const db = getFirestore(initializeApp(firebaseConfig));
    const toNum = v => (v === '' || v == null || isNaN(v)) ? undefined : Number(v);
    onSnapshot(collection(db, 'products'),
      snap => {
        snap.forEach(doc => {
          const d = doc.data(), clean = {};
          // accept numbers stored as strings too; ignore blanks
          ['price', 'discount', 'claimed', 'goal', 'sold'].forEach(k => {
            const n = toNum(d[k]); if (n !== undefined) clean[k] = n;
          });
          products[doc.id] = { ...products[doc.id], ...clean };
        });
        render();
      },
      err => console.warn('[stamp] Firestore not connected:', err.message)
    );
  } catch (e) {
    console.warn('[stamp] add your Firebase config in firebase-config.js to enable live pricing');
  }
}

// ---- boot ----
seedFromDom();
render();                                          // immediate paint from page data
pickCurrency().then(c => { cur = c; render(); });  // then switch to detected currency
startFirestore();                                  // then go live from Firestore

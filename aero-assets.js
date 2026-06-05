// ===== Aero asset map =====
// every decorative svg lives here as a string. to swap any of them for a static
// png, set its `png` field + flip AeroAssets.usePng (or pass {png:true} to get()).
// markup is injected into any element carrying data-aero="<key>", so changing a
// path here instantly re-skins the whole site — no html edits.

const AeroAssets = {
  usePng: false,            // global switch: true = render png fallbacks everywhere
  base: 'assets/aero/',     // static asset directory for the png fallbacks

  defs: {
    // glossy brand orb
    logo: {
      png: 'logo.png',
      // same mark as the flagship store, in a purple→blue gradient
      svg: `<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="aeroLogoG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#3aa0ff"/></linearGradient></defs><rect x="5" y="5" width="22" height="22" rx="6" fill="none" stroke="url(#aeroLogoG)" stroke-width="2.5"/><circle cx="16" cy="16" r="5" fill="url(#aeroLogoG)"/></svg>`
    },

    // drifting cloud — solid fill, tint/opacity handled in css
    cloud: {
      png: 'cloud.png',
      svg: `<svg viewBox="0 0 200 100" aria-hidden="true"><g fill="currentColor"><ellipse cx="58" cy="64" rx="46" ry="29"/><ellipse cx="104" cy="50" rx="52" ry="40"/><ellipse cx="150" cy="66" rx="40" ry="27"/><rect x="38" y="60" width="134" height="33" rx="16"/></g></svg>`
    },

    // glassy water bubble — no gradients (so it can repeat without id clashes)
    bubble: {
      png: 'bubble.png',
      svg: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45" fill="rgba(255,255,255,.22)" stroke="rgba(255,255,255,.85)" stroke-width="2"/><ellipse cx="36" cy="33" rx="15" ry="9" fill="#ffffff" opacity=".9"/><circle cx="67" cy="63" r="5" fill="#ffffff" opacity=".55"/></svg>`
    },

    // burst sparkle (spawned on bubble click)
    sparkle: {
      png: 'sparkle.png',
      svg: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 0c.6 6.5 5 10.9 12 12-7 1.1-11.4 5.5-12 12-.6-6.5-5-10.9-12-12C7 10.9 11.4 6.5 12 0Z"/></svg>`
    },

    // swaying grass blades (hero base)
    grass: {
      png: 'grass.png',
      svg: `<svg viewBox="0 0 320 90" aria-hidden="true" fill="currentColor"><path d="M14 90c-3-26 2-40 8-62 2 24-1 40 6 62Z"/><path d="M40 90c-5-30 4-46 14-66-4 26 0 44-2 66Z"/><path d="M70 90c-2-22 6-38 16-54-8 22-5 38-6 54Z"/><path d="M104 90c-6-30 3-50 16-70-7 28-4 46-4 70Z"/><path d="M140 90c-3-24 4-40 12-58-3 24 0 40-2 58Z"/><path d="M176 90c-6-30 5-48 18-68-9 28-7 46-8 68Z"/><path d="M214 90c-2-22 6-38 16-54-8 22-5 38-6 54Z"/><path d="M250 90c-5-30 4-46 14-66-4 26 0 44-2 66Z"/><path d="M286 90c-3-26 2-40 8-62 2 24-1 40 6 62Z"/></svg>`
    },

    // slow rotating sun flare
    sun: {
      png: 'sun.png',
      svg: `<svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="44" fill="rgba(255,243,196,.95)"/><circle cx="110" cy="110" r="62" fill="rgba(255,238,170,.4)"/><g stroke="rgba(255,232,150,.8)" stroke-width="7" stroke-linecap="round"><line x1="110" y1="12" x2="110" y2="40"/><line x1="110" y1="180" x2="110" y2="208"/><line x1="12" y1="110" x2="40" y2="110"/><line x1="180" y1="110" x2="208" y2="110"/><line x1="40" y1="40" x2="60" y2="60"/><line x1="160" y1="160" x2="180" y2="180"/><line x1="180" y1="40" x2="160" y2="60"/><line x1="60" y1="160" x2="40" y2="180"/></g></svg>`
    },

    // flagship art piece — liminal pastel hill + cloudscape scene
    level94: {
      png: 'level94.png',
      svg: `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="l94sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#aee3ff"/><stop offset=".55" stop-color="#e8f7ff"/><stop offset="1" stop-color="#fff4e2"/></linearGradient><linearGradient id="l94a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d2f78a"/><stop offset="1" stop-color="#9fe25c"/></linearGradient><linearGradient id="l94b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#aaee6e"/><stop offset="1" stop-color="#79c94a"/></linearGradient></defs><rect width="400" height="300" fill="url(#l94sky)"/><circle cx="312" cy="78" r="32" fill="#fff2bf"/><circle cx="312" cy="78" r="48" fill="#fff2bf" opacity=".4"/><g fill="#ffffff" opacity=".9"><ellipse cx="92" cy="78" rx="34" ry="16"/><ellipse cx="120" cy="68" rx="30" ry="18"/><ellipse cx="150" cy="80" rx="26" ry="14"/></g><g fill="#ffffff" opacity=".7"><ellipse cx="250" cy="128" rx="28" ry="12"/><ellipse cx="276" cy="120" rx="24" ry="14"/></g><path d="M0 206 Q120 150 244 198 T400 188 V300 H0Z" fill="url(#l94b)"/><path d="M0 250 Q150 192 300 240 T400 236 V300 H0Z" fill="url(#l94a)"/></svg>`
    },

    // flagship accessory — dreamy resin keyring charm with a faint, eerie face
    omori: {
      png: 'omori.png',
      svg: `<svg viewBox="0 0 200 240" aria-hidden="true"><defs><radialGradient id="omG" cx="40%" cy="28%" r="85%"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#ffc4e3"/><stop offset="1" stop-color="#b48cff"/></radialGradient></defs><circle cx="100" cy="26" r="15" fill="none" stroke="#c4d6e6" stroke-width="6"/><circle cx="100" cy="26" r="15" fill="none" stroke="#eef5fb" stroke-width="2"/><path d="M100 44c50 0 78 48 70 96-8 56-40 84-70 84s-62-28-70-84c-8-48 20-96 70-96Z" fill="url(#omG)" stroke="#ffffff" stroke-width="3"/><ellipse cx="74" cy="92" rx="26" ry="15" fill="#ffffff" opacity=".55"/><circle cx="81" cy="142" r="6" fill="#1c2433"/><circle cx="119" cy="142" r="6" fill="#1c2433"/><path d="M84 168q16 12 32 0" fill="none" stroke="#1c2433" stroke-width="4" stroke-linecap="round"/><circle cx="69" cy="158" r="6" fill="#ff9ec4" opacity=".7"/><circle cx="131" cy="158" r="6" fill="#ff9ec4" opacity=".7"/></svg>`
    }
  },

  // markup for a key — png <img> when forced, otherwise inline svg
  get(key, opts = {}) {
    const a = this.defs[key];
    if (!a) return '';
    const usePng = opts.png ?? this.usePng;
    if (usePng && a.png) {
      return `<img class="aero-asset aero-asset--${key}" src="${this.base}${a.png}" alt="" aria-hidden="true" />`;
    }
    return a.svg;
  },

  // inject one asset into an element
  mount(el, key, opts) { if (el) el.innerHTML = this.get(key, opts); },

  // wire up every [data-aero] placeholder in the page on load.
  // only pass png opt when data-png is explicitly set — otherwise let usePng decide.
  // (false ?? x === false, not x — so we must not pass false here)
  hydrate(root = document) {
    root.querySelectorAll('[data-aero]').forEach(el => {
      const opts = el.hasAttribute('data-png') ? { png: el.dataset.png === 'true' } : {};
      this.mount(el, el.dataset.aero, opts);
    });
  }
};

// expose for the page scripts
window.AeroAssets = AeroAssets;

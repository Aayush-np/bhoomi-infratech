/* ==========================================================================
   BHOOMI ADMIN — APP SHELL
   Auth gate, hash router, sidebar counts, view dispatch.
   ========================================================================== */
(function () {
  'use strict';

  const UI = window.AdminUI;
  const Api = window.AdminApi;
  const V = window.AdminViews;

  const ROUTES = [
    { key: '', label: 'DASHBOARD', view: V.dashboard },
    { key: 'projects', label: 'PROJECTS', view: V.projects },
    { key: 'services', label: 'SERVICES', view: V.services },
    { key: 'gallery', label: 'GALLERY', view: V.gallery },
    { key: 'news', label: 'NEWS & NOTICES', view: V.news },
    { key: 'inquiries', label: 'INQUIRIES', view: V.inquiries },
    { key: 'settings', label: 'SETTINGS', view: V.settings }
  ];

  let currentKey = '';
  let navToken = 0;

  const $ = id => document.getElementById(id);

  function dropSplash() {
    // splash element removed from DOM — no-op
  }

  /* ==================================================================
     ROUTER
     ================================================================== */
  async function navigate() {
    const token = ++navToken;
    let key = (location.hash || '#/').replace(/^#\/?/, '').toLowerCase();
    if (!ROUTES.find(r => r.key === key)) key = '';
    currentKey = key;
    const route = ROUTES.find(r => r.key === key);

    document.querySelectorAll('.side-item').forEach(a =>
      a.classList.toggle('active', a.dataset.route === key));
    const idx = String(ROUTES.indexOf(route) + 1).padStart(2, '0');
    $('topKicker').textContent = '( ' + idx + ' — ' + route.label + ' )';
    $('topTitle').textContent = route.title || route.label;

    const view = { root: $('viewRoot'), actions: $('topActions') };
    $('viewRoot').innerHTML = UI.skel(5);

    try {
      await route.view.render(view);
      if (token !== navToken) return;          // superseded navigation
      $('topActions').innerHTML = route.view.actions ? route.view.actions(view) : '';
      setSyncTag();
    } catch (err) {
      $('viewRoot').innerHTML = UI.errorState(err.message || 'View failed to render.');
    }
  }

  function setSyncTag() {
    const el = $('syncTag');
    if (!el) return;
    const d = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(d);
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    el.textContent = 'DB SYNC ' + hour + ':' + minute + ' IST ✓';
  }

  /* action dispatch (buttons live inside the view) */
  function dispatchAction(e) {
    const el = e.target.closest('[data-action]');
    if (!el || (!el.closest('#viewRoot') && !el.closest('#topActions'))) return;
    const route = ROUTES.find(r => r.key === currentKey);
    if (route && route.view.onAction) route.view.onAction(el.dataset.action, el.dataset.id, e, el);
  }
  $('viewRoot').addEventListener('click', dispatchAction);
  $('topActions').addEventListener('click', dispatchAction);
  /* inline selects (inquiry status) */
  $('viewRoot').addEventListener('change', e => {
    const el = e.target.closest('select[data-action]');
    if (!el || !el.closest('#viewRoot')) return;
    const route = ROUTES.find(r => r.key === currentKey);
    if (route && route.view.onAction) route.view.onAction(el.dataset.action, el.dataset.id, e, el);
  });

  window.addEventListener('hashchange', () => {
    if (!$('adminApp').hidden) navigate();
  });

  /* ==================================================================
     SIDEBAR COUNTS
     ================================================================== */
  async function refreshCounts() {
    try {
      const [p, nq] = await Promise.all([Api.count('projects'), Api.count('inquiries')]);
      const bp = $('countProjects');
      if (bp) bp.textContent = p;
      /* new-inquiry badge needs a list; keep it light: fetch ids only */
      const q = await Api.list('inquiries', 'created_at');
      const newN = q.filter(r => r.status === 'new').length;
      const bi = $('countInquiries');
      if (bi) {
        bi.textContent = newN;
        bi.hidden = !newN;
      }
    } catch (err) { /* counts are cosmetic — ignore */ }
  }

  /* load the Turnstile script only when a site key is configured */
  function loadTurnstile() {
    return new Promise((resolve, reject) => {
      if (window.turnstile) return resolve();
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load the CAPTCHA widget. Check your connection or disable the blocker.'));
      document.head.appendChild(s);
    });
  }

  /* ==================================================================
     AUTH
     ================================================================== */
  const Auth = {
    mode: 'in',
    captchaWidget: null,

    async renderCaptcha() {
      if (!Api.captchaSiteKey) return;
      const box = $('authCaptcha');
      if (!box || Auth.captchaWidget !== null) return;
      try {
        await loadTurnstile();
        box.hidden = false;
        Auth.captchaWidget = window.turnstile.render(box, {
          sitekey: Api.captchaSiteKey,
          theme: 'dark',
          'error-callback': function (code) {
            /* surface the exact Turnstile error code so misconfigured
               keys/domains are debuggable from the login screen */
            UI.toast('CAPTCHA error ' + code + ' — check the Turnstile site key + allowed hostnames in the Cloudflare dashboard.', 'err');
            console.error('[auth] Turnstile error code:', code,
              '(110110 = invalid site key, 110200/110201 = hostname not allowed, 102xxx = key mismatch)');
          }
        });
      } catch (err) {
        UI.toast(err.message, 'err');
      }
    },
    captchaToken() {
      if (!Api.captchaSiteKey) return '';
      if (Auth.captchaWidget === null || !window.turnstile) return '';
      return window.turnstile.getResponse(Auth.captchaWidget) || '';
    },
    resetCaptcha() {
      if (Auth.captchaWidget !== null && window.turnstile) {
        window.turnstile.reset(Auth.captchaWidget);
      }
    },

    init() {
      const form = $('authForm');
      const toggle = $('authToggle');
      const label = $('authModeLabel');
      const passInp = $('authPass');
      const passLabel = passInp.closest('.frow').querySelector('.lbl');

      /* show / hide password */
      const passToggle = $('authPassToggle');
      if (passToggle) {
        passToggle.addEventListener('click', () => {
          const show = passInp.type === 'password';
          passInp.type = show ? 'text' : 'password';
          passToggle.classList.toggle('on', show);
          passToggle.setAttribute('aria-pressed', String(show));
          passToggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
          passInp.focus();
        });
      }

      form.addEventListener('submit', async e => {
        e.preventDefault();
        if (!Api.enabled) {
          UI.toast('Backend not configured yet — complete the setup steps below first.', 'err');
          return;
        }
        const email = $('authEmail').value.trim().toLowerCase();
        const pass = $('authPass').value;
        let bad = false;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          UI.toast('Enter a valid email address.', 'err');
          $('authEmail').focus();
          bad = true;
        }
        if (pass.length < 6) {
          UI.toast('Password must be at least 6 characters.', 'err');
          $('authPass').focus();
          bad = true;
        }
        if (bad) return;

        const btn = $('authSubmit');
        const captchaToken = Auth.captchaToken();
        if (Api.captchaSiteKey && !captchaToken) {
          UI.toast('Please complete the CAPTCHA check first.', 'err');
          return;
        }
        UI.setBusy(btn, true, this.mode === 'in' ? 'CHECKING CREDENTIALS…' : 'CREATING ACCOUNT…');
        try {
          if (this.mode === 'in') {
            await Api.signIn(email, pass, captchaToken);
            UI.toast('Welcome back, ' + email.split('@')[0] + '.');
          } else {
            await Api.signUp(email, pass, captchaToken);
            UI.toast('Account ready.');
          }
          await App.enterApp();
        } catch (err) {
          Auth.resetCaptcha();
          const box = $('authErr');
          box.textContent = err.message || 'Sign-in failed.';
          box.hidden = false;
        } finally {
          UI.setBusy(btn, false);
        }
      });

      toggle.addEventListener('click', e => {
        e.preventDefault();
        this.mode = this.mode === 'in' ? 'up' : 'in';
        const up = this.mode === 'up';
        toggle.textContent = up ? 'ALREADY ON THE ADMIN LIST? SIGN IN' : 'CREATE AN ACCOUNT';
        label.textContent = up ? 'ALREADY ON THE ADMIN LIST?' : 'FIRST TIME ON THIS DESK?';
        $('authSubmit').querySelector('span').textContent = up ? 'Create Account' : 'Sign In';
        passInp.autocomplete = up ? 'new-password' : 'current-password';
        passLabel.textContent = up ? 'PASSWORD (MIN 6 CHARACTERS)' : 'PASSWORD';
        $('authErr').hidden = true;
      });
    },

    show(err) {
      dropSplash();
      $('adminApp').hidden = true;
      $('adminAuth').hidden = false;
      Auth.renderCaptcha();
      if (err) {
        const box = $('authErr');
        box.textContent = err;
        box.hidden = false;
      }
    }
  };

  /* ==================================================================
     APP LIFECYCLE
     ================================================================== */
  const App = {
    async init() {
      Auth.init();
      $('signOutBtn').addEventListener('click', async () => {
        try { await Api.signOut(); } catch (err) { /* ignore */ }
        Auth.show();
        location.hash = '#/';
      });
      /* mobile sidebar */
      $('burgerSide').addEventListener('click', () => {
        $('adminApp').classList.toggle('side-open');
      });
      document.addEventListener('click', e => {
        if (window.innerWidth > 900) return;
        if (!$('adminApp').classList.contains('side-open')) return;
        if (e.target.closest('.side') || e.target.closest('#burgerSide')) return;
        $('adminApp').classList.remove('side-open');
      });

      if (!Api.enabled) return this.showSetup();

      const session = await Api.session();
      if (session) {
        try {
          if (await Api.ensureAdmin()) return this.enterApp();
          await Api.signOut();
        } catch (err) { /* fall through to login */ }
      }
      Auth.show();

      /* react to sign-out in another tab / session expiry */
      Api.onAuthChange(s => {
        if (!s && !$('adminApp').hidden) {
          Auth.show('SESSION ENDED — SIGN IN AGAIN TO RESUME.');
        }
      });
    },

    showSetup() {
      dropSplash();
      $('adminAuth').hidden = false;
      Auth.renderCaptcha();
      $('adminAuth').querySelector('.auth-card').classList.add('setup-mode');
      $('authNote').textContent = 'BACKEND NOT CONFIGURED — SEE THE SETUP PANEL FOR THE FOUR-STEP WIRING.';
    },

    async enterApp() {
      dropSplash();
      $('adminAuth').hidden = true;
      $('adminApp').hidden = false;
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      $('sideUser').textContent = Api.state.email;
      if (!location.hash || location.hash === '#') history.replaceState(null, '', '#/');
      await navigate();
      refreshCounts();
    },

    refreshCounts,
    navigate
  };

  window.AdminApp = App;
  App.init();
})();

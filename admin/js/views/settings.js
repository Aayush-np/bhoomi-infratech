/* ==========================================================================
   BHOOMI ADMIN — VIEW: SETTINGS
   Company profile, headline stats and contact details.
   Saved as JSON documents under site_settings (company / stats / contact).
   ========================================================================== */
(function () {
  'use strict';

  const UI = window.AdminUI;
  const Api = window.AdminApi;
  const F = window.Forms;

  /* fallbacks mirror the current website */
  const DEFAULTS = {
    company: {
      about: 'Fourteen years of dirt under our nails. Bhoomi Infratech builds the roads, towers, parks and homes that cities are made of — with one crew, one standard, and no shortcuts.',
      lede: 'Founded in 2016, Bhoomi Infratech has grown from a local civil contractor into a <b>multi-disciplinary build house</b> spanning construction, infrastructure, real estate and design — trusted by municipalities, enterprises and families across Madhesh Province.',
      mission: 'Deliver every project on time, on budget and above spec — while keeping every worker safe and every client informed at each milestone.',
      vision: "To be the region's most trusted name in infrastructure and real estate — building spaces that serve three generations, not three years.",
      values: [
        { title: 'Safety First', text: 'Zero-harm sites. Daily toolbox talks, full PPE discipline and independent safety audits on every active project.' },
        { title: 'On-Time, Every Time', text: 'CPM-scheduled builds with weekly client progress reports — 92% of our projects have finished ahead of deadline.' },
        { title: 'Material Integrity', text: "Batch-tested concrete, certified steel and vendor-audited supplies. What's in the mix is on the record." },
        { title: 'Transparent Dealings', text: 'Itemised estimates, milestone-linked billing and clear-title real estate. No surprises after the signature.' }
      ]
    },
    stats: [
      { value: 10, suffix: '+' },
      { value: 45, suffix: '+' },
      { value: 92000, suffix: ' m²' },
      { value: 120, suffix: ' Cr+' }
    ],
    contact: {
      phone: '+977 9818624020',
      tel: '+9779818624020',
      email: 'bhoomiinfratech123@gmail.com',
      address: 'Bhoomi Infratech Pvt. Ltd.\nGaur-5, Rautahat,\nMadhesh Pradesh, Nepal',
      hours: 'Sun–Fri · 09:00–17:00 NPT',
      field: 'Active sites across Madhesh Province.\nSite visits by appointment.'
    }
  };
  const STAT_LABELS = ['YEARS IN OPERATION', 'PROJECTS DELIVERED', 'BUILT & PAVED', 'NPR VALUE EXECUTED'];

  const view = {
    kicker: '( 07 — COMPANY RECORDS )',
    title: 'Settings',
    actions() {
      return '<button class="btn solid" data-action="save" type="button">' + UI.icon('check', 14) + ' Save Settings</button>';
    },

    async render(v) {
      const root = v.root;
      root.innerHTML = '<div id="stBody">' + UI.skel(4) + '</div>';
      try {
        const s = await Api.getSettings();
        this.c = Object.assign({}, DEFAULTS.company, s.company || {});
        this.s = Array.isArray(s.stats) ? s.stats : DEFAULTS.stats;
        this.k = Object.assign({}, DEFAULTS.contact, s.contact || {});
      } catch (err) {
        /* offline / first run — edit from defaults */
        this.c = Object.assign({}, DEFAULTS.company);
        this.s = DEFAULTS.stats.map(x => Object.assign({}, x));
        this.k = Object.assign({}, DEFAULTS.contact);
        UI.toast('Could not load saved settings — showing defaults.', 'err');
      }
      this.paint();
    },

    paint() {
      const c = this.c, k = this.k, st = this.s;
      const values = c.values && c.values.length === 4 ? c.values : DEFAULTS.company.values;

      document.getElementById('stBody').innerHTML =
        '<form id="stForm" novalidate>' +
        '<div class="st-grid">' +

        '<div class="card">' +
        '<div class="card-h"><b>COMPANY PROFILE</b><span class="mono">ABOUT SECTION — HOMEPAGE</span></div>' +
        '<div class="card-b fgrid">' +
        F.field('Company paragraph (sticky card)', '<textarea class="inp" data-k="c_about" rows="3" maxlength="400">' + UI.e(c.about) + '</textarea>') +
        F.field('Profile lede (<b>bold</b> markup allowed)', '<textarea class="inp" data-k="c_lede" rows="4" maxlength="600">' + UI.e(c.lede) + '</textarea>') +
        F.field('Mission', '<textarea class="inp" data-k="c_mission" rows="2" maxlength="300">' + UI.e(c.mission) + '</textarea>') +
        F.field('Vision', '<textarea class="inp" data-k="c_vision" rows="2" maxlength="300">' + UI.e(c.vision) + '</textarea>') +
        values.map((vv, i) =>
          '<div class="frow">' +
          '<label class="lbl">VALUE ' + String(i + 1).padStart(2, '0') + ' — TITLE / TEXT</label>' +
          '<div class="pair-inp">' +
          '<input class="inp" data-k="c_vt' + i + '" maxlength="40" value="' + UI.e(vv.title) + '">' +
          '<input class="inp" data-k="c_vp' + i + '" maxlength="220" value="' + UI.e(vv.text) + '">' +
          '</div></div>'
        ).join('') +
        '</div></div>' +

        '<div class="card">' +
        '<div class="card-h"><b>HEADLINE STATS</b><span class="mono">AMBER STATS BAND</span></div>' +
        '<div class="card-b st-rows">' +
        st.map((sv, i) =>
          '<div class="st-row">' +
          '<span class="mono st-lbl">' + UI.e(STAT_LABELS[i] || 'STAT ' + (i + 1)) + '</span>' +
          '<div class="pair-inp">' +
          '<input class="inp st-num" type="number" min="0" step="any" data-k="s_v' + i + '" value="' + UI.e(sv.value != null ? sv.value : 0) + '">' +
          '<input class="inp st-suf" data-k="s_s' + i + '" maxlength="10" value="' + UI.e(sv.suffix || '') + '" placeholder="SUFFIX">' +
          '</div></div>'
        ).join('') +
        '</div></div>' +

        '<div class="card">' +
        '<div class="card-h"><b>CONTACT &amp; SITE OFFICE</b><span class="mono">CONTACT SECTION + FOOTER</span></div>' +
        '<div class="card-b fgrid">' +
        F.field('Phone (display)', '<input class="inp" data-k="k_phone" maxlength="30" value="' + UI.e(k.phone) + '">') +
        F.field('Phone (dial, no spaces)', '<input class="inp" data-k="k_tel" maxlength="20" value="' + UI.e(k.tel) + '" placeholder="+9779818624020">') +
        F.field('Email', '<input class="inp" type="email" data-k="k_email" maxlength="80" value="' + UI.e(k.email) + '">') +
        F.field('Office address (one line per row)', '<textarea class="inp" data-k="k_address" rows="3" maxlength="200">' + UI.e(k.address) + '</textarea>') +
        F.field('Office hours', '<input class="inp" data-k="k_hours" maxlength="60" value="' + UI.e(k.hours) + '">') +
        F.field('Field note (one line per row)', '<textarea class="inp" data-k="k_field" rows="2" maxlength="200">' + UI.e(k.field) + '</textarea>') +
        '</div></div>' +

        '</div>' +
        '<div class="st-save-row">' +
        '<span class="mono st-note">CHANGES PUBLISH TO THE PUBLIC SITE ON THE VISITOR’S NEXT VISIT.</span>' +
        '<button class="btn solid" data-action="save" type="button">' + UI.icon('check', 14) + ' Save Settings</button>' +
        '</div>' +
        '</form>';
    },

    onAction(action) {
      if (action === 'save') this.save();
      if (action === 'retry') this.render({ root: document.getElementById('viewRoot') });
    },

    save() {
      const root = document.getElementById('stForm');
      const v = k => (root.querySelector('[data-k="' + k + '"]') || {}).value || '';

      const company = {
        about: v('c_about').trim(),
        lede: v('c_lede').trim(),
        mission: v('c_mission').trim(),
        vision: v('c_vision').trim(),
        values: [0, 1, 2, 3].map(i => ({ title: v('c_vt' + i).trim(), text: v('c_vp' + i).trim() }))
      };
      const stats = [0, 1, 2, 3].map(i => ({
        value: parseFloat(v('s_v' + i)) || 0,
        suffix: v('s_s' + i)
      }));
      const contact = {
        phone: v('k_phone').trim(),
        tel: v('k_tel').trim(),
        email: v('k_email').trim(),
        address: v('k_address').trim(),
        hours: v('k_hours').trim(),
        field: v('k_field').trim()
      };

      const ok = F.validate(root, [
        { sel: '[data-k="c_about"]', test: x => x.trim().length < 10 ? 'Write the company paragraph.' : '' },
        { sel: '[data-k="k_email"]', test: x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.trim()) ? '' : 'Enter a valid email address.' }
      ]);
      if (!ok) return;

      const btn = document.querySelector('.st-save-row .btn');
      UI.setBusy(btn, true, 'PUBLISHING…');
      Api.upsertSettings([
        { key: 'company', value: JSON.stringify(company) },
        { key: 'stats', value: JSON.stringify(stats) },
        { key: 'contact', value: JSON.stringify(contact) }
      ]).then(() => {
        this.c = company; this.s = stats; this.k = contact;
        UI.toast('Company records saved — the public site updates on next visit.');
      }).catch(err => {
        UI.toast(err.message, 'err');
      }).finally(() => {
        UI.setBusy(btn, false);
      });
    }
  };

  window.AdminViews = window.AdminViews || {};
  window.AdminViews.settings = view;
})();

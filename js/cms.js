/* ==========================================================================
   BHOOMI INFRATECH — CMS LAYER (public site)
   --------------------------------------------------------------------------
   Reads content from Supabase and hydrates the page IN PLACE.
   - No config / failed fetch → the page keeps its built-in content.
   - main.js waits on Cms.ready before initialising its UI modules.
   - Late hydrations (slow network) dispatch "bhoomi:cms-ready" so main.js
     can re-bind dynamically rendered nodes.
   ========================================================================== */
(function () {
  'use strict';

  var cfg = window.SITE_CONFIG || {};
  var urlOk = cfg.supabaseUrl && /^https?:\/\//i.test(cfg.supabaseUrl) && !/your[-_]|xxx/i.test(cfg.supabaseUrl);
  var enabled = !!(window.supabase && urlOk && cfg.supabaseAnonKey);
  var client = enabled ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  var READY_TIMEOUT = 6000; // site still loads with built-in content after this
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  /* ---------- helpers ---------- */
  function e(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function txt(s) { return e(s).replace(/\n/g, '<br>'); } // admin text: newlines → <br>
  /* escape everything, then re-allow only the two tags the design uses —
     prevents stored XSS from any content that reaches innerHTML */
  function safeMarkup(s) {
    return e(s)
      .replace(/&lt;(\/?)b&gt;/gi, '<$1b>')
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  }
  function parseJson(v, fallback) {
    if (v == null) return fallback;
    if (typeof v === 'object') return v;
    try { var p = JSON.parse(v); return p == null ? fallback : p; } catch (err) { return fallback; }
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(d) {
    var raw = String(d == null ? '' : d);
    var dt = new Date(raw.length === 10 ? raw + 'T00:00:00' : raw);
    if (isNaN(dt)) return e(raw);
    return MONTHS[dt.getMonth()] + ' ' + pad2(dt.getDate()) + ', ' + dt.getFullYear();
  }
  function endYear(period) {
    var m = String(period || '').match(/\d{4}/g);
    return m ? m[m.length - 1] : '';
  }
  function statusLabel(p, where) {
    if (p.status === 'completed') {
      var y = endYear(p.period);
      if (where === 'stack') return y ? 'COMPLETED — ' + y : 'COMPLETED';
      return 'COMPLETED';
    }
    var prog = p.progress || 0;
    return where === 'stack' ? 'ONGOING — ' + prog + '%' : 'ONGOING · ' + prog + '%';
  }
  /* if the app already booted, force-reveal late-hydrated content */
  function markReveals(root) {
    if (window.__bhoomiAppReady && root) {
      root.querySelectorAll('.rv:not(.in), .lm:not(.in)').forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* ---------- stats band ---------- */
  function hydrateStats(stats) {
    if (!Array.isArray(stats)) return;
    document.querySelectorAll('.stats [data-count]').forEach(function (el, i) {
      var s = stats[i];
      if (!s) return;
      if (s.value != null) el.dataset.count = String(s.value);
      el.dataset.suffix = s.suffix || '';
    });
  }

  /* ---------- about / company profile ---------- */
  function hydrateCompany(c) {
    if (!c || typeof c !== 'object') return;
    var set = function (sel, html, raw) {
      var el = document.querySelector(sel);
      if (!el || !html) return;
      if (raw) el.innerHTML = html; else el.textContent = html;
    };
    set('.about-sticky p', txt(c.about));
    set('.about-lede', safeMarkup(c.lede), true);           // <b>/<br> markup allowed, everything else escaped
    set('.mv article[data-i="M"] p', c.mission);
    set('.mv article[data-i="V"] p', c.vision);
    if (Array.isArray(c.values)) c.values.forEach(function (v, i) {
      var box = document.querySelectorAll('.values .value')[i];
      if (!box || !v) return;
      if (v.title) box.querySelector('h4').textContent = v.title;
      if (v.text) box.querySelector('p').textContent = v.text;
    });
  }

  /* ---------- contact block ---------- */
  function hydrateContact(c) {
    if (!c || typeof c !== 'object') return;
    var blocks = document.querySelectorAll('.c-info > div');
    if (c.address && blocks[0]) blocks[0].querySelector('p').innerHTML = txt(c.address);
    if (c.phone && blocks[1]) {
      var tel = (c.tel || c.phone.replace(/\s+/g, ''));
      blocks[1].querySelector('p').innerHTML =
        '<a href="tel:' + e(tel) + '">' + e(c.phone) + '</a><br>' + e(c.hours || '');
    }
    if (c.email && blocks[2]) {
      blocks[2].querySelector('p').innerHTML =
        '<a href="mailto:' + e(c.email) + '">' + e(c.email) + '</a>';
    }
    if (c.field && blocks[3]) blocks[3].querySelector('p').innerHTML = txt(c.field);
  }

  /* ---------- services list ---------- */
  function hydrateServices(list) {
    if (!Array.isArray(list) || !list.length) return;
    var wrap = document.getElementById('svcList');
    if (!wrap) return;
    wrap.innerHTML = list.map(function (s, i) {
      var tags = parseJson(s.tags, []);
      return (
        '<div class="svc rv" tabindex="0" role="button" aria-label="View ' + e(s.title) + ' details" ' +
        'data-img="' + e(s.image) + '" ' +
        'data-description="' + e(s.description) + '" ' +
        'data-scope="' + e(s.scope) + '" ' +
        'data-detail-tags="' + e(JSON.stringify(parseJson(s.detail_tags, []))) + '">' +
        '<span class="idx">/ ' + pad2(i + 1) + '</span>' +
        '<div><h3>' + e(s.title) + '</h3>' +
        '<p>' + e(s.summary) + '</p>' +
        '<div class="tags">' + tags.map(function (t) { return '<span>' + e(t) + '</span>'; }).join('') + '</div>' +
        '</div>' +
        '<span class="go">→</span>' +
        '</div>'
      );
    }).join('');
    markReveals(wrap);
  }

  /* ---------- projects (featured stack + field grid) ---------- */
  function hydrateProjects(list) {
    if (!Array.isArray(list)) return;
    var stack = document.getElementById('stack');
    var grid = document.getElementById('pgrid');
    var feats = list.filter(function (p) { return p.featured; }).slice(0, 4);
    var gridded = list.filter(function (p) { return p.in_grid; });

    if (stack && feats.length) {
      stack.innerHTML = feats.map(function (p, i) {
        var specs = parseJson(p.specs, []);
        var done = p.status === 'completed';
        var prog = done ? 100 : (p.progress || 0);
        var meta = (p.category + ' · ' + (p.location || '') + ' · ' + (p.period || '')).toUpperCase();
        return (
          '<article class="stack-card project-card rv" tabindex="0" role="button" aria-label="View ' + e(p.title) + ' details" ' +
          'data-description="' + e(p.description) + '" ' +
          'data-specs="' + e(JSON.stringify(specs)) + '" ' +
          'data-progress="' + prog + '">' +
          '<div class="ph"><span class="status' + (done ? ' done' : '') + '"><i></i>' + e(statusLabel(p, 'stack')) + '</span>' +
          '<img src="' + e(p.image) + '" alt="' + e(p.title) + '"></div>' +
          '<div class="body"><span class="wm">' + pad2(i + 1) + '</span>' +
          '<div class="meta">' + e(meta) + '</div>' +
          '<h3>' + e(p.title) + '</h3>' +
          '<p class="desc">' + e(p.description) + '</p>' +
          '<div class="spec">' + specs.slice(0, 4).map(function (sp) {
            return '<div><b>' + e(sp[0]) + '</b><span>' + e(sp[1]) + '</span></div>';
          }).join('') + '</div>' +
          '<div class="pbar"><div class="lbl"><span>' + (done ? 'PROJECT STATUS' : 'CONSTRUCTION PROGRESS') + '</span><span>' + prog + '%</span></div>' +
          '<div class="rail"><i style="--p:' + prog + '%"></i></div>' +
          '</div></article>'
        );
      }).join('');
    }

    if (grid && gridded.length) {
      grid.innerHTML = gridded.map(function (p, i) {
        var specs = parseJson(p.specs, []);
        var done = p.status === 'completed';
        var prog = done ? 100 : (p.progress || 0);
        var delay = i % 3 === 1 ? '.08s' : (i % 3 === 2 ? '.16s' : '0s');
        return (
          '<article class="pcard rv project-card" tabindex="0" role="button" aria-label="View ' + e(p.title) + ' details" ' +
          'data-cat="' + e(p.category) + '" style="--d:' + delay + '" ' +
          'data-description="' + e(p.description) + '" ' +
          'data-specs="' + e(JSON.stringify(specs)) + '" ' +
          'data-progress="' + prog + '">' +
          '<div class="ph"><span class="st' + (done ? ' done' : '') + '">' + e(statusLabel(p, 'grid')) + '</span>' +
          '<img src="' + e(p.image) + '" alt="' + e(p.title) + '"></div>' +
          '<div class="in"><div class="cat">' + e(p.category.toUpperCase()) + '</div>' +
          '<h3>' + e(p.title) + '</h3>' +
          '<p style="font-size:.85rem;color:var(--mut-p)">' + e(p.summary || p.description) + '</p>' +
          '<div class="row"><span>' + e((p.location || '').toUpperCase()) + '</span><span>' + e(p.period) + '</span></div>' +
          '</div></article>'
        );
      }).join('');
    }
    markReveals(document.getElementById('projects'));
  }

  /* ---------- news + announcements ---------- */
  function hydrateNews(list) {
    if (!Array.isArray(list)) return;
    var items = list.filter(function (n) { return n.kind !== 'announcement'; });
    var anns = list.filter(function (n) { return n.kind === 'announcement'; });

    var grid = document.getElementById('newsGrid');
    if (grid && items.length) {
      grid.innerHTML = items.map(function (n, i) {
        var id = 'dispatch-' + (i + 1);
        return (
          '<article class="ncard rv" style="--d:' + (i * 0.1) + 's">' +
          '<div class="ph"><img src="' + e(n.image) + '" alt="' + e(n.title) + '"></div>' +
          '<div class="in"><div class="top"><b>' + e(n.category) + '</b><span>' + e(fmtDate(n.date)) + '</span></div>' +
          '<h3>' + e(n.title) + '</h3>' +
          '<p>' + e(n.excerpt) + '</p>' +
          '<div class="dispatch" id="' + id + '" aria-hidden="true"><div class="dispatch-copy">' + e(n.body) + '</div></div>' +
          '<button class="more" type="button" aria-expanded="false" aria-controls="' + id + '">' + e(n.cta || 'READ DISPATCH') + ' <i>→</i></button>' +
          '</div></article>'
        );
      }).join('');
    }

    var annList = document.getElementById('annList');
    if (annList && anns.length) {
      annList.innerHTML = anns.map(function (n, i) {
        var id = 'ann-detail-' + (i + 1);
        return (
          '<div class="ann-row"><span class="d">' + e(fmtDate(n.date)) + '</span>' +
          '<span class="t">' + e(n.category) + '</span>' +
          '<span>' + e(n.title) + '</span>' +
          '<button class="a" type="button" aria-expanded="false" aria-controls="' + id + '">' + e(n.cta || 'UPDATE') + ' ↗</button>' +
          '<div class="ann-detail" id="' + id + '" aria-hidden="true"><span>' + e(n.body) + '</span></div>' +
          '</div>'
        );
      }).join('');
    }
    markReveals(document.getElementById('news'));
  }

  /* ---------- testimonials ---------- */
  function hydrateTestimonials(list) {
    if (!Array.isArray(list) || !list.length) return;
    var stage = document.getElementById('tStage');
    if (!stage) return;
    stage.innerHTML = list.map(function (t, i) {
      var q = e(t.quote);
      if (t.emph) {
        var hit = q.indexOf(e(t.emph));
        if (hit !== -1) q = q.slice(0, hit) + '<b>' + q.slice(hit, hit + e(t.emph).length) + '</b>' + q.slice(hit + e(t.emph).length);
      }
      return (
        '<div class="t-slide' + (i === 0 ? ' active' : '') + '">' +
        '<p class="q">' + q + '</p>' +
        '<div class="who"><img src="' + e(t.photo) + '" alt="' + e(t.name) + '">' +
        '<div><b>' + e(t.name) + '</b><span>' + e(t.role) + '</span></div></div>' +
        '</div>'
      );
    }).join('');
    markReveals(stage);
  }

  /* ---------- gallery + hero photo stack ---------- */
  function hydrateGallery(list) {
    if (!Array.isArray(list)) return;
    var bySection = { gallery: [], hero: [] };
    list.forEach(function (g) { if (bySection[g.section]) bySection[g.section].push(g); });

    var grid = document.getElementById('galGrid');
    if (grid && bySection.gallery.length) {
      grid.innerHTML = bySection.gallery.map(function (g, i) {
        return (
          '<figure class="g-item" data-full="' + e(g.image) + '">' +
          '<img src="' + e(g.image) + '" alt="' + e(g.caption) + '">' +
          '<figcaption><b>' + pad2(i + 1) + '</b>' + e(g.caption) + '</figcaption>' +
          '</figure>'
        );
      }).join('');
      markReveals(grid);
    }

    var imgs = document.querySelectorAll('#heroPhotoStack .hero-photo-card img');
    bySection.hero.slice(0, Math.max(imgs.length, 5)).forEach(function (g, i) {
      var img = imgs[i];
      if (!img) return;
      img.src = g.image;
      var card = img.closest('.hero-photo-card');
      if (card && g.caption) card.dataset.caption = g.caption;
    });
  }

  /* ---------- load + apply ---------- */
  function keymap(rows) {
    var o = {};
    (rows || []).forEach(function (r) { o[r.key] = r.value; });
    return o;
  }

  function load() {
    if (!client) return Promise.resolve(null);
    return Promise.all([
      client.from('projects').select('*').order('sort', { ascending: true }),
      client.from('services').select('*').order('sort', { ascending: true }),
      client.from('news').select('*').order('sort', { ascending: true }),
      client.from('testimonials').select('*').order('sort', { ascending: true }),
      client.from('gallery').select('*').order('sort', { ascending: true }),
      client.from('site_settings').select('*')
    ]).then(function (r) {
      return {
        projects: r[0].data || [],
        services: r[1].data || [],
        news: r[2].data || [],
        testimonials: r[3].data || [],
        gallery: r[4].data || [],
        settings: keymap(r[5].data)
      };
    }).catch(function (err) {
      console.warn('[cms] Supabase fetch failed — using built-in content.', err);
      return null;
    });
  }

  function applyAll(d) {
    if (!d) return;
    var s = d.settings || {};
    hydrateStats(parseJson(s.stats, null));
    hydrateCompany(parseJson(s.company, null));
    hydrateContact(parseJson(s.contact, null));
    hydrateServices(d.services);
    hydrateProjects(d.projects);
    hydrateNews(d.news);
    hydrateTestimonials(d.testimonials);
    hydrateGallery(d.gallery);
  }

  var started = load().then(function (d) {
    applyAll(d);
    window.dispatchEvent(new CustomEvent('bhoomi:cms-ready'));
  });

  var Cms = {
    enabled: enabled,
    ready: Promise.race([
      started.then(function () { window.__cmsLoaded = true; }),
      new Promise(function (resolve) { setTimeout(resolve, READY_TIMEOUT); })
    ]),
    /* used by the public inquiry form */
    insertInquiry: function (data) {
      if (!client) return Promise.resolve(true);
      return client.from('inquiries').insert(data).then(function (r) {
        if (r.error) {
          console.warn('[cms] inquiry save failed', r.error);
          return false;
        }
        return true;
      }).catch(function () { return false; });
    }
  };
  window.Cms = Cms;
})();

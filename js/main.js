/* ==========================================================================
   BHOOMI INFRATECH — MAIN SCRIPT
   --------------------------------------------------------------------------
   MODULES
   Env            → environment flags (motion / pointer)
   Preloader      → site-loading sequence
   ScrollFX       → progress bar, header state, back-to-top, stack depth
    MethodTower   → scroll-built construction sequence
   MobileMenu     → burger + full-screen menu
   Reveals        → IntersectionObserver reveal system (.rv / .lm)
   Counters       → stat number count-up
   Scramble       → decode-style text animation
   ServicePreview → cursor-following image on service rows
   ProjectFilter  → portfolio category filtering
   Lightbox       → gallery zoom viewer
   Testimonials   → quote slider
   InquiryForm    → contact form handling
    NewsDispatch → expandable news card dispatches
    SiteMap      → exact headquarters map marker
    ActiveNav      → scroll-spy for nav links
   Magnetic       → magnetic button hover
   ========================================================================== */
'use strict';

/* ---------- Env ---------- */
const Env = {
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  finePointer:   window.matchMedia('(pointer: fine)').matches,
  clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
};

/* escape any string for safe insertion into innerHTML */
function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* safe JSON decode for CMS-driven data attributes */
function safeJson(s){
  try { return s ? JSON.parse(s) : null; } catch (err) { return null; }
}
/* HTML-escape — anything that lands in innerHTML from the database must
   pass through this (data-attribute round-trips decode entities again). */
function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/* escape, then restore only the two safe formatting tags the back-office
   copy uses (<br> line breaks, <b> emphasis). Everything else — <script>,
   <img onerror>, event handlers — stays inert text. */
function safeMarkup(s){
  return esc(s)
    .replace(/&lt;(\/?b)&gt;/gi, '<$1>')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
}

/* ---------- Preloader ---------- */
const Preloader = {
  el: document.getElementById('loader'),
  pct: document.getElementById('ldPct'),
  bar: document.getElementById('ldBar'),

  init(){
    if (Env.reducedMotion) return this.finish();
    const t0 = performance.now(), DUR = 1300;
    const tick = (t) => {
      const p = Env.clamp((t - t0) / DUR, 0, 1);
      const v = Math.round(p * 100);
      this.pct.textContent = v;
      this.bar.style.width = v + '%';
      p < 1 ? requestAnimationFrame(tick) : setTimeout(() => this.finish(), 150);
    };
    requestAnimationFrame(tick);
  },
  finish(){
    this.el.classList.add('done');
    setTimeout(() => this.el.remove(), 900);
  }
};

/* ---------- ScrollFX ---------- */
const ScrollFX = {
  head:  document.getElementById('head'),
  prog:  document.getElementById('progBar'),
  toTop: document.getElementById('toTop'),
  stackCards: [...document.querySelectorAll('.stack-card')],
  ticking: false,

  init(){
    if (!this.bound) {
      this.bound = true;
      window.addEventListener('scroll', () => {
        if (this.ticking) return;
        this.ticking = true;
        requestAnimationFrame(() => this.update());
      }, { passive: true });
      this.toTop.addEventListener('click', () =>
        window.scrollTo({ top: 0, behavior: Env.reducedMotion ? 'auto' : 'smooth' }));
    }
    this.stackCards = [...document.querySelectorAll('.stack-card')];
    this.update();
  },

  update(){
    const y = window.scrollY;
    const h = document.documentElement.scrollHeight - innerHeight;
    this.head.classList.toggle('scrolled', y > 40);
    this.prog.style.width = (h > 0 ? y / h * 100 : 0) + '%';
    this.toTop.classList.toggle('show', y > 700);
    this.stackDepth();
    this.ticking = false;
  },

  /* featured project cards recede as the next one arrives */
  stackDepth(){
    if (Env.reducedMotion) return;
    this.stackCards.forEach((card, i) => {
      const next = this.stackCards[i + 1];
      if (!next) { card.style.transform = ''; card.style.filter = ''; return; }
      const r = next.getBoundingClientRect();
      const p = Env.clamp((innerHeight - r.top) / (innerHeight - 140), 0, 1);
      card.style.transform = `scale(${1 - p * 0.06}) translateY(${-p * 12}px)`;
      card.style.filter    = `brightness(${1 - p * 0.35})`;
    });
  }
};

/* ---------- MethodTower ---------- */
const MethodTower = {
  section: document.getElementById('method'),
  tower: document.getElementById('methodTower'),
  progressLine: document.querySelector('.method-progress i'),
  steps: [...document.querySelectorAll('.method-step')],
  built: 0,
  progress: 0,

  init(){
    if (!this.section || !this.tower) return;
    this.tower.style.setProperty('--method-ry', '-32deg');
    for (let i = 0; i < 6; i++) {
      const slab = document.createElement('div');
      slab.className = 'method-slab';
      slab.style.setProperty('--y', `${-i * 38}px`);
      slab.innerHTML = '<div class="method-face fr"></div><div class="method-face bk"></div><div class="method-face lf"></div><div class="method-face rt"></div><div class="method-face tp"></div>';
      this.tower.appendChild(slab);
    }
    [...this.tower.children].forEach(slab => slab.classList.remove('built'));
    window.addEventListener('scroll', () => this.update(), { passive: true });
    this.update();
    const loop = (time) => {
      this.render(time);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  update(){
    const rect = this.section.getBoundingClientRect();
    const startDelay = Math.min(260, innerHeight * .28);
    this.progress = Env.clamp(
      (innerHeight * .72 - rect.top - startDelay) / (rect.height * .78),
      0,
      1
    );
    if (this.progressLine) {
      const lineProgress = Env.clamp((innerHeight * .72 - rect.top) / rect.height, 0, 1);
      this.progressLine.style.transform = `scaleY(${lineProgress})`;
      this.steps.forEach(step =>
        step.classList.toggle('passed', step.getBoundingClientRect().top < innerHeight * .72));
    }
  },

  render(time){
    const drift = Env.reducedMotion ? 0 : Math.sin(time / 2200) * 5;
    this.tower.style.setProperty('--method-ry', `${-32 + this.progress * 380 + drift}deg`);
    const want = Math.floor(this.progress * 7.4);
    if (want === this.built) return;
    this.built = want;
    [...this.tower.children].forEach((slab, i) => slab.classList.toggle('built', i < want));
    const tags = this.section.querySelectorAll('.method-tag');
    tags[0]?.classList.toggle('show', want >= 6);
    tags[1]?.classList.toggle('show', want >= 4);
    tags[2]?.classList.toggle('show', want >= 2);
  }
};

/* ---------- HeroPhotoStack ---------- */
const HeroPhotoStack = {
  stack: document.getElementById('heroPhotoStack'),
  tag: document.querySelector('.hero-visual .site-tag'),
  cards: [],
  timer: null,
  captions: [
    'SITE 047 — SKYLINE RESIDENCY<br>POUR #212 · LEVEL 14 · 06:40 NPT',
    'SITE 031 — DESIGN OFFICE<br>COORDINATION SET · REV 08 · 09:15 NPT',
    'SITE 052 — BHOOMI TRADE PARK<br>BLOCK B · LEVEL 04 · 11:20 NPT',
    'SITE 064 — NH-64 CORRIDOR<br>PIER 18 · DECK POUR · 14:05 NPT',
    'SITE 022 — VERDANT VILLAS<br>HANDOVER WALK · PHASE I · 16:40 NPT'
  ],

  init(){
    if (!this.stack) return;
    this.cards = [...this.stack.querySelectorAll('.hero-photo-card')];
    /* CMS may supply per-card captions (data-caption) from the database */
    const fromCards = this.cards.map(c => c.dataset.caption).filter(Boolean);
    if (fromCards.length === this.cards.length && fromCards.length > 0) this.captions = fromCards;
    if (this.cards.length < 2 || Env.reducedMotion) return;
    this.updateCaption(0);
    this.timer = setInterval(() => this.advance(), 5000);
  },

  advance(){
    this.cards.push(this.cards.shift());
    this.cards.forEach((card, index) => {
      card.className = `hero-photo-card slot-${index}`;
    });
    const activeCaption = this.captions.shift();
    this.captions.push(activeCaption);
    this.updateCaption(0);
  },

  updateCaption(index){
    if (this.tag && this.captions[index]) {
      this.tag.innerHTML = safeMarkup(this.captions[index]);
    }
  }
};

/* ---------- MobileMenu ---------- */
const MobileMenu = {
  burger: document.getElementById('burger'),
  menu:   document.getElementById('mmenu'),

  init(){
    this.burger.addEventListener('click', () => this.toggle());
    this.menu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => this.toggle(false)));
  },
  toggle(force){
    const open = force !== undefined ? force : !this.menu.classList.contains('open');
    this.menu.classList.toggle('open', open);
    this.burger.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
};

/* ---------- Reveals ---------- */
const Reveals = {
  init(){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    /* only observe not-yet-revealed nodes (late CMS hydration adds more) */
    document.querySelectorAll('.rv:not(.in), .lm:not(.in), .stack-card:not(.in)').forEach(el => io.observe(el));
  }
};

/* ---------- Counters ---------- */
const Counters = {
  init(){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        this.run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: .5 });
    document.querySelectorAll('[data-count]').forEach(el => io.observe(el));
  },
  run(el){
    const raw = el.dataset.count;
    const target = parseFloat(raw);
    const dec = (raw.split('.')[1] || '').length;
    const suf = el.dataset.suffix || '';
    if (Env.reducedMotion) { el.textContent = target.toFixed(dec) + suf; return; }
    const t0 = performance.now(), DUR = 1800;
    const step = (t) => {
      const p = Env.clamp((t - t0) / DUR, 0, 1);
      const e = 1 - Math.pow(1 - p, 4);           // easeOutQuart
      el.textContent = (target * e).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
};

/* ---------- Scramble ---------- */
const Scramble = {
  CHARS: '█▓#/\\>0124579',
  init(){
    const el = document.querySelector('.scramble-hero');
    if (!el) return;
    setTimeout(() => this.run(el), Env.reducedMotion ? 0 : 1400);
  },
  run(el){
    const original = el.dataset.text || el.textContent;
    if (Env.reducedMotion) { el.textContent = original; return; }
    const glyphs = '▓▒░#/<>*+ABEHIKMNORSTUX0123456789';
    let frame = 0;
    const reveal = () => {
      frame++;
      const visible = Math.floor(frame / 2);
      let output = '';
      for (let i = 0; i < original.length; i++) {
        const character = original[i];
        output += character === ' '
          ? ' '
          : (i < visible ? character : glyphs[(Math.random() * glyphs.length) | 0]);
      }
      el.textContent = output;
      if (visible < original.length) {
        setTimeout(reveal, 26);
      } else {
        el.textContent = original;
      }
    };
    reveal();
  }
};

/* ---------- HeroTimeWord ---------- */
const HeroTimeWord = {
  el: document.getElementById('heroTimeWord'),
  words: ['TODAY.', 'TOMORROW.', 'EVERYDAY.'],
  index: 0,
  timer: null,
  glyphs: '▓▒░#/<>*+ABEHIKMNORSTUX0123456789',

  init(){
    if (!this.el || Env.reducedMotion) return;
    this.timer = setInterval(() => {
      this.index = (this.index + 1) % this.words.length;
      this.decode(this.words[this.index]);
    }, 3000);
  },

  decode(target){
    let frame = 0;
    const reveal = () => {
      frame++;
      const visible = Math.floor(frame / 2);
      let output = '';
      for (let i = 0; i < target.length; i++) {
        output += i < visible
          ? target[i]
          : this.glyphs[(Math.random() * this.glyphs.length) | 0];
      }
      this.el.textContent = output;
      if (visible < target.length) {
        setTimeout(reveal, 30);
      } else {
        this.el.textContent = target;
      }
    };
    reveal();
  }
};

/* ---------- ServicePreview ---------- */
const ServicePreview = {
  el:  document.getElementById('svcPreview'),
  tx: 0, ty: 0, cx: 0, cy: 0, active: false,

  init(){
    document.querySelectorAll('.svc:not([data-preview-bound])').forEach(row => {
      if (!Env.finePointer || Env.reducedMotion) return;
      row.dataset.previewBound = '1';
      row.addEventListener('mouseenter', () => {
        this.el.querySelector('img').src = row.dataset.img;
        this.el.classList.add('on');
        if (!this.active) { this.active = true; this.loop(); }
      });
      row.addEventListener('mouseleave', () => {
        this.el.classList.remove('on');
        this.active = false;
      });
    });
    const services = document.querySelector('.services');
    if (services && !services.dataset.bound && Env.finePointer && !Env.reducedMotion) {
      services.dataset.bound = '1';
      services.addEventListener('mousemove', e => {
        this.tx = e.clientX; this.ty = e.clientY;
      });
    }
  },
  loop(){
    this.cx += (this.tx - this.cx) * .12;
    this.cy += (this.ty - this.cy) * .12;
    this.el.style.left = (this.cx + 30) + 'px';
    this.el.style.top  = (this.cy - 230) + 'px';
    if (this.active) requestAnimationFrame(() => this.loop());
  }
};

/* ---------- ServiceDetails ---------- */
const ServiceDetails = {
  modal: document.getElementById('svcModal'),
  closeButton: document.getElementById('svcModalClose'),
  image: document.getElementById('svcModalImg'),
  index: document.getElementById('svcModalIndex'),
  title: document.getElementById('svcModalTitle'),
  description: document.getElementById('svcModalDesc'),
  scope: document.getElementById('svcModalScope'),
  tags: document.getElementById('svcModalTags'),
  lastFocused: null,
  details: [
    { scope: 'Turnkey RCC · Residential · Commercial · Industrial', description: 'End-to-end civil construction from excavation and raft foundations through RCC framing, masonry, finishing and final handover.', tags: ['FOUNDATION', 'RCC STRUCTURE', 'FINISHING'] },
    { scope: 'Roads · Bridges · Drainage · Utilities', description: 'Durable public infrastructure for municipalities and state agencies, including road corridors, bridges, storm-water systems and water-supply networks.', tags: ['ROADWORKS', 'BRIDGES', 'DRAINAGE'] },
    { scope: 'Plots · Apartments · Villas · Colonies', description: 'Clear-title real-estate development with planned layouts, internal roads, utilities and transparent construction updates from launch to possession.', tags: ['MASTER PLANNING', 'DEVELOPMENT', 'HANDOVER'] },
    { scope: 'Interiors · Retrofit · Façade Upgrades', description: 'Turnkey interior fit-outs and structural upgrades for homes, offices and retail spaces, coordinated by one in-house execution team.', tags: ['TURNKEY', 'RETROFIT', 'FIT-OUT'] },
    { scope: 'Planning · Estimation · QA/QC · Supervision', description: 'Independent project management for third-party builds, controlling schedule, cost, procurement, site quality and reporting through every milestone.', tags: ['SCHEDULING', 'QUALITY CONTROL', 'REPORTING'] },
    { scope: 'Architecture · Structural Design · Approvals', description: 'Concept design, 3D visualization, structural detailing, BOQ preparation and statutory approval support before construction begins.', tags: ['3D DESIGN', 'STRUCTURAL', 'APPROVALS'] }
  ],

  init(){
    if (!this.modal) return;
    if (!this.bound) {
      this.bound = true;
      this.closeButton.addEventListener('click', () => this.close());
      this.modal.addEventListener('click', e => { if (e.target === this.modal) this.close(); });
      document.addEventListener('keydown', e => {
        if (!this.modal.classList.contains('open')) return;
        if (e.key === 'Escape') this.close();
      });
    }
    /* rows may be re-hydrated from the CMS — bind unbound rows only.
       NB: uses its own marker so ServicePreview's data-preview-bound
       cannot consume it (which used to stop the modal opening). */
    document.querySelectorAll('.svc').forEach((row, i) => {
      if (row.dataset.detailBound) return;
      row.dataset.detailBound = '1';
      const open = () => this.open(row, i);
      row.addEventListener('click', open);
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  },

  open(row, i){
    /* CMS data attributes take priority; hardcoded details[] is the fallback */
    const legacy = this.details[i] || {};
    const tags = safeJson(row.dataset.detailTags) || legacy.tags || [];
    this.lastFocused = document.activeElement;
    this.image.src = row.dataset.img;
    this.image.alt = `${row.querySelector('h3').textContent} service`;
    this.index.textContent = `${row.querySelector('.idx').textContent.trim()} / SERVICE DETAIL`;
    this.title.textContent = row.querySelector('h3').textContent;
    this.description.textContent = row.dataset.description || legacy.description || row.querySelector('p')?.textContent || '';
    this.scope.textContent = row.dataset.scope || legacy.scope || '';
    this.tags.innerHTML = tags.map(tag => `<span>${esc(tag)}</span>`).join('');
    this.modal.classList.add('open');
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    this.closeButton.focus();
  },

  close(){
    this.modal.classList.remove('open');
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this.lastFocused?.focus();
  }
};

/* ---------- ProjectDetails ---------- */
const ProjectDetails = {
  modal: document.getElementById('projectModal'),
  closeButton: document.getElementById('projectModalClose'),
  image: document.getElementById('projectModalImg'),
  meta: document.getElementById('projectModalMeta'),
  status: document.getElementById('projectModalStatus'),
  title: document.getElementById('projectModalTitle'),
  description: document.getElementById('projectModalDesc'),
  progressLabel: document.getElementById('projectModalProgressLabel'),
  progressValue: document.getElementById('projectModalProgressValue'),
  progressBar: document.getElementById('projectModalProgressBar'),
  specs: document.getElementById('projectModalSpecs'),
  lastFocused: null,
  fieldDetails: {
    'Emerald Heights': {
      description: 'An 84-unit residential apartment block with stilt parking, family amenities and a rooftop garden designed for low-maintenance community living.',
      specs: [['UNITS', '84 apartments'], ['AMENITIES', 'Stilt + rooftop garden'], ['LOCATION', 'Gaur, Rautahat'], ['DELIVERY', 'Completed 2024']]
    },
    'Bhoomi Trade Park': {
      description: 'A five-acre G+6 commercial campus with four office blocks, a retail arcade and IGBC pre-certified services design. Block B is currently in construction.',
      specs: [['SITE AREA', '5.0 acres'], ['BUILT-UP AREA', '4.1 Lakh Sq.Ft'], ['SCOPE', '4 office blocks + retail'], ['HANDOVER', 'Q2 2028']]
    },
    'NH-64 Service Corridor': {
      description: 'A 9.2 km service-road package with a six-lane flyover, storm-water drainage and pedestrian underpasses, delivered ahead of schedule.',
      specs: [['LENGTH', '9.2 km'], ['STRUCTURE', '6-lane flyover'], ['SCOPE', 'Road + drainage'], ['DELIVERY', 'Completed 2025']]
    },
    'Verdant Villas — Phase II': {
      description: 'A premium 62-plot villa community with central greens, a clubhouse and coordinated utility infrastructure for a quiet residential neighbourhood.',
      specs: [['PLOTS', '62 villa plots'], ['AMENITIES', 'Clubhouse + greens'], ['LOCATION', 'Gaur, Rautahat'], ['HANDOVER', '2027']]
    },
    'Lakeview Waterworks': {
      description: 'An 18 km piped-water network and elevated reservoir project improving municipal supply reliability across the surrounding settlements.',
      specs: [['NETWORK', '18 km pipeline'], ['ASSET', 'Elevated reservoir'], ['LOCATION', 'Rautahat'], ['DELIVERY', '2027']]
    },
    'The Foundry Lofts': {
      description: 'Adaptive reuse of a 1980s foundry into boutique loft offices, retaining the industrial character while introducing modern services and flexible workspaces.',
      specs: [['TYPE', 'Adaptive reuse'], ['USE', 'Boutique offices'], ['LOCATION', 'Gaur'], ['DELIVERY', 'Completed 2023']]
    }
  },

  init(){
    if (!this.modal) return;
    if (!this.bound) {
      this.bound = true;
      this.closeButton.addEventListener('click', () => this.close());
      this.modal.addEventListener('click', e => { if (e.target === this.modal) this.close(); });
      document.addEventListener('keydown', e => {
        if (this.modal.classList.contains('open') && e.key === 'Escape') this.close();
      });
    }
    /* cards may be re-hydrated from the CMS — bind unbound cards only */
    document.querySelectorAll('.project-card:not([data-bound])').forEach(card => {
      card.dataset.bound = '1';
      const open = () => this.open(card);
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  },

  open(card){
    const image = card.querySelector('.ph img');
    const title = card.querySelector('h3');
    const description = card.querySelector('.desc') || card.querySelector('.in p');
    const meta = card.querySelector('.meta') || [
      card.querySelector('.cat')?.textContent,
      ...[...card.querySelectorAll('.row span')].map(item => item.textContent)
    ].filter(Boolean).join(' · ');
    const specItems = card.querySelectorAll('.spec div');
    const rowItems = card.querySelectorAll('.row span');
    const cardProgress = card.querySelector('.pbar');
    const statusText = card.querySelector('.status, .st')?.textContent || '';
    const domProgress = cardProgress?.querySelector('.lbl span:last-child')?.textContent.match(/\d+/)?.[0]
      || statusText.match(/(\d+)%/)?.[1]
      || (/\bCOMPLETED\b/i.test(statusText) ? '100' : '0');
    /* CMS attributes take priority, then DOM, then legacy field details */
    const progressValue = card.dataset.progress != null ? card.dataset.progress : domProgress;
    const dataSpecs = safeJson(card.dataset.specs);
    const projectDetails = this.fieldDetails[title?.textContent.trim()];

    this.lastFocused = document.activeElement;
    this.image.src = image?.src || '';
    this.image.alt = image?.alt || `${title?.textContent || 'Project'} image`;
    this.meta.textContent = meta || 'PROJECT PORTFOLIO';
    this.status.textContent = statusText.trim();
    this.status.classList.toggle('done', /\bCOMPLETED\b/i.test(statusText));
    this.title.textContent = title?.textContent || 'Project';
    this.description.textContent = card.dataset.description || projectDetails?.description || description?.textContent || 'Project details available on request.';
    this.progressLabel.textContent = cardProgress?.querySelector('.lbl span:first-child')?.textContent
      || (/\bCOMPLETED\b/i.test(statusText) ? 'PROJECT STATUS' : 'CONSTRUCTION PROGRESS');
    this.progressValue.textContent = `${progressValue}%`;
    this.progressBar.style.width = '0%';
    requestAnimationFrame(() => { this.progressBar.style.width = `${progressValue}%`; });
    const detailsSpecs = dataSpecs || projectDetails?.specs || [...specItems].map(item =>
      [item.querySelector('b')?.textContent || 'DETAIL', item.querySelector('span')?.textContent || '']
    );
    this.specs.innerHTML = detailsSpecs.map(([label, value]) =>
      `<div><b>${esc(label)}</b><span>${esc(value)}</span></div>`
    ).join('');
    if (!specItems.length && !projectDetails && !dataSpecs) {
      this.specs.innerHTML = [...rowItems].map((item, i) =>
        `<div><b>${i === 0 ? 'LOCATION' : 'DELIVERY'}</b><span>${esc(item.textContent)}</span></div>`
      ).join('');
    }
    this.modal.classList.add('open');
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    this.closeButton.focus();
  },

  close(){
    this.modal.classList.remove('open');
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this.lastFocused?.focus();
  }
};

/* ---------- ProjectFilter ---------- */
const ProjectFilter = {
  init(){
    const bar = document.getElementById('filters');
    if (!bar) return;
    if (this.bound) {
      /* card set may have changed (CMS) — just re-index */
      this.cards = [...document.querySelectorAll('#pgrid .pcard')];
      return;
    }
    this.bound = true;
    this.cards = [...document.querySelectorAll('#pgrid .pcard')];
    bar.addEventListener('click', e => {
      this.cards = [...document.querySelectorAll('#pgrid .pcard')];
      const btn = e.target.closest('button');
      if (!btn) return;
      bar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.f;
      this.cards.forEach(c => {
        const show = f === 'all' || c.dataset.cat === f;
        c.classList.toggle('hidden', !show);
        if (show) { c.style.animation = 'none'; void c.offsetWidth; c.style.animation = 'pop .5s var(--ease)'; }
      });
    });
  }
};

/* ---------- Lightbox ---------- */
const Lightbox = {
  el:  document.getElementById('lb'),
  img: document.getElementById('lbImg'),
  cap: document.getElementById('lbCap'),
  items: [...document.querySelectorAll('.g-item')],
  cur: 0,

  init(){
    if (!this.el) return;
    this.items = [...document.querySelectorAll('.g-item')];
    if (this.bound) return;
    this.bound = true;
    this.items.forEach((it, i) => it.addEventListener('click', () => this.open(this.items.indexOf(it))));
    this.el.querySelector('.lb-x').addEventListener('click', () => this.close());
    this.el.querySelector('.lb-p').addEventListener('click', e => { e.stopPropagation(); this.step(-1); });
    this.el.querySelector('.lb-n').addEventListener('click', e => { e.stopPropagation(); this.step(1); });
    this.el.addEventListener('click', e => { if (e.target === this.el) this.close(); });
    document.addEventListener('keydown', e => {
      if (!this.el.classList.contains('open')) return;
      if (e.key === 'Escape')     this.close();
      if (e.key === 'ArrowLeft')  this.step(-1);
      if (e.key === 'ArrowRight') this.step(1);
    });
  },
  open(i){
    this.cur = i;
    const it = this.items[i];
    this.img.src = it.dataset.full;
    this.cap.textContent = it.querySelector('figcaption').textContent;
    this.el.classList.add('open');
    document.body.style.overflow = 'hidden';
  },
  step(dir){ this.open((this.cur + dir + this.items.length) % this.items.length); },
  close(){
    this.el.classList.remove('open');
    document.body.style.overflow = '';
  }
};

/* ---------- Testimonials ---------- */
const Testimonials = {
  slides: [...document.querySelectorAll('.t-slide')],
  dots: document.getElementById('tDots'),
  stage: document.getElementById('tStage'),
  i: 0, timer: null, interval: 5000,

  init(){
    /* slides may be re-hydrated from the CMS — re-index and rebuild dots */
    this.slides = [...document.querySelectorAll('.t-slide')];
    this.i = 0;
    clearInterval(this.timer);
    this.dots.innerHTML = '';
    this.slides.forEach((_, i) => {
      const d = document.createElement('i');
      if (i === 0) d.className = 'on';
      d.addEventListener('click', () => this.go(i));
      this.dots.appendChild(d);
    });
    if (!this.bound) {
      this.bound = true;
      document.getElementById('tPrev').addEventListener('click', () => { this.go(this.i - 1); this.autoplay(); });
      document.getElementById('tNext').addEventListener('click', () => { this.go(this.i + 1); this.autoplay(); });
      this.stage.addEventListener('mouseenter', () => clearInterval(this.timer));
      this.stage.addEventListener('mouseleave', () => this.autoplay());
    }
    this.autoplay();
  },
  go(i){
    this.i = (i + this.slides.length) % this.slides.length;
    this.slides.forEach((s, j) => s.classList.toggle('active', j === this.i));
    [...this.dots.children].forEach((d, j) => {
      d.classList.remove('on');
      if (j === this.i) {
        void d.offsetWidth;
        d.classList.add('on');
      }
    });
  },
  autoplay(){
    clearInterval(this.timer);
    if (!Env.reducedMotion) this.timer = setInterval(() => this.go(this.i + 1), this.interval);
  }
};

/* ---------- InquiryForm ---------- */
const InquiryForm = {
  form: document.getElementById('inqForm'),
  ok:   document.getElementById('formOk'),

  init(){
    document.getElementById('refNo').textContent = '2026-' + this.rand4();
    this.form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!this.form.checkValidity()) { this.form.reportValidity(); return; }
      /* honeypot: bots that fill the hidden field are dropped silently */
      if (document.getElementById('fcompany').value) {
        this.form.style.display = 'none';
        document.getElementById('okRef').textContent = '—';
        this.ok.classList.add('show');
        setTimeout(() => {
          this.ok.classList.remove('show');
          this.form.style.display = '';
          this.form.reset();
        }, 4000);
        return;
      }
      /* simple flood control: one submission per browser every 30 s */
      const now = Date.now();
      if (this.lastSubmit && now - this.lastSubmit < 30000) {
        this.showNote('YOUR INQUIRY WAS JUST SENT — PLEASE WAIT A MOMENT BEFORE RESUBMITTING.');
        return;
      }
      this.lastSubmit = now;
      const ref = 'INQ-2026-' + this.rand4();
      const val = id => document.getElementById(id).value.trim();
      const data = {
        ref,
        name: val('fname'),
        phone: val('fphone'),
        email: val('femail'),
        project_type: val('ftype'),
        budget: val('fbudget'),
        message: val('fmsg')
      };
      /* persist to the database when the CMS layer is available;
         without a backend the form keeps its desk-only behaviour */
      let saved = true;
      if (window.Cms && window.Cms.enabled) {
        try { saved = await window.Cms.insertInquiry(data); } catch (err) { saved = false; }
      }
      if (saved) {
        this.hideNote();
        document.getElementById('okRef').textContent = ref;
        this.form.style.display = 'none';
        this.ok.classList.add('show');
        setTimeout(() => {
          this.ok.classList.remove('show');
          this.form.style.display = '';
          this.form.reset();
        }, 6000);
      } else {
        this.showNote();
      }
    });
  },
  rand4(){ return String(Math.floor(Math.random() * 9000) + 1000); },
  showNote(message){
    let note = this.form.querySelector('.form-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'mono form-note';
      this.form.insertBefore(note, this.form.querySelector('button[type="submit"]'));
    }
    note.textContent = message || 'COULD NOT REACH THE OFFICE SERVER — PLEASE CALL US AT THE NUMBER BELOW AND WE WILL LOG IT MANUALLY.';
  },
  hideNote(){
    this.form.querySelector('.form-note')?.remove();
  }
};

/* ---------- NewsDispatch ---------- */
const NewsDispatch = {
  init(){
    /* buttons may be re-hydrated from the CMS — bind unbound ones only */
    document.querySelectorAll('.ncard .more:not([data-bound]), .ann-row .a:not([data-bound])').forEach(button => {
      button.dataset.bound = '1';
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        const container = button.closest('.ncard, .ann-row');
        const detail = container.querySelector('.dispatch, .ann-detail');
        button.setAttribute('aria-expanded', String(!expanded));
        detail.setAttribute('aria-hidden', String(expanded));
        container.classList.toggle('expanded', !expanded);
      });
    });
  }
};

/* ---------- SiteMap ---------- */
const SiteMap = {
  el: document.getElementById('siteMap'),
  coordinates: [26.765302070892798, 85.28065717873261],

  init(){
    if (!this.el || typeof L === 'undefined') return;
    /* Plain wheel must scroll the page; only Ctrl (or trackpad pinch, which
       browsers report as ctrl+wheel) should zoom the map. Leaflet's built-in
       wheel handler is bound before ours, so disable it and drive zoom here. */
    const map = L.map(this.el, { scrollWheelZoom: false }).setView(this.coordinates, 16);
    this.el.addEventListener('wheel', e => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      if (e.deltaY < 0) map.zoomIn(); else map.zoomOut();
    }, { passive: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    L.marker(this.coordinates)
      .addTo(map)
      .bindTooltip('BHOOMI INFRACTECH', {
        permanent: true,
        direction: 'top',
        offset: [0, -12],
        className: 'site-map-label'
      })
      .openTooltip();
  }
};

/* ---------- ActiveNav ---------- */
const ActiveNav = {
  init(){
    const links = {};
    document.querySelectorAll('nav.main a').forEach(a => links[a.getAttribute('href').slice(1)] = a);
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        document.querySelectorAll('nav.main a').forEach(a => a.classList.remove('active'));
        links[e.target.id]?.classList.add('active');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['about', 'services', 'projects', 'method', 'news', 'contact']
      .forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
  }
};

/* ---------- Magnetic ---------- */
const Magnetic = {
  init(){
    if (!Env.finePointer || Env.reducedMotion) return;
    document.querySelectorAll('.magnetic').forEach(b => {
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform =
          `translate(${(e.clientX - r.left - r.width / 2) * .18}px,${(e.clientY - r.top - r.height / 2) * .28}px)`;
      });
      b.addEventListener('mouseleave', () => b.style.transform = '');
    });
  }
};

/* ---------- App bootstrap ---------- */
const App = {
  init(){
    document.documentElement.classList.replace('no-js', 'js');
    Preloader.init();
    ScrollFX.init();
    HeroPhotoStack.init();
    MethodTower.init();
    MobileMenu.init();
    Reveals.init();
    Counters.init();
    Scramble.init();
    HeroTimeWord.init();
    ServicePreview.init();
    ServiceDetails.init();
    ProjectDetails.init();
    ProjectFilter.init();
    Lightbox.init();
    Testimonials.init();
    InquiryForm.init();
    NewsDispatch.init();
    SiteMap.init();
    ActiveNav.init();
    Magnetic.init();
  }
};

/* ---------- CMS re-bind (late-hydration safety net) ----------
   If the CMS resolves after the app already booted (slow network),
   re-run the idempotent inits so re-hydrated nodes get their
   bindings, reveals and slider dots. */
function rebindDynamic(){
  ScrollFX.init();
  ServicePreview.init();
  ServiceDetails.init();
  ProjectDetails.init();
  ProjectFilter.init();
  Lightbox.init();
  Testimonials.init();
  NewsDispatch.init();
  Reveals.init();
}
window.addEventListener('bhoomi:cms-ready', () => {
  if (window.__bhoomiAppReady) rebindDynamic();
});
/* Ensure rebindDynamic runs after __bhoomiAppReady is set (in case the
   bhoomi:cms-ready event fired before the boot sequence completed). */
;(function checkAndRebind(){
  if (window.__bhoomiAppReady) { rebindDynamic(); return; }
  setTimeout(checkAndRebind, 50);
})();

/* ---------- Boot ---------- */
(function start(){
  /* wait for the CMS layer to hydrate content, then initialise the UI */
  (window.Cms ? window.Cms.ready : Promise.resolve()).then(() => {
    App.init();
    window.__bhoomiAppReady = true;
  });
})();
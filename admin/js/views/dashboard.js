/* ==========================================================================
   BHOOMI ADMIN — VIEW: DASHBOARD
   Site analytics: record counts, inquiry activity (last 6 months),
   active build progress, latest inquiries.
   ========================================================================== */
(function () {
  'use strict';

  const UI = window.AdminUI;
  const Api = window.AdminApi;

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const view = {
    kicker: '( 01 — SITE CONTROL )',
    title: 'Dashboard',
    actions() {
      return '<a class="btn" href="../index.html" target="_blank" rel="noopener">' + UI.icon('external', 14) + ' Open Public Site</a>';
    },

    async render(v) {
      const root = v.root;
      root.innerHTML = UI.skel(5);
      try {
        const [projects, inquiries, news, gallery, services] = await Promise.all([
          Api.list('projects'),
          Api.list('inquiries', 'created_at'),
          Api.list('news'),
          Api.list('gallery'),
          Api.list('services')
        ]);
        this.paint(projects, inquiries, news, gallery, services);
      } catch (err) {
        root.innerHTML = UI.errorState(err.message);
        UI.toast(err.message, 'err');
      }
    },

    paint(projects, inquiries, news, gallery, services) {
      const root = document.getElementById('viewRoot');
      if (!root) return;

      const ongoing = projects.filter(p => p.status === 'ongoing');
      const completed = projects.filter(p => p.status === 'completed');
      const newInq = inquiries.filter(r => r.status === 'new').length;
      const hero = gallery.filter(g => g.section === 'hero').length;

      /* ---------- inquiry activity: last 6 months ---------- */
      const now = new Date();
      const buckets = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({ key: d.getFullYear() + '-' + d.getMonth(), label: MONTHS[d.getMonth()], n: 0 });
      }
      inquiries.forEach(r => {
        const d = new Date(r.created_at);
        if (isNaN(d)) return;
        const key = d.getFullYear() + '-' + d.getMonth();
        const b = buckets.find(x => x.key === key);
        if (b) b.n++;
      });
      const maxN = Math.max(1, ...buckets.map(b => b.n));

      /* ---------- active builds ---------- */
      const active = ongoing
        .slice()
        .sort((a, b) => (b.progress || 0) - (a.progress || 0))
        .slice(0, 4);

      /* ---------- latest inquiries ---------- */
      const latest = inquiries.slice(0, 5);

      root.innerHTML =
        '<div class="stat-band">' +
        [
          ['building', projects.length, ongoing.length + ' ONGOING · ' + completed.length + ' COMPLETED'],
          ['inbox', inquiries.length, newInq + ' AWAITING CALL-BACK'],
          ['news', news.length, news.filter(n => n.kind === 'news').length + ' DISPATCHES · ' + news.filter(n => n.kind === 'announcement').length + ' NOTICES'],
          ['image', gallery.length, hero + ' ON THE HERO STACK'],
          ['briefcase', services.length, 'TRADES UNDER ONE ROOF']
        ].map((s, i) => (
          '<div class="stat-card">' +
          '<span class="plus mono">[ FIG.' + String(i + 1).padStart(2, '0') + ' ]</span>' +
          '<span class="stat-ic">' + UI.icon(s[0], 20) + '</span>' +
          '<div class="num">' + s[1] + '</div>' +
          '<div class="mono lbl">' + UI.e(s[2]) + '</div>' +
          '</div>'
        )).join('') +
        '</div>' +

        '<div class="dash-cols">' +
        '<div class="card">' +
        '<div class="card-h"><b>INQUIRY LOG</b><span class="mono">LAST 6 MONTHS</span></div>' +
        '<div class="card-b chart-b">' +
        (inquiries.length
          ? '<div class="chart">' +
            buckets.map(b => (
              '<div class="bar-col">' +
              '<span class="bar-n mono">' + (b.n || '') + '</span>' +
              '<div class="bar" style="height:' + Math.round((b.n / maxN) * 100) + '%"><i></i></div>' +
              '<span class="bar-l mono">' + b.label + '</span>' +
              '</div>'
            )).join('') +
            '</div>'
          : '<p class="mono chart-empty">NO INQUIRIES IN THE LAST 6 MONTHS — THE CONTACT FORM IS LIVE.</p>') +
        '</div></div>' +

        '<div class="card">' +
        '<div class="card-h"><b>ACTIVE BUILDS</b><span class="mono">PROGRESS ON SITE</span></div>' +
        '<div class="card-b active-list">' +
        (active.length
          ? active.map(p => (
            '<div class="ab-row">' +
            '<div class="ab-top"><b>' + UI.e(p.title) + '</b><span class="mono">' + (p.progress || 0) + '%</span></div>' +
            '<div class="prog"><i style="width:' + (p.progress || 0) + '%"></i></div>' +
            '<span class="mono ab-sub">' + UI.e((p.location || '').toUpperCase()) + ' · ' + UI.e(p.period || 'ON SITE') + '</span>' +
            '</div>'
          )).join('')
          : '<p class="mono chart-empty">NO ONGOING BUILDS ON RECORD.</p>') +
        '</div></div>' +
        '</div>' +

        '<div class="card">' +
        '<div class="card-h"><b>LATEST INQUIRIES</b><span class="mono">FROM THE PUBLIC SITE</span>' +
        '<a class="card-link mono" href="#/inquiries">OPEN LOG ' + UI.icon('arrow', 12) + '</a></div>' +
        '<div class="card-b">' +
        (latest.length
          ? '<table class="tbl slim"><thead><tr><th>REF</th><th>CONTACT</th><th>PROJECT</th><th>RECEIVED</th><th>STATUS</th></tr></thead><tbody>' +
            latest.map(r => (
              '<tr>' +
              '<td class="mono ref-c">' + UI.e(r.ref || '—') + '</td>' +
              '<td><b class="cell-t">' + UI.e(r.name) + '</b><span class="mono cell-sub">' + UI.e(r.phone || r.email || '—') + '</span></td>' +
              '<td class="cell-scope">' + UI.e(r.project_type || '—') + '</td>' +
              '<td class="mono">' + UI.fmtDateTime(r.created_at) + '</td>' +
              '<td><span class="chip ' + (r.status === 'new' ? '' : r.status === 'contacted' ? 'done' : 'ghost') + '">' +
              { new: 'NEW', contacted: 'CONTACTED', closed: 'CLOSED' }[r.status] + '</span></td>' +
              '</tr>'
            )).join('') +
            '</tbody></table>'
          : '<p class="mono chart-empty">INBOX CLEAR — NEW INQUIRIES FROM THE CONTACT FORM APPEAR HERE.</p>') +
        '</div></div>'
    },

    onAction(action) {
      if (action === 'site') window.open('../index.html', '_blank');
      if (action === 'retry') this.render({ root: document.getElementById('viewRoot') });
    }
  };

  window.AdminViews = window.AdminViews || {};
  window.AdminViews.dashboard = view;
})();

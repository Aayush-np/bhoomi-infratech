/* ==========================================================================
   BHOOMI ADMIN — VIEW: INQUIRIES
   Contact-form submissions from the public site.
   Search, filters, inline status, detail modal, CSV export, delete.
   ========================================================================== */
(function () {
  'use strict';

  const UI = window.AdminUI;
  const Api = window.AdminApi;

  const STATUSES = ['new', 'contacted', 'closed'];
  const ST_LABEL = { new: 'NEW', contacted: 'CONTACTED', closed: 'CLOSED' };

  const view = {
    kicker: '( 06 — INQUIRY LOG )',
    title: 'Inquiries',
    rows: [],
    filter: 'all',
    q: '',
    type: 'all',

    actions() {
      return '<button class="btn" data-action="export" type="button">' + UI.icon('download', 14) + ' Export CSV</button>';
    },

    async render(v) {
      const root = v.root;
      root.innerHTML =
        '<div class="toolbar">' +
        '<div class="search">' + UI.icon('search', 14) +
        '<input id="iSearch" placeholder="Search name, phone, email, ref…" value="' + UI.e(this.q) + '"></div>' +
        '<div class="tabs">' +
        STATUSES.concat('all').map(f =>
          '<button data-f="' + f + '" class="' + (this.filter === f ? 'active' : '') + '" type="button">' +
          (f === 'all' ? 'All' : ST_LABEL[f]) + '</button>'
        ).join('') +
        '</div>' +
        '<select class="inp sel type-sel" id="iType" aria-label="Filter by project type"><option value="all">ALL PROJECT TYPES</option></select>' +
        '<span class="mono tbl-count" id="iCount"></span>' +
        '</div>' +
        '<div id="iBody">' + UI.skel(5) + '</div>';

      root.querySelector('#iSearch').addEventListener('input', e => { this.q = e.target.value; this.paint(); });
      root.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
        this.filter = b.dataset.f;
        root.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === b));
        this.paint();
      }));
      root.querySelector('#iType').addEventListener('change', e => { this.type = e.target.value; this.paint(); });
      await this.load();
    },

    body() { return document.getElementById('iBody'); },

    async load() {
      const body = this.body();
      if (!body) return;
      body.innerHTML = UI.skel(5);
      try {
        const rows = await Api.list('inquiries', 'created_at');
        rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        this.rows = rows;
        this.fillTypes();
        this.paint();
      } catch (err) {
        body.innerHTML = UI.errorState(err.message);
        UI.toast(err.message, 'err');
      }
    },

    fillTypes() {
      const sel = document.getElementById('iType');
      if (!sel) return;
      const types = [...new Set(this.rows.map(r => r.project_type).filter(Boolean))];
      sel.innerHTML = '<option value="all">ALL PROJECT TYPES</option>' +
        types.map(t => '<option value="' + UI.e(t) + '"' + (this.type === t ? ' selected' : '') + '>' + UI.e(t) + '</option>').join('');
    },

    filtered() {
      const q = this.q.trim().toLowerCase();
      return this.rows.filter(r => {
        if (this.filter !== 'all' && r.status !== this.filter) return false;
        if (this.type !== 'all' && r.project_type !== this.type) return false;
        if (q && ![r.name, r.phone, r.email, r.ref, r.message].join(' ').toLowerCase().includes(q)) return false;
        return true;
      });
    },

    paint() {
      const body = this.body();
      if (!body) return;
      const count = document.getElementById('iCount');
      const list = this.filtered();
      const newCount = this.rows.filter(r => r.status === 'new').length;
      if (count) count.textContent = list.length + ' OF ' + this.rows.length + ' · ' + newCount + ' NEW';

      if (!this.rows.length) {
        body.innerHTML = UI.empty({
          icon: 'inbox', title: 'INBOX CLEAR',
          sub: 'INQUIRIES FROM THE PUBLIC CONTACT FORM LAND HERE.'
        });
        return;
      }
      if (!list.length) {
        body.innerHTML = UI.empty({ icon: 'search', title: 'NO MATCHES', sub: 'TRY A DIFFERENT SEARCH OR FILTER.' });
        return;
      }

      body.innerHTML =
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th class="w-ref">REF</th><th>CONTACT</th><th>PROJECT</th><th>BUDGET</th><th>RECEIVED</th><th>STATUS</th><th class="right w-acts">ACTIONS</th>' +
        '</tr></thead><tbody>' +
        list.map(r => (
          '<tr>' +
          '<td class="mono ref-c">' + UI.e(r.ref || '—') + '</td>' +
          '<td><b class="cell-t">' + UI.e(r.name) + '</b><span class="mono cell-sub">' + UI.e(r.email || 'no email') + ' · ' + UI.e(r.phone || 'no phone') + '</span></td>' +
          '<td class="cell-scope">' + UI.e(r.project_type || '—') + '</td>' +
          '<td class="mono">' + UI.e(r.budget || '—') + '</td>' +
          '<td class="mono" title="' + UI.e(new Date(r.created_at).toLocaleString()) + '">' + UI.fmtDateTime(r.created_at) + '</td>' +
          '<td><select class="sel status-sel" data-action="status" data-id="' + r.id + '" aria-label="Status of ' + UI.e(r.name) + '">' +
          STATUSES.map(s => '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' + ST_LABEL[s] + '</option>').join('') +
          '</select></td>' +
          '<td class="right row-acts">' +
          '<button class="icon-btn" data-action="view" data-id="' + r.id + '" title="Open inquiry" aria-label="Open inquiry from ' + UI.e(r.name) + '">' + UI.icon('eye', 14) + '</button>' +
          '<button class="icon-btn danger" data-action="delete" data-id="' + r.id + '" title="Delete inquiry" aria-label="Delete inquiry from ' + UI.e(r.name) + '">' + UI.icon('trash', 14) + '</button>' +
          '</td></tr>'
        )).join('') +
        '</tbody></table></div>';
    },

    onAction(action, id, evt, el) {
      if (action === 'view') {
        const r = this.rows.find(x => x.id === id);
        if (r) this.openDetail(r);
      }
      if (action === 'status') this.setStatus(id, el.value);
      if (action === 'delete') this.confirmDelete(id);
      if (action === 'export') this.exportCsv();
      if (action === 'retry') this.load();
    },

    async setStatus(id, status) {
      const r = this.rows.find(x => x.id === id);
      if (!r || r.status === status) return;
      try {
        await Api.update('inquiries', id, { status });
        r.status = status;
        UI.toast('Inquiry marked ' + ST_LABEL[status] + '.');
        this.paint();
        if (window.AdminApp) window.AdminApp.refreshCounts();
      } catch (err) { UI.toast(err.message, 'err'); }
    },

    openDetail(r) {
      const d = new Date(r.created_at);
      const m = UI.modal({
        kicker: 'INQUIRY ' + UI.e(r.ref || ''),
        title: r.name,
        body:
          '<div class="inq-grid">' +
          '<div class="inq-meta">' +
          '<div><span class="mono">PHONE</span><b>' + UI.e(r.phone || '—') + '</b></div>' +
          '<div><span class="mono">EMAIL</span><b>' + UI.e(r.email || '—') + '</b></div>' +
          '<div><span class="mono">PROJECT TYPE</span><b>' + UI.e(r.project_type || '—') + '</b></div>' +
          '<div><span class="mono">BUDGET</span><b>' + UI.e(r.budget || '—') + '</b></div>' +
          '<div><span class="mono">RECEIVED</span><b>' + UI.fmtDateTime(d) + '</b></div>' +
          '</div>' +
          '<div class="inq-msg"><span class="mono">PROJECT DETAILS</span><p>' + UI.e(r.message) + '</p></div>' +
          '</div>',
        footer:
          '<div class="inq-foot">' +
          '<div class="inq-status mono">STATUS: <select class="sel status-sel" data-role="st">' +
          STATUSES.map(s => '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' + ST_LABEL[s] + '</option>').join('') +
          '</select></div>' +
          '<button class="btn solid danger" data-role="del" type="button">' + UI.icon('trash', 14) + ' Delete</button>' +
          '</div>'
      });

      m.foot.querySelector('[data-role="st"]').addEventListener('change', e => this.setStatus(r.id, e.target.value));
      m.foot.querySelector('[data-role="del"]').addEventListener('click', () => {
        m.close();
        this.confirmDelete(r.id);
      });
    },

    confirmDelete(id) {
      const r = this.rows.find(x => x.id === id);
      UI.confirm({
        kicker: 'DELETION ORDER',
        title: 'DELETE INQUIRY?',
        text: 'The inquiry from ' + (r ? r.name : 'this contact') + ' (' + (r ? r.ref : '') + ') will be permanently removed from the log.',
        label: 'Delete'
      }).then(async ok => {
        if (!ok) return;
        try {
          await Api.remove('inquiries', id);
          UI.toast('Inquiry removed from the log.');
          await this.load();
          if (window.AdminApp) window.AdminApp.refreshCounts();
        } catch (err) { UI.toast(err.message, 'err'); }
      });
    },

    exportCsv() {
      const list = this.filtered();
      if (!list.length) { UI.toast('Nothing to export.', 'err'); return; }
      const head = ['ref', 'name', 'phone', 'email', 'project_type', 'budget', 'status', 'received'];
      const esc = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
      const lines = [head.join(',')].concat(list.map(r => [
        r.ref, r.name, r.phone, r.email, r.project_type, r.budget, r.status,
        new Date(r.created_at).toISOString()
      ].map(esc).join(',')));
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'bhoomi-inquiries-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      UI.toast(list.length + ' inquiries exported to CSV.');
    }
  };

  window.AdminViews = window.AdminViews || {};
  window.AdminViews.inquiries = view;
})();

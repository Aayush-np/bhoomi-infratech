/* ==========================================================================
   BHOOMI ADMIN — VIEW: PROJECTS
   Register of all builds. Featured (homepage stack) + field register (grid),
   status, progress, specs, image.
   ========================================================================== */
(function () {
  'use strict';

  const UI = window.AdminUI;
  const Api = window.AdminApi;
  const F = window.Forms;

  const CATS = [
    ['residential', 'Residential'],
    ['commercial', 'Commercial'],
    ['infrastructure', 'Infrastructure'],
    ['realestate', 'Real Estate']
  ];
  const catLabel = c => (CATS.find(x => x[0] === c) || [null, c])[1];

  const view = {
    kicker: '( 02 — PROJECT PORTFOLIO )',
    title: 'Projects',
    rows: [],
    filter: 'all',
    q: '',

    actions() {
      return '<button class="btn solid" data-action="new" type="button">' + UI.icon('plus', 14) + ' New Project</button>';
    },

    /* ---------- render ---------- */
    async render(v) {
      const root = v.root;
      root.innerHTML =
        '<div class="toolbar">' +
        '<div class="search">' + UI.icon('search', 14) +
        '<input id="pSearch" placeholder="Search title, client, location…" value="' + UI.e(this.q) + '"></div>' +
        '<div class="tabs">' +
        ['all', 'ongoing', 'completed', 'featured'].map(f =>
          '<button data-f="' + f + '" class="' + (this.filter === f ? 'active' : '') + '" type="button">' +
          { all: 'All', ongoing: 'Ongoing', completed: 'Completed', featured: 'Featured' }[f] + '</button>'
        ).join('') +
        '</div>' +
        '<span class="mono tbl-count" id="pCount"></span>' +
        '</div>' +
        '<div id="pBody">' + UI.skel(5) + '</div>';

      root.querySelector('#pSearch').addEventListener('input', e => { this.q = e.target.value; this.paint(); });
      root.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
        this.filter = b.dataset.f;
        root.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === b));
        this.paint();
      }));
      await this.load();
    },

    body() { return document.getElementById('pBody'); },

    async load() {
      const body = this.body();
      if (!body) return;
      body.innerHTML = UI.skel(5);
      try {
        this.rows = await Api.list('projects');
        this.paint();
      } catch (err) {
        body.innerHTML = UI.errorState(err.message);
        UI.toast(err.message, 'err');
      }
    },

    filtered() {
      const q = this.q.trim().toLowerCase();
      return this.rows.filter(p => {
        if (this.filter === 'ongoing' && p.status !== 'ongoing') return false;
        if (this.filter === 'completed' && p.status !== 'completed') return false;
        if (this.filter === 'featured' && !p.featured) return false;
        if (q && ![p.title, p.client, p.location, p.period, catLabel(p.category)].join(' ').toLowerCase().includes(q)) return false;
        return true;
      });
    },

    paint() {
      const body = this.body();
      if (!body) return;
      const count = document.getElementById('pCount');
      const list = this.filtered();
      if (count) count.textContent = list.length + ' OF ' + this.rows.length + ' RECORDS';

      if (!this.rows.length) {
        body.innerHTML = UI.empty({
          icon: 'building', title: 'NO PROJECTS ON RECORD',
          sub: 'ADD YOUR FIRST BUILD TO THE FIELD REGISTER.',
          action: '<button class="btn solid" data-action="new" type="button">' + UI.icon('plus', 14) + ' New Project</button>'
        });
        return;
      }
      if (!list.length) {
        body.innerHTML = UI.empty({ icon: 'search', title: 'NO MATCHES', sub: 'TRY A DIFFERENT SEARCH OR FILTER.' });
        return;
      }

      body.innerHTML =
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th class="w-thumb"></th><th>PROJECT</th><th>STATUS</th><th>PROGRESS</th><th>PLACEMENT</th><th class="right w-acts">ACTIONS</th>' +
        '</tr></thead><tbody>' +
        list.map(p => {
          const done = p.status === 'completed';
          const prog = done ? 100 : (p.progress || 0);
          return (
            '<tr>' +
            '<td class="thumb-c"><img src="' + UI.e(p.image) + '" alt="" loading="lazy"></td>' +
            '<td><b class="cell-t">' + UI.e(p.title) + '</b>' +
            '<span class="mono cell-sub">' + UI.e(catLabel(p.category).toUpperCase()) +
            (p.location ? ' · ' + UI.e(p.location.toUpperCase()) : '') +
            (p.client ? ' · ' + UI.e(p.client.toUpperCase()) : '') + '</span></td>' +
            '<td>' + (done ? '<span class="chip done">COMPLETED</span>' : '<span class="chip"><i></i>ONGOING</span>') + '</td>' +
            '<td class="prog-c"><div class="prog' + (done ? ' done' : '') + '"><i style="width:' + prog + '%"></i></div><span class="mono">' + prog + '%</span></td>' +
            '<td class="mono cell-place">' +
            (p.featured ? '<span class="pl">FEATURED</span>' : '') +
            (p.in_grid ? '<span class="pl">GRID</span>' : '') +
            '</td>' +
            '<td class="right row-acts">' +
            '<button class="icon-btn" data-action="edit" data-id="' + p.id + '" title="Edit project" aria-label="Edit ' + UI.e(p.title) + '">' + UI.icon('edit', 14) + '</button>' +
            '<button class="icon-btn danger" data-action="delete" data-id="' + p.id + '" title="Delete project" aria-label="Delete ' + UI.e(p.title) + '">' + UI.icon('trash', 14) + '</button>' +
            '</td></tr>'
          );
        }).join('') +
        '</tbody></table></div>';
    },

    /* ---------- actions ---------- */
    onAction(action, id) {
      if (action === 'new') this.openForm();
      if (action === 'edit') {
        const r = this.rows.find(x => x.id === id);
        if (r) this.openForm(r);
      }
      if (action === 'delete') this.confirmDelete(id);
      if (action === 'retry') this.load();
    },

    confirmDelete(id) {
      const p = this.rows.find(x => x.id === id);
      UI.confirm({
        kicker: 'DELETION ORDER',
        title: 'REMOVE PROJECT?',
        text: p
          ? '“' + p.title + '” will be removed from the database and from the public website. This cannot be undone.'
          : 'This record will be removed from the database and the public website.',
        label: 'Delete'
      }).then(async ok => {
        if (!ok) return;
        try {
          if (p && p.image_path) await Api.deleteObject(p.image_path);
          await Api.remove('projects', id);
          UI.toast('Project removed from the record.');
          await this.load();
          if (window.AdminApp) window.AdminApp.refreshCounts();
        } catch (err) { UI.toast(err.message, 'err'); }
      });
    },

    /* ---------- form ---------- */
    openForm(p) {
      const isEdit = !!p;
      const specs = p ? (p.specs || []) : [];
      const m = UI.modal({
        wide: true,
        kicker: isEdit ? 'EDIT PROJECT — ' + UI.e(p.title).toUpperCase() : 'NEW PROJECT',
        title: isEdit ? 'Update the record' : 'Add to the field register',
        body:
          '<form id="pForm" novalidate><div class="fgrid">' +
          F.field('Project title', '<input class="inp" name="title" maxlength="90" value="' + UI.e(p ? p.title : '') + '" placeholder="e.g. Skyline Residency">', true) +
          F.field('Category', '<select class="inp sel" name="category">' +
            CATS.map(c => '<option value="' + c[0] + '"' + (p && p.category === c[0] ? ' selected' : '') + '>' + c[1] + '</option>').join('') +
            '</select>', true) +
          F.field('Status', '<select class="inp sel" name="status" data-role="status">' +
            '<option value="ongoing"' + (!p || p.status === 'ongoing' ? ' selected' : '') + '>Ongoing</option>' +
            '<option value="completed"' + (p && p.status === 'completed' ? ' selected' : '') + '>Completed</option></select>', true) +
          F.field('Sort order', '<input class="inp" type="number" name="sort" min="0" max="999" value="' + (p ? p.sort : 100) + '" title="Lower numbers appear first">', false) +
          '<div class="frow">' +
          '<label class="lbl">CONSTRUCTION PROGRESS</label>' +
          '<div class="range-row">' +
          '<input type="range" class="rng" name="progress" min="0" max="100" step="1" value="' + (p ? (p.status === 'completed' ? 100 : p.progress) : 0) + '" data-role="prog">' +
          '<span class="mono rng-out" data-role="progOut">' + (p ? (p.status === 'completed' ? 100 : p.progress) : 0) + '%</span></div>' +
          '</div>' +
          F.field('Location', '<input class="inp" name="location" maxlength="60" value="' + UI.e(p ? p.location : '') + '" placeholder="e.g. Gaur, Rautahat">') +
          F.field('Client', '<input class="inp" name="client" maxlength="60" value="' + UI.e(p ? p.client : '') + '" placeholder="e.g. Skyline Homes LLP">') +
          F.field('Period', '<input class="inp" name="period" maxlength="24" value="' + UI.e(p ? p.period : '') + '" placeholder="e.g. 2024–2027">') +
          F.field('Short summary (field register card)', '<textarea class="inp" name="summary" rows="2" maxlength="160" placeholder="One line for the grid card…">' + UI.e(p ? p.summary : '') + '</textarea>') +
          F.field('Full description (details modal)', '<textarea class="inp" name="description" rows="4" maxlength="800" placeholder="The full story shown in the project modal…">' + UI.e(p ? p.description : '') + '</textarea>', true) +
          F.field('Project image', '<div data-f="imgf"></div>', true) +
          F.field('Spec sheet (label / value pairs shown in the modal)', '<div data-f="specs"></div>') +
          '<div class="frow two-chk">' +
          '<label class="chk"><input type="checkbox" name="featured"' + (p && p.featured ? ' checked' : '') + '><span>FEATURED STACK — HOMEPAGE TOP CARD</span></label>' +
          '<label class="chk"><input type="checkbox" name="in_grid"' + (!p || p.in_grid ? ' checked' : '') + '><span>FIELD REGISTER — FILTERABLE GRID</span></label>' +
          '</div>' +
          '</div></form>',
        footer:
          '<button class="btn ghost" data-role="cancel" type="button">Cancel</button>' +
          '<button class="btn solid" id="pSave" type="submit" form="pForm">' + UI.icon('check', 14) + ' ' + (isEdit ? 'Save Changes' : 'Add Project') + '</button>'
      });

      const form = m.body.querySelector('#pForm');
      const saveBtn = m.foot.querySelector('#pSave');
      const imgF = F.imageField(m.body.querySelector('[data-f="imgf"]'), { value: p ? p.image : '', path: p ? p.image_path : '' });
      const specF = F.specsEditor(m.body.querySelector('[data-f="specs"]'), specs);

      /* progress display + completed → 100 */
      const prog = form.querySelector('[name="progress"]');
      const out = m.body.querySelector('[data-role="progOut"]');
      const statusSel = form.querySelector('[data-role="status"]');
      function syncProg() {
        const done = statusSel.value === 'completed';
        if (done) { prog.value = 100; prog.disabled = true; } else { prog.disabled = false; }
        out.textContent = prog.value + '%';
      }
      prog.addEventListener('input', () => { out.textContent = prog.value + '%'; });
      statusSel.addEventListener('change', syncProg);
      syncProg();

      m.foot.querySelector('[data-role="cancel"]').addEventListener('click', () => m.close());

      form.addEventListener('submit', async e => {
        e.preventDefault();
        const img = imgF.get();
        const ok = F.validate(m.body.querySelector('#pForm'), [
          { sel: '[name="title"]', test: v => v.trim().length < 3 ? 'Give the project a proper name.' : '' },
          { sel: '[name="description"]', test: v => v.trim().length < 10 ? 'Describe the project (at least 10 characters).' : '' },
          { sel: '[data-f="imgf"]', test: () => img.url ? '' : 'An image is required — upload one from the media vault.' }
        ]);
        if (!ok || imgF.busy()) return;

        const status = statusSel.value;
        const row = {
          title: form.title.value.trim(),
          category: form.category.value,
          status,
          progress: status === 'completed' ? 100 : Math.max(0, Math.min(100, parseInt(form.progress.value, 10) || 0)),
          location: form.location.value.trim(),
          client: form.client.value.trim(),
          period: form.period.value.trim(),
          summary: form.summary.value.trim(),
          description: form.description.value.trim(),
          image: img.url,
          image_path: img.path,
          specs: specF.get(),
          featured: form.featured.checked,
          in_grid: form.in_grid.checked,
          sort: Math.max(0, parseInt(form.sort.value, 10) || 100)
        };
        UI.setBusy(saveBtn, true, isEdit ? 'SAVING…' : 'ADDING…');
        try {
          if (isEdit) await Api.update('projects', p.id, row);
          else await Api.insert('projects', row);
          if (isEdit && p.image_path && p.image_path !== img.path) await Api.deleteObject(p.image_path);
          m.close();
          UI.toast(isEdit ? 'Project updated — the public site reflects it on next visit.' : 'Project added to the field register.');
          await this.load();
          if (window.AdminApp) window.AdminApp.refreshCounts();
        } catch (err) {
          UI.toast(err.message, 'err');
        } finally {
          UI.setBusy(saveBtn, false);
        }
      });
    }
  };

  window.AdminViews = window.AdminViews || {};
  window.AdminViews.projects = view;
})();

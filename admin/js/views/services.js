/* ==========================================================================
   BHOOMI ADMIN — VIEW: SERVICES
   The six (or N) trades under one roof.
   ========================================================================== */
(function () {
  'use strict';

  const UI = window.AdminUI;
  const Api = window.AdminApi;
  const F = window.Forms;

  const view = {
    kicker: '( 03 — SERVICES )',
    title: 'Services',
    rows: [],

    actions() {
      return '<button class="btn solid" data-action="new" type="button">' + UI.icon('plus', 14) + ' New Service</button>';
    },

    async render(v) {
      const root = v.root;
      root.innerHTML =
        '<div class="toolbar"><span class="mono tbl-count" id="sCount"></span></div>' +
        '<div id="sBody">' + UI.skel(6) + '</div>';
      await this.load();
    },

    body() { return document.getElementById('sBody'); },

    async load() {
      const body = this.body();
      if (!body) return;
      body.innerHTML = UI.skel(6);
      try {
        this.rows = await Api.list('services');
        this.paint();
      } catch (err) {
        body.innerHTML = UI.errorState(err.message);
        UI.toast(err.message, 'err');
      }
    },

    paint() {
      const body = this.body();
      if (!body) return;
      const count = document.getElementById('sCount');
      if (count) count.textContent = this.rows.length + ' SERVICES ON FILE';
      if (!this.rows.length) {
        body.innerHTML = UI.empty({
          icon: 'briefcase', title: 'NO SERVICES ON RECORD',
          sub: 'ADD THE TRADES THE COMPANY RUNS UNDER ONE ROOF.',
          action: '<button class="btn solid" data-action="new" type="button">' + UI.icon('plus', 14) + ' New Service</button>'
        });
        return;
      }
      body.innerHTML =
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th class="w-idx"></th><th>SERVICE</th><th>DELIVERY SCOPE</th><th>TAGS</th><th class="right w-acts">ACTIONS</th>' +
        '</tr></thead><tbody>' +
        this.rows.map((s, i) => {
          const tags = Array.isArray(s.tags) ? s.tags : [];
          return (
            '<tr>' +
            '<td class="mono idx-c">/ ' + String(i + 1).padStart(2, '0') + '</td>' +
            '<td><div class="svc-cell">' +
            '<img src="' + UI.e(s.image) + '" alt="" loading="lazy">' +
            '<div><b class="cell-t">' + UI.e(s.title) + '</b><span class="mono cell-sub">' + UI.e(s.summary.slice(0, 90)) + (s.summary.length > 90 ? '…' : '') + '</span></div>' +
            '</div></td>' +
            '<td class="cell-scope">' + UI.e(s.scope) + '</td>' +
            '<td class="cell-tags">' + tags.slice(0, 4).map(t => '<span class="chip">' + UI.e(t) + '</span>').join('') + '</td>' +
            '<td class="right row-acts">' +
            '<button class="icon-btn" data-action="edit" data-id="' + s.id + '" title="Edit service" aria-label="Edit ' + UI.e(s.title) + '">' + UI.icon('edit', 14) + '</button>' +
            '<button class="icon-btn danger" data-action="delete" data-id="' + s.id + '" title="Delete service" aria-label="Delete ' + UI.e(s.title) + '">' + UI.icon('trash', 14) + '</button>' +
            '</td></tr>'
          );
        }).join('') +
        '</tbody></table></div>';
    },

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
      const s = this.rows.find(x => x.id === id);
      UI.confirm({
        kicker: 'DELETION ORDER',
        title: 'REMOVE SERVICE?',
        text: s
          ? '“' + s.title + '” will disappear from the services section of the public website.'
          : 'This record will be removed from the database.',
        label: 'Delete'
      }).then(async ok => {
        if (!ok) return;
        try {
          if (s && s.image_path) await Api.deleteObject(s.image_path);
          await Api.remove('services', id);
          UI.toast('Service removed from the record.');
          await this.load();
          if (window.AdminApp) window.AdminApp.refreshCounts();
        } catch (err) { UI.toast(err.message, 'err'); }
      });
    },

    openForm(s) {
      const isEdit = !!s;
      const m = UI.modal({
        kicker: isEdit ? 'EDIT SERVICE — ' + UI.e(s.title).toUpperCase() : 'NEW SERVICE',
        title: isEdit ? 'Update the trade' : 'Add a trade under the roof',
        body:
          '<form id="sForm" novalidate><div class="fgrid">' +
          F.field('Service title', '<input class="inp" name="title" maxlength="80" value="' + UI.e(s ? s.title : '') + '" placeholder="e.g. Civil Construction">', true) +
          F.field('Sort order', '<input class="inp" type="number" name="sort" min="0" max="999" value="' + (s ? s.sort : 100) + '">', false) +
          F.field('List summary (services section)', '<textarea class="inp" name="summary" rows="3" maxlength="400" placeholder="The paragraph shown in the services list…">' + UI.e(s ? s.summary : '') + '</textarea>', true) +
          F.field('Delivery scope (details card)', '<input class="inp" name="scope" maxlength="90" value="' + UI.e(s ? s.scope : '') + '" placeholder="e.g. Turnkey RCC · Residential · Commercial">' + '', false) +
          F.field('Full description (details card)', '<textarea class="inp" name="description" rows="3" maxlength="600" placeholder="Shown in the service details card…">' + UI.e(s ? s.description : '') + '</textarea>', true) +
          F.field('Service image', '<div data-f="imgf"></div>', true) +
          F.field('List tags', '<div data-f="tags"></div>') +
          F.field('Details-card tags', '<div data-f="dtags"></div>') +
          '</div></form>',
        footer:
          '<button class="btn ghost" data-role="cancel" type="button">Cancel</button>' +
          '<button class="btn solid" id="sSave" type="submit" form="sForm">' + UI.icon('check', 14) + ' ' + (isEdit ? 'Save Changes' : 'Add Service') + '</button>'
      });

      const form = m.body.querySelector('#sForm');
      const saveBtn = m.foot.querySelector('#sSave');
      const imgF = F.imageField(m.body.querySelector('[data-f="imgf"]'), { value: s ? s.image : '', path: s ? s.image_path : '' });
      const tagsF = F.tagsEditor(m.body.querySelector('[data-f="tags"]'), s ? s.tags : null, 'COMMERCIAL, RESIDENTIAL, INDUSTRIAL');
      const dtagsF = F.tagsEditor(m.body.querySelector('[data-f="dtags"]'), s ? s.detail_tags : null, 'FOUNDATION, RCC STRUCTURE, FINISHING');

      m.foot.querySelector('[data-role="cancel"]').addEventListener('click', () => m.close());

      form.addEventListener('submit', async e => {
        e.preventDefault();
        const img = imgF.get();
        const ok = F.validate(m.body.querySelector('#sForm'), [
          { sel: '[name="title"]', test: v => v.trim().length < 3 ? 'Give the service a name.' : '' },
          { sel: '[name="summary"]', test: v => v.trim().length < 10 ? 'Write the list summary (at least 10 characters).' : '' },
          { sel: '[name="description"]', test: v => v.trim().length < 10 ? 'Write the details-card description.' : '' },
          { sel: '[data-f="imgf"]', test: () => img.url ? '' : 'An image is required — upload one from the media vault.' }
        ]);
        if (!ok || imgF.busy()) return;

        const row = {
          title: form.title.value.trim(),
          summary: form.summary.value.trim(),
          description: form.description.value.trim(),
          scope: form.scope.value.trim(),
          image: img.url,
          image_path: img.path,
          tags: tagsF.get(),
          detail_tags: dtagsF.get(),
          sort: Math.max(0, parseInt(form.sort.value, 10) || 100)
        };
        UI.setBusy(saveBtn, true, isEdit ? 'SAVING…' : 'ADDING…');
        try {
          if (isEdit) await Api.update('services', s.id, row);
          else await Api.insert('services', row);
          if (isEdit && s.image_path && s.image_path !== img.path) await Api.deleteObject(s.image_path);
          m.close();
          UI.toast(isEdit ? 'Service updated — the public site reflects it on next visit.' : 'Service added to the roof.');
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
  window.AdminViews.services = view;
})();

/* ==========================================================================
   BHOOMI ADMIN — VIEW: NEWS & ANNOUNCEMENTS
   News cards (photo + dispatch) and announcement rows (notices / bulletins).
   ========================================================================== */
(function () {
  'use strict';

  const UI = window.AdminUI;
  const Api = window.AdminApi;
  const F = window.Forms;

  const view = {
    kicker: '( 05 — NEWS & ANNOUNCEMENTS )',
    title: 'News & Notices',
    rows: [],
    filter: 'all',
    q: '',

    actions() {
      return (
        '<button class="btn solid" data-action="new-news" type="button">' + UI.icon('plus', 14) + ' New News</button>' +
        '<button class="btn" data-action="new-ann" type="button">' + UI.icon('plus', 14) + ' New Announcement</button>'
      );
    },

    async render(v) {
      const root = v.root;
      root.innerHTML =
        '<div class="toolbar">' +
        '<div class="search">' + UI.icon('search', 14) +
        '<input id="nSearch" placeholder="Search headlines, categories…" value="' + UI.e(this.q) + '"></div>' +
        '<div class="tabs">' +
        ['all', 'news', 'announcement'].map(f =>
          '<button data-f="' + f + '" class="' + (this.filter === f ? 'active' : '') + '" type="button">' +
          { all: 'All', news: 'News Cards', announcement: 'Announcements' }[f] + '</button>'
        ).join('') +
        '</div>' +
        '<span class="mono tbl-count" id="nCount"></span>' +
        '</div>' +
        '<div id="nBody">' + UI.skel(5) + '</div>';

      root.querySelector('#nSearch').addEventListener('input', e => { this.q = e.target.value; this.paint(); });
      root.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
        this.filter = b.dataset.f;
        root.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === b));
        this.paint();
      }));
      await this.load();
    },

    body() { return document.getElementById('nBody'); },

    async load() {
      const body = this.body();
      if (!body) return;
      body.innerHTML = UI.skel(5);
      try {
        this.rows = await Api.list('news');
        this.paint();
      } catch (err) {
        body.innerHTML = UI.errorState(err.message);
        UI.toast(err.message, 'err');
      }
    },

    filtered() {
      const q = this.q.trim().toLowerCase();
      return this.rows.filter(n => {
        if (this.filter !== 'all' && n.kind !== this.filter) return false;
        if (q && ![n.title, n.category, n.excerpt].join(' ').toLowerCase().includes(q)) return false;
        return true;
      });
    },

    paint() {
      const body = this.body();
      if (!body) return;
      const count = document.getElementById('nCount');
      const list = this.filtered();
      if (count) count.textContent = list.length + ' OF ' + this.rows.length + ' ITEMS';

      if (!this.rows.length) {
        body.innerHTML = UI.empty({
          icon: 'news', title: 'NOTHING IN THE BULLETIN',
          sub: 'PUBLISH NEWS CARD OR SITE NOTICE.',
          action: '<button class="btn solid" data-action="new-news" type="button">' + UI.icon('plus', 14) + ' New News</button>'
        });
        return;
      }
      if (!list.length) {
        body.innerHTML = UI.empty({ icon: 'search', title: 'NO MATCHES', sub: 'TRY A DIFFERENT SEARCH OR FILTER.' });
        return;
      }

      body.innerHTML =
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th class="w-kind">TYPE</th><th>HEADLINE</th><th>CATEGORY</th><th>DATE</th><th class="right w-acts">ACTIONS</th>' +
        '</tr></thead><tbody>' +
        list.map(n => (
          '<tr>' +
          '<td>' + (n.kind === 'news'
            ? '<span class="chip news">NEWS</span>'
            : '<span class="chip ann">ANNOUNCEMENT</span>') + '</td>' +
          '<td><div class="svc-cell">' +
          (n.image ? '<img src="' + UI.e(n.image) + '" alt="" loading="lazy">' : '<span class="ann-mark mono">' + UI.e(n.kind === 'news' ? 'ART' : 'NOT') + '</span>') +
          '<div><b class="cell-t">' + UI.e(n.title) + '</b>' +
          (n.excerpt ? '<span class="mono cell-sub">' + UI.e(n.excerpt.slice(0, 90)) + (n.excerpt.length > 90 ? '…' : '') + '</span>' : '') +
          '</div></div></td>' +
          '<td><span class="chip ghost">' + UI.e(n.category || '—') + '</span></td>' +
          '<td class="mono">' + UI.fmtDate(n.date) + '</td>' +
          '<td class="right row-acts">' +
          '<button class="icon-btn" data-action="edit" data-id="' + n.id + '" title="Edit" aria-label="Edit item">' + UI.icon('edit', 14) + '</button>' +
          '<button class="icon-btn danger" data-action="delete" data-id="' + n.id + '" title="Delete" aria-label="Delete item">' + UI.icon('trash', 14) + '</button>' +
          '</td></tr>'
        )).join('') +
        '</tbody></table></div>';
    },

    onAction(action, id) {
      if (action === 'new-news') this.openForm({ kind: 'news' });
      if (action === 'new-ann') this.openForm({ kind: 'announcement' });
      if (action === 'edit') {
        const r = this.rows.find(x => x.id === id);
        if (r) this.openForm(r);
      }
      if (action === 'delete') this.confirmDelete(id);
      if (action === 'retry') this.load();
    },

    confirmDelete(id) {
      const n = this.rows.find(x => x.id === id);
      UI.confirm({
        kicker: 'DELETION ORDER',
        title: 'REMOVE ITEM?',
        text: '“' + (n ? n.title : 'This item') + '” will be pulled from the news section of the public website.',
        label: 'Delete'
      }).then(async ok => {
        if (!ok) return;
        try {
          if (n && n.image_path) await Api.deleteObject(n.image_path);
          await Api.remove('news', id);
          UI.toast('Item pulled from the bulletin.');
          await this.load();
          if (window.AdminApp) window.AdminApp.refreshCounts();
        } catch (err) { UI.toast(err.message, 'err'); }
      });
    },

    openForm(n) {
      const isEdit = !!n && n.id;
      const kind = n.kind || 'news';
      const isNews = kind === 'news';
      const today = new Date().toISOString().slice(0, 10);

      const m = UI.modal({
        wide: true,
        kicker: isEdit
          ? (isNews ? 'EDIT NEWS CARD' : 'EDIT ANNOUNCEMENT') + ' — ' + UI.e((n.title || '').slice(0, 40)).toUpperCase()
          : (isNews ? 'NEW NEWS CARD' : 'NEW ANNOUNCEMENT'),
        title: isEdit ? 'Update the dispatch' : (isNews ? 'Publish a dispatch' : 'Post a site notice'),
        body:
          '<form id="nForm" novalidate><div class="fgrid">' +
          F.field(isNews ? 'Headline' : 'Notice line', '<input class="inp" name="title" maxlength="140" value="' + UI.e(n ? n.title : '') + '" placeholder="' + (isNews ? 'e.g. Two new tower cranes join the fleet' : 'e.g. Monsoon pour-window update: night pours') + '">', true) +
          F.field(isNews ? 'Category' : 'Notice type',
            '<select class="inp sel" name="category">' +
            (isNews
              ? ['CONTRACT', 'COMPANY', 'FLEET', 'MILESTONE', 'EVENT'].map(c => '<option' + (n && n.category === c ? ' selected' : '') + '>' + c + '</option>').join('')
              : ['SITE NOTICE', 'SCHEDULE', 'REALTY', 'BULLETIN', 'SAFETY'].map(c => '<option' + (n && n.category === c ? ' selected' : '') + '>' + c + '</option>').join('')) +
            '</select>', true) +
          F.field('Date', '<input class="inp" type="date" name="date" value="' + UI.e(n ? String(n.date).slice(0, 10) : today) + '">', true) +
          (isNews ? F.field('Excerpt (card text)', '<textarea class="inp" name="excerpt" rows="2" maxlength="220" placeholder="The short paragraph under the headline…">' + UI.e(n ? n.excerpt : '') + '</textarea>', true) : '') +
          F.field(isNews ? 'Dispatch body (expandable detail)' : 'Detail text (expandable)', '<textarea class="inp" name="body" rows="4" maxlength="900" placeholder="The full text revealed when the visitor expands the item…">' + UI.e(n ? n.body : '') + '</textarea>', true) +
          (isNews
            ? F.field('Card image', '<div data-f="imgf"></div>', true)
            : F.field('Action label (button on the row)', '<input class="inp" name="cta" maxlength="14" value="' + UI.e(n ? n.cta : 'UPDATE') + '" placeholder="UPDATE / HIRING / VISITS / REPORT">')) +
          F.field('Sort order', '<input class="inp" type="number" name="sort" min="0" max="999" value="' + (n ? n.sort : 100) + '">', false) +
          '</div></form>',
        footer:
          '<button class="btn ghost" data-role="cancel" type="button">Cancel</button>' +
          '<button class="btn solid" id="nSave" type="submit" form="nForm">' + UI.icon('check', 14) + ' ' + (isEdit ? 'Save Changes' : 'Publish') + '</button>'
      });

      const form = m.body.querySelector('#nForm');
      const saveBtn = m.foot.querySelector('#nSave');
      const imgF = isNews
        ? F.imageField(m.body.querySelector('[data-f="imgf"]'), { value: n ? n.image : '', path: n ? n.image_path : '' })
        : { get: () => ({ url: '', path: '' }), busy: () => false };

      m.foot.querySelector('[data-role="cancel"]').addEventListener('click', () => m.close());

      form.addEventListener('submit', async e => {
        e.preventDefault();
        const img = imgF.get();
        const rules = [
          { sel: '[name="title"]', test: v => v.trim().length < 8 ? 'Write the headline / notice line.' : '' },
          { sel: '[name="date"]', test: v => v ? '' : 'Pick the date.' },
          { sel: '[name="body"]', test: v => v.trim().length < 10 ? 'Write the expandable detail text.' : '' }
        ];
        if (isNews) {
          rules.push(
            { sel: '[name="excerpt"]', test: v => v.trim().length < 10 ? 'Write the card excerpt.' : '' },
            { sel: '[data-f="imgf"]', test: () => img.url ? '' : 'A card image is required.' }
          );
        }
        if (!F.validate(m.body.querySelector('#nForm'), rules) || imgF.busy()) return;

        const row = {
          kind,
          category: form.category.value.trim(),
          cta: isNews ? 'READ DISPATCH' : (form.cta ? form.cta.value.trim() : 'UPDATE').toUpperCase(),
          date: form.date.value,
          title: form.title.value.trim(),
          excerpt: isNews ? form.excerpt.value.trim() : '',
          body: form.body.value.trim(),
          image: isNews ? img.url : '',
          image_path: isNews ? img.path : '',
          sort: Math.max(0, parseInt(form.sort.value, 10) || 100)
        };
        UI.setBusy(saveBtn, true, isEdit ? 'SAVING…' : 'PUBLISHING…');
        try {
          if (isEdit) await Api.update('news', n.id, row);
          else await Api.insert('news', row);
          if (isEdit && n.image_path && n.image_path !== img.path) await Api.deleteObject(n.image_path);
          m.close();
          UI.toast(isEdit ? 'Item updated — the public site reflects it on next visit.' : 'Dispatch published to the site.');
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
  window.AdminViews.news = view;
})();

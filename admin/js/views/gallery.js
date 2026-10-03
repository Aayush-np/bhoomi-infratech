/* ==========================================================================
   BHOOMI ADMIN — VIEW: GALLERY
   Site gallery masonry + homepage hero photo stack.
   Upload (multi), captions, reorder, section move, replace, delete.
   ========================================================================== */
(function () {
  'use strict';

  const UI = window.AdminUI;
  const Api = window.AdminApi;

  const view = {
    kicker: '( 04 — SITE GALLERY )',
    title: 'Gallery',
    rows: [],
    filter: 'all',

    actions() {
      return '<button class="btn solid" data-action="upload" type="button">' + UI.icon('upload', 14) + ' Upload Images</button>';
    },

    async render(v) {
      const root = v.root;
      root.innerHTML =
        '<div class="toolbar">' +
        '<div class="tabs">' +
        ['all', 'gallery', 'hero'].map(f =>
          '<button data-f="' + f + '" class="' + (this.filter === f ? 'active' : '') + '" type="button">' +
          { all: 'All', gallery: 'Site Gallery', hero: 'Hero Stack' }[f] + '</button>'
        ).join('') +
        '</div>' +
        '<span class="mono tbl-count" id="gCount"></span>' +
        '<span class="mono g-hint">HERO STACK — UP TO 5 IMAGES ROTATE ON THE HOMEPAGE</span>' +
        '</div>' +
        '<div id="gBody">' + UI.skel(3) + '</div>';

      root.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
        this.filter = b.dataset.f;
        root.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === b));
        this.paint();
      }));
      await this.load();
    },

    body() { return document.getElementById('gBody'); },

    async load() {
      const body = this.body();
      if (!body) return;
      body.innerHTML = UI.skel(3);
      try {
        this.rows = await Api.list('gallery');
        this.paint();
      } catch (err) {
        body.innerHTML = UI.errorState(err.message);
        UI.toast(err.message, 'err');
      }
    },

    filtered() {
      return this.rows.filter(g => this.filter === 'all' || g.section === this.filter);
    },

    paint() {
      const body = this.body();
      if (!body) return;
      const count = document.getElementById('gCount');
      const list = this.filtered();
      if (count) {
        const gal = this.rows.filter(g => g.section === 'gallery').length;
        const hero = this.rows.filter(g => g.section === 'hero').length;
        count.textContent = gal + ' GALLERY · ' + hero + ' HERO';
      }
      if (!this.rows.length) {
        body.innerHTML = UI.empty({
          icon: 'image', title: 'THE VAULT IS EMPTY',
          sub: 'UPLOAD SITE PHOTOGRAPHY TO THE MEDIA VAULT.',
          action: '<button class="btn solid" data-action="upload" type="button">' + UI.icon('upload', 14) + ' Upload Images</button>'
        });
        return;
      }
      body.innerHTML =
        '<div class="gal-admin">' +
        list.map(g => {
          const idx = this.filtered().indexOf(g);
          return (
            '<figure class="g-card" data-id="' + g.id + '">' +
            '<div class="g-card-ph"><img src="' + UI.e(g.image) + '" alt="' + UI.e(g.caption) + '" loading="lazy">' +
            '<span class="chip ' + (g.section === 'hero' ? 'hero' : '') + '">' + (g.section === 'hero' ? 'HERO' : 'GALLERY') + '</span>' +
            '</div>' +
            '<figcaption class="g-card-in">' +
            '<input class="inp cap-inp" data-role="cap" value="' + UI.e(g.caption) + '" placeholder="CAPTION…" maxlength="90" aria-label="Caption">' +
            '<div class="g-card-acts">' +
            '<button class="icon-btn" data-action="up" data-id="' + g.id + '" title="Move up" aria-label="Move up" ' + (idx === 0 ? 'disabled' : '') + '>' + UI.icon('up', 13) + '</button>' +
            '<button class="icon-btn" data-action="down" data-id="' + g.id + '" title="Move down" aria-label="Move down" ' + (idx === list.length - 1 ? 'disabled' : '') + '>' + UI.icon('down', 13) + '</button>' +
            '<button class="icon-btn" data-action="flip" data-id="' + g.id + '" title="' + (g.section === 'hero' ? 'Move to site gallery' : 'Move to hero stack') + '" aria-label="Change section">' + UI.icon('arrow', 13) + '</button>' +
            '<button class="icon-btn" data-action="replace" data-id="' + g.id + '" title="Replace image" aria-label="Replace image">' + UI.icon('image', 13) + '</button>' +
            '<button class="icon-btn danger" data-action="delete" data-id="' + g.id + '" title="Delete image" aria-label="Delete image">' + UI.icon('trash', 13) + '</button>' +
            '</div></figcaption>' +
            '</figure>'
          );
        }).join('') +
        '</div>';

      body.querySelectorAll('[data-role="cap"]').forEach(inp => {
        inp.addEventListener('change', async () => {
          const g = this.rows.find(x => x.id === inp.closest('.g-card').dataset.id);
          if (!g || g.caption === inp.value.trim()) return;
          try {
            await Api.update('gallery', g.id, { caption: inp.value.trim() });
            g.caption = inp.value.trim();
            UI.toast('Caption saved.');
          } catch (err) { UI.toast(err.message, 'err'); }
        });
      });
    },

    onAction(action, id, evt, el) {
      if (action === 'upload') this.openUpload();
      if (action === 'delete') this.confirmDelete(id);
      if (action === 'replace') this.replace(id);
      if (action === 'flip') this.flip(id);
      if (action === 'up' || action === 'down') this.move(id, action === 'up' ? -1 : 1);
      if (action === 'retry') this.load();
    },

    async move(id, dir) {
      const list = this.filtered();
      const i = list.findIndex(g => g.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      const a = list[i], b = list[j];
      if (a.sort === b.sort) return;
      try {
        const tmp = a.sort;
        await Api.update('gallery', a.id, { sort: b.sort });
        await Api.update('gallery', b.id, { sort: tmp });
        UI.toast('Image reordered.');
        await this.load();
      } catch (err) { UI.toast(err.message, 'err'); }
    },

    async flip(id) {
      const g = this.rows.find(x => x.id === id);
      if (!g) return;
      try {
        await Api.update('gallery', g.id, { section: g.section === 'hero' ? 'gallery' : 'hero' });
        UI.toast('Moved to ' + (g.section === 'hero' ? 'site gallery' : 'hero stack') + '.');
        await this.load();
      } catch (err) { UI.toast(err.message, 'err'); }
    },

    replace(id) {
      const g = this.rows.find(x => x.id === id);
      if (!g) return;
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.addEventListener('change', async () => {
        const f = inp.files && inp.files[0];
        if (!f) return;
        const bad = UI.fileOk(f);
        if (bad) { UI.toast(bad, 'err'); return; }
        const m = UI.modal({
          kicker: 'REPLACING IMAGE',
          title: g.caption || 'Site image',
          body: '<div class="up-modal"><div class="up-bar"><i style="width:0%"></i></div><p class="mono" data-role="state">UPLOADING TO MEDIA VAULT…</p></div>'
        });
        try {
          const r = await Api.upload(f, pct => {
            m.body.querySelector('.up-bar i').style.width = pct + '%';
          });
          if (g.image_path) await Api.deleteObject(g.image_path);
          await Api.update('gallery', g.id, { image: r.url, image_path: r.path });
          m.close();
          UI.toast('Image replaced.');
          await this.load();
        } catch (err) {
          m.close();
          UI.toast(err.message, 'err');
        }
      });
      inp.click();
    },

    confirmDelete(id) {
      const g = this.rows.find(x => x.id === id);
      UI.confirm({
        kicker: 'DELETION ORDER',
        title: 'DELETE IMAGE?',
        text: '“' + (g ? g.caption || 'Untitled image' : 'This image') + '” will be removed from the media vault and the website.',
        label: 'Delete'
      }).then(async ok => {
        if (!ok) return;
        try {
          if (g && g.image_path) await Api.deleteObject(g.image_path);
          await Api.remove('gallery', id);
          UI.toast('Image removed from the vault.');
          await this.load();
          if (window.AdminApp) window.AdminApp.refreshCounts();
        } catch (err) { UI.toast(err.message, 'err'); }
      });
    },

    /* ---------- multi-upload ---------- */
    openUpload() {
      let section = this.filter === 'hero' ? 'hero' : 'gallery';
      const m = UI.modal({
        kicker: 'MEDIA VAULT',
        title: 'Upload site photography',
        body:
          '<div class="up-modal">' +
          '<div class="frow"><label class="lbl">DESTINATION</label>' +
          '<select class="inp sel" id="upSection">' +
          '<option value="gallery">SITE GALLERY — MASONRY SECTION</option>' +
          '<option value="hero"' + (section === 'hero' ? ' selected' : '') + '>HERO STACK — HOMEPAGE ROTATOR</option>' +
          '</select></div>' +
          '<div class="dropzone" id="upDrop" tabindex="0" role="button" aria-label="Choose images">' +
          UI.icon('upload', 30) +
          '<b>BROWSE SITE IMAGERY</b>' +
          '<span class="mono">JPG · PNG · WEBP — UP TO 6 MB EACH</span>' +
          '<input type="file" accept="image/*" multiple id="upFiles" hidden>' +
          '</div>' +
          '<div class="up-files mono" id="upFilesList"></div>' +
          '<div class="up-bar" id="upBar" hidden><i style="width:0%"></i></div>' +
          '</div>',
        footer:
          '<button class="btn ghost" data-role="cancel" type="button">Cancel</button>' +
          '<button class="btn solid" id="upGo" disabled>' + UI.icon('check', 14) + ' Upload</button>'
      });

      const drop = m.body.querySelector('#upDrop');
      const filesInp = m.body.querySelector('#upFiles');
      const list = m.body.querySelector('#upFilesList');
      const bar = m.body.querySelector('#upBar');
      const goBtn = m.foot.querySelector('#upGo');
      let files = [];

      function setFiles(fl) {
        files = [...fl].filter(Boolean);
        list.innerHTML = files.length
          ? files.map((f, i) => '<span class="up-file">' + (i + 1) + '. ' + UI.e(f.name) + ' — ' + Math.round(f.size / 1024) + ' KB</span>').join('')
          : '';
        goBtn.disabled = !files.length;
      }
      drop.addEventListener('click', () => filesInp.click());
      drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); filesInp.click(); } });
      ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('on'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('on'); }));
      drop.addEventListener('drop', e => setFiles(e.dataTransfer && e.dataTransfer.files));
      filesInp.addEventListener('change', () => { setFiles(filesInp.files); filesInp.value = ''; });

      m.foot.querySelector('[data-role="cancel"]').addEventListener('click', () => m.close());

      goBtn.addEventListener('click', async () => {
        const bad = files.map(f => UI.fileOk(f)).find(Boolean);
        if (bad) { UI.toast(bad, 'err'); return; }
        const target = m.body.querySelector('#upSection').value;
        UI.setBusy(goBtn, true, 'UPLOADING…');
        bar.hidden = false;
        const maxSort = this.rows.filter(g => g.section === target).reduce((mx, g) => Math.max(mx, g.sort || 0), 0);
        let ok = 0, err = null;
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          try {
            const r = await Api.upload(f);
            await Api.insert('gallery', {
              image: r.url,
              image_path: r.path,
              caption: (f.name || 'SITE IMAGE').replace(/\.[a-z0-9]+$/i, '').toUpperCase().replace(/[-_]/g, ' '),
              section: target,
              sort: maxSort + 10 * (i + 1)
            });
            ok++;
          } catch (e2) { err = e2; }
          bar.querySelector('i').style.width = Math.round(((i + 1) / files.length) * 100) + '%';
        }
        UI.setBusy(goBtn, false);
        if (err) {
          UI.toast('Some images failed: ' + err.message, 'err');
        } else {
          m.close();
          UI.toast(ok + (ok === 1 ? ' image' : ' images') + ' added to the ' + (target === 'hero' ? 'hero stack' : 'site gallery') + '.');
          await this.load();
          if (window.AdminApp) window.AdminApp.refreshCounts();
          return;
        }
      });
    }
  };

  window.AdminViews = window.AdminViews || {};
  window.AdminViews.gallery = view;
})();

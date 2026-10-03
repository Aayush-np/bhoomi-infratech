/* ==========================================================================
   BHOOMI ADMIN — FORM COMPONENTS
   Field markup, validation, image uploader, specs editor, tags editor.
   ========================================================================== */
(function () {
  'use strict';

  const UI = window.AdminUI;
  const Api = window.AdminApi;

  /* ---------- field wrapper ---------- */
  function field(label, control, req) {
    return (
      '<div class="frow">' +
      '<label class="lbl">' + UI.e(label) + (req ? ' *' : '') + '</label>' +
      control +
      '<p class="err-msg" data-err hidden></p>' +
      '</div>'
    );
  }

  /* ---------- validation ----------
     rules: [{ sel: css selector inside root, test: (value) => errorMsg | '' }] */
  function validate(root, rules) {
    let ok = true, first = null;
    rules.forEach(function (f) {
      const el = root.querySelector(f.sel);
      if (!el) return;
      const box = el.closest('.frow') || el.parentElement;
      const errEl = box && box.querySelector('[data-err]');
      const bad = f.test(el.value);
      if (bad) {
        if (errEl) { errEl.textContent = bad; errEl.hidden = false; }
        el.classList.add('err');
        if (ok) first = el;
        ok = false;
      } else {
        if (errEl) errEl.hidden = true;
        el.classList.remove('err');
      }
    });
    if (first) first.focus();
    return ok;
  }

  /* ---------- image uploader ----------
     container must be empty; returns { get(): {url, path} } */
  function imageField(container, opts) {
    opts = opts || {};
    let url = opts.value || '';
    let path = opts.path || '';
    let busy = false;

    container.innerHTML =
      '<div class="imgf" data-f="imgf">' +
      '<div class="imgf-prev">' + (url ? '<img src="' + UI.e(url) + '" alt="">' : UI.icon('image', 30)) + '</div>' +
      '<div class="imgf-side">' +
      '<span class="mono imgf-state">' + (url ? 'IMAGE ON FILE' : 'NO IMAGE YET') + '</span>' +
      '<div class="imgf-acts">' +
      '<button class="icon-btn" data-role="pick" type="button">' + UI.icon('upload', 14) + ' UPLOAD</button>' +
      '<button class="icon-btn" data-role="rm" type="button" aria-label="Remove image" ' + (url ? '' : 'disabled') + '>' + UI.icon('trash', 14) + '</button>' +
      '</div>' +
      '<input type="file" accept="image/*" data-role="file" hidden>' +
      '</div></div>';

    const prev = container.querySelector('.imgf-prev');
    const state = container.querySelector('.imgf-state');
    const rmBtn = container.querySelector('[data-role="rm"]');
    const pickBtn = container.querySelector('[data-role="pick"]');
    const fileInp = container.querySelector('[data-role="file"]');

    pickBtn.addEventListener('click', function () { fileInp.click(); });
    fileInp.addEventListener('change', async function () {
      const f = fileInp.files && fileInp.files[0];
      fileInp.value = '';
      if (!f) return;
      const bad = UI.fileOk(f);
      if (bad) { UI.toast(bad, 'err'); return; }
      busy = true;
      const local = await UI.dataUrl(f);
      prev.innerHTML = '<img src="' + local + '" alt="preview"><span class="imgf-load mono">UPLOADING…</span>';
      try {
        const r = await Api.upload(f, function (pct) {
          if (pct >= 92) prev.querySelector('.imgf-load')?.remove();
        });
        url = r.url;
        path = r.path;
        prev.innerHTML = '<img src="' + r.url + '" alt="preview">';
        state.textContent = 'IMAGE ON FILE';
        rmBtn.disabled = false;
        UI.toast('Image uploaded to the media vault.');
      } catch (err) {
        prev.innerHTML = url ? '<img src="' + UI.e(url) + '" alt="">' : UI.icon('image', 30);
        UI.toast(err.message || 'Upload failed.', 'err');
      }
      busy = false;
    });
    rmBtn.addEventListener('click', async function () {
      if (!url) return;
      if (path) await Api.deleteObject(path);
      url = '';
      path = '';
      prev.innerHTML = UI.icon('image', 30);
      state.textContent = 'NO IMAGE YET';
      rmBtn.disabled = true;
    });

    return { get: function () { return { url: url, path: path }; }, busy: function () { return busy; } };
  }

  /* ---------- specs editor (label / value rows) ---------- */
  function specRow(k, v) {
    return (
      '<div class="spec-row">' +
      '<input class="inp" data-role="k" maxlength="28" placeholder="LABEL (e.g. CLIENT)" value="' + UI.e(k) + '">' +
      '<input class="inp" data-role="v" maxlength="60" placeholder="VALUE" value="' + UI.e(v) + '">' +
      '<button class="icon-btn" data-role="rm" type="button" aria-label="Remove spec row">' + UI.icon('trash', 13) + '</button>' +
      '</div>'
    );
  }
  function specsEditor(container, specs) {
    container.innerHTML =
      '<div data-role="rows"></div>' +
      '<button class="link-btn" data-role="add" type="button">' + UI.icon('plus', 13) + ' ADD SPEC ROW</button>';
    const rows = container.querySelector('[data-role="rows"]');
    (specs || []).forEach(function (sp) {
      rows.insertAdjacentHTML('beforeend', specRow(sp[0] || '', sp[1] || ''));
    });
    container.querySelector('[data-role="add"]').addEventListener('click', function () {
      rows.insertAdjacentHTML('beforeend', specRow('', ''));
      rows.lastElementChild.querySelector('[data-role="k"]').focus();
    });
    rows.addEventListener('click', function (e) {
      const rm = e.target.closest('[data-role="rm"]');
      if (rm) rm.closest('.spec-row').remove();
    });
    return {
      get: function () {
        return [...rows.querySelectorAll('.spec-row')].map(function (r) {
          return [
            r.querySelector('[data-role="k"]').value.trim(),
            r.querySelector('[data-role="v"]').value.trim()
          ];
        }).filter(function (x) { return x[0] || x[1]; });
      }
    };
  }

  /* ---------- tags editor (comma input + live chips) ---------- */
  function tagsEditor(container, tags, placeholder) {
    container.innerHTML =
      '<input class="inp" data-role="in" placeholder="' + UI.e(placeholder || 'COMMERCIAL, RESIDENTIAL, INDUSTRIAL') + '" value="' + UI.e((tags || []).join(', ')) + '">' +
      '<div class="chips" data-role="chips"></div>';
    const inp = container.querySelector('[data-role="in"]');
    const chips = container.querySelector('[data-role="chips"]');
    function render() {
      const t = inp.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      chips.innerHTML = t.length
        ? t.map(function (x) { return '<span class="chip">' + UI.e(x) + '</span>'; }).join('')
        : '<span class="chip ghost">NO TAGS</span>';
    }
    inp.addEventListener('input', render);
    render();
    return {
      get: function () {
        return inp.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      }
    };
  }

  window.Forms = {
    field: field,
    validate: validate,
    imageField: imageField,
    specsEditor: specsEditor,
    tagsEditor: tagsEditor
  };
})();

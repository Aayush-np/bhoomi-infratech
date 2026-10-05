/* ==========================================================================
   BHOOMI ADMIN — UI KIT
   Toasts, modals, confirmations, icons, skeletons, empty states, helpers.
   Matches the public site design language (ink / paper / amber, mono labels,
   offset shadows, hazard accents).
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- escape ---------- */
  function e(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- icons (16px, 1.5 stroke, currentColor) ---------- */
  var P = {
    plus:      '<path d="M12 5v14M5 12h14"/>',
    edit:      '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash:     '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    eye:       '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    upload:    '<path d="M12 16V4"/><path d="M6 10l6-6 6 6"/><path d="M4 20h16"/>',
    image:     '<rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-11 11"/>',
    search:    '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    close:     '<path d="M18 6L6 18M6 6l12 12"/>',
    up:        '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>',
    down:      '<path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/>',
    check:     '<path d="M20 6L9 17l-5-5"/>',
    arrow:     '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>',
    external:  '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>',
    dashboard: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    building:  '<rect x="4" y="3" width="16" height="18"/><path d="M9 21v-4h6v4"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
    news:      '<rect x="3" y="4" width="18" height="16"/><path d="M7 8h10M7 12h10M7 16h6"/>',
    inbox:     '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5l3.5-7Z"/>',
    tune:      '<path d="M4 7h16"/><circle cx="9" cy="7" r="2.4"/><path d="M4 17h16"/><circle cx="15" cy="17" r="2.4"/>',
    download:  '<path d="M12 4v12"/><path d="M6 10l6 6 6-6"/><path d="M4 20h16"/>'
  };
  function icon(name, size) {
    var s = size || 15;
    return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }

  /* ---------- toasts ---------- */
  function toast(msg, type) {
    var root = document.getElementById('toastRoot');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    el.innerHTML = '<span class="t-ic">' + icon(type === 'err' ? 'close' : 'check', 14) + '</span><span class="t-msg">' + e(msg) + '</span>';
    root.appendChild(el);
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in'); }); });
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 450); }, 3800);
  }

  /* ---------- modal ---------- */
  function modal(opts) {
    var ov = document.createElement('div');
    ov.className = 'modal-ov';
    ov.innerHTML =
      '<div class="modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="mTitle">' +
      '<div class="hazard"></div>' +
      '<div class="m-head">' +
      '<span class="m-kicker mono">' + e(opts.kicker || '') + '</span>' +
      '<h2 class="m-title disp" id="mTitle">' + e(opts.title || '') + '</h2>' +
      '<button class="m-close" type="button" aria-label="Close">' + icon('close', 16) + '</button>' +
      '</div>' +
      '<div class="m-body"></div>' +
      (opts.footer ? '<div class="m-foot"></div>' : '') +
      '</div>';
    document.body.appendChild(ov);
    var body = ov.querySelector('.m-body');
    var foot = ov.querySelector('.m-foot');
    if (body) body.innerHTML = opts.body || '';
    if (foot) foot.innerHTML = opts.footer || '';
    requestAnimationFrame(function () { ov.classList.add('open'); });
    document.body.style.overflow = 'hidden';

    var lastFocus = document.activeElement;
    var first = ov.querySelector('input,select,textarea,button:not(.m-close)') || ov.querySelector('.m-close');
    if (first) setTimeout(function () { first.focus(); }, 60);

    function trap(e) {
      if (e.key !== 'Tab') return;
      var f = [].slice.call(ov.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
        .filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var idx = f.indexOf(document.activeElement);
      if (e.shiftKey && (idx <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && idx === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
    function esc(e) { if (e.key === 'Escape') close(); }
    function onOv(e) { if (e.target === ov) close(); }
    ov.addEventListener('click', onOv);
    document.addEventListener('keydown', esc);
    ov.addEventListener('keydown', trap);
    ov.querySelector('.m-close').addEventListener('click', close);

    function close() {
      ov.classList.remove('open');
      document.removeEventListener('keydown', esc);
      ov.removeEventListener('keydown', trap);
      setTimeout(function () { ov.remove(); }, 350);
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      if (opts.onClose) opts.onClose();
    }
    return { close: close, el: ov, body: body, foot: foot };
  }

  /* ---------- confirm dialog ----------
     NB: resolve BEFORE close; the modal's onClose "cancel" fallback only
     fires when no button was pressed (Esc / overlay click / X). */
  function confirm(opts) {
    return new Promise(function (resolve) {
      var answered = false;
      var m = modal({
        kicker: opts.kicker || 'CONFIRMATION',
        title: opts.title || 'CONFIRM ACTION',
        body: '<p class="cf-text">' + e(opts.text || '') + '</p>',
        footer:
          '<button class="btn ghost" data-r="0" type="button">Cancel</button>' +
          '<button class="btn solid danger" data-r="1" type="button">' + icon('trash', 14) + ' ' + e(opts.label || 'Delete') + '</button>',
        onClose: function () { if (!answered) resolve(false); }
      });
      m.foot.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          answered = true;
          resolve(b.dataset.r === '1');
          m.close();
        });
      });
    });
  }

  /* ---------- states ---------- */
  function empty(opts) {
    return (
      '<div class="empty">' +
      '<div class="empty-ic">' + icon(opts.icon || 'inbox', 34) + '</div>' +
      '<h3 class="disp">' + e(opts.title || 'NOTHING ON RECORD') + '</h3>' +
      '<p class="mono">' + e(opts.sub || '') + '</p>' +
      (opts.action ? '<div class="empty-act">' + opts.action + '</div>' : '') +
      '</div>'
    );
  }
  function skel(n) {
    var rows = '';
    for (var i = 0; i < (n || 4); i++) {
      rows += '<tr>' +
        '<td class="skel-c"><span class="skel skel-thumb"></span></td>' +
        '<td><span class="skel" style="width:42%"></span><br><span class="skel skel-sub"></span></td>' +
        '<td><span class="skel" style="width:70px"></span></td>' +
        '<td><span class="skel" style="width:90%"></span></td>' +
        '<td><span class="skel" style="width:56px"></span></td>' +
        '</tr>';
    }
    return '<div class="tbl-wrap">' +
      '<table class="tbl"><tbody>' + rows + '</tbody></table>' +
      '<div class="sync-note mono"><i></i>SYNCING FROM SITE RECORDS…</div></div>';
  }
  function errorState(msg) {
    return (
      '<div class="empty">' +
      '<div class="empty-ic err">' + icon('close', 30) + '</div>' +
      '<h3 class="disp">SIGNAL LOST</h3>' +
      '<p class="mono">' + e(msg || 'Could not reach the database. Check the connection and try again.') + '</p>' +
      '<div class="empty-act"><button class="btn solid" data-action="retry" type="button">' + icon('arrow') + ' TRY AGAIN</button></div>' +
      '</div>'
    );
  }

  /* ---------- busy buttons ---------- */
  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (busy) {
      btn.dataset.label = btn.dataset.label || btn.innerHTML;
      btn.classList.add('busy');
      btn.disabled = true;
      btn.innerHTML = '<span class="spin" aria-hidden="true"></span>' + e(label || 'WORKING…');
    } else {
      btn.classList.remove('busy');
      btn.disabled = false;
      if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    }
  }

  /* ---------- dates ---------- */
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(d) {
    var dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt)) return e(d);
    return MONTHS[dt.getMonth()] + ' ' + pad2(dt.getDate()) + ', ' + dt.getFullYear();
  }
  function fmtTime(d) {
    var dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt)) return '';
    return pad2(dt.getHours()) + ':' + pad2(dt.getMinutes());
  }
  /* exact stamp, e.g. "07 OCT 2026 · 07:00 PM" */
  function fmtDateTime(d) {
    var dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt)) return e(d);
    var h = dt.getHours();
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return pad2(dt.getDate()) + ' ' + MONTHS[dt.getMonth()] + ' ' + dt.getFullYear() +
      ' · ' + pad2(h12) + ':' + pad2(dt.getMinutes()) + ' ' + ampm;
  }
  function timeAgo(d) {
    var dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt)) return '';
    var s = Math.floor((Date.now() - dt.getTime()) / 1000);
    if (s < 60) return 'JUST NOW';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' MIN AGO';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' HR AGO';
    var dd = Math.floor(h / 24);
    if (dd < 30) return dd + ' DAY AGO';
    return fmtDate(dt);
  }

  /* ---------- files ---------- */
  function fileOk(file) {
    if (!file) return 'No file selected.';
    if (!/^image\//.test(file.type)) return 'Only image files (JPG, PNG, WEBP…) are allowed.';
    if (file.size > 6 * 1024 * 1024) return 'Image is larger than 6 MB. Please resize it first.';
    return '';
  }
  function dataUrl(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('Could not read the file.')); };
      r.readAsDataURL(file);
    });
  }

  window.AdminUI = {
    e: e, icon: icon, toast: toast, modal: modal, confirm: confirm,
    empty: empty, skel: skel, errorState: errorState, setBusy: setBusy,
    fmtDate: fmtDate, fmtTime: fmtTime, fmtDateTime: fmtDateTime, timeAgo: timeAgo,
    fileOk: fileOk, dataUrl: dataUrl
  };
})();

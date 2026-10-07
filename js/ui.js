// ════════════════════════════════════════════════════════════════════
// ui.js — مكونات UI المشتركة (Toast + Confirm)
// ════════════════════════════════════════════════════════════════════

var UI = (function () {

  // ── أنيميشن Toast ────────────────────────────────────────────────
  (function injectStyles() {
    if (document.getElementById('ui-styles')) return;
    var s = document.createElement('style');
    s.id = 'ui-styles';
    s.textContent =
      '@keyframes toastIn{from{opacity:0;transform:translateX(110%)}to{opacity:1;transform:translateX(0)}}' +
      '@keyframes toastOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(110%)}}' +
      '@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}' +
      '.shake-anim{animation:shake .4s ease}';
    document.head.appendChild(s);
  })();

  function getToastContainer() {
    var c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'fixed top-5 left-5 z-[9999] flex flex-col gap-2 pointer-events-none';
      c.setAttribute('aria-live', 'polite');
      document.body.appendChild(c);
    }
    return c;
  }

  function showToast(message, type, duration) {
    type = type || 'success';
    duration = duration || 4000;
    var cfg = {
      success: { bg:'bg-green-600 border-green-700',   icon:'fa-circle-check' },
      error:   { bg:'bg-red-500 border-red-600',       icon:'fa-circle-xmark' },
      info:    { bg:'bg-blue-500 border-blue-600',     icon:'fa-circle-info' },
      warning: { bg:'bg-amber-500 border-amber-600',   icon:'fa-triangle-exclamation' },
    }[type] || { bg:'bg-blue-500 border-blue-600', icon:'fa-circle-info' };

    var t = document.createElement('div');
    t.className = 'pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-xl text-white text-sm font-medium shadow-xl border max-w-xs ' + cfg.bg;
    t.style.animation = 'toastIn .35s ease';
    t.innerHTML = '<i class="fa-solid ' + cfg.icon + ' flex-shrink-0"></i><span>' + message + '</span>' +
      '<button class="mr-auto text-white/70 hover:text-white" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark fa-xs"></i></button>';
    getToastContainer().appendChild(t);

    setTimeout(function () {
      t.style.animation = 'toastOut .35s ease forwards';
      setTimeout(function () { t.remove(); }, 350);
    }, duration);
  }

  function showConfirm(opts) {
    var colors = {
      danger:  { btn:'bg-red-600 hover:bg-red-700',    icon:'fa-triangle-exclamation text-red-500',   bg:'bg-red-50' },
      warning: { btn:'bg-amber-500 hover:bg-amber-600', icon:'fa-circle-exclamation text-amber-500',  bg:'bg-amber-50' },
      info:    { btn:'bg-blue-600 hover:bg-blue-700',  icon:'fa-circle-info text-blue-500',           bg:'bg-blue-50' },
      success: { btn:'bg-green-600 hover:bg-green-700', icon:'fa-circle-check text-green-500',        bg:'bg-green-50' },
    }[opts.type || 'info'] || { btn:'bg-blue-600 hover:bg-blue-700', icon:'fa-circle-info text-blue-500', bg:'bg-blue-50' };

    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4';
    overlay.innerHTML =
      '<div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">' +
        '<div class="flex items-center gap-3 mb-3">' +
          '<div class="w-10 h-10 rounded-full ' + colors.bg + ' flex items-center justify-center flex-shrink-0">' +
            '<i class="fa-solid ' + colors.icon + '"></i>' +
          '</div>' +
          '<h3 class="text-lg font-bold text-gray-800">' + opts.title + '</h3>' +
        '</div>' +
        '<p class="text-gray-500 text-sm mb-5 leading-relaxed">' + opts.message + '</p>' +
        '<div class="flex gap-3">' +
          '<button id="_mc" class="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">' + (opts.cancelText || 'إلغاء') + '</button>' +
          '<button id="_mk" class="flex-1 rounded-xl py-2.5 text-sm font-bold text-white ' + colors.btn + '">' + (opts.confirmText || 'تأكيد') + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function close() { overlay.remove(); document.body.style.overflow = ''; }
    overlay.querySelector('#_mk').onclick = function () { close(); if (opts.onConfirm) opts.onConfirm(); };
    overlay.querySelector('#_mc').onclick = close;
    overlay.onclick = function (e) { if (e.target === overlay) close(); };
  }

  function shake(el) {
    el.classList.remove('shake-anim');
    void el.offsetWidth;
    el.classList.add('shake-anim');
    setTimeout(function () { el.classList.remove('shake-anim'); }, 400);
  }

  return { showToast, showConfirm, shake };
})();

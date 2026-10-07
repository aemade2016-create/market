// ════════════════════════════════════════════════════════════════════
// layout.js — الهيدر الديناميكي المشترك
// ════════════════════════════════════════════════════════════════════

var Layout = (function () {

  function renderHeader(opts) {
    opts = opts || {};
    var settings  = DB.Settings.get();
    var user      = Auth.getCurrentUser();
    var userIsAdm = Auth.isAdmin();
    var cartCount = DB.Cart.count();

    var userBtn = '';
    if (!user) {
      userBtn = '<a href="auth.html" class="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 shadow-md shadow-green-200"><i class="fa-solid fa-right-to-bracket"></i><span class="hidden sm:inline">تسجيل الدخول</span></a>';
    } else if (userIsAdm) {
      userBtn =
        '<div class="flex items-center gap-2">' +
          '<a href="admin.html" class="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 shadow-md shadow-purple-200"><i class="fa-solid fa-shield-halved"></i><span class="hidden sm:inline">لوحة الإدارة</span></a>' +
          '<button onclick="Auth.logout(\'auth.html\')" class="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200" title="تسجيل الخروج"><i class="fa-solid fa-arrow-right-from-bracket fa-sm"></i></button>' +
        '</div>';
    } else {
      var initials = ((user.firstName || '')[0] || '') + ((user.lastName || '')[0] || '');
      initials = initials.toUpperCase() || 'أ';
      userBtn =
        '<div class="flex items-center gap-2">' +
          '<a href="profile.html" class="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">' +
            '<span class="w-7 h-7 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">' + initials + '</span>' +
            '<span class="hidden sm:inline">' + (user.firstName || 'ملفي الشخصي') + '</span>' +
          '</a>' +
          '<button onclick="Auth.logout(\'auth.html\')" class="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200" title="تسجيل الخروج"><i class="fa-solid fa-arrow-right-from-bracket fa-sm"></i></button>' +
        '</div>';
    }

    var html =
      '<header id="main-header" class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">' +
        '<div class="max-w-7xl mx-auto px-4 sm:px-6">' +
          '<div class="flex items-center gap-3 h-16">' +
            '<a href="index.html" class="flex items-center gap-2.5 flex-shrink-0">' +
              '<img src="' + settings.logo + '" alt="' + settings.name + '" class="w-9 h-9 object-contain rounded-lg">' +
              '<span class="text-lg font-extrabold text-gray-800 hidden sm:inline">' + settings.name + '</span>' +
            '</a>' +
            (opts.showSearch !== false ?
              '<div class="min-w-0 flex-1 max-w-lg mx-auto"><div class="relative">' +
                '<span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><i class="fa-solid fa-magnifying-glass fa-sm"></i></span>' +
                '<input id="header-search" type="search" placeholder="ابحث عن منتج..." autocomplete="off" ' +
                  'class="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-9 pl-4 text-sm text-gray-800 outline-none focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100">' +
              '</div></div>' : '<div class="flex-1"></div>') +
            '<div class="flex items-center gap-2 flex-shrink-0">' +
              (opts.showCart !== false ?
                '<button id="cart-btn" onclick="CartUI.openCart()" class="relative flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-2 text-green-700 hover:bg-green-100 font-semibold text-sm">' +
                  '<i class="fa-solid fa-cart-shopping"></i><span class="hidden sm:inline">السلة</span>' +
                  '<span id="cart-count" class="absolute -top-1.5 -left-1.5 min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 ' + (cartCount === 0 ? 'hidden' : '') + '">' + cartCount + '</span>' +
                '</button>' : '') +
              userBtn +
            '</div>' +
          '</div>' +
        '</div>' +
      '</header>';

    var placeholder = document.getElementById('header-placeholder');
    if (placeholder) {
      placeholder.outerHTML = html;
    } else {
      document.body.insertAdjacentHTML('afterbegin', html);
    }

    // ربط البحث
    var searchInput = document.getElementById('header-search');
    if (searchInput && opts.onSearch) {
      var timer;
      searchInput.addEventListener('input', function (e) {
        clearTimeout(timer);
        timer = setTimeout(function () { opts.onSearch(e.target.value.trim()); }, 300);
      });
    }
  }

  return { renderHeader };
})();

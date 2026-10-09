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
      userBtn = '<a href="auth.html" class="flex h-10 items-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 shadow-md shadow-green-200"><i class="fa-solid fa-right-to-bracket"></i><span>تسجيل الدخول</span></a>';
    } else if (userIsAdm) {
      userBtn =
        '<div class="flex items-center gap-2">' +
          '<a href="admin.html" class="flex h-10 items-center gap-2 rounded-xl bg-purple-600 px-4 text-sm font-bold text-white hover:bg-purple-700 shadow-md shadow-purple-200"><i class="fa-solid fa-shield-halved"></i><span>لوحة الإدارة</span></a>' +
          '<button onclick="Auth.logout(\'auth.html\')" class="h-10 w-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200" title="تسجيل الخروج"><i class="fa-solid fa-arrow-right-from-bracket fa-sm"></i></button>' +
        '</div>';
    } else {
      var initials = ((user.firstName || '')[0] || '') + ((user.lastName || '')[0] || '');
      initials = initials.toUpperCase() || 'أ';
      userBtn =
        '<div class="flex items-center gap-2">' +
          '<a href="profile.html" class="flex h-10 items-center gap-2 rounded-xl bg-gray-100 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-200">' +
            '<span class="w-7 h-7 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">' + initials + '</span>' +
            '<span class="hidden sm:inline">' + (user.firstName || 'ملفي الشخصي') + '</span>' +
          '</a>' +
          '<button onclick="Auth.logout(\'auth.html\')" class="h-10 w-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200" title="تسجيل الخروج"><i class="fa-solid fa-arrow-right-from-bracket fa-sm"></i></button>' +
        '</div>';
    }

    var mobileMenuLinks = '<a href="index.html" class="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"><i class="fa-solid fa-house w-5 text-center text-green-600"></i>الرئيسية</a>';
    if (userIsAdm) {
      mobileMenuLinks += '<a href="admin.html" class="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"><i class="fa-solid fa-shield-halved w-5 text-center text-green-600"></i>لوحة الإدارة</a>' +
        '<button onclick="Auth.logout(\'auth.html\')" class="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-red-50"><i class="fa-solid fa-arrow-right-from-bracket w-5 text-center text-red-500"></i>تسجيل الخروج</button>';
    } else if (user) {
      mobileMenuLinks += '<a href="profile.html" class="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"><i class="fa-regular fa-user w-5 text-center text-green-600"></i>حسابي</a>' +
        '<button onclick="Auth.logout(\'auth.html\')" class="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-red-50"><i class="fa-solid fa-arrow-right-from-bracket w-5 text-center text-red-500"></i>تسجيل الخروج</button>';
    } else {
      mobileMenuLinks += '<a href="auth.html" class="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"><i class="fa-solid fa-right-to-bracket w-5 text-center text-green-600"></i>تسجيل الدخول</a>';
    }

    var html =
      '<header id="main-header" class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">' +
        '<div class="max-w-7xl mx-auto px-4 sm:px-6">' +
          '<div class="flex h-16 min-w-0 items-center gap-2 sm:gap-3">' +
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
                '<button id="cart-btn" onclick="CartUI.openCart()" class="relative flex h-10 items-center gap-1.5 rounded-xl bg-green-50 px-3 text-green-700 hover:bg-green-100 font-semibold text-sm">' +
                  '<i class="fa-solid fa-cart-shopping"></i><span class="hidden sm:inline">السلة</span>' +
                  '<span id="cart-count" class="absolute -top-1.5 -left-1.5 min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 ' + (cartCount === 0 ? 'hidden' : '') + '">' + cartCount + '</span>' +
                '</button>' : '') +
              '<div class="hidden items-center gap-2 sm:flex">' + userBtn + '</div>' +
              '<button id="mobile-menu-button" type="button" class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 sm:hidden" aria-label="فتح القائمة" aria-expanded="false" aria-controls="mobile-menu"><i class="fa-solid fa-bars"></i></button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<nav id="mobile-menu" class="absolute inset-x-0 top-full z-50 hidden border-t border-gray-100 bg-white p-3 shadow-lg sm:hidden"><div class="mx-auto max-w-7xl space-y-1">' + mobileMenuLinks + '</div></nav>' +
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

    var menuButton = document.getElementById('mobile-menu-button');
    var mobileMenu = document.getElementById('mobile-menu');
    if (menuButton && mobileMenu) {
      menuButton.addEventListener('click', function () {
        var isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
        menuButton.setAttribute('aria-expanded', String(!isExpanded));
        menuButton.setAttribute('aria-label', isExpanded ? 'فتح القائمة' : 'إغلاق القائمة');
        mobileMenu.classList.toggle('hidden', isExpanded);
        menuButton.innerHTML = '<i class="fa-solid fa-' + (isExpanded ? 'bars' : 'xmark') + '"></i>';
      });
    }
  }

  return { renderHeader };
})();

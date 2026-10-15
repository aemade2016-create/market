// ════════════════════════════════════════════════════════════════════
// storefront.js — عرض المنتجات والأقسام (LocalStorage فقط)
// ════════════════════════════════════════════════════════════════════

var Storefront = (function () {

  var ICONS = {
    'خضروات وفاكهة': '🥦', 'منتجات الألبان': '🥛', 'مخبوزات': '🍞',
    'مشروبات': '🧃', 'بقوليات وحبوب': '🌾', 'وجبات خفيفة': '🍪',
  };

  var activeCategory = 'all';

  // ── بناء بطاقة منتج ──────────────────────────────────────────────
  function buildCard(product) {
    var settings = DB.Settings.get();
    var cart     = DB.Cart.get();
    var inCart   = cart.find(function(i) { return i.id === product.id; });
    var qty      = inCart ? inCart.qty : 0;
    var price    = parseFloat(product.price) || 0;

    return (
      '<div data-product-id="' + product.id + '" ' +
           'class="group bg-white rounded-2xl border border-gray-100 overflow-hidden ' +
                  'hover:shadow-lg hover:-translate-y-1 transition-all duration-300">' +

        '<div class="relative overflow-hidden bg-gray-50 aspect-[4/3]">' +
          '<img src="' + product.image + '" alt="' + product.name + '" loading="lazy" ' +
               'class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" ' +
               'onerror="this.onerror=null;this.src=\'https://placehold.co/300x200/e2e8f0/64748b?text=منتج\'">' +
          '<span class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-xs font-semibold ' +
                       'text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">' +
            product.category +
          '</span>' +
        '</div>' +

        '<div class="p-3 sm:p-4">' +
          '<h3 class="text-sm font-bold text-gray-800 mb-2 line-clamp-2 leading-snug min-h-[2.5rem]">' +
            product.name +
          '</h3>' +
          '<div class="flex items-center justify-between gap-2">' +
            '<span class="text-green-600 font-extrabold text-base whitespace-nowrap">' +
              price.toFixed(2) +
              ' <span class="text-xs font-medium">' + settings.currency + '</span>' +
            '</span>' +

            // زر الإضافة
            '<button data-add-btn ' +
                    'onclick="Storefront.addById(\'' + product.id + '\')" ' +
                    'class="' + (qty > 0 ? 'hidden ' : '') +
                           'flex h-9 w-9 sm:w-auto sm:px-3 items-center justify-center gap-1.5 ' +
                           'rounded-xl bg-green-600 text-white text-xs font-bold ' +
                           'hover:bg-green-700 active:scale-95 transition-all flex-shrink-0">' +
              '<i class="fa-solid fa-plus fa-xs"></i>' +
              '<span class="hidden sm:inline">أضف</span>' +
            '</button>' +

            // تحكم الكمية
            '<div data-qty-ctrl class="' + (qty > 0 ? '' : 'hidden ') + 'flex items-center gap-1 flex-shrink-0">' +
              '<button onclick="Storefront.dec(\'' + product.id + '\')" ' +
                      'class="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center ' +
                             'text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors">' +
                '<i class="fa-solid fa-minus fa-xs"></i>' +
              '</button>' +
              '<span data-qty-display ' +
                    'class="w-7 text-center text-sm font-bold text-gray-800">' +
                qty +
              '</span>' +
              '<button onclick="Storefront.inc(\'' + product.id + '\')" ' +
                      'class="h-9 w-9 rounded-lg bg-green-600 flex items-center justify-center ' +
                             'text-white hover:bg-green-700 transition-colors">' +
                '<i class="fa-solid fa-plus fa-xs"></i>' +
              '</button>' +
            '</div>' +

          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ── عرض المنتجات ─────────────────────────────────────────────────
  function render(products) {
    var container = document.getElementById('storefront-container');
    if (!container) return;

    var list = (products !== undefined) ? products
      : (activeCategory === 'all' ? DB.Products.getAll() : DB.Products.getByCategory(activeCategory));

    if (!list || list.length === 0) {
      container.innerHTML =
        '<div class="col-span-full text-center py-16">' +
          '<div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">' +
            '<i class="fa-solid fa-box-open text-gray-300 text-3xl"></i>' +
          '</div>' +
          '<p class="text-gray-500 font-semibold text-sm">لا توجد منتجات مطابقة</p>' +
          '<button onclick="Storefront.resetSearch()" ' +
                  'class="mt-3 text-green-600 font-semibold text-sm hover:underline">' +
            'عرض جميع المنتجات' +
          '</button>' +
        '</div>';
      return;
    }

    // تجميع حسب القسم
    var grouped = {};
    var order   = [];
    list.forEach(function(p) {
      if (!grouped[p.category]) { grouped[p.category] = []; order.push(p.category); }
      grouped[p.category].push(p);
    });

    container.innerHTML = order.map(function(cat) {
      return (
        '<section class="col-span-full mb-8" id="cat-' + encodeURIComponent(cat) + '">' +
          '<div class="flex items-center gap-3 mb-4">' +
            '<span class="text-2xl">' + (ICONS[cat] || '🛒') + '</span>' +
            '<h2 class="text-lg sm:text-xl font-extrabold text-gray-800">' + cat + '</h2>' +
            '<div class="flex-1 h-px bg-gray-200"></div>' +
            '<span class="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">' +
              grouped[cat].length + ' منتج' +
            '</span>' +
          '</div>' +
          '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">' +
            grouped[cat].map(buildCard).join('') +
          '</div>' +
        '</section>'
      );
    }).join('');
  }

  // ── أزرار الأقسام ─────────────────────────────────────────────────
  function renderPills() {
    var container = document.getElementById('category-pills');
    if (!container) return;
    var cats = DB.Products.getCategories();

    container.innerHTML =
      '<button type="button" data-cat="all" ' +
              'class="cat-pill flex-shrink-0 flex items-center gap-1.5 px-4 py-2 h-10 rounded-full ' +
                     'border text-sm font-semibold transition-all ' +
                     'bg-green-600 text-white border-green-600">' +
        '<i class="fa-solid fa-border-all fa-xs"></i>' +
        '<span>الكل</span>' +
      '</button>' +
      cats.map(function(cat) {
        return (
          '<button type="button" data-cat="' + cat + '" ' +
                  'class="cat-pill flex-shrink-0 flex items-center gap-1.5 px-4 py-2 h-10 rounded-full ' +
                         'border text-sm font-semibold transition-all ' +
                         'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600">' +
            (ICONS[cat] || '🛒') + ' ' + cat +
          '</button>'
        );
      }).join('');

    // ربط الأزرار بالأحداث
    container.querySelectorAll('.cat-pill').forEach(function(btn) {
      btn.addEventListener('click', function() { filterCat(btn.dataset.cat); });
    });
  }

  // ── فلترة الأقسام ─────────────────────────────────────────────────
  function filterCat(category) {
    activeCategory = category || 'all';

    // صفّر حقل البحث
    var si = document.getElementById('header-search');
    if (si) si.value = '';

    // تحديث حالة الأزرار
    document.querySelectorAll('.cat-pill').forEach(function(btn) {
      var isActive = btn.dataset.cat === activeCategory;
      btn.className = 'cat-pill flex-shrink-0 flex items-center gap-1.5 px-4 py-2 h-10 rounded-full ' +
                      'border text-sm font-semibold transition-all ' +
                      (isActive ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600');
    });

    render();

    // تمرير للقسم
    if (activeCategory !== 'all') {
      requestAnimationFrame(function() {
        var sec = document.getElementById('cat-' + encodeURIComponent(activeCategory));
        if (sec) {
          var top = sec.getBoundingClientRect().top + window.scrollY - 130;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ── البحث ─────────────────────────────────────────────────────────
  function search(query) {
    if (!query || !query.trim()) { render(); return; }
    render(DB.Products.search(query.trim()));
  }

  function resetSearch() {
    activeCategory = 'all';
    var si = document.getElementById('header-search');
    if (si) si.value = '';
    document.querySelectorAll('.cat-pill').forEach(function(btn) {
      var isActive = btn.dataset.cat === 'all';
      btn.className = 'cat-pill flex-shrink-0 flex items-center gap-1.5 px-4 py-2 h-10 rounded-full ' +
                      'border text-sm font-semibold transition-all ' +
                      (isActive ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600');
    });
    render();
  }

  // ── دوال السلة من البطاقات ────────────────────────────────────────
  function addById(id) {
    var p = DB.Products.findById(id);
    if (!p) return;
    CartUI.addToCart(p);
    // تحديث الأزرار في نفس اللحظة
    CartUI.syncCards();
  }

  function inc(id) {
    var item = DB.Cart.get().find(function(i) { return i.id === id; });
    DB.Cart.updateQty(id, item ? item.qty + 1 : 1);
    CartUI.sync();
    CartUI.syncCards();
  }

  function dec(id) {
    var item = DB.Cart.get().find(function(i) { return i.id === id; });
    if (!item) return;
    DB.Cart.updateQty(id, item.qty - 1);
    CartUI.sync();
    CartUI.syncCards();
  }

  return { render, renderPills, filterCat, search, resetSearch, addById, inc, dec };
})();

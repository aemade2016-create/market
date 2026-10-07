// ════════════════════════════════════════════════════════════════════
// storefront.js — عرض المنتجات والأقسام
// ════════════════════════════════════════════════════════════════════

var Storefront = (function () {

  var ICONS = {
    'خضروات وفاكهة':'🥦','منتجات الألبان':'🥛','مخبوزات':'🍞',
    'مشروبات':'🧃','بقوليات وحبوب':'🌾','وجبات خفيفة':'🍪',
  };

  var activeCategory = 'all';

  function buildCard(product) {
    var settings = DB.Settings.get();
    var cart     = DB.Cart.get();
    var inCart   = cart.find(function (i) { return i.id === product.id; });
    var qty      = inCart ? inCart.qty : 0;
    return (
      '<div data-product-id="' + product.id + '" class="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300">' +
        '<div class="relative overflow-hidden bg-gray-50 aspect-[4/3]">' +
          '<img src="' + product.image + '" alt="' + product.name + '" loading="lazy" ' +
            'class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" ' +
            'onerror="this.src=\'https://via.placeholder.com/300x200?text=' + encodeURIComponent(product.name) + '\'">' +
          '<span class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">' + product.category + '</span>' +
        '</div>' +
        '<div class="p-3 sm:p-4">' +
          '<h3 class="text-sm font-bold text-gray-800 mb-1 line-clamp-2 leading-snug">' + product.name + '</h3>' +
          '<div class="flex flex-col min-[480px]:flex-row min-[480px]:items-center justify-between gap-2 mt-2">' +
            '<span class="text-green-600 font-extrabold text-base">' + product.price.toFixed(2) + ' <span class="text-xs font-medium">' + settings.currency + '</span></span>' +
            '<button data-add-btn onclick="Storefront.addById(\'' + product.id + '\')" ' +
              'class="' + (qty > 0 ? 'hidden' : '') + ' flex w-full min-[480px]:w-auto items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-white text-xs font-bold hover:bg-green-700 active:scale-95 shadow-sm shadow-green-200">' +
              '<i class="fa-solid fa-plus fa-xs"></i> أضف للسلة</button>' +
            '<div data-qty-ctrl class="' + (qty > 0 ? '' : 'hidden') + ' flex items-center gap-1.5">' +
              '<button onclick="Storefront.dec(\'' + product.id + '\')" class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-red-100 hover:text-red-600"><i class="fa-solid fa-minus fa-xs"></i></button>' +
              '<span data-qty-display class="w-7 text-center text-sm font-bold text-gray-800">' + qty + '</span>' +
              '<button onclick="Storefront.inc(\'' + product.id + '\')" class="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center text-white hover:bg-green-700"><i class="fa-solid fa-plus fa-xs"></i></button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function render(products) {
    var container = document.getElementById('storefront-container');
    if (!container) return;

    var list = products;
    if (list === undefined) {
      list = activeCategory === 'all' ? DB.Products.getAll() : DB.Products.getByCategory(activeCategory);
    }

    if (!list || list.length === 0) {
      container.innerHTML =
        '<div class="col-span-full text-center py-20">' +
          '<div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fa-solid fa-box-open text-gray-300 text-4xl"></i></div>' +
          '<p class="text-gray-500 font-semibold">لا توجد منتجات مطابقة للبحث</p>' +
          '<button onclick="Storefront.render()" class="mt-4 text-green-600 font-semibold text-sm hover:underline">عرض جميع المنتجات</button>' +
        '</div>';
      return;
    }

    // تجميع حسب القسم
    var grouped = {};
    var order   = [];
    list.forEach(function (p) {
      if (!grouped[p.category]) { grouped[p.category] = []; order.push(p.category); }
      grouped[p.category].push(p);
    });

    container.innerHTML = order.map(function (cat) {
      var items = grouped[cat];
      return '<section class="col-span-full mb-8" id="cat-' + encodeURIComponent(cat) + '">' +
        '<div class="flex items-center gap-3 mb-4">' +
          '<div class="flex items-center gap-2"><span class="text-2xl">' + (ICONS[cat] || '🛒') + '</span>' +
            '<h2 class="text-xl font-extrabold text-gray-800">' + cat + '</h2></div>' +
          '<div class="flex-1 h-px bg-gradient-to-l from-transparent to-gray-200"></div>' +
          '<span class="text-xs text-gray-400 font-medium bg-gray-100 px-2.5 py-1 rounded-full">' + items.length + ' منتج</span>' +
        '</div>' +
        '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">' +
          items.map(buildCard).join('') +
        '</div>' +
      '</section>';
    }).join('');
  }

  function renderPills() {
    var container = document.getElementById('category-pills');
    if (!container) return;
    var cats = DB.Products.getCategories();
    container.innerHTML =
      '<button data-cat="all" onclick="Storefront.filterCat(\'all\')" ' +
        'class="cat-pill flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold ' + (activeCategory === 'all' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600') + ' flex-shrink-0">' +
        '<i class="fa-solid fa-border-all fa-xs"></i> الكل</button>' +
      cats.map(function (cat) {
        var isActive = activeCategory === cat;
        return '<button data-cat="' + cat + '" onclick="Storefront.filterCat(\'' + cat + '\')" ' +
          'class="cat-pill flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold flex-shrink-0 ' + (isActive ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600') + '">' +
          (ICONS[cat] || '🛒') + ' ' + cat + '</button>';
      }).join('');
  }

  function filterCat(category) {
    activeCategory = category || 'all';

    // صفّر البحث
    var si = document.getElementById('header-search');
    if (si) si.value = '';

    // تحديث الأزرار
    document.querySelectorAll('.cat-pill').forEach(function (btn) {
      var active = btn.dataset.cat === activeCategory;
      btn.className = 'cat-pill flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold flex-shrink-0 transition-all ' +
        (active ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600');
    });

    var items = activeCategory === 'all' ? DB.Products.getAll() : DB.Products.getByCategory(activeCategory);
    render(items);

    if (activeCategory !== 'all') {
      requestAnimationFrame(function () {
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

  function search(query) {
    var filtered = DB.Products.search(query || '');
    if (activeCategory !== 'all') {
      filtered = filtered.filter(function (p) { return p.category === activeCategory; });
    }
    render(filtered);
  }

  function addById(id) {
    var p = DB.Products.findById(id);
    if (!p) return;
    CartUI.addToCart(p);
    CartUI.syncCards();
  }

  function inc(id) {
    var c = DB.Cart.get().find(function (i) { return i.id === id; });
    DB.Cart.updateQty(id, c ? c.qty + 1 : 1);
    CartUI.sync();
    CartUI.syncCards();
  }

  function dec(id) {
    var c = DB.Cart.get().find(function (i) { return i.id === id; });
    if (!c) return;
    DB.Cart.updateQty(id, c.qty - 1);
    CartUI.sync();
    CartUI.syncCards();
  }

  return { render, renderPills, filterCat, search, addById, inc, dec };
})();

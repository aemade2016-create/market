console.log('🚀 Main JS File Loaded Successfully!');

// ════════════════════════════════════════════════════════════════════
// storefront.js — عرض المنتجات والأقسام
// ════════════════════════════════════════════════════════════════════

var Storefront = (function () {

  var ICONS = {
    'خضروات وفاكهة':'🥦','منتجات الألبان':'🥛','مخبوزات':'🍞',
    'مشروبات':'🧃','بقوليات وحبوب':'🌾','وجبات خفيفة':'🍪',
  };

  var activeCategory = 'all';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

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
            'onerror="this.onerror=null;this.style.visibility=\'hidden\'">' +
          '<span class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">' + escapeHtml(product.category) + '</span>' +
        '</div>' +
        '<div class="p-3 sm:p-4">' +
          '<h3 class="text-sm font-bold text-gray-800 mb-1 line-clamp-2 leading-snug">' + product.name + '</h3>' +
          '<div class="flex flex-col min-[480px]:flex-row min-[480px]:items-center justify-between gap-2 mt-2">' +
            '<span class="text-green-600 font-extrabold text-base">' + product.price.toFixed(2) + ' <span class="text-xs font-medium">' + settings.currency + '</span></span>' +
            '<button data-add-btn onclick="Storefront.addById(\'' + product.id + '\')" ' +
              'class="' + (qty > 0 ? 'hidden' : '') + ' flex min-h-10 w-full min-[480px]:w-auto items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-white text-xs font-bold hover:bg-green-700 active:scale-95 shadow-sm shadow-green-200">' +
              '<i class="fa-solid fa-plus fa-xs"></i> أضف للسلة</button>' +
            '<div data-qty-ctrl class="' + (qty > 0 ? '' : 'hidden') + ' flex items-center gap-1.5">' +
              '<button onclick="Storefront.dec(\'' + product.id + '\')" class="h-10 w-10 rounded-lg bg-gray-100 flex flex-shrink-0 items-center justify-center text-gray-600 hover:bg-red-100 hover:text-red-600"><i class="fa-solid fa-minus fa-xs"></i></button>' +
              '<span data-qty-display class="w-7 text-center text-sm font-bold text-gray-800">' + qty + '</span>' +
              '<button onclick="Storefront.inc(\'' + product.id + '\')" class="h-10 w-10 rounded-lg bg-green-600 flex flex-shrink-0 items-center justify-center text-white hover:bg-green-700"><i class="fa-solid fa-plus fa-xs"></i></button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function render(products) {
    console.log('🎨 Rendering started...');
    var container = document.getElementById('storefront-container');
    if (!container) {
      console.error('[Storefront] Products container #storefront-container was not found.');
      return;
    }
    container.innerHTML = '';

    try {
      var list = products;
      if (list === undefined) {
        list = activeCategory === 'all' ? DB.Products.getAll() : DB.Products.getByCategory(activeCategory);
      }
      if (!Array.isArray(list)) throw new TypeError('Products data must be an array.');
      console.log('First Product:', list[0]);

      list = list.map(function (product) {
        product = product || {};
        var price = Number(product.price);
        return Object.assign({}, product, {
          id: product.id == null ? '' : String(product.id),
          name: product.name == null ? '' : String(product.name),
          category: product.category == null ? 'غير مصنف' : String(product.category),
          price: Number.isFinite(price) ? price : 0,
          image: String(product.image || product.image_url || ''),
        });
      });

      if (list.length === 0) {
        container.innerHTML =
          '<div class="col-span-full text-center py-20">' +
            '<div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fa-solid fa-box-open text-gray-300 text-4xl"></i></div>' +
            '<p class="text-gray-500 font-semibold">لا توجد منتجات مطابقة للبحث</p>' +
            '<button onclick="Storefront.render()" class="mt-4 text-green-600 font-semibold text-sm hover:underline">عرض جميع المنتجات</button>' +
          '</div>';
        return;
      }

      container.innerHTML = list.map(buildCard).join('');
    } catch (err) {
      console.error('Render Error:', err);
      container.innerHTML =
        '<div class="col-span-full py-12 text-center" role="alert">' +
          '<p class="font-semibold text-red-600">تعذر عرض المنتجات.</p>' +
          '<p class="mt-2 text-sm text-gray-600">أعد تحميل الصفحة للمحاولة مرة أخرى.</p>' +
        '</div>';
    }
  }

  async function fetchAndRenderProducts() {
    var container = document.getElementById('storefront-container');
    if (!container) {
      console.error('[Storefront] Products container #storefront-container was not found.');
      return;
    }

    try {
      if (!window.supabaseClient) throw new Error('تعذر الاتصال بـ Supabase.');

      var result = await window.supabaseClient.from('products').select('*');
      if (result.error) throw result.error;
      if (!Array.isArray(result.data)) throw new Error('لم تُرجع قاعدة البيانات قائمة منتجات صالحة.');

      render(result.data);
    } catch (error) {
      console.error('[Storefront] Failed to fetch or render products:', error);
      container.innerHTML = '<p class="text-red-500 text-center">حدث خطأ أثناء تحميل المنتجات: ' +
        escapeHtml(error && error.message ? error.message : String(error)) + '</p>';
    }
  }

  function renderPills() {
    var container = document.getElementById('category-pills');
    if (!container) return;
    var cats = DB.Products.getCategories();
    container.innerHTML =
      '<button type="button" data-cat="all" aria-label="كل الأقسام" title="كل الأقسام" ' +
        'class="cat-pill flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition-all sm:h-auto sm:w-auto sm:rounded-full sm:px-4 sm:py-2 ' + (activeCategory === 'all' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600') + '">' +
        '<i class="fa-solid fa-border-all fa-xs" aria-hidden="true"></i><span class="hidden sm:inline">الكل</span></button>' +
      cats.map(function (cat) {
        var isActive = activeCategory === cat;
        var image = DB.Categories.getImage(cat);
        var icon = image
          ? '<span class="relative flex h-6 w-6 shrink-0 items-center justify-center"><span aria-hidden="true">' + (ICONS[cat] || '🛒') + '</span><img src="' + escapeHtml(image) + '" alt="" loading="lazy" class="absolute inset-0 h-6 w-6 rounded-full bg-white object-cover" onerror="this.remove()"/></span>'
          : '<span aria-hidden="true">' + (ICONS[cat] || '🛒') + '</span>';
        return '<button type="button" data-cat="' + escapeHtml(cat) + '" aria-label="' + escapeHtml(cat) + '" title="' + escapeHtml(cat) + '" ' +
          'class="cat-pill flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition-all sm:h-auto sm:w-auto sm:rounded-full sm:px-4 sm:py-2 ' + (isActive ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600') + '">' +
          icon + '<span class="hidden sm:inline">' + escapeHtml(cat) + '</span></button>';
      }).join('');
    container.querySelectorAll('.cat-pill').forEach(function (button) {
      button.addEventListener('click', function () { filterCat(button.dataset.cat); });
    });
    if (!container.dataset.scrollControlsBound) {
      container.addEventListener('scroll', updateCategoryScrollControls, { passive: true });
      container.dataset.scrollControlsBound = 'true';
      window.addEventListener('resize', updateCategoryScrollControls);
    }
    window.requestAnimationFrame(updateCategoryScrollControls);
  }

  function updateCategoryScrollControls() {
    var container = document.getElementById('category-pills');
    var leftButton = document.getElementById('category-scroll-left');
    var rightButton = document.getElementById('category-scroll-right');
    if (!container || !leftButton || !rightButton) return;
    var hasOverflow = container.scrollWidth > container.clientWidth + 2;
    leftButton.classList.toggle('hidden', !hasOverflow);
    leftButton.classList.toggle('flex', hasOverflow);
    rightButton.classList.toggle('hidden', !hasOverflow);
    rightButton.classList.toggle('flex', hasOverflow);
  }

  function scrollCategories(direction) {
    var container = document.getElementById('category-pills');
    if (!container) return;
    var amount = Math.max(container.clientWidth * 0.75, 120);
    container.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  function filterCat(category) {
    activeCategory = category || 'all';

    // صفّر البحث
    var si = document.getElementById('header-search');
    if (si) si.value = '';

    // تحديث الأزرار
    document.querySelectorAll('.cat-pill').forEach(function (btn) {
      var active = btn.dataset.cat === activeCategory;
      btn.className = 'cat-pill flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition-all sm:h-auto sm:w-auto sm:rounded-full sm:px-4 sm:py-2 ' +
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

  return { fetchAndRenderProducts, render, renderPills, filterCat, search, addById, inc, dec, scrollCategories };
})();

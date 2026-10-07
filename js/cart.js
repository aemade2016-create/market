// ════════════════════════════════════════════════════════════════════
// cart.js — منطق السلة والـ Sidebar
// نسخة نظيفة وموثوقة
// ════════════════════════════════════════════════════════════════════

var CartUI = (function () {

  function updateBadge() {
    var badge = document.getElementById('cart-count');
    if (!badge) return;

    var count = DB.Cart.count();
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.toggle('hidden', count === 0);
  }

  function syncCards() {
    var cart = DB.Cart.get();

    document.querySelectorAll('[data-product-id]').forEach(function (card) {
      var id = card.dataset.productId;
      var item = cart.find(function (product) { return product.id === id; });
      var addBtn = card.querySelector('[data-add-btn]');
      var qtyCtrl = card.querySelector('[data-qty-ctrl]');

      if (!addBtn || !qtyCtrl) return;

      if (item) {
        addBtn.classList.add('hidden');
        qtyCtrl.classList.remove('hidden');
        var qtyDisplay = qtyCtrl.querySelector('[data-qty-display]');
        if (qtyDisplay) qtyDisplay.textContent = item.qty;
      } else {
        addBtn.classList.remove('hidden');
        qtyCtrl.classList.add('hidden');
      }
    });
  }

  function sync() {
    updateBadge();
    syncCards();
  }

  function addToCart(product) {
    DB.Cart.add(product, 1);
    sync();
    if (product && product.name) {
      UI.showToast('تمت إضافة "' + product.name + '" إلى السلة 🛒', 'success', 2500);
    }
  }

  function setSidebarVisible(visible) {
    var sb = document.getElementById('cart-sidebar');
    var ov = document.getElementById('cart-overlay');
    if (!sb) return;

    sb.classList.toggle('translate-x-0', visible);
    sb.classList.toggle('translate-x-full', !visible);
    sb.classList.toggle('invisible', !visible);
    sb.classList.toggle('pointer-events-none', !visible);
    sb.classList.toggle('pointer-events-auto', visible);

    if (ov) {
      ov.classList.toggle('hidden', !visible);
      ov.classList.toggle('pointer-events-none', !visible);
      ov.classList.toggle('pointer-events-auto', visible);
    }

    document.body.style.overflow = visible ? 'hidden' : '';
  }

  function bindOutsideClick() {
    if (document.body.dataset.cartOutsideBound === '1') return;

    document.addEventListener('click', function (event) {
      var sb = document.getElementById('cart-sidebar');
      var ov = document.getElementById('cart-overlay');
      var target = event.target;

      if (!sb || target === null) return;
      if (sb.classList.contains('translate-x-full')) return;
      if (target.closest && target.closest('#cart-btn')) return;
      if (target.closest && target.closest('#cart-sidebar')) return;
      if (target.closest && target.closest('#cart-overlay')) return;

      closeCart();
    });

    document.body.dataset.cartOutsideBound = '1';
  }

  function openCart() {
    if (!document.getElementById('cart-sidebar')) {
      initSidebar();
    }
    renderSidebar();
    setSidebarVisible(true);
  }

  function closeCart() {
    setSidebarVisible(false);
  }

  function initSidebar() {
    bindOutsideClick();

    var existingSidebar = document.getElementById('cart-sidebar');
    if (existingSidebar) {
      setSidebarVisible(false);
      renderSidebar();
      return;
    }

    var sb = document.createElement('aside');
    sb.id = 'cart-sidebar';
    sb.className = 'fixed top-0 left-0 h-full w-full max-w-sm bg-white shadow-2xl z-[1000] flex flex-col transform translate-x-full transition-transform duration-300 invisible pointer-events-none';

    var ov = document.createElement('div');
    ov.id = 'cart-overlay';
    ov.className = 'fixed inset-0 bg-black/40 z-[999] hidden';
    ov.addEventListener('click', closeCart);

    document.body.appendChild(ov);
    document.body.appendChild(sb);

    renderSidebar();
    setSidebarVisible(false);
  }

  function renderSidebar() {
    var sb = document.getElementById('cart-sidebar');
    if (!sb) return;

    var cart = DB.Cart.get();
    var settings = DB.Settings.get();
    var total = DB.Cart.total();
    var count = DB.Cart.count();

    if (cart.length === 0) {
      sb.innerHTML =
        '<div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">' +
          '<h2 class="text-lg font-bold text-gray-800 flex items-center gap-2"><i class="fa-solid fa-cart-shopping text-green-600"></i> سلة المشتريات</h2>' +
          '<button type="button" onclick="CartUI.closeCart()" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-500"><i class="fa-solid fa-xmark fa-sm"></i></button>' +
        '</div>' +
        '<div class="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">' +
          '<div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center"><i class="fa-solid fa-cart-shopping text-gray-300 text-4xl"></i></div>' +
          '<div><p class="text-gray-700 font-semibold mb-1">سلتك فارغة</p><p class="text-gray-400 text-sm">أضف منتجات لبدء التسوق</p></div>' +
          '<button type="button" onclick="CartUI.closeCart()" class="rounded-xl bg-green-600 text-white px-6 py-2.5 text-sm font-bold hover:bg-green-700">تصفّح المنتجات</button>' +
        '</div>';
      return;
    }

    var itemsHtml = cart.map(function (item) {
      return '<div class="flex gap-3 p-4 border-b border-gray-50">' +
        '<img src="' + item.image + '" alt="' + item.name + '" class="w-16 h-16 object-cover rounded-xl flex-shrink-0 bg-gray-100" onerror="this.src=\'https://via.placeholder.com/64?text=م\'">' +
        '<div class="flex-1 min-w-0">' +
          '<p class="text-sm font-semibold text-gray-800 truncate">' + item.name + '</p>' +
          '<p class="text-green-600 font-bold text-sm mt-0.5">' + item.price.toFixed(2) + ' ' + settings.currency + '</p>' +
          '<div class="flex items-center gap-2 mt-2">' +
            '<button type="button" onclick="CartUI.updateQty(\'' + item.id + '\',' + (item.qty - 1) + ')" class="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:text-red-500"><i class="fa-solid fa-minus fa-xs"></i></button>' +
            '<span class="w-8 text-center text-sm font-bold text-gray-800">' + item.qty + '</span>' +
            '<button type="button" onclick="CartUI.updateQty(\'' + item.id + '\',' + (item.qty + 1) + ')" class="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-green-50 hover:text-green-600"><i class="fa-solid fa-plus fa-xs"></i></button>' +
            '<span class="mr-auto text-xs text-gray-400">' + (item.price * item.qty).toFixed(2) + ' ' + settings.currency + '</span>' +
          '</div>' +
        '</div>' +
        '<button type="button" onclick="CartUI.removeItem(\'' + item.id + '\')" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-500 self-start flex-shrink-0"><i class="fa-solid fa-trash-can fa-xs"></i></button>' +
      '</div>';
    }).join('');

    sb.innerHTML =
      '<div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">' +
        '<h2 class="text-lg font-bold text-gray-800 flex items-center gap-2"><i class="fa-solid fa-cart-shopping text-green-600"></i> سلة المشتريات <span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">' + count + '</span></h2>' +
        '<button type="button" onclick="CartUI.closeCart()" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-500"><i class="fa-solid fa-xmark fa-sm"></i></button>' +
      '</div>' +
      '<div class="flex-1 overflow-y-auto">' + itemsHtml + '</div>' +
      '<div class="border-t border-gray-100 p-5 space-y-3 flex-shrink-0 bg-white">' +
        '<div class="flex justify-between text-sm text-gray-500"><span>عدد المنتجات</span><span class="font-semibold text-gray-700">' + count + ' قطعة</span></div>' +
        '<div class="flex justify-between font-bold text-gray-800"><span class="text-base">الإجمالي</span><span class="text-green-600 text-lg">' + total.toFixed(2) + ' ' + settings.currency + '</span></div>' +
        '<button type="button" onclick="Checkout.open()" class="w-full rounded-xl bg-green-600 py-3.5 text-white font-bold text-base hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg shadow-green-200"><i class="fa-solid fa-bag-shopping"></i> إتمام الطلب</button>' +
        '<button type="button" onclick="CartUI.clearAll()" class="w-full rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200"><i class="fa-solid fa-trash-can ml-1"></i> تفريغ السلة</button>' +
      '</div>';
  }

  function updateQty(id, qty) {
    DB.Cart.updateQty(id, qty);
    sync();
    renderSidebar();
  }

  function removeItem(id) {
    DB.Cart.remove(id);
    sync();
    renderSidebar();
    UI.showToast('تم حذف المنتج من السلة', 'info', 2000);
  }

  function clearAll() {
    UI.showConfirm({
      title: 'تفريغ السلة',
      message: 'هل أنت متأكد أنك تريد إزالة جميع المنتجات؟',
      confirmText: 'نعم، تفريغ',
      cancelText: 'إلغاء',
      type: 'danger',
      onConfirm: function () {
        DB.Cart.clear();
        sync();
        renderSidebar();
      }
    });
  }

  return {
    addToCart: addToCart,
    openCart: openCart,
    closeCart: closeCart,
    initSidebar: initSidebar,
    renderSidebar: renderSidebar,
    updateQty: updateQty,
    removeItem: removeItem,
    clearAll: clearAll,
    sync: sync,
    updateBadge: updateBadge,
    syncCards: syncCards
  };
})();

// ════════════════════════════════════════════════════════════════════
// checkout.js — إتمام الطلب + رسالة واتساب (LocalStorage فقط)
// ════════════════════════════════════════════════════════════════════

var Checkout = (function () {

  function open() {
    var cart = DB.Cart.get();
    if (cart.length === 0) {
      UI.showToast('سلتك فارغة! أضف منتجات أولاً.', 'warning');
      return;
    }

    if (!Auth.isLoggedIn()) {
      UI.showConfirm({
        title: 'تسجيل الدخول مطلوب',
        message: 'يجب تسجيل الدخول أولاً لإتمام الطلب.',
        confirmText: 'تسجيل الدخول',
        cancelText: 'إلغاء',
        type: 'info',
        onConfirm: function() { window.location.href = 'auth.html'; },
      });
      return;
    }

    var user     = Auth.getCurrentUser();
    var settings = DB.Settings.get();
    var total    = DB.Cart.total();

    // ── ملخص المنتجات ──
    var itemsHTML = cart.map(function(item) {
      return (
        '<div class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">' +
          '<div class="flex items-center gap-2">' +
            '<img src="' + item.image + '" ' +
                 'class="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0" ' +
                 'onerror="this.src=\'https://placehold.co/40x40/e2e8f0/64748b?text=م\'">' +
            '<div>' +
              '<p class="text-sm font-medium text-gray-800">' + item.name + '</p>' +
              '<p class="text-xs text-gray-400">' + item.qty + ' × ' + item.price.toFixed(2) + ' ' + settings.currency + '</p>' +
            '</div>' +
          '</div>' +
          '<span class="text-sm font-bold text-green-600 flex-shrink-0">' +
            (item.qty * item.price).toFixed(2) + ' ' + settings.currency +
          '</span>' +
        '</div>'
      );
    }).join('');

    var userName = user ? (((user.firstName || '') + ' ' + (user.lastName || '')).trim()) : '';
    var userPhone   = (user && user.phone)   || '';
    var userAddress = (user && user.address) || '';

    // ── بناء الـ Modal ──
    var overlay = document.createElement('div');
    overlay.id        = 'checkout-modal';
    overlay.className = 'fixed inset-0 z-[1001] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4';

    overlay.innerHTML = (
      '<div class="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col">' +

        // رأس النافذة
        '<div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">' +
          '<h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">' +
            '<i class="fa-solid fa-bag-shopping text-green-600"></i> إتمام الطلب' +
          '</h2>' +
          '<button id="co-close" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">' +
            '<i class="fa-solid fa-xmark fa-sm"></i>' +
          '</button>' +
        '</div>' +

        // المحتوى
        '<div class="flex-1 overflow-y-auto p-5 space-y-5">' +

          // ملخص الطلب
          '<div>' +
            '<h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">ملخص الطلب</h3>' +
            '<div class="bg-gray-50 rounded-2xl p-4">' + itemsHTML +
              '<div class="flex justify-between pt-3 mt-1 border-t border-gray-200">' +
                '<span class="font-bold text-gray-800">الإجمالي</span>' +
                '<span class="font-extrabold text-green-600 text-lg">' + total.toFixed(2) + ' ' + settings.currency + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +

          // بيانات التوصيل
          '<div>' +
            '<h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">بيانات التوصيل</h3>' +
            '<div class="space-y-3">' +

              // الاسم
              '<div class="relative">' +
                '<span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><i class="fa-regular fa-user fa-sm"></i></span>' +
                '<input id="co-name" type="text" placeholder="الاسم الكامل *" value="' + userName + '" ' +
                       'class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 ' +
                              'text-sm text-gray-800 outline-none focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100">' +
              '</div>' +

              // الهاتف
              '<div class="relative">' +
                '<span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><i class="fa-solid fa-phone fa-sm"></i></span>' +
                '<input id="co-phone" type="tel" placeholder="رقم الهاتف *" value="' + userPhone + '" ' +
                       'class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 ' +
                              'text-sm text-gray-800 outline-none focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100">' +
              '</div>' +

              // العنوان
              '<div class="relative">' +
                '<span class="absolute right-3 top-3 text-gray-400"><i class="fa-solid fa-location-dot fa-sm"></i></span>' +
                '<textarea id="co-address" rows="2" placeholder="عنوان التوصيل *" ' +
                          'class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 ' +
                                 'text-sm text-gray-800 outline-none resize-none ' +
                                 'focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100">' +
                  userAddress +
                '</textarea>' +
              '</div>' +

              // ملاحظات
              '<textarea id="co-notes" rows="2" placeholder="ملاحظات إضافية (اختياري)" ' +
                        'class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 ' +
                               'text-sm text-gray-800 outline-none resize-none ' +
                               'focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100">' +
              '</textarea>' +
            '</div>' +
          '</div>' +

          // رسالة الخطأ
          '<p id="co-error" class="hidden text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2 flex items-center gap-1.5">' +
            '<i class="fa-solid fa-circle-exclamation"></i><span></span>' +
          '</p>' +

        '</div>' +

        // زر التأكيد
        '<div class="border-t border-gray-100 p-5 flex-shrink-0">' +
          '<button id="co-submit" ' +
                  'class="w-full rounded-xl bg-green-600 py-4 text-white font-bold text-base ' +
                         'hover:bg-green-700 active:scale-95 transition-all ' +
                         'flex items-center justify-center gap-2 shadow-lg shadow-green-200">' +
            '<i class="fa-brands fa-whatsapp text-xl"></i> تأكيد الطلب وإرساله عبر واتساب' +
          '</button>' +
          '<p class="text-center text-xs text-gray-400 mt-2">' +
            '<i class="fa-solid fa-lock fa-xs ml-1"></i>بياناتك محمية وآمنة تماماً' +
          '</p>' +
        '</div>' +

      '</div>'
    );

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // ربط الأحداث
    document.getElementById('co-close').onclick = closeModal;
    overlay.onclick = function(e) { if (e.target === overlay) closeModal(); };
    document.getElementById('co-submit').onclick = submitOrder;
  }

  // ── إغلاق النافذة ─────────────────────────────────────────────────
  function closeModal() {
    var m = document.getElementById('checkout-modal');
    if (m) m.remove();
    document.body.style.overflow = '';
  }

  // ── تأكيد الطلب ───────────────────────────────────────────────────
  async function submitOrder() {
    var nameEl    = document.getElementById('co-name');
    var phoneEl   = document.getElementById('co-phone');
    var addressEl = document.getElementById('co-address');
    var notesEl   = document.getElementById('co-notes');
    var errEl     = document.getElementById('co-error');

    var name    = nameEl    ? nameEl.value.trim()    : '';
    var phone   = phoneEl   ? phoneEl.value.trim()   : '';
    var address = addressEl ? addressEl.value.trim() : '';
    var notes   = notesEl   ? notesEl.value.trim()   : '';

    if (!name || !phone || !address) {
      if (errEl) {
        errEl.classList.remove('hidden');
        var span = errEl.querySelector('span');
        if (span) span.textContent = 'يرجى ملء الاسم ورقم الهاتف وعنوان التوصيل.';
      }
      return;
    }
    if (errEl) errEl.classList.add('hidden');

    var user     = Auth.getCurrentUser();
    var cart     = DB.Cart.get();
    var settings = DB.Settings.get();
    var total    = DB.Cart.total();

    var btn = document.getElementById('co-submit');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML =
        '<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">' +
          '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>' +
          '<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>' +
        '</svg> جاري تجهيز الطلب...';
    }

    var result = await DB.Orders.add({
      email:        user.email,
      customerName: name,
      phone:        phone,
      address:      address,
      notes:        notes,
      items:        cart.map(function(i) {
        return { id: i.id, name: i.name, price: i.price, qty: i.qty, image: i.image };
      }),
      total: total,
    });

    if (!result.success) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-bag-shopping"></i> تأكيد الطلب';
      }
      UI.showToast(result.message || 'حدث خطأ أثناء حفظ الطلب. حاول مرة أخرى.', 'error');
      return;
    }

    if (user && (phone || address)) {
      try { await DB.Users.update(user.email, { phone: phone, address: address }); } catch (error) {}
    }

    var order  = result.order;
    var waMsg  = buildWhatsAppMessage(order, settings);
    var waURL  = 'https://wa.me/' + settings.whatsapp + '?text=' + encodeURIComponent(waMsg);

    await DB.Cart.clear();
    CartUI.sync();
    CartUI.closeCart();
    closeModal();
    showSuccess(order);

    setTimeout(function() { window.open(waURL, '_blank'); }, 500);
  }

  // ── رسالة واتساب ─────────────────────────────────────────────────
  function buildWhatsAppMessage(order, settings) {
    var date = new Date(order.createdAt).toLocaleString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    var lines = order.items.map(function(i) {
      return '  • ' + i.name + ' × ' + i.qty + ' = ' + (i.price * i.qty).toFixed(2) + ' ' + order.currency;
    }).join('\n');

    return (
      '🛒 *طلب جديد من ' + settings.name + '*\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '📋 *رقم الطلب:* ' + order.id + '\n' +
      '📅 *التاريخ:* ' + date + '\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '👤 *العميل:* ' + order.customerName + '\n' +
      '📱 *الهاتف:* ' + order.phone + '\n' +
      '📍 *العنوان:* ' + order.address + '\n' +
      (order.notes ? '📝 *ملاحظات:* ' + order.notes + '\n' : '') +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '🛍️ *المنتجات:*\n' + lines + '\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '💰 *الإجمالي: ' + order.total.toFixed(2) + ' ' + order.currency + '*\n' +
      '━━━━━━━━━━━━━━━━━━━━━'
    );
  }

  // ── نافذة النجاح ─────────────────────────────────────────────────
  function showSuccess(order) {
    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[1002] bg-black/50 flex items-center justify-center p-4';
    overlay.innerHTML = (
      '<div class="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">' +
        '<div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">' +
          '<i class="fa-solid fa-circle-check text-green-500 text-4xl"></i>' +
        '</div>' +
        '<h2 class="text-2xl font-extrabold text-gray-800 mb-2">تم إرسال طلبك! 🎉</h2>' +
        '<p class="text-gray-500 text-sm mb-1">رقم الطلب</p>' +
        '<p class="text-green-600 font-bold text-lg mb-4">' + order.id + '</p>' +
        '<p class="text-gray-500 text-sm mb-6 leading-relaxed">' +
          'سيتم التواصل معك عبر واتساب لتأكيد الطلب وتحديد موعد التوصيل.' +
        '</p>' +
        '<div class="space-y-2">' +
          '<a href="profile.html?tab=orders" ' +
             'class="block w-full rounded-xl bg-green-600 py-3 text-white font-bold text-sm hover:bg-green-700">' +
            '<i class="fa-solid fa-list-check ml-1"></i> عرض طلباتي' +
          '</a>' +
          '<button onclick="this.closest(\'.fixed\').remove();document.body.style.overflow=\'\';" ' +
                  'class="block w-full rounded-xl border border-gray-200 py-3 text-gray-600 text-sm hover:bg-gray-50">' +
            'متابعة التسوق' +
          '</button>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  return { open: open };
})();

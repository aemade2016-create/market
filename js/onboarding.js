var Onboarding = (function () {
  var activePromise = null;

  function isComplete(user) {
    return !!(user && String(user.username || '').trim() && String(user.phone || '').trim() && String(user.address || '').trim());
  }

  function showModal(user) {
    if (activePromise) return activePromise;

    activePromise = new Promise(function (resolve) {
      var previousOverflow = document.body.style.overflow;
      var inertElements = Array.prototype.filter.call(document.body.children, function (element) {
        return element.id !== 'mandatory-onboarding';
      });
      var previousInert = inertElements.map(function (element) { return element.inert; });
      var overlay = document.createElement('div');
      overlay.id = 'mandatory-onboarding';
      overlay.className = 'fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-gray-950/70 p-4';
      overlay.innerHTML =
        '<section role="dialog" aria-modal="true" aria-labelledby="onboarding-title" class="my-auto w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">' +
          '<div class="mb-5 text-center">' +
            '<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700"><i class="fa-solid fa-user-pen"></i></div>' +
            '<h2 id="onboarding-title" class="text-xl font-extrabold text-gray-900">استكمال بيانات الحساب</h2>' +
            '<p class="mt-2 text-sm leading-6 text-gray-600">يرجى إدخال البيانات المطلوبة للمتابعة.</p>' +
          '</div>' +
          '<form id="onboarding-form" class="space-y-4" novalidate>' +
            '<label class="block text-sm font-semibold text-gray-700">اسم المستخدم' +
              '<input id="onboarding-username" name="username" type="text" autocomplete="username" maxlength="30" required class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100" placeholder="مثال: ahmed_23">' +
            '</label>' +
            '<label class="block text-sm font-semibold text-gray-700">رقم الهاتف' +
              '<input id="onboarding-phone" name="phone" type="tel" autocomplete="tel" required class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100" placeholder="رقم الهاتف">' +
            '</label>' +
            '<label class="block text-sm font-semibold text-gray-700">العنوان' +
              '<textarea id="onboarding-address" name="address" autocomplete="street-address" rows="2" required class="mt-1 w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100" placeholder="عنوانك بالتفصيل"></textarea>' +
            '</label>' +
            '<p id="onboarding-error" class="hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert"></p>' +
            '<button id="onboarding-save" type="submit" class="flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"><i class="fa-solid fa-floppy-disk"></i> حفظ ومتابعة</button>' +
          '</form>' +
        '</section>';

      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
      inertElements.forEach(function (element) { element.inert = true; });

      var form = document.getElementById('onboarding-form');
      var usernameInput = document.getElementById('onboarding-username');
      var phoneInput = document.getElementById('onboarding-phone');
      var addressInput = document.getElementById('onboarding-address');
      var errorElement = document.getElementById('onboarding-error');
      var saveButton = document.getElementById('onboarding-save');
      usernameInput.value = user.username || '';
      phoneInput.value = user.phone || '';
      addressInput.value = user.address || '';
      usernameInput.focus();

      function handleKeydown(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          return;
        }
        if (event.key !== 'Tab') return;
        var controls = overlay.querySelectorAll('input, textarea, button');
        var first = controls[0];
        var last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      document.addEventListener('keydown', handleKeydown);

      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        errorElement.classList.add('hidden');
        var values = {
          username: usernameInput.value.trim().toLowerCase(),
          phone: phoneInput.value.trim(),
          address: addressInput.value.trim(),
        };
        if (!/^[a-z0-9_.-]{3,30}$/.test(values.username)) {
          errorElement.textContent = 'اسم المستخدم يجب أن يتكون من 3 إلى 30 حرفاً إنجليزياً أو رقماً أو (._-).';
          errorElement.classList.remove('hidden');
          usernameInput.focus();
          return;
        }
        if (!values.phone || !values.address) {
          errorElement.textContent = 'يرجى إدخال رقم الهاتف والعنوان.';
          errorElement.classList.remove('hidden');
          return;
        }

        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جارٍ الحفظ';
        var result = await DB.Users.update(user.email, values);
        if (!result.success || !isComplete(result.user)) {
          errorElement.textContent = result.message || 'تعذر التحقق من اكتمال البيانات المحفوظة.';
          errorElement.classList.remove('hidden');
          saveButton.disabled = false;
          saveButton.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ ومتابعة';
          return;
        }

        document.removeEventListener('keydown', handleKeydown);
        overlay.remove();
        document.body.style.overflow = previousOverflow;
        inertElements.forEach(function (element, index) { element.inert = previousInert[index]; });
        activePromise = null;
        resolve(true);
      });
    });

    return activePromise;
  }

  async function ensureComplete() {
    var user = DB.Session.get();
    if (!user) return false;
    if (isComplete(user)) return true;
    return showModal(user);
  }

  return { ensureComplete: ensureComplete };
})();
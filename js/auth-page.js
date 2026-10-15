// ════════════════════════════════════════════════════════════════════
// auth-page.js — منطق واجهة صفحة auth.html (LocalStorage فقط)
// ════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
  // تهيئة قاعدة البيانات
  DB.init();

  // تحميل بيانات المتجر في الشعار
  var s = DB.Settings.get();
  var logoEl = document.getElementById('header-logo');
  var nameEl = document.getElementById('header-name');
  if (logoEl) logoEl.src = s.logo;
  if (nameEl) nameEl.textContent = s.name;
  document.title = 'تسجيل الدخول — ' + s.name;

  // إذا كان مسجّلاً بالفعل → حوّله
  Auth.redirectIfLoggedIn();

  // ── النماذج الثلاثة ───────────────────────────────────────────────
  var forms = {
    login:    document.getElementById('form-login'),
    register: document.getElementById('form-register'),
    reset:    document.getElementById('form-reset'),
  };

  function showForm(name) {
    Object.keys(forms).forEach(function(k) {
      if (forms[k]) forms[k].classList.toggle('hidden', k !== name);
    });
    clearErrors();
  }

  var goReg   = document.getElementById('go-to-register');
  var goLogin = document.getElementById('go-to-login');
  var goReset = document.getElementById('go-to-reset');
  var goBack  = document.getElementById('back-to-login');
  if (goReg)   goReg.addEventListener('click',   function() { showForm('register'); });
  if (goLogin) goLogin.addEventListener('click', function() { showForm('login'); });
  if (goReset) goReset.addEventListener('click', function() { showForm('reset'); });
  if (goBack)  goBack.addEventListener('click',  function() { showForm('login'); });

  // ── إظهار/إخفاء كلمة المرور ──────────────────────────────────────
  function setupToggle(btnId, inputId) {
    var btn   = document.getElementById(btnId);
    var input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', function() {
      var isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      var icon = btn.querySelector('i');
      if (icon) icon.className = isPass ? 'fa-regular fa-eye-slash fa-sm' : 'fa-regular fa-eye fa-sm';
    });
  }
  setupToggle('toggle-login-pass',  'login-password');
  setupToggle('toggle-reg-pass',    'reg-password');
  setupToggle('toggle-reg-confirm', 'reg-confirm');

  // ── مؤشر قوة كلمة المرور ─────────────────────────────────────────
  var regPass = document.getElementById('reg-password');
  if (regPass) {
    regPass.addEventListener('input', function() {
      var val = this.value;
      var container = document.getElementById('strength-container');
      var label     = document.getElementById('strength-label');
      if (!container || !label) return;
      if (!val) { container.classList.add('hidden'); return; }
      container.classList.remove('hidden');
      var score = 0;
      if (val.length >= 6)              score++;
      if (val.length >= 10)             score++;
      if (/[A-Z]/.test(val))            score++;
      if (/[0-9!@#$%^&*]/.test(val))   score++;
      var colors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
      var labels = ['', '⚠️ ضعيفة جداً', '😐 ضعيفة', '🙂 متوسطة', '💪 قوية'];
      var tClrs  = ['', 'text-red-400', 'text-orange-400', 'text-yellow-500', 'text-green-600'];
      for (var i = 1; i <= 4; i++) {
        var bar = document.getElementById('s' + i);
        if (bar) bar.className = 'strength-bar flex-1 ' + (i <= score ? colors[score] : 'bg-gray-200');
      }
      label.textContent = labels[score] || '';
      label.className   = 'text-xs ' + (tClrs[score] || 'text-gray-400');
    });
  }

  // ── رسائل الخطأ ───────────────────────────────────────────────────
  function showError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    var span = el.querySelector('span');
    if (span) span.textContent = msg;
    else el.textContent = msg;
  }
  function hideError(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }
  function clearErrors() {
    ['login-error', 'register-error', 'reset-error'].forEach(hideError);
  }

  // ── حالة التحميل ─────────────────────────────────────────────────
  function setLoading(btn, loading, defaultHTML) {
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.innerHTML =
        '<svg class="animate-spin h-5 w-5 text-white inline-block ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">' +
          '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>' +
          '<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>' +
        '</svg> جاري...';
      btn.classList.add('opacity-80', 'cursor-not-allowed');
    } else {
      btn.disabled = false;
      btn.innerHTML = defaultHTML;
      btn.classList.remove('opacity-80', 'cursor-not-allowed');
    }
  }

  // ── نموذج تسجيل الدخول ───────────────────────────────────────────
  var loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      hideError('login-error');
      var email = document.getElementById('login-email').value.trim();
      var pass  = document.getElementById('login-password').value;
      var btn   = this.querySelector('button[type="submit"]');
      setLoading(btn, true);
      setTimeout(function() {
        var r = Auth.login(email, pass);
        setLoading(btn, false, '<i class="fa-solid fa-right-to-bracket"></i> تسجيل الدخول');
        if (!r.success) {
          showError('login-error', r.message);
          if (UI && UI.shake) UI.shake(loginForm);
          return;
        }
        UI.showToast('أهلاً بك' + (r.user.firstName ? '، ' + r.user.firstName : '') + '! ✨', 'success');
        setTimeout(function() {
          window.location.href = r.isAdmin ? 'admin.html' : 'index.html';
        }, 900);
      }, 300);
    });
  }

  // ── نموذج إنشاء الحساب ───────────────────────────────────────────
  var registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      hideError('register-error');
      var data = {
        firstName:       document.getElementById('reg-first').value.trim(),
        lastName:        document.getElementById('reg-last').value.trim(),
        email:           document.getElementById('reg-email').value.trim(),
        password:        document.getElementById('reg-password').value,
        confirmPassword: document.getElementById('reg-confirm').value,
      };
      var btn = this.querySelector('button[type="submit"]');
      setLoading(btn, true);
      setTimeout(function() {
        var r = Auth.register(data);
        setLoading(btn, false, '<i class="fa-solid fa-user-plus"></i> إنشاء الحساب');
        if (!r.success) {
          showError('register-error', r.message);
          if (UI && UI.shake) UI.shake(registerForm);
          return;
        }
        UI.showToast('تم إنشاء حسابك بنجاح! يسعدنا انضمامك 🎉', 'success');
        setTimeout(function() { window.location.href = 'index.html'; }, 900);
      }, 400);
    });
  }

  // ── نموذج نسيان كلمة المرور ──────────────────────────────────────
  var resetForm = document.getElementById('reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', function(e) {
      e.preventDefault();
      hideError('reset-error');
      var email = document.getElementById('reset-email').value.trim();
      var btn   = this.querySelector('button[type="submit"]');
      setLoading(btn, true);
      setTimeout(function() {
        var r = Auth.requestPasswordReset(email);
        setLoading(btn, false, '<i class="fa-solid fa-paper-plane"></i> إرسال رابط التحقق');
        if (!r.success) { showError('reset-error', r.message); return; }
        resetForm.innerHTML =
          '<div class="text-center py-4">' +
            '<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">' +
              '<i class="fa-solid fa-envelope-circle-check text-green-600 text-3xl"></i>' +
            '</div>' +
            '<h3 class="text-lg font-bold text-gray-800 mb-2">تم الإرسال بنجاح!</h3>' +
            '<p class="text-gray-500 text-sm leading-relaxed">' + r.message + '</p>' +
            '<button onclick="window.location.reload()" ' +
                    'class="mt-5 text-sm text-green-600 hover:text-green-700 font-semibold">' +
              'العودة لتسجيل الدخول' +
            '</button>' +
          '</div>';
        UI.showToast(r.message, 'success');
      }, 600);
    });
  }

  // ── Social Login (محاكاة) ─────────────────────────────────────────
  window.handleSocialLogin = function(provider) {
    UI.showToast(
      'ميزة تسجيل الدخول عبر ' + (provider === 'google' ? 'Google' : 'Facebook') + ' ستكون متاحة قريباً 🚀',
      'info'
    );
  };

});

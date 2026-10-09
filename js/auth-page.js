// ════════════════════════════════════════════════════════════════════
// auth-page.js — منطق واجهة صفحة auth.html
// ════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async function () {
  var recoveryMode = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type') === 'recovery';
  try {
    await DB.init();
  } catch (error) {
    var loginError = document.getElementById('login-error');
    if (loginError) {
      loginError.classList.remove('hidden');
      var errorText = loginError.querySelector('span');
      if (errorText) errorText.textContent = error.message || 'تعذر الاتصال بقاعدة البيانات.';
    }
    return;
  }
  if (!recoveryMode) Auth.redirectIfLoggedIn();

  // تحميل بيانات المتجر
  var s = DB.Settings.get();
  var logoEl = document.getElementById('header-logo');
  var nameEl = document.getElementById('header-name');
  if (logoEl) logoEl.src = s.logo;
  if (nameEl) nameEl.textContent = s.name;
  document.title = 'تسجيل الدخول — ' + s.name;

  var forms = {
    login:    document.getElementById('form-login'),
    register: document.getElementById('form-register'),
    reset:    document.getElementById('form-reset'),
  };

  function showForm(name) {
    Object.keys(forms).forEach(function (k) {
      forms[k].classList.toggle('hidden', k !== name);
    });
    clearErrors();
  }

  if (recoveryMode) {
    document.querySelector('#form-reset h2').textContent = 'تعيين كلمة مرور جديدة';
    document.querySelector('#form-reset .text-gray-500.text-sm').textContent = 'اكتب كلمة المرور الجديدة لحسابك';
    document.getElementById('reset-form').innerHTML =
      '<div class="space-y-4">' +
        '<input id="recovery-password" type="password" placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)" class="form-input" autocomplete="new-password"/>' +
        '<p id="recovery-error" class="hidden text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2"></p>' +
        '<button type="submit" class="btn-primary"><i class="fa-solid fa-key"></i> حفظ كلمة المرور</button>' +
      '</div>';
    showForm('reset');
  }

  document.getElementById('go-to-register').addEventListener('click', function () { showForm('register'); });
  document.getElementById('go-to-login').addEventListener('click',    function () { showForm('login'); });
  document.getElementById('go-to-reset').addEventListener('click',    function () { showForm('reset'); });
  document.getElementById('back-to-login').addEventListener('click',  function () { showForm('login'); });

  // ── Toggle كلمة المرور ───────────────────────────────────────────
  function setupToggle(btnId, inputId) {
    var btn   = document.getElementById(btnId);
    var input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', function () {
      var isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      btn.querySelector('i').className = isPass ? 'fa-regular fa-eye-slash fa-sm' : 'fa-regular fa-eye fa-sm';
    });
  }
  setupToggle('toggle-login-pass',  'login-password');
  setupToggle('toggle-reg-pass',    'reg-password');
  setupToggle('toggle-reg-confirm', 'reg-confirm');

  // ── مؤشر قوة كلمة المرور ─────────────────────────────────────────
  var regPassInput = document.getElementById('reg-password');
  if (regPassInput) {
    regPassInput.addEventListener('input', function () {
      var val  = this.value;
      var container = document.getElementById('strength-container');
      var label     = document.getElementById('strength-label');
      if (!val) { container.classList.add('hidden'); return; }
      container.classList.remove('hidden');
      var score = 0;
      if (val.length >= 6)             score++;
      if (val.length >= 10)            score++;
      if (/[A-Z]/.test(val))           score++;
      if (/[0-9!@#$%^&*]/.test(val))  score++;
      var colors = ['','bg-red-400','bg-orange-400','bg-yellow-400','bg-green-500'];
      var labels = ['','⚠️ ضعيفة جداً','😐 ضعيفة','🙂 متوسطة','💪 قوية'];
      var tClrs  = ['','text-red-400','text-orange-400','text-yellow-500','text-green-600'];
      [1,2,3,4].forEach(function (i) {
        var bar = document.getElementById('s'+i);
        if (bar) bar.className = 'strength-bar flex-1 ' + (i <= score ? colors[score] : 'bg-gray-200');
      });
      label.textContent = labels[score] || '';
      label.className   = 'text-xs ' + (tClrs[score] || 'text-gray-400');
    });
  }

  // ── الأخطاء ───────────────────────────────────────────────────────
  function showError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    var span = el.querySelector('span');
    if (span) span.textContent = msg; else el.textContent = msg;
  }
  function hideError(id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); }
  function clearErrors() { ['login-error','register-error','reset-error'].forEach(hideError); }

  // ── تسجيل الدخول ─────────────────────────────────────────────────
  document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError('login-error');
    var email = document.getElementById('login-email').value.trim();
    var pass  = document.getElementById('login-password').value;
    var btn   = this.querySelector('button[type="submit"]');
    setLoading(btn, true);
    var result = await Auth.login(email, pass);
    setLoading(btn, false, '<i class="fa-solid fa-right-to-bracket"></i> تسجيل الدخول');
    if (!result.success) { showError('login-error', result.message); UI.shake(document.getElementById('login-form')); return; }
    UI.showToast('أهلاً بك' + (result.user.firstName ? '، ' + result.user.firstName : '') + '! ✨', 'success');
    setTimeout(function () { window.location.href = result.isAdmin ? 'admin.html' : 'index.html'; }, 500);
  });

  // ── إنشاء حساب ───────────────────────────────────────────────────
  document.getElementById('register-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError('register-error');
    var data = {
      firstName: document.getElementById('reg-first').value.trim(),
      lastName:  document.getElementById('reg-last').value.trim(),
      email:     document.getElementById('reg-email').value.trim(),
      password:  document.getElementById('reg-password').value,
      confirmPassword: document.getElementById('reg-confirm').value,
    };
    var btn = this.querySelector('button[type="submit"]');
    setLoading(btn, true);
    var result = await Auth.register(data);
    setLoading(btn, false, '<i class="fa-solid fa-user-plus"></i> إنشاء الحساب');
    if (!result.success) { showError('register-error', result.message); UI.shake(document.getElementById('register-form')); return; }
    if (result.requiresConfirmation) {
      UI.showToast(result.message, 'info', 5000);
      showForm('login');
      return;
    }
    UI.showToast('تم إنشاء حسابك بنجاح! يسعدنا انضمامك 🎉', 'success');
    setTimeout(function () { window.location.href = 'index.html'; }, 500);
  });

  // ── نسيان كلمة المرور ────────────────────────────────────────────
  document.getElementById('reset-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError('reset-error');
    if (recoveryMode) {
      var newPassword = document.getElementById('recovery-password').value;
      var recoveryError = document.getElementById('recovery-error');
      var recoveryButton = this.querySelector('button[type="submit"]');
      if (newPassword.length < 6) {
        recoveryError.textContent = 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.';
        recoveryError.classList.remove('hidden');
        return;
      }
      setLoading(recoveryButton, true);
      var passwordResult = await Auth.updatePassword(newPassword);
      setLoading(recoveryButton, false, '<i class="fa-solid fa-key"></i> حفظ كلمة المرور');
      if (!passwordResult.success) {
        recoveryError.textContent = passwordResult.message;
        recoveryError.classList.remove('hidden');
        return;
      }
      UI.showToast('تم تحديث كلمة المرور بنجاح', 'success');
      setTimeout(function () { window.location.href = 'index.html'; }, 500);
      return;
    }
    var email = document.getElementById('reset-email').value.trim();
    var btn   = this.querySelector('button[type="submit"]');
    setLoading(btn, true);
    var result = await Auth.requestPasswordReset(email);
    setLoading(btn, false, '<i class="fa-solid fa-paper-plane"></i> إرسال رابط التحقق');
    if (!result.success) { showError('reset-error', result.message); return; }
    document.getElementById('reset-form').innerHTML =
      '<div class="text-center py-4">' +
        '<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fa-solid fa-envelope-circle-check text-green-600 text-3xl"></i></div>' +
        '<h3 class="text-lg font-bold text-gray-800 mb-2">تم الإرسال بنجاح!</h3>' +
        '<p class="text-gray-500 text-sm leading-relaxed">' + result.message + '</p>' +
        '<button onclick="window.location.reload()" class="mt-5 text-sm text-green-600 hover:text-green-700 font-semibold">العودة لتسجيل الدخول</button>' +
      '</div>';
    UI.showToast(result.message, 'success');
  });

  // ── Social Login ──────────────────────────────────────────────────
  window.handleSocialLogin = async function (provider) {
    var buttonId = provider === 'google' ? 'google-login' : 'facebook-login';
    var button = document.getElementById(buttonId);
    var defaultHTML = button ? button.innerHTML : '';
    if (button) setLoading(button, true);
    var result = await Auth.loginWithOAuth(provider);
    if (!result.success) {
      if (button) setLoading(button, false, defaultHTML);
      showError('login-error', result.message || 'تعذر بدء تسجيل الدخول الاجتماعي.');
      return;
    }
  };

  // ── Loading ───────────────────────────────────────────────────────
  function setLoading(btn, loading, defaultHTML) {
    if (loading) {
      btn.disabled = true;
      btn.innerHTML = '<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> جاري...';
      btn.classList.add('opacity-80', 'cursor-not-allowed');
    } else {
      btn.disabled = false;
      btn.innerHTML = defaultHTML;
      btn.classList.remove('opacity-80', 'cursor-not-allowed');
    }
  }
});

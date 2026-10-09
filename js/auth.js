// ════════════════════════════════════════════════════════════════════
// auth.js — نظام المصادقة (بدون import/export)
// يعتمد على DB المعرَّف في db.js
// ════════════════════════════════════════════════════════════════════

var Auth = (function () {

  function errorMessage(error) {
    var message = error && error.message ? error.message : '';
    if (/invalid login credentials/i.test(message)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    if (/email not confirmed/i.test(message)) return 'يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.';
    if (/user already registered/i.test(message)) return 'هذا البريد الإلكتروني مسجّل بالفعل.';
    return message || 'تعذر إتمام العملية. حاول مرة أخرى.';
  }

  async function login(email, password) {
    if (!email || !password) return { success: false, message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' };
    try {
      var result = await window.supabaseClient.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });
      if (result.error) return { success: false, message: errorMessage(result.error) };
      var user = await DB.syncSession();
      return { success: true, user: user, isAdmin: DB.Admins.isAdmin(user.email) };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  }

  async function loginWithOAuth(provider) {
    if (provider !== 'google' && provider !== 'facebook') {
      return { success: false, message: 'مزود تسجيل الدخول غير مدعوم.' };
    }
    if (window.location.protocol === 'file:') {
      return { success: false, message: 'افتح الموقع عبر localhost أو نطاق منشور لتسجيل الدخول الاجتماعي.' };
    }
    try {
      var redirectTo = window.location.origin + window.location.pathname;
      var result = await window.supabaseClient.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: redirectTo },
      });
      if (result.error) return { success: false, message: errorMessage(result.error) };
      return { success: true };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  }

  async function register(data) {
    var firstName = data.firstName;
    var lastName = data.lastName;
    var email = data.email;
    var password = data.password;
    var confirmPassword = data.confirmPassword;
    if (!firstName || !lastName || !email || !password || !confirmPassword) return { success: false, message: 'يرجى ملء جميع الحقول المطلوبة.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: 'يرجى إدخال بريد إلكتروني صحيح.' };
    if (password !== confirmPassword) return { success: false, message: 'كلمتا المرور غير متطابقتين.' };
    if (password.length < 6) return { success: false, message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.' };

    try {
      var result = await window.supabaseClient.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
      });
      if (result.error) return { success: false, message: errorMessage(result.error) };
      if (!result.data.session) {
        return { success: true, requiresConfirmation: true, message: 'تم إنشاء الحساب. راجع بريدك الإلكتروني لتأكيده قبل تسجيل الدخول.' };
      }
      var user = await DB.syncSession();
      return { success: true, user: user, requiresConfirmation: false };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  }

  async function logout(redirectTo) {
    try { await window.supabaseClient.auth.signOut(); } catch (error) { console.error('[Auth] sign out failed:', error); }
    DB.Session.clear();
    window.location.href = redirectTo || 'auth.html';
  }

  function getCurrentUser() { return DB.Session.get(); }
  function isLoggedIn() { return DB.Session.isLoggedIn(); }
  function isAdmin() {
    var user = DB.Session.get();
    return user ? DB.Admins.isAdmin(user.email) : false;
  }

  function requireAuth(redirectTo) {
    if (!isLoggedIn()) { window.location.href = redirectTo || 'auth.html'; return false; }
    return true;
  }

  function requireAdmin(redirectTo) {
    if (!isLoggedIn()) { window.location.href = 'auth.html'; return false; }
    if (!isAdmin()) { window.location.href = redirectTo || 'index.html'; return false; }
    return true;
  }

  function redirectIfLoggedIn() {
    if (isLoggedIn()) window.location.href = isAdmin() ? 'admin.html' : 'index.html';
  }

  async function requestPasswordReset(email) {
    if (!email) return { success: false, message: 'يرجى إدخال البريد الإلكتروني.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: 'يرجى إدخال بريد إلكتروني صحيح.' };
    try {
      var result = await window.supabaseClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (result.error) return { success: false, message: errorMessage(result.error) };
      return { success: true, message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.' };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  }

  async function updatePassword(password) {
    try {
      var result = await window.supabaseClient.auth.updateUser({ password: password });
      if (result.error) return { success: false, message: errorMessage(result.error) };
      return { success: true };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  }

  async function changePassword(currentPassword, newPassword) {
    var user = getCurrentUser();
    if (!user) return { success: false, message: 'يجب تسجيل الدخول أولاً.' };
    try {
      var verified = await window.supabaseClient.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verified.error) return { success: false, message: 'كلمة المرور الحالية غير صحيحة.' };
      return await updatePassword(newPassword);
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  }

  return { login: login, loginWithOAuth: loginWithOAuth, register: register, logout: logout, getCurrentUser: getCurrentUser, isLoggedIn: isLoggedIn, isAdmin: isAdmin, requireAuth: requireAuth, requireAdmin: requireAdmin, redirectIfLoggedIn: redirectIfLoggedIn, requestPasswordReset: requestPasswordReset, updatePassword: updatePassword, changePassword: changePassword };
})();

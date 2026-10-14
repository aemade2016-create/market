// ════════════════════════════════════════════════════════════════════
// auth.js — نظام المصادقة (بدون import/export)
// يعتمد على DB المعرَّف في db.js
// ════════════════════════════════════════════════════════════════════

var Auth = (function () {
  var socialAuthDetected = false;

  function errorMessage(error) {
    var message = error && error.message ? error.message : '';
    if (/invalid login credentials/i.test(message)) return 'اسم المستخدم أو كلمة المرور غير صحيحة.';
    if (/email not confirmed/i.test(message)) return 'يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.';
    if (/user already registered/i.test(message)) return 'هذا البريد الإلكتروني مسجّل بالفعل.';
    if (/users_username_lower_idx|duplicate key/i.test(message)) return 'اسم المستخدم مسجّل بالفعل.';
    return message || 'تعذر إتمام العملية. حاول مرة أخرى.';
  }

  async function login(username, password) {
    if (!username || !password) return { success: false, message: 'يرجى إدخال اسم المستخدم وكلمة المرور.' };
    try {
      var lookup = await window.supabaseClient.rpc('email_for_username', {
        requested_username: username.trim().toLowerCase(),
      });
      if (lookup.error) return { success: false, message: errorMessage(lookup.error) };
      if (!lookup.data) return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
      var result = await window.supabaseClient.auth.signInWithPassword({
        email: lookup.data,
        password: password,
      });
      if (result.error) return { success: false, message: errorMessage(result.error) };
      var user = await DB.syncSession({ user: result.data.user, skipRefresh: true });
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
    var fullName = String(data.fullName || [data.firstName, data.lastName].filter(Boolean).join(' ') || '').trim();
    var username = String(data.username || '').trim().toLowerCase();
    var email = data.email;
    var password = data.password;
    var confirmPassword = data.confirmPassword;
    if (!fullName || !username || !email || !password || !confirmPassword) return { success: false, message: 'يرجى ملء جميع الحقول المطلوبة.' };
    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) return { success: false, message: 'اسم المستخدم يجب أن يتكون من 3 إلى 30 حرفاً إنجليزياً أو رقماً أو (._-).' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: 'يرجى إدخال بريد إلكتروني صحيح.' };
    if (password !== confirmPassword) return { success: false, message: 'كلمتا المرور غير متطابقتين.' };
    if (password.length < 6) return { success: false, message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.' };

    try {
      var result = await window.supabaseClient.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: { data: { first_name: fullName, last_name: '', full_name: fullName, username: username } },
      });
      if (result.error) return { success: false, message: errorMessage(result.error) };
      if (!result.data.session) {
        return { success: true, requiresConfirmation: true, message: 'تم إنشاء الحساب. راجع بريدك الإلكتروني لتأكيده قبل تسجيل الدخول.' };
      }
      var user = await DB.syncSession({ user: result.data.user, skipRefresh: true });
      return { success: true, user: user, requiresConfirmation: false };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  }

  async function logout(redirectTo) {
    try { await window.supabaseClient.auth.signOut(); } catch (error) { console.error('[Auth] sign out failed:', error); }
    DB.Session.clear();
    window.location.href = redirectTo || './auth.html';
  }

  function getCurrentUser() { return DB.Session.get(); }
  function isLoggedIn() { return DB.Session.isLoggedIn(); }
  function isAdmin() {
    var user = DB.Session.get();
    return user ? DB.Admins.isAdmin(user.email) : false;
  }

  function requireAuth(redirectTo) {
    if (!isLoggedIn()) { window.location.href = redirectTo || './auth.html'; return false; }
    return true;
  }

  function requireAdmin(redirectTo) {
    if (!isLoggedIn()) { window.location.href = './auth.html'; return false; }
    if (!isAdmin()) { window.location.href = redirectTo || './index.html'; return false; }
    return true;
  }

  function redirectIfLoggedIn() {
    if (isLoggedIn()) window.location.href = socialAuthDetected || !isAdmin() ? './index.html' : './admin.html';
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

  function isSocialUser(user) {
    var provider = user && user.app_metadata && user.app_metadata.provider;
    return provider === 'google' || provider === 'facebook';
  }

  function isAuthPage() {
    return /\/auth(\.html)?$/.test(window.location.pathname);
  }

  if (window.supabaseClient && window.supabaseClient.auth && window.supabaseClient.auth.onAuthStateChange) {
    window.supabaseClient.auth.onAuthStateChange(function (event, session) {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && isSocialUser(session.user)) {
        socialAuthDetected = true;
        // INITIAL_SESSION يتبعت مع كل تحميل صفحة، فالتحويل برّه صفحة الدخول بيعمل حلقة إعادة تحميل
        if (isAuthPage()) window.location.href = './index.html';
      }
    });
  }

  return { login: login, loginWithOAuth: loginWithOAuth, register: register, logout: logout, getCurrentUser: getCurrentUser, isLoggedIn: isLoggedIn, isAdmin: isAdmin, requireAuth: requireAuth, requireAdmin: requireAdmin, redirectIfLoggedIn: redirectIfLoggedIn, requestPasswordReset: requestPasswordReset, updatePassword: updatePassword, changePassword: changePassword };
})();

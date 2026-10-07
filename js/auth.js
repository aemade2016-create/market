// ════════════════════════════════════════════════════════════════════
// auth.js — نظام المصادقة (بدون import/export)
// يعتمد على DB المعرَّف في db.js
// ════════════════════════════════════════════════════════════════════

var Auth = (function () {

  function login(email, password) {
    if (!email || !password)
      return { success:false, message:'يرجى إدخال البريد الإلكتروني وكلمة المرور.' };

    var em = email.toLowerCase().trim();
    var isAdm = DB.Admins.isAdmin(em);
    var user  = DB.Users.findByEmail(em);

    if (isAdm) {
      var adminPassword = DB.DEFAULT_ADMIN_PASSWORD || 'admin123';
      var userPasswordMatches = !!user && user.password === password;
      var adminPasswordMatches = password === adminPassword;

      if (!userPasswordMatches && !adminPasswordMatches)
        return { success:false, message:'كلمة المرور غير صحيحة.' };

      var sessionUser = Object.assign({}, user || {
        id: 'admin_' + Date.now(),
        email: em,
        firstName: 'المدير',
        lastName: '',
        isAdmin: true,
      }, { isAdmin: true });

      if (!user || !sessionUser.password) sessionUser.password = adminPassword;
      DB.Session.set(sessionUser);
      return { success:true, user:sessionUser, isAdmin:true };
    }

    if (!user)  return { success:false, message:'البريد الإلكتروني غير مسجّل. يرجى إنشاء حساب جديد.' };
    if (user.password !== password) return { success:false, message:'كلمة المرور غير صحيحة.' };

    DB.Session.set(Object.assign({}, user, { isAdmin:false }));
    return { success:true, user:user, isAdmin:false };
  }

  function register(data) {
    var f = data.firstName, l = data.lastName, e = data.email, p = data.password, c = data.confirmPassword;
    if (!f || !l || !e || !p || !c) return { success:false, message:'يرجى ملء جميع الحقول المطلوبة.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { success:false, message:'يرجى إدخال بريد إلكتروني صحيح.' };
    if (p !== c)  return { success:false, message:'كلمتا المرور غير متطابقتين.' };
    if (p.length < 6) return { success:false, message:'يجب أن تكون كلمة المرور 6 أحرف على الأقل.' };

    var result = DB.Users.add({ firstName:f.trim(), lastName:l.trim(), email:e.toLowerCase().trim(), password:p });
    if (!result.success) return result;

    DB.Session.set(Object.assign({}, result.user, { isAdmin:false }));
    return { success:true, user:result.user };
  }

  function logout(redirectTo) {
    DB.Session.clear();
    window.location.href = redirectTo || 'auth.html';
  }

  function getCurrentUser() { return DB.Session.get(); }
  function isLoggedIn()     { return DB.Session.isLoggedIn(); }
  function isAdmin()        { var u = DB.Session.get(); return u ? DB.Admins.isAdmin(u.email) : false; }

  function requireAuth(redirectTo) {
    if (!isLoggedIn()) { window.location.href = redirectTo || 'auth.html'; return false; }
    return true;
  }

  function requireAdmin(redirectTo) {
    if (!isLoggedIn()) { window.location.href = 'auth.html'; return false; }
    if (!isAdmin())    { window.location.href = redirectTo || 'index.html'; return false; }
    return true;
  }

  function redirectIfLoggedIn() {
    if (isLoggedIn()) window.location.href = isAdmin() ? 'admin.html' : 'index.html';
  }

  function requestPasswordReset(email) {
    if (!email) return { success:false, message:'يرجى إدخال البريد الإلكتروني.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success:false, message:'يرجى إدخال بريد إلكتروني صحيح.' };
    return { success:true, message:'تم إرسال رابط التحقق لتغيير كلمة المرور إلى بريدك الإلكتروني.' };
  }

  return { login, register, logout, getCurrentUser, isLoggedIn, isAdmin, requireAuth, requireAdmin, redirectIfLoggedIn, requestPasswordReset };
})();

// Supabase-backed data adapters. The cart remains local to each browser.
(function () {
  var client = window.supabaseClient;
  var localDB = {
    init: DB.init,
    Users: DB.Users,
    Admins: DB.Admins,
    Settings: DB.Settings,
    Products: DB.Products,
    Categories: DB.Categories,
    Orders: DB.Orders,
    Session: DB.Session,
    Cart: DB.Cart,
  };

  var cache = {
    settings: null,
    products: [],
    categories: [],
    categoriesTableMissing: false,
    orders: [],
    profiles: [],
    admins: [],
  };
  var currentUser = null;
  var isAdmin = false;

  function requireClient() {
    if (!client) throw new Error('تعذر الاتصال بـ Supabase. تحقق من تحميل المكتبة وإعدادات المشروع.');
    return client;
  }

  function asError(error) {
    return { success: false, message: error && error.message ? error.message : 'حدث خطأ في الاتصال بقاعدة البيانات.' };
  }

  function isMissingCategoriesTable(error) {
    return !!error && (error.code === 'PGRST205' || /store_categories.*schema cache|schema cache.*store_categories/i.test(error.message || ''));
  }

  function missingCategoriesMessage() {
    return 'جدول الأقسام غير موجود في Supabase. شغّل ملف supabase-schema.sql في SQL Editor ثم أعد تحميل الصفحة.';
  }

  async function invokeAdminUsers(body) {
    try {
      var response = await requireClient().functions.invoke('admin-users', { body: body });
      if (response.error) {
        var message = response.error.message;
        try {
          var details = await response.error.context.json();
          if (details && details.message) message = details.message;
        } catch (error) {}
        return { success: false, message: message };
      }
      if (!response.data || response.data.success !== true) {
        return { success: false, message: response.data && response.data.message || 'تعذر تنفيذ العملية.' };
      }
      return { success: true, data: response.data };
    } catch (error) { return asError(error); }
  }

  function profileFromRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      phone: row.phone || '',
      address: row.address || '',
      createdAt: row.created_at,
      ordersEnabled: row.orders_enabled !== false,
    };
  }

  function authName(metadata, field) {
    metadata = metadata || {};
    if (metadata[field]) return metadata[field];
    var fullName = String(metadata.full_name || metadata.name || '').trim();
    if (!fullName) return '';
    var parts = fullName.split(/\s+/);
    return field === 'first_name' ? parts[0] : parts.slice(1).join(' ');
  }

  function orderFromRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      customerName: row.customer_name || '',
      phone: row.phone || '',
      address: row.address || '',
      notes: row.notes || '',
      items: row.items || [],
      subtotal: Number(row.subtotal || 0),
      total: Number(row.total || 0),
      currency: row.currency || (cache.settings && cache.settings.currency) || 'ج.م',
      status: row.status || 'PENDING',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function productId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return 'p_' + window.crypto.randomUUID();
    return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  }

  async function refresh() {
    requireClient();
    var settingsResult = await client.from('store_settings').select('*').eq('id', 1).maybeSingle();
    if (settingsResult.error) throw settingsResult.error;
    cache.settings = settingsResult.data;

    var categoriesResult = await client.from('store_categories').select('name').order('name', { ascending: true });
    cache.categoriesTableMissing = isMissingCategoriesTable(categoriesResult.error);
    if (categoriesResult.error && !cache.categoriesTableMissing) throw categoriesResult.error;
    cache.categories = (categoriesResult.data || []).map(function (category) { return category.name; });

    var productsResult = await client.from('products').select('*').order('name', { ascending: true });
    if (productsResult.error) throw productsResult.error;
    cache.products = productsResult.data || [];
    if (cache.categoriesTableMissing) {
      cache.categories = cache.products.reduce(function (categories, product) {
        if (product.category && categories.indexOf(product.category) === -1) categories.push(product.category);
        return categories;
      }, []);
    }

    if (currentUser) {
      var ordersResult = await client.from('orders').select('*').order('created_at', { ascending: false });
      if (ordersResult.error) throw ordersResult.error;
      cache.orders = (ordersResult.data || []).map(orderFromRow);

      var profilesQuery = client.from('profiles').select('*');
      if (!isAdmin) profilesQuery = profilesQuery.eq('id', currentUser.id);
      var profilesResult = await profilesQuery.order('created_at', { ascending: false });
      if (profilesResult.error) throw profilesResult.error;
      cache.profiles = (profilesResult.data || []).map(profileFromRow);
    } else {
      cache.orders = [];
      cache.profiles = [];
    }

    if (isAdmin) {
      var adminsResult = await client.rpc('admin_list_emails');
      if (adminsResult.error) throw adminsResult.error;
      cache.admins = adminsResult.data || [];
    } else {
      cache.admins = [];
    }
  }

  async function seedInitialCloudData() {
    if (!isAdmin) return;

    if (cache.settings && cache.settings.products_seeded) return;

    localDB.init();
    if (cache.products.length === 0) {
      var legacyProducts = localDB.Products.getAll();
      if (legacyProducts.length) {
        var categoryNames = [];
        legacyProducts.forEach(function (product) {
          var category = String(product.category || '').trim();
          if (category && categoryNames.indexOf(category) === -1) categoryNames.push(category);
        });
        if (categoryNames.length && !cache.categoriesTableMissing) {
          var categoriesResult = await client.from('store_categories')
            .upsert(categoryNames.map(function (name) { return { name: name }; }), { onConflict: 'name' })
            .select('name');
          if (categoriesResult.error) throw categoriesResult.error;
          cache.categories = (categoriesResult.data || []).map(function (category) { return category.name; });
        } else if (cache.categoriesTableMissing) {
          cache.categories = categoryNames;
        }
        var seedRows = legacyProducts.map(function (product) {
          return {
            id: String(product.id),
            name: product.name,
            category: product.category,
            price: Number(product.price) || 0,
            stock: Number(product.stock) || 0,
            barcode: product.barcode || null,
            image: product.image || '',
          };
        });
        var productsResult = await client.from('products').insert(seedRows).select('*');
        if (productsResult.error) throw productsResult.error;
        cache.products = productsResult.data || [];
      }
    }

    var settingsResult = await client.from('store_settings').upsert(
      Object.assign({ id: 1 }, cache.settings || localDB.Settings.get(), { products_seeded: true }),
      { onConflict: 'id' }
    ).select('*').single();
    if (settingsResult.error) throw settingsResult.error;
    cache.settings = settingsResult.data;
  }

  async function init() {
    requireClient();

    var sessionResult = await client.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    var authUser = sessionResult.data.session ? sessionResult.data.session.user : null;

    currentUser = null;
    isAdmin = false;
    if (authUser) {
      var adminResult = await client.rpc('is_store_admin');
      if (adminResult.error) throw adminResult.error;
      isAdmin = adminResult.data === true;

      var profileResult = await client.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
      if (profileResult.error) throw profileResult.error;
      var profile = profileFromRow(profileResult.data) || {};
      currentUser = Object.assign({}, profile, {
        id: authUser.id,
        email: authUser.email,
        firstName: profile.firstName || authName(authUser.user_metadata, 'first_name'),
        lastName: profile.lastName || authName(authUser.user_metadata, 'last_name'),
        isAdmin: isAdmin,
      });
    }

    DB.Session.set(currentUser);
    await refresh();
    await seedInitialCloudData();
    return true;
  }

  async function syncSession() {
    var sessionResult = await requireClient().auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    var authUser = sessionResult.data.session ? sessionResult.data.session.user : null;

    currentUser = null;
    isAdmin = false;
    if (authUser) {
      var adminResult = await client.rpc('is_store_admin');
      if (adminResult.error) throw adminResult.error;
      isAdmin = adminResult.data === true;

      var profileResult = await client.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
      if (profileResult.error) throw profileResult.error;
      var profile = profileFromRow(profileResult.data) || {};
      currentUser = Object.assign({}, profile, {
        id: authUser.id,
        email: authUser.email,
        firstName: profile.firstName || authName(authUser.user_metadata, 'first_name'),
        lastName: profile.lastName || authName(authUser.user_metadata, 'last_name'),
        isAdmin: isAdmin,
      });
    }

    DB.Session.set(currentUser);
    await refresh();
    return currentUser;
  }

  DB.init = init;
  DB.refresh = refresh;
  DB.syncSession = syncSession;
  DB.Session = {
    get: function () { return currentUser; },
    set: function (user) { currentUser = user; },
    clear: function () { currentUser = null; isAdmin = false; cache.orders = []; cache.profiles = []; cache.admins = []; },
    isLoggedIn: function () { return !!currentUser; },
  };

  DB.Settings = {
    get: function () { return cache.settings || Object.assign({ id: 1 }, localDB.Settings.get()); },
    update: async function (updates) {
      try {
        var result = await requireClient().from('store_settings')
          .upsert(Object.assign({ id: 1 }, this.get(), updates), { onConflict: 'id' })
          .select('*').single();
        if (result.error) return asError(result.error);
        cache.settings = result.data;
        return { success: true, settings: result.data };
      } catch (error) { return asError(error); }
    },
  };

  DB.Products = {
    getAll: function () { return cache.products.slice(); },
    findById: function (id) { return cache.products.find(function (product) { return product.id === id; }) || null; },
    getCategories: function () { return cache.categories.slice(); },
    getByCategory: function (category) { return cache.products.filter(function (product) { return product.category === category; }); },
    search: function (query) {
      var searchText = String(query || '').toLowerCase();
      return cache.products.filter(function (product) {
        return product.name.toLowerCase().indexOf(searchText) !== -1 ||
          product.category.toLowerCase().indexOf(searchText) !== -1 ||
          (product.barcode && product.barcode.indexOf(searchText) !== -1);
      });
    },
    add: async function (product) {
      try {
        var row = {
          id: product.id || productId(),
          name: product.name,
          category: product.category,
          price: Number(product.price) || 0,
          stock: Number(product.stock) || 0,
          barcode: product.barcode || null,
          image: product.image || '',
        };
        var result = await requireClient().from('products').insert(row).select('*').single();
        if (result.error) return asError(result.error);
        cache.products.push(result.data);
        return { success: true, product: result.data };
      } catch (error) { return asError(error); }
    },
    update: async function (id, updates) {
      try {
        var row = {
          name: updates.name,
          category: updates.category,
          price: Number(updates.price) || 0,
          stock: Number(updates.stock) || 0,
          barcode: updates.barcode || null,
          image: updates.image || '',
          updated_at: new Date().toISOString(),
        };
        var result = await requireClient().from('products').update(row).eq('id', id).select('*').single();
        if (result.error) return asError(result.error);
        cache.products = cache.products.map(function (product) { return product.id === id ? result.data : product; });
        return { success: true, product: result.data };
      } catch (error) { return asError(error); }
    },
    delete: async function (id) {
      try {
        var result = await requireClient().from('products').delete().eq('id', id);
        if (result.error) return asError(result.error);
        cache.products = cache.products.filter(function (product) { return product.id !== id; });
        return { success: true };
      } catch (error) { return asError(error); }
    },
  };

  DB.Categories = {
    getAll: function () { return cache.categories.slice(); },
    add: async function (name) {
      if (!isAdmin) return { success: false, message: 'غير مسموح بإدارة الأقسام.' };
      if (cache.categoriesTableMissing) return { success: false, message: missingCategoriesMessage() };
      var normalized = String(name || '').trim();
      if (!normalized || normalized.length > 80) return { success: false, message: 'اسم القسم مطلوب ويجب ألا يتجاوز 80 حرفاً.' };
      try {
        var result = await requireClient().from('store_categories').insert({ name: normalized }).select('name').single();
        if (result.error) {
          if (result.error.code === '23505') return { success: false, message: 'هذا القسم موجود بالفعل.' };
          return asError(result.error);
        }
        cache.categories.push(result.data.name);
        cache.categories.sort(function (a, b) { return a.localeCompare(b, 'ar'); });
        return { success: true, category: result.data.name };
      } catch (error) { return asError(error); }
    },
    rename: async function (oldName, newName) {
      if (!isAdmin) return { success: false, message: 'غير مسموح بإدارة الأقسام.' };
      if (cache.categoriesTableMissing) return { success: false, message: missingCategoriesMessage() };
      var normalized = String(newName || '').trim();
      if (!normalized || normalized.length > 80) return { success: false, message: 'اسم القسم مطلوب ويجب ألا يتجاوز 80 حرفاً.' };
      if (normalized === oldName) return { success: true, category: normalized };
      try {
        var result = await requireClient().from('store_categories')
          .update({ name: normalized }).eq('name', oldName).select('name').single();
        if (result.error) {
          if (result.error.code === '23505') return { success: false, message: 'يوجد قسم آخر بهذا الاسم.' };
          return asError(result.error);
        }
        cache.categories = cache.categories.map(function (category) { return category === oldName ? result.data.name : category; });
        cache.categories.sort(function (a, b) { return a.localeCompare(b, 'ar'); });
        cache.products = cache.products.map(function (product) {
          return product.category === oldName ? Object.assign({}, product, { category: result.data.name }) : product;
        });
        return { success: true, category: result.data.name };
      } catch (error) { return asError(error); }
    },
    remove: async function (name) {
      if (!isAdmin) return { success: false, message: 'غير مسموح بإدارة الأقسام.' };
      if (cache.categoriesTableMissing) return { success: false, message: missingCategoriesMessage() };
      try {
        var productsResult = await requireClient().from('products')
          .select('id', { count: 'exact', head: true }).eq('category', name);
        if (productsResult.error) return asError(productsResult.error);
        if ((productsResult.count || 0) > 0) return { success: false, message: 'لا يمكن حذف قسم يحتوي على منتجات. انقل المنتجات إلى قسم آخر أولاً.' };

        var result = await requireClient().from('store_categories').delete().eq('name', name);
        if (result.error) {
          if (result.error.code === '23503') return { success: false, message: 'لا يمكن حذف قسم مرتبط بمنتجات.' };
          return asError(result.error);
        }
        cache.categories = cache.categories.filter(function (category) { return category !== name; });
        return { success: true };
      } catch (error) { return asError(error); }
    },
  };

  DB.Users = {
    getAll: function () { return cache.profiles.slice(); },
    findByEmail: function (email) {
      return cache.profiles.find(function (profile) { return profile.email.toLowerCase() === String(email).toLowerCase(); }) || null;
    },
    add: function () { return Promise.resolve({ success: false, message: 'أنشئ الحساب عبر Supabase Auth.' }); },
    invite: async function (user) {
      if (!isAdmin) return { success: false, message: 'غير مسموح بدعوة مستخدمين.' };
      var result = await invokeAdminUsers({
        action: 'invite',
        email: String(user.email || '').trim().toLowerCase(),
        firstName: String(user.firstName || '').trim(),
        lastName: String(user.lastName || '').trim(),
      });
      if (!result.success) return result;
      try { await refresh(); } catch (error) {}
      return { success: true, user: result.data.user };
    },
    setOrdersEnabled: async function (id, enabled) {
      if (!isAdmin) return { success: false, message: 'غير مسموح بتعديل حالة هذا الحساب.' };
      try {
        var result = await requireClient().from('profiles')
          .update({ orders_enabled: !!enabled, updated_at: new Date().toISOString() })
          .eq('id', id).select('*').single();
        if (result.error) return asError(result.error);
        var updated = profileFromRow(result.data);
        cache.profiles = cache.profiles.map(function (profile) { return profile.id === id ? updated : profile; });
        if (currentUser && currentUser.id === id) currentUser = Object.assign({}, currentUser, updated);
        return { success: true, user: updated };
      } catch (error) { return asError(error); }
    },
    remove: async function (id) {
      if (!isAdmin) return { success: false, message: 'غير مسموح بحذف الحسابات.' };
      var result = await invokeAdminUsers({ action: 'delete', userId: id });
      if (!result.success) return result;
      cache.profiles = cache.profiles.filter(function (profile) { return profile.id !== id; });
      return { success: true };
    },
    update: async function (email, updates) {
      if (!currentUser || (!isAdmin && currentUser.email.toLowerCase() !== String(email).toLowerCase())) {
        return { success: false, message: 'غير مسموح بتعديل هذا الحساب.' };
      }
      try {
        var row = {
          first_name: updates.firstName,
          last_name: updates.lastName,
          phone: updates.phone,
          address: updates.address,
          updated_at: new Date().toISOString(),
        };
        Object.keys(row).forEach(function (key) { if (row[key] === undefined) delete row[key]; });
        var result = await requireClient().from('profiles').update(row).eq('id', currentUser.id).select('*').single();
        if (result.error) return asError(result.error);
        var updated = profileFromRow(result.data);
        cache.profiles = cache.profiles.map(function (profile) { return profile.id === updated.id ? updated : profile; });
        currentUser = Object.assign({}, currentUser, updated);
        return { success: true, user: updated };
      } catch (error) { return asError(error); }
    },
  };

  DB.Admins = {
    getAll: function () { return cache.admins.slice(); },
    isAdmin: function (email) { return isAdmin && currentUser && currentUser.email.toLowerCase() === String(email).toLowerCase(); },
    add: async function (email) {
      try {
        var result = await requireClient().rpc('admin_manage_user', { target_email: email, make_admin: true });
        if (result.error) {
          if (/Create this user in Supabase Auth first/i.test(result.error.message || '')) {
            return { success: false, message: 'الحساب غير موجود في Supabase Auth. اطلب من صاحبه إنشاء حساب بهذا البريد أولًا، ثم أعد إضافته كمشرف.' };
          }
          if (/Only store admins/i.test(result.error.message || '')) {
            return { success: false, message: 'حسابك لا يملك صلاحية إضافة مشرفين.' };
          }
          return asError(result.error);
        }
        var adminsResult = await requireClient().rpc('admin_list_emails');
        if (adminsResult.error) return asError(adminsResult.error);
        cache.admins = adminsResult.data || [];
        return { success: true };
      } catch (error) { return asError(error); }
    },
    remove: async function (email) {
      try {
        var result = await requireClient().rpc('admin_manage_user', { target_email: email, make_admin: false });
        if (result.error) return asError(result.error);
        var adminsResult = await requireClient().rpc('admin_list_emails');
        if (adminsResult.error) return asError(adminsResult.error);
        cache.admins = adminsResult.data || [];
        return { success: true };
      } catch (error) { return asError(error); }
    },
  };

  DB.Orders = {
    getAll: function () { return cache.orders.slice(); },
    getByEmail: function (email) {
      return cache.orders.filter(function (order) { return order.email.toLowerCase() === String(email).toLowerCase(); });
    },
    findById: function (id) { return cache.orders.find(function (order) { return order.id === id; }) || null; },
    add: async function (order) {
      if (!currentUser) return { success: false, message: 'يجب تسجيل الدخول أولاً.' };
      if (currentUser.ordersEnabled === false) return { success: false, message: 'تم إيقاف استقبال الطلبات لهذا الحساب. تواصل مع إدارة المتجر.' };
      try {
        var row = {
          id: 'ORD-' + Date.now(),
          user_id: currentUser.id,
          email: currentUser.email.toLowerCase(),
          customer_name: order.customerName || '',
          phone: order.phone || '',
          address: order.address || '',
          notes: order.notes || '',
          items: order.items || [],
          subtotal: Number(order.total) || 0,
          total: Number(order.total) || 0,
          currency: cache.settings.currency,
          status: 'PENDING',
        };
        var result = await requireClient().from('orders').insert(row).select('*').single();
        if (result.error) {
          if (result.error.code === '42501') return { success: false, message: 'تم إيقاف استقبال الطلبات لهذا الحساب. تواصل مع إدارة المتجر.' };
          return asError(result.error);
        }
        var saved = orderFromRow(result.data);
        cache.orders.unshift(saved);
        return { success: true, order: saved };
      } catch (error) { return asError(error); }
    },
    updateStatus: async function (id, status) {
      try {
        var result = await requireClient().from('orders').update({ status: status, updated_at: new Date().toISOString() })
          .eq('id', id).select('*').single();
        if (result.error) return asError(result.error);
        var updated = orderFromRow(result.data);
        cache.orders = cache.orders.map(function (order) { return order.id === id ? updated : order; });
        return { success: true, order: updated };
      } catch (error) { return asError(error); }
    },
  };

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && client) refresh().catch(function (error) {
      console.error('[Supabase] refresh failed:', error.message || error);
    });
  });
})();

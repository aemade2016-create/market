// Supabase-backed data adapters. The cart remains local to each browser.
(function () {
  var client = window.supabaseClient;
  var localDB = {
    init: DB.init,
    Users: DB.Users,
    Admins: DB.Admins,
    Settings: DB.Settings,
    Products: DB.Products,
    Orders: DB.Orders,
    Session: DB.Session,
    Cart: DB.Cart,
  };

  var cache = {
    settings: null,
    products: [],
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
    };
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

    var productsResult = await client.from('products').select('*').order('name', { ascending: true });
    if (productsResult.error) throw productsResult.error;
    cache.products = productsResult.data || [];

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
        firstName: profile.firstName || (authUser.user_metadata && authUser.user_metadata.first_name) || '',
        lastName: profile.lastName || (authUser.user_metadata && authUser.user_metadata.last_name) || '',
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
        firstName: profile.firstName || (authUser.user_metadata && authUser.user_metadata.first_name) || '',
        lastName: profile.lastName || (authUser.user_metadata && authUser.user_metadata.last_name) || '',
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
    getCategories: function () {
      return cache.products.reduce(function (categories, product) {
        if (categories.indexOf(product.category) === -1) categories.push(product.category);
        return categories;
      }, []);
    },
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

  DB.Users = {
    getAll: function () { return cache.profiles.slice(); },
    findByEmail: function (email) {
      return cache.profiles.find(function (profile) { return profile.email.toLowerCase() === String(email).toLowerCase(); }) || null;
    },
    add: function () { return Promise.resolve({ success: false, message: 'أنشئ الحساب عبر Supabase Auth.' }); },
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
        if (result.error) return asError(result.error);
        cache.admins = (await requireClient().rpc('admin_list_emails')).data || [];
        return { success: true };
      } catch (error) { return asError(error); }
    },
    remove: async function (email) {
      try {
        var result = await requireClient().rpc('admin_manage_user', { target_email: email, make_admin: false });
        if (result.error) return asError(result.error);
        cache.admins = (await requireClient().rpc('admin_list_emails')).data || [];
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
        if (result.error) return asError(result.error);
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

// ════════════════════════════════════════════════════════════════════
// db.js — قاعدة البيانات المحلية (LocalStorage Engine)
// لا يستخدم import/export — يعمل كـ script عادي
// ════════════════════════════════════════════════════════════════════

const DB = (function () {

  const TABLES = {
    USERS:          'sm_users',
    ADMINS:         'sm_admins',
    STORE_SETTINGS: 'sm_store_settings',
    PRODUCTS:       'sm_products',
    CATEGORIES:     'sm_categories',
    ORDERS:         'sm_orders',
    CURRENT_USER:   'sm_current_user',
    CART:           'sm_cart',
  };

  // ── بيانات افتراضية ───────────────────────────────────────────────
  const DEFAULT_ADMINS = ['aemade2026@gmail.com'];

  const DEFAULT_SETTINGS = {
    name:      'سوبر ماركت النجمة',
    logo:      'https://img.icons8.com/fluency/96/shopping-cart.png',
    phone:     '+201000000000',
    whatsapp:  '201000000000',
    address:   'شارع النجمة، القاهرة، مصر',
    currency:  'ج.م',
  };

  const DEFAULT_PRODUCTS = [
    { id:'p001', name:'تفاح أحمر',            category:'خضروات وفاكهة', price:25,  stock:100, barcode:'6001001001001', image:'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=300&q=80' },
    { id:'p002', name:'موز',                  category:'خضروات وفاكهة', price:18,  stock:80,  barcode:'6001001001002', image:'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&q=80' },
    { id:'p003', name:'طماطم',                category:'خضروات وفاكهة', price:12,  stock:150, barcode:'6001001001003', image:'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=300&q=80' },
    { id:'p004', name:'خيار',                 category:'خضروات وفاكهة', price:10,  stock:120, barcode:'6001001001004', image:'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=300&q=80' },
    { id:'p005', name:'حليب كامل الدسم 1 لتر',category:'منتجات الألبان', price:32,  stock:60,  barcode:'6002002002001', image:'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&q=80' },
    { id:'p006', name:'جبنة بيضاء',           category:'منتجات الألبان', price:45,  stock:40,  barcode:'6002002002002', image:'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=300&q=80' },
    { id:'p007', name:'زبادي طبيعي',          category:'منتجات الألبان', price:20,  stock:70,  barcode:'6002002002003', image:'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&q=80' },
    { id:'p008', name:'خبز توست',             category:'مخبوزات',        price:22,  stock:50,  barcode:'6003003003001', image:'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80' },
    { id:'p009', name:'كرواسون',              category:'مخبوزات',        price:15,  stock:30,  barcode:'6003003003002', image:'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&q=80' },
    { id:'p010', name:'مياه معدنية 1.5 لتر',  category:'مشروبات',        price:8,   stock:200, barcode:'6004004004001', image:'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&q=80' },
    { id:'p011', name:'عصير برتقال طبيعي',    category:'مشروبات',        price:35,  stock:55,  barcode:'6004004004002', image:'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&q=80' },
    { id:'p012', name:'كولا 330 مل',          category:'مشروبات',        price:12,  stock:100, barcode:'6004004004003', image:'https://images.unsplash.com/photo-1581098365948-6a5a912a7a49?w=300&q=80' },
    { id:'p013', name:'أرز بسمتي 1 كجم',      category:'بقوليات وحبوب',  price:38,  stock:90,  barcode:'6005005005001', image:'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=300&q=80' },
    { id:'p014', name:'عدس أحمر 500 جم',      category:'بقوليات وحبوب',  price:22,  stock:75,  barcode:'6005005005002', image:'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=300&q=80' },
    { id:'p015', name:'شيبسي مملح',           category:'وجبات خفيفة',    price:14,  stock:120, barcode:'6006006006001', image:'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=300&q=80' },
    { id:'p016', name:'شوكولاتة داكنة',       category:'وجبات خفيفة',    price:28,  stock:65,  barcode:'6006006006002', image:'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=300&q=80' },
  ];

  // ── قراءة وكتابة ─────────────────────────────────────────────────
  function read(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : null;
    } catch(e) {
      console.warn('[DB] read error:', key, e);
      return null;
    }
  }

  function write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch(e) {
      console.error('[DB] write error:', key, e);
    }
  }

  // ── تهيئة ─────────────────────────────────────────────────────────
  function init() {
    if (!read(TABLES.ADMINS))   write(TABLES.ADMINS,   DEFAULT_ADMINS);
    if (!read(TABLES.STORE_SETTINGS)) write(TABLES.STORE_SETTINGS, DEFAULT_SETTINGS);
    if (!read(TABLES.PRODUCTS)) write(TABLES.PRODUCTS, DEFAULT_PRODUCTS);
    if (!read(TABLES.CATEGORIES)) {
      var categories = [];
      (read(TABLES.PRODUCTS) || []).forEach(function (product) {
        if (product.category && categories.indexOf(product.category) === -1) categories.push(product.category);
      });
      write(TABLES.CATEGORIES, categories);
    }
    if (!read(TABLES.USERS))    write(TABLES.USERS,    []);
    if (!read(TABLES.ORDERS))   write(TABLES.ORDERS,   []);
  }

  // ── Users ─────────────────────────────────────────────────────────
  var Users = {
    getAll: function() { return read(TABLES.USERS) || []; },
    findByEmail: function(email) {
      return this.getAll().find(function(u){ return u.email.toLowerCase() === email.toLowerCase(); }) || null;
    },
    add: function(u) {
      var list = this.getAll();
      if (this.findByEmail(u.email)) return { success:false, message:'البريد الإلكتروني مسجّل مسبقاً.' };
      var newUser = {
        id: 'u_' + Date.now(),
        firstName: u.firstName, lastName: u.lastName,
        email: u.email.toLowerCase(), password: u.password,
        phone: u.phone || '', address: u.address || '',
        createdAt: new Date().toISOString(),
      };
      list.push(newUser);
      write(TABLES.USERS, list);
      return { success:true, user:newUser };
    },
    update: function(email, updates) {
      var list = this.getAll();
      var idx = list.findIndex(function(u){ return u.email.toLowerCase() === email.toLowerCase(); });
      if (idx === -1) return { success:false, message:'المستخدم غير موجود.' };
      list[idx] = Object.assign({}, list[idx], updates);
      write(TABLES.USERS, list);
      return { success:true, user:list[idx] };
    },
  };

  // ── Admins ────────────────────────────────────────────────────────
  var Admins = {
    getAll: function() { return read(TABLES.ADMINS) || DEFAULT_ADMINS; },
    isAdmin: function(email) { return this.getAll().indexOf(email.toLowerCase()) !== -1; },
    add: function(email) {
      var list = this.getAll();
      var n = email.toLowerCase();
      if (list.indexOf(n) !== -1) return { success:false, message:'هذا البريد مضاف مسبقاً.' };
      list.push(n);
      write(TABLES.ADMINS, list);
      return { success:true };
    },
    remove: function(email) {
      var list = this.getAll().filter(function(a){ return a !== email.toLowerCase(); });
      write(TABLES.ADMINS, list);
      return { success:true };
    },
  };

  // ── Settings ──────────────────────────────────────────────────────
  var Settings = {
    get: function() { return read(TABLES.STORE_SETTINGS) || DEFAULT_SETTINGS; },
    update: function(updates) {
      var updated = Object.assign({}, this.get(), updates);
      write(TABLES.STORE_SETTINGS, updated);
      return updated;
    },
  };

  // ── Categories ───────────────────────────────────────────────────
  var Categories = {
    getAll: function() { return read(TABLES.CATEGORIES) || []; },
    add: function(name) {
      var normalized = String(name || '').trim();
      var list = this.getAll();
      if (!normalized) return { success:false, message:'اكتب اسم القسم.' };
      if (list.some(function(category) { return category.toLowerCase() === normalized.toLowerCase(); })) {
        return { success:false, message:'هذا القسم موجود بالفعل.' };
      }
      list.push(normalized);
      write(TABLES.CATEGORIES, list);
      return { success:true, category:normalized };
    },
    rename: function(oldName, newName) {
      var normalized = String(newName || '').trim();
      var list = this.getAll();
      if (!normalized || normalized.length > 80) return { success:false, message:'اسم القسم مطلوب ويجب ألا يتجاوز 80 حرفاً.' };
      if (list.indexOf(oldName) === -1) return { success:false, message:'القسم غير موجود.' };
      if (normalized !== oldName && list.some(function(category) { return category.toLowerCase() === normalized.toLowerCase(); })) {
        return { success:false, message:'هذا القسم موجود بالفعل.' };
      }
      write(TABLES.CATEGORIES, list.map(function(category) { return category === oldName ? normalized : category; }));
      write(TABLES.PRODUCTS, Products.getAll().map(function(product) {
        return product.category === oldName ? Object.assign({}, product, { category: normalized }) : product;
      }));
      return { success:true, category:normalized };
    },
    remove: function(name) {
      if (Products.getAll().some(function(product) { return product.category === name; })) {
        return { success:false, message:'لا يمكن حذف قسم مرتبط بمنتجات.' };
      }
      write(TABLES.CATEGORIES, this.getAll().filter(function(category) { return category !== name; }));
      return { success:true };
    },
  };

  // ── Products ──────────────────────────────────────────────────────
  var Products = {
    getAll: function() { return read(TABLES.PRODUCTS) || []; },
    findById: function(id) { return this.getAll().find(function(p){ return p.id === id; }) || null; },
    getCategories: function() {
      return Categories.getAll();
    },
    getByCategory: function(cat) { return this.getAll().filter(function(p){ return p.category === cat; }); },
    search: function(q) {
      var lq = q.toLowerCase();
      return this.getAll().filter(function(p){
        return p.name.toLowerCase().indexOf(lq) !== -1 ||
               p.category.toLowerCase().indexOf(lq) !== -1 ||
               (p.barcode && p.barcode.indexOf(q) !== -1);
      });
    },
    add: function(p) {
      var list = this.getAll();
      var newP = {
        id: 'p_' + Date.now(), name: p.name, category: p.category,
        price: parseFloat(p.price) || 0,
        image: p.image || 'https://via.placeholder.com/300x200?text=منتج',
        barcode: p.barcode || String(Date.now()), stock: parseInt(p.stock) || 0,
      };
      list.push(newP);
      write(TABLES.PRODUCTS, list);
      return { success:true, product:newP };
    },
    update: function(id, updates) {
      var list = this.getAll();
      var idx = list.findIndex(function(p){ return p.id === id; });
      if (idx === -1) return { success:false, message:'المنتج غير موجود.' };
      list[idx] = Object.assign({}, list[idx], updates);
      write(TABLES.PRODUCTS, list);
      return { success:true, product:list[idx] };
    },
    delete: function(id) {
      write(TABLES.PRODUCTS, this.getAll().filter(function(p){ return p.id !== id; }));
      return { success:true };
    },
  };

  // ── Orders ────────────────────────────────────────────────────────
  var ORDER_STATUS_MAP = {
    PENDING:   { label:'قيد المراجعة', cls:'bg-yellow-100 text-yellow-700 border-yellow-200' },
    CONFIRMED: { label:'تم التأكيد',    cls:'bg-green-100  text-green-700  border-green-200'  },
    PREPARING: { label:'جاري التحضير',  cls:'bg-blue-100   text-blue-700   border-blue-200'   },
    DELIVERED: { label:'تم التوصيل',    cls:'bg-emerald-100 text-emerald-700 border-emerald-200' },
    CANCELLED: { label:'ملغي',          cls:'bg-red-100    text-red-700    border-red-200'    },
  };

  var Orders = {
    getAll: function() { return read(TABLES.ORDERS) || []; },
    getByEmail: function(email) {
      return this.getAll().filter(function(o){ return o.email.toLowerCase() === email.toLowerCase(); });
    },
    findById: function(id) { return this.getAll().find(function(o){ return o.id === id; }) || null; },
    add: function(order) {
      var list = this.getAll();
      var s = Settings.get();
      var newOrder = {
        id: 'ORD-' + Date.now(),
        email: order.email.toLowerCase(),
        customerName: order.customerName || '',
        phone: order.phone || '',
        address: order.address || '',
        notes: order.notes || '',
        items: order.items,
        subtotal: order.total,
        total: order.total,
        currency: s.currency,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      list.push(newOrder);
      write(TABLES.ORDERS, list);
      return { success:true, order:newOrder };
    },
    updateStatus: function(id, status) {
      var list = this.getAll();
      var idx = list.findIndex(function(o){ return o.id === id; });
      if (idx === -1) return { success:false };
      list[idx].status = status;
      list[idx].updatedAt = new Date().toISOString();
      write(TABLES.ORDERS, list);
      return { success:true, order:list[idx] };
    },
  };

  // ── Session ───────────────────────────────────────────────────────
  var Session = {
    get: function() { return read(TABLES.CURRENT_USER); },
    set: function(u) { write(TABLES.CURRENT_USER, u); },
    clear: function() { localStorage.removeItem(TABLES.CURRENT_USER); },
    isLoggedIn: function() { return !!this.get(); },
  };

  // ── Cart ──────────────────────────────────────────────────────────
  var Cart = {
    get: function() { return read(TABLES.CART) || []; },
    save: function(c) { write(TABLES.CART, c); },
    add: function(product, qty) {
      qty = qty || 1;
      var c = this.get();
      var idx = c.findIndex(function(i){ return i.id === product.id; });
      if (idx !== -1) { c[idx].qty += qty; }
      else { c.push({ id:product.id, name:product.name, price:product.price, image:product.image, qty:qty }); }
      this.save(c);
    },
    updateQty: function(id, qty) {
      var c = this.get();
      if (qty <= 0) { c = c.filter(function(i){ return i.id !== id; }); }
      else {
        var idx = c.findIndex(function(i){ return i.id === id; });
        if (idx !== -1) c[idx].qty = qty;
      }
      this.save(c);
    },
    remove: function(id) { this.save(this.get().filter(function(i){ return i.id !== id; })); },
    clear: function() { localStorage.removeItem(TABLES.CART); },
    count: function() { return this.get().reduce(function(s,i){ return s + i.qty; }, 0); },
    total: function() { return this.get().reduce(function(s,i){ return s + i.price * i.qty; }, 0); },
  };

  // ── واجهة عامة ────────────────────────────────────────────────────
  return {
    init: init,
    Users: Users,
    Admins: Admins,
    Settings: Settings,
    Products: Products,
    Categories: Categories,
    Orders: Orders,
    Session: Session,
    Cart: Cart,
    ORDER_STATUS_MAP: ORDER_STATUS_MAP,
    statusBadge: function(status) {
      var s = ORDER_STATUS_MAP[status] || ORDER_STATUS_MAP.PENDING;
      return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ' + s.cls + '">' + s.label + '</span>';
    },
  };

})();

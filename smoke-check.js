const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  window: { location: { href: '' } },
  document: {
    body: { appendChild() {}, insertAdjacentHTML() {}, style: {} },
    head: { appendChild() {} },
    getElementById() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() {
      return {
        className: '',
        style: {},
        innerHTML: '',
        setAttribute() {},
        appendChild() {},
        querySelector() { return null; },
        addEventListener() {},
        remove() {},
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
      };
    }
  },
  localStorage: (() => {
    const store = new Map();
    return {
      getItem: (key) => store.has(key) ? store.get(key) : null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear()
    };
  })(),
  setTimeout,
  clearTimeout,
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  Date,
  encodeURIComponent,
  decodeURIComponent,
  Math,
  JSON,
  URL,
  navigator: { userAgent: 'node' }
};

vm.createContext(context);

const files = [
  'js/db.js',
  'js/auth.js',
  'js/ui.js',
  'js/layout.js',
  'js/storefront.js',
  'js/cart.js',
  'js/checkout.js',
  'js/auth-page.js'
];

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, context, { filename: file });
}

if (!context.DB || !context.Auth) {
  throw new Error('DB/Auth globals were not created');
}

context.DB.init();
const reg = context.Auth.register({
  firstName: 'Ahmed',
  lastName: 'Ali',
  email: 'test@example.com',
  password: '123456',
  confirmPassword: '123456'
});
if (!reg.success) throw new Error('Register failed: ' + reg.message);

const login = context.Auth.login('test@example.com', '123456');
if (!login.success) throw new Error('Login failed: ' + login.message);

const dup = context.Auth.register({
  firstName: 'Ahmed',
  lastName: 'Ali',
  email: 'test@example.com',
  password: '123456',
  confirmPassword: '123456'
});
if (dup.success) throw new Error('Duplicate register unexpectedly succeeded');

const wrongAdmin = context.Auth.login('aemade2026@gmail.com', 'wrong-pass');
if (wrongAdmin.success) throw new Error('Invalid admin password unexpectedly succeeded');

const admin = context.Auth.login('aemade2026@gmail.com', 'admin123');
if (!admin.success || !admin.isAdmin) throw new Error('Admin login failed');

console.log('SMOKE_TEST_OK');
console.log('USER_COUNT=' + context.DB.Users.getAll().length);
console.log('ADMIN_EMAIL=' + context.DB.Admins.getAll()[0]);

const fs = require('fs');
const vm = require('vm');

const users = new Map([['admin@example.com', { password: 'admin-pass', first_name: 'Store', last_name: 'Admin' }]]);
let activeUser = null;
let resetEmail = null;

const supabaseClient = {
  auth: {
    async signUp({ email, password, options }) {
      if (users.has(email)) return { data: {}, error: { message: 'User already registered' } };
      const user = { id: 'user-' + users.size, email, user_metadata: options.data };
      users.set(email, { password, first_name: options.data.first_name, last_name: options.data.last_name });
      activeUser = user;
      return { data: { user, session: { user } }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const record = users.get(email);
      if (!record || record.password !== password) return { data: {}, error: { message: 'Invalid login credentials' } };
      activeUser = { id: 'user-' + email, email, user_metadata: { first_name: record.first_name, last_name: record.last_name } };
      return { data: { user: activeUser, session: { user: activeUser } }, error: null };
    },
    async resetPasswordForEmail(email) { resetEmail = email; return { data: {}, error: null }; },
    async updateUser({ password }) {
      if (!activeUser) return { data: {}, error: { message: 'Not authenticated' } };
      users.get(activeUser.email).password = password;
      return { data: { user: activeUser }, error: null };
    },
    async signOut() { activeUser = null; return { error: null }; },
  },
};

const db = {
  Session: {
    current: null,
    get() { return this.current; },
    set(user) { this.current = user; },
    clear() { this.current = null; },
    isLoggedIn() { return !!this.current; },
  },
  Admins: { isAdmin(email) { return email === 'admin@example.com'; } },
  async syncSession() {
    this.Session.set({ id: activeUser.id, email: activeUser.email, firstName: activeUser.user_metadata.first_name || '', lastName: activeUser.user_metadata.last_name || '' });
    return this.Session.get();
  },
};

const context = {
  console,
  DB: db,
  window: { supabaseClient, location: { href: '', origin: 'https://example.test', pathname: '/auth.html' } },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/auth.js', 'utf8'), context, { filename: 'js/auth.js' });

async function run() {
  const auth = context.Auth;
  const registration = await auth.register({ firstName: 'Test', lastName: 'Customer', email: 'customer@example.com', password: 'new-pass', confirmPassword: 'new-pass' });
  if (!registration.success || registration.requiresConfirmation) throw new Error('Supabase signup failed');

  const duplicate = await auth.register({ firstName: 'Test', lastName: 'Customer', email: 'customer@example.com', password: 'new-pass', confirmPassword: 'new-pass' });
  if (duplicate.success) throw new Error('Duplicate signup unexpectedly succeeded');

  const invalidLogin = await auth.login('customer@example.com', 'wrong');
  if (invalidLogin.success) throw new Error('Invalid login unexpectedly succeeded');

  const login = await auth.login('customer@example.com', 'new-pass');
  if (!login.success || login.isAdmin) throw new Error('Customer login failed');

  const reset = await auth.requestPasswordReset('customer@example.com');
  if (!reset.success || resetEmail !== 'customer@example.com') throw new Error('Password reset request failed');

  const badCurrentPassword = await auth.changePassword('wrong', 'updated-pass');
  if (badCurrentPassword.success) throw new Error('Incorrect current password unexpectedly accepted');

  const changedPassword = await auth.changePassword('new-pass', 'updated-pass');
  if (!changedPassword.success) throw new Error('Password update failed');

  const adminLogin = await auth.login('admin@example.com', 'admin-pass');
  if (!adminLogin.success || !adminLogin.isAdmin) throw new Error('Admin login failed');

  console.log('SMOKE_TEST_OK');
  console.log('SUPABASE_AUTH_SIGNUP_LOGIN_RESET_OK');
  console.log('ADMIN_ROLE_CHECK_OK');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

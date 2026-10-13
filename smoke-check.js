const fs = require('fs');
const vm = require('vm');

const users = new Map([['admin@example.com', { password: 'admin-pass', first_name: 'Store', last_name: 'Admin' }]]);
const usernames = new Map([['storeadmin', 'admin@example.com']]);
let activeUser = null;
let resetEmail = null;
let authStateListener = null;
const oauthProviders = [];

const supabaseClient = {
  auth: {
    async signUp({ email, password, options }) {
      if (users.has(email)) return { data: {}, error: { message: 'User already registered' } };
      const user = { id: 'user-' + users.size, email, user_metadata: options.data };
      users.set(email, { password, first_name: options.data.first_name, last_name: options.data.last_name });
      usernames.set(options.data.username, email);
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
    async signInWithOAuth({ provider }) { oauthProviders.push(provider); return { data: { provider }, error: null }; },
    onAuthStateChange(callback) { authStateListener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
  },
  async rpc(name, args) {
    if (name !== 'email_for_username') return { data: null, error: { message: 'Unknown RPC' } };
    return { data: usernames.get(args.requested_username) || null, error: null };
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
  const registration = await auth.register({ fullName: 'Test Customer', username: 'test.customer', email: 'customer@example.com', password: 'new-pass', confirmPassword: 'new-pass' });
  if (!registration.success || registration.requiresConfirmation) throw new Error('Supabase signup failed');

  const duplicate = await auth.register({ fullName: 'Test Customer', username: 'test.customer', email: 'customer@example.com', password: 'new-pass', confirmPassword: 'new-pass' });
  if (duplicate.success) throw new Error('Duplicate signup unexpectedly succeeded');

  const invalidLogin = await auth.login('test.customer', 'wrong');
  if (invalidLogin.success) throw new Error('Invalid login unexpectedly succeeded');

  const login = await auth.login('test.customer', 'new-pass');
  if (!login.success || login.isAdmin) throw new Error('Customer login failed');

  const socialLogin = await auth.loginWithOAuth('google');
  if (!socialLogin.success) throw new Error('Google OAuth did not start');
  const facebookLogin = await auth.loginWithOAuth('facebook');
  if (!facebookLogin.success || oauthProviders.join(',') !== 'google,facebook') throw new Error('Google and Facebook OAuth providers were not requested');
  authStateListener('SIGNED_IN', { user: { app_metadata: { provider: 'facebook' } } });
  if (context.window.location.href !== 'index.html') throw new Error('OAuth sign-in did not redirect to the storefront');

  const reset = await auth.requestPasswordReset('customer@example.com');
  if (!reset.success || resetEmail !== 'customer@example.com') throw new Error('Password reset request failed');

  const badCurrentPassword = await auth.changePassword('wrong', 'updated-pass');
  if (badCurrentPassword.success) throw new Error('Incorrect current password unexpectedly accepted');

  const changedPassword = await auth.changePassword('new-pass', 'updated-pass');
  if (!changedPassword.success) throw new Error('Password update failed');

  const adminLogin = await auth.login('storeadmin', 'admin-pass');
  if (!adminLogin.success || !adminLogin.isAdmin) throw new Error('Admin login failed');

  console.log('SMOKE_TEST_OK');
  console.log('SUPABASE_AUTH_SIGNUP_LOGIN_RESET_OK');
  console.log('ADMIN_ROLE_CHECK_OK');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

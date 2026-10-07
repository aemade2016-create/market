// Supabase browser client. The anon/publishable key is safe for frontend use when RLS is enabled.
(function () {
  var projectUrl = 'https://evlvhxhglztyuwutfxda.supabase.co';
  var anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2bHZoeGhnbHp0eXV3dXRmeGRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MDU1MTUsImV4cCI6MjEwNjk4MTUxNX0.SOCv0auISRyT30OCxw-7fNyR9fCQN50KUlH1xBGwJB0';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[Supabase] supabase-js did not load.');
    return;
  }

  window.supabaseClient = window.supabase.createClient(projectUrl, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
})();

// ===== Supabase single shared client =====

// --- CONFIG: replace these with your project values ---
const SUPABASE_URL = "https://ukqmpkzljwiwpyvygrai.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcW1wa3psandpd3B5dnlncmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjk1MTAsImV4cCI6MjA2OTgwNTUxMH0.4H3XnW4tYSDofnFeSoEBqACVFh1Ud5sI8bXsnEsiu4E";

if (!window.supabase) {
  console.error("Supabase JS not found. Include @supabase/supabase-js before this file.");
}

// Create the client with session persistence
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage,
    flowType: "pkce", // safe default for browser apps
  },
  global: {
    headers: { "x-client-info": "andre-pt-portal/1.0" },
  },
});

// Expose globally
window.sb = sb;

// Optional: log auth state changes for debugging (comment out in prod)
sb.auth.onAuthStateChange((event, session) => {
  // console.log("[auth]", event, session?.user?.email);
});

// Small helper set for your pages (optional)
window.auth = {
  async getUser() {
    const { data, error } = await sb.auth.getUser();
    if (error) throw error;
    return data.user ?? null;
  },
  async requireAuth(redirectTo = "client-login.html") {
    const { data } = await sb.auth.getUser();
    if (!data?.user) window.location.href = redirectTo;
    return data?.user ?? null;
  },
  async signInWithPassword(email, password) {
    return sb.auth.signInWithPassword({ email, password });
  },
  async signUp(email, password, metadata = {}) {
    return sb.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
  },
  async resetPassword(email) {
    // Set your site URL in Supabase Auth settings for magic-link redirect
    return sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/update-password.html",
    });
  },
  async signOut() {
    return sb.auth.signOut();
  },
  async getSession() {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    return data.session ?? null;
  },
  getUserIdSync() {
    try {
      const raw = localStorage.getItem(
        "sb-" + btoa(SUPABASE_URL).replace(/=+$/, "") + "-auth-token"
      );
      if (!raw) return null;
      const session = JSON.parse(raw);
      return session?.user?.id ?? null;
    } catch {
      return null;
    }
  },
};
// ======= AUTH / USER =======
let currentUser = null;
let clientId = null;

async function ensureAuth() {
  const { data, error } = await window.sb.auth.getUser();
  if (error || !data?.user) {
    // Preserve the page they were trying to view
    const here = window.location.pathname.replace(/^\//, ""); // e.g. "client-workouts.html"
    const returnUrl = encodeURIComponent(here || "dashboard.html");
    window.location.href = `client-login.html?returnUrl=${returnUrl}`;
    return;
  }
  currentUser = data.user;
  clientId = currentUser.id; // RLS uses auth.uid()

  const emailEl = document.getElementById("userEmail");
  if (emailEl) emailEl.textContent = `Logged in as: ${currentUser.email}`;
}

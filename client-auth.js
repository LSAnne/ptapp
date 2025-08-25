// ----- Supabase setup -----
const SUPABASE_URL = "https://ukqmpkzljwiwpyvygrai.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcW1wa3psandpd3B5dnlncmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjk1MTAsImV4cCI6MjA2OTgwNTUxMH0.4H3XnW4tYSDofnFeSoEBqACVFh1Ud5sI8bXsnEsiu4E";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----- Helpers -----
const $ = (id) => document.getElementById(id);
const alertBox = $("alert");
function showAlert(type, msg) {
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = msg;
  alertBox.classList.remove("d-none");
}
function hideAlert() {
  alertBox.classList.add("d-none");
}

// Toggle forms
$("showSignup").addEventListener("click", () => {
  $("signupForm").classList.toggle("d-none");
  $("resetForm").classList.add("d-none");
});
$("showReset").addEventListener("click", () => {
  $("resetForm").classList.toggle("d-none");
  $("signupForm").classList.add("d-none");
});

// ----- Login -----
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showAlert("danger", error.message);
    return;
  }
  showAlert("success", "Logged in! Redirecting...");
  // redirect to a protected page after short delay
  setTimeout(() => (window.location.href = "client-dashboard.html"), 600);
});

// ----- Signup -----
$("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + "/client-login.html"
    }
  });

  if (error) {
    showAlert("danger", error.message);
    return;
  }
  // If email confirmations are enabled, the user must confirm first
  showAlert("info", "Check your email to confirm your account, then log in.");
});

// ----- Password Reset -----
$("resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  const email = $("resetEmail").value.trim();

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/client-reset.html"
  });

  if (error) {
    showAlert("danger", error.message);
    return;
  }
  showAlert("success", "Password reset email sent.");
});

// ----- Session restore (optional) -----
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    // Already logged in
    // window.location.href = "client-dashboard.html";
  }
})();
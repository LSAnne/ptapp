// client-login.js

// Redirect to dashboard if already signed in
document.addEventListener("DOMContentLoaded", async () => {
  const user = await window.getCurrentUser();
  if (user) {
    // already signed in – go to dashboard or client-workouts
    window.location.href = "dashboard.html";
  }
});

// Handle login form
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".login-form form");
  const emailInput = form?.querySelector('input[type="email"]');
  const pwInput = form?.querySelector('input[type="password"]');
  const forgotBtn = form?.querySelector("button.secondary:nth-of-type(1)");
  const logoutBtn = form?.querySelector("button.secondary:nth-of-type(2)");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = pwInput.value;

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message || "Login failed");
      console.error(error);
      return;
    }

    // Success – go where you want users to land
    window.location.href = "dashboard.html";
  });

  // Forgot password (requires you to add the redirect URL in Supabase Auth settings)
  if (forgotBtn) {
    forgotBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      if (!email) {
        alert("Enter your email first, then click Forgot Password.");
        return;
      }
      const { data, error } = await window.sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password.html`,
      });
      if (error) {
        alert(error.message || "Could not send reset email");
        console.error(error);
        return;
      }
      alert("Password reset email sent. Check your inbox.");
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.sb.auth.signOut();
      alert("Signed out.");
      // Stay here after logout, or redirect:
      // window.location.href = "client-login.html";
    });
  }
});
// Uses the shared client: window.sb and helpers: window.auth

function setBusy(isBusy) {
  const btnLogin = document.getElementById("btnLogin");
  const btnForgot = document.getElementById("btnForgot");
  const btnLogout = document.getElementById("btnLogout");
  [btnLogin, btnForgot, btnLogout].forEach(b => b && (b.disabled = isBusy));
}

function setStatus(msg, type = "") {
  const el = document.getElementById("formStatus");
  el.textContent = msg || "";
  el.className = `status ${type}`;
}

async function refreshBanner() {
  const banner = document.getElementById("userEmail");
  const btnLogout = document.getElementById("btnLogout");
  const { data } = await window.sb.auth.getUser();
  if (data?.user) {
    banner.textContent = `Logged in as: ${data.user.email}`;
    btnLogout.style.display = "block";
  } else {
    banner.textContent = "";
    btnLogout.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Initial banner state
  await refreshBanner();

  // Submit: Login
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");
    setBusy(true);

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      setStatus("Please enter your email and password.", "error");
      setBusy(false);
      return;
    }

    const { error } = await window.auth.signInWithPassword(email, password);
    if (error) {
      setStatus(error.message || "Login failed.", "error");
      setBusy(false);
      return;
    }

    setStatus("Login successful. Redirecting…", "success");
    await refreshBanner();

    // Redirect to dashboard (change if you prefer a different landing page)
    window.location.href = "dashboard.html";
  });

  // Forgot password (sends reset link)
  document.getElementById("btnForgot").addEventListener("click", async () => {
    setStatus("");
    setBusy(true);

    const email = document.getElementById("email").value.trim();
    if (!email) {
      setStatus("Enter your email first, then click Forgot Password.", "error");
      setBusy(false);
      return;
    }

    const { error } = await window.auth.resetPassword(email);
    if (error) {
      setStatus(error.message || "Could not send reset email.", "error");
      setBusy(false);
      return;
    }

    setStatus("Password reset email sent. Check your inbox.", "success");
    setBusy(false);
  });

  // Logout
  document.getElementById("btnLogout").addEventListener("click", async () => {
    setStatus("");
    setBusy(true);

    const { error } = await window.auth.signOut();
    if (error) {
      setStatus(error.message || "Logout failed.", "error");
      setBusy(false);
      return;
    }

    setStatus("Logged out.", "success");
    await refreshBanner();
    setBusy(false);
  });

  // Keep the banner in sync with auth changes
  window.sb.auth.onAuthStateChange(() => {
    refreshBanner();
  });
});
// Uses shared Supabase client from supabase-client.js
function setStatus(msg, type = "") {
  const el = document.getElementById("formStatus");
  if (!el) return;
  el.textContent = msg || "";
  el.className = `status ${type}`;
}

function getReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  // Default to dashboard if no returnUrl present
  return params.get("returnUrl") || "dashboard.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;

    if (!email || !password) {
      setStatus("Please enter both email and password.", "error");
      return;
    }

    const { error } = await window.sb.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(error.message || "Login failed.", "error");
      return;
    }

    window.location.href = getReturnUrl();
  });

  // Already signed in? Skip the form.
  window.sb.auth.getUser().then(({ data }) => {
    if (data?.user) {
      window.location.href = getReturnUrl();
    }
  });
});
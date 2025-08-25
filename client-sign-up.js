// Uses the shared client: window.sb (from supabase-client.js)

function setBusy(isBusy) {
  const btnSignup = document.getElementById("btnSignup");
  const btnBack = document.getElementById("btnBackToLogin");
  [btnSignup, btnBack].forEach(b => b && (b.disabled = isBusy));
}

function setStatus(msg, type = "") {
  const el = document.getElementById("formStatus");
  el.textContent = msg || "";
  el.className = `status ${type}`;
}

function validate(email, pass, pass2) {
  if (!email) return "Please enter your email.";
  if (!pass) return "Please enter a password.";
  if (pass.length < 6) return "Password must be at least 6 characters.";
  if (pass !== pass2) return "Passwords do not match.";
  return "";
}

document.getElementById("btnBackToLogin").addEventListener("click", () => {
  window.location.href = "client-login.html";
});

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");
  setBusy(true);

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const password2 = document.getElementById("password2").value;

  const v = validate(email, password, password2);
  if (v) {
    setStatus(v, "error");
    setBusy(false);
    return;
  }

  try {
    // Where to send users after they click the email confirmation link.
    const redirectTo = `${window.location.origin}/client-login.html`;

    const { data, error } = await window.sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || null },   // saved in user_metadata
        emailRedirectTo: redirectTo,             // configure in Supabase Auth settings
      },
    });

    if (error) {
      setStatus(error.message || "Sign up failed.", "error");
      setBusy(false);
      return;
    }

    // Two outcomes depending on your Auth settings:
    // 1) "Email Confirm" required (default): No session yet -> ask them to check email.
    // 2) No confirmation required: Supabase returns a session -> redirect to dashboard.

    if (!data.session) {
      setStatus("Account created. Check your email to confirm before logging in.", "success");
    } else {
      setStatus("Account created. Redirecting…", "success");
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    console.error(err);
    setStatus("Unexpected error. Please try again.", "error");
  } finally {
    setBusy(false);
  }
});

// If the user somehow lands here while already logged in, bounce to dashboard.
window.sb.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    window.location.href = "dashboard.html";
  }
});
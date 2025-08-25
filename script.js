// script.js (combined for both client portal and public site)
// Set as type="module" in pages using Supabase

// ========== CONFIGURATION ==========
const SUPABASE_URL = 'https://qcsagkojxrlmnogtotwx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc2Fna29qeHJsbW5vZ3RvdHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTUxMTksImV4cCI6MjA2OTU3MTExOX0.FKNpjuONbpOjlxiNIel6L_xivnukEz84Cqejwc_Dtyg';
const API_URL = 'https://api.sheety.co/611acea37c30c6f4676b22c2aebd0854/workouts/workouts';

const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== LOGIN ==========
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    const loginStatus = document.getElementById("loginStatus");

    if (error) {
      loginStatus.textContent = "Login failed: " + error.message;
      loginStatus.style.color = "red";
    } else {
      loginStatus.textContent = "Login successful!";
      loginStatus.style.color = "green";
      window.location.href = "dashboard.html";
    }
  });
}

// ========== LOGOUT ==========
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });
}

// ========== LOAD WORKOUTS FROM SHEETY (for public site) ==========
function loadWorkouts(clientId = null) {
  const list = document.getElementById('workout-list');
  if (!list) return; // Skip if no list present

  fetch(API_URL)
    .then(response => response.json())
    .then(data => {
      list.innerHTML = '';

      const workouts = clientId
        ? data.workouts.filter(w => w.clientId == clientId)
        : data.workouts;

      if (workouts.length === 0) {
        list.innerHTML = '<li>No workouts found.</li>';
        return;
      }

      workouts.forEach(workout => {
        const li = document.createElement('li');
        li.textContent = `${workout.date} – ${workout.workout} (${workout.sets}x${workout.reps}) for client ${workout.clientId}`;
        list.appendChild(li);
      });
    });
}

function filterWorkouts() {
  const clientId = document.getElementById('clientId').value;
  loadWorkouts(clientId);
}

// Load all workouts on initial page load (if element exists)
if (document.getElementById('workout-list')) {
  loadWorkouts();
}

// ========== REGISTER SERVICE WORKER ==========
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => {
        console.log("Service worker registered ✅", reg);
      })
      .catch((err) =>
        console.error("Service worker registration failed ❌", err)
      );
  });
}
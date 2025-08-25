const SUPABASE_URL = 'https://qcsagkojxrlmnogtotwx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcW1wa3psandpd3B5dnlncmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjk1MTAsImV4cCI6MjA2OTgwNTUxMH0.4H3XnW4tYSDofnFeSoEBqACVFh1Ud5sI8bXsnEsiu4E';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadWorkouts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const isTrainer = user.email.includes("trainer");
  if (isTrainer) {
    document.getElementById("addWorkoutFormWrapper").style.display = "block";
  }

  const { data, error } = isTrainer
    ? await supabase.from('workouts').select('*').order('date', { ascending: false })
    : await supabase.from('workouts').select('*').eq('client_email', user.email).order('date', { ascending: false });

  if (error) {
    console.error("Error loading workouts:", error.message);
    document.getElementById('noWorkoutsMsg').textContent = "Failed to load workouts.";
    return;
  }

  if (data.length === 0) {
    document.getElementById('noWorkoutsMsg').style.display = "block";
    return;
  }

  const tableBody = document.getElementById("workoutBody");
  tableBody.innerHTML = ""; // clear before appending
  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.date}</td>
      <td>${row.exercise}</td>
      <td>${row.sets}</td>
      <td>${row.reps}</td>
      <td>${row.load}</td>
      <td>${row.tempo || ''}</td>
      <td>${row.rir || ''}</td>
      <td>${row.client_email}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// Add workout
document.addEventListener("DOMContentLoaded", async () => {
  await loadWorkouts();

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });

  const form = document.getElementById("addWorkoutForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newWorkout = {
        client_email: document.getElementById("clientEmail").value,
        date: document.getElementById("date").value,
        exercise: document.getElementById("exercise").value,
        sets: parseInt(document.getElementById("sets").value),
        reps: parseInt(document.getElementById("reps").value),
        load: document.getElementById("load").value,
        tempo: document.getElementById("tempo").value,
        rir: parseInt(document.getElementById("rir").value)
      };

      const { error } = await supabase.from("workouts").insert([newWorkout]);
      if (error) {
        alert("Failed to add workout: " + error.message);
      } else {
        alert("Workout added!");
        form.reset();
        await loadWorkouts();
      }
    });
  }
});// Assuming user is already authenticated
const user = supabase.auth.getUser().then(({ data: { user } }) => {
  if (!user) {
    window.location.href = "index.html"; // redirect if not logged in
    return;
  }

  // Fetch recent workouts for logged-in client
  fetchRecentWorkouts(user.email);
});

async function fetchRecentWorkouts(email) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('client_email', email)
    .order('date', { ascending: false })
    .limit(5);

  if (error) {
    document.getElementById("recentWorkouts").innerHTML = "Error loading workouts.";
    return;
  }

  renderWorkouts(data);
}

function renderWorkouts(workouts) {
  const container = document.getElementById("recentWorkouts");
  container.innerHTML = "";

  workouts.forEach(w => {
    const card = document.createElement("div");
    card.className = "workout-card";
    card.innerHTML = `
      <strong>${w.date} – Session ${w.session}</strong><br/>
      <em>${w.exercise}</em> – ${w.load_kg}kg – RPE ${w.rpe}<br/>
      Sets: ${w.set_1_target} / ${w.set_1_actual}, ${w.set_2_target} / ${w.set_2_actual}, ${w.set_3_target} / ${w.set_3_actual}
    `;
    container.appendChild(card);
  });
}const trainerEmails = ['yourtrainer@email.com']; // Replace with actual trainer email(s)

supabase.auth.getUser().then(({ data: { user } }) => {
  if (!user) return (window.location.href = "index.html");

  const userEmail = user.email;

  if (trainerEmails.includes(userEmail)) {
    showTrainerTools();
    loadClientsDropdown();
  } else {
    fetchRecentWorkouts(userEmail);
  }
});

async function loadClientsDropdown() {
  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("client_email");

  if (error) return;

  const uniqueClients = [...new Set(workouts.map(w => w.client_email))];
  const dropdown = document.getElementById("clientFilter");

  uniqueClients.forEach(email => {
    const option = document.createElement("option");
    option.value = email;
    option.textContent = email;
    dropdown.appendChild(option);
  });

  dropdown.addEventListener("change", (e) => {
    fetchRecentWorkouts(e.target.value);
  });

  // Load initial data
  if (uniqueClients.length > 0) fetchRecentWorkouts(uniqueClients[0]);
}

function showTrainerTools() {
  document.getElementById("trainer-tools").style.display = "block";
}
document.getElementById("addWorkoutSection").style.display = "block";

document.getElementById("addWorkoutForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const workoutData = Object.fromEntries(formData.entries());

  const { error } = await supabase.from("workouts").insert([workoutData]);

  const status = document.getElementById("addWorkoutStatus");
  if (error) {
    status.textContent = "Failed to add workout: " + error.message;
  } else {
    status.textContent = "Workout added successfully!";
    form.reset();
    fetchRecentWorkouts(workoutData.client_email);
  }
});
function populateClientFilter(workouts) {
  const clients = [...new Set(workouts.map(w => w.client_email))];
  const filter = document.getElementById("clientFilter");

  filter.innerHTML = '<option value="">All Clients</option>';
  clients.forEach(client => {
    const option = document.createElement("option");
    option.value = client;
    option.textContent = client;
    filter.appendChild(option);
  });
}

function applyFilters(workouts) {
  const client = document.getElementById("clientFilter").value.toLowerCase();
  const search = document.getElementById("searchInput").value.toLowerCase();

  return workouts.filter(w =>
    (!client || w.client_email.toLowerCase() === client) &&
    (!search || w.exercise.toLowerCase().includes(search))
  );
}
// Initial load
let allWorkouts = [];

async function fetchAndRenderWorkouts() {
  const { data, error } = await supabase.from("workouts").select("*").order("date", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  allWorkouts = data;
  populateClientFilter(allWorkouts);
  renderWorkouts(applyFilters(allWorkouts));
}

function renderWorkouts(workouts) {
  const tbody = document.getElementById("workoutBody");
  const noMsg = document.getElementById("noWorkoutsMsg");

  tbody.innerHTML = "";

  if (!workouts.length) {
    noMsg.style.display = "block";
    return;
  }

  noMsg.style.display = "none";

  workouts.forEach(w => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${w.date}</td>
      <td>${w.exercise}</td>
      <td>${w.sets}</td>
      <td>${w.reps}</td>
      <td>${w.load}</td>
      <td>${w.tempo || '-'}</td>
      <td>${w.rir ?? '-'}</td>
      <td>${w.client_email}</td>
      <td>
        <button class="edit-btn" data-id="${w.id}">✏️</button>
        <button class="delete-btn" data-id="${w.id}">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Attach button listeners
  document.querySelectorAll(".delete-btn").forEach(btn =>
    btn.addEventListener("click", handleDelete)
  );
  document.querySelectorAll(".edit-btn").forEach(btn =>
    btn.addEventListener("click", handleEdit)
  );
}
async function handleDelete(e) {
  const id = e.target.dataset.id;
  if (!confirm("Are you sure you want to delete this workout?")) return;

  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) {
    alert("Failed to delete workout.");
    console.error(error);
    return;
  }

  // Refresh list
  await fetchAndRenderWorkouts();
}

function handleEdit(e) {
  const id = e.target.dataset.id;
  const row = e.target.closest("tr");
  const cells = row.querySelectorAll("td");

  // Extract values from row
  const [date, exercise, sets, reps, load, tempo, rir, client_email] = [...cells].map(c => c.textContent.trim());

  // Replace row with editable inputs
  row.innerHTML = `
    <td><input type="date" value="${date}" /></td>
    <td><input type="text" value="${exercise}" /></td>
    <td><input type="number" value="${sets}" /></td>
    <td><input type="number" value="${reps}" /></td>
    <td><input type="text" value="${load}" /></td>
    <td><input type="text" value="${tempo}" /></td>
    <td><input type="number" value="${rir}" /></td>
    <td><input type="email" value="${client_email}" /></td>
    <td>
      <button class="save-btn" data-id="${id}">💾</button>
      <button class="cancel-btn">❌</button>
    </td>
  `;

  row.querySelector(".save-btn").addEventListener("click", async () => {
    const inputs = row.querySelectorAll("input");
    const updatedWorkout = {
      date: inputs[0].value,
      exercise: inputs[1].value,
      sets: Number(inputs[2].value),
      reps: Number(inputs[3].value),
      load: inputs[4].value,
      tempo: inputs[5].value,
      rir: Number(inputs[6].value),
      client_email: inputs[7].value
    };

    const { error } = await supabase.from("workouts").update(updatedWorkout).eq("id", id);
    if (error) {
      alert("Failed to save changes.");
      console.error(error);
    } else {
      await fetchAndRenderWorkouts();
    }
  });

  row.querySelector(".cancel-btn").addEventListener("click", () => {
    fetchAndRenderWorkouts();
  });
}

// Bind events
document.getElementById("searchInput").addEventListener("input", () => {
  renderWorkouts(applyFilters(allWorkouts));
});
document.getElementById("clientFilter").addEventListener("change", () => {
  renderWorkouts(applyFilters(allWorkouts));
});

fetchAndRenderWorkouts();

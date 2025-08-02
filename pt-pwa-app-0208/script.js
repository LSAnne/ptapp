
const API_URL = 'https://api.sheety.co/611acea37c30c6f4676b22c2aebd0854/workouts/workouts';

function loadWorkouts(clientId = null) {
    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            const list = document.getElementById('workout-list');
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

// Load all workouts on initial page load
loadWorkouts();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => {
        console.log("Service worker registered ✅", reg);
      })
      .catch((err) => console.error("Service worker registration failed ❌", err));
  });
}

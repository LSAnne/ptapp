/* trainer-dashboard.js
   Works with trainer-dashboard.html you pasted.
   Tables expected:
   - profiles(id uuid, full_name text, email text, trainer_id uuid, role text, is_client bool)
   - sessions(id uuid, client_id uuid, session_date date)
   - workouts(id uuid, session_id uuid, exercise text, sets int, reps int, weight numeric, rpe numeric, notes text)
*/

///////////////////////
// Supabase init
///////////////////////
const SB_URL  = 'https://ukqmpkzljwiwpyvygrai.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcW1wa3psandpd3B5dnlncmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjk1MTAsImV4cCI6MjA2OTgwNTUxMH0.4H3XnW4tYSDofnFeSoEBqACVFh1Ud5sI8bXsnEsiu4E';
const sb = supabase.createClient(SB_URL, SB_ANON);

///////////////////////
// Elements
///////////////////////
const esc = s => (s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const statusEl = document.getElementById('status');
const tableEl  = document.getElementById('clientTable');
const bodyEl   = document.getElementById('clientBody');
const emptyEl  = document.getElementById('emptyState');
const whoamiEl = document.getElementById('whoami');
const searchEl = document.getElementById('search');

// Create client
const createForm = document.getElementById('createClientForm');
const createBtn  = document.getElementById('createBtn');
const createErr  = document.getElementById('createError');
const createOk   = document.getElementById('createOk');

// New Session
const sessionErr = document.getElementById('sessionError');
const planBtn = document.getElementById('planBtn');
const sessionClientSel = document.getElementById('sessionClient');
const newSessionModal = new bootstrap.Modal(document.getElementById('newSessionModal'));

// Graphs
const graphsTitle = document.getElementById('graphsTitle');
const graphsError = document.getElementById('graphsError');
const graphsModal = new bootstrap.Modal(document.getElementById('graphsModal'));
let weightChart = null;
let activityChart = null;

// Latest (purple) modal
const latestModal   = new bootstrap.Modal(document.getElementById('latestSessionModal'));
const latestBody    = document.getElementById('latestBody');
const latestError   = document.getElementById('latestError');
const latestToolbar = document.getElementById('latestToolbar');
const latestCsvBtn  = document.getElementById('latestCsv');
const latestPrintBtn= document.getElementById('latestPrint');

///////////////////////
// State
///////////////////////
let allClients = [];
let lastWorkoutMap = {}; // client_id -> yyyy-mm-dd
let lastCheckinMap = {}; // client_id -> yyyy-mm-dd
let latestTableId = null;

///////////////////////
// Helpers
///////////////////////
function renderRow(c){
  const lastW = lastWorkoutMap[c.id] || '—';
  const lastP = lastCheckinMap[c.id] || '—';
  const lastWLink = lastWorkoutMap[c.id]
    ? '<a class="link" href="client-workouts.html?id='+encodeURIComponent(c.id)+'&focus='+encodeURIComponent(lastW)+'">'+esc(lastW)+'</a>'
    : '—';

  return [
    '<tr data-id="', c.id, '" data-name="', esc(c.full_name || ''), '">',
      '<td>', esc(c.full_name || ''), '</td>',
      '<td>', esc(c.email || ''), '</td>',
      '<td>', lastWLink, '</td>',
      '<td>', esc(lastP), '</td>',
      '<td class="text-end">',
        '<div class="btn-group">',
          '<a class="btn btn-sm btn-primary" href="client-workouts.html?id=', encodeURIComponent(c.id),'">View</a>',
          '<button class="btn btn-sm btn-graphs" data-action="graphs">Graphs</button>',
          '<button class="btn btn-sm btn-session" data-action="plan">New Session</button>',
          '<button class="btn btn-sm btn-outline-light" data-action="latest">Latest</button>',
        '</div>',
      '</td>',
    '</tr>'
  ].join('');
}

function applyFilter(){
  const q = (searchEl.value || '').toLowerCase().trim();
  const filtered = !q ? allClients : allClients.filter(c =>
    (c.full_name||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q)
  );
  bodyEl.innerHTML = filtered.map(renderRow).join('');
  tableEl.style.display = filtered.length ? 'table' : 'none';
  emptyEl.style.display = filtered.length ? 'none' : 'block';
}

async function fetchLastWorkoutDates(ids){
  lastWorkoutMap = {};
  if (!ids.length) return;
  const { data, error } = await sb
    .from('sessions')
    .select('client_id, session_date')
    .in('client_id', ids)
    .order('session_date', { ascending:false });
  if (!error && Array.isArray(data)) {
    data.forEach(r => { if (!lastWorkoutMap[r.client_id]) lastWorkoutMap[r.client_id] = r.session_date; });
  }
}

async function fetchLastCheckinDates(ids){
  lastCheckinMap = {};
  if (!ids.length) return;
  const { data, error } = await sb
    .from('progress')
    .select('client_id, log_date')
    .in('client_id', ids)
    .order('log_date', { ascending:false });
  if (!error && Array.isArray(data)) {
    data.forEach(r => { if (!lastCheckinMap[r.client_id]) lastCheckinMap[r.client_id] = r.log_date; });
  }
}

function fillSessionClientOptions(){
  sessionClientSel.innerHTML = allClients
    .map(c => '<option value="'+c.id+'">'+esc(c.full_name || c.email || c.id)+'</option>')
    .join('');
}

///////////////////////
// Table actions
///////////////////////
bodyEl.addEventListener('click', async (e) => {
  const row = e.target.closest('tr[data-id]');
  if (!row) return;
  const client_id = row.getAttribute('data-id');
  const name = row.getAttribute('data-name') || 'Client';

  if (e.target.matches('button[data-action="plan"]')) {
    sessionClientSel.value = client_id;
    document.getElementById('sessionDate').valueAsDate = new Date();
    document.getElementById('sessionRpe').value = '';
    document.getElementById('sessionLines').value =
      'Hip Thrust, 4, 12, 60, tempo 3-1-1\nRDL, 3, 8, 50\nWalking Lunge, 3, 10, 20';
    sessionErr.classList.add('d-none'); sessionErr.textContent='';
    newSessionModal.show();
  }

  if (e.target.matches('button[data-action="graphs"]')) {
    graphsTitle.textContent = 'Progress · ' + name;
    graphsError.classList.add('d-none'); graphsError.textContent = '';
    graphsModal.show();
    await renderGraphs(client_id);
  }

  if (e.target.matches('button[data-action="latest"]')) {
    await showLatestSession(client_id, name);
  }
});

///////////////////////
// Charts
///////////////////////
async function renderGraphs(client_id){
  const { data: weights, error: wErr } = await sb
    .from('progress')
    .select('log_date, body_weight')
    .eq('client_id', client_id)
    .not('body_weight', 'is', null)
    .order('log_date', { ascending: true })
    .limit(180);

  const { data: wk, error: aErr } = await sb
    .from('sessions')
    .select('session_date')
    .eq('client_id', client_id)
    .order('session_date', { ascending: true })
    .limit(365);

  if (wErr || aErr) {
    graphsError.textContent = (wErr?.message || aErr?.message || 'Failed to load data');
    graphsError.classList.remove('d-none');
    return;
  }

  const wLabels = (weights||[]).map(r => r.log_date);
  const wData   = (weights||[]).map(r => Number(r.body_weight));
  if (weightChart) weightChart.destroy();
  weightChart = new Chart(document.getElementById('weightChart'), {
    type: 'line',
    data: { labels: wLabels, datasets: [{ label: 'Body weight', data: wData }] },
    options: { responsive:true, plugins:{legend:{labels:{color:'#eaf2f9'}}},
               scales:{ x:{ ticks:{ color:'#9fb3c8'}}, y:{ ticks:{color:'#9fb3c8'}}} }
  });

  const weekCount = {};
  (wk||[]).forEach(r => {
    const d = new Date(r.session_date);
    const key = d.getFullYear() + '-W' + isoWeek(d);
    weekCount[key] = (weekCount[key] || 0) + 1;
  });
  const aLabels = Object.keys(weekCount).sort();
  const aData   = aLabels.map(k => weekCount[k]);
  if (activityChart) activityChart.destroy();
  activityChart = new Chart(document.getElementById('activityChart'), {
    type: 'bar',
    data: { labels: aLabels, datasets: [{ label: 'Sessions per week', data: aData }] },
    options: { responsive:true, plugins:{legend:{labels:{color:'#eaf2f9'}}},
               scales:{ x:{ ticks:{ color:'#9fb3c8'}}, y:{ ticks:{color:'#9fb3c8'}}} }
  });
}

function isoWeek(d){
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(dt.getUTCFullYear(),0,4));
  return String(1 + Math.round(((dt - firstThu)/86400000 - 3 + ((firstThu.getUTCDay()+6)%7))/7)).padStart(2,'0');
}

///////////////////////
// Create client
///////////////////////
createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  createErr.classList.add('d-none'); createOk.classList.add('d-none');
  createBtn.disabled = true; createBtn.textContent = 'Creating…';
  try{
    const full_name = document.getElementById('newFullName').value.trim();
    const email     = document.getElementById('newEmail').value.trim();
    const password  = document.getElementById('newPassword').value;
    if (!full_name || !email || !password) throw new Error('Please fill all fields.');

    const { data: sign, error: sErr } = await sb.auth.signUp({
      email, password, options:{ data:{ full_name } }
    });
    if (sErr) throw sErr;
    const uid = sign.user?.id; if (!uid) throw new Error('Sign-up did not return a user id.');

    const me = (await sb.auth.getUser()).data.user;
    const { error: pErr } = await sb.from('profiles')
      .insert({ id: uid, email, full_name, role:'client', is_client:true, trainer_id: me.id });
    if (pErr) throw pErr;

    createOk.textContent = 'Client added ✅';
    createOk.classList.remove('d-none');
    e.target.reset();
    await init(); // refresh client list
  }catch(err){
    createErr.textContent = err?.message || String(err);
    createErr.classList.remove('d-none');
  }finally{
    createBtn.disabled = false; createBtn.textContent = 'Create client';
  }
});

///////////////////////
// Plan session (sessions + workouts rows)
///////////////////////
document.getElementById('newSessionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  sessionErr.classList.add('d-none'); sessionErr.textContent='';
  planBtn.disabled = true; planBtn.textContent = 'Creating…';
  try{
    const client_id = sessionClientSel.value;
    const date = document.getElementById('sessionDate').value;
    const default_rpe = document.getElementById('sessionRpe').value
      ? Number(document.getElementById('sessionRpe').value) : null;
    const lines = document.getElementById('sessionLines')
      .value.split('\n').map(s => s.trim()).filter(Boolean);

    if (!client_id || !date || !lines.length)
      throw new Error('Select client, date, and add at least one line.');

    // 1) create session
    const { data: session, error: sErr } = await sb
      .from('sessions')
      .insert({ client_id, session_date: date })
      .select('id')
      .single();
    if (sErr) throw sErr;

    // 2) create workout rows
    const rows = lines.map(line => {
      const p = line.split(',').map(x => x.trim());
      return {
        session_id: session.id,
        exercise: p[0] || '',
        sets: p[1] ? Number(p[1]) : null,
        reps: p[2] ? Number(p[2]) : null,
        weight: (p[3] !== undefined && p[3] !== '') ? Number(p[3]) : null,
        rpe: default_rpe,
        notes: p.slice(4).join(', ') || null
      };
    }).filter(r => r.exercise);

    const { error } = await sb.from('workouts').insert(rows);
    if (error) throw error;

    document.getElementById('newSessionForm').reset();
    newSessionModal.hide();
    lastWorkoutMap[client_id] = date; // optimistic update
    applyFilter();
  }catch(err){
    sessionErr.textContent = err?.message || String(err);
    sessionErr.classList.remove('d-none');
  }finally{
    planBtn.disabled=false; planBtn.textContent='Create session';
  }
});

///////////////////////
// Latest session viewer (purple modal)
// + CSV and Print
///////////////////////
latestCsvBtn.addEventListener('click', () => {
  if (!latestTableId) return;
  const tbl = document.getElementById(latestTableId);
  const csv = tableToCsv(tbl);
  downloadCsv(csv, 'latest-session.csv');
});

latestPrintBtn.addEventListener('click', () => {
  if (!latestTableId) return;
  const html = document.getElementById(latestTableId).outerHTML;
  const w = window.open('', '_blank');
  w.document.write(
    '<html><head><title>Print Session</title>' +
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">' +
    '<style>body{padding:1rem;} table{width:100%;}</style>' +
    '</head><body>' + html + '</body></html>'
  );
  w.document.close();
  w.onload = () => w.print(); // no injected <script> tags
});

async function showLatestSession(client_id, name){
  latestError.classList.add('d-none'); latestError.textContent = '';
  latestBody.innerHTML = '<div class="text-white-50">Loading…</div>';
  latestToolbar.classList.add('d-none');
  latestTableId = null;
  latestModal.show();

  const { data: session, error: sErr } = await sb
    .from('sessions')
    .select('id, session_date, workouts(exercise, sets, reps, weight, rpe, notes)')
    .eq('client_id', client_id)
    .order('session_date', { ascending:false })
    .limit(1)
    .single();

  if (sErr){
    latestError.textContent = sErr.message;
    latestError.classList.remove('d-none');
    latestBody.innerHTML = '';
    return;
  }

  const tid = 'latest-tbl-' + session.id;
  const rows = (session.workouts || []).map(w => (
    '<tr>' +
      '<td>' + esc(w.exercise || '') + '</td>' +
      '<td>' + (w.sets ?? '') + '</td>' +
      '<td>' + (w.reps ?? '') + '</td>' +
      '<td>' + (w.weight ?? '') + '</td>' +
      '<td>' + (w.rpe ?? '') + '</td>' +
      '<td>' + esc(w.notes || '') + '</td>' +
    '</tr>'
  )).join('');

  latestBody.innerHTML =
    '<div class="d-flex justify-content-between align-items-center mb-2">' +
      '<h6 class="mb-0">' + esc(name) + '</h6>' +
      '<span class="badge">' + session.session_date + '</span>' +
    '</div>' +
    '<div class="table-responsive">' +
      '<table class="table table-sm table-striped align-middle mb-0" id="' + tid + '">' +
        '<thead><tr>' +
          '<th style="width:30%">Exercise</th>' +
          '<th style="width:10%">Sets</th>' +
          '<th style="width:10%">Reps</th>' +
          '<th style="width:10%">Weight</th>' +
          '<th style="width:10%">RPE</th>' +
          '<th style="width:30%">Notes</th>' +
        '</tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="6" class="text-white-50">No exercises logged.</td></tr>') + '</tbody>' +
      '</table>' +
    '</div>';

  latestTableId = tid;
  latestToolbar.classList.remove('d-none');
}

function tableToCsv(tbl){
  const rows = Array.from(tbl.querySelectorAll('tr'));
  return rows.map(tr => {
    const cells = Array.from(tr.querySelectorAll('th,td'));
    return cells.map(td => '"' + (td.textContent || '').replace(/"/g, '""') + '"').join(',');
  }).join('\n');
}
function downloadCsv(csv, filename){
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

///////////////////////
// Search + Logout + Init
///////////////////////
searchEl.addEventListener('input', applyFilter);

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
  Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k));
  location.replace('trainer-login.html');
});

async function init(){
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) { location.replace('trainer-login.html'); return; }
  whoamiEl.textContent = 'Signed in as: ' + user.email;

  const { data, error: qErr } = await sb
    .from('profiles')
    .select('id, full_name, email')
    .eq('trainer_id', user.id)
    .order('full_name', { ascending:true });

  if (qErr) { statusEl.textContent = 'Error loading clients: ' + qErr.message; return; }

  allClients = data || [];
  const ids = allClients.map(c => c.id);
  await Promise.all([fetchLastWorkoutDates(ids), fetchLastCheckinDates(ids)]);

  statusEl.style.display = 'none';
  if (!allClients.length) {
    tableEl.style.display = 'none'; emptyEl.style.display = 'block';
  } else {
    emptyEl.style.display = 'none'; tableEl.style.display = 'table';
    applyFilter(); fillSessionClientOptions();
  }
}

init();
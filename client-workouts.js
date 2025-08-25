/* global supabase, sb */
// If you don't have supabaseClient.js, uncomment the two lines below and fill in your keys:
// const SB_URL  = 'https://YOUR-PROJECT.supabase.co';
// const SB_ANON = 'YOUR-ANON-KEY';
// const sb = window.sb || supabase.createClient(SB_URL, SB_ANON);

(function(){
  const whoamiEl      = document.getElementById('whoami');
  const clientInfoEl  = document.getElementById('clientInfo');
  const clientIdBadge = document.getElementById('clientIdBadge');

  const pickerWrap    = document.getElementById('pickerWrap');
  const clientPicker  = document.getElementById('clientPicker');

  const dateInput     = document.getElementById('sessionDate');
  const defaultRpeInp = document.getElementById('defaultRpe');
  const exTbody       = document.getElementById('exTbody');
  const addRowBtn     = document.getElementById('addRowBtn');
  const formErr       = document.getElementById('formError');

  const addBtn        = document.getElementById('addSession');
  const clearBtn      = document.getElementById('clearForm');
  const sessionsEl    = document.getElementById('sessions');

  const exportAllBtn  = document.getElementById('exportAllBtn');
  const printAllBtn   = document.getElementById('printAllBtn');

  let CLIENT_ID = null;

  // ----------
  // Utilities
  // ----------
  const esc = s => (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function rowTemplate(values = {}){
    const {
      exercise = '', sets = '', reps = '', weight = '', rpe = '', notes = ''
    } = values;
    const id = 'r_' + Math.random().toString(36).slice(2,9);
    return `
      <tr data-row-id="${id}">
        <td><input class="form-control form-control-sm" placeholder="Hip Thrust" value="${esc(exercise)}"></td>
        <td style="max-width:90px"><input type="number" min="0" class="form-control form-control-sm" placeholder="4" value="${esc(sets)}"></td>
        <td style="max-width:90px"><input type="number" min="0" class="form-control form-control-sm" placeholder="12" value="${esc(reps)}"></td>
        <td style="max-width:120px"><input type="number" step="0.1" class="form-control form-control-sm" placeholder="60" value="${esc(weight)}"></td>
        <td style="max-width:90px"><input type="number" step="0.5" min="1" max="10" class="form-control form-control-sm" placeholder="7.5" value="${esc(rpe)}"></td>
        <td><input class="form-control form-control-sm" placeholder="tempo 3-1-1, etc" value="${esc(notes)}"></td>
        <td class="text-end"><button type="button" class="btn btn-sm btn-outline-light" data-remove>×</button></td>
      </tr>`;
  }

  function readTableRows(){
    const rows = [];
    exTbody.querySelectorAll('tr').forEach(tr => {
      const [ex, s, r, w, rp, no] = tr.querySelectorAll('input');
      const exercise = ex.value.trim();
      const sets     = s.value ? Number(s.value) : null;
      const reps     = r.value ? Number(r.value) : null;
      const weight   = w.value ? Number(w.value) : null;
      const rpe      = rp.value ? Number(rp.value) : null;
      const notes    = no.value.trim() || null;
      if (exercise) rows.push({ exercise, sets, reps, weight, rpe, notes });
    });
    return rows;
  }

  function tableToCsv(tbl){
    const rows = Array.from(tbl.querySelectorAll('tr'));
    return rows.map(tr => {
      const cells = Array.from(tr.querySelectorAll('th,td'));
      return cells.map(td => `"${(td.textContent || '').replace(/"/g,'""')}"`).join(',');
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

  // ----------
  // Init
  // ----------
  (async function init(){
    // Ensure client
    if (!window.sb) { alert('Supabase client (window.sb) not found. Ensure supabaseClient.js sets window.sb.'); return; }

    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user){ location.replace('trainer-login.html'); return; }
    whoamiEl.textContent = 'Signed in as: ' + user.email;

    // Get client_id from URL (?id=... or ?client_id=...)
    const params = new URLSearchParams(location.search);
    CLIENT_ID = (params.get('id') || params.get('client_id') || '').trim() || null;
    if (CLIENT_ID){
      clientIdBadge.textContent = CLIENT_ID;
      clientIdBadge.classList.remove('d-none');
    }

    // If no client specified, show picker
    if (!CLIENT_ID){
      pickerWrap.classList.remove('d-none');
      const { data: clients } = await sb
        .from('profiles')
        .select('id, full_name, email')
        .eq('trainer_id', user.id)
        .order('full_name');
      clientPicker.innerHTML = (clients || [])
        .map(c => `<option value="${c.id}">${esc(c.full_name || c.email || c.id)}</option>`)
        .join('');
      document.getElementById('goClient').addEventListener('click', ()=>{
        const id = clientPicker.value;
        if (id) location.href = 'client-workouts.html?id='+encodeURIComponent(id);
      });
      return; // stop: we need an id to continue
    }

    // Client header info
    const { data: client, error: cErr } = await sb
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', CLIENT_ID)
      .maybeSingle();
    if (cErr){ clientInfoEl.innerHTML = '<span class="text-danger">'+cErr.message+'</span>'; }
    else if (client){ clientInfoEl.textContent = (client.full_name||'') + ' • ' + (client.email||''); }

    // Default date = today
    dateInput.value = new Date().toISOString().slice(0,10);

    // Seed some demo rows so Add Row obviously works
    exTbody.innerHTML =
      rowTemplate({ exercise:'Hip Thrust', sets:4, reps:12, weight:60, rpe:'', notes:'tempo 3-1-1' }) +
      rowTemplate({ exercise:'RDL', sets:3, reps:8, weight:50 }) +
      rowTemplate({ exercise:'Walking Lunge', sets:3, reps:10, weight:20 });

    // Wire dynamic row buttons
    exTbody.addEventListener('click', (e) => {
      if (e.target.matches('[data-remove]')) {
        e.target.closest('tr')?.remove();
      }
    });
    addRowBtn.addEventListener('click', () => {
      exTbody.insertAdjacentHTML('beforeend', rowTemplate());
      // scroll to new row so user sees it appeared
      exTbody.lastElementChild?.scrollIntoView({ behavior:'smooth', block:'nearest' });
    });

    // Export / print
    exportAllBtn.addEventListener('click', exportAllSessionsCsv);
    printAllBtn.addEventListener('click', ()=>window.print());

    // Load existing sessions
    await loadSessions();
  })();

  // ----------
  // Actions
  // ----------
  clearBtn.addEventListener('click', () => {
    defaultRpeInp.value = '';
    exTbody.querySelectorAll('tr').forEach((tr,i) => { if (i>0) tr.remove(); });
    const first = exTbody.querySelector('tr');
    if (first) first.querySelectorAll('input').forEach(inp => inp.value = '');
  });

  addBtn.addEventListener('click', async () => {
    formErr.classList.add('d-none'); formErr.textContent = '';
    try{
      if (!CLIENT_ID) throw new Error('No client selected.');
      const date = dateInput.value;
      const defaultRpe = defaultRpeInp.value ? Number(defaultRpeInp.value) : null;
      const rows = readTableRows();
      if (!date || !rows.length) throw new Error('Please provide a date and at least one exercise row.');

      // 1) Create session header
      const { data: session, error: sErr } = await sb
        .from('sessions')
        .insert({ client_id: CLIENT_ID, session_date: date })
        .select('id')
        .single();
      if (sErr) throw sErr;

      // 2) Expand into workouts rows
      const outRows = rows.map(r => ({
        session_id: session.id,
        exercise: r.exercise,
        sets: r.sets,
        reps: r.reps,
        weight: r.weight,
        rpe: (r.rpe ?? null) || defaultRpe,
        notes: r.notes
      }));
      const { error: wErr } = await sb.from('workouts').insert(outRows);
      if (wErr) throw wErr;

      // Clear inputs and reload sessions
      defaultRpeInp.value = '';
      await loadSessions();
      // Keep table but clear values
      exTbody.querySelectorAll('input').forEach(inp => inp.value = '');
    }catch(e){
      formErr.textContent = e.message || String(e);
      formErr.classList.remove('d-none');
    }
  });

  async function loadSessions(){
    const { data, error } = await sb
      .from('sessions')
      .select('id, session_date, workouts(exercise, sets, reps, weight, rpe, notes)')
      .eq('client_id', CLIENT_ID)
      .order('session_date', { ascending:false });
    if (error){
      sessionsEl.innerHTML = '<div class="text-danger">'+error.message+'</div>';
      return;
    }

    sessionsEl.innerHTML = (data||[]).map(s => renderSessionCard(s)).join('');
    sessionsEl.querySelectorAll('[data-csv]').forEach(btn => btn.addEventListener('click', onExportCsv));
    sessionsEl.querySelectorAll('[data-print]').forEach(btn => btn.addEventListener('click', onPrintTable));
  }

  function renderSessionCard(s){
    const rows = (s.workouts||[]).map(w => (
      '<tr>'
        + '<td>'+esc(w.exercise||'')+'</td>'
        + '<td>'+(w.sets??'')+'</td>'
        + '<td>'+(w.reps??'')+'</td>'
        + '<td>'+(w.weight??'')+'</td>'
        + '<td>'+(w.rpe??'')+'</td>'
        + '<td>'+esc(w.notes||'')+'</td>'
      + '</tr>'
    )).join('');

    return (
      '<div class="card mb-3">'
        + '<div class="card-body">'
          + '<div class="d-flex justify-content-between align-items-center mb-2">'
            + '<h5 class="card-title mb-0">'+s.session_date+'</h5>'
            + '<div class="btn-group">'
              + '<button class="btn btn-outline-light btn-sm" data-csv data-id="'+s.id+'">Export CSV</button>'
              + '<button class="btn btn-outline-light btn-sm" data-print data-id="'+s.id+'">Print</button>'
            + '</div>'
          + '</div>'
          + '<div class="table-responsive">'
            + '<table class="table table-sm table-striped align-middle mb-0" id="tbl-'+s.id+'">'
              + '<thead><tr>'
                + '<th style="width:30%">Exercise</th>'
                + '<th style="width:10%">Sets</th>'
                + '<th style="width:10%">Reps</th>'
                + '<th style="width:10%">Weight</th>'
                + '<th style="width:10%">RPE</th>'
                + '<th style="width:30%">Notes</th>'
              + '</tr></thead>'
              + '<tbody>' + (rows || '<tr><td colspan="6" class="text-secondary">No rows.</td></tr>') + '</tbody>'
            + '</table>'
          + '</div>'
        + '</div>'
      + '</div>'
    );
  }

  async function onExportCsv(e){
    const id = e.currentTarget.getAttribute('data-id');
    const tbl = document.getElementById('tbl-'+id);
    const csv = tableToCsv(tbl);
    downloadCsv(csv, 'session-'+id+'.csv');
  }

  function onPrintTable(e){
    const id = e.currentTarget.getAttribute('data-id');
    const html = document.getElementById('tbl-'+id).outerHTML;
    const w = window.open('', '_blank');
    w.document.write(
      '<html><head><title>Print Session</title>'
      + '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">'
      + '</head><body class="p-3">' + html
      + '<script>window.onload=function(){window.print();}</' + 'script></body></html>'
    );
    w.document.close();
  }

  async function exportAllSessionsCsv(){
    const { data, error } = await sb
      .from('sessions')
      .select('session_date, workouts(exercise, sets, reps, weight, rpe, notes)')
      .eq('client_id', CLIENT_ID)
      .order('session_date', { ascending:true });
    if (error){ alert(error.message); return; }

    const rows = [];
    rows.push(['Session Date','Exercise','Sets','Reps','Weight','RPE','Notes']);
    (data||[]).forEach(s => {
      (s.workouts||[]).forEach(w => {
        rows.push([
          s.session_date,
          w.exercise || '',
          w.sets ?? '',
          w.reps ?? '',
          w.weight ?? '',
          w.rpe ?? '',
          (w.notes || '').replace(/\r?\n/g,' ')
        ]);
      });
    });
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadCsv(csv, 'client-sessions.csv');
  }
})();
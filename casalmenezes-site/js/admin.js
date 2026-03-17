/* ============================================================
   CASAL MENEZES HAIR SHOP — admin.js
   ============================================================ */

const SVC          = { corte:'Corte & Styling', coloracao:'Coloração', tratamento:'Tratamentos', noiva:'Noiva', massagem:'Massagem', barba:'Barba' };
const STL          = { ana:'Ana Menezes', anderson:'Anderson Menezes', '':'Sem preferência' };
const MONTHS_PT    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS_PT      = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];


let BOOKINGS = [];
let calYear, calMonth;

async function doLogin() {
  const user = document.getElementById('loginUser').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.classList.remove('show');

  if (!user || !pass) { errEl.classList.add('show'); return; }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_admin_login`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_username: user, p_password: pass })
    });

    const ok = await res.json();
    if (!ok) { errEl.classList.add('show'); return; }

    sessionStorage.setItem('admin_user', user);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').classList.add('show');
    document.getElementById('sidebarUser').textContent = user.charAt(0).toUpperCase() + user.slice(1);
    const mu = document.getElementById('mobileUser'); if (mu) mu.textContent = user.charAt(0).toUpperCase() + user.slice(1);
    initApp();
  } catch (err) {
    errEl.classList.add('show');
  }
}
function doLogout() {
  sessionStorage.removeItem('admin_user');
  document.getElementById('app').classList.remove('show');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginPass').value = '';
}

async function initApp() {
  const now = new Date();
  document.getElementById('todayDate').textContent =
    `${DAYS_PT[now.getDay()]}, ${now.getDate()} de ${MONTHS_PT[now.getMonth()]} de ${now.getFullYear()}`;
  await loadBookings();
  calYear = now.getFullYear(); calMonth = now.getMonth();
  renderCalendar();
}

function showLoadingState() {
  ['kpiToday','kpiPending','kpiWeek','kpiTotal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="spinner" style="margin:auto"></div>';
  });
  const todayTable = document.getElementById('todayTable');
  if (todayTable) todayTable.innerHTML = `<div class="table-empty"><div class="spinner" style="margin:0 auto 12px"></div>A carregar marcações...</div>`;
  const tbody = document.getElementById('bookingsTableBody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6"><div class="table-empty"><div class="spinner" style="margin:0 auto 12px"></div>A carregar...</div></td></tr>`;
}

async function loadBookings() {
  showLoadingState();
  try {
    BOOKINGS = await db.select('bookings', { order: 'date.asc,time.asc' });
  } catch (err) {
    console.error('loadBookings:', err);
    BOOKINGS = [];
  }
  await autoCancelExpired();
  updateKPIs(); renderTodayTable(); renderBookingsTable();
}

async function autoCancelExpired() {
  const today = new Date().toISOString().split('T')[0];
  const expired = BOOKINGS.filter(b => b.status === 'pending' && b.date < today);
  for (const b of expired) {
    try {
      await db.update('bookings', { status: 'cancelled' }, [['id', 'eq', b.id]]);
      b.status = 'cancelled';
    } catch (err) {
      console.warn('autoCancelExpired:', err);
    }
  }
}

function updateKPIs() {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  document.getElementById('kpiToday').textContent   = BOOKINGS.filter(b => b.date === today && b.status !== 'cancelled').length;
  document.getElementById('kpiPending').textContent  = BOOKINGS.filter(b => b.status === 'pending').length;
  document.getElementById('kpiWeek').textContent     = BOOKINGS.filter(b => { const d = new Date(b.date); return d >= weekStart && d <= weekEnd && b.status === 'confirmed'; }).length;
  document.getElementById('kpiTotal').textContent    = BOOKINGS.length;
}

function renderTodayTable() {
  const today  = new Date().toISOString().split('T')[0];
  const todayB = BOOKINGS.filter(b => b.date === today && b.status !== 'cancelled');
  const show   = todayB.length ? todayB : BOOKINGS.filter(b => b.status !== 'cancelled').slice(0,3);
  const el     = document.getElementById('todayTable');
  if (!show.length) { el.innerHTML = `<div class="table-empty"><div class="big">🌅</div>Sem marcações para hoje</div>`; return; }
  el.innerHTML = `<table><thead><tr><th>Cliente</th><th>Serviço</th><th>Hora</th><th>Profissional</th><th>Estado</th></tr></thead><tbody>
    ${show.sort((a,b)=>a.time.localeCompare(b.time)).map(b=>`
    <tr onclick="openDrawer('${b.id}')" style="cursor:pointer">
      <td><div class="td-name">${b.first_name} ${b.last_name}</div><div class="td-muted">${b.phone}</div></td>
      <td><span class="td-service">${SVC[b.service]||b.service}</span></td>
      <td>${b.time}</td><td>${STL[b.stylist]||b.stylist||'—'}</td>
      <td><span class="badge badge-${b.status}">${{pending:'Pendente',confirmed:'Confirmado',cancelled:'Cancelado'}[b.status]}</span></td>
    </tr>`).join('')}
  </tbody></table>`;
}

function renderBookingsTable() {
  const search  = document.getElementById('filterSearch').value.toLowerCase();
  const status  = document.getElementById('filterStatus').value;
  const service = document.getElementById('filterService').value;
  const filtered = BOOKINGS.filter(b => {
    const name = `${b.first_name} ${b.last_name} ${b.phone}`.toLowerCase();
    return (!search || name.includes(search)) && (!status || b.status===status) && (!service || b.service===service);
  }).sort((a,b)=>b.date.localeCompare(a.date)||a.time.localeCompare(b.time));

  const tbody = document.getElementById('bookingsTableBody');
  if (!filtered.length) { tbody.innerHTML=`<tr><td colspan="6"><div class="table-empty"><div class="big">🔍</div>Sem resultados</div></td></tr>`; return; }
  tbody.innerHTML = filtered.map(b => {
    const d = new Date(b.date+'T12:00');
    const canAct = b.status !== 'cancelled' && d >= new Date();
    return `<tr onclick="openDrawer('${b.id}')" style="cursor:pointer">
      <td><div class="td-name">${b.first_name} ${b.last_name}</div><div class="td-muted">${b.phone}${b.email?` · ${b.email}`:''}</div></td>
      <td><span class="td-service">${SVC[b.service]||b.service}</span></td>
      <td><div class="td-name">${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}</div><div class="td-muted">${b.time}</div></td>
      <td>${STL[b.stylist]||b.stylist||'—'}</td>
      <td><span class="badge badge-${b.status}">${{pending:'Pendente',confirmed:'Confirmado',cancelled:'Cancelado'}[b.status]}</span></td>
      <td onclick="event.stopPropagation()"><div class="action-btns">
        ${canAct && b.status!=='confirmed' ? `<button class="btn-action btn-confirm" onclick="changeStatus('${b.id}','confirmed')">✓ Confirmar</button>` : ''}
        ${canAct ? `<button class="btn-action btn-cancel-row" onclick="changeStatus('${b.id}','cancelled')">✕</button>` : ''}
      </div></td>
    </tr>`;
  }).join('');
}

async function changeStatus(id, newStatus) {
  try {
    await db.update('bookings', { status: newStatus }, [['id','eq',id]]);
    const b = BOOKINGS.find(x => x.id === id);
    if (b) b.status = newStatus;
    updateKPIs(); renderTodayTable(); renderBookingsTable(); renderCalendar();
    showToast({ confirmed:'Marcação confirmada!', cancelled:'Marcação cancelada.' }[newStatus]||'Atualizado',
      `${b.first_name} ${b.last_name} – ${b.time}`);
    if (document.getElementById('drawerOverlay').classList.contains('open')) openDrawer(id);
  } catch (err) {
    showToast('Erro', 'Não foi possível atualizar.');
  }
}

function openDrawer(id) {
  const b = BOOKINGS.find(x => x.id === id);
  if (!b) return;
  const d = new Date(b.date+'T12:00');
  const canAct = b.status !== 'cancelled' && d >= new Date();
  const lbl = {pending:'Pendente',confirmed:'Confirmado',cancelled:'Cancelado'}[b.status]||b.status;
  document.getElementById('drawerContent').innerHTML = `
    <h2>${b.first_name} ${b.last_name}</h2>
    <span class="badge badge-${b.status}" style="margin-top:8px;display:inline-flex">${lbl}</span>
    <div class="drawer-section"><h4>Detalhes do Serviço</h4>
      <div class="drawer-row"><span class="lbl">Serviço</span><span>${SVC[b.service]||b.service}</span></div>
      <div class="drawer-row"><span class="lbl">Data</span><span>${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}</span></div>
      <div class="drawer-row"><span class="lbl">Hora</span><span>${b.time}</span></div>
      <div class="drawer-row"><span class="lbl">Profissional</span><span>${STL[b.stylist]||b.stylist||'—'}</span></div>
    </div>
    <div class="drawer-section"><h4>Contacto</h4>
      <div class="drawer-row"><span class="lbl">Telemóvel</span><span>${b.phone}</span></div>
      ${b.email?`<div class="drawer-row"><span class="lbl">Email</span><span>${b.email}</span></div>`:''}
    </div>
    ${b.notes?`<div class="drawer-section"><h4>Observações</h4><p style="font-size:.85rem;color:var(--warm-gray);line-height:1.6;font-weight:300">${b.notes}</p></div>`:''}
    <div class="drawer-actions">
      ${canAct && b.status!=='confirmed' ? `<button class="btn-drawer-confirm" onclick="changeStatus('${b.id}','confirmed')">✓ Confirmar Marcação</button>` : ''}
      ${canAct ? `<button class="btn-drawer-cancel" onclick="changeStatus('${b.id}','cancelled')">✕ Cancelar Marcação</button>` : ''}
    </div>`;
  document.getElementById('drawerOverlay').classList.add('open');
}
function closeDrawer(e) {
  if (e && e.target !== document.getElementById('drawerOverlay')) return;
  document.getElementById('drawerOverlay').classList.remove('open');
}

function renderCalendar() {
  document.getElementById('calTitle').textContent = `${MONTHS_PT[calMonth]} ${calYear}`;
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const daysInPrev  = new Date(calYear, calMonth, 0).getDate();
  const today = new Date().toISOString().split('T')[0];
  let html = '';
  const total = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  for (let i = 0; i < total; i++) {
    let dayNum, thisMonth = true, dateStr;
    if      (i < firstDay)                { dayNum = daysInPrev - firstDay + i + 1; thisMonth = false; }
    else if (i >= firstDay + daysInMonth) { dayNum = i - firstDay - daysInMonth + 1; thisMonth = false; }
    else                                  { dayNum = i - firstDay + 1; }
    if (thisMonth) dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    const dayB = dateStr ? BOOKINGS.filter(b => b.date === dateStr && b.status !== 'cancelled') : [];
    html += `<div class="cal-day${!thisMonth?' other-month':''}${dateStr===today?' today':''}">
      <div class="cal-day-num">${dayNum}</div>
      ${dayB.slice(0,3).map(b=>`<div class="cal-event ${b.status}" onclick="openDrawer('${b.id}')">${b.time} ${b.first_name}</div>`).join('')}
      ${dayB.length>3?`<div class="cal-event" style="background:rgba(0,0,0,0.06);color:#888">+${dayB.length-3} mais</div>`:''}
    </div>`;
  }
  document.getElementById('calDays').innerHTML = html;
}
function changeMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  else if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function exportCSV() {
  if (!BOOKINGS.length) { showToast('Sem dados', 'Não há marcações para exportar.'); return; }
  const headers = ['Nome','Apelido','Telemóvel','Email','Serviço','Data','Hora','Profissional','Estado','Observações'];
  const rows = BOOKINGS.map(b => [
    b.first_name, b.last_name, b.phone, b.email || '',
    SVC[b.service] || b.service, b.date, b.time,
    STL[b.stylist] || b.stylist || '',
    {pending:'Pendente',confirmed:'Confirmado',cancelled:'Cancelado'}[b.status] || b.status,
    (b.notes || '').replace(/"/g,'""')
  ].map(v => `"${v}"`).join(','));
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `marcacoes_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Exportado!', `${BOOKINGS.length} marcações exportadas.`);
}

function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (el) el.classList.add('active');
  document.querySelectorAll('.mobile-nav-btn').forEach(b => {
    if (b.dataset.page === name) b.classList.add('active');
  });
  if (name === 'settings')  initSettings();
  if (name === 'analytics') renderAnalytics();
  if (name === 'services')  renderServicesList();
}

/* ── ANALYTICS ────────────────────────────────────────────── */
let chartWeekly = null, chartService = null, chartStylist = null, chartStatus = null;

function renderAnalytics() {
  if (!BOOKINGS.length) return;

  // Últimas 8 semanas
  const weekLabels = [], weekData = [];
  const now = new Date();
  for (let w = 7; w >= 0; w--) {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay() - w * 7);
    const end   = new Date(start); end.setDate(start.getDate() + 6);
    const label = `${start.getDate()}/${start.getMonth()+1}`;
    weekLabels.push(label);
    weekData.push(BOOKINGS.filter(b => {
      const d = new Date(b.date);
      return d >= start && d <= end && b.status !== 'cancelled';
    }).length);
  }

  // Por serviço
  const svcCounts = {};
  BOOKINGS.filter(b => b.status !== 'cancelled').forEach(b => {
    svcCounts[SVC[b.service] || b.service] = (svcCounts[SVC[b.service] || b.service] || 0) + 1;
  });

  // Por profissional
  const stlCounts = {};
  BOOKINGS.filter(b => b.status !== 'cancelled').forEach(b => {
    const k = STL[b.stylist] || b.stylist || 'Sem preferência';
    stlCounts[k] = (stlCounts[k] || 0) + 1;
  });

  // Por estado
  const statusCounts = {
    Pendente:   BOOKINGS.filter(b => b.status === 'pending').length,
    Confirmado: BOOKINGS.filter(b => b.status === 'confirmed').length,
    Cancelado:  BOOKINGS.filter(b => b.status === 'cancelled').length,
  };

  const GOLD = 'rgba(201,169,110,0.8)'; const GOLD_B = 'rgba(201,169,110,1)';
  const GREEN = 'rgba(74,158,107,0.8)'; const ORANGE = 'rgba(201,124,58,0.8)'; const RED = 'rgba(201,74,74,0.8)';
  const chartDefaults = { responsive: true, plugins: { legend: { labels: { font: { family: 'Jost' }, color: '#6b6259' } } } };

  if (chartWeekly) chartWeekly.destroy();
  chartWeekly = new Chart(document.getElementById('chartWeekly'), {
    type: 'bar',
    data: { labels: weekLabels, datasets: [{ label: 'Marcações', data: weekData, backgroundColor: GOLD, borderColor: GOLD_B, borderWidth: 1, borderRadius: 4 }] },
    options: { ...chartDefaults, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: '#6b6259' }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { ticks: { color: '#6b6259' }, grid: { display: false } } } }
  });

  if (chartService) chartService.destroy();
  chartService = new Chart(document.getElementById('chartService'), {
    type: 'doughnut',
    data: { labels: Object.keys(svcCounts), datasets: [{ data: Object.values(svcCounts), backgroundColor: [GOLD,'rgba(180,140,80,0.8)',GREEN,ORANGE,RED,'rgba(100,80,60,0.8)'], borderWidth: 2, borderColor: '#fff' }] },
    options: { ...chartDefaults }
  });

  if (chartStylist) chartStylist.destroy();
  chartStylist = new Chart(document.getElementById('chartStylist'), {
    type: 'bar',
    data: { labels: Object.keys(stlCounts), datasets: [{ label: 'Marcações', data: Object.values(stlCounts), backgroundColor: GREEN, borderRadius: 4 }] },
    options: { ...chartDefaults, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { stepSize: 1, color: '#6b6259' }, grid: { color: 'rgba(0,0,0,0.05)' } }, y: { ticks: { color: '#6b6259' }, grid: { display: false } } } }
  });

  if (chartStatus) chartStatus.destroy();
  chartStatus = new Chart(document.getElementById('chartStatus'), {
    type: 'doughnut',
    data: { labels: Object.keys(statusCounts), datasets: [{ data: Object.values(statusCounts), backgroundColor: [ORANGE, GREEN, RED], borderWidth: 2, borderColor: '#fff' }] },
    options: { ...chartDefaults }
  });
}

function showToast(title, msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginPass').addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });
});


/* ── SERVIÇOS ─────────────────────────────────────────────── */
const DEFAULT_SERVICES = [
  { id:'corte',     icon:'✂️', name:'Corte & Styling',      desc:'Cortes personalizados para homem e mulher, adaptados ao seu estilo de vida e tipo de cabelo.',          price:15 },
  { id:'coloracao', icon:'🎨', name:'Coloração',             desc:'Colorações, mechas, balayage e técnicas de cor que realçam a sua beleza natural.',                      price:40 },
  { id:'tratamento',icon:'✨', name:'Tratamentos Capilares', desc:'Hidratação profunda, queratina, botox capilar e outros tratamentos regeneradores.',                      price:35 },
  { id:'noiva',     icon:'👰', name:'Penteados Noiva',       desc:'Penteados especiais para o seu dia mais especial, com sessão de teste incluída.',                        price:80 },
  { id:'massagem',  icon:'💆', name:'Massagem Capilar',      desc:'Relaxamento do couro cabeludo com óleos essenciais que estimulam o crescimento.',                        price:20 },
  { id:'barba',     icon:'🪒', name:'Barba & Bigode',        desc:'Aparar, modelar e cuidar da barba com produtos premium para um acabamento perfeito.',                    price:12 },
];

function getServices() {
  try {
    const stored = localStorage.getItem('cm_services');
    return stored ? JSON.parse(stored) : DEFAULT_SERVICES;
  } catch { return DEFAULT_SERVICES; }
}

function renderServicesList() {
  const services = getServices();
  document.getElementById('servicesList').innerHTML = services.map((s, i) => `
    <div class="svc-edit-card">
      <div class="svc-edit-icon">
        <input type="text" class="svc-icon-input" data-i="${i}" data-field="icon" value="${s.icon}" maxlength="4">
      </div>
      <div class="svc-edit-fields">
        <div class="svc-field-row">
          <div class="sfield">
            <label class="sfield-label">Nome</label>
            <input type="text" class="sfield-input" data-i="${i}" data-field="name" value="${s.name}">
          </div>
          <div class="sfield sfield--price">
            <label class="sfield-label">Preço a partir de (€)</label>
            <input type="number" class="sfield-input" data-i="${i}" data-field="price" value="${s.price}" min="0" step="1">
          </div>
        </div>
        <div class="sfield">
          <label class="sfield-label">Descrição</label>
          <textarea class="sfield-input" data-i="${i}" data-field="desc" rows="2">${s.desc}</textarea>
        </div>
      </div>
    </div>`).join('');
}

function saveServices() {
  const services = getServices();
  document.querySelectorAll('#servicesList [data-i]').forEach(el => {
    const i = parseInt(el.dataset.i);
    const field = el.dataset.field;
    services[i][field] = field === 'price' ? parseFloat(el.value) || 0 : el.value;
  });
  localStorage.setItem('cm_services', JSON.stringify(services));
  showToast('Guardado!', 'Serviços atualizados com sucesso.');
}

/* ── DEFINIÇÕES ──────────────────────────────────────────── */
function initSettings() {
  const user = sessionStorage.getItem('admin_user') || '';
  const el = document.getElementById('settingsCurrentUser');
  if (el) el.textContent = user.charAt(0).toUpperCase() + user.slice(1);
  ['settingsNewUser','settingsNewPass','settingsConfirmPass'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('settingsError').style.display = 'none';
  document.getElementById('settingsSuccess').style.display = 'none';
}

async function saveSettings() {
  const currentUser = sessionStorage.getItem('admin_user') || '';
  const newUser     = document.getElementById('settingsNewUser').value.trim().toLowerCase();
  const newPass     = document.getElementById('settingsNewPass').value;
  const confirmPass = document.getElementById('settingsConfirmPass').value;
  const errEl = document.getElementById('settingsError');
  const okEl  = document.getElementById('settingsSuccess');
  errEl.style.display = 'none'; okEl.style.display = 'none';

  if (!newUser && !newPass) {
    errEl.textContent = 'Preencha pelo menos um campo para alterar.';
    errEl.style.display = 'block'; return;
  }
  if (newPass && newPass !== confirmPass) {
    errEl.textContent = 'As passwords não coincidem.';
    errEl.style.display = 'block'; return;
  }
  if (newPass && newPass.length < 6) {
    errEl.textContent = 'A password deve ter pelo menos 6 caracteres.';
    errEl.style.display = 'block'; return;
  }

  const btn = document.querySelector('#page-settings .settings-btn');
  btn.textContent = 'A guardar...'; btn.disabled = true;

  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/update_admin_credentials', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_current_username: currentUser,
        p_new_username: newUser || currentUser,
        p_new_password: newPass || null
      })
    });
    const ok = await res.json();
    if (!ok) throw new Error('Utilizador não encontrado.');

    const finalUser = newUser || currentUser;
    sessionStorage.setItem('admin_user', finalUser);
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    document.getElementById('sidebarUser').textContent = cap(finalUser);
    document.getElementById('settingsCurrentUser').textContent = cap(finalUser);
    const mu = document.getElementById('mobileUser'); if (mu) mu.textContent = cap(finalUser);
    ['settingsNewUser','settingsNewPass','settingsConfirmPass'].forEach(id => document.getElementById(id).value = '');
    okEl.style.display = 'block';
    setTimeout(() => okEl.style.display = 'none', 4000);
  } catch (err) {
    errEl.textContent = err.message || 'Erro ao guardar. Tente novamente.';
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'Guardar Alterações'; btn.disabled = false;
  }
}
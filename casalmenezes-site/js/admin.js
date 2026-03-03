/* ============================================================
   CASAL MENEZES HAIR SHOP — admin.js
   Lógica do painel de administração
   ============================================================ */

// ── DADOS MOCK ────────────────────────────────────────────
// Substituir por: const { data: BOOKINGS } = await supabase.from('bookings').select('*')
let BOOKINGS = [
  { id:'b001', first_name:'Maria',  last_name:'Silva',     phone:'912345678', email:'maria@exemplo.com',  service:'coloracao', stylist:'ana',  date:'2025-08-18', time:'10:00', status:'confirmed', notes:'Quer mechas loiras' },
  { id:'b002', first_name:'Maria',  last_name:'Silva',     phone:'912345678', email:'maria@exemplo.com',  service:'corte',     stylist:'joao', date:'2025-08-20', time:'14:30', status:'pending',   notes:'Corte curto' },
  { id:'b003', first_name:'João',   last_name:'Costa',     phone:'965432100', email:'',                   service:'barba',     stylist:'joao', date:'2025-08-14', time:'11:00', status:'cancelled', notes:'' },
  { id:'b004', first_name:'Ana',    last_name:'Pereira',   phone:'933001122', email:'ana.p@email.com',    service:'tratamento',stylist:'ana',  date:'2025-08-18', time:'15:00', status:'pending',   notes:'' },
  { id:'b005', first_name:'Carlos', last_name:'Ferreira',  phone:'961223344', email:'',                   service:'corte',     stylist:'joao', date:'2025-08-19', time:'09:30', status:'confirmed', notes:'Franja curta' },
  { id:'b006', first_name:'Sofia',  last_name:'Rodrigues', phone:'912998877', email:'sofia@email.com',    service:'noiva',     stylist:'ana',  date:'2025-09-05', time:'10:00', status:'confirmed', notes:'Casamento dia 6 set' },
];

const SVC          = { corte:'Corte & Styling', coloracao:'Coloração', tratamento:'Tratamentos', noiva:'Noiva', massagem:'Massagem', barba:'Barba' };
const STL          = { ana:'Ana Menezes', joao:'João Menezes', '':'Sem preferência' };
const MONTHS_PT    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS_PT      = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

// Credenciais — em produção usar Supabase Auth
const CREDENTIALS = { admin: 'menezes2025' };

let calYear, calMonth;

// ── LOGIN ─────────────────────────────────────────────────
function doLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;

  if (CREDENTIALS[user] && CREDENTIALS[user] === pass) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').classList.add('show');
    initApp();
  } else {
    document.getElementById('loginError').classList.add('show');
  }
}

function doLogout() {
  document.getElementById('app').classList.remove('show');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginPass').value = '';
}

// ── INICIALIZAÇÃO ─────────────────────────────────────────
function initApp() {
  const now = new Date();
  document.getElementById('todayDate').textContent =
    `${DAYS_PT[now.getDay()]}, ${now.getDate()} de ${MONTHS_PT[now.getMonth()]} de ${now.getFullYear()}`;

  updateKPIs();
  renderTodayTable();
  renderBookingsTable();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  renderCalendar();
}

// ── KPIs ──────────────────────────────────────────────────
function updateKPIs() {
  const today = new Date().toISOString().split('T')[0];
  const now   = new Date();

  const todayBookings  = BOOKINGS.filter(b => b.date === today && b.status !== 'cancelled');
  const pending        = BOOKINGS.filter(b => b.status === 'pending');

  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const weekConfirmed = BOOKINGS.filter(b => {
    const d = new Date(b.date);
    return d >= weekStart && d <= weekEnd && b.status === 'confirmed';
  });

  document.getElementById('kpiToday').textContent   = todayBookings.length;
  document.getElementById('kpiPending').textContent  = pending.length;
  document.getElementById('kpiWeek').textContent     = weekConfirmed.length;
  document.getElementById('kpiTotal').textContent    = BOOKINGS.length;
}

// ── TABELA DE HOJE ────────────────────────────────────────
function renderTodayTable() {
  const today    = new Date().toISOString().split('T')[0];
  const todayB   = BOOKINGS.filter(b => b.date === today && b.status !== 'cancelled');
  // Para demo, se não houver marcações hoje, mostrar as mais recentes
  const displayB = todayB.length ? todayB : BOOKINGS.filter(b => b.status !== 'cancelled').slice(0, 3);

  const el = document.getElementById('todayTable');
  if (!displayB.length) {
    el.innerHTML = `<div class="table-empty"><div class="big">🌅</div>Sem marcações para hoje</div>`;
    return;
  }

  el.innerHTML = `<table><thead><tr>
    <th>Cliente</th><th>Serviço</th><th>Hora</th><th>Profissional</th><th>Estado</th>
  </tr></thead><tbody>
    ${displayB.sort((a,b) => a.time.localeCompare(b.time)).map(b => `
    <tr onclick="openDrawer('${b.id}')" style="cursor:pointer">
      <td><div class="td-name">${b.first_name} ${b.last_name}</div><div class="td-muted">${b.phone}</div></td>
      <td><span class="td-service">${SVC[b.service] || b.service}</span></td>
      <td>${b.time}</td>
      <td>${STL[b.stylist] || b.stylist}</td>
      <td><span class="badge badge-${b.status}">${{pending:'Pendente',confirmed:'Confirmado',cancelled:'Cancelado'}[b.status]}</span></td>
    </tr>`).join('')}
  </tbody></table>`;
}

// ── TABELA COMPLETA COM FILTROS ───────────────────────────
function renderBookingsTable() {
  const search  = document.getElementById('filterSearch').value.toLowerCase();
  const status  = document.getElementById('filterStatus').value;
  const service = document.getElementById('filterService').value;

  let filtered = BOOKINGS.filter(b => {
    const name = `${b.first_name} ${b.last_name} ${b.phone}`.toLowerCase();
    return (!search  || name.includes(search))
        && (!status  || b.status  === status)
        && (!service || b.service === service);
  }).sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));

  const tbody = document.getElementById('bookingsTableBody');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="table-empty"><div class="big">🔍</div>Sem resultados</div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => {
    const d      = new Date(b.date + 'T12:00');
    const isPast = d < new Date();
    const canAct = b.status !== 'cancelled' && !isPast;

    return `<tr onclick="openDrawer('${b.id}')" style="cursor:pointer">
      <td>
        <div class="td-name">${b.first_name} ${b.last_name}</div>
        <div class="td-muted">${b.phone}${b.email ? ` · ${b.email}` : ''}</div>
      </td>
      <td><span class="td-service">${SVC[b.service] || b.service}</span></td>
      <td>
        <div class="td-name">${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}</div>
        <div class="td-muted">${b.time}</div>
      </td>
      <td>${STL[b.stylist] || b.stylist}</td>
      <td><span class="badge badge-${b.status}">${{pending:'Pendente',confirmed:'Confirmado',cancelled:'Cancelado'}[b.status]}</span></td>
      <td onclick="event.stopPropagation()">
        <div class="action-btns">
          ${canAct && b.status !== 'confirmed' ? `<button class="btn-action btn-confirm" onclick="changeStatus('${b.id}','confirmed')">✓ Confirmar</button>` : ''}
          ${canAct ? `<button class="btn-action btn-cancel-row" onclick="changeStatus('${b.id}','cancelled')">✕</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── ALTERAR ESTADO ────────────────────────────────────────
async function changeStatus(id, newStatus) {
  // ── SUPABASE ─────────────────────────────────────────────
  // await supabase.from('bookings').update({ status: newStatus }).eq('id', id);
  // ─────────────────────────────────────────────────────────

  const b = BOOKINGS.find(x => x.id === id);
  if (!b) return;
  b.status = newStatus;

  updateKPIs();
  renderTodayTable();
  renderBookingsTable();

  const msgs = { confirmed: 'Marcação confirmada!', cancelled: 'Marcação cancelada.' };
  showToast(msgs[newStatus] || 'Atualizado', `${b.first_name} ${b.last_name} – ${b.time}`);

  // Atualizar drawer se estiver aberto
  if (document.getElementById('drawerOverlay').classList.contains('open')) openDrawer(id);
}

// ── DRAWER DE DETALHE ─────────────────────────────────────
function openDrawer(id) {
  const b = BOOKINGS.find(x => x.id === id);
  if (!b) return;

  const d      = new Date(b.date + 'T12:00');
  const isPast = d < new Date();
  const canAct = b.status !== 'cancelled' && !isPast;
  const statusLabel = { pending:'Pendente', confirmed:'Confirmado', cancelled:'Cancelado' }[b.status] || b.status;

  document.getElementById('drawerContent').innerHTML = `
    <h2>${b.first_name} ${b.last_name}</h2>
    <span class="badge badge-${b.status}" style="margin-top:8px;display:inline-flex">${statusLabel}</span>
    <div class="drawer-section">
      <h4>Detalhes do Serviço</h4>
      <div class="drawer-row"><span class="lbl">Serviço</span>    <span>${SVC[b.service] || b.service}</span></div>
      <div class="drawer-row"><span class="lbl">Data</span>       <span>${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}</span></div>
      <div class="drawer-row"><span class="lbl">Hora</span>       <span>${b.time}</span></div>
      <div class="drawer-row"><span class="lbl">Profissional</span><span>${STL[b.stylist] || b.stylist}</span></div>
    </div>
    <div class="drawer-section">
      <h4>Contacto do Cliente</h4>
      <div class="drawer-row"><span class="lbl">Telemóvel</span><span>${b.phone}</span></div>
      ${b.email ? `<div class="drawer-row"><span class="lbl">Email</span><span>${b.email}</span></div>` : ''}
    </div>
    ${b.notes ? `<div class="drawer-section"><h4>Observações</h4><p style="font-size:.85rem;color:var(--warm-gray);line-height:1.6;font-weight:300">${b.notes}</p></div>` : ''}
    <div class="drawer-actions">
      ${canAct && b.status !== 'confirmed' ? `<button class="btn-drawer-confirm" onclick="changeStatus('${b.id}','confirmed')">✓ Confirmar Marcação</button>` : ''}
      ${canAct ? `<button class="btn-drawer-cancel" onclick="changeStatus('${b.id}','cancelled')">✕ Cancelar Marcação</button>` : ''}
    </div>`;

  document.getElementById('drawerOverlay').classList.add('open');
}

function closeDrawer(e) {
  if (e && e.target !== document.getElementById('drawerOverlay')) return;
  document.getElementById('drawerOverlay').classList.remove('open');
}

// ── CALENDÁRIO ────────────────────────────────────────────
function renderCalendar() {
  document.getElementById('calTitle').textContent = `${MONTHS_PT[calMonth]} ${calYear}`;

  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrev  = new Date(calYear, calMonth, 0).getDate();
  const today       = new Date().toISOString().split('T')[0];

  let html = '';
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    let dayNum, thisMonth = true, dateStr;

    if      (i < firstDay)                   { dayNum = daysInPrev - firstDay + i + 1; thisMonth = false; }
    else if (i >= firstDay + daysInMonth)    { dayNum = i - firstDay - daysInMonth + 1; thisMonth = false; }
    else                                     { dayNum = i - firstDay + 1; }

    if (thisMonth) {
      const m = String(calMonth + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      dateStr = `${calYear}-${m}-${d}`;
    }

    const isToday     = dateStr === today;
    const dayBookings = dateStr ? BOOKINGS.filter(b => b.date === dateStr) : [];

    html += `<div class="cal-day${!thisMonth ? ' other-month' : ''}${isToday ? ' today' : ''}">
      <div class="cal-day-num">${dayNum}</div>
      ${dayBookings.slice(0, 3).map(b => `
        <div class="cal-event ${b.status}" onclick="openDrawer('${b.id}')" title="${b.first_name} ${b.last_name}">
          ${b.time} ${b.first_name}
        </div>`).join('')}
      ${dayBookings.length > 3 ? `<div class="cal-event" style="background:rgba(0,0,0,0.06);color:#888">+${dayBookings.length - 3} mais</div>` : ''}
    </div>`;
  }
  document.getElementById('calDays').innerHTML = html;
}

function changeMonth(dir) {
  calMonth += dir;
  if      (calMonth > 11) { calMonth = 0;  calYear++; }
  else if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

// ── NAVEGAÇÃO SIDEBAR ─────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  event.currentTarget.classList.add('active');
}

// ── TOAST ─────────────────────────────────────────────────
function showToast(title, msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent   = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

// ── EVENTOS ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
});

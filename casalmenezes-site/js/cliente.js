/* ============================================================
   CASAL MENEZES HAIR SHOP — cliente.js
   ============================================================ */

const SERVICE_NAMES = { corte:'Corte & Styling', coloracao:'Coloração', tratamento:'Tratamentos Capilares', noiva:'Penteados Noiva', massagem:'Massagem Capilar', barba:'Barba & Bigode' };
const STYLIST_NAMES = { ana:'Ana Menezes', anderson:'Anderson Menezes', '':'Sem preferência' };
const MONTHS_SHORT  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS_PT       = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const MONTHS_PT2    = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

const SLOTS_WEEKDAY  = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30'];
const SLOTS_SATURDAY = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30'];

let cancelTargetId    = null;
let rescheduleId      = null;
let rescheduleNewTime = null;

function normalizePhone(phone) {
  return phone.trim().replace(/\s+/g, '').replace(/^(\+351|00351)/, '');
}

async function searchBookings() {
  const phone = normalizePhone(document.getElementById('searchPhone').value);
  const email = document.getElementById('searchEmail').value.trim().toLowerCase();

  if (!phone || !email) {
    showToast('Campos em falta', 'Por favor introduza o telemóvel e o email.', true);
    return;
  }
  if (!/^[29]\d{8}$/.test(phone)) {
    showToast('Telemóvel inválido', 'Introduza um número português válido (ex: 912 345 678).', true);
    return;
  }

  const btn = document.getElementById('searchBtn');
  btn.disabled = true; btn.textContent = 'A pesquisar...';

  try {
    // Buscar por telemóvel E email — ambos têm de corresponder à mesma marcação
    const results = await db.select('bookings', {
      filters: [
        ['phone', 'eq', phone],
        ['email', 'eq', email]
      ],
      order: 'date.asc'
    });

    if (results.length === 0) {
      // Verificar se o telemóvel existe mas o email não bate certo — para dar mensagem mais clara
      const byPhone = await db.select('bookings', { filters: [['phone', 'eq', phone]] });
      if (byPhone.length > 0) {
        showToast('Dados incorretos', 'O email não corresponde ao telemóvel introduzido.', true);
      } else {
        renderResults([], phone);
      }
    } else {
      renderResults(results, phone);
    }
  } catch (err) {
    console.error(err);
    showToast('Erro', 'Não foi possível pesquisar. Tente novamente.', true);
  }

  btn.disabled = false; btn.textContent = 'Ver as Minhas Marcações';
}

function renderResults(bookings, query) {
  document.getElementById('searchSection').style.display = 'none';
  document.getElementById('resultsSection').classList.add('show');
  document.getElementById('resultsTitle').textContent = `As suas marcações`;
  document.getElementById('resultsCount').textContent =
    bookings.length === 0 ? 'Nenhuma marcação encontrada' :
    bookings.length === 1 ? '1 marcação encontrada' :
    `${bookings.length} marcações encontradas`;

  const list  = document.getElementById('bookingsList');
  const empty = document.getElementById('emptyState');
  list.innerHTML = '';

  if (!bookings.length) { empty.classList.add('show'); return; }
  empty.classList.remove('show');

  bookings.forEach(b => {
    const d = new Date(b.date + 'T12:00');
    const isPast = d < new Date();
    const canCancel = b.status !== 'cancelled' && !isPast;
    const statusLabel = { pending:'Pendente', confirmed:'Confirmado', cancelled:'Cancelado' }[b.status] || b.status;

    list.innerHTML += `
      <div class="booking-card" id="card-${b.id}">
        <div class="booking-date-block">
          <div class="booking-day">${d.getDate()}</div>
          <div class="booking-month">${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}</div>
        </div>
        <div class="booking-info">
          <h4>${SERVICE_NAMES[b.service] || b.service}</h4>
          <div class="booking-meta">
            <span>🕐 ${b.time}</span>
            <span>💇 ${STYLIST_NAMES[b.stylist] || 'Sem preferência'}</span>
            ${b.notes ? `<span>📝 ${b.notes}</span>` : ''}
            ${isPast ? '<span style="color:#999">Marcação passada</span>' : ''}
          </div>
        </div>
        <div class="booking-actions">
          <span class="badge badge-${b.status}">${statusLabel}</span>
          ${canCancel ? `<button class="btn-reschedule" onclick="openRescheduleModal('${b.id}','${b.stylist||''}')">Reagendar</button>` : ''}
          ${canCancel ? `<button class="btn-cancel" onclick="openCancelModal('${b.id}')">Cancelar</button>` : ''}
        </div>
      </div>`;
  });
}

function resetSearch() {
  document.getElementById('searchSection').style.display = 'flex';
  document.getElementById('resultsSection').classList.remove('show');
  document.getElementById('emptyState').classList.remove('show');
  document.getElementById('searchPhone').value = '';
  document.getElementById('searchEmail').value = '';
}

function openRescheduleModal(id, currentStylist) {
  rescheduleId = id;
  rescheduleNewTime = null;
  const dateInput = document.getElementById('rescheduleDate');
  dateInput.value = '';
  dateInput.min = new Date().toISOString().split('T')[0];
  document.getElementById('rescheduleStylist').value = currentStylist || '';
  document.getElementById('rescheduleTime').value = '';
  document.getElementById('rescheduleSlotsLabel').textContent = '';
  document.getElementById('rescheduleSlots').innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--warm-gray);font-size:0.85rem;">Escolha primeiro uma data acima</div>`;
  document.getElementById('rescheduleConfirmBtn').disabled = true;
  document.getElementById('rescheduleModal').classList.add('open');
}
function closeRescheduleModal() {
  document.getElementById('rescheduleModal').classList.remove('open');
  rescheduleId = null; rescheduleNewTime = null;
}

async function onRescheduleDateChange() {
  const date = document.getElementById('rescheduleDate').value;
  if (!date) return;
  const d = new Date(date + 'T12:00');
  if (d.getDay() === 0) {
    showToast('Domingo fechado', 'Estamos fechados ao domingo. Escolha outro dia.', true);
    document.getElementById('rescheduleDate').value = '';
    document.getElementById('rescheduleSlots').innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--warm-gray);font-size:0.85rem;">Escolha primeiro uma data acima</div>`;
    return;
  }
  document.getElementById('rescheduleSlotsLabel').textContent = `— ${DAYS_PT[d.getDay()]}, ${d.getDate()} ${MONTHS_PT2[d.getMonth()]}`;
  document.getElementById('rescheduleSlots').innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:16px;display:flex;align-items:center;justify-content:center;gap:10px;color:var(--warm-gray);"><div class="spinner" style="border-color:rgba(0,0,0,0.1);border-top-color:var(--gold)"></div> A verificar disponibilidade...</div>`;
  rescheduleNewTime = null;
  document.getElementById('rescheduleTime').value = '';
  document.getElementById('rescheduleConfirmBtn').disabled = true;

  let occupied = [];
  try {
    const stylist = document.getElementById('rescheduleStylist').value;
    const filters = [['date','eq',date],['status','neq','cancelled']];
    if (rescheduleId) filters.push(['id','neq',rescheduleId]);
    if (stylist) filters.push(['stylist','eq',stylist]);
    const data = await db.select('bookings', { select: 'time', filters });
    occupied = data.map(b => b.time);
  } catch (e) { console.warn('reschedule slots:', e); }

  const today = new Date();
  const isToday = date === today.toISOString().split('T')[0];
  const slots = d.getDay() === 6 ? SLOTS_SATURDAY : SLOTS_WEEKDAY;
  renderRescheduleSlots(slots, occupied, isToday ? today : null);
}

function renderRescheduleSlots(slots, occupied, now) {
  const container = document.getElementById('rescheduleSlots');
  container.innerHTML = slots.map(time => {
    if (now) {
      const [h, m] = time.split(':').map(Number);
      if (h * 60 + m <= now.getHours() * 60 + now.getMinutes())
        return `<div class="slot occupied"><span class="slot-time">${time}</span><span class="slot-label">Passado</span></div>`;
    }
    if (occupied.includes(time))
      return `<div class="slot occupied"><span class="slot-time">${time}</span><span class="slot-label">Ocupado</span></div>`;
    const sel = time === rescheduleNewTime;
    return `<div class="slot available${sel?' selected':''}" onclick="selectRescheduleSlot(this,'${time}')"><span class="slot-time">${time}</span><span class="slot-label">${sel?'Selecionado':'Livre'}</span></div>`;
  }).join('');
}

function selectRescheduleSlot(el, time) {
  document.querySelectorAll('#rescheduleSlots .slot.available').forEach(s => {
    s.classList.remove('selected');
    s.querySelector('.slot-label').textContent = 'Livre';
  });
  el.classList.add('selected');
  el.querySelector('.slot-label').textContent = 'Selecionado';
  rescheduleNewTime = time;
  document.getElementById('rescheduleTime').value = time;
  document.getElementById('rescheduleConfirmBtn').disabled = false;
}

async function confirmReschedule() {
  const date = document.getElementById('rescheduleDate').value;
  if (!rescheduleId || !date || !rescheduleNewTime) return;
  const btn = document.getElementById('rescheduleConfirmBtn');
  btn.disabled = true; btn.textContent = 'A guardar...';
  try {
    await db.update('bookings', { date, time: rescheduleNewTime }, [['id','eq',rescheduleId]]);
    closeRescheduleModal();
    showToast('Reagendado!', `Nova marcação: ${date} às ${rescheduleNewTime}`);
    // Atualizar card visualmente
    const card = document.getElementById('card-' + rescheduleId);
    if (card) {
      const d = new Date(date + 'T12:00');
      card.querySelector('.booking-day').textContent  = d.getDate();
      card.querySelector('.booking-month').textContent = `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
      const timeSpan = card.querySelector('.booking-meta span');
      if (timeSpan) timeSpan.textContent = `🕐 ${rescheduleNewTime}`;
    }
  } catch (err) {
    showToast('Erro', 'Não foi possível reagendar. Tente novamente.', true);
    btn.disabled = false; btn.textContent = 'Confirmar';
  }
}

function openCancelModal(id) {
  cancelTargetId = id;
  document.getElementById('cancelModal').classList.add('open');
}
function closeModal() {
  document.getElementById('cancelModal').classList.remove('open');
  cancelTargetId = null;
}

async function confirmCancel() {
  if (!cancelTargetId) return;
  const idToCancel = cancelTargetId;
  closeModal();

  try {
    await db.update('bookings', { status: 'cancelled' }, [['id', 'eq', idToCancel]]);
    const card = document.getElementById('card-' + idToCancel);
    if (card) {
      card.querySelector('.badge').className = 'badge badge-cancelled';
      card.querySelector('.badge').textContent = 'Cancelado';
      const btn = card.querySelector('.btn-cancel');
      if (btn) btn.remove();
    }
    showToast('Marcação cancelada', 'A sua marcação foi cancelada com sucesso.');
  } catch (err) {
    console.error(err);
    showToast('Erro', 'Não foi possível cancelar. Tente novamente.', true);
  }
}

function showToast(title, msg, isError = false) {
  const t = document.getElementById('toast');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent = msg;
  t.style.borderColor = isError ? '#e05c5c' : 'var(--gold)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cancelModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('rescheduleModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeRescheduleModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchBookings();
    if (e.key === 'Escape') { closeModal(); closeRescheduleModal(); }
  });
});
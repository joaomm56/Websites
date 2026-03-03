/* ============================================================
   CASAL MENEZES HAIR SHOP — booking.js
   Lógica de slots de horário, validação e submissão
   ============================================================ */

// ── CONFIG ────────────────────────────────────────────────
const SLOTS_WEEKDAY  = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30'];
const SLOTS_SATURDAY = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30'];

// Mock de slots ocupados — substituir por chamada Supabase
// Formato: { 'YYYY-MM-DD': ['HH:MM', ...] }
const BOOKED_SLOTS = {
  '2025-08-18': ['09:00', '10:00', '15:00'],
  '2025-08-19': ['09:30', '11:00', '14:00', '14:30'],
  '2025-08-20': ['10:00', '10:30', '14:30'],
};

let selectedTime = null;

// ── INICIALIZAÇÃO ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Data mínima = hoje
  const dateInput = document.getElementById('bookDate');
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  dateInput.min = `${yyyy}-${mm}-${dd}`;

  // Reagir a mudança de data e de profissional
  dateInput.addEventListener('change', onDateOrStylistChange);
  document.getElementById('stylist').addEventListener('change', onDateOrStylistChange);

  // Scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
});

// ── MUDANÇA DE DATA / PROFISSIONAL ────────────────────────
async function onDateOrStylistChange() {
  const date = document.getElementById('bookDate').value;
  if (!date) return;

  const d = new Date(date + 'T12:00');

  // Bloquear domingos
  if (d.getDay() === 0) {
    showToast('Atenção', 'Estamos fechados ao domingo. Por favor escolha outro dia.', true);
    document.getElementById('bookDate').value = '';
    clearSlots();
    return;
  }

  // Mostrar loading
  const container = document.getElementById('timeslots');
  container.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:20px;color:rgba(245,240,232,0.3);font-size:0.8rem;display:flex;align-items:center;justify-content:center;gap:10px;">
      <div class="spinner"></div> A verificar disponibilidade...
    </div>`;
  document.getElementById('slotsHint').classList.remove('show');

  // Atualizar label da data
  const DAYS_PT   = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const MONTHS_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  document.getElementById('slotsDateLabel').textContent =
    `— ${DAYS_PT[d.getDay()]}, ${d.getDate()} ${MONTHS_PT[d.getMonth()]}`;

  // ── SUPABASE (substituir simulação abaixo) ──────────────
  // const stylist = document.getElementById('stylist').value;
  // let query = supabase
  //   .from('bookings')
  //   .select('time')
  //   .eq('date', date)
  //   .neq('status', 'cancelled');
  // if (stylist) query = query.eq('stylist', stylist);
  // const { data, error } = await query;
  // const occupiedTimes = data ? data.map(b => b.time) : [];
  // ───────────────────────────────────────────────────────

  // Simulação de rede (remover quando ligar Supabase)
  await new Promise(r => setTimeout(r, 500));
  const occupiedTimes = BOOKED_SLOTS[date] || [];

  const slots = d.getDay() === 6 ? SLOTS_SATURDAY : SLOTS_WEEKDAY;
  renderSlots(slots, occupiedTimes);
}

// ── RENDERIZAR SLOTS ──────────────────────────────────────
function renderSlots(slots, occupiedTimes) {
  const container = document.getElementById('timeslots');

  // Se o horário selecionado ficou ocupado, limpar
  if (selectedTime && occupiedTimes.includes(selectedTime)) {
    selectedTime = null;
    document.getElementById('selectedTime').value = '';
  }

  container.innerHTML = slots.map(time => {
    const isOccupied = occupiedTimes.includes(time);
    if (isOccupied) {
      return `<div class="slot occupied" title="Este horário já está ocupado">
        <span class="slot-time">${time}</span>
        <span class="slot-label">Ocupado</span>
      </div>`;
    }
    const isSelected = time === selectedTime;
    return `<div class="slot available${isSelected ? ' selected' : ''}" data-time="${time}" onclick="selectSlot(this, '${time}')">
      <span class="slot-time">${time}</span>
      <span class="slot-label">${isSelected ? 'Selecionado' : 'Livre'}</span>
    </div>`;
  }).join('');

  document.getElementById('slotsHint').classList.add('show');

  const availableCount = slots.filter(t => !occupiedTimes.includes(t)).length;
  if (availableCount === 0) {
    container.innerHTML += `<div style="grid-column:1/-1;text-align:center;padding:12px;color:rgba(245,240,232,0.35);font-size:0.78rem;">
      Sem horários disponíveis neste dia. Por favor escolha outra data.
    </div>`;
  }
}

// ── SELECIONAR SLOT ───────────────────────────────────────
function selectSlot(el, time) {
  document.querySelectorAll('.slot.available').forEach(s => {
    s.classList.remove('selected');
    s.querySelector('.slot-label').textContent = 'Livre';
  });
  el.classList.add('selected');
  el.querySelector('.slot-label').textContent = 'Selecionado';
  selectedTime = time;
  document.getElementById('selectedTime').value = time;
}

// ── LIMPAR SLOTS ──────────────────────────────────────────
function clearSlots() {
  document.getElementById('timeslots').innerHTML = `
    <div id="slotsPlaceholder" style="grid-column:1/-1;text-align:center;padding:24px 10px;color:rgba(245,240,232,0.2);font-size:0.8rem;letter-spacing:0.08em;">
      Escolha primeiro uma data acima
    </div>`;
  document.getElementById('slotsHint').classList.remove('show');
  document.getElementById('slotsDateLabel').textContent = '';
  selectedTime = null;
  document.getElementById('selectedTime').value = '';
}

// ── VALIDAÇÃO ─────────────────────────────────────────────
function validateForm() {
  const fname   = document.getElementById('fname').value.trim();
  const lname   = document.getElementById('lname').value.trim();
  const phone   = document.getElementById('phone').value.trim();
  const service = document.getElementById('service').value;
  const date    = document.getElementById('bookDate').value;

  if (!fname || !lname || !phone || !service || !date || !selectedTime) {
    showToast('Campos em falta', 'Por favor preencha todos os campos obrigatórios (*).', true);
    return false;
  }
  return true;
}

// ── SUBMETER MARCAÇÃO ─────────────────────────────────────
async function submitBooking() {
  if (!validateForm()) return;

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'A enviar...';

  const booking = {
    first_name: document.getElementById('fname').value.trim(),
    last_name:  document.getElementById('lname').value.trim(),
    phone:      document.getElementById('phone').value.trim(),
    email:      document.getElementById('email').value.trim(),
    service:    document.getElementById('service').value,
    stylist:    document.getElementById('stylist').value,
    date:       document.getElementById('bookDate').value,
    time:       selectedTime,
    notes:      document.getElementById('notes').value.trim(),
    status:     'pending',
    created_at: new Date().toISOString()
  };

  // ── SUPABASE (substituir simulação abaixo) ──────────────
  // const { error } = await supabase.from('bookings').insert(booking);
  // if (error) { showToast('Erro', 'Não foi possível guardar. Tente novamente.', true); btn.disabled = false; btn.textContent = 'Confirmar Marcação'; return; }
  // ───────────────────────────────────────────────────────

  console.log('📅 Booking pronto para Supabase:', booking);

  // Marcar slot como ocupado localmente
  if (!BOOKED_SLOTS[booking.date]) BOOKED_SLOTS[booking.date] = [];
  BOOKED_SLOTS[booking.date].push(booking.time);

  await new Promise(r => setTimeout(r, 800));

  document.getElementById('formContent').style.display = 'none';
  document.getElementById('successMsg').classList.add('show');
  showToast('✅ Confirmado!', `Marcação para ${booking.date} às ${booking.time}`);
  btn.disabled = false;
}

// ── RESETAR FORMULÁRIO ────────────────────────────────────
function resetForm() {
  document.getElementById('formContent').style.display = 'block';
  document.getElementById('successMsg').classList.remove('show');
  document.querySelectorAll('input[type=text], input[type=tel], input[type=email], input[type=date], select, textarea')
    .forEach(el => el.value = '');
  clearSlots();
}

// ── TOAST ─────────────────────────────────────────────────
function showToast(title, msg, isError = false) {
  const t = document.getElementById('toast');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent   = msg;
  t.style.borderColor = isError ? '#e05c5c' : 'var(--gold)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

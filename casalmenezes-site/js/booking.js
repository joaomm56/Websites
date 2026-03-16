/* ============================================================
   CASAL MENEZES HAIR SHOP — booking.js
   ============================================================ */

const SLOTS_WEEKDAY  = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30'];
const SLOTS_SATURDAY = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30'];

let selectedTime = null;

document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('bookDate');
  dateInput.min = new Date().toISOString().split('T')[0];
  dateInput.addEventListener('change', onDateOrStylistChange);
  document.getElementById('stylist').addEventListener('change', onDateOrStylistChange);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
});

async function onDateOrStylistChange() {
  const date = document.getElementById('bookDate').value;
  if (!date) return;

  const d = new Date(date + 'T12:00');
  if (d.getDay() === 0) {
    showToast('Atenção', 'Estamos fechados ao domingo. Por favor escolha outro dia.', true);
    document.getElementById('bookDate').value = '';
    clearSlots();
    return;
  }

  document.getElementById('timeslots').innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:20px;color:rgba(245,240,232,0.3);font-size:0.8rem;display:flex;align-items:center;justify-content:center;gap:10px;">
      <div class="spinner"></div> A verificar disponibilidade...
    </div>`;
  document.getElementById('slotsHint').classList.remove('show');

  const DAYS_PT   = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const MONTHS_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  document.getElementById('slotsDateLabel').textContent =
    `— ${DAYS_PT[d.getDay()]}, ${d.getDate()} ${MONTHS_PT[d.getMonth()]}`;

  let occupiedTimes = [];
  try {
    const stylist = document.getElementById('stylist').value;
    const filters = [
      ['date', 'eq', date],
      ['status', 'neq', 'cancelled']
    ];
    if (stylist) filters.push(['stylist', 'eq', stylist]);

    const data = await db.select('bookings', { select: 'time', filters });
    occupiedTimes = data.map(b => b.time);
  } catch (err) {
    console.warn('Slots: erro ao obter ocupados, mostrar todos livres:', err.message);
  }

  // Se for hoje, filtrar slots já passados
  const today = new Date();
  const isToday = date === today.toISOString().split('T')[0];
  renderSlots(d.getDay() === 6 ? SLOTS_SATURDAY : SLOTS_WEEKDAY, occupiedTimes, isToday ? today : null);
}

function renderSlots(slots, occupiedTimes, now = null) {
  const container = document.getElementById('timeslots');
  if (selectedTime && occupiedTimes.includes(selectedTime)) {
    selectedTime = null;
    document.getElementById('selectedTime').value = '';
  }
  container.innerHTML = slots.map(time => {
    // Verificar se o slot já passou (só para hoje)
    if (now) {
      const [h, m] = time.split(':').map(Number);
      const slotMinutes = h * 60 + m;
      const nowMinutes  = now.getHours() * 60 + now.getMinutes();
      if (slotMinutes <= nowMinutes) {
        return `<div class="slot occupied">
          <span class="slot-time">${time}</span>
          <span class="slot-label">Passado</span>
        </div>`;
      }
    }
    if (occupiedTimes.includes(time)) {
      return `<div class="slot occupied">
        <span class="slot-time">${time}</span>
        <span class="slot-label">Ocupado</span>
      </div>`;
    }
    const sel = time === selectedTime;
    return `<div class="slot available${sel ? ' selected' : ''}" onclick="selectSlot(this,'${time}')">
      <span class="slot-time">${time}</span>
      <span class="slot-label">${sel ? 'Selecionado' : 'Livre'}</span>
    </div>`;
  }).join('');
  document.getElementById('slotsHint').classList.add('show');
}

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

function clearSlots() {
  document.getElementById('timeslots').innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:24px 10px;color:rgba(245,240,232,0.2);font-size:0.8rem;letter-spacing:0.08em;">
      Escolha primeiro uma data acima
    </div>`;
  document.getElementById('slotsHint').classList.remove('show');
  document.getElementById('slotsDateLabel').textContent = '';
  selectedTime = null;
  document.getElementById('selectedTime').value = '';
}

function normalizePhone(phone) {
  return phone.trim().replace(/\s+/g, '').replace(/^(\+351|00351)/, '');
}

function validatePhonePT(phone) {
  // Após normalização (sem +351/00351), deve ter 9 dígitos a começar por 9 (móvel) ou 2 (fixo)
  const normalized = normalizePhone(phone);
  return /^[29]\d{8}$/.test(normalized);
}

function validateForm() {
  const fname   = document.getElementById('fname').value.trim();
  const lname   = document.getElementById('lname').value.trim();
  const phone   = document.getElementById('phone').value.trim();
  const email   = document.getElementById('email').value.trim();
  const service = document.getElementById('service').value;
  const date    = document.getElementById('bookDate').value;
  if (!fname || !lname || !phone || !email || !service || !date || !selectedTime) {
    showToast('Campos em falta', 'Por favor preencha todos os campos obrigatórios (*).', true);
    return false;
  }
  if (!validatePhonePT(phone)) {
    showToast('Telemóvel inválido', 'Introduza um número português válido (ex: 912 345 678).', true);
    return false;
  }
  return true;
}

async function submitBooking() {
  // Honeypot — se este campo estiver preenchido é um bot
  if (document.getElementById('website').value) {
    console.warn('Bot detetado via honeypot.');
    // Simular sucesso para não alertar o bot
    document.getElementById('formContent').style.display = 'none';
    document.getElementById('successMsg').classList.add('show');
    return;
  }

  if (!validateForm()) return;
  const btn = document.getElementById('submitBtn');
  btn.disabled = true; btn.textContent = 'A enviar...';

  const booking = {
    first_name: document.getElementById('fname').value.trim(),
    last_name:  document.getElementById('lname').value.trim(),
    phone:      normalizePhone(document.getElementById('phone').value),
    email:      document.getElementById('email').value.trim() || null,
    service:    document.getElementById('service').value,
    stylist:    document.getElementById('stylist').value || null,
    date:       document.getElementById('bookDate').value,
    time:       selectedTime,
    notes:      document.getElementById('notes').value.trim() || null,
    status:     'pending'
  };

  try {
    await db.insert('bookings', booking);
    document.getElementById('formContent').style.display = 'none';
    const successEl = document.getElementById('successMsg');
    successEl.classList.add('show');
    // Gerar link Google Calendar
    const gcLink = document.getElementById('gcalLink');
    if (gcLink) {
      gcLink.href = buildGCalLink(booking);
      gcLink.style.display = 'inline-block';
    }
    showToast('✅ Confirmado!', `Marcação para ${booking.date} às ${booking.time}`);
  } catch (err) {
    console.error('submitBooking error:', err);
    showToast('Erro', 'Não foi possível guardar. Tente novamente.', true);
    btn.disabled = false;
    btn.textContent = 'Confirmar Marcação';
  }
}

function buildGCalLink(booking) {
  const SERVICE_NAMES_FULL = { corte:'Corte & Styling', coloracao:'Coloração', tratamento:'Tratamentos Capilares', noiva:'Penteados Noiva', massagem:'Massagem Capilar', barba:'Barba & Bigode' };
  const [h, m] = booking.time.split(':').map(Number);
  const startDate = new Date(booking.date + 'T' + booking.time + ':00');
  const endDate   = new Date(startDate.getTime() + 60 * 60 * 1000); // +1h
  const fmt = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const title   = encodeURIComponent(`Casal Menezes – ${SERVICE_NAMES_FULL[booking.service] || booking.service}`);
  const details = encodeURIComponent(`Profissional: ${booking.stylist ? (booking.stylist === 'ana' ? 'Ana Menezes' : 'Anderson Menezes') : 'Sem preferência'}${booking.notes ? '\nObservações: ' + booking.notes : ''}`);
  const location = encodeURIComponent('R. Vasco da Gama 7, 8500-739 Portimão');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(startDate)}/${fmt(endDate)}&details=${details}&location=${location}`;
}

function resetForm() {
  document.getElementById('formContent').style.display = 'block';
  document.getElementById('successMsg').classList.remove('show');
  const gcLink = document.getElementById('gcalLink');
  if (gcLink) gcLink.style.display = 'none';
  document.querySelectorAll('input[type=text],input[type=tel],input[type=email],input[type=date],select,textarea')
    .forEach(el => el.value = '');
  clearSlots();
}

function showToast(title, msg, isError = false) {
  const t = document.getElementById('toast');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent = msg;
  t.style.borderColor = isError ? '#e05c5c' : 'var(--gold)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}
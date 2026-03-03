/* ============================================================
   CASAL MENEZES HAIR SHOP — cliente.js
   Lógica do portal do cliente (pesquisa, cancelamento)
   ============================================================ */

// ── DADOS ─────────────────────────────────────────────────
// Mock — substituir por chamadas Supabase
const MOCK_BOOKINGS = [
  { id:'b001', first_name:'Maria', last_name:'Silva',   phone:'912345678', email:'maria@exemplo.com', service:'coloracao', stylist:'ana',  date:'2025-08-15', time:'10:00', status:'confirmed', notes:'' },
  { id:'b002', first_name:'Maria', last_name:'Silva',   phone:'912345678', email:'maria@exemplo.com', service:'corte',     stylist:'joao', date:'2025-09-03', time:'14:30', status:'pending',   notes:'Corte curto' },
  { id:'b003', first_name:'João',  last_name:'Costa',   phone:'965432100', email:'',                  service:'barba',     stylist:'joao', date:'2025-08-10', time:'11:00', status:'cancelled', notes:'' },
];

const SERVICE_NAMES  = { corte:'Corte & Styling', coloracao:'Coloração', tratamento:'Tratamentos Capilares', noiva:'Penteados Noiva', massagem:'Massagem Capilar', barba:'Barba & Bigode' };
const STYLIST_NAMES  = { ana:'Ana Menezes', joao:'João Menezes', '':'Sem preferência' };
const MONTHS_SHORT   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

let cancelTargetId = null;

// ── PESQUISA ──────────────────────────────────────────────
async function searchBookings() {
  const phone = document.getElementById('searchPhone').value.trim().replace(/\s/g, '');
  const email = document.getElementById('searchEmail').value.trim().toLowerCase();

  if (!phone && !email) {
    showToast('Atenção', 'Introduza o telemóvel ou email.', true);
    return;
  }

  const btn = document.getElementById('searchBtn');
  btn.disabled = true;
  btn.textContent = 'A pesquisar...';

  // ── SUPABASE (substituir simulação abaixo) ──────────────
  // const { data } = await supabase
  //   .from('bookings')
  //   .select('*')
  //   .or(`phone.eq.${phone},email.eq.${email}`)
  //   .order('date', { ascending: true });
  // ───────────────────────────────────────────────────────

  await new Promise(r => setTimeout(r, 700));
  const clean  = s => s.replace(/\s|\+351/g, '');
  const results = MOCK_BOOKINGS.filter(b =>
    (phone && clean(b.phone) === clean(phone)) ||
    (email && b.email.toLowerCase() === email)
  );

  btn.disabled = false;
  btn.textContent = 'Ver as Minhas Marcações';
  renderResults(results, phone || email);
}

// ── RENDERIZAR RESULTADOS ─────────────────────────────────
function renderResults(bookings, query) {
  document.getElementById('searchSection').style.display = 'none';
  const res = document.getElementById('resultsSection');
  res.classList.add('show');

  document.getElementById('resultsTitle').textContent = `Marcações para "${query}"`;
  document.getElementById('resultsCount').textContent =
    bookings.length === 0 ? 'Nenhuma marcação encontrada' :
    bookings.length === 1 ? '1 marcação encontrada' :
    `${bookings.length} marcações encontradas`;

  const list  = document.getElementById('bookingsList');
  const empty = document.getElementById('emptyState');
  list.innerHTML = '';

  if (bookings.length === 0) { empty.classList.add('show'); return; }
  empty.classList.remove('show');

  bookings.forEach(b => {
    const d      = new Date(b.date + 'T12:00');
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
            <span>💇 ${STYLIST_NAMES[b.stylist] || b.stylist}</span>
            ${b.notes  ? `<span>📝 ${b.notes}</span>` : ''}
            ${isPast   ? '<span style="color:#999">Marcação passada</span>' : ''}
          </div>
        </div>
        <div class="booking-actions">
          <span class="badge badge-${b.status}">${statusLabel}</span>
          ${canCancel ? `<button class="btn-cancel" onclick="openCancelModal('${b.id}')">Cancelar</button>` : ''}
        </div>
      </div>`;
  });
}

// ── RESETAR PESQUISA ──────────────────────────────────────
function resetSearch() {
  document.getElementById('searchSection').style.display = 'flex';
  document.getElementById('resultsSection').classList.remove('show');
  document.getElementById('emptyState').classList.remove('show');
  document.getElementById('searchPhone').value = '';
  document.getElementById('searchEmail').value = '';
}

// ── MODAL DE CANCELAMENTO ─────────────────────────────────
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
  closeModal();

  // ── SUPABASE ─────────────────────────────────────────────
  // await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', cancelTargetId);
  // ─────────────────────────────────────────────────────────

  const card = document.getElementById('card-' + cancelTargetId);
  if (card) {
    const badge = card.querySelector('.badge');
    badge.className   = 'badge badge-cancelled';
    badge.textContent = 'Cancelado';
    const btn = card.querySelector('.btn-cancel');
    if (btn) btn.disabled = true;
  }
  showToast('Marcação cancelada', 'A sua marcação foi cancelada com sucesso.');
  cancelTargetId = null;
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

// ── EVENTOS ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Fechar modal ao clicar no overlay
  document.getElementById('cancelModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
  // Enter para pesquisar
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchBookings();
  });
});

/* ============================================================
   CASAL MENEZES HAIR SHOP — cliente.js
   ============================================================ */

const SERVICE_NAMES = { corte:'Corte & Styling', coloracao:'Coloração', tratamento:'Tratamentos Capilares', noiva:'Penteados Noiva', massagem:'Massagem Capilar', barba:'Barba & Bigode' };
const STYLIST_NAMES = { ana:'Ana Menezes', joao:'João Menezes', '':'Sem preferência' };
const MONTHS_SHORT  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

let cancelTargetId = null;

async function searchBookings() {
  const phone = document.getElementById('searchPhone').value.trim().replace(/\s|\+351/g, '');
  const email = document.getElementById('searchEmail').value.trim().toLowerCase();

  if (!phone || !email) {
    showToast('Campos em falta', 'Por favor introduza o telemóvel e o email.', true);
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
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchBookings();
  });
});
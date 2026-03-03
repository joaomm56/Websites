/* ============================================================
   CASAL MENEZES HAIR SHOP — supabase.js
   Chamadas REST diretas ao Supabase (sem SDK)
   ============================================================ */

const SUPABASE_URL = 'https://orhrywnagwkmcrbwwtaa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CzddowHVhCS3T9KQaAPXdg_qyjp17MT';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// Converte array de filtros em query string: [['date','eq','2026-03-04']] → ?date=eq.2026-03-04
function buildFilters(url, filters = []) {
  filters.forEach(([col, op, val]) => url.searchParams.append(col, `${op}.${val}`));
}

const db = {

  async select(table, params = {}) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    url.searchParams.set('select', params.select || '*');
    buildFilters(url, params.filters || []);
    if (params.order) url.searchParams.set('order', params.order);

    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
  },

  async update(table, data, filters = []) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    buildFilters(url, filters);

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { ...HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
  }
};
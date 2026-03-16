/* ============================================================
   CASAL MENEZES HAIR SHOP — api/send-reminders.js
   Vercel Cron Job — envia lembretes SMS para amanhã
   Executa todos os dias às 09:00 (ver vercel.json)
   ============================================================ */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://orhrywnagwkmcrbwwtaa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_CzddowHVhCS3T9KQaAPXdg_qyjp17MT';

const SERVICE_NAMES = {
  corte: 'Corte & Styling', coloracao: 'Coloração',
  tratamento: 'Tratamentos Capilares', noiva: 'Penteados Noiva',
  massagem: 'Massagem Capilar', barba: 'Barba & Bigode',
};

export default async function handler(req, res) {
  // Vercel cron passa Authorization header — verificar segurança básica
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return res.status(200).json({ skipped: true, reason: 'Twilio não configurado' });
  }

  // Data de amanhã
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  try {
    // Buscar marcações de amanhã que não estão canceladas
    const url = new URL(`${SUPABASE_URL}/rest/v1/bookings`);
    url.searchParams.set('select', 'first_name,phone,service,time');
    url.searchParams.append('date', `eq.${dateStr}`);
    url.searchParams.append('status', 'neq.cancelled');

    const bookingsRes = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const bookings = await bookingsRes.json();

    let sent = 0, failed = 0;
    for (const b of bookings) {
      if (!b.phone) continue;
      let phone = b.phone.replace(/\s+/g, '');
      if (!phone.startsWith('+')) phone = '+351' + phone;

      const svcName = SERVICE_NAMES[b.service] || b.service;
      const message = `Olá ${b.first_name}! Lembrete: tem uma marcação de ${svcName} amanhã às ${b.time} no Casal Menezes Hair Shop. Até amanhã! 😊`;

      const smsRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: phone, From: fromNumber, Body: message }).toString(),
        }
      );
      smsRes.ok ? sent++ : failed++;
    }

    return res.json({ date: dateStr, total: bookings.length, sent, failed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

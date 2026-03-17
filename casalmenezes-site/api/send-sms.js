/* ============================================================
   CASAL MENEZES HAIR SHOP — api/send-sms.js
   Vercel Serverless Function — envia SMS via Twilio

   Variáveis de ambiente necessárias no Vercel:
     TWILIO_ACCOUNT_SID   → Account SID da conta Twilio
     TWILIO_AUTH_TOKEN    → Auth Token da conta Twilio
     TWILIO_FROM_NUMBER   → Número Twilio (ex: +14155552671)
   ============================================================ */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return res.status(503).json({ error: 'SMS não configurado. Configure as variáveis TWILIO_* no Vercel.' });
  }

  const { to, message } = req.body || {};
  if (!to || !message) {
    return res.status(400).json({ error: 'Campos "to" e "message" são obrigatórios.' });
  }

  // Normalizar número para formato internacional PT
  let toNumber = String(to).replace(/\s+/g, '');
  if (!toNumber.startsWith('+')) toNumber = '+351' + toNumber;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: toNumber, From: fromNumber, Body: message }).toString(),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: data.message || 'Erro ao enviar SMS' });
    }
    return res.json({ success: true, sid: data.sid });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

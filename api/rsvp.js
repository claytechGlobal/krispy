const HOST = process.env.RSVP_TO || 'shadowblaq@gmail.com';
const FROM = process.env.RSVP_FROM || 'Krispy 50 RSVP <rsvp@shadowblaq.com>';

function bad(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return bad(res, 405, 'Method not allowed');

  const key = process.env.RESEND_API_KEY;
  if (!key) return bad(res, 500, 'Missing RESEND_API_KEY');

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch (_) { return bad(res, 400, 'Invalid JSON'); }
  }
  body = body || {};

  const name = String(body.name || '').trim().replace(/\s+/g, ' ');
  const phone = String(body.phone || '').trim();
  const email = String(body.email || '').trim();
  const guests = String(body.guests || '').trim();
  const code = String(body.code || '').trim();

  if (!name || name.split(/\s+/).length < 2) return bad(res, 400, 'Invalid name');
  if (phone.replace(/\D/g, '').length !== 10) return bad(res, 400, 'Invalid phone');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return bad(res, 400, 'Invalid email');
  if (!guests) return bad(res, 400, 'Invalid guests');
  if (!code) return bad(res, 400, 'Invalid code');

  const text = `RSVP for Krispy Half a Century 50 Dinner Gala (Dec 24, 2026)

Name: ${name}
Phone: ${phone}
Email: ${email}
Number of guests: ${guests}
Confirmation code: ${code}`;

  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#1d0a36">
  <h2 style="margin:0 0 12px">New RSVP — Krispy 50 Dinner Gala</h2>
  <p style="margin:0 0 16px;color:#5a3a80">Dec 24, 2026 · 6:00 – 10:30 PM · Feisty Hall, Paterson NJ</p>
  <table style="border-collapse:collapse;width:100%;max-width:480px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #e8dcf5;color:#7d5aa6;width:140px">Guest</td><td style="padding:8px 0;border-bottom:1px solid #e8dcf5;font-weight:600">${name}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #e8dcf5;color:#7d5aa6">Phone</td><td style="padding:8px 0;border-bottom:1px solid #e8dcf5;font-weight:600">${phone}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #e8dcf5;color:#7d5aa6">Email</td><td style="padding:8px 0;border-bottom:1px solid #e8dcf5;font-weight:600">${email}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #e8dcf5;color:#7d5aa6">Guests</td><td style="padding:8px 0;border-bottom:1px solid #e8dcf5;font-weight:600">${guests}</td></tr>
    <tr><td style="padding:8px 0;color:#7d5aa6">Code</td><td style="padding:8px 0;font-weight:700;letter-spacing:.08em">${code}</td></tr>
  </table>
</div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM,
        to: [HOST],
        reply_to: email,
        subject: 'RSVP: ' + name + ' (party of ' + guests + ')',
        text,
        html
      })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return bad(res, 502, data.message || 'Resend failed');
    return res.status(200).json({ ok: true, id: data.id });
  } catch (_) {
    return bad(res, 502, 'Network error');
  }
};

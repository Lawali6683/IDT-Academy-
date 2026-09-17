export default {
  async fetch(request, env) {
    const SENDER_EMAIL = env.SENDER_EMAIL;
    const SERVICE_ID = env.SERVICE_ID;
    const PUBLIC_KEY = env.PUBLIC_KEY;
    const PRIVATE_KEY = env.PRIVATE_KEY;
    const TEMPLATE_ID = env.TEMPLATE_ID;
    const SITE_URL = 'https://www.idtacademy.com.ng';
    const LOGO = 'https://i.imgur.com/oyqM5oF.png';
    const allowed = new Set([SITE_URL, SITE_URL + '/']);
    const origin = request.headers.get('Origin') || '';
    if (origin && !allowed.has(origin)) {
      return json({ error: 'Forbidden origin' }, 403);
    }
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, corsHeaders);
    }
    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      return json({ error: 'Invalid JSON body' }, 400, corsHeaders);
    }
    if (!payload.email || !payload.full_name) {
      return json({ error: 'email and full_name are required' }, 400, corsHeaders);
    }
    const fullName = String(payload.full_name || 'Student');
    const email = String(payload.email || '').trim();
    const referralLink = String(payload.referral_link || SITE_URL + '/register');
    const htmlContent = [
      '<div style="margin:0;padding:0;background-color:#f4f2ff;font-family:\'Segoe UI\',Arial,sans-serif">',
      '<div style="max-width:600px;margin:0 auto;padding:20px">',
      '<div style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(80,40,160,.15)">',
      '<div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:30px 24px;text-align:center">',
      '<img src="' + LOGO + '" alt="IDT Academy" style="width:70px;height:70px;border-radius:50%;background:#fff;padding:6px;margin-bottom:10px">',
      '<h1 style="color:#fff;font-size:22px;font-weight:900;margin:0;letter-spacing:1px">Congratulations ' + fullName + '!</h1>',
      '<p style="color:#c4b5fd;font-size:13px;margin:5px 0 0">Your ₦2000 reward is ready</p>',
      '</div>',
      '<div style="padding:28px 24px">',
      '<h2 style="color:#1e1b4b;font-size:20px;font-weight:900;margin:0 0 6px">🎉 ₦2000 Reward Added!</h2>',
      '<p style="color:#6d6a8a;font-size:14px;line-height:1.7;margin-bottom:18px">',
      'You successfully posted your IDT Academy certificate on social media. Your ₦2000 reward has been added to your referral bonus.',
      '</p>',
      '<div style="background:linear-gradient(135deg,rgba(16,185,129,.06),rgba(6,182,212,.06));border:1.5px solid rgba(16,185,129,.25);border-radius:16px;padding:18px;margin-bottom:18px">',
      '<h3 style="color:#047857;font-size:15px;font-weight:900;margin:0 0 12px">Reward Summary</h3>',
      '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed rgba(124,58,237,.1);font-size:13px"><span style="color:#6d6a8a;font-weight:600">Bonus Reward</span><span style="color:#1e1b4b;font-weight:800">₦2000</span></div>',
      '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed rgba(124,58,237,.1);font-size:13px"><span style="color:#6d6a8a;font-weight:600">Per Friend Referral</span><span style="color:#1e1b4b;font-weight:800">₦1500</span></div>',
      '<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:13px"><span style="color:#6d6a8a;font-weight:600">Your Referral Link</span><span style="color:#7c3aed;font-weight:800;word-break:break-all">' + referralLink + '</span></div>',
      '</div>',
      '<p style="color:#6d6a8a;font-size:14px;line-height:1.7;margin-bottom:18px">',
      'You can earn even more free money from IDT Academy — up to ₦1500 for every friend who registers through your referral link. Don\'t wait, copy your link and share it with everyone on social media!',
      '</p>',
      '<div style="text-align:center;margin:20px 0">',
      '<a href="' + SITE_URL + '/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:900;font-size:15px">Withdraw Your Reward</a>',
      '</div>',
      '<p style="font-size:13px;color:#6d6a8a;line-height:1.7;margin:0">',
      'If you have any questions, please contact our support team via WhatsApp at <b>+234 706 881 8760</b> or reply to this email. Thank you for being part of IDT Academy!',
      '</p>',
      '</div>',
      '<div style="text-align:center;padding:20px 24px;background:#f8f7ff;border-top:1px solid rgba(124,58,237,.1)">',
      '<p style="font-size:12px;color:#6d6a8a;margin:4px 0;line-height:1.6"><b style="color:#1e1b4b">IDT Academy</b> &mdash; Learn Beyond Limits</p>',
      '<p style="font-size:12px;color:#6d6a8a;margin:4px 0;line-height:1.6">www.idtacademy.com.ng | support@idtacademy.com.ng</p>',
      '<p style="font-size:12px;color:#6d6a8a;margin:4px 0;line-height:1.6">&copy; ' + new Date().getFullYear() + ' Intelligent Digital Technology Academy. All rights reserved.</p>',
      '</div>',
      '</div>',
      '</div>',
      '</div>'
    ].join('');
    const params = {
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY,
      accessToken: PRIVATE_KEY,
      template_params: {
        to_email: email,
        from_name: fullName,
        message: htmlContent,
        reply_to: email
      }
    };
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!res.ok) {
        const text = await res.text();
        return json({ error: 'EmailJS error ' + res.status, detail: text }, 502, corsHeaders);
      }
      return json({ ok: true, message: 'Reward email sent to ' + email }, 200, corsHeaders);
    } catch (err) {
      return json({ error: 'Email send failed', detail: String((err && err.message) || err) }, 500, corsHeaders);
    }
  }
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {})
  });
}

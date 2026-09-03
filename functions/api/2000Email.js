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
    const params = {
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY,
      accessToken: PRIVATE_KEY,
      template_params: {
        to_email: payload.email,
        from_email: SENDER_EMAIL,
        full_name: payload.full_name,
        referral_link: payload.referral_link || '',
        bonus_amount: '2000',
        referral_reward: '1500',
        logo: LOGO,
        site_url: SITE_URL,
        register_url: SITE_URL + '/register',
        login_url: SITE_URL + '/login',
        dashboard_url: SITE_URL + '/dashboard',
        referral_url: SITE_URL + '/referral',
        message_title: 'Congratulations ' + payload.full_name + '! Your ₦2000 reward is ready 🎉',
        message_body: 'You successfully posted your IDT Academy certificate on social media. Your ₦2000 reward has been added to your referral bonus. Log in now and withdraw it from the referral page.',
        referral_message: 'You can earn even more free money from IDT Academy — up to ₦1500 for every friend who registers through your referral link. Don\'t wait, copy your link and share it with everyone on social media!'
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
      return json({ ok: true, message: 'Reward email sent to ' + payload.email }, 200, corsHeaders);
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
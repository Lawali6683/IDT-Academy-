const SENDER_EMAIL = SENDER_EMAIL_ENV;
const SERVICE_ID = SERVICE_ID_ENV;
const PUBLIC_KEY = PUBLIC_KEY_ENV;
const PRIVATE_KEY = PRIVATE_KEY_ENV;
const TEMPLATE_ID = TEMPLATE_ID_ENV;

const LOGO = 'https://i.imgur.com/oyqM5oF.png';
const SITE_URL = 'https://www.idtacademy.com.ng';

function buildPdfLinks(pdfs) {
  if (!Array.isArray(pdfs) || !pdfs.length) return '';
  return pdfs.map((url, i) =>
    '<a href="' + url + '" style="display:inline-block;margin:4px 8px 4px 0;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:700;font-size:14px">' +
    'Download Certificate PDF ' + (i + 1) + '</a>'
  ).join('');
}

function buildTemplate(payload) {
  return {
    service_id: SERVICE_ID,
    template_id: TEMPLATE_ID,
    user_id: PUBLIC_KEY,
    accessToken: PRIVATE_KEY,
    template_params: {
      to_email: payload.email,
      from_email: SENDER_EMAIL,
      full_name: payload.full_name || 'Student',
      course_name: payload.course_name || 'Information Technology',
      course_number: payload.course_number || '',
      grade: payload.grade || '',
      cert_id: payload.cert_id || '',
      date_completed: payload.date_completed || '',
      referral_link: payload.referral_link || '',
      pdf_links: buildPdfLinks(payload.pdfs),
      logo: LOGO,
      site_url: SITE_URL,
      login_url: SITE_URL + '/login.html',
      register_url: SITE_URL + '/register.html',
      share_post_link: SITE_URL + '/referral.html',
      message_title: '🎉 Congratulations, ' + (payload.full_name || 'Student') + '!',
      message_body: 'You have successfully completed the ' + (payload.course_name || '') + ' course at IDT Academy. Attached are your official certificate documents and your unique certificate ID below.'
    }
  };
}

export default {
  async fetch(request, env) {
    const SENDER_EMAIL = env.SENDER_EMAIL;
    const SERVICE_ID = env.SERVICE_ID;
    const PUBLIC_KEY = env.PUBLIC_KEY;
    const PRIVATE_KEY = env.PRIVATE_KEY;
    const TEMPLATE_ID = env.TEMPLATE_ID;
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
    if (!payload.email || !payload.full_name || !Array.isArray(payload.pdfs) || !payload.pdfs.length) {
      return json({ error: 'email, full_name and at least one pdf are required' }, 400, corsHeaders);
    }
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildTemplate(payload))
      });
      if (!res.ok) {
        const text = await res.text();
        return json({ error: 'EmailJS error ' + res.status, detail: text }, 502, corsHeaders);
      }
      return json({ ok: true, message: 'Certificate email sent to ' + payload.email }, 200, corsHeaders);
    } catch (err) {
      return json({ error: 'Email send failed', detail: String(err && err.message || err) }, 500, corsHeaders);
    }
  }
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {})
  });
}
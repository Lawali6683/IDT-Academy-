const LOGO = 'https://i.imgur.com/oyqM5oF.png';
const SITE_URL = 'https://www.idtacademy.com.ng';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPdfLinks(pdfs) {
  if (!Array.isArray(pdfs) || !pdfs.length) return '';
  return pdfs.map(function(url, i) {
    return '<a href="' + escapeHtml(url) + '" style="display:inline-block;margin:4px 8px 4px 0;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:700;font-size:14px">Download Certificate PDF ' + (i + 1) + '</a>';
  }).join('');
}

function buildMessage(payload) {
  const fullName = escapeHtml(payload.full_name || 'Student');
  const courseName = escapeHtml(payload.course_name || 'Information Technology');
  const courseNumber = escapeHtml(payload.course_number || 'N/A');
  const grade = escapeHtml(payload.grade || 'N/A');
  const certId = escapeHtml(payload.cert_id || 'N/A');
  const dateCompleted = escapeHtml(payload.date_completed || new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' }));
  const pdfLinks = buildPdfLinks(payload.pdfs);
  return [
    '<div style="margin:0;padding:0;background-color:#f4f2ff;font-family:\'Segoe UI\',Arial,sans-serif">',
    '<div style="max-width:600px;margin:0 auto;padding:20px">',
    '<div style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(80,40,160,.15)">',
    '<div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:30px 24px;text-align:center">',
    '<img src="' + LOGO + '" alt="IDT Academy" style="width:70px;height:70px;border-radius:50%;background:#fff;padding:6px;margin-bottom:10px">',
    '<h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0;letter-spacing:1px">🎉 Congratulations ' + fullName + '!</h1>',
    '<p style="color:#c4b5fd;font-size:13px;margin:5px 0 0">You have successfully completed your course</p>',
    '</div>',
    '<div style="padding:28px 24px">',
    '<h2 style="color:#1e1b4b;font-size:20px;font-weight:900;margin:0 0 6px">Your Certificate Is Ready</h2>',
    '<p style="color:#6d6a8a;font-size:14px;line-height:1.7;margin-bottom:18px">',
    'You have successfully completed the <b style="color:#1e1b4b">' + courseName + '</b> course at IDT Academy. Attached are your official certificate documents and your unique certificate ID below.',
    '</p>',
    '<div style="background:linear-gradient(135deg,rgba(124,58,237,.06),rgba(6,182,212,.06));border:1.5px solid rgba(124,58,237,.25);border-radius:16px;padding:18px;margin-bottom:18px">',
    '<h3 style="color:#7c3aed;font-size:15px;font-weight:900;margin:0 0 12px">Certificate Details</h3>',
    '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed rgba(124,58,237,.1);font-size:13px"><span style="color:#6d6a8a;font-weight:600">Full Name</span><span style="color:#1e1b4b;font-weight:800">' + fullName + '</span></div>',
    '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed rgba(124,58,237,.1);font-size:13px"><span style="color:#6d6a8a;font-weight:600">Course Name</span><span style="color:#1e1b4b;font-weight:800">' + courseName + '</span></div>',
    '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed rgba(124,58,237,.1);font-size:13px"><span style="color:#6d6a8a;font-weight:600">Course Number</span><span style="color:#1e1b4b;font-weight:800">' + courseNumber + '</span></div>',
    '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed rgba(124,58,237,.1);font-size:13px"><span style="color:#6d6a8a;font-weight:600">Grade</span><span style="color:#047857;font-weight:800">' + grade + '</span></div>',
    '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed rgba(124,58,237,.1);font-size:13px"><span style="color:#6d6a8a;font-weight:600">Certificate ID</span><span style="color:#1e1b4b;font-weight:800">' + certId + '</span></div>',
    '<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:13px"><span style="color:#6d6a8a;font-weight:600">Date Completed</span><span style="color:#1e1b4b;font-weight:800">' + dateCompleted + '</span></div>',
    '</div>',
    '<div style="text-align:center;margin:20px 0">' + pdfLinks + '</div>',
    '<div style="background:linear-gradient(135deg,rgba(16,185,129,.06),rgba(6,182,212,.06));border:1.5px solid rgba(16,185,129,.25);border-radius:16px;padding:18px;margin-bottom:18px;text-align:center">',
    '<h3 style="color:#047857;font-size:15px;font-weight:900;margin:0 0 8px">Earn Free Money With Your Certificate</h3>',
    '<p style="color:#6d6a8a;font-size:13px;line-height:1.7;margin:0 0 12px">Post your certificate on social media and earn ₦2000 reward! You can also earn up to ₦1500 for every friend who registers through your referral link.</p>',
    '<a href="' + SITE_URL + '/referral.html" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:12px;font-weight:900;font-size:14px">Get Your Reward</a>',
    '</div>',
    '<div style="text-align:center;margin:20px 0">',
    '<a href="' + SITE_URL + '/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:900;font-size:15px">Go To Dashboard</a>',
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
}

function buildTemplate(payload, env) {
  return {
    service_id: env.SERVICE_ID,
    template_id: env.TEMPLATE_ID,
    user_id: env.PUBLIC_KEY,
    accessToken: env.PRIVATE_KEY,
    template_params: {
      to_email: payload.email,
      from_name: payload.full_name || 'Student',
      message: buildMessage(payload),
      reply_to: payload.email
    }
  };
}

export default {
  async fetch(request, env) {
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
        body: JSON.stringify(buildTemplate(payload, env))
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

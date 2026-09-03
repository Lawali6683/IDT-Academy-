const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS }
  });
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

export const onRequestPost = async (context) => {
  const env = context.env;
  try {
    let body;
    try {
      body = await context.request.json();
    } catch (err) {
      return json({ success: false, error: 'Invalid JSON body' }, 400);
    }
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return json({ success: false, error: 'email is required' }, 400);
    const fullName = String(body.full_name || '').trim();
    const courseName = String(body.course_name || '');
    const score = Number(body.score || 0);
    const pct = Number(body.pct || 0);
    const passed = body.passed === true || body.passed === 'true';
    const date = String(body.date || new Date().toISOString().slice(0, 10));
    const statusText = passed ? 'PASSED' : 'NOT PASSED';
    const html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">' +
      '<div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:26px;border-radius:18px 18px 0 0;text-align:center">' +
      '<img src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy" style="width:64px;height:64px;border-radius:50%;background:#fff;padding:6px">' +
      '<h2 style="color:#fff;margin:10px 0 0;font-size:20px">IDT Academy</h2>' +
      '<p style="color:#c4b5fd;margin:4px 0 0;font-size:13px">Learn Beyond Limits</p></div>' +
      '<div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 18px 18px;padding:26px;background:#fafaff">' +
      '<p style="color:#1e1b4b">Dear <b>' + escapeHtml(fullName || 'Student') + '</b>,</p>' +
      '<p style="color:#6d6a8a;line-height:1.7">Here is your assessment result for <b>' + escapeHtml(courseName || 'your course') + '</b>.</p>' +
      '<div style="background:#fff;border-radius:14px;padding:18px;border:1px solid #e9e6ff;margin:14px 0">' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
      '<tr><td style="padding:6px 0;color:#6d6a8a">Score</td><td style="padding:6px 0;font-weight:700;color:#1e1b4b;text-align:right">' + score + ' / 5</td></tr>' +
      '<tr><td style="padding:6px 0;color:#6d6a8a">Percentage</td><td style="padding:6px 0;font-weight:700;color:#1e1b4b;text-align:right">' + pct + '%</td></tr>' +
      '<tr><td style="padding:6px 0;color:#6d6a8a">Status</td><td style="padding:6px 0;font-weight:800;color:' + (passed ? '#10b981' : '#f43f5e') + ';text-align:right">' + statusText + '</td></tr>' +
      '<tr><td style="padding:6px 0;color:#6d6a8a">Date</td><td style="padding:6px 0;font-weight:700;color:#1e1b4b;text-align:right">' + escapeHtml(date) + '</td></tr>' +
      '</table></div>' +
      '<p style="color:#6d6a8a;line-height:1.7">Your full result PDF is attached to this email. Keep learning, greatness is built one step at a time.</p>' +
      '<div style="text-align:center;margin-top:20px">' +
      '<a href="https://www.idtacademy.com.ng" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;display:inline-block">Visit IDT Academy</a>' +
      '</div></div></div>';
    const payload = {
      service_id: env.EMAILJS_SERVICE_ID,
      template_id: env.EMAILJS_TEMPLATE_ID,
      user_id: env.EMAILJS_PUBLIC_KEY,
      accessToken: env.EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: email,
        to_name: fullName || 'Student',
        subject: 'IDT Academy - Assessment Result (' + statusText + ')',
        html: html,
        course_name: courseName,
        score: String(score),
        pct: String(pct),
        passed: statusText,
        date: date
      }
    };
    const pdfBase64 = String(body.pdf_base64 || '');
    const cleaned = pdfBase64.replace(/^data:[^;]*;base64,/, '');
    if (cleaned) {
      payload.attachments = [{ name: 'IDT_Assessment_Result.pdf', data: cleaned, type: 'application/pdf' }];
    }
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = text;
      try {
        const j = JSON.parse(text);
        msg = j.error || text;
      } catch (err) {}
      return json({ success: false, error: 'EmailJS: ' + msg }, 502);
    }
    return json({ success: true, message: 'Email sent' });
  } catch (err) {
    return json({ success: false, error: err.message || 'Server error' }, 500);
  }
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS });
};
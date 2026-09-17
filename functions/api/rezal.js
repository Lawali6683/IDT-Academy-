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
    const html = '<div style="font-family:\'Segoe UI\',Arial,sans-serif;margin:0;padding:20px;background-color:#f4f2ff">' +
      '<div style="max-width:560px;margin:auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(80,40,160,.15)">' +
      '<div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:26px;text-align:center">' +
      '<img src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy" style="width:64px;height:64px;border-radius:50%;background:#fff;padding:6px">' +
      '<h2 style="color:#fff;margin:10px 0 0;font-size:20px;font-weight:900">IDT Academy</h2>' +
      '<p style="color:#c4b5fd;margin:4px 0 0;font-size:13px">Learn Beyond Limits</p></div>' +
      '<div style="padding:26px;background:#fafaff">' +
      '<h3 style="color:#1e1b4b;font-size:19px;font-weight:900;margin:0 0 6px">' + (passed ? '🎉 Congratulations' : 'Assessment Result') + '</h3>' +
      '<p style="color:#6d6a8a;font-size:14px;line-height:1.7;margin:0 0 14px">Dear <b style="color:#1e1b4b">' + escapeHtml(fullName || 'Student') + '</b>,</p>' +
      '<p style="color:#6d6a8a;font-size:14px;line-height:1.7;margin:0 0 14px">Here is your assessment result for <b style="color:#1e1b4b">' + escapeHtml(courseName || 'your course') + '</b>.</p>' +
      '<div style="background:#fff;border-radius:14px;padding:18px;border:1.5px solid rgba(124,58,237,.25);margin:0 0 18px">' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
      '<tr><td style="padding:7px 0;color:#6d6a8a;font-weight:600;border-bottom:1px dashed rgba(124,58,237,.1)">Course</td><td style="padding:7px 0;font-weight:800;color:#1e1b4b;text-align:right;border-bottom:1px dashed rgba(124,58,237,.1)">' + escapeHtml(courseName || 'N/A') + '</td></tr>' +
      '<tr><td style="padding:7px 0;color:#6d6a8a;font-weight:600;border-bottom:1px dashed rgba(124,58,237,.1)">Score</td><td style="padding:7px 0;font-weight:800;color:#1e1b4b;text-align:right;border-bottom:1px dashed rgba(124,58,237,.1)">' + score + ' / 5</td></tr>' +
      '<tr><td style="padding:7px 0;color:#6d6a8a;font-weight:600;border-bottom:1px dashed rgba(124,58,237,.1)">Percentage</td><td style="padding:7px 0;font-weight:800;color:#1e1b4b;text-align:right;border-bottom:1px dashed rgba(124,58,237,.1)">' + pct + '%</td></tr>' +
      '<tr><td style="padding:7px 0;color:#6d6a8a;font-weight:600;border-bottom:1px dashed rgba(124,58,237,.1)">Status</td><td style="padding:7px 0;font-weight:900;font-size:16px;color:' + (passed ? '#10b981' : '#f43f5e') + ';text-align:right;border-bottom:1px dashed rgba(124,58,237,.1)">' + statusText + '</td></tr>' +
      '<tr><td style="padding:7px 0;color:#6d6a8a;font-weight:600">Date</td><td style="padding:7px 0;font-weight:800;color:#1e1b4b;text-align:right">' + escapeHtml(date) + '</td></tr>' +
      '</table></div>' +
      (passed
        ? '<p style="color:#047857;font-size:14px;line-height:1.7;margin:0 0 14px">Well done! You have passed this assessment. Your full result PDF is attached to this email. Keep learning, greatness is built one step at a time.</p>'
        : '<p style="color:#6d6a8a;font-size:14px;line-height:1.7;margin:0 0 14px">Your full result PDF is attached to this email. Do not be discouraged — review the materials and try again. You can do it!</p>') +
      '<div style="text-align:center;margin:0 0 6px">' +
      '<a href="https://www.idtacademy.com.ng" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px;display:inline-block">Visit IDT Academy</a>' +
      '</div>' +
      '<p style="color:#6d6a8a;font-size:13px;line-height:1.7;margin:14px 0 0">If you have any questions, please contact our support team via WhatsApp at <b>+234 706 881 8760</b> or reply to this email.</p>' +
      '</div>' +
      '<div style="text-align:center;padding:18px 24px;background:#f8f7ff;border-top:1px solid rgba(124,58,237,.1)">' +
      '<p style="font-size:12px;color:#6d6a8a;margin:4px 0"><b style="color:#1e1b4b">IDT Academy</b> &mdash; Learn Beyond Limits</p>' +
      '<p style="font-size:12px;color:#6d6a8a;margin:4px 0">www.idtacademy.com.ng | support@idtacademy.com.ng</p>' +
      '<p style="font-size:12px;color:#6d6a8a;margin:4px 0">&copy; ' + new Date().getFullYear() + ' Intelligent Digital Technology Academy. All rights reserved.</p>' +
      '</div>' +
      '</div></div>';
    const payload = {
      service_id: env.EMAILJS_SERVICE_ID,
      template_id: env.EMAILJS_TEMPLATE_ID,
      user_id: env.EMAILJS_PUBLIC_KEY,
      accessToken: env.EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: email,
        from_name: fullName || 'Student',
        message: html,
        reply_to: email
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

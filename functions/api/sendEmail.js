const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const LOGO_URL = 'https://i.imgur.com/oyqM5oF.png';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...CORS }
  });
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, function(ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

async function fetchUserFromSupabase(env, email, fullName) {
  try {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;
    var query = '';
    if (email) query = 'user_data->>email=eq.' + encodeURIComponent(email);
    else if (fullName) query = 'user_data->>full_name=eq.' + encodeURIComponent(fullName);
    if (!query) return null;
    var res = await fetch('https://orhgklhfltsfdumrrhup.supabase.co/rest/v1/user_profiles?' + query + '&select=user_data', {
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) return null;
    var data = await res.json();
    if (data && data[0] && data[0].user_data) return data[0].user_data;
    return null;
  } catch (err) {
    return null;
  }
}

function buildHtmlEmail(studentName, courseName, score, totalQ, pct, passed, dateStr) {
  var statusText = passed ? 'PASSED' : 'NOT PASSED';
  var statusColor = passed ? '#10b981' : '#f43f5e';
  var headline = passed
    ? 'Congratulations, ' + escapeHtml(studentName) + '!'
    : 'Keep Going, ' + escapeHtml(studentName) + '!';
  var message = passed
    ? 'You have successfully passed the assessment for <b>' + escapeHtml(courseName) + '</b>. Your result is attached below. Keep up the great work!'
    : 'Thank you for taking the assessment for <b>' + escapeHtml(courseName) + '</b>. Review the topics and try again. You can do this!';
  return '<!DOCTYPE html>' +
  '<html><head><meta charset="UTF-8"><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;background:#f8f6ff;margin:0;padding:0;color:#1e1b4b}' +
    '.wrap{max-width:560px;margin:0 auto;padding:20px}' +
    '.card{background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(80,40,160,.12)}' +
    '.head{background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 24px;text-align:center;color:#fff}' +
    '.head img{width:60px;height:60px;border-radius:50%;background:#fff;padding:8px;margin-bottom:10px}' +
    '.head h1{font-size:20px;font-weight:900;margin:6px 0 4px}' +
    '.head p{font-size:12px;opacity:.8;margin:0}' +
    '.body{padding:24px}' +
    '.hl{font-size:20px;font-weight:900;margin:0 0 6px;color:' + statusColor + '}' +
    '.msg{font-size:13px;line-height:1.65;color:#4b4570;margin:0 0 18px}' +
    '.table{width:100%;border-collapse:collapse;font-size:13px;margin:16px 0}' +
    '.table td{padding:10px 12px;border-bottom:1px solid rgba(124,58,237,.1)}' +
    '.table td:first-child{font-weight:700;color:#6d6a8a;width:120px}' +
    '.badge{display:inline-block;padding:4px 14px;border-radius:999px;font-weight:900;font-size:12px;color:#fff;background:' + statusColor + '}' +
    '.btn{display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;padding:12px 24px;border-radius:12px;font-weight:800;font-size:13px;text-decoration:none;margin:16px 0}' +
    '.foot{text-align:center;padding:18px;font-size:11px;color:#8b83b0;border-top:1px solid rgba(124,58,237,.1)}' +
  '</style></head><body>' +
  '<div class="wrap">' +
    '<div class="card">' +
      '<div class="head">' +
        '<img src="' + LOGO_URL + '" alt="IDT Academy">' +
        '<h1>IDT Academy</h1>' +
        '<p>Intelligent Digital Technology Academy</p>' +
      '</div>' +
      '<div class="body">' +
        '<div class="hl">' + headline + '</div>' +
        '<p class="msg">' + message + '</p>' +
        '<table class="table">' +
          '<tr><td>Student Name</td><td>' + escapeHtml(studentName) + '</td></tr>' +
          '<tr><td>Course</td><td>' + escapeHtml(courseName) + '</td></tr>' +
          '<tr><td>Score</td><td>' + score + ' / ' + totalQ + ' (' + pct + '%)</td></tr>' +
          '<tr><td>Status</td><td><span class="badge">' + statusText + '</span></td></tr>' +
          '<tr><td>Date</td><td>' + escapeHtml(dateStr || new Date().toLocaleDateString()) + '</td></tr>' +
        '</table>' +
        '<p style="text-align:center;margin:16px 0 0;font-size:12px;color:#6d6a8a">' +
          (passed ? 'Your certificate is ready. Log in to your dashboard to access it.' : 'Review your lessons and try the assessment again. Your dashboard tracks your progress.') +
        '</p>' +
      '</div>' +
      '<div class="foot">' +
        'IDT Academy &bull; www.idtacademy.com.ng &bull; Learn Beyond Limits' +
      '</div>' +
    '</div>' +
  '</div></body></html>';
}

export const onRequestPost = async function(context) {
  var env = context.env;
  try {
    var body;
    try { body = await context.request.json(); } catch (err) { return json({ success: false, error: 'Invalid JSON' }, 400); }
    var email = body.email || body.to_email || '';
    var studentName = body.full_name || body.to_name || 'Student';
    var courseName = body.course_name || 'Course';
    var score = Number(body.score || body.passed_questions || 0);
    var totalQ = Number(body.total_questions || 5);
    var pct = Number(body.pct || Math.round((score / Math.max(1, totalQ)) * 100));
    var passed = body.passed === true || body.passed === 'true' || body.passed === 1;
    var dateStr = body.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    if (!env.SENDER_EMAIL || !env.SERVICE_ID || !env.PUBLIC_KEY || !env.PRIVATE_KEY || !env.TEMPLATE_ID) {
      return json({ success: false, error: 'Email service not fully configured. Check env vars.' }, 500);
    }
    var userData = await fetchUserFromSupabase(env, email, studentName);
    var displayName = (userData && userData.full_name) || studentName;
    var emailHtml = buildHtmlEmail(displayName, courseName, score, totalQ, pct, passed, dateStr);
    var payload = {
      service_id: env.SERVICE_ID,
      template_id: env.TEMPLATE_ID,
      user_id: env.PUBLIC_KEY,
      accessToken: env.PRIVATE_KEY,
      template_params: {
        to_email: email,
        to_name: displayName,
        from_name: 'IDT Academy',
        subject: 'Assessment Result - ' + displayName + ' (' + (passed ? 'PASSED' : 'NOT PASSED') + ')',
        message_html: emailHtml,
        message: 'Assessment result for ' + displayName + '\nCourse: ' + courseName + '\nScore: ' + score + '/' + totalQ + ' (' + pct + '%)\nStatus: ' + (passed ? 'PASSED' : 'NOT PASSED') + '\n\nView full result on your dashboard.',
        score: String(score),
        total: String(totalQ),
        percentage: String(pct),
        status: passed ? 'PASSED' : 'NOT PASSED',
        course: courseName,
        date: dateStr
      }
    };
    var emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var emailData;
    try { emailData = await emailRes.json(); } catch (err) { emailData = null; }
    if (!emailRes.ok && emailRes.status !== 200) {
      var errMsg = emailData && emailData.error ? emailData.error : 'EmailJS error ' + emailRes.status;
      throw new Error(errMsg);
    }
    return json({
      success: true,
      message: 'Assessment result sent to ' + email,
      to: email,
      student: displayName,
      status: passed ? 'passed' : 'not_passed'
    });
  } catch (err) {
    return json({ success: false, error: err.message || 'Email send failed', message: 'Could not send email. Please try again.' }, 500);
  }
};

export const onRequestOptions = async function() {
  return new Response(null, { status: 204, headers: CORS });
};
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
  });
}

function sbUrl(env) {
  const base = env.SUPABASE_URL || 'https://orhgklhfltsfdumrrhup.supabase.co';
  return base.endsWith('/') ? base + 'rest/v1/' : base + '/rest/v1/';
}

function sbHeaders(env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function cleanBase64(str) {
  if (!str) return '';
  const s = String(str);
  const idx = s.indexOf('base64,');
  return idx === -1 ? s : s.slice(idx + 7);
}

function formatDate(iso) {
  if (!iso) return '-';
  const s = String(iso);
  const d = s.length <= 10 ? new Date(s + 'T00:00:00') : new Date(s);
  if (isNaN(d.getTime())) return '-';
  const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  if (s.length <= 10) return day;
  return day + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

async function saveExamEntries(env, userId, entries) {
  const base = sbUrl(env);
  const headers = sbHeaders(env);

  try {
    const url = base + 'user_profiles?id=eq.' + encodeURIComponent(userId) + '&select=user_data';
    const r = await fetch(url, { headers });
    const rows = await r.json();

    if (Array.isArray(rows) && rows.length) {
      const ud = (rows[0].user_data && typeof rows[0].user_data === 'object') ? rows[0].user_data : {};
      const arr = Array.isArray(ud.exam_data) ? ud.exam_data : [];

      entries.forEach((e) => arr.push(e));
      ud.exam_data = arr.slice(-30);

      const last = entries[entries.length - 1] || {};
      if (last.passed === true && last.pct != null) {
        ud.exam_grade = Number(last.pct) + '%';
        ud.level_completed = 'final';
      }

      const patchUrl = base + 'user_profiles?id=eq.' + encodeURIComponent(userId);
      const patch = await fetch(patchUrl, { method: 'PATCH', headers, body: JSON.stringify({ user_data: ud }) });
      
      if (patch.ok) {
        return true;
      }
    }
  } catch (err) {}

  try {
    const jambUrl = base + 'jambdata?id=eq.' + encodeURIComponent(userId) + '&select=jamb_data';
    const r2 = await fetch(jambUrl, { headers });
    const rows2 = await r2.json();

    if (Array.isArray(rows2) && rows2.length) {
      const jd = (rows2[0].jamb_data && typeof rows2[0].jamb_data === 'object') ? rows2[0].jamb_data : {};
      const arr = Array.isArray(jd.exam_data) ? jd.exam_data : [];
      entries.forEach((e) => arr.push(e));
      jd.exam_data = arr.slice(-30);

      const patchJamb = await fetch(base + 'jambdata?id=eq.' + encodeURIComponent(userId), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ jamb_data: jd })
      });
      return patchJamb.ok;
    }
  } catch (err) {}

  return false;
}

async function readUserInfo(env, userId) {
  const base = sbUrl(env);
  const headers = sbHeaders(env);

  try {
    const r = await fetch(base + 'user_profiles?id=eq.' + encodeURIComponent(userId) + '&select=user_data', { headers });
    const rows = await r.json();

    if (Array.isArray(rows) && rows[0]) {
      const ud = rows[0].user_data || {};
      return { full_name: ud.full_name || '', email: ud.email || '', course_name: ud.course_name || '', user_data: ud };
    }
  } catch (err) {}

  return { full_name: '', email: '', course_name: '', user_data: {} };
}

function findEntry(userData, req) {
  const arr = Array.isArray(userData.exam_data) ? userData.exam_data : [];
  if (!arr.length) return null;

  if (req.exam_id) {
    const m = arr.find((e) => String(e.exam_id) === String(req.exam_id));
    if (m) return m;
  }

  if (req.score != null) {
    const m = arr.find((e) => Math.abs(Number(e.score) - Number(req.score)) < 0.01);
    if (m) return m;
  }

  if (req.date) {
    const m = arr.find((e) => String(e.date).indexOf(String(req.date)) === 0);
    if (m) return m;
  }

  return arr[arr.length - 1];
}

function buildEmailHtml(info) {
  const passed = info.passed === true;
  const score = Number(info.score || 0).toFixed(1);
  const pct = Number(info.pct || 0);
  const statusText = passed ? 'PASSED' : 'NOT PASSED';
  const statusColor = passed ? '#10b981' : '#f43f5e';
  const qs = Array.isArray(info.questions) ? info.questions : [];

  let rows = '';
  qs.forEach((q, i) => {
    const ok = q.is_correct === true;
    const sk = !String(q.user_answer || '').trim();
    const mark = ok ? '✔' : (sk ? '—' : '✖');
    const color = ok ? '#10b981' : (sk ? '#94a3b8' : '#f43f5e');
    const earned = Number(q.earned || 0).toFixed(1);
    const marks = Number(q.marks || (String(q.type) === 'write' ? 2.5 : 1.5)).toFixed(1);

    rows += '<tr>' +
      '<td style="padding:8px 10px;border-bottom:1px solid #f0efff;color:' + color + ';font-weight:800;white-space:nowrap;font-size:12px">Q' + (i + 1) + ' ' + mark + '</td>' +
      '<td style="padding:8px 10px;border-bottom:1px solid #f0efff;color:#1e1b4b;font-size:12px;line-height:1.5">' + escapeHtml(String(q.question || '').slice(0, 90)) + '</td>' +
      '<td style="padding:8px 10px;border-bottom:1px solid #f0efff;color:#6d6a8a;font-size:12px;line-height:1.5">' + escapeHtml(String(q.user_answer || '(no answer)').slice(0, 60)) + '</td>' +
      '<td style="padding:8px 10px;border-bottom:1px solid #f0efff;color:#7c3aed;font-weight:800;white-space:nowrap;font-size:12px;text-align:right">' + earned + '/' + marks + '</td>' +
      '</tr>';
  });

  const qBlock = qs.length
    ? '<div style="background:#ffffff;border:1px solid #ece8ff;border-radius:16px;overflow:hidden;margin:16px 0">' +
      '<table style="width:100%;border-collapse:collapse">' +
      '<tr>' +
      '<td style="padding:11px 12px;background:#f4f1ff;color:#6d28d9;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.5px">Q</td>' +
      '<td style="padding:11px 12px;background:#f4f1ff;color:#6d28d9;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.5px">Question</td>' +
      '<td style="padding:11px 12px;background:#f4f1ff;color:#6d28d9;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.5px">Your Answer</td>' +
      '<td style="padding:11px 12px;background:#f4f1ff;color:#6d28d9;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.5px;text-align:right">Marks</td>' +
      '</tr>' + rows + '</table></div>'
    : '';

  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#f8f6ff;border-radius:20px;overflow:hidden;border:1px solid #ece8ff">' +
    '<div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:26px 24px;text-align:center">' +
    '<img src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy" style="width:68px;height:68px;border-radius:50%;background:#ffffff;padding:7px;display:inline-block">' +
    '<h1 style="color:#ffffff;margin:12px 0 2px;font-size:20px;font-weight:900">IDT Academy</h1>' +
    '<p style="color:#c4b5fd;margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase">Learn Beyond Limits</p>' +
    '</div>' +
    '<div style="padding:24px">' +
    '<h2 style="color:#1e1b4b;font-size:16px;font-weight:900;text-align:center;margin:0 0 14px;letter-spacing:.5px">FINAL EXAM RESULT</h2>' +
    '<div style="background:#ffffff;border:1px solid #ece8ff;border-radius:16px;padding:16px;margin-bottom:14px">' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
    '<tr><td style="padding:5px 0;color:#6d6a8a">Student</td><td style="padding:5px 0;color:#1e1b4b;font-weight:800;text-align:right">' + escapeHtml(info.fullName || 'Student') + '</td></tr>' +
    '<tr><td style="padding:5px 0;color:#6d6a8a">Course</td><td style="padding:5px 0;color:#1e1b4b;font-weight:800;text-align:right">' + escapeHtml(info.courseName || '-') + '</td></tr>' +
    '<tr><td style="padding:5px 0;color:#6d6a8a">Date</td><td style="padding:5px 0;color:#1e1b4b;font-weight:800;text-align:right">' + escapeHtml(formatDate(info.date)) + '</td></tr>' +
    '<tr><td style="padding:5px 0;color:#6d6a8a">Score</td><td style="padding:5px 0;color:#1e1b4b;font-weight:800;text-align:right">' + score + ' / 100</td></tr>' +
    '<tr><td style="padding:5px 0;color:#6d6a8a">Percentage</td><td style="padding:5px 0;color:#1e1b4b;font-weight:800;text-align:right">' + pct + '%</td></tr>' +
    '<tr><td style="padding:5px 0;color:#6d6a8a">Status</td><td style="padding:5px 0;font-weight:900;text-align:right;color:' + statusColor + '">' + statusText + '</td></tr>' +
    '</table></div>' + qBlock +
    '<div style="text-align:center;margin-top:18px">' +
    '<a href="https://www.idtacademy.com.ng" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:13px;font-weight:800;font-size:13px">Visit IDT Academy</a>' +
    '</div>' +
    '<p style="color:#6d6a8a;font-size:11px;text-align:center;margin:18px 0 0;line-height:1.6">Your full result PDF is attached to this email.<br>IDT Academy • Official Examination Document</p>' +
    '</div></div>';
}

async function handleEmail(env, req, userId) {
  const info = await readUserInfo(env, userId);
  const email = String(req.email || info.email || '').trim().toLowerCase();
  const fullName = String(req.full_name || info.full_name || '').trim() || 'Student';
  const courseName = String(req.course_name || info.course_name || '');

  if (!email) return json({ success: false, error: 'No email found for this user' }, 400);

  const entry = findEntry(info.user_data, req);
  const questions = Array.isArray(req.questions) ? req.questions : (entry && Array.isArray(entry.questions) ? entry.questions : []);
  const score = Number(req.score != null ? req.score : (entry ? entry.score : 0)) || 0;
  const pct = Number(req.pct != null ? req.pct : (entry ? entry.pct : 0)) || 0;
  const passed = req.passed === true || req.passed === 'true' || (entry && entry.passed === true) || false;
  const dateStr = String(req.date || (entry && entry.date) || new Date().toISOString());

  const html = buildEmailHtml({ fullName: fullName, courseName: courseName, score: score, pct: pct, passed: passed, date: dateStr, questions: questions });

  const serviceId = env.EMAILJS_SERVICE_ID || env.SERVICE_ID || '';
  const templateId = env.EMAILJS_TEMPLATE_ID || env.TEMPLATE_ID || '';
  const publicKey = env.EMAILJS_PUBLIC_KEY || env.PUBLIC_KEY || '';
  const privateKey = env.EMAILJS_PRIVATE_KEY || env.PRIVATE_KEY || '';
  const senderEmail = env.SENDER_EMAIL || '';

  if (!serviceId || !templateId || !publicKey) {
    return json({ success: false, error: 'EmailJS is not configured' }, 500);
  }

  const statusText = passed ? 'PASSED' : 'NOT PASSED';
  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey,
    template_params: {
      to_email: email,
      to_name: fullName,
      from_email: senderEmail || email,
      from_name: 'IDT Academy',
      subject: 'IDT Academy - Final Exam Result (' + statusText + ')',
      html: html,
      course_name: courseName,
      score: Number(score).toFixed(1),
      pct: String(pct),
      passed: statusText,
      date: formatDate(dateStr)
    }
  };

  const pdf = cleanBase64(String(req.pdf_base64 || ''));
  if (pdf) {
    payload.attachments = [{ name: 'IDT_Exam_Result.pdf', data: pdf, type: 'application/pdf' }];
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
}

export const onRequestPost = async (context) => {
  const env = context.env;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' }, 500);
  }

  try {
    let body;
    try {
      body = await context.request.json();
    } catch (err) {
      return json({ success: false, error: 'Invalid JSON body' }, 400);
    }

    const userId = String(body.user_id || body.id || '').trim();
    if (!userId) return json({ success: false, error: 'user_id is required' }, 400);

    const action = String(body.action || '');
    if (action === 'email') {
      return await handleEmail(env, body, userId);
    }

    const rawEntry = body.exam_data;
    if (!rawEntry) return json({ success: false, error: 'exam_data is required' }, 400);

    const entries = Array.isArray(rawEntry) ? rawEntry : [rawEntry];
    for (const e of entries) {
      if (!e || typeof e !== 'object') return json({ success: false, error: 'Invalid exam_data entry' }, 400);
    }

    const saved = await saveExamEntries(env, userId, entries);
    if (!saved) return json({ success: false, error: 'Could not save exam data' }, 502);

    return json({ success: true, saved: true });

  } catch (err) {
    return json({ success: false, error: err.message || 'Server error' }, 500);
  }
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS });
};
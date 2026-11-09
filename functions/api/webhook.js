const TOLERANCE = 20;
const REFERRAL_MIN_AMOUNT = 5000;
const REFERRAL_BONUS = 1500;
const JAMB_BONUS = 300;
const NOTIFY_URL = 'https://www.idtacademy.com.ng/complet';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-paystack-signature, x-admin-code'
};

class BizError extends Error {
  constructor(code, message, extra) {
    super(message);
    this.code = code;
    this.extra = extra || {};
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS)
  });
}

export async function onRequest(context) {
  const request = context.request;
  const env = context.env;
  const ctx = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url = new URL(request.url);
  const adminAction = url.searchParams.get('admin');
  if (adminAction) return handleAdmin(request, env, ctx, url, adminAction);

  if (request.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);

  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature') || '';
    if (!signature) return json({ success: false, message: 'Missing signature' }, 401);

    const secret = env.PAY_SECRET_KEY || '';
    if (!secret) return json({ success: false, message: 'Server not configured' }, 500);

    if (!(await verifyPaystackSignature(body, signature, secret))) {
      return json({ success: false, message: 'Invalid signature' }, 401);
    }

    const event = JSON.parse(body);
    const data = event.data || {};
    if (event.event === 'charge.success' && data.status === 'success') {
      await handlePaymentSuccess(env, ctx, data);
    }
    return json({ success: true });
  } catch (err) {
    return json({ success: false, message: err.message }, 500);
  }
}

async function verifyPaystackSignature(body, signature, secret) {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
    const buf = await crypto.subtle.sign('HMAC', key, enc.encode(body));
    const hex = Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    return hex === signature.toLowerCase();
  } catch (e) {
    return false;
  }
}

function restBase(env) {
  const b = env.SUPABASE_URL || 'https://orhgklhfltsfdumrrhup.supabase.co';
  return (b.endsWith('/') ? b : b + '/') + 'rest/v1/';
}

async function sb(env, method, path, body, prefer) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(restBase(env) + path, {
    method: method,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: prefer || 'return=representation'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) throw new Error('Supabase ' + res.status + ': ' + text.slice(0, 300));
  try { return text ? JSON.parse(text) : []; } catch (e) { return []; }
}

function bg(ctx, promise) {
  const p = promise.catch(function () {});
  if (ctx && ctx.waitUntil) ctx.waitUntil(p);
}

function notify(ctx, payload) {
  bg(ctx, fetch(NOTIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }));
}

const enc = encodeURIComponent;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function likeEscape(s) {
  return s.replace(/[\\%_]/g, '\\$&');
}

async function logPending(env, rec) {
  try {
    await sb(env, 'POST', 'pending_payments?on_conflict=reference', rec, 'resolution=ignore-duplicates,return=minimal');
  } catch (e) {
    console.error('pending log failed: ' + e.message);
  }
}

async function findAccount(env, emails, userId) {
  const tables = [
    { table: 'user_profiles', col: 'user_data', partner: false },
    { table: 'partner_profiles', col: 'partner_data', partner: true }
  ];

  if (userId && UUID_RE.test(userId)) {
    for (let i = 0; i < tables.length; i++) {
      try {
        const r = await sb(env, 'GET', tables[i].table + '?select=*&id=eq.' + enc(userId));
        if (r[0]) return { row: r[0], partner: tables[i].partner };
      } catch (e) {}
    }
  }

  for (let i = 0; i < emails.length; i++) {
    const wanted = norm(emails[i]);
    if (!wanted) continue;
    for (let j = 0; j < tables.length; j++) {
      const t = tables[j];
      const pattern = '*' + likeEscape(wanted) + '*';
      const r = await sb(env, 'GET',
        t.table + '?select=*&' + t.col + '->>email=ilike.' + enc(pattern) + '&limit=25');
      for (let k = 0; k < r.length; k++) {
        const stored = norm((r[k][t.col] || {}).email);
        if (stored === wanted) return { row: r[k], partner: t.partner };
      }
    }
  }
  return null;
}

async function handlePaymentSuccess(env, ctx, data) {
  const reference = String(data.reference || '').trim();
  if (!reference) return;

  const meta = data.metadata && typeof data.metadata === 'object' ? data.metadata : {};
  const payEmail = norm(data.customer && data.customer.email);
  const metaEmail = norm(meta.email);
  const emails = [payEmail, metaEmail].filter(function (e, i, a) { return e && a.indexOf(e) === i; });

  const p = {
    reference: reference,
    emails: emails,
    userId: String(meta.user_id || '').trim(),
    amountPaid: Math.round(Number(data.amount || 0) / 100)
  };

  try {
    const done = await sb(env, 'GET', 'completepay?select=id&complete_pay->>reference=eq.' + enc(reference));
    if (done.length === 0) {
      await processPayment(env, ctx, p, {});
    }
  } catch (err) {
    const biz = err instanceof BizError;
    await logPending(env, {
      reference: reference,
      base_reference: reference,
      email: payEmail || metaEmail || null,
      user_id: p.userId || null,
      amount_paid: p.amountPaid,
      expected_price: biz && err.extra.expected ? err.extra.expected : 0,
      issue_code: biz ? err.code : 'SYSTEM_ERROR',
      issue_message: err.message,
      paystack_data: {
        channel: data.channel || null,
        paid_at: data.paid_at || null,
        currency: data.currency || null,
        metadata: meta
      },
      status: 'pending'
    });

    if (biz) return;
    throw err;
  }
}

async function processPayment(env, ctx, p, opts) {
  const force = !!opts.force;
  const acc = await findAccount(env, p.emails, p.userId);
  if (!acc) {
    throw new BizError('USER_NOT_FOUND', 'Babu user ko partner mai wannan email a database: ' + (p.emails.join(', ') || '(babu email)'));
  }

  const row = acc.row;

  if (acc.partner) {
    if (opts.referralOnly) return;
    const pd = Object.assign({}, row.partner_data || {});
    pd.status = 'active';
    await sb(env, 'PATCH', 'partner_profiles?id=eq.' + enc(row.id), { partner_data: pd });
    await recordPayment(env, p, row.id, {
      partner_id: row.id, full_name: pd.full_name || '', email: norm(pd.email) || p.emails[0] || '',
      account_type: 'partner'
    });
    return;
  }

  const ud = Object.assign({}, row.user_data || {});
  const email = norm(ud.email) || p.emails[0] || '';
  const isJamb = ud.course_type === 'jamb';
  const expected = Number(isJamb ? ud.jambCoursePrice : ud.course_price) || 0;
  const paidEnough = expected > 0 && p.amountPaid >= expected - TOLERANCE;

  if (!opts.referralOnly) {
    if (!force) {
      if (expected <= 0) {
        throw new BizError('NO_PRICE', 'Babu farashin course a profile din user (course_price / jambCoursePrice = 0)');
      }
      if (!paidEnough) {
        throw new BizError('AMOUNT_SHORT',
          'Ya biya N' + p.amountPaid + ' amma farashin course N' + expected + ' (an yarda da gibin N' + TOLERANCE + ' kawai)',
          { expected: expected });
      }
    }

    if (isJamb) {
      ud.payment_no = 'yes';
    } else {
      ud.status = 'active';
      ud.payment_no = p.reference;
    }
    await sb(env, 'PATCH', 'user_profiles?id=eq.' + enc(row.id), { user_data: ud });

    const created = await recordPayment(env, p, row.id, {
      user_id: row.id, full_name: ud.full_name || '', email: email,
      course_id: ud.course_id || '', course_name: ud.course_name || '',
      course_price: expected || p.amountPaid
    });
    if (created) {
      notify(ctx, {
        type: 'payment', full_name: ud.full_name || 'Student', email: email,
        course_name: ud.course_name || 'Course', course_price: expected || p.amountPaid,
        amount_paid: p.amountPaid, reference: p.reference
      });
    }
  }

  const refCode = String(ud.referred_by || '').trim().toUpperCase();
  const bonus = isJamb ? JAMB_BONUS : (p.amountPaid >= REFERRAL_MIN_AMOUNT ? REFERRAL_BONUS : 0);
  if (refCode && refCode !== 'N/A' && bonus > 0 && (paidEnough || force)) {
    try {
      await payReferral(env, ctx, ud, email, p.amountPaid, refCode, bonus, expected);
    } catch (err) {
      await logPending(env, {
        reference: p.reference + ':ref',
        base_reference: p.reference,
        email: email,
        user_id: row.id,
        amount_paid: p.amountPaid,
        expected_price: expected,
        issue_code: err instanceof BizError ? err.code : 'REFERRAL_FAILED',
        issue_message: 'An kunna user amma referral bonus (N' + bonus + ', code ' + refCode + ') bai shiga ba: ' + err.message,
        status: 'pending'
      });
      if (opts.referralOnly) throw err;
    }
  }
}

async function payReferral(env, ctx, ud, email, amountPaid, code, bonus, price) {
  const kinds = ['partner', 'user'];
  for (let i = 0; i < kinds.length; i++) {
    const r = await sb(env, 'POST', 'rpc/credit_referral', {
      p_kind: kinds[i],
      p_code: code,
      p_referred_email: email,
      p_referred_name: ud.full_name || 'Student',
      p_course_name: ud.course_name || 'Selected Course',
      p_course_price: price || amountPaid,
      p_bonus: bonus
    });
    if (r && r.credited) {
      notify(ctx, {
        type: 'referral_bonus',
        full_name: r.full_name || 'Partner',
        email: r.email || '',
        referral_bonus: bonus,
        referred_name: ud.full_name || 'Student',
        referred_course: ud.course_name || 'Selected Course',
        referral_link: r.referral_link || ''
      });
      return;
    }
    if (r && r.reason === 'already_completed') return;
  }
  throw new BizError('REFERRER_NOT_FOUND', 'Ba a sami wanda ke da referral code "' + code + '" ba');
}

async function paymentExists(env, reference) {
  const r = await sb(env, 'GET', 'completepay?select=id&complete_pay->>reference=eq.' + enc(reference));
  return r.length > 0;
}

async function recordPayment(env, p, ownerId, extra) {
  if (await paymentExists(env, p.reference)) return false;

  const now = new Date().toISOString();
  const complete_pay = Object.assign({
    amount_paid: p.amountPaid, reference: p.reference, status: 'success', paid_at: now
  }, extra);

  try {
    await sb(env, 'POST', 'completepay', { id: ownerId, complete_pay: complete_pay, date_complet: now });
  } catch (e) {
    if (await paymentExists(env, p.reference)) return false;
    await sb(env, 'POST', 'completepay', { id: crypto.randomUUID(), complete_pay: complete_pay, date_complet: now });
  }
  return true;
}

async function handleAdmin(request, env, ctx, url, action) {
  const adminCode = request.headers.get('x-admin-code') || '';
  if (!/^[0-9]{6}$/.test(adminCode)) return json({ error: 'Incorrect code. Access denied.' }, 401);

  let verdict;
  try {
    verdict = await sb(env, 'POST', 'rpc/verify_admin_code', { p_code: adminCode });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
  if (verdict === 'locked') return json({ error: 'Too many wrong attempts. Try again in 15 minutes.' }, 429);
  if (verdict !== 'ok') return json({ error: 'Incorrect code. Access denied.' }, 401);

  try {
    if (action === 'list' && request.method === 'GET') {
      const status = url.searchParams.get('status') || 'pending';
      const rows = await sb(env, 'GET',
        'pending_payments?select=*&status=eq.' + enc(status) + '&order=created_at.desc&limit=200');
      return json({ rows: rows });
    }

    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const body = await request.json().catch(function () { return {}; });
    const id = String(body.id || '');
    if (!UUID_RE.test(id)) return json({ error: 'Invalid id' }, 400);

    const rows = await sb(env, 'GET', 'pending_payments?select=*&id=eq.' + enc(id));
    const row = rows[0];
    if (!row) return json({ error: 'Ba a sami record ba' }, 404);
    if (row.status !== 'pending') return json({ error: 'An riga an warware wannan (' + row.status + ')' }, 409);

    const now = new Date().toISOString();

    if (action === 'reject') {
      await sb(env, 'PATCH', 'pending_payments?id=eq.' + enc(id), {
        status: 'rejected', resolved_at: now, resolved_by: 'admin', admin_note: String(body.note || '')
      });
      return json({ success: true });
    }

    if (action === 'confirm') {
      const fixEmail = norm(body.email);
      const isRefOnly = row.issue_code === 'REFERRAL_FAILED' || row.issue_code === 'REFERRER_NOT_FOUND';
      const p = {
        reference: row.base_reference || row.reference,
        emails: [fixEmail, norm(row.email)].filter(function (e, i, a) { return e && a.indexOf(e) === i; }),
        userId: fixEmail ? '' : (row.user_id || ''),
        amountPaid: Number(row.amount_paid) || 0
      };
      await processPayment(env, ctx, p, { force: true, referralOnly: isRefOnly });
      await sb(env, 'PATCH', 'pending_payments?id=eq.' + enc(id), {
        status: 'resolved', resolved_at: now, resolved_by: 'admin',
        email: fixEmail || row.email, admin_note: String(body.note || '')
      });
      return json({ success: true });
    }

    return json({ error: 'Not found' }, 404);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

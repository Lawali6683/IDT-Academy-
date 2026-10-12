const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const DEFAULT_SUPABASE_URL = 'https://orhgklhfltsfdumrrhup.supabase.co';

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra || null;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS }
  });
}

function enc(v) {
  return encodeURIComponent(String(v));
}

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 200);
}

function sbBase(env) {
  return String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '') + '/rest/v1/';
}

async function sbFetch(env, path, options) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new HttpError(500, 'The server database key is not configured.');
  const opts = options || {};
  const res = await fetch(sbBase(env) + path, Object.assign({}, opts, {
    headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, opts.headers || {})
  }));
  if (!res.ok) throw new HttpError(502, 'Database error ' + res.status + '. Please try again.');
  return res;
}

async function sbJson(env, path) {
  const res = await sbFetch(env, path);
  return res.json().catch(function () { return []; });
}

async function getUpdate(env, userId) {
  const rows = await sbJson(env, 'update?id=eq.' + enc(userId) + '&select=uset_update');
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  return row && row.uset_update && typeof row.uset_update === 'object' ? row.uset_update : {};
}

async function putUpdate(env, userId, obj) {
  await sbFetch(env, 'update?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: userId, uset_update: obj })
  });
}

async function getProfile(env, userId) {
  const rows = await sbJson(env, 'user_profiles?id=eq.' + enc(userId) + '&select=*');
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (!row) throw new HttpError(404, 'Your profile was not found.');
  return row;
}

async function patchUserData(env, userId, fn) {
  const row = await getProfile(env, userId);
  const ud = row.user_data && typeof row.user_data === 'object' ? row.user_data : {};
  const result = fn(ud);
  await sbFetch(env, 'user_profiles?id=eq.' + enc(userId), {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_data: ud })
  });
  return result;
}

function parseCourseData(row) {
  let cd = row && row.course_data;
  if (typeof cd === 'string') {
    try { cd = JSON.parse(cd); } catch (err) { cd = null; }
  }
  return cd && typeof cd === 'object' ? cd : {};
}

function yearOf(name) {
  return /year\s*[-_]?\s*2|second\s+year|\by2\b/i.test(String(name || '')) ? 2 : 1;
}

function baseName(name) {
  return String(name || '').toLowerCase()
    .replace(/year\s*[-_]?\s*[12]|first\s+year|second\s+year|\by[12]\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '');
}

async function listCourses(env) {
  const rows = await sbJson(env, 'courses?select=*');
  return (Array.isArray(rows) ? rows : []).map(function (row) {
    const cd = parseCourseData(row);
    return {
      id: String(row.id),
      name: String(cd.course_name || ''),
      number: String(cd.course_number || ''),
      price: Number(cd.price || cd.course_price || 0),
      image: String(cd.image_url || ''),
      category: String(cd.category || '')
    };
  });
}

async function findYear2Course(env, fromCourse, wantedId) {
  const all = await listCourses(env);
  const base = baseName(fromCourse.name);
  const y2 = all.filter(function (c) { return c.category === '4' && yearOf(c.name) === 2; });
  let cands = y2.filter(function (c) { return baseName(c.name) === base; });
  if (!cands.length && y2.length === 1) cands = y2;
  if (!cands.length) throw new HttpError(404, 'We could not find the Year 2 course for your diploma. Please contact support.');
  if (wantedId) {
    const wanted = cands.find(function (c) { return c.id === wantedId; });
    if (wanted) return wanted;
  }
  return cands[0];
}

function slotFor(ud, courseId) {
  for (let n = 2; n <= 20; n++) {
    if (String(ud[n + 'course_id'] || '') === courseId) return n;
  }
  for (let n = 2; n <= 20; n++) {
    if (!String(ud[n + 'course_id'] || '').trim()) return n;
  }
  throw new HttpError(409, 'No free course slot is available on your account.');
}

async function fromCourseInfo(env, ud, fromId) {
  const rows = await sbJson(env, 'courses?id=eq.' + enc(fromId) + '&select=*');
  const cd = parseCourseData(rows[0]);
  return {
    id: fromId,
    name: String(cd.course_name || ud.course_name || ''),
    price: Number(cd.price || cd.course_price || 0)
  };
}

function ownsCourse(ud, courseId) {
  if (String(ud.course_id || '') === courseId) return true;
  for (let n = 2; n <= 20; n++) if (String(ud[n + 'course_id'] || '') === courseId) return true;
  return false;
}

async function actionPrepare(env, body) {
  const userId = clean(body.user_id, 80);
  const fromId = clean(body.from_course_id, 120);
  if (!userId || !fromId) throw new HttpError(400, 'user_id and from_course_id are required.');
  const row = await getProfile(env, userId);
  const ud = row.user_data && typeof row.user_data === 'object' ? row.user_data : {};
  if (!ownsCourse(ud, fromId)) throw new HttpError(403, 'This course is not on your account.');
  const from = await fromCourseInfo(env, ud, fromId);
  if (yearOf(from.name) !== 1) throw new HttpError(400, 'Year 2 can only be added after Year 1.');
  const upd = await getUpdate(env, userId);
  const passed = upd.exam && upd.exam.passed && upd.exam.passed[fromId + '__y1'];
  if (!passed) throw new HttpError(403, 'Pass your Year 1 exam first.');
  const target = await findYear2Course(env, from, clean(body.course_id, 120));
  const slot = slotFor(ud, target.id);
  const price = Number(ud.course_price) > 0 ? Number(ud.course_price) : (from.price > 0 ? from.price : target.price);
  if (!(price > 0)) throw new HttpError(400, 'The Year 2 price could not be found.');
  const state = await patchUserData(env, userId, function (u) {
    const existing = String(u[slot + 'course_id'] || '') === target.id;
    const flag = 'course' + slot + 'payment1';
    if (!existing) {
      u[slot + 'course_id'] = target.id;
      u[slot + 'course_name'] = target.name;
      u[slot + 'course_number'] = target.number || '000';
      u[slot + 'course_price'] = price;
      u[slot + 'course_status'] = 'pending';
      u[flag] = 'no';
    } else if (u[flag] !== 'yes') {
      u[flag] = 'no';
      u[slot + 'course_price'] = price;
    }
    return { payment: String(u[flag] || 'no'), status: String(u[slot + 'course_status'] || 'pending') };
  });
  return json({
    success: true,
    slot: slot,
    course: { id: target.id, name: target.name, number: target.number, price: price, image: target.image },
    payment: state.payment,
    status: state.status
  });
}

async function verifyWithPaystack(env, reference, userId, courseId, price) {
  const secret = env.PAY_SECRET_KEY;
  if (!secret || !reference) return false;
  try {
    const res = await fetch('https://api.paystack.co/transaction/verify/' + enc(reference), {
      headers: { Authorization: 'Bearer ' + secret }
    });
    const data = await res.json();
    const tx = data && data.data ? data.data : null;
    if (!tx || tx.status !== 'success') return false;
    const meta = tx.metadata && typeof tx.metadata === 'object' ? tx.metadata : {};
    if (String(meta.user_id || '') !== userId) return false;
    if (String(meta.course_id || '') !== courseId) return false;
    return Number(tx.amount || 0) >= Math.round(price * 100);
  } catch (err) {
    return false;
  }
}

async function actionCheck(env, body) {
  const userId = clean(body.user_id, 80);
  const slot = Math.floor(Number(body.slot) || 0);
  if (!userId || slot < 2 || slot > 20) throw new HttpError(400, 'user_id and a valid slot are required.');
  const row = await getProfile(env, userId);
  const ud = row.user_data && typeof row.user_data === 'object' ? row.user_data : {};
  const courseId = String(ud[slot + 'course_id'] || '');
  if (!courseId) throw new HttpError(404, 'This course slot is empty.');
  const flag = 'course' + slot + 'payment1';
  let paid = String(ud[flag] || '') === 'yes';
  if (!paid && body.reference) {
    const price = Number(ud[slot + 'course_price'] || 0);
    const ok = await verifyWithPaystack(env, clean(body.reference, 80), userId, courseId, price);
    if (ok) {
      await patchUserData(env, userId, function (u) {
        u[flag] = 'yes';
      });
      paid = true;
    }
  }
  return json({ success: true, paid: paid, status: String(ud[slot + 'course_status'] || 'pending') });
}

async function actionActivate(env, body) {
  const userId = clean(body.user_id, 80);
  const slot = Math.floor(Number(body.slot) || 0);
  if (!userId || slot < 2 || slot > 20) throw new HttpError(400, 'user_id and a valid slot are required.');
  const flag = 'course' + slot + 'payment1';
  const out = await patchUserData(env, userId, function (u) {
    if (String(u[flag] || '') !== 'yes') return null;
    if (String(u[slot + 'course_status'] || '') !== 'active') {
      u[slot + 'course_status'] = 'active';
      u[slot + 'course_date'] = new Date().toISOString();
      u[slot + 'course_paid'] = Number(u[slot + 'course_price'] || 0);
    }
    return { id: String(u[slot + 'course_id'] || '') };
  });
  if (!out) throw new HttpError(402, 'Your payment has not been confirmed yet.');
  const upd = await getUpdate(env, userId);
  upd.last_course = out.id;
  await putUpdate(env, userId, upd);
  return json({ success: true, course_id: out.id, slot: slot, status: 'active' });
}

export const onRequestPost = async function (context) {
  const env = context.env;
  try {
    let body;
    try {
      body = await context.request.json();
    } catch (err) {
      return json({ success: false, error: 'Invalid request data.' }, 400);
    }
    if (!body || typeof body !== 'object') return json({ success: false, error: 'Invalid request data.' }, 400);
    const action = String(body.action || 'prepare').trim().toLowerCase();
    if (action === 'prepare') return await actionPrepare(env, body);
    if (action === 'check') return await actionCheck(env, body);
    if (action === 'activate') return await actionActivate(env, body);
    return json({ success: false, error: 'Unknown action.' }, 400);
  } catch (err) {
    if (err instanceof HttpError) return json(Object.assign({ success: false, error: err.message }, err.extra || {}), err.status);
    return json({ success: false, error: 'Something went wrong on the server. Please try again.' }, 500);
  }
};

export const onRequestOptions = async function () {
  return new Response(null, { status: 204, headers: CORS });
};

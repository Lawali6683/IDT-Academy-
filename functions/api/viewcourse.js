const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const DEFAULT_SUPABASE_URL = 'https://orhgklhfltsfdumrrhup.supabase.co';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

async function sbJson(env, path) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new HttpError(500, 'The server database key is not configured.');
  const res = await fetch(sbBase(env) + path, {
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new HttpError(502, 'Database error ' + res.status + '. Please try again.');
  return res.json().catch(function () { return []; });
}

async function getProfile(env, userId) {
  const rows = await sbJson(env, 'user_profiles?id=eq.' + enc(userId) + '&select=*');
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (!row) throw new HttpError(404, 'Your profile was not found.');
  return row;
}

async function getUpdate(env, userId) {
  const rows = await sbJson(env, 'update?id=eq.' + enc(userId) + '&select=uset_update');
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  return row && row.uset_update && typeof row.uset_update === 'object' ? row.uset_update : {};
}

function parseCourseData(row) {
  let cd = row && row.course_data;
  if (typeof cd === 'string') {
    try { cd = JSON.parse(cd); } catch (err) { cd = null; }
  }
  return cd && typeof cd === 'object' ? cd : {};
}

async function loadTopics(env, courseId) {
  const rows = await sbJson(env, 'all_couse_post?id=eq.' + enc(courseId) + '&select=all_course');
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  let list = [];
  if (row && row.all_course) {
    let ac = row.all_course;
    if (typeof ac === 'string') {
      try { ac = JSON.parse(ac); } catch (err) { ac = null; }
    }
    if (Array.isArray(ac)) list = ac;
    else if (ac && Array.isArray(ac.topics)) list = ac.topics;
  }
  return list.slice().sort(function (a, b) {
    return Number(a.topic_number != null ? a.topic_number : 0) - Number(b.topic_number != null ? b.topic_number : 0);
  });
}

function ownedCourses(ud) {
  const out = [];
  const seen = {};
  const add = function (slot, id, name, number, price, status, date) {
    const cid = String(id || '').trim();
    if (!cid || cid.toUpperCase() === 'N/A' || cid.toLowerCase() === 'null' || cid.toLowerCase() === 'undefined' || seen[cid]) return;
    seen[cid] = true;
    out.push({ slot: slot, id: cid, name: String(name || ''), number: String(number || ''), price: Number(price || 0), status: String(status || '').toLowerCase(), date: date || '' });
  };
  add(1, ud.course_id, ud.course_name, ud.course_number, ud.course_price || ud.price, ud.status || 'pending', ud.date_registered || ud.created_at);
  for (let n = 2; n <= 20; n++) {
    add(n, ud[n + 'course_id'], ud[n + 'course_name'], ud[n + 'course_number'], ud[n + 'course_price'], ud[n + 'course_status'] || 'active', ud[n + 'course_date'] || ud.date_registered || ud.created_at);
  }
  return out;
}

function unlockedIndex(owned, upd, total, isDip) {
  if (total <= 0) return -1;
  const rh = upd.reading_history && typeof upd.reading_history[owned.id] === 'number' ? upd.reading_history[owned.id] : -1;
  const watched = upd.watched && Array.isArray(upd.watched[owned.id]) ? upd.watched[owned.id] : [];
  const maxWatched = watched.reduce(function (m, v) { return typeof v === 'number' && v > m ? v : m; }, -1);
  let idx = Math.max(0, rh, maxWatched);
  if (isDip) {
    const start = Date.parse(owned.date || '');
    const weeks = isFinite(start) ? Math.max(0, Math.floor((Date.now() - start) / WEEK_MS)) : 0;
    idx = Math.min(idx, weeks);
  }
  return Math.min(idx, total - 1);
}

async function resolveCourse(env, owned, upd) {
  const results = await Promise.all([
    sbJson(env, 'courses?id=eq.' + enc(owned.id) + '&select=*'),
    loadTopics(env, owned.id)
  ]);
  const cd = parseCourseData(Array.isArray(results[0]) ? results[0][0] : null);
  const topics = results[1];
  const isDip = String(cd.category || '') === '4';
  const idx = unlockedIndex(owned, upd, topics.length, isDip);
  return { cd: cd, topics: topics, isDip: isDip, idx: idx };
}

async function loadContext(env, userId) {
  if (!userId) throw new HttpError(400, 'user_id is required.');
  const profile = await getProfile(env, userId);
  const ud = profile.user_data && typeof profile.user_data === 'object' ? profile.user_data : {};
  const upd = await getUpdate(env, userId);
  const owned = ownedCourses(ud);
  const active = owned.filter(function (c) { return c.status === 'active'; });
  return { ud: ud, upd: upd, owned: owned, active: active };
}

async function actionCourses(env, body) {
  const userId = clean(body.user_id, 80);
  const ctx = await loadContext(env, userId);
  const student = { name: String(ctx.ud.full_name || 'Student'), academy_id: String(ctx.ud.academy_id || ctx.ud.academyId || userId) };
  if (!ctx.owned.length) return json({ success: true, state: 'empty', student: student, courses: [] });
  if (!ctx.active.length) {
    return json({ success: true, state: 'pending', student: student, courses: [], pending_course: ctx.owned[0].name });
  }
  const list = [];
  for (const c of ctx.active) {
    const r = await resolveCourse(env, c, ctx.upd);
    list.push({
      id: c.id,
      name: String(r.cd.course_name || c.name || 'Course'),
      number: String(r.cd.course_number || c.number || '000'),
      image: String(r.cd.image_url || ''),
      price: c.price,
      total: r.topics.length,
      unlocked: r.idx + 1
    });
  }
  return json({ success: true, state: 'ok', student: student, courses: list });
}

async function actionTopics(env, body) {
  const userId = clean(body.user_id, 80);
  const courseId = clean(body.course_id, 120);
  if (!courseId) throw new HttpError(400, 'course_id is required.');
  const ctx = await loadContext(env, userId);
  const owned = ctx.owned.find(function (c) { return c.id === courseId; });
  if (!owned) throw new HttpError(403, 'This course is not on your account.');
  if (owned.status !== 'active') throw new HttpError(403, 'This course is not active yet. Please confirm your course on your dashboard.', { state: 'pending' });
  const r = await resolveCourse(env, owned, ctx.upd);
  const topics = r.topics.slice(0, r.idx + 1).map(function (t, i) {
    return {
      index: i,
      number: Number(t.topic_number != null ? t.topic_number : i + 1),
      name: String(t.topic_name || ''),
      text: String(t.topic_text || ''),
      video_url: String(t.video_url || ''),
      poster_url: String(t.poster_url || t.thumbnail_url || t.image_url || ''),
      is_final: t.is_final === true
    };
  });
  return json({
    success: true,
    course: {
      id: owned.id,
      name: String(r.cd.course_name || owned.name || 'Course'),
      number: String(r.cd.course_number || owned.number || '000'),
      image: String(r.cd.image_url || ''),
      price: owned.price,
      total: r.topics.length,
      unlocked: topics.length
    },
    topics: topics
  });
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
    const action = String(body.action || 'courses').trim().toLowerCase();
    if (action === 'courses') return await actionCourses(env, body);
    if (action === 'topics') return await actionTopics(env, body);
    return json({ success: false, error: 'Unknown action.' }, 400);
  } catch (err) {
    if (err instanceof HttpError) return json(Object.assign({ success: false, error: err.message }, err.extra || {}), err.status);
    return json({ success: false, error: 'Something went wrong on the server. Please try again.' }, 500);
  }
};

export const onRequestOptions = async function () {
  return new Response(null, { status: 204, headers: CORS });
};

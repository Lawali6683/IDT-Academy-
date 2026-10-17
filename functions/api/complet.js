const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const DEFAULT_SUPABASE_URL = 'https://orhgklhfltsfdumrrhup.supabase.co';
const SOCIAL_HOSTS = ['tiktok.com', 'facebook.com', 'fb.watch', 'fb.com', 'instagram.com', 'youtube.com', 'youtu.be', 'x.com', 'twitter.com', 'linkedin.com', 'snapchat.com', 'threads.net', 'whatsapp.com'];

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

function ownedCourseIds(ud) {
  const ids = [];
  const add = function (v) {
    const s = String(v || '').trim();
    if (s && ids.indexOf(s) === -1) ids.push(s);
  };
  add(ud.course_id);
  for (let n = 2; n <= 20; n++) add(ud[n + 'course_id']);
  return ids;
}

async function courseInfo(env, courseId, ud) {
  const rows = await sbJson(env, 'courses?id=eq.' + enc(courseId) + '&select=*');
  const cd = parseCourseData(rows[0]);
  const name = String(cd.course_name || '');
  const isDip = String(cd.category || '') === '4';
  const year = isDip ? yearOf(name) : 1;
  return {
    id: courseId,
    name: name || String(ud.course_name || 'Course'),
    number: String(cd.course_number || ''),
    image: String(cd.image_url || ''),
    isDip: isDip,
    year: year,
    isFinal: !isDip || year >= 2,
    key: courseId + '__y' + year
  };
}

async function certificateRows(env, userId) {
  try {
    const rows = await sbJson(env, 'certificate?select=id,certificate_data&certificate_data->>user_id=eq.' + enc(userId));
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    return [];
  }
}

function certMatches(row, item) {
  const cd = row && row.certificate_data && typeof row.certificate_data === 'object' ? row.certificate_data : {};
  if (cd.course_id) return String(cd.course_id) === item.id;
  return clean(cd.course_name, 160).toLowerCase() === clean(item.name, 160).toLowerCase();
}

function publicSubmission(s) {
  if (!s || typeof s !== 'object') return null;
  return {
    video_url: s.video_url || '',
    pdf_url: s.pdf_url || '',
    work_url: s.work_url || '',
    note: s.note || '',
    status: s.status || 'pending',
    submitted_at: s.submitted_at || '',
    edited_at: s.edited_at || '',
    edit_count: Number(s.edit_count) || 0
  };
}

async function buildItems(env, userId) {
  const row = await getProfile(env, userId);
  const ud = row.user_data && typeof row.user_data === 'object' ? row.user_data : {};
  const upd = await getUpdate(env, userId);
  const ids = ownedCourseIds(ud);
  const infos = await Promise.all(ids.map(function (id) { return courseInfo(env, id, ud); }));
  const certs = await certificateRows(env, userId);
  const ex = upd.exam || {};
  const results = ud.exam_results && typeof ud.exam_results === 'object' ? ud.exam_results : {};
  const projects = ud.projects && typeof ud.projects === 'object' ? ud.projects : {};
  const items = [];
  infos.forEach(function (info) {
    if (!info.isFinal) return;
    const passed = ex.passed && ex.passed[info.key];
    if (!passed) return;
    const pr = ex.projects && ex.projects[info.key];
    let project = null;
    if (pr && pr.chosen && Array.isArray(pr.options)) {
      const opt = pr.options.find(function (o) { return o.id === pr.chosen.id; });
      if (opt) project = opt;
    }
    const res = results[info.id];
    const cert = certs.find(function (c) { return certMatches(c, info); });
    items.push({
      id: info.id,
      name: info.name,
      number: info.number,
      image: info.image,
      is_diploma: info.isDip,
      score: res && res.score != null ? res.score : passed.score,
      date: passed.date,
      project: project,
      submission: publicSubmission(projects[info.id]),
      certificate: cert ? { id: cert.id, pdfs: Array.isArray(cert.certificate_data && cert.certificate_data.pdfs) ? cert.certificate_data.pdfs : [], date: cert.certificate_data && cert.certificate_data.date_generated || '' } : null
    });
  });
  items.sort(function (a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
  return { row: row, ud: ud, upd: upd, items: items, certs: certs };
}

async function actionState(env, body) {
  const userId = clean(body.user_id, 80);
  if (!userId) throw new HttpError(400, 'user_id is required.');
  const built = await buildItems(env, userId);
  const ud = built.ud;
  return json({
    success: true,
    student: {
      name: String(ud.full_name || ''),
      email: String(ud.email || ''),
      dob: String(ud.dob || ud.date_of_birth || ud.birth_date || ud.birthdate || ''),
      profile_url: String(ud.profile_url || ud.avatar_url || '')
    },
    items: built.items
  });
}

function validUrl(value, social) {
  let u;
  try {
    u = new URL(String(value || '').trim());
  } catch (err) {
    return '';
  }
  if (u.protocol !== 'https:') return '';
  const host = u.hostname.toLowerCase();
  if (host.indexOf('.') === -1 || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return '';
  if (social && !SOCIAL_HOSTS.some(function (h) { return host === h || host.endsWith('.' + h); })) return '';
  return u.toString().slice(0, 600);
}

async function actionPhoto(env, body) {
  const userId = clean(body.user_id, 80);
  const url = validUrl(body.profile_url, false);
  if (!userId || !url) throw new HttpError(400, 'A valid user and photo link are required.');
  const base = new URL(String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL));
  if (new URL(url).hostname !== base.hostname) throw new HttpError(400, 'The photo link is not valid.');
  await patchUserData(env, userId, function (u) {
    u.profile_url = url;
  });
  try {
    await sbFetch(env, 'user_profiles?id=eq.' + enc(userId), {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ profile_url: url })
    });
  } catch (err) {}
  return json({ success: true, profile_url: url });
}

async function actionSubmit(env, body) {
  const userId = clean(body.user_id, 80);
  const courseId = clean(body.course_id, 120);
  if (!userId || !courseId) throw new HttpError(400, 'user_id and course_id are required.');
  const built = await buildItems(env, userId);
  const item = built.items.find(function (i) { return i.id === courseId; });
  if (!item) throw new HttpError(403, 'You can only submit a project after you pass your final exam for this course.');
  if (!item.project) throw new HttpError(409, 'Please choose your project on the exam page first.');
  if (item.certificate) throw new HttpError(409, 'Your certificate has already been issued, so this project can no longer be changed.');

  const video = validUrl(body.video_url, true);
  if (!video) {
    throw new HttpError(400, 'Please paste the link of your video from a social media page (TikTok, Facebook, Instagram, YouTube, X and others). The link must start with https.', { field: 'video_url' });
  }
  const rawPdf = clean(body.pdf_url, 700);
  const rawWork = clean(body.work_url, 700);
  const pdf = rawPdf ? validUrl(rawPdf, false) : '';
  const work = rawWork ? validUrl(rawWork, false) : '';
  if (rawPdf && !pdf) throw new HttpError(400, 'The PDF link is not valid. It must start with https.', { field: 'pdf_url' });
  if (rawWork && !work) throw new HttpError(400, 'The project link is not valid. It must start with https.', { field: 'work_url' });
  if ((pdf && pdf === video) || (work && work === video) || (pdf && work && pdf === work)) {
    throw new HttpError(400, 'Each link must be different.', { field: 'work_url' });
  }
  const note = clean(body.note, 600);
  const now = new Date().toISOString();

  const saved = await patchUserData(env, userId, function (u) {
    u.projects = u.projects && typeof u.projects === 'object' ? u.projects : {};
    const old = u.projects[courseId] && typeof u.projects[courseId] === 'object' ? u.projects[courseId] : null;
    const rec = {
      course_id: courseId,
      course_name: item.name,
      course_number: item.number,
      project_id: item.project.id,
      project_title: item.project.title,
      project_theme: item.project.theme,
      video_url: video,
      pdf_url: pdf,
      work_url: work,
      note: note,
      status: 'pending',
      submitted_at: old && old.submitted_at ? old.submitted_at : now,
      edited_at: old ? now : '',
      edit_count: old ? (Number(old.edit_count) || 0) + 1 : 0
    };
    u.projects[courseId] = rec;
    u.project_data = {
      project_title: item.project.title,
      project_description: item.project.summary,
      project_type: 'video',
      project_link: video,
      status: 'pending',
      submitted_at: rec.submitted_at,
      course_name: item.name,
      full_name: String(u.full_name || '')
    };
    return rec;
  });
  return json({ success: true, submission: publicSubmission(saved), edited: saved.edit_count > 0 });
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
    const action = String(body.action || 'state').trim().toLowerCase();
    if (action === 'state') return await actionState(env, body);
    if (action === 'photo') return await actionPhoto(env, body);
    if (action === 'submit') return await actionSubmit(env, body);
    return json({ success: false, error: 'Unknown action.' }, 400);
  } catch (err) {
    if (err instanceof HttpError) return json(Object.assign({ success: false, error: err.message }, err.extra || {}), err.status);
    return json({ success: false, error: 'Something went wrong on the server. Please try again.' }, 500);
  }
};

export const onRequestOptions = async function () {
  return new Response(null, { status: 204, headers: CORS });
};

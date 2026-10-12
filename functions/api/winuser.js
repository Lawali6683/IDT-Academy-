const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const DEFAULT_SUPABASE_URL = 'https://orhgklhfltsfdumrrhup.supabase.co';
const SOCIAL_HOSTS = ['tiktok.com', 'facebook.com', 'fb.watch', 'fb.com', 'instagram.com', 'youtube.com', 'youtu.be', 'x.com', 'twitter.com', 'linkedin.com', 'snapchat.com', 'threads.net', 'whatsapp.com', 'vm.tiktok.com'];

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

function ownsCourse(ud, courseId) {
  if (String(ud.course_id || '') === courseId) return true;
  for (let n = 2; n <= 20; n++) if (String(ud[n + 'course_id'] || '') === courseId) return true;
  return false;
}

async function context(env, body) {
  const userId = clean(body.user_id, 80);
  const courseId = clean(body.course_id, 120);
  if (!userId || !courseId) throw new HttpError(400, 'user_id and course_id are required.');
  const row = await getProfile(env, userId);
  const ud = row.user_data && typeof row.user_data === 'object' ? row.user_data : {};
  if (!ownsCourse(ud, courseId)) throw new HttpError(403, 'This course is not on your account.');
  const rows = await sbJson(env, 'courses?id=eq.' + enc(courseId) + '&select=*');
  const cd = parseCourseData(rows[0]);
  const name = String(cd.course_name || ud.course_name || '');
  const isDip = String(cd.category || '') === '4';
  const year = isDip ? yearOf(name) : 1;
  const upd = await getUpdate(env, userId);
  return {
    userId: userId,
    courseId: courseId,
    ud: ud,
    upd: upd,
    name: name,
    isDip: isDip,
    year: year,
    isFinal: !isDip || year >= 2,
    key: courseId + '__y' + year
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

async function actionPass(env, body) {
  const ctx = await context(env, body);
  const rec = ctx.upd.exam && ctx.upd.exam.passed && ctx.upd.exam.passed[ctx.key];
  if (!rec || rec.exam_id !== clean(body.exam_id, 80)) {
    throw new HttpError(403, 'No passed exam was found for this course.');
  }
  const score = Number(rec.score) || 0;
  const out = await patchUserData(env, ctx.userId, function (u) {
    if (ctx.isDip) {
      u['exam_grade_y' + ctx.year] = score;
      u['exam_date_y' + ctx.year] = rec.date;
    }
    if (ctx.isFinal) {
      let grade = score;
      if (ctx.isDip) {
        const y1 = Number(u.exam_grade_y1);
        if (isFinite(y1) && u.exam_grade_y1 != null && u.exam_grade_y1 !== 'N/A') grade = (y1 + score) / 2;
      }
      u.exam_grade = round1(grade);
      u.exam_date = rec.date;
      u.level_completed = 'final';
      if (u.certificate_issued == null) u.certificate_issued = false;
    } else {
      u.level_completed = 'year1';
    }
    return { final: ctx.isFinal, exam_grade: u.exam_grade != null ? u.exam_grade : 'N/A', level_completed: u.level_completed };
  });
  return json({ success: true, final: out.final, exam_grade: out.exam_grade, level_completed: out.level_completed, next: ctx.isFinal ? 'project' : 'year2' });
}

function projectState(ctx) {
  const ex = ctx.upd.exam || {};
  if (!(ex.passed && ex.passed[ctx.key])) throw new HttpError(403, 'Pass the final exam first.');
  if (!ctx.isFinal) throw new HttpError(400, 'Projects are for the final exam only.');
  const pr = ex.projects && ex.projects[ctx.key];
  if (!pr || !Array.isArray(pr.options) || pr.options.length !== 4) {
    throw new HttpError(409, 'The project options are not ready yet.');
  }
  return pr;
}

async function actionChoose(env, body) {
  const ctx = await context(env, body);
  const pr = projectState(ctx);
  if (pr.submission) throw new HttpError(409, 'You have already submitted your project.');
  const id = clean(body.project_id, 10);
  const option = pr.options.find(function (o) { return o.id === id; });
  if (!option) throw new HttpError(400, 'Please choose one of the four projects.');
  const chosenAt = new Date().toISOString();
  const upd = await getUpdate(env, ctx.userId);
  upd.exam = upd.exam || {};
  upd.exam.projects = upd.exam.projects || {};
  upd.exam.projects[ctx.key] = Object.assign({}, upd.exam.projects[ctx.key], { chosen: { id: option.id, title: option.title, theme: option.theme, at: chosenAt } });
  await putUpdate(env, ctx.userId, upd);
  await patchUserData(env, ctx.userId, function (u) {
    u.project_title = option.title;
    u.project_theme = option.theme;
  });
  return json({ success: true, chosen: upd.exam.projects[ctx.key].chosen, project: option });
}

function validUrl(value, kind) {
  let u;
  try {
    u = new URL(String(value || '').trim());
  } catch (err) {
    return '';
  }
  if (u.protocol !== 'https:') return '';
  const host = u.hostname.toLowerCase();
  if (host.indexOf('.') === -1 || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return '';
  if (kind === 'video') {
    const ok = SOCIAL_HOSTS.some(function (h) { return host === h || host.endsWith('.' + h); });
    if (!ok) return '';
  }
  return u.toString().slice(0, 500);
}

async function actionSubmit(env, body) {
  const ctx = await context(env, body);
  const pr = projectState(ctx);
  if (!pr.chosen) throw new HttpError(409, 'Choose your project first.');
  if (pr.submission) throw new HttpError(409, 'You have already submitted your project.');
  const video = validUrl(body.video_url, 'video');
  if (!video) throw new HttpError(400, 'Please paste the link of your video from a social media page (TikTok, Facebook, Instagram, YouTube, X and others). The link must start with https.', { field: 'video_url' });
  const work = validUrl(body.work_url, 'work');
  if (!work) throw new HttpError(400, 'Please paste a link to your PDF or your project. The link must start with https.', { field: 'work_url' });
  if (work === video) throw new HttpError(400, 'The video link and the project link must be different.', { field: 'work_url' });
  const note = clean(body.note, 600);
  const at = new Date().toISOString();
  const upd = await getUpdate(env, ctx.userId);
  upd.exam = upd.exam || {};
  upd.exam.projects = upd.exam.projects || {};
  upd.exam.projects[ctx.key] = Object.assign({}, upd.exam.projects[ctx.key], { submission: { video_url: video, work_url: work, note: note, at: at } });
  await putUpdate(env, ctx.userId, upd);
  await patchUserData(env, ctx.userId, function (u) {
    u.certificate_issued = true;
    u.project_submitted_at = at;
    u.project_video_url = video;
    u.project_work_url = work;
  });
  return json({ success: true, submitted_at: at, certificate_issued: true });
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
    const action = String(body.action || 'pass').trim().toLowerCase();
    if (action === 'pass') return await actionPass(env, body);
    if (action === 'project_choose') return await actionChoose(env, body);
    if (action === 'project_submit') return await actionSubmit(env, body);
    return json({ success: false, error: 'Unknown action.' }, 400);
  } catch (err) {
    if (err instanceof HttpError) return json(Object.assign({ success: false, error: err.message }, err.extra || {}), err.status);
    return json({ success: false, error: 'Something went wrong on the server. Please try again.' }, 500);
  }
};

export const onRequestOptions = async function () {
  return new Response(null, { status: 204, headers: CORS });
};

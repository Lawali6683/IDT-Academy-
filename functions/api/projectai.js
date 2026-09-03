const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Max-Age': '86400'
};

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS_HEADERS)
  });
}

const TECH_KEYWORDS = [
  'web', 'website', 'app', 'application', 'code', 'coding', 'program', 'software',
  'computer', 'data', 'cyber', 'security', 'python', 'java', 'html', 'css', 'javascript',
  'design', 'graphic', 'ui', 'ux', 'network', 'database', 'ai', 'machine', 'tech',
  'digital', 'robotics', 'engineering', 'development', 'developer', 'frontend', 'backend'
];

function isLikelyTech(text) {
  const t = String(text || '').toLowerCase();
  return TECH_KEYWORDS.some((k) => t.includes(k));
}

function normalizeTopics(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 80);
}

function buildPrompt(fullName, courseName, topics) {
  return 'You are the final project generator for IDT Academy, an online school for Nigerian learners. ' +
    'Create ONE simple final project for a student who just finished a course. ' +
    'Student name: ' + (fullName || 'Student') + '\n' +
    'Course completed: ' + (courseName || 'General Course') + '\n' +
    'Topics the student completed: ' + (topics.length ? topics.join(', ') : 'general course topics') + '\n\n' +
    'RULES:\n' +
    '1. Decide project_type: use "link" if the course is technology related (website, app, coding, design, computer, data and similar) so the student builds something and submits a live link of what they built. Use "video" if the project is best done by the student recording a video of ONLY THEMSELVES (no other person in the video) explaining in their own simple words what they learned, then posting the video on social media (YouTube, Facebook, TikTok, Instagram or WhatsApp) and submitting the link.\n' +
    '2. project_description must be very simple and easy to understand, maximum 3 short sentences, written in simple English a beginner can follow. It must clearly relate to the course and the topics listed.\n' +
    '3. project_rules must be 3 to 5 short rules the student must follow.\n' +
    '4. steps must be 3 to 6 short clear steps showing exactly how to do the project.\n' +
    '5. link_hint: if project_type is "link", tell the student examples of what link to submit (hosted website link, app download link, GitHub link or Google Drive link). If project_type is "video", remind the student: you must be alone in the video, explain what you learned, post it on social media and copy the link here.\n\n' +
    'Respond with ONLY valid JSON in exactly this shape: ' +
    '{"project_title":"","project_description":"","project_type":"link or video","project_rules":[""],"steps":[""],"link_hint":""}';
}

function extractJson(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(t);
}

async function callGemini(apiKey, prompt) {
  const apiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' + apiKey;
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
    })
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error('AI error ' + res.status + ': ' + t.slice(0, 300));
  }

  const data = await res.json();
  const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
  if (!Array.isArray(parts) || !parts.length) throw new Error('AI returned no content');
  const text = parts.map((p) => p.text || '').join('');
  return extractJson(text);
}

function normalizeProject(p, courseName) {
  const out = {};
  out.project_title = String(p.project_title || 'Final Project').trim().slice(0, 150);
  out.project_description = String(p.project_description || '').trim().slice(0, 1200);

  let type = String(p.project_type || '').toLowerCase().trim();
  if (type !== 'link' && type !== 'video') {
    type = isLikelyTech(courseName) ? 'link' : 'video';
  }
  out.project_type = type;

  out.project_rules = Array.isArray(p.project_rules)
    ? p.project_rules.map((r) => String(r || '').trim()).filter(Boolean).slice(0, 6)
    : [];

  out.steps = Array.isArray(p.steps)
    ? p.steps.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 8)
    : [];

  out.link_hint = String(p.link_hint || '').trim().slice(0, 800);

  if (!out.project_rules.length) {
    out.project_rules = type === 'video'
      ? ['You must be alone in the video, no other person.', 'Explain in your own words what you learned in the course.', 'Post the video on social media and copy the link.']
      : ['The project must be your own work.', 'Your link must be public and working.', 'Do not submit the same project twice.'];
  }

  if (!out.steps.length) {
    out.steps = type === 'video'
      ? ['Review the topics you completed in the course.', 'Record a video of yourself explaining what you learned.', 'Post the video on social media.', 'Copy the link and submit it below.']
      : ['Review the topics you completed in the course.', 'Build the project on your own.', 'Host it or upload it so it has a public link.', 'Copy the link and submit it below.'];
  }

  if (!out.link_hint) {
    out.link_hint = type === 'video'
      ? 'Record a video of ONLY YOURSELF explaining what you learned. Post it on social media, then copy the link and submit it.'
      : 'Submit a hosted website link, app download link, GitHub link or Google Drive link.';
  }

  return out;
}

function buildApi(env) {
  const baseUrl = env.SUPABASE_URL || 'https://orhgklhfltsfdumrrhup.supabase.co';
  const restUrl = baseUrl.endsWith('/') ? baseUrl + 'rest/v1/' : baseUrl + '/rest/v1/';
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) return null;

  const request = async function (method, path, body) {
    const headers = {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json'
    };
    if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
      headers['Prefer'] = 'return=representation';
    }
    const opts = { method: method, headers: headers };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(restUrl + path, opts);
  };

  return {
    getUserById: async function (id) {
      const res = await request('GET', 'user_profiles?id=eq.' + encodeURIComponent(id) + '&select=*');
      if (!res.ok) return null;
      const arr = await res.json().catch(() => []);
      return Array.isArray(arr) && arr.length ? arr[0] : null;
    },
    updateUser: async function (id, userData) {
      return request('PATCH', 'user_profiles?id=eq.' + encodeURIComponent(id), { user_data: userData });
    }
  };
}

async function handleGenerate(body, env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'GEMINI_API_KEY is not configured.' }, 500);
  }

  const userId = String(body.user_id || '').trim();
  if (!userId || userId.length < 8) {
    return jsonResponse({ error: 'A valid user is required.' }, 400);
  }

  const fullName = String(body.full_name || '').trim().slice(0, 150);
  const topics = normalizeTopics(body.topics);

  let courseName = String(body.course_name || '').trim().slice(0, 200);
  let profileFullName = fullName;

  const api = buildApi(env);
  if (api) {
    try {
      const row = await api.getUserById(userId);
      if (row) {
        const ud = typeof row.user_data === 'string' ? JSON.parse(row.user_data) : (row.user_data || {});
        if (!courseName) courseName = String(ud.course_name || '').trim();
        if (!profileFullName) profileFullName = String(ud.full_name || '').trim();
      }
    } catch (e) {}
  }

  if (!courseName) courseName = 'General Course';

  const rawProject = await callGemini(apiKey, buildPrompt(profileFullName, courseName, topics));
  const project = normalizeProject(rawProject, courseName);
  project.course_name = courseName;
  project.topics = topics;
  project.full_name = profileFullName;

  return jsonResponse({ success: true, project: project }, 200);
}

async function handleSubmit(body, env) {
  const api = buildApi(env);
  if (!api) {
    return jsonResponse({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' }, 500);
  }

  const userId = String(body.user_id || '').trim();
  if (!userId || userId.length < 8) {
    return jsonResponse({ error: 'A valid user is required.' }, 400);
  }

  const p = body.project && typeof body.project === 'object' ? body.project : {};
  const link = String(p.project_link || '').trim();

  if (!link || !/^https?:\/\/.+\..+/i.test(link)) {
    return jsonResponse({ error: 'A valid project link starting with https:// is required.' }, 400);
  }

  let type = String(p.project_type || '').toLowerCase().trim();
  if (type !== 'link' && type !== 'video') type = 'link';

  const row = await api.getUserById(userId);
  if (!row) {
    return jsonResponse({ error: 'User not found.' }, 404);
  }

  let ud;
  try {
    ud = typeof row.user_data === 'string' ? JSON.parse(row.user_data) : (row.user_data || {});
  } catch (e) {
    ud = {};
  }

  const record = {
    project_title: String(p.project_title || 'Final Project').trim().slice(0, 150),
    project_description: String(p.project_description || '').trim().slice(0, 1200),
    project_type: type,
    project_link: link.slice(0, 1000),
    course_name: String(p.course_name || ud.course_name || '').trim().slice(0, 200),
    topics: normalizeTopics(p.topics),
    full_name: String(p.full_name || ud.full_name || '').trim().slice(0, 150),
    status: 'pending',
    submitted_at: new Date().toISOString()
  };

  if (ud.project_data && ud.project_data.project_link && ud.project_data.status === 'pending') {
    return jsonResponse({ error: 'This project has already been submitted. Please wait for approval.' }, 409);
  }

  ud.project_data = record;

  const updateRes = await api.updateUser(userId, ud);
  if (updateRes.status >= 400) {
    const text = await updateRes.text().catch(() => '');
    return jsonResponse({ error: 'Could not save your project: ' + text }, 502);
  }

  return jsonResponse({
    success: true,
    message: 'Project submitted successfully. Waiting for CEO approval.'
  }, 200);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  try {
    if (body.action === 'submit') {
      return await handleSubmit(body, env);
    }
    return await handleGenerate(body, env);
  } catch (err) {
    return jsonResponse({ error: 'Project request failed: ' + (err.message || 'unknown error') }, 500);
  }
}
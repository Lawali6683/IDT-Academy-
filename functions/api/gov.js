const FIREBASE_RTDB_URL = 'https://bebeji-plaza-6b176-default-rtdb.firebaseio.com';
const SITE_ID = 'GOV';
const FORM_ROOT = 'GOV';
const EMAIL_ROOT = 'GOV_EMAILS';
const PHONE_ROOT = 'GOV_PHONES';
const ID_ROOT = 'GOV_IDS';
const EMAIL_API_URL = 'https://idtacademy.com.ng/email';
const SMS_API_URL = 'https://idtacademy.com.ng/email';
const MAX_BODY_CHARS = 16000;
const FIREBASE_TIMEOUT_MS = 9000;
const NOTIFY_TIMEOUT_MS = 8000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/;
const NAME_RE = /^[\p{L}][\p{L}\s.'\-]*$/u;
const IMGUR_RE = /^https:\/\/i\.imgur\.com\/[A-Za-z0-9]{5,12}\.(jpg|jpeg|png|gif|webp)$/i;
const ID_RULES = {
  nin: /^\d{11}$/,
  voter: /^[A-Z0-9]{9,22}$/
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS }
  });
}

function fail(status, error, field) {
  const body = { success: false, error: error };
  if (field) body.field = field;
  return json(body, status);
}

function getSecret(env) {
  return env.FIREBASE_SECRET || env.FARE_BASE_SERVICE_KEY || '';
}

function getBaseUrl(env) {
  return String(env.FIREBASE_RTDB_URL || FIREBASE_RTDB_URL).replace(/\/+$/, '');
}

function fbUrl(env, path) {
  return getBaseUrl(env) + '/' + path + '.json?auth=' + encodeURIComponent(getSecret(env));
}

async function fb(env, path, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, FIREBASE_TIMEOUT_MS);
  try {
    return await fetch(fbUrl(env, path), Object.assign({}, options || {}, { signal: ctrl.signal }));
  } finally {
    clearTimeout(timer);
  }
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

async function encryptText(env, text) {
  const material = env.FORM_ENC_KEY || getSecret(env);
  const keyBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('gov-form:' + material));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(text));
  return { v: 1, alg: 'AES-GCM', iv: toBase64(iv), data: toBase64(new Uint8Array(enc)) };
}

function normalizePhone(value) {
  let d = String(value || '').replace(/[\s\-().]/g, '');
  if (d.charAt(0) === '+') d = d.slice(1);
  if (/^0\d{10}$/.test(d)) d = '234' + d.slice(1);
  else if (/^[789]\d{9}$/.test(d)) d = '234' + d;
  return /^234[789][01]\d{8}$/.test(d) ? d : '';
}

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function escHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

function validate(body) {
  const fullName = clean(body.full_name, 80);
  if (fullName.length < 3 || fullName.split(' ').length < 2 || !NAME_RE.test(fullName)) {
    return { error: 'Please write your full name (first name and last name).', field: 'full_name' };
  }

  const phone = normalizePhone(body.phone);
  if (!phone) {
    return { error: 'Please enter a correct Nigerian phone number, for example 08012345678.', field: 'phone' };
  }

  const email = clean(body.email, 120).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { error: 'Please enter a correct email address.', field: 'email' };
  }

  const gender = clean(body.gender, 10).toLowerCase();
  if (gender !== 'male' && gender !== 'female') {
    return { error: 'Please choose male or female.', field: 'gender' };
  }

  const courseId = clean(body.course_id, 120);
  const courseName = clean(body.course_name, 160);
  if (!courseId || !courseName) {
    return { error: 'Please choose the course you want to learn.', field: 'course' };
  }

  const state = clean(body.state, 40);
  if (STATES.indexOf(state) === -1) {
    return { error: 'Please choose your state.', field: 'state' };
  }

  const lga = clean(body.lga, 60);
  if (!lga) {
    return { error: 'Please choose your local government.', field: 'lga' };
  }

  const faceUrl = String(body.face_url || '').trim();
  if (!IMGUR_RE.test(faceUrl)) {
    return { error: 'Please take your face photo again.', field: 'face' };
  }

  const idType = clean(body.id_type, 10).toLowerCase();
  if (!ID_RULES[idType]) {
    return { error: 'Please choose NIN or Voter\'s card.', field: 'id_type' };
  }

  const idNumber = String(body.id_number == null ? '' : body.id_number).replace(/\s+/g, '').toUpperCase();
  if (!ID_RULES[idType].test(idNumber)) {
    return {
      error: idType === 'nin' ? 'Your NIN must be exactly 11 digits.' : 'Please enter the voter card number exactly as written on your card.',
      field: 'id_number'
    };
  }

  const idUrl = String(body.id_url || '').trim();
  if (!IMGUR_RE.test(idUrl)) {
    return { error: 'Please add the photo of your ID card again.', field: 'id_image' };
  }

  return {
    ok: true,
    data: {
      full_name: fullName,
      phone: phone,
      email: email,
      gender: gender,
      course_id: courseId,
      course_name: courseName,
      course_number: clean(body.course_number, 40),
      course_price: Number(body.course_price) > 0 ? Number(body.course_price) : 0,
      state: state,
      lga: lga,
      face_url: faceUrl,
      id_type: idType,
      id_number: idNumber,
      id_url: idUrl
    }
  };
}

async function claim(env, root, key, value) {
  const res = await fb(env, root + '/' + key, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'if-match': 'null_etag' },
    body: JSON.stringify(value)
  });
  if (res.ok) return 'claimed';
  if (res.status === 412) {
    const cur = await fb(env, root + '/' + key, { method: 'GET' });
    if (cur.ok) {
      const existing = await cur.json();
      if (existing === value) return 'same';
    }
    return 'taken';
  }
  throw new Error('Database error ' + res.status);
}

async function release(env, root, key) {
  try {
    await fb(env, root + '/' + key, { method: 'DELETE' });
  } catch (err) {}
}

async function releaseAll(env, list) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].state === 'claimed') await release(env, list[i].root, list[i].key);
  }
}

async function postNotify(url, payload, env) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, NOTIFY_TIMEOUT_MS);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (env.NOTIFY_KEY) headers.Authorization = 'Bearer ' + env.NOTIFY_KEY;
    const res = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(payload), signal: ctrl.signal });
    return res.ok ? 'sent' : 'failed:' + res.status;
  } catch (err) {
    return 'failed:' + (err && err.name === 'AbortError' ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
}

function buildEmail(d) {
  const first = d.full_name.split(' ')[0];
  const subject = 'We received your application - Zamfara State Free Learning Skill';
  const text = 'Hello ' + first + ',\n\nThank you for applying for ' + d.course_name + ' with the Zamfara State Free Learning Skill programme, sponsored by Gov. Dauda Lawal.\n\nWe have received your application and we are checking your details. When you are approved, we will send you another email.\n\nPlease check your inbox and your spam folder.\n\nFree skills for every learner in Zamfara State.';
  const html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0b1b14">' +
    '<h2 style="color:#056b3a;margin:0 0 12px">Application received</h2>' +
    '<p>Hello ' + escHtml(first) + ',</p>' +
    '<p>Thank you for applying for <b>' + escHtml(d.course_name) + '</b> with the Zamfara State Free Learning Skill programme, sponsored by Gov. Dauda Lawal.</p>' +
    '<p>We have received your application and we are checking your details. When you are approved, we will send you another email.</p>' +
    '<p>Please check your inbox and your spam folder.</p>' +
    '<p style="color:#51655b;font-size:13px">Free skills for every learner in Zamfara State.</p></div>';
  return { subject: subject, text: text, html: html };
}

function buildSms(d) {
  return 'Hello ' + d.full_name.split(' ')[0] + ', we received your application for ' + d.course_name + ' at Zamfara State Free Learning Skill. We are checking your details and will email you when you are approved.';
}

async function notifyApplicant(env, d, formId) {
  const mail = buildEmail(d);
  const sms = buildSms(d);
  const results = await Promise.allSettled([
    postNotify(env.EMAIL_API_URL || EMAIL_API_URL, {
      type: 'application_received',
      to: d.email,
      email: d.email,
      name: d.full_name,
      subject: mail.subject,
      message: mail.text,
      text: mail.text,
      html: mail.html,
      ref: formId
    }, env),
    postNotify(env.SMS_API_URL || SMS_API_URL, {
      type: 'application_received',
      to: d.phone,
      phone: d.phone,
      phone_local: '0' + d.phone.slice(3),
      name: d.full_name,
      message: sms,
      text: sms,
      ref: formId
    }, env)
  ]);
  const pick = function (r) { return r.status === 'fulfilled' ? r.value : 'failed:error'; };
  const status = { email: pick(results[0]), sms: pick(results[1]), at: new Date().toISOString() };
  try {
    await fb(env, FORM_ROOT + '/' + formId + '/notify', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(status)
    });
  } catch (err) {}
  return status;
}

export const onRequestPost = async function (context) {
  const env = context.env;

  try {
    if (!getSecret(env)) {
      return fail(500, 'The application service is not set up yet. Please try again later.');
    }

    let raw = '';
    try {
      raw = await context.request.text();
    } catch (err) {
      return fail(400, 'We could not read your form. Please try again.');
    }
    if (raw.length > MAX_BODY_CHARS) {
      return fail(413, 'Your form is too large. Please try again.');
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch (err) {
      return fail(400, 'We could not read your form. Please try again.');
    }
    if (!body || typeof body !== 'object') {
      return fail(400, 'We could not read your form. Please try again.');
    }

    if (clean(body.website, 50)) {
      return json({ success: true, message: 'Application received.' });
    }

    if (env.FORM_DEADLINE) {
      const deadline = Date.parse(env.FORM_DEADLINE);
      if (isFinite(deadline) && Date.now() > deadline) {
        return fail(403, 'Applications are now closed. Thank you for your interest.');
      }
    }

    const result = validate(body);
    if (!result.ok) {
      return fail(400, result.error, result.field);
    }
    const d = result.data;

    const candidate = clean(body.uid, 60);
    const formId = UUID_RE.test(candidate) ? candidate.toLowerCase() : crypto.randomUUID();

    const claims = [
      { root: EMAIL_ROOT, key: await sha256Hex(d.email), field: 'email', taken: 'Someone has already applied with this email. Please use a different email.', state: '' },
      { root: PHONE_ROOT, key: d.phone, field: 'phone', taken: 'Someone has already applied with this phone number. Please use a different phone number.', state: '' },
      { root: ID_ROOT, key: await sha256Hex('id:' + d.id_number), field: 'id_number', taken: 'This ID card number has already been used. Each person can apply only once.', state: '' }
    ];

    for (let i = 0; i < claims.length; i++) {
      let outcome;
      try {
        outcome = await claim(env, claims[i].root, claims[i].key, formId);
      } catch (err) {
        await releaseAll(env, claims);
        return fail(502, 'We could not reach the database. Please try again in a moment.');
      }
      claims[i].state = outcome;
      if (outcome === 'taken') {
        await releaseAll(env, claims);
        return fail(409, claims[i].taken, claims[i].field);
      }
    }

    const now = new Date();
    try {
      const record = {
        id: formId,
        full_name: d.full_name,
        phone: d.phone,
        email: d.email,
        gender: d.gender,
        country: 'Nigeria',
        state: d.state,
        lga: d.lga,
        course_id: d.course_id,
        course_name: d.course_name,
        course_number: d.course_number,
        course_price: d.course_price,
        face_url: d.face_url,
        id_type: d.id_type,
        id_number_enc: await encryptText(env, d.id_number),
        id_number_last4: d.id_number.slice(-4),
        id_url: d.id_url,
        status: 'pending',
        source: SITE_ID,
        site_id: SITE_ID,
        created_at: now.toISOString(),
        created_ts: now.getTime()
      };
      const res = await fb(env, FORM_ROOT + '/' + formId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (!res.ok) throw new Error('Database error ' + res.status);
    } catch (err) {
      await releaseAll(env, claims);
      return fail(502, 'We could not save your application. Please try again in a moment.');
    }

    const notifying = notifyApplicant(env, d, formId).catch(function () { return null; });
    if (context.waitUntil) context.waitUntil(notifying);
    else await notifying;

    return json({
      success: true,
      id: formId,
      message: 'Your application has been received. We will verify your details and send you an email.'
    });
  } catch (err) {
    return fail(500, 'Something went wrong on our side. Please try again.');
  }
};

export const onRequestOptions = async function () {
  return new Response(null, { status: 204, headers: CORS });
};
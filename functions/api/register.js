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

function uuidv4() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const arr = new Uint8Array(1);
    crypto.getRandomValues(arr);
    const r = arr[0] & 15;
    const v = c === 'x' ? r : (r & 3 | 8);
    return v.toString(16);
  });
}

function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildApi(env) {
  const baseUrl = env.SUPABASE_URL || 'https://orhgklhfltsfdumrrhup.supabase.co';
  const restUrl = baseUrl.endsWith('/') ? baseUrl + 'rest/v1/' : baseUrl + '/rest/v1/';
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

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
    findUserByEmail: async function (email) {
      const res = await request('GET', 'user_profiles?select=*&user_data->>email=eq.' + encodeURIComponent(email));
      const arr = await res.json().catch(function () { return []; });
      return Array.isArray(arr) && arr.length ? arr[0] : null;
    },
    findUserByReferralCode: async function (code) {
      const res = await request('GET', 'user_profiles?select=*&user_data->>referral_code=eq.' + encodeURIComponent(code));
      const arr = await res.json().catch(function () { return []; });
      return Array.isArray(arr) && arr.length ? arr[0] : null;
    },
    findPartnerByEmail: async function (email) {
      const res = await request('GET', 'partner_profiles?select=*&partner_data->>email=eq.' + encodeURIComponent(email));
      const arr = await res.json().catch(function () { return []; });
      return Array.isArray(arr) && arr.length ? arr[0] : null;
    },
    findPartnerByReferralCode: async function (code) {
      const res = await request('GET', 'partner_profiles?select=*&partner_data->>referral_code=eq.' + encodeURIComponent(code));
      const arr = await res.json().catch(function () { return []; });
      return Array.isArray(arr) && arr.length ? arr[0] : null;
    },
    insertPartner: async function (id, partnerData) {
      return request('POST', 'partner_profiles', { id: id, partner_data: partnerData });
    },
    deletePartner: async function (id) {
      return request('DELETE', 'partner_profiles?id=eq.' + encodeURIComponent(id));
    },
    updatePartner: async function (id, partnerData) {
      return request('PATCH', 'partner_profiles?id=eq.' + encodeURIComponent(id), { partner_data: partnerData });
    },
    insertUser: async function (id, userData) {
      return request('POST', 'user_profiles', { id: id, user_data: userData });
    },
    deleteUser: async function (id) {
      return request('DELETE', 'user_profiles?id=eq.' + encodeURIComponent(id));
    },
    updateUser: async function (id, userData) {
      return request('PATCH', 'user_profiles?id=eq.' + encodeURIComponent(id), { user_data: userData });
    }
  };
}

async function handlePartnerRegister(body, api) {
  const fullName = String(body.full_name || '').trim();
  const email = normalizeEmail(body.email);
  const phone = String(body.phone || '').trim();
  const password = String(body.password || '');
  const referredBy = String(body.referred_by || '').trim().toUpperCase();

  if (fullName.length < 3) return jsonResponse({ error: 'Full name is required. Please enter your full name.' }, 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: 'A valid email address is required.' }, 400);
  if (!phone || phone.length < 7) return jsonResponse({ error: 'A valid phone number is required.' }, 400);
  if (!password || password.length < 6) return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);

  const existing = await api.findPartnerByEmail(email);
  if (existing) return jsonResponse({ error: 'This email is already registered as a partner. Please log in instead.' }, 409);

  let createdId = null;
  try {
    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    let referralCode = generateReferralCode();
    for (let i = 0; i < 6; i++) {
      const dup = await api.findPartnerByReferralCode(referralCode);
      if (!dup) break;
      referralCode = generateReferralCode();
    }
    const id = uuidv4();
    const referralLink = 'https://www.idtacademy.com.ng/patner/ref/' + referralCode;
    const now = new Date().toISOString();

    const partnerData = {
      full_name: fullName,
      email: email,
      phone: phone,
      account_type: 'partner',
      referral_code: referralCode,
      referral_link: referralLink,
      referred_by: referredBy || '',
      referral_bonus: 0.00,
      referral_activity: [],
      total_referrals: 0,
      paid_referrals: 0,
      total_withdrawn: 0,
      date_registered: now,
      password_hash: passwordHash,
      password_salt: salt,
      status: 'active',
      created_at: now
    };

    const insertRes = await api.insertPartner(id, partnerData);
    if (insertRes.status >= 400) {
      const text = await insertRes.text().catch(function () { return ''; });
      return jsonResponse({ error: 'Could not save your partner account: ' + text }, 502);
    }
    createdId = id;

    const safePartner = {
      id: id,
      full_name: fullName,
      email: email,
      phone: phone,
      account_type: 'partner',
      referral_code: referralCode,
      referral_link: referralLink,
      referral_bonus: 0,
      total_referrals: 0,
      paid_referrals: 0,
      date_registered: now,
      status: 'active'
    };

    return jsonResponse({
      success: true,
      message: 'Partner registration successful! Welcome to the IDT Academy Partner Program.',
      user: safePartner
    }, 201);
  } catch (err) {
    if (createdId) {
      try { await api.deletePartner(createdId); } catch (e) {}
    }
    return jsonResponse({ error: 'Partner registration failed: ' + (err.message || 'unknown error') }, 500);
  }
}

async function handleStudentRegister(body, api) {
  const fullName = String(body.full_name || body.fullName || '').trim();
  const email = normalizeEmail(body.email);
  const phone = String(body.phone || '').trim();
  const gender = String(body.gender || '').trim();
  const courseId = String(body.course_id || '').trim();
  const courseName = String(body.course_name || '').trim();
  const courseNumber = String(body.course_number || '').trim();
  const coursePrice = Number(body.course_price || 0);
  const paymentNo = String(body.payment_no || '').trim();
  const dob = String(body.date_of_birth || body.dob || '').trim();
  const level = String(body.school_level || '').trim();
  const password = String(body.password || '');
  let referredBy = String(body.referred_by || body.referredBy || '').trim().toUpperCase();

  if (fullName.length < 3) return jsonResponse({ error: 'Full name is required. Please enter your full name.' }, 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: 'A valid email address is required.' }, 400);
  if (!phone) return jsonResponse({ error: 'Phone number is required.' }, 400);
  if (!password || password.length < 6) return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);

  const existing = await api.findUserByEmail(email);
  if (existing) return jsonResponse({ error: 'This email is already registered. Please login instead.' }, 409);

  let createdId = null;
  try {
    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    let referralCode = generateReferralCode();
    for (let i = 0; i < 6; i++) {
      const dup = await api.findUserByReferralCode(referralCode);
      if (!dup) break;
      referralCode = generateReferralCode();
    }
    const id = uuidv4();
    const referralLink = 'https://www.idtacademy.com.ng/index/ref/' + referralCode;
    const now = new Date().toISOString();

    const userData = {
      full_name: fullName,
      email: email,
      phone: phone,
      gender: gender,
      course_id: courseId,
      course_name: courseName || 'Selected Course',
      course_number: courseNumber,
      course_price: coursePrice,
      payment_no: paymentNo || 'Pending',
      referral_code: referralCode,
      referral_link: referralLink,
      referred_by: referredBy || '',
      referral_bonus: 0.00,
      date_of_birth: dob,
      school_level: level,
      date_registered: now,
      password_hash: passwordHash,
      password_salt: salt,
      status: 'pending',
      assessment_grade: '',
      exam_grade: '',
      level_completed: '',
      certificate_issued: false,
      created_at: now
    };

    const insertRes = await api.insertUser(id, userData);
    if (insertRes.status >= 400) {
      const text = await insertRes.text().catch(function () { return ''; });
      return jsonResponse({ error: 'Could not save your account: ' + text }, 502);
    }
    createdId = id;

    if (referredBy) {
      const partner = await api.findPartnerByReferralCode(referredBy);
      if (partner) {
        const pd = partner.partner_data || {};
        const activity = Array.isArray(pd.referral_activity) ? pd.referral_activity : [];
        activity.push({
          referred_name: fullName,
          referred_email: email,
          course_name: courseName || 'Selected Course',
          course_price: coursePrice,
          bonus: 0,
          status: 'pending',
          date: now
        });
        await api.updatePartner(partner.id, Object.assign({}, pd, {
          referral_activity: activity,
          total_referrals: (pd.total_referrals || 0) + 1
        }));
      } else {
        const referrer = await api.findUserByReferralCode(referredBy);
        if (referrer) {
          const ud = referrer.user_data || {};
          const activity = Array.isArray(ud.referral_activity) ? ud.referral_activity : [];
          activity.push({
            referred_name: fullName,
            referred_email: email,
            course_name: courseName || 'Selected Course',
            course_price: coursePrice,
            bonus: 1500,
            status: 'pending',
            date: now
          });
          await api.updateUser(referrer.id, Object.assign({}, ud, { referral_activity: activity }));
        }
      }
    }

    const safeUser = {
      id: id,
      full_name: fullName,
      email: email,
      phone: phone,
      gender: gender,
      course_id: courseId,
      course_name: courseName || 'Selected Course',
      course_number: courseNumber,
      course_price: coursePrice,
      referral_code: referralCode,
      referral_link: referralLink,
      referred_by: referredBy || '',
      referral_bonus: 0,
      date_of_birth: dob,
      school_level: level,
      date_registered: now,
      status: 'pending'
    };

    return jsonResponse({
      success: true,
      message: 'Registration successful! Welcome to IDT Academy.',
      user: safeUser
    }, 201);
  } catch (err) {
    if (createdId) {
      try { await api.deleteUser(createdId); } catch (e) {}
    }
    return jsonResponse({ error: 'Registration failed: ' + (err.message || 'unknown error') }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in Cloudflare Pages environment variables.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const api = buildApi(env);
  if (body.account_type === 'partner') {
    return handlePartnerRegister(body, api);
  }
  return handleStudentRegister(body, api);
}
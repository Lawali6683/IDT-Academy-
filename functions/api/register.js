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

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateUserId() {
  const digits = '0123456789';
  let num = '';
  for (let i = 0; i < 6; i++) {
    num += digits[Math.floor(Math.random() * digits.length)];
  }
  return 'IDT/V3/' + num;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function na(value) {
  const v = String(value || '').trim();
  return v === '' ? 'N/A' : v;
}

function buildApi(env) {
  const baseUrl = env.SUPABASE_URL || 'https://orhgklhfltsfdumrrhup.supabase.co';
  const restUrl = baseUrl.endsWith('/') ? baseUrl + 'rest/v1/' : baseUrl + '/rest/v1/';
  const authAdminUrl = baseUrl.endsWith('/') ? baseUrl + 'auth/v1/admin/users' : baseUrl + '/auth/v1/admin/users';
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
    createAuthUser: async function (email, password, userMetadata) {
      const headers = {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json'
      };
      const body = {
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: userMetadata || {}
      };
      return fetch(authAdminUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });
    },

    deleteAuthUser: async function (id) {
      const headers = {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json'
      };
      return fetch(authAdminUrl + '/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: headers
      });
    },

    findProfileByEmail: async function (email) {
      const res = await request('GET', 'user_profiles?select=*&user_data->>email=eq.' + encodeURIComponent(email));
      const arr = await res.json().catch(function () { return []; });
      return Array.isArray(arr) && arr.length ? arr[0] : null;
    },

    findProfileByReferralCode: async function (code) {
      const res = await request('GET', 'user_profiles?select=*&user_data->>referral_code=eq.' + encodeURIComponent(code));
      const arr = await res.json().catch(function () { return []; });
      return Array.isArray(arr) && arr.length ? arr[0] : null;
    },

    findProfileByUserId: async function (userId) {
      const res = await request('GET', 'user_profiles?select=*&user_data->>user_id=eq.' + encodeURIComponent(userId));
      const arr = await res.json().catch(function () { return []; });
      return Array.isArray(arr) && arr.length ? arr[0] : null;
    },

    insertProfile: async function (id, userData) {
      return request('POST', 'user_profiles', { id: id, user_data: userData });
    },

    deleteProfile: async function (id) {
      return request('DELETE', 'user_profiles?id=eq.' + encodeURIComponent(id));
    }
  };
}

async function createUniqueUserId(api) {
  let userId = generateUserId();
  for (let i = 0; i < 10; i++) {
    const dup = await api.findProfileByUserId(userId);
    if (!dup) return userId;
    userId = generateUserId();
  }
  return userId + '-' + Date.now();
}

async function createUniqueReferralCode(api) {
  let code = generateReferralCode();
  for (let i = 0; i < 6; i++) {
    const dup = await api.findProfileByReferralCode(code);
    if (!dup) return code;
    code = generateReferralCode();
  }
  return code + Date.now().toString().slice(-3);
}

async function handleRegister(body, api) {
  const accountType = body.account_type === 'partner' ? 'partner' : 'student';
  const fullName = String(body.full_name || body.fullName || '').trim();
  const email = normalizeEmail(body.email);
  const phone = String(body.phone || '').trim();
  const password = String(body.password || '');
  const referredBy = String(body.referred_by || body.referredBy || '').trim().toUpperCase();

  const gender = accountType === 'student' ? na(body.gender) : 'N/A';
  const courseId = accountType === 'student' ? na(body.course_id) : 'N/A';
  const courseName = accountType === 'student' ? na(body.course_name) : 'N/A';
  const courseNumber = accountType === 'student' ? na(body.course_number) : 'N/A';
  const coursePrice = accountType === 'student' ? (Number(body.course_price) || 0) : 0;
  const paymentNo = accountType === 'student' ? na(body.payment_no) : 'N/A';
  const dob = accountType === 'student' ? na(body.date_of_birth || body.dob) : 'N/A';
  const level = accountType === 'student' ? na(body.school_level) : 'N/A';

  if (fullName.length < 3) return jsonResponse({ error: 'Full name is required. Please enter your full name.' }, 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: 'A valid email address is required.' }, 400);
  if (!phone || phone.length < 7) return jsonResponse({ error: 'A valid phone number is required.' }, 400);
  if (!password || password.length < 6) return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);

  const existing = await api.findProfileByEmail(email);
  if (existing) {
    return jsonResponse({ error: 'This email is already registered. Please log in instead.' }, 409);
  }

  let createdAuthId = null;

  try {
    const authRes = await api.createAuthUser(email, password, { full_name: fullName, account_type: accountType });
    const authData = await authRes.json().catch(function () { return {}; });

    if (authRes.status >= 400 || !authData.id) {
      return jsonResponse({ error: 'Could not create authentication account: ' + (authData.msg || authData.error_description || authData.message || 'Unknown error') }, 500);
    }

    createdAuthId = authData.id;

    const userId = await createUniqueUserId(api);
    const referralCode = await createUniqueReferralCode(api);
    const referralLink = 'https://www.idtacademy.com.ng/index/ref/' + referralCode;
    const now = new Date().toISOString();

    const userData = {
      user_id: userId,
      full_name: fullName,
      email: email,
      phone: phone,
      account_type: accountType,
      gender: gender,
      course_id: courseId,
      course_name: courseName,
      course_number: courseNumber,
      course_price: coursePrice,
      payment_no: paymentNo,
      date_of_birth: dob,
      school_level: level,
      referral_code: referralCode,
      referral_link: referralLink,
      referred_by: referredBy || 'N/A',
      referral_bonus: 0,
      referral_activity: [],
      total_referrals: 0,
      paid_referrals: 0,
      total_withdrawn: 0,
      assessment_grade: 'N/A',
      exam_grade: 'N/A',
      level_completed: 'N/A',
      certificate_issued: false,
      date_registered: now,
      status: accountType === 'partner' ? 'active' : 'pending',
      created_at: now
    };

    const insertRes = await api.insertProfile(createdAuthId, userData);
    if (insertRes.status >= 400) {
      const text = await insertRes.text().catch(function () { return ''; });
      await api.deleteAuthUser(createdAuthId);
      return jsonResponse({ error: 'Could not save your account: ' + text }, 502);
    }

    return jsonResponse({
      success: true,
      message: accountType === 'partner'
        ? 'Partner registration successful! Welcome to the IDT Academy Partner Program.'
        : 'Registration successful! Welcome to IDT Academy.',
      user: Object.assign({}, userData, { id: createdAuthId })
    }, 201);

  } catch (err) {
    if (createdAuthId) {
      try { await api.deleteProfile(createdAuthId); } catch (e) {}
      try { await api.deleteAuthUser(createdAuthId); } catch (e) {}
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
  return handleRegister(body, api);
}

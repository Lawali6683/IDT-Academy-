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

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
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
  const fullName = String(body.full_name || body.fullName || '').trim();
  const email = normalizeEmail(body.email);
  const phone = String(body.phone || '').trim();
  const password = String(body.password || '');
  const referredBy = String(body.referred_by || body.referredBy || '').trim().toUpperCase();

  if (fullName.length < 3) return jsonResponse({ error: 'Full name is required. Please enter your full name.' }, 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: 'A valid email address is required.' }, 400);
  if (!phone || phone.length < 7) return jsonResponse({ error: 'A valid phone number is required.' }, 400);
  if (!password || password.length < 6) return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);

  const existing = await api.findPartnerByEmail(email);
  if (existing) return jsonResponse({ error: 'This email is already registered as a partner. Please log in instead.' }, 409);

  let createdAuthId = null;

  try {
    const authRes = await api.createAuthUser(email, password, { full_name: fullName, account_type: 'partner' });
    const authData = await authRes.json().catch(function () { return {}; });

    if (authRes.status >= 400 || !authData.id) {
      return jsonResponse({ error: 'Could not create authentication account: ' + (authData.msg || authData.error_description || authData.message || 'Unknown error') }, 500);
    }

    createdAuthId = authData.id;

    let referralCode = generateReferralCode();
    for (let i = 0; i < 6; i++) {
      const dup = await api.findPartnerByReferralCode(referralCode);
      if (!dup) break;
      referralCode = generateReferralCode();
    }

    const referralLink = 'https://www.idtacademy.com.ng/index/ref/' + referralCode;
    const now = new Date().toISOString();

    const partnerData = {
      full_name: fullName,
      email: email,
      phone: phone,
      account_type: 'partner',
      referral_code: referralCode,
      referral_link: referralLink,
      referred_by: referredBy || '',
      referral_bonus: 0,
      referral_activity: [],
      total_referrals: 0,
      paid_referrals: 0,
      total_withdrawn: 0,
      date_registered: now,
      status: 'active',
      created_at: now
    };

    const insertRes = await api.insertPartner(createdAuthId, partnerData);
    if (insertRes.status >= 400) {
      const text = await insertRes.text().catch(function () { return ''; });
      await api.deleteAuthUser(createdAuthId);
      return jsonResponse({ error: 'Could not save your partner account: ' + text }, 502);
    }

    const safePartner = {
      id: createdAuthId,
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
    if (createdAuthId) {
      try { await api.deletePartner(createdAuthId); } catch (e) {}
      try { await api.deleteAuthUser(createdAuthId); } catch (e) {}
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

  let createdAuthId = null;

  try {
    const authRes = await api.createAuthUser(email, password, { full_name: fullName, account_type: 'student' });
    const authData = await authRes.json().catch(function () { return {}; });

    if (authRes.status >= 400 || !authData.id) {
      return jsonResponse({ error: 'Could not create authentication account: ' + (authData.msg || authData.error_description || authData.message || 'Unknown error') }, 500);
    }

    createdAuthId = authData.id;

    let referralCode = generateReferralCode();
    for (let i = 0; i < 6; i++) {
      const dup = await api.findUserByReferralCode(referralCode);
      if (!dup) break;
      referralCode = generateReferralCode();
    }

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
      referral_bonus: 0,
      referral_activity: [],
      date_of_birth: dob,
      school_level: level,
      date_registered: now,
      status: 'pending',
      assessment_grade: '',
      exam_grade: '',
      level_completed: '',
      certificate_issued: false,
      created_at: now
    };

    const insertRes = await api.insertUser(createdAuthId, userData);
    if (insertRes.status >= 400) {
      const text = await insertRes.text().catch(function () { return ''; });
      await api.deleteAuthUser(createdAuthId);
      return jsonResponse({ error: 'Could not save your account: ' + text }, 502);
    }

    if (referredBy) {
      try {
        const partner = await api.findPartnerByReferralCode(referredBy);
        if (partner) {
          const pd = partner.partner_data || {};
          const activity = Array.isArray(pd.referral_activity) ? pd.referral_activity : [];
          const currentBonus = Number(pd.referral_bonus || 0);
          const earnedBonus = 500;
          activity.push({
            referred_name: fullName,
            referred_email: email,
            course_name: courseName || 'Selected Course',
            course_price: coursePrice,
            bonus: earnedBonus,
            status: 'pending',
            date: now
          });
          await api.updatePartner(partner.id, Object.assign({}, pd, {
            referral_bonus: currentBonus + earnedBonus,
            referral_activity: activity,
            total_referrals: Number(pd.total_referrals || 0) + 1
          }));
        } else {
          const referrer = await api.findUserByReferralCode(referredBy);
          if (referrer) {
            const ud = referrer.user_data || {};
            const activity = Array.isArray(ud.referral_activity) ? ud.referral_activity : [];
            const currentBonus = Number(ud.referral_bonus || 0);
            const earnedBonus = 1500;
            activity.push({
              referred_name: fullName,
              referred_email: email,
              course_name: courseName || 'Selected Course',
              course_price: coursePrice,
              bonus: earnedBonus,
              status: 'pending',
              date: now
            });
            await api.updateUser(referrer.id, Object.assign({}, ud, {
              referral_bonus: currentBonus + earnedBonus,
              referral_activity: activity
            }));
          }
        }
      } catch (refErr) {}
    }

    const safeUser = {
      id: createdAuthId,
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
    if (createdAuthId) {
      try { await api.deleteUser(createdAuthId); } catch (e) {}
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
  if (body.account_type === 'partner') {
    return handlePartnerRegister(body, api);
  }
  return handleStudentRegister(body, api);
}

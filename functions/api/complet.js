const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
  });
}

function sbUrl(env) {
  const base = env.SUPABASE_URL || 'https://orhgklhfltsfdumrrhup.supabase.co';
  return base.endsWith('/') ? base + 'rest/v1/' : base + '/rest/v1/';
}

function sbHeaders(env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

async function getUserProfile(env, userId) {
  const url = sbUrl(env) + 'user_profiles?select=*&id=eq.' + encodeURIComponent(userId);
  const res = await fetch(url, {
    method: 'GET',
    headers: sbHeaders(env)
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => []);
  return Array.isArray(data) && data.length ? data[0] : null;
}

async function updateUserProfile(env, userId, userData) {
  const url = sbUrl(env) + 'user_profiles?id=eq.' + encodeURIComponent(userId);
  return fetch(url, {
    method: 'PATCH',
    headers: sbHeaders(env),
    body: JSON.stringify({ user_data: userData })
  });
}

async function recordComplete(env, userId, completeData) {
  const url = sbUrl(env) + 'complete';
  return fetch(url, {
    method: 'POST',
    headers: sbHeaders(env),
    body: JSON.stringify({
      id: userId,
      complete_data: completeData
    })
  });
}

export const onRequestPost = async (context) => {
  const env = context.env;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' }, 500);
  }

  try {
    let body;
    try {
      body = await context.request.json();
    } catch (err) {
      return json({ success: false, error: 'Invalid JSON body' }, 400);
    }

    const userId = String(body.user_id || body.id || '').trim();
    if (!userId) {
      return json({ success: false, error: 'user_id is required' }, 400);
    }

    const now = new Date().toISOString();
    const dateComplet = String(body.date_complet || now).trim();
    const level = String(body.level_completed || 'final').trim();
    const status = String(body.status || 'completed').trim();
    const assessmentGrade = body.assessment_grade !== undefined ? body.assessment_grade : '';
    const examGrade = body.exam_grade !== undefined ? body.exam_grade : '';

    const profile = await getUserProfile(env, userId);
    if (!profile) {
      return json({ success: false, error: 'User profile not found' }, 404);
    }

    const existingUserData = profile.user_data || {};
    const updatedUserData = Object.assign({}, existingUserData, {
      level_completed: level,
      status: status,
      date_complet: dateComplet,
      assessment_grade: assessmentGrade !== '' ? assessmentGrade : (existingUserData.assessment_grade || ''),
      exam_grade: examGrade !== '' ? examGrade : (existingUserData.exam_grade || ''),
      updated_at: now
    });

    const updateRes = await updateUserProfile(env, userId, updatedUserData);
    if (!updateRes.ok) {
      const errText = await updateRes.text().catch(() => '');
      return json({ success: false, error: 'Failed to update user profile: ' + errText }, 502);
    }

    const completeRecordPayload = {
      user_id: userId,
      full_name: updatedUserData.full_name || '',
      email: updatedUserData.email || '',
      course_id: updatedUserData.course_id || '',
      course_name: updatedUserData.course_name || '',
      level_completed: level,
      date_complet: dateComplet,
      assessment_grade: updatedUserData.assessment_grade,
      exam_grade: updatedUserData.exam_grade,
      created_at: now
    };

    await recordComplete(env, userId, completeRecordPayload).catch(() => {});

    return json({
      success: true,
      message: 'Course completion status updated successfully',
      user_id: userId,
      level_completed: level,
      status: status,
      date_complet: dateComplet
    }, 200);

  } catch (err) {
    return json({ success: false, error: err.message || 'Server error' }, 500);
  }
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS });
};
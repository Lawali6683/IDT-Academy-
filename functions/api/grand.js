const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

async function updateGradeData(env, userId, grade, examGrade, levelCompleted) {
  const base = sbUrl(env);
  const headers = sbHeaders(env);

  try {
    const url = base + 'user_profiles?id=eq.' + encodeURIComponent(userId) + '&select=user_data';
    const r = await fetch(url, { headers });
    const rows = await r.json();

    if (Array.isArray(rows) && rows.length) {
      const ud = (rows[0].user_data && typeof rows[0].user_data === 'object') ? rows[0].user_data : {};
      
      if (grade !== null && grade !== undefined && grade !== '') {
        ud.assessment_grade = String(grade);
      }
      if (examGrade !== null && examGrade !== undefined) {
        ud.exam_grade = String(examGrade);
      }
      if (levelCompleted !== null && levelCompleted !== undefined) {
        ud.level_completed = String(levelCompleted);
      }

      const patchUrl = base + 'user_profiles?id=eq.' + encodeURIComponent(userId);
      const patch = await fetch(patchUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ user_data: ud })
      });

      if (patch.ok) {
        return true;
      }
    }
  } catch (err) {}

  try {
    const jambUrl = base + 'jambdata?id=eq.' + encodeURIComponent(userId) + '&select=jamb_data';
    const r2 = await fetch(jambUrl, { headers });
    const rows2 = await r2.json();

    if (Array.isArray(rows2) && rows2.length) {
      const jd = (rows2[0].jamb_data && typeof rows2[0].jamb_data === 'object') ? rows2[0].jamb_data : {};

      if (grade !== null && grade !== undefined && grade !== '') {
        jd.assessment_grade = String(grade);
      }
      if (examGrade !== null && examGrade !== undefined) {
        jd.exam_grade = String(examGrade);
      }
      if (levelCompleted !== null && levelCompleted !== undefined) {
        jd.level_completed = String(levelCompleted);
      }

      const patchJamb = await fetch(base + 'jambdata?id=eq.' + encodeURIComponent(userId), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ jamb_data: jd })
      });

      return patchJamb.ok;
    }
  } catch (err) {}

  return false;
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
    if (!userId) return json({ success: false, error: 'user_id is required' }, 400);

    const grade = body.grade != null ? body.grade : body.assessment_grade;
    const examGrade = body.exam_grade;
    const levelCompleted = body.level_completed;

    const saved = await updateGradeData(env, userId, grade, examGrade, levelCompleted);
    if (!saved) {
      return json({ success: false, error: 'Could not update grade data in Supabase' }, 502);
    }

    return json({ success: true, grade: grade != null ? String(grade) : '' });

  } catch (err) {
    return json({ success: false, error: err.message || 'Server error' }, 500);
  }
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS });
};
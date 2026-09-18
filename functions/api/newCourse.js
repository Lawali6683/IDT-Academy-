const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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

async function fetchSupabase(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error('Supabase error ' + res.status + ': ' + text);
  }
  return res.json().catch(() => []);
}

const MAX_SLOTS = 40;

export const onRequestPost = async (context) => {
  const env = context.env;

  try {
    let body;
    try {
      body = await context.request.json();
    } catch (err) {
      return json({ success: false, error: 'Invalid JSON body' }, 400);
    }

    const userId = String(body.user_id || '').trim();
    const slot = Math.round(Number(body.slot || 0));
    const amountPaid = Math.round(Number(body.amount_paid || 0));
    const courseId = String(body.course_id || '').trim();
    const courseName = String(body.course_name || '').trim();
    const courseNumber = String(body.course_number || '').trim();
    const coursePrice = Math.round(Number(body.course_price || 0));

    if (!userId) {
      return json({ success: false, error: 'user_id is required' }, 400);
    }
    if (!courseId) {
      return json({ success: false, error: 'course_id is required' }, 400);
    }
    if (!slot || slot < 1 || slot > MAX_SLOTS) {
      return json({ success: false, error: 'Valid payment slot is required' }, 400);
    }

    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, 500);
    }

    const base = sbUrl(env);
    const headers = sbHeaders(env);

    const rows = await fetchSupabase(
      base + 'user_profiles?id=eq.' + encodeURIComponent(userId) + '&select=*',
      { headers }
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return json({ success: false, error: 'User profile not found' }, 404);
    }

    const record = rows[0];
    const ud = record.user_data || {};

    const flag = String(ud['course2payment' + slot] || '').toLowerCase();
    const paid = Math.round(Number(ud['pay' + slot] || 0));

    if (flag !== 'yes') {
      return json({ success: false, error: 'Payment for this slot is not confirmed yet' }, 402);
    }
    if (paid <= 0) {
      return json({ success: false, error: 'Paid amount record not found for this slot' }, 402);
    }
    if (coursePrice > 0 && paid + 1 < coursePrice) {
      return json({ success: false, error: 'Paid amount is less than the course price' }, 402);
    }

    const updated = { ...ud };

    if (!String(updated.course_id || '').trim()) {
      updated.course_id = courseId;
      updated.course_name = courseName || updated.course_name || 'Selected Course';
      updated.course_number = courseNumber || updated.course_number || '';
      updated.course_price = coursePrice || updated.course_price || paid;
    } else {
      let target = 0;
      if (String(updated['2course_id'] || '').trim() === courseId) {
       return json({ success: true, message: 'Course already owned', assigned_slot: 2 });
      }
      for (let i = 2; i <= MAX_SLOTS; i++) {
        const key = i + 'course_id';
        if (!updated[key] || !String(updated[key]).trim()) {
          target = i;
          break;
        }
        if (String(updated[key]).trim() === courseId) {
          return json({ success: true, message: 'Course already owned', assigned_slot: i });
        }
      }
      if (!target) {
        return json({ success: false, error: 'Course slots are full. Please contact support.' }, 409);
      }
      updated[target + 'course_id'] = courseId;
      updated[target + 'course_name'] = courseName || 'Selected Course';
      updated[target + 'course_number'] = courseNumber || '';
      updated[target + 'course_price'] = coursePrice || paid;
    }

    const patchRes = await fetch(
      base + 'user_profiles?id=eq.' + encodeURIComponent(userId),
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ user_data: updated })
      }
    );

    if (!patchRes.ok) {
      const text = await patchRes.text().catch(() => '');
      throw new Error('Failed to save course: ' + text);
    }

    return json({
      success: true,
      message: 'Course added successfully',
      course_id: courseId,
      course_name: courseName
    });

  } catch (err) {
    return json({ success: false, error: err.message || 'Server error' }, 500);
  }
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS });
};

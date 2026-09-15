export async function onRequestPost(context) {
  const { request, env } = context;
  const json = (obj, status) => new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
  try {
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return json({ success: false, message: 'Server not configured' }, 500);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ success: false, message: 'Invalid request body' }, 400);
    }
    const userId = String(body.user_id || '').trim();
    const courseId = String(body.course_id || '').trim();
    const courseName = String(body.course_name || '').trim();
    const courseNumber = String(body.course_number || '').trim();
    const coursePrice = Number(body.course_price || 0);
    const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRe.test(userId)) return json({ success: false, message: 'Invalid user id' }, 400);
    if (!courseId || !courseName || !coursePrice) return json({ success: false, message: 'Missing course details' }, 400);
    const base = 'https://orhgklhfltsfdumrrhup.supabase.co/rest/v1/';
    const headers = {
      'apikey': serviceKey,
      'Authorization': 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    const getUrl = base + 'user_profiles?id=eq.' + encodeURIComponent(userId) + '&select=id,user_data&limit=1';
    const getRes = await fetch(getUrl, { headers: headers });
    if (!getRes.ok) return json({ success: false, message: 'Could not read user profile' }, 502);
    const rows = await getRes.json();
    if (!Array.isArray(rows) || rows.length === 0) return json({ success: false, message: 'User not found' }, 404);
    const ud = (rows[0].user_data && typeof rows[0].user_data === 'object') ? rows[0].user_data : {};
    const oldCourseId = String(ud.course_id || '').trim();
    const hadCourse = oldCourseId && oldCourseId.toUpperCase() !== 'N/A' && oldCourseId !== 'null' && oldCourseId !== 'undefined';
    ud.course_id = courseId;
    ud.course_name = courseName;
    ud.course_number = courseNumber || '000';
    ud.course_price = coursePrice;
    ud.status = 'pending';
    const patchRes = await fetch(base + 'user_profiles?id=eq.' + encodeURIComponent(userId), {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify({ user_data: ud })
    });
    if (!patchRes.ok) return json({ success: false, message: 'Could not save course change' }, 502);
    return json({
      success: true,
      message: hadCourse ? 'Course changed successfully' : 'Course saved successfully',
      changed: hadCourse,
      course_id: courseId,
      course_name: courseName,
      course_number: courseNumber,
      course_price: coursePrice,
      status: 'pending'
    });
  } catch (err) {
    return json({ success: false, message: 'Server error' }, 500);
  }
}

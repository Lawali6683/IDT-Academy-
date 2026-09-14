const SUPABASE_URL = 'https://orhgklhfltsfdumrrhup.supabase.co/rest/v1/';

const departments = [
  { id: 'eng_tech', name: 'Engineering & Technology', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry'] },
  { id: 'medicine', name: 'Medicine & Surgery / Nursing / Pharmacy / Dentistry / Anatomy', subjects: ['English', 'Biology', 'Chemistry', 'Physics'] },
  { id: 'cs_science', name: 'Computer Science (Science Stream) / Cybersecurity / Software Engineering', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry'] },
  { id: 'cs_mgmt', name: 'Computer Science (Management / Polytechnics)', subjects: ['English', 'Mathematics', 'Physics', 'Economics'] },
  { id: 'agric', name: 'Agricultural Science / Agronomy / Animal Science', subjects: ['English', 'Chemistry', 'Biology / Agric Science', 'Physics / Mathematics'] },
  { id: 'architecture', name: 'Architecture / Building / Quantity Surveying / Urban Planning', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry / Fine Arts / Geography'] },
  { id: 'bio_sciences', name: 'Biological Sciences (Biochemistry / Microbiology / Zoology / Botany)', subjects: ['English', 'Biology', 'Chemistry', 'Physics / Mathematics'] },
  { id: 'physical_sci', name: 'Physical Sciences (Physics / Industrial Chemistry / Geology)', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry'] },
  { id: 'math_stats', name: 'Mathematics / Statistics / Data Science', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry / Economics'] },
  { id: 'food_sci', name: 'Food Science and Technology', subjects: ['English', 'Chemistry', 'Mathematics / Physics', 'Biology / Agric Science'] },
  { id: 'law', name: 'Law (Civil / Common / Islamic)', subjects: ['English', 'Literature in English', 'Government / History', 'CRK / IRK / Economics'] },
  { id: 'mass_comm', name: 'Mass Communication / Journalism / Media Studies', subjects: ['English', 'Literature in English', 'Government / History', 'Any Nigerian Language / CRK / IRK / Economics'] },
  { id: 'pol_sci', name: 'Political Science / International Relations / Public Admin', subjects: ['English', 'Government / History', 'Economics', 'Literature in English / CRK / IRK / Geography'] },
  { id: 'sociology', name: 'Sociology / Criminology / Psychology', subjects: ['English', 'Government / History', 'Economics', 'Any Arts or Social Science Subject'] },
  { id: 'economics', name: 'Economics', subjects: ['English', 'Mathematics', 'Economics', 'Government / History / Geography / Commerce'] },
  { id: 'english_lang', name: 'English Language / Linguistics / Literature', subjects: ['English', 'Literature in English', 'Government / History', 'Any Nigerian Language / Arts Subject'] },
  { id: 'history', name: 'History and International Studies', subjects: ['English', 'History / Government', 'Literature in English', 'Any Arts or Social Science Subject'] },
  { id: 'theatre', name: 'Theatre Arts / Performing Arts / Creative Arts', subjects: ['English', 'Literature in English', 'Government / History', 'Fine Arts / Music / Any Arts Subject'] },
  { id: 'languages', name: 'Hausa / Yoruba / Igbo', subjects: ['English', 'The Specific Language', 'Literature in English', 'Any Arts Subject'] },
  { id: 'religious', name: 'Islamic Studies / Christian Religious Studies', subjects: ['English', 'IRK / CRK', 'Government / History', 'Literature in English / Any Arts Subject'] },
  { id: 'accounting', name: 'Accounting / Finance / Banking & Finance', subjects: ['English', 'Mathematics', 'Economics', 'Commerce / Financial Accounting / Government'] },
  { id: 'business_admin', name: 'Business Administration / Business Management', subjects: ['English', 'Mathematics', 'Economics', 'Commerce / Government'] },
  { id: 'marketing', name: 'Marketing / Procurement / Logistics', subjects: ['English', 'Mathematics', 'Economics', 'Commerce / Government'] },
  { id: 'hr', name: 'Human Resource Management / Industrial Relations', subjects: ['English', 'Mathematics', 'Economics', 'Government'] },
  { id: 'insurance', name: 'Insurance / Actuarial Science', subjects: ['English', 'Mathematics', 'Economics', 'Commerce / Physics / Financial Accounting'] },
  { id: 'estate', name: 'Estate Management', subjects: ['English', 'Mathematics', 'Economics', 'Chemistry / Physics / Geography / Agric Science'] },
  { id: 'geography', name: 'Geography / Environmental Management', subjects: ['English', 'Geography', 'Mathematics / Economics', 'Biology / Chemistry / Physics'] },
  { id: 'edu_science', name: 'Education & Science (Physics / Chemistry / Biology)', subjects: ['English', 'Science Subject', 'Mathematics', 'Chemistry / Physics / Biology'] },
  { id: 'edu_math', name: 'Education & Mathematics', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry / Economics'] },
  { id: 'edu_english', name: 'Education & English', subjects: ['English', 'Literature in English', 'Government / History', 'Any Arts Subject'] },
  { id: 'edu_econs', name: 'Education & Economics', subjects: ['English', 'Mathematics', 'Economics', 'Government / Geography'] },
  { id: 'primary_edu', name: 'Primary Education / Special Education', subjects: ['English', 'Any 3 Arts / Social Science / Science Subjects'] },
  { id: 'mls', name: 'Medical Laboratory Science / Radiography', subjects: ['English', 'Biology', 'Chemistry', 'Physics'] },
  { id: 'physio', name: 'Physiotherapy / Prosthetics and Orthotics', subjects: ['English', 'Biology', 'Chemistry', 'Physics'] },
  { id: 'public_health', name: 'Public Health / Environmental Health Science', subjects: ['English', 'Biology', 'Chemistry', 'Physics / Mathematics'] },
  { id: 'veterinary', name: 'Veterinary Medicine', subjects: ['English', 'Biology', 'Chemistry', 'Physics'] },
  { id: 'telecom', name: 'Telecommunication Engineering / Biomedical Engineering', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry'] },
  { id: 'library', name: 'Library and Information Science', subjects: ['English', 'Any 3 Arts / Social Science / Science Subjects'] }
];

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost({ request, env }) {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return json({ success: false, error: 'Server is not configured. Please contact support.' }, 500);
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': serviceKey,
    'Authorization': 'Bearer ' + serviceKey
  };

  let userId = '';
  let departmentId = '';

  try {
    const body = await request.json();
    userId = body.user_id || '';
    departmentId = body.department_id || '';
  } catch (e) {
    return json({ success: false, error: 'Invalid request format.' }, 400);
  }

  if (!userId) {
    return json({ success: false, error: 'User account was not identified. Please log in again.' }, 400);
  }

  if (!departmentId) {
    return json({ success: false, error: 'Please select a course department first.' }, 400);
  }

  const dept = departments.find(function(d) { return d.id === departmentId; });
  if (!dept) {
    return json({ success: false, error: 'The selected course department is not recognized. Please choose again.' }, 400);
  }

  let profileRes;
  try {
    profileRes = await fetch(SUPABASE_URL + 'user_profiles?id=eq.' + encodeURIComponent(userId) + '&select=*', {
      method: 'GET',
      headers: headers
    });
  } catch (e) {
    return json({ success: false, error: 'Could not reach the database. Please check your connection and try again.' }, 502);
  }

  if (!profileRes.ok) {
    return json({ success: false, error: 'Failed to load your profile (HTTP ' + profileRes.status + '). Please try again.' }, profileRes.status);
  }

  let profiles;
  try {
    profiles = await profileRes.json();
  } catch (e) {
    return json({ success: false, error: 'Database returned an unreadable response. Please try again.' }, 502);
  }

  if (!profiles || profiles.length === 0) {
    return json({ success: false, error: 'Your account was not found. Please log in again.' }, 404);
  }

  const profile = profiles[0];
  const ud = (profile.user_data && typeof profile.user_data === 'object') ? profile.user_data : {};

  const oldPrice = ud.jambCoursePrice || ud.course_price || ud.price || 3500;

  const merged = Object.assign({}, ud, {
    jambCourseId: dept.id,
    jambCourseName: dept.name,
    jambCourseSubjects: dept.subjects,
    jambCoursePrice: oldPrice,
    course_id: dept.id,
    course_name: dept.name,
    course_number: dept.subjects.length,
    course_price: oldPrice
  });

  let updateRes;
  try {
    updateRes = await fetch(SUPABASE_URL + 'user_profiles?id=eq.' + encodeURIComponent(userId), {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify({ user_data: merged })
    });
  } catch (e) {
    return json({ success: false, error: 'Could not save your course selection. Please check your connection and try again.' }, 502);
  }

  if (!updateRes.ok) {
    let apiErr = 'HTTP ' + updateRes.status;
    try {
      const errBody = await updateRes.json();
      if (errBody && errBody.message) apiErr = errBody.message;
    } catch (e) {}
    return json({ success: false, error: 'Could not save your course selection (' + apiErr + '). Please try again.' }, updateRes.status);
  }

  return json({
    success: true,
    message: 'Your course has been updated successfully.',
    jambCourseId: dept.id,
    jambCourseName: dept.name,
    jambCourseSubjects: dept.subjects,
    jambCoursePrice: oldPrice
  });
}

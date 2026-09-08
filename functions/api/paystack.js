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

function genRef() {
  return 'IDT-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

async function paystackRequest(path, secret, method, body) {
  const res = await fetch('https://api.paystack.co' + path, {
    method: method || 'POST',
    headers: {
      Authorization: 'Bearer ' + secret,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

async function fetchSupabase(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error('Supabase error ' + res.status + ': ' + text);
  }
  return res.json().catch(() => []);
}

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
    let email = String(body.email || '').trim().toLowerCase();
    let fullName = String(body.full_name || '').trim();
    let courseId = String(body.course_id || '').trim();
    let courseName = String(body.course_name || '').trim();
    let price = Math.round(Number(body.price || body.amount || 0));

    if (!userId) {
      return json({ success: false, error: 'user_id is required' }, 400);
    }

    const base = sbUrl(env);
    const headers = sbHeaders(env);

    let isPartner = false;
    let userRecord = null;

    const userRows = await fetchSupabase(
      base + 'user_profiles?id=eq.' + encodeURIComponent(userId) + '&select=*',
      { headers }
    );

    if (Array.isArray(userRows) && userRows.length > 0) {
      userRecord = userRows[0];
      const ud = userRecord.user_data || {};
      if (!email) email = String(ud.email || '').trim().toLowerCase();
      if (!fullName) fullName = String(ud.full_name || '').trim();
      if (!courseId) courseId = String(ud.course_id || '').trim();
      if (!courseName) courseName = String(ud.course_name || 'Selected Course').trim();
      if (!price) price = Math.round(Number(ud.course_price || 0));
    } else {
      const partnerRows = await fetchSupabase(
        base + 'partner_profiles?id=eq.' + encodeURIComponent(userId) + '&select=*',
        { headers }
      );
      if (Array.isArray(partnerRows) && partnerRows.length > 0) {
        userRecord = partnerRows[0];
        isPartner = true;
        const pd = userRecord.partner_data || {};
        if (!email) email = String(pd.email || '').trim().toLowerCase();
        if (!fullName) fullName = String(pd.full_name || '').trim();
        if (!price) price = Math.round(Number(body.price || body.amount || 0));
      }
    }

    if (!userRecord) {
      return json({ success: false, error: 'User profile not found' }, 404);
    }

    if (!email || !email.includes('@')) {
      return json({ success: false, error: 'Valid user email is required' }, 400);
    }

    if (!price || price <= 0) {
      return json({ success: false, error: 'Valid course price or payment amount is required' }, 400);
    }

    const secretKey = env.PAY_SECRET_KEY;
    if (!secretKey) {
      return json({ success: false, error: 'PAY_SECRET_KEY is not configured' }, 500);
    }

    const reference = genRef();
    const amountInKobo = Math.round(price * 100);

    const metadata = {
      user_id: userId,
      full_name: fullName,
      account_type: isPartner ? 'partner' : 'student',
      course_id: courseId,
      course_name: courseName,
      course_price: price
    };

    const initPayload = {
      email: email,
      amount: amountInKobo,
      reference: reference,
      currency: 'NGN',
      channels: ['bank_transfer'],
      metadata: metadata
    };

    let initRes = await paystackRequest('/transaction/initialize', secretKey, 'POST', initPayload);

    if (!initRes || !initRes.status || !initRes.data || !initRes.data.authorization_url) {
      return json({
        success: false,
        error: (initRes && initRes.message) || 'Failed to initialize Paystack Pay with Transfer'
      }, 502);
    }

    let accountNumber = '';
    let bankName = 'Wema Bank';
    let accountName = 'IDT ACADEMY';
    const authUrl = initRes.data.authorization_url;

    try {
      const verifyRes = await paystackRequest(
        '/transaction/verify/' + encodeURIComponent(reference),
        secretKey,
        'GET',
        null
      );
      const txData = verifyRes && verifyRes.data ? verifyRes.data : {};
      const auth = txData.authorization || {};
      if (auth.bank && auth.account_number) {
        accountNumber = auth.account_number;
        bankName = auth.bank.name || bankName;
      }
    } catch (err) {}

    const expiresInMinutes = 30;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60000).toISOString();

    return json({
      success: true,
      reference: reference,
      amount: price,
      account_number: accountNumber,
      bank_name: bankName,
      account_name: accountName,
      authorization_url: authUrl,
      expires_in_minutes: expiresInMinutes,
      expires_at: expiresAt,
      message: 'Pay with Transfer initialized. Temporary account expires in 30 minutes.'
    });

  } catch (err) {
    return json({ success: false, error: err.message || 'Server error' }, 500);
  }
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS });
};
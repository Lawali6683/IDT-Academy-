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

async function paystackPost(path, secret, body) {
  const res = await fetch('https://api.paystack.co' + path, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + secret,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
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

    if (!email) {
      return json({ success: false, error: 'Valid user email is required' }, 400);
    }

    if (!price || price <= 0) {
      return json({ success: false, error: 'Valid course price or payment amount is required' }, 400);
    }

    const reference = genRef();
    const amountInKobo = price * 100;
    const secretKey = env.PAY_SECRET_KEY;

    if (!secretKey) {
      return json({ success: false, error: 'PAY_SECRET_KEY is not configured' }, 500);
    }

    const chargePayload = {
      email: email,
      amount: amountInKobo,
      reference: reference,
      bank: {
        code: '057',
        account_number: '0000000000'
      },
      metadata: {
        user_id: userId,
        full_name: fullName,
        account_type: isPartner ? 'partner' : 'student',
        course_id: courseId,
        course_name: courseName,
        course_price: price
      }
    };

    let chargeRes = await paystackPost('/charge', secretKey, chargePayload);

    if (!chargeRes || !chargeRes.status) {
      const initPayload = {
        email: email,
        amount: amountInKobo,
        reference: reference,
        currency: 'NGN',
        channels: ['bank_transfer'],
        metadata: chargePayload.metadata
      };
      chargeRes = await paystackPost('/transaction/initialize', secretKey, initPayload);
    }

    if (!chargeRes || !chargeRes.status || !chargeRes.data) {
      return json({
        success: false,
        error: (chargeRes && chargeRes.message) || 'Failed to initialize Paystack dynamic transfer'
      }, 502);
    }

    const data = chargeRes.data;
    let accountNumber = '';
    let bankName = '';
    let accountName = 'IDT ACADEMY';

    if (data.bank && data.bank.account_number) {
      accountNumber = data.bank.account_number;
      bankName = data.bank.bank_name || 'Wema Bank';
    } else if (data.authorization_url) {
      accountNumber = 'VISIT_LINK';
    }

    const expiresInMinutes = 30;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60000).toISOString();

    return json({
      success: true,
      reference: reference,
      amount: price,
      account_number: accountNumber,
      bank_name: bankName,
      account_name: accountName,
      authorization_url: data.authorization_url || '',
      expires_in_minutes: expiresInMinutes,
      expires_at: expiresAt,
      message: 'Dynamic Bank Transfer generated successfully'
    });

  } catch (err) {
    return json({ success: false, error: err.message || 'Server error' }, 500);
  }
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS });
};
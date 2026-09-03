export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-paystack-signature'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
        status: 405, headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    try {
      const body = await request.text();
      const signature = request.headers.get('x-paystack-signature') || '';

      if (!signature) {
        return new Response(JSON.stringify({ success: false, message: 'Missing signature' }), {
          status: 401, headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      const secret = env.PAY_SECRET_KEY || '';
      if (!secret) {
        return new Response(JSON.stringify({ success: false, message: 'Server not configured' }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      const isValid = await verifyPaystackSignature(body, signature, secret);
      if (!isValid) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid signature' }), {
          status: 401, headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      const event = JSON.parse(body);
      const eventType = event.event || '';
      const eventData = event.data || {};

      if (eventType === 'charge.success' && eventData.status === 'success') {
        await handlePaymentSuccess(env, eventData);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...cors }
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: err.message }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...cors }
      });
    }
  }
};

async function verifyPaystackSignature(body, signature, secret) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const buffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const hashArray = Array.from(new Uint8Array(buffer));
    const computedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return computedSignature.toLowerCase() === signature.toLowerCase();
  } catch (e) {
    return false;
  }
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

async function kvIdempotent(env, reference) {
  if (!env.PAYMENTS_KV) return false;
  const key = 'paywebhook:' + reference;
  const exists = await env.PAYMENTS_KV.get(key);
  if (exists) return true;
  await env.PAYMENTS_KV.put(key, '1', { expirationTtl: 259200 });
  return false;
}

async function fetchSupabase(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error('Supabase HTTP ' + res.status + ': ' + text);
  }
  return res.json().catch(() => []);
}

async function handlePaymentSuccess(env, data) {
  const reference = String(data.reference || '').trim();
  const email = String((data.customer && data.customer.email) || '').trim().toLowerCase();
  const amountPaid = Math.round(Number(data.amount || 0) / 100);

  if (!reference || !email) return;

  const isProcessed = await kvIdempotent(env, reference);
  if (isProcessed) return;

  const restUrl = sbUrl(env);
  const headers = sbHeaders(env);

  const checkComplete = await fetchSupabase(
    restUrl + 'completepay?select=*&complete_pay->>reference=eq.' + encodeURIComponent(reference),
    { headers }
  );
  if (Array.isArray(checkComplete) && checkComplete.length > 0) {
    return;
  }

  let userRecord = null;
  let isPartner = false;

  const users = await fetchSupabase(
    restUrl + 'user_profiles?select=*&user_data->>email=eq.' + encodeURIComponent(email),
    { headers }
  );

  if (Array.isArray(users) && users.length > 0) {
    userRecord = users[0];
  } else {
    const partners = await fetchSupabase(
      restUrl + 'partner_profiles?select=*&partner_data->>email=eq.' + encodeURIComponent(email),
      { headers }
    );
    if (Array.isArray(partners) && partners.length > 0) {
      userRecord = partners[0];
      isPartner = true;
    }
  }

  if (!userRecord) return;

  const userId = userRecord.id;
  const now = new Date().toISOString();

  if (!isPartner) {
    let userData = Object.assign({}, userRecord.user_data || {});
    const coursePrice = Number(userData.course_price || 0);

    userData.status = 'active';
    userData.payment_no = reference;

    const referredBy = String(userData.referred_by || '').trim().toUpperCase();
    if (referredBy) {
      let referrerPartner = null;
      let referrerUser = null;

      const partnerSearch = await fetchSupabase(
        restUrl + 'partner_profiles?select=*&partner_data->>referral_code=eq.' + encodeURIComponent(referredBy),
        { headers }
      );
      if (Array.isArray(partnerSearch) && partnerSearch.length > 0) {
        referrerPartner = partnerSearch[0];
      }

      if (referrerPartner) {
        const pd = Object.assign({}, referrerPartner.partner_data || {});
        const currentBonus = Number(pd.referral_bonus || 0);
        const newBonus = currentBonus + 1500;
        let activity = Array.isArray(pd.referral_activity) ? JSON.parse(JSON.stringify(pd.referral_activity)) : [];

        let actFound = false;
        for (let i = 0; i < activity.length; i++) {
          if (activity[i].referred_email === email) {
            activity[i].status = 'completed';
            activity[i].bonus = 1500;
            activity[i].date_paid = now;
            actFound = true;
            break;
          }
        }
        if (!actFound) {
          activity.push({
            referred_name: userData.full_name || 'Student',
            referred_email: email,
            course_name: userData.course_name || 'Selected Course',
            course_price: coursePrice,
            bonus: 1500,
            status: 'completed',
            date: now,
            date_paid: now
          });
        }

        pd.referral_bonus = newBonus;
        pd.referral_activity = activity;
        pd.paid_referrals = Number(pd.paid_referrals || 0) + 1;

        await fetchSupabase(
          restUrl + 'partner_profiles?id=eq.' + encodeURIComponent(referrerPartner.id),
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ partner_data: pd })
          }
        );

        try {
          await fetch('https://www.idtacademy.com.ng/complet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'referral_bonus',
              full_name: pd.full_name || 'Partner',
              email: pd.email || '',
              referral_bonus: 1500,
              referred_name: userData.full_name || 'Student',
              referred_course: userData.course_name || 'Selected Course',
              referral_link: pd.referral_link || ''
            })
          });
        } catch (e) {}
      } else {
        const userSearch = await fetchSupabase(
          restUrl + 'user_profiles?select=*&user_data->>referral_code=eq.' + encodeURIComponent(referredBy),
          { headers }
        );
        if (Array.isArray(userSearch) && userSearch.length > 0) {
          referrerUser = userSearch[0];
        }

        if (referrerUser) {
          const rud = Object.assign({}, referrerUser.user_data || {});
          const currentBonus = Number(rud.referral_bonus || 0);
          const newBonus = currentBonus + 1500;
          let activity = Array.isArray(rud.referral_activity) ? JSON.parse(JSON.stringify(rud.referral_activity)) : [];

          let actFound = false;
          for (let i = 0; i < activity.length; i++) {
            if (activity[i].referred_email === email) {
              activity[i].status = 'completed';
              activity[i].bonus = 1500;
              activity[i].date_paid = now;
              actFound = true;
              break;
            }
          }
          if (!actFound) {
            activity.push({
              referred_name: userData.full_name || 'Student',
              referred_email: email,
              course_name: userData.course_name || 'Selected Course',
              course_price: coursePrice,
              bonus: 1500,
              status: 'completed',
              date: now,
              date_paid: now
            });
          }

          rud.referral_bonus = newBonus;
          rud.referral_activity = activity;

          await fetchSupabase(
            restUrl + 'user_profiles?id=eq.' + encodeURIComponent(referrerUser.id),
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ user_data: rud })
            }
          );

          try {
            await fetch('https://www.idtacademy.com.ng/complet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'referral_bonus',
                full_name: rud.full_name || 'Referrer',
                email: rud.email || '',
                referral_bonus: 1500,
                referred_name: userData.full_name || 'Student',
                referred_course: userData.course_name || 'Selected Course',
                referral_link: rud.referral_link || ''
              })
            });
          } catch (e) {}
        }
      }
    }

    await fetchSupabase(
      restUrl + 'user_profiles?id=eq.' + encodeURIComponent(userId),
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ user_data: userData })
      }
    );

    const payData = {
      user_id: userId,
      full_name: userData.full_name || '',
      email: email,
      course_id: userData.course_id || '',
      course_name: userData.course_name || '',
      course_price: coursePrice,
      amount_paid: amountPaid,
      reference: reference,
      status: 'success',
      paid_at: now
    };

    await fetchSupabase(
      restUrl + 'completepay',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: userId,
          complete_pay: payData,
          date_complet: now
        })
      }
    );

    try {
      await fetch('https://www.idtacademy.com.ng/complet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          full_name: userData.full_name || 'Student',
          email: email,
          course_name: userData.course_name || 'Course',
          course_price: coursePrice,
          amount_paid: amountPaid,
          reference: reference
        })
      });
    } catch (e) {}
  } else {
    let partnerData = Object.assign({}, userRecord.partner_data || {});
    partnerData.status = 'active';

    await fetchSupabase(
      restUrl + 'partner_profiles?id=eq.' + encodeURIComponent(userId),
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ partner_data: partnerData })
      }
    );

    const payData = {
      partner_id: userId,
      full_name: partnerData.full_name || '',
      email: email,
      amount_paid: amountPaid,
      reference: reference,
      account_type: 'partner',
      status: 'success',
      paid_at: now
    };

    await fetchSupabase(
      restUrl + 'completepay',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: userId,
          complete_pay: payData,
          date_complet: now
        })
      }
    );
  }
}
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const accountNumber = url.searchParams.get('accountNumber');
  const bankCode = url.searchParams.get('bankCode');

  if (!accountNumber || !bankCode) {
    return new Response(
      JSON.stringify({ requestSuccessful: false, responseMessage: 'Account number and bank code are required' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const MONNIFY_API_KEY = 'MK_TEST_43S5LVV3LL';
  const MONNIFY_SECRET_KEY = 'WT9CDEZTEJH8LQNGU45WF6GGCVQQYTQB';
  const BASE_URL = 'https://sandbox.monnify.com';

  try {
    const authToken = btoa(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`);

    const tokenRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.requestSuccessful) {
      return new Response(JSON.stringify(tokenData), { status: 400, headers: corsHeaders });
    }

    const accessToken = tokenData.responseBody.accessToken;

    const validateRes = await fetch(
      `${BASE_URL}/api/v2/disbursements/account/validate?accountNumber=${accountNumber}&bankCode=${bankCode}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const validateData = await validateRes.json();

    return new Response(JSON.stringify(validateData), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(
      JSON.stringify({ requestSuccessful: false, responseMessage: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

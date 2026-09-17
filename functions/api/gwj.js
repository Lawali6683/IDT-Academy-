const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Max-Age': '86400'
};

async function fetchUserFromSupabase(env, userId) {
  try {
    if (!userId || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
    const res = await fetch(
      'https://orhgklhfltsfdumrrhup.supabase.co/rest/v1/user_profiles?id=eq.' + encodeURIComponent(userId) + '&select=user_data',
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || !rows.length) return null;
    return rows[0].user_data;
  } catch (err) {
    return null;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
  });
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  return json({ status: 'ok', method: 'GET', message: 'API tana aiki. Aiko POST request da { question, userId }.' });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body = null;
  try {
    body = await request.json();
  } catch (err) {
    return json({ status: 'error', error: 'Invalid JSON body: ' + err.message }, 400);
  }

  const question = body.question || body.message || body.prompt || '';
  const userId = body.userId || body.user_id || '';

  if (!question || !question.trim()) {
    return json({ status: 'error', error: 'Field "question" yana bukata' }, 400);
  }

  let userData = null;
  if (userId) {
    userData = await fetchUserFromSupabase(env, userId);
    if (!userData) {
      return json({ status: 'error', error: 'Bai samu user ba ko ba a saita SUPABASE_SERVICE_ROLE_KEY ba', userId }, 401);
    }
  }

  const apiKey = env.OPENAI_API_KEY || env.GROQ_API_KEY || env.AI_API_KEY;
  if (!apiKey) {
    return json({ status: 'error', error: 'Babu AI API key a env (OPENAI_API_KEY / GROQ_API_KEY / AI_API_KEY)' }, 500);
  }

  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Kai malamin AI ne na IDT Academy. Amsa a Hausa ko yaren da mai amfani ya yi amfani da shi, bayani bayyananne da taqaitacce.' },
          ...(userData ? [{ role: 'system', content: 'Bayanin mai amfani: ' + JSON.stringify(userData) }] : []),
          { role: 'user', content: question }
        ]
      })
    });

    const aiData = await aiRes.json();

    if (!aiRes.ok) {
      return json({ status: 'error', error: 'AI API error', ai_status: aiRes.status, ai_response: aiData }, aiRes.status);
    }

    const answer = aiData.choices && aiData.choices[0] && aiData.choices[0].message
      ? aiData.choices[0].message.content
      : null;

    if (!answer) {
      return json({ status: 'error', error: 'Ba a samu amsa daga AI ba', ai_response: aiData }, 502);
    }

    return json({ status: 'ok', answer, question, userId });
  } catch (err) {
    return json({ status: 'error', error: 'Server error: ' + err.message }, 500);
  }
}

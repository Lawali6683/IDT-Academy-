export const config = { path: '/api/gwj' };

const MODEL = 'gemini-2.0-flash';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

function json(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders()
    }
  });
}

async function gemini(env, systemText, userText, maxTokens) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55000);
  try {
    const payload = {
      systemInstruction: { parts: [{ text: systemText }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens || 8192 }
    };
    const res = await fetch('https://generativelanguage.googleapis.com/v1/models/' + MODEL + ':generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : 'Gemini API error';
      throw new Error(msg);
    }
    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] ? data.candidates[0].content.parts[0].text : '';
    if (!text) {
      const reason = data && data.promptFeedback && data.promptFeedback.blockReason ? data.promptFeedback.blockReason : 'No response from model';
      throw new Error(reason);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (!env || !env.GEMINI_API_KEY) {
    return json({ error: { message: 'GEMINI_API_KEY ba a saita ba. A saka a Cloudflare Pages > Settings > Environment variables.' } }, 500);
  }

  let prompt = '';

  if (request.method === 'GET') {
    const u = new URL(request.url);
    prompt = u.searchParams.get('prompt') || u.searchParams.get('q') || '';
  } else if (request.method === 'POST') {
    try {
      const body = await request.json();
      prompt = body.prompt || body.q || body.question || body.message || '';
    } catch {
      return json({ error: { message: 'JSON body ba daidai ba. Aiko { "prompt": "tambayarka" }' } }, 400);
    }
  } else {
    return json({ error: { message: 'Method ba a goyan baya ba. Yi amfani da GET ko POST.' } }, 405);
  }

  if (!prompt.trim()) {
    return json({ error: { message: 'Tambaya babu kaya. Aiko da { "prompt": "..." }' } }, 400);
  }

  try {
    const answer = await gemini(env, 'Kai taimaki ne mai hikima. Amsa tambayoyi da kyau a hausar da turanci idan an bukata.', prompt, 8192);
    return json({ ok: true, answer, model: MODEL });
  } catch (e) {
    const isAbort = e.name === 'AbortError';
    return json({
      error: {
        message: isAbort ? 'Lokaci ya wuce (timeout 55s). Gwada sake.' : (e.message || 'Matsala ta ciki'),
        type: isAbort ? 'timeout' : 'api_error'
      }
    }, 502);
  }
}

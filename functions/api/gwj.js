export const config = { path: '/api/gwj' };

function getModel(env) {
  return (env && env.GEMINI_MODEL) ? env.GEMINI_MODEL : 'gemini-3.6-flash';
}

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
  const model = getModel(env);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55000);
  const started = Date.now();
  try {
    const payload = {
      systemInstruction: { parts: [{ text: systemText }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens || 8192 }
    };
    const url = 'https://generativelanguage.googleapis.com/v1/models/' + model + ':generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    const rawText = await res.text();
    let data = null;
    try { data = JSON.parse(rawText); } catch { data = null; }

    if (!res.ok) {
      const err = new Error(
        (data && data.error && data.error.message) ? data.error.message :
        (rawText && rawText.length) ? rawText.slice(0, 2000) :
        'Gemini API error HTTP ' + res.status
      );
      err.upstream = {
        status: res.status,
        statusText: res.statusText,
        body: data || rawText
      };
      throw err;
    }

    const cand = data && data.candidates && data.candidates[0];
    const text = cand && cand.content && cand.content.parts && cand.content.parts[0] ? cand.content.parts[0].text : '';

    if (!text) {
      const err = new Error(
        (data && data.promptFeedback && data.promptFeedback.blockReason) ? 'Blocked: ' + data.promptFeedback.blockReason :
        'No response text from model'
      );
      err.upstream = {
        status: res.status,
        statusText: res.statusText,
        finishReason: cand && cand.finishReason ? cand.finishReason : null,
        body: data || rawText
      };
      throw err;
    }

    return {
      text,
      debug: {
        model,
        durationMs: Date.now() - started,
        finishReason: cand && cand.finishReason ? cand.finishReason : null,
        usageMetadata: data && data.usageMetadata ? data.usageMetadata : null
      }
    };
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
    return json({
      ok: false,
      error: { message: 'GEMINI_API_KEY ba a samu ba a cikin env', type: 'config' },
      debug: { envKeys: env ? Object.keys(env) : [], hint: 'Cloudflare Pages > Settings > Environment variables' }
    }, 500);
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
      return json({ ok: false, error: { message: 'JSON body ba daidai ba. Aiko { "prompt": "tambayarka" }', type: 'bad_request' } }, 400);
    }
  } else {
    return json({ ok: false, error: { message: 'Method ba a goyan baya ba. Yi amfani da GET ko POST.', type: 'bad_request' } }, 405);
  }

  if (!prompt.trim()) {
    return json({ ok: false, error: { message: 'Tambaya babu kaya. Aiko da { "prompt": "..." }', type: 'bad_request' } }, 400);
  }

  try {
    const r = await gemini(env, 'Kai taimaki ne mai hikima. Amsa tambayoyi da kyau a hausar da turanci idan an bukata.', prompt, 8192);
    return json({ ok: true, answer: r.text, debug: r.debug });
  } catch (e) {
    const isAbort = e.name === 'AbortError';
    return json({
      ok: false,
      error: {
        type: isAbort ? 'timeout' : (e.upstream ? 'gemini_api' : 'internal'),
        message: isAbort ? 'Lokaci ya wuce (timeout 55s). Gwada sake.' : (e.message || 'Matsala ta ciki'),
        status: isAbort ? 504 : (e.upstream && e.upstream.status ? e.upstream.status : 500)
      },
      debug: {
        method: request.method,
        model: getModel(env),
        upstream: e.upstream || null,
        stack: e.stack ? e.stack.split('\n').slice(0, 5) : null
      }
    }, isAbort ? 504 : 502);
  }
}

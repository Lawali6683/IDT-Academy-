const LANGUAGE_NAMES = {
  ha: 'Hausa',
  yo: 'Yoruba',
  ig: 'Igbo',
  fr: 'French',
  es: 'Spanish'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS_HEADERS)
  });
}

function buildPrompt(text, language) {
  return 'You are a professional translation engine. Translate the text below from English into ' + language + '.\n' +
    'Rules:\n' +
    '1. Translate the ENTIRE text. Never omit, skip, shorten or summarize any part.\n' +
    '2. Do not add any extra information, explanation, greeting or commentary.\n' +
    '3. Keep the original meaning, tone and style exactly.\n' +
    '4. Preserve line breaks and paragraph structure.\n' +
    '5. Keep course names, course numbers, prices, brand names and proper nouns as they are.\n' +
    '6. Return only the translated text. No quotes, no prefixes, no code fences.\n\n' +
    'TEXT TO TRANSLATE:\n' + text;
}

function cleanOutput(raw) {
  let text = String(raw || '').trim();
  const fence = text.match(/^```[a-zA-Z]*\n?([\s\S]*?)\n?```$/);
  if (fence) text = fence[1].trim();
  return text;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse({ error: 'Invalid JSON body.' }, 400);
    }

    const text = String(body.text || '').trim();
    const target = String(body.target || 'ha').trim().toLowerCase();

    if (!text) {
      return jsonResponse({ error: 'Missing "text" field.' }, 400);
    }

    const language = LANGUAGE_NAMES[target] || LANGUAGE_NAMES.ha;

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return jsonResponse({ error: 'GEMINI_API_KEY is not configured.' }, 500);
    }

    const apiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' + apiKey;

    const payload = {
      contents: [
        {
          parts: [{ text: buildPrompt(text, language) }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    };

    let geminiRes;
    try {
      geminiRes = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000)
      });
    } catch (err) {
      return jsonResponse({ error: 'Could not reach the translation service.' }, 502);
    }

    let geminiJson;
    try {
      geminiJson = await geminiRes.json();
    } catch (err) {
      return jsonResponse({ error: 'Invalid response from the translation service.' }, 502);
    }

    if (!geminiRes.ok) {
      const errMsg = (geminiJson && geminiJson.error && geminiJson.error.message) || ('Gemini API error ' + geminiRes.status);
      return jsonResponse({ error: errMsg }, 502);
    }

    const candidates = geminiJson.candidates || [];
    const first = candidates[0];
    const partText = first && first.content && first.content.parts && first.content.parts[0] && first.content.parts[0].text;

    if (!partText) {
      const finish = first && first.finishReason;
      if (finish && finish !== 'STOP') {
        return jsonResponse({ error: 'Translation was blocked by the service (reason: ' + finish + ').' }, 422);
      }
      return jsonResponse({ error: 'Translation returned an empty result.' }, 502);
    }

    return jsonResponse({ translated: cleanOutput(partText) }, 200);
  }
};
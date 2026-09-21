const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const GEMINI_MODEL = 'gemini-2.5-flash';
const OPENROUTER_MODEL = 'google/gemini-2.5-flash';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS }
  });
}

function sbUrl(env) {
  return (env.SUPABASE_URL || 'https://orhgklhfltsfdumrrhup.supabase.co/rest/v1').replace(/\/$/, '');
}

function sbHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
}

function extractJson(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/```(?:json)?/gi, '').replace(/```/g, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch (err) {
    return null;
  }
}

async function fetchGeminiDirect(env, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1/models/' + GEMINI_MODEL + ':generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : 'Gemini error status ' + res.status;
      throw new Error(msg);
    }
    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] ? data.candidates[0].content.parts[0].text : '';
    if (!text) {
      const reason = data && data.promptFeedback && data.promptFeedback.blockReason ? data.promptFeedback.blockReason : 'No response text';
      throw new Error(reason);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOpenRouter(env, promptText, temperature, maxTokens) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const payload = {
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'user', content: promptText }
      ],
      temperature: temperature || 0.4,
      max_tokens: maxTokens || 4096
    };
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.OPENROUTER_API_KEY,
        'HTTP-Referer': 'https://idtacademy.com.ng',
        'X-Title': 'IDT Academy',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : 'OpenRouter error status ' + res.status;
      throw new Error(msg);
    }
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content : '';
    if (!text) throw new Error('Empty response from OpenRouter');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function gemini(env, payload) {
  const promptText = payload && payload.contents && payload.contents[0] && payload.contents[0].parts && payload.contents[0].parts[0] ? payload.contents[0].parts[0].text : '';
  const temp = payload && payload.generationConfig ? payload.generationConfig.temperature : 0.4;
  const maxTokens = payload && payload.generationConfig ? payload.generationConfig.maxOutputTokens : 4096;

  try {
    if (env.GEMINI_API_KEY) {
      return await fetchGeminiDirect(env, payload);
    }
  } catch (err1) {}

  if (env.OPENROUTER_API_KEY) {
    try {
      return await fetchOpenRouter(env, promptText, temp, maxTokens);
    } catch (err2) {
      throw new Error('All AI services failed: ' + err2.message);
    }
  }

  throw new Error('No working AI API key found');
}

async function fetchTopics(env, courseId) {
  try {
    if (!courseId) return [];
    const headers = sbHeaders(env);
    const res = await fetch(sbUrl(env) + '/all_course_post?id=eq.' + encodeURIComponent(courseId) + '&select=all_course', { headers });
    const rows = await res.json();
    const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    const topics = row && row.all_course && Array.isArray(row.all_course.topics) ? row.all_course.topics : [];
    return topics.slice(0, 12).map((t) => ({
      topic_name: String(t.topic_name || ''),
      topic_text: String(t.topic_text || '').slice(0, 1500)
    }));
  } catch (err) {
    return [];
  }
}

function topicsText(topics) {
  const arr = Array.isArray(topics) ? topics : [];
  return arr.map((t, i) => {
    const name = String(t.topic_name || 'Topic ' + (i + 1));
    const text = String(t.topic_text || '');
    return (i + 1) + '. ' + name + '\n' + text;
  }).join('\n\n') || 'No topics provided';
}

function buildGeneratePrompt(courseName, topics, language) {
  let prompt = 'You are the assessment creator for IDT Academy. Create a short quiz from the lesson notes below.\n\n' +
    'Course: ' + (courseName || 'IDT Academy Course') + '\n\nLesson notes:\n' + topicsText(topics) + '\n\n' +
    'Rules:\n' +
    '- Generate exactly 5 questions that test understanding of the notes.\n' +
    '- Questions 1 to 4: multiple choice, each with exactly 4 options. Never use "all of the above" or "none of the above".\n' +
    '- Question 5: short written answer type.\n' +
    '- Keep questions clear, fair and beginner to intermediate level.\n';
  if (language) prompt += '- Write all questions in ' + language + '.\n';
  prompt += 'Return ONLY valid JSON, no markdown, in this exact shape:\n' +
    '{"questions":[{"question":"...","options":["A","B","C","D"],"type":"mcq"},{"question":"...","options":[],"type":"write"}]}';
  return prompt;
}

function normalizeAnswers(questions) {
  return (Array.isArray(questions) ? questions : []).map((q) => {
    const opts = Array.isArray(q.options) ? q.options.map((o) => String(o)) : [];
    let ua = String(q.user_answer != null ? q.user_answer : '').trim();
    if (String(q.type) !== 'write' && opts.length) {
      const idx = parseInt(ua, 10);
      if (!isNaN(idx) && idx >= 0 && idx < opts.length) ua = String(opts[idx]);
    }
    return {
      number: Number(q.number || 0),
      question: String(q.question || ''),
      options: opts,
      type: String(q.type || 'mcq'),
      user_answer: ua
    };
  });
}

function buildGradePrompt(courseName, topics, qs, meta) {
  const lines = qs.map((q, i) => {
    return 'Q' + (i + 1) + ' (' + q.type + '): ' + q.question + '\nStudent answer: ' + (q.user_answer || '(no answer)');
  }).join('\n\n');
  return 'You are the examiner at IDT Academy. Grade this assessment using ONLY the lesson notes below.\n\n' +
    'Course: ' + (courseName || 'IDT Academy Course') + '\n\nLesson notes:\n' + topicsText(topics) + '\n\n' +
    'Questions and student answers:\n' + lines + '\n\n' +
    'Meta: time spent ' + (meta.time_spent || 0) + ' seconds, tab switches ' + (meta.flagged || 0) + ', timed out ' + (meta.timed_out === true ? 'yes' : 'no') + '.\n\n' +
    'Rules:\n' +
    '- For each question set is_correct to true or false. For written answers judge the meaning, not exact wording. No partial credit.\n' +
    '- correct_answer must be the best answer. For multiple choice use the option text. For written questions give a short model answer from the notes.\n' +
    '- explanation must be one short sentence.\n' +
    '- message must be a short encouraging message in ' + (meta.lang || 'English') + '.\n' +
    'Return ONLY valid JSON, no markdown, in this exact shape:\n' +
    '{"score":3,"pct":60,"passed":true,"message":"...","results":[{"number":1,"question":"...","user_answer":"...","is_correct":true,"correct_answer":"...","explanation":"..."}]}';
}

async function generateQuestions(env, body) {
  const payload = {
    contents: [{ role: 'user', parts: [{ text: buildGeneratePrompt(String(body.course_name || ''), body.topics, String(body.language || '')) }] }],
    generationConfig: { temperature: 0.6, maxOutputTokens: 2048 }
  };
  const text = await gemini(env, payload);
  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.questions)) throw new Error('Could not parse questions');
  const questions = parsed.questions.slice(0, 5).map((q) => ({
    question: String(q.question || ''),
    options: Array.isArray(q.options) ? q.options.map((o) => String(o)) : [],
    type: String(q.type || 'mcq')
  }));
  if (questions.length !== 5) throw new Error('Expected 5 questions');
  return questions;
}

async function gradeQuestions(env, body, qs) {
  const payload = {
    contents: [{ role: 'user', parts: [{ text: buildGradePrompt(String(body.course_name || ''), body.topics, qs, {
      time_spent: Number(body.time_spent || 0),
      flagged: Number(body.flagged || 0),
      timed_out: body.timed_out === true,
      lang: String(body.preferred_lang || body.language || 'English')
    }) }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
  };
  const text = await gemini(env, payload);
  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.results)) throw new Error('Could not parse grade result');
  const byNum = {};
  parsed.results.forEach((r) => {
    byNum[Number(r.number || 0)] = r;
  });
  const results = qs.map((q, i) => {
    const r = byNum[i + 1] || {};
    return {
      number: i + 1,
      question: String(r.question != null ? r.question : q.question),
      user_answer: String(r.user_answer != null ? r.user_answer : q.user_answer),
      is_correct: r.is_correct === true,
      correct_answer: String(r.correct_answer != null ? r.correct_answer : ''),
      explanation: String(r.explanation != null ? r.explanation : '')
    };
  });
  const score = results.filter((r) => r.is_correct).length;
  const pct = Math.round((score / qs.length) * 100);
  const passed = score >= 3;
  const message = String(parsed.message || (passed ? 'You passed this assessment. Excellent work!' : 'Read the notes again and try again.'));
  return { score: score, pct: pct, passed: passed, message: message, results: results };
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
    if (!env.GEMINI_API_KEY && !env.OPENROUTER_API_KEY) {
      return json({ success: false, error: 'API key is not configured' }, 500);
    }
    const action = String(body.action || '');
    if (action === 'grade') {
      const qs = normalizeAnswers(body.questions);
      if (!qs.length) return json({ success: false, error: 'questions are required' }, 400);
      let topics = Array.isArray(body.topics) && body.topics.length ? body.topics : await fetchTopics(env, String(body.course_id || ''));
      body.topics = topics;
      let result = null;
      try {
        result = await gradeQuestions(env, body, qs);
      } catch (err) {
        return json({ success: false, error: err.message || 'Grading failed' }, 502);
      }
      return json({ success: true, score: result.score, pct: result.pct, passed: result.passed, message: result.message, results: result.results });
    }
    let topics = Array.isArray(body.topics) && body.topics.length ? body.topics : await fetchTopics(env, String(body.course_id || ''));
    body.topics = topics;
    let questions = null;
    try {
      questions = await generateQuestions(env, body);
    } catch (err) {
      return json({ success: false, error: err.message || 'Generation failed' }, 502);
    }
    const assessmentId = 'as_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return json({ success: true, assessment_id: assessmentId, questions: questions });
  } catch (err) {
    return json({ success: false, error: err.message || 'Server error' }, 500);
  }
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS });
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const MODEL = 'gemini-2.5-flash';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS }
  });
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

function topicsText(topics) {
  const arr = Array.isArray(topics) ? topics : [];
  return arr.map((t, i) => {
    const name = String(t.topic_name || 'Topic ' + (i + 1));
    const text = String(t.topic_text || '');
    return (i + 1) + '. ' + name + '\n' + text;
  }).join('\n\n') || 'No topics provided';
}

function buildGeneratePrompt(courseName, topics, language) {
  let prompt = 'You are the chief examiner of IDT Academy (Intelligent Digital Technology Academy, www.idtacademy.com.ng). Create the official FINAL EXAMINATION for a student who completed the whole course below.\n\n' +
    'Course: ' + (courseName || 'IDT Academy Course') + '\n\nFull course lesson notes:\n' + topicsText(topics) + '\n\n' +
    'Rules:\n' +
    '- Generate exactly 60 questions total.\n' +
    '- Questions 1 to 50: multiple choice with exactly 4 options labeled A, B, C, D. Never use "all of the above" or "none of the above". Correct answer must be one of the four options, written exactly as its option text.\n' +
    '- Questions 51 to 60: written answer questions where the student types their own answer.\n' +
    '- Cover all topics evenly across the whole course. Mix easy, medium and harder questions.\n' +
    '- Every question must be answerable ONLY from the lesson notes above. Do not invent facts outside the notes.\n';
  if (language && String(language).toLowerCase() !== 'english') {
    prompt += '- Write ALL questions in ' + language + '. Also include an English translation of each question right after it inside the same "question" field, in this format: "' + language + ' text  (English: English text)". Keep the options in ' + language + '.\n';
  }
  prompt += 'Return ONLY valid JSON, no markdown, in this exact shape:\n' +
    '{"questions":[{"question":"...","options":["A","B","C","D"],"type":"mcq","correct_answer":"A","explanation":"one short sentence"},{"question":"...","options":[],"type":"write","correct_answer":"model answer from the notes","explanation":"one short sentence"}]}';
  return prompt;
}

function buildGradePrompt(courseName, topics, qs, meta, language) {
  const lines = qs.map((q, i) => {
    return 'Q' + (i + 1) + ' (' + q.type + '): ' + q.question + '\nOptions: ' + (Array.isArray(q.options) && q.options.length ? q.options.join(' | ') : '(written answer)') + '\nStudent answer: ' + (String(q.user_answer || '').trim() ? q.user_answer : '(no answer given)');
  }).join('\n\n');
  return 'You are the chief examiner of IDT Academy. Grade this final exam strictly and fairly using ONLY the lesson notes below.\n\n' +
    'Course: ' + (courseName || 'IDT Academy Course') + '\n\nLesson notes:\n' + topicsText(topics) + '\n\n' +
    'Student answers:\n' + lines + '\n\n' +
    'Meta: time spent ' + (meta.time_spent || 0) + ' seconds, tab switches ' + (meta.flagged || 0) + ', timed out ' + (meta.timed_out === true ? 'yes' : 'no') + '.\n\n' +
    'Marking rules:\n' +
    '- Q1 to Q50 (mcq): each is worth 1.5 marks. Full 1.5 if the student chose the exact correct option text; otherwise 0.\n' +
    '- Q51 to Q60 (write): each is worth 2.5 marks. Grade by meaning, not exact wording. Award 2.5 for a fully correct answer, 1.7 for a mostly correct answer with a small mistake, 1.2 for a partially correct answer, and 0 for wrong or empty.\n' +
    '- Compute score = sum of all earned marks, pct = round(score / 100 * 100), passed = score >= 70.\n' +
    '- correct_answer must be the exact best answer. For mcq use the option text. For written give a short model answer from the notes.\n' +
    '- explanation must be one short sentence for each question.\n' +
    '- message must be a short encouraging message in ' + (language || 'English') + '.\n' +
    'Return ONLY valid JSON, no markdown, in this exact shape:\n' +
    '{"score":72.5,"pct":73,"passed":true,"message":"...","results":[{"number":1,"type":"mcq","question":"...","user_answer":"...","is_correct":true,"correct_answer":"...","explanation":"...","earned":1.5,"marks":1.5}]}';
}

function normalizeAnswers(questions) {
  return (Array.isArray(questions) ? questions : []).map((q) => {
    const opts = Array.isArray(q.options) ? q.options.map((o) => String(o)) : [];
    const type = String(q.type || (opts.length ? 'mcq' : 'write'));
    const raw = String(q.user_answer != null ? q.user_answer : '').trim();
    let ua = raw;
    if (type === 'mcq' && opts.length) {
      const letter = raw.toUpperCase();
      if (/^[A-D]$/.test(letter)) {
        const li = letter.charCodeAt(0) - 65;
        ua = opts[li] != null ? opts[li] : raw;
      }
    }
    return {
      number: Number(q.number || 0),
      type: type,
      question: String(q.question || ''),
      options: opts,
      user_answer: ua
    };
  });
}

async function generateQuestions(env, body) {
  const payload = {
    user_id: String(body.user_id || ''),
    course_id: String(body.course_id || ''),
    course_name: String(body.course_name || ''),
    language: String(body.language || 'English')
  };
  const prompt = buildGeneratePrompt(payload.course_name, body.topics, payload.language);
  const text = await gemini(env,
    'You only output valid JSON objects. You never wrap JSON in markdown code blocks.',
    prompt, 12288);
  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.questions)) throw new Error('Could not parse generated questions');
  const qs = parsed.questions.slice(0, 60);
  if (qs.length !== 60) throw new Error('Expected 60 questions but got ' + qs.length);
  const out = qs.map((q, i) => {
    const isMcq = i < 50;
    const opts = Array.isArray(q.options) ? q.options.slice(0, 4).map((o) => String(o)) : [];
    return {
      question: String(q.question || ''),
      options: isMcq ? opts : [],
      type: isMcq ? 'mcq' : 'write',
      correct_answer: String(q.correct_answer != null ? q.correct_answer : ''),
      explanation: String(q.explanation != null ? q.explanation : '')
    };
  });
  return out;
}

async function gradeQuestions(env, body, qs) {
  const meta = {
    time_spent: Number(body.time_spent || 0),
    flagged: Number(body.flagged || 0),
    timed_out: body.timed_out === true
  };
  const lang = String(body.preferred_lang || body.language || 'English');
  const prompt = buildGradePrompt(String(body.course_name || ''), body.topics, qs, meta, lang);
  const text = await gemini(env,
    'You only output valid JSON objects. You never wrap JSON in markdown code blocks.',
    prompt, 12288);
  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.results)) throw new Error('Could not parse grade result');
  const byNum = {};
  parsed.results.forEach((r) => {
    byNum[Number(r.number || 0)] = r;
  });
  const results = qs.map((q, i) => {
    const r = byNum[i + 1] || {};
    const isMcq = q.type === 'mcq';
    const marks = isMcq ? 1.5 : 2.5;
    const earnedRaw = Number(r.earned != null ? r.earned : (r.is_correct === true ? marks : 0));
    const earned = isMcq ? (r.is_correct === true ? 1.5 : 0) : Math.min(marks, Math.max(0, earnedRaw));
    return {
      number: i + 1,
      type: q.type,
      question: String(r.question != null ? r.question : q.question),
      user_answer: String(r.user_answer != null ? r.user_answer : q.user_answer),
      is_correct: r.is_correct === true,
      correct_answer: String(r.correct_answer != null ? r.correct_answer : q.correct_answer || ''),
      explanation: String(r.explanation != null ? r.explanation : ''),
      earned: Math.round(earned * 10) / 10,
      marks: marks
    };
  });
  const score = Math.round(results.reduce((sum, x) => sum + x.earned, 0) * 10) / 10;
  const pct = Math.round((score / 100) * 100);
  const passed = score >= 70;
  const message = String(parsed.message || (passed ? 'Congratulations! You passed your final exam with ' + pct + '%.' : 'You scored ' + pct + '%. You need 70% to pass. Read your notes and try again after 7 days.'));
  return { score: score, pct: pct, passed: passed, message: message, results: results };
}

function buildExplainPrompt(courseName, data, language) {
  const qs = Array.isArray(data.questions) ? data.questions : [];
  const lines = qs.map((q, i) => {
    const ok = q.is_correct === true;
    const sk = !String(q.user_answer || '').trim();
    return 'Q' + (i + 1) + ' [' + (ok ? 'CORRECT' : (sk ? 'SKIPPED' : 'WRONG')) + ']: ' + q.question + '\nYour answer: ' + (String(q.user_answer || '').trim() ? q.user_answer : '(no answer)') + (ok ? '' : '\nCorrect answer: ' + String(q.correct_answer || '')) + (q.explanation ? '\nWhy: ' + q.explanation : '');
  }).join('\n\n');
  return 'You are the caring AI teacher of IDT Academy. A student just finished the final exam for the course "' + (courseName || 'IDT Academy') + '" and scored ' + Number(data.score || 0).toFixed(1) + '/100 (' + Number(data.pct || 0) + '%). They ' + (data.passed === true ? 'PASSED. Congratulate them warmly and tell them to go for their certificate.' : 'did NOT pass (need 70%). Encourage them strongly and tell them they can retry after 7 days.') + '\n\n' +
    'Here is their full exam breakdown:\n' + lines + '\n\n' +
    'Write a complete, detailed explanation in ' + language + ' AND in English, both together. Structure it as:\n' +
    '1. Summary of the result (score, pass/fail, what it means).\n' +
    '2. The topics/skills they did well on.\n' +
    '3. The topics they got wrong or skipped — explain each one simply with the correct answer, why it is correct, and a practical example so they finally understand.\n' +
    '4. Clear study advice for the next 7 days: what to reread and how to prepare for the retry.\n' +
    '5. One encouraging closing message.\n' +
    'Write in clear markdown with **bold** headings and short bullet lists. If the student answered in another language, match their language too.';
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
    if (!env.GEMINI_API_KEY) return json({ success: false, error: 'GEMINI_API_KEY is not set' }, 500);
    const action = String(body.action || '');
    if (action === 'grade') {
      const qs = normalizeAnswers(body.questions);
      if (qs.length !== 60) return json({ success: false, error: 'Expected 60 questions' }, 400);
      const topics = Array.isArray(body.topics) && body.topics.length ? body.topics : [];
      body.topics = topics;
      let result = null;
      try {
        result = await gradeQuestions(env, body, qs);
      } catch (err) {
        try {
          result = await gradeQuestions(env, body, qs);
        } catch (err2) {
          return json({ success: false, error: err2.message || 'Grading failed' }, 502);
        }
      }
      return json({ success: true, score: result.score, pct: result.pct, passed: result.passed, message: result.message, results: result.results });
    }
    if (action === 'explain') {
      const lang = String(body.language || 'English').trim() || 'English';
      const prompt = buildExplainPrompt(String(body.course_name || ''), body, lang);
      const explanation = await gemini(env,
        'You are a kind, practical teacher. Use clear markdown. Answer completely.',
        prompt, 8192);
      return json({ success: true, explanation: explanation, language: lang });
    }
    const topics = Array.isArray(body.topics) && body.topics.length ? body.topics : [];
    body.topics = topics;
    if (!topics.length) return json({ success: false, error: 'topics are required' }, 400);
    let questions = null;
    try {
      questions = await generateQuestions(env, body);
    } catch (err) {
      try {
        questions = await generateQuestions(env, body);
      } catch (err2) {
        return json({ success: false, error: err2.message || 'Generation failed' }, 502);
      }
    }
    const examId = 'ex_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return json({ success: true, exam_id: examId, questions: questions });
  } catch (err) {
    return json({ success: false, error: err.message || 'Server error' }, 500);
  }
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS });
};
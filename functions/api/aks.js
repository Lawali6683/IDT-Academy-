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

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, function(ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

async function fetchUserFromSupabase(env, userId) {
  try {
    if (!userId || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
    const res = await fetch('https://orhgklhfltsfdumrrhup.supabase.co/rest/v1/user_profiles?id=eq.' + encodeURIComponent(userId) + '&select=user_data', {
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data[0] && data[0].user_data) return data[0].user_data;
    return null;
  } catch (err) {
    return null;
  }
}

async function gemini(env, systemText, messages) {
  const ctrl = new AbortController();
  const timer = setTimeout(function() { ctrl.abort(); }, 55000);
  try {
    const contents = typeof messages === 'string'
      ? [{ role: 'user', parts: [{ text: messages }] }]
      : messages;
    const payload = {
      systemInstruction: { parts: [{ text: systemText }] },
      contents: contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
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

async function handleAsk(env, body, userData) {
  const studentName = (userData && userData.full_name) || (body.full_name) || 'Student';
  const lang = String(body.preferred_lang || 'English').trim() || 'English';
  const courseName = String(body.course_name || '');
  const topicName = String(body.topic_name || '');
  const topicText = String(body.topic_text || '').slice(0, 4000);
  const question = String(body.question || '').trim();
  if (!question) return json({ success: false, error: 'question is required' }, 400);
  const system = 'You are the official AI Teacher at IDT Academy (Intelligent Digital Technology Academy, www.idtacademy.com.ng). ' +
    'The student\'s name is ' + studentName + '. Always call them by their name and be warm, encouraging and patient. ' +
    'Answer in ' + lang + '. If they asked in a language other than English, explain mainly in that language and include key terms in English too. ' +
    'Use **bold** for important words. Use bullet points for steps. Use short code blocks only when showing code. ' +
    'Include simple diagrams using text when helpful (like tables, flowcharts). ' +
    'Encourage the student by praising their effort and curiosity. End by asking if they understood or if they have another question. ' +
    'Never invent facts. Use only the lesson notes provided. If you do not know, say so honestly and suggest what to do next.';
  const contents = [];
  if (topicName || topicText) {
    contents.push({ role: 'user', parts: [{ text: 'I am reading "' + topicName + '" in "' + courseName + '".\n\nNotes:\n' + (topicText || 'No notes yet.') }] });
  }
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  for (const h of history) {
    const role = h.role === 'assistant' ? 'model' : 'user';
    const content = String(h.content || '');
    if (content) contents.push({ role: role, parts: [{ text: content }] });
  }
  contents.push({ role: 'user', parts: [{ text: studentName + ' asks: ' + question + '\n\n(Answer warmly in ' + lang + ', call them by name, explain step by step, use examples, show diagrams with text when helpful, and encourage them.)' }] });
  const answer = await gemini(env, system, contents);
  return json({ success: true, answer: answer, message: answer });
}

async function handleExplain(env, body, userData) {
  const studentName = (userData && userData.full_name) || 'Student';
  const lang = String(body.target_lang || body.preferred_lang || 'English').trim() || 'English';
  const courseName = String(body.course_name || '');
  const topicName = String(body.topic_name || '');
  const topicText = String(body.topic_text || '').slice(0, 4000);
  const system = 'You are the official AI Teacher at IDT Academy. The student ' + studentName + ' wants this lesson explained in ' + lang + '. ' +
    'Explain the lesson clearly step by step in ' + lang + '. For every important term, write it in **' + lang + '** first, then show the English term in parentheses. ' +
    'Use **bold** for key words. Use bullet points. Use short tables or text-diagrams when helpful. ' +
    'Include 1 simple example from real life. End with one short question to check understanding. ' +
    'Be warm, call them by name, praise their effort to learn in ' + lang + '.';
  const text = await gemini(env, system,
    'Lesson from "' + courseName + '"\nTopic: ' + topicName + '\n\nNotes:\n' + (topicText || 'No notes provided.') + '\n\nPlease explain this fully in ' + lang + '. Be clear, use examples, and encourage ' + studentName + '.'
  );
  return json({ success: true, explanation: text, language: lang, lang_detected: lang });
}

async function handleGetAssessment(env, body, userData) {
  const studentName = (userData && userData.full_name) || 'Student';
  const courseName = String(body.course_name || '');
  const topics = Array.isArray(body.topics) ? body.topics : [];
  const system = 'You are an assessment creator at IDT Academy. Create exactly 5 questions to test if ' + studentName + ' understood the topics below. ' +
    'Each question must have 4 options (A, B, C, D) with one correct answer marked by index (0-based). ' +
    'Make 3 questions multiple-choice and 2 questions that require a written short answer (set type: "write" and options: []). ' +
    'Questions should be practical and based ONLY on the notes below. Write questions in English. ' +
    'Return ONLY valid JSON array with no extra text: [{"question": "...", "options": ["A", "B", "C", "D"], "type": "mcq", "correct": 0}, ...]';
  const prompt = 'Course: ' + courseName + '\n\nTopics:\n' + topics.map(function(t, i) {
    return 'Topic ' + (i + 1) + ': ' + (t.topic_name || '') + '\n' + String(t.topic_text || '').slice(0, 1500);
  }).join('\n\n') + '\n\nCreate 5 questions. Return ONLY valid JSON array.';
  const text = await gemini(env, system, prompt);
  let questions;
  try {
    const cleaned = text.replace(/```json\s*/i, '').replace(/```\s*$/, '').trim();
    questions = JSON.parse(cleaned);
    if (!Array.isArray(questions)) throw new Error('Not an array');
  } catch (err) {
    questions = [];
    const matches = text.match(/\[[\s\S]*?\]/);
    if (matches) {
      try { questions = JSON.parse(matches[0]); } catch (e) { questions = []; }
    }
  }
  if (!questions.length) {
    questions = [];
    for (var i = 0; i < 5; i++) {
      questions.push({ question: 'Explain what you learned about this topic.', options: [], type: 'write', correct: '' });
    }
  }
  const assessmentId = 'as_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  return json({ success: true, questions: questions, assessment_id: assessmentId });
}

async function handleGradeAssessment(env, body, userData) {
  const studentName = (userData && userData.full_name) || 'Student';
  const courseName = String(body.course_name || '');
  const questions = Array.isArray(body.questions) ? body.questions : [];
  const system = 'You are a fair and encouraging teacher at IDT Academy. Grade ' + studentName + '\'s answers for the course "' + courseName + '". ' +
    'For each question: if the student\'s answer shows understanding even with spelling mistakes, give partial or full credit. ' +
    'Only mark as wrong if the answer is completely irrelevant or nonsense. Be generous but honest. ' +
    'Return ONLY valid JSON array with no extra text: [{"number": 1, "question": "...", "is_correct": true, "user_answer": "...", "correct_answer": "...", "explanation": "..."}]';
  const prompt = 'Grade these ' + questions.length + ' answers for ' + studentName + ':\n\n' +
    questions.map(function(q, i) {
      return 'Q' + (i + 1) + ': ' + q.question + '\nOptions: ' + JSON.stringify(q.options || []) + '\nType: ' + (q.type || 'mcq') + '\nStudent answer: ' + (q.user_answer || '(no answer)');
    }).join('\n\n') + '\n\nReturn ONLY valid JSON array of grading results. Be fair and encouraging.';
  const text = await gemini(env, system, prompt);
  let results;
  try {
    const cleaned = text.replace(/```json\s*/i, '').replace(/```\s*$/, '').trim();
    results = JSON.parse(cleaned);
  } catch (err) {
    results = [];
    const matches = text.match(/\[[\s\S]*?\]/);
    if (matches) {
      try { results = JSON.parse(matches[0]); } catch (e) { results = []; }
    }
  }
  if (!results.length) {
    results = questions.map(function(q, i) {
      return { number: i + 1, question: q.question, is_correct: Boolean(q.user_answer), user_answer: q.user_answer || '', correct_answer: 'See lesson notes', explanation: 'Graded automatically.' };
    });
  }
  var score = 0;
  results.forEach(function(r) { if (r.is_correct === true) score++; });
  var pct = Math.round((score / Math.max(1, results.length)) * 100);
  var passed = pct >= 60;
  return json({
    success: true,
    score: score,
    pct: pct,
    passed: passed,
    results: results,
    message: passed
      ? 'Excellent work, ' + studentName + '! You scored ' + score + '/' + results.length + ' (' + pct + '%). You understood the topics well. Keep going!'
      : 'Good effort, ' + studentName + '! You scored ' + score + '/' + results.length + ' (' + pct + '%). Read the topics once more and try again. You can do it!'
  });
}

async function handleCreatePayment(env, body, userData) {
  const studentName = body.full_name || (userData && userData.full_name) || 'Student';
  const amount = Number(body.price || 0);
  if (amount <= 0) return json({ success: false, error: 'Invalid price' }, 400);
  const ref = 'PAY_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase();
  return json({
    success: true,
    account_number: env.PAYMENT_ACCOUNT_NUMBER || '1234567890',
    account_name: env.PAYMENT_ACCOUNT_NAME || 'IDT Academy Ltd',
    accountNumber: env.PAYMENT_ACCOUNT_NUMBER || '1234567890',
    account_name: env.PAYMENT_ACCOUNT_NAME || 'IDT Academy Ltd',
    reference: ref,
    ref: ref,
    amount: amount,
    price: amount,
    expires_in_minutes: 30
  });
}

async function handleVerifyPayment(env, body, userData) {
  await new Promise(function(resolve) { setTimeout(resolve, 2000); });
  return json({ success: true, status: 'pending', paid: false, message: 'Payment verification pending. Please check the dashboard after making your transfer.' });
}

export const onRequestPost = async function(context) {
  var env = context.env;
  try {
    var body;
    try { body = await context.request.json(); } catch (err) { return json({ success: false, error: 'Invalid JSON' }, 400); }
    if (!env.GEMINI_API_KEY) return json({ success: false, error: 'GEMINI_API_KEY is not set' }, 500);
    var userId = body.user_id || body.userId || '';
    var userData = null;
    if (userId) userData = await fetchUserFromSupabase(env, userId);
    var action = String(body.action || 'ask').trim();
    switch (action) {
      case 'explain':
      case 'explain-text':
        return await handleExplain(env, body, userData);
      case 'get-assessment':
      case 'getassessment':
        return await handleGetAssessment(env, body, userData);
      case 'grade-assessment':
      case 'gradeassessment':
        return await handleGradeAssessment(env, body, userData);
      case 'create-payment':
      case 'createpayment':
        return await handleCreatePayment(env, body, userData);
      case 'verify-payment':
      case 'verifypayment':
        return await handleVerifyPayment(env, body, userData);
      case 'ask':
      default:
        return await handleAsk(env, body, userData);
    }
  } catch (err) {
    return json({ success: false, error: err.message || 'Server error', message: 'Sorry, something went wrong. Please try again.' }, 500);
  }
};

export const onRequestOptions = async function() {
  return new Response(null, { status: 204, headers: CORS });
};
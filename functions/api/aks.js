const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
};

const PRIMARY_GEMINI_MODEL = 'gemini-2.5-flash';
const FALLBACK_OPENROUTER_MODEL = 'openai/gpt-4o-mini';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
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

async function callGemini(env, systemText, messages) {
  const ctrl = new AbortController();
  const timer = setTimeout(function() { ctrl.abort(); }, 60000);

  try {
    const contents = typeof messages === 'string'
      ? [{ role: 'user', parts: [{ text: messages }] }]
      : messages;

    const payload = {
      systemInstruction: { parts: [{ text: systemText }] },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 }
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + PRIMARY_GEMINI_MODEL + ':generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });

    let data = null;
    try {
      data = await res.json();
    } catch (err) {
      data = null;
    }

    if (!res.ok) {
      const msg = (data && data.error && data.error.message) ? data.error.message : ('Gemini Error code ' + res.status);
      throw new Error(msg);
    }

    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts ? data.candidates[0].content.parts.map(function(p) { return p.text || ''; }).join('') : '';

    if (!text) {
      const finish = data && data.candidates && data.candidates[0] && data.candidates[0].finishReason ? data.candidates[0].finishReason : '';
      const reason = data && data.promptFeedback && data.promptFeedback.blockReason ? data.promptFeedback.blockReason : (finish ? ('Gemini blocked: ' + finish) : 'Gemini response empty');
      throw new Error(reason);
    }

    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenRouter(env, systemText, messages) {
  const ctrl = new AbortController();
  const timer = setTimeout(function() { ctrl.abort(); }, 60000);

  try {
    const openRouterMessages = [
      { role: 'system', content: systemText }
    ];

    if (typeof messages === 'string') {
      openRouterMessages.push({ role: 'user', content: messages });
    } else if (Array.isArray(messages)) {
      for (const msg of messages) {
        const role = msg.role === 'model' ? 'assistant' : 'user';
        let contentText = '';
        if (msg.parts && Array.isArray(msg.parts)) {
          contentText = msg.parts.map(function(p) { return p.text || ''; }).join('\n');
        } else {
          contentText = String(msg.content || '');
        }
        if (contentText) {
          openRouterMessages.push({ role: role, content: contentText });
        }
      }
    }

    const payload = {
      model: FALLBACK_OPENROUTER_MODEL,
      messages: openRouterMessages,
      temperature: 0.7,
      max_tokens: 4096
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

    let data = null;
    try {
      data = await res.json();
    } catch (err) {
      data = null;
    }

    if (!res.ok) {
      const msg = (data && data.error && data.error.message) ? data.error.message : ('OpenRouter Error code ' + res.status);
      throw new Error(msg);
    }

    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content : '';

    if (!text) {
      throw new Error('OpenRouter response empty');
    }

    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function generateAIResponse(env, systemText, messages) {
  if (env.GEMINI_API_KEY) {
    try {
      return await callGemini(env, systemText, messages);
    } catch (geminiError) {}
  }

  if (env.OPENROUTER_API_KEY) {
    try {
      return await callOpenRouter(env, systemText, messages);
    } catch (openRouterError) {
      throw new Error('AI service currently unavailable. ' + openRouterError.message);
    }
  }

  throw new Error('No valid AI API keys configured');
}

async function handleAsk(env, body, userData) {
  const studentName = (userData && userData.full_name) || body.full_name || 'Student';
  const courseName = String(body.course_name || '');
  const topicName = String(body.topic_name || '');
  const topicText = String(body.topic_text || '').slice(0, 4000);
  const question = String(body.question || '').trim();

  if (!question) return json({ success: false, error: 'question is required' }, 400);

  const system = 'You are the official AI Teacher at IDT Academy (Intelligent Digital Technology Academy, www.idtacademy.com.ng). '
    + 'You understand and can reply in every language in the world including Hausa, Yoruba, Igbo, Arabic, French, Spanish and Swahili. '
    + 'The student\'s name is ' + studentName + '. Always call them by name, be warm, encouraging and patient. '
    + 'Detect the language of the student\'s question automatically. If they asked in a language other than English, answer mainly in that language but keep difficult technical words in English, explaining each one in simple local words like a good teacher. '
    + 'If the student requests two languages, answer first in English then repeat the key points in the second language. '
    + 'FORMATTING RULES (VERY IMPORTANT): Do NOT use markdown symbols anywhere. Never use asterisks *, hashes #, backticks, or underscores. Write plain clean text only. Use line breaks and numbered steps for structure. '
    + 'If the language requested is one you cannot write properly, say honestly that it is not available and offer English or another language. '
    + 'Never invent facts. Use only the lesson notes provided. If you do not know, say so honestly and suggest what to do next.';

  const contents = [];

  if (topicName || topicText) {
    contents.push({ role: 'user', parts: [{ text: 'I am reading "' + topicName + '" in "' + courseName + '".\n\nNotes:\n' + (topicText || 'No notes yet.') }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will use these notes to answer.' }] });
  }

  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  for (const h of history) {
    const role = h.role === 'assistant' ? 'model' : 'user';
    const content = String(h.content || '');
    if (content) contents.push({ role: role, parts: [{ text: content }] });
  }

  contents.push({ role: 'user', parts: [{ text: studentName + ' asks: ' + question + '\n\n(Answer warmly in the language of the question, default English. Call them by name, explain step by step, use examples, show diagrams with text when helpful, and encourage them.)' }] });

  const answer = await generateAIResponse(env, system, contents);
  return json({ success: true, answer: answer, message: answer });
}



async function handleExplain(env, body, userData) {
  const studentName = (userData && userData.full_name) || body.full_name || 'Student';
  const dual = body.explain_mode === 'dual';
  const teacherMode = body.explain_mode === 'teacher';
  const withExamples = body.with_examples === true;
  const numExamples = Number(body.example_questions || 2);
  const userLang = String(body.target_lang || body.preferred_lang || 'English').trim() || 'English';
  const courseName = String(body.course_name || '');
  const topicName = String(body.topic_name || '');
  const topicText = String(body.topic_text || '').slice(0, 4000);

  let system = 'You are a warm, patient expert teacher at IDT Academy teaching ' + studentName + '. ';
  system += 'FIRST RULE: Before anything, check if you can write correctly and fluently in the language "' + userLang + '". If you cannot write properly in that language, respond with ONLY this exact marker and nothing else: LANGUAGE_NOT_AVAILABLE ';
  if (teacherMode) {
    system += 'The student pressed "Explain More" on topic "' + topicName + '". Explain the topic DEEPLY like a real classroom teacher, mainly in ' + userLang + ' (keep technical terms in English with simple ' + userLang + ' explanations). ';
    system += 'STRUCTURE (follow exactly): 1) Simple introduction of the topic. 2) Full step-by-step explanation with real-life examples a Nigerian student can relate to. 3) At least two worked examples that make the topic clear. 4) Exactly ' + numExamples + ' practice questions WITH their full answers shown (heading "Practice Questions"). 5) A short encouraging closing message. ';
  } else if (dual) {
    system += 'Otherwise, explain the lesson in TWO parts. Part 1: explain fully in English. Part 2 with the heading "In ' + userLang + '": explain the same key points in ' + userLang + '. ';
  } else {
    system += 'Otherwise, explain the lesson mainly in ' + userLang + '. ';
  }
  system += 'TEACHING RULES: '
    + '1. For every difficult or technical word, write it in English first, then immediately explain its meaning in ' + userLang + ' in simple words. '
    + '2. Explain step by step, slowly, like a real classroom teacher, with simple everyday examples from real life that a student in Nigeria can relate to. '
    + '3. Use simple numbered steps and short paragraphs. '
    + '4. Be encouraging: praise the student, call them by name, and tell them they are doing well. '
    + 'FORMATTING RULES (VERY IMPORTANT): Do NOT use markdown symbols anywhere. Never use asterisks *, hashes #, backticks, or underscores for emphasis. Write plain clean text only. Use line breaks and numbered steps for structure.';

  const text = await generateAIResponse(env, system,
    'Lesson from "' + courseName + '"\nTopic: ' + topicName + '\n\nNotes:\n' + (topicText || 'No notes provided.') + '\n\nExplain this lesson fully to ' + studentName + ' in ' + userLang + ' following all the teaching rules.' + (teacherMode && withExamples ? ' Include the worked examples and the ' + numExamples + ' practice questions with answers as required by the structure.' : '')
  );

  if (text.trim().toUpperCase().indexOf('LANGUAGE_NOT_AVAILABLE') !== -1) {
    return json({
      success: true,
      language_available: false,
      language: userLang,
      message: userLang + ' is not available yet. Our AI teacher cannot write in this language for now. Please try another language.'
    });
  }

  return json({ success: true, explanation: text, language: dual ? ('English + ' + userLang) : userLang, lang_detected: userLang, language_available: true });
}


async function parseJsonArray(text) {
  try {
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {}
  const matches = text.match(/\[[\s\S]*\]/);
  if (matches) {
    try {
      const parsed = JSON.parse(matches[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch (err) {}
  }
  return [];
}


function detectTopicLanguage(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return 'English';
  if (/[\u0600-\u06FF]/.test(String(text || ''))) return 'Arabic';
  const scores = { Hausa: 0, Yoruba: 0, Igbo: 0, French: 0, Spanish: 0 };
  const hausa = [' yana ', ' kuma ', ' wannan ', ' domin ', ' nufin ', ' yara ', ' abin ', ' kana ', ' kamar ', ' sai ', ' zai ', ' mutane ', ' gaskiya ', ' abin '];
  const yoruba = [' nitori ', ' pupo ', ' jare ', ' ejo ', ' ko ni ', ' ti o ', ' fun ', ' won ', ' mo fe '];
  const igbo = [' nke ', ' maka ', ' anyi ', ' biko ', ' oma ', ' gi na '];
  const french = [' le ', ' la ', ' les ', ' une ', ' est ', ' pour ', ' avec ', ' vous ', ' nous '];
  const spanish = [' una ', ' es ', ' para ', ' usted ', ' nosotros ', ' que es '];
  const count = (list) => list.reduce((n, w) => n + (t.split(w).length - 1), 0);
  scores.Hausa = count(hausa);
  scores.Yoruba = count(yoruba);
  scores.Igbo = count(igbo);
  scores.French = count(french);
  scores.Spanish = count(spanish);
  let best = 'English';
  let bestScore = 2;
  Object.keys(scores).forEach((lang) => {
    if (scores[lang] > bestScore) {
      bestScore = scores[lang];
      best = lang;
    }
  });
  return best;
}




async function handleGetAssessment(env, body, userData) {
  const studentName = (userData && userData.full_name) || body.full_name || 'Student';
  const courseName = String(body.course_name || '');
  const topics = Array.isArray(body.topics) ? body.topics : [];
  const counts = Array.isArray(body.question_counts) && body.question_counts.length === topics.length
    ? body.question_counts.map(function(c) { return Math.max(1, Math.min(3, Number(c) || 1)); })
    : topics.map(function() { return 1; });
  const avoid = Array.isArray(body.avoid_questions) ? body.avoid_questions : [];
  const topicLang = detectTopicLanguage(topics.map(function(t) { return t.topic_text || ''; }).join(' '));

  const perTopic = topics.map(function(t, i) {
    return 'Topic ' + (i + 1) + ' (create EXACTLY ' + counts[i] + ' DIFFERENT question' + (counts[i] > 1 ? 's' : '') + ' from THIS topic only):\nName: ' + (t.topic_name || '') + '\nNotes:\n' + String(t.topic_text || '').slice(0, 1500);
  }).join('\n\n');

  const avoidBlock = avoid.length
    ? '\n\nIMPORTANT: Do NOT create any question similar to these existing questions:\n' + avoid.map(function(q, i) { return (i + 1) + '. ' + q; }).join('\n')
    : '';

  const totalQ = counts.reduce(function(a, b) { return a + b; }, 0);

  const system = 'You are an assessment creator at IDT Academy. Create exactly ' + totalQ + ' questions to test if ' + studentName + ' understood the topics below. '
    + 'DISTRIBUTION RULE (MOST IMPORTANT): You MUST create the exact number of questions stated for EACH topic separately, taken ONLY from that topic\'s notes. Do not skip any topic and do not take two questions from the same part of a topic. Every question must be UNIQUE and different from every other question. '
    + 'QUESTION TYPE RULE: Most questions must be multiple-choice with 4 options (A, B, C, D) and one correct answer marked by index (0-based). But EXACTLY ONE question in the whole set must be a written short answer question (set type: "write" and options: []). '
    + 'LANGUAGE RULE: Every question, every option and every expected answer MUST be written ONLY in ' + topicLang + '. Do not mix English into the questions unless a technical term has no ' + topicLang + ' translation, in which case keep that single term in English. '
    + 'Questions should be practical and based ONLY on the notes below. '
    + 'Write all question text, options, explanations and correct answers in plain clean text with no markdown symbols like *, #, or backticks. '
    + 'Return ONLY valid JSON array with no extra text: [{"question": "...", "options": ["A", "B", "C", "D"], "type": "mcq", "correct": 0}, ...] for mcq, or {"question": "...", "options": [], "type": "write", "correct": "model answer text"} for write. Mix the order of the questions randomly.';

  const prompt = 'Course: ' + courseName + '\n\nTopics:\n' + perTopic + avoidBlock + '\n\nCreate exactly ' + totalQ + ' questions written ONLY in ' + topicLang + ' following the distribution rule and the one written-answer rule. Return ONLY valid JSON array.';

  const text = await generateAIResponse(env, system, prompt);
  let questions = parseJsonArray(text);

  const seen = {};
  questions = questions.filter(function(q) {
    const key = String(q.question || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  }).slice(0, totalQ);

  if (!questions.length) {
    questions = [];
    for (let i = 0; i < totalQ; i++) {
      questions.push({ question: 'Explain what you learned about ' + ((topics[0] && topics[0].topic_name) || 'this topic') + '.', options: [], type: 'write', correct: '' });
    }
  }

  const assessmentId = 'as_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  return json({ success: true, questions: questions, assessment_id: assessmentId, topic_language: topicLang });
}


async function handleGradeAssessment(env, body, userData) {
  const studentName = (userData && userData.full_name) || body.full_name || 'Student';
  const courseName = String(body.course_name || '');
  const questions = Array.isArray(body.questions) ? body.questions : [];

  const mcqAuto = [];
  const writeQs = [];
  questions.forEach(function(q, i) {
    const num = Number(q.number || i + 1);
    if ((q.type || 'mcq') === 'mcq' && Array.isArray(q.options) && q.options.length && q.user_answer !== '') {
      const idx = Number(q.user_answer);
      const correctIdx = Number(q.correct);
      if (!isNaN(idx) && !isNaN(correctIdx)) {
        mcqAuto.push({
          number: num,
          question: q.question,
          is_correct: idx === correctIdx,
          user_answer: q.options[idx] != null ? q.options[idx] : String(q.user_answer),
          correct_answer: q.options[correctIdx] != null ? q.options[correctIdx] : '',
          explanation: idx === correctIdx ? 'Correct answer.' : 'The correct option was selected by the system.'
        });
        return;
      }
    }
    writeQs.push({ num: num, q: q });
  });

  let aiResults = [];
  if (writeQs.length) {
    const system = 'You are a fair and encouraging teacher at IDT Academy. Grade ' + studentName + '\'s written answers for the course "' + courseName + '". '
      + 'For each question: if the student\'s answer shows understanding even with spelling mistakes, give full or partial credit. '
      + 'Only mark as wrong if the answer is completely irrelevant or nonsense. Be generous but honest. '
      + 'Write the correct_answer and explanation in the same language the questions and the student\'s answers are written in. '
      + 'Do NOT use markdown symbols like *, #, or backticks anywhere. Plain clean text only. '
      + 'Return ONLY valid JSON array with no extra text: [{"number": 1, "question": "...", "is_correct": true, "user_answer": "...", "correct_answer": "...", "explanation": "..."}]';
    const prompt = 'Grade these ' + writeQs.length + ' written answers for ' + studentName + ':\n\n' +
      writeQs.map(function(w) {
        return 'Q' + w.num + ': ' + w.q.question + '\nType: write\nStudent answer: ' + (w.q.user_answer || '(no answer)');
      }).join('\n\n') + '\n\nReturn ONLY valid JSON array of grading results. Be fair and encouraging.';
    const text = await generateAIResponse(env, system, prompt);
    aiResults = parseJsonArray(text);
  }

  const results = mcqAuto.concat(aiResults.map(function(r) {
    return {
      number: Number(r.number || 0),
      question: String(r.question || ''),
      is_correct: r.is_correct === true,
      user_answer: String(r.user_answer || ''),
      correct_answer: String(r.correct_answer || ''),
      explanation: String(r.explanation || '')
    };
  }));

  results.sort(function(a, b) { return Number(a.number || 0) - Number(b.number || 0); });

  const finalResults = questions.map(function(q, i) {
    const num = Number(q.number || i + 1);
    const found = results.find(function(r) { return Number(r.number) === num; });
    if (found) return found;
    return { number: num, question: q.question, is_correct: Boolean(q.user_answer), user_answer: q.user_answer || '', correct_answer: (q.type === 'write' ? 'See lesson notes' : (q.options && q.options[Number(q.correct)] != null ? q.options[Number(q.correct)] : 'See lesson notes')), explanation: 'Graded automatically.' };
  });

  let score = 0;
  finalResults.forEach(function(r) { if (r.is_correct === true) score++; });
  const pct = Math.round((score / Math.max(1, finalResults.length)) * 100);
  const passed = pct >= 60;

  return json({
    success: true,
    score: score,
    pct: pct,
    passed: passed,
    results: finalResults,
    message: passed
      ? 'Excellent work, ' + studentName + '! You scored ' + score + '/' + finalResults.length + ' (' + pct + '%). You understood the topics well. Keep going!'
      : 'Good effort, ' + studentName + '! You scored ' + score + '/' + finalResults.length + ' (' + pct + '%). Read the topics once more and try again. You can do it!'
  });
}


async function handleCreatePayment(env, body, userData) {
  const amount = Number(body.price || 0);
  if (amount <= 0) return json({ success: false, error: 'Invalid price' }, 400);
  const ref = 'PAY_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase();
  return json({
    success: true,
    account_number: env.PAYMENT_ACCOUNT_NUMBER || '1234567890',
    accountNumber: env.PAYMENT_ACCOUNT_NUMBER || '1234567890',
    account_name: env.PAYMENT_ACCOUNT_NAME || 'IDT Academy Ltd',
    accountName: env.PAYMENT_ACCOUNT_NAME || 'IDT Academy Ltd',
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
  const env = context.env;

  try {
    let body;
    try {
      body = await context.request.json();
    } catch (err) {
      return json({ success: false, error: 'Invalid JSON' }, 400);
    }

    if (!env.GEMINI_API_KEY && !env.OPENROUTER_API_KEY) {
      return json({ success: false, error: 'Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is configured' }, 500);
    }

    const userId = String(body.user_id || body.userId || '').trim();
    let userData = null;
    if (userId) userData = await fetchUserFromSupabase(env, userId);

    const action = String(body.action || 'ask').trim();

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
    return json({
      success: false,
      error: err.message || 'Server error',
      message: 'Sorry, something went wrong. Please try again.'
    }, 500);
  }
};

export const onRequestOptions = async function() {
  return new Response(null, { status: 204, headers: CORS });
};

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

async function callGemini(env, systemText, messages, jsonMode) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, 60000);

  try {
    const contents = typeof messages === 'string'
      ? [{ role: 'user', parts: [{ text: messages }] }]
      : messages;

    const generationConfig = {
      temperature: jsonMode ? 0.35 : 0.7,
      topP: 0.9,
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingBudget: 0 }
    };
    if (jsonMode) generationConfig.responseMimeType = 'application/json';

    const payload = {
      systemInstruction: { parts: [{ text: systemText }] },
      contents: contents,
      generationConfig: generationConfig,
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

    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
      ? data.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('')
      : '';

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

async function callOpenRouter(env, systemText, messages, jsonMode) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, 60000);

  try {
    const openRouterMessages = [
      { role: 'system', content: systemText }
    ];

    if (typeof messages === 'string') {
      openRouterMessages.push({ role: 'user', content: messages });
    } else if (Array.isArray(messages)) {
     for (const msg of messages) {
        const role = msg.role === 'model' ? 'assistant' : 'user';
        if (msg.parts && Array.isArray(msg.parts)) {
          const contentArr = [];
          for (const p of msg.parts) {
            if (p.text) contentArr.push({ type: 'text', text: p.text });
            if (p.inline_data && p.inline_data.data) {
              contentArr.push({ type: 'image_url', image_url: { url: 'data:' + (p.inline_data.mime_type || 'image/jpeg') + ';base64,' + p.inline_data.data } });
            }
          }
          openRouterMessages.push({ role: role, content: contentArr });
        } else {
          const contentText = String(msg.content || '');
          if (contentText) openRouterMessages.push({ role: role, content: contentText });
        }
      }

    const payload = {
      model: FALLBACK_OPENROUTER_MODEL,
      messages: openRouterMessages,
      temperature: jsonMode ? 0.35 : 0.7,
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

async function generateAIResponse(env, systemText, messages, jsonMode) {
  if (env.GEMINI_API_KEY) {
    try {
      return await callGemini(env, systemText, messages, jsonMode);
    } catch (geminiError) {}
  }

  if (env.OPENROUTER_API_KEY) {
    try {
      return await callOpenRouter(env, systemText, messages, jsonMode);
    } catch (openRouterError) {
      throw new Error('AI service currently unavailable. ' + openRouterError.message);
    }
  }

  throw new Error('No valid AI API keys configured');
}




function buildImageParts(images) {
  const parts = [];
  const list = Array.isArray(images) ? images.slice(0, 3) : [];
  for (const img of list) {
    const s = String(img || '');
    let mime = 'image/jpeg';
    let b64 = s;
    const m = s.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (m) {
      mime = m[1];
      b64 = m[2];
    }
    if (b64 && b64.length > 100) {
      parts.push({ inline_data: { mime_type: mime, data: b64 } });
    }
  }
  return parts;
}

async function handleAsk(env, body, userData) {
  const studentName = (userData && userData.full_name) || body.full_name || 'Student';
  const courseName = String(body.course_name || '');
  const topicName = String(body.topic_name || '');
  const topicText = String(body.topic_text || '').slice(0, 4000);
  const question = String(body.question || '').trim();
  const imageParts = buildImageParts(body.images);

  if (!question && imageParts.length === 0) return json({ success: false, error: 'question is required' }, 400);

  const system = 'You are the official AI Teacher at IDT Academy (Intelligent Digital Technology Academy, www.idtacademy.com.ng). '
    + 'You understand and can reply in every language in the world including Hausa, Yoruba, Igbo, Arabic, French, Spanish and Swahili. '
    + 'The student\'s name is ' + studentName + '. Always call them by name, be warm, encouraging and patient. '
    + 'Detect the language of the student\'s question automatically. If they asked in a language other than English, answer mainly in that language but keep difficult technical words in English, explaining each one in simple local words like a good teacher. '
    + 'If the student requests two languages, answer first in English then repeat the key points in the second language. '
    + 'IMAGE RULE (VERY IMPORTANT): The student may send screenshots or photos of their screen, code, error messages, books, exercises or anything they are learning. If images are attached, look at them carefully and explain exactly what you see: read the code or error, point out what is wrong or what is happening, and teach them how to fix it or understand it, step by step. If the images relate to the lesson topic, connect your explanation to that topic. Always acknowledge the image first, for example "Na ganin hoton da ka tura" or "I can see your screenshot". '
    + 'FORMATTING RULES (VERY IMPORTANT): Do NOT use markdown symbols anywhere. Never use asterisks *, hashes #, backticks, or underscores. Write plain clean text only. Use line breaks and numbered steps for structure. '
    + 'If the language requested is one you cannot write properly, say honestly that it is not available and offer English or another language. '
    + 'Never invent facts. Use only the lesson notes provided and the images. If you do not know, say so honestly and suggest what to do next.';

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

  const finalParts = [];
  if (imageParts.length) {
    finalParts.push(...imageParts);
  }
  finalParts.push({ text: (question ? studentName + ' asks: ' + question : studentName + ' sent image(s) without text.') + '\n\n(Answer warmly in the language of the question, default English. Call them by name, explain step by step, use examples, and if images were attached describe and explain them clearly.)' });
  contents.push({ role: 'user', parts: finalParts });

  const answer = await generateAIResponse(env, system, contents, false);
  return json({ success: true, answer: answer, message: answer });
}



async function handleExplain(env, body, userData) {
  const studentName = (userData && userData.full_name) || body.full_name || 'Student';
  const dual = body.explain_mode === 'dual';
  const userLang = String(body.target_lang || body.preferred_lang || 'English').trim() || 'English';
  const courseName = String(body.course_name || '');
  const topicName = String(body.topic_name || '');
  const topicText = String(body.topic_text || '').slice(0, 5000);

  let system = 'You are a warm, patient expert teacher at IDT Academy teaching ' + studentName + '. ';
  system += 'FIRST RULE: Before anything, check if you can write correctly and fluently in the language "' + userLang + '". If you cannot write properly in that language, respond with ONLY this exact marker and nothing else: LANGUAGE_NOT_AVAILABLE ';
  if (dual) {
    system += 'Otherwise, explain the lesson in TWO parts. Part 1: explain fully in English. Part 2 with the heading "In ' + userLang + '": explain the same key points in ' + userLang + '. ';
  } else {
    system += 'Otherwise, explain the lesson mainly in ' + userLang + '. ';
  }
  system += 'TEACHING RULES: '
    + '1. For every difficult or technical word, write it in English first, then immediately explain its meaning in ' + userLang + ' in simple words, like this style: "Boys yana nufin yara maza da yawa". '
    + '2. Explain step by step, slowly, like a real classroom teacher, with simple everyday examples from real life that a student in Nigeria can relate to. '
    + '3. Use simple numbered steps and short paragraphs. '
    + '4. If the topic has something visible or drawable, add one short line at the end titled "Image to look at:" describing a simple picture or diagram the student should imagine or search online. '
    + '5. At the very end, ask exactly TWO short questions in ' + userLang + ' (or in English if dual) to check if the student understood, and tell them to answer with the Ask Question button. '
    + '6. Be encouraging: praise the student, call them by name, and tell them they are doing well. '
    + 'FORMATTING RULES (VERY IMPORTANT): Do NOT use markdown symbols anywhere. Never use asterisks *, hashes #, backticks, or underscores for emphasis. Write plain clean text only. Use line breaks and numbered steps for structure.';

  const text = await generateAIResponse(env, system,
    'Lesson from "' + courseName + '"\nTopic: ' + topicName + '\n\nNotes:\n' + (topicText || 'No notes provided.') + '\n\nExplain this lesson fully to ' + studentName + ' in ' + userLang + ' following all the teaching rules. Make it clear, enjoyable and easy to understand.'
  , false);

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
  const raw = String(text || '');
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const tryParse = function (s) {
    try {
      return JSON.parse(s);
    } catch (err) {
      return null;
    }
  };
  let parsed = tryParse(cleaned);
  if (!parsed) {
    const m = raw.match(/\[[\s\S]*\]/);
    if (m) parsed = tryParse(m[0]);
  }
  if (!parsed) {
    const o = raw.match(/\{[\s\S]*\}/);
    if (o) parsed = tryParse(o[0]);
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const keys = ['questions', 'results', 'data', 'items', 'assessment'];
    for (const k of keys) {
      if (Array.isArray(parsed[k])) return parsed[k];
    }
  }
  return [];
}

function detectTopicLanguage(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return 'English';
  if (/[\u0600-\u06FF]/.test(String(text || ''))) return 'Arabic';
  const scores = { Hausa: 0, Yoruba: 0, Igbo: 0, French: 0, Spanish: 0 };
  const hausa = [' yana ', ' kuma ', ' wannan ', ' domin ', ' nufin ', ' yara ', ' abin ', ' kana ', ' kamar ', ' sai ', ' zai ', ' mutane ', ' gaskiya '];
  const yoruba = [' nitori ', ' pupo ', ' jare ', ' ejo ', ' ko ni ', ' ti o ', ' fun ', ' won ', ' mo fe '];
  const igbo = [' nke ', ' maka ', ' anyi ', ' biko ', ' oma ', ' gi na '];
  const french = [' le ', ' la ', ' les ', ' une ', ' est ', ' pour ', ' avec ', ' vous ', ' nous '];
  const spanish = [' una ', ' es ', ' para ', ' usted ', ' nosotros ', ' que es '];
  const count = function (list) { return list.reduce(function (n, w) { return n + (t.split(w).length - 1); }, 0); };
  scores.Hausa = count(hausa);
  scores.Yoruba = count(yoruba);
  scores.Igbo = count(igbo);
  scores.French = count(french);
  scores.Spanish = count(spanish);
  let best = 'English';
  let bestScore = 2;
  Object.keys(scores).forEach(function (lang) {
    if (scores[lang] > bestScore) {
      bestScore = scores[lang];
      best = lang;
    }
  });
  return best;
}

function buildQuestionDistribution(n) {
  if (n <= 0) return [];
  if (n === 1) return [5];
  if (n === 2) return [3, 2];
  if (n === 3) return [2, 2, 1];
  const base = Math.floor(5 / n);
  const dist = new Array(n).fill(base);
  let rem = 5 - base * n;
  for (let i = 0; i < rem; i++) dist[i]++;
  return dist;
}

function normalizeAssessmentQuestions(list, topics) {
  const out = [];
  const seen = {};
  const src = Array.isArray(list) ? list : [];

  for (let i = 0; i < src.length; i++) {
    const item = src[i];
    if (!item || typeof item !== 'object') continue;
    const qText = String(item.question || item.q || '').replace(/\s+/g, ' ').trim();
    if (!qText) continue;
    const key = qText.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;

    let options = Array.isArray(item.options) ? item.options.map(function (o) { return String(o == null ? '' : o).trim(); }).filter(function (o) { return o !== ''; }) : [];
    let type = String(item.type || '').toLowerCase();
    if (type !== 'mcq' && type !== 'write') type = options.length >= 2 ? 'mcq' : 'write';
    if (type === 'mcq' && options.length < 2) type = 'write';
    if (type === 'write') options = [];

    let correct = '';
    if (type === 'mcq') {
      let ci = Number(item.correct);
      if (!isFinite(ci) || ci < 0 || ci >= options.length) {
        const letter = String(item.correct || '').trim().toUpperCase();
        const idx = ['A', 'B', 'C', 'D', 'E'].indexOf(letter);
        ci = idx >= 0 && idx < options.length ? idx : 0;
      }
      correct = ci;
    }

    out.push({
      topic: 0,
      topic_name: String(item.topic_name || item.topicName || ''),
      question: qText,
      options: options,
      type: type,
      correct: correct,
      explanation: String(item.explanation || ''),
      correct_answer: String(item.correct_answer || '')
    });

    if (out.length >= 5) break;
  }

  while (out.length < 5) {
    const tObj = topics[Math.min(out.length, topics.length - 1)] || {};
    const name = String(tObj.topic_name || '');
    out.push({
      topic: 0,
      topic_name: name,
      question: 'Explain in your own words the main idea of ' + (name ? '"' + name + '"' : 'this topic') + '.',
      options: [],
      type: 'write',
      correct: '',
      explanation: '',
      correct_answer: ''
    });
  }

  let writeIdx = -1;
  for (let i = 0; i < out.length; i++) {
    if (out[i].type === 'write') { writeIdx = i; break; }
  }
  if (writeIdx === -1) {
    const last = out[out.length - 1];
    last.type = 'write';
    last.options = [];
    last.correct = '';
  } else if (writeIdx !== out.length - 1) {
    const w = out.splice(writeIdx, 1)[0];
    out.push(w);
  }

  for (let i = 0; i < out.length; i++) {
    if (out[i].type === 'mcq') {
      if (out[i].options.length < 2) {
        out[i].type = 'write';
        out[i].options = [];
        out[i].correct = '';
      } else if (!out[i].correct_answer && out[i].options[out[i].correct] != null) {
        out[i].correct_answer = String(out[i].options[out[i].correct]);
      }
    }
  }

  const dist = buildQuestionDistribution(topics.length || 3);
  const flat = [];
  dist.forEach(function (n, t) {
    for (let k = 0; k < n; k++) flat.push(t + 1);
  });
  for (let i = 0; i < out.length; i++) {
    const t = flat[Math.min(i, flat.length - 1)] || 1;
    out[i].topic = t;
    const tObj = topics[t - 1];
    if (tObj && tObj.topic_name) out[i].topic_name = String(tObj.topic_name);
  }

  return out;
}

async function handleGetAssessment(env, body, userData) {
  const studentName = (userData && userData.full_name) || body.full_name || 'Student';
  const courseName = String(body.course_name || '');
  const topics = Array.isArray(body.topics) ? body.topics.slice(0, 3) : [];

  if (!topics.length) {
    return json({ success: false, error: 'No topics provided for assessment' }, 400);
  }

  const dist = buildQuestionDistribution(topics.length);
  const topicLang = detectTopicLanguage(topics.map(function (t) { return String(t.topic_text || ''); }).join(' '));

  const distributionText = topics.map(function (t, i) {
    return 'Topic ' + (i + 1) + ' ("' + String(t.topic_name || '') + '") => ' + dist[i] + ' question(s)';
  }).join('\n');

  const system = 'You are the official assessment creator at IDT Academy. '
    + 'Create exactly 5 questions to test whether ' + studentName + ' understood the lesson topics below. '
    + 'QUESTION DISTRIBUTION (MOST IMPORTANT): follow it exactly:\n' + distributionText + '\n'
    + 'Question 1, 2, 3 and 4 MUST be multiple-choice questions (type "mcq") with exactly 4 options each and exactly one correct option given by its 0-based index in the "correct" field. '
    + 'Question 5 MUST be a short written-answer question (type "write") with options [] and correct "". '
    + 'Every question MUST be different. Never repeat or rephrase the same question. '
    + 'Each question MUST be answerable only from the notes of the topic it belongs to. '
    + 'LANGUAGE RULE: write every question, every option, every explanation and every correct_answer only in ' + topicLang + ', except a technical word that has no ' + topicLang + ' translation (keep only that single word in English). '
    + 'Do NOT use markdown symbols such as *, #, backticks or underscores. Plain clean text only. '
    + 'For every question also give a short "explanation" and the "correct_answer" text. '
    + 'Return ONLY a valid JSON array and nothing else, with this exact shape: '
    + '[{"topic": 1, "topic_name": "...", "question": "...", "options": ["...","...","...","..."], "type": "mcq", "correct": 0, "explanation": "...", "correct_answer": "..."}]';

  const prompt = 'Course: ' + courseName + '\n\n'
    + topics.map(function (t, i) {
        return 'Topic ' + (i + 1) + ': ' + String(t.topic_name || '') + '\n' + String(t.topic_text || '').slice(0, 2500);
      }).join('\n\n')
    + '\n\nCreate exactly 5 questions in ' + topicLang + ' following the required distribution (Q1-Q4 mcq, Q5 write). Return only the JSON array.';

  let raw = '';
  try {
    raw = await generateAIResponse(env, system, prompt, true);
  } catch (err) {
    return json({ success: false, error: err.message || 'AI failed to create questions' }, 500);
  }

  const parsed = parseJsonArray(raw);
  const questions = normalizeAssessmentQuestions(parsed, topics);

  const assessmentId = 'as_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  return json({ success: true, questions: questions, assessment_id: assessmentId, topic_language: topicLang, total: questions.length });
}

async function handleGradeAssessment(env, body, userData) {
  const studentName = (userData && userData.full_name) || body.full_name || 'Student';
  const courseName = String(body.course_name || '');
  const questions = Array.isArray(body.questions) ? body.questions : [];

  if (!questions.length) {
    return json({ success: false, error: 'No questions to grade' }, 400);
  }

  const hasCorrectIndex = function (q) {
    return q && q.correct !== undefined && q.correct !== null && q.correct !== '' && Array.isArray(q.options) && q.options.length > 0;
  };

  const isMcq = function (q) {
    const type = String(q.type || '').toLowerCase();
    if (type === 'mcq') return true;
    if (type === 'write') return false;
    return Array.isArray(q.options) && q.options.length > 0;
  };

  const needsAI = questions.some(function (q) {
    return !(isMcq(q) && hasCorrectIndex(q));
  });

  const system = 'You are a fair and encouraging teacher at IDT Academy. Grade ' + studentName + '\'s answers for the course "' + courseName + '". '
    + 'For each question: if the student\'s answer shows understanding even with spelling mistakes, give full credit. '
    + 'Only mark as wrong if the answer is completely irrelevant or nonsense. Be generous but honest. '
    + 'Write the correct_answer and explanation in the same language the questions and the student\'s answers are written in. '
    + 'Do NOT use markdown symbols like *, #, or backticks anywhere. Plain clean text only. '
    + 'Return ONLY a valid JSON array with no extra text: [{"number": 1, "question": "...", "is_correct": true, "user_answer": "...", "correct_answer": "...", "explanation": "..."}]';

  const prompt = 'Grade these ' + questions.length + ' answers for ' + studentName + ':\n\n'
    + questions.map(function (q, i) {
        let line = 'Q' + (i + 1) + ': ' + String(q.question || '')
          + '\nOptions: ' + JSON.stringify(q.options || [])
          + '\nType: ' + String(q.type || (isMcq(q) ? 'mcq' : 'write'))
          + '\nStudent answer: ' + String(q.user_answer || '(no answer)');
        if (hasCorrectIndex(q)) line += '\nCorrect option index (confirmed, do not change): ' + Number(q.correct);
        return line;
      }).join('\n\n')
    + '\n\nReturn ONLY a valid JSON array of grading results, one item for every question above, in the same order. Be fair and encouraging.';

  let aiResults = [];
  if (needsAI) {
    try {
      const text = await generateAIResponse(env, system, prompt, true);
      aiResults = parseJsonArray(text);
    } catch (err) {
      aiResults = [];
    }
  }

  if (needsAI && aiResults.length === 0) {
    return json({ success: false, error: 'Grading service is temporarily unavailable. Please submit again.' }, 503);
  }

  const results = questions.map(function (q, i) {
    const ai = (aiResults[i] && typeof aiResults[i] === 'object') ? aiResults[i] : {};
    const userAnswer = String(q.user_answer == null ? '' : q.user_answer);
    let isCorrect = false;
    let correctAnswer = ai.correct_answer != null ? String(ai.correct_answer) : '';
    let explanation = ai.explanation != null ? String(ai.explanation) : '';

    if (isMcq(q) && hasCorrectIndex(q)) {
      const correctIdx = Number(q.correct);
      const userIdx = Number(userAnswer);
      isCorrect = isFinite(userIdx) && isFinite(correctIdx) && userIdx === correctIdx;
      if (!correctAnswer && isFinite(correctIdx) && q.options[correctIdx] != null) {
        correctAnswer = String(q.options[correctIdx]);
      }
      if (!explanation) explanation = 'The correct answer is ' + correctAnswer + '.';
    } else {
      isCorrect = (ai.is_correct === true || String(ai.is_correct).toLowerCase() === 'true') && userAnswer.trim() !== '';
      if (!correctAnswer) correctAnswer = 'See the lesson notes.';
      if (!explanation) explanation = 'Compare your answer with the lesson notes.';
    }

    return {
      number: i + 1,
      question: String(q.question || ''),
      is_correct: isCorrect,
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      explanation: explanation
    };
  });

  let score = 0;
  results.forEach(function (r) { if (r.is_correct === true) score++; });
  const total = results.length;
  const pct = Math.round((score / Math.max(1, total)) * 100);
  const passed = pct >= 60;

  return json({
    success: true,
    score: score,
    pct: pct,
    passed: passed,
    total: total,
    results: results,
    message: passed
      ? 'Excellent work, ' + studentName + '! You scored ' + score + '/' + total + ' (' + pct + '%). You understood the topics well. Keep going!'
      : 'Good effort, ' + studentName + '! You scored ' + score + '/' + total + ' (' + pct + '%). Read the topics once more and try again later. You can do it!'
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
  await new Promise(function (resolve) { setTimeout(resolve, 2000); });
  return json({ success: true, status: 'pending', paid: false, message: 'Payment verification pending. Please check the dashboard after making your transfer.' });
}

export const onRequestPost = async function (context) {
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

export const onRequestOptions = async function () {
  return new Response(null, { status: 204, headers: CORS });
};

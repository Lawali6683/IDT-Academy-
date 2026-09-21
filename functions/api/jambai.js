const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
  });
}

function sbUrl(env) {
  const base = env.SUPABASE_URL || 'https://orhgklhfltsfdumrrhup.supabase.co';
  return base.endsWith('/') ? base + 'rest/v1/' : base + '/rest/v1/';
}

function sbHeaders(env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

async function fetchUserProfile(env, userId) {
  if (!userId) return null;

  const base = sbUrl(env);
  const headers = sbHeaders(env);

  try {
    const url = base + 'user_profiles?id=eq.' + encodeURIComponent(userId) + '&select=user_data';
    const r = await fetch(url, { headers });
    const rows = await r.json();
    if (Array.isArray(rows) && rows[0] && rows[0].user_data) {
      return rows[0].user_data;
    }
  } catch (err) {}

  try {
    const jambUrl = base + 'jambdata?id=eq.' + encodeURIComponent(userId) + '&select=jamb_data';
    const r2 = await fetch(jambUrl, { headers });
    const rows2 = await r2.json();
    if (Array.isArray(rows2) && rows2[0] && rows2[0].jamb_data) {
      return rows2[0].jamb_data;
    }
  } catch (err) {}

  return null;
}

async function askGeminiDirect(apiKey, prompt, systemInstruction) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

  const contents = [];
  if (systemInstruction) {
    contents.push({ role: 'user', parts: [{ text: systemInstruction }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions exactly.' }] });
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const body = {
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 32768,
      thinkingConfig: { thinkingBudget: 0 }
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error('Gemini API Error (' + res.status + '): ' + (data.error && data.error.message ? data.error.message : JSON.stringify(data)));
  }

  return data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] ? data.candidates[0].content.parts[0].text : '';
}

async function askOpenRouter(apiKey, prompt, systemInstruction, siteUrl = 'https://idtacademy.com.ng', siteTitle = 'IDT Academy') {
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const body = {
    model: 'openai/gpt-4o-mini',
    messages: messages,
    temperature: 0.7,
    max_tokens: 16384
  };

  const headers = {
    'Authorization': 'Bearer ' + apiKey,
    'HTTP-Referer': siteUrl,
    'X-Title': siteTitle,
    'Content-Type': 'application/json'
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error('OpenRouter API Error (' + res.status + '): ' + (data.error && data.error.message ? data.error.message : JSON.stringify(data)));
  }

  return data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
}

async function askAI(env, prompt, systemInstruction) {
  const geminiKey = env.GEMINI_API_KEY;
  const openRouterKey = env.OPENROUTER_API_KEY;

  if (geminiKey) {
    try {
      const response = await askGeminiDirect(geminiKey, prompt, systemInstruction);
      if (response && response.trim().length > 0) {
        return response;
      }
    } catch (geminiError) {}
  }

  if (openRouterKey) {
    try {
      const siteUrl = env.SITE_URL || 'https://idtacademy.com.ng';
      const siteTitle = env.SITE_TITLE || 'IDT Academy';
      return await askOpenRouter(openRouterKey, prompt, systemInstruction, siteUrl, siteTitle);
    } catch (openRouterError) {
      throw new Error('All AI services failed. OpenRouter error: ' + openRouterError.message);
    }
  }

  throw new Error('No valid AI API keys (GEMINI_API_KEY / OPENROUTER_API_KEY) are configured in environment variables.');
}

function parseCleanJSON(rawText) {
  if (!rawText) throw new Error('Empty AI response');
  try {
    return JSON.parse(rawText);
  } catch (e) {
    const start = rawText.indexOf('[') !== -1 ? rawText.indexOf('[') : rawText.indexOf('{');
    const endArr = rawText.lastIndexOf(']');
    const endObj = rawText.lastIndexOf('}');
    const end = endArr > endObj ? endArr : endObj;
    if (start === -1 || end === -1 || end <= start) {
      const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      return JSON.parse(cleaned);
    }
    return JSON.parse(rawText.substring(start, end + 1));
  }
}

const subjectsMap = {
  'eng_tech': ['Use of English', 'Mathematics', 'Physics', 'Chemistry'],
  'medicine': ['Use of English', 'Biology', 'Chemistry', 'Physics'],
  'cs_science': ['Use of English', 'Mathematics', 'Physics', 'Chemistry'],
  'cs_mgmt': ['Use of English', 'Mathematics', 'Physics', 'Economics'],
  'agric': ['Use of English', 'Chemistry', 'Biology', 'Physics'],
  'architecture': ['Use of English', 'Mathematics', 'Physics', 'Chemistry'],
  'bio_sciences': ['Use of English', 'Biology', 'Chemistry', 'Physics'],
  'physical_sci': ['Use of English', 'Mathematics', 'Physics', 'Chemistry'],
  'math_stats': ['Use of English', 'Mathematics', 'Physics', 'Chemistry'],
  'food_sci': ['Use of English', 'Chemistry', 'Mathematics', 'Biology'],
  'law': ['Use of English', 'Literature in English', 'Government', 'CRK'],
  'mass_comm': ['Use of English', 'Literature in English', 'Government', 'Economics'],
  'pol_sci': ['Use of English', 'Government', 'Economics', 'Literature in English'],
  'sociology': ['Use of English', 'Government', 'Economics', 'Literature in English'],
  'economics': ['Use of English', 'Mathematics', 'Economics', 'Government'],
  'english_lang': ['Use of English', 'Literature in English', 'Government', 'Linguistics'],
  'history': ['Use of English', 'History', 'Literature in English', 'Government'],
  'theatre': ['Use of English', 'Literature in English', 'Government', 'Fine Arts'],
  'languages': ['Use of English', 'Nigerian Language', 'Literature in English', 'Government'],
  'religious': ['Use of English', 'IRK', 'Government', 'Literature in English'],
  'accounting': ['Use of English', 'Mathematics', 'Economics', 'Commerce'],
  'business_admin': ['Use of English', 'Mathematics', 'Economics', 'Commerce'],
  'marketing': ['Use of English', 'Mathematics', 'Economics', 'Commerce'],
  'hr': ['Use of English', 'Mathematics', 'Economics', 'Government'],
  'insurance': ['Use of English', 'Mathematics', 'Economics', 'Commerce'],
  'estate': ['Use of English', 'Mathematics', 'Economics', 'Geography'],
  'geography': ['Use of English', 'Geography', 'Mathematics', 'Economics'],
  'edu_science': ['Use of English', 'Biology', 'Mathematics', 'Chemistry'],
  'edu_math': ['Use of English', 'Mathematics', 'Physics', 'Chemistry'],
  'edu_english': ['Use of English', 'Literature in English', 'Government', 'Linguistics'],
  'edu_econs': ['Use of English', 'Mathematics', 'Economics', 'Government'],
  'primary_edu': ['Use of English', 'Government', 'Economics', 'Biology'],
  'mls': ['Use of English', 'Biology', 'Chemistry', 'Physics'],
  'physio': ['Use of English', 'Biology', 'Chemistry', 'Physics'],
  'public_health': ['Use of English', 'Biology', 'Chemistry', 'Physics'],
  'veterinary': ['Use of English', 'Biology', 'Chemistry', 'Physics'],
  'telecom': ['Use of English', 'Mathematics', 'Physics', 'Chemistry'],
  'library': ['Use of English', 'Government', 'Literature in English', 'Economics']
};

function resolveExamSubjects(body, dbProfile) {
  const courseId = String(body.jambCourseId || (dbProfile && dbProfile.jambCourseId) || '').trim();
  if (courseId && subjectsMap[courseId]) {
    return subjectsMap[courseId];
  }

  const provided = body.jambCourseSubjects || (dbProfile && dbProfile.jambCourseSubjects);
  if (Array.isArray(provided) && provided.length >= 2) {
    const cleaned = provided.map(function(s) { return String(s).trim(); }).filter(function(s) { return s && s.length > 0; });
    if (cleaned.length >= 2) {
      const englishIndex = cleaned.findIndex(function(s) { return s.toLowerCase().indexOf('english') !== -1; });
      const english = englishIndex !== -1 ? cleaned.splice(englishIndex, 1)[0] : 'Use of English';
      const others = cleaned.slice(0, 3);
      while (others.length < 3) others.push('Physics');
      return [english].concat(others);
    }
  }

  return ['Use of English', 'Mathematics', 'Physics', 'Chemistry'];
}

function buildSubjectPrompt(subject, count, fullName, courseName) {
  return `You are a JAMB UTME question generator for IDT Academy. Generate exactly ${count} multiple-choice questions for the subject "${subject}" for a JAMB UTME mock exam for a student named ${fullName} studying ${courseName}.

STRICT RULES:
- Questions must match the real JAMB UTME standard: past-question style, syllabus-based, exam-standard difficulty.
- Each question has exactly 4 options (A, B, C, D) and exactly one correct answer.
- "correct" is the zero-based index of the correct answer (0 = A, 1 = B, 2 = C, 3 = D).
- Questions must be clear, unambiguous, and educationally accurate.
- Cover different areas of the ${subject} JAMB syllabus. No duplicates.

OUTPUT FORMAT: Return ONLY a valid JSON array. No markdown, no explanations, no code blocks. Each object must have exactly these fields: "subject" (string), "text" (string), "options" (array of exactly 4 strings), "correct" (integer 0-3).

Example:
[{"subject":"${subject}","text":"Choose the option that best completes the sentence: The committee ___ agreed on the proposal.","options":["has","have","is having","are having"],"correct":0}]

Generate exactly ${count} questions now.`;
}





async function generateExam(env, subjects, fullName, courseName) {
  const allQuestions = [];
  const counts = subjects.map(function(s, i) { return i === 0 ? 60 : 40; });

  for (let i = 0; i < subjects.length; i++) {
    const subject = subjects[i];
    const target = counts[i];
    const subjectQuestions = [];

    let attempts = 0;
    while (subjectQuestions.length < target && attempts < 6) {
      const remaining = target - subjectQuestions.length;
      const batchSize = attempts === 0 ? target : remaining;
      const skipText = subjectQuestions.length > 0
        ? '\n\nIMPORTANT: The following questions already exist. Generate DIFFERENT new questions, do NOT repeat any of these:\n' + subjectQuestions.slice(0, 10).map(function(q) { return '- ' + String(q.text).substring(0, 90); }).join('\n')
        : '';

      try {
        const prompt = buildSubjectPrompt(subject, batchSize, fullName, courseName) + skipText;
        const systemInstruction = 'You are a JAMB UTME exam generator. Generate accurate, exam-standard questions in the exact JSON format requested. Return ONLY a valid JSON array, nothing else.';
        const aiResponseText = await askAI(env, prompt, systemInstruction);
        const parsed = parseCleanJSON(aiResponseText);

        if (Array.isArray(parsed)) {
          const existingTexts = subjectQuestions.map(function(q) { return String(q.text).trim().toLowerCase(); });
          parsed.forEach(function(q) {
            if (subjectQuestions.length >= target) return;
            if (!q || typeof q.text !== 'string' || q.text.trim().length === 0) return;
            if (!Array.isArray(q.options)) return;
            const correct = Number(q.correct);
            if (isNaN(correct) || correct < 0 || correct > 3) return;
            while (q.options.length < 4) q.options.push('None of the above');
            if (q.options.length > 4) q.options = q.options.slice(0, 4);
            const key = String(q.text).trim().toLowerCase();
            if (existingTexts.indexOf(key) !== -1) return;
            existingTexts.push(key);
            subjectQuestions.push(q);
          });
        }
      } catch (err) {}

      attempts++;
    }

    if (subjectQuestions.length < target) {
      throw new Error('Could not generate enough questions for ' + subject + ' (got ' + subjectQuestions.length + ' of ' + target + '). Please try again.');
    }

    subjectQuestions.forEach(function(q, qi) {
      q.id = 'q' + (i + 1) + '_' + (qi + 1);
      q.number = qi + 1;
      q.subject = subject;
      q.correct = Number(q.correct);
    });

    allQuestions.push.apply(allQuestions, subjectQuestions);
  }

  return allQuestions;
}



function markExamServer(questions, answers) {
  let correct = 0;
  const details = [];

  questions.forEach(function(q, i) {
    const rawAns = answers[i];
    const userAns = (rawAns === null || rawAns === undefined || rawAns === '') ? null : Number(rawAns);
    const qCorrect = Number(q.correct);
    const isCorrect = userAns !== null && userAns === Number(q.correct);
    if (isCorrect) correct++;
    details.push({
      number: i + 1,
      subject: q.subject,
      question: q.text,
      options: q.options,
      correct: Number(q.correct),
      user_answer: userAns,
      is_correct: isCorrect
    });
  });

  const total = questions.length;
  const score = Math.round(correct * (400 / total));
  const passed = score >= 200;

  const map = {};
  details.forEach(function(d) {
    if (!map[d.subject]) map[d.subject] = { correct: 0, total: 0 };
    map[d.subject].total++;
    if (d.is_correct) map[d.subject].correct++;
  });
  const subjects = Object.keys(map).map(function(s) {
    return { subject: s, correct: map[s].correct, total: map[s].total };
  });

  return {
    success: true,
    score: score,
    total: total,
    correct: correct,
    passed: passed,
    subjects: subjects,
    details: details
  };
}

function buildChatLanguageInstruction(language) {
  const lang = String(language || 'english').trim();
  const lower = lang.toLowerCase();

  if (lower === 'english' || lower === 'en') {
    return 'LANGUAGE RULE: Respond ONLY in clear English. Keep explanations simple and easy to understand.';
  }

  if (lower.indexOf('english+') === 0) {
    const other = lang.substring(8).trim();
    return 'LANGUAGE RULE: The student chose bilingual mode. First give the explanation in clear English, then repeat the key points in ' + other + ' so the student fully understands.';
  }

  return 'LANGUAGE RULE: Respond ONLY in ' + lang + '. You are capable of communicating in every world language — never claim you cannot speak a language, never refuse, and never apologize about language support. If the student writes in a language different from English, always reply in the language the student used.';
}

function buildChatPrompt(messages, language) {
  const systemMsg = messages.find(function(m) { return m.role === 'system'; });
  const systemInstr = systemMsg ? systemMsg.content : 'You are a helpful JAMB tutor AI for IDT Academy.';

  let conversationHistory = '';
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === 'system') continue;
    conversationHistory += (m.role === 'user' ? 'Student: ' : 'Tutor: ') + m.content + '\n';
  }

  return `${systemInstr}

${buildChatLanguageInstruction(language)}

CONVERSATION HISTORY:
${conversationHistory}

Tutor: Provide a helpful, educational response. Be encouraging, clear, and thorough. Use JAMB exam context. If the student asks about a specific topic, explain it with examples. If they ask about a question they got wrong, explain why the correct answer is right and help them understand the concept.`;
}

export const onRequestPost = async (context) => {
  const env = context.env;

  try {
    let body;
    try {
      body = await context.request.json();
    } catch (err) {
      return json({ success: false, error: 'Invalid JSON body in request' }, 400);
    }

    const action = String(body.action || '').trim();
    if (!action) {
      return json({ success: false, error: 'action is required (generate_exam, mark_exam, or chat)' }, 400);
    }

    const userId = String(body.user_id || body.id || '').trim();
    let dbProfile = null;

    if (userId) {
      dbProfile = await fetchUserProfile(env, userId);
    }

    if (action === 'generate_exam') {
      const fullName = String(body.full_name || (dbProfile && dbProfile.full_name) || 'Student');
      const courseName = String(body.jambCourseName || body.course_name || (dbProfile && dbProfile.jambCourseName) || 'JAMB Preparation');
      const subjects = resolveExamSubjects(body, dbProfile);

      try {
        const questions = await generateExam(env, subjects, fullName, courseName);

        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error('Generated questions format is invalid or empty');
        }

        return json({ success: true, questions: questions });
      } catch (err) {
        return json({ success: false, error: 'Exam generation failed: ' + err.message }, 500);
      }
    }

    if (action === 'mark_exam') {
      const questions = body.questions;
      const answers = body.answers;

      if (!questions || !Array.isArray(questions) || questions.length === 0 || !answers || !Array.isArray(answers)) {
        return json({ success: false, error: 'questions and answers are required' }, 400);
      }

      const result = markExamServer(questions, answers);
      return json(result);
    }

    if (action === 'chat') {
      const messages = body.messages;
      const language = String(body.language || 'english');

      if (!messages || !Array.isArray(messages)) {
        return json({ success: false, error: 'messages array is required' }, 400);
      }

      try {
        const prompt = buildChatPrompt(messages, language);
        const systemInstruction = 'You are a helpful, patient JAMB tutor AI for IDT Academy students. Be encouraging and educational. You support every world language and always follow the language rules given in the prompt.';

        const responseText = await askAI(env, prompt, systemInstruction);
        return json({ success: true, response: responseText });
      } catch (err) {
        return json({ success: false, error: 'AI chat failed: ' + err.message }, 500);
      }
    }

    return json({ success: false, error: 'Unknown action. Use generate_exam, mark_exam, or chat.' }, 400);

  } catch (err) {
    return json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS });
};

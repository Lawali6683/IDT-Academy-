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

async function askGemini(apiKey, prompt, systemInstruction) {
  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' + apiKey;
  const contents = [];

  if (systemInstruction) {
    contents.push({ role: 'user', parts: [{ text: systemInstruction }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
  }

  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const body = {
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 4096
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
    throw new Error('Gemini API error: ' + (data.error && data.error.message ? data.error.message : JSON.stringify(data)));
  }

  return data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] ? data.candidates[0].content.parts[0].text : '';
}

function buildExamPrompt(userData) {
  const fullName = userData.full_name || 'Student';
  const courseName = userData.course_name || 'General';
  const courseId = userData.course_id || '';

  const subjectsMap = {
    'eng_tech': 'Use of English, Physics, Chemistry, Mathematics',
    'medicine': 'Use of English, Biology, Chemistry, Physics',
    'cs_science': 'Use of English, Mathematics, Physics, Chemistry',
    'cs_mgmt': 'Use of English, Mathematics, Physics, Economics',
    'agric': 'Use of English, Chemistry, Biology, Physics',
    'architecture': 'Use of English, Mathematics, Physics, Chemistry',
    'bio_sciences': 'Use of English, Biology, Chemistry, Physics',
    'physical_sci': 'Use of English, Mathematics, Physics, Chemistry',
    'math_stats': 'Use of English, Mathematics, Physics, Chemistry',
    'food_sci': 'Use of English, Chemistry, Mathematics, Biology',
    'law': 'Use of English, Literature in English, Government, CRK',
    'mass_comm': 'Use of English, Literature in English, Government, Economics',
    'pol_sci': 'Use of English, Government, Economics, Literature',
    'sociology': 'Use of English, Government, Economics, Literature',
    'economics': 'Use of English, Mathematics, Economics, Government',
    'english_lang': 'Use of English, Literature in English, Government, Any Language',
    'history': 'Use of English, History, Literature, Government',
    'theatre': 'Use of English, Literature, Government, Fine Arts',
    'languages': 'Use of English, Specific Language, Literature, Any Arts',
    'religious': 'Use of English, IRK/CRK, Government, Literature',
    'accounting': 'Use of English, Mathematics, Economics, Commerce',
    'business_admin': 'Use of English, Mathematics, Economics, Commerce',
    'marketing': 'Use of English, Mathematics, Economics, Commerce',
    'hr': 'Use of English, Mathematics, Economics, Government',
    'insurance': 'Use of English, Mathematics, Economics, Commerce',
    'estate': 'Use of English, Mathematics, Economics, Geography',
    'geography': 'Use of English, Geography, Mathematics, Economics',
    'edu_science': 'Use of English, Science, Mathematics, Chemistry',
    'edu_math': 'Use of English, Mathematics, Physics, Chemistry',
    'edu_english': 'Use of English, Literature, Government, Any Arts',
    'primary_edu': 'Use of English, Any 3 Arts/Social Science/Science',
    'mls': 'Use of English, Biology, Chemistry, Physics',
    'physio': 'Use of English, Biology, Chemistry, Physics',
    'public_health': 'Use of English, Biology, Chemistry, Physics',
    'veterinary': 'Use of English, Biology, Chemistry, Physics',
    'telecom': 'Use of English, Mathematics, Physics, Chemistry',
    'library': 'Use of English, Any 3 Arts/Social Science/Science'
  };

  const subjects = subjectsMap[courseId] || 'Use of English, Physics, Chemistry, Mathematics';

  return `You are a JAMB exam question generator for IDT Academy. Generate a complete JAMB UTME mock examination for a student named ${fullName} studying ${courseName}.
EXAM STRUCTURE (JAMB UTME 2026 standard):
- Total questions: 180
- Use of English: 60 questions (40 seconds per question recommended)
- Each of the 3 other subjects: 40 questions each
- Total time: 2 hours (120 minutes)
- Marking: 2.22 marks per question = 400 marks total
- No negative marking
- Subjects: ${subjects}

For each question, provide:
1. The question text (clear, exam-standard)
2. Four options (A, B, C, D) with one correct answer
3. The correct answer index (0 for A, 1 for B, 2 for C, 3 for D)
4. The subject name

OUTPUT FORMAT: Return ONLY a valid JSON array. No markdown, no code blocks. Each object must have: id (string like "q1"), number (1-180), subject (string), text (string), options (array of 4 strings), correct (0-3 integer).
Example:
[{"id":"q1","number":1,"subject":"Use of English","text":"Choose the correct option to complete the sentence: The committee ___ agreed on the proposal.","options":["has","have","is having","are having"],"correct":0}]
Generate questions following the JAMB UTME format. Ensure all subjects have correct question counts.`;
}

function buildMarkingPrompt(questions, answers, userData) {
  return `You are a JAMB exam marker for IDT Academy. Mark the following exam and provide detailed results.
STUDENT: ${userData.full_name || 'Student'}
COURSE: ${userData.course_name || 'General'}

MARKING SCHEME:
- Each question carries 2.22 marks
- Total: 400 marks
- Pass mark: 200 (50%)
- No negative marking

QUESTIONS AND ANSWERS:
${JSON.stringify({ questions: questions, answers: answers })}

OUTPUT FORMAT: Return ONLY a valid JSON object with these fields:
{
  "score": 0,
  "total": 180,
  "correct": 0,
  "passed": false,
  "subjects": [
    { "subject": "Subject Name", "correct": 0, "total": 40 }
  ],
  "details": [
    {
      "number": 1,
      "subject": "Subject Name",
      "question": "Full question text",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "user_answer": 0,
      "is_correct": true
    }
  ]
}
Calculate scores correctly. Use 2.22 marks per correct answer. Round the final score to nearest integer. Determine pass/fail correctly.`;
}

function buildChatPrompt(messages, language) {
  const systemMsg = messages.find((m) => m.role === 'system');
  const systemInstr = systemMsg ? systemMsg.content : 'You are a helpful JAMB tutor AI for IDT Academy.';
  let conversationHistory = '';

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === 'system') continue;
    conversationHistory += (m.role === 'user' ? 'Student: ' : 'Tutor: ') + m.content + '\n';
  }

  return `${systemInstr}
LANGUAGE INSTRUCTION: The student wants explanations in ${language} format. Provide the response clearly. Make sure the student understands completely.
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
      return json({ success: false, error: 'Invalid JSON body' }, 400);
    }

    const action = String(body.action || '').trim();
    if (!action) return json({ success: false, error: 'action is required (generate_exam, mark_exam, or chat)' }, 400);

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ success: false, error: 'GEMINI_API_KEY is not configured.' }, 500);
    }

    const userId = String(body.user_id || body.id || '').trim();
    let dbProfile = null;
    if (userId) {
      dbProfile = await fetchUserProfile(env, userId);
    }

    if (action === 'generate_exam') {
      const userData = {
        full_name: String(body.full_name || (dbProfile && dbProfile.full_name) || ''),
        course_name: String(body.course_name || (dbProfile && dbProfile.course_name) || ''),
        course_id: String(body.course_id || (dbProfile && dbProfile.course_id) || '')
      };

      try {
        const prompt = buildExamPrompt(userData);
        const geminiText = await askGemini(apiKey, prompt, 'You are a JAMB UTME exam generator. Generate accurate, exam-standard questions following the exact JAMB format. Return ONLY valid JSON array with questions.');

        let questions;
        try {
          questions = JSON.parse(geminiText);
        } catch (e) {
          const cleaned = geminiText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          questions = JSON.parse(cleaned);
        }

        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error('Invalid questions generated');
        }

        return json({ success: true, questions: questions });

      } catch (err) {
        return json({ success: false, error: 'Exam generation failed: ' + err.message }, 500);
      }
    }

    if (action === 'mark_exam') {
      const questions = body.questions;
      const answers = body.answers;
      const userData = {
        full_name: String(body.full_name || (dbProfile && dbProfile.full_name) || ''),
        course_name: String(body.course_name || (dbProfile && dbProfile.course_name) || ''),
        course_id: String(body.course_id || (dbProfile && dbProfile.course_id) || ''),
        email: String(body.email || (dbProfile && dbProfile.email) || '')
      };

      if (!questions || !answers) {
        return json({ success: false, error: 'questions and answers are required' }, 400);
      }

      try {
        const prompt = buildMarkingPrompt(questions, answers, userData);
        const geminiText = await askGemini(apiKey, prompt, 'You are a JAMB exam marker. Mark accurately, calculate scores correctly using 2.22 per question. Return ONLY valid JSON.');

        let result;
        try {
          result = JSON.parse(geminiText);
        } catch (e) {
          const cleaned = geminiText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          result = JSON.parse(cleaned);
        }

        if (!result || (result.score === undefined && result.score !== 0)) {
          throw new Error('Invalid marking result format');
        }

        return json({ success: true, ...result });

      } catch (err) {
        return json({ success: false, error: 'Marking failed: ' + err.message }, 500);
      }
    }

    if (action === 'chat') {
      const messages = body.messages;
      const language = String(body.language || 'english+hausa');

      if (!messages || !Array.isArray(messages)) {
        return json({ success: false, error: 'messages array is required' }, 400);
      }

      try {
        const prompt = buildChatPrompt(messages, language);
        const response = await askGemini(apiKey, prompt, 'You are a helpful, patient JAMB tutor AI for IDT Academy students. Be encouraging and educational. Respond in the requested language format.');

        return json({ success: true, response: response });

      } catch (err) {
        return json({ success: false, error: 'AI chat failed: ' + err.message }, 500);
      }
    }

    return json({ success: false, error: 'Unknown action. Use generate_exam, mark_exam, or chat.' }, 400);

  } catch (err) {
    return json({ success: false, error: err.message || 'Server error' }, 500);
  }
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS });
};
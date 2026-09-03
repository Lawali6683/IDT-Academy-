const ASK_API = '/api/ask';
const EMAIL_API = '/api/sendEmail';

async function callAsk(action, payload) {
  const body = { action: action, ...payload };
  const res = await fetch(ASK_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error('Server error ' + res.status + (txt ? ': ' + txt.slice(0, 200) : ''));
  }
  return await res.json();
}

async function callEmail(payload) {
  const res = await fetch(EMAIL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error('Email error ' + res.status + (txt ? ': ' + txt.slice(0, 200) : ''));
  }
  return await res.json();
}

export async function askQuestion(payload) {
  return callAsk('ask', payload);
}

export async function explainText(payload) {
  return callAsk('explain', payload);
}

export async function getAssessment(payload) {
  return callAsk('get-assessment', payload);
}

export async function gradeAssessment(payload) {
  return callAsk('grade-assessment', payload);
}

export async function createPayment(payload) {
  return callAsk('create-payment', payload);
}

export async function verifyPayment(payload) {
  return callAsk('verify-payment', payload);
}

export async function sendResultEmail(payload) {
  return callEmail(payload);
}
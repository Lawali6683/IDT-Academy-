import { supabase } from './supabase.js';

const ASK_API = '/api/aks';
const PAYSTACK_API = '/api/paystack';
const EMAIL_API = '/api/sendEmail';
const REQUEST_TIMEOUT_MS = 55000;

function ensurePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid request. Please refresh the page and try again.');
  }
  return payload;
}

function friendlyStatus(status) {
  if (status === 404) return 'The service is not reachable right now. Please try again later.';
  if (status === 413) return 'The data you sent is too large. Please send fewer or smaller images.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'The server is busy. Please try again in a moment.';
  return 'Request failed (' + status + '). Please try again.';
}

async function postJson(url, payload, label) {
  const body = ensurePayload(payload);
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === 'AbortError') {
      throw new Error(label + ': the request took too long. Please try again.');
    }
    throw new Error(label + ': network failed. Check your internet connection and try again.');
  }
  clearTimeout(timer);
  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }
  if (!res.ok) {
    const serverText = data && (data.error || data.message) ? String(data.error || data.message) : '';
    throw new Error(serverText || friendlyStatus(res.status));
  }
  if (!data || typeof data !== 'object') {
    throw new Error(label + ': the server returned an empty response.');
  }
  if (data.success === false) {
    throw new Error(String(data.error || data.message || (label + ' failed.')));
  }
  return data;
}

async function callAsk(action, payload) {
  const body = Object.assign({}, ensurePayload(payload), { action: action });
  return postJson(ASK_API, body, 'AI error');
}

export async function askQuestion(payload) {
  const data = await callAsk('ask', payload);
  const answer = String(data.answer || data.message || '').trim();
  if (!answer) throw new Error('The AI sent an empty reply. Please try again.');
  return Object.assign({}, data, { answer: answer });
}

export async function explainText(payload) {
  const data = await callAsk('explain', payload);
  const answer = String(data.answer || data.explanation || data.message || '').trim();
  if (!answer) throw new Error('The AI sent an empty explanation. Please try again.');
  return Object.assign({}, data, { answer: answer });
}

export async function getAssessment(payload) {
  const body = ensurePayload(payload);
  if (!Array.isArray(body.topics) || body.topics.length < 3) {
    throw new Error('An assessment needs three topics.');
  }
  const data = await callAsk('get-assessment', body);
  if (!Array.isArray(data.questions) || data.questions.length < 5) {
    throw new Error('The AI did not return a complete assessment. Please try again.');
  }
  return data;
}

export async function gradeAssessment(payload) {
  const data = await callAsk('grade-assessment', payload);
  const marks = Number(data.marks != null ? data.marks : data.score);
  if (!isFinite(marks)) {
    throw new Error('The AI did not return a valid grade. Please try again.');
  }
  return data;
}

export async function createPayment(payload) {
  return postJson(PAYSTACK_API, payload, 'Payment error');
}

export async function verifyPayment(payload) {
  const body = ensurePayload(payload);
  if (!body.user_id) throw new Error('Verify error: user id is missing');
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_data')
      .eq('id', body.user_id)
      .limit(1);
    if (error) throw error;
    const ud = (data && data[0] && data[0].user_data) || {};
    const status = String(ud.status || 'pending').toLowerCase();
    if (status === 'active') {
      return { success: true, paid: true, status: 'active' };
    }
    return { success: true, paid: false, status: status };
  } catch (err) {
    throw new Error('Verify error: ' + ((err && err.message) || 'failed'));
  }
}

export async function sendResultEmail(payload) {
  return postJson(EMAIL_API, payload, 'Email error');
}

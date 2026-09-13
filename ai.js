const ASK_API = '/api/ask';
const PAYSTACK_API = '/api/paystack';
const EMAIL_API = '/api/sendEmail';

async function postJson(url, payload, errorPrefix) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }
  if (!res.ok) {
    const txt = data && data.error ? data.error : '';
    throw new Error(errorPrefix + ' ' + res.status + (txt ? ': ' + txt : ''));
  }
  if (data && data.success === false) {
    throw new Error(data.error || (errorPrefix + ' failed'));
  }
  return data;
}

async function callAsk(action, payload) {
  return postJson(ASK_API, Object.assign({ action: action }, payload), 'Server error');
}

async function callEmail(payload) {
  return postJson(EMAIL_API, payload, 'Email error');
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
  return postJson(PAYSTACK_API, payload, 'Payment error');
}

export async function verifyPayment(payload) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_data')
      .eq('id', payload.user_id)
      .limit(1);
    if (error) throw error;
    const ud = (data && data[0] && data[0].user_data) || {};
    const status = String(ud.status || 'pending');
    if (status === 'active') {
      return { success: true, paid: true, status: 'active' };
    }
    return { success: true, paid: false, status: status };
  } catch (err) {
    throw new Error('Verify error: ' + (err.message || 'failed'));
  }
}

export async function sendResultEmail(payload) {
  return callEmail(payload);
}
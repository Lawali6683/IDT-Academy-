import { supabase } from './supabase.js';

const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

const departments = [
  { id: 'eng_tech', name: 'Engineering & Technology', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry'] },
  { id: 'medicine', name: 'Medicine & Surgery / Nursing / Pharmacy / Dentistry / Anatomy', subjects: ['English', 'Biology', 'Chemistry', 'Physics'] },
  { id: 'cs_science', name: 'Computer Science (Science Stream) / Cybersecurity / Software Engineering', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry'] },
  { id: 'cs_mgmt', name: 'Computer Science (Management / Polytechnics)', subjects: ['English', 'Mathematics', 'Physics', 'Economics'] },
  { id: 'agric', name: 'Agricultural Science / Agronomy / Animal Science', subjects: ['English', 'Chemistry', 'Biology / Agric Science', 'Physics / Mathematics'] },
  { id: 'architecture', name: 'Architecture / Building / Quantity Surveying / Urban Planning', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry / Fine Arts / Geography'] },
  { id: 'bio_sciences', name: 'Biological Sciences (Biochemistry / Microbiology / Zoology / Botany)', subjects: ['English', 'Biology', 'Chemistry', 'Physics / Mathematics'] },
  { id: 'physical_sci', name: 'Physical Sciences (Physics / Industrial Chemistry / Geology)', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry'] },
  { id: 'math_stats', name: 'Mathematics / Statistics / Data Science', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry / Economics'] },
  { id: 'food_sci', name: 'Food Science and Technology', subjects: ['English', 'Chemistry', 'Mathematics / Physics', 'Biology / Agric Science'] },
  { id: 'law', name: 'Law (Civil / Common / Islamic)', subjects: ['English', 'Literature in English', 'Government / History', 'CRK / IRK / Economics'] },
  { id: 'mass_comm', name: 'Mass Communication / Journalism / Media Studies', subjects: ['English', 'Literature in English', 'Government / History', 'Any Nigerian Language / CRK / IRK / Economics'] },
  { id: 'pol_sci', name: 'Political Science / International Relations / Public Admin', subjects: ['English', 'Government / History', 'Economics', 'Literature in English / CRK / IRK / Geography'] },
  { id: 'sociology', name: 'Sociology / Criminology / Psychology', subjects: ['English', 'Government / History', 'Economics', 'Any Arts or Social Science Subject'] },
  { id: 'economics', name: 'Economics', subjects: ['English', 'Mathematics', 'Economics', 'Government / History / Geography / Commerce'] },
  { id: 'english_lang', name: 'English Language / Linguistics / Literature', subjects: ['English', 'Literature in English', 'Government / History', 'Any Nigerian Language / Arts Subject'] },
  { id: 'history', name: 'History and International Studies', subjects: ['English', 'History / Government', 'Literature in English', 'Any Arts or Social Science Subject'] },
  { id: 'theatre', name: 'Theatre Arts / Performing Arts / Creative Arts', subjects: ['English', 'Literature in English', 'Government / History', 'Fine Arts / Music / Any Arts Subject'] },
  { id: 'languages', name: 'Hausa / Yoruba / Igbo', subjects: ['English', 'The Specific Language', 'Literature in English', 'Any Arts Subject'] },
  { id: 'religious', name: 'Islamic Studies / Christian Religious Studies', subjects: ['English', 'IRK / CRK', 'Government / History', 'Literature in English / Any Arts Subject'] },
  { id: 'accounting', name: 'Accounting / Finance / Banking & Finance', subjects: ['English', 'Mathematics', 'Economics', 'Commerce / Financial Accounting / Government'] },
  { id: 'business_admin', name: 'Business Administration / Business Management', subjects: ['English', 'Mathematics', 'Economics', 'Commerce / Government'] },
  { id: 'marketing', name: 'Marketing / Procurement / Logistics', subjects: ['English', 'Mathematics', 'Economics', 'Commerce / Government'] },
  { id: 'hr', name: 'Human Resource Management / Industrial Relations', subjects: ['English', 'Mathematics', 'Economics', 'Government'] },
  { id: 'insurance', name: 'Insurance / Actuarial Science', subjects: ['English', 'Mathematics', 'Economics', 'Commerce / Physics / Financial Accounting'] },
  { id: 'estate', name: 'Estate Management', subjects: ['English', 'Mathematics', 'Economics', 'Chemistry / Physics / Geography / Agric Science'] },
  { id: 'geography', name: 'Geography / Environmental Management', subjects: ['English', 'Geography', 'Mathematics / Economics', 'Biology / Chemistry / Physics'] },
  { id: 'edu_science', name: 'Education & Science (Physics / Chemistry / Biology)', subjects: ['English', 'Science Subject', 'Mathematics', 'Chemistry / Physics / Biology'] },
  { id: 'edu_math', name: 'Education & Mathematics', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry / Economics'] },
  { id: 'edu_english', name: 'Education & English', subjects: ['English', 'Literature in English', 'Government / History', 'Any Arts Subject'] },
  { id: 'edu_econs', name: 'Education & Economics', subjects: ['English', 'Mathematics', 'Economics', 'Government / Geography'] },
  { id: 'primary_edu', name: 'Primary Education / Special Education', subjects: ['English', 'Any 3 Arts / Social Science / Science Subjects'] },
  { id: 'mls', name: 'Medical Laboratory Science / Radiography', subjects: ['English', 'Biology', 'Chemistry', 'Physics'] },
  { id: 'physio', name: 'Physiotherapy / Prosthetics and Orthotics', subjects: ['English', 'Biology', 'Chemistry', 'Physics'] },
  { id: 'public_health', name: 'Public Health / Environmental Health Science', subjects: ['English', 'Biology', 'Chemistry', 'Physics / Mathematics'] },
  { id: 'veterinary', name: 'Veterinary Medicine', subjects: ['English', 'Biology', 'Chemistry', 'Physics'] },
  { id: 'telecom', name: 'Telecommunication Engineering / Biomedical Engineering', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry'] },
  { id: 'library', name: 'Library and Information Science', subjects: ['English', 'Any 3 Arts / Social Science / Science Subjects'] }
];

const el = {
  loading: $('#loadingScreen'),
  backBtn: $('#backBtn'),
  dashUserName: $('#dashUserName'),
  dashUserDept: $('#dashUserDept'),
  referralBadge: $('#referralBadge'),
  referralEarn: $('#referralEarn'),
  logoutBtn: $('#logoutBtn'),
  paymentOverlay: $('#paymentOverlay'),
  payAccountNumber: $('#payAccountNumber'),
  payAccountName: $('#payAccountName'),
  payBankName: $('#payBankName'),
  payAmount: $('#payAmount'),
  payTimer: $('#payTimer'),
  payTimerCount: $('#payTimerCount'),
  payTimerExpired: $('#payTimerExpired'),
  payRefreshBtn: $('#payRefreshBtn'),
  payStatusCheck: $('#payStatusCheck'),
  dashboardContent: $('#dashboardContent'),
  welcomeName: $('#welcomeName'),
  progressPercent: $('#progressPercent'),
  topicCount: $('#topicCount'),
  adSlider: $('#adSlider'),
  adDots: $('#adDots'),
  currentTopicNum: $('#currentTopicNum'),
  totalTopicNum: $('#totalTopicNum'),
  learningSection: $('#learningSection'),
  progressFill: $('#progressFill'),
  progressText: $('#progressText'),
  topicViewer: $('#topicViewer'),
  tvNum: $('#tvNum'),
  tvTitle: $('#tvTitle'),
  tvVideo: $('#tvVideo'),
  tvVideoIframe: $('#tvVideoIframe'),
  tvContent: $('#tvContent'),
  tvBackBtn: $('#tvBackBtn'),
  tvQuestionBtn: $('#tvQuestionBtn'),
  tvExplainBtn: $('#tvExplainBtn'),
  tvNextBtn: $('#tvNextBtn'),
  allComplete: $('#allComplete'),
  finalExamBtn: $('#finalExamBtn'),
  referralPageBtn: $('#referralPageBtn'),
  courseSelectOverlay: $('#courseSelectOverlay'),
  deptGrid: $('#deptGrid'),
  deptLoading: $('#deptLoading'),
  payGetOverlay: $('#payGetOverlay'),
  payGetCourseName: $('#payGetCourseName'),
  payGetSubjects: $('#payGetSubjects'),
  payGetAmount: $('#payGetAmount'),
  payGetError: $('#payGetError'),
  changeCourseBtn: $('#changeCourseBtn'),
  payNowBtn: $('#payNowBtn'),
  payNowLoading: $('#payNowLoading'),
  examLockOverlay: $('#examLockOverlay'),
  startExamBtn: $('#startExamBtn'),
  cooldownDisplay: $('#cooldownDisplay'),
  cooldownTimer: $('#cooldownTimer'),
  examScreen: $('#examScreen'),
  examSubjects: $('#examSubjects'),
  examTimerDisplay: $('#examTimerDisplay'),
  examMainArea: $('#examMainArea'),
  examQNum: $('#examQNum'),
  examQText: $('#examQText'),
  examOptions: $('#examOptions'),
  examPrevBtn: $('#examPrevBtn'),
  examNextBtn: $('#examNextBtn'),
  examPanel: $('#examPanel'),
  examQGrid: $('#examQGrid'),
  submitExamBtn: $('#submitExamBtn'),
  backToLearningBtn: $('#backToLearningBtn'),
refBackToLearningBtn: $('#refBackToLearningBtn'),
  cameraOverlay: $('#cameraOverlay'),
  camVideo: $('#camVideo'),
  camFloatingWidget: $('#camFloatingWidget'),
  camFloatVideo: $('#camFloatVideo'),
  examMainCam: $('#examMainCam'),
  camQNum: $('#camQNum'),
  camQText: $('#camQText'),
  camOptions: $('#camOptions'),
  camPrevBtn: $('#camPrevBtn'),
  camNextBtn: $('#camNextBtn'),
  examWarning: $('#examWarning'),
  netPauseOverlay: $('#netPauseOverlay'),
  netPauseTimer: $('#netPauseTimer'),
  netPauseLocked: $('#netPauseLocked'),
  netPauseTimeLeft: $('#netPauseTimeLeft'),
  netPauseContinue: $('#netPauseContinue'),
  resultsOverlay: $('#resultsOverlay'),
  resultsCard: $('#resultsCard'),
  certificateOverlay: $('#certificateOverlay'),
  certificateContent: $('#certificateContent'),
  certCloseBtn: $('#certCloseBtn'),
  aiModalOverlay: $('#aiModalOverlay'),
  aiModalClose: $('#aiModalClose'),
  aiLangSelect: $('#aiLangSelect'),
  aiChatArea: $('#aiChatArea'),
  aiInput: $('#aiInput'),
  aiSendBtn: $('#aiSendBtn'),
  aiOtherLang: $('#aiOtherLang'),
  toastContainer: $('#toastContainer')
};

let currentUser = null;
let userData = null;
let topics = [];
let currentTopicIndex = 0;
let ads = [];
let adIndex = 0;
let adInterval = null;
let payTimerInterval = null;
let payExpiresAt = null;
let statusCheckInterval = null;
let examQuestions = [];
let currentExamQ = 0;
let examAnswers = [];
let examTimerInterval = null;
let examTimeLeft = 7200;
let examStarted = false;
let isMobile = false;
let camStream = null;
let aiContext = [];
let aiActiveLang = 'english';
let netPaused = false;
let netDeadline = null;
let netCountdownInterval = null;
let screenSwitchCount = 0;
let examCooldownInterval = null;

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, function(ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

function checkDevice() {
  isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
}

function showToast(msg, type, dur) {
  if (!type) type = 'success';
  if (!dur) dur = 4000;
  if (!el.toastContainer) return;
  const icons = { success: 'fas fa-check-circle', error: 'fas fa-circle-exclamation', warning: 'fas fa-triangle-exclamation', info: 'fas fa-circle-info' };
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = '<span class="toast-icon"><i class="' + (icons[type] || icons.success) + '"></i></span><span class="toast-text">' + escapeHtml(msg) + '</span><button class="toast-close"><i class="fas fa-xmark"></i></button>';
  el.toastContainer.appendChild(t);
  t.querySelector('.toast-close').onclick = function() { removeToast(t); };
  setTimeout(function() { removeToast(t); }, dur);
}

function removeToast(t) {
  if (t.classList.contains('removing')) return;
  t.classList.add('removing');
  setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
}

function showLoading(show) {
  if (!el.loading) return;
  if (show) { el.loading.classList.remove('fade-out'); el.loading.style.display = 'flex'; }
  else { el.loading.classList.add('fade-out'); setTimeout(function() { el.loading.style.display = 'none'; }, 500); }
}

async function copyText(txt) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(txt);
  } else {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function getLocalUser() {
  try { return JSON.parse(localStorage.getItem('idt_user')); } catch(e) { return null; }
}

function setLocalUser(u) {
  localStorage.setItem('idt_user', JSON.stringify(u));
}

async function readApiError(res) {
  try {
    const data = await res.json();
    if (data && (data.error || data.message)) return String(data.error || data.message);
    if (data && data.msg) return String(data.msg);
    return null;
  } catch (e) {
    return null;
  }
}

async function fetchUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('fetchUserProfile error:', err);
    return null;
  }
}

function activateDashboardView() {
  if (el.paymentOverlay) el.paymentOverlay.classList.remove('active');
  if (el.courseSelectOverlay) el.courseSelectOverlay.classList.remove('active');
  if (el.payGetOverlay) el.payGetOverlay.classList.remove('active');
  if (el.dashboardContent) el.dashboardContent.classList.remove('hidden');
}

async function checkPaymentStatus(userId) {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) return false;

    const ud = profile.user_data || {};

    if (ud.payment_no === 'yes') {
      const stored = getLocalUser() || {};
      stored.payment_no = 'yes';
      stored.status = 'active';
      setLocalUser(stored);
      currentUser = stored;

      activateDashboardView();
      stopPaymentPolling();

      showToast('Congratulations! Payment confirmed. Welcome to your dashboard.', 'success', 6000);

      initDashboard();
      return true;
    }

    return false;
  } catch (err) {
    console.error('Error checking payment status:', err);
    return false;
  }
}

function stopPaymentPolling() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
    statusCheckInterval = null;
  }
  if (payTimerInterval) {
    clearInterval(payTimerInterval);
    payTimerInterval = null;
  }
}

function showPayError(message) {
  let banner = document.getElementById('payErrorBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'payErrorBanner';
    banner.style.cssText = 'margin:12px 0;padding:12px 14px;border-radius:12px;background:rgba(244,63,94,.08);border:1px solid rgba(244,63,94,.3);color:#f43f5e;font-size:13px;display:flex;align-items:center;gap:10px;flex-wrap:wrap';
    if (el.payAccountNumber && el.payAccountNumber.parentNode) {
      el.payAccountNumber.parentNode.insertBefore(banner, el.payAccountNumber.parentNode.firstChild);
    } else if (el.paymentOverlay) {
      el.paymentOverlay.appendChild(banner);
    } else {
      return;
    }
  }
  banner.innerHTML = '<i class="fas fa-triangle-exclamation"></i> <span style="flex:1">' + escapeHtml(message) + '</span> <button id="payErrorRetry" style="background:#f43f5e;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer">Try Again</button>';
  banner.style.display = 'flex';
  const retryBtn = document.getElementById('payErrorRetry');
  if (retryBtn) {
    retryBtn.addEventListener('click', function() {
      banner.style.display = 'none';
      requestPaymentDetails();
    });
  }
}

function showPayGetError(message) {
  if (!el.payGetError) {
    showToast(message, 'error', 6000);
    return;
  }
  el.payGetError.innerHTML = '<i class="fas fa-triangle-exclamation"></i> ' + escapeHtml(message);
  el.payGetError.style.display = 'flex';
}

function hidePayGetError() {
  if (el.payGetError) el.payGetError.style.display = 'none';
}

function hidePayError() {
  const banner = document.getElementById('payErrorBanner');
  if (banner) banner.style.display = 'none';
}

function setupCopyButton() {
  if (document.getElementById('payCopyBtn')) return;
  const host = el.payAccountNumber;
  if (!host || !host.parentNode) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'payCopyBtn';
  btn.setAttribute('aria-label', 'Copy account number');
  btn.style.cssText = 'background:rgba(124,58,237,.12);color:#7c3aed;border:none;border-radius:8px;width:34px;height:34px;margin-left:8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:14px;vertical-align:middle;transition:background .2s';
  btn.innerHTML = '<i class="fas fa-copy"></i>';
  btn.addEventListener('click', async function() {
    const acc = (el.payAccountNumber.textContent || '').trim();
    if (!acc || acc === '---') {
      showToast('Account number is not ready yet. Please wait or refresh the payment details.', 'warning');
      return;
    }
    try {
      await copyText(acc);
      btn.innerHTML = '<i class="fas fa-check"></i>';
      btn.style.background = 'rgba(16,185,129,.15)';
      btn.style.color = '#10b981';
      showToast('Account number copied: ' + acc, 'success');
      setTimeout(function() {
        btn.innerHTML = '<i class="fas fa-copy"></i>';
        btn.style.background = 'rgba(124,58,237,.12)';
        btn.style.color = '#7c3aed';
      }, 2000);
    } catch (err) {
      showToast('Could not copy. Please copy the number manually.', 'error');
    }
  });
  host.insertAdjacentElement('afterend', btn);
}

function beginPaymentPolling() {
  if (statusCheckInterval) clearInterval(statusCheckInterval);

  const startTime = Date.now();
  const thirtyMinutesMs = 30 * 60 * 1000;

  statusCheckInterval = setInterval(function() {
    const elapsedTime = Date.now() - startTime;

    if (elapsedTime >= thirtyMinutesMs) {
      stopPaymentPolling();
      showToast('Payment window session timed out. Please refresh or try again.', 'warning');
      return;
    }

    const u = getLocalUser();
    if (u && u.id) {
      checkPaymentStatus(u.id).then(function(done) {
        if (done) {
          stopPaymentPolling();
        }
      });
    }
  }, 5000);
}

function startPaymentFlow() {
  if (el.paymentOverlay) el.paymentOverlay.classList.add('active');
  requestPaymentDetails();
  beginPaymentPolling();
}



async function requestPaymentDetails() {
  const u = getLocalUser();
  if (!u) return;

  hidePayError();

  try {
    const res = await fetch('/api/paystack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: u.id,
        email: u.email,
        price: 3500
      })
    });

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    if (!res.ok || !data || !data.success) {
      const apiMsg = data && (data.error || data.message) ? (data.error || data.message) : null;
      const errMsg = apiMsg
        ? apiMsg
        : 'Payment service returned an error (HTTP ' + res.status + '). Please try again.';
      showPayError('Failed to initialize payment: ' + errMsg);
      showToast('Error: ' + errMsg, 'error', 6000);
      return;
    }

    if (data.account_number && data.account_number.trim() !== '') {
      if (el.payAccountNumber) el.payAccountNumber.textContent = data.account_number;
      if (el.payAccountName) el.payAccountName.textContent = data.account_name || '';
      if (el.payBankName) el.payBankName.textContent = data.bank_name || '';
      if (el.payAmount) el.payAmount.textContent = '₦' + Number(3500).toLocaleString();

      setupCopyButton();
      hidePayError();
    } else if (data.authorization_url) {
      window.location.href = data.authorization_url;
      return;
    } else {
      showPayGetError('Unable to generate bank transfer details. Please try again later.');
      return;
    }

    if (data.expires_at) {
      payExpiresAt = new Date(data.expires_at).getTime();
    } else {
      payExpiresAt = Date.now() + (30 * 60 * 1000);
    }
    startPayTimer();

    showToast('Payment details generated successfully. Please proceed with your transfer.', 'info');

  } catch (err) {
    console.error('Network Error:', err);
    showPayError('Network connection error. Please verify your internet connection and click "Try Again".');
    showToast('Network error while connecting to payment service.', 'error');
  }
}



function renderPayGet(u) {
  if (!el.payGetOverlay) return;

  if (hasCourseData(u)) {
    if (el.payGetCourseName) el.payGetCourseName.textContent = u.jambCourseName || 'JAMB Preparation Course';
    if (el.payGetSubjects) {
      const subs = Array.isArray(u.jambCourseSubjects) ? u.jambCourseSubjects : [];
      el.payGetSubjects.textContent = subs.length > 0 ? subs.join(' • ') : 'English + 3 subjects';
    }
    if (el.payGetAmount) el.payGetAmount.textContent = '₦' + Number(3500).toLocaleString();
    if (el.payNowBtn) {
      el.payNowBtn.disabled = false;
      el.payNowBtn.innerHTML = '<i class="fas fa-credit-card"></i> Pay Now';
    }
    if (el.changeCourseBtn) {
      el.changeCourseBtn.innerHTML = '<i class="fas fa-repeat"></i> Change Course Department';
    }
    hidePayGetError();
  } else {
    if (el.payGetCourseName) el.payGetCourseName.textContent = 'Select Your Department';
    if (el.payGetSubjects) el.payGetSubjects.textContent = 'You have not selected a course department yet. Please choose the department that matches your desired course.';
    if (el.payGetAmount) el.payGetAmount.textContent = '₦' + Number(3500).toLocaleString();
    if (el.payNowBtn) {
      el.payNowBtn.disabled = true;
      el.payNowBtn.innerHTML = '<i class="fas fa-lock"></i> Select Department to Enable Payment';
    }
    if (el.changeCourseBtn) {
      el.changeCourseBtn.innerHTML = '<i class="fas fa-list"></i> Select Department Now';
    }
    showPayGetError('You must select your course department before you can pay. Please click "Select Department Now" and choose your department.');
  }

  el.payGetOverlay.classList.add('active');
}

function hasCourseData(u) {
  if (!u) return false;
  const id = String(u.jambCourseId || '').trim();
  const name = String(u.jambCourseName || '').trim();
  const subjects = Array.isArray(u.jambCourseSubjects) ? u.jambCourseSubjects : [];
  const badValues = ['', 'a/n', 'an', 'n/a', 'na', 'null', 'undefined', 'none'];
  if (badValues.indexOf(id.toLowerCase()) !== -1) return false;
  if (badValues.indexOf(name.toLowerCase()) !== -1) return false;
  if (subjects.length === 0) return false;
  return true;
}


function renderDeptGrid(u) {
  if (!el.deptGrid) return;
  el.deptGrid.innerHTML = '';
  const currentId = u && (u.jambCourseId || '');
  departments.forEach(function(d) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dept-card' + (d.id === currentId ? ' selected' : '');
    btn.innerHTML = '<div class="dept-name">' + escapeHtml(d.name) + '</div><div class="dept-subjects">' + d.subjects.map(function(s) { return escapeHtml(s); }).join(' • ') + '</div>';
    btn.addEventListener('click', function() { selectDepartment(d, btn); });
    el.deptGrid.appendChild(btn);
  });
}

function showCourseSelect() {
  const u = getLocalUser();
  if (!u) return;
  renderDeptGrid(u);
  el.courseSelectOverlay.classList.add('active');
}



async function selectDepartment(dept, btn) {
  const u = getLocalUser();
  if (!u) return;

  if (el.deptLoading) el.deptLoading.classList.remove('hidden');
  hidePayGetError();

  try {
    const res = await fetch('/api/jambData', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: u.id,
        department_id: dept.id
      })
    });

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    if (!res.ok || !data || !data.success) {
      const apiMsg = data && (data.error || data.message) ? (data.error || data.message) : null;
      const errMsg = apiMsg
        ? apiMsg
        : 'Could not update your course (HTTP ' + res.status + '). Please try again.';
      showToast(errMsg, 'error', 6000);
      return;
    }

    const updated = Object.assign({}, u, {
      jambCourseId: data.jambCourseId,
      jambCourseName: data.jambCourseName,
      jambCourseSubjects: data.jambCourseSubjects,
      jambCoursePrice: 3500
    });
    setLocalUser(updated);
    currentUser = updated;
    userData = updated;

    showToast(data.message || 'Your department has been selected successfully. You can now pay ₦3,500.', 'success', 6000);

    el.courseSelectOverlay.classList.remove('active');
    renderPayGet(updated);

  } catch (err) {
    console.error('jambData error:', err);
    showToast('Network connection error. Please check your internet and try again.', 'error', 6000);
  } finally {
    if (el.deptLoading) el.deptLoading.classList.add('hidden');
  }
}

el.changeCourseBtn.addEventListener('click', showCourseSelect);




el.payNowBtn.addEventListener('click', async function() {
  const u = getLocalUser();
  if (!u) return;

  if (!hasCourseData(u)) {
    showPayGetError('You must select your course department first. Please choose your department, then you can pay ₦3,500.');
    showToast('Select your department first before paying.', 'warning', 6000);
    showCourseSelect();
    return;
  }

  this.disabled = true;
  if (el.payNowLoading) el.payNowLoading.classList.remove('hidden');
  hidePayGetError();

  try {
    const res = await fetch('/api/paystack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: u.id,
        email: u.email,
        price: 3500
      })
    });

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    if (!res.ok || !data || !data.success) {
      const apiMsg = data && (data.error || data.message) ? (data.error || data.message) : null;
      const errMsg = apiMsg
        ? apiMsg
        : 'Payment service returned an error (HTTP ' + res.status + '). Please try again.';
      showPayGetError(errMsg);
      showToast('Error: ' + errMsg, 'error', 6000);
      return;
    }

    if (data.authorization_url) {
      showToast('Redirecting you to complete your payment...', 'info');
      window.location.href = data.authorization_url;
      return;
    }

    if (data.account_number && data.account_number.trim() !== '') {
      if (el.payAccountNumber) el.payAccountNumber.textContent = data.account_number;
      if (el.payAccountName) el.payAccountName.textContent = data.account_name || '';
      if (el.payBankName) el.payBankName.textContent = data.bank_name || '';
      if (el.payAmount) el.payAmount.textContent = '₦' + Number(3500).toLocaleString();
      setupCopyButton();
      el.payGetOverlay.classList.remove('active');
      el.paymentOverlay.classList.add('active');
      payExpiresAt = data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + (30 * 60 * 1000);
      startPayTimer();
      beginPaymentPolling();
      showToast('Payment details generated. Please transfer to the account below.', 'info', 6000);
      return;
    }

    showPayGetError('Unable to generate payment details. Please try again later.');

  } catch (err) {
    console.error('Pay Now network error:', err);
    showPayGetError('Network connection error. Please verify your internet connection and try again.');
    showToast('Network error while connecting to payment service.', 'error');
  } finally {
    this.disabled = false;
    if (el.payNowLoading) el.payNowLoading.classList.add('hidden');
    if (!hasCourseData(getLocalUser())) {
      this.disabled = true;
      this.innerHTML = '<i class="fas fa-lock"></i> Select Department to Enable Payment';
    }
  }
});


function startPayTimer() {
  if (payTimerInterval) clearInterval(payTimerInterval);
  payTimerInterval = setInterval(function() {
    if (!payExpiresAt) return;
    const now = Date.now();
    const diff = payExpiresAt - now;
    if (diff <= 0) {
      el.payTimerCount.classList.add('hidden');
      el.payTimerExpired.classList.remove('hidden');
      clearInterval(payTimerInterval);
      return;
    }
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    el.payTimerCount.textContent = String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');
  }, 1000);
}

el.payRefreshBtn.addEventListener('click', function() {
  el.payTimerCount.classList.remove('hidden');
  el.payTimerExpired.classList.add('hidden');
  requestPaymentDetails();
  showToast('Payment details refreshed.', 'success');
});

function applyNewCourseFields(ud) {
  return {
    jambCourseId: ud.jambCourseId || '',
    jambCourseName: ud.jambCourseName || '',
    jambCourseSubjects: Array.isArray(ud.jambCourseSubjects) ? ud.jambCourseSubjects : [],
    jambCoursePrice: ud.jambCoursePrice || 3500
  };
}

async function checkAndInitUser() {
  const u = getLocalUser();
  if (!u) {
    window.location.href = 'jamb.html';
    return;
  }

  const profile = await fetchUserProfile(u.id);
  const ud = (profile && profile.user_data) ? profile.user_data : u;

  if (ud.payment_no === 'yes') {
    activateDashboardView();
    initDashboard();
  } else {
    if (el.dashboardContent) el.dashboardContent.classList.add('hidden');
    const stored = Object.assign({}, u, applyNewCourseFields(ud), { payment_no: ud.payment_no || 'no', status: ud.status || 'pending' });
    setLocalUser(stored);
    currentUser = stored;
    userData = stored;
    stopPaymentPolling();
    renderPayGet(stored);
  }
}



async function initDashboard() {
  const u = getLocalUser();
  if (!u) { window.location.href = 'jamb.html'; return; }
  userData = u;
  currentUser = u;
  el.dashUserName.textContent = u.full_name || 'Student';
  el.dashUserDept.textContent = u.jambCourseName || 'JAMB Student';
  el.welcomeName.textContent = u.full_name || 'Student';
  el.referralEarn.textContent = '₦' + (Number(u.referral_bonus) || 0).toFixed(2);
  await fetchTopics();
  renderLearning();
  fetchAds();
}

async function fetchTopics() {
  try {
    const { data, error } = await supabase
      .from('jamb')
      .select('jamb_topic')
      .eq('id', 'jamb_topics')
      .maybeSingle();
    if (error) throw error;
    let all = [];
    if (data && data.jamb_topic) {
      if (Array.isArray(data.jamb_topic)) {
        all = data.jamb_topic;
      } else if (data.jamb_topic && Array.isArray(data.jamb_topic.topics)) {
        all = data.jamb_topic.topics;
      }
    }
    topics = all.filter(function(t) { return t && typeof t === 'object'; });
    topics.sort(function(a,b) { return (Number(a.number) || 0) - (Number(b.number) || 0); });
  } catch (err) {
    console.error('fetchTopics error:', err);
    topics = [];
  }
}

function getFinalTopic() {
  for (let i = topics.length - 1; i >= 0; i--) {
    if (topics[i] && topics[i].final === 'yes') return topics[i];
  }
  return topics.length > 0 ? topics[topics.length - 1] : null;
}

function isExamUnlocked(progress) {
  if (!topics || topics.length === 0) return false;
  const completed = (progress && progress.completed) ? progress.completed : [];
  if (completed.length < topics.length) return false;
  const finalTopic = getFinalTopic();
  if (!finalTopic) return false;
  return completed.indexOf(finalTopic.id) !== -1;
}

async function fetchAds() {
  try {
    const { data, error } = await supabase
      .from('ad_for')
      .select('*');
    if (error) throw error;
    ads = data || [];
    renderAds();
  } catch (err) {
    console.error('fetchAds error:', err);
    ads = [];
  }
}

function renderAds() {
  el.adSlider.innerHTML = '';
  el.adDots.innerHTML = '';
  if (!ads || ads.length === 0) {
    el.adSlider.innerHTML = '<div class="ad-empty"><i class="fas fa-bullhorn" style="margin-right:8px"></i> No announcements</div>';
    return;
  }
  ads.forEach(function(ad, i) {
    const dot = document.createElement('span');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.dataset.index = i;
    dot.addEventListener('click', function() { showAd(i); });
    el.adDots.appendChild(dot);
  });
  adIndex = 0;
  showAd(0);
  if (adInterval) clearInterval(adInterval);
  if (ads.length > 1) {
    adInterval = setInterval(function() {
      adIndex = (adIndex + 1) % ads.length;
      showAd(adIndex);
    }, 6000);
  }
}

function showAd(index) {
  const ad = ads[index];
  if (!ad) return;
  adIndex = index;
  const imgSrc = ad.ad_image || '';
  const link = ad.ad_link || '';
  if (imgSrc) {
    el.adSlider.innerHTML = '<img src="' + escapeHtml(imgSrc) + '" alt="Ad" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=\\\'ad-empty\\\'><i class=\\\'fas fa-bullhorn\\\' style=\\\'margin-right:8px\\\'></i> Ad</div>\'">' +
      (link ? '<a href="' + escapeHtml(link) + '" target="_blank" rel="noopener" class="ad-link-overlay"><span><i class="fas fa-external-link-alt"></i> Learn More</span></a>' : '');
  } else {
    const title = (ad.ad_smat && ad.ad_smat.title) || 'Advertisement';
    el.adSlider.innerHTML = '<div class="ad-empty"><i class="fas fa-bullhorn" style="margin-right:8px"></i> ' + escapeHtml(title) + '</div>';
  }
  $$('.dot', el.adDots).forEach(function(d, i) {
    d.className = 'dot' + (i === index ? ' active' : '');
  });
}

function getStoredProgress() {
  try {
    const data = JSON.parse(localStorage.getItem('idt_progress_' + (currentUser && currentUser.id ? currentUser.id : '')));
    if (!data || typeof data !== 'object') return { current: 0, completed: [] };
    if (!Array.isArray(data.completed)) data.completed = [];
    if (typeof data.current !== 'number') data.current = 0;
    return data;
  } catch(e) { return { current: 0, completed: [] }; }
}

function saveProgress(progress) {
  localStorage.setItem('idt_progress_' + (currentUser && currentUser.id ? currentUser.id : ''), JSON.stringify(progress));
}




function renderLearning() {
  if (!topics || topics.length === 0) {
    el.tvContent.innerHTML = '<p style="text-align:center;color:var(--muted);padding:30px">No topics available yet. Check back later.</p>';
    el.topicViewer.style.display = 'none';
    el.allComplete.style.display = 'none';
    if (el.refBackToLearningBtn) el.refBackToLearningBtn.classList.add('hidden');
    if (el.progressFill) el.progressFill.style.width = '0%';
    if (el.progressText) el.progressText.textContent = '0%';
    if (el.progressPercent) el.progressPercent.textContent = '0%';
    if (el.topicCount) el.topicCount.textContent = '0/0';
    if (el.totalTopicNum) el.totalTopicNum.textContent = '0';
    return;
  }
  const progress = getStoredProgress();
  const completedCount = progress.completed ? progress.completed.length : 0;
  const totalCount = topics.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  el.progressFill.style.width = pct + '%';
  el.progressText.textContent = pct + '%';
  el.progressPercent.textContent = pct + '%';
  el.topicCount.textContent = completedCount + '/' + totalCount;
  el.totalTopicNum.textContent = totalCount;

  if (completedCount >= totalCount && isExamUnlocked(progress)) {
    el.topicViewer.style.display = 'none';
    el.allComplete.style.display = 'block';
    if (el.refBackToLearningBtn) el.refBackToLearningBtn.classList.remove('hidden');
    return;
  }

  if (el.refBackToLearningBtn) el.refBackToLearningBtn.classList.add('hidden');
  showLearningView();
}

function showLearningView() {
  el.allComplete.style.display = 'none';
  el.topicViewer.style.display = 'block';
  const progress = getStoredProgress();
  let targetIdx = progress.current;
  if (targetIdx >= topics.length) targetIdx = topics.length - 1;
  if (targetIdx < 0) targetIdx = 0;
  currentTopicIndex = targetIdx;
  showTopic(currentTopicIndex);
}

function showTopic(index) {
  if (!topics || index < 0 || index >= topics.length) return;
  const topic = topics[index];
  currentTopicIndex = index;
  const total = topics.length;

  el.tvNum.textContent = 'Topic ' + (index + 1) + ' of ' + total;
  el.tvTitle.textContent = topic.title || 'Untitled';
  el.currentTopicNum.textContent = index + 1;

  const videoId = extractYouTubeId(topic.video_link);
  if (videoId) {
    el.tvVideoIframe.src = 'https://www.youtube.com/embed/' + videoId + '?rel=0&modestbranding=1';
    el.tvVideo.style.display = 'block';
  } else if (topic.video_link) {
    el.tvVideoIframe.src = topic.video_link;
    el.tvVideo.style.display = 'block';
  } else {
    el.tvVideo.style.display = 'none';
  }

  el.tvContent.innerHTML = topic.text || '<p>No content available for this topic.</p>';

 el.tvBackBtn.disabled = index <= 0;
  el.tvNextBtn.disabled = false;

  const progress = getStoredProgress();
  if (!progress.completed) progress.completed = [];
  if (progress.completed.indexOf(topic.id) === -1) {
    progress.completed.push(topic.id);
    if (index + 1 > progress.current) progress.current = index + 1;
    saveProgress(progress);
    const completedCount = progress.completed.length;
    const pct = Math.round((completedCount / total) * 100);
    el.progressFill.style.width = pct + '%';
    el.progressText.textContent = pct + '%';
    el.progressPercent.textContent = pct + '%';
    el.topicCount.textContent = completedCount + '/' + total;
    if (completedCount >= total && isExamUnlocked(progress)) {
      el.topicViewer.style.display = 'none';
      el.allComplete.style.display = 'block';
      if (el.refBackToLearningBtn) el.refBackToLearningBtn.classList.remove('hidden');
    }
  }
}


function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

el.tvBackBtn.addEventListener('click', function() {
  if (currentTopicIndex > 0) showTopic(currentTopicIndex - 1);
});

el.tvNextBtn.addEventListener('click', function() {
  const progress = getStoredProgress();
  if (currentTopicIndex < topics.length - 1) {
    showTopic(currentTopicIndex + 1);
  } else if (progress.completed && progress.completed.length >= topics.length && isExamUnlocked(progress)) {
    el.topicViewer.style.display = 'none';
    el.allComplete.style.display = 'block';
    if (el.refBackToLearningBtn) el.refBackToLearningBtn.classList.remove('hidden');
    el.allComplete.scrollIntoView({ behavior: 'smooth' });
  } else {
    showToast('Please complete all topics, including the final topic, to unlock the exam.', 'info', 5000);
  }
});

el.finalExamBtn.addEventListener('click', function() {
  openExamLock();
});



function backToLearning() {
  el.examLockOverlay.classList.remove('active');
  el.resultsOverlay.classList.remove('active');
  el.certificateOverlay.classList.remove('active');
  document.body.style.overflow = '';
  el.dashboardContent.classList.remove('hidden');
  resetExamState();
  if (el.refBackToLearningBtn) el.refBackToLearningBtn.classList.add('hidden');
  if (!topics || topics.length === 0) {
    fetchTopics().then(function() {
      if (topics && topics.length > 0) {
        showLearningView();
      } else {
        renderLearning();
      }
    });
  } else {
    showLearningView();
  }
  el.learningSection.scrollIntoView({ behavior: 'smooth' });
}

el.backToLearningBtn.addEventListener('click', backToLearning);
el.refBackToLearningBtn.addEventListener('click', backToLearning);




const EXAM_COOLDOWN_MS = 25 * 60 * 60 * 1000;

async function saveExamFailTime(userId, ts) {
  try {
    const { data } = await supabase
      .from('update')
      .select('uset_update')
      .eq('id', userId)
      .maybeSingle();
    const ud = (data && data.uset_update && typeof data.uset_update === 'object') ? data.uset_update : {};
    ud.exam_failed_at = ts;
    const { error } = await supabase
      .from('update')
      .upsert({ id: userId, uset_update: ud });
    if (error) throw error;
  } catch (err) {
    console.error('saveExamFailTime error:', err);
  }
}

async function getExamFailTime(userId) {
  let cloudTs = 0;
  try {
    const { data } = await supabase
      .from('update')
      .select('uset_update')
      .eq('id', userId)
      .maybeSingle();
    if (data && data.uset_update && data.uset_update.exam_failed_at) {
      cloudTs = Number(data.uset_update.exam_failed_at) || 0;
    }
  } catch (err) {
    cloudTs = 0;
  }
  let localTs = 0;
  try {
    localTs = parseInt(localStorage.getItem('idt_exam_failed_' + userId), 10) || 0;
  } catch (e) {
    localTs = 0;
  }
  return Math.max(cloudTs, localTs);
}

function clearExamCooldownUi() {
  if (examCooldownInterval) {
    clearInterval(examCooldownInterval);
    examCooldownInterval = null;
  }
  el.cooldownDisplay.classList.add('hidden');
  el.startExamBtn.disabled = false;
  el.startExamBtn.innerHTML = '<i class="fas fa-play"></i> Start Exam Now';
}




async function openExamLock() {
  const u = getLocalUser();
  if (!u) return;
  const progress = getStoredProgress();
  if (!isExamUnlocked(progress)) {
    showToast('You must finish reading all topics, including the final topic, before the exam is unlocked.', 'warning', 6000);
    return;
  }
  clearExamCooldownUi();
  showLoading(true);
  const failTime = await getExamFailTime(u.id);
  showLoading(false);
  const diff = failTime + EXAM_COOLDOWN_MS - Date.now();
  if (failTime && diff > 0) {
    el.startExamBtn.disabled = true;
    el.cooldownDisplay.classList.remove('hidden');
    updateCooldownTimer(diff);
    examCooldownInterval = setInterval(function() {
      const rem = failTime + EXAM_COOLDOWN_MS - Date.now();
      if (rem <= 0) {
        clearExamCooldownUi();
        localStorage.removeItem('idt_exam_failed_' + u.id);
      } else {
        updateCooldownTimer(rem);
      }
    }, 1000);
  }
  el.examLockOverlay.classList.add('active');
}

el.startExamBtn.addEventListener('click', async function() {
  if (this.disabled) return;
  const progress = getStoredProgress();
  if (!isExamUnlocked(progress)) {
    el.examLockOverlay.classList.remove('active');
    showToast('You must complete all topics first.', 'warning');
    return;
  }

  const originalHtml = this.innerHTML;
  this.disabled = true;
  this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';

  showLoading(true);
  const camOk = await requireCamera();
  showLoading(false);

  if (!camOk) {
    this.disabled = false;
    this.innerHTML = originalHtml;
    showToast('Camera access is required before starting the exam. Please enable your camera and try again.', 'error', 6000);
    return;
  }

  const ok = await generateExamQuestions();

  this.disabled = false;
  this.innerHTML = originalHtml;

  if (!ok) {
    stopCamera();
    el.examLockOverlay.classList.add('active');
    return;
  }

  el.examLockOverlay.classList.remove('active');
  startExam();
});




function enableCamDrag() {
  const widget = el.camFloatingWidget;
  if (!widget) return;
  const handle = widget.querySelector('.cam-drag-handle');
  if (!handle) return;

  let isDragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

  function onPointerDown(e) {
    isDragging = true;
    const rect = widget.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    widget.style.right = 'auto';
    widget.style.left = rect.left + 'px';
    widget.style.top = rect.top + 'px';
    if (e.pointerId !== undefined && widget.setPointerCapture) {
      try { widget.setPointerCapture(e.pointerId); } catch (err) {}
    }
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let newLeft = startLeft + dx;
    let newTop = startTop + dy;
    const maxX = window.innerWidth - widget.offsetWidth;
    const maxY = window.innerHeight - widget.offsetHeight;
    if (newLeft < 0) newLeft = 0;
    if (newTop < 0) newTop = 0;
    if (newLeft > maxX) newLeft = maxX;
    if (newTop > maxY) newTop = maxY;
    widget.style.left = newLeft + 'px';
    widget.style.top = newTop + 'px';
  }

  function onPointerUp() {
    isDragging = false;
  }

  handle.addEventListener('pointerdown', onPointerDown);
  widget.addEventListener('pointermove', onPointerMove);
  widget.addEventListener('pointerup', onPointerUp);
  widget.addEventListener('pointercancel', onPointerUp);
}




async function requireCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
    camStream = stream;
    if (el.camVideo) el.camVideo.srcObject = stream;
    if (el.camFloatVideo) el.camFloatVideo.srcObject = stream;
    if (el.camFloatingWidget) {
      el.camFloatingWidget.classList.remove('hidden');
      el.camFloatingWidget.style.top = '70px';
      el.camFloatingWidget.style.right = '12px';
      el.camFloatingWidget.style.left = 'auto';
      enableCamDrag();
    }
    return true;
  } catch (err) {
    console.log('Camera not available or permission denied:', err.message);
    return false;
  }
}

function startExam() {
  if (!examQuestions || examQuestions.length === 0) {
    showToast('No questions were loaded. Please try again.', 'error');
    return;
  }
  examAnswers = new Array(examQuestions.length).fill(null);
  currentExamQ = 0;
  examTimeLeft = 7200;
  examStarted = true;
  screenSwitchCount = 0;

  const subjects = [...new Set(examQuestions.map(function(q) { return q.subject; }))];
  el.examSubjects.innerHTML = subjects.map(function(s) {
    return '<button class="es-btn' + (s === examQuestions[0].subject ? ' active' : '') + '" data-subject="' + escapeHtml(s) + '">' + escapeHtml(s) + '</button>';
  }).join('');

  renderExamQuestion(0);
  renderExamGrid();

  el.examScreen.classList.add('active');
  enableExamProtection();

  startExamTimer();

  document.addEventListener('keydown', examKeyHandler);
}


function startExamTimer() {
  if (examTimerInterval) clearInterval(examTimerInterval);
  examTimerInterval = setInterval(function() {
    examTimeLeft--;
    if (examTimeLeft <= 0) {
      clearInterval(examTimerInterval);
      examTimerInterval = null;
      showToast('Time is up! Your exam is being submitted automatically.', 'warning', 6000);
      showLoading(true);
      setTimeout(function() { submitExam(true); }, 800);
      return;
    }
    const h = Math.floor(examTimeLeft / 3600);
    const m = Math.floor((examTimeLeft % 3600) / 60);
    const s = examTimeLeft % 60;
    el.examTimerDisplay.textContent = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }, 1000);
}

function stopExamTimer() {
  if (examTimerInterval) {
    clearInterval(examTimerInterval);
    examTimerInterval = null;
  }
}

function examKeyHandler(e) {
  if (netPaused) return;
  const key = e.key.toUpperCase();
  if (key === 'A' || key === 'B' || key === 'C' || key === 'D') {
    const idx = key.charCodeAt(0) - 65;
    selectExamOption(idx);
  } else if (key === 'N') {
    goExamNext();
  } else if (key === 'P') {
    goExamPrev();
  } else if (key === 'S') {
    if (confirm('Submit exam? You cannot change answers after submission.')) submitExam();
  }
}



function renderExamQuestion(index) {
  const q = examQuestions[index];
  if (!q) return;
  currentExamQ = index;

  let subjectTotal = 0;
  let subjectFirst = 0;
  for (let i = 0; i < examQuestions.length; i++) {
    if (examQuestions[i].subject === q.subject) {
      subjectTotal++;
      if (subjectTotal === 1) subjectFirst = i;
    }
  }
  const numInSubject = index - subjectFirst + 1;
  const selected = examAnswers[index];

  el.examQNum.textContent = 'Question ' + numInSubject + ' of ' + subjectTotal + ' | ' + q.subject;
  el.examQText.textContent = q.text;
  el.examOptions.innerHTML = '';
  q.options.forEach(function(opt, oi) {
    const div = document.createElement('div');
    div.className = 'exam-option' + (selected === oi ? ' selected' : '');
    div.innerHTML = '<span class="opt-letter">' + String.fromCharCode(65 + oi) + '</span><span class="opt-text">' + escapeHtml(opt) + '</span>';
    div.addEventListener('click', function() { selectExamOption(oi); });
    el.examOptions.appendChild(div);
  });

  el.camQNum.textContent = 'Question ' + numInSubject + ' of ' + subjectTotal + ' | ' + q.subject;
  el.camQText.textContent = q.text;
  el.camOptions.innerHTML = '';
  q.options.forEach(function(opt, oi) {
    const div = document.createElement('div');
    div.className = 'exam-option' + (selected === oi ? ' selected' : '');
    div.innerHTML = '<span class="opt-letter">' + String.fromCharCode(65 + oi) + '</span><span class="opt-text">' + escapeHtml(opt) + '</span>';
    div.addEventListener('click', function() { selectExamOption(oi); });
    el.camOptions.appendChild(div);
  });

  renderExamGrid();
  $$('.es-btn', el.examSubjects).forEach(function(b) {
    b.classList.toggle('active', b.dataset.subject === q.subject);
  });
}

function selectExamOption(optIndex) {
  if (!examStarted || netPaused) return;
  examAnswers[currentExamQ] = optIndex;
  renderExamQuestion(currentExamQ);
}

function goExamPrev() {
  if (netPaused) return;
  if (currentExamQ > 0) renderExamQuestion(currentExamQ - 1);
}

function goExamNext() {
  if (netPaused) return;
  if (currentExamQ < examQuestions.length - 1) renderExamQuestion(currentExamQ + 1);
}

el.examPrevBtn.addEventListener('click', goExamPrev);
el.examNextBtn.addEventListener('click', goExamNext);
el.camPrevBtn.addEventListener('click', goExamPrev);
el.camNextBtn.addEventListener('click', goExamNext);

function renderExamGrid() {
  el.examQGrid.innerHTML = '';
  examQuestions.forEach(function(q, i) {
    const btn = document.createElement('button');
    btn.className = 'q-num-btn';
    if (i === currentExamQ) btn.classList.add('current');
    if (examAnswers[i] !== null && examAnswers[i] !== undefined) btn.classList.add('answered');
    btn.textContent = i + 1;
    btn.addEventListener('click', function() { if (!netPaused) renderExamQuestion(i); });
    el.examQGrid.appendChild(btn);
  });
}








let aiSecTimeout = null;

function showAiSecurityWarning() {
  const popup = document.getElementById('aiSecurityPopup');
  if (!popup) return;
  popup.classList.remove('show');
  void popup.offsetWidth;
  popup.classList.add('show');
  if (aiSecTimeout) clearTimeout(aiSecTimeout);
  aiSecTimeout = setTimeout(function() {
    popup.classList.remove('show');
  }, 2500);
}


function preventCopy(e) {
  e.preventDefault();
  e.stopPropagation();
  showAiSecurityWarning();
  return false;
}


function preventScreenshotAttempt() {
  showAiSecurityWarning();
}

function blockPrintScreen(e) {
  if (e.key === 'PrintScreen' || (e.key === 'Snapshot')) {
    e.preventDefault();
    try { navigator.clipboard.writeText(' '); } catch (err) {}
    showAiSecurityWarning();
  }
  if ((e.metaKey || e.ctrlKey || e.shiftKey) && (e.key === 'S' || e.key === 's' || e.key === 'P' || e.key === 'p' || e.key === '5') && examStarted) {
    if (e.shiftKey || e.metaKey) {
      e.preventDefault();
      showAiSecurityWarning();
    }
  }
}

function enableExamProtection() {
  document.body.classList.add('exam-no-copy');
  document.addEventListener('copy', preventCopy, true);
  document.addEventListener('cut', preventCopy, true);
  document.addEventListener('contextmenu', preventCopy, true);
  document.addEventListener('selectstart', preventCopy, true);
  document.addEventListener('keyup', blockPrintScreen, true);
  document.addEventListener('keydown', blockPrintScreen, true);
  document.addEventListener('visibilitychange', screenshotVisibilityGuard, true);
  window.addEventListener('blur', screenshotBlurGuard, true);
}

function screenshotVisibilityGuard() {
  if (!examStarted) return;
  if (document.hidden) preventScreenshotAttempt();
}

function screenshotBlurGuard() {
  if (!examStarted) return;
  if (!document.hidden) preventScreenshotAttempt();
}

function disableExamProtection() {
  document.body.classList.remove('exam-no-copy');
  document.removeEventListener('copy', preventCopy, true);
  document.removeEventListener('cut', preventCopy, true);
  document.removeEventListener('contextmenu', preventCopy, true);
  document.removeEventListener('selectstart', preventCopy, true);
  document.removeEventListener('keyup', blockPrintScreen, true);
  document.removeEventListener('keydown', blockPrintScreen, true);
  document.removeEventListener('visibilitychange', screenshotVisibilityGuard, true);
  window.removeEventListener('blur', screenshotBlurGuard, true);
}





function handleScreenSwitchAttempt() {
  if (!examStarted || netPaused) return;
  screenSwitchCount++;
  showToast('Warning: Do not switch screens or leave the exam window! (' + screenSwitchCount + ')', 'warning', 5000);
  if (el.examWarning && screenSwitchCount >= 3) {
    el.examWarning.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Suspicious activity detected (' + screenSwitchCount + ' screen switches). Your activity is being monitored.';
    el.examWarning.classList.remove('hidden');
  }
}

function pauseExamForNetwork() {
  if (!examStarted || netPaused) return;
  netPaused = true;
  stopExamTimer();

  netDeadline = Date.now() + 120000;
  el.netPauseOverlay.classList.add('active');
  el.netPauseTimer.classList.remove('hidden');
  el.netPauseLocked.classList.add('hidden');
  el.netPauseContinue.classList.add('hidden');
  showToast('Network connection lost. You have 2 minutes to reconnect.', 'warning', 6000);

  if (netCountdownInterval) clearInterval(netCountdownInterval);
  netCountdownInterval = setInterval(function() {
    const rem = netDeadline - Date.now();
    if (rem <= 0) {
      clearInterval(netCountdownInterval);
      netCountdownInterval = null;
      lockExamForNetwork();
      return;
    }
    const m = Math.floor(rem / 60000);
    const s = Math.floor((rem % 60000) / 1000);
    el.netPauseTimer.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }, 250);
}

function lockExamForNetwork() {
  el.netPauseTimer.classList.add('hidden');
  el.netPauseLocked.classList.remove('hidden');
  el.netPauseContinue.classList.remove('hidden');
  el.netPauseTimeLeft.textContent = el.examTimerDisplay.textContent;
}

function resumeExamFromNetwork() {
  if (netCountdownInterval) {
    clearInterval(netCountdownInterval);
    netCountdownInterval = null;
  }
  netPaused = false;
  el.netPauseOverlay.classList.remove('active');
  el.netPauseTimer.classList.remove('hidden');
  el.netPauseLocked.classList.add('hidden');
  el.netPauseContinue.classList.add('hidden');
  if (examStarted) {
    startExamTimer();
    showToast('Connection restored. Continuing from where you stopped.', 'success');
  }
}

el.netPauseContinue.addEventListener('click', function() {
  resumeExamFromNetwork();
});

window.addEventListener('online', function() {
  if (netPaused && netDeadline && Date.now() < netDeadline) {
    resumeExamFromNetwork();
  }
});

window.addEventListener('offline', function() {
  pauseExamForNetwork();
});

async function submitExam(auto) {
  if (!auto && !confirm('Are you sure you want to submit? You cannot change your answers after submission.')) return;
  examStarted = false;
  stopExamTimer();
  document.removeEventListener('keydown', examKeyHandler);
  disableExamProtection();
  stopCamera();
  el.examScreen.classList.remove('active');
  el.netPauseOverlay.classList.remove('active');
  if (netCountdownInterval) {
    clearInterval(netCountdownInterval);
    netCountdownInterval = null;
  }
  netPaused = false;

  showLoading(true);
  const u = getLocalUser();
  try {
    const res = await fetch('/api/jambai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_exam',
        user_id: u ? u.id : '',
        full_name: u ? u.full_name : '',
        email: u ? u.email : '',
        jambCourseId: u ? (u.jambCourseId || '') : '',
        jambCourseName: u ? (u.jambCourseName || '') : '',
        questions: examQuestions,
        answers: examAnswers,
        screen_switches: screenSwitchCount
      })
    });

    if (res.status !== 200) {
      const apiMsg = await readApiError(res);
      const errMsg = apiMsg ? apiMsg : 'HTTP ' + res.status;
      showLoading(false);
      showToast('Marking service issue (' + errMsg + '). Your exam was marked locally.', 'warning', 6000);
      const fallback = markLocally();
      showExamResults(fallback);
      saveExamToHistory(fallback);
      return;
    }

    const data = await res.json();
    showLoading(false);
    if (data.success) {
      showExamResults(data);
      saveExamToHistory(data);
    } else {
      const apiMsg = data && (data.error || data.message) ? (data.error || data.message) : 'Unknown server error';
      showToast('Marking service issue (' + apiMsg + '). Your exam was marked locally.', 'warning', 6000);
      const fallback = markLocally();
      showExamResults(fallback);
      saveExamToHistory(fallback);
    }
  } catch (err) {
    console.error('submitExam error:', err);
    showLoading(false);
    showToast('Network error while submitting. Your exam was marked locally.', 'warning', 6000);
    const fallback = markLocally();
    showExamResults(fallback);
    saveExamToHistory(fallback);
  }
}

function markLocally() {
  let correct = 0;
  const details = [];
  examQuestions.forEach(function(q, i) {
    const userAns = examAnswers[i];
    const isCorrect = userAns === q.correct;
    if (isCorrect) correct++;
    details.push({
      number: i + 1,
      subject: q.subject,
      question: q.text,
      options: q.options,
      correct: q.correct,
      user_answer: userAns,
      is_correct: isCorrect
    });
  });
  const total = examQuestions.length;
  const rawScore = correct * (400 / total);
  const finalScore = Math.round(rawScore);
  const passed = finalScore >= 200;
  return {
    success: true,
    score: finalScore,
    total: total,
    correct: correct,
    passed: passed,
    details: details,
    subjects: getSubjectScores(details)
  };
}

function getSubjectScores(details) {
  const map = {};
  details.forEach(function(d) {
    if (!map[d.subject]) map[d.subject] = { correct: 0, total: 0 };
    map[d.subject].total++;
    if (d.is_correct) map[d.subject].correct++;
  });
  return Object.keys(map).map(function(s) {
    return { subject: s, correct: map[s].correct, total: map[s].total };
  });
}



function showExamResults(data) {
  const passed = data.passed;
  const icon = passed ? 'pass' : 'fail';
  const iconChar = passed ? 'fas fa-trophy' : 'fas fa-times-circle';
  const statusText = passed ? 'Congratulations! You Passed!' : 'You did not pass this time.';
  const statusMsg = passed
    ? 'Well done! You scored above 200. Keep up the great work!'
    : 'You scored below 200. Review your topics and try again after 24 hours.';

  let subjectsHtml = '';
  if (data.subjects) {
    data.subjects.forEach(function(s) {
      const subPct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      subjectsHtml += '<div class="rc-score-item"><div class="rsi-subject">' + escapeHtml(s.subject) + '</div><div class="rsi-score">' + subPct + '</div><div class="rsi-mark">' + s.correct + '/' + s.total + ' correct</div></div>';
    });
  }

  let detailsHtml = '';
  if (data.details) {
    data.details.forEach(function(d) {
      const corr = d.is_correct ? 'correct' : 'wrong';
      const ic = d.is_correct ? 'fas fa-check' : 'fas fa-times';
      const userLetter = d.user_answer !== null && d.user_answer !== undefined ? String.fromCharCode(65 + d.user_answer) : 'N/A';
      const correctLetter = String.fromCharCode(65 + d.correct);
      detailsHtml += '<div class="rc-q-item"><div class="rq-icon ' + corr + '"><i class="' + ic + '"></i></div><div class="rq-detail"><div class="rq-question">Q' + d.number + ': ' + escapeHtml(String(d.question || '').substring(0, 80)) + (String(d.question || '').length > 80 ? '...' : '') + '</div><div class="rq-answer">Your answer: <span class="user-ans' + (d.is_correct ? '' : ' wrong') + '">' + userLetter + '</span> | Correct: <span class="correct-ans">' + correctLetter + '</span> | ' + escapeHtml(d.subject) + '</div></div></div>';
    });
  }

  el.resultsCard.innerHTML = '<div class="rc-header"><div class="rc-icon ' + icon + '"><i class="' + iconChar + '"></i></div><h2>' + statusText + '</h2><p>' + statusMsg + '</p></div><div class="rc-body"><div class="rc-total"><div class="rt-label">Your Score</div><div class="rt-score">' + data.score + '/400</div><div class="rt-status ' + icon + '">' + (passed ? 'PASS' : 'FAIL') + '</div></div><div class="rc-score-grid">' + subjectsHtml + '</div><h4 style="font-size:14px;font-weight:700;margin-bottom:10px;color:var(--ink)">Question Review</h4><div class="rc-questions">' + detailsHtml + '</div></div><div class="rc-footer"><button class="btn-rc-pdf" id="downloadPdfBtn"><i class="fas fa-file-pdf"></i> Download PDF</button><button class="btn-rc-ai" id="aiReviewBtn"><i class="fas fa-robot"></i> AI Review</button><button class="btn-rc-back" id="backToStudyBtn"><i class="fas fa-book-open"></i> Back to Study</button><button class="btn-rc-close" id="resultsCloseBtn"><i class="fas fa-xmark"></i> Close</button></div>';

  el.resultsOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';

 if (!passed) {
    const u = getLocalUser();
    if (u) {
      const failTs = Date.now();
      localStorage.setItem('idt_exam_failed_' + u.id, String(failTs));
      saveExamFailTime(u.id, failTs);
    }
  }

  $('#downloadPdfBtn').addEventListener('click', function() { downloadResultsPdf(data); });

  $('#aiReviewBtn').addEventListener('click', async function() {
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI is analyzing...';
    el.resultsOverlay.classList.remove('active');
    document.body.style.overflow = '';
    openAITutor('review', data);
    addAIMessage('bot', 'I am reviewing your exam results... please wait a moment.');
    el.aiSendBtn.disabled = true;

    let reviewText = '';
    try {
      const wrongDetails = (data.details || []).filter(function(d) { return !d.is_correct; }).slice(0, 30);
      const summary = wrongDetails.map(function(d) {
        const userLetter = d.user_answer !== null && d.user_answer !== undefined ? String.fromCharCode(65 + d.user_answer) : 'N/A';
        return 'Q' + d.number + ' (' + d.subject + '): "' + String(d.question || '').substring(0, 150) + '" — Student chose ' + userLetter + ', correct answer is ' + String.fromCharCode(65 + d.correct);
      }).join('\n');

      const res = await fetch('/api/jambai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          language: aiActiveLang,
          user_id: currentUser ? currentUser.id : '',
          full_name: currentUser ? currentUser.full_name : '',
          messages: [
            { role: 'system', content: 'You are a helpful JAMB tutor AI for IDT Academy. The student just completed a JAMB mock exam. Score: ' + data.score + '/400, ' + (data.passed ? 'PASSED' : 'FAILED') + '. Subject scores: ' + JSON.stringify(data.subjects || []) + '. Analyze the questions the student got wrong below. For each wrong question, explain briefly why the correct answer is right and what topic the student should study. Group explanations by subject. Be encouraging and clear.' },
            { role: 'user', content: 'Here are the questions I got wrong. Please explain each one and tell me what to study:\n' + summary }
          ]
        })
      });

      if (res.status === 200) {
        const rdata = await res.json();
        if (rdata.success && rdata.response) reviewText = rdata.response;
      }
    } catch (err) {
      console.error('AI review error:', err);
    }

    el.aiSendBtn.disabled = false;
    if (reviewText) {
      addAIMessage('bot', reviewText);
      aiContext.push({ role: 'assistant', content: reviewText });
    } else {
      addAIMessage('bot', 'I could not complete the full review right now. Please ask me directly about any question you got wrong — for example: "Explain question 5" — and I will help you.');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-robot"></i> AI Review';
  });

  $('#backToStudyBtn').addEventListener('click', function() {
    el.resultsOverlay.classList.remove('active');
    document.body.style.overflow = '';
    resetExamState();
    activateDashboardView();
  });

  $('#resultsCloseBtn').addEventListener('click', function() {
    el.resultsOverlay.classList.remove('active');
    document.body.style.overflow = '';
    resetExamState();
    if (passed) showCertificate(data);
  });
}


el.submitExamBtn.addEventListener('click', function() { submitExam(false); });

function saveExamToHistory(data) {
  const u = getLocalUser();
  if (!u) return;
  const history = JSON.parse(localStorage.getItem('idt_history_' + u.id) || '[]');
  history.unshift({
    date: new Date().toISOString(),
    score: data.score,
    total: data.total,
    correct: data.correct,
    passed: data.passed,
    details: data.details,
    subjects: data.subjects
  });
  if (history.length > 10) history.length = 10;
  localStorage.setItem('idt_history_' + u.id, JSON.stringify(history));
}


function resetExamState() {
  examQuestions = [];
  examAnswers = [];
  currentExamQ = 0;
  examTimeLeft = 7200;
  examStarted = false;
  screenSwitchCount = 0;
  if (examCooldownInterval) {
    clearInterval(examCooldownInterval);
    examCooldownInterval = null;
  }
}

function downloadResultsPdf(data) {
  const u = getLocalUser();
  const name = u ? u.full_name || 'Student' : 'Student';
  const dept = u ? u.jambCourseName || '' : '';
  const date = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

  const div = document.createElement('div');
  div.style.cssText = 'padding:30px;font-family:Poppins,sans-serif;max-width:800px;margin:0 auto';
  div.innerHTML = '<div style="text-align:center;margin-bottom:20px;display:flex;justify-content:center;align-items:center;gap:12px"><img src="https://i.imgur.com/2DY6OD4.png" style="height:40px"><span style="width:2px;height:32px;background:#006838;opacity:.3"></span><img src="https://i.imgur.com/oyqM5oF.png" style="height:40px"></div><h1 style="text-align:center;font-size:18px;color:#006838;margin-bottom:4px">IDT Academy JAMB Mock Exam Result</h1><p style="text-align:center;color:#6d6a8a;font-size:13px;margin-bottom:20px">' + date + '</p><div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd;font-size:14px"><span><strong>Name:</strong> ' + escapeHtml(name) + '</span><span><strong>Score:</strong> ' + data.score + '/400</span></div><div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd;font-size:14px"><span><strong>Department:</strong> ' + escapeHtml(dept) + '</span><span><strong>Status:</strong> ' + (data.passed ? 'PASS' : 'FAIL') + '</span></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin:20px 0">';
  if (data.subjects) {
    data.subjects.forEach(function(s) {
      const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      div.innerHTML += '<div style="text-align:center;padding:10px;background:#f8f6ff;border-radius:8px"><div style="font-size:12px;font-weight:700;color:#6d6a8a;text-transform:uppercase">' + escapeHtml(s.subject) + '</div><div style="font-size:20px;font-weight:800;color:#1e1b4b">' + pct + '</div><div style="font-size:11px;color:#6d6a8a">' + s.correct + '/' + s.total + '</div></div>';
    });
  }
  div.innerHTML += '</div><div style="text-align:center;padding:16px;background:linear-gradient(135deg,rgba(0,104,56,.06),rgba(124,58,237,.06));border-radius:12px;margin-bottom:20px"><div style="font-size:13px;color:#6d6a8a;font-weight:600;text-transform:uppercase">Total Score</div><div style="font-size:36px;font-weight:900;color:#1e1b4b">' + data.score + '/400</div><div style="font-size:15px;font-weight:700;color:' + (data.passed ? '#10b981' : '#f43f5e') + '">' + (data.passed ? 'PASS' : 'FAIL') + '</div></div>';
  if (data.details) {
    div.innerHTML += '<h3 style="font-size:14px;font-weight:700;margin-bottom:8px;color:#1e1b4b">Question Details</h3>';
    data.details.slice(0, 30).forEach(function(d) {
      const userLetter = d.user_answer !== null && d.user_answer !== undefined ? String.fromCharCode(65 + d.user_answer) : 'N/A';
      const correctLetter = String.fromCharCode(65 + d.correct);
      div.innerHTML += '<div style="padding:8px 12px;border:1px solid #e0e0e0;border-radius:6px;margin-bottom:6px;font-size:12px;display:flex;align-items:center;gap:8px"><span style="color:' + (d.is_correct ? '#10b981' : '#f43f5e') + '">' + (d.is_correct ? '&#10003;' : '&#10007;') + '</span><span><strong>Q' + d.number + ':</strong> ' + escapeHtml(String(d.question || '').substring(0, 60)) + '... | <span style="color:#6d6a8a">You: ' + userLetter + '</span> | <span style="color:#10b981">Correct: ' + correctLetter + '</span></span></div>';
    });
  }
  div.innerHTML += '<div style="text-align:center;margin-top:20px;padding:12px;border-top:1px solid #e0e0e0;font-size:11px;color:#6d6a8a"><img src="https://i.imgur.com/oyqM5oF.png" style="height:30px;margin:0 auto 6px"><p>Powered by IDT Academy — JAMB Preparation Platform</p></div>';

  const opt = { margin: [10, 10, 10, 10], filename: 'IDT_JAMB_Result_' + name.replace(/\s+/g, '_') + '.pdf', html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
  html2pdf().set(opt).from(div).save();
}

function showCertificate(data) {
  if (!data.passed) return;
  const u = getLocalUser();
  if (!u) return;
  const name = u.full_name || 'Student';
  const dept = u.jambCourseName || 'JAMB Preparation';
  const date = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

  let subjectsHtml = '';
  if (data.subjects) {
    data.subjects.forEach(function(s) {
      const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      subjectsHtml += '<div class="cs-item"><div class="cs-sub">' + escapeHtml(s.subject) + '</div><div class="cs-score">' + pct + '%</div></div>';
    });
  }

  el.certificateContent.innerHTML = '<div class="certificate" id="certPdfArea"><div class="cert-border"><div class="cert-top"><img src="https://i.imgur.com/2DY6OD4.png" alt="IDT Academy"><div class="cert-sep"></div><img src="https://i.imgur.com/oyqM5oF.png" alt="JAMB"></div><h1>Certificate of Completion</h1><h2>IDT Academy JAMB Preparation</h2><div class="cert-name">' + escapeHtml(name) + '</div><div class="cert-dept">' + escapeHtml(dept) + '</div><div class="cert-scores">' + subjectsHtml + '</div><div class="cert-total">' + data.score + '/400</div><div class="cert-total-label">Total Score</div><div class="cert-footer"><p>This certifies that the above-named candidate has successfully completed the IDT Academy JAMB Preparation Program and demonstrated proficiency in the required subjects.</p><p><strong>Date issued:</strong> ' + date + '</p><img src="https://i.imgur.com/z8HOr4D.png" alt="Signature" style="height:36px;width:auto;margin:10px auto"><p style="font-size:11px;color:#6d6a8a;margin-top:8px">Powered by IDT Academy — JAMB Preparation Platform</p></div></div></div>';

  el.certificateOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  $('#certDownloadBtn').addEventListener('click', function() {
    const opt = { margin: [10, 10, 10, 10], filename: 'IDT_JAMB_Certificate_' + name.replace(/\s+/g, '_') + '.pdf', html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from($('#certPdfArea')).save();
  });

  $('#certCloseBtn').addEventListener('click', function() {
    el.certificateOverlay.classList.remove('active');
    document.body.style.overflow = '';
  });
}



function stopCamera() {
  if (camStream) {
    camStream.getTracks().forEach(function(t) { t.stop(); });
    camStream = null;
  }
  if (el.camVideo) el.camVideo.srcObject = null;
  if (el.camFloatVideo) el.camFloatVideo.srcObject = null;
  if (el.camFloatingWidget) el.camFloatingWidget.classList.add('hidden');
  el.cameraOverlay.classList.remove('active');
}

el.backBtn.addEventListener('click', function() {
  window.location.href = 'index.html';
});

el.referralBadge.addEventListener('click', function() {
  window.location.href = 'referral.html';
});

el.referralPageBtn.addEventListener('click', function() {
  window.location.href = 'referral.html';
});

el.logoutBtn.addEventListener('click', function() {
  localStorage.removeItem('idt_user');
  window.location.href = 'jamb.html';
});


el.tvQuestionBtn.addEventListener('click', function() {
  const topic = topics && topics[currentTopicIndex] ? topics[currentTopicIndex] : null;
  if (!topic) {
    showToast('Please wait for the topic to finish loading, then try again.', 'warning', 5000);
    return;
  }
  openAITutor('question', null, topic);
});

el.tvExplainBtn.addEventListener('click', function() {
  const topic = topics && topics[currentTopicIndex] ? topics[currentTopicIndex] : null;
  if (!topic) {
    showToast('Please wait for the topic to finish loading, then try again.', 'warning', 5000);
    return;
  }
  openAITutor('explain', null, topic);
});




function openAITutor(mode, examData, topic) {
  if (!el.aiModalOverlay || !el.aiChatArea || !el.aiInput || !el.aiSendBtn) {
    showToast('AI tutor panel is not ready. Please refresh the page and try again.', 'error', 6000);
    return;
  }
  el.aiModalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  el.aiChatArea.innerHTML = '';
  aiContext = [];

  let msg = '';
  let sys = '';

  if (mode === 'review' && examData) {
    msg = 'Hello! I am your IDT Academy AI tutor. I have analyzed your exam results. Scroll down to see my full explanation of the questions you got wrong. You can also ask me about any specific question.';
    sys = 'You are a helpful JAMB tutor AI for IDT Academy. The user just completed a JAMB mock exam. Score: ' + examData.score + '/400, ' + (examData.passed ? 'passed' : 'failed') + '. Subject scores: ' + JSON.stringify(examData.subjects || []) + '. Wrong questions: ' + JSON.stringify((examData.details || []).filter(function(d) { return !d.is_correct; }).slice(0, 30)) + '. When asked, explain why the correct answers are right and what topics to study. Respond according to the language rules given in each request.';
  } else if (mode === 'question' && topic) {
    msg = 'Hello! I am your IDT Academy AI tutor. You can ask me any question about the topic "' + topic.title + '". What would you like to know?';
    sys = 'You are a helpful JAMB tutor AI. The user is studying the topic: ' + topic.title + '. Topic content: ' + (topic.text || '') + '. Help them understand the topic and answer their questions clearly.';
  } else if (mode === 'explain' && topic) {
    msg = 'Hello! I am your IDT Academy AI tutor. I will explain the topic "' + topic.title + '" in more detail. What specific part would you like me to explain?';
    sys = 'You are a helpful JAMB tutor AI. The user wants a detailed explanation of the topic: ' + topic.title + '. Topic content: ' + (topic.text || '') + '. Explain thoroughly with examples and relate to JAMB exam questions.';
  } else {
    msg = 'Hello! I am your IDT Academy AI tutor. How can I help you with your JAMB preparation today?';
    sys = 'You are a helpful JAMB tutor AI for IDT Academy. Help students prepare for JAMB exams. Answer questions, explain topics, and provide guidance.';
  }

  aiContext.push({ role: 'system', content: sys });
  addAIMessage('bot', msg);
  if (el.aiInput && el.aiInput.focus) {
    setTimeout(function() { el.aiInput.focus(); }, 150);
  }
}



function addAIMessage(type, text) {
  const div = document.createElement('div');
  div.className = 'ai-msg ' + type;
  const labelHtml = type === 'bot'
    ? '<span class="ai-msg-icon"><img src="https://i.imgur.com/DPrM9ZJ.png" alt="AI" style="width:22px;height:22px;border-radius:50%;vertical-align:middle;margin-right:6px"></span>AI Tutor'
    : 'You';
  div.innerHTML = '<div class="ai-msg-label">' + labelHtml + '</div><p>' + text.replace(/\n/g, '<br>') + '</p>';
  el.aiChatArea.appendChild(div);
  el.aiChatArea.scrollTop = el.aiChatArea.scrollHeight;
}

el.aiModalClose.addEventListener('click', function() {
  el.aiModalOverlay.classList.remove('active');
  document.body.style.overflow = '';
});

el.aiModalOverlay.addEventListener('click', function(e) {
  if (e.target === el.aiModalOverlay) {
    el.aiModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
});





$$('.ai-lang-select button', el.aiLangSelect).forEach(function(btn) {
  btn.addEventListener('click', function() {
    $$('.ai-lang-select button', el.aiLangSelect).forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    if (this.id === 'aiOtherLang') {
      requestOtherLanguage();
    } else {
      aiActiveLang = this.dataset.lang;
      showToast('Language set to ' + this.textContent.trim() + '.', 'success');
    }
  });
});

function requestOtherLanguage() {
  aiActiveLang = 'english';
  if (document.getElementById('langToastInput')) return;
  const t = document.createElement('div');
  t.className = 'toast info';
  t.innerHTML = '<span class="toast-icon"><i class="fas fa-language"></i></span><span class="toast-text">Enter your preferred language:</span><input type="text" class="lang-toast-input" id="langToastInput" placeholder="e.g. Fulfude, Tiv, Efik, Arabic"><button type="button" class="lang-toast-ok" id="langToastOk"><i class="fas fa-check"></i></button><button type="button" class="toast-close"><i class="fas fa-xmark"></i></button>';
  el.toastContainer.appendChild(t);
  const input = t.querySelector('#langToastInput');
  const ok = t.querySelector('#langToastOk');
  const closeBtn = t.querySelector('.toast-close');
  function apply() {
    const lang = (input.value || '').trim();
    if (lang) {
      aiActiveLang = 'english+' + lang;
      showToast('Language set to English + ' + lang + '.', 'success', 5000);
    } else {
      aiActiveLang = 'english';
      showToast('No language entered. Defaulting to English.', 'info', 5000);
    }
    removeToast(t);
  }
  ok.addEventListener('click', apply);
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') apply(); });
  closeBtn.addEventListener('click', function() { removeToast(t); });
  setTimeout(function() { if (input && input.parentNode) input.focus(); }, 100);
  setTimeout(function() {
    if (t.parentNode) removeToast(t);
  }, 30000);
}



async function sendAIMessage() {
  const text = el.aiInput.value.trim();
  if (!text) return;
  addAIMessage('user', text);
  el.aiInput.value = '';
  el.aiSendBtn.disabled = true;
  el.aiSendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    aiContext.push({ role: 'user', content: text });
    const res = await fetch('/api/jambai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        messages: aiContext,
        language: aiActiveLang,
        user_id: currentUser ? currentUser.id : '',
        full_name: currentUser ? currentUser.full_name : ''
      })
    });

    if (res.status !== 200) {
      const apiMsg = await readApiError(res);
      const errMsg = apiMsg ? apiMsg : 'HTTP ' + res.status;
      addAIMessage('bot', 'The AI tutor service reported a problem (' + errMsg + '). Please try again in a moment.');
      return;
    }

    const data = await res.json();
    if (data.success && data.response) {
      addAIMessage('bot', data.response);
      aiContext.push({ role: 'assistant', content: data.response });
    } else {
      const apiMsg = data && (data.error || data.message) ? (data.error || data.message) : 'Unknown service error';
      addAIMessage('bot', 'The AI tutor service reported a problem (' + apiMsg + '). Please try again or rephrase your question.');
    }
  } catch (err) {
    console.error('sendAIMessage error:', err);
    addAIMessage('bot', 'There was a network error. Please check your connection and try again.');
  } finally {
    el.aiSendBtn.disabled = false;
    el.aiSendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
  }
}



function initExamVisibilityGuards() {
  document.addEventListener('visibilitychange', function() {
    if (document.hidden && examStarted) {
      handleScreenSwitchAttempt();
    }
  });

  window.addEventListener('blur', function() {
    if (examStarted && !document.hidden) {
      handleScreenSwitchAttempt();
    }
  });

  window.addEventListener('beforeunload', function(e) {
    if (examStarted) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}


const csCloseBtn = $('#csCloseBtn');
if (csCloseBtn) {
  csCloseBtn.addEventListener('click', function() {
    el.courseSelectOverlay.classList.remove('active');
    if (el.deptLoading) el.deptLoading.classList.add('hidden');
  });
}

const examLockCloseBtn = $('#examLockCloseBtn');
if (examLockCloseBtn) {
  examLockCloseBtn.addEventListener('click', function() {
    el.examLockOverlay.classList.remove('active');
    clearExamCooldownUi();
  });
}

const netPauseCloseBtn = $('#netPauseCloseBtn');
if (netPauseCloseBtn) {
  netPauseCloseBtn.addEventListener('click', function() {
    if (netPaused && netDeadline && Date.now() >= netDeadline) {
      resumeExamFromNetwork();
    } else if (netPaused) {
      resumeExamFromNetwork();
    }
  });
}

el.aiSendBtn.addEventListener('click', function() {
  sendAIMessage();
});

el.aiInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAIMessage();
  }
});

window.addEventListener('popstate', function() {
  if (el.aiModalOverlay.classList.contains('active')) {
    el.aiModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  } else if (el.courseSelectOverlay.classList.contains('active')) {
    el.courseSelectOverlay.classList.remove('active');
    if (el.deptLoading) el.deptLoading.classList.add('hidden');
  } else if (el.examLockOverlay.classList.contains('active')) {
    el.examLockOverlay.classList.remove('active');
    clearExamCooldownUi();
  }
});


async function init() {
  showLoading(true);
  checkDevice();
  const u = getLocalUser();
  if (!u) {
    showLoading(false);
    window.location.href = 'jamb.html';
    return;
  }

  currentUser = u;
  userData = u;

  const profile = await fetchUserProfile(u.id);
  if (profile && profile.user_data) {
    const ud = profile.user_data;
    const courseFields = applyNewCourseFields(ud);

    if (ud.payment_no === 'yes') {
      const stored = Object.assign({}, u, ud, courseFields, { status: 'active', payment_no: 'yes' });
      setLocalUser(stored);
      currentUser = stored;
      userData = stored;
      activateDashboardView();
      await initDashboard();
      showLoading(false);
    } else {
      const stored = Object.assign({}, u, ud, courseFields, { payment_no: ud.payment_no || 'no', status: ud.status || 'pending' });
      setLocalUser(stored);
      currentUser = stored;
      userData = stored;
      if (el.dashboardContent) el.dashboardContent.classList.add('hidden');
      stopPaymentPolling();
      renderPayGet(stored);
      showLoading(false);
    }
  } else {
    const stored = Object.assign({}, u, applyNewCourseFields(u));
    setLocalUser(stored);
    currentUser = stored;
    userData = stored;
    if (stored.payment_no === 'yes') {
      activateDashboardView();
      await initDashboard();
    } else {
      if (el.dashboardContent) el.dashboardContent.classList.add('hidden');
      stopPaymentPolling();
      renderPayGet(stored);
    }
    showLoading(false);
  }

  initExamVisibilityGuards();
}
document.addEventListener('DOMContentLoaded', init);

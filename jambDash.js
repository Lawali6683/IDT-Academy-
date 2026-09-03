import { supabase } from './supabase.js';

const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

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
  cameraOverlay: $('#cameraOverlay'),
  camVideo: $('#camVideo'),
  examMainCam: $('#examMainCam'),
  camQNum: $('#camQNum'),
  camQText: $('#camQText'),
  camOptions: $('#camOptions'),
  camPrevBtn: $('#camPrevBtn'),
  camNextBtn: $('#camNextBtn'),
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
let aiActiveLang = 'english+hausa';

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

async function activateUser(profile) {
  try {
    const oldData = (profile && profile.user_data) || {};
    const merged = Object.assign({}, oldData, { status: 'active' });
    await supabase.from('user_profiles').update({ user_data: merged }).eq('id', profile.id);
    setLocalUser(Object.assign({}, getLocalUser() || {}, merged, { status: 'active' }));
  } catch (err) {
    const stored = getLocalUser();
    if (stored) { stored.status = 'active'; setLocalUser(stored); }
  }
  currentUser = getLocalUser();
  el.paymentOverlay.classList.remove('active');
  el.dashboardContent.classList.remove('hidden');
  showToast('Payment confirmed! Welcome to your dashboard.', 'success');
  initDashboard();
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
    if (ud.status === 'active') {
      const stored = getLocalUser();
      if (stored) { stored.status = 'active'; setLocalUser(stored); }
      currentUser = getLocalUser();
      el.paymentOverlay.classList.remove('active');
      el.dashboardContent.classList.remove('hidden');
      stopPaymentPolling();
      showToast('Payment confirmed! Welcome to your dashboard.', 'success');
      initDashboard();
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

function stopPaymentPolling() {
  if (statusCheckInterval) { clearInterval(statusCheckInterval); statusCheckInterval = null; }
  if (payTimerInterval) { clearInterval(payTimerInterval); payTimerInterval = null; }
}

function showPayError(message) {
  let banner = document.getElementById('payErrorBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'payErrorBanner';
    banner.style.cssText = 'margin:12px 0;padding:12px 14px;border-radius:12px;background:rgba(244,63,94,.08);border:1px solid rgba(244,63,94,.3);color:#f43f5e;font-size:13px;display:flex;align-items:center;gap:10px;flex-wrap:wrap';
    if (el.payAccountNumber && el.payAccountNumber.parentNode) {
      el.payAccountNumber.parentNode.insertBefore(banner, el.payAccountNumber.parentNode.firstChild);
    } else {
      el.paymentOverlay.appendChild(banner);
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

function startPaymentFlow() {
  el.paymentOverlay.classList.add('active');
  requestPaymentDetails();
  statusCheckInterval = setInterval(function() {
    const u = getLocalUser();
    if (u && u.id) {
      checkPaymentStatus(u.id).then(function(done) {
        if (done) { stopPaymentPolling(); }
      });
    }
  }, 10000);
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
        full_name: u.full_name,
        course_id: u.course_id || '',
        course_name: u.course_name || 'JAMB Preparation',
        price: 3500,
        phone: u.phone || ''
      })
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok || !data || !data.success) {
      const errMsg = (data && data.error) ? data.error : ('Payment service returned an error (HTTP ' + res.status + ').');
      showPayError('Could not generate payment details: ' + errMsg + ' Please tap "Try Again" — your reserved account number will appear here once the connection succeeds.');
      showToast('Could not generate payment details. Please try again.', 'error');
      return;
    }
    el.payAccountNumber.textContent = data.account_number || '---';
    el.payAccountName.textContent = data.account_name || 'IDT Academy';
    el.payBankName.textContent = data.bank_name || 'Wema Bank';
    el.payAmount.textContent = '₦' + Number(data.amount || 3500).toLocaleString();
    setupCopyButton();
    hidePayError();
    if (data.expires_at) {
      payExpiresAt = new Date(data.expires_at).getTime();
      startPayTimer();
    }
    showToast('Payment details generated. Transfer the exact amount to the account below.', 'success');
  } catch (err) {
    showPayError('Network error while contacting the payment service. Please check your internet connection and tap "Try Again".');
    showToast('Network error while fetching payment details.', 'error');
  }
}

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

async function initDashboard() {
  const u = getLocalUser();
  if (!u) { window.location.href = 'jamb.html'; return; }
  userData = u;
  currentUser = u;
  el.dashUserName.textContent = u.full_name || 'Student';
  el.dashUserDept.textContent = u.course_name || 'JAMB Student';
  el.welcomeName.textContent = u.full_name || 'Student';
  el.referralEarn.textContent = '₦' + (Number(u.referral_bonus) || 0).toFixed(2);
  await fetchTopics();
  renderLearning();
  fetchAds();
}

async function fetchTopics() {
  try {
    const { data, error } = await supabase
      .from('jamb_topics')
      .select('*');
    if (error) throw error;
    let all = [];
    (data || []).forEach(function(row) {
      const jd = row.jamb_data;
      if (Array.isArray(jd)) {
        all = all.concat(jd);
      } else if (jd && Array.isArray(jd.topics)) {
        all = all.concat(jd.topics);
      }
    });
    topics = all;
    topics.sort(function(a,b) { return (a.number || 0) - (b.number || 0); });
  } catch (err) {
    console.error('fetchTopics error:', err);
    topics = [];
  }
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
    return data || { current: 0, completed: [] };
  } catch(e) { return { current: 0, completed: [] }; }
}

function saveProgress(progress) {
  localStorage.setItem('idt_progress_' + (currentUser && currentUser.id ? currentUser.id : ''), JSON.stringify(progress));
}

function renderLearning() {
  if (!topics || topics.length === 0) {
    el.tvContent.innerHTML = '<p style="text-align:center;color:var(--muted);padding:30px">No topics available yet. Check back later.</p>';
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

  if (completedCount >= totalCount) {
    el.topicViewer.style.display = 'none';
    el.allComplete.style.display = 'block';
    return;
  }

  el.topicViewer.style.display = 'block';
  el.allComplete.style.display = 'none';

  let targetIdx = progress.current;
  if (targetIdx >= totalCount) targetIdx = totalCount - 1;
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
  el.tvNextBtn.disabled = index >= total - 1;

  const progress = getStoredProgress();
  if (!progress.completed) progress.completed = [];
  if (progress.completed.indexOf(topic.id) === -1) {
    progress.completed.push(topic.id);
    progress.current = index + 1;
    saveProgress(progress);
    renderLearning();
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
  } else {
    if (progress.completed && progress.completed.length >= topics.length) {
      el.topicViewer.style.display = 'none';
      el.allComplete.style.display = 'block';
    }
  }
});

el.finalExamBtn.addEventListener('click', function() {
  openExamLock();
});

async function openExamLock() {
  const u = getLocalUser();
  if (!u) return;
  const lastFailed = localStorage.getItem('idt_exam_failed_' + u.id);
  el.cooldownDisplay.classList.add('hidden');
  el.startExamBtn.disabled = false;
  el.startExamBtn.innerHTML = '<i class="fas fa-play"></i> Start Exam Now';
  if (lastFailed) {
    const failTime = parseInt(lastFailed, 10);
    const now = Date.now();
    const diff = failTime + 86400000 - now;
    if (diff > 0) {
      el.startExamBtn.disabled = true;
      el.cooldownDisplay.classList.remove('hidden');
      updateCooldownTimer(diff);
      const ci = setInterval(function() {
        const rem = failTime + 86400000 - Date.now();
        if (rem <= 0) {
          clearInterval(ci);
          el.cooldownDisplay.classList.add('hidden');
          el.startExamBtn.disabled = false;
          el.startExamBtn.innerHTML = '<i class="fas fa-play"></i> Start Exam Now';
          localStorage.removeItem('idt_exam_failed_' + u.id);
        } else {
          updateCooldownTimer(rem);
        }
      }, 1000);
    } else {
      localStorage.removeItem('idt_exam_failed_' + u.id);
    }
  }
  el.examLockOverlay.classList.add('active');
}

function updateCooldownTimer(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  el.cooldownTimer.textContent = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

el.startExamBtn.addEventListener('click', async function() {
  if (this.disabled) return;
  el.examLockOverlay.classList.remove('active');
  showLoading(true);
  await generateExamQuestions();
  showLoading(false);
  startExam();
});

async function generateExamQuestions() {
  const u = getLocalUser();
  if (!u) return;
  try {
    const res = await fetch('/api/jambai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate_exam',
        user_id: u.id,
        course_id: u.course_id || '',
        course_name: u.course_name || '',
        full_name: u.full_name || ''
      })
    });
    const data = await res.json();
    if (data.success && data.questions) {
      examQuestions = data.questions;
    } else {
      examQuestions = generateFallbackQuestions();
    }
  } catch (err) {
    console.error('generateExamQuestions error:', err);
    examQuestions = generateFallbackQuestions();
  }
}

function generateFallbackQuestions() {
  const qs = [];
  const subjects = getSubjectsForDepartment(userData && userData.course_id || '');
  const allSubjects = ['Use of English', ...subjects];
  const counts = [60, 40, 40, 40];
  let qNum = 0;
  allSubjects.forEach(function(subj, si) {
    const count = counts[si] || 40;
    for (let i = 0; i < count; i++) {
      qNum++;
      qs.push({
        id: 'q' + qNum,
        number: qNum,
        subject: subj,
        text: 'Sample ' + subj + ' question #' + (i + 1) + ': What is the correct answer?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: Math.floor(Math.random() * 4)
      });
    }
  });
  return qs;
}

function getSubjectsForDepartment(deptId) {
  const depts = [
    { id: 'eng_tech', subs: ['Physics', 'Chemistry', 'Mathematics'] },
    { id: 'medicine', subs: ['Biology', 'Chemistry', 'Physics'] },
    { id: 'cs_science', subs: ['Mathematics', 'Physics', 'Chemistry'] },
    { id: 'cs_mgmt', subs: ['Mathematics', 'Physics', 'Economics'] },
    { id: 'agric', subs: ['Chemistry', 'Biology', 'Physics'] },
    { id: 'architecture', subs: ['Mathematics', 'Physics', 'Chemistry'] },
    { id: 'bio_sciences', subs: ['Biology', 'Chemistry', 'Physics'] },
    { id: 'physical_sci', subs: ['Mathematics', 'Physics', 'Chemistry'] },
    { id: 'math_stats', subs: ['Mathematics', 'Physics', 'Chemistry'] },
    { id: 'food_sci', subs: ['Chemistry', 'Mathematics', 'Biology'] },
    { id: 'law', subs: ['Literature', 'Government', 'CRK'] },
    { id: 'mass_comm', subs: ['Literature', 'Government', 'Economics'] },
    { id: 'pol_sci', subs: ['Government', 'Economics', 'Literature'] },
    { id: 'sociology', subs: ['Government', 'Economics', 'Literature'] },
    { id: 'economics', subs: ['Mathematics', 'Economics', 'Government'] },
    { id: 'english_lang', subs: ['Literature', 'Government', 'Any Language'] },
    { id: 'history', subs: ['History', 'Literature', 'Government'] },
    { id: 'theatre', subs: ['Literature', 'Government', 'Fine Arts'] },
    { id: 'languages', subs: ['Language', 'Literature', 'Any Arts'] },
    { id: 'religious', subs: ['IRK', 'Government', 'Literature'] },
    { id: 'accounting', subs: ['Mathematics', 'Economics', 'Commerce'] },
    { id: 'business_admin', subs: ['Mathematics', 'Economics', 'Commerce'] },
    { id: 'marketing', subs: ['Mathematics', 'Economics', 'Commerce'] },
    { id: 'hr', subs: ['Mathematics', 'Economics', 'Government'] },
    { id: 'insurance', subs: ['Mathematics', 'Economics', 'Commerce'] },
    { id: 'estate', subs: ['Mathematics', 'Economics', 'Geography'] },
    { id: 'geography', subs: ['Geography', 'Mathematics', 'Economics'] },
    { id: 'edu_science', subs: ['Science', 'Mathematics', 'Chemistry'] },
    { id: 'edu_math', subs: ['Mathematics', 'Physics', 'Chemistry'] },
    { id: 'edu_english', subs: ['Literature', 'Government', 'Any Arts'] },
    { id: 'edu_econs', subs: ['Mathematics', 'Economics', 'Government'] },
    { id: 'primary_edu', subs: ['Arts', 'Social Science', 'Science'] },
    { id: 'mls', subs: ['Biology', 'Chemistry', 'Physics'] },
    { id: 'physio', subs: ['Biology', 'Chemistry', 'Physics'] },
    { id: 'public_health', subs: ['Biology', 'Chemistry', 'Physics'] },
    { id: 'veterinary', subs: ['Biology', 'Chemistry', 'Physics'] },
    { id: 'telecom', subs: ['Mathematics', 'Physics', 'Chemistry'] },
    { id: 'library', subs: ['Arts', 'Social Science', 'Science'] }
  ];
  const found = depts.find(function(d) { return d.id === deptId; });
  return found ? found.subs : ['Physics', 'Chemistry', 'Biology'];
}

function startExam() {
  if (!examQuestions || examQuestions.length === 0) {
    showToast('No questions generated. Please try again.', 'error');
    return;
  }
  examAnswers = new Array(examQuestions.length).fill(null);
  currentExamQ = 0;
  examTimeLeft = 7200;
  examStarted = true;

  const subjects = [...new Set(examQuestions.map(function(q) { return q.subject; }))];
  el.examSubjects.innerHTML = subjects.map(function(s) {
    return '<button class="es-btn' + (s === examQuestions[0].subject ? ' active' : '') + '" data-subject="' + escapeHtml(s) + '">' + escapeHtml(s) + '</button>';
  }).join('');

  renderExamQuestion(0);
  renderExamGrid();
  el.examScreen.classList.add('active');

  if (isMobile && subjects.length > 0) {
    startCamera();
  }

  if (examTimerInterval) clearInterval(examTimerInterval);
  examTimerInterval = setInterval(function() {
    examTimeLeft--;
    if (examTimeLeft <= 0) {
      clearInterval(examTimerInterval);
      submitExam(true);
      return;
    }
    const h = Math.floor(examTimeLeft / 3600);
    const m = Math.floor((examTimeLeft % 3600) / 60);
    const s = examTimeLeft % 60;
    el.examTimerDisplay.textContent = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }, 1000);

  document.addEventListener('keydown', examKeyHandler);
}

function examKeyHandler(e) {
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
  const num = index + 1;
  const total = examQuestions.length;
  const selected = examAnswers[index];

  el.examQNum.textContent = 'Question ' + num + ' of ' + total + ' | ' + q.subject;
  el.examQText.textContent = q.text;
  el.examOptions.innerHTML = '';
  q.options.forEach(function(opt, oi) {
    const div = document.createElement('div');
    div.className = 'exam-option' + (selected === oi ? ' selected' : '');
    div.innerHTML = '<span class="opt-letter">' + String.fromCharCode(65 + oi) + '</span><span class="opt-text">' + escapeHtml(opt) + '</span>';
    div.addEventListener('click', function() { selectExamOption(oi); });
    el.examOptions.appendChild(div);
  });

  el.camQNum.textContent = 'Question ' + num + ' of ' + total + ' | ' + q.subject;
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
  if (!examStarted) return;
  examAnswers[currentExamQ] = optIndex;
  renderExamQuestion(currentExamQ);
}

function goExamPrev() {
  if (currentExamQ > 0) renderExamQuestion(currentExamQ - 1);
}

function goExamNext() {
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
    btn.addEventListener('click', function() { renderExamQuestion(i); });
    el.examQGrid.appendChild(btn);
  });
}

async function submitExam(auto) {
  if (!auto && !confirm('Are you sure you want to submit? You cannot change your answers after submission.')) return;
  examStarted = false;
  if (examTimerInterval) clearInterval(examTimerInterval);
  document.removeEventListener('keydown', examKeyHandler);
  stopCamera();
  el.examScreen.classList.remove('active');

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
        course_id: u ? u.course_id : '',
        course_name: u ? u.course_name : '',
        questions: examQuestions,
        answers: examAnswers
      })
    });
    const data = await res.json();
    showLoading(false);
    if (data.success) {
      showExamResults(data);
      saveExamToHistory(data);
    } else {
      const fallback = markLocally();
      showExamResults(fallback);
      saveExamToHistory(fallback);
    }
  } catch (err) {
    showLoading(false);
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
    data.details.slice(0, 20).forEach(function(d) {
      const corr = d.is_correct ? 'correct' : 'wrong';
      const ic = d.is_correct ? 'fas fa-check' : 'fas fa-times';
      const userLetter = d.user_answer !== null && d.user_answer !== undefined ? String.fromCharCode(65 + d.user_answer) : 'N/A';
      const correctLetter = String.fromCharCode(65 + d.correct);
      detailsHtml += '<div class="rc-q-item"><div class="rq-icon ' + corr + '"><i class="' + ic + '"></i></div><div class="rq-detail"><div class="rq-question">Q' + d.number + ': ' + escapeHtml(String(d.question || '').substring(0, 80)) + (String(d.question || '').length > 80 ? '...' : '') + '</div><div class="rq-answer">Your answer: <span class="user-ans' + (d.is_correct ? '' : ' wrong') + '">' + userLetter + '</span> | Correct: <span class="correct-ans">' + correctLetter + '</span> | ' + escapeHtml(d.subject) + '</div></div></div>';
    });
    if (data.details.length > 20) {
      detailsHtml += '<div style="text-align:center;padding:10px;color:var(--muted);font-size:13px">Showing 20 of ' + data.details.length + ' questions</div>';
    }
  }

  el.resultsCard.innerHTML = '<div class="rc-header"><div class="rc-icon ' + icon + '"><i class="' + iconChar + '"></i></div><h2>' + statusText + '</h2><p>' + statusMsg + '</p></div><div class="rc-body"><div class="rc-total"><div class="rt-label">Your Score</div><div class="rt-score">' + data.score + '/400</div><div class="rt-status ' + icon + '">' + (passed ? 'PASS' : 'FAIL') + '</div></div><div class="rc-score-grid">' + subjectsHtml + '</div><h4 style="font-size:14px;font-weight:700;margin-bottom:10px;color:var(--ink)">Question Review</h4><div class="rc-questions">' + detailsHtml + '</div></div><div class="rc-footer"><button class="btn-rc-pdf" id="downloadPdfBtn"><i class="fas fa-file-pdf"></i> Download PDF</button><button class="btn-rc-ai" id="aiReviewBtn"><i class="fas fa-robot"></i> AI Review</button><button class="btn-rc-close" id="resultsCloseBtn"><i class="fas fa-xmark"></i> Close</button></div>';

  el.resultsOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  if (!passed) {
    const u = getLocalUser();
    if (u) localStorage.setItem('idt_exam_failed_' + u.id, String(Date.now()));
  }

  $('#downloadPdfBtn').addEventListener('click', function() { downloadResultsPdf(data); });
  $('#aiReviewBtn').addEventListener('click', function() {
    el.resultsOverlay.classList.remove('active');
    document.body.style.overflow = '';
    openAITutor('review', data);
  });
  $('#resultsCloseBtn').addEventListener('click', function() {
    el.resultsOverlay.classList.remove('active');
    document.body.style.overflow = '';
    if (passed) showCertificate(data);
  });
}

el.submitExamBtn.addEventListener('click', submitExam);

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

function downloadResultsPdf(data) {
  const u = getLocalUser();
  const name = u ? u.full_name || 'Student' : 'Student';
  const dept = u ? u.course_name || '' : '';
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
  const dept = u.course_name || 'JAMB Preparation';
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

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } } });
    camStream = stream;
    el.camVideo.srcObject = stream;
    el.cameraOverlay.classList.add('active');
    el.examScreen.classList.add('cam-active');
  } catch (err) {
    console.log('Camera not available or permission denied:', err.message);
  }
}

function stopCamera() {
  if (camStream) {
    camStream.getTracks().forEach(function(t) { t.stop(); });
    camStream = null;
  }
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
  const topic = topics[currentTopicIndex];
  if (!topic) return;
  openAITutor('question', null, topic);
});

el.tvExplainBtn.addEventListener('click', function() {
  const topic = topics[currentTopicIndex];
  if (!topic) return;
  openAITutor('explain', null, topic);
});

function openAITutor(mode, examData, topic) {
  el.aiModalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  el.aiChatArea.innerHTML = '';
  aiContext = [];

  let msg = '';
  if (mode === 'review' && examData) {
    msg = 'Hello! I am your IDT Academy AI tutor. I have reviewed your exam results. Would you like me to explain the questions you got wrong and help you improve? Please tell me which questions you want me to explain or ask me anything about your exam.';
    aiContext.push({ role: 'system', content: 'You are a helpful JAMB tutor AI. The user just completed a JAMB mock exam. Their score was ' + examData.score + '/400. They ' + (examData.passed ? 'passed' : 'failed') + '. Help them understand their mistakes and improve. Use the working language the user chooses.' });
  } else if (mode === 'question' && topic) {
    msg = 'Hello! I am your IDT Academy AI tutor. You can ask me any question about the topic "' + topic.title + '". I will explain it clearly in the language you prefer. What would you like to know?';
    aiContext.push({ role: 'system', content: 'You are a helpful JAMB tutor AI. The user is studying the topic: ' + topic.title + '. Topic content: ' + (topic.text || '') + '. Help them understand the topic, answer their questions, and provide clear explanations. Use the working language the user chooses.' });
  } else if (mode === 'explain' && topic) {
    msg = 'Hello! I am your IDT Academy AI tutor. I will explain the topic "' + topic.title + '" in more detail. I can use both English and your native language for better understanding. What specific part would you like me to explain?';
    aiContext.push({ role: 'system', content: 'You are a helpful JAMB tutor AI. The user wants a detailed explanation of the topic: ' + topic.title + '. Topic content: ' + (topic.text || '') + '. Explain thoroughly, give examples, and relate to JAMB exam questions. Use the working language the user chooses.' });
  } else {
    msg = 'Hello! I am your IDT Academy AI tutor. How can I help you with your JAMB preparation today?';
    aiContext.push({ role: 'system', content: 'You are a helpful JAMB tutor AI for IDT Academy. Help students prepare for JAMB exams. Answer questions, explain topics, and provide guidance. Use the working language the user chooses.' });
  }

  addAIMessage('bot', msg);
}

function addAIMessage(type, text) {
  const div = document.createElement('div');
  div.className = 'ai-msg ' + type;
  div.innerHTML = '<div class="ai-msg-label">' + (type === 'bot' ? 'AI Tutor' : 'You') + '</div><p>' + text.replace(/\n/g, '<br>') + '</p>';
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
      const lang = prompt('Enter your preferred language (e.g. Fulfude, Tiv, Efik):');
      if (lang) aiActiveLang = 'english+' + lang.trim().toLowerCase();
      else aiActiveLang = 'english+hausa';
    } else {
      aiActiveLang = this.dataset.lang;
    }
  });
});

el.aiSendBtn.addEventListener('click', sendAIMessage);
el.aiInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendAIMessage();
});

async function sendAIMessage() {
  const text = el.aiInput.value.trim();
  if (!text) return;
  addAIMessage('user', text);
  el.aiInput.value = '';
  el.aiSendBtn.disabled = true;
  el.aiSendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    aiContext.push({ role: 'user', content: text + ' (Please respond in ' + aiActiveLang + ' format: first in English, then in the selected language for key points)' });
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
    const data = await res.json();
    if (data.success && data.response) {
      addAIMessage('bot', data.response);
      aiContext.push({ role: 'assistant', content: data.response });
    } else {
      addAIMessage('bot', 'I apologize, I encountered an error. Please try again or rephrase your question.');
    }
  } catch (err) {
    addAIMessage('bot', 'I apologize, there was a network error. Please check your connection and try again.');
  } finally {
    el.aiSendBtn.disabled = false;
    el.aiSendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
  }
}

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
    if (ud.status === 'active') {
      setLocalUser(Object.assign({}, u, ud, { status: 'active' }));
      el.dashboardContent.classList.remove('hidden');
      await initDashboard();
      showLoading(false);
    } else if (ud.status === 'pending') {
      setLocalUser(Object.assign({}, u, ud, { status: 'pending' }));
      const paid = await checkPaymentStatus(u.id);
      if (paid) {
        el.dashboardContent.classList.remove('hidden');
        await initDashboard();
      } else {
        startPaymentFlow();
      }
      showLoading(false);
    } else {
      setLocalUser(Object.assign({}, u, ud));
      el.dashboardContent.classList.remove('hidden');
      await initDashboard();
      showLoading(false);
    }
  } else {
    el.dashboardContent.classList.remove('hidden');
    await initDashboard();
    showLoading(false);
  }

  document.addEventListener('visibilitychange', function() {
    if (document.hidden && examStarted) {
      showToast('Warning: Do not leave the exam screen!', 'warning');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

window.addEventListener('beforeunload', function(e) {
  if (examStarted) {
    e.preventDefault();
    e.returnValue = '';
  }
});
import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);
const toastWrap = $('toastWrap');

const EXAM_SECONDS = 3600;
const PAGE_SIZE = 3;
const RETRY_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FLAGS = 5;

let user = null;
let profileData = null;
let userData = null;
let activeCourseId = '';
let topics = [];
let examQuestions = [];
let answers = [];
let currentPage = 0;
let secondsLeft = EXAM_SECONDS;
let timer = null;
let flags = 0;
let stream = null;
let examId = '';
let timedOutFlag = false;
let submitting = false;
let resultData = null;
let history = [];
let viewData = null;
let rawExplain = '';
let courseRow = null;

function showLoading() {
  let loader = document.getElementById('idt-loader-2');
  if (loader) {
    loader.classList.remove('idt-hide');
  } else {
    const loaderHTML = `
      <div class="idt-loader-2" id="idt-loader-2">
        <div class="i2-bg">
          <span class="i2-blob i2-b1"></span>
          <span class="i2-blob i2-b2"></span>
          <span class="i2-blob i2-b3"></span>
          <span class="i2-glow"></span>
          <span class="i2-grid"></span>
          <span class="i2-star i2-s1"></span><span class="i2-star i2-s2"></span>
          <span class="i2-star i2-s3"></span><span class="i2-star i2-s4"></span>
          <span class="i2-star i2-s5"></span><span class="i2-star i2-s6"></span>
          <span class="i2-star i2-s7"></span><span class="i2-star i2-s8"></span>
          <span class="i2-star i2-s9"></span><span class="i2-star i2-s10"></span>
          <span class="i2-star i2-s11"></span><span class="i2-star i2-s12"></span>
        </div>
        <div class="i2-wrap">
          <div class="i2-bookwrap">
            <span class="i2-orbit"></span>
            <div class="i2-book">
              <div class="i2-cover i2-cl"><img src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy" class="i2-coverlogo"></div>
              <div class="i2-cover i2-cr"><img src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy" class="i2-coverlogo i2-crlogo"></div>
              <div class="i2-page i2-p1"><i></i><i></i><i></i><i></i></div>
              <div class="i2-page i2-p2"><i></i><i></i></div>
              <div class="i2-page i2-p3"><i></i><i></i></div>
              <div class="i2-spine"></div>
              <div class="i2-ribbon"></div>
            </div>
          </div>
          <span class="i2-title">IDT <b>Academy</b></span>
          <span class="i2-tagline">Learn Beyond Limits</span>
          <div class="i2-loadbar"><span></span></div>
          <p class="i2-status">Turning pages... <b id="i2num">0</b>%</p>
        </div>
      </div>
      <style>
        .idt-loader-2{position:fixed;inset:0;z-index:99999;background:#05060f;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;transition:opacity .6s ease,visibility .6s ease;overflow:hidden;user-select:none}
        .idt-loader-2.idt-hide{opacity:0;visibility:hidden;pointer-events:none}
        .i2-bg{position:absolute;inset:0;overflow:hidden}
        .i2-blob{position:absolute;border-radius:50%;filter:blur(75px);opacity:.5}
        .i2-b1{width:420px;height:420px;left:-130px;top:-130px;background:#7c3aed;animation:i2drift1 14s ease-in-out infinite}
        .i2-b2{width:380px;height:380px;right:-110px;top:18%;background:#0ea5e9;animation:i2drift2 17s ease-in-out infinite}
        .i2-b3{width:320px;height:320px;left:32%;bottom:-150px;background:#f59e0b;opacity:.3;animation:i2drift3 19s ease-in-out infinite}
        @keyframes i2drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(90px,70px) scale(1.18)}}
        @keyframes i2drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-80px,60px) scale(1.12)}}
        @keyframes i2drift3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(60px,-70px) scale(1.2)}}
        .i2-glow{position:absolute;left:50%;top:50%;width:620px;height:620px;transform:translate(-50%,-50%);border-radius:50%;background:conic-gradient(from 0deg,transparent,rgba(124,92,255,.22),transparent 30%,rgba(34,211,238,.18),transparent 60%,rgba(251,191,36,.16),transparent);filter:blur(55px);animation:i2spin 11s linear infinite}
        .i2-grid{position:absolute;left:-60%;right:-60%;bottom:-8%;height:42%;background-image:linear-gradient(rgba(124,92,255,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(124,92,255,.16) 1px,transparent 1px);background-size:46px 46px;transform:perspective(420px) rotateX(60deg);transform-origin:bottom;animation:i2gridmove 3.4s linear infinite;-webkit-mask-image:linear-gradient(to top,rgba(0,0,0,.9),transparent);mask-image:linear-gradient(to top,rgba(0,0,0,.9),transparent)}
        @keyframes i2gridmove{to{background-position-y:46px}}
        .i2-star{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;animation:i2twinkle 3.2s ease-in-out infinite}
        .i2-s1{left:10%;top:16%}.i2-s2{left:82%;top:10%;animation-delay:.7s}.i2-s3{left:24%;top:78%;animation-delay:1.2s}
        .i2-s4{left:70%;top:80%;animation-delay:1.8s}.i2-s5{left:45%;top:6%;animation-delay:.4s}.i2-s6{left:6%;top:48%;animation-delay:2.2s}
        .i2-s7{left:92%;top:42%;animation-delay:1.5s}.i2-s8{left:58%;top:90%;animation-delay:.9s}.i2-s9{left:34%;top:24%;animation-delay:2.6s}
        .i2-s10{left:66%;top:30%;animation-delay:.2s}.i2-s11{left:16%;top:60%;animation-delay:1.9s}.i2-s12{left:88%;top:66%;animation-delay:2.9s}
        @keyframes i2twinkle{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:1;transform:scale(1.25)}}
        .i2-wrap{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center}
        .i2-bookwrap{position:relative;width:240px;height:240px;display:flex;align-items:center;justify-content:center}
        .i2-orbit{position:absolute;left:50%;top:50%;width:226px;height:226px;margin:-113px 0 0 -113px;border:1px dashed rgba(167,139,250,.35);border-radius:50%;animation:i2spin 8s linear infinite;pointer-events:none}
        .i2-orbit::before{content:"";position:absolute;top:-4px;left:50%;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:#fbbf24;box-shadow:0 0 14px #fbbf24}
        @keyframes i2spin{to{transform:rotate(360deg)}}
        .i2-book{position:relative;width:180px;height:126px;perspective:800px;animation:i2float 3.6s ease-in-out infinite;filter:drop-shadow(0 24px 40px rgba(124,92,255,.3))}
        @keyframes i2float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .i2-cover{position:absolute;top:0;width:50%;height:100%;background:linear-gradient(180deg,#8b5cf6,#6d28d9);box-shadow:0 14px 30px rgba(0,0,0,.35)}
        .i2-cl{left:0;border-radius:6px 2px 2px 6px;transform-origin:right center;animation:i2sway 3.6s ease-in-out infinite;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#a78bfa 0%,#8b5cf6 45%,#6d28d9 100%)}
        .i2-cr{right:0;border-radius:2px 6px 6px 2px;transform-origin:left center;background:linear-gradient(145deg,#7c3aed 0%,#6d28d9 50%,#4c1d95 100%);animation:i2sway 3.6s ease-in-out infinite reverse;display:flex;align-items:center;justify-content:center}
        @keyframes i2sway{0%,100%{transform:rotateY(0)}50%{transform:rotateY(16deg)}}
        .i2-coverlogo{width:48px;height:48px;object-fit:contain;background:#fff;border-radius:50%;padding:7px;box-shadow:0 6px 18px rgba(0,0,0,.4),0 0 0 2px rgba(255,255,255,.25)}
        .i2-crlogo{width:42px;height:42px;opacity:.85}
        .i2-page{position:absolute;top:5px;left:50%;width:46%;height:92%;background:linear-gradient(180deg,#f8fafc,#e2e8f0);border-radius:2px 6px 6px 2px;transform-origin:left center;box-shadow:0 0 16px rgba(0,0,0,.3);display:flex;flex-direction:column;padding-top:8px}
        .i2-page i{display:block;height:2px;border-radius:2px;background:#cbd5e1;margin:5px 10px}
        .i2-page i:nth-child(2){width:78%;background:#c4b5fd}
        .i2-page i:nth-child(3){width:60%}
        .i2-page i:nth-child(4){width:86%;background:#a5f3fc}
        .i2-p1{z-index:3;animation:i2flip 3.6s ease-in-out infinite}
        .i2-p2{z-index:2;animation:i2flip 3.6s ease-in-out 1.2s infinite}
        .i2-p3{z-index:1;animation:i2flip 3.6s ease-in-out 2.4s infinite}
        @keyframes i2flip{0%{transform:rotateY(0)}40%{transform:rotateY(-160deg)}70%,100%{transform:rotateY(0)}}
        .i2-spine{position:absolute;left:50%;top:0;bottom:0;width:9px;margin-left:-4.5px;background:linear-gradient(90deg,rgba(0,0,0,.45),rgba(0,0,0,.05) 50%,rgba(0,0,0,.45));border-radius:4px;z-index:4}
        .i2-ribbon{position:absolute;left:50%;bottom:-24px;width:13px;height:24px;margin-left:-6.5px;background:linear-gradient(180deg,#fbbf24,#d97706);border-radius:0 0 7px 7px;transform-origin:top center;z-index:5;animation:i2dangle 3.6s ease-in-out infinite;box-shadow:0 6px 14px rgba(217,119,6,.45)}
        @keyframes i2dangle{0%,100%{transform:rotate(0)}50%{transform:rotate(12deg)}}
        .i2-title{margin-top:18px;font-size:27px;font-weight:800;letter-spacing:5px;text-transform:uppercase;background:linear-gradient(90deg,#f8fafc 0%,#a78bfa 30%,#22d3ee 55%,#fbbf24 80%,#f8fafc 100%);background-size:220% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:i2shine 4s linear infinite}
        .i2-title b{font-weight:900}
        @keyframes i2shine{to{background-position:220% center}}
        .i2-tagline{margin-top:9px;font-size:11px;letter-spacing:7px;color:#8b93c7;text-transform:uppercase}
        .i2-loadbar{width:230px;height:4px;border-radius:4px;background:rgba(255,255,255,.09);margin-top:24px;overflow:hidden}
        .i2-loadbar span{display:block;height:100%;width:100%;border-radius:4px;background:linear-gradient(90deg,#7c3aed,#22d3ee,#fbbf24);transform-origin:left;animation:i2fill 2.8s ease-in-out forwards}
        @keyframes i2fill{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
        .i2-status{margin-top:13px;font-size:12px;letter-spacing:3px;color:#94a3b8;text-transform:uppercase;animation:i2fade 2.4s ease-in-out infinite}
        .i2-status b{color:#fbbf24}
        @keyframes i2fade{0%,100%{opacity:.45}50%{opacity:1}}
      </style>
    `;
    document.body.insertAdjacentHTML('beforeend', loaderHTML);
  }
  var n = document.getElementById('i2num');
  var c = 0;
  if (window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
  window.idtLoaderInterval = setInterval(function(){
    c += 5;
    if(n) n.textContent = (c >= 100 ? 100 : c);
    if(c >= 100) clearInterval(window.idtLoaderInterval);
  }, 30);
}

function hideLoading() {
  var l = document.getElementById('idt-loader-2');
  if (window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
  if (l) l.classList.add('idt-hide');
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function removeToast(el) {
  el.classList.add('out');
  setTimeout(() => el.remove(), 320);
}

function showToast(type, title, message, raw) {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const rawHtml = raw ? '<small class="toast-raw"><i class="fa-solid fa-bug"></i> ' + escapeHtml(raw) + '</small>' : '';
  el.innerHTML = '<i class="fa-solid ' + icons[type] + '"></i>' +
    '<div class="toast-body"><b>' + escapeHtml(title) + '</b><p>' + escapeHtml(message) + '</p>' + rawHtml + '</div>' +
    '<button class="toast-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  el.querySelector('.toast-x').addEventListener('click', () => removeToast(el));
  toastWrap.appendChild(el);
  if (type === 'success') {
    setTimeout(() => removeToast(el), 3600);
  }
  return el;
}

function miniLoad(text) {
  $('miniLoaderText').textContent = text || 'Please wait...';
  $('miniLoader').classList.add('open');
}

function miniHide() {
  $('miniLoader').classList.remove('open');
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

function formatDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return h + 'h ' + m + 'm ' + sec + 's';
  if (m > 0) return m + 'm ' + sec + 's';
  return sec + 's';
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function apiPost(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data && data.error) || 'Request failed');
  }
  return data;
}

async function fetchProfile() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Profile not found');
  profileData = data;
  userData = data.user_data || {};
}

async function saveUserData() {
  const { error } = await supabase
    .from('user_profiles')
    .update({ user_data: userData })
    .eq('id', user.id);
  if (error) throw error;
}

async function loadCourse(courseId) {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();
    if (!error && data) {
      courseRow = data;
    }
  } catch (err) {
    courseRow = null;
  }
}

async function loadTopics(courseId) {
  const { data, error } = await supabase
    .from('all_couse_post')
    .select('*')
    .eq('id', courseId)
    .maybeSingle();
  if (error) throw error;
  if (data && data.all_course) {
    if (Array.isArray(data.all_course)) {
      topics = data.all_course;
    } else if (Array.isArray(data.all_course.topics)) {
      topics = data.all_course.topics;
    } else {
      topics = [];
    }
  } else {
    topics = [];
  }
}

function examState() {
  const arr = Array.isArray(userData.exam_data) ? userData.exam_data : [];
  if (arr.some((a) => a.passed === true)) return 'passed';
  const last = arr.length ? arr[arr.length - 1] : null;
  if (last && last.passed !== true) {
    const d = new Date(last.date || 0).getTime();
    if (!isNaN(d)) {
      const remain = d + RETRY_MS - Date.now();
      if (remain > 0) return 'locked:' + remain;
    }
  }
  return 'ready';
}

function courseImage() {
  const info = (courseRow && courseRow.course_data) || {};
  return info.image_url || (courseRow && courseRow.image_url) || 'https://i.imgur.com/oyqM5oF.png';
}

function renderIntro() {
  const courseName = (userData && userData.course_name) || 'Course';
  const studentName = (userData && userData.full_name) || 'Student';
  const courseNumber = (userData && userData.course_number) || '000';
  $('introCourseName').textContent = courseName;
  $('introStudentName').textContent = studentName;
  $('introCourseNumber').textContent = courseNumber;
  $('introCourseImg').src = courseImage();
  $('introTitle').textContent = 'Final Exam';
  $('introSubtitle').textContent = courseName + ' • Pass with 70% to earn your certificate';
  const state = examState();
  const badge = $('introBadge');
  const startWrap = $('startExamWrap');
  const lock = $('retryLock');
  if (state === 'passed') {
    badge.className = 'badge green';
    badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Passed';
    lock.classList.add('hidden');
    startWrap.classList.remove('hidden');
    startWrap.innerHTML = '<button class="btn btn-green" id="btnGoCertificateTop"><i class="fa-solid fa-award"></i> View Certificate</button>';
    const topCert = $('btnGoCertificateTop');
    if (topCert) {
      topCert.addEventListener('click', () => {
        window.location.href = 'certificate.html?user_id=' + encodeURIComponent(user.id) + '&course_id=' + encodeURIComponent(activeCourseId);
      });
    }
    return;
  }
  if (state.indexOf('locked:') === 0) {
    const remain = Number(state.split(':')[1] || 0);
    badge.className = 'badge rose';
    badge.innerHTML = '<i class="fa-solid fa-lock"></i> Locked';
    lock.classList.remove('hidden');
    $('retryLockTitle').textContent = 'Exam Locked';
    $('retryLockMsg').textContent = 'Your last attempt did not pass. You can retry in ' + formatDuration(remain) + '. Keep reading your notes and come back.';
    startWrap.classList.add('hidden');
    return;
  }
  badge.className = 'badge violet';
  badge.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> Ready';
  lock.classList.add('hidden');
  startWrap.classList.remove('hidden');
  startWrap.innerHTML = '<button class="btn btn-primary" id="btnStartExam"><i class="fa-solid fa-play"></i> Start Exam</button>';
  const startBtn = $('btnStartExam');
  if (startBtn) {
    startBtn.addEventListener('click', startExam);
  }
}

function renderHistory() {
  history = Array.isArray(userData.exam_data) ? userData.exam_data.slice().reverse() : [];
  const body = $('histTableBody');
  const empty = $('histEmpty');
  if (!history.length) {
    body.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.innerHTML = history.map((h, i) => {
    const passed = h.passed === true;
    const badge = passed
      ? '<span class="badge green"><i class="fa-solid fa-circle-check"></i> Passed</span>'
      : '<span class="badge rose"><i class="fa-solid fa-circle-xmark"></i> Failed</span>';
    return '<tr>' +
      '<td>' + escapeHtml(formatDate(h.date)) + '</td>' +
      '<td><b>' + Number(h.score || 0).toFixed(1) + ' / 100</b></td>' +
      '<td>' + badge + '</td>' +
      '<td><button class="btn-view" data-view="' + i + '"><i class="fa-solid fa-eye"></i> View Exam</button></td>' +
      '</tr>';
  }).join('');
}

async function init() {
  const raw = localStorage.getItem('idt_user');
  if (!raw) {
    window.location.replace('register.html');
    return;
  }
  try {
    user = JSON.parse(raw);
  } catch (e) {
    localStorage.removeItem('idt_user');
    window.location.replace('register.html');
    return;
  }
  if (!user || !user.id) {
    localStorage.removeItem('idt_user');
    window.location.replace('register.html');
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const cid = params.get('course_id') || user.course_id || '';
  const uid = params.get('user_id') || user.id || '';
  if (uid) user.id = uid;
  activeCourseId = cid;
  showLoading();
  try {
    await fetchProfile();
    if (!activeCourseId) throw new Error('No course linked to your account');
    await Promise.all([loadCourse(activeCourseId), loadTopics(activeCourseId)]);
    renderIntro();
    renderHistory();
    hideLoading();
    if (!topics.length) {
      showToast('info', 'No Topics Yet', 'The topics for this course are not ready. Please check back soon.', '');
    }
  } catch (err) {
    hideLoading();
    showToast('error', 'Exam Error', 'Could not load your exam.', err.message || String(err));
  }
}

async function startExam() {
  const state = examState();
  if (state.indexOf('locked:') === 0) {
    showToast('error', 'Exam Locked', 'You can retry your exam after 7 days.', '');
    return;
  }
  if (state === 'passed') {
    showToast('info', 'Already Passed', 'You already passed this exam. Go to your certificate.', '');
    return;
  }
  if (!topics.length) {
    showToast('error', 'No Topics', 'No course topics found. Please contact support.', '');
    return;
  }
  miniLoad('Preparing your exam questions...');
  try {
    const payload = {
      user_id: user.id,
      course_id: activeCourseId,
      course_name: (userData && userData.course_name) || '',
      language: (userData && userData.preferred_lang) || 'English',
      topics: topics.map((t) => ({
        topic_name: t.topic_name || '',
        topic_text: String(t.topic_text || '').slice(0, 1500)
      }))
    };
    const res = await apiPost('/examai', payload);
    const qs = res.questions || [];
    if (qs.length !== 60) throw new Error('Expected 60 questions but got ' + qs.length);
    examQuestions = qs;
    answers = qs.map(() => '');
    examId = res.exam_id || ('ex_' + Date.now().toString(36));
    flags = 0;
    secondsLeft = EXAM_SECONDS;
    currentPage = 0;
    timedOutFlag = false;
    submitting = false;
    $('examIntro').classList.add('hidden');
    $('examResult').classList.add('hidden');
    $('examActive').classList.remove('hidden');
    const camOk = await startCamera();
    if (!camOk) {
      $('examCamLock').classList.remove('hidden');
      $('examCamLockTitle').textContent = 'Camera Unavailable';
      $('examCamLockMsg').textContent = 'We could not start your camera. You can continue, but this exam will be flagged for review.';
    }
    renderPage();
    startTimer();
    attachAntiCheat();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    miniHide();
    showToast('info', 'Exam Started', 'Good luck! You have 1 hour. Stay on this page.');
  } catch (err) {
    miniHide();
    showToast('error', 'Exam Failed', 'Could not prepare your exam. Please try again.', err.message || String(err));
  }
}

async function startCamera() {
  const video = $('examCam');
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera not supported');
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 360 } },
      audio: false
    });
    video.srcObject = stream;
    await video.play().catch(() => {});
    return true;
  } catch (err) {
    return false;
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  const video = $('examCam');
  if (video && video.srcObject) {
    video.srcObject = null;
  }
}

function updateProgress() {
  const total = examQuestions.length;
  const answered = answers.filter((a) => String(a || '').trim() !== '').length;
  $('examQCount').textContent = answered + ' / ' + total + ' answered';
  $('examProgressFill').style.width = total ? Math.round((answered / total) * 100) + '%' : '0%';
}

function renderPage() {
  if (!examQuestions.length) return;
  const start = currentPage * PAGE_SIZE;
  const pageQs = examQuestions.slice(start, start + PAGE_SIZE);
  const total = examQuestions.length;
  const isLast = start + PAGE_SIZE >= total;
  const card = $('questionCard');
  let html = '';
  pageQs.forEach((q, pi) => {
    const qi = start + pi;
    const num = qi + 1;
    const isMcq = String(q.type) !== 'write';
    const opts = Array.isArray(q.options) ? q.options : [];
    const marks = isMcq ? '1.5' : '2.5';
    html += '<div class="question-card">' +
      '<div class="q-head">' +
      '<span class="q-num"><i class="fa-solid fa-circle-question"></i> Question ' + num + ' of 60</span>' +
      '<span class="q-marks ' + (isMcq ? 'mcq' : 'write') + '"><i class="fa-solid fa-' + (isMcq ? 'list-check' : 'pen') + '"></i> ' + marks + ' Marks</span>' +
      '</div>' +
      '<div class="q-text">' + escapeHtml(q.question || '') + '</div>';
    if (isMcq && opts.length) {
      const letters = ['A', 'B', 'C', 'D'];
      html += '<div class="q-options">' + opts.map((opt, oi) => {
        const sel = answers[qi] === String(oi);
        return '<button type="button" class="q-opt' + (sel ? ' selected' : '') + '" data-qi="' + qi + '" data-opt="' + oi + '">' +
          '<span class="q-letter">' + letters[oi] + '</span><span>' + escapeHtml(opt) + '</span></button>';
      }).join('') + '</div>';
    } else {
      const val = escapeHtml(String(answers[qi] || ''));
      html += '<div class="q-write"><textarea data-qi="' + qi + '" placeholder="Type your answer here..." maxlength="2000">' + val + '</textarea></div>';
    }
    html += '</div>';
  });
  card.innerHTML = html;
  card.querySelectorAll('.q-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const qi = parseInt(btn.dataset.qi, 10);
      answers[qi] = btn.dataset.opt;
      const group = btn.parentElement;
      group.querySelectorAll('.q-opt').forEach((b) => {
        b.classList.toggle('selected', b === btn);
      });
      updateProgress();
    });
  });
  card.querySelectorAll('textarea').forEach((ta) => {
    ta.addEventListener('input', (e) => {
      const qi = parseInt(e.target.dataset.qi, 10);
      answers[qi] = e.target.value;
    });
  });
  $('btnBackPage').disabled = currentPage === 0;
  $('btnNextPage').classList.toggle('hidden', isLast);
  $('btnSubmitExam').classList.toggle('hidden', !isLast);
  const end = Math.min(start + PAGE_SIZE, total);
  $('examQProgress').textContent = 'Questions ' + (start + 1) + '-' + end + ' of ' + total;
  updateProgress();
}

function startTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(timer);
      timer = null;
      submitExam(true, 'timeout');
      return;
    }
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    const s = secondsLeft % 60;
    $('examTimerText').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    $('examTimer').classList.toggle('danger', secondsLeft <= 300);
  }, 1000);
}

function warnFlag(msg) {
  if (!timer) return;
  flags++;
  if (flags >= MAX_FLAGS) {
    submitExam(true, 'cheating');
    return;
  }
  showToast('error', 'Warning!', msg, 'Flag ' + flags + '/' + MAX_FLAGS);
}

function antiCheatHandler() {
  if (document.hidden && timer) {
    warnFlag('Do not leave the exam page. This is recorded.');
  }
}

function antiCheatCopy(e) {
  if (!timer) return;
  e.preventDefault();
  warnFlag('Copying is not allowed during the exam. This is recorded.');
}

function antiCheatBlur() {
  if (timer) {
    warnFlag('Stay on the exam page.');
  }
}

function attachAntiCheat() {
  document.addEventListener('visibilitychange', antiCheatHandler);
  document.addEventListener('copy', antiCheatCopy);
  window.addEventListener('blur', antiCheatBlur);
}

function detachAntiCheat() {
  document.removeEventListener('visibilitychange', antiCheatHandler);
  document.removeEventListener('copy', antiCheatCopy);
  window.removeEventListener('blur', antiCheatBlur);
}

async function submitExam(timedOut, reason) {
  if (submitting) return;
  if (!timer && !timedOut) return;
  if (!examQuestions.length) return;
  submitting = true;
  timedOutFlag = timedOut;
  if (timer) clearInterval(timer);
  timer = null;
  detachAntiCheat();
  stopCamera();
  miniLoad('Submitting your exam...');
  try {
    const qs = examQuestions.map((q, i) => {
      const isMcq = String(q.type) !== 'write';
      const opts = Array.isArray(q.options) ? q.options : [];
      let ua = String(answers[i] || '');
      if (isMcq && opts.length) {
        const idx = parseInt(ua, 10);
        ua = (!isNaN(idx) && idx >= 0 && idx < opts.length) ? String.fromCharCode(65 + idx) : '';
      }
      return {
        number: i + 1,
        type: isMcq ? 'mcq' : 'write',
        question: q.question || '',
        options: opts,
        user_answer: ua
      };
    });
    const timeSpent = Math.max(0, EXAM_SECONDS - secondsLeft);
    const res = await apiPost('/examai', {
      user_id: user.id,
      course_id: activeCourseId,
      course_name: (userData && userData.course_name) || '',
      exam_id: examId,
      action: 'grade',
      questions: qs,
      time_spent: timeSpent,
      flagged: flags > 0,
      timed_out: timedOut,
      reason: reason || '',
      preferred_lang: (userData && userData.preferred_lang) || 'English'
    });
    resultData = res;
    showResult(timedOut, reason);
    miniHide();
    await saveExamData();
  } catch (err) {
    miniHide();
    showToast('error', 'Submit Failed', 'Could not submit your exam. Please try again.', err.message || String(err));
    submitting = false;
    if (!timedOut && secondsLeft > 0) {
      startTimer();
      attachAntiCheat();
    }
  }
}

function showResult(timedOut, reason) {
  const r = resultData;
  const score = Number(r.score || 0);
  const pct = Number(r.pct || 0);
  const passed = r.passed === true;
  $('examActive').classList.add('hidden');
  $('examResult').classList.remove('hidden');
  const deg = Math.round((pct / 100) * 360);
  $('scoreRing').style.background = 'conic-gradient(' + (passed ? 'var(--green)' : 'var(--rose)') + ' ' + deg + 'deg, rgba(124,58,237,.1) ' + deg + 'deg)';
  $('scorePct').textContent = pct + '%';
  const head = $('resultHead');
  head.textContent = passed ? 'Congratulations! 🎉' : 'Almost There!';
  head.className = 'result-head ' + (passed ? 'pass' : 'fail');
  $('resultSub').textContent = r.message || (passed
    ? 'You passed your final exam with ' + pct + '%. Excellent work! You have earned your certificate.'
    : 'You scored ' + pct + '%. You need 70% to pass. Read your notes and try again after 7 days.');
  const results = r.results || [];
  const correct = results.filter((x) => x.is_correct === true).length;
  const wrong = results.filter((x) => x.is_correct === false).length;
  const skipped = results.length - correct - wrong;
  const timeUsed = Math.max(0, EXAM_SECONDS - secondsLeft);
  $('resultSummary').innerHTML =
    '<div class="rs-row"><span>Total Questions</span><b>' + results.length + '</b></div>' +
    '<div class="rs-row"><span>Correct Answers</span><b class="ok">' + correct + '</b></div>' +
    '<div class="rs-row"><span>Wrong Answers</span><b class="bad">' + wrong + '</b></div>' +
    (skipped > 0 ? '<div class="rs-row"><span>Skipped</span><b>' + skipped + '</b></div>' : '') +
    '<div class="rs-row"><span>Total Score</span><b>' + Number(score).toFixed(1) + ' / 100</b></div>' +
    '<div class="rs-row"><span>Pass Mark</span><b>70 / 100</b></div>' +
    '<div class="rs-row"><span>Time Used</span><b>' + formatDuration(timeUsed * 1000) + '</b></div>';
  let listHtml = '';
  results.forEach((x, i) => {
    const ok = x.is_correct === true;
    const sk = !String(x.user_answer || '').trim();
    const mark = ok ? '<span class="ri-mark correct">✔ Correct</span>' : (sk ? '<span class="ri-mark skipped">Skipped</span>' : '<span class="ri-mark wrong">✖ Wrong</span>');
    const earned = Number(x.earned || 0);
    const marks = Number(x.marks || (String(x.type) === 'write' ? 2.5 : 1.5));
    listHtml += '<div class="result-item">' +
      '<div class="ri-head"><i class="fa-solid ' + (ok ? 'fa-circle-check' : (sk ? 'fa-circle-minus' : 'fa-circle-xmark')) + '" style="color:' + (ok ? '#10b981' : (sk ? '#94a3b8' : '#f43f5e')) + '"></i> Question ' + (i + 1) + ' ' + mark +
      '<span class="ri-score">' + earned.toFixed(1) + ' / ' + marks.toFixed(1) + '</span></div>' +
      '<div class="ri-q">' + escapeHtml(x.question || '') + '</div>' +
      '<div class="ri-ans"><span class="' + (ok ? 'ok' : 'bad') + '">Your answer: ' + escapeHtml(x.user_answer || '(no answer)') + '</span>' +
      (ok ? '' : '<br><span class="ok">Correct answer: ' + escapeHtml(x.correct_answer != null ? x.correct_answer : '') + '</span>') + '</div>' +
      (x.explanation ? '<div class="ri-explain"><b><i class="fa-solid fa-lightbulb"></i> Explanation:</b> ' + escapeHtml(x.explanation) + '</div>' : '') +
      '</div>';
  });
  $('resultList').innerHTML = listHtml || '<div class="result-item">No detailed breakdown available.</div>';
  $('btnGoCertificate').classList.toggle('hidden', !passed);
  if (passed) confetti();
  if (timedOut) {
    if (reason === 'cheating') {
      showToast('error', 'Exam Cancelled', 'You left the exam page too many times. Your exam was cancelled.', '');
    } else {
      showToast('error', 'Time Up', 'Your 1 hour finished. Your answers were submitted automatically.', '');
    }
  }
}

async function saveExamData() {
  try {
    const r = resultData;
    const entry = {
      id: 'ex_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      exam_id: examId,
      date: new Date().toISOString(),
      course_id: activeCourseId,
      course_name: (userData && userData.course_name) || '',
      score: Number(r.score || 0),
      pct: Number(r.pct || 0),
      passed: r.passed === true,
      time_spent: Math.max(0, EXAM_SECONDS - secondsLeft),
      flagged: flags > 0,
      timed_out: timedOutFlag,
      questions: r.results || []
    };
    const arr = Array.isArray(userData.exam_data) ? userData.exam_data : [];
    arr.push(entry);
    userData.exam_data = arr;
    if (entry.passed) {
      userData.exam_grade = entry.pct;
    }
    await saveUserData();
    renderHistory();
    renderIntro();
    if (entry.passed) {
      showToast('success', 'Result Saved', 'Your result has been saved to your exam history.', '');
    }
  } catch (err) {
    showToast('error', 'Save Failed', 'Your result could not be saved to history.', err.message || String(err));
  }
}

function confetti() {
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none';
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  document.body.appendChild(c);
  const x = c.getContext('2d');
  const colors = ['#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa', '#fbbf24'];
  const parts = [];
  for (let i = 0; i < 160; i++) {
    parts.push({
      x: Math.random() * c.width,
      y: -20 - Math.random() * c.height * 0.5,
      w: 6 + Math.random() * 7,
      h: 8 + Math.random() * 9,
      vy: 2 + Math.random() * 3,
      vx: -1.5 + Math.random() * 3,
      color: colors[i % colors.length],
      rot: Math.random() * Math.PI,
      vr: -0.1 + Math.random() * 0.2
    });
  }
  let frames = 0;
  (function anim() {
    x.clearRect(0, 0, c.width, c.height);
    parts.forEach((p) => {
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.rot) * 0.6;
      p.rot += p.vr;
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.rot);
      x.fillStyle = p.color;
      x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      x.restore();
    });
    frames++;
    if (frames < 240) requestAnimationFrame(anim);
    else c.remove();
  })();
}

function inlineMarkdown(text) {
  let out = escapeHtml(text);
  out = out.replace(/```[\s\S]*?```/g, (m) => {
    const code = m.slice(3, -3).replace(/^\n/, '');
    return '<pre style="display:block;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:12px;overflow-x:auto;font-family:Consolas,monospace;font-size:12px;margin:8px 0;white-space:pre">' + escapeHtml(code) + '</pre>';
  });
  out = out.replace(/`([^`]+)`/g, '<code style="background:rgba(124,58,237,.2);color:#c4b5fd;padding:2px 6px;border-radius:6px;font-size:12px;font-family:Consolas,monospace">$1</code>');
  const lines = out.split('\n');
  let html = '';
  let listOpen = false;
  let listType = '';
  let tableRows = [];
  lines.forEach((line) => {
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      if (listOpen) { html += '</' + listType + '>'; listOpen = false; }
      const lvl = h[1].length;
      html += '<h' + Math.min(lvl + 2, 6) + ' style="font-size:' + (18 - lvl) + 'px;font-weight:800;margin:10px 0 6px;color:#a78bfa">' + h[2] + '</h' + Math.min(lvl + 2, 6) + '>';
      return;
    }
    const tableMatch = line.trim().match(/^\|.*\|$/);
    if (tableMatch) {
      tableRows.push(line.trim());
      return;
    }
    if (tableRows.length) {
      html += renderTable(tableRows);
      tableRows = [];
    }
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      const t = ul ? 'ul' : 'ol';
      if (!listOpen || listType !== t) {
        if (listOpen) html += '</' + listType + '>';
        html += '<' + t + ' style="margin:6px 0 6px 18px;padding-left:14px">';
        listOpen = true;
        listType = t;
      }
      html += '<li style="margin:3px 0">' + (ul ? ul[1] : ol[1]) + '</li>';
      return;
    }
    if (listOpen) { html += '</' + listType + '>'; listOpen = false; }
    if (line.trim() === '') {
      html += '<div style="height:8px"></div>';
      return;
    }
    let rich = line;
    rich = rich.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    rich = rich.replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1<i>$2</i>');
    rich = rich.replace(/~~([^~]+)~~/g, '<s>$1</s>');
    html += '<div style="margin:4px 0">' + rich + '</div>';
  });
  if (tableRows.length) html += renderTable(tableRows);
  if (listOpen) html += '</' + listType + '>';
  return html;
}

function renderTable(rows) {
  let html = '<div style="overflow-x:auto;margin:8px 0"><table style="border-collapse:collapse;width:100%;font-size:12px">';
  rows.forEach((row, ri) => {
    if (/^[-:\s|]+$/.test(row)) return;
    const cells = row.replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
    const isHeader = ri === 0;
    html += '<tr>';
    cells.forEach((cell) => {
      const tag = isHeader ? 'th' : 'td';
      html += '<' + tag + ' style="border:1px solid rgba(124,58,237,.2);padding:8px 10px;text-align:left;' + (isHeader ? 'background:rgba(124,58,237,.08);font-weight:800' : '') + '">' + cell + '</' + tag + '>';
    });
    html += '</tr>';
  });
  html += '</table></div>';
  return html;
}

function markdownToHtml(src) {
  if (!src) return '';
  const parts = String(src).split('```');
  let html = '';
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      let code = parts[i];
      const nl = code.indexOf('\n');
      if (nl > -1) code = code.slice(nl + 1);
      html += '<pre style="display:block;background:#0f172a;color:#e2e8f0;padding:13px;border-radius:12px;overflow-x:auto;font-family:Consolas,monospace;font-size:12px;margin:8px 0;white-space:pre">' + escapeHtml(code) + '</pre>';
    } else {
      html += inlineMarkdown(parts[i]);
    }
  }
  return html;
}

function loadPdfLib() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => resolve(window.jspdf);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function imageToDataUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c.toDataURL('image/png'));
      } catch (e) {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}

async function buildPdfData(data, download) {
  await loadPdfLib();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const results = Array.isArray(data.questions) ? data.questions : (Array.isArray(data.results) ? data.results : []);
  const score = Number(data.score || 0);
  const pct = Number(data.pct || 0);
  const passed = data.passed === true;
  const courseName = data.course_name || (userData && userData.course_name) || '';
  const studentName = (userData && userData.full_name) || '';
  const dateStr = data.date ? formatDate(data.date) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const logo = await imageToDataUrl('https://i.imgur.com/oyqM5oF.png');
  const sign = await imageToDataUrl('https://i.imgur.com/sing.png');
  if (logo) {
    doc.addImage(logo, 'PNG', (w - 22) / 2, 12, 22, 22);
  } else {
    doc.setFillColor(124, 58, 237);
    doc.circle(w / 2, 23, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('IDT', w / 2, 26, { align: 'center' });
  }
  doc.setTextColor(30, 27, 75);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Intelligent Digital Technology Academy', w / 2, 42, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(109, 106, 138);
  doc.text('www.idtacademy.com.ng  •  Learn Beyond Limits', w / 2, 48, { align: 'center' });
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.8);
  doc.line(14, 53, w - 14, 53);
  doc.setTextColor(30, 27, 75);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('FINAL EXAM RESULT', w / 2, 62, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 58, 107);
  let y = 72;
  doc.text('Student Name:  ' + studentName, 16, y);
  doc.text('Date:  ' + dateStr, 120, y);
  y += 7;
  doc.text('Course:  ' + courseName, 16, y);
  doc.text('Pass Mark:  70 / 100 (70%)', 120, y);
  y += 7;
  doc.text('Score:  ' + score.toFixed(1) + ' / 100', 16, y);
  doc.text('Percentage:  ' + pct + '%', 120, y);
  y += 7;
  doc.text('Status:  ' + (passed ? 'PASSED' : 'NOT PASSED'), 16, y);
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('Question Breakdown', 16, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  results.forEach((r, i) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    const ok = r.is_correct === true;
    const sk = !String(r.user_answer || '').trim();
    const mark = ok ? '✔' : (sk ? '—' : '✖');
    const earned = Number(r.earned || 0).toFixed(1);
    const marks = Number(r.marks || (String(r.type) === 'write' ? 2.5 : 1.5)).toFixed(1);
    doc.setTextColor(ok ? 16 : 244, ok ? 185 : 63, ok ? 129 : 94);
    doc.text(mark, 18, y);
    doc.setTextColor(30, 27, 75);
    doc.text('Q' + (i + 1) + ': ' + String(r.question || '').slice(0, 58), 24, y);
    doc.setTextColor(124, 58, 237);
    doc.text(earned + '/' + marks, 196, y, { align: 'right' });
    y += 5;
    doc.setTextColor(109, 106, 138);
    let ansText = 'Your answer: ' + String(r.user_answer || '(no answer)');
    if (!ok) ansText += '  |  Correct: ' + String(r.correct_answer != null ? r.correct_answer : '');
    const lines = doc.splitTextToSize(ansText, 172);
    doc.text(lines, 26, y);
    y += lines.length * 4.5 + 3;
  });
  y += 4;
  if (passed) {
    doc.setDrawColor(16, 185, 129);
    doc.setFillColor(16, 185, 129);
    doc.roundedRect((w - 90) / 2, y, 90, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('CONGRATULATIONS - PASSED', w / 2, y + 8, { align: 'center' });
    y += 18;
  } else {
    doc.setDrawColor(244, 63, 94);
    doc.setFillColor(244, 63, 94);
    doc.roundedRect((w - 90) / 2, y, 90, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('NOT PASSED - KEEP LEARNING', w / 2, y + 8, { align: 'center' });
    y += 18;
  }
  if (sign) {
    doc.addImage(sign, 'PNG', w - 55, y, 30, 14);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 27, 75);
    doc.text('IDT Academy', w - 55, y + 10);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(109, 106, 138);
  doc.text('Signature', w - 55, y + 16);
  doc.text('Student Signature', 16, y + 16);
  doc.text('IDT Academy • Official Examination Document', w / 2, y + 26, { align: 'center' });
  if (download) {
    doc.save('IDT_Exam_Result_' + studentName.replace(/\s+/g, '_') + '.pdf');
    return '';
  }
  return doc.output('datauristring');
}

async function downloadResultPdf() {
  if (!resultData) return;
  miniLoad('Preparing your PDF...');
  try {
    await buildPdfData({
      questions: resultData.results || [],
      score: Number(resultData.score || 0),
      pct: Number(resultData.pct || 0),
      passed: resultData.passed === true,
      date: new Date().toISOString()
    }, true);
    miniHide();
    showToast('success', 'PDF Downloaded', 'Your exam result PDF has been downloaded.');
  } catch (err) {
    miniHide();
    showToast('error', 'PDF Failed', 'Could not create the PDF.', err.message || String(err));
  }
}

async function emailResult() {
  if (!resultData) return;
  miniLoad('Preparing your result email...');
  try {
    const pdf = await buildPdfData({
      questions: resultData.results || [],
      score: Number(resultData.score || 0),
      pct: Number(resultData.pct || 0),
      passed: resultData.passed === true,
      date: new Date().toISOString()
    }, false);
    const res = await apiPost('/examdata', {
      user_id: user.id,
      action: 'email',
      pdf_base64: pdf,
      score: Number(resultData.score || 0),
      pct: Number(resultData.pct || 0),
      passed: resultData.passed === true,
      course_name: (userData && userData.course_name) || '',
      date: new Date().toISOString().slice(0, 10)
    });
    miniHide();
    showToast('success', 'Email Sent!', 'Your result has been sent to ' + ((userData && (userData.email || user.email)) || user.email) + '. Check your inbox and spam folder.');
  } catch (err) {
    miniHide();
    showToast('error', 'Email Failed', 'Could not send the email.', err.message || String(err));
  }
}

function openView(i) {
  const item = history[i];
  if (!item) return;
  viewData = item;
  $('viewHeadTitle').textContent = 'Exam • ' + formatDate(item.date);
  $('viewDate').textContent = formatDate(item.date);
  $('viewScore').textContent = Number(item.score || 0).toFixed(1) + ' / 100';
  $('viewResult').textContent = item.passed ? 'PASSED' : 'NOT PASSED';
  $('viewBadge').className = 'badge ' + (item.passed ? 'green' : 'rose');
  $('viewBadge').innerHTML = '<i class="fa-solid fa-' + (item.passed ? 'circle-check' : 'circle-xmark') + '"></i> ' + (item.passed ? 'Passed' : 'Failed');
  const qs = Array.isArray(item.questions) ? item.questions : [];
  let html = '';
  qs.forEach((x, idx) => {
    const ok = x.is_correct === true;
    const sk = !String(x.user_answer || '').trim();
    const mark = ok ? '<span class="ri-mark correct">✔</span>' : (sk ? '<span class="ri-mark skipped">Skipped</span>' : '<span class="ri-mark wrong">✖</span>');
    const earned = Number(x.earned || 0).toFixed(1);
    const marks = Number(x.marks || (String(x.type) === 'write' ? 2.5 : 1.5)).toFixed(1);
    html += '<div class="result-item">' +
      '<div class="ri-head">Question ' + (idx + 1) + ' ' + mark + '<span class="ri-score">' + earned + ' / ' + marks + '</span></div>' +
      '<div class="ri-q">' + escapeHtml(x.question || '') + '</div>' +
      '<div class="ri-ans"><span class="' + (ok ? 'ok' : 'bad') + '">Your answer: ' + escapeHtml(x.user_answer || '(no answer)') + '</span>' +
      (ok ? '' : '<br><span class="ok">Correct answer: ' + escapeHtml(x.correct_answer != null ? x.correct_answer : '') + '</span>') + '</div>' +
      (x.explanation ? '<div class="ri-explain"><b><i class="fa-solid fa-lightbulb"></i> Explanation:</b> ' + escapeHtml(x.explanation) + '</div>' : '') +
      '</div>';
  });
  $('viewContent').innerHTML = html;
  $('viewOverlay').classList.add('open');
}

async function viewPdf() {
  if (!viewData) return;
  miniLoad('Preparing your PDF...');
  try {
    await buildPdfData({
      questions: Array.isArray(viewData.questions) ? viewData.questions : [],
      score: Number(viewData.score || 0),
      pct: Number(viewData.pct || 0),
      passed: viewData.passed === true,
      date: viewData.date
    }, true);
    miniHide();
    showToast('success', 'PDF Downloaded', 'Your exam result PDF has been downloaded.');
  } catch (err) {
    miniHide();
    showToast('error', 'PDF Failed', 'Could not create the PDF.', err.message || String(err));
  }
}

function openExplain() {
  if (!viewData) return;
  $('explainOverlay').classList.add('open');
  $('explainResult').classList.add('hidden');
  $('explainResultHead').classList.add('hidden');
  $('explainNote').textContent = '';
  $('otherLangRow').classList.add('hidden');
  $('langGrid').classList.remove('hidden');
  rawExplain = '';
  $('explainCopyBtn').classList.remove('done');
  $('explainCopyBtn').innerHTML = '<i class="fa-solid fa-copy"></i>';
}

async function sendExplain(lang) {
  if (!viewData) return;
  miniLoad('Explaining your exam in ' + lang + '...');
  try {
    const qs = Array.isArray(viewData.questions) ? viewData.questions : [];
    const res = await apiPost('/examai', {
      user_id: user.id,
      course_id: viewData.course_id || activeCourseId,
      course_name: viewData.course_name || (userData && userData.course_name) || '',
      action: 'explain',
      language: lang,
      score: Number(viewData.score || 0),
      pct: Number(viewData.pct || 0),
      passed: viewData.passed === true,
      date: viewData.date,
      questions: qs
    });
    rawExplain = res.explanation || res.message || 'No explanation returned.';
    const result = $('explainResult');
    result.innerHTML = markdownToHtml(rawExplain);
    result.classList.remove('hidden');
    $('explainResultHead').classList.remove('hidden');
    $('explainNote').textContent = 'Explained in ' + lang + ' + English. You can copy this explanation and share it with your teacher.';
    miniHide();
    showToast('success', 'Explanation Ready', 'Here is your exam explanation in ' + lang + '.');
  } catch (err) {
    miniHide();
    showToast('error', 'Explain Failed', 'Could not create the explanation.', err.message || String(err));
  }
}

async function copyExplain() {
  if (!rawExplain) return;
  try {
    await copyText(rawExplain);
    const btn = $('explainCopyBtn');
    btn.classList.add('done');
    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
    showToast('success', 'Copied!', 'The explanation was copied to your clipboard.');
    setTimeout(() => {
      btn.classList.remove('done');
      btn.innerHTML = '<i class="fa-solid fa-copy"></i>';
    }, 2000);
  } catch (err) {
    showToast('error', 'Copy Failed', 'Could not copy the explanation.', err.message || String(err));
  }
}

const staticStartBtn = $('btnStartExam');
if (staticStartBtn) {
  staticStartBtn.addEventListener('click', startExam);
}

$('btnBackPage').addEventListener('click', () => {
  if (currentPage > 0) {
    currentPage--;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

$('btnNextPage').addEventListener('click', () => {
  const total = examQuestions.length;
  if (!total) return;
  const start = currentPage * PAGE_SIZE;
  const pageQs = examQuestions.slice(start, start + PAGE_SIZE);
  let allAnswered = true;
  pageQs.forEach((q, pi) => {
    const qi = start + pi;
    const isMcq = String(q.type) !== 'write';
    const val = String(answers[qi] || '').trim();
    if (isMcq && val === '') allAnswered = false;
  });
  if (!allAnswered) {
    showToast('info', 'Answer Required', 'Please answer all multiple choice questions on this page before continuing.', '');
    return;
  }
  if (start + PAGE_SIZE < total) {
    currentPage++;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

$('btnSubmitExam').addEventListener('click', () => {
  if (submitting) return;
  const total = examQuestions.length;
  if (!total) return;
  const start = currentPage * PAGE_SIZE;
  const pageQs = examQuestions.slice(start, start + PAGE_SIZE);
  let missing = 0;
  pageQs.forEach((q, pi) => {
    const qi = start + pi;
    const isMcq = String(q.type) !== 'write';
    const val = String(answers[qi] || '').trim();
    if (isMcq && val === '') missing++;
  });
  const totalAnswered = answers.filter((a) => String(a || '').trim() !== '').length;
  const confirmMsg = 'You have answered ' + totalAnswered + ' of ' + total + ' questions' +
    (missing > 0 ? ' (' + missing + ' unanswered on this page)' : '') +
    '. Submit your exam now?';
  const modal = document.createElement('div');
  modal.className = 'ov-backdrop open';
  modal.style.zIndex = '9000';
  modal.innerHTML = '<div class="ov-card" style="max-width:420px">' +
    '<div class="ov-head"><h3><i class="fa-solid fa-circle-check"></i> Submit Exam?</h3>' +
    '<button class="ov-close" id="confirmClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="ov-body" style="text-align:center">' +
    '<i class="fa-solid fa-hourglass-end" style="font-size:40px;color:var(--amber);margin-bottom:12px;display:block"></i>' +
    '<p style="font-size:13px;color:var(--ink);line-height:1.7;margin-bottom:14px">' + escapeHtml(confirmMsg) + '<br><br>Once submitted, you cannot change your answers.</p>' +
    '<div class="btn-row"><button class="btn btn-outline" id="confirmCancel" style="padding:12px 16px;font-size:13px">Cancel</button>' +
    '<button class="btn btn-primary" id="confirmSubmit" style="padding:12px 16px;font-size:13px"><i class="fa-solid fa-check"></i> Submit</button></div>' +
    '</div></div>';
  document.body.appendChild(modal);
  modal.querySelector('#confirmClose').addEventListener('click', () => modal.remove());
  modal.querySelector('#confirmCancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#confirmSubmit').addEventListener('click', () => {
    modal.remove();
    submitExam(false);
  });
});

$('btnDownloadPdf').addEventListener('click', downloadResultPdf);
$('btnEmailResult').addEventListener('click', emailResult);

$('btnGoCertificate').addEventListener('click', () => {
  window.location.href = 'certificate.html?user_id=' + encodeURIComponent(user.id) + '&course_id=' + encodeURIComponent(activeCourseId);
});

$('btnBackDashboard').addEventListener('click', () => {
  window.location.href = 'dashboard.html';
});

$('histTableBody').addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-view');
  if (!btn) return;
  openView(parseInt(btn.dataset.view, 10));
});

$('viewClose').addEventListener('click', () => $('viewOverlay').classList.remove('open'));
$('btnViewBack').addEventListener('click', () => $('viewOverlay').classList.remove('open'));
$('btnViewPdf').addEventListener('click', viewPdf);
$('btnViewExplain').addEventListener('click', openExplain);

$('explainClose').addEventListener('click', () => $('explainOverlay').classList.remove('open'));

document.querySelectorAll('.lang-btn[data-lang]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const lang = btn.dataset.lang;
    $('langGrid').classList.add('hidden');
    $('otherLangRow').classList.add('hidden');
    sendExplain(lang);
  });
});

$('langOtherBtn').addEventListener('click', () => {
  $('otherLangRow').classList.toggle('hidden');
  if (!$('otherLangRow').classList.contains('hidden')) {
    $('otherLangInput').focus();
  }
});

$('btnSendOtherLang').addEventListener('click', () => {
  const lang = $('otherLangInput').value.trim();
  if (!lang) {
    showToast('error', 'Language Required', 'Please type the language you want.', '');
    return;
  }
  $('otherLangRow').classList.add('hidden');
  $('langGrid').classList.add('hidden');
  sendExplain(lang);
});

$('explainCopyBtn').addEventListener('click', copyExplain);

$('viewOverlay').addEventListener('click', (e) => {
  if (e.target === $('viewOverlay')) $('viewOverlay').classList.remove('open');
});

$('explainOverlay').addEventListener('click', (e) => {
  if (e.target === $('explainOverlay')) $('explainOverlay').classList.remove('open');
});

window.addEventListener('beforeunload', (e) => {
  if (timer && examQuestions.length && !submitting) {
    e.preventDefault();
    e.returnValue = '';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  showLoading();
  init();
  document.documentElement.classList.add('ready');
});
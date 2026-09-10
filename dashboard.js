import { supabase } from './supabase.js';
import { askQuestion, explainText, getAssessment, gradeAssessment, createPayment, verifyPayment, sendResultEmail } from './ai.js';

window.__idtDashboardLoaded = false;

window.addEventListener('error', function(e) {
  try {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#f43f5e;color:#fff;padding:12px 16px;font-family:sans-serif;font-size:12.5px;font-weight:700;text-align:left;line-height:1.5';
    el.textContent = 'JS Error: ' + (e.message || 'Unknown error') + (e.filename ? ' @ ' + e.filename : '');
    document.body.appendChild(el);
    setTimeout(function() { el.remove(); }, 10000);
  } catch (_) {}
});

window.addEventListener('unhandledrejection', function(e) {
  try {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#f59e0b;color:#fff;padding:12px 16px;font-family:sans-serif;font-size:12.5px;font-weight:700;text-align:left;line-height:1.5';
    el.textContent = 'API Error: ' + ((e.reason && e.reason.message) || 'Request failed');
    document.body.appendChild(el);
    setTimeout(function() { el.remove(); }, 10000);
  } catch (_) {}
});

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

function $(id) {
  return document.getElementById(id);
}

function on(id, fn) {
  const el = $(id);
  if (el) {
    el.addEventListener('click', fn);
  } else {
    console.warn('[IDT Dashboard] Missing element ID in dashboard.html: #' + id);
  }
}

function onSubmit(id, fn) {
  const el = $(id);
  if (el) {
    el.addEventListener('submit', fn);
  } else {
    console.warn('[IDT Dashboard] Missing element ID in dashboard.html: #' + id);
  }
}

function onReady(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

const toastWrap = $('toastWrap');

const PASS_MARK = 3;
const RETRY_REGULAR_MS = 42 * 60 * 60 * 1000;
const RETRY_DIPLOMA_MS = 7 * 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const REGULAR_WATCH_SECONDS = 90;
const ASSESS_BATCH_SIZE = 3;

let user = null;
let profileData = null;
let userData = null;
let updateData = null;
let courseList = [];
let courseInfoMap = {};
let topicsMap = {};
let activeCourseId = '';
let currentTopics = [];
let currentTopicIdx = 0;
let currentTopic = null;
let watchedMap = {};
let readingHistory = {};
let chatHistories = {};
let passedBatches = {};
let lastAssessFail = {};
let finishedCourses = {};
let preferredLang = 'English';
let adList = [];
let adIdx = 0;
let adTimer = null;
let sessionSeconds = 0;
let sessionTimer = null;
let pendingNextIdx = -1;
let quizState = null;
let paymentState = null;
let diplomaMode = false;
let videoWatchTimer = null;
let videoWatched = false;
let isProcessingNext = false;
let isDiplomaReg = false;
let regDate = null;
let pendingCourses = [];
let pendingCourseChoice = null;
let statusWatcher = null;
let isCreatingPayment = false;

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
  const wrapEl = $('toastWrap');
  if (!wrapEl) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const rawHtml = raw ? '<small class="toast-raw"><i class="fa-solid fa-bug"></i> ' + escapeHtml(raw) + '</small>' : '';
  el.innerHTML = '<i class="fa-solid ' + icons[type] + '"></i>' +
    '<div class="toast-body"><b>' + escapeHtml(title) + '</b><p>' + escapeHtml(message) + '</p>' + rawHtml + '</div>' +
    '<button class="toast-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  el.querySelector('.toast-x').addEventListener('click', () => removeToast(el));
  wrapEl.appendChild(el);
  if (type === 'success') {
    setTimeout(() => removeToast(el), 3600);
  }
  return el;
}

function miniLoad(text) {
  const t = $('miniLoaderText');
  if (t) t.textContent = text || 'Please wait...';
  const m = $('miniLoader');
  if (m) m.classList.add('open');
}

function miniHide() {
  const m = $('miniLoader');
  if (m) m.classList.remove('open');
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

function formatMoney(n) {
  return '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getYouTubeId(url) {
  const u = String(url || '').trim();
  let m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = u.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}

function isDirectVideo(url) {
  return /\.(mp4|webm|ogg|ogv|mov)(\?.*)?$/i.test(String(url || ''));
}

function categoryLabel(cat) {
  const cats = { '1': 'Technology & Computing', '2': 'Vocational & Agricultural Skills', '3': 'Health & Community Wellness', '4': '2-Year Diploma Program', '5': 'JAMB Preparation' };
  return cats[String(cat || '')] || 'Course';
}

function memberSinceText(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const ms = Date.now() - d.getTime();
  if (ms < 0) return 'today';
  const days = Math.floor(ms / 86400000);
  if (days < 31) return days + (days === 1 ? ' day' : ' days');
  const months = Math.floor(days / 30.44);
  if (months < 12) return months + (months === 1 ? ' month' : ' months');
  const years = Math.floor(days / 365.25);
  return years + (years === 1 ? ' year' : ' years');
}

function buildReferralLink() {
  const code = (userData && userData.referral_code) || '';
  return 'https://www.idtacademy.com.ng/index/ref/' + code;
}

function getPreferredLang() {
  return (updateData && updateData.preferred_lang) || preferredLang;
}

function setPreferredLang(lang) {
  preferredLang = lang;
  if (updateData) updateData.preferred_lang = lang;
  saveUpdate({ preferred_lang: lang });
}

function weeksSince(isoDate) {
  if (!isoDate) return 0;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / WEEK_MS);
}

function isDiploma(courseId) {
  const info = courseInfoMap[courseId] || {};
  return String(info.category || '') === '4';
}

function collectCourses(ud) {
  const arr = [];
  const main = {
    course_id: ud.course_id || '',
    course_name: ud.course_name || '',
    course_number: ud.course_number || '',
    course_price: ud.course_price || 0,
    status: ud.status || 'pending'
  };
  if (main.course_id) arr.push(main);
  ['new_course2', 'new_course3', 'new_course4', 'new_course5'].forEach((k) => {
    const c = ud[k];
    if (c && typeof c === 'object' && c.course_id) {
      arr.push({
        course_id: c.course_id,
        course_name: c.course_name || '',
        course_number: c.course_number || '',
        course_price: c.course_price || 0,
        status: c.status || ud.status || 'active'
      });
    }
  });
  return arr;
}

async function loadUpdateTable() {
  try {
    const { data, error } = await supabase
      .from('update')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (data && data.uset_update) {
      updateData = data.uset_update;
    } else {
      updateData = {};
    }
  } catch (err) {
    updateData = {};
  }
  watchedMap = updateData.watched || {};
  readingHistory = updateData.reading_history || {};
  chatHistories = updateData.chat_history || {};
  passedBatches = updateData.passed_batches || {};
  lastAssessFail = updateData.last_assess_fail || {};
  finishedCourses = updateData.finished_courses || {};
  preferredLang = updateData.preferred_lang || 'English';
}

async function saveUpdate(patch) {
  try {
    if (!updateData) updateData = {};
    Object.assign(updateData, patch);
    const { error } = await supabase
      .from('update')
      .upsert({ id: user.id, uset_update: updateData }, { onConflict: 'id' });
    if (error) throw error;
  } catch (err) {
    showToast('error', 'Save Failed', 'Could not save your progress.', err.message || String(err));
  }
}

async function refreshProfile() {
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
  if (!profileData || !userData) return;
  const { error } = await supabase
    .from('user_profiles')
    .update({ user_data: userData })
    .eq('id', user.id);
  if (error) throw error;
}

function computeStatus() {
  const at = String((userData && userData.account_type) || '').toLowerCase();
  let st = String((userData && userData.status) || 'pending').toLowerCase();
  if (at === 'partner' && st !== 'active') {
    st = 'active';
    if (userData) userData.status = 'active';
  }
  return st;
}

function isCourseFinished(cid) {
  if (finishedCourses[cid]) return true;
  return String(userData.level_completed || '') === 'final';
}

function markWatched(topicIdx) {
  if (!activeCourseId) return;
  const arr = watchedMap[activeCourseId] || [];
  if (arr.indexOf(topicIdx) === -1) {
    arr.push(topicIdx);
    watchedMap[activeCourseId] = arr;
    saveUpdate({ watched: watchedMap });
  }
  videoWatched = true;
  renderProgress();
  const st = $('videoStatus');
  if (st) {
    st.classList.add('watched');
    const txt = $('videoStatusText');
    if (txt) txt.textContent = 'Video watched ✓';
  }
}

function isWatched(topicIdx) {
  const arr = (watchedMap && watchedMap[activeCourseId]) || [];
  return arr.indexOf(topicIdx) !== -1;
}

function renderSessionClock() {
  const m = Math.floor(sessionSeconds / 60);
  const s = sessionSeconds % 60;
  const el = $('sessionTime');
  if (el) el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function startSessionClock() {
  sessionSeconds = 0;
  if (sessionTimer) clearInterval(sessionTimer);
  sessionTimer = setInterval(() => {
    sessionSeconds++;
    renderSessionClock();
  }, 1000);
}

function renderMenu() {
  if (!user || !userData) return;
  const bonus = Number((userData && userData.referral_bonus) || 0);
  const nameEl = $('smUserName');
  if (nameEl) nameEl.textContent = (userData && userData.full_name) || 'Student';
  const bonusEl = $('smBonus');
  if (bonusEl) bonusEl.textContent = bonus.toFixed(2);
  const extraEl = $('smReferralExtra');
  if (extraEl) extraEl.textContent = formatMoney(bonus);
  const refEl = $('smReferral');
  if (refEl) refEl.href = 'referral.html?user_id=' + encodeURIComponent(user.id) + '&code=' + encodeURIComponent(userData.referral_code || '');
  const pRef = $('pendingReferLink');
  if (pRef) {
    const link = buildReferralLink();
    pRef.textContent = link;
    pRef.title = link;
  }
}

function renderUserGreet() {
  const n1 = $('userFullName');
  if (n1) n1.textContent = (userData && userData.full_name) || 'Student';
  const n2 = $('userCourseName');
  if (n2) n2.textContent = 'Course: ' + ((userData && userData.course_name) || 'Loading...');
  const n3 = $('progressStudent');
  if (n3) n3.textContent = (userData && userData.full_name) || 'Student';
  const regIso = (userData && (userData.date_registered || userData.date_registed || userData.created_at)) || (profileData && profileData.created_at) || '';
  const ms = memberSinceText(regIso);
  document.querySelectorAll('.idt-member-since').forEach((el) => {
    el.textContent = ms ? 'Member for ' + ms : 'New member';
  });
}

function renderUserIdCard() {
  document.querySelectorAll('.idt-uid-name').forEach((el) => {
    el.textContent = (userData && userData.full_name) || 'Student';
  });
  document.querySelectorAll('.idt-uid-value').forEach((el) => {
    el.textContent = user.id;
  });
  document.querySelectorAll('.copy-user-id').forEach((btn) => {
    btn.dataset.copy = user.id;
  });
}

async function loadAd() {
  try {
    const { data, error } = await supabase
      .from('ad_for')
      .select('*');
    if (error) throw error;
    adList = (data || []).filter((r) => r.ad_image && r.ad_link);
    const box = $('adBox');
    if (!box) return;
    if (adList.length === 0) {
      box.classList.add('hidden');
      return;
    }
    box.classList.remove('hidden');
    showAdSlide(0);
    if (adTimer) clearInterval(adTimer);
    adTimer = setInterval(() => {
      adIdx = (adIdx + 1) % adList.length;
      showAdSlide(adIdx);
    }, 10000);
  } catch (err) {
    const box = $('adBox');
    if (box) box.classList.add('hidden');
  }
}

function showAdSlide(i) {
  const box = $('adBox');
  const img = $('adImage');
  const row = adList[i];
  if (!row || !box || !img) return;
  window._adtLink = row.ad_link;
  img.classList.add('fade');
  setTimeout(() => {
    img.src = row.ad_image;
    img.onload = () => img.classList.remove('fade');
  }, 500);
}

async function loadCourseInfos() {
  const ids = courseList.map((c) => c.course_id).filter(Boolean);
  if (ids.length === 0) return;
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .in('id', ids);
    if (error) throw error;
    (data || []).forEach((row) => {
      courseInfoMap[row.id] = row.course_data || {};
    });
  } catch (err) {
    showToast('error', 'Error', 'Could not load course details.', err.message || String(err));
  }
}

async function loadTopicsFor(courseId) {
  try {
    const { data, error } = await supabase
      .from('all_couse_post')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();
    if (error) throw error;
    if (data && data.all_course && Array.isArray(data.all_course.topics)) {
      topicsMap[courseId] = data.all_course.topics;
    } else {
      topicsMap[courseId] = [];
    }
  } catch (err) {
    topicsMap[courseId] = [];
  }
}

async function loadPendingCourses() {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*');
    if (error) throw error;
    pendingCourses = (data || []).filter((r) => r.course_data);
    pendingCourses.forEach((row) => {
      courseInfoMap[row.id] = row.course_data || {};
    });
  } catch (err) {
    pendingCourses = [];
    showToast('error', 'Error', 'Could not load the course list.', err.message || String(err));
  }
  renderPendingCourses();
  renderPendingSummary();
}

function pendingChoiceCourse() {
  let row = pendingCourses.find((r) => r.id === pendingCourseChoice);
  if (!row) {
    row = pendingCourses.find((r) => r.id === ((userData && userData.course_id) || ''));
  }
  if (row) {
    const cd = row.course_data || {};
    return {
      course_id: row.id,
      course_name: cd.course_name || '',
      course_number: cd.course_number || '',
      course_price: Number(cd.course_price || row.course_price || 0)
    };
  }
  const ud = {
    course_id: (userData && userData.course_id) || '',
    course_name: (userData && userData.course_name) || '',
    course_number: (userData && userData.course_number) || '',
    course_price: Number((userData && userData.course_price) || 0)
  };
  if (ud.course_id || ud.course_price) return ud;
  return null;
}

function renderPendingCourses() {
  const grid = $('pendingCourseGrid');
  if (!grid) return;
  if (!pendingCourses.length) {
    grid.innerHTML = '<div class="pc-empty"><i class="fa-solid fa-circle-info"></i> No courses available right now. Please contact support.</div>';
    return;
  }
  const preId = pendingCourseChoice || (userData && userData.course_id) || '';
  grid.innerHTML = pendingCourses.map((row) => {
    const cd = row.course_data || {};
    const price = Number(cd.course_price || row.course_price || 0);
    const sel = row.id === preId;
    return '<button type="button" class="pc-card' + (sel ? ' selected' : '') + '" data-cid="' + escapeHtml(row.id) + '">' +
      '<span class="pc-check"><i class="fa-solid fa-check"></i></span>' +
      '<span class="pc-name">' + escapeHtml(cd.course_name || 'Course') + '</span>' +
      '<span class="pc-meta">' + escapeHtml(categoryLabel(cd.category)) + '</span>' +
      '<span class="pc-price">' + formatMoney(price) + '</span>' +
      '</button>';
  }).join('');
  grid.querySelectorAll('.pc-card').forEach((card) => {
    card.addEventListener('click', async () => {
      const cid = card.dataset.cid;
      if (cid === pendingCourseChoice) return;
      pendingCourseChoice = cid;
      renderPendingCourses();
      renderPendingSummary();
      await persistCourseChoice(cid);
    });
  });
}

async function persistCourseChoice(cid) {
  const c = pendingChoiceCourse();
  if (!c || c.course_id !== cid) return;
  userData.course_id = c.course_id;
  userData.course_name = c.course_name;
  userData.course_number = c.course_number;
  userData.course_price = c.course_price;
  if (!courseList.length) {
    courseList = [{
      course_id: c.course_id,
      course_name: c.course_name,
      course_number: c.course_number,
      course_price: c.course_price,
      status: computeStatus()
    }];
  }
  try {
    await saveUserData();
  } catch (err) {
    showToast('error', 'Save Failed', 'Could not save your course choice.', err.message || String(err));
  }
}

function renderPendingSummary() {
  const box = $('pendingSummary');
  const btn = $('btnPayNow');
  const hint = $('pendingChooseHint');
  const c = pendingChoiceCourse();
  if (!box) return;
  if (!c) {
    box.classList.add('hidden');
    if (btn) { btn.disabled = true; }
    if (hint) hint.classList.remove('hidden');
    return;
  }
  box.classList.remove('hidden');
  if (hint) hint.classList.add('hidden');
  $('pendingCourseName').textContent = c.course_name || 'Selected Course';
  $('pendingCourseNumber').textContent = c.course_number || '000';
  $('pendingPrice').textContent = formatMoney(c.course_price || 0);
  const info = courseInfoMap[c.course_id] || {};
  const img = $('pendingCourseImg');
  if (img) {
    if (info.image_url) {
      img.src = info.image_url;
      img.classList.remove('hidden');
    } else {
      img.classList.add('hidden');
    }
  }
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Pay Now';
  }
}

function pickDefaultCourse() {
  const unfinished = courseList.filter((c) => !isCourseFinished(c.course_id));
  const pool = unfinished.length ? unfinished : courseList;
  if (!pool.length) return '';
  const withProgress = pool.filter((c) => typeof readingHistory[c.course_id] === 'number');
  if (withProgress.length) {
    withProgress.sort((a, b) => (readingHistory[b.course_id] || 0) - (readingHistory[a.course_id] || 0));
    return withProgress[0].course_id;
  }
  return pool[pool.length - 1].course_id;
}

function renderCourseSwitch() {
  const wrap = $('courseSwitch');
  if (!wrap) return;
  if (courseList.length <= 1) {
    wrap.classList.add('hidden');
    wrap.innerHTML = '';
    return;
  }
  wrap.classList.remove('hidden');
  let html = '';
  courseList.forEach((c) => {
    const done = isCourseFinished(c.course_id);
    const isActive = c.course_id === activeCourseId;
    html += '<button class="cs-chip' + (isActive ? ' active' : '') + '" data-cid="' + escapeHtml(c.course_id) + '">' +
      '<i class="fa-solid fa-graduation-cap"></i> ' + escapeHtml(c.course_name) +
      (done && isActive ? ' <span class="cs-done"><i class="fa-solid fa-circle-check"></i></span>' : '') +
      '</button>';
  });
  wrap.innerHTML = html;
  wrap.querySelectorAll('.cs-chip').forEach((chip) => {
    chip.addEventListener('click', async () => {
      const cid = chip.dataset.cid;
      if (cid === activeCourseId) return;
      await selectCourse(cid);
    });
  });
}

async function selectCourse(courseId) {
  activeCourseId = courseId;
  renderCourseSwitch();
  if (!topicsMap[courseId]) await loadTopicsFor(courseId);
  currentTopics = topicsMap[courseId] || [];
  diplomaMode = isDiploma(courseId);
  regDate = userData.date_registered || null;
  const savedIdx = typeof readingHistory[courseId] === 'number' ? readingHistory[courseId] : 0;
  currentTopicIdx = Math.min(Math.max(0, savedIdx), Math.max(0, currentTopics.length - 1));
  const done = isCourseFinished(courseId);
  if (done && currentTopics.length) {
    currentTopicIdx = currentTopics.length - 1;
  }
  if (currentTopics.length === 0) {
    const tc = $('topicCard');
    if (tc) tc.classList.add('hidden');
    const es = $('emptyState');
    if (es) es.classList.remove('hidden');
    renderProgress();
    return;
  }
  const es = $('emptyState');
  if (es) es.classList.add('hidden');
  const tc = $('topicCard');
  if (tc) tc.classList.remove('hidden');
  renderProgress();
  renderTopic();
  showToast('success', 'Course Loaded', 'Welcome to ' + ((courseInfoMap[courseId] || {}).course_name || 'your course') + '. Happy learning!');
}

function renderProgress() {
  const total = currentTopics.length;
  const arr = (watchedMap && watchedMap[activeCourseId]) || [];
  let completed = arr.length;
  const done = isCourseFinished(activeCourseId);
  if (done) completed = total;
  if (typeof readingHistory[activeCourseId] === 'number') {
    completed = Math.max(completed, Math.min(readingHistory[activeCourseId], total));
  }
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const info = courseInfoMap[activeCourseId] || {};
  const cn = $('progressCourseName');
  if (cn) cn.textContent = info.course_name || ((userData && userData.course_name) || 'Course');
  const cat = $('progressCategory');
  if (cat) cat.textContent = categoryLabel(info.category);
  const pc = $('progressCount');
  if (pc) pc.textContent = completed + '/' + total;
  const pp = $('progressPct');
  if (pp) pp.textContent = pct + '%';
  const pf = $('progressFill');
  if (pf) pf.style.width = pct + '%';
  const badge = $('levelBadge');
  if (badge) {
    if (done) {
      badge.className = 'level-badge final';
      badge.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> Final Level Completed';
    } else {
      badge.className = 'level-badge studying';
      badge.innerHTML = '<i class="fa-solid fa-book-open"></i> Studying • Topic ' + (currentTopicIdx + 1) + '/' + total;
    }
  }
  const banner = $('completeBanner');
  if (banner) {
    if (done) {
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }
}

function renderDiplomaLock() {
  const wrap = $('videoWrap');
  const lock = $('videoLock');
  if (!lock) return false;
  const idx = currentTopicIdx;
  const weeks = regDate ? weeksSince(regDate) : 0;
  const allowed = weeks;
  if (idx > allowed) {
    const unlockAt = new Date((regDate ? new Date(regDate).getTime() : Date.now()) + (idx) * WEEK_MS);
    const diff = unlockAt.getTime() - Date.now();
    const d = Math.floor(diff / (24 * 60 * 60 * 1000));
    const h = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    lock.classList.remove('hidden');
    const lt = $('videoLockTitle');
    if (lt) lt.textContent = 'This Topic Unlocks Later';
    const lm = $('videoLockMsg');
    if (lm) lm.textContent = 'Diploma lessons open one per week to help you learn step by step. Unlocks in ' + d + 'd ' + h + 'h ' + m + 'm.';
    return true;
  }
  lock.classList.add('hidden');
  return false;
}

function renderTopic() {
  if (!currentTopics.length) return;
  currentTopic = currentTopics[currentTopicIdx];
  const total = currentTopics.length;
  const isFinalTopic = currentTopicIdx === total - 1;
  const tn = $('topicNumber');
  if (tn) tn.textContent = currentTopicIdx + 1;
  const tnl = $('topicNumLabel');
  if (tnl) tnl.textContent = currentTopicIdx + 1;
  const ttl = $('topicTotalLabel');
  if (ttl) ttl.textContent = total;
  const tnm = $('topicName');
  if (tnm) tnm.textContent = currentTopic.topic_name || ('Topic ' + (currentTopicIdx + 1));
  const badge = $('topicBadge');
  if (badge) {
    if (currentTopic.is_final === true || isFinalTopic) {
      badge.className = 'th-badge final';
      badge.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> Final Topic';
    } else {
      badge.className = 'th-badge';
      badge.innerHTML = '';
    }
  }
  const tt = $('topicText');
  if (tt) tt.textContent = currentTopic.topic_text || '';
  if (tn) tn.classList.toggle('final-num', currentTopic.is_final === true || isFinalTopic);
  renderVideo();
  const watched = isWatched(currentTopicIdx);
  videoWatched = watched;
  const st = $('videoStatus');
  if (st) {
    if (watched) {
      st.classList.add('watched');
      const txt = $('videoStatusText');
      if (txt) txt.textContent = 'Video watched ✓';
    } else {
      st.classList.remove('watched');
      const txt = $('videoStatusText');
      if (txt) txt.textContent = currentTopic.video_url ? 'Video not watched yet' : 'No video for this topic';
    }
  }
  const btnNext = $('btnNextTopic');
  if (btnNext) {
    if (isFinalTopic) {
      btnNext.textContent = 'Finish Course';
      btnNext.classList.add('finish');
    } else {
      btnNext.textContent = 'Next';
      btnNext.classList.remove('finish');
    }
  }
  const btnPrev = $('btnPrevTopic');
  if (btnPrev) btnPrev.disabled = currentTopicIdx === 0;
  if (btnNext) {
    if (diplomaMode && currentTopicIdx > weeksSince(regDate)) {
      btnNext.disabled = true;
    } else {
      btnNext.disabled = false;
    }
  }
  renderProgress();
}

function renderVideo() {
  const wrap = $('videoWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  if (videoWatchTimer) clearInterval(videoWatchTimer);
  videoWatchTimer = null;
  const url = (currentTopic && currentTopic.video_url) || '';
  if (diplomaMode) {
    const locked = renderDiplomaLock();
    if (locked) return;
  }
  const lock = $('videoLock');
  if (lock) lock.classList.add('hidden');
  if (!url) {
    const ph = document.createElement('div');
    ph.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#94a3b8;background:#0b0d1a;text-align:center;padding:20px';
    ph.innerHTML = '<i class="fa-solid fa-book-open" style="font-size:30px;color:#7c3aed"></i><span style="font-size:12.5px">No video for this topic. Read the lesson notes below.</span>';
    wrap.appendChild(ph);
    return;
  }
  const yt = getYouTubeId(url);
  if (yt) {
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/' + yt + '?rel=0&modestbranding=1&playsinline=1&controls=1&fs=1&color=white&iv_load_policy=3';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    wrap.appendChild(iframe);
    startVideoDwellTimer();
  } else if (isDirectVideo(url)) {
    const vid = document.createElement('video');
    vid.src = url;
    vid.controls = true;
    vid.playsInline = true;
    vid.preload = 'metadata';
    wrap.appendChild(vid);
    attachVideoWatcher(vid);
  } else {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allow = 'autoplay; fullscreen; encrypted-media';
    iframe.allowFullscreen = true;
    wrap.appendChild(iframe);
    startVideoDwellTimer();
  }
}

function startVideoDwellTimer() {
  if (videoWatched) return;
  let secs = 0;
  videoWatchTimer = setInterval(() => {
    secs++;
    if (secs >= REGULAR_WATCH_SECONDS && !isWatched(currentTopicIdx)) {
      markWatched(currentTopicIdx);
      clearInterval(videoWatchTimer);
      videoWatchTimer = null;
      showToast('success', 'Video Watched ✓', 'You watched this video. You can now continue.');
    }
  }, 1000);
}

function attachVideoWatcher(vid) {
  if (videoWatched) return;
  vid.addEventListener('timeupdate', () => {
    if (!vid.duration || !isFinite(vid.duration)) return;
    const pct = vid.currentTime / vid.duration;
    if (pct >= 0.8 && !isWatched(currentTopicIdx)) {
      markWatched(currentTopicIdx);
    }
  });
  vid.addEventListener('ended', () => {
    if (!isWatched(currentTopicIdx)) markWatched(currentTopicIdx);
  });
}

async function goToTopic(idx) {
  if (idx < 0 || idx >= currentTopics.length) return;
  currentTopicIdx = idx;
  readingHistory[activeCourseId] = idx;
  saveUpdate({ reading_history: readingHistory });
  renderTopic();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function topicNeedsWatch(idx) {
  const t = currentTopics[idx];
  return Boolean(t && t.video_url);
}

function openUnderstandModal() {
  const m = $('understandModal');
  if (m) m.classList.add('open');
}

function closeUnderstandModal() {
  const m = $('understandModal');
  if (m) m.classList.remove('open');
}

async function advanceTopic() {
  if (isProcessingNext) return;
  if (!currentTopics.length) return;
  const nextIdx = currentTopicIdx + 1;
  if (nextIdx >= currentTopics.length) {
    await finishCourse();
    return;
  }
  if (topicNeedsWatch(currentTopicIdx) && !isWatched(currentTopicIdx)) {
    showToast('info', 'Watch The Video First', 'Please watch the full video for this topic before moving on. This helps you understand better.', '');
    return;
  }
  if (diplomaMode) {
    const weeks = weeksSince(regDate);
    if (nextIdx > weeks) {
      showToast('info', 'Lesson Locked', 'Diploma lessons unlock one per week. Please wait for the next lesson to open.', '');
      return;
    }
  }
  openUnderstandModal();
  pendingNextIdx = nextIdx;
}

async function finishCourse() {
  const total = currentTopics.length;
  const cid = activeCourseId;
  if (!isCourseFinished(cid)) {
    if (!updateData.finished_courses) updateData.finished_courses = {};
    updateData.finished_courses[cid] = true;
    finishedCourses = updateData.finished_courses;
    userData.level_completed = 'final';
    userData.date_complet = new Date().toISOString();
    try {
      await saveUpdate({ finished_courses: finishedCourses });
      await saveUserData();
      const safe = JSON.parse(localStorage.getItem('idt_user') || '{}');
      safe.level_completed = 'final';
      localStorage.setItem('idt_user', JSON.stringify(safe));
    } catch (err) {
      showToast('error', 'Save Failed', 'Could not save your completion.', err.message || String(err));
    }
  }
  renderProgress();
  const msg = 'You have completed all ' + total + ' topics in ' + ((courseInfoMap[activeCourseId] || {}).course_name || 'this course') + '. You are now ready for the final exam to earn your certificate.';
  const cm = $('completionMsg');
  if (cm) cm.textContent = msg;
  const m = $('completionModal');
  if (m) m.classList.add('open');
}

async function handleReady() {
  closeUnderstandModal();
  if (pendingNextIdx < 0) return;
  const idx = pendingNextIdx;
  pendingNextIdx = -1;
  const batch = idx;
  if (batch % ASSESS_BATCH_SIZE === 0 && batch < currentTopics.length) {
    const key = activeCourseId + '_' + batch;
    if ((passedBatches[key] || []).indexOf(batch) !== -1) {
      await goToTopic(idx);
      return;
    }
    const failTs = lastAssessFail[key];
    if (failTs) {
      const waitMs = diplomaMode ? RETRY_DIPLOMA_MS : RETRY_REGULAR_MS;
      const remain = failTs + waitMs - Date.now();
      if (remain > 0) {
        showToast('info', 'Assessment Locked', 'You can retry this assessment in ' + formatDuration(remain) + '. Keep reading and come back.', '');
        await goToTopic(idx);
        return;
      }
    }
    openAssessment(batch);
    return;
  }
  await goToTopic(idx);
}

function formatDuration(ms) {
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (h > 0) return h + 'h ' + m + 'm';
  return m + ' minutes';
}

async function openAssessment(batch) {
  const startIdx = batch - ASSESS_BATCH_SIZE;
  const batchTopics = currentTopics.slice(Math.max(0, startIdx), batch);
  const list = $('assessTopicsList');
  if (list) {
    list.innerHTML = batchTopics.map((t) =>
      '<div class="ai-topic"><i class="fa-solid fa-circle-check"></i> Topic ' + (t.topic_number || '') + ': ' + escapeHtml(t.topic_name || '') + '</div>'
    ).join('');
  }
  const at = $('assessTitle');
  if (at) at.textContent = 'Assessment • Topics ' + (startIdx + 1) + ' - ' + batch;
  const key = activeCourseId + '_' + batch;
  const failTs = lastAssessFail[key];
  const btn = $('btnStartAssessment');
  if (failTs) {
    const waitMs = diplomaMode ? RETRY_DIPLOMA_MS : RETRY_REGULAR_MS;
    const remain = failTs + waitMs - Date.now();
    if (remain > 0) {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> Retry In ' + formatDuration(remain);
      }
      showToast('info', 'Assessment Locked', 'You can retry in ' + formatDuration(remain) + '. Read the topics again and come back.', '');
    }
  } else {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-play"></i> Start Assessment';
    }
  }
  const intro = $('assessIntro');
  if (intro) intro.classList.remove('hidden');
  const quiz = $('assessQuiz');
  if (quiz) quiz.classList.add('hidden');
  const res = $('assessResult');
  if (res) res.classList.add('hidden');
  const ov = $('assessmentOverlay');
  if (ov) ov.classList.add('open');
  window._assessBatch = batch;
}

async function startAssessmentFlow() {
  const batch = window._assessBatch || 0;
  const startIdx = Math.max(0, batch - ASSESS_BATCH_SIZE);
  const batchTopics = currentTopics.slice(startIdx, batch).map((t) => ({
    topic_number: t.topic_number,
    topic_name: t.topic_name,
    topic_text: String(t.topic_text || '').slice(0, 1800)
  }));
  if (batchTopics.length === 0) {
    showToast('error', 'No Topics', 'No topics found for this assessment.', '');
    return;
  }
  miniLoad('Creating your assessment...');
  try {
    const res = await getAssessment({
      user_id: user.id,
      course_id: activeCourseId,
      course_name: (courseInfoMap[activeCourseId] || {}).course_name || ((userData && userData.course_name) || ''),
      topics: batchTopics
    });
    const questions = res.questions || [];
    if (!questions.length) throw new Error('No questions returned');
    quizState = {
      questions: questions,
      answers: questions.map(() => ''),
      currentQ: 0,
      secondsLeft: 240,
      timer: null,
      flags: 0,
      stream: null,
      assessmentId: res.assessment_id || ('as_' + Date.now()),
      batch: batch
    };
    const camOk = await startCamera();
    if (!camOk) return;
    const intro = $('assessIntro');
    if (intro) intro.classList.add('hidden');
    const resEl = $('assessResult');
    if (resEl) resEl.classList.add('hidden');
    const quiz = $('assessQuiz');
    if (quiz) quiz.classList.remove('hidden');
    renderQuestion();
    startQuizTimer();
    attachAntiCheat();
    miniHide();
  } catch (err) {
    miniHide();
    showToast('error', 'Assessment Failed', 'Could not create the assessment. Please try again.', err.message || String(err));
  }
}

async function startCamera() {
  const video = $('quizCam');
  const lock = $('quizCamLock');
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera not supported on this device');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 360 } }, audio: false });
    quizState.stream = stream;
    video.srcObject = stream;
    await video.play().catch(() => {});
    if (lock) lock.classList.add('hidden');
    return true;
  } catch (err) {
    miniHide();
    showToast('error', 'Camera Required', 'Please allow camera access to take this assessment.', err.message || String(err));
    const msg = $('quizCamLockMsg');
    if (msg) msg.textContent = 'Camera access is required so we can verify you take the assessment honestly. Please allow camera and try again.';
    return false;
  }
}

function stopCamera() {
  if (quizState && quizState.stream) {
    quizState.stream.getTracks().forEach((t) => t.stop());
    quizState.stream = null;
  }
  const video = $('quizCam');
  if (video && video.srcObject) {
    video.srcObject = null;
  }
  const lock = $('quizCamLock');
  if (lock) lock.classList.remove('hidden');
  const msg = $('quizCamLockMsg');
  if (msg) msg.textContent = 'Camera stopped. You can close this assessment.';
}

function renderQuestion() {
  const q = quizState.questions[quizState.currentQ];
  if (!q) return;
  const card = $('questionCard');
  if (!card) return;
  const totalQ = quizState.questions.length;
  const isLast = quizState.currentQ === totalQ - 1;
  const pBtn = $('btnPrevQ');
  if (pBtn) pBtn.disabled = quizState.currentQ === 0;
  const nBtn = $('btnNextQ');
  if (nBtn) nBtn.classList.toggle('hidden', isLast);
  const sBtn = $('btnSubmitQuiz');
  if (sBtn) sBtn.classList.toggle('hidden', !isLast);
  let optionsHtml = '';
  if (q.type === 'write' || !Array.isArray(q.options) || q.options.length === 0) {
    const val = escapeHtml(quizState.answers[quizState.currentQ] || '');
    optionsHtml = '<div class="q-write"><textarea placeholder="Type your answer here..." data-q="' + quizState.currentQ + '">' + val + '</textarea></div>';
  } else {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    optionsHtml = '<div class="q-options">' + q.options.map((opt, i) => {
      const selected = quizState.answers[quizState.currentQ] === String(i);
      return '<button type="button" class="q-opt' + (selected ? ' selected' : '') + '" data-q="' + quizState.currentQ + '" data-opt="' + i + '">' +
        '<span class="q-letter">' + letters[i] + '</span><span>' + escapeHtml(opt) + '</span></button>';
    }).join('') + '</div>';
  }
  card.innerHTML =
    '<div class="question-card">' +
    '<span class="q-num"><i class="fa-solid fa-circle-question"></i> Question ' + (quizState.currentQ + 1) + ' of ' + totalQ + '</span>' +
    '<div class="q-text">' + escapeHtml(q.question || '') + '</div>' +
    optionsHtml +
    '</div>';
  card.querySelectorAll('.q-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const qi = parseInt(btn.dataset.q, 10);
      quizState.answers[qi] = btn.dataset.opt;
      renderQuestion();
    });
  });
  const ta = card.querySelector('textarea');
  if (ta) {
    ta.addEventListener('input', (e) => {
      const qi = parseInt(e.target.dataset.q, 10);
      quizState.answers[qi] = e.target.value;
    });
  }
}

function startQuizTimer() {
  if (quizState.timer) clearInterval(quizState.timer);
  quizState.timer = setInterval(() => {
    quizState.secondsLeft--;
    const m = Math.floor(quizState.secondsLeft / 60);
    const s = quizState.secondsLeft % 60;
    const qt = $('quizTimer');
    if (qt) {
      const sp = qt.querySelector('span');
      if (sp) sp.textContent = m + ':' + String(s).padStart(2, '0');
      if (quizState.secondsLeft <= 60) {
        qt.classList.add('danger');
      }
    }
    if (quizState.secondsLeft <= 0) {
      clearInterval(quizState.timer);
      submitQuiz(true);
    }
  }, 1000);
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

function antiCheatHandler() {
  if (document.hidden && quizState) {
    quizState.flags++;
    if (quizState.flags >= 2) {
      submitQuiz(true);
    } else {
      showToast('error', 'Warning!', 'Do not leave the assessment page. This is recorded.', 'Flag ' + quizState.flags + '/2');
    }
  }
}

function antiCheatCopy(e) {
  if (!quizState) return;
  e.preventDefault();
  quizState.flags++;
  if (quizState.flags >= 2) {
    submitQuiz(true);
  } else {
    showToast('error', 'Copying Not Allowed', 'Copying is not allowed during the assessment. This is recorded.', 'Flag ' + quizState.flags + '/2');
  }
}

function antiCheatBlur() {
  if (quizState) {
    quizState.flags++;
    if (quizState.flags >= 2) {
      submitQuiz(true);
    } else {
      showToast('error', 'Warning!', 'Stay on the assessment page.', 'Flag ' + quizState.flags + '/2');
    }
  }
}

async function submitQuiz(timedOut) {
  if (!quizState || quizState.submitted) return;
  quizState.submitted = true;
  isProcessingNext = true;
  if (quizState.timer) clearInterval(quizState.timer);
  detachAntiCheat();
  stopCamera();
  const qs = quizState.questions.map((q, i) => ({
    number: i + 1,
    question: q.question,
    options: q.options || [],
    type: q.type || 'mcq',
    user_answer: quizState.answers[i] || ''
  }));
  const timeSpent = Math.max(0, 240 - quizState.secondsLeft);
  miniLoad('Grading your answers...');
  try {
    const res = await gradeAssessment({
      user_id: user.id,
      course_id: activeCourseId,
      course_name: (courseInfoMap[activeCourseId] || {}).course_name || ((userData && userData.course_name) || ''),
      assessment_id: quizState.assessmentId,
      questions: qs,
      time_spent: timeSpent,
      preferred_lang: getPreferredLang(),
      flagged: quizState.flags > 0,
      timed_out: timedOut
    });
    const score = Number(res.score || 0);
    const pct = Number(res.pct || Math.round((score / qs.length) * 100));
    const passed = res.passed === true || score >= PASS_MARK;
    const results = res.results || [];
    showResult(score, pct, passed, results, timedOut, res.message || '');
    if (passed) {
      const batch = quizState.batch;
      const key = activeCourseId + '_' + batch;
      const arr = passedBatches[key] || [];
      if (arr.indexOf(batch) === -1) arr.push(batch);
      passedBatches[key] = arr;
      delete lastAssessFail[key];
      await saveUpdate({ passed_batches: passedBatches, last_assess_fail: lastAssessFail });
      const grades = Array.isArray(userData.assessment_grade) ? userData.assessment_grade : [];
      grades.push({
        assessment_id: quizState.assessmentId,
        course_id: activeCourseId,
        course_name: (courseInfoMap[activeCourseId] || {}).course_name || ((userData && userData.course_name) || ''),
        score: score,
        pct: pct,
        passed: true,
        date: new Date().toISOString(),
        time_spent: timeSpent
      });
      userData.assessment_grade = grades;
      try {
        await saveUserData();
      } catch (err) {}
      confetti();
    } else {
      const batch = quizState.batch;
      const key = activeCourseId + '_' + batch;
      lastAssessFail[key] = Date.now();
      await saveUpdate({ last_assess_fail: lastAssessFail });
      const grades = Array.isArray(userData.assessment_grade) ? userData.assessment_grade : [];
      grades.push({
        assessment_id: quizState.assessmentId,
        course_id: activeCourseId,
        score: score,
        pct: pct,
        passed: false,
        date: new Date().toISOString()
      });
      userData.assessment_grade = grades;
      try {
        await saveUserData();
      } catch (err) {}
      showToast('error', 'Keep Going!', 'You scored ' + score + '/' + qs.length + '. Read the topics again and retry in ' + (diplomaMode ? '1 week' : '42 hours') + '.');
    }
    miniHide();
  } catch (err) {
    miniHide();
    showToast('error', 'Grading Failed', 'Could not grade your assessment. Please try again.', err.message || String(err));
    quizState.submitted = false;
  } finally {
    isProcessingNext = false;
  }
}

function showResult(score, pct, passed, results, timedOut, message) {
  const quiz = $('assessQuiz');
  if (quiz) quiz.classList.add('hidden');
  const res = $('assessResult');
  if (res) res.classList.remove('hidden');
  const ring = $('scoreRing');
  if (ring) {
    const deg = Math.round((pct / 100) * 360);
    ring.style.background = 'conic-gradient(' + (passed ? 'var(--green)' : 'var(--rose)') + ' ' + deg + 'deg, rgba(124,58,237,.1) ' + deg + 'deg)';
  }
  const sp = $('scorePct');
  if (sp) sp.textContent = pct + '%';
  const head = $('resultHead');
  if (head) {
    if (passed) {
      head.textContent = 'Congratulations! 🎉';
      head.className = 'result-head pass';
    } else {
      head.textContent = 'Almost There!';
      head.className = 'result-head fail';
    }
  }
  const sub = $('resultSub');
  if (sub) {
    sub.textContent = message || (passed
      ? 'You passed this assessment. Excellent work! You can continue learning.'
      : 'You scored below the pass mark (' + PASS_MARK + '/' + (quizState.questions.length || 5) + '). Read the topics again and retry.');
  }
  const totalQ = quizState.questions.length || 5;
  const summary = $('resultSummary');
  if (summary) {
    summary.innerHTML =
      '<div class="rs-row"><span>Total Questions</span><b>' + totalQ + '</b></div>' +
      '<div class="rs-row"><span>Correct Answers</span><b class="ok">' + (results.filter((r) => r.is_correct === true).length || score) + '</b></div>' +
      '<div class="rs-row"><span>Wrong Answers</span><b class="bad">' + (results.filter((r) => r.is_correct === false).length || Math.max(0, totalQ - score)) + '</b></div>' +
      '<div class="rs-row"><span>Pass Mark</span><b>' + PASS_MARK + ' / ' + totalQ + '</b></div>' +
      '<div class="rs-row"><span>Time Used</span><b>' + Math.max(0, 240 - quizState.secondsLeft) + 's</b></div>';
  }
  let listHtml = '';
  results.forEach((r, i) => {
    const ok = r.is_correct === true;
    const skipped = !r.user_answer;
    const mark = ok ? '<span class="ri-mark correct">✓ Correct</span>' : (skipped ? '<span class="ri-mark skipped">Skipped</span>' : '<span class="ri-mark wrong">✖ Wrong</span>');
    const userAns = r.user_answer || '(no answer)';
    const correctAns = r.correct_answer != null ? r.correct_answer : '';
    listHtml += '<div class="result-item">' +
      '<div class="ri-head"><i class="fa-solid ' + (ok ? 'fa-circle-check' : (skipped ? 'fa-circle-minus' : 'fa-circle-xmark')) + '" style="color:' + (ok ? '#10b981' : (skipped ? '#94a3b8' : '#f43f5e')) + '"></i> Question ' + (i + 1) + mark + '</div>' +
      '<div class="ri-q">' + escapeHtml(r.question || '') + '</div>' +
      '<div class="ri-ans"><span class="' + (ok ? 'ok' : 'bad') + '">Your answer: ' + escapeHtml(userAns) + '</span>' +
      (ok ? '' : '<br><span class="ok">Correct answer: ' + escapeHtml(correctAns) + '</span>') + '</div>' +
      (r.explanation ? '<div class="ri-explain"><b><i class="fa-solid fa-lightbulb"></i> Explanation:</b> ' + escapeHtml(r.explanation) + '</div>' : '') +
      '</div>';
  });
  const list = $('resultList');
  if (list) list.innerHTML = listHtml || '<div class="result-item">No detailed breakdown available.</div>';
  const btnGoExam = $('btnGoExam');
  const btnCont = $('btnContinueStudy');
  const atFinal = currentTopicIdx >= currentTopics.length - 1;
  if (btnCont && btnGoExam) {
    if (passed && atFinal) {
      btnCont.classList.add('hidden');
      btnGoExam.classList.remove('hidden');
    } else {
      btnCont.classList.remove('hidden');
      btnGoExam.classList.add('hidden');
    }
  }
  if (timedOut) {
    showToast('error', 'Time Up', 'The 4 minutes finished. Your answers were submitted automatically.', '');
  }
  window._lastResults = results;
  window._lastScore = score;
  window._lastPct = pct;
  window._lastPassed = passed;
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
  out = out.replace(/`([^`]+)`/g, '<code style="background:rgba(124,58,237,.1);color:#6d28d9;padding:2px 6px;border-radius:6px;font-size:12px;font-family:Consolas,monospace">$1</code>');
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
      html += '<h' + Math.min(lvl + 2, 6) + ' style="font-size:' + (18 - lvl) + 'px;font-weight:800;margin:10px 0 6px;color:var(--ink)">' + h[2] + '</h' + Math.min(lvl + 2, 6) + '>';
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
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      html += '<img src="' + img[2] + '" alt="' + img[1] + '" style="max-width:100%;border-radius:12px;margin:8px 0;display:block">';
      return;
    }
    const link = line.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      html += '<a href="' + link[2] + '" target="_blank" rel="noopener" style="color:#7c3aed;font-weight:700">' + link[1] + '</a><br>';
      return;
    }
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
    const cells = row.replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
    const isHeader = ri === 0 || /^[-:\s|]+$/.test(rows[ri]);
    if (/^[-:\s|]+$/.test(rows[ri])) return;
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
      if (nl > -1) {
        code = code.slice(nl + 1);
      }
      html += '<pre style="display:block;background:#0f172a;color:#e2e8f0;padding:13px;border-radius:12px;overflow-x:auto;font-family:Consolas,monospace;font-size:12px;margin:8px 0;white-space:pre">' + escapeHtml(code) + '</pre>';
    } else {
      html += inlineMarkdown(parts[i]);
    }
  }
  return html;
}

function addChatMessage(role, content) {
  const msgs = $('chatMsgs');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'chat-bubble ' + role;
  if (role === 'ai') {
    div.innerHTML = '<div class="cb-meta"><i class="fa-solid fa-robot"></i> My IDT Academy Teacher</div>' + markdownToHtml(content);
  } else {
    div.textContent = content;
  }
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function addTypingIndicator() {
  const msgs = $('chatMsgs');
  if (!msgs) return null;
  const div = document.createElement('div');
  div.className = 'chat-typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function saveChatHistory() {
  chatHistories[activeCourseId] = (chatHistories[activeCourseId] || []).slice(-12);
  saveUpdate({ chat_history: chatHistories });
}

async function handleChatSubmit(e) {
  e.preventDefault();
  const input = $('chatInput');
  const sendBtn = $('chatSend');
  if (!input) return;
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  if (sendBtn) sendBtn.disabled = true;
  addChatMessage('user', q);
  const history = (chatHistories[activeCourseId] || []).slice(-8);
  const typing = addTypingIndicator();
  try {
    const res = await askQuestion({
      user_id: user.id,
      course_id: activeCourseId,
      course_name: (courseInfoMap[activeCourseId] || {}).course_name || ((userData && userData.course_name) || ''),
      topic_name: (currentTopic && currentTopic.topic_name) || '',
      topic_text: String((currentTopic && currentTopic.topic_text) || '').slice(0, 2500),
      question: q,
      history: history,
      preferred_lang: getPreferredLang()
    });
    const answer = res.answer || res.message || 'Sorry, I could not answer that. Please try again.';
    if (typing) typing.remove();
    addChatMessage('ai', answer);
    history.push({ role: 'user', content: q.slice(0, 600) });
    history.push({ role: 'assistant', content: answer.slice(0, 2000) });
    chatHistories[activeCourseId] = history;
    saveChatHistory();
  } catch (err) {
    if (typing) typing.remove();
    addChatMessage('ai', 'I am having trouble connecting right now. Please try again in a moment. (' + (err.message || 'error') + ')');
  }
  if (sendBtn) sendBtn.disabled = false;
  input.focus();
}

function openChat() {
  const msgs = $('chatMsgs');
  if (msgs) msgs.innerHTML = '';
  addChatMessage('ai', 'Hello **' + escapeHtml((userData && userData.full_name) || 'student') + '**! 👋\n\nI am your **IDT Academy Teacher**. Ask me anything about the topic you are reading. You can ask in any language — Hausa, Yoruba, Igbo, French, Spanish, English and more.\n\nExample: *"Explain the difference between RAM and ROM with examples."*');
  const hist = chatHistories[activeCourseId] || [];
  hist.forEach((m) => {
    if (m.role === 'user') addChatMessage('user', m.content);
    if (m.role === 'assistant') addChatMessage('ai', m.content);
  });
  const ov = $('chatOverlay');
  if (ov) ov.classList.add('open');
  setTimeout(() => {
    const ci = $('chatInput');
    if (ci) ci.focus();
  }, 300);
}

async function handleExplain(lang) {
  if (!currentTopic) return;
  const grid = $('langGrid');
  if (grid) grid.classList.add('hidden');
  const row = $('otherLangRow');
  if (row) row.classList.add('hidden');
  const resEl = $('explainResult');
  if (resEl) {
    resEl.classList.add('hidden');
    resEl.innerHTML = '';
  }
  const note = $('explainNote');
  if (note) note.textContent = '';
  miniLoad('Explaining in ' + lang + '...');
  try {
    const res = await explainText({
      user_id: user.id,
      course_id: activeCourseId,
      course_name: (courseInfoMap[activeCourseId] || {}).course_name || ((userData && userData.course_name) || ''),
      topic_name: currentTopic.topic_name || '',
      topic_text: String(currentTopic.topic_text || '').slice(0, 3000),
      target_lang: lang
    });
    const explanation = res.explanation || res.message || 'No explanation returned.';
    const result = $('explainResult');
    if (result) {
      result.innerHTML = '<b style="display:block;color:#a78bfa;margin-bottom:8px"><i class="fa-solid fa-language"></i> Explanation in ' + escapeHtml(lang) + '</b>' + markdownToHtml(explanation);
      result.classList.remove('hidden');
    }
    if (note) note.textContent = 'You can also ask questions about this explanation using "Ask Question".';
    if (res.lang_detected || res.language) {
      if (note) note.textContent = 'Explained in ' + res.language + '. You can ask more questions with "Ask Question".';
    }
    setPreferredLang(lang);
    miniHide();
    showToast('success', 'Explanation Ready', 'Here is the explanation in ' + lang + '.');
  } catch (err) {
    miniHide();
    showToast('error', 'Explain Failed', 'Could not create the explanation. Please try again.', err.message || String(err));
  }
}

async function loadPdfLib() {
  if (window.jspdf) return window.jspdf;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.jspdf;
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

async function downloadResultPdf() {
  miniLoad('Preparing your PDF...');
  try {
    await loadPdfLib();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const w = doc.internal.pageSize.getWidth();
    const results = window._lastResults || [];
    const score = window._lastScore || 0;
    const pct = window._lastPct || 0;
    const passed = window._lastPassed || false;
    const courseName = (courseInfoMap[activeCourseId] || {}).course_name || ((userData && userData.course_name) || '');
    const studentName = (userData && userData.full_name) || '';
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
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
    doc.text('ASSESSMENT RESULT', w / 2, 62, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 58, 107);
    let y = 72;
    doc.text('Student Name:  ' + studentName, 16, y);
    doc.text('Date:  ' + dateStr, 120, y);
    y += 7;
    doc.text('Course:  ' + courseName, 16, y);
    doc.text('Pass Mark:  3 / 5 (60%)', 120, y);
    y += 7;
    doc.text('Score:  ' + score + ' / 5   (' + pct + '%)', 16, y);
    doc.text('Status:  ' + (passed ? 'PASSED' : 'NOT PASSED'), 120, y);
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
      const mark = ok ? '✓' : '✖';
      doc.setTextColor(ok ? 16 : 244, ok ? 185 : 63, ok ? 129 : 94);
      doc.text(mark, 18, y);
      doc.setTextColor(30, 27, 75);
      doc.text('Q' + (i + 1) + ': ' + String(r.question || '').slice(0, 60), 24, y);
      y += 5;
      doc.setTextColor(109, 106, 138);
      const ansText = 'Your answer: ' + String(r.user_answer || '(no answer)') + (ok ? '' : '  |  Correct: ' + String(r.correct_answer != null ? r.correct_answer : ''));
      const lines = doc.splitTextToSize(ansText, 170);
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
      doc.setFont('cursive', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(30, 27, 75);
      doc.text('IDT Academy', w - 55, y + 10);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(109, 106, 138);
    doc.text('Signature', w - 55, y + 16);
    doc.text('Student Signature', 16, y + 16);
    doc.text('IDT Academy • Official Assessment Document', w / 2, y + 26, { align: 'center' });
    doc.save('IDT_Assessment_Result_' + studentName.replace(/\s+/g, '_') + '.pdf');
    miniHide();
    showToast('success', 'PDF Downloaded', 'Your assessment result PDF has been downloaded. You can print it anytime.');
  } catch (err) {
    miniHide();
    showToast('error', 'PDF Failed', 'Could not create the PDF.', err.message || String(err));
  }
}

async function emailResult() {
  if (!user || !userData) return;
  miniLoad('Emailing your result...');
  try {
    await loadPdfLib();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const w = doc.internal.pageSize.getWidth();
    const results = window._lastResults || [];
    const score = window._lastScore || 0;
    const pct = window._lastPct || 0;
    const passed = window._lastPassed || false;
    const courseName = (courseInfoMap[activeCourseId] || {}).course_name || ((userData && userData.course_name) || '');
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const logo = await imageToDataUrl('https://i.imgur.com/oyqM5oF.png');
    if (logo) doc.addImage(logo, 'PNG', (w - 20) / 2, 12, 20, 20);
    doc.setTextColor(30, 27, 75);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Intelligent Digital Technology Academy', w / 2, 40, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(109, 106, 138);
    doc.text('www.idtacademy.com.ng', w / 2, 46, { align: 'center' });
    doc.setDrawColor(124, 58, 237);
    doc.line(14, 51, w - 14, 51);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 27, 75);
    doc.text('ASSESSMENT RESULT', w / 2, 60, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let y = 70;
    doc.text('Student: ' + ((userData && userData.full_name) || ''), 16, y);
    doc.text('Date: ' + dateStr, 120, y);
    y += 7;
    doc.text('Course: ' + courseName, 16, y);
    y += 7;
    doc.text('Score: ' + score + '/5 (' + pct + '%)  Status: ' + (passed ? 'PASSED' : 'NOT PASSED'), 16, y);
    y += 6;
    doc.setFontSize(9);
    results.forEach((r, i) => {
      if (y > 265) { doc.addPage(); y = 20; }
      const ok = r.is_correct === true;
      doc.text((ok ? '✓' : '✖') + ' Q' + (i + 1) + ': ' + String(r.question || '').slice(0, 50), 18, y);
      y += 5;
    });
    const pdfBase64 = doc.output('datauristring');
    const res = await sendResultEmail({
      email: userData.email || user.email,
      full_name: (userData && userData.full_name) || '',
      course_name: courseName,
      score: score,
      pct: pct,
      passed: passed,
      date: dateStr,
      pdf_base64: pdfBase64
    });
    miniHide();
    showToast('success', 'Email Sent!', 'Your result has been sent to ' + (userData.email || user.email) + '. Check your inbox (and spam folder).');
  } catch (err) {
    miniHide();
    showToast('error', 'Email Failed', 'Could not send the email. Please try again.', err.message || String(err));
  }
}

function openPendingGate() {
  const app = $('app');
  if (app) app.classList.add('hidden');
  const gate = $('pendingGate');
  if (gate) gate.classList.add('open');
  const nameEl = $('pendingStudentName');
  if (nameEl) nameEl.textContent = (userData && userData.full_name) || 'Student';
  renderPendingSummary();
  renderUserIdCard();
}

function startStatusWatcher() {
  if (statusWatcher) clearInterval(statusWatcher);
  statusWatcher = setInterval(async () => {
    const gateEl = $('pendingGate');
    if (!gateEl) return;
    const gateOpen = gateEl.classList.contains('open');
    if (!gateOpen) {
      clearInterval(statusWatcher);
      statusWatcher = null;
      return;
    }
    if (isCreatingPayment) return;
    const payOv = $('paymentOverlay');
    if (payOv && payOv.classList.contains('open')) return;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_data')
        .eq('id', user.id)
        .maybeSingle();
      if (error) return;
      const fresh = (data && data.user_data) || {};
      const freshStatus = String(fresh.status || 'pending').toLowerCase();
      const accountType = String(fresh.account_type || '').toLowerCase();
      const effective = (accountType === 'partner') ? 'active' : freshStatus;
      if (effective === 'active' && fresh.course_id) {
        clearInterval(statusWatcher);
        statusWatcher = null;
        if (paymentState && paymentState.timer) clearInterval(paymentState.timer);
        userData = fresh;
        gateEl.classList.remove('open');
        showToast('success', 'Payment Confirmed! 🎉', 'Congratulations! Your payment was successful. Your dashboard is now unlocked.');
        await loadDashboard();
      }
    } catch (err) {}
  }, 30000);
}

function getPrimaryCourse() {
  const fromData = {
    course_id: (userData && userData.course_id) || '',
    course_name: (userData && userData.course_name) || '',
    course_number: (userData && userData.course_number) || '',
    course_price: Number((userData && userData.course_price) || 0)
  };
  if (fromData.course_id || fromData.course_price) return fromData;
  const c = pendingChoiceCourse();
  if (c) return c;
  const list = courseList[0] || {};
  return {
    course_id: list.course_id || '',
    course_name: list.course_name || 'Selected Course',
    course_number: list.course_number || '000',
    course_price: Number(list.course_price || 0)
  };
}

async function startPayment() {
  if (isCreatingPayment) return;
  const course = getPrimaryCourse();
  const price = Number(course.course_price || 0);
  if (!course.course_id || !price) {
    showToast('error', 'Payment Error', 'Please select a course first before paying.', '');
    return;
  }
  isCreatingPayment = true;
  miniLoad('Creating payment details...');
  try {
    const res = await createPayment({
      user_id: user.id,
      email: (userData && userData.email) || user.email,
      full_name: (userData && userData.full_name) || '',
      course_id: course.course_id,
      course_name: course.course_name,
      price: price
    });
    const accountNumber = res.account_number || res.accountNumber || '';
    const accountName = res.account_name || res.accountName || 'IDT ACADEMY';
    const reference = res.reference || res.ref || '';
    const amount = Number(res.amount || price || 0);
    const minutes = Number(res.expires_in_minutes || 30);
    paymentState = {
      reference: reference,
      endTime: Date.now() + minutes * 60 * 1000,
      timer: null,
      verified: false
    };
    const pa = $('payAmount');
    if (pa) pa.textContent = formatMoney(amount);
    const pan = $('payAccountNumber');
    if (pan) pan.textContent = accountNumber;
    const paname = $('payAccountName');
    if (paname) paname.textContent = accountName;
    const payRef = $('payReference');
    if (payRef && payRef.childNodes[0]) {
      payRef.childNodes[0].nodeValue = reference;
      const sm = payRef.querySelector('small');
      if (sm) sm.textContent = 'Use this reference when making your transfer';
    }
    const bca = $('btnCopyAccount');
    if (bca) bca.dataset.copy = accountNumber;
    const bcr = $('btnCopyRef');
    if (bcr) bcr.dataset.copy = reference;
    const ov = $('paymentOverlay');
    if (ov) ov.classList.add('open');
    startCountdown();
    startVerifyPolling();
    startStatusWatcher();
    miniHide();
    showToast('info', 'Payment Details Ready', 'Transfer the exact amount to the account below before the timer ends. Your dashboard unlocks automatically after payment.');
  } catch (err) {
    miniHide();
    const rawMsg = (err && err.message) || String(err) || 'Unknown API error';
    showToast('error', 'API Error', 'The payment service returned an error (it may be a 404 or network issue). We logged the details below so we can fix it fast. Please try again.', rawMsg);
  } finally {
    isCreatingPayment = false;
  }
}

function startCountdown() {
  if (!paymentState) return;
  if (paymentState.timer) clearInterval(paymentState.timer);
  paymentState.timer = setInterval(() => {
    const remain = paymentState.endTime - Date.now();
    const cd = $('payCountdown');
    if (remain <= 0) {
      clearInterval(paymentState.timer);
      const ov = $('paymentOverlay');
      if (ov) ov.classList.remove('open');
      showToast('error', 'Payment Expired', 'The payment window expired. Please tap Pay Now to create a new one.', '');
      return;
    }
    const m = Math.floor(remain / 60000);
    const s = Math.floor((remain % 60000) / 1000);
    if (cd) cd.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }, 1000);
}

function startVerifyPolling() {
  let tries = 0;
  const poll = setInterval(async () => {
    tries++;
    if (!paymentState || paymentState.verified || tries > 90) {
      clearInterval(poll);
      return;
    }
    try {
      const res = await verifyPayment({ reference: paymentState.reference, user_id: user.id });
      if (res.status === 'active' || (res.paid === true)) {
        clearInterval(poll);
        paymentState.verified = true;
        if (paymentState.timer) clearInterval(paymentState.timer);
        if (statusWatcher) { clearInterval(statusWatcher); statusWatcher = null; }
        const ov = $('paymentOverlay');
        if (ov) ov.classList.remove('open');
        showToast('success', 'Payment Confirmed! 🎉', 'Congratulations! Your payment was successful. Your dashboard is now unlocked.');
        await refreshProfile();
        await loadDashboard();
      }
    } catch (err) {}
  }, 20000);
}

async function loadDashboard() {
  showLoading();
  try {
    await refreshProfile();
    await loadUpdateTable();
    const status = computeStatus();
    courseList = collectCourses(userData);
    await loadCourseInfos();
    renderMenu();
    renderUserGreet();
    if (status !== 'active' || courseList.length === 0) {
      const app = $('app');
      if (app) app.classList.add('hidden');
      const gate = $('pendingGate');
      if (gate) gate.classList.add('open');
      const nameEl = $('pendingStudentName');
      if (nameEl) nameEl.textContent = (userData && userData.full_name) || 'Student';
      await loadPendingCourses();
      const c = pendingChoiceCourse();
      if (c) {
        const pcn = $('pendingCourseName');
        if (pcn) pcn.textContent = c.course_name || 'Selected Course';
        const pcnum = $('pendingCourseNumber');
        if (pcnum) pcnum.textContent = c.course_number || '000';
        const pp = $('pendingPrice');
        if (pp) pp.textContent = formatMoney(c.course_price || 0);
        const info = courseInfoMap[c.course_id] || {};
        const img = $('pendingCourseImg');
        if (img && info.image_url) {
          img.src = info.image_url;
        }
      }
      renderUserIdCard();
      startStatusWatcher();
      hideLoading();
      return;
    }
    const gate = $('pendingGate');
    if (gate) gate.classList.remove('open');
    const cid = pickDefaultCourse();
    if (!cid) {
      hideLoading();
      showToast('error', 'No Course Found', 'No course is linked to your account. Please contact support.', '');
      return;
    }
    await selectCourse(cid);
    renderUserIdCard();
    const app = $('app');
    if (app) app.classList.remove('hidden');
    startSessionClock();
    loadAd();
    hideLoading();
    showToast('success', 'Welcome Back!', 'Happy learning ' + ((userData && userData.full_name) || '') + '! Keep going, you are doing great.');
  } catch (err) {
    hideLoading();
    showToast('error', 'Dashboard Error', 'Could not load your dashboard.', err.message || String(err));
  }
}

onReady(() => {
  on('menuBtn', () => {
    const sm = $('sideMenu');
    if (sm) sm.classList.add('open');
  });

  on('menuClose', () => {
    const sm = $('sideMenu');
    if (sm) sm.classList.remove('open');
  });

  on('menuLogout', () => {
    localStorage.removeItem('idt_user');
    showToast('info', 'Logged Out', 'You have been logged out. Redirecting to login...');
    setTimeout(() => window.location.replace('register.html'), 1200);
  });

  on('btnPayNow', startPayment);

  on('paymentClose', () => {
    const ov = $('paymentOverlay');
    if (ov) ov.classList.remove('open');
  });

  on('btnCopyAccount', async (e) => {
    const btn = e.target.closest('.mini-copy');
    if (!btn) return;
    const val = btn.dataset.copy;
    if (!val) return;
    try {
      await copyText(val);
      btn.classList.add('done');
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      showToast('success', 'Copied!', 'Account number copied to clipboard.');
      setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 2000);
    } catch (err) {
      showToast('error', 'Copy Failed', 'Could not copy.', err.message);
    }
  });

  on('btnCopyRef', async (e) => {
    const btn = e.target.closest('.mini-copy');
    if (!btn) return;
    const val = btn.dataset.copy;
    if (!val) return;
    try {
      await copyText(val);
      btn.classList.add('done');
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      showToast('success', 'Copied!', 'Payment reference copied to clipboard.');
      setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 2000);
    } catch (err) {
      showToast('error', 'Copy Failed', 'Could not copy.', err.message);
    }
  });

  document.querySelectorAll('.copy-user-id').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!user || !user.id) return;
      try {
        await copyText(user.id);
        btn.classList.add('done');
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        showToast('success', 'User ID Copied!', 'Your User ID has been copied to clipboard.');
        setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 2000);
      } catch (err) {
        showToast('error', 'Copy Failed', 'Could not copy your User ID.', err.message);
      }
    });
  });

  on('btnCopyRefLink', async (e) => {
    const btn = e.currentTarget;
    try {
      await copyText(buildReferralLink());
      btn.classList.add('done');
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      showToast('success', 'Referral Link Copied!', 'Share this link with your friends and earn ₦1,500 when they pay for any course.');
      setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 2000);
    } catch (err) {
      showToast('error', 'Copy Failed', 'Could not copy the link.', err.message);
    }
  });

  on('btnOpenReferralPage', () => {
    window.location.href = 'referral.html?user_id=' + encodeURIComponent(user.id) + '&code=' + encodeURIComponent((userData && userData.referral_code) || '');
  });

  document.querySelectorAll('.social-chip').forEach((chip) => {
    chip.addEventListener('click', async () => {
      const link = buildReferralLink();
      const text = 'Join me at IDT Academy! Learn modern skills online. Use my referral link: ' + link;
      if (chip.classList.contains('wa')) {
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
        return;
      }
      if (chip.classList.contains('x')) {
        window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
        return;
      }
      if (chip.classList.contains('fb')) {
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link), '_blank');
        return;
      }
      try {
        await copyText(link);
        showToast('success', 'Link Copied!', 'Share it on ' + chip.textContent.trim() + ' and earn ₦1,500 per referral.');
      } catch (err) {
        showToast('error', 'Copy Failed', 'Could not copy.', err.message);
      }
    });
  });

  on('btnPrevTopic', () => {
    if (currentTopicIdx > 0) goToTopic(currentTopicIdx - 1);
  });

  on('btnNextTopic', () => {
    if (isProcessingNext) return;
    advanceTopic();
  });

  on('btnNotReady', () => {
    closeUnderstandModal();
    pendingNextIdx = -1;
    showToast('info', 'Good Choice', 'Take your time. Read the topic again and make sure you understand before moving on.');
  });

  on('btnReady', () => {
    handleReady();
  });

  on('btnCopyText', async (e) => {
    const btn = e.currentTarget;
    try {
      await copyText(currentTopic.topic_text || '');
      btn.classList.add('done');
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      showToast('success', 'Text Copied!', 'The full topic text was copied to your clipboard.');
      setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 2000);
    } catch (err) {
      showToast('error', 'Copy Failed', 'Could not copy the text.', err.message);
    }
  });

  on('btnAskQuestion', openChat);

  on('chatClose', () => {
    const ov = $('chatOverlay');
    if (ov) ov.classList.remove('open');
  });

  onSubmit('chatForm', handleChatSubmit);

  on('btnExplainLang', () => {
    const row = $('otherLangRow');
    if (row) row.classList.add('hidden');
    const grid = $('langGrid');
    if (grid) grid.classList.remove('hidden');
    const resEl = $('explainResult');
    if (resEl) resEl.classList.add('hidden');
    const note = $('explainNote');
    if (note) note.textContent = '';
    const ov = $('explainOverlay');
    if (ov) ov.classList.add('open');
  });

  on('explainClose', () => {
    const ov = $('explainOverlay');
    if (ov) ov.classList.remove('open');
  });

  document.querySelectorAll('.lang-btn[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleExplain(btn.dataset.lang);
    });
  });

  on('langOtherBtn', () => {
    const row = $('otherLangRow');
    if (!row) return;
    row.classList.toggle('hidden');
    if (!row.classList.contains('hidden')) {
      const inp = $('otherLangInput');
      if (inp) inp.focus();
    }
  });

  on('btnSendOtherLang', () => {
    const inp = $('otherLangInput');
    if (!inp) return;
    const lang = inp.value.trim();
    if (!lang) {
      showToast('error', 'Language Required', 'Please type the language you want.', '');
      return;
    }
    handleExplain(lang);
  });

  on('assessClose', () => {
    const ov = $('assessmentOverlay');
    if (ov) ov.classList.remove('open');
    if (quizState && quizState.stream) {
      stopCamera();
    }
    if (quizState && quizState.timer) clearInterval(quizState.timer);
    detachAntiCheat();
  });

  on('btnStartAssessment', startAssessmentFlow);

  on('btnPrevQ', () => {
    if (quizState && quizState.currentQ > 0) {
      quizState.currentQ--;
      renderQuestion();
    }
  });

  on('btnNextQ', () => {
    if (!quizState) return;
    const q = quizState.questions[quizState.currentQ];
    if (q && q.type !== 'write' && Array.isArray(q.options) && q.options.length && quizState.answers[quizState.currentQ] === '') {
      showToast('info', 'Choose An Answer', 'Please select an answer before continuing.', '');
      return;
    }
    if (quizState.currentQ < quizState.questions.length - 1) {
      quizState.currentQ++;
      renderQuestion();
    }
  });

  on('btnSubmitQuiz', () => {
    submitQuiz(false);
  });

  on('btnDownloadPdf', downloadResultPdf);

  on('btnEmailResult', emailResult);

  on('btnContinueStudy', () => {
    const ov = $('assessmentOverlay');
    if (ov) ov.classList.remove('open');
    if (window._assessBatch > 0) {
      const batch = window._assessBatch;
      window._assessBatch = 0;
      goToTopic(batch);
    }
  });

  on('btnGoExam', () => {
    const ov = $('assessmentOverlay');
    if (ov) ov.classList.remove('open');
    window.location.href = 'exam.html?course_id=' + encodeURIComponent(activeCourseId) + '&user_id=' + encodeURIComponent(user.id);
  });

  on('btnGoExamModal', () => {
    const m = $('completionModal');
    if (m) m.classList.remove('open');
    window.location.href = 'exam.html?course_id=' + encodeURIComponent(activeCourseId) + '&user_id=' + encodeURIComponent(user.id);
  });

  on('sideMenu', (e) => {
    const sm = $('sideMenu');
    if (e.target === sm && sm) sm.classList.remove('open');
  });

  window.__idtDashboardLoaded = true;

  document.documentElement.classList.add('ready');
});

document.addEventListener('DOMContentLoaded', async () => {
  showLoading();
  try {
    const raw = localStorage.getItem('idt_user');
    if (!raw) {
      window.location.replace('register.html');
      return;
    }
    user = JSON.parse(raw);
    if (!user || !user.id) {
      localStorage.removeItem('idt_user');
      window.location.replace('register.html');
      return;
    }
    await loadDashboard();
  } catch (err) {
    hideLoading();
    showToast('error', 'Error', 'Something went wrong. Please login again.', err.message || String(err));
    setTimeout(() => window.location.replace('register.html'), 2500);
  }
  window.addEventListener('load', () => {
    setTimeout(hideLoading, 600);
  });
});

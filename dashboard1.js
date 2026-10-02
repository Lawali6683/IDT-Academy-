import { supabase } from './supabase.js';
import { askQuestion, explainText, getAssessment, gradeAssessment, createPayment, verifyPayment, sendResultEmail } from './ai.js';

window.__idtDashboardLoaded = false;

const APP_VERSION = '2026-10-01.1';

const AI_ICON_URL = 'https://i.imgur.com/DPrM9ZJ.png';
const SECURITY_ICON_URL = 'https://i.imgur.com/rMW6FMN.png';
const LOGO_URL = 'https://i.imgur.com/oyqM5oF.png';
const SIGN_CHAIR_URL = 'https://i.imgur.com/z8HOr4D.png';
const SIGN_CEO_URL = 'https://i.imgur.com/leqHq9I.png';

const PASS_MARK = 3;
const MAX_MARKS = 6;
const TOTAL_QUESTIONS = 5;
const WRITE_MARKS = 2;
const RETRY_MS = 2 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const REGULAR_WATCH_SECONDS = 90;
const ASSESS_BATCH_SIZE = 3;
const STATUS_POLL_MS = 4000;
const DATA_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const QUIZ_SECONDS = 180;
const AI_TIMEOUT_MS = 60000;

const $ = (id) => document.getElementById(id);

let toastWrap = null;
let securityShieldEl = null;
let user = null;
let profileData = null;
let userData = null;
let updateData = null;
let updateReady = false;
let courseList = [];
let courseInfoMap = {};
let topicsMap = {};
let activeCourseId = '';
let currentTopics = [];
let pendingChatImages = [];
let currentTopicIdx = 0;
let currentTopic = null;
let watchedMap = {};
let readingHistory = {};
let chatHistories = {};
let passedBatches = {};
let lastAssessFail = {};
let assessmentHistory = [];
let preferredLang = 'english';
let aiSelectedLang = 'english';
let adList = [];
let adIdx = 0;
let adTimer = null;
let sessionSeconds = 0;
let sessionTimer = null;
let pendingNextIdx = -1;
let quizState = null;
let camStream = null;
let lastResult = null;
let assessBatch = 0;
let assessStarting = false;
let retryTimer = null;
let lastFlagAt = 0;
let quizStartedAt = 0;
let paymentState = null;
let diplomaMode = false;
let videoWatchTimer = null;
let videoWatched = false;
let isProcessingNext = false;
let regDate = null;
let allCourses = [];
let statusPollTimer = null;
let aiBusy = false;
let runnerTopicKey = '';
let codeFrame = null;
let codeHandler = null;
let codeTimeout = null;

function injectExtraStyles() {
  if (document.getElementById('idt-extra-style')) return;
  const st = document.createElement('style');
  st.id = 'idt-extra-style';
  st.textContent =
    '.security-shield{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99998;display:flex;flex-direction:column;align-items:center;gap:8px;background:#fff;border:2px solid #7c3aed;border-radius:22px;padding:18px 26px;box-shadow:0 30px 70px rgba(15,12,41,.4);animation:shieldShow .3s ease,shieldTurn 2.4s ease-in-out .3s infinite;pointer-events:none}' +
    '.security-shield.alert.fade{animation:none;transform:translate(-50%,-50%)}' +
    '.ov-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid rgba(124,58,237,.15);flex-shrink:0}' +
    '@keyframes typingDot{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}' +
    '@keyframes chatIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}' +
    'body.quiz-lock{-webkit-user-select:none;user-select:none}' +
    'body.quiz-lock textarea{-webkit-user-select:text;user-select:text}' +
    '.q-opt:disabled{cursor:not-allowed;opacity:.75}' +
    '.q-write textarea:disabled{opacity:.75;cursor:not-allowed}' +
    '.q-kind{display:inline-block;margin-left:8px;font-size:10.5px;font-weight:800;color:#0e7490;background:rgba(6,182,212,.12);padding:4px 10px;border-radius:999px}' +
    '#assessLockNote{font-size:12px;color:#b45309;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:12px;padding:10px 12px;margin-bottom:12px;line-height:1.55;text-align:left}' +
    '#btnReviewTopics{margin-top:0}' +
    '.ri-mark.partial{background:rgba(245,158,11,.16);color:#b45309}' +
    '.cf-bubble code{background:rgba(124,58,237,.1);padding:1px 6px;border-radius:6px}';
  document.head.appendChild(st);
}

function showSecurityShield(mode) {
  try {
    if (securityShieldEl) securityShieldEl.remove();
    securityShieldEl = document.createElement('div');
    securityShieldEl.className = 'security-shield' + (mode === 'alert' ? ' alert' : '');
    securityShieldEl.innerHTML = '<img src="' + SECURITY_ICON_URL + '" alt="Security"><span>' + (mode === 'alert' ? 'Security Alert!' : 'AI Security Active') + '</span>';
    document.body.appendChild(securityShieldEl);
    const el = securityShieldEl;
    setTimeout(() => { el.classList.add('fade'); }, 1800);
    setTimeout(() => {
      el.remove();
      if (securityShieldEl === el) securityShieldEl = null;
    }, 2600);
  } catch (_) {}
}

function ensureAppFreshness() {
  try {
    const stored = localStorage.getItem('idt_app_version');
    if (stored && stored !== APP_VERSION) {
      try {
        if (window.caches && caches.keys) {
          caches.keys().then((names) => {
            names.forEach((n) => caches.delete(n));
          }).catch(() => {});
        }
      } catch (_) {}
      try { sessionStorage.clear(); } catch (_) {}
      try {
        const keep = {};
        ['idt_user'].forEach((k) => {
          const v = localStorage.getItem(k);
          if (v != null) keep[k] = v;
        });
        localStorage.clear();
        Object.keys(keep).forEach((k) => localStorage.setItem(k, keep[k]));
      } catch (_) {}
      try { localStorage.setItem('idt_app_version', APP_VERSION); } catch (_) {}
    } else if (!stored) {
      try { localStorage.setItem('idt_app_version', APP_VERSION); } catch (_) {}
    }
  } catch (_) {}
}

window.addEventListener('error', (e) => {
  if (e && e.preventDefault) e.preventDefault();
});

window.addEventListener('unhandledrejection', (e) => {
  if (e && e.preventDefault) e.preventDefault();
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
  const n = document.getElementById('i2num');
  let c = 0;
  if (window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
  window.idtLoaderInterval = setInterval(function () {
    c += 5;
    if (n) n.textContent = (c >= 100 ? 100 : c);
    if (c >= 100) clearInterval(window.idtLoaderInterval);
  }, 30);
}

function hideLoading() {
  const l = document.getElementById('idt-loader-2');
  if (window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
  if (l) l.classList.add('idt-hide');
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message || 'The request took too long. Please try again.')), ms);
    Promise.resolve(promise).then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

function getAcademyId() {
  try {
    if (userData) {
      const a = userData.academy_id || userData.academyId || userData.academyID || '';
      if (a && String(a).trim() && String(a).trim().toUpperCase() !== 'N/A' && String(a).trim().toLowerCase() !== 'null' && String(a).trim().toLowerCase() !== 'undefined') {
        return String(a).trim();
      }
    }
    if (user && user.id) return String(user.id);
    const raw = localStorage.getItem('idt_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u && u.id) return String(u.id);
    }
  } catch (_) {}
  return '------';
}

function ensureToastWrap() {
  if (!$('toastWrap')) {
    const w = document.createElement('div');
    w.id = 'toastWrap';
    w.className = 'toast-wrap';
    document.body.appendChild(w);
  }
  toastWrap = $('toastWrap');
}

function removeToast(el) {
  if (!el || el.dataset.leaving === '1') return;
  el.dataset.leaving = '1';
  el.classList.add('out');
  setTimeout(() => el.remove(), 320);
}

function showToast(type, title, message) {
  ensureToastWrap();
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const sig = type + '|' + title + '|' + message;
  const existing = Array.from(toastWrap.children).find((c) => c.dataset.sig === sig && c.dataset.leaving !== '1');
  if (existing) return existing;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.dataset.sig = sig;
  el.innerHTML = '<i class="fa-solid ' + (icons[type] || 'fa-circle-info') + '"></i>' +
    '<div class="toast-body"><b>' + escapeHtml(title) + '</b><p>' + escapeHtml(message) + '</p></div>' +
    '<button class="toast-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  const xBtn = el.querySelector('.toast-x');
  if (xBtn) xBtn.addEventListener('click', () => removeToast(el));
  toastWrap.appendChild(el);
  while (toastWrap.children.length > 4) {
    removeToast(toastWrap.children[0]);
    break;
  }
  const life = type === 'success' ? 3600 : (type === 'error' ? 7000 : 5200);
  setTimeout(() => removeToast(el), life);
  return el;
}

function miniLoad(text) {
  const t = $('miniLoaderText');
  const l = $('miniLoader');
  if (t) t.textContent = text || 'Please wait...';
  if (l) l.classList.add('open');
}

function miniHide() {
  const l = $('miniLoader');
  if (l) l.classList.remove('open');
}

async function copyText(txt) {
  const value = String(txt == null ? '' : txt);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch (_) {}
  const ta = document.createElement('textarea');
  ta.value = value;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '0';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
  ta.remove();
  if (!ok) throw new Error('Copy is not supported on this device');
}

function formatMoney(n) {
  return '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDuration(ms) {
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (h > 0) return h + 'h ' + m + 'm';
  return Math.max(1, m) + ' minutes';
}

function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h + ':' + pad(m) + ':' + pad(s);
}

function formatDateLong(d) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTimeShort(d) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtMarks(n) {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
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

function buildReferralLink() {
  const code = (userData && userData.referral_code) || '';
  return 'https://www.idtacademy.com.ng/index/ref/' + code;
}

function normalizeLangCode(v) {
  const s = String(v || '').trim();
  if (!s) return 'english';
  const low = s.toLowerCase();
  const known = ['english', 'english+hausa', 'english+yoruba', 'english+igbo', 'english+pidgin'];
  if (known.indexOf(low) !== -1) return low;
  return s;
}

function aiLabel(lang) {
  const map = {
    'english': 'English',
    'english+hausa': 'English + Hausa',
    'english+yoruba': 'English + Yoruba',
    'english+igbo': 'English + Igbo',
    'english+pidgin': 'English + Pidgin'
  };
  const key = String(lang || '').toLowerCase();
  return map[key] || String(lang || 'English');
}

function currentLang() {
  return aiSelectedLang || 'english';
}

function getPreferredLang() {
  return (updateData && updateData.preferred_lang) || preferredLang;
}

function setPreferredLang(lang) {
  preferredLang = lang;
  if (updateData) updateData.preferred_lang = lang;
  saveUpdate({ preferred_lang: lang }, true);
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

function isValidCourseId(v) {
  const s = String(v || '').trim();
  return Boolean(s) && s.toUpperCase() !== 'N/A' && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined';
}

function sanitizeUserData(ud) {
  if (!ud || typeof ud !== 'object') return {};
  const clean = Object.assign({}, ud);
  Object.keys(clean).forEach((k) => {
    if (String(k).toLowerCase().indexOf('jamb') !== -1) delete clean[k];
  });
  return clean;
}

function looksLikeJamb(cid, cname, cprice) {
  const id = String(cid || '').trim().toLowerCase();
  const name = String(cname || '').trim().toLowerCase();
  const price = Number(cprice || 0);
  if (price === 3500) return true;
  if (name.indexOf('jamb') !== -1) return true;
  if (id.indexOf('jamb') !== -1) return true;
  return false;
}

function isCourseMissing(ud) {
  const u = sanitizeUserData(ud);
  const cid = String((u && u.course_id) || '').trim();
  const cname = String((u && u.course_name) || '').trim();
  const cprice = Number((u && (u.course_price || u.price)) || 0);
  if (!isValidCourseId(cid)) return true;
  if (!cname) return true;
  if (looksLikeJamb(cid, cname, cprice)) return true;
  return false;
}

function collectCourses(ud) {
  const arr = [];
  const u = sanitizeUserData(ud);
  const main = {
    course_id: String(u.course_id || '').trim(),
    course_name: String(u.course_name || '').trim(),
    course_number: String(u.course_number || '').trim(),
    course_price: Number(u.course_price || u.price || 0),
    status: String(u.status || 'pending').toLowerCase()
  };
  if (isValidCourseId(main.course_id) && main.course_name && main.course_price > 0 && !looksLikeJamb(main.course_id, main.course_name, main.course_price)) {
    arr.push(main);
  }
  for (let n = 2; n <= 20; n++) {
    const cid = String(u[n + 'course_id'] || '').trim();
    const cname = String(u[n + 'course_name'] || '').trim();
    const cprice = Number(u[n + 'course_price'] || 0);
    if (!isValidCourseId(cid) || !cname || cprice <= 0) continue;
    const st = String(u[n + 'course_status'] || 'active').toLowerCase();
    if (st !== 'active') continue;
    if (looksLikeJamb(cid, cname, cprice)) continue;
    arr.push({
      course_id: cid,
      course_name: cname,
      course_number: String(u[n + 'course_number'] || '').trim() || '000',
      course_price: cprice,
      status: 'active'
    });
  }
  const seen = {};
  return arr.filter((c) => {
    if (!c.course_id || seen[c.course_id]) return false;
    seen[c.course_id] = true;
    return true;
  });
}

function getPrimaryCourse() {
  if (!userData || typeof userData !== 'object') {
    return { course_id: '', course_name: '', course_number: '', course_price: 0, valid: false };
  }
  const u = sanitizeUserData(userData);
  const cid = String(u.course_id || '').trim();
  const cname = String(u.course_name || '').trim();
  const cnum = String(u.course_number || '000').trim();
  const cprice = Number(u.course_price || u.price || 0);
  if (isValidCourseId(cid) && cname && cprice > 0 && !looksLikeJamb(cid, cname, cprice)) {
    return { course_id: cid, course_name: cname, course_number: cnum, course_price: cprice, valid: true };
  }
  return { course_id: '', course_name: '', course_number: '', course_price: 0, valid: false };
}

function applyUpdateData(raw) {
  updateData = (raw && typeof raw === 'object') ? raw : {};
  watchedMap = (updateData.watched && typeof updateData.watched === 'object') ? updateData.watched : {};
  readingHistory = (updateData.reading_history && typeof updateData.reading_history === 'object') ? updateData.reading_history : {};
  chatHistories = (updateData.chat_history && typeof updateData.chat_history === 'object') ? updateData.chat_history : {};
  passedBatches = (updateData.passed_batches && typeof updateData.passed_batches === 'object') ? updateData.passed_batches : {};
  lastAssessFail = (updateData.last_assess_fail && typeof updateData.last_assess_fail === 'object') ? updateData.last_assess_fail : {};
  assessmentHistory = Array.isArray(updateData.assessment_history) ? updateData.assessment_history : [];
  preferredLang = normalizeLangCode(updateData.preferred_lang || 'english');
  aiSelectedLang = preferredLang;
  sessionSeconds = Number(updateData.reading_seconds) || 0;
}

async function fetchUpdateRow() {
  const { data, error } = await supabase
    .from('update')
    .select('*')
    .eq('id', user.id)
    .limit(1);
  if (error) throw error;
  return (data && data[0]) || null;
}

async function loadUpdateTable() {
  let row = null;
  let ok = false;
  for (let attempt = 0; attempt < 2 && !ok; attempt++) {
    try {
      row = await fetchUpdateRow();
      ok = true;
    } catch (_) {}
  }
  updateReady = ok;
  const raw = row && row.uset_update && typeof row.uset_update === 'object' ? row.uset_update : {};
  applyUpdateData(raw);
}

async function retryUpdateLoad() {
  try {
    const row = await fetchUpdateRow();
    const remote = row && row.uset_update && typeof row.uset_update === 'object' ? row.uset_update : {};
    updateData = Object.assign({}, remote, updateData || {});
    updateReady = true;
    return true;
  } catch (_) {
    return false;
  }
}

async function saveUpdate(patch, silent) {
  if (!user) return false;
  if (!updateData) updateData = {};
  Object.assign(updateData, patch || {});
  if (!updateReady) {
    const loaded = await retryUpdateLoad();
    if (!loaded) return false;
  }
  try {
    const { error } = await supabase
      .from('update')
      .upsert({ id: user.id, uset_update: updateData }, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (err) {
    if (!silent) showToast('error', 'Save Failed', 'Could not save your progress. Check your internet connection.');
    return false;
  }
}

async function refreshProfile() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1);
  if (error) throw error;
  if (!data || !data[0]) throw new Error('Profile not found');
  profileData = data[0];
  const rawUd = data[0].user_data || {};
  userData = (rawUd && typeof rawUd === 'object') ? rawUd : {};
  if (!userData.academy_id && !userData.academyId) {
    userData.academy_id = String(user.id);
  }
}

async function saveUserData() {
  if (!profileData || !userData) return;
  const { error } = await supabase
    .from('user_profiles')
    .update({ user_data: userData })
    .eq('id', user.id);
  if (error) throw error;
}

async function fetchStatusOnce() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_data')
    .eq('id', user.id)
    .limit(1);
  if (error) throw error;
  if (!data || !data[0]) return 'pending';
  const ud = data[0].user_data || {};
  return String(ud.status || 'pending');
}

function markWatched(topicIdx) {
  if (!activeCourseId) return;
  const arr = watchedMap[activeCourseId] || [];
  if (arr.indexOf(topicIdx) === -1) {
    arr.push(topicIdx);
    watchedMap[activeCourseId] = arr;
    saveUpdate({ watched: watchedMap }, true);
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
  const arr = watchedMap[activeCourseId] || [];
  return arr.indexOf(topicIdx) !== -1;
}

function renderSessionClock() {
  const el = $('sessionTime');
  if (!el) return;
  const h = Math.floor(sessionSeconds / 3600);
  const m = Math.floor((sessionSeconds % 3600) / 60);
  const s = sessionSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  el.textContent = h > 0 ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
  const daysEl = $('sessionDays');
  if (daysEl) {
    const reg = regDate || (userData && userData.date_registered);
    const weeks = weeksSince(reg);
    daysEl.textContent = weeks > 0 ? (weeks + (weeks === 1 ? ' week' : ' weeks')) : 'First week';
  }
}

function startSessionClock() {
  sessionSeconds = Number((updateData && updateData.reading_seconds) || 0);
  renderSessionClock();
  if (sessionTimer) clearInterval(sessionTimer);
  sessionTimer = setInterval(() => {
    if (document.hidden) return;
    sessionSeconds++;
    renderSessionClock();
    if (sessionSeconds % 60 === 0) {
      saveUpdate({ reading_seconds: sessionSeconds, last_active: new Date().toISOString() }, true);
    }
  }, 1000);
}

function renderUserIdBadge() {
  const n = $('userIdName');
  const c = $('userIdCode');
  if (n) n.textContent = (userData && userData.full_name) || 'Student';
  if (c) c.textContent = getAcademyId();
}

function renderMenu() {
  const bonus = Number((userData && userData.referral_bonus) || 0);
  const name = $('smUserName');
  const b = $('smBonus');
  const extra = $('smReferralExtra');
  const ref = $('smReferral');
  const link = buildReferralLink();
  if (name) name.textContent = (userData && userData.full_name) || 'Student';
  if (b) b.textContent = bonus.toFixed(2);
  if (extra) extra.textContent = formatMoney(bonus);
  if (ref && user) ref.href = 'referral.html?user_id=' + encodeURIComponent(user.id) + '&code=' + encodeURIComponent((userData && userData.referral_code) || '');
  const prl = $('pendingReferLink');
  if (prl) {
    prl.textContent = link;
    prl.title = link;
  }
}

function renderUserGreet() {
  const n = $('userFullName');
  const c = $('userCourseName');
  if (n) n.textContent = (userData && userData.full_name) || 'Student';
  if (c) c.textContent = 'Course: ' + ((courseInfoMap[activeCourseId] || {}).course_name || (userData && userData.course_name) || 'Loading...');
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
    adIdx = 0;
    showAdSlide(0);
    if (adTimer) clearInterval(adTimer);
    if (adList.length > 1) {
      adTimer = setInterval(() => {
        adIdx = (adIdx + 1) % adList.length;
        showAdSlide(adIdx);
      }, 10000);
    }
  } catch (err) {
    const box = $('adBox');
    if (box) box.classList.add('hidden');
  }
}

function showAdSlide(i) {
  const img = $('adImage');
  const row = adList[i];
  if (!row || !img) return;
  window._adtLink = row.ad_link;
  img.classList.add('fade');
  setTimeout(() => {
    img.onload = () => img.classList.remove('fade');
    img.onerror = () => {
      const box = $('adBox');
      if (box && adList.length <= 1) box.classList.add('hidden');
    };
    img.src = row.ad_image;
  }, 500);
}

async function loadCourseInfos() {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*');
    if (error) throw error;
    allCourses = data || [];
    allCourses.forEach((row) => {
      courseInfoMap[row.id] = row.course_data || {};
    });
  } catch (err) {
    showToast('error', 'Courses Not Loaded', 'Could not load course details. Please check your internet connection.');
  }
}

async function loadTopicsFor(courseId) {
  try {
    const { data, error } = await supabase
      .from('all_couse_post')
      .select('*')
      .eq('id', courseId)
      .limit(1);
    if (error) throw error;
    const row = (data && data[0]) || null;
    if (row && row.all_course && Array.isArray(row.all_course.topics)) {
      const sorted = row.all_course.topics.slice().sort((a, b) => {
        const na = Number(a.topic_number != null ? a.topic_number : 0);
        const nb = Number(b.topic_number != null ? b.topic_number : 0);
        return na - nb;
      });
      topicsMap[courseId] = sorted;
    } else {
      topicsMap[courseId] = [];
    }
  } catch (err) {
    topicsMap[courseId] = [];
  }
}

function pickDefaultCourse(list) {
  const src = list && list.length ? list : courseList;
  if (!src.length) return '';
  if (src.length === 1) return src[0].course_id;
  const saved = updateData && updateData.last_course;
  if (saved && src.some((c) => c.course_id === saved)) return saved;
  const unfinished = src.find((c) => {
    const topicCount = (topicsMap[c.course_id] || []).length;
    const idx = readingHistory[c.course_id];
    if (typeof idx === 'number' && topicCount > 0 && idx >= topicCount - 1) return false;
    return true;
  });
  return unfinished ? unfinished.course_id : src[0].course_id;
}

function categoryLabel(cat) {
  const cats = {
    '1': 'Technology & Computing',
    '2': 'Vocational & Agricultural Skills',
    '3': 'Health & Community Wellness',
    '4': '2-Year Diploma Program'
  };
  return cats[String(cat || '')] || 'Other Courses';
}

function renderCoursePush() {
  const body = $('pnBody');
  if (!body) return;
  if (!allCourses.length) {
    body.innerHTML = '<div class="pn-empty"><i class="fa-solid fa-circle-info"></i> No courses are available right now. Please check back later.</div>';
    return;
  }
  const groups = {};
  allCourses.forEach((row) => {
    const cd = row.course_data || {};
    const cat = categoryLabel(cd.category);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({ id: row.id, cd: cd });
  });
  let html = '';
  Object.keys(groups).forEach((cat) => {
    html += '<div class="pn-cat"><i class="fa-solid fa-layer-group"></i> ' + escapeHtml(cat) + '</div>';
    html += '<div class="pn-row">';
    groups[cat].forEach((item) => {
      const img = item.cd.image_url || LOGO_URL;
      const price = Number(item.cd.price || item.cd.course_price || 0);
      html += '<div class="pn-course" data-cid="' + escapeHtml(item.id) + '">' +
        '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(item.cd.course_name || 'Course') + '" loading="lazy">' +
        '<div class="pnc-in">' +
        '<b>' + escapeHtml(item.cd.course_name || 'Course') + '</b>' +
        '<small><i class="fa-solid fa-hashtag"></i> ' + escapeHtml(item.cd.course_number || '000') + '</small>' +
        '<span class="pnc-price"><i class="fa-solid fa-naira-sign"></i> ' + escapeHtml(formatMoney(price)) + '</span>' +
        '</div></div>';
    });
    html += '</div>';
  });
  body.innerHTML = html;
  body.querySelectorAll('.pn-course[data-cid]').forEach((card) => {
    card.addEventListener('click', () => chooseCourse(card.dataset.cid));
  });
}

function renderMyCourses() {
  const body = $('pnBody');
  if (!body) return false;
  if (courseList.length === 0) return false;
  let html = '<div class="pn-cat"><i class="fa-solid fa-graduation-cap"></i> My Courses</div>';
  html += '<div class="pn-row">';
  courseList.forEach((c) => {
    const info = courseInfoMap[c.course_id] || {};
    const img = info.image_url || LOGO_URL;
    const isActive = c.course_id === activeCourseId;
    const lv = String((userData && userData.level_completed) || '');
    const done = lv === 'final' && isActive;
    html += '<div class="pn-course" data-mcid="' + escapeHtml(c.course_id) + '">' +
      '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(c.course_name || 'Course') + '" loading="lazy">' +
      '<div class="pnc-in">' +
      '<b>' + escapeHtml(c.course_name || 'Course') + '</b>' +
      '<small><i class="fa-solid fa-hashtag"></i> ' + escapeHtml(c.course_number || '000') + '</small>' +
      '<span class="pnc-price">' + (done ? '<i class="fa-solid fa-circle-check"></i> Completed' : (isActive ? '<i class="fa-solid fa-book-open"></i> Studying' : '<i class="fa-solid fa-book"></i> Tap to open')) + '</span>' +
      '</div></div>';
  });
  html += '</div>';
  body.innerHTML = html;
  body.querySelectorAll('.pn-course[data-mcid]').forEach((card) => {
    card.addEventListener('click', async () => {
      const cid = card.dataset.mcid;
      closeCoursePush();
      if (cid === activeCourseId && currentTopics.length) {
        const app = $('app');
        if (app) app.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      miniLoad('Opening your course...');
      try {
        if (!topicsMap[cid]) await loadTopicsFor(cid);
        await selectCourse(cid, true);
        const app = $('app');
        if (app) app.classList.remove('hidden');
      } finally {
        miniHide();
      }
    });
  });
  return true;
}

function openCoursePush() {
  renderCoursePush();
  const p = $('coursePush');
  if (p) p.classList.add('open');
}

function openMyCourses() {
  const opened = renderMyCourses();
  if (!opened) {
    openCoursePush();
    return;
  }
  const t = $('pnTitle');
  const s = $('pnSub');
  if (t) t.textContent = 'My Courses';
  if (s) s.textContent = 'Tap a course to open it.';
  const p = $('coursePush');
  if (p) p.classList.add('open');
}

function closeCoursePush() {
  const p = $('coursePush');
  if (p) p.classList.remove('open');
}

async function chooseCourse(courseId) {
  if (!courseId) return;
  const clickedCard = Array.from(document.querySelectorAll('.pn-course[data-cid]')).find((c) => c.dataset.cid === courseId);
  if (clickedCard) {
    if (clickedCard.dataset.busy === '1') return;
    clickedCard.dataset.busy = '1';
    clickedCard._oldHtml = clickedCard.innerHTML;
    clickedCard.style.opacity = '0.6';
    clickedCard.style.pointerEvents = 'none';
    clickedCard.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:40px 10px"><span style="width:26px;height:26px;border-radius:50%;border:3px solid rgba(124,58,237,.2);border-top-color:#7c3aed;display:inline-block;animation:mlSpin .8s linear infinite"></span><small style="font-size:10.5px;font-weight:800;color:#6d28d9">Loading...</small></div>';
  }
  try {
    const info = courseInfoMap[courseId] || {};
    let courseName = info.course_name || '';
    let courseNumber = info.course_number || '000';
    let price = Number(info.price || info.course_price || 0);
    if (!courseName || !price) {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .limit(1);
        if (!error && data && data[0]) {
          const cd = data[0].course_data || {};
          courseInfoMap[courseId] = cd;
          courseName = cd.course_name || courseName;
          courseNumber = cd.course_number || courseNumber;
          price = Number(cd.price || cd.course_price || price);
        }
      } catch (_) {}
    }
    if (!courseName || !price) {
      throw new Error('Course details not found for this course');
    }
    miniLoad('Saving your course...');
    const res = await withTimeout(fetch('/api/chengeCourse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        course_id: courseId,
        course_name: courseName,
        course_number: courseNumber,
        course_price: price
      })
    }), 30000, 'Saving your course took too long');
    const data = await res.json().catch(() => ({}));
    miniHide();
    if (!res.ok || data.success !== true) {
      throw new Error(data.message || 'Could not save your course. Please try again.');
    }
    userData.course_id = courseId;
    userData.course_name = courseName;
    userData.course_number = courseNumber;
    userData.course_price = price;
    userData.status = 'pending';
    try {
      await saveUserData();
    } catch (_) {}
    courseList = collectCourses(userData);
    renderPendingGate();
    closeCoursePush();
    const gate = $('pendingGate');
    if (gate) gate.classList.add('open');
    showToast('success', 'Course Selected ✓', 'You selected ' + courseName + ' for ' + formatMoney(price) + '. Tap Pay Now to complete your payment.');
  } catch (err) {
    miniHide();
    showToast('error', 'Selection Failed', (err && err.message) || 'Could not select this course. Please try again.');
  } finally {
    if (clickedCard) {
      delete clickedCard.dataset.busy;
      clickedCard.style.opacity = '';
      clickedCard.style.pointerEvents = '';
      if (clickedCard._oldHtml) {
        clickedCard.innerHTML = clickedCard._oldHtml;
        delete clickedCard._oldHtml;
      }
    }
  }
}

function renderPendingGate() {
  const course = getPrimaryCourse();
  const sn = $('pendingStudentName');
  const cn = $('pendingCourseName');
  const cnum = $('pendingCourseNumber');
  const pr = $('pendingPrice');
  if (sn) sn.textContent = (userData && userData.full_name) || 'Student';
  if (cn) cn.textContent = course.course_name || 'Selected Course';
  if (cnum) cnum.textContent = course.course_number || '000';
  if (pr) pr.textContent = Number(course.course_price || 0).toLocaleString('en-NG');
  const info = courseInfoMap[course.course_id] || {};
  const img = $('pendingCourseImg');
  if (info.image_url && img) {
    img.src = info.image_url;
  }
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
  const lv = String((userData && userData.level_completed) || '');
  const done = lv === 'final';
  let html = '';
  courseList.forEach((c) => {
    const isActive = c.course_id === activeCourseId;
    html += '<button type="button" class="cs-chip' + (isActive ? ' active' : '') + '" data-cid="' + escapeHtml(c.course_id) + '">' +
      '<i class="fa-solid fa-graduation-cap"></i> ' + escapeHtml(c.course_name) +
      (done && isActive ? ' <span class="cs-done"><i class="fa-solid fa-circle-check"></i></span>' : '') +
      '</button>';
  });
  wrap.innerHTML = html;
  wrap.querySelectorAll('.cs-chip').forEach((chip) => {
    chip.addEventListener('click', async () => {
      const cid = chip.dataset.cid;
      if (cid === activeCourseId) return;
      await selectCourse(cid, true);
    });
  });
}

async function selectCourse(courseId, announce) {
  activeCourseId = courseId;
  renderCourseSwitch();
  if (!topicsMap[courseId]) await loadTopicsFor(courseId);
  currentTopics = topicsMap[courseId] || [];
  diplomaMode = isDiploma(courseId);
  regDate = (userData && userData.date_registered) || null;
  const savedIdx = typeof readingHistory[courseId] === 'number' ? readingHistory[courseId] : 0;
  currentTopicIdx = Math.min(Math.max(0, savedIdx), Math.max(0, currentTopics.length - 1));
  const topicCard = $('topicCard');
  const emptyState = $('emptyState');
  renderUserGreet();
  saveUpdate({ last_course: courseId }, true);
  if (currentTopics.length === 0) {
    currentTopic = null;
    if (topicCard) topicCard.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    renderProgress();
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');
  if (topicCard) topicCard.classList.remove('hidden');
  renderTopic();
  if (announce) {
    showToast('success', 'Course Loaded', 'Welcome to ' + ((courseInfoMap[courseId] || {}).course_name || 'your course') + '. Happy learning!');
  }
}

function renderProgress() {
  const total = currentTopics.length;
  const arr = watchedMap[activeCourseId] || [];
  let completed = arr.length;
  const finalTopicIdx = currentTopics.findIndex((t) => t.is_final === true);
  const finishedFinal = finalTopicIdx !== -1 && isWatched(finalTopicIdx);
  if (finishedFinal) completed = Math.max(completed, finalTopicIdx + 1);
  if (typeof readingHistory[activeCourseId] === 'number') {
    completed = Math.max(completed, Math.min(readingHistory[activeCourseId] + 1, total));
  }
  completed = Math.min(completed, total);
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const pc = $('progressCount');
  const pp = $('progressPct');
  const pf = $('progressFill');
  if (pc) pc.textContent = completed + '/' + total;
  if (pp) pp.textContent = pct + '%';
  if (pf) pf.style.width = pct + '%';
  const badge = $('levelBadge');
  if (badge) {
    if (finishedFinal) {
      badge.className = 'level-badge final';
      badge.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> Final Level Completed';
    } else {
      badge.className = 'level-badge studying';
      badge.innerHTML = '<i class="fa-solid fa-book-open"></i> Studying • Topic ' + (currentTopicIdx + 1) + '/' + total;
    }
  }
  const banner = $('completeBanner');
  if (banner) {
    if (finishedFinal) {
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }
}

async function cleanupOldSupabaseData() {
  try {
    const cutoff = Date.now() - DATA_TTL_MS;
    let changed = false;
    let userChanged = false;
    if (userData && Array.isArray(userData.assessment_grade) && userData.assessment_grade.length) {
      const keep = userData.assessment_grade.filter((g) => {
        const ts = g && g.date ? new Date(g.date).getTime() : Date.now();
        return isFinite(ts) && ts >= cutoff;
      });
      if (keep.length !== userData.assessment_grade.length) {
        userData.assessment_grade = keep;
        userChanged = true;
      }
    }
    if (assessmentHistory.length) {
      const keepHist = assessmentHistory.filter((h) => {
        const ts = h && h.date ? new Date(h.date).getTime() : Date.now();
        return isFinite(ts) && ts >= cutoff;
      });
      if (keepHist.length !== assessmentHistory.length) {
        assessmentHistory = keepHist;
        changed = true;
      }
    }
    Object.keys(lastAssessFail).forEach((k) => {
      if (!lastAssessFail[k] || lastAssessFail[k] < cutoff) {
        delete lastAssessFail[k];
        changed = true;
      }
    });
    Object.keys(passedBatches).forEach((k) => {
      if (!Array.isArray(passedBatches[k]) || passedBatches[k].length === 0) {
        delete passedBatches[k];
        changed = true;
      }
    });
    Object.keys(chatHistories).forEach((k) => {
      if (Array.isArray(chatHistories[k]) && chatHistories[k].length === 0) {
        delete chatHistories[k];
        changed = true;
      }
    });
    if (changed) {
      await saveUpdate({
        passed_batches: passedBatches,
        last_assess_fail: lastAssessFail,
        chat_history: chatHistories,
        assessment_history: assessmentHistory
      }, true);
    }
    if (userChanged) {
      try { await saveUserData(); } catch (_) {}
    }
  } catch (_) {}
}

function renderDiplomaLock() {
  const lock = $('videoLock');
  if (!lock) return false;
  const idx = currentTopicIdx;
  const weeks = regDate ? weeksSince(regDate) : 0;
  if (idx > weeks) {
    const unlockAt = new Date((regDate ? new Date(regDate).getTime() : Date.now()) + idx * WEEK_MS);
    const diff = Math.max(0, unlockAt.getTime() - Date.now());
    const d = Math.floor(diff / (24 * 60 * 60 * 1000));
    const h = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    lock.classList.remove('hidden');
    const t = $('videoLockTitle');
    const msg = $('videoLockMsg');
    if (t) t.textContent = 'This Topic Unlocks Later';
    if (msg) msg.textContent = 'Diploma lessons open one per week to help you learn step by step. Unlocks in ' + d + 'd ' + h + 'h ' + m + 'm.';
    return true;
  }
  lock.classList.add('hidden');
  return false;
}

function renderLessonHtml(text) {
  const src = String(text || '');
  const re = /```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    out += escapeHtml(src.slice(last, m.index).replace(/\n+$/, ''));
    out += '<pre><code>' + escapeHtml(m[2].replace(/\n$/, '')) + '</code></pre>';
    last = re.lastIndex;
    if (src.charAt(last) === '\n') last++;
  }
  out += escapeHtml(src.slice(last));
  return out;
}

function lessonHasCode(text) {
  const s = String(text || '');
  if (/```/.test(s)) return true;
  if (/<(html|div|script|body|h1|p|span|ul|button)\b/i.test(s)) return true;
  if (/\b(console\.log|function\s+\w+\s*\(|document\.|window\.|print\(|=>|let\s+\w+\s*=|const\s+\w+\s*=)/.test(s)) return true;
  return false;
}

function extractCodeBlock(text) {
  const m = /```([a-zA-Z0-9]*)\n?([\s\S]*?)```/.exec(String(text || ''));
  if (!m) return null;
  return { lang: String(m[1] || '').toLowerCase(), code: m[2].replace(/\n$/, '') };
}

function renderTopic() {
  if (!currentTopics.length) return;
  currentTopic = currentTopics[currentTopicIdx];
  const total = currentTopics.length;
  const isFinalTopic = currentTopic.is_final === true;
  const hasNext = currentTopicIdx + 1 < total;
  const nextIsFinal = hasNext && currentTopics[currentTopicIdx + 1].is_final === true;
  const num = $('topicNumber');
  const numL = $('topicNumLabel');
  const totalL = $('topicTotalLabel');
  const name = $('topicName');
  if (num) num.textContent = currentTopicIdx + 1;
  if (numL) numL.textContent = currentTopicIdx + 1;
  if (totalL) totalL.textContent = total;
  if (name) name.textContent = currentTopic.topic_name || ('Topic ' + (currentTopicIdx + 1));
  const badge = $('topicBadge');
  if (badge) {
    if (isFinalTopic) {
      badge.className = 'th-badge final';
      badge.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> Final Topic';
    } else {
      badge.className = 'th-badge';
      badge.innerHTML = '';
    }
  }
  const txt = $('topicText');
  if (txt) {
    txt.innerHTML = renderLessonHtml(currentTopic.topic_text || '');
    txt.scrollTop = 0;
  }
  if (num) num.classList.toggle('final-num', isFinalTopic);
  const hasCode = lessonHasCode(currentTopic.topic_text);
  const btnCodeRun = $('btnCodeRun');
  const btnRunCode = $('btnRunCode');
  if (btnCodeRun) btnCodeRun.classList.toggle('hidden', !hasCode);
  if (btnRunCode) btnRunCode.classList.toggle('hidden', !hasCode);
  const runner = $('codeRunner');
  if (runner) runner.classList.add('hidden');
  runnerTopicKey = '';
  renderVideo();
  const watched = isWatched(currentTopicIdx);
  videoWatched = watched;
  const st = $('videoStatus');
  const stTxt = $('videoStatusText');
  if (st && stTxt) {
    if (watched) {
      st.classList.add('watched');
      stTxt.textContent = 'Video watched ✓';
    } else {
      st.classList.remove('watched');
      stTxt.textContent = currentTopic.video_url ? 'Video not watched yet' : 'No video for this topic';
    }
  }
  const btnNext = $('btnNextTopic');
  if (btnNext) {
    if (isFinalTopic) {
      btnNext.innerHTML = 'Finish Course <i class="fa-solid fa-flag-checkered"></i>';
      btnNext.classList.add('finish');
      btnNext.disabled = false;
      btnNext.classList.remove('hidden');
    } else if (nextIsFinal) {
      btnNext.classList.add('hidden');
      btnNext.disabled = true;
    } else {
      btnNext.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
      btnNext.classList.remove('finish');
      btnNext.classList.remove('hidden');
      btnNext.disabled = Boolean(diplomaMode && currentTopicIdx > weeksSince(regDate));
    }
  }
  const btnPrev = $('btnPrevTopic');
  if (btnPrev) btnPrev.disabled = currentTopicIdx === 0;
  let waitMsg = document.getElementById('waitNextWeekMsg');
  if (waitMsg) waitMsg.remove();
  if (nextIsFinal) {
    waitMsg = document.createElement('div');
    waitMsg.id = 'waitNextWeekMsg';
    waitMsg.style.cssText = 'margin:16px 18px;padding:18px 16px;border-radius:14px;background:rgba(245,158,11,.08);border:1.5px solid rgba(245,158,11,.35);text-align:center';
    waitMsg.innerHTML = '<i class="fa-solid fa-hourglass-half" style="font-size:26px;color:#f59e0b"></i>' +
      '<div style="font-size:15px;font-weight:800;color:#1e1b4b;margin-top:10px">Wait Next Week Topic</div>' +
      '<div style="font-size:12px;color:#6d6a8a;margin-top:6px">You have finished all the available topics for now. The final topic will open next week. Please check back later.</div>';
    const navRow = document.querySelector('.topic-card .nav-row');
    if (navRow && navRow.parentElement) {
      navRow.parentElement.insertBefore(waitMsg, navRow);
    }
  }
  const banner = $('completeBanner');
  if (banner) banner.classList.add('hidden');
  renderProgress();
}

function clearVideoContent(wrap) {
  Array.from(wrap.children).forEach((c) => {
    if (c.id !== 'videoLock' && c.id !== 'videoExplainFloat') c.remove();
  });
}

function renderVideo() {
  const wrap = $('videoWrap');
  if (!wrap) return;
  clearVideoContent(wrap);
  if (videoWatchTimer) clearInterval(videoWatchTimer);
  videoWatchTimer = null;
  const lock = $('videoLock');
  const floatBtn = $('videoExplainFloat');
  if (floatBtn) floatBtn.classList.remove('visible');
  if (diplomaMode) {
    const locked = renderDiplomaLock();
    if (locked) return;
  } else if (lock) {
    lock.classList.add('hidden');
  }
  const url = (currentTopic && currentTopic.video_url) || '';
  if (!url) {
    const ph = document.createElement('div');
    ph.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#94a3b8;background:#0b0d1a;text-align:center;padding:20px';
    ph.innerHTML = '<i class="fa-solid fa-book-open" style="font-size:30px;color:#7c3aed"></i><span style="font-size:12.5px">No video for this topic. Read the lesson notes below.</span>';
    wrap.insertBefore(ph, wrap.firstChild);
    return;
  }
  const yt = getYouTubeId(url);
  if (yt) {
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + yt + '?rel=0&modestbranding=1&playsinline=1&controls=1&fs=1&color=white&iv_load_policy=3';
    iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('title', 'Lesson video');
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    wrap.insertBefore(iframe, wrap.firstChild);
    if (floatBtn) floatBtn.classList.add('visible');
    startVideoDwellTimer();
  } else if (isDirectVideo(url)) {
    const vid = document.createElement('video');
    vid.src = url;
    vid.controls = true;
    vid.playsInline = true;
    vid.preload = 'metadata';
    wrap.insertBefore(vid, wrap.firstChild);
    if (floatBtn) floatBtn.classList.add('visible');
    attachVideoWatcher(vid);
  } else {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('title', 'Lesson video');
    iframe.allowFullscreen = true;
    wrap.insertBefore(iframe, wrap.firstChild);
    if (floatBtn) floatBtn.classList.add('visible');
    startVideoDwellTimer();
  }
}

function startVideoDwellTimer() {
  if (videoWatched) return;
  let secs = 0;
  const topicAtStart = currentTopicIdx;
  videoWatchTimer = setInterval(() => {
    if (document.hidden) return;
    if (topicAtStart !== currentTopicIdx) {
      clearInterval(videoWatchTimer);
      videoWatchTimer = null;
      return;
    }
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
  const idxAtStart = currentTopicIdx;
  vid.addEventListener('timeupdate', () => {
    if (idxAtStart !== currentTopicIdx) return;
    if (!vid.duration || !isFinite(vid.duration)) return;
    const pct = vid.currentTime / vid.duration;
    if (pct >= 0.8 && !isWatched(currentTopicIdx)) {
      markWatched(currentTopicIdx);
    }
  });
  vid.addEventListener('ended', () => {
    if (idxAtStart !== currentTopicIdx) return;
    if (!isWatched(currentTopicIdx)) markWatched(currentTopicIdx);
  });
}

function topicNeedsWatch(idx) {
  const t = currentTopics[idx];
  return Boolean(t && t.video_url);
}

async function goToTopic(idx) {
  try {
    if (!currentTopics.length) {
      showToast('info', 'No Topics', 'This course has no topics yet. Please check back later.');
      return;
    }
    if (idx < 0 || idx >= currentTopics.length) {
      showToast('info', 'End Of Topics', 'You have reached the end of the available topics.');
      return;
    }
    currentTopicIdx = idx;
    readingHistory[activeCourseId] = Math.max(idx, typeof readingHistory[activeCourseId] === 'number' ? readingHistory[activeCourseId] : 0);
    saveUpdate({ reading_history: readingHistory }, true);
    renderTopic();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) { window.scrollTo(0, 0); }
  } catch (err) {
    showToast('error', 'Navigation Failed', 'Could not open this topic. Please try again.');
  }
}

async function goBackToTopic(idx) {
  if (idx < 0 || idx >= currentTopics.length) return;
  currentTopicIdx = idx;
  renderTopic();
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) { window.scrollTo(0, 0); }
}

function isBatchPassed(batch) {
  const key = activeCourseId + '_' + batch;
  return (passedBatches[key] || []).indexOf(batch) !== -1;
}

function getLockRemain(batch) {
  const key = activeCourseId + '_' + batch;
  const ts = Number(lastAssessFail[key] || 0);
  if (!ts) return 0;
  return ts + RETRY_MS - Date.now();
}

function needsAssessment(idx) {
  if (idx <= 0) return false;
  if (idx % ASSESS_BATCH_SIZE !== 0) return false;
  const t = currentTopics[idx];
  if (!t || t.is_final === true) return false;
  return !isBatchPassed(idx);
}

async function advanceTopic() {
  try {
    if (!currentTopics.length) {
      showToast('info', 'No Topics', 'This course has no topics yet.');
      return;
    }
    if (!currentTopic) {
      currentTopic = currentTopics[currentTopicIdx] || null;
    }
    const nextIdx = currentTopicIdx + 1;
    if (currentTopic && currentTopic.is_final === true) {
      await finishCourse();
      return;
    }
    if (nextIdx >= currentTopics.length) {
      showToast('info', 'Wait Next Week Topic', 'You have finished all the available topics for now. The final topic will open next week. Please check back later.');
      return;
    }
    if (currentTopics[nextIdx].is_final === true) {
      renderTopic();
      showToast('info', 'Wait Next Week Topic', 'You have finished all the available topics for now. The final topic will open next week. Please check back later.');
      return;
    }
    if (topicNeedsWatch(currentTopicIdx) && !isWatched(currentTopicIdx)) {
      showToast('info', 'Watch The Video First', 'Please watch the full video for this topic before moving on. This helps you understand better.');
      return;
    }
    if (diplomaMode) {
      const weeks = weeksSince(regDate);
      if (nextIdx > weeks) {
        showToast('info', 'Lesson Locked', 'Diploma lessons unlock one per week. Please wait for the next lesson to open.');
        return;
      }
    }
    pendingNextIdx = nextIdx;
    openUnderstandModal();
  } catch (err) {
    pendingNextIdx = -1;
    showToast('error', 'Something Went Wrong', 'The Next button could not work. Please try again.');
  }
}

async function handleReady() {
  try {
    closeUnderstandModal();
    if (pendingNextIdx < 0) return;
    const idx = pendingNextIdx;
    pendingNextIdx = -1;
    if (needsAssessment(idx)) {
      openAssessment(idx);
      return;
    }
    await goToTopic(idx);
  } catch (err) {
    showToast('error', 'Navigation Failed', 'Could not move to the next topic. Please try again.');
  }
}

function openUnderstandModal() {
  const m = $('understandModal');
  if (m) m.classList.add('open');
}

function closeUnderstandModal() {
  const m = $('understandModal');
  if (m) m.classList.remove('open');
}

async function finishCourse() {
  const total = currentTopics.length;
  const lv = String((userData && userData.level_completed) || '');
  if (lv !== 'final') {
    userData.level_completed = 'final';
    userData.date_complet = new Date().toISOString();
    try {
      await saveUserData();
    } catch (err) {
      showToast('error', 'Save Failed', 'Could not save your completion.');
    }
  }
  const finalIdx = currentTopics.findIndex((t) => t.is_final === true);
  if (finalIdx !== -1 && !isWatched(finalIdx)) {
    const arr = watchedMap[activeCourseId] || [];
    arr.push(finalIdx);
    watchedMap[activeCourseId] = arr;
    saveUpdate({ watched: watchedMap }, true);
  }
  renderProgress();
  const msg = 'You have completed all ' + total + ' topics in ' + ((courseInfoMap[activeCourseId] || {}).course_name || 'this course') + '. You are now ready for the final exam to earn your certificate.';
  const m = $('completionMsg');
  if (m) m.textContent = msg;
  const modal = $('completionModal');
  if (modal) modal.classList.add('open');
}

function stopRetryTimer() {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

function refreshStartButton() {
  const btn = $('btnStartAssessment');
  if (!btn) return;
  if (assessStarting) return;
  const remain = getLockRemain(assessBatch);
  let note = $('assessLockNote');
  if (remain > 0) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> Retake In ' + formatClock(remain);
    if (!note) {
      note = document.createElement('div');
      note.id = 'assessLockNote';
      btn.parentElement.insertBefore(note, btn);
    }
    note.innerHTML = '<i class="fa-solid fa-circle-info"></i> You did not reach the pass mark of ' + PASS_MARK + ' out of ' + MAX_MARKS + ' marks. Go back, read the topics again, then come back to retake the assessment when the timer finishes.';
  } else {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-play"></i> Start Assessment';
    if (note) note.remove();
    if (retryTimer) {
      stopRetryTimer();
      showToast('success', 'Assessment Ready', 'You can retake the assessment now.');
    }
  }
}

function openAssessment(batch) {
  assessBatch = batch;
  const startIdx = Math.max(0, batch - ASSESS_BATCH_SIZE);
  const batchTopics = currentTopics.slice(startIdx, batch);
  const list = $('assessTopicsList');
  if (list) {
    list.innerHTML = batchTopics.map((t) =>
      '<div class="ai-topic"><i class="fa-solid fa-circle-check"></i> Topic ' + escapeHtml(t.topic_number || '') + ': ' + escapeHtml(t.topic_name || '') + '</div>'
    ).join('');
  }
  const title = $('assessTitle');
  if (title) title.textContent = 'Assessment • Topics ' + (startIdx + 1) + ' - ' + batch;
  const infos = document.querySelectorAll('#assessIntro .ai-info b');
  if (infos.length >= 3) {
    infos[0].textContent = String(TOTAL_QUESTIONS);
    infos[1].textContent = Math.floor(QUIZ_SECONDS / 60) + ':' + String(QUIZ_SECONDS % 60).padStart(2, '0');
    infos[2].textContent = PASS_MARK + '/' + MAX_MARKS;
  }
  const intro = $('assessIntro');
  const quiz = $('assessQuiz');
  const result = $('assessResult');
  const overlay = $('assessmentOverlay');
  if (intro) intro.classList.remove('hidden');
  if (quiz) quiz.classList.add('hidden');
  if (result) result.classList.add('hidden');
  if (overlay) overlay.classList.add('open');
  stopRetryTimer();
  const remain = getLockRemain(batch);
  if (remain > 0) {
    refreshStartButton();
    retryTimer = setInterval(refreshStartButton, 1000);
  } else {
    refreshStartButton();
  }
}

function mapQuestionType(t) {
  const s = String(t || '').toLowerCase().replace(/[^a-z]/g, '');
  if (['mcq', 'multiplechoice', 'multiple', 'choice', 'objective'].indexOf(s) !== -1) return 'mcq';
  if (['tf', 'truefalse', 'trueorfalse', 'boolean', 'bool'].indexOf(s) !== -1) return 'tf';
  if (['write', 'written', 'essay', 'open', 'shortanswer', 'text', 'theory'].indexOf(s) !== -1) return 'write';
  return '';
}

function cleanOptionText(o) {
  let s = (o && typeof o === 'object') ? (o.text || o.label || o.value || '') : o;
  s = String(s == null ? '' : s).trim();
  return s.replace(/^[A-Da-d][\).:\-]\s+/, '').trim();
}

function resolveMcqIndex(correct, options) {
  if (typeof correct === 'number' && correct >= 0 && correct < options.length) return correct;
  const s = String(correct == null ? '' : correct).trim();
  if (/^[0-3]$/.test(s)) return parseInt(s, 10);
  if (/^[A-Da-d]$/.test(s)) return s.toUpperCase().charCodeAt(0) - 65;
  const m = /^([A-Da-d])[\).:\-\s]/.exec(s);
  if (m) return m[1].toUpperCase().charCodeAt(0) - 65;
  const idx = options.findIndex((o) => o.toLowerCase() === s.toLowerCase());
  return idx;
}

function resolveTfIndex(correct) {
  if (correct === true) return 0;
  if (correct === false) return 1;
  const s = String(correct == null ? '' : correct).trim().toLowerCase();
  if (['true', 't', 'a', '0', 'yes', 'gaskiya'].indexOf(s) !== -1) return 0;
  if (['false', 'f', 'b', '1', 'no', 'karya'].indexOf(s) !== -1) return 1;
  return -1;
}

function buildQuestionItem(type, q, text) {
  const explanation = String(q.explanation || q.reason || q.feedback || '').trim();
  if (type === 'mcq') {
    let opts = q.options || q.choices || q.answers || [];
    if (opts && !Array.isArray(opts) && typeof opts === 'object') opts = Object.keys(opts).sort().map((k) => opts[k]);
    if (!Array.isArray(opts)) return null;
    const options = opts.map(cleanOptionText).filter((o) => o);
    if (options.length < 4) return null;
    const four = options.slice(0, 4);
    const ci = resolveMcqIndex(q.correct != null ? q.correct : (q.answer != null ? q.answer : q.correct_answer), four);
    if (ci < 0 || ci > 3) return null;
    return { type: 'mcq', question: text, options: four, correctIndex: ci, reference: four[ci], explanation: explanation };
  }
  if (type === 'tf') {
    const ci = resolveTfIndex(q.correct != null ? q.correct : (q.answer != null ? q.answer : q.correct_answer));
    if (ci < 0) return null;
    const options = ['True', 'False'];
    return { type: 'tf', question: text, options: options, correctIndex: ci, reference: options[ci], explanation: explanation };
  }
  const ref = String(q.correct != null ? q.correct : (q.answer != null ? q.answer : (q.model_answer || q.correct_answer || ''))).trim();
  return { type: 'write', question: text, options: [], correctIndex: -1, reference: ref, explanation: explanation };
}

function normalizeAssessment(res, batchTopics) {
  const raw = (res && (res.questions || (res.data && res.data.questions) || (res.assessment && res.assessment.questions))) || [];
  if (!Array.isArray(raw) || !raw.length) throw new Error('The AI did not return any questions');
  const buckets = { mcq: [], tf: [], write: [] };
  const seen = {};
  raw.forEach((q, i) => {
    if (!q || typeof q !== 'object') return;
    const text = String(q.question || q.text || q.q || '').trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen[key]) return;
    let type = mapQuestionType(q.type);
    if (!type) type = i < 2 ? 'mcq' : (i < 4 ? 'tf' : 'write');
    const item = buildQuestionItem(type, q, text);
    if (!item) return;
    seen[key] = true;
    buckets[type].push(item);
  });
  if (buckets.mcq.length < 2 || buckets.tf.length < 2 || buckets.write.length < 1) {
    throw new Error('The AI returned an incomplete assessment');
  }
  const t1 = batchTopics[0] || {};
  const t2 = batchTopics[1] || t1;
  const t3 = batchTopics[2] || t2;
  const out = [];
  buckets.mcq.slice(0, 2).forEach((q) => { q.topic_name = t1.topic_name || ''; q.topic_number = t1.topic_number; q.max = 1; out.push(q); });
  buckets.tf.slice(0, 2).forEach((q) => { q.topic_name = t2.topic_name || ''; q.topic_number = t2.topic_number; q.max = 1; out.push(q); });
  buckets.write.slice(0, 1).forEach((q) => { q.topic_name = t3.topic_name || ''; q.topic_number = t3.topic_number; q.max = WRITE_MARKS; out.push(q); });
  return out;
}

function stopStream(stream) {
  try {
    if (stream && stream.getTracks) stream.getTracks().forEach((t) => t.stop());
  } catch (_) {}
}

async function requestCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera is not supported on this device');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 360 } },
      audio: false
    });
  } catch (err) {
    const msg = $('quizCamLockMsg');
    if (msg) msg.textContent = 'Camera access is required so we can verify you take the assessment honestly. Please allow camera and try again.';
    throw new Error('Please allow camera access to take this assessment');
  }
}

function attachCameraToVideo(stream) {
  camStream = stream;
  const video = $('quizCam');
  const lock = $('quizCamLock');
  if (video) {
    video.srcObject = stream;
    video.muted = true;
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  }
  if (lock) lock.classList.add('hidden');
}

function stopCamera() {
  stopStream(camStream);
  camStream = null;
  const video = $('quizCam');
  if (video && video.srcObject) video.srcObject = null;
  const lock = $('quizCamLock');
  const msg = $('quizCamLockMsg');
  if (lock) lock.classList.remove('hidden');
  if (msg) msg.textContent = 'Camera stopped. You can close this assessment.';
}

function newAssessmentId() {
  try {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  } catch (_) {}
  return 'as_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
}

async function startAssessmentFlow() {
  if (assessStarting || quizState) return;
  const batch = assessBatch;
  if (getLockRemain(batch) > 0) {
    refreshStartButton();
    return;
  }
  const startIdx = Math.max(0, batch - ASSESS_BATCH_SIZE);
  const batchTopics = currentTopics.slice(startIdx, batch).map((t) => ({
    topic_number: t.topic_number,
    topic_name: t.topic_name,
    topic_text: String(t.topic_text || '').slice(0, 2500)
  }));
  if (batchTopics.length < ASSESS_BATCH_SIZE) {
    showToast('error', 'No Topics', 'Not enough topics were found for this assessment.');
    return;
  }
  assessStarting = true;
  const startBtn = $('btnStartAssessment');
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparing...';
  }
  miniLoad('Creating your assessment...');
  let stream = null;
  try {
    stream = await requestCamera();
    const res = await withTimeout(getAssessment({
      user_id: user.id,
      academy_id: getAcademyId(),
      course_id: activeCourseId,
      course_name: (courseInfoMap[activeCourseId] || {}).course_name || (userData && userData.course_name) || '',
      language: 'English',
      topics: batchTopics,
      total_questions: TOTAL_QUESTIONS,
      structure: [
        { number: 1, topic_index: 0, type: 'mcq', options: 4, marks: 1 },
        { number: 2, topic_index: 0, type: 'mcq', options: 4, marks: 1 },
        { number: 3, topic_index: 1, type: 'tf', options: 2, marks: 1 },
        { number: 4, topic_index: 1, type: 'tf', options: 2, marks: 1 },
        { number: 5, topic_index: 2, type: 'write', marks: WRITE_MARKS }
      ],
      instructions: 'Create exactly 5 questions from the supplied topic texts only. Questions 1 and 2 come from topic index 0 and are multiple choice with exactly 4 options and one correct option given as a letter A, B, C or D in the field correct. Questions 3 and 4 come from topic index 1 and are true or false with correct set to true or false. Question 5 comes from topic index 2 and is a written question worth 2 marks, with correct holding a short model answer. Every question needs an explanation. Return JSON only: {"assessment_id": string, "questions": [{"number": number, "type": "mcq" | "tf" | "write", "topic_index": number, "question": string, "options": string[], "correct": string, "explanation": string}]}',
      mode: 'assessment_generate'
    }), AI_TIMEOUT_MS, 'The assessment took too long to prepare. Please try again.');
    const questions = normalizeAssessment(res, batchTopics);
    quizState = {
      questions: questions,
      answers: questions.map(() => ''),
      currentQ: 0,
      secondsLeft: QUIZ_SECONDS,
      timer: null,
      flags: 0,
      assessmentId: String((res && (res.assessment_id || (res.data && res.data.assessment_id))) || newAssessmentId()),
      batch: batch,
      batchTopics: batchTopics,
      submitted: false,
      grading: false,
      locked: false
    };
    attachCameraToVideo(stream);
    stream = null;
    const intro = $('assessIntro');
    const result = $('assessResult');
    const quiz = $('assessQuiz');
    if (intro) intro.classList.add('hidden');
    if (result) result.classList.add('hidden');
    if (quiz) quiz.classList.remove('hidden');
    const timerEl = $('quizTimer');
    if (timerEl) {
      timerEl.classList.remove('danger');
      const span = timerEl.querySelector('span');
      if (span) span.textContent = Math.floor(QUIZ_SECONDS / 60) + ':' + String(QUIZ_SECONDS % 60).padStart(2, '0');
    }
    makeCamDraggable($('quizCamWrap'));
    renderQuestion();
    startQuizTimer();
    attachAntiCheat();
    miniHide();
  } catch (err) {
    if (stream) stopStream(stream);
    stopCamera();
    quizState = null;
    miniHide();
    showToast('error', 'Assessment Not Started', (err && err.message) || 'Could not create the assessment. Please try again.');
  } finally {
    assessStarting = false;
    if (!quizState) refreshStartButton();
  }
}

function questionKindLabel(q) {
  if (q.type === 'mcq') return 'Multiple Choice • 1 mark';
  if (q.type === 'tf') return 'True or False • 1 mark';
  return 'Write Your Answer • ' + WRITE_MARKS + ' marks';
}

function renderQuestion() {
  if (!quizState) return;
  const q = quizState.questions[quizState.currentQ];
  if (!q) return;
  const card = $('questionCard');
  if (!card) return;
  const totalQ = quizState.questions.length;
  const isLast = quizState.currentQ === totalQ - 1;
  const btnPrev = $('btnPrevQ');
  const btnNext = $('btnNextQ');
  const btnSubmit = $('btnSubmitQuiz');
  if (btnPrev) btnPrev.disabled = quizState.currentQ === 0 || quizState.grading;
  if (btnNext) btnNext.classList.toggle('hidden', isLast);
  if (btnSubmit) {
    btnSubmit.classList.toggle('hidden', !isLast);
    btnSubmit.disabled = quizState.grading;
  }
  const locked = quizState.locked ? ' disabled' : '';
  let optionsHtml = '';
  if (q.type === 'write') {
    const val = escapeHtml(quizState.answers[quizState.currentQ] || '');
    optionsHtml = '<div class="q-write"><textarea maxlength="600" placeholder="Type your answer here..." data-q="' + quizState.currentQ + '"' + locked + '>' + val + '</textarea></div>';
  } else {
    const letters = ['A', 'B', 'C', 'D'];
    optionsHtml = '<div class="q-options">' + q.options.map((opt, i) => {
      const selected = quizState.answers[quizState.currentQ] === String(i);
      return '<button type="button" class="q-opt' + (selected ? ' selected' : '') + '" data-q="' + quizState.currentQ + '" data-opt="' + i + '"' + locked + '>' +
        '<span class="q-letter">' + letters[i] + '</span><span>' + escapeHtml(opt) + '</span></button>';
    }).join('') + '</div>';
  }
  card.innerHTML =
    '<div class="question-card">' +
    '<span class="q-num"><i class="fa-solid fa-circle-question"></i> Question ' + (quizState.currentQ + 1) + ' of ' + totalQ + '</span>' +
    '<span class="q-kind">' + escapeHtml(questionKindLabel(q)) + '</span>' +
    '<div class="q-text" style="margin-top:10px">' + escapeHtml(q.question || '') + '</div>' +
    optionsHtml +
    '</div>';
  card.querySelectorAll('.q-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!quizState || quizState.locked) return;
      const qi = parseInt(btn.dataset.q, 10);
      quizState.answers[qi] = btn.dataset.opt;
      renderQuestion();
    });
  });
  const ta = card.querySelector('textarea');
  if (ta) {
    ta.addEventListener('input', (e) => {
      if (!quizState || quizState.locked) return;
      const qi = parseInt(e.target.dataset.q, 10);
      quizState.answers[qi] = e.target.value;
    });
  }
}

function startQuizTimer() {
  if (!quizState) return;
  if (quizState.timer) clearInterval(quizState.timer);
  quizStartedAt = Date.now();
  lastFlagAt = 0;
  quizState.timer = setInterval(() => {
    if (!quizState) return;
    quizState.secondsLeft--;
    const left = Math.max(0, quizState.secondsLeft);
    const m = Math.floor(left / 60);
    const s = left % 60;
    const timerEl = $('quizTimer');
    if (timerEl) {
      const span = timerEl.querySelector('span');
      if (span) span.textContent = m + ':' + String(s).padStart(2, '0');
      if (left <= 60) timerEl.classList.add('danger');
    }
    if (quizState.secondsLeft <= 0) {
      clearInterval(quizState.timer);
      quizState.timer = null;
      submitQuiz('time');
    }
  }, 1000);
}

function attachAntiCheat() {
  document.body.classList.add('quiz-lock');
  showSecurityShield('info');
  document.addEventListener('visibilitychange', antiCheatHandler);
  document.addEventListener('copy', antiCheatCopy);
  document.addEventListener('cut', antiCheatCopy);
  document.addEventListener('paste', antiCheatCopy);
  document.addEventListener('contextmenu', antiCheatContext);
  document.addEventListener('selectstart', antiCheatSelect);
  window.addEventListener('blur', antiCheatBlur);
  document.addEventListener('keydown', antiCheatKeys);
}

function detachAntiCheat() {
  document.body.classList.remove('quiz-lock');
  document.removeEventListener('visibilitychange', antiCheatHandler);
  document.removeEventListener('copy', antiCheatCopy);
  document.removeEventListener('cut', antiCheatCopy);
  document.removeEventListener('paste', antiCheatCopy);
  document.removeEventListener('contextmenu', antiCheatContext);
  document.removeEventListener('selectstart', antiCheatSelect);
  window.removeEventListener('blur', antiCheatBlur);
  document.removeEventListener('keydown', antiCheatKeys);
}

function flagAntiCheat(msg) {
  if (!quizState || quizState.submitted || quizState.grading) return;
  const now = Date.now();
  if (now - quizStartedAt < 2500) return;
  if (now - lastFlagAt < 1500) return;
  lastFlagAt = now;
  quizState.flags++;
  showSecurityShield('alert');
  if (quizState.flags >= 2) {
    submitQuiz('flag');
  } else {
    showToast('error', 'Warning!', msg + ' One more time and your assessment will be submitted.');
  }
}

function antiCheatKeys(e) {
  if (!quizState || quizState.grading) return;
  const k = (e.key || '').toLowerCase();
  if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'u', 's', 'p'].indexOf(k) !== -1) {
    e.preventDefault();
    flagAntiCheat('Copying is not allowed during the assessment.');
    return;
  }
  if (k === 'printscreen' || k === 'print') {
    e.preventDefault();
    flagAntiCheat('Screenshots are not allowed during the assessment.');
  }
}

function antiCheatContext(e) {
  if (!quizState) return;
  e.preventDefault();
  flagAntiCheat('Right click is disabled during the assessment.');
}

function antiCheatSelect(e) {
  if (!quizState) return;
  const t = e.target;
  if (t && t.closest && t.closest('textarea,input')) return;
  e.preventDefault();
}

function antiCheatHandler() {
  if (document.hidden && quizState) {
    flagAntiCheat('Do not leave the assessment page.');
  }
}

function antiCheatCopy(e) {
  if (!quizState) return;
  e.preventDefault();
  flagAntiCheat('Copying is not allowed during the assessment.');
}

function antiCheatBlur() {
  if (quizState) {
    flagAntiCheat('Stay on the assessment page.');
  }
}

function makeCamDraggable(wrap) {
  if (!wrap || wrap.dataset.draggable === '1') return;
  wrap.dataset.draggable = '1';
  let floating = false;
  const bar = document.createElement('div');
  bar.className = 'cam-drag-bar';
  bar.innerHTML = '<span class="cam-drag-grip"><i class="fa-solid fa-grip-lines"></i></span><button type="button" class="cam-min-btn" aria-label="Minimize"><i class="fa-solid fa-window-minimize"></i></button>';
  wrap.appendChild(bar);
  const minBtn = bar.querySelector('.cam-min-btn');
  if (minBtn) {
    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      floating = !floating;
      wrap.classList.toggle('floating', floating);
      if (!floating) {
        wrap.style.left = '';
        wrap.style.top = '';
      }
    });
  }
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  function onDown(e) {
    const t = e.touches ? e.touches[0] : e;
    if (!wrap.classList.contains('floating')) return;
    if (e.target.closest('.cam-min-btn')) return;
    dragging = true;
    startX = t.clientX;
    startY = t.clientY;
    const r = wrap.getBoundingClientRect();
    startLeft = r.left;
    startTop = r.top;
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    const t = e.touches ? e.touches[0] : e;
    const nx = Math.min(Math.max(4, startLeft + (t.clientX - startX)), window.innerWidth - 90);
    const ny = Math.min(Math.max(4, startTop + (t.clientY - startY)), window.innerHeight - 70);
    wrap.style.left = nx + 'px';
    wrap.style.top = ny + 'px';
    wrap.style.right = 'auto';
    e.preventDefault();
  }
  function onUp() { dragging = false; }
  bar.addEventListener('mousedown', onDown);
  bar.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchend', onUp);
}

function parseWrittenGrade(res) {
  const first = res && Array.isArray(res.results) && res.results[0] ? res.results[0] : null;
  let m = null;
  const candidates = [res && res.marks, res && res.score, res && res.written_score, first && first.marks, first && first.score];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (c != null && c !== '' && isFinite(Number(c))) {
      m = Number(c);
      break;
    }
  }
  if (m == null) {
    const flag = res && (res.is_correct != null ? res.is_correct : (first && first.is_correct));
    if (flag === true) m = WRITE_MARKS;
    else if (flag === false) m = 0;
  }
  if (m == null) throw new Error('The AI returned an invalid grade');
  m = Math.max(0, Math.min(WRITE_MARKS, m));
  m = Math.round(m * 2) / 2;
  const explanation = String((res && (res.explanation || res.feedback || res.comment)) || (first && (first.explanation || first.feedback)) || '').trim();
  const reference = String((res && (res.correct_answer || res.model_answer)) || (first && first.correct_answer) || '').trim();
  return { marks: m, explanation: explanation, reference: reference };
}

async function gradeWritten(q, answerText, number) {
  const payload = {
    user_id: user.id,
    academy_id: getAcademyId(),
    course_id: activeCourseId,
    course_name: (courseInfoMap[activeCourseId] || {}).course_name || (userData && userData.course_name) || '',
    assessment_id: quizState.assessmentId,
    mode: 'grade_written',
    question: q.question,
    user_answer: answerText,
    reference_answer: q.reference,
    max_marks: WRITE_MARKS,
    topic_name: q.topic_name,
    topic_text: String(((quizState.batchTopics || [])[2] || {}).topic_text || '').slice(0, 2500),
    preferred_lang: getPreferredLang(),
    instructions: 'Grade the student answer fairly against the topic text and the reference answer. Give marks from 0 to ' + WRITE_MARKS + ' in steps of 0.5. Give 0 if the answer is empty or unrelated. Return JSON only: {"marks": number, "explanation": string, "correct_answer": string}',
    questions: [{
      number: number,
      type: 'write',
      question: q.question,
      correct: q.reference,
      topic_name: q.topic_name,
      user_answer: answerText,
      max_marks: WRITE_MARKS
    }]
  };
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await withTimeout(gradeAssessment(payload), AI_TIMEOUT_MS, 'Grading took too long. Please try again.');
      return parseWrittenGrade(res);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Could not grade the written answer');
}

async function buildResults() {
  const results = [];
  for (let i = 0; i < quizState.questions.length; i++) {
    const q = quizState.questions[i];
    const raw = quizState.answers[i];
    if (q.type === 'write') {
      const text = String(raw || '').trim();
      let marks = 0;
      let explanation = q.explanation;
      let reference = q.reference;
      if (text) {
        const g = await gradeWritten(q, text, i + 1);
        marks = g.marks;
        if (g.explanation) explanation = g.explanation;
        if (g.reference) reference = g.reference;
      }
      results.push({
        number: i + 1,
        type: 'write',
        question: q.question,
        topic_name: q.topic_name,
        user_answer: text,
        correct_answer: reference,
        marks: marks,
        max_marks: WRITE_MARKS,
        is_correct: marks >= WRITE_MARKS,
        partial: marks > 0 && marks < WRITE_MARKS,
        skipped: !text,
        explanation: explanation
      });
    } else {
      const has = raw !== '' && raw != null;
      const picked = has ? parseInt(raw, 10) : -1;
      const ok = has && picked === q.correctIndex;
      results.push({
        number: i + 1,
        type: q.type,
        question: q.question,
        topic_name: q.topic_name,
        user_answer: has && q.options[picked] != null ? q.options[picked] : '',
        correct_answer: q.reference,
        marks: ok ? 1 : 0,
        max_marks: 1,
        is_correct: ok,
        partial: false,
        skipped: !has,
        explanation: q.explanation
      });
    }
  }
  return results;
}

async function recordAssessment(entry) {
  const key = activeCourseId + '_' + entry.batch;
  if (entry.passed) {
    const arr = passedBatches[key] || [];
    if (arr.indexOf(entry.batch) === -1) arr.push(entry.batch);
    passedBatches[key] = arr;
    delete lastAssessFail[key];
  } else {
    lastAssessFail[key] = Date.now();
  }
  assessmentHistory.push(entry);
  if (assessmentHistory.length > 60) assessmentHistory = assessmentHistory.slice(-60);
  await saveUpdate({
    passed_batches: passedBatches,
    last_assess_fail: lastAssessFail,
    assessment_history: assessmentHistory
  }, true);
  try {
    const grades = Array.isArray(userData.assessment_grade) ? userData.assessment_grade : [];
    grades.push({
      assessment_id: entry.id,
      academy_id: getAcademyId(),
      course_id: entry.course_id,
      course_name: entry.course_name,
      score: entry.score,
      max_marks: entry.max_marks,
      pct: entry.pct,
      passed: entry.passed,
      date: entry.date,
      time_spent: entry.time_spent
    });
    userData.assessment_grade = grades;
    await saveUserData();
  } catch (_) {}
}

async function submitQuiz(reason) {
  if (!quizState || quizState.submitted || quizState.grading) return;
  quizState.grading = true;
  quizState.locked = true;
  if (quizState.timer) {
    clearInterval(quizState.timer);
    quizState.timer = null;
  }
  detachAntiCheat();
  stopCamera();
  renderQuestion();
  miniLoad('Grading your answers...');
  try {
    const results = await buildResults();
    const score = results.reduce((n, r) => n + r.marks, 0);
    const pct = Math.round((score / MAX_MARKS) * 100);
    const passed = score >= PASS_MARK;
    const timeSpent = Math.max(0, QUIZ_SECONDS - Math.max(0, quizState.secondsLeft));
    const now = new Date();
    const courseName = (courseInfoMap[activeCourseId] || {}).course_name || (userData && userData.course_name) || '';
    const result = {
      assessmentId: quizState.assessmentId,
      batch: quizState.batch,
      score: score,
      maxMarks: MAX_MARKS,
      pct: pct,
      passed: passed,
      results: results,
      timeSpent: timeSpent,
      reason: reason,
      courseName: courseName,
      dateIso: now.toISOString(),
      message: ''
    };
    if (passed) {
      result.message = 'You passed this assessment with ' + fmtMarks(score) + ' out of ' + MAX_MARKS + ' marks. Excellent work! You can continue learning.';
    } else {
      result.message = 'You scored ' + fmtMarks(score) + ' out of ' + MAX_MARKS + ' marks. The pass mark is ' + PASS_MARK + '. Go back and read the topics again. You can retake the assessment after 2 hours.';
    }
    lastResult = result;
    quizState.submitted = true;
    const entry = {
      id: result.assessmentId,
      course_id: activeCourseId,
      course_name: courseName,
      batch: result.batch,
      topics: (quizState.batchTopics || []).map((t) => t.topic_name),
      date: result.dateIso,
      date_text: formatDateLong(now),
      time_text: formatTimeShort(now),
      score: score,
      max_marks: MAX_MARKS,
      pct: pct,
      passed: passed,
      time_spent: timeSpent,
      flags: quizState.flags,
      reason: reason,
      answers: results.map((r) => ({
        number: r.number,
        type: r.type,
        question: r.question,
        user_answer: r.user_answer,
        correct_answer: r.correct_answer,
        marks: r.marks,
        max_marks: r.max_marks
      }))
    };
    quizState = null;
    showResult(result);
    miniHide();
    if (reason === 'time') {
      showToast('info', 'Time Up', 'The ' + Math.round(QUIZ_SECONDS / 60) + ' minutes finished. Your answers were submitted automatically.');
    } else if (reason === 'flag') {
      showToast('info', 'Assessment Ended', 'Your assessment was submitted because of repeated security warnings.');
    }
    if (passed) confetti();
    await recordAssessment(entry);
  } catch (err) {
    miniHide();
    if (quizState) {
      quizState.grading = false;
      quizState.submitted = false;
      quizState.currentQ = quizState.questions.length - 1;
      renderQuestion();
    }
    showToast('error', 'Grading Failed', ((err && err.message) || 'Could not grade your assessment.') + ' Tap Submit to try again.');
  }
}

function abandonQuiz() {
  if (!quizState) return;
  if (quizState.timer) clearInterval(quizState.timer);
  const batch = quizState.batch;
  const assessmentId = quizState.assessmentId;
  const topics = (quizState.batchTopics || []).map((t) => t.topic_name);
  quizState = null;
  detachAntiCheat();
  stopCamera();
  const now = new Date();
  const courseName = (courseInfoMap[activeCourseId] || {}).course_name || (userData && userData.course_name) || '';
  recordAssessment({
    id: assessmentId,
    course_id: activeCourseId,
    course_name: courseName,
    batch: batch,
    topics: topics,
    date: now.toISOString(),
    date_text: formatDateLong(now),
    time_text: formatTimeShort(now),
    score: 0,
    max_marks: MAX_MARKS,
    pct: 0,
    passed: false,
    time_spent: 0,
    flags: 0,
    reason: 'closed',
    answers: []
  });
}

function ensureReviewButton() {
  let btn = $('btnReviewTopics');
  if (btn) return btn;
  const cont = $('btnContinueStudy');
  if (!cont || !cont.parentElement) return null;
  btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'btnReviewTopics';
  btn.className = 'btn btn-primary hidden';
  btn.innerHTML = '<i class="fa-solid fa-book-open-reader"></i> Go Back &amp; Read Topics';
  cont.parentElement.insertBefore(btn, cont.nextSibling);
  btn.addEventListener('click', () => {
    const o = $('assessmentOverlay');
    if (o) o.classList.remove('open');
    const target = Math.max(0, (lastResult ? lastResult.batch : assessBatch) - ASSESS_BATCH_SIZE);
    goBackToTopic(target);
  });
  return btn;
}

function showResult(r) {
  const quiz = $('assessQuiz');
  const result = $('assessResult');
  const intro = $('assessIntro');
  if (intro) intro.classList.add('hidden');
  if (quiz) quiz.classList.add('hidden');
  if (result) result.classList.remove('hidden');
  const ring = $('scoreRing');
  const deg = Math.round((r.pct / 100) * 360);
  if (ring) ring.style.background = 'conic-gradient(' + (r.passed ? 'var(--green)' : 'var(--rose)') + ' ' + deg + 'deg, rgba(124,58,237,.1) ' + deg + 'deg)';
  const pctEl = $('scorePct');
  if (pctEl) pctEl.textContent = r.pct + '%';
  const head = $('resultHead');
  if (head) {
    if (r.passed) {
      head.textContent = 'Congratulations! 🎉';
      head.className = 'result-head pass';
    } else {
      head.textContent = 'Almost There!';
      head.className = 'result-head fail';
    }
  }
  const sub = $('resultSub');
  if (sub) sub.textContent = r.message;
  const results = r.results;
  const correct = results.filter((x) => x.is_correct).length;
  const wrong = results.filter((x) => !x.is_correct && !x.skipped).length;
  const skipped = results.filter((x) => x.skipped).length;
  const summary = $('resultSummary');
  if (summary) {
    summary.innerHTML =
      '<div class="rs-row"><span>Total Questions</span><b>' + results.length + '</b></div>' +
      '<div class="rs-row"><span>Fully Correct</span><b class="ok">' + correct + '</b></div>' +
      '<div class="rs-row"><span>Wrong Answers</span><b class="bad">' + wrong + '</b></div>' +
      '<div class="rs-row"><span>Skipped</span><b>' + skipped + '</b></div>' +
      '<div class="rs-row"><span>Marks Scored</span><b>' + fmtMarks(r.score) + ' / ' + r.maxMarks + '</b></div>' +
      '<div class="rs-row"><span>Pass Mark</span><b>' + PASS_MARK + ' / ' + r.maxMarks + '</b></div>' +
      '<div class="rs-row"><span>Time Used</span><b>' + r.timeSpent + 's</b></div>';
  }
  let listHtml = '';
  results.forEach((x, i) => {
    let mark;
    let icon;
    let color;
    if (x.is_correct) {
      mark = '<span class="ri-mark correct">✓ Correct • ' + fmtMarks(x.marks) + '/' + x.max_marks + '</span>';
      icon = 'fa-circle-check';
      color = '#10b981';
    } else if (x.partial) {
      mark = '<span class="ri-mark partial">◐ Partial • ' + fmtMarks(x.marks) + '/' + x.max_marks + '</span>';
      icon = 'fa-circle-half-stroke';
      color = '#f59e0b';
    } else if (x.skipped) {
      mark = '<span class="ri-mark skipped">Skipped • 0/' + x.max_marks + '</span>';
      icon = 'fa-circle-minus';
      color = '#94a3b8';
    } else {
      mark = '<span class="ri-mark wrong">✖ Wrong • 0/' + x.max_marks + '</span>';
      icon = 'fa-circle-xmark';
      color = '#f43f5e';
    }
    const userAns = x.user_answer || '(no answer)';
    listHtml += '<div class="result-item">' +
      '<div class="ri-head"><i class="fa-solid ' + icon + '" style="color:' + color + '"></i> Question ' + (i + 1) + ' ' + mark + '</div>' +
      '<div class="ri-q">' + escapeHtml(x.question || '') + '</div>' +
      '<div class="ri-ans"><span class="' + (x.is_correct ? 'ok' : 'bad') + '">Your answer: ' + escapeHtml(userAns) + '</span>' +
      (x.is_correct ? '' : '<br><span class="ok">Correct answer: ' + escapeHtml(x.correct_answer || '') + '</span>') + '</div>' +
      (x.explanation ? '<div class="ri-explain"><b><i class="fa-solid fa-lightbulb"></i> Explanation:</b> ' + escapeHtml(x.explanation) + '</div>' : '') +
      '</div>';
  });
  const list = $('resultList');
  if (list) list.innerHTML = listHtml || '<div class="result-item">No detailed breakdown available.</div>';
  const btnGoExam = $('btnGoExam');
  const btnCont = $('btnContinueStudy');
  const btnReview = ensureReviewButton();
  const currentTopicIsFinal = Boolean(currentTopic && currentTopic.is_final === true);
  if (btnGoExam) btnGoExam.classList.add('hidden');
  if (btnCont) btnCont.classList.add('hidden');
  if (btnReview) btnReview.classList.add('hidden');
  if (r.passed) {
    if (currentTopicIsFinal && btnGoExam) btnGoExam.classList.remove('hidden');
    else if (btnCont) btnCont.classList.remove('hidden');
  } else if (btnReview) {
    btnReview.classList.remove('hidden');
  }
  const btnPdf = $('btnDownloadPdf');
  if (btnPdf) btnPdf.classList.remove('hidden');
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

async function loadPdfLib() {
  if (window.jspdf && window.jspdf.jsPDF) return window.jspdf;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the PDF tool. Check your internet connection.'));
    document.head.appendChild(s);
  });
  if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('PDF tool is not available');
  return window.jspdf;
}

function imageToDataUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const t = setTimeout(() => resolve(''), 8000);
    img.onload = () => {
      clearTimeout(t);
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
    img.onerror = () => {
      clearTimeout(t);
      resolve('');
    };
    img.src = url;
  });
}

function pdfWatermark(doc, w, h, logo) {
  if (!logo) return;
  try {
    doc.setGState(new doc.GState({ opacity: 0.06 }));
    doc.addImage(logo, 'PNG', (w - 150) / 2, (h - 150) / 2, 150, 150);
    doc.setGState(new doc.GState({ opacity: 1 }));
  } catch (_) {}
}

function pdfHeader(doc, w, title, logo) {
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, w, 34, 'F');
  doc.setFillColor(6, 182, 212);
  doc.rect(0, 34, w, 2.5, 'F');
  let tx = 14;
  if (logo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.circle(24, 17, 12, 'F');
      doc.addImage(logo, 'PNG', 14, 7, 20, 20);
      tx = 42;
    } catch (_) {}
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('IDT ACADEMY', tx, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Intelligent Digital Technology Academy  |  www.idtacademy.com.ng', tx, 21);
  doc.text('Learn Beyond Limits', tx, 27);
  doc.setTextColor(30, 27, 75);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, 14, 47);
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.8);
  doc.line(14, 51, w - 14, 51);
}

function pdfSignatures(doc, w, h, y, logo, signChair, signCeo, dateStr) {
  if (y > 235) {
    doc.addPage();
    pdfWatermark(doc, w, h, logo);
    y = 30;
  }
  const rowY = y + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(109, 106, 138);
  doc.text('_______________________', 22, rowY);
  doc.text('_______________________', w - 72, rowY);
  if (signChair) {
    try { doc.addImage(signChair, 'PNG', 22, rowY + 2, 26, 13); } catch (_) {}
  }
  if (signCeo) {
    try { doc.addImage(signCeo, 'PNG', w - 72, rowY + 2, 26, 13); } catch (_) {}
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 27, 75);
  doc.text('Haruna Lawali', 22, rowY + 19);
  doc.text('Ubaida Aliyu', w - 72, rowY + 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(109, 106, 138);
  doc.text('Chairman, Board of Trustees', 22, rowY + 24);
  doc.text('CEO, IDT Academy', w - 72, rowY + 24);
  doc.setFontSize(8);
  doc.text('IDT Academy | Official Assessment Document | ' + dateStr, w / 2, rowY + 34, { align: 'center' });
}

async function buildResultPdf() {
  if (!lastResult) throw new Error('No assessment result is available yet');
  await loadPdfLib();
  const JsPDF = window.jspdf.jsPDF;
  const doc = new JsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const r = lastResult;
  const results = r.results || [];
  const when = new Date(r.dateIso);
  const dateStr = formatDateLong(when);
  const timeStr = formatTimeShort(when);
  const studentName = (userData && userData.full_name) || 'Student';
  const academyId = getAcademyId();
  const courseName = r.courseName || '';
  const logo = await imageToDataUrl(LOGO_URL);
  const signChair = await imageToDataUrl(SIGN_CHAIR_URL);
  const signCeo = await imageToDataUrl(SIGN_CEO_URL);
  const grade = r.pct >= 80 ? 'A' : r.pct >= 70 ? 'B' : r.pct >= 60 ? 'C' : r.pct >= 50 ? 'D' : 'F';

  pdfWatermark(doc, w, h, logo);
  pdfHeader(doc, w, 'ASSESSMENT SLIP', logo);
  let y = 62;
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(14, y, w - 28, 26, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 27, 75);
  doc.text('Student: ' + studentName, 18, y + 7);
  doc.text('Academy ID: ' + academyId, 18, y + 14);
  doc.text('Course: ' + courseName, 18, y + 21);
  doc.setTextColor(109, 40, 217);
  doc.text('Date: ' + dateStr, w - 18, y + 7, { align: 'right' });
  doc.text('Time: ' + timeStr, w - 18, y + 14, { align: 'right' });
  doc.text('Time Used: ' + r.timeSpent + 's', w - 18, y + 21, { align: 'right' });
  y += 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 27, 75);
  doc.text('Questions & Answers', 16, y);
  y += 8;
  results.forEach((it, i) => {
    const qLines = doc.splitTextToSize(String(it.question || ''), w - 50);
    const ansLines = doc.splitTextToSize('Your answer: ' + String(it.user_answer || '(no answer)'), w - 44);
    const corLines = it.is_correct ? [] : doc.splitTextToSize('Correct answer: ' + String(it.correct_answer || ''), w - 44);
    const need = 8 + qLines.length * 4.5 + ansLines.length * 4.2 + corLines.length * 4.2 + 6;
    if (y + need > 262) {
      doc.addPage();
      pdfWatermark(doc, w, h, logo);
      y = 30;
    }
    let label = 'Wrong';
    let rgb = [220, 38, 38];
    let bg = [254, 226, 231];
    if (it.is_correct) {
      label = 'Correct';
      rgb = [16, 150, 110];
      bg = [232, 245, 241];
    } else if (it.partial) {
      label = 'Partial';
      rgb = [180, 100, 10];
      bg = [254, 243, 215];
    } else if (it.skipped) {
      label = 'Skipped';
      rgb = [100, 116, 139];
      bg = [241, 245, 249];
    }
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.roundedRect(14, y - 4, w - 28, 5.5, 1.5, 1.5, 'F');
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Q' + (i + 1) + ' - ' + label + ' (' + fmtMarks(it.marks) + '/' + it.max_marks + ')', 17, y);
    y += 6;
    doc.setTextColor(30, 27, 75);
    doc.setFont('helvetica', 'bold');
    doc.text(qLines, 18, y);
    y += qLines.length * 4.5 + 1;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 58, 107);
    doc.text(ansLines, 18, y);
    y += ansLines.length * 4.2;
    if (corLines.length) {
      doc.setTextColor(16, 130, 100);
      doc.text(corLines, 18, y);
      y += corLines.length * 4.2;
    }
    y += 4;
  });
  pdfSignatures(doc, w, h, y, logo, signChair, signCeo, dateStr);

  doc.addPage();
  pdfWatermark(doc, w, h, logo);
  pdfHeader(doc, w, 'PROFESSIONAL RESULT SLIP', logo);
  y = 66;
  doc.setFillColor(r.passed ? 16 : 244, r.passed ? 185 : 63, r.passed ? 129 : 94);
  doc.roundedRect(14, y, w - 28, 34, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.text(r.pct + '%', 22, y + 22);
  doc.setFontSize(11);
  doc.text(r.passed ? 'PASSED' : 'NOT PASSED', w - 22, y + 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Marks: ' + fmtMarks(r.score) + ' / ' + r.maxMarks + '   |   Pass Mark: ' + PASS_MARK + ' / ' + r.maxMarks + '   |   Grade: ' + grade, w - 22, y + 22, { align: 'right' });
  doc.text('Assessment: ' + String(r.assessmentId || '-'), w - 22, y + 29, { align: 'right' });
  y += 44;
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(14, y, w - 28, 30, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 27, 75);
  doc.text('Student Name: ' + studentName, 18, y + 8);
  doc.text('Academy ID: ' + academyId, 18, y + 15);
  doc.text('Course: ' + courseName, 18, y + 22);
  doc.setTextColor(109, 40, 217);
  doc.text('Date: ' + dateStr + ' ' + timeStr, w - 18, y + 8, { align: 'right' });
  doc.text('Status: ' + (r.passed ? 'CONGRATULATIONS - PASSED' : 'NOT PASSED - KEEP LEARNING'), w - 18, y + 15, { align: 'right' });
  doc.text('Signed & Verified by IDT Academy', w - 18, y + 22, { align: 'right' });
  y += 40;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 27, 75);
  doc.text('Performance Summary', 16, y);
  y += 7;
  doc.setFontSize(9);
  const correct = results.filter((x) => x.is_correct).length;
  const wrong = results.filter((x) => !x.is_correct && !x.skipped).length;
  const skipped = results.filter((x) => x.skipped).length;
  const rows = [
    ['Total Questions', String(results.length)],
    ['Fully Correct', String(correct)],
    ['Wrong Answers', String(wrong)],
    ['Skipped', String(skipped)],
    ['Final Marks', fmtMarks(r.score) + ' / ' + r.maxMarks + ' (' + r.pct + '%)'],
    ['Time Allowed', Math.round(QUIZ_SECONDS / 60) + ' minutes']
  ];
  rows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 247, 255);
      doc.rect(14, y - 4.5, w - 28, 7, 'F');
    }
    doc.setTextColor(60, 58, 107);
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], 18, y);
    doc.setTextColor(30, 27, 75);
    doc.setFont('helvetica', 'bold');
    doc.text(row[1], w - 18, y, { align: 'right' });
    y += 7;
  });
  pdfSignatures(doc, w, h, y + 4, logo, signChair, signCeo, dateStr);
  return doc;
}

async function downloadResultPdf() {
  if (!lastResult) {
    showToast('info', 'No Result Yet', 'Finish an assessment first to download its slip.');
    return;
  }
  miniLoad('Preparing your slips...');
  try {
    const doc = await buildResultPdf();
    const studentName = ((userData && userData.full_name) || 'Student').replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '');
    doc.save('IDT_Assessment_Slips_' + studentName + '.pdf');
    miniHide();
    showToast('success', 'PDF Downloaded', 'Your assessment slips have been downloaded. You can print them anytime.');
  } catch (err) {
    miniHide();
    showToast('error', 'PDF Failed', (err && err.message) || 'Could not create the PDF.');
  }
}

async function emailResult() {
  if (!user || !userData) return;
  if (!lastResult) {
    showToast('info', 'No Result Yet', 'Finish an assessment first to email its result.');
    return;
  }
  const email = userData.email;
  if (!email) {
    showToast('error', 'No Email Found', 'There is no email address on your account.');
    return;
  }
  miniLoad('Emailing your result...');
  try {
    const doc = await buildResultPdf();
    const pdfBase64 = doc.output('datauristring');
    await withTimeout(sendResultEmail({
      user_id: user.id,
      academy_id: getAcademyId(),
      email: email,
      full_name: userData.full_name || '',
      course_name: lastResult.courseName,
      score: lastResult.score,
      max_marks: lastResult.maxMarks,
      pct: lastResult.pct,
      passed: lastResult.passed,
      date: formatDateLong(new Date(lastResult.dateIso)),
      pdf_base64: pdfBase64
    }), AI_TIMEOUT_MS, 'Sending the email took too long. Please try again.');
    miniHide();
    showToast('success', 'Email Sent!', 'Your result has been sent to ' + email + '. Check your inbox (and spam folder).');
  } catch (err) {
    miniHide();
    showToast('error', 'Email Failed', (err && err.message) || 'Could not send the email. Please try again.');
  }
}

function markdownToHtml(md) {
  let html = escapeHtml(String(md == null ? '' : md));
  html = html.replace(/```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g, (m, lang, code) => '<pre><code>' + code.replace(/\n$/, '') + '</code></pre>');
  html = html.replace(/^\s*#{1,6}\s*/gm, '');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  html = html.replace(/(^|[\s(>])\*([^*\n]+?)\*(?=[\s).,!?:;<]|$)/g, '$1<i>$2</i>');
  html = html.replace(/__(.+?)__/g, '<b>$1</b>');
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  html = html.replace(/^\s*[-•*]\s+/gm, '&bull; ');
  html = html.replace(/^\s*(\d+)[.)]\s+/gm, '<b>$1.</b> ');
  html = html.replace(/[ \t]+\n/g, '\n');
  html = html.replace(/\n{3,}/g, '\n\n');
  const parts = html.split(/(<pre>[\s\S]*?<\/pre>)/);
  return parts.map((p) => (p.indexOf('<pre>') === 0 ? p : p.replace(/\n/g, '<br>'))).join('');
}

function saveChatHistory() {
  chatHistories[activeCourseId] = (chatHistories[activeCourseId] || []).slice(-12);
  saveUpdate({ chat_history: chatHistories }, true);
}

function startCountdown() {
  if (!paymentState) return;
  if (paymentState.timer) clearInterval(paymentState.timer);
  paymentState.timer = setInterval(() => {
    if (!paymentState) return;
    const remain = paymentState.endTime - Date.now();
    if (remain <= 0) {
      clearInterval(paymentState.timer);
      paymentState.timer = null;
      const po = $('paymentOverlay');
      const pg = $('pendingGate');
      if (po) po.classList.remove('open');
      if (pg) pg.classList.add('open');
      showToast('error', 'Payment Expired', 'The payment window expired. Please tap Pay Now to create a new one.');
      return;
    }
    const m = Math.floor(remain / 60000);
    const s = Math.floor((remain % 60000) / 1000);
    const el = $('payCountdown');
    if (el) el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }, 1000);
}

function stopStatusPolling() {
  if (statusPollTimer) {
    clearInterval(statusPollTimer);
    statusPollTimer = null;
  }
}

function stopAllPayLinks() {
  const box = $('payTransferLinkBox');
  if (box) box.remove();
}

async function handlePaymentConfirmed() {
  stopStatusPolling();
  if (paymentState) {
    if (paymentState.timer) clearInterval(paymentState.timer);
    paymentState.verified = true;
  }
  const po = $('paymentOverlay');
  const pg = $('pendingGate');
  if (po) po.classList.remove('open');
  if (pg) pg.classList.remove('open');
  stopAllPayLinks();
  confetti();
  showToast('success', 'Payment Confirmed! 🎉', 'Congratulations! Your payment was successful. Your dashboard is now unlocked.');
  await loadDashboard();
}

function startStatusPolling() {
  stopStatusPolling();
  statusPollTimer = setInterval(async () => {
    try {
      const status = await fetchStatusOnce();
      if (String(status).toLowerCase() === 'active') {
        await handlePaymentConfirmed();
      }
    } catch (_) {}
  }, STATUS_POLL_MS);
}

function startVerifyPolling() {
  let tries = 0;
  const poll = setInterval(async () => {
    tries++;
    if (!paymentState || paymentState.verified || tries > 90) {
      clearInterval(poll);
      return;
    }
    if (!paymentState.reference) return;
    try {
      const res = await verifyPayment({ reference: paymentState.reference, user_id: user.id });
      if (res && (res.status === 'active' || res.paid === true)) {
        clearInterval(poll);
        await handlePaymentConfirmed();
      }
    } catch (_) {}
  }, 20000);
}

async function startPayment() {
  const course = getPrimaryCourse();
  if (!course.valid || !course.course_price || !course.course_id) {
    showToast('info', 'Select A Course First', 'Please choose a course before paying. Pick the one you want below.');
    openCoursePush();
    const sub = $('pnSub');
    if (sub) sub.textContent = 'Please select a course below to continue with your payment.';
    return;
  }
  const price = Number(course.course_price || 0);
  if (price === 3500) {
    showToast('error', 'Invalid Course Price', 'This course price is not valid for payment. Please select a course from the list below.');
    openCoursePush();
    const sub = $('pnSub');
    if (sub) sub.textContent = 'Please select a valid course below to continue with your payment.';
    return;
  }
  const payBtn = $('btnPayNow');
  if (!payBtn || payBtn.disabled) return;
  const oldBtnHtml = payBtn.innerHTML;
  payBtn.disabled = true;
  payBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
  miniLoad('Creating payment details...');
  try {
    const res = await withTimeout(createPayment({
      user_id: user.id,
      academy_id: getAcademyId(),
      email: (userData && userData.email) || '',
      full_name: (userData && userData.full_name) || '',
      course_id: course.course_id,
      course_name: course.course_name,
      price: price
    }), AI_TIMEOUT_MS, 'Creating the payment took too long. Please try again.');

    const accountNumber = res.account_number || res.accountNumber || '';
    const bankName = res.bank_name || res.bankName || '';
    const authUrl = res.authorization_url || res.authorizationUrl || '';
    const reference = res.reference || res.ref || '';
    const amount = Number(res.amount || price || 0);
    const minutes = Number(res.expires_in_minutes || 30) || 30;

    if (paymentState && paymentState.timer) clearInterval(paymentState.timer);
    paymentState = {
      reference: reference,
      authorizationUrl: authUrl,
      endTime: Date.now() + minutes * 60 * 1000,
      timer: null,
      verified: false
    };

    stopAllPayLinks();

    if (authUrl) {
      const po = $('paymentOverlay');
      const pg = $('pendingGate');
      if (po) po.classList.remove('open');
      if (pg) pg.classList.remove('open');
      miniLoad('Opening Paystack...');
      startVerifyPolling();
      startStatusPolling();
      showToast('info', 'Payment Window Opened', 'Complete your payment in the Paystack window. Your dashboard unlocks automatically after payment.');
      setTimeout(() => {
        window.location.href = authUrl;
      }, 800);
      payBtn.disabled = false;
      payBtn.innerHTML = oldBtnHtml;
      return;
    }

    if (accountNumber) {
      const amt = $('payAmount');
      const accNum = $('payAccountNumber');
      const bank = $('payBankName');
      const refEl = $('payReference');
      if (amt) amt.textContent = formatMoney(amount);
      if (accNum) accNum.textContent = accountNumber;
      if (bank) bank.textContent = bankName;
      if (refEl && refEl.childNodes[0]) {
        refEl.childNodes[0].nodeValue = reference;
        const small = refEl.querySelector('small');
        if (small) small.textContent = 'Use this reference when making your transfer';
      }
      const btnAcc = $('btnCopyAccount');
      const btnRef = $('btnCopyRef');
      if (btnAcc) btnAcc.dataset.copy = accountNumber;
      if (btnRef) btnRef.dataset.copy = reference;
      const accNameRow = $('payAccountNameRow');
      if (accNameRow) accNameRow.classList.add('hidden');
      [accNum, bank, refEl].forEach((el) => {
        if (el && el.parentElement) el.parentElement.classList.remove('hidden');
      });
      const linkBox = document.createElement('div');
      linkBox.id = 'payTransferLinkBox';
      linkBox.style.cssText = 'margin:14px 0 4px;padding:14px 16px;border-radius:14px;background:rgba(124,58,237,.07);border:1.5px solid rgba(124,58,237,.25);text-align:center';
      let inner = '<div style="font-size:12px;font-weight:800;color:#1e1b4b;margin-bottom:4px"><i class="fa-solid fa-building-columns"></i> Transfer to the temporary account below</div>';
      if (bankName) inner += '<div style="font-size:11.5px;color:#6d6a8a;margin-bottom:10px">Bank: <b>' + escapeHtml(bankName) + '</b> • Expires in ' + minutes + ' minutes</div>';
      inner += '<div style="font-size:20px;font-weight:900;letter-spacing:1.5px;color:#6d28d9">' + escapeHtml(accountNumber) + '</div>';
      inner += '<p style="font-size:10.5px;color:#6d6a8a;margin-top:10px">Your dashboard unlocks automatically the moment your payment is confirmed.</p>';
      linkBox.innerHTML = inner;
      const overlay = $('paymentOverlay');
      if (overlay) {
        const body = overlay.querySelector('.ov-body') || overlay;
        body.insertBefore(linkBox, body.firstChild);
      }
      const pg = $('pendingGate');
      const po = $('paymentOverlay');
      if (pg) pg.classList.remove('open');
      if (po) po.classList.add('open');
      startCountdown();
      startVerifyPolling();
      startStatusPolling();
      miniHide();
      payBtn.disabled = false;
      payBtn.innerHTML = oldBtnHtml;
      showToast('info', 'Payment Details Ready', 'Transfer the exact amount to the account shown. Your dashboard unlocks automatically after payment.');
      return;
    }

    throw new Error('No payment details returned from server');
  } catch (err) {
    miniHide();
    payBtn.disabled = false;
    payBtn.innerHTML = oldBtnHtml;
    showToast('error', 'Payment Failed', (err && err.message) || 'Could not create payment details. Please try again.');
  }
}

async function loadDashboard() {
  showLoading();
  try {
    await loadCourseInfos();
    await refreshProfile();
    await loadUpdateTable();
    await cleanupOldSupabaseData();
    const cleanUd = sanitizeUserData(userData);
    courseList = collectCourses(cleanUd);
    for (const c of courseList) {
      await loadTopicsFor(c.course_id);
    }
    renderUserIdBadge();
    renderMenu();
    renderUserGreet();
    const status = String((userData && userData.status) || 'pending').toLowerCase();
    if (status !== 'active') {
      const app = $('app');
      if (app) app.classList.add('hidden');
      renderPendingGate();
      const gate = $('pendingGate');
      if (gate) gate.classList.add('open');
      if (isCourseMissing(cleanUd)) {
        openCoursePush();
        const sub = $('pnSub');
        if (sub) sub.textContent = 'Your account has no course yet. Pick a course below and complete your payment to start learning.';
      }
      return;
    }
    stopStatusPolling();
    const gate = $('pendingGate');
    if (gate) gate.classList.remove('open');
    const po = $('paymentOverlay');
    if (po) po.classList.remove('open');
    const paidCourses = courseList.filter((c) => {
      const st = String(c.status || '').toLowerCase();
      const isMainPaid = c.course_id === String((userData && userData.course_id) || '').trim() && status === 'active';
      if (st !== 'active' && !isMainPaid) return false;
      return !looksLikeJamb(c.course_id, c.course_name, c.course_price);
    });
    if (paidCourses.length === 0) {
      showToast('info', 'No Paid Course', 'No paid course was found on your account. Please select a course and complete your payment.');
      openCoursePush();
      return;
    }
    courseList = paidCourses;
    const cid = pickDefaultCourse(paidCourses);
    await selectCourse(cid, false);
    const app = $('app');
    if (app) app.classList.remove('hidden');
    startSessionClock();
    loadAd();
    showToast('success', 'Welcome Back!', 'Happy learning ' + ((userData && userData.full_name) || '') + '! Keep going, you are doing great.');
  } catch (err) {
    showToast('error', 'Dashboard Error', 'Could not load your dashboard. Please check your internet connection and refresh.');
  } finally {
    hideLoading();
  }
}

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxSide = 1024;
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          const scale = Math.min(1, maxSide / Math.max(w, h));
          const c = document.createElement('canvas');
          c.width = Math.round(w * scale);
          c.height = Math.round(h * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          let q = 0.6;
          let dataUrl = c.toDataURL('image/jpeg', q);
          while (dataUrl.length > 280000 && q > 0.3) {
            q -= 0.1;
            dataUrl = c.toDataURL('image/jpeg', q);
          }
          resolve(dataUrl.split(',')[1] || '');
        } catch (e) {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = reader.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function renderImgPreview() {
  const box = $('chatImgPreview');
  if (!box) return;
  if (!pendingChatImages.length) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  box.classList.remove('hidden');
  box.innerHTML = pendingChatImages.map((src, i) =>
    '<div class="cf-img-item"><img src="' + escapeHtml(src) + '" alt="photo"><button type="button" class="cf-img-x" data-i="' + i + '"><i class="fa-solid fa-xmark"></i></button></div>'
  ).join('');
  box.querySelectorAll('.cf-img-x').forEach((b) => {
    b.addEventListener('click', () => {
      pendingChatImages.splice(parseInt(b.dataset.i, 10), 1);
      renderImgPreview();
    });
  });
}

function hideQuickButtons() {
  const quick = document.querySelector('.cf-quick');
  if (quick) quick.classList.add('hidden');
}

function syncLangButtons() {
  const headerLangs = $('aiHeaderLangs');
  if (!headerLangs) return;
  const cur = String(aiSelectedLang || 'english').toLowerCase();
  let matched = false;
  headerLangs.querySelectorAll('button[data-lang]').forEach((b) => {
    const on = String(b.dataset.lang).toLowerCase() === cur;
    b.classList.toggle('active', on);
    if (on) matched = true;
  });
  const other = $('aiOtherLangBtn');
  if (other) {
    if (!matched && cur) {
      other.classList.add('active');
      other.innerHTML = '<i class="fa-solid fa-check"></i> ' + escapeHtml(aiLabel(aiSelectedLang));
    } else {
      other.classList.remove('active');
      other.innerHTML = '<i class="fa-solid fa-plus"></i> Other Language...';
    }
  }
}

function scrollChatToBottom() {
  const box = $('chatMsgs');
  if (box) box.scrollTop = box.scrollHeight;
}

function addAiMessage(role, content, images) {
  const area = $('chatMsgs');
  if (!area) return null;
  const row = document.createElement('div');
  row.className = 'cf-row ' + (role === 'bot' ? 'bot-row' : 'user-row');
  const avatar = role === 'bot' ? '<img class="cf-avatar-sm" src="' + AI_ICON_URL + '" alt="AI">' : '';
  const who = role === 'bot' ? '<div class="cf-who">AI Tutor</div>' : '<div class="cf-who">You</div>';
  const imgs = (images && images.length)
    ? '<div class="cf-msg-imgs">' + images.map((s) => '<img src="' + escapeHtml(s) + '" alt="photo">').join('') + '</div>'
    : '';
  let inner;
  if (role === 'bot') {
    inner = markdownToHtml(content);
  } else {
    inner = (content ? '<p>' + escapeHtml(content) + '</p>' : '') + imgs;
  }
  row.innerHTML = avatar + '<div class="cf-content">' + who + '<div class="cf-bubble">' + inner + '</div></div>';
  area.appendChild(row);
  scrollChatToBottom();
  return row;
}

function aiThinking() {
  const area = $('chatMsgs');
  if (!area) return null;
  const row = document.createElement('div');
  row.className = 'cf-row bot-row';
  row.innerHTML = '<img class="cf-avatar-sm" src="' + AI_ICON_URL + '" alt="AI">' +
    '<div class="cf-content"><div class="cf-bubble"><span class="cf-typing"><span></span><span></span><span></span></span></div></div>';
  area.appendChild(row);
  scrollChatToBottom();
  return row;
}

function removeNode(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function openChat() {
  const overlay = $('chatOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  syncLangButtons();
  const area = $('chatMsgs');
  if (area && !area.children.length) {
    const tn = currentTopic ? (currentTopic.topic_name || '') : '';
    addAiMessage('bot', 'Hello ' + ((userData && userData.full_name) || 'Student') + '! I am your IDT Academy teacher.' + (tn ? ' We are on "' + tn + '".' : '') + ' Ask me anything, send a photo, or pick a language above and I will explain this topic for you.');
  }
  const input = $('chatInput');
  if (input) setTimeout(() => input.focus(), 250);
}

function closeChat() {
  const overlay = $('chatOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function setAiSending(sending) {
  aiBusy = sending;
  const sendBtn = $('chatSend');
  if (sendBtn) {
    sendBtn.disabled = sending;
    sendBtn.innerHTML = sending ? '<i class="fa-solid fa-spinner fa-spin"></i>' : '<i class="fa-solid fa-paper-plane"></i>';
  }
}

function topicPayloadBase() {
  return {
    user_id: user.id,
    user_name: (userData && userData.full_name) || 'Student',
    academy_id: getAcademyId(),
    course_id: activeCourseId,
    course_name: (courseInfoMap[activeCourseId] || {}).course_name || (userData && userData.course_name) || '',
    topic_name: currentTopic ? (currentTopic.topic_name || '') : '',
    topic_text: currentTopic ? String(currentTopic.topic_text || '').slice(0, 6000) : ''
  };
}

function extractAiAnswer(res) {
  if (!res) return '';
  if (typeof res === 'string') return res;
  return String(res.answer || res.explanation || res.text || res.message || res.result || '').trim();
}

async function handleAiChatSend() {
  const input = $('chatInput');
  if (!input) return;
  if (aiBusy) return;
  const q = input.value.trim();
  const imagesToSend = pendingChatImages.slice();
  if (!q && !imagesToSend.length) return;

  addAiMessage('user', q, imagesToSend);
  pendingChatImages = [];
  renderImgPreview();
  hideQuickButtons();
  input.value = '';
  input.style.height = 'auto';

  const hist = chatHistories[activeCourseId] = chatHistories[activeCourseId] || [];
  hist.push({ role: 'user', content: q || '[Images sent]' });

  setAiSending(true);
  const thinkingEl = aiThinking();
  try {
    const res = await withTimeout(askQuestion(Object.assign(topicPayloadBase(), {
      question: q || 'Please look at the image I sent and help me understand it.',
      images: imagesToSend,
      lang: aiSelectedLang || getPreferredLang(),
      language: aiLabel(aiSelectedLang || getPreferredLang()),
      history: hist.slice(-9, -1)
    })), AI_TIMEOUT_MS, 'The AI took too long to answer. Please try again.');
    removeNode(thinkingEl);
    const answer = extractAiAnswer(res);
    if (!answer) throw new Error('The AI sent an empty reply');
    addAiMessage('bot', answer);
    hist.push({ role: 'assistant', content: answer });
    saveChatHistory();
  } catch (err) {
    removeNode(thinkingEl);
    hist.pop();
    addAiMessage('bot', 'Sorry, I could not answer right now. ' + ((err && err.message) || 'Please try again.'));
    showToast('error', 'Chat Error', (err && err.message) || 'Failed to get a reply. Please try again.');
  } finally {
    setAiSending(false);
    scrollChatToBottom();
    input.focus();
  }
}

async function runExplain(lang) {
  if (!currentTopic) {
    showToast('info', 'No Topic', 'Open a topic first so the AI can explain it.');
    return;
  }
  if (aiBusy) {
    showToast('info', 'Please Wait', 'The AI is still answering. Try again in a moment.');
    return;
  }
  const chosen = normalizeLangCode(lang || aiSelectedLang);
  hideQuickButtons();
  addAiMessage('user', 'Explain "' + (currentTopic.topic_name || 'this topic') + '" in ' + aiLabel(chosen) + '.');
  const hist = chatHistories[activeCourseId] = chatHistories[activeCourseId] || [];
  hist.push({ role: 'user', content: 'Explain this topic in ' + aiLabel(chosen) });
  setAiSending(true);
  const thinkingEl = aiThinking();
  try {
    const res = await withTimeout(explainText(Object.assign(topicPayloadBase(), {
      lang: chosen,
      language: aiLabel(chosen),
      history: hist.slice(-9, -1)
    })), AI_TIMEOUT_MS, 'The AI took too long to explain. Please try again.');
    removeNode(thinkingEl);
    const answer = extractAiAnswer(res);
    if (!answer) throw new Error('The AI sent an empty reply');
    addAiMessage('bot', answer);
    hist.push({ role: 'assistant', content: answer });
    saveChatHistory();
  } catch (err) {
    removeNode(thinkingEl);
    hist.pop();
    addAiMessage('bot', 'Sorry, I could not explain right now. ' + ((err && err.message) || 'Please try again.'));
    showToast('error', 'Explain Failed', (err && err.message) || 'Could not get the explanation. Please try again.');
  } finally {
    setAiSending(false);
    scrollChatToBottom();
  }
}

function applyLanguageChoice(lang) {
  aiSelectedLang = normalizeLangCode(lang);
  setPreferredLang(aiSelectedLang);
  syncLangButtons();
}

function crOutputEl() {
  return $('crOutput');
}

function cleanupCodeRun() {
  if (codeTimeout) {
    clearTimeout(codeTimeout);
    codeTimeout = null;
  }
  if (codeHandler) {
    window.removeEventListener('message', codeHandler);
    codeHandler = null;
  }
  if (codeFrame) {
    codeFrame.remove();
    codeFrame = null;
  }
}

function openCodeRunner() {
  const box = $('codeRunner');
  if (!box || !currentTopic) return;
  box.classList.remove('hidden');
  const key = activeCourseId + '_' + currentTopicIdx;
  const input = $('crInput');
  if (input && runnerTopicKey !== key) {
    runnerTopicKey = key;
    const block = extractCodeBlock(currentTopic.topic_text);
    input.value = block ? block.code : '';
    const sel = $('crLang');
    if (sel && block) {
      const l = block.lang === 'js' ? 'javascript' : (block.lang === 'py' ? 'python' : (block.lang === 'sh' ? 'bash' : block.lang));
      if (['javascript', 'html', 'python', 'bash'].indexOf(l) !== -1) sel.value = l;
    }
    const out = crOutputEl();
    if (out) out.textContent = '> Output will appear here';
  }
  try { box.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
}

function renderCodeLines(lines) {
  const out = crOutputEl();
  if (!out) return;
  if (!lines.length) {
    out.innerHTML = '<span class="ok">&gt; Done. The code ran without printing anything.</span>';
    return;
  }
  out.innerHTML = lines.map((l) => '<div class="' + (l.err ? 'err' : 'ok') + '">' + (l.err ? '&#10006; ' : '&gt; ') + escapeHtml(l.text) + '</div>').join('');
}

function runJavaScript(code) {
  cleanupCodeRun();
  const out = crOutputEl();
  if (out) out.innerHTML = '<span class="ok">&gt; Running...</span>';
  const token = 'cr' + Date.now() + Math.floor(Math.random() * 1000);
  const lines = [];
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.style.cssText = 'display:none;width:0;height:0;border:0';
  codeFrame = frame;
  codeHandler = (ev) => {
    if (!codeFrame || ev.source !== codeFrame.contentWindow) return;
    const d = ev.data;
    if (!d || d.token !== token) return;
    if (d.type === 'log') lines.push({ text: String(d.text), err: false });
    if (d.type === 'error') lines.push({ text: String(d.text), err: true });
    if (d.type === 'done') {
      cleanupCodeRun();
      renderCodeLines(lines);
    }
  };
  window.addEventListener('message', codeHandler);
  codeTimeout = setTimeout(() => {
    lines.push({ text: 'Stopped: the code took too long to finish.', err: true });
    cleanupCodeRun();
    renderCodeLines(lines);
  }, 6000);
  const safeCode = JSON.stringify(code).replace(/</g, '\\u003c');
  const safeToken = JSON.stringify(token);
  const script =
    '(function(){var T=' + safeToken + ';' +
    'function send(t,x){parent.postMessage({token:T,type:t,text:x},"*")}' +
    'function fmt(a){return Array.prototype.map.call(a,function(v){if(typeof v==="object"&&v!==null){try{return JSON.stringify(v)}catch(e){return String(v)}}return String(v)}).join(" ")}' +
    'console.log=function(){send("log",fmt(arguments))};' +
    'console.info=console.log;console.warn=console.log;' +
    'console.error=function(){send("error",fmt(arguments))};' +
    'window.onerror=function(m){send("error",String(m));send("done","");return true};' +
    'var AF=Object.getPrototypeOf(async function(){}).constructor;' +
    'try{AF(' + safeCode + ')().then(function(){send("done","")}).catch(function(e){send("error",String((e&&e.message)||e));send("done","")})}' +
    'catch(e){send("error",String((e&&e.message)||e));send("done","")}})();';
  frame.srcdoc = '<!DOCTYPE html><html><body><scr' + 'ipt>' + script + '</scr' + 'ipt></body></html>';
  document.body.appendChild(frame);
}

function runHtmlPreview(code) {
  cleanupCodeRun();
  const out = crOutputEl();
  if (!out) return;
  out.innerHTML = '';
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.style.cssText = 'width:100%;height:240px;border:0;background:#fff;border-radius:8px';
  frame.srcdoc = code;
  out.appendChild(frame);
}

function runCode() {
  const input = $('crInput');
  const sel = $('crLang');
  const out = crOutputEl();
  if (!input || !out) return;
  const code = input.value;
  const lang = sel ? sel.value : 'javascript';
  if (!code.trim()) {
    out.innerHTML = '<span class="err">&#10006; Write some code first, then press Run.</span>';
    return;
  }
  if (lang === 'javascript') {
    runJavaScript(code);
  } else if (lang === 'html') {
    runHtmlPreview(code);
  } else {
    out.innerHTML = '<span class="err">&#10006; ' + escapeHtml(lang === 'python' ? 'Python' : 'Bash') + ' cannot run inside the browser. Choose JavaScript or HTML to test your code live.</span>';
  }
}

function on(id, event, handler) {
  const el = $(id);
  if (!el) return;
  el.addEventListener(event, handler);
}

function bindCopyButton(id, okTitle, okMessage) {
  on(id, 'click', async (e) => {
    const btn = e.target.closest('.mini-copy') || e.currentTarget;
    const val = btn.dataset.copy;
    if (!val) return;
    try {
      await copyText(val);
      btn.classList.add('done');
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      showToast('success', okTitle, okMessage);
      setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 2000);
    } catch (err) {
      showToast('error', 'Copy Failed', 'Could not copy. Please copy it by hand.');
    }
  });
}

function domReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

function closeAssessmentOverlay() {
  const o = $('assessmentOverlay');
  if (o) o.classList.remove('open');
  stopRetryTimer();
}

domReady(() => {
  ensureAppFreshness();
  injectExtraStyles();
  ensureToastWrap();
  showLoading();
  document.documentElement.classList.add('ready');

  (async () => {
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
      user = { id: String(user.id) };
      await loadDashboard();
    } catch (err) {
      hideLoading();
      showToast('error', 'Login Needed', 'Something went wrong. Please login again.');
      setTimeout(() => window.location.replace('register.html'), 2500);
    }
  })();

  on('menuBtn', 'click', () => {
    const m = $('sideMenu');
    if (m) m.classList.add('open');
  });

  on('menuClose', 'click', () => {
    const m = $('sideMenu');
    if (m) m.classList.remove('open');
  });

  on('menuLogout', 'click', () => {
    localStorage.removeItem('idt_user');
    showToast('info', 'Logged Out', 'You have been logged out. Redirecting to login...');
    setTimeout(() => window.location.replace('register.html'), 1200);
  });

  on('smMyCourse', 'click', (e) => {
    e.preventDefault();
    const sm = $('sideMenu');
    if (sm) sm.classList.remove('open');
    if (courseList.length > 0) {
      openMyCourses();
    } else {
      openCoursePush();
      const sub = $('pnSub');
      if (sub) sub.textContent = 'You have no course yet. Pick a course below to continue.';
    }
  });

  on('btnCopyUserId', 'click', async (e) => {
    const btn = e.currentTarget;
    const academyId = getAcademyId();
    try {
      await copyText(academyId);
      btn.classList.add('done');
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      showToast('success', 'Academy ID Copied!', 'Your ID: ' + academyId);
      setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 2000);
    } catch (err) {
      showToast('error', 'Copy Failed', 'Could not copy your ID.');
    }
  });

  on('pnClose', 'click', closeCoursePush);

  on('btnPayNow', 'click', startPayment);

  on('paymentClose', 'click', () => {
    const po = $('paymentOverlay');
    const pg = $('pendingGate');
    if (po) po.classList.remove('open');
    if (pg) pg.classList.add('open');
  });

  bindCopyButton('btnCopyAccount', 'Copied!', 'Account number copied to clipboard.');
  bindCopyButton('btnCopyRef', 'Copied!', 'Payment reference copied to clipboard.');

  on('btnCopyRefLink', 'click', async (e) => {
    const btn = e.currentTarget;
    try {
      await copyText(buildReferralLink());
      btn.classList.add('done');
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      showToast('success', 'Referral Link Copied!', 'Share this link with your friends and earn ₦1,500 when they pay for any course.');
      setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 2000);
    } catch (err) {
      showToast('error', 'Copy Failed', 'Could not copy the link.');
    }
  });

  on('btnOpenReferralPage', 'click', () => {
    if (!user) return;
    window.location.href = 'referral.html?user_id=' + encodeURIComponent(user.id) + '&code=' + encodeURIComponent((userData && userData.referral_code) || '');
  });

  document.querySelectorAll('.social-chip').forEach((chip) => {
    chip.addEventListener('click', async () => {
      const link = buildReferralLink();
      const text = 'Join me at IDT Academy! Learn modern skills online. Use my referral link: ' + link;
      if (chip.classList.contains('wa')) {
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
        return;
      }
      if (chip.classList.contains('x')) {
        window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank', 'noopener');
        return;
      }
      if (chip.classList.contains('fb')) {
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link), '_blank', 'noopener');
        return;
      }
      try {
        await copyText(link);
        showToast('success', 'Link Copied!', 'Share it on ' + chip.textContent.trim() + ' and earn ₦1,500 per referral.');
      } catch (err) {
        showToast('error', 'Copy Failed', 'Could not copy the link.');
      }
    });
  });

  on('userAvatar', 'click', () => {
    if (courseList.length > 0) openMyCourses();
    else openCoursePush();
  });

  on('pendingCourseBox', 'click', () => {
    renderCoursePush();
    const t = $('pnTitle');
    if (t) t.textContent = 'Choose Your Course';
    const p = $('coursePush');
    if (p) p.classList.add('open');
  });

  on('btnPrevTopic', 'click', () => {
    if (currentTopicIdx > 0) goBackToTopic(currentTopicIdx - 1);
  });

  on('btnNextTopic', 'click', () => {
    if (isProcessingNext) return;
    isProcessingNext = true;
    Promise.resolve(advanceTopic()).catch(() => {
      showToast('error', 'Error', 'Next button failed. Please try again.');
    }).finally(() => {
      isProcessingNext = false;
    });
  });

  on('btnNotReady', 'click', () => {
    closeUnderstandModal();
    pendingNextIdx = -1;
    showToast('info', 'Good Choice', 'Take your time. Read the topic again and make sure you understand before moving on.');
  });

  on('btnReady', 'click', () => {
    handleReady();
  });

  on('btnCopyText', 'click', async (e) => {
    const btn = e.currentTarget;
    try {
      await copyText((currentTopic && currentTopic.topic_text) || '');
      btn.classList.add('done');
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      showToast('success', 'Text Copied!', 'The full topic text was copied to your clipboard.');
      setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 2000);
    } catch (err) {
      showToast('error', 'Copy Failed', 'Could not copy the text.');
    }
  });

  on('btnRunCode', 'click', openCodeRunner);
  on('btnCodeRun', 'click', openCodeRunner);
  on('crRunBtn', 'click', runCode);

  on('btnAskQuestion', 'click', openChat);

  on('btnExplainLang', 'click', () => {
    openChat();
    runExplain(currentLang());
  });

  on('videoExplainFloat', 'click', () => {
    openChat();
    runExplain(currentLang());
  });

  on('chatClose', 'click', closeChat);

  const chatForm = $('chatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAiChatSend();
    });
  }

  const chatInput = $('chatInput');
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        handleAiChatSend();
      }
    });
  }

  document.querySelectorAll('.cf-quick button[data-quick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = $('chatInput');
      if (!input) return;
      input.value = btn.dataset.quick;
      handleAiChatSend();
    });
  });

  const btnChatImage = $('btnChatImage');
  const chatImageInput = $('chatImageInput');
  if (btnChatImage && chatImageInput) {
    btnChatImage.addEventListener('click', () => chatImageInput.click());
    chatImageInput.addEventListener('change', async () => {
      const files = Array.from(chatImageInput.files || []);
      chatImageInput.value = '';
      if (!files.length) return;
      const room = 3 - pendingChatImages.length;
      if (room <= 0) {
        showToast('info', 'Limit Reached', 'You can send a maximum of 3 images at once.');
        return;
      }
      miniLoad('Preparing images...');
      let added = 0;
      for (const f of files.slice(0, room)) {
        const b64 = await compressImage(f);
        if (b64) {
          pendingChatImages.push('data:image/jpeg;base64,' + b64);
          added++;
        }
      }
      miniHide();
      renderImgPreview();
      if (!added) showToast('error', 'Image Failed', 'Could not read that image. Please try another one.');
    });
  }

  on('btnToggleQuick', 'click', () => {
    const quick = document.querySelector('.cf-quick');
    if (quick) quick.classList.toggle('hidden');
  });

  const headerLangs = $('aiHeaderLangs');
  if (headerLangs) {
    headerLangs.querySelectorAll('button[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        const row = $('aiOtherLangRow');
        if (row) row.classList.add('hidden');
        applyLanguageChoice(lang);
        runExplain(lang);
      });
    });
  }

  on('aiOtherLangBtn', 'click', () => {
    const row = $('aiOtherLangRow');
    if (!row) return;
    row.classList.toggle('hidden');
    const input = $('aiOtherLangInput');
    if (input && !row.classList.contains('hidden')) setTimeout(() => input.focus(), 100);
  });

  on('aiOtherLangSend', 'click', () => {
    const input = $('aiOtherLangInput');
    const lang = (input && input.value.trim()) || '';
    if (!lang) {
      showToast('error', 'Language Required', 'Please type the language you want.');
      return;
    }
    if (input) input.value = '';
    const row = $('aiOtherLangRow');
    if (row) row.classList.add('hidden');
    applyLanguageChoice(lang);
    runExplain(lang);
  });

  on('aiOtherLangInput', 'keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const send = $('aiOtherLangSend');
      if (send) send.click();
    }
  });

  on('assessClose', 'click', () => {
    if (quizState && quizState.grading) return;
    if (quizState) {
      const ok = window.confirm('Closing now will end this assessment and count it as not passed. You can retake it after 2 hours. Do you want to close?');
      if (!ok) return;
      abandonQuiz();
      closeAssessmentOverlay();
      showToast('info', 'Assessment Ended', 'You can retake the assessment after 2 hours. Read the topics again.');
      return;
    }
    stopCamera();
    closeAssessmentOverlay();
  });

  on('btnStartAssessment', 'click', startAssessmentFlow);

  on('btnPrevQ', 'click', () => {
    if (quizState && !quizState.grading && quizState.currentQ > 0) {
      quizState.currentQ--;
      renderQuestion();
    }
  });

  on('btnNextQ', 'click', () => {
    if (!quizState || quizState.grading) return;
    const q = quizState.questions[quizState.currentQ];
    if (q && q.type !== 'write' && quizState.answers[quizState.currentQ] === '') {
      showToast('info', 'Choose An Answer', 'Please select an answer before continuing.');
      return;
    }
    if (quizState.currentQ < quizState.questions.length - 1) {
      quizState.currentQ++;
      renderQuestion();
    }
  });

  on('btnSubmitQuiz', 'click', () => {
    submitQuiz('manual');
  });

  on('btnDownloadPdf', 'click', downloadResultPdf);

  on('btnEmailResult', 'click', emailResult);

  on('btnContinueStudy', 'click', () => {
    closeAssessmentOverlay();
    const batch = lastResult ? lastResult.batch : assessBatch;
    if (batch > 0 && isBatchPassed(batch)) {
      goToTopic(batch);
    }
  });

  on('btnGoExam', 'click', () => {
    closeAssessmentOverlay();
    window.location.href = 'exam.html?course_id=' + encodeURIComponent(activeCourseId) + '&user_id=' + encodeURIComponent(user.id);
  });

  on('btnGoExamModal', 'click', () => {
    const m = $('completionModal');
    if (m) m.classList.remove('open');
    window.location.href = 'exam.html?course_id=' + encodeURIComponent(activeCourseId) + '&user_id=' + encodeURIComponent(user.id);
  });

  document.addEventListener('click', (e) => {
    const sm = $('sideMenu');
    if (!sm || !sm.classList.contains('open')) return;
    if (sm.contains(e.target)) return;
    const mb = $('menuBtn');
    if (mb && mb.contains(e.target)) return;
    sm.classList.remove('open');
  });

  window.__idtDashboardLoaded = true;
});

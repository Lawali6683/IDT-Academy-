import { supabase } from './supabase.js';
import { askQuestion, explainText, getAssessment, gradeAssessment, createPayment, verifyPayment, sendResultEmail } from './ai.js';

window.__idtDashboardLoaded = false;

const APP_VERSION = '2026-11-08.1';

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
const PAY_RETURN_POLL_MS = 3000;
const PAY_RETURN_SLOW_MS = 40000;
const PAY_RETURN_MAX_MS = 10 * 60 * 1000;

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
let ytPlayer = null;
let ytProgressTimer = null;
let ytApiPromise = null;
let videoFsActive = false;

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
    '.cf-bubble code{background:rgba(124,58,237,.1);padding:1px 6px;border-radius:6px}' +
    '#assessErrorNote{font-size:12px;color:#be123c;background:rgba(244,63,94,.08);border:1px solid rgba(244,63,94,.3);border-radius:12px;padding:10px 12px;margin-bottom:12px;line-height:1.55;text-align:left}' +
    '.video-wrap{overflow:hidden;-webkit-user-select:none;user-select:none}' +
    '.video-wrap .vp-frame{position:absolute;left:0;top:-25%;width:100%;height:150%;border:0;pointer-events:none}' +
    '.video-wrap .vp-shield{position:absolute;inset:0;z-index:2;background:transparent;cursor:pointer}' +
    '.video-wrap .vp-cover{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;background-color:#0b0d1a;background-size:cover;background-position:center;background-repeat:no-repeat;cursor:pointer}' +
    '.video-wrap .vp-cover::before{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(5,6,15,.55),rgba(5,6,15,.05) 55%,rgba(5,6,15,.25));pointer-events:none}' +
    '.vp-play{position:relative;z-index:1;width:72px;height:72px;border-radius:50%;border:none;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 34px rgba(109,40,217,.5);cursor:pointer;padding-left:4px}' +
    '.vp-bar{position:absolute;left:0;right:0;bottom:0;z-index:4;display:flex;align-items:center;gap:10px;padding:8px 12px;background:linear-gradient(to top,rgba(5,6,15,.85),transparent)}' +
    '.vp-btn{border:none;background:rgba(255,255,255,.15);color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
    '.vp-btn:hover{background:rgba(124,58,237,.85)}' +
    '.vp-time{font-size:11px;color:#fff;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.vp-seek{flex:1;min-width:0;accent-color:#a78bfa;height:4px;cursor:pointer}' +
    '.video-wrap:fullscreen{aspect-ratio:auto;width:100%;height:100%;background:#000}' +
    '.video-wrap:-webkit-full-screen{aspect-ratio:auto;width:100%;height:100%;background:#000}' +
    '.video-wrap.vp-pseudo-fs{position:fixed;inset:0;z-index:97000;width:100%;height:100%;aspect-ratio:auto;background:#000}' +
    '.video-explain-float{bottom:58px}';
  document.head.appendChild(st);
}

function injectPayStyles() {
  if (document.getElementById('idt-pay-style')) return;
  const st = document.createElement('style');
  st.id = 'idt-pay-style';
  st.textContent =
    '.pc-ov{position:fixed;inset:0;z-index:99996;display:flex;align-items:center;justify-content:center;padding:18px;background:linear-gradient(160deg,#0f0c29,#302b63 55%,#24243e);font-family:"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow:auto;transition:opacity .5s ease}' +
    '.pc-ov.pc-out{opacity:0;pointer-events:none}' +
    '.pc-ov::before,.pc-ov::after{content:"";position:absolute;border-radius:50%;filter:blur(70px);opacity:.45;pointer-events:none}' +
    '.pc-ov::before{width:320px;height:320px;left:-100px;top:-100px;background:#7c3aed}' +
    '.pc-ov::after{width:300px;height:300px;right:-90px;bottom:-90px;background:#06b6d4}' +
    '.pc-card{position:relative;z-index:1;width:100%;max-width:400px;text-align:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:28px;padding:26px 22px 24px;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 30px 70px rgba(0,0,0,.4)}' +
    '.pc-badge{display:inline-flex;align-items:center;gap:6px;margin-bottom:6px;padding:6px 12px;border-radius:999px;background:rgba(16,185,129,.18);color:#6ee7b7;font-size:11.5px;font-weight:800}' +
    '.pc-stage{position:relative;height:190px;display:flex;align-items:center;justify-content:center;perspective:700px}' +
    '.pc-bounce{position:relative;width:110px;height:110px;margin-top:-30px;transform-style:preserve-3d;animation:pcBounce 1.6s ease-in-out infinite}' +
    '@keyframes pcBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}' +
    '.pc-coin{position:absolute;inset:0;transform-style:preserve-3d;animation:pcSpin 3.6s linear infinite}' +
    '@keyframes pcSpin{to{transform:rotateY(360deg)}}' +
    '.pc-face,.pc-edge{position:absolute;inset:0;border-radius:50%}' +
    '.pc-face{-webkit-backface-visibility:hidden;backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 32% 28%,#fff3b0,#fbbf24 45%,#d97706);border:5px solid #f59e0b;box-shadow:inset 0 -8px 16px rgba(180,83,9,.45),inset 0 6px 12px rgba(255,255,255,.5)}' +
    '.pc-front{transform:translateZ(7px)}' +
    '.pc-back{transform:rotateY(180deg) translateZ(7px)}' +
    '.pc-edge{background:#d97706;border:2px solid #b45309}' +
    '.pc-eyes{display:flex;gap:20px;margin-bottom:8px}' +
    '.pc-eyes i{display:block;width:12px;height:16px;border-radius:50%;background:#1e1b4b;animation:pcBlink 3.2s infinite}' +
    '@keyframes pcBlink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}' +
    '.pc-mouth{width:26px;height:13px;border-bottom:4px solid #1e1b4b;border-radius:0 0 26px 26px}' +
    '.pc-n{font-size:46px;font-weight:900;color:#92400e;text-shadow:0 2px 0 rgba(255,255,255,.5)}' +
    '.pc-ck{display:none;font-size:44px;color:#fff}' +
    '.pc-shadow{position:absolute;bottom:14px;left:50%;width:90px;height:14px;margin-left:-45px;border-radius:50%;background:rgba(0,0,0,.45);filter:blur(5px);animation:pcShadow 1.6s ease-in-out infinite}' +
    '@keyframes pcShadow{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(.7);opacity:.3}}' +
    '.pc-spark{position:absolute;color:#fbbf24;font-size:16px;animation:pcTwinkle 2s ease-in-out infinite}' +
    '.pc-s1{left:14%;top:22%}.pc-s2{right:16%;top:14%;animation-delay:.5s}.pc-s3{left:22%;bottom:22%;animation-delay:1s}.pc-s4{right:20%;bottom:28%;animation-delay:1.4s}' +
    '@keyframes pcTwinkle{0%,100%{opacity:.2;transform:scale(.6) rotate(0)}50%{opacity:1;transform:scale(1.25) rotate(25deg)}}' +
    '.pc-title{margin:6px 0 8px;font-size:21px;font-weight:900;color:#fff}' +
    '.pc-msg{font-size:13px;line-height:1.65;color:#cbd5e1}' +
    '.pc-dots{display:flex;gap:7px;justify-content:center;margin-top:16px}' +
    '.pc-dots span{width:9px;height:9px;border-radius:50%;background:#a78bfa;animation:pcDot 1.2s infinite}' +
    '.pc-dots span:nth-child(2){animation-delay:.2s}.pc-dots span:nth-child(3){animation-delay:.4s}' +
    '@keyframes pcDot{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}' +
    '.pc-actions{display:flex;flex-direction:column;gap:10px;margin-top:18px}' +
    '.pc-actions.pc-hide{display:none}' +
    '.pc-btn{border:none;border-radius:14px;padding:13px 16px;font-size:13.5px;font-weight:800;cursor:pointer;color:#fff;background:linear-gradient(135deg,#7c3aed,#6d28d9)}' +
    '.pc-btn.alt{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25)}' +
    '.pc-btn:disabled{opacity:.6;cursor:not-allowed}' +
    '.pc-ok .pc-face{background:radial-gradient(circle at 32% 28%,#d1fae5,#34d399 45%,#059669);border-color:#10b981;box-shadow:inset 0 -8px 16px rgba(4,120,87,.45),inset 0 6px 12px rgba(255,255,255,.5)}' +
    '.pc-ok .pc-edge{background:#059669;border-color:#047857}' +
    '.pc-ok .pc-n{display:none}' +
    '.pc-ok .pc-ck{display:inline-block}' +
    '.pc-ok .pc-mouth{width:32px;height:16px;background:#1e1b4b;border-bottom:none;border-radius:0 0 32px 32px}' +
    '.pc-ok .pc-coin{animation:pcSpinOk 1.4s ease-out forwards}' +
    '@keyframes pcSpinOk{from{transform:rotateY(0)}to{transform:rotateY(720deg)}}' +
    '.pc-ok .pc-bounce{animation:pcJoy .7s ease-in-out infinite}' +
    '@keyframes pcJoy{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-26px) scale(1.06)}}' +
    '.pc-ok .pc-dots{display:none}' +
    '.pc-ok .pc-badge{background:rgba(251,191,36,.18);color:#fde68a}';
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  while (toastWrap.children.length > 3) {
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
    if (txt) txt.textContent = 'Video started ✓';
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
      stTxt.textContent = 'Video started ✓';
    } else {
      st.classList.remove('watched');
      stTxt.textContent = currentTopic.video_url ? 'Press play to start the video' : 'No video for this topic';
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

function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === 'function') {
        try { prev(); } catch (_) {}
      }
      resolve(window.YT);
    };
    const sc = document.createElement('script');
    sc.src = 'https://www.youtube.com/iframe_api';
    sc.async = true;
    sc.onerror = () => {
      ytApiPromise = null;
      reject(new Error('Video player could not load'));
    };
    document.head.appendChild(sc);
    setTimeout(() => {
      if (!(window.YT && window.YT.Player)) {
        ytApiPromise = null;
        reject(new Error('Video player took too long to load'));
      }
    }, 10000);
  });
  return ytApiPromise;
}

function exitVideoFullscreen() {
  const wrap = $('videoWrap');
  if (wrap) wrap.classList.remove('vp-pseudo-fs');
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl) {
    try {
      const fn = document.exitFullscreen || document.webkitExitFullscreen;
      const r = fn.call(document);
      if (r && r.catch) r.catch(() => {});
    } catch (_) {}
  }
  if (videoFsActive) document.body.style.overflow = '';
  videoFsActive = false;
}

function toggleVideoFullscreen() {
  const wrap = $('videoWrap');
  if (!wrap) return;
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl === wrap || wrap.classList.contains('vp-pseudo-fs')) {
    exitVideoFullscreen();
    return;
  }
  const usePseudo = () => {
    wrap.classList.add('vp-pseudo-fs');
    document.body.style.overflow = 'hidden';
    videoFsActive = true;
  };
  const req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
  if (req) {
    try {
      const r = req.call(wrap);
      videoFsActive = true;
      if (r && r.catch) r.catch(usePseudo);
      return;
    } catch (_) {}
  }
  usePseudo();
}

function destroyVideoPlayer() {
  if (ytProgressTimer) {
    clearInterval(ytProgressTimer);
    ytProgressTimer = null;
  }
  if (ytPlayer && typeof ytPlayer.destroy === 'function') {
    try { ytPlayer.destroy(); } catch (_) {}
  }
  ytPlayer = null;
  exitVideoFullscreen();
}

function fmtVideoTime(sec) {
  const t = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(t / 60);
  const r = t % 60;
  return m + ':' + String(r).padStart(2, '0');
}

function createPlayerUi() {
  const shield = document.createElement('div');
  shield.className = 'vp-shield';
  const cover = document.createElement('div');
  cover.className = 'vp-cover';
  cover.innerHTML = '<button type="button" class="vp-play" aria-label="Play video"><i class="fa-solid fa-play"></i></button>';
  const bar = document.createElement('div');
  bar.className = 'vp-bar';
  bar.innerHTML =
    '<button type="button" class="vp-btn vp-toggle" aria-label="Play or pause"><i class="fa-solid fa-play"></i></button>' +
    '<span class="vp-time vp-cur">0:00</span>' +
    '<input type="range" class="vp-seek" min="0" max="1000" value="0" step="1" aria-label="Seek">' +
    '<span class="vp-time vp-dur">0:00</span>' +
    '<button type="button" class="vp-btn vp-fs" aria-label="Fullscreen"><i class="fa-solid fa-expand"></i></button>';
  return {
    shield: shield,
    cover: cover,
    bar: bar,
    toggle: bar.querySelector('.vp-toggle'),
    cur: bar.querySelector('.vp-cur'),
    dur: bar.querySelector('.vp-dur'),
    seek: bar.querySelector('.vp-seek'),
    fs: bar.querySelector('.vp-fs'),
    seeking: false
  };
}

function setToggleIcon(ui, playing) {
  if (ui && ui.toggle) ui.toggle.innerHTML = '<i class="fa-solid ' + (playing ? 'fa-pause' : 'fa-play') + '"></i>';
}

function applyYouTubeThumb(cover, videoId) {
  if (!cover || !videoId) return;
  const tries = [
    'https://i.ytimg.com/vi/' + videoId + '/maxresdefault.jpg',
    'https://i.ytimg.com/vi/' + videoId + '/mqdefault.jpg'
  ];
  const next = (i) => {
    if (i >= tries.length) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth >= 300) {
        cover.style.backgroundImage = 'url("' + tries[i] + '")';
      } else {
        next(i + 1);
      }
    };
    img.onerror = () => next(i + 1);
    img.src = tries[i];
  };
  next(0);
}

function onYouTubeState(code, ui, idx) {
  if (idx !== currentTopicIdx) return;
  if (code === 1) {
    ui.cover.classList.add('hidden');
    setToggleIcon(ui, true);
    if (!isWatched(idx)) markWatched(idx);
  } else if (code === 3) {
    ui.cover.classList.add('hidden');
  } else {
    ui.cover.classList.remove('hidden');
    setToggleIcon(ui, false);
  }
}

function updateYouTubeProgress(ui) {
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
  let cur = 0;
  let dur = 0;
  try {
    cur = ytPlayer.getCurrentTime() || 0;
    dur = ytPlayer.getDuration() || 0;
  } catch (_) {
    return;
  }
  if (dur > 0 && !ui.seeking) ui.seek.value = String(Math.round((cur / dur) * 1000));
  ui.cur.textContent = fmtVideoTime(cur);
  ui.dur.textContent = fmtVideoTime(dur);
}

function useBasicEmbed(iframe, ui, idx) {
  const start = () => {
    if (idx === currentTopicIdx && !isWatched(idx)) markWatched(idx);
    iframe.style.pointerEvents = 'auto';
    iframe.allowFullscreen = true;
    iframe.src = iframe.src.replace('controls=0', 'controls=1').replace('fs=0', 'fs=1') + '&autoplay=1';
    ui.shield.remove();
    ui.cover.remove();
    ui.bar.remove();
  };
  ui.cover.addEventListener('click', start);
  ui.shield.addEventListener('click', start);
  ui.toggle.addEventListener('click', start);
}

function mountYouTube(wrap, floatBtn, videoId) {
  const idx = currentTopicIdx;
  const iframe = document.createElement('iframe');
  iframe.className = 'vp-frame';
  iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
  iframe.setAttribute('title', 'Lesson video');
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?enablejsapi=1&controls=0&rel=0&modestbranding=1&playsinline=1&fs=0&disablekb=1&iv_load_policy=3&cc_load_policy=0&origin=' + encodeURIComponent(window.location.origin);
  const ui = createPlayerUi();
  applyYouTubeThumb(ui.cover, videoId);
  wrap.insertBefore(iframe, wrap.firstChild);
  [ui.shield, ui.cover, ui.bar].forEach((el) => wrap.insertBefore(el, floatBtn || null));
  let ready = false;
  let pending = false;
  const press = () => {
    if (!ytPlayer || !ready) {
      pending = true;
      return;
    }
    try {
      const st = ytPlayer.getPlayerState();
      if (st === 1 || st === 3) ytPlayer.pauseVideo();
      else ytPlayer.playVideo();
    } catch (_) {}
  };
  ui.shield.addEventListener('click', press);
  ui.cover.addEventListener('click', press);
  ui.toggle.addEventListener('click', press);
  ui.fs.addEventListener('click', toggleVideoFullscreen);
  ui.seek.addEventListener('input', () => { ui.seeking = true; });
  ui.seek.addEventListener('change', () => {
    if (ytPlayer && ready) {
      try {
        const d = ytPlayer.getDuration() || 0;
        if (d > 0) ytPlayer.seekTo((Number(ui.seek.value) / 1000) * d, true);
      } catch (_) {}
    }
    ui.seeking = false;
  });
  loadYouTubeApi().then((YT) => {
    if (!iframe.isConnected || idx !== currentTopicIdx) return;
    ytPlayer = new YT.Player(iframe, {
      events: {
        onReady: () => {
          ready = true;
          if (pending) {
            pending = false;
            try { ytPlayer.playVideo(); } catch (_) {}
          }
        },
        onStateChange: (e) => onYouTubeState(e.data, ui, idx)
      }
    });
    ytProgressTimer = setInterval(() => updateYouTubeProgress(ui), 400);
  }).catch(() => {
    if (iframe.isConnected) useBasicEmbed(iframe, ui, idx);
  });
}

function mountDirectVideo(wrap, floatBtn, url) {
  const idx = currentTopicIdx;
  const vid = document.createElement('video');
  vid.src = String(url).indexOf('#') === -1 ? url + '#t=0.1' : url;
  vid.controls = true;
  vid.playsInline = true;
  vid.preload = 'metadata';
  vid.setAttribute('controlsList', 'nodownload noremoteplayback');
  vid.disablePictureInPicture = true;
  vid.addEventListener('contextmenu', (e) => e.preventDefault());
  vid.addEventListener('play', () => {
    if (idx === currentTopicIdx && !isWatched(idx)) markWatched(idx);
  });
  wrap.insertBefore(vid, wrap.firstChild);
}

function mountGenericEmbed(wrap, floatBtn, url) {
  const idx = currentTopicIdx;
  const cover = document.createElement('div');
  cover.className = 'vp-cover';
  cover.style.background = '#0b0d1a';
  cover.innerHTML = '<button type="button" class="vp-play" aria-label="Play video"><i class="fa-solid fa-play"></i></button>';
  wrap.insertBefore(cover, floatBtn || null);
  cover.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('allow', 'autoplay; picture-in-picture; fullscreen');
    iframe.setAttribute('title', 'Lesson video');
    iframe.allowFullscreen = true;
    wrap.insertBefore(iframe, wrap.firstChild);
    cover.remove();
    if (idx === currentTopicIdx && !isWatched(idx)) markWatched(idx);
  });
}

function renderVideo() {
  const wrap = $('videoWrap');
  if (!wrap) return;
  destroyVideoPlayer();
  clearVideoContent(wrap);
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
  if (yt) mountYouTube(wrap, floatBtn, yt);
  else if (isDirectVideo(url)) mountDirectVideo(wrap, floatBtn, url);
  else mountGenericEmbed(wrap, floatBtn, url);
  if (floatBtn) floatBtn.classList.add('visible');
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
      return;
    }
    if (currentTopics[nextIdx].is_final === true) {
      renderTopic();
      return;
    }
    if (topicNeedsWatch(currentTopicIdx) && !isWatched(currentTopicIdx)) {
      showToast('info', 'Press Play First', 'Please press play on the video to start it. You do not have to finish it before you continue.');
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
    }
  }
}

function openAssessment(batch) {
  assessBatch = batch;
  clearAssessError();
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

function clearAssessError() {
  const n = $('assessErrorNote');
  if (n) n.remove();
}

function showAssessError(message) {
  const btn = $('btnStartAssessment');
  if (!btn || !btn.parentElement) return;
  let note = $('assessErrorNote');
  if (!note) {
    note = document.createElement('div');
    note.id = 'assessErrorNote';
    btn.parentElement.insertBefore(note, btn);
  }
  note.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + escapeHtml(message);
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
    topic_text: String(t.topic_text || '').slice(0, 6000)
  }));
  if (batchTopics.length < ASSESS_BATCH_SIZE) {
    showToast('error', 'No Topics', 'Not enough topics were found for this assessment.');
    return;
  }
  clearAssessError();
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
    showAssessError('The assessment could not be created. ' + ((err && err.message) || 'Please try again.') + ' Tap Start Assessment to try again.');
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
      const res = await withTimeout(gradeAssessment(payload), AI_TIMEOUT_MS,

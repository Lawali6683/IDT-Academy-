const API_EXAM = '/api/examai';
const API_WIN = '/api/winuser';
const API_Y2 = '/api/year2';
const API_PAY = '/api/paystack';
const API_MAIL = '/api/sendEmail';

const PAGE_SIZE = { mcq: 4, tf: 5, write: 1 };
const PART_INFO = {
  mcq: { label: 'Multiple Choice', short: 'Part 1', marks: 1, icon: 'fa-list-check' },
  tf: { label: 'True or False', short: 'Part 2', marks: 1, icon: 'fa-circle-check' },
  write: { label: 'Written Answers', short: 'Part 3', marks: 3, icon: 'fa-pen' }
};
const MAX_LEAVES = 5;
const CONCURRENCY = 2;
const BATCH_TRIES = 4;
const PASS_MARK = 60;
const SIM_LEVELS = [0.7, 0.8, 0.9, 0.97, 1.01];
const DEFAULT_TARGETS = { mcq: 40, tf: 30, write: 10 };
const LOGO_URL = 'https://i.imgur.com/oyqM5oF.png';
const SIGN_CHAIR_URL = 'https://i.imgur.com/z8HOr4D.png';
const SIGN_CEO_URL = 'https://i.imgur.com/leqHq9I.png';

const $ = (id) => document.getElementById(id);

let user = null;
let courseId = '';
let S = null;
let sess = null;
let pages = [];
let curPage = 0;
let running = false;
let submitting = false;
let stream = null;
let timerId = null;
let tickerId = null;
let saveTimer = null;
let lastLeave = 0;
let lastShot = 0;
let resultData = null;
let viewRec = null;
let explainState = null;
let payState = null;
let payPoll = null;
let projectLang = 'English';
let selectedProject = '';
let toastCount = 0;
let memSession = null;
let pendingGrade = null;
let genBusy = false;

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function errText(e) {
  const m = String((e && e.message) || 'Something went wrong.');
  const d = e && e.detail ? String(e.detail) : '';
  return d && m.indexOf(d) === -1 ? m + ' [' + d + ']' : m;
}

function fmtDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return h + 'h ' + m + 'm ' + sec + 's';
  if (m > 0) return m + 'm ' + sec + 's';
  return sec + 's';
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtNum(n) {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function toast(type, title, message) {
  const wrap = $('toastWrap');
  if (!wrap || toastCount >= 3) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><div class="toast-body"><b>' + esc(title) + '</b><p>' + esc(message) + '</p></div>';
  wrap.appendChild(el);
  toastCount++;
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => {
      el.remove();
      toastCount = Math.max(0, toastCount - 1);
    }, 300);
  }, type === 'error' ? 5200 : 3400);
}

function miniLoad(text, sub) {
  $('miniLoaderText').textContent = text || 'Please wait...';
  const s = $('miniLoaderSub');
  s.textContent = sub || '';
  s.classList.toggle('hidden', !sub);
  $('miniLoaderBtn').classList.add('hidden');
  $('miniLoader').classList.add('open');
}

function miniHide() {
  $('miniLoader').classList.remove('open');
}

function friendly(status) {
  if (status === 404) return 'The service is not reachable right now. Please try again.';
  if (status === 413) return 'The data is too large.';
  if (status === 429) return 'Too many requests. Please wait a moment.';
  if (status >= 500) return 'The server is busy. Please try again in a moment.';
  return 'The request failed. Please try again.';
}

function isHard(e) {
  return Boolean(e && e.status && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429);
}

async function api(url, body, opt) {
  const o = opt || {};
  const retries = o.retries || 0;
  const timeout = o.timeout || 60000;
  let lastErr = null;
  for (let a = 0; a <= retries; a++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      clearTimeout(t);
      let data = null;
      try { data = await res.json(); } catch (_) { data = null; }
      if (res.ok && data && data.success !== false) return data;
      const err = new Error((data && data.error) || friendly(res.status));
      err.status = res.status;
      err.data = data;
      err.detail = data && data.detail ? String(data.detail) : (data ? '' : 'HTTP ' + res.status);
      if (isHard(err)) throw err;
      lastErr = err;
    } catch (e) {
      clearTimeout(t);
      if (isHard(e)) throw e;
      if (e && e.status) {
        lastErr = e;
      } else {
        lastErr = new Error(e && e.name === 'AbortError' ? 'The request took too long.' : 'Network problem. Check your internet connection.');
        lastErr.detail = String((e && e.message) || '').slice(0, 160);
      }
    }
    if (a < retries) await sleep(1500 * (a + 1));
  }
  throw lastErr || new Error('The request failed.');
}

function sessionKey() {
  return 'idt_exam_' + user.id + '_' + courseId;
}

function readSession() {
  try {
    const raw = localStorage.getItem(sessionKey());
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return memSession;
}

function saveSession() {
  if (!sess) return;
  memSession = sess;
  try {
    localStorage.setItem(sessionKey(), JSON.stringify(sess));
  } catch (_) {}
}

function saveSessionSoon() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSession, 400);
}

function clearSession() {
  sess = null;
  memSession = null;
  try { localStorage.removeItem(sessionKey()); } catch (_) {}
}

function showOnly(id) {
  ['examIntro', 'examGen', 'examActive', 'examResult'].forEach((x) => $(x).classList.toggle('hidden', x !== id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function confirmModal(opts) {
  return new Promise((resolve) => {
    const m = document.createElement('div');
    m.className = 'ov-backdrop open';
    m.style.zIndex = '9000';
    m.innerHTML = '<div class="ov-card" style="max-width:440px"><div class="ov-head"><h3><i class="fa-solid ' + (opts.icon || 'fa-circle-question') + '"></i> ' + esc(opts.title) + '</h3></div>' +
      '<div class="ov-body" style="text-align:center"><div style="font-size:13px;color:var(--ink);line-height:1.7;margin-bottom:16px">' + opts.html + '</div>' +
      '<div class="btn-row"><button class="btn btn-outline" data-r="0" style="padding:12px 16px;font-size:13px">' + esc(opts.cancel || 'Cancel') + '</button>' +
      '<button class="btn btn-primary" data-r="1" style="padding:12px 16px;font-size:13px">' + esc(opts.ok || 'OK') + '</button></div></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      m.remove();
      resolve(b.dataset.r === '1');
    });
  });
}

function loadUser() {
  try {
    const raw = localStorage.getItem('idt_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u && u.id ? { id: String(u.id), course_id: u.course_id || '' } : null;
  } catch (_) {
    return null;
  }
}

function setBadge(cls, icon, text) {
  const b = $('introBadge');
  b.className = 'badge ' + cls;
  b.innerHTML = '<i class="fa-solid ' + icon + '"></i> ' + text;
}

function stopTicker() {
  if (tickerId) clearInterval(tickerId);
  tickerId = null;
}

function tilesHtml(withMonths) {
  const t = (id, label) => '<div class="cd-tile"><b id="' + id + '">0</b><span>' + label + '</span></div>';
  return '<div class="cd-tiles">' + (withMonths ? t('cdMo', 'Months') : '') + t('cdD', 'Days') + t('cdH', 'Hours') + t('cdM', 'Minutes') + t('cdS', 'Seconds') + '</div>';
}

function startTicker(target, withMonths, onDone) {
  stopTicker();
  const tick = () => {
    const left = target - (Date.now() + (S.server_now - S.client_at));
    if (left <= 0) {
      stopTicker();
      onDone();
      return;
    }
    const days = Math.floor(left / 86400000);
    const set = (id, v) => {
      const el = $(id);
      if (el) el.textContent = String(v);
    };
    if (withMonths) {
      set('cdMo', Math.floor(days / 30));
      set('cdD', days % 30);
    } else {
      set('cdD', days);
    }
    set('cdH', Math.floor((left % 86400000) / 3600000));
    set('cdM', Math.floor((left % 3600000) / 60000));
    set('cdS', Math.floor((left % 60000) / 1000));
  };
  tick();
  tickerId = setInterval(tick, 1000);
}

function renderHistory() {
  const body = $('histTableBody');
  const empty = $('histEmpty');
  const list = S && Array.isArray(S.history) ? S.history : [];
  if (!list.length) {
    body.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.innerHTML = list.map((h, i) => {
    const badge = h.passed
      ? '<span class="badge green"><i class="fa-solid fa-circle-check"></i> Passed</span>'
      : '<span class="badge rose"><i class="fa-solid fa-circle-xmark"></i> Failed</span>';
    return '<tr><td>' + esc(fmtDate(h.date)) + (h.year ? ' • Year ' + h.year : '') + '</td><td><b>' + fmtNum(h.score) + ' / 100</b></td><td>' + badge + '</td>' +
      '<td>' + (h.has_details ? '<button class="btn-view" data-view="' + i + '"><i class="fa-solid fa-eye"></i> View Exam</button>' : '<span style="color:var(--muted);font-size:11.5px">Summary only</span>') + '</td></tr>';
  }).join('');
}

function panel(cls, icon, title, text, extra) {
  return '<div class="st-panel ' + cls + '"><i class="fa-solid ' + icon + ' big"></i><h3>' + esc(title) + '</h3><p>' + text + '</p>' + (extra || '') + '</div>';
}

function renderIntro() {
  stopTicker();
  const c = S.course;
  $('introCourseName').textContent = c.name;
  $('introStudentName').textContent = S.student.name;
  $('introCourseNumber').textContent = c.number || '000';
  if (c.image) $('introCourseImg').src = c.image;
  $('introTitle').textContent = c.is_diploma ? 'Diploma Exam • Year ' + c.year : 'Final Exam';
  $('introSubtitle').textContent = c.name + ' • Pass with 60 marks';
  $('ruleQ').textContent = '80';
  const box = $('statusPanel');
  const local = readSession();
  const startBtn = '<button class="btn btn-primary" id="btnStartExam"><i class="fa-solid fa-play"></i> Start Exam</button>';
  const dashBtn = '<a href="dashboard.html" class="btn btn-outline" style="text-decoration:none"><i class="fa-solid fa-arrow-left"></i> Back to Dashboard</a>';
  $('rulesCard').classList.remove('hidden');
  $('nextWrap').classList.add('hidden');

  if (local && local.phase === 'run' && !(S.state === 'active' && S.active && S.active.exam_id === local.exam_id)) {
    clearSession();
    sess = null;
  }
  if (local && local.phase === 'gen' && S.state !== 'ready') {
    clearSession();
    sess = null;
  }

  switch (S.state) {
    case 'passed': {
      setBadge('green', 'fa-circle-check', 'Passed');
      const p = S.passed || {};
      box.innerHTML = panel('ok', 'fa-circle-check', 'You passed this exam!', 'Your score is <b>' + fmtNum(p.score) + ' / 100</b>. Well done. Continue with the next step below.');
      $('rulesCard').classList.add('hidden');
      break;
    }
    case 'locked':
      setBadge('rose', 'fa-lock', 'Locked');
      box.innerHTML = panel('lock', 'fa-lock', 'Exam locked for 7 days', 'Your last attempt did not reach the pass mark. Read your lessons again. You can try again when the timer ends.', tilesHtml(false) + dashBtn);
      startTicker(S.retry_at, false, () => refresh());
      break;
    case 'time_locked':
      setBadge('amber', 'fa-hourglass-half', 'Not yet open');
      box.innerHTML = panel('time', 'fa-calendar-days', 'Your exam opens after one full year', 'Your diploma exam opens when you have studied for one full year. Opens on <b>' + esc(fmtDate(S.eligible_at)) + '</b>. Keep learning every week.', tilesHtml(true) + dashBtn);
      startTicker(S.eligible_at, true, () => refresh());
      break;
    case 'not_ready': {
      setBadge('amber', 'fa-book-open', 'Finish lessons');
      const pr = S.progress || {};
      const rows = [];
      if (pr.missing_topics > 0) rows.push('<div><i class="fa-solid fa-book-open"></i> ' + pr.missing_topics + ' topic(s) not read yet</div>');
      if (pr.missing_videos > 0) rows.push('<div><i class="fa-solid fa-circle-play"></i> ' + pr.missing_videos + ' video(s) not started</div>');
      if (pr.missing_assessments > 0) rows.push('<div><i class="fa-solid fa-clipboard-question"></i> ' + pr.missing_assessments + ' assessment(s) not passed</div>');
      box.innerHTML = panel('time', 'fa-book-open', 'Finish your lessons first', 'You can only take the exam after you finish all your lessons. Go back to your dashboard and complete these:', '<div class="miss-list">' + rows.join('') + '</div>' + dashBtn);
      break;
    }
    case 'no_topics':
      setBadge('amber', 'fa-hourglass-half', 'Not ready');
      box.innerHTML = panel('time', 'fa-hourglass-half', 'This course is not ready yet', 'The lessons for this course are still being prepared. Please check back soon.', dashBtn);
      break;
    case 'active': {
      setBadge('violet', 'fa-stopwatch', 'In progress');
      const mine = local && local.phase === 'run' && S.active && local.exam_id === S.active.exam_id;
      if (mine) {
        box.innerHTML = panel('info', 'fa-stopwatch', 'Your exam is still running', 'You have an exam in progress. Your answers are saved on this device. Tap Resume to continue. Time left: <b id="resumeLeft"></b>.', '<button class="btn btn-primary" id="btnResume"><i class="fa-solid fa-play"></i> Resume Exam</button>');
        const upd = () => {
          const el = $('resumeLeft');
          if (el) el.textContent = fmtDur(S.active.ends_at - (Date.now() + (S.server_now - S.client_at)));
        };
        upd();
        tickerId = setInterval(upd, 1000);
      } else {
        box.innerHTML = panel('info', 'fa-mobile-screen', 'An exam is already running', 'An exam for this course was started on another device or browser. Please continue it there. It ends at <b>' + esc(fmtDate(S.active.ends_at)) + '</b>.', dashBtn);
      }
      break;
    }
    default: {
      setBadge('violet', 'fa-hourglass-half', 'Ready');
      if (local && local.phase === 'gen') {
        box.innerHTML = panel('info', 'fa-wand-magic-sparkles', 'Continue preparing your exam', 'Your exam was not finished preparing. Tap the button to continue from where it stopped. Your time starts only when the exam is ready.', startBtn);
      } else {
        box.innerHTML = '<div style="margin-bottom:6px">' + startBtn + '</div>';
      }
    }
  }
  renderHistory();
  if (S.state === 'passed') renderNext();
  if (S.sync_needed) syncPass();
}

async function refresh() {
  miniLoad('Checking your exam...');
  try {
    S = await api(API_EXAM, { action: 'status', user_id: user.id, course_id: courseId }, { retries: 2 });
    S.client_at = Date.now();
    miniHide();
    renderIntro();
  } catch (e) {
    miniHide();
    $('introBadge').className = 'badge rose';
    $('introBadge').innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Error';
    $('introSubtitle').textContent = 'We could not load your exam';
    $('statusPanel').innerHTML = panel('lock', 'fa-triangle-exclamation', 'We could not open your exam', esc(errText(e)), '<div class="btn-row"><button class="btn btn-primary" id="btnReload"><i class="fa-solid fa-rotate-right"></i> Try Again</button><a href="dashboard.html" class="btn btn-outline" style="text-decoration:none"><i class="fa-solid fa-arrow-left"></i> Dashboard</a></div>');
    $('rulesCard').classList.add('hidden');
  }
}

async function ensureCamera() {
  if (stream && stream.getVideoTracks().some((t) => t.readyState === 'live')) return true;
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no camera');
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } }, audio: false });
    const v = $('examCam');
    v.srcObject = stream;
    v.muted = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.onended = () => {
        if (running) flagLeave('Your camera stopped. Please turn it on.');
      };
    }
    return true;
  } catch (_) {
    return false;
  }
}

function stopCamera() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  const v = $('examCam');
  if (v) v.srcObject = null;
  $('camMini').classList.add('hidden');
}

async function onStart() {
  const ok = await confirmModal({
    icon: 'fa-play',
    title: 'Start your exam?',
    html: 'You will answer <b>80 questions</b> in <b>2 hours</b>. Your camera must be on. Do not leave this page, copy, or take screenshots.<br><br>Your time starts only after all questions are ready.',
    ok: 'Yes, Start',
    cancel: 'Not Yet'
  });
  if (!ok) return;
  miniLoad('Opening your camera...');
  const cam = await ensureCamera();
  miniHide();
  if (!cam) {
    toast('error', 'Camera Needed', 'Please allow your camera. The exam cannot start without it.');
    return;
  }
  await runGeneration();
}

function setGen(pct, title, msg) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  $('genPct').textContent = String(p);
  $('genRing').style.setProperty('--p', String(p));
  $('genBar').style.width = p + '%';
  if (title) $('genTitle').textContent = title;
  if (msg) $('genMsg').textContent = msg;
}

function genNote(text) {
  const e = $('genError');
  if (!e) return;
  if (!text) {
    e.classList.add('hidden');
    return;
  }
  e.textContent = text;
  e.classList.remove('hidden');
}

function genFail(message) {
  genNote(message);
  $('btnGenRetry').classList.remove('hidden');
  $('genTitle').textContent = 'Could not finish preparing';
}

async function waitOnline() {
  while (typeof navigator !== 'undefined' && navigator.onLine === false) {
    genNote('No internet connection. Your exam will continue by itself when the internet comes back.');
    await new Promise((resolve) => {
      let done = false;
      const fin = () => {
        if (done) return;
        done = true;
        window.removeEventListener('online', fin);
        resolve();
      };
      window.addEventListener('online', fin);
      setTimeout(fin, 4000);
    });
  }
}

async function persist(fn, maxTries) {
  let tries = 0;
  let net = 0;
  while (true) {
    await waitOnline();
    try {
      const r = await fn();
      genNote('');
      return r;
    } catch (e) {
      if (isHard(e)) throw e;
      if (e && e.status) {
        tries++;
        if (maxTries && tries >= maxTries) throw e;
      } else {
        net++;
      }
      const wait = Math.min(1500 * (tries + net), 12000);
      genNote('Trying again in ' + Math.ceil(wait / 1000) + ' seconds. ' + errText(e));
      await sleep(wait);
    }
  }
}

function wordSet(text) {
  const set = {};
  String(text || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).forEach((w) => {
    if (w.length > 2) set[w] = true;
  });
  return set;
}

function sameIdea(a, b, limit) {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (!ka.length || !kb.length) return false;
  let inter = 0;
  ka.forEach((w) => { if (b[w]) inter++; });
  return inter / (ka.length + kb.length - inter) >= limit;
}

function targets() {
  const t = (sess && sess.targets) || {};
  return {
    mcq: Number(t.mcq) || DEFAULT_TARGETS.mcq,
    tf: Number(t.tf) || DEFAULT_TARGETS.tf,
    write: Number(t.write) || DEFAULT_TARGETS.write
  };
}

function needTotal() {
  const t = targets();
  return t.mcq + t.tf + t.write;
}

function groups() {
  const out = [];
  const got = (sess && sess.got) || {};
  Object.keys(got).map(Number).sort((a, b) => a - b).forEach((k) => {
    if (got[k] && Array.isArray(got[k].questions)) out.push(got[k]);
  });
  ((sess && sess.extra) || []).forEach((g) => {
    if (g && Array.isArray(g.questions)) out.push(g);
  });
  return out;
}

function validQuestion(q) {
  if (!q || !q.qid || !String(q.question || '').trim()) return false;
  if (q.type === 'mcq') return Array.isArray(q.options) && q.options.length === 4;
  return q.type === 'tf' || q.type === 'write';
}

function compose() {
  const t = targets();
  const limit = SIM_LEVELS[Math.max(0, Math.min(SIM_LEVELS.length - 1, Number(sess.relax) || 0))];
  const kept = { mcq: [], tf: [], write: [] };
  const sets = [];
  const ids = {};
  groups().forEach((g) => {
    g.questions.forEach((q) => {
      if (!validQuestion(q) || ids[q.qid]) return;
      if (kept[q.type].length >= t[q.type]) return;
      const ws = wordSet(q.question);
      if (sets.some((s) => sameIdea(s, ws, limit))) return;
      ids[q.qid] = true;
      sets.push(ws);
      kept[q.type].push(q);
    });
  });
  return {
    kept: kept,
    short: { mcq: t.mcq - kept.mcq.length, tf: t.tf - kept.tf.length, write: t.write - kept.write.length },
    count: kept.mcq.length + kept.tf.length + kept.write.length
  };
}

function isComplete(c) {
  return c.short.mcq <= 0 && c.short.tf <= 0 && c.short.write <= 0;
}

function stems() {
  const all = [];
  groups().forEach((g) => g.questions.forEach((q) => all.push(String(q.question || '').slice(0, 110))));
  return all.slice(-120);
}

function showProgress() {
  const c = compose();
  const need = needTotal();
  setGen(Math.min(99, (c.count / need) * 99), null, 'Questions ready: ' + c.count + ' of ' + need + '. Please keep this page open.');
}

async function doBatch(i) {
  const res = await persist(() => api(API_EXAM, { action: 'batch', user_id: user.id, course_id: courseId, plan_token: sess.plan_token, batch_index: i, avoid: stems(), relax: sess.relax || 0 }, { timeout: 110000 }), BATCH_TRIES);
  sess.got[i] = { questions: res.questions, blob: res.blob };
  saveSession();
}

async function generateAll() {
  const total = sess.batches.length;
  const pending = [];
  for (let i = 0; i < total; i++) if (!sess.got[i]) pending.push(i);
  let fatal = null;
  const worker = async () => {
    while (pending.length && !fatal) {
      const i = pending.shift();
      try {
        await doBatch(i);
      } catch (e) {
        if (isHard(e)) fatal = e;
      }
      showProgress();
    }
  };
  const workers = [];
  for (let w = 0; w < CONCURRENCY; w++) workers.push(worker());
  await Promise.all(workers);
  if (fatal) throw fatal;
}

async function fillShortage() {
  sess.extra = sess.extra || [];
  sess.round = Number(sess.round) || 0;
  sess.relax = Number(sess.relax) || 0;
  sess.stall = Number(sess.stall) || 0;
  while (true) {
    const c = compose();
    showProgress();
    if (isComplete(c)) return;
    const need = { mcq: Math.max(0, c.short.mcq), tf: Math.max(0, c.short.tf), write: Math.max(0, c.short.write) };
    const before = c.count;
    const res = await persist(() => api(API_EXAM, { action: 'topup', user_id: user.id, course_id: courseId, plan_token: sess.plan_token, need: need, round: sess.round, relax: sess.relax, avoid: stems() }, { timeout: 110000 }), 0);
    sess.extra.push({ questions: res.questions, blob: res.blob });
    const after = compose().count;
    if (after <= before) {
      sess.stall++;
      if (sess.stall % 2 === 0 && sess.relax < SIM_LEVELS.length - 1) sess.relax++;
    } else {
      sess.stall = 0;
    }
    sess.round++;
    saveSession();
  }
}

function assemble() {
  const c = compose();
  if (!isComplete(c)) throw new Error('The exam questions are incomplete. Please try again.');
  const list = c.kept.mcq.concat(c.kept.tf, c.kept.write);
  const used = {};
  list.forEach((q) => { used[q.qid] = true; });
  const blobs = [];
  groups().forEach((g) => {
    if (g.blob && g.questions.some((q) => used[q.qid])) blobs.push(g.blob);
  });
  sess.questions = list;
  sess.blobs = blobs;
}

async function runGeneration() {
  if (genBusy) return;
  genBusy = true;
  try {
    showOnly('examGen');
    genNote('');
    $('btnGenRetry').classList.add('hidden');
    setGen(0, 'Preparing your exam', 'Please wait. We are preparing your questions one part at a time. This can take a few minutes. Do not close this page.');
    let restarted = false;
    while (true) {
      try {
        sess = readSession();
        if (!sess || sess.phase !== 'gen' || sess.user_id !== user.id || sess.course_id !== courseId) {
          const prep = await persist(() => api(API_EXAM, { action: 'prepare', user_id: user.id, course_id: courseId }, { timeout: 60000 }), 0);
          sess = {
            v: 2,
            user_id: user.id,
            course_id: courseId,
            phase: 'gen',
            exam_id: prep.exam_id,
            plan_token: prep.plan_token,
            batches: prep.batches,
            total: prep.total,
            targets: prep.targets || DEFAULT_TARGETS,
            language: prep.language || 'English',
            got: {},
            extra: [],
            round: 0,
            relax: 0,
            stall: 0,
            created: Date.now()
          };
          saveSession();
        }
        sess.got = sess.got || {};
        sess.extra = sess.extra || [];
        showProgress();
        await generateAll();
        await fillShortage();
        assemble();
        setGen(99, 'Almost ready', 'Starting your exam...');
        const begin = await persist(() => api(API_EXAM, { action: 'begin', user_id: user.id, course_id: courseId, plan_token: sess.plan_token }, { timeout: 60000 }), 0);
        sess.phase = 'run';
        sess.started_at = begin.started_at;
        sess.ends_at = begin.ends_at;
        sess.offset = begin.server_now - Date.now();
        sess.answers = {};
        sess.page = 0;
        sess.shots = 0;
        sess.leaves = 0;
        delete sess.got;
        delete sess.extra;
        delete sess.plan_token;
        delete sess.round;
        delete sess.relax;
        delete sess.stall;
        saveSession();
        genNote('');
        setGen(100, 'Ready', 'Starting your exam...');
        await sleep(500);
        startRun();
        return;
      } catch (e) {
        if (e && e.status === 409) {
          clearSession();
          sess = null;
          toast('error', 'Exam Not Available', e.message);
          showOnly('examIntro');
          refresh();
          return;
        }
        if (e && e.status === 400 && !restarted && /valid|expired/i.test(String(e.message))) {
          restarted = true;
          clearSession();
          sess = null;
          continue;
        }
        genFail(errText(e));
        return;
      }
    }
  } finally {
    genBusy = false;
  }
}

function buildPages() {
  pages = [];
  ['mcq', 'tf', 'write'].forEach((t) => {
    const idx = [];
    sess.questions.forEach((q, i) => { if (q.type === t) idx.push(i); });
    for (let i = 0; i < idx.length; i += PAGE_SIZE[t]) pages.push({ type: t, idx: idx.slice(i, i + PAGE_SIZE[t]) });
  });
}

function answeredCount() {
  return sess.questions.filter((q) => String(sess.answers[q.qid] || '').trim() !== '').length;
}

function renderStages() {
  const cur = pages[curPage].type;
  $('stageRow').innerHTML = ['mcq', 'tf', 'write'].map((t) => {
    const order = { mcq: 0, tf: 1, write: 2 };
    const cls = t === cur ? 'on' : (order[t] < order[cur] ? 'done' : '');
    return '<span class="stage-chip ' + cls + '"><i class="fa-solid ' + PART_INFO[t].icon + '"></i> ' + PART_INFO[t].short + ': ' + PART_INFO[t].label + '</span>';
  }).join('');
}

function renderPage() {
  const pg = pages[curPage];
  const letters = ['A', 'B', 'C', 'D'];
  let html = '';
  pg.idx.forEach((qi) => {
    const q = sess.questions[qi];
    const ans = String(sess.answers[q.qid] || '');
    html += '<div class="question-card"><div class="q-head"><span class="q-num"><i class="fa-solid fa-circle-question"></i> Question ' + (qi + 1) + ' of ' + sess.questions.length + '</span>' +
      '<span class="q-marks ' + q.type + '"><i class="fa-solid ' + PART_INFO[q.type].icon + '"></i> ' + PART_INFO[q.type].marks + ' Mark' + (PART_INFO[q.type].marks > 1 ? 's' : '') + '</span></div>' +
      '<div class="q-text">' + esc(q.question) + '</div>';
    if (q.type === 'mcq') {
      html += '<div class="q-options">' + q.options.map((o, oi) => '<button type="button" class="q-opt' + (ans === letters[oi] ? ' selected' : '') + '" data-qid="' + q.qid + '" data-val="' + letters[oi] + '"><span class="q-letter">' + letters[oi] + '</span><span>' + esc(o) + '</span></button>').join('') + '</div>';
    } else if (q.type === 'tf') {
      html += '<div class="tf-row"><button type="button" class="tf-btn t' + (ans === 'true' ? ' selected' : '') + '" data-qid="' + q.qid + '" data-val="true"><i class="fa-solid fa-circle-check"></i> True</button>' +
        '<button type="button" class="tf-btn f' + (ans === 'false' ? ' selected' : '') + '" data-qid="' + q.qid + '" data-val="false"><i class="fa-solid fa-circle-xmark"></i> False</button></div>';
    } else {
      html += '<div class="q-write"><textarea data-qid="' + q.qid + '" maxlength="1500" placeholder="Type your answer here...">' + esc(ans) + '</textarea><div class="q-count"><span data-cnt="' + q.qid + '">' + ans.length + '</span> / 1500</div></div>';
    }
    html += '</div>';
  });
  $('questionCard').innerHTML = html;
  const first = pg.idx[0] + 1;
  const last = pg.idx[pg.idx.length - 1] + 1;
  $('examQProgress').textContent = (first === last ? 'Question ' + first : 'Questions ' + first + '-' + last) + ' of ' + sess.questions.length;
  $('btnBackPage').disabled = curPage === 0;
  $('btnNextPage').classList.toggle('hidden', curPage === pages.length - 1);
  $('btnSubmitExam').classList.toggle('hidden', curPage !== pages.length - 1);
  renderStages();
  updateProgress();
  sess.page = curPage;
  saveSessionSoon();
}

function updateProgress() {
  const n = answeredCount();
  $('examQCount').textContent = n + ' / ' + sess.questions.length + ' answered';
  $('examProgressFill').style.width = Math.round((n / sess.questions.length) * 100) + '%';
}

function tick() {
  const left = Math.max(0, Math.floor((sess.ends_at - (Date.now() + sess.offset)) / 1000));
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  $('examTimerText').textContent = h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  $('examTimer').classList.toggle('danger', left <= 300);
  if (left <= 0) submitExam('time');
}

function inField(e) {
  const t = e.target;
  return t && t.closest && t.closest('textarea,input');
}

function shot() {
  if (!running) return;
  const now = Date.now();
  if (now - lastShot < 1200) return;
  lastShot = now;
  sess.shots = (sess.shots || 0) + 1;
  saveSession();
  toast('error', 'Screenshot Detected', '1 mark will be taken from your score. Total screenshots: ' + sess.shots);
}

function flagLeave(msg) {
  if (!running) return;
  document.body.classList.add('exam-hide');
  $('shieldTitle').textContent = 'Return to your exam';
  $('shieldMsg').textContent = 'Your questions are hidden while this page is not in focus.';
  $('examShield').classList.add('show');
  const now = Date.now();
  if (now - lastLeave < 2000) return;
  lastLeave = now;
  sess.leaves = (sess.leaves || 0) + 1;
  saveSession();
  if (sess.leaves >= MAX_LEAVES) {
    submitExam('leaves');
    return;
  }
  toast('error', 'Warning ' + sess.leaves + ' of ' + MAX_LEAVES, msg + ' After ' + MAX_LEAVES + ' warnings your exam is sent automatically.');
}

function unhide() {
  document.body.classList.remove('exam-hide');
  $('examShield').classList.remove('show');
}

function onVis() {
  if (document.hidden) flagLeave('You left the exam page.');
  else unhide();
}

function onBlur() {
  flagLeave('Stay on the exam page.');
}

function onFocus() {
  if (!document.hidden) unhide();
}

function onKeyDown(e) {
  if (!running) return;
  const k = e.key || '';
  const lk = k.toLowerCase();
  if (k === 'PrintScreen') {
    e.preventDefault();
    shot();
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && (lk === 's' || k === '3' || k === '4' || k === '5')) {
    e.preventDefault();
    shot();
    return;
  }
  if (k === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].indexOf(lk) !== -1)) {
    e.preventDefault();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'p', 's', 'u'].indexOf(lk) !== -1) {
    e.preventDefault();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && lk === 'a' && !inField(e)) e.preventDefault();
}

function onKeyUp(e) {
  if (running && e.key === 'PrintScreen') shot();
}

function block(e) {
  if (!running) return;
  if (e.type === 'selectstart' && inField(e)) return;
  e.preventDefault();
}

function onBeforeUnload(e) {
  if (running && !submitting) {
    e.preventDefault();
    e.returnValue = '';
  }
}

function attachGuards() {
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  ['copy', 'cut', 'paste', 'contextmenu', 'dragstart', 'selectstart'].forEach((ev) => document.addEventListener(ev, block, true));
  window.addEventListener('beforeprint', shot);
  window.addEventListener('beforeunload', onBeforeUnload);
  document.body.classList.add('exam-lock');
}

function detachGuards() {
  document.removeEventListener('visibilitychange', onVis);
  window.removeEventListener('blur', onBlur);
  window.removeEventListener('focus', onFocus);
  document.removeEventListener('keydown', onKeyDown, true);
  document.removeEventListener('keyup', onKeyUp, true);
  ['copy', 'cut', 'paste', 'contextmenu', 'dragstart', 'selectstart'].forEach((ev) => document.removeEventListener(ev, block, true));
  window.removeEventListener('beforeprint', shot);
  window.removeEventListener('beforeunload', onBeforeUnload);
  document.body.classList.remove('exam-lock');
  unhide();
}

function startRun() {
  buildPages();
  curPage = Math.min(Math.max(0, sess.page || 0), pages.length - 1);
  running = true;
  submitting = false;
  showOnly('examActive');
  $('camMini').classList.remove('hidden');
  attachGuards();
  renderPage();
  tick();
  if (timerId) clearInterval(timerId);
  timerId = setInterval(tick, 1000);
}

async function onResume() {
  sess = readSession();
  if (!sess || sess.phase !== 'run') {
    toast('error', 'Cannot Resume', 'The saved exam was not found on this device.');
    return;
  }
  miniLoad('Opening your camera...');
  const cam = await ensureCamera();
  miniHide();
  if (!cam) {
    toast('error', 'Camera Needed', 'Please allow your camera to continue the exam.');
    return;
  }
  startRun();
}

async function submitExam(reason) {
  if (!running || submitting) return;
  if (reason === 'manual') {
    const n = answeredCount();
    const total = sess.questions.length;
    const miss = { mcq: 0, tf: 0, write: 0 };
    sess.questions.forEach((q) => { if (!String(sess.answers[q.qid] || '').trim()) miss[q.type]++; });
    const ok = await confirmModal({
      icon: 'fa-hourglass-end',
      title: 'Submit your exam?',
      html: 'You answered <b>' + n + ' of ' + total + '</b> questions.' + (n < total ? '<br>Not answered: ' + miss.mcq + ' multiple choice, ' + miss.tf + ' true/false, ' + miss.write + ' written.' : '') + '<br><br>After you submit, you cannot change your answers.',
      ok: 'Submit',
      cancel: 'Go Back'
    });
    if (!ok) return;
  }
  submitting = true;
  running = false;
  if (timerId) clearInterval(timerId);
  timerId = null;
  detachGuards();
  saveSession();
  pendingGrade = reason;
  await doGrade(reason);
}

async function doGrade(reason) {
  miniLoad('Saving your answers...', 'Please do not close this page.');
  const payload = {
    action: 'grade',
    user_id: user.id,
    course_id: courseId,
    exam_id: sess.exam_id,
    blobs: sess.blobs,
    answers: sess.answers,
    questions: sess.questions.map((q) => ({ qid: q.qid, type: q.type, question: q.question, options: q.options })),
    shots: sess.shots || 0,
    leaves: sess.leaves || 0,
    reason: reason,
    language: sess.language || localStorage.getItem('idt_exam_lang') || 'English'
  };
  try {
    const data = await api(API_EXAM, payload, { retries: 2, timeout: 100000 });
    pendingGrade = null;
    miniHide();
    await finishExam(data);
  } catch (e) {
    if (e.status === 409) {
      miniHide();
      clearSession();
      toast('error', 'Exam Not Active', e.message);
      stopCamera();
      showOnly('examIntro');
      refresh();
      return;
    }
    $('miniLoaderText').textContent = 'Could not save yet';
    const sub = $('miniLoaderSub');
    sub.textContent = errText(e) + ' Your answers are safe on this device. Check your internet and tap Try Again.';
    sub.classList.remove('hidden');
    $('miniLoaderBtn').classList.remove('hidden');
  }
}

async function finishExam(data) {
  stopCamera();
  clearSession();
  resultData = data;
  showResult();
  if (data.passed) {
    syncPass();
  }
  try {
    S = await api(API_EXAM, { action: 'status', user_id: user.id, course_id: courseId }, { retries: 1 });
    S.client_at = Date.now();
    renderHistory();
    if (S.state === 'passed') renderNext();
  } catch (_) {}
}

function detailHtml(d) {
  const skipped = !String(d.user_answer || '').trim();
  let cls = 'wrong';
  let label = '✖ Wrong';
  let icon = 'fa-circle-xmark';
  let color = '#f43f5e';
  if (d.is_correct) { cls = 'correct'; label = '✔ Correct'; icon = 'fa-circle-check'; color = '#10b981'; }
  else if (skipped) { cls = 'skipped'; label = 'Skipped'; icon = 'fa-circle-minus'; color = '#94a3b8'; }
  else if (d.earned > 0) { cls = 'partial'; label = '◐ Partial'; icon = 'fa-circle-half-stroke'; color = '#f59e0b'; }
  return '<div class="result-item" data-k="' + (d.is_correct ? 'correct' : (skipped ? 'skipped' : 'wrong')) + '">' +
    '<div class="ri-head"><i class="fa-solid ' + icon + '" style="color:' + color + '"></i> Question ' + d.number + ' <span class="ri-mark ' + cls + '">' + label + '</span><span class="ri-score">' + fmtNum(d.earned) + ' / ' + fmtNum(d.marks) + '</span></div>' +
    '<div class="ri-q">' + esc(d.question) + '</div>' +
    '<div class="ri-ans"><span class="' + (d.is_correct ? 'ok' : 'bad') + '">Your answer: ' + esc(d.user_answer || '(no answer)') + '</span>' +
    (d.is_correct ? '' : '<br><span class="ok">Correct answer: ' + esc(d.correct_answer) + '</span>') + '</div>' +
    (d.feedback ? '<div class="ri-explain"><b><i class="fa-solid fa-user-check"></i> Marker:</b> ' + esc(d.feedback) + '</div>' : '') +
    (d.explanation ? '<div class="ri-explain"><b><i class="fa-solid fa-lightbulb"></i> Explanation:</b> ' + esc(d.explanation) + '</div>' : '') + '</div>';
}

function applyFilter(container, filterRow, f) {
  filterRow.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.f === f));
  container.querySelectorAll('.result-item').forEach((it) => {
    it.classList.toggle('hidden', f !== 'all' && it.dataset.k !== f);
  });
}

function showResult() {
  const r = resultData;
  showOnly('examResult');
  $('rulesCard').classList.add('hidden');
  const score = Number(r.score) || 0;
  const deg = Math.round((Math.min(100, score) / 100) * 360);
  $('scoreRing').style.background = 'conic-gradient(' + (r.passed ? 'var(--green)' : 'var(--rose)') + ' ' + deg + 'deg, rgba(124,58,237,.1) ' + deg + 'deg)';
  $('scorePct').textContent = fmtNum(score);
  const head = $('resultHead');
  head.textContent = r.passed ? 'Congratulations! 🎉' : 'Almost There!';
  head.className = 'result-head ' + (r.passed ? 'pass' : 'fail');
  $('resultSub').textContent = r.message || '';
  const p = r.parts || {};
  $('partsGrid').innerHTML =
    '<div class="part"><b>' + fmtNum(p.mcq) + ' / 40</b><span>Multiple Choice</span></div>' +
    '<div class="part"><b>' + fmtNum(p.tf) + ' / 30</b><span>True or False</span></div>' +
    '<div class="part"><b>' + fmtNum(p.write) + ' / 30</b><span>Written</span></div>';
  const results = r.results || [];
  const correct = results.filter((x) => x.is_correct).length;
  $('resultSummary').innerHTML =
    '<div class="rs-row"><span>Questions fully correct</span><b class="ok">' + correct + ' of ' + results.length + '</b></div>' +
    '<div class="rs-row"><span>Marks before deductions</span><b>' + fmtNum(r.raw_score) + '</b></div>' +
    (r.deduction > 0 ? '<div class="rs-row"><span>Screenshot deduction</span><b class="bad">- ' + fmtNum(r.deduction) + '</b></div>' : '') +
    '<div class="rs-row"><span>Final score</span><b>' + fmtNum(score) + ' / 100</b></div>' +
    '<div class="rs-row"><span>Pass mark</span><b>' + PASS_MARK + ' / 100</b></div>' +
    (!r.passed && r.retry_at ? '<div class="rs-row"><span>You can try again on</span><b>' + esc(fmtDate(r.retry_at)) + '</b></div>' : '');
  $('resultList').innerHTML = results.map(detailHtml).join('') || '<div class="result-item">No detailed breakdown available.</div>';
  applyFilter($('resultList'), $('resultFilters'), 'all');
  if (r.passed) confetti();
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
  for (let i = 0; i < 140; i++) {
    parts.push({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5, w: 6 + Math.random() * 7, h: 8 + Math.random() * 9, vy: 2 + Math.random() * 3, vx: -1.5 + Math.random() * 3, color: colors[i % colors.length], rot: Math.random() * Math.PI, vr: -0.1 + Math.random() * 0.2 });
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
    if (frames < 220) requestAnimationFrame(anim);
    else c.remove();
  })();
}

async function syncPass() {
  const examId = (S && S.passed && S.passed.exam_id) || (resultData && resultData.record_id ? String(resultData.record_id).replace(/^r_/, '') : '');
  if (!examId) return;
  try {
    await api(API_WIN, { action: 'pass', user_id: user.id, course_id: courseId, exam_id: examId }, { retries: 3 });
    if (S) S.sync_needed = false;
  } catch (_) {
    toast('info', 'Saving Your Result', 'We could not save your pass to your profile yet. It will be saved when you open this page again.');
  }
}

function langLabel() {
  return localStorage.getItem('idt_exam_lang') || 'English';
}

function nextShell(title, icon, inner) {
  $('nextWrap').classList.remove('hidden');
  $('nextSteps').innerHTML = '<div class="next-title"><i class="fa-solid ' + icon + '"></i> ' + esc(title) + '</div>' + inner;
}

function renderNext() {
  if (!S || !S.passed) return;
  if (S.course.is_diploma && S.course.year === 1) renderYear2();
  else renderProject();
}

function renderYear2() {
  const y = S.year2;
  const name = esc(S.student.name);
  if (!y || !y.course) {
    nextShell('Next: Year 2', 'fa-graduation-cap', '<p class="next-sub">Congratulations ' + name + '! You passed Year 1. We could not find your Year 2 course yet. Please contact customer care.</p><a href="https://wa.me/2347040831743" target="_blank" rel="noopener" class="btn btn-green" style="text-decoration:none"><i class="fa-brands fa-whatsapp"></i> Contact Customer Care</a>');
    return;
  }
  if (y.payment === 'yes' && y.status === 'active') {
    nextShell('Year 2 is ready', 'fa-circle-check', '<p class="next-sub">Congratulations ' + name + '! Your Year 2 course is open. Go to your dashboard to continue.</p><a href="dashboard.html" class="btn btn-green" style="text-decoration:none"><i class="fa-solid fa-house"></i> Go to Dashboard</a>');
    return;
  }
  if (y.payment === 'yes') {
    activateYear2(y.slot);
    return;
  }
  const amount = '₦' + Number(y.pay_amount || 0).toLocaleString('en-NG');
  nextShell('Next: Year 2', 'fa-graduation-cap', '<p class="next-sub">Congratulations ' + name + '! You passed Year 1 with <b>' + fmtNum(S.passed.score) + ' / 100</b>. To start <b>' + esc(y.course.name) + '</b> you pay the same fee again: <b>' + amount + '</b>. After payment your Year 2 opens on your dashboard automatically.</p>' +
    '<div class="btn-row"><button class="btn btn-green" id="btnPayYear2"><i class="fa-solid fa-credit-card"></i> Pay for Year 2</button>' + (y.slot ? '<button class="btn btn-outline" id="btnCheckPaid"><i class="fa-solid fa-rotate"></i> I have paid - Check</button>' : '') + '</div>');
}

async function activateYear2(slot) {
  nextShell('Opening Year 2', 'fa-spinner', '<p class="next-sub">Your payment is confirmed. Opening Year 2 for you...</p>');
  try {
    await api(API_Y2, { action: 'activate', user_id: user.id, slot: slot }, { retries: 3 });
    payDone();
  } catch (e) {
    nextShell('Year 2', 'fa-triangle-exclamation', '<p class="next-sub">' + esc(errText(e)) + '</p><button class="btn btn-primary" id="btnRetryActivate" data-slot="' + slot + '"><i class="fa-solid fa-rotate-right"></i> Try Again</button>');
  }
}

function payDone() {
  if (payPoll) clearInterval(payPoll);
  payPoll = null;
  $('payOverlay').classList.add('open');
  $('payBody').innerHTML = '<div class="pay-box"><div class="st-panel ok" style="margin-bottom:12px"><i class="fa-solid fa-circle-check big"></i><h3>Payment confirmed!</h3><p>Congratulations ' + esc(S.student.name) + '! Your Year 2 course is now open. We are taking you to your dashboard.</p></div><a href="dashboard.html" class="btn btn-green" style="text-decoration:none"><i class="fa-solid fa-house"></i> Go to Dashboard</a></div>';
  setTimeout(() => { window.location.href = 'dashboard.html'; }, 5000);
}

async function startYear2Payment() {
  const y = S.year2;
  miniLoad('Preparing your payment...');
  try {
    const prep = await api(API_Y2, { action: 'prepare', user_id: user.id, from_course_id: courseId, course_id: y.course.id }, { retries: 2 });
    if (prep.payment === 'yes') {
      miniHide();
      await activateYear2(prep.slot);
      return;
    }
    const pay = await api(API_PAY, { user_id: user.id, course_id: prep.course.id, course_name: prep.course.name, price: prep.course.price }, { retries: 1 });
    miniHide();
    payState = { slot: prep.slot, reference: pay.reference || '', url: pay.authorization_url || '', amount: prep.course.price, account: pay.account_number || '', bank: pay.bank_name || '', name: pay.account_name || '' };
    try { localStorage.setItem('idt_y2ref_' + user.id, JSON.stringify({ slot: prep.slot, reference: payState.reference })); } catch (_) {}
    S.year2.slot = prep.slot;
    showPayOverlay();
    if (payState.url) {
      try { window.open(payState.url, '_blank', 'noopener'); } catch (_) {}
    }
    startPayPoll();
  } catch (e) {
    miniHide();
    toast('error', 'Payment Not Started', errText(e));
  }
}

function showPayOverlay() {
  const p = payState;
  $('payBody').innerHTML = '<div class="pay-box"><h3>Pay for ' + esc(S.year2.course.name) + '</h3><p>Pay the exact amount below. This page checks your payment by itself. Please keep it open.</p>' +
    '<div class="pay-amount"><i class="fa-solid fa-naira-sign"></i> ' + Number(p.amount).toLocaleString('en-NG') + '</div>' +
    (p.account ? '<div class="pay-rows"><div class="pay-row"><span>Account</span><b>' + esc(p.account) + '</b></div>' + (p.bank ? '<div class="pay-row"><span>Bank</span><b>' + esc(p.bank) + '</b></div>' : '') + (p.name ? '<div class="pay-row"><span>Name</span><b>' + esc(p.name) + '</b></div>' : '') + '<div class="pay-row"><span>Reference</span><b>' + esc(p.reference) + '</b></div></div>' : '') +
    (p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener" class="btn btn-primary" style="text-decoration:none;margin-bottom:10px"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open Payment Page</a>' : '') +
    '<div style="font-size:12.5px;color:var(--muted);margin-bottom:10px"><span class="pulse-dot"></span>Waiting for your payment...</div>' +
    '<button class="btn btn-outline" id="btnPayCheckNow"><i class="fa-solid fa-rotate"></i> I have paid - Check Now</button></div>';
  $('payOverlay').classList.add('open');
}

async function checkPaid(silent) {
  let slot = payState ? payState.slot : (S.year2 && S.year2.slot);
  let reference = payState ? payState.reference : '';
  if (!reference) {
    try {
      const saved = JSON.parse(localStorage.getItem('idt_y2ref_' + user.id) || 'null');
      if (saved) {
        reference = saved.reference;
        slot = slot || saved.slot;
      }
    } catch (_) {}
  }
  if (!slot) {
    if (!silent) toast('info', 'No Payment Yet', 'Tap Pay for Year 2 to start your payment.');
    return false;
  }
  try {
    const res = await api(API_Y2, { action: 'check', user_id: user.id, slot: slot, reference: reference }, { retries: 1 });
    if (res.paid) {
      await api(API_Y2, { action: 'activate', user_id: user.id, slot: slot }, { retries: 3 });
      payDone();
      return true;
    }
    if (!silent) toast('info', 'Not Confirmed Yet', 'We have not received your payment yet. Please wait a moment and check again.');
  } catch (e) {
    if (!silent) toast('error', 'Could Not Check', errText(e));
  }
  return false;
}

function startPayPoll() {
  if (payPoll) clearInterval(payPoll);
  payPoll = setInterval(() => {
    if (document.hidden) return;
    checkPaid(true);
  }, 5000);
}

async function renderProject() {
  const name = esc(S.student.name);
  const course = esc(S.course.name);
  const pr = S.project;
  if (S.certificate_issued) {
    nextShell('Project submitted', 'fa-award', '<div class="st-panel ok"><i class="fa-solid fa-award big"></i><h3>Congratulations ' + name + '!</h3><p>You finished <b>' + course + '</b> and submitted your project. Your certificate is ready.</p></div><button class="btn btn-green" id="btnOpenCert"><i class="fa-solid fa-award"></i> Open Certificate</button>');
    return;
  }
  if (!pr || !Array.isArray(pr.options) || pr.options.length !== 4) {
    const langs = ['English', 'Hausa', 'Yoruba', 'Igbo', 'Pidgin', 'French', 'Arabic'];
    nextShell('Your final project', 'fa-lightbulb', '<p class="next-sub">Congratulations <b>' + name + '</b> on finishing <b>' + course + '</b>! The last step is a project. Choose the language for your project guide, then tap the button. Your AI teacher will create four project ideas just for your course.</p>' +
      '<div class="lang-row">' + langs.map((l) => '<button class="chip' + (l === projectLang ? ' on' : '') + '" data-plang="' + l + '">' + l + '</button>').join('') + '</div>' +
      '<button class="btn btn-primary" id="btnMakeProjects"><i class="fa-solid fa-wand-magic-sparkles"></i> Create My Project Ideas</button>');
    return;
  }
  const icons = { economy: 'fa-briefcase', health: 'fa-heart-pulse', community: 'fa-people-roof', world: 'fa-earth-africa' };
  const labels = { economy: 'For benefit and jobs', health: 'For health', community: 'For community growth', world: 'For a better, peaceful world' };
  const active = pr.chosen ? pr.chosen.id : selectedProject;
  const cards = pr.options.map((o, i) => '<button class="proj-card t-' + o.theme + (active === o.id ? ' on' : '') + '" data-pid="' + o.id + '"><div class="pc-ic"><i class="fa-solid ' + icons[o.theme] + '"></i></div><small>' + (i + 1) + '. ' + labels[o.theme] + '</small><b>' + esc(o.title) + '</b><p>' + esc(o.summary) + '</p></button>').join('');
  let detail = '';
  const opt = pr.options.find((o) => o.id === active);
  if (opt) {
    detail = '<div class="proj-detail"><h4>' + esc(opt.title) + '</h4><p style="font-size:12.5px;line-height:1.7">' + esc(opt.summary) + '</p>' +
      '<span class="lbl">What you will do</span><ol>' + opt.what_to_do.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>' +
      '<span class="lbl">What to submit</span><p style="font-size:12.5px;line-height:1.7">' + esc(opt.deliverable_note) + '</p>' +
      (opt.tips && opt.tips.length ? '<span class="lbl">Tips</span><ul>' + opt.tips.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>' : '') + '</div>';
  }
  let action = '';
  if (!pr.chosen) {
    action = opt
      ? '<button class="btn btn-primary" id="btnChooseProject" data-pid="' + opt.id + '"><i class="fa-solid fa-check"></i> I Choose This Project</button>'
      : '<p class="next-sub" style="margin:0">Tap a project to read the details.</p>';
  } else {
    action = '<div class="support-note green" style="display:flex;gap:10px;background:rgba(16,185,129,.08);border:1.5px dashed rgba(16,185,129,.4);border-radius:14px;padding:13px 14px;font-size:12.5px;line-height:1.65;margin-bottom:14px"><i class="fa-solid fa-circle-check" style="color:#059669;font-size:17px;margin-top:2px"></i><div><b>Great choice!</b> The next step is on the certificate page. There you will take your passport photo, then fill your project form: your video link (required), and your PDF or project link (optional).</div></div>' +
      '<button class="btn btn-green" id="btnOpenCert"><i class="fa-solid fa-award"></i> Continue to Project and Certificate</button>';
  }
  nextShell(pr.chosen ? 'Your project: ' + pr.chosen.title : 'Choose your project', 'fa-lightbulb',
    '<p class="next-sub">Congratulations <b>' + name + '</b> on finishing <b>' + course + '</b>! ' + (pr.chosen ? 'You chose your project. Finish it and submit it below.' : 'Choose one of these four projects. Tap each one to read more. Think about things you have never tried before and how you can help people.') + '</p>' +
    '<div class="proj-grid">' + cards + '</div>' + detail + action);
}

async function makeProjects() {
  miniLoad('Creating your project ideas...', 'This can take about half a minute.');
  try {
    try { localStorage.setItem('idt_exam_lang', projectLang); } catch (_) {}
    const res = await api(API_EXAM, { action: 'projects', user_id: user.id, course_id: courseId, language: projectLang }, { retries: 2, timeout: 110000 });
    S.project = { options: res.options, chosen: res.chosen, submission: res.submission };
    miniHide();
    renderProject();
  } catch (e) {
    miniHide();
    toast('error', 'Could Not Create Projects', errText(e));
  }
}

async function chooseProject(id) {
  const opt = S.project.options.find((o) => o.id === id);
  if (!opt) return;
  const ok = await confirmModal({ icon: 'fa-lightbulb', title: 'Choose this project?', html: 'You will build:<br><b>' + esc(opt.title) + '</b><br><br>You cannot change it after you choose.', ok: 'Yes, Choose', cancel: 'Go Back' });
  if (!ok) return;
  miniLoad('Saving your choice...');
  try {
    const res = await api(API_WIN, { action: 'project_choose', user_id: user.id, course_id: courseId, project_id: id }, { retries: 2 });
    S.project.chosen = res.chosen;
    miniHide();
    toast('success', 'Great Choice!', 'Congratulations on choosing your project.');
    renderProject();
  } catch (e) {
    miniHide();
    toast('error', 'Could Not Save', errText(e));
  }
}

function pdfText(s) {
  return String(s == null ? '' : s)
    .replace(/[ɗƊ]/g, 'd').replace(/[ƙƘ]/g, 'k').replace(/[ɓƁ]/g, 'b').replace(/[ƴƳ]/g, 'y')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, '?');
}

function loadPdfLib() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => (window.jspdf && window.jspdf.jsPDF ? resolve(window.jspdf) : reject(new Error('PDF tool not available')));
    s.onerror = () => reject(new Error('Could not load the PDF tool. Check your internet.'));
    document.head.appendChild(s);
  });
}

function imgData(url) {
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
      } catch (_) {
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

async function buildPdf(rec) {
  await loadPdfLib();
  const doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const logo = await imgData(LOGO_URL);
  const sign1 = await imgData(SIGN_CHAIR_URL);
  const sign2 = await imgData(SIGN_CEO_URL);
  const name = pdfText(S.student.name);
  const course = pdfText(S.course.name);
  const details = rec.details || [];
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, w, 32, 'F');
  if (logo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.circle(24, 16, 11, 'F');
      doc.addImage(logo, 'PNG', 14, 6, 20, 20);
    } catch (_) {}
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('IDT ACADEMY', 42, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Intelligent Digital Technology Academy | www.idtacademy.com.ng', 42, 21);
  doc.setTextColor(30, 27, 75);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('FINAL EXAM RESULT', 14, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 58, 107);
  let y = 53;
  doc.text('Student: ' + name, 14, y);
  doc.text('Date: ' + pdfText(fmtDate(rec.date)), 120, y);
  y += 6;
  doc.text('Course: ' + course + (S.course.is_diploma ? ' (Year ' + S.course.year + ')' : ''), 14, y);
  y += 6;
  doc.text('Marks before deductions: ' + fmtNum(rec.raw_score) + '   Screenshot deduction: ' + fmtNum(rec.deduction), 14, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Final score: ' + fmtNum(rec.score) + ' / 100   Pass mark: ' + PASS_MARK + '   Status: ' + (rec.passed ? 'PASSED' : 'NOT PASSED'), 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('Multiple choice: ' + fmtNum(rec.mcq) + '/40   True or false: ' + fmtNum(rec.tf) + '/30   Written: ' + fmtNum(rec.write) + '/30', 14, y);
  y += 9;
  doc.setDrawColor(124, 58, 237);
  doc.line(14, y, w - 14, y);
  y += 7;
  doc.setFontSize(9);
  details.forEach((d) => {
    const q = doc.splitTextToSize('Q' + d.number + ': ' + pdfText(d.question), w - 34);
    const a = doc.splitTextToSize('Your answer: ' + pdfText(d.user_answer || '(no answer)'), w - 38);
    const c = d.is_correct ? [] : doc.splitTextToSize('Correct answer: ' + pdfText(d.correct_answer), w - 38);
    const need = q.length * 4.4 + a.length * 4.2 + c.length * 4.2 + 8;
    if (y + need > 278) {
      doc.addPage();
      y = 18;
    }
    const sk = !String(d.user_answer || '').trim();
    const status = d.is_correct ? 'Correct' : (sk ? 'Skipped' : (d.earned > 0 ? 'Partial' : 'Wrong'));
    const rgb = d.is_correct ? [16, 150, 110] : (sk ? [100, 116, 139] : (d.earned > 0 ? [180, 100, 10] : [220, 38, 38]));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(status + ' (' + fmtNum(d.earned) + '/' + fmtNum(d.marks) + ')', w - 14, y, { align: 'right' });
    doc.setTextColor(30, 27, 75);
    doc.text(q, 14, y);
    y += q.length * 4.4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 58, 107);
    doc.text(a, 18, y);
    y += a.length * 4.2;
    if (c.length) {
      doc.setTextColor(16, 130, 100);
      doc.text(c, 18, y);
      y += c.length * 4.2;
    }
    y += 4;
  });
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  y += 8;
  if (sign1) { try { doc.addImage(sign1, 'PNG', 22, y, 26, 13); } catch (_) {} }
  if (sign2) { try { doc.addImage(sign2, 'PNG', w - 72, y, 26, 13); } catch (_) {} }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 27, 75);
  doc.text('Haruna Lawali', 22, y + 19);
  doc.text('Ubaida Aliyu', w - 72, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(109, 106, 138);
  doc.text('Chairman, Board of Trustees', 22, y + 24);
  doc.text('CEO, IDT Academy', w - 72, y + 24);
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text('IDT Academy | Official Examination Document | Page ' + i + ' of ' + n, w / 2, 291, { align: 'center' });
  }
  return doc;
}

function recordFromResult() {
  const r = resultData;
  return { date: new Date().toISOString(), raw_score: r.raw_score, deduction: r.deduction, score: r.score, passed: r.passed, mcq: r.parts.mcq, tf: r.parts.tf, write: r.parts.write, details: r.results };
}

async function downloadPdf(rec) {
  miniLoad('Preparing your PDF...');
  try {
    const doc = await buildPdf(rec);
    doc.save('IDT_Exam_Result_' + S.student.name.replace(/[^A-Za-z0-9]+/g, '_') + '.pdf');
    miniHide();
  } catch (e) {
    miniHide();
    toast('error', 'PDF Failed', errText(e));
  }
}

async function emailResult() {
  if (!S.student.email) {
    toast('error', 'No Email Found', 'There is no email address on your account.');
    return;
  }
  miniLoad('Emailing your result...');
  try {
    const rec = recordFromResult();
    const doc = await buildPdf(rec);
    await api(API_MAIL, {
      user_id: user.id,
      academy_id: user.id,
      email: S.student.email,
      full_name: S.student.name,
      course_name: S.course.name,
      score: rec.score,
      max_marks: 100,
      pct: Math.round(rec.score),
      passed: rec.passed,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      pdf_base64: doc.output('datauristring')
    }, { timeout: 90000 });
    miniHide();
    toast('success', 'Email Sent', 'Your result was sent to ' + S.student.email + '. Check your inbox and spam folder.');
  } catch (e) {
    miniHide();
    toast('error', 'Email Failed', errText(e));
  }
}

async function openView(i) {
  const h = S.history[i];
  if (!h) return;
  miniLoad('Opening exam...');
  try {
    const res = await api(API_EXAM, { action: 'view', user_id: user.id, course_id: courseId, record_id: h.id }, { retries: 1 });
    viewRec = res.record;
    miniHide();
    $('viewHeadTitle').textContent = 'Exam • ' + fmtDate(viewRec.date);
    $('viewDate').textContent = fmtDate(viewRec.date);
    $('viewScore').textContent = fmtNum(viewRec.score) + ' / 100';
    $('viewResult').textContent = viewRec.passed ? 'PASSED' : 'NOT PASSED';
    const b = $('viewBadge');
    b.className = 'badge ' + (viewRec.passed ? 'green' : 'rose');
    b.innerHTML = '<i class="fa-solid ' + (viewRec.passed ? 'fa-circle-check' : 'fa-circle-xmark') + '"></i> ' + (viewRec.passed ? 'Passed' : 'Failed');
    $('viewContent').innerHTML = (viewRec.details || []).map(detailHtml).join('') || '<div class="result-item">No details saved for this exam.</div>';
    applyFilter($('viewContent'), $('viewFilters'), 'all');
    $('viewOverlay').classList.add('open');
  } catch (e) {
    miniHide();
    toast('error', 'Could Not Open', errText(e));
  }
}

function openExplain(recordId) {
  explainState = { record_id: recordId, lang: '', history: [], busy: false };
  $('langPick').classList.remove('hidden');
  $('chatBox').classList.add('hidden');
  $('chatMsgs').innerHTML = '';
  $('otherLangRow').classList.add('hidden');
  $('explainOverlay').classList.add('open');
}

function addMsg(role, text) {
  const row = document.createElement('div');
  row.className = 'chat-row ' + (role === 'me' ? 'me' : 'bot');
  row.innerHTML = '<div class="chat-av"><i class="fa-solid ' + (role === 'me' ? 'fa-user' : 'fa-robot') + '"></i></div><div class="bubble">' + (text === null ? '<span class="typing"><i></i><i></i><i></i></span>' : esc(text)) + '</div>';
  $('chatMsgs').appendChild(row);
  $('chatMsgs').scrollTop = $('chatMsgs').scrollHeight;
  return row;
}

async function askTeacher(question) {
  const st = explainState;
  if (!st || st.busy) return;
  st.busy = true;
  $('chatSend').disabled = true;
  const typing = addMsg('bot', null);
  try {
    const res = await api(API_EXAM, { action: 'explain', user_id: user.id, course_id: courseId, record_id: st.record_id, language: st.lang, question: question || '', history: st.history.slice(-8) }, { retries: 2, timeout: 110000 });
    typing.remove();
    addMsg('bot', res.answer);
    if (question) st.history.push({ role: 'user', content: question });
    st.history.push({ role: 'assistant', content: res.answer });
  } catch (e) {
    typing.remove();
    addMsg('bot', 'Sorry, I could not answer right now. ' + errText(e));
  } finally {
    st.busy = false;
    $('chatSend').disabled = false;
  }
}

function chooseLang(lang) {
  if (!explainState) return;
  explainState.lang = lang;
  try { localStorage.setItem('idt_exam_lang', lang); } catch (_) {}
  $('langPick').classList.add('hidden');
  $('chatBox').classList.remove('hidden');
  askTeacher('');
}

function bind() {
  document.addEventListener('click', (e) => {
    const t = e.target;
    const q = (sel) => t.closest(sel);
    let el;
    if ((el = q('#btnStartExam'))) return onStart();
    if (q('#btnResume')) return onResume();
    if (q('#btnReload')) return refresh();
    if ((el = q('.q-opt,.tf-btn')) && el.dataset.qid && running) {
      sess.answers[el.dataset.qid] = el.dataset.val;
      el.parentElement.querySelectorAll('.q-opt,.tf-btn').forEach((b) => b.classList.toggle('selected', b === el));
      updateProgress();
      saveSessionSoon();
      return;
    }
    if ((el = q('[data-view]'))) return openView(Number(el.dataset.view));
    if ((el = q('#resultFilters .chip'))) return applyFilter($('resultList'), $('resultFilters'), el.dataset.f);
    if ((el = q('#viewFilters .chip'))) return applyFilter($('viewContent'), $('viewFilters'), el.dataset.f);
    if ((el = q('[data-plang]'))) {
      projectLang = el.dataset.plang;
      document.querySelectorAll('[data-plang]').forEach((b) => b.classList.toggle('on', b === el));
      return;
    }
    if (q('#btnMakeProjects')) return makeProjects();
    if ((el = q('.proj-card'))) {
      if (!S.project.chosen) {
        selectedProject = el.dataset.pid;
        renderProject();
      }
      return;
    }
    if ((el = q('#btnChooseProject'))) return chooseProject(el.dataset.pid);
    if (q('#btnOpenCert')) {
      window.location.href = 'certificate.html?user_id=' + encodeURIComponent(user.id) + '&course_id=' + encodeURIComponent(courseId);
      return;
    }
    if (q('#btnPayYear2')) return startYear2Payment();
    if (q('#btnCheckPaid')) return checkPaid(false);
    if (q('#btnPayCheckNow')) return checkPaid(false);
    if ((el = q('#btnRetryActivate'))) return activateYear2(Number(el.dataset.slot));
  });

  $('btnBackPage').addEventListener('click', () => {
    if (curPage > 0) {
      curPage--;
      renderPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  $('btnNextPage').addEventListener('click', () => {
    if (curPage < pages.length - 1) {
      curPage++;
      renderPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  $('btnSubmitExam').addEventListener('click', () => submitExam('manual'));
  $('questionCard').addEventListener('input', (e) => {
    const ta = e.target;
    if (!ta || ta.tagName !== 'TEXTAREA' || !running) return;
    sess.answers[ta.dataset.qid] = ta.value;
    const cnt = document.querySelector('[data-cnt="' + ta.dataset.qid + '"]');
    if (cnt) cnt.textContent = String(ta.value.length);
    updateProgress();
    saveSessionSoon();
  });

  $('btnGenRetry').addEventListener('click', runGeneration);
  $('btnGenBack').addEventListener('click', () => { window.location.href = 'dashboard.html'; });
  $('miniLoaderBtn').addEventListener('click', () => {
    if (pendingGrade) doGrade(pendingGrade);
  });
  window.addEventListener('online', () => {
    if (pendingGrade && !$('miniLoaderBtn').classList.contains('hidden')) doGrade(pendingGrade);
  });

  $('btnDownloadPdf').addEventListener('click', () => resultData && downloadPdf(recordFromResult()));
  $('btnEmailResult').addEventListener('click', emailResult);
  $('btnResultExplain').addEventListener('click', () => resultData && openExplain(resultData.record_id));
  $('btnBackDashboard').addEventListener('click', () => { window.location.href = 'dashboard.html'; });

  $('viewClose').addEventListener('click', () => $('viewOverlay').classList.remove('open'));
  $('btnViewBack').addEventListener('click', () => $('viewOverlay').classList.remove('open'));
  $('btnViewPdf').addEventListener('click', () => viewRec && downloadPdf(viewRec));
  $('btnViewExplain').addEventListener('click', () => viewRec && openExplain(viewRec.id));
  $('viewOverlay').addEventListener('click', (e) => { if (e.target === $('viewOverlay')) $('viewOverlay').classList.remove('open'); });

  $('explainClose').addEventListener('click', () => $('explainOverlay').classList.remove('open'));
  $('explainOverlay').addEventListener('click', (e) => { if (e.target === $('explainOverlay')) $('explainOverlay').classList.remove('open'); });
  document.querySelectorAll('#langGrid .lang-btn[data-lang]').forEach((b) => b.addEventListener('click', () => chooseLang(b.dataset.lang)));
  $('langOtherBtn').addEventListener('click', () => {
    $('otherLangRow').classList.toggle('hidden');
    if (!$('otherLangRow').classList.contains('hidden')) $('otherLangInput').focus();
  });
  $('btnSendOtherLang').addEventListener('click', () => {
    const l = $('otherLangInput').value.trim();
    if (!l) {
      toast('error', 'Language Needed', 'Please type the language you want.');
      return;
    }
    chooseLang(l);
  });
  $('chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('chatInput').value.trim();
    if (!v || !explainState || explainState.busy) return;
    $('chatInput').value = '';
    addMsg('me', v);
    askTeacher(v);
  });
  $('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      $('chatForm').requestSubmit();
    }
  });

  $('payClose').addEventListener('click', () => {
    $('payOverlay').classList.remove('open');
    if (payPoll) clearInterval(payPoll);
    payPoll = null;
  });
  $('brandLink').addEventListener('click', () => { window.location.href = 'dashboard.html'; });
}

async function init() {
  document.documentElement.classList.add('ready');
  bind();
  user = loadUser();
  if (!user) {
    window.location.replace('register.html');
    return;
  }
  const params = new URLSearchParams(window.location.search);
  courseId = String(params.get('course_id') || user.course_id || '').trim();
  if (!courseId) {
    $('statusPanel').innerHTML = panel('lock', 'fa-triangle-exclamation', 'No course selected', 'Please open your exam from your dashboard.', '<a href="dashboard.html" class="btn btn-primary" style="text-decoration:none">Go to Dashboard</a>');
    $('rulesCard').classList.add('hidden');
    return;
  }
  await refresh();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

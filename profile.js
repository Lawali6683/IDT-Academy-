import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);
const LOGO = 'https://i.imgur.com/oyqM5oF.png';
const EMPTY = ['', 'n/a', 'na', 'null', 'undefined', 'none', '-', '—', '[object object]'];
let currentUserId = '';
let currentUd = {};
let currentProfileUrl = '';

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function has(v) {
  if (v == null) return false;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return !EMPTY.includes(String(v).trim().toLowerCase());
}

function pctText(p) {
  const s = String(p).trim();
  return s.includes('%') ? s : s + '%';
}

function valueText(v) {
  if (!has(v)) return '';
  if (typeof v !== 'object') return String(v).trim();
  const grade = v.grade ?? v.letter ?? v.result ?? v.level;
  const pct = v.pct ?? v.percentage ?? v.percent;
  const score = v.score ?? v.total ?? v.marks;
  const parts = [];
  if (has(grade) && typeof grade !== 'object') parts.push(String(grade));
  if (has(pct) && typeof pct !== 'object') parts.push(pctText(pct));
  else if (has(score) && typeof score !== 'object') parts.push(String(score));
  return parts.join(' • ');
}

function formatDate(iso) {
  if (!has(iso)) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(v) {
  return '₦' + Number(v || 0).toLocaleString();
}

function kv(label, valueHtml) {
  return '<div class="kv-box"><span>' + escapeHtml(label) + '</span><b>' + valueHtml + '</b></div>';
}

function removePush(card) {
  card.classList.add('out');
  setTimeout(() => card.remove(), 320);
}

function pushShow(type, title, message) {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const card = document.createElement('div');
  card.className = 'push-card ' + type;
  card.innerHTML = '<img class="push-logo" src="' + LOGO + '" alt="IDT Academy"><div class="push-body"><b><i class="fa-solid ' + icons[type] + '"></i> ' + escapeHtml(title) + '</b><p>' + escapeHtml(message) + '</p></div><button class="push-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  card.querySelector('.push-x').addEventListener('click', () => removePush(card));
  ($('pushWrap') || document.body).appendChild(card);
  if (type !== 'error') setTimeout(() => removePush(card), 6000);
}

async function copyText(txt) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(txt);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = txt;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

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
              <div class="i2-page i2-p2"><i></i><i></i><i></i></div>
              <div class="i2-page i2-p3"><i></i><i></i></div>
              <div class="i2-spine"></div>
              <div class="i2-ribbon"></div>
            </div>
          </div>
          <span class="i2-title">IDT <b>Academy</b></span>
          <span class="i2-tagline">Learn Beyond Limits</span>
          <div class="i2-loadbar"><span></span></div>
          <p class="i2-status">Loading... <b id="i2num">0</b>%</p>
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

function setView(signedIn) {
  if ($('profileView')) $('profileView').classList.toggle('hidden', !signedIn);
  if ($('noSessionView')) $('noSessionView').classList.toggle('hidden', signedIn);
  if ($('userBadge')) $('userBadge').classList.toggle('hidden', !signedIn);
  if ($('btnLogout')) $('btnLogout').classList.toggle('hidden', !signedIn);
}

function statusBadge(st) {
  const s = String(st || 'pending').toLowerCase();
  const map = {
    pending: ['amber', 'fa-clock', 'Awaiting Payment'],
    active: ['green', 'fa-circle-check', 'Active'],
    paid: ['cyan', 'fa-credit-card', 'Paid'],
    started: ['violet', 'fa-play', 'Started'],
    completed: ['green', 'fa-check-double', 'Completed'],
    passed: ['green', 'fa-circle-check', 'Passed'],
    failed: ['rose', 'fa-circle-xmark', 'Not Passed']
  };
  const m = map[s] || ['violet', 'fa-circle-info', s.charAt(0).toUpperCase() + s.slice(1)];
  return '<span class="badge ' + m[0] + '"><i class="fa-solid ' + m[1] + '"></i> ' + escapeHtml(m[2]) + '</span>';
}

function getExams(ud) {
  return Array.isArray(ud.exam_data) ? ud.exam_data : [];
}

function courseInfo(ud) {
  const jamb = ud.course_type === 'jamb';
  return {
    jamb: jamb,
    name: jamb ? ud.jambCourseName : ud.course_name,
    id: jamb ? ud.jambCourseId : ud.course_id,
    number: jamb ? '' : ud.course_number,
    price: jamb ? ud.jambCoursePrice : ud.course_price,
    subjects: jamb ? ud.jambCourseSubjects : ''
  };
}

function isActivated(ud) {
  const paidRef = has(ud.payment_no) && String(ud.payment_no).toLowerCase() !== 'no';
  return String(ud.status || '').toLowerCase() === 'active' || paidRef;
}

function buildSteps(ud) {
  const c = courseInfo(ud);
  const exams = getExams(ud);
  const last = exams.length ? exams[exams.length - 1] : null;
  const passed = !!(last && last.passed === true);
  const assess = valueText(ud.assessment_grade);
  const activated = isActivated(ud);
  const certIssued = ud.certificate_issued === true;

  const steps = [
    { icon: 'fa-user-check', state: 'done', title: 'Registered', sub: has(ud.date_registered) ? 'Member since ' + formatDate(ud.date_registered) : 'Account created successfully' },
    activated
      ? { icon: 'fa-shield-check', state: 'done', title: 'Account Activated', sub: 'Your payment has been confirmed' }
      : { icon: 'fa-credit-card', state: 'current', title: 'Account Activation', sub: 'Waiting for your payment to be confirmed' },
    has(c.name)
      ? { icon: 'fa-book-open', state: 'done', title: 'Course Enrolled', sub: String(c.name) }
      : { icon: 'fa-book-open', state: 'todo', title: 'Course Enrollment', sub: 'Choose a course to begin learning' },
    assess
      ? { icon: 'fa-clipboard-check', state: 'done', title: 'Assessment Completed', sub: 'Result: ' + assess }
      : { icon: 'fa-clipboard-check', state: 'todo', title: 'Assessment', sub: 'Not completed yet' },
    passed
      ? { icon: 'fa-file-pen', state: 'done', title: 'Final Exam Passed', sub: has(last.pct) ? 'Score: ' + pctText(last.pct) : 'Passed successfully' }
      : last
        ? { icon: 'fa-file-pen', state: 'current', title: 'Final Exam', sub: (has(last.pct) ? 'Last score: ' + pctText(last.pct) + '. ' : '') + 'You can try again' }
        : { icon: 'fa-file-pen', state: 'todo', title: 'Final Exam', sub: 'Not taken yet' },
    certIssued
      ? { icon: 'fa-award', state: 'done', title: 'Certificate Issued', sub: 'Your IDT Academy certificate is ready' }
      : passed
        ? { icon: 'fa-award', state: 'current', title: 'Certificate', sub: 'Your certificate is being prepared' }
        : { icon: 'fa-award', state: 'todo', title: 'Certificate', sub: 'Unlocked after you pass the final exam' }
  ];

  if ($('stepsWrap')) {
    $('stepsWrap').innerHTML = steps.map((s) => {
      const ic = s.state === 'done' ? 'fa-check' : s.state === 'current' ? 'fa-hourglass-half' : s.icon;
      return '<div class="step"><div class="step-ic ' + s.state + '"><i class="fa-solid ' + ic + '"></i></div><div class="step-body"><b>' + escapeHtml(s.title) + '</b><span>' + escapeHtml(s.sub) + '</span></div></div>';
    }).join('');
  }
  return steps;
}

function buildStats(ud) {
  const exams = getExams(ud);
  const last = exams.length ? exams[exams.length - 1] : null;
  const items = [
    { icon: 'fa-coins', cls: 'gold', label: 'Referral Bonus', val: formatMoney(ud.referral_bonus) },
    { icon: 'fa-users', cls: '', label: 'Total Referrals', val: String(Number(ud.total_referrals || 0)) },
    { icon: 'fa-user-check', cls: 'cyan', label: 'Paid Referrals', val: String(Number(ud.paid_referrals || 0)) }
  ];
  if (Number(ud.total_withdrawn) > 0) items.push({ icon: 'fa-money-bill-transfer', cls: 'rose', label: 'Total Withdrawn', val: formatMoney(ud.total_withdrawn) });
  const exam = valueText(ud.exam_grade) || (last && has(last.pct) ? pctText(last.pct) : '');
  if (exam) items.push({ icon: 'fa-file-pen', cls: 'cyan', label: 'Exam Result', val: exam });
  const assess = valueText(ud.assessment_grade);
  if (assess) items.push({ icon: 'fa-clipboard-check', cls: '', label: 'Assessment', val: assess });
  if (has(ud.level_completed) && typeof ud.level_completed !== 'object') items.push({ icon: 'fa-layer-group', cls: 'cyan', label: 'Level Completed', val: String(ud.level_completed) });
  if ($('statsGrid')) {
    $('statsGrid').innerHTML = items.map((s) => '<div class="stat-card ' + s.cls + '"><i class="fa-solid ' + s.icon + '"></i><div><b>' + escapeHtml(s.val) + '</b><span>' + escapeHtml(s.label) + '</span></div></div>').join('');
  }
}

function buildActions(ud) {
  const exams = getExams(ud);
  const last = exams.length ? exams[exams.length - 1] : null;
  const passed = !!(last && last.passed === true);
  const c = courseInfo(ud);
  const btns = [
    '<a class="act-btn" href="https://www.idtacademy.com.ng/dashboard"><i class="fa-solid fa-gauge-high"></i> Dashboard</a>',
    '<a class="act-btn" href="https://www.idtacademy.com.ng/referral"><i class="fa-solid fa-users"></i> Referral</a>'
  ];
  if (has(c.name) && isActivated(ud) && !passed) btns.push('<a class="act-btn primary" href="https://www.idtacademy.com.ng/exam"><i class="fa-solid fa-file-pen"></i> Final Exam</a>');
  if (passed) btns.push('<a class="act-btn primary" href="https://www.idtacademy.com.ng/certificate"><i class="fa-solid fa-award"></i> My Certificate</a>');
  if ($('quickActions')) $('quickActions').innerHTML = btns.join('');
}

function fillCourse(ud) {
  const body = $('courseBody');
  if (!body) return;
  const c = courseInfo(ud);
  if (!has(c.name) && !has(c.id)) {
    body.innerHTML = '<div class="empty-state"><i class="fa-solid fa-book-open"></i><b>No Course Yet</b><p>You have not enrolled in any course yet.</p><a href="https://www.idtacademy.com.ng/courses"><i class="fa-solid fa-graduation-cap"></i> Browse Courses</a></div>';
    return;
  }
  const rows = [];
  if (has(c.name)) rows.push(kv('Course Name', escapeHtml(c.name)));
  rows.push(kv('Course Type', c.jamb ? 'JAMB Preparation' : 'Regular Course'));
  if (has(c.number)) rows.push(kv('Course Number', escapeHtml(c.number)));
  if (has(c.id)) rows.push(kv('Course ID', escapeHtml(c.id)));
  if (c.jamb && has(c.subjects)) rows.push(kv('Subjects', escapeHtml(c.subjects)));
  if (Number(c.price) > 0) rows.push(kv('Course Price', formatMoney(c.price)));
  rows.push(kv('Payment', isActivated(ud) ? statusBadge('paid') : statusBadge('pending')));
  rows.push(kv('Account Status', statusBadge(isActivated(ud) ? 'active' : ud.status || 'pending')));
  body.innerHTML = '<div class="kv-grid">' + rows.join('') + '</div>';
}

function fillPersonal(ud) {
  const rows = [];
  if (has(ud.academy_id)) rows.push(kv('Academy ID', escapeHtml(ud.academy_id)));
  if (has(ud.full_name)) rows.push(kv('Full Name', escapeHtml(ud.full_name)));
  if (has(ud.email)) rows.push(kv('Email', escapeHtml(ud.email)));
  if (has(ud.phone)) rows.push(kv('Phone', escapeHtml(ud.phone)));
  if (has(ud.gender)) rows.push(kv('Gender', escapeHtml(ud.gender)));
  const dob = ud.date_of_birth || ud.dob;
  if (has(dob)) rows.push(kv('Date of Birth', escapeHtml(formatDate(dob))));
  if (has(ud.school_level)) rows.push(kv('School Level', escapeHtml(ud.school_level)));
  if (has(ud.date_registered)) rows.push(kv('Date Registered', escapeHtml(formatDate(ud.date_registered))));
  if ($('personalGrid')) $('personalGrid').innerHTML = rows.join('');
}

function buildExamHistory(ud) {
  const exams = getExams(ud);
  const card = $('examCard');
  if (!card) return;
  if (!exams.length) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');
  if ($('examList')) {
    $('examList').innerHTML = exams.slice().reverse().map((h) => {
      const passed = h.passed === true;
      const course = has(h.course_name) ? h.course_name : (has(ud.course_name) ? ud.course_name : 'Final Exam');
      const bits = [formatDate(h.date)];
      if (has(h.score)) bits.push('Score: ' + Number(h.score).toFixed(1));
      if (has(h.pct)) bits.push(pctText(Number(h.pct)));
      return '<div class="exam-row"><div class="ex-ic ' + (passed ? 'pass' : 'fail') + '"><i class="fa-solid ' + (passed ? 'fa-circle-check' : 'fa-circle-xmark') + '"></i></div><div class="ex-body"><b>' + escapeHtml(course) + '</b><span>' + escapeHtml(bits.join(' • ')) + '</span></div>' + statusBadge(passed ? 'passed' : 'failed') + '</div>';
    }).join('');
  }
}

function fillReferral(ud) {
  const link = has(ud.referral_link) ? ud.referral_link : (has(ud.referral_code) ? 'https://www.idtacademy.com.ng/index/ref/' + ud.referral_code : '');
  if ($('refLink')) $('refLink').value = link;
  const meta = [];
  if (has(ud.referral_code)) meta.push(kv('Referral Code', escapeHtml(ud.referral_code)));
  meta.push(kv('Total Bonus', formatMoney(ud.referral_bonus)));
  meta.push(kv('Paid Referrals', String(Number(ud.paid_referrals || 0)) + ' of ' + String(Number(ud.total_referrals || 0))));
  if (has(ud.referred_by)) meta.push(kv('Referred By', escapeHtml(ud.referred_by)));
  if ($('refMeta')) $('refMeta').innerHTML = meta.join('');
}

function updateRing(steps) {
  const pct = Math.round((steps.filter((s) => s.state === 'done').length / steps.length) * 100);
  if ($('progressPct')) $('progressPct').textContent = pct + '%';
  if ($('progressRing')) $('progressRing').style.background = 'conic-gradient(#7c3aed ' + pct + '%, rgba(124,58,237,.12) 0)';
}

function renderProfile() {
  const ud = currentUd;
  if ($('pName')) $('pName').textContent = has(ud.full_name) ? ud.full_name : 'Student';
  if ($('pEmail')) $('pEmail').textContent = has(ud.email) ? ud.email : '—';
  if ($('pAvatar')) $('pAvatar').src = currentProfileUrl || LOGO;
  if ($('pMemberSince')) $('pMemberSince').innerHTML = '<i class="fa-solid fa-calendar-check"></i> ' + (has(ud.date_registered) ? 'Member since ' + escapeHtml(formatDate(ud.date_registered)) : 'IDT Academy Student');
  if ($('statusBadge')) $('statusBadge').outerHTML = statusBadge(isActivated(ud) ? 'active' : ud.status || 'pending').replace('class="badge', 'id="statusBadge" class="badge');
  if ($('pLevelBadge')) {
    const show = has(ud.level_completed) && typeof ud.level_completed !== 'object';
    $('pLevelBadge').style.display = show ? '' : 'none';
    if (show && $('pLevelText')) $('pLevelText').textContent = 'Level ' + ud.level_completed;
  }
  const steps = buildSteps(ud);
  buildStats(ud);
  buildActions(ud);
  fillCourse(ud);
  fillPersonal(ud);
  buildExamHistory(ud);
  fillReferral(ud);
  updateRing(steps);
}

async function loadProfile(userId) {
  currentUserId = userId;
  try {
    const { data, error } = await supabase.from('user_profiles').select('id, user_data').eq('id', userId).maybeSingle();
    if (error) throw error;
    currentUd = (data && data.user_data) || {};
    currentProfileUrl = currentUd.profile_url || currentUd.avatar_url || currentUd.photo_url || '';
    renderProfile();
    setView(true);
  } catch (err) {
    currentUd = {};
    currentProfileUrl = '';
    renderProfile();
    setView(true);
    pushShow('error', 'Load Failed', 'We could not load your profile. Please check your connection and refresh.');
  }
  setTimeout(hideLoading, 400);
}

if ($('btnLogout')) {
  $('btnLogout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    setView(false);
    pushShow('info', 'Signed Out', 'You have been logged out.');
  });
}

if ($('copyRef')) {
  $('copyRef').addEventListener('click', async () => {
    const link = $('refLink') ? $('refLink').value : '';
    if (!link) {
      pushShow('error', 'No Link', 'Referral link is not available.');
      return;
    }
    try {
      await copyText(link);
      $('copyRef').innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      $('copyRef').classList.add('done');
      setTimeout(() => {
        $('copyRef').innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
        $('copyRef').classList.remove('done');
      }, 2500);
      pushShow('success', 'Copied!', 'Your referral link has been copied. Share it and earn ₦1500 per registration.');
    } catch (err) {
      pushShow('error', 'Copy Failed', 'Could not copy the link. Please copy it manually.');
    }
  });
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    currentUserId = '';
    currentUd = {};
    currentProfileUrl = '';
    setView(false);
  }
});

showLoading();
window.addEventListener('load', () => setTimeout(hideLoading, 500));

(async function init() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data && data.session) {
      await loadProfile(data.session.user.id);
    } else {
      setView(false);
      setTimeout(hideLoading, 400);
    }
  } catch (err) {
    setView(false);
    setTimeout(hideLoading, 400);
  }
})();

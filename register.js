import { supabase } from './supabase.js';

const APP_VERSION = 'v1.1';

const $ = (id) => document.getElementById(id);

const CATEGORIES = {
  '1': 'Technology & Computing',
  '2': 'Vocational & Agricultural Skills',
  '3': 'Health & Community Wellness',
  '4': '2-Year Diploma Program'
};

let courseMap = {};
let urlCourseId = '';
let urlCourseName = '';
let urlCoursePrice = '';
let urlCourseNumber = '';
let urlCourseInfo = '';
let urlCourseImage = '';
let registering = false;

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function showToast(type, title, message, raw) {
  const wrap = $('toastWrap');
  if (!wrap) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const rawHtml = raw
    ? '<small class="toast-raw"><i class="fa-solid fa-bug"></i> [API/Network Detail]: ' + escapeHtml(raw) + '</small>'
    : '';
  el.innerHTML =
    '<i class="fa-solid ' + icons[type] + '"></i>' +
    '<div class="toast-body"><b>' + escapeHtml(title) + '</b><p>' + escapeHtml(message) + '</p>' + rawHtml + '</div>' +
    '<button class="toast-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  el.querySelector('.toast-x').addEventListener('click', () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  });
  wrap.appendChild(el);
  if (type === 'success') setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }, 2600);
  return el;
}

function showLoading() {
  let loader = document.getElementById('idt-loader-2');
  if (loader) {
    loader.classList.remove('idt-hide');
    return;
  }
  const html = `
  <div class="idt-loader-2" id="idt-loader-2">
    <div class="i2-bg">
      <span class="i2-blob i2-b1"></span><span class="i2-blob i2-b2"></span><span class="i2-blob i2-b3"></span>
      <span class="i2-glow"></span><span class="i2-grid"></span>
      <span class="i2-star i2-s1"></span><span class="i2-star i2-s2"></span><span class="i2-star i2-s3"></span>
      <span class="i2-star i2-s4"></span><span class="i2-star i2-s5"></span><span class="i2-star i2-s6"></span>
      <span class="i2-star i2-s7"></span><span class="i2-star i2-s8"></span><span class="i2-star i2-s9"></span>
      <span class="i2-star i2-s10"></span><span class="i2-star i2-s11"></span><span class="i2-star i2-s12"></span>
    </div>
    <div class="i2-wrap">
      <div class="i2-bookwrap">
        <span class="i2-orbit"></span>
        <div class="i2-book">
          <div class="i2-cover i2-cl"><img src="https://i.imgur.com/oyqM5oF.png" alt="" class="i2-coverlogo"></div>
          <div class="i2-cover i2-cr"><img src="https://i.imgur.com/oyqM5oF.png" alt="" class="i2-coverlogo i2-crlogo"></div>
          <div class="i2-page i2-p1"><i></i><i></i><i></i><i></i></div>
          <div class="i2-page i2-p2"><i></i><i></i><i></i></div>
          <div class="i2-page i2-p3"><i></i><i></i></div>
          <div class="i2-spine"></div><div class="i2-ribbon"></div>
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
    .i2-b1{width:420px;height:420px;left:-130px;top:-130px;background:#7c3aed;animation:i2d1 14s ease-in-out infinite}
    .i2-b2{width:380px;height:380px;right:-110px;top:18%;background:#0ea5e9;animation:i2d2 17s ease-in-out infinite}
    .i2-b3{width:320px;height:320px;left:32%;bottom:-150px;background:#f59e0b;animation:i2d3 19s ease-in-out infinite}
    @keyframes i2d1{0%,100%{transform:translate(0,0)}50%{transform:translate(90px,70px)}}
    @keyframes i2d2{0%,100%{transform:translate(0,0)}50%{transform:translate(-80px,60px)}}
    @keyframes i2d3{0%,100%{transform:translate(0,0)}50%{transform:translate(60px,-70px)}}
    .i2-glow{position:absolute;left:50%;top:50%;width:620px;height:620px;transform:translate(-50%,-50%);border-radius:50%;background:conic-gradient(from 0deg,transparent,rgba(124,92,255,.22),transparent 30%,rgba(34,211,238,.18),transparent 60%,rgba(251,191,36,.16),transparent);filter:blur(55px);animation:i2sp 11s linear infinite}
    .i2-grid{position:absolute;left:-60%;right:-60%;bottom:-8%;height:42%;background-image:linear-gradient(rgba(124,92,255,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(124,92,255,.16) 1px,transparent 1px);background-size:46px 46px;transform:perspective(420px) rotateX(60deg);transform-origin:bottom;animation:i2gm 3.4s linear infinite;-webkit-mask-image:linear-gradient(to top,rgba(0,0,0,.9),transparent);mask-image:linear-gradient(to top,rgba(0,0,0,.9),transparent)}
    @keyframes i2gm{to{background-position-y:46px}}
    .i2-star{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;animation:i2tw 3.2s ease-in-out infinite}
    .i2-s1{left:10%;top:16%}.i2-s2{left:82%;top:10%;animation-delay:.7s}.i2-s3{left:24%;top:78%;animation-delay:1.2s}
    .i2-s4{left:70%;top:80%;animation-delay:1.8s}.i2-s5{left:45%;top:6%;animation-delay:.4s}.i2-s6{left:6%;top:48%;animation-delay:2.2s}
    .i2-s7{left:92%;top:42%;animation-delay:1.5s}.i2-s8{left:58%;top:90%;animation-delay:.9s}.i2-s9{left:34%;top:24%;animation-delay:2.6s}
    .i2-s10{left:66%;top:30%;animation-delay:.2s}.i2-s11{left:16%;top:60%;animation-delay:1.9s}.i2-s12{left:88%;top:66%;animation-delay:2.9s}
    @keyframes i2tw{0%,100%{opacity:.15}50%{opacity:1}}
    .i2-wrap{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center}
    .i2-bookwrap{position:relative;width:240px;height:240px;display:flex;align-items:center;justify-content:center}
    .i2-orbit{position:absolute;left:50%;top:50%;width:226px;height:226px;margin:-113px 0 0 -113px;border:1px dashed rgba(167,139,250,.35);border-radius:50%;animation:i2sp 8s linear infinite}
    .i2-orbit::before{content:"";position:absolute;top:-4px;left:50%;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:#fbbf24;box-shadow:0 0 14px #fbbf24}
    @keyframes i2sp{to{transform:rotate(360deg)}}
    .i2-book{position:relative;width:180px;height:126px;perspective:800px;animation:i2fl 3.6s ease-in-out infinite;filter:drop-shadow(0 24px 40px rgba(124,92,255,.3))}
    @keyframes i2fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
    .i2-cover{position:absolute;top:0;width:50%;height:100%;box-shadow:0 14px 30px rgba(0,0,0,.35)}
    .i2-cl{left:0;border-radius:6px 2px 2px 6px;transform-origin:right center;animation:i2sw 3.6s ease-in-out infinite;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#a78bfa,#8b5cf6 45%,#6d28d9)}
    .i2-cr{right:0;border-radius:2px 6px 6px 2px;transform-origin:left center;background:linear-gradient(145deg,#7c3aed,#6d28d9 50%,#4c1d95);animation:i2sw 3.6s ease-in-out infinite reverse;display:flex;align-items:center;justify-content:center}
    @keyframes i2sw{0%,100%{transform:rotateY(0)}50%{transform:rotateY(16deg)}}
    .i2-coverlogo{width:48px;height:48px;object-fit:contain;background:#fff;border-radius:50%;padding:7px;box-shadow:0 6px 18px rgba(0,0,0,.4)}
    .i2-crlogo{width:42px;height:42px;opacity:.85}
    .i2-page{position:absolute;top:5px;left:50%;width:46%;height:92%;background:#f8fafc;transform-origin:left center;box-shadow:0 0 16px rgba(0,0,0,.3);display:flex;flex-direction:column;padding-top:8px}
    .i2-page i{display:block;height:2px;background:#cbd5e1;margin:5px 10px}
    .i2-page i:nth-child(2){width:78%;background:#c4b5fd}
    .i2-page i:nth-child(3){width:60%}
    .i2-page i:nth-child(4){width:86%;background:#a5f3fc}
    .i2-p1{z-index:3;animation:i2fp 3.6s ease-in-out infinite}
    .i2-p2{z-index:2;animation:i2fp 3.6s ease-in-out 1.2s infinite}
    .i2-p3{z-index:1;animation:i2fp 3.6s ease-in-out 2.4s infinite}
    @keyframes i2fp{0%{transform:rotateY(0)}40%{transform:rotateY(-160deg)}70%,100%{transform:rotateY(0)}}
    .i2-spine{position:absolute;left:50%;top:0;bottom:0;width:9px;margin-left:-4.5px;background:linear-gradient(90deg,#000,#00000012);border-radius:4px;z-index:4}
    .i2-ribbon{position:absolute;left:50%;bottom:-24px;width:13px;height:24px;margin-left:-6.5px;background:linear-gradient(180deg,#fbbf24,#d97706);border-radius:0 0 7px 7px;transform-origin:top center;z-index:5;animation:i2dn 3.6s ease-in-out infinite}
    @keyframes i2dn{0%,100%{transform:rotate(0)}50%{transform:rotate(12deg)}}
    .i2-title{margin-top:18px;font-size:27px;font-weight:800;letter-spacing:5px;text-transform:uppercase;background:linear-gradient(90deg,#f8fafc,#a78bfa 30%,#22d3ee 55%,#fbbf24 80%,#f8fafc);background-size:220% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:i2sh 4s linear infinite}
    .i2-title b{font-weight:900}
    @keyframes i2sh{to{background-position:220% center}}
    .i2-tagline{margin-top:9px;font-size:11px;letter-spacing:7px;color:#8b93c7;text-transform:uppercase}
    .i2-loadbar{width:230px;height:4px;background:#ffffff17;margin-top:24px;overflow:hidden}
    .i2-loadbar span{display:block;height:100%;width:100%;background:linear-gradient(90deg,#7c3aed,#22d3ee,#fbbf24);transform-origin:left;animation:i2flb 2.8s ease-in-out forwards}
    @keyframes i2flb{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
    .i2-status{margin-top:13px;font-size:12px;letter-spacing:3px;color:#94a3b8;text-transform:uppercase;animation:i2fd 2.4s ease-in-out infinite}
    .i2-status b{color:#fbbf24}
    @keyframes i2fd{0%,100%{opacity:.45}50%{opacity:1}}
  </style>`;
  document.body.insertAdjacentHTML('beforeend', html);
  const n = document.getElementById('i2num');
  let c = 0;
  clearInterval(window.idtLoaderTimer);
  window.idtLoaderTimer = setInterval(() => {
    c += 5;
    if (n) n.textContent = c >= 100 ? 100 : c;
    if (c >= 100) clearInterval(window.idtLoaderTimer);
  }, 30);
}

function hideLoading() {
  clearInterval(window.idtLoaderTimer);
  const l = document.getElementById('idt-loader-2');
  if (l) l.classList.add('idt-hide');
}

function parseUrl() {
  const params = new URLSearchParams(window.location.search);
  urlCourseId = (params.get('course_id') || '').trim();
  urlCourseNumber = (params.get('course_number') || '').trim();
  urlCourseName = (params.get('course_name') || '').trim();
  urlCoursePrice = (params.get('price') || '').trim();
  urlCourseInfo = (params.get('info') || '').trim();
  urlCourseImage = (params.get('image') || '').trim();
}

function getUrlRef() {
  let ref = '';
  const params = new URLSearchParams(window.location.search);
  ref = (params.get('ref') || '').trim();
  if (!ref) ref = (params.get('code') || '').trim();
  if (!ref) {
    const path = window.location.pathname;
    let m = path.match(/\/ref\/([A-Za-z0-9]{4,8})/i);
    if (!m) m = path.match(/\/register\/ref\/([A-Za-z0-9]{4,8})/i);
    if (m) ref = m[1];
  }
  if (!ref) ref = localStorage.getItem('idt_ref') || '';
  return ref.trim().toUpperCase();
}

function switchTab(name) {
  const tReg = $('tabRegister');
  const tLog = $('tabLogin');
  const fReg = $('registerForm');
  const fLog = $('loginForm');
  if (tReg) tReg.classList.toggle('active', name === 'register');
  if (tLog) tLog.classList.toggle('active', name === 'login');
  if (fReg) fReg.classList.toggle('active', name === 'register');
  if (fLog) fLog.classList.toggle('active', name === 'login');
  if (name === 'register') {
    if ($('authTitle')) {
      $('authTitle').textContent = urlCourseName ? 'Register for ' + urlCourseName : 'Create Your Account';
    }
    if ($('authSub')) $('authSub').textContent = 'Join IDT Academy and start learning today';
  } else {
    if ($('authTitle')) $('authTitle').textContent = 'Welcome Back';
    if ($('authSub')) $('authSub').textContent = 'Login to continue your learning';
  }
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPhone(phone) {
  const p = phone.replace(/[\s\-()]/g, '');
  return /^(\+?234|0)[0-9]{10}$/.test(p);
}

function validRefCode(code) {
  return /^[A-Z0-9]{4,8}$/.test(code);
}

function isValidDob(dob) {
  const m = dob.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 1900 || y > new Date().getFullYear()) return false;
  return d <= new Date(y, mo, 0).getDate();
}

function markFieldError(fieldEl) {
  if (fieldEl) {
    fieldEl.classList.add('field-error');
    fieldEl.classList.remove('shake');
    void fieldEl.offsetWidth;
    fieldEl.classList.add('shake');
    setTimeout(() => fieldEl.classList.remove('shake'), 500);
  }
}

function focusFirstInvalid(fieldId) {
  const el = $(fieldId);
  if (!el) return;
  const field = el.closest('.field');
  const fieldEl = field || el;
  markFieldError(fieldEl);
  if (field && typeof field.scrollIntoView === 'function') field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusable = el.tagName === 'SELECT' ? el : el;
  try { focusable.focus(); } catch (e) {}
}

function friendlyRegisterError(json) {
  const raw = String((json && (json.error || json.message)) || '').toLowerCase();
  if (raw.includes('already registered') || raw.includes('already exists') || raw.includes('duplicate')) return 'This email is already registered. Please use the "Login" tab to sign in.';
  if (raw.includes('referral')) return 'The referral code you entered is not valid. Please check it and try again.';
  if (raw.includes('password')) return 'Your password must be at least 6 characters.';
  if (raw.includes('email')) return 'Please enter a valid email address.';
  if (raw.includes('course')) return 'Please choose a valid course.';
  if (raw.includes('missing') || raw.includes('required')) return 'Some required information is missing. Please complete every field.';
  if (raw.includes('network') || raw.includes('fetch')) return 'Network problem. Check your internet and try again.';
  return 'Registration failed. Please try again or contact support.';
}

function friendlyLoginError(err) {
  const raw = String((err && (err.message || err.error_description || err)) || '').toLowerCase();
  if (raw.includes('invalid login credentials') || raw.includes('invalid_grant')) return 'Invalid email or password. Please check your credentials and try again.';
  if (raw.includes('email not confirmed')) return 'Your email address is not verified yet. Please check your inbox.';
  if (raw.includes('network') || raw.includes('fetch')) return 'Network problem. Check your internet connection and try again.';
  return 'Login failed. Please check your details and try again.';
}

function toIsoDob(dob) {
  const m = dob.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? m[3] + '-' + m[2] + '-' + m[1] : dob.trim();
}

async function loadCourses() {
  const sel = $('regCourse');
  if (!sel) return;
  showLoading();
  try {
    const { data, error } = await supabase.from('courses').select('*');
    if (error) throw error;

    let list = (data || [])
      .map((row) => {
        if (row.course_data) {
          try { return typeof row.course_data === 'string' ? JSON.parse(row.course_data) : row.course_data; }
          catch (e) { return null; }
        }
        return row;
      })
      .filter((c) => c && (c.id || c.course_id))
      .map((c) => ({ ...c, id: String(c.id || c.course_id) }))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    try {
      const { data: acData, error: acErr } = await supabase.from('all_couse_post').select('*');
      if (!acErr && Array.isArray(acData)) {
        const activeIds = acData
          .filter((row) => row.all_course && row.all_course.active === true)
          .map((row) => String(row.all_course.id || row.course_id || row.id));
        if (activeIds.length > 0) {
          const filtered = list.filter((c) => activeIds.indexOf(String(c.id)) !== -1);
          if (filtered.length > 0) list = filtered;
        }
      }
    } catch (e2) {}

    sel.innerHTML = '<option value="">Choose your course</option>';
    courseMap = {};

    const urlCourseInList = list.some((c) => String(c.id) === String(urlCourseId));

    list.forEach((c) => {
      courseMap[c.id] = c;
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = (c.course_name || 'Course') + ' - \u20A6' + Number(c.price || 0).toLocaleString('en-NG');
      if (String(c.id) === String(urlCourseId)) opt.selected = true;
      sel.appendChild(opt);
    });

    if (urlCourseId && !urlCourseInList) {
      const fake = {
        id: urlCourseId,
        course_name: urlCourseName || 'Selected Course',
        course_number: urlCourseNumber || '',
        price: Number(urlCoursePrice || 0),
        info_text: urlCourseInfo || '',
        image_url: urlCourseImage || ''
      };
      courseMap[urlCourseId] = fake;
      const opt = document.createElement('option');
      opt.value = fake.id;
      opt.textContent = fake.course_name + ' - \u20A6' + Number(fake.price).toLocaleString('en-NG');
      opt.selected = true;
      sel.appendChild(opt);
    }

    if (!list.length && !urlCourseId) {
      sel.innerHTML = '<option value="">No courses available yet</option>';
      showToast('info', 'No Courses Yet', 'Courses are being prepared. Please check back soon.', '');
    }

    if (urlCourseId) {
      sel.value = urlCourseId;
    }
    updateCourseSummary();
  } catch (err) {
    sel.innerHTML = '<option value="">Could not load courses</option>';
    showToast('error', 'Courses Failed To Load', 'Please refresh the page or check your connection.', err.message || String(err));
  } finally {
    setTimeout(hideLoading, 300);
  }
}

function updateCourseSummary() {
  const sel = $('regCourse');
  if (!sel) return;
  const id = sel.value;
  const summary = $('courseSummary');
  if (!summary) return;
  if (!id || !courseMap[id]) {
    summary.classList.add('hidden');
    if ($('regPrice')) $('regPrice').value = '';
    if ($('courseImg')) $('courseImg').style.display = 'none';
    return;
  }
  const c = courseMap[id];
  if ($('regPrice')) $('regPrice').value = Number(c.price || 0).toLocaleString('en-NG');
  if ($('courseSummaryName')) $('courseSummaryName').textContent = c.course_name || 'Course';
  const cat = CATEGORIES[String(c.category || '')] || '';
  if ($('courseSummaryMeta')) {
    $('courseSummaryMeta').textContent = [cat, c.course_number ? '#' + c.course_number : ''].filter(Boolean).join(' - ');
  }
  const img = $('courseImg');
  if (img) {
    if (c.image_url) { img.src = c.image_url; img.style.display = 'block'; }
    else img.style.display = 'none';
  }
  summary.classList.remove('hidden');
}

async function doRegister(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const json = await res.json().catch(() => ({}));
    hideLoading();
    if (!res.ok || !json.success) {
      return { ok: false, json };
    }
    return { ok: true, json };
  } catch (err) {
    clearTimeout(timeoutId);
    hideLoading();
    return { ok: false, error: err };
  }
}

async function handleRegister() {
  if (registering) return;

  const btn = $('btnRegister');
  const btnText = $('btnRegisterText');
  const btnIcon = $('btnRegisterIcon');

  const fullName = ($('regFullName') || {}).value ? $('regFullName').value.trim() : '';
  const phone = ($('regPhone') || {}).value ? $('regPhone').value.trim() : '';
  const courseId = ($('regCourse') || {}).value ? $('regCourse').value : '';
  const gender = ($('regGender') || {}).value ? $('regGender').value : '';
  const dob = ($('regDob') || {}).value ? $('regDob').value.trim() : '';
  const level = ($('regLevel') || {}).value ? $('regLevel').value : '';
  const email = ($('regEmail') || {}).value ? $('regEmail').value.trim().toLowerCase() : '';
  const password = ($('regPassword') || {}).value ? $('regPassword').value : '';
  const confirm = ($('regConfirm') || {}).value ? $('regConfirm').value : '';
  const ref = ($('regRef') || {}).value ? $('regRef').value.trim().toUpperCase() : '';

  if (fullName.length < 3) {
    showToast('error', 'Full Name Required', 'Please enter your full name (at least 3 characters).', '');
    focusFirstInvalid('regFullName');
    return;
  }
  if (!validPhone(phone)) {
    showToast('error', 'Invalid Phone Number', 'Please enter a valid Nigerian phone number, e.g. 08123456789.', '');
    focusFirstInvalid('regPhone');
    return;
  }
  if (!courseId) {
    showToast('error', 'Choose A Course', 'Please select the course you want to study.', '');
    focusFirstInvalid('regCourse');
    return;
  }
  if (!gender) {
    showToast('error', 'Select Gender', 'Please choose your gender.', '');
    focusFirstInvalid('regGender');
    return;
  }
  if (!dob) {
    showToast('error', 'Date Of Birth Required', 'Please enter your date of birth (DD/MM/YYYY).', '');
    focusFirstInvalid('regDob');
    return;
  }
  if (!isValidDob(dob)) {
    showToast('error', 'Invalid Date Of Birth', 'Please enter a valid date in DD/MM/YYYY, e.g. 12/02/1999.', '');
    focusFirstInvalid('regDob');
    return;
  }
  if (!level) {
    showToast('error', 'Select Education Level', 'Please select your level of education.', '');
    focusFirstInvalid('regLevel');
    return;
  }
  if (!validEmail(email)) {
    showToast('error', 'Invalid Email', 'Please enter a valid email address.', '');
    focusFirstInvalid('regEmail');
    return;
  }
  if (password.length < 6) {
    showToast('error', 'Weak Password', 'Password must be at least 6 characters.', '');
    focusFirstInvalid('regPassword');
    return;
  }
  if (!confirm) {
    showToast('error', 'Confirm Password', 'Please confirm your password.', '');
    focusFirstInvalid('regConfirm');
    return;
  }
  if (password !== confirm) {
    showToast('error', 'Password Mismatch', 'The two passwords do not match. Please type them again.', '');
    focusFirstInvalid('regConfirm');
    return;
  }
  if (ref && !validRefCode(ref)) {
    showToast('error', 'Invalid Referral Code', 'Referral codes are 4 to 8 letters or numbers.', '');
    focusFirstInvalid('regRef');
    return;
  }

  const course = courseMap[courseId] || {};
  const payload = {
    full_name: fullName,
    phone: phone,
    email: email,
    gender: gender,
    course_id: courseId,
    course_name: course.course_name || urlCourseName || 'Selected Course',
    course_price: Number(course.price || urlCoursePrice || 0),
    course_number: course.course_number || urlCourseNumber || '',
    date_of_birth: toIsoDob(dob),
    school_level: level,
    password: password
  };
  if (ref) payload.referred_by = ref;

  registering = true;
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Processing...';
  if (btnIcon) { btnIcon.className = 'fa-solid fa-spinner fa-spin'; }
  showLoading();

  const result = await doRegister(payload);

  if (!result.ok) {
    registering = false;
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Applying';
    if (btnIcon) btnIcon.className = 'fa-solid fa-user-plus';
    hideLoading();
    if (result.error) {
      showToast('error', 'Network Connection Error', 'Could not process your registration. Check your internet connection.', result.error.message || String(result.error));
    } else {
      showToast('error', 'Registration Failed', friendlyRegisterError(result.json), (result.json && (result.json.error || result.json.message)) || ('HTTP status code: 400'));
    }
    return;
  }

  localStorage.setItem('idt_user', JSON.stringify(result.json.user));
  localStorage.removeItem('idt_ref');
  showToast('success', 'Welcome To IDT Academy!', result.json.message || 'Account created. Redirecting to your dashboard...');
  setTimeout(() => window.location.replace('dashboard.html'), 1800);
}

async function handleLogin(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const btn = $('btnLogin');
  const email = ($('loginEmail') || {}).value ? $('loginEmail').value.trim().toLowerCase() : '';
  const password = ($('loginPassword') || {}).value ? $('loginPassword').value : '';

  if (!validEmail(email)) {
    showToast('error', 'Invalid Email', 'Please enter the email you registered with.', '');
    focusFirstInvalid('loginEmail');
    return;
  }
  if (!password) {
    showToast('error', 'Password Required', 'Please enter your password.', '');
    focusFirstInvalid('loginPassword');
    return;
  }

  btn.disabled = true;
  showLoading();
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      hideLoading();
      btn.disabled = false;
      showToast('error', 'Login Failed', friendlyLoginError(error), error.message);
      return;
    }
    let userObj = { id: data.user.id, email: data.user.email, ...(data.user.user_metadata || {}) };
    try {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${data.user.id},email.eq.${email}`)
        .maybeSingle();
      if (profData) userObj = { ...userObj, ...profData };
    } catch (eProf) {}
    localStorage.setItem('idt_user', JSON.stringify(userObj));
    hideLoading();
    btn.disabled = false;
    showToast('success', 'Welcome Back!', 'Login successful. Opening your dashboard...');
    setTimeout(() => window.location.replace('dashboard.html'), 1400);
  } catch (err) {
    hideLoading();
    btn.disabled = false;
    showToast('error', 'Network Connection Error', 'Could not connect to service.', err.message || String(err));
  }
}

function bindEvents() {
  const tabReg = $('tabRegister');
  const tabLog = $('tabLogin');
  if (tabReg) tabReg.addEventListener('click', () => switchTab('register'));
  if (tabLog) tabLog.addEventListener('click', () => switchTab('login'));

  const regBtn = $('btnRegister');
  if (regBtn) regBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    handleRegister();
  });

  const regForm = $('registerForm');
  if (regForm) regForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    handleRegister();
  });

  const logForm = $('loginForm');
  if (logForm) logForm.addEventListener('submit', handleLogin);

  const logBtn = $('btnLogin');
  if (logBtn) logBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    handleLogin(ev);
  });

  if ($('regCourse')) $('regCourse').addEventListener('change', updateCourseSummary);

  if ($('regRef')) {
    $('regRef').addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
    });
  }

  if ($('regDob')) {
    $('regDob').addEventListener('input', (e) => {
      let v = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
      let out = v;
      if (v.length > 4) out = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4);
      else if (v.length > 2) out = v.slice(0, 2) + '/' + v.slice(2);
      e.target.value = out;
    });
  }

  document.querySelectorAll('.eye-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const inp = $(btn.dataset.target);
      if (!inp) return;
      const willShow = inp.type === 'password';
      inp.type = willShow ? 'text' : 'password';
      btn.innerHTML = '<i class="fa-solid ' + (willShow ? 'fa-eye-slash' : 'fa-eye') + '"></i>';
    });
  });

  ['regFullName', 'regPhone', 'regCourse', 'regGender', 'regDob', 'regLevel', 'regEmail', 'regRef', 'regPassword', 'regConfirm', 'loginEmail', 'loginPassword'].forEach((id) => {
    const el = $(id);
    if (!el) return;
    const clear = () => {
      const f = el.closest('.field');
      if (f) f.classList.remove('field-error', 'shake');
    };
    if (el.tagName === 'SELECT') el.addEventListener('change', clear);
    else el.addEventListener('input', clear);
  });

  const menuBtn = $('menuBtn');
  const menuItems = $('menuItems');
  if (menuBtn && menuItems) {
    menuBtn.addEventListener('click', (e) => { e.stopPropagation(); menuItems.classList.toggle('open'); });
    document.addEventListener('click', (e) => {
      if (!menuItems.contains(e.target) && !menuBtn.contains(e.target)) menuItems.classList.remove('open');
    });
  }
}

function checkVersionAndSync() {
  try {
    if (localStorage.getItem('idt_app_version') !== APP_VERSION) {
      localStorage.removeItem('idt_user');
      localStorage.removeItem('idt_visited');
      supabase.auth.signOut().catch(() => {});
      localStorage.setItem('idt_app_version', APP_VERSION);
    }
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', async () => {
  document.documentElement.classList.add('ready');
  checkVersionAndSync();
  parseUrl();

  const ref = getUrlRef();
  if (ref && $('regRef')) {
    $('regRef').value = ref;
    localStorage.setItem('idt_ref', ref);
  }

  const visited = localStorage.getItem('idt_visited');

  if (urlCourseId) {
    switchTab('register');
    if ($('regCourse')) $('regCourse').value = urlCourseId;
    if (urlCourseName) {
      document.title = urlCourseName + ' | IDT Academy';
      if ($('authTitle')) $('authTitle').textContent = 'Register for ' + urlCourseName;
      if ($('authSub')) $('authSub').textContent = 'Starting ' + urlCourseName + ' is one step away';
    }
  } else {
    switchTab(visited ? 'login' : 'register');
    localStorage.setItem('idt_visited', '1');
  }

  bindEvents();
  await loadCourses();
});

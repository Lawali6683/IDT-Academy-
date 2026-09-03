import { supabase } from './supabase.js';


const $ = (id) => document.getElementById(id);

const toastWrap = $('toastWrap');


const CATEGORIES = {
  '1': 'Technology & Computing',
  '2': 'Vocational & Agricultural Skills',
  '3': 'Health & Community Wellness',
  '4': '2-Year Diploma Program'
};


const LEVELS = [
  'Primary School',
  'Junior Secondary School (JSS)',
  'Senior Secondary School (SSS)',
  'OND / NCE',
  "HND / Bachelor's Degree",
  "Master's Degree (MSc)",
  'PhD',
  'Other'
];


let courseMap = {};
let urlCourseId = '';
let urlCourseName = '';
let urlCoursePrice = '';
let urlCourseNumber = '';
let urlCourseInfo = '';
let urlCourseImage = '';


function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
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
  if (type === 'success') setTimeout(() => removeToast(el), 2600);
  return el;
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
  window.idtLoaderInterval = setInterval(function() { 
    c += 5; 
    if (n) n.textContent = (c >= 100 ? 100 : c); 
    if (c >= 100) clearInterval(window.idtLoaderInterval); 
  }, 30);
}


function hideLoading() {
  var l = document.getElementById('idt-loader-2');
  if (window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
  if (l) l.classList.add('idt-hide');
}


function parseUrl() {
  const params = new URLSearchParams(window.location.search);
  urlCourseId = params.get('course_id') || '';
  urlCourseNumber = params.get('course_number') || '';
  urlCourseName = params.get('course_name') || '';
  urlCoursePrice = params.get('price') || '';
  urlCourseInfo = params.get('info') || '';
  urlCourseImage = params.get('image') || '';
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
  $('tabRegister').classList.toggle('active', name === 'register');
  $('tabLogin').classList.toggle('active', name === 'login');
  $('registerForm').classList.toggle('active', name === 'register');
  $('loginForm').classList.toggle('active', name === 'login');

  if (name === 'register') {
    $('authTitle').textContent = 'Create Your Account';
    $('authSub').textContent = 'Join IDT Academy and start learning today';
  } else {
    $('authTitle').textContent = 'Welcome Back';
    $('authSub').textContent = 'Login to continue your learning';
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


function friendlyRegisterError(json) {
  const raw = String((json && (json.error || json.message)) || '').toLowerCase();
  if (raw.includes('already registered') || raw.includes('already exists') || raw.includes('duplicate')) return 'This email is already registered. Please use the "Login" tab to sign in.';
  if (raw.includes('referral')) return 'The referral code you entered is not valid. Please check it and try again.';
  if (raw.includes('password')) return 'Your password must be at least 6 characters.';
  if (raw.includes('email')) return 'Please enter a valid email address.';
  if (raw.includes('course')) return 'Please choose a valid course.';
  if (raw.includes('missing') || raw.includes('required')) return 'Some required information is missing. Please complete every field.';
  if (raw.includes('network') || raw.includes('fetch')) return 'Network problem. Check your internet and try again.';
  return 'Something went wrong. Please try again or contact support.';
}


function friendlyLoginError(err) {
  const raw = String((err && (err.message || err.error_description || err)) || '').toLowerCase();
  if (raw.includes('invalid login credentials') || raw.includes('invalid_grant')) return 'Invalid email or password. Please check your credentials and try again.';
  if (raw.includes('email not confirmed')) return 'Your email address is not verified yet. Please check your inbox.';
  if (raw.includes('network') || raw.includes('fetch')) return 'Network problem. Check your internet connection and try again.';
  return err.message || 'Login failed. Please try again or contact support.';
}


async function loadCourses() {
  const sel = $('regCourse');
  try {
    const { data, error } = await supabase.from('courses').select('*');
    if (error) throw error;
    let list = (data || [])
      .map((row) => row.course_data || {})
      .filter((c) => c && c.id)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    try {
      const { data: acData, error: acErr } = await supabase.from('all_couse_post').select('*');
      if (!acErr && Array.isArray(acData)) {
        const activeIds = acData
          .filter((row) => row.all_course && row.all_course.active === true)
          .map((row) => row.id);
        if (activeIds.length > 0) {
          const filtered = list.filter((c) => activeIds.indexOf(c.id) !== -1);
          if (filtered.length > 0) list = filtered;
        }
      }
    } catch (e2) {}

    sel.innerHTML = '<option value="">Choose your course</option>';
    list.forEach((c) => {
      courseMap[c.id] = c;
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.course_name + ' - \u20A6' + Number(c.price || 0).toLocaleString('en-NG');
      if (c.id === urlCourseId) opt.selected = true;
      sel.appendChild(opt);
    });

    if (urlCourseId && !courseMap[urlCourseId]) {
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
    updateCourseSummary();
  } catch (err) {
    sel.innerHTML = '<option value="">Could not load courses</option>';
    showToast('error', 'Courses Failed To Load', 'Please refresh the page or check your Supabase connection.', err.message || String(err));
  }
}


function updateCourseSummary() {
  const sel = $('regCourse');
  const id = sel.value;
  const summary = $('courseSummary');
  if (!id || !courseMap[id]) { summary.classList.add('hidden'); $('regPrice').value = ''; return; }
  const c = courseMap[id];
  $('regPrice').value = Number(c.price || 0).toLocaleString('en-NG');
  $('courseSummaryName').textContent = c.course_name || 'Course';
  const cat = CATEGORIES[String(c.category || '')] || '';
  $('courseSummaryMeta').textContent = [cat, c.course_number ? '#' + c.course_number : ''].filter(Boolean).join(' - ');
  const img = $('courseImg');
  if (c.image_url) { img.src = c.image_url; img.style.display = 'block'; } else { img.style.display = 'none'; }
  summary.classList.remove('hidden');
}


async function handleRegister(e) {
  e.preventDefault();
  const fullName = $('regFullName').value.trim();
  const phone = $('regPhone').value.trim();
  const courseId = $('regCourse').value;
  const gender = $('regGender').value;
  const dob = $('regDob').value;
  const level = $('regLevel').value;
  const email = $('regEmail').value.trim().toLowerCase();
  const password = $('regPassword').value;
  const confirm = $('regConfirm').value;
  const ref = $('regRef').value.trim().toUpperCase();
  const paymentNo = $('regPaymentNo').value.trim();

  if (fullName.length < 3) { showToast('error', 'Full Name Required', 'Please enter your full name.', ''); $('regFullName').focus(); return; }
  if (!validPhone(phone)) { showToast('error', 'Invalid Phone Number', 'Please enter a valid Nigerian phone number, e.g. 08123456789.', ''); $('regPhone').focus(); return; }
  if (!courseId) { showToast('error', 'Choose A Course', 'Please select the course you want to study.', ''); $('regCourse').focus(); return; }
  if (!gender) { showToast('error', 'Select Gender', 'Please choose your gender.', ''); $('regGender').focus(); return; }
  if (!dob) { showToast('error', 'Date Of Birth Required', 'Please select your date of birth.', ''); $('regDob').focus(); return; }
  if (!level) { showToast('error', 'Select Education Level', 'Please select your level of education.', ''); $('regLevel').focus(); return; }
  if (!validEmail(email)) { showToast('error', 'Invalid Email', 'Please enter a valid email address.', ''); $('regEmail').focus(); return; }
  if (password.length < 6) { showToast('error', 'Weak Password', 'Password must be at least 6 characters.', ''); $('regPassword').focus(); return; }
  if (password !== confirm) { showToast('error', 'Password Mismatch', 'The two passwords do not match. Please type them again.', ''); $('regConfirm').focus(); return; }
  if (ref && !validRefCode(ref)) { showToast('error', 'Invalid Referral Code', 'Referral codes are 4 to 8 letters or numbers. Please check it.', ''); $('regRef').focus(); return; }

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
    payment_no: paymentNo,
    date_of_birth: dob,
    school_level: level,
    password: password,
    referred_by: ref
  };

  showLoading();
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000)
    });
    const json = await res.json().catch(() => ({}));
    hideLoading();
    if (!res.ok || !json.success) {
      showToast('error', 'Registration Failed', friendlyRegisterError(json), json.error || json.message || ('HTTP ' + res.status));
      return;
    }
    localStorage.setItem('idt_user', JSON.stringify(json.user));
    localStorage.removeItem('idt_ref');
    showToast('success', 'Welcome To IDT Academy!', json.message || 'Account created. Redirecting to your dashboard...');
    setTimeout(() => window.location.replace('dashboard.html'), 1800);
  } catch (err) {
    hideLoading();
    showToast('error', 'Network Error', 'Could not reach the server. Check your internet and try again.', err.message || String(err));
  }
}


async function handleLogin(e) {
  e.preventDefault();
  const email = $('loginEmail').value.trim().toLowerCase();
  const password = $('loginPassword').value;

  if (!validEmail(email)) { 
    showToast('error', 'Invalid Email', 'Please enter the email you registered with.', ''); 
    $('loginEmail').focus(); 
    return; 
  }
  if (!password) { 
    showToast('error', 'Password Required', 'Please enter your password.', ''); 
    $('loginPassword').focus(); 
    return; 
  }

  showLoading();

  try {
   
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      hideLoading();
      showToast('error', 'Login Failed', friendlyLoginError(error), error.message);
      return;
    }

    
    let userObj = {
      id: data.user.id,
      email: data.user.email,
      ...data.user.user_metadata
    };

    try {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profData) {
        userObj = { ...userObj, ...profData };
      }
    } catch (eProf) {
      
    }

   
    localStorage.setItem('idt_user', JSON.stringify(userObj));

    hideLoading();
    showToast('success', 'Welcome Back!', 'Login successful. Opening your dashboard...');
    
   
    setTimeout(() => window.location.replace('dashboard.html'), 1400);

  } catch (err) {
    hideLoading();
    showToast('error', 'Network Error', 'Could not connect to Supabase. Check your internet and try again.', err.message || String(err));
  }
}


$('tabRegister').addEventListener('click', () => switchTab('register'));
$('tabLogin').addEventListener('click', () => switchTab('login'));
$('registerForm').addEventListener('submit', handleRegister);
$('loginForm').addEventListener('submit', handleLogin);
$('regCourse').addEventListener('change', updateCourseSummary);
$('regRef').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });


document.querySelectorAll('.eye-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const inp = $(btn.dataset.target);
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.innerHTML = '<i class="fa-solid ' + (show ? 'fa-eye-slash' : 'fa-eye') + '"></i>';
  });
});


const menuBtn = $('menuBtn');
const menuItems = $('menuItems');

if (menuBtn && menuItems) {
  menuBtn.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    menuItems.classList.toggle('open'); 
  });
  
  document.addEventListener('click', (e) => { 
    if (!menuItems.contains(e.target) && !menuBtn.contains(e.target)) {
      menuItems.classList.remove('open'); 
    }
  });
}


document.addEventListener('DOMContentLoaded', async () => {
  showLoading();

  try {
    
    const { data: sessionData } = await supabase.auth.getSession();
    
  
    const localUser = localStorage.getItem('idt_user');

    if (sessionData?.session || localUser) {
      
      window.location.replace('dashboard.html');
      return;
    }
  } catch (err) {
   
  }

  parseUrl();
  const ref = getUrlRef();
  if (ref) { 
    $('regRef').value = ref; 
    localStorage.setItem('idt_ref', ref); 
  }

  const today = new Date().toISOString().split('T')[0];
  if ($('regDob')) $('regDob').max = today;

  const visited = localStorage.getItem('idt_visited');
  if (visited) { 
    switchTab('login'); 
  } else { 
    switchTab('register'); 
  }

  localStorage.setItem('idt_visited', '1');
  await loadCourses();
  setTimeout(hideLoading, 500);
});


document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('ready');
});

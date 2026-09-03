import { supabase } from './supabase.js';

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

const $ = (id) => document.getElementById(id);
const toastWrap = $('toastWrap');

const CATEGORY_MAP = {
  '1': 'Technology',
  '2': 'Vocational',
  '3': 'Health',
  '4': 'Diploma'
};

const CEO_EMAILS = [
  'harunalawali5522@gmail.com',
  'lawaliharuna943@gmail.com',
  'ubaidaaliyu2023@gmail.com'
];
const ADMIN_EMAILS = ['idtacademy3@gmail.com'];

let currentUserId = null;
let currentUserRole = null;
let currentCourse = null;
let currentAllCourseData = null;
let currentCourseId = null;
let currentCourseNumber = '';

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
    setTimeout(() => removeToast(el), 3200);
  }
  return el;
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function resolveRole(ud) {
  const storedRole = String((ud || {}).role || '').toLowerCase();
  if (storedRole === 'admin' || storedRole === 'ceo') {
    return storedRole;
  }
  const em = normaliseEmail((ud || {}).email);
  if (CEO_EMAILS.indexOf(em) !== -1) return 'ceo';
  if (ADMIN_EMAILS.indexOf(em) !== -1) return 'admin';
  return '';
}

function switchAdmin(show) {
  $('loginGate').classList.toggle('hidden', show);
  $('adminArea').classList.toggle('hidden', !show);
}

function resetCourseDisplay() {
  currentCourse = null;
  currentAllCourseData = null;
  currentCourseId = null;
  currentCourseNumber = '';
  $('courseCard').classList.add('hidden');
  $('formCard').classList.add('hidden');
  $('topicsCard').classList.add('hidden');
  $('courseNumInput').value = '';
}

async function attemptAutoLogin() {
  try {
    const raw = localStorage.getItem('idt_user');
    if (!raw) return false;
    const u = JSON.parse(raw);
    if (!u || !u.id || !u.email) return false;
    currentUserId = u.id;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', u.id)
      .maybeSingle();
    if (error || !data) {
      localStorage.removeItem('idt_user');
      return false;
    }
    const ud = data.user_data || {};
    const role = resolveRole(ud);
    if (role !== 'admin' && role !== 'ceo') {
      localStorage.removeItem('idt_user');
      return false;
    }
    currentUserId = data.id;
    currentUserRole = role;
    return true;
  } catch (err) {
    localStorage.removeItem('idt_user');
    return false;
  }
}

async function handleGateLogin(e) {
  e.preventDefault();
  const email = normaliseEmail($('gateEmail').value);
  const password = $('gatePassword').value;

  if (!isValidEmail(email)) {
    showToast('error', 'Invalid Email', 'Please enter a valid email address.', '');
    $('gateEmail').focus();
    return;
  }
  if (!password) {
    showToast('error', 'Password Required', 'Please enter your password.', '');
    $('gatePassword').focus();
    return;
  }

  showLoading();
  try {
    const { data: rows, error } = await supabase
      .from('user_profiles')
      .select('*')
      .filter('user_data->>email', 'eq', email);
    if (error) {
      hideLoading();
      showToast('error', 'Database Error', 'Could not check your account.', error.message);
      return;
    }
    if (!rows || rows.length === 0) {
      hideLoading();
      showToast('error', 'No Account Found', 'No user found with this email. Please register first.', '');
      return;
    }
    let matched = null;
    for (let i = 0; i < rows.length; i++) {
      const ud = rows[i].user_data || {};
      const role = resolveRole(ud);
      if (role === 'admin' || role === 'ceo') {
        matched = { row: rows[i], ud: ud, role: role };
        break;
      }
    }
    if (!matched) {
      hideLoading();
      showToast('error', 'Access Denied', 'Only admins and CEOs can access this page.', '');
      return;
    }
    const ud = matched.ud;
    const storedHash = ud.password_hash || ud.passwordHash || '';
    const storedSalt = ud.password_salt || ud.passwordSalt || '';
    const storedPlain = ud.password || '';

    if (storedHash && storedSalt) {
      const computed = await hashPassword(password, storedSalt);
      if (computed !== storedHash) {
        hideLoading();
        showToast('error', 'Wrong Password', 'The password you entered is incorrect.', '');
        $('gatePassword').focus();
        return;
      }
    } else if (storedPlain) {
      if (String(storedPlain) !== password) {
        hideLoading();
        showToast('error', 'Wrong Password', 'The password you entered is incorrect.', '');
        $('gatePassword').focus();
        return;
      }
    } else {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });
      if (authErr || !authData || !authData.user) {
        hideLoading();
        showToast('error', 'Invalid Account', 'This account has no usable password. Please contact support.', '');
        return;
      }
    }

    currentUserId = matched.row.id;
    currentUserRole = matched.role;
    const safeUser = {
      id: matched.row.id,
      full_name: ud.full_name || '',
      email: ud.email || email,
      role: matched.role
    };
    localStorage.setItem('idt_user', JSON.stringify(safeUser));
    showToast('success', 'Welcome Admin!', 'Login successful. You can now manage course topics.');
    switchAdmin(true);
    hideLoading();
  } catch (err) {
    hideLoading();
    showToast('error', 'Login Failed', 'An unexpected error occurred.', err.message || String(err));
  }
}

async function loadCourseByNumber(num) {
  if (!num || !num.trim()) {
    showToast('error', 'Course Number Required', 'Please enter a course number to search.', '');
    $('courseNumInput').focus();
    return;
  }
  const cn = num.trim();
  showLoading();
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .filter('course_data->>course_number', 'eq', cn)
      .maybeSingle();
    if (error) {
      hideLoading();
      showToast('error', 'Database Error', 'Could not search for course.', error.message);
      return;
    }
    if (!data) {
      hideLoading();
      showToast('error', 'Course Not Found', 'No course has the number "' + escapeHtml(cn) + '". Please check the number and try again.', '');
      return;
    }
    const cd = data.course_data || {};
    currentCourse = cd;
    currentCourseId = data.id;
    currentCourseNumber = cd.course_number || cn;
    renderCourseCard(cd, data.id);
    await loadTopics(data.id);
    $('formCard').classList.remove('hidden');
    $('topicsCard').classList.remove('hidden');
    hideLoading();
    showToast('success', 'Course Loaded', '"' + (cd.course_name || 'Unknown') + '" found and ready for topics.');
  } catch (err) {
    hideLoading();
    showToast('error', 'Error', 'Something went wrong while searching.', err.message || String(err));
  }
}

function renderCourseCard(cd, id) {
  const img = $('courseImg');
  if (cd.image_url) {
    img.src = cd.image_url;
    img.style.display = 'block';
  } else {
    img.src = '';
    img.style.display = 'none';
  }
  $('courseName').textContent = cd.course_name || 'Unknown Course';
  $('courseNumberBadge').innerHTML = '<i class="fa-solid fa-hashtag"></i> #' + escapeHtml(cd.course_number || '000');
  const catName = CATEGORY_MAP[String(cd.category || '')] || 'General';
  $('courseCategory').innerHTML = '<i class="fa-solid fa-tag"></i> ' + catName;
  $('coursePrice').innerHTML = '<i class="fa-solid fa-naira-sign"></i> ' + Number(cd.price || 0).toLocaleString('en-NG');
  $('courseIdText').textContent = id;
  $('courseCard').classList.remove('hidden');
}

async function loadTopics(courseId) {
  try {
    const { data, error } = await supabase
      .from('all_couse_post')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();
    if (error) {
      showToast('error', 'Database Error', 'Could not load existing topics.', error.message);
      return;
    }
    if (data) {
      currentAllCourseData = data.all_course || {};
    } else {
      currentAllCourseData = {
        course_id: courseId,
        course_number: currentCourse ? (currentCourse.course_number || '') : '',
        course_name: currentCourse ? (currentCourse.course_name || '') : '',
        category: currentCourse ? (currentCourse.category || '') : '',
        image_url: currentCourse ? (currentCourse.image_url || '') : '',
        price: currentCourse ? (currentCourse.price || 0) : 0,
        active: false,
        topics: []
      };
    }
    renderTopics();
  } catch (err) {
    showToast('error', 'Error', 'Could not load topics.', err.message || String(err));
  }
}

function renderTopics() {
  const list = $('topicsList');
  const ac = currentAllCourseData || {};
  const topics = Array.isArray(ac.topics) ? ac.topics : [];
  $('statTopics').textContent = topics.length;
  const videoCount = topics.filter((t) => t.video_url && t.video_url.trim()).length;
  $('statVideos').textContent = videoCount;
  const hasFinal = topics.some((t) => t.is_final === true);
  $('statFinal').textContent = hasFinal ? 'Yes' : 'No';
  if (topics.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-book-open"></i> No topics yet. Use the form above to add the first topic.</div>';
    return;
  }
  let html = '';
  topics.forEach((t, i) => {
    const isF = t.is_final === true;
    html += '<div class="topic-row" data-index="' + i + '">' +
      '<div class="topic-num' + (isF ? ' final-num' : '') + '">' + (i + 1) + '</div>' +
      '<div class="topic-info">' +
      '<b>' + escapeHtml(t.topic_name || 'Topic ' + (i + 1)) + '</b>' +
      '<small>' +
      (t.video_url ? '<i class="fa-solid fa-video"></i> Video' : '') +
      (isF ? ' <i class="fa-solid fa-flag-checkered" style="color:#10b981"></i> Final Topic' : '') +
      '</small>' +
      '</div>' +
      '<button class="topic-del" data-index="' + i + '" aria-label="Delete topic"><i class="fa-solid fa-trash-can"></i></button>' +
      '</div>';
  });
  list.innerHTML = html;
  list.querySelectorAll('.topic-del').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      deleteTopic(idx);
    });
  });
}

async function deleteTopic(idx) {
  const ac = currentAllCourseData || {};
  const topics = Array.isArray(ac.topics) ? ac.topics : [];
  if (idx < 0 || idx >= topics.length) return;
  const t = topics[idx];
  if (!confirm('Delete "' + (t.topic_name || 'Topic ' + (idx + 1)) + '" permanently?')) return;
  showLoading();
  try {
    topics.splice(idx, 1);
    ac.topics = topics;
    const { error } = await supabase
      .from('all_couse_post')
      .upsert({ id: currentCourseId, all_course: ac }, { onConflict: 'id' });
    if (error) {
      hideLoading();
      showToast('error', 'Delete Failed', 'Could not delete the topic.', error.message);
      return;
    }
    currentAllCourseData = ac;
    renderTopics();
    hideLoading();
    showToast('success', 'Topic Deleted', 'The topic has been removed successfully.');
  } catch (err) {
    hideLoading();
    showToast('error', 'Error', 'Could not delete topic.', err.message || String(err));
  }
}

async function handleSaveTopic(e) {
  e.preventDefault();
  const name = $('topicName').value.trim();
  const text = $('topicText').value.trim();
  const videoUrl = $('videoUrl').value.trim();
  const isFinal = $('finalBox').classList.contains('checked');

  if (!name || name.length < 2) {
    showToast('error', 'Topic Name Required', 'Please enter a name for this topic.', '');
    $('topicName').focus();
    return;
  }
  if (!text || text.length < 10) {
    showToast('error', 'Topic Text Required', 'Please write the full lesson text for this topic.', '');
    $('topicText').focus();
    return;
  }

  if (!currentCourseId) {
    showToast('error', 'No Course Selected', 'Please find a course first before adding topics.', '');
    return;
  }

  showLoading();
  try {
    const ac = currentAllCourseData || {};
    const topics = Array.isArray(ac.topics) ? ac.topics : [];
    const newNum = topics.length + 1;

    if (isFinal) {
      topics.forEach((t) => { t.is_final = false; });
    }

    const newTopic = {
      topic_number: newNum,
      topic_name: name,
      topic_text: text,
      video_url: videoUrl || '',
      is_final: isFinal
    };
    topics.push(newTopic);
    ac.topics = topics;
    if (!ac.course_id) ac.course_id = currentCourseId;
    if (!ac.course_number) ac.course_number = currentCourse ? (currentCourse.course_number || '') : '';
    if (!ac.course_name) ac.course_name = currentCourse ? (currentCourse.course_name || '') : '';

    const { error } = await supabase
      .from('all_couse_post')
      .upsert({ id: currentCourseId, all_course: ac }, { onConflict: 'id' });
    if (error) {
      hideLoading();
      showToast('error', 'Save Failed', 'Could not save the topic.', error.message);
      return;
    }
    currentAllCourseData = ac;
    renderTopics();
    $('topicName').value = '';
    $('topicText').value = '';
    $('videoUrl').value = '';
    $('finalBox').classList.remove('checked');
    $('finalBox').setAttribute('aria-pressed', 'false');
    $('finalStatus').textContent = 'Final: No';
    $('finalStatus').className = 'final-status off';
    hideLoading();
    showToast('success', 'Topic Saved!', '"' + name + '" has been added to ' + (currentCourse ? currentCourse.course_name : 'the course') + '.');
  } catch (err) {
    hideLoading();
    showToast('error', 'Error', 'Could not save topic.', err.message || String(err));
  }
}

function toggleFinalBox() {
  const box = $('finalBox');
  const pressed = box.getAttribute('aria-pressed') === 'true';
  const newPressed = !pressed;
  box.classList.toggle('checked', newPressed);
  box.setAttribute('aria-pressed', String(newPressed));
  const status = $('finalStatus');
  if (newPressed) {
    status.textContent = 'Final: Yes';
    status.className = 'final-status';
  } else {
    status.textContent = 'Final: No';
    status.className = 'final-status off';
  }
}

async function openOverlay() {
  const backdrop = $('coursesOverlay');
  const list = $('overlayList');
  backdrop.classList.add('open');
  list.innerHTML = '<div class="ov-empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading courses...</div>';
  showLoading();
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*');
    if (error) {
      hideLoading();
      list.innerHTML = '<div class="ov-empty"><i class="fa-solid fa-triangle-exclamation" style="color:#f43f5e"></i> Could not load courses.</div>';
      showToast('error', 'Error', 'Could not load courses list.', error.message);
      return;
    }
    const courses = (data || [])
      .map((r) => r.course_data || {})
      .filter((c) => c && c.course_number)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    if (courses.length === 0) {
      hideLoading();
      list.innerHTML = '<div class="ov-empty"><i class="fa-solid fa-book"></i> No courses have been created yet.</div>';
      return;
    }
    const { data: acData, error: acErr } = await supabase
      .from('all_couse_post')
      .select('*');
    if (acErr) {
      hideLoading();
      list.innerHTML = '<div class="ov-empty"><i class="fa-solid fa-triangle-exclamation" style="color:#f43f5e"></i> Could not load course statuses.</div>';
      return;
    }
    const acMap = {};
    (acData || []).forEach((row) => {
      acMap[row.id] = row.all_course || {};
    });
    let html = '';
    courses.forEach((c) => {
      const cn = c.course_number || '000';
      const cid = c.id || '';
      const catName = CATEGORY_MAP[String(c.category || '')] || 'General';
      const acRow = acMap[cid] || {};
      const active = acRow.active === true;
      html += '<div class="ov-row" data-course-id="' + escapeHtml(cid) + '">' +
        '<img class="ov-img" src="' + (c.image_url || 'https://i.imgur.com/oyqM5oF.png') + '" alt="" onerror="this.src=\'https://i.imgur.com/oyqM5oF.png\'">' +
        '<div class="ov-info">' +
        '<b>' + escapeHtml(c.course_name || 'Unnamed') + '</b>' +
        '<small>#' + escapeHtml(cn) + ' — ' + catName + ' — <b>₦' + Number(c.price || 0).toLocaleString('en-NG') + '</b></small>' +
        '</div>' +
        '<div class="ov-actions">' +
        '<button class="ov-btn ov-copy" data-number="' + escapeHtml(cn) + '" title="Copy course number"><i class="fa-solid fa-copy"></i></button>' +
        '<button class="ov-btn ov-toggle' + (active ? ' on' : '') + '" data-course-id="' + escapeHtml(cid) + '" title="Toggle active status">' +
        (active ? '<i class="fa-solid fa-check"></i>' : '') +
        '</button>' +
        '</div>' +
        '</div>';
    });
    list.innerHTML = html;
    list.querySelectorAll('.ov-copy').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const num = btn.dataset.number;
        try {
          await navigator.clipboard.writeText(num);
          btn.classList.add('done');
          btn.innerHTML = '<i class="fa-solid fa-check"></i>';
          showToast('success', 'Copied!', 'Course number ' + num + ' copied to clipboard.');
          setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 2000);
        } catch (err) {
          showToast('error', 'Copy Failed', 'Could not copy to clipboard.', err.message);
        }
      });
    });
    list.querySelectorAll('.ov-toggle').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const cid = btn.dataset.courseId;
        if (!cid) return;
        const courseInfo = courses.find((c) => c.id === cid) || {};
        const currentlyOn = btn.classList.contains('on');
        const newState = !currentlyOn;
        showLoading();
        try {
          const { data: existing, error: fetchErr } = await supabase
            .from('all_couse_post')
            .select('*')
            .eq('id', cid)
            .maybeSingle();
          if (fetchErr) {
            hideLoading();
            showToast('error', 'Database Error', 'Could not update status.', fetchErr.message);
            return;
          }
          let acRow = existing ? (existing.all_course || {}) : {
            course_id: cid,
            course_number: courseInfo.course_number || '',
            course_name: courseInfo.course_name || '',
            category: courseInfo.category || '',
            image_url: courseInfo.image_url || '',
            price: courseInfo.price || 0,
            topics: []
          };
          acRow.active = newState;
          const { error: upsertErr } = await supabase
            .from('all_couse_post')
            .upsert({ id: cid, all_course: acRow }, { onConflict: 'id' });
          if (upsertErr) {
            hideLoading();
            showToast('error', 'Update Failed', 'Could not save status.', upsertErr.message);
            return;
          }
          btn.classList.toggle('on', newState);
          btn.innerHTML = newState ? '<i class="fa-solid fa-check"></i>' : '';
          hideLoading();
          showToast('success', 'Status Updated', newState ? 'Course is now active.' : 'Course is now inactive.');
          if (currentCourseId === cid) {
            if (currentAllCourseData) currentAllCourseData.active = newState;
          }
        } catch (err) {
          hideLoading();
          showToast('error', 'Error', 'Could not toggle status.', err.message || String(err));
        }
      });
    });
    hideLoading();
  } catch (err) {
    hideLoading();
    list.innerHTML = '<div class="ov-empty"><i class="fa-solid fa-triangle-exclamation" style="color:#f43f5e"></i> An error occurred.</div>';
    showToast('error', 'Error', 'Could not open overlay.', err.message || String(err));
  }
}

$('gateForm').addEventListener('submit', handleGateLogin);
$('gateEye').addEventListener('click', () => {
  const inp = $('gatePassword');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  $('gateEye').innerHTML = '<i class="fa-solid ' + (show ? 'fa-eye-slash' : 'fa-eye') + '"></i>';
});
$('btnFindCourse').addEventListener('click', () => {
  loadCourseByNumber($('courseNumInput').value);
});
$('courseNumInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    loadCourseByNumber($('courseNumInput').value);
  }
});
$('btnCopyCourseId').addEventListener('click', async () => {
  const id = $('courseIdText').textContent;
  if (!id || id === '-') return;
  try {
    await navigator.clipboard.writeText(id);
    showToast('success', 'Course ID Copied', 'The course ID has been copied to your clipboard.');
  } catch (err) {
    showToast('error', 'Copy Failed', 'Could not copy course ID.', err.message);
  }
});
$('finalBox').addEventListener('click', toggleFinalBox);
$('topicForm').addEventListener('submit', handleSaveTopic);
$('btnOpenOverlay').addEventListener('click', openOverlay);
$('overlayClose').addEventListener('click', () => {
  $('coursesOverlay').classList.remove('open');
});
$('coursesOverlay').addEventListener('click', (e) => {
  if (e.target === $('coursesOverlay')) {
    $('coursesOverlay').classList.remove('open');
  }
});
$('menuBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  $('menuItems').classList.toggle('open');
});
document.addEventListener('click', (e) => {
  const mi = $('menuItems');
  const mb = $('menuBtn');
  if (!mi.contains(e.target) && !mb.contains(e.target)) {
    mi.classList.remove('open');
  }
});
$('menuLogout').addEventListener('click', () => {
  localStorage.removeItem('idt_user');
  currentUserId = null;
  currentUserRole = null;
  resetCourseDisplay();
  switchAdmin(false);
  showToast('info', 'Logged Out', 'You have been logged out successfully.');
});

document.addEventListener('DOMContentLoaded', async () => {
  showLoading();
  const loggedIn = await attemptAutoLogin();
  if (loggedIn) {
    switchAdmin(true);
    showToast('success', 'Welcome Back!', 'You are logged in as admin. You can now manage topics.');
  } else {
    switchAdmin(false);
  }
  setTimeout(hideLoading, 500);
});

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('ready');
});
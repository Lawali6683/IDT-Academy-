import { supabase } from './supabase.js';

const CEO_CREDENTIALS = [
  [64, 117, 98, 97, 105, 100, 97, 55, 55],
  [64, 104, 97, 114, 117, 110, 97, 54, 54]
];

function checkCeoAuth(input) {
  const codes = Array.from(String(input || '')).map(c => c.charCodeAt(0));
  return CEO_CREDENTIALS.some(arr => arr.length === codes.length && arr.every((val, i) => val === codes[i]));
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, saltHex, expectedHashHex) {
  try {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    const computedHash = bytesToHex(new Uint8Array(bits));
    return computedHash === expectedHashHex;
  } catch (e) {
    return false;
  }
}

function showLoading() {
  let loader = document.getElementById('idt-loader-2');
  if (loader) {
    loader.classList.remove('idt-hide');
  } else {
    const loaderHTML = '<div class="idt-loader-2" id="idt-loader-2" style="position:fixed;inset:0;z-index:99999;background:rgba(248,246,255,0.9);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px)"><div style="text-align:center"><div style="font-size:20px;font-weight:800;color:#1e1b4b;letter-spacing:2px">IDT <b style="color:#7c3aed">Academy</b></div><div style="font-size:12px;color:#6d6a8a;margin-top:8px">Loading data...</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', loaderHTML);
  }
}

function hideLoading() {
  const l = document.getElementById('idt-loader-2');
  if (l) l.remove();
}

const $ = (id) => document.getElementById(id);
const toastWrap = $('toastWrap');
const CATEGORY_MAP = { '1': 'Technology', '2': 'Vocational', '3': 'Health', '4': 'Diploma' };

let currentCourse = null;
let currentAllCourseData = null;
let currentCourseId = null;

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
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
  el.innerHTML = '<i class="fa-solid ' + icons[type] + '"></i><div class="toast-body"><b>' + escapeHtml(title) + '</b><p>' + escapeHtml(message) + '</p>' + rawHtml + '</div><button class="toast-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  el.querySelector('.toast-x').addEventListener('click', () => removeToast(el));
  toastWrap.appendChild(el);
  if (type === 'success') setTimeout(() => removeToast(el), 3200);
  return el;
}

async function handleCeoSubmit(e) {
  e.preventDefault();
  const val = $('ceoPassword').value;
  if (!val) { showToast('error', 'Required', 'Please enter CEO password.'); return; }
  showLoading();
  try {
    const matched = checkCeoAuth(val);
    hideLoading();
    if (matched) {
      showToast('success', 'CEO Verified', 'Please proceed with Supabase Login.');
      $('ceoGate').classList.add('hidden');
      $('supabaseGate').classList.remove('hidden');
    } else {
      showToast('error', 'Invalid Password', 'The CEO password you entered is incorrect.');
    }
  } catch (err) {
    hideLoading();
    showToast('error', 'Error', err.message);
  }
}

async function handleSupabaseLogin(e) {
  e.preventDefault();
  const email = $('supaEmail').value.trim().toLowerCase();
  const password = $('supaPassword').value;
  if (!email || !password) { showToast('error', 'Required', 'Please enter email and password.'); return; }
  showLoading();
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .filter('user_data->>email', 'eq', email)
      .maybeSingle();

    if (error || !data) { 
      hideLoading(); 
      showToast('error', 'Login Failed', 'No account found with this email in Supabase.'); 
      return; 
    }

    const ud = data.user_data || {};
    const storedHash = ud.password_hash;
    const storedSalt = ud.password_salt;

    if (!storedHash || !storedSalt) {
      hideLoading();
      showToast('error', 'Login Failed', 'Invalid account authentication structure.');
      return;
    }

    const isPasswordCorrect = await verifyPassword(password, storedSalt, storedHash);
    if (!isPasswordCorrect) {
      hideLoading();
      showToast('error', 'Login Failed', 'Incorrect password entered.');
      return;
    }

    const ceoEmails = ['harunalawali5522@gmail.com', 'lawaliharuna943@gmail.com', 'ubaidaaliyu2023@gmail.com'];
    const adminEmail = 'idtacademy3@gmail.com';
    const role = String(ud.role || ud.account_type || '').toLowerCase();
    const isAuthorizedEmail = ceoEmails.includes(email) || email === adminEmail;
    const isAuthorizedRole = role === 'admin' || role === 'ceo';

    if (!isAuthorizedEmail && !isAuthorizedRole) { 
      hideLoading(); 
      showToast('error', 'Access Denied', 'This account does not have admin privileges.'); 
      return; 
    }

    $('supabaseGate').classList.add('hidden');
    $('adminArea').classList.remove('hidden');
    hideLoading();
    showToast('success', 'Welcome Admin', 'Successfully logged into dashboard.');
  } catch (err) { 
    hideLoading(); 
    showToast('error', 'Error', err.message); 
  }
}

async function loadCourseByNumber(num) {
  const cn = num.trim();
  if (!cn) return;
  showLoading();
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .filter('course_data->>course_number', 'eq', cn)
      .maybeSingle();

    if (error || !data) { hideLoading(); showToast('error', 'Not Found', 'Course with number ' + cn + ' does not exist.'); return; }
    const cd = data.course_data || {};
    currentCourse = cd;
    currentCourseId = data.id;
    $('courseImg').src = cd.image_url || 'https://i.imgur.com/oyqM5oF.png';
    $('courseName').textContent = cd.course_name || 'Course';
    $('courseNumberBadge').innerHTML = '<i class="fa-solid fa-hashtag"></i> #' + escapeHtml(cd.course_number);
    $('courseCategory').innerHTML = '<i class="fa-solid fa-tag"></i> ' + (CATEGORY_MAP[String(cd.category)] || 'General');
    $('coursePrice').innerHTML = '<i class="fa-solid fa-naira-sign"></i> ' + Number(cd.price || 0).toLocaleString('en-NG');
    $('courseIdText').textContent = data.id;
    $('courseCard').classList.remove('hidden');
    $('formCard').classList.remove('hidden');
    await loadTopics(data.id);
    hideLoading();
    showToast('success', 'Course Loaded', cd.course_name);
  } catch (err) { hideLoading(); showToast('error', 'Error', err.message); }
}

async function loadTopics(courseId) {
  try {
    const { data } = await supabase
      .from('all_course_post')
      .select('*')
      .eq('id', String(courseId))
      .maybeSingle();

    currentAllCourseData = data ? (data.all_course || {}) : { topics: [] };
    renderTopics();
  } catch (err) { showToast('error', 'Error', 'Could not load topics.'); }
}

function renderTopics() {
  const list = $('topicsList');
  const topics = Array.isArray(currentAllCourseData.topics) ? currentAllCourseData.topics : [];
  $('statTopics').textContent = topics.length;
  if (topics.length === 0) { list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-book-open"></i> No topics added yet.</div>'; return; }
  let html = '';
  topics.forEach((t, i) => {
    const isF = t.is_final === true;
    html += '<div class="topic-row"><div class="topic-num' + (isF ? ' final-num' : '') + '">' + (i + 1) + '</div><div class="topic-info"><b>' + escapeHtml(t.topic_name) + '</b><small>' + (t.video_url ? '<i class="fa-solid fa-video"></i> Video Attached' : '') + (isF ? ' \u2022 Final Topic' : '') + '</small></div><button class="topic-del" data-index="' + i + '"><i class="fa-solid fa-trash-can"></i></button></div>';
  });
  list.innerHTML = html;
  list.querySelectorAll('.topic-del').forEach(btn => { btn.addEventListener('click', () => deleteTopic(parseInt(btn.dataset.index, 10))); });
}

async function deleteTopic(idx) {
  const topics = currentAllCourseData.topics || [];
  if (!confirm('Are you sure you want to delete this topic?')) return;
  showLoading();
  try {
    topics.splice(idx, 1);
    currentAllCourseData.topics = topics;
    await supabase
      .from('all_course_post')
      .upsert({ id: String(currentCourseId), all_course: currentAllCourseData });

    renderTopics();
    hideLoading();
    showToast('success', 'Deleted', 'Topic removed successfully.');
  } catch (err) { hideLoading(); showToast('error', 'Error', err.message); }
}

async function handleSaveTopic(e) {
  e.preventDefault();
  const name = $('topicName').value.trim();
  const text = $('topicText').value.trim();
  const videoUrl = $('videoUrl').value.trim();
  const isFinal = $('finalBox').classList.contains('checked');
  if (!name || !text) { showToast('error', 'Required', 'Please fill topic name and text content.'); return; }
  showLoading();
  try {
    const topics = Array.isArray(currentAllCourseData.topics) ? currentAllCourseData.topics : [];
    if (isFinal) topics.forEach(t => t.is_final = false);
    topics.push({ topic_number: topics.length + 1, topic_name: name, topic_text: text, video_url: videoUrl, is_final: isFinal });
    currentAllCourseData.topics = topics;
    currentAllCourseData.course_id = currentCourseId;
    await supabase
      .from('all_course_post')
      .upsert({ id: String(currentCourseId), all_course: currentAllCourseData });

    $('topicName').value = '';
    $('topicText').value = '';
    $('videoUrl').value = '';
    $('finalBox').classList.remove('checked');
    $('finalBox').setAttribute('aria-pressed', 'false');
    $('finalStatus').textContent = 'Final: No';
    $('finalStatus').className = 'final-status off';
    renderTopics();
    hideLoading();
    showToast('success', 'Saved', 'Topic added successfully.');
  } catch (err) { hideLoading(); showToast('error', 'Error', err.message); }
}

async function deleteEntireCourse() {
  if (!confirm('WARNING: This will permanently delete the course and all its topics! Proceed?')) return;
  showLoading();
  try {
    await supabase.from('courses').delete().eq('id', String(currentCourseId));
    await supabase.from('all_course_post').delete().eq('id', String(currentCourseId));
    hideLoading();
    showToast('success', 'Deleted', 'Course deleted completely.');
    location.reload();
  } catch (err) { hideLoading(); showToast('error', 'Error', err.message); }
}

async function openOverlay() {
  $('coursesOverlay').classList.add('open');
  const list = $('overlayList');
  list.innerHTML = '<div class="ov-empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
  try {
    const { data } = await supabase.from('courses').select('*');
    if (!data || data.length === 0) { list.innerHTML = '<div class="ov-empty">No courses found.</div>'; return; }
    let html = '';
    data.forEach(row => {
      const c = row.course_data || {};
      html += '<div class="ov-row"><img class="ov-img" src="' + (c.image_url || 'https://i.imgur.com/oyqM5oF.png') + '"><div class="ov-info"><b>' + escapeHtml(c.course_name) + '</b><small>#' + escapeHtml(c.course_number) + '</small></div><button class="ov-btn select-course-btn" data-num="' + escapeHtml(c.course_number) + '"><i class="fa-solid fa-arrow-right"></i></button></div>';
    });
    list.innerHTML = html;
    list.querySelectorAll('.select-course-btn').forEach(btn => { 
      btn.addEventListener('click', () => { 
        $('coursesOverlay').classList.remove('open'); 
        $('courseNumInput').value = btn.dataset.num; 
        loadCourseByNumber(btn.dataset.num); 
      }); 
    });
  } catch (err) { list.innerHTML = '<div class="ov-empty">Failed to load courses.</div>'; }
}

$('ceoForm').addEventListener('submit', handleCeoSubmit);
$('supabaseForm').addEventListener('submit', handleSupabaseLogin);
$('btnSearchCourse').addEventListener('click', () => loadCourseByNumber($('courseNumInput').value));
$('topicForm').addEventListener('submit', handleSaveTopic);
$('btnDeleteEntireCourse').addEventListener('click', deleteEntireCourse);
$('btnOpenOverlay').addEventListener('click', openOverlay);
$('btnCloseOverlay').addEventListener('click', () => $('coursesOverlay').classList.remove('open'));
$('btnLogout').addEventListener('click', () => location.reload());
$('finalToggleRow').addEventListener('click', () => { 
  const box = $('finalBox'); 
  const isChecked = box.classList.toggle('checked'); 
  box.setAttribute('aria-pressed', isChecked); 
  $('finalStatus').textContent = isChecked ? 'Final: Yes' : 'Final: No'; 
  $('finalStatus').className = isChecked ? 'final-status' : 'final-status off'; 
});
$('toggleCeoPass').addEventListener('click', () => { const p = $('ceoPassword'); p.type = p.type === 'password' ? 'text' : 'password'; });
$('toggleSupaPass').addEventListener('click', () => { const p = $('supaPassword'); p.type = p.type === 'password' ? 'text' : 'password'; });
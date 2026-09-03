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
const loginPanel = $('loginPanel');
const mainPanel = $('mainPanel');
const btnLogout = $('btnLogout');
const loginForm = $('loginForm');
const btnLogin = $('btnLogin');
const togglePass = $('togglePass');
const passInput = $('loginPassword');
const courseForm = $('courseForm');
const btnSubmit = $('btnSubmit');
const submitLabel = btnSubmit ? btnSubmit.querySelector('.btn-label') : null;
const formTitle = $('formTitle');
const btnReset = $('btnReset');
const formCard = $('formCard');
const category = $('courseCategory');
const courseNumber = $('courseNumber');
const courseName = $('courseName');
const courseInfo = $('courseInfo');
const coursePrice = $('coursePrice');
const imageLink = $('imageLink');
const fileInput = $('fileInput');
const dropZone = $('dropZone');
const dropText = $('dropText');
const btnUploadImgur = $('btnUploadImgur');
const uploadLabel = btnUploadImgur ? btnUploadImgur.querySelector('.btn-label') : null;
const tabLink = $('tabLink');
const tabUpload = $('tabUpload');
const linkMode = $('linkMode');
const uploadMode = $('uploadMode');
const imagePreview = $('imagePreview');
const previewEmpty = $('previewEmpty');
const courseList = $('courseList');
const emptyState = $('emptyState');
const courseCount = $('courseCount');
const confirmModal = $('confirmModal');
const modalMessage = $('modalMessage');
const btnCancelDel = $('btnCancelDel');
const btnConfirmDel = $('btnConfirmDel');

const CATEGORIES = {
  '1': 'Technology & Computing',
  '2': 'Vocational & Agricultural Skills',
  '3': 'Health & Community Wellness',
  '4': '2-Year Diploma Program'
};

const ADMIN_EMAILS = [
  'harunalawali5522@gmail.com',
  'lawaliharuna943@gmail.com',
  'ubaidaaliyu2023@gmail.com',
  'idtacademy3@gmail.com'
];

let editingId = null;
let deleteTargetId = null;
let selectedImageUrl = '';
let uploadedFile = null;
let base64Image = null;
let listCache = [];

function showToast(title, message, type) {
  if (!toastWrap) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<i class="fa-solid ' + icons[type] + '"></i><div><b>' + title + '</b><p>' + message + '</p></div>';
  toastWrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }, 4200);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function setBtnLoading(btn, loading) {
  if (!btn) return;
  const label = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.btn-spinner');
  if (label) label.classList.toggle('hidden', loading);
  if (spinner) spinner.classList.toggle('hidden', !loading);
  btn.disabled = loading;
}

function generateCourseId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return 'IDT-' + code + '-' + Date.now().toString(36).toUpperCase().slice(-4);
}

function friendlyAuthError(error) {
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) return 'Wrong email or password. Please try again.';
  if (msg.includes('email not confirmed')) return 'Please confirm your email first, then sign in.';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Please wait a few minutes.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Network problem. Check your internet and try again.';
  return error.message || 'Something went wrong. Please try again.';
}

function setSessionFlag() {
  localStorage.setItem('idt_admin_session', 'active');
}

function clearSessionFlag() {
  localStorage.removeItem('idt_admin_session');
}

async function checkSession() {
  const flag = localStorage.getItem('idt_admin_session');
  const { data: { session } } = await supabase.auth.getSession();
  if (flag === 'active' && session) {
    if (loginPanel) loginPanel.classList.add('hidden');
    if (mainPanel) mainPanel.classList.remove('hidden');
    if (btnLogout) btnLogout.classList.remove('hidden');
    loadCourses();
  } else {
    clearSessionFlag();
    if (mainPanel) mainPanel.classList.add('hidden');
    if (loginPanel) loginPanel.classList.remove('hidden');
    if (btnLogout) btnLogout.classList.add('hidden');
  }
}

function switchImageMode(mode) {
  const isLink = mode === 'link';
  if (tabLink) tabLink.classList.toggle('active', isLink);
  if (tabUpload) tabUpload.classList.toggle('active', !isLink);
  if (linkMode) linkMode.classList.toggle('hidden', !isLink);
  if (uploadMode) uploadMode.classList.toggle('hidden', isLink);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

async function uploadToImgur(base64) {
  const res = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: { Authorization: "Client-ID 5acf7eff9c91660" },
    body: new URLSearchParams({ image: base64, type: "base64" })
  });
  if (!res.ok) {
    let msg = 'Imgur upload failed (HTTP ' + res.status + ').';
    try { const errData = await res.json(); if (errData && errData.data && errData.data.error) msg = errData.data.error; } catch (e) {}
    throw new Error(msg);
  }
  const json = await res.json();
  if (!json.success || !json.data || !json.data.link) throw new Error('Imgur did not return an image link.');
  return json.data.link.replace('http://', 'https://');
}

function resetForm() {
  if (courseForm) courseForm.reset();
  editingId = null;
  selectedImageUrl = '';
  uploadedFile = null;
  base64Image = null;
  if (fileInput) fileInput.value = '';
  if (dropText) dropText.innerHTML = 'Click to choose an image<br><small>JPG, PNG, WEBP - max 8MB</small>';
  if (btnUploadImgur) btnUploadImgur.classList.add('disabled');
  if (imagePreview) imagePreview.classList.add('hidden');
  if (previewEmpty) previewEmpty.classList.remove('hidden');
  if (formTitle) formTitle.textContent = 'Post New Course';
  if (btnReset) btnReset.classList.add('hidden');
  if (submitLabel) submitLabel.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Post Course';
  switchImageMode('link');
}

function fillForm(data) {
  if (category) category.value = data.category || '';
  if (courseNumber) courseNumber.value = data.course_number || '';
  if (courseName) courseName.value = data.course_name || '';
  if (imageLink) imageLink.value = data.image_url || '';
  if (courseInfo) courseInfo.value = data.info_text || '';
  if (coursePrice) coursePrice.value = data.price !== undefined ? data.price : '';
  selectedImageUrl = data.image_url || '';
  if (selectedImageUrl && imagePreview && previewEmpty) {
    imagePreview.src = selectedImageUrl;
    imagePreview.classList.remove('hidden');
    previewEmpty.classList.add('hidden');
  }
  editingId = data.id;
  if (formTitle) formTitle.textContent = 'Edit Course';
  if (btnReset) btnReset.classList.remove('hidden');
  if (submitLabel) submitLabel.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Update Course';
  if (formCard) {
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    formCard.classList.add('highlight');
    setTimeout(() => formCard.classList.remove('highlight'), 2500);
  }
}

function openDeleteModal(id) {
  deleteTargetId = id;
  if (modalMessage) modalMessage.textContent = 'Delete course "' + id + '"? This action cannot be undone.';
  if (confirmModal) confirmModal.classList.remove('hidden');
}

function closeDeleteModal() {
  deleteTargetId = null;
  if (confirmModal) confirmModal.classList.add('hidden');
}

async function loadCourses() {
  showLoading();
  try {
    const { data, error } = await supabase.from('courses').select('*');
    if (error) {
      if (error.code === '42P01') showToast('Table Missing', 'The "courses" table was not found in Supabase. Please create it first.', 'error');
      else showToast('Load Failed', error.message, 'error');
      if (courseList) courseList.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      if (courseCount) courseCount.textContent = '0';
      return;
    }
    const sortedData = (data || []).sort((a, b) => {
      const dateA = new Date((a.course_data && a.course_data.created_at) || 0);
      const dateB = new Date((b.course_data && b.course_data.created_at) || 0);
      return dateB - dateA;
    });
    renderCourses(sortedData);
  } catch (err) {
    showToast('Load Failed', err.message || 'Could not load courses.', 'error');
  } finally {
    setTimeout(hideLoading, 400);
  }
}

function renderCourses(list) {
  listCache = list;
  if (courseCount) courseCount.textContent = list.length;
  if (!list.length) {
    if (courseList) courseList.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');
  if (courseList) {
    courseList.innerHTML = list.map((row) => {
      const data = row.course_data || {};
      const courseId = data.id || row.id;
      const cat = CATEGORIES[data.category] || 'Uncategorized';
      const price = data.price !== undefined ? '\u20A6' + Number(data.price).toLocaleString() : '\u20A60';
      return '<tr><td><div class="course-cell"><img src="' + escapeHtml(data.image_url || '') + '" alt="" onerror="this.style.visibility=\'hidden\'"><div><b>' + escapeHtml(data.course_name || 'Untitled') + '</b><small>' + escapeHtml(courseId || '') + '</small></div></div></td><td><b>' + escapeHtml(data.course_number || '-') + '</b></td><td><span class="cat-badge">' + escapeHtml(cat) + '</span></td><td><span class="price-tag">' + price + '</span></td><td><div class="row-actions"><button class="icon-btn edit" data-action="edit" data-id="' + escapeHtml(courseId) + '" title="Edit"><i class="fa-solid fa-pen"></i></button><button class="icon-btn del" data-action="delete" data-id="' + escapeHtml(courseId) + '" title="Delete"><i class="fa-solid fa-trash-can"></i></button></div></td></tr>';
    }).join('');
  }
}

function validateForm() {
  const fields = [
    { el: category, label: 'Category' },
    { el: courseNumber, label: 'Course Number' },
    { el: courseName, label: 'Course Name' },
    { el: courseInfo, label: 'Course Info Text' },
    { el: coursePrice, label: 'Course Price' }
  ];
  for (const f of fields) {
    if (!f.el || !f.el.value.trim()) {
      showToast('Missing Field', 'Please fill in: ' + f.label + '.', 'error');
      if (f.el) f.el.focus();
      return false;
    }
  }
  if (!selectedImageUrl.trim()) {
    showToast('Missing Image', 'Please add a course image (link or upload).', 'error');
    if (uploadMode && uploadMode.classList.contains('hidden') && imageLink) imageLink.focus();
    return false;
  }
  if (Number(coursePrice.value) < 0) {
    showToast('Invalid Price', 'Price cannot be negative.', 'error');
    if (coursePrice) coursePrice.focus();
    return false;
  }
  return true;
}

async function handleLogin(e) {
  e.preventDefault();
  const emailInput = $('loginEmail');
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value : '';
  if (!email || !password) { showToast('Missing Fields', 'Please enter both email and password.', 'error'); return; }
  setBtnLoading(btnLogin, true);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Sign in returned no user.');
    const userEmail = (data.user.email || '').toLowerCase();
    const { data: profile, error: profError } = await supabase.from('user_profiles').select('user_data').eq('id', data.user.id).maybeSingle();
    let role = null;
    if (profile && profile.user_data) {
      role = profile.user_data.role;
    }
    const isAllowedRole = role === 'admin' || role === 'ceo';
    const isAllowedEmail = ADMIN_EMAILS.includes(userEmail);

    if (!isAllowedRole && !isAllowedEmail) {
      await supabase.auth.signOut();
      showToast('Access Denied', 'Your account is not allowed to access this page.', 'error');
      return;
    }
    setSessionFlag();
    if (loginPanel) loginPanel.classList.add('hidden');
    if (mainPanel) mainPanel.classList.remove('hidden');
    if (btnLogout) btnLogout.classList.remove('hidden');
    showToast('Welcome Back', 'Signed in successfully.', 'success');
    loadCourses();
  } catch (err) {
    showToast('Login Failed', friendlyAuthError(err), 'error');
  } finally {
    setBtnLoading(btnLogin, false);
  }
}

async function handleLogout() {
  clearSessionFlag();
  try { await supabase.auth.signOut(); } catch (e) {}
  if (loginPanel) loginPanel.classList.remove('hidden');
  if (mainPanel) mainPanel.classList.add('hidden');
  if (btnLogout) btnLogout.classList.add('hidden');
  showToast('Signed Out', 'You have been logged out.', 'info');
}

async function handleSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;
  const currentId = editingId || generateCourseId();
  const existingRecord = editingId ? listCache.find(c => (c.course_data && c.course_data.id === editingId) || c.id === editingId) : null;
  const existingCreatedAt = existingRecord && existingRecord.course_data ? existingRecord.course_data.created_at : new Date().toISOString();

  const courseData = {
    id: currentId,
    category: category.value,
    course_number: courseNumber.value.trim(),
    course_name: courseName.value.trim(),
    image_url: selectedImageUrl.trim(),
    info_text: courseInfo.value.trim(),
    price: Number(coursePrice.value),
    created_at: existingCreatedAt
  };

  setBtnLoading(btnSubmit, true);
  try {
    if (editingId) {
      const { error } = await supabase.from('courses').update({ course_data: courseData }).eq('id', editingId);
      if (error) throw error;
      showToast('Update Success', 'Course updated successfully.', 'success');
    } else {
      const { error } = await supabase.from('courses').insert({ id: currentId, course_data: courseData });
      if (error) throw error;
      showToast('Post Success', 'Course posted successfully.', 'success');
    }
    resetForm();
    loadCourses();
  } catch (err) {
    if (err.code === '23505') showToast('Duplicate ID', 'This course ID already exists. Please try again.', 'error');
    else showToast('Save Failed', err.message || 'Could not save the course.', 'error');
  } finally {
    setBtnLoading(btnSubmit, false);
  }
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  if (btnConfirmDel) btnConfirmDel.disabled = true;
  try {
    const { error } = await supabase.from('courses').delete().eq('id', deleteTargetId);
    if (error) throw error;
    showToast('Deleted', 'Course removed successfully.', 'success');
    if (editingId === deleteTargetId) resetForm();
    loadCourses();
  } catch (err) {
    showToast('Delete Failed', err.message || 'Could not delete the course.', 'error');
  } finally {
    if (btnConfirmDel) btnConfirmDel.disabled = false;
    closeDeleteModal();
  }
}

async function handleImgurUpload() {
  if (!uploadedFile) { showToast('No File', 'Please choose an image first.', 'info'); return; }
  if (uploadedFile.size > 8 * 1024 * 1024) { showToast('File Too Large', 'Please choose an image smaller than 8MB.', 'error'); return; }
  setBtnLoading(btnUploadImgur, true);
  try {
    if (!base64Image) base64Image = await fileToBase64(uploadedFile);
    const link = await uploadToImgur(base64Image);
    selectedImageUrl = link;
    if (imageLink) imageLink.value = link;
    if (imagePreview) {
      imagePreview.src = link;
      imagePreview.classList.remove('hidden');
    }
    if (previewEmpty) previewEmpty.classList.add('hidden');
    showToast('Upload Success', 'Your image link is ready.', 'success');
  } catch (err) {
    showToast('Upload Failed', err.message || 'Please try again or use a direct link.', 'error');
  } finally {
    setBtnLoading(btnUploadImgur, false);
  }
}

if (togglePass && passInput) {
  togglePass.addEventListener('click', () => {
    const isHidden = passInput.type === 'password';
    passInput.type = isHidden ? 'text' : 'password';
    togglePass.innerHTML = '<i class="fa-solid ' + (isHidden ? 'fa-eye-slash' : 'fa-eye') + '"></i>';
  });
}

if (loginForm) loginForm.addEventListener('submit', handleLogin);
if (btnLogout) btnLogout.addEventListener('click', handleLogout);
if (courseForm) courseForm.addEventListener('submit', handleSubmit);
if (btnReset) btnReset.addEventListener('click', resetForm);
if (btnCancelDel) btnCancelDel.addEventListener('click', closeDeleteModal);
if (btnConfirmDel) btnConfirmDel.addEventListener('click', confirmDelete);
if (confirmModal) confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) closeDeleteModal(); });
if (tabLink) tabLink.addEventListener('click', () => switchImageMode('link'));
if (tabUpload) tabUpload.addEventListener('click', () => switchImageMode('upload'));

if (imageLink) {
  imageLink.addEventListener('input', () => {
    const val = imageLink.value.trim();
    if (val) {
      selectedImageUrl = val;
      if (imagePreview) {
        imagePreview.src = val;
        imagePreview.classList.remove('hidden');
        imagePreview.onerror = () => {
          imagePreview.classList.add('hidden');
          if (previewEmpty) previewEmpty.classList.remove('hidden');
          showToast('Invalid Image', 'That link does not point to a valid image.', 'error');
        };
      }
      if (previewEmpty) previewEmpty.classList.add('hidden');
    } else {
      selectedImageUrl = '';
      if (imagePreview) imagePreview.classList.add('hidden');
      if (previewEmpty) previewEmpty.classList.remove('hidden');
    }
  });
}

if (dropZone && fileInput) {
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Invalid File', 'Please choose an image file.', 'error'); fileInput.value = ''; return; }
    if (file.size > 8 * 1024 * 1024) { showToast('File Too Large', 'Please choose an image smaller than 8MB.', 'error'); fileInput.value = ''; return; }
    uploadedFile = file;
    base64Image = null;
    if (dropText) dropText.innerHTML = '<b>' + escapeHtml(file.name) + '</b><small>' + (file.size / 1024 / 1024).toFixed(2) + ' MB</small>';
    if (btnUploadImgur) btnUploadImgur.classList.remove('disabled');
    const localUrl = URL.createObjectURL(file);
    if (imagePreview) {
      imagePreview.src = localUrl;
      imagePreview.classList.remove('hidden');
    }
    if (previewEmpty) previewEmpty.classList.add('hidden');
  });

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag');
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });
}

if (btnUploadImgur) btnUploadImgur.addEventListener('click', handleImgurUpload);

if (courseList) {
  courseList.addEventListener('click', (e) => {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit') {
      const row = listCache.find((c) => (c.course_data && c.course_data.id === id) || c.id === id);
      if (row) fillForm(row.course_data || {});
    } else if (btn.dataset.action === 'delete') {
      openDeleteModal(id);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  showLoading();
  checkSession();
  document.documentElement.classList.add('ready');
  window.addEventListener('load', () => setTimeout(hideLoading, 500));
});
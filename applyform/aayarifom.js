import { supabase } from './supabase.js';
import { NG } from './ng.js';

const FORM_API = '/api/form';
const SUBMIT_TIMEOUT_MS = 30000;
const UPLOAD_TIMEOUT_MS = 40000;
const IMGUR_CLIENT_ID = '5acf7eff9c91660';
const PAGE_SIZE = 12;
const PICK_LIMIT = 60;
const MAX_IMG_SIDE = 1024;

const PLACEHOLDER_IMG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a8f4e"/><stop offset="1" stop-color="#f5b301"/></linearGradient></defs><rect width="600" height="420" fill="url(#g)"/><circle cx="300" cy="170" r="60" fill="rgba(255,255,255,.22)"/><text x="300" y="290" fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="bold" text-anchor="middle">Free Skills</text></svg>');

const CATEGORIES = {
  '1': 'Technology & Computing',
  '2': 'Vocational & Agricultural Skills',
  '3': 'Health & Community Wellness',
  '4': '2-Year Diploma Program'
};
const CAT_ORDER = ['1', '2', '3', '4'];

const ID_RULES = {
  nin: { label: 'NIN number', placeholder: '11 digits', help: 'Your National Identification Number has 11 digits.', test: (v) => /^\d{11}$/.test(v), msg: 'Your NIN must be exactly 11 digits.' },
  voter: { label: 'Voter card number (VIN)', placeholder: 'Number on your voter card', help: 'Write the Voter Identification Number exactly as it is on your card.', test: (v) => /^[A-Z0-9]{9,22}$/.test(v), msg: 'Please enter the voter card number exactly as written on your card.' }
};

const rowState = {};
const cam = { stream: null, facing: 'user', target: 'face', busy: false };
const media = { face: { data: '', url: '' }, id: { data: '', url: '' } };

let availableConfig = { all: false, keys: new Set() };
let allCourses = [];
let availableCourses = [];
let selectedCourse = null;
let modalCourse = null;
let deadlineMs = 0;
let countdownTimer = null;
let applyOpen = false;
let submitting = false;
let formUid = '';
let toastCount = 0;

const $ = (id) => document.getElementById(id);
const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function norm(str) {
  return String(str == null ? '' : str).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

function compact(str) {
  return norm(str).replace(/\s+/g, '');
}

function newUid() {
  try {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  } catch (_) {}
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += '-';
    else if (i === 14) out += '4';
    else if (i === 19) out += hex[8 + Math.floor(Math.random() * 4)];
    else out += hex[Math.floor(Math.random() * 16)];
  }
  return out;
}

function toast(type, title, message) {
  const wrap = $('toastWrap');
  if (!wrap || toastCount >= 3) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><div><b>' + esc(title) + '</b><p>' + esc(message) + '</p></div>';
  wrap.appendChild(el);
  toastCount++;
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => {
      el.remove();
      toastCount = Math.max(0, toastCount - 1);
    }, 300);
  }, type === 'error' ? 5200 : 3600);
}

function readAvailableConfig() {
  const items = qsa('#availableConfig li').map((li) => li.textContent.trim()).filter(Boolean);
  return { all: items.some((t) => t === '#'), keys: new Set(items.filter((t) => t !== '#').map(compact).filter(Boolean)) };
}

function isAvailable(course) {
  return availableConfig.all || availableConfig.keys.has(compact(course.course_name));
}

function catName(course) {
  return CATEGORIES[String(course.category)] || 'Course';
}

function shortDesc(course, max) {
  const d = String(course.info_text || '').replace(/\s+/g, ' ').trim();
  return d.length > max ? d.slice(0, max).trim() + '...' : d;
}

function cardHtml(c) {
  return '<article class="cc"><div class="cc-img"><img src="' + esc(c.image_url || PLACEHOLDER_IMG) + '" alt="' + esc(c.course_name) + '" loading="lazy" decoding="async"></div>' +
    '<div class="cc-body"><h4>' + esc(c.course_name) + '</h4><p>' + esc(shortDesc(c, 100)) + '</p>' +
    '<div class="acts"><button type="button" class="b-view" data-act="view" data-id="' + esc(c.id) + '"><i class="fa-solid fa-eye"></i> View</button>' +
    '<button type="button" class="b-apply" data-act="apply" data-id="' + esc(c.id) + '"><i class="fa-solid fa-bolt"></i> Apply Free</button></div></div></article>';
}

async function loadCourses() {
  const { data, error } = await supabase.from('courses').select('*');
  if (error) throw error;
  const list = (data || []).map((row) => {
    let cd = row.course_data;
    if (typeof cd === 'string') {
      try { cd = JSON.parse(cd); } catch (e) { cd = null; }
    }
    if (!cd || typeof cd !== 'object') return null;
    return Object.assign({}, cd, { id: cd.id || row.id });
  }).filter((c) => c && c.id && c.course_name);
  list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return list;
}

function appendCards(cat) {
  const st = rowState[cat];
  const row = $('row-' + cat);
  if (!st || !row) return;
  const more = row.querySelector('.cc-more');
  if (more) more.remove();
  const next = st.items.slice(st.shown, st.shown + PAGE_SIZE);
  row.insertAdjacentHTML('beforeend', next.map(cardHtml).join(''));
  st.shown += next.length;
  const left = st.items.length - st.shown;
  if (left > 0) {
    row.insertAdjacentHTML('beforeend', '<button type="button" class="cc-more" data-more="' + cat + '"><i class="fa-solid fa-circle-plus"></i><b>Show more</b><small>' + left + ' more</small></button>');
  }
}

function renderCategories() {
  const groups = { '1': [], '2': [], '3': [], '4': [] };
  availableCourses.forEach((c) => {
    const k = String(c.category || '1');
    if (groups[k]) groups[k].push(c);
  });
  let any = false;
  CAT_ORDER.forEach((k) => {
    const sec = $('ps-' + k);
    const row = $('row-' + k);
    const count = $('count-' + k);
    const items = groups[k];
    if (!sec || !row) return;
    if (!items.length) {
      sec.classList.add('hidden');
      row.innerHTML = '';
      rowState[k] = null;
      return;
    }
    any = true;
    sec.classList.remove('hidden');
    if (count) count.textContent = items.length + (items.length === 1 ? ' course' : ' courses');
    rowState[k] = { items: items, shown: 0 };
    row.innerHTML = '';
    appendCards(k);
  });
  const empty = $('coursesEmpty');
  if (empty) empty.classList.toggle('hidden', any);
}

function showCoursesError() {
  const sk = $('coursesSkeleton');
  const er = $('coursesError');
  if (sk) sk.classList.add('hidden');
  if (er) er.classList.remove('hidden');
  CAT_ORDER.forEach((k) => {
    const sec = $('ps-' + k);
    if (sec) sec.classList.add('hidden');
  });
}

async function initCourses() {
  const sk = $('coursesSkeleton');
  const er = $('coursesError');
  if (sk) sk.classList.remove('hidden');
  if (er) er.classList.add('hidden');
  try {
    allCourses = await loadCourses();
    availableConfig = readAvailableConfig();
    availableCourses = allCourses.filter(isAvailable);
    if (sk) sk.classList.add('hidden');
    renderCategories();
    renderPicker('');
  } catch (err) {
    showCoursesError();
  }
}

function findCourse(id) {
  return allCourses.find((c) => String(c.id) === String(id)) || null;
}

function isClosed() {
  return deadlineMs > 0 && Date.now() >= deadlineMs;
}

function readDeadline() {
  const el = $('siteConfig');
  const t = Date.parse((el && el.dataset.deadline) || '');
  return isFinite(t) ? t : 0;
}

function tickCountdown() {
  const sec = $('dlSection');
  const pill = $('navCount');
  if (!deadlineMs) {
    if (sec) sec.classList.add('hidden');
    if (pill) pill.classList.add('hidden');
    return;
  }
  const left = deadlineMs - Date.now();
  const tiles = $('dlTiles');
  const closed = $('dlClosed');
  if (left <= 0) {
    document.body.classList.add('is-closed');
    if (tiles) tiles.classList.add('hidden');
    if (closed) closed.classList.remove('hidden');
    if (pill) pill.innerHTML = '<i class="fa-solid fa-lock"></i> Closed';
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
    return;
  }
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const set = (id, v) => {
    const el = $(id);
    if (el) el.textContent = v;
  };
  set('dlD', pad(d));
  set('dlH', pad(h));
  set('dlM', pad(m));
  set('dlS', pad(s));
  if (pill) pill.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> ' + (d > 0 ? d + 'd ' + h + 'h left' : h + 'h ' + m + 'm left');
}

function setupCountdown() {
  deadlineMs = readDeadline();
  const dateEl = $('dlDate');
  if (dateEl && deadlineMs) {
    dateEl.textContent = new Date(deadlineMs).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  tickCountdown();
  if (deadlineMs && !isClosed()) {
    countdownTimer = setInterval(() => {
      if (!document.hidden) tickCountdown();
    }, 1000);
  }
}

function quakeThen(origin, done) {
  const rect = origin && origin.getBoundingClientRect ? origin.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  done(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function revealApply(x, y) {
  const ap = $('applyPage');
  if (!ap) return;
  ap.style.setProperty('--x', x + 'px');
  ap.style.setProperty('--y', y + 'px');
  ap.scrollTop = 0;
  ap.classList.add('open');
  document.body.style.overflow = 'hidden';
  applyOpen = true;
  try {
    history.pushState({ apply: 1 }, '', '#apply');
  } catch (_) {}
  updateProgress();
}

function hideApply() {
  const ap = $('applyPage');
  if (ap) ap.classList.remove('open');
  applyOpen = false;
  closeSheet();
  closeCamera();
  document.body.style.overflow = '';
}

function closeApply() {
  if (!applyOpen) return;
  if (history.state && history.state.apply) history.back();
  else hideApply();
}

function openApply(course, origin) {
  if (isClosed()) {
    toast('info', 'Applications Closed', 'Thank you for your interest. Applications are now closed.');
    return;
  }
  if (course) setCourse(course);
  closeModal();
  closeMenu();
  quakeThen(origin, revealApply);
}

function setCourse(course) {
  selectedCourse = course;
  const img = $('courseBtnImg');
  const txt = $('courseBtnText');
  const btn = $('courseBtn');
  if (course) {
    if (img) {
      img.src = course.image_url || PLACEHOLDER_IMG;
      img.classList.remove('hidden');
    }
    if (txt) txt.innerHTML = '<b>' + esc(course.course_name) + '</b><small>' + esc(catName(course)) + ' - tap to change</small>';
    if (btn) btn.classList.add('chosen');
    clearErr('Course');
  } else {
    if (img) img.classList.add('hidden');
    if (txt) txt.innerHTML = '<b>Tap here to choose your course</b><small>Choose the free course you want to learn</small>';
    if (btn) btn.classList.remove('chosen');
  }
  renderPicker(($('pickSearch') || {}).value || '');
  updateProgress();
}

function renderPicker(filter) {
  const list = $('pickList');
  if (!list) return;
  const q = norm(filter);
  const items = availableCourses.filter((c) => !q || norm(c.course_name).indexOf(q) !== -1 || norm(catName(c)).indexOf(q) !== -1).slice(0, PICK_LIMIT);
  if (!availableCourses.length) {
    list.innerHTML = '<div class="pk-empty"><i class="fa-solid fa-hourglass-half"></i>Courses are not available right now. Please check back soon.</div>';
    return;
  }
  if (!items.length) {
    list.innerHTML = '<div class="pk-empty"><i class="fa-solid fa-magnifying-glass-minus"></i>No course found. Try another word.</div>';
    return;
  }
  list.innerHTML = items.map((c) =>
    '<button type="button" class="pk-item' + (selectedCourse && String(selectedCourse.id) === String(c.id) ? ' on' : '') + '" data-pick="' + esc(c.id) + '">' +
      '<img src="' + esc(c.image_url || PLACEHOLDER_IMG) + '" alt="" loading="lazy" decoding="async">' +
      '<div><b>' + esc(c.course_name) + '</b><small>' + esc(catName(c)) + '</small></div>' +
      '<i class="fa-solid fa-circle-check"></i>' +
    '</button>'
  ).join('');
}

function openSheet() {
  const s = $('pickSheet');
  const b = $('pickBackdrop');
  if (s) s.classList.add('open');
  if (b) b.classList.add('open');
  const si = $('pickSearch');
  if (si) si.value = '';
  renderPicker('');
}

function closeSheet() {
  const s = $('pickSheet');
  const b = $('pickBackdrop');
  if (s) s.classList.remove('open');
  if (b) b.classList.remove('open');
}

function openModal(course) {
  const m = $('courseModal');
  if (!m || !course) return;
  modalCourse = course;
  const img = $('cmImg');
  if (img) {
    img.src = course.image_url || PLACEHOLDER_IMG;
    img.alt = course.course_name;
  }
  const set = (id, v) => {
    const el = $(id);
    if (el) el.textContent = v;
  };
  set('cmCat', catName(course));
  set('cmName', course.course_name);
  set('cmInfo', String(course.info_text || 'Learn this skill online with video lessons, an AI teacher and a free professional certificate.'));
  m.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const m = $('courseModal');
  if (m) m.classList.remove('open');
  modalCourse = null;
  if (!applyOpen) document.body.style.overflow = '';
}

function openMenu() {
  const m = $('spanMenu');
  const b = $('spanBackdrop');
  if (m) m.classList.add('open');
  if (b) b.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  const m = $('spanMenu');
  const b = $('spanBackdrop');
  if (m) m.classList.remove('open');
  if (b) b.classList.remove('open');
  if (!applyOpen && !modalCourse) document.body.style.overflow = '';
}

function setErr(key, msg) {
  const e = $('e' + key);
  if (e) {
    e.textContent = msg;
    e.classList.add('show');
  }
  const box = document.querySelector('[data-field="' + key + '"]');
  if (box) box.classList.add('has-err');
}

function clearErr(key) {
  const e = $('e' + key);
  if (e) {
    e.textContent = '';
    e.classList.remove('show');
  }
  const box = document.querySelector('[data-field="' + key + '"]');
  if (box) box.classList.remove('has-err');
}

function clearAllErrors() {
  ['Name', 'Phone', 'Course', 'State', 'Lga', 'Gender', 'Email', 'Face', 'IdType', 'IdNum', 'IdPic'].forEach(clearErr);
  const fe = $('formError');
  if (fe) {
    fe.textContent = '';
    fe.classList.remove('show');
  }
}

function showFormError(msg) {
  const fe = $('formError');
  if (!fe) return;
  fe.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ' + esc(msg);
  fe.classList.add('show');
}

function normalizePhone(v) {
  let d = String(v || '').replace(/[\s\-().]/g, '');
  if (d.charAt(0) === '+') d = d.slice(1);
  if (/^0\d{10}$/.test(d)) d = '234' + d.slice(1);
  else if (/^[789]\d{9}$/.test(d)) d = '234' + d;
  return /^234[789][01]\d{8}$/.test(d) ? d : '';
}

function getGender() {
  if ($('gMale') && $('gMale').checked) return 'male';
  if ($('gFemale') && $('gFemale').checked) return 'female';
  return '';
}

function getIdType() {
  if ($('idNin') && $('idNin').checked) return 'nin';
  if ($('idVin') && $('idVin').checked) return 'voter';
  return '';
}

function getIdNumber() {
  return String(($('fIdNum') || {}).value || '').replace(/\s+/g, '').toUpperCase();
}

function applyIdType() {
  const type = getIdType();
  const input = $('fIdNum');
  const label = $('idNumLabel');
  const help = $('idNumHelp');
  if (!input) return;
  const rule = ID_RULES[type];
  input.disabled = !rule;
  input.value = '';
  input.inputMode = type === 'nin' ? 'numeric' : 'text';
  input.placeholder = rule ? rule.placeholder : 'Choose your card first';
  if (label) label.textContent = rule ? rule.label : 'Card number';
  if (help) help.textContent = rule ? rule.help : 'Choose NIN or Voter\'s card above.';
}

function updateProgress() {
  const bar = $('applyBar');
  if (!bar) return;
  const type = getIdType();
  const checks = [
    String(($('fName') || {}).value || '').trim().split(/\s+/).filter(Boolean).length >= 2,
    Boolean(normalizePhone(($('fPhone') || {}).value)),
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(($('fEmail') || {}).value || '').trim()),
    Boolean(getGender()),
    Boolean(selectedCourse),
    Boolean(($('fState') || {}).value),
    Boolean(($('fLga') || {}).value),
    Boolean(media.face.data),
    Boolean(type && ID_RULES[type].test(getIdNumber())),
    Boolean(media.id.data)
  ];
  bar.style.width = Math.round((checks.filter(Boolean).length / checks.length) * 100) + '%';
}

function fillStates() {
  const sel = $('fState');
  if (!sel) return;
  sel.innerHTML = '<option value="">Choose your state</option>' + Object.keys(NG).map((s) => '<option value="' + esc(s) + '">' + esc(s) + '</option>').join('');
}

function fillLgas(state) {
  const sel = $('fLga');
  if (!sel) return;
  if (!state || !NG[state]) {
    sel.innerHTML = '<option value="">Choose your state first</option>';
    sel.disabled = true;
    return;
  }
  sel.innerHTML = '<option value="">Choose your local government</option>' + NG[state].split('|').map((l) => '<option value="' + esc(l) + '">' + esc(l) + '</option>').join('');
  sel.disabled = false;
}

function showMedia(target) {
  const isFace = target === 'face';
  const cap = $(isFace ? 'faceCap' : 'idCap');
  const img = $(isFace ? 'faceImg' : 'idImg');
  const txt = $(isFace ? 'faceBtnText' : 'idBtnText');
  const data = media[target].data;
  if (img) {
    if (data) {
      img.src = data;
      img.classList.remove('hidden');
    } else {
      img.removeAttribute('src');
      img.classList.add('hidden');
    }
  }
  if (cap) cap.classList.toggle('done', Boolean(data));
  if (txt) {
    if (isFace) txt.textContent = data ? '✔️ Photo taken - take again' : 'Take your photo';
    else txt.textContent = data ? '✔️ Card added - take again' : 'Take photo of card';
  }
}

function setMedia(target, dataUrl) {
  media[target].data = dataUrl;
  media[target].url = '';
  showMedia(target);
  clearErr(target === 'face' ? 'Face' : 'IdPic');
  updateProgress();
}

function clearMedia() {
  media.face = { data: '', url: '' };
  media.id = { data: '', url: '' };
  showMedia('face');
  showMedia('id');
}

function stopStream() {
  if (cam.stream) {
    cam.stream.getTracks().forEach((t) => t.stop());
    cam.stream = null;
  }
  const v = $('camVideo');
  if (v) v.srcObject = null;
}

async function startStream() {
  stopStream();
  const v = $('camVideo');
  if (!v) return;
  const attempts = [
    { video: { facingMode: { exact: cam.facing }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false },
    { video: { facingMode: cam.facing }, audio: false },
    { video: true, audio: false }
  ];
  let lastErr = null;
  for (let i = 0; i < attempts.length; i++) {
    try {
      cam.stream = await navigator.mediaDevices.getUserMedia(attempts[i]);
      break;
    } catch (err) {
      lastErr = err;
      if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) break;
    }
  }
  if (!cam.stream) throw lastErr || new Error('No camera');
  v.srcObject = cam.stream;
  v.classList.toggle('mirror', cam.facing === 'user');
  try {
    await v.play();
  } catch (_) {}
}

function fallbackPick(target) {
  const input = $(target === 'face' ? 'faceFile' : 'idFile');
  if (input) input.click();
}

async function openCamera(target) {
  cam.target = target;
  cam.facing = target === 'face' ? 'user' : 'environment';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) {
    toast('info', 'Camera', 'We will open your phone camera instead.');
    fallbackPick(target);
    return;
  }
  const box = $('camBox');
  const guide = $('camGuide');
  const title = $('camTitle');
  const hint = $('camHint');
  if (guide) guide.className = 'cam-guide ' + (target === 'face' ? 'face' : 'card');
  if (title) title.textContent = target === 'face' ? 'Take your face photo' : 'Take photo of your ID card';
  if (hint) hint.textContent = target === 'face' ? 'Put your face inside the circle' : 'Put the whole card inside the box';
  if (box) box.classList.add('open');
  try {
    await startStream();
  } catch (err) {
    closeCamera();
    const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
    toast('error', denied ? 'Camera is blocked' : 'Camera not found', denied ? 'Allow camera access in your browser settings and try again.' : 'We will open your phone camera instead.');
    if (!denied) fallbackPick(target);
  }
}

function closeCamera() {
  stopStream();
  const box = $('camBox');
  if (box) box.classList.remove('open');
}

async function flipCamera() {
  if (cam.busy) return;
  cam.busy = true;
  cam.facing = cam.facing === 'user' ? 'environment' : 'user';
  try {
    await startStream();
  } catch (err) {
    cam.facing = cam.facing === 'user' ? 'environment' : 'user';
    try {
      await startStream();
    } catch (_) {
      closeCamera();
    }
    toast('error', 'Camera', 'We could not switch the camera.');
  } finally {
    cam.busy = false;
  }
}

function snapshot() {
  const v = $('camVideo');
  if (!v || !v.videoWidth) {
    toast('info', 'Camera', 'Please wait a moment for the camera to be ready.');
    return;
  }
  const scale = Math.min(1, MAX_IMG_SIDE / Math.max(v.videoWidth, v.videoHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(v.videoWidth * scale);
  c.height = Math.round(v.videoHeight * scale);
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  const target = cam.target;
  setMedia(target, c.toDataURL('image/jpeg', 0.85));
  closeCamera();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) {
      reject(new Error('type'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image'));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMG_SIDE / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleFile(target, input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  try {
    setMedia(target, await fileToDataUrl(file));
  } catch (_) {
    toast('error', 'Photo', 'We could not read this photo. Please choose a clear picture.');
  }
}

async function uploadToImgur(base64) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: { Authorization: 'Client-ID ' + IMGUR_CLIENT_ID },
      body: new URLSearchParams({ image: base64, type: 'base64' }),
      signal: ctrl.signal
    });
    const json = await res.json();
    if (!res.ok || !json || !json.success || !json.data || !json.data.link) throw new Error('upload');
    return String(json.data.link).replace(/^http:/, 'https:');
  } finally {
    clearTimeout(timer);
  }
}

async function ensureUploaded(target) {
  const m = media[target];
  if (m.url) return m.url;
  m.url = await uploadToImgur(m.data.split(',')[1]);
  return m.url;
}

function validateForm() {
  clearAllErrors();
  let first = null;
  const bad = (key, el, msg) => {
    setErr(key, msg);
    if (!first) first = el;
  };
  const name = String($('fName').value || '').trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.split(' ').length < 2 || !/^[\p{L}][\p{L}\s.'\-]*$/u.test(name)) {
    bad('Name', $('fName'), 'Please write your first name and last name.');
  }
  if (!normalizePhone($('fPhone').value)) {
    bad('Phone', $('fPhone'), 'Please enter a correct phone number, for example 08012345678.');
  }
  if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test(String($('fEmail').value || '').trim())) {
    bad('Email', $('fEmail'), 'Please enter a correct email address.');
  }
  if (!getGender()) {
    bad('Gender', $('gMale'), 'Please choose male or female.');
  }
  if (!selectedCourse) {
    bad('Course', $('courseBtn'), 'Please choose the course you want to learn.');
  }
  if (!$('fState').value) {
    bad('State', $('fState'), 'Please choose your state.');
  }
  if (!$('fLga').value) {
    bad('Lga', $('fLga'), 'Please choose your local government.');
  }
  if (!media.face.data) {
    bad('Face', $('faceBtn'), 'Please take your face photo.');
  }
  const type = getIdType();
  if (!type) {
    bad('IdType', $('idNin'), 'Please choose NIN or Voter\'s card.');
  } else if (!ID_RULES[type].test(getIdNumber())) {
    bad('IdNum', $('fIdNum'), ID_RULES[type].msg);
  }
  if (!media.id.data) {
    bad('IdPic', $('idBtn'), 'Please take a photo of your ID card or upload it.');
  }
  if (first) {
    try {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (first.focus) first.focus({ preventScroll: true });
    } catch (_) {}
    return false;
  }
  return true;
}

function setSubmitting(on, text) {
  submitting = on;
  const btn = $('submitBtn');
  if (!btn) return;
  btn.disabled = on;
  btn.innerHTML = on
    ? '<span class="spin"></span> ' + esc(text || 'Sending your application...')
    : '<i class="fa-solid fa-paper-plane"></i> Apply Now - It is Free';
}

function showDone(firstName) {
  const dn = $('doneName');
  if (dn) dn.textContent = firstName;
  $('applyForm').classList.add('hidden');
  $('applyIntro').classList.add('hidden');
  $('applyDone').classList.remove('hidden');
  $('applyBar').style.width = '100%';
  $('applyPage').scrollTop = 0;
}

function resetForm() {
  const form = $('applyForm');
  if (form) form.reset();
  fillLgas('');
  applyIdType();
  setCourse(null);
  clearMedia();
  clearAllErrors();
  formUid = newUid();
  form.classList.remove('hidden');
  $('applyIntro').classList.remove('hidden');
  $('applyDone').classList.add('hidden');
  $('applyBar').style.width = '0%';
  $('applyPage').scrollTop = 0;
  updateProgress();
}

async function submitForm(e) {
  e.preventDefault();
  if (submitting) return;
  if (isClosed()) {
    showFormError('Applications are now closed. Thank you for your interest.');
    return;
  }
  if (!validateForm()) return;
  const fullName = $('fName').value.trim().replace(/\s+/g, ' ');
  setSubmitting(true, 'Uploading your photos...');
  let faceUrl = '';
  let idUrl = '';
  try {
    faceUrl = await ensureUploaded('face');
    idUrl = await ensureUploaded('id');
  } catch (err) {
    setSubmitting(false);
    showFormError(err && err.name === 'AbortError'
      ? 'Photo upload took too long. Please check your network and try again.'
      : 'We could not upload your photos. Please check your network and try again.');
    return;
  }
  setSubmitting(true, 'Sending your application...');
  const payload = {
    uid: formUid,
    full_name: fullName,
    phone: $('fPhone').value.trim(),
    email: $('fEmail').value.trim(),
    country: 'Nigeria',
    state: $('fState').value,
    lga: $('fLga').value,
    gender: getGender(),
    course_id: String(selectedCourse.id),
    course_name: selectedCourse.course_name,
    course_number: String(selectedCourse.course_number || ''),
    course_price: Number(selectedCourse.price || 0),
    id_type: getIdType(),
    id_number: getIdNumber(),
    face_url: faceUrl,
    id_url: idUrl,
    website: $('fWeb').value
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SUBMIT_TIMEOUT_MS);
  try {
    const res = await fetch(FORM_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok || !data || data.success !== true) {
      const msg = (data && data.error) || 'We could not send your application. Please try again.';
      const map = { full_name: 'Name', phone: 'Phone', email: 'Email', course: 'Course', state: 'State', lga: 'Lga', gender: 'Gender', face: 'Face', id_type: 'IdType', id_number: 'IdNum', id_image: 'IdPic' };
      const ids = { Name: 'fName', Phone: 'fPhone', Email: 'fEmail', Course: 'courseBtn', State: 'fState', Lga: 'fLga', Gender: 'gMale', Face: 'faceBtn', IdType: 'idNin', IdNum: 'fIdNum', IdPic: 'idBtn' };
      if (data && data.field && map[data.field]) {
        setErr(map[data.field], msg);
        const el = $(ids[map[data.field]]);
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      showFormError(msg);
      return;
    }
    showDone(fullName.split(' ')[0]);
  } catch (err) {
    showFormError(err && err.name === 'AbortError'
      ? 'The request took too long. Please check your network and try again.'
      : 'We could not reach the server. Please check your network and try again.');
  } finally {
    clearTimeout(timer);
    setSubmitting(false);
  }
}

function setupScroll() {
  const topbar = $('topbar');
  const prog = $('pageProgress');
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY || 0;
    if (topbar) topbar.classList.toggle('scrolled', y > 24);
    if (prog) {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      prog.style.transform = 'scaleX(' + Math.min(1, y / max) + ')';
    }
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

function bindEvents() {
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && !t.dataset.fb && t.id !== 'faceImg' && t.id !== 'idImg') {
      t.dataset.fb = '1';
      t.src = PLACEHOLDER_IMG;
    }
  }, true);

  document.addEventListener('click', (e) => {
    const more = e.target.closest('[data-more]');
    if (more) {
      appendCards(more.dataset.more);
      return;
    }
    const scroll = e.target.closest('.scroll-btn');
    if (scroll) {
      const row = $(scroll.dataset.target);
      if (row) row.scrollBy({ left: Number(scroll.dataset.scroll || 1) * 320, behavior: 'smooth' });
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act) {
      const course = findCourse(act.dataset.id);
      if (!course) return;
      if (act.dataset.act === 'view') openModal(course);
      else openApply(course, act);
      return;
    }
    const plain = e.target.closest('[data-apply]');
    if (plain) openApply(null, plain);
  });

  const on = (id, ev, fn) => {
    const el = $(id);
    if (el) el.addEventListener(ev, fn);
  };

  on('burgerBtn', 'click', openMenu);
  on('spanClose', 'click', closeMenu);
  on('spanBackdrop', 'click', closeMenu);
  on('cmClose', 'click', closeModal);
  on('courseModal', 'click', (e) => {
    if (e.target === $('courseModal')) closeModal();
  });
  on('cmApply', 'click', (e) => {
    if (modalCourse) openApply(modalCourse, e.currentTarget);
  });
  on('applyBack', 'click', closeApply);
  on('doneBack', 'click', closeApply);
  on('doneAnother', 'click', resetForm);
  on('coursesRetry', 'click', initCourses);
  on('courseBtn', 'click', openSheet);
  on('pickClose', 'click', closeSheet);
  on('pickBackdrop', 'click', closeSheet);
  on('pickSearch', 'input', (e) => renderPicker(e.target.value));
  on('pickList', 'click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    const course = findCourse(b.dataset.pick);
    if (course) setCourse(course);
    closeSheet();
  });
  on('fState', 'change', (e) => {
    fillLgas(e.target.value);
    clearErr('State');
    clearErr('Lga');
    updateProgress();
  });
  on('faceBtn', 'click', () => openCamera('face'));
  on('idBtn', 'click', () => openCamera('id'));
  on('idUploadBtn', 'click', () => fallbackPick('id'));
  on('faceFile', 'change', (e) => handleFile('face', e.target));
  on('idFile', 'change', (e) => handleFile('id', e.target));
  on('camClose', 'click', closeCamera);
  on('camShot', 'click', snapshot);
  on('camFlip', 'click', flipCamera);
  on('idNin', 'change', () => {
    applyIdType();
    clearErr('IdType');
    clearErr('IdNum');
    updateProgress();
  });
  on('idVin', 'change', () => {
    applyIdType();
    clearErr('IdType');
    clearErr('IdNum');
    updateProgress();
  });
  on('applyForm', 'submit', submitForm);
  on('applyForm', 'input', (e) => {
    const map = { fName: 'Name', fPhone: 'Phone', fEmail: 'Email', fLga: 'Lga', fIdNum: 'IdNum' };
    if (e.target && map[e.target.id]) clearErr(map[e.target.id]);
    if (e.target && e.target.name === 'gender') clearErr('Gender');
    updateProgress();
  });

  window.addEventListener('popstate', () => {
    if (applyOpen) hideApply();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) closeCamera();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const sheet = $('pickSheet');
    const camBox = $('camBox');
    if (camBox && camBox.classList.contains('open')) closeCamera();
    else if (sheet && sheet.classList.contains('open')) closeSheet();
    else if (modalCourse) closeModal();
    else if (applyOpen) closeApply();
    else closeMenu();
  });
}

function init() {
  formUid = newUid();
  fillStates();
  fillLgas('');
  applyIdType();
  setCourse(null);
  setupCountdown();
  setupScroll();
  bindEvents();
  initCourses();
  if (location.hash === '#apply') {
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch (_) {}
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

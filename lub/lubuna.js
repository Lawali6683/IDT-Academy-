const FORM_API = '/api/form';
const SITE_ID = 'GOV';
const IMGUR_API = 'https://api.imgur.com/3/image';
const IMGUR_CLIENT = 'Client-ID 5acf7eff9c91660';
const SUBMIT_TIMEOUT_MS = 25000;
const UPLOAD_TIMEOUT_MS = 45000;
const IMAGE_MAX_SIDE = 1400;
const IMAGE_QUALITY = 0.85;
const PAGE_SIZE = 9;

const PHOTOS = [
  'https://i.imgur.com/QJIgo5M.png',
  'https://i.imgur.com/yAR3fUj.png',
  'https://i.imgur.com/SLS532O.jpeg',
  'https://i.imgur.com/n4eYqVq.jpeg',
  'https://i.imgur.com/XQMFYC2.jpeg',
  'https://i.imgur.com/XLHqnEY.jpeg',
  'https://i.imgur.com/QGkZQfb.jpeg',
  'https://i.imgur.com/ZUyCwpo.jpeg',
  'https://i.imgur.com/Sp0R0tU.jpeg',
  'https://i.imgur.com/VRV2Oqg.jpeg',
  'https://i.imgur.com/2HY0Kpg.jpeg',
  'https://i.imgur.com/zMoBJY9.jpeg',
].map((u) => u.replace(/(\/[A-Za-z0-9]{7})(\.jpe?g)$/i, '$1h$2'));

const PLACEHOLDER_IMG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b0f57"/><stop offset="1" stop-color="#f2c46d"/></linearGradient></defs><rect width="600" height="380" fill="url(#g)"/><text x="300" y="200" fill="#fff" font-family="Arial" font-size="30" font-weight="bold" text-anchor="middle">Free Skills</text></svg>');

const CATEGORIES = {
  '1': 'Technology & Computing',
  '2': 'Vocational & Agricultural Skills',
  '3': 'Health & Community Wellness',
  '4': '2-Year Diploma Program'
};

const ID_TYPES = {
  nin: { field: 'NIN number', placeholder: '11-digit NIN', maxlength: 11, mode: 'numeric', test: /^\d{11}$/, error: 'Your NIN must be exactly 11 numbers.' },
  voter: { field: 'Voter card number', placeholder: 'Voter card number', maxlength: 22, mode: 'text', test: /^[A-Za-z0-9]{9,22}$/, error: 'Enter your voter card number using letters and numbers only.' }
};

const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT - Abuja','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];

const media = {
  face: { url: '', busy: false, seq: 0, local: '' },
  id: { url: '', busy: false, seq: 0, local: '' }
};

let allCourses = [];
let activeCat = 'all';
let shown = 0;
let selectedCourse = null;
let modalCourse = null;
let deadlineMs = 0;
let submitting = false;
let formUid = '';
let lbIndex = 0;
let ci = 0;
let camStream = null;
let camFacing = 'user';
let camTarget = '';
let camBusy = false;
let galTimer = null;
let formOpen = false;
let toastCount = 0;

const $ = (id) => document.getElementById(id);
const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function pad2(n) {
  return String(n).padStart(2, '0');
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

function toast(type, message) {
  const wrap = $('toasts');
  if (!wrap || toastCount >= 3) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = message;
  wrap.appendChild(el);
  toastCount++;
  setTimeout(() => {
    el.remove();
    toastCount = Math.max(0, toastCount - 1);
  }, 4200);
}

function catName(c) {
  return CATEGORIES[String(c.category)] || 'Course';
}

function shortDesc(c, max) {
  const d = String(c.info_text || '').replace(/\s+/g, ' ').trim();
  return d.length > max ? d.slice(0, max).trim() + '...' : d;
}

async function loadCourses() {
  const mod = await import('./supabase.js');
  const supabase = mod.supabase || mod.default;
  if (!supabase) throw new Error('supabase');
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

function filtered() {
  return activeCat === 'all' ? allCourses : allCourses.filter((c) => String(c.category || '1') === activeCat);
}

function cardHtml(c) {
  return '<article class="card"><div class="im"><img src="' + esc(c.image_url || PLACEHOLDER_IMG) + '" alt="' + esc(c.course_name) + '" decoding="async"></div>' +
    '<div class="tx"><small>' + esc(catName(c)) + '</small><h3>' + esc(c.course_name) + '</h3><p>' + esc(shortDesc(c, 140)) + '</p>' +
    '<div class="acts"><button type="button" data-act="view" data-id="' + esc(c.id) + '">View</button><button type="button" class="go" data-act="apply" data-id="' + esc(c.id) + '">Apply free</button></div></div></article>';
}

function renderGrid(reset) {
  const items = filtered();
  if (reset) ci = 0;
  const box = $('grid');
  if (!items.length) {
    box.innerHTML = '';
    $('cnav').classList.add('hidden');
    $('cEmpty').classList.remove('hidden');
    return;
  }
  $('cEmpty').classList.add('hidden');
  $('cnav').classList.remove('hidden');
  ci = (ci + items.length) % items.length;
  box.innerHTML = cardHtml(items[ci]);
  $('cCount').textContent = (ci + 1) + ' / ' + items.length;
}

function stepCourse(d) {
  ci += d;
  renderGrid(false);
}

function renderPills() {
  const used = Array.from(new Set(allCourses.map((c) => String(c.category || '1'))));
  const html = ['<button type="button" class="on" data-cat="all">All</button>'].concat(
    Object.keys(CATEGORIES).filter((k) => used.indexOf(k) !== -1).map((k) => '<button type="button" data-cat="' + k + '">' + esc(CATEGORIES[k]) + '</button>')
  );
  $('pills').innerHTML = html.join('');
}

function fillCourseSelect() {
  $('fCourse').innerHTML = '<option value="">Choose your course</option>' + allCourses.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.course_name) + '</option>').join('');
  if (selectedCourse) $('fCourse').value = String(selectedCourse.id);
}

async function initCourses() {
  $('skel').classList.remove('hidden');
  $('cErr').classList.add('hidden');
  try {
    allCourses = await loadCourses();
    $('skel').classList.add('hidden');
    renderPills();
    renderGrid(true);
    fillCourseSelect();
  } catch (err) {
    $('skel').classList.add('hidden');
    $('cErr').classList.remove('hidden');
  }
}

function findCourse(id) {
  return allCourses.find((c) => String(c.id) === String(id)) || null;
}

function setupGallery() {
  const stage = $('stage');
  const dots = $('dots');
  if (stage) {
    stage.innerHTML = PHOTOS.map((u, i) => '<div class="sl' + (i === 0 ? ' on' : '') + '"><img src="' + u + '" alt="Gallery picture ' + (i + 1) + '"' + (i === 0 ? '' : ' loading="lazy"') + ' decoding="async"></div>').join('');
    dots.innerHTML = PHOTOS.map((_, i) => '<button type="button" data-g="' + i + '" aria-label="Picture ' + (i + 1) + '"' + (i === 0 ? ' class="on"' : '') + '></button>').join('');
    const slides = qsa('.sl', stage);
    const ds = qsa('button', dots);
    const go = (n) => {
      const next = (n + slides.length) % slides.length;
      if (next === lbIndex) return;
      slides.forEach((x) => x.classList.remove('prev'));
      slides[lbIndex].classList.remove('on');
      slides[lbIndex].classList.add('prev');
      slides[next].classList.add('on');
      ds.forEach((d, i) => d.classList.toggle('on', i === next));
      lbIndex = next;
    };
    const arm = () => {
      clearInterval(galTimer);
      galTimer = setInterval(() => { if (!document.hidden) go(lbIndex + 1); }, 4800);
    };
    stage.addEventListener('click', () => { go(lbIndex + 1); arm(); });
    ds.forEach((d, i) => d.addEventListener('click', () => { go(i); arm(); }));
    let x0 = null;
    stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const d = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(d) > 40) { go(lbIndex + (d < 0 ? 1 : -1)); arm(); }
    }, { passive: true });
    arm();
    if (window.SG) window.SG.warm(PHOTOS.slice(1));
  }
  setupReveal();
}

function setupReveal() {}

function openModal(c) {
  modalCourse = c;
  $('cmImg').src = c.image_url || PLACEHOLDER_IMG;
  $('cmImg').alt = c.course_name;
  $('cmName').textContent = c.course_name;
  $('cmInfo').textContent = String(c.info_text || 'Learn this skill online with video lessons and a free certificate.');
  $('cm').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $('cm').classList.remove('open');
  modalCourse = null;
  if (!formOpen) document.body.style.overflow = '';
}

function isClosed() {
  return deadlineMs > 0 && Date.now() >= deadlineMs;
}

function tickCountdown() {
  const left = deadlineMs - Date.now();
  if (left <= 0) {
    $('timer').classList.add('hidden');
    $('closedMsg').classList.remove('hidden');
    return false;
  }
  $('dD').textContent = pad2(Math.floor(left / 86400000));
  $('dH').textContent = pad2(Math.floor((left % 86400000) / 3600000));
  $('dM').textContent = pad2(Math.floor((left % 3600000) / 60000));
  $('dS').textContent = pad2(Math.floor((left % 60000) / 1000));
  return true;
}

function setupCountdown() {
  const el = $('siteConfig');
  const t = Date.parse((el && el.dataset.deadline) || '');
  deadlineMs = isFinite(t) ? t : 0;
  if (!deadlineMs) {
    $('timer').classList.add('hidden');
    return;
  }
  if (!tickCountdown()) return;
  const id = setInterval(() => {
    if (document.hidden) return;
    if (!tickCountdown()) clearInterval(id);
  }, 1000);
}

function openForm(course) {
  if (isClosed()) {
    toast('error', 'Applications are now closed. Thank you.');
    return;
  }
  if (course) setCourse(course);
  closeModal();
  $('formPage').scrollTop = 0;
  $('formPage').classList.add('open');
  document.body.style.overflow = 'hidden';
  formOpen = true;
  try { history.pushState({ apply: 1 }, '', '#apply'); } catch (_) {}
  updateProgress();
}

function hideForm() {
  closeCam();
  $('formPage').classList.remove('open');
  formOpen = false;
  document.body.style.overflow = '';
}

function closeForm() {
  if (!formOpen) return;
  if (history.state && history.state.apply) history.back();
  else hideForm();
}

function setCourse(c) {
  selectedCourse = c;
  $('fCourse').value = c ? String(c.id) : '';
  clearErr('Course');
  updateProgress();
}

function fieldBox(key) {
  const e = $('e' + key);
  return e ? e.closest('.f') : null;
}

function setErr(key, msg) {
  const e = $('e' + key);
  if (e) {
    e.textContent = msg;
    e.classList.add('show');
  }
  const b = fieldBox(key);
  if (b) b.classList.add('bad');
}

function clearErr(key) {
  const e = $('e' + key);
  if (e) {
    e.textContent = '';
    e.classList.remove('show');
  }
  const b = fieldBox(key);
  if (b) b.classList.remove('bad');
}

const ERR_KEYS = ['Name', 'Phone', 'Email', 'Course', 'State', 'Lga', 'Gender', 'Face', 'IdType', 'IdNum', 'IdImg'];

function clearAllErrors() {
  ERR_KEYS.forEach(clearErr);
  const fe = $('formErr');
  fe.textContent = '';
  fe.classList.remove('show');
}

function showFormError(msg) {
  const fe = $('formErr');
  fe.textContent = msg;
  fe.classList.add('show');
}

function normalizePhone(v) {
  let d = String(v || '').replace(/[\s\-().]/g, '');
  if (d.charAt(0) === '+') d = d.slice(1);
  if (/^0\d{10}$/.test(d)) d = '234' + d.slice(1);
  else if (/^[789]\d{9}$/.test(d)) d = '234' + d;
  return /^234[789][01]\d{8}$/.test(d) ? d : '';
}

function getRadio(name) {
  const r = document.querySelector('input[name="' + name + '"]:checked');
  return r ? r.value : '';
}

function cleanIdNumber(type, value) {
  const v = String(value || '').replace(/[\s\-]/g, '');
  return type === 'voter' ? v.toUpperCase() : v;
}

function idNumberValid() {
  const type = getRadio('idtype');
  if (!type) return false;
  return ID_TYPES[type].test.test(cleanIdNumber(type, $('fIdNum').value));
}

function updateProgress() {
  const checks = [
    $('fName').value.trim().split(/\s+/).filter(Boolean).length >= 2,
    Boolean(normalizePhone($('fPhone').value)),
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($('fEmail').value.trim()),
    Boolean(selectedCourse),
    Boolean($('fState').value),
    Boolean($('fLga').value.trim()),
    Boolean(getRadio('gender')),
    Boolean(media.face.url),
    idNumberValid(),
    Boolean(media.id.url)
  ];
  $('bar').style.width = Math.round((checks.filter(Boolean).length / checks.length) * 100) + '%';
}

function updateIdUi() {
  const type = getRadio('idtype');
  const input = $('fIdNum');
  if (!type) {
    input.placeholder = 'Choose ID type first';
    return;
  }
  const cfg = ID_TYPES[type];
  input.placeholder = cfg.placeholder;
  input.maxLength = cfg.maxlength;
  input.inputMode = cfg.mode;
  const cleaned = cleanIdNumber(type, input.value).slice(0, cfg.maxlength);
  if (cleaned !== input.value) input.value = cleaned;
}

function paintMedia(kind) {
  const m = media[kind];
  const prev = $(kind + 'Prev');
  const box = $(kind + 'Box');
  const load = $(kind + 'Load');
  const has = Boolean(m.local);
  if (has) prev.src = m.local;
  prev.classList.toggle('hidden', !has);
  load.classList.toggle('hidden', !m.busy);
  box.classList.toggle('done', Boolean(m.url) && !m.busy);
  const ids = kind === 'face' ? ['faceBtn'] : ['idCam'];
  ids.forEach((id) => { $(id).disabled = m.busy; });
}

function resetMedia() {
  ['face', 'id'].forEach((k) => {
    media[k].url = '';
    media[k].busy = false;
    media[k].local = '';
    media[k].seq++;
    paintMedia(k);
  });
}

async function uploadToImgur(base64) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(IMGUR_API, {
      method: 'POST',
      headers: { Authorization: IMGUR_CLIENT },
      body: new URLSearchParams({ image: base64, type: 'base64' }),
      signal: ctrl.signal
    });
    let json = null;
    try { json = await res.json(); } catch (_) { json = null; }
    if (!res.ok || !json || !json.success || !json.data || !json.data.link) throw new Error('upload');
    return String(json.data.link).replace(/^http:\/\//i, 'https://');
  } finally {
    clearTimeout(timer);
  }
}

function fileToJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const w0 = img.naturalWidth || img.width;
        const h0 = img.naturalHeight || img.height;
        const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * scale));
        const h = Math.max(1, Math.round(h0 * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    img.src = url;
  });
}

async function processImage(kind, dataUrl) {
  const m = media[kind];
  const seq = ++m.seq;
  m.local = dataUrl;
  m.url = '';
  m.busy = true;
  clearErr(kind === 'face' ? 'Face' : 'IdImg');
  paintMedia(kind);
  updateProgress();
  try {
    const link = await uploadToImgur(dataUrl.split(',')[1] || '');
    if (seq !== m.seq) return;
    m.url = link;
    m.busy = false;
  } catch (err) {
    if (seq !== m.seq) return;
    m.url = '';
    m.local = '';
    m.busy = false;
    toast('error', 'Photo upload failed. Check your network and try again.');
  }
  paintMedia(kind);
  updateProgress();
}

async function handleFile(kind, file) {
  if (!file) return;
  if (!/^image\//i.test(file.type || 'image/jpeg')) {
    toast('error', 'Please choose a photo.');
    return;
  }
  try {
    processImage(kind, await fileToJpeg(file));
  } catch (err) {
    toast('error', 'We could not read this photo. Try another one.');
  }
}

function stopStream() {
  if (camStream) {
    camStream.getTracks().forEach((t) => {
      try { t.stop(); } catch (_) {}
    });
  }
  camStream = null;
  const v = $('camVideo');
  if (v) {
    try { v.pause(); } catch (_) {}
    v.srcObject = null;
  }
}

function setCamError(msg) {
  const box = $('camErr');
  box.textContent = msg || '';
  box.classList.toggle('hidden', !msg);
  $('camShot').disabled = Boolean(msg);
}

async function startCam() {
  if (camBusy) return;
  camBusy = true;
  stopStream();
  setCamError('');
  try {
    const tries = [
      { video: { facingMode: { ideal: camFacing }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false },
      { video: true, audio: false }
    ];
    let stream = null;
    let last = null;
    for (let i = 0; i < tries.length && !stream; i++) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(tries[i]);
      } catch (err) {
        last = err;
        if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) break;
      }
    }
    if (!stream) throw last || new Error('camera');
    if (!$('camModal').classList.contains('open')) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    camStream = stream;
    const v = $('camVideo');
    v.srcObject = stream;
    v.classList.toggle('mirror', camFacing === 'user');
    await v.play().catch(() => {});
  } catch (err) {
    const n = err && err.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') setCamError('Camera is blocked. Allow camera access in your browser settings and try again.');
    else if (n === 'NotFoundError' || n === 'OverconstrainedError') setCamError('No camera was found on this device.');
    else setCamError('We could not open the camera. Close other apps that use the camera and try again.');
  } finally {
    camBusy = false;
  }
}

function openCam(target) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('error', 'This browser cannot open the camera. Open the page in Chrome or Safari over https.');
    return;
  }
  camTarget = target;
  camFacing = target === 'face' ? 'user' : 'environment';
  $('camGuide').className = 'cam-guide ' + (target === 'face' ? 'face' : 'card');
  $('camTitle').textContent = target === 'face' ? 'Take your face photo' : 'Take a photo of your ID';
  $('camHint').textContent = target === 'face' ? 'Put your face inside the circle and look straight at the camera.' : 'Put your ID flat inside the box. Make all words clear.';
  $('camModal').classList.add('open');
  startCam();
}

function closeCam() {
  $('camModal').classList.remove('open');
  stopStream();
  setCamError('');
  camTarget = '';
}

function takeShot() {
  const v = $('camVideo');
  if (!v.videoWidth || !camStream) return;
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
  const w = Math.max(1, Math.round(v.videoWidth * scale));
  const h = Math.max(1, Math.round(v.videoHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  let dataUrl = '';
  try {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(v, 0, 0, w, h);
    dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
  } catch (err) {
    toast('error', 'We could not take the photo. Please try again.');
    return;
  }
  const target = camTarget;
  closeCam();
  if (target) processImage(target, dataUrl);
}

function validateForm() {
  clearAllErrors();
  let first = null;
  const bad = (key, el, msg) => {
    setErr(key, msg);
    if (!first) first = el;
  };
  const name = $('fName').value.trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.split(' ').length < 2 || !/^[\p{L}][\p{L}\s.'\-]*$/u.test(name)) bad('Name', $('fName'), 'Write your first name and last name.');
  if (!normalizePhone($('fPhone').value)) bad('Phone', $('fPhone'), 'Enter a correct phone number, for example 08012345678.');
  if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test($('fEmail').value.trim())) bad('Email', $('fEmail'), 'Enter a correct email address.');
  if (!selectedCourse) bad('Course', $('fCourse'), 'Choose the course you want to learn.');
  if (!$('fState').value) bad('State', $('fState'), 'Choose your state.');
  if (!$('fLga').value.trim()) bad('Lga', $('fLga'), 'Write your local government.');
  if (!getRadio('gender')) bad('Gender', document.querySelector('input[name="gender"]'), 'Choose male or female.');
  if (media.face.busy) bad('Face', $('faceBtn'), 'Your face photo is still uploading. Please wait.');
  else if (!media.face.url) bad('Face', $('faceBtn'), 'Take your face photo.');
  const type = getRadio('idtype');
  if (!type) {
    bad('IdType', document.querySelector('input[name="idtype"]'), 'Choose NIN or Voter card.');
  } else {
    if (!idNumberValid()) bad('IdNum', $('fIdNum'), ID_TYPES[type].error);
    if (media.id.busy) bad('IdImg', $('idCam'), 'Your ID photo is still uploading. Please wait.');
    else if (!media.id.url) bad('IdImg', $('idCam'), 'Take or upload a photo of your ID card.');
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

function setSubmitting(on) {
  submitting = on;
  const b = $('submitBtn');
  b.disabled = on;
  b.textContent = on ? 'Sending your application...' : 'Apply now';
}

function showDone(firstName) {
  $('doneName').textContent = firstName;
  $('applyForm').classList.add('hidden');
  $('done').classList.remove('hidden');
  $('bar').style.width = '100%';
  $('formPage').scrollTop = 0;
}

function resetForm() {
  $('applyForm').reset();
  setCourse(null);
  resetMedia();
  updateIdUi();
  clearAllErrors();
  formUid = newUid();
  $('applyForm').classList.remove('hidden');
  $('done').classList.add('hidden');
  $('bar').style.width = '0%';
  $('formPage').scrollTop = 0;
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
  const idType = getRadio('idtype');
  const payload = {
    site_id: SITE_ID,
    uid: formUid,
    full_name: fullName,
    phone: $('fPhone').value.trim(),
    email: $('fEmail').value.trim(),
    country: 'Nigeria',
    state: $('fState').value,
    lga: $('fLga').value.trim(),
    gender: getRadio('gender'),
    id_type: idType,
    id_number: cleanIdNumber(idType, $('fIdNum').value),
    face_url: media.face.url,
    id_url: media.id.url,
    course_id: String(selectedCourse.id),
    course_name: selectedCourse.course_name,
    course_number: String(selectedCourse.course_number || ''),
    course_price: Number(selectedCourse.price || 0),
    website: $('fWeb').value
  };
  setSubmitting(true);
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
    try { data = await res.json(); } catch (_) { data = null; }
    if (!res.ok || !data || data.success !== true) {
      const msg = (data && data.error) || 'We could not send your application. Please try again.';
      const map = { full_name: 'Name', phone: 'Phone', email: 'Email', course: 'Course', state: 'State', lga: 'Lga', gender: 'Gender', face: 'Face', face_url: 'Face', id_type: 'IdType', id_number: 'IdNum', id_image: 'IdImg', id_url: 'IdImg' };
      if (data && data.field && map[data.field]) setErr(map[data.field], msg);
      showFormError(msg);
      return;
    }
    showDone(fullName.split(' ')[0]);
  } catch (err) {
    showFormError(err && err.name === 'AbortError'
      ? 'The request took too long. Check your network and try again.'
      : 'We could not reach the server. Check your network and try again.');
  } finally {
    clearTimeout(timer);
    setSubmitting(false);
  }
}

function bindEvents() {
  document.addEventListener('click', (e) => {
    const cat = e.target.closest('[data-cat]');
    if (cat) {
      activeCat = cat.dataset.cat;
      qsa('#pills button').forEach((b) => b.classList.toggle('on', b === cat));
      renderGrid(true);
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act) {
      const c = findCourse(act.dataset.id);
      if (!c) return;
      if (act.dataset.act === 'view') openModal(c);
      else openForm(c);
      return;
    }
    if (e.target.closest('[data-apply]')) {
      openForm(null);
      return;
    }
  });

  const on = (id, ev, fn) => {
    const el = $(id);
    if (el) el.addEventListener(ev, fn);
  };

  on('cmX', 'click', closeModal);
  on('cm', 'click', (e) => { if (e.target === $('cm')) closeModal(); });
  on('cmApply', 'click', () => { if (modalCourse) openForm(modalCourse); });
  on('cPrev', 'click', () => stepCourse(-1));
  on('cNext', 'click', () => stepCourse(1));
  on('retry', 'click', initCourses);
  on('fBack', 'click', closeForm);
  on('doneHome', 'click', closeForm);
  on('doneMore', 'click', resetForm);
  on('fCourse', 'change', (e) => setCourse(findCourse(e.target.value)));
  on('applyForm', 'submit', submitForm);
  on('applyForm', 'input', (e) => {
    const map = { fName: 'Name', fPhone: 'Phone', fEmail: 'Email', fLga: 'Lga', fIdNum: 'IdNum', fState: 'State' };
    if (e.target && map[e.target.id]) clearErr(map[e.target.id]);
    if (e.target && e.target.name === 'gender') clearErr('Gender');
    if (e.target && e.target.id === 'fIdNum') {
      const type = getRadio('idtype');
      if (type) {
        const cleaned = cleanIdNumber(type, e.target.value);
        if (cleaned !== e.target.value) e.target.value = cleaned;
      }
    }
    updateProgress();
  });
  qsa('input[name="idtype"]').forEach((r) => r.addEventListener('change', () => {
    clearErr('IdType');
    clearErr('IdNum');
    updateIdUi();
    updateProgress();
  }));
  on('faceBtn', 'click', () => openCam('face'));
  on('idCam', 'click', () => openCam('id'));
  on('camClose', 'click', closeCam);
  on('camShot', 'click', takeShot);
  on('camSwitch', 'click', () => {
    camFacing = camFacing === 'user' ? 'environment' : 'user';
    startCam();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopStream();
    else if ($('camModal').classList.contains('open')) startCam();
  });
  window.addEventListener('popstate', () => { if (formOpen) hideForm(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('camModal').classList.contains('open')) closeCam();
    else if (modalCourse) closeModal();
    else if (formOpen) closeForm();
  });
}

function setupLove() {
  const btn = $('sendLove');
  const box = $('hearts');
  if (!btn || !box) return;
  const glyphs = ['\u2764', '\u273F', '\u2665', '\u2740'];
  const cols = ['#e11d74', '#ffb089', '#ffd166', '#ffffff'];
  let n = 0;
  btn.addEventListener('click', () => {
    n++;
    $('loveCnt').textContent = String(n);
    for (let i = 0; i < 10; i++) {
      if (box.childElementCount > 40) break;
      const s = document.createElement('i');
      s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      s.style.left = (10 + Math.random() * 80) + '%';
      s.style.color = cols[Math.floor(Math.random() * cols.length)];
      s.style.fontSize = (16 + Math.random() * 22) + 'px';
      s.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      s.style.animationDelay = (Math.random() * 0.3) + 's';
      box.appendChild(s);
      setTimeout(() => s.remove(), 2400);
    }
  });
}

function safe(fn) {
  try { fn(); } catch (err) { if (window.console) console.error(err); }
}

function init() {
  safe(() => { formUid = newUid(); });
  safe(() => {
    $('fState').innerHTML = '<option value="">Choose your state</option>' + STATES.map((s) => '<option value="' + esc(s) + '">' + esc(s) + '</option>').join('');
  });
  safe(setupCountdown);
  safe(setupGallery);
  safe(setupLove);
  safe(bindEvents);
  safe(() => { paintMedia('face'); paintMedia('id'); });
  initCourses().catch(() => {
    $('skel').classList.add('hidden');
    $('cErr').classList.remove('hidden');
  });
  if (location.hash === '#apply') {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

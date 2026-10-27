const FORM_API = '/api/matawalle';
const SITE_ID = 'LUBNA';
const IMGUR_API = 'https://api.imgur.com/3/image';
const IMGUR_CLIENT = 'Client-ID 5acf7eff9c91660';
const PAGE_SIZE = 12;
const MAX_SIDE = 1400;
const CATEGORIES = {
  '1': 'Technology & Computing',
  '2': 'Vocational & Agricultural Skills',
  '3': 'Health & Community Wellness',
  '4': '2-Year Diploma Program'
};
const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT - Abuja','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
const ID_RULES = {
  nin: { test: /^\d{11}$/, error: 'Your NIN must be exactly 11 numbers.', hint: 'NIN (11 numbers)', max: 11, mode: 'numeric' },
  voter: { test: /^[A-Za-z0-9]{9,22}$/, error: 'Enter your voter card number using letters and numbers only.', hint: 'Voter card number', max: 22, mode: 'text' }
};
const PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380"><rect width="600" height="380" fill="#14463a"/><circle cx="300" cy="170" r="54" fill="#e9b949" opacity=".85"/><text x="300" y="285" fill="#fff" font-family="Arial" font-size="28" font-weight="bold" text-anchor="middle">Free Skills</text></svg>');

const $ = (id) => document.getElementById(id);
const qsa = (s, r) => Array.from((r || document).querySelectorAll(s));

let allCourses = [];
let shown = 0;
let activeCat = 'all';
let query = '';
let selected = null;
let modalCourse = null;
let submitting = false;
let uid = '';
const media = {
  face: { url: '', busy: false, seq: 0 },
  id: { url: '', busy: false, seq: 0 }
};

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function norm(v) {
  return String(v == null ? '' : v).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

function newUid() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function toast(type, msg) {
  const box = $('toasts');
  if (!box || box.children.length >= 3) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), type === 'error' ? 5000 : 3200);
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
  const q = norm(query);
  return allCourses.filter((c) => (activeCat === 'all' || String(c.category) === activeCat) && (!q || norm(c.course_name).includes(q) || norm(catName(c)).includes(q)));
}

function cardHtml(c) {
  return '<article class="cc"><div class="im"><img src="' + esc(c.image_url || PLACEHOLDER) + '" alt="' + esc(c.course_name) + '" loading="lazy" decoding="async"></div>' +
    '<div class="tx"><small>' + esc(catName(c)) + '</small><h3>' + esc(c.course_name) + '</h3><p>' + esc(shortDesc(c, 90)) + '</p>' +
    '<div class="acts"><button type="button" data-view="' + esc(c.id) + '">View</button><button type="button" class="go" data-pick="' + esc(c.id) + '">Apply free</button></div></div></article>';
}

function renderGrid(reset) {
  const grid = $('grid');
  const items = filtered();
  if (reset) {
    grid.innerHTML = '';
    shown = 0;
  }
  const next = items.slice(shown, shown + PAGE_SIZE);
  grid.insertAdjacentHTML('beforeend', next.map(cardHtml).join(''));
  shown += next.length;
  $('more').classList.toggle('hidden', shown >= items.length);
  const st = $('state');
  if (!items.length) {
    st.textContent = allCourses.length ? 'No course found. Try another word.' : 'Courses are not available right now. Please check back soon.';
    st.classList.remove('hidden');
  } else {
    st.classList.add('hidden');
  }
}

function renderChips() {
  const cats = Array.from(new Set(allCourses.map((c) => String(c.category)))).filter((k) => CATEGORIES[k]).sort();
  const chips = [['all', 'All']].concat(cats.map((k) => [k, CATEGORIES[k]]));
  $('chips').innerHTML = chips.map((c) => '<button type="button" data-cat="' + c[0] + '"' + (c[0] === activeCat ? ' class="on"' : '') + '>' + esc(c[1]) + '</button>').join('');
}

function fillCourseSelect() {
  const sel = $('fCourse');
  sel.innerHTML = '<option value="">Choose your course</option>' + allCourses.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.course_name) + '</option>').join('');
  if (selected) sel.value = String(selected.id);
}

let coursesStarted = false;
async function initCourses() {
  if (coursesStarted) return;
  coursesStarted = true;
  const st = $('state');
  st.classList.remove('hidden');
  st.innerHTML = '<span class="spin"></span> Loading courses';
  try {
    allCourses = await loadCourses();
    renderChips();
    renderGrid(true);
    fillCourseSelect();
  } catch (err) {
    coursesStarted = false;
    st.innerHTML = 'We could not load the courses. <button type="button" class="btn sm" id="retry">Try again</button>';
    const r = $('retry');
    if (r) r.addEventListener('click', initCourses);
  }
}

function findCourse(id) {
  return allCourses.find((c) => String(c.id) === String(id)) || null;
}

function openView(c) {
  modalCourse = c;
  $('vImg').src = c.image_url || PLACEHOLDER;
  $('vImg').alt = c.course_name;
  $('vCat').textContent = catName(c);
  $('vName').textContent = c.course_name;
  $('vInfo').textContent = String(c.info_text || 'Learn this skill online with a free certificate when you finish.');
  $('view').classList.add('open');
}

function closeView() {
  $('view').classList.remove('open');
  modalCourse = null;
}

function setCourse(c) {
  selected = c;
  const sel = $('fCourse');
  if (sel) sel.value = c ? String(c.id) : '';
  clearErr('Course');
  progress();
}

function openApply(course, origin) {
  closeDrawer();
  closeView();
  if (course) setCourse(course);
  const p = $('apply');
  const r = origin && origin.getBoundingClientRect ? origin.getBoundingClientRect() : null;
  p.style.setProperty('--x', (r ? r.left + r.width / 2 : window.innerWidth / 2) + 'px');
  p.style.setProperty('--y', (r ? r.top + r.height / 2 : window.innerHeight / 2) + 'px');
  p.scrollTop = 0;
  p.classList.add('open');
  document.body.style.overflow = 'hidden';
  try { history.pushState({ apply: 1 }, '', '#apply'); } catch (_) {}
}

function hideApply() {
  closeCam();
  $('apply').classList.remove('open');
  document.body.style.overflow = '';
}

function closeApply() {
  if (history.state && history.state.apply) history.back();
  else hideApply();
}

function openDrawer() {
  $('drawer').classList.add('open');
  $('dbg').classList.add('open');
}

function closeDrawer() {
  $('drawer').classList.remove('open');
  $('dbg').classList.remove('open');
}

const KEYS = ['Name', 'Phone', 'Email', 'Course', 'State', 'Lga', 'Gender', 'IdType', 'IdNum', 'Face', 'IdImg'];

function setErr(k, msg) {
  const e = $('e' + k);
  if (!e) return;
  e.textContent = msg;
  e.classList.add('show');
  const l = e.closest('label');
  if (l) l.classList.add('has-err');
}

function clearErr(k) {
  const e = $('e' + k);
  if (!e) return;
  e.textContent = '';
  e.classList.remove('show');
  const l = e.closest('label');
  if (l) l.classList.remove('has-err');
}

function showFormError(msg) {
  const f = $('ferr');
  f.textContent = msg;
  f.classList.add('show');
}

function normalizePhone(v) {
  let d = String(v || '').replace(/[\s\-().]/g, '');
  if (d.charAt(0) === '+') d = d.slice(1);
  if (/^0\d{10}$/.test(d)) d = '234' + d.slice(1);
  else if (/^[789]\d{9}$/.test(d)) d = '234' + d;
  return /^234[789][01]\d{8}$/.test(d) ? d : '';
}

function radio(name) {
  const el = document.querySelector('input[name="' + name + '"]:checked');
  return el ? el.value : '';
}

function cleanId(type, v) {
  const s = String(v || '').replace(/[\s\-]/g, '');
  return type === 'voter' ? s.toUpperCase() : s;
}

function idValid() {
  const t = radio('idt');
  return Boolean(t) && ID_RULES[t].test.test(cleanId(t, $('fIdNum').value));
}

function progress() {
  const checks = [
    $('fName').value.trim().split(/\s+/).filter(Boolean).length >= 2,
    Boolean(normalizePhone($('fPhone').value)),
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($('fEmail').value.trim()),
    Boolean(selected),
    Boolean($('fState').value),
    $('fLga').value.trim().length >= 2,
    Boolean(radio('g')),
    idValid(),
    Boolean(media.face.url),
    Boolean(media.id.url)
  ];
  $('pfill').style.width = Math.round(checks.filter(Boolean).length / checks.length * 100) + '%';
}

function updateIdUi() {
  const t = radio('idt');
  const input = $('fIdNum');
  if (!t) return;
  const r = ID_RULES[t];
  input.placeholder = r.hint;
  input.maxLength = r.max;
  input.inputMode = r.mode;
  input.value = cleanId(t, input.value).slice(0, r.max);
}

function drawJpeg(src, w0, h0) {
  const s = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * s));
  const h = Math.max(1, Math.round(h0 * s));
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0, w, h);
  return cv.toDataURL('image/jpeg', 0.85);
}

function fileToJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        resolve(drawJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    img.src = url;
  });
}

async function uploadImgur(b64) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(IMGUR_API, {
      method: 'POST',
      headers: { Authorization: IMGUR_CLIENT },
      body: new URLSearchParams({ image: b64, type: 'base64' }),
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

function paintMedia(kind) {
  const m = media[kind];
  const img = $(kind === 'face' ? 'faceImg' : 'idImg');
  const txt = $(kind === 'face' ? 'faceTxt' : 'idTxt');
  if (txt) txt.textContent = m.busy ? 'Uploading...' : (m.url ? 'Change photo' : (kind === 'face' ? 'Take photo' : 'Add photo'));
}

async function processImage(kind, dataUrl) {
  const m = media[kind];
  const seq = ++m.seq;
  const img = $(kind === 'face' ? 'faceImg' : 'idImg');
  img.src = dataUrl;
  img.classList.remove('hidden');
  m.url = '';
  m.busy = true;
  clearErr(kind === 'face' ? 'Face' : 'IdImg');
  paintMedia(kind);
  progress();
  try {
    const link = await uploadImgur(dataUrl.split(',')[1] || '');
    if (seq !== m.seq) return;
    m.url = link;
  } catch (err) {
    if (seq !== m.seq) return;
    img.classList.add('hidden');
    toast('error', 'Photo upload failed. Check your network and try again.');
  } finally {
    if (seq === m.seq) {
      m.busy = false;
      paintMedia(kind);
      progress();
    }
  }
}

async function handleFile(kind, file) {
  if (!file) return;
  try {
    processImage(kind, await fileToJpeg(file));
  } catch (err) {
    toast('error', 'We could not read this photo. Try again.');
  }
}

let camStream = null;
let camFacing = 'user';
let camTarget = '';
let camBusy = false;

function stopStream() {
  if (camStream) camStream.getTracks().forEach((t) => { try { t.stop(); } catch (_) {} });
  camStream = null;
  const v = $('camVideo');
  if (v) {
    try { v.pause(); } catch (_) {}
    v.srcObject = null;
  }
}

function setCamError(msg) {
  $('camErrText').textContent = msg || '';
  $('camErr').classList.toggle('hidden', !msg);
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
      } catch (e) {
        last = e;
        if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) break;
      }
    }
    if (!stream) throw last || new Error('camera');
    if (!$('cam').classList.contains('open')) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    camStream = stream;
    const s = stream.getVideoTracks()[0];
    const facing = (s && s.getSettings && s.getSettings().facingMode) || camFacing;
    const v = $('camVideo');
    v.srcObject = stream;
    v.classList.toggle('mirror', facing === 'user');
    await v.play().catch(() => {});
  } catch (err) {
    const n = err && err.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') setCamError('Camera is blocked. Allow camera access in your browser settings, then try again.');
    else if (n === 'NotFoundError' || n === 'OverconstrainedError') setCamError('No camera was found on this device.');
    else setCamError('We could not open the camera. Close other apps that use it and try again.');
  } finally {
    camBusy = false;
  }
}

function openCam(target) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    $(target === 'face' ? 'fFace' : 'fId').click();
    return;
  }
  camTarget = target;
  camFacing = target === 'face' ? 'user' : 'environment';
  $('camGuide').className = 'guide ' + (target === 'face' ? 'face' : 'card');
  $('camTitle').textContent = target === 'face' ? 'Take your face photo' : 'Take a photo of your ID';
  $('camHint').textContent = target === 'face' ? 'Put your face inside the circle and look straight at the camera.' : 'Put your ID flat inside the box. Make every word clear.';
  $('cam').classList.add('open');
  startCam();
}

function closeCam() {
  const c = $('cam');
  if (c) c.classList.remove('open');
  stopStream();
  camTarget = '';
}

function takeShot() {
  const v = $('camVideo');
  if (!v || !v.videoWidth || !camStream) return;
  const target = camTarget;
  let data = '';
  try {
    data = drawJpeg(v, v.videoWidth, v.videoHeight);
  } catch (err) {
    toast('error', 'We could not take the photo. Try again.');
    return;
  }
  closeCam();
  if (target) processImage(target, data);
}

function setupTilt() {
  const c = $('certCard');
  if (!c) return;
  const w = c.parentElement;
  w.addEventListener('pointermove', (e) => {
    const r = w.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    c.style.transform = 'rotateY(' + x * 18 + 'deg) rotateX(' + -y * 18 + 'deg)';
    c.style.setProperty('--sx', (x + 0.5) * 100 + '%');
  });
  w.addEventListener('pointerleave', () => { c.style.transform = ''; });
}

function validate() {
  KEYS.forEach(clearErr);
  $('ferr').classList.remove('show');
  let first = null;
  const bad = (k, el, msg) => {
    setErr(k, msg);
    if (!first) first = el;
  };
  const name = $('fName').value.trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.split(' ').length < 2 || !/^[\p{L}][\p{L}\s.'\-]*$/u.test(name)) bad('Name', $('fName'), 'Write your first name and last name.');
  if (!normalizePhone($('fPhone').value)) bad('Phone', $('fPhone'), 'Enter a correct phone number, for example 08012345678.');
  if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test($('fEmail').value.trim())) bad('Email', $('fEmail'), 'Enter a correct email address.');
  if (!selected) bad('Course', $('fCourse'), 'Choose the course you want to learn.');
  if (!$('fState').value) bad('State', $('fState'), 'Choose your state.');
  if ($('fLga').value.trim().length < 2) bad('Lga', $('fLga'), 'Write your local government.');
  if (!radio('g')) bad('Gender', document.querySelector('input[name="g"]'), 'Choose male or female.');
  const t = radio('idt');
  if (!t) bad('IdType', document.querySelector('input[name="idt"]'), 'Choose NIN or Voter card.');
  else if (!idValid()) bad('IdNum', $('fIdNum'), ID_RULES[t].error);
  if (media.face.busy) bad('Face', $('faceBtn'), 'Wait. Your face photo is uploading.');
  else if (!media.face.url) bad('Face', $('faceBtn'), 'Take your face photo.');
  if (media.id.busy) bad('IdImg', $('idBtn'), 'Wait. Your ID photo is uploading.');
  else if (!media.id.url) bad('IdImg', $('idBtn'), 'Add a photo of your ID card.');
  if (first) {
    try {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (first.focus) first.focus({ preventScroll: true });
    } catch (_) {}
    return false;
  }
  return true;
}

function setSending(on) {
  submitting = on;
  const b = $('send');
  b.disabled = on;
  b.innerHTML = on ? '<span class="spin"></span> Sending...' : '<i class="fa-solid fa-paper-plane"></i> Send my application';
}

function resetForm() {
  $('form').reset();
  selected = null;
  ['face', 'id'].forEach((k) => {
    media[k].url = '';
    media[k].busy = false;
    media[k].seq++;
    $(k === 'face' ? 'faceImg' : 'idImg').classList.add('hidden');
    paintMedia(k);
  });
  KEYS.forEach(clearErr);
  $('ferr').classList.remove('show');
  uid = newUid();
  $('formBox').classList.remove('hidden');
  $('done').classList.add('hidden');
  $('apply').scrollTop = 0;
  progress();
}

async function submit(e) {
  e.preventDefault();
  if (submitting || !validate()) return;
  const full = $('fName').value.trim().replace(/\s+/g, ' ');
  const t = radio('idt');
  const payload = {
    site_id: SITE_ID,
    uid: uid,
    full_name: full,
    phone: $('fPhone').value.trim(),
    email: $('fEmail').value.trim(),
    country: 'Nigeria',
    state: $('fState').value,
    lga: $('fLga').value.trim(),
    gender: radio('g'),
    id_type: t,
    id_number: cleanId(t, $('fIdNum').value),
    face_url: media.face.url,
    id_url: media.id.url,
    course_id: String(selected.id),
    course_name: selected.course_name,
    course_number: String(selected.course_number || ''),
    course_price: Number(selected.price || 0),
    website: $('fWeb').value
  };
  setSending(true);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
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
    $('dName').textContent = full.split(' ')[0];
    $('formBox').classList.add('hidden');
    $('done').classList.remove('hidden');
    $('pfill').style.width = '100%';
    $('apply').scrollTop = 0;
  } catch (err) {
    showFormError(err && err.name === 'AbortError' ? 'The request took too long. Check your network and try again.' : 'We could not reach the server. Check your network and try again.');
  } finally {
    clearTimeout(timer);
    setSending(false);
  }
}

function countUp(el) {
  const target = Number(el.dataset.n);
  const suffix = el.dataset.s || '';
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / 1200);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function setupObservers() {
  const reveals = qsa('.reveal');
  const counters = qsa('[data-n]');
  if (!('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
    counters.forEach((el) => { el.textContent = el.dataset.n + (el.dataset.s || ''); });
    initCourses();
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { threshold: 0.12 });
  reveals.forEach((el) => io.observe(el));
  const co = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      countUp(en.target);
      co.unobserve(en.target);
    });
  }, { threshold: 0.6 });
  counters.forEach((el) => co.observe(el));
  const cs = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      initCourses();
      cs.disconnect();
    }
  }, { rootMargin: '600px 0px' });
  cs.observe($('courses'));
  setTimeout(() => reveals.forEach((el) => el.classList.add('in')), 3500);
}

function setupScroll() {
  const bar = $('bar');
  let tick = false;
  window.addEventListener('scroll', () => {
    if (tick) return;
    tick = true;
    requestAnimationFrame(() => {
      tick = false;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      bar.style.transform = 'scaleX(' + Math.min(1, (window.scrollY || 0) / max) + ')';
    });
  }, { passive: true });
}

function setupGallery() {
  const items = qsa('#acc button');
  const on = (b) => items.forEach((x) => x.classList.toggle('on', x === b));
  items.forEach((b) => {
    b.addEventListener('mouseenter', () => on(b));
    b.addEventListener('click', () => on(b));
    b.addEventListener('focus', () => on(b));
  });
  let i = 0;
  setInterval(() => {
    if (document.hidden || document.querySelector('#acc:hover')) return;
    i = (i + 1) % items.length;
    on(items[i]);
  }, 4200);
}

function bind() {
  $('fState').innerHTML = '<option value="">Choose your state</option>' + STATES.map((s) => '<option value="' + esc(s) + '">' + esc(s) + '</option>').join('');

  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && !t.dataset.fb && t.closest('.cc, .card')) {
      t.dataset.fb = '1';
      t.src = PLACEHOLDER;
    }
  }, true);

  document.addEventListener('click', (e) => {
    const apply = e.target.closest('[data-apply]');
    if (apply) {
      openApply(null, apply);
      return;
    }
    const view = e.target.closest('[data-view]');
    if (view) {
      const c = findCourse(view.dataset.view);
      if (c) openView(c);
      return;
    }
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const c = findCourse(pick.dataset.pick);
      if (c) openApply(c, pick);
      return;
    }
    const cat = e.target.closest('[data-cat]');
    if (cat) {
      activeCat = cat.dataset.cat;
      qsa('#chips button').forEach((b) => b.classList.toggle('on', b === cat));
      renderGrid(true);
      return;
    }
    const close = e.target.closest('[data-close]');
    if (close) closeView();
    const link = e.target.closest('.drawer a');
    if (link) closeDrawer();
  });

  $('menu').addEventListener('click', openDrawer);
  $('dx').addEventListener('click', closeDrawer);
  $('dbg').addEventListener('click', closeDrawer);
  $('view').addEventListener('click', (e) => {
    if (e.target === $('view')) closeView();
  });
  $('vApply').addEventListener('click', (e) => {
    if (modalCourse) openApply(modalCourse, e.currentTarget);
  });
  $('back').addEventListener('click', closeApply);
  $('again').addEventListener('click', resetForm);
  $('more').addEventListener('click', () => renderGrid(false));
  $('q').addEventListener('input', (e) => {
    query = e.target.value;
    renderGrid(true);
  });
  $('fCourse').addEventListener('change', (e) => setCourse(findCourse(e.target.value)));
  $('fState').addEventListener('change', () => {
    clearErr('State');
    progress();
  });
  $('form').addEventListener('submit', submit);
  $('form').addEventListener('input', (e) => {
    const map = { fName: 'Name', fPhone: 'Phone', fEmail: 'Email', fLga: 'Lga', fIdNum: 'IdNum' };
    if (map[e.target.id]) clearErr(map[e.target.id]);
    if (e.target.name === 'g') clearErr('Gender');
    if (e.target.name === 'idt') {
      clearErr('IdType');
      clearErr('IdNum');
      updateIdUi();
    }
    if (e.target.id === 'fIdNum') {
      const t = radio('idt');
      if (t) e.target.value = cleanId(t, e.target.value);
    }
    progress();
  });
  $('faceBtn').addEventListener('click', () => openCam('face'));
  $('idBtn').addEventListener('click', () => openCam('id'));
  $('camClose').addEventListener('click', closeCam);
  $('camShot').addEventListener('click', takeShot);
  $('camSwitch').addEventListener('click', () => {
    camFacing = camFacing === 'user' ? 'environment' : 'user';
    startCam();
  });
  $('fFace').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    handleFile('face', f);
  });
  $('fId').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    handleFile('id', f);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopStream();
    else if ($('cam').classList.contains('open')) startCam();
  });
  window.addEventListener('popstate', () => {
    if ($('apply').classList.contains('open')) hideApply();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('cam').classList.contains('open')) closeCam();
    else if ($('view').classList.contains('open')) closeView();
    else if ($('apply').classList.contains('open')) closeApply();
    else closeDrawer();
  });
}

function safe(fn) {
  try { fn(); } catch (err) { if (window.console) console.error(err); }
}

function init() {
  uid = newUid();
  safe(bind);
  safe(setupObservers);
  safe(setupScroll);
  safe(setupGallery);
  safe(setupTilt);
  safe(progress);
  if (location.hash === '#apply') {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

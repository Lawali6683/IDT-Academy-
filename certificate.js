import { supabase } from './supabase.js';

const API = '/api/complete';
const BUCKET = 'forket';
const FACE_MODELS_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const SOCIAL_HOSTS = ['tiktok.com', 'facebook.com', 'fb.watch', 'fb.com', 'instagram.com', 'youtube.com', 'youtu.be', 'x.com', 'twitter.com', 'linkedin.com', 'snapchat.com', 'threads.net', 'whatsapp.com'];
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const WA1 = 'https://wa.me/2347040831743';
const WA2 = 'https://wa.me/2347068818760';

const $ = (id) => document.getElementById(id);

let user = null;
let S = null;
let item = null;
let paramCourse = '';
let stream = null;
let running = false;
let modelReady = false;
let facing = 'user';
let photoCanvas = null;
let photoBlob = null;
let photoSaving = false;
let pdfFile = null;
let submitting = false;
let toastCount = 0;

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function miniLoad(text) {
  $('miniLoaderText').textContent = text || 'Please wait...';
  $('miniLoader').classList.add('open');
}

function miniHide() {
  $('miniLoader').classList.remove('open');
}

function push(type, title, message) {
  const wrap = $('pushWrap');
  if (!wrap || toastCount >= 3) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const card = document.createElement('div');
  card.className = 'push-card ' + type;
  card.innerHTML = '<img class="push-logo" src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy"><div class="push-body"><b><i class="fa-solid ' + (icons[type] || icons.info) + '"></i> ' + esc(title) + '</b><p>' + esc(message) + '</p></div><button class="push-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  const close = () => {
    card.classList.add('out');
    setTimeout(() => {
      card.remove();
      toastCount = Math.max(0, toastCount - 1);
    }, 320);
  };
  card.querySelector('.push-x').addEventListener('click', close);
  wrap.appendChild(card);
  toastCount++;
  setTimeout(close, type === 'error' ? 7000 : 4500);
}

async function api(body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ user_id: user.id }, body)), signal: ctrl.signal });
    let data = null;
    try { data = await res.json(); } catch (_) { data = null; }
    if (!res.ok || !data || data.success === false) {
      const err = new Error((data && data.error) || 'The request failed. Please try again.');
      err.field = data && data.field;
      throw err;
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('The request took too long. Please try again.');
    if (e instanceof TypeError) throw new Error('Network problem. Check your internet connection.');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

function showOnly(id) {
  ['certEmpty', 'certPicker', 'certSample', 'certPhoto', 'certPreview', 'projectSection', 'certDone'].forEach((x) => $(x).classList.toggle('hidden', x !== id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function statusOf(it) {
  if (it.certificate) return { key: 'issued', label: 'Certificate issued', cls: 'green', icon: 'fa-award' };
  if (!it.project) return { key: 'choose', label: 'Choose project', cls: 'rose', icon: 'fa-lightbulb' };
  const hasPhoto = Boolean(S.student.profile_url);
  if (!hasPhoto && !it.submission) return { key: 'both', label: 'Photo and project needed', cls: 'amber', icon: 'fa-list-check' };
  if (!hasPhoto) return { key: 'photo', label: 'Photo needed', cls: 'amber', icon: 'fa-camera' };
  if (!it.submission) return { key: 'project', label: 'Project needed', cls: 'amber', icon: 'fa-diagram-project' };
  return { key: 'waiting', label: 'Waiting for certificate', cls: 'violet', icon: 'fa-hourglass-half' };
}

async function load() {
  miniLoad('Loading your certificates...');
  try {
    S = await api({ action: 'state' });
    miniHide();
  } catch (e) {
    miniHide();
    showOnly('certEmpty');
    $('certEmptyMsg').textContent = e.message;
    return;
  }
  if (!S.items.length) {
    showOnly('certEmpty');
    if (paramCourse) {
      $('certEmptyMsg').textContent = 'You get your certificate after you pass your final exam. Please take your exam first.';
      const a = $('btnEmptyAction');
      a.href = 'exam.html?course_id=' + encodeURIComponent(paramCourse);
      a.innerHTML = '<i class="fa-solid fa-file-pen"></i> Go to Exam';
    }
    return;
  }
  const match = paramCourse ? S.items.find((i) => i.id === paramCourse) : null;
  if (match) select(match);
  else if (S.items.length === 1) select(S.items[0]);
  else showPicker();
}

function showPicker() {
  item = null;
  showOnly('certPicker');
  $('certList').innerHTML = S.items.map((it, i) => {
    const st = statusOf(it);
    return '<button type="button" class="cert-item" data-i="' + i + '"><img src="' + esc(it.image || 'https://i.imgur.com/oyqM5oF.png') + '" alt=""><div><b>' + esc(it.name) + '</b><small>Score ' + esc(Number(it.score || 0).toFixed(1)) + ' / 100' + (it.date ? ' • ' + esc(fmtDate(it.date)) : '') + '</small></div><span class="badge ' + st.cls + '"><i class="fa-solid ' + st.icon + '"></i> ' + esc(st.label) + '</span></button>';
  }).join('');
}

function select(it) {
  item = it;
  renderOverview();
}

function stepRow(cls, icon, title, text, action) {
  return '<div class="step-row ' + cls + '"><div class="sr-ic"><i class="fa-solid ' + icon + '"></i></div><div class="sr-body"><b>' + title + '</b><small>' + text + '</small></div>' + (action || '') + '</div>';
}

function renderOverview() {
  showOnly('certSample');
  const st = statusOf(item);
  $('certHeadTitle').textContent = item.name;
  $('certHeadSub').textContent = 'Score ' + Number(item.score || 0).toFixed(1) + ' / 100 • Congratulations on passing your final exam!';
  const b = $('certBadge');
  b.className = 'badge ' + st.cls;
  b.innerHTML = '<i class="fa-solid ' + st.icon + '"></i> ' + esc(st.label);
  $('cfFullName').textContent = S.student.name || 'Student';
  $('cfDob').textContent = S.student.dob ? fmtDate(S.student.dob) || S.student.dob : 'Not set';
  $('certListRow').classList.toggle('hidden', S.items.length < 2);

  const hasPhoto = Boolean(S.student.profile_url);
  const issued = Boolean(item.certificate);
  let html = '';
  html += hasPhoto
    ? stepRow('done', 'fa-circle-check', 'Passport photo', 'Your photo is saved.', '<img class="thumb" src="' + esc(S.student.profile_url) + '" alt="Your photo">' + (issued ? '' : '<button class="btn btn-outline btn-sm" data-act="photo"><i class="fa-solid fa-camera"></i> Change</button>'))
    : stepRow('', 'fa-camera', 'Passport photo', 'Take a clear photo of your face. It is printed on your certificate.', '<button class="btn btn-primary btn-sm" data-act="photo"><i class="fa-solid fa-camera"></i> Take Photo</button>');
  if (!item.project) {
    html += stepRow('', 'fa-lightbulb', 'Final project', 'Choose your project on the exam page first.', '<a class="btn btn-primary btn-sm" href="exam.html?course_id=' + encodeURIComponent(item.id) + '"><i class="fa-solid fa-lightbulb"></i> Choose</a>');
  } else if (item.submission) {
    html += stepRow('done', 'fa-circle-check', 'Final project', 'Submitted: ' + esc(item.project.title) + (item.submission.edited_at ? ' (edited)' : ''), issued ? '' : '<button class="btn btn-outline btn-sm" data-act="project"><i class="fa-solid fa-pen"></i> Edit</button>');
  } else {
    html += stepRow('', 'fa-diagram-project', 'Final project', esc(item.project.title), '<button class="btn btn-primary btn-sm" data-act="project"><i class="fa-solid fa-paper-plane"></i> Fill Form</button>');
  }
  if (issued) {
    const links = (item.certificate.pdfs || []).map((u, i) => '<a href="' + esc(u) + '" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i> Open Certificate ' + (i + 1) + '</a>').join('');
    html += stepRow('done', 'fa-award', 'Your certificate', 'Certificate ID: <b>' + esc(item.certificate.id) + '</b>' + (links ? '<div class="cert-links">' + links + '</div>' : ''), '');
  } else {
    const ready = hasPhoto && item.submission;
    html += stepRow(ready ? 'wait' : '', 'fa-hourglass-half', 'Your certificate', ready ? 'Please wait for your certificate. We will check your project and send it to your email.' : 'You will get it after the steps above are done.', '');
  }
  $('certSteps').innerHTML = html;

  const wait = $('certWait');
  if (!issued && hasPhoto && item.submission) {
    wait.classList.remove('hidden');
    wait.innerHTML = '<div class="support-note green"><i class="fa-solid fa-circle-check"></i><div><b>Everything is submitted.</b> Please wait for your certificate. You will get an email when it is ready. If you see a mistake you can still edit your project above.</div></div>';
  } else {
    wait.classList.add('hidden');
    wait.innerHTML = '';
  }
  if (!S.student.dob) push('info', 'Date Of Birth Missing', 'Your date of birth is not on file. Contact customer care on WhatsApp to add it.');
}

async function loadModels() {
  if (modelReady) return;
  try {
    if (typeof faceapi !== 'undefined') {
      await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_URL);
      modelReady = true;
    }
  } catch (_) {
    modelReady = false;
  }
}

function setFace(ok, text) {
  $('camWrap').classList.toggle('ok', ok);
  $('camWrap').classList.toggle('bad', !ok);
  const s = $('faceStatus');
  s.classList.toggle('ok', ok);
  s.classList.toggle('bad', !ok);
  s.innerHTML = '<i class="fa-solid ' + (ok ? 'fa-circle-check' : 'fa-circle-xmark') + '"></i><span id="faceStatusText">' + esc(text) + '</span>';
  $('btnCapture').disabled = !ok;
}

function stopCamera() {
  running = false;
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  const v = $('camVideo');
  if (v && v.srcObject) v.srcObject = null;
}

async function startCamera() {
  stopCamera();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Camera is not supported on this device');
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 960 } }, audio: false });
  const v = $('camVideo');
  v.srcObject = stream;
  await v.play().catch(() => {});
  if (!modelReady) setFace(true, 'Camera ready. Take your photo.');
  else setFace(false, 'Detecting your face...');
}

async function detectTick() {
  if (!running || !stream) return;
  try {
    const v = $('camVideo');
    if (modelReady && v.readyState >= 2 && typeof faceapi !== 'undefined') {
      const det = await faceapi.detectSingleFace(v, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }));
      if (det) {
        const bx = det.box;
        const vw = v.videoWidth || 1;
        const vh = v.videoHeight || 1;
        const rw = bx.width / vw;
        const rh = bx.height / vh;
        const cx = (bx.x + bx.width / 2) / vw;
        const cy = (bx.y + bx.height / 2) / vh;
        const ok = rw >= 0.25 && rw <= 0.68 && rh >= 0.3 && rh <= 0.8 && cx >= 0.3 && cx <= 0.7 && cy >= 0.25 && cy <= 0.75;
        setFace(ok, ok ? 'Face detected. Perfect! Tap Take Photo.' : 'Position your face inside the frame.');
      } else {
        setFace(false, 'No face detected. Look at the camera.');
      }
    }
  } catch (_) {}
  if (running) requestAnimationFrame(detectTick);
}

async function openCamera() {
  showOnly('certPhoto');
  facing = 'user';
  photoCanvas = null;
  photoBlob = null;
  setFace(false, 'Starting camera...');
  await loadModels();
  try {
    await startCamera();
    running = true;
    detectTick();
  } catch (e) {
    push('error', 'Camera Error', 'Could not start your camera. Please allow camera permission and try again.');
  }
}

async function switchCamera() {
  facing = facing === 'user' ? 'environment' : 'user';
  try {
    await startCamera();
    running = true;
    detectTick();
  } catch (e) {
    push('error', 'Camera Error', 'Could not switch the camera.');
  }
}

function cancelCamera() {
  stopCamera();
  renderOverview();
}

function capture() {
  const v = $('camVideo');
  if (!v || !v.videoWidth) return;
  const c = document.createElement('canvas');
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  const ctx = c.getContext('2d');
  if (facing === 'user') {
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(v, 0, 0, c.width, c.height);
  photoCanvas = c;
  photoBlob = null;
  $('previewImg').src = c.toDataURL('image/jpeg', 0.92);
  stopCamera();
  showOnly('certPreview');
}

async function retake() {
  showOnly('certPhoto');
  setFace(false, 'Starting camera...');
  try {
    await startCamera();
    running = true;
    detectTick();
  } catch (e) {
    push('error', 'Camera Error', 'Could not restart your camera.');
  }
}

async function savePhoto() {
  if (photoSaving || !photoCanvas) return;
  photoSaving = true;
  miniLoad('Saving your photo...');
  try {
    if (!photoBlob) photoBlob = await new Promise((resolve) => photoCanvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!photoBlob) throw new Error('Could not create the image file');
    const name = 'cert_' + user.id + '_' + Date.now() + '.jpg';
    const up = await supabase.storage.from(BUCKET).upload(name, photoBlob, { contentType: 'image/jpeg', upsert: true });
    if (up.error) throw up.error;
    const pub = supabase.storage.from(BUCKET).getPublicUrl(name);
    const url = pub && pub.data ? pub.data.publicUrl : '';
    if (!url) throw new Error('Could not get the photo link');
    await api({ action: 'photo', profile_url: url });
    S.student.profile_url = url;
    try {
      user.profile_url = url;
      localStorage.setItem('idt_user', JSON.stringify(user));
    } catch (_) {}
    miniHide();
    push('success', 'Photo Saved', 'Your photo was saved successfully.');
    renderOverview();
  } catch (e) {
    miniHide();
    push('error', 'Could Not Save Photo', e.message || 'Please check your internet and try again.');
  } finally {
    photoSaving = false;
  }
}

const TYPES = {
  pdf: { icon: 'fa-file-pdf', text: 'A PDF of your project (optional) + your video' },
  link: { icon: 'fa-globe', text: 'A link to your project (optional) + your video' },
  video: { icon: 'fa-video', text: 'Your project video' },
  mixed: { icon: 'fa-layer-group', text: 'Your video + PDF or link (optional)' }
};

function openProject() {
  if (!item || !item.project) return;
  showOnly('projectSection');
  const p = item.project;
  const t = TYPES[p.deliverable] || TYPES.mixed;
  $('pjTitle').textContent = p.title;
  $('pjDesc').textContent = p.summary;
  $('pjTypeIcon').className = 'fa-solid ' + t.icon;
  $('pjTypeText').textContent = t.text;
  const rules = [
    'Your video is required. Show your face, say your name, and explain what you built and how it helps people.',
    'Post the video on one of your social media pages (TikTok, Facebook, Instagram, YouTube or X) and paste the link of the post.',
    'A PDF or a project link is optional, but it makes your project stronger.',
    'Make sure every link is public so our team can open it.',
    'You can fix mistakes and save again until your certificate is issued.'
  ];
  $('pjRules').innerHTML = rules.map((r) => '<li><i class="fa-solid fa-circle-check"></i><span>' + esc(r) + '</span></li>').join('');
  $('pjSteps').innerHTML = (p.what_to_do || []).map((s, i) => '<li><i class="fa-solid fa-' + (i + 1) + '"></i><span>' + esc(s) + '</span></li>').join('');
  const tips = (p.tips || []).length ? ' Tips: ' + p.tips.join(' • ') : '';
  $('pjHint').textContent = (p.deliverable_note || 'Submit your video and your work.') + tips;
  const sub = item.submission;
  $('pjVideo').value = sub ? sub.video_url : '';
  $('pjPdfLink').value = sub ? sub.pdf_url : '';
  $('pjLink').value = sub ? sub.work_url : '';
  $('pjNote').value = sub ? sub.note : '';
  pdfFile = null;
  $('pjPdfFile').value = '';
  $('pjPdfName').textContent = 'No PDF chosen';
  $('btnClearPdf').classList.add('hidden');
  ['fVideo', 'fPdf', 'fLink'].forEach((id) => $(id).classList.remove('bad'));
  ['ePjVideo', 'ePjPdf', 'ePjLink'].forEach((id) => {
    $(id).textContent = '';
    $(id).classList.remove('show');
  });
  $('pjError').classList.add('hidden');
  $('pjEditNote').classList.toggle('hidden', !sub);
  $('pjFormTitle').textContent = sub ? 'Edit your project' : 'Submit your project';
  $('pjSubmitText').textContent = sub ? 'Save Changes' : 'Submit Project';
  const b = $('pjBadge');
  b.className = 'badge ' + (sub ? 'green' : 'amber');
  b.innerHTML = sub ? '<i class="fa-solid fa-circle-check"></i> Submitted' : '<i class="fa-solid fa-list-check"></i> Required';
  checkVideo();
}

function httpsUrl(v) {
  try {
    const u = new URL(String(v).trim());
    return u.protocol === 'https:' && u.hostname.indexOf('.') !== -1 ? u : null;
  } catch (_) {
    return null;
  }
}

function socialOk(v) {
  const u = httpsUrl(v);
  if (!u) return false;
  const h = u.hostname.toLowerCase();
  return SOCIAL_HOSTS.some((x) => h === x || h.endsWith('.' + x));
}

function checkVideo() {
  $('btnSubmitProject').disabled = submitting || !socialOk($('pjVideo').value);
}

function setErr(field, errId, msg) {
  $(field).classList.toggle('bad', Boolean(msg));
  const e = $(errId);
  e.textContent = msg || '';
  e.classList.toggle('show', Boolean(msg));
}

function pickPdf(file) {
  if (!file) return;
  const okType = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!okType) {
    setErr('fPdf', 'ePjPdf', 'Please choose a PDF file.');
    return;
  }
  if (file.size > MAX_PDF_BYTES) {
    setErr('fPdf', 'ePjPdf', 'This PDF is too large. The limit is 8 MB.');
    return;
  }
  setErr('fPdf', 'ePjPdf', '');
  pdfFile = file;
  $('pjPdfName').textContent = file.name;
  $('btnClearPdf').classList.remove('hidden');
}

function clearPdf() {
  pdfFile = null;
  $('pjPdfFile').value = '';
  $('pjPdfName').textContent = 'No PDF chosen';
  $('btnClearPdf').classList.add('hidden');
}

async function submitProject() {
  if (submitting || !item) return;
  setErr('fVideo', 'ePjVideo', '');
  setErr('fPdf', 'ePjPdf', '');
  setErr('fLink', 'ePjLink', '');
  $('pjError').classList.add('hidden');
  let bad = false;
  if (!socialOk($('pjVideo').value)) {
    setErr('fVideo', 'ePjVideo', 'Please paste the link of your video post from TikTok, Facebook, Instagram, YouTube or X. It must start with https.');
    bad = true;
  }
  const pdfLink = $('pjPdfLink').value.trim();
  const workLink = $('pjLink').value.trim();
  if (pdfLink && !httpsUrl(pdfLink)) {
    setErr('fPdf', 'ePjPdf', 'The PDF link is not valid. It must start with https.');
    bad = true;
  }
  if (workLink && !httpsUrl(workLink)) {
    setErr('fLink', 'ePjLink', 'The project link is not valid. It must start with https.');
    bad = true;
  }
  if (bad) return;
  submitting = true;
  checkVideo();
  miniLoad(pdfFile ? 'Uploading your PDF...' : 'Saving your project...');
  try {
    let pdfUrl = pdfLink;
    if (pdfFile) {
      const path = 'projects/' + user.id + '/' + item.id.replace(/[^A-Za-z0-9_-]/g, '') + '_' + Date.now() + '.pdf';
      const up = await supabase.storage.from(BUCKET).upload(path, pdfFile, { contentType: 'application/pdf', upsert: true });
      if (up.error) throw new Error('Could not upload your PDF. Please try again or paste a PDF link.');
      const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
      pdfUrl = pub && pub.data ? pub.data.publicUrl : '';
      if (!pdfUrl) throw new Error('Could not get the PDF link.');
      miniLoad('Saving your project...');
    }
    const res = await api({ action: 'submit', course_id: item.id, video_url: $('pjVideo').value.trim(), pdf_url: pdfUrl, work_url: workLink, note: $('pjNote').value.trim() });
    const edited = Boolean(item.submission);
    item.submission = res.submission;
    miniHide();
    showDone(edited);
  } catch (e) {
    miniHide();
    if (e.field === 'video_url') setErr('fVideo', 'ePjVideo', e.message);
    else if (e.field === 'pdf_url') setErr('fPdf', 'ePjPdf', e.message);
    else if (e.field === 'work_url') setErr('fLink', 'ePjLink', e.message);
    else {
      $('pjErrorText').textContent = e.message;
      $('pjError').classList.remove('hidden');
    }
  } finally {
    submitting = false;
    checkVideo();
  }
}

function showDone(edited) {
  showOnly('certDone');
  $('doneTitle').textContent = edited ? 'Changes saved!' : 'Congratulations!';
  const hasPhoto = Boolean(S.student.profile_url);
  $('doneMsg').textContent = hasPhoto
    ? 'Your project was submitted successfully. Please wait for your certificate. We will check your project and send your certificate to your email.'
    : 'Your project was submitted successfully. One step is left: please save your passport photo from the My Steps page so your certificate can be prepared.';
  $('btnEditProject').classList.toggle('hidden', Boolean(item.certificate));
  if (!hasPhoto) push('info', 'Photo Needed', 'Open My Steps and take your passport photo.');
}

function bind() {
  $('brandLink').addEventListener('click', () => { window.location.href = 'dashboard.html'; });
  $('certList').addEventListener('click', (e) => {
    const b = e.target.closest('.cert-item');
    if (b) select(S.items[Number(b.dataset.i)]);
  });
  $('certSteps').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'photo') openCamera();
    else if (b.dataset.act === 'project') openProject();
  });
  $('btnBackToList').addEventListener('click', showPicker);
  $('btnWhatsApp').addEventListener('click', () => window.open(WA1, '_blank', 'noopener'));
  $('btnSwitchCam').addEventListener('click', switchCamera);
  $('btnCapture').addEventListener('click', capture);
  $('btnCancelCam').addEventListener('click', cancelCamera);
  $('btnRetake').addEventListener('click', retake);
  $('btnSubmit').addEventListener('click', savePhoto);
  $('btnProjectBack').addEventListener('click', renderOverview);
  $('btnSubmitProject').addEventListener('click', submitProject);
  $('pjVideo').addEventListener('input', checkVideo);
  $('pjVideo').addEventListener('input', () => setErr('fVideo', 'ePjVideo', ''));
  $('btnPickPdf').addEventListener('click', () => $('pjPdfFile').click());
  $('pjPdfFile').addEventListener('change', (e) => pickPdf(e.target.files && e.target.files[0]));
  $('btnClearPdf').addEventListener('click', clearPdf);
  $('btnEditProject').addEventListener('click', openProject);
  $('btnDoneOverview').addEventListener('click', renderOverview);
  $('btnDoneWA1').addEventListener('click', () => window.open(WA1, '_blank', 'noopener'));
  $('btnDoneWA2').addEventListener('click', () => window.open(WA2, '_blank', 'noopener'));
  $('btnDoneDashboard').addEventListener('click', () => { window.location.href = 'dashboard.html'; });
  window.addEventListener('beforeunload', stopCamera);
}

function loadUser() {
  try {
    const raw = localStorage.getItem('idt_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u && u.id ? Object.assign({}, u, { id: String(u.id) }) : null;
  } catch (_) {
    return null;
  }
}

async function init() {
  document.documentElement.classList.add('ready');
  bind();
  user = loadUser();
  if (!user) {
    window.location.replace('register.html');
    return;
  }
  paramCourse = String(new URLSearchParams(window.location.search).get('course_id') || '').trim();
  await load();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

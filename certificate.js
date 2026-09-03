import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);
const BUCKET = 'forket';
const FACE_MODELS_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

let user = null;
let userData = null;
let profileRow = null;
let activeCourseId = '';
let latestPassed = null;
let stream = null;
let running = false;
let modelReady = false;
let facing = 'user';
let photoCanvas = null;
let photoBlob = null;
let submitted = false;

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function miniLoad(text) {
  const elText = $('miniLoaderText');
  const elLoader = $('miniLoader');
  if (elText) elText.textContent = text || 'Please wait...';
  if (elLoader) elLoader.classList.add('open');
}

function miniHide() {
  const elLoader = $('miniLoader');
  if (elLoader) elLoader.classList.remove('open');
}

function removePush(card) {
  card.classList.add('out');
  setTimeout(() => card.remove(), 320);
}

function pushShow(type, title, message, raw) {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const card = document.createElement('div');
  card.className = 'push-card ' + type;
  const rawHtml = raw ? '<small style="display:block;margin-top:6px;font-size:10.5px;color:#b45309;background:rgba(245,158,11,.1);border-radius:8px;padding:5px 8px;word-break:break-word">' + escapeHtml(raw) + '</small>' : '';
  card.innerHTML =
    '<img class="push-logo" src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy">' +
    '<div class="push-body"><b><i class="fa-solid ' + (icons[type] || icons.info) + '"></i> ' + escapeHtml(title) + '</b><p>' + escapeHtml(message) + '</p>' + rawHtml + '</div>' +
    '<button class="push-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  
  const closeBtn = card.querySelector('.push-x');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => removePush(card));
  }
  
  const wrap = $('pushWrap');
  if (wrap) wrap.appendChild(card);
  if (type === 'success') setTimeout(() => removePush(card), 6000);
  return card;
}

function formatDob(v) {
  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  return String(v);
}

async function fetchProfile() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Profile not found');

  profileRow = data;
  userData = typeof data.user_data === 'string' ? JSON.parse(data.user_data) : (data.user_data || {});
}

function renderDetails() {
  const name = userData.full_name || user.full_name || user.email || 'Student';
  const dob = userData.dob || userData.date_of_birth || userData.birth_date || userData.birthdate || '';
  const courseName = (latestPassed && latestPassed.course_name) || userData.course_name || 'Course';

  const elName = $('cfFullName');
  const elDob = $('cfDob');
  const elSub = $('certHeadSub');

  if (elName) elName.textContent = name;
  if (elDob) elDob.textContent = dob ? formatDob(dob) : 'Not set';
  if (elSub) elSub.textContent = courseName + ' • Congratulations on passing your final exam!';

  if (!dob) {
    pushShow('info', 'Date Of Birth Missing', 'Your date of birth is not on file. Contact customer care on WhatsApp to update it.');
  }
}

async function init() {
  const raw = localStorage.getItem('idt_user');
  if (!raw) {
    window.location.replace('register.html');
    return;
  }

  try {
    user = JSON.parse(raw);
  } catch (e) {
    localStorage.removeItem('idt_user');
    window.location.replace('register.html');
    return;
  }

  if (!user || !user.id) {
    localStorage.removeItem('idt_user');
    window.location.replace('register.html');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const cid = params.get('course_id') || user.course_id || '';
  const uid = params.get('user_id') || user.id || '';

  if (uid) user.id = uid;
  activeCourseId = cid;

  miniLoad('Loading your certificate...');

  try {
    await fetchProfile();
    const examData = Array.isArray(userData.exam_data) ? userData.exam_data : [];
    const passedEntries = examData.filter((e) => e.passed === true);

    if (!passedEntries.length) {
      window.location.replace('exam.html?course_id=' + encodeURIComponent(activeCourseId) + '&user_id=' + encodeURIComponent(user.id));
      return;
    }

    latestPassed = passedEntries[passedEntries.length - 1];
    renderDetails();
    miniHide();
  } catch (err) {
    miniHide();
    pushShow('error', 'Load Failed', 'Could not load your certificate details.', err.message || String(err));
  }
}

async function loadModels() {
  try {
    if (typeof faceapi !== 'undefined') {
      await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_URL);
      modelReady = true;
    } else {
      modelReady = false;
    }
  } catch (e) {
    modelReady = false;
    pushShow('info', 'Smart Detection Unavailable', 'Face detection could not load. You can still take your photo manually.');
  }
}

async function startCamera() {
  stopCamera();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera not supported on this device');
  }

  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 960 } },
    audio: false
  });

  const video = $('camVideo');
  if (video) {
    video.srcObject = stream;
    await video.play().catch(() => {});
  }

  if (!modelReady) {
    setFaceState(true, 'Camera ready. Take your photo.');
  } else {
    setFaceState(false, 'Detecting your face...');
  }
}

function stopCamera() {
  running = false;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  const video = $('camVideo');
  if (video && video.srcObject) {
    video.srcObject = null;
  }
}

function setFaceState(ok, text) {
  const wrap = $('camWrap');
  const status = $('faceStatus');
  const btn = $('btnCapture');

  if (wrap) {
    wrap.classList.toggle('ok', ok);
    wrap.classList.toggle('bad', !ok);
  }
  if (status) {
    status.classList.toggle('ok', ok);
    status.classList.toggle('bad', !ok);
    status.innerHTML = ok
      ? '<i class="fa-solid fa-circle-check"></i><span>' + escapeHtml(text) + '</span>'
      : '<i class="fa-solid fa-circle-xmark"></i><span>' + escapeHtml(text) + '</span>';
  }
  if (btn) btn.disabled = !ok;
}

async function detectionTick() {
  if (!running || !stream) return;

  try {
    const video = $('camVideo');
    if (modelReady && video && video.readyState >= 2 && typeof faceapi !== 'undefined') {
      const det = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }));
      if (det) {
        const box = det.box;
        const vw = video.videoWidth || 1;
        const vh = video.videoHeight || 1;
        const relW = box.width / vw;
        const relH = box.height / vh;
        const cx = (box.x + box.width / 2) / vw;
        const cy = (box.y + box.height / 2) / vh;
        const ok = relW >= 0.25 && relW <= 0.68 && relH >= 0.3 && relH <= 0.8 && cx >= 0.3 && cx <= 0.7 && cy >= 0.25 && cy <= 0.75;
        setFaceState(ok, ok ? 'Face detected. Perfect! Tap Take Photo.' : 'Position your face inside the frame.');
      } else {
        setFaceState(false, 'No face detected. Look at the camera.');
      }
    }
  } catch (e) {}

  if (running) {
    requestAnimationFrame(detectionTick);
  }
}

async function openCamera() {
  const elSample = $('certSample');
  const elPreview = $('certPreview');
  const elDone = $('certDone');
  const elPhoto = $('certPhoto');

  if (elSample) elSample.classList.add('hidden');
  if (elPreview) elPreview.classList.add('hidden');
  if (elDone) elDone.classList.add('hidden');
  if (elPhoto) elPhoto.classList.remove('hidden');

  facing = 'user';
  submitted = false;
  photoCanvas = null;
  photoBlob = null;

  setFaceState(false, 'Starting camera...');
  await loadModels();

  try {
    await startCamera();
    running = true;
    detectionTick();
  } catch (err) {
    pushShow('error', 'Camera Error', 'Could not start your camera. Please allow camera permission and try again.', err.message || String(err));
  }
}

async function switchCamera() {
  facing = facing === 'user' ? 'environment' : 'user';
  try {
    await startCamera();
    running = true;
    detectionTick();
  } catch (err) {
    pushShow('error', 'Camera Error', 'Could not switch camera.', err.message || String(err));
  }
}

function cancelCamera() {
  stopCamera();
  const elPhoto = $('certPhoto');
  const elSample = $('certSample');
  if (elPhoto) elPhoto.classList.add('hidden');
  if (elSample) elSample.classList.remove('hidden');
}

function capturePhoto() {
  const video = $('camVideo');
  if (!video || !video.videoWidth) return;

  const canvas = document.createElement('canvas');
  const w = video.videoWidth;
  const h = video.videoHeight;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (facing === 'user') {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  photoCanvas = canvas;

  const elPreviewImg = $('previewImg');
  if (elPreviewImg) elPreviewImg.src = canvas.toDataURL('image/jpeg', 0.92);

  stopCamera();

  const elPhoto = $('certPhoto');
  const elPreview = $('certPreview');
  if (elPhoto) elPhoto.classList.add('hidden');
  if (elPreview) elPreview.classList.remove('hidden');

  pushShow('success', 'Photo Captured', 'Your photo looks good. Tap Submit when you are ready.');
}

function retakePhoto() {
  const elPreview = $('certPreview');
  const elPhoto = $('certPhoto');
  if (elPreview) elPreview.classList.add('hidden');
  if (elPhoto) elPhoto.classList.remove('hidden');

  setFaceState(false, 'Starting camera...');
  startCamera().then(() => {
    running = true;
    detectionTick();
  }).catch((err) => {
    pushShow('error', 'Camera Error', 'Could not restart your camera.', err.message || String(err));
  });
}

async function submitPhoto() {
  if (submitted || !photoCanvas) return;
  submitted = true;

  miniLoad('Uploading your photo...');

  try {
    if (!photoBlob) {
      photoBlob = await new Promise((resolve) => photoCanvas.toBlob(resolve, 'image/jpeg', 0.92));
    }
    if (!photoBlob) throw new Error('Could not create image file');

    const fileName = 'cert_' + user.id + '_' + Date.now() + '.jpg';

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(fileName, photoBlob, {
      contentType: 'image/jpeg',
      upsert: true
    });

    if (upErr) throw upErr;

    const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    const profileUrl = pubData ? pubData.publicUrl : null;

    if (!profileUrl) throw new Error('Could not get photo link');

    const { error: upColErr } = await supabase.from('user_profiles')
      .update({ profile_url: profileUrl })
      .eq('id', user.id);

    if (upColErr) throw upColErr;

    const examData = Array.isArray(userData.exam_data) ? userData.exam_data : [];
    const newExamData = examData.map((e) => {
      if (e.passed === true && !e.profile_url) {
        return Object.assign({}, e, { profile_url: profileUrl });
      }
      return e;
    });

    userData.exam_data = newExamData;

    const { error: udErr } = await supabase.from('user_profiles')
      .update({ user_data: userData })
      .eq('id', user.id);

    if (udErr) throw udErr;

    if (user) {
      user.profile_url = profileUrl;
      localStorage.setItem('idt_user', JSON.stringify(user));
    }

    miniHide();

    const elPreview = $('certPreview');
    const elDone = $('certDone');
    if (elPreview) elPreview.classList.add('hidden');
    if (elDone) elDone.classList.remove('hidden');

    pushShow('success', 'Congratulations!', 'Your photo has been submitted successfully. Please wait for your certificate email.');
  } catch (err) {
    submitted = false;
    miniHide();
    pushShow('error', 'Upload Failed', 'Could not upload your photo. Please check your internet and try again.', err.message || String(err));
  }
}

function bindEvents() {
  const btnWhatsApp = $('btnWhatsApp');
  const btnOpenCamera = $('btnOpenCamera');
  const btnSwitchCam = $('btnSwitchCam');
  const btnCancelCam = $('btnCancelCam');
  const btnCapture = $('btnCapture');
  const btnRetake = $('btnRetake');
  const btnSubmit = $('btnSubmit');
  const btnDoneDashboard = $('btnDoneDashboard');

  if (btnWhatsApp) {
    btnWhatsApp.addEventListener('click', () => {
      window.open('https://wa.me/2347068818760', '_blank', 'noopener');
    });
  }
  if (btnOpenCamera) btnOpenCamera.addEventListener('click', openCamera);
  if (btnSwitchCam) btnSwitchCam.addEventListener('click', switchCamera);
  if (btnCancelCam) btnCancelCam.addEventListener('click', cancelCamera);
  if (btnCapture) btnCapture.addEventListener('click', capturePhoto);
  if (btnRetake) btnRetake.addEventListener('click', retakePhoto);
  if (btnSubmit) btnSubmit.addEventListener('click', submitPhoto);
  if (btnDoneDashboard) {
    btnDoneDashboard.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }
}

window.addEventListener('beforeunload', () => {
  stopCamera();
});

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('ready');
  bindEvents();
  init();
});
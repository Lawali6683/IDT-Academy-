import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);
const BUCKET = 'forket';
const API_URL = '/api/myCert';

let allProfiles = [];
let certificates = [];
let awaitingUsers = [];
let currentUser = null;
let currentCertId = '';
let currentPdfs = [];
let certSaved = false;
let pdfCount = 0;

function safeAddEventListener(id, event, handler) {
  const el = $(id);
  if (el) {
    el.addEventListener(event, handler);
  }
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function miniLoad(text) {
  const loaderText = $('miniLoaderText');
  const loader = $('miniLoader');
  if (loaderText) loaderText.textContent = text || 'Please wait...';
  if (loader) loader.classList.add('open');
}

function miniHide() {
  const loader = $('miniLoader');
  if (loader) loader.classList.remove('open');
}

function removePush(card) {
  card.classList.add('out');
  setTimeout(() => card.remove(), 320);
}

function pushShow(type, title, message, raw) {
  const pushWrap = $('pushWrap');
  if (!pushWrap) return null;
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
  pushWrap.appendChild(card);
  if (type === 'success') setTimeout(() => removePush(card), 6000);
  return card;
}

async function copyText(txt) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(txt);
  } else {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Could not read file'));
    r.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Could not load image'));
    im.src = src;
  });
}

function loadPdfLib() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => resolve(window.jspdf);
    s.onerror = () => reject(new Error('Could not load PDF library'));
    document.head.appendChild(s);
  });
}

function getProjectData(ud) {
  const pd = ud && ud.project_data;
  return pd && typeof pd === 'object' && pd.project_link ? pd : null;
}

function showDash() {
  if ($('loginView')) $('loginView').classList.add('hidden');
  if ($('dashView')) $('dashView').classList.remove('hidden');
  if ($('adminBadge')) $('adminBadge').classList.remove('hidden');
  if ($('btnLogout')) $('btnLogout').classList.remove('hidden');
  loadData();
}

function hideDash() {
  if ($('dashView')) $('dashView').classList.add('hidden');
  if ($('loginView')) $('loginView').classList.remove('hidden');
  if ($('adminBadge')) $('adminBadge').classList.add('hidden');
  if ($('btnLogout')) $('btnLogout').classList.add('hidden');
}

function startedCount(u) {
  const ud = u.user_data || {};
  const st = String(ud.status || '').toLowerCase();
  return !!(ud.course_id) || ['active', 'paid', 'started', 'completed'].indexOf(st) > -1;
}

function passedEntries(u) {
  const ud = u.user_data || {};
  const arr = Array.isArray(ud.exam_data) ? ud.exam_data : [];
  if (arr.length > 0) {
    return arr.filter((e) => e.passed === true);
  }
  if (ud.certificate_issued === true || String(ud.status).toLowerCase() === 'completed') {
    return [{ date: ud.date_registered || new Date().toISOString(), score: 100, pct: ud.exam_grade || 100, passed: true }];
  }
  return [];
}

function lastPassed(u) {
  const arr = passedEntries(u);
  return arr.length ? arr[arr.length - 1] : null;
}

function completedUsers() {
  return allProfiles.filter((p) => passedEntries(p).length > 0);
}

async function loadData() {
  miniLoad('Loading certificate data...');
  try {
    const profRes = await supabase.from('user_profiles').select('id, user_data');
    if (profRes.error) throw profRes.error;
    const certRes = await supabase.from('certificate').select('id, certificate_data');
    if (certRes.error) throw certRes.error;
    allProfiles = profRes.data || [];
    certificates = certRes.data || [];
    renderStats();
    buildAwaiting();
    renderAwaiting();
    miniHide();
  } catch (err) {
    miniHide();
    pushShow('error', 'Load Failed', 'Could not load the data. Your account may not have permission to view this page.', err.message || String(err));
  }
}

function renderStats() {
  if ($('statRegistered')) $('statRegistered').textContent = allProfiles.length;
  if ($('statStarted')) $('statStarted').textContent = allProfiles.filter(startedCount).length;
  if ($('statCompleted')) $('statCompleted').textContent = completedUsers().length;
}

function buildAwaiting() {
  const certUserIds = new Set();
  certificates.forEach((c) => {
    const cd = c.certificate_data || {};
    if (cd.user_id) certUserIds.add(cd.user_id);
  });

  awaitingUsers = completedUsers()
    .filter((p) => !certUserIds.has(p.id))
    .map((p) => ({ profile: p, last: lastPassed(p) }))
    .sort((a, b) => {
      const pa = getProjectData(a.profile.user_data) ? 1 : 0;
      const pb = getProjectData(b.profile.user_data) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return new Date((b.last && b.last.date) || 0) - new Date((a.last && a.last.date) || 0);
    });
}

function renderAwaiting() {
  const list = $('awaitList');
  const empty = $('awaitEmpty');
  if ($('statAwaiting')) $('statAwaiting').textContent = awaitingUsers.length;
  if (!list) return;
  if (!awaitingUsers.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  list.innerHTML = awaitingUsers.map((a, idx) => {
    const p = a.profile;
    const ud = p.user_data || {};
    const img = ud.profile_url || ud.avatar_url || 'https://i.imgur.com/oyqM5oF.png';
    const grade = a.last && a.last.pct != null ? a.last.pct + '%' : '—';
    const pd = getProjectData(ud);
    const projBadge = pd
      ? '<span class="badge green"><i class="fa-solid fa-diagram-project"></i> Project Done</span>'
      : '<span class="badge rose"><i class="fa-solid fa-hourglass-half"></i> No Project</span>';
    return '<div class="await-item">' +
      '<img class="ai-img" src="' + img + '" alt="Student">' +
      '<div class="ai-info"><b>' + escapeHtml(ud.full_name || 'Student') + '</b>' +
      '<span>' + escapeHtml(ud.email || 'No email') + ' • Completed ' + escapeHtml(a.last ? formatDate(a.last.date) : '—') + '</span></div>' +
      '<span class="badge green"><i class="fa-solid fa-star"></i> ' + escapeHtml(String(grade)) + '</span>' +
      projBadge +
      '<button class="btn-view" data-idx="' + idx + '"><i class="fa-solid fa-eye"></i> View</button>' +
      '</div>';
  }).join('');
}

function renderHistory(ud) {
  const arr = Array.isArray(ud.exam_data) ? ud.exam_data : [];
  const box = $('histList');
  if (!box) return;
  if (!arr.length) {
    box.innerHTML = '<div class="hist-none">No exam history found for this student.</div>';
    return;
  }
  box.innerHTML = arr.slice().reverse().map((h) => {
    const ok = h.passed === true;
    return '<div class="hist-row">' +
      '<i class="fa-solid ' + (ok ? 'fa-circle-check' : 'fa-circle-xmark') + '" style="color:' + (ok ? '#10b981' : '#f43f5e') + '"></i>' +
      '<div><b>' + escapeHtml(formatDate(h.date)) + '</b><span>Score: ' + Number(h.score || 0).toFixed(1) + ' • ' + Number(h.pct || 0) + '%</span></div>' +
      '<span class="badge ' + (ok ? 'green' : 'rose') + '">' + (ok ? 'Passed' : 'Failed') + '</span>' +
      '</div>';
  }).join('');
}

function renderProject(ud) {
  const box = $('projContent');
  if (!box) return;

  const pd = getProjectData(ud);
  if (!pd) {
    box.innerHTML = '<div class="hist-none">No final project submitted yet by this student.</div>';
    return;
  }

  const isVideo = pd.project_type === 'video';
  const topics = Array.isArray(pd.topics) ? pd.topics : [];
  const topicsHtml = topics.length
    ? '<div class="topics-row">' + topics.map((t) => '<span class="topic-chip">' + escapeHtml(t) + '</span>').join('') + '</div>'
    : '';

  box.innerHTML =
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
    '<span class="badge ' + (isVideo ? 'cyan' : 'violet') + '"><i class="fa-solid ' + (isVideo ? 'fa-video' : 'fa-globe') + '"></i> ' + (isVideo ? 'Video Project' : 'Link Project') + '</span>' +
    '<span class="badge ' + (String(pd.status) === 'pending' ? 'green' : 'violet') + '"><i class="fa-solid fa-hourglass-half"></i> ' + escapeHtml(String(pd.status || 'pending')) + '</span>' +
    '</div>' +
    '<div class="proj-title">' + escapeHtml(pd.project_title || 'Final Project') + '</div>' +
    '<div class="proj-desc">' + escapeHtml(pd.project_description || '') + '</div>' +
    '<div class="proj-link">' +
    '<i class="fa-solid fa-link" style="color:var(--violet-d);flex-shrink:0"></i>' +
    '<span>' + escapeHtml(pd.project_link) + '</span>' +
    '<a class="btn-view" href="' + escapeHtml(pd.project_link) + '" target="_blank" rel="noopener"><i class="fa-solid fa-up-right-from-square"></i> Open</a>' +
    '<button class="copy-btn" data-copy="project"><i class="fa-solid fa-copy"></i> Copy Link</button>' +
    '</div>' +
    (pd.submitted_at
      ? '<div class="hist-row"><i class="fa-solid fa-clock" style="color:var(--violet-d)"></i><div><b>' + escapeHtml(formatDate(pd.submitted_at)) + '</b><span>Project submitted by ' + escapeHtml(pd.full_name || ud.full_name || 'student') + ' • Course: ' + escapeHtml(pd.course_name || ud.course_name || '—') + '</span></div></div>'
      : '') +
    topicsHtml;
}

function openView(idx) {
  const item = awaitingUsers[idx];
  if (!item) return;
  currentUser = item;
  const p = item.profile;
  const ud = p.user_data || {};
  const lp = item.last;
  if ($('viewAvatar')) $('viewAvatar').src = ud.profile_url || ud.avatar_url || 'https://i.imgur.com/oyqM5oF.png';
  if ($('vName')) $('vName').textContent = ud.full_name || 'Student';
  if ($('vEmail')) $('vEmail').textContent = ud.email || '—';
  if ($('vGrade')) $('vGrade').textContent = lp && lp.pct != null ? lp.pct + '%' : '—';
  if ($('vCourse')) $('vCourse').textContent = ud.course_name || '—';
  if ($('vCourseNum')) $('vCourseNum').textContent = ud.course_number || '—';
  if ($('vDateDone')) $('vDateDone').textContent = lp ? formatDate(lp.date) : '—';
  renderHistory(ud);
  renderProject(ud);
  currentCertId = '';
  currentPdfs = [];
  certSaved = false;
  pdfCount = 0;
  if ($('genCertId')) $('genCertId').textContent = 'Not generated yet';
  if ($('qrBox')) $('qrBox').innerHTML = '<div class="qr-hint">Generate an ID first to see the QR code. Scanning it opens the public verification slip.</div>';
  if ($('uploadList')) $('uploadList').innerHTML = '';
  if ($('pdfList')) $('pdfList').innerHTML = '';
  if ($('btnSaveCert')) $('btnSaveCert').classList.remove('done');
  if ($('viewOverlay')) $('viewOverlay').classList.add('open');
}

function copySources() {
  const ud = currentUser ? (currentUser.profile.user_data || {}) : {};
  const pd = getProjectData(ud);
  return {
    name: ud.full_name || '',
    course: ud.course_name || '',
    num: ud.course_number || '',
    project: pd ? pd.project_link : '',
    diploma: 'Diploma in ' + (ud.course_name || 'Information Technology') + ' — IDT Academy'
  };
}

async function generateId() {
  miniLoad('Generating a unique certificate ID...');
  try {
    let id = '';
    for (let i = 0; i < 20; i++) {
      const n = Math.floor(100000 + Math.random() * 900000);
      const cand = 'IDT/A/' + n;
      const { data, error } = await supabase.from('certificate').select('id').eq('id', cand).maybeSingle();
      if (error) throw error;
      if (!data) {
        id = cand;
        break;
      }
    }
    if (!id) throw new Error('Could not generate a unique ID');
    currentCertId = id;
    if ($('genCertId')) $('genCertId').textContent = id;
    const qrBox = $('qrBox');
    if (qrBox) {
      qrBox.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrBox, {
          text: 'https://www.idtacademy.com.ng/slip/' + id,
          width: 200,
          height: 200,
          colorDark: '#1e1b4b',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
      }
    }
    miniHide();
    pushShow('success', 'Certificate ID Ready', id + ' • QR code generated. Scan it with any phone to open the slip.');
  } catch (err) {
    miniHide();
    pushShow('error', 'ID Generation Failed', 'Please try again.', err.message || String(err));
  }
}

function downloadQr() {
  const qrBox = $('qrBox');
  const c = qrBox ? qrBox.querySelector('canvas') : null;
  if (!c) {
    pushShow('error', 'No QR Yet', 'Generate a certificate ID first.', '');
    return;
  }
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = (currentCertId || 'certificate').replace(/[\/\\]/g, '_') + '_qr.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  pushShow('success', 'QR Downloaded', 'The QR code was saved to your device.');
}

async function uploadFiles(files) {
  if (!currentUser) return;
  const uploadList = $('uploadList');
  for (const file of files) {
    const item = document.createElement('div');
    item.className = 'up-item';
    item.innerHTML = '<span class="up-spin"></span><span class="up-name">' + escapeHtml(file.name) + '</span><span class="up-status">Converting...</span>';
    if (uploadList) uploadList.appendChild(item);
    try {
      const dataUrl = await readAsDataURL(file);
      const img = await loadImage(dataUrl);
      await loadPdfLib();
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: img.naturalWidth > img.naturalHeight ? 'l' : 'p',
        unit: 'mm',
        format: 'a4'
      });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const ratio = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
      const w = img.naturalWidth * ratio;
      const h = img.naturalHeight * ratio;
      doc.addImage(dataUrl, 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);
      const blob = doc.output('blob');
      const path = 'cert/' + currentUser.profile.id + '/pdf_' + Date.now() + '_' + (pdfCount++) + '.pdf';
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'application/pdf', upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      currentPdfs.push(pub.publicUrl);
      const spin = item.querySelector('.up-spin');
      const status = item.querySelector('.up-status');
      if (spin) spin.remove();
      if (status) status.textContent = '✔ Done';
      item.classList.add('ok');
      renderPdfList();
    } catch (err) {
      const spin = item.querySelector('.up-spin');
      const status = item.querySelector('.up-status');
      if (spin) spin.remove();
      if (status) status.textContent = '✖ Failed';
      item.classList.add('bad');
      pushShow('error', 'Conversion Failed', file.name, err.message || String(err));
    }
  }
}

function renderPdfList() {
  const box = $('pdfList');
  if (!box) return;
  if (!currentPdfs.length) {
    box.innerHTML = '<div class="pdf-none">No PDFs yet. Upload certificate images above.</div>';
    return;
  }
  box.innerHTML = currentPdfs.map((url, i) => {
    return '<div class="pdf-item"><i class="fa-solid fa-file-pdf"></i><span>Certificate PDF ' + (i + 1) + '</span>' +
      '<button class="btn-view" data-pdf="' + i + '"><i class="fa-solid fa-eye"></i> View</button></div>';
  }).join('');
}

async function saveCertificate() {
  if (!currentUser) return;
  if (!currentCertId) {
    pushShow('error', 'ID Required', 'Generate a certificate ID first.', '');
    return;
  }
  if (!currentPdfs.length) {
    pushShow('error', 'PDFs Required', 'Upload at least one certificate image and wait for the PDF.', '');
    return;
  }
  miniLoad('Saving certificate record...');
  try {
    const p = currentUser.profile;
    const ud = p.user_data || {};
    const lp = currentUser.last;
    const pd = getProjectData(ud);
    const row = {
      id: currentCertId,
      certificate_data: {
        user_id: p.id,
        full_name: ud.full_name || '',
        email: ud.email || '',
        course_name: ud.course_name || '',
        course_number: ud.course_number || '',
        grade: lp && lp.pct != null ? lp.pct : '',
        date_completed: lp ? lp.date : '',
        date_generated: new Date().toISOString(),
        referral_link: ud.referral_link || '',
        profile_url: ud.profile_url || ud.avatar_url || '',
        project_title: pd ? pd.project_title || '' : '',
        project_type: pd ? pd.project_type || '' : '',
        project_link: pd ? pd.project_link || '' : '',
        project_submitted_at: pd ? pd.submitted_at || '' : '',
        pdfs: currentPdfs.slice()
      }
    };
    const { error } = await supabase.from('certificate').upsert(row, { onConflict: 'id' });
    if (error) throw error;

    const updatedUserData = Object.assign({}, ud, { certificate_issued: true });
    await supabase.from('user_profiles').update({ user_data: updatedUserData }).eq('id', p.id);

    certSaved = true;
    miniHide();
    pushShow('success', 'Certificate Saved', currentCertId + ' has been saved. You can now send it to the student.');
  } catch (err) {
    miniHide();
    pushShow('error', 'Save Failed', 'Your account may not have permission to save certificates.', err.message || String(err));
  }
}

async function sendCertificate() {
  if (!currentUser) return;
  if (!certSaved) {
    pushShow('error', 'Not Saved Yet', 'Save the certificate before sending.', '');
    return;
  }
  miniLoad('Sending certificate to student email...');
  try {
    const p = currentUser.profile;
    const ud = p.user_data || {};
    const lp = currentUser.last;
    const pd = getProjectData(ud);
    const payload = {
      full_name: ud.full_name || '',
      email: ud.email || '',
      course_name: ud.course_name || '',
      course_number: ud.course_number || '',
      grade: lp && lp.pct != null ? lp.pct : '',
      cert_id: currentCertId,
      referral_link: ud.referral_link || '',
      profile_url: ud.profile_url || ud.avatar_url || '',
      project_title: pd ? pd.project_title || '' : '',
      project_link: pd ? pd.project_link || '' : '',
      pdfs: currentPdfs.slice()
    };
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data && data.error) || 'Send failed');
    miniHide();
    pushShow('success', 'Certificate Sent!', (ud.email || 'The student') + ' will receive their certificate email shortly.');
    awaitingUsers = awaitingUsers.filter((a) => a.profile.id !== p.id);
    renderAwaiting();
    if ($('viewOverlay')) $('viewOverlay').classList.remove('open');
  } catch (err) {
    miniHide();
    pushShow('error', 'Send Failed', 'Please check your connection and try again.', err.message || String(err));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  safeAddEventListener('togglePass', 'click', () => {
    const inp = $('loginPass');
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    const toggleBtn = $('togglePass');
    if (toggleBtn) {
      toggleBtn.innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    }
  });

  safeAddEventListener('loginBtn', 'click', async () => {
    const emailEl = $('loginEmail');
    const passEl = $('loginPass');
    const errBox = $('loginErr');
    const email = emailEl ? emailEl.value.trim().toLowerCase() : '';
    const pass = passEl ? passEl.value : '';
    if (errBox) errBox.classList.add('hidden');
    if (!email || !pass) {
      if (errBox) {
        errBox.textContent = 'Please enter your email and password.';
        errBox.classList.remove('hidden');
      }
      return;
    }
    miniLoad('Signing you in...');
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: pass
      });

      if (authError || !authData.user) {
        miniHide();
        if (errBox) {
          errBox.textContent = authError ? authError.message : 'Incorrect email or password.';
          errBox.classList.remove('hidden');
        }
        return;
      }

      miniHide();
      pushShow('success', 'Welcome', 'Signed in as ' + email);
      showDash();
    } catch (err) {
      miniHide();
      if (errBox) {
        errBox.textContent = 'Sign-in failed. Please try again.';
        errBox.classList.remove('hidden');
      }
      pushShow('error', 'Login Failed', err.message || String(err));
    }
  });

  safeAddEventListener('loginForm', 'submit', (e) => {
    e.preventDefault();
    const loginBtn = $('loginBtn');
    if (loginBtn) loginBtn.click();
  });

  safeAddEventListener('btnLogout', 'click', async () => {
    await supabase.auth.signOut();
    hideDash();
    if ($('loginEmail')) $('loginEmail').value = '';
    if ($('loginPass')) $('loginPass').value = '';
    if ($('loginErr')) $('loginErr').classList.add('hidden');
    pushShow('info', 'Signed Out', 'You have been logged out.');
  });

  safeAddEventListener('btnHome', 'click', () => {
    window.location.href = 'https://www.idtacademy.com.ng';
  });

  safeAddEventListener('btnRefresh', 'click', () => {
    loadData();
    pushShow('info', 'Refreshing', 'Reloading student data from the server...');
  });

  safeAddEventListener('btnViewBack', 'click', () => {
    if ($('viewOverlay')) $('viewOverlay').classList.remove('open');
  });

  safeAddEventListener('viewClose', 'click', () => {
    if ($('viewOverlay')) $('viewOverlay').classList.remove('open');
  });

  safeAddEventListener('viewOverlay', 'click', (e) => {
    if (e.target === $('viewOverlay')) $('viewOverlay').classList.remove('open');
  });

  safeAddEventListener('awaitList', 'click', (e) => {
    const btn = e.target.closest('.btn-view');
    if (!btn) return;
    openView(parseInt(btn.dataset.idx, 10));
  });

  safeAddEventListener('copyRow', 'click', async (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const src = copySources();
    const key = btn.dataset.copy;
    if (!src[key]) {
      pushShow('error', 'Nothing to Copy', 'This field is empty for this student.', '');
      return;
    }
    try {
      await copyText(src[key]);
      pushShow('success', 'Copied!', src[key].slice(0, 90) + (src[key].length > 90 ? '…' : ''));
    } catch (err) {
      pushShow('error', 'Copy Failed', err.message || String(err));
    }
  });

  safeAddEventListener('projContent', 'click', async (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const src = copySources();
    const key = btn.dataset.copy;
    if (!src[key]) {
      pushShow('error', 'Nothing to Copy', 'This field is empty for this student.', '');
      return;
    }
    try {
      await copyText(src[key]);
      btn.classList.add('done');
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
      setTimeout(() => {
        btn.classList.remove('done');
        btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Link';
      }, 2000);
      pushShow('success', 'Copied!', src[key].slice(0, 90) + (src[key].length > 90 ? '…' : ''));
    } catch (err) {
      pushShow('error', 'Copy Failed', err.message || String(err));
    }
  });

  safeAddEventListener('btnGenId', 'click', generateId);
  safeAddEventListener('btnQr', 'click', downloadQr);

  safeAddEventListener('btnPickFiles', 'click', () => {
    const fileInput = $('fileInput');
    if (fileInput) fileInput.click();
  });

  safeAddEventListener('fileInput', 'change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      uploadFiles(files);
      e.target.value = '';
    }
  });

  safeAddEventListener('pdfList', 'click', (e) => {
    const btn = e.target.closest('.btn-view');
    if (!btn) return;
    const idx = parseInt(btn.dataset.pdf, 10);
    const url = currentPdfs[idx];
    if (!url) return;
    if ($('pdfFrame')) $('pdfFrame').src = url;
    if ($('pdfOverlay')) $('pdfOverlay').classList.add('open');
  });

  safeAddEventListener('pdfClose', 'click', () => {
    if ($('pdfOverlay')) $('pdfOverlay').classList.remove('open');
    if ($('pdfFrame')) $('pdfFrame').src = 'about:blank';
  });

  safeAddEventListener('pdfOverlay', 'click', (e) => {
    if (e.target === $('pdfOverlay')) {
      $('pdfOverlay').classList.remove('open');
      if ($('pdfFrame')) $('pdfFrame').src = 'about:blank';
    }
  });

  safeAddEventListener('btnSaveCert', 'click', saveCertificate);
  safeAddEventListener('btnSendCert', 'click', sendCertificate);

  (async function init() {
    try {
      const { data } = await supabase.auth.getSession();
      if (data && data.session && data.session.user) {
        showDash();
        return;
      }
    } catch (err) {}
    hideDash();
  })();

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      hideDash();
    }
  });
});
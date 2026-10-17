import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);
const BUCKET = 'forket';
const API_URL = '/api/myCert';

let allProfiles = [];
let certificates = [];
let awaiting = [];
let current = null;
let currentCertId = '';
let currentPdfs = [];
let certSaved = false;
let pdfCount = 0;
let uploading = 0;

function on(id, event, handler) {
  const el = $(id);
  if (el) el.addEventListener(event, handler);
}

function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function miniLoad(text) {
  const t = $('miniLoaderText');
  const l = $('miniLoader');
  if (t) t.textContent = text || 'Please wait...';
  if (l) l.classList.add('open');
}

function miniHide() {
  const l = $('miniLoader');
  if (l) l.classList.remove('open');
}

function removePush(card) {
  card.classList.add('out');
  setTimeout(() => card.remove(), 320);
}

function pushShow(type, title, message, raw) {
  const wrap = $('pushWrap');
  if (!wrap) return null;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const card = document.createElement('div');
  card.className = 'push-card ' + type;
  const rawHtml = raw ? '<small style="display:block;margin-top:6px;font-size:10.5px;color:#b45309;background:rgba(245,158,11,.1);border-radius:8px;padding:5px 8px;word-break:break-word">' + esc(raw) + '</small>' : '';
  card.innerHTML = '<img class="push-logo" src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy"><div class="push-body"><b><i class="fa-solid ' + (icons[type] || icons.info) + '"></i> ' + esc(title) + '</b><p>' + esc(message) + '</p>' + rawHtml + '</div><button class="push-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  const closeBtn = card.querySelector('.push-x');
  if (closeBtn) closeBtn.addEventListener('click', () => removePush(card));
  wrap.appendChild(card);
  setTimeout(() => removePush(card), type === 'error' ? 9000 : 6000);
  return card;
}

async function copyText(txt) {
  const value = String(txt == null ? '' : txt);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch (_) {}
  const ta = document.createElement('textarea');
  ta.value = value;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
  ta.remove();
  if (!ok) throw new Error('Copy is not supported on this device');
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
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => (window.jspdf && window.jspdf.jsPDF ? resolve(window.jspdf) : reject(new Error('PDF library not available')));
    s.onerror = () => reject(new Error('Could not load PDF library'));
    document.head.appendChild(s);
  });
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

function startedCount(p) {
  const ud = p.user_data || {};
  const st = String(ud.status || '').toLowerCase();
  return Boolean(ud.course_id) || ['active', 'paid', 'started', 'completed'].indexOf(st) > -1;
}

function projectOf(ud, courseId, legacyAllowed) {
  const map = ud.projects && typeof ud.projects === 'object' ? ud.projects : {};
  if (map[courseId] && typeof map[courseId] === 'object') return map[courseId];
  const pd = ud.project_data;
  if (legacyAllowed && pd && typeof pd === 'object' && pd.project_link) {
    return {
      project_title: pd.project_title || '',
      video_url: pd.project_type === 'video' ? pd.project_link : '',
      work_url: pd.project_type === 'video' ? '' : pd.project_link,
      pdf_url: '',
      note: pd.project_description || '',
      status: pd.status || 'pending',
      submitted_at: pd.submitted_at || '',
      edited_at: '',
      edit_count: 0
    };
  }
  return null;
}

function finalEntries(p) {
  const ud = p.user_data || {};
  const out = [];
  const res = ud.exam_results && typeof ud.exam_results === 'object' ? ud.exam_results : {};
  Object.keys(res).forEach((cid) => {
    const r = res[cid] || {};
    out.push({
      course_id: cid,
      course_name: r.course_name || ud.course_name || '',
      course_number: r.course_number || '',
      grade: Number(r.score),
      year1: r.year1_score,
      diploma: r.diploma === true,
      date: r.date || ud.exam_date || ''
    });
  });
  if (out.length) return out;
  const old = Array.isArray(ud.exam_data) ? ud.exam_data.filter((e) => e && e.passed === true) : [];
  if (old.length) {
    const last = old[old.length - 1];
    out.push({ course_id: String(ud.course_id || ''), course_name: ud.course_name || '', course_number: ud.course_number || '', grade: Number(last.pct != null ? last.pct : last.score), diploma: false, date: last.date || '', legacy: true });
    return out;
  }
  if (String(ud.level_completed) === 'final' && isFinite(Number(ud.exam_grade))) {
    out.push({ course_id: String(ud.course_id || ''), course_name: ud.course_name || '', course_number: ud.course_number || '', grade: Number(ud.exam_grade), diploma: false, date: ud.exam_date || ud.date_complet || '', legacy: true });
  }
  return out;
}

function certMatches(row, entry, userId) {
  const cd = row && row.certificate_data ? row.certificate_data : {};
  if (cd.user_id !== userId) return false;
  if (cd.course_id) return String(cd.course_id) === String(entry.course_id);
  return String(cd.course_name || '').toLowerCase() === String(entry.course_name || '').toLowerCase();
}

function buildAwaiting() {
  const list = [];
  allProfiles.forEach((p) => {
    finalEntries(p).forEach((entry) => {
      if (certificates.some((c) => certMatches(c, entry, p.id))) return;
      const ud = p.user_data || {};
      list.push({ profile: p, entry: entry, project: projectOf(ud, entry.course_id, entry.legacy === true) });
    });
  });
  list.sort((a, b) => {
    const pa = a.project ? 1 : 0;
    const pb = b.project ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return new Date(b.entry.date || 0) - new Date(a.entry.date || 0);
  });
  awaiting = list;
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
  if ($('statCompleted')) $('statCompleted').textContent = allProfiles.filter((p) => finalEntries(p).length > 0).length;
}

function renderAwaiting() {
  const list = $('awaitList');
  const empty = $('awaitEmpty');
  if ($('statAwaiting')) $('statAwaiting').textContent = awaiting.length;
  if (!list) return;
  if (!awaiting.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  list.innerHTML = awaiting.map((a, idx) => {
    const ud = a.profile.user_data || {};
    const img = ud.profile_url || ud.avatar_url || 'https://i.imgur.com/oyqM5oF.png';
    const grade = isFinite(a.entry.grade) ? a.entry.grade.toFixed(1) + '%' : '—';
    const proj = a.project
      ? '<span class="badge green"><i class="fa-solid fa-diagram-project"></i> Project Done</span>'
      : '<span class="badge rose"><i class="fa-solid fa-hourglass-half"></i> No Project</span>';
    const photo = ud.profile_url || ud.avatar_url
      ? '<span class="badge green"><i class="fa-solid fa-camera"></i> Photo</span>'
      : '<span class="badge rose"><i class="fa-solid fa-camera"></i> No Photo</span>';
    return '<div class="await-item"><img class="ai-img" src="' + esc(img) + '" alt="Student">' +
      '<div class="ai-info"><b>' + esc(ud.full_name || 'Student') + '</b><span>' + esc(a.entry.course_name || '—') + ' • ' + esc(ud.email || 'No email') + ' • ' + esc(formatDate(a.entry.date)) + '</span></div>' +
      '<span class="badge green"><i class="fa-solid fa-star"></i> ' + esc(grade) + '</span>' + proj + photo +
      '<button class="btn-view" data-idx="' + idx + '"><i class="fa-solid fa-eye"></i> View</button></div>';
  }).join('');
}

function setHist(html) {
  const box = $('histList');
  if (box) box.innerHTML = html;
}

async function renderHistory(a) {
  const ud = a.profile.user_data || {};
  setHist('<div class="hist-none">Loading exam history...</div>');
  let rows = [];
  try {
    const res = await supabase.from('update').select('uset_update').eq('id', a.profile.id).maybeSingle();
    const ex = res && res.data && res.data.uset_update ? res.data.uset_update.exam : null;
    if (ex && ex.records) {
      Object.keys(ex.records).forEach((k) => {
        if (k.indexOf(a.entry.course_id + '__') === 0) rows = rows.concat(ex.records[k]);
      });
    }
  } catch (_) {}
  rows.sort((x, y) => new Date(y.date || 0) - new Date(x.date || 0));
  if (rows.length) {
    setHist(rows.map((h) => {
      const ok = h.passed === true;
      return '<div class="hist-row"><i class="fa-solid ' + (ok ? 'fa-circle-check' : 'fa-circle-xmark') + '" style="color:' + (ok ? '#10b981' : '#f43f5e') + '"></i><div><b>' + esc(formatDate(h.date)) + (h.year ? ' • Year ' + esc(h.year) : '') + '</b><span>Score: ' + Number(h.score || 0).toFixed(1) + ' / 100' + (h.deduction ? ' • Screenshot deduction: ' + h.deduction : '') + ' • Leaves: ' + (h.leaves || 0) + '</span></div><span class="badge ' + (ok ? 'green' : 'rose') + '">' + (ok ? 'Passed' : 'Failed') + '</span></div>';
    }).join(''));
    return;
  }
  const parts = [];
  if (a.entry.year1 != null && isFinite(Number(a.entry.year1))) parts.push('<div class="hist-row"><i class="fa-solid fa-circle-check" style="color:#10b981"></i><div><b>Diploma Year 1</b><span>Score: ' + Number(a.entry.year1).toFixed(1) + ' / 100</span></div><span class="badge green">Passed</span></div>');
  parts.push('<div class="hist-row"><i class="fa-solid fa-circle-check" style="color:#10b981"></i><div><b>' + esc(formatDate(a.entry.date)) + '</b><span>Final grade: ' + (isFinite(a.entry.grade) ? a.entry.grade.toFixed(1) : '—') + ' / 100</span></div><span class="badge green">Passed</span></div>');
  setHist(parts.join(''));
}

function linkRow(icon, label, url, key) {
  if (!url) return '<div class="proj-link"><i class="fa-solid ' + icon + '" style="color:var(--muted);flex-shrink:0"></i><span style="color:var(--muted)">' + esc(label) + ': not provided</span></div>';
  return '<div class="proj-link"><i class="fa-solid ' + icon + '" style="color:var(--violet-d);flex-shrink:0"></i><span><b>' + esc(label) + ':</b> ' + esc(url) + '</span>' +
    '<a class="btn-view" href="' + esc(url) + '" target="_blank" rel="noopener"><i class="fa-solid fa-up-right-from-square"></i> Open</a>' +
    '<button class="copy-btn" data-copy="' + key + '"><i class="fa-solid fa-copy"></i> Copy</button></div>';
}

function renderProject(a) {
  const box = $('projContent');
  if (!box) return;
  const pd = a.project;
  if (!pd) {
    box.innerHTML = '<div class="hist-none">No final project submitted yet by this student.</div>';
    return;
  }
  box.innerHTML =
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
    '<span class="badge cyan"><i class="fa-solid fa-video"></i> Video Project</span>' +
    '<span class="badge violet"><i class="fa-solid fa-hourglass-half"></i> ' + esc(String(pd.status || 'pending')) + '</span>' +
    (pd.project_theme ? '<span class="badge violet"><i class="fa-solid fa-tag"></i> ' + esc(pd.project_theme) + '</span>' : '') +
    (pd.edit_count ? '<span class="badge green"><i class="fa-solid fa-pen"></i> Edited ' + esc(pd.edit_count) + ' time(s)</span>' : '') + '</div>' +
    '<div class="proj-title">' + esc(pd.project_title || 'Final Project') + '</div>' +
    (pd.note ? '<div class="proj-desc">' + esc(pd.note) + '</div>' : '') +
    linkRow('fa-video', 'Video', pd.video_url, 'video') +
    linkRow('fa-file-pdf', 'PDF', pd.pdf_url, 'pdf') +
    linkRow('fa-globe', 'Project link', pd.work_url, 'work') +
    '<div class="hist-row"><i class="fa-solid fa-clock" style="color:var(--violet-d)"></i><div><b>' + esc(formatDate(pd.submitted_at)) + '</b><span>Submitted' + (pd.edited_at ? ' • Last edited ' + esc(formatDate(pd.edited_at)) : '') + ' • Course: ' + esc(a.entry.course_name || '—') + '</span></div></div>';
}

function copySources() {
  if (!current) return {};
  const ud = current.profile.user_data || {};
  const pd = current.project || {};
  return {
    name: ud.full_name || '',
    course: current.entry.course_name || ud.course_name || '',
    num: current.entry.course_number || ud.course_number || '',
    project: pd.video_url || pd.work_url || pd.pdf_url || '',
    video: pd.video_url || '',
    pdf: pd.pdf_url || '',
    work: pd.work_url || '',
    diploma: 'Diploma in ' + (current.entry.course_name || ud.course_name || 'Information Technology') + ' — IDT Academy'
  };
}

function openView(idx) {
  const a = awaiting[idx];
  if (!a) return;
  current = a;
  const ud = a.profile.user_data || {};
  const set = (id, v) => {
    if ($(id)) $(id).textContent = v;
  };
  if ($('viewAvatar')) $('viewAvatar').src = ud.profile_url || ud.avatar_url || 'https://i.imgur.com/oyqM5oF.png';
  set('vName', ud.full_name || 'Student');
  set('vEmail', ud.email || '—');
  set('vGrade', isFinite(a.entry.grade) ? a.entry.grade.toFixed(1) + '%' : '—');
  set('vCourse', a.entry.course_name || '—');
  set('vCourseNum', a.entry.course_number || ud.course_number || '—');
  set('vDateDone', formatDate(a.entry.date));
  renderHistory(a);
  renderProject(a);
  currentCertId = '';
  currentPdfs = [];
  certSaved = false;
  pdfCount = 0;
  uploading = 0;
  set('genCertId', 'Not generated yet');
  if ($('qrBox')) $('qrBox').innerHTML = '<div class="qr-hint">Generate an ID first to see the QR code. Scanning it opens the public verification slip.</div>';
  if ($('uploadList')) $('uploadList').innerHTML = '';
  renderPdfList();
  if ($('btnSaveCert')) $('btnSaveCert').classList.remove('done');
  if ($('viewOverlay')) $('viewOverlay').classList.add('open');
}

async function generateId() {
  miniLoad('Generating a unique certificate ID...');
  try {
    let id = '';
    for (let i = 0; i < 20; i++) {
      const cand = 'IDT/A/' + Math.floor(100000 + Math.random() * 900000);
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
        new QRCode(qrBox, { text: 'https://www.idtacademy.com.ng/slip/' + id, width: 200, height: 200, colorDark: '#1e1b4b', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
      }
    }
    miniHide();
    pushShow('success', 'Certificate ID Ready', id + ' • QR code generated.');
  } catch (err) {
    miniHide();
    pushShow('error', 'ID Generation Failed', 'Please try again.', err.message || String(err));
  }
}

function downloadQr() {
  const qrBox = $('qrBox');
  const c = qrBox ? qrBox.querySelector('canvas') : null;
  if (!c) {
    pushShow('error', 'No QR Yet', 'Generate a certificate ID first.');
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

function renderPdfList() {
  const box = $('pdfList');
  if (!box) return;
  if (!currentPdfs.length) {
    box.innerHTML = '<div class="pdf-none">No PDFs yet. Upload certificate images above.</div>';
    return;
  }
  box.innerHTML = currentPdfs.map((url, i) => '<div class="pdf-item"><i class="fa-solid fa-file-pdf"></i><span>Certificate PDF ' + (i + 1) + '</span><button class="btn-view" data-pdf="' + i + '"><i class="fa-solid fa-eye"></i> View</button></div>').join('');
}

async function uploadFiles(files) {
  if (!current) return;
  const uploadList = $('uploadList');
  for (const file of files) {
    const item = document.createElement('div');
    item.className = 'up-item';
    item.innerHTML = '<span class="up-spin"></span><span class="up-name">' + esc(file.name) + '</span><span class="up-status">Converting...</span>';
    if (uploadList) uploadList.appendChild(item);
    uploading++;
    try {
      const dataUrl = await readAsDataURL(file);
      const img = await loadImage(dataUrl);
      await loadPdfLib();
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: img.naturalWidth > img.naturalHeight ? 'l' : 'p', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const ratio = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
      const w = img.naturalWidth * ratio;
      const h = img.naturalHeight * ratio;
      doc.addImage(dataUrl, 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);
      const blob = doc.output('blob');
      const path = 'cert/' + current.profile.id + '/pdf_' + Date.now() + '_' + (pdfCount++) + '.pdf';
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
    } finally {
      uploading = Math.max(0, uploading - 1);
    }
  }
}

function certificatePayload() {
  const ud = current.profile.user_data || {};
  const pd = current.project || {};
  return {
    user_id: current.profile.id,
    course_id: current.entry.course_id,
    full_name: ud.full_name || '',
    email: ud.email || '',
    course_name: current.entry.course_name || ud.course_name || '',
    course_number: current.entry.course_number || ud.course_number || '',
    grade: isFinite(current.entry.grade) ? current.entry.grade : '',
    date_completed: current.entry.date || '',
    referral_link: ud.referral_link || '',
    profile_url: ud.profile_url || ud.avatar_url || '',
    project_title: pd.project_title || '',
    project_theme: pd.project_theme || '',
    video_url: pd.video_url || '',
    pdf_url: pd.pdf_url || '',
    work_url: pd.work_url || '',
    project_link: pd.video_url || pd.work_url || pd.pdf_url || '',
    project_submitted_at: pd.submitted_at || ''
  };
}

async function saveCertificate() {
  if (!current) return;
  if (uploading > 0) {
    pushShow('info', 'Please Wait', 'Some files are still converting.');
    return;
  }
  if (!currentCertId) {
    pushShow('error', 'ID Required', 'Generate a certificate ID first.');
    return;
  }
  if (!currentPdfs.length) {
    pushShow('error', 'PDFs Required', 'Upload at least one certificate image and wait for the PDF.');
    return;
  }
  miniLoad('Saving certificate record...');
  try {
    const p = current.profile;
    const row = { id: currentCertId, certificate_data: Object.assign(certificatePayload(), { date_generated: new Date().toISOString(), pdfs: currentPdfs.slice() }) };
    const { error } = await supabase.from('certificate').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    certificates.push(row);

    const fresh = await supabase.from('user_profiles').select('user_data').eq('id', p.id).maybeSingle();
    const ud = fresh && fresh.data && fresh.data.user_data ? fresh.data.user_data : (p.user_data || {});
    ud.certificate_issued = true;
    ud.certificates = ud.certificates && typeof ud.certificates === 'object' ? ud.certificates : {};
    ud.certificates[current.entry.course_id || 'main'] = currentCertId;
    if (ud.projects && ud.projects[current.entry.course_id]) ud.projects[current.entry.course_id].status = 'approved';
    const up = await supabase.from('user_profiles').update({ user_data: ud }).eq('id', p.id);
    if (up.error) throw up.error;
    p.user_data = ud;

    certSaved = true;
    miniHide();
    pushShow('success', 'Certificate Saved', currentCertId + ' has been saved. You can now send it to the student.');
  } catch (err) {
    miniHide();
    pushShow('error', 'Save Failed', 'Your account may not have permission to save certificates.', err.message || String(err));
  }
}

async function sendCertificate() {
  if (!current) return;
  if (!certSaved) {
    pushShow('error', 'Not Saved Yet', 'Save the certificate before sending.');
    return;
  }
  miniLoad('Sending certificate to student email...');
  try {
    const payload = Object.assign(certificatePayload(), { cert_id: currentCertId, pdfs: currentPdfs.slice() });
    const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data && data.error) || 'Send failed');
    miniHide();
    const email = (current.profile.user_data || {}).email;
    pushShow('success', 'Certificate Sent!', (email || 'The student') + ' will receive their certificate email shortly.');
    const sentId = current.profile.id + '|' + current.entry.course_id;
    awaiting = awaiting.filter((a) => a.profile.id + '|' + a.entry.course_id !== sentId);
    renderAwaiting();
    if ($('viewOverlay')) $('viewOverlay').classList.remove('open');
  } catch (err) {
    miniHide();
    pushShow('error', 'Send Failed', 'Please check your connection and try again.', err.message || String(err));
  }
}

async function copyFrom(btn) {
  const src = copySources();
  const key = btn.dataset.copy;
  if (!src[key]) {
    pushShow('error', 'Nothing to Copy', 'This field is empty for this student.');
    return;
  }
  try {
    await copyText(src[key]);
    pushShow('success', 'Copied!', src[key].slice(0, 90) + (src[key].length > 90 ? '…' : ''));
  } catch (err) {
    pushShow('error', 'Copy Failed', err.message || String(err));
  }
}

function closeView() {
  if ($('viewOverlay')) $('viewOverlay').classList.remove('open');
}

function closePdf() {
  if ($('pdfOverlay')) $('pdfOverlay').classList.remove('open');
  if ($('pdfFrame')) $('pdfFrame').src = 'about:blank';
}

document.addEventListener('DOMContentLoaded', () => {
  on('togglePass', 'click', () => {
    const inp = $('loginPass');
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    const btn = $('togglePass');
    if (btn) btn.innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
  });

  const doLogin = async () => {
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
      const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: pass });
      if (error || !data || !data.user) {
        miniHide();
        if (errBox) {
          errBox.textContent = error ? error.message : 'Incorrect email or password.';
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
    }
  };

  on('loginBtn', 'click', (e) => {
    e.preventDefault();
    doLogin();
  });
  on('loginForm', 'submit', (e) => {
    e.preventDefault();
    doLogin();
  });

  on('btnLogout', 'click', async () => {
    await supabase.auth.signOut();
    hideDash();
    if ($('loginEmail')) $('loginEmail').value = '';
    if ($('loginPass')) $('loginPass').value = '';
    if ($('loginErr')) $('loginErr').classList.add('hidden');
    pushShow('info', 'Signed Out', 'You have been logged out.');
  });

  on('btnHome', 'click', () => { window.location.href = 'https://www.idtacademy.com.ng'; });
  on('btnRefresh', 'click', () => {
    loadData();
    pushShow('info', 'Refreshing', 'Reloading student data from the server...');
  });
  on('btnViewBack', 'click', closeView);
  on('viewClose', 'click', closeView);
  on('viewOverlay', 'click', (e) => {
    if (e.target === $('viewOverlay')) closeView();
  });
  on('awaitList', 'click', (e) => {
    const btn = e.target.closest('.btn-view');
    if (btn) openView(parseInt(btn.dataset.idx, 10));
  });
  on('copyRow', 'click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (btn) copyFrom(btn);
  });
  on('projContent', 'click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (btn) copyFrom(btn);
  });
  on('btnGenId', 'click', generateId);
  on('btnQr', 'click', downloadQr);
  on('btnPickFiles', 'click', () => {
    const fi = $('fileInput');
    if (fi) fi.click();
  });
  on('fileInput', 'change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      uploadFiles(files);
      e.target.value = '';
    }
  });
  on('pdfList', 'click', (e) => {
    const btn = e.target.closest('.btn-view');
    if (!btn) return;
    const url = currentPdfs[parseInt(btn.dataset.pdf, 10)];
    if (!url) return;
    if ($('pdfFrame')) $('pdfFrame').src = url;
    if ($('pdfOverlay')) $('pdfOverlay').classList.add('open');
  });
  on('pdfClose', 'click', closePdf);
  on('pdfOverlay', 'click', (e) => {
    if (e.target === $('pdfOverlay')) closePdf();
  });
  on('btnSaveCert', 'click', saveCertificate);
  on('btnSendCert', 'click', sendCertificate);

  (async function init() {
    try {
      const { data } = await supabase.auth.getSession();
      if (data && data.session && data.session.user) {
        showDash();
        return;
      }
    } catch (_) {}
    hideDash();
  })();

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) hideDash();
  });
});

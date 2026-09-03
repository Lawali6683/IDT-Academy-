import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function removePush(card) {
  card.classList.add('out');
  setTimeout(() => card.remove(), 320);
}

function pushShow(type, title, message) {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const card = document.createElement('div');
  card.className = 'push-card ' + type;
  card.innerHTML =
    '<img class="push-logo" src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy">' +
    '<div class="push-body"><b><i class="fa-solid ' + icons[type] + '"></i> ' + escapeHtml(title) + '</b><p>' + escapeHtml(message) + '</p></div>' +
    '<button class="push-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  
  const wrap = $('pushWrap') || document.body;
  const closeBtn = card.querySelector('.push-x');
  if (closeBtn) closeBtn.addEventListener('click', () => removePush(card));
  
  wrap.appendChild(card);
  if (type === 'success') setTimeout(() => removePush(card), 6000);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getCertId() {
  const path = window.location.pathname;
  const parts = path.split('/').filter((p) => p && p !== 'slip' && p !== 'slip.html');
  if (parts.length) return decodeURIComponent(parts.join('/'));
  const params = new URLSearchParams(window.location.search);
  const q = params.get('id');
  if (q) return q;
  return '';
}

async function fetchCertFromDatabase(id) {
  let res = await supabase.from('certificates').select('id, certificate_data').eq('id', id).maybeSingle();
  if (res.error || !res.data) {
    res = await supabase.from('certificate').select('id, certificate_data').eq('id', id).maybeSingle();
  }
  return res;
}

async function loadCert() {
  const id = getCertId();
  if (!id) {
    if ($('stateLoading')) $('stateLoading').classList.add('hidden');
    if ($('stateInvalid')) $('stateInvalid').classList.remove('hidden');
    pushShow('error', 'Invalid Certificate ID', 'Please provide a valid certificate ID in the URL to verify.');
    return;
  }

  try {
    const { data, error } = await fetchCertFromDatabase(id);
    if (error) throw error;
    
    if (!data) {
      if ($('stateLoading')) $('stateLoading').classList.add('hidden');
      if ($('stateInvalid')) $('stateInvalid').classList.remove('hidden');
      pushShow('error', 'Certificate Not Found', 'No certificate record found matching the provided ID.');
      return;
    }

    const cd = data.certificate_data || {};
    let photo = cd.profile_url || cd.avatar_url || cd.photo_url || 'https://i.imgur.com/oyqM5oF.png';
    let name = cd.full_name || cd.student_name || 'Student';
    let email = cd.email || '';
    let userId = cd.user_id || cd.id || '';

    if (userId && (!name || name === 'Student' || !email)) {
      const { data: prof } = await supabase.from('user_profiles').select('id, user_data').eq('id', userId).maybeSingle();
      if (prof && prof.user_data) {
        const ud = prof.user_data;
        if (!photo || photo === 'https://i.imgur.com/oyqM5oF.png') {
          photo = ud.profile_url || ud.avatar_url || ud.photo_url || photo;
        }
        if (name === 'Student') name = ud.full_name || name;
        if (!email) email = ud.email || email;
      }
    }

    if ($('slipCertId')) $('slipCertId').textContent = data.id;
    if ($('slipPhoto')) $('slipPhoto').src = photo;
    if ($('slipName')) $('slipName').textContent = name;
    if ($('slipEmail')) $('slipEmail').textContent = email || '—';
    if ($('slipCourse')) $('slipCourse').textContent = cd.course_name || '—';
    if ($('slipCourseNum')) $('slipCourseNum').textContent = cd.course_number || '—';
    if ($('slipGrade')) $('slipGrade').textContent = cd.grade != null && cd.grade !== '' ? cd.grade + '%' : (cd.score != null ? cd.score + '%' : '—');
    if ($('slipDate')) $('slipDate').textContent = formatDate(cd.date_completed || cd.date || cd.created_at);

    const pdfs = Array.isArray(cd.pdfs) ? cd.pdfs : (cd.pdf_url ? [cd.pdf_url] : []);
    const grid = $('slipPdfs');
    if (grid) {
      if (!pdfs.length) {
        grid.innerHTML = '<div class="info-box" style="grid-column:1/-1"><span>Documents</span><b>No certificate documents uploaded yet.</b></div>';
      } else {
        grid.innerHTML = pdfs.map((url, i) =>
          '<div class="pdf-item"><iframe src="' + escapeHtml(url) + '" loading="lazy"></iframe>' +
          '<a href="' + escapeHtml(url) + '" download target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> Download PDF ' + (i + 1) + '</a></div>'
        ).join('');
      }
    }

    document.title = 'Certificate ' + data.id + ' • IDT Academy';
    if ($('stateLoading')) $('stateLoading').classList.add('hidden');
    if ($('stateValid')) $('stateValid').classList.remove('hidden');

  } catch (err) {
    if ($('stateLoading')) $('stateLoading').classList.add('hidden');
    if ($('stateInvalid')) $('stateInvalid').classList.remove('hidden');
    pushShow('error', 'Verification Error', err.message || 'Could not verify this certificate. Please try again.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadCert);
} else {
  loadCert();
}
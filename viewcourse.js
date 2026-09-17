import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);

const TOPICS_PER_PAGE = 3;

let user = null;
let userData = null;
let myCourses = [];
let activeCourseId = '';
let currentTopics = [];
let shownCount = 0;

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
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

function removeToast(el) {
  el.classList.add('out');
  setTimeout(() => el.remove(), 320);
}

function showToast(type, title, message) {
  const wrap = $('toastWrap');
  if (!wrap) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<i class="fa-solid ' + icons[type] + '"></i>' +
    '<div class="toast-body"><b>' + escapeHtml(title) + '</b><p>' + escapeHtml(message) + '</p></div>' +
    '<button class="toast-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  el.querySelector('.toast-x').addEventListener('click', () => removeToast(el));
  wrap.appendChild(el);
  if (type === 'success') {
    setTimeout(() => removeToast(el), 3600);
  }
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

function formatMoney(n) {
  return '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getYouTubeId(url) {
  const u = String(url || '').trim();
  let m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = u.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}

function isDirectVideo(url) {
  return /\.(mp4|webm|ogg|ogv|mov)(\?.*)?$/i.test(String(url || ''));
}

function isValidCourseId(v) {
  const s = String(v || '').trim();
  return Boolean(s) && s.toUpperCase() !== 'N/A' && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined';
}

function getAcademyId() {
  try {
    if (userData) {
      const a = userData.academy_id || userData.academyId || userData.academyID || '';
      if (a && String(a).trim() && String(a).trim().toUpperCase() !== 'N/A') {
        return String(a).trim();
      }
    }
    if (user && user.id) return String(user.id);
  } catch (_) {}
  return '------';
}

function collectMyCourses(ud) {
  const arr = [];
  const main = {
    course_id: ud.course_id || '',
    course_name: ud.course_name || '',
    course_number: ud.course_number || '',
    course_price: Number(ud.course_price || ud.price || 0),
    status: ud.status || 'pending'
  };
  if (isValidCourseId(main.course_id) && main.course_name) arr.push(main);
  for (let n = 2; n <= 20; n++) {
    const cid = ud[n + 'course_id'];
    if (!isValidCourseId(cid)) continue;
    const st = String(ud[n + 'course_status'] || 'active').toLowerCase();
    if (st !== 'active') continue;
    arr.push({
      course_id: String(cid).trim(),
      course_name: ud[n + 'course_name'] || '',
      course_number: ud[n + 'course_number'] || '000',
      course_price: Number(ud[n + 'course_price'] || 0),
      status: 'active'
    });
  }
  const seen = {};
  return arr.filter((c) => {
    if (!c.course_id || seen[c.course_id]) return false;
    seen[c.course_id] = true;
    return true;
  });
}

function renderUserBadge() {
  const n = $('userIdName');
  const c = $('userIdCode');
  if (n) n.textContent = (userData && userData.full_name) || 'Student';
  if (c) c.textContent = getAcademyId();
}

function renderCourseList() {
  const emptyCard = $('emptyCard');
  const coursesCard = $('coursesCard');
  const list = $('courseList');
  const sub = $('pageSub');
  if (!myCourses.length) {
    if (emptyCard) emptyCard.classList.remove('hidden');
    if (coursesCard) coursesCard.classList.add('hidden');
    if (sub) sub.textContent = 'Your learning journey starts here';
    return;
  }
  if (emptyCard) emptyCard.classList.add('hidden');
  if (coursesCard) coursesCard.classList.remove('hidden');
  if (sub) sub.textContent = 'You have ' + myCourses.length + (myCourses.length === 1 ? ' course' : ' courses') + ' on your account. Tap any course to view its topics.';
  let html = '';
  myCourses.forEach((c) => {
    html += '<div class="course-item" data-cid="' + escapeHtml(c.course_id) + '">' +
      '<img src="https://i.imgur.com/oyqM5oF.png" alt="' + escapeHtml(c.course_name || 'Course') + '" loading="lazy">' +
      '<div class="ci-in">' +
      '<b>' + escapeHtml(c.course_name || 'Course') + '</b>' +
      '<small><i class="fa-solid fa-hashtag"></i> Course #' + escapeHtml(c.course_number || '000') + '</small>' +
      '<span class="ci-price"><i class="fa-solid fa-naira-sign"></i> ' + formatMoney(c.course_price) + '</span>' +
      '</div>' +
      '<span class="ci-open"><i class="fa-solid fa-arrow-right"></i></span>' +
      '</div>';
  });
  if (list) list.innerHTML = html;
  list.querySelectorAll('.course-item').forEach((item) => {
    item.addEventListener('click', () => openCourseTopics(item.dataset.cid));
  });
}

async function openCourseTopics(courseId) {
  if (!courseId) return;
  activeCourseId = courseId;
  miniLoad('Loading your topics...');
  try {
    const { data, error } = await supabase
      .from('all_couse_post')
      .select('*')
      .eq('id', courseId)
      .limit(1);
    if (error) throw error;
    const row = (data && data[0]) || null;
    const ac = (row && row.all_course) || {};
    const course = myCourses.find((c) => c.course_id === courseId) || {};
    const topics = Array.isArray(ac.topics) ? ac.topics.slice().sort((a, b) => {
      const na = Number(a.topic_number != null ? a.topic_number : 0);
      const nb = Number(b.topic_number != null ? b.topic_number : 0);
      return na - nb;
    }) : [];
    currentTopics = topics;
    shownCount = 0;
    renderCourseHead(course, ac, topics);
    renderTopicsPage();
    const coursesCard = $('coursesCard');
    const topicsCard = $('topicsCard');
    if (coursesCard) coursesCard.classList.add('hidden');
    if (topicsCard) topicsCard.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    miniHide();
  } catch (err) {
    miniHide();
    showToast('error', 'Load Failed', 'Could not load the topics for this course. Please try again.');
  }
}

function renderCourseHead(course, ac, topics) {
  const head = $('courseHead');
  if (!head) return;
  const name = (ac && ac.course_name) || course.course_name || 'My Course';
  const number = (ac && ac.course_number) || course.course_number || '000';
  const price = Number(course.course_price || (ac && ac.price) || 0);
  const finalTopicIdx = topics.findIndex((t) => t.is_final === true);
  let html = '<img src="https://i.imgur.com/oyqM5oF.png" alt="' + escapeHtml(name) + '">' +
    '<div class="ch-in">' +
    '<b>' + escapeHtml(name) + '</b>' +
    '<small><i class="fa-solid fa-hashtag"></i> Course #' + escapeHtml(number) + ' &nbsp;•&nbsp; <i class="fa-solid fa-naira-sign"></i> ' + formatMoney(price) + '</small>' +
    (finalTopicIdx !== -1 ? '<span class="ch-tag final"><i class="fa-solid fa-flag-checkered"></i> Final topic is Topic ' + (finalTopicIdx + 1) + '</span>' : '') +
    '</div>';
  if (myCourses.length > 1) {
    html += '<button class="btn-switch" id="btnSwitchCourse"><i class="fa-solid fa-right-left"></i> Switch Course</button>';
  }
  head.innerHTML = html;
  const sw = $('btnSwitchCourse');
  if (sw) {
    sw.addEventListener('click', () => {
      const topicsCard = $('topicsCard');
      const coursesCard = $('coursesCard');
      if (topicsCard) topicsCard.classList.add('hidden');
      if (coursesCard) coursesCard.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

function renderTopicsPage() {
  const list = $('topicsList');
  const loadMoreRow = $('loadMoreRow');
  if (!list) return;
  if (currentTopics.length === 0) {
    list.innerHTML = '<div class="empty-box"><i class="fa-solid fa-book-open"></i><b>No Topics Available Yet</b><p>The topics for this course are being prepared by our teachers. Please check back soon.</p></div>';
    if (loadMoreRow) loadMoreRow.classList.add('hidden');
    return;
  }
  let html = '';
  const start = 0;
  const end = shownCount;
  for (let i = start; i < end; i++) {
    const t = currentTopics[i];
    const isF = t.is_final === true;
    html += '<div class="topic-item" data-idx="' + i + '">' +
      '<div class="topic-head">' +
      '<div class="topic-num' + (isF ? ' final-num' : '') + '">' + (i + 1) + '</div>' +
      '<div class="th-in">' +
      '<small>Topic ' + (i + 1) + ' of ' + currentTopics.length + '</small>' +
      '<b>' + escapeHtml(t.topic_name || ('Topic ' + (i + 1))) + '</b>' +
      (isF ? '<span class="final-tag"><i class="fa-solid fa-flag-checkered"></i> Final Topic</span>' : '') +
      '</div>' +
      '<i class="fa-solid fa-chevron-down th-arrow"></i>' +
      '</div>' +
      '<div class="topic-body"><div class="topic-body-inner">' +
      (t.video_url ? buildVideoHtml(t.video_url) : '') +
      '<div class="topic-text">' + escapeHtml(t.topic_text || 'Lesson notes are coming soon for this topic.') + '</div>' +
      '</div></div>' +
      '</div>';
  }
  list.innerHTML = html;
  list.querySelectorAll('.topic-item').forEach((item) => {
    const head = item.querySelector('.topic-head');
    if (head) {
      head.addEventListener('click', () => {
        item.classList.toggle('open');
      });
    }
  });
  const progressMini = currentTopics.length ? Math.round((shownCount / currentTopics.length) * 100) : 0;
  if (loadMoreRow) {
    if (shownCount < currentTopics.length) {
      loadMoreRow.classList.remove('hidden');
      const btn = $('btnLoadMore');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-layer-group"></i> Load More Topics (' + (currentTopics.length - shownCount) + ' left)';
    } else {
      loadMoreRow.classList.add('hidden');
      if (shownCount > 0) {
        const done = document.createElement('div');
        done.style.cssText = 'text-align:center;padding:10px;font-size:12px;font-weight:700;color:#047857';
        done.innerHTML = '<i class="fa-solid fa-circle-check"></i> You have seen all ' + currentTopics.length + ' topics of this course.';
        list.appendChild(done);
      }
    }
  }
  updateMiniProgress(progressMini);
}

function updateMiniProgress(pct) {
  const head = $('courseHead');
  if (!head) return;
  let bar = head.querySelector('.progress-mini');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'progress-mini';
    bar.innerHTML = '<div class="pm-bar"><div class="pm-fill"></div></div><span></span>';
    head.querySelector('.ch-in').appendChild(bar);
  }
  const fill = bar.querySelector('.pm-fill');
  const label = bar.querySelector('span');
  if (fill) fill.style.width = pct + '%';
  if (label) label.textContent = shownCount + '/' + currentTopics.length;
}

function buildVideoHtml(url) {
  const yt = getYouTubeId(url);
  if (yt) {
    return '<div class="topic-video"><iframe src="https://www.youtube.com/embed/' + yt + '?rel=0&modestbranding=1&playsinline=1&controls=1&fs=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
  }
  if (isDirectVideo(url)) {
    return '<div class="topic-video"><video src="' + escapeHtml(url) + '" controls playsinline preload="metadata"></video></div>';
  }
  return '<div class="topic-video"><iframe src="' + escapeHtml(url) + '" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe></div>';
}

async function loadUserData() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1);
  if (error) throw error;
  if (!data || !data[0]) throw new Error('Profile not found');
  userData = data[0].user_data || {};
  if (!userData || typeof userData !== 'object') userData = {};
  if (!userData.academy_id && !userData.academyId) {
    userData.academy_id = String(user.id);
  }
}

function domReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

domReady(async () => {
  document.documentElement.classList.add('ready');
  miniLoad('Loading your Course...');
  try {
    const raw = localStorage.getItem('idt_user');
    if (!raw) {
      window.location.replace('register.html');
      return;
    }
    user = JSON.parse(raw);
    if (!user || !user.id) {
      localStorage.removeItem('idt_user');
      window.location.replace('register.html');
      return;
    }
    await loadUserData();
    renderUserBadge();
    myCourses = collectMyCourses(userData);
    renderCourseList();
    miniHide();
    if (!myCourses.length) {
      showToast('info', 'Not Started Learning', 'You have not started any course yet. Pick a course and complete your payment to begin.');
    }
  } catch (err) {
    miniHide();
    showToast('error', 'Error', 'Something went wrong while loading your account. Please refresh the page.');
  }

  const btnCopy = $('btnCopyUserId');
  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      try {
        await copyText(getAcademyId());
        btnCopy.classList.add('done');
        btnCopy.innerHTML = '<i class="fa-solid fa-check"></i>';
        showToast('success', 'Copied!', 'Your Academy ID has been copied to your clipboard.');
        setTimeout(() => { btnCopy.classList.remove('done'); btnCopy.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 2000);
      } catch (err) {
        showToast('error', 'Copy Failed', 'Could not copy your ID. Please try again.');
      }
    });
  }

  const btnLoadMore = $('btnLoadMore');
  if (btnLoadMore) {
    btnLoadMore.addEventListener('click', () => {
      shownCount = Math.min(shownCount + TOPICS_PER_PAGE, currentTopics.length);
      renderTopicsPage();
    });
  }
});
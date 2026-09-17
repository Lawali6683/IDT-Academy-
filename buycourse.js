import { supabase } from './supabase.js';

const CATEGORIES = {
  '1': 'Technology & Computing',
  '2': 'Vocational & Agricultural Skills',
  '3': 'Health & Community Wellness',
  '4': '2-Year Diploma Program'
};

const PLACEHOLDER_IMG = 'https://i.imgur.com/oyqM5oF.png';
const POLL_INTERVAL = 6000;
const POLL_MAX_MS = 30 * 60 * 1000;

let allCourses = [];
let currentCourse = null;
let currentUser = null;
let currentUserData = null;
let coursesDone = false;
let activeCategory = 'all';
let payPolling = false;
let paySlot = 0;
let payDeadline = 0;
let countdownTimer = null;
let pollTimer = null;

const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatNaira(v) {
  return Number(v || 0).toLocaleString('en-NG');
}

function showToast(type, title, msg) {
  const wrap = $('toastWrap');
  if (!wrap) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><div><b>' + escapeHtml(title) + '</b><span>' + escapeHtml(msg) + '</span></div>';
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity .3s ease';
    setTimeout(() => t.remove(), 320);
  }, 4200);
}

function showLoader() {
  const l = $('loaderScreen');
  if (l) l.classList.remove('gone');
}

function hideLoader() {
  const l = $('loaderScreen');
  if (l) l.classList.add('gone');
}

function getUserUuid() {
  try {
    const raw = localStorage.getItem('idt_user');
    if (!raw) return '';
    const u = JSON.parse(raw);
    return String(u.id || u.user_id || u.uuid || u || '').trim();
  } catch (e) {
    return '';
  }
}

function ownedCourseIds(ud) {
  const ids = new Set();
  if (!ud) return ids;
  if (ud.course_id) ids.add(String(ud.course_id));
  for (let i = 2; i <= 40; i++) {
    if (ud[i + 'course_id']) ids.add(String(ud[i + 'course_id']));
  }
  return ids;
}

function nextOpenSlot(ud) {
  for (let i = 1; i <= 40; i++) {
    const key = 'course2payment' + i;
    if (!(key in (ud || {}))) return i;
    if (String(ud[key]).toLowerCase() !== 'yes') return i;
  }
  return 0;
}

async function loadUser() {
  const uuid = getUserUuid();
  if (!uuid) {
    window.location.href = 'register.html';
    return false;
  }
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_data')
    .eq('id', uuid)
    .single();
  if (error || !data) {
    window.location.href = 'register.html';
    return false;
  }
  const ud = data.user_data || {};
  const status = String(ud.status || '').toLowerCase();
  if (status === 'pending') {
    window.location.href = 'register.html';
    return false;
  }
  if (status !== 'active') {
    window.location.href = 'register.html';
    return false;
  }
  currentUser = uuid;
  currentUserData = ud;
  return true;
}

async function loadCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('id, course_data')
    .order('id', { ascending: true });
  if (error) {
    showToast('error', 'Load Failed', 'Could not load courses. Please refresh the page.');
    hideLoader();
    return;
  }
  allCourses = (data || []).map((row) => {
    const cd = row.course_data || {};
    return {
      id: row.id,
      course_name: cd.course_name || '',
      course_number: cd.course_number || '',
      category: cd.category || '',
      info_text: cd.info_text || '',
      image_url: cd.image_url || '',
      price: cd.price || cd.course_price || 0
    };
  });
  coursesDone = true;
  renderTabs();
  renderGrid();
  hideLoader();
}

function renderTabs() {
  const tabs = $('catTabs');
  if (!tabs) return;
  let html = '<button type="button" class="cat-tab' + (activeCategory === 'all' ? ' active' : '') + '" data-cat="all"><i class="fa-solid fa-grip"></i> All Courses</button>';
  Object.keys(CATEGORIES).forEach((k) => {
    html += '<button type="button" class="cat-tab' + (activeCategory === k ? ' active' : '') + '" data-cat="' + escapeHtml(k) + '"><i class="fa-solid fa-layer-group"></i> ' + escapeHtml(CATEGORIES[k]) + '</button>';
  });
  tabs.innerHTML = html;
  tabs.querySelectorAll('.cat-tab').forEach((b) => {
    b.addEventListener('click', () => {
      activeCategory = b.dataset.cat;
      tabs.querySelectorAll('.cat-tab').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      renderGrid();
    });
  });
}

function cardHTML(course) {
  const catName = CATEGORIES[String(course.category)] || 'Course';
  const desc = String(course.info_text || '').replace(/\s+/g, ' ').trim();
  const shortDesc = desc.length > 110 ? desc.slice(0, 110) + '...' : desc;
  const isDiploma = String(course.category) === '4';
  const priceTag = isDiploma ? 'Per Year' : 'One-time';

  return '<div class="course-card" data-id="' + escapeHtml(course.id) + '">' +
    '<div class="c-img">' +
      '<span class="c-badge"><i class="fa-solid fa-layer-group"></i> ' + escapeHtml(catName) + '</span>' +
      '<img src="' + escapeHtml(course.image_url || PLACEHOLDER_IMG) + '" alt="' + escapeHtml(course.course_name || 'Course') + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMG + '\'">' +
      '<span class="c-num">#' + escapeHtml(course.course_number || '') + '</span>' +
    '</div>' +
    '<div class="c-body">' +
      '<h4>' + escapeHtml(course.course_name || 'Untitled Course') + '</h4>' +
      '<p class="c-desc">' + escapeHtml(shortDesc) + '</p>' +
      '<div class="c-price">' +
        '<b><i class="fa-solid fa-naira-sign"></i>' + formatNaira(course.price) + '</b>' +
        '<span>' + priceTag + '</span>' +
      '</div>' +
      '<div class="c-actions">' +
        '<button class="btn btn-view" data-action="view"><i class="fa-solid fa-eye"></i> View</button>' +
        '<button class="btn btn-start" data-action="start"><i class="fa-solid fa-rocket"></i> Pay Now</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function filteredCourses() {
  if (activeCategory === 'all') return allCourses;
  return allCourses.filter((c) => String(c.category) === String(activeCategory));
}

function renderGrid() {
  const grid = $('coursesGrid');
  const empty = $('emptyState');
  if (!grid) return;
  const list = filteredCourses();
  grid.innerHTML = list.map(cardHTML).join('');
  if (empty) empty.classList.toggle('hidden', list.length > 0);
  grid.querySelectorAll('.course-card').forEach((card) => {
    card.querySelectorAll('.btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const course = allCourses.find((c) => String(c.id) === String(card.dataset.id));
        if (!course) return;
        if (btn.dataset.action === 'view') openView(course);
        else startPaymentFlow(course);
      });
    });
  });
}

function openView(course) {
  currentCourse = course;
  const catName = CATEGORIES[String(course.category)] || 'Course';
  const isDiploma = String(course.category) === '4';
  $('vImg').src = course.image_url || PLACEHOLDER_IMG;
  $('vImg').onerror = function () { this.onerror = null; this.src = PLACEHOLDER_IMG; };
  $('vCat').innerHTML = '<i class="fa-solid fa-layer-group"></i> ' + escapeHtml(catName) + ' &middot; #' + escapeHtml(course.course_number || '');
  $('vName').textContent = course.course_name || 'Untitled Course';
  $('vInfo').textContent = String(course.info_text || 'No description available for this course yet.').trim();
  $('vPrice').textContent = formatNaira(course.price);
  $('vPriceTag').textContent = isDiploma ? 'Per Year' : 'One-time';
  $('viewOverlay').classList.add('open');
}

function closeView() {
  $('viewOverlay').classList.remove('open');
}

function buildRegisterUrl(course) {
  return 'register.html?course_id=' + encodeURIComponent(course.id) +
    '&course_name=' + encodeURIComponent(course.course_name || '') +
    '&course_number=' + encodeURIComponent(course.course_number || '') +
    '&course_price=' + encodeURIComponent(course.price || 0);
}

async function startPaymentFlow(course) {
  if (!currentUser || !currentUserData) {
    showToast('error', 'Not Logged In', 'Please log in again to continue.');
    window.location.href = 'register.html';
    return;
  }
  const price = Number(course.price || 0);
  if (!price || price <= 0) {
    showToast('error', 'Invalid Price', 'This course has no valid price. Please contact support.');
    return;
  }
  if (price === 3500) {
    showToast('error', 'Wrong Course Amount', 'Please select the correct course you want to pay for.');
    return;
  }
  const owned = ownedCourseIds(currentUserData);
  if (owned.has(String(course.id))) {
    showToast('info', 'Already Owned', 'You already have this course. Check My Courses on your dashboard.');
    return;
  }
  if (payPolling) {
    showToast('info', 'Payment In Progress', 'Please complete or wait for your current payment first.');
    return;
  }
  closeView();
  $('payDetails').classList.add('hidden');
  $('payWait').classList.remove('hidden');
  $('payOverlay').classList.add('open');

  try {
    const res = await fetch('/api/paystack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser,
        email: String(currentUserData.email || ''),
        full_name: String(currentUserData.full_name || ''),
        course_id: course.id,
        course_name: course.course_name || '',
        price: price
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Payment initialization failed');
    }

    if (data.account_number) {
      $('payWait').classList.add('hidden');
      $('payDetails').classList.remove('hidden');
      $('payBank').textContent = data.bank_name || 'Wema Bank';
      $('payAcct').textContent = data.account_number || '';
      $('payAcctName').textContent = data.account_name || 'IDT ACADEMY';
      $('payAmount').innerHTML = '<i class="fa-solid fa-naira-sign"></i>' + formatNaira(data.amount || price);
      $('payAmt2').textContent = 'N' + formatNaira(data.amount || price);
      payDeadline = Date.now() + (data.expires_in_minutes || 30) * 60000;
      startCountdown();
      startPolling(course);
    } else if (data.authorization_url) {
      $('payOverlay').classList.remove('open');
      window.location.href = data.authorization_url;
    } else {
      throw new Error('No payment account or link returned');
    }
  } catch (err) {
    $('payOverlay').classList.remove('open');
    showToast('error', 'Payment Error', err.message || 'Something went wrong. Please try again.');
  }
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  const el = $('payCountdown');
  countdownTimer = setInterval(() => {
    const left = payDeadline - Date.now();
    if (left <= 0) {
      clearInterval(countdownTimer);
      if (el) el.textContent = '00:00';
      return;
    }
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    if (el) el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }, 1000);
}

function startPolling(course) {
  payPolling = true;
  const startedAt = Date.now();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (Date.now() - startedAt > POLL_MAX_MS) {
      clearInterval(pollTimer);
      payPolling = false;
      $('payOverlay').classList.remove('open');
      showToast('error', 'Payment Expired', 'The payment window expired. Please try Pay Now again.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_data')
        .eq('id', currentUser)
        .single();
      if (error || !data) return;
      const ud = data.user_data || {};
      currentUserData = ud;
      const slot = nextOpenSlot(ud);
      if (!slot) return;
      const flag = String(ud['course2payment' + slot] || '').toLowerCase();
      const paid = Number(ud['pay' + slot] || 0);
      if (flag === 'yes' && paid > 0) {
        clearInterval(pollTimer);
        if (countdownTimer) clearInterval(countdownTimer);
        paySlot = slot;
        await finalizeCourse(course, slot, paid);
      }
    } catch (e) {}
  }, POLL_INTERVAL);
}

async function finalizeCourse(course, slot, paidAmount) {
  const btn = $('btnPayNow');
  try {
    const res = await fetch('/api/newCourse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser,
        slot: slot,
        amount_paid: paidAmount,
        course_id: course.id,
        course_name: course.course_name || '',
        course_number: course.course_number || '',
        course_price: Number(course.price || 0)
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Could not add your course');
    }
    payPolling = false;
    $('payOverlay').classList.remove('open');
    $('cgImg').src = course.image_url || PLACEHOLDER_IMG;
    $('cgName').textContent = course.course_name || 'Untitled Course';
    $('cgCat').textContent = CATEGORIES[String(course.category)] || 'Course';
    $('congratsOverlay').classList.add('open');
  } catch (err) {
    payPolling = false;
    $('payOverlay').classList.remove('open');
    showToast('success', 'Payment Confirmed', 'Your payment was confirmed. Please refresh your dashboard — if the course is missing, contact support with your reference.');
  }
}

function setupSearch() {
  const input = $('courseSearch');
  const resultsBox = $('courseSearchResults');
  const clearBtn = $('courseSearchClear');
  if (!input || !resultsBox) return;
  let debounceTimer = null;

  function renderResults(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) {
      resultsBox.classList.remove('open');
      resultsBox.innerHTML = '';
      return;
    }
    if (!coursesDone) {
      resultsBox.innerHTML = '<div class="csr-empty"><i class="fa-solid fa-hourglass-half"></i>Courses are still loading. Please try again in a moment.</div>';
      resultsBox.classList.add('open');
      return;
    }
    const matches = allCourses.filter((c) => {
      const name = String(c.course_name || '').toLowerCase();
      const desc = String(c.info_text || '').toLowerCase();
      const num = String(c.course_number || '').toLowerCase();
      const cat = String(CATEGORIES[String(c.category)] || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || num.includes(q) || cat.includes(q);
    }).slice(0, 8);

    if (!matches.length) {
      resultsBox.innerHTML = '<div class="csr-empty"><i class="fa-solid fa-magnifying-glass-minus"></i>No courses found for "' + escapeHtml(query.trim()) + '". Try a different course name.</div>';
      resultsBox.classList.add('open');
      return;
    }

    resultsBox.innerHTML = matches.map((c) => {
      const catName = CATEGORIES[String(c.category)] || 'Course';
      const isDiploma = String(c.category) === '4';
      const priceTag = isDiploma ? 'Per Year' : 'One-time';
      return '<div class="csr-item" data-id="' + escapeHtml(c.id) + '">' +
        '<img class="csr-img" src="' + escapeHtml(c.image_url || PLACEHOLDER_IMG) + '" alt="' + escapeHtml(c.course_name || 'Course') + '" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMG + '\'">' +
        '<div class="csr-body">' +
          '<h5>' + escapeHtml(c.course_name || 'Untitled Course') + '</h5>' +
          '<span>' + escapeHtml(catName) + '</span>' +
        '</div>' +
        '<span class="csr-price"><i class="fa-solid fa-naira-sign"></i>' + formatNaira(c.price) + ' <small style="font-weight:500;color:#8b84a8">/ ' + priceTag + '</small></span>' +
        '<i class="fa-solid fa-arrow-right csr-arrow"></i>' +
      '</div>';
    }).join('');
    resultsBox.classList.add('open');

    resultsBox.querySelectorAll('.csr-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const course = allCourses.find((c) => String(c.id) === String(item.dataset.id));
        if (course) openView(course);
      });
    });
  }

  input.addEventListener('input', () => {
    if (clearBtn) {
      if (input.value) clearBtn.classList.add('show');
      else clearBtn.classList.remove('show');
    }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => renderResults(input.value), 180);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('show');
    resultsBox.classList.remove('open');
    resultsBox.innerHTML = '';
    input.focus();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.course-search-wrap')) resultsBox.classList.remove('open');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const fy = $('fyear');
  if (fy) fy.textContent = new Date().getFullYear();
  setupSearch();

  $('viewClose').addEventListener('click', closeView);
  $('viewOverlay').addEventListener('click', (e) => {
    if (e.target === $('viewOverlay')) closeView();
  });
  $('payOverlay').addEventListener('click', (e) => {
    if (e.target === $('payOverlay') && !payPolling) $('payOverlay').classList.remove('open');
  });
  $('congratsOverlay').addEventListener('click', (e) => {
    if (e.target === $('congratsOverlay')) window.location.href = 'dashboard.html';
  });
  $('btnGoDashboard').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });
  $('btnPayNow').addEventListener('click', () => {
    if (currentCourse) startPaymentFlow(currentCourse);
  });
  document.querySelectorAll('.copy-mini').forEach((b) => {
    b.addEventListener('click', () => {
      const src = $(b.dataset.copy);
      if (!src) return;
      const text = src.textContent.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          b.innerHTML = '<i class="fa-solid fa-check"></i>';
          setTimeout(() => { b.innerHTML = '<i class="fa-regular fa-copy"></i>'; }, 1600);
        });
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        b.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => { b.innerHTML = '<i class="fa-regular fa-copy"></i>'; }, 1600);
      }
    });
  });

  (async () => {
    const ok = await loadUser();
    if (!ok) return;
    await loadCourses();
  })();
});

window.addEventListener('load', () => {
  document.documentElement.classList.add('ready');
});
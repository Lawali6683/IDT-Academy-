import { supabase } from './supabase.js';

const VIDEO_LINKS = {
  promo: 'https://youtu.be/-zyW9mzwAkM?si=FJ13206GZ3MnKctO',
  teaching: 'https://youtu.be/-zyW9mzwAkM?si=FJ13206GZ3MnKctO',
  orientation: 'https://youtu.be/-zyW9mzwAkM?si=FJ13206GZ3MnKctO'
};

function loadLateStyles() {
  const add = (href) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  };
  add('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');
  add('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
}

function showLoading() {
  const loader = document.getElementById('idt-loader-2');
  if (loader) loader.classList.remove('idt-hide');
  const n = document.getElementById('i2num');
  let c = 0;
  if (window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
  window.idtLoaderInterval = setInterval(() => {
    c = Math.min(c + 3, 99);
    if (n) n.textContent = String(c);
    if (c >= 99) clearInterval(window.idtLoaderInterval);
  }, 84);
}

function hideLoading() {
  const l = document.getElementById('idt-loader-2');
  if (window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
  const num = document.getElementById('i2num');
  if (num) num.textContent = '100';
  if (l) l.classList.add('idt-hide');
  if (window.idtLoaderSafety) {
    clearTimeout(window.idtLoaderSafety);
    window.idtLoaderSafety = null;
  }
}

function forceHideLoader() {
  if (window.idtLoaderHidden) return;
  window.idtLoaderHidden = true;
  hideLoading();
}

window.idtLoaderHidden = false;
window.idtLoaderSafety = setTimeout(forceHideLoader, 6000);
loadLateStyles();
showLoading();

const $ = (id) => document.getElementById(id);
const PLACEHOLDER_IMG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs><rect width="600" height="420" fill="url(#g)"/><circle cx="300" cy="180" r="64" fill="rgba(255,255,255,.18)"/><text x="300" y="300" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="bold" text-anchor="middle">IDT Academy</text></svg>');

const CATEGORIES = {
  '1': 'Technology & Computing',
  '2': 'Vocational & Agricultural Skills',
  '3': 'Health & Community Wellness',
  '4': '2-Year Diploma Program'
};

let allCourses = [];
let currentCourse = null;
let originalInfo = '';
let windowLoaded = false;
let coursesDone = false;

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function formatNaira(n) {
  const num = Number(n);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-NG');
}

function showToast(title, message, type) {
  const toastWrap = $('toastWrap');
  if (!toastWrap) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<i class="fa-solid ' + icons[type] + '"></i><div><b>' + escapeHtml(title) + '</b><p>' + escapeHtml(message) + '</p></div>';
  toastWrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }, 4200);
}

function maybeHideLoader() {
  if (windowLoaded && coursesDone) {
    setTimeout(forceHideLoader, 400);
  }
}

function getRefFromUrl() {
  const full = window.location.href;
  let m = full.match(/\/ref\/([A-Za-z0-9_-]+)/);
  if (m && m[1]) return m[1];
  try {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get('ref') || '').trim();
    if (q) return q;
    const hash = window.location.hash || '';
    const hm = hash.match(/ref[=\/]([A-Za-z0-9_-]+)/);
    if (hm && hm[1]) return hm[1];
  } catch (e) {}
  return '';
}

function handleRefCode() {
  const refBanner = $('refBanner');
  const refBannerTitle = $('refBannerTitle');
  const refBannerMsg = $('refBannerMsg');
  let ref = getRefFromUrl();
  if (ref) {
    try { localStorage.setItem('idt_ref', ref); } catch (e) {}
    try { sessionStorage.setItem('idt_ref_session', ref); } catch (e) {}
    try {
      const u = new URL(window.location.href);
      const clean = u.origin + u.pathname.split('/ref/')[0].replace(/\/+$/, '') + '/';
      window.history.replaceState({}, document.title, clean);
    } catch (e) {}
  }
  let savedRef = '';
  try { savedRef = localStorage.getItem('idt_ref') || ''; } catch (e) {}
  if (!savedRef) {
    try { savedRef = sessionStorage.getItem('idt_ref_session') || ''; } catch (e) {}
  }
  if (savedRef && !sessionStorage.getItem('idt_ref_banner_shown') && refBanner) {
    if (refBannerTitle) refBannerTitle.textContent = 'Welcome! You were referred';
    if (refBannerMsg) refBannerMsg.textContent = 'Referral code "' + savedRef + '" attached. Register to start your learning journey.';
    refBanner.classList.add('show');
    sessionStorage.setItem('idt_ref_banner_shown', '1');
    setTimeout(() => refBanner.classList.remove('show'), 8000);
  }
}

function buildRegisterUrl(course) {
  let url = 'register.html?' +
    'course_id=' + encodeURIComponent(course.id || '') +
    '&course_number=' + encodeURIComponent(course.course_number || '') +
    '&course_name=' + encodeURIComponent(course.course_name || '') +
    '&price=' + encodeURIComponent(course.price || '') +
    '&info=' + encodeURIComponent(course.info_text || '') +
    '&image=' + encodeURIComponent(course.image_url || '');
  let ref = '';
  try { ref = localStorage.getItem('idt_ref') || ''; } catch (e) {}
  if (!ref) {
    try { ref = sessionStorage.getItem('idt_ref_session') || ''; } catch (e) {}
  }
  if (ref) url += '&ref=' + encodeURIComponent(ref);
  return url;
}

function cardHTML(course) {
  const catName = CATEGORIES[String(course.category)] || 'Course';
  const desc = String(course.info_text || '').replace(/\s+/g, ' ').trim();
  const shortDesc = desc.length > 110 ? desc.slice(0, 110) + '...' : desc;
  const isDiploma = String(course.category) === '4';
  const priceTag = isDiploma ? 'Per Year' : 'One-time';
  const imgSrc = course.image_url || PLACEHOLDER_IMG;
  const bgStyle = course.image_url ? ' style="--bg:url(\'' + escapeHtml(String(course.image_url).replace(/[\\'"()\s]/g, (ch) => '%' + ch.charCodeAt(0).toString(16).toUpperCase())) + '\')"' : '';

  return '<div class="course-card" data-id="' + escapeHtml(course.id) + '">' +
    '<div class="c-img"' + bgStyle + '>' +
      '<img src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(course.course_name || 'Course') + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMG + '\'">' +
    '</div>' +
    '<div class="c-meta">' +
      '<span class="c-badge"><i class="fa-solid fa-layer-group"></i> ' + escapeHtml(catName) + '</span>' +
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
        '<button class="btn btn-start" data-action="start"><i class="fa-solid fa-rocket"></i> Start</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function injectAllEmptyBlock() {
  let el = $('allEmpty');
  if (el) return el;
  const head = document.querySelector('#courses .section-head') || document.body;
  el = document.createElement('div');
  el.id = 'allEmpty';
  el.className = 'all-empty';
  el.innerHTML = '<i class="fa-solid fa-hourglass-half"></i><h3>Courses Coming Soon</h3><p>We are preparing our courses right now. Check back soon — new courses will appear here automatically.</p>';
  head.parentNode.appendChild(el);
  return el;
}

async function loadCourses() {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*');
    if (error) throw error;
    let parsedCourses = (data || []).map((row) => {
      let cData = row.course_data;
      if (typeof cData === 'string') {
        try { cData = JSON.parse(cData); } catch (e) {}
      }
      return cData || {};
    }).filter((c) => c && c.id);
    parsedCourses.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });
    allCourses = parsedCourses;
    const grouped = { '1': [], '2': [], '3': [], '4': [] };
    allCourses.forEach((c) => {
      const cat = String(c.category || '1');
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(c);
    });
    let any = false;
    ['1', '2', '3', '4'].forEach((cat) => {
      const sec = document.querySelector('.ps-' + cat);
      const row = $('row-' + cat);
      const empty = $('empty-' + cat);
      const count = $('count-' + cat);
      const items = grouped[cat] || [];
      if (!items.length) {
        if (sec) sec.classList.add('hidden');
        if (row) row.innerHTML = '';
        if (empty) empty.classList.add('hidden');
        if (count) count.textContent = '0 courses';
        return;
      }
      any = true;
      if (sec) sec.classList.remove('hidden');
      if (count) count.textContent = items.length + (items.length === 1 ? ' course' : ' courses');
      if (row) row.innerHTML = items.map(cardHTML).join('');
      if (empty) empty.classList.add('hidden');
    });
    if (!any) {
      const el = injectAllEmptyBlock();
      el.classList.remove('hidden');
    } else {
      const el = $('allEmpty');
      if (el) el.classList.add('hidden');
    }
    if (allCourses.length) {
      setupRowInteractions();
    }
  } catch (err) {
    showToast('Load Failed', err.message || 'Could not load courses. Please check your Supabase connection.', 'error');
    ['1', '2', '3', '4'].forEach((cat) => {
      const sec = document.querySelector('.ps-' + cat);
      if (sec) sec.classList.add('hidden');
    });
    const el = injectAllEmptyBlock();
    const pTag = el.querySelector('p');
    if (pTag) pTag.textContent = 'Courses could not be loaded right now. Please refresh the page.';
    el.classList.remove('hidden');
  } finally {
    coursesDone = true;
    maybeHideLoader();
  }
}

function setupRowInteractions() {
  document.querySelectorAll('.h-row').forEach((row) => {
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    row.addEventListener('mousedown', (e) => {
      if (e.target.closest('.btn')) return;
      isDown = true;
      moved = false;
      startX = e.pageX - row.offsetLeft;
      startScroll = row.scrollLeft;
      row.classList.add('dragging');
    });
    row.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const x = e.pageX - row.offsetLeft;
      const walk = (x - startX) * 1.2;
      if (Math.abs(walk) > 6) moved = true;
      row.scrollLeft = startScroll - walk;
    });
    row.addEventListener('mouseup', () => {
      isDown = false;
      row.classList.remove('dragging');
    });
    row.addEventListener('mouseleave', () => {
      isDown = false;
      row.classList.remove('dragging');
    });
    row.addEventListener('touchstart', () => {
      row.classList.remove('dragging');
    }, { passive: true });
    row.addEventListener('click', (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
        return;
      }
      const btn = e.target.closest('.btn');
      if (!btn) return;
      const card = e.target.closest('.course-card');
      if (!card) return;
      const course = allCourses.find((c) => String(c.id) === String(card.dataset.id));
      if (!course) return;
      if (btn.dataset.action === 'view') {
        openModal(course);
      } else if (btn.dataset.action === 'start') {
        window.location.href = buildRegisterUrl(course);
      }
    });
  });
  document.querySelectorAll('.scroll-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = Number(btn.dataset.scroll || 1);
      const row = $(btn.dataset.target);
      if (!row) return;
      row.scrollBy({ left: dir * 320, behavior: 'smooth' });
    });
  });
}

function injectSearchStyles() {}

function setupSearch() {
  injectSearchStyles();
  const sectionHead = document.querySelector('#courses .section-head');
  if (!sectionHead) return;

  let input = $('courseSearch');
  let resultsBox = $('courseSearchResults');

  if (!input || !resultsBox) {
    const existingWrap = document.querySelector('.course-search-wrap');
    if (existingWrap) existingWrap.remove();
    const wrap = document.createElement('div');
    wrap.className = 'course-search-wrap';
    wrap.innerHTML = '<div class="course-search-box">' +
      '<i class="fa-solid fa-magnifying-glass srch-ico"></i>' +
      '<input type="text" id="courseSearch" class="course-search-input" placeholder="Search for a course... e.g. Web Development" autocomplete="off">' +
      '<button type="button" class="course-search-clear" id="courseSearchClear" aria-label="Clear search"><i class="fa-solid fa-xmark"></i></button>' +
      '</div>' +
      '<div class="course-search-results" id="courseSearchResults"></div>';
    sectionHead.insertAdjacentElement('afterend', wrap);
    input = $('courseSearch');
    resultsBox = $('courseSearchResults');
  }

  if (!input || !resultsBox) return;

  const clearBtn = $('courseSearchClear');
  let debounceTimer = null;

  function hideResults() {
    resultsBox.classList.remove('open');
  }

  function goToRegister(course) {
    window.location.href = buildRegisterUrl(course);
  }

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
    if (!allCourses.length) {
      resultsBox.innerHTML = '<div class="csr-empty"><i class="fa-solid fa-magnifying-glass-minus"></i>No courses available right now. Check back soon.</div>';
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
        if (course) goToRegister(course);
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

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = input.value.trim().toLowerCase();
      if (!q) return;
      const first = allCourses.find((c) => String(c.course_name || '').toLowerCase().includes(q));
      if (first) goToRegister(first);
    } else if (e.key === 'Escape') {
      hideResults();
      input.blur();
    }
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) renderResults(input.value);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.remove('show');
      hideResults();
      input.focus();
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.course-search-wrap')) hideResults();
  });
}

function openModal(course) {
  const courseModal = $('courseModal');
  const mCatText = $('mCatText');
  const mImg = $('mImg');
  const mNum = $('mNum');
  const mName = $('mName');
  const mInfo = $('mInfo');
  const mPrice = $('mPrice');
  currentCourse = course;
  originalInfo = course.info_text || '';
  if (mCatText) mCatText.textContent = CATEGORIES[String(course.category)] || 'Course';
  if (mImg) {
    mImg.src = course.image_url || PLACEHOLDER_IMG;
    mImg.onerror = function () {
      this.onerror = null;
      this.src = PLACEHOLDER_IMG;
    };
  }
  if (mNum) mNum.textContent = '#' + (course.course_number || '');
  if (mName) mName.textContent = course.course_name || 'Untitled Course';
  if (mInfo) {
    mInfo.textContent = originalInfo;
    mInfo.classList.remove('hidden');
  }
  if (mPrice) mPrice.textContent = formatNaira(course.price);
  if (courseModal) courseModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const courseModal = $('courseModal');
  const mInfo = $('mInfo');
  if (courseModal) courseModal.classList.remove('open');
  document.body.style.overflow = '';
  currentCourse = null;
  if (mInfo) {
    mInfo.textContent = originalInfo;
    mInfo.classList.remove('hidden');
  }
}

function openSpanMenu() {
  const spanMenu = $('spanMenu');
  if (spanMenu) spanMenu.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSpanMenu() {
  const spanMenu = $('spanMenu');
  if (spanMenu) spanMenu.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  const burgerBtn = $('burgerBtn');
  const spanClose = $('spanClose');
  const spanMenu = $('spanMenu');
  const modalClose = $('modalClose');
  const courseModal = $('courseModal');
  const mStart = $('mStart');
  const refBannerClose = $('refBannerClose');
  const topbar = $('topbar');
  handleRefCode();
  loadCourses();
  setupSearch();
  document.documentElement.classList.add('ready');
  if (burgerBtn) {
    burgerBtn.addEventListener('click', () => {
      if (spanMenu && spanMenu.classList.contains('open')) {
        closeSpanMenu();
      } else {
        openSpanMenu();
      }
      burgerBtn.classList.toggle('open');
    });
  }
  if (spanClose) {
    spanClose.addEventListener('click', () => {
      closeSpanMenu();
      if (burgerBtn) burgerBtn.classList.remove('open');
    });
  }
  if (spanMenu) {
    spanMenu.querySelectorAll('.span-links a').forEach((a) => {
      a.addEventListener('click', () => {
        closeSpanMenu();
        if (burgerBtn) burgerBtn.classList.remove('open');
      });
    });
  }
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (courseModal) {
    courseModal.addEventListener('click', (e) => {
      if (e.target === courseModal) closeModal();
    });
  }
  if (mStart) {
    mStart.addEventListener('click', () => {
      if (currentCourse) {
        window.location.href = buildRegisterUrl(currentCourse);
      }
    });
  }
  if (refBannerClose) {
    refBannerClose.addEventListener('click', () => {
      const refBanner = $('refBanner');
      if (refBanner) refBanner.classList.remove('show');
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (courseModal && courseModal.classList.contains('open')) closeModal();
      if (spanMenu && spanMenu.classList.contains('open')) {
        closeSpanMenu();
        if (burgerBtn) burgerBtn.classList.remove('open');
      }
    }
  });
  window.addEventListener('scroll', () => {
    if (topbar) {
      if (window.scrollY > 30) {
        topbar.classList.add('scrolled');
      } else {
        topbar.classList.remove('scrolled');
      }
    }
  }, { passive: true });
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && navLinks.classList.contains('active')) {
          navLinks.classList.remove('active');
        }
      }
    });
  });
  window.addEventListener('load', () => {
    windowLoaded = true;
    setTimeout(maybeHideLoader, 500);
    setTimeout(forceHideLoader, 600);
  });
});


(function () {
  try {
    var cu = window.location.href;
    var c1 = document.querySelector('link[rel="canonical"]');
    var c2 = document.querySelector('meta[property="og:url"]');
    var c3 = document.querySelector('meta[name="twitter:url"]');
    if (c1) c1.setAttribute('href', cu);
    if (c2) c2.setAttribute('content', cu);
    if (c3) c3.setAttribute('content', cu);
  } catch (e) {}

  function go() {
    var br = document.querySelector('.topbar .brand');
    if (!br) return;
    br.addEventListener('click', function () { location.href = br.getAttribute('data-href') || 'index.html'; });
    br.addEventListener('keydown', function (e) { if (e.key === 'Enter') location.href = br.getAttribute('data-href') || 'index.html'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();

(function () {
  try {
  (function () {
    const APP_ICON = 'https://i.imgur.com/mgRKw4Q.png';
    const LOGO = 'https://i.imgur.com/oyqM5oF.png';
    const SW_URL = '/sw.js';
    const HIDE_KEY = 'idt_pwa_installed';
    let deferredPrompt = null;
    let installBtn = null;

    function isStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function isIos() {
      return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
        (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    }

    function isAndroid() {
      return /android/i.test(window.navigator.userAgent);
    }

    function isDesktop() {
      return !isIos() && !isAndroid();
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register(SW_URL).catch(function () {});
      });
    }

    function createButton() {
      if (installBtn) return installBtn;
      installBtn = document.createElement('button');
      installBtn.className = 'idt-pwa-btn';
      installBtn.type = 'button';
      installBtn.setAttribute('aria-label', 'Install IDT Academy App');
      installBtn.innerHTML = '<i class="fa-solid fa-mobile-screen-button"></i><span>Install App</span>';
      installBtn.addEventListener('click', handleInstallClick);
      var bb = document.getElementById('burgerBtn');
      if (bb && bb.parentNode) {
        bb.parentNode.insertBefore(installBtn, bb);
      } else {
        installBtn.classList.add('idt-pwa-float');
        document.body.appendChild(installBtn);
      }
      return installBtn;
    }

    function showButton() {
      if (isStandalone()) {
        try { localStorage.setItem(HIDE_KEY, '1'); } catch (e) {}
        return;
      }
      try {
        if (localStorage.getItem(HIDE_KEY) === '1') return;
      } catch (e) {}
      createButton();
      requestAnimationFrame(function () {
        if (installBtn) installBtn.classList.remove('idt-pwa-hide');
      });
    }

    function hideButton() {
      if (installBtn) installBtn.classList.add('idt-pwa-hide');
    }

    function stepHtml(icon, title, text) {
      return '<div class="idt-pwa-step"><i class="fa-solid ' + icon + '"></i><div><b>' + title + '</b><span>' + text + '</span></div></div>';
    }

    function createModal(kind) {
      let back = document.querySelector('.idt-pwa-back');
      if (back) back.remove();
      back = document.createElement('div');
      back.className = 'idt-pwa-back';

      let bodyHtml = '';

      if (kind === 'ios') {
        bodyHtml =
          stepHtml('fa-share-nodes', 'Step 1', 'Tap the Share button (the square with an arrow pointing up) at the bottom of Safari.') +
          stepHtml('fa-plus', 'Step 2', 'Scroll down and tap "Add to Home Screen".') +
          stepHtml('fa-circle-check', 'Step 3', 'Tap "Add". The IDT Academy app will appear on your home screen.');
      } else if (kind === 'android') {
        bodyHtml =
          stepHtml('fa-bars', 'Step 1', 'Tap the three-dot menu (⋮) at the top right corner of your browser.') +
          stepHtml('fa-mobile-screen', 'Step 2', 'Tap "Add to Home screen" or "Install app".') +
          stepHtml('fa-circle-check', 'Step 3', 'Tap "Install". The IDT Academy app will appear on your home screen.');
      } else {
        bodyHtml =
          stepHtml('fa-circle-down', 'Step 1', 'Look for the install icon (a screen with a down arrow) at the right side of your browser address bar and click it.') +
          stepHtml('fa-bars', 'Step 2', 'Or open the browser menu (three dots) and click "Install IDT Academy" or "Save and install".') +
          stepHtml('fa-circle-check', 'Step 3', 'The IDT Academy app will be installed on your device.');
      }

      back.innerHTML =
        '<div class="idt-pwa-modal">' +
        '<div class="idt-pwa-modal-head">' +
        '<img src="' + LOGO + '" alt="IDT Academy">' +
        '<div><b>Install IDT Academy App</b><small>Add the app to your device home screen</small></div>' +
        '</div>' +
        '<div class="idt-pwa-modal-body">' + bodyHtml + '</div>' +
        '<div class="idt-pwa-modal-foot"><button type="button" class="idt-pwa-close-btn">Got It</button></div>' +
        '</div>';

      back.addEventListener('click', function (e) {
        if (e.target === back) back.classList.remove('open');
      });

      const closeBtn = back.querySelector('.idt-pwa-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', function () {
          back.classList.remove('open');
        });
      }

      document.body.appendChild(back);
      return back;
    }

    function handleInstallClick() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          if (choice && choice.outcome === 'accepted') {
            hideButton();
          }
          deferredPrompt = null;
        }).catch(function () {
          deferredPrompt = null;
        });
        return;
      }
      if (isIos()) {
        createModal('ios').classList.add('open');
      } else if (isAndroid()) {
        createModal('android').classList.add('open');
      } else if (isDesktop()) {
        createModal('desktop').classList.add('open');
      }
    }

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      showButton();
    });

    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      hideButton();
      try { localStorage.setItem(HIDE_KEY, '1'); } catch (e) {}
    });

    function boot() {
      showButton();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  })();
  } catch (e) {}
})();

(function () {
  try {
  (function(){
      var lab=document.getElementById('skLab'); if(!lab) return;
      var tabs=[].slice.call(lab.querySelectorAll('.sk-tab')), ps=[].slice.call(lab.querySelectorAll('.sk-panel')), cur=0, idle=0;
      function show(i){
        cur=(i+tabs.length)%tabs.length;
        ps.forEach(function(p,k){p.classList.toggle('on',k===cur);});
        tabs.forEach(function(t,k){t.classList.remove('on');t.setAttribute('aria-selected',k===cur?'true':'false');});
        void lab.offsetWidth; tabs[cur].classList.add('on');
      }
      lab.classList.add('js'); show(0);
      function hold(ms){lab.classList.add('paused');clearTimeout(idle);idle=setTimeout(function(){lab.classList.remove('paused');show(cur);},ms);}
      tabs.forEach(function(t,k){t.addEventListener('click',function(){show(k);hold(10000);});});
      lab.addEventListener('animationend',function(e){if(e.animationName==='skProg'&&!lab.classList.contains('paused'))show(cur+1);});
      lab.addEventListener('mouseenter',function(){lab.classList.add('paused');clearTimeout(idle);});
      lab.addEventListener('mouseleave',function(){hold(1200);});
      lab.addEventListener('touchstart',function(){hold(9000);},{passive:true});
      if('IntersectionObserver' in window){new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){if(!lab.classList.contains('live')){lab.classList.add('live');show(cur);}}else{lab.classList.remove('live');}});},{threshold:0.25}).observe(lab);}else{lab.classList.add('live');}
    })();
  } catch (e) {}
})();

(function () {
  try {
  (function () {
    var input = document.getElementById('idtSearchInput');
    var resultsBox = document.getElementById('idtSearchResults');
    var clearBtn = document.getElementById('idtSearchClear');
    var timer = null;
    if (!input || !resultsBox) return;

    function allCards() {
      return Array.prototype.slice.call(document.querySelectorAll('.course-card'));
    }

    function cardText(card) {
      return (card.textContent || '').toLowerCase().replace(/\s+/g, ' ');
    }

    function courseName(card) {
      var h = card.querySelector('h4');
      return h ? h.textContent.trim() : 'Untitled Course';
    }

    function courseImg(card) {
      var im = card.querySelector('img');
      return im ? im.src : '';
    }

    function coursePrice(card) {
      var b = card.querySelector('.c-price b');
      return b ? b.textContent.trim() : '';
    }

    function highlight(card) {
      card.style.transition = 'box-shadow .3s ease, transform .3s ease';
      card.style.boxShadow = '0 0 0 3px #fbbf24, 0 24px 60px rgba(245,158,11,.4)';
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () {
        card.style.boxShadow = '';
      }, 2200);
    }

    function renderResults(query) {
      var q = (query || '').trim().toLowerCase();
      if (!q) {
        resultsBox.style.display = 'none';
        resultsBox.innerHTML = '';
        return;
      }
      var cards = allCards();
      if (!cards.length) {
        resultsBox.innerHTML = '<div class="idt-sr-empty"><i class="fa-solid fa-hourglass-half"></i>Courses are still loading. Please wait a moment and try again.</div>';
        resultsBox.style.display = 'block';
        return;
      }
      var matches = cards.filter(function (c) {
        return cardText(c).indexOf(q) !== -1;
      }).slice(0, 8);

      if (!matches.length) {
        resultsBox.innerHTML = '<div class="idt-sr-empty"><i class="fa-solid fa-magnifying-glass-minus"></i>No courses found for "' + query.trim() + '". Try a different course name.</div>';
        resultsBox.style.display = 'block';
        return;
      }

      resultsBox.innerHTML = matches.map(function (c, i) {
        return '<div class="idt-sr-item" data-idx="' + i + '">' +
          '<img src="' + courseImg(c) + '" alt="" loading="lazy" decoding="async">' +
          '<div class="idt-sr-mid"><h5>' + courseName(c) + '</h5><span>Course</span></div>' +
          '<span class="idt-sr-price">' + coursePrice(c) + '</span>' +
          '<i class="fa-solid fa-arrow-right"></i>' +
        '</div>';
      }).join('');
      resultsBox.style.display = 'block';

      Array.prototype.forEach.call(resultsBox.querySelectorAll('.idt-sr-item'), function (item) {
        item.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          resultsBox.style.display = 'none';
          input.value = '';
          clearBtn.style.display = 'none';
          var card = matches[Number(item.getAttribute('data-idx'))];
          if (card) highlight(card);
        });
      });
    }

    input.addEventListener('input', function () {
      clearBtn.style.display = input.value ? 'flex' : 'none';
      clearTimeout(timer);
      timer = setTimeout(function () { renderResults(input.value); }, 180);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        resultsBox.style.display = 'none';
        input.blur();
      }
    });

    clearBtn.addEventListener('click', function () {
      input.value = '';
      clearBtn.style.display = 'none';
      resultsBox.style.display = 'none';
      input.focus();
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('#idtSearchArea')) {
        resultsBox.style.display = 'none';
      }
    });
  })();
  } catch (e) {}
})();

(function () {
  const PROMO_VIDEO = VIDEO_LINKS.promo;

  const CATS = {
    '1': 'Technology & Computing',
    '2': 'Vocational & Agricultural',
    '3': 'Health & Wellness',
    '4': '2-Year Diploma'
  };

  const FALLBACK_POSTER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4c1d95"/><stop offset="1" stop-color="#0e7490"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><text x="320" y="190" fill="#fff" font-family="Arial,sans-serif" font-size="30" font-weight="bold" text-anchor="middle">IDT Academy</text></svg>'
  );

  const $ = (id) => document.getElementById(id);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const fmtNaira = (n) => {
    const v = Number(n);
    return isNaN(v) ? '0' : v.toLocaleString('en-NG');
  };

  (function setDeviceClass() {
    try {
      const ua = navigator.userAgent || '';
      const mob = /android|iphone|ipad|ipod|mobile/i.test(ua) || (window.matchMedia && matchMedia('(pointer:coarse) and (max-width:900px)').matches);
      document.documentElement.classList.add(mob ? 'idt-mob' : 'idt-desk');
      if (/android/i.test(ua)) document.documentElement.classList.add('idt-android');
    } catch (e) {}
  })();

  function ytId(input) {
    const s = String(input || '').trim();
    if (!s) return '';
    const ok = (v) => (/^[\w-]{11}$/.test(v || '') ? v : '');
    if (ok(s)) return s;
    try {
      const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
      const h = u.hostname.replace(/^(www|m|music)\./, '');
      if (h === 'youtu.be') return ok(u.pathname.slice(1).split('/')[0]);
      if (h.endsWith('youtube.com') || h.endsWith('youtube-nocookie.com')) {
        const v = ok(u.searchParams.get('v'));
        if (v) return v;
        const m = u.pathname.match(/\/(embed|shorts|live|v)\/([\w-]{11})/);
        if (m) return ok(m[2]);
      }
    } catch (e) {}
    return '';
  }

  const posterUrl = (id, small) => 'https://i.ytimg.com/vi/' + id + (small ? '/mqdefault.jpg' : '/hqdefault.jpg');

  function imgFallback(img) {
    if (!img || String(img.src).indexOf('data:') === 0) return;
    const m = /\/vi\/([\w-]{11})\//.exec(img.src);
    if (m && !img.dataset.f && img.src.indexOf('mqdefault') === -1) {
      img.dataset.f = '1';
      img.src = 'https://i.ytimg.com/vi/' + m[1] + '/mqdefault.jpg';
    } else {
      img.src = FALLBACK_POSTER;
    }
  }

  let ytPromise = null;

  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytPromise) return ytPromise;
    ytPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        try { if (typeof prev === 'function') prev(); } catch (e) {}
        resolve(window.YT);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { ytPromise = null; reject(new Error('yt-load')); };
      document.head.appendChild(s);
      setTimeout(() => {
        if (!(window.YT && window.YT.Player)) { ytPromise = null; reject(new Error('yt-timeout')); }
      }, 15000);
    });
    return ytPromise;
  }


  let current = null;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const p = document.querySelector('.vp.vp-pfs');
      if (p) {
        p.classList.remove('vp-pfs');
        document.body.classList.remove('vp-lock');
      }
    }
  });

  function createPlayer(host, id, opts) {
    opts = opts || {};
    const vp = document.createElement('div');
    vp.className = 'vp';
    vp.innerHTML =
      '<div class="vp-stage"></div>' +
      '<div class="vp-shield"></div>' +
      '<div class="vp-poster"><img alt="" decoding="async"><button type="button" class="vp-play" aria-label="Play video"><i class="fa-solid fa-play"></i></button></div>' +
      '<span class="vp-brand"><i class="fa-solid fa-graduation-cap"></i> IDT ACADEMY</span>' +
      '<div class="vp-bar">' +
        '<button type="button" data-a="toggle" aria-label="Pause"><i class="fa-solid fa-pause"></i></button>' +
        '<button type="button" data-a="mute" aria-label="Mute"><i class="fa-solid fa-volume-high"></i></button>' +
        '<span class="vp-spacer"></span>' +
        '<button type="button" data-a="fs" aria-label="Fullscreen"><i class="fa-solid fa-expand"></i></button>' +
      '</div>' +
      '<div class="vp-msg" hidden></div>';
    const stage = vp.querySelector('.vp-stage');
    const mount = document.createElement('div');
    stage.appendChild(mount);
    const img = vp.querySelector('.vp-poster img');
    img.onerror = function () { imgFallback(this); };
    img.src = posterUrl(id);
    host.appendChild(vp);

    let player = null;
    let ready = false;
    let wantPlay = false;
    let playing = false;
    let destroyed = false;
    const msg = vp.querySelector('.vp-msg');
    const showMsg = (t) => { msg.textContent = t; msg.hidden = false; };

    function setIcons() {
      const t = vp.querySelector('[data-a="toggle"] i');
      if (t) t.className = 'fa-solid ' + (playing ? 'fa-pause' : 'fa-play');
      const m = vp.querySelector('[data-a="mute"] i');
      if (m && player && ready) {
        let mu = false;
        try { mu = player.isMuted(); } catch (e) {}
        m.className = 'fa-solid ' + (mu ? 'fa-volume-xmark' : 'fa-volume-high');
      }
    }

    function onState(e) {
      if (destroyed || !window.YT) return;
      const S = window.YT.PlayerState;
      if (e.data === S.PLAYING) {
        playing = true;
        vp.classList.add('playing');
      } else if (e.data === S.PAUSED) {
        playing = false;
        vp.classList.remove('playing');
      } else if (e.data === S.ENDED) {
        playing = false;
        vp.classList.remove('playing');
        try { player.seekTo(0, true); player.pauseVideo(); } catch (er) {}
      }
      setIcons();
    }

    async function init() {
      if (player || destroyed) return;
      try {
        const YT = await loadYT();
        if (destroyed) return;
        const vars = { controls: 0, modestbranding: 1, rel: 0, fs: 0, iv_load_policy: 3, playsinline: 1, disablekb: 1, cc_load_policy: 0 };
        if (/^https?:$/.test(location.protocol)) vars.origin = location.origin;
        player = new YT.Player(mount, {
          host: 'https://www.youtube-nocookie.com',
          videoId: id,
          width: '100%',
          height: '100%',
          playerVars: vars,
          events: {
            onReady: () => {
              ready = true;
              if (wantPlay) { try { player.playVideo(); } catch (e) {} }
            },
            onStateChange: onState,
            onError: () => {
              playing = false;
              vp.classList.remove('playing');
              showMsg('This video is not available right now.');
            }
          }
        });
      } catch (e) {
        if (destroyed) return;
        const sh = vp.querySelector('.vp-shield');
        const br = vp.querySelector('.vp-bar');
        if (sh) sh.remove();
        if (br) br.remove();
        stage.innerHTML = '<div class="vp-fb"><iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1&fs=0" sandbox="allow-scripts allow-same-origin" allow="autoplay; encrypted-media" title="Video"></iframe></div>';
        vp.classList.add('playing');
        const ps = vp.querySelector('.vp-poster');
        if (ps) ps.style.display = 'none';
      }
    }

    const api = {
      el: vp,
      play() {
        if (destroyed) return;
        msg.hidden = true;
        if (current && current !== api) current.pause();
        current = api;
        wantPlay = true;
        if (!player) init();
        else if (ready) { try { player.playVideo(); } catch (e) {} }
      },
      pause() {
        wantPlay = false;
        if (player && ready) { try { player.pauseVideo(); } catch (e) {} }
      },
      destroy() {
        destroyed = true;
        wantPlay = false;
        if (current === api) current = null;
        try { if (player) player.destroy(); } catch (e) {}
        vp.classList.remove('vp-pfs');
        document.body.classList.remove('vp-lock');
        if (vp.parentNode) vp.parentNode.removeChild(vp);
      }
    };

    function toggle() {
      if (playing) api.pause();
      else api.play();
    }

    function pfs() {
      vp.classList.add('vp-pfs');
      document.body.classList.add('vp-lock');
    }

    function fs() {
      const d = document;
      if (d.fullscreenElement || d.webkitFullscreenElement) {
        (d.exitFullscreen || d.webkitExitFullscreen).call(d);
        return;
      }
      if (vp.classList.contains('vp-pfs')) {
        vp.classList.remove('vp-pfs');
        document.body.classList.remove('vp-lock');
        return;
      }
      const rq = vp.requestFullscreen || vp.webkitRequestFullscreen;
      if (rq) {
        try {
          const r = rq.call(vp);
          if (r && r.catch) r.catch(pfs);
          return;
        } catch (e) {}
      }
      pfs();
    }

    vp.querySelector('.vp-poster').addEventListener('pointerdown', () => { loadYT().catch(() => {}); }, { once: true });
    vp.querySelector('.vp-poster').addEventListener('click', () => api.play());
    vp.querySelector('.vp-shield').addEventListener('click', toggle);
    vp.querySelector('.vp-bar').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const a = b.dataset.a;
      if (a === 'toggle') toggle();
      else if (a === 'fs') fs();
      else if (a === 'mute' && player && ready) {
        try {
          if (player.isMuted()) player.unMute();
          else player.mute();
        } catch (er) {}
        setIcons();
      }
    });
    if (opts.autoplay) api.play();
    return api;
  }

  let coursesP = null;

  function getCourses() {
    if (!coursesP) {
      coursesP = new Promise((resolve) => {
        let n = 0;
        const t = setInterval(() => {
          n++;
          if (coursesDone || n > 40) {
            clearInterval(t);
            resolve(allCourses.slice());
          }
        }, 200);
      });
    }
    return coursesP;
  }

  function registerUrl(course, row) {
    return buildRegisterUrl(course || { id: row.course_id, course_name: row.course_name, price: row.price });
  }

  function lazyPlayer(host, sec, url) {
    const id = ytId(url);
    if (!host || !id) {
      if (sec) sec.hidden = true;
      return;
    }
    if (sec) sec.hidden = false;
    function go() {
      if (host.dataset.on) return;
      host.dataset.on = '1';
      try { createPlayer(host, id); } catch (e) { if (sec) sec.hidden = true; }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en, ob) => {
        if (en.some((x) => x.isIntersecting)) {
          go();
          ob.disconnect();
        }
      }, { rootMargin: '400px' }).observe(sec || host);
    } else {
      go();
    }
  }

  function later(fn) {
    const run = () => {
      if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2500 });
      else setTimeout(fn, 800);
    };
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run);
  }

  async function initPreviews() {
    const sec = $('previews');
    const scroller = $('pvScroller');
    if (!sec || !scroller) return;

    let rows = [];
    let courses = [];
    try {
      const [vr, cs] = await Promise.all([
        supabase.from('video_previews').select('*').order('created_at', { ascending: false }).limit(200),
        getCourses()
      ]);
      if (vr.error) throw vr.error;
      rows = (vr.data || []).filter((r) => ytId(r.video_url));
      courses = cs || [];
    } catch (e) {
      return;
    }
    if (!rows.length) return;

    const byId = new Map(courses.map((c) => [String(c.id), c]));
    rows = rows.map((r) => {
      const c = byId.get(String(r.course_id)) || null;
      if (courses.length && !c) return null;
      return Object.assign({}, r, {
        course: c,
        course_name: (c && c.course_name) || r.course_name || '',
        category: String((c && c.category) || r.category || '1'),
        price: c ? Number(c.price) || 0 : Number(r.price) || 0
      });
    }).filter(Boolean);
    if (!rows.length) return;

    const order = new Map();
    rows.forEach((r) => { if (!order.has(r.course_id)) order.set(r.course_id, order.size); });
    const rank = (r) => (r.kind === 'overview' ? 0 : Number(r.slot) || 9);
    rows.sort((a, b) => (order.get(a.course_id) - order.get(b.course_id)) || (rank(a) - rank(b)));
    rows.forEach((r, i) => { r._i = i; });

    const present = ['1', '2', '3', '4'].filter((c) => rows.some((r) => r.category === c));
    const chips = $('pvChips');
    if (chips) {
      chips.innerHTML = present.length > 1
        ? '<button type="button" class="pv-chip on" data-c="all">All</button>' + present.map((c) => '<button type="button" class="pv-chip" data-c="' + c + '">' + esc(CATS[c]) + '</button>').join('')
        : '';
    }

    function cardHtml(r) {
      const id = ytId(r.video_url);
      const ov = r.kind === 'overview';
      const title = ov ? (r.course_name || 'Course') + ' — Overview' : (r.topic_name || r.course_name || 'Lesson');
      const price = Number(r.price) > 0 ? '<span class="pv-price">₦' + fmtNaira(r.price) + '</span>' : '';
      return '<article class="pv-card' + (ov ? ' pv-ov' : '') + '" data-i="' + r._i + '" tabindex="0" role="button" aria-label="Play: ' + esc(title) + '">' +
        '<div class="pv-thumb"><img src="' + posterUrl(id, true) + '" alt="" width="320" height="180" loading="lazy" decoding="async">' +
        '<span class="pv-badge"><i class="fa-solid ' + (ov ? 'fa-bullseye' : 'fa-circle-play') + '"></i> ' + (ov ? 'What you will learn' : 'Preview ' + (Number(r.slot) || '')) + '</span>' + price +
        '<span class="pv-pl"><i class="fa-solid fa-play"></i></span></div>' +
        '<div class="pv-body"><h4>' + esc(title) + '</h4><p><i class="fa-solid fa-book-open"></i> ' + esc(r.course_name || '') + '</p></div></article>';
    }

    const eng = {
      pos: 0,
      half: 0,
      paused: false,
      hover: false,
      visible: false,
      last: 0,
      raf: 0,
      idle: 0,
      reduce: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)
    };
    const SPEED = 0.042;

    function setup() {
      eng.half = 0;
      scroller.classList.remove('static');
      scroller.scrollLeft = 0;
      const track = scroller.querySelector('.pv-track');
      if (!track || !track.children.length) return;
      const n = track.children.length;
      if (n < 2 || track.scrollWidth <= scroller.clientWidth * 1.05) {
        scroller.classList.add('static');
        return;
      }
      const orig = Array.from(track.children);
      for (let k = 0; k < 2; k++) {
        orig.forEach((el) => {
          const c = el.cloneNode(true);
          c.setAttribute('aria-hidden', 'true');
          c.tabIndex = -1;
          track.appendChild(c);
        });
      }
      eng.half = track.children[n].offsetLeft - track.children[0].offsetLeft;
      eng.pos = eng.half;
      scroller.scrollLeft = eng.pos;
    }

    function render(cat) {
      const list = cat === 'all' ? rows : rows.filter((r) => r.category === cat);
      scroller.innerHTML = '<div class="pv-track">' + list.map(cardHtml).join('') + '</div>';
      setup();
    }

    function step(t) {
      eng.raf = requestAnimationFrame(step);
      if (!eng.last) eng.last = t;
      const dt = Math.min(t - eng.last, 64);
      eng.last = t;
      if (eng.paused || eng.reduce || !eng.half || document.hidden) return;
      if (Math.abs(scroller.scrollLeft - eng.pos) > 3) eng.pos = scroller.scrollLeft;
      eng.pos += SPEED * dt;
      if (eng.pos >= eng.half * 2) eng.pos -= eng.half;
      scroller.scrollLeft = eng.pos;
    }

    function startLoop() {
      if (!eng.raf) {
        eng.last = 0;
        eng.raf = requestAnimationFrame(step);
      }
    }

    function stopLoop() {
      if (eng.raf) {
        cancelAnimationFrame(eng.raf);
        eng.raf = 0;
      }
    }

    function hold(ms) {
      eng.paused = true;
      clearTimeout(eng.idle);
      if (!eng.hover) eng.idle = setTimeout(() => { eng.paused = false; }, ms);
    }

    scroller.addEventListener('error', (e) => {
      if (e.target && e.target.tagName === 'IMG') imgFallback(e.target);
    }, true);

    scroller.addEventListener('scroll', () => {
      if (!eng.half) return;
      const x = scroller.scrollLeft;
      if (x >= eng.half * 2) {
        scroller.scrollLeft = x - eng.half;
        eng.pos = scroller.scrollLeft;
      } else if (x < eng.half - 3) {
        scroller.scrollLeft = x + eng.half;
        eng.pos = scroller.scrollLeft;
      }
    }, { passive: true });

    scroller.addEventListener('mouseenter', () => { eng.hover = true; eng.paused = true; });
    scroller.addEventListener('mouseleave', () => { eng.hover = false; hold(700); });
    ['touchstart', 'wheel', 'focusin'].forEach((ev) => scroller.addEventListener(ev, () => hold(2600), { passive: true }));

    let drag = null;
    let moved = false;
    scroller.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      drag = { x: e.clientX, s: scroller.scrollLeft };
      moved = false;
      hold(2600);
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) moved = true;
      if (moved) scroller.scrollLeft = drag.s - dx;
    });
    window.addEventListener('pointerup', () => { drag = null; });

    scroller.addEventListener('click', (e) => {
      if (moved) {
        moved = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const card = e.target.closest('.pv-card');
      if (!card) return;
      const r = rows[Number(card.dataset.i)];
      if (r) openModal(r);
    });

    scroller.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.pv-card');
      if (!card) return;
      e.preventDefault();
      const r = rows[Number(card.dataset.i)];
      if (r) openModal(r);
    });

    sec.querySelectorAll('.pv-arrow').forEach((b) => b.addEventListener('click', () => {
      hold(3200);
      scroller.scrollBy({ left: Number(b.dataset.d) * 320, behavior: 'smooth' });
    }));

    if (chips) {
      chips.addEventListener('click', (e) => {
        const b = e.target.closest('.pv-chip');
        if (!b) return;
        chips.querySelectorAll('.pv-chip').forEach((x) => x.classList.toggle('on', x === b));
        render(b.dataset.c);
      });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => {
        en.forEach((x) => {
          eng.visible = x.isIntersecting;
          if (x.isIntersecting) startLoop();
          else stopLoop();
        });
      }, { threshold: 0.1 }).observe(sec);
    } else {
      startLoop();
    }

    let lastW = window.innerWidth;
    let rt = 0;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (window.innerWidth !== lastW) {
          lastW = window.innerWidth;
          const on = chips && chips.querySelector('.pv-chip.on');
          render(on ? on.dataset.c : 'all');
        }
      }, 250);
    });

    let modal = null;
    let mp = null;

    function ensureModal() {
      if (modal) return modal;
      modal = document.createElement('div');
      modal.className = 'pv-modal';
      modal.innerHTML = '<div class="pv-sheet" role="dialog" aria-modal="true"><button type="button" class="pv-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>' +
        '<div class="pv-player"></div><div class="pv-info"><span class="pv-tag"></span><h3></h3><p class="pv-sub"></p><div class="pv-cta"></div></div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
      modal.querySelector('.pv-x').addEventListener('click', closeModal);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open') && !document.querySelector('.vp.vp-pfs')) closeModal();
      });
      return modal;
    }

    function closeModal() {
      if (!modal) return;
      modal.classList.remove('open');
      if (mp) {
        mp.destroy();
        mp = null;
      }
      document.body.style.overflow = '';
    }

    function openModal(r) {
      const m = ensureModal();
      if (mp) {
        mp.destroy();
        mp = null;
      }
      const ov = r.kind === 'overview';
      m.querySelector('.pv-tag').textContent = ov ? 'Course Overview' : 'Lesson Preview';
      m.querySelector('h3').textContent = ov ? (r.course_name || 'Course') : (r.topic_name || r.course_name || 'Lesson');
      m.querySelector('.pv-sub').textContent = ov ? 'See exactly what you will learn before you pay.' : (r.course_name || '');
      const cta = m.querySelector('.pv-cta');
      const price = Number(r.price) || 0;
      cta.innerHTML = (r.course || price > 0)
        ? (price > 0 ? '<div class="pv-cprice"><small>Course price</small><b>₦' + fmtNaira(price) + '</b></div>' : '') +
          '<a class="btn btn-primary" href="' + esc(registerUrl(r.course, r)) + '"><i class="fa-solid fa-rocket"></i> Start This Course</a>'
        : '';
      m.classList.add('open');
      document.body.style.overflow = 'hidden';
      mp = createPlayer(m.querySelector('.pv-player'), ytId(r.video_url), { autoplay: true });
    }

    render('all');
    sec.hidden = false;
    requestAnimationFrame(() => {
      const on = chips && chips.querySelector('.pv-chip.on');
      render(on ? on.dataset.c : 'all');
    });
  }

  function initCertZoom() {
    let lb = null;
    document.addEventListener('click', (e) => {
      const im = e.target.closest('.cx-frame img');
      if (!im) return;
      if (!lb) {
        lb = document.createElement('div');
        lb.className = 'lb';
        lb.innerHTML = '<button type="button" class="lb-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button><img alt="">';
        document.body.appendChild(lb);
        lb.addEventListener('click', () => {
          lb.classList.remove('open');
          document.body.style.overflow = '';
        });
      }
      const target = lb.querySelector('img');
      target.src = im.currentSrc || im.src;
      target.alt = im.alt || 'Certificate';
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lb && lb.classList.contains('open')) {
        lb.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  function boot() {
    try { lazyPlayer($('promoVideoHost'), $('promoVideo'), PROMO_VIDEO); } catch (e) {}
    try { lazyPlayer($('cnHost'), $('cnSec'), VIDEO_LINKS.teaching); } catch (e) {}
    try { lazyPlayer($('bbHost'), $('bbSec'), VIDEO_LINKS.orientation); } catch (e) {}
    try { later(initPreviews); } catch (e) {}
    try { initCertZoom(); } catch (e) {}
  }

  boot();
})();

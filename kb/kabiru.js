const FORM_API = '/api/kabiru';
const IMGUR_API = 'https://api.imgur.com/3/image';
const IMGUR_CLIENT = 'Client-ID 5acf7eff9c91660';
const SUBMIT_TIMEOUT_MS = 25000;
const UPLOAD_TIMEOUT_MS = 45000;
const IMAGE_MAX_SIDE = 1280;
const IMAGE_QUALITY = 0.8;
const PAGE_SIZE = 12;
const PICK_LIMIT = 60;
const PROGRAM = 'Hon. Kabiru Amadu Digital Skills Foundations for Youths';
const YT_HOSTS = ['https://www.youtube-nocookie.com', 'https://www.youtube.com'];
const YT_LOAD_TIMEOUT_MS = 15000;
const YT_TAP_TIMEOUT_MS = 4500;

const PLACEHOLDER_IMG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#056b3a"/><stop offset="1" stop-color="#f5b301"/></linearGradient></defs><rect width="600" height="420" fill="url(#g)"/><circle cx="300" cy="170" r="60" fill="rgba(255,255,255,.22)"/><text x="300" y="290" fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="bold" text-anchor="middle">Free Course</text></svg>');

const CATEGORIES = {
  '1': 'Technology & Computing',
  '2': 'Vocational & Agricultural Skills',
  '3': 'Health & Community Wellness',
  '4': '2-Year Diploma Program'
};
const CAT_ORDER = ['1', '2', '3', '4'];

const CARD = {};
const rowState = {};
const media = {
  indigene: { url: '', busy: false, seq: 0, local: '' },
  face: { url: '', busy: false, seq: 0, local: '' }
};

let availableConfig = { all: false, keys: new Set() };
let allCourses = [];
let availableCourses = [];
let selectedCourse = null;
let modalCourse = null;
let applyOpen = false;
let submitting = false;
let formUid = '';
let toastCount = 0;
let camStream = null;
let camFacing = 'user';
let camTarget = '';
let camStarting = false;

const rm = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const fine = Boolean(window.matchMedia && window.matchMedia('(hover:hover)').matches);

const $ = (id) => document.getElementById(id);
const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function norm(str) {
  return String(str == null ? '' : str).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

function compact(str) {
  return norm(str).replace(/\s+/g, '');
}

function safe(fn) {
  try { fn(); } catch (err) { if (window.console) console.error(err); }
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

function toast(type, title, message) {
  const wrap = $('toastWrap');
  if (!wrap || toastCount >= 3) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><div><b>' + esc(title) + '</b><p>' + esc(message) + '</p></div>';
  wrap.appendChild(el);
  toastCount++;
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => {
      el.remove();
      toastCount = Math.max(0, toastCount - 1);
    }, 300);
  }, type === 'error' ? 5200 : 3600);
}

function copyText(text) {
  const done = () => toast('success', 'Copied', text + ' is copied. Paste it in your post.');
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    if (ok) done();
    else toast('info', 'Hashtag', text);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  } else {
    fallback();
  }
}

function scrollToSel(sel) {
  const t = document.querySelector(sel);
  if (t) t.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'start' });
}

function readAvailableConfig() {
  const items = qsa('#availableConfig li').map((li) => li.textContent.trim()).filter(Boolean);
  const all = items.some((t) => t === '#');
  const keys = new Set(items.filter((t) => t !== '#').map(compact).filter(Boolean));
  return { all: all, keys: keys };
}

function isAvailable(course) {
  if (availableConfig.all) return true;
  return availableConfig.keys.has(compact(course.course_name));
}

function catName(course) {
  return CATEGORIES[String(course.category)] || 'Course';
}

function shortDesc(course, max) {
  const d = String(course.info_text || '').replace(/\s+/g, ' ').trim();
  return d.length > max ? d.slice(0, max).trim() + '...' : d;
}

function imgTag(course) {
  return '<img src="' + esc(course.image_url || PLACEHOLDER_IMG) + '" alt="' + esc(course.course_name) + '" loading="lazy" decoding="async">';
}

function acts(course) {
  return '<div class="acts"><button type="button" class="b-view" data-act="view" data-id="' + esc(course.id) + '"><i class="fa-solid fa-eye"></i> View</button>' +
    '<button type="button" class="b-apply" data-act="apply" data-id="' + esc(course.id) + '"><i class="fa-solid fa-bolt"></i> Apply Free</button></div>';
}

CARD['1'] = (c) =>
  '<article class="cc cc-1">' +
    '<div class="c1-img">' + imgTag(c) + '<span class="c1-tag"><i class="fa-solid fa-microchip"></i> Tech</span></div>' +
    '<div class="c1-body"><h4>' + esc(c.course_name) + '</h4><p>' + esc(shortDesc(c, 100)) + '</p>' + acts(c) + '</div>' +
  '</article>';

CARD['2'] = (c) =>
  '<article class="cc cc-2">' +
    '<span class="tape"></span>' +
    '<div class="c2-img">' + imgTag(c) + '</div>' +
    '<h4>' + esc(c.course_name) + '</h4><p>' + esc(shortDesc(c, 100)) + '</p>' + acts(c) +
  '</article>';

CARD['3'] = (c) =>
  '<article class="cc cc-3">' +
    '<div class="c3-blob">' + imgTag(c) + '</div>' +
    '<span class="c3-pill"><i class="fa-solid fa-heart-pulse"></i> Wellness</span>' +
    '<h4>' + esc(c.course_name) + '</h4><p>' + esc(shortDesc(c, 90)) + '</p>' + acts(c) +
  '</article>';

CARD['4'] = (c) =>
  '<article class="cc cc-4">' +
    '<div class="c4-spine"><span>Diploma</span></div>' +
    '<div class="c4-main"><div class="c4-img">' + imgTag(c) + '</div><small>2-Year Program</small><h4>' + esc(c.course_name) + '</h4><p>' + esc(shortDesc(c, 90)) + '</p>' + acts(c) + '</div>' +
  '</article>';

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

function appendCards(cat) {
  const st = rowState[cat];
  const row = $('row-' + cat);
  if (!st || !row) return;
  const more = row.querySelector('.cc-more');
  if (more) more.remove();
  const next = st.items.slice(st.shown, st.shown + PAGE_SIZE);
  row.insertAdjacentHTML('beforeend', next.map(CARD[cat]).join(''));
  st.shown += next.length;
  const left = st.items.length - st.shown;
  if (left > 0) {
    row.insertAdjacentHTML('beforeend', '<button type="button" class="cc-more" data-more="' + cat + '"><i class="fa-solid fa-circle-plus"></i><b>Show more</b><small>' + left + ' more</small></button>');
  }
}

function renderCategories() {
  const groups = { '1': [], '2': [], '3': [], '4': [] };
  availableCourses.forEach((c) => {
    const k = String(c.category || '1');
    if (groups[k]) groups[k].push(c);
  });
  let any = false;
  CAT_ORDER.forEach((k) => {
    const sec = $('ps-' + k);
    const row = $('row-' + k);
    const count = $('count-' + k);
    const items = groups[k];
    if (!sec || !row) return;
    if (!items.length) {
      sec.classList.add('hidden');
      row.innerHTML = '';
      rowState[k] = null;
      return;
    }
    any = true;
    sec.classList.remove('hidden');
    if (count) count.textContent = items.length + (items.length === 1 ? ' course' : ' courses');
    rowState[k] = { items: items, shown: 0 };
    row.innerHTML = '';
    appendCards(k);
  });
  const empty = $('coursesEmpty');
  if (empty) empty.classList.toggle('hidden', any);
}

function showCoursesError() {
  const sk = $('coursesSkeleton');
  const er = $('coursesError');
  if (sk) sk.classList.add('hidden');
  if (er) er.classList.remove('hidden');
  CAT_ORDER.forEach((k) => {
    const sec = $('ps-' + k);
    if (sec) sec.classList.add('hidden');
  });
  const sc = $('statCourses');
  if (sc) sc.textContent = '-';
}

function showCourseCount(n) {
  const el = $('statCourses');
  if (!el) return;
  if (rm || n < 2) {
    el.textContent = String(n);
    return;
  }
  let t = 0;
  const id = setInterval(() => {
    t += Math.max(1, Math.ceil(n / 25));
    if (t >= n) {
      t = n;
      clearInterval(id);
    }
    el.textContent = String(t);
  }, 40);
}

async function initCourses() {
  const sk = $('coursesSkeleton');
  const er = $('coursesError');
  const em = $('coursesEmpty');
  if (sk) sk.classList.remove('hidden');
  if (er) er.classList.add('hidden');
  if (em) em.classList.add('hidden');
  try {
    allCourses = await loadCourses();
    availableConfig = readAvailableConfig();
    availableCourses = allCourses.filter(isAvailable);
    if (sk) sk.classList.add('hidden');
    renderCategories();
    renderPicker('');
    showCourseCount(availableCourses.length);
    if (selectedCourse && !findCourse(selectedCourse.id)) setCourse(null);
  } catch (err) {
    showCoursesError();
  }
}

function findCourse(id) {
  return availableCourses.find((c) => String(c.id) === String(id)) || null;
}

function setCourse(course) {
  selectedCourse = course;
  const img = $('courseBtnImg');
  const txt = $('courseBtnText');
  const btn = $('courseBtn');
  if (course) {
    if (img) {
      img.src = course.image_url || PLACEHOLDER_IMG;
      img.classList.remove('hidden');
    }
    if (txt) txt.innerHTML = '<b>' + esc(course.course_name) + '</b><small>' + esc(catName(course)) + ' - tap to change</small>';
    if (btn) btn.classList.add('chosen');
    clearErr('Course');
  } else {
    if (img) img.classList.add('hidden');
    if (txt) txt.innerHTML = '<b>Tap here to choose your course</b><small>Choose the free course you want to learn</small>';
    if (btn) btn.classList.remove('chosen');
  }
  renderPicker(($('pickSearch') || {}).value || '');
  updateProgress();
}

function renderPicker(filter) {
  const list = $('pickList');
  if (!list) return;
  const q = norm(filter);
  const items = availableCourses.filter((c) => !q || norm(c.course_name).indexOf(q) !== -1 || norm(catName(c)).indexOf(q) !== -1).slice(0, PICK_LIMIT);
  if (!availableCourses.length) {
    list.innerHTML = '<div class="pk-empty"><i class="fa-solid fa-hourglass-half"></i>Courses are not available right now. Please check back soon.</div>';
    return;
  }
  if (!items.length) {
    list.innerHTML = '<div class="pk-empty"><i class="fa-solid fa-magnifying-glass-minus"></i>No course found. Try another word.</div>';
    return;
  }
  list.innerHTML = items.map((c) =>
    '<button type="button" class="pk-item' + (selectedCourse && String(selectedCourse.id) === String(c.id) ? ' on' : '') + '" data-pick="' + esc(c.id) + '">' +
      '<img src="' + esc(c.image_url || PLACEHOLDER_IMG) + '" alt="" loading="lazy" decoding="async">' +
      '<div><b>' + esc(c.course_name) + '</b><small>' + esc(catName(c)) + '</small></div>' +
      '<i class="fa-solid fa-circle-check"></i>' +
    '</button>'
  ).join('');
}

function openSheet() {
  const s = $('pickSheet');
  if (s) s.classList.add('open');
  const bd = $('pickBackdrop');
  if (bd) bd.classList.add('open');
  const si = $('pickSearch');
  if (si) si.value = '';
  renderPicker('');
}

function closeSheet() {
  const s = $('pickSheet');
  if (s) s.classList.remove('open');
  const bd = $('pickBackdrop');
  if (bd) bd.classList.remove('open');
}

function openModal(course) {
  const m = $('courseModal');
  if (!m || !course) return;
  modalCourse = course;
  const img = $('cmImg');
  if (img) {
    img.src = course.image_url || PLACEHOLDER_IMG;
    img.alt = course.course_name;
  }
  const set = (id, v) => {
    const el = $(id);
    if (el) el.textContent = v;
  };
  set('cmCat', catName(course));
  set('cmName', course.course_name);
  set('cmInfo', String(course.info_text || 'Apply to learn this course for free.'));
  m.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const m = $('courseModal');
  if (m) m.classList.remove('open');
  modalCourse = null;
  if (!applyOpen) document.body.style.overflow = '';
}

function setupNet() {
  const c = $('net');
  if (!c || rm || !c.getContext) return;
  const x = c.getContext('2d');
  let w = 0, h = 0, pts = [], run = true;
  const size = () => {
    w = c.width = c.offsetWidth;
    h = c.height = c.offsetHeight;
    const n = Math.min(70, Math.floor((w * h) / 17000));
    pts = [];
    for (let i = 0; i < n; i++) pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45 });
  };
  const frame = () => {
    if (!run) return;
    x.clearRect(0, 0, w, h);
    for (let a = 0; a < pts.length; a++) {
      const p = pts[a];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      x.beginPath();
      x.arc(p.x, p.y, 1.8, 0, 6.283);
      x.fillStyle = 'rgba(0,210,122,.8)';
      x.fill();
      for (let b = a + 1; b < pts.length; b++) {
        const dx = p.x - pts[b].x;
        const dy = p.y - pts[b].y;
        const d = dx * dx + dy * dy;
        if (d < 14000) {
          x.strokeStyle = 'rgba(34,211,238,' + (0.28 * (1 - d / 14000)) + ')';
          x.lineWidth = 1;
          x.beginPath();
          x.moveTo(p.x, p.y);
          x.lineTo(pts[b].x, pts[b].y);
          x.stroke();
        }
      }
    }
    requestAnimationFrame(frame);
  };
  size();
  window.addEventListener('resize', size);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      const vis = es[0].isIntersecting && !document.hidden;
      if (vis && !run) {
        run = true;
        frame();
      }
      if (!vis) run = false;
    }, { threshold: 0 }).observe(c);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) run = false;
    else if (!run) {
      run = true;
      frame();
    }
  });
  frame();
}

function setupReveal() {
  const els = qsa('.rv');
  if (!('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((e) => io.observe(e));
  setTimeout(() => qsa('.rv:not(.in)').forEach((e) => e.classList.add('in')), 3000);
}

function setupCounters() {
  if (!('IntersectionObserver' in window)) {
    qsa('[data-count]').forEach((el) => { el.textContent = el.dataset.count + (el.dataset.suf || ''); });
    return;
  }
  const co = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      co.unobserve(e.target);
      const el = e.target;
      const n = Number(el.dataset.count);
      const suf = el.dataset.suf || '';
      let t = 0;
      const id = setInterval(() => {
        t += n / 40;
        if (t >= n) {
          t = n;
          clearInterval(id);
        }
        el.textContent = Math.round(t) + suf;
      }, 35);
    });
  }, { threshold: 0.4 });
  qsa('[data-count]').forEach((el) => co.observe(el));
}

function setupTilt() {
  if (rm || !fine) return;
  qsa('.tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = 'perspective(700px) rotateY(' + px * 12 + 'deg) rotateX(' + (-py * 12) + 'deg) translateY(-4px)';
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
  const g = $('glow');
  if (g) window.addEventListener('pointermove', (e) => { g.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, { passive: true });
}

function setupScroll() {
  const isl = $('island');
  const prog = $('pageProgress');
  const fl = qsa('.float-apply')[0];
  const tt = $('toTop');
  let last = 0;
  let ticking = false;
  let idle = null;
  const update = () => {
    ticking = false;
    const y = window.scrollY || 0;
    if (isl) isl.classList.toggle('hide', y > last && y > 160 && !$('menu').classList.contains('open'));
    last = y;
    if (prog) {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      prog.style.transform = 'scaleX(' + Math.min(1, y / max) + ')';
    }
    if (fl) fl.classList.toggle('on', y > 700 && !applyOpen);
    if (tt) tt.classList.toggle('on', y > 900);
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
    clearTimeout(idle);
    idle = setTimeout(() => { if (isl) isl.classList.remove('hide'); }, 900);
  }, { passive: true });
  if (tt) tt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: rm ? 'auto' : 'smooth' }));
  update();
}

function setupSpy() {
  if (!('IntersectionObserver' in window)) return;
  const map = {};
  qsa('#menuList [data-go]').forEach((b) => { map[b.dataset.go.slice(1)] = b; });
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      qsa('#menuList .cur').forEach((b) => b.classList.remove('cur'));
      const b = map[e.target.id];
      if (b) b.classList.add('cur');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(map).forEach((id) => {
    const s = $(id);
    if (s) io.observe(s);
  });
}

function openMenu() {
  $('menu').classList.add('open');
  $('menuBd').classList.add('open');
  $('menu').setAttribute('aria-hidden', 'false');
  $('burgerBtn').classList.add('on');
  $('burgerBtn').setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  $('menu').classList.remove('open');
  $('menuBd').classList.remove('open');
  $('menu').setAttribute('aria-hidden', 'true');
  $('burgerBtn').classList.remove('on');
  $('burgerBtn').setAttribute('aria-expanded', 'false');
  if (!applyOpen && !modalCourse) document.body.style.overflow = '';
}

let ytQueue = [];
let ytLoading = false;
const players = [];

function loadYT(cb, fail) {
  if (window.YT && window.YT.Player) {
    cb();
    return;
  }
  ytQueue.push({ cb: cb, fail: fail });
  if (ytLoading) return;
  ytLoading = true;
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    ytLoading = false;
    const q = ytQueue;
    ytQueue = [];
    q.forEach((o) => safe(o.cb));
    if (typeof prev === 'function') safe(prev);
  };
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  s.async = true;
  s.onerror = () => {
    ytLoading = false;
    const q = ytQueue;
    ytQueue = [];
    q.forEach((o) => { if (o.fail) safe(o.fail); });
    s.remove();
  };
  document.head.appendChild(s);
}

function fmt(t) {
  t = Math.max(0, Math.floor(t || 0));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function buildPlayer(root) {
  const vid = root.dataset.vid;
  if (!vid) return;
  const title = root.dataset.title || 'Video';
  const isTv = root.classList.contains('tv-vp');
  root.innerHTML =
    '<div class="vp-stage">' +
      '<div class="vp-mount"></div>' +
      '<div class="vp-mask"></div>' +
      '<div class="vp-shield"></div>' +
      '<div class="vp-pause"><i class="fa-solid fa-circle-pause"></i></div>' +
      '<div class="vp-cover"><button type="button" class="vp-big" aria-label="Play ' + esc(title) + '"><i class="fa-solid fa-play"></i></button></div>' +
      '<div class="vp-load"><span></span></div>' +
      '<div class="vp-ctl"><button type="button" class="vp-pp" aria-label="Play or pause"><i class="fa-solid fa-pause"></i></button><input type="range" class="vp-seek" min="0" max="1000" value="0" aria-label="Seek"><span class="vp-time">0:00 / 0:00</span><button type="button" class="vp-mute" aria-label="Mute"><i class="fa-solid fa-volume-high"></i></button><button type="button" class="vp-fs" aria-label="Full screen"><i class="fa-solid fa-expand"></i></button></div>' +
      '<div class="vp-fail"><i class="fa-solid fa-triangle-exclamation"></i><p>This video could not play here.</p><div class="vp-fail-btns"><button type="button" class="vp-retry">Try again</button><a class="vp-yt" href="https://www.youtube.com/watch?v=' + esc(encodeURIComponent(vid)) + '" target="_blank" rel="noopener noreferrer">Watch on YouTube</a></div></div>' +
    '</div>' + (isTv ? '<div class="spk"></div><div class="knobs"><i></i><i></i></div>' : '');

  const stage = root.querySelector('.vp-stage');
  const cover = root.querySelector('.vp-cover');
  const seek = root.querySelector('.vp-seek');
  const time = root.querySelector('.vp-time');
  const pp = root.querySelector('.vp-pp i');
  const mute = root.querySelector('.vp-mute i');
  const fsIcon = root.querySelector('.vp-fs i');
  let player = null, poll = null, idleT = null, loadT = null, tapT = null, dragging = false, ready = false, hostIdx = 0;

  const paintPoster = () => {
    if (!cover) return;
    cover.style.backgroundSize = 'cover';
    cover.style.backgroundPosition = 'center';
    cover.style.backgroundRepeat = 'no-repeat';
    const names = ['hqdefault', 'mqdefault', 'default'];
    let i = 0;
    const next = () => {
      if (i >= names.length) return;
      const u = 'https://i.ytimg.com/vi/' + encodeURIComponent(vid) + '/' + names[i++] + '.jpg';
      const im = new Image();
      im.onload = () => { cover.style.backgroundImage = 'url(' + u + ')'; };
      im.onerror = next;
      im.src = u;
    };
    next();
  };

  if ('IntersectionObserver' in window) {
    const po = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) {
        po.disconnect();
        paintPoster();
      }
    }, { rootMargin: '500px 0px' });
    po.observe(root);
  } else {
    paintPoster();
  }

  const setPlayIcon = (playing) => { pp.className = 'fa-solid ' + (playing ? 'fa-pause' : 'fa-play'); };

  const tickProgress = () => {
    if (!player || !ready || dragging) return;
    const d = player.getDuration() || 0;
    const c = player.getCurrentTime() || 0;
    if (d > 0) {
      const v = (c / d) * 1000;
      seek.value = v;
      seek.style.setProperty('--p', (v / 10) + '%');
      time.textContent = fmt(c) + ' / ' + fmt(d);
    }
  };

  const wake = () => {
    root.classList.remove('idle');
    clearTimeout(idleT);
    idleT = setTimeout(() => root.classList.add('idle'), 2800);
  };

  const api = {
    pause: () => {
      if (player && ready) {
        try { if (player.getPlayerState() === 1) player.pauseVideo(); } catch (er) {}
      }
    }
  };
  players.push(api);

  const resetClasses = () => {
    root.classList.remove('loading', 'playing', 'paused', 'started', 'live', 'opened', 'idle');
  };

  const freshMount = () => {
    qsa('.vp-mount, iframe', stage).forEach((n) => n.remove());
    const m = document.createElement('div');
    m.className = 'vp-mount';
    stage.insertBefore(m, stage.firstChild);
    return m;
  };

  const dropPlayer = () => {
    clearInterval(poll);
    clearTimeout(loadT);
    clearTimeout(tapT);
    ready = false;
    if (player) {
      try { player.destroy(); } catch (er) {}
    }
    player = null;
  };

  const fail = () => {
    dropPlayer();
    freshMount();
    resetClasses();
    setPlayIcon(false);
    root.classList.add('failed');
  };

  const onState = (e) => {
    const s = e.data;
    if (s === 1) {
      clearTimeout(loadT);
      clearTimeout(tapT);
      root.classList.remove('loading', 'paused', 'failed');
      root.classList.add('playing', 'started', 'live', 'opened');
      setPlayIcon(true);
      clearInterval(poll);
      poll = setInterval(tickProgress, 250);
      players.forEach((o) => { if (o !== api) o.pause(); });
      wake();
    } else if (s === 2) {
      root.classList.remove('playing');
      root.classList.add('paused');
      setPlayIcon(false);
      tickProgress();
    } else if (s === 0) {
      clearInterval(poll);
      resetClasses();
      setPlayIcon(false);
      seek.value = 0;
      seek.style.setProperty('--p', '0%');
      try { player.seekTo(0, true); player.pauseVideo(); } catch (er) {}
    } else if (s === 3) {
      root.classList.add('loading');
    }
    if (s !== 3) root.classList.remove('loading');
  };

  const onError = () => {
    if (hostIdx < YT_HOSTS.length - 1) {
      hostIdx++;
      dropPlayer();
      create();
      return;
    }
    fail();
  };

  const create = () => {
    if (!(window.YT && window.YT.Player)) {
      fail();
      return;
    }
    const mount = freshMount();
    const vars = { controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, playsinline: 1, autoplay: 1, cc_load_policy: 0 };
    if (/^https?:$/.test(location.protocol)) vars.origin = location.origin;
    clearTimeout(loadT);
    loadT = setTimeout(() => { if (!ready) onError(); }, YT_LOAD_TIMEOUT_MS);
    try {
      player = new window.YT.Player(mount, {
        videoId: vid,
        host: YT_HOSTS[hostIdx],
        playerVars: vars,
        events: {
          onReady: (e) => {
            ready = true;
            clearTimeout(loadT);
            try { e.target.playVideo(); } catch (er) {}
            clearTimeout(tapT);
            tapT = setTimeout(() => {
              let st = -2;
              try { st = player.getPlayerState(); } catch (er) {}
              if (st !== 1 && st !== 3) root.classList.remove('loading');
            }, YT_TAP_TIMEOUT_MS);
          },
          onStateChange: onState,
          onError: onError
        }
      });
    } catch (er) {
      onError();
    }
  };

  const start = () => {
    root.classList.remove('failed');
    if (player && ready) {
      try { player.playVideo(); } catch (er) {}
      return;
    }
    if (player) return;
    root.classList.add('loading');
    clearTimeout(loadT);
    loadT = setTimeout(() => { if (!ready) fail(); }, YT_LOAD_TIMEOUT_MS + 5000);
    loadYT(create, fail);
  };

  const toggle = () => {
    if (!player || !ready) {
      start();
      return;
    }
    let st = -1;
    try { st = player.getPlayerState(); } catch (er) {}
    if (st === 1 || st === 3) player.pauseVideo();
    else player.playVideo();
  };

  const inFs = () => stage.classList.contains('fake') || document.fullscreenElement === stage || document.webkitFullscreenElement === stage;
  const fakeFs = () => {
    stage.classList.add('fake');
    document.body.style.overflow = 'hidden';
    fsIcon.className = 'fa-solid fa-compress';
  };
  const enterFs = () => {
    const fn = stage.requestFullscreen || stage.webkitRequestFullscreen || stage.msRequestFullscreen;
    if (fn) {
      try {
        const r = fn.call(stage);
        if (r && r.catch) r.catch(fakeFs);
        return;
      } catch (er) {}
    }
    fakeFs();
  };
  const exitFs = () => {
    if (stage.classList.contains('fake')) {
      stage.classList.remove('fake');
      if (!applyOpen && !modalCourse) document.body.style.overflow = '';
      fsIcon.className = 'fa-solid fa-expand';
      return;
    }
    const ex = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (ex) {
      try { ex.call(document); } catch (er) {}
    }
  };
  const onFsChange = () => { fsIcon.className = 'fa-solid ' + (inFs() ? 'fa-compress' : 'fa-expand'); };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  root.querySelector('.vp-big').addEventListener('click', start);
  root.querySelector('.vp-retry').addEventListener('click', () => {
    hostIdx = 0;
    start();
  });
  root.querySelector('.vp-shield').addEventListener('click', () => {
    if (root.classList.contains('started')) {
      toggle();
      wake();
    } else start();
  });
  root.querySelector('.vp-pause').addEventListener('click', toggle);
  root.querySelector('.vp-pp').addEventListener('click', toggle);
  root.querySelector('.vp-mute').addEventListener('click', () => {
    if (!player || !ready) return;
    if (player.isMuted()) {
      player.unMute();
      mute.className = 'fa-solid fa-volume-high';
    } else {
      player.mute();
      mute.className = 'fa-solid fa-volume-xmark';
    }
  });
  root.querySelector('.vp-fs').addEventListener('click', () => { if (inFs()) exitFs(); else enterFs(); });
  seek.addEventListener('input', () => {
    dragging = true;
    seek.style.setProperty('--p', (seek.value / 10) + '%');
    if (player && ready) {
      const d = player.getDuration() || 0;
      time.textContent = fmt(d * seek.value / 1000) + ' / ' + fmt(d);
    }
  });
  seek.addEventListener('change', () => {
    if (player && ready) player.seekTo((player.getDuration() || 0) * seek.value / 1000, true);
    dragging = false;
  });
  root.addEventListener('pointermove', () => { if (root.classList.contains('playing')) wake(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stage.classList.contains('fake')) exitFs(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { if (!es[0].isIntersecting && !inFs()) api.pause(); }, { threshold: 0 }).observe(root);
  }
}

function setupPlayers() {
  qsa('.vp').forEach((v) => safe(() => buildPlayer(v)));
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

const ERR_KEYS = ['Indigene', 'Face', 'Name', 'Phone', 'Email', 'Gender', 'Age', 'Lga', 'Town', 'Course', 'Level'];

function setErr(key, msg) {
  const e = $('e' + key);
  if (e) {
    e.textContent = msg;
    e.classList.add('show');
  }
  const box = document.querySelector('[data-field="' + key + '"]');
  if (box) box.classList.add('has-err');
}

function clearErr(key) {
  const e = $('e' + key);
  if (e) {
    e.textContent = '';
    e.classList.remove('show');
  }
  const box = document.querySelector('[data-field="' + key + '"]');
  if (box) box.classList.remove('has-err');
}

function clearAllErrors() {
  ERR_KEYS.forEach(clearErr);
  const fe = $('formError');
  if (fe) {
    fe.textContent = '';
    fe.classList.remove('show');
  }
}

function showFormError(msg) {
  const fe = $('formError');
  if (!fe) return;
  fe.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ' + esc(msg);
  fe.classList.add('show');
}

function updateProgress() {
  const bar = $('applyBar');
  if (!bar) return;
  const age = parseInt(($('fAge') || {}).value, 10);
  const checks = [
    Boolean(media.indigene.url),
    Boolean(media.face.url),
    String(($('fName') || {}).value || '').trim().split(/\s+/).filter(Boolean).length >= 2,
    Boolean(normalizePhone(($('fPhone') || {}).value)),
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(($('fEmail') || {}).value || '').trim()),
    Boolean(getRadio('gender')),
    age >= 10 && age <= 70,
    Boolean(getRadio('lga')),
    String(($('fTown') || {}).value || '').trim().length >= 2,
    Boolean(selectedCourse),
    Boolean(($('fLevel') || {}).value)
  ];
  const done = checks.filter(Boolean).length;
  bar.style.width = Math.round((done / checks.length) * 100) + '%';
}

function paintMedia(kind) {
  const m = media[kind];
  const preview = $(kind + 'Preview');
  const empty = $(kind + 'Empty');
  const ok = $(kind + 'Ok');
  const load = $(kind + 'Load');
  const view = $(kind + 'View');
  const has = Boolean(m.local);
  if (preview) {
    if (has) preview.src = m.local;
    preview.classList.toggle('hidden', !has);
  }
  if (empty) empty.classList.toggle('hidden', has);
  const good = Boolean(m.url) && !m.busy;
  if (ok) ok.classList.toggle('hidden', !good);
  if (load) load.classList.toggle('hidden', !m.busy);
  if (view) view.classList.toggle('done', good);
  const ids = kind === 'face' ? ['faceBtn'] : ['indigeneCamBtn', 'indigeneUpBtn'];
  ids.forEach((id) => {
    const b = $(id);
    if (b) b.disabled = m.busy;
  });
  const label = kind === 'face' ? $('faceBtn') : $('indigeneCamBtn');
  const sp = label ? label.querySelector('span') : null;
  if (sp) sp.textContent = kind === 'face' ? (has ? 'Take it again' : 'Take your photo') : (has ? 'Take again' : 'Take photo');
}

function resetMedia() {
  ['indigene', 'face'].forEach((k) => {
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

function drawToJpeg(source, width, height) {
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
}

function fileToJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const out = drawToJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
        URL.revokeObjectURL(url);
        resolve(out);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
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
  clearErr(kind === 'face' ? 'Face' : 'Indigene');
  paintMedia(kind);
  updateProgress();
  try {
    const link = await uploadToImgur(dataUrl.split(',')[1] || '');
    if (seq !== m.seq) return;
    m.url = link;
    m.busy = false;
  } catch (_) {
    if (seq !== m.seq) return;
    m.url = '';
    m.local = '';
    m.busy = false;
    toast('error', 'Upload failed', 'We could not upload your photo. Please check your network and try again.');
  }
  paintMedia(kind);
  updateProgress();
}

async function handleFile(kind, file) {
  if (!file) return;
  if (!/^image\//i.test(file.type || 'image/jpeg')) {
    toast('error', 'Wrong file', 'Please choose a photo.');
    return;
  }
  try {
    const d = await fileToJpeg(file);
    processImage(kind, d);
  } catch (_) {
    toast('error', 'Photo problem', 'We could not read this photo. Please try another photo.');
  }
}

function stopStream() {
  if (camStream) camStream.getTracks().forEach((t) => { try { t.stop(); } catch (e) {} });
  camStream = null;
  const v = $('camVideo');
  if (v) {
    try { v.pause(); } catch (e) {}
    v.srcObject = null;
  }
}

function setCamError(msg) {
  const box = $('camErr');
  const txt = $('camErrText');
  const shot = $('camShot');
  if (txt) txt.textContent = msg || '';
  if (box) box.classList.toggle('hidden', !msg);
  if (shot) shot.disabled = Boolean(msg);
}

async function startCam() {
  if (camStarting) return;
  camStarting = true;
  stopStream();
  setCamError('');
  const video = $('camVideo');
  const attempts = [
    { video: { facingMode: { exact: camFacing }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false },
    { video: { facingMode: { ideal: camFacing }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false },
    { video: true, audio: false }
  ];
  try {
    let stream = null;
    let lastErr = null;
    for (let i = 0; i < attempts.length && !stream; i++) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(attempts[i]);
      } catch (err) {
        lastErr = err;
        if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) throw err;
      }
    }
    if (!stream) throw lastErr || new Error('camera');
    if (!$('camModal').classList.contains('open')) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    camStream = stream;
    const track = stream.getVideoTracks()[0];
    const settings = track && track.getSettings ? track.getSettings() : {};
    const facing = settings.facingMode || camFacing;
    video.srcObject = stream;
    video.classList.toggle('mirror', facing === 'user');
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const count = devs.filter((d) => d.kind === 'videoinput').length;
      const sw = $('camSwitch');
      if (sw) sw.style.visibility = count > 1 ? 'visible' : 'hidden';
    } catch (_) {}
  } catch (err) {
    const name = err && err.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') setCamError('Camera is blocked. Please allow camera access in your browser settings and try again.');
    else if (name === 'NotFoundError' || name === 'OverconstrainedError') setCamError('No camera was found on this device.');
    else setCamError('We could not open the camera. Please close other apps that use the camera and try again.');
  } finally {
    camStarting = false;
  }
}

function openCam(target) {
  const modal = $('camModal');
  if (!modal) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const fb = target === 'face' ? $('faceFile') : $('indigeneCamFile');
    if (fb) fb.click();
    return;
  }
  camTarget = target;
  camFacing = target === 'face' ? 'user' : 'environment';
  $('camGuide').className = 'cam-guide ' + (target === 'face' ? 'face' : 'card');
  $('camTitle').textContent = target === 'face' ? 'Take your face photo' : 'Take a photo of your indigene letter';
  $('camHint').textContent = target === 'face' ? 'Put your face inside the circle and look straight at the camera.' : 'Put the letter flat inside the box. Make all words clear.';
  $('camSwitch').style.visibility = 'visible';
  modal.classList.add('open');
  startCam();
}

function closeCam() {
  const modal = $('camModal');
  if (modal) modal.classList.remove('open');
  stopStream();
  setCamError('');
  camTarget = '';
}

function switchCam() {
  camFacing = camFacing === 'user' ? 'environment' : 'user';
  startCam();
}

function takeShot() {
  const video = $('camVideo');
  if (!video || !video.videoWidth || !camStream) return;
  const target = camTarget;
  let dataUrl = '';
  try {
    dataUrl = drawToJpeg(video, video.videoWidth, video.videoHeight);
  } catch (e) {
    toast('error', 'Photo problem', 'We could not take the photo. Please try again.');
    return;
  }
  closeCam();
  if (target) processImage(target, dataUrl);
}

function revealApply(x, y) {
  const ap = $('applyPage');
  if (!ap) return;
  ap.style.setProperty('--x', x + 'px');
  ap.style.setProperty('--y', y + 'px');
  ap.scrollTop = 0;
  ap.classList.add('open');
  document.body.style.overflow = 'hidden';
  applyOpen = true;
  try { history.pushState({ apply: 1 }, '', '#apply'); } catch (e) {}
  updateProgress();
}

function hideApply() {
  const ap = $('applyPage');
  if (ap) ap.classList.remove('open');
  applyOpen = false;
  closeSheet();
  closeCam();
  document.body.style.overflow = '';
}

function closeApply() {
  if (!applyOpen) return;
  if (history.state && history.state.apply) history.back();
  else hideApply();
}

function openApply(origin, course) {
  if (course) setCourse(course);
  closeModal();
  closeMenu();
  const rect = origin && origin.getBoundingClientRect ? origin.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  revealApply(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function validateForm() {
  clearAllErrors();
  let first = null;
  const bad = (key, el, msg) => {
    setErr(key, msg);
    if (!first) first = el;
  };
  if (media.indigene.busy) bad('Indigene', $('indigeneCamBtn'), 'Please wait. Your indigene photo is still uploading.');
  else if (!media.indigene.url) bad('Indigene', $('indigeneCamBtn'), 'You must take or upload a photo of your indigene letter first.');
  if (media.face.busy) bad('Face', $('faceBtn'), 'Please wait. Your face photo is still uploading.');
  else if (!media.face.url) bad('Face', $('faceBtn'), 'Please take your face photo.');
  const name = String($('fName').value || '').trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.split(' ').length < 2 || !/^[A-Za-zÀ-ɏƁɓƊɗƳƴ][A-Za-zÀ-ɏƁɓƊɗƳƴ\s.'\-]*$/.test(name)) bad('Name', $('fName'), 'Please write your first name and last name.');
  if (!normalizePhone($('fPhone').value)) bad('Phone', $('fPhone'), 'Please enter a correct phone number, for example 08012345678.');
  const email = String($('fEmail').value || '').trim();
  if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test(email)) bad('Email', $('fEmail'), 'Please enter a correct email address.');
  if (!getRadio('gender')) bad('Gender', $('gMale'), 'Please choose male or female.');
  const age = parseInt($('fAge').value, 10);
  if (!(age >= 10 && age <= 70)) bad('Age', $('fAge'), 'Please enter your correct age.');
  if (!getRadio('lga')) bad('Lga', $('lGusau'), 'Please choose Gusau or Tsafe.');
  if (String($('fTown').value || '').trim().length < 2) bad('Town', $('fTown'), 'Please write your ward, town or village.');
  if (!selectedCourse) bad('Course', $('courseBtn'), 'Please choose the course you want to learn.');
  if (!$('fLevel').value) bad('Level', $('fLevel'), 'Please choose your level of education.');
  if (first) {
    try {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (first.focus) first.focus({ preventScroll: true });
    } catch (e) {}
    return false;
  }
  return true;
}

function setSubmitting(on) {
  submitting = on;
  const btn = $('submitBtn');
  if (!btn) return;
  btn.disabled = on;
  btn.innerHTML = on ? '<span class="spin"></span> Sending your application...' : '<i class="fa-solid fa-paper-plane"></i> Apply Now - It is Free';
}

function showDone(firstName) {
  $('doneName').textContent = firstName;
  $('applyForm').classList.add('hidden');
  $('applyIntro').classList.add('hidden');
  $('applyDone').classList.remove('hidden');
  $('applyBar').style.width = '100%';
  $('applyPage').scrollTop = 0;
}

function resetForm() {
  const form = $('applyForm');
  form.reset();
  setCourse(null);
  resetMedia();
  clearAllErrors();
  formUid = newUid();
  form.classList.remove('hidden');
  $('applyIntro').classList.remove('hidden');
  $('applyDone').classList.add('hidden');
  $('applyBar').style.width = '0%';
  $('applyPage').scrollTop = 0;
  updateProgress();
}

async function submitForm(e) {
  e.preventDefault();
  if (submitting) return;
  if (!validateForm()) return;
  const fullName = $('fName').value.trim().replace(/\s+/g, ' ');
  const payload = {
    uid: formUid,
    program: PROGRAM,
    partner: 'IDT Academy',
    full_name: fullName,
    phone: $('fPhone').value.trim(),
    email: $('fEmail').value.trim(),
    gender: getRadio('gender'),
    age: parseInt($('fAge').value, 10),
    country: 'Nigeria',
    state: 'Zamfara',
    constituency: 'Gusau/Tsafe',
    lga: getRadio('lga'),
    town: $('fTown').value.trim(),
    education: $('fLevel').value,
    indigene_url: media.indigene.url,
    face_url: media.face.url,
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
      const map = { full_name: 'Name', phone: 'Phone', email: 'Email', gender: 'Gender', age: 'Age', lga: 'Lga', town: 'Town', course: 'Course', education: 'Level', face_url: 'Face', indigene_url: 'Indigene' };
      if (data && data.field && map[data.field]) setErr(map[data.field], msg);
      showFormError(msg);
      return;
    }
    showDone(fullName.split(' ')[0]);
  } catch (err) {
    showFormError(err && err.name === 'AbortError' ? 'The request took too long. Please check your network and try again.' : 'We could not reach the server. Please check your network and try again.');
  } finally {
    clearTimeout(timer);
    setSubmitting(false);
  }
}

function bindEvents() {
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && !t.dataset.fb && t.closest('.cc, .pk-item, .pick, .cm-img')) {
      t.dataset.fb = '1';
      t.src = PLACEHOLDER_IMG;
    }
  }, true);

  document.addEventListener('click', (e) => {
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      copyText(copy.dataset.copy);
      return;
    }
    const more = e.target.closest('[data-more]');
    if (more) {
      appendCards(more.dataset.more);
      return;
    }
    const scroll = e.target.closest('.scroll-btn');
    if (scroll) {
      const row = $(scroll.dataset.target);
      if (row) row.scrollBy({ left: Number(scroll.dataset.scroll || 1) * 320, behavior: rm ? 'auto' : 'smooth' });
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act) {
      const course = findCourse(act.dataset.id);
      if (!course) return;
      if (act.dataset.act === 'view') openModal(course);
      else openApply(act, course);
      return;
    }
    const ap = e.target.closest('[data-apply]');
    if (ap) {
      openApply(ap, null);
      return;
    }
    const go = e.target.closest('[data-go]');
    if (go) {
      const target = go.dataset.go;
      const wasOpen = $('menu').classList.contains('open');
      closeMenu();
      setTimeout(() => scrollToSel(target), wasOpen ? 350 : 0);
    }
  });

  const on = (id, ev, fn) => {
    const el = $(id);
    if (el) el.addEventListener(ev, fn);
  };

  on('burgerBtn', 'click', () => { if ($('menu').classList.contains('open')) closeMenu(); else openMenu(); });
  on('menuClose', 'click', closeMenu);
  on('menuBd', 'click', closeMenu);
  on('cmClose', 'click', closeModal);
  on('courseModal', 'click', (e) => { if (e.target === $('courseModal')) closeModal(); });
  on('cmApply', 'click', (e) => { if (modalCourse) openApply(e.currentTarget, modalCourse); });
  on('applyBack', 'click', closeApply);
  on('doneBack', 'click', closeApply);
  on('doneAnother', 'click', resetForm);
  on('coursesRetry', 'click', initCourses);
  on('courseBtn', 'click', openSheet);
  on('pickClose', 'click', closeSheet);
  on('pickBackdrop', 'click', closeSheet);
  on('pickSearch', 'input', (e) => renderPicker(e.target.value));
  on('pickList', 'click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    const course = findCourse(b.dataset.pick);
    if (course) setCourse(course);
    closeSheet();
  });
  on('applyForm', 'submit', submitForm);
  on('applyForm', 'input', (e) => {
    const map = { fName: 'Name', fPhone: 'Phone', fEmail: 'Email', fAge: 'Age', fTown: 'Town', fLevel: 'Level' };
    if (e.target && map[e.target.id]) clearErr(map[e.target.id]);
    if (e.target && e.target.name === 'gender') clearErr('Gender');
    if (e.target && e.target.name === 'lga') clearErr('Lga');
    updateProgress();
  });
  on('faceBtn', 'click', () => openCam('face'));
  on('indigeneCamBtn', 'click', () => openCam('indigene'));
  on('indigeneUpBtn', 'click', () => $('indigeneFile').click());
  const fileHook = (id, kind) => {
    on(id, 'change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      handleFile(kind, file);
    });
  };
  fileHook('faceFile', 'face');
  fileHook('indigeneCamFile', 'indigene');
  fileHook('indigeneFile', 'indigene');
  on('camClose', 'click', closeCam);
  on('camSwitch', 'click', switchCam);
  on('camShot', 'click', takeShot);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopStream();
    else if ($('camModal').classList.contains('open')) startCam();
  });
  window.addEventListener('popstate', () => { if (applyOpen) hideApply(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('camModal').classList.contains('open')) closeCam();
    else if ($('pickSheet').classList.contains('open')) closeSheet();
    else if (modalCourse) closeModal();
    else if (applyOpen) closeApply();
    else closeMenu();
  });
}

function init() {
  safe(() => { formUid = newUid(); });
  safe(setupReveal);
  safe(setupCounters);
  safe(setupTilt);
  safe(setupScroll);
  safe(setupSpy);
  safe(setupNet);
  safe(setupPlayers);
  safe(() => setCourse(null));
  safe(() => paintMedia('indigene'));
  safe(() => paintMedia('face'));
  safe(bindEvents);
  initCourses().catch(() => showCoursesError());
  if (location.hash === '#apply') {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();


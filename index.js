import { supabase } from './supabase.js';

function showLoading() {
  let loader = document.getElementById('idt-loader-2');
  if (loader) {
    loader.classList.remove('idt-hide');
  } else {
    const loaderHTML = `
      <div class="idt-loader-2" id="idt-loader-2">
        <div class="i2-bg">
          <span class="i2-blob i2-b1"></span>
          <span class="i2-blob i2-b2"></span>
          <span class="i2-blob i2-b3"></span>
          <span class="i2-glow"></span>
          <span class="i2-grid"></span>
          <span class="i2-star i2-s1"></span><span class="i2-star i2-s2"></span>
          <span class="i2-star i2-s3"></span><span class="i2-star i2-s4"></span>
          <span class="i2-star i2-s5"></span><span class="i2-star i2-s6"></span>
          <span class="i2-star i2-s7"></span><span class="i2-star i2-s8"></span>
          <span class="i2-star i2-s9"></span><span class="i2-star i2-s10"></span>
          <span class="i2-star i2-s11"></span><span class="i2-star i2-s12"></span>
        </div>
        <div class="i2-wrap">
          <div class="i2-bookwrap">
            <span class="i2-orbit"></span>
            <div class="i2-book">
              <div class="i2-cover i2-cl"><img src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy" class="i2-coverlogo"></div>
              <div class="i2-cover i2-cr"><img src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy" class="i2-coverlogo i2-crlogo"></div>
              <div class="i2-page i2-p1"><i></i><i></i><i></i><i></i></div>
              <div class="i2-page i2-p2"><i></i><i></i><i></i></div>
              <div class="i2-page i2-p3"><i></i><i></i></div>
              <div class="i2-spine"></div>
              <div class="i2-ribbon"></div>
            </div>
          </div>
          <span class="i2-title">IDT <b>Academy</b></span>
          <span class="i2-tagline">Learn Beyond Limits</span>
          <div class="i2-loadbar"><span></span></div>
          <p class="i2-status">Turning pages... <b id="i2num">0</b>%</p>
        </div>
      </div>
      <style>
        .idt-loader-2{position:fixed;inset:0;z-index:99999;background:#05060f;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;transition:opacity .6s ease,visibility .6s ease;overflow:hidden;user-select:none}
        .idt-loader-2.idt-hide{opacity:0;visibility:hidden;pointer-events:none}
        .i2-bg{position:absolute;inset:0;overflow:hidden}
        .i2-blob{position:absolute;border-radius:50%;filter:blur(75px);opacity:.5}
        .i2-b1{width:420px;height:420px;left:-130px;top:-130px;background:#7c3aed;animation:i2drift1 14s ease-in-out infinite}
        .i2-b2{width:380px;height:380px;right:-110px;top:18%;background:#0ea5e9;animation:i2drift2 17s ease-in-out infinite}
        .i2-b3{width:320px;height:320px;left:32%;bottom:-150px;background:#f59e0b;opacity:.3;animation:i2drift3 19s ease-in-out infinite}
        @keyframes i2drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(90px,70px) scale(1.18)}}
        @keyframes i2drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-80px,60px) scale(1.12)}}
        @keyframes i2drift3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(60px,-70px) scale(1.2)}}
        .i2-glow{position:absolute;left:50%;top:50%;width:620px;height:620px;transform:translate(-50%,-50%);border-radius:50%;background:conic-gradient(from 0deg,transparent,rgba(124,92,255,.22),transparent 30%,rgba(34,211,238,.18),transparent 60%,rgba(251,191,36,.16),transparent);filter:blur(55px);animation:i2spin 11s linear infinite}
        .i2-grid{position:absolute;left:-60%;right:-60%;bottom:-8%;height:42%;background-image:linear-gradient(rgba(124,92,255,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(124,92,255,.16) 1px,transparent 1px);background-size:46px 46px;transform:perspective(420px) rotateX(60deg);transform-origin:bottom;animation:i2gridmove 3.4s linear infinite;-webkit-mask-image:linear-gradient(to top,rgba(0,0,0,.9),transparent);mask-image:linear-gradient(to top,rgba(0,0,0,.9),transparent)}
        @keyframes i2gridmove{to{background-position-y:46px}}
        .i2-star{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;animation:i2twinkle 3.2s ease-in-out infinite}
        .i2-s1{left:10%;top:16%}.i2-s2{left:82%;top:10%;animation-delay:.7s}.i2-s3{left:24%;top:78%;animation-delay:1.2s}
        .i2-s4{left:70%;top:80%;animation-delay:1.8s}.i2-s5{left:45%;top:6%;animation-delay:.4s}.i2-s6{left:6%;top:48%;animation-delay:2.2s}
        .i2-s7{left:92%;top:42%;animation-delay:1.5s}.i2-s8{left:58%;top:90%;animation-delay:.9s}.i2-s9{left:34%;top:24%;animation-delay:2.6s}
        .i2-s10{left:66%;top:30%;animation-delay:.2s}.i2-s11{left:16%;top:60%;animation-delay:1.9s}.i2-s12{left:88%;top:66%;animation-delay:2.9s}
        @keyframes i2twinkle{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:1;transform:scale(1.25)}}
        .i2-wrap{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center}
        .i2-bookwrap{position:relative;width:240px;height:240px;display:flex;align-items:center;justify-content:center}
        .i2-orbit{position:absolute;left:50%;top:50%;width:226px;height:226px;margin:-113px 0 0 -113px;border:1px dashed rgba(167,139,250,.35);border-radius:50%;animation:i2spin 8s linear infinite;pointer-events:none}
        .i2-orbit::before{content:"";position:absolute;top:-4px;left:50%;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:#fbbf24;box-shadow:0 0 14px #fbbf24}
        @keyframes i2spin{to{transform:rotate(360deg)}}
        .i2-book{position:relative;width:180px;height:126px;perspective:800px;animation:i2float 3.6s ease-in-out infinite;filter:drop-shadow(0 24px 40px rgba(124,92,255,.3))}
        @keyframes i2float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .i2-cover{position:absolute;top:0;width:50%;height:100%;background:linear-gradient(180deg,#8b5cf6,#6d28d9);box-shadow:0 14px 30px rgba(0,0,0,.35)}
        .i2-cl{left:0;border-radius:6px 2px 2px 6px;transform-origin:right center;animation:i2sway 3.6s ease-in-out infinite;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#a78bfa 0%,#8b5cf6 45%,#6d28d9 100%)}
        .i2-cr{right:0;border-radius:2px 6px 6px 2px;transform-origin:left center;background:linear-gradient(145deg,#7c3aed 0%,#6d28d9 50%,#4c1d95 100%);animation:i2sway 3.6s ease-in-out infinite reverse;display:flex;align-items:center;justify-content:center}
        @keyframes i2sway{0%,100%{transform:rotateY(0)}50%{transform:rotateY(16deg)}}
        .i2-coverlogo{width:48px;height:48px;object-fit:contain;background:#fff;border-radius:50%;padding:7px;box-shadow:0 6px 18px rgba(0,0,0,.4),0 0 0 2px rgba(255,255,255,.25)}
        .i2-crlogo{width:42px;height:42px;opacity:.85}
        .i2-page{position:absolute;top:5px;left:50%;width:46%;height:92%;background:linear-gradient(180deg,#f8fafc,#e2e8f0);border-radius:2px 6px 6px 2px;transform-origin:left center;box-shadow:0 0 16px rgba(0,0,0,.3);display:flex;flex-direction:column;padding-top:8px}
        .i2-page i{display:block;height:2px;border-radius:2px;background:#cbd5e1;margin:5px 10px}
        .i2-page i:nth-child(2){width:78%;background:#c4b5fd}
        .i2-page i:nth-child(3){width:60%}
        .i2-page i:nth-child(4){width:86%;background:#a5f3fc}
        .i2-p1{z-index:3;animation:i2flip 3.6s ease-in-out infinite}
        .i2-p2{z-index:2;animation:i2flip 3.6s ease-in-out 1.2s infinite}
        .i2-p3{z-index:1;animation:i2flip 3.6s ease-in-out 2.4s infinite}
        @keyframes i2flip{0%{transform:rotateY(0)}40%{transform:rotateY(-160deg)}70%,100%{transform:rotateY(0)}}
        .i2-spine{position:absolute;left:50%;top:0;bottom:0;width:9px;margin-left:-4.5px;background:linear-gradient(90deg,rgba(0,0,0,.45),rgba(0,0,0,.05) 50%,rgba(0,0,0,.45));border-radius:4px;z-index:4}
        .i2-ribbon{position:absolute;left:50%;bottom:-24px;width:13px;height:24px;margin-left:-6.5px;background:linear-gradient(180deg,#fbbf24,#d97706);border-radius:0 0 7px 7px;transform-origin:top center;z-index:5;animation:i2dangle 3.6s ease-in-out infinite;box-shadow:0 6px 14px rgba(217,119,6,.45)}
        @keyframes i2dangle{0%,100%{transform:rotate(0)}50%{transform:rotate(12deg)}}
        .i2-title{margin-top:18px;font-size:27px;font-weight:800;letter-spacing:5px;text-transform:uppercase;background:linear-gradient(90deg,#f8fafc 0%,#a78bfa 30%,#22d3ee 55%,#fbbf24 80%,#f8fafc 100%);background-size:220% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:i2shine 4s linear infinite}
        .i2-title b{font-weight:900}
        @keyframes i2shine{to{background-position:220% center}}
        .i2-tagline{margin-top:9px;font-size:11px;letter-spacing:7px;color:#8b93c7;text-transform:uppercase}
        .i2-loadbar{width:230px;height:4px;border-radius:4px;background:rgba(255,255,255,.09);margin-top:24px;overflow:hidden}
        .i2-loadbar span{display:block;height:100%;width:100%;border-radius:4px;background:linear-gradient(90deg,#7c3aed,#22d3ee,#fbbf24);transform-origin:left;animation:i2fill 2.8s ease-in-out forwards}
        @keyframes i2fill{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
        .i2-status{margin-top:13px;font-size:12px;letter-spacing:3px;color:#94a3b8;text-transform:uppercase;animation:i2fade 2.4s ease-in-out infinite}
        .i2-status b{color:#fbbf24}
        @keyframes i2fade{0%,100%{opacity:.45}50%{opacity:1}}
      </style>
    `;
    document.body.insertAdjacentHTML('beforeend', loaderHTML);
  }
  const n = document.getElementById('i2num');
  let c = 0;
  if (window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
  window.idtLoaderInterval = setInterval(() => {
    c += 3;
    if (n) n.textContent = String(c >= 100 ? 100 : c);
    if (c >= 100) clearInterval(window.idtLoaderInterval);
  }, 84);
}

function hideLoading() {
  const l = document.getElementById('idt-loader-2');
  if (window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
  if (l) l.classList.add('idt-hide');
}

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
    setTimeout(hideLoading, 400);
  }
}

function getRefFromPath() {
  const m = window.location.pathname.match(/\/ref\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : '';
}

function handleRefCode() {
  const refBanner = $('refBanner');
  const refBannerTitle = $('refBannerTitle');
  const refBannerMsg = $('refBannerMsg');
  const params = new URLSearchParams(window.location.search);
  let ref = (params.get('ref') || '').trim();
  if (!ref) ref = getRefFromPath();
  if (ref) {
    try { localStorage.setItem('idt_ref', ref); } catch (e) {}
    try { sessionStorage.setItem('idt_ref_session', ref); } catch (e) {}
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
        '<button class="btn btn-start" data-action="start"><i class="fa-solid fa-rocket"></i> Start</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function injectAllEmptyBlock() {
  let el = $('allEmpty');
  if (el) return el;
  const styleEl = document.createElement('style');
  styleEl.textContent = '.all-empty{text-align:center;padding:56px 20px;background:#fff;border:2px dashed rgba(124,58,237,.25);border-radius:26px;margin:10px auto 60px;max-width:640px}.all-empty i{font-size:44px;color:#a78bfa;margin-bottom:14px}.all-empty h3{font-size:21px;font-weight:900;margin-bottom:8px}.all-empty p{color:#6d6a8a;font-size:14px;line-height:1.65}';
  document.head.appendChild(styleEl);
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

function injectSearchStyles() {
  if (document.getElementById('idt-search-style')) return;
  const st = document.createElement('style');
  st.id = 'idt-search-style';
  st.textContent = '.course-search-wrap{position:relative;max-width:640px;margin:0 auto 40px;z-index:60;padding:0 8px}.course-search-box{display:flex;align-items:center;gap:12px;background:#fff;border:2px solid rgba(124,58,237,.18);border-radius:60px;padding:14px 22px;box-shadow:0 10px 30px rgba(76,29,149,.08);transition:border-color .25s ease,box-shadow .25s ease}.course-search-box:focus-within{border-color:#7c3aed;box-shadow:0 12px 34px rgba(124,58,237,.18)}.course-search-box .srch-ico{color:#a78bfa;font-size:17px;flex-shrink:0}.course-search-input{flex:1;border:none;outline:none;background:transparent;font-size:15px;font-weight:600;color:#2d2350;font-family:inherit;min-width:0}.course-search-input::placeholder{color:#a8a3c4;font-weight:500}.course-search-clear{display:none;align-items:center;justify-content:center;width:30px;height:30px;border:none;border-radius:50%;background:rgba(124,58,237,.1);color:#7c3aed;cursor:pointer;flex-shrink:0;transition:background .2s ease}.course-search-clear:hover{background:rgba(124,58,237,.2)}.course-search-clear.show{display:flex}.course-search-results{display:none;position:absolute;top:calc(100% + 10px);left:8px;right:8px;background:#fff;border:1px solid rgba(124,58,237,.14);border-radius:22px;box-shadow:0 24px 60px rgba(46,16,101,.16);overflow:hidden;max-height:420px;overflow-y:auto}.course-search-results.open{display:block;animation:csrIn .28s ease}@keyframes csrIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}.csr-item{display:flex;align-items:center;gap:14px;padding:13px 18px;cursor:pointer;transition:background .18s ease;border-bottom:1px solid rgba(124,58,237,.07)}.csr-item:last-child{border-bottom:none}.csr-item:hover{background:rgba(124,58,237,.06)}.csr-img{width:64px;height:48px;border-radius:12px;object-fit:cover;flex-shrink:0;background:#ede9fe}.csr-body{flex:1;min-width:0}.csr-body h5{font-size:14px;font-weight:800;color:#2d2350;margin:0 0 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.csr-body span{font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.5px}.csr-price{font-size:13px;font-weight:800;color:#059669;flex-shrink:0;white-space:nowrap}.csr-arrow{color:#c4b5fd;flex-shrink:0}.csr-empty{padding:26px 20px;text-align:center;color:#8b84a8;font-size:14px;font-weight:600}.csr-empty i{display:block;font-size:26px;color:#c4b5fd;margin-bottom:8px}@media (max-width:640px){.course-search-box{padding:12px 16px}.csr-img{width:52px;height:40px}.course-search-results{max-height:340px}}';
  document.head.appendChild(st);
}

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
  showLoading();
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
  });
});
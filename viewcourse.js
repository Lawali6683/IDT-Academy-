const API = '/api/viewcourse';
const PAGE_SIZE = 3;
const LOGO_URL = 'https://i.imgur.com/oyqM5oF.png';

const $ = (id) => document.getElementById(id);

let user = null;
let courses = [];
let activeCourse = null;
let topics = [];
let shown = 0;
let players = [];
let activePlayer = null;
let ytApiPromise = null;
let toastCount = 0;

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function money(n) {
  return '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function miniLoad(text) {
  $('miniLoaderText').textContent = text || 'Please wait...';
  $('miniLoader').classList.add('open');
}

function miniHide() {
  $('miniLoader').classList.remove('open');
}

function toast(type, title, message) {
  const wrap = $('toastWrap');
  if (!wrap || toastCount >= 3) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><div class="toast-body"><b>' + esc(title) + '</b><p>' + esc(message) + '</p></div><button class="toast-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  const close = () => {
    el.classList.add('out');
    setTimeout(() => {
      el.remove();
      toastCount = Math.max(0, toastCount - 1);
    }, 320);
  };
  el.querySelector('.toast-x').addEventListener('click', close);
  wrap.appendChild(el);
  toastCount++;
  setTimeout(close, type === 'error' ? 6500 : 3500);
}

async function api(body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ user_id: user.id }, body)), signal: ctrl.signal });
    let data = null;
    try { data = await res.json(); } catch (_) { data = null; }
    if (!res.ok || !data || data.success === false) {
      const err = new Error((data && data.error) || 'The request failed. Please try again.');
      err.data = data;
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

function fmtTime(sec) {
  const t = Math.max(0, Math.floor(Number(sec) || 0));
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
}

function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === 'function') {
        try { prev(); } catch (_) {}
      }
      resolve(window.YT);
    };
    const sc = document.createElement('script');
    sc.src = 'https://www.youtube.com/iframe_api';
    sc.async = true;
    sc.onerror = () => {
      ytApiPromise = null;
      reject(new Error('Video player could not load'));
    };
    document.head.appendChild(sc);
    setTimeout(() => {
      if (!(window.YT && window.YT.Player)) {
        ytApiPromise = null;
        reject(new Error('Video player took too long to load'));
      }
    }, 10000);
  });
  return ytApiPromise;
}

function toggleFullscreen(box) {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl === box) {
    try {
      const fn = document.exitFullscreen || document.webkitExitFullscreen;
      const r = fn.call(document);
      if (r && r.catch) r.catch(() => {});
    } catch (_) {}
    return;
  }
  if (box.classList.contains('vp-pseudo-fs')) {
    box.classList.remove('vp-pseudo-fs');
    document.body.style.overflow = '';
    return;
  }
  const usePseudo = () => {
    box.classList.add('vp-pseudo-fs');
    document.body.style.overflow = 'hidden';
  };
  const req = box.requestFullscreen || box.webkitRequestFullscreen;
  if (req) {
    try {
      const r = req.call(box);
      if (r && r.catch) r.catch(usePseudo);
      return;
    } catch (_) {}
  }
  usePseudo();
}

function registerPlayer(ctrl) {
  players.push(ctrl);
  return ctrl;
}

function claimActive(ctrl) {
  if (activePlayer && activePlayer !== ctrl) activePlayer.pause();
  activePlayer = ctrl;
}

function destroyPlayers() {
  players.forEach((p) => p.destroy());
  players = [];
  activePlayer = null;
  document.body.style.overflow = '';
}

function mountYouTube(box, videoId, posterUrl) {
  const shield = document.createElement('div');
  shield.className = 'vp-shield';
  const cover = document.createElement('div');
  cover.className = 'vp-cover';
  cover.innerHTML = '<img class="vp-poster" src="' + esc(posterUrl) + '" alt="" loading="lazy" decoding="async"><button type="button" class="vp-play" aria-label="Play video"><i class="fa-solid fa-play"></i></button><div class="vp-msg hidden"></div>';
  const poster = cover.querySelector('.vp-poster');
  poster.addEventListener('error', () => poster.remove());
  const playBtn = cover.querySelector('.vp-play');
  const msg = cover.querySelector('.vp-msg');
  const bar = document.createElement('div');
  bar.className = 'vp-bar';
  bar.innerHTML = '<button type="button" class="vp-btn vp-toggle" aria-label="Play or pause"><i class="fa-solid fa-play"></i></button><span class="vp-time vp-cur">0:00</span><input type="range" class="vp-seek" min="0" max="1000" value="0" step="1" aria-label="Seek"><span class="vp-time vp-dur">0:00</span><button type="button" class="vp-btn vp-fs" aria-label="Fullscreen"><i class="fa-solid fa-expand"></i></button>';
  const toggle = bar.querySelector('.vp-toggle');
  const cur = bar.querySelector('.vp-cur');
  const dur = bar.querySelector('.vp-dur');
  const seek = bar.querySelector('.vp-seek');
  const fsBtn = bar.querySelector('.vp-fs');
  box.appendChild(shield);
  box.appendChild(cover);
  box.appendChild(bar);

  let iframe = null;
  let player = null;
  let ready = false;
  let pending = false;
  let started = false;
  let seeking = false;
  let host = 'www.youtube-nocookie.com';
  let hostSwitched = false;
  let readyTimer = null;
  let progressTimer = null;

  const setIcon = (playing) => {
    toggle.innerHTML = '<i class="fa-solid ' + (playing ? 'fa-pause' : 'fa-play') + '"></i>';
  };

  const teardown = () => {
    if (readyTimer) clearTimeout(readyTimer);
    readyTimer = null;
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = null;
    if (player && typeof player.destroy === 'function') {
      try { player.destroy(); } catch (_) {}
    }
    player = null;
    if (iframe && iframe.isConnected) iframe.remove();
    iframe = null;
    ready = false;
  };

  const ctrl = {
    pause() {
      if (player && ready) {
        try { player.pauseVideo(); } catch (_) {}
      }
    },
    destroy() {
      teardown();
      shield.remove();
      cover.remove();
      bar.remove();
    }
  };

  const fail = (text, retry) => {
    if (readyTimer) clearTimeout(readyTimer);
    readyTimer = null;
    cover.classList.add('vp-started');
    cover.classList.remove('hidden');
    playBtn.classList.add('hidden');
    msg.classList.remove('hidden');
    msg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><p>' + esc(text) + '</p>' + (retry ? '<button type="button" class="vp-retry"><i class="fa-solid fa-rotate-right"></i> Try again</button>' : '');
  };

  const onState = (code) => {
    if (code === 1) {
      started = true;
      cover.classList.add('vp-started');
      cover.classList.add('hidden');
      msg.classList.add('hidden');
      setIcon(true);
      claimActive(ctrl);
    } else if (code === 3) {
      if (started) cover.classList.add('hidden');
    } else {
      if (started) cover.classList.add('vp-started');
      cover.classList.remove('hidden');
      setIcon(false);
    }
  };

  const tickProgress = () => {
    if (!player || typeof player.getCurrentTime !== 'function') return;
    let c = 0;
    let d = 0;
    try {
      c = player.getCurrentTime() || 0;
      d = player.getDuration() || 0;
    } catch (_) {
      return;
    }
    if (d > 0 && !seeking) seek.value = String(Math.round((c / d) * 1000));
    cur.textContent = fmtTime(c);
    dur.textContent = fmtTime(d);
  };

  const basicEmbed = (target) => {
    const start = () => {
      target.style.pointerEvents = 'auto';
      target.allowFullscreen = true;
      target.src = target.src.replace('controls=0', 'controls=1').replace('fs=0', 'fs=1') + '&autoplay=1';
      shield.remove();
      cover.remove();
      bar.remove();
    };
    cover.addEventListener('click', start);
    shield.addEventListener('click', start);
    toggle.addEventListener('click', start);
  };

  const handleError = (code) => {
    if (code === 153 && !hostSwitched) {
      hostSwitched = true;
      host = 'www.youtube.com';
      pending = true;
      build();
      return;
    }
    if (code === 101 || code === 150) fail('This video cannot play here. Please tell customer care so they can fix it.', false);
    else if (code === 100) fail('This video was not found or it is private. Please tell customer care.', false);
    else fail('The video could not start. Please try again.', true);
  };

  function build() {
    teardown();
    iframe = document.createElement('iframe');
    iframe.className = 'vp-frame';
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    iframe.setAttribute('title', 'Lesson video');
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.src = 'https://' + host + '/embed/' + videoId + '?enablejsapi=1&autoplay=1&controls=0&rel=0&modestbranding=1&playsinline=1&fs=0&disablekb=1&iv_load_policy=3&cc_load_policy=0&origin=' + encodeURIComponent(window.location.origin);
    box.insertBefore(iframe, box.firstChild);
    readyTimer = setTimeout(() => {
      if (!ready) fail('The video is taking too long to load. Please check your internet and try again.', true);
    }, 15000);
    const mine = iframe;
    loadYouTubeApi().then((YT) => {
      if (iframe !== mine || !mine.isConnected) return;
      player = new YT.Player(mine, {
        events: {
          onReady: () => {
            ready = true;
            if (readyTimer) clearTimeout(readyTimer);
            readyTimer = null;
            if (pending) {
              pending = false;
              try { player.playVideo(); } catch (_) {}
            }
          },
          onStateChange: (e) => onState(e.data),
          onError: (e) => handleError(e.data)
        }
      });
      progressTimer = setInterval(tickProgress, 400);
    }).catch(() => {
      if (iframe === mine && mine.isConnected) {
        if (readyTimer) clearTimeout(readyTimer);
        readyTimer = null;
        basicEmbed(mine);
      }
    });
  }

  const retry = () => {
    msg.classList.add('hidden');
    msg.innerHTML = '';
    playBtn.classList.remove('hidden');
    if (!started) cover.classList.remove('vp-started');
    pending = true;
    build();
  };

  const press = () => {
    if (!iframe) {
      pending = true;
      build();
      return;
    }
    if (!player || !ready) {
      pending = true;
      return;
    }
    try {
      const st = player.getPlayerState();
      if (st === 1 || st === 3) player.pauseVideo();
      else player.playVideo();
    } catch (_) {}
  };

  shield.addEventListener('click', press);
  cover.addEventListener('click', (e) => {
    if (e.target.closest('.vp-retry')) {
      retry();
      return;
    }
    if (e.target.closest('.vp-msg')) return;
    press();
  });
  toggle.addEventListener('click', press);
  fsBtn.addEventListener('click', () => toggleFullscreen(box));
  seek.addEventListener('input', () => { seeking = true; });
  seek.addEventListener('change', () => {
    if (player && ready) {
      try {
        const d = player.getDuration() || 0;
        if (d > 0) player.seekTo((Number(seek.value) / 1000) * d, true);
      } catch (_) {}
    }
    seeking = false;
  });
  return registerPlayer(ctrl);
}

function mountDirect(box, url) {
  const vid = document.createElement('video');
  vid.src = url;
  vid.controls = true;
  vid.playsInline = true;
  vid.preload = 'metadata';
  vid.setAttribute('controlsList', 'nodownload noremoteplayback');
  vid.disablePictureInPicture = true;
  vid.addEventListener('contextmenu', (e) => e.preventDefault());
  box.appendChild(vid);
  const ctrl = {
    pause() {
      try { vid.pause(); } catch (_) {}
    },
    destroy() {
      try { vid.pause(); } catch (_) {}
      vid.removeAttribute('src');
      vid.remove();
    }
  };
  vid.addEventListener('play', () => claimActive(ctrl));
  return registerPlayer(ctrl);
}

function mountGeneric(box, url) {
  const cover = document.createElement('div');
  cover.className = 'vp-cover';
  cover.style.background = '#0b0d1a';
  cover.innerHTML = '<button type="button" class="vp-play" aria-label="Play video"><i class="fa-solid fa-play"></i></button>';
  box.appendChild(cover);
  let frame = null;
  cover.addEventListener('click', () => {
    frame = document.createElement('iframe');
    frame.src = url;
    frame.setAttribute('allow', 'autoplay; picture-in-picture; fullscreen');
    frame.setAttribute('title', 'Lesson video');
    frame.allowFullscreen = true;
    box.insertBefore(frame, box.firstChild);
    cover.remove();
  });
  const ctrl = {
    pause() {},
    destroy() {
      if (frame) frame.remove();
      cover.remove();
    }
  };
  return registerPlayer(ctrl);
}

function mountVideo(box, topic) {
  const url = topic.video_url;
  const yt = getYouTubeId(url);
  box.addEventListener('contextmenu', (e) => e.preventDefault());
  if (yt) return mountYouTube(box, yt, topic.poster_url || ('https://i.ytimg.com/vi/' + yt + '/hqdefault.jpg'));
  if (isDirectVideo(url)) return mountDirect(box, url);
  return mountGeneric(box, url);
}

function showOnly(id) {
  ['lockedCard', 'emptyCard', 'coursesCard', 'topicsCard'].forEach((x) => $(x).classList.toggle('hidden', x !== id));
}

function renderCourseList() {
  $('pageTitle').textContent = 'My Courses';
  $('pageSub').textContent = 'You have ' + courses.length + (courses.length === 1 ? ' course' : ' courses') + ' on your account. Tap a course to read the topics you have reached.';
  $('courseList').innerHTML = courses.map((c) =>
    '<div class="course-item" data-cid="' + esc(c.id) + '"><img src="' + esc(c.image || LOGO_URL) + '" alt="' + esc(c.name) + '" loading="lazy">' +
    '<div class="ci-in"><b>' + esc(c.name) + '</b><small><i class="fa-solid fa-hashtag"></i> Course #' + esc(c.number) + ' • ' + c.unlocked + ' of ' + c.total + ' topics opened</small></div>' +
    '<span class="ci-open"><i class="fa-solid fa-arrow-right"></i></span></div>'
  ).join('');
  showOnly('coursesCard');
}

function renderHead() {
  const c = activeCourse;
  const pct = c.total ? Math.round((c.unlocked / c.total) * 100) : 0;
  let html = '<img src="' + esc(c.image || LOGO_URL) + '" alt="' + esc(c.name) + '"><div class="ch-in"><b>' + esc(c.name) + '</b><small><i class="fa-solid fa-hashtag"></i> Course #' + esc(c.number) + ' &nbsp;•&nbsp; <i class="fa-solid fa-naira-sign"></i> ' + esc(money(c.price)) + '</small>' +
    '<div class="progress-mini"><div class="pm-bar"><div class="pm-fill" style="width:' + pct + '%"></div></div><span>' + c.unlocked + '/' + c.total + '</span></div></div>';
  if (courses.length > 1) html += '<button class="btn-switch" id="btnSwitchCourse"><i class="fa-solid fa-right-left"></i> Switch Course</button>';
  $('courseHead').innerHTML = html;
  $('pageTitle').textContent = c.name;
  $('pageSub').textContent = 'These are the topics you have reached on your dashboard.';
}

function topicHtml(t) {
  const n = t.index + 1;
  return '<div class="topic-item" data-idx="' + t.index + '"><div class="topic-head"><div class="topic-num' + (t.is_final ? ' final-num' : '') + '">' + n + '</div>' +
    '<div class="th-in"><small>Topic ' + n + ' of ' + activeCourse.total + '</small><b>' + esc(t.name || ('Topic ' + n)) + '</b>' + (t.is_final ? '<span class="final-tag"><i class="fa-solid fa-flag-checkered"></i> Final Topic</span>' : '') + '</div>' +
    '<i class="fa-solid fa-chevron-down th-arrow"></i></div>' +
    '<div class="topic-body"><div class="topic-body-inner">' + (t.video_url ? '<div class="topic-video"></div>' : '') +
    '<div class="topic-text">' + esc(t.text || 'Lesson notes are coming soon for this topic.') + '</div></div></div></div>';
}

function appendTopics() {
  const list = $('topicsList');
  if (!topics.length) {
    list.innerHTML = '<div class="empty-box"><i class="fa-solid fa-book-open"></i><b>No Topics Yet</b><p>Open your dashboard and start your first topic. It will appear here after you read it.</p></div>';
    $('loadMoreRow').classList.add('hidden');
    renderNote();
    return;
  }
  const end = Math.min(shown + PAGE_SIZE, topics.length);
  const frag = document.createElement('div');
  frag.innerHTML = topics.slice(shown, end).map(topicHtml).join('');
  Array.from(frag.children).forEach((item) => {
    const t = topics[Number(item.dataset.idx)];
    let mounted = null;
    item.querySelector('.topic-head').addEventListener('click', () => {
      const opening = !item.classList.contains('open');
      item.classList.toggle('open', opening);
      if (opening) {
        const box = item.querySelector('.topic-video');
        if (box && !mounted) mounted = mountVideo(box, t);
      } else if (mounted) {
        mounted.pause();
      }
    });
    list.appendChild(item);
  });
  shown = end;
  const left = topics.length - shown;
  $('loadMoreRow').classList.toggle('hidden', left <= 0);
  if (left > 0) $('btnLoadMore').innerHTML = '<i class="fa-solid fa-layer-group"></i> Load More Topics (' + left + ' left)';
  renderNote();
}

function renderNote() {
  const note = $('topicsNote');
  const c = activeCourse;
  note.classList.remove('hidden');
  if (c.unlocked < c.total) {
    note.classList.remove('done');
    note.innerHTML = '<i class="fa-solid fa-lock"></i><div>You have opened <b>' + c.unlocked + ' of ' + c.total + '</b> topics. The next topics open when you finish the topics above on your dashboard.</div><a href="dashboard.html" class="btn-main"><i class="fa-solid fa-gauge-high"></i> Continue Learning</a>';
  } else {
    note.classList.add('done');
    note.innerHTML = '<i class="fa-solid fa-circle-check"></i><div>You have opened all <b>' + c.total + '</b> topics of this course.</div>';
  }
}

async function openCourse(id) {
  miniLoad('Loading your topics...');
  try {
    const res = await api({ action: 'topics', course_id: id });
    destroyPlayers();
    activeCourse = res.course;
    topics = res.topics;
    shown = 0;
    $('topicsList').innerHTML = '';
    renderHead();
    showOnly('topicsCard');
    appendTopics();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    miniHide();
  } catch (e) {
    miniHide();
    if (e.data && e.data.state === 'pending') showLocked();
    else toast('error', 'Could Not Load', e.message);
  }
}

function showLocked() {
  destroyPlayers();
  $('pageTitle').textContent = 'My Courses';
  $('pageSub').textContent = 'Your course needs to be confirmed first';
  showOnly('lockedCard');
}

function backToCourses() {
  destroyPlayers();
  renderCourseList();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderBadge(student) {
  $('userIdName').textContent = (student && student.name) || 'Student';
  $('userIdCode').textContent = (student && student.academy_id) || user.id;
}

function bind() {
  $('brandLink').addEventListener('click', () => { window.location.href = 'index.html'; });
  $('courseList').addEventListener('click', (e) => {
    const item = e.target.closest('.course-item');
    if (item) openCourse(item.dataset.cid);
  });
  $('courseHead').addEventListener('click', (e) => {
    if (e.target.closest('#btnSwitchCourse')) backToCourses();
  });
  $('btnLoadMore').addEventListener('click', appendTopics);
  $('btnCopyUserId').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try {
      await copyText($('userIdCode').textContent);
      btn.classList.add('done');
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      setTimeout(() => {
        btn.classList.remove('done');
        btn.innerHTML = '<i class="fa-solid fa-copy"></i>';
      }, 2000);
    } catch (_) {
      toast('error', 'Copy Failed', 'Could not copy your ID. Please copy it by hand.');
    }
  });
  window.addEventListener('pagehide', destroyPlayers);
}

function loadUser() {
  try {
    const raw = localStorage.getItem('idt_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u && u.id ? { id: String(u.id) } : null;
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
  miniLoad('Loading your courses...');
  try {
    const res = await api({ action: 'courses' });
    renderBadge(res.student);
    miniHide();
    if (res.state === 'pending') {
      $('lockedMsg').textContent = 'Your course' + (res.pending_course ? ' "' + res.pending_course + '"' : '') + ' is not active yet. Please go to your dashboard and confirm your course and payment. When it is active, come back here to read your lessons.';
      showLocked();
      return;
    }
    if (res.state === 'empty' || !res.courses.length) {
      $('pageSub').textContent = 'Your learning journey starts here';
      showOnly('emptyCard');
      return;
    }
    courses = res.courses;
    if (courses.length === 1) openCourse(courses[0].id);
    else renderCourseList();
  } catch (e) {
    miniHide();
    $('pageSub').textContent = 'Could not load your courses';
    toast('error', 'Could Not Load', e.message);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

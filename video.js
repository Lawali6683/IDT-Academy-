import { supabase } from './supabase.js';

export const PROMO_VIDEO = 'https://www.youtube.com/watch?v=EYXHzC0H3t8';

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

export function esc(s) {
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

export function ytId(input) {
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

export const posterUrl = (id) => 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';

function imgFallback(img) {
  if (!img || String(img.src).indexOf('data:') === 0) return;
  const m = /\/vi\/([\w-]{11})\//.exec(img.src);
  if (m && !img.dataset.f) {
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

(function injectPlayerCss() {
  if (document.getElementById('idt-vp-css')) return;
  const st = document.createElement('style');
  st.id = 'idt-vp-css';
  st.textContent = `
.vp{position:relative;aspect-ratio:16/9;width:100%;background:#05060f;overflow:hidden;isolation:isolate;border-radius:inherit;-webkit-tap-highlight-color:transparent}
.vp-stage{position:absolute;inset:0}
.vp-stage iframe{width:100%;height:100%;border:0;display:block}
.vp-shield{position:absolute;inset:0;z-index:2;cursor:pointer}
.vp-shield::before{content:"";position:absolute;left:0;right:0;top:0;height:62px;background:linear-gradient(180deg,#05060f 15%,rgba(5,6,15,0))}
.vp-poster{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;background:#0b0b1e;cursor:pointer;transition:opacity .35s ease}
.vp-poster img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.vp-poster::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,6,15,.15),rgba(5,6,15,.62))}
.vp.playing .vp-poster{opacity:0;pointer-events:none}
.vp-play{position:relative;z-index:2;width:76px;height:76px;border-radius:50%;border:0;cursor:pointer;color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--violet,#7c3aed),var(--cyan,#06b6d4));box-shadow:0 0 0 8px rgba(255,255,255,.14),0 18px 40px rgba(124,58,237,.55);animation:vpPulse 2.2s ease-out infinite}
.vp-play i{margin-left:4px}
@keyframes vpPulse{0%{box-shadow:0 0 0 0 rgba(34,211,238,.55),0 18px 40px rgba(124,58,237,.5)}100%{box-shadow:0 0 0 26px rgba(34,211,238,0),0 18px 40px rgba(124,58,237,.5)}}
.vp-brand{position:absolute;top:10px;left:12px;z-index:5;display:inline-flex;align-items:center;gap:7px;font:700 11px/1 'Poppins',system-ui,sans-serif;letter-spacing:.6px;color:#fff;background:rgba(15,10,46,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:7px 11px;border-radius:99px;pointer-events:none}
.vp-bar{position:absolute;left:0;right:0;bottom:0;z-index:5;display:flex;align-items:center;gap:8px;padding:22px 12px 10px;background:linear-gradient(0deg,rgba(5,6,15,.9),rgba(5,6,15,0));opacity:0;pointer-events:none;transition:opacity .25s}
.vp.playing .vp-bar{opacity:1;pointer-events:auto}
.vp-bar button{width:38px;height:38px;border:0;border-radius:11px;background:rgba(255,255,255,.14);color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.vp-bar button:hover{background:rgba(255,255,255,.28)}
.vp-spacer{flex:1}
.vp-msg{position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;color:#e6e4ff;font:600 13.5px/1.6 'Poppins',system-ui,sans-serif;background:rgba(5,6,15,.88)}
.vp-msg[hidden]{display:none}
.vp:fullscreen,.vp:-webkit-full-screen{aspect-ratio:auto;border-radius:0;width:100%;height:100%}
.vp.vp-pfs{position:fixed;inset:0;z-index:99990;aspect-ratio:auto;border-radius:0;width:100%;height:100%}
body.vp-lock{overflow:hidden}
@media (max-width:520px){.vp-play{width:62px;height:62px;font-size:22px}}
`;
  document.head.appendChild(st);
})();

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

export function createPlayer(host, id, opts) {
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
      showMsg('The video could not load. Please check your internet connection and try again.');
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

export function getCourses() {
  if (!coursesP) {
    coursesP = Promise.resolve(supabase.from('courses').select('*')).then(({ data, error }) => {
      if (error) throw error;
      return (data || []).map((row) => {
        let c = row.course_data;
        if (typeof c === 'string') {
          try { c = JSON.parse(c); } catch (e) { c = null; }
        }
        return c;
      }).filter((c) => c && c.id);
    }).catch(() => {
      coursesP = null;
      return [];
    });
  }
  return coursesP;
}

function registerUrl(course, row) {
  const c = course || {};
  let url = 'register.html?course_id=' + encodeURIComponent(c.id || row.course_id || '') +
    '&course_number=' + encodeURIComponent(c.course_number || '') +
    '&course_name=' + encodeURIComponent(c.course_name || row.course_name || '') +
    '&price=' + encodeURIComponent(c.price || row.price || '') +
    '&info=' + encodeURIComponent(c.info_text || '') +
    '&image=' + encodeURIComponent(c.image_url || '');
  let ref = '';
  try { ref = localStorage.getItem('idt_ref') || ''; } catch (e) {}
  if (!ref) {
    try { ref = sessionStorage.getItem('idt_ref_session') || ''; } catch (e) {}
  }
  if (ref) url += '&ref=' + encodeURIComponent(ref);
  return url;
}

function initPromo() {
  const sec = $('promoVideo');
  const host = $('promoVideoHost');
  if (!host) return;
  const id = ytId(PROMO_VIDEO);
  if (!id) {
    if (sec) sec.hidden = true;
    return;
  }
  createPlayer(host, id);
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
      '<div class="pv-thumb"><img src="' + posterUrl(id) + '" alt="" width="480" height="270" loading="lazy" decoding="async">' +
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
  try { initPromo(); } catch (e) {}
  try { initPreviews(); } catch (e) {}
  try { initCertZoom(); } catch (e) {}
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

(function () {
  var d = document, w = window;
  var PH = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380"><rect width="600" height="380" fill="#531033"/><text x="300" y="200" fill="#ffb089" font-family="Arial" font-size="28" font-weight="bold" text-anchor="middle">Free Skills</text></svg>');
  var hover = w.matchMedia && w.matchMedia('(hover:hover)').matches;
  var calm = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function warm(list) {
    var run = function () {
      list.forEach(function (u, k) {
        setTimeout(function () { var i = new Image(); i.src = u; }, k * 400);
      });
    };
    if (d.readyState === 'complete') setTimeout(run, 1200);
    else w.addEventListener('load', function () { setTimeout(run, 1200); });
  }

  function fix(t) {
    var m = /^(https:\/\/i\.imgur\.com\/[A-Za-z0-9]{7})[lhm](\.jpe?g)$/i.exec(t.getAttribute('src') || '');
    if (m && !t.dataset.r) {
      t.dataset.r = '1';
      t.src = m[1] + m[2];
      return true;
    }
    return false;
  }

  w.SG = { warm: warm, fix: fix };

  d.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'IMG') return;
    if (fix(t)) return;
    if (!t.dataset.fb && !t.closest('.shot') && !t.closest('.banner')) {
      t.dataset.fb = '1';
      t.src = PH;
    }
  }, true);

  var burger = d.getElementById('burger');
  var nav = d.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () { nav.classList.toggle('open'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) nav.classList.remove('open'); });
  }

  var pend = [].slice.call(d.querySelectorAll('.rv'));
  function reveal() {
    if (!pend.length) return;
    var vh = w.innerHeight;
    pend = pend.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) { el.classList.add('in'); return false; }
      return true;
    });
  }
  w.addEventListener('resize', reveal);
  setTimeout(reveal, 300);
  setTimeout(function () { pend.forEach(function (el) { el.classList.add('in'); }); pend = []; }, 9000);

  var prog = d.getElementById('prog');
  var top = d.getElementById('toTop');
  var tk = false;
  function onScroll() {
    tk = false;
    var y = w.scrollY || 0;
    var max = Math.max(1, d.documentElement.scrollHeight - w.innerHeight);
    if (prog) prog.style.transform = 'scaleX(' + Math.min(1, y / max) + ')';
    if (top) top.classList.toggle('show', y > 600);
    reveal();
  }
  w.addEventListener('scroll', function () {
    if (!tk) { tk = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  if (top) top.addEventListener('click', function () { w.scrollTo({ top: 0, behavior: 'smooth' }); });

  if (hover && !calm) {
    var last = 0, live = 0, cols = ['#e11d74', '#ffb089', '#ffd166', '#ffffff'];
    w.addEventListener('pointermove', function (e) {
      var now = Date.now();
      if (now - last < 70 || live > 14) return;
      last = now;
      var s = d.createElement('i');
      s.className = 'sparkle';
      s.style.left = e.clientX + 'px';
      s.style.top = e.clientY + 'px';
      s.style.background = cols[Math.floor(Math.random() * cols.length)];
      s.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
      s.style.setProperty('--dy', (Math.random() * 50 + 10) + 'px');
      d.body.appendChild(s);
      live++;
      setTimeout(function () { s.remove(); live--; }, 1000);
    }, { passive: true });
  }
})();

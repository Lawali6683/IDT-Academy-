(function () {
  var VIDEO_ID = 'IuhyCEqWoQ8';
  var root = document.getElementById('scPlayer');
  if (!root) return;

  var stage = document.getElementById('scStage');
  var shield = document.getElementById('scShield');
  var cover = document.getElementById('scCover');
  var coverTitle = document.getElementById('scCoverTitle');
  var coverNote = document.getElementById('scCoverNote');
  var big = document.getElementById('scBig');
  var bigIcon = big.querySelector('i');
  var pauseLayer = document.getElementById('scPause');
  var playBtn = document.getElementById('scPlayBtn');
  var muteBtn = document.getElementById('scMuteBtn');
  var fsBtn = document.getElementById('scFsBtn');
  var bar = document.getElementById('scBar');
  var fill = document.getElementById('scFill');
  var timeEl = document.getElementById('scTime');

  var player = null;
  var ready = false;
  var loading = false;
  var wantPlay = false;
  var timer = null;
  var mode = 'idle';

  function setIcon(el, name) {
    el.className = 'fa-solid ' + name;
  }

  function fmt(s) {
    s = Math.max(0, Math.floor(s || 0));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function setMode(m) {
    mode = m;
    root.setAttribute('data-mode', m);
    if (m === 'idle') {
      coverTitle.textContent = 'Watch how a student does it';
      coverNote.textContent = 'Tap to play';
      setIcon(bigIcon, 'fa-play');
      big.classList.remove('rp');
    } else if (m === 'ended') {
      coverTitle.textContent = 'Now it is your turn';
      coverNote.textContent = 'Tap to watch again';
      setIcon(bigIcon, 'fa-rotate-right');
      big.classList.add('rp');
    } else if (m === 'error') {
      coverTitle.textContent = 'The video could not load';
      coverNote.textContent = 'Check your internet and tap to try again';
      setIcon(bigIcon, 'fa-rotate-right');
      big.classList.add('rp');
    }
    setIcon(playBtn.querySelector('i'), m === 'playing' ? 'fa-pause' : 'fa-play');
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function tick() {
    if (!player || !ready) return;
    var d = player.getDuration() || 0;
    var c = player.getCurrentTime() || 0;
    fill.style.width = d ? Math.min(100, (c / d) * 100) + '%' : '0%';
    timeEl.textContent = fmt(c) + ' / ' + fmt(d);
  }

  function startTimer() {
    stopTimer();
    tick();
    timer = setInterval(tick, 250);
  }

  function onReady() {
    ready = true;
    var f = player.getIframe && player.getIframe();
    if (f) {
      f.setAttribute('tabindex', '-1');
      f.setAttribute('aria-hidden', 'true');
    }
    tick();
    if (wantPlay) {
      player.unMute();
      player.playVideo();
    }
  }

  function onState(e) {
    var s = e.data;
    if (s === 1) {
      setMode('playing');
      startTimer();
    } else if (s === 2) {
      setMode('paused');
      stopTimer();
      tick();
    } else if (s === 0) {
      stopTimer();
      fill.style.width = '100%';
      setMode('ended');
      if (isFs()) exitFs();
    } else if (s === 3) {
      if (wantPlay) setMode('loading');
    }
  }

  function onError() {
    stopTimer();
    wantPlay = false;
    setMode('error');
  }

  function build() {
    if (player) return;
    var vars = {
      controls: 0,
      modestbranding: 1,
      rel: 0,
      fs: 0,
      disablekb: 1,
      iv_load_policy: 3,
      playsinline: 1,
      cc_load_policy: 0,
      showinfo: 0
    };
    if (location.protocol.indexOf('http') === 0) vars.origin = location.origin;
    player = new YT.Player('scYt', {
      host: 'https://www.youtube-nocookie.com',
      videoId: VIDEO_ID,
      playerVars: vars,
      events: { onReady: onReady, onStateChange: onState, onError: onError }
    });
  }

  function loadApi() {
    if (window.YT && window.YT.Player) {
      build();
      return;
    }
    if (loading) return;
    loading = true;
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === 'function') prev();
      build();
    };
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = function () {
      loading = false;
      wantPlay = false;
      setMode('error');
    };
    document.head.appendChild(s);
  }

  function toggle() {
    if (mode === 'error') {
      wantPlay = true;
      setMode('loading');
      if (player && ready) {
        player.loadVideoById(VIDEO_ID);
      } else {
        loading = false;
        loadApi();
      }
      return;
    }
    if (!player || !ready) {
      wantPlay = true;
      setMode('loading');
      loadApi();
      return;
    }
    var st = player.getPlayerState();
    if (st === 1 || st === 3) {
      wantPlay = false;
      player.pauseVideo();
    } else {
      wantPlay = true;
      if (mode === 'ended') player.seekTo(0, true);
      player.unMute();
      muteBtn.querySelector('i').className = 'fa-solid fa-volume-high';
      player.playVideo();
    }
  }

  function seekFrom(ev) {
    if (!player || !ready) return;
    var rect = bar.getBoundingClientRect();
    var x = (ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX) - rect.left;
    var ratio = Math.min(1, Math.max(0, x / rect.width));
    var d = player.getDuration() || 0;
    if (!d) return;
    player.seekTo(ratio * d, true);
    fill.style.width = ratio * 100 + '%';
    timeEl.textContent = fmt(ratio * d) + ' / ' + fmt(d);
  }

  function isFs() {
    return stage.classList.contains('sc-fs');
  }

  function enterFs() {
    stage.classList.add('sc-fs');
    document.documentElement.style.overflow = 'hidden';
    setIcon(fsBtn.querySelector('i'), 'fa-compress');
    var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (req) {
      try {
        var r = req.call(stage);
        if (r && r.catch) r.catch(function () {});
      } catch (err) {}
    }
  }

  function exitFs() {
    stage.classList.remove('sc-fs');
    document.documentElement.style.overflow = '';
    setIcon(fsBtn.querySelector('i'), 'fa-expand');
    var fe = document.fullscreenElement || document.webkitFullscreenElement;
    if (fe) {
      var ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (ex) {
        try {
          var r = ex.call(document);
          if (r && r.catch) r.catch(function () {});
        } catch (err) {}
      }
    }
  }

  function onFsChange() {
    var fe = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fe && isFs()) {
      stage.classList.remove('sc-fs');
      document.documentElement.style.overflow = '';
      setIcon(fsBtn.querySelector('i'), 'fa-expand');
    }
  }

  shield.addEventListener('click', toggle);
  cover.addEventListener('click', toggle);
  big.addEventListener('click', function (e) {
    e.stopPropagation();
    toggle();
  });
  pauseLayer.addEventListener('click', toggle);
  playBtn.addEventListener('click', toggle);

  muteBtn.addEventListener('click', function () {
    if (!player || !ready) return;
    if (player.isMuted()) {
      player.unMute();
      setIcon(muteBtn.querySelector('i'), 'fa-volume-high');
    } else {
      player.mute();
      setIcon(muteBtn.querySelector('i'), 'fa-volume-xmark');
    }
  });

  fsBtn.addEventListener('click', function () {
    if (isFs()) exitFs();
    else enterFs();
  });

  var dragging = false;
  bar.addEventListener('mousedown', function (e) {
    dragging = true;
    seekFrom(e);
  });
  window.addEventListener('mousemove', function (e) {
    if (dragging) seekFrom(e);
  });
  window.addEventListener('mouseup', function () {
    dragging = false;
  });
  bar.addEventListener('touchstart', function (e) {
    dragging = true;
    seekFrom(e);
  }, { passive: true });
  bar.addEventListener('touchmove', function (e) {
    if (dragging) seekFrom(e);
  }, { passive: true });
  bar.addEventListener('touchend', function () {
    dragging = false;
  });

  [stage, shield, cover].forEach(function (el) {
    el.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
  });

  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isFs()) exitFs();
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          loadApi();
          io.disconnect();
        }
      });
    }, { rootMargin: '400px' });
    io.observe(root);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && player && ready && player.getPlayerState() === 1) {
      wantPlay = false;
      player.pauseVideo();
    }
  });

  function copyText(text, btn) {
    var label = btn.querySelector('b');
    var original = label.textContent;
    function done() {
      label.textContent = 'Copied';
      setTimeout(function () {
        label.textContent = original;
      }, 1800);
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        done();
      } catch (err) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  var capBtn = document.getElementById('scCopyCaption');
  var tagBtn = document.getElementById('scCopyTag');
  var capEl = document.getElementById('scCaption');
  if (capBtn && capEl) {
    capBtn.addEventListener('click', function () {
      copyText(capEl.textContent.replace(/\s+/g, ' ').trim(), capBtn);
    });
  }
  if (tagBtn) {
    tagBtn.addEventListener('click', function () {
      copyText('#BelloMatawalle #MatawallenMaradun', tagBtn);
    });
  }

  setMode('idle');
})();

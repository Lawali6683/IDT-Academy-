(function () {
  const APP_ICON = 'https://i.imgur.com/mgRKw4Q.png';
  const LOGO = 'https://i.imgur.com/oyqM5oF.png';
  const SW_URL = '/sw.js';
  let deferredPrompt = null;
  let installBtn = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
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
    document.body.appendChild(installBtn);
    return installBtn;
  }

  function showButton() {
    if (isStandalone()) return;
    const btn = createButton();
    requestAnimationFrame(function () {
      btn.classList.remove('idt-pwa-hide');
    });
  }

  function hideButton() {
    if (installBtn) {
      installBtn.classList.add('idt-pwa-hide');
    }
  }

  function createModal() {
    let back = document.querySelector('.idt-pwa-back');
    if (back) return back;
    back = document.createElement('div');
    back.className = 'idt-pwa-back';
    back.innerHTML =
      '<div class="idt-pwa-modal">' +
      '<div class="idt-pwa-modal-head">' +
      '<img src="' + LOGO + '" alt="IDT Academy">' +
      '<div><b>Install IDT Academy App</b><small>Add the app to your device home screen</small></div>' +
      '</div>' +
      '<div class="idt-pwa-modal-body">' +
      '<div class="idt-pwa-step"><i class="fa-solid fa-share-nodes"></i><div><b>Step 1</b><span>Tap the Share button (the square with an arrow pointing up) at the bottom of your browser.</span></div></div>' +
      '<div class="idt-pwa-step"><i class="fa-solid fa-plus"></i><div><b>Step 2</b><span>Scroll down and tap "Add to Home Screen".</span></div></div>' +
      '<div class="idt-pwa-step"><i class="fa-solid fa-circle-check"></i><div><b>Step 3</b><span>Tap "Add". The IDT Academy app will appear on your home screen.</span></div></div>' +
      '</div>' +
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
      });
      return;
    }
    if (isIos()) {
      const modal = createModal();
      modal.classList.add('open');
      return;
    }
    if (!isStandalone()) {
      const modal = createModal();
      modal.classList.add('open');
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
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (deferredPrompt && !isStandalone()) showButton();
    });
  } else {
    if (deferredPrompt && !isStandalone()) showButton();
  }
})();
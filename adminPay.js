import { supabase } from './supabase.js';

const _k1 = 'QGhhcnVuYTY2';
const _k2 = 'QHViYWlkYTc3';
let ceoWrongAttempts = 0;
let ceoLockUntil = 0;
let ceoLockTimer = null;

function decodeCode(k) {
  try {
    return atob(k);
  } catch (e) {
    return '';
  }
}

function isCeoCode(value) {
  const v = (value || '').trim();
  if (!v) return false;
  return v === decodeCode(_k1) || v === decodeCode(_k2);
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
        .i2-bookwrap{position:relative;width:130px;height:165px;perspective:1000px}
        .i2-book{position:absolute;left:50%;top:50%;width:120px;height:150px;margin-left:-60px;margin-top:-75px;transform-style:preserve-3d;animation:i2bob 3.6s ease-in-out infinite}
        @keyframes i2bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .i2-cover{position:absolute;top:0;width:50%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:8px 2px 2px 8px;box-shadow:0 14px 34px rgba(0,0,0,.5)}
        .i2-cl{left:0;background:linear-gradient(145deg,#a78bfa 0%,#8b5cf6 45%,#6d28d9 100%)}
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
  var n = document.getElementById('i2num');
  var c = 0;
  if (window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
  window.idtLoaderInterval = setInterval(function(){
    c += 5;
    if(n) n.textContent = (c >= 100 ? 100 : c);
    if(c >= 100) clearInterval(window.idtLoaderInterval);
  }, 30);
}

function hideLoading() {
  var l = document.getElementById('idt-loader-2');
  if (window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
  if (l) l.classList.add('idt-hide');
}

const $ = (id) => document.getElementById(id);
const toastWrap = $('toastWrap');

function showToast(type, title, message) {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `
    <i class="fa-solid ${icons[type] || 'fa-circle-info'}"></i>
    <div class="toast-body"><b>${escapeHtml(title)}</b><p>${escapeHtml(message)}</p></div>
    <button class="toast-x"><i class="fa-solid fa-xmark"></i></button>
  `;
  t.querySelector('.toast-x').onclick = () => { t.classList.add('out'); setTimeout(() => t.remove(), 300); };
  toastWrap.appendChild(t);
  setTimeout(() => { if (t.parentNode) { t.classList.add('out'); setTimeout(() => t.remove(), 300); } }, 5000);
}

let adminUser = null;
let pendingList = [];
let completedList = [];
let completedLoaded = false;
let confirmCallback = null;

function toggleModal(open) {
  const modal = $('confirmModal');
  if (open) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  } else {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function showConfirm(icon, title, msg, btnClass, btnText, callback) {
  $('confirmIcon').className = `ms-icon ${icon}`;
  $('confirmTitle').textContent = title;
  $('confirmMsg').textContent = msg;
  const proceedBtn = $('confirmProceed');
  proceedBtn.className = `btn ${btnClass}`;
  proceedBtn.innerHTML = btnText;
  confirmCallback = callback;
  toggleModal(true);
}

$('confirmCancel').addEventListener('click', () => {
  toggleModal(false);
  confirmCallback = null;
});

$('confirmProceed').addEventListener('click', () => {
  toggleModal(false);
  if (confirmCallback) {
    confirmCallback();
    confirmCallback = null;
  }
});

function buildCeoGate() {
  if (document.getElementById('ceoGate')) return;
  const html = `
    <div class="ceo-gate" id="ceoGate">
      <style>
        .ceo-gate{position:fixed;inset:0;z-index:100000;background:radial-gradient(circle at 30% 20%,rgba(124,92,255,.22),transparent 55%),radial-gradient(circle at 75% 80%,rgba(34,211,238,.14),transparent 50%),#05060f;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:20px;transition:opacity .5s ease,visibility .5s ease;user-select:none}
        .ceo-gate.cg-hide{opacity:0;visibility:hidden;pointer-events:none}
        .cg-card{width:100%;max-width:400px;background:#0e1226;border:1px solid rgba(124,92,255,.4);border-radius:20px;padding:30px 26px;box-shadow:0 30px 80px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.04) inset;color:#e6e9f5;text-align:center;animation:cgIn .5s cubic-bezier(.22,1,.36,1)}
        @keyframes cgIn{from{opacity:0;transform:translateY(26px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
        .cg-shake{animation:cgShake .45s ease}
        @keyframes cgShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-9px)}40%{transform:translateX(9px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
        .cg-bell{position:relative;width:58px;height:58px;margin:0 auto 16px;border-radius:50%;background:linear-gradient(145deg,rgba(124,92,255,.25),rgba(34,211,238,.15));border:1px solid rgba(124,92,255,.5);display:flex;align-items:center;justify-content:center}
        .cg-bell i{font-size:24px;color:#a78bfa;animation:cgRing 3s ease-in-out infinite}
        @keyframes cgRing{0%,100%{transform:rotate(0)}5%{transform:rotate(14deg)}10%{transform:rotate(-12deg)}15%{transform:rotate(8deg)}20%{transform:rotate(0)}}
        .cg-dot{position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.25);animation:cgPulse 1.8s ease-in-out infinite}
        @keyframes cgPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.25);opacity:.6}}
        .cg-app{display:block;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#8b93c7;margin-bottom:8px}
        .cg-title{display:block;font-size:20px;font-weight:800;margin-bottom:10px;background:linear-gradient(90deg,#f8fafc,#a78bfa,#22d3ee);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
        .cg-msg{font-size:13px;line-height:1.6;color:#94a3b8;margin:0 0 20px}
        .cg-inputwrap{position:relative;margin-bottom:14px}
        .cg-inputwrap input{width:100%;box-sizing:border-box;padding:14px 48px 14px 16px;border-radius:12px;border:1px solid rgba(124,92,255,.35);background:rgba(255,255,255,.05);color:#f1f5f9;font-size:15px;letter-spacing:2px;outline:none;transition:border-color .25s ease,box-shadow .25s ease}
        .cg-inputwrap input:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,92,255,.2)}
        .cg-inputwrap input:disabled{opacity:.45}
        .cg-inputwrap button{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:38px;height:38px;border:none;border-radius:10px;background:transparent;color:#8b93c7;cursor:pointer;font-size:15px}
        .cg-inputwrap button:hover{color:#a78bfa}
        .cg-btn{width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(90deg,#7c3aed,#6d28d9);color:#fff;font-size:14px;font-weight:700;letter-spacing:1px;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease,opacity .2s ease;display:flex;align-items:center;justify-content:center;gap:9px}
        .cg-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 28px rgba(124,92,255,.4)}
        .cg-btn:disabled{opacity:.5;cursor:not-allowed}
        .cg-error{display:none;margin-top:13px;font-size:12.5px;color:#f87171;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:10px 12px}
        .cg-attempts{min-height:18px;margin:10px 0 0;font-size:12px;color:#fbbf24;letter-spacing:1px}
      </style>
      <div class="cg-card" id="cgCard">
        <div class="cg-bell"><i class="fa-solid fa-bell"></i><span class="cg-dot"></span></div>
        <span class="cg-app">IDT Academy</span>
        <b class="cg-title">CEO Verification Required</b>
        <p class="cg-msg">This admin payment area is locked. Only the CEO can open it. Enter the CEO access code to continue.</p>
        <div class="cg-inputwrap">
          <input type="password" id="ceoCodeInput" placeholder="Enter CEO code" autocomplete="off" spellcheck="false" />
          <button type="button" id="ceoPwToggle" title="Show / Hide code"><i class="fa-solid fa-eye"></i></button>
        </div>
        <button type="button" class="cg-btn" id="ceoGateBtn"><i class="fa-solid fa-unlock"></i> Unlock Admin Panel</button>
        <p class="cg-error" id="ceoGateError"></p>
        <p class="cg-attempts" id="ceoAttempts"></p>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  const input = $('ceoCodeInput');
  const toggleBtn = $('ceoPwToggle');
  toggleBtn.addEventListener('click', function() {
    const icon = this.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fa-solid fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fa-solid fa-eye';
    }
  });
  $('ceoGateBtn').addEventListener('click', tryUnlockCeo);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      tryUnlockCeo();
    }
  });
  setTimeout(() => { if (input && !input.disabled) input.focus(); }, 400);
}

function tryUnlockCeo() {
  const input = $('ceoCodeInput');
  const err = $('ceoGateError');
  const att = $('ceoAttempts');
  const btn = $('ceoGateBtn');
  const card = $('cgCard');
  if (!input || !err || !btn || !card) return;
  if (Date.now() < ceoLockUntil) return;
  const code = input.value;
  if (isCeoCode(code)) {
    ceoWrongAttempts = 0;
    if (ceoLockTimer) {
      clearInterval(ceoLockTimer);
      ceoLockTimer = null;
    }
    err.style.display = 'none';
    if (att) att.textContent = '';
    unlockCeo();
    return;
  }
  ceoWrongAttempts++;
  input.value = '';
  card.classList.remove('cg-shake');
  void card.offsetWidth;
  card.classList.add('cg-shake');
  if (ceoWrongAttempts >= 5) {
    ceoLockUntil = Date.now() + 60000;
    err.textContent = 'Too many wrong attempts. The panel is locked for 60 seconds.';
    err.style.display = 'block';
    btn.disabled = true;
    input.disabled = true;
    if (ceoLockTimer) clearInterval(ceoLockTimer);
    ceoLockTimer = setInterval(function() {
      const left = Math.ceil((ceoLockUntil - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(ceoLockTimer);
        ceoLockTimer = null;
        ceoLockUntil = 0;
        ceoWrongAttempts = 0;
        btn.disabled = false;
        input.disabled = false;
        err.style.display = 'none';
        if (att) att.textContent = '';
        input.focus();
      } else {
        if (att) att.textContent = 'Locked. Try again in ' + left + 's';
      }
    }, 1000);
  } else {
    err.textContent = 'Wrong CEO code. Attempts left: ' + (5 - ceoWrongAttempts) + '.';
    err.style.display = 'block';
  }
}

function unlockCeo() {
  const gate = $('ceoGate');
  if (gate) {
    gate.classList.add('cg-hide');
    setTimeout(function() {
      if (gate.parentNode) gate.remove();
    }, 500);
  }
  showLoading();
  checkSession();
}

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    adminUser = session.user;
    $('adminEmailDisplay').textContent = session.user.email;
    $('loginSection').style.display = 'none';
    $('adminSection').style.display = 'block';
    loadDashboard();
  } else {
    hideLoading();
    $('loginSection').style.display = 'flex';
    $('adminSection').style.display = 'none';
  }
}

$('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('adminEmail').value.trim();
  const password = $('adminPassword').value;
  const errorEl = $('loginError');
  const btn = $('adminLoginBtn');

  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';

  showLoading();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      errorEl.textContent = 'Invalid email or password. Please try again.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
      hideLoading();
      return;
    }
    adminUser = data.user;
    $('adminEmailDisplay').textContent = data.user.email;
    $('loginSection').style.display = 'none';
    $('adminSection').style.display = 'block';
    hideLoading();
    loadDashboard();
  } catch (err) {
    errorEl.textContent = 'An error occurred. Please try again.';
    errorEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
    hideLoading();
  }
});

$('pwToggle').addEventListener('click', function() {
  const pw = $('adminPassword');
  const icon = this.querySelector('i');
  if (pw.type === 'password') {
    pw.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    pw.type = 'password';
    icon.className = 'fa-solid fa-eye';
  }
});

$('adminLogoutBtn').addEventListener('click', async () => {
  showConfirm('amber', 'Logout?', 'Are you sure you want to logout from admin panel?', 'btn-outline', 'Logout', async () => {
    showLoading();
    await supabase.auth.signOut();
    adminUser = null;
    $('loginSection').style.display = 'flex';
    $('adminSection').style.display = 'none';
    $('adminEmail').value = '';
    $('adminPassword').value = '';
    hideLoading();
    showToast('info', 'Logged Out', 'You have been logged out successfully.');
  });
});

document.querySelectorAll('.atab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.atab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    const target = this.dataset.tab;
    $('pendingTab').classList.toggle('hidden', target !== 'pending');
    $('completedTab').classList.toggle('hidden', target !== 'completed');
    if (target === 'completed' && !completedLoaded) {
      loadCompletedPayments();
    }
  });
});

async function loadDashboard() {
  showLoading();
  try {
    const [usersRes, pendingRes] = await Promise.all([
      supabase.from('user_profiles').select('id, user_data'),
      supabase.from('pending').select('id, pending_pay')
    ]);

    if (usersRes.error || pendingRes.error) {
      hideLoading();
      showToast('error', 'Load Error', 'Could not load dashboard data. Please refresh the page.');
      return;
    }

    const users = (usersRes.data || []).map(u => Object.assign({ id: u.id }, u.user_data || {}));
    const pending = pendingRes.data || [];

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const pendingUsers = users.filter(u => u.status === 'pending' || !u.status).length;
    const pendingWithdrawals = pending.length;

    $('statTotalUsers').textContent = totalUsers;
    $('statActiveUsers').textContent = activeUsers;
    $('statPendingUsers').textContent = pendingUsers;
    $('statPendingWithdrawals').textContent = pendingWithdrawals;

    pendingList = pending;
    $('pendingCount').textContent = pending.length;
    renderPendingList(pending, users);

    hideLoading();
  } catch (err) {
    hideLoading();
    showToast('error', 'Load Error', 'Could not load dashboard data. Please refresh the page.');
  }
}

function getPendingTimestamp(item) {
  const d = (item.pending_pay || {}).date;
  const t = d ? new Date(d).getTime() : NaN;
  return isNaN(t) ? 0 : t;
}

function updatePendingCounts() {
  $('pendingCount').textContent = pendingList.length;
  $('statPendingWithdrawals').textContent = pendingList.length;
  if (pendingList.length === 0) {
    $('pendingList').innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-check-circle" style="color:var(--green)"></i>
        <b>All Clear!</b>
        <p>No pending withdrawals at this time. All requests have been processed.</p>
      </div>
    `;
  }
}

function removeCardAndUpdate(card, id) {
  if (card && card.parentNode) card.remove();
  pendingList = pendingList.filter(p => p.id !== id);
  updatePendingCounts();
}

function setCardProcessing(card, on) {
  if (!card) return;
  if (on) {
    card.dataset.processing = '1';
    card.querySelectorAll('button').forEach(b => { b.disabled = true; b.style.opacity = '0.6'; });
  } else {
    card.dataset.processing = '0';
    card.querySelectorAll('button').forEach(b => { b.disabled = false; b.style.opacity = ''; });
  }
}

function renderPendingList(pending, users) {
  const container = $('pendingList');

  if (pending.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-check-circle" style="color:var(--green)"></i>
        <b>All Clear!</b>
        <p>No pending withdrawals at this time. All requests have been processed.</p>
      </div>
    `;
    return;
  }

  let html = '';
  const now = new Date();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const sorted = [...pending].sort((a, b) => getPendingTimestamp(a) - getPendingTimestamp(b));

  sorted.forEach(item => {
    const data = item.pending_pay || {};
    const userId = data.user_id || '';
    const user = users ? users.find(u => u.id === userId) : null;
    const userName = data.user_name || (user && user.full_name) || 'Unknown';
    const userEmail = data.user_email || (user && user.email) || 'unknown@email.com';
    const userPhone = (user && user.phone) || 'N/A';
    const amount = parseFloat(data.amount || 0);
    const date = new Date(data.date);
    const validDate = !isNaN(date.getTime());
    const timeDiff = validDate ? now - date.getTime() : TWENTY_FOUR_HOURS;
    const hoursSince = Math.floor(timeDiff / (60 * 60 * 1000));
    const isOverdue = timeDiff >= TWENTY_FOUR_HOURS;

    const dateStr = validDate
      ? date.toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Unknown date';

    html += `
      <div class="admin-card" data-id="${escapeHtml(item.id)}">
        <div class="ac-head">
          <div class="ac-user">
            <b>${escapeHtml(userName)}</b>
            <span><i class="fa-solid fa-envelope"></i> ${escapeHtml(userEmail)} ${userPhone !== 'N/A' ? `&bull; <i class="fa-solid fa-phone"></i> ${escapeHtml(userPhone)}` : ''}</span>
          </div>
          <span class="ac-badge ${isOverdue ? 'overdue' : 'pending'}">
            <i class="fa-solid ${isOverdue ? 'fa-clock' : 'fa-hourglass-half'}"></i> ${isOverdue ? hoursSince + 'h Overdue' : hoursSince + 'h ago'}
          </span>
        </div>
        <div class="ac-details">
          <div class="ac-row"><i class="fa-solid fa-naira-sign"></i> Amount: <b>₦${amount.toFixed(2)}</b></div>
          <div class="ac-row"><i class="fa-solid fa-building-columns"></i> Bank: ${escapeHtml(data.bank_name || 'N/A')}</div>
          <div class="ac-row"><i class="fa-solid fa-hashtag"></i> Account: ${escapeHtml(data.account_number || 'N/A')} <button class="copy-mini" data-copy="${escapeHtml(data.account_number || '')}" title="Copy account number"><i class="fa-solid fa-copy"></i></button></div>
          <div class="ac-row"><i class="fa-solid fa-user"></i> Account Name: ${escapeHtml(data.account_name || 'N/A')}</div>
          <div class="ac-row"><i class="fa-solid fa-calendar"></i> Date: ${escapeHtml(dateStr)}</div>
        </div>
        <div class="ac-actions">
          <button class="btn btn-outline btn-delete" style="font-size:12px;padding:10px 16px;flex:1"><i class="fa-solid fa-trash-can"></i> Delete</button>
          <button class="btn btn-green btn-pay" style="font-size:12px;padding:10px 16px;flex:1"><i class="fa-solid fa-check-circle"></i> Mark as Paid</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.copy-mini').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const text = this.dataset.copy;
      navigator.clipboard.writeText(text).then(() => {
        this.innerHTML = '<i class="fa-solid fa-check"></i>';
        this.classList.add('done');
        showToast('success', 'Copied', 'Account number copied to clipboard.');
        setTimeout(() => { this.innerHTML = '<i class="fa-solid fa-copy"></i>'; this.classList.remove('done'); }, 2000);
      });
    });
  });

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const card = this.closest('.admin-card');
      const id = card.dataset.id;
      showConfirm('amber', 'Delete Withdrawal Request?', 'This will permanently remove this withdrawal request. The user will need to submit a new request.', 'btn-danger', 'Delete', () => deleteWithdrawal(id, card));
    });
  });

  container.querySelectorAll('.btn-pay').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const card = this.closest('.admin-card');
      const id = card.dataset.id;
      showConfirm('green', 'Confirm Payment', 'Have you actually sent the money to this user? You will be asked to type the exact amount to confirm. This protects against double payment.', 'btn-green', 'Yes, Continue', () => markAsPaid(id, card));
    });
  });
}

async function deleteWithdrawal(id, card) {
  showLoading();
  try {
    const { error } = await supabase.from('pending').delete().eq('id', id);
    if (error) {
      hideLoading();
      showToast('error', 'Delete Failed', 'Could not delete this withdrawal request.');
      return;
    }
    removeCardAndUpdate(card, id);
    hideLoading();
    showToast('success', 'Deleted', 'Withdrawal request has been deleted successfully.');
  } catch (err) {
    hideLoading();
    showToast('error', 'Error', 'An unexpected error occurred.');
  }
}

function showAmountConfirm(expectedAmount, onValid) {
  const old = document.getElementById('amountVerifyModal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'amountVerifyModal';
  modal.innerHTML = `
    <style>
      .avm-overlay{position:fixed;inset:0;z-index:99998;background:rgba(3,6,18,.8);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:20px;animation:avmFade .25s ease}
      @keyframes avmFade{from{opacity:0}to{opacity:1}}
      .avm-card{width:100%;max-width:400px;background:#0e1226;border:1px solid rgba(124,92,255,.4);border-radius:18px;padding:28px 24px;box-shadow:0 24px 60px rgba(0,0,0,.6);color:#e6e9f5;text-align:center;animation:avmIn .35s cubic-bezier(.22,1,.36,1)}
      @keyframes avmIn{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      .avm-icon{width:54px;height:54px;margin:0 auto 14px;border-radius:50%;background:linear-gradient(145deg,rgba(251,191,36,.2),rgba(239,68,68,.15));border:1px solid rgba(251,191,36,.45);display:flex;align-items:center;justify-content:center}
      .avm-icon i{font-size:22px;color:#fbbf24}
      .avm-title{display:block;font-size:17px;font-weight:800;margin-bottom:8px}
      .avm-msg{font-size:12.5px;line-height:1.6;color:#94a3b8;margin:0 0 16px}
      .avm-expected{display:inline-block;margin-bottom:16px;padding:8px 18px;border-radius:10px;background:rgba(124,92,255,.14);border:1px solid rgba(124,92,255,.4);font-size:18px;font-weight:800;color:#a78bfa;letter-spacing:1px}
      .avm-input{width:100%;box-sizing:border-box;padding:13px 16px;border-radius:12px;border:1px solid rgba(124,92,255,.35);background:rgba(255,255,255,.05);color:#f1f5f9;font-size:16px;text-align:center;letter-spacing:1px;outline:none;margin-bottom:6px}
      .avm-input:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,92,255,.2)}
      .avm-error{display:none;min-height:16px;margin:0 0 8px;font-size:12px;color:#f87171}
      .avm-actions{display:flex;gap:10px}
      .avm-btn{flex:1;padding:12px;border:none;border-radius:11px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:transform .2s ease,opacity .2s ease}
      .avm-btn:hover{transform:translateY(-1px)}
      .avm-cancel{background:rgba(255,255,255,.08);color:#cbd5e1;border:1px solid rgba(255,255,255,.14)}
      .avm-ok{background:linear-gradient(90deg,#7c3aed,#6d28d9);color:#fff}
    </style>
    <div class="avm-overlay">
      <div class="avm-card">
        <div class="avm-icon"><i class="fa-solid fa-shield-halved"></i></div>
        <b class="avm-title">Verify Amount Before Payment</b>
        <p class="avm-msg">For security, type the exact amount you sent to this user. The payment will only be recorded if the amount matches.</p>
        <div class="avm-expected">₦${expectedAmount.toFixed(2)}</div>
        <input type="number" class="avm-input" id="avmAmountInput" placeholder="Type exact amount" step="0.01" min="0" />
        <p class="avm-error" id="avmError"></p>
        <div class="avm-actions">
          <button type="button" class="avm-btn avm-cancel"><i class="fa-solid fa-xmark"></i> Cancel</button>
          <button type="button" class="avm-btn avm-ok"><i class="fa-solid fa-check"></i> Confirm Payment</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const inputEl = $('avmAmountInput');
  const errEl = $('avmError');
  let avmAttempts = 0;
  const closeModal = () => { if (modal.parentNode) modal.remove(); };
  const submit = () => {
    const val = parseFloat(inputEl.value);
    if (isNaN(val)) {
      errEl.textContent = 'Please type the amount as numbers only.';
      errEl.style.display = 'block';
      return;
    }
    if (val !== expectedAmount) {
      avmAttempts++;
      if (avmAttempts >= 5) {
        closeModal();
        showToast('error', 'Verification Failed', 'Too many wrong amount attempts. This request was not processed.');
        return;
      }
      errEl.textContent = 'Amount does not match the request. Attempts left: ' + (5 - avmAttempts) + '.';
      errEl.style.display = 'block';
      inputEl.value = '';
      return;
    }
    errEl.style.display = 'none';
    closeModal();
    onValid();
  };
  modal.querySelector('.avm-cancel').addEventListener('click', closeModal);
  modal.querySelector('.avm-ok').addEventListener('click', submit);
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });
  setTimeout(() => { if (inputEl) inputEl.focus(); }, 350);
}

async function markAsPaid(id, card) {
  const item = pendingList.find(p => p.id === id);
  if (!item) {
    showToast('error', 'Not Found', 'This withdrawal request could not be found. Refreshing the list.');
    loadDashboard();
    return;
  }

  const data = item.pending_pay || {};
  const userId = data.user_id || '';
  const amount = parseFloat(data.amount || 0);

  setCardProcessing(card, true);
  showLoading();

  try {
    const recheck = await supabase.from('pending').select('id, pending_pay').eq('id', id).maybeSingle();
    if (recheck.error || !recheck.data) {
      hideLoading();
      removeCardAndUpdate(card, id);
      showToast('error', 'Already Processed', 'This withdrawal request is no longer pending. It may have been processed from another device.');
      return;
    }

    let duplicate = false;
    if (userId) {
      const { data: completedRows } = await supabase
        .from('completepay')
        .select('complete_pay')
        .filter('complete_pay->>user_id', 'eq', userId);
      if (completedRows && completedRows.length > 0) {
        duplicate = completedRows.some(r => {
          const d = r.complete_pay || {};
          return parseFloat(d.amount || 0) === amount && String(d.date || '') === String(data.date || '');
        });
      }
    }

    if (duplicate) {
      await supabase.from('pending').delete().eq('id', id);
      hideLoading();
      removeCardAndUpdate(card, id);
      showToast('error', 'Double Payment Blocked', 'This user has already been paid for this exact request. The pending entry has been removed automatically.');
      return;
    }

    hideLoading();
    showAmountConfirm(amount, () => finalizePayment(id, data, userId, amount, card));
  } catch (err) {
    hideLoading();
    setCardProcessing(card, false);
    showToast('error', 'Error', 'An unexpected error occurred while checking this payment.');
  }
}

async function finalizePayment(id, data, userId, amount, card) {
  showLoading();
  try {
    const finalCheck = await supabase.from('pending').select('id').eq('id', id).maybeSingle();
    if (finalCheck.error || !finalCheck.data) {
      hideLoading();
      removeCardAndUpdate(card, id);
      showToast('error', 'Already Processed', 'This request was already paid or removed. Nothing was recorded again.');
      return;
    }

    const now = new Date().toISOString();
    const completeData = Object.assign({}, data, {
      user_id: userId,
      paid_date: now,
      paid_by: adminUser && adminUser.email ? adminUser.email : 'admin'
    });

    const { error: insertError } = await supabase.from('completepay').insert({
      complete_pay: completeData,
      date_complet: now
    });

    if (insertError) {
      hideLoading();
      setCardProcessing(card, false);
      showToast('error', 'Error', 'Could not record the payment. Nothing was removed from pending. Please try again.');
      return;
    }

    const { error: deleteError } = await supabase.from('pending').delete().eq('id', id);
    if (deleteError) {
      hideLoading();
      showToast('error', 'Warning', 'Payment was recorded but the pending entry could not be removed. Please delete it manually to avoid double payment.');
      return;
    }

    removeCardAndUpdate(card, id);

    try {
      const emailResponse = await fetch('/api/congr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.user_name || 'Student',
          account_number: data.account_number || '',
          account_name: data.account_name || '',
          amount: data.amount || 0,
          email: data.user_email || '',
          paid_date: now,
          bank_name: data.bank_name || ''
        })
      });
      const emailResult = await emailResponse.json();
      if (emailResult && emailResult.success) {
        showToast('success', 'Payment Confirmed & Email Sent', '₦' + amount.toFixed(2) + ' has been marked as paid. A confirmation email has been sent to the user.');
      } else {
        showToast('success', 'Payment Confirmed', '₦' + amount.toFixed(2) + ' has been marked as paid. However, the confirmation email could not be sent.');
      }
    } catch (emailErr) {
      showToast('success', 'Payment Confirmed', '₦' + amount.toFixed(2) + ' has been marked as paid.');
    }

    hideLoading();
  } catch (err) {
    hideLoading();
    setCardProcessing(card, false);
    showToast('error', 'Error', 'An unexpected error occurred while processing payment.');
  }
}

async function loadCompletedPayments() {
  showLoading();
  try {
    const { data, error } = await supabase
      .from('completepay')
      .select('id, complete_pay, date_complet')
      .order('date_complet', { ascending: false });

    if (error) {
      hideLoading();
      showToast('error', 'Load Error', 'Could not load completed payments.');
      return;
    }

    completedList = data || [];
    completedLoaded = true;
    $('completedCount').textContent = completedList.length;
    const container = $('completedList');

    if (completedList.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-receipt"></i>
          <b>No Completed Payments Yet</b>
          <p>When you mark withdrawals as paid, they will appear here.</p>
        </div>
      `;
      hideLoading();
      return;
    }

    let html = '';
    completedList.forEach(item => {
      const d = item.complete_pay || {};
      const rawDate = d.paid_date || item.date_complet;
      const date = rawDate ? new Date(rawDate) : null;
      const dateStr = date && !isNaN(date.getTime())
        ? date.toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Unknown date';
      const amount = parseFloat(d.amount || 0);

      html += `
        <div class="admin-card">
          <div class="ac-head">
            <div class="ac-user">
              <b>${escapeHtml(d.user_name || d.account_name || 'Unknown')}</b>
              <span><i class="fa-solid fa-envelope"></i> ${escapeHtml(d.user_email || 'N/A')}</span>
            </div>
            <span class="ac-badge" style="background:rgba(16,185,129,.14);color:#047857"><i class="fa-solid fa-check-circle"></i> Paid</span>
          </div>
          <div class="ac-details">
            <div class="ac-row"><i class="fa-solid fa-naira-sign"></i> Amount: <b>₦${amount.toFixed(2)}</b></div>
            <div class="ac-row"><i class="fa-solid fa-building-columns"></i> Bank: ${escapeHtml(d.bank_name || 'N/A')}</div>
            <div class="ac-row"><i class="fa-solid fa-hashtag"></i> Account: ${escapeHtml(d.account_number || 'N/A')}</div>
            <div class="ac-row"><i class="fa-solid fa-user"></i> Account Name: ${escapeHtml(d.account_name || 'N/A')}</div>
            <div class="ac-row"><i class="fa-solid fa-check-circle" style="color:var(--green)"></i> Paid on: ${escapeHtml(dateStr)}</div>
            <div class="ac-row" style="font-size:11px;color:var(--muted)"><i class="fa-solid fa-user-shield"></i> Processed by: ${escapeHtml(d.paid_by || 'admin')}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    hideLoading();
  } catch (err) {
    hideLoading();
    showToast('error', 'Error', 'Could not load completed payments.');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.documentElement.classList.add('ready');
  buildCeoGate();
});
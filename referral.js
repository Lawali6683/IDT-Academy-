import { supabase } from './supabase.js';

const REFERRAL_REWARD = 1500;
const DAYS_WINDOW = 14;

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
              <div class="i2-page i2-p2"><i></i><i></i></div>
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

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

const NIGERIAN_BANKS = [
  { code: '063', name: 'Access Bank' },
  { code: '801', name: 'Abbey Mortgage Bank' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '559', name: 'Coronation Merchant Bank' },
  { code: '050', name: 'Ecobank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank' },
  { code: '214', name: 'FCMB' },
  { code: '501', name: 'FSDH Merchant Bank' },
  { code: '00103', name: 'Globus Bank' },
  { code: '058', name: 'GTBank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '50211', name: 'Kuda Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '303', name: 'Lotus Bank' },
  { code: '100004', name: 'OPay' },
  { code: '50515', name: 'Moniepoint MFB' },
  { code: '526', name: 'Parallex Bank' },
  { code: '999991', name: 'PalmPay' },
  { code: '101', name: 'Providus Bank' },
  { code: '125', name: 'Rubies MFB' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'SunTrust Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '102', name: 'Titan Trust Bank' },
  { code: '032', name: 'Union Bank' },
  { code: '033', name: 'UBA' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' }
];

const MONNIFY_API_KEY = 'MK_TEST_7FBWHU9H7U';
const MONNIFY_SECRET_KEY = 'YJV0GE4LT2B1WE4FD4H5XY4ZU6WC2VVJ';

let currentUser = null;
let currentProfile = null;
let userId = null;

function uuidv4() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const arr = new Uint8Array(1);
    crypto.getRandomValues(arr);
    const r = arr[0] & 15;
    const v = c === 'x' ? r : (r & 3 | 8);
    return v.toString(16);
  });
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

async function verifyAccountNumber(accountNumber, bankCode) {
  const verifyResult = $('accountVerifyResult');
  verifyResult.style.display = 'block';
  verifyResult.className = 'verify-badge loading';
  verifyResult.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying account number...';

  try {
    const authToken = btoa(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`);
    const tokenRes = await fetch('https://api.monnify.com/api/v1/auth/login', {
      method: 'POST',
      headers: { Authorization: `Basic ${authToken}`, 'Content-Type': 'application/json' }
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.requestSuccessful) {
      verifyResult.className = 'verify-badge error';
      verifyResult.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i> Could not verify account at this time. Please try again.';
      return null;
    }
    const accessToken = tokenData.responseBody.accessToken;
    const validateRes = await fetch(
      `https://api.monnify.com/api/v1/disbursements/account/validate?accountNumber=${accountNumber}&bankCode=${bankCode}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      }
    );
    const validateData = await validateRes.json();
    if (validateData.requestSuccessful) {
      const accountName = validateData.responseBody.accountName;
      verifyResult.className = 'verify-badge success';
      verifyResult.innerHTML = `<i class="fa-solid fa-check-circle"></i> Account verified: <b>${escapeHtml(accountName)}</b>`;
      return accountName;
    } else {
      verifyResult.className = 'verify-badge error';
      verifyResult.innerHTML = '<i class="fa-solid fa-times-circle"></i> Invalid account number. Please check and try again.';
      return null;
    }
  } catch (err) {
    verifyResult.className = 'verify-badge error';
    verifyResult.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i> Verification service unavailable. Please try again later.';
    return null;
  }
}

function populateBankSelect() {
  const sel = $('wdBankName');
  sel.innerHTML = '<option value="" disabled selected>Select a bank</option>';
  NIGERIAN_BANKS.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.code;
    opt.textContent = b.name;
    sel.appendChild(opt);
  });
}

function toggleOverlay(id, open) {
  const el = $(id);
  if (open) {
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  } else {
    el.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function dayKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function buildDailyCounts(referrals) {
  const counts = new Array(DAYS_WINDOW).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map = new Map();
  referrals.forEach(r => {
    const dateStr = r.date_registered || r.created_at;
    if (!dateStr) return;
    const k = dayKey(dateStr);
    map.set(k, (map.get(k) || 0) + 1);
  });
  for (let i = 0; i < DAYS_WINDOW; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (DAYS_WINDOW - 1 - i));
    counts[i] = map.get(dayKey(d)) || 0;
  }
  return counts;
}

function renderChart(counts) {
  const areaG = $('chartArea');
  const linesG = $('chartLines');
  const dotsG = $('chartDots');
  areaG.innerHTML = '';
  linesG.innerHTML = '';
  dotsG.innerHTML = '';

  const W = 500, BASE = 100;
  const n = counts.length;
  const maxV = Math.max(...counts, 1);
  const minV = Math.min(...counts, 0);
  const range = Math.max(maxV - minV, 1);
  const step = W / (n - 1);

  const pts = counts.map((v, i) => {
    const y = BASE + 20 - ((v - minV) / range) * (BASE + 4);
    return [i * step, Math.max(10, Math.min(190, y))];
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${W},${BASE} L0,${BASE} Z`;

  areaG.innerHTML = `
    <g clip-path="url(#aboveBaseline)"><path d="${areaPath}" fill="url(#greenGradient)"/></g>
    <g clip-path="url(#belowBaseline)"><path d="${areaPath}" fill="url(#redGradient)"/></g>
  `;

  linesG.innerHTML = `
    <g clip-path="url(#aboveBaseline)"><path d="${linePath}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g clip-path="url(#belowBaseline)"><path d="${linePath}" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>
  `;

  let dots = '';
  pts.forEach((p, i) => {
    const col = p[1] < BASE ? '#10b981' : (p[1] > BASE ? '#ef4444' : '#9ca3af');
    dots += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="#fff" stroke="${col}" stroke-width="2.5"/>`;
    if (counts[i] > 0) {
      dots += `<text x="${p[0].toFixed(1)}" y="${(p[1] - 9).toFixed(1)}" text-anchor="middle" class="chart-dot-label">${counts[i]}</text>`;
    }
  });
  dotsG.innerHTML = dots;

  const todayCount = counts[n - 1];
  const yestCount = counts[n - 2];
  const pill = $('trendPill');
  if (todayCount > yestCount) {
    pill.className = 'trend-pill up';
    pill.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> Growing (+${todayCount - yestCount})`;
  } else if (todayCount < yestCount) {
    pill.className = 'trend-pill down';
    pill.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> Dropping (${todayCount - yestCount})`;
  } else {
    pill.className = 'trend-pill flat';
    pill.innerHTML = `<i class="fa-solid fa-minus"></i> No change (${todayCount})`;
  }
}

function updateLevelBadge(activeCount) {
  const badge = $('levelBadge');
  const text = $('levelText');
  let cls = '', label = '', icon = '';
  if (activeCount >= 50) { cls = 'diamond'; label = 'Diamond Partner'; icon = 'fa-gem'; }
  else if (activeCount >= 20) { cls = 'gold'; label = 'Gold Ambassador'; icon = 'fa-crown'; }
  else if (activeCount >= 10) { cls = 'gold'; label = 'Gold Star'; icon = 'fa-medal'; }
  else if (activeCount >= 5) { cls = 'silver'; label = 'Silver Star'; icon = 'fa-medal'; }
  else if (activeCount >= 1) { cls = 'bronze'; label = 'Bronze Starter'; icon = 'fa-medal'; }
  else { cls = ''; label = 'Beginner — Make Your First Referral!'; icon = 'fa-seedling'; }
  badge.className = `level-badge ${cls}`;
  text.textContent = label;
  badge.querySelector('i').className = `fa-solid ${icon}`;
}

function updateGoal(activeCount) {
  const milestones = [1, 5, 10, 20, 50];
  const next = milestones.find(m => m > activeCount);
  const goalWrap = $('nextGoal');
  if (!next) {
    goalWrap.querySelector('.ng-top span:first-child').innerHTML = '<i class="fa-solid fa-trophy"></i> Highest Level Reached!';
    $('goalText').textContent = `${activeCount} active referrals`;
    $('goalBar').style.width = '100%';
    return;
  }
  const prev = activeCount === 0 ? 0 : milestones.filter(m => m <= activeCount).pop() || 0;
  const pct = Math.min(100, Math.round(((activeCount - prev) / (next - prev)) * 100));
  $('goalText').textContent = `${activeCount}/${next} active referrals`;
  goalWrap.querySelector('.ng-top span:first-child').innerHTML = `<i class="fa-solid fa-bullseye"></i> Next Goal: ${next} Active Referrals`;
  $('goalBar').style.width = `${Math.max(pct, 3)}%`;
}

function renderRefList(referrals) {
  const list = $('refList');
  if (!referrals.length) {
    list.innerHTML = `
      <div class="empty-state" style="padding:22px 12px">
        <i class="fa-solid fa-user-plus"></i>
        <b>No Referrals Yet</b>
        <p>Share your referral link to start building your team!</p>
      </div>
    `;
    return;
  }
  const recent = referrals.slice(0, 6);
  list.innerHTML = recent.map(r => {
    const name = r.full_name || 'New Student';
    const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const status = (r.status || 'pending').toLowerCase();
    const statusLabel = status === 'active' ? 'Reading' : 'Pending';
    const date = (r.date_registered || r.created_at) ? new Date(r.date_registered || r.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' }) : '';
    return `
      <div class="ref-user">
        <div class="ru-avatar">${escapeHtml(initials)}</div>
        <div class="ru-info">
          <b>${escapeHtml(name)}</b>
          <small><i class="fa-solid fa-calendar" style="color:var(--violet)"></i> Joined ${escapeHtml(date)}</small>
        </div>
        <span class="ru-status ${status === 'active' ? 'active' : 'pending'}">${statusLabel}</span>
      </div>
    `;
  }).join('');
}

function renderStatsError() {
  $('statTotal').textContent = '0';
  $('statActive').textContent = '0';
  $('statPending').textContent = '0';
  $('statEarned').textContent = '0';
  renderChart(new Array(DAYS_WINDOW).fill(0));
  renderRefList([]);
}

async function loadReferralStats(refCode) {
  $('statTotal').textContent = '...';
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_data->>referred_by', refCode);

    if (error) {
      renderStatsError();
      return;
    }

    const list = (data || []).map((row) => {
      const ud = row.user_data || {};
      return {
        full_name: ud.full_name || '',
        status: ud.status || 'pending',
        date_registered: ud.date_registered || ud.created_at || null,
        created_at: null
      };
    }).sort((a, b) => new Date(b.date_registered || 0) - new Date(a.date_registered || 0));

    const total = list.length;
    const active = list.filter(r => (r.status || '').toLowerCase() === 'active').length;
    const pending = list.filter(r => (r.status || '').toLowerCase() === 'pending').length;
    const earned = active * REFERRAL_REWARD;

    $('statTotal').textContent = total;
    $('statActive').textContent = active;
    $('statPending').textContent = pending;
    $('statEarned').textContent = earned.toLocaleString('en-NG');

    updateLevelBadge(active);
    updateGoal(active);
    renderChart(buildDailyCounts(list));
    renderRefList(list);
  } catch (err) {
    renderStatsError();
  }
}

async function loadReferralData() {
  showLoading();
  try {
    const raw = localStorage.getItem('idt_user');
    if (!raw) {
      showToast('error', 'Session Expired', 'Please log in again to continue.');
      setTimeout(() => { window.location.href = 'register.html'; }, 1500);
      return;
    }
    let sessionUser = null;
    try {
      sessionUser = JSON.parse(raw);
    } catch (e) {
      sessionUser = null;
    }
    if (!sessionUser || !sessionUser.id) {
      showToast('error', 'Session Expired', 'Please log in again to continue.');
      setTimeout(() => { window.location.href = 'register.html'; }, 1500);
      return;
    }
    userId = sessionUser.id;
    currentUser = sessionUser;

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !profile) {
      showToast('error', 'Profile Error', 'Could not load your profile. Please refresh the page.');
      hideLoading();
      return;
    }

    currentProfile = profile;
    const ud = profile.user_data || {};
    const bonus = parseFloat(ud.referral_bonus) || 0;
    const refLink = ud.referral_link || 'https://www.idtacademy.com.ng/index/ref/' + (ud.referral_code || '');
    const refCode = ud.referral_code || 'N/A';

    $('refBalance').textContent = bonus.toFixed(2);
    $('wdBalance').textContent = bonus.toFixed(2);
    $('refLinkDisplay').textContent = refLink;
    $('refCodeDisplay').textContent = refCode;
    $('smUserName').textContent = ud.full_name || 'Student';
    $('smBonus').textContent = bonus.toFixed(2);

    const extra = document.querySelector('#smReferralExtra');
    if (extra) extra.textContent = `₦${bonus.toFixed(2)}`;

    generateQRCode(refLink);
    hideLoading();

    if (refCode && refCode !== 'N/A') {
      loadReferralStats(refCode);
    } else {
      renderStatsError();
    }
  } catch (err) {
    showToast('error', 'Error', 'An unexpected error occurred while loading your data.');
    hideLoading();
  }
}

function generateQRCode(link) {
  const qrImg = $('qrImage');
  if (!link || link === 'loading...') {
    qrImg.src = '';
    qrImg.alt = 'No link available';
    return;
  }
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}&bgcolor=ffffff&color=7c3aed&margin=12`;
  qrImg.alt = `QR Code for ${link}`;
}

async function handleWithdrawSubmit(e) {
  e.preventDefault();
  const amount = parseFloat($('wdAmount').value);
  const accountNumber = $('wdAccountNumber').value.trim();
  const bankCode = $('wdBankName').value;
  const bankName = $('wdBankName').selectedOptions[0]?.text || '';
  const password = $('wdPassword').value;

  if (!amount || amount < 100) {
    showToast('error', 'Invalid Amount', 'Minimum withdrawal amount is ₦100.');
    return;
  }

  const currentUd = currentProfile.user_data || {};
  const balance = parseFloat(currentUd.referral_bonus) || 0;
  if (amount > balance) {
    showToast('error', 'Insufficient Balance', `You only have ₦${balance.toFixed(2)} available.`);
    return;
  }

  if (!accountNumber || accountNumber.length !== 10 || !/^\d{10}$/.test(accountNumber)) {
    showToast('error', 'Invalid Account', 'Please enter a valid 10-digit account number.');
    return;
  }

  if (!bankCode) {
    showToast('error', 'Bank Required', 'Please select your bank.');
    return;
  }

  if (!password) {
    showToast('error', 'Password Required', 'Please enter your login password to confirm.');
    return;
  }

  showLoading();
  try {
    const storedHash = String(currentUd.password_hash || '').toLowerCase();
    const storedSalt = String(currentUd.password_salt || '');
    if (!storedHashOk(storedHash, storedSalt)) {
      hideLoading();
      showToast('error', 'Account Error', 'This account has no password saved. Please contact support.');
      return;
    }
    const computedHash = await hashPassword(password, storedSalt);
    if (computedHash !== storedHash) {
      hideLoading();
      showToast('error', 'Wrong Password', 'The password you entered is incorrect. Please try again.');
      return;
    }

    const accountName = await verifyAccountNumber(accountNumber, bankCode);
    if (!accountName) {
      hideLoading();
      showToast('error', 'Verification Failed', 'Account number verification failed. Please check and try again.');
      return;
    }

    const { data: pendingCheck } = await supabase
      .from('pending')
      .select('id')
      .eq('pending_pay->>user_id', userId)
      .limit(1);

    if (pendingCheck && pendingCheck.length > 0) {
      hideLoading();
      showToast('error', 'Pending Withdrawal', 'You already have a pending withdrawal. Please wait for it to be processed before making a new request.');
      return;
    }

    const netAmount = amount - (amount * 0.09);
    const now = new Date().toISOString();
    const withdrawalData = {
      amount: netAmount,
      bank_code: bankCode,
      account_number: accountNumber,
      bank_name: bankName,
      account_name: accountName,
      date: now,
      user_id: userId,
      user_email: currentUd.email || '',
      user_name: currentUd.full_name || 'Student',
      status: 'pending'
    };

    const { error: insertError } = await supabase
      .from('pending')
      .insert({
        id: userId,
        pending_pay: withdrawalData
      });

    if (insertError) {
      hideLoading();
      showToast('error', 'Submission Failed', 'Could not submit withdrawal request. Please try again.');
      return;
    }

    $('withdrawForm').reset();
    $('accountVerifyResult').style.display = 'none';
    toggleOverlay('withdrawOverlay', false);
    hideLoading();
    showToast('success', 'Withdrawal Submitted!', `Your withdrawal request of ₦${netAmount.toFixed(2)} to ${accountName} (${bankName}) has been submitted successfully. You will receive your payment within 24 hours. If you do not receive it, please contact support via WhatsApp.`);

  } catch (err) {
    hideLoading();
    showToast('error', 'Error', 'An unexpected error occurred. Please try again.');
  }
}

function storedHashOk(hash, salt) {
  return Boolean(hash) && Boolean(salt);
}

async function loadTransactions() {
  const txnList = $('txnList');
  txnList.innerHTML = '<div style="text-align:center;padding:20px"><i class="fa-solid fa-spinner fa-spin" style="font-size:24px;color:var(--violet)"></i><p style="margin-top:10px;font-size:13px;color:var(--muted)">Loading transactions...</p></div>';

  try {
    const [pendingRes, completedRes] = await Promise.all([
      supabase.from('pending').select('*').eq('pending_pay->>user_id', userId),
      supabase.from('completepay').select('*').eq('complete_pay->>user_id', userId)
    ]);

    const pending = (pendingRes.data || []).slice().sort((a, b) => {
      const da = new Date((a.pending_pay || {}).date || 0).getTime();
      const db = new Date((b.pending_pay || {}).date || 0).getTime();
      return db - da;
    });
    const completed = (completedRes.data || []).sort((a, b) => {
      const da = new Date((a.complete_pay || {}).paid_date || a.date_complet || 0).getTime();
      const db = new Date((b.complete_pay || {}).paid_date || b.date_complet || 0).getTime();
      return db - da;
    });

    if (pending.length === 0 && completed.length === 0) {
      txnList.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-receipt"></i>
          <b>No Transactions Yet</b>
          <p>You have not made any withdrawal requests yet. Go ahead and withdraw your referral earnings!</p>
        </div>
      `;
      return;
    }

    let html = '';

    pending.forEach(item => {
      const data = item.pending_pay || {};
      const date = new Date(data.date || data.created_at || Date.now()).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      html += `
        <div class="txn-item">
          <div class="txn-top">
            <span class="txn-amount"><i class="fa-solid fa-naira-sign"></i>${parseFloat(data.amount || 0).toFixed(2)}</span>
            <span class="txn-status pending">Pending</span>
          </div>
          <div class="txn-meta">
            <span><i class="fa-solid fa-building-columns"></i> ${escapeHtml(data.bank_name || 'N/A')}</span>
            <span><i class="fa-solid fa-hashtag"></i> ${escapeHtml(data.account_number || 'N/A')}</span>
            <span><i class="fa-solid fa-calendar"></i> ${escapeHtml(date)}</span>
          </div>
          <div class="txn-detail" style="display:none">
            <span><i class="fa-solid fa-user"></i> Account Name: ${escapeHtml(data.account_name || 'N/A')}</span>
            <span><i class="fa-solid fa-credit-card"></i> Bank: ${escapeHtml(data.bank_name || 'N/A')}</span>
            <span><i class="fa-solid fa-hashtag"></i> Account: ${escapeHtml(data.account_number || 'N/A')}</span>
            <span><i class="fa-solid fa-clock"></i> Requested: ${escapeHtml(date)}</span>
            <span style="color:var(--muted);font-size:11px">Awaiting payment confirmation from admin.</span>
          </div>
        </div>
      `;
    });

    completed.forEach(item => {
      const data = item.complete_pay || {};
      const date = new Date(data.paid_date || item.date_complet || data.date || Date.now()).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      html += `
        <div class="txn-item">
          <div class="txn-top">
            <span class="txn-amount"><i class="fa-solid fa-naira-sign"></i>${parseFloat(data.amount || 0).toFixed(2)}</span>
            <span class="txn-status completed">Paid</span>
          </div>
          <div class="txn-meta">
            <span><i class="fa-solid fa-building-columns"></i> ${escapeHtml(data.bank_name || 'N/A')}</span>
            <span><i class="fa-solid fa-hashtag"></i> ${escapeHtml(data.account_number || 'N/A')}</span>
            <span><i class="fa-solid fa-calendar"></i> ${escapeHtml(date)}</span>
          </div>
          <div class="txn-detail" style="display:none">
            <span><i class="fa-solid fa-user"></i> Account Name: ${escapeHtml(data.account_name || 'N/A')}</span>
            <span><i class="fa-solid fa-credit-card"></i> Bank: ${escapeHtml(data.bank_name || 'N/A')}</span>
            <span><i class="fa-solid fa-hashtag"></i> Account: ${escapeHtml(data.account_number || 'N/A')}</span>
            <span><i class="fa-solid fa-check-circle" style="color:var(--green)"></i> Paid: ${escapeHtml(date)}</span>
          </div>
        </div>
      `;
    });

    txnList.innerHTML = html;

    document.querySelectorAll('.txn-item').forEach(item => {
      item.addEventListener('click', function() {
        const detail = this.querySelector('.txn-detail');
        const isOpen = detail.style.display !== 'none';
        detail.style.display = isOpen ? 'none' : 'flex';
      });
    });

  } catch (err) {
    txnList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation" style="color:var(--rose)"></i>
        <b>Error Loading Transactions</b>
        <p>Could not load your transaction history. Please refresh the page.</p>
      </div>
    `;
  }
}

function initMenu() {
  $('menuBtn').addEventListener('click', () => $('sideMenu').classList.add('open'));
  $('menuClose').addEventListener('click', () => $('sideMenu').classList.remove('open'));
  document.addEventListener('click', (e) => {
    if (e.target.closest('.side-menu') || e.target.closest('.menu-btn')) return;
    $('sideMenu').classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $('sideMenu').classList.remove('open');
      toggleOverlay('withdrawOverlay', false);
      toggleOverlay('transactionsOverlay', false);
    }
  });
  $('menuLogout').addEventListener('click', () => {
    localStorage.removeItem('idt_user');
    showToast('info', 'Logged Out', 'You have been logged out. Redirecting to login...');
    setTimeout(() => { window.location.href = 'register.html'; }, 1200);
  });
}

function initOverlays() {
  $('btnWithdrawOpen').addEventListener('click', () => {
    const balance = parseFloat((currentProfile.user_data || {}).referral_bonus) || 0;
    if (balance < 100) {
      showToast('error', 'Minimum Balance Required', 'You need at least ₦100 to withdraw. Keep sharing your referral link to earn more!');
      return;
    }
    toggleOverlay('withdrawOverlay', true);
  });

  $('withdrawBack').addEventListener('click', () => toggleOverlay('withdrawOverlay', false));
  $('withdrawClose').addEventListener('click', () => toggleOverlay('withdrawOverlay', false));

  $('btnTxnOpen').addEventListener('click', () => {
    toggleOverlay('transactionsOverlay', true);
    loadTransactions();
  });
  $('txnBack').addEventListener('click', () => toggleOverlay('transactionsOverlay', false));
  $('txnClose').addEventListener('click', () => toggleOverlay('transactionsOverlay', false));

  $('btnAllBalance').addEventListener('click', () => {
    const balance = parseFloat((currentProfile.user_data || {}).referral_bonus) || 0;
    $('wdAmount').value = Math.floor(balance);
  });

  $('withdrawForm').addEventListener('submit', handleWithdrawSubmit);
}

function initVerification() {
  let verifyTimeout = null;
  const tryVerify = () => {
    const acc = $('wdAccountNumber').value;
    const bank = $('wdBankName').value;
    if (acc.length === 10 && bank) {
      clearTimeout(verifyTimeout);
      verifyTimeout = setTimeout(() => verifyAccountNumber(acc, bank), 600);
    }
  };
  $('wdAccountNumber').addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '').slice(0, 10);
    $('accountVerifyResult').style.display = 'none';
    tryVerify();
  });
  $('wdBankName').addEventListener('change', () => {
    $('accountVerifyResult').style.display = 'none';
    tryVerify();
  });
}

function initCopyButtons() {
  const bindCopy = (btnId, getText, successMsg) => {
    $(btnId).addEventListener('click', function() {
      const text = getText();
      if (!text || text === 'loading...') {
        showToast('error', 'Not Ready', 'Please wait for your data to load.');
        return;
      }
      navigator.clipboard.writeText(text).then(() => {
        this.innerHTML = '<i class="fa-solid fa-check"></i>';
        this.classList.add('done');
        showToast('success', 'Copied!', successMsg);
        setTimeout(() => { this.innerHTML = '<i class="fa-solid fa-copy"></i>'; this.classList.remove('done'); }, 2500);
      }).catch(() => {
        showToast('error', 'Copy Failed', 'Could not copy. Please select and copy manually.');
      });
    });
  };
  bindCopy('copyRefLink', () => $('refLinkDisplay').textContent, 'Referral link copied to clipboard.');
  bindCopy('copyRefCode', () => $('refCodeDisplay').textContent, 'Referral code copied to clipboard.');
}

document.addEventListener('DOMContentLoaded', function() {
  showLoading();
  populateBankSelect();
  initMenu();
  initOverlays();
  initVerification();
  initCopyButtons();
  loadReferralData();
});

window.addEventListener('load', function() {
  setTimeout(hideLoading, 600);
});

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('ready');
});
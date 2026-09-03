import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);

let currentUserId = '';
let currentUd = {};

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function miniLoad(text) {
  const elText = $('miniLoaderText');
  const elLoader = $('miniLoader');
  if (elText) elText.textContent = text || 'Please wait...';
  if (elLoader) elLoader.classList.add('open');
}

function miniHide() {
  const elLoader = $('miniLoader');
  if (elLoader) elLoader.classList.remove('open');
}

function removePush(card) {
  card.classList.add('out');
  setTimeout(() => card.remove(), 320);
}

function pushShow(type, title, message) {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const card = document.createElement('div');
  card.className = 'push-card ' + type;
  card.innerHTML =
    '<img class="push-logo" src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy">' +
    '<div class="push-body"><b><i class="fa-solid ' + (icons[type] || icons.info) + '"></i> ' + escapeHtml(title) + '</b><p>' + escapeHtml(message) + '</p></div>' +
    '<button class="push-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  
  const closeBtn = card.querySelector('.push-x');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => removePush(card));
  }
  
  const wrap = $('pushWrap');
  if (wrap) wrap.appendChild(card);
  if (type === 'success') setTimeout(() => removePush(card), 6000);
}

async function copyText(txt) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(txt);
  } else {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function normalizeUrl(raw) {
  let url = String(raw || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try {
    const u = new URL(url);
    if (!u.hostname.includes('.')) return '';
    return u.href;
  } catch (err) {
    return '';
  }
}

function showDash() {
  const elLogin = $('loginView');
  const elDash = $('dashView');
  const elBadge = $('userBadge');
  const elLogout = $('btnLogout');

  if (elLogin) elLogin.classList.add('hidden');
  if (elDash) elDash.classList.remove('hidden');
  if (elBadge) elBadge.classList.remove('hidden');
  if (elLogout) elLogout.classList.remove('hidden');
}

function showLogin() {
  const elDash = $('dashView');
  const elLogin = $('loginView');
  const elBadge = $('userBadge');
  const elLogout = $('btnLogout');

  if (elDash) elDash.classList.add('hidden');
  if (elLogin) elLogin.classList.remove('hidden');
  if (elBadge) elBadge.classList.add('hidden');
  if (elLogout) elLogout.classList.add('hidden');
}

function renderDash() {
  const ud = currentUd;
  const fullName = ud.full_name || 'Student';
  const email = ud.email || '—';
  const bonus = '₦' + Number(ud.referral_bonus || 0).toLocaleString();
  const course = ud.course_name || '—';
  const status = ud.status || 'active';
  const profilePic = ud.profile_url || 'https://i.imgur.com/oyqM5oF.png';

  const elHeroName = $('heroName');
  const elStuName = $('stuName');
  const elStuEmail = $('stuEmail');
  const elStatBonus = $('statBonus');
  const elStatCourse = $('statCourse');
  const elStatStatus = $('statStatus');
  const elStuAvatar = $('stuAvatar');
  const elRefLink = $('refLink');

  if (elHeroName) elHeroName.textContent = fullName;
  if (elStuName) elStuName.textContent = fullName;
  if (elStuEmail) elStuEmail.textContent = email;
  if (elStatBonus) elStatBonus.textContent = bonus;
  if (elStatCourse) elStatCourse.textContent = course;
  if (elStatStatus) elStatStatus.textContent = status;
  if (elStuAvatar) elStuAvatar.src = profilePic;

  const link = ud.referral_link || ('https://www.idtacademy.com.ng/register?ref=' + (ud.referral_code || currentUserId));
  if (elRefLink) elRefLink.value = link;
}

async function loadProfile(userId) {
  miniLoad('Loading your profile...');

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, user_data')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    currentUserId = userId;
    currentUd = typeof data?.user_data === 'string' ? JSON.parse(data.user_data) : (data?.user_data || {});

    if (currentUd.profile_url) {
      const elStuAvatar = $('stuAvatar');
      if (elStuAvatar) elStuAvatar.src = currentUd.profile_url;
    }

    const { data: postRow, error: postErr } = await supabase
      .from('post')
      .select('post_link')
      .eq('id', userId)
      .maybeSingle();

    if (!postErr && postRow && postRow.post_link) {
      const linkVal = typeof postRow.post_link === 'object' ? postRow.post_link.link : postRow.post_link;
      const elPostInput = $('postLinkInput');
      const elPostBtn = $('btnPostSubmit');

      if (elPostInput && linkVal) elPostInput.value = linkVal;
      if (elPostBtn) elPostBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Update Link';
    }

    renderDash();
    showDash();
    miniHide();
  } catch (err) {
    miniHide();
    showDash();
    renderDash();
    pushShow('error', 'Profile Load Failed', err.message || 'Could not load your profile.');
  }
}

function bindEvents() {
  const togglePass = $('togglePass');
  const loginBtn = $('loginBtn');
  const loginEmail = $('loginEmail');
  const loginPass = $('loginPass');
  const btnLogout = $('btnLogout');
  const copyRef = $('copyRef');
  const postForm = $('postForm');

  if (togglePass) {
    togglePass.addEventListener('click', () => {
      const inp = $('loginPass');
      if (!inp) return;
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      togglePass.innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const emailEl = $('loginEmail');
      const passEl = $('loginPass');
      const errBox = $('loginErr');

      const email = emailEl ? emailEl.value.trim().toLowerCase() : '';
      const pass = passEl ? passEl.value : '';

      if (errBox) errBox.classList.add('hidden');

      if (!email || !pass) {
        if (errBox) {
          errBox.textContent = 'Please enter your email and password.';
          errBox.classList.remove('hidden');
        }
        return;
      }

      miniLoad('Signing you in...');

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        if (!data || !data.session) throw new Error('No session returned');

        const loggedUser = {
          id: data.session.user.id,
          email: data.session.user.email
        };
        localStorage.setItem('idt_user', JSON.stringify(loggedUser));

        miniHide();
        pushShow('success', 'Welcome Back!', 'Signed in as ' + email);
        await loadProfile(data.session.user.id);
      } catch (err) {
        miniHide();
        if (errBox) {
          errBox.textContent = 'Incorrect email or password.';
          errBox.classList.remove('hidden');
        }
        pushShow('error', 'Login Failed', 'Please check your email and password.');
      }
    });
  }

  if (loginEmail) {
    loginEmail.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const btn = $('loginBtn');
        if (btn) btn.click();
      }
    });
  }

  if (loginPass) {
    loginPass.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const btn = $('loginBtn');
        if (btn) btn.click();
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await supabase.auth.signOut();
      localStorage.removeItem('idt_user');
      currentUserId = '';
      currentUd = {};
      showLogin();
      
      const emailEl = $('loginEmail');
      const passEl = $('loginPass');
      const errBox = $('loginErr');

      if (emailEl) emailEl.value = '';
      if (passEl) passEl.value = '';
      if (errBox) errBox.classList.add('hidden');

      pushShow('info', 'Signed Out', 'You have been logged out.');
    });
  }

  if (copyRef) {
    copyRef.addEventListener('click', async () => {
      const linkEl = $('refLink');
      const link = linkEl ? linkEl.value : '';

      if (!link) {
        pushShow('error', 'No Link', 'Referral link is not available.');
        return;
      }

      try {
        await copyText(link);
        copyRef.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        copyRef.classList.add('done');
        setTimeout(() => {
          copyRef.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
          copyRef.classList.remove('done');
        }, 2500);

        pushShow('success', 'Copied!', 'Your referral link has been copied. Share it and earn ₦1500 per registration.');
      } catch (err) {
        pushShow('error', 'Copy Failed', err.message || String(err));
      }
    });
  }

  if (postForm) {
    postForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      let activeId = currentUserId;

      if (!activeId) {
        const localRaw = localStorage.getItem('idt_user');
        if (localRaw) {
          try {
            const parsed = JSON.parse(localRaw);
            if (parsed && parsed.id) activeId = parsed.id;
          } catch (err) {}
        }
      }

      if (!activeId) {
        pushShow('error', 'Not Signed In', 'Please sign in first.');
        return;
      }

      const inputEl = $('postLinkInput');
      const link = normalizeUrl(inputEl ? inputEl.value : '');

      if (!link) {
        pushShow('error', 'Invalid Link', 'Please enter a valid social media post link.');
        return;
      }

      miniLoad('Submitting your post link...');

      try {
        const payload = {
          id: activeId,
          post_link: { link: link, submitted_at: new Date().toISOString() }
        };

        const { error } = await supabase
          .from('post')
          .upsert(payload, { onConflict: 'id' });

        if (error) throw error;

        miniHide();
        const submitBtn = $('btnPostSubmit');
        if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Update Link';

        pushShow('success', 'Congratulations!', 'Your post link has been received successfully. Once verified, ₦2000 will be added to your bonus. If you do not receive it within 24 hours, please contact Customer Care.');
      } catch (err) {
        miniHide();
        pushShow('error', 'Submit Failed', err.message || 'Could not submit your link. Please try again.');
      }
    });
  }
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    const localRaw = localStorage.getItem('idt_user');
    if (!localRaw) {
      currentUserId = '';
      currentUd = {};
      showLogin();
    }
  }
});

async function init() {
  const elBadge = $('userBadge');
  const elLogout = $('btnLogout');

  if (elBadge) elBadge.classList.add('hidden');
  if (elLogout) elLogout.classList.add('hidden');

  bindEvents();

  let targetUserId = '';
  const localRaw = localStorage.getItem('idt_user');

  if (localRaw) {
    try {
      const parsed = JSON.parse(localRaw);
      if (parsed && parsed.id) targetUserId = parsed.id;
    } catch (e) {}
  }

  try {
    const { data } = await supabase.auth.getSession();
    if (data && data.session && data.session.user) {
      targetUserId = data.session.user.id;
    }
  } catch (err) {}

  if (targetUserId) {
    await loadProfile(targetUserId);
  } else {
    showLogin();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});
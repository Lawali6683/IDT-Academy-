import { supabase } from './supabase.js';
const $ = (id) => document.getElementById(id);
const API_URL = '/api/2000Email';
let posts = [];
let deleteTargetId = '';
let confirmedToday = 0;
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
function miniLoad(text) {
  $('miniLoaderText').textContent = text || 'Please wait...';
  $('miniLoader').classList.add('open');
}
function miniHide() {
  $('miniLoader').classList.remove('open');
}
function removePush(card) {
  card.classList.add('out');
  setTimeout(() => card.remove(), 320);
}
function pushShow(type, title, message, raw) {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const card = document.createElement('div');
  card.className = 'push-card ' + type;
  const rawHtml = raw ? '<small style="display:block;margin-top:6px;font-size:10.5px;color:#b45309;background:rgba(245,158,11,.1);border-radius:8px;padding:5px 8px;word-break:word-break">' + escapeHtml(raw) + '</small>' : '';
  card.innerHTML =
    '<img class="push-logo" src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy">' +
    '<div class="push-body"><b><i class="fa-solid ' + icons[type] + '"></i> ' + escapeHtml(title) + '</b><p>' + escapeHtml(message) + '</p>' + rawHtml + '</div>' +
    '<button class="push-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  card.querySelector('.push-x').addEventListener('click', () => removePush(card));
  $('pushWrap').appendChild(card);
  if (type === 'success') setTimeout(() => removePush(card), 6000);
}
function showDash() {
  $('loginView').classList.add('hidden');
  $('dashView').classList.remove('hidden');
  $('adminBadge').classList.remove('hidden');
  $('btnLogout').classList.remove('hidden');
  loadPosts();
}
function showLogin() {
  $('dashView').classList.add('hidden');
  $('loginView').classList.remove('hidden');
  $('adminBadge').classList.add('hidden');
  $('btnLogout').classList.add('hidden');
}
function getGrade(ud) {
  if (ud.exam_grade) return String(ud.exam_grade);
  if (Array.isArray(ud.exam_data)) {
    const passed = ud.exam_data.filter((e) => e.passed === true);
    if (passed.length && passed[passed.length - 1].pct != null) {
      return passed[passed.length - 1].pct + '%';
    }
  }
  return '—';
}
function normalizeUrl(raw) {
  let url = String(raw || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}
async function loadPosts() {
  miniLoad('Loading submitted posts...');
  try {
    const { data, error } = await supabase.from('post').select('id, post_link, created_at').order('created_at', { ascending: false });
    if (error) throw error;
    const rows = data || [];
    const items = [];
    for (const row of rows) {
      const { data: prof, error: profErr } = await supabase.from('user_profiles').select('id, profile_url, user_data').eq('id', row.id).maybeSingle();
      if (profErr) throw profErr;
      const rawLink = typeof row.post_link === 'object' ? (row.post_link.link || '') : (row.post_link || '');
      const rawTime = typeof row.post_link === 'object' ? (row.post_link.submitted_at || row.created_at || '') : (row.created_at || '');
      items.push({
        id: row.id,
        link: rawLink,
        submitted_at: rawTime,
        profile: prof
      });
    }
    posts = items;
    renderPosts();
    miniHide();
  } catch (err) {
    miniHide();
    pushShow('error', 'Load Failed', 'Could not load the posts.', err.message || String(err));
  }
}
function renderPosts() {
  const list = $('postList');
  const empty = $('postEmpty');
  $('statTotal').textContent = posts.length;
  $('statPending').textContent = posts.length;
  $('statConfirmed').textContent = confirmedToday;
  if (!posts.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  list.innerHTML = posts.map((p, idx) => {
    const ud = (p.profile && p.profile.user_data) || {};
    const img = (p.profile && p.profile.profile_url) || 'https://i.imgur.com/oyqM5oF.png';
    const name = ud.full_name || 'Student';
    const course = ud.course_name || '—';
    const grade = getGrade(ud);
    return '<div class="post-card" data-idx="' + idx + '">' +
      '<img class="pc-img" src="' + img + '" alt="Student">' +
      '<div class="pc-info">' +
      '<b>' + escapeHtml(name) + '</b>' +
      '<span><i class="fa-solid fa-book-open" style="color:var(--violet)"></i> ' + escapeHtml(course) + '</span>' +
      '<span><i class="fa-solid fa-award" style="color:var(--amber)"></i> Exam Grade: ' + escapeHtml(String(grade)) + '</span>' +
      '</div>' +
      '<div class="pc-actions">' +
      '<button class="pc-btn link" data-act="link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Link</button>' +
      '<button class="pc-btn confirm" data-act="confirm"><i class="fa-solid fa-circle-check"></i> Confirm</button>' +
      '<button class="pc-btn delete" data-act="delete"><i class="fa-solid fa-trash"></i> Delete</button>' +
      '</div>' +
      '</div>';
  }).join('');
}
$('togglePass').addEventListener('click', () => {
  const inp = $('loginPass');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  $('togglePass').innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
});
$('loginBtn').addEventListener('click', async () => {
  const email = $('loginEmail').value.trim().toLowerCase();
  const pass = $('loginPass').value;
  const errBox = $('loginErr');
  errBox.classList.add('hidden');
  if (!email || !pass) {
    errBox.textContent = 'Please enter your email and password.';
    errBox.classList.remove('hidden');
    return;
  }
  miniLoad('Signing you in...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    if (!data || !data.session) throw new Error('No session returned');
    miniHide();
    $('adminBadge').innerHTML = '<i class="fa-solid fa-shield-halved"></i> ' + escapeHtml(email);
    pushShow('success', 'Welcome Admin', 'Signed in as ' + email);
    showDash();
  } catch (err) {
    miniHide();
    errBox.textContent = 'Incorrect email or password.';
    errBox.classList.remove('hidden');
    pushShow('error', 'Login Failed', 'Please check your email and password.');
  }
});
$('loginEmail').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('loginBtn').click();
});
$('loginPass').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('loginBtn').click();
});
$('btnLogout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  showLogin();
  $('loginEmail').value = '';
  $('loginPass').value = '';
  $('loginErr').classList.add('hidden');
  posts = [];
  pushShow('info', 'Signed Out', 'You have been logged out.');
});
$('postList').addEventListener('click', (e) => {
  const btn = e.target.closest('.pc-btn');
  if (!btn) return;
  const card = btn.closest('.post-card');
  const idx = parseInt(card.dataset.idx, 10);
  const post = posts[idx];
  if (!post) return;
  const act = btn.dataset.act;
  if (act === 'link') {
    const url = normalizeUrl(post.link);
    if (!url) {
      pushShow('error', 'No Link', 'This student did not provide a link.');
      return;
    }
    window.open(url, '_blank', 'noopener');
  } else if (act === 'confirm') {
    confirmPost(idx, btn);
  } else if (act === 'delete') {
    deleteTargetId = post.id;
    $('delModal').classList.add('open');
  }
});
async function confirmPost(idx, btn) {
  const post = posts[idx];
  if (!post || !post.id) return;
  const ud = (post.profile && post.profile.user_data) || {};
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
  miniLoad('Confirming and adding ₦2000...');
  try {
    const newBonus = (Number(ud.referral_bonus) || 0) + 2000;
    const newUd = Object.assign({}, ud, { referral_bonus: newBonus });
    const { error: upErr } = await supabase.from('user_profiles').update({ user_data: newUd }).eq('id', post.id);
    if (upErr) throw upErr;
    const { error: delErr } = await supabase.from('post').delete().eq('id', post.id);
    if (delErr) throw delErr;
    posts = posts.filter((p) => p.id !== post.id);
    confirmedToday += 1;
    renderPosts();
    miniHide();
    pushShow('success', 'Confirmed!', (ud.full_name || 'Student') + ' has been credited with ₦2000. The post was removed from the list.');
    const payload = {
      full_name: ud.full_name || '',
      email: ud.email || '',
      referral_link: ud.referral_link || ''
    };
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data && data.error) || 'Email failed');
      pushShow('success', 'Email Sent', 'Congratulations email sent to ' + (payload.email || 'the student') + '.');
    } catch (err) {
      pushShow('error', 'Email Not Sent', 'Reward was added, but the email failed. Please resend manually.', err.message || String(err));
    }
  } catch (err) {
    miniHide();
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirm';
    pushShow('error', 'Confirmation Failed', 'Please try again.', err.message || String(err));
  }
}
$('delCancel').addEventListener('click', () => {
  deleteTargetId = '';
  $('delModal').classList.remove('open');
});
$('delOk').addEventListener('click', async () => {
  if (!deleteTargetId) return;
  $('delModal').classList.remove('open');
  miniLoad('Deleting post...');
  try {
    const { error } = await supabase.from('post').delete().eq('id', deleteTargetId);
    if (error) throw error;
    posts = posts.filter((p) => p.id !== deleteTargetId);
    deleteTargetId = '';
    renderPosts();
    miniHide();
    pushShow('info', 'Post Deleted', 'The submission was removed permanently.');
  } catch (err) {
    deleteTargetId = '';
    miniHide();
    pushShow('error', 'Delete Failed', 'Please try again.', err.message || String(err));
  }
});
$('delModal').addEventListener('click', (e) => {
  if (e.target === $('delModal')) {
    deleteTargetId = '';
    $('delModal').classList.remove('open');
  }
});
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    posts = [];
    showLogin();
  }
});
(async function init() {
  $('adminBadge').classList.add('hidden');
  $('btnLogout').classList.add('hidden');
  try {
    const { data } = await supabase.auth.getSession();
    if (data && data.session) {
      $('adminBadge').innerHTML = '<i class="fa-solid fa-shield-halved"></i> ' + escapeHtml(data.session.user.email || 'Admin');
      showDash();
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
})();
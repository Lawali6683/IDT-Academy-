import { supabase } from './supabase.js';

const _k1 = 'aGFydW5h';
const _k2 = 'NjY=';
const _p1 = 'dWJhaWRh';
const _p2 = 'Nzc=';

const TABLE = 'user_profiles';
const ADMIN_DELETE_ENDPOINT = '/api/admin-delete-user';

const FIELDS = [
    { key: 'id', label: 'User ID', readonly: true },
    { key: 'academy_id', label: 'Academy ID', readonly: true },
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'account_type', label: 'Account Type' },
    { key: 'gender', label: 'Gender' },
    { key: 'course_id', label: 'Course ID' },
    { key: 'course_name', label: 'Course Name' },
    { key: 'course_number', label: 'Course Number' },
    { key: 'course_price', label: 'Course Price' },
    { key: 'payment_no', label: 'Payment No' },
    { key: 'date_of_birth', label: 'Date of Birth' },
    { key: 'school_level', label: 'School Level' },
    { key: 'referral_code', label: 'Referral Code', readonly: true },
    { key: 'referral_link', label: 'Referral Link', full: true, readonly: true },
    { key: 'referred_by', label: 'Referred By' },
    { key: 'referral_bonus', label: 'Referral Bonus' },
    { key: 'total_referrals', label: 'Total Referrals' },
    { key: 'paid_referrals', label: 'Paid Referrals' },
    { key: 'total_withdrawn', label: 'Total Withdrawn' },
    { key: 'assessment_grade', label: 'Assessment Grade' },
    { key: 'exam_grade', label: 'Exam Grade' },
    { key: 'level_completed', label: 'Level Completed' },
    { key: 'certificate_issued', label: 'Certificate Issued' },
    { key: 'status', label: 'Status' },
    { key: 'date_registered', label: 'Date Registered', readonly: true },
    { key: 'created_at', label: 'Created At', readonly: true }
];

const SKIP_KEYS = ['referral_activity'];
const NUMERIC_KEYS = ['referral_bonus', 'total_referrals', 'paid_referrals', 'total_withdrawn', 'course_price', 'course_id', 'course_number'];
const DATE_KEYS = ['date_registered', 'created_at', 'date_of_birth'];
const PAGE_SIZE = 50;

let allUsers = [];
let rawRows = {};
let currentUser = null;
let editing = false;
let visibleCount = PAGE_SIZE;

const $ = (id) => document.getElementById(id);

function toast(msg, type = 'success') {
    const wrap = $('toastWrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info';
    el.innerHTML = '<i class="fa-solid ' + icon + '"></i><span></span>';
    el.querySelector('span').textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 320);
    }, 3400);
}

function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
}

function fmtDate(v) {
    if (!v) return 'N/A';
    const d = new Date(v);
    if (isNaN(d)) return String(v);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status) {
    const s = (status || 'N/A').toLowerCase();
    if (s === 'active') return '<span class="badge active"><i class="fa-solid fa-circle"></i>Active</span>';
    if (s === 'pending') return '<span class="badge pending"><i class="fa-solid fa-circle"></i>Pending</span>';
    return '<span class="badge other"><i class="fa-solid fa-circle"></i>' + esc(status || 'N/A') + '</span>';
}

function ceoUnlock(pw) {
    if (!pw) return false;
    try {
        const pass1 = atob(_k1 + _k2);
        const pass2 = atob(_p1 + _p2);
        return pw === pass1 || pw === pass2;
    } catch (e) {
        return false;
    }
}

function getFilteredList() {
    const q = $('searchInput') ? $('searchInput').value.trim().toLowerCase() : '';
    if (!q) return allUsers;
    return allUsers.filter(u =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.academy_id || '').toLowerCase().includes(q)
    );
}

function renderTable(append) {
    const area = $('tableArea');
    if (!area) return;
    const list = getFilteredList();

    if (!list.length) {
        const query = $('searchInput') ? $('searchInput').value : '';
        area.innerHTML = '<div class="empty-state"><i class="fa-solid fa-user-slash"></i><h3>No Users Found</h3><p>' + (query ? 'No user matches your search.' : 'No registered users yet.') + '</p></div>';
        return;
    }

    if (!append) visibleCount = PAGE_SIZE;
    const shown = list.slice(0, visibleCount);

    let rows = '';
    shown.forEach((u, i) => {
        rows += '<tr data-id="' + esc(u.id) + '">' +
            '<td>' + (i + 1) + '</td>' +
            '<td><div class="u-cell"><div class="u-avatar">' + esc(initials(u.full_name)) + '</div><div><div class="u-name">' + esc(u.full_name || 'N/A') + '</div><div class="u-mail">' + esc(u.email || '') + '</div></div></div></td>' +
            '<td>' + esc(u.academy_id || 'N/A') + '</td>' +
            '<td>' + esc(u.account_type || 'N/A') + '</td>' +
            '<td>' + statusBadge(u.status) + '</td>' +
            '<td>' + fmtDate(u.created_at) + '</td>' +
            '<td><button class="view-btn" data-id="' + esc(u.id) + '"><i class="fa-solid fa-eye"></i> View</button></td>' +
            '</tr>';
    });

    let moreBtn = '';
    if (list.length > visibleCount) {
        moreBtn = '<div style="text-align:center;padding:18px;"><button class="btn-soft" id="loadMoreBtn"><i class="fa-solid fa-chevron-down"></i> Load More (' + (list.length - visibleCount) + ' remaining)</button></div>';
    }

    if (append) {
        const old = area.querySelector('tbody');
        const tmp = document.createElement('table');
        tmp.innerHTML = '<tbody>' + rows + '</tbody>';
        Array.from(tmp.querySelector('tbody').children).forEach(tr => old.appendChild(tr));

        const oldMore = area.querySelector('#loadMoreBtn');
        if (oldMore) oldMore.closest('div').outerHTML = moreBtn;
        else if (moreBtn) area.insertAdjacentHTML('beforeend', moreBtn);
    } else {
        area.innerHTML = '<div class="table-scroll"><table class="users-table"><thead><tr><th>#</th><th>Full Name / Email</th><th>Academy ID</th><th>Type</th><th>Status</th><th>Registered</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + moreBtn;
    }

    bindRows();
}

function bindRows() {
    const area = $('tableArea');
    if (!area) return;

    area.querySelectorAll('tr[data-id]').forEach(tr => {
        tr.addEventListener('click', (e) => {
            if (e.target.closest('.view-btn')) return;
            const u = allUsers.find(x => x.id === tr.dataset.id);
            if (u) openDetail(u);
        });
    });

    area.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const u = allUsers.find(x => x.id === btn.dataset.id);
            if (u) openDetail(u);
        });
    });

    const lm = $('loadMoreBtn');
    if (lm) lm.addEventListener('click', () => { visibleCount += PAGE_SIZE; renderTable(true); });
}

function updateStats() {
    if ($('statTotal')) $('statTotal').textContent = allUsers.length;
    if ($('statPending')) $('statPending').textContent = allUsers.filter(u => (u.status || '').toLowerCase() === 'pending').length;
    if ($('statActive')) $('statActive').textContent = allUsers.filter(u => (u.status || '').toLowerCase() === 'active').length;
    if ($('statStudents')) $('statStudents').textContent = allUsers.filter(u => (u.account_type || '').toLowerCase() === 'student').length;
}

async function loadUsers() {
    const area = $('tableArea');
    if (area) area.innerHTML = '<div class="loader"><div class="spinner"></div><p>Loading users...</p></div>';

    let from = 0;
    let collected = [];
    let hasError = null;

    while (true) {
        const { data, error } = await supabase.from(TABLE).select('*').range(from, from + 999);
        if (error) { hasError = error; break; }
        collected = collected.concat(data || []);
        if (!data || data.length < 1000) break;
        from += 1000;
    }

    if (hasError) {
        toast('Failed to load users: ' + hasError.message, 'error');
        if (area) {
            area.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><h3>Error Loading Users</h3><p>' + esc(hasError.message) + '</p></div>';
        }
        return;
    }

    rawRows = {};
    allUsers = collected.map(row => {
        rawRows[row.id] = row;
        const ud = (row.user_data && typeof row.user_data === 'object' && !Array.isArray(row.user_data)) ? row.user_data : {};
        return Object.assign({}, ud, { id: row.id });
    });

    allUsers.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    updateStats();
    renderTable(false);
    toast('Loaded ' + allUsers.length + ' users.', 'success');
}

function renderDetail(u, editable) {
    if ($('dAvatar')) $('dAvatar').textContent = initials(u.full_name);
    if ($('dName')) $('dName').textContent = u.full_name || 'N/A';
    if ($('dEmail')) $('dEmail').textContent = u.email || '';

    const grid = $('detailGrid');
    if (!grid) return;
    grid.innerHTML = '';

    FIELDS.forEach(f => {
        if (SKIP_KEYS.includes(f.key)) return;

        const raw = u[f.key];
        let display = raw;

        if (DATE_KEYS.includes(f.key)) display = fmtDate(raw);
        if (f.key === 'certificate_issued') display = raw ? 'Yes' : 'No';
        if (raw !== null && typeof raw === 'object') display = JSON.stringify(raw);

        const field = document.createElement('div');
        field.className = 'field' + (f.full ? ' full' : '') + (editable && !f.readonly ? ' editing' : '');

        const label = document.createElement('label');
        label.textContent = f.label;
        field.appendChild(label);

        if (editable && !f.readonly) {
            const input = document.createElement('input');
            input.value = display == null ? '' : String(display);
            input.dataset.key = f.key;
            field.appendChild(input);
        } else {
            const val = document.createElement('div');
            val.className = 'val';
            val.textContent = display == null || display === '' ? 'N/A' : display;
            field.appendChild(val);
        }

        grid.appendChild(field);
    });

    const actions = $('detailActions');
    if (actions) {
        actions.innerHTML = editable
            ? '<button class="btn-act save" id="saveBtn"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button><button class="btn-act cancel" id="cancelEdit"><i class="fa-solid fa-xmark"></i> Cancel</button>'
            : '<button class="btn-act edit" id="editBtn"><i class="fa-solid fa-pen-to-square"></i> Edit</button><button class="btn-act delete" id="deleteBtn"><i class="fa-solid fa-trash-can"></i> Delete</button>';
    }

    if (editable) {
        if ($('saveBtn')) $('saveBtn').addEventListener('click', saveEdits);
        if ($('cancelEdit')) $('cancelEdit').addEventListener('click', () => { editing = false; renderDetail(currentUser, false); });
    } else {
        if ($('editBtn')) $('editBtn').addEventListener('click', () => { editing = true; renderDetail(currentUser, true); });
        if ($('deleteBtn')) $('deleteBtn').addEventListener('click', () => {
            if ($('confirmName')) $('confirmName').textContent = (currentUser.full_name || currentUser.email || 'this user');
            if ($('confirmOverlay')) $('confirmOverlay').classList.add('show');
        });
    }
}

function openDetail(u) {
    currentUser = u;
    editing = false;
    renderDetail(u, false);
    if ($('detailOverlay')) $('detailOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeDetail() {
    if ($('detailOverlay')) $('detailOverlay').classList.remove('show');
    if ($('confirmOverlay')) $('confirmOverlay').classList.remove('show');
    currentUser = null;
    editing = false;
    document.body.style.overflow = '';
}

async function saveEdits() {
    if (!currentUser) return;

    const updates = {};
    document.querySelectorAll('#detailGrid input[data-key]').forEach(inp => {
        let v = inp.value;
        const key = inp.dataset.key;
        const orig = currentUser[key];

        if (NUMERIC_KEYS.includes(key)) {
            const n = Number(v);
            if (!isNaN(n) && v.trim() !== '') v = n;
        }

        if (key === 'certificate_issued') {
            v = v.trim().toLowerCase() === 'yes' || v.trim().toLowerCase() === 'true';
        }

        if (String(orig) !== String(v)) updates[key] = v;
    });

    if (!Object.keys(updates).length) {
        toast('No changes to save.', 'info');
        editing = false;
        renderDetail(currentUser, false);
        return;
    }

    const btn = $('saveBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    }

    const raw = rawRows[currentUser.id];
    const originalData = (raw && raw.user_data && typeof raw.user_data === 'object') ? raw.user_data : {};
    const newData = Object.assign({}, originalData, updates);
    newData.referral_activity = originalData.referral_activity || [];

    const { data, error } = await supabase.from(TABLE).update({ user_data: newData }).eq('id', currentUser.id).select();

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
    }

    if (error) {
        toast('Update Error: ' + error.message, 'error');
        return;
    }

    if (!data || data.length === 0) {
        toast('Supabase Error: Record was not updated. Check RLS Policies or User ID.', 'error');
        return;
    }

    raw.user_data = newData;
    Object.assign(currentUser, updates);

    const idx = allUsers.findIndex(u => u.id === currentUser.id);
    if (idx > -1) allUsers[idx] = Object.assign({}, newData, { id: currentUser.id });

    editing = false;
    renderDetail(currentUser, false);
    updateStats();
    renderTable(false);
    toast('User updated successfully!', 'success');
}

async function deleteUser() {
    if (!currentUser) return;

    const u = currentUser;
    const btn = $('confirmDeleteBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
    }

    let authDeleted = false;
    try {
        const res = await fetch(ADMIN_DELETE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: u.id })
        });
        authDeleted = res.ok;
    } catch (e) {
        authDeleted = false;
    }

    const { error: profErr } = await supabase.from(TABLE).delete().eq('id', u.id);

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete';
    }

    if (profErr) {
        toast('Delete failed: ' + profErr.message, 'error');
        return;
    }

    delete rawRows[u.id];
    allUsers = allUsers.filter(x => x.id !== u.id);

    closeDetail();
    updateStats();
    renderTable(false);

    if (authDeleted) {
        toast('User fully deleted from Supabase.', 'success');
    } else {
        toast('Profile deleted. Auth account removal needs the service-role endpoint.', 'info');
    }
}

function showPanel() {
    if ($('pageGate')) $('pageGate').classList.add('hidden');
    if ($('adminPanel')) $('adminPanel').classList.remove('hidden');
    loadUsers();
}

function hidePanel() {
    if ($('adminPanel')) $('adminPanel').classList.add('hidden');
    if ($('pageGate')) $('pageGate').classList.remove('hidden');
}

async function processAuthAndCEO() {
    const emailEl = $('adminEmailInput');
    const passEl = $('adminPasswordInput');
    const ceoEl = $('ceoPassInput');
    const errEl = $('loginError');

    const email = emailEl ? emailEl.value.trim() : '';
    const password = passEl ? passEl.value.trim() : '';
    const ceoPass = ceoEl ? ceoEl.value.trim() : '';

    if (errEl) errEl.classList.remove('show');

    if (!email || !password || !ceoPass) {
        if (errEl) {
            errEl.textContent = 'Da fatan za ka cike Email, Password da CEO Password.';
            errEl.classList.add('show');
        }
        return;
    }

    if (!ceoUnlock(ceoPass)) {
        if (errEl) {
            errEl.textContent = 'CEO Password din ba daidai bane!';
            errEl.classList.add('show');
        }
        return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        if (errEl) {
            errEl.textContent = 'Supabase Login Failed: ' + error.message;
            errEl.classList.add('show');
        }
        return;
    }

    if (emailEl) emailEl.value = '';
    if (passEl) passEl.value = '';
    if (ceoEl) ceoEl.value = '';

    showPanel();
    toast('Login Successful. Welcome!', 'success');
}

if ($('loginBtn')) $('loginBtn').addEventListener('click', processAuthAndCEO);

if ($('ceoPassBtn')) $('ceoPassBtn').addEventListener('click', processAuthAndCEO);

['adminEmailInput', 'adminPasswordInput', 'ceoPassInput'].forEach(id => {
    const el = $(id);
    if (el) {
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') processAuthAndCEO();
        });
    }
});

if ($('closeDetail')) $('closeDetail').addEventListener('click', closeDetail);

if ($('detailOverlay')) {
    $('detailOverlay').addEventListener('click', (e) => {
        if (e.target === $('detailOverlay')) closeDetail();
    });
}

if ($('cancelDelete')) $('cancelDelete').addEventListener('click', () => {
    if ($('confirmOverlay')) $('confirmOverlay').classList.remove('show');
});

if ($('confirmDeleteBtn')) $('confirmDeleteBtn').addEventListener('click', deleteUser);

if ($('confirmOverlay')) {
    $('confirmOverlay').addEventListener('click', (e) => {
        if (e.target === $('confirmOverlay')) $('confirmOverlay').classList.remove('show');
    });
}

if ($('refreshBtn')) $('refreshBtn').addEventListener('click', () => { loadUsers(); });

if ($('searchInput')) $('searchInput').addEventListener('input', () => renderTable(false));

if ($('lockBtn')) {
    $('lockBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        location.reload();
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if ($('confirmOverlay') && $('confirmOverlay').classList.contains('show')) {
            $('confirmOverlay').classList.remove('show');
        } else if ($('detailOverlay') && $('detailOverlay').classList.contains('show')) {
            closeDetail();
        }
    }
});

(async function init() {
    await supabase.auth.signOut();
    hidePanel();
})();

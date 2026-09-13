import { supabase } from './supabase.js';

const JAMB_TABLE_ID = 'jamb_topics';
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const el = {
  loading: $('#loadingScreen'),
  loginPage: $('#loginPage'),
  loginForm: $('#loginForm'),
  loginEmail: $('#loginEmail'),
  loginPassword: $('#loginPassword'),
  togglePass: $('#togglePass'),
  loginBtn: $('#loginBtn'),
  loginError: $('#loginError'),
  dashboard: $('#dashboard'),
  userDisplay: $('#userDisplay'),
  logoutBtn: $('#logoutBtn'),
  totalJambStudents: $('#totalJambStudents'),
  totalActiveStudents: $('#totalActiveStudents'),
  totalTopics: $('#totalTopics'),
  topicForm: $('#topicForm'),
  videoLink: $('#videoLink'),
  topicTitle: $('#topicTitle'),
  topicFinal: $('#topicFinal'),
  submitTopicBtn: $('#submitTopicBtn'),
  resetFormBtn: $('#resetFormBtn'),
  topicsBody: $('#topicsBody'),
  emptyState: $('#emptyState'),
  topicCountLabel: $('#topicCountLabel'),
  editModal: $('#editModal'),
  editModalClose: $('#editModalClose'),
  editTopicId: $('#editTopicId'),
  editTopicNumber: $('#editTopicNumber'),
  editVideoLink: $('#editVideoLink'),
  editTopicTitle: $('#editTopicTitle'),
  editTopicFinal: $('#editTopicFinal'),
  editCancelBtn: $('#editCancelBtn'),
  editSaveBtn: $('#editSaveBtn'),
  editDeleteBtn: $('#editDeleteBtn'),
  toastContainer: $('#toastContainer')
};

let currentUser = null;
let topics = [];
let quillEditor = null;
let quillEditorEdit = null;
let editDeletePendingId = null;

function getErrorMessage(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  if (err.error_description) return err.error_description;
  if (err.details) return err.details;
  if (err.hint) return err.hint;
  try { return JSON.stringify(err); } catch (e) { return 'Unknown error'; }
}

function normalizeTopics(raw) {
  let arr = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === 'object' && Array.isArray(raw.topics)) {
    arr = raw.topics;
  }
  return arr
    .filter((t) => t && typeof t === 'object' && t.id)
    .map((t) => ({
      id: String(t.id),
      number: Number(t.number) || 0,
      title: t.title || '',
      video_link: t.video_link || '',
      text: t.text || '',
      final: t.final === 'yes' ? 'yes' : 'no',
      created_at: t.created_at || null,
      updated_at: t.updated_at || null
    }));
}

function renumberTopics(arr) {
  const sorted = [...arr].sort((a, b) => (a.number || 0) - (b.number || 0));
  return sorted.map((t, idx) => ({ ...t, number: idx + 1 }));
}

function initQuill() {
  if ($('#topicEditor')) {
    quillEditor = new Quill('#topicEditor', {
      theme: 'snow',
      placeholder: 'Write the topic content in detail...',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          [{ align: [] }],
          ['link'],
          ['clean']
        ]
      }
    });
  }

  if ($('#editEditor')) {
    quillEditorEdit = new Quill('#editEditor', {
      theme: 'snow',
      placeholder: 'Write the topic content in detail...',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          [{ align: [] }],
          ['link'],
          ['clean']
        ]
      }
    });
  }
}

function showLoading(show) {
  if (!el.loading) return;
  if (show) {
    el.loading.classList.remove('fade-out');
    el.loading.style.display = 'flex';
  } else {
    el.loading.classList.add('fade-out');
    setTimeout(() => {
      el.loading.style.display = 'none';
    }, 500);
  }
}

function showToast(message, type = 'success', duration = 4000) {
  if (!el.toastContainer) return;
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-circle-exclamation',
    warning: 'fas fa-triangle-exclamation'
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon"><i class="${icons[type] || icons.success}"></i></span>
    <span class="toast-text"></span>
    <button class="toast-close"><i class="fas fa-xmark"></i></button>
  `;
  toast.querySelector('.toast-text').textContent = message;
  el.toastContainer.appendChild(toast);
  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => removeToast(toast));
  }
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
  if (!toast || toast.classList.contains('removing')) return;
  toast.classList.add('removing');
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

function getFormData() {
  const title = el.topicTitle ? el.topicTitle.value.trim() : '';
  const video = el.videoLink ? el.videoLink.value.trim() : '';
  const text = quillEditor ? quillEditor.root.innerHTML : '';
  const final = el.topicFinal ? el.topicFinal.value : 'no';
  const plainText = quillEditor ? quillEditor.getText().trim() : '';
  return { title, video, text, final, plainText };
}

function validateFormData(data) {
  if (!data.title) {
    showToast('Topic title is required.', 'error');
    return false;
  }
  if (!data.video) {
    showToast('Video link is required.', 'error');
    return false;
  }
  if (!data.plainText || data.plainText.length < 3) {
    showToast('Topic content cannot be empty.', 'error');
    return false;
  }
  return true;
}

function setFormLoading(loading) {
  if (!el.submitTopicBtn) return;
  if (loading) {
    el.submitTopicBtn.classList.add('loading');
    el.submitTopicBtn.innerHTML = '<span class="spinner-sm"></span>Saving...';
    el.submitTopicBtn.disabled = true;
  } else {
    el.submitTopicBtn.classList.remove('loading');
    el.submitTopicBtn.innerHTML = '<i class="fas fa-floppy-disk"></i>Save Topic';
    el.submitTopicBtn.disabled = false;
  }
}

function resetForm() {
  if (el.topicTitle) el.topicTitle.value = '';
  if (el.videoLink) el.videoLink.value = '';
  if (el.topicFinal) el.topicFinal.value = 'no';
  if (quillEditor) quillEditor.setText('');
}

async function fetchTopics() {
  try {
    const { data, error } = await supabase
      .from('jamb')
      .select('jamb_topic')
      .eq('id', JAMB_TABLE_ID)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      const { error: insertError } = await supabase
        .from('jamb')
        .insert({ id: JAMB_TABLE_ID, jamb_topic: [] });
      if (insertError) throw insertError;
      topics = [];
    } else {
      topics = normalizeTopics(data.jamb_topic);
    }

    renderTopics();
    if (el.totalTopics) el.totalTopics.textContent = topics.length;
    return topics;
  } catch (err) {
    console.error('fetchTopics error:', err);
    showToast('Failed to load topics: ' + getErrorMessage(err), 'error');
    topics = [];
    renderTopics();
    return [];
  }
}

async function saveTopicsToDB(topicsArray) {
  try {
    const clean = renumberTopics(normalizeTopics(topicsArray));

    const { data: existing, error: checkError } = await supabase
      .from('jamb')
      .select('id')
      .eq('id', JAMB_TABLE_ID)
      .maybeSingle();

    if (checkError) throw checkError;

    let error;
    if (!existing) {
      const res = await supabase
        .from('jamb')
        .insert({ id: JAMB_TABLE_ID, jamb_topic: clean });
      error = res.error;
    } else {
      const res = await supabase
        .from('jamb')
        .update({ jamb_topic: clean })
        .eq('id', JAMB_TABLE_ID);
      error = res.error;
    }

    if (error) throw error;

    topics = clean;
    renderTopics();
    if (el.totalTopics) el.totalTopics.textContent = topics.length;
    return true;
  } catch (err) {
    console.error('saveTopicsToDB error:', err);
    showToast('Failed to save: ' + getErrorMessage(err), 'error');
    return false;
  }
}

function renderTopics() {
  if (!el.topicsBody) return;
  el.topicsBody.innerHTML = '';

  if (!topics || topics.length === 0) {
    if (el.emptyState) el.emptyState.style.display = 'block';
    if (el.topicCountLabel) el.topicCountLabel.textContent = '0 topics';
    return;
  }

  if (el.emptyState) el.emptyState.style.display = 'none';
  if (el.topicCountLabel) {
    el.topicCountLabel.textContent = `${topics.length} topic${topics.length > 1 ? 's' : ''}`;
  }

  const sorted = [...topics].sort((a, b) => (a.number || 0) - (b.number || 0));

  sorted.forEach((topic) => {
    const tr = document.createElement('tr');

    const finalBadge =
      topic.final === 'yes'
        ? '<span class="badge badge-yes"><i class="fas fa-check"></i>Yes</span>'
        : '<span class="badge badge-no"><i class="fas fa-times"></i>No</span>';

    const videoCell = document.createElement('td');
    videoCell.className = 'video-link-cell';
    if (topic.video_link) {
      const a = document.createElement('a');
      a.href = topic.video_link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = '<i class="fas fa-video" style="margin-right:4px"></i>Watch';
      videoCell.appendChild(a);
    } else {
      videoCell.innerHTML = '<span style="color:var(--muted)">—</span>';
    }

    const numCell = document.createElement('td');
    numCell.style.textAlign = 'center';
    const numSpan = document.createElement('span');
    numSpan.className = 'topic-num';
    numSpan.textContent = topic.number || 0;
    numCell.appendChild(numSpan);

    const titleCell = document.createElement('td');
    titleCell.className = 'topic-title-cell';
    titleCell.textContent = topic.title || '';
    titleCell.title = topic.title || '';

    const textCell = document.createElement('td');
    textCell.className = 'topic-text-cell';
    const cleanText = topic.text ? topic.text.replace(/<[^>]+>/g, '') : '';
    textCell.textContent = cleanText ? cleanText.substring(0, 80) + (cleanText.length > 80 ? '...' : '') : '—';

    const finalCell = document.createElement('td');
    finalCell.style.textAlign = 'center';
    finalCell.innerHTML = finalBadge;

    const actionCell = document.createElement('td');
    actionCell.style.textAlign = 'center';
    const actionDiv = document.createElement('div');
    actionDiv.className = 'action-btns';
    actionDiv.style.justifyContent = 'center';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.title = 'Edit topic';
    editBtn.innerHTML = '<i class="fas fa-pencil"></i>';
    editBtn.addEventListener('click', () => openEditModal(topic.id));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-del';
    delBtn.title = 'Delete topic';
    delBtn.innerHTML = '<i class="fas fa-trash-can"></i>';
    delBtn.addEventListener('click', () => deleteTopic(topic.id));

    actionDiv.appendChild(editBtn);
    actionDiv.appendChild(delBtn);
    actionCell.appendChild(actionDiv);

    tr.appendChild(numCell);
    tr.appendChild(videoCell);
    tr.appendChild(titleCell);
    tr.appendChild(textCell);
    tr.appendChild(finalCell);
    tr.appendChild(actionCell);

    el.topicsBody.appendChild(tr);
  });
}

function generateId() {
  return 'topic_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
}

async function addTopic(e) {
  e.preventDefault();
  const data = getFormData();
  if (!validateFormData(data)) return;

  setFormLoading(true);

  try {
    const sorted = [...topics].sort((a, b) => (a.number || 0) - (b.number || 0));
    const nextNum = sorted.length > 0 ? (sorted[sorted.length - 1].number || sorted.length) + 1 : 1;

    const newTopic = {
      id: generateId(),
      number: nextNum,
      title: data.title,
      video_link: data.video,
      text: data.text,
      final: data.final,
      created_at: new Date().toISOString(),
      updated_at: null
    };

    const updated = renumberTopics([...topics, newTopic]);
    const saved = await saveTopicsToDB(updated);
    if (saved) {
      showToast('Topic added successfully!', 'success');
      resetForm();
    }
  } catch (err) {
    showToast('Error adding topic: ' + getErrorMessage(err), 'error');
  } finally {
    setFormLoading(false);
  }
}

async function deleteTopic(topicId) {
  if (!topicId) return;
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) {
    showToast('Topic not found.', 'error');
    return;
  }

  if (!confirm(`Delete topic "${topic.title}"? This cannot be undone.`)) return;

  try {
    const updated = renumberTopics(topics.filter((t) => t.id !== topicId));

    const saved = await saveTopicsToDB(updated);
    if (saved) {
      showToast('Topic deleted successfully.', 'success');
      if (editDeletePendingId === topicId) {
        closeEditModal();
      }
    }
  } catch (err) {
    showToast('Error deleting topic: ' + getErrorMessage(err), 'error');
  }
}

function openEditModal(topicId) {
  const topic = topics.find((t) => t.id === topicId);
  if (!topic || !el.editModal) {
    showToast('Topic not found.', 'error');
    return;
  }

  editDeletePendingId = topicId;
  if (el.editTopicId) el.editTopicId.value = topic.id;
  if (el.editTopicNumber) el.editTopicNumber.value = topic.number || 0;
  if (el.editVideoLink) el.editVideoLink.value = topic.video_link || '';
  if (el.editTopicTitle) el.editTopicTitle.value = topic.title || '';
  if (el.editTopicFinal) el.editTopicFinal.value = topic.final || 'no';

  if (quillEditorEdit) {
    quillEditorEdit.setText('');
    if (topic.text) {
      quillEditorEdit.root.innerHTML = topic.text;
    }
  }

  el.editModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  if (el.editModal) el.editModal.classList.remove('active');
  document.body.style.overflow = '';
  editDeletePendingId = null;
}

async function saveEdit() {
  const id = el.editTopicId ? el.editTopicId.value : '';
  const title = el.editTopicTitle ? el.editTopicTitle.value.trim() : '';
  const video = el.editVideoLink ? el.editVideoLink.value.trim() : '';
  const text = quillEditorEdit ? quillEditorEdit.root.innerHTML : '';
  const plainText = quillEditorEdit ? quillEditorEdit.getText().trim() : '';
  const final = el.editTopicFinal ? el.editTopicFinal.value : 'no';

  if (!title) {
    showToast('Topic title is required.', 'error');
    return;
  }
  if (!video) {
    showToast('Video link is required.', 'error');
    return;
  }
  if (!plainText || plainText.length < 3) {
    showToast('Topic content cannot be empty.', 'error');
    return;
  }

  if (el.editSaveBtn) {
    el.editSaveBtn.classList.add('loading');
    el.editSaveBtn.innerHTML = '<span class="spinner-sm"></span>Saving...';
    el.editSaveBtn.disabled = true;
  }

  try {
    const updated = topics.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          title,
          video_link: video,
          text,
          final,
          updated_at: new Date().toISOString()
        };
      }
      return t;
    });

    const saved = await saveTopicsToDB(updated);
    if (saved) {
      showToast('Topic updated successfully!', 'success');
      closeEditModal();
    }
  } catch (err) {
    showToast('Error updating topic: ' + getErrorMessage(err), 'error');
  } finally {
    if (el.editSaveBtn) {
      el.editSaveBtn.classList.remove('loading');
      el.editSaveBtn.innerHTML = '<i class="fas fa-save"></i>Update Topic';
      el.editSaveBtn.disabled = false;
    }
  }
}

async function deleteFromEdit() {
  const id = el.editTopicId ? el.editTopicId.value : '';
  if (!id) return;

  const topic = topics.find((t) => t.id === id);
  if (!topic) {
    showToast('Topic not found.', 'error');
    return;
  }

  if (!confirm(`Delete topic "${topic.title}"? This cannot be undone.`)) return;

  try {
    const updated = renumberTopics(topics.filter((t) => t.id !== id));

    const saved = await saveTopicsToDB(updated);
    if (saved) {
      showToast('Topic deleted successfully.', 'success');
      closeEditModal();
    }
  } catch (err) {
    showToast('Error deleting topic: ' + getErrorMessage(err), 'error');
  }
}

async function fetchStudentStats() {
  try {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('user_data');

    if (error) throw error;

    let totalJamb = 0;
    let activeJamb = 0;

    if (users && Array.isArray(users)) {
      users.forEach((row) => {
        const ud = row.user_data || {};
        if (ud.course_name === 'JAMB' || ud.course_id === 'JAMB' || ud.jamb === 'yes' || ud.jamb === true) {
          totalJamb++;
          if (ud.status === 'active' || ud.status === 'Active' || !ud.status) {
            activeJamb++;
          }
        }
      });
    }

    if (el.totalJambStudents) el.totalJambStudents.textContent = totalJamb;
    if (el.totalActiveStudents) el.totalActiveStudents.textContent = activeJamb;
  } catch (err) {
    console.error('fetchStudentStats error:', err);
    if (el.totalJambStudents) el.totalJambStudents.textContent = 0;
    if (el.totalActiveStudents) el.totalActiveStudents.textContent = 0;
  }
}

async function initApp() {
  showLoading(true);
  initQuill();

  const { data: { session } } = await supabase.auth.getSession();

  if (session && session.user) {
    currentUser = session.user;
    showDashboard();
  } else {
    showLogin();
  }
  showLoading(false);
}

function showLogin() {
  if (el.loginPage) el.loginPage.classList.remove('hidden');
  if (el.dashboard) el.dashboard.classList.add('hidden');
}

function showDashboard() {
  if (el.loginPage) el.loginPage.classList.add('hidden');
  if (el.dashboard) el.dashboard.classList.remove('hidden');
  if (el.userDisplay && currentUser) {
    el.userDisplay.textContent = currentUser.email || 'admin@idtacademy.com';
  }
  fetchTopics();
  fetchStudentStats();
  startRealtime();
}

function startRealtime() {
  supabase
    .channel('jamb_topic_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jamb', filter: `id=eq.${JAMB_TABLE_ID}` },
      () => {
        fetchTopics();
      }
    )
    .subscribe();
}

if (el.loginForm) {
  el.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el.loginEmail ? el.loginEmail.value.trim() : '';
    const password = el.loginPassword ? el.loginPassword.value : '';

    if (!email) {
      showToast('Email is required.', 'error');
      return;
    }
    if (!password) {
      showToast('Password is required.', 'error');
      return;
    }

    if (el.loginBtn) {
      el.loginBtn.classList.add('loading');
      el.loginBtn.innerHTML = '<span class="spinner-sm"></span>Signing in...';
      el.loginBtn.disabled = true;
    }
    if (el.loginError) {
      el.loginError.classList.remove('show');
      el.loginError.textContent = '';
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      showDashboard();
      showToast('Welcome back!', 'success');
    } catch (err) {
      if (el.loginError) {
        el.loginError.textContent = getErrorMessage(err) || 'Invalid email or password.';
        el.loginError.classList.add('show');
      }
    } finally {
      if (el.loginBtn) {
        el.loginBtn.classList.remove('loading');
        el.loginBtn.innerHTML = '<i class="fas fa-arrow-right-to-bracket" style="margin-right:8px"></i>Submit';
        el.loginBtn.disabled = false;
      }
    }
  });
}

if (el.logoutBtn) {
  el.logoutBtn.addEventListener('click', async () => {
    try {
      await supabase.auth.signOut();
      currentUser = null;
      topics = [];
      renderTopics();
      showLogin();
      showToast('Logged out successfully.', 'success');
    } catch (err) {
      showToast('Error logging out: ' + getErrorMessage(err), 'error');
    }
  });
}

if (el.togglePass && el.loginPassword) {
  el.togglePass.addEventListener('click', () => {
    const input = el.loginPassword;
    const icon = el.togglePass.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      if (icon) icon.className = 'fas fa-eye-slash';
    } else {
      input.type = 'password';
      if (icon) icon.className = 'fas fa-eye';
    }
  });
}

if (el.topicForm) el.topicForm.addEventListener('submit', addTopic);
if (el.resetFormBtn) el.resetFormBtn.addEventListener('click', () => resetForm());
if (el.editModalClose) el.editModalClose.addEventListener('click', closeEditModal);
if (el.editCancelBtn) el.editCancelBtn.addEventListener('click', closeEditModal);

if (el.editModal) {
  el.editModal.addEventListener('click', (e) => {
    if (e.target === el.editModal) closeEditModal();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeEditModal();
});

if (el.editSaveBtn) el.editSaveBtn.addEventListener('click', saveEdit);
if (el.editDeleteBtn) el.editDeleteBtn.addEventListener('click', deleteFromEdit);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

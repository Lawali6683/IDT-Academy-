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
    <span class="toast-text">${message}</span>
    <button class="toast-close"><i class="fas fa-xmark"></i></button>
  `;
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
      .select('*')
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
      topics = data.jamb_topic || [];
    }

    renderTopics();
    if (el.totalTopics) el.totalTopics.textContent = topics.length;
    return topics;
  } catch (err) {
    showToast('Failed to load topics: ' + err.message, 'error');
    return [];
  }
}

async function saveTopicsToDB(topicsArray) {
  try {
    const { error } = await supabase
      .from('jamb')
      .upsert({ id: JAMB_TABLE_ID, jamb_topic: topicsArray }, { onConflict: 'id' });

    if (error) throw error;
    topics = [...topicsArray];
    renderTopics();
    if (el.totalTopics) el.totalTopics.textContent = topics.length;
    return true;
  } catch (err) {
    showToast('Failed to save: ' + err.message, 'error');
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

    const videoHtml = topic.video_link
      ? `<a href="${topic.video_link}" target="_blank" rel="noopener"><i class="fas fa-video" style="margin-right:4px"></i>Watch</a>`
      : '<span style="color:var(--muted)">—</span>';

    const cleanText = topic.text ? topic.text.replace(/<[^>]+>/g, '') : '';
    const textPreview = cleanText.substring(0, 80) + (cleanText.length > 80 ? '...' : '');

    tr.innerHTML = `
      <td style="text-align:center"><span class="topic-num">${topic.number || 0}</span></td>
      <td class="video-link-cell">${videoHtml}</td>
      <td class="topic-title-cell" title="${(topic.title || '').replace(/"/g, '&quot;')}">${topic.title || ''}</td>
      <td class="topic-text-cell">${textPreview || '—'}</td>
      <td style="text-align:center">${finalBadge}</td>
      <td style="text-align:center">
        <div class="action-btns" style="justify-content:center">
          <button class="btn-edit" data-topic-id="${topic.id}" title="Edit topic"><i class="fas fa-pencil"></i></button>
          <button class="btn-del" data-topic-id="${topic.id}" title="Delete topic"><i class="fas fa-trash-can"></i></button>
        </div>
      </td>
    `;
    el.topicsBody.appendChild(tr);
  });

  $$('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.topicId));
  });

  $$('.btn-del').forEach((btn) => {
    btn.addEventListener('click', () => deleteTopic(btn.dataset.topicId));
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
    const maxNum = topics.length > 0 ? Math.max(...topics.map((t) => t.number || 0)) : 0;
    const newTopic = {
      id: generateId(),
      number: maxNum + 1,
      title: data.title,
      video_link: data.video,
      text: data.text,
      final: data.final,
      created_at: new Date().toISOString()
    };

    const updated = [...topics, newTopic];
    const saved = await saveTopicsToDB(updated);
    if (saved) {
      showToast('Topic added successfully!', 'success');
      resetForm();
    }
  } catch (err) {
    showToast('Error adding topic: ' + err.message, 'error');
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
    let updated = topics.filter((t) => t.id !== topicId);
    updated = updated.map((t, idx) => ({ ...t, number: idx + 1 }));

    const saved = await saveTopicsToDB(updated);
    if (saved) {
      showToast('Topic deleted successfully.', 'success');
      if (editDeletePendingId === topicId) {
        closeEditModal();
      }
    }
  } catch (err) {
    showToast('Error deleting topic: ' + err.message, 'error');
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
  const num = el.editTopicNumber ? parseInt(el.editTopicNumber.value, 10) || 0 : 0;
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
          number: num,
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
    showToast('Error updating topic: ' + err.message, 'error');
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
    let updated = topics.filter((t) => t.id !== id);
    updated = updated.map((t, idx) => ({ ...t, number: idx + 1 }));

    const saved = await saveTopicsToDB(updated);
    if (saved) {
      showToast('Topic deleted successfully.', 'success');
      closeEditModal();
    }
  } catch (err) {
    showToast('Error deleting topic: ' + err.message, 'error');
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
        el.loginError.textContent = err.message || 'Invalid email or password.';
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
      showToast('Error logging out.', 'error');
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

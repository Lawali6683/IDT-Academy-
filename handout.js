import { supabase } from './supabase.js';

const LOGO_URL = 'https://i.imgur.com/oyqM5oF.png';
const PLACEHOLDER_IMG = 'https://i.imgur.com/oyqM5oF.png';

let currentUser = null;
let currentUserData = null;
let myCourses = [];
let activeCourseId = '';
let currentTopics = [];
let currentTopicIdx = 0;
let currentCourseMeta = null;

const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(type, title, msg) {
  const wrap = $('toastWrap');
  if (!wrap) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><div><b>' + escapeHtml(title) + '</b><span>' + escapeHtml(msg) + '</span></div>';
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity .3s ease';
    setTimeout(() => t.remove(), 320);
  }, 4200);
}

function hideLoader() {
  const l = $('loaderScreen');
  if (l) l.classList.add('gone');
}

function getUserUuid() {
  try {
    const raw = localStorage.getItem('idt_user');
    if (!raw) return '';
    const u = JSON.parse(raw);
    return String(u.id || u.user_id || u.uuid || u || '').trim();
  } catch (e) {
    return '';
  }
}

async function loadUser() {
  const uuid = getUserUuid();
  if (!uuid) {
    window.location.href = 'register.html';
    return false;
  }
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_data')
    .eq('id', uuid)
    .single();
  if (error || !data) {
    window.location.href = 'register.html';
    return false;
  }
  const ud = data.user_data || {};
  const status = String(ud.status || '').toLowerCase();
  if (status !== 'active') {
    window.location.href = 'register.html';
    return false;
  }
  currentUser = uuid;
  currentUserData = ud;
  return true;
}

function collectCourses() {
  const ud = currentUserData || {};
  const list = [];
  if (ud.course_id) {
    list.push({
      id: String(ud.course_id),
      name: String(ud.course_name || 'Selected Course'),
      number: String(ud.course_number || ''),
      price: Number(ud.course_price || 0)
    });
  }
  for (let i = 2; i <= 40; i++) {
    const cid = ud[i + 'course_id'];
    if (cid) {
      list.push({
        id: String(cid),
        name: String(ud[i + 'course_name'] || 'Selected Course'),
        number: String(ud[i + 'course_number'] || ''),
        price: Number(ud[i + 'course_price'] || 0)
      });
    }
  }
  return list;
}

function renderCoursePills() {
  myCourses = collectCourses();
  const pills = $('coursePills');
  const empty = $('emptyState');
  if (!myCourses.length) {
    if (pills) pills.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    hideLoader();
    return;
  }
  if (empty) empty.classList.add('hidden');
  pills.innerHTML = myCourses.map((c, i) => {
    return '<button type="button" class="course-pill" data-i="' + i + '">' +
      '<i class="fa-solid fa-book"></i>' +
      '<span>' + escapeHtml(c.name) +
      '<small>' + (c.number ? '#' + escapeHtml(c.number) + ' &middot; ' : '') + 'Tap to open handout</small>' +
      '</span>' +
    '</button>';
  }).join('');
  pills.querySelectorAll('.course-pill').forEach((b) => {
    b.addEventListener('click', () => {
      const c = myCourses[Number(b.dataset.i)];
      if (c) openCourse(c);
    });
  });
  hideLoader();
}

async function openCourse(course) {
  activeCourseId = course.id;
  currentCourseMeta = course;
  document.querySelectorAll('.course-pill').forEach((p) => p.classList.remove('active'));
  const pill = document.querySelector('.course-pill[data-i="' + myCourses.findIndex((c) => String(c.id) === String(course.id)) + '"]');
  if (pill) pill.classList.add('active');

  showToast('info', 'Loading Handout', 'Please wait while we load the topics for ' + (course.name || 'your course') + '.');

  const { data, error } = await supabase
    .from('all_couse_post')
    .select('all_course')
    .eq('id', course.id)
    .maybeSingle();

  if (error || !data) {
    showToast('error', 'Handout Not Ready', 'No handout was found for this course yet. Please check back later.');
    return;
  }

  let ac = data.all_course || {};
  if (typeof ac === 'string') {
    try { ac = JSON.parse(ac); } catch (e) { ac = {}; }
  }
  const topics = Array.isArray(ac.topics) ? ac.topics.slice() : [];
  if (!topics.length) {
    showToast('error', 'No Topics Yet', 'This course has no topics published yet. Please check back later.');
    return;
  }
  topics.sort((a, b) => Number(a.topic_number || 0) - Number(b.topic_number || 0));
  currentTopics = topics;
  currentTopicIdx = 0;

  $('hzName').textContent = course.name || 'Course Handout';
  $('hzMeta').textContent = (course.number ? 'Course #' + course.number + ' &middot; ' : '') + topics.length + (topics.length === 1 ? ' Topic' : ' Topics');
  $('topicZone').classList.remove('hidden');
  $('actionsZone').classList.remove('hidden');
  renderJumpDots();
  renderTopicPage();
  $('topicZone').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderJumpDots() {
  const j = $('tnJump');
  if (!j) return;
  let html = '';
  currentTopics.forEach((t, i) => {
    html += '<button type="button" class="tn-dot' + (i === currentTopicIdx ? ' active' : '') + '" data-i="' + i + '">' + escapeHtml(String(t.topic_number || i + 1)) + '</button>';
  });
  j.innerHTML = html;
  j.querySelectorAll('.tn-dot').forEach((d) => {
    d.addEventListener('click', () => {
      currentTopicIdx = Number(d.dataset.i);
      renderTopicPage();
    });
  });
}

function renderTopicPage() {
  const t = currentTopics[currentTopicIdx];
  if (!t) return;
  const holder = $('paperHolder');
  const isFinal = t.is_final === true;
  const total = currentTopics.length;
  holder.innerHTML =
    '<div class="paper">' +
      '<div class="paper-wm"><img src="' + LOGO_URL + '" alt=""></div>' +
      '<div class="paper-inner">' +
        '<div class="paper-top">' +
          '<div class="paper-brand"><img src="' + LOGO_URL + '" alt="IDT Academy"><span>IDT Academy</span></div>' +
          '<span class="paper-no"><i class="fa-solid fa-file-lines"></i> Topic ' + escapeHtml(String(t.topic_number || currentTopicIdx + 1)) + '</span>' +
        '</div>' +
        '<h4>' + escapeHtml(t.topic_name || 'Untitled Topic') + '</h4>' +
        '<div class="paper-body">' + escapeHtml(t.topic_text || 'No content for this topic yet.') + '</div>' +
        '<div class="paper-foot">' +
          '<span><i class="fa-solid fa-graduation-cap"></i> IDT Academy Handout</span>' +
          (isFinal ? '<span class="final-tag"><i class="fa-solid fa-flag-checkered"></i> FINAL TOPIC</span>' : '<span>Page ' + (currentTopicIdx + 1) + ' of ' + total + '</span>') +
        '</div>' +
      '</div>' +
    '</div>';

  $('tnCount').textContent = 'Topic ' + (currentTopicIdx + 1) + ' of ' + total;
  $('btnPrev').disabled = currentTopicIdx === 0;
  $('btnNext').disabled = currentTopicIdx >= total - 1;
  renderJumpDots();
}

function paperHTMLForPdf(t, idx) {
  const isFinal = t.is_final === true;
  const total = currentTopics.length;
  return '<div class="paper">' +
    '<div class="paper-wm"><img src="' + LOGO_URL + '" alt=""></div>' +
    '<div class="paper-inner">' +
      '<div class="paper-top">' +
        '<div class="paper-brand"><img src="' + LOGO_URL + '" alt="IDT Academy"><span>IDT Academy</span></div>' +
        '<span class="paper-no"><i class="fa-solid fa-file-lines"></i> Topic ' + escapeHtml(String(t.topic_number || idx + 1)) + '</span>' +
      '</div>' +
      '<h4>' + escapeHtml(t.topic_name || 'Untitled Topic') + '</h4>' +
      '<div class="paper-body">' + escapeHtml(t.topic_text || 'No content for this topic yet.') + '</div>' +
      '<div class="paper-foot">' +
        '<span><i class="fa-solid fa-graduation-cap"></i> IDT Academy Handout</span>' +
        (isFinal ? '<span class="final-tag"><i class="fa-solid fa-flag-checkered"></i> FINAL TOPIC</span>' : '<span>Page ' + (idx + 1) + ' of ' + total + '</span>') +
      '</div>' +
    '</div>' +
  '</div>';
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function wrapText(doc, text, maxWidth) {
  const lines = [];
  String(text || '').split(/\n/).forEach((para) => {
    if (!para.trim()) {
      lines.push('');
      return;
    }
    let line = '';
    para.split(/\s+/).forEach((w) => {
      const test = line ? line + ' ' + w : w;
      if (doc.getTextWidth(test) > maxWidth) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
  });
  return lines;
}

async function generateGeneralPdf() {
  if (!currentTopics.length) {
    showToast('error', 'Nothing To Export', 'Open a course with topics first.');
    return;
  }
  $('pdfActions').classList.add('hidden');
  $('pdfLoading').classList.remove('hidden');

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 54;
    const logo = await loadImage(LOGO_URL);

    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageW, 8, 'F');
    if (logo) {
      try {
        doc.setGState(doc.GState({ opacity: 1 }));
        doc.addImage(logo, 'PNG', pageW / 2 - 70, pageH / 2 - 190, 140, 140);
      } catch (e) {}
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.setTextColor(30, 27, 75);
    doc.text('IDT Academy', pageW / 2, pageH / 2 + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(109, 106, 138);
    doc.text('Course Handout', pageW / 2, pageH / 2 + 40, { align: 'center' });
    if (currentCourseMeta) {
      doc.setFontSize(11);
      doc.text(currentCourseMeta.name || '', pageW / 2, pageH / 2 + 66, { align: 'center', maxWidth: pageW - margin * 2 });
      if (currentCourseMeta.number) {
        doc.text('Course #' + currentCourseMeta.number, pageW / 2, pageH / 2 + 86, { align: 'center' });
      }
    }
    doc.setFontSize(10);
    doc.text('Generated ' + new Date().toLocaleDateString(), pageW / 2, pageH - 60, { align: 'center' });

    const contentW = pageW - margin * 2;
    let firstTopic = true;

    for (let i = 0; i < currentTopics.length; i++) {
      const t = currentTopics[i];
      doc.addPage();
      if (logo) {
        try {
          doc.setGState(doc.GState({ opacity: 0.07 }));
          const wmW = pageW * 0.62;
          doc.addImage(logo, 'PNG', pageW / 2 - wmW / 2, pageH / 2 - wmW / 2, wmW, wmW);
          doc.setGState(doc.GState({ opacity: 1 }));
        } catch (e) {}
      }
      doc.setFillColor(124, 58, 237);
      doc.rect(0, 0, pageW, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(124, 58, 237);
      doc.text('IDT ACADEMY  |  COURSE HANDOUT', margin, 36);
      doc.text('TOPIC ' + String(t.topic_number || i + 1), pageW - margin, 36, { align: 'right' });
      doc.setDrawColor(200, 190, 240);
      doc.line(margin, 44, pageW - margin, 44);

      let y = 84;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(19);
      doc.setTextColor(30, 27, 75);
      const nameLines = wrapText(doc, t.topic_name || 'Untitled Topic', contentW);
      nameLines.forEach((ln) => {
        if (y > pageH - 90) { doc.addPage(); y = 80; }
        doc.text(ln, margin, y);
        y += 26;
      });
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11.5);
      doc.setTextColor(59, 51, 99);
      const bodyLines = wrapText(doc, t.topic_text || 'No content for this topic yet.', contentW);
      bodyLines.forEach((ln) => {
        if (y > pageH - 80) {
          doc.addPage();
          if (logo) {
            try {
              doc.setGState(doc.GState({ opacity: 0.07 }));
              const wmW = pageW * 0.62;
              doc.addImage(logo, 'PNG', pageW / 2 - wmW / 2, pageH / 2 - wmW / 2, wmW, wmW);
              doc.setGState(doc.GState({ opacity: 1 }));
            } catch (e) {}
          }
          y = 80;
        }
        doc.text(ln, margin, y);
        y += 18;
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(150, 145, 175);
      doc.text('IDT Academy Handout  |  Page ' + (i + 1) + ' of ' + currentTopics.length + (t.is_final === true ? '  |  FINAL TOPIC' : ''), pageW / 2, pageH - 34, { align: 'center' });

      if (firstTopic) firstTopic = false;
    }

    const safeName = String(currentCourseMeta ? currentCourseMeta.name : 'course').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    doc.save('idt_handout_' + safeName + '.pdf');
    $('pdfLoading').classList.add('hidden');
    $('pdfActions').classList.remove('hidden');
    showToast('success', 'PDF Ready', 'Your handout PDF has been prepared. Tap Upload PDF to save it to your device.');
  } catch (err) {
    $('pdfLoading').classList.add('hidden');
    $('pdfActions').classList.remove('hidden');
    showToast('error', 'PDF Failed', err.message || 'Could not generate the PDF. Please try again.');
  }
}

function printAll() {
  if (!currentTopics.length) {
    showToast('error', 'Nothing To Print', 'Open a course with topics first.');
    return;
  }
  const holder = document.createElement('div');
  holder.id = 'printAllHolder';
  currentTopics.forEach((t, i) => {
    holder.insertAdjacentHTML('beforeend', paperHTMLForPdf(t, i));
  });
  const old = document.getElementById('printAllHolder');
  if (old) old.remove();
  $('paperHolder').classList.add('hidden');
  $('paperHolder').parentNode.insertBefore(holder, $('paperHolder'));
  const cleanup = () => {
    setTimeout(() => {
      holder.remove();
      $('paperHolder').classList.remove('hidden');
      renderTopicPage();
    }, 400);
  };
  window.onafterprint = cleanup;
  window.print();
}

document.addEventListener('DOMContentLoaded', () => {
  $('btnBack').addEventListener('click', () => {
    window.history.back();
  });
  $('btnPrev').addEventListener('click', () => {
    if (currentTopicIdx > 0) {
      currentTopicIdx--;
      renderTopicPage();
    }
  });
  $('btnNext').addEventListener('click', () => {
    if (currentTopicIdx < currentTopics.length - 1) {
      currentTopicIdx++;
      renderTopicPage();
    }
  });
  $('btnGeneralPdf').addEventListener('click', generateGeneralPdf);
  $('btnUploadPdf').addEventListener('click', () => {
    const link = document.createElement('a');
    const safeName = String(currentCourseMeta ? currentCourseMeta.name : 'course').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    link.download = 'idt_handout_' + safeName + '.pdf';
    document.body.appendChild(link);
    link.remove();
    showToast('info', 'Save Your PDF', 'Tap GENERAL PDF again if the download did not start, then choose Save on your device.');
    generateGeneralPdf();
  });
  $('btnPrint').addEventListener('click', printAll);

  (async () => {
    const ok = await loadUser();
    if (!ok) return;
    renderCoursePills();
  })();
});

window.addEventListener('load', () => {
  document.documentElement.classList.add('ready');
});
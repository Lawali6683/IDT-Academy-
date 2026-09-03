import { supabase } from './supabase.js'

let currentUser = null
let currentAdmin = null
let lastPdfBlob = null

const $ = id => document.getElementById(id)

const showEl = (id, show) => {
  const e = $(id)
  if (!e) return
  if (show) { 
    e.classList.add('active')
    e.style.display = '' 
  } else { 
    e.classList.remove('active')
    e.style.display = 'none' 
  }
}

function showLoading(text) {
  const elText = $('loadingText')
  const elOverlay = $('loadingOverlay')
  if (elText) elText.textContent = text || 'Processing...'
  if (elOverlay) elOverlay.classList.remove('hidden')
}

function hideLoading() {
  const elOverlay = $('loadingOverlay')
  if (elOverlay) elOverlay.classList.add('hidden')
}

function showToast(type, title, msg) {
  const c = $('toastContainer')
  if (!c) return
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation'
  }
  const t = document.createElement('div')
  t.className = `toast ${type}`
  t.innerHTML = `<i class="fa-regular ${icons[type] || icons.info}"></i>
    <div class="toast-body"><b>${title}</b><p>${msg}</p></div>
    <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>`
  
  const closeBtn = t.querySelector('.toast-close')
  if (closeBtn) {
    closeBtn.onclick = () => {
      t.classList.add('out')
      setTimeout(() => t.remove(), 300)
    }
  }
  
  c.appendChild(t)
  setTimeout(() => {
    if (t.parentNode) {
      t.classList.add('out')
      setTimeout(() => t.remove(), 300)
    }
  }, 5000)
}

const togglePassBtn = $('togglePass')
if (togglePassBtn) {
  togglePassBtn.onclick = function () {
    const inp = $('authPass')
    const ico = this.querySelector('i')
    if (!inp || !ico) return
    if (inp.type === 'password') {
      inp.type = 'text'
      ico.className = 'fa-regular fa-eye'
    } else {
      inp.type = 'password'
      ico.className = 'fa-regular fa-eye-slash'
    }
  }
}

const authBtn = $('authBtn')
if (authBtn) {
  authBtn.onclick = async function () {
    const authEmailEl = $('authEmail')
    const authPassEl = $('authPass')
    const authErrorEl = $('authError')
    
    if (!authEmailEl || !authPassEl) return

    const email = authEmailEl.value.trim()
    const pass = authPassEl.value

    if (!email || !pass) {
      if (authErrorEl) {
        authErrorEl.style.display = 'block'
        authErrorEl.textContent = 'Please enter email and password.'
      }
      return
    }

    if (authErrorEl) authErrorEl.style.display = 'none'
    this.disabled = true
    this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...'

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (error) throw error
      currentAdmin = data.user
      await loadAdminProfile()
    } catch (e) {
      if (authErrorEl) {
        authErrorEl.style.display = 'block'
        authErrorEl.textContent = e.message || 'Login failed. Check credentials.'
      }
      this.disabled = false
      this.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In'
    }
  }
}

async function loadAdminProfile() {
  const greetingEl = $('greetingText')
  const pageGateEl = $('pageGate')
  const pageDashEl = $('pageDash')
  const authBtnEl = $('authBtn')

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_data')
      .eq('id', currentAdmin.id)
      .maybeSingle()

    let name = 'Admin'
    if (data && data.user_data) {
      name = data.user_data.full_name || data.user_data.fullName || 'Admin'
    }
    if (greetingEl) greetingEl.textContent = `Barka da zuwa Admin, ${name}!`
  } catch (e) {
    if (greetingEl) greetingEl.textContent = 'Barka da zuwa Admin!'
  } finally {
    if (pageGateEl) pageGateEl.classList.add('hidden')
    if (pageDashEl) pageDashEl.classList.add('active')
    if (authBtnEl) {
      authBtnEl.disabled = false
      authBtnEl.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In'
    }
  }
}

const logoutBtn = $('logoutBtn')
if (logoutBtn) {
  logoutBtn.onclick = async function () {
    await supabase.auth.signOut()
    currentAdmin = null
    currentUser = null
    
    const pageDashEl = $('pageDash')
    const pageGateEl = $('pageGate')
    const authEmailEl = $('authEmail')
    const authPassEl = $('authPass')
    const authBtnEl = $('authBtn')
    const pdfActionsEl = $('pdfActions')

    if (pageDashEl) pageDashEl.classList.remove('active')
    if (pageGateEl) pageGateEl.classList.remove('hidden')
    if (authEmailEl) authEmailEl.value = ''
    if (authPassEl) authPassEl.value = ''
    if (authBtnEl) {
      authBtnEl.disabled = false
      authBtnEl.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In'
    }
    showEl('resultSection', false)
    if (pdfActionsEl) pdfActionsEl.classList.add('hidden')
  }
}

const searchBtn = $('searchBtn')
if (searchBtn) searchBtn.onclick = searchUser

const searchInput = $('searchInput')
if (searchInput) {
  searchInput.onkeydown = function (e) {
    if (e.key === 'Enter') searchUser()
  }
}

const backBtn = $('backBtn')
if (backBtn) {
  backBtn.onclick = function () {
    showEl('resultSection', false)
    if (searchInput) searchInput.value = ''
    currentUser = null
    const pdfActionsEl = $('pdfActions')
    if (pdfActionsEl) pdfActionsEl.classList.add('hidden')
  }
}

async function searchUser() {
  if (!searchInput) return
  const val = searchInput.value.trim()
  if (!val) {
    showToast('warning', 'Empty Search', 'Please enter an email or phone number.')
    return
  }

  showLoading('Searching for student...')
  try {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .or(`user_data->>email.ilike.%${val}%,user_data->>phone.ilike.%${val}%`)

    if (error) throw error
    hideLoading()

    const container = $('userDataContainer')
    const pdfActionsEl = $('pdfActions')

    if (!profiles || profiles.length === 0) {
      showEl('resultSection', true)
      if (container) {
        container.innerHTML = `<div class="no-result"><i class="fa-regular fa-user-slash"></i><p>No student found with that email or phone number.</p></div>`
      }
      if (pdfActionsEl) pdfActionsEl.classList.add('hidden')
      return
    }

    const profile = profiles[0]
    currentUser = { id: profile.id, user_data: profile.user_data }
    await loadUserFullData(profile.id, profile.user_data)
  } catch (e) {
    hideLoading()
    showToast('error', 'Search Failed', e.message || 'An error occurred while searching.')
  }
}

async function loadUserFullData(userId, userData) {
  showLoading('Loading student data...')
  
  const fetchTable = async (tableName) => {
    try {
      const res = await supabase.from(tableName).select('*').eq('id', userId).maybeSingle()
      return res.data || null
    } catch (e) {
      return null
    }
  }

  try {
    const [
      enrollment,
      complete,
      update,
      certificate,
      post,
      pending,
      completepay
    ] = await Promise.all([
      fetchTable('enrollments_course'),
      fetchTable('complete'),
      fetchTable('update'),
      fetchTable('certificate'),
      fetchTable('post'),
      fetchTable('pending'),
      fetchTable('completepay')
    ])

    hideLoading()
    renderUserData(userData, {
      enrollment,
      complete,
      update,
      certificate,
      post,
      pending,
      completepay
    })
    showEl('resultSection', true)
    const pdfActionsEl = $('pdfActions')
    if (pdfActionsEl) pdfActionsEl.classList.add('hidden')
  } catch (e) {
    hideLoading()
    renderUserData(userData, {})
    showEl('resultSection', true)
  }
}

function renderUserData(ud, extra) {
  const e = ud || {}
  const fullName = e.full_name || e.fullName || 'N/A'
  const email = e.email || 'N/A'
  const phone = e.phone || 'N/A'
  const gender = e.gender || 'N/A'
  const dob = e.date_of_birth || e.dob || 'N/A'
  const level = e.school_level || e.level || 'N/A'
  const dateReg = e.date_registered || e.created_at || 'N/A'
  const status = e.status || 'pending'
  const courseName = e.course_name || 'N/A'
  const courseNum = e.course_number || 'N/A'
  const coursePrice = e.course_price || 'N/A'
  const paymentNo = e.payment_no || 'N/A'
  const refCode = e.referral_code || 'N/A'
  const refLink = e.referral_link || 'N/A'
  const refBy = e.referred_by || 'N/A'
  const refBonus = e.referral_bonus || '0.00'
  const assessGrade = e.assessment_grade || 'N/A'
  const examGrade = e.exam_grade || 'N/A'
  const levelComp = e.level_completed || 'N/A'
  const certIssued = e.certificate_issued ? 'Yes' : 'No'
  const passHash = e.password_hash || 'N/A'
  const passSalt = e.password_salt || 'N/A'

  let statusClass = 'pending'
  if (status === 'active' || status === 'approved') statusClass = 'active'
  if (status === 'locked' || status === 'blocked') statusClass = 'locked'

  const enrollData = extra.enrollment
    ? extra.enrollment.course_data || extra.enrollment
    : null

  const completeData = extra.complete
    ? extra.complete.complete_data || extra.complete
    : null

  const updateData = extra.update
    ? extra.update.user_update || extra.update
    : null

  const certData = extra.certificate
    ? extra.certificate.certificate_data || extra.certificate
    : null

  const postData = extra.post ? extra.post.post_link || extra.post : null

  const pendData = extra.pending
    ? extra.pending.pending_pay || extra.pending
    : null

  const compPayData = extra.completepay
    ? extra.completepay.complete_pay || extra.completepay
    : null

  const compPayDate = extra.completepay
    ? extra.completepay.date_complete || extra.completepay.date_complet || 'N/A'
    : 'N/A'

  function dv(val) {
    return val && val !== 'N/A'
      ? val
      : '<span class="di-value na">N/A</span>'
  }

  function safeStr(val) {
    if (!val) return 'N/A'
    if (typeof val === 'object') return JSON.stringify(val, null, 2) || 'N/A'
    return String(val)
  }

  let html = `<div class="data-card"><div class="card-title"><i class="fa-solid fa-user"></i> Personal Information</div>
    <div class="data-grid">
      <div class="data-item"><div class="di-label">Full Name</div><div class="di-value">${dv(fullName)}</div></div>
      <div class="data-item"><div class="di-label">Email</div><div class="di-value">${dv(email)}</div></div>
      <div class="data-item"><div class="di-label">Phone</div><div class="di-value">${dv(phone)}</div></div>
      <div class="data-item"><div class="di-label">Gender</div><div class="di-value">${dv(gender)}</div></div>
      <div class="data-item"><div class="di-label">Date of Birth</div><div class="di-value">${dv(dob)}</div></div>
      <div class="data-item"><div class="di-label">School Level</div><div class="di-value">${dv(level)}</div></div>
      <div class="data-item"><div class="di-label">Date Registered</div><div class="di-value">${dv(dateReg)}</div></div>
      <div class="data-item"><div class="di-label">Status</div><div class="di-value"><span class="status-badge ${statusClass}">${status}</span></div></div>
    </div></div>`

  html += `<div class="data-card"><div class="card-title"><i class="fa-solid fa-graduation-cap"></i> Course Information</div>
    <div class="data-grid">
      <div class="data-item"><div class="di-label">Course Name</div><div class="di-value">${dv(courseName)}</div></div>
      <div class="data-item"><div class="di-label">Course Number</div><div class="di-value">${dv(courseNum)}</div></div>
      <div class="data-item"><div class="di-label">Course Price</div><div class="di-value">${dv(coursePrice)}</div></div>
      <div class="data-item"><div class="di-label">Payment No</div><div class="di-value">${dv(paymentNo)}</div></div>
    </div></div>`

  html += `<div class="data-card"><div class="card-title"><i class="fa-solid fa-share-nodes"></i> Referral Information</div>
    <div class="data-grid">
      <div class="data-item"><div class="di-label">Referral Code</div><div class="di-value">${dv(refCode)}</div></div>
      <div class="data-item"><div class="di-label">Referral Link</div><div class="di-value">${dv(refLink)}</div></div>
      <div class="data-item"><div class="di-label">Referred By</div><div class="di-value">${dv(refBy)}</div></div>
      <div class="data-item"><div class="di-label">Referral Bonus</div><div class="di-value">₦${refBonus}</div></div>
    </div></div>`

  html += `<div class="data-card"><div class="card-title"><i class="fa-solid fa-file-pen"></i> Assessment & Progress</div>
    <div class="data-grid">
      <div class="data-item"><div class="di-label">Assessment Grade</div><div class="di-value">${dv(assessGrade)}</div></div>
      <div class="data-item"><div class="di-label">Exam Grade</div><div class="di-value">${dv(examGrade)}</div></div>
      <div class="data-item"><div class="di-label">Level Completed</div><div class="di-value">${dv(levelComp)}</div></div>
      <div class="data-item"><div class="di-label">Certificate Issued</div><div class="di-value">${dv(certIssued)}</div></div>
    </div></div>`

  if (enrollData) {
    html += `<div class="data-card"><div class="card-title"><i class="fa-solid fa-book"></i> Enrollment Course Data</div>
      <pre style="font-size:11px;background:rgba(124,58,237,.04);padding:12px;border-radius:10px;overflow-x:auto;max-height:200px;font-family:'Poppins',monospace;">${safeStr(enrollData)}</pre></div>`
  }

  if (completeData) {
    html += `<div class="data-card"><div class="card-title"><i class="fa-solid fa-check-circle"></i> Completion Data</div>
      <pre style="font-size:11px;background:rgba(124,58,237,.04);padding:12px;border-radius:10px;overflow-x:auto;max-height:200px;font-family:'Poppins',monospace;">${safeStr(completeData)}</pre></div>`
  }

  if (certData) {
    html += `<div class="data-card"><div class="card-title"><i class="fa-solid fa-certificate"></i> Certificate Data</div>
      <pre style="font-size:11px;background:rgba(124,58,237,.04);padding:12px;border-radius:10px;overflow-x:auto;max-height:200px;font-family:'Poppins',monospace;">${safeStr(certData)}</pre></div>`
  }

  if (updateData) {
    html += `<div class="data-card"><div class="card-title"><i class="fa-solid fa-pen-to-square"></i> Update History</div>
      <pre style="font-size:11px;background:rgba(124,58,237,.04);padding:12px;border-radius:10px;overflow-x:auto;max-height:200px;font-family:'Poppins',monospace;">${safeStr(updateData)}</pre></div>`
  }

  if (postData) {
    html += `<div class="data-card"><div class="card-title"><i class="fa-solid fa-message"></i> Posts</div>
      <pre style="font-size:11px;background:rgba(124,58,237,.04);padding:12px;border-radius:10px;overflow-x:auto;max-height:200px;font-family:'Poppins',monospace;">${safeStr(postData)}</pre></div>`
  }

  html += `<div class="data-card"><div class="card-title"><i class="fa-solid fa-credit-card"></i> Payment Information</div><div class="data-grid">`

  if (pendData) {
    html += `<div class="data-item"><div class="di-label">Pending Payment</div><div class="di-value">${safeStr(pendData)}</div></div>`
  } else {
    html += `<div class="data-item"><div class="di-label">Pending Payment</div><div class="di-value na">No pending payments</div></div>`
  }

  if (compPayData) {
    html += `<div class="data-item"><div class="di-label">Completed Payment</div><div class="di-value">${safeStr(compPayData)}</div></div>`
    html += `<div class="data-item"><div class="di-label">Date Completed</div><div class="di-value">${dv(compPayDate)}</div></div>`
  } else {
    html += `<div class="data-item"><div class="di-label">Completed Payment</div><div class="di-value na">No completed payments</div></div>`
  }

  html += `</div></div>`

  html += `<div class="data-card"><div class="card-title"><i class="fa-solid fa-lock"></i> Security (Admin Only)</div>
    <div class="data-grid">
      <div class="data-item"><div class="di-label">Password Hash</div><div class="di-value" style="font-size:10px;word-break:break-all;">${dv(passHash)}</div></div>
      <div class="data-item"><div class="di-label">Password Salt</div><div class="di-value" style="font-size:10px;word-break:break-all;">${dv(passSalt)}</div></div>
    </div></div>`

  const container = $('userDataContainer')
  if (container) container.innerHTML = html
}

const pdfBtn = $('pdfBtn')
if (pdfBtn) pdfBtn.onclick = generatePdf

async function generatePdf() {
  if (!currentUser) {
    showToast('error', 'No Data', 'Please search for a student first.')
    return
  }

  showLoading('Generating PDF...')

  try {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageW = 210
    const margin = 14
    const contentW = pageW - margin * 2
    let y = margin

    const addHeader = async () => {
      const logoUrl = 'https://i.imgur.com/z8HOr4D.png'
      try {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.src = logoUrl
        await new Promise((res) => {
          img.onload = res
          img.onerror = res
        })
        doc.addImage(img, 'PNG', margin, y - 2, 28, 28)
      } catch (e) {}

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(30, 27, 75)
      doc.text('IDT Academy', margin + 34, y + 8)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(109, 106, 138)
      doc.text('www.idtacademy.com.ng', margin + 34, y + 16)

      doc.setDrawColor(124, 58, 237)
      doc.setLineWidth(0.5)
      doc.line(margin, y + 24, pageW - margin, y + 24)

      y += 32
    }

    const addFooter = () => {
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text('IDT Academy - Admin Report | www.idtacademy.com.ng', margin, 292)
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(margin, 288, pageW - margin, 288)
    }

    const checkPage = () => {
      if (y > 268) {
        addFooter()
        doc.addPage()
        y = margin + 4
      }
    }

    await addHeader()
    const ud = currentUser.user_data || {}
    const fullName = ud.full_name || ud.fullName || 'Unknown'

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(124, 58, 237)
    doc.text('STUDENT INFORMATION REPORT', margin, y + 4)

    y += 14

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(109, 106, 138)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, margin, y)

    y += 10

    const sections = [
      {
        title: 'Personal Information',
        data: [
          ['Full Name', fullName],
          ['Email', ud.email || 'N/A'],
          ['Phone', ud.phone || 'N/A'],
          ['Gender', ud.gender || 'N/A'],
          ['Date of Birth', ud.date_of_birth || ud.dob || 'N/A'],
          ['School Level', ud.school_level || ud.level || 'N/A'],
          ['Date Registered', ud.date_registered || ud.created_at || 'N/A'],
          ['Status', ud.status || 'pending']
        ]
      },
      {
        title: 'Course Information',
        data: [
          ['Course Name', ud.course_name || 'N/A'],
          ['Course Number', ud.course_number || 'N/A'],
          ['Course Price', ud.course_price ? '₦' + ud.course_price : 'N/A'],
          ['Payment No', ud.payment_no || 'N/A']
        ]
      },
      {
        title: 'Referral Information',
        data: [
          ['Referral Code', ud.referral_code || 'N/A'],
          ['Referral Link', ud.referral_link || 'N/A'],
          ['Referred By', ud.referred_by || 'N/A'],
          ['Referral Bonus', ud.referral_bonus ? '₦' + ud.referral_bonus : '₦0.00']
        ]
      },
      {
        title: 'Assessment & Progress',
        data: [
          ['Assessment Grade', ud.assessment_grade || 'N/A'],
          ['Exam Grade', ud.exam_grade || 'N/A'],
          ['Level Completed', ud.level_completed || 'N/A'],
          ['Certificate Issued', ud.certificate_issued ? 'Yes' : 'No']
        ]
      }
    ]

    for (const sec of sections) {
      checkPage()
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(124, 58, 237)
      doc.text(sec.title, margin, y)
      y += 6

      for (const row of sec.data) {
        checkPage()
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(109, 106, 138)
        doc.text(row[0] + ':', margin + 2, y)

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 27, 75)
        const valX = margin + 58
        const val = row[1] || 'N/A'

        if (doc.getTextWidth(val) > contentW - 62) {
          doc.text(val, valX, y, { maxWidth: contentW - 62 })
        } else {
          doc.text(val, valX, y)
        }
        y += 7
      }
      y += 4
    }

    checkPage()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(124, 58, 237)
    doc.text('Payment Information', margin, y)
    y += 6

    const payData = [
      ['Pending Payment', 'See system records'],
      ['Complete Payment', 'See system records'],
      ['Date Completed', 'See system records']
    ]

    for (const row of payData) {
      checkPage()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(109, 106, 138)
      doc.text(row[0] + ':', margin + 2, y)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 27, 75)
      doc.text(row[1], margin + 58, y)
      y += 7
    }

    y += 8
    checkPage()
    doc.setDrawColor(124, 58, 237)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 6

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('This report is officially generated by IDT Academy Admin System.', margin, y)
    y += 4
    doc.text('Unauthorized distribution of this document is prohibited.', margin, y)

    addFooter()

    const pdfBlob = doc.output('blob')
    lastPdfBlob = pdfBlob
    const pdfUrl = URL.createObjectURL(pdfBlob)

    hideLoading()
    showToast('success', 'PDF Generated', 'Student report has been created successfully.')

    const pdfActionsEl = $('pdfActions')
    if (pdfActionsEl) pdfActionsEl.classList.remove('hidden')

    const printPdfBtn = $('printPdfBtn')
    if (printPdfBtn) {
      printPdfBtn.onclick = () => {
        const w = window.open(pdfUrl)
        if (w) w.print()
        else showToast('error', 'Print Failed', 'Please allow pop-ups to print.')
      }
    }

    const uploadPdfBtn = $('uploadPdfBtn')
    if (uploadPdfBtn) {
      uploadPdfBtn.onclick = async () => {
        if (!lastPdfBlob) {
          showToast('error', 'No PDF', 'Generate the PDF first.')
          return
        }

        showLoading('Uploading PDF...')
        try {
          const fileName = `report_${currentUser.id}_${Date.now()}.pdf`
          const { error: uploadError } = await supabase.storage
            .from('pdf-reports')
            .upload(fileName, lastPdfBlob, {
              contentType: 'application/pdf',
              upsert: true
            })

          if (uploadError) throw uploadError
          hideLoading()
          showToast('success', 'Uploaded', 'PDF uploaded successfully.')
        } catch (e) {
          hideLoading()
          showToast('error', 'Upload Failed', e.message || 'Could not upload PDF.')
        }
      }
    }
  } catch (e) {
    hideLoading()
    showToast('error', 'PDF Error', e.message || 'Failed to generate PDF.')
  }
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    currentAdmin = null
    currentUser = null
    const pageDashEl = $('pageDash')
    const pageGateEl = $('pageGate')
    const pdfActionsEl = $('pdfActions')

    if (pageDashEl) pageDashEl.classList.remove('active')
    if (pageGateEl) pageGateEl.classList.remove('hidden')
    showEl('resultSection', false)
    if (pdfActionsEl) pdfActionsEl.classList.add('hidden')
  }
})

window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    currentAdmin = session.user
    const pageGateEl = $('pageGate')
    const pageDashEl = $('pageDash')

    if (pageGateEl) pageGateEl.classList.add('hidden')
    if (pageDashEl) pageDashEl.classList.add('active')
    await loadAdminProfile()
  }
})
import { supabase } from './supabase.js'

const _k1 = 'NjZhbnVyYWxA'
const _k2 = 'NzdhZGlhYnVA'

function _d(s) {
  return atob(s)
    .split('')
    .reverse()
    .join('')
}

let ceoVerified = false
let currentUser = null
let currentAdmin = null

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
  const t = $('loadingText')
  const o = $('loadingOverlay')
  if (t) t.textContent = text || 'Processing...'
  if (o) o.classList.remove('hidden')
}

function hideLoading() {
  const o = $('loadingOverlay')
  if (o) o.classList.add('hidden')
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
  t.querySelector('.toast-close').onclick = () => {
    t.classList.add('out')
    setTimeout(() => t.remove(), 300)
  }
  c.appendChild(t)
  setTimeout(() => {
    if (t.parentNode) {
      t.classList.add('out')
      setTimeout(() => t.remove(), 300)
    }
  }, 5000)
}

if ($('ceoPassBtn')) {
  $('ceoPassBtn').onclick = async function () {
    const val = $('ceoPassInput') ? $('ceoPassInput').value.trim() : ''
    const p1 = _d(_k1)
    const p2 = _d(_k2)
    if (val === p1 || val === p2) {
      ceoVerified = true
      if ($('ceoPassError')) $('ceoPassError').style.display = 'none'
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        currentAdmin = session.user
        if ($('pageGate')) $('pageGate').classList.add('hidden')
        if ($('pageAuth')) $('pageAuth').classList.remove('active')
        if ($('pageDash')) $('pageDash').classList.add('active')
        await loadCeoProfile()
      } else {
        if ($('pageGate')) $('pageGate').classList.add('hidden')
        if ($('pageAuth')) $('pageAuth').classList.add('active')
      }
    } else {
      if ($('ceoPassError')) $('ceoPassError').style.display = 'block'
      if ($('ceoPassInput')) {
        $('ceoPassInput').value = ''
        $('ceoPassInput').focus()
      }
    }
  }
}

if ($('ceoPassInput')) {
  $('ceoPassInput').onkeydown = function (e) {
    if (e.key === 'Enter' && $('ceoPassBtn')) $('ceoPassBtn').click()
  }
}

if ($('togglePass')) {
  $('togglePass').onclick = function () {
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

if ($('authBtn')) {
  $('authBtn').onclick = async function () {
    if (!ceoVerified) {
      showToast('error', 'Access Denied', 'CEO password not verified.')
      return
    }
    const email = $('authEmail') ? $('authEmail').value.trim() : ''
    const pass = $('authPass') ? $('authPass').value.trim() : ''
    if (!email || !pass) {
      if ($('authError')) {
        $('authError').style.display = 'block'
        $('authError').textContent = 'Please enter email and password.'
      }
      return
    }
    if ($('authError')) $('authError').style.display = 'none'
    this.disabled = true
    this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...'
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (error) throw error
      currentAdmin = data.user
      await loadCeoProfile()
    } catch (e) {
      if ($('authError')) {
        $('authError').style.display = 'block'
        $('authError').textContent = e.message || 'Login failed.'
      }
      this.disabled = false
      this.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In'
    }
  }
}

async function loadCeoProfile() {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_data')
      .eq('id', currentAdmin.id)
      .single()

    let name = 'CEO'
    if (data && data.user_data) {
      name = data.user_data.full_name || data.user_data.fullName || 'CEO'
    }
    if ($('greetingText')) $('greetingText').textContent = `Barka da zuwa, ${name}!`
    if ($('pageAuth')) $('pageAuth').classList.remove('active')
    if ($('pageDash')) $('pageDash').classList.add('active')
    if ($('authBtn')) {
      $('authBtn').disabled = false
      $('authBtn').innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In'
    }
  } catch (e) {
    if ($('greetingText')) $('greetingText').textContent = 'Barka da zuwa, CEO!'
    if ($('pageAuth')) $('pageAuth').classList.remove('active')
    if ($('pageDash')) $('pageDash').classList.add('active')
    if ($('authBtn')) {
      $('authBtn').disabled = false
      $('authBtn').innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In'
    }
  }
}

if ($('logoutBtn')) {
  $('logoutBtn').onclick = async function () {
    ceoVerified = false
    await supabase.auth.signOut()
    currentAdmin = null
    currentUser = null
    if ($('pageDash')) $('pageDash').classList.remove('active')
    if ($('pageAuth')) $('pageAuth').classList.remove('active')
    if ($('pageGate')) $('pageGate').classList.remove('hidden')
    if ($('ceoPassInput')) $('ceoPassInput').value = ''
    if ($('authEmail')) $('authEmail').value = ''
    if ($('authPass')) $('authPass').value = ''
    showEl('resultSection', false)
  }
}

if ($('searchBtn')) $('searchBtn').onclick = ceoSearch

if ($('searchInput')) {
  $('searchInput').onkeydown = function (e) {
    if (e.key === 'Enter') ceoSearch()
  }
}

if ($('backBtn')) {
  $('backBtn').onclick = function () {
    showEl('resultSection', false)
    if ($('searchInput')) $('searchInput').value = ''
    currentUser = null
  }
}

async function ceoSearch() {
  const val = $('searchInput') ? $('searchInput').value.trim() : ''
  if (!val) {
    showToast('warning', 'Empty Search', 'Enter email or phone.')
    return
  }
  showLoading('Searching...')
  try {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id, user_data')
      .or(`user_data->>email.ilike.%${val}%,user_data->>phone.ilike.%${val}%`)

    if (error) throw error
    hideLoading()

    if (!profiles || profiles.length === 0) {
      showEl('resultSection', true)
      if ($('userDataContainer')) {
        $('userDataContainer').innerHTML =
          `<div class="no-result"><i class="fa-regular fa-user-slash"></i><p>No student found.</p></div>`
      }
      return
    }

    const profile = profiles[0]
    currentUser = { id: profile.id, user_data: profile.user_data }
    renderCeoEdit(profile.id, profile.user_data)
    showEl('resultSection', true)
  } catch (e) {
    hideLoading()
    showToast('error', 'Search Failed', e.message || 'Error occurred during search.')
  }
}

function renderCeoEdit(userId, ud) {
  const e = ud || {}
  const status = e.status || 'pending'
  let statusClass = 'pending'
  if (status === 'active' || status === 'approved') statusClass = 'active'
  if (status === 'locked' || status === 'blocked') statusClass = 'locked'

  const fields = [
    { key: 'full_name', label: 'Full Name', val: e.full_name || e.fullName || '' },
    { key: 'email', label: 'Email', val: e.email || '' },
    { key: 'phone', label: 'Phone', val: e.phone || '' },
    { key: 'gender', label: 'Gender', val: e.gender || '' },
    { key: 'date_of_birth', label: 'Date of Birth', val: e.date_of_birth || e.dob || '' },
    { key: 'school_level', label: 'School Level', val: e.school_level || e.level || '' },
    { key: 'course_name', label: 'Course Name', val: e.course_name || '' },
    { key: 'course_number', label: 'Course Number', val: e.course_number || '' },
    { key: 'course_price', label: 'Course Price', val: e.course_price || '' },
    { key: 'payment_no', label: 'Payment No', val: e.payment_no || '' },
    { key: 'assessment_grade', label: 'Assessment Grade', val: e.assessment_grade || '' },
    { key: 'exam_grade', label: 'Exam Grade', val: e.exam_grade || '' },
    { key: 'referral_bonus', label: 'Referral Bonus', val: e.referral_bonus || '0.00' }
  ]

  let html =
    `<div class="data-card"><div class="card-title"><i class="fa-solid fa-user-pen"></i> Edit Student Data</div>
    <div style="margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <span style="font-size:13px;font-weight:600;">Status: <span class="status-badge ${statusClass}" id="ceoStatusBadge">${status}</span></span>
    </div>
    <div class="data-grid">`

  for (const f of fields) {
    const safeVal = String(f.val).replace(/"/g, '&quot;')
    html += `<div class="data-item">
      <div class="di-label">${f.label}</div>
      <input type="text" class="di-input" id="ceoField_${f.key}" value="${safeVal}" placeholder="${f.label}">
    </div>`
  }

  html += `</div>
    <div class="ceo-actions">
      <button class="update-btn" id="ceoUpdateBtn"><i class="fa-solid fa-floppy-disk"></i> Update Data</button>
      <button class="${status === 'locked' || status === 'blocked' ? 'unlock-btn' : 'lock-btn'}" id="ceoToggleLockBtn">
        <i class="fa-solid ${status === 'locked' || status === 'blocked' ? 'fa-unlock' : 'fa-lock'}"></i>
        ${status === 'locked' || status === 'blocked' ? 'Unlock User' : 'Lock User'}
      </button>
    </div></div>`

  if ($('userDataContainer')) $('userDataContainer').innerHTML = html

  if ($('ceoUpdateBtn')) $('ceoUpdateBtn').onclick = () => ceoUpdateUser(userId)
  if ($('ceoToggleLockBtn')) $('ceoToggleLockBtn').onclick = () => ceoToggleLock(userId, status)
}

async function ceoUpdateUser(userId) {
  showLoading('Updating user data...')
  try {
    const keys = [
      'full_name', 'email', 'phone', 'gender', 'date_of_birth',
      'school_level', 'course_name', 'course_number', 'course_price',
      'payment_no', 'assessment_grade', 'exam_grade', 'referral_bonus'
    ]

    const updateData = {}
    for (const key of keys) {
      const el = $(`ceoField_${key}`)
      if (el) updateData[key] = el.value
    }

    const { data: existing, error: fetchError } = await supabase
      .from('user_profiles')
      .select('user_data')
      .eq('id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

    const mergedData =
      existing && existing.user_data
        ? { ...existing.user_data, ...updateData }
        : updateData

    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({ id: userId, user_data: mergedData }, { onConflict: 'id' })

    if (upsertError) throw upsertError

    const ts = new Date().toISOString()
    await supabase
      .from('update')
      .upsert(
        {
          id: userId,
          user_update: {
            updated_by: currentAdmin?.id || 'ceo',
            updated_at: ts,
            changes: updateData
          }
        },
        { onConflict: 'id' }
      )

    hideLoading()
    showToast('success', 'Updated', 'Student data updated successfully.')
    currentUser = { id: userId, user_data: mergedData }
  } catch (e) {
    hideLoading()
    showToast('error', 'Update Failed', e.message || 'Could not update data.')
  }
}

async function ceoToggleLock(userId, currentStatus) {
  const isLocked = currentStatus === 'locked' || currentStatus === 'blocked'
  const newStatus = isLocked ? 'active' : 'locked'
  const action = isLocked ? 'unlocking' : 'locking'

  showLoading(`${action} user...`)
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('user_profiles')
      .select('user_data')
      .eq('id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

    const mergedData =
      existing && existing.user_data
        ? { ...existing.user_data, status: newStatus }
        : { status: newStatus }

    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({ id: userId, user_data: mergedData }, { onConflict: 'id' })

    if (upsertError) throw upsertError

    hideLoading()
    const msg = isLocked
      ? 'User unlocked successfully.'
      : 'User locked successfully.'

    showToast(
      'success',
      isLocked ? 'Unlocked' : 'Locked',
      msg
    )

    renderCeoEdit(userId, mergedData)
    currentUser = { id: userId, user_data: mergedData }
  } catch (e) {
    hideLoading()
    showToast('error', 'Action Failed', e.message || `Could not ${action} user.`)
  }
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    ceoVerified = false
    currentAdmin = null
    currentUser = null
    if ($('pageDash')) $('pageDash').classList.remove('active')
    if ($('pageAuth')) $('pageAuth').classList.remove('active')
    if ($('pageGate')) $('pageGate').classList.remove('hidden')
    if ($('ceoPassInput')) $('ceoPassInput').value = ''
    if ($('authEmail')) $('authEmail').value = ''
    if ($('authPass')) $('authPass').value = ''
    showEl('resultSection', false)
  }
})

window.addEventListener('DOMContentLoaded', () => {
  ceoVerified = false
  currentAdmin = null
  if ($('pageGate')) $('pageGate').classList.remove('hidden')
  if ($('pageAuth')) $('pageAuth').classList.remove('active')
  if ($('pageDash')) $('pageDash').classList.remove('active')
})
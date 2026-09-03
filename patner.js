import { supabase } from './supabase.js'

const $ = id => document.getElementById(id)

function showLoading(text) {
  $('loadingText').textContent = text || 'Processing...'
  $('loadingOverlay').classList.remove('hidden')
}

function hideLoading() {
  $('loadingOverlay').classList.add('hidden')
}

function showToast(type, title, msg) {
  const c = $('toastContainer')
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info'
  }
  const t = document.createElement('div')
  t.className = 'toast ' + type
  t.innerHTML =
    '<i class="fa-regular ' + (icons[type] || icons.info) + '"></i>' +
    '<div class="toast-body"><b>' + title + '</b><p>' + msg + '</p></div>' +
    '<button class="toast-close"><i class="fa-solid fa-xmark"></i></button>'
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

function setLoading(btn, busy, normalHtml, busyHtml) {
  if (busy) {
    btn.disabled = true
    btn.innerHTML = busyHtml
  } else {
    btn.disabled = false
    btn.innerHTML = normalHtml
  }
}

document.querySelectorAll('.toggle-pass').forEach(btn => {
  btn.onclick = function () {
    const inp = document.getElementById(this.dataset.target)
    const ico = this.querySelector('i')
    if (inp.type === 'password') {
      inp.type = 'text'
      ico.className = 'fa-regular fa-eye'
    } else {
      inp.type = 'password'
      ico.className = 'fa-regular fa-eye-slash'
    }
  }
})

$('tabRegister').onclick = () => switchTab('register')
$('tabLogin').onclick = () => switchTab('login')

function switchTab(tab) {
  if (tab === 'register') {
    $('registerCard').classList.add('active')
    $('loginCard').classList.remove('active')
    $('tabRegister').classList.add('active')
    $('tabLogin').classList.remove('active')
  } else {
    $('loginCard').classList.add('active')
    $('registerCard').classList.remove('active')
    $('tabLogin').classList.add('active')
    $('tabRegister').classList.remove('active')
  }
}

async function checkExistingSession() {
  try {
    const { data } = await supabase.auth.getSession()
    if (data && data.session && data.session.user) {
      window.location.replace('referral.html')
    }
  } catch (e) {}
}

checkExistingSession()

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session && session.user) {
    window.location.replace('referral.html')
  }
})

$('registerBtn').onclick = async function () {
  const fullName = $('regFullName').value.trim()
  const phone = $('regPhone').value.trim()
  const email = $('regEmail').value.trim().toLowerCase()
  const pass = $('regPass').value
  const pass2 = $('regPass2').value

  if (!fullName || fullName.length < 3) {
    showToast('error', 'Invalid Name', 'Please enter your full name.')
    return
  }
  if (!phone || phone.length < 7) {
    showToast('error', 'Phone Required', 'Please enter a valid phone number.')
    return
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('error', 'Invalid Email', 'Please enter a valid email address.')
    return
  }
  if (!pass || pass.length < 6) {
    showToast('error', 'Weak Password', 'Password must be at least 6 characters.')
    return
  }
  if (pass !== pass2) {
    showToast('error', 'Password Mismatch', 'The two passwords do not match.')
    return
  }

  setLoading(
    this, true,
    '<i class="fa-solid fa-user-plus"></i> Submit',
    '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...'
  )

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_type: 'partner',
        full_name: fullName,
        email: email,
        phone: phone,
        password: pass
      })
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok || data.error) {
      showToast('error', 'Registration Failed', data.error || 'Something went wrong. Please try again.')
      setLoading(this, false, '<i class="fa-solid fa-user-plus"></i> Submit', '')
      return
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: pass
    })

    if (signUpError) {
      showToast('success', 'Account Created', 'Your partner account is ready. Please log in now.')
      setLoading(this, false, '<i class="fa-solid fa-user-plus"></i> Submit', '')
      switchTab('login')
      $('loginEmail').value = email
      $('loginPass').value = ''
      return
    }

    showToast('success', 'Welcome!', 'Your partner account is ready. Opening your dashboard...')
    setTimeout(() => {
      window.location.replace('referral.html')
    }, 1200)
  } catch (e) {
    showToast('error', 'Network Error', e.message || 'Could not connect. Please check your internet and try again.')
    setLoading(this, false, '<i class="fa-solid fa-user-plus"></i> Submit', '')
  }
}

$('loginBtn').onclick = async function () {
  const email = $('loginEmail').value.trim().toLowerCase()
  const pass = $('loginPass').value

  if (!email || !pass) {
    showToast('error', 'Missing Fields', 'Please enter your email and password.')
    return
  }

  setLoading(
    this, true,
    '<i class="fa-solid fa-right-to-bracket"></i> Submit',
    '<i class="fa-solid fa-spinner fa-spin"></i> Logging In...'
  )

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: pass
    })

    if (error) {
      showToast('error', 'Login Failed', error.message || 'Invalid email or password.')
      setLoading(this, false, '<i class="fa-solid fa-right-to-bracket"></i> Submit', '')
      return
    }

    if (data && data.session) {
      showToast('success', 'Welcome Back!', 'Login successful. Opening your dashboard...')
      setTimeout(() => {
        window.location.replace('referral.html')
      }, 1000)
    } else {
      showToast('error', 'Login Failed', 'Could not sign you in. Please try again.')
      setLoading(this, false, '<i class="fa-solid fa-right-to-bracket"></i> Submit', '')
    }
  } catch (e) {
    showToast('error', 'Network Error', e.message || 'Could not connect. Please check your internet and try again.')
    setLoading(this, false, '<i class="fa-solid fa-right-to-bracket"></i> Submit', '')
  }
}
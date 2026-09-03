import { supabase } from './supabase.js';

const $ = (sel, ctx = document) => ctx.querySelector(sel);

const el = {
  loading: $('#loadingScreen'),
  backBtn: $('#backBtn'),
  topbarLogin: $('#topbarLogin'),
  topbarRegister: $('#topbarRegister'),
  heroStartBtn: $('#heroStartBtn'),
  heroLearnMore: $('#heroLearnMore'),
  ctaStartBtn: $('#ctaStartBtn'),
  earnStartBtn: $('#earnStartBtn'),
  loginModal: $('#loginModal'),
  loginModalClose: $('#loginModalClose'),
  loginForm: $('#loginForm'),
  loginEmail: $('#loginEmail'),
  loginPassword: $('#loginPassword'),
  loginPassToggle: $('#loginPassToggle'),
  loginSubmitBtn: $('#loginSubmitBtn'),
  loginError: $('#loginError'),
  loginToRegister: $('#loginToRegister'),
  registerModal: $('#registerModal'),
  registerModalClose: $('#registerModalClose'),
  registerForm: $('#registerForm'),
  regFullName: $('#regFullName'),
  regPhone: $('#regPhone'),
  regEmail: $('#regEmail'),
  regGender: $('#regGender'),
  regDob: $('#regDob'),
  regLevel: $('#regLevel'),
  regDepartment: $('#regDepartment'),
  subjectsDisplay: $('#subjectsDisplay'),
  regPrice: $('#regPrice'),
  regPassword: $('#regPassword'),
  regConfirmPassword: $('#regConfirmPassword'),
  regPassToggle: $('#regPassToggle'),
  regConfirmPassToggle: $('#regConfirmPassToggle'),
  registerSubmitBtn: $('#registerSubmitBtn'),
  registerError: $('#registerError'),
  registerToLogin: $('#registerToLogin'),
  toastContainer: $('#toastContainer')
};

const departments = [
  { id: 'eng_tech', name: 'Engineering & Technology', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry'] },
  { id: 'medicine', name: 'Medicine & Surgery / Nursing / Pharmacy / Dentistry / Anatomy', subjects: ['English', 'Biology', 'Chemistry', 'Physics'] },
  { id: 'cs_science', name: 'Computer Science (Science Stream) / Cybersecurity / Software Engineering', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry'] },
  { id: 'cs_mgmt', name: 'Computer Science (Management / Polytechnics)', subjects: ['English', 'Mathematics', 'Physics', 'Economics'] },
  { id: 'agric', name: 'Agricultural Science / Agronomy / Animal Science', subjects: ['English', 'Chemistry', 'Biology / Agric Science', 'Physics / Mathematics'] },
  { id: 'architecture', name: 'Architecture / Building / Quantity Surveying / Urban Planning', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry / Fine Arts / Geography'] },
  { id: 'bio_sciences', name: 'Biological Sciences (Biochemistry / Microbiology / Zoology / Botany)', subjects: ['English', 'Biology', 'Chemistry', 'Physics / Mathematics'] },
  { id: 'physical_sci', name: 'Physical Sciences (Physics / Industrial Chemistry / Geology)', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry'] },
  { id: 'math_stats', name: 'Mathematics / Statistics / Data Science', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry / Economics'] },
  { id: 'food_sci', name: 'Food Science and Technology', subjects: ['English', 'Chemistry', 'Mathematics / Physics', 'Biology / Agric Science'] },
  { id: 'law', name: 'Law (Civil / Common / Islamic)', subjects: ['English', 'Literature in English', 'Government / History', 'CRK / IRK / Economics'] },
  { id: 'mass_comm', name: 'Mass Communication / Journalism / Media Studies', subjects: ['English', 'Literature in English', 'Government / History', 'Any Nigerian Language / CRK / IRK / Economics'] },
  { id: 'pol_sci', name: 'Political Science / International Relations / Public Admin', subjects: ['English', 'Government / History', 'Economics', 'Literature in English / CRK / IRK / Geography'] },
  { id: 'sociology', name: 'Sociology / Criminology / Psychology', subjects: ['English', 'Government / History', 'Economics', 'Any Arts or Social Science Subject'] },
  { id: 'economics', name: 'Economics', subjects: ['English', 'Mathematics', 'Economics', 'Government / History / Geography / Commerce'] },
  { id: 'english_lang', name: 'English Language / Linguistics / Literature', subjects: ['English', 'Literature in English', 'Government / History', 'Any Nigerian Language / Arts Subject'] },
  { id: 'history', name: 'History and International Studies', subjects: ['English', 'History / Government', 'Literature in English', 'Any Arts or Social Science Subject'] },
  { id: 'theatre', name: 'Theatre Arts / Performing Arts / Creative Arts', subjects: ['English', 'Literature in English', 'Government / History', 'Fine Arts / Music / Any Arts Subject'] },
  { id: 'languages', name: 'Hausa / Yoruba / Igbo', subjects: ['English', 'The Specific Language', 'Literature in English', 'Any Arts Subject'] },
  { id: 'religious', name: 'Islamic Studies / Christian Religious Studies', subjects: ['English', 'IRK / CRK', 'Government / History', 'Literature in English / Any Arts Subject'] },
  { id: 'accounting', name: 'Accounting / Finance / Banking & Finance', subjects: ['English', 'Mathematics', 'Economics', 'Commerce / Financial Accounting / Government'] },
  { id: 'business_admin', name: 'Business Administration / Business Management', subjects: ['English', 'Mathematics', 'Economics', 'Commerce / Government'] },
  { id: 'marketing', name: 'Marketing / Procurement / Logistics', subjects: ['English', 'Mathematics', 'Economics', 'Commerce / Government'] },
  { id: 'hr', name: 'Human Resource Management / Industrial Relations', subjects: ['English', 'Mathematics', 'Economics', 'Government'] },
  { id: 'insurance', name: 'Insurance / Actuarial Science', subjects: ['English', 'Mathematics', 'Economics', 'Commerce / Physics / Financial Accounting'] },
  { id: 'estate', name: 'Estate Management', subjects: ['English', 'Mathematics', 'Economics', 'Chemistry / Physics / Geography / Agric Science'] },
  { id: 'geography', name: 'Geography / Environmental Management', subjects: ['English', 'Geography', 'Mathematics / Economics', 'Biology / Chemistry / Physics'] },
  { id: 'edu_science', name: 'Education & Science (Physics / Chemistry / Biology)', subjects: ['English', 'Science Subject', 'Mathematics', 'Chemistry / Physics / Biology'] },
  { id: 'edu_math', name: 'Education & Mathematics', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry / Economics'] },
  { id: 'edu_english', name: 'Education & English', subjects: ['English', 'Literature in English', 'Government / History', 'Any Arts Subject'] },
  { id: 'edu_econs', name: 'Education & Economics', subjects: ['English', 'Mathematics', 'Economics', 'Government / Geography'] },
  { id: 'primary_edu', name: 'Primary Education / Special Education', subjects: ['English', 'Any 3 Arts / Social Science / Science Subjects'] },
  { id: 'mls', name: 'Medical Laboratory Science / Radiography', subjects: ['English', 'Biology', 'Chemistry', 'Physics'] },
  { id: 'physio', name: 'Physiotherapy / Prosthetics and Orthotics', subjects: ['English', 'Biology', 'Chemistry', 'Physics'] },
  { id: 'public_health', name: 'Public Health / Environmental Health Science', subjects: ['English', 'Biology', 'Chemistry', 'Physics / Mathematics'] },
  { id: 'veterinary', name: 'Veterinary Medicine', subjects: ['English', 'Biology', 'Chemistry', 'Physics'] },
  { id: 'telecom', name: 'Telecommunication Engineering / Biomedical Engineering', subjects: ['English', 'Mathematics', 'Physics', 'Chemistry'] },
  { id: 'library', name: 'Library and Information Science', subjects: ['English', 'Any 3 Arts / Social Science / Science Subjects'] }
];

function populateDepartments() {
  const sel = el.regDepartment;
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Select Department --</option>';
  departments.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    sel.appendChild(opt);
  });
}

function updateSubjectsDisplay() {
  const sel = el.regDepartment;
  const display = el.subjectsDisplay;
  if (!sel || !display) return;

  const deptId = sel.value;
  if (!deptId) {
    display.innerHTML = '<span class="empty-subjects">Select a department to see your JAMB subjects</span>';
    return;
  }

  const dept = departments.find(d => d.id === deptId);
  if (!dept) {
    display.innerHTML = '<span class="empty-subjects">No subjects found for this department</span>';
    return;
  }

  display.innerHTML = dept.subjects.map(s => '<span class="subject-tag">' + s + '</span>').join('');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function showToast(message, type = 'success', duration = 4000) {
  if (!el.toastContainer) return;

  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-circle-exclamation',
    warning: 'fas fa-triangle-exclamation'
  };

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = '<span class="toast-icon"><i class="' + (icons[type] || icons.success) + '"></i></span><span class="toast-text">' + message + '</span><button class="toast-close"><i class="fas fa-xmark"></i></button>';

  el.toastContainer.appendChild(toast);

  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() { removeToast(toast); });
  }

  setTimeout(function() { removeToast(toast); }, duration);
}

function removeToast(toast) {
  if (!toast || toast.classList.contains('removing')) return;
  toast.classList.add('removing');
  setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
}

function showLoading(show) {
  if (!el.loading) return;
  if (show) {
    el.loading.classList.remove('fade-out');
    el.loading.style.display = 'flex';
  } else {
    el.loading.classList.add('fade-out');
    setTimeout(function() { el.loading.style.display = 'none'; }, 500);
  }
  if (typeof window.__revealPage === 'function') {
    window.__revealPage();
  }
}

function openLoginModal() {
  if (!el.loginModal) return;
  el.loginModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (el.loginError) {
    el.loginError.classList.remove('show');
    el.loginError.textContent = '';
  }
}

function closeLoginModal() {
  if (!el.loginModal) return;
  el.loginModal.classList.remove('active');
  document.body.style.overflow = '';
  if (el.loginError) {
    el.loginError.classList.remove('show');
    el.loginError.textContent = '';
  }
}

function openRegisterModal() {
  if (!el.registerModal) return;
  el.registerModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (el.registerError) {
    el.registerError.classList.remove('show');
    el.registerError.textContent = '';
  }
}

function closeRegisterModal() {
  if (!el.registerModal) return;
  el.registerModal.classList.remove('active');
  document.body.style.overflow = '';
  if (el.registerError) {
    el.registerError.classList.remove('show');
    el.registerError.textContent = '';
  }
}

function openAnyRegister(trigger) {
  if (trigger === 'login') closeLoginModal();
  openRegisterModal();
}

function openAnyLogin(trigger) {
  if (trigger === 'register') closeRegisterModal();
  openLoginModal();
}

function setLoginLoading(loading) {
  if (!el.loginSubmitBtn) return;
  if (loading) {
    el.loginSubmitBtn.classList.add('loading');
    el.loginSubmitBtn.innerHTML = '<span class="spinner-sm"></span>Signing in...';
    el.loginSubmitBtn.disabled = true;
  } else {
    el.loginSubmitBtn.classList.remove('loading');
    el.loginSubmitBtn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i>Submit';
    el.loginSubmitBtn.disabled = false;
  }
}

function setRegisterLoading(loading) {
  if (!el.registerSubmitBtn) return;
  if (loading) {
    el.registerSubmitBtn.classList.add('loading');
    el.registerSubmitBtn.innerHTML = '<span class="spinner-sm"></span>Creating account...';
    el.registerSubmitBtn.disabled = true;
  } else {
    el.registerSubmitBtn.classList.remove('loading');
    el.registerSubmitBtn.innerHTML = '<i class="fas fa-graduation-cap"></i>Apply Now';
    el.registerSubmitBtn.disabled = false;
  }
}

function getAuthErrorMessage(message) {
  const msg = String(message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Incorrect email or password. Please try again.';
  if (msg.includes('email not confirmed')) return 'Your email is not confirmed yet. Please confirm your email.';
  if (msg.includes('user not found')) return 'No account found with this email. Please register first.';
  if (msg.includes('too many requests')) return 'Too many attempts. Please wait a moment and try again.';
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
  if (msg.includes('network')) return 'Network error. Please check your connection.';
  return message || 'Something went wrong. Please try again.';
}

async function fetchProfileRow(userId) {
  try {
    const res = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (res.error || !res.data) return null;
    const row = res.data;
    if (row && row.user_data && typeof row.user_data === 'object') {
      return Object.assign({ id: userId }, row.user_data);
    }
    return Object.assign({ id: userId }, row);
  } catch (err) {
    return null;
  }
}

if (el.backBtn) {
  el.backBtn.addEventListener('click', function() {
    window.location.href = 'index.html';
  });
}

if (el.topbarLogin) el.topbarLogin.addEventListener('click', openLoginModal);
if (el.topbarRegister) el.topbarRegister.addEventListener('click', openRegisterModal);
if (el.heroStartBtn) el.heroStartBtn.addEventListener('click', openRegisterModal);
if (el.ctaStartBtn) el.ctaStartBtn.addEventListener('click', openRegisterModal);
if (el.earnStartBtn) el.earnStartBtn.addEventListener('click', openRegisterModal);

if (el.heroLearnMore) {
  el.heroLearnMore.addEventListener('click', function() {
    const sec = document.getElementById('featuresSection');
    if (sec) sec.scrollIntoView({ behavior: 'smooth' });
  });
}

if (el.loginModalClose) el.loginModalClose.addEventListener('click', closeLoginModal);
if (el.loginModal) {
  el.loginModal.addEventListener('click', function(e) {
    if (e.target === el.loginModal) closeLoginModal();
  });
}

if (el.registerModalClose) el.registerModalClose.addEventListener('click', closeRegisterModal);
if (el.registerModal) {
  el.registerModal.addEventListener('click', function(e) {
    if (e.target === el.registerModal) closeRegisterModal();
  });
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeLoginModal();
    closeRegisterModal();
  }
});

if (el.loginToRegister) el.loginToRegister.addEventListener('click', function() { openAnyRegister('login'); });
if (el.registerToLogin) el.registerToLogin.addEventListener('click', function() { openAnyLogin('register'); });

if (el.regDepartment) el.regDepartment.addEventListener('change', updateSubjectsDisplay);

if (el.loginPassToggle && el.loginPassword) {
  el.loginPassToggle.addEventListener('click', function() {
    const inp = el.loginPassword;
    const icon = el.loginPassToggle.querySelector('i');
    if (inp.type === 'password') {
      inp.type = 'text';
      if (icon) icon.className = 'fas fa-eye-slash';
    } else {
      inp.type = 'password';
      if (icon) icon.className = 'fas fa-eye';
    }
  });
}

if (el.regPassToggle && el.regPassword) {
  el.regPassToggle.addEventListener('click', function() {
    const inp = el.regPassword;
    const icon = el.regPassToggle.querySelector('i');
    if (inp.type === 'password') {
      inp.type = 'text';
      if (icon) icon.className = 'fas fa-eye-slash';
    } else {
      inp.type = 'password';
      if (icon) icon.className = 'fas fa-eye';
    }
  });
}

if (el.regConfirmPassToggle && el.regConfirmPassword) {
  el.regConfirmPassToggle.addEventListener('click', function() {
    const inp = el.regConfirmPassword;
    const icon = el.regConfirmPassToggle.querySelector('i');
    if (inp.type === 'password') {
      inp.type = 'text';
      if (icon) icon.className = 'fas fa-eye-slash';
    } else {
      inp.type = 'password';
      if (icon) icon.className = 'fas fa-eye';
    }
  });
}

if (el.loginForm) {
  el.loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = normalizeEmail(el.loginEmail ? el.loginEmail.value : '');
    const password = el.loginPassword ? el.loginPassword.value : '';

    if (!email) { showToast('Please enter your email address.', 'error'); return; }
    if (!password) { showToast('Please enter your password.', 'error'); return; }

    if (el.loginError) {
      el.loginError.classList.remove('show');
      el.loginError.textContent = '';
    }

    setLoginLoading(true);

    try {
      const result = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (result.error) {
        const friendly = getAuthErrorMessage(result.error.message);
        if (el.loginError) {
          el.loginError.textContent = friendly;
          el.loginError.classList.add('show');
        }
        showToast(friendly, 'error');
        return;
      }

      const authUser = result.data && result.data.user ? result.data.user : null;

      if (!authUser) {
        const msg = 'Login failed. Please try again.';
        if (el.loginError) {
          el.loginError.textContent = msg;
          el.loginError.classList.add('show');
        }
        showToast(msg, 'error');
        return;
      }

      const profile = await fetchProfileRow(authUser.id);

      let userForStorage;
      if (profile) {
        userForStorage = profile;
      } else {
        userForStorage = {
          id: authUser.id,
          email: authUser.email || email,
          full_name: (authUser.user_metadata && authUser.user_metadata.full_name) || '',
          status: 'pending'
        };
      }
      userForStorage.auth_id = authUser.id;

      localStorage.setItem('idt_user', JSON.stringify(userForStorage));

      showToast('Login successful! Opening your dashboard...', 'success');
      setTimeout(function() { window.location.href = 'jambDash.html'; }, 800);
    } catch (err) {
      const msg = getAuthErrorMessage(err && err.message);
      if (el.loginError) {
        el.loginError.textContent = msg;
        el.loginError.classList.add('show');
      }
      showToast(msg, 'error');
    } finally {
      setLoginLoading(false);
    }
  });
}

if (el.registerForm) {
  el.registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const fullName = el.regFullName ? el.regFullName.value.trim() : '';
    const phone = el.regPhone ? el.regPhone.value.trim() : '';
    const email = normalizeEmail(el.regEmail ? el.regEmail.value : '');
    const gender = el.regGender ? el.regGender.value : '';
    const dob = el.regDob ? el.regDob.value : '';
    const level = el.regLevel ? el.regLevel.value : '';
    const deptId = el.regDepartment ? el.regDepartment.value : '';
    const password = el.regPassword ? el.regPassword.value : '';
    const confirmPassword = el.regConfirmPassword ? el.regConfirmPassword.value : '';
    const coursePrice = 3500;

    if (fullName.length < 3) { showToast('Please enter your full name.', 'error'); return; }
    if (!phone) { showToast('Please enter your phone number.', 'error'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Please enter a valid email address.', 'error'); return; }
    if (!gender) { showToast('Please select your gender.', 'error'); return; }
    if (!dob) { showToast('Please select your date of birth.', 'error'); return; }
    if (!level) { showToast('Please select your education level.', 'error'); return; }
    if (!deptId) { showToast('Please select your department.', 'error'); return; }
    if (password.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }
    if (password !== confirmPassword) { showToast('Passwords do not match.', 'error'); return; }

    const dept = departments.find(d => d.id === deptId);
    const courseName = dept ? dept.name : 'Selected Course';
    const courseSubjects = dept ? dept.subjects.join(', ') : '';

    setRegisterLoading(true);

    if (el.registerError) {
      el.registerError.classList.remove('show');
      el.registerError.textContent = '';
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          phone: phone,
          gender: gender,
          date_of_birth: dob,
          school_level: level,
          course_id: deptId,
          course_name: courseName,
          course_number: courseSubjects,
          course_price: coursePrice,
          password: password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || 'Registration failed. Please try again.';
        if (el.registerError) {
          el.registerError.textContent = msg;
          el.registerError.classList.add('show');
        }
        showToast(msg, 'error');
        return;
      }

      if (data.success && data.user) {
        localStorage.setItem('idt_user', JSON.stringify(data.user));
        showToast('Registration successful! Welcome to IDT Academy!', 'success');
        setTimeout(function() { window.location.href = 'jambDash.html'; }, 1000);
      } else {
        const msg = 'Unexpected response. Please try again.';
        if (el.registerError) {
          el.registerError.textContent = msg;
          el.registerError.classList.add('show');
        }
        showToast(msg, 'error');
      }
    } catch (err) {
      const msg = 'Network error. Please check your connection.';
      if (el.registerError) {
        el.registerError.textContent = msg;
        el.registerError.classList.add('show');
      }
      showToast(msg, 'error');
    } finally {
      setRegisterLoading(false);
    }
  });
}

function init() {
  populateDepartments();
  updateSubjectsDisplay();
  showLoading(true);
  setTimeout(function() {
    showLoading(false);
  }, 800);
}

document.addEventListener('DOMContentLoaded', function() {
  init();
});

setTimeout(function() {
  if (typeof window.__revealPage === 'function') {
    window.__revealPage();
  }
}, 2500);
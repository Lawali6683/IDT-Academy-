import { supabase } from './supabase.js';

(function(){
  'use strict';

  const DOM = {
    wrap: document.getElementById('resetWrap'),
    formSection: document.getElementById('resetFormSection'),
    form: document.getElementById('resetForm'),
    newPassword: document.getElementById('newPassword'),
    confirmPassword: document.getElementById('confirmPassword'),
    btn: document.getElementById('resetBtn'),
    btnLabel: document.getElementById('resetBtnLabel'),
    btnIcon: document.getElementById('resetBtnIcon'),
    successState: document.getElementById('resetSuccess'),
    errorState: document.getElementById('resetError'),
    notif: document.getElementById('resetNotif'),
    notifIcon: document.getElementById('resetNotifIcon'),
    notifMsg: document.getElementById('resetNotifMsg')
  };

  let isProcessing = false;
  let notifTimer = null;
  let recoveryVerified = false;

  function showNotif(msg, isSuccess){
    DOM.notifMsg.textContent = msg;
    DOM.notifIcon.className = 'fa-solid ' + (isSuccess
      ? 'fa-circle-check nf-icon success'
      : 'fa-circle-exclamation nf-icon error');
    DOM.notif.classList.add('active');
    clearTimeout(notifTimer);
    notifTimer = setTimeout(() => DOM.notif.classList.remove('active'), 4500);
  }

  function setButtonLoading(loading){
    DOM.btn.disabled = loading;
    if(loading){
      DOM.btnLabel.textContent = 'Updating password...';
      const spinner = document.createElement('div');
      spinner.className = 'btn-spinner';
      DOM.btn.prepend(spinner);
      DOM.btnIcon.classList.add('hidden');
    } else {
      DOM.btnLabel.textContent = 'Update Password';
      const spinner = DOM.btn.querySelector('.btn-spinner');
      if(spinner) spinner.remove();
      DOM.btnIcon.classList.remove('hidden');
    }
  }

  function showState(state){
    DOM.formSection.style.display = 'none';
    DOM.successState.style.display = 'none';
    DOM.errorState.style.display = 'none';
    if(state === 'success'){
      DOM.successState.style.display = 'flex';
    } else if(state === 'error'){
      DOM.errorState.style.display = 'flex';
    } else {
      DOM.formSection.style.display = 'block';
    }
  }

  function setupPasswordToggles(){
    document.querySelectorAll('.pw-toggle').forEach(function(btn){
      btn.addEventListener('click', function(){
        const input = document.getElementById(btn.dataset.target);
        const icon = btn.querySelector('i');
        if(input.type === 'password'){
          input.type = 'text';
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        } else {
          input.type = 'password';
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        }
      });
    });
  }

  function validatePasswords(){
    const pwd = DOM.newPassword.value;
    const confirm = DOM.confirmPassword.value;

    if(!pwd){
      showNotif('Please enter a new password.', false);
      DOM.newPassword.focus();
      return false;
    }

    if(pwd.length < 6){
      showNotif('Password must be at least 6 characters long.', false);
      DOM.newPassword.focus();
      return false;
    }

    if(!confirm){
      showNotif('Please confirm your new password.', false);
      DOM.confirmPassword.focus();
      return false;
    }

    if(pwd !== confirm){
      showNotif('Passwords do not match. Please try again.', false);
      DOM.confirmPassword.focus();
      return false;
    }

    return true;
  }

  async function handleReset(e){
    e.preventDefault();

    if(isProcessing) return;

    if(!validatePasswords()) return;

    isProcessing = true;
    setButtonLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: DOM.newPassword.value
      });

      if(error){
        console.error('Reset password error:', error);
        if(error.message && error.message.toLowerCase().includes('session')){
          showNotif('Your session has expired. Please request a new reset link.', false);
          showState('error');
        } else if(error.message && error.message.toLowerCase().includes('different from the old')){
          showNotif('New password must be different from the old password.', false);
        } else {
          showNotif(error.message || 'Failed to update password. Please try again.', false);
        }
        return;
      }

      if(!data || !data.user){
        showNotif('Password update failed. Please try again.', false);
        return;
      }

      try { await supabase.auth.signOut(); } catch(_) {}

      showState('success');
      showNotif('Password updated successfully! Redirecting...', true);
      setTimeout(() => {
        window.location.href = '/register.html';
      }, 2200);

    } catch(err){
      console.error('Reset password error:', err);
      showNotif('A network error occurred. Please check your connection and try again.', false);
    } finally {
      isProcessing = false;
      setButtonLoading(false);
    }
  }

  function checkRecoverySession(){
    supabase.auth.onAuthStateChange((event, session) => {
      if(event === 'PASSWORD_RECOVERY' && session){
        recoveryVerified = true;
        showState('form');
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if(data && data.session){
        recoveryVerified = true;
        showState('form');
      } else {
        showState('error');
      }
    }).catch(() => {
      showState('error');
    });
  }

  DOM.form.addEventListener('submit', handleReset);

  window.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('ready');
    setTimeout(() => DOM.wrap.classList.add('ready'), 150);
    setupPasswordToggles();
    checkRecoverySession();
  });
})();

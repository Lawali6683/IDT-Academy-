import { supabase } from './supabase.js';

(function(){
  'use strict';

  const DOM = {
    wrap: document.getElementById('forgetWrap'),
    formSection: document.getElementById('forgetFormSection'),
    success: document.getElementById('forgetSuccess'),
    emailInput: document.getElementById('forgetEmail'),
    btn: document.getElementById('forgetBtn'),
    btnLabel: document.getElementById('forgetBtnLabel'),
    btnIcon: document.getElementById('forgetBtnIcon'),
    successEmail: document.getElementById('forgetSuccessEmail'),
    successEmailDisplay: document.getElementById('forgetSuccessEmailDisplay'),
    toast: document.getElementById('forgetToast'),
    toastIcon: document.getElementById('forgetToastIcon'),
    toastMsg: document.getElementById('forgetToastMsg')
  };

  let isProcessing = false;
  let toastTimer = null;

  function showToast(msg, isSuccess){
    DOM.toastMsg.textContent = msg;
    DOM.toastIcon.className = 'fa-solid ' + (isSuccess
      ? 'fa-circle-check idt-toast-icon success'
      : 'fa-circle-exclamation idt-toast-icon error');
    DOM.toast.classList.add('active');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => DOM.toast.classList.remove('active'), 4500);
  }

  function setButtonLoading(loading){
    DOM.btn.disabled = loading;
    if(loading){
      DOM.btnLabel.textContent = 'Sending reset link...';
      const spinner = document.createElement('div');
      spinner.className = 'btn-spinner';
      DOM.btn.prepend(spinner);
      DOM.btnIcon.classList.add('hidden');
    } else {
      DOM.btnLabel.textContent = 'Recover Password';
      const spinner = DOM.btn.querySelector('.btn-spinner');
      if(spinner) spinner.remove();
      DOM.btnIcon.classList.remove('hidden');
    }
  }

  function isValidEmail(str){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  }

  function showSuccess(email){
    DOM.successEmail.textContent = email;
    DOM.successEmailDisplay.textContent = email;
    DOM.formSection.style.display = 'none';
    DOM.success.style.display = 'flex';
  }

  async function handleSubmit(){
    if(isProcessing) return;

    const email = DOM.emailInput.value.trim().toLowerCase();

    if(!email){
      showToast('Please enter your registered email address.', false);
      DOM.emailInput.focus();
      return;
    }

    if(!isValidEmail(email)){
      showToast('Please enter a valid email address.', false);
      DOM.emailInput.focus();
      return;
    }

    isProcessing = true;
    setButtonLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset.html'
      });

      if(error){
        if(error.message && error.message.toLowerCase().includes('rate limit')){
          showToast('Too many attempts. Please wait a moment and try again.', false);
        } else if(error.message && error.message.toLowerCase().includes('signup')){
          showToast('This email is not registered. Please create an account first.', false);
        } else {
          showToast(error.message || 'Failed to send reset email. Please try again.', false);
        }
        return;
      }

      showSuccess(email);
      showToast('Reset link sent! Check your email inbox.', true);

    } catch(err){
      console.error('Forget password error:', err);
      showToast('A network error occurred. Please check your connection and try again.', false);
    } finally {
      isProcessing = false;
      setButtonLoading(false);
    }
  }

  function openGmail(e){
    if(e) e.preventDefault();
    window.open('https://mail.google.com', '_blank');
  }

  DOM.btn.addEventListener('click', handleSubmit);

  DOM.emailInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){
      e.preventDefault();
      handleSubmit();
    }
  });

  document.getElementById('forgetOpenGmail').addEventListener('click', openGmail);

  window.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('ready');
    setTimeout(() => DOM.wrap.classList.add('ready'), 150);
    DOM.emailInput.focus();
  });
})();

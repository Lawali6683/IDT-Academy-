import { supabase } from './supabase.js';

(function(){
    'use strict';

    var DOM = {
        loader: document.getElementById('idt-loader-2'),
        numEl: document.getElementById('i2num'),
        wrap: document.getElementById('forgetWrap'),
        formSection: document.getElementById('forgetFormSection'),
        success: document.getElementById('forgetSuccess'),
        emailInput: document.getElementById('forgetEmail'),
        btnWrap: document.getElementById('forgetBtnWrap'),
        successEmail: document.getElementById('forgetSuccessEmail'),
        successEmailDisplay: document.getElementById('forgetSuccessEmailDisplay'),
        toast: document.getElementById('forgetToast'),
        toastIcon: document.getElementById('forgetToastIcon'),
        toastMsg: document.getElementById('forgetToastMsg'),
    };

    var loaderInterval = null;
    var isProcessing = false;

    function showLoading() {
        var loader = document.getElementById('idt-loader-2');
        if (loader) {
            loader.classList.remove('idt-hide');
        } else {
            var loaderHTML = [
                '<div class="idt-loader-2" id="idt-loader-2">',
                '<div class="i2-bg">',
                '<span class="i2-blob i2-b1"></span>',
                '<span class="i2-blob i2-b2"></span>',
                '<span class="i2-blob i2-b3"></span>',
                '<span class="i2-glow"></span>',
                '<span class="i2-grid"></span>',
                '<span class="i2-star i2-s1"></span><span class="i2-star i2-s2"></span>',
                '<span class="i2-star i2-s3"></span><span class="i2-star i2-s4"></span>',
                '<span class="i2-star i2-s5"></span><span class="i2-star i2-s6"></span>',
                '<span class="i2-star i2-s7"></span><span class="i2-star i2-s8"></span>',
                '<span class="i2-star i2-s9"></span><span class="i2-star i2-s10"></span>',
                '<span class="i2-star i2-s11"></span><span class="i2-star i2-s12"></span>',
                '</div>',
                '<div class="i2-wrap">',
                '<div class="i2-bookwrap">',
                '<span class="i2-orbit"></span>',
                '<div class="i2-book">',
                '<div class="i2-cover i2-cl"><img src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy" class="i2-coverlogo"></div>',
                '<div class="i2-cover i2-cr"><img src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy" class="i2-coverlogo i2-crlogo"></div>',
                '<div class="i2-page i2-p1"><i></i><i></i><i></i><i></i></div>',
                '<div class="i2-page i2-p2"><i></i><i></i><i></i></div>',
                '<div class="i2-page i2-p3"><i></i><i></i></div>',
                '<div class="i2-spine"></div>',
                '<div class="i2-ribbon"></div>',
                '</div>',
                '</div>',
                '<span class="i2-title">IDT <b>Academy</b></span>',
                '<span class="i2-tagline">Learn Beyond Limits</span>',
                '<div class="i2-loadbar"><span></span></div>',
                '<p class="i2-status">Turning pages... <b id="i2num">0</b>%</p>',
                '</div>',
                '<style>',
                '.idt-loader-2{position:fixed;inset:0;z-index:99999;background:#05060f;display:flex;align-items:center;justify-content:center;font-family:\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;transition:opacity .6s ease,visibility .6s ease;overflow:hidden;user-select:none}',
                '.idt-loader-2.idt-hide{opacity:0;visibility:hidden;pointer-events:none}',
                '.i2-bg{position:absolute;inset:0;overflow:hidden}',
                '.i2-blob{position:absolute;border-radius:50%;filter:blur(75px);opacity:.5}',
                '.i2-b1{width:420px;height:420px;left:-130px;top:-130px;background:#7c3aed;animation:i2drift1 14s ease-in-out infinite}',
                '.i2-b2{width:380px;height:380px;right:-110px;top:18%;background:#0ea5e9;animation:i2drift2 17s ease-in-out infinite}',
                '.i2-b3{width:320px;height:320px;left:32%;bottom:-150px;background:#f59e0b;opacity:.3;animation:i2drift3 19s ease-in-out infinite}',
                '@keyframes i2drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(90px,70px) scale(1.18)}}',
                '@keyframes i2drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-80px,60px) scale(1.12)}}',
                '@keyframes i2drift3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(60px,-70px) scale(1.2)}}',
                '.i2-glow{position:absolute;left:50%;top:50%;width:620px;height:620px;transform:translate(-50%,-50%);border-radius:50%;background:conic-gradient(from 0deg,transparent,rgba(124,92,255,.22),transparent 30%,rgba(34,211,238,.18),transparent 60%,rgba(251,191,36,.16),transparent);filter:blur(55px);animation:i2spin 11s linear infinite}',
                '.i2-grid{position:absolute;left:-60%;right:-60%;bottom:-8%;height:42%;background-image:linear-gradient(rgba(124,92,255,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(124,92,255,.16) 1px,transparent 1px);background-size:46px 46px;transform:perspective(420px) rotateX(60deg);transform-origin:bottom;animation:i2gridmove 3.4s linear infinite;-webkit-mask-image:linear-gradient(to top,rgba(0,0,0,.9),transparent);mask-image:linear-gradient(to top,rgba(0,0,0,.9),transparent)}',
                '@keyframes i2gridmove{to{background-position-y:46px}}',
                '.i2-star{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;animation:i2twinkle 3.2s ease-in-out infinite}',
                '.i2-s1{left:10%;top:16%}.i2-s2{left:82%;top:10%;animation-delay:.7s}.i2-s3{left:24%;top:78%;animation-delay:1.2s}',
                '.i2-s4{left:70%;top:80%;animation-delay:1.8s}.i2-s5{left:45%;top:6%;animation-delay:.4s}.i2-s6{left:6%;top:48%;animation-delay:2.2s}',
                '.i2-s7{left:92%;top:42%;animation-delay:1.5s}.i2-s8{left:58%;top:90%;animation-delay:.9s}.i2-s9{left:34%;top:24%;animation-delay:2.6s}',
                '.i2-s10{left:66%;top:30%;animation-delay:.2s}.i2-s11{left:16%;top:60%;animation-delay:1.9s}.i2-s12{left:88%;top:66%;animation-delay:2.9s}',
                '@keyframes i2twinkle{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:1;transform:scale(1.25)}}',
                '.i2-wrap{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center}',
                '.i2-bookwrap{position:relative;width:240px;height:240px;display:flex;align-items:center;justify-content:center}',
                '.i2-orbit{position:absolute;left:50%;top:50%;width:226px;height:226px;margin:-113px 0 0 -113px;border:1px dashed rgba(167,139,250,.35);border-radius:50%;animation:i2spin 8s linear infinite;pointer-events:none}',
                '.i2-orbit::before{content:"";position:absolute;top:-4px;left:50%;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:#fbbf24;box-shadow:0 0 14px #fbbf24}',
                '@keyframes i2spin{to{transform:rotate(360deg)}}',
                '.i2-book{position:relative;width:180px;height:126px;perspective:800px;animation:i2float 3.6s ease-in-out infinite;filter:drop-shadow(0 24px 40px rgba(124,92,255,.3))}',
                '@keyframes i2float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}',
                '.i2-cover{position:absolute;top:0;width:50%;height:100%;background:linear-gradient(180deg,#8b5cf6,#6d28d9);box-shadow:0 14px 30px rgba(0,0,0,.35)}',
                '.i2-cl{left:0;border-radius:6px 2px 2px 6px;transform-origin:right center;animation:i2sway 3.6s ease-in-out infinite;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#a78bfa 0%,#8b5cf6 45%,#6d28d9 100%)}',
                '.i2-cr{right:0;border-radius:2px 6px 6px 2px;transform-origin:left center;background:linear-gradient(145deg,#7c3aed 0%,#6d28d9 50%,#4c1d95 100%);animation:i2sway 3.6s ease-in-out infinite reverse;display:flex;align-items:center;justify-content:center}',
                '@keyframes i2sway{0%,100%{transform:rotateY(0)}50%{transform:rotateY(16deg)}}',
                '.i2-coverlogo{width:48px;height:48px;object-fit:contain;background:#fff;border-radius:50%;padding:7px;box-shadow:0 6px 18px rgba(0,0,0,.4),0 0 0 2px rgba(255,255,255,.25)}',
                '.i2-crlogo{width:42px;height:42px;opacity:.85}',
                '.i2-page{position:absolute;top:5px;left:50%;width:46%;height:92%;background:linear-gradient(180deg,#f8fafc,#e2e8f0);border-radius:2px 6px 6px 2px;transform-origin:left center;box-shadow:0 0 16px rgba(0,0,0,.3);display:flex;flex-direction:column;padding-top:8px}',
                '.i2-page i{display:block;height:2px;border-radius:2px;background:#cbd5e1;margin:5px 10px}',
                '.i2-page i:nth-child(2){width:78%;background:#c4b5fd}',
                '.i2-page i:nth-child(3){width:60%}',
                '.i2-page i:nth-child(4){width:86%;background:#a5f3fc}',
                '.i2-p1{z-index:3;animation:i2flip 3.6s ease-in-out infinite}',
                '.i2-p2{z-index:2;animation:i2flip 3.6s ease-in-out 1.2s infinite}',
                '.i2-p3{z-index:1;animation:i2flip 3.6s ease-in-out 2.4s infinite}',
                '@keyframes i2flip{0%{transform:rotateY(0)}40%{transform:rotateY(-160deg)}70%,100%{transform:rotateY(0)}}',
                '.i2-spine{position:absolute;left:50%;top:0;bottom:0;width:9px;margin-left:-4.5px;background:linear-gradient(90deg,rgba(0,0,0,.45),rgba(0,0,0,.05) 50%,rgba(0,0,0,.45));border-radius:4px;z-index:4}',
                '.i2-ribbon{position:absolute;left:50%;bottom:-24px;width:13px;height:24px;margin-left:-6.5px;background:linear-gradient(180deg,#fbbf24,#d97706);border-radius:0 0 7px 7px;transform-origin:top center;z-index:5;animation:i2dangle 3.6s ease-in-out infinite;box-shadow:0 6px 14px rgba(217,119,6,.45)}',
                '@keyframes i2dangle{0%,100%{transform:rotate(0)}50%{transform:rotate(12deg)}}',
                '.i2-title{margin-top:18px;font-size:27px;font-weight:800;letter-spacing:5px;text-transform:uppercase;background:linear-gradient(90deg,#f8fafc 0%,#a78bfa 30%,#22d3ee 55%,#fbbf24 80%,#f8fafc 100%);background-size:220% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:i2shine 4s linear infinite}',
                '.i2-title b{font-weight:900}',
                '@keyframes i2shine{to{background-position:220% center}}',
                '.i2-tagline{margin-top:9px;font-size:11px;letter-spacing:7px;color:#8b93c7;text-transform:uppercase}',
                '.i2-loadbar{width:230px;height:4px;border-radius:4px;background:rgba(255,255,255,.09);margin-top:24px;overflow:hidden}',
                '.i2-loadbar span{display:block;height:100%;width:100%;border-radius:4px;background:linear-gradient(90deg,#7c3aed,#22d3ee,#fbbf24);transform-origin:left;animation:i2fill 2.8s ease-in-out forwards}',
                '@keyframes i2fill{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}',
                '.i2-status{margin-top:13px;font-size:12px;letter-spacing:3px;color:#94a3b8;text-transform:uppercase;animation:i2fade 2.4s ease-in-out infinite}',
                '.i2-status b{color:#fbbf24}',
                '@keyframes i2fade{0%,100%{opacity:.45}50%{opacity:1}}',
                '</style>'
            ].join('\n');
            document.body.insertAdjacentHTML('beforeend', loaderHTML);
        }
        var n = document.getElementById('i2num');
        var c = 0;
        if (window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
        window.idtLoaderInterval = setInterval(function(){
            c += 5;
            if(n) n.textContent = (c >= 100 ? 100 : c);
            if(c >= 100) clearInterval(window.idtLoaderInterval);
        }, 30);
    }

    function hideLoading(){
        if (window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
        var l = document.getElementById('idt-loader-2');
        if(l) l.classList.add('idt-hide');
    }

    document.addEventListener('DOMContentLoaded', function(){
        showLoading();
        window.addEventListener('load', function(){
            setTimeout(hideLoading, 500);
        });
        setTimeout(function(){
            DOM.wrap.classList.add('ready');
        }, 2200);
    });

    function showToast(msg, isSuccess){
        DOM.toastMsg.textContent = msg;
        DOM.toastIcon.className = 'fa-solid ' + (isSuccess ? 'fa-circle-check idt-toast-icon success' : 'fa-circle-exclamation idt-toast-icon error');
        DOM.toast.classList.add('active');
        clearTimeout(window._toastTimer);
        window._toastTimer = setTimeout(function(){
            DOM.toast.classList.remove('active');
        }, 4000);
    }

    function generatePassword(){
        var upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var lower = 'abcdefghijklmnopqrstuvwxyz';
        var digits = '0123456789';
        var special = '@#$&*!';
        var all = upper + lower + digits + special;
        var pwd = '';
        pwd += upper.charAt(Math.floor(Math.random() * upper.length));
        pwd += lower.charAt(Math.floor(Math.random() * lower.length));
        pwd += digits.charAt(Math.floor(Math.random() * digits.length));
        pwd += special.charAt(Math.floor(Math.random() * special.length));
        for(var i = 0; i < 12; i++){
            pwd += all.charAt(Math.floor(Math.random() * all.length));
        }
        return pwd.split('').sort(function(){ return 0.5 - Math.random(); }).join('');
    }

    function showButtonLoading(){
        DOM.btnWrap.innerHTML = '<div class="forget-inner-loader"><div class="forget-spinner"></div><span class="forget-spinner-text">Verifying credentials...</span></div>';
    }

    function restoreButton(){
        DOM.btnWrap.innerHTML = '<button class="forget-btn" id="forgetBtn"><span>Recover Password</span><i class="fa-solid fa-arrow-right"></i></button>';
        document.getElementById('forgetBtn').addEventListener('click', handleSubmit);
    }

    function showSuccess(email){
        DOM.successEmail.textContent = email;
        if(DOM.successEmailDisplay) DOM.successEmailDisplay.textContent = email;
        DOM.formSection.style.display = 'none';
        DOM.success.style.display = 'flex';
    }

    function isValidEmail(str){
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    }

    var FORGET_WORKER_URL = 'https://forget-worker.idtacademy.workers.dev';

    async function sendPasswordEmail(email, newPassword, fullName){
        try {
            var res = await fetch(FORGET_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'forget',
                    email: email,
                    password: newPassword,
                    name: fullName || 'Valued Student'
                })
            });
            var data = await res.json();
            return res.ok && data.success;
        } catch(e){
            return false;
        }
    }

    async function handleSubmit(){
        if(isProcessing) return;
        var email = DOM.emailInput.value.trim().toLowerCase();

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
        showButtonLoading();

        try {
            var { data: allProfiles, error: fetchErr } = await supabase
                .from('profiles')
                .select('id, user_data');

            if(fetchErr) throw fetchErr;

            if(!allProfiles || allProfiles.length === 0){
                showToast('No accounts found. Please check your email.', false);
                isProcessing = false;
                restoreButton();
                return;
            }

            var matchedProfile = null;
            for(var i = 0; i < allProfiles.length; i++){
                var ud = allProfiles[i].user_data;
                if(ud && ud.email && ud.email.trim().toLowerCase() === email){
                    matchedProfile = allProfiles[i];
                    break;
                }
            }

            if(!matchedProfile){
                showToast('This email is not registered in our system.', false);
                isProcessing = false;
                restoreButton();
                return;
            }

            var userId = matchedProfile.id;
            var userData = matchedProfile.user_data;
            var fullName = userData.full_name || 'Valued Student';

            var newPassword = generatePassword();

            var salt = bcrypt.genSaltSync(10);
            var hash = bcrypt.hashSync(newPassword, salt);

            var updatedUserData = JSON.parse(JSON.stringify(userData));
            updatedUserData.password_hash = hash;
            updatedUserData.password_salt = salt;

            var { error: updateErr } = await supabase
                .from('profiles')
                .update({ user_data: updatedUserData })
                .eq('id', userId);

            if(updateErr) throw updateErr;

            var emailSent = await sendPasswordEmail(email, newPassword, fullName);

            if(!emailSent){
                showToast('Password reset successful but email dispatch failed. Contact support.', false);
                isProcessing = false;
                restoreButton();
                return;
            }

            showToast('New password sent to your email!', true);
            setTimeout(function(){
                showSuccess(email);
            }, 900);

        } catch(err){
            console.error('Forget password error:', err);
            showToast('A network error occurred. Please try again.', false);
            isProcessing = false;
            restoreButton();
        }
    }

    document.getElementById('forgetBtn').addEventListener('click', handleSubmit);

    DOM.emailInput.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
            e.preventDefault();
            handleSubmit();
        }
    });

    document.getElementById('forgetSuccessIcon').addEventListener('click', function(){
        window.location.href = 'googlegmail://';
        setTimeout(function(){
            window.open('https://mail.google.com', '_blank');
        }, 1200);
    });

    document.getElementById('forgetOpenGmail').addEventListener('click', function(e){
        e.preventDefault();
        window.location.href = 'googlegmail://';
        setTimeout(function(){
            window.open('https://mail.google.com', '_blank');
        }, 1200);
    });

    document.getElementById('menuToggle').addEventListener('click', function(){
        document.getElementById('sideMenu').classList.add('open');
        document.getElementById('ovBackdrop').classList.add('active');
    });

    document.getElementById('menuClose').addEventListener('click', function(){
        document.getElementById('sideMenu').classList.remove('open');
        document.getElementById('ovBackdrop').classList.remove('active');
    });

    document.getElementById('ovBackdrop').addEventListener('click', function(){
        document.getElementById('sideMenu').classList.remove('open');
        document.getElementById('ovBackdrop').classList.remove('active');
    });

})();


document.addEventListener('DOMContentLoaded', () => {
  
 document.documentElement.classList.add('ready');
});
import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);
let currentUserId = '';
let currentUd = {};
let currentProfileUrl = '';

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function has(v) {
  return v != null && String(v).trim() !== '';
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
}

function formatMoney(v) {
  return '₦' + Number(v||0).toLocaleString();
}

function removePush(card) {
  card.classList.add('out');
  setTimeout(()=>card.remove(),320);
}

function pushShow(type,title,message) {
  const icons={success:'fa-circle-check',error:'fa-circle-xmark',info:'fa-circle-info'};
  const card=document.createElement('div');
  card.className='push-card '+type;
  card.innerHTML='<img class="push-logo" src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy"><div class="push-body"><b><i class="fa-solid '+icons[type]+'"></i> '+escapeHtml(title)+'</b><p>'+escapeHtml(message)+'</p></div><button class="push-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
  card.querySelector('.push-x').addEventListener('click',()=>removePush(card));
  const wrap = $('pushWrap') || document.body;
  wrap.appendChild(card);
  if(type==='success') setTimeout(()=>removePush(card),6000);
}

async function copyText(txt) {
  if(navigator.clipboard && navigator.clipboard.writeText){
    await navigator.clipboard.writeText(txt);
  } else {
    const ta=document.createElement('textarea');
    ta.value=txt;
    ta.style.position='fixed';
    ta.style.opacity='0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function getExamData(ud) {
  return Array.isArray(ud.exam_data)?ud.exam_data:[];
}

function lastExam(ud) {
  const arr=getExamData(ud);
  return arr.length?arr[arr.length-1]:null;
}

function showLoading() {
  let loader=document.getElementById('idt-loader-2');
  if(loader){
    loader.classList.remove('idt-hide');
  } else {
    const loaderHTML=`
      <div class="idt-loader-2" id="idt-loader-2">
        <div class="i2-bg">
          <span class="i2-blob i2-b1"></span>
          <span class="i2-blob i2-b2"></span>
          <span class="i2-blob i2-b3"></span>
          <span class="i2-glow"></span>
          <span class="i2-grid"></span>
          <span class="i2-star i2-s1"></span><span class="i2-star i2-s2"></span>
          <span class="i2-star i2-s3"></span><span class="i2-star i2-s4"></span>
          <span class="i2-star i2-s5"></span><span class="i2-star i2-s6"></span>
          <span class="i2-star i2-s7"></span><span class="i2-star i2-s8"></span>
          <span class="i2-star i2-s9"></span><span class="i2-star i2-s10"></span>
          <span class="i2-star i2-s11"></span><span class="i2-star i2-s12"></span>
        </div>
        <div class="i2-wrap">
          <div class="i2-bookwrap">
            <span class="i2-orbit"></span>
            <div class="i2-book">
              <div class="i2-cover i2-cl"><img src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy" class="i2-coverlogo"></div>
              <div class="i2-cover i2-cr"><img src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy" class="i2-coverlogo i2-crlogo"></div>
              <div class="i2-page i2-p1"><i></i><i></i><i></i><i></i></div>
              <div class="i2-page i2-p2"><i></i><i></i><i></i></div>
              <div class="i2-page i2-p3"><i></i><i></i></div>
              <div class="i2-spine"></div>
              <div class="i2-ribbon"></div>
            </div>
          </div>
          <span class="i2-title">IDT <b>Academy</b></span>
          <span class="i2-tagline">Learn Beyond Limits</span>
          <div class="i2-loadbar"><span></span></div>
          <p class="i2-status">Loading... <b id="i2num">0</b>%</p>
        </div>
      </div>
      <style>
        .idt-loader-2{position:fixed;inset:0;z-index:99999;background:#05060f;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;transition:opacity .6s ease,visibility .6s ease;overflow:hidden;user-select:none}
        .idt-loader-2.idt-hide{opacity:0;visibility:hidden;pointer-events:none}
        .i2-bg{position:absolute;inset:0;overflow:hidden}
        .i2-blob{position:absolute;border-radius:50%;filter:blur(75px);opacity:.5}
        .i2-b1{width:420px;height:420px;left:-130px;top:-130px;background:#7c3aed;animation:i2drift1 14s ease-in-out infinite}
        .i2-b2{width:380px;height:380px;right:-110px;top:18%;background:#0ea5e9;animation:i2drift2 17s ease-in-out infinite}
        .i2-b3{width:320px;height:320px;left:32%;bottom:-150px;background:#f59e0b;opacity:.3;animation:i2drift3 19s ease-in-out infinite}
        @keyframes i2drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(90px,70px) scale(1.18)}}
        @keyframes i2drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-80px,60px) scale(1.12)}}
        @keyframes i2drift3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(60px,-70px) scale(1.2)}}
        .i2-glow{position:absolute;left:50%;top:50%;width:620px;height:620px;transform:translate(-50%,-50%);border-radius:50%;background:conic-gradient(from 0deg,transparent,rgba(124,92,255,.22),transparent 30%,rgba(34,211,238,.18),transparent 60%,rgba(251,191,36,.16),transparent);filter:blur(55px);animation:i2spin 11s linear infinite}
        .i2-grid{position:absolute;left:-60%;right:-60%;bottom:-8%;height:42%;background-image:linear-gradient(rgba(124,92,255,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(124,92,255,.16) 1px,transparent 1px);background-size:46px 46px;transform:perspective(420px) rotateX(60deg);transform-origin:bottom;animation:i2gridmove 3.4s linear infinite;-webkit-mask-image:linear-gradient(to top,rgba(0,0,0,.9),transparent);mask-image:linear-gradient(to top,rgba(0,0,0,.9),transparent)}
        @keyframes i2gridmove{to{background-position-y:46px}}
        .i2-star{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;animation:i2twinkle 3.2s ease-in-out infinite}
        .i2-s1{left:10%;top:16%}.i2-s2{left:82%;top:10%;animation-delay:.7s}.i2-s3{left:24%;top:78%;animation-delay:1.2s}
        .i2-s4{left:70%;top:80%;animation-delay:1.8s}.i2-s5{left:45%;top:6%;animation-delay:.4s}.i2-s6{left:6%;top:48%;animation-delay:2.2s}
        .i2-s7{left:92%;top:42%;animation-delay:1.5s}.i2-s8{left:58%;top:90%;animation-delay:.9s}.i2-s9{left:34%;top:24%;animation-delay:2.6s}
        .i2-s10{left:66%;top:30%;animation-delay:.2s}.i2-s11{left:16%;top:60%;animation-delay:1.9s}.i2-s12{left:88%;top:66%;animation-delay:2.9s}
        @keyframes i2twinkle{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:1;transform:scale(1.25)}}
        .i2-wrap{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center}
        .i2-bookwrap{position:relative;width:240px;height:240px;display:flex;align-items:center;justify-content:center}
        .i2-orbit{position:absolute;left:50%;top:50%;width:226px;height:226px;margin:-113px 0 0 -113px;border:1px dashed rgba(167,139,250,.35);border-radius:50%;animation:i2spin 8s linear infinite;pointer-events:none}
        .i2-orbit::before{content:"";position:absolute;top:-4px;left:50%;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:#fbbf24;box-shadow:0 0 14px #fbbf24}
        @keyframes i2spin{to{transform:rotate(360deg)}}
        .i2-book{position:relative;width:180px;height:126px;perspective:800px;animation:i2float 3.6s ease-in-out infinite;filter:drop-shadow(0 24px 40px rgba(124,92,255,.3))}
        @keyframes i2float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .i2-cover{position:absolute;top:0;width:50%;height:100%;background:linear-gradient(180deg,#8b5cf6,#6d28d9);box-shadow:0 14px 30px rgba(0,0,0,.35)}
        .i2-cl{left:0;border-radius:6px 2px 2px 6px;transform-origin:right center;animation:i2sway 3.6s ease-in-out infinite;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#a78bfa 0%,#8b5cf6 45%,#6d28d9 100%)}
        .i2-cr{right:0;border-radius:2px 6px 6px 2px;transform-origin:left center;background:linear-gradient(145deg,#7c3aed 0%,#6d28d9 50%,#4c1d95 100%);animation:i2sway 3.6s ease-in-out infinite reverse;display:flex;align-items:center;justify-content:center}
        @keyframes i2sway{0%,100%{transform:rotateY(0)}50%{transform:rotateY(16deg)}}
        .i2-coverlogo{width:48px;height:48px;object-fit:contain;background:#fff;border-radius:50%;padding:7px;box-shadow:0 6px 18px rgba(0,0,0,.4),0 0 0 2px rgba(255,255,255,.25)}
        .i2-crlogo{width:42px;height:42px;opacity:.85}
        .i2-page{position:absolute;top:5px;left:50%;width:46%;height:92%;background:linear-gradient(180deg,#f8fafc,#e2e8f0);border-radius:2px 6px 6px 2px;transform-origin:left center;box-shadow:0 0 16px rgba(0,0,0,.3);display:flex;flex-direction:column;padding-top:8px}
        .i2-page i{display:block;height:2px;border-radius:2px;background:#cbd5e1;margin:5px 10px}
        .i2-page i:nth-child(2){width:78%;background:#c4b5fd}
        .i2-page i:nth-child(3){width:60%}
        .i2-page i:nth-child(4){width:86%;background:#a5f3fc}
        .i2-p1{z-index:3;animation:i2flip 3.6s ease-in-out infinite}
        .i2-p2{z-index:2;animation:i2flip 3.6s ease-in-out 1.2s infinite}
        .i2-p3{z-index:1;animation:i2flip 3.6s ease-in-out 2.4s infinite}
        @keyframes i2flip{0%{transform:rotateY(0)}40%{transform:rotateY(-160deg)}70%,100%{transform:rotateY(0)}}
        .i2-spine{position:absolute;left:50%;top:0;bottom:0;width:9px;margin-left:-4.5px;background:linear-gradient(90deg,rgba(0,0,0,.45),rgba(0,0,0,.05) 50%,rgba(0,0,0,.45));border-radius:4px;z-index:4}
        .i2-ribbon{position:absolute;left:50%;bottom:-24px;width:13px;height:24px;margin-left:-6.5px;background:linear-gradient(180deg,#fbbf24,#d97706);border-radius:0 0 7px 7px;transform-origin:top center;z-index:5;animation:i2dangle 3.6s ease-in-out infinite;box-shadow:0 6px 14px rgba(217,119,6,.45)}
        @keyframes i2dangle{0%,100%{transform:rotate(0)}50%{transform:rotate(12deg)}}
        .i2-title{margin-top:18px;font-size:27px;font-weight:800;letter-spacing:5px;text-transform:uppercase;background:linear-gradient(90deg,#f8fafc 0%,#a78bfa 30%,#22d3ee 55%,#fbbf24 80%,#f8fafc 100%);background-size:220% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:i2shine 4s linear infinite}
        .i2-title b{font-weight:900}
        @keyframes i2shine{to{background-position:220% center}}
        .i2-tagline{margin-top:9px;font-size:11px;letter-spacing:7px;color:#8b93c7;text-transform:uppercase}
        .i2-loadbar{width:230px;height:4px;border-radius:4px;background:rgba(255,255,255,.09);margin-top:24px;overflow:hidden}
        .i2-loadbar span{display:block;height:100%;width:100%;border-radius:4px;background:linear-gradient(90deg,#7c3aed,#22d3ee,#fbbf24);transform-origin:left;animation:i2fill 2.8s ease-in-out forwards}
        @keyframes i2fill{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
        .i2-status{margin-top:13px;font-size:12px;letter-spacing:3px;color:#94a3b8;text-transform:uppercase;animation:i2fade 2.4s ease-in-out infinite}
        .i2-status b{color:#fbbf24}
        @keyframes i2fade{0%,100%{opacity:.45}50%{opacity:1}}
      </style>
    `;
    document.body.insertAdjacentHTML('beforeend',loaderHTML);
  }
  const n=document.getElementById('i2num');
  let c=0;
  if(window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
  window.idtLoaderInterval=setInterval(function(){c+=5;if(n)n.textContent=(c>=100?100:c);if(c>=100)clearInterval(window.idtLoaderInterval);},30);
}

function hideLoading() {
  const l=document.getElementById('idt-loader-2');
  if(window.idtLoaderInterval) clearInterval(window.idtLoaderInterval);
  if(l) l.classList.add('idt-hide');
}

function showNoSession() {
  if($('profileView')) $('profileView').classList.add('hidden');
  if($('noSessionView')) $('noSessionView').classList.remove('hidden');
  if($('userBadge')) $('userBadge').classList.add('hidden');
  if($('btnLogout')) $('btnLogout').classList.add('hidden');
}

function showProfile() {
  if($('noSessionView')) $('noSessionView').classList.add('hidden');
  if($('profileView')) $('profileView').classList.remove('hidden');
  if($('userBadge')) $('userBadge').classList.remove('hidden');
  if($('btnLogout')) $('btnLogout').classList.remove('hidden');
}

function statusBadge(st) {
  const s=String(st||'active').toLowerCase();
  const map={pending:['amber','fa-clock'],active:['green','fa-circle-check'],paid:['cyan','fa-credit-card'],started:['violet','fa-play'],completed:['green','fa-check-double'],passed:['green','fa-circle-check']};
  const m=map[s]||['green','fa-circle-check'];
  return '<span class="badge '+m[0]+'"><i class="fa-solid '+m[1]+'"></i> '+escapeHtml(s)+'</span>';
}

function buildSteps(ud) {
  const steps=[];
  steps.push({icon:'fa-user-check',state:'done',title:'Registered',sub:has(ud.date_registered)?'Member since '+formatDate(ud.date_registered):'Account created successfully'});
  if(has(ud.course_id)||has(ud.course_name)){steps.push({icon:'fa-book-open',state:'done',title:'Course Started',sub:has(ud.course_name)?ud.course_name:'Course enrollment active'});}
  if(has(ud.assessment_grade)){steps.push({icon:'fa-clipboard-check',state:'done',title:'Assessment Completed',sub:'Grade: '+ud.assessment_grade});}
  const exams=getExamData(ud);
  if(exams.length){
    const last=exams[exams.length-1];
    const passed=last.passed===true;
    steps.push({icon:'fa-file-pen',state:passed?'done':'current',title:'Final Exam',sub:passed?(has(last.pct)?'Passed • '+last.pct+'%':'Passed successfully'):(has(last.pct)?'Attempted • '+last.pct+'%':'Attempted')});
    if(passed){steps.push({icon:'fa-award',state:'done',title:'Certificate Ready',sub:'You qualified for your IDT Academy certificate'});}
  }
  if(!$('stepsWrap')) return steps;
  if(!steps.length){$('stepsWrap').innerHTML='<div class="empty-state"><i class="fa-solid fa-seedling"></i><b>Your journey starts here</b><p>Complete your registration and enroll in a course to begin.</p></div>';return steps;}
  $('stepsWrap').innerHTML=steps.map((s)=>{const ic=s.state==='done'?'fa-check':'fa-hourglass-half';const icCls=s.state==='done'?'done':'current';return '<div class="step"><div class="step-ic '+icCls+'"><i class="fa-solid '+ic+'"></i></div><div class="step-body"><b>'+escapeHtml(s.title)+'</b><span>'+escapeHtml(s.sub)+'</span></div></div>';}).join('');
  return steps;
}

function buildStats(ud) {
  const exams=getExamData(ud);
  const last=exams.length?exams[exams.length-1]:null;
  const items=[];
  items.push({icon:'fa-coins',cls:'gold',label:'Referral Bonus',val:formatMoney(ud.referral_bonus)});
  if(has(ud.exam_grade)){items.push({icon:'fa-file-pen',cls:'cyan',label:'Exam Grade',val:String(ud.exam_grade)});}
  else if(last&&has(last.pct)){items.push({icon:'fa-file-pen',cls:'cyan',label:'Exam Score',val:last.pct+'%'});}
  if(has(ud.assessment_grade)){items.push({icon:'fa-clipboard-check',cls:'',label:'Assessment',val:String(ud.assessment_grade)});}
  if(has(ud.level_completed)){items.push({icon:'fa-layer-group',cls:'cyan',label:'Level Completed',val:String(ud.level_completed)});}
  if(!$('statsGrid')) return;
  if(!items.length){$('statsGrid').innerHTML='';return;}
  $('statsGrid').innerHTML=items.map((s)=>'<div class="stat-card '+s.cls+'"><i class="fa-solid '+s.icon+'"></i><div><b>'+escapeHtml(s.val)+'</b><span>'+escapeHtml(s.label)+'</span></div></div>').join('');
}

function buildActions(ud) {
  const exams=getExamData(ud);
  const last=exams.length?exams[exams.length-1]:null;
  const passed=!!(last&&last.passed===true);
  const hasCourse=has(ud.course_id)||has(ud.course_name);
  const btns=[];
  btns.push('<a class="act-btn" href="https://www.idtacademy.com.ng/dashboard"><i class="fa-solid fa-gauge-high"></i> Dashboard</a>');
  btns.push('<a class="act-btn" href="https://www.idtacademy.com.ng/referral"><i class="fa-solid fa-users"></i> Referral</a>');
  if(hasCourse&&!passed){btns.push('<a class="act-btn primary" href="https://www.idtacademy.com.ng/exam"><i class="fa-solid fa-file-pen"></i> Final Exam</a>');}
  if(passed){btns.push('<a class="act-btn primary" href="https://www.idtacademy.com.ng/certificate"><i class="fa-solid fa-award"></i> My Certificate</a>');}
  if($('quickActions')) $('quickActions').innerHTML=btns.join('');
}

function fillCourse(ud) {
  const hasCourse=has(ud.course_id)||has(ud.course_name);
  const body=$('courseBody');
  if(!body) return;
  if(!hasCourse){body.innerHTML='<div class="empty-state"><i class="fa-solid fa-book-open"></i><b>No Course Yet</b><p>You have not enrolled in any course yet.</p><a href="https://www.idtacademy.com.ng/courses"><i class="fa-solid fa-graduation-cap"></i> Browse Courses</a></div>';return;}
  const rows=[];
  if(has(ud.course_name)) rows.push('<div class="kv-box"><span>Course Name</span><b>'+escapeHtml(ud.course_name)+'</b></div>');
  if(has(ud.course_number)) rows.push('<div class="kv-box"><span>Course Number</span><b>'+escapeHtml(ud.course_number)+'</b></div>');
  if(has(ud.course_id)) rows.push('<div class="kv-box"><span>Course ID</span><b>'+escapeHtml(ud.course_id)+'</b></div>');
  if(has(ud.course_price)) rows.push('<div class="kv-box"><span>Course Price</span><b>'+formatMoney(ud.course_price)+'</b></div>');
  if(has(ud.status)) rows.push('<div class="kv-box"><span>Status</span><b>'+statusBadge(ud.status)+'</b></div>');
  body.innerHTML='<div class="kv-grid">'+rows.join('')+'</div>';
}

function fillPersonal(ud) {
  const rows=[];
  if(has(ud.full_name)) rows.push('<div class="kv-box"><span>Full Name</span><b>'+escapeHtml(ud.full_name)+'</b></div>');
  if(has(ud.email)) rows.push('<div class="kv-box"><span>Email</span><b>'+escapeHtml(ud.email)+'</b></div>');
  if(has(ud.phone)) rows.push('<div class="kv-box"><span>Phone</span><b>'+escapeHtml(ud.phone)+'</b></div>');
  if(has(ud.gender)) rows.push('<div class="kv-box"><span>Gender</span><b>'+escapeHtml(ud.gender)+'</b></div>');
  const dob=ud.date_of_birth||ud.dob||'';
  if(has(dob)) rows.push('<div class="kv-box"><span>Date of Birth</span><b>'+escapeHtml(formatDate(dob))+'</b></div>');
  if(has(ud.date_registered)) rows.push('<div class="kv-box"><span>Date Registered</span><b>'+escapeHtml(formatDate(ud.date_registered))+'</b></div>');
  if(!rows.length){rows.push('<div class="kv-box"><span>Email</span><b>'+escapeHtml(ud.email||'—')+'</b></div>');}
  if($('personalGrid')) $('personalGrid').innerHTML=rows.join('');
}

function buildExamHistory(ud) {
  const exams=getExamData(ud);
  const card=$('examCard');
  if(!card) return;
  if(!exams.length){card.classList.add('hidden');return;}
  card.classList.remove('hidden');
  if($('examList')) $('examList').innerHTML=exams.slice().reverse().map((h)=>{const passed=h.passed===true;const icCls=passed?'pass':'fail';const ic=passed?'fa-circle-check':'fa-circle-xmark';const course=h.course_name||ud.course_name||'Final Exam';return '<div class="exam-row"><div class="ex-ic '+icCls+'"><i class="fa-solid '+ic+'"></i></div><div class="ex-body"><b>'+escapeHtml(course)+'</b><span>'+escapeHtml(formatDate(h.date))+' • Score: '+Number(h.score||0).toFixed(1)+' • '+Number(h.pct||0)+'%</span></div>'+statusBadge(passed?'passed':'pending')+'</div>';}).join('');
}

function fillReferral(ud) {
  const link=ud.referral_link||('https://www.idtacademy.com.ng/register?ref='+(ud.referral_code||currentUserId));
  if($('refLink')) $('refLink').value=link;
  const meta=[];
  if(has(ud.referral_code)) meta.push('<div class="kv-box"><span>Referral Code</span><b>'+escapeHtml(ud.referral_code)+'</b></div>');
  meta.push('<div class="kv-box"><span>Total Bonus</span><b>'+formatMoney(ud.referral_bonus)+'</b></div>');
  if(has(ud.referred_by)) meta.push('<div class="kv-box"><span>Referred By</span><b>'+escapeHtml(ud.referred_by)+'</b></div>');
  if($('refMeta')) $('refMeta').innerHTML=meta.join('');
}

function updateRing(ud,steps) {
  const total=steps?steps.length:0;
  const done=steps?steps.filter((s)=>s.state==='done').length:0;
  const pct=total?Math.round((done/total)*100):0;
  if($('progressPct')) $('progressPct').textContent=pct+'%';
  if($('progressRing')) $('progressRing').style.background='conic-gradient(#7c3aed '+pct+'%, rgba(124,58,237,.12) 0)';
}

function renderProfile() {
  const ud=currentUd;
  if($('pName')) $('pName').textContent=ud.full_name||'Student';
  if($('pEmail')) $('pEmail').textContent=ud.email||'—';
  if($('pAvatar')) $('pAvatar').src=currentProfileUrl||'https://i.imgur.com/oyqM5oF.png';
  if($('pMemberSince')) $('pMemberSince').innerHTML='<i class="fa-solid fa-calendar-check"></i> '+(has(ud.date_registered)?'Member since '+formatDate(ud.date_registered):'IDT Academy Student');
  if($('statusBadge')) $('statusBadge').innerHTML=statusBadge(ud.status);
  if($('pLevelBadge')){
    if(has(ud.level_completed)){
      $('pLevelBadge').style.display='';
      if($('pLevelText')) $('pLevelText').textContent='Level '+ud.level_completed;
    } else {
      $('pLevelBadge').style.display='none';
    }
  }
  const steps=buildSteps(ud);
  buildStats(ud);
  buildActions(ud);
  fillCourse(ud);
  fillPersonal(ud);
  buildExamHistory(ud);
  fillReferral(ud);
  updateRing(ud,steps);
}

async function loadProfile(userId) {
  try {
    const {data,error}=await supabase.from('user_profiles').select('id, user_data').eq('id',userId).maybeSingle();
    if(error) throw error;
    currentUserId=userId;
    currentUd=(data&&data.user_data)||{};
    currentProfileUrl=currentUd.profile_url||currentUd.avatar_url||currentUd.photo_url||'';
    renderProfile();
    showProfile();
    setTimeout(hideLoading,400);
  } catch(err) {
    currentUserId=userId;
    currentUd={};
    currentProfileUrl='';
    renderProfile();
    showProfile();
    setTimeout(hideLoading,400);
    pushShow('error','Load Failed',err.message||'Could not load your profile.');
  }
}

if($('btnLogout')){
  $('btnLogout').addEventListener('click',async()=>{
    await supabase.auth.signOut();
    showNoSession();
    pushShow('info','Signed Out','You have been logged out.');
  });
}

if($('copyRef')){
  $('copyRef').addEventListener('click',async()=>{
    const link=$('refLink')?$('refLink').value:'';
    if(!link){
      pushShow('error','No Link','Referral link is not available.');
      return;
    }
    try{
      await copyText(link);
      $('copyRef').innerHTML='<i class="fa-solid fa-check"></i> Copied!';
      $('copyRef').classList.add('done');
      setTimeout(()=>{$('copyRef').innerHTML='<i class="fa-solid fa-copy"></i> Copy';$('copyRef').classList.remove('done');},2500);
      pushShow('success','Copied!','Your referral link has been copied. Share it and earn ₦1500 per registration.');
    } catch(err){
      pushShow('error','Copy Failed',err.message||String(err));
    }
  });
}

supabase.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT'||!session){
    currentUserId='';
    currentUd={};
    currentProfileUrl='';
    showNoSession();
  }
});

showLoading();
window.addEventListener('load',()=>setTimeout(hideLoading,500));

(async function init(){
  if($('userBadge')) $('userBadge').classList.add('hidden');
  if($('btnLogout')) $('btnLogout').classList.add('hidden');
  try{
    const{data}=await supabase.auth.getSession();
    if(data&&data.session){
      await loadProfile(data.session.user.id);
    }else{
      showNoSession();
      setTimeout(hideLoading,400);
    }
  }catch(err){
    showNoSession();
    setTimeout(hideLoading,400);
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('ready');
});
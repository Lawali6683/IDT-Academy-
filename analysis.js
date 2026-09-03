import { supabase } from './supabase.js';

(function(){
    'use strict';

    var DOM = {
        gate: document.getElementById('pageGate'),
        auth: document.getElementById('pageAuth'),
        dash: document.getElementById('pageDash'),
        ceoInput: document.getElementById('ceoPassInput'),
        ceoBtn: document.getElementById('ceoPassBtn'),
        ceoError: document.getElementById('ceoPassError'),
        authEmail: document.getElementById('authEmail'),
        authPass: document.getElementById('authPass'),
        authBtn: document.getElementById('authBtn'),
        authError: document.getElementById('authError'),
        totalUsers: document.getElementById('totalUsers'),
        activeUsers: document.getElementById('activeUsers'),
        totalRevenue: document.getElementById('totalRevenue'),
        topBody: document.getElementById('topReferrersBody'),
        weeklyBody: document.getElementById('weeklyBody'),
        splitContainer: document.getElementById('splitContainer'),
        weekFrom: document.getElementById('weekFromSelect'),
        weekTo: document.getElementById('weekToSelect'),
        applyRange: document.getElementById('applyWeekRange'),
        resetRange: document.getElementById('resetWeekRange'),
        pdfBtn: document.getElementById('pdfBtn'),
        printBtn: document.getElementById('printBtn'),
        logoutBtn: document.getElementById('logoutBtn'),
        toast: document.getElementById('analysisToast'),
        toastIcon: document.getElementById('analysisToastIcon'),
        toastMsg: document.getElementById('analysisToastMsg'),
        pdfInner: document.getElementById('pdfInner')
    };

    var allWeeklyData = [];
    var session = null;

    function showToast(msg, ok){
        if(!DOM.toast || !DOM.toastMsg || !DOM.toastIcon) return;
        DOM.toastMsg.textContent = msg;
        DOM.toastIcon.className = 'fa-solid ' + (ok ? 'fa-circle-check idt-toast-icon success' : 'fa-circle-exclamation idt-toast-icon error');
        DOM.toast.classList.add('active');
        clearTimeout(window._at);
        window._at = setTimeout(function(){ DOM.toast.classList.remove('active'); }, 4000);
    }

    function formatNum(n){
        var num = Number(n);
        if(isNaN(num)) return '0.00';
        return num.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
    }

    function formatCurr(n){
        return '₦' + formatNum(n);
    }

    function formatDate(iso){
        if(!iso) return '—';
        var d = new Date(iso);
        if(isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
    }

    var CEO_PWD1 = String.fromCharCode(64,104,97,114,117,110,97,54,54);
    var CEO_PWD2 = String.fromCharCode(64,117,98,97,105,100,97,55,55);

    if(DOM.ceoBtn && DOM.ceoInput){
        DOM.ceoBtn.addEventListener('click', function(){
            var val = DOM.ceoInput.value.trim();
            if(val === CEO_PWD1 || val === CEO_PWD2){
                if(DOM.gate) DOM.gate.classList.add('hidden');
                if(DOM.auth) DOM.auth.classList.add('active');
                if(DOM.ceoError) DOM.ceoError.style.display = 'none';
            } else {
                if(DOM.ceoError) DOM.ceoError.style.display = 'block';
                DOM.ceoInput.value = '';
                DOM.ceoInput.focus();
            }
        });

        DOM.ceoInput.addEventListener('keydown', function(e){
            if(e.key === 'Enter') DOM.ceoBtn.click();
        });
    }

    if(DOM.authBtn && DOM.authEmail && DOM.authPass){
        DOM.authBtn.addEventListener('click', async function(){
            var email = DOM.authEmail.value.trim();
            var pass = DOM.authPass.value.trim();
            if(!email || !pass){
                showToast('Please enter email and password.', false);
                return;
            }
            DOM.authBtn.disabled = true;
            DOM.authBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...';
            if(DOM.authError) DOM.authError.style.display = 'none';
            try {
                var res = await supabase.auth.signInWithPassword({ email: email, password: pass });
                if(res.error) throw res.error;
                session = res.data.session;
                if(DOM.auth) DOM.auth.classList.remove('active');
                if(DOM.dash) DOM.dash.classList.add('active');
                await loadData();
            } catch(err){
                if(DOM.authError) DOM.authError.style.display = 'block';
                showToast('Login failed: ' + (err.message || 'Invalid credentials'), false);
                DOM.authBtn.disabled = false;
                DOM.authBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In';
            }
        });

        DOM.authPass.addEventListener('keydown', function(e){
            if(e.key === 'Enter') DOM.authBtn.click();
        });
    }

    if(DOM.logoutBtn){
        DOM.logoutBtn.addEventListener('click', async function(){
            await supabase.auth.signOut();
            session = null;
            if(DOM.dash) DOM.dash.classList.remove('active');
            if(DOM.auth) DOM.auth.classList.add('active');
            if(DOM.authEmail) DOM.authEmail.value = '';
            if(DOM.authPass) DOM.authPass.value = '';
            if(DOM.authBtn){
                DOM.authBtn.disabled = false;
                DOM.authBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In';
            }
        });
    }

    async function loadData(){
        try {
            var usersRes = await supabase.from('user_profiles').select('id, user_data');
            if(usersRes.error) throw usersRes.error;
            var users = usersRes.data || [];

            var partnersRes = await supabase.from('partner_profiles').select('id, partner_data');
            var partners = partnersRes.data || [];

            var totalReg = users.length + partners.length;
            var active = 0;
            var referrerMap = {};

            for(var i = 0; i < users.length; i++){
                var ud = users[i].user_data;
                if(!ud) continue;
                var uStatus = (ud.status || '').toLowerCase();
                if(uStatus === 'active') active++;
                var refCode = ud.referral_code || '';
                if(refCode) referrerMap[refCode] = { id: users[i].id, data: ud, type: 'user' };
            }

            for(var p = 0; p < partners.length; p++){
                var pd = partners[p].partner_data;
                if(!pd) continue;
                var pStatus = (pd.status || '').toLowerCase();
                if(pStatus === 'active') active++;
                var pRefCode = pd.referral_code || '';
                if(pRefCode) referrerMap[pRefCode] = { id: partners[p].id, data: pd, type: 'partner' };
            }

            if(DOM.totalUsers) DOM.totalUsers.textContent = totalReg;
            if(DOM.activeUsers) DOM.activeUsers.textContent = active;

            var refCounts = {};
            for(var j = 0; j < users.length; j++){
                var ud2 = users[j].user_data;
                if(!ud2) continue;
                var referred = ud2.referred_by || '';
                if(referred){
                    if(!refCounts[referred]) refCounts[referred] = 0;
                    refCounts[referred]++;
                }
            }

            var refLeaderboard = [];
            for(var code in refCounts){
                var refObj = referrerMap[code];
                if(refObj){
                    var rData = refObj.data;
                    refLeaderboard.push({
                        full_name: rData.full_name || rData.fullName || 'Unknown',
                        phone: rData.phone || '—',
                        email: rData.email || '—',
                        count: refCounts[code]
                    });
                }
            }

            refLeaderboard.sort(function(a,b){ return b.count - a.count; });
            var top10 = refLeaderboard.slice(0, 10);

            if(DOM.topBody){
                if(top10.length === 0){
                    DOM.topBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:24px;">No referrals recorded yet</td></tr>';
                } else {
                    var th = '';
                    for(var m = 0; m < top10.length; m++){
                        var r = top10[m];
                        var rankClass = m === 0 ? 'gold' : (m === 1 ? 'silver' : (m === 2 ? 'bronze' : ''));
                        th += '<tr><td><span class="rank ' + rankClass + '">' + (m+1) + '</span></td><td>' + escHtml(r.full_name) + '</td><td>' + escHtml(r.phone) + '</td><td>' + escHtml(r.email) + '</td><td><span class="highlight">' + r.count + '</span></td></tr>';
                    }
                    DOM.topBody.innerHTML = th;
                }
            }

            var payRes = await supabase.from('completepay').select('*');
            var payments = payRes.data || [];
            var totalRev = 0;
            var weekMap = {};

            for(var n = 0; n < payments.length; n++){
                var cp = payments[n].complete_pay || {};
                var amount = Number(cp.course_price || cp.amount || 0);
                totalRev += amount;

                var paidAt = payments[n].date_complet || cp.date || cp.created_at;
                if(!paidAt) continue;
                var wStart = getWeekStart(paidAt);
                if(!weekMap[wStart]) weekMap[wStart] = { collected: 0, referral: 0, count: 0 };
                weekMap[wStart].collected += amount;
                if(cp.referred_by || cp.referredBy) {
                    weekMap[wStart].referral += 1500;
                }
                weekMap[wStart].count++;
            }

            if(DOM.totalRevenue) DOM.totalRevenue.textContent = formatCurr(totalRev);

            var weekKeys = Object.keys(weekMap).sort();
            var weeklyData = [];
            for(var r = 0; r < weekKeys.length; r++){
                var w = weekMap[weekKeys[r]];
                var remaining = w.collected - w.referral;
                weeklyData.push({
                    week: r + 1,
                    start: weekKeys[r],
                    collected: w.collected,
                    referral: w.referral,
                    remaining: remaining
                });
            }

            allWeeklyData = weeklyData;
            renderWeeklyTable(weeklyData);
            populateWeekSelects(weeklyData);
        } catch(err){
            console.error(err);
            showToast('Failed to load data: ' + (err.message || err), false);
        }
    }

    function getWeekStart(dateStr){
        var d = new Date(dateStr);
        var day = d.getDay();
        var diff = d.getDate() - day + (day === 0 ? -6 : 1);
        var mon = new Date(d);
        mon.setDate(diff);
        mon.setHours(0,0,0,0);
        return mon.toISOString();
    }

    function escHtml(str){
        if(!str) return '—';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderWeeklyTable(data){
        if(!DOM.weeklyBody || !DOM.splitContainer) return;
        if(data.length === 0){
            DOM.weeklyBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:24px;">No payment data available</td></tr>';
            DOM.splitContainer.innerHTML = '';
            return;
        }
        var rows = '';
        var grandCollected = 0;
        var grandReferral = 0;
        var grandRemaining = 0;
        for(var i = 0; i < data.length; i++){
            var w = data[i];
            grandCollected += w.collected;
            grandReferral += w.referral;
            grandRemaining += w.remaining;
            rows += '<tr><td><strong>Week ' + w.week + '</strong></td><td>' + formatDate(w.start) + '</td><td>' + formatCurr(w.collected) + '</td><td>' + formatCurr(w.referral) + '</td><td class="highlight">' + formatCurr(w.remaining) + '</td></tr>';
        }
        rows += '<tr style="border-top:2px solid rgba(124,58,237,0.2);"><td><strong>Total</strong></td><td>—</td><td><strong>' + formatCurr(grandCollected) + '</strong></td><td><strong>' + formatCurr(grandReferral) + '</strong></td><td class="highlight"><strong>' + formatCurr(grandRemaining) + '</strong></td></tr>';
        DOM.weeklyBody.innerHTML = rows;

        var appShare = grandRemaining / 3;
        var ceoShare1 = grandRemaining / 3;
        var ceoShare2 = grandRemaining / 3;
        DOM.splitContainer.innerHTML =
            '<div class="table-wrap" style="padding:20px;">' +
            '<div style="font-size:14px;font-weight:700;margin-bottom:12px;"><i class="fa-solid fa-chart-pie" style="color:#a78bfa;"></i> Revenue Split (Grand Total Remaining: ' + formatCurr(grandRemaining) + ')</div>' +
            '<div class="split-row">' +
            '<div class="split-box"><div class="split-label">App Share (1/3)</div><div class="split-value app">' + formatCurr(appShare) + '</div></div>' +
            '<div class="split-box"><div class="split-label">CEO Share 1 (1/3)</div><div class="split-value ceo">' + formatCurr(ceoShare1) + '</div></div>' +
            '<div class="split-box"><div class="split-label">CEO Share 2 (1/3)</div><div class="split-value ceo">' + formatCurr(ceoShare2) + '</div></div>' +
            '</div></div>';
    }

    function populateWeekSelects(data){
        var f = DOM.weekFrom;
        var t = DOM.weekTo;
        if(!f || !t) return;
        f.innerHTML = '';
        t.innerHTML = '';
        for(var i = 0; i < data.length; i++){
            var opt1 = document.createElement('option');
            opt1.value = i;
            opt1.textContent = 'Week ' + data[i].week + ' (' + formatDate(data[i].start) + ')';
            f.appendChild(opt1);
            var opt2 = document.createElement('option');
            opt2.value = i;
            opt2.textContent = 'Week ' + data[i].week + ' (' + formatDate(data[i].start) + ')';
            t.appendChild(opt2);
        }
        if(data.length > 0){
            f.value = 0;
            t.value = data.length - 1;
        }
    }

    if(DOM.applyRange && DOM.weekFrom && DOM.weekTo){
        DOM.applyRange.addEventListener('click', function(){
            var from = parseInt(DOM.weekFrom.value, 10);
            var to = parseInt(DOM.weekTo.value, 10);
            if(isNaN(from) || isNaN(to) || from > to){
                showToast('Invalid week range. Select From < To.', false);
                return;
            }
            var filtered = allWeeklyData.slice(from, to + 1);
            renderWeeklyTable(filtered);
            showToast('Showing Week ' + (from+1) + ' to Week ' + (to+1), true);
        });
    }

    if(DOM.resetRange && DOM.weekFrom && DOM.weekTo){
        DOM.resetRange.addEventListener('click', function(){
            renderWeeklyTable(allWeeklyData);
            if(allWeeklyData.length > 0){
                DOM.weekFrom.value = 0;
                DOM.weekTo.value = allWeeklyData.length - 1;
            }
            showToast('Showing all weeks', true);
        });
    }

    if(DOM.pdfBtn){
        DOM.pdfBtn.addEventListener('click', function(){
            generatePDF(allWeeklyData);
        });
    }

    if(DOM.printBtn){
        DOM.printBtn.addEventListener('click', function(){
            window.print();
        });
    }

    function generatePDF(data){
        if(!data || data.length === 0){
            showToast('No data to export', false);
            return;
        }
        var totalCollected = 0;
        var totalReferral = 0;
        var totalRemaining = 0;
        var rowsHtml = '';
        for(var i = 0; i < data.length; i++){
            var w = data[i];
            totalCollected += w.collected;
            totalReferral += w.referral;
            totalRemaining += w.remaining;
            rowsHtml += '<tr><td style="padding:8px 10px;border-bottom:1px solid #ddd;">Week ' + w.week + '</td><td style="padding:8px 10px;border-bottom:1px solid #ddd;">' + formatDate(w.start) + '</td><td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:right;">' + formatCurr(w.collected) + '</td><td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:right;">' + formatCurr(w.referral) + '</td><td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:right;font-weight:700;">' + formatCurr(w.remaining) + '</td></tr>';
        }
        var appS = totalRemaining / 3;
        var ceoS1 = totalRemaining / 3;
        var ceoS2 = totalRemaining / 3;
        var html = '<div style="text-align:center;margin-bottom:24px;">' +
            '<img src="https://i.imgur.com/oyqM5oF.png" style="width:70px;height:70px;border-radius:50%;">' +
            '<img src="https://i.imgur.com/z8HOr4D.png" style="width:70px;height:70px;border-radius:50%;margin-left:10px;">' +
            '<h1 style="font-size:22px;margin-top:8px;color:#7c3aed;">IDT Academy</h1>' +
            '<p style="color:#666;font-size:13px;">Learn Beyond Limits</p>' +
            '<p style="color:#999;font-size:11px;margin-top:4px;">Generated: ' + new Date().toLocaleString() + '</p>' +
            '</div>' +
            '<h2 style="font-size:16px;margin-bottom:12px;color:#333;">Weekly Revenue Report</h2>' +
            '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
            '<thead><tr style="background:#7c3aed;color:#fff;">' +
            '<th style="padding:10px;text-align:left;">Week</th><th style="padding:10px;text-align:left;">Start Date</th><th style="padding:10px;text-align:right;">Collected</th><th style="padding:10px;text-align:right;">Referral</th><th style="padding:10px;text-align:right;">Remaining</th>' +
            '</tr></thead><tbody>' + rowsHtml +
            '<tr style="border-top:2px solid #7c3aed;font-weight:700;"><td style="padding:10px;">Total</td><td style="padding:10px;">—</td><td style="padding:10px;text-align:right;">' + formatCurr(totalCollected) + '</td><td style="padding:10px;text-align:right;">' + formatCurr(totalReferral) + '</td><td style="padding:10px;text-align:right;">' + formatCurr(totalRemaining) + '</td></tr>' +
            '</tbody></table>' +
            '<div style="margin-top:20px;border-top:1px solid #ddd;padding-top:16px;">' +
            '<h3 style="font-size:14px;color:#333;margin-bottom:10px;">Revenue Split</h3>' +
            '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
            '<tr><td style="padding:8px;border:1px solid #ddd;width:50%;">App Share (1/3)</td><td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:700;color:#06b6d4;">' + formatCurr(appS) + '</td></tr>' +
            '<tr><td style="padding:8px;border:1px solid #ddd;">CEO Share 1 (1/3)</td><td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:700;color:#f59e0b;">' + formatCurr(ceoS1) + '</td></tr>' +
            '<tr><td style="padding:8px;border:1px solid #ddd;">CEO Share 2 (1/3)</td><td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:700;color:#f59e0b;">' + formatCurr(ceoS2) + '</td></tr>' +
            '</table></div>' +
            '<div style="margin-top:24px;text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:12px;">' +
            'IDT Academy &copy; ' + new Date().getFullYear() + ' | www.idtacademy.com.ng' +
            '</div>';
        
        if(DOM.pdfInner) DOM.pdfInner.innerHTML = html;
        var pdfElem = document.getElementById('pdfContent') || DOM.pdfInner;

        html2canvas(pdfElem, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        }).then(function(canvas){
            var imgData = canvas.toDataURL('image/png');
            var pdf = new jspdf.jsPDF('p', 'mm', 'a4');
            var pdfWidth = pdf.internal.pageSize.getWidth();
            var pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            var pageHeight = pdf.internal.pageSize.getHeight();
            if(pdfHeight > pageHeight){
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, null, 'FAST');
            } else {
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }
            pdf.save('IDT_Academy_Weekly_Report.pdf');
            showToast('PDF downloaded successfully!', true);
        }).catch(function(err){
            showToast('PDF generation failed: ' + (err.message || err), false);
        });
    }
})();
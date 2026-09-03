export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    try {
      const data = await request.json();
      const { full_name, account_number, account_name, amount, email, paid_date, bank_name } = data;

      if (!email) {
        return new Response(JSON.stringify({ success: false, error: 'Email is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const formattedAmount = parseFloat(amount || 0).toFixed(2);
      const formattedDate = new Date(paid_date || new Date()).toLocaleString('en-NG', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body{margin:0;padding:0;background-color:#f4f2ff;font-family:'Segoe UI',Arial,sans-serif}
            .ewrap{max-width:600px;margin:0 auto;padding:20px}
            .ecard{background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(80,40,160,.15)}
            .ehead{background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:30px 24px;text-align:center}
            .ehead img{width:70px;height:70px;border-radius:50%;background:#fff;padding:6px;margin-bottom:10px}
            .ehead h1{color:#fff;font-size:22px;font-weight:900;margin:0;letter-spacing:1px}
            .ehead p{color:#c4b5fd;font-size:13px;margin:5px 0 0}
            .ebody{padding:28px 24px}
            .ebody h2{color:#1e1b4b;font-size:20px;font-weight:900;margin:0 0 6px}
            .egreeting{color:#6d6a8a;font-size:14px;line-height:1.7;margin-bottom:18px}
            .ebox{background:linear-gradient(135deg,rgba(16,185,129,.06),rgba(6,182,212,.06));border:1.5px solid rgba(16,185,129,.25);border-radius:16px;padding:18px;margin-bottom:18px}
            .ebox h3{color:#047857;font-size:15px;font-weight:900;margin:0 0 12px;display:flex;align-items:center;gap:8px}
            .erow{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed rgba(124,58,237,.1);font-size:13px}
            .erow:last-child{border-bottom:none}
            .erow .elabel{color:#6d6a8a;font-weight:600}
            .erow .evalue{color:#1e1b4b;font-weight:800}
            .eamount{font-size:28px;font-weight:900;color:#047857;text-align:center;margin:16px 0;font-variant-numeric:tabular-nums}
            .echeck{text-align:center;margin:18px 0}
            .echeck i{font-size:48px;color:#10b981}
            .efooter{text-align:center;padding:20px 24px;background:#f8f7ff;border-top:1px solid rgba(124,58,237,.1)}
            .efooter p{font-size:12px;color:#6d6a8a;margin:4px 0;line-height:1.6}
            .efooter b{color:#1e1b4b}
            @media(max-width:480px){
              .ewrap{padding:10px}
              .ebody{padding:18px 14px}
              .eamount{font-size:22px}
            }
          </style>
        </head>
        <body>
          <div class="ewrap">
            <div class="ecard">
              <div class="ehead">
                <img src="https://i.imgur.com/oyqM5oF.png" alt="IDT Academy">
                <h1>Payment Confirmed!</h1>
                <p>Your withdrawal has been processed successfully</p>
              </div>
              <div class="ebody">
                <h2>Congratulations ${full_name || 'Valued Student'}!</h2>
                <div class="egreeting">
                  We are pleased to inform you that your withdrawal request has been processed and your funds have been sent to your bank account. Please find the transaction details below.
                </div>
                <div class="echeck">
                  <i class="fa-solid fa-circle-check" style="font-size:48px;color:#10b981"></i>
                </div>
                <div class="eamount">₦${formattedAmount}</div>
                <div class="ebox">
                  <h3><i class="fa-solid fa-building-columns"></i> Payment Details</h3>
                  <div class="erow"><span class="elabel">Amount Paid</span><span class="evalue">₦${formattedAmount}</span></div>
                  <div class="erow"><span class="elabel">Bank Name</span><span class="evalue">${bank_name || 'N/A'}</span></div>
                  <div class="erow"><span class="elabel">Account Number</span><span class="evalue">${account_number || 'N/A'}</span></div>
                  <div class="erow"><span class="elabel">Account Name</span><span class="evalue">${account_name || 'N/A'}</span></div>
                  <div class="erow"><span class="elabel">Date Paid</span><span class="evalue">${formattedDate}</span></div>
                </div>
                <p style="font-size:13px;color:#6d6a8a;line-height:1.7;margin:0">
                  If you have any questions or concerns regarding this payment, please contact our support team via WhatsApp at <b>+234 706 881 8760</b> or reply to this email. Thank you for being part of IDT Academy!
                </p>
              </div>
              <div class="efooter">
                <p><b>IDT Academy</b> &mdash; Learn Beyond Limits</p>
                <p>www.idtacademy.com.ng | support@idtacademy.com.ng</p>
                <p>&copy; ${new Date().getFullYear()} Intelligent Digital Technology Academy. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const templateParams = {
        to_email: email,
        to_name: full_name || 'Student',
        from_email: env.SENDER_EMAIL,
        from_name: env.SENDER_NAME,
        subject: `Payment Confirmed - ₦${formattedAmount} Withdrawal Processed Successfully`,
        html_content: htmlContent
      };

      const emailjsResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: env.EMAILJS_SERVICE_ID,
          template_id: env.EMAILJS_TEMPLATE_ID,
          user_id: env.EMAILJS_PUBLIC_KEY,
          accessToken: env.EMAILJS_PRIVATE_KEY,
          template_params: templateParams
        })
      });

      if (emailjsResponse.ok) {
        return new Response(JSON.stringify({ success: true, message: 'Email sent successfully' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } else {
        const errorText = await emailjsResponse.text();
        return new Response(JSON.stringify({ success: false, error: errorText }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
import nodemailer, { SendMailOptions } from 'nodemailer';

export interface LeadEmailPayload {
  fullName: string;
  workEmail: string;
  companyName: string;
  city?: string | null;
  budgetINR?: string | null;
  notes?: string | null;
  id?: string;
}

const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'optanwar10@gmail.com',
      pass: 'grrp llwp hvcy tbea',
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

async function sendMailWithRetry(mailOptions: SendMailOptions, maxRetries = 2): Promise<boolean> {
  const transporter = getTransporter();
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
}

export class EmailService {
  /**
   * Dispatches both internal executive sales alert and client instant confirmation.
   */
  static async sendInboundLeadNotification(lead: LeadEmailPayload): Promise<{ internalSent: boolean; clientSent: boolean }> {
    let internalSent = false;
    let clientSent = false;

    const displayBudget = lead.budgetINR || '₹1,00,000 - ₹5,00,000';
    const displayCity = lead.city || 'Pan-India';

    // 1. Internal Executive Alert (to sales / founder)
    try {
      const internalMailOptions = {
        from: '"CreatorBase Enterprise" <optanwar10@gmail.com>',
        to: 'optanwar10@gmail.com',
        subject: `🔥 [High-Value Lead] ${lead.companyName} (${displayBudget}) — Inbound Request`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #08090B; color: #F4F4F5; margin: 0; padding: 24px; }
              .card { background-color: #12141A; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 28px; max-width: 600px; margin: 0 auto; }
              .badge { display: inline-block; background-color: #00E599; color: #08090B; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; }
              .title { font-size: 20px; font-weight: 700; color: #FFFFFF; margin-top: 14px; margin-bottom: 20px; }
              .field { margin-bottom: 14px; }
              .label { font-size: 11px; text-transform: uppercase; color: #71717A; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 4px; }
              .value { font-size: 15px; color: #F4F4F5; font-weight: 500; }
              .highlight { color: #00E599; font-weight: 600; font-family: monospace; }
              .divider { height: 1px; background-color: rgba(255, 255, 255, 0.08); margin: 20px 0; }
              .footer { font-size: 12px; color: #52525B; text-align: center; margin-top: 24px; }
            </style>
          </head>
          <body>
            <div class="card">
              <span class="badge">Enterprise Inbound Lead</span>
              <div class="title">New Agency Consultation Request</div>

              <div class="field">
                <div class="label">Lead Name</div>
                <div class="value">${lead.fullName}</div>
              </div>

              <div class="field">
                <div class="label">Work Email</div>
                <div class="value"><a href="mailto:${lead.workEmail}" style="color: #00E599; text-decoration: none;">${lead.workEmail}</a></div>
              </div>

              <div class="field">
                <div class="label">Company / Agency</div>
                <div class="value">${lead.companyName}</div>
              </div>

              <div class="field">
                <div class="label">Target City / Hub</div>
                <div class="value">${displayCity}</div>
              </div>

              <div class="field">
                <div class="label">Monthly Campaign Budget</div>
                <div class="value highlight">${displayBudget}</div>
              </div>

              ${lead.notes ? `
                <div class="field">
                  <div class="label">Campaign Requirements / Notes</div>
                  <div class="value" style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); font-style: italic;">
                    "${lead.notes}"
                  </div>
                </div>
              ` : ''}

              <div class="divider"></div>

              <div style="text-align: center; margin-top: 20px;">
                <a href="mailto:${lead.workEmail}?subject=Re:%20CreatorBase%20Enterprise%20Campaign%20OS%20for%20${encodeURIComponent(lead.companyName)}" 
                   style="background-color: #00E599; color: #08090B; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 8px; display: inline-block;">
                  Reply Directly to Lead →
                </a>
              </div>
            </div>
            <div class="footer">
              CreatorBase Inbound Intelligence • Lead ID: ${lead.id || 'N/A'} • ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
            </div>
          </body>
          </html>
        `,
      };

      await sendMailWithRetry(internalMailOptions);
      internalSent = true;
      console.log('✅ [EmailService] Internal lead alert dispatched to optanwar10@gmail.com');
    } catch (err) {
      console.error('❌ [EmailService] Failed to dispatch internal lead alert:', err);
    }

    // 2. Client Instant Confirmation (Executive Welcome)
    try {
      const clientMailOptions = {
        from: '"CreatorBase Enterprise" <optanwar10@gmail.com>',
        to: lead.workEmail,
        subject: `Your CreatorBase Enterprise Consultation Request • ${lead.companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #08090B; color: #F4F4F5; margin: 0; padding: 24px; }
              .card { background-color: #12141A; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 32px; max-width: 600px; margin: 0 auto; }
              .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; color: #FFFFFF; margin-bottom: 24px; }
              .logo span { color: #00E599; }
              p { font-size: 15px; line-height: 1.6; color: #A1A1AA; margin: 0 0 16px 0; }
              .highlight-box { background: rgba(0, 229, 153, 0.05); border: 1px solid rgba(0, 229, 153, 0.2); border-radius: 10px; padding: 18px; margin: 24px 0; }
              .btn { background: #00E599; color: #08090B; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 14px; }
              .footer { font-size: 12px; color: #52525B; margin-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">Creator<span>Base</span> 🇮🇳</div>
              <p style="color: #FFFFFF; font-size: 17px; font-weight: 600;">Hello ${lead.fullName},</p>
              <p>Thank you for requesting an Enterprise Consultation for <strong>${lead.companyName}</strong>.</p>
              
              <div class="highlight-box">
                <p style="margin: 0; color: #F4F4F5; font-size: 14px;">
                  ⚡ <strong>What happens next:</strong> Our Senior Campaign Solutions Lead has received your brief and is preparing custom rate-card benchmarks and vetted creator recommendations for <strong>${displayCity}</strong> within your target budget tier (<strong>${displayBudget}</strong>).
                </p>
              </div>

              <p>We typically connect within <strong>2 business hours</strong>. In the meantime, you can explore our live sample client pitch deck to see the exact format your brand clients will receive:</p>

              <div style="margin: 28px 0; text-align: center;">
                <a href="https://creatorbase.in/pitch/sample-demo" class="btn">
                  View Live Sample Pitch Portal →
                </a>
              </div>

              <p style="font-size: 14px;">If you have immediate questions, feel free to reply directly to this email or reach our partnership desk at <a href="mailto:optanwar10@gmail.com" style="color: #00E599;">optanwar10@gmail.com</a>.</p>

              <div class="footer">
                © ${new Date().getFullYear()} CreatorBase Technologies Inc. The Operating System for Modern Indian Influencer Agencies.<br>
                Indore • Mumbai • Bengaluru
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await sendMailWithRetry(clientMailOptions);
      clientSent = true;
      console.log(`✅ [EmailService] Confirmation email dispatched to client at ${lead.workEmail}`);
    } catch (err) {
      console.error('❌ [EmailService] Failed to dispatch client confirmation email:', err);
    }

    return { internalSent, clientSent };
  }
}

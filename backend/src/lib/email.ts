import nodemailer from 'nodemailer';

interface ApprovalEmailData {
  to: string;
  jobTitle: string;
  companyName: string;
  applicationId: string;
  approveToken: string;
  rejectToken: string;
}

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_FROM_ADDRESS!,
      clientId: process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
    },
  });
}

export async function sendApprovalEmail(data: ApprovalEmailData): Promise<void> {
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const approveUrl = `${apiUrl}/api/pipeline/approve?token=${encodeURIComponent(data.approveToken)}`;
  const rejectUrl = `${frontendUrl}/review/${data.applicationId}?token=${encodeURIComponent(data.rejectToken)}`;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `AppTrack <${process.env.GMAIL_FROM_ADDRESS}>`,
    to: data.to,
    subject: `Review your application: ${data.jobTitle} at ${data.companyName}`,
    html: buildApprovalEmailHtml({ ...data, approveUrl, rejectUrl }),
  });
}

function buildApprovalEmailHtml(data: ApprovalEmailData & { approveUrl: string; rejectUrl: string }): string {
  const title = escapeHtml(`${data.jobTitle} at ${data.companyName}`);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Ready for Review</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#4f46e5;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">AppTrack</h1>
              <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;">Automated Job Application Pipeline</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Application Ready for Review</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">
                Your tailored resume and cover letter for <strong>${title}</strong> are ready.
              </p>
              <p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">
                Review both documents in the AppTrack dashboard, then approve or request revisions below.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="${data.approveUrl}"
                       style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">
                      Approve &amp; Submit
                    </a>
                  </td>
                  <td>
                    <a href="${data.rejectUrl}"
                       style="display:inline-block;padding:14px 28px;background:#ffffff;color:#374151;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;border:1px solid #d1d5db;">
                      Request Changes
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
                This link expires in 7 days. The approve link is single-use.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                AppTrack &mdash; Automated Job Application Pipeline<br>
                You are receiving this because you have an active job search configured.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

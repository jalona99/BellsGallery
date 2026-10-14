/**
 * Template Email Transaksional Premium (Gaya Meta / Perusahaan Modern)
 * Dirancang dengan tabel HTML responsif yang kompatibel dengan Gmail, Apple Mail, Outlook, dan perangkat mobile.
 */

export interface OtpEmailProps {
  userName: string;
  email: string;
  otp: string;
  expiryMinutes?: number;
}

export function generateOtpEmailHtml({
  userName,
  email,
  otp,
  expiryMinutes = 15,
}: OtpEmailProps): string {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${otp} adalah kode konfirmasi BELLSGALLERY Anda</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f8fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1c1e21;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f7f8fa; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e6eb; box-shadow: 0 4px 12px rgba(0,0,0,0.04); overflow: hidden;">
          
          <!-- Header / Brand -->
          <tr>
            <td style="padding: 32px 36px 20px 36px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #000000;">
                      BELLSGALLERY
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 600; color: #65676b; background-color: #f0f2f5; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Keamanan Akun
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 36px;">
              <div style="border-bottom: 1px solid #f0f2f5;"></div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 36px 20px 36px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; line-height: 1.35; color: #1c1e21;">
                Satu langkah lagi untuk memverifikasi akun Anda
              </h1>
              
              <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; color: #4b4f56;">
                Halo <strong>${userName}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4b4f56;">
                Kami menerima permintaan reset kata sandi untuk akun <strong>BELLSGALLERY</strong> Anda. Gunakan kode verifikasi di bawah ini untuk melanjutkan:
              </p>

              <!-- OTP Highlight Box (Meta Style) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="background-color: #f0f2f5; border: 1px solid #e4e6eb; border-radius: 8px; padding: 22px 20px;">
                    <span style="font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1c1e21; display: inline-block;">
                      ${otp}
                    </span>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; font-size: 13px; color: #65676b; text-align: center;">
                Kode ini hanya berlaku selama <strong>${expiryMinutes} menit</strong>. Jangan bagikan kode ini kepada siapa pun.
              </p>

              <!-- Security Advice Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fafbfc; border-left: 3px solid #1877f2; border-radius: 4px; padding: 14px 16px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #1c1e21;">
                      Jika seseorang meminta kode ini
                    </p>
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #65676b;">
                      Jangan berikan kode ini kepada siapa pun, termasuk pihak yang mengaku sebagai staf keamanan atau perwakilan BELLSGALLERY. Kami tidak akan pernah meminta kode ini melalui pesan pribadi atau telepon.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 4px 0; font-size: 13px; color: #4b4f56;">
                Terima kasih,
              </p>
              <p style="margin: 0; font-size: 13px; font-weight: 600; color: #1c1e21;">
                Tim Keamanan BELLSGALLERY
              </p>
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="padding: 24px 36px 32px 36px; background-color: #fafbfc; border-top: 1px solid #f0f2f5;">
              <p style="margin: 0 0 8px 0; font-size: 11px; line-height: 1.5; color: #8a8d91; text-align: center;">
                Pesan ini dikirimkan otomatis ke <strong style="color: #65676b;">${email}</strong>.
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; line-height: 1.5; color: #8a8d91; text-align: center;">
                Jika Anda tidak meminta perubahan kata sandi ini, mohon segera abaikan email ini atau amankan akun Anda jika merasa ada aktivitas mencurigakan.
              </p>
              <p style="margin: 0; font-size: 11px; color: #b0b3b8; text-align: center;">
                &copy; ${new Date().getFullYear()} BELLSGALLERY Inc. Hak Cipta Dilindungi.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateOtpEmailText({
  userName,
  email,
  otp,
  expiryMinutes = 15,
}: OtpEmailProps): string {
  return [
    `Halo ${userName},`,
    ``,
    `Kami menerima permintaan verifikasi untuk akun BELLSGALLERY Anda.`,
    `Kode verifikasi Anda adalah: ${otp}`,
    ``,
    `Kode ini hanya berlaku selama ${expiryMinutes} menit. Demi keamanan, jangan pernah membagikan kode ini kepada siapa pun.`,
    ``,
    `Jika Anda tidak meminta kode ini, silakan abaikan pesan ini.`,
    ``,
    `Salam hormat,`,
    `Tim Keamanan BELLSGALLERY`,
    `Email tujuan: ${email}`,
  ].join('\n');
}

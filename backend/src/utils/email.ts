import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, html: string, text?: string) => {
  // Provide plain-text fallback if not provided to comply with RFC and anti-spam standards
  const plainText = text || html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                .replace(/<[^>]+>/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim();

  // 1. Coba kirim via Primary SMTP (Brevo) jika dikonfigurasi
  if (process.env.SMTP_HOST && process.env.SMTP_PASSWORD) {
    try {
      const primaryTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      const senderName = process.env.SMTP_FROM_NAME || 'Bells Gallery';
      const senderEmail = process.env.SMTP_FROM_EMAIL || 'noreply@bellsgallery.web.id';

      const info = await primaryTransporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to,
        subject,
        text: plainText,
        html,
        headers: {
          'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        },
      });
      console.log(`[EMAIL SENT via PRIMARY SMTP] to=${to} messageId=${info.messageId}`);
      return info;
    } catch (primaryError: any) {
      console.warn(`[PRIMARY SMTP WARNING] ${primaryError.message}. Mengalihkan pengiriman ke Fallback Gmail...`);
    }
  }

  // 2. Fallback Otomatis: Kirim via Gmail SMTP (dari environment variables)
  const fallbackEmail = process.env.FALLBACK_SMTP_EMAIL || process.env.SMTP_EMAIL || '';
  const fallbackPassword = process.env.FALLBACK_SMTP_PASSWORD || process.env.SMTP_PASSWORD || '';

  if (!fallbackEmail || !fallbackPassword) {
    throw new Error('Kredensial SMTP tidak dikonfigurasi di file .env.');
  }

  try {
    const fallbackTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: fallbackEmail,
        pass: fallbackPassword,
      },
    });

    const info = await fallbackTransporter.sendMail({
      from: `"Bells Gallery" <${fallbackEmail}>`,
      to,
      subject,
      text: plainText,
      html,
      headers: {
        'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      },
    });
    console.log(`[EMAIL SENT via FALLBACK GMAIL] to=${to} messageId=${info.messageId}`);
    return info;
  } catch (fallbackError: any) {
    console.error('Error sending fallback email:', fallbackError);
    throw new Error('Gagal mengirim email. Pastikan SMTP terkonfigurasi dengan benar.');
  }
};



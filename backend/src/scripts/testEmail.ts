import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { sendEmail } from '../utils/email';
import { generateOtpEmailHtml } from '../utils/emailTemplates';

async function main() {
  const targetEmail = process.env.SMTP_USER || process.env.SMTP_EMAIL || 'bellsgalleryku@gmail.com';
  
  if (!process.env.SMTP_PASSWORD) {
    console.error('❌ SMTP_PASSWORD belum terisi di .env');
    process.exit(1);
  }


  console.log(`Mengirimkan email uji coba ke: ${targetEmail}...`);

  const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const html = generateOtpEmailHtml({
    userName: 'Pengguna BELLSGALLERY',
    email: targetEmail,
    otp: testOtp,
    expiryMinutes: 15
  });

  const subject = `${testOtp} adalah kode konfirmasi BELLSGALLERY Anda`;

  await sendEmail(targetEmail, subject, html);
  console.log(`\n🎉 SUKSES! Email konfirmasi OTP Meta-style berhasil terkirim ke: ${targetEmail}`);
  console.log(`Kode OTP uji coba yang dikirim: ${testOtp}`);
  console.log('Silakan periksa Kotak Masuk (Inbox) atau folder Spam di Gmail Anda sekarang!');
}

main().catch((err) => {
  console.error('\n❌ Gagal mengirim email:', err.message);
  process.exit(1);
});

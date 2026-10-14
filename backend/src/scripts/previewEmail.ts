import fs from 'fs';
import path from 'path';
import { generateOtpEmailHtml } from '../utils/emailTemplates';

const sampleHtml = generateOtpEmailHtml({
  userName: 'Bells Gallery',
  email: 'bellsgalleryku@gmail.com',
  otp: '442361',
  expiryMinutes: 15
});

const outputPath = path.join(__dirname, 'preview-email-otp.html');
fs.writeFileSync(outputPath, sampleHtml, 'utf8');

console.log('✅ File preview email berhasil dibuat di:');
console.log(outputPath);
console.log('\nBuka file di atas di browser Anda (Chrome / Edge) untuk melihat tampilan email Meta-style secara langsung!');

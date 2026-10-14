import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Tentukan path ke cloudflared.exe
const rootDir = path.resolve(__dirname, '../../../');
const cloudflaredRoot = path.join(rootDir, 'cloudflared.exe');
const cloudflaredLocal = path.join(process.cwd(), 'cloudflared.exe');

let executablePath = '';
if (fs.existsSync(cloudflaredRoot)) {
  executablePath = cloudflaredRoot;
} else if (fs.existsSync(cloudflaredLocal)) {
  executablePath = cloudflaredLocal;
} else {
  executablePath = 'cloudflared'; // fallback ke PATH sistem
}

const targetPort = process.env.PORT || '3001';
const targetUrl = `http://localhost:${targetPort}`;

console.log('\n======================================================================');
console.log('⚡ MEMULAI CLOUDFLARE TUNNEL UNTUK MIDTRANS WEBHOOK');
console.log(`📡 Menghubungkan port lokal: ${targetUrl}`);
console.log('======================================================================\n');

const child = spawn(executablePath, ['tunnel', '--url', targetUrl], {
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});

let tunnelUrlFound = false;

const handleOutput = (data: Buffer) => {
  const output = data.toString();
  process.stdout.write(output);

  if (!tunnelUrlFound) {
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
      tunnelUrlFound = true;
      const tunnelUrl = match[0];
      const webhookUrl = `${tunnelUrl}/api/transactions/webhook`;

      console.log('\n');
      console.log('╔══════════════════════════════════════════════════════════════════════╗');
      console.log('║               🎉 CLOUDFLARE TUNNEL BERHASIL AKTIF!                  ║');
      console.log('╠══════════════════════════════════════════════════════════════════════╣');
      console.log(`║ Public URL  : ${tunnelUrl.padEnd(52)} ║`);
      console.log(`║ Webhook URL : ${webhookUrl.padEnd(52)} ║`);
      console.log('╠══════════════════════════════════════════════════════════════════════╣');
      console.log('║ 📋 CARA SETUP DI MIDTRANS DASHBOARD:                                 ║');
      console.log('║ 1. Buka https://dashboard.midtrans.com                               ║');
      console.log('║ 2. Masuk menu: Settings -> Configuration                             ║');
      console.log('║ 3. Salin Webhook URL di atas dan tempel di:                          ║');
      console.log('║    👉 Payment Notification URL                                       ║');
      console.log('║ 4. Simpan konfigurasi!                                               ║');
      console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
    }
  }
};

child.stdout.on('data', handleOutput);
child.stderr.on('data', handleOutput);

child.on('error', (err) => {
  console.error('❌ Gagal menjalankan cloudflared:', err.message);
  console.log('Pastikan file cloudflared.exe ada di folder root proyek atau terpasang di PATH sistem.');
});

child.on('close', (code) => {
  console.log(`\nTunnel berhenti dengan kode exit: ${code}`);
});

process.on('SIGINT', () => {
  child.kill();
  process.exit();
});

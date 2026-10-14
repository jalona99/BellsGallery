import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Memverifikasi dan menyiapkan akun Administrator...');

  // 1. Promosikan akun pemilik/developer jika ada
  const ownerEmail = 'jabarloka760@gmail.com';
  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (owner) {
    await prisma.user.update({
      where: { email: ownerEmail },
      data: { role: 'ADMIN' }
    });
    console.log(`✅ User ${ownerEmail} berhasil dipromosikan menjadi ADMIN.`);
  }

  // 2. Buat / perbarui akun admin utama: admin@bellsgallery.com (password: admin123)
  const adminEmail = 'admin@bellsgallery.com';
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  if (adminExists) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        role: 'ADMIN',
        passwordHash
      }
    });
    console.log(`✅ Akun ${adminEmail} diperbarui dengan role ADMIN (password: admin123).`);
  } else {
    await prisma.user.create({
      data: {
        name: 'Super Administrator',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN'
      }
    });
    console.log(`✅ Akun baru ${adminEmail} berhasil dibuat dengan role ADMIN (password: admin123).`);
  }

  const allAdmins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, name: true, email: true, role: true }
  });
  console.log('Daftar Administrator Aktif:', allAdmins);
}

main()
  .catch((e) => {
    console.error('Error promoting admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

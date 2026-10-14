import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const args = process.argv.slice(2);
  const email = args[0]?.trim();
  const password = args[1]?.trim();
  const name = args[2]?.trim() || 'Administrator';

  if (!email || !password) {
    console.log('Penggunaan:');
    console.log('  npx tsx src/scripts/createAdmin.ts <email> <password> [nama]');
    console.log('Contoh:');
    console.log('  npx tsx src/scripts/createAdmin.ts admin@toko.com Rahasia123 "Owner BELLSGALLERY"');
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { email },
      data: {
        name: name !== 'Administrator' ? name : existingUser.name,
        role: 'ADMIN',
        passwordHash
      },
      select: { id: true, name: true, email: true, role: true }
    });
    console.log(`✅ Berhasil memperbarui akun menjadi ADMIN:`, updated);
  } else {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'ADMIN'
      },
      select: { id: true, name: true, email: true, role: true }
    });
    console.log(`✅ Berhasil membuat akun ADMIN baru:`, created);
  }

  // Tampilkan semua admin aktif
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, name: true, email: true, role: true }
  });
  console.log('\nDaftar Administrator Aktif Sekarang:', admins);
}

main()
  .catch((e) => {
    console.error('Error saat membuat/mengupdate admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import prisma from '../config/prisma';

async function main() {
  const email = process.argv[2]?.trim();

  if (!email) {
    console.log('Penggunaan:');
    console.log('  npx tsx src/scripts/deleteUser.ts <email>');
    console.log('Contoh:');
    console.log('  npx tsx src/scripts/deleteUser.ts bellsgalleryku@gmail.com');
    process.exit(1);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (!existingUser) {
    console.log(`⚠️ User dengan email "${email}" tidak ditemukan di database.`);
    return;
  }

  // Hapus relasi terkait jika ada (wishlist, address, membership, dll.)
  await prisma.wishlist.deleteMany({ where: { userId: existingUser.id } });
  await prisma.address.deleteMany({ where: { userId: existingUser.id } });
  await prisma.membership.deleteMany({ where: { userId: existingUser.id } });
  
  // Hapus user
  await prisma.user.delete({
    where: { email }
  });

  console.log(`✅ Berhasil menghapus akun: ${email} (${existingUser.name})`);

  // Tampilkan daftar admin yang tersisa
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, name: true, email: true, role: true }
  });
  console.log('\nDaftar Administrator Aktif Sekarang:', admins);
}

main()
  .catch((e) => {
    console.error('Error saat menghapus user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

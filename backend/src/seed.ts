import prisma from './config/prisma';

const products = [
  {
    name: 'Kaos Kuning Graphic 77',
    description: 'Kaos katun premium 24s berwarna kuning cerah dengan grafis ungu ikonik nomor 77 di bagian dada. Potongan pas di badan dan sejuk dipakai seharian.',
    price: 149000,
    category: 'pria',
    subcategory: 'kaos',
    imageUrl: '/products/kaos-kuning-77.png',
    cutoutUrl: '/products/kaos-kuning-77-cutout.png',
    stock: 100,
  },
  {
    name: 'T-Shirt Casual Kuning 77 (Wanita)',
    description: 'T-Shirt santai dengan siluet modern potongan wanita (slim fit/tapered waist), warna kuning cerah dan logo 77 di dada. Sangat cocok dipadukan dengan celana denim atau rok.',
    price: 149000,
    category: 'wanita',
    subcategory: 'kaos',
    imageUrl: '/products/kaos-kuning-77-wanita.png',
    cutoutUrl: '/products/kaos-kuning-77-wanita-cutout.png',
    stock: 75,
  }
];

async function main() {
  console.log('Menghapus data produk lama dari database...');
  // Hapus relasi untuk menghindari constraint violation
  await prisma.transactionItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  
  console.log('Menyuntikkan produk kaos kuning logo 77...');
  for (const p of products) {
    await prisma.product.create({
      data: {
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        subcategory: p.subcategory,
        imageUrl: p.imageUrl,
        cutoutUrl: p.cutoutUrl,
        inventory: {
          create: {
            stock: p.stock
          }
        }
      }
    });
  }
  console.log('Selesai! Database sekarang berisi kaos kuning logo 77.');
}

main()
  .catch((e) => {
    console.error('Error saat seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

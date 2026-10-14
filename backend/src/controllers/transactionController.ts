import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { snap } from '../config/midtrans';
import redisClient from '../config/redis';

// Helper Timeout untuk Chaos Resilience (Mencegah thread backend menggantung jika Payment Gateway lambat)
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
};

// Konfigurasi Tarif Ongkir Zonasi & Promo Flat Rate
export const SHIPPING_RATES: Record<string, { id: string; name: string; cost: number; freeThreshold?: number; description: string }> = {
  STORE_PICKUP: {
    id: 'STORE_PICKUP',
    name: 'Ambil di Toko Fisik (Galeri Kyabel Bojonegoro)',
    cost: 0,
    description: 'Gratis. Ambil langsung di Galeri Kyabel Bojonegoro.'
  },
  JATIM: {
    id: 'JATIM',
    name: 'Jawa Timur (Reguler)',
    cost: 10000,
    freeThreshold: 200000, // Promo: Gratis ongkir jika belanja >= Rp 200.000
    description: 'Tarif flat Rp 10.000 (GRATIS jika belanja di atas Rp 200.000)'
  },
  JAWA_NON_JATIM: {
    id: 'JAWA_NON_JATIM',
    name: 'Jawa Barat / Jabodetabek / Jawa Tengah (Reguler)',
    cost: 18000,
    description: 'Tarif flat Rp 18.000 seluruh pulau Jawa non-Jatim'
  },
  LUAR_JAWA: {
    id: 'LUAR_JAWA',
    name: 'Luar Pulau Jawa (Reguler)',
    cost: 35000,
    description: 'Tarif flat Rp 35.000 antar pulau ke seluruh Indonesia'
  }
};

export const COURIER_OPTIONS = [
  { id: 'J&T Express', name: 'J&T Express', service: 'EZ (Reguler)', etd: '1-2 Hari', default: true },
  { id: 'JNE Express', name: 'JNE Express', service: 'REG (Reguler)', etd: '2-3 Hari' },
  { id: 'SiCepat Ekspres', name: 'SiCepat Ekspres', service: 'REG / HALU', etd: '1-3 Hari' },
];

/**
 * Mengambil daftar tarif ongkos kirim zonasi, opsi kurir ekspedisi, dan promo aktif.
 */
export const getShippingRates = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    zones: Object.values(SHIPPING_RATES),
    couriers: COURIER_OPTIONS,
    promo: {
      jatimFreeThreshold: 200000,
      description: 'Gratis Ongkir se-Jatim untuk belanja di atas Rp 200.000'
    }
  });
};

export const checkout = async (req: Request, res: Response): Promise<void> => {
  const loggedInUserId = (req as any).user?.id;
  const { 
    items, 
    shippingZone = 'STORE_PICKUP',
    courier,
    courierService,
    recipientName,
    phoneNumber,
    customerEmail,
    fullAddress,
    city,
    postalCode,
    courierNote,
    paymentMethod = 'ONLINE',
    idempotencyKey: clientProvidedKey
  } = req.body; 

  const isGuest = !loggedInUserId;

  if (isGuest) {
    if (!recipientName?.trim()) {
      res.status(400).json({ error: 'Nama pemesan / penerima wajib diisi untuk checkout.' });
      return;
    }
    if (!phoneNumber?.trim()) {
      res.status(400).json({ error: 'Nomor WhatsApp / telepon wajib diisi untuk konfirmasi pesanan.' });
      return;
    }
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Keranjang belanja tidak boleh kosong.' });
    return;
  }

  // Tentukan user ID efektif atau buat shadow user untuk Guest Checkout
  let effectiveUserId = loggedInUserId;
  let cleanCustomerEmail = customerEmail?.trim().toLowerCase() || null;

  if (isGuest) {
    try {
      if (cleanCustomerEmail) {
        const existingUser = await prisma.user.findUnique({ where: { email: cleanCustomerEmail } });
        if (existingUser) {
          effectiveUserId = existingUser.id;
        } else {
          const salt = await bcrypt.genSalt(10);
          const randomPass = crypto.randomBytes(16).toString('hex');
          const passwordHash = await bcrypt.hash(randomPass, salt);
          const shadowUser = await prisma.user.create({
            data: {
              name: recipientName.trim(),
              email: cleanCustomerEmail,
              passwordHash,
              role: 'CUSTOMER'
            }
          });
          effectiveUserId = shadowUser.id;
        }
      } else {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const guestEmail = `guest.${Date.now()}.${randomNum}@guest.phygital.store`;
        const salt = await bcrypt.genSalt(10);
        const randomPass = crypto.randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(randomPass, salt);
        const shadowUser = await prisma.user.create({
          data: {
            name: recipientName.trim(),
            email: guestEmail,
            passwordHash,
            role: 'CUSTOMER'
          }
        });
        effectiveUserId = shadowUser.id;
      }
    } catch (guestErr) {
      console.error('Error creating shadow guest user:', guestErr);
      res.status(500).json({ error: 'Gagal memproses sesi checkout tamu. Silakan coba kembali.' });
      return;
    }
  }

  const trackingIdentity = effectiveUserId || phoneNumber?.trim() || 'guest';
  let lockKey = `lock:checkout:${trackingIdentity}`;
  let lockAcquired = false;

  try {
    const selectedZoneKey = (shippingZone in SHIPPING_RATES) ? shippingZone : 'STORE_PICKUP';
    const zoneConfig = (SHIPPING_RATES[selectedZoneKey] || SHIPPING_RATES['STORE_PICKUP'])!;

    // 1. Ekstraksi / Penentuan Idempotency Key
    const headerKey = req.headers['idempotency-key'] as string | undefined;
    const rawKey = clientProvidedKey || headerKey;
    
    const getItemSignature = (i: any) =>
      `${i.productId}:${i.quantity}:${i.size ? String(i.size).trim() : 'M'}:${i.color ? String(i.color).trim() : 'DEFAULT'}`;

    const itemsSignature = items
      .map(getItemSignature)
      .sort()
      .join('|');

    const idempotencyKey = (rawKey && typeof rawKey === 'string' && rawKey.trim().length >= 6)
      ? rawKey.trim()
      : `auto_${crypto.createHash('sha256').update(`${trackingIdentity}:${itemsSignature}:${selectedZoneKey}`).digest('hex').substring(0, 24)}`;

    const redisIdempotencyKey = `idempotency:checkout:${trackingIdentity}:${idempotencyKey}`;
    lockKey = `lock:checkout:${trackingIdentity}:${idempotencyKey}`;

    // 2. Cek Cache Idempotensi di Redis (Sesi Pembayaran yang Pernah Dibuat Sebelumnya)
    try {
      if (redisClient.isOpen) {
        const cachedSessionRaw = await redisClient.get(redisIdempotencyKey);
        if (cachedSessionRaw) {
          const cachedSession = JSON.parse(cachedSessionRaw);
          
          const existingTx = await prisma.transaction.findUnique({
            where: { id: cachedSession.transactionId }
          });

          if (existingTx) {
            if (existingTx.status === 'PAID') {
              res.json({
                message: 'Pesanan ini telah lunas terbayar!',
                isPaid: true,
                transactionId: existingTx.id,
                status: 'PAID'
              });
              return;
            }

            if (existingTx.status === 'PENDING') {
              res.json({
                message: 'Melanjutkan sesi pembayaran yang sedang aktif...',
                isIdempotentResume: true,
                transactionId: existingTx.id,
                paymentUrl: existingTx.paymentUrl || cachedSession.paymentUrl,
                token: existingTx.snapToken || cachedSession.token,
                paymentMethod: existingTx.snapToken === 'CASH_ON_PICKUP' ? 'CASH_ON_PICKUP' : 'ONLINE',
                subtotal: existingTx.subtotal,
                shippingCost: existingTx.shippingCost,
                shippingZone: existingTx.shippingZone,
                isFreeShippingPromo: cachedSession.isFreeShippingPromo || false,
                totalAmount: existingTx.totalAmount,
                status: 'PENDING'
              });
              return;
            }
            
            await redisClient.del(redisIdempotencyKey);
          }
        }
      }
    } catch (cacheErr) {
      console.warn('[Idempotency] Gagal memeriksa cache Redis:', cacheErr);
    }

    // 3. Fallback Database Idempotency Check (Pencegah Duplicate Order jika user refresh saat koneksi lambat)
    try {
      const recentPending = await prisma.transaction.findFirst({
        where: {
          userId: effectiveUserId,
          status: 'PENDING',
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } // Dibuat dalam 15 menit terakhir
        },
        orderBy: { createdAt: 'desc' },
        include: { items: true }
      });

      if (recentPending) {
        const dbItemsSignature = recentPending.items
          .map(getItemSignature)
          .sort()
          .join('|');

        if (dbItemsSignature === itemsSignature && recentPending.shippingZone === selectedZoneKey) {
          console.log(`[Idempotency] Menemukan transaksi pending aktif (${recentPending.id}), melanjutkan sesi...`);
          
          const resumePayload = {
            message: 'Melanjutkan sesi pembayaran yang sedang aktif...',
            isIdempotentResume: true,
            transactionId: recentPending.id,
            paymentUrl: recentPending.paymentUrl,
            token: recentPending.snapToken,
            paymentMethod: recentPending.snapToken === 'CASH_ON_PICKUP' ? 'CASH_ON_PICKUP' : 'ONLINE',
            subtotal: recentPending.subtotal,
            shippingCost: recentPending.shippingCost,
            shippingZone: recentPending.shippingZone,
            isFreeShippingPromo: recentPending.shippingCost === 0 && (recentPending.subtotal || 0) > 0,
            totalAmount: recentPending.totalAmount,
            status: 'PENDING'
          };

          if (redisClient.isOpen) {
            try {
              await redisClient.setEx(redisIdempotencyKey, 1800, JSON.stringify(resumePayload));
            } catch (_) {}
          }

          res.json(resumePayload);
          return;
        }
      }
    } catch (dbCheckErr) {
      console.warn('[Idempotency] Fallback database check warning:', dbCheckErr);
    }

    // 4. In-Flight Concurrency Lock (Mencegah Double-Click & Menunggu jika request pertama sedang diproses di Gateway)
    try {
      if (redisClient.isOpen) {
        lockAcquired = !!(await redisClient.set(lockKey, 'in_flight', { NX: true, EX: 12 }));
        if (!lockAcquired) {
          // Polling hingga 3.5 detik untuk melihat apakah request pertama selesai dan menghasilkan token
          let waited = 0;
          while (waited < 3500) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            waited += 500;
            const cachedRaw = await redisClient.get(redisIdempotencyKey);
            if (cachedRaw) {
              const cached = JSON.parse(cachedRaw);
              res.json({
                message: 'Melanjutkan sesi pembayaran yang sedang aktif...',
                isIdempotentResume: true,
                ...cached
              });
              return;
            }
          }

          res.status(429).json({ 
            error: 'Permintaan checkout Anda sedang diproses oleh Payment Gateway. Mohon tunggu beberapa detik.' 
          });
          return;
        }
      }
    } catch (lockErr) {
      console.warn('[Idempotency] Redis lock error:', lockErr);
    }

    // Validasi data alamat untuk pengiriman kurir
    if (selectedZoneKey !== 'STORE_PICKUP') {
      if (!recipientName?.trim() || !phoneNumber?.trim() || !fullAddress?.trim() || !city?.trim()) {
        res.status(400).json({ 
          error: 'Nama penerima, nomor telepon, alamat lengkap, dan kota wajib diisi untuk pengiriman kurir.' 
        });
        return;
      }
    }

    // 5. Proteksi Mutlak dari Price Tampering & Race Condition pada Inventory
    await prisma.$transaction(async (tx) => {
      // Ambil data user untuk fallback snapshot
      const currentUser = await tx.user.findUnique({ where: { id: effectiveUserId } });

      // Ambil seluruh data produk resmi langsung dari database PostgreSQL
      const productIds = items.map((i: any) => i.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const productMap = new Map(dbProducts.map(p => [p.id, p]));

      let subtotal = 0;
      const verifiedItems: { 
        productId: string; 
        quantity: number; 
        price: number; 
        name: string; 
        size: string; 
        color: string 
      }[] = [];

      for (const item of items) {
        const officialProduct = productMap.get(item.productId);
        if (!officialProduct) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
        }

        if (item.quantity <= 0) {
          throw new Error(`Kuantitas untuk produk ${officialProduct.name} tidak valid.`);
        }

        // RED TEAM DEFENSE: Kunci harga resmi dari database! Abaikan harga kiriman req.body.item.price
        const verifiedPrice = officialProduct.price;
        subtotal += verifiedPrice * item.quantity;

        // Kunci baris inventory ini dengan Pessimistic Locking agar tidak bisa dibaca transaksi lain bersamaan
        const invResult = await tx.$queryRaw<any[]>`SELECT stock FROM "Inventory" WHERE "productId" = ${item.productId} FOR UPDATE`;
        
        if (!invResult || invResult.length === 0 || invResult[0].stock < item.quantity) {
          throw new Error(`Stok tidak mencukupi untuk produk: ${officialProduct.name}`);
        }
        
        // Kurangi stok di database
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { stock: { decrement: item.quantity } }
        });

        // Ambil size & color yang dipilih user
        const finalSize = item.size ? String(item.size).trim() : 'M';
        const finalColor = item.color ? String(item.color).trim() : 'DEFAULT';

        verifiedItems.push({
          productId: officialProduct.id,
          quantity: item.quantity,
          price: verifiedPrice,
          name: officialProduct.name,
          size: finalSize,
          color: finalColor
        });
      }

      // Hitung Ongkos Kirim Zonasi & Promo Gratis Ongkir
      let calculatedShippingCost = zoneConfig.cost;
      let isFreeShippingPromo = false;
      if (zoneConfig.freeThreshold && subtotal >= zoneConfig.freeThreshold) {
        calculatedShippingCost = 0;
        isFreeShippingPromo = true;
      }

      const totalAmount = subtotal + calculatedShippingCost;

      // Standarisasi Snapshot Alamat Penerima & Kurir
      let finalRecipient = recipientName?.trim();
      let finalPhone = phoneNumber?.trim();
      let finalAddress = fullAddress?.trim();
      let finalCity = city?.trim();
      let finalPostal = postalCode?.trim();

      let finalCourier = courier?.trim() || 'J&T Express';
      let finalCourierService = courierService?.trim() || 'Reguler';

      if (selectedZoneKey === 'STORE_PICKUP') {
        finalRecipient = finalRecipient || currentUser?.name || 'Pelanggan Galeri';
        finalPhone = finalPhone || '';
        finalAddress = finalAddress || 'Galeri Kyabel Bojonegoro (Ambil Langsung di Toko Fisik)';
        finalCity = finalCity || 'Bojonegoro';
        finalPostal = finalPostal || '62111';
        finalCourier = 'AMBIL_DI_TOKO';
        finalCourierService = 'Ambil Langsung di Galeri';
      }

      // 6. Simpan Transaksi Resmi di Database beserta Address Snapshot & Varian Size/Color
      const transaction = await tx.transaction.create({
        data: {
          userId: effectiveUserId,
          isGuest,
          customerEmail: cleanCustomerEmail,
          subtotal,
          shippingCost: calculatedShippingCost,
          shippingZone: selectedZoneKey,
          courier: finalCourier,
          courierService: finalCourierService,
          recipientName: finalRecipient,
          phoneNumber: finalPhone,
          fullAddress: finalAddress,
          city: finalCity,
          postalCode: finalPostal,
          courierNote: courierNote?.trim() || null,
          totalAmount,
          status: 'PENDING',
          items: {
            create: verifiedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              size: item.size,
              color: item.color
            }))
          }
        }
      });

      // 7. Siapkan item_details untuk Midtrans Snap lengkap dengan varian size
      const midtransItemDetails: any[] = verifiedItems.map((item, idx) => {
        const variantLabel = item.color && item.color !== 'DEFAULT'
          ? ` (${item.size}, ${item.color})`
          : ` (${item.size})`;
        const fullName = `${item.name}${variantLabel}`;
        return {
          id: `${item.productId.substring(0, 30)}-${item.size}-${idx + 1}`.substring(0, 50),
          price: item.price,
          quantity: item.quantity,
          name: fullName.substring(0, 50)
        };
      });

      if (calculatedShippingCost > 0) {
        midtransItemDetails.push({
          id: 'SHIPPING-FEE',
          price: calculatedShippingCost,
          quantity: 1,
          name: `Ongkir: ${finalCourier} (${zoneConfig.name})`.substring(0, 50)
        });
      }

      const isPayAtStore = selectedZoneKey === 'STORE_PICKUP' && paymentMethod === 'CASH_ON_PICKUP';

      let redirectUrl: string | null = null;
      let snapToken: string | null = null;

      if (isPayAtStore) {
        // Ambil di Galeri - Bayar Tunai / QRIS Kasir saat barang diambil
        snapToken = 'CASH_ON_PICKUP';
        redirectUrl = null;
      } else {
        // Pembayaran Online via Midtrans Snap
        const validPhone = (finalPhone && finalPhone !== '-' && finalPhone.replace(/\D/g, '').length >= 8)
          ? finalPhone
          : undefined;

        const parameter = {
          transaction_details: {
            order_id: transaction.id,
            gross_amount: totalAmount
          },
          item_details: midtransItemDetails,
          customer_details: {
            first_name: finalRecipient,
            email: cleanCustomerEmail || currentUser?.email || `${(finalPhone || '').replace(/\D/g, '') || 'guest'}@customer.phygital.store`,
            ...(validPhone ? { phone: validPhone } : {}),
            shipping_address: {
              first_name: finalRecipient,
              ...(validPhone ? { phone: validPhone } : {}),
              address: finalAddress,
              city: finalCity,
              postal_code: finalPostal,
              country_code: 'IDN'
            }
          }
        };

        const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
        const isRealKeyConfigured = serverKey && !serverKey.includes('YOUR_SERVER_KEY');

        if (isRealKeyConfigured) {
          try {
            // Chaos Defense: Batasi waktu tunggu Midtrans maksimal 8 detik untuk mencegah thread server macet
            const snapResponse: any = await withTimeout(
              snap.createTransaction(parameter),
              8000,
              'Midtrans Payment Gateway Timeout (>8s)'
            );
            redirectUrl = snapResponse.redirect_url;
            snapToken = snapResponse.token;
          } catch (snapErr: any) {
            console.error('Midtrans API error details:', snapErr.ApiResponse || snapErr.message || snapErr);
            // Fallback jika terjadi timeout atau gangguan gateway
            const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
            redirectUrl = `${frontendBaseUrl}/payment-mock?id=${transaction.id}&amount=${totalAmount}`;
            snapToken = `mock-token-${transaction.id}`;
          }
        } else {
          // Mode development simulasi
          const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
          redirectUrl = `${frontendBaseUrl}/payment-mock?id=${transaction.id}&amount=${totalAmount}`;
          snapToken = `mock-token-${transaction.id}`;
        }
      }
      
      // Simpan snapToken dan paymentUrl ke database
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { snapToken, paymentUrl: redirectUrl }
      });

      // Buat entri pelacakan pengiriman awal
      try {
        await tx.orderTracking.upsert({
          where: { orderNumber: transaction.id },
          update: {},
          create: {
            orderNumber: transaction.id,
            customerName: finalRecipient || 'Pelanggan',
            courier: selectedZoneKey === 'STORE_PICKUP' ? 'PICKUP TOKO' : `${finalCourier} (${finalCourierService})`,
            awbNumber: selectedZoneKey === 'STORE_PICKUP' ? 'AMBIL-DI-TOKO' : null,
            status: isPayAtStore ? 'MENUNGGU PENGAMBILAN' : 'MENUNGGU PEMBAYARAN'
          }
        });
      } catch (_) {}

      const responsePayload = {
        message: isPayAtStore 
          ? 'Pesanan ambil di galeri berhasil dibuat! Silakan bayar di kasir saat mengambil pesanan.' 
          : 'Checkout berhasil',
        transactionId: transaction.id,
        isGuest,
        customerEmail: cleanCustomerEmail || currentUser?.email || null,
        paymentUrl: redirectUrl,
        token: snapToken,
        paymentMethod: isPayAtStore ? 'CASH_ON_PICKUP' : 'ONLINE',
        subtotal,
        shippingCost: calculatedShippingCost,
        shippingZone: selectedZoneKey,
        courier: finalCourier,
        isFreeShippingPromo,
        totalAmount
      };

      // Simpan session cache ke Redis selama 30 menit (1800 detik) untuk proteksi refresh & retry
      try {
        if (redisClient.isOpen) {
          await redisClient.setEx(redisIdempotencyKey, 1800, JSON.stringify(responsePayload));
        }
      } catch (saveErr) {
        console.warn('[Idempotency] Gagal menyimpan cache Redis:', saveErr);
      }

      res.json(responsePayload);
    });

  } catch (error: any) {
    console.error('Error during checkout:', error.message);
    res.status(400).json({ error: error.message || 'Checkout failed' });
  } finally {
    // Bersihkan in-flight lock
    try {
      if (redisClient.isOpen && lockAcquired) {
        await redisClient.del(lockKey);
      }
    } catch (_) {}
  }
};

export const midtransWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const notification = req.body;
    
    const { order_id, transaction_status, fraud_status, status_code, gross_amount, signature_key, payment_type, is_mock } = notification;

    console.log(`[Midtrans Webhook] Menerima notifikasi untuk Order: ${order_id} | Status: ${transaction_status} | Tipe: ${payment_type || 'N/A'}`);

    if (!order_id) {
       res.status(400).json({ error: 'Order ID not found in notification' });
       return;
    }

    // 1. Ambil data transaksi saat ini dari database
    const existingTx = await prisma.transaction.findUnique({
      where: { id: order_id },
      include: { items: true }
    });

    if (!existingTx) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const isMockOrder = is_mock || existingTx.snapToken?.startsWith('mock-');

    // 2. Memverifikasi Signature Key SHA-512 Midtrans (Anti-Fake Webhook)
    // Lewati verifikasi jika ini adalah transaksi simulator lokal
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    if (!isMockOrder && serverKey && !serverKey.includes('YOUR_SERVER_KEY')) {
      const hash = crypto.createHash('sha512')
        .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
        .digest('hex');

      const hashBuf = Buffer.from(hash, 'utf-8');
      const sigBuf = Buffer.from(signature_key || '', 'utf-8');
      const isSigValid = hashBuf.length === sigBuf.length && crypto.timingSafeEqual(hashBuf, sigBuf);
        
      if (!isSigValid) {
        console.error(`Midtrans Webhook: Invalid Signature Key for order ${order_id}`);
        res.status(403).json({ error: 'Invalid signature key' });
        return;
      }
    }

    // 3. Proteksi Replay Attack (Idempotency Check)
    if (existingTx.status === 'PAID') {
      res.status(200).json({ message: 'Transaction already settled (Idempotent Notification)' });
      return;
    }

    // 4. Tentukan Status Akhir dari Notifikasi Resmi
    let updateStatus = 'PENDING';
    if (transaction_status == 'capture') {
      if (fraud_status == 'challenge') {
        updateStatus = 'PENDING';
      } else if (fraud_status == 'accept') {
        updateStatus = 'PAID';
      }
    } else if (transaction_status == 'settlement') {
      updateStatus = 'PAID';
    } else if (transaction_status == 'cancel' || transaction_status == 'deny' || transaction_status == 'expire') {
      updateStatus = 'FAILED';
    } else if (transaction_status == 'pending') {
      updateStatus = 'PENDING';
    }

    // 5. Update Status Transaksi di Database
    await prisma.transaction.update({
      where: { id: order_id },
      data: { status: updateStatus }
    });

    // 6. Jika lunas, update order tracking ke DIPROSES
    if (updateStatus === 'PAID') {
      if (existingTx.status === 'CANCELLED' || existingTx.status === 'FAILED') {
        // Jika sebelumnya sudah di-cancel, kurangi stok lagi karena transaksi akhirnya dibayar
        try {
          await prisma.$transaction(
            existingTx.items.map((item) =>
              prisma.inventory.update({
                where: { productId: item.productId },
                data: { stock: { decrement: item.quantity } }
              })
            )
          );
        } catch (_) {}
      }
      await prisma.orderTracking.updateMany({
        where: { orderNumber: order_id },
        data: { status: 'DIPROSES' }
      });
    }

    // 7. Eksekusi Rollback Inventory jika transaksi FAILED/EXPIRED (Hanya jika sebelumnya PENDING)
    if (updateStatus === 'FAILED' && existingTx.status === 'PENDING') {
      try {
        await prisma.$transaction(
          existingTx.items.map((item) =>
            prisma.inventory.update({
              where: { productId: item.productId },
              data: { stock: { increment: item.quantity } }
            })
          )
        );
        console.log(`Transaction ${order_id} failed. Inventory rolled back successfully.`);
      } catch (rollbackErr) {
        console.error(`Transaction ${order_id} failed, but rollback encountered an error:`, rollbackErr);
      }
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error processing webhook' });
  }
};

/**
 * Sinkronisasi status transaksi secara aktif langsung ke Midtrans API (Dual-Channel Reconciliation).
 * Menyelesaikan masalah webhook tertunda, offline, atau terhalang localhost.
 */
export const syncTransactionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!id) {
      res.status(400).json({ error: 'Order ID / Transaction ID wajib disertakan' });
      return;
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: id as string },
      include: { items: true }
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan di database' });
      return;
    }

    // Hanya pemilik transaksi, transaksi Guest, atau ADMIN yang diizinkan melakukan sinkronisasi
    if (!transaction.isGuest && transaction.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Akses ditolak ke transaksi ini' });
      return;
    }

    // Jika transaksi sudah lunas (PAID), kembalikan langsung (idempotent)
    if (transaction.status === 'PAID') {
      res.status(200).json({ 
        message: 'Transaksi sudah berstatus PAID (LUNAS)', 
        status: 'PAID',
        transaction 
      });
      return;
    }

    // Jika transaksi offline CASH atau token simulasi lokal
    if (transaction.snapToken === 'CASH' || transaction.snapToken?.startsWith('mock-')) {
      res.status(200).json({ 
        message: 'Transaksi offline / simulasi lokal', 
        status: transaction.status,
        transaction 
      });
      return;
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    if (!serverKey || serverKey.includes('YOUR_SERVER_KEY')) {
      res.status(400).json({ error: 'Midtrans Server Key belum dikonfigurasi' });
      return;
    }

    // Hubungi Midtrans API langsung untuk status transaksi terkini
    let midtransStatus: any;
    try {
      midtransStatus = await withTimeout(
        snap.transaction.status(transaction.id),
        8000,
        'Midtrans status check timeout (>8s)'
      );
    } catch (midtransErr: any) {
      console.warn(`[Midtrans Sync] Tidak dapat memeriksa status untuk order ${id}:`, midtransErr.message || midtransErr);
      res.status(200).json({ 
        message: 'Belum ada data status pembayaran dari Midtrans (transaksi belum diproses atau pelanggan belum menyelesaikan pembayaran)', 
        status: transaction.status,
        transaction 
      });
      return;
    }

    const { transaction_status, fraud_status } = midtransStatus;
    let newStatus = transaction.status;

    if (transaction_status === 'capture') {
      if (fraud_status === 'challenge') {
        newStatus = 'PENDING';
      } else if (fraud_status === 'accept') {
        newStatus = 'PAID';
      }
    } else if (transaction_status === 'settlement') {
      newStatus = 'PAID';
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      newStatus = 'FAILED';
    } else if (transaction_status === 'pending') {
      newStatus = 'PENDING';
    }

    let updatedTx = transaction;
    if (newStatus !== transaction.status) {
      updatedTx = await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: newStatus },
        include: { items: true }
      });

      // Rollback stok jika status berubah ke FAILED
      if (newStatus === 'FAILED' && transaction.status === 'PENDING') {
        try {
          await prisma.$transaction(
            transaction.items.map((item) =>
              prisma.inventory.update({
                where: { productId: item.productId },
                data: { stock: { increment: item.quantity } }
              })
            )
          );
          console.log(`[Midtrans Sync] Order ${id} FAILED. Stok berhasil di-rollback.`);
        } catch (rbErr) {
          console.error(`[Midtrans Sync] Gagal rollback stok untuk order ${id}:`, rbErr);
        }
      }

      console.log(`[Midtrans Sync] Berhasil memperbarui status order ${id} dari ${transaction.status} ke ${newStatus}`);
    }

    res.status(200).json({
      message: `Status transaksi berhasil disinkronkan: ${newStatus}`,
      status: newStatus,
      transaction: updatedTx,
      paymentDetails: {
        payment_type: midtransStatus.payment_type,
        settlement_time: midtransStatus.settlement_time,
        transaction_time: midtransStatus.transaction_time
      }
    });
  } catch (error: any) {
    console.error('Error syncing transaction status:', error);
    res.status(500).json({ error: error.message || 'Gagal menyinkronkan status transaksi' });
  }
};

/**
 * Mengambil riwayat transaksi untuk pengguna yang sedang login.
 */
export const getHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Akses ditolak. Silakan login.' });
      return;
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    res.status(200).json({ transactions });
  } catch (error: any) {
    console.error('Error fetching history:', error.message);
    res.status(500).json({ error: 'Gagal memuat riwayat transaksi' });
  }
};

/**
 * Mengambil SEMUA riwayat transaksi (Khusus Admin).
 */
export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: true }
        }
      }
    });

    res.status(200).json({ transactions });
  } catch (error: any) {
    console.error('Error fetching all transactions:', error.message);
    res.status(500).json({ error: 'Gagal memuat seluruh transaksi' });
  }
};

/**
 * Memperbarui status transaksi secara manual (Khusus Admin).
 * Otomatis menangani penyesuaian/rollback stok jika status diubah ke FAILED.
 */
export const updateTransactionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'PAID', 'FAILED'].includes(status)) {
      res.status(400).json({ error: 'Status harus PENDING, PAID, atau FAILED' });
      return;
    }

    const existingTx = await prisma.transaction.findUnique({
      where: { id: id as string },
      include: { items: true }
    });

    if (!existingTx) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan' });
      return;
    }

    const previousStatus = existingTx.status;

    // Update status transaksi
    const updatedTx = await prisma.transaction.update({
      where: { id: id as string },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } }
      }
    });

    // Jika sebelumnya BUKAN FAILED lalu diubah ke FAILED, lakukan rollback stok
    if (previousStatus !== 'FAILED' && status === 'FAILED') {
      await prisma.$transaction(
        existingTx.items.map((item) =>
          prisma.inventory.update({
            where: { productId: item.productId },
            data: { stock: { increment: item.quantity } }
          })
        )
      );
    } 
    // Jika sebelumnya FAILED lalu diubah ke PAID/PENDING, kurangi stok kembali
    else if (previousStatus === 'FAILED' && status !== 'FAILED') {
      await prisma.$transaction(
        existingTx.items.map((item) =>
          prisma.inventory.update({
            where: { productId: item.productId },
            data: { stock: { decrement: item.quantity } }
          })
        )
      );
    }

    res.json({ message: `Status transaksi berhasil diubah menjadi ${status}`, transaction: updatedTx });
  } catch (error: any) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Mengambil detail pelacakan pengiriman dan ringkasan pesanan publik berdasarkan nomor order.
 */
export const getOrderTracking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNumber } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      res.status(401).json({ error: 'Akses ditolak. Silakan login kembali.' });
      return;
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: orderNumber as string },
      select: {
        id: true,
        userId: true,
        totalAmount: true,
        subtotal: true,
        shippingCost: true,
        shippingZone: true,
        courier: true,
        courierService: true,
        recipientName: true,
        phoneNumber: true,
        fullAddress: true,
        city: true,
        status: true,
        snapToken: true,
        paymentUrl: true,
        isGuest: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            size: true,
            color: true,
            product: {
              select: {
                name: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });

    if (!transaction) {
      res.status(404).json({ error: 'Data pelacakan pengiriman tidak ditemukan' });
      return;
    }

    // IDOR Protection: Verifikasi kepemilikan pesanan (hanya pemilik asli atau ADMIN yang diizinkan)
    if (transaction.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Akses ditolak. Anda tidak memiliki izin untuk melihat detail pesanan ini.' });
      return;
    }

    const tracking = await prisma.orderTracking.findUnique({
      where: { orderNumber: orderNumber as string }
    });

    res.json({ tracking, transaction });
  } catch (error: any) {
    console.error('Error fetching order tracking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mengambil semua data pelacakan pengiriman untuk Admin Dashboard.
 */
export const getAllOrderTrackings = async (req: Request, res: Response): Promise<void> => {
  try {
    const trackings = await prisma.orderTracking.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ trackings });
  } catch (error: any) {
    console.error('Error fetching all order trackings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Menyimpan / memperbarui informasi pelacakan pengiriman (Khusus Admin).
 */
export const upsertOrderTracking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNumber, customerName, courier, awbNumber, status } = req.body;

    if (!orderNumber || !customerName || !courier) {
      res.status(400).json({ error: 'orderNumber, customerName, dan courier wajib diisi' });
      return;
    }

    const tracking = await prisma.orderTracking.upsert({
      where: { orderNumber },
      update: {
        customerName,
        courier,
        awbNumber: awbNumber || null,
        status: status || 'DIPROSES'
      },
      create: {
        orderNumber,
        customerName,
        courier,
        awbNumber: awbNumber || null,
        status: status || 'DIPROSES'
      }
    });

    res.json({ message: 'Informasi pelacakan pengiriman berhasil disimpan', tracking });
  } catch (error: any) {
    console.error('Error upserting order tracking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Memproses transaksi tunai (CASH / Point of Sale) langsung oleh Admin di toko fisik.
 * Memotong stok barang secara atomik, langsung menandai transaksi sebagai 'PAID',
 * dan otomatis mencatat data pemasukan ke analitik dashboard.
 */
export const createCashTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Akses ditolak. Silakan login kembali sebagai Admin.' });
      return;
    }

    const { items, customerName, customerEmail, cashReceived } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Daftar produk yang dibeli tidak boleh kosong.' });
      return;
    }

    // Eksekusi atomik menggunakan Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil data produk resmi dari database
      const productIds = items.map((i: any) => i.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const productMap = new Map(dbProducts.map(p => [p.id, p]));

      let totalAmount = 0;
      const verifiedItems: { 
        productId: string; 
        quantity: number; 
        price: number; 
        name: string; 
        size: string; 
        color: string 
      }[] = [];

      for (const item of items) {
        const officialProduct = productMap.get(item.productId);
        if (!officialProduct) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
        }

        const qty = Number(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Kuantitas untuk produk ${officialProduct.name} tidak valid.`);
        }

        // Kunci baris inventory ini dengan FOR UPDATE untuk mencegah race condition
        const invResult = await tx.$queryRaw<any[]>`SELECT stock FROM "Inventory" WHERE "productId" = ${item.productId} FOR UPDATE`;
        if (!invResult || invResult.length === 0 || invResult[0].stock < qty) {
          throw new Error(`Stok tidak mencukupi untuk ${officialProduct.name}. Sisa stok saat ini: ${invResult?.[0]?.stock ?? 0}`);
        }

        // Potong stok produk di gudang/toko
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { stock: { decrement: qty } }
        });

        const verifiedPrice = officialProduct.price;
        totalAmount += verifiedPrice * qty;

        const finalSize = item.size ? String(item.size).trim() : 'M';
        const finalColor = item.color ? String(item.color).trim() : 'DEFAULT';

        verifiedItems.push({
          productId: officialProduct.id,
          quantity: qty,
          price: verifiedPrice,
          name: officialProduct.name,
          size: finalSize,
          color: finalColor
        });
      }

      // Validasi uang cash diterima (jika diisi)
      if (cashReceived !== undefined && cashReceived !== null && Number(cashReceived) > 0 && Number(cashReceived) < totalAmount) {
        throw new Error(`Uang tunai yang diterima (Rp ${Number(cashReceived).toLocaleString('id-ID')}) kurang dari total belanja (Rp ${totalAmount.toLocaleString('id-ID')}).`);
      }

      // 2. Hubungkan atau Buat Data Customer
      let targetUser = null;
      const cleanEmail = customerEmail?.trim().toLowerCase();
      const cleanName = customerName?.trim() || 'Pelanggan Offline (Tunai)';

      if (cleanEmail) {
        targetUser = await tx.user.findUnique({ where: { email: cleanEmail } });
        if (!targetUser) {
          const salt = await bcrypt.genSalt(10);
          const randomPassword = crypto.randomBytes(12).toString('hex');
          const passwordHash = await bcrypt.hash(randomPassword, salt);
          targetUser = await tx.user.create({
            data: {
              name: cleanName,
              email: cleanEmail,
              passwordHash,
              role: 'CUSTOMER'
            }
          });
        }
      } else {
        const walkinEmail = `walkin.${Date.now()}.${Math.floor(Math.random() * 1000)}@bellsgallery.store`;
        const salt = await bcrypt.genSalt(10);
        const randomPassword = crypto.randomBytes(12).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, salt);
        targetUser = await tx.user.create({
          data: {
            name: cleanName,
            email: walkinEmail,
            passwordHash,
            role: 'CUSTOMER'
          }
        });
      }

      // 3. Buat Transaksi dengan status langsung PAID (Tunai / CASH)
      const newTransaction = await tx.transaction.create({
        data: {
          userId: targetUser.id,
          totalAmount,
          subtotal: totalAmount,
          shippingCost: 0,
          shippingZone: 'STORE_PICKUP',
          courier: 'CASH / TOKO',
          courierService: 'Transaksi Kasir',
          recipientName: cleanName,
          phoneNumber: '-',
          fullAddress: 'Galeri Kyabel Bojonegoro (Transaksi Kasir Toko Fisik)',
          city: 'Bojonegoro',
          postalCode: '62111',
          status: 'PAID',
          snapToken: 'CASH', // Penanda metode pembayaran Tunai di Toko Fisik
          paymentUrl: null,
          items: {
            create: verifiedItems.map(vi => ({
              productId: vi.productId,
              quantity: vi.quantity,
              price: vi.price,
              size: vi.size,
              color: vi.color
            }))
          }
        },
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, name: true, email: true } }
        }
      });

      // 4. Catat riwayat order tracking untuk struk/pickup toko
      await tx.orderTracking.create({
        data: {
          orderNumber: newTransaction.id,
          customerName: cleanName,
          courier: 'CASH / TOKO',
          awbNumber: 'OFFLINE-STORE',
          status: 'SELESAI'
        }
      });

      const numericCash = cashReceived ? Number(cashReceived) : totalAmount;
      const changeAmount = Math.max(0, numericCash - totalAmount);

      return {
        transaction: newTransaction,
        totalAmount,
        cashReceived: numericCash,
        change: changeAmount
      };
    });

    res.status(201).json({
      message: 'Transaksi tunai (CASH) berhasil diproses dan dicatat sebagai LUNAS!',
      ...result
    });
  } catch (error: any) {
    console.error('Error creating cash transaction:', error.message);
    res.status(400).json({ error: error.message || 'Gagal memproses transaksi tunai.' });
  }
};

/**
 * Membatalkan pesanan (Customer atau Admin).
 * Otomatis melakukan rollback stok inventory dan memperbarui status tracking ke DIBATALKAN.
 */
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      res.status(401).json({ error: 'Akses ditolak. Silakan login kembali.' });
      return;
    }

    const tx = await prisma.transaction.findUnique({
      where: { id: id as string },
      include: { items: true }
    });

    if (!tx) {
      res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      return;
    }

    // Hanya pemilik pesanan atau ADMIN yang berhak membatalkan
    if (tx.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Anda tidak memiliki hak akses untuk membatalkan pesanan ini.' });
      return;
    }

    // Cek apakah sudah dibatalkan atau sudah lunas
    if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(tx.status)) {
      res.status(400).json({ error: 'Pesanan ini sudah dibatalkan sebelumnya.' });
      return;
    }

    if (tx.status === 'PAID') {
      res.status(400).json({ 
        error: 'Pesanan yang sudah lunas tidak dapat dibatalkan secara otomatis. Silakan hubungi admin atau kasir galeri.' 
      });
      return;
    }

    // Eksekusi pembatalan dan rollback stok secara atomik
    await prisma.$transaction(async (prismaTx) => {
      // 1. Update status transaksi ke CANCELLED
      await prismaTx.transaction.update({
        where: { id: id as string },
        data: { status: 'CANCELLED' }
      });

      // 2. Kembalikan stok inventory yang sebelumnya dikurangi
      for (const item of tx.items) {
        await prismaTx.inventory.update({
          where: { productId: item.productId },
          data: { stock: { increment: item.quantity } }
        });
      }

      // 3. Update status order tracking ke DIBATALKAN
      await prismaTx.orderTracking.updateMany({
        where: { orderNumber: id as string },
        data: { status: 'DIBATALKAN' }
      });
    });

    console.log(`[Order Cancelled] Order ${id} berhasil dibatalkan oleh user ${userId}. Stok produk dikembalikan.`);

    res.json({
      message: 'Pesanan berhasil dibatalkan dan stok produk telah dikembalikan.',
      orderId: id,
      status: 'CANCELLED'
    });
  } catch (error: any) {
    console.error('Error cancelling order:', error.message);
    res.status(500).json({ error: error.message || 'Gagal membatalkan pesanan.' });
  }
};



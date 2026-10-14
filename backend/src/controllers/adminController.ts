import { Request, Response } from 'express';
import prisma from '../config/prisma';

interface TransactionStatsRaw {
  totalRevenue: number;
  cashRevenue: number;
  offlineRevenue: number;
  onlineRevenue: number;
  offlinePaidOrders: number;
  onlinePaidOrders: number;

  guestRevenue: number;
  memberRevenue: number;
  guestPaidOrders: number;
  memberPaidOrders: number;

  guestOnlineRevenue: number;
  guestOfflineRevenue: number;
  guestOnlinePaidOrders: number;
  guestOfflinePaidOrders: number;

  memberOnlineRevenue: number;
  memberOfflineRevenue: number;
  memberOnlinePaidOrders: number;
  memberOfflinePaidOrders: number;

  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
  uniquePayingCustomers: number;
}

interface ProductStatsRaw {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  vfrReadyCount: number;
  totalStockUnits: number;
  menStockUnits: number;
  womenStockUnits: number;
  otherStockUnits: number;
  menProductCount: number;
  womenProductCount: number;
}

interface CategoryStockBreakdownRaw {
  category: string;
  subcategory: string;
  totalStock: number;
  productCount: number;
}

interface UserStatsRaw {
  totalUsers: number;
  customerCount: number;
  adminCount: number;
}

interface MembershipStatsRaw {
  totalMembers: number;
  bronze: number;
  silver: number;
  gold: number;
}

/**
 * Mengambil ringkasan data analitik dan statistik toko untuk Admin Dashboard.
 * Dioptimasi menggunakan Raw SQL Aggregation via $queryRaw dan Promise.all paralel
 * agar agregasi diproses langsung di engine database PostgreSQL (hemat memori & performa tinggi).
 */
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      [transactionStats],
      [productStats],
      categoryStockBreakdown,
      [userStats],
      [membershipStats],
      totalSubscribers,
      recentOrders
    ] = await Promise.all([
      // 1. Agregasi Transaksi, Pendapatan (Total, Offline/Cash, Online), & Segmentasi Pembeli (Tamu vs Member) di PostgreSQL
      prisma.$queryRaw<TransactionStatsRaw[]>`
        SELECT 
          COALESCE(SUM(CASE WHEN t.status = 'PAID' THEN t."totalAmount" ELSE 0 END), 0)::FLOAT as "totalRevenue",
          COALESCE(SUM(CASE WHEN t.status = 'PAID' AND (t."snapToken" IN ('CASH', 'CASH_ON_PICKUP') OR (t."shippingZone" = 'STORE_PICKUP' AND t."snapToken" = 'CASH_ON_PICKUP')) THEN t."totalAmount" ELSE 0 END), 0)::FLOAT as "cashRevenue",
          COALESCE(SUM(CASE WHEN t.status = 'PAID' AND (t."snapToken" IN ('CASH', 'CASH_ON_PICKUP') OR (t."shippingZone" = 'STORE_PICKUP' AND t."snapToken" = 'CASH_ON_PICKUP')) THEN t."totalAmount" ELSE 0 END), 0)::FLOAT as "offlineRevenue",
          COALESCE(SUM(CASE WHEN t.status = 'PAID' AND (t."snapToken" NOT IN ('CASH', 'CASH_ON_PICKUP') OR t."snapToken" IS NULL) THEN t."totalAmount" ELSE 0 END), 0)::FLOAT as "onlineRevenue",
          
          COUNT(*) FILTER (WHERE t.status = 'PAID' AND t."snapToken" IN ('CASH', 'CASH_ON_PICKUP'))::INT as "offlinePaidOrders",
          COUNT(*) FILTER (WHERE t.status = 'PAID' AND (t."snapToken" NOT IN ('CASH', 'CASH_ON_PICKUP') OR t."snapToken" IS NULL))::INT as "onlinePaidOrders",

          COALESCE(SUM(CASE WHEN t.status = 'PAID' AND (t."isGuest" = true OR u.email LIKE '%guest.%' OR u.email LIKE '%walkin.%') THEN t."totalAmount" ELSE 0 END), 0)::FLOAT as "guestRevenue",
          COALESCE(SUM(CASE WHEN t.status = 'PAID' AND (t."isGuest" = false AND u.email NOT LIKE '%guest.%' AND u.email NOT LIKE '%walkin.%') THEN t."totalAmount" ELSE 0 END), 0)::FLOAT as "memberRevenue",

          COUNT(*) FILTER (WHERE t.status = 'PAID' AND (t."isGuest" = true OR u.email LIKE '%guest.%' OR u.email LIKE '%walkin.%'))::INT as "guestPaidOrders",
          COUNT(*) FILTER (WHERE t.status = 'PAID' AND (t."isGuest" = false AND u.email NOT LIKE '%guest.%' AND u.email NOT LIKE '%walkin.%'))::INT as "memberPaidOrders",

          COALESCE(SUM(CASE WHEN t.status = 'PAID' AND (t."isGuest" = true OR u.email LIKE '%guest.%' OR u.email LIKE '%walkin.%') AND (t."snapToken" NOT IN ('CASH', 'CASH_ON_PICKUP') OR t."snapToken" IS NULL) THEN t."totalAmount" ELSE 0 END), 0)::FLOAT as "guestOnlineRevenue",
          COALESCE(SUM(CASE WHEN t.status = 'PAID' AND (t."isGuest" = true OR u.email LIKE '%guest.%' OR u.email LIKE '%walkin.%') AND t."snapToken" IN ('CASH', 'CASH_ON_PICKUP') THEN t."totalAmount" ELSE 0 END), 0)::FLOAT as "guestOfflineRevenue",
          COUNT(*) FILTER (WHERE t.status = 'PAID' AND (t."isGuest" = true OR u.email LIKE '%guest.%' OR u.email LIKE '%walkin.%') AND (t."snapToken" NOT IN ('CASH', 'CASH_ON_PICKUP') OR t."snapToken" IS NULL))::INT as "guestOnlinePaidOrders",
          COUNT(*) FILTER (WHERE t.status = 'PAID' AND (t."isGuest" = true OR u.email LIKE '%guest.%' OR u.email LIKE '%walkin.%') AND t."snapToken" IN ('CASH', 'CASH_ON_PICKUP'))::INT as "guestOfflinePaidOrders",

          COALESCE(SUM(CASE WHEN t.status = 'PAID' AND (t."isGuest" = false AND u.email NOT LIKE '%guest.%' AND u.email NOT LIKE '%walkin.%') AND (t."snapToken" NOT IN ('CASH', 'CASH_ON_PICKUP') OR t."snapToken" IS NULL) THEN t."totalAmount" ELSE 0 END), 0)::FLOAT as "memberOnlineRevenue",
          COALESCE(SUM(CASE WHEN t.status = 'PAID' AND (t."isGuest" = false AND u.email NOT LIKE '%guest.%' AND u.email NOT LIKE '%walkin.%') AND t."snapToken" IN ('CASH', 'CASH_ON_PICKUP') THEN t."totalAmount" ELSE 0 END), 0)::FLOAT as "memberOfflineRevenue",
          COUNT(*) FILTER (WHERE t.status = 'PAID' AND (t."isGuest" = false AND u.email NOT LIKE '%guest.%' AND u.email NOT LIKE '%walkin.%') AND (t."snapToken" NOT IN ('CASH', 'CASH_ON_PICKUP') OR t."snapToken" IS NULL))::INT as "memberOnlinePaidOrders",
          COUNT(*) FILTER (WHERE t.status = 'PAID' AND (t."isGuest" = false AND u.email NOT LIKE '%guest.%' AND u.email NOT LIKE '%walkin.%') AND t."snapToken" IN ('CASH', 'CASH_ON_PICKUP'))::INT as "memberOfflinePaidOrders",

          COUNT(*)::INT as "totalOrders",
          COUNT(*) FILTER (WHERE t.status = 'PAID')::INT as "paidOrders",
          COUNT(*) FILTER (WHERE t.status = 'PENDING')::INT as "pendingOrders",
          COUNT(*) FILTER (WHERE t.status IN ('FAILED', 'EXPIRED', 'CANCELLED'))::INT as "failedOrders",
          COUNT(DISTINCT t."userId") FILTER (WHERE t.status = 'PAID')::INT as "uniquePayingCustomers"
        FROM "Transaction" t
        LEFT JOIN "User" u ON t."userId" = u.id
      `,

      // 2. Agregasi Unit Fisik Stok Baju (Semua, Pria, Wanita) via LEFT JOIN di PostgreSQL
      prisma.$queryRaw<ProductStatsRaw[]>`
        SELECT 
          COUNT(p.id)::INT as "totalProducts",
          COUNT(p.id) FILTER (WHERE COALESCE(i.stock, 0) <= 5 AND COALESCE(i.stock, 0) > 0)::INT as "lowStockCount",
          COUNT(p.id) FILTER (WHERE COALESCE(i.stock, 0) = 0)::INT as "outOfStockCount",
          COUNT(p.id) FILTER (WHERE p."model3dUrl" IS NOT NULL AND p."model3dUrl" != '')::INT as "vfrReadyCount",
          COALESCE(SUM(i.stock), 0)::INT as "totalStockUnits",
          COALESCE(SUM(i.stock) FILTER (WHERE LOWER(p.category) = 'pria'), 0)::INT as "menStockUnits",
          COALESCE(SUM(i.stock) FILTER (WHERE LOWER(p.category) = 'wanita'), 0)::INT as "womenStockUnits",
          COALESCE(SUM(i.stock) FILTER (WHERE LOWER(p.category) NOT IN ('pria', 'wanita')), 0)::INT as "otherStockUnits",
          COUNT(p.id) FILTER (WHERE LOWER(p.category) = 'pria')::INT as "menProductCount",
          COUNT(p.id) FILTER (WHERE LOWER(p.category) = 'wanita')::INT as "womenProductCount"
        FROM "Product" p
        LEFT JOIN "Inventory" i ON p.id = i."productId"
      `,

      // 3. Rincian Stok Fisik per Kategori & Subkategori
      prisma.$queryRaw<CategoryStockBreakdownRaw[]>`
        SELECT 
          p.category, 
          p.subcategory, 
          COALESCE(SUM(i.stock), 0)::INT as "totalStock", 
          COUNT(p.id)::INT as "productCount"
        FROM "Product" p
        LEFT JOIN "Inventory" i ON p.id = i."productId"
        GROUP BY p.category, p.subcategory
        ORDER BY p.category ASC, "totalStock" DESC
      `,

      // 4. Statistik Pengguna berdasarkan Role
      prisma.$queryRaw<UserStatsRaw[]>`
        SELECT 
          COUNT(*)::INT as "totalUsers",
          COUNT(*) FILTER (WHERE role::text = 'CUSTOMER')::INT as "customerCount",
          COUNT(*) FILTER (WHERE role::text = 'ADMIN')::INT as "adminCount"
        FROM "User"
      `,

      // 5. Statistik Membership per Tier
      prisma.$queryRaw<MembershipStatsRaw[]>`
        SELECT 
          COUNT(*)::INT as "totalMembers",
          COUNT(*) FILTER (WHERE tier::text = 'BRONZE')::INT as "bronze",
          COUNT(*) FILTER (WHERE tier::text = 'SILVER')::INT as "silver",
          COUNT(*) FILTER (WHERE tier::text = 'GOLD')::INT as "gold"
        FROM "Membership"
      `,

      // 6. Total Subscriber Newsletter
      prisma.newsletterSubscriber.count(),

      // 7. Transaksi Terbaru (5 transaksi terakhir dengan nested query Prisma ORM)
      prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          items: { include: { product: true } }
        }
      })
    ]);

    res.json({
      overview: {
        totalRevenue: Number(transactionStats?.totalRevenue ?? 0),
        cashRevenue: Number(transactionStats?.cashRevenue ?? 0),
        offlineRevenue: Number(transactionStats?.offlineRevenue ?? 0),
        onlineRevenue: Number(transactionStats?.onlineRevenue ?? 0),
        offlinePaidOrders: Number(transactionStats?.offlinePaidOrders ?? 0),
        onlinePaidOrders: Number(transactionStats?.onlinePaidOrders ?? 0),

        guestRevenue: Number(transactionStats?.guestRevenue ?? 0),
        memberRevenue: Number(transactionStats?.memberRevenue ?? 0),
        guestPaidOrders: Number(transactionStats?.guestPaidOrders ?? 0),
        memberPaidOrders: Number(transactionStats?.memberPaidOrders ?? 0),

        guestOnlineRevenue: Number(transactionStats?.guestOnlineRevenue ?? 0),
        guestOfflineRevenue: Number(transactionStats?.guestOfflineRevenue ?? 0),
        guestOnlinePaidOrders: Number(transactionStats?.guestOnlinePaidOrders ?? 0),
        guestOfflinePaidOrders: Number(transactionStats?.guestOfflinePaidOrders ?? 0),

        memberOnlineRevenue: Number(transactionStats?.memberOnlineRevenue ?? 0),
        memberOfflineRevenue: Number(transactionStats?.memberOfflineRevenue ?? 0),
        memberOnlinePaidOrders: Number(transactionStats?.memberOnlinePaidOrders ?? 0),
        memberOfflinePaidOrders: Number(transactionStats?.memberOfflinePaidOrders ?? 0),

        totalOrders: Number(transactionStats?.totalOrders ?? 0),
        paidOrders: Number(transactionStats?.paidOrders ?? 0),
        pendingOrders: Number(transactionStats?.pendingOrders ?? 0),
        failedOrders: Number(transactionStats?.failedOrders ?? 0),
        uniquePayingCustomers: Number(transactionStats?.uniquePayingCustomers ?? 0),

        totalProducts: Number(productStats?.totalProducts ?? 0),
        totalStockUnits: Number(productStats?.totalStockUnits ?? 0),
        menStockUnits: Number(productStats?.menStockUnits ?? 0),
        womenStockUnits: Number(productStats?.womenStockUnits ?? 0),
        otherStockUnits: Number(productStats?.otherStockUnits ?? 0),
        menProductCount: Number(productStats?.menProductCount ?? 0),
        womenProductCount: Number(productStats?.womenProductCount ?? 0),
        lowStockCount: Number(productStats?.lowStockCount ?? 0),
        outOfStockCount: Number(productStats?.outOfStockCount ?? 0),
        vfrReadyCount: Number(productStats?.vfrReadyCount ?? 0),

        categoryBreakdown: (categoryStockBreakdown || []).map(b => ({
          category: b.category,
          subcategory: b.subcategory,
          totalStock: Number(b.totalStock ?? 0),
          productCount: Number(b.productCount ?? 0)
        })),

        totalUsers: Number(userStats?.totalUsers ?? 0),
        customerCount: Number(userStats?.customerCount ?? 0),
        adminCount: Number(userStats?.adminCount ?? 0),

        totalMembers: Number(membershipStats?.totalMembers ?? 0),
        membershipTiers: {
          bronze: Number(membershipStats?.bronze ?? 0),
          silver: Number(membershipStats?.silver ?? 0),
          gold: Number(membershipStats?.gold ?? 0)
        },
        totalSubscribers
      },
      recentOrders
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

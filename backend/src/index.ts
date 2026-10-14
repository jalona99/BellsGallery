import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import productRoutes from './routes/product.routes';
import userRoutes from './routes/user.routes';
import transactionRoutes from './routes/transaction.routes';
import authRoutes from './routes/authRoutes';
import addressRoutes from './routes/address.routes';
import wishlistRoutes from './routes/wishlist.routes';
import newsletterRoutes from './routes/newsletter.routes';
import adminRoutes from './routes/admin.routes';
import { connectRedis } from './config/redis';

import helmet from 'helmet';
import { apiLimiter } from './middlewares/rateLimiter';

dotenv.config(); // Reloaded with dual-transport SMTP config

const app = express();
const port = process.env.PORT || 3001;

// 1. Security Headers (Helmet)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Nonaktifkan CSP di API level agar tidak konflik dengan response data / 3D model
}));

// 2. CORS Policy Hardening
const allowedOriginsProd = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (seperti Next.js server rewrite proxy, curl, background worker, mobile native)
    if (!origin) return callback(null, true);

    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
      // Pada mode produksi: hanya izinkan origin yang terdaftar di konfigurasi ALLOWED_ORIGINS
      if (allowedOriginsProd.length > 0 && allowedOriginsProd.includes(origin)) {
        return callback(null, true);
      }
      // Tolak origin yang tidak dikenal pada mode produksi
      return callback(new Error('Akses diblokir oleh kebijakan keamanan CORS.'));
    }

    // Pada mode development / staging: izinkan localhost, LAN IP, dan Cloudflare tunnel untuk testing
    if (
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') || 
      origin.includes('.trycloudflare.com') ||
      /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin)
    ) {
      return callback(null, true);
    }
    
    return callback(null, true);
  },
  credentials: true
}));

// 3. Batasi ukuran body payload untuk mencegah memory exhaustion / DoS
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// 4. Rate Limiter Global untuk seluruh endpoint API
app.use('/api', apiLimiter);

// Routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 5. Global Error Handling Middleware (Mencegah kebocoran stack trace ke klien)
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[UNHANDLED SERVER ERROR]', err.stack || err.message || err);
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    error: isProd ? 'Terjadi kesalahan pada server.' : (err.message || 'Internal server error')
  });
});

// Start Server
app.listen(port, async () => {
  console.log(`Backend server is running on http://localhost:${port}`);
  await connectRedis();
});

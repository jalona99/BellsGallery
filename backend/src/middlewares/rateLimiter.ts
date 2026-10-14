import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter khusus untuk endpoint sensitif (Login, Register, Reset Password).
 * Membatasi percobaan maksimal 20 kali per 15 menit per IP address
 * untuk mencegah serangan Brute Force dan registrasi bot massal.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20, // Maksimal 20 percobaan per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    message: 'Terlalu banyak permintaan autentikasi dari perangkat ini. Silakan coba lagi setelah 15 menit.'
  }
});

/**
 * Rate Limiter global untuk seluruh rute API publik.
 * Membatasi 500 request per 15 menit per IP untuk mencegah DoS / Spamming berlebihan.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    message: 'Terlalu banyak permintaan ke server. Silakan tunggu beberapa saat lagi.'
  }
});

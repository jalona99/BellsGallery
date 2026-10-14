import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Middleware untuk memverifikasi token JWT dari HttpOnly Cookie.
 * Memastikan bahwa hanya pengguna dengan sesi valid yang dapat melanjutkan request.
 */
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  let token = req.cookies?.token;
  
  // Dukung Authorization Bearer Header jika token tidak ada di cookie
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    res.status(401).json({ message: 'Akses ditolak. Silakan login kembali.' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'phygital-super-secret-key-2026';
    if (process.env.NODE_ENV === 'production' && secret === 'phygital-super-secret-key-2026') {
      console.error('[CRITICAL SECURITY WARNING] JWT_SECRET menggunakan kunci default di mode produksi!');
    }
    const decoded = (jwt.verify(token, secret) as any);
    const userId = decoded.id || decoded.userId;
    const userRole = decoded.role || 'CUSTOMER';
    
    req.user = {
      id: userId,
      role: userRole
    };
    next();
  } catch (error) {
    res.status(403).json({ message: 'Token tidak valid atau sudah kedaluwarsa.' });
    return;
  }
};

/**
 * Middleware untuk memeriksa apakah role pengguna termasuk dalam daftar role yang diizinkan (RBAC).
 * Harus dipanggil setelah verifyToken.
 * 
 * @param {string[]} roles Array role yang diizinkan (contoh: ['ADMIN'])
 */
export const verifyRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Anda tidak memiliki hak akses (Role) untuk melakukan aksi ini.' });
      return;
    }
    next();
  };
};

/**
 * Middleware opsional: jika ada token valid, pasang req.user.
 * Jika tidak ada token (Guest Checkout), tetap lanjutkan request tanpa error 401.
 */
export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  let token = req.cookies?.token;
  
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || 'phygital-super-secret-key-2026';
    const decoded = (jwt.verify(token, secret!) as any);
    const userId = decoded.id || decoded.userId;
    const userRole = decoded.role || 'CUSTOMER';
    
    req.user = {
      id: userId,
      role: userRole
    };
  } catch (_) {
    // Token tidak valid atau kedaluwarsa, abaikan dan lanjutkan sebagai Guest
  }
  next();
};

import { Router } from 'express';
import { register, login, logout, googleAuth } from '../controllers/authController';
import { verifyToken, AuthRequest } from '../middlewares/authMiddleware';
import { authLimiter } from '../middlewares/rateLimiter';
import prisma from '../config/prisma';

const router = Router();

// Rute Publik (Unauthenticated) - Dilindungi dengan Rate Limiter dari serangan Brute Force
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/logout', logout);

// Rute Proteksi (Authenticated) - Mengambil data user yang sedang login
router.get('/me', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Akses ditolak.' });
      return;
    }

    // req.user di-assign oleh verifyToken middleware
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    
    if (!user) {
      res.status(404).json({ message: 'User tidak ditemukan' });
      return;
    }
    
    res.json({ message: 'Akses diizinkan', user });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan internal server.' });
  }
});

export default router;

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { sendEmail } from '../utils/email';
import { generateOtpEmailHtml, generateOtpEmailText } from '../utils/emailTemplates';

const JWT_SECRET = process.env.JWT_SECRET || 'phygital-super-secret-key-2026';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password : '';

    if (!cleanName || !cleanEmail || !cleanPassword) {
      res.status(400).json({ error: 'Please provide name, email, and password' });
      return;
    }

    if (cleanName.length < 2 || cleanName.length > 70) {
      res.status(400).json({ error: 'Name must be between 2 and 70 characters' });
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    if (cleanPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long' });
      return;
    }

    if (!/[a-zA-Z]/.test(cleanPassword) || !/[0-9]/.test(cleanPassword)) {
      res.status(400).json({ error: 'Password must contain both letters and numbers' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(cleanPassword, salt);

    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        passwordHash,
      },
    });

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Please provide email and password' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    res.json({ message: 'Profile updated', user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Please provide both current and new passwords' });
      return;
    }

    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      res.status(400).json({ error: 'New password must be at least 8 characters and contain both letters and numbers' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!cleanEmail) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      // Return 200 even if not found to prevent email enumeration
      res.json({ message: 'If email exists, an OTP will be sent.' });
      return;
    }

    // Generate 6 digit OTP menggunakan CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

    await prisma.user.update({
      where: { email: cleanEmail },
      data: {
        resetToken: otp,
        resetTokenExpiry: otpExpiry,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n========================================`);
      console.log(`[AUTH-OTP DEV] Kode verifikasi OTP untuk ${user.email}: ${otp}`);
      console.log(`========================================\n`);
    }

    // Generate Meta-styled professional HTML email + plain-text fallback
    const emailPayload = {
      userName: user.name,
      email: user.email,
      otp,
      expiryMinutes: 15,
    };
    const html = generateOtpEmailHtml(emailPayload);
    const text = generateOtpEmailText(emailPayload);

    const subject = `${otp} adalah kode konfirmasi BELLSGALLERY Anda`;

    try {
      await sendEmail(user.email, subject, html, text);
    } catch (mailError: any) {
      console.warn('[MAIL WARNING] Gagal mengirim email OTP via SMTP:', mailError.message);
      if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ error: 'Gagal mengirim email verifikasi. Silakan hubungi customer service.' });
        return;
      }
      // Pada mode development tanpa SMTP aktif
      res.json({ 
        message: 'Kode OTP telah dibuat (periksa terminal server backend).'
      });
      return;
    }

    res.json({ 
      message: 'Kode OTP telah dikirimkan ke email Anda.'
    });
  } catch (error: any) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanOtp = typeof otp === 'string' ? otp.trim() : '';
    if (!cleanEmail || !cleanOtp || !newPassword) {
      res.status(400).json({ error: 'Email, OTP, and new password are required' });
      return;
    }

    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      res.status(400).json({ error: 'Password must be at least 8 characters and contain both letters and numbers' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      res.status(400).json({ error: 'Invalid email or OTP' });
      return;
    }

    if (!user.resetToken || !user.resetTokenExpiry) {
      res.status(400).json({ error: 'Permintaan reset password tidak ditemukan atau sudah kedaluwarsa.' });
      return;
    }

    if (user.resetTokenExpiry < new Date()) {
      res.status(400).json({ error: 'Kode OTP telah kedaluwarsa. Silakan minta kode baru.' });
      return;
    }

    const userTokenBuf = Buffer.from(user.resetToken, 'utf-8');
    const cleanOtpBuf = Buffer.from(cleanOtp, 'utf-8');
    const isTokenMatch = userTokenBuf.length === cleanOtpBuf.length && crypto.timingSafeEqual(userTokenBuf, cleanOtpBuf);

    if (!isTokenMatch) {
      res.status(400).json({ error: 'Kode OTP salah. Pastikan Anda memasukkan 6 digit kode yang benar.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { email: cleanEmail },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error in reset password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mengambil semua data pengguna untuk Admin Dashboard.
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        membership: {
          select: {
            tier: true,
            points: true,
            phone: true
          }
        },
        _count: {
          select: {
            transactions: true,
            addresses: true,
            wishlists: true
          }
        }
      }
    });
    res.json({ users });
  } catch (error: any) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mengubah role pengguna (ADMIN <-> CUSTOMER).
 */
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['ADMIN', 'CUSTOMER'].includes(role)) {
      res.status(400).json({ error: 'Role harus ADMIN atau CUSTOMER' });
      return;
    }

    // Mencegah admin mencabut hak akses dirinya sendiri jika dia adalah satu-satunya admin
    const currentAdminId = (req as any).user?.id;
    if (currentAdminId === id && role === 'CUSTOMER') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Tidak dapat mencabut hak akses satu-satunya akun Administrator.' });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: id as string },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    });

    const msg = role === 'ADMIN' 
      ? `Pengguna ${updatedUser.name} berhasil dipromosikan menjadi ADMIN` 
      : `Role ADMIN pada ${updatedUser.name} berhasil dihapus (menjadi CUSTOMER)`;

    res.json({ message: msg, user: updatedUser });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Menghapus/mencabut role ADMIN pada pengguna (mengembalikan ke default CUSTOMER).
 */
export const removeUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentAdminId = (req as any).user?.id;

    if (currentAdminId === id) {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Tidak dapat menghapus role dari satu-satunya akun Administrator.' });
        return;
      }
    }

    const targetUser = await prisma.user.findUnique({ where: { id: id as string } });
    if (!targetUser) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }

    if (targetUser.role === 'CUSTOMER') {
      res.status(400).json({ error: 'Pengguna ini sudah berstatus CUSTOMER (tidak memiliki role admin untuk dihapus).' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: id as string },
      data: { role: 'CUSTOMER' },
      select: { id: true, name: true, email: true, role: true }
    });

    res.json({ 
      message: `Role ADMIN pada akun ${updatedUser.name} berhasil dihapus (status kembali menjadi CUSTOMER).`, 
      user: updatedUser 
    });
  } catch (error: any) {
    console.error('Error removing user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Menghapus akun pengguna secara permanen oleh Admin.
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentAdminId = (req as any).user?.id;

    if (currentAdminId === id) {
      res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang login.' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id: id as string } });
    if (!targetUser) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }

    if (targetUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Tidak dapat menghapus satu-satunya akun Administrator.' });
        return;
      }
    }

    // Hapus seluruh relasi pengguna secara aman dengan Prisma transaction
    await prisma.$transaction([
      prisma.wishlist.deleteMany({ where: { userId: id as string } }),
      prisma.address.deleteMany({ where: { userId: id as string } }),
      prisma.membership.deleteMany({ where: { userId: id as string } }),
      prisma.transactionItem.deleteMany({ where: { transaction: { userId: id as string } } }),
      prisma.transaction.deleteMany({ where: { userId: id as string } }),
      prisma.user.delete({ where: { id: id as string } })
    ]);

    res.json({ message: `Pengguna ${targetUser.name} (${targetUser.email}) berhasil dihapus secara permanen.` });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


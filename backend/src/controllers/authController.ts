import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import prisma from '../config/prisma';

// Regex standar untuk verifikasi format email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mendapatkan JWT Secret dengan perlindungan produksi
 */
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'phygital-super-secret-key-2026') {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL SECURITY WARNING: JWT_SECRET belum diset dengan aman untuk mode produksi!');
    }
    return secret || 'phygital-super-secret-key-2026';
  }
  return secret;
};

/**
 * Registrasi pengguna baru dengan validasi keamanan ketat.
 * Password akan di-hash menggunakan bcrypt dengan salt rounds 10.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password : '';

    // 1. Validasi keberadaan input
    if (!cleanName || !cleanEmail || !cleanPassword) {
      res.status(400).json({ message: 'Nama, email, dan password wajib diisi.' });
      return;
    }

    // 2. Validasi panjang nama
    if (cleanName.length < 2 || cleanName.length > 70) {
      res.status(400).json({ message: 'Nama harus berjarak 2 hingga 70 karakter.' });
      return;
    }

    // 3. Validasi format email
    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ message: 'Format email tidak valid.' });
      return;
    }

    // 4. Validasi kekuatan password (minimal 8 karakter, ada kombinasi huruf dan angka)
    if (cleanPassword.length < 8) {
      res.status(400).json({ message: 'Password minimal harus 8 karakter demi keamanan akun Anda.' });
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(cleanPassword);
    const hasNumber = /[0-9]/.test(cleanPassword);
    if (!hasLetter || !hasNumber) {
      res.status(400).json({ message: 'Password harus mengandung kombinasi minimal satu huruf dan satu angka.' });
      return;
    }

    // 5. Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      res.status(400).json({ message: 'Email sudah terdaftar. Silakan gunakan email lain atau masuk.' });
      return;
    }

    // 6. Hashing password dengan bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(cleanPassword, salt);

    const newUser = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        role: 'CUSTOMER',
      },
    });

    res.status(201).json({
      message: 'Registrasi berhasil',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      }
    });
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat registrasi.' });
  }
};

/**
 * Login pengguna dan menerbitkan token JWT dalam HttpOnly Cookie.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password : '';

    if (!cleanEmail || !cleanPassword) {
      res.status(400).json({ message: 'Email dan password wajib diisi.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      res.status(401).json({ message: 'Email atau password salah.' });
      return;
    }

    // Bandingkan password plaintext dari request dengan hash di database
    const isMatch = await bcrypt.compare(cleanPassword, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Email atau password salah.' });
      return;
    }

    const secret = getJwtSecret();
    const expiresIn = (process.env.JWT_EXPIRES_IN || '1d') as string;

    const token = jwt.sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn } as jwt.SignOptions
    );

    const isProd = process.env.NODE_ENV === 'production';

    // Set HttpOnly Cookie dengan atribut keamanan produksi
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 hari
    });

    res.status(200).json({
      message: 'Login berhasil',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat login.' });
  }
};

/**
 * Logout pengguna dengan menghapus HttpOnly cookie.
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
  res.status(200).json({ message: 'Logout berhasil' });
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Autentikasi menggunakan Google Sign-In (Registrasi otomatis jika belum ada akun, atau Login).
 * Memverifikasi integritas ID Token langsung ke server otentikasi Google.
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ message: 'Kredensial token Google wajib disertakan.' });
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;

    // Verifikasi ID Token langsung dengan Google
    const verifyOptions: { idToken: string; audience?: string } = {
      idToken: credential,
    };
    if (clientId) {
      verifyOptions.audience = clientId;
    }

    const ticket: any = await googleClient.verifyIdToken(verifyOptions);

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ message: 'Token Google tidak valid atau email tidak ditemukan.' });
      return;
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || payload.given_name || email.split('@')[0];

    // Cek apakah user sudah terdaftar di database
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Registrasi otomatis user baru dengan identitas Google
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'CUSTOMER',
        },
      });
    }

    const secret = getJwtSecret();
    const expiresIn = (process.env.JWT_EXPIRES_IN || '1d') as string;

    const token = jwt.sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn } as jwt.SignOptions
    );

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: 'Autentikasi Google berhasil',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error in googleAuth:', error);
    res.status(401).json({ message: 'Verifikasi akun Google gagal atau token kedaluwarsa.' });
  }
};


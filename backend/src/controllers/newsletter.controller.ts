import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const subscribeNewsletter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Alamat email tidak valid.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Format email tidak sesuai.' });
      return;
    }

    const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existingSubscriber) {
      res.status(409).json({ error: 'Email ini sudah terdaftar.' });
      return;
    }

    await prisma.newsletterSubscriber.create({
      data: { email },
    });

    res.status(201).json({ message: 'Terima kasih telah mendaftar!' });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mengambil daftar seluruh subscriber newsletter (Khusus Admin).
 */
export const getAllSubscribers = async (req: Request, res: Response): Promise<void> => {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { registeredAt: 'desc' }
    });
    res.json({ subscribers });
  } catch (error: any) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

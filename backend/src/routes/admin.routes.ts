import { Router } from 'express';
import { getAdminStats } from '../controllers/adminController';
import { verifyToken, verifyRole } from '../middlewares/authMiddleware';

const router = Router();

// Endpoint analitik untuk Admin Dashboard
router.get('/stats', verifyToken, verifyRole(['ADMIN']), getAdminStats);

export default router;

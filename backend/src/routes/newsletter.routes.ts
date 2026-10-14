import { Router } from 'express';
import { subscribeNewsletter, getAllSubscribers } from '../controllers/newsletter.controller';
import { verifyToken, verifyRole } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', subscribeNewsletter);
router.get('/', verifyToken, verifyRole(['ADMIN']), getAllSubscribers);

export default router;

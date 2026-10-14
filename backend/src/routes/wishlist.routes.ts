import { Router } from 'express';
import { getWishlist, toggleWishlist } from '../controllers/wishlistController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', verifyToken, getWishlist);
router.post('/toggle', verifyToken, toggleWishlist);

export default router;

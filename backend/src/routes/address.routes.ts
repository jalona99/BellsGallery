import { Router } from 'express';
import { getAddresses, addAddress, deleteAddress } from '../controllers/addressController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', verifyToken, getAddresses);
router.post('/', verifyToken, addAddress);
router.delete('/:id', verifyToken, deleteAddress);

export default router;

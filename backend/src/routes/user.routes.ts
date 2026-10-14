import { Router } from 'express';
import { 
  register, 
  login, 
  updateProfile, 
  changePassword, 
  forgotPassword, 
  resetPassword,
  getAllUsers,
  updateUserRole,
  removeUserRole,
  deleteUser 
} from '../controllers/userController';
import { verifyToken, verifyRole } from '../middlewares/authMiddleware';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.put('/profile', verifyToken, updateProfile);
router.put('/password', verifyToken, changePassword);

router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Admin User Management routes
router.get('/all', verifyToken, verifyRole(['ADMIN']), getAllUsers);
router.put('/:id/role', verifyToken, verifyRole(['ADMIN']), updateUserRole);
router.delete('/:id/role', verifyToken, verifyRole(['ADMIN']), removeUserRole);
router.delete('/:id', verifyToken, verifyRole(['ADMIN']), deleteUser);

export default router;

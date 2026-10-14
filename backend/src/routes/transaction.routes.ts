import { Router } from 'express';
import { 
  checkout, 
  midtransWebhook, 
  getHistory, 
  getAllTransactions,
  updateTransactionStatus,
  getOrderTracking,
  getAllOrderTrackings,
  upsertOrderTracking,
  createCashTransaction,
  syncTransactionStatus,
  getShippingRates,
  cancelOrder
} from '../controllers/transactionController';
import { verifyToken, verifyRole, optionalAuth } from '../middlewares/authMiddleware';

const router = Router();

router.get('/shipping-rates', getShippingRates);
router.post('/checkout', optionalAuth, checkout);
router.post('/webhook', midtransWebhook);
router.post('/sync/:id', optionalAuth, syncTransactionStatus);
router.get('/sync/:id', optionalAuth, syncTransactionStatus);
router.get('/history', verifyToken, getHistory);
router.get('/all', verifyToken, verifyRole(['ADMIN']), getAllTransactions);

// Admin Offline Cash Transaction (POS Toko Fisik)
router.post('/cash', verifyToken, verifyRole(['ADMIN']), createCashTransaction);

// Admin Transaction Status Management
router.put('/:id/status', verifyToken, verifyRole(['ADMIN']), updateTransactionStatus);

// Cancel Order (User/Admin)
router.post('/:id/cancel', verifyToken, cancelOrder);

// Order Tracking / Resi Kurir (Publik untuk pembeli tamu & customer)
router.get('/tracking/all', verifyToken, verifyRole(['ADMIN']), getAllOrderTrackings);
router.get('/tracking/:orderNumber', getOrderTracking);
router.post('/tracking', verifyToken, verifyRole(['ADMIN']), upsertOrderTracking);

export default router;

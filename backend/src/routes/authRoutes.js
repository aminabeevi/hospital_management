import { Router } from 'express';
import {
  handleSendOtp,
  handleVerifyOtp,
  handlePasswordLogin,
  handleGetMe,
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Public Authentication Routes
router.post('/send-otp', handleSendOtp);
router.post('/verify-otp', handleVerifyOtp);
router.post('/login', handlePasswordLogin);
router.post('/login-password', handlePasswordLogin);

// Protected Route (Requires valid JWT)
router.get('/me', authenticateToken, handleGetMe);

export default router;


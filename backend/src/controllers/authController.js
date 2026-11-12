import { requestOtp, verifyOtp } from '../services/otpService.js';
import { loginWithPassword, getUserProfile } from '../services/authService.js';
import { generateToken } from '../utils/token.js';

/**
 * Send OTP to user's phone number
 * POST /api/auth/send-otp
 */
export async function handleSendOtp(req, res) {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required.',
      });
    }

    const result = await requestOtp(phone);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * Verify OTP, identify role, and issue JWT
 * POST /api/auth/verify-otp
 */
export async function handleVerifyOtp(req, res) {
  try {
    const { phone } = req.body;
    const otpCode = req.body.otpCode || req.body.otp;

    if (!phone || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Both mobile number and 6-digit OTP code are required.',
      });
    }

    const verification = await verifyOtp(phone, otpCode);
    const fullUser = await getUserProfile(verification.user.id);
    const token = generateToken(verification.user);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: fullUser,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * Staff & Demo Password Login
 * POST /api/auth/login-password
 */
export async function handlePasswordLogin(req, res) {
  try {
    const { password } = req.body;
    const identifier = req.body.identifier || req.body.phone || req.body.email;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone number/email and password are required.',
      });
    }

    const result = await loginWithPassword(identifier, password);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
export async function handleGetMe(req, res) {
  try {
    const userProfile = await getUserProfile(req.user.id);

    return res.status(200).json({
      success: true,
      user: userProfile,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
}


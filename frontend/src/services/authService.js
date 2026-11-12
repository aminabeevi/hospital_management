import api from './api';

export const authService = {
  // Request 6-digit OTP
  async sendOtp(phone) {
    const response = await api.post('/auth/send-otp', { phone });
    return response.data;
  },

  // Verify OTP and receive JWT
  async verifyOtp(phone, otpCode) {
    const response = await api.post('/auth/verify-otp', { phone, otpCode });
    return response.data;
  },

  // Staff and demo password login
  async loginWithPassword(identifier, password) {
    const response = await api.post('/auth/login-password', { identifier, password });
    return response.data;
  },

  // Fetch current authenticated user profile
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};


import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import {
  Activity,
  Phone,
  Lock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, getDashboardPath } = useAuth();

  const [authMode, setAuthMode] = useState('otp'); // 'otp' or 'password'

  // OTP Form State
  const [phone, setPhone] = useState('9876543210'); // Default to Alex Johnson for demo convenience
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [mockOtpHint, setMockOtpHint] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Password Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Handle Request OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await authService.sendOtp(phone);
      setOtpSent(true);
      setSuccessMsg(res.message);
      if (res.mockOtp) {
        setMockOtpHint(res.mockOtp);
      }
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authService.verifyOtp(phone, otpCode);
      if (res.success && res.token && res.user) {
        login(res.token, res.user);
        const destination = location.state?.from?.pathname || getDashboardPath(res.user.role);
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Login (Staff / Demo)
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authService.loginWithPassword(identifier, password);
      if (res.success && res.token && res.user) {
        login(res.token, res.user);
        const destination = location.state?.from?.pathname || getDashboardPath(res.user.role);
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper for demo accounts
  const fillDemoAccount = (id, pass) => {
    setAuthMode('password');
    setIdentifier(id);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">CarePulse HMS</h1>
            <p className="text-[11px] text-slate-500 font-medium">Healthcare SaaS Management Platform</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
          Secure Portal
        </span>
      </header>

      {/* Main Login Card Container */}
      <div className="max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Card Banner */}
          <div className="p-6 bg-gradient-to-r from-teal-700 to-teal-800 text-white">
            <h2 className="text-xl font-bold">Welcome to CarePulse</h2>
            <p className="text-teal-100 text-xs mt-1">
              Sign in with your mobile number to access appointments, records, and services.
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setAuthMode('otp'); setError(null); }}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                authMode === 'otp'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" /> Mobile OTP Login
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('password'); setError(null); }}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                authMode === 'password'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" /> Staff Password
            </button>
          </div>

          {/* Card Body */}
          <div className="p-6 space-y-4">
            {/* Error Notification */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Notification */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Mock OTP Helper Chip */}
            {mockOtpHint && authMode === 'otp' && (
              <div
                onClick={() => setOtpCode(mockOtpHint)}
                className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs cursor-pointer hover:bg-amber-100 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Development Mock OTP: </span>
                    <span className="font-mono text-sm font-black tracking-widest">{mockOtpHint}</span>
                  </div>
                </div>
                <span className="text-[11px] underline font-semibold text-amber-700">Click to fill</span>
              </div>
            )}

            {/* 1. OTP Authentication Form */}
            {authMode === 'otp' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      disabled={otpSent && loading}
                      className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition font-mono tracking-wider"
                    />
                  </div>
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading || phone.length < 10}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending verification code...' : 'Send 6-Digit OTP'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Enter 6-Digit OTP Code
                        </label>
                        {countdown > 0 ? (
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Resend in {countdown}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            className="text-[11px] text-teal-600 hover:underline font-semibold"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="• • • • • •"
                        maxLength={6}
                        autoFocus
                        className="w-full py-2.5 px-4 bg-slate-50 border border-slate-300 rounded-xl text-base text-center font-mono tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Verifying...' : 'Verify OTP & Log In'}
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtpCode(''); setMockOtpHint(null); }}
                      className="w-full text-center text-[11px] text-slate-500 hover:text-slate-800"
                    >
                      Change Mobile Number
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* 2. Staff Password Authentication Form */}
            {authMode === 'password' && (
              <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number or Email
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. 9999999990 or admin@carepulse.com"
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In with Password'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

          {/* Quick Demo Credentials Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" /> 1-Click Demo Accounts
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => fillDemoAccount('9999999990', 'Password@123')}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-teal-500 hover:text-teal-700 transition text-left"
              >
                <span className="font-bold block text-teal-800">Admin</span>
                <span className="text-[10px] text-slate-400 font-mono">9999999990</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('9999999991', 'Password@123')}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-teal-500 hover:text-teal-700 transition text-left"
              >
                <span className="font-bold block text-teal-800">Receptionist</span>
                <span className="text-[10px] text-slate-400 font-mono">9999999991</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('9999999992', 'Password@123')}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-teal-500 hover:text-teal-700 transition text-left"
              >
                <span className="font-bold block text-teal-800">Dr. Robert Chen</span>
                <span className="text-[10px] text-slate-400 font-mono">Cardiology</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('otp');
                  setPhone('9876543210');
                  setOtpSent(false);
                  setOtpCode('');
                }}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-teal-500 hover:text-teal-700 transition text-left"
              >
                <span className="font-bold block text-teal-800">Patient (Alex)</span>
                <span className="text-[10px] text-slate-400 font-mono">OTP Flow</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200 bg-white">
        CarePulse Hospital Management System • Role-Based Healthcare SaaS
      </footer>
    </div>
  );
}


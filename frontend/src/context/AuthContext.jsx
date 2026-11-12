import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('carepulse_token'));
  const [loading, setLoading] = useState(true);

  // Validate session on page refresh
  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('carepulse_token');
      if (savedToken) {
        try {
          const res = await authService.getCurrentUser();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            logout();
          }
        } catch (err) {
          console.error('Session validation failed:', err.message);
          logout();
        }
      }
      setLoading(false);
    }

    loadUser();
  }, []);

  const login = (newToken, newUser) => {
    localStorage.setItem('carepulse_token', newToken);
    localStorage.setItem('carepulse_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('carepulse_token');
    localStorage.removeItem('carepulse_user');
    setToken(null);
    setUser(null);
  };

  const getDashboardPath = (role) => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'doctor':
        return '/doctor';
      case 'receptionist':
        return '/receptionist';
      case 'patient':
        return '/patient';
      default:
        return '/login';
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    getDashboardPath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, loading, isAuthenticated, getDashboardPath } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-lg animate-bounce mb-4">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-slate-700">CarePulse HMS</p>
        <p className="text-xs text-slate-400 mt-1">Verifying session & permissions...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check Role Permissions
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // User is logged in but doesn't have required permission for this section
    const fallbackPath = getDashboardPath(user.role);
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}


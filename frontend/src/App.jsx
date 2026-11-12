import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/auth/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import PatientDashboard from './pages/patient/PatientDashboard';

// Helper component to redirect authenticated users to their assigned role dashboard
function RootRedirector() {
  const { isAuthenticated, user, getDashboardPath, loading } = useAuth();

  if (loading) return null;

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Root Redirector */}
          <Route path="/" element={<RootRedirector />} />

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<DashboardLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="*" element={<AdminDashboard />} />
            </Route>
          </Route>

          {/* Doctor Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
            <Route path="/doctor" element={<DashboardLayout />}>
              <Route index element={<DoctorDashboard />} />
              <Route path="*" element={<DoctorDashboard />} />
            </Route>
          </Route>

          {/* Receptionist Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['receptionist']} />}>
            <Route path="/receptionist" element={<DashboardLayout />}>
              <Route index element={<ReceptionistDashboard />} />
              <Route path="*" element={<ReceptionistDashboard />} />
            </Route>
          </Route>

          {/* Patient Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
            <Route path="/patient" element={<DashboardLayout />}>
              <Route index element={<PatientDashboard />} />
              <Route path="*" element={<PatientDashboard />} />
            </Route>
          </Route>

          {/* Fallback Catch-All */}
          <Route path="*" element={<RootRedirector />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

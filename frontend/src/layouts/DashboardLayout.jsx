import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Users,
  UserPlus,
  Calendar,
  Building2,
  FileText,
  Clock,
  LogOut,
  Menu,
  X,
  Stethoscope,
  LayoutDashboard,
  Pill,
  User,
  ShieldCheck,
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Build role-specific navigation menu items
  const getNavLinks = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
          { to: '/admin/doctors', label: 'Doctor Management', icon: Stethoscope },
          { to: '/admin/patients', label: 'Patient Directory', icon: Users },
          { to: '/admin/departments', label: 'Departments', icon: Building2 },
          { to: '/admin/appointments', label: 'All Appointments', icon: Calendar },
        ];
      case 'doctor':
        return [
          { to: '/doctor', label: 'Doctor Dashboard', icon: LayoutDashboard },
          { to: '/doctor/appointments', label: "Today's Appointments", icon: Calendar },
          { to: '/doctor/patients', label: 'Patient Records', icon: Users },
          { to: '/doctor/profile', label: 'My Profile', icon: User },
        ];
      case 'receptionist':
        return [
          { to: '/receptionist', label: 'Reception Dashboard', icon: LayoutDashboard },
          { to: '/receptionist/register-patient', label: 'Register Patient', icon: UserPlus },
          { to: '/receptionist/book-appointment', label: 'Book Appointment', icon: Calendar },
          { to: '/receptionist/schedules', label: 'Doctor Schedules', icon: Clock },
        ];
      case 'patient':
        return [
          { to: '/patient', label: 'Patient Dashboard', icon: LayoutDashboard },
          { to: '/patient/book', label: 'Book Appointment', icon: Calendar },
          { to: '/patient/appointments', label: 'My Appointments', icon: Clock },
          { to: '/patient/prescriptions', label: 'Prescriptions', icon: Pill },
          { to: '/patient/records', label: 'Medical Records', icon: FileText },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'doctor':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'receptionist':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'patient':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">
        {/* Brand Logo */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">CarePulse HMS</h1>
            <p className="text-[11px] text-slate-400 font-medium capitalize">{user?.role} Portal</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin' || item.to === '/doctor' || item.to === '/receptionist' || item.to === '/patient'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout in Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 m-2 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center uppercase">
              {user?.name?.slice(0, 2) || 'CP'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-900 truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-500 font-mono truncate">{user?.phone}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm text-slate-900">CarePulse</span>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(user?.role)}`}>
            {user?.role}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-2 z-10">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 mt-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="hidden md:flex bg-white border-b border-slate-200 h-16 px-8 items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-800">
              Welcome back, <span className="text-teal-700">{user?.name}</span>
            </h2>
            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border tracking-wider ${getRoleBadgeStyle(user?.role)}`}>
              {user?.role}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-900">{user?.name}</div>
              <div className="text-[11px] text-slate-400 font-mono">{user?.phone}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center uppercase shadow-xs">
              {user?.name?.slice(0, 2) || 'CP'}
            </div>
          </div>
        </header>

        {/* Nested Page Content */}
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


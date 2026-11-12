import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import DoctorModal from '../../components/admin/DoctorModal';
import DepartmentModal from '../../components/admin/DepartmentModal';
import {
  Users,
  Stethoscope,
  Calendar,
  Building2,
  TrendingUp,
  Plus,
  Edit2,
  Power,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  IndianRupee,
  ShieldCheck,
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments', 'doctors', 'departments', 'patients'

  // Data States
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);

  // Filter States
  const [appointmentFilter, setAppointmentFilter] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // UI States
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Modals
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);

  // Load all admin data
  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, docsRes, deptsRes, aptsRes, patsRes] = await Promise.all([
        adminService.getStats(),
        adminService.getDoctors(),
        adminService.getDepartments(),
        adminService.getAppointments(),
        adminService.getPatients(),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (docsRes.success) setDoctors(docsRes.doctors);
      if (deptsRes.success) setDepartments(deptsRes.departments);
      if (aptsRes.success) setAppointments(aptsRes.appointments);
      if (patsRes.success) setPatients(patsRes.patients);
    } catch (err) {
      showNotification('Failed to fetch dashboard data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Doctor Handlers
  const handleSaveDoctor = async (formData, doctorId) => {
    if (doctorId) {
      await adminService.updateDoctor(doctorId, formData);
      showNotification('Doctor details updated successfully.');
    } else {
      await adminService.createDoctor(formData);
      showNotification('New doctor provisioned successfully.');
    }
    loadData();
  };

  const handleToggleDoctorStatus = async (doctor) => {
    const nextStatus = !doctor.is_active;
    try {
      await adminService.toggleDoctorStatus(doctor.doctor_id, nextStatus);
      showNotification(`Doctor ${doctor.name} ${nextStatus ? 'activated' : 'deactivated'}.`);
      loadData();
    } catch (err) {
      showNotification('Failed to update doctor status: ' + err.message, 'error');
    }
  };

  // Department Handlers
  const handleSaveDepartment = async (formData) => {
    await adminService.createDepartment(formData);
    showNotification('New medical department added.');
    loadData();
  };

  // Appointment Status Handler
  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      await adminService.updateAppointmentStatus(appointmentId, newStatus);
      showNotification(`Appointment marked as ${newStatus}.`);
      loadData();
    } catch (err) {
      showNotification('Failed to update appointment: ' + err.message, 'error');
    }
  };

  // Filtering
  const filteredAppointments = appointments.filter((a) => {
    if (appointmentFilter && a.status !== appointmentFilter) return false;
    return true;
  });

  const filteredDoctors = doctors.filter((d) => {
    const query = doctorSearch.toLowerCase();
    return (
      d.name.toLowerCase().includes(query) ||
      d.specialization.toLowerCase().includes(query) ||
      d.department_name.toLowerCase().includes(query)
    );
  });

  const filteredPatients = patients.filter((p) => {
    const query = patientSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.phone.includes(query) ||
      (p.blood_group && p.blood_group.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
            notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Welcome & Actions Header */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> Hospital Management Suite
          </div>
          <h1 className="text-2xl font-bold">Admin Executive Dashboard</h1>
          <p className="text-teal-100 text-xs mt-1">
            Real-time oversight of hospital operations, staff credentials, and patient care.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold text-white transition backdrop-blur-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Doctors */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Doctors</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.totalDoctors ?? '-'}
            </div>
            <div className="text-[11px] text-teal-700 font-semibold mt-1">
              Active medical staff
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Stethoscope className="w-6 h-6" />
          </div>
        </div>

        {/* Total Patients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Patients</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.totalPatients ?? '-'}
            </div>
            <div className="text-[11px] text-blue-600 font-semibold mt-1">
              Patient profiles in system
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Appointments</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.todayAppointments ?? '-'}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              {stats?.completedAppointments || 0} completed • {stats?.scheduledAppointments || 0} upcoming
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Departments & Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Departments</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.totalDepartments ?? '-'}
            </div>
            <div className="text-[11px] text-purple-700 font-semibold mt-1">
              Revenue: ₹{stats?.totalRevenue ?? 0}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tab Navigation Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 px-6 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'appointments'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" /> Appointments ({appointments.length})
            </button>
            <button
              onClick={() => setActiveTab('doctors')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'doctors'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Stethoscope className="w-4 h-4" /> Doctor Management ({doctors.length})
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'departments'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" /> Departments ({departments.length})
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'patients'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" /> Patients Directory ({patients.length})
            </button>
          </div>

          {/* Contextual Action Button */}
          <div className="pb-3 sm:pb-0 flex items-center gap-2">
            {activeTab === 'doctors' && (
              <button
                onClick={() => { setSelectedDoctor(null); setDoctorModalOpen(true); }}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Add Doctor
              </button>
            )}
            {activeTab === 'departments' && (
              <button
                onClick={() => setDepartmentModalOpen(true)}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Add Department
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Appointments Table */}
        {activeTab === 'appointments' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium">
                Showing {filteredAppointments.length} hospital consultations
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={appointmentFilter}
                  onChange={(e) => setAppointmentFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Apt #</th>
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">Doctor & Dept</th>
                    <th className="px-5 py-3">Date & Time</th>
                    <th className="px-5 py-3">Reason</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5 font-mono font-bold text-teal-800">
                          {apt.appointment_number}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{apt.patient_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{apt.patient_phone}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">{apt.doctor_name}</div>
                          <div className="text-[11px] text-teal-600">{apt.department_name}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">{apt.formatted_date}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{apt.appointment_time}</div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                          {apt.reason || '-'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              apt.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : apt.status === 'scheduled'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <select
                            value={apt.status}
                            onChange={(e) => handleUpdateAppointmentStatus(apt.id, e.target.value)}
                            className="text-[11px] font-semibold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 outline-none hover:border-teal-500 cursor-pointer"
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Mark Completed</option>
                            <option value="cancelled">Cancel</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        No appointments found matching this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Doctor Management */}
        {activeTab === 'doctors' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder="Search doctor, specialty, dept..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {filteredDoctors.length} medical practitioners registered
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Doctor</th>
                    <th className="px-5 py-3">Department & Specialty</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Experience</th>
                    <th className="px-5 py-3">Fee</th>
                    <th className="px-5 py-3">Working Days</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDoctors.map((doc) => (
                    <tr key={doc.doctor_id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{doc.name}</div>
                        <div className="text-[11px] text-slate-400">{doc.qualification}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-teal-700">{doc.specialization}</div>
                        <div className="text-[11px] text-slate-500">{doc.department_name}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-slate-800">{doc.phone}</div>
                        <div className="text-[11px] text-slate-400">{doc.email || '-'}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {doc.experience_years} years
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        ₹{doc.consultation_fee}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-[11px] max-w-[130px] truncate">
                        {doc.available_days}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            doc.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {doc.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setSelectedDoctor(doc); setDoctorModalOpen(true); }}
                            className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg transition"
                            title="Edit Doctor"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleDoctorStatus(doc)}
                            className={`p-1.5 rounded-lg transition ${
                              doc.is_active
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={doc.is_active ? 'Deactivate Doctor' : 'Activate Doctor'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Departments */}
        {activeTab === 'departments' && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-teal-600" />
                      {dept.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                      {dept.doctor_count} Doctor{dept.doctor_count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                    {dept.description || 'Specialized clinical branch of CarePulse Hospital.'}
                  </p>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Department ID: #{dept.id}</span>
                    <span className="text-emerald-700 font-semibold">Active Unit</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Patients Directory */}
        {activeTab === 'patients' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search patient by name, phone, blood..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {filteredPatients.length} patient records
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Patient Name</th>
                    <th className="px-5 py-3">Mobile Phone</th>
                    <th className="px-5 py-3">Blood Group</th>
                    <th className="px-5 py-3">Date of Birth</th>
                    <th className="px-5 py-3">Emergency Contact</th>
                    <th className="px-5 py-3">Total Appointments</th>
                    <th className="px-5 py-3">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((pat) => (
                    <tr key={pat.patient_id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {pat.name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-800">
                        {pat.phone}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px]">
                          {pat.blood_group || 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {pat.dob || '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-slate-800 font-semibold">{pat.emergency_contact_name || '-'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{pat.emergency_contact_phone || ''}</div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-teal-800">
                        {pat.total_appointments} visits
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {pat.registered_date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <DoctorModal
        isOpen={doctorModalOpen}
        onClose={() => setDoctorModalOpen(false)}
        onSave={handleSaveDoctor}
        doctor={selectedDoctor}
        departments={departments}
      />

      <DepartmentModal
        isOpen={departmentModalOpen}
        onClose={() => setDepartmentModalOpen(false)}
        onSave={handleSaveDepartment}
      />
    </div>
  );
}

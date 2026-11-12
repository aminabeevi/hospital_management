import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doctorService } from '../../services/doctorService';
import ConsultationModal from '../../components/doctor/ConsultationModal';
import PatientHistoryModal from '../../components/doctor/PatientHistoryModal';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Users,
  FileText,
  Pill,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

export default function DoctorDashboard() {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'today', 'upcoming', 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  // Notification Toast
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadDoctorData = async () => {
    setLoading(true);
    try {
      const [profRes, aptsRes] = await Promise.all([
        doctorService.getProfile(),
        doctorService.getAppointments({ filter: filterType }),
      ]);

      if (profRes.success) setProfile(profRes.doctor);
      if (aptsRes.success) setAppointments(aptsRes.appointments);
    } catch (err) {
      showNotification('Failed to load doctor dashboard: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, [filterType]);

  const handleStatusChange = async (aptId, newStatus) => {
    try {
      await doctorService.updateAppointmentStatus(aptId, newStatus);
      showNotification(`Appointment status updated to ${newStatus}.`);
      loadDoctorData();
    } catch (err) {
      showNotification('Failed to update status: ' + err.message, 'error');
    }
  };

  // Metrics computation
  const todayCount = appointments.filter((a) => {
    const today = new Date().toISOString().split('T')[0];
    return a.appointment_date === today;
  }).length;

  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const scheduledCount = appointments.filter((a) => a.status === 'scheduled').length;

  const filteredAppointments = appointments.filter((a) => {
    const query = searchQuery.toLowerCase();
    return (
      a.patient_name.toLowerCase().includes(query) ||
      a.patient_phone.includes(query) ||
      a.appointment_number.toLowerCase().includes(query)
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

      {/* Doctor Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <Stethoscope className="w-4 h-4" /> Doctor Clinical Portal
          </div>
          <h1 className="text-2xl font-bold">Welcome, {profile?.name || user?.name}</h1>
          <p className="text-teal-100 text-xs mt-1">
            {profile?.specialization || 'Clinical Specialist'} • {profile?.department_name || 'Cardiology'} • {profile?.qualification || 'MBBS, MD'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-xs font-mono">
            Fee: ₹{profile?.consultation_fee || '800'}
          </span>
          <button
            onClick={loadDoctorData}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold text-white transition backdrop-blur-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled Consultations</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{scheduledCount}</div>
            <div className="text-[11px] text-amber-600 font-semibold mt-1">
              In clinic queue
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Consultations</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{completedCount}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              Diagnosis & prescriptions logged
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Days</div>
            <div className="text-sm font-bold text-slate-800 mt-2 font-mono truncate max-w-[170px]">
              {profile?.available_days || 'Mon,Tue,Wed,Thu,Fri'}
            </div>
            <div className="text-[11px] text-teal-600 font-semibold mt-1">
              Standard OPD hours
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Appointments Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assigned Patient Consultations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review arriving patients, view past medical history, and record clinical diagnoses & prescriptions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterType === 'all' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('today')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterType === 'today' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today ({todayCount})
              </button>
              <button
                onClick={() => setFilterType('upcoming')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterType === 'upcoming' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Upcoming
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient or apt..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Time & Date</th>
                <th className="px-5 py-3">Patient Details</th>
                <th className="px-5 py-3">Chief Complaint / Reason</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Consultation & Rx</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-bold font-mono text-slate-900">{apt.appointment_time}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{apt.appointment_date}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{apt.patient_name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {apt.blood_group || 'O+'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {apt.patient_phone} • {apt.gender || 'Patient'}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-700 max-w-xs">
                      {apt.reason || 'General checkup'}
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

                    <td className="px-5 py-3.5">
                      {apt.has_consultation > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Rx Recorded ({apt.prescription_count} meds)
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Awaiting examination
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedPatientId(apt.patient_id);
                            setHistoryModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          title="View Patient Medical History"
                        >
                          <FileText className="w-3.5 h-3.5" /> History
                        </button>

                        <button
                          onClick={() => {
                            setSelectedAppointment(apt);
                            setConsultationModalOpen(true);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs ${
                            apt.has_consultation > 0
                              ? 'bg-slate-100 hover:bg-slate-200 text-teal-800'
                              : 'bg-teal-600 hover:bg-teal-700 text-white'
                          }`}
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          {apt.has_consultation > 0 ? 'Edit Rx' : 'Consult'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No appointments scheduled under this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ConsultationModal
        isOpen={consultationModalOpen}
        onClose={() => setConsultationModalOpen(false)}
        appointment={selectedAppointment}
        onConsultationSaved={() => {
          showNotification('Consultation notes & prescriptions saved successfully!');
          loadDoctorData();
        }}
      />

      <PatientHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        patientId={selectedPatientId}
      />
    </div>
  );
}

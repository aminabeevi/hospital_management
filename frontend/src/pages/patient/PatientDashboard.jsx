import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import {
  Calendar,
  Clock,
  Pill,
  FileText,
  User,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Building2,
  RefreshCw,
  Plus,
  ArrowRight,
  Heart,
  Phone,
  ShieldCheck,
  HeartPulse,
} from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments', 'book', 'prescriptions', 'records', 'profile'

  // Data States
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Booking Form State
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('10:00:00');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({
    name: '',
    blood_group: 'O+',
    date_of_birth: '',
    gender: 'male',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // UI States
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadPatientData = async () => {
    setLoading(true);
    try {
      const [profRes, aptsRes, rxRes, recRes, deptsRes, docsRes] = await Promise.all([
        patientService.getProfile(),
        patientService.getAppointments(),
        patientService.getPrescriptions(),
        patientService.getMedicalRecords(),
        patientService.getDepartments(),
        patientService.getDoctors(),
      ]);

      if (profRes.success) {
        setProfile(profRes.patient);
        setProfileForm({
          name: profRes.patient.name || '',
          blood_group: profRes.patient.blood_group || 'O+',
          date_of_birth: profRes.patient.dob || '',
          gender: profRes.patient.gender || 'male',
          address: profRes.patient.address || '',
          emergency_contact_name: profRes.patient.emergency_contact_name || '',
          emergency_contact_phone: profRes.patient.emergency_contact_phone || '',
        });
      }
      if (aptsRes.success) setAppointments(aptsRes.appointments);
      if (rxRes.success) setPrescriptions(rxRes.prescriptions);
      if (recRes.success) setRecords(recRes.records);
      if (deptsRes.success) setDepartments(deptsRes.departments);
      if (docsRes.success) setDoctors(docsRes.doctors);
    } catch (err) {
      showNotification('Failed to load patient portal: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, []);

  // Filter doctors when department changes
  const handleDepartmentChange = async (deptId) => {
    setSelectedDeptId(deptId);
    setSelectedDoctorId('');
    try {
      const res = await patientService.getDoctors(deptId);
      if (res.success) setDoctors(res.doctors);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  // Submit appointment booking
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      showNotification('Please select a doctor for your appointment.', 'error');
      return;
    }

    const docObj = doctors.find((d) => d.doctor_id === parseInt(selectedDoctorId, 10));

    setBookingLoading(true);
    try {
      const res = await patientService.bookAppointment({
        doctor_id: parseInt(selectedDoctorId, 10),
        department_id: docObj ? docObj.department_id : 1,
        appointment_date: bookingDate,
        appointment_time: bookingTime,
        reason: bookingReason || 'General Medical Consultation',
      });

      showNotification(`Appointment booked successfully! Ref #: ${res.appointmentNumber}`);
      setBookingReason('');
      setSelectedDoctorId('');
      loadPatientData();
      setActiveTab('appointments');
    } catch (err) {
      showNotification(err.response?.data?.message || err.message || 'Booking failed.', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  // Submit profile updates
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await patientService.updateProfile(profileForm);
      showNotification('Health profile updated successfully.');
      loadPatientData();
    } catch (err) {
      showNotification('Failed to update profile: ' + err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const selectedDoctorDetails = doctors.find((d) => d.doctor_id === parseInt(selectedDoctorId, 10));

  const upcomingApts = appointments.filter(
    (a) => a.status === 'scheduled' && a.appointment_date >= new Date().toISOString().split('T')[0]
  );
  const completedApts = appointments.filter((a) => a.status === 'completed');

  const timeSlots = [
    '09:00:00', '09:30:00', '10:00:00', '10:30:00',
    '11:00:00', '11:30:00', '14:00:00', '14:30:00',
    '15:00:00', '15:30:00', '16:00:00',
  ];

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

      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> Patient Self-Care Portal
          </div>
          <h1 className="text-2xl font-bold">Hello, {profile?.name || user?.name}</h1>
          <p className="text-teal-100 text-xs mt-1">
            Blood Group: <span className="font-bold">{profile?.blood_group || 'O+'}</span> • Mobile: {profile?.phone || user?.phone} • Member since: {profile?.member_since || '2026'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('book')}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Calendar className="w-4 h-4" /> Book Appointment
          </button>
          <button
            onClick={loadPatientData}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-white transition backdrop-blur-xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Appointments</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{upcomingApts.length}</div>
            <div className="text-[11px] text-teal-600 font-semibold mt-1">
              Active consultations scheduled
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Prescriptions</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{prescriptions.length}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              Medications prescribed
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Pill className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinical Consultations</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{completedApts.length}</div>
            <div className="text-[11px] text-blue-600 font-semibold mt-1">
              Completed hospital visits
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 px-6 pt-3 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'appointments'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" /> My Appointments ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('book')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'book'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" /> Book Appointment
          </button>
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'prescriptions'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Pill className="w-4 h-4" /> My Prescriptions ({prescriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'records'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" /> Medical Records ({records.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" /> Health Profile
          </button>
        </div>

        {/* Tab 1: My Appointments */}
        {activeTab === 'appointments' && (
          <div className="p-6 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Reference #</th>
                    <th className="px-5 py-3">Doctor & Specialty</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Date & Time</th>
                    <th className="px-5 py-3">Consultation Fee</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.length > 0 ? (
                    appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5 font-mono font-bold text-teal-800">
                          {apt.appointment_number}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{apt.doctor_name}</div>
                          <div className="text-[11px] text-teal-600">{apt.specialization}</div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700 font-medium">
                          {apt.department_name}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900">{apt.appointment_date}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{apt.appointment_time}</div>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-800">
                          ₹{apt.consultation_fee}
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
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        No appointment records found. Book your first consultation above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Book Appointment (Self-Service) */}
        {activeTab === 'book' && (
          <form onSubmit={handleBookAppointment} className="p-6 max-w-2xl space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Book Doctor Consultation</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse hospital departments and choose your preferred physician and time slot.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                1. Select Department & Doctor *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Department</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value="">All Hospital Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Attending Physician *</label>
                  <select
                    required
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value="">-- Choose Doctor --</option>
                    {doctors.map((doc) => (
                      <option key={doc.doctor_id} value={doc.doctor_id}>
                        {doc.name} ({doc.specialization} - ₹{doc.consultation_fee})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedDoctorDetails && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-teal-800 block">{selectedDoctorDetails.name}</span>
                    <span className="text-slate-500 text-[11px]">
                      {selectedDoctorDetails.qualification} • {selectedDoctorDetails.department_name} • {selectedDoctorDetails.available_days}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                    Fee: ₹{selectedDoctorDetails.consultation_fee}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                2. Select Date & Time Slot *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Preferred Time Slot</label>
                  <select
                    required
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none font-mono"
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Visit / Health Symptoms
              </label>
              <textarea
                rows={2}
                value={bookingReason}
                onChange={(e) => setBookingReason(e.target.value)}
                placeholder="Describe your current symptoms or reason for consulting the doctor..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={bookingLoading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {bookingLoading ? 'Booking Consultation...' : 'Confirm Appointment'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Tab 3: My Prescriptions */}
        {activeTab === 'prescriptions' && (
          <div className="p-6 space-y-4">
            {prescriptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-sm text-teal-800 flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-teal-600" /> {rx.medicine_name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {rx.dosage}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Frequency</span>
                        <span className="font-semibold text-slate-800">{rx.frequency}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
                        <span className="font-semibold text-slate-800">{rx.duration}</span>
                      </div>
                    </div>

                    {rx.instructions && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg italic">
                        "{rx.instructions}"
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Prescribed by {rx.doctor_name}</span>
                      <span>{rx.appointment_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-slate-400 text-xs">
                No active prescriptions found. Prescriptions issued by doctors will appear here digitally.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Medical Records */}
        {activeTab === 'records' && (
          <div className="p-6 space-y-4">
            {records.length > 0 ? (
              <div className="space-y-4">
                {records.map((rec) => {
                  const vitals = typeof rec.vitals === 'string' ? JSON.parse(rec.vitals) : rec.vitals;
                  return (
                    <div key={rec.record_id} className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-xs text-teal-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> Consultation on {rec.appointment_date}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          Attending: {rec.doctor_name} ({rec.department_name})
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Diagnosis:</span>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">{rec.diagnosis}</div>
                      </div>

                      {rec.symptoms && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported Symptoms:</span>
                          <div className="text-xs text-slate-700">{rec.symptoms}</div>
                        </div>
                      )}

                      {vitals && (
                        <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                          {vitals.bp && <span className="px-2 py-0.5 bg-slate-100 rounded font-mono">BP: {vitals.bp}</span>}
                          {vitals.pulse && <span className="px-2 py-0.5 bg-slate-100 rounded font-mono">Pulse: {vitals.pulse} bpm</span>}
                          {vitals.temp && <span className="px-2 py-0.5 bg-slate-100 rounded font-mono">Temp: {vitals.temp} °F</span>}
                          {vitals.weight_kg && <span className="px-2 py-0.5 bg-slate-100 rounded font-mono">Weight: {vitals.weight_kg} kg</span>}
                        </div>
                      )}

                      {rec.doctor_notes && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl italic">
                          Advice: "{rec.doctor_notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-16 text-center text-slate-400 text-xs">
                No past consultation records logged yet.
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Health Profile */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="p-6 max-w-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Personal Health Demographics</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Keep your health profile up to date for doctors and emergency contacts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                <select
                  value={profileForm.blood_group}
                  onChange={(e) => setProfileForm({ ...profileForm, blood_group: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none font-bold text-rose-700"
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={profileForm.date_of_birth}
                  onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none capitalize"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                placeholder="Street address, city"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Person</label>
                <input
                  type="text"
                  value={profileForm.emergency_contact_name}
                  onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_name: e.target.value })}
                  placeholder="Spouse, parent, sibling"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Phone</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={profileForm.emergency_contact_phone}
                  onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_phone: e.target.value })}
                  placeholder="10-digit emergency phone"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              {savingProfile ? 'Updating Profile...' : 'Save Profile Changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

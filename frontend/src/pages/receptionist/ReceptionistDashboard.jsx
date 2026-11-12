import { useState, useEffect } from 'react';
import { receptionistService } from '../../services/receptionistService';
import {
  UserPlus,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Building2,
  RefreshCw,
  Phone,
  User,
  Check,
  ArrowRight,
  Filter,
} from 'lucide-react';

export default function ReceptionistDashboard() {
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments', 'book', 'register', 'doctors'

  // Appointments State
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingApts, setLoadingApts] = useState(false);

  // Doctors State
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Booking Flow State
  const [patientQuery, setPatientQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('10:00:00');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Patient Registration Form State
  const [newPatient, setNewPatient] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'male',
    blood_group: 'O+',
    date_of_birth: '1995-01-01',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });
  const [registerLoading, setRegisterLoading] = useState(false);

  // UI Notifications
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load appointments
  const loadAppointments = async () => {
    setLoadingApts(true);
    try {
      const filters = {};
      if (selectedDate) filters.date = selectedDate;
      if (statusFilter) filters.status = statusFilter;

      const res = await receptionistService.getAppointments(filters);
      if (res.success) {
        setAppointments(res.appointments);
      }
    } catch (err) {
      showNotification('Failed to load appointments: ' + err.message, 'error');
    } finally {
      setLoadingApts(false);
    }
  };

  // Load doctors & departments
  const loadDoctors = async (deptId = '') => {
    try {
      const res = await receptionistService.getAvailableDoctors(deptId);
      if (res.success) {
        setDoctors(res.doctors);

        // Extract unique departments for dropdown
        const deptMap = {};
        res.doctors.forEach((d) => {
          if (!deptMap[d.department_id]) {
            deptMap[d.department_id] = { id: d.department_id, name: d.department_name };
          }
        });
        setDepartments(Object.values(deptMap));
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadDoctors();
  }, [selectedDate, statusFilter]);

  // Handle Live Patient Search
  const handleSearchPatients = async (query) => {
    setPatientQuery(query);
    if (!query || query.trim().length === 0) {
      setPatientSearchResults([]);
      return;
    }

    try {
      const res = await receptionistService.searchPatients(query);
      if (res.success) {
        setPatientSearchResults(res.patients);
      }
    } catch (err) {
      console.error('Error searching patients:', err);
    }
  };

  // Handle Book Appointment
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      showNotification('Please search and select a patient first.', 'error');
      return;
    }
    if (!selectedDoctorId) {
      showNotification('Please choose an attending doctor.', 'error');
      return;
    }

    const doctorObj = doctors.find((d) => d.doctor_id === parseInt(selectedDoctorId, 10));

    setBookingLoading(true);
    try {
      const res = await receptionistService.bookAppointment({
        patient_id: selectedPatient.patient_id,
        doctor_id: parseInt(selectedDoctorId, 10),
        department_id: doctorObj ? doctorObj.department_id : 1,
        appointment_date: bookingDate,
        appointment_time: bookingTime,
        reason: bookingReason || 'General Consultation',
      });

      showNotification(`Appointment booked! Ref #: ${res.appointmentNumber}`);
      // Reset form
      setBookingReason('');
      setSelectedPatient(null);
      setPatientQuery('');
      // Refresh list and jump to Tab 1
      loadAppointments();
      setActiveTab('appointments');
    } catch (err) {
      showNotification(err.response?.data?.message || err.message || 'Booking failed.', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle Patient Registration
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    try {
      const res = await receptionistService.registerPatient(newPatient);
      showNotification(`Patient ${res.patient.name} registered successfully.`);

      // Pre-select this patient and prompt to book
      setSelectedPatient(res.patient);
      setNewPatient({
        name: '',
        phone: '',
        email: '',
        gender: 'male',
        blood_group: 'O+',
        date_of_birth: '1995-01-01',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
      });
      setActiveTab('book');
    } catch (err) {
      showNotification(err.response?.data?.message || err.message || 'Registration failed.', 'error');
    } finally {
      setRegisterLoading(false);
    }
  };

  // Handle Appointment Status Update
  const handleUpdateStatus = async (aptId, newStatus) => {
    try {
      await receptionistService.updateAppointmentStatus(aptId, newStatus);
      showNotification(`Appointment status changed to ${newStatus}.`);
      loadAppointments();
    } catch (err) {
      showNotification('Failed to update status: ' + err.message, 'error');
    }
  };

  // Time slots
  const timeSlots = [
    '09:00:00', '09:30:00', '10:00:00', '10:30:00',
    '11:00:00', '11:30:00', '12:00:00', '14:00:00',
    '14:30:00', '15:00:00', '15:30:00', '16:00:00',
  ];

  const selectedDoctorDetails = doctors.find((d) => d.doctor_id === parseInt(selectedDoctorId, 10));

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
            <Building2 className="w-4 h-4" /> Hospital Front Desk & OPD Management
          </div>
          <h1 className="text-2xl font-bold">Receptionist Dashboard</h1>
          <p className="text-teal-100 text-xs mt-1">
            Register arriving patients, search medical records, and schedule clinical appointments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('book')}
            className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Calendar className="w-4 h-4" /> Book Appointment
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold text-white transition backdrop-blur-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" /> Register Patient
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
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
            <Clock className="w-4 h-4" /> Today's OPD Schedule ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('book')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'book'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" /> Book Appointment
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'register'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Register New Patient
          </button>
          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'doctors'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Stethoscope className="w-4 h-4" /> Doctor Roster & Timings ({doctors.length})
          </button>
        </div>

        {/* Tab 1: Today's OPD Schedule */}
        {activeTab === 'appointments' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Filter Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <button
                onClick={loadAppointments}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingApts ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Apt #</th>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Patient Name</th>
                    <th className="px-5 py-3">Attending Doctor</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Reason</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.length > 0 ? (
                    appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5 font-mono font-bold text-teal-800">
                          {apt.appointment_number}
                        </td>
                        <td className="px-5 py-3.5 font-bold font-mono text-slate-800">
                          {apt.appointment_time}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{apt.patient_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{apt.patient_phone} • {apt.blood_group || 'O+'}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">{apt.doctor_name}</div>
                          <div className="text-[11px] text-teal-600">{apt.specialization}</div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-medium">
                          {apt.department_name}
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
                            onChange={(e) => handleUpdateStatus(apt.id, e.target.value)}
                            className="text-[11px] font-semibold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 outline-none hover:border-teal-500 cursor-pointer"
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Check-in / Done</option>
                            <option value="cancelled">Cancel</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400">
                        No appointments found for the selected date and filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Book Appointment */}
        {activeTab === 'book' && (
          <form onSubmit={handleBookAppointment} className="p-6 max-w-2xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Schedule Patient Consultation</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select patient, attending doctor, appointment date, and time slot.
              </p>
            </div>

            {/* Step 1: Patient Selection */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Select Patient *
              </label>

              {selectedPatient ? (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">{selectedPatient.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Phone: {selectedPatient.phone} • Blood: {selectedPatient.blood_group || 'O+'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedPatient(null); setPatientQuery(''); }}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2 relative">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={patientQuery}
                      onChange={(e) => handleSearchPatients(e.target.value)}
                      placeholder="Search patient by mobile phone (e.g. 9876543210) or name..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    />
                  </div>

                  {/* Dropdown Results */}
                  {patientSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {patientSearchResults.map((pat) => (
                        <div
                          key={pat.patient_id}
                          onClick={() => {
                            setSelectedPatient(pat);
                            setPatientSearchResults([]);
                          }}
                          className="p-3 hover:bg-teal-50 cursor-pointer flex items-center justify-between text-xs transition"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{pat.name}</span>
                            <span className="text-slate-500 font-mono ml-2">({pat.phone})</span>
                          </div>
                          <span className="text-[11px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">
                            Select
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">Can't find patient?</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('register')}
                      className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Register new patient
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Doctor Selection */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Select Department & Doctor *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Department</label>
                  <select
                    value={selectedDepartmentId}
                    onChange={(e) => {
                      setSelectedDepartmentId(e.target.value);
                      loadDoctors(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Attending Doctor</label>
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
                    <span className="text-slate-500 text-[11px]">{selectedDoctorDetails.qualification} • {selectedDoctorDetails.available_days}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                    Fee: ₹{selectedDoctorDetails.consultation_fee}
                  </span>
                </div>
              )}
            </div>

            {/* Step 3: Date & Time Slot */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. Consultation Date & Time Slot *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Time Slot</label>
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

            {/* Step 4: Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Symptoms
              </label>
              <input
                type="text"
                value={bookingReason}
                onChange={(e) => setBookingReason(e.target.value)}
                placeholder="e.g. Hypertension checkup, routine ECG, headache follow-up"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={bookingLoading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {bookingLoading ? 'Scheduling...' : 'Confirm & Schedule Appointment'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Tab 3: Register New Patient */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterPatient} className="p-6 max-w-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">New Patient Registration</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Create a patient demographic record. A user account is automatically linked to their mobile number.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  placeholder="10-digit phone"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                <select
                  value={newPatient.gender}
                  onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                <select
                  value={newPatient.blood_group}
                  onChange={(e) => setNewPatient({ ...newPatient, blood_group: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={newPatient.date_of_birth}
                  onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  placeholder="optional@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={newPatient.address}
                  onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                  placeholder="City, state, zip"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  value={newPatient.emergency_contact_name}
                  onChange={(e) => setNewPatient({ ...newPatient, emergency_contact_name: e.target.value })}
                  placeholder="Spouse, parent, guardian"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Phone Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={newPatient.emergency_contact_phone}
                  onChange={(e) => setNewPatient({ ...newPatient, emergency_contact_phone: e.target.value })}
                  placeholder="Emergency phone"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={registerLoading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {registerLoading ? 'Registering...' : 'Register Patient & Continue to Booking'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Tab 4: Doctors Roster */}
        {activeTab === 'doctors' && (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc) => (
                <div
                  key={doc.doctor_id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{doc.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                      {doc.department_name}
                    </span>
                  </div>
                  <div className="text-xs text-teal-700 font-semibold">{doc.specialization}</div>
                  <div className="text-[11px] text-slate-500">{doc.qualification}</div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600 text-[11px] font-mono">{doc.available_days}</span>
                    <span className="font-bold text-slate-800">₹{doc.consultation_fee}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

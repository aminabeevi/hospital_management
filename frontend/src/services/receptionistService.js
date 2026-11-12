import api from './api';

export const receptionistService = {
  // Search patients by name, phone or email
  async searchPatients(q = '') {
    const res = await api.get('/receptionist/patients/search', { params: { q } });
    return res.data;
  },

  // Register a new patient
  async registerPatient(patientData) {
    const res = await api.post('/receptionist/patients', patientData);
    return res.data;
  },

  // Get active doctors for appointment scheduling
  async getAvailableDoctors(department_id = '') {
    const res = await api.get('/receptionist/doctors', { params: { department_id } });
    return res.data;
  },

  // Book an appointment
  async bookAppointment(appointmentData) {
    const res = await api.post('/receptionist/appointments', appointmentData);
    return res.data;
  },

  // Get front-desk appointments
  async getAppointments(filters = {}) {
    const res = await api.get('/receptionist/appointments', { params: filters });
    return res.data;
  },

  // Update appointment status (e.g. check-in, cancel)
  async updateAppointmentStatus(appointmentId, status) {
    const res = await api.patch(`/receptionist/appointments/${appointmentId}/status`, { status });
    return res.data;
  },
};


import api from './api';

export const doctorService = {
  // Doctor profile details
  async getProfile() {
    const res = await api.get('/doctor/profile');
    return res.data;
  },

  // Assigned appointments (filters: today, upcoming, status)
  async getAppointments(filters = {}) {
    const res = await api.get('/doctor/appointments', { params: filters });
    return res.data;
  },

  // Get consultation record & prescriptions for an appointment
  async getConsultationDetails(appointmentId) {
    const res = await api.get(`/doctor/appointments/${appointmentId}/consultation`);
    return res.data;
  },

  // Save consultation notes, diagnosis, vitals, and prescriptions
  async saveConsultation(appointmentId, consultationData) {
    const res = await api.post(`/doctor/appointments/${appointmentId}/consultation`, consultationData);
    return res.data;
  },

  // Update appointment status
  async updateAppointmentStatus(appointmentId, status) {
    const res = await api.patch(`/doctor/appointments/${appointmentId}/status`, { status });
    return res.data;
  },

  // Patient medical history
  async getPatientHistory(patientId) {
    const res = await api.get(`/doctor/patients/${patientId}/history`);
    return res.data;
  },
};


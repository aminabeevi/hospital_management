import api from './api';

export const patientService = {
  // Profile
  async getProfile() {
    const res = await api.get('/patient/profile');
    return res.data;
  },

  async updateProfile(profileData) {
    const res = await api.put('/patient/profile', profileData);
    return res.data;
  },

  // Browse Directory
  async getDepartments() {
    const res = await api.get('/patient/departments');
    return res.data;
  },

  async getDoctors(department_id = '') {
    const res = await api.get('/patient/doctors', { params: { department_id } });
    return res.data;
  },

  // Self-service appointment booking
  async bookAppointment(appointmentData) {
    const res = await api.post('/patient/appointments', appointmentData);
    return res.data;
  },

  // My appointments (all, upcoming, or history)
  async getAppointments(type = '') {
    const res = await api.get('/patient/appointments', { params: { type } });
    return res.data;
  },

  // My prescriptions
  async getPrescriptions() {
    const res = await api.get('/patient/prescriptions');
    return res.data;
  },

  // My clinical medical records
  async getMedicalRecords() {
    const res = await api.get('/patient/records');
    return res.data;
  },
};


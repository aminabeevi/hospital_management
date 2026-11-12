import api from './api';

export const adminService = {
  // Statistics
  async getStats() {
    const res = await api.get('/admin/stats');
    return res.data;
  },

  // Doctors
  async getDoctors() {
    const res = await api.get('/admin/doctors');
    return res.data;
  },

  async createDoctor(doctorData) {
    const res = await api.post('/admin/doctors', doctorData);
    return res.data;
  },

  async updateDoctor(doctorId, doctorData) {
    const res = await api.put(`/admin/doctors/${doctorId}`, doctorData);
    return res.data;
  },

  async toggleDoctorStatus(doctorId, is_active) {
    const res = await api.patch(`/admin/doctors/${doctorId}/status`, { is_active });
    return res.data;
  },

  // Departments
  async getDepartments() {
    const res = await api.get('/admin/departments');
    return res.data;
  },

  async createDepartment(departmentData) {
    const res = await api.post('/admin/departments', departmentData);
    return res.data;
  },

  // Appointments
  async getAppointments(filters = {}) {
    const res = await api.get('/admin/appointments', { params: filters });
    return res.data;
  },

  async updateAppointmentStatus(appointmentId, status) {
    const res = await api.patch(`/admin/appointments/${appointmentId}/status`, { status });
    return res.data;
  },

  // Patients
  async getPatients() {
    const res = await api.get('/admin/patients');
    return res.data;
  },
};


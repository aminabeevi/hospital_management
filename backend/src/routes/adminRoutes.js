import { Router } from 'express';
import {
  getAdminStats,
  getDoctors,
  createDoctor,
  updateDoctor,
  toggleDoctorStatus,
  getDepartments,
  createDepartment,
  getAllAppointments,
  updateAppointmentStatus,
  getPatients,
} from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Protect ALL admin routes: Must be authenticated AND have role = 'admin'
router.use(authenticateToken);
router.use(requireRole('admin'));

// Hospital Statistics
router.get('/stats', getAdminStats);

// Doctor Management
router.get('/doctors', getDoctors);
router.post('/doctors', createDoctor);
router.put('/doctors/:id', updateDoctor);
router.patch('/doctors/:id/status', toggleDoctorStatus);

// Department Management
router.get('/departments', getDepartments);
router.post('/departments', createDepartment);

// Appointments Management
router.get('/appointments', getAllAppointments);
router.patch('/appointments/:id/status', updateAppointmentStatus);

// Patients Directory
router.get('/patients', getPatients);

export default router;


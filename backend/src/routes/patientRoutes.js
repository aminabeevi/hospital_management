import { Router } from 'express';
import {
  getPatientProfile,
  updatePatientProfile,
  getPatientDepartments,
  getPatientDoctors,
  bookPatientAppointment,
  getMyAppointments,
  getMyPrescriptions,
  getMyMedicalRecords,
} from '../controllers/patientController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Protect ALL patient routes (Requires patient or admin role)
router.use(authenticateToken);
router.use(requireRole('patient', 'admin'));

// Profile
router.get('/profile', getPatientProfile);
router.put('/profile', updatePatientProfile);

// Clinical Directory Browsing
router.get('/departments', getPatientDepartments);
router.get('/doctors', getPatientDoctors);

// Appointments
router.post('/appointments', bookPatientAppointment);
router.get('/appointments', getMyAppointments);

// Prescriptions & Medical Records
router.get('/prescriptions', getMyPrescriptions);
router.get('/records', getMyMedicalRecords);

export default router;


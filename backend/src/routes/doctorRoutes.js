import { Router } from 'express';
import {
  getDoctorProfile,
  getDoctorAppointments,
  getConsultationDetails,
  saveConsultation,
  updateDoctorAppointmentStatus,
  getPatientHistory,
} from '../controllers/doctorController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Protect ALL doctor routes (Requires doctor or admin role)
router.use(authenticateToken);
router.use(requireRole('doctor', 'admin'));

// Profile & Schedule
router.get('/profile', getDoctorProfile);
router.get('/appointments', getDoctorAppointments);

// Consultation & Prescriptions
router.get('/appointments/:appointment_id/consultation', getConsultationDetails);
router.post('/appointments/:appointment_id/consultation', saveConsultation);
router.patch('/appointments/:appointment_id/status', updateDoctorAppointmentStatus);

// Patient Medical History
router.get('/patients/:patient_id/history', getPatientHistory);

export default router;


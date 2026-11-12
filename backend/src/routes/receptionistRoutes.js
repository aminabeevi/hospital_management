import { Router } from 'express';
import {
  searchPatients,
  registerPatient,
  getAvailableDoctors,
  bookAppointment,
  getReceptionAppointments,
  updateAppointmentStatus,
} from '../controllers/receptionistController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Protect ALL receptionist routes (Staff only: receptionist or admin)
router.use(authenticateToken);
router.use(requireRole('receptionist', 'admin'));

// Patient Registration & Live Search
router.get('/patients/search', searchPatients);
router.post('/patients', registerPatient);

// Doctor Lookup for Booking
router.get('/doctors', getAvailableDoctors);

// Appointment Booking & Schedule Management
router.post('/appointments', bookAppointment);
router.get('/appointments', getReceptionAppointments);
router.patch('/appointments/:id/status', updateAppointmentStatus);

export default router;


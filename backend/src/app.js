import express from 'express';
import cors from 'cors';
import pool, { testDbConnection } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import receptionistRoutes from './routes/receptionistRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import patientRoutes from './routes/patientRoutes.js';

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route with live DB connection test
app.get('/api/health', async (req, res) => {
  const dbStatus = await testDbConnection();
  res.status(200).json({
    status: 'success',
    message: 'CarePulse Hospital Management System API is running smoothly',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// Admin Module Routes (Protected with Admin Role Guard)
app.use('/api/admin', adminRoutes);

// Receptionist Module Routes (Protected with Receptionist/Admin Role Guard)
app.use('/api/receptionist', receptionistRoutes);

// Doctor Module Routes (Protected with Doctor/Admin Role Guard)
app.use('/api/doctor', doctorRoutes);

// Patient Module Routes (Protected with Patient/Admin Role Guard)
app.use('/api/patient', patientRoutes);

// Development Endpoint: View all database tables and rows directly in browser
app.get('/api/dev/db-overview', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, phone, role, email, is_active FROM users;');
    const [departments] = await pool.query('SELECT * FROM departments;');
    const [doctors] = await pool.query(`
      SELECT d.id, u.name as doctor_name, dept.name as department, d.specialization, d.qualification, d.experience_years, d.consultation_fee, d.available_days
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      JOIN departments dept ON d.department_id = dept.id;
    `);
    const [patients] = await pool.query(`
      SELECT p.id, u.name as patient_name, u.phone, p.gender, p.blood_group, DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') as dob, p.emergency_contact_name
      FROM patients p
      JOIN users u ON p.user_id = u.id;
    `);
    const [appointments] = await pool.query(`
      SELECT a.appointment_number, pat_u.name as patient, doc_u.name as doctor, dept.name as department, DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as date, a.appointment_time as time, a.status, a.reason
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pat_u ON p.user_id = pat_u.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users doc_u ON d.user_id = doc_u.id
      JOIN departments dept ON a.department_id = dept.id;
    `);
    const [prescriptions] = await pool.query(`
      SELECT p.id, pat_u.name as patient, doc_u.name as doctor, p.medicine_name, p.dosage, p.frequency, p.duration, p.instructions
      FROM prescriptions p
      JOIN patients pat ON p.patient_id = pat.id
      JOIN users pat_u ON pat.user_id = pat_u.id
      JOIN doctors d ON p.doctor_id = d.id
      JOIN users doc_u ON d.user_id = doc_u.id;
    `);

    res.json({
      success: true,
      data: {
        users,
        departments,
        doctors,
        patients,
        appointments,
        prescriptions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
});

export default app;

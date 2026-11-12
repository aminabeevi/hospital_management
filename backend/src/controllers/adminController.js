import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

/**
 * GET /api/admin/stats
 * Aggregates overall hospital metrics
 */
export async function getAdminStats(req, res) {
  try {
    // Total Doctors
    const [[{ totalDoctors }]] = await pool.query(
      `SELECT COUNT(*) as totalDoctors FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.is_active = TRUE;`
    );

    // Total Patients
    const [[{ totalPatients }]] = await pool.query(
      `SELECT COUNT(*) as totalPatients FROM patients;`
    );

    // Total Departments
    const [[{ totalDepartments }]] = await pool.query(
      `SELECT COUNT(*) as totalDepartments FROM departments WHERE is_active = TRUE;`
    );

    // Total Appointments & Breakdown
    const [[appointmentStats]] = await pool.query(`
      SELECT 
        COUNT(*) as totalAppointments,
        SUM(CASE WHEN appointment_date = CURDATE() THEN 1 ELSE 0 END) as todayAppointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedAppointments,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduledAppointments,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledAppointments
      FROM appointments;
    `);

    // Revenue estimate from completed consultations
    const [[{ totalRevenue }]] = await pool.query(`
      SELECT COALESCE(SUM(d.consultation_fee), 0) as totalRevenue
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.status = 'completed';
    `);

    return res.status(200).json({
      success: true,
      stats: {
        totalDoctors: parseInt(totalDoctors || '0', 10),
        totalPatients: parseInt(totalPatients || '0', 10),
        totalDepartments: parseInt(totalDepartments || '0', 10),
        totalAppointments: parseInt(appointmentStats.totalAppointments || '0', 10),
        todayAppointments: parseInt(appointmentStats.todayAppointments || '0', 10),
        completedAppointments: parseInt(appointmentStats.completedAppointments || '0', 10),
        scheduledAppointments: parseInt(appointmentStats.scheduledAppointments || '0', 10),
        cancelledAppointments: parseInt(appointmentStats.cancelledAppointments || '0', 10),
        totalRevenue: parseFloat(totalRevenue || '0'),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/doctors
 * Returns all doctors with user and department info
 */
export async function getDoctors(req, res) {
  try {
    const [doctors] = await pool.query(`
      SELECT 
        d.id as doctor_id,
        u.id as user_id,
        u.name,
        u.phone,
        u.email,
        u.is_active,
        d.department_id,
        dept.name as department_name,
        d.specialization,
        d.qualification,
        d.experience_years,
        d.consultation_fee,
        d.available_days,
        d.bio,
        DATE_FORMAT(d.created_at, '%Y-%m-%d') as joined_date
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      JOIN departments dept ON d.department_id = dept.id
      ORDER BY d.id DESC;
    `);

    return res.status(200).json({ success: true, doctors });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/admin/doctors
 * Creates a new doctor user and doctor profile
 */
export async function createDoctor(req, res) {
  const connection = await pool.getConnection();
  try {
    const {
      name,
      phone,
      email,
      department_id,
      specialization,
      qualification,
      experience_years,
      consultation_fee,
      available_days,
      bio,
    } = req.body;

    if (!name || !phone || !department_id || !specialization || !qualification) {
      return res.status(400).json({
        success: false,
        message: 'Name, mobile phone, department, specialization, and qualification are required.',
      });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    await connection.beginTransaction();

    // Check if phone or email already exists
    const [existing] = await connection.query(
      `SELECT id FROM users WHERE phone = ? OR (email IS NOT NULL AND email = ?);`,
      [cleanPhone, email || null]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'A user with this mobile phone number or email address already exists.',
      });
    }

    // Hash default staff password
    const defaultPassword = 'Password@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 1. Create User
    const [userResult] = await connection.query(
      `INSERT INTO users (name, phone, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 'doctor', TRUE);`,
      [name.trim(), cleanPhone, email ? email.trim() : null, passwordHash]
    );

    const newUserId = userResult.insertId;

    // 2. Create Doctor Profile
    const [docResult] = await connection.query(
      `INSERT INTO doctors (
        user_id, department_id, specialization, qualification, experience_years, consultation_fee, available_days, bio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newUserId,
        parseInt(department_id, 10),
        specialization.trim(),
        qualification.trim(),
        parseInt(experience_years || '0', 10),
        parseFloat(consultation_fee || '0'),
        available_days || 'Mon,Tue,Wed,Thu,Fri',
        bio || '',
      ]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Doctor created successfully with default credentials (Password@123).',
      doctorId: docResult.insertId,
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
}

/**
 * PUT /api/admin/doctors/:id
 * Updates doctor profile and linked user details
 */
export async function updateDoctor(req, res) {
  const connection = await pool.getConnection();
  try {
    const doctorId = parseInt(req.params.id, 10);
    const {
      name,
      email,
      department_id,
      specialization,
      qualification,
      experience_years,
      consultation_fee,
      available_days,
      bio,
    } = req.body;

    const [[doctor]] = await connection.query(`SELECT user_id FROM doctors WHERE id = ?;`, [doctorId]);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    await connection.beginTransaction();

    // Update user info
    if (name || email) {
      await connection.query(
        `UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?;`,
        [name ? name.trim() : null, email ? email.trim() : null, doctor.user_id]
      );
    }

    // Update doctor info
    await connection.query(
      `UPDATE doctors SET 
        department_id = COALESCE(?, department_id),
        specialization = COALESCE(?, specialization),
        qualification = COALESCE(?, qualification),
        experience_years = COALESCE(?, experience_years),
        consultation_fee = COALESCE(?, consultation_fee),
        available_days = COALESCE(?, available_days),
        bio = COALESCE(?, bio)
       WHERE id = ?;`,
      [
        department_id ? parseInt(department_id, 10) : null,
        specialization ? specialization.trim() : null,
        qualification ? qualification.trim() : null,
        experience_years !== undefined ? parseInt(experience_years, 10) : null,
        consultation_fee !== undefined ? parseFloat(consultation_fee) : null,
        available_days,
        bio,
        doctorId,
      ]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Doctor profile updated successfully.',
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
}

/**
 * PATCH /api/admin/doctors/:id/status
 * Toggles doctor active status (deactivate or activate)
 */
export async function toggleDoctorStatus(req, res) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    const { is_active } = req.body;

    const [[doctor]] = await pool.query(`SELECT user_id FROM doctors WHERE id = ?;`, [doctorId]);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    await pool.query(
      `UPDATE users SET is_active = ? WHERE id = ?;`,
      [is_active ? 1 : 0, doctor.user_id]
    );

    return res.status(200).json({
      success: true,
      message: `Doctor ${is_active ? 'activated' : 'deactivated'} successfully.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/departments
 * Returns all departments with doctor counts
 */
export async function getDepartments(req, res) {
  try {
    const [departments] = await pool.query(`
      SELECT 
        dept.id,
        dept.name,
        dept.description,
        dept.is_active,
        COUNT(d.id) as doctor_count
      FROM departments dept
      LEFT JOIN doctors d ON dept.id = d.department_id
      GROUP BY dept.id
      ORDER BY dept.name ASC;
    `);

    return res.status(200).json({ success: true, departments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/admin/departments
 * Creates a new medical department
 */
export async function createDepartment(req, res) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }

    const [existing] = await pool.query(`SELECT id FROM departments WHERE name = ?;`, [name.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'A department with this name already exists.' });
    }

    const [result] = await pool.query(
      `INSERT INTO departments (name, description, is_active) VALUES (?, ?, TRUE);`,
      [name.trim(), description ? description.trim() : null]
    );

    return res.status(201).json({
      success: true,
      message: 'Department added successfully.',
      departmentId: result.insertId,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/appointments
 * Returns all hospital appointments with filters
 */
export async function getAllAppointments(req, res) {
  try {
    const { status, doctor_id, department_id, date } = req.query;

    let query = `
      SELECT 
        a.id,
        a.appointment_number,
        a.appointment_date,
        DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as formatted_date,
        a.appointment_time,
        a.status,
        a.reason,
        pat_u.name as patient_name,
        pat_u.phone as patient_phone,
        doc_u.name as doctor_name,
        doc.specialization,
        dept.name as department_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pat_u ON p.user_id = pat_u.id
      JOIN doctors doc ON a.doctor_id = doc.id
      JOIN users doc_u ON doc.user_id = doc_u.id
      JOIN departments dept ON a.department_id = dept.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }
    if (doctor_id) {
      query += ` AND a.doctor_id = ?`;
      params.push(doctor_id);
    }
    if (department_id) {
      query += ` AND a.department_id = ?`;
      params.push(department_id);
    }
    if (date) {
      query += ` AND a.appointment_date = ?`;
      params.push(date);
    }

    query += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 100;`;

    const [appointments] = await pool.query(query, params);

    return res.status(200).json({ success: true, appointments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * PATCH /api/admin/appointments/:id/status
 * Admin updates appointment status
 */
export async function updateAppointmentStatus(req, res) {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be scheduled, completed, or cancelled.',
      });
    }

    await pool.query(
      `UPDATE appointments SET status = ? WHERE id = ?;`,
      [status, appointmentId]
    );

    return res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/patients
 * Returns all registered patients directory
 */
export async function getPatients(req, res) {
  try {
    const [patients] = await pool.query(`
      SELECT 
        p.id as patient_id,
        u.id as user_id,
        u.name,
        u.phone,
        u.email,
        p.gender,
        p.blood_group,
        DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') as dob,
        p.address,
        p.emergency_contact_name,
        p.emergency_contact_phone,
        DATE_FORMAT(p.created_at, '%Y-%m-%d') as registered_date,
        COUNT(a.id) as total_appointments
      FROM patients p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN appointments a ON p.id = a.patient_id
      GROUP BY p.id
      ORDER BY p.id DESC;
    `);

    return res.status(200).json({ success: true, patients });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}


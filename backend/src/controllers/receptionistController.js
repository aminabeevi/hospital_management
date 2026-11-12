import pool from '../config/db.js';

/**
 * GET /api/receptionist/patients/search
 * Search patients by name, mobile phone, or email
 */
export async function searchPatients(req, res) {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      // Return top 15 recent patients
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
          p.emergency_contact_name,
          p.emergency_contact_phone
        FROM patients p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.id DESC
        LIMIT 15;
      `);
      return res.status(200).json({ success: true, patients });
    }

    const searchTerm = `%${q.trim()}%`;
    const [patients] = await pool.query(
      `SELECT 
        p.id as patient_id,
        u.id as user_id,
        u.name,
        u.phone,
        u.email,
        p.gender,
        p.blood_group,
        DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') as dob,
        p.emergency_contact_name,
        p.emergency_contact_phone
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE u.name LIKE ? OR u.phone LIKE ? OR (u.email IS NOT NULL AND u.email LIKE ?)
      LIMIT 15;`,
      [searchTerm, searchTerm, searchTerm]
    );

    return res.status(200).json({ success: true, patients });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/receptionist/patients
 * Front-desk registration for a new patient
 */
export async function registerPatient(req, res) {
  const connection = await pool.getConnection();
  try {
    const {
      name,
      phone,
      email,
      date_of_birth,
      gender,
      blood_group,
      address,
      emergency_contact_name,
      emergency_contact_phone,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Patient name and 10-digit mobile phone are required.',
      });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile phone number.',
      });
    }

    await connection.beginTransaction();

    // Check if phone is already registered
    const [existing] = await connection.query(
      `SELECT id FROM users WHERE phone = ?;`,
      [cleanPhone]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'A patient or user with this mobile phone number is already registered in the system.',
      });
    }

    // 1. Create User entry
    const [userResult] = await connection.query(
      `INSERT INTO users (name, phone, email, role, is_active)
       VALUES (?, ?, ?, 'patient', TRUE);`,
      [name.trim(), cleanPhone, email ? email.trim() : null]
    );

    const newUserId = userResult.insertId;

    // 2. Create Patient profile entry
    const [patientResult] = await connection.query(
      `INSERT INTO patients (
        user_id, date_of_birth, gender, blood_group, address, emergency_contact_name, emergency_contact_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        newUserId,
        date_of_birth || null,
        gender || null,
        blood_group || null,
        address ? address.trim() : null,
        emergency_contact_name ? emergency_contact_name.trim() : null,
        emergency_contact_phone ? emergency_contact_phone.trim() : null,
      ]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      patient: {
        patient_id: patientResult.insertId,
        user_id: newUserId,
        name: name.trim(),
        phone: cleanPhone,
        email: email ? email.trim() : null,
        gender: gender || null,
        blood_group: blood_group || null,
        dob: date_of_birth || null,
      },
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
}

/**
 * GET /api/receptionist/doctors
 * Get active doctors for appointment booking, optionally filtered by department
 */
export async function getAvailableDoctors(req, res) {
  try {
    const { department_id } = req.query;

    let query = `
      SELECT 
        d.id as doctor_id,
        u.name,
        d.department_id,
        dept.name as department_name,
        d.specialization,
        d.qualification,
        d.experience_years,
        d.consultation_fee,
        d.available_days
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      JOIN departments dept ON d.department_id = dept.id
      WHERE u.is_active = TRUE
    `;
    const params = [];

    if (department_id) {
      query += ` AND d.department_id = ?`;
      params.push(department_id);
    }

    query += ` ORDER BY dept.name ASC, u.name ASC;`;

    const [doctors] = await pool.query(query, params);

    return res.status(200).json({ success: true, doctors });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/receptionist/appointments
 * Front-desk book an appointment for a patient with a doctor
 */
export async function bookAppointment(req, res) {
  try {
    const {
      patient_id,
      doctor_id,
      department_id,
      appointment_date,
      appointment_time,
      reason,
    } = req.body;

    if (!patient_id || !doctor_id || !department_id || !appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        message: 'Patient, doctor, department, appointment date, and time slot are required.',
      });
    }

    // 1. Verify Patient exists
    const [[patient]] = await pool.query(`SELECT id FROM patients WHERE id = ?;`, [patient_id]);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // 2. Verify Doctor exists and is active
    const [[doctor]] = await pool.query(
      `SELECT d.id, u.is_active FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?;`,
      [doctor_id]
    );
    if (!doctor || !doctor.is_active) {
      return res.status(400).json({ success: false, message: 'Selected doctor is not available.' });
    }

    // 3. Double-Booking Conflict Prevention
    const [existingApt] = await pool.query(
      `SELECT id FROM appointments 
       WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status = 'scheduled';`,
      [doctor_id, appointment_date, appointment_time]
    );

    if (existingApt.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This doctor already has an appointment scheduled at this exact date and time. Please choose another time slot.',
      });
    }

    // 4. Generate unique appointment number
    const datePart = appointment_date.replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const appointmentNumber = `APT-${datePart}-${randomSuffix}`;

    // 5. Insert Appointment
    const [result] = await pool.query(
      `INSERT INTO appointments (
        appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?);`,
      [
        appointmentNumber,
        parseInt(patient_id, 10),
        parseInt(doctor_id, 10),
        parseInt(department_id, 10),
        appointment_date,
        appointment_time,
        reason ? reason.trim() : 'OPD Consultation',
        req.user.id,
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Appointment scheduled successfully. Reference #: ${appointmentNumber}`,
      appointmentId: result.insertId,
      appointmentNumber,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/receptionist/appointments
 * View appointment schedules, optionally filtered by date and status
 */
export async function getReceptionAppointments(req, res) {
  try {
    const { date, status, doctor_id } = req.query;

    let query = `
      SELECT 
        a.id,
        a.appointment_number,
        DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
        a.appointment_time,
        a.status,
        a.reason,
        pat_u.name as patient_name,
        pat_u.phone as patient_phone,
        p.gender,
        p.blood_group,
        doc_u.name as doctor_name,
        doc.specialization,
        dept.name as department_name,
        creator.name as booked_by
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pat_u ON p.user_id = pat_u.id
      JOIN doctors doc ON a.doctor_id = doc.id
      JOIN users doc_u ON doc.user_id = doc_u.id
      JOIN departments dept ON a.department_id = dept.id
      JOIN users creator ON a.created_by = creator.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND a.appointment_date = ?`;
      params.push(date);
    }
    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }
    if (doctor_id) {
      query += ` AND a.doctor_id = ?`;
      params.push(doctor_id);
    }

    query += ` ORDER BY a.appointment_date ASC, a.appointment_time ASC LIMIT 100;`;

    const [appointments] = await pool.query(query, params);

    return res.status(200).json({ success: true, appointments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * PATCH /api/receptionist/appointments/:id/status
 * Front-desk update status of appointment (e.g. check-in, cancel)
 */
export async function updateAppointmentStatus(req, res) {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be scheduled, completed, or cancelled.',
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


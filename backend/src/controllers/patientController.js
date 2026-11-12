import pool from '../config/db.js';

/**
 * Helper to get patient_id from logged-in user_id
 */
async function getPatientIdFromUserId(userId) {
  const [[patient]] = await pool.query(`SELECT id FROM patients WHERE user_id = ?;`, [userId]);
  return patient ? patient.id : null;
}

/**
 * GET /api/patient/profile
 * Get logged-in patient's profile details
 */
export async function getPatientProfile(req, res) {
  try {
    const patientId = await getPatientIdFromUserId(req.user.id);
    if (!patientId) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const [[patient]] = await pool.query(
      `SELECT 
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
        DATE_FORMAT(p.created_at, '%Y-%m-%d') as member_since
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?;`,
      [patientId]
    );

    return res.status(200).json({ success: true, patient });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * PUT /api/patient/profile
 * Update personal health demographic details
 */
export async function updatePatientProfile(req, res) {
  try {
    const patientId = await getPatientIdFromUserId(req.user.id);
    if (!patientId) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const {
      name,
      email,
      date_of_birth,
      gender,
      blood_group,
      address,
      emergency_contact_name,
      emergency_contact_phone,
    } = req.body;

    // Update users table
    if (name || email) {
      await pool.query(
        `UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?;`,
        [name ? name.trim() : null, email ? email.trim() : null, req.user.id]
      );
    }

    // Update patients table
    await pool.query(
      `UPDATE patients SET 
        date_of_birth = COALESCE(?, date_of_birth),
        gender = COALESCE(?, gender),
        blood_group = COALESCE(?, blood_group),
        address = COALESCE(?, address),
        emergency_contact_name = COALESCE(?, emergency_contact_name),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone)
       WHERE id = ?;`,
      [
        date_of_birth || null,
        gender || null,
        blood_group || null,
        address ? address.trim() : null,
        emergency_contact_name ? emergency_contact_name.trim() : null,
        emergency_contact_phone ? emergency_contact_phone.trim() : null,
        patientId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/patient/departments
 * Browse medical departments
 */
export async function getPatientDepartments(req, res) {
  try {
    const [departments] = await pool.query(`
      SELECT 
        dept.id,
        dept.name,
        dept.description,
        COUNT(d.id) as doctor_count
      FROM departments dept
      LEFT JOIN doctors d ON dept.id = d.department_id
      LEFT JOIN users u ON d.user_id = u.id AND u.is_active = TRUE
      WHERE dept.is_active = TRUE
      GROUP BY dept.id
      ORDER BY dept.name ASC;
    `);

    return res.status(200).json({ success: true, departments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/patient/doctors
 * Browse available doctors for booking
 */
export async function getPatientDoctors(req, res) {
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
        d.available_days,
        d.bio
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
 * POST /api/patient/appointments
 * Patient self-service appointment booking
 */
export async function bookPatientAppointment(req, res) {
  try {
    const patientId = await getPatientIdFromUserId(req.user.id);
    if (!patientId) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const { doctor_id, department_id, appointment_date, appointment_time, reason } = req.body;

    if (!doctor_id || !department_id || !appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        message: 'Doctor, department, appointment date, and time slot are required.',
      });
    }

    // 1. Double-booking prevention
    const [existing] = await pool.query(
      `SELECT id FROM appointments 
       WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status = 'scheduled';`,
      [doctor_id, appointment_date, appointment_time]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This doctor is already booked for the selected date and time slot. Please choose another time slot.',
      });
    }

    // 2. Generate appointment reference number
    const datePart = appointment_date.replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const appointmentNumber = `APT-${datePart}-${randomSuffix}`;

    // 3. Create appointment
    const [result] = await pool.query(
      `INSERT INTO appointments (
        appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?);`,
      [
        appointmentNumber,
        patientId,
        parseInt(doctor_id, 10),
        parseInt(department_id, 10),
        appointment_date,
        appointment_time,
        reason ? reason.trim() : 'Patient Consultation',
        req.user.id,
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Appointment booked successfully! Reference #: ${appointmentNumber}`,
      appointmentId: result.insertId,
      appointmentNumber,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/patient/appointments
 * Patient's upcoming and past appointments
 */
export async function getMyAppointments(req, res) {
  try {
    const patientId = await getPatientIdFromUserId(req.user.id);
    if (!patientId) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const { type } = req.query; // 'upcoming', 'history', or all

    let query = `
      SELECT 
        a.id,
        a.appointment_number,
        DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
        a.appointment_time,
        a.status,
        a.reason,
        doc_u.name as doctor_name,
        doc.specialization,
        doc.consultation_fee,
        dept.name as department_name,
        (SELECT COUNT(*) FROM prescriptions rx WHERE rx.appointment_id = a.id) as prescription_count,
        (SELECT COUNT(*) FROM medical_records mr WHERE mr.appointment_id = a.id) as has_consultation
      FROM appointments a
      JOIN doctors doc ON a.doctor_id = doc.id
      JOIN users doc_u ON doc.user_id = doc_u.id
      JOIN departments dept ON a.department_id = dept.id
      WHERE a.patient_id = ?
    `;
    const params = [patientId];

    if (type === 'upcoming') {
      query += ` AND a.appointment_date >= CURDATE() AND a.status = 'scheduled'`;
    } else if (type === 'history') {
      query += ` AND (a.status = 'completed' OR a.status = 'cancelled' OR a.appointment_date < CURDATE())`;
    }

    query += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC;`;

    const [appointments] = await pool.query(query, params);

    return res.status(200).json({ success: true, appointments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/patient/prescriptions
 * View all prescriptions issued to this patient
 */
export async function getMyPrescriptions(req, res) {
  try {
    const patientId = await getPatientIdFromUserId(req.user.id);
    if (!patientId) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const [prescriptions] = await pool.query(`
      SELECT 
        p.id,
        p.appointment_id,
        a.appointment_number,
        DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
        doc_u.name as doctor_name,
        dept.name as department_name,
        p.medicine_name,
        p.dosage,
        p.frequency,
        p.duration,
        p.instructions,
        DATE_FORMAT(p.created_at, '%Y-%m-%d') as issued_date
      FROM prescriptions p
      JOIN appointments a ON p.appointment_id = a.id
      JOIN doctors doc ON p.doctor_id = doc.id
      JOIN users doc_u ON doc.user_id = doc_u.id
      JOIN departments dept ON a.department_id = dept.id
      WHERE p.patient_id = ?
      ORDER BY p.id DESC;
    `, [patientId]);

    return res.status(200).json({ success: true, prescriptions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/patient/records
 * View all clinical medical records & diagnoses
 */
export async function getMyMedicalRecords(req, res) {
  try {
    const patientId = await getPatientIdFromUserId(req.user.id);
    if (!patientId) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const [records] = await pool.query(`
      SELECT 
        mr.id as record_id,
        a.appointment_number,
        DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
        doc_u.name as doctor_name,
        dept.name as department_name,
        mr.symptoms,
        mr.diagnosis,
        mr.doctor_notes,
        mr.vitals,
        DATE_FORMAT(mr.created_at, '%Y-%m-%d %H:%i') as recorded_at
      FROM medical_records mr
      JOIN appointments a ON mr.appointment_id = a.id
      JOIN doctors doc ON mr.doctor_id = doc.id
      JOIN users doc_u ON doc.user_id = doc_u.id
      JOIN departments dept ON a.department_id = dept.id
      WHERE mr.patient_id = ?
      ORDER BY a.appointment_date DESC;
    `, [patientId]);

    return res.status(200).json({ success: true, records });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}


import pool from '../config/db.js';

/**
 * Helper to get the doctor_id for the logged-in user
 */
async function getDoctorIdFromUserId(userId) {
  const [[doctor]] = await pool.query(`SELECT id FROM doctors WHERE user_id = ?;`, [userId]);
  return doctor ? doctor.id : null;
}

/**
 * GET /api/doctor/profile
 * Returns profile details for the logged-in doctor
 */
export async function getDoctorProfile(req, res) {
  try {
    const doctorId = await getDoctorIdFromUserId(req.user.id);

    if (!doctorId) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    const [[doctor]] = await pool.query(
      `SELECT 
        d.id as doctor_id,
        u.id as user_id,
        u.name,
        u.phone,
        u.email,
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
      WHERE d.id = ?;`,
      [doctorId]
    );

    return res.status(200).json({ success: true, doctor });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/doctor/appointments
 * Get appointments assigned to the logged-in doctor
 * Query params: filter ('today', 'upcoming', 'all'), status ('scheduled', 'completed', 'cancelled')
 */
export async function getDoctorAppointments(req, res) {
  try {
    const doctorId = await getDoctorIdFromUserId(req.user.id);

    if (!doctorId) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    const { filter, status } = req.query;

    let query = `
      SELECT 
        a.id,
        a.appointment_number,
        DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
        a.appointment_time,
        a.status,
        a.reason,
        p.id as patient_id,
        pat_u.name as patient_name,
        pat_u.phone as patient_phone,
        p.gender,
        p.blood_group,
        DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') as dob,
        p.emergency_contact_name,
        p.emergency_contact_phone,
        dept.name as department_name,
        (SELECT COUNT(*) FROM medical_records mr WHERE mr.appointment_id = a.id) as has_consultation,
        (SELECT COUNT(*) FROM prescriptions rx WHERE rx.appointment_id = a.id) as prescription_count
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pat_u ON p.user_id = pat_u.id
      JOIN departments dept ON a.department_id = dept.id
      WHERE a.doctor_id = ?
    `;
    const params = [doctorId];

    if (filter === 'today') {
      query += ` AND a.appointment_date = CURDATE()`;
    } else if (filter === 'upcoming') {
      query += ` AND a.appointment_date >= CURDATE() AND a.status = 'scheduled'`;
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY a.appointment_date ASC, a.appointment_time ASC LIMIT 100;`;

    const [appointments] = await pool.query(query, params);

    return res.status(200).json({ success: true, appointments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/doctor/appointments/:appointment_id/consultation
 * Get consultation records and prescriptions for an appointment
 */
export async function getConsultationDetails(req, res) {
  try {
    const appointmentId = parseInt(req.params.appointment_id, 10);
    const doctorId = await getDoctorIdFromUserId(req.user.id);

    // 1. Fetch appointment details
    const [[appointment]] = await pool.query(
      `SELECT 
        a.id,
        a.appointment_number,
        DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
        a.appointment_time,
        a.status,
        a.reason,
        a.patient_id,
        pat_u.name as patient_name,
        pat_u.phone as patient_phone,
        p.gender,
        p.blood_group,
        DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') as dob
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pat_u ON p.user_id = pat_u.id
      WHERE a.id = ? AND a.doctor_id = ?;`,
      [appointmentId, doctorId]
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or not assigned to you.',
      });
    }

    // 2. Fetch medical record
    const [[medicalRecord]] = await pool.query(
      `SELECT id, symptoms, diagnosis, doctor_notes, vitals, created_at
       FROM medical_records
       WHERE appointment_id = ?;`,
      [appointmentId]
    );

    // 3. Fetch prescriptions
    const [prescriptions] = await pool.query(
      `SELECT id, medicine_name, dosage, frequency, duration, instructions
       FROM prescriptions
       WHERE appointment_id = ?;`,
      [appointmentId]
    );

    return res.status(200).json({
      success: true,
      appointment,
      medicalRecord: medicalRecord || null,
      prescriptions: prescriptions || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/doctor/appointments/:appointment_id/consultation
 * Save doctor consultation notes, diagnosis, vitals, and issue prescriptions
 */
export async function saveConsultation(req, res) {
  const connection = await pool.getConnection();
  try {
    const appointmentId = parseInt(req.params.appointment_id, 10);
    const doctorId = await getDoctorIdFromUserId(req.user.id);

    const { symptoms, diagnosis, doctor_notes, vitals, prescriptions = [] } = req.body;

    if (!diagnosis || !diagnosis.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Clinical diagnosis is required.',
      });
    }

    await connection.beginTransaction();

    // 1. Verify appointment belongs to this doctor
    const [[appointment]] = await connection.query(
      `SELECT id, patient_id FROM appointments WHERE id = ? AND doctor_id = ?;`,
      [appointmentId, doctorId]
    );

    if (!appointment) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or not assigned to you.',
      });
    }

    const patientId = appointment.patient_id;

    // 2. Insert or update medical record
    await connection.query(
      `INSERT INTO medical_records (appointment_id, patient_id, doctor_id, symptoms, diagnosis, doctor_notes, vitals)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         symptoms = VALUES(symptoms),
         diagnosis = VALUES(diagnosis),
         doctor_notes = VALUES(doctor_notes),
         vitals = VALUES(vitals);`,
      [
        appointmentId,
        patientId,
        doctorId,
        symptoms ? symptoms.trim() : null,
        diagnosis.trim(),
        doctor_notes ? doctor_notes.trim() : null,
        vitals ? JSON.stringify(vitals) : null,
      ]
    );

    // 3. Clear existing prescriptions for this appointment and insert updated prescription list
    await connection.query(`DELETE FROM prescriptions WHERE appointment_id = ?;`, [appointmentId]);

    if (Array.isArray(prescriptions) && prescriptions.length > 0) {
      for (const rx of prescriptions) {
        if (rx.medicine_name && rx.dosage) {
          await connection.query(
            `INSERT INTO prescriptions (appointment_id, patient_id, doctor_id, medicine_name, dosage, frequency, duration, instructions)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              appointmentId,
              patientId,
              doctorId,
              rx.medicine_name.trim(),
              rx.dosage.trim(),
              rx.frequency ? rx.frequency.trim() : '1-0-1',
              rx.duration ? rx.duration.trim() : '5 days',
              rx.instructions ? rx.instructions.trim() : 'Take after meals',
            ]
          );
        }
      }
    }

    // 4. Update appointment status to 'completed'
    await connection.query(
      `UPDATE appointments SET status = 'completed' WHERE id = ?;`,
      [appointmentId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Consultation notes, diagnosis, and prescription saved successfully.',
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
}

/**
 * PATCH /api/doctor/appointments/:appointment_id/status
 * Doctor updates appointment status
 */
export async function updateDoctorAppointmentStatus(req, res) {
  try {
    const appointmentId = parseInt(req.params.appointment_id, 10);
    const doctorId = await getDoctorIdFromUserId(req.user.id);
    const { status } = req.body;

    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be scheduled, completed, or cancelled.',
      });
    }

    const [result] = await pool.query(
      `UPDATE appointments SET status = ? WHERE id = ? AND doctor_id = ?;`,
      [status, appointmentId, doctorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or not assigned to you.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/doctor/patients/:patient_id/history
 * Comprehensive past medical records, consultations, and prescriptions for a patient
 */
export async function getPatientHistory(req, res) {
  try {
    const patientId = parseInt(req.params.patient_id, 10);

    // 1. Patient profile
    const [[patient]] = await pool.query(
      `SELECT 
        p.id as patient_id,
        u.name,
        u.phone,
        u.email,
        p.gender,
        p.blood_group,
        DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') as dob,
        p.address,
        p.emergency_contact_name,
        p.emergency_contact_phone
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?;`,
      [patientId]
    );

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // 2. Past medical records
    const [history] = await pool.query(
      `SELECT 
        mr.id as record_id,
        a.id as appointment_id,
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
      ORDER BY a.appointment_date DESC;`,
      [patientId]
    );

    // 3. Past prescriptions
    const [prescriptions] = await pool.query(
      `SELECT 
        p.id,
        p.appointment_id,
        a.appointment_number,
        doc_u.name as prescribed_by,
        p.medicine_name,
        p.dosage,
        p.frequency,
        p.duration,
        p.instructions,
        DATE_FORMAT(p.created_at, '%Y-%m-%d') as date
      FROM prescriptions p
      JOIN appointments a ON p.appointment_id = a.id
      JOIN doctors doc ON p.doctor_id = doc.id
      JOIN users doc_u ON doc.user_id = doc_u.id
      WHERE p.patient_id = ?
      ORDER BY p.id DESC;`,
      [patientId]
    );

    return res.status(200).json({
      success: true,
      patient,
      history,
      prescriptions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}


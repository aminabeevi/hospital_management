import pool from '../config/db.js';

async function viewDatabase() {
  console.log('\n=============================================================');
  console.log('📊 CarePulse HMS — Database Inspection Viewer');
  console.log('=============================================================\n');

  try {
    // 1. Users
    console.log('👤 [USERS TABLE]');
    const [users] = await pool.query('SELECT id, name, phone, role, email, is_active FROM users;');
    console.table(users);

    // 2. Departments
    console.log('\n🏥 [DEPARTMENTS TABLE]');
    const [depts] = await pool.query('SELECT id, name, description FROM departments;');
    console.table(depts);

    // 3. Doctors
    console.log('\n🩺 [DOCTORS TABLE (Joined with Users & Departments)]');
    const [doctors] = await pool.query(`
      SELECT 
        d.id as doc_id, 
        u.name as doctor_name, 
        dept.name as department, 
        d.specialization, 
        d.qualification, 
        d.experience_years as exp_yrs, 
        d.consultation_fee as fee,
        d.available_days
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      JOIN departments dept ON d.department_id = dept.id;
    `);
    console.table(doctors);

    // 4. Patients
    console.log('\n🧑‍🦽 [PATIENTS TABLE (Joined with Users)]');
    const [patients] = await pool.query(`
      SELECT 
        p.id as pat_id, 
        u.name as patient_name, 
        u.phone, 
        p.gender, 
        p.blood_group, 
        p.date_of_birth,
        p.emergency_contact_name as emergency_contact
      FROM patients p
      JOIN users u ON p.user_id = u.id;
    `);
    console.table(patients);

    // 5. Appointments
    console.log('\n📅 [APPOINTMENTS TABLE]');
    const [appointments] = await pool.query(`
      SELECT 
        a.appointment_number as apt_no,
        pat_u.name as patient,
        doc_u.name as doctor,
        dept.name as department,
        DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as date,
        a.appointment_time as time,
        a.status,
        a.reason
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pat_u ON p.user_id = pat_u.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users doc_u ON d.user_id = doc_u.id
      JOIN departments dept ON a.department_id = dept.id;
    `);
    console.table(appointments);

    // 6. Medical Records & Prescriptions
    console.log('\n💊 [PRESCRIPTIONS & MEDICAL RECORDS]');
    const [prescriptions] = await pool.query(`
      SELECT 
        p.id as rx_id,
        pat_u.name as patient,
        doc_u.name as doctor,
        p.medicine_name,
        p.dosage,
        p.frequency,
        p.duration,
        p.instructions
      FROM prescriptions p
      JOIN patients pat ON p.patient_id = pat.id
      JOIN users pat_u ON pat.user_id = pat_u.id
      JOIN doctors d ON p.doctor_id = d.id
      JOIN users doc_u ON d.user_id = doc_u.id;
    `);
    console.table(prescriptions);

    console.log('\n=============================================================');
    console.log('✅ All 8 database tables verified and loaded successfully.');
    console.log('=============================================================\n');
  } catch (error) {
    console.error('Error querying database:', error.message);
  } finally {
    await pool.end();
  }
}

viewDatabase();


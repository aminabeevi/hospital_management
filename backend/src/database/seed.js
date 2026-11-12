import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrationAndSeed() {
  console.log('🔄 Starting Database Migration & Seeding for CarePulse HMS...');

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  };

  const dbName = process.env.DB_NAME || 'hospital_management_db';

  let connection;
  try {
    // 1. Connect to MySQL server (without specifying DB name first)
    connection = await mysql.createConnection(dbConfig);
    console.log(`✅ Connected to MySQL server at ${dbConfig.host}:${dbConfig.port}`);

    // 2. Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Database "${dbName}" ensured.`);

    // 3. Switch to the database
    await connection.query(`USE \`${dbName}\`;`);

    // 4. Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('✅ Schema tables created successfully.');

    // 5. Seed Departments
    const departments = [
      { name: 'Cardiology', description: 'Comprehensive heart & cardiovascular care' },
      { name: 'Neurology', description: 'Brain, spinal cord, and nervous system disorders' },
      { name: 'Orthopedics', description: 'Bones, joints, ligaments, and musculoskeletal care' },
      { name: 'General Medicine', description: 'Primary healthcare and internal diagnostics' },
      { name: 'Pediatrics', description: 'Infant, child, and adolescent healthcare' },
    ];

    for (const dept of departments) {
      await connection.query(
        `INSERT INTO departments (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description);`,
        [dept.name, dept.description]
      );
    }
    console.log(`✅ Seeded ${departments.length} departments.`);

    // 6. Common hashed password for demonstration staff accounts
    const defaultPassword = 'Password@123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    // 7. Seed Admin User
    const [adminUser] = await connection.query(
      `INSERT INTO users (name, phone, email, password_hash, role) 
       VALUES ('System Administrator', '9999999990', 'admin@carepulse.com', ?, 'admin')
       ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash);`,
      [passwordHash]
    );

    // 8. Seed Receptionist User
    await connection.query(
      `INSERT INTO users (name, phone, email, password_hash, role) 
       VALUES ('Sarah Jenkins (Reception)', '9999999991', 'receptionist@carepulse.com', ?, 'receptionist')
       ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash);`,
      [passwordHash]
    );

    // 9. Fetch Department IDs
    const [deptRows] = await connection.query(`SELECT id, name FROM departments;`);
    const deptMap = {};
    deptRows.forEach((d) => { deptMap[d.name] = d.id; });

    // 10. Seed Doctors
    const doctorsData = [
      {
        name: 'Dr. Robert Chen',
        phone: '9999999992',
        email: 'dr.chen@carepulse.com',
        department: 'Cardiology',
        specialization: 'Interventional Cardiology',
        qualification: 'MD, DM (Cardiology), FACC',
        experience: 14,
        fee: 800.00,
        bio: 'Over 14 years specializing in heart catheterization, angioplasty, and hypertension management.',
        available_days: 'Mon,Tue,Wed,Thu,Fri',
      },
      {
        name: 'Dr. Maya Patel',
        phone: '9999999993',
        email: 'dr.patel@carepulse.com',
        department: 'Neurology',
        specialization: 'Clinical Neurologist',
        qualification: 'MBBS, MD (Neurology)',
        experience: 9,
        fee: 750.00,
        bio: 'Specialist in migraine management, stroke rehabilitation, and neuromuscular disorders.',
        available_days: 'Mon,Wed,Fri',
      },
      {
        name: 'Dr. Sarah Williams',
        phone: '9999999994',
        email: 'dr.williams@carepulse.com',
        department: 'General Medicine',
        specialization: 'Internal Medicine Specialist',
        qualification: 'MBBS, MD (General Medicine)',
        experience: 11,
        fee: 500.00,
        bio: 'Primary care physician expert in diabetes management, preventive wellness, and infectious disease.',
        available_days: 'Mon,Tue,Wed,Thu,Fri,Sat',
      },
    ];

    for (const doc of doctorsData) {
      await connection.query(
        `INSERT INTO users (name, phone, email, password_hash, role) 
         VALUES (?, ?, ?, ?, 'doctor')
         ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash);`,
        [doc.name, doc.phone, doc.email, passwordHash]
      );

      const [[userRow]] = await connection.query(`SELECT id FROM users WHERE phone = ?;`, [doc.phone]);
      const deptId = deptMap[doc.department];

      await connection.query(
        `INSERT INTO doctors (user_id, department_id, specialization, qualification, experience_years, consultation_fee, bio, available_days)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
            department_id = VALUES(department_id),
            specialization = VALUES(specialization),
            qualification = VALUES(qualification),
            experience_years = VALUES(experience_years),
            consultation_fee = VALUES(consultation_fee),
            bio = VALUES(bio),
            available_days = VALUES(available_days);`,
        [userRow.id, deptId, doc.specialization, doc.qualification, doc.experience, doc.fee, doc.bio, doc.available_days]
      );
    }
    console.log(`✅ Seeded ${doctorsData.length} doctors with profile details.`);

    // 11. Seed Patients
    const patientsData = [
      {
        name: 'Alex Johnson',
        phone: '9876543210',
        email: 'alex.j@example.com',
        dob: '1990-05-15',
        gender: 'male',
        blood_group: 'O+',
        address: '742 Evergreen Terrace, Springfield',
        emergency_name: 'Martha Johnson',
        emergency_phone: '9876543299',
      },
      {
        name: 'Emily Davis',
        phone: '9876543211',
        email: 'emily.d@example.com',
        dob: '1985-11-20',
        gender: 'female',
        blood_group: 'A+',
        address: '100 Main Street, Springfield',
        emergency_name: 'David Davis',
        emergency_phone: '9876543288',
      },
    ];

    for (const pat of patientsData) {
      await connection.query(
        `INSERT INTO users (name, phone, email, password_hash, role) 
         VALUES (?, ?, ?, ?, 'patient')
         ON DUPLICATE KEY UPDATE name = VALUES(name);`,
        [pat.name, pat.phone, pat.email, passwordHash]
      );

      const [[userRow]] = await connection.query(`SELECT id FROM users WHERE phone = ?;`, [pat.phone]);

      await connection.query(
        `INSERT INTO patients (user_id, date_of_birth, gender, blood_group, address, emergency_contact_name, emergency_contact_phone)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
            date_of_birth = VALUES(date_of_birth),
            gender = VALUES(gender),
            blood_group = VALUES(blood_group),
            address = VALUES(address),
            emergency_contact_name = VALUES(emergency_contact_name),
            emergency_contact_phone = VALUES(emergency_contact_phone);`,
        [userRow.id, pat.dob, pat.gender, pat.blood_group, pat.address, pat.emergency_name, pat.emergency_phone]
      );
    }
    console.log(`✅ Seeded ${patientsData.length} patient profiles.`);

    // 12. Seed Sample Appointments
    const [[drChen]] = await connection.query(`SELECT d.id as doc_id, u.id as user_id FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.phone = '9999999992';`);
    const [[patientAlex]] = await connection.query(`SELECT p.id as pat_id FROM patients p JOIN users u ON p.user_id = u.id WHERE u.phone = '9876543210';`);
    const [[patientEmily]] = await connection.query(`SELECT p.id as pat_id FROM patients p JOIN users u ON p.user_id = u.id WHERE u.phone = '9876543211';`);

    const todayStr = new Date().toISOString().split('T')[0];

    // Appointment 1: Completed appointment for Alex Johnson
    await connection.query(
      `INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, created_by)
       VALUES ('APT-20261112-001', ?, ?, ?, ?, '09:30:00', 'completed', 'Routine cardiovascular health checkup & ECG', ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status);`,
      [patientAlex.pat_id, drChen.doc_id, deptMap['Cardiology'], todayStr, drChen.user_id]
    );

    const [[apt1]] = await connection.query(`SELECT id FROM appointments WHERE appointment_number = 'APT-20261112-001';`);

    // Add Consultation Medical Record for Appointment 1
    await connection.query(
      `INSERT INTO medical_records (appointment_id, patient_id, doctor_id, symptoms, diagnosis, doctor_notes, vitals)
       VALUES (?, ?, ?, 'Mild chest tightness upon heavy exertion', 'Stage 1 Essential Hypertension', 'Advised low sodium diet, 30 min daily walking, follow-up in 4 weeks.', ?)
       ON DUPLICATE KEY UPDATE diagnosis = VALUES(diagnosis);`,
      [apt1.id, patientAlex.pat_id, drChen.doc_id, JSON.stringify({ bp: '138/88', pulse: 74, temp: '98.4 F', weight_kg: 78 })]
    );

    // Add Prescriptions for Appointment 1
    await connection.query(
      `DELETE FROM prescriptions WHERE appointment_id = ?;`,
      [apt1.id]
    );
    await connection.query(
      `INSERT INTO prescriptions (appointment_id, patient_id, doctor_id, medicine_name, dosage, frequency, duration, instructions)
       VALUES 
       (?, ?, ?, 'Amlodipine Besylate', '5mg', 'Once daily (morning)', '30 days', 'Take after breakfast with water'),
       (?, ?, ?, 'Atorvastatin', '10mg', 'Once daily (night)', '30 days', 'Take at bedtime');`,
      [apt1.id, patientAlex.pat_id, drChen.doc_id, apt1.id, patientAlex.pat_id, drChen.doc_id]
    );

    // Appointment 2: Scheduled upcoming appointment for Emily Davis
    await connection.query(
      `INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, created_by)
       VALUES ('APT-20261112-002', ?, ?, ?, ?, '11:00:00', 'scheduled', 'Follow-up consultation for cholesterol control', ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status);`,
      [patientEmily.pat_id, drChen.doc_id, deptMap['Cardiology'], todayStr, drChen.user_id]
    );

    console.log('✅ Seeded sample appointments, consultation notes, and prescriptions.');

    console.log('\n======================================================');
    console.log('🎉 CAREPULSE HMS DATABASE MIGRATION & SEEDING COMPLETE');
    console.log('======================================================');
    console.log('Demo Credentials for Testing:');
    console.log('──────────────────────────────────────────────────────');
    console.log('Admin User:        Phone: 9999999990  | Password: Password@123');
    console.log('Receptionist:      Phone: 9999999991  | Password: Password@123');
    console.log('Dr. Robert Chen:   Phone: 9999999992  | Password: Password@123');
    console.log('Dr. Maya Patel:    Phone: 9999999993  | Password: Password@123');
    console.log('Patient (Alex J):  Phone: 9876543210  | (OTP login or Password@123)');
    console.log('Patient (Emily D): Phone: 9876543211  | (OTP login or Password@123)');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Migration Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️ Could not connect to MySQL server.');
      console.error('👉 Make sure MySQL is running on port ' + (process.env.DB_PORT || '3306'));
      console.error('👉 Check credentials in backend/.env (DB_USER, DB_PASSWORD)');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigrationAndSeed();


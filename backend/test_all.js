import app from './src/app.js';
import http from 'http';
import { generateToken } from './src/utils/token.js';

const PORT = 5006;
const server = http.createServer(app);

async function runAllE2ETests() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`\n================================================================`);
  console.log(`  🏥 HOSPITAL MANAGEMENT SYSTEM — FULL E2E VERIFICATION SUITE  `);
  console.log(`================================================================`);
  console.log(`  Target Port: ${PORT} | Time: ${new Date().toISOString()}`);
  console.log(`  Verifying all 11 core interview assignment workflows...\n`);

  const baseUrl = `http://localhost:${PORT}/api`;

  let totalTests = 0;
  let testsPassed = 0;
  const startTime = Date.now();

  async function test(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      testsPassed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  try {
    let adminToken = null;
    let doctorToken = null;
    let patientToken = null;
    let receptionistToken = null;

    // -------------------------------------------------------------
    // WORKFLOW 1: Admin login and dashboard access
    // -------------------------------------------------------------
    console.log(`\n📌 WORKFLOW 1: Admin Login & Dashboard Access`);
    await test('Admin logs in with password (POST /api/auth/login)', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9999999990', password: 'Password@123' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      if (data.user.role !== 'admin') throw new Error(`Expected admin role, got ${data.user.role}`);
      adminToken = data.token;
      console.log(`     Token received for Admin (${data.user.name})`);
    });

    await test('Admin accesses dashboard stats (GET /api/admin/stats)', async () => {
      const res = await fetch(`${baseUrl}/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      if (typeof data.stats.totalDoctors !== 'number') throw new Error('Invalid stats format');
      console.log(`     Stats: ${data.stats.totalDoctors} doctors, ${data.stats.totalPatients} patients, ${data.stats.totalAppointments} appointments`);
    });

    // -------------------------------------------------------------
    // WORKFLOW 2: Doctor login and dashboard access
    // -------------------------------------------------------------
    console.log(`\n📌 WORKFLOW 2: Doctor Login & Dashboard Access`);
    await test('Doctor logs in with password (POST /api/auth/login)', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9999999992', password: 'Password@123' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      if (data.user.role !== 'doctor') throw new Error(`Expected doctor role, got ${data.user.role}`);
      doctorToken = data.token;
      console.log(`     Token received for Doctor (${data.user.name})`);
    });

    await test('Doctor accesses profile and specialization (GET /api/doctor/profile)', async () => {
      const res = await fetch(`${baseUrl}/doctor/profile`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      if (!data.doctor.specialization) throw new Error('Missing doctor specialization');
      console.log(`     Dr. ${data.doctor.name} — ${data.doctor.specialization} (${data.doctor.department_name})`);
    });

    // -------------------------------------------------------------
    // WORKFLOW 3: Patient phone number and OTP login
    // -------------------------------------------------------------
    console.log(`\n📌 WORKFLOW 3: Patient Phone Number & OTP Login`);
    let mockOtp = null;
    await test('Patient requests OTP for login (POST /api/auth/send-otp)', async () => {
      const res = await fetch(`${baseUrl}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      if (!data.mockOtp) throw new Error('Mock OTP was not returned in dev mode');
      mockOtp = data.mockOtp;
      console.log(`     Mock OTP delivered to 9876543210: [${mockOtp}]`);
    });

    await test('Patient verifies valid OTP and receives session JWT (POST /api/auth/verify-otp)', async () => {
      const res = await fetch(`${baseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', otp: mockOtp }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      if (data.user.role !== 'patient') throw new Error(`Expected patient role, got ${data.user.role}`);
      patientToken = data.token;
      console.log(`     Authenticated Patient: ${data.user.name} (${data.user.phone})`);
    });

    // -------------------------------------------------------------
    // WORKFLOW 4: Invalid OTP handling & attempt tracking
    // -------------------------------------------------------------
    console.log(`\n📌 WORKFLOW 4: Invalid OTP Handling & Attempt Tracking`);
    await test('Patient requests new OTP for attempt tracking', async () => {
      const res = await fetch(`${baseUrl}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543211' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
    });

    await test('Invalid OTP is rejected with remaining attempts tracking', async () => {
      const res = await fetch(`${baseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543211', otp: '000000' }),
      });
      const data = await res.json();
      if (res.status !== 400 || data.success) throw new Error('Expected 400 Bad Request');
      if (!data.message.includes('remaining')) throw new Error(data.message);
      console.log(`     Rejected invalid OTP: "${data.message}"`);
    });

    // -------------------------------------------------------------
    // WORKFLOW 5: Unauthorized access to protected routes (RBAC)
    // -------------------------------------------------------------
    console.log(`\n📌 WORKFLOW 5: RBAC Enforcement & Route Guards`);
    await test('Unauthenticated request to protected route is rejected with 401', async () => {
      const res = await fetch(`${baseUrl}/admin/stats`);
      if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    });

    await test('Patient token attempting Admin route is forbidden with 403', async () => {
      const res = await fetch(`${baseUrl}/admin/stats`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
      console.log(`     Access forbidden as expected: HTTP 403`);
    });

    await test('Patient token attempting Doctor route is forbidden with 403', async () => {
      const res = await fetch(`${baseUrl}/doctor/appointments`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    });

    // Also get Receptionist token
    const recRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9999999991', password: 'Password@123' }),
    });
    const recData = await recRes.json();
    receptionistToken = recData.token;

    // -------------------------------------------------------------
    // WORKFLOW 6: Admin creating, editing, and deactivating a doctor
    // -------------------------------------------------------------
    console.log(`\n📌 WORKFLOW 6: Admin Doctor Management (CRUD)`);
    const uniqueSuffix = Date.now().toString().slice(-4);
    const testDocPhone = `912345${uniqueSuffix}`;
    let createdDoctorId = null;

    await test('Admin creates new doctor (POST /api/admin/doctors)', async () => {
      const res = await fetch(`${baseUrl}/admin/doctors`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Dr. Verification Specialist ${uniqueSuffix}`,
          phone: testDocPhone,
          email: `doc_${uniqueSuffix}@hospital.com`,
          department_id: 1, // Cardiology
          specialization: 'Interventional Cardiology',
          qualification: 'MBBS, DM Cardiology',
          experience_years: 12,
          consultation_fee: 900.0,
          available_days: 'Mon,Wed,Fri',
          bio: 'Automated test physician for workflow 6 verification.',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      createdDoctorId = data.doctor.doctor_id;
      console.log(`     Created Doctor ID: ${createdDoctorId} (User ID: ${data.doctor.user_id})`);
    });

    await test('Admin updates doctor details (PUT /api/admin/doctors/:id)', async () => {
      const res = await fetch(`${baseUrl}/admin/doctors/${createdDoctorId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Dr. Verification Specialist ${uniqueSuffix} (Updated)`,
          phone: testDocPhone,
          email: `doc_${uniqueSuffix}@hospital.com`,
          department_id: 1,
          specialization: 'Senior Interventional Cardiologist',
          qualification: 'MBBS, MD, DM, FACC',
          experience_years: 15,
          consultation_fee: 1100.0,
          available_days: 'Mon,Tue,Wed,Thu,Fri',
          bio: 'Promoted to Senior Interventional Cardiologist.',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      console.log(`     Updated fee to ₹1100 and qualification to MBBS, MD, DM, FACC`);
    });

    await test('Admin toggles doctor active status (PATCH /api/admin/doctors/:id/status)', async () => {
      const res = await fetch(`${baseUrl}/admin/doctors/${createdDoctorId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      console.log(`     Doctor deactivated successfully`);
    });

    // -------------------------------------------------------------
    // WORKFLOW 7: Receptionist registering a patient
    // -------------------------------------------------------------
    console.log(`\n📌 WORKFLOW 7: Receptionist Patient Registration`);
    const testPatPhone = `982000${Date.now().toString().slice(-4)}`;
    let registeredPatientId = null;

    await test('Receptionist registers a walk-in patient (POST /api/receptionist/patients)', async () => {
      const res = await fetch(`${baseUrl}/receptionist/patients`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Samantha Reed',
          phone: testPatPhone,
          email: `samantha_${uniqueSuffix}@example.com`,
          date_of_birth: '1992-06-15',
          gender: 'female',
          blood_group: 'A+',
          address: '42 Medical Center Blvd, Suite 300',
          emergency_contact_name: 'David Reed',
          emergency_contact_phone: '9820000000',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      registeredPatientId = data.patient.id;
      console.log(`     Registered Patient ID: ${registeredPatientId} (${data.patient.name}, ${testPatPhone})`);
    });

    await test('Receptionist searches patient by phone (GET /api/receptionist/patients/search)', async () => {
      const res = await fetch(`${baseUrl}/receptionist/patients/search?q=${testPatPhone}`, {
        headers: { Authorization: `Bearer ${receptionistToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      if (data.patients.length === 0) throw new Error('Registered patient was not found in search');
      console.log(`     Search confirmed patient: "${data.patients[0].name}"`);
    });

    // -------------------------------------------------------------
    // WORKFLOW 8: Receptionist booking appointment & double-booking prevention
    // -------------------------------------------------------------
    console.log(`\n📌 WORKFLOW 8: Appointment Booking & Conflict Detection`);
    const tomorrowStr = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
    const uniqueSlot = `11:${Math.floor(10 + Math.random() * 45)}:00`;
    let bookedAppointmentId = null;

    await test('Receptionist books new appointment with Dr. Robert Chen', async () => {
      const res = await fetch(`${baseUrl}/receptionist/appointments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: registeredPatientId,
          doctor_id: 1, // Dr. Robert Chen
          department_id: 1, // Cardiology
          appointment_date: tomorrowStr,
          appointment_time: uniqueSlot,
          reason: 'Severe recurring chest tightness and tachycardia on exertion',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      bookedAppointmentId = data.appointment.id;
      console.log(`     Booked Appointment ID: ${bookedAppointmentId} (Code: ${data.appointment.appointment_number})`);
    });

    await test('Double-booking same doctor at exact date and time is rejected with 409', async () => {
      const res = await fetch(`${baseUrl}/receptionist/appointments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: 1, // Another patient (Alex Johnson)
          doctor_id: 1,
          department_id: 1,
          appointment_date: tomorrowStr,
          appointment_time: uniqueSlot,
          reason: 'Conflict testing slot overlap',
        }),
      });
      const data = await res.json();
      if (res.status !== 409 || data.success) throw new Error(`Expected 409 Conflict, got ${res.status}`);
      console.log(`     Conflict detected and blocked: "${data.message}"`);
    });

    // -------------------------------------------------------------
    // WORKFLOW 9: Doctor viewing assigned appointments
    // -------------------------------------------------------------
    console.log(`\n📌 WORKFLOW 9: Doctor Viewing Assigned Appointments`);
    await test('Dr. Robert Chen views appointment queue (GET /api/doctor/appointments)', async () => {
      const res = await fetch(`${baseUrl}/doctor/appointments?date=${tomorrowStr}`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      const targetApt = data.appointments.find((a) => a.id === bookedAppointmentId);
      if (!targetApt) throw new Error(`Target appointment #${bookedAppointmentId} not found in doctor schedule`);
      console.log(`     Found appointment for ${targetApt.patient_name} at ${targetApt.appointment_time}`);
    });

    // -------------------------------------------------------------
    // WORKFLOW 10: Doctor adding consultation notes, diagnosis, vitals, prescriptions
    // -------------------------------------------------------------
    console.log(`\n📌 WORKFLOW 10: Doctor Consultation, Diagnosis & Prescriptions`);
    await test('Doctor submits clinical consultation under atomic transaction', async () => {
      const res = await fetch(`${baseUrl}/doctor/appointments/${bookedAppointmentId}/consultation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${doctorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symptoms: 'Chest pain, shortness of breath upon stair climbing, systolic hypertension',
          diagnosis: 'Class II Angina Pectoris & Stage 1 Hypertension',
          doctor_notes: 'Initiated beta-blocker therapy. Echocardiogram and lipid profile scheduled.',
          vitals: {
            bp: '142/92',
            pulse: 84,
            temp: '98.6',
            spo2: 98,
            weight_kg: 68,
          },
          prescriptions: [
            {
              medicine_name: 'Metoprolol Tartrate',
              dosage: '50mg',
              frequency: 'Twice daily after meals',
              duration_days: 30,
              instructions: 'Monitor morning pulse before taking',
            },
            {
              medicine_name: 'Aspirin (Cardio)',
              dosage: '75mg',
              frequency: 'Once daily after breakfast',
              duration_days: 30,
              instructions: 'Take with food to protect stomach lining',
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      console.log(`     Saved medical record #${data.recordId} and ${data.prescriptionCount} prescription items`);
    });

    // -------------------------------------------------------------
    // WORKFLOW 11: Patient viewing appointments and prescriptions
    // -------------------------------------------------------------
    console.log(`\n📌 WORKFLOW 11: Patient Accessing Records & Prescriptions`);
    // Authenticate as the newly registered patient Samantha
    const samOtpRes = await fetch(`${baseUrl}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPatPhone }),
    });
    const samOtpData = await samOtpRes.json();
    const samVerifyRes = await fetch(`${baseUrl}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPatPhone, otp: samOtpData.mockOtp }),
    });
    const samVerifyData = await samVerifyRes.json();
    const samToken = samVerifyData.token;

    await test('Patient views their appointments history (GET /api/patient/appointments)', async () => {
      const res = await fetch(`${baseUrl}/patient/appointments`, {
        headers: { Authorization: `Bearer ${samToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      if (data.appointments.length === 0) throw new Error('Patient appointments list is empty');
      const apt = data.appointments.find((a) => a.id === bookedAppointmentId);
      if (!apt) throw new Error('Completed appointment not found');
      if (apt.status !== 'completed') throw new Error(`Expected completed status, got ${apt.status}`);
      console.log(`     Appointment status verified: ${apt.status} (Doctor: Dr. ${apt.doctor_name})`);
    });

    await test('Patient views their prescriptions (GET /api/patient/prescriptions)', async () => {
      const res = await fetch(`${baseUrl}/patient/prescriptions`, {
        headers: { Authorization: `Bearer ${samToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      if (data.prescriptions.length === 0) throw new Error('No prescriptions returned for patient');
      console.log(`     Retrieved ${data.prescriptions.length} prescriptions:`);
      data.prescriptions.forEach((rx) => {
        console.log(`       - ${rx.medicine_name} (${rx.dosage}) — ${rx.frequency}`);
      });
    });

    await test('Patient views electronic medical records & vitals (GET /api/patient/medical-records)', async () => {
      const res = await fetch(`${baseUrl}/patient/medical-records`, {
        headers: { Authorization: `Bearer ${samToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || JSON.stringify(data) || `HTTP ${res.status}`);
      if (data.records.length === 0) throw new Error('No medical records found');
      const rec = data.records[0];
      if (!rec.diagnosis) throw new Error('Diagnosis missing in medical record');
      console.log(`     Diagnosis: "${rec.diagnosis}" | BP: ${rec.vitals?.bp || 'N/A'}`);
    });

  } finally {
    server.close();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n================================================================`);
    console.log(`  📊 TEST RESULTS SUMMARY: ${testsPassed} / ${totalTests} PASSED (${elapsed}s)`);
    console.log(`================================================================\n`);

    if (testsPassed === totalTests) {
      console.log(`  🎉 ALL 11 REQUIRED INTERVIEW ASSIGNMENT WORKFLOWS VERIFIED! 🎉\n`);
      process.exit(0);
    } else {
      console.error(`  ⚠️ Some tests failed. Please review the errors above.\n`);
      process.exit(1);
    }
  }
}

runAllE2ETests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

import app from './src/app.js';
import http from 'http';
import { generateToken } from './src/utils/token.js';

const PORT = 5005;
const server = http.createServer(app);

async function runPatientTests() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`🧪 Patient Test Server running on port ${PORT}\n`);

  const baseUrl = `http://localhost:${PORT}/api/patient`;

  // Tokens: Alex Johnson (user_id = 6, patient_id = 1)
  const patientToken = generateToken({ id: 6, name: 'Alex Johnson', phone: '9876543210', role: 'patient' });

  let testsPassed = 0;
  let totalTests = 0;

  async function test(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      testsPassed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  try {
    // Test 1: Patient fetches personal profile
    await test('Patient fetches health profile (GET /api/patient/profile)', async () => {
      const res = await fetch(`${baseUrl}/profile`, {
        headers: { 'Authorization': `Bearer ${patientToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (data.patient.phone !== '9876543210') throw new Error('Mismatched patient phone');
      console.log(`   (Patient: ${data.patient.name}, Blood Group: ${data.patient.blood_group})`);
    });

    // Test 2: Patient updates profile
    await test('Patient updates profile demographics (PUT /api/patient/profile)', async () => {
      const res = await fetch(`${baseUrl}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${patientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: 'Updated 742 Evergreen Terrace',
          emergency_contact_phone: '9876500000',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
    });

    // Test 3: Patient browses departments
    await test('Patient browses departments (GET /api/patient/departments)', async () => {
      const res = await fetch(`${baseUrl}/departments`, {
        headers: { 'Authorization': `Bearer ${patientToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (data.departments.length === 0) throw new Error('No departments found');
      console.log(`   (Found ${data.departments.length} hospital departments)`);
    });

    // Test 4: Patient browses doctors
    let doctorId = null;
    let deptId = null;
    await test('Patient browses doctors (GET /api/patient/doctors)', async () => {
      const res = await fetch(`${baseUrl}/doctors`, {
        headers: { 'Authorization': `Bearer ${patientToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (data.doctors.length === 0) throw new Error('No doctors found');
      doctorId = data.doctors[0].doctor_id;
      deptId = data.doctors[0].department_id;
      console.log(`   (Selected Doctor: "${data.doctors[0].name}", Fee: ₹${data.doctors[0].consultation_fee})`);
    });

    // Test 5: Patient books appointment
    const targetDate = new Date(Date.now() + 259200000).toISOString().split('T')[0]; // 3 days from now
    const randomSec = Math.floor(10 + Math.random() * 40);
    const targetTime = `16:${randomSec}:00`;

    await test('Patient self-books appointment (POST /api/patient/appointments)', async () => {
      const res = await fetch(`${baseUrl}/appointments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${patientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctor_id: doctorId,
          department_id: deptId,
          appointment_date: targetDate,
          appointment_time: targetTime,
          reason: 'Routine preventive wellness consultation',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      console.log(`   (Booked appointment: Ref #${data.appointmentNumber})`);
    });

    // Test 6: Double-booking prevention
    await test('Patient booking conflict check (rejects duplicate slot)', async () => {
      const res = await fetch(`${baseUrl}/appointments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${patientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctor_id: doctorId,
          department_id: deptId,
          appointment_date: targetDate,
          appointment_time: targetTime, // Same slot
          reason: 'Second conflicting attempt',
        }),
      });
      if (res.ok) throw new Error('Expected conflict rejection');
      const data = await res.json();
      console.log(`   (Properly caught conflict: "${data.message}")`);
    });

    // Test 7: Patient views appointments
    await test('Patient views my appointments (GET /api/patient/appointments)', async () => {
      const res = await fetch(`${baseUrl}/appointments`, {
        headers: { 'Authorization': `Bearer ${patientToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (data.appointments.length === 0) throw new Error('Expected at least 1 appointment');
    });

    // Test 8: Patient views prescriptions
    await test('Patient views prescriptions (GET /api/patient/prescriptions)', async () => {
      const res = await fetch(`${baseUrl}/prescriptions`, {
        headers: { 'Authorization': `Bearer ${patientToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (data.prescriptions.length === 0) throw new Error('Expected prescriptions');
      console.log(`   (Found ${data.prescriptions.length} prescriptions issued to Alex)`);
    });

    // Test 9: Patient views medical records
    await test('Patient views clinical medical records (GET /api/patient/records)', async () => {
      const res = await fetch(`${baseUrl}/records`, {
        headers: { 'Authorization': `Bearer ${patientToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (data.records.length === 0) throw new Error('Expected medical records');
      console.log(`   (Found ${data.records.length} diagnosis records)`);
    });

    console.log(`\n======================================================`);
    console.log(`🎉 PATIENT PORTAL TEST SUMMARY: ${testsPassed}/${totalTests} Tests Passed`);
    console.log(`======================================================\n`);
  } finally {
    server.close();
  }
}

runPatientTests();

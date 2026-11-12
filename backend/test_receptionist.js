import app from './src/app.js';
import http from 'http';
import { generateToken } from './src/utils/token.js';

const PORT = 5003;
const server = http.createServer(app);

async function runReceptionistTests() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`🧪 Receptionist Test Server running on port ${PORT}\n`);

  const baseUrl = `http://localhost:${PORT}/api/receptionist`;

  // Tokens
  const receptionistToken = generateToken({ id: 2, name: 'Sarah Jenkins', phone: '9999999991', role: 'receptionist' });
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
    // Test 1: RBAC Security - Patient blocked from receptionist APIs
    await test('Security: Patient token rejected on Receptionist routes (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/appointments`, {
        headers: { 'Authorization': `Bearer ${patientToken}` },
      });
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
      const data = await res.json();
      if (!data.message.includes('Forbidden')) throw new Error(data.message);
    });

    // Test 2: Search Patients
    await test('Receptionist searches existing patient by name or phone', async () => {
      const res = await fetch(`${baseUrl}/patients/search?q=Alex`, {
        headers: { 'Authorization': `Bearer ${receptionistToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (data.patients.length === 0 || !data.patients[0].name.includes('Alex')) {
        throw new Error('Failed to find patient Alex');
      }
      console.log(`   (Found: ${data.patients[0].name}, Phone: ${data.patients[0].phone})`);
    });

    // Test 3: Register a New Patient
    let newPatientId = null;
    const testPhone = '97777' + Math.floor(10000 + Math.random() * 90000);
    await test('Receptionist registers a new patient (POST /api/receptionist/patients)', async () => {
      const res = await fetch(`${baseUrl}/patients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Priya Sharma',
          phone: testPhone,
          email: `priya.${testPhone}@example.com`,
          gender: 'female',
          blood_group: 'B+',
          date_of_birth: '1992-08-14',
          address: '45 Lake View Road, Bangalore',
          emergency_contact_name: 'Rahul Sharma',
          emergency_contact_phone: '9777700000',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      newPatientId = data.patient.patient_id;
      console.log(`   (Registered Patient "${data.patient.name}" with ID: ${newPatientId})`);
    });

    // Test 4: Prevent duplicate phone registration
    await test('Reject patient registration with duplicate phone number', async () => {
      const res = await fetch(`${baseUrl}/patients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Duplicate Priya',
          phone: testPhone, // Same phone
        }),
      });
      if (res.ok) throw new Error('Expected duplicate phone rejection');
      const data = await res.json();
      console.log(`   (Properly rejected duplicate phone: "${data.message}")`);
    });

    // Test 5: Get Available Doctors
    let doctorId = null;
    let deptId = null;
    await test('Receptionist gets available doctors for scheduling', async () => {
      const res = await fetch(`${baseUrl}/doctors`, {
        headers: { 'Authorization': `Bearer ${receptionistToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (data.doctors.length === 0) throw new Error('No doctors found');
      doctorId = data.doctors[0].doctor_id;
      deptId = data.doctors[0].department_id;
      console.log(`   (Selected Doctor: "${data.doctors[0].name}", Fee: ₹${data.doctors[0].consultation_fee})`);
    });

    // Test 6: Book Appointment for New Patient
    let bookedAptId = null;
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const testTimeSlot = '15:30:00';

    await test('Receptionist books an appointment (POST /api/receptionist/appointments)', async () => {
      const res = await fetch(`${baseUrl}/appointments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: newPatientId,
          doctor_id: doctorId,
          department_id: deptId,
          appointment_date: tomorrowStr,
          appointment_time: testTimeSlot,
          reason: 'Initial consultation for chest discomfort',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      bookedAptId = data.appointmentId;
      console.log(`   (Booked appointment: Ref #${data.appointmentNumber})`);
    });

    // Test 7: Double-booking prevention
    await test('Double-booking prevention (conflict rejection on same doctor & time)', async () => {
      const res = await fetch(`${baseUrl}/appointments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: 1, // another patient
          doctor_id: doctorId,
          department_id: deptId,
          appointment_date: tomorrowStr,
          appointment_time: testTimeSlot, // Same time slot
          reason: 'Conflicting visit',
        }),
      });
      if (res.ok) throw new Error('Expected conflict rejection for double-booking');
      const data = await res.json();
      console.log(`   (Properly caught conflict: "${data.message}")`);
    });

    // Test 8: Get front-desk appointments
    await test('Receptionist fetches scheduled appointments', async () => {
      const res = await fetch(`${baseUrl}/appointments?date=${tomorrowStr}`, {
        headers: { 'Authorization': `Bearer ${receptionistToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (data.appointments.length === 0) throw new Error('Expected booked appointment in list');
    });

    // Test 9: Update Appointment Status
    await test('Receptionist updates appointment status to completed', async () => {
      const res = await fetch(`${baseUrl}/appointments/${bookedAptId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
    });

    console.log(`\n======================================================`);
    console.log(`🎉 RECEPTIONIST MODULE TEST SUMMARY: ${testsPassed}/${totalTests} Tests Passed`);
    console.log(`======================================================\n`);
  } finally {
    server.close();
  }
}

runReceptionistTests();


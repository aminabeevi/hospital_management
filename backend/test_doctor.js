import app from './src/app.js';
import http from 'http';
import { generateToken } from './src/utils/token.js';

const PORT = 5004;
const server = http.createServer(app);

async function runDoctorTests() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`🧪 Doctor Test Server running on port ${PORT}\n`);

  const baseUrl = `http://localhost:${PORT}/api/doctor`;

  // Tokens: Dr. Robert Chen (user_id = 3, doctor_id = 1)
  const doctorToken = generateToken({ id: 3, name: 'Dr. Robert Chen', phone: '9999999992', role: 'doctor' });
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
    // Test 1: RBAC Security - Patient blocked from Doctor APIs
    await test('Security: Patient token rejected on Doctor routes (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/appointments`, {
        headers: { 'Authorization': `Bearer ${patientToken}` },
      });
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
      const data = await res.json();
      if (!data.message.includes('Forbidden')) throw new Error(data.message);
    });

    // Test 2: Doctor fetches personal profile
    await test('Doctor fetches personal profile (GET /api/doctor/profile)', async () => {
      const res = await fetch(`${baseUrl}/profile`, {
        headers: { 'Authorization': `Bearer ${doctorToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (!data.doctor.specialization) throw new Error('Missing doctor specialization');
      console.log(`   (Doctor: ${data.doctor.name}, Dept: ${data.doctor.department_name}, Fee: ₹${data.doctor.consultation_fee})`);
    });

    // Test 3: Doctor fetches assigned appointments
    let appointmentId = null;
    let patientId = null;
    await test('Doctor gets assigned appointments (GET /api/doctor/appointments)', async () => {
      const res = await fetch(`${baseUrl}/appointments`, {
        headers: { 'Authorization': `Bearer ${doctorToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (data.appointments.length === 0) throw new Error('No appointments found for Dr. Chen');
      appointmentId = data.appointments[0].id;
      patientId = data.appointments[0].patient_id;
      console.log(`   (Retrieved ${data.appointments.length} appointments. Target Apt ID: ${appointmentId})`);
    });

    // Test 4: Doctor views consultation details
    await test('Doctor views consultation details for appointment', async () => {
      const res = await fetch(`${baseUrl}/appointments/${appointmentId}/consultation`, {
        headers: { 'Authorization': `Bearer ${doctorToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (!data.appointment) throw new Error('Missing appointment info in consultation');
    });

    // Test 5: Doctor saves consultation notes, diagnosis, vitals, and prescriptions
    await test('Doctor records consultation & issues prescription (POST /api/doctor/appointments/:id/consultation)', async () => {
      const res = await fetch(`${baseUrl}/appointments/${appointmentId}/consultation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${doctorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symptoms: 'Exertional dyspnea and episodic palpitation',
          diagnosis: 'Supraventricular Tachycardia (Controlled)',
          doctor_notes: 'Advised Holter monitoring, avoid caffeine, return if symptoms exacerbate.',
          vitals: {
            bp: '124/82',
            pulse: 78,
            temp: '98.5',
            weight_kg: 74,
          },
          prescriptions: [
            {
              medicine_name: 'Metoprolol Succinate',
              dosage: '25mg',
              frequency: 'Once daily (morning)',
              duration: '30 days',
              instructions: 'Take after breakfast with a glass of water',
            },
            {
              medicine_name: 'Aspirin',
              dosage: '75mg',
              frequency: 'Once daily (lunch)',
              duration: '30 days',
              instructions: 'Take with food to avoid gastric irritation',
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      console.log(`   (Consultation and 2 medications saved. Appointment marked completed!)`);
    });

    // Test 6: Patient medical history retrieval
    await test('Doctor views full patient medical history (GET /api/doctor/patients/:id/history)', async () => {
      const res = await fetch(`${baseUrl}/patients/${patientId}/history`, {
        headers: { 'Authorization': `Bearer ${doctorToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (data.history.length === 0) throw new Error('Expected at least 1 consultation record');
      if (data.prescriptions.length === 0) throw new Error('Expected prescriptions');
      console.log(`   (History: ${data.history.length} consultations, ${data.prescriptions.length} prescriptions)`);
    });

    // Test 7: Doctor updates appointment status
    await test('Doctor updates appointment status (PATCH /api/doctor/appointments/:id/status)', async () => {
      const res = await fetch(`${baseUrl}/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${doctorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
    });

    console.log(`\n======================================================`);
    console.log(`🎉 DOCTOR MODULE TEST SUMMARY: ${testsPassed}/${totalTests} Tests Passed`);
    console.log(`======================================================\n`);
  } finally {
    server.close();
  }
}

runDoctorTests();


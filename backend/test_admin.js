import app from './src/app.js';
import http from 'http';
import { generateToken } from './src/utils/token.js';

const PORT = 5002;
const server = http.createServer(app);

async function runAdminTests() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`🧪 Admin Test Server running on port ${PORT}\n`);

  const baseUrl = `http://localhost:${PORT}/api/admin`;

  // Generate test JWT tokens
  const adminToken = generateToken({ id: 1, name: 'Admin', phone: '9999999990', role: 'admin' });
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
    // Test 1: RBAC Security - Patient cannot access Admin API
    await test('Security: Patient token rejected on Admin routes with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/stats`, {
        headers: { 'Authorization': `Bearer ${patientToken}` },
      });
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
      const data = await res.json();
      if (!data.message.includes('Forbidden')) throw new Error(data.message);
    });

    // Test 2: Admin can fetch Stats
    await test('Admin fetches hospital stats (GET /api/admin/stats)', async () => {
      const res = await fetch(`${baseUrl}/stats`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (typeof data.stats.totalDoctors !== 'number') throw new Error('Invalid totalDoctors in stats');
      console.log(`   (Doctors: ${data.stats.totalDoctors}, Patients: ${data.stats.totalPatients}, Revenue: ₹${data.stats.totalRevenue})`);
    });

    // Test 3: Admin fetches Doctors list
    await test('Admin fetches doctors list (GET /api/admin/doctors)', async () => {
      const res = await fetch(`${baseUrl}/doctors`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (!Array.isArray(data.doctors) || data.doctors.length === 0) throw new Error('Expected doctors array');
    });

    // Test 4: Admin creates a new Doctor
    let newDocId = null;
    await test('Admin provisions a new doctor (POST /api/admin/doctors)', async () => {
      const testPhone = '99999' + Math.floor(10000 + Math.random() * 90000);
      const res = await fetch(`${baseUrl}/doctors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Dr. Test Surgeon',
          phone: testPhone,
          email: `test.doc.${testPhone}@carepulse.com`,
          department_id: 1, // Cardiology
          specialization: 'Pediatric Cardiac Surgery',
          qualification: 'MS, MCh (CTVS)',
          experience_years: 12,
          consultation_fee: 1000,
          available_days: 'Tue,Thu,Sat',
          bio: 'Specialist in pediatric cardiac surgery and congenital heart defects.',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      newDocId = data.doctorId;
      console.log(`   (Created new Doctor with ID: ${newDocId})`);
    });

    // Test 5: Admin updates doctor details
    await test('Admin updates doctor profile (PUT /api/admin/doctors/:id)', async () => {
      const res = await fetch(`${baseUrl}/doctors/${newDocId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultation_fee: 1200,
          experience_years: 13,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
    });

    // Test 6: Admin deactivates doctor
    await test('Admin deactivates doctor (PATCH /api/admin/doctors/:id/status)', async () => {
      const res = await fetch(`${baseUrl}/doctors/${newDocId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
    });

    // Test 7: Admin creates new Department
    await test('Admin adds new department (POST /api/admin/departments)', async () => {
      const deptName = 'Dermatology & Skin Care ' + Math.floor(Math.random() * 1000);
      const res = await fetch(`${baseUrl}/departments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: deptName,
          description: 'Skin diagnostics, cosmetic dermatology, and wound healing.',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
    });

    // Test 8: Admin fetches All Appointments
    await test('Admin gets all appointments (GET /api/admin/appointments)', async () => {
      const res = await fetch(`${baseUrl}/appointments`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (!Array.isArray(data.appointments)) throw new Error('Expected appointments array');
    });

    // Test 9: Admin fetches Patients directory
    await test('Admin gets registered patients (GET /api/admin/patients)', async () => {
      const res = await fetch(`${baseUrl}/patients`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (!Array.isArray(data.patients)) throw new Error('Expected patients array');
    });

    console.log(`\n======================================================`);
    console.log(`🎉 ADMIN MODULE TEST SUMMARY: ${testsPassed}/${totalTests} Tests Passed`);
    console.log(`======================================================\n`);
  } finally {
    server.close();
  }
}

runAdminTests();


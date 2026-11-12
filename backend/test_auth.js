import app from './src/app.js';
import http from 'http';

const PORT = 5001; // Test on port 5001 to avoid conflicting with running dev server
const server = http.createServer(app);

async function runAuthTests() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`🧪 Auth Test Server running on port ${PORT}\n`);

  const baseUrl = `http://localhost:${PORT}/api/auth`;

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
    let mockOtp = null;
    let patientToken = null;
    let adminToken = null;

    // Test 1: Send OTP to Patient Alex Johnson
    await test('Send OTP to valid phone (9876543210)', async () => {
      const res = await fetch(`${baseUrl}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (!data.mockOtp) throw new Error('Expected mockOtp in dev response');
      mockOtp = data.mockOtp;
      console.log(`   (Generated Mock OTP: ${mockOtp})`);
    });

    // Test 2: Verify Incorrect OTP
    await test('Verify with incorrect OTP code (should fail gracefully)', async () => {
      const res = await fetch(`${baseUrl}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', otpCode: '000000' }),
      });
      const data = await res.json();
      if (res.ok) throw new Error('Expected 400 error for bad OTP');
      if (!data.message.includes('Incorrect OTP')) throw new Error(data.message);
      console.log(`   (Properly rejected: "${data.message}")`);
    });

    // Test 3: Verify Correct OTP and receive JWT
    await test('Verify with correct OTP code and receive JWT', async () => {
      const res = await fetch(`${baseUrl}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', otpCode: mockOtp }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (!data.token) throw new Error('Missing JWT token');
      if (data.user.role !== 'patient') throw new Error(`Expected role patient, got ${data.user.role}`);
      patientToken = data.token;
      console.log(`   (Issued JWT Token for patient "${data.user.name}")`);
    });

    // Test 4: Single-use check (reusing the same OTP must fail)
    await test('Single-use OTP enforcement (reusing used OTP must be rejected)', async () => {
      const res = await fetch(`${baseUrl}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', otpCode: mockOtp }),
      });
      const data = await res.json();
      if (res.ok) throw new Error('Expected used OTP to be rejected');
      console.log(`   (Properly rejected: "${data.message}")`);
    });

    // Test 5: Protected route with JWT token
    await test('Access protected GET /api/auth/me with valid Bearer token', async () => {
      const res = await fetch(`${baseUrl}/me`, {
        headers: { 'Authorization': `Bearer ${patientToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (data.user.phone !== '9876543210') throw new Error('Mismatched user phone');
      console.log(`   (Decoded user: ${data.user.name}, Blood Group: ${data.user.profile?.blood_group})`);
    });

    // Test 6: Protected route without JWT token (Unauthorized)
    await test('Reject protected GET /api/auth/me without token (401)', async () => {
      const res = await fetch(`${baseUrl}/me`);
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
      const data = await res.json();
      console.log(`   (Properly rejected: "${data.message}")`);
    });

    // Test 7: Staff password login (Admin)
    await test('Admin staff password login (9999999990 / Password@123)', async () => {
      const res = await fetch(`${baseUrl}/login-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: '9999999990', password: 'Password@123' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      if (data.user.role !== 'admin') throw new Error(`Expected admin, got ${data.user.role}`);
      adminToken = data.token;
      console.log(`   (Admin login successful: "${data.user.name}", Role: ${data.user.role})`);
    });

    // Test 8: Staff login with invalid password
    await test('Reject staff login with wrong password', async () => {
      const res = await fetch(`${baseUrl}/login-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: '9999999990', password: 'WrongPassword' }),
      });
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
      const data = await res.json();
      console.log(`   (Properly rejected: "${data.message}")`);
    });

    console.log(`\n======================================================`);
    console.log(`🎉 AUTH TEST SUMMARY: ${testsPassed}/${totalTests} Tests Passed`);
    console.log(`======================================================\n`);
  } finally {
    server.close();
  }
}

runAuthTests();


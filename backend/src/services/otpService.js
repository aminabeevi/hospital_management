import crypto from 'crypto';
import pool from '../config/db.js';
import { sendSms } from './smsService.js';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const MAX_VERIFICATION_ATTEMPTS = 3;

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
function generateSecureOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Request an OTP for a given mobile number
 */
export async function requestOtp(phone, purpose = 'login') {
  // Normalize phone number (strip whitespace, dashes)
  const cleanPhone = phone.replace(/\D/g, '');

  if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  // 1. Rate limiting: Check if an active OTP was requested in the last 60 seconds
  const [recentOtps] = await pool.query(
    `SELECT created_at FROM otp_verifications 
     WHERE phone = ? AND is_used = FALSE AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)
     ORDER BY created_at DESC LIMIT 1;`,
    [cleanPhone]
  );

  if (recentOtps.length > 0) {
    throw new Error('Please wait 60 seconds before requesting another OTP.');
  }

  // 2. Invalidate any previously unexpired unused OTPs for this phone
  await pool.query(
    `UPDATE otp_verifications SET is_used = TRUE WHERE phone = ? AND is_used = FALSE;`,
    [cleanPhone]
  );

  // 3. Generate 6-digit OTP and calculate expiry
  const otpCode = generateSecureOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // 4. Store in database
  await pool.query(
    `INSERT INTO otp_verifications (phone, otp_code, purpose, expires_at, is_used, attempts)
     VALUES (?, ?, ?, ?, FALSE, 0);`,
    [cleanPhone, otpCode, purpose, expiresAt]
  );

  // 5. Send OTP via SMS Service
  const message = `Your CarePulse HMS verification code is: ${otpCode}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`;
  await sendSms(cleanPhone, message);

  const isMockMode = process.env.MOCK_OTP_MODE !== 'false';

  return {
    success: true,
    message: isMockMode
      ? `Mock OTP generated and printed in server terminal.`
      : `OTP sent to +91 ${cleanPhone.slice(-4).padStart(cleanPhone.length, '*')}.`,
    phone: cleanPhone,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
    // In development mock mode, pass mockOtp in response so tester/mentor can test directly from frontend UI
    mockOtp: isMockMode ? otpCode : undefined,
  };
}

/**
 * Verify OTP entered by user, look up account, or create new patient profile
 */
export async function verifyOtp(phone, otpCode, purpose = 'login') {
  const cleanPhone = phone.replace(/\D/g, '');

  if (!cleanPhone || !otpCode) {
    throw new Error('Phone number and 6-digit OTP code are required.');
  }

  // 1. Fetch latest active OTP record for this phone
  const [otpRecords] = await pool.query(
    `SELECT * FROM otp_verifications 
     WHERE phone = ? AND purpose = ?
     ORDER BY id DESC LIMIT 1;`,
    [cleanPhone, purpose]
  );

  if (otpRecords.length === 0) {
    throw new Error('No OTP request found for this phone number. Please request a new OTP.');
  }

  const record = otpRecords[0];

  // 2. Check if already used
  if (record.is_used) {
    throw new Error('This OTP has already been used. Please request a fresh code.');
  }

  // 3. Check if expired
  const now = new Date();
  const expiry = new Date(record.expires_at);
  if (now > expiry) {
    await pool.query(`UPDATE otp_verifications SET is_used = TRUE WHERE id = ?;`, [record.id]);
    throw new Error('This OTP has expired. Please request a new code.');
  }

  // 4. Check failed attempts
  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    await pool.query(`UPDATE otp_verifications SET is_used = TRUE WHERE id = ?;`, [record.id]);
    throw new Error('Too many failed attempts. This OTP has been invalidated for security. Please request a new code.');
  }

  // 5. Compare OTP Code
  if (record.otp_code !== otpCode.trim()) {
    const updatedAttempts = record.attempts + 1;
    await pool.query(
      `UPDATE otp_verifications SET attempts = ? WHERE id = ?;`,
      [updatedAttempts, record.id]
    );

    const remaining = MAX_VERIFICATION_ATTEMPTS - updatedAttempts;
    throw new Error(
      remaining > 0
        ? `Incorrect OTP code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Incorrect OTP code. Maximum attempts exceeded. Please request a new code.'
    );
  }

  // 6. Mark OTP as used
  await pool.query(`UPDATE otp_verifications SET is_used = TRUE WHERE id = ?;`, [record.id]);

  // 7. Check if user exists in database
  const [users] = await pool.query(
    `SELECT id, name, phone, email, role, is_active FROM users WHERE phone = ?;`,
    [cleanPhone]
  );

  let user;

  if (users.length > 0) {
    user = users[0];

    if (!user.is_active) {
      throw new Error('Your account has been deactivated. Please contact the hospital administrator.');
    }
  } else {
    // 8. Auto-register new patient if logging in with phone for the first time
    const defaultName = `Patient ${cleanPhone.slice(-4)}`;
    const [insertUser] = await pool.query(
      `INSERT INTO users (name, phone, role, is_active) VALUES (?, ?, 'patient', TRUE);`,
      [defaultName, cleanPhone]
    );

    const newUserId = insertUser.insertId;

    // Create linked patient profile
    await pool.query(
      `INSERT INTO patients (user_id) VALUES (?);`,
      [newUserId]
    );

    user = {
      id: newUserId,
      name: defaultName,
      phone: cleanPhone,
      email: null,
      role: 'patient',
      is_active: 1,
    };
  }

  return {
    verified: true,
    user,
  };
}


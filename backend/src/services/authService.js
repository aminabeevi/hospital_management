import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { generateToken } from '../utils/token.js';

/**
 * Authenticate staff or demo accounts with phone/email and password
 */
export async function loginWithPassword(identifier, password) {
  if (!identifier || !password) {
    throw new Error('Please provide both username (phone/email) and password.');
  }

  const cleanIdentifier = identifier.trim();

  // Find user by phone OR email
  const [users] = await pool.query(
    `SELECT id, name, phone, email, password_hash, role, is_active 
     FROM users 
     WHERE phone = ? OR email = ?;`,
    [cleanIdentifier, cleanIdentifier]
  );

  if (users.length === 0) {
    throw new Error('Invalid credentials. No user found with this phone number or email.');
  }

  const user = users[0];

  if (!user.is_active) {
    throw new Error('This account has been deactivated. Please contact the administrator.');
  }

  if (!user.password_hash) {
    throw new Error('Password login is not enabled for this account. Please log in using mobile OTP.');
  }

  // Compare bcrypt password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid credentials. Incorrect password.');
  }

  // Fetch role-specific profile ID (doctor_id or patient_id)
  let profile = null;
  if (user.role === 'doctor') {
    const [[doc]] = await pool.query(
      `SELECT d.id as doctor_id, d.specialization, d.qualification, d.consultation_fee, dept.name as department
       FROM doctors d
       JOIN departments dept ON d.department_id = dept.id
       WHERE d.user_id = ?;`,
      [user.id]
    );
    profile = doc || null;
  } else if (user.role === 'patient') {
    const [[pat]] = await pool.query(
      `SELECT id as patient_id, blood_group, gender, date_of_birth FROM patients WHERE user_id = ?;`,
      [user.id]
    );
    profile = pat || null;
  }

  // Exclude password_hash from the returned payload
  const { password_hash, ...safeUser } = user;
  const token = generateToken(safeUser);

  return {
    user: {
      ...safeUser,
      profile,
    },
    token,
  };
}

/**
 * Fetch full profile for an authenticated user
 */
export async function getUserProfile(userId) {
  const [users] = await pool.query(
    `SELECT id, name, phone, email, role, is_active, created_at FROM users WHERE id = ?;`,
    [userId]
  );

  if (users.length === 0) {
    throw new Error('User not found.');
  }

  const user = users[0];

  let profile = null;
  if (user.role === 'doctor') {
    const [[doc]] = await pool.query(
      `SELECT d.id as doctor_id, d.department_id, dept.name as department_name, d.specialization, d.qualification, d.experience_years, d.consultation_fee, d.available_days, d.bio
       FROM doctors d
       JOIN departments dept ON d.department_id = dept.id
       WHERE d.user_id = ?;`,
      [user.id]
    );
    profile = doc || null;
  } else if (user.role === 'patient') {
    const [[pat]] = await pool.query(
      `SELECT id as patient_id, date_of_birth, gender, blood_group, address, emergency_contact_name, emergency_contact_phone
       FROM patients WHERE user_id = ?;`,
      [user.id]
    );
    profile = pat || null;
  }

  return {
    ...user,
    profile,
  };
}


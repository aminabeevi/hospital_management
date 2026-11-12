import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool to handle multiple concurrent queries efficiently
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hospital_management_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

/**
 * Helper to test the database connection
 * Returns { connected: true } or { connected: false, error: string }
 */
export async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return { connected: true, message: 'Database connection successful' };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

export default pool;


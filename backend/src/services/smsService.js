import dotenv from 'dotenv';

dotenv.config();

/**
 * Modular SMS Service Interface
 * Easily replaceable with Twilio, MSG91, AWS SNS, etc.
 */
export async function sendSms(phone, message) {
  const isMockMode = process.env.MOCK_OTP_MODE !== 'false';

  if (isMockMode) {
    console.log('\n======================================================');
    console.log('📱 [DEVELOPMENT MOCK SMS GATEWAY]');
    console.log(`📞 Recipient : ${phone}`);
    console.log(`💬 Message   : ${message}`);
    console.log('ℹ️  Note      : Mock mode active (no SMS provider billed/needed)');
    console.log('======================================================\n');

    return {
      success: true,
      provider: 'mock',
      message: 'Mock SMS logged to server console successfully',
    };
  }

  // Production SMS provider integration point (e.g. Twilio / MSG91)
  // Example for future integration:
  // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({ to: phone, from: process.env.TWILIO_PHONE, body: message });

  console.warn('⚠️ Real SMS provider not configured. Falling back to console output.');
  return {
    success: false,
    provider: 'none',
    message: 'No SMS provider configured in production mode',
  };
}


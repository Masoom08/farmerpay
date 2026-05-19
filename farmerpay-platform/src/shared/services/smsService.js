const axios = require('axios');
const config = require('../../config');
const logger = require('../utils/logger');

/**
 * Sends an SMS using WebPostService.
 * Required environment variables:
 * - SMS_API_KEY
 * - SMS_SENDER (e.g. ADAAYO)
 */
const sendSMS = async ({ to, message, templateId }) => {
  try {
    const apiKey = process.env.SMS_API_KEY;
    const sender = process.env.SMS_SENDER || 'ADAAYO';

    if (!apiKey) {
      throw new Error('SMS_API_KEY is not configured');
    }

    // Normalize number to 10 digits for this gateway
    const mobile = to.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);

    const encodedMessage = encodeURIComponent(message);

    const url =
      `https://webpostservice.com/sendsms_v2.0/sendsms.php` +
      `?apikey=${apiKey}` +
      `&type=TEXT` +
      `&mobile=${mobile}` +
      `&sender=${sender}` +
      `&message=${encodedMessage}`;

    // Console logs for debugging
    console.log('\n========== SMS DEBUG ==========');
    console.log('Provider      : WebPostService');
    console.log('Mobile        :', mobile);
    console.log('Sender        :', sender);
    console.log('API Key       :', `${apiKey.substring(0, 8)}...`);
    console.log('Message       :', message);
    console.log('Encoded Msg   :', encodedMessage);
    console.log('Request URL   :', url);
    console.log('===============================\n');

    logger.info(`Sending SMS to ${mobile.substring(0, 6)}**** via WebPostService`);

    const response = await axios.get(url, { timeout: 15000 });

    // Response logs
    console.log('\n========== SMS RESPONSE ==========');
    console.log('HTTP Status   :', response.status);
    console.log('Response Data :', response.data);
    console.log('=================================\n');

    const result = {
      success: true,
      messageId: `sms_${Date.now()}`,
      provider: 'webpostservice',
      to: mobile,
      providerResponse: response.data,
    };

    logger.info(`SMS sent to ${mobile.substring(0, 6)}****`);
    return result;
  } catch (err) {
    // Error logs
    console.log('\n========== SMS ERROR ==========');
    console.log('Error Message :', err.message);
    if (err.response) {
      console.log('HTTP Status   :', err.response.status);
      console.log('Response Data :', err.response.data);
    }
    console.log('===============================\n');

    logger.error(`SMS send failed: ${err.message}`);
    throw err;
  }
};

/**
 * Sends an OTP via SMS.
 * IMPORTANT:
 * Message must exactly match the approved DLT template.
 */
const sendOTP = async (phoneNumber, otp) => {
  // EXACT same message used in your working project
  const message = `ADAAYO - Your OTP for login is ${otp} Please do not share your OTP to anyone`;

  // OTP debug log
  console.log('\n========== OTP GENERATED ==========');
  console.log('Phone Number  :', phoneNumber);
  console.log('OTP Code      :', otp);
  console.log('Message       :', message);
  console.log('===================================\n');

  return sendSMS({
    to: phoneNumber,
    message,
  });
};

module.exports = {
  sendSMS,
  sendOTP,
};
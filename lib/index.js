// airtel-payments.js

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
require('dotenv').config();

// ───────────────────────────────────────────────────────────────────────────────
// Configuration & Constants
// ───────────────────────────────────────────────────────────────────────────────
const {
  AIRTEL_API_BASE_URL,
  CLIENT_ID,
  CLIENT_SECRET,
  GRANT_TYPE,
  COUNTRY,
  CURRENCY,
  AIRTEL_API_VERSION,
  DEFAULT_MAX_RETRIES = 5,
  DEFAULT_POLLING_INTERVAL_MS = 5000,
  POOLING_TIMEOUT = 10000
} = process.env;

const version = AIRTEL_API_VERSION || '1';

let bearerTokenCache = null;
let tokenExpiry = 0;

// ───────────────────────────────────────────────────────────────────────────────
// Utility: Centralized Axios Error Logging
// ───────────────────────────────────────────────────────────────────────────────
function logAxiosError(fnName, error) {
  console.error(`Error in ${fnName}:`, error.message);
  if (error.response) {
    console.error('  Response data:', error.response.data);
    console.error('  Status code :', error.response.status);
  } else if (error.request) {
    console.error('  No response received:', error.request);
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 1) Bearer-Token Management (cached until expiry minus 60s buffer)
// ───────────────────────────────────────────────────────────────────────────────
async function getBearerToken() {
  if (Date.now() < tokenExpiry && bearerTokenCache) {
    return bearerTokenCache;
  }

  try {
    console.log('Fetching new Bearer Token...');
    const { data } = await axios.post(
      `${AIRTEL_API_BASE_URL}/auth/oauth2/token`,
      { client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: GRANT_TYPE },
      {
        headers: { 'Content-Type': 'application/json', Accept: '*/*' },
        timeout: POOLING_TIMEOUT
      }
    );

    bearerTokenCache = data.access_token;
    tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;
    console.log('New Bearer token cached.');
    return bearerTokenCache;
  } catch (err) {
    logAxiosError('getBearerToken', err);
    throw err;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 2) V1: Simple “JSON” Payment Request
// ───────────────────────────────────────────────────────────────────────────────
async function requestPaymentV1(token, amount, msisdn, reference, transactionId) {
  try {
    const payload = {
      reference,
      subscriber: { country: COUNTRY, currency: CURRENCY, msisdn },
      transaction: { amount, country: COUNTRY, currency: CURRENCY, id: transactionId }
    };

    console.log('Payment request (V1):', JSON.stringify(payload, null, 2));
    const { data } = await axios.post(
      `${AIRTEL_API_BASE_URL}/merchant/v1/payments/`,
      payload,
      {
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          'X-Country': COUNTRY,
          'X-Currency': CURRENCY,
          Authorization: `Bearer ${token}`
        },
        timeout: POOLING_TIMEOUT
      }
    );

    console.log('Payment response (V1):', JSON.stringify(data, null, 2));
    if (!data?.data?.transaction) {
      throw new Error('Invalid response structure from Airtel Payment V1');
    }
    const txn = data.data.transaction;
    if (txn.status === 'TF') {
      console.error('Transaction failed (V1):', txn);
      throw new Error(`Transaction failed: ${txn.message}`);
    }
    if (txn.status !== 'TS') {
      console.warn('Transaction not yet successful (V1):', txn);
    } else {
      console.log('Transaction successful (V1):', txn);
    }

    return data;
  } catch (err) {
    logAxiosError('requestPaymentV1', err);
    throw err;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 3) V2: Encrypted-Payload Payment Request
// ───────────────────────────────────────────────────────────────────────────────
async function requestPaymentV2(token, amount, msisdn, reference, retries = 0) {
  const transactionId = uuidv4();
  const payload = {
    reference,
    subscriber: { country: COUNTRY, currency: CURRENCY, msisdn },
    transaction: { amount, country: COUNTRY, currency: CURRENCY, id: transactionId }
  };

  console.log('Payment request (V2):', JSON.stringify(payload, null, 2));

  // AES key/IV
  const { key, iv } = {
    key: crypto.randomBytes(32).toString('base64'),
    iv: crypto.randomBytes(16).toString('base64')
  };
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(key, 'base64'),
    Buffer.from(iv, 'base64')
  );
  let encryptedPayload = cipher.update(JSON.stringify(payload), 'utf8', 'base64');
  encryptedPayload += cipher.final('base64');

  // Fetch RSA public key
  let rsaPublicKey;
  try {
    console.log('Fetching RSA public key for V2 encryption...');
    const { data } = await axios.get(
      `${AIRTEL_API_BASE_URL}/v1/rsa/encryption-keys`,
      {
        headers: {
          Authorization: `Bearer ${await getBearerToken()}`,
          'X-Country': COUNTRY,
          'X-Currency': CURRENCY
        }
      }
    );
    rsaPublicKey = data.data.key;
    console.log('RSA public key fetched (V2).');
  } catch (err) {
    logAxiosError('fetchRSAPublicKey', err);
    throw err;
  }

  // Encrypt AES key:iv under RSA
  const keyIvString = `${key}:${iv}`;
  const encryptedKeyIv = crypto
    .publicEncrypt(
      { key: rsaPublicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(keyIvString, 'utf8')
    )
    .toString('base64');

  // Attempt payment
  try {
    const { data } = await axios.post(
      `${AIRTEL_API_BASE_URL}/merchant/v2/payments/`,
      payload,
      {
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          'X-Country': COUNTRY,
          'X-Currency': CURRENCY,
          Authorization: `Bearer ${token}`,
          'x-signature': encryptedPayload,
          'x-key': encryptedKeyIv
        },
        timeout: POOLING_TIMEOUT
      }
    );

    console.log('Payment response (V2):', JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    if (retries + 1 < DEFAULT_MAX_RETRIES) {
      console.warn(`Retrying payment request (V2): attempt ${retries + 2}/${DEFAULT_MAX_RETRIES}`);
      return requestPaymentV2(token, amount, msisdn, reference, retries + 1);
    }
    logAxiosError('requestPaymentV2', err);
    throw err;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 4) Polling: Common Flow for V1 & V2 Status Checks
// ───────────────────────────────────────────────────────────────────────────────
async function pollPaymentStatus(transactionIdOrRef) {
  console.log(`Starting polling for transaction ${transactionIdOrRef}`);
  const checkFn = version === '1' ? pollStatusV1 : pollStatusV2;
  let lastStatus = null;

  for (let attempt = 0; attempt < Number(DEFAULT_MAX_RETRIES); attempt++) {
    console.log(`Polling attempt ${attempt + 1}/${DEFAULT_MAX_RETRIES} for ${transactionIdOrRef}`);
    try {
      const responseData = await checkFn(transactionIdOrRef);
      const txn = responseData.data.transaction;
      console.log(`Poll response:`, JSON.stringify(txn, null, 2));

      lastStatus = txn?.status ?? 'UNKNOWN';

      if (lastStatus === 'TS') {
        console.log('Final status: Transaction successful:', txn);
        return responseData;
      }
      if (lastStatus === 'TF') {
        console.error('Final status: Transaction failed:', txn);
        return responseData;
      }

      console.log(`Status is pending (${lastStatus}). Will retry after delay.`);
      const waitMs = Number(DEFAULT_POLLING_INTERVAL_MS) * (attempt + 1);
      console.log(`Waiting ${waitMs}ms before next poll…`);
      await new Promise(res => setTimeout(res, waitMs));
    } catch (err) {
      console.error(`Error during polling attempt ${attempt + 1}: ${err.message}`);
      if (attempt + 1 >= Number(DEFAULT_MAX_RETRIES)) {
        console.error(`Polling stopped. Last known status: ${lastStatus}`);
        throw new Error(`Polling exceeded max retries (last status=${lastStatus})`);
      }
      console.log(`Will retry polling (attempt ${attempt + 2}/${DEFAULT_MAX_RETRIES})…`);
    }
  }

  console.error(`Polling timed out. Last known status: ${lastStatus}`);
  throw new Error(`Polling timed out (last status=${lastStatus})`);
}

// ───────────────────────────────────────────────────────────────────────────────
// 5) Status Check V1
// ───────────────────────────────────────────────────────────────────────────────
async function pollStatusV1(transactionId) {
  const token = await getBearerToken();
  try {
    console.log(`Requesting status (V1) for ${transactionId}…`);
    const { data } = await axios.get(
      `${AIRTEL_API_BASE_URL}/standard/v1/payments/${transactionId}`,
      {
        headers: {
          Accept: '*/*',
          'X-Country': COUNTRY,
          'X-Currency': CURRENCY,
          Authorization: `Bearer ${token}`
        },
        timeout: POOLING_TIMEOUT
      }
    );
    console.log('Status response (V1):', JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    logAxiosError('pollStatusV1', err);
    throw err;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 6) Status Check V2
// ───────────────────────────────────────────────────────────────────────────────
async function pollStatusV2(reference) {
  const token = await getBearerToken();
  try {
    console.log(`Requesting status (V2) for ${reference}…`);
    const { data } = await axios.get(
      `${AIRTEL_API_BASE_URL}/standard/v1/payments/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Country': COUNTRY,
          'X-Currency': CURRENCY
        },
        timeout: POOLING_TIMEOUT
      }
    );
    console.log('Status response (V2):', JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    logAxiosError('pollStatusV2', err);
    throw err;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 7) Public API: Initiate Airtel Payment
// ───────────────────────────────────────────────────────────────────────────────
async function initiateAirtelPayment(amount, msisdn, reference) {
  console.log(`\n=== Initiating Airtel payment ===`);
  console.log(`Amount: ${amount}, MSISDN: ${msisdn}, Reference: ${reference}, Version: ${version}`);

  try {
    const token = await getBearerToken();
    console.log('Bearer token acquired.');

    const transactionIdOrRef = uuidv4();
    let paymentData;

    if (version === '1') {
      paymentData = await requestPaymentV1(token, amount, msisdn, reference, transactionIdOrRef);
    } else {
      paymentData = await requestPaymentV2(token, amount, msisdn, reference);
    }

    console.log('Payment request complete. Now polling status…');
    return await pollPaymentStatus(transactionIdOrRef);
  } catch (err) {
    console.error(`initiateAirtelPayment failed: ${err.message}`);
    throw err;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 8) Export
// ───────────────────────────────────────────────────────────────────────────────
module.exports = {
  initiateAirtelPayment
};

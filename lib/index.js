const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
require('dotenv').config();

const DEFAULT_MAX_RETRIES = process.env.DEFAULT_MAX_RETRIES
const DEFAULT_POLLING_INTERVAL_MS = process.env.DEFAULT_POLLING_INTERVAL_MS;
const version = process.env.AIRTEL_API_VERSION || '1'; 
let bearerTokenCache = null; 
let tokenExpiryTime = null;

// Common functions for both versions
async function getBearerToken() {
    const { CLIENT_ID, CLIENT_SECRET, GRANT_TYPE, AIRTEL_API_BASE_URL } = process.env;

    if (bearerTokenCache && Date.now() < tokenExpiryTime) {
        console.log('Using cached Bearer Token.');
        return bearerTokenCache;
    }

    console.log('Getting new Bearer Token...');
    try {
        const response = await axios.post(`${AIRTEL_API_BASE_URL}/auth/oauth2/token`, {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: GRANT_TYPE
        }, {
            headers: { 'Content-Type': 'application/json', 'Accept': '*/*' },
            timeout: process.env.POOLING_TIMEOUT 
        });

        bearerTokenCache = response.data.access_token;
        tokenExpiryTime = Date.now() + (response.data.expires_in * 1000) - 60000;
        console.log('New Bearer token cached successfully.');
        return bearerTokenCache;
    } catch (error) {
        console.error('Error while getting Bearer Token');
        handleAxiosError('getBearerToken', error);
        throw error;
    }
}


// V1 request payment

async function requestPaymentV1(bearerToken, amount, msisdn, reference, transactionId, maxRetries = DEFAULT_MAX_RETRIES) {
  const { COUNTRY, CURRENCY, AIRTEL_API_BASE_URL } = process.env;

  const inputBody = {
      reference,
      subscriber: {
          country: COUNTRY,
          currency: CURRENCY,
          msisdn
      },
      transaction: {
          amount,
          country: COUNTRY,
          currency: CURRENCY,
          id: transactionId
      }
  };

  let retries = 0;
  while (retries < maxRetries) {
      try {
          console.log(`Attempting payment request (Try: ${retries + 1}/${maxRetries})...`);

          const response = await axios.post(`${AIRTEL_API_BASE_URL}/merchant/v1/payments/`, inputBody, {
              headers: {
                  'Accept': '*/*',
                  'Content-Type': 'application/json',
                  'X-Country': COUNTRY,
                  'X-Currency': CURRENCY,
                  'Authorization': `Bearer ${bearerToken}`
              },
              timeout: process.env.POOLING_TIMEOUT
          });
          console.log('Payment request successful:', response.data);
          return response.data;
      } catch (error) {
          if (++retries >= maxRetries) {
              console.error('Payment request failed after max retries');
              handleAxiosError('requestPayment', error);
              throw error;
          }
          console.warn(`Retrying payment request... (${retries}/${maxRetries})`);
      }
  }
}

// V2 request payment
async function requestPaymentV2(bearerToken, amount, msisdn, reference, retries = 0) {
  const { COUNTRY, CURRENCY, AIRTEL_API_BASE_URL } = process.env;
  const inputBody = {
      reference,
      subscriber: { country: COUNTRY, currency: CURRENCY, msisdn },
      transaction: { amount, country: COUNTRY, currency: CURRENCY, id: uuidv4() }
  };

  // Function to generate AES key and IV
function generateAESKeyAndIV() {
  const key = crypto.randomBytes(32); // 256 bits
  const iv = crypto.randomBytes(16);  // 128 bits
  return { key: key.toString('base64'), iv: iv.toString('base64') };
}

function encryptAES(data, key, iv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'base64'), Buffer.from(iv, 'base64'));
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}
async function fetchRSAPublicKey() {
  const { AIRTEL_API_BASE_URL } = process.env;
  try {
      const response = await axios.get(`${AIRTEL_API_BASE_URL}/v1/rsa/encryption-keys`, {
          headers: {
              'Authorization': `Bearer ${await getBearerToken()}`,
              'X-Country': 'UG', // Or dynamically use values from env
              'X-Currency': 'UGX'
          }
      });

      console.log('Fetching RSA public key...');
      if (response.data && response.data.data) {
          console.log('RSA public key fetched successfully.');
          return response.data.data.key;
      } else {
          throw new Error('RSA public key not found in the response.');
      }
  } catch (error) {
      console.error('Error fetching RSA public key:', error);
      throw error;
  }
}

const { key, iv } = generateAESKeyAndIV();
const encryptedPayload = encryptAES(inputBody, key, iv);
const keyIv = `${key}:${iv}`;
    const rsaPublicKey = await fetchRSAPublicKey(); // Fetch the RSA public key (function to be implemented)
// const rsaPublicKey = process.env.RSA_PUBLIC_KEY;
const encryptedKeyIv = encryptRSA(keyIv, rsaPublicKey);

  console.log(`Attempting payment request (Try: ${retries + 1}/${MAX_RETRIES})...`);
  try {
      const response = await axios.post(`${AIRTEL_API_BASE_URL}/merchant/v2/payments/`, inputBody, {
          headers: {
              'Accept': '*/*',
              'Content-Type': 'application/json',
              'X-Country': COUNTRY,
              'X-Currency': CURRENCY,
              'Authorization': `Bearer ${bearerToken}`,
              'x-signature': encryptedPayload,
              'x-key': encryptedKeyIv
          }
      });
      console.log('Payment request successful:', response.data);
      return response.data;
  } catch (error) {
      if (retries < MAX_RETRIES) {
          console.warn(`Retrying payment request... (${retries + 1}/${MAX_RETRIES})`);
          if(version=="1"){
            return requestPaymentV1(bearerToken, amount, msisdn, reference, retries + 1);        
        }else if (version=="2"){
            return requestPaymentV2(bearerToken, amount, msisdn, reference, retries + 1);        }
          
      }
      console.error('Payment request failed after max retries');
      handleAxiosError('requestPayment', error);
      throw error;
  }
}

function formatKeyToPEM(key) {
  return `-----BEGIN PUBLIC KEY-----\n${key.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
}

// Function to encrypt the key:iv using RSA public key
function encryptRSA(data, publicKey) {
  // const pemKey = formatKeyToPEM(publicKey);
  const pemKey = publicKey
  const buffer = Buffer.from(data, 'utf8');
  const encrypted = crypto.publicEncrypt(
      {
          key: pemKey,
          padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      buffer
  );
  return encrypted.toString('base64');
}

// Implement similarly for polling status
async function pollPaymentStatus(transactionId, maxRetries = DEFAULT_MAX_RETRIES) {
    if (version === '1') {
        return pollPaymentStatusV1(transactionId, maxRetries);
    } else if (version === '2') {
        return pollPaymentStatusV2(transactionId, maxRetries);
    } else {
        throw new Error('Unsupported Airtel API version specified');
    }
}

async function pollPaymentStatusV1(transactionId, maxRetries = DEFAULT_MAX_RETRIES, initialPollingInterval = DEFAULT_POLLING_INTERVAL_MS) {
  const { AIRTEL_API_BASE_URL, COUNTRY, CURRENCY } = process.env;
  let retries = 0;

  while (retries < maxRetries) {
      const bearerToken = await getBearerToken();

      try {
          const response = await axios.get(`${AIRTEL_API_BASE_URL}/standard/v1/payments/${transactionId}`, {
              headers: {
                  'Accept': '*/*',
                  'X-Country': COUNTRY,
                  'X-Currency': CURRENCY,
                  'Authorization': `Bearer ${bearerToken}`
              },
              timeout: process.env.POOLING_TIMEOUT
          });

          console.log('Payment status response:', response.data);

          const transactionData = response.data.data?.transaction;
          const transactionStatus = response.data.status;

          if (transactionData) {
              if (transactionData.status === 'TS') {
                  console.log('Payment completed successfully. Transaction ID:', transactionData.airtel_money_id);
                  return response.data;
              } else if (transactionData.status === 'TF') {
                  console.error('Transaction failed:', transactionData.message || 'No message available');
                  throw new Error(`Transaction failed: ${transactionData.message || 'No message available'}`);
              } else if (transactionData.status === 'TA' || transactionData.status === 'TIP') {
                  console.log('Transaction is still in progress. Checking again...');
              } else {
                  console.warn('Unknown transaction status:', transactionData.status);
              }
          } else if (transactionStatus?.success !== undefined) {
              if (transactionStatus.success) {
                  console.log('Payment completed successfully. Status message:', transactionStatus.message);
                  return response.data;
              } else {
                  console.error('Transaction failed:', transactionStatus.message || 'No message available');
                  throw new Error(`Transaction failed: ${transactionStatus.message || 'No message available'}`);
              }
          } else {
              console.warn('Unexpected response structure, unable to determine transaction status.');
              throw new Error('Unexpected response structure, unable to determine transaction status.');
          }

          const currentPollingInterval = initialPollingInterval * (retries + 1);
          console.log(`Waiting for ${currentPollingInterval / 1000} seconds before the next status check...`);
          await new Promise(resolve => setTimeout(resolve, currentPollingInterval));
          retries++;
      } catch (error) {
          if (++retries >= maxRetries) {
              console.error('Failed to retrieve payment status after max retries');
              throw new Error('Polling for payment status exceeded max retries');
          }
          handleAxiosError('pollPaymentStatus', error);
      }
  }
}
async function pollPaymentStatusV2(reference, retries = 0) {
  const { AIRTEL_API_BASE_URL } = process.env;
  const bearerToken = await getBearerToken();

  while (retries < MAX_RETRIES) {
      try {
          const response = await axios.get(`${AIRTEL_API_BASE_URL}/standard/v1/payments/${reference}`, {
              headers: {
                  'Authorization': `Bearer ${bearerToken}`,
                  'X-Country': process.env.COUNTRY,
                  'X-Currency': process.env.CURRENCY
              },
              timeout: process.env.POOLING_TIMEOUT
          });
          console.log('Payment status response:', response.data);

          const transaction = response.data.data.transaction;
          if (transaction.status === 'TS') {
              console.log('Payment completed successfully. Transaction ID:', transaction.airtel_money_id);
              return response.data;
          } else if (transaction.status === 'TF') {
              console.error('Transaction failed:', transaction.message);
              throw new Error(`Transaction failed: ${transaction.message}`);
          } else if (transaction.status === 'TA' || transaction.status === 'TIP') {
              console.log('Transaction is still in progress. Checking again...');
          } else {
              console.warn('Unknown transaction status:', transaction.status);
          }
      } catch (error) {
          if (retries >= MAX_RETRIES) {
              console.error('Failed to retrieve payment status after max retries',);
              throw new Error('Polling for payment status exceeded max retries');
          }
          console.warn(`Retrying status check... Reference: ${reference} (${retries + 1}/${MAX_RETRIES})`);
      }
      await new Promise(resolve => setTimeout(resolve, DEFAULT_POLLING_INTERVAL_MS));
      retries++;
  }
}



// Initiate payment
async function initiateAirtelPayment(amount, msisdn, reference) {
    console.log('Initiating Airtel payment... Amount:', amount, 'MSISDN:', msisdn, 'Reference:', reference);

    try {
        const bearerToken = await getBearerToken();
        console.log('Bearer token acquired. Proceeding to request payment...');

        const transactionId = uuidv4();
        let paymentResponse;

        if(version=="1"){
            paymentResponse = await requestPaymentV1(bearerToken, amount, msisdn, reference, transactionId);
        }else if (version=="2"){
            paymentResponse = await requestPaymentV2(bearerToken, amount, msisdn, reference, transactionId);
        }
        console.log('Payment process completed successfully.', paymentResponse);

        const paymentStatus = await pollPaymentStatus(transactionId);
        return paymentStatus;
    } catch (error) {
        console.error('Payment initiation error:', error.message);
        throw error;
    }
}

// Error handling function as before
function handleAxiosError(functionName, error) {
    console.error(`Error in ${functionName}:`, error.message);
    if (error.response) {
        console.error('Error Response Data:', error.response.data);
        console.error('Error Response Status:', error.response.status);
        console.error('Error Response Headers:', error.response.headers);
    } else if (error.request) {
        console.error('No response received:', error.request);
    } else {
        console.error('Axios configuration error:', error.message);
    }
}

module.exports = { initiateAirtelPayment };



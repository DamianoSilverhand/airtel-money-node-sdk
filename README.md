# Airtel Money Node SDK

This SDK provides a streamlined integration for Airtel Money payments in Node.js applications, offering both v1 and v2 API versions, token caching, and a retry-based polling mechanism for payment status tracking.

## Features

- **Dual API Version Support**: Seamless support for both API versions (`v1` and `v2`), including version-based request and response handling.
- **Bearer Token Caching**: Implements token caching to optimize API requests and reduce load on authentication services.
- **AES and RSA Encryption**: Utilizes AES for data encryption and RSA for secure key exchange in v2 API.
- **Retry Mechanism**: Includes configurable retry and timeout settings for polling payment status.

## Prerequisites

- Node.js (>= 14.x)
- NPM or Yarn
- Airtel Money API access (sandbox or production)

## Installation

Install the package in your Node.js project:

```bash
npm install airtel-money-node-sdk
```

## Configuration

Create a `.env` file at your project root and add the following variables:

```bash
# Airtel API Credentials and Configuration
CLIENT_ID=<your_client_id>
CLIENT_SECRET=<your_client_secret>
GRANT_TYPE=client_credentials
AIRTEL_API_BASE_URL=<your_airtel_api_base_url>
COUNTRY=<country_code>
CURRENCY=<currency_code>
AIRTEL_API_VERSION=1              # Set to '1' or '2' based on your API version

# Timeout and Retry Configuration
POOLING_TIMEOUT=30000             # Timeout for API requests (in ms)
DEFAULT_POLLING_INTERVAL_MS=5000  # Interval for polling payment status (in ms)
DEFAULT_MAX_RETRIES=5             # Maximum retries for polling
```

## Usage

### 1. Initialize Payment

To start a payment, call the `initiateAirtelPayment` function with the payment amount, recipient's phone number, and a reference.

```javascript
const { initiateAirtelPayment } = require('airtel-money-node-sdk');

async function makePayment() {
    try {
        const amount = '100.00';
        const msisdn = '977XXXXXX';  // Recipient's phone number without country code
        const reference = 'Invoice #12345';  // Reference for the payment

        const paymentStatus = await initiateAirtelPayment(amount, msisdn, reference);
        console.log('Final Payment Status:', paymentStatus);
    } catch (error) {
        console.error('Payment initiation failed:', error.message);
    }
}

makePayment();
```

### 2. Request Payment (v1 and v2)

The SDK handles both v1 and v2 requests internally based on the specified `AIRTEL_API_VERSION`.

### 3. Polling Payment Status

The SDK includes a retry-based polling mechanism for v1 and v2 payment statuses, configurable with `DEFAULT_MAX_RETRIES` and `DEFAULT_POLLING_INTERVAL_MS` in `.env`.

## Error Handling

All errors during API requests are logged in detail, with full response data, headers, and status. The SDK retries requests up to the maximum retry count.

## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue for any improvements or suggestions.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

--- 
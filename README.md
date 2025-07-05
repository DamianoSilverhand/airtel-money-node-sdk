# Airtel Money Node SDK

This SDK provides a streamlined integration for Airtel Money payments in Node.js applications, offering both v1 and v2 API versions, token caching, and a retry-based polling mechanism for payment status tracking.

## Features

- **Dual API Version Support**: Seamless support for both API versions (`v1` and `v2`), including version-based request and response handling.
- **Bearer Token Caching**: Implements token caching to optimize API requests and reduce load on authentication services.
- **AES and RSA Encryption**: Utilizes AES for data encryption and RSA for secure key exchange in v2 API.
- **Retry Mechanism**: Includes configurable retry and timeout settings for polling payment status.
- **Comprehensive Error Handling**: Detailed error logging with full response data, headers, and status codes.

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

1. Copy the `env.example` file to `.env`:
```bash
cp env.example .env
```

2. Update the `.env` file with your actual values:

```bash
# Airtel API Configuration
AIRTEL_API_BASE_URL=https://openapiuat.airtel.africa  # Sandbox URL
# AIRTEL_API_BASE_URL=https://openapi.airtel.africa   # Production URL

# OAuth2 Credentials
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here
GRANT_TYPE=client_credentials

# Country and Currency Configuration
COUNTRY=UG
CURRENCY=UGX

# API Version (1 or 2)
AIRTEL_API_VERSION=1

# Polling and Retry Configuration
DEFAULT_MAX_RETRIES=5
DEFAULT_POLLING_INTERVAL_MS=5000
POLLING_TIMEOUT=30000
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
        
        // paymentStatus will contain:
        // { status: 'SUCCESS' | 'FAILED', data: responseData }
        
    } catch (error) {
        console.error('Payment initiation failed:', error.message);
    }
}

makePayment();
```

### 2. API Version Support

The SDK automatically handles both v1 and v2 API requests based on the `AIRTEL_API_VERSION` environment variable:

- **V1 API**: Simple JSON payload with direct transaction ID usage
- **V2 API**: Encrypted payload using AES-256-CBC encryption with RSA key exchange

### 3. Payment Status Polling

The SDK includes an intelligent polling mechanism that:
- Automatically polls payment status based on the configured `DEFAULT_MAX_RETRIES` and `DEFAULT_POLLING_INTERVAL_MS`
- Uses exponential backoff (interval increases with each retry)
- Returns final status: `SUCCESS` (TS), `FAILED` (TF), or throws error on timeout

### 4. Bearer Token Management

The SDK automatically:
- Caches bearer tokens until expiry (minus 60-second buffer)
- Refreshes tokens when needed
- Handles OAuth2 authentication seamlessly

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AIRTEL_API_BASE_URL` | Airtel API base URL | - | Yes |
| `CLIENT_ID` | OAuth2 client ID | - | Yes |
| `CLIENT_SECRET` | OAuth2 client secret | - | Yes |
| `GRANT_TYPE` | OAuth2 grant type | `client_credentials` | Yes |
| `COUNTRY` | Country code (e.g., UG) | - | Yes |
| `CURRENCY` | Currency code (e.g., UGX) | - | Yes |
| `AIRTEL_API_VERSION` | API version (1 or 2) | `1` | No |
| `DEFAULT_MAX_RETRIES` | Maximum polling retries | `5` | No |
| `DEFAULT_POLLING_INTERVAL_MS` | Base polling interval (ms) | `5000` | No |
| `POLLING_TIMEOUT` | API request timeout (ms) | `30000` | No |
| `RSA_PUBLIC_KEY` | API v2 RSA public key | Your Public Key | Yes |

## Error Handling

The SDK provides comprehensive error handling:
- All API errors are logged with full response details
- Automatic retry mechanism for failed requests
- Detailed error messages for debugging
- Graceful handling of network timeouts

## API Endpoints

The SDK interacts with the following Airtel Money API endpoints:

- **Authentication**: `POST /auth/oauth2/token`
- **V1 Payments**: `POST /merchant/v1/payments/`
- **V2 Payments**: `POST /merchant/v2/payments/`
- **V1 Status**: `GET /standard/v1/payments/{transactionId}`
- **V2 Status**: `GET /standard/v1/payments/{reference}`
- **RSA Keys**: `GET /v1/rsa/encryption-keys` (V2 only)

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](./CONTRIBUTING.md) file for detailed guidelines before submitting a pull request or opening an issue.

## License

This project is licensed under the MIT License. See the LICENSE file for details. 
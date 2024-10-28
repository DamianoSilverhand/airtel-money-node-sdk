# Airtel Money SDK

A Node.js SDK for integrating with Airtel Money API, allowing you to easily request payments through Airtel's payment gateway.

## Installation

Install the package using npm:

```bash
npm install airtel-money-sdk --save
```

## Setup

Create a `.env` file in the root of your project and add your Airtel Money API credentials:

```env
# Airtel Money API Credentials
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
GRANT_TYPE=client_credentials

# Airtel Money API Base URL
AIRTEL_API_BASE_URL=https://openapiuat.airtel.africa

# Payment Details
COUNTRY=UG
CURRENCY=UGX
```

Replace the placeholder values (`your_client_id`, `your_client_secret`) with your actual credentials.

## Usage

Import the SDK and use it to initiate a payment:

```javascript
const { initiateAirtelPayment } = require('airtel-money-sdk');

async function processPayment() {
    try {
        const amount = 1000; // Amount to be charged
        const msisdn = '1234567890'; // Subscriber's phone number
        const reference = 'Payment for Order 12345'; // Payment reference

        const response = await initiateAirtelPayment(amount, msisdn, reference);
        console.log('Payment Response:', response);
    } catch (error) {
        console.error('Error processing payment:', error.message);
    }
}

// Execute the payment process
processPayment();
```

## API Methods

### `initiateAirtelPayment(amount, msisdn, reference)`

This function initiates a payment request to Airtel Money.

- **Parameters:**
  - `amount` (number): The amount to charge the subscriber.
  - `msisdn` (string): The subscriber's MSISDN (phone number).
  - `reference` (string): A reference string for the transaction.

- **Returns:**
  - A promise that resolves to the payment response object from Airtel Money API.

## Error Handling

Errors during the API calls are caught and logged to the console. The SDK will throw an error if the payment request fails, so make sure to handle these errors appropriately in your application.

## Environment Variables

The SDK relies on environment variables for configuration:

- `CLIENT_ID`: Your Airtel Money client ID.
- `CLIENT_SECRET`: Your Airtel Money client secret.
- `GRANT_TYPE`: The grant type for authentication, typically `client_credentials`.
- `AIRTEL_API_BASE_URL`: The base URL for the Airtel Money API.
- `COUNTRY`: The country code (e.g., `UG` for Uganda).
- `CURRENCY`: The currency code (e.g., `UGX` for Ugandan Shillings).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on the [GitHub repository](https://github.com/yourusername/airtel-money-sdk).

## Support

For support, please raise an issue on the [GitHub repository](https://github.com/yourusername/airtel-money-sdk).

## Official Documentation

For more information on the Airtel Money API, please refer to the [official Airtel Money developer documentation](https://developer.airtel.africa).
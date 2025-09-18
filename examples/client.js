// Example client implementation for the M-Pesa Payment Gateway
import axios from 'axios';

class MpesaGatewayClient {
  private baseURL: string;
  private apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  /**
   * Initiate a payment
   */
  async initiatePayment(paymentData: {
    amount: number;
    phoneNumber: string;
    accountReference: string;
    transactionDesc: string;
  }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/v1/payments/initiate`,
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Payment initiation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Query payment status
   */
  async queryPaymentStatus(checkoutRequestId: string) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/payments/status/${checkoutRequestId}`,
        {
          headers: {
            'x-api-key': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Status query failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Check gateway health
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/api/v1/payments/health`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Health check failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Example usage
async function example() {
  const client = new MpesaGatewayClient(
    'http://localhost:3000',
    'your-api-key-here'
  );

  try {
    // Check if gateway is healthy
    const health = await client.checkHealth();
    console.log('Gateway Status:', health);

    // Initiate payment
    const payment = await client.initiatePayment({
      amount: 100,
      phoneNumber: '254712345678',
      accountReference: 'ORDER123',
      transactionDesc: 'Test Payment'
    });

    console.log('Payment initiated:', payment);

    // Wait a moment and check status
    setTimeout(async () => {
      try {
        const status = await client.queryPaymentStatus(payment.data.checkoutRequestId);
        console.log('Payment status:', status);
      } catch (error) {
        console.error('Status query error:', error);
      }
    }, 5000);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment to run example
// example();

export default MpesaGatewayClient;

# M-Pesa Payment Gateway

A secure and robust payment gateway for M-Pesa transactions using the Daraja API, built with Node.js and TypeScript.

## Features

- ✅ **Secure M-Pesa Integration**: Complete STK Push implementation
- ✅ **TypeScript**: Full type safety and modern development experience
- ✅ **Security**: API key authentication, rate limiting, request validation
- ✅ **Logging**: Comprehensive logging with Winston
- ✅ **Error Handling**: Robust error handling and validation
- ✅ **Encryption**: Sensitive data encryption utilities
- ✅ **Production Ready**: Environment configuration and health checks

## API Endpoints

### Authentication

All endpoints (except callbacks and health check) require an API key in the `x-api-key` header.

### Core Endpoints

#### 1. Initiate Payment

```http
POST /api/v1/payments/initiate
Content-Type: application/json
x-api-key: your-api-key

{
  "amount": 100,
  "phoneNumber": "254712345678",
  "accountReference": "ORDER123",
  "transactionDesc": "Payment"
}
```

#### 2. Query Payment Status

```http
GET /api/v1/payments/status/{checkoutRequestId}
x-api-key: your-api-key
```

#### 3. Health Check

```http
GET /api/v1/payments/health
```

#### 4. STK Callback (M-Pesa only)

```http
POST /api/v1/payments/callback/stk
```

## Installation & Setup

### 1. Clone and Install

```bash
git clone <your-repo>
cd payment-gateway
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required Environment Variables:**

- `MPESA_CONSUMER_KEY`: Your Daraja app consumer key
- `MPESA_CONSUMER_SECRET`: Your Daraja app consumer secret
- `MPESA_BUSINESS_SHORT_CODE`: Your business short code
- `MPESA_PASSKEY`: Your STK Push passkey
- `API_KEY`: Your gateway API key (generate a secure random string)

### 3. Development

```bash
npm run dev
```

### 4. Production Build

```bash
npm run build
npm start
```

## Security Features

### 1. API Key Authentication

- All payment endpoints require API key authentication
- Keys should be at least 32 characters long

### 2. Rate Limiting

- **General endpoints**: 100 requests per 15 minutes
- **Payment endpoints**: 5 requests per minute per IP+phone combination

### 3. Input Validation

- Phone number format validation (Kenyan numbers)
- Amount limits (1-70,000 KES)
- Account reference and description length limits
- Comprehensive request sanitization

### 4. Security Headers

- Helmet.js for security headers
- CORS configuration
- Content Security Policy

### 5. Encryption

- Sensitive data encryption utilities
- Webhook signature verification
- Secure random generation

## Configuration

### M-Pesa Environment

- **Sandbox**: For testing (`MPESA_ENVIRONMENT=sandbox`)
- **Production**: For live transactions (`MPESA_ENVIRONMENT=production`)

### Rate Limiting

Configurable via environment variables:

- `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window

### Logging

- **Development**: Console + file logging
- **Production**: File logging only
- Configurable log levels and file paths

## Error Handling

The gateway includes comprehensive error handling:

- **400**: Validation errors, bad requests
- **401**: Authentication failures
- **429**: Rate limit exceeded
- **404**: Route not found
- **500**: Internal server errors

All errors are logged with detailed context for debugging.

## Webhook Integration

### STK Push Callbacks

M-Pesa sends transaction status updates to:

```
POST {CALLBACK_BASE_URL}/stk-callback
```

The gateway processes these callbacks and you can extend the `handleSTKCallback` method to:

- Update your database
- Send notifications
- Trigger webhooks to your frontend

### Custom Webhooks

You can extend the callback handler to send webhooks to your application:

```typescript
// In PaymentController.handleSTKCallback
const transactionStatus = this.mpesaService.processSTKCallback(callbackData);

// Send webhook to your application
await this.sendWebhook(transactionStatus);
```

## Testing

### Unit Tests

```bash
npm test
```

### Test with Sandbox

1. Set `MPESA_ENVIRONMENT=sandbox`
2. Use sandbox credentials from Daraja
3. Test phone number: `254708374149`

## Production Deployment

### 1. Security Checklist

- [ ] Change all default secrets and keys
- [ ] Use strong API keys (32+ characters)
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS
- [ ] Set up proper logging and monitoring

### 2. Environment Variables

Ensure all production environment variables are set:

- Strong `JWT_SECRET`
- Strong `ENCRYPTION_KEY`
- Strong `API_KEY`
- Strong `WEBHOOK_SECRET`
- Production M-Pesa credentials

### 3. Monitoring

- Set up log monitoring
- Monitor rate limit metrics
- Set up health check monitoring
- Monitor transaction success rates

## API Response Format

All endpoints return responses in this format:

```json
{
  "success": true|false,
  "data": {}, // Response data (if any)
  "message": "Response message",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "errors": [] // Validation errors (if any)
}
```

## Support

For support with this payment gateway:

1. Check the logs in `logs/app.log`
2. Verify your M-Pesa credentials
3. Test with sandbox environment first
4. Check M-Pesa Daraja documentation

## License

MIT License - see LICENSE file for details.

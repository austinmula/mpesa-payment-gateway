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

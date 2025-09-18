import { Router } from 'express';
import { body, param } from 'express-validator';
import { PaymentController } from '../controllers/payment.controller';
import { 
  authenticateApiKey, 
  paymentRateLimiter, 
  rateLimiter 
} from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const paymentController = new PaymentController();

/**
 * Payment initiation validation rules
 */
const paymentValidationRules = [
  body('amount')
    .isNumeric()
    .isFloat({ min: 1, max: 70000 })
    .withMessage('Amount must be between 1 and 70,000 KES'),
  
  body('phoneNumber')
    .matches(/^(254|0)[17][0-9]{8}$/)
    .withMessage('Phone number must be a valid Kenyan number (254XXXXXXXXX or 0XXXXXXXXX)'),
  
  body('accountReference')
    .isLength({ min: 1, max: 12 })
    .isAlphanumeric()
    .withMessage('Account reference must be 1-12 alphanumeric characters'),
  
  body('transactionDesc')
    .isLength({ min: 1, max: 13 })
    .withMessage('Transaction description must be 1-13 characters')
];

/**
 * Payment status query validation rules
 */
const statusQueryValidationRules = [
  param('checkoutRequestId')
    .notEmpty()
    .withMessage('Checkout request ID is required')
];

/**
 * @route   POST /api/v1/payments/initiate
 * @desc    Initiate M-Pesa payment
 * @access  Private (API Key required)
 */
router.post('/initiate',
  rateLimiter,
  paymentRateLimiter,
  authenticateApiKey,
  paymentValidationRules,
  validateRequest,
  asyncHandler(paymentController.initiatePayment.bind(paymentController))
);

/**
 * @route   GET /api/v1/payments/status/:checkoutRequestId
 * @desc    Query payment status
 * @access  Private (API Key required)
 */
router.get('/status/:checkoutRequestId',
  rateLimiter,
  authenticateApiKey,
  statusQueryValidationRules,
  validateRequest,
  asyncHandler(paymentController.queryPaymentStatus.bind(paymentController))
);

/**
 * @route   POST /api/v1/payments/callback/stk
 * @desc    Handle STK Push callback from M-Pesa
 * @access  Public (M-Pesa callback)
 */
router.post('/callback/stk',
  asyncHandler(paymentController.handleSTKCallback.bind(paymentController))
);

/**
 * @route   GET /api/v1/payments/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health',
  asyncHandler(paymentController.healthCheck.bind(paymentController))
);

export default router;

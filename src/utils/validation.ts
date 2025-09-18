import Joi from 'joi';

/**
 * Phone number validation schema
 */
export const phoneNumberSchema = Joi.string()
  .pattern(/^254[0-9]{9}$/)
  .required()
  .messages({
    'string.pattern.base': 'Phone number must be in format 254XXXXXXXXX',
    'any.required': 'Phone number is required'
  });

/**
 * Amount validation schema
 */
export const amountSchema = Joi.number()
  .min(1)
  .max(70000)
  .precision(2)
  .required()
  .messages({
    'number.min': 'Amount must be at least 1 KES',
    'number.max': 'Amount cannot exceed 70,000 KES',
    'any.required': 'Amount is required'
  });

/**
 * Payment request validation schema
 */
export const paymentRequestSchema = Joi.object({
  amount: amountSchema,
  phoneNumber: phoneNumberSchema,
  accountReference: Joi.string()
    .min(1)
    .max(12)
    .alphanum()
    .required()
    .messages({
      'string.min': 'Account reference must be at least 1 character',
      'string.max': 'Account reference cannot exceed 12 characters',
      'string.alphanum': 'Account reference must be alphanumeric',
      'any.required': 'Account reference is required'
    }),
  transactionDesc: Joi.string()
    .min(1)
    .max(13)
    .required()
    .messages({
      'string.min': 'Transaction description must be at least 1 character',
      'string.max': 'Transaction description cannot exceed 13 characters',
      'any.required': 'Transaction description is required'
    })
});

/**
 * Query transaction validation schema
 */
export const queryTransactionSchema = Joi.object({
  checkoutRequestId: Joi.string()
    .required()
    .messages({
      'any.required': 'Checkout request ID is required'
    })
});

/**
 * Validate phone number format
 */
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  // Remove any spaces, dashes, or plus signs
  const cleaned = phoneNumber.replace(/[\s\-\+]/g, '');
  
  // Check if it's a valid Kenyan phone number
  const kenyanPhoneRegex = /^(254|0)[17][0-9]{8}$/;
  
  return kenyanPhoneRegex.test(cleaned);
};

/**
 * Format phone number to standard format (254XXXXXXXXX)
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove any spaces, dashes, or plus signs
  let cleaned = phoneNumber.replace(/[\s\-\+]/g, '');
  
  // Convert 07XXXXXXXX to 254XXXXXXXXX
  if (cleaned.startsWith('07') || cleaned.startsWith('01')) {
    cleaned = '254' + cleaned.substring(1);
  }
  
  // Ensure it starts with 254
  if (!cleaned.startsWith('254')) {
    throw new Error('Invalid phone number format');
  }
  
  return cleaned;
};

/**
 * Validate amount
 */
export const validateAmount = (amount: number): boolean => {
  return amount >= 1 && amount <= 70000 && Number.isFinite(amount);
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[^\w\s\-_.]/g, '');
};

/**
 * Validate API key format
 */
export const validateApiKey = (apiKey: string): boolean => {
  return typeof apiKey === 'string' && apiKey.length >= 32;
};

/**
 * Check if string is valid UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

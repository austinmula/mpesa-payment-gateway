import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MpesaService } from '../services/mpesa.service';
import { logger } from '../utils/logger';
import { formatPhoneNumber } from '../utils/validation';
import { ApiResponse } from '../types/api.types';
import { PaymentRequest, PaymentResponse, TransactionStatus } from '../types/mpesa.types';
import { ApiError } from '../middleware/error.middleware';

export class PaymentController {
  private mpesaService: MpesaService;

  constructor() {
    this.mpesaService = new MpesaService();
  }

  /**
   * Initiate payment
   */
  async initiatePayment(req: Request, res: Response): Promise<void> {
    try {
      const { amount, phoneNumber, accountReference, transactionDesc } = req.body;

      // Format phone number
      const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

      const paymentRequest: PaymentRequest = {
        amount: parseFloat(amount),
        phoneNumber: formattedPhoneNumber,
        accountReference,
        transactionDesc
      };

      logger.info('Payment initiation request', {
        requestId: uuidv4(),
        phoneNumber: formattedPhoneNumber,
        amount: paymentRequest.amount,
        accountReference,
        ip: req.ip
      });

      const result: PaymentResponse = await this.mpesaService.initiateSTKPush(paymentRequest);

      const response: ApiResponse<PaymentResponse> = {
        success: result.success,
        data: result,
        message: result.message,
        timestamp: new Date().toISOString()
      };

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(response);

    } catch (error: any) {
      logger.error('Payment initiation error', {
        error: error.message,
        phoneNumber: req.body?.phoneNumber,
        amount: req.body?.amount,
        ip: req.ip
      });

      throw new ApiError(error.message || 'Payment initiation failed', 500);
    }
  }

  /**
   * Query payment status
   */
  async queryPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { checkoutRequestId } = req.params;

      if (!checkoutRequestId) {
        throw new ApiError('Checkout request ID is required', 400);
      }

      logger.info('Payment status query request', {
        checkoutRequestId,
        ip: req.ip
      });

      const status: TransactionStatus = await this.mpesaService.querySTKPushStatus(checkoutRequestId);

      const response: ApiResponse<TransactionStatus> = {
        success: true,
        data: status,
        message: 'Payment status retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);

    } catch (error: any) {
      logger.error('Payment status query error', {
        error: error.message,
        checkoutRequestId: req.params?.checkoutRequestId,
        ip: req.ip
      });

      throw new ApiError(error.message || 'Failed to query payment status', 500);
    }
  }

  /**
   * Handle STK Push callback
   */
  async handleSTKCallback(req: Request, res: Response): Promise<void> {
    try {
      const callbackData = req.body;

      logger.info('STK callback received', {
        callbackData: JSON.stringify(callbackData),
        ip: req.ip
      });

      const transactionStatus: TransactionStatus = this.mpesaService.processSTKCallback(callbackData);

      // Here you can add logic to:
      // 1. Update your database with transaction status
      // 2. Send notifications to your application
      // 3. Trigger webhooks to your frontend/other services
      
      logger.info('STK callback processed successfully', {
        transactionId: transactionStatus.transactionId,
        status: transactionStatus.status,
        amount: transactionStatus.amount
      });

      // M-Pesa expects a 200 response
      res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Accepted'
      });

    } catch (error: any) {
      logger.error('STK callback processing error', {
        error: error.message,
        callbackData: req.body,
        ip: req.ip
      });

      // Still return 200 to M-Pesa to avoid retries
      res.status(200).json({
        ResultCode: 1,
        ResultDesc: 'Failed'
      });
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const response: ApiResponse = {
        success: true,
        message: 'Payment gateway is healthy',
        timestamp: new Date().toISOString(),
        data: {
          status: 'UP',
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0'
        }
      };

      res.status(200).json(response);
    } catch (error: any) {
      throw new ApiError('Health check failed', 500);
    }
  }
}

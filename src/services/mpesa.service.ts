import axios, { AxiosInstance, AxiosResponse } from "axios";
import moment from "moment";
import { config } from "../config";
import { logger } from "../utils/logger";
import { encrypt, decrypt } from "../utils/encryption";
import {
  MpesaConfig,
  STKPushRequest,
  STKPushResponse,
  STKPushCallback,
  AccessTokenResponse,
  QuerySTKResponse,
  TransactionStatus,
  PaymentRequest,
  PaymentResponse,
} from "../types/mpesa.types";

export class MpesaService {
  private axiosInstance: AxiosInstance;
  private accessToken: string = "";
  private tokenExpiry: Date = new Date();
  private config: MpesaConfig;

  constructor() {
    this.config = {
      consumerKey: config.mpesa.consumerKey,
      consumerSecret: config.mpesa.consumerSecret,
      businessShortCode: config.mpesa.businessShortCode,
      passkey: config.mpesa.passkey,
      environment: config.mpesa.environment,
      callbackBaseUrl: config.mpesa.callbackBaseUrl,
    };

    this.axiosInstance = axios.create({
      baseURL: config.mpesa.baseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.info("M-Pesa API Request", {
          method: config.method,
          url: config.url,
          headers: config.headers,
        });
        return config;
      },
      (error) => {
        logger.error("M-Pesa API Request Error", error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.info("M-Pesa API Response", {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error("M-Pesa API Response Error", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    try {
      // Check if current token is still valid
      if (this.accessToken && this.tokenExpiry > new Date()) {
        return this.accessToken;
      }

      const credentials = Buffer.from(
        `${this.config.consumerKey}:${this.config.consumerSecret}`
      ).toString("base64");

      const response: AxiosResponse<AccessTokenResponse> =
        await this.axiosInstance.get(
          "/oauth/v1/generate?grant_type=client_credentials",
          {
            headers: {
              Authorization: `Basic ${credentials}`,
            },
          }
        );

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Token expires in 1 hour, set expiry to 55 minutes to be safe
        this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);

        logger.info("Access token obtained successfully", {
          expiresIn: response.data.expires_in,
        });

        return this.accessToken;
      } else {
        throw new Error("Failed to obtain access token");
      }
    } catch (error: any) {
      logger.error("Failed to get access token", error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Generate password for STK Push
   */
  private generatePassword(): { password: string; timestamp: string } {
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(
      `${this.config.businessShortCode}${this.config.passkey}${timestamp}`
    ).toString("base64");

    return { password, timestamp };
  }

  /**
   * Initiate STK Push payment
   */
  async initiateSTKPush(
    paymentRequest: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      const stkPushData: STKPushRequest = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: paymentRequest.amount,
        PartyA: paymentRequest.phoneNumber,
        PartyB: this.config.businessShortCode,
        PhoneNumber: paymentRequest.phoneNumber,
        CallBackURL: `${this.config.callbackBaseUrl}/stk-callback`,
        AccountReference: paymentRequest.accountReference,
        TransactionDesc: paymentRequest.transactionDesc,
      };

      logger.info("Initiating STK Push", {
        phoneNumber: paymentRequest.phoneNumber,
        amount: paymentRequest.amount,
        accountReference: paymentRequest.accountReference,
      });

      const response: AxiosResponse<STKPushResponse> =
        await this.axiosInstance.post(
          "/mpesa/stkpush/v1/processrequest",
          stkPushData,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

      const responseData = response.data;

      if (responseData.ResponseCode === "0") {
        logger.info("STK Push initiated successfully", {
          merchantRequestId: responseData.MerchantRequestID,
          checkoutRequestId: responseData.CheckoutRequestID,
        });

        return {
          success: true,
          transactionId: responseData.MerchantRequestID,
          checkoutRequestId: responseData.CheckoutRequestID,
          message: "Payment request sent successfully",
          customerMessage: responseData.CustomerMessage,
        };
      } else {
        logger.error("STK Push failed", {
          responseCode: responseData.ResponseCode,
          responseDescription: responseData.ResponseDescription,
        });

        return {
          success: false,
          transactionId: responseData.MerchantRequestID || "",
          checkoutRequestId: responseData.CheckoutRequestID || "",
          message: responseData.ResponseDescription || "Payment request failed",
        };
      }
    } catch (error: any) {
      logger.error("STK Push error", error);
      throw new Error(`Payment initiation failed: ${error.message}`);
    }
  }

  /**
   * Query STK Push status
   */
  async querySTKPushStatus(
    checkoutRequestId: string
  ): Promise<TransactionStatus> {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      const queryData = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      const response: AxiosResponse<QuerySTKResponse> =
        await this.axiosInstance.post(
          "/mpesa/stkpushquery/v1/query",
          queryData,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

      const responseData = response.data;

      let status: "pending" | "success" | "failed" | "cancelled" = "pending";

      if (responseData.ResultCode === "0") {
        status = "success";
      } else if (responseData.ResultCode === "1032") {
        status = "cancelled";
      } else if (responseData.ResultCode === "1") {
        status = "failed";
      }

      return {
        transactionId: responseData.MerchantRequestID,
        status,
        amount: 0, // Amount not returned in query response
        phoneNumber: "", // Phone number not returned in query response
        errorMessage:
          status !== "success" ? responseData.ResultDesc : undefined,
      };
    } catch (error: any) {
      logger.error("Query STK Push status error", error);
      throw new Error(`Status query failed: ${error.message}`);
    }
  }

  /**
   * Process STK Push callback
   */
  processSTKCallback(callbackData: STKPushCallback): TransactionStatus {
    try {
      const callback = callbackData.Body.stkCallback;

      logger.info("Processing STK callback", {
        merchantRequestId: callback.MerchantRequestID,
        checkoutRequestId: callback.CheckoutRequestID,
        resultCode: callback.ResultCode,
      });

      let status: "pending" | "success" | "failed" | "cancelled" = "failed";
      let amount = 0;
      let phoneNumber = "";
      let mpesaReceiptNumber = "";
      let transactionDate = "";

      if (callback.ResultCode === 0) {
        status = "success";

        // Extract metadata if available
        if (callback.CallbackMetadata?.Item) {
          for (const item of callback.CallbackMetadata.Item) {
            switch (item.Name) {
              case "Amount":
                amount = Number(item.Value);
                break;
              case "PhoneNumber":
                phoneNumber = String(item.Value);
                break;
              case "MpesaReceiptNumber":
                mpesaReceiptNumber = String(item.Value);
                break;
              case "TransactionDate":
                transactionDate = String(item.Value);
                break;
            }
          }
        }
      } else if (callback.ResultCode === 1032) {
        status = "cancelled";
      }

      const transactionStatus: TransactionStatus = {
        transactionId: callback.MerchantRequestID,
        status,
        amount,
        phoneNumber,
        mpesaReceiptNumber:
          status === "success" ? mpesaReceiptNumber : undefined,
        transactionDate: status === "success" ? transactionDate : undefined,
        errorMessage: status !== "success" ? callback.ResultDesc : undefined,
      };

      logger.info("STK callback processed", transactionStatus);

      return transactionStatus;
    } catch (error: any) {
      logger.error("Error processing STK callback", error);
      throw new Error(`Callback processing failed: ${error.message}`);
    }
  }
}

export interface OtpSendResult {
  success: boolean;
  message?: string;
  error?: string;
  expiresInSeconds?: number;
}

export interface OtpVerifyResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface OtpProvider {
  sendOtp(phone: string): Promise<OtpSendResult>;
  verifyOtp(phone: string, code: string): Promise<OtpVerifyResult>;
}

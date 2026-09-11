import { OtpProvider } from '@/domain/auth/otp-provider';
import { DevOtpProvider } from './dev-otp-provider';
import { StagingOtpProvider } from '@/domain/auth/staging-otp-provider';
import { getEnv } from '@/lib/env';

export function getActiveOtpProvider(): OtpProvider {
  const env = getEnv();

  if (env.AUTH_MODE === 'staging_gate') {
    return new StagingOtpProvider();
  }

  if (env.AUTH_MODE === 'dev_otp') {
    if (env.NODE_ENV === 'production') {
      throw new Error('SECURITY VIOLATION: dev_otp AUTH_MODE cannot be used when NODE_ENV=production!');
    }
    return new DevOtpProvider();
  }

  throw new Error('UNSUPPORTED_AUTH_MODE: ' + env.AUTH_MODE + ' is not supported on this environment.');
}

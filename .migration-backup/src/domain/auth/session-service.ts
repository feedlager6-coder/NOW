import crypto from 'crypto';

export interface CookieOptions {
  name: string;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  path: string;
  expires: Date;
}

export class SessionService {
  public static readonly COOKIE_NAME = 'now_session';
  public static readonly SESSION_DURATION_DAYS = 30;

  public static computePhoneLookupHash(normalizedPhone: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(normalizedPhone.trim()).digest('hex');
  }

  public static generateSessionToken(): { rawToken: string; tokenHash: string } {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, tokenHash };
  }

  public static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
  }

  public static getSessionCookieOptions(expiresAt: Date): CookieOptions {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      name: SessionService.COOKIE_NAME,
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      expires: expiresAt,
    };
  }

  public static calculateExpirationDate(): Date {
    return new Date(Date.now() + SessionService.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  }
}

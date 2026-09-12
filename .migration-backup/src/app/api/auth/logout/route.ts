import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionService } from '@/domain/auth/session-service';
import { UserRepository } from '@/repositories/user-repository';
import { clearSessionCookie } from '@/lib/auth-session';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = cookies();
    const rawToken = cookieStore.get(SessionService.COOKIE_NAME)?.value;

    if (rawToken) {
      const tokenHash = SessionService.hashToken(rawToken);
      await UserRepository.revokeSession(tokenHash, true);
    }

    const response = NextResponse.json({ success: true, message: 'Сессия завершена' });
    clearSessionCookie(response);

    logger.info('user_logged_out');
    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('logout_failure', { details: { error: errorMsg } });
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    return response;
  }
}

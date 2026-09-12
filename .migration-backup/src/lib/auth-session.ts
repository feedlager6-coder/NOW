import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SessionService } from '@/domain/auth/session-service';
import { UserRepository, UserSessionData } from '@/repositories/user-repository';

export async function getCurrentUserSession(): Promise<UserSessionData | null> {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get(SessionService.COOKIE_NAME)?.value;
    if (!sessionToken) {
      return null;
    }

    const tokenHash = SessionService.hashToken(sessionToken);
    return await UserRepository.findSessionByTokenHash(tokenHash);
  } catch {
    return null;
  }
}

export function setSessionCookie(
  response: NextResponse,
  rawToken: string,
  expiresAt: Date
): void {
  const options = SessionService.getSessionCookieOptions(expiresAt);
  response.cookies.set({
    name: options.name,
    value: rawToken,
    httpOnly: options.httpOnly,
    sameSite: options.sameSite,
    secure: options.secure,
    path: options.path,
    expires: options.expires,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SessionService.COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
}

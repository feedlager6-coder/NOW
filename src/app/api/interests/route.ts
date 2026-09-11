import { NextResponse } from 'next/server';
import { WHITELIST_INTERESTS } from '@/domain/profile/interest-catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    interests: WHITELIST_INTERESTS,
  });
}

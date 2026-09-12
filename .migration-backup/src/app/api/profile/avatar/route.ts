import { NextResponse } from 'next/server';
import { getCurrentUserSession } from '@/lib/auth-session';
import { UserRepository } from '@/repositories/user-repository';
import { avatarStorageProvider } from '@/infrastructure/storage/avatar-storage-provider';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const sessionData = await getCurrentUserSession();
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Требуется авторизация.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'NO_FILE', message: 'Файл не прикреплён.' },
        { status: 400 }
      );
    }

    // Size check
    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'FILE_TOO_LARGE', message: 'Размер файла не должен превышать 3 МБ.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await avatarStorageProvider.uploadAvatar(
      sessionData.user.id,
      buffer,
      file.type
    );

    if (!uploadResult.success || !uploadResult.avatarUrl) {
      return NextResponse.json(
        { success: false, error: 'UPLOAD_FAILED', message: uploadResult.error || 'Ошибка загрузки файла.' },
        { status: 400 }
      );
    }

    // Save avatar_ref to profile
    await UserRepository.saveProfile({
      userId: sessionData.user.id,
      displayName: sessionData.profile?.displayName || 'Участник',
      avatarRef: uploadResult.avatarUrl,
    });

    logger.info('user_avatar_uploaded', {
      actorId: sessionData.user.id,
      resourceType: 'profile',
      details: { mime: file.type, sizeBytes: file.size },
    });

    return NextResponse.json({
      success: true,
      avatarRef: uploadResult.avatarUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('avatar_upload_error', { details: { error: msg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const sessionData = await getCurrentUserSession();
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Требуется авторизация.' },
        { status: 401 }
      );
    }

    const currentAvatar = sessionData.profile?.avatarRef;
    if (currentAvatar && currentAvatar.startsWith('/uploads/')) {
      await avatarStorageProvider.deleteAvatar(currentAvatar);
    }

    const defaultSilhouette = '/avatars/silhouette-1.svg';

    await UserRepository.saveProfile({
      userId: sessionData.user.id,
      displayName: sessionData.profile?.displayName || 'Участник',
      avatarRef: defaultSilhouette,
    });

    logger.info('user_avatar_reset_to_silhouette', {
      actorId: sessionData.user.id,
      resourceType: 'profile',
    });

    return NextResponse.json({
      success: true,
      avatarRef: defaultSilhouette,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('avatar_delete_error', { details: { error: msg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}

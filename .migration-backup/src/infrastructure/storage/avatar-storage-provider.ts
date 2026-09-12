import fs from 'fs';
import path from 'path';

export interface AvatarUploadResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

export interface AvatarStorageProvider {
  uploadAvatar(userId: string, buffer: Buffer, mimeType: string): Promise<AvatarUploadResult>;
  deleteAvatar(avatarUrl: string): Promise<boolean>;
  isAllowedMime(mimeType: string): boolean;
}

export const MAX_AVATAR_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Validates magic bytes against known image file signatures
 */
export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mimeType === 'image/webp') {
    const isRiff =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46;
    const isWebp =
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  return false;
}

export class LocalAvatarStorageProvider implements AvatarStorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
  }

  public isAllowedMime(mimeType: string): boolean {
    return !!ALLOWED_MIME_TYPES[mimeType.toLowerCase()];
  }

  public async uploadAvatar(
    userId: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<AvatarUploadResult> {
    // 1. Check production environment guard
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_LOCAL_UPLOADS !== 'true'
    ) {
      return {
        success: false,
        error: 'UPLOAD_DISABLED: Локальная загрузка отключена в production. Требуется объектное хранилище (S3/GCS).',
      };
    }

    // 2. Validate file size
    if (buffer.length > MAX_AVATAR_SIZE_BYTES) {
      return {
        success: false,
        error: 'Размер файла превышает допустимый лимит 3 МБ.',
      };
    }

    // 3. Validate MIME type
    const normalizedMime = mimeType.toLowerCase();
    const ext = ALLOWED_MIME_TYPES[normalizedMime];
    if (!ext) {
      return {
        success: false,
        error: 'Неподдерживаемый формат. Разрешены только JPG, PNG и WebP.',
      };
    }

    // 4. Validate magic bytes
    if (!validateMagicBytes(buffer, normalizedMime)) {
      return {
        success: false,
        error: 'Содержимое файла не соответствует заявленному типу изображения.',
      };
    }

    try {
      // Ensure target directory exists
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }

      // Remove any prior avatar files for this user
      const existingFiles = fs.readdirSync(this.uploadDir);
      for (const file of existingFiles) {
        if (file.startsWith(`${userId}-`)) {
          try {
            fs.unlinkSync(path.join(this.uploadDir, file));
          } catch {
            // ignore unlink errors
          }
        }
      }

      // Write new file
      const filename = `${userId}-${Date.now()}${ext}`;
      const filePath = path.join(this.uploadDir, filename);
      fs.writeFileSync(filePath, buffer);

      return {
        success: true,
        avatarUrl: `/uploads/avatars/${filename}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown write error';
      return {
        success: false,
        error: `Не удалось сохранить файл аватара: ${msg}`,
      };
    }
  }

  public async deleteAvatar(avatarUrl: string): Promise<boolean> {
    if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) {
      return false;
    }

    const filename = path.basename(avatarUrl);
    const filePath = path.join(this.uploadDir, filename);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }
}

export const avatarStorageProvider = new LocalAvatarStorageProvider();

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  LocalAvatarStorageProvider,
  validateMagicBytes,
  MAX_AVATAR_SIZE_BYTES,
} from '@/infrastructure/storage/avatar-storage-provider';
import fs from 'fs';
import path from 'path';

describe('AvatarStorageProvider & File Validation Unit Tests', () => {
  const provider = new LocalAvatarStorageProvider();
  const testUserId = 'test-user-storage-01';
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');

  afterEach(() => {
    // Clean up test files
    try {
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        for (const f of files) {
          if (f.startsWith(testUserId)) {
            fs.unlinkSync(path.join(uploadDir, f));
          }
        }
      }
    } catch {
      // ignore cleanup errors
    }
  });

  it('should validate allowed image MIME types and reject invalid formats', () => {
    expect(provider.isAllowedMime('image/jpeg')).toBe(true);
    expect(provider.isAllowedMime('image/png')).toBe(true);
    expect(provider.isAllowedMime('image/webp')).toBe(true);

    expect(provider.isAllowedMime('image/svg+xml')).toBe(false);
    expect(provider.isAllowedMime('image/gif')).toBe(false);
    expect(provider.isAllowedMime('application/pdf')).toBe(false);
    expect(provider.isAllowedMime('text/plain')).toBe(false);
  });

  it('should validate binary magic bytes accurately', () => {
    // Valid JPEG signature
    const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(validateMagicBytes(validJpeg, 'image/jpeg')).toBe(true);
    expect(validateMagicBytes(validJpeg, 'image/png')).toBe(false);

    // Valid PNG signature
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    expect(validateMagicBytes(validPng, 'image/png')).toBe(true);
    expect(validateMagicBytes(validPng, 'image/jpeg')).toBe(false);

    // Corrupt / fake file with JPEG mime but random bytes
    const fakeBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
    expect(validateMagicBytes(fakeBuffer, 'image/jpeg')).toBe(false);
  });

  it('should reject files exceeding 3 MB limit', async () => {
    // 3MB + 1 byte
    const oversizedBuffer = Buffer.alloc(MAX_AVATAR_SIZE_BYTES + 1);
    oversizedBuffer[0] = 0xff;
    oversizedBuffer[1] = 0xd8;
    oversizedBuffer[2] = 0xff;

    const result = await provider.uploadAvatar(testUserId, oversizedBuffer, 'image/jpeg');
    expect(result.success).toBe(false);
    expect(result.error).toContain('3 МБ');
  });

  it('should successfully save valid image, return local URL, and delete file on request', async () => {
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);

    const result = await provider.uploadAvatar(testUserId, validPngBuffer, 'image/png');
    expect(result.success).toBe(true);
    expect(result.avatarUrl).toBeDefined();
    expect(result.avatarUrl).toMatch(/^\/uploads\/avatars\/test-user-storage-01-\d+\.png$/);

    // File should exist on disk
    const filename = path.basename(result.avatarUrl!);
    expect(fs.existsSync(path.join(uploadDir, filename))).toBe(true);

    // Delete avatar
    const deleted = await provider.deleteAvatar(result.avatarUrl!);
    expect(deleted).toBe(true);
    expect(fs.existsSync(path.join(uploadDir, filename))).toBe(false);
  });
});

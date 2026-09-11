# Avatar Storage & Moderation Architecture

## Overview
NOW / IRL enforces privacy-first, zero-PII principles. By default, users are assigned anonymous silhouette avatars (`/avatars/silhouette-1.svg` .. `/avatars/silhouette-8.svg`).

In **Local Test Mode**, users can test custom avatar uploads to verify the profile UI flow.

---

## Storage Strategy

### 1. Local Development (`LocalAvatarStorageProvider`)
- **Location:** `public/uploads/avatars/`
- **File Naming:** `${userId}-${timestamp}.${ext}`
- **Database Storage:** The `profiles` table stores only the relative URL string (`avatar_ref`), e.g., `/uploads/avatars/user-123-1726081200000.webp`.
- **Zero Binary / Base64 in PostgreSQL:** Raw file buffers and base64 strings are **never** stored in PostgreSQL.
- **Cleanup:** Uploading a new avatar automatically unlinks the previous avatar file for that user.
- **Dev-Only Guard:** In production mode (`NODE_ENV === 'production'`), local filesystem upload is strictly disabled (`UPLOAD_DISABLED`) unless explicitly enabled by `ALLOW_LOCAL_UPLOADS=true`.

### 2. Production Target: Object Storage
For production staging and deployment:
- Uploads must target dedicated cloud object storage (e.g. AWS S3, Google Cloud Storage, or Cloudflare R2).
- Ephemeral containers (such as Railway or Render) **must not** rely on local filesystem persistence.
- Pre-signed upload URLs or server-side stream pipelines should be used with strict CDN cache headers.

---

## Security & File Validation Rules
1. **Size Limit:** Maximum **3 MB** (`MAX_AVATAR_SIZE_BYTES = 3 * 1024 * 1024`).
2. **MIME Whitelist:** `image/jpeg`, `image/png`, `image/webp` only. SVGs and animated GIFs are rejected from user upload to prevent Stored XSS and CPU denial-of-service.
3. **Magic Bytes Verification:** Uploaded buffers are inspected for valid binary signatures (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF...WEBP`) before saving.

---

## Trust & Safety: Moderation Policy
Before opening custom avatar uploads to the general public in production:
1. **Automated Content Moderation:** Integrate automated image safety scanning (e.g., Google Cloud Vision SafeSearch or AWS Rekognition) to detect adult content, violence, and hate symbols.
2. **Abuse Reporting:** Users can flag inappropriate avatars via the in-app `SafetyHelpModal`.
3. **Admin Moderation & Ban:** Flagged avatars can be reset immediately by moderators to the default anonymous silhouette (`/avatars/silhouette-1.svg`).

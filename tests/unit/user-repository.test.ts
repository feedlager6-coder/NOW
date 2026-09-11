import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/db/schema';
import fs from 'fs';
import path from 'path';
import { UserRepository } from '@/repositories/user-repository';
import { SessionService } from '@/domain/auth/session-service';
import { AgeService } from '@/domain/auth/age-service';

describe('UserRepository Unit Tests (using in-memory PGlite)', () => {
  let db: any;
  let pglite: PGlite;

  beforeAll(async () => {
    pglite = new PGlite();
    db = drizzle(pglite, { schema });

    // Execute migration statements
    const migrationsDir = path.resolve(__dirname, '../../src/db/migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
      .sort();

    for (const file of files) {
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await pglite.exec(statement);
      }
    }
  });

  it('should create a user with phoneLookupHash and find by hash', async () => {
    const hash = 'mock_phone_hash_001';
    const user = await UserRepository.createUser({ phoneLookupHash: hash }, db);

    expect(user.id).toBeDefined();
    expect(user.phoneLookupHash).toBe(hash);
    expect(user.role).toBe('user');
    expect(user.status).toBe('active');

    const found = await UserRepository.findByPhoneLookupHash(hash, db);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(user.id);
  });

  it('should create session, find session by token hash, and revoke it', async () => {
    const hash = 'mock_phone_hash_002';
    const user = await UserRepository.createUser({ phoneLookupHash: hash }, db);

    const { rawToken, tokenHash } = SessionService.generateSessionToken();
    const expiresAt = SessionService.calculateExpirationDate();

    const session = await UserRepository.createSession(
      { userId: user.id, tokenHash, expiresAt },
      db
    );
    expect(session.id).toBeDefined();

    // Verify session lookup
    const sessionData = await UserRepository.findSessionByTokenHash(tokenHash, db);
    expect(sessionData).not.toBeNull();
    expect(sessionData?.user.id).toBe(user.id);

    // Revoke session
    await UserRepository.revokeSession(tokenHash, true, db);

    const afterRevoke = await UserRepository.findSessionByTokenHash(tokenHash, db);
    expect(afterRevoke).toBeNull();
  });

  it('should record 18+ age confirmation, consent, and user profile with whitelist interests', async () => {
    const hash = 'mock_phone_hash_003';
    const user = await UserRepository.createUser({ phoneLookupHash: hash }, db);

    // 1. Confirm age
    await UserRepository.updateUserAgeConfirmed(user.id, new Date(), db);

    // 2. Record consent
    const consentHash = AgeService.computeConsentHash('User terms 2026-v1');
    await UserRepository.recordConsent(
      {
        userId: user.id,
        consentType: 'TERMS_AND_18_PLUS',
        documentVersion: '2026-v1',
        textHash: consentHash,
      },
      db
    );

    // 3. Save profile
    await UserRepository.saveProfile(
      {
        userId: user.id,
        displayName: 'Тестовый Бегун',
        ageBand: '22-25',
        city: 'DEMO CITY',
        bio: 'Люблю спорт на свежем воздухе',
        avatarRef: 'runner',
      },
      db
    );

    // 4. Set whitelist interests
    await UserRepository.setUserInterests(user.id, ['walk', 'coffee', 'workout'], db);

    // 5. Get full profile and check onboarding status
    const full = await UserRepository.getUserFullProfile(user.id, db);
    expect(full).not.toBeNull();
    expect(full?.user.ageConfirmedAt).not.toBeNull();
    expect(full?.profile?.displayName).toBe('Тестовый Бегун');
    expect(full?.profile?.ageBand).toBe('22-25');
    expect(full?.interests.length).toBe(3);
    expect(full?.consents.length).toBe(1);
    expect(full?.onboardingStatus.isFullyOnboarded).toBe(true);
  });

  it('should enforce maximum 5 interests restriction', async () => {
    const hash = 'mock_phone_hash_004';
    const user = await UserRepository.createUser({ phoneLookupHash: hash }, db);

    await expect(
      UserRepository.setUserInterests(
        user.id,
        ['walk', 'coffee', 'football', 'board_games', 'workout', 'study'],
        db
      )
    ).rejects.toThrow('Cannot assign more than 5 interests');
  });
});

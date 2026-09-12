import { db as defaultDb } from '@/db';
import { users, sessions, profiles, consents, interests, userInterests } from '@/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import type { AgeBand } from '@/domain/auth/age-service';
import { WHITELIST_INTERESTS } from '@/domain/profile/interest-catalog';

export interface UserSessionData {
  session: typeof sessions.$inferSelect;
  user: typeof users.$inferSelect;
  profile: typeof profiles.$inferSelect | null;
}

// In-Memory Fallback Store for Local Dev/Demo Mode when PostgreSQL is unmigrated or offline
class InMemoryUserStore {
  private users = new Map<string, any>();
  private sessions = new Map<string, any>();
  private profiles = new Map<string, any>();
  private consents = new Map<string, any[]>();
  private userInterests = new Map<string, string[]>();

  public findByPhoneLookupHash(phoneLookupHash: string) {
    for (const u of this.users.values()) {
      if (u.phoneLookupHash === phoneLookupHash && !u.deletedAt) {
        return { ...u };
      }
    }
    return null;
  }

  public findUserById(id: string) {
    const u = this.users.get(id);
    if (u && !u.deletedAt) return { ...u };
    return null;
  }

  public createUser(data: { phoneLookupHash: string; role?: 'user' | 'moderator' | 'admin' }) {
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();
    const newUser = {
      id,
      phoneLookupHash: data.phoneLookupHash,
      role: data.role || 'user',
      status: 'active',
      ageConfirmedAt: null,
      ageBand: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.users.set(id, newUser);
    return { ...newUser };
  }

  public createSession(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    const id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const session = {
      id,
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      revokedAt: null,
      createdAt: new Date(),
    };
    this.sessions.set(id, session);
    return { ...session };
  }

  public findSessionByTokenHash(tokenHash: string) {
    const now = new Date();
    for (const s of this.sessions.values()) {
      if (s.tokenHash === tokenHash && !s.revokedAt && s.expiresAt > now) {
        const user = this.findUserById(s.userId);
        if (!user || user.status === 'banned') return null;
        const profile = this.profiles.get(s.userId) || null;
        return {
          session: { ...s },
          user: { ...user },
          profile: profile ? { ...profile } : null,
        };
      }
    }
    return null;
  }

  public revokeSession(identifier: string, isTokenHash = false) {
    for (const s of this.sessions.values()) {
      if ((isTokenHash && s.tokenHash === identifier) || (!isTokenHash && s.id === identifier)) {
        s.revokedAt = new Date();
      }
    }
  }

  public revokeAllUserSessions(userId: string) {
    for (const s of this.sessions.values()) {
      if (s.userId === userId && !s.revokedAt) {
        s.revokedAt = new Date();
      }
    }
  }

  public recordConsent(data: { userId: string; consentType: string; documentVersion: string; textHash: string }) {
    const id = `consent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const consent = {
      id,
      userId: data.userId,
      consentType: data.consentType,
      documentVersion: data.documentVersion,
      textHash: data.textHash,
      acceptedAt: new Date(),
      withdrawnAt: null,
    };
    const list = this.consents.get(data.userId) || [];
    list.push(consent);
    this.consents.set(data.userId, list);
    return { ...consent };
  }

  public updateUserAgeConfirmed(userId: string, ageConfirmedAt: Date = new Date()) {
    const u = this.users.get(userId);
    if (u) {
      u.ageConfirmedAt = ageConfirmedAt;
      u.updatedAt = new Date();
      return { ...u };
    }
    return null;
  }

  public saveProfile(data: {
    userId: string;
    displayName: string;
    ageBand?: AgeBand;
    city?: string;
    bio?: string | null;
    avatarRef?: string | null;
    showAgeBandAndInterests?: boolean;
  }) {
    const now = new Date();
    const existing = this.profiles.get(data.userId);
    if (existing) {
      existing.displayName = data.displayName;
      if (data.ageBand !== undefined) existing.ageBand = data.ageBand;
      existing.city = data.city || existing.city || 'DEMO CITY';
      if (data.bio !== undefined) existing.bio = data.bio;
      if (data.avatarRef !== undefined) existing.avatarRef = data.avatarRef;
      if (data.showAgeBandAndInterests !== undefined) existing.showAgeBandAndInterests = data.showAgeBandAndInterests;
      existing.updatedAt = now;
      return { ...existing };
    } else {
      const created = {
        id: `prof-${Date.now()}`,
        userId: data.userId,
        displayName: data.displayName,
        ageBand: data.ageBand || null,
        city: data.city || 'DEMO CITY',
        bio: data.bio || null,
        avatarRef: data.avatarRef || null,
        showAgeBandAndInterests: data.showAgeBandAndInterests ?? true,
        reliabilityScore: 100,
        createdAt: now,
        updatedAt: now,
      };
      this.profiles.set(data.userId, created);
      return { ...created };
    }
  }

  public setUserInterests(userId: string, interestIds: string[]) {
    this.userInterests.set(userId, [...interestIds]);
  }

  public getUserFullProfile(userId: string) {
    const user = this.findUserById(userId);
    if (!user) return null;

    const profile = this.profiles.get(userId) || null;
    const intIds = this.userInterests.get(userId) || [];
    const fullInterests = intIds
      .map((id) => WHITELIST_INTERESTS.find((i) => i.id === id))
      .filter((i): i is typeof WHITELIST_INTERESTS[0] => !!i)
      .map((i) => ({
        id: i.id,
        labelRu: i.labelRu,
        icon: i.icon,
        sortOrder: i.sortOrder,
      }));

    const userConsents = (this.consents.get(userId) || []).filter((c) => !c.withdrawnAt);

    return {
      user: {
        id: user.id,
        role: user.role,
        status: user.status,
        ageConfirmedAt: user.ageConfirmedAt,
        createdAt: user.createdAt,
      },
      profile: profile
        ? {
            displayName: profile.displayName,
            ageBand: profile.ageBand,
            city: profile.city,
            bio: profile.bio,
            avatarRef: profile.avatarRef,
            showAgeBandAndInterests: profile.showAgeBandAndInterests,
            reliabilityScore: profile.reliabilityScore,
          }
        : null,
      interests: fullInterests,
      consents: userConsents.map((c) => ({
        consentType: c.consentType,
        documentVersion: c.documentVersion,
        acceptedAt: c.acceptedAt,
      })),
      onboardingStatus: {
        hasConfirmedAge: user.ageConfirmedAt !== null,
        hasProfile: !!profile?.displayName,
        hasConsents: userConsents.length > 0,
        isFullyOnboarded:
          user.ageConfirmedAt !== null && !!profile?.displayName && userConsents.length > 0,
      },
    };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __memoryUserStore: InMemoryUserStore | undefined;
}
export const memoryUserStore = global.__memoryUserStore || new InMemoryUserStore();
if (process.env.NODE_ENV !== 'production') {
  global.__memoryUserStore = memoryUserStore;
}

let dbOffline = false;
let lastDbCheck = 0;

async function executeWithDb<T>(
  tx: any,
  dbOp: () => Promise<T>,
  memoryOp: () => Promise<T>
): Promise<T> {
  if (tx !== defaultDb) {
    return await dbOp();
  }

  const now = Date.now();
  if (dbOffline && now - lastDbCheck < 10000) {
    return await memoryOp();
  }

  try {
    const result = await dbOp();
    dbOffline = false;
    return result;
  } catch {
    dbOffline = true;
    lastDbCheck = Date.now();
    return await memoryOp();
  }
}

export class UserRepository {
  public static async findByPhoneLookupHash(phoneLookupHash: string, tx: any = defaultDb) {
    return executeWithDb(
      tx,
      async () => {
        const [user] = await tx
          .select()
          .from(users)
          .where(and(eq(users.phoneLookupHash, phoneLookupHash), isNull(users.deletedAt)))
          .limit(1);
        return user || null;
      },
      async () => memoryUserStore.findByPhoneLookupHash(phoneLookupHash)
    );
  }

  public static async findUserById(id: string, tx: any = defaultDb) {
    return executeWithDb(
      tx,
      async () => {
        const [user] = await tx
          .select()
          .from(users)
          .where(and(eq(users.id, id), isNull(users.deletedAt)))
          .limit(1);
        return user || null;
      },
      async () => memoryUserStore.findUserById(id)
    );
  }

  public static async createUser(
    data: { phoneLookupHash: string; role?: 'user' | 'moderator' | 'admin' },
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        const [created] = await tx
          .insert(users)
          .values({
            phoneLookupHash: data.phoneLookupHash,
            role: data.role || 'user',
            status: 'active',
          })
          .returning();
        return created;
      },
      async () => memoryUserStore.createUser(data)
    );
  }

  public static async createSession(
    data: { userId: string; tokenHash: string; expiresAt: Date },
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        const [session] = await tx
          .insert(sessions)
          .values({
            userId: data.userId,
            tokenHash: data.tokenHash,
            expiresAt: data.expiresAt,
          })
          .returning();
        return session;
      },
      async () => memoryUserStore.createSession(data)
    );
  }

  public static async findSessionByTokenHash(
    tokenHash: string,
    tx: any = defaultDb
  ): Promise<UserSessionData | null> {
    return executeWithDb(
      tx,
      async () => {
        const now = new Date();
        const [session] = await tx
          .select()
          .from(sessions)
          .where(
            and(
              eq(sessions.tokenHash, tokenHash),
              isNull(sessions.revokedAt),
              gt(sessions.expiresAt, now)
            )
          )
          .limit(1);

        if (!session) return null;

        const [user] = await tx
          .select()
          .from(users)
          .where(and(eq(users.id, session.userId), isNull(users.deletedAt)))
          .limit(1);

        if (!user || user.status === 'banned') {
          return null;
        }

        const [profile] = await tx
          .select()
          .from(profiles)
          .where(eq(profiles.userId, user.id))
          .limit(1);

        return {
          session,
          user,
          profile: profile || null,
        };
      },
      async () => memoryUserStore.findSessionByTokenHash(tokenHash)
    );
  }

  public static async revokeSession(
    identifier: string,
    isTokenHash = false,
    tx: any = defaultDb
  ): Promise<void> {
    return executeWithDb(
      tx,
      async () => {
        const whereClause = isTokenHash
          ? eq(sessions.tokenHash, identifier)
          : eq(sessions.id, identifier);

        await tx
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(whereClause);
      },
      async () => {
        memoryUserStore.revokeSession(identifier, isTokenHash);
      }
    );
  }

  public static async revokeAllUserSessions(userId: string, tx: any = defaultDb): Promise<void> {
    return executeWithDb(
      tx,
      async () => {
        await tx
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
      },
      async () => {
        memoryUserStore.revokeAllUserSessions(userId);
      }
    );
  }

  public static async recordConsent(
    data: { userId: string; consentType: string; documentVersion: string; textHash: string },
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        const [consent] = await tx
          .insert(consents)
          .values({
            userId: data.userId,
            consentType: data.consentType,
            documentVersion: data.documentVersion,
            textHash: data.textHash,
          })
          .returning();
        return consent;
      },
      async () => memoryUserStore.recordConsent(data)
    );
  }

  public static async updateUserAgeConfirmed(
    userId: string,
    ageConfirmedAt: Date = new Date(),
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        const [updated] = await tx
          .update(users)
          .set({
            ageConfirmedAt,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning();
        return updated;
      },
      async () => memoryUserStore.updateUserAgeConfirmed(userId, ageConfirmedAt)
    );
  }

  public static async saveProfile(
    data: {
      userId: string;
      displayName: string;
      ageBand?: AgeBand;
      city?: string;
      bio?: string | null;
      avatarRef?: string | null;
      showAgeBandAndInterests?: boolean;
    },
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        const existing = await tx
          .select()
          .from(profiles)
          .where(eq(profiles.userId, data.userId))
          .limit(1);

        if (existing.length > 0) {
          const [updated] = await tx
            .update(profiles)
            .set({
              displayName: data.displayName,
              ...(data.ageBand !== undefined ? { ageBand: data.ageBand } : {}),
              city: data.city || existing[0].city || 'DEMO CITY',
              bio: data.bio !== undefined ? data.bio : existing[0].bio,
              avatarRef: data.avatarRef !== undefined ? data.avatarRef : existing[0].avatarRef,
              showAgeBandAndInterests:
                data.showAgeBandAndInterests !== undefined
                  ? data.showAgeBandAndInterests
                  : existing[0].showAgeBandAndInterests,
              updatedAt: new Date(),
            })
            .where(eq(profiles.userId, data.userId))
            .returning();
          return updated;
        } else {
          const [created] = await tx
            .insert(profiles)
            .values({
              userId: data.userId,
              displayName: data.displayName,
              ageBand: data.ageBand,
              city: data.city || 'DEMO CITY',
              bio: data.bio || null,
              avatarRef: data.avatarRef || null,
              showAgeBandAndInterests: data.showAgeBandAndInterests ?? true,
            })
            .returning();
          return created;
        }
      },
      async () => memoryUserStore.saveProfile(data)
    );
  }

  public static async setUserInterests(
    userId: string,
    interestIds: string[],
    tx: any = defaultDb
  ): Promise<void> {
    if (interestIds.length > 5) {
      throw new Error('Cannot assign more than 5 interests');
    }

    return executeWithDb(
      tx,
      async () => {
        await tx.delete(userInterests).where(eq(userInterests.userId, userId));

        if (interestIds.length > 0) {
          await tx.insert(userInterests).values(
            interestIds.map((id) => ({
              userId,
              interestId: id,
            }))
          );
        }
      },
      async () => {
        memoryUserStore.setUserInterests(userId, interestIds);
      }
    );
  }

  public static async getUserFullProfile(userId: string, tx: any = defaultDb) {
    return executeWithDb(
      tx,
      async () => {
        const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) return null;

        const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);

        const userInts = await tx
          .select({
            id: interests.id,
            labelRu: interests.labelRu,
            icon: interests.icon,
            sortOrder: interests.sortOrder,
          })
          .from(userInterests)
          .innerJoin(interests, eq(userInterests.interestId, interests.id))
          .where(eq(userInterests.userId, userId));

        const userConsents = await tx
          .select()
          .from(consents)
          .where(and(eq(consents.userId, userId), isNull(consents.withdrawnAt)));

        return {
          user: {
            id: user.id,
            role: user.role,
            status: user.status,
            ageConfirmedAt: user.ageConfirmedAt,
            createdAt: user.createdAt,
          },
          profile: profile
            ? {
                displayName: profile.displayName,
                ageBand: profile.ageBand,
                city: profile.city,
                bio: profile.bio,
                avatarRef: profile.avatarRef,
                showAgeBandAndInterests: profile.showAgeBandAndInterests,
                reliabilityScore: profile.reliabilityScore,
              }
            : null,
          interests: userInts,
          consents: userConsents.map((c: any) => ({
            consentType: c.consentType,
            documentVersion: c.documentVersion,
            acceptedAt: c.acceptedAt,
          })),
          onboardingStatus: {
            hasConfirmedAge: user.ageConfirmedAt !== null,
            hasProfile: !!profile?.displayName,
            hasConsents: userConsents.length > 0,
            isFullyOnboarded:
              user.ageConfirmedAt !== null && !!profile?.displayName && userConsents.length > 0,
          },
        };
      },
      async () => memoryUserStore.getUserFullProfile(userId)
    );
  }
}

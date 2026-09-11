import { describe, it, expect } from 'vitest';
import { AgeService } from '@/domain/auth/age-service';

describe('AgeService & 18+ Gate Unit Tests', () => {
  const refDate = new Date('2026-09-11T12:00:00Z');

  it('should reject users under 18 years old', () => {
    // Born in 2010 (16 years old)
    const resultMinor = AgeService.calculateAgeBand(2010, 5, refDate);
    expect(resultMinor.isAdult).toBe(false);
    expect(resultMinor.error).toBe('AGE_BELOW_18');

    // Born in 2008, month 12 (17 years old on Sept 2026)
    const result17 = AgeService.calculateAgeBand(2008, 12, refDate);
    expect(result17.isAdult).toBe(false);
    expect(result17.error).toBe('AGE_BELOW_18');
  });

  it('should correctly calculate age bands for 18+', () => {
    // 18-21 band
    const res18 = AgeService.calculateAgeBand(2008, 1, refDate);
    expect(res18.isAdult).toBe(true);
    expect(res18.ageBand).toBe('18-21');

    const res21 = AgeService.calculateAgeBand(2005, 5, refDate);
    expect(res21.isAdult).toBe(true);
    expect(res21.ageBand).toBe('18-21');

    // 22-25 band
    const res23 = AgeService.calculateAgeBand(2003, 3, refDate);
    expect(res23.isAdult).toBe(true);
    expect(res23.ageBand).toBe('22-25');

    // 26-30 band
    const res28 = AgeService.calculateAgeBand(1998, 2, refDate);
    expect(res28.isAdult).toBe(true);
    expect(res28.ageBand).toBe('26-30');

    // 31+ band
    const res35 = AgeService.calculateAgeBand(1991, 1, refDate);
    expect(res35.isAdult).toBe(true);
    expect(res35.ageBand).toBe('31+');
  });

  it('should compute deterministic SHA-256 consent text hash', () => {
    const textA = 'Правила безопасности публичных зон NOW v1.0';
    const hash1 = AgeService.computeConsentHash(textA);
    const hash2 = AgeService.computeConsentHash(textA);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });
});

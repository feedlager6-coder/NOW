import { describe, it, expect } from 'vitest';
import { ProfileValidator, WHITELIST_INTERESTS } from '@/domain/profile/interest-catalog';

describe('ProfileValidator & Interest Whitelist Unit Tests', () => {
  it('should accept valid profile with up to 5 whitelist interests', () => {
    const valid = ProfileValidator.validateProfile({
      displayName: 'Alex_Pro',
      bio: 'Люблю настольные игры и вечерние прогулки',
      interestIds: ['walk', 'coffee', 'board_games'],
    });

    expect(valid.valid).toBe(true);
    expect(valid.sanitizedName).toBe('Alex_Pro');
    expect(valid.sanitizedBio).toBe('Люблю настольные игры и вечерние прогулки');
  });

  it('should reject more than 5 interests', () => {
    const tooMany = ProfileValidator.validateInterests([
      'walk',
      'coffee',
      'football',
      'board_games',
      'workout',
      'study', // 6th
    ]);

    expect(tooMany.valid).toBe(false);
    expect(tooMany.error).toContain('максимум 5 интересов');
  });

  it('should reject interests not present in whitelist', () => {
    const invalid = ProfileValidator.validateInterests(['walk', 'random_unapproved_interest']);

    expect(invalid.valid).toBe(false);
    expect(invalid.error).toContain('отсутствует в списке разрешённых');
  });

  it('should strip HTML tags and reject URLs or contact info in display name and bio', () => {
    const htmlName = ProfileValidator.validateProfile({
      displayName: '<b>Hacker</b>',
    });
    expect(htmlName.sanitizedName).toBe('Hacker');

    const contactName = ProfileValidator.validateProfile({
      displayName: 'alex@mail.ru',
    });
    expect(contactName.valid).toBe(false);
    expect(contactName.error).toContain('запрещены ссылки и контакты');

    const linkBio = ProfileValidator.validateProfile({
      displayName: 'Alex',
      bio: 'Мой сайт https://evil.com заходи',
    });
    expect(linkBio.valid).toBe(false);
    expect(linkBio.error).toContain('запрещены внешние ссылки');
  });

  it('should have 20 active whitelist interests', () => {
    expect(WHITELIST_INTERESTS.length).toBe(20);
    expect(WHITELIST_INTERESTS.every((i) => i.isActive && i.icon && i.labelRu)).toBe(true);
  });
});

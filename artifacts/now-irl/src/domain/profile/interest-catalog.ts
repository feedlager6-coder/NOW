export interface InterestItem {
  id: string;
  labelRu: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
}

export const WHITELIST_INTERESTS: InterestItem[] = [
  { id: 'walk', labelRu: 'Прогулки', icon: '🚶', isActive: true, sortOrder: 1 },
  { id: 'coffee', labelRu: 'Кофе', icon: '☕', isActive: true, sortOrder: 2 },
  { id: 'football', labelRu: 'Футбол', icon: '⚽', isActive: true, sortOrder: 3 },
  { id: 'sports_viewing', labelRu: 'UFC / спорт', icon: '🥊', isActive: true, sortOrder: 4 },
  { id: 'board_games', labelRu: 'Настольные игры', icon: '🎲', isActive: true, sortOrder: 5 },
  { id: 'study', labelRu: 'Учёба', icon: '📚', isActive: true, sortOrder: 6 },
  { id: 'workout', labelRu: 'Воркаут', icon: '⚡', isActive: true, sortOrder: 7 },
  { id: 'music', labelRu: 'Музыка', icon: '🎵', isActive: true, sortOrder: 8 },
  { id: 'cinema', labelRu: 'Кино', icon: '🎬', isActive: true, sortOrder: 9 },
  { id: 'books', labelRu: 'Книги', icon: '📖', isActive: true, sortOrder: 10 },
  { id: 'gaming', labelRu: 'Игры', icon: '🎮', isActive: true, sortOrder: 11 },
  { id: 'photography', labelRu: 'Фотография', icon: '📷', isActive: true, sortOrder: 12 },
  { id: 'languages', labelRu: 'Языки', icon: '🗣️', isActive: true, sortOrder: 13 },
  { id: 'creativity', labelRu: 'Творчество', icon: '🎨', isActive: true, sortOrder: 14 },
  { id: 'business', labelRu: 'Бизнес / стартапы', icon: '💡', isActive: true, sortOrder: 15 },
  { id: 'coding', labelRu: 'Программирование', icon: '💻', isActive: true, sortOrder: 16 },
  { id: 'chess', labelRu: 'Шахматы', icon: '♟️', isActive: true, sortOrder: 17 },
  { id: 'running', labelRu: 'Бег', icon: '🏃', isActive: true, sortOrder: 18 },
  { id: 'cycling', labelRu: 'Велосипед', icon: '🚴', isActive: true, sortOrder: 19 },
  { id: 'hiking', labelRu: 'Походы', icon: '🌲', isActive: true, sortOrder: 20 },
];

export class ProfileValidator {
  public static readonly MIN_INTERESTS = 1;
  public static readonly MAX_INTERESTS = 5;
  public static readonly MIN_NAME_LENGTH = 2;
  public static readonly MAX_NAME_LENGTH = 30;
  public static readonly MAX_BIO_LENGTH = 150;

  public static validateInterests(interestIds: string[]): { valid: boolean; error?: string } {
    if (!Array.isArray(interestIds)) {
      return { valid: false, error: 'Интересы должны быть массивом идентификаторов.' };
    }

    if (interestIds.length < ProfileValidator.MIN_INTERESTS) {
      return {
        valid: false,
        error: `Выберите минимум ${ProfileValidator.MIN_INTERESTS} интерес.`,
      };
    }

    if (interestIds.length > ProfileValidator.MAX_INTERESTS) {
      return {
        valid: false,
        error: `Можно выбрать максимум ${ProfileValidator.MAX_INTERESTS} интересов.`,
      };
    }

    // Check duplicate IDs
    const uniqueIds = new Set(interestIds);
    if (uniqueIds.size !== interestIds.length) {
      return { valid: false, error: 'Обнаружены повторяющиеся интересы.' };
    }

    // Check every interest is in active whitelist
    for (const id of interestIds) {
      const found = WHITELIST_INTERESTS.find((i) => i.id === id && i.isActive);
      if (!found) {
        return {
          valid: false,
          error: `Интерес "${id}" отсутствует в списке разрешённых активных интересов.`,
        };
      }
    }

    return { valid: true };
  }

  public static validateProfile(data: {
    displayName: string;
    bio?: string;
    interestIds?: string[];
  }): { valid: boolean; sanitizedName?: string; sanitizedBio?: string; error?: string } {
    const trimmedName = data.displayName?.trim() || '';
    if (trimmedName.length < ProfileValidator.MIN_NAME_LENGTH) {
      return { valid: false, error: 'Имя должно содержать не менее 2 символов.' };
    }
    if (trimmedName.length > ProfileValidator.MAX_NAME_LENGTH) {
      return { valid: false, error: 'Имя не должно превышать 30 символов.' };
    }

    // Disallow HTML or URLs in display name
    const sanitizedName = trimmedName.replace(/<[^>]*>?/gm, '').trim();
    if (sanitizedName.includes('http://') || sanitizedName.includes('https://') || sanitizedName.includes('@')) {
      return { valid: false, error: 'В имени запрещены ссылки и контакты.' };
    }

    let sanitizedBio: string | undefined;
    if (data.bio !== undefined && data.bio !== null) {
      sanitizedBio = data.bio.replace(/<[^>]*>?/gm, '').trim();
      if (sanitizedBio.length > ProfileValidator.MAX_BIO_LENGTH) {
        return { valid: false, error: `Описание не должно превышать ${ProfileValidator.MAX_BIO_LENGTH} символов.` };
      }
      if (sanitizedBio.includes('http://') || sanitizedBio.includes('https://')) {
        return { valid: false, error: 'В описании запрещены внешние ссылки.' };
      }
    }

    if (data.interestIds) {
      const intCheck = ProfileValidator.validateInterests(data.interestIds);
      if (!intCheck.valid) {
        return { valid: false, error: intCheck.error };
      }
    }

    return { valid: true, sanitizedName, sanitizedBio };
  }
}

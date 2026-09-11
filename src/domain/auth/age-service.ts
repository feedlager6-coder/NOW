import crypto from 'crypto';

export type AgeBand = '18-21' | '22-25' | '26-30' | '31+';

export interface AgeCalculationResult {
  isAdult: boolean;
  ageBand?: AgeBand;
  error?: string;
  message?: string;
}

export class AgeService {
  public static calculateAgeBand(
    birthYear: number,
    birthMonth: number,
    currentDate: Date = new Date()
  ): AgeCalculationResult {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 1-indexed

    if (birthYear < 1900 || birthYear > currentYear) {
      return { isAdult: false, error: 'INVALID_YEAR', message: 'Некорректный год рождения.' };
    }

    if (birthMonth < 1 || birthMonth > 12) {
      return { isAdult: false, error: 'INVALID_MONTH', message: 'Некорректный месяц рождения.' };
    }

    let age = currentYear - birthYear;
    if (currentMonth < birthMonth) {
      age -= 1;
    }

    if (age < 18) {
      return {
        isAdult: false,
        error: 'AGE_BELOW_18',
        message: 'Сервис спонтанных встреч NOW строго 18+. Регистрация несовершеннолетних запрещена.',
      };
    }

    let ageBand: AgeBand;
    if (age <= 21) {
      ageBand = '18-21';
    } else if (age <= 25) {
      ageBand = '22-25';
    } else if (age <= 30) {
      ageBand = '26-30';
    } else {
      ageBand = '31+';
    }

    return {
      isAdult: true,
      ageBand,
    };
  }

  public static computeConsentHash(canonicalText: string): string {
    return crypto.createHash('sha256').update(canonicalText.trim()).digest('hex');
  }
}

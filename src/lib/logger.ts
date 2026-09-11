/**
 * Zero-PII Structured Logger for MoodCall
 * 
 * Strict Denylist:
 * - message body / report text / complaints
 * - phone numbers, emails, user names
 * - exact or approximate coordinates
 * - passwords, OTP codes, session tokens, secret keys, cookies, authorization headers
 * - payment webhook raw payloads, cards, banking data
 * - identity documents, passport scans, biometrics
 */

export const PII_DENYLIST_KEYS = new Set([
  'body',
  'description',
  'text',
  'password',
  'token',
  'tokenhash',
  'token_hash',
  'secret',
  'otp',
  'code',
  'cookie',
  'cookies',
  'authorization',
  'phone',
  'phonenumber',
  'phone_number',
  'phonelookuphash',
  'phone_lookup_hash',
  'email',
  'lat',
  'lng',
  'latitude',
  'longitude',
  'approximatelat',
  'approximatelng',
  'approximate_lat',
  'approximate_lng',
  'coordinates',
  'cardnumber',
  'card_number',
  'cvv',
  'card',
  'payload',
  'rawpayload',
  'raw_payload',
  'document',
  'passport',
  'selfie',
  'biometric',
]);

const PHONE_REGEX = /(?:\+?7|8)?[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}/g;
const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi;

/**
 * Recursively sanitizes any object or string against the PII denylist and patterns.
 */
export function redactPii<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return input
      .replace(BEARER_REGEX, 'Bearer [REDACTED]')
      .replace(PHONE_REGEX, '[PHONE_REDACTED]')
      .replace(EMAIL_REGEX, '[EMAIL_REDACTED]') as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactPii(item)) as unknown as T;
  }

  if (typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const isDenied =
        PII_DENYLIST_KEYS.has(normalizedKey) ||
        Array.from(PII_DENYLIST_KEYS).some(
          (denied) => (denied.length >= 4 && normalizedKey.includes(denied)) || normalizedKey.endsWith(denied)
        );
      if (isDenied) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = redactPii(value);
      }
    }
    return sanitized as T;
  }

  return input;
}

export interface LogEntry {
  event: string;
  level: 'info' | 'warn' | 'error';
  timestamp: string;
  correlationId?: string;
  actorId?: string;
  resourceId?: string;
  resourceType?: string;
  status?: string;
  safeErrorCode?: string;
  details?: Record<string, unknown>;
}

export const logger = {
  info(event: string, meta?: Omit<Partial<LogEntry>, 'event' | 'level' | 'timestamp'>) {
    const entry: LogEntry = {
      event,
      level: 'info',
      timestamp: new Date().toISOString(),
      correlationId: meta?.correlationId,
      actorId: meta?.actorId,
      resourceId: meta?.resourceId,
      resourceType: meta?.resourceType,
      status: meta?.status,
      safeErrorCode: meta?.safeErrorCode,
      details: meta?.details ? redactPii(meta.details) : undefined,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
    return entry;
  },

  warn(event: string, meta?: Omit<Partial<LogEntry>, 'event' | 'level' | 'timestamp'>) {
    const entry: LogEntry = {
      event,
      level: 'warn',
      timestamp: new Date().toISOString(),
      correlationId: meta?.correlationId,
      actorId: meta?.actorId,
      resourceId: meta?.resourceId,
      resourceType: meta?.resourceType,
      status: meta?.status,
      safeErrorCode: meta?.safeErrorCode,
      details: meta?.details ? redactPii(meta.details) : undefined,
    };
    // eslint-disable-next-line no-console
    console.warn(JSON.stringify(entry));
    return entry;
  },

  error(event: string, meta?: Omit<Partial<LogEntry>, 'event' | 'level' | 'timestamp'>) {
    const entry: LogEntry = {
      event,
      level: 'error',
      timestamp: new Date().toISOString(),
      correlationId: meta?.correlationId,
      actorId: meta?.actorId,
      resourceId: meta?.resourceId,
      resourceType: meta?.resourceType,
      status: meta?.status,
      safeErrorCode: meta?.safeErrorCode,
      details: meta?.details ? redactPii(meta.details) : undefined,
    };
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(entry));
    return entry;
  },
};

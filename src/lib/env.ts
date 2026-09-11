import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required for database operations')
    .default('postgresql://postgres:postgres@localhost:5432/now_irl?sslmode=prefer'),
  TEST_DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(16).default('change_me_to_at_least_32_bytes_random_secret_hex'),
  OTP_HMAC_SECRET: z
    .string()
    .min(16)
    .default('change_me_to_32_bytes_random_salt_for_phone_lookup_hashes'),
  OTP_PROVIDER: z.string().default('mock'),
  STORAGE_PROVIDER: z.string().default('mock'),
  MAP_PROVIDER: z.string().default('mock'),
  EMERGENCY_PHONE_URL: z.string().default('tel:112'),
  CHAT_RETENTION_HOURS: z.coerce.number().default(12),
  NEXT_PUBLIC_ENABLE_DEMO_MODE: z.string().default('true'),
  NEXT_PUBLIC_DEMO_MODE: z.string().default('true'),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function getEnv(): Env {
  if (!parsedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const errorMsg = `Invalid environment variables: ${JSON.stringify(result.error.format())}`;
      throw new Error(errorMsg);
    }
    parsedEnv = result.data;
  }
  return parsedEnv;
}

export function validateEnv(customEnv?: Record<string, unknown>): Env {
  return envSchema.parse(customEnv || process.env);
}

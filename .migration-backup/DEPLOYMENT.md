# NOW / IRL — Deployment, Infrastructure & Operations Guide

**Версия документа:** 2.0.0 (NOW / IRL Pivot — Spontaneous Offline Group Coordinator)  
**Целевая платформа:** Replit Server Deployment / Containerized Node.js 20+ LTS / Vercel + Neon  
**Каноническая база данных:** Managed PostgreSQL 15+ (Replit Postgres / Neon / Supabase)  

---

## 1. Управление переменными окружения и безопасность

Все приватные ключи и строка подключения к PostgreSQL хранятся в **Replit Secrets** (или секретах хостинга). Никакие боевые секреты не должны попадать в репозиторий. Все переменные валидируются на старте через Zod schema в `src/config/env.ts`.

### Шаблон конфигурации (`.env.example`):
```bash
# Server Environment
NODE_ENV="development" # development | test | production
PORT=3000
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Database Configuration (Canonical PostgreSQL 15+)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/now_irl?sslmode=prefer"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/now_irl_test?sslmode=prefer"

# Session & Crypto Secrets (Минимум 32 случайных байта hex)
SESSION_SECRET="change_me_to_at_least_32_bytes_random_secret_hex"
FIELD_ENCRYPTION_KEY="change_me_to_32_bytes_hex_for_aes_256_gcm"
OTP_HMAC_SECRET="change_me_to_32_bytes_random_salt_for_phone_hashes"

# Provider Flags (Только Mock для MVP)
OTP_PROVIDER="mock"
STORAGE_PROVIDER="mock"
MAP_PROVIDER="mock"

# Emergency Dispatch Reference (Только для UI-ссылки tel:112)
EMERGENCY_PHONE_URL="tel:112"

# Ephemeral Retention Policy
CHAT_RETENTION_HOURS=12

# Demo Safety Flag
NEXT_PUBLIC_DEMO_MODE="true"
```

---

## 2. Команды сборки, миграций, сида и запуска

В `package.json` зафиксированы стандартные воспроизводимые команды:

```bash
# 1. Установка зависимостей
npm install

# 2. Генерация Drizzle-миграций схемы NOW / IRL
npm run db:generate

# 3. Применение миграций к PostgreSQL
npm run db:migrate

# 4. Заполнение базы демонстрационными «Огоньками» и зонами (DEMO_PUBLIC_ZONE_1..3)
npm run db:seed

# 5. Запуск сервера разработки
npm run dev

# 6. Сборка для production
npm run build

# 7. Запуск production-сервера
npm run start

# 8. Запуск фонового скрипта очистки старых чатов (TTL = 12 часов)
npm run purge:chats

# 9. Запуск фонового скрипта авто-отмены просроченных митапов
npm run meetups:expire

# 10. Запуск тестов Vitest
npm run test

# 11. Запуск E2E тестов Playwright
npm run test:e2e
```

> **Примечание для Windows PowerShell:**  
> При локальном запуске в среде Windows используйте `npm.cmd` и `npx.cmd` во избежание ошибок политики выполнения скриптов PowerShell (`ExecutionPolicy`).

---

## 3. Seed Guards & Правила изоляции DEMO-данных

1. **Флаг `is_demo = true`:**  
   Все создаваемые сидом пользователи, митапы, сообщения и зоны помечаются атрибутом `is_demo: true`.
2. **Только вымышленные зоны:**  
   В сиде используются строго безопасные демонстрационные зоны (`DEMO_PUBLIC_ZONE_1`, `DEMO_PUBLIC_ZONE_2`, `DEMO_PUBLIC_ZONE_3`) с синтетической геометрией. Никаких реальных коммерческих брендов или адресов без прямого соглашения с владельцами.
3. **Постоянный UI-бейдж:**  
   В шапке интерфейса и на карточках митапов отображается постоянный заметный бейдж:  
   `«DEMO ONLY — SPONTANEOUS GROUP MEETUP PROTOTYPE — NOT FOR REAL EMERGENCIES»`.
4. **Запрет PII в DEMO-аккаунтах:**  
   Никаких реальных номеров телефонов, личных email и персональных фотографий лиц. В сиде используются геометрические SVG-аватары и вымышленные никнеймы.

---

## 4. Фоновые задачи и расписание (Cron & Workers)

Для поддержания принципа минимизации данных и актуальности карты запускаются регулярные фоновые задачи:

1. **Chat Retention Purge Worker (`npm run purge:chats`):**
   - **Частота:** Каждые 15 минут (или через cron/серверную очередь).
   - **Логика:** Выбирает митапы со статусом `completed` или `cancelled`, где `ended_at < NOW() - INTERVAL '12 hours'`, и отсутствуют связанные открытые репорты безопасности (`safety_review`). Выполняет жесткое удаление (`DELETE`) сообщений чата из таблицы `meetup_messages`.
   - **Логирование:** Фиксирует количество удаленных сообщений без вывода содержимого сообщений (Zero-PII).

2. **Meetup Expiration Worker (`npm run meetups:expire`):**
   - **Частота:** Каждые 5 минут.
   - **Логика:** Выбирает митапы со статусом `published`, у которых время `starts_at` наступило, но кворум (`min_participants`) не был набран. Переводит статус в `cancelled` / `expired` с причиной `QUORUM_NOT_REACHED`.

---

## 5. Стратегия отката и аварийного восстановления (Rollback Strategy)

1. **Файловый архив `_archive_moodcall_v1/`:**  
   Перед началом Фазы 1 все исходные файлы предыдущей версии изолируются в архивную директорию `_archive_moodcall_v1/`.
2. **Откат схемы базы данных:**  
   В случае непредвиденных сбоев при миграции предусмотрен возврат к baseline через Drizzle-миграции либо восстановление из snapshot дампа PostgreSQL (`pg_dump` перед миграцией).
3. **Безопасная изоляция окружения:**  
   При локальной разработке используется отдельная тестовая база `DATABASE_URL` / `TEST_DATABASE_URL`.

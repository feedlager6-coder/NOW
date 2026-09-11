# Регламент безопасного Staging развертывания NOW / IRL на Railway

Документ описывает процедуру развертывания закрытого тестового стенда (Staging) проекта NOW / IRL на платформе Railway с соблюдением требований безопасности, Zero-PII и полной изоляцией тестовых сред.

---

## 1. Архитектура и уровни защиты Staging

Закрытый стенд изолирован на нескольких уровнях:

1. **Staging Access Gate (Шлюз доступа)**:
   - Вся аутентификация перекрыта инвайт-кодом (`STAGING_ACCESS_CODE`).
   - До проверки инвайт-кода невозможно запросить OTP или авторизоваться.
   - После успешной валидации клиенту выдается криптографически подписанная (HMAC-SHA256) `httpOnly` cookie (`now_staging_gate`) со сроком жизни 1 час. На клиенте значение куки недоступно для чтения через JavaScript (`httpOnly: true`).
   - Защита от подбора: rate limiting (максимум 5 попыток за 15 минут) и constant-time comparison (`crypto.timingSafeEqual`).
   - **Примечание по Rate Limiting**: В текущей MVP-версии используется best-effort in-memory rate limiting с нейтральным временным ключом без сохранения и логирования raw `x-forwarded-for` и без IP-fingerprinting. Данный in-memory механизм действует в рамках одного инстанса, не является полноценной защитой при горизонтальном масштабировании на несколько инстансов и на следующем этапе будет заменен на централизованный shared store (Redis / Upstash) или edge-level rate limit.

2. **Staging OTP Provider**:
   - Dev-режим (`000000`) полностью отключен и вызывает аварийное завершение при `NODE_ENV=production`.
   - Проверка номеров строго ограничена пулом синтетических номеров: `+79990000001` – `+79990000099`.
   - Ввод `000000` на стенде явно отклоняется с ошибкой.
   - Проверка динамического 6-значного кода стенда (`STAGING_OTP_CODE`) защищена constant-time сравнением.
   - Никаких реальных SMS-шлюзов или внешних платных сервисов не подключается.

3. **Визуальный Staging Banner**:
   - Параметр `NEXT_PUBLIC_STAGING_MODE="true"` используется **исключительно** для интерфейса: отображение предупреждающего баннера вверху приложения и информационных плашек.
   - Не является механизмом безопасности. Безопасность проверяется строго на сервере через `NODE_ENV=production`, `AUTH_MODE=staging_gate`, `STAGING_ACCESS_CODE` и `STAGING_OTP_CODE`.

4. **Политика обработки данных и приватность**:
   - **Сервис не собирает паспортные данные, биометрию, открытые номера телефонов и постоянные точные GPS-треки. В закрытом стенде запрещено передавать личные или чувствительные данные в display name, bio и чатах.**
   - В интерфейсе стенда выведено предупреждение: *«Не указывайте реальные адреса, телефоны, документы и другую чувствительную информацию.»*
   - Секреты, токены доступа и пароли никогда не сохраняются в репозитории, логах, URL-параметрах, ответах API или LocalStorage.

---

## 2. Подготовка окружения на Railway

### Шаг 1: Создание проекта и PostgreSQL

1. Войдите в панель [Railway.app](https://railway.app).
2. Создайте новый пустой проект (**New Project**).
3. Добавьте сервис базы данных: **New** -> **Database** -> **Add PostgreSQL**.
4. Railway автоматически создаст базу данных и выделит внутреннюю сетевую переменную `DATABASE_URL` (private network reference).

### Шаг 2: Подключение GitHub репозитория

1. В созданном проекте Railway нажмите **New** -> **GitHub Repo**.
2. Выберите репозиторий: `feedlager6-coder/NOW` (ветка `main`).
3. В настройках сервиса (Settings):
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start` (в `package.json` задано `"start": "next start"`)
   - **Root Directory**: `/`

> [!NOTE]
> Railway автоматически назначает и пробрасывает системную переменную `PORT` в контейнер. Задавать `PORT=3000` вручную в Railway Variables не требуется.

---

## 3. Матрица переменных окружения (Variables)

В панели сервиса приложения (Service -> Variables) установите следующие параметры:

| Переменная | Значение / Формат | Описание |
|---|---|---|
| `NODE_ENV` | `production` | Продакшн-окружение Next.js |
| `AUTH_MODE` | `staging_gate` | Режим двухфакторного закрытого стенда |
| `NEXT_PUBLIC_STAGING_MODE` | `true` | Отображение баннера тестового стенда (UI only) |
| `NEXT_PUBLIC_ENABLE_DEMO_MODE` | `true` | Включение тестовых демонстрационных зон |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Приватная ссылка на Railway PostgreSQL |
| `SESSION_SECRET` | `<generate-random-32-byte-hex>` | Секрет подписи сессий (минимум 32 байта hex) |
| `OTP_HMAC_SECRET` | `<generate-random-32-byte-hex>` | Секрет слепого хеширования номеров |
| `STAGING_ACCESS_CODE` | `<generate-random-strong-access-code>` | Инвайт-код для доступа к экрану входа |
| `STAGING_OTP_CODE` | `<generate-random-6-digit-otp>` | 6-значный код подтверждения (например: 739201) |
| `STAGING_SEED_ENABLED` | `false` | Защитный флаг (включается только разово при сиде) |
| `STORAGE_PROVIDER` | `mock` | Изолированное хранилище аватаров |
| `MAP_PROVIDER` | `mock` | Изолированный картографический провайдер |
| `EMERGENCY_PHONE_URL` | `tel:112` | Номер экстренной помощи |

> [!WARNING]
> Никогда не используйте одинаковые значения `STAGING_ACCESS_CODE` и `STAGING_OTP_CODE`.
> Не используйте тривиальные коды (`000000`, `123456`).
> Генерируйте криптостойкие случайные строки для секретов.

---

## 4. Применение миграций базы данных

Миграции выполняются **вручную через Railway CLI** или через временный one-off job.
Команда запуска никогда не встраивается в автоматический `start`-скрипт приложения!

Установите Railway CLI на локальной машине или сервере управления:
```bash
# 1. Авторизация в Railway
railway login

# 2. Привязка к проекту
railway link

# 3. Запуск миграций в изолированном контексте базы Railway
railway run npm run db:migrate
```

Вывод должен завершиться сообщением:
```text
✅ All migrations applied successfully.
```

---

## 5. Разовый сид демонстрационных данных (DEMO Seed)

Сид создает синтетические активности, тестовые зоны и демо-встречи ("огоньки"). Все созданные сущности помечены флагом `is_demo=true`. Сессии пользователей **не создаются**.

### Процедура выполнения сида:

1. В панели Railway временно переключите переменную:
   `STAGING_SEED_ENABLED="true"`
2. Выполните команду через Railway CLI:
   ```bash
   railway run npm run db:seed
   ```
3. Убедитесь в успешном завершении:
   ```text
   ✅ NOW / IRL DEMO seed completed! (Zones: 5, Users: 4, Flames: 7)
   ```
4. **Немедленно верните** переменную в безопасное состояние:
   `STAGING_SEED_ENABLED="false"`

---

## 6. Безопасная ручная очистка демонстрационных данных (DEMO Cleanup)

> [!CAUTION]
> **ПРЕДУПРЕЖДЕНИЕ О БЕЗОПАСНОСТИ ДАННЫХ:**
> 1. Автоматическая очистка в приложении отключена.
> 2. Перед выполнением любых операций удаления **ОБЯЗАТЕЛЬНО** сделайте резервную копию базы данных:
>    ```bash
>    railway run pg_dump $DATABASE_URL > backup_before_demo_cleanup.sql
>    ```
> 3. Любой `DELETE` запускается **только вручную** и только после предварительной проверки количества записей через `SELECT preview`.
> 4. Удаление должно выполняться в строгой последовательности с учетом связей внешних ключей (Foreign Keys).

### Шаг 6.1: Предварительная проверка (Preview SELECT)

Выполните в консоли запросов Railway (Data / Query Console), чтобы убедиться, что под выборку попадают только демонстрационные записи:

```sql
-- Проверка количества DEMO сущностей
SELECT 'meetup_messages' AS entity, COUNT(*) FROM meetup_messages WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true)
UNION ALL
SELECT 'meetup_participants', COUNT(*) FROM meetup_participants WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true)
UNION ALL
SELECT 'meetup_events', COUNT(*) FROM meetup_events WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true)
UNION ALL
SELECT 'ratings', COUNT(*) FROM ratings WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true)
UNION ALL
SELECT 'share_cards', COUNT(*) FROM share_cards WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true)
UNION ALL
SELECT 'reports', COUNT(*) FROM reports WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true)
UNION ALL
SELECT 'safety_events', COUNT(*) FROM safety_events WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true)
UNION ALL
SELECT 'meetups (is_demo)', COUNT(*) FROM meetups WHERE is_demo = true
UNION ALL
SELECT 'profiles (is_demo)', COUNT(*) FROM profiles WHERE is_demo = true;
```

### Шаг 6.2: Порядок удаления с учетом Foreign Keys

Удаление зависимых таблиц выполняется от дочерних сущностей к родительским:

```sql
BEGIN;

-- 1. Удаление сообщений демонстрационных встреч
DELETE FROM meetup_messages
WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true);

-- 2. Удаление участников демонстрационных встреч
DELETE FROM meetup_participants
WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true);

-- 3. Удаление событий демонстрационных встреч
DELETE FROM meetup_events
WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true);

-- 4. Удаление оценок демонстрационных встреч
DELETE FROM ratings
WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true);

-- 5. Удаление карточек шеринга демонстрационных встреч
DELETE FROM share_cards
WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true);

-- 6. Удаление репортов, связанных с демо-встречами или демо-пользователями
DELETE FROM reports
WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true)
   OR reporter_id IN (SELECT user_id FROM profiles WHERE is_demo = true)
   OR target_id IN (SELECT user_id FROM profiles WHERE is_demo = true);

-- 7. Удаление инцидентов безопасности демонстрационных встреч
DELETE FROM safety_events
WHERE meetup_id IN (SELECT id FROM meetups WHERE is_demo = true)
   OR reporter_id IN (SELECT user_id FROM profiles WHERE is_demo = true);

-- 8. Удаление демонстрационных встреч (родительская таблица встреч)
DELETE FROM meetups
WHERE is_demo = true;

-- 9. Удаление интересов демонстрационных пользователей
DELETE FROM user_interests
WHERE user_id IN (SELECT user_id FROM profiles WHERE is_demo = true);

-- 10. Удаление согласий демонстрационных пользователей
DELETE FROM consents
WHERE user_id IN (SELECT user_id FROM profiles WHERE is_demo = true);

-- 11. Удаление уведомлений демонстрационных пользователей
DELETE FROM notifications
WHERE user_id IN (SELECT user_id FROM profiles WHERE is_demo = true);

-- 12. Удаление сессий демонстрационных пользователей
DELETE FROM sessions
WHERE user_id IN (SELECT user_id FROM profiles WHERE is_demo = true);

-- 13. Удаление блокировок, затрагивающих демонстрационных пользователей
DELETE FROM blocks
WHERE blocker_id IN (SELECT user_id FROM profiles WHERE is_demo = true)
   OR blocked_id IN (SELECT user_id FROM profiles WHERE is_demo = true);

-- 14. Удаление демонстрационных профилей
DELETE FROM profiles
WHERE is_demo = true;

-- 15. Удаление синтетических пользователей
DELETE FROM users
WHERE id NOT IN (SELECT user_id FROM profiles);

COMMIT;
```

---

## 7. Правило отката: Backup-First Rollback Rule

> [!CRITICAL]
> **ПРАВИЛО ПЕРВООЧЕРЕДНОГО БЭКАПА**:
> Никаких деструктивных откатов базы данных без предварительного снятия дампа!
> При любых сбоях в работе приложения приоритетом является **Forward-Fix** (исправление кода вперед без изменения схемы данных).

### Порядок действий при возникновении сбоя:

1. **Создание резервной копии (Обязательно)**:
   Перед любыми манипуляциями с базой или схемой снимите полный дамп:
   ```bash
   railway run pg_dump $DATABASE_URL > backup_staging_dump.sql
   ```

2. **Откат версии приложения (Code Rollback)**:
   - В панели Railway (Deployments) выберите предыдущий успешный деплой и нажмите **Rollback**.
   - Откат кода Next.js не требует изменения схемы базы, если схема обратно совместима.

3. **Откат схемы базы данных (Только при критической несовместимости)**:
   - Не выполняйте удаление колонок (`DROP COLUMN`) или таблиц вручную на горячей базе.
   - При необходимости полного восстановления используйте снятый SQL-дамп:
     ```bash
     railway run psql $DATABASE_URL < backup_staging_dump.sql
     ```

---

## 8. Чек-лист проверки работоспособности стенда (Staging Verification)

После успешного деплоя выполните проверку:

- [ ] В браузере открывается URL приложения с верхним желтым баннером **STAGING ENVIRONMENT** и текстом: *«Не указывайте реальные адреса, телефоны, документы и другую чувствительную информацию.»*.
- [ ] Экран `/auth/login` отображает форму **"Закрытое тестирование"** и требует инвайт-код.
- [ ] Инвайт-код передается строго в POST body, не отражается в URL query параметрах, не сохраняется в LocalStorage/SessionStorage.
- [ ] При вводе неверного инвайт-кода доступ блокируется с ошибкой.
- [ ] При 5 неверных попытках срабатывает Rate Limit на 15 минут.
- [ ] После ввода корректного `STAGING_ACCESS_CODE` клиенту устанавливается `httpOnly` cookie (`now_staging_gate`).
- [ ] Форма ввода номера телефона разрешает только синтетические номера: `+79990000001`..`+79990000099`.
- [ ] Код `000000` отклоняется на экране ввода OTP.
- [ ] Ввод верного `STAGING_OTP_CODE` успешно авторизует пользователя и переводит на онбординг/профиль.
- [ ] Лента встреч отображает демо-встречи с бейджами зон.
- [ ] Завершение сессии (Logout) очищает куки и корректно возвращает на стартовый экран.

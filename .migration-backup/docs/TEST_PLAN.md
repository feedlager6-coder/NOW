# NOW / IRL — Comprehensive Test Plan & Quality Assurance Strategy

**Версия документа:** 2.0.0 (NOW / IRL Pivot — Group Offline Activity Coordinator)  
**Каноническая СУБД:** PostgreSQL 15+  
**Тестовые фреймворки:** Vitest (Unit, Concurrency & Integration), Playwright (E2E / Mobile Emulation), Zod, TypeScript  

---

## 1. Архитектурная стратегия тестирования NOW / IRL

В отличие от 1-на-1 сервисов, NOW / IRL — это групповой координатор офлайн-активностей в реальном времени. Ключевые риски и сценарии фокусируются на:
1. **Concurrency & Race Conditions:** одновременное вступление пользователей в «Огонёк» при исчерпании лимита мест (`max_participants`).
2. **Safety & Blocked User Masking:** взаимная невидимость и запрет совместного участия заблокированных пользователей (`blocks`).
3. **State Machine Integrity:** переходы состояний митапа (`draft` → `published` → `active` → `completed` / `cancelled` / `expired`) и отмена при недоборе участников.
4. **Data Minimization & Ephemeral Retention:** автоматический purge чатов через 12 часов после завершения митапа (при отсутствии флага `safety_review`).
5. **Anonymous Discovery Serialization:** гарантия отсутствия точных GPS-координат, фотографий лиц и PII до момента одобрения/вступления в митап.
6. **Zero-PII Logging:** сохранение надежного механизма маскирования логов.

---

## 2. Матрица тестов по срезам и слоям

| ID | Область | Описание тестового сценария | Ожидаемый результат | Уровень |
| :--- | :--- | :--- | :--- | :---: |
| **T-SCHEMA-01** | Схема БД | Применение миграций NOW / IRL к PostgreSQL (`db:migrate`) | 19 таблиц, 8 enums, уникальные и составные индексы созданы успешно | Integration (PG) |
| **T-RACE-01** | Concurrency | 2+ параллельных запроса `POST /api/meetups/:id/join` на последнее 1 свободное место | Ровно 1 участник получает `200 OK`, второй получает `409 Conflict («Мест нет»)`. `SELECT FOR UPDATE` предотвращает овербукинг | Integration / Vitest |
| **T-BLOCK-01** | Safety / Isolation | Пользователь B заблокирован пользователем A. Пользователь B запрашивает ленту `GET /api/meetups` | Митапы, созданные A, полностью отсутствуют в выдаче B (и наоборот) | Unit / Integration |
| **T-BLOCK-02** | Safety / Join Guard | Пользователь B заблокирован пользователем A. A уже является участником митапа M. B пытается сделать `join` в M | Запрос B отклоняется со статусом `403 Forbidden` / `SAFETY_RESTRICTION` без раскрытия факта блока | Integration |
| **T-FSM-01** | State Machine | Переход митапа: `published` → наступление `starts_at` → кворум достигнут → `active` | Статус обновлен на `active`, участники получают возможность подтвердить прибытие (check-in) | Unit |
| **T-FSM-02** | State Machine | Наступление `starts_at` при количестве участников < `min_participants` | Митап автоматически переходит в статус `cancelled` (или `expired`), участникам отправляется уведомление об отмене | Unit |
| **T-DISCOVERY-01** | Privacy / Anon | Запрос ленты активностей неавторизованным/сторонним пользователем | В ответе отсутствуют точные GPS (только `distance_band`, например `"до 1 км"`), отсутствуют фото лиц и реальные имена (только аватар-силуэт, возрастной диапазон, теги) | Unit / API |
| **T-ZONE-01** | Geofence / Whitelist | Попытка создания митапа с `zone_id`, отсутствующим в `public_zones` (или `is_active = false`) | Ошибка валидации `422 Unprocessable Entity` / `INVALID_PUBLIC_ZONE` | API |
| **T-RETENTION-01** | Data Privacy | Запуск фонового скрипта `npm run purge:chats` для митапа, завершенного более 12 часов назад | Сообщения чата митапа безвозвратно удалены (`DELETE`). Метаданные митапа сохранены | Integration |
| **T-RETENTION-02** | Safety Override | Запуск `npm run purge:chats` для митапа с открытым репортом/инцидентом (`safety_review`) | Чат сохранен для расследования службой безопасности | Integration |
| **T-RATING-01** | Community Trust | Повторная отправка отзыва `(meetup_id, rater_id, target_id)` от одного участника другому | `409 Conflict` (нарушение уникального составного индекса `ratings_unique_idx`) | Integration |
| **T-SAFETY-01** | Emergency / SOS | Открытие экрана Safety Help | Отображается прямая ссылка `tel:112`, честный дисклеймер об отсутствии полицейского наряда от приложения, список доверенных контактов | E2E / Unit |
| **T-LOGGER-01** | Zero-PII | Логирование запросов и событий с телефоном, токеном, телом чата | Все чувствительные поля заменяются на `[REDACTED]`, логгер не пишет PII | Unit |
| **T-E2E-MOBILE-01**| Mobile PWA | Загрузка главной страницы в разрешении 390x844 (iPhone 14) | Темная неоновая тема, интерактивные «Огоньки», кнопка «Собрать компанию», DEMO-дисклеймер | Playwright |

---

## 3. Критерии приемки тестов (Quality Gates)

1. **Строгая изоляция параллелизма:** Тест `T-RACE-01` должен выполняться с реальными параллельными промисами (`Promise.all`), эмулируя одновременные клики в последнюю секунду до старта.
2. **Нулевая утечка PII в Discovery:** Ни один endpoint публичной карты не должен возвращать `phone_lookup_hash`, `exact_latitude`, `exact_longitude`, `full_name` или `avatar_url` реальных пользователей.
3. **Гарантия 100% покрытия критических путей:** State Machine переходов митапа (`src/domain/meetup-machine.ts`) и блокировок (`src/domain/safety-guard.ts`) покрываются unit-тестами на 100% ветвлений.

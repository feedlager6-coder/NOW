# NOW / IRL — Architecture & System Design Specification

**Версия документа:** 2.0.0 (Phase 0 — Full Pivot Specification)  
**Архитектурный выбор:** Next.js 14+ PWA + PostgreSQL 15+ + Drizzle ORM (Вариант A)  
**Авторы:** CTO & Principal Architect  

---

## 1. Архитектурные основы и модульная структура

Приложение строится как **модульный монолит** на базе Next.js 14+ (App Router, Server Components, Route Handlers, TypeScript).

```
+-----------------------------------------------------------------------------------+
|                            NOW / IRL — MOBILE PWA CLIENT                          |
|   Dark Neon Theme (Tailwind CSS, Lucide Icons, Mobile-First PWA 390x844)          |
|   Screens: Home Map ("Огоньки"), Create Meetup, Live Countdown, Chat, Share-Card  |
+-----------------------------------------------------------------------------------+
                                       |
                       HTTPS / JSON API / Server-Sent Events
                                       v
+-----------------------------------------------------------------------------------+
|                             NEXT.JS APP ROUTER                                    |
|                                                                                   |
|  [Security & Rate-Limiting Middleware]                                            |
|   - Zero-Trust Input Guard & Zod Request Validator                                |
|   - Session Token Resolver & Age 18+ Verification Guard                           |
|   - Rate Limiter (Meetup creation: max 3/hour, Joins: max 10/hour, Messages: 1/sec)|
|                                                                                   |
|  [Domain Service Layer (Чистая бизнес-логика)]                                    |
|   +---------------------+  +---------------------+  +--------------------------+  |
|   |   MeetupService     |  |   SafetyService     |  |      ChatService         |  |
|   |   - transitionMeetup|  |   - Safety Help     |  |   - 12h Chat Retention   |  |
|   |   - FOR UPDATE lock |  |   - tel:112 trigger |  |   - Plaintext Sanitizer  |  |
|   |   - Whitelist zones |  |   - Reports & Blocks|  |   - Stop-words Flagging  |  |
|   +---------------------+  +---------------------+  +--------------------------+  |
|   +---------------------+  +---------------------+  +--------------------------+  |
|   |  ReputationService  |  |   ViralService      |  |      AuthService         |  |
|   |   - Mutual ratings  |  |   - PII-free Card   |  |   - phone_lookup_hash    |  |
|   |   - Anti-self-rate  |  |   - Video Flag      |  |   - Mock OTP Provider    |  |
|   +---------------------+  +---------------------+  +--------------------------+  |
|                                                                                   |
|  [Provider Abstraction Layer (Ports & Adapters)]                                  |
|   - IMapProvider         --> WhitelistZonesMapProvider (DEMO_PUBLIC_ZONE_1..3)    |
|   - INotificationProvider--> InAppNotificationAdapter (WebPush Ready)             |
|   - IOtpProvider         --> MockOtpProvider (Deterministic in dev/test)          |
|   - IAnalyticsProvider   --> InternalEventLogger (No 3rd-party PII egress)        |
|                                                                                   |
|  [Data Access Layer (Drizzle ORM & PostgreSQL)]                                   |
|   - PostgreSQL Connection Pool (pg / node-postgres)                               |
|   - Explicit Serializable/Row-Locked Transactions (`SELECT ... FOR UPDATE`)       |
+-----------------------------------------------------------------------------------+
                                       |
                         PostgreSQL Wire Protocol
                                       v
+-----------------------------------------------------------------------------------+
|                             POSTGRESQL DATABASE                                   |
|   - 19 Tables (meetups, participants, messages, ratings, zones, safety_events...) |
|   - Enums, Unique Indexes, Check Constraints                                      |
+-----------------------------------------------------------------------------------+
```

---

## 2. Конечные автоматы состояний (State Machines)

### 2.1. Meetup State Machine (`transitionMeetup`)
Все переходы статуса активности выполняются строго через централизованный сервис внутри транзакции:

```
                          [draft]
                             |
                             | (createMeetup)
                             v
                        [gathering] <-----------------+
                       /     |     \                  |
        (starts_at /  /      |      \ (creator        | (re-gather
      min_confirmed) /       |       \  cancel)       |  if participant
                    v        |        v               |  drops)
                [active]     |    [cancelled_by_      |
                /      \     |     creator]           |
 (completed)   /        \    |                        |
              v          v   | (ttl timeout / no joins)
        [completed]      [cancelled_by_system]
             |
             +---------> [safety_review] (если нажат Safety Help или открыт P0 репорт)
             |
             v
         [archived] (после истечения 12-часового retention окна)
```

**Инварианты митапа:**
1. **Защита от состояния гонки (Capacity Race Protection):** При вызове `joinMeetup(meetupId, userId)` сервер выполняет блокирующий запрос:
   ```sql
   SELECT id, capacity, status FROM meetups WHERE id = $1 FOR UPDATE;
   ```
   И подсчитывает количество активных участников:
   ```sql
   SELECT COUNT(*) FROM meetup_participants 
   WHERE meetup_id = $1 AND status IN ('joined', 'checked_in');
   ```
   Если лимит достигнут, транзакция отклоняется с ошибкой `MEETUP_CAPACITY_FULL`.
2. **Проверка блокировок (Blocked User Pair Check):** Если между кандидатом на вход и любым из уже вступивших участников существует запись в таблице `blocks` (в любую сторону), вход блокируется с ошибкой `BLOCKED_PARTICIPANT_CONFLICT`.
3. **Автоматическое закрытие просроченных встреч (Reaper):** Митапы, не набравшие участников до времени `starts_at + 15 min`, переводятся в `cancelled_by_system`.

### 2.2. Participant State Machine
- `invited`: приглашен (при приватном шеринге ссылки);
- `joined`: подтвердил участие, получил доступ к чату;
- `checked_in`: подтвердил физическое прибытие в публичную зону;
- `left`: добровольно покинул активность до старта;
- `removed`: исключен создателем активности или модератором;
- `reported`: помечен жалобой безопасности.

---

## 3. Realtime-стратегия и сетевой транспорт

Для первого этапа (MVP) в среде Replit выбирается прагматичный подход без внешних зависимостей:
1. **Live Activity Pulse (Экран Home):** Опрос списка огоньков с интервалом в 10 секунд (Polling) либо Server-Sent Events (SSE) эндпоинт `GET /api/meetups/live`.
2. **One-Time Group Chat (Экран активного митапа):** Адаптивный Smart Polling каждые 2.5 секунды во время нахождения пользователя на экране чата. Запросы легковесны (запрашиваются только сообщения с `created_at > last_seen_timestamp`).
3. **Готовность к WebSockets:** Сервисный слой полностью изолирован, что позволит без изменения UI-контрактов подключить WebSockets в Фазе 2 при росте нагрузки.

---

## 4. Абстракция картографического провайдера (MapProvider)

1. **Интерфейс:**
   ```typescript
   export interface IMapProvider {
     getWhitelistedZones(): Promise<ServiceZone[]>;
     getZoneById(zoneId: string): Promise<ServiceZone | null>;
     calculateDistanceBand(userLat: number, userLng: number, zoneLat: number, zoneLng: number): 'under_1km' | '1_to_3km' | 'over_3km';
   }
   ```
2. **Рендеринг «Огоньков»:** На клиенте отображается интерактивная стилизованная темная карта/псевдокарта. Координаты огонька соответствуют центроиду публичной зоны (`approximate_lat`, `approximate_lng`) с добавлением случайного смещения (джиггеринг до 150 метров), чтобы исключить триангуляцию точного местоположения людей.

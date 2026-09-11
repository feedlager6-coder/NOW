# NOW / IRL — API Specification (OpenAPI / REST Blueprint)

**Версия спецификации:** 2.0.0 (Phase 0 — Group Meetup API)  
**Формат данных:** JSON (`application/json`)  
**Аутентификация:** HTTP-Only Secure Cookie `now_session`  

---

## 1. Стандарты ответов и структуры ошибок

### 1.1. Успешный ответ
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-09-11T14:30:00.000Z",
    "requestId": "req_now_abc123"
  }
}
```

### 1.2. Структурированная ошибка
```json
{
  "success": false,
  "error": {
    "code": "MEETUP_CAPACITY_FULL",
    "message": "В данной активности больше нет свободных мест",
    "details": { "meetupId": "mtp_123", "capacity": 4, "currentParticipants": 4 }
  }
}
```

---

## 2. Эндпоинты аутентификации и профиля

- `POST /api/auth/request-otp`: Запрос тестового/mock OTP на телефон (Rate limit: 3/10 мин).
- `POST /api/auth/verify-otp`: Проверка OTP, установка сессионной куки `now_session`.
- `POST /api/auth/logout`: Инвалидация сессии в БД и очистка куки.
- `GET /api/me`: Данные текущего пользователя, подтверждение 18+, теги интересов, настройки приватности (показывать ли бейдж надежности).
- `PATCH /api/me`: Обновление Display Name, интересов, возраста, согласий.
- `DELETE /api/me`: Анонимизация аккаунта и отзыв всех сессий (при отсутствии незавершенных митапов).

---

## 3. Каталог типов активностей и публичных зон

### 3.1. `GET /api/activity-types`
- **Доступ:** Public.
- **Response:** Массив доступных категорий:
  ```json
  [
    { "id": "coffee", "title": "Кофе / Разговор", "icon": "coffee", "defaultDuration": 45 },
    { "id": "walk", "title": "Прогулка", "icon": "footprints", "defaultDuration": 60 },
    { "id": "football", "title": "Футбол / Спорт", "icon": "trophy", "defaultDuration": 90 },
    { "id": "ufc_watch", "title": "Просмотр спорта / UFC", "icon": "tv", "defaultDuration": 120 },
    { "id": "boardgames", "title": "Настольные игры", "icon": "dice", "defaultDuration": 90 },
    { "id": "workout", "title": "Воркаут / Пробежка", "icon": "dumbbell", "defaultDuration": 60 }
  ]
  ```

### 3.2. `GET /api/zones`
- **Доступ:** Public. Возвращает список публичных whitelist-зон (`DEMO_PUBLIC_ZONE_1..3`).

---

## 4. Обнаружение и жизненный цикл активностей («Огоньки»)

### 4.1. `GET /api/meetups` (Лента живых активностей)
- **Query Params:** `activityType`, `distanceBand` (`under_1km`, `1_to_3km`), `status` (`gathering`, `active`).
- **Response:** Анонимизированный список «Огоньков»:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "mtp_001",
        "activityType": { "id": "football", "title": "Футбол / Спорт", "icon": "trophy" },
        "approximateZone": "Вымышленная демонстрационная набережная (Зона 1)",
        "distanceBand": "under_1km",
        "startsAt": "2026-09-11T15:00:00.000Z",
        "countdownSeconds": 900,
        "capacity": 6,
        "participantsCount": 4,
        "seatsLeft": 2,
        "status": "gathering",
        "anonymousSilhouettes": [
          { "silhouetteId": "sil_1", "ageBand": "22–25", "reliabilityBadge": "3+ встречи" },
          { "silhouetteId": "sil_2", "ageBand": "26–30", "reliabilityBadge": "Регулярный" }
        ]
      }
    ]
  }
  ```

### 4.2. `POST /api/meetups` (Создать огонёк «Собрать компанию»)
- **Request Body (Zod):**
  ```json
  {
    "activityTypeId": "football",
    "zoneId": "DEMO_PUBLIC_ZONE_1",
    "startsAt": "2026-09-11T15:00:00.000Z",
    "durationMinutes": 90,
    "capacity": 6,
    "discoveryRadiusMeters": 2000,
    "safeDescription": "Собираем команду 3 на 3, мяч есть"
  }
  ```
- **Серверная валидация:** Проверка `zoneId` по whitelist `service_zones`, проверка capacity ($2 \le \text{capacity} \le 12$), проверка лимита активностей создателя (не более 3 в час). Создает митап в статусе `gathering`.

### 4.3. `POST /api/meetups/:id/join`
- **Логика:** Транзакционный вход с `SELECT ... FOR UPDATE`, проверка capacity, проверка на отсутствие взаимного бана с другими участниками (`blocks`).
- **Response:** `{ "status": "joined", "seatsLeft": 1 }`.

### 4.4. `POST /api/meetups/:id/leave`
- Добровольный выход из митапа до его начала (освобождает слот).

### 4.5. `POST /api/meetups/:id/check-in`
- Отметка участника «Я на месте» в публичной зоне встречи.

### 4.6. `POST /api/meetups/:id/complete`
- Подтверждение безопасного завершения митапа. При подтверждении 2+ участниками переходит в `completed`.

---

## 5. Одноразовый групповой чат (One-Time Group Chat)

### 5.1. `GET /api/meetups/:id/messages`
- Доступ строго для активных подтвержденных участников митапа (`joined`, `checked_in`).
- Если прошло более 12 часов с момента завершения митапа, возвращает `410 Gone: Chat retention expired`.

### 5.2. `POST /api/meetups/:id/messages`
- **Request Body:** `{ "body": "Буду в синей ветровке возле входа" }`.
- **Санитизация:** Plain text sanitization, стоп-лист триггеров приватных мест и домогательств.

---

## 6. Безопасность, репутация и Share-Card

### 6.1. `POST /api/meetups/:id/safety-help` (Честный SOS)
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "safetyEventId": "safe_evt_999",
      "emergencyPhoneCallUrl": "tel:112",
      "disclaimer": "NOW / IRL не является полицией и не гарантирует выезд помощи. При непосредственной угрозе немедленно звоните 112.",
      "instructions": [
        "Немедленно отойдите от группы к персоналу заведения или охране.",
        "Привлеките внимание окружающих громким голосом.",
        "Нажмите кнопку вызова 112."
      ],
      "meetupStatus": "safety_review"
    }
  }
  ```

### 6.2. `POST /api/meetups/:id/ratings` (Взаимная репутация)
- **Request Body (Zod):**
  ```json
  {
    "targetUserId": "usr_target_456",
    "showedUp": true,
    "onTime": true,
    "respectful": true,
    "wouldJoinAgain": true
  }
  ```
- **Правила:** Только для участников того же митапа, только после `completed`, нельзя оценить себя (`author_id <> target_id`), максимум 1 оценка на пару за встречу.

### 6.3. `POST /api/meetups/:id/share-card`
- Генерация виральной карточки встречи без PII (логотип, активность, город, длительность, число участников).

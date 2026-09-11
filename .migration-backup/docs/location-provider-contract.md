# Location Provider Contract & Zero-PII Geo Guidelines: NOW / IRL

## 1. Overview & Core Philosophy
Сервис спонтанных встреч **NOW / IRL** придерживается строгого принципа **Zero-PII Geolocation**:
1. Сервис **никогда не отслеживает** и **не сохраняет** точные домашние или текущие координаты пользователя.
2. Сервис оперирует исключительно **белыми публичными зонами** (`service_zones`) и **диапазонами расстояний** (`distance_band`).
3. Вся картография подключается через единый абстрактный интерфейс `LocationProvider`, гарантирующий изоляцию провайдера от бизнес-логики.

---

## 2. TypeScript Контракт Провайдера (`LocationProvider`)

```typescript
export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface GeocodedPublicPlace {
  id: string;
  name: string;
  category: 'park' | 'cafe' | 'sports_ground' | 'square' | 'promenade' | 'coworking';
  isPublic: boolean;
  approximateLat: number; // Округлено до 3-4 знаков (~100м точность)
  approximateLng: number; // Округлено до 3-4 знаков
  zoneId: string;
}

export interface LocationProviderContract {
  /**
   * Проверка, попадает ли точка в одну из разрешенных белых зон города.
   */
  isWithinWhitelistedZone(lat: number, lng: number): Promise<{ whitelisted: boolean; zoneId?: string }>;

  /**
   * Поиск только публичных объектов поблизости.
   * Строгий фильтр: исключает жилые дома, квартиры, приватные участки и отели.
   */
  searchPublicPlaces(query: string, zoneId: string): Promise<GeocodedPublicPlace[]>;

  /**
   * Преобразование расстояния в безопасный диапазон для отображения в Discovery Card.
   * Никаких точных метров: "до 500 м", "до 1 км", "1–3 км".
   */
  formatDistanceBand(distanceKm: number): string;
}
```

---

## 3. Требования к валидации и гео-безопасности

### 3.1. Запрет приватных адресов (No Private/Residential Locations)
- Геокодер обязан валидировать тип POI (Point of Interest).
- Если пользователь пытается ввести адрес вида *«ул. Ленина 15, кв. 42»* или геоточка указывает на жилой многоквартирный дом, система обязана отклонить создание активности с кодом ошибки `PUBLIC_PLACE_REQUIRED`:
  > «Для безопасности всех участников встречи разрешены только в открытых общественных местах (парки, кофейни, набережные, спортивные площадки).»

### 3.2. Округление координат (Coordinate Coarsening)
- Ни при каких обстоятельствах в базу данных `meetups` не записываются высокоточные координаты GPS с точностью до метра.
- Максимальное разрешение координат на бэкенде: **не более 4 десятичных знаков** (~11 метров в городской черте), а для анонимных карточек Discovery — только идентификатор зоны `zoneId` и название публичного объекта (`publicPlaceName`).

### 3.3. Локальные ограничения зон (Geofencing)
- Любая активность должна быть привязана к записи из таблицы `service_zones`, где флаг `is_whitelisted = true`.
- Попытка создать огонёк за пределами обслуживаемой зоны блокируется на уровне API.

---

## 4. План перехода от Mock/DemoMap к реальным провайдерам

1. **Фаза 1 (Текущая):** `MockMapProvider` / `DemoMap` с SVG-картой и 5 абстрактными зонами DEMO CITY.
2. **Фаза 2:** Подключение открытых гео-данных OpenStreetMap (OSM) / Overpass API для валидации публичных парков и площадей.
3. **Фаза 3:** Подключение коммерческих провайдеров картографии (Mapbox / 2GIS / Яндекс.Карты) с сохранением контракта `LocationProviderContract`.

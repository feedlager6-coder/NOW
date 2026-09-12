import type { AgeBand } from '@/domain/auth/age-service';

export interface DemoUser {
  id: string;
  phone: string;
  displayName: string;
  bio: string;
  ageBand: AgeBand;
  reliabilityScore: number;
  avatarRef: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'demo-user-alex',
    phone: '+79990000001',
    displayName: '[DEMO] Алекс',
    bio: 'Люблю вечерние прогулки, кофе и IT-дискуссии.',
    ageBand: '22-25',
    reliabilityScore: 100,
    avatarRef: '/avatars/silhouette-1.svg',
  },
  {
    id: 'demo-user-mira',
    phone: '+79990000002',
    displayName: '[DEMO] Мира',
    bio: 'Настолки, квизы и совместная учёба по выходным.',
    ageBand: '18-21',
    reliabilityScore: 99,
    avatarRef: '/avatars/silhouette-2.svg',
  },
  {
    id: 'demo-user-timur',
    phone: '+79990000003',
    displayName: '[DEMO] Тимур',
    bio: 'Футбол, воркаут и просмотр главных кардов UFC.',
    ageBand: '26-30',
    reliabilityScore: 97,
    avatarRef: '/avatars/silhouette-3.svg',
  },
  {
    id: 'demo-user-sasha',
    phone: '+79990000004',
    displayName: '[DEMO] Саша',
    bio: 'Пробежки в парке и настольный теннис.',
    ageBand: '22-25',
    reliabilityScore: 98,
    avatarRef: '/avatars/silhouette-4.svg',
  },
];

export const DEMO_ACTIVITY_TYPES = [
  {
    id: 'walking',
    title: 'Прогулка',
    icon: '🚶',
    defaultDurationMinutes: 60,
    defaultCapacity: 5,
    isActive: true,
  },
  {
    id: 'coffee',
    title: 'Кофе',
    icon: '☕',
    defaultDurationMinutes: 45,
    defaultCapacity: 4,
    isActive: true,
  },
  {
    id: 'football',
    title: 'Футбол',
    icon: '⚽',
    defaultDurationMinutes: 90,
    defaultCapacity: 10,
    isActive: true,
  },
  {
    id: 'sports_viewing',
    title: 'UFC / спорт',
    icon: '📺',
    defaultDurationMinutes: 120,
    defaultCapacity: 6,
    isActive: true,
  },
  {
    id: 'board_games',
    title: 'Настольные игры',
    icon: '🎲',
    defaultDurationMinutes: 90,
    defaultCapacity: 4,
    isActive: true,
  },
  {
    id: 'study',
    title: 'Учёба',
    icon: '📚',
    defaultDurationMinutes: 60,
    defaultCapacity: 4,
    isActive: true,
  },
  {
    id: 'workout',
    title: 'Воркаут',
    icon: '⚡',
    defaultDurationMinutes: 45,
    defaultCapacity: 5,
    isActive: true,
  },
];

export const DEMO_PUBLIC_ZONES = [
  {
    id: 'DEMO_ZONE_NORTH',
    city: 'DEMO CITY',
    name: 'DEMO ZONE NORTH',
    description: 'Северный демонстрационный район без реальных координат',
    approximateLat: '55.760000',
    approximateLng: '37.600000',
    publicPlaceRequired: true,
    isWhitelisted: true,
  },
  {
    id: 'DEMO_ZONE_CENTER',
    city: 'DEMO CITY',
    name: 'DEMO ZONE CENTER',
    description: 'Центральная демонстрационная площадь без реальных координат',
    approximateLat: '55.750000',
    approximateLng: '37.610000',
    publicPlaceRequired: true,
    isWhitelisted: true,
  },
  {
    id: 'DEMO_ZONE_PARK',
    city: 'DEMO CITY',
    name: 'DEMO ZONE PARK',
    description: 'Парковая демонстрационная зона без реальных координат',
    approximateLat: '55.740000',
    approximateLng: '37.620000',
    publicPlaceRequired: true,
    isWhitelisted: true,
  },
  {
    id: 'DEMO_ZONE_RIVER',
    city: 'DEMO CITY',
    name: 'DEMO ZONE RIVER',
    description: 'Набережная демонстрационная зона без реальных координат',
    approximateLat: '55.730000',
    approximateLng: '37.630000',
    publicPlaceRequired: true,
    isWhitelisted: true,
  },
  {
    id: 'DEMO_ZONE_SPORT',
    city: 'DEMO CITY',
    name: 'DEMO ZONE SPORT',
    description: 'Спортивный демонстрационный кластер без реальных координат',
    approximateLat: '55.720000',
    approximateLng: '37.640000',
    publicPlaceRequired: true,
    isWhitelisted: true,
  },
];

export interface MeetingPoint {
  id: string;
  zoneId: string;
  label: string;
  description: string;
}

export interface ServiceZoneInfo {
  id: string;
  city: string;
  name: string;
  description: string;
  isWhitelisted: boolean;
}

export const SAFE_MEETING_POINTS: Record<string, MeetingPoint[]> = {
  DEFAULT: [
    {
      id: 'main_entrance',
      zoneId: 'DEFAULT',
      label: 'Главный вход',
      description: 'Открытая площадка перед центральным входом',
    },
    {
      id: 'fountain',
      zoneId: 'DEFAULT',
      label: 'У фонтана',
      description: 'Открытый сквер с лавочками вокруг центрального фонтана',
    },
    {
      id: 'central_square',
      zoneId: 'DEFAULT',
      label: 'Центральная площадка',
      description: 'Широкая пешеходная площадь с хорошим обзором',
    },
    {
      id: 'sports_zone',
      zoneId: 'DEFAULT',
      label: 'У спортивной зоны',
      description: 'Рядом со спортивной коробкой и турниками',
    },
    {
      id: 'infostand',
      zoneId: 'DEFAULT',
      label: 'Возле инфостенда',
      description: 'Хорошо освещённый информационный стенд на аллее',
    },
  ],
};

export interface MapProvider {
  getZones(): Promise<ServiceZoneInfo[]>;
  getMeetingPoints(zoneId: string): Promise<MeetingPoint[]>;
  validateMeetingPoint(zoneId: string, pointLabel: string): { valid: boolean; label: string };
}

export class MockMapProvider implements MapProvider {
  private zones: ServiceZoneInfo[] = [
    {
      id: 'DEMO_ZONE_CENTER',
      city: 'DEMO CITY',
      name: 'Центральный парк и набережная',
      description: 'Главная пешеходная зона города с круглосуточным освещением',
      isWhitelisted: true,
    },
    {
      id: 'DEMO_ZONE_NORTH',
      city: 'DEMO CITY',
      name: 'Северный бульвар',
      description: 'Аллея с кофейнями и открытыми летними верандами',
      isWhitelisted: true,
    },
    {
      id: 'DEMO_ZONE_PARK',
      city: 'DEMO CITY',
      name: 'Городской сквер искусств',
      description: 'Открытая площадь с лавочками и пешеходными дорожками',
      isWhitelisted: true,
    },
    {
      id: 'DEMO_ZONE_RIVER',
      city: 'DEMO CITY',
      name: 'Речной променад',
      description: 'Широкая набережная, велосипедные и пешеходные полосы',
      isWhitelisted: true,
    },
    {
      id: 'DEMO_ZONE_SPORT',
      city: 'DEMO CITY',
      name: 'Спортивный кластер',
      description: 'Воркаут-площадки, открытые теннисные столы и поля',
      isWhitelisted: true,
    },
  ];

  public async getZones(): Promise<ServiceZoneInfo[]> {
    return this.zones;
  }

  public async getMeetingPoints(zoneId: string): Promise<MeetingPoint[]> {
    const specific = SAFE_MEETING_POINTS[zoneId];
    if (specific && specific.length > 0) return specific;
    return SAFE_MEETING_POINTS.DEFAULT;
  }

  public validateMeetingPoint(zoneId: string, pointLabel: string): { valid: boolean; label: string } {
    const trimmed = pointLabel.trim();
    if (!trimmed) {
      return { valid: false, label: '' };
    }

    const available = SAFE_MEETING_POINTS[zoneId] || SAFE_MEETING_POINTS.DEFAULT;
    const found = available.find(
      (p) => p.label.toLowerCase() === trimmed.toLowerCase() || p.id === trimmed
    );

    if (found) {
      return { valid: true, label: found.label };
    }

    // Reject arbitrary private addresses / home addresses
    return { valid: false, label: '' };
  }
}

export const mapProvider = new MockMapProvider();

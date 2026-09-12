import { MeetingPoint } from './map-provider';

export interface NavigationLinkProvider {
  getYandexMapsUrl(point: MeetingPoint): string | null;
  get2GisUrl(point: MeetingPoint): string | null;
  isAvailable(): boolean;
  getPlaceholderExplanation(): string;
}

export class MockNavigationLinkProvider implements NavigationLinkProvider {
  public isAvailable(): boolean {
    // In this phase, external navigation APIs and GPS coordinates are intentionally disabled
    return false;
  }

  public getYandexMapsUrl(_point: MeetingPoint): string | null {
    // Returns null to prevent generating misleading links from fictitious coordinates
    return null;
  }

  public get2GisUrl(_point: MeetingPoint): string | null {
    // Returns null to prevent generating misleading links from fictitious coordinates
    return null;
  }

  public getPlaceholderExplanation(): string {
    return 'Маршрут станет доступен после подключения карты и одобренных точек.';
  }
}

export const navigationLinkProvider = new MockNavigationLinkProvider();

import { DEMO_PUBLIC_ZONES } from '@/lib/demo-data';

export interface MapZone {
  id: string;
  city: string;
  name: string;
  description: string;
  approximateLat: string;
  approximateLng: string;
  isWhitelisted: boolean;
}

export interface MapProvider {
  getZones(): Promise<MapZone[]>;
  getZoneById(zoneId: string): Promise<MapZone | undefined>;
  formatDistance(distanceKm: number | null | undefined): string;
}

/**
 * MockMapProvider for MVP: Isolates map logic from external proprietary APIs.
 * In future phases, a GeoCatalogProvider or OSM-derived provider can implement this interface.
 * // TODO: Before using OSM-derived map tiles or objects in production, implement required attribution and review ODbL/provider terms.
 */
export class MockMapProvider implements MapProvider {
  async getZones(): Promise<MapZone[]> {
    return DEMO_PUBLIC_ZONES.map((z) => ({
      ...z,
      approximateLat: z.approximateLat,
      approximateLng: z.approximateLng,
      description: z.description,
    }));
  }

  async getZoneById(zoneId: string): Promise<MapZone | undefined> {
    const zones = await this.getZones();
    return zones.find((z) => z.id === zoneId);
  }

  formatDistance(distanceKm: number | null | undefined): string {
    if (distanceKm == null || isNaN(distanceKm)) {
      return 'в вашем районе';
    }
    if (distanceKm < 0.5) return 'до 500 м';
    if (distanceKm <= 1.0) return 'до 1 км';
    if (distanceKm <= 3.0) return '1–3 км';
    return 'более 3 км';
  }
}

export const mapProvider = new MockMapProvider();

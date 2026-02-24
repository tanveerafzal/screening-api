import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import type {
  ScreeningResponse,
  ScreeningCategory,
  CoveWebhookPayload,
  CoveWebhookResult,
} from '../types/index.js';

const CATEGORY_TO_COVE_FIELD: Partial<Record<ScreeningCategory, keyof CoveWebhookPayload>> = {
  CRIME: 'criminal_scan',
  FRAUD: 'fraud_scan',
  SANCTIONED: 'global_clearance_scan',
  PEP_ASSOCIATE: 'known_affiliation_scan',
  TERRORISM: 'ofac_global_terrorist_scan',
  PEP: 'politically_exposed_person_scan',
  POI: 'public_profile_scan',
  WANTED: 'public_safety_scan',
  // DEBARMENT and TRAFFICKING both map to other_scan (handled separately)
};

export class CoveWebhookService {
  private client: AxiosInstance | null;

  constructor() {
    if (config.coveWebhookUrl) {
      this.client = axios.create({
        baseURL: config.coveWebhookUrl,
        timeout: config.requestTimeoutMs,
        headers: {
          'Content-Type': 'application/json',
          ...(config.coveWebhookApiKey
            ? { 'x-api-key': config.coveWebhookApiKey }
            : {}),
        },
      });
    } else {
      this.client = null;
    }
  }

  transformToCovePayload(response: ScreeningResponse): CoveWebhookPayload {
    const payload: CoveWebhookPayload = {
      criminal_scan: 'CLEAR',
      fraud_scan: 'CLEAR',
      global_clearance_scan: 'CLEAR',
      known_affiliation_scan: 'CLEAR',
      ofac_global_terrorist_scan: 'CLEAR',
      other_scan: 'CLEAR',
      politically_exposed_person_scan: 'CLEAR',
      public_court_records: 'CLEAR',
      public_profile_scan: 'CLEAR',
      public_safety_scan: 'CLEAR',
      sex_offender_scan: 'CLEAR',
    };

    for (const result of Object.values(response.results)) {
      for (const [category, hits] of Object.entries(result.hits)) {
        if (hits.length === 0) continue;

        const screeningCategory = categoryKeyToEnum(category);
        if (!screeningCategory) continue;

        // DEBARMENT and TRAFFICKING both map to other_scan
        if (screeningCategory === 'DEBARMENT' || screeningCategory === 'TRAFFICKING') {
          payload.other_scan = 'HIT';
        } else {
          const coveField = CATEGORY_TO_COVE_FIELD[screeningCategory];
          if (coveField) {
            payload[coveField] = 'HIT';
          }
        }
      }
    }

    return payload;
  }

  async send(response: ScreeningResponse): Promise<CoveWebhookResult> {
    if (!this.client) {
      return { success: true };
    }

    const payload = this.transformToCovePayload(response);

    try {
      const res = await this.client.post('', payload);
      return { success: true, statusCode: res.status };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }
}

function categoryKeyToEnum(key: string): ScreeningCategory | null {
  const map: Record<string, ScreeningCategory> = {
    sanctioned: 'SANCTIONED',
    terrorism: 'TERRORISM',
    wanted: 'WANTED',
    fraud: 'FRAUD',
    crime: 'CRIME',
    trafficking: 'TRAFFICKING',
    pep: 'PEP',
    debarment: 'DEBARMENT',
    poi: 'POI',
    pepAssociate: 'PEP_ASSOCIATE',
  };
  return map[key] ?? null;
}

// Singleton instance
export const coveWebhookService = new CoveWebhookService();

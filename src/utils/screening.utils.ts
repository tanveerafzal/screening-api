import { screeningService } from '../services/screening.service.js';
import type {
  MatchRequest,
  MatchOptions,
  ScoredEntity,
  RiskLevel,
  ScreeningCategory,
  ScreeningHit,
  ScreeningResult,
  ScreeningResponse,
} from '../types/index.js';

export const RISK_ORDER: Record<RiskLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export interface TopicMapping {
  category: ScreeningCategory;
  riskLevel: RiskLevel;
}

export const TOPIC_MAPPINGS: Record<string, TopicMapping> = {
  // SANCTIONED — critical (OFAC, EU, UN, linked entities)
  'sanction': { category: 'SANCTIONED', riskLevel: 'critical' },
  'sanction.linked': { category: 'SANCTIONED', riskLevel: 'critical' },
  'sanction.counter': { category: 'SANCTIONED', riskLevel: 'critical' },

  // TERRORISM — critical
  'crime.terror': { category: 'TERRORISM', riskLevel: 'critical' },

  // WANTED — critical (public safety)
  'wanted': { category: 'WANTED', riskLevel: 'critical' },

  // FRAUD — high (financial crime, cybercrime)
  'crime.fraud': { category: 'FRAUD', riskLevel: 'high' },
  'crime.fin': { category: 'FRAUD', riskLevel: 'high' },
  'crime.cyber': { category: 'FRAUD', riskLevel: 'high' },

  // CRIME — high (general criminal records)
  'crime': { category: 'CRIME', riskLevel: 'high' },
  'crime.war': { category: 'CRIME', riskLevel: 'high' },
  'crime.boss': { category: 'CRIME', riskLevel: 'high' },
  'crime.env': { category: 'CRIME', riskLevel: 'high' },
  'crime.theft': { category: 'CRIME', riskLevel: 'high' },

  // TRAFFICKING — high (drug, human trafficking, forced labor)
  'crime.traffick': { category: 'TRAFFICKING', riskLevel: 'high' },
  'crime.traffick.drug': { category: 'TRAFFICKING', riskLevel: 'high' },
  'crime.traffick.human': { category: 'TRAFFICKING', riskLevel: 'high' },
  'forced.labor': { category: 'TRAFFICKING', riskLevel: 'high' },

  // PEP — medium (politically exposed persons)
  'role.pep': { category: 'PEP', riskLevel: 'medium' },

  // DEBARMENT — medium (regulatory actions, procurement exclusions)
  'debarment': { category: 'DEBARMENT', riskLevel: 'medium' },
  'reg.action': { category: 'DEBARMENT', riskLevel: 'medium' },
  'reg.warn': { category: 'DEBARMENT', riskLevel: 'medium' },

  // POI — low (persons of interest, public profile)
  'poi': { category: 'POI', riskLevel: 'low' },

  // PEP_ASSOCIATE — low (relatives/close associates, known affiliations)
  'role.rca': { category: 'PEP_ASSOCIATE', riskLevel: 'low' },
};

export const CATEGORY_KEY: Record<ScreeningCategory, keyof ScreeningResult['hits']> = {
  SANCTIONED: 'sanctioned',
  TERRORISM: 'terrorism',
  WANTED: 'wanted',
  FRAUD: 'fraud',
  CRIME: 'crime',
  TRAFFICKING: 'trafficking',
  PEP: 'pep',
  DEBARMENT: 'debarment',
  POI: 'poi',
  PEP_ASSOCIATE: 'pepAssociate',
};

export function categorizeEntity(entity: ScoredEntity): ScreeningHit[] {
  const topics: string[] = entity.properties['topics'] ?? [];
  const hits: ScreeningHit[] = [];
  const seenCategories = new Set<ScreeningCategory>();

  for (const topic of topics) {
    const mapping = TOPIC_MAPPINGS[topic];
    if (mapping && !seenCategories.has(mapping.category)) {
      seenCategories.add(mapping.category);
      hits.push({
        id: entity.id,
        caption: entity.caption,
        score: entity.score,
        category: mapping.category,
        riskLevel: mapping.riskLevel,
        datasets: entity.datasets,
        topics,
      });
    }
  }

  return hits;
}

export function buildSummary(hits: ScreeningResult['hits']): string {
  const parts: string[] = [];

  if (hits.sanctioned.length > 0) {
    const listCount = new Set(hits.sanctioned.flatMap((h) => h.datasets)).size;
    parts.push(`Matched ${listCount} sanctions list${listCount !== 1 ? 's' : ''}`);
  }
  if (hits.terrorism.length > 0) {
    parts.push(`${hits.terrorism.length} terrorism record${hits.terrorism.length !== 1 ? 's' : ''}`);
  }
  if (hits.wanted.length > 0) {
    parts.push(`${hits.wanted.length} wanted record${hits.wanted.length !== 1 ? 's' : ''}`);
  }
  if (hits.fraud.length > 0) {
    parts.push(`${hits.fraud.length} fraud record${hits.fraud.length !== 1 ? 's' : ''}`);
  }
  if (hits.crime.length > 0) {
    parts.push(`${hits.crime.length} crime record${hits.crime.length !== 1 ? 's' : ''}`);
  }
  if (hits.trafficking.length > 0) {
    parts.push(`${hits.trafficking.length} trafficking record${hits.trafficking.length !== 1 ? 's' : ''}`);
  }
  if (hits.pep.length > 0) {
    parts.push(`${hits.pep.length} PEP record${hits.pep.length !== 1 ? 's' : ''}`);
  }
  if (hits.debarment.length > 0) {
    parts.push(`${hits.debarment.length} debarment/regulatory record${hits.debarment.length !== 1 ? 's' : ''}`);
  }
  if (hits.poi.length > 0) {
    parts.push(`${hits.poi.length} person of interest record${hits.poi.length !== 1 ? 's' : ''}`);
  }
  if (hits.pepAssociate.length > 0) {
    parts.push(`${hits.pepAssociate.length} PEP associate record${hits.pepAssociate.length !== 1 ? 's' : ''}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No matches';
}

export async function performScreening(
  queries: MatchRequest,
  options: MatchOptions
): Promise<ScreeningResponse> {
  const matchResponse = await screeningService.match(queries, options);

  const screeningResults: Record<string, ScreeningResult> = {};
  let flagged = 0;
  let review = 0;
  let clear = 0;

  for (const [queryId, matchResult] of Object.entries(matchResponse.responses)) {
    const hits: ScreeningResult['hits'] = {
      sanctioned: [],
      terrorism: [],
      wanted: [],
      fraud: [],
      crime: [],
      trafficking: [],
      pep: [],
      debarment: [],
      poi: [],
      pepAssociate: [],
    };

    let highestRisk: RiskLevel | null = null;

    for (const entity of matchResult.results) {
      const entityHits = categorizeEntity(entity);

      for (const hit of entityHits) {
        const key = CATEGORY_KEY[hit.category];
        hits[key].push(hit);

        if (!highestRisk || RISK_ORDER[hit.riskLevel] > RISK_ORDER[highestRisk]) {
          highestRisk = hit.riskLevel;
        }
      }
    }

    const totalHits = Object.values(hits).reduce((sum, arr) => sum + arr.length, 0);

    let verdict: ScreeningResult['verdict'];
    if (totalHits === 0) {
      verdict = 'CLEAR';
      clear++;
    } else if (highestRisk === 'critical' || highestRisk === 'high') {
      verdict = 'FLAG';
      flagged++;
    } else {
      verdict = 'REVIEW';
      review++;
    }

    screeningResults[queryId] = {
      query: matchResult.query,
      verdict,
      riskLevel: highestRisk,
      summary: buildSummary(hits),
      hits,
      totalHits,
    };
  }

  const queryCount = Object.keys(queries.queries).length;

  return {
    results: screeningResults,
    summary: {
      totalScreened: queryCount,
      flagged,
      review,
      clear,
    },
  };
}

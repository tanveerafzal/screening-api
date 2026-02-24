// Entity schemas supported by OpenSanctions
export type EntitySchema =
  | 'Person'
  | 'Company'
  | 'Organization'
  | 'LegalEntity'
  | 'Vessel'
  | 'Aircraft'
  | 'CryptoWallet'
  | 'Address'
  | 'Identification';

// Properties for different entity types
export interface PersonProperties {
  name?: string[];
  firstName?: string[];
  lastName?: string[];
  middleName?: string[];
  fatherName?: string[];
  motherName?: string[];
  birthDate?: string[];
  birthPlace?: string[];
  nationality?: string[];
  country?: string[];
  gender?: string[];
  idNumber?: string[];
  passportNumber?: string[];
  taxNumber?: string[];
  address?: string[];
  phone?: string[];
  email?: string[];
}

export interface CompanyProperties {
  name?: string[];
  alias?: string[];
  jurisdiction?: string[];
  country?: string[];
  registrationNumber?: string[];
  taxNumber?: string[];
  address?: string[];
  website?: string[];
  phone?: string[];
  email?: string[];
}

export interface VesselProperties {
  name?: string[];
  imoNumber?: string[];
  mmsi?: string[];
  flag?: string[];
  type?: string[];
  owner?: string[];
}

export interface CryptoWalletProperties {
  publicKey?: string[];
  currency?: string[];
  holder?: string[];
}

export type EntityProperties =
  | PersonProperties
  | CompanyProperties
  | VesselProperties
  | CryptoWalletProperties
  | Record<string, string[]>;

// Match Query
export interface MatchQuery {
  schema: EntitySchema;
  properties: EntityProperties;
}

export interface MatchRequest {
  queries: Record<string, MatchQuery>;
}

// Match Response
export interface FeatureScore {
  feature: string;
  score: number;
}

export interface ScoredEntity {
  id: string;
  caption: string;
  schema: EntitySchema;
  properties: Record<string, string[]>;
  datasets: string[];
  referents: string[];
  target: boolean;
  first_seen: string;
  last_seen: string;
  last_change: string;
  score: number;
  features: FeatureScore[];
  match: boolean;
}

export interface EntityMatchResult {
  query: MatchQuery;
  results: ScoredEntity[];
  total: {
    value: number;
    relation: 'eq' | 'gte';
  };
}

export interface MatchResponse {
  responses: Record<string, EntityMatchResult>;
}

// Search Request/Response
export interface SearchParams {
  q: string;
  schema?: EntitySchema;
  limit?: number;
  offset?: number;
  countries?: string[];
  topics?: string[];
  datasets?: string[];
  fuzzy?: boolean;
  simple?: boolean;
}

export interface SearchResult {
  id: string;
  caption: string;
  schema: EntitySchema;
  properties: Record<string, string[]>;
  datasets: string[];
  referents: string[];
  target: boolean;
  first_seen: string;
  last_seen: string;
  last_change: string;
  score: number;
}

export interface Facet {
  label: string;
  count: number;
}

export interface SearchResponse {
  results: SearchResult[];
  facets: {
    countries?: Facet[];
    topics?: Facet[];
    datasets?: Facet[];
  };
  limit: number;
  offset: number;
  total: {
    value: number;
    relation: 'eq' | 'gte';
  };
}

// Entity Response
export interface EntityResponse {
  id: string;
  caption: string;
  schema: EntitySchema;
  properties: Record<string, (string | EntityResponse)[]>;
  datasets: string[];
  referents: string[];
  target: boolean;
  first_seen: string;
  last_seen: string;
  last_change: string;
}

// Health/Status
export interface StatusResponse {
  status: 'ok' | 'error';
  message?: string;
}

// Catalog
export interface Dataset {
  name: string;
  title: string;
  summary?: string;
  url?: string;
  entities_count: number;
  targets_count: number;
  last_change: string;
  last_export: string;
}

export interface CatalogResponse {
  datasets: Dataset[];
  model_version: string;
  app: string;
  version: string;
}

// Algorithm
export interface Algorithm {
  name: string;
  description: string;
}

export interface AlgorithmResponse {
  algorithms: Algorithm[];
  default: string;
}

// Match Options
export interface MatchOptions {
  dataset?: string;
  limit?: number;
  threshold?: number;
  algorithm?: string;
  includeDataset?: string[];
  excludeDataset?: string[];
  excludeSchema?: EntitySchema[];
  topics?: string[];
}

// API Error
export interface ApiError {
  status: number;
  message: string;
  detail?: string;
  stack?: string;
}

// Screening types
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export type ScreeningVerdict = 'CLEAR' | 'FLAG' | 'REVIEW';

export type ScreeningCategory =
  | 'SANCTIONED'
  | 'TERRORISM'
  | 'WANTED'
  | 'FRAUD'
  | 'CRIME'
  | 'TRAFFICKING'
  | 'PEP'
  | 'DEBARMENT'
  | 'POI'
  | 'PEP_ASSOCIATE';

export interface ScreeningHit {
  id: string;
  caption: string;
  score: number;
  category: ScreeningCategory;
  riskLevel: RiskLevel;
  datasets: string[];
  topics: string[];
}

export interface ScreeningResult {
  query: MatchQuery;
  verdict: ScreeningVerdict;
  riskLevel: RiskLevel | null;
  summary: string;
  hits: {
    sanctioned: ScreeningHit[];
    terrorism: ScreeningHit[];
    wanted: ScreeningHit[];
    fraud: ScreeningHit[];
    crime: ScreeningHit[];
    trafficking: ScreeningHit[];
    pep: ScreeningHit[];
    debarment: ScreeningHit[];
    poi: ScreeningHit[];
    pepAssociate: ScreeningHit[];
  };
  totalHits: number;
}

export interface ScreeningResponse {
  results: Record<string, ScreeningResult>;
  summary: {
    totalScreened: number;
    flagged: number;
    review: number;
    clear: number;
  };
}

// Cove Webhook types
export type CoveScanValue = 'CLEAR' | 'HIT';

export interface CoveWebhookPayload {
  criminal_scan: CoveScanValue;
  fraud_scan: CoveScanValue;
  global_clearance_scan: CoveScanValue;
  known_affiliation_scan: CoveScanValue;
  ofac_global_terrorist_scan: CoveScanValue;
  other_scan: CoveScanValue;
  politically_exposed_person_scan: CoveScanValue;
  public_court_records: CoveScanValue;
  public_profile_scan: CoveScanValue;
  public_safety_scan: CoveScanValue;
  sex_offender_scan: CoveScanValue;
}

export interface CoveWebhookResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

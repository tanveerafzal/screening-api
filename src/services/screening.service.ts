import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config/index.js';
import type {
  MatchRequest,
  MatchResponse,
  MatchOptions,
  SearchParams,
  SearchResponse,
  EntityResponse,
  StatusResponse,
  CatalogResponse,
  AlgorithmResponse,
  ApiError,
} from '../types/index.js';

export class ScreeningService {
  private client: AxiosInstance;
  private backend: 'yente' | 'hosted';

  constructor() {
    this.backend = config.screeningBackend;

    const baseURL =
      this.backend === 'yente'
        ? config.yenteBaseUrl
        : config.openSanctionsApiUrl;

    this.client = axios.create({
      baseURL,
      timeout: config.requestTimeoutMs,
      headers: {
        'Content-Type': 'application/json',
        ...(this.backend === 'hosted' && config.openSanctionsApiKey
          ? { Authorization: `ApiKey ${config.openSanctionsApiKey}` }
          : {}),
      },
    });
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ detail?: string }>;
      const apiError: ApiError = {
        status: axiosError.response?.status ?? 500,
        message: axiosError.message,
        detail: axiosError.response?.data?.detail,
      };
      throw apiError;
    }
    throw {
      status: 500,
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiError;
  }

  async match(
    request: MatchRequest,
    options: MatchOptions = {}
  ): Promise<MatchResponse> {
    const dataset = options.dataset ?? 'default';
    const params = new URLSearchParams();

    if (options.limit) params.append('limit', options.limit.toString());
    if (options.threshold)
      params.append('threshold', options.threshold.toString());
    if (options.algorithm) params.append('algorithm', options.algorithm);
    if (options.topics) {
      options.topics.forEach((t) => params.append('topics', t));
    }
    if (options.includeDataset) {
      options.includeDataset.forEach((d) =>
        params.append('include_dataset', d)
      );
    }
    if (options.excludeDataset) {
      options.excludeDataset.forEach((d) =>
        params.append('exclude_dataset', d)
      );
    }
    if (options.excludeSchema) {
      options.excludeSchema.forEach((s) => params.append('exclude_schema', s));
    }

    try {
      const response = await this.client.post<MatchResponse>(
        `/match/${dataset}?${params.toString()}`,
        request
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async search(
    dataset: string,
    params: SearchParams
  ): Promise<SearchResponse> {
    const queryParams = new URLSearchParams();

    queryParams.append('q', params.q);
    if (params.schema) queryParams.append('schema', params.schema);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.fuzzy !== undefined)
      queryParams.append('fuzzy', params.fuzzy.toString());
    if (params.simple !== undefined)
      queryParams.append('simple', params.simple.toString());
    if (params.countries) {
      params.countries.forEach((c) => queryParams.append('countries', c));
    }
    if (params.topics) {
      params.topics.forEach((t) => queryParams.append('topics', t));
    }
    if (params.datasets) {
      params.datasets.forEach((d) => queryParams.append('datasets', d));
    }

    try {
      const response = await this.client.get<SearchResponse>(
        `/search/${dataset}?${queryParams.toString()}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getEntity(
    entityId: string,
    nested: boolean = true
  ): Promise<EntityResponse> {
    try {
      const response = await this.client.get<EntityResponse>(
        `/entities/${entityId}`,
        {
          params: { nested },
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getHealth(): Promise<StatusResponse> {
    try {
      const response = await this.client.get<StatusResponse>('/healthz');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getReadiness(): Promise<StatusResponse> {
    try {
      const response = await this.client.get<StatusResponse>('/readyz');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getCatalog(): Promise<CatalogResponse> {
    try {
      const response = await this.client.get<CatalogResponse>('/catalog');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getAlgorithms(): Promise<AlgorithmResponse> {
    try {
      const response = await this.client.get<AlgorithmResponse>('/algorithms');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  getBackendInfo(): { backend: string; url: string } {
    return {
      backend: this.backend,
      url:
        this.backend === 'yente'
          ? config.yenteBaseUrl
          : config.openSanctionsApiUrl,
    };
  }
}

// Singleton instance
export const screeningService = new ScreeningService();

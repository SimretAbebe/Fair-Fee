import {
  AppApiError,
  FeeComparisonResponse,
  FeeComparisonResult,
  ProviderFairnessReport,
  TransferType,
} from '../types/api';

export const DEFAULT_API_BASE_URL = 'http://localhost:8000';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
      try {
        return (await response.json()) as T;
      } catch {
        throw new AppApiError(
          'server',
          'Failed to parse JSON response from server.',
          response.status
        );
      }
    }

    let errorDetail = '';
    let parsedBody: any = null;

    try {
      parsedBody = await response.json();
      if (typeof parsedBody.detail === 'string') {
        errorDetail = parsedBody.detail;
      } else if (Array.isArray(parsedBody.detail)) {
        errorDetail = parsedBody.detail
          .map((item: any) => `${item.loc?.join('.') || 'input'}: ${item.msg}`)
          .join(', ');
      } else if (parsedBody.message) {
        errorDetail = parsedBody.message;
      }
    } catch {
      errorDetail = response.statusText || 'Unknown response error';
    }

    if (response.status === 422) {
      throw new AppApiError(
        'validation',
        errorDetail || 'Transfer amount must be a positive number greater than 0.',
        response.status,
        errorDetail
      );
    }

    if (response.status === 404) {
      throw new AppApiError(
        'not_found',
        errorDetail || 'No matching providers or fee structures found.',
        response.status,
        errorDetail
      );
    }

    if (response.status >= 500) {
      throw new AppApiError(
        'server',
        `Internal server error (${response.status}): ${errorDetail || 'Please check backend logs.'}`,
        response.status,
        errorDetail
      );
    }

    throw new AppApiError(
      'unknown',
      errorDetail || `Request failed with status ${response.status}`,
      response.status,
      errorDetail
    );
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      return await this.handleResponse<T>(response);
    } catch (error: unknown) {
      if (error instanceof AppApiError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown network failure';
      throw new AppApiError(
        'network',
        `Cannot connect to Fair Fee API at ${this.baseUrl}. Please verify that the FastAPI backend is running.`,
        undefined,
        message
      );
    }
  }

  public async compareFees(
    amount: number,
    transferType: TransferType | string
  ): Promise<FeeComparisonResponse> {
    const params = new URLSearchParams({
      amount: amount.toString(),
      transfer_type: transferType.trim(),
    });

    return this.request<FeeComparisonResponse>(`/api/fees/compare?${params.toString()}`);
  }

  public async getCheapestFee(
    amount: number,
    transferType: TransferType | string
  ): Promise<FeeComparisonResult> {
    const params = new URLSearchParams({
      amount: amount.toString(),
      transfer_type: transferType.trim(),
    });

    return this.request<FeeComparisonResult>(`/api/fees/cheapest?${params.toString()}`);
  }

  public async getProviderFairness(providerName: string): Promise<ProviderFairnessReport> {
    const encodedName = encodeURIComponent(providerName.trim());
    return this.request<ProviderFairnessReport>(`/api/providers/${encodedName}/fairness`);
  }

  public async checkHealth(): Promise<{ online: boolean; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        return { online: true, message: data?.message || 'API is active' };
      }
      return { online: false, message: `Status code ${res.status}` };
    } catch {
      return { online: false, message: 'Unreachable' };
    }
  }
}

export const api = new ApiService();

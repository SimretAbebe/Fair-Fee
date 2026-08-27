export type TransferType =
  | 'own_bank_mobile'
  | 'interbank_mobile'
  | 'to_wallet_mobile'
  | 'p2p_wallet'
  | 'to_bank'
  | 'own_account_mobile';

export type FairnessCategory =
  | 'free'
  | 'negligible (fee under 3 birr for this transfer)'
  | 'proportional'
  | 'moderately regressive'
  | 'highly regressive'
  | 'highly regressive (uncapped flat fee)';

export interface FeeComparisonResult {
  provider_name: string;
  transfer_type: TransferType | string;
  channel: string;
  destination_wallet: string | null;
  fee_type: string;
  computed_fee: number;
  fee_as_percent_of_amount: number;
  fairness_category: FairnessCategory;
  notes: string | null;
}

export interface FeeComparisonResponse {
  amount: number;
  transfer_type: TransferType | string;
  results: FeeComparisonResult[];
  cheapest_provider: string | null;
}

export interface FeeTier {
  provider_name: string;
  transfer_type: TransferType | string;
  channel: string;
  destination_wallet: string | null;
  min_amount: number;
  max_amount: number | null;
  fee_amount: number | null;
  fee_percent: number | null;
  fee_type: string;
  fairness_category: FairnessCategory;
  notes: string | null;
}

export interface ProviderFairnessReport {
  provider_name: string;
  total_fee_tiers: number;
  fee_tiers: FeeTier[];
}

export interface ApiValidationError {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }> | string;
}

export interface ApiHttpError {
  detail: string;
}

export type ApiErrorType = 'validation' | 'not_found' | 'network' | 'server' | 'unknown';

export class AppApiError extends Error {
  public type: ApiErrorType;
  public status?: number;
  public details?: string;

  constructor(type: ApiErrorType, message: string, status?: number, details?: string) {
    super(message);
    this.name = 'AppApiError';
    this.type = type;
    this.status = status;
    this.details = details;
  }
}

export interface TransferPreset {
  id: string;
  label: string;
  amount: number;
  transfer_type: TransferType;
  tag: string;
  description: string;
}

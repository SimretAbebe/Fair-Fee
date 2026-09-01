import { FairnessCategory, TransferType } from '../types/api';

export const TRANSFER_TYPE_META: Record<TransferType, { label: string; shortLabel: string; description: string }> = {
  own_bank_mobile: {
    label: 'Same Bank Transfer (Mobile Banking)',
    shortLabel: 'Same Bank',
    description: 'Transfer to another account at the same bank via mobile banking',
  },
  interbank_mobile: {
    label: 'Interbank Transfer (Different Bank)',
    shortLabel: 'Interbank',
    description: 'Transfer to an account at a different Ethiopian bank via EthSwitch',
  },
  to_wallet_mobile: {
    label: 'Bank to Mobile Wallet (Telebirr, M-Pesa)',
    shortLabel: 'To Wallet',
    description: 'Transfer from your bank account to a mobile money wallet',
  },
  p2p_wallet: {
    label: 'Wallet to Wallet (P2P)',
    shortLabel: 'P2P Wallet',
    description: 'Person-to-person transfer within a mobile money service',
  },
  to_bank: {
    label: 'Mobile Wallet to Bank Account',
    shortLabel: 'Wallet to Bank',
    description: 'Transfer funds from a mobile money wallet back to a bank account',
  },
  own_account_mobile: {
    label: 'Own Account Transfer (Mobile Banking)',
    shortLabel: 'Own Account',
    description: 'Transfer between your own accounts within the same banking app',
  },
};

export interface FairnessBadgeConfig {
  label: string;
  badgeClass: string;
  dotColor: string;
  description: string;
  ratingLevel: 'best' | 'good' | 'fair' | 'poor' | 'worst';
}

export function getFairnessBadgeConfig(category: FairnessCategory | string): FairnessBadgeConfig {
  switch (category) {
    case 'free':
      return {
        label: 'Free',
        badgeClass: 'badge-free',
        dotColor: '#059669',
        description: 'Zero transaction fee charged for this transfer amount.',
        ratingLevel: 'best',
      };
    case 'negligible (fee under 3 birr for this transfer)':
      return {
        label: 'Negligible (< 3 ETB)',
        badgeClass: 'badge-negligible',
        dotColor: '#0d9488',
        description: 'Nominal trivial cost under 3 birr, posing virtually no burden.',
        ratingLevel: 'best',
      };
    case 'proportional':
      return {
        label: 'Proportional',
        badgeClass: 'badge-proportional',
        dotColor: '#2563eb',
        description: 'Fee scales in reasonable proportion to the transferred amount.',
        ratingLevel: 'good',
      };
    case 'moderately regressive':
      return {
        label: 'Moderately Regressive',
        badgeClass: 'badge-moderate',
        dotColor: '#d97706',
        description: 'Fee takes a noticeably higher percentage slice from smaller transfers.',
        ratingLevel: 'fair',
      };
    case 'highly regressive':
      return {
        label: 'Highly Regressive',
        badgeClass: 'badge-regressive',
        dotColor: '#dc2626',
        description: 'Heavy flat fee burden disproportionately penalizing smaller transfers.',
        ratingLevel: 'poor',
      };
    case 'highly regressive (uncapped flat fee)':
      return {
        label: 'Highly Regressive (Uncapped)',
        badgeClass: 'badge-uncapped',
        dotColor: '#991b1b',
        description: 'Severe fixed flat fee without a tiered ceiling, heavily burdening everyday transfers.',
        ratingLevel: 'worst',
      };
    default:
      return {
        label: category || 'Standard',
        badgeClass: 'badge-neutral',
        dotColor: '#6b7280',
        description: 'Standard fee tier.',
        ratingLevel: 'fair',
      };
  }
}

export function formatETB(amount: number): string {
  if (isNaN(amount)) return '0.00 ETB';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ETB`;
}

export function formatNumber(amount: number): string {
  if (isNaN(amount)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(percent: number): string {
  if (isNaN(percent)) return '0.00%';
  return `${percent.toFixed(2)}%`;
}

export function getTransferTypeLabel(type: TransferType | string): string {
  if (type in TRANSFER_TYPE_META) {
    return TRANSFER_TYPE_META[type as TransferType].label;
  }
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface ProviderBrand {
  name: string;
  abbr: string;
  bg: string;
  textColor: string;
}

export function getProviderBrand(name: string): ProviderBrand {
  const clean = name.trim().toLowerCase();
  
  if (clean.includes('cbe') || clean.includes('commercial bank of ethiopia')) {
    return { name: 'Commercial Bank of Ethiopia', abbr: 'CBE', bg: '#F3E8FF', textColor: '#6B21A8' };
  }
  if (clean.includes('telebirr') || clean.includes('ethio telecom')) {
    return { name: 'Telebirr', abbr: 'TB', bg: '#E0F2FE', textColor: '#0369A1' };
  }
  if (clean.includes('awash')) {
    return { name: 'Awash Bank', abbr: 'AB', bg: '#E0F2FE', textColor: '#0284C7' };
  }
  if (clean.includes('dashen')) {
    return { name: 'Dashen Bank', abbr: 'DB', bg: '#ECFDF5', textColor: '#047857' };
  }
  if (clean.includes('abyssinia') || clean.includes('boa')) {
    return { name: 'Bank of Abyssinia', abbr: 'BOA', bg: '#FEF3C7', textColor: '#B45309' };
  }
  if (clean.includes('mpesa') || clean.includes('m-pesa') || clean.includes('safaricom')) {
    return { name: 'M-Pesa Ethiopia', abbr: 'MP', bg: '#DCFCE7', textColor: '#15803D' };
  }
  if (clean.includes('coop') || clean.includes('oromia')) {
    return { name: 'Cooperative Bank of Oromia', abbr: 'COOP', bg: '#FFEDD5', textColor: '#C2410C' };
  }
  if (clean.includes('hibret')) {
    return { name: 'Hibret Bank', abbr: 'HB', bg: '#EEF2FF', textColor: '#4338CA' };
  }
  if (clean.includes('wegagen')) {
    return { name: 'Wegagen Bank', abbr: 'WB', bg: '#FEF9C3', textColor: '#A16207' };
  }
  if (clean.includes('nib')) {
    return { name: 'Nib International Bank', abbr: 'NIB', bg: '#CCFBF1', textColor: '#0F766E' };
  }

  const words = name.trim().split(/\s+/);
  const abbr = words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  return {
    name,
    abbr,
    bg: '#F1F5F9',
    textColor: '#334155',
  };
}

export interface FeeTierLike {
  fee_type: string;
  fee_amount?: number | null;
  fee_percent?: number | null;
  min_amount?: number | null;
  max_amount?: number | null;
  computed_fee?: number | null;
}

export function getPlainLanguageSummary(tier: FeeTierLike): string {
  const feeType = (tier.fee_type || '').toLowerCase().trim();
  const feeAmount =
    tier.fee_amount !== undefined && tier.fee_amount !== null
      ? tier.fee_amount
      : tier.computed_fee !== undefined && tier.computed_fee !== null
      ? tier.computed_fee
      : null;
  const feePercent =
    tier.fee_percent !== undefined && tier.fee_percent !== null ? tier.fee_percent : null;
  const minAmount =
    tier.min_amount !== undefined && tier.min_amount !== null ? tier.min_amount : null;
  const maxAmount =
    tier.max_amount !== undefined && tier.max_amount !== null ? tier.max_amount : null;

  if (feeType === 'free' || (feeAmount === 0 && feePercent === null)) {
    return 'No fee for this transfer.';
  }

  if (feeType === 'tiered' || feeType === 'flat' || feeType === 'flat_capped') {
    const feeStr = feeAmount !== null ? formatNumber(feeAmount) : '0';
    if (maxAmount === null || maxAmount === undefined) {
      const minStr = minAmount !== null ? formatNumber(minAmount) : '0';
      return `Sending more than ${minStr} birr costs a flat ${feeStr} birr.`;
    } else {
      const minStr = minAmount !== null ? formatNumber(minAmount) : '1';
      const maxStr = formatNumber(maxAmount);
      return `Sending between ${minStr} and ${maxStr} birr costs ${feeStr} birr.`;
    }
  }

  if (feeType === 'flat_above_threshold') {
    const threshold = minAmount !== null ? Math.max(0, minAmount - 1) : 0;
    const feeStr = feeAmount !== null ? formatNumber(feeAmount) : '0';
    return `Sending more than ${formatNumber(threshold)} birr costs a flat ${feeStr} birr, no matter how much more you send.`;
  }

  if (feeType === 'flat_plus_variable') {
    const feeStr = feeAmount !== null ? formatNumber(feeAmount) : '0';
    return `A flat ${feeStr} birr fee, plus a possible extra bank charge that isn't fully published.`;
  }

  if (feeType === 'percent_tiered') {
    const percentStr = feePercent !== null ? `${feePercent}` : '0';
    if (maxAmount === null || maxAmount === undefined) {
      const minStr = minAmount !== null ? formatNumber(minAmount) : '0';
      return `Sending more than ${minStr} birr costs ${percentStr}% of the amount you send.`;
    } else {
      const minStr = minAmount !== null ? formatNumber(minAmount) : '1';
      const maxStr = formatNumber(maxAmount);
      return `Sending between ${minStr} and ${maxStr} birr costs ${percentStr}% of the amount you send.`;
    }
  }

  if (feeType === 'variable_plus_percent') {
    const percentStr = feePercent !== null ? `${feePercent}` : '0';
    return `Costs ${percentStr}% of the amount you send, plus a base fee that isn't fully published.`;
  }

  if (feePercent !== null) {
    return `Costs ${feePercent}% of the amount you send.`;
  }

  if (feeAmount !== null) {
    return `Costs a flat ${formatNumber(feeAmount)} birr.`;
  }

  return 'No fee for this transfer.';
}

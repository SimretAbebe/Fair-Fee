import { TransferPreset } from '../types/api';

export const POPULAR_PRESETS: TransferPreset[] = [
  {
    id: 'p1',
    label: '500 ETB • Interbank',
    amount: 500,
    transfer_type: 'interbank_mobile',
    tag: 'Popular',
    description: 'Small transfer to another bank',
  },
  {
    id: 'p2',
    label: '2,000 ETB • Interbank',
    amount: 2000,
    transfer_type: 'interbank_mobile',
    tag: 'Daily',
    description: 'Standard EthSwitch interbank transfer',
  },
  {
    id: 'p3',
    label: '5,000 ETB • To Wallet',
    amount: 5000,
    transfer_type: 'to_wallet_mobile',
    tag: 'Wallet',
    description: 'Bank to Telebirr or M-Pesa',
  },
  {
    id: 'p4',
    label: '10,000 ETB • Same Bank',
    amount: 10000,
    transfer_type: 'own_bank_mobile',
    tag: 'High Value',
    description: 'Internal transfer within same bank',
  },
  {
    id: 'p5',
    label: '1,000 ETB • P2P Wallet',
    amount: 1000,
    transfer_type: 'p2p_wallet',
    tag: 'P2P',
    description: 'Direct wallet to wallet transfer',
  },
  {
    id: 'p6',
    label: '3,000 ETB • Wallet to Bank',
    amount: 3000,
    transfer_type: 'to_bank',
    tag: 'Cashout',
    description: 'Transfer wallet funds to bank account',
  },
];

export const KNOWN_PROVIDERS = [
  { name: 'CBE', fullName: 'Commercial Bank of Ethiopia', category: 'Commercial Bank' },
  { name: 'Awash Bank', fullName: 'Awash International Bank', category: 'Private Bank' },
  { name: 'Dashen Bank', fullName: 'Dashen Bank', category: 'Private Bank' },
  { name: 'Bank of Abyssinia', fullName: 'Bank of Abyssinia', category: 'Private Bank' },
  { name: 'Telebirr', fullName: 'Telebirr (Ethio Telecom)', category: 'Mobile Money' },
  { name: 'M-Pesa Ethiopia', fullName: 'M-Pesa Ethiopia (Safaricom Ethiopia)', category: 'Mobile Money' },
];

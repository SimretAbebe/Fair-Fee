# Data Collection Log

## 2026-08-20 — Day 1

### CBE (Commercial Bank of Ethiopia)
- **Source:** Official Terms and Tariffs PDF — https://combanketh.et/uploads/Terms_and_Tariffs_8151c11230.pdf
- **Collected:** Mobile banking own-bank transfer (8 tiers), interbank RTGS/ETSWITCH
  transfer (flat + variable), transfer to wallet (2 tiers), transfer to CBE Birr (free)
- **Gap noted:** The interbank RTGS/ETSWITCH fee is "Birr 50 plus NBE charge" or
  "Birr 50 plus ETSWITCH charge" — the variable NBE/ETSWITCH component isn't publicly
  disclosed in this tariff sheet. Recorded the known flat portion (57.5 birr after VAT)
  and flagged `fee_type: "flat_plus_variable"` so downstream models don't treat this as
  the full picture.
- **Note:** Figures used are "after VAT" since that's what the customer actually pays.

### telebirr
- **Source:** Official pricing page — https://www.ethiotelecom.et/telebirr/telebirr-pricing/
- **Collected:** P2P wallet transfer (5 tiers), transfer to bank (5 tiers)
- **Gap noted:** Cash-in/cash-out tariffs were visible on the page but not collected
  today — Day 1 scope is transfer fees specifically.
- **Note:** Page did not explicitly state whether tariffs are VAT-inclusive; recorded
  as published. Flagged as a follow-up to confirm before final analysis.

### Next collection targets (Day 2)
- Dashen Bank, Awash Bank, Bank of Abyssinia
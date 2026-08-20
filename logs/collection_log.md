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



### Schema update: added freshness tracking (2026-08-20)

Added three fields to every fee record to support tracking fee changes over time:

valid_from — date this fee took effect. Currently set to date_collected for all Day 1 records since the actual effective date wasn't published; flagged via valid_from_is_confirmed: false until we can confirm the real effective date.
valid_to — null while still current; will be filled in the day we detect a fee has changed during a re-verification pass.
provider_category — added at the file level (bank / telecom_wallet) to keep merchant-fee providers like Chapa structurally separated from transfer-fee providers, even if added to the dataset later for a different purpose.

### Next collection targets (Day 2)
- Dashen Bank, Awash Bank, Bank of Abyssinia
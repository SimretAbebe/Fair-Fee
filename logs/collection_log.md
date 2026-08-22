# Data Collection Log

## 2026-08-20 — Day 1

### CBE (Commercial Bank of Ethiopia)
- **Source:** Official Terms and Tariffs PDF — https://combanketh.et/uploads/Terms_and_Tariffs_8151c11230.pdf
- **Collected:** Mobile banking own-bank transfer (8 tiers), interbank RTGS/ETSWITCH
  transfer (flat + variable), transfer to wallet (2 tiers), transfer to CBE Birr (free)
- **Gap noted:** The interbank RTGS/ETSWITCH fee is "Birr 50 plus NBE charge" or
  "Birr 50 plus ETSWITCH charge" — the variable NBE/ETSWITCH component isn't publicly
  disclosed in this tariff sheet. We recorded the known flat portion (57.5 birr after
  VAT) and flagged `fee_type: "flat_plus_variable"` so downstream models don't treat
  this as the full picture.
- **Note:** Figures used are "after VAT" since that's what the customer actually pays.

### telebirr
- **Source:** Official pricing page — https://www.ethiotelecom.et/telebirr/telebirr-pricing/
- **Collected:** P2P wallet transfer (5 tiers), transfer to bank (5 tiers), cash-out
  (partial — 2 sample tiers of 12 total)
- **Gap noted:** Cash-in tariff table was visible on the page but not collected today
  (out of scope for Day 1 — Day 1 focus is transfer fees specifically, not cash-in/out).
  Will revisit if cash-in becomes relevant to the fairness analysis.
- **Note:** Page did not explicitly state whether tariffs are VAT-inclusive; recorded
  as published. Flagging this as a follow-up to confirm before final analysis.

### Next collection targets (Day 2)
- Dashen Bank (super app — likely to have digital transfer fees published)
- Awash Bank
- Bank of Abyssinia
- M-Pesa Ethiopia, HelloCash (genuine P2P wallets — added to scope)

## 2026-08-21 — Day 2

### Dashen Bank
- **Source:** Official Terms and Tariffs page — https://dashenbanksc.com/terms-and-tariffs/
- **Collected:** Own-bank mobile transfer (free), EthSwitch interbank transfer (5
  percentage tiers — 0.40% down to 0.04%, genuinely proportional pricing), transfer
  to telebirr/M-Pesa wallets (3 flat tiers each)
- **Notable finding:** Dashen's interbank fee is percentage-based, not flat like
  CBE's. Required adding a new `fee_percent` field to the schema (see schema update
  note below) since forcing this into `fee_amount` would misrepresent the data.
- **Gap noted:** The page also lists a separate branch-based "Local fund transfer"
  table with different (tiered flat) fees for the same transfer type — not recorded,
  since it's a branch channel, out of this project's mobile/digital banking scope.

### Awash Bank
- **Source:** Official Digital Banking Terms and Tariffs page —
  https://awashbank.com/digital-banking-service-terms-and-tariffs/
- **Collected:** Own-bank mobile transfer (4 tiers), transfer to partner wallets —
  telebirr/M-Pesa/Rays (3 tiers), interbank via mobile banking (partial — see gap),
  interbank via internet banking (5 percentage tiers, fully disclosed)
- **Gap noted:** Awash's *mobile banking* interbank fee is published only as
  "EthSwitch Pricing + 0.2% of the principal amount" — the base EthSwitch Pricing
  component is not disclosed on this page. Recorded the known 0.2% surcharge only,
  flagged `fee_type: "variable_plus_percent"` as incomplete.
- **Notable finding:** the same bank charges differently for the same interbank
  transfer type depending on channel (mobile banking vs. internet banking) — this is
  exactly why the schema has a `channel` field.

### Bank of Abyssinia (BoA)
- **Source:** Official Service Charges and Price PDF —
  https://www.bankofabyssinia.com/wp-content/uploads/2024/06/BoA-Service-Charges-and-Price-F.pdf
- **Collected:** Own-account mobile transfer (free), interbank RTGS transfer (flat
  100 birr — the only provider so far to fully disclose both the base fee and the
  NBE component), transfer to wallets (free)
- **Gap noted (data quality, not missing source):** this PDF extracted messily —
  two tiers of the "Account to Account Transfer" table had their charge values
  missing/blank in the text extraction, and the P2P ETSWITCH fee is only described
  as "As per ET-SWITCH charge" with no rate given anywhere. Both gaps recorded
  explicitly in the raw file's `known_gaps` section rather than guessed at.
- **Follow-up needed:** open the BoA PDF visually (not just as extracted text) to
  confirm the missing Account-to-Account tier values before treating that section
  as complete.

### Schema update: added `fee_percent` field (Day 2)
Dashen's and Awash's percentage-based fees revealed that the original schema
(`fee_amount` as a flat birr number) couldn't represent proportional pricing.
Added `fee_percent` as a sibling field: records use either `fee_amount` (flat/
tiered birr amount, `fee_percent: null`) or `fee_percent` (percentage of transfer
amount, `fee_amount: null`) depending on `fee_type`.

### Providers still pending
- M-Pesa Ethiopia, HelloCash (Day 3)

### Schema update: added freshness tracking (2026-08-20)
Added three fields to every fee record to support tracking fee changes over time:
- `valid_from` — date this fee took effect. Currently set to `date_collected` for
  all Day 1 records since the actual effective date wasn't published; flagged via
  `valid_from_is_confirmed: false` until we can confirm the real effective date.
- `valid_to` — null while still current; will be filled in the day we detect a
  fee has changed during a re-verification pass.
- `provider_category` — added at the file level (`bank` / `telecom_wallet`) to
  keep merchant-fee providers like Chapa structurally separated from transfer-fee
  providers, even if added to the dataset later for a different purpose.

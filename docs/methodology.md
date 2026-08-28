# Methodology

## What this project measures
For each provider's transfer fee tier, we compute a "regressivity gap" —
the difference between what percentage of a realistic small transfer
(100 birr, or the tier's real minimum if higher) the fee represents,
versus what percentage it represents at the top of the tier. A large gap
means the fee disproportionately burdens small transfers (regressive); a
gap near zero means the fee scales fairly with the amount sent
(proportional).

## Why 100 birr as the reference point (not the tier's literal minimum)
An earlier version of this calculation used the tier's literal minimum
amount (often 1 birr) as the "small transfer" reference. This produced
meaningless results — e.g. an 11.5 birr fee against a 1 birr transfer
computed as 1150%, a number no real customer would ever experience, since
nobody sends exactly 1 birr. We switched to a realistic reference point
(100 birr) to reflect what small transfers actually look like in practice.

## Data confidence levels
Not all providers have equally reliable data:
- **CBE, Dashen, Awash, Bank of Abyssinia**: sourced directly from official
  tariff PDFs or pricing pages.
- **telebirr**: sourced from the official pricing page.
- **M-Pesa Ethiopia**: one confirmed official figure (to-bank transfer cap,
  via an official Safaricom Ethiopia social media post); remaining figures
  are from a third-party aggregator and explicitly flagged as unverified
  in the raw data (`confidence: "unverified_third_party"`).
- **HelloCash**: excluded entirely. No public numeric fee schedule was
  found through official channels (BelCash, hellocash.money, hellocash.at).

## Known data gaps
- **Bank of Abyssinia**: the "Account to Account Transfer" tier table above
  10,000 birr, and the P2P ETSWITCH fee, are not recorded — the source PDF
  either didn't disclose a rate or the table extraction was incomplete.
- **Awash Bank**: the mobile banking interbank fee is published only as
  "EthSwitch Pricing + 0.2%" — the base EthSwitch Pricing component isn't
  disclosed, so only the 0.2% surcharge is recorded.
- **CBE**: the interbank RTGS/ETSWITCH fee includes an NBE component not
  numerically disclosed in the public tariff sheet.

## Freshness process
Fee data is re-verified against original sources periodically (monthly,
given fees change only a few times per year). When a fee changes, the old
record is closed out (`valid_to` set to the change date) rather than
deleted, and a new record is added — preserving full fee history over time.

## Scope decisions
- **Chapa** was evaluated and excluded: it's a merchant payment-processing
  fee (businesses pay to accept payments), not a person-to-person transfer
  fee, and mixing the two would make fairness comparisons meaningless.
- Percentage-based fees (Dashen, some Awash channels) use a separate
  `fee_percent` field rather than being forced into the flat-fee
  `fee_amount` field, since they represent a genuinely different pricing
  mechanism.

## Complaint sentiment analysis (small sample, results are directional only)

To check whether the fairness score matches real customer experience, a
small sample of public app store reviews was searched for fee-related
complaints across all 6 providers.

**What was found:** only 2 genuine fee complaints, both from CBE and
telebirr -- Ethiopia's two most widely used apps. Dashen, Awash, Bank of
Abyssinia, and M-Pesa Ethiopia had no fee-specific complaints found in
public reviews, despite substantial review volume for some of them
(reviews found for these providers were almost entirely about app
reliability -- crashes, login lockouts, balance sync issues -- not fees).

**Honest interpretation:** this result is consistent with, but does not
prove, the hypothesis that more regressive fee structures generate more
complaints. Dashen and Awash (the most proportional providers, by tier
count) got zero complaints, which fits the hypothesis. However, CBE and
telebirr are also Ethiopia's most-used and most-reviewed apps by a wide
margin -- so their complaints may simply reflect higher review volume in
general, not fairness specifically. With only 2 complaints total across 6
providers, this sample is too small to separate those two explanations.

**What would be needed to say more:** a larger, systematically collected
sample (ideally proportional to each app's actual review volume, not just
whatever surfaced in a web search), and ideally review counts as a
denominator to normalize for popularity before comparing complaint counts
across providers.
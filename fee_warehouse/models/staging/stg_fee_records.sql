-- stg_fee_records.sql

with source as (

    select * from {{ source('raw', 'fee_records') }}

),

standardized as (

    select
        record_id,

        -- Standardize provider names defensively. Today's data happens to be
        -- consistent, but this is exactly the kind of silent bug (Day 3's
        -- checkpoint) this layer exists to prevent going forward.
        case
            when trim(lower(provider_name)) in ('cbe', 'commercial bank of ethiopia')
                then 'CBE'
            when trim(lower(provider_name)) = 'telebirr'
                then 'telebirr'
            when trim(lower(provider_name)) in ('dashen', 'dashen bank')
                then 'Dashen Bank'
            when trim(lower(provider_name)) in ('awash', 'awash bank')
                then 'Awash Bank'
            when trim(lower(provider_name)) in ('boa', 'bank of abyssinia')
                then 'Bank of Abyssinia'
            when trim(lower(provider_name)) in ('m-pesa ethiopia', 'mpesa ethiopia', 'm-pesa', 'mpesa')
                then 'M-Pesa Ethiopia'
            else initcap(trim(provider_name))
        end as provider_name,

        lower(trim(provider_category)) as provider_category,
        lower(trim(transfer_type)) as transfer_type,
        lower(trim(channel)) as channel,
        nullif(trim(destination_wallet), '') as destination_wallet,

        -- Explicit numeric casting rather than trusting inferred types
        cast(min_amount as numeric) as min_amount,
        cast(max_amount as numeric) as max_amount,
        cast(fee_amount as numeric) as fee_amount,
        cast(fee_percent as numeric) as fee_percent,

        lower(trim(fee_type)) as fee_type,
        cast(valid_from as date) as valid_from,
        cast(valid_to as date) as valid_to,
        coalesce(valid_from_is_confirmed, false) as valid_from_is_confirmed,
        notes,
        source_url,
        cast(date_collected as date) as date_collected

    from source

    -- Drop rows that are structurally broken -- can't reason about a fee
    -- with no transfer type at all, or a negative fee (a data-entry mistake)
    where transfer_type is not null
      and (fee_amount is null or fee_amount >= 0)
      and (fee_percent is null or fee_percent >= 0)

),

with_fairness_inputs as (

    select
        *,

        -- What % of the MINIMUM amount in this tier does the fee represent?
        -- For percent-based fees, this is just the percent itself (constant).
        -- For flat/tiered birr fees, small amounts get hit hardest here.
        case
            when fee_percent is not null then fee_percent
            when fee_amount is not null and min_amount > 0
                then round((fee_amount / min_amount) * 100, 4)
            else null
        end as implied_percent_at_min,

        -- Same idea, but at the MAXIMUM amount in this tier (null max_amount
        -- means "no upper bound," so we can't compute this one).
        case
            when fee_percent is not null then fee_percent
            when fee_amount is not null and max_amount is not null and max_amount > 0
                then round((fee_amount / max_amount) * 100, 4)
            else null
        end as implied_percent_at_max

    from standardized

)

select * from with_fairness_inputs
with fee_tiers as (

    select * from {{ ref('fct_fee_tiers') }}

),

providers as (

    select * from {{ ref('dim_providers') }}

),

transfer_types as (

    select * from {{ ref('dim_transfer_types') }}

),

with_practical_reference as (

    select
        ft.*,

        -- The realistic "small transfer" amount to score against: 100 birr,
        -- or the tier's real minimum if that's already higher than 100.
        greatest(ft.min_amount, 100) as practical_reference_low,

        -- Recompute the "at low end" percentage using the practical
        -- reference amount instead of the literal (sometimes tiny) tier
        -- minimum. Percent-based fees are unaffected -- their rate doesn't
        -- depend on amount, which is exactly the point of proportional
        -- pricing.
        case
            when ft.fee_percent is not null then ft.fee_percent
            when ft.fee_amount is not null
                then round((ft.fee_amount / greatest(ft.min_amount, 100)) * 100, 4)
            else null
        end as practical_percent_at_low

    from fee_tiers ft

),

scored as (

    select
        wp.record_id,
        wp.provider_key,
        p.provider_name,
        wp.transfer_type_key,
        tt.transfer_type,
        tt.channel,
        wp.min_amount,
        wp.max_amount,
        wp.fee_amount,
        wp.fee_percent,
        wp.fee_type,
        wp.notes,
        wp.practical_reference_low,
        wp.practical_percent_at_low,
        wp.implied_percent_at_max,

        -- The actual birr amount this fee costs at our small-transfer
        -- reference point -- used to check whether a fee is even large
        -- enough to matter, regardless of its proportional shape.
        case
            when wp.fee_percent is not null
                then round((wp.fee_percent / 100) * wp.practical_reference_low, 2)
            when wp.fee_amount is not null
                then round(wp.fee_amount, 2)
            else null
        end as fee_birr_at_reference_low,

        -- The regressivity gap. For open-ended tiers (no max_amount), we
        -- can't compare against a literal upper bound -- but a flat fee
        -- with no ceiling isn't "unmeasurable," it's actually the most
        -- extreme regressive case, since the percentage burden keeps
        -- shrinking indefinitely as the amount grows with no limit. We
        -- approximate this by comparing against a large reference amount
        -- (100,000 birr) to represent "a large transfer," rather than
        -- leaving these fees unscored just because the rule has no stated
        -- ceiling.
        case
            when wp.max_amount is not null
                then round(wp.practical_percent_at_low - wp.implied_percent_at_max, 4)
            when wp.fee_amount is not null
                then round(
                    wp.practical_percent_at_low
                    - round((wp.fee_amount / 100000) * 100, 4),
                    4
                )
            else null
        end as regressivity_gap,

        -- Fairness category describes the SHAPE of the fee rule (is it
        -- proportional or regressive?) -- this is a property of the rule
        -- itself, independent of any specific transfer amount. Whether a
        -- given fee is "negligible" depends on the actual amount someone
        -- is sending, which this table has no way to know in advance --
        -- that check happens in the API instead, at request time, using
        -- the real amount the customer asked about.
        case
            when wp.fee_type = 'free' then 'free'
            when wp.max_amount is null and wp.fee_percent is not null
                then 'proportional'
            when wp.max_amount is null and wp.fee_amount is not null
                and round(
                    wp.practical_percent_at_low
                    - round((wp.fee_amount / 100000) * 100, 4), 4
                ) > 0.5
                then 'highly regressive (uncapped flat fee)'
            when wp.max_amount is null then 'unscored (insufficient data)'
            when round(wp.practical_percent_at_low - wp.implied_percent_at_max, 4) <= 0.05
                then 'proportional'
            when round(wp.practical_percent_at_low - wp.implied_percent_at_max, 4) <= 0.5
                then 'moderately regressive'
            else 'highly regressive'
        end as fairness_category

    from with_practical_reference wp
    left join providers p on wp.provider_key = p.provider_key
    left join transfer_types tt on wp.transfer_type_key = tt.transfer_type_key

)

select * from scored
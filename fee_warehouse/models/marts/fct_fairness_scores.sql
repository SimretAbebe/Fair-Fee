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
        wp.practical_reference_low,
        wp.practical_percent_at_low,
        wp.implied_percent_at_max,

        -- The regressivity gap, now based on a realistic small-transfer
        -- reference point instead of a sometimes-nonsensical literal minimum.
        case
            when wp.max_amount is not null
                then round(wp.practical_percent_at_low - wp.implied_percent_at_max, 4)
            else null
        end as regressivity_gap,

        case
            when wp.fee_type = 'free' then 'free'
            when wp.max_amount is null then 'unscored (open-ended tier)'
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
with staged as (

    select * from {{ ref('stg_fee_records') }}

),

joined as (

    select
        staged.record_id,

        dp.provider_key,
        dtt.transfer_type_key,
        dd.date_key,

        staged.destination_wallet,
        staged.min_amount,
        staged.max_amount,
        staged.fee_amount,
        staged.fee_percent,
        staged.fee_type,
        staged.implied_percent_at_min,
        staged.implied_percent_at_max,
        staged.valid_from,
        staged.valid_to,
        staged.valid_from_is_confirmed,
        staged.notes,
        staged.source_url

    from staged
    left join {{ ref('dim_providers') }} dp
        on staged.provider_name = dp.provider_name
    left join {{ ref('dim_transfer_types') }} dtt
        on staged.transfer_type = dtt.transfer_type
        and staged.channel = dtt.channel
    left join {{ ref('dim_dates') }} dd
        on staged.date_collected = dd.full_date

)

select * from joined
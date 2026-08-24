with providers as (

    select distinct
        provider_name,
        provider_category
    from {{ ref('stg_fee_records') }}

),

with_stats as (

    select
        p.provider_name,
        p.provider_category,
        min(s.date_collected) as first_seen_date,
        max(s.date_collected) as last_seen_date,
        count(*) as total_fee_records
    from providers p
    left join {{ ref('stg_fee_records') }} s
        on p.provider_name = s.provider_name
    group by p.provider_name, p.provider_category

)

select
    row_number() over (order by provider_name) as provider_key,
    provider_name,
    provider_category,
    first_seen_date,
    last_seen_date,
    total_fee_records
from with_stats
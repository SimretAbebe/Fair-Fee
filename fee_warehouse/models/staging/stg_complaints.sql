with source as (

    select * from {{ source('raw', 'complaints') }}

),

standardized as (

    select
        complaint_id,

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

        lower(trim(source_type)) as source_type,
        source_url,
        cast(date_observed as date) as date_observed,
        summary,
        short_quote,
        lower(trim(category)) as category,
        nullif(lower(trim(secondary_category)), '') as secondary_category,
        cast(date_collected as date) as date_collected

    from source
    where complaint_id is not null

)

select * from standardized

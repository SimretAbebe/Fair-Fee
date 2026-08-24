with transfer_types as (

    select distinct
        transfer_type,
        channel
    from {{ ref('stg_fee_records') }}

)

select
    row_number() over (order by transfer_type, channel) as transfer_type_key,
    transfer_type,
    channel
from transfer_types

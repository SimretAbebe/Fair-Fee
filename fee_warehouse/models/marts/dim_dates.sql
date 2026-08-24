with date_spine as (

    select
        generate_series(
            '2026-01-01'::date,
            '2027-12-31'::date,
            '1 day'::interval
        )::date as full_date

)

select
    row_number() over (order by full_date) as date_key,
    full_date,
    extract(dow from full_date) as day_of_week,
    to_char(full_date, 'Day') as day_name,
    extract(week from full_date) as week_of_year,
    extract(month from full_date) as month,
    to_char(full_date, 'Month') as month_name,
    extract(quarter from full_date) as quarter,
    extract(year from full_date) as year,
    case
        when extract(dow from full_date) in (0, 6) then true
        else false
    end as is_weekend
from date_spine
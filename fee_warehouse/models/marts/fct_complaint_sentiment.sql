with complaints as (

    select * from {{ ref('stg_complaints') }}

),

complaint_counts as (

    select
        provider_name,
        count(*) as total_complaints,
        count(*) filter (where category = 'fee_complaint') as fee_complaints,
        count(*) filter (where category = 'transparency_complaint'
                          or secondary_category = 'transparency_complaint') as transparency_complaints
    from complaints
    group by provider_name

),

fairness_summary as (

    select
        provider_name,
        count(*) as total_fee_tiers,
        count(*) filter (where fairness_category ilike 'highly regressive%') as highly_regressive_tiers,
        count(*) filter (where fairness_category = 'proportional') as proportional_tiers
    from {{ ref('fct_fairness_scores') }}
    group by provider_name

),

joined as (

    select
        f.provider_name,
        f.total_fee_tiers,
        f.highly_regressive_tiers,
        f.proportional_tiers,
        coalesce(c.total_complaints, 0) as total_complaints_found,
        coalesce(c.fee_complaints, 0) as fee_complaints_found,
        coalesce(c.transparency_complaints, 0) as transparency_complaints_found

    from fairness_summary f
    left join complaint_counts c on f.provider_name = c.provider_name

)

select * from joined
order by highly_regressive_tiers desc
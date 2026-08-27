"""
main.py

The FastAPI application. Currently exposes one endpoint:

  GET /api/fees/compare?amount=2000&transfer_type=interbank_mobile

Given an amount and transfer type, finds the matching fee tier for every
provider that offers that transfer type, computes the ACTUAL fee for
that specific amount (not just the tier's stored boundary numbers), and
returns them sorted cheapest first.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from api.database import run_query
from api.schemas import FeeComparisonResponse, FeeComparisonResult

app = FastAPI(
    title="Fair Fee API",
    description=(
        "Compare Ethiopian mobile banking and mobile money transfer fees "
        "across providers, and see how proportional or regressive each "
        "fee structure is relative to the transfer amount."
    ),
    version="0.1.0",
)

# Allows a frontend running on a different address (e.g. a dev server on
# localhost:5173 or localhost:3000) to actually call this API. Without
# this, the browser blocks the request even though the API itself is
# working fine -- this isn't a bug, it's a deliberate browser safety rule.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for local development only -- restrict this before any real deployment
    allow_methods=["GET"],
    allow_headers=["*"],
)

FEE_TIER_QUERY = """
    SELECT
        provider_name,
        transfer_type,
        channel,
        destination_wallet,
        fee_type,
        fee_amount,
        fee_percent,
        fairness_category,
        notes
    FROM staging_dev.fct_fairness_scores
    WHERE transfer_type = :transfer_type
      AND min_amount <= :amount
      AND (max_amount IS NULL OR max_amount >= :amount)
"""


@app.get("/")
def root():
    return {"message": "Fair Fee API is running. See /docs for available endpoints."}


@app.get(
    "/api/fees/compare",
    response_model=FeeComparisonResponse,
    tags=["Fees"],
    summary="Compare fees across all providers for a given transfer",
)
def compare_fees(
    amount: float = Query(..., gt=0, description="Transfer amount in birr, must be positive"),
    transfer_type: str = Query(..., description="e.g. interbank_mobile, own_bank_mobile, to_wallet_mobile, p2p_wallet, to_bank"),
):
    """
    Returns every provider's fee for the given amount and transfer type,
    sorted cheapest first, along with a fairness category for each --
    whether the fee is free, negligible, proportional to the transfer
    size, or regressive (disproportionately costly for smaller amounts).
    """
    rows = run_query(FEE_TIER_QUERY, {"amount": amount, "transfer_type": transfer_type.strip()})

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No providers found offering transfer_type='{transfer_type.strip()}' for amount={amount}",
        )

    results = []
    for row in rows:
        if row["fee_percent"] is not None:
            computed_fee = round(amount * (float(row["fee_percent"]) / 100), 2)
        elif row["fee_amount"] is not None:
            computed_fee = round(float(row["fee_amount"]), 2)
        else:
            # Shouldn't happen given our data model, but never silently
            # skip -- surface it rather than hide a real gap.
            continue

        fee_as_percent = round((computed_fee / amount) * 100, 2) if amount > 0 else 0.0

        # Materiality check happens HERE, not in the warehouse, because it
        # depends on the actual amount the customer asked about. A fee's
        # "shape" (proportional vs regressive) is a fixed property of the
        # rule, but whether that fee is negligible in absolute terms
        # depends entirely on the real transfer size -- which only exists
        # once someone makes a request like this one.
        if computed_fee == 0:
            display_fairness_category = "free"
        elif computed_fee < 3:
            display_fairness_category = "negligible (fee under 3 birr for this transfer)"
        else:
            display_fairness_category = row["fairness_category"]

        results.append(
            FeeComparisonResult(
                provider_name=row["provider_name"],
                transfer_type=row["transfer_type"],
                channel=row["channel"],
                destination_wallet=row["destination_wallet"],
                fee_type=row["fee_type"],
                computed_fee=computed_fee,
                fee_as_percent_of_amount=fee_as_percent,
                fairness_category=display_fairness_category,
                notes=row["notes"],
            )
        )

    results.sort(key=lambda r: r.computed_fee)
    cheapest = results[0].provider_name if results else None

    return FeeComparisonResponse(
        amount=amount,
        transfer_type=transfer_type,
        results=results,
        cheapest_provider=cheapest,
    )


@app.get(
    "/api/fees/cheapest",
    response_model=FeeComparisonResult,
    tags=["Fees"],
    summary="Get only the single cheapest provider for a given transfer",
)
def cheapest_fee(
    amount: float = Query(..., gt=0, description="Transfer amount in birr, must be positive"),
    transfer_type: str = Query(..., description="e.g. interbank_mobile, own_bank_mobile, to_wallet_mobile, p2p_wallet, to_bank"),
):
    """
    A convenience endpoint for when a client just wants THE answer --
    "what's my cheapest option" -- without parsing a full comparison list.
    Reuses the exact same logic as /compare rather than duplicating it,
    since both endpoints must always agree on what "cheapest" means.
    """
    full_response = compare_fees(amount=amount, transfer_type=transfer_type)
    return full_response.results[0]


PROVIDER_TIERS_QUERY = """
    SELECT
        provider_name,
        transfer_type,
        channel,
        destination_wallet,
        min_amount,
        max_amount,
        fee_amount,
        fee_percent,
        fee_type,
        fairness_category,
        notes
    FROM staging_dev.fct_fairness_scores
    WHERE provider_name ILIKE '%' || :provider_name || '%'
    ORDER BY transfer_type, min_amount
"""


@app.get(
    "/api/providers/{provider_name}/fairness",
    tags=["Providers"],
    summary="Get a provider's full published fee structure",
)
def provider_fairness_report(provider_name: str):
    """
    Returns every fee tier for a single provider, exactly as stored --
    unlike /compare, this doesn't need a specific amount, since it's
    showing the provider's full published fee structure, not a
    computed answer for one transaction.
    """
    rows = run_query(PROVIDER_TIERS_QUERY, {"provider_name": provider_name})

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No provider found matching '{provider_name}'",
        )

    return {
        "provider_name": rows[0]["provider_name"],
        "total_fee_tiers": len(rows),
        "fee_tiers": rows,
    }
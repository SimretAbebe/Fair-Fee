"""
schemas.py

Pydantic models define exactly what shape of data the API accepts and
returns. FastAPI uses these to auto-validate incoming requests and to
auto-generate the /docs page -- we don't have to write that
documentation by hand.
"""

from typing import Optional

from pydantic import BaseModel


class FeeComparisonResult(BaseModel):
    provider_name: str
    transfer_type: str
    channel: str
    destination_wallet: Optional[str] = None
    fee_type: str
    computed_fee: float
    fee_as_percent_of_amount: float
    fairness_category: str
    notes: Optional[str] = None


class FeeComparisonResponse(BaseModel):
    amount: float
    transfer_type: str
    results: list[FeeComparisonResult]
    cheapest_provider: Optional[str] = None
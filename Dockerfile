FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (separate layer so Docker can cache this
# step -- it only re-runs when requirements.txt actually changes, not on
# every single code change, which makes rebuilds much faster).
# Note: uses api/requirements.txt specifically -- a minimal list of only
# what the API needs to run (FastAPI, SQLAlchemy, etc), NOT the full
# project requirements.txt, which also includes dbt and dagster -- tools
# the API container never actually runs, and which have a real, unrelated
# dependency conflict with each other (protobuf version mismatch).
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the actual application code
COPY api/ ./api/

# Render sets $PORT dynamically -- we bind to it rather than a hardcoded
# port, since Render assigns which port your app should listen on.
# Using shell form (not JSON array) here specifically because we need
# shell variable expansion for ${PORT:-8000} -- JSON array form (the
# usually-recommended form Docker suggests) doesn't support that.
CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
"""
pipeline.py

Defines the Fair Fee data pipeline as a Dagster job: four ops that must
run in a specific order, matching exactly what we've been doing manually
since Day 1 -- load raw data, then transform it with dbt, then test it.
"""

import subprocess

from dagster import job, op, In, Nothing


PROJECT_ROOT = "."  # run dagster dev from the repo root
DBT_PROJECT_DIR = "fee_warehouse"


def run_command(command: list[str], cwd: str = PROJECT_ROOT):
    """
    Runs a shell command and raises an exception if it fails, so Dagster
    correctly marks the op as failed instead of silently continuing.
    """
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)
        raise RuntimeError(f"Command failed: {' '.join(command)}")
    return result.stdout


@op
def load_raw_to_postgres():
    """
    Op 1: reads all JSON files in data/raw/ (fees and complaints) and
    loads them into the raw Postgres schema. Must run first -- nothing
    downstream has any data to work with until this completes.
    """
    run_command(["python", "src/load_raw_to_postgres.py"])


@op(ins={"start_after": In(Nothing)})
def run_dbt_transformations():
    """
    Op 2: runs all dbt models (staging, star schema, fairness scoring,
    complaint sentiment). Depends on load_raw_to_postgres finishing first
    -- dbt reads from raw.fee_records and raw.complaints, which don't
    exist with fresh data until Op 1 completes.
    """
    run_command(["dbt", "run"], cwd=DBT_PROJECT_DIR)


@op(ins={"start_after": In(Nothing)})
def run_dbt_tests():
    """
    Op 3: runs all dbt tests against the freshly built models. Depends on
    run_dbt_transformations finishing -- there's nothing to test against
    until the models actually exist.
    """
    run_command(["dbt", "test"], cwd=DBT_PROJECT_DIR)


@job
def fair_fee_pipeline():
    """
    Wires the ops together in the correct order:
    load_raw_to_postgres -> run_dbt_transformations -> run_dbt_tests

    Each op explicitly depends on the previous one finishing, via the
    start_after input -- this is what prevents dbt from ever running
    against stale or half-loaded raw data.
    """
    load_result = load_raw_to_postgres()
    transform_result = run_dbt_transformations(start_after=load_result)
    run_dbt_tests(start_after=transform_result)
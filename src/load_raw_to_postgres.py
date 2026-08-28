"""
load_raw_to_postgres.py

What this does, in plain terms:
1. Walks through every provider JSON file in data/raw/fees/{date}/{provider}.json
2. Flattens each fee record (adding provider-level info like provider_name and
   provider_category onto every row)
3. Writes everything into one raw table: raw.fee_records

"""

import json
import os
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()  # reads variables from a local .env file, which is gitignored

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "dbname": os.getenv("DB_NAME", "fair_fee_warehouse"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD"),
}

RAW_DATA_DIR = Path("data/raw/fees")
RAW_COMPLAINTS_DIR = Path("data/raw/complaints")

CREATE_SCHEMA_AND_TABLE_SQL = """
CREATE SCHEMA IF NOT EXISTS raw;

CREATE TABLE IF NOT EXISTS raw.fee_records (
    record_id TEXT,
    provider_name TEXT,
    provider_category TEXT,
    transfer_type TEXT,
    channel TEXT,
    destination_wallet TEXT,
    min_amount NUMERIC,
    max_amount NUMERIC,
    fee_amount NUMERIC,
    fee_percent NUMERIC,
    fee_type TEXT,
    valid_from DATE,
    valid_to DATE,
    valid_from_is_confirmed BOOLEAN,
    notes TEXT,
    source_url TEXT,
    date_collected DATE,
    loaded_at TIMESTAMP DEFAULT NOW()
);
"""

INSERT_SQL = """
INSERT INTO raw.fee_records (
    record_id, provider_name, provider_category, transfer_type, channel,
    destination_wallet, min_amount, max_amount, fee_amount, fee_percent,
    fee_type, valid_from, valid_to, valid_from_is_confirmed, notes,
    source_url, date_collected
) VALUES %s
"""

CREATE_COMPLAINTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS raw.complaints (
    complaint_id TEXT,
    provider_name TEXT,
    source_type TEXT,
    source_url TEXT,
    date_observed DATE,
    summary TEXT,
    short_quote TEXT,
    category TEXT,
    secondary_category TEXT,
    date_collected DATE,
    loaded_at TIMESTAMP DEFAULT NOW()
);
"""

INSERT_COMPLAINTS_SQL = """
INSERT INTO raw.complaints (
    complaint_id, provider_name, source_type, source_url, date_observed,
    summary, short_quote, category, secondary_category, date_collected
) VALUES %s
"""


def find_all_provider_files():
    """Find every provider JSON file across every dated folder."""
    return sorted(RAW_DATA_DIR.glob("*/*.json"))


def find_all_complaint_files():
    """Find every complaint JSON file across every dated folder."""
    return sorted(RAW_COMPLAINTS_DIR.glob("*/*.json"))


def flatten_provider_file(filepath):
    """
    Take one provider's JSON file (e.g. cbe.json) and turn its list of fee
    records into flat rows, each carrying the provider-level info (name,
    category, source_url, date_collected) alongside its own fields.
    """
    with open(filepath) as f:
        data = json.load(f)

    provider_name = data.get("provider_name")
    provider_category = data.get("provider_category")
    source_url = data.get("source_url")
    date_collected = data.get("date_collected")

    rows = []
    for record in data.get("records", []):
        rows.append((
            record.get("record_id"),
            provider_name,
            provider_category,
            record.get("transfer_type"),
            record.get("channel"),
            record.get("destination_wallet"),
            record.get("min_amount"),
            record.get("max_amount"),
            record.get("fee_amount"),
            record.get("fee_percent"),
            record.get("fee_type"),
            record.get("valid_from"),
            record.get("valid_to"),
            record.get("valid_from_is_confirmed"),
            record.get("notes"),
            source_url,
            date_collected,
        ))
    return rows


def flatten_complaint_file(filepath):
    """
    Same idea as flatten_provider_file, but for complaint records instead
    of fee records -- each complaint file's date_collected gets attached
    to every complaint row it contains.
    """
    with open(filepath) as f:
        data = json.load(f)

    date_collected = data.get("date_collected")

    rows = []
    for record in data.get("records", []):
        rows.append((
            record.get("complaint_id"),
            record.get("provider_name"),
            record.get("source_type"),
            record.get("source_url"),
            record.get("date_observed"),
            record.get("summary"),
            record.get("short_quote"),
            record.get("category"),
            record.get("secondary_category"),
            date_collected,
        ))
    return rows


def main():
    files = find_all_provider_files()
    print(f"Found {len(files)} provider files to load:")
    for f in files:
        print(f"  - {f}")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute(CREATE_SCHEMA_AND_TABLE_SQL)
    conn.commit()

    # Clear existing data before reloading. Without this, re-running this
    # script (e.g. after adding a new provider) would duplicate every
    # previously-loaded record instead of refreshing them -- this script
    # is meant to always reflect exactly what's currently in the JSON
    # files, not accumulate copies on every run.
    cur.execute("TRUNCATE TABLE raw.fee_records;")
    conn.commit()
    print("Cleared existing raw.fee_records before reload.")

    total_rows = 0
    for filepath in files:
        rows = flatten_provider_file(filepath)
        if rows:
            execute_values(cur, INSERT_SQL, rows)
            conn.commit()
            total_rows += len(rows)
            print(f"Loaded {len(rows)} records from {filepath.name}")

    print(f"\nDone. Total records loaded into raw.fee_records: {total_rows}")

    # Complaints -- same idempotent pattern: create table, clear, reload
    complaint_files = find_all_complaint_files()
    print(f"\nFound {len(complaint_files)} complaint files to load:")
    for f in complaint_files:
        print(f"  - {f}")

    cur.execute(CREATE_COMPLAINTS_TABLE_SQL)
    conn.commit()

    cur.execute("TRUNCATE TABLE raw.complaints;")
    conn.commit()
    print("Cleared existing raw.complaints before reload.")

    total_complaints = 0
    for filepath in complaint_files:
        rows = flatten_complaint_file(filepath)
        if rows:
            execute_values(cur, INSERT_COMPLAINTS_SQL, rows)
            conn.commit()
            total_complaints += len(rows)
            print(f"Loaded {len(rows)} complaints from {filepath.name}")

    print(f"\nDone. Total records loaded into raw.complaints: {total_complaints}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
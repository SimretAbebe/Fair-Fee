# Fair Fee Ethiopia Transfer Fee Transparency Platform

## Problem
Mobile banking and mobile money transfer fees in Ethiopia are often flat or coarsely
tiered rather than proportional — meaning small transfers can pay a fee that's a large
percentage of the amount, while large transfers pay proportionally far less. Customers
also have no easy way to compare fees across providers before sending money.

## What this project does
Collects, structures, and analyzes real transfer fee data from Ethiopian banks and
mobile money providers to:
1. Let a customer compare what they'd pay across providers for a given transfer
2. Score how "fair" (proportional) each fee structure is relative to transaction size

## Status
In progress — Day 1 of build. See `logs/collection_log.md` for data collection progress.

## Architecture
Raw collection → Data Lake (`data/raw/`) → PostgreSQL → dbt (staging → marts) → fairness scoring → FastAPI → dashboard


## Data Sources
All fee data is collected from official, published sources (bank tariff PDFs, official
pricing pages) — see `logs/collection_log.md` for full source attribution per provider.

## Setup
This project can run against a local PostgreSQL install (recommended for active
development) or via Docker Compose (`docker compose up -d`) for a fully isolated
environment. Set your database credentials in a `.env` file (see `.env.example`).
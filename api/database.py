"""
database.py

Sets up the connection between the API and Postgres, reusing the same
.env-based credentials as the dbt loader script. Uses SQLAlchemy Core
(not the full ORM) -- just enough to safely run parameterized SQL
against the warehouse without writing raw connection-handling code.
"""

import os
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "fair_fee_warehouse")

# URL-encode user/password before building the connection string -- if
# either contains special characters (e.g. "@", ":", "/"), inserting them
# raw into the URL breaks parsing, since the URL format itself uses those
# same characters as separators. quote_plus() escapes them safely.
DATABASE_URL = (
    f"postgresql+psycopg2://{quote_plus(DB_USER)}:{quote_plus(DB_PASSWORD)}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_engine(DATABASE_URL)


def run_query(sql: str, params: dict):
    """
    Runs a parameterized SQL query and returns a list of dict rows.

    Using parameters (:amount, :transfer_type, etc.) instead of building
    the SQL string with Python f-strings/concatenation matters here --
    it's what prevents SQL injection, since the database driver handles
    safely inserting the values instead of us pasting raw user input
    directly into a SQL string.
    """
    with engine.connect() as conn:
        result = conn.execute(text(sql), params)
        columns = result.keys()
        return [dict(zip(columns, row)) for row in result.fetchall()]
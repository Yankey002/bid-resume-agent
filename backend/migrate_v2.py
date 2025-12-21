"""Database migration script for V2."""

import os
import sys

from sqlalchemy import text

from app.db import engine


def migrate_v2():
    """Run migration for V2 schema."""
    with engine.connect() as conn:
        conn.begin()

        # 1. Create candidates table
        print("Checking candidates table...")
        try:
            # Check if table exists (PostgreSQL specific, but let's try standard SQL or catch error)
            # Or just use raw SQL to create if not exists
            conn.execute(
                text(
                    """
            CREATE TABLE IF NOT EXISTS candidates (
                id UUID PRIMARY KEY,
                unique_id VARCHAR(6) NOT NULL UNIQUE,
                name VARCHAR(128) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """
                )
            )
            print("Candidates table ensured.")

            # Create indices
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_candidates_unique_id ON candidates (unique_id);"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_candidates_name ON candidates (name);"
                )
            )

        except Exception as e:
            print(f"Error creating candidates table: {e}")

        # 2. Add candidate_id to raw_resumes
        print("Checking raw_resumes column...")
        try:
            # Check if column exists
            # This is a bit tricky across DBs, but assuming Postgres for now as per config
            # But wait, local dev might be different?
            # Let's just try to ADD COLUMN and catch "duplicate column" error
            conn.execute(
                text(
                    """
            ALTER TABLE raw_resumes
            ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates(id);
            """
                )
            )
            print("Column candidate_id added (if not existed).")

            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_raw_resumes_candidate_id ON raw_resumes (candidate_id);"
                )
            )

        except Exception as e:
            print(f"Error adding column: {e}")

        conn.commit()
        print("Migration V2 completed.")


if __name__ == "__main__":
    # Add backend to path
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    migrate_v2()

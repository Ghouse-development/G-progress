-- Migration: Add last_name and first_name fields to employees table
-- This migration adds separate last_name and first_name columns and migrates existing name data

-- Step 1: Add new columns (nullable initially for migration)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name TEXT;

-- Step 2: Migrate existing data from 'name' to 'last_name' and 'first_name'
-- Split names on first space character
UPDATE employees
SET
  last_name = CASE
    WHEN position(' ' in name) > 0 THEN substring(name from 1 for position(' ' in name) - 1)
    ELSE name
  END,
  first_name = CASE
    WHEN position(' ' in name) > 0 THEN substring(name from position(' ' in name) + 1)
    ELSE ''
  END
WHERE last_name IS NULL AND first_name IS NULL;

-- Step 3: Make new columns NOT NULL (after data migration)
ALTER TABLE employees ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE employees ALTER COLUMN first_name SET NOT NULL;

-- Step 4: Drop the old 'name' column (optional - comment out if you want to keep it for backward compatibility)
-- ALTER TABLE employees DROP COLUMN IF EXISTS name;

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_last_name ON employees(last_name);
CREATE INDEX IF NOT EXISTS idx_employees_first_name ON employees(first_name);

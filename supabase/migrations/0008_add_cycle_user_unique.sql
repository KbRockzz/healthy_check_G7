-- Migration 0008: Add unique constraint on cycle_records.user_id
-- Fixes 400 error from onConflict: 'user_id' in upsert calls
-- Each user should have only one active cycle record

BEGIN;

-- Add unique constraint so upsert with onConflict: 'user_id' works
ALTER TABLE public.cycle_records
  ADD CONSTRAINT uq_cycle_records_user_id UNIQUE (user_id);

COMMIT;

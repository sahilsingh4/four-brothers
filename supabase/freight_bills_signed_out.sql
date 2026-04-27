-- Add signed-out columns to freight_bills.
-- Run once in the Supabase SQL editor (Database → SQL Editor → New query).
-- Idempotent — safe to re-run.
--
-- WHY
-- The driver-upload form has a "Signed out" toggle (loaded / empty) +
-- timestamp the driver picks. The fields are sent up on FB submit, but
-- there were no DB columns to receive them — the values were getting
-- silently dropped before they hit Supabase. Review tab's "Signed out
-- LOADED at 14:32" line stayed blank as a result.
--
-- These two columns persist the values so Review + the FB Edit modal can
-- display + edit them.

ALTER TABLE freight_bills
  ADD COLUMN IF NOT EXISTS signed_out_status text,
  ADD COLUMN IF NOT EXISTS signed_out_at text;

-- Allow brief 5-char "HH:MM" format only — keeps junk data out.
-- (The form sends only HH:MM strings; this is a defensive guard.)
ALTER TABLE freight_bills
  DROP CONSTRAINT IF EXISTS freight_bills_signed_out_status_check;
ALTER TABLE freight_bills
  ADD CONSTRAINT freight_bills_signed_out_status_check
  CHECK (signed_out_status IS NULL OR signed_out_status IN ('loaded', 'empty'));

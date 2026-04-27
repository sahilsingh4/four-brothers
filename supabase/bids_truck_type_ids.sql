-- Add truck_type_ids array column to bids.
-- Run once in the Supabase SQL editor (Database → SQL Editor → New query).
-- Idempotent — safe to re-run.
--
-- WHY
-- Truck-type catalog Stage 3: bids can declare which truck types the
-- prospective job needs (Super 10, End Dump, Transfer, etc., picked from
-- the same catalog Fleet → Truck types maintains). When a bid is awarded
-- and converted to a project, the selections carry over so the project
-- inherits the right truck-type filter — no re-picking needed at
-- conversion time, and the order-form assignment picker downstream is
-- already correctly scoped (Stage 2 wired the project filter).
--
-- Stored as a JSONB array of integer truck-type IDs (matches the existing
-- projects.truck_type_ids shape so mapping logic is symmetric). Empty
-- array = no preference noted on the bid (project will inherit the same
-- "no restriction" state on conversion; admin can pick later).
--
-- Truck types themselves live in localStorage (fbt:truckTypes) per-tenant.

ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS truck_type_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

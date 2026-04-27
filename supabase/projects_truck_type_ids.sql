-- Add truck_type_ids array column to projects.
-- Run once in the Supabase SQL editor (Database → SQL Editor → New query).
-- Idempotent — safe to re-run.
--
-- WHY
-- Truck-type catalog Stage 2: each project can list which truck types it
-- uses (Super 10, End Dump, Transfer, etc., picked from the catalog defined
-- in Fleet → Truck types). When set, the order-form assignment picker
-- filters to only those types, so admin can't accidentally schedule a
-- truck that doesn't apply to the project.
--
-- Stored as a JSONB array of integer truck-type IDs. Empty array = no
-- restriction (admin can pick any type from the global catalog).
--
-- Truck types themselves live in localStorage (fbt:truckTypes) since the
-- catalog is small and per-tenant. The IDs in this column reference those
-- local entries by their `id` field; an unknown id just renders as
-- "unknown type" and admin can re-pick.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS truck_type_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

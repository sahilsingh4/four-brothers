-- Add acts_as_broker flag to contacts.
-- Run once in the Supabase SQL editor (Database → SQL Editor → New query).
-- Idempotent — safe to re-run.
--
-- WHY
-- Owner workflow: the same trucking company can play two roles for us —
-- they SUB-haul (we give them work, we pay them) AND they BROKER work back
-- to us (they give us work, they pay us their gross minus their cut).
-- Previously the contact had a single `type` of either "sub" or "broker"
-- and couldn't be both, forcing two separate contact records for one
-- company. This flag lets a single sub-type contact ALSO show up in the
-- customer/broker picker on orders so admin doesn't have to maintain dupes.
--
-- The existing `brokerage_applies` + `brokerage_percent` columns are
-- reused for the broker side of the relationship (the cut they take
-- from us when they bring us work). We can split into separate sub-side
-- vs broker-side percentages later if real-world rates diverge.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS acts_as_broker boolean NOT NULL DEFAULT false;

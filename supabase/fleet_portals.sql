-- Fleet portal token table + public lookup function.
-- Run once in the Supabase SQL editor (Database → SQL Editor → New query).
-- Idempotent — safe to re-run.
--
-- WHAT THIS DOES
-- 1. fleet_portals — maps a truck unit number to a shareable portal token.
--    The owner enables the portal per truck and texts the resulting link
--    to a driver. The driver opens it on the side of the road and shows
--    the cop the truck's registration / insurance / DOT inspection PDFs.
-- 2. fetch_truck_for_public(p_token) — SECURITY DEFINER function the
--    public portal page calls (no login). Validates the token, returns
--    the truck's compliance_documents rows. Driver compliance docs (CDL,
--    medical card) are NOT returned here — only truck-level docs that
--    the cop has a right to see anyway.

CREATE TABLE IF NOT EXISTS fleet_portals (
  truck_unit      text PRIMARY KEY,
  portal_token    text NOT NULL UNIQUE,
  portal_enabled  boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fleet_portals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fleet_portals_admin_all" ON fleet_portals;
CREATE POLICY "fleet_portals_admin_all"
  ON fleet_portals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION fetch_truck_for_public(p_token text)
RETURNS TABLE (
  truck_unit text,
  doc_id bigint,
  doc_type text,
  custom_type_label text,
  file_name text,
  file_path text,
  file_mime text,
  expiry_date date,
  issued_date date
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH docs AS (
    SELECT
      id          AS doc_id,
      truck_unit,
      doc_type,
      custom_type_label,
      file_name,
      file_path,
      file_mime,
      expiry_date,
      issued_date,
      deleted_at
    FROM compliance_documents
  )
  SELECT
    portal.truck_unit,
    docs.doc_id,
    docs.doc_type,
    docs.custom_type_label,
    docs.file_name,
    docs.file_path,
    docs.file_mime,
    docs.expiry_date,
    docs.issued_date
  FROM fleet_portals AS portal
  LEFT JOIN docs
    ON docs.truck_unit = portal.truck_unit
   AND docs.deleted_at IS NULL
  WHERE portal.portal_token = p_token
    AND portal.portal_enabled = true
  ORDER BY docs.expiry_date ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION fetch_truck_for_public(text) TO anon;

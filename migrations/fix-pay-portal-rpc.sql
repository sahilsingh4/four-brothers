-- Fixes the get_sub_pay_by_token RPC. Two bugs:
--   1. References `dispatches.pickup_location` / `dispatches.dropoff_location`
--      which don't exist; the actual columns are `pickup` / `dropoff`.
--   2. References `freight_bills.pay_statement_number` which never had a
--      schema migration. Added separately by a sibling SQL file.
--
-- Run this whole file in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.get_sub_pay_by_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id            bigint;
  v_contact_name  text;
  v_company_name  text;
  v_phone         text;
  v_email         text;
  v_type          text;
  v_pay_rate      numeric;
  v_pay_method    text;
  v_fbs           jsonb;
  v_cutoff        timestamptz := now() - interval '90 days';
BEGIN
  SELECT id, contact_name, company_name, phone, email, type, default_pay_rate, default_pay_method
  INTO v_id, v_contact_name, v_company_name, v_phone, v_email, v_type, v_pay_rate, v_pay_method
  FROM contacts
  WHERE portal_token = p_token
    AND portal_enabled = true
    AND type IN ('driver', 'subcontractor', 'sub')
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                    fb.id,
      'freight_bill_number',   fb.freight_bill_number,
      'driver_name',           fb.driver_name,
      'truck_number',          fb.truck_number,
      'status',                fb.status,
      'submitted_at',          fb.submitted_at,
      'material',              fb.material,
      'tonnage',               fb.tonnage,
      'load_count',            fb.load_count,
      'pickup_time',           fb.pickup_time,
      'dropoff_time',          fb.dropoff_time,
      'hours_billed',          fb.hours_billed,
      'notes',                 fb.notes,
      'paying_lines',          fb.paying_lines,
      'paid_amount',           fb.paid_amount,
      'paid_at',               fb.paid_at,
      'paid_method',           fb.paid_method,
      'paid_check_number',     fb.paid_check_number,
      'paid_notes',            fb.paid_notes,
      'pay_statement_number',  fb.pay_statement_number,
      'assignment_id',         fb.assignment_id,
      'dispatch_id',           fb.dispatch_id,
      'dispatch_code',         d.code,
      'dispatch_date',         d.date,
      'job_name',              d.job_name,
      'pickup_location',       d.pickup,
      'dropoff_location',      d.dropoff
    ) ORDER BY fb.submitted_at DESC
  ), '[]'::jsonb)
  INTO v_fbs
  FROM freight_bills fb
  JOIN dispatches d ON d.id = fb.dispatch_id
  WHERE fb.deleted_at IS NULL
    AND d.deleted_at IS NULL
    AND fb.status IN ('pending', 'approved')
    AND (
      fb.submitted_at >= v_cutoff
      OR (fb.paid_at IS NOT NULL AND fb.paid_at >= v_cutoff)
    )
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(d.assignments, '[]'::jsonb)) AS a
      WHERE (a->>'aid') = fb.assignment_id
        AND (a->>'contactId')::bigint = v_id
    );

  RETURN jsonb_build_object(
    'contact', jsonb_build_object(
      'id',                  v_id,
      'name',                COALESCE(v_contact_name, v_company_name),
      'companyName',         v_company_name,
      'phone',               v_phone,
      'email',               v_email,
      'type',                v_type,
      'defaultPayRate',      v_pay_rate,
      'defaultPayMethod',    v_pay_method
    ),
    'freightBills', v_fbs,
    'windowDays', 90
  );
END;
$function$;

-- Add sub_pay_debt_amount + sub_pay_debt_settled_at to freight_bills.
-- Run once in the Supabase SQL editor (Database → SQL Editor → New query).
-- Idempotent — safe to re-run.
--
-- WHY
-- When a customer short-pays an invoice AFTER the sub has already been paid
-- their full share (via a locked pay statement), the company eats the loss
-- by default. With these columns we can stamp the per-FB sub overpayment at
-- the moment the customer payment is recorded, then carry the debt forward
-- and surface it as a deduction on the sub's NEXT pay statement so the
-- company can recoup. Admin can also WAIVE the debt (sets settled_at) if
-- they don't want to claw back from the sub.
--
-- HOW IT WORKS
--   sub_pay_debt_amount      : Dollars the sub was overpaid (relative to
--                              what they'd have been paid had the customer
--                              short-pay been known at lock time). Computed
--                              at stamp-time in RecordPaymentModal.
--   sub_pay_debt_settled_at  : Timestamp when the debt was either deducted
--                              on a subsequent pay statement (auto-stamped
--                              on lock) or waived by admin. NULL = unsettled
--                              and surfaces on the next pay run.

ALTER TABLE freight_bills
  ADD COLUMN IF NOT EXISTS sub_pay_debt_amount     NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS sub_pay_debt_settled_at TIMESTAMPTZ;

-- Index for the "find unsettled debts for a sub" lookup that runs every
-- time PayrollTab opens. Partial index keeps it tiny since most FBs have
-- no debt.
CREATE INDEX IF NOT EXISTS freight_bills_sub_pay_debt_unsettled_idx
  ON freight_bills (assignment_id)
  WHERE sub_pay_debt_amount IS NOT NULL AND sub_pay_debt_settled_at IS NULL;

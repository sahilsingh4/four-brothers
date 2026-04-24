# 4 Brothers Trucking — Supabase RLS Audit

Session R · Security track

This is your security checklist for the Supabase database behind the app.
Follow it in order. Total time: ~15 minutes.

---

## Why this matters

Your app's public endpoints (the `/submit/:code` driver upload, the public quote
form, the `/customer/:token` portal) talk directly to Supabase using the
**anonymous** API key. That key is **baked into your frontend** — anyone who
views the page source can read it. The only thing stopping a motivated attacker
from wiping your entire database is **Row-Level Security (RLS)**.

RLS is Postgres's way of saying:
- Anonymous users can **only** do X (e.g. insert a freight bill on a specific
  dispatch, read one invoice by token)
- Authenticated admins can do **everything** on their own data

If RLS is off on a table, the anon key lets anyone read/write/delete **every
row**.

---

## How to run each check

1. Open your Supabase dashboard: https://supabase.com/dashboard
2. Pick your project: `mnfbwcqwjdddywbcmmdg`
3. Left sidebar → **Authentication** → **Policies** (lists every table's RLS)
4. Left sidebar → **SQL Editor** (for running the queries below)

---

## Step 1 — verify every table has RLS enabled

Run this query in the SQL Editor:

```sql
SELECT tablename,
       CASE WHEN rowsecurity THEN '✓ ENABLED' ELSE '✗ DISABLED — DANGER' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected result:** every table should show `✓ ENABLED`. The tables that
must have RLS on:

- `audit_log`
- `bids`
- `contacts`
- `dispatches`
- `freight_bills`
- `invoices`
- `projects`
- `quarries`
- `quotes`

**If any table shows `✗ DISABLED`:** fix it immediately with the SQL in
`migration-v20a-rls-hardening.sql`.

---

## Step 2 — verify each table has appropriate policies

Run this query:

```sql
SELECT tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

This lists every policy on every table. Compare against the expected policies
below.

### Expected policies by table

#### `freight_bills` (the most sensitive — driver upload writes here)

Required:
- ✓ `anon` can INSERT — but only if `dispatch_id` points to a real, non-deleted dispatch
- ✓ `authenticated` can SELECT/INSERT/UPDATE/DELETE everything

#### `dispatches`

Required:
- ✓ `anon` can SELECT by `code` only (so driver page can load the order info)
- ✓ `authenticated` can do everything

#### `quotes`

Required (already set by migration-v18):
- ✓ `anon` can INSERT (public quote form)
- ✓ `authenticated` can SELECT/UPDATE/DELETE

#### `contacts` (includes `portal_token` for customer portal)

Required:
- ✓ `anon` can SELECT ONE ROW by `portal_token` (customer portal lookup)
- ✓ `authenticated` can do everything

#### `invoices`

Required:
- ✓ `anon` can SELECT only when joined via customer `portal_token` (portal view)
- ✓ `authenticated` can do everything

#### `bids`, `quarries`, `projects`, `audit_log`

Required:
- ✓ `authenticated` only — no anon access at all

---

## Step 3 — run the hardening SQL

Open `migration-v20a-rls-hardening.sql` (shipped with this doc) and run the
whole thing in Supabase SQL Editor. It is **idempotent** — safe to run multiple
times. It:

1. Enables RLS on every table that needs it (no-op if already enabled)
2. Drops any overly permissive "allow all anon" policies (a common default)
3. Creates the correct scoped policies

---

## Step 4 — smoke test after applying

Open your app logged OUT (or incognito window), navigate to:

- `/#/submit/[REAL_DISPATCH_CODE]` → should load the driver form
- `/#/submit/INVALID123` → should **not** show any order data
- `/#/customer/[REAL_PORTAL_TOKEN]` → should load the customer portal
- Direct Supabase API call with anon key:
  ```bash
  curl "https://mnfbwcqwjdddywbcmmdg.supabase.co/rest/v1/bids" \
       -H "apikey: YOUR_ANON_KEY"
  ```
  Should return `[]` or an RLS error. If it returns actual bid data, RLS is
  broken on `bids`.

---

## Step 5 — ongoing hygiene

1. **Never create tables without RLS.** Supabase dashboard → Table Editor →
   always check "Enable RLS" when creating a new table.
2. **Rotate the anon key if you ever suspect it's leaked** to a place it
   shouldn't be (e.g. a public GitHub repo). Settings → API → regenerate.
3. **Review this checklist quarterly.** Policies drift as the app grows.
4. **Enable 2FA on your Supabase account** if you haven't. Dashboard → Account
   Settings.
5. **Check for `service_role` key exposure.** The service-role key bypasses all
   RLS and should **never** appear in frontend code. Search your codebase:
   ```
   grep -r "service_role\|SUPABASE_SERVICE" src/
   ```
   It should only appear in server-side code (none of your code is server-side,
   so this should return nothing).

---

## Red-team yourself monthly

Try to attack your own app with just the anon key:

- Can you list all freight bills? → `curl ".../rest/v1/freight_bills" -H "apikey: ..."`
- Can you insert a fake freight bill for a random dispatch? → test that the RLS
  policy rejects it
- Can you read another customer's invoices using a different token? → the
  policy should match token exactly, not pattern

If any of these succeed, your RLS is broken and needs immediate fix.

---

## Contacts for emergency

- Supabase support: https://supabase.com/support (paid plan gets faster response)
- If data is compromised: pause the project immediately (Dashboard → Settings → Pause project), then rotate keys

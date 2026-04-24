# 4 Brothers Trucking — RLS Security Audit
## Session R, v20 Security Track

This is a companion to `migration-v20a-rls-audit.sql`. Walk through each table in Supabase Dashboard and verify the policies match the recommended set. The SQL file applies all fixes at once.

---

## What is RLS?

**Row Level Security** is Postgres's way of enforcing "who can read/write which rows." Without RLS, your Supabase ANON KEY (which is in your browser JavaScript and therefore PUBLIC) could let anyone read/write any row.

With RLS enabled + proper policies, the database itself refuses unauthorized requests even if an attacker has your anon key.

**Your anon key IS public.** Anyone inspecting your website's network traffic can grab it. RLS is the ONLY thing stopping them from reading all your data.

---

## How to check your current RLS status

1. Open Supabase Dashboard → your project
2. Left sidebar → **Authentication** → **Policies**
3. You'll see every table with a count of its policies
4. Tables showing "0 policies" with RLS OFF = **UNPROTECTED**
5. Tables showing policies but RLS OFF = **STILL UNPROTECTED** (policies are ignored)

---

## Tables in your app and their required posture

### 1. `dispatches` — CRITICAL
- **Who should READ:** authenticated admins AND public (for the `/submit/:code` + `/track/:code` + `/client/:token` routes)
- **Who should INSERT:** authenticated admins only
- **Who should UPDATE:** authenticated admins only
- **Who should DELETE:** authenticated admins only
- **Why public read matters:** drivers scan QR codes and hit `/submit/<code>` without logging in. That URL needs to fetch the dispatch so the driver sees what they're submitting against.

### 2. `freight_bills` — CRITICAL
- **Who should READ:** authenticated admins AND public (customer portal + track page show FBs)
- **Who should INSERT:** authenticated admins AND public (drivers submit FBs anonymously)
- **Who should UPDATE:** authenticated admins only
- **Who should DELETE:** authenticated admins only
- **Public insert is necessary** — drivers don't log in. This is where Session P's rate limiting matters (since RLS can't easily enforce per-minute limits without extra work).

### 3. `contacts` — SENSITIVE
- **Who should READ:** authenticated admins only (contains phone numbers, emails, pay rates, brokerage percentages — all private)
- **Who should INSERT:** authenticated admins only
- **Who should UPDATE:** authenticated admins only
- **Who should DELETE:** authenticated admins only
- **Exception:** the customer portal (`/customer/:token`) needs to look up ONE contact by portal_token. We use a dedicated RPC function (`fetch_customer_by_token`) rather than a broad SELECT policy.

### 4. `quarries` — LOW-RISK
- **Who should READ:** authenticated admins only (or public — quarry data is not that sensitive)
- **Who should WRITE:** authenticated admins only

### 5. `invoices` — CRITICAL
- **Who should READ:** authenticated admins AND public (customer portal shows their invoices)
- **Who should INSERT:** authenticated admins only
- **Who should UPDATE:** authenticated admins only
- **Who should DELETE:** authenticated admins only
- **Public read is scoped via token** — the customer portal queries `WHERE bill_to_id = (...customer from token...)` so a visitor with one customer's token can't see another's. This relies on application-level filtering, not RLS.

### 6. `hours_logs` — INTERNAL
- **Who should READ/WRITE:** authenticated admins only (private driver hours)

### 7. `projects` — PUBLIC READ
- **Who should READ:** public (used in marketing portfolio — Session S)
- **Who should WRITE:** authenticated admins only
- **Current status:** already configured this way in `migration-v2.sql`

### 8. `quotes` — PUBLIC INSERT
- **Who should READ:** authenticated admins only
- **Who should INSERT:** public (visitors submit quote requests from the public site)
- **Who should UPDATE/DELETE:** authenticated admins only
- **Current status:** configured in `migration-v18.sql`

### 9. `bids` — ADMIN-ONLY
- **Who should READ/WRITE:** authenticated admins only
- **Current status:** configured in `migration-v19.sql`

### 10. `audit_log` — ADMIN-ONLY
- **Who should READ/WRITE:** authenticated admins only
- **Current status:** configured in `migration-v20.sql`

---

## Red flags to check in the Supabase Dashboard

Open **Authentication → Policies**. For each table look for:

- 🔴 **RLS disabled** (table shown without the shield icon) → run `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;`
- 🔴 **Permissive SELECT USING (true)** on sensitive tables (contacts, invoices, hours_logs, audit_log) → means anyone with the anon key can read everything. FIX IMMEDIATELY.
- 🔴 **INSERT policy with `WITH CHECK (true)` on admin-only tables** → means anyone with anon key can add rows. FIX.
- 🟡 **No policies at all** with RLS ON → the table is effectively locked (nobody can access). If that's an admin-only table, add an admin-all policy. If it's supposed to be accessible, the app will be broken for that table.

---

## How to test

After applying policies, open your app as an ANONYMOUS visitor (incognito browser, not logged in):

- `/submit/<valid-code>` → should load and allow FB submission ✓
- `/track/<valid-code>` → should load order details ✓
- `/client/<valid-portal-token>` → should load that customer's invoices ✓
- `/admin` or any other route → should redirect to login ✓
- Open browser DevTools → Network tab → try manually fetching `/rest/v1/contacts` via curl with your anon key → should return `401 Unauthorized` or empty array ✓
- Same for `/rest/v1/audit_log`, `/rest/v1/hours_logs` → should deny ✓

If any of the ✓ items fails, you have a misconfigured policy.

---

## Manual testing via curl

Replace `YOUR_PROJECT` and `YOUR_ANON_KEY`:

```bash
# Should fail with empty array or 401
curl "https://YOUR_PROJECT.supabase.co/rest/v1/contacts?select=*" \
  -H "apikey: YOUR_ANON_KEY"

# Should fail with empty array or 401
curl "https://YOUR_PROJECT.supabase.co/rest/v1/audit_log?select=*" \
  -H "apikey: YOUR_ANON_KEY"

# Should succeed (public read)
curl "https://YOUR_PROJECT.supabase.co/rest/v1/dispatches?select=id,code,status" \
  -H "apikey: YOUR_ANON_KEY"
```

---

## Extra hardening (optional)

- **Rotate your anon key** if you suspect it's been leaked: Supabase Dashboard → Settings → API → JWT Secret → "Generate new JWT secret" (rotates all keys; you'll need to update your `.env`/Vercel env vars)
- **Enable rate limiting at the Supabase edge** — in your project Dashboard → Settings → API → configure rate limits per endpoint
- **Monitor failed auth attempts** — Supabase logs them; review weekly for brute-force patterns

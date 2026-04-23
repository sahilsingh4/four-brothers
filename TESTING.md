# Vitest Test Suite — Setup & Running

This directory now includes automated tests for the core math + database logic.
Tests run with [Vitest](https://vitest.dev/).

## One-time install

In your repo root (`C:\Users\ghost\Desktop\four-brothers`), run:

```bash
npm install --save-dev vitest
```

That installs Vitest as a dev dependency. No other test libs are needed (we're
using pure Node tests — no DOM/React rendering in this first pass).

## Files to copy

Copy these into your project, keeping the names and locations:

| From (Claude output) | To (your project) |
|---|---|
| `App.jsx` | `src/App.jsx` (replace) |
| `math.js` | `src/math.js` (NEW file) |
| `math.test.js` | `src/math.test.js` (NEW file) |
| `db.test.js` | `src/db.test.js` (NEW file) |
| `vitest.config.js` | `vitest.config.js` (repo root, NEW file) |

## Add test script to package.json

Open `package.json` and add these under `"scripts"`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

(Keep whatever existing scripts you already have — just add `test` and `test:watch`.)

## Running

```bash
# One-time run — good for CI or just checking
npm test

# Watch mode — re-runs tests whenever you save a file
npm run test:watch
```

## What's tested

### `math.test.js` — ~90 test cases
Covers all the pure math that drives billing + payroll:

- **hoursFromTimes** — pickup/dropoff → decimal hours
- **computeLineNet / recomputeLine** — per-line gross, brokerage deduction, net
- **totalLines** — aggregate line arrays with brokerable/non-brokerable split
- **invoiceSubtotalFromFbs** — sum FB billingLines into invoice subtotal
- **payStubTotalsFromFbs** — gross + net + brokerage across FBs
- **seedHoursForFb** — hours seed logic (hoursBilled → times fallback)
- **billableHoursForInvoice** — reads HOURLY line qty, legacy fallback
- **contactBrokeragePct** — contact's brokerage setting
- **canDeleteDispatch / FreightBill / Invoice** — cascade lock rules
- **Integration scenarios** — realistic FB math end-to-end

### `db.test.js` — ~25 test cases
Covers the soft-delete + recovery data layer:

- **soft delete signatures** — all 3 tables (dispatches, freight_bills, invoices)
- **recover functions** — un-delete helpers
- **hard delete functions** — true removal
- **autoPurgeDeleted** — 30-day sweeper

Note: db tests mock the supabase client, so they verify the CALLS are correct
without actually hitting Supabase. They're fast and don't need network access.

## When to update tests

When you change billing or pay math (e.g. brokerage calculation, line qty flow):

1. Update the function in `src/math.js`
2. Update the matching test in `src/math.test.js`
3. Run `npm test` to confirm nothing else broke

When you change database behavior (e.g. new soft-delete logic):

1. Update `src/db.js`
2. Update `src/db.test.js` if the signature changed
3. Run `npm test`

## Important notes

- The inline math duplicates in `App.jsx` (inside `FBEditModal`, etc.) still
  exist — they weren't removed to avoid a risky 14k-line refactor. `math.js`
  is now the source of truth. If you change math, change it in BOTH until
  we finish migrating. Tests cover math.js.

- Tests use `vi.mock()` for supabase — they don't hit the real database.

- No UI / DOM / React tests in this first pass. We can add `@testing-library/react`
  later if we want to test components directly.

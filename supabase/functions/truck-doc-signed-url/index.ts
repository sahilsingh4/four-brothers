// Supabase Edge Function — generates a short-lived signed URL for a single
// truck-portal doc, after validating the visitor's portal token.
//
// Why an Edge Function (and not a direct client read):
//   The compliance-docs Storage bucket is PRIVATE because it also contains
//   driver PII (CDL, medical card). The public truck-portal page needs to
//   show non-PII truck docs (registration, insurance, DOT inspection) to a
//   driver who only has a roadside-share token — no Supabase login. This
//   function is the bridge: it validates the token against fleet_portals,
//   confirms the requested doc actually belongs to that truck, then mints a
//   60-second signed URL the page can open.
//
// Deploy:
//   supabase functions deploy truck-doc-signed-url
//
// Verify:
//   curl -X POST '{project-url}/functions/v1/truck-doc-signed-url' \
//     -H 'Content-Type: application/json' \
//     -d '{"token":"<paste-from-fleet_portals>","doc_id":<id>}'
//   Expect: { "url": "https://...storage..." }
//
// Notes:
//   - Service-role key is read from env; never log it.
//   - 60s TTL is short enough that a leaked URL stops working before it can
//     be shared meaningfully. Page re-requests on every "View" click.
//   - Driver compliance docs (CDL etc) are filtered out by the truck_unit
//     check: their compliance_documents rows have contact_id set, NOT
//     truck_unit, so they can never match a truck portal.

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — Deno globals (Deno.serve, Deno.env) aren't in the TS lib

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let payload;
  try { payload = await req.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const token = String(payload?.token || "").trim();
  const docId = Number(payload?.doc_id);
  if (!token || token.length < 8 || token.length > 64) return json({ error: "Bad token" }, 400);
  if (!Number.isInteger(docId) || docId <= 0) return json({ error: "Bad doc_id" }, 400);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "Function misconfigured" }, 500);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1. Validate the portal token.
  const { data: portal, error: portalErr } = await supabase
    .from("fleet_portals")
    .select("truck_unit, portal_enabled")
    .eq("portal_token", token)
    .maybeSingle();
  if (portalErr) return json({ error: "Lookup failed" }, 500);
  if (!portal || !portal.portal_enabled) return json({ error: "Invalid or disabled token" }, 401);

  // 2. Look up the doc and confirm it belongs to this truck (and isn't deleted).
  const { data: doc, error: docErr } = await supabase
    .from("compliance_documents")
    .select("file_path, truck_unit, deleted_at")
    .eq("id", docId)
    .maybeSingle();
  if (docErr) return json({ error: "Lookup failed" }, 500);
  if (!doc || doc.deleted_at || !doc.file_path) return json({ error: "Doc not found" }, 404);
  if (doc.truck_unit !== portal.truck_unit) return json({ error: "Not authorized for this doc" }, 403);

  // 3. Mint a 60-second signed URL and return it.
  const { data: signed, error: signErr } = await supabase.storage
    .from("compliance-docs")
    .createSignedUrl(doc.file_path, 60);
  if (signErr || !signed?.signedUrl) return json({ error: "Couldn't sign URL" }, 500);

  return json({ url: signed.signedUrl });
});

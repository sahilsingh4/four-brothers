// Helper functions for talking to Supabase
// Each function maps to a table and converts between our app's
// camelCase field names and the database's snake_case columns.

import { supabase } from "./supabase";

// ========== DISPATCHES ==========
const dispatchFromDB = (row) => ({
  id: row.id,
  code: row.code,
  date: row.date,
  jobName: row.job_name,
  clientName: row.client_name || "",
  clientId: row.client_id || null,
  projectId: row.project_id || null,
  subContractor: row.sub_contractor || "",
  subContractorId: row.sub_contractor_id,
  assignedDriverIds: row.assigned_driver_ids || [],
  assignedDriverNames: row.assigned_driver_names || [],
  assignments: row.assignments || [],
  pickup: row.pickup || "",
  dropoff: row.dropoff || "",
  material: row.material || "",
  trucksExpected: row.trucks_expected || 1,
  ratePerHour: row.rate_per_hour,
  ratePerTon: row.rate_per_ton,
  ratePerLoad: row.rate_per_load,
  quarryId: row.quarry_id,
  notes: row.notes || "",
  status: row.status || "open",
  lockOverrides: row.lock_overrides || [],
  noShowCount: row.no_show_count || 0,
  reconciledAt: row.reconciled_at || null,
  reconciledBy: row.reconciled_by || null,
  // v17 soft-delete metadata
  deletedAt: row.deleted_at || null,
  deletedBy: row.deleted_by || null,
  deleteReason: row.delete_reason || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const dispatchToDB = (d) => ({
  code: d.code,
  date: d.date,
  job_name: d.jobName,
  client_name: d.clientName || null,
  client_id: d.clientId ? Number(d.clientId) : null,
  project_id: d.projectId ? Number(d.projectId) : null,
  sub_contractor: d.subContractor || null,
  sub_contractor_id: d.subContractorId || null,
  assigned_driver_ids: d.assignedDriverIds || [],
  assigned_driver_names: d.assignedDriverNames || [],
  assignments: d.assignments || [],
  pickup: d.pickup || null,
  dropoff: d.dropoff || null,
  material: d.material || null,
  trucks_expected: Number(d.trucksExpected) || 1,
  rate_per_hour: d.ratePerHour ? Number(d.ratePerHour) : null,
  rate_per_ton: d.ratePerTon ? Number(d.ratePerTon) : null,
  rate_per_load: d.ratePerLoad ? Number(d.ratePerLoad) : null,
  quarry_id: d.quarryId || null,
  notes: d.notes || null,
  status: d.status || "open",
  lock_overrides: d.lockOverrides || [],
  no_show_count: Number(d.noShowCount) || 0,
  reconciled_at: d.reconciledAt || null,
  reconciled_by: d.reconciledBy || null,
});

export const fetchDispatches = async () => {
  const { data, error } = await supabase
    .from("dispatches")
    .select("*")
    .is("deleted_at", null)          // v17: exclude soft-deleted
    .order("created_at", { ascending: false });
  if (error) { console.error("fetchDispatches:", error); return []; }
  return (data || []).map(dispatchFromDB);
};

// v17: fetch soft-deleted dispatches for Recovery view (last 30 days only, auto-purge handled elsewhere)
export const fetchDeletedDispatches = async () => {
  const { data, error } = await supabase
    .from("dispatches")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) { console.error("fetchDeletedDispatches:", error); return []; }
  return (data || []).map(dispatchFromDB);
};

export const insertDispatch = async (d) => {
  const { data, error } = await supabase.from("dispatches").insert(dispatchToDB(d)).select().single();
  if (error) { console.error("insertDispatch:", error); throw error; }
  return dispatchFromDB(data);
};

export const updateDispatch = async (id, patch, expectedUpdatedAt = null) => {
  // v19c Session M: optimistic locking via updated_at guard.
  // The .eq("updated_at", X) filter matches on the PRE-update value; the .update() sets a NEW value.
  // If another writer has changed the row since expectedUpdatedAt was captured, the filter
  // matches 0 rows and maybeSingle returns null → ConcurrentEditError.
  const dbPatch = { ...dispatchToDB(patch), updated_at: new Date().toISOString() };
  let query = supabase.from("dispatches").update(dbPatch).eq("id", id);
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select().maybeSingle();
  if (error) { console.error("updateDispatch:", error); throw error; }
  if (!data) {
    if (expectedUpdatedAt) {
      const { data: currentRow } = await supabase.from("dispatches").select("updated_at").eq("id", id).maybeSingle();
      if (currentRow) throw new ConcurrentEditError("dispatches", id);
    }
    throw new Error(`updateDispatch: row ${id} not found`);
  }
  return dispatchFromDB(data);
};

// v17: SOFT delete — marks deleted_at + deleted_by + delete_reason. Recoverable for 30 days.
export const deleteDispatch = async (id, { deletedBy = "admin", reason = "" } = {}) => {
  const { error } = await supabase
    .from("dispatches")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
      delete_reason: reason || null,
    })
    .eq("id", id);
  if (error) { console.error("deleteDispatch (soft):", error); throw error; }
};

// v17: RECOVER — un-soft-deletes a dispatch
export const recoverDispatch = async (id) => {
  const { error } = await supabase
    .from("dispatches")
    .update({ deleted_at: null, deleted_by: null, delete_reason: null })
    .eq("id", id);
  if (error) { console.error("recoverDispatch:", error); throw error; }
};

// v17: HARD delete — actually removes row. Use sparingly (admin override or auto-purge).
export const hardDeleteDispatch = async (id) => {
  const { error } = await supabase.from("dispatches").delete().eq("id", id);
  if (error) { console.error("hardDeleteDispatch:", error); throw error; }
};

// ========== FREIGHT BILLS ==========
const fbFromDB = (row) => ({
  id: row.id,
  dispatchId: row.dispatch_id,
  assignmentId: row.assignment_id || null,
  freightBillNumber: row.freight_bill_number,
  driverName: row.driver_name,
  driverId: row.driver_id || null,
  truckNumber: row.truck_number,
  material: row.material,
  tonnage: row.tonnage,
  loadCount: row.load_count,
  pickupTime: row.pickup_time,
  dropoffTime: row.dropoff_time,
  notes: row.notes,
  photos: row.photos || [],
  submittedAt: row.submitted_at,
  status: row.status || "pending",
  adminNotes: row.admin_notes || "",
  approvedAt: row.approved_at,
  approvedBy: row.approved_by || "",
  jobNameOverride: row.job_name_override || "",
  description: row.description || "",
  hoursBilled: row.hours_billed,
  paidAt: row.paid_at || null,
  paidBy: row.paid_by || "",
  paidMethod: row.paid_method || "",
  paidCheckNumber: row.paid_check_number || "",
  paidAmount: row.paid_amount !== null && row.paid_amount !== undefined ? Number(row.paid_amount) : null,
  paidNotes: row.paid_notes || "",
  invoiceId: row.invoice_id || null,
  customerPaidAt: row.customer_paid_at || null,
  customerPaidAmount: row.customer_paid_amount !== null && row.customer_paid_amount !== undefined ? Number(row.customer_paid_amount) : null,
  extras: row.extras || [],
  minHoursApplied: !!row.min_hours_applied,
  minHoursApprovedBy: row.min_hours_approved_by || "",
  minHoursApprovedAt: row.min_hours_approved_at || null,
  customerRate: row.customer_rate !== null && row.customer_rate !== undefined ? Number(row.customer_rate) : null,
  customerRateMethod: row.customer_rate_method || null,
  // Billing snapshot (locked on invoice)
  billedHours: row.billed_hours !== null && row.billed_hours !== undefined ? Number(row.billed_hours) : null,
  billedTons: row.billed_tons !== null && row.billed_tons !== undefined ? Number(row.billed_tons) : null,
  billedLoads: row.billed_loads !== null && row.billed_loads !== undefined ? Number(row.billed_loads) : null,
  billedRate: row.billed_rate !== null && row.billed_rate !== undefined ? Number(row.billed_rate) : null,
  billedMethod: row.billed_method || null,
  billingAdjustments: row.billing_adjustments || [],
  billingLockedAt: row.billing_locked_at || null,
  // Pay snapshot (locked on pay statement)
  paidHours: row.paid_hours !== null && row.paid_hours !== undefined ? Number(row.paid_hours) : null,
  paidTons: row.paid_tons !== null && row.paid_tons !== undefined ? Number(row.paid_tons) : null,
  paidLoads: row.paid_loads !== null && row.paid_loads !== undefined ? Number(row.paid_loads) : null,
  paidRate: row.paid_rate !== null && row.paid_rate !== undefined ? Number(row.paid_rate) : null,
  paidMethodSnapshot: row.pay_snapshot_method || null,
  payingAdjustments: row.paying_adjustments || [],
  payStatementLockedAt: row.pay_statement_locked_at || null,
  // Unified line-item structure (v16) — replaces snapshot + extras + adjustments as the master data
  billingLines: Array.isArray(row.billing_lines) ? row.billing_lines : (row.billing_lines || []),
  payingLines: Array.isArray(row.paying_lines) ? row.paying_lines : (row.paying_lines || []),
  // v17 soft-delete metadata
  deletedAt: row.deleted_at || null,
  deletedBy: row.deleted_by || null,
  deleteReason: row.delete_reason || null,
});

const fbToDB = (fb) => ({
  dispatch_id: fb.dispatchId,
  assignment_id: fb.assignmentId || null,
  freight_bill_number: fb.freightBillNumber || null,
  driver_name: fb.driverName || null,
  driver_id: fb.driverId ? Number(fb.driverId) : null,
  truck_number: fb.truckNumber || null,
  material: fb.material || null,
  tonnage: fb.tonnage ? Number(fb.tonnage) : null,
  load_count: Number(fb.loadCount) || 1,
  pickup_time: fb.pickupTime || null,
  dropoff_time: fb.dropoffTime || null,
  notes: fb.notes || null,
  photos: fb.photos || [],
  status: fb.status || "pending",
  admin_notes: fb.adminNotes || null,
  approved_at: fb.approvedAt || null,
  approved_by: fb.approvedBy || null,
  job_name_override: fb.jobNameOverride || null,
  description: fb.description || null,
  hours_billed: fb.hoursBilled !== null && fb.hoursBilled !== undefined && fb.hoursBilled !== "" ? Number(fb.hoursBilled) : null,
  paid_at: fb.paidAt || null,
  paid_by: fb.paidBy || null,
  paid_method: fb.paidMethod || null,
  paid_check_number: fb.paidCheckNumber || null,
  paid_amount: fb.paidAmount !== null && fb.paidAmount !== undefined && fb.paidAmount !== "" ? Number(fb.paidAmount) : null,
  paid_notes: fb.paidNotes || null,
  invoice_id: fb.invoiceId || null,
  customer_paid_at: fb.customerPaidAt || null,
  customer_paid_amount: fb.customerPaidAmount !== null && fb.customerPaidAmount !== undefined && fb.customerPaidAmount !== "" ? Number(fb.customerPaidAmount) : null,
  extras: fb.extras || [],
  min_hours_applied: !!fb.minHoursApplied,
  min_hours_approved_by: fb.minHoursApprovedBy || null,
  min_hours_approved_at: fb.minHoursApprovedAt || null,
  customer_rate: fb.customerRate !== null && fb.customerRate !== undefined && fb.customerRate !== "" ? Number(fb.customerRate) : null,
  customer_rate_method: fb.customerRateMethod || null,
  // Billing snapshot
  billed_hours: fb.billedHours !== null && fb.billedHours !== undefined && fb.billedHours !== "" ? Number(fb.billedHours) : null,
  billed_tons: fb.billedTons !== null && fb.billedTons !== undefined && fb.billedTons !== "" ? Number(fb.billedTons) : null,
  billed_loads: fb.billedLoads !== null && fb.billedLoads !== undefined && fb.billedLoads !== "" ? Number(fb.billedLoads) : null,
  billed_rate: fb.billedRate !== null && fb.billedRate !== undefined && fb.billedRate !== "" ? Number(fb.billedRate) : null,
  billed_method: fb.billedMethod || null,
  billing_adjustments: fb.billingAdjustments || [],
  billing_locked_at: fb.billingLockedAt || null,
  // Pay snapshot
  paid_hours: fb.paidHours !== null && fb.paidHours !== undefined && fb.paidHours !== "" ? Number(fb.paidHours) : null,
  paid_tons: fb.paidTons !== null && fb.paidTons !== undefined && fb.paidTons !== "" ? Number(fb.paidTons) : null,
  paid_loads: fb.paidLoads !== null && fb.paidLoads !== undefined && fb.paidLoads !== "" ? Number(fb.paidLoads) : null,
  paid_rate: fb.paidRate !== null && fb.paidRate !== undefined && fb.paidRate !== "" ? Number(fb.paidRate) : null,
  pay_snapshot_method: fb.paidMethodSnapshot || null,
  paying_adjustments: fb.payingAdjustments || [],
  pay_statement_locked_at: fb.payStatementLockedAt || null,
  // Unified line-item structure (v16) — source of truth for invoice + pay statement totals
  billing_lines: Array.isArray(fb.billingLines) ? fb.billingLines : [],
  paying_lines: Array.isArray(fb.payingLines) ? fb.payingLines : [],
});

// v18 SAFETY FIX: partial-patch helper. Unlike fbToDB (which builds every column and sends
// NULLs for missing fields), this only includes columns whose source key is actually present
// in the patch. Prevents catastrophic data loss when a caller passes {billingLines: [...]}
// without spreading the full FB — previously that wiped dispatch_id, driver_name, status, etc.
const fbPatchToDB = (patch) => {
  const out = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(patch, k);
  const numOrNull = (v) => (v === "" || v === null || v === undefined) ? null : Number(v);
  const strOrNull = (v) => (v === "" || v === null || v === undefined) ? null : v;

  if (has("dispatchId"))            out.dispatch_id = patch.dispatchId;
  if (has("assignmentId"))          out.assignment_id = patch.assignmentId || null;
  if (has("freightBillNumber"))     out.freight_bill_number = strOrNull(patch.freightBillNumber);
  if (has("driverName"))            out.driver_name = strOrNull(patch.driverName);
  if (has("driverId"))              out.driver_id = patch.driverId ? Number(patch.driverId) : null;
  if (has("truckNumber"))           out.truck_number = strOrNull(patch.truckNumber);
  if (has("material"))              out.material = strOrNull(patch.material);
  if (has("tonnage"))               out.tonnage = numOrNull(patch.tonnage);
  if (has("loadCount"))             out.load_count = Number(patch.loadCount) || 1;
  if (has("pickupTime"))            out.pickup_time = strOrNull(patch.pickupTime);
  if (has("dropoffTime"))           out.dropoff_time = strOrNull(patch.dropoffTime);
  if (has("notes"))                 out.notes = strOrNull(patch.notes);
  if (has("photos"))                out.photos = patch.photos || [];
  if (has("status"))                out.status = patch.status;
  if (has("adminNotes"))            out.admin_notes = strOrNull(patch.adminNotes);
  if (has("approvedAt"))            out.approved_at = patch.approvedAt || null;
  if (has("approvedBy"))            out.approved_by = patch.approvedBy || null;
  if (has("jobNameOverride"))       out.job_name_override = strOrNull(patch.jobNameOverride);
  if (has("description"))           out.description = strOrNull(patch.description);
  if (has("hoursBilled"))           out.hours_billed = numOrNull(patch.hoursBilled);
  if (has("paidAt"))                out.paid_at = patch.paidAt || null;
  if (has("paidBy"))                out.paid_by = patch.paidBy || null;
  if (has("paidMethod"))            out.paid_method = patch.paidMethod || null;
  if (has("paidCheckNumber"))       out.paid_check_number = strOrNull(patch.paidCheckNumber);
  if (has("paidAmount"))            out.paid_amount = numOrNull(patch.paidAmount);
  if (has("paidNotes"))             out.paid_notes = strOrNull(patch.paidNotes);
  if (has("invoiceId"))             out.invoice_id = patch.invoiceId || null;
  if (has("customerPaidAt"))        out.customer_paid_at = patch.customerPaidAt || null;
  if (has("customerPaidAmount"))    out.customer_paid_amount = numOrNull(patch.customerPaidAmount);
  if (has("extras"))                out.extras = patch.extras || [];
  if (has("minHoursApplied"))       out.min_hours_applied = !!patch.minHoursApplied;
  if (has("minHoursApprovedBy"))    out.min_hours_approved_by = patch.minHoursApprovedBy || null;
  if (has("minHoursApprovedAt"))    out.min_hours_approved_at = patch.minHoursApprovedAt || null;
  if (has("customerRate"))          out.customer_rate = numOrNull(patch.customerRate);
  if (has("customerRateMethod"))    out.customer_rate_method = patch.customerRateMethod || null;
  if (has("billedHours"))           out.billed_hours = numOrNull(patch.billedHours);
  if (has("billedTons"))            out.billed_tons = numOrNull(patch.billedTons);
  if (has("billedLoads"))           out.billed_loads = numOrNull(patch.billedLoads);
  if (has("billedRate"))            out.billed_rate = numOrNull(patch.billedRate);
  if (has("billedMethod"))          out.billed_method = patch.billedMethod || null;
  if (has("billingAdjustments"))    out.billing_adjustments = patch.billingAdjustments || [];
  if (has("billingLockedAt"))       out.billing_locked_at = patch.billingLockedAt || null;
  if (has("paidHours"))             out.paid_hours = numOrNull(patch.paidHours);
  if (has("paidTons"))              out.paid_tons = numOrNull(patch.paidTons);
  if (has("paidLoads"))             out.paid_loads = numOrNull(patch.paidLoads);
  if (has("paidRate"))              out.paid_rate = numOrNull(patch.paidRate);
  if (has("paidMethodSnapshot"))    out.pay_snapshot_method = patch.paidMethodSnapshot || null;
  if (has("payingAdjustments"))     out.paying_adjustments = patch.payingAdjustments || [];
  if (has("payStatementLockedAt"))  out.pay_statement_locked_at = patch.payStatementLockedAt || null;
  if (has("billingLines"))          out.billing_lines = Array.isArray(patch.billingLines) ? patch.billingLines : [];
  if (has("payingLines"))           out.paying_lines = Array.isArray(patch.payingLines) ? patch.payingLines : [];

  return out;
};

export const fetchFreightBills = async () => {
  const { data, error } = await supabase
    .from("freight_bills")
    .select("*")
    .is("deleted_at", null)          // v17: exclude soft-deleted
    .order("submitted_at", { ascending: false });
  if (error) { console.error("fetchFreightBills:", error); return []; }
  return (data || []).map(fbFromDB);
};

// v17: soft-deleted freight bills for Recovery view
export const fetchDeletedFreightBills = async () => {
  const { data, error } = await supabase
    .from("freight_bills")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) { console.error("fetchDeletedFreightBills:", error); return []; }
  return (data || []).map(fbFromDB);
};

export const insertFreightBill = async (fb) => {
  const { data, error } = await supabase.from("freight_bills").insert(fbToDB(fb)).select().single();
  if (error) { console.error("insertFreightBill:", error); throw error; }
  return fbFromDB(data);
};

// v19c Session L: ConcurrentEditError — thrown when an update fails the optimistic-lock check.
// Caller can detect by checking `err.code === "CONCURRENT_EDIT"` and show a reload dialog.
export class ConcurrentEditError extends Error {
  constructor(table, id) {
    super(`Concurrent edit detected on ${table}:${id}`);
    this.name = "ConcurrentEditError";
    this.code = "CONCURRENT_EDIT";
    this.table = table;
    this.rowId = id;
  }
}

export const updateFreightBill = async (id, patch, expectedUpdatedAt = null) => {
  // v18 SAFETY: use fbPatchToDB (only includes fields in the patch) instead of fbToDB
  // (which builds every column and sends NULL for missing fields). This prevents data loss
  // when a caller passes a partial patch like {billingLines: [...]} without spreading the full FB.
  const dbPatch = fbPatchToDB(patch);
  if (Object.keys(dbPatch).length === 0) {
    console.warn("updateFreightBill: empty patch, nothing to update");
    return null;
  }
  // v19c Session L: Optimistic locking. Always stamp a NEW updated_at so concurrent
  // same-value updates still change the column (otherwise two writers with same expectedUpdatedAt
  // could both succeed in certain orderings).
  dbPatch.updated_at = new Date().toISOString();
  let query = supabase.from("freight_bills").update(dbPatch).eq("id", id);
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select().maybeSingle();
  if (error) { console.error("updateFreightBill:", error); throw error; }
  // When maybeSingle() finds nothing, it returns null (no error). That means
  // the row either (a) doesn't exist or (b) updated_at didn't match → concurrent edit.
  if (!data) {
    if (expectedUpdatedAt) {
      // Confirm the row exists before declaring a conflict
      const { data: currentRow } = await supabase.from("freight_bills").select("updated_at").eq("id", id).maybeSingle();
      if (currentRow) throw new ConcurrentEditError("freight_bills", id);
    }
    throw new Error(`updateFreightBill: row ${id} not found`);
  }
  return fbFromDB(data);
};

// v17: SOFT delete
export const deleteFreightBill = async (id, { deletedBy = "admin", reason = "" } = {}) => {
  const { error } = await supabase
    .from("freight_bills")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
      delete_reason: reason || null,
    })
    .eq("id", id);
  if (error) { console.error("deleteFreightBill (soft):", error); throw error; }
};

export const recoverFreightBill = async (id) => {
  const { error } = await supabase
    .from("freight_bills")
    .update({ deleted_at: null, deleted_by: null, delete_reason: null })
    .eq("id", id);
  if (error) { console.error("recoverFreightBill:", error); throw error; }
};

export const hardDeleteFreightBill = async (id) => {
  const { error } = await supabase.from("freight_bills").delete().eq("id", id);
  if (error) { console.error("hardDeleteFreightBill:", error); throw error; }
};

// ========== CONTACTS ==========
const contactFromDB = (row) => ({
  id: row.id,
  type: row.type || "sub",
  companyName: row.company_name || "",
  contactName: row.contact_name || "",
  phone: row.phone || "",
  phone2: row.phone2 || "",
  email: row.email || "",
  address: row.address || "",
  typicalTrucks: row.typical_trucks || "",
  rateNotes: row.rate_notes || "",
  usdot: row.usdot || "",
  insurance: row.insurance || "",
  notes: row.notes || "",
  favorite: !!row.favorite,
  drivesForId: row.drives_for_id || null,
  portalToken: row.portal_token || "",
  portalEnabled: !!row.portal_enabled,
  brokerageApplies: !!row.brokerage_applies,
  brokeragePercent: row.brokerage_percent !== null && row.brokerage_percent !== undefined ? Number(row.brokerage_percent) : 8,
  defaultPayRate: row.default_pay_rate !== null && row.default_pay_rate !== undefined ? Number(row.default_pay_rate) : null,
  defaultPayMethod: row.default_pay_method || "hour",
  defaultTruckNumber: row.default_truck_number || "",
  // 1099 / tax fields
  taxId: row.tax_id || "",          // SSN or EIN (stored as-is; do not display full in UI)
  taxIdType: row.tax_id_type || "", // 'ssn' | 'ein'
  legalName: row.legal_name || "",  // Name on 1099 (if different from company/contact name)
  is1099Eligible: !!row.is_1099_eligible,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const contactToDB = (c) => ({
  type: c.type || "sub",
  company_name: c.companyName || null,
  contact_name: c.contactName || null,
  phone: c.phone || null,
  phone2: c.phone2 || null,
  email: c.email || null,
  address: c.address || null,
  typical_trucks: c.typicalTrucks || null,
  rate_notes: c.rateNotes || null,
  usdot: c.usdot || null,
  insurance: c.insurance || null,
  notes: c.notes || null,
  favorite: !!c.favorite,
  drives_for_id: c.drivesForId ? Number(c.drivesForId) : null,
  portal_token: c.portalToken || null,
  portal_enabled: !!c.portalEnabled,
  brokerage_applies: !!c.brokerageApplies,
  brokerage_percent: c.brokeragePercent !== null && c.brokeragePercent !== undefined && c.brokeragePercent !== "" ? Number(c.brokeragePercent) : 8,
  default_pay_rate: c.defaultPayRate !== null && c.defaultPayRate !== undefined && c.defaultPayRate !== "" ? Number(c.defaultPayRate) : null,
  default_pay_method: c.defaultPayMethod || null,
  default_truck_number: c.defaultTruckNumber || null,
  tax_id: c.taxId || null,
  tax_id_type: c.taxIdType || null,
  legal_name: c.legalName || null,
  is_1099_eligible: !!c.is1099Eligible,
});

export const fetchContacts = async () => {
  const { data, error } = await supabase.from("contacts").select("*").order("company_name", { ascending: true });
  if (error) { console.error("fetchContacts:", error); return []; }
  return (data || []).map(contactFromDB);
};

export const insertContact = async (c) => {
  const { data, error } = await supabase.from("contacts").insert(contactToDB(c)).select().single();
  if (error) { console.error("insertContact:", error); throw error; }
  return contactFromDB(data);
};

export const updateContact = async (id, patch, expectedUpdatedAt = null) => {
  // v19c Session N: optimistic locking
  const dbPatch = { ...contactToDB(patch), updated_at: new Date().toISOString() };
  let query = supabase.from("contacts").update(dbPatch).eq("id", id);
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select().maybeSingle();
  if (error) { console.error("updateContact:", error); throw error; }
  if (!data) {
    if (expectedUpdatedAt) {
      const { data: currentRow } = await supabase.from("contacts").select("updated_at").eq("id", id).maybeSingle();
      if (currentRow) throw new ConcurrentEditError("contacts", id);
    }
    throw new Error(`updateContact: row ${id} not found`);
  }
  return contactFromDB(data);
};

export const deleteContact = async (id) => {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) { console.error("deleteContact:", error); throw error; }
};

// ========== CUSTOMER PORTAL LOOKUP ==========
// Public read by portal_token. Returns customer + their approved FBs only.
export const fetchCustomerByToken = async (token) => {
  const { data: cust, error: e1 } = await supabase
    .from("contacts")
    .select("*")
    .eq("portal_token", token)
    .eq("portal_enabled", true)
    .eq("type", "customer")
    .maybeSingle();
  if (e1) { console.error("fetchCustomerByToken:", e1); return null; }
  if (!cust) return null;
  const customer = contactFromDB(cust);

  // Fetch their orders
  const { data: orders } = await supabase
    .from("dispatches")
    .select("*")
    .eq("client_id", customer.id)
    .order("date", { ascending: false });

  // Fetch approved freight bills for those orders
  const orderIds = (orders || []).map((o) => o.id);
  let approvedFbs = [];
  if (orderIds.length > 0) {
    const { data: fbs } = await supabase
      .from("freight_bills")
      .select("*")
      .in("dispatch_id", orderIds)
      .eq("status", "approved")
      .order("submitted_at", { ascending: false });
    approvedFbs = (fbs || []).map(fbFromDB);
  }

  // Fetch their projects
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("customer_id", customer.id);

  return {
    customer,
    orders: (orders || []).map(dispatchFromDB),
    freightBills: approvedFbs,
    projects: projects || [],
  };
};

// ========== QUARRIES ==========
const quarryFromDB = (row) => ({
  id: row.id,
  name: row.name,
  address: row.address || "",
  contactName: row.contact_name || "",
  phone: row.phone || "",
  email: row.email || "",
  hours: row.hours || "",
  deliveryTerms: row.delivery_terms || "",
  scaleInfo: row.scale_info || "",
  notes: row.notes || "",
  materials: row.materials || [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const quarryToDB = (q) => ({
  name: q.name,
  address: q.address || null,
  contact_name: q.contactName || null,
  phone: q.phone || null,
  email: q.email || null,
  hours: q.hours || null,
  delivery_terms: q.deliveryTerms || null,
  scale_info: q.scaleInfo || null,
  notes: q.notes || null,
  materials: q.materials || [],
});

export const fetchQuarries = async () => {
  const { data, error } = await supabase.from("quarries").select("*").order("name", { ascending: true });
  if (error) { console.error("fetchQuarries:", error); return []; }
  return (data || []).map(quarryFromDB);
};

export const insertQuarry = async (q) => {
  const { data, error } = await supabase.from("quarries").insert(quarryToDB(q)).select().single();
  if (error) { console.error("insertQuarry:", error); throw error; }
  return quarryFromDB(data);
};

export const updateQuarry = async (id, patch, expectedUpdatedAt = null) => {
  // v19c Session N: optimistic locking
  const dbPatch = { ...quarryToDB(patch), updated_at: new Date().toISOString() };
  let query = supabase.from("quarries").update(dbPatch).eq("id", id);
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select().maybeSingle();
  if (error) { console.error("updateQuarry:", error); throw error; }
  if (!data) {
    if (expectedUpdatedAt) {
      const { data: currentRow } = await supabase.from("quarries").select("updated_at").eq("id", id).maybeSingle();
      if (currentRow) throw new ConcurrentEditError("quarries", id);
    }
    throw new Error(`updateQuarry: row ${id} not found`);
  }
  return quarryFromDB(data);
};

export const deleteQuarry = async (id) => {
  const { error } = await supabase.from("quarries").delete().eq("id", id);
  if (error) { console.error("deleteQuarry:", error); throw error; }
};

// ========== INVOICES ==========
const invoiceFromDB = (row) => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  invoiceDate: row.invoice_date,
  dueDate: row.due_date || "",
  billToName: row.bill_to_name || "",
  billToAddress: row.bill_to_address || "",
  billToContact: row.bill_to_contact || "",
  billToId: row.bill_to_id || null,
  projectId: row.project_id || null,
  poNumber: row.po_number || "",
  jobReference: row.job_reference || "",
  pricingMethod: row.pricing_method || "ton",
  rate: row.rate,
  extraFees: row.extra_fees || 0,
  extraFeesLabel: row.extra_fees_label || "",
  extras: row.extras || [],
  discount: row.discount || 0,
  terms: row.terms || "",
  notes: row.notes || "",
  includePhotos: !!row.include_photos,
  freightBillIds: row.freight_bill_ids || [],
  total: row.total,
  createdAt: row.created_at,
  amountPaid: row.amount_paid !== null && row.amount_paid !== undefined ? Number(row.amount_paid) : 0,
  paymentHistory: row.payment_history || [],
  paymentStatus: row.payment_status || "outstanding",
  statusOverride: row.status_override || null,
  // v17 soft-delete metadata
  deletedAt: row.deleted_at || null,
  deletedBy: row.deleted_by || null,
  deleteReason: row.delete_reason || null,
});

const invoiceToDB = (i) => ({
  invoice_number: i.invoiceNumber,
  invoice_date: i.invoiceDate,
  due_date: i.dueDate || null,
  bill_to_name: i.billToName || null,
  bill_to_address: i.billToAddress || null,
  bill_to_contact: i.billToContact || null,
  bill_to_id: i.billToId ? Number(i.billToId) : null,
  project_id: i.projectId ? Number(i.projectId) : null,
  po_number: i.poNumber || null,
  job_reference: i.jobReference || null,
  pricing_method: i.pricingMethod || null,
  rate: i.rate ? Number(i.rate) : null,
  extra_fees: Number(i.extraFees) || 0,
  extra_fees_label: i.extraFeesLabel || null,
  extras: i.extras || [],
  discount: Number(i.discount) || 0,
  terms: i.terms || null,
  notes: i.notes || null,
  include_photos: !!i.includePhotos,
  freight_bill_ids: i.freightBillIds || [],
  total: i.total ? Number(i.total) : null,
  amount_paid: Number(i.amountPaid) || 0,
  payment_history: i.paymentHistory || [],
  payment_status: i.paymentStatus || "outstanding",
  status_override: i.statusOverride || null,
});

export const updateInvoice = async (id, patch, expectedUpdatedAt = null) => {
  // v19c Session M: optimistic locking
  const dbPatch = { ...invoiceToDB(patch), updated_at: new Date().toISOString() };
  let query = supabase.from("invoices").update(dbPatch).eq("id", id);
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select().maybeSingle();
  if (error) { console.error("updateInvoice:", error); throw error; }
  if (!data) {
    if (expectedUpdatedAt) {
      const { data: currentRow } = await supabase.from("invoices").select("updated_at").eq("id", id).maybeSingle();
      if (currentRow) throw new ConcurrentEditError("invoices", id);
    }
    throw new Error(`updateInvoice: row ${id} not found`);
  }
  return invoiceFromDB(data);
};

export const fetchInvoices = async () => {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .is("deleted_at", null)          // v17: exclude soft-deleted
    .order("invoice_date", { ascending: false });
  if (error) { console.error("fetchInvoices:", error); return []; }
  return (data || []).map(invoiceFromDB);
};

// v17: soft-deleted invoices for Recovery view
export const fetchDeletedInvoices = async () => {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) { console.error("fetchDeletedInvoices:", error); return []; }
  return (data || []).map(invoiceFromDB);
};

export const insertInvoice = async (i) => {
  const { data, error } = await supabase.from("invoices").insert(invoiceToDB(i)).select().single();
  if (error) { console.error("insertInvoice:", error); throw error; }
  return invoiceFromDB(data);
};

// v17: SOFT delete
export const deleteInvoice = async (id, { deletedBy = "admin", reason = "" } = {}) => {
  const { error } = await supabase
    .from("invoices")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
      delete_reason: reason || null,
    })
    .eq("id", id);
  if (error) { console.error("deleteInvoice (soft):", error); throw error; }
};

export const recoverInvoice = async (id) => {
  const { error } = await supabase
    .from("invoices")
    .update({ deleted_at: null, deleted_by: null, delete_reason: null })
    .eq("id", id);
  if (error) { console.error("recoverInvoice:", error); throw error; }
};

export const hardDeleteInvoice = async (id) => {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) { console.error("hardDeleteInvoice:", error); throw error; }
};

// v17: AUTO-PURGE — hard-delete any row soft-deleted more than 30 days ago.
// Call this periodically (e.g., on app load or nightly cron) to keep the tables clean.
export const autoPurgeDeleted = async (daysOld = 30) => {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
  const results = { dispatches: 0, freightBills: 0, invoices: 0, quotes: 0, errors: [] };

  try {
    const { error, count } = await supabase
      .from("dispatches")
      .delete({ count: "exact" })
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff);
    if (error) results.errors.push({ table: "dispatches", error: error.message });
    else results.dispatches = count || 0;
  } catch (e) { results.errors.push({ table: "dispatches", error: String(e) }); }

  try {
    const { error, count } = await supabase
      .from("freight_bills")
      .delete({ count: "exact" })
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff);
    if (error) results.errors.push({ table: "freight_bills", error: error.message });
    else results.freightBills = count || 0;
  } catch (e) { results.errors.push({ table: "freight_bills", error: String(e) }); }

  try {
    const { error, count } = await supabase
      .from("invoices")
      .delete({ count: "exact" })
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff);
    if (error) results.errors.push({ table: "invoices", error: error.message });
    else results.invoices = count || 0;
  } catch (e) { results.errors.push({ table: "invoices", error: String(e) }); }

  // v18: include quotes in auto-purge
  try {
    const { error, count } = await supabase
      .from("quotes")
      .delete({ count: "exact" })
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff);
    if (error) results.errors.push({ table: "quotes", error: error.message });
    else results.quotes = count || 0;
  } catch (e) { results.errors.push({ table: "quotes", error: String(e) }); }

  return results;
};

// ========== PROJECTS ==========
const projectFromDB = (row) => ({
  id: row.id,
  customerId: row.customer_id || null,
  name: row.name,
  description: row.description || "",
  contractNumber: row.contract_number || "",
  poNumber: row.po_number || "",
  location: row.location || "",
  status: row.status || "active",
  startDate: row.start_date || "",
  endDate: row.end_date || "",
  tonnageGoal: row.tonnage_goal,
  budget: row.budget,
  bidAmount: row.bid_amount,
  primeContractor: row.prime_contractor || "",
  fundingSource: row.funding_source || "",
  certifiedPayroll: !!row.certified_payroll,
  notes: row.notes || "",
  defaultRate: row.default_rate !== null && row.default_rate !== undefined ? Number(row.default_rate) : null,
  minimumHours: row.minimum_hours !== null && row.minimum_hours !== undefined ? Number(row.minimum_hours) : null,
  subPayRate: row.sub_pay_rate !== null && row.sub_pay_rate !== undefined ? Number(row.sub_pay_rate) : null,
  subMinimumHours: row.sub_minimum_hours !== null && row.sub_minimum_hours !== undefined ? Number(row.sub_minimum_hours) : null,
  // v21 Session S: Public portfolio fields
  showOnWebsite: !!row.show_on_website,
  publicDescription: row.public_description || "",
  publicPhotos: Array.isArray(row.public_photos) ? row.public_photos : [],
  publicOrder: Number(row.public_order) || 0,
  completionYear: row.completion_year || null,
  publicCustomer: row.public_customer || "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const projectToDB = (p) => ({
  customer_id: p.customerId ? Number(p.customerId) : null,
  name: p.name,
  description: p.description || null,
  contract_number: p.contractNumber || null,
  po_number: p.poNumber || null,
  location: p.location || null,
  status: p.status || "active",
  start_date: p.startDate || null,
  end_date: p.endDate || null,
  tonnage_goal: p.tonnageGoal ? Number(p.tonnageGoal) : null,
  budget: p.budget ? Number(p.budget) : null,
  bid_amount: p.bidAmount ? Number(p.bidAmount) : null,
  prime_contractor: p.primeContractor || null,
  funding_source: p.fundingSource || null,
  certified_payroll: !!p.certifiedPayroll,
  notes: p.notes || null,
  default_rate: p.defaultRate !== null && p.defaultRate !== undefined && p.defaultRate !== "" ? Number(p.defaultRate) : null,
  minimum_hours: p.minimumHours !== null && p.minimumHours !== undefined && p.minimumHours !== "" ? Number(p.minimumHours) : null,
  sub_pay_rate: p.subPayRate !== null && p.subPayRate !== undefined && p.subPayRate !== "" ? Number(p.subPayRate) : null,
  sub_minimum_hours: p.subMinimumHours !== null && p.subMinimumHours !== undefined && p.subMinimumHours !== "" ? Number(p.subMinimumHours) : null,
  // v21 Session S: Public portfolio fields
  show_on_website: !!p.showOnWebsite,
  public_description: p.publicDescription || null,
  public_photos: Array.isArray(p.publicPhotos) ? p.publicPhotos : [],
  public_order: Number(p.publicOrder) || 0,
  completion_year: p.completionYear ? Number(p.completionYear) : null,
  public_customer: p.publicCustomer || null,
});

export const fetchProjects = async () => {
  const { data, error } = await supabase.from("projects").select("*").order("name", { ascending: true });
  if (error) { console.error("fetchProjects:", error); return []; }
  return (data || []).map(projectFromDB);
};

// v21 Session S: Public portfolio fetcher — used by public site (anon).
// Returns only projects where show_on_website=true, ordered by publicOrder.
export const fetchPublicProjects = async () => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("show_on_website", true)
    .order("public_order", { ascending: true })
    .order("completion_year", { ascending: false });
  if (error) { console.error("fetchPublicProjects:", error); return []; }
  return (data || []).map(projectFromDB);
};

export const insertProject = async (p) => {
  const { data, error } = await supabase.from("projects").insert(projectToDB(p)).select().single();
  if (error) { console.error("insertProject:", error); throw error; }
  return projectFromDB(data);
};

export const updateProject = async (id, patch, expectedUpdatedAt = null) => {
  // v19c Session N: optimistic locking
  const dbPatch = { ...projectToDB(patch), updated_at: new Date().toISOString() };
  let query = supabase.from("projects").update(dbPatch).eq("id", id);
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select().maybeSingle();
  if (error) { console.error("updateProject:", error); throw error; }
  if (!data) {
    if (expectedUpdatedAt) {
      const { data: currentRow } = await supabase.from("projects").select("updated_at").eq("id", id).maybeSingle();
      if (currentRow) throw new ConcurrentEditError("projects", id);
    }
    throw new Error(`updateProject: row ${id} not found`);
  }
  return projectFromDB(data);
};

export const deleteProject = async (id) => {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) { console.error("deleteProject:", error); throw error; }
};

// ========== REAL-TIME SUBSCRIPTIONS ==========
export const subscribeToDispatches = (callback) => {
  const channel = supabase
    .channel("dispatches-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "dispatches" }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToFreightBills = (callback) => {
  const channel = supabase
    .channel("fb-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "freight_bills" }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToContacts = (callback) => {
  const channel = supabase
    .channel("contacts-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToQuarries = (callback) => {
  const channel = supabase
    .channel("quarries-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "quarries" }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToInvoices = (callback) => {
  const channel = supabase
    .channel("invoices-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToProjects = (callback) => {
  const channel = supabase
    .channel("projects-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

// ========================================================================
// QUOTES (v18) — public quote requests from the marketing site
// ========================================================================
// Public visitors can INSERT (unauthenticated), authenticated admin can
// SELECT/UPDATE/DELETE. Soft-delete compatible.
// ========================================================================

const quoteFromDB = (row) => ({
  id: row.id,
  name: row.name,
  company: row.company || "",
  email: row.email,
  phone: row.phone || "",
  service: row.service || "",
  pickup: row.pickup || "",
  dropoff: row.dropoff || "",
  material: row.material || "",
  quantity: row.quantity || "",
  needDate: row.need_date || "",
  notes: row.notes || "",
  status: row.status || "new",
  revisions: row.revisions || [],
  submittedAt: row.submitted_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at || null,
  deletedBy: row.deleted_by || null,
  deleteReason: row.delete_reason || null,
});

const quoteToDB = (q) => ({
  name: q.name,
  company: q.company || null,
  email: q.email,
  phone: q.phone || null,
  service: q.service || null,
  pickup: q.pickup || null,
  dropoff: q.dropoff || null,
  material: q.material || null,
  quantity: q.quantity || null,
  need_date: q.needDate || null,
  notes: q.notes || null,
  status: q.status || "new",
  revisions: q.revisions || [],
});

export const fetchQuotes = async () => {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .is("deleted_at", null)
    .order("submitted_at", { ascending: false });
  if (error) { console.error("fetchQuotes:", error); return []; }
  return (data || []).map(quoteFromDB);
};

export const fetchDeletedQuotes = async () => {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) { console.error("fetchDeletedQuotes:", error); return []; }
  return (data || []).map(quoteFromDB);
};

export const insertQuote = async (q) => {
  // IMPORTANT: do NOT chain .select().single() here — that would require SELECT
  // permission on the inserted row, which we deliberately restrict to authenticated
  // admin users only. Anonymous visitors submitting from the public site only have
  // INSERT permission, so we skip the SELECT-after-INSERT pattern.
  //
  // For the admin UI, the quote will show up via the realtime subscription
  // (which runs under the authenticated admin JWT and CAN read).
  //
  // We return a local copy of the quote with a client-generated ID-ish value for
  // optimistic UI. The real row ID will come through the realtime event.
  const payload = quoteToDB(q);
  const { error } = await supabase.from("quotes").insert(payload);
  if (error) { console.error("insertQuote:", error); throw error; }
  // Return the input back, minus the DB-only fields. The actual row with real ID
  // will arrive via the subscribeToQuotes realtime callback for admin UI.
  return {
    ...q,
    submittedAt: q.submittedAt || new Date().toISOString(),
    status: q.status || "new",
    revisions: q.revisions || [],
  };
};

export const updateQuote = async (id, patch, expectedUpdatedAt = null) => {
  // v19c Session N: optimistic locking. Quotes don't currently auto-stamp updated_at
  // in quoteToDB; add it here so every update bumps the column.
  const dbPatch = { ...quoteToDB(patch), updated_at: new Date().toISOString() };
  let query = supabase.from("quotes").update(dbPatch).eq("id", id);
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select().maybeSingle();
  if (error) { console.error("updateQuote:", error); throw error; }
  if (!data) {
    if (expectedUpdatedAt) {
      const { data: currentRow } = await supabase.from("quotes").select("updated_at").eq("id", id).maybeSingle();
      if (currentRow) throw new ConcurrentEditError("quotes", id);
    }
    throw new Error(`updateQuote: row ${id} not found`);
  }
  return quoteFromDB(data);
};

// Soft delete
export const deleteQuote = async (id, { deletedBy = "admin", reason = "" } = {}) => {
  const { error } = await supabase
    .from("quotes")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
      delete_reason: reason || null,
    })
    .eq("id", id);
  if (error) { console.error("deleteQuote (soft):", error); throw error; }
};

export const recoverQuote = async (id) => {
  const { error } = await supabase
    .from("quotes")
    .update({ deleted_at: null, deleted_by: null, delete_reason: null })
    .eq("id", id);
  if (error) { console.error("recoverQuote:", error); throw error; }
};

export const hardDeleteQuote = async (id) => {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) { console.error("hardDeleteQuote:", error); throw error; }
};

export const subscribeToQuotes = (callback) => {
  const channel = supabase
    .channel("quotes-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

// ========== BIDS (v19) ==========
// RFP/bid tracker — pursues public works opportunities from discovery to outcome.
const bidFromDB = (row) => ({
  id: row.id,
  rfbNumber: row.rfb_number || "",
  title: row.title || "",
  agency: row.agency || "",
  agencyContactName: row.agency_contact_name || "",
  agencyContactEmail: row.agency_contact_email || "",
  agencyContactPhone: row.agency_contact_phone || "",
  sourceUrl: row.source_url || "",
  portal: row.portal || "",
  discoveredAt: row.discovered_at,
  preBidMeetingAt: row.pre_bid_meeting_at,
  questionsDueAt: row.questions_due_at,
  submissionDueAt: row.submission_due_at,
  awardDecisionExpected: row.award_decision_expected,
  ourSubmittedAt: row.our_submitted_at,
  estimatedValue: row.estimated_value,
  ourBidAmount: row.our_bid_amount,
  bondRequired: row.bond_required || false,
  bondAmount: row.bond_amount,
  bondType: row.bond_type || "",
  ourCostEstimate: row.our_cost_estimate,
  status: row.status || "discovered",
  priority: row.priority || "medium",
  outcomeAt: row.outcome_at,
  winningBidder: row.winning_bidder || "",
  winningBidAmount: row.winning_bid_amount,
  rejectionReason: row.rejection_reason || "",
  lessonsLearned: row.lessons_learned || "",
  notes: row.notes || "",
  tags: row.tags || [],
  checklistItems: row.checklist_items || [],  // v19a: document checklist
  deletedAt: row.deleted_at || null,
  deletedBy: row.deleted_by || null,
  deleteReason: row.delete_reason || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const bidToDB = (bid) => ({
  rfb_number: bid.rfbNumber || null,
  title: bid.title,
  agency: bid.agency || null,
  agency_contact_name: bid.agencyContactName || null,
  agency_contact_email: bid.agencyContactEmail || null,
  agency_contact_phone: bid.agencyContactPhone || null,
  source_url: bid.sourceUrl || null,
  portal: bid.portal || null,
  pre_bid_meeting_at: bid.preBidMeetingAt || null,
  questions_due_at: bid.questionsDueAt || null,
  submission_due_at: bid.submissionDueAt || null,
  award_decision_expected: bid.awardDecisionExpected || null,
  our_submitted_at: bid.ourSubmittedAt || null,
  estimated_value: bid.estimatedValue != null ? Number(bid.estimatedValue) : null,
  our_bid_amount: bid.ourBidAmount != null ? Number(bid.ourBidAmount) : null,
  bond_required: !!bid.bondRequired,
  bond_amount: bid.bondAmount != null ? Number(bid.bondAmount) : null,
  bond_type: bid.bondType || null,
  our_cost_estimate: bid.ourCostEstimate != null ? Number(bid.ourCostEstimate) : null,
  status: bid.status || "discovered",
  priority: bid.priority || "medium",
  outcome_at: bid.outcomeAt || null,
  winning_bidder: bid.winningBidder || null,
  winning_bid_amount: bid.winningBidAmount != null ? Number(bid.winningBidAmount) : null,
  rejection_reason: bid.rejectionReason || null,
  lessons_learned: bid.lessonsLearned || null,
  notes: bid.notes || null,
  tags: bid.tags || [],
  checklist_items: bid.checklistItems || [],  // v19a: document checklist
});

export const fetchBids = async () => {
  const { data, error } = await supabase
    .from("bids")
    .select("*")
    .is("deleted_at", null)
    .order("submission_due_at", { ascending: true, nullsFirst: false });
  if (error) { console.error("fetchBids:", error); return []; }
  return (data || []).map(bidFromDB);
};

export const fetchDeletedBids = async () => {
  const { data, error } = await supabase
    .from("bids")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) { console.error("fetchDeletedBids:", error); return []; }
  return (data || []).map(bidFromDB);
};

export const insertBid = async (bid) => {
  const { data, error } = await supabase
    .from("bids")
    .insert([bidToDB(bid)])
    .select()
    .single();
  if (error) { console.error("insertBid:", error); throw error; }
  return bidFromDB(data);
};

export const updateBid = async (id, patch, expectedUpdatedAt = null) => {
  // v19c Session N: optimistic locking.
  // Bids already have a DB trigger (touch_bids_updated_at) that auto-stamps updated_at on UPDATE,
  // but we also set it explicitly to be resilient if the trigger doesn't exist.
  const dbPatch = { ...bidToDB(patch), updated_at: new Date().toISOString() };
  let query = supabase.from("bids").update(dbPatch).eq("id", id);
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select().maybeSingle();
  if (error) { console.error("updateBid:", error); throw error; }
  if (!data) {
    if (expectedUpdatedAt) {
      const { data: currentRow } = await supabase.from("bids").select("updated_at").eq("id", id).maybeSingle();
      if (currentRow) throw new ConcurrentEditError("bids", id);
    }
    throw new Error(`updateBid: row ${id} not found`);
  }
  return bidFromDB(data);
};

export const deleteBid = async (id, { deletedBy = "admin", reason = "" } = {}) => {
  const { error } = await supabase
    .from("bids")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
      delete_reason: reason || null,
    })
    .eq("id", id);
  if (error) { console.error("deleteBid (soft):", error); throw error; }
};

export const recoverBid = async (id) => {
  const { error } = await supabase
    .from("bids")
    .update({ deleted_at: null, deleted_by: null, delete_reason: null })
    .eq("id", id);
  if (error) { console.error("recoverBid:", error); throw error; }
};

export const hardDeleteBid = async (id) => {
  const { error } = await supabase.from("bids").delete().eq("id", id);
  if (error) { console.error("hardDeleteBid:", error); throw error; }
};

export const subscribeToBids = (callback) => {
  const channel = supabase
    .channel("bids-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

// ========== AUDIT LOG (v20 Session O) ==========
// Records high-value actions for dispute/investigation purposes. 90-day retention.
//
// Action type catalog:
//   fb.approve, fb.reject, fb.paid, fb.unpaid, fb.soft_delete, fb.recover
//   invoice.create, invoice.payment_recorded, invoice.payment_deleted, invoice.delete
//   dispatch.status_toggle, dispatch.soft_delete, dispatch.recover
//   bid.status_change, bid.soft_delete, bid.recover
//   quote.status_change, quote.convert, quote.soft_delete
//
// Usage: logAudit({ actionType, entityType, entityId, entityLabel, actor, metadata, before, after })

const auditFromDB = (row) => ({
  id: row.id,
  actionType: row.action_type,
  entityType: row.entity_type,
  entityId: row.entity_id,
  entityLabel: row.entity_label || "",
  actor: row.actor || "admin",
  happenedAt: row.happened_at,
  metadata: row.metadata || {},
  before: row.before_value,
  after: row.after_value,
  createdAt: row.created_at,
});

export const logAudit = async ({
  actionType,
  entityType,
  entityId,
  entityLabel = "",
  actor = "admin",
  metadata = {},
  before = null,
  after = null,
}) => {
  // Audit logging is fire-and-forget — failures are logged but don't block the calling action.
  // Returns void. If the insert fails, we don't want the user-facing action to fail because of it.
  try {
    const { error } = await supabase.from("audit_log").insert([{
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel || null,
      actor,
      metadata: metadata || {},
      before_value: before,
      after_value: after,
    }]);
    if (error) {
      // Log but don't throw — audit is non-critical for UX.
      // Most likely cause: table doesn't exist yet (migration not run).
      console.warn("logAudit:", error.message);
    }
  } catch (e) {
    console.warn("logAudit threw:", e?.message);
  }
};

export const fetchAuditLog = async ({ entityId = null, actionType = null, limit = 200, from = null, to = null } = {}) => {
  let q = supabase.from("audit_log").select("*").order("happened_at", { ascending: false }).limit(limit);
  if (entityId) q = q.eq("entity_id", entityId);
  if (actionType) q = q.eq("action_type", actionType);
  if (from) q = q.gte("happened_at", from);
  if (to) q = q.lte("happened_at", to);
  const { data, error } = await q;
  if (error) { console.error("fetchAuditLog:", error); return []; }
  return (data || []).map(auditFromDB);
};

// Optionally call on app boot to purge logs older than 90 days
export const purgeOldAuditLogs = async () => {
  try {
    const { error } = await supabase.rpc("purge_old_audit_logs");
    if (error) { console.warn("purgeOldAuditLogs:", error.message); return 0; }
    return 1;
  } catch (e) { console.warn("purgeOldAuditLogs threw:", e?.message); return 0; }
};

// ========== TESTIMONIALS (v22 Session T) ==========
// Customer/partner quotes for public site. Admin-managed.

const testimonialFromDB = (row) => ({
  id: row.id,
  quoteText: row.quote_text || "",
  authorName: row.author_name || "",
  authorCompany: row.author_company || "",
  authorRole: row.author_role || "",
  rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : null,
  showOnWebsite: !!row.show_on_website,
  displayOrder: Number(row.display_order) || 0,
  source: row.source || "",
  collectedAt: row.collected_at || null,
  notes: row.notes || "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const testimonialToDB = (t) => ({
  quote_text: t.quoteText || "",
  author_name: t.authorName || "",
  author_company: t.authorCompany || null,
  author_role: t.authorRole || null,
  rating: t.rating !== null && t.rating !== undefined && t.rating !== "" ? Number(t.rating) : null,
  show_on_website: !!t.showOnWebsite,
  display_order: Number(t.displayOrder) || 0,
  source: t.source || null,
  collected_at: t.collectedAt || null,
  notes: t.notes || null,
});

export const fetchTestimonials = async () => {
  const { data, error } = await supabase.from("testimonials").select("*").order("display_order", { ascending: true });
  if (error) { console.error("fetchTestimonials:", error); return []; }
  return (data || []).map(testimonialFromDB);
};

export const fetchPublicTestimonials = async () => {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("show_on_website", true)
    .order("display_order", { ascending: true });
  if (error) { console.error("fetchPublicTestimonials:", error); return []; }
  return (data || []).map(testimonialFromDB);
};

export const insertTestimonial = async (t) => {
  const { data, error } = await supabase.from("testimonials").insert(testimonialToDB(t)).select().single();
  if (error) { console.error("insertTestimonial:", error); throw error; }
  return testimonialFromDB(data);
};

export const updateTestimonial = async (id, patch, expectedUpdatedAt = null) => {
  const dbPatch = { ...testimonialToDB(patch), updated_at: new Date().toISOString() };
  let query = supabase.from("testimonials").update(dbPatch).eq("id", id);
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select().maybeSingle();
  if (error) { console.error("updateTestimonial:", error); throw error; }
  if (!data) {
    if (expectedUpdatedAt) {
      const { data: currentRow } = await supabase.from("testimonials").select("updated_at").eq("id", id).maybeSingle();
      if (currentRow) throw new ConcurrentEditError("testimonials", id);
    }
    throw new Error(`updateTestimonial: row ${id} not found`);
  }
  return testimonialFromDB(data);
};

export const deleteTestimonial = async (id) => {
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) { console.error("deleteTestimonial:", error); throw error; }
};

// ========== DRIVER/SUB PAY PORTAL (v23 Session Y) ==========
// Public fetcher — called by /#/pay/:token page.
// Uses Postgres function get_sub_pay_by_token which enforces token auth
// and returns only FBs assigned to this sub/driver within last 90 days.
export const fetchSubPayByToken = async (token) => {
  if (!token) return null;
  const { data, error } = await supabase.rpc("get_sub_pay_by_token", { p_token: token });
  if (error) { console.error("fetchSubPayByToken:", error); return null; }
  if (!data) return null;
  const fbs = (data.freightBills || []).map((row) => ({
    ...fbFromDB(row),
    dispatchCode: row.dispatch_code,
    dispatchDate: row.dispatch_date,
    jobName: row.job_name,
    pickupLocation: row.pickup_location,
    dropoffLocation: row.dropoff_location,
  }));
  return {
    contact: data.contact,
    freightBills: fbs,
    windowDays: data.windowDays || 90,
  };
};

// ========== COMPLIANCE DOCUMENTS (v24 Session AA) ==========
// Tracks DOT compliance docs with expiry dates + optional file attachments.
// Types: drug_test, medical_card, mvr_license, coi, additional_insured,
//        truck_inspection, other (free-form).

// Known document types with human-readable labels
export const COMPLIANCE_DOC_TYPES = [
  { key: "drug_test",         label: "Drug Test / Consortium",    appliesTo: "driver" },
  { key: "medical_card",      label: "Medical Card / DOT Physical", appliesTo: "driver" },
  { key: "mvr_license",       label: "MVR / Driver License",      appliesTo: "driver" },
  { key: "coi",               label: "Certificate of Insurance",  appliesTo: "sub" },
  { key: "additional_insured", label: "Additional Insured",       appliesTo: "sub" },
  { key: "truck_inspection",  label: "DOT / BIT Inspection",      appliesTo: "truck" },
  { key: "other",             label: "Other",                      appliesTo: "any" },
];

// Compute status + days remaining from expiry_date. Called client-side.
// Returns: { status, daysUntilExpiry, severity }
//   status:   'expired' | 'critical' | 'warning' | 'upcoming' | 'current' | 'no_date'
//   severity: 0 (none) to 4 (expired)
export const getComplianceStatus = (expiryDate) => {
  if (!expiryDate) return { status: "no_date", daysUntilExpiry: null, severity: 0 };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  const days = Math.round((exp - now) / (1000 * 60 * 60 * 24));
  if (days < 0)  return { status: "expired",  daysUntilExpiry: days, severity: 4 };
  if (days <= 30) return { status: "critical", daysUntilExpiry: days, severity: 3 };
  if (days <= 60) return { status: "warning",  daysUntilExpiry: days, severity: 2 };
  if (days <= 90) return { status: "upcoming", daysUntilExpiry: days, severity: 1 };
  return { status: "current", daysUntilExpiry: days, severity: 0 };
};

const complianceFromDB = (row) => ({
  id: row.id,
  contactId: row.contact_id,
  truckUnit: row.truck_unit,
  docType: row.doc_type,
  customTypeLabel: row.custom_type_label,
  issuedDate: row.issued_date,
  expiryDate: row.expiry_date,
  filePath: row.file_path,
  fileName: row.file_name,
  fileSize: row.file_size,
  fileMime: row.file_mime,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const complianceToDB = (doc) => ({
  contact_id:         doc.contactId || null,
  truck_unit:         doc.truckUnit || null,
  doc_type:           doc.docType,
  custom_type_label:  doc.customTypeLabel || null,
  issued_date:        doc.issuedDate || null,
  expiry_date:        doc.expiryDate,
  file_path:          doc.filePath || null,
  file_name:          doc.fileName || null,
  file_size:          doc.fileSize || null,
  file_mime:          doc.fileMime || null,
  notes:              doc.notes || null,
});

export const fetchComplianceDocs = async () => {
  const { data, error } = await supabase
    .from("compliance_documents")
    .select("*")
    .is("deleted_at", null)
    .order("expiry_date", { ascending: true });
  if (error) { console.error("fetchComplianceDocs:", error); return []; }
  return (data || []).map(complianceFromDB);
};

export const insertComplianceDoc = async (doc) => {
  const { data, error } = await supabase
    .from("compliance_documents")
    .insert([complianceToDB(doc)])
    .select()
    .single();
  if (error) { console.error("insertComplianceDoc:", error); throw error; }
  return complianceFromDB(data);
};

export const updateComplianceDoc = async (id, doc) => {
  const { data, error } = await supabase
    .from("compliance_documents")
    .update(complianceToDB(doc))
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error("updateComplianceDoc:", error); throw error; }
  return complianceFromDB(data);
};

export const deleteComplianceDoc = async (id) => {
  // Soft delete
  const { error } = await supabase
    .from("compliance_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) { console.error("deleteComplianceDoc:", error); throw error; }
  return true;
};

// File upload — uploads to 'compliance-docs' bucket. Returns the storage path.
export const uploadComplianceFile = async (file, docId = null) => {
  if (!file) return null;
  // Generate a unique path — include timestamp so file names don't collide
  const ext = file.name.split(".").pop();
  const path = `${docId || "tmp"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from("compliance-docs")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) { console.error("uploadComplianceFile:", error); throw error; }
  return {
    filePath: data.path,
    fileName: file.name,
    fileSize: file.size,
    fileMime: file.type,
  };
};

// Get a signed URL to view/download the file (expires in 1 hour)
export const getComplianceFileUrl = async (filePath) => {
  if (!filePath) return null;
  const { data, error } = await supabase.storage
    .from("compliance-docs")
    .createSignedUrl(filePath, 3600);  // 1 hour
  if (error) { console.error("getComplianceFileUrl:", error); return null; }
  return data?.signedUrl || null;
};

// Delete the actual file from storage (called when a doc is updated with a new file
// or permanently deleted)
export const deleteComplianceFile = async (filePath) => {
  if (!filePath) return;
  const { error } = await supabase.storage
    .from("compliance-docs")
    .remove([filePath]);
  if (error) console.error("deleteComplianceFile:", error);
};

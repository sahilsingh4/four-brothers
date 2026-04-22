// Helper functions for talking to Supabase
// Each function maps to a table and converts between our app's
// camelCase field names and the database's snake_case columns.

import { supabase } from "./supabase";

// ========== DISPATCHES ==========
// Convert database row → app object
const dispatchFromDB = (row) => ({
  id: row.id,
  code: row.code,
  date: row.date,
  jobName: row.job_name,
  clientName: row.client_name || "",
  subContractor: row.sub_contractor || "",
  subContractorId: row.sub_contractor_id,
  pickup: row.pickup || "",
  dropoff: row.dropoff || "",
  material: row.material || "",
  trucksExpected: row.trucks_expected || 1,
  ratePerHour: row.rate_per_hour,
  ratePerTon: row.rate_per_ton,
  quarryId: row.quarry_id,
  notes: row.notes || "",
  status: row.status || "open",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Convert app object → database row
const dispatchToDB = (d) => ({
  code: d.code,
  date: d.date,
  job_name: d.jobName,
  client_name: d.clientName || null,
  sub_contractor: d.subContractor || null,
  sub_contractor_id: d.subContractorId || null,
  pickup: d.pickup || null,
  dropoff: d.dropoff || null,
  material: d.material || null,
  trucks_expected: Number(d.trucksExpected) || 1,
  rate_per_hour: d.ratePerHour ? Number(d.ratePerHour) : null,
  rate_per_ton: d.ratePerTon ? Number(d.ratePerTon) : null,
  quarry_id: d.quarryId || null,
  notes: d.notes || null,
  status: d.status || "open",
});

export const fetchDispatches = async () => {
  const { data, error } = await supabase.from("dispatches").select("*").order("created_at", { ascending: false });
  if (error) { console.error("fetchDispatches:", error); return []; }
  return (data || []).map(dispatchFromDB);
};

export const insertDispatch = async (d) => {
  const { data, error } = await supabase.from("dispatches").insert(dispatchToDB(d)).select().single();
  if (error) { console.error("insertDispatch:", error); throw error; }
  return dispatchFromDB(data);
};

export const updateDispatch = async (id, patch) => {
  const { data, error } = await supabase
    .from("dispatches")
    .update({ ...dispatchToDB(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error("updateDispatch:", error); throw error; }
  return dispatchFromDB(data);
};

export const deleteDispatch = async (id) => {
  const { error } = await supabase.from("dispatches").delete().eq("id", id);
  if (error) { console.error("deleteDispatch:", error); throw error; }
};

// ========== FREIGHT BILLS ==========
const fbFromDB = (row) => ({
  id: row.id,
  dispatchId: row.dispatch_id,
  freightBillNumber: row.freight_bill_number,
  driverName: row.driver_name,
  truckNumber: row.truck_number,
  material: row.material,
  tonnage: row.tonnage,
  loadCount: row.load_count,
  pickupTime: row.pickup_time,
  dropoffTime: row.dropoff_time,
  notes: row.notes,
  photos: row.photos || [],
  submittedAt: row.submitted_at,
});

const fbToDB = (fb) => ({
  dispatch_id: fb.dispatchId,
  freight_bill_number: fb.freightBillNumber || null,
  driver_name: fb.driverName || null,
  truck_number: fb.truckNumber || null,
  material: fb.material || null,
  tonnage: fb.tonnage ? Number(fb.tonnage) : null,
  load_count: Number(fb.loadCount) || 1,
  pickup_time: fb.pickupTime || null,
  dropoff_time: fb.dropoffTime || null,
  notes: fb.notes || null,
  photos: fb.photos || [],
});

export const fetchFreightBills = async () => {
  const { data, error } = await supabase.from("freight_bills").select("*").order("submitted_at", { ascending: false });
  if (error) { console.error("fetchFreightBills:", error); return []; }
  return (data || []).map(fbFromDB);
};

export const insertFreightBill = async (fb) => {
  const { data, error } = await supabase.from("freight_bills").insert(fbToDB(fb)).select().single();
  if (error) { console.error("insertFreightBill:", error); throw error; }
  return fbFromDB(data);
};

export const deleteFreightBill = async (id) => {
  const { error } = await supabase.from("freight_bills").delete().eq("id", id);
  if (error) { console.error("deleteFreightBill:", error); throw error; }
};

// ========== REAL-TIME SUBSCRIPTIONS ==========
// Fire a callback whenever dispatches or freight bills change (from anywhere)
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
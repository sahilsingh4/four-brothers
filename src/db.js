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
  quarryId: row.quarry_id,
  notes: row.notes || "",
  status: row.status || "open",
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

export const updateFreightBill = async (id, patch) => {
  const { data, error } = await supabase
    .from("freight_bills")
    .update(fbToDB(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error("updateFreightBill:", error); throw error; }
  return fbFromDB(data);
};

export const deleteFreightBill = async (id) => {
  const { error } = await supabase.from("freight_bills").delete().eq("id", id);
  if (error) { console.error("deleteFreightBill:", error); throw error; }
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

export const updateContact = async (id, patch) => {
  const { data, error } = await supabase
    .from("contacts")
    .update({ ...contactToDB(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error("updateContact:", error); throw error; }
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

export const updateQuarry = async (id, patch) => {
  const { data, error } = await supabase
    .from("quarries")
    .update({ ...quarryToDB(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error("updateQuarry:", error); throw error; }
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

export const updateInvoice = async (id, patch) => {
  const { data, error } = await supabase
    .from("invoices")
    .update(invoiceToDB(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error("updateInvoice:", error); throw error; }
  return invoiceFromDB(data);
};

export const fetchInvoices = async () => {
  const { data, error } = await supabase.from("invoices").select("*").order("invoice_date", { ascending: false });
  if (error) { console.error("fetchInvoices:", error); return []; }
  return (data || []).map(invoiceFromDB);
};

export const insertInvoice = async (i) => {
  const { data, error } = await supabase.from("invoices").insert(invoiceToDB(i)).select().single();
  if (error) { console.error("insertInvoice:", error); throw error; }
  return invoiceFromDB(data);
};

export const deleteInvoice = async (id) => {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) { console.error("deleteInvoice:", error); throw error; }
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
});

export const fetchProjects = async () => {
  const { data, error } = await supabase.from("projects").select("*").order("name", { ascending: true });
  if (error) { console.error("fetchProjects:", error); return []; }
  return (data || []).map(projectFromDB);
};

export const insertProject = async (p) => {
  const { data, error } = await supabase.from("projects").insert(projectToDB(p)).select().single();
  if (error) { console.error("insertProject:", error); throw error; }
  return projectFromDB(data);
};

export const updateProject = async (id, patch) => {
  const { data, error } = await supabase
    .from("projects")
    .update({ ...projectToDB(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error("updateProject:", error); throw error; }
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

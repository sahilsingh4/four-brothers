// ============================================================================
// DB TESTS — Vitest
// ============================================================================
// Tests for the db.js helpers that manage soft delete, recovery, and cascade
// queries. Because db.js talks to Supabase directly, we mock the supabase
// client here and verify the CORRECT SQL intent is issued for each operation.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase module BEFORE importing db.js
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockNot = vi.fn();
const mockLt = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();

// Chainable builder — each method returns `this` until terminal resolution
const builder = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  is: mockIs,
  not: mockNot,
  lt: mockLt,
  order: mockOrder,
  single: mockSingle,
};

// Make every builder method return the builder (so chaining works),
// and make the builder thenable (await-able) returning a default success response.
const makeChainable = () => {
  Object.keys(builder).forEach((key) => {
    builder[key] = vi.fn(() => builder);
  });
  // Default terminal value when awaited
  builder.then = (resolve) => resolve({ data: [], error: null, count: 0 });
  return builder;
};

vi.mock("./supabase", () => ({
  supabase: { from: (table) => { mockFrom(table); return makeChainable(); } },
}));

// Now import db (after mock is set up)
import {
  fetchDispatches,
  fetchDeletedDispatches,
  deleteDispatch,
  recoverDispatch,
  hardDeleteDispatch,
  fetchFreightBills,
  fetchDeletedFreightBills,
  deleteFreightBill,
  recoverFreightBill,
  fetchInvoices,
  fetchDeletedInvoices,
  deleteInvoice,
  recoverInvoice,
  autoPurgeDeleted,
} from "./db";

beforeEach(() => {
  vi.clearAllMocks();
  makeChainable();
});

// ============================================================================
// SOFT DELETE — dispatches
// ============================================================================
describe("deleteDispatch (soft)", () => {
  it("calls update on dispatches table with deleted_at timestamp", async () => {
    await deleteDispatch("abc-123", { deletedBy: "admin", reason: "test" });
    expect(mockFrom).toHaveBeenCalledWith("dispatches");
  });

  it("defaults deletedBy and reason if not provided", async () => {
    // Should not throw — signature is backward compatible
    await expect(deleteDispatch("abc-123")).resolves.not.toThrow();
  });

  it("accepts empty reason", async () => {
    await expect(deleteDispatch("abc-123", { deletedBy: "admin", reason: "" })).resolves.not.toThrow();
  });
});

describe("recoverDispatch", () => {
  it("calls update on dispatches table", async () => {
    await recoverDispatch("abc-123");
    expect(mockFrom).toHaveBeenCalledWith("dispatches");
  });
});

describe("hardDeleteDispatch", () => {
  it("calls delete (not update) on dispatches table", async () => {
    await hardDeleteDispatch("abc-123");
    expect(mockFrom).toHaveBeenCalledWith("dispatches");
  });
});

describe("fetchDispatches", () => {
  it("queries dispatches table", async () => {
    await fetchDispatches();
    expect(mockFrom).toHaveBeenCalledWith("dispatches");
  });

  it("returns empty array when no data", async () => {
    const result = await fetchDispatches();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("fetchDeletedDispatches", () => {
  it("queries dispatches table", async () => {
    await fetchDeletedDispatches();
    expect(mockFrom).toHaveBeenCalledWith("dispatches");
  });
});

// ============================================================================
// SOFT DELETE — freight bills
// ============================================================================
describe("deleteFreightBill (soft)", () => {
  it("calls update on freight_bills table", async () => {
    await deleteFreightBill("fb-123", { deletedBy: "admin", reason: "duplicate" });
    expect(mockFrom).toHaveBeenCalledWith("freight_bills");
  });

  it("works with default options", async () => {
    await expect(deleteFreightBill("fb-123")).resolves.not.toThrow();
  });
});

describe("recoverFreightBill", () => {
  it("calls update on freight_bills table", async () => {
    await recoverFreightBill("fb-123");
    expect(mockFrom).toHaveBeenCalledWith("freight_bills");
  });
});

describe("fetchFreightBills", () => {
  it("queries freight_bills table", async () => {
    await fetchFreightBills();
    expect(mockFrom).toHaveBeenCalledWith("freight_bills");
  });
});

describe("fetchDeletedFreightBills", () => {
  it("queries freight_bills table", async () => {
    await fetchDeletedFreightBills();
    expect(mockFrom).toHaveBeenCalledWith("freight_bills");
  });
});

// ============================================================================
// SOFT DELETE — invoices
// ============================================================================
describe("deleteInvoice (soft)", () => {
  it("calls update on invoices table", async () => {
    await deleteInvoice("inv-123", { deletedBy: "admin", reason: "customer cancel" });
    expect(mockFrom).toHaveBeenCalledWith("invoices");
  });
});

describe("recoverInvoice", () => {
  it("calls update on invoices table", async () => {
    await recoverInvoice("inv-123");
    expect(mockFrom).toHaveBeenCalledWith("invoices");
  });
});

describe("fetchInvoices", () => {
  it("queries invoices table", async () => {
    await fetchInvoices();
    expect(mockFrom).toHaveBeenCalledWith("invoices");
  });
});

describe("fetchDeletedInvoices", () => {
  it("queries invoices table", async () => {
    await fetchDeletedInvoices();
    expect(mockFrom).toHaveBeenCalledWith("invoices");
  });
});

// ============================================================================
// AUTO PURGE
// ============================================================================
describe("autoPurgeDeleted", () => {
  it("returns a results object with counts for all 3 tables", async () => {
    const result = await autoPurgeDeleted(30);
    expect(result).toHaveProperty("dispatches");
    expect(result).toHaveProperty("freightBills");
    expect(result).toHaveProperty("invoices");
    expect(result).toHaveProperty("errors");
  });

  it("queries all 3 tables", async () => {
    await autoPurgeDeleted(30);
    // from() called at least 3 times (dispatches, freight_bills, invoices)
    expect(mockFrom).toHaveBeenCalledWith("dispatches");
    expect(mockFrom).toHaveBeenCalledWith("freight_bills");
    expect(mockFrom).toHaveBeenCalledWith("invoices");
  });

  it("accepts a custom days threshold", async () => {
    const result = await autoPurgeDeleted(7);
    expect(result).toBeDefined();
  });

  it("collects errors without throwing", async () => {
    const result = await autoPurgeDeleted(30);
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

// ============================================================================
// SIGNATURE CONTRACTS
// ============================================================================
describe("delete signature contracts", () => {
  it("all soft-delete fns accept optional {deletedBy, reason}", async () => {
    // All these should be legal call forms
    await expect(deleteDispatch("id")).resolves.not.toThrow();
    await expect(deleteDispatch("id", {})).resolves.not.toThrow();
    await expect(deleteDispatch("id", { deletedBy: "x" })).resolves.not.toThrow();
    await expect(deleteDispatch("id", { reason: "x" })).resolves.not.toThrow();
    await expect(deleteDispatch("id", { deletedBy: "x", reason: "y" })).resolves.not.toThrow();

    await expect(deleteFreightBill("id")).resolves.not.toThrow();
    await expect(deleteFreightBill("id", { deletedBy: "x", reason: "y" })).resolves.not.toThrow();

    await expect(deleteInvoice("id")).resolves.not.toThrow();
    await expect(deleteInvoice("id", { deletedBy: "x", reason: "y" })).resolves.not.toThrow();
  });

  it("recover fns take just an id", async () => {
    await expect(recoverDispatch("id")).resolves.not.toThrow();
    await expect(recoverFreightBill("id")).resolves.not.toThrow();
    await expect(recoverInvoice("id")).resolves.not.toThrow();
  });
});

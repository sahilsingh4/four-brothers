// ============================================================================
// MATH TESTS — Vitest
// ============================================================================
// Run: npm test
// These tests cover the pure math functions extracted into math.js.
// When you change billing or pay logic, update both math.js AND these tests.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  hoursFromTimes,
  computeLineNet,
  recomputeLine,
  totalLines,
  invoiceSubtotalFromFbs,
  payStubTotalsFromFbs,
  seedHoursForFb,
  billableHoursForInvoice,
  contactBrokeragePct,
  fmt$,
  canDeleteDispatch,
  canDeleteFreightBill,
  canDeleteInvoice,
} from "./math";

// ============================================================================
// hoursFromTimes
// ============================================================================
describe("hoursFromTimes", () => {
  it("calculates whole hours", () => {
    expect(hoursFromTimes("07:00", "15:00")).toBe(8);
  });

  it("calculates half hours", () => {
    expect(hoursFromTimes("07:00", "15:30")).toBe(8.5);
  });

  it("handles quarter-hour minutes", () => {
    expect(hoursFromTimes("07:15", "15:45")).toBe(8.5);
  });

  it("returns 0 for missing pickup", () => {
    expect(hoursFromTimes("", "15:00")).toBe(0);
    expect(hoursFromTimes(null, "15:00")).toBe(0);
    expect(hoursFromTimes(undefined, "15:00")).toBe(0);
  });

  it("returns 0 for missing dropoff", () => {
    expect(hoursFromTimes("07:00", "")).toBe(0);
    expect(hoursFromTimes("07:00", null)).toBe(0);
  });

  it("returns 0 when dropoff <= pickup (no overnight)", () => {
    expect(hoursFromTimes("15:00", "07:00")).toBe(0);
    expect(hoursFromTimes("10:00", "10:00")).toBe(0);
  });

  it("returns 0 for malformed input", () => {
    expect(hoursFromTimes("abc", "15:00")).toBe(0);
    expect(hoursFromTimes("07:00", "xyz")).toBe(0);
  });

  it("rounds to 2 decimals", () => {
    // 7:00 to 7:20 = 20 mins = 0.3333... hours → rounds to 0.33
    expect(hoursFromTimes("07:00", "07:20")).toBe(0.33);
  });
});

// ============================================================================
// computeLineNet
// ============================================================================
describe("computeLineNet", () => {
  it("returns gross when not brokerable", () => {
    expect(computeLineNet({ gross: 100, brokerable: false })).toBe(100);
  });

  it("deducts brokerage % when brokerable", () => {
    // $1000 at 8% = $1000 - $80 = $920
    expect(computeLineNet({ gross: 1000, brokerable: true, brokeragePct: 8 })).toBe(920);
  });

  it("handles 0% brokerage", () => {
    expect(computeLineNet({ gross: 500, brokerable: true, brokeragePct: 0 })).toBe(500);
  });

  it("handles 100% brokerage (full deduct)", () => {
    expect(computeLineNet({ gross: 200, brokerable: true, brokeragePct: 100 })).toBe(0);
  });

  it("computes gross from qty × rate if gross missing", () => {
    expect(computeLineNet({ qty: 8, rate: 120, brokerable: false })).toBe(960);
  });

  it("rounds to 2 decimals", () => {
    // 7.33 × 100 = 733, at 8% = 733 - 58.64 = 674.36
    expect(computeLineNet({ gross: 733, brokerable: true, brokeragePct: 8 })).toBeCloseTo(674.36, 2);
  });
});

// ============================================================================
// recomputeLine
// ============================================================================
describe("recomputeLine", () => {
  it("computes gross + net from qty + rate, no brokerage", () => {
    const result = recomputeLine({ qty: 8, rate: 120, brokerable: false });
    expect(result.gross).toBe(960);
    expect(result.net).toBe(960);
  });

  it("computes gross + net with brokerage", () => {
    const result = recomputeLine({ qty: 10, rate: 100, brokerable: true, brokeragePct: 8 });
    expect(result.gross).toBe(1000);
    expect(result.net).toBe(920);
  });

  it("preserves other fields", () => {
    const result = recomputeLine({
      id: 42, code: "H", item: "HOURLY", qty: 8, rate: 120,
      brokerable: false, copyToPay: true, note: "test",
    });
    expect(result.id).toBe(42);
    expect(result.code).toBe("H");
    expect(result.item).toBe("HOURLY");
    expect(result.copyToPay).toBe(true);
    expect(result.note).toBe("test");
  });

  it("returns new object (doesn't mutate)", () => {
    const original = { qty: 5, rate: 20, brokerable: false, gross: 999, net: 999 };
    const result = recomputeLine(original);
    expect(original.gross).toBe(999); // unchanged
    expect(result.gross).toBe(100);
    expect(result).not.toBe(original);
  });
});

// ============================================================================
// totalLines
// ============================================================================
describe("totalLines", () => {
  it("returns zeros for empty array", () => {
    const t = totalLines([]);
    expect(t.count).toBe(0);
    expect(t.gross).toBe(0);
    expect(t.net).toBe(0);
    expect(t.brokerageAmt).toBe(0);
  });

  it("handles null/undefined input", () => {
    expect(totalLines(null).count).toBe(0);
    expect(totalLines(undefined).count).toBe(0);
  });

  it("sums a single non-brokerable line", () => {
    const t = totalLines([{ gross: 100, net: 100, brokerable: false }]);
    expect(t.count).toBe(1);
    expect(t.gross).toBe(100);
    expect(t.net).toBe(100);
    expect(t.brokerageAmt).toBe(0);
  });

  it("handles mix: brokerable + non-brokerable", () => {
    const lines = [
      { gross: 1000, net: 920, brokerable: true, brokeragePct: 8 },
      { gross: 18, net: 18, brokerable: false },
      { gross: 45, net: 45, brokerable: false },
    ];
    const t = totalLines(lines);
    expect(t.count).toBe(3);
    expect(t.gross).toBe(1063);
    expect(t.net).toBe(983);
    expect(t.brokerableGross).toBe(1000);
    expect(t.brokerageAmt).toBe(80);
  });
});

// ============================================================================
// invoiceSubtotalFromFbs
// ============================================================================
describe("invoiceSubtotalFromFbs", () => {
  it("sums each FB's billingLines net", () => {
    const fbs = [
      { id: 1, billingLines: [{ net: 960 }, { net: 18 }] },
      { id: 2, billingLines: [{ net: 1080 }] },
    ];
    const r = invoiceSubtotalFromFbs(fbs);
    expect(r.subtotal).toBe(2058);
    expect(r.hasLegacyFbs).toBe(false);
  });

  it("falls back to legacyCalcFn for FBs without billingLines", () => {
    const fbs = [
      { id: 1, billingLines: [{ net: 500 }] },
      { id: 2 /* no lines */ },
    ];
    const legacyFn = (fb) => fb.id === 2 ? 300 : 0;
    const r = invoiceSubtotalFromFbs(fbs, legacyFn);
    expect(r.subtotal).toBe(800);
    expect(r.hasLegacyFbs).toBe(true);
    expect(r.legacyFbIds).toEqual([2]);
  });

  it("handles empty array", () => {
    const r = invoiceSubtotalFromFbs([]);
    expect(r.subtotal).toBe(0);
    expect(r.hasLegacyFbs).toBe(false);
  });
});

// ============================================================================
// payStubTotalsFromFbs
// ============================================================================
describe("payStubTotalsFromFbs", () => {
  it("returns zeros for empty FBs", () => {
    const r = payStubTotalsFromFbs([]);
    expect(r.netPay).toBe(0);
    expect(r.allHaveLines).toBe(false);
  });

  it("sums net when all FBs have payingLines", () => {
    const fbs = [
      { payingLines: [
        { gross: 800, net: 736, brokerable: true, brokeragePct: 8 },
        { gross: 18, net: 18, brokerable: false }, // toll reimbursed
      ]},
      { payingLines: [
        { gross: 1200, net: 1104, brokerable: true, brokeragePct: 8 },
      ]},
    ];
    const r = payStubTotalsFromFbs(fbs);
    expect(r.allHaveLines).toBe(true);
    expect(r.gross).toBe(2018);
    expect(r.netPay).toBe(1858);
    expect(r.brokerageAmt).toBe(160); // 8% of 2000 brokerable
  });

  it("flags allHaveLines=false when any FB missing lines", () => {
    const fbs = [
      { payingLines: [{ gross: 100, net: 100, brokerable: false }] },
      { /* no lines */ },
    ];
    const r = payStubTotalsFromFbs(fbs);
    expect(r.allHaveLines).toBe(false);
  });
});

// ============================================================================
// seedHoursForFb
// ============================================================================
describe("seedHoursForFb", () => {
  it("prefers hoursBilled when > 0", () => {
    expect(seedHoursForFb({ hoursBilled: 7.5, pickupTime: "07:00", dropoffTime: "15:30" })).toBe(7.5);
  });

  it("falls back to computed hours when hoursBilled is 0", () => {
    expect(seedHoursForFb({ hoursBilled: 0, pickupTime: "07:00", dropoffTime: "15:30" })).toBe(8.5);
  });

  it("falls back to computed hours when hoursBilled is null", () => {
    expect(seedHoursForFb({ hoursBilled: null, pickupTime: "08:00", dropoffTime: "16:00" })).toBe(8);
  });

  it("returns 0 when both are missing", () => {
    expect(seedHoursForFb({})).toBe(0);
    expect(seedHoursForFb({ hoursBilled: 0 })).toBe(0);
  });

  it("handles null/undefined FB", () => {
    expect(seedHoursForFb(null)).toBe(0);
    expect(seedHoursForFb(undefined)).toBe(0);
  });
});

// ============================================================================
// billableHoursForInvoice
// ============================================================================
describe("billableHoursForInvoice", () => {
  it("uses billingLines HOURLY qty when present", () => {
    const fb = {
      billingLines: [
        { code: "H", qty: 8.5 },
        { code: "TOLL", qty: 1 },
      ],
    };
    expect(billableHoursForInvoice(fb)).toBe(8.5);
  });

  it("returns 0 when billingLines exist but no HOURLY line", () => {
    const fb = {
      billingLines: [
        { code: "T", qty: 50 },
        { code: "TOLL", qty: 1 },
      ],
    };
    expect(billableHoursForInvoice(fb)).toBe(0);
  });

  it("falls back to legacy fn for FBs without lines", () => {
    const fb = { hoursBilled: 7 };
    expect(billableHoursForInvoice(fb, (fb) => fb.hoursBilled)).toBe(7);
  });

  it("handles null FB", () => {
    expect(billableHoursForInvoice(null)).toBe(0);
  });
});

// ============================================================================
// contactBrokeragePct
// ============================================================================
describe("contactBrokeragePct", () => {
  it("returns 0 for non-brokerable contact", () => {
    expect(contactBrokeragePct({ brokerageApplies: false })).toBe(0);
  });

  it("returns 0 for null/undefined", () => {
    expect(contactBrokeragePct(null)).toBe(0);
    expect(contactBrokeragePct(undefined)).toBe(0);
  });

  it("returns stored pct for brokerable contact", () => {
    expect(contactBrokeragePct({ brokerageApplies: true, brokeragePercent: 10 })).toBe(10);
  });

  it("defaults to 8 when flag is on but pct is 0/missing", () => {
    expect(contactBrokeragePct({ brokerageApplies: true, brokeragePercent: 0 })).toBe(8);
    expect(contactBrokeragePct({ brokerageApplies: true })).toBe(8);
  });
});

// ============================================================================
// fmt$
// ============================================================================
describe("fmt$", () => {
  it("formats whole numbers", () => {
    expect(fmt$(100)).toBe("$100.00");
  });

  it("formats decimals", () => {
    expect(fmt$(920.5)).toBe("$920.50");
  });

  it("handles 0", () => {
    expect(fmt$(0)).toBe("$0.00");
  });

  it("handles null/undefined as 0", () => {
    expect(fmt$(null)).toBe("$0.00");
    expect(fmt$(undefined)).toBe("$0.00");
  });

  it("handles string numbers", () => {
    expect(fmt$("42.5")).toBe("$42.50");
  });
});

// ============================================================================
// INTEGRATION — real-world FB scenarios
// ============================================================================
describe("integration: typical FB scenarios", () => {
  it("driver worked 8.5 hours, $120/hr, no brokerage → billing total $1020", () => {
    const fb = {
      hoursBilled: 0,
      pickupTime: "07:00",
      dropoffTime: "15:30",
      billingLines: [{
        code: "H", item: "HOURLY",
        qty: 8.5, rate: 120,
        gross: 1020, net: 1020,
        brokerable: false,
      }],
    };
    const r = invoiceSubtotalFromFbs([fb]);
    expect(r.subtotal).toBe(1020);
    expect(billableHoursForInvoice(fb)).toBe(8.5);
  });

  it("sub with 8% brokerage, $30/hr × 8hrs, $18 toll reimbursement → pay $220.80 + $18 = $238.80", () => {
    const fb = {
      payingLines: [
        { code: "H", qty: 8, rate: 30, gross: 240, net: 220.8, brokerable: true, brokeragePct: 8 },
        { code: "TOLL", qty: 1, rate: 18, gross: 18, net: 18, brokerable: false },
      ],
    };
    const r = payStubTotalsFromFbs([fb]);
    expect(r.netPay).toBe(238.8);
    expect(r.gross).toBe(258);
    expect(r.brokerageAmt).toBeCloseTo(19.2, 2);
  });

  it("hours from pickup/dropoff seed correctly even when hoursBilled is empty", () => {
    const fb = { pickupTime: "08:15", dropoffTime: "16:45" };
    expect(seedHoursForFb(fb)).toBe(8.5);
  });

  it("broker customer at 10%: bill $1000, admin takes 10% cut → net to us $900", () => {
    const line = recomputeLine({ qty: 10, rate: 100, brokerable: true, brokeragePct: 10 });
    expect(line.gross).toBe(1000);
    expect(line.net).toBe(900);
  });
});

// ============================================================================
// canDeleteDispatch
// ============================================================================
describe("canDeleteDispatch", () => {
  it("allows delete of order with no FBs", () => {
    const r = canDeleteDispatch({ id: 1, code: "D001" }, []);
    expect(r.allowed).toBe(true);
    expect(r.blockers).toEqual([]);
  });

  it("allows delete when all FBs are rejected", () => {
    const r = canDeleteDispatch(
      { id: 1 },
      [{ status: "rejected" }, { status: "rejected" }]
    );
    expect(r.allowed).toBe(true);
  });

  it("blocks if order has pending FBs", () => {
    const r = canDeleteDispatch(
      { id: 1 },
      [{ status: "pending" }]
    );
    expect(r.allowed).toBe(false);
    expect(r.blockers.find((b) => b.type === "pending")).toBeTruthy();
  });

  it("blocks if order has invoiced FBs", () => {
    const r = canDeleteDispatch(
      { id: 1 },
      [{ status: "approved", invoiceId: "inv-1" }]
    );
    expect(r.allowed).toBe(false);
    expect(r.blockers.find((b) => b.type === "invoiced")).toBeTruthy();
  });

  it("blocks if order has paid FBs", () => {
    const r = canDeleteDispatch(
      { id: 1 },
      [{ status: "approved", paidAt: "2026-04-20T00:00:00Z" }]
    );
    expect(r.allowed).toBe(false);
    expect(r.blockers.find((b) => b.type === "paid")).toBeTruthy();
  });

  it("reports multiple blockers with counts", () => {
    const r = canDeleteDispatch(
      { id: 1 },
      [
        { status: "approved", invoiceId: "inv-1" },
        { status: "approved", paidAt: "2026-04-20T00:00:00Z" },
        { status: "approved", customerPaidAt: "2026-04-21T00:00:00Z" },
      ]
    );
    expect(r.allowed).toBe(false);
    expect(r.blockers.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================================
// canDeleteFreightBill
// ============================================================================
describe("canDeleteFreightBill", () => {
  it("allows delete of clean FB", () => {
    const r = canDeleteFreightBill({ id: 1, status: "pending" });
    expect(r.allowed).toBe(true);
  });

  it("blocks if on invoice", () => {
    const r = canDeleteFreightBill(
      { id: 1, invoiceId: "inv-1" },
      { invoiceNumber: "INV-100" }
    );
    expect(r.allowed).toBe(false);
    expect(r.blockers[0].type).toBe("invoiced");
    expect(r.blockers[0].invoiceNumber).toBe("INV-100");
  });

  it("blocks if paid to sub/driver", () => {
    const r = canDeleteFreightBill(
      { id: 1, paidAt: "2026-04-20T00:00:00Z", paidAmount: 500 }
    );
    expect(r.allowed).toBe(false);
    expect(r.blockers[0].type).toBe("paid");
    expect(r.blockers[0].amount).toBe(500);
  });

  it("blocks if customer paid", () => {
    const r = canDeleteFreightBill(
      { id: 1, customerPaidAt: "2026-04-21T00:00:00Z" }
    );
    expect(r.allowed).toBe(false);
    expect(r.blockers[0].type).toBe("customerPaid");
  });
});

// ============================================================================
// canDeleteInvoice
// ============================================================================
describe("canDeleteInvoice", () => {
  it("allows delete of fresh unpaid invoice", () => {
    const r = canDeleteInvoice({ id: 1, amountPaid: 0 }, []);
    expect(r.allowed).toBe(true);
  });

  it("blocks if payment recorded", () => {
    const r = canDeleteInvoice({ id: 1, amountPaid: 500 }, []);
    expect(r.allowed).toBe(false);
    expect(r.blockers[0].type).toBe("paymentRecorded");
  });

  it("blocks if any attached FB is customer-paid", () => {
    const r = canDeleteInvoice(
      { id: 1, amountPaid: 0 },
      [{ customerPaidAt: "2026-04-20T00:00:00Z" }]
    );
    expect(r.allowed).toBe(false);
    expect(r.blockers[0].type).toBe("customerPaid");
  });

  it("allows even with attached FBs if nothing's customer-paid", () => {
    const r = canDeleteInvoice(
      { id: 1, amountPaid: 0 },
      [{ status: "approved" }, { status: "approved" }]
    );
    expect(r.allowed).toBe(true);
  });
});

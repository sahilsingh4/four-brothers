// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DispatchTrackingCard } from "./DispatchTrackingCard";
import { computeDispatchSummary } from "../utils";

describe("computeDispatchSummary", () => {
  it("returns OPEN status when no bills are submitted yet", () => {
    const r = computeDispatchSummary({ trucksExpected: 5, status: "open" }, []);
    expect(r.statusLabel).toMatch(/OPEN/);
    expect(r.totalTons).toBe(0);
    expect(r.totalLoads).toBe(0);
    expect(r.pct).toBe(0);
  });

  it("returns IN PROGRESS while bills are arriving", () => {
    const bills = [
      { tonnage: "10", loadCount: "1" },
      { tonnage: "12", loadCount: "1" },
    ];
    const r = computeDispatchSummary({ trucksExpected: 5, status: "open" }, bills);
    expect(r.statusLabel).toBe("IN PROGRESS");
    expect(r.totalTons).toBe(22);
    expect(r.totalLoads).toBe(2);
    expect(r.pct).toBe(40);
  });

  it("returns COMPLETE when bills meet or exceed expected trucks", () => {
    const bills = Array.from({ length: 5 }, () => ({ tonnage: 10, loadCount: 1 }));
    const r = computeDispatchSummary({ trucksExpected: 5, status: "open" }, bills);
    expect(r.statusLabel).toBe("COMPLETE");
    expect(r.pct).toBe(100);
  });

  it("caps pct at 100 when overdelivered", () => {
    const bills = Array.from({ length: 8 }, () => ({ tonnage: 10, loadCount: 1 }));
    const r = computeDispatchSummary({ trucksExpected: 5, status: "open" }, bills);
    expect(r.pct).toBe(100);
  });

  it("treats explicitly closed dispatches as COMPLETE regardless of bill count", () => {
    const r = computeDispatchSummary({ trucksExpected: 5, status: "closed" }, []);
    expect(r.statusLabel).toBe("COMPLETE");
  });

  it("coerces non-numeric tonnage / loadCount to zero", () => {
    const bills = [{ tonnage: "abc", loadCount: undefined }, { tonnage: "10.5", loadCount: 2 }];
    const r = computeDispatchSummary({ trucksExpected: 2 }, bills);
    expect(r.totalTons).toBe(10.5);
    expect(r.totalLoads).toBe(2);
  });

  it("guards against trucksExpected = 0 (no division-by-zero in pct)", () => {
    const r = computeDispatchSummary({ trucksExpected: 0, status: "open" }, []);
    expect(r.pct).toBe(0);
    expect(Number.isFinite(r.pct)).toBe(true);
  });
});

describe("<DispatchTrackingCard />", () => {
  afterEach(cleanup);

  const dispatch = {
    id: "d-1",
    code: "ABC123",
    jobName: "Bay Point Job",
    date: "2025-06-15",
    material: "Asphalt",
    pickup: "Quarry A",
    dropoff: "Site B",
    trucksExpected: 4,
    status: "open",
  };

  it("renders job name and material/pickup/dropoff details", () => {
    render(<DispatchTrackingCard dispatch={dispatch} bills={[]} expanded={true} />);
    expect(screen.getByText(/Bay Point Job/)).toBeInTheDocument();
    expect(screen.getByText(/Asphalt/)).toBeInTheDocument();
    expect(screen.getByText(/Quarry A/)).toBeInTheDocument();
    expect(screen.getByText(/Site B/)).toBeInTheDocument();
  });

  it("does NOT render the FB list when no bills are present", () => {
    render(<DispatchTrackingCard dispatch={dispatch} bills={[]} expanded={true} />);
    expect(screen.queryByText(/FREIGHT BILLS SUBMITTED/)).not.toBeInTheDocument();
  });

  it("renders bills when expanded and bills exist", () => {
    const bills = [
      { id: "fb-1", freightBillNumber: "100", driverName: "Alice", truckNumber: "T01", tonnage: 10, photos: [] },
      { id: "fb-2", freightBillNumber: "101", driverName: "Bob", truckNumber: "T02", tonnage: 12, photos: [] },
    ];
    render(<DispatchTrackingCard dispatch={dispatch} bills={bills} expanded={true} />);
    expect(screen.getByText(/FB #100/)).toBeInTheDocument();
    expect(screen.getByText(/FB #101/)).toBeInTheDocument();
    // Totals block
    expect(screen.getByText("22.0")).toBeInTheDocument();
  });

  it("hides the FB list when expanded=false even if bills exist", () => {
    const bills = [{ id: "fb-1", freightBillNumber: "100", driverName: "A", truckNumber: "T", photos: [] }];
    render(<DispatchTrackingCard dispatch={dispatch} bills={bills} expanded={false} />);
    expect(screen.queryByText(/FB #100/)).not.toBeInTheDocument();
  });
});

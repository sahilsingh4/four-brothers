// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DispatchTrackingPage } from "./DispatchTrackingPage";

describe("<DispatchTrackingPage />", () => {
  afterEach(cleanup);

  it("renders 'TRACKING LINK NOT FOUND' when dispatch is null", () => {
    render(<DispatchTrackingPage dispatch={null} freightBills={[]} company={{}} onBack={() => {}} />);
    expect(screen.getByText(/TRACKING LINK NOT FOUND/)).toBeInTheDocument();
  });

  it("BACK button calls onBack on the not-found screen", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<DispatchTrackingPage dispatch={null} freightBills={[]} company={{}} onBack={onBack} />);
    await user.click(screen.getByRole("button", { name: /BACK/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders the dispatch code, JOB TRACKING heading, and tracking card when dispatch exists", () => {
    const dispatch = {
      id: "d-1", code: "ABC123", jobName: "Bay Point Job",
      date: "2025-06-15", trucksExpected: 4, status: "open",
    };
    render(
      <DispatchTrackingPage
        dispatch={dispatch}
        freightBills={[]}
        company={{ name: "Acme Trucking" }}
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/ABC123/)).toBeInTheDocument();
    expect(screen.getByText(/JOB TRACKING/)).toBeInTheDocument();
    expect(screen.getByText("Bay Point Job")).toBeInTheDocument();
    // Header uses the company name
    expect(screen.getByText("Acme Trucking")).toBeInTheDocument();
  });

  it("filters freight bills to only those for this dispatch", () => {
    const dispatch = {
      id: "d-1", code: "ABC", jobName: "Job", trucksExpected: 4, status: "open",
    };
    const freightBills = [
      { id: "fb-1", dispatchId: "d-1", freightBillNumber: "100", driverName: "A", truckNumber: "T1", photos: [], submittedAt: "2025-06-15T10:00Z" },
      { id: "fb-2", dispatchId: "d-OTHER", freightBillNumber: "999", driverName: "B", truckNumber: "T2", photos: [] },
    ];
    render(<DispatchTrackingPage dispatch={dispatch} freightBills={freightBills} company={{}} onBack={() => {}} />);
    expect(screen.getByText(/FB #100/)).toBeInTheDocument();
    expect(screen.queryByText(/FB #999/)).not.toBeInTheDocument();
  });
});

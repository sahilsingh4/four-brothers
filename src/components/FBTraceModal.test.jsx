// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FBTraceModal } from "./FBTraceModal";

const baseFb = {
  id: "fb-1", freightBillNumber: "100", driverName: "Alice", truckNumber: "T1",
  submittedAt: "2025-06-15T10:00:00Z",
};
const baseEntry = {
  fb: baseFb,
  qty: 5, method: "ton", rate: 75, gross: 375,
  customerBilled: 500, customerPaid: 0, customerRatio: 0,
  custStatus: "unpaid",
  adjustedGross: 375,
  dispatch: { code: "D001", jobName: "Salinas Phase 2", assignments: [] },
};

describe("<FBTraceModal />", () => {
  afterEach(cleanup);

  it("renders FB number, driver, and submitted date in the header", () => {
    render(<FBTraceModal entry={baseEntry} invoices={[]} contacts={[]} onClose={() => {}} />);
    expect(screen.getByText(/FB#100/)).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it("shows the 'NOT ON ANY INVOICE YET' panel when fb has no invoiceId", () => {
    render(<FBTraceModal entry={baseEntry} invoices={[]} contacts={[]} onClose={() => {}} />);
    expect(screen.getByText(/NOT ON ANY INVOICE YET/)).toBeInTheDocument();
  });

  it("shows invoice details when fb is on an invoice", () => {
    const fb = { ...baseFb, invoiceId: "inv-1" };
    const invoice = {
      id: "inv-1", invoiceNumber: "INV-100", invoiceDate: "2025-06-20",
      billToId: "c-1", billToName: "Acme",
      pricingMethod: "ton", rate: 100, total: 500, amountPaid: 0,
    };
    render(<FBTraceModal entry={{ ...baseEntry, fb }} invoices={[invoice]} contacts={[{ id: "c-1", companyName: "Acme Trucking" }]} onClose={() => {}} />);
    // INV-100 appears in both the invoice panel and the "customer not paid" panel.
    expect(screen.getAllByText(/INV-100/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Acme Trucking/)).toBeInTheDocument();
    expect(screen.queryByText(/NOT ON ANY INVOICE YET/)).not.toBeInTheDocument();
  });

  it("shows the green PAID IN FULL panel when custStatus=paid", () => {
    const fb = { ...baseFb, invoiceId: "inv-1", customerPaidAt: "2025-06-25" };
    const invoice = { id: "inv-1", invoiceNumber: "INV-1", paymentHistory: [] };
    const entry = { ...baseEntry, fb, custStatus: "paid", customerPaid: 500, customerRatio: 1.0 };
    render(<FBTraceModal entry={entry} invoices={[invoice]} contacts={[]} onClose={() => {}} />);
    expect(screen.getByText(/PAID IN FULL/)).toBeInTheDocument();
  });

  it("shows the SHORT-PAID panel with percent when custStatus=short", () => {
    const fb = { ...baseFb, invoiceId: "inv-1", customerPaidAt: "2025-06-25" };
    const invoice = { id: "inv-1", invoiceNumber: "INV-1", paymentHistory: [] };
    const entry = { ...baseEntry, fb, custStatus: "short", customerPaid: 350, customerBilled: 500, customerRatio: 0.7 };
    render(<FBTraceModal entry={entry} invoices={[invoice]} contacts={[]} onClose={() => {}} />);
    expect(screen.getByText(/SHORT-PAID 70%/)).toBeInTheDocument();
  });

  it("shows the green sub-payment panel when fb.paidAt is set", () => {
    const fb = { ...baseFb, paidAt: "2025-06-30", paidAmount: 375, paidMethod: "check", paidCheckNumber: "1234" };
    render(<FBTraceModal entry={{ ...baseEntry, fb }} invoices={[]} contacts={[]} onClose={() => {}} />);
    expect(screen.getByText(/SUB \/ DRIVER PAYMENT/)).toBeInTheDocument();
    expect(screen.getByText(/#1234/)).toBeInTheDocument();
  });

  it("shows 'SUB NOT PAID YET' when fb.paidAt is missing", () => {
    render(<FBTraceModal entry={baseEntry} invoices={[]} contacts={[]} onClose={() => {}} />);
    expect(screen.getByText(/SUB NOT PAID YET/)).toBeInTheDocument();
  });

  it("CLOSE button calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<FBTraceModal entry={baseEntry} invoices={[]} contacts={[]} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /CLOSE/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

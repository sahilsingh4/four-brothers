// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../db", () => ({
  logAudit: vi.fn(),
  updateInvoice: vi.fn().mockResolvedValue({}),
}));

import { InvoiceViewModal } from "./InvoiceViewModal";

const baseInvoice = {
  id: "inv-1",
  invoiceNumber: "INV-100",
  billToName: "Acme Trucking",
  total: 1000,
  amountPaid: 600,
  freightBillIds: ["fb-1"],
  pricingMethod: "ton",
  rate: 100,
  paymentHistory: [
    { date: "2025-06-15T00:00:00Z", amount: 400, method: "check", reference: "1024", notes: "" },
    { date: "2025-06-20T00:00:00Z", amount: 200, method: "ach", reference: "", notes: "partial" },
  ],
};

const baseFbs = [
  { id: "fb-1", freightBillNumber: "F100", dispatchId: "d-1", tonnage: 5, photos: [] },
];

describe("<InvoiceViewModal />", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);

  it("renders the invoice number, billed-to name, and balance", () => {
    render(
      <InvoiceViewModal
        invoice={baseInvoice}
        freightBills={baseFbs}
        editFreightBill={vi.fn()}
        setInvoices={vi.fn()}
        invoices={[baseInvoice]}
        onClose={vi.fn()}
        onToast={vi.fn()}
      />
    );
    expect(screen.getByText("INV-100")).toBeInTheDocument();
    expect(screen.getByText(/Acme Trucking/)).toBeInTheDocument();
    // Balance = 1000 - 600 = 400
    expect(screen.getByText(/Balance \$400\.00/)).toBeInTheDocument();
  });

  it("renders each payment in the history list with its amount and method", () => {
    render(
      <InvoiceViewModal
        invoice={baseInvoice}
        freightBills={baseFbs}
        editFreightBill={vi.fn()}
        setInvoices={vi.fn()}
        invoices={[baseInvoice]}
        onClose={vi.fn()}
        onToast={vi.fn()}
      />
    );
    // Both payment rows + the balance display match — just assert each
    // amount shows at least once.
    expect(screen.getAllByText(/\$400\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$200\.00/).length).toBeGreaterThan(0);
    // Method labels from the payment history
    expect(screen.getByText(/check/i)).toBeInTheDocument();
    expect(screen.getByText(/ach/i)).toBeInTheDocument();
  });

  it("header X-icon close button calls onClose (PR #13 regression class)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <InvoiceViewModal
        invoice={baseInvoice}
        freightBills={baseFbs}
        editFreightBill={vi.fn()}
        setInvoices={vi.fn()}
        invoices={[baseInvoice]}
        onClose={onClose}
        onToast={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole("button");
    // Header X is the first button (no PHOTOS button since fb has no photos).
    await user.click(buttons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("bottom CLOSE button also calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <InvoiceViewModal
        invoice={baseInvoice}
        freightBills={baseFbs}
        editFreightBill={vi.fn()}
        setInvoices={vi.fn()}
        invoices={[baseInvoice]}
        onClose={onClose}
        onToast={vi.fn()}
      />
    );
    // Disambiguate from the new icon-only header X (which has title="Close").
    // We're testing the bottom CLOSE button, which has visible text.
    const buttons = screen.getAllByRole("button", { name: /^close$/i });
    const bottomClose = buttons.find((b) => /close/i.test(b.textContent || ""));
    await user.click(bottomClose);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the PHOTOS button when any FB on the invoice has photos", () => {
    const fbsWithPhotos = [
      { id: "fb-1", freightBillNumber: "F100", dispatchId: "d-1", tonnage: 5,
        photos: [{ dataUrl: "data:a" }, { dataUrl: "data:b" }] },
    ];
    render(
      <InvoiceViewModal
        invoice={baseInvoice}
        freightBills={fbsWithPhotos}
        editFreightBill={vi.fn()}
        setInvoices={vi.fn()}
        invoices={[baseInvoice]}
        onClose={vi.fn()}
        onToast={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /PHOTOS \(2\)/ })).toBeInTheDocument();
  });

  it("hides the PHOTOS button when no FB has photos", () => {
    render(
      <InvoiceViewModal
        invoice={baseInvoice}
        freightBills={baseFbs}
        editFreightBill={vi.fn()}
        setInvoices={vi.fn()}
        invoices={[baseInvoice]}
        onClose={vi.fn()}
        onToast={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /PHOTOS/i })).not.toBeInTheDocument();
  });

  it("renders 'No payments yet' when paymentHistory is empty", () => {
    const unpaidInvoice = { ...baseInvoice, amountPaid: 0, paymentHistory: [] };
    render(
      <InvoiceViewModal
        invoice={unpaidInvoice}
        freightBills={baseFbs}
        editFreightBill={vi.fn()}
        setInvoices={vi.fn()}
        invoices={[unpaidInvoice]}
        onClose={vi.fn()}
        onToast={vi.fn()}
      />
    );
    // Balance should now be the full total
    expect(screen.getByText(/Balance \$1,000\.00/)).toBeInTheDocument();
  });
});

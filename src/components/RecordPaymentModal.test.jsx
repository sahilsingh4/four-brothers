// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the db module's updateInvoice + logAudit so saving doesn't try to
// hit Supabase.
vi.mock("../db", () => ({
  updateInvoice: vi.fn().mockResolvedValue({}),
  logAudit: vi.fn(),
}));

import { RecordPaymentModal } from "./RecordPaymentModal";

const baseInvoice = {
  id: "inv-1",
  invoiceNumber: "INV-100",
  billToName: "Acme Trucking",
  total: 1000,
  amountPaid: 0,
  freightBillIds: ["fb-1", "fb-2"],
  pricingMethod: "ton",
  rate: 100,
  paymentHistory: [],
};

const baseFbs = [
  { id: "fb-1", freightBillNumber: "F100", tonnage: 5 },
  { id: "fb-2", freightBillNumber: "F101", tonnage: 5 },
];

describe("<RecordPaymentModal />", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);

  it("renders the invoice header with number, billed-to name, and balance", () => {
    render(<RecordPaymentModal invoice={baseInvoice} freightBills={baseFbs} editFreightBill={vi.fn()} onClose={() => {}} onToast={() => {}} />);
    expect(screen.getByText("INV-100")).toBeInTheDocument();
    expect(screen.getByText(/Acme Trucking/)).toBeInTheDocument();
    expect(screen.getByText(/Balance \$1,000\.00/)).toBeInTheDocument();
  });

  it("close button (the X icon header button) calls onClose", async () => {
    // This is the regression test for the bug class fixed in PR #13:
    // <X /> imported correctly so the close button doesn't ReferenceError.
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<RecordPaymentModal invoice={baseInvoice} freightBills={baseFbs} editFreightBill={vi.fn()} onClose={onClose} onToast={() => {}} />);
    // Find by the X icon's parent button: it's the button with no accessible
    // name (only an X svg child). Filter to the topmost transparent one.
    const buttons = screen.getAllByRole("button");
    // The header X is the first button; CANCEL is the last with text.
    await user.click(buttons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("CANCEL button at the bottom also calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<RecordPaymentModal invoice={baseInvoice} freightBills={baseFbs} editFreightBill={vi.fn()} onClose={onClose} onToast={() => {}} />);
    await user.click(screen.getByRole("button", { name: /^CANCEL$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("defaults to FULL payment mode and pre-fills amount with the balance", () => {
    render(<RecordPaymentModal invoice={baseInvoice} freightBills={baseFbs} editFreightBill={vi.fn()} onClose={() => {}} onToast={() => {}} />);
    // Amount input has the balance pre-filled
    const amountInput = screen.getByDisplayValue("1000.00");
    expect(amountInput).toBeInTheDocument();
  });

  it("toasts and refuses to save when amount is zero or negative", async () => {
    const user = userEvent.setup();
    const onToast = vi.fn();
    render(<RecordPaymentModal invoice={baseInvoice} freightBills={baseFbs} editFreightBill={vi.fn()} onClose={() => {}} onToast={onToast} />);
    const amountInput = screen.getByDisplayValue("1000.00");
    await user.clear(amountInput);
    await user.type(amountInput, "0");
    await user.click(screen.getByRole("button", { name: /RECORD PAYMENT/i }));
    expect(onToast).toHaveBeenCalledWith(expect.stringMatching(/AMOUNT|positive/i));
  });

  it("payment-method select shows all 6 options (check, ach, cash, zelle, venmo, other)", () => {
    render(<RecordPaymentModal invoice={baseInvoice} freightBills={baseFbs} editFreightBill={vi.fn()} onClose={() => {}} onToast={() => {}} />);
    const select = screen.getByRole("combobox");
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.value);
    expect(options).toEqual(expect.arrayContaining(["check", "ach", "cash", "zelle", "venmo", "other"]));
  });

  it("calls editFreightBill once per FB when saving in FULL mode", async () => {
    const user = userEvent.setup();
    const editFreightBill = vi.fn().mockResolvedValue({});
    render(<RecordPaymentModal
      invoice={baseInvoice}
      freightBills={baseFbs}
      editFreightBill={editFreightBill}
      onClose={() => {}}
      onToast={() => {}}
    />);
    await user.click(screen.getByRole("button", { name: /RECORD PAYMENT/i }));
    // Wait for async save to settle
    await new Promise((r) => setTimeout(r, 50));
    // Both FBs on the invoice should be stamped customerPaidAt
    expect(editFreightBill).toHaveBeenCalledTimes(2);
    expect(editFreightBill.mock.calls[0][1]).toHaveProperty("customerPaidAt");
  });
});

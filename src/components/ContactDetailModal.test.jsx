// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactDetailModal } from "./ContactDetailModal";

const baseContact = {
  id: "c-1",
  type: "sub",
  companyName: "Acme Trucking",
  contactName: "Alice Driver",
  phone: "(555) 123-4567",
  email: "alice@acme.example",
  brokerageApplies: true,
  brokeragePercent: 10,
};

const baseDispatches = [
  { id: "d-1", subContractorId: "c-1", code: "ABC123", jobName: "Bay Point Job", date: "2025-06-15" },
  { id: "d-2", subContractorId: "other", code: "ZZZ", jobName: "Other Job", date: "2025-06-16" },
];

const baseFbs = [
  { id: "fb-1", dispatchId: "d-1", freightBillNumber: "100", driverName: "Alice", tonnage: 10 },
];

describe("<ContactDetailModal />", () => {
  afterEach(cleanup);

  it("renders the contact's company and contact names", () => {
    render(<ContactDetailModal contact={baseContact} dispatches={baseDispatches} freightBills={baseFbs} onEdit={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} onToast={vi.fn()} onSaveContact={vi.fn()} />);
    expect(screen.getByText("Acme Trucking")).toBeInTheDocument();
    expect(screen.getByText(/Alice Driver/)).toBeInTheDocument();
  });

  it("renders the phone and email", () => {
    render(<ContactDetailModal contact={baseContact} dispatches={baseDispatches} freightBills={baseFbs} onEdit={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} onToast={vi.fn()} onSaveContact={vi.fn()} />);
    expect(screen.getByText(/\(555\) 123-4567/)).toBeInTheDocument();
    expect(screen.getByText(/alice@acme\.example/)).toBeInTheDocument();
  });

  it("header X-icon close button calls onClose (PR #13 regression class)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ContactDetailModal contact={baseContact} dispatches={baseDispatches} freightBills={baseFbs} onEdit={vi.fn()} onDelete={vi.fn()} onClose={onClose} onToast={vi.fn()} onSaveContact={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    // Header has three buttons: Edit (Edit2), Delete (Trash2), Close (X). Close is the last of the three.
    await user.click(buttons[2]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking the edit button calls onEdit", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<ContactDetailModal contact={baseContact} dispatches={baseDispatches} freightBills={baseFbs} onEdit={onEdit} onDelete={vi.fn()} onClose={vi.fn()} onToast={vi.fn()} onSaveContact={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);  // Edit icon
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("clicking the delete button calls onDelete", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<ContactDetailModal contact={baseContact} dispatches={baseDispatches} freightBills={baseFbs} onEdit={vi.fn()} onDelete={onDelete} onClose={vi.fn()} onToast={vi.fn()} onSaveContact={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[1]);  // Trash icon
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("clicking the modal backdrop (container) calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<ContactDetailModal contact={baseContact} dispatches={baseDispatches} freightBills={baseFbs} onEdit={vi.fn()} onDelete={vi.fn()} onClose={onClose} onToast={vi.fn()} onSaveContact={vi.fn()} />);
    await user.click(container.querySelector(".modal-bg"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

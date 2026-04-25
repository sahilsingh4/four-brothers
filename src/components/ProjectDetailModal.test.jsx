// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectDetailModal } from "./ProjectDetailModal";

const baseProject = {
  id: "p-1",
  name: "Salinas Stormwater Phase 2A",
  customerId: "c-1",
  status: "active",
  contractNumber: "MCI-91684",
};

const baseContacts = [
  { id: "c-1", companyName: "Monterey County" },
];

const baseDispatches = [
  { id: "d-1", projectId: "p-1", code: "A1", jobName: "Job One" },
  { id: "d-2", projectId: "p-1", code: "A2", jobName: "Job Two" },
  { id: "d-3", projectId: "other", code: "ZZ", jobName: "Other" },
];

const baseFbs = [
  { id: "fb-1", dispatchId: "d-1", tonnage: 10 },
  { id: "fb-2", dispatchId: "d-2", tonnage: 15 },
  { id: "fb-3", dispatchId: "d-3", tonnage: 99 },  // should be excluded
];

const baseInvoices = [
  { id: "i-1", projectId: "p-1", total: 5000 },
  { id: "i-2", projectId: "p-1", total: 3000 },
  { id: "i-3", projectId: "other", total: 99999 },  // should be excluded
];

describe("<ProjectDetailModal />", () => {
  afterEach(cleanup);

  it("renders the project name and customer name", () => {
    render(<ProjectDetailModal project={baseProject} contacts={baseContacts} dispatches={baseDispatches} freightBills={baseFbs} invoices={baseInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(baseProject.name)).toBeInTheDocument();
    expect(screen.getByText(/Monterey County/)).toBeInTheDocument();
  });

  it("shows only this project's dispatch count (excludes unrelated)", () => {
    render(<ProjectDetailModal project={baseProject} contacts={baseContacts} dispatches={baseDispatches} freightBills={baseFbs} invoices={baseInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
    // 2 matching dispatches (d-1, d-2), not 3
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("sums tonnage only across this project's freight bills", () => {
    render(<ProjectDetailModal project={baseProject} contacts={baseContacts} dispatches={baseDispatches} freightBills={baseFbs} invoices={baseInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
    // 10 + 15 = 25.0, NOT 10 + 15 + 99
    expect(screen.getByText("25.0")).toBeInTheDocument();
  });

  it("sums invoiced totals only for this project", () => {
    render(<ProjectDetailModal project={baseProject} contacts={baseContacts} dispatches={baseDispatches} freightBills={baseFbs} invoices={baseInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
    // $5,000 + $3,000 = $8,000, NOT plus the other project's $99,999
    expect(screen.getByText("$8,000.00")).toBeInTheDocument();
  });

  it("header X-icon close button calls onClose (PR #13 regression class)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ProjectDetailModal project={baseProject} contacts={baseContacts} dispatches={baseDispatches} freightBills={baseFbs} invoices={baseInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onClose={onClose} />);
    const buttons = screen.getAllByRole("button");
    // Header is: Edit, Delete, Close — Close is index 2.
    await user.click(buttons[2]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("edit button calls onEdit, delete button calls onDelete", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ProjectDetailModal project={baseProject} contacts={baseContacts} dispatches={baseDispatches} freightBills={baseFbs} invoices={baseInvoices} onEdit={onEdit} onDelete={onDelete} onClose={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);  // Edit
    await user.click(buttons[1]);  // Delete
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("clicking the modal backdrop calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<ProjectDetailModal project={baseProject} contacts={baseContacts} dispatches={baseDispatches} freightBills={baseFbs} invoices={baseInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onClose={onClose} />);
    await user.click(container.querySelector(".modal-bg"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders zero tonnage and $0 invoiced when project has no activity yet", () => {
    const emptyProject = { id: "p-new", name: "New Project", status: "active", customerId: "c-1" };
    render(<ProjectDetailModal project={emptyProject} contacts={baseContacts} dispatches={[]} freightBills={[]} invoices={[]} onEdit={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("0.0")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });
});

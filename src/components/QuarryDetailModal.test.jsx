// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuarryDetailModal } from "./QuarryDetailModal";

const baseQuarry = {
  id: "q-1",
  name: "Bay Quarry",
  address: "123 Bay Rd",
  contactName: "Alice",
  phone: "555-1234",
  email: "ops@bay.example",
  hours: "M-F 6a-4p",
  notes: "Watch for trucks at gate",
  materials: [
    { id: "m-1", name: "Sand", pricePerTon: "12.50", updatedAt: "2025-06-15", history: [] },
    { id: "m-2", name: "Gravel", pricePerTon: "18.00", updatedAt: "2025-06-15", history: [
      { date: "2025-05-01", price: 17 },
      { date: "2025-04-01", price: 16.5 },
    ]},
  ],
};

describe("<QuarryDetailModal />", () => {
  afterEach(cleanup);

  it("renders quarry name, address, contact, and notes", () => {
    render(<QuarryDetailModal quarry={baseQuarry} dispatches={[]} onEdit={() => {}} onDelete={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Bay Quarry")).toBeInTheDocument();
    expect(screen.getByText(/123 Bay Rd/)).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Watch for trucks at gate/)).toBeInTheDocument();
  });

  it("renders all materials with their per-ton price", () => {
    render(<QuarryDetailModal quarry={baseQuarry} dispatches={[]} onEdit={() => {}} onDelete={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Sand")).toBeInTheDocument();
    expect(screen.getByText("Gravel")).toBeInTheDocument();
    expect(screen.getByText(/\$12\.50\/t/)).toBeInTheDocument();
    expect(screen.getByText(/\$18\.00\/t/)).toBeInTheDocument();
  });

  it("hides the price-history list by default and shows it when toggled", async () => {
    const user = userEvent.setup();
    render(<QuarryDetailModal quarry={baseQuarry} dispatches={[]} onEdit={() => {}} onDelete={() => {}} onClose={() => {}} />);
    expect(screen.queryByText(/PRICE HISTORY/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /HISTORY \(2\)/ }));
    expect(screen.getByText(/PRICE HISTORY/i)).toBeInTheDocument();
    expect(screen.getByText(/\$17\.00\/ton/)).toBeInTheDocument();
  });

  it("shows the empty-state when no materials are listed", () => {
    render(<QuarryDetailModal quarry={{ ...baseQuarry, materials: [] }} dispatches={[]} onEdit={() => {}} onDelete={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/No materials listed yet/i)).toBeInTheDocument();
  });

  it("lists linked dispatches sorted by date desc", () => {
    const dispatches = [
      { id: "d-1", quarryId: "q-1", code: "ABC", jobName: "Job A", date: "2025-05-10" },
      { id: "d-2", quarryId: "q-1", code: "DEF", jobName: "Job B", date: "2025-06-01" },
      { id: "d-3", quarryId: "q-OTHER", code: "ZZZ", jobName: "Other Job", date: "2025-06-15" },
    ];
    const { container } = render(<QuarryDetailModal quarry={baseQuarry} dispatches={dispatches} onEdit={() => {}} onDelete={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/SOURCED ON 2 DISPATCHES/)).toBeInTheDocument();
    expect(screen.queryByText(/Other Job/)).not.toBeInTheDocument();
    // Job B (newer) should appear before Job A
    const html = container.innerHTML;
    expect(html.indexOf("Job B")).toBeLessThan(html.indexOf("Job A"));
  });

  it("edit and delete buttons fire their callbacks", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<QuarryDetailModal quarry={baseQuarry} dispatches={[]} onEdit={onEdit} onDelete={onDelete} onClose={() => {}} />);
    const buttons = screen.getAllByRole("button");
    // First two header buttons are edit and delete (X is third).
    await user.click(buttons[0]);
    await user.click(buttons[1]);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

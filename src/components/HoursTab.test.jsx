// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock storageSet so the save path doesn't try to poke window.storage.
vi.mock("../utils", async (importOriginal) => {
  const orig = await importOriginal();
  return { ...orig, storageSet: vi.fn().mockResolvedValue() };
});

import { HoursTab } from "./HoursTab";

describe("<HoursTab />", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);

  it("renders the ADD LOG button and the form fields", () => {
    render(<HoursTab logs={[]} setLogs={vi.fn()} onToast={vi.fn()} />);
    expect(screen.getByRole("button", { name: /ADD LOG/i })).toBeInTheDocument();
    // At least one "Truck #" label should be present in the add form
    expect(screen.getByText(/Truck #/)).toBeInTheDocument();
  });

  it("refuses to add a log when required fields are empty and toasts a hint", async () => {
    const user = userEvent.setup();
    const setLogs = vi.fn();
    const onToast = vi.fn();
    render(<HoursTab logs={[]} setLogs={setLogs} onToast={onToast} />);
    await user.click(screen.getByRole("button", { name: /ADD LOG/i }));
    expect(onToast).toHaveBeenCalled();
    expect(setLogs).not.toHaveBeenCalled();
  });

  it("adds a log when required fields are filled", async () => {
    const user = userEvent.setup();
    const setLogs = vi.fn();
    const onToast = vi.fn();
    render(<HoursTab logs={[]} setLogs={setLogs} onToast={onToast} />);
    // Find inputs by their surrounding labels via DOM queries.
    // Truck + Driver + Hours are the minimum the validator needs.
    const inputs = screen.getAllByRole("textbox");
    // Order in the DOM: date (type=date isn't textbox), truck, driver, job, start, end, hours, rate, notes
    // Filter for textbox-role fields and fill by position. Truck is index 0 of textboxes here.
    await user.type(inputs[0], "T-01");
    await user.type(inputs[1], "Alice Driver");
    // There's no textbox for Hours (type=number) — fill hours separately by its label.
    const numericInputs = screen.getAllByRole("spinbutton");
    await user.type(numericInputs[0], "8");  // Hours
    await user.click(screen.getByRole("button", { name: /ADD LOG/i }));
    expect(setLogs).toHaveBeenCalledTimes(1);
    const next = setLogs.mock.calls[0][0];
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ truck: "T-01", driver: "Alice Driver" });
  });

  it("renders existing logs in the table and lets the user delete one", async () => {
    const user = userEvent.setup();
    const setLogs = vi.fn();
    const existingLogs = [
      { id: "l-1", date: "2025-06-15", truck: "T-01", driver: "Alice", job: "Bay Job", hours: "8", rate: "142", notes: "" },
    ];
    render(<HoursTab logs={existingLogs} setLogs={setLogs} onToast={vi.fn()} />);
    expect(screen.getByText("T-01")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    // The Trash2 delete button has no text name; find all buttons, click the last (after ADD LOG).
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[buttons.length - 1]);
    expect(setLogs).toHaveBeenCalledTimes(1);
    expect(setLogs.mock.calls[0][0]).toHaveLength(0);
  });
});

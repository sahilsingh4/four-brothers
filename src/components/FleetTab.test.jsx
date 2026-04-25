// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../utils", async (importOriginal) => {
  const orig = await importOriginal();
  return { ...orig, storageSet: vi.fn().mockResolvedValue() };
});

import { FleetTab } from "./FleetTab";

describe("<FleetTab />", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);

  it("renders the ADD TRUCK button and the form fields", () => {
    render(<FleetTab fleet={[]} setFleet={vi.fn()} contacts={[]} onToast={vi.fn()} />);
    expect(screen.getByRole("button", { name: /ADD UNIT/i })).toBeInTheDocument();
    expect(screen.getByText(/Unit #/i)).toBeInTheDocument();
  });

  it("refuses to add a truck with no unit number and toasts a hint", async () => {
    const user = userEvent.setup();
    const setFleet = vi.fn();
    const onToast = vi.fn();
    render(<FleetTab fleet={[]} setFleet={setFleet} contacts={[]} onToast={onToast} />);
    await user.click(screen.getByRole("button", { name: /ADD UNIT/i }));
    expect(onToast).toHaveBeenCalled();
    expect(setFleet).not.toHaveBeenCalled();
  });

  it("renders existing trucks and lets user delete one", async () => {
    const user = userEvent.setup();
    const setFleet = vi.fn();
    const fleet = [
      { id: "t-1", unit: "T-01", type: "Super Dump", driver: "Alice", status: "available", notes: "" },
    ];
    render(<FleetTab fleet={fleet} setFleet={setFleet} contacts={[]} onToast={vi.fn()} />);
    expect(screen.getByText("T-01")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[buttons.length - 1]);  // row trash
    expect(setFleet).toHaveBeenCalledTimes(1);
    expect(setFleet.mock.calls[0][0]).toHaveLength(0);
  });
});

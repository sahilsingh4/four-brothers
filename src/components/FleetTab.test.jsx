// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../utils", async (importOriginal) => {
  const orig = await importOriginal();
  return { ...orig, storageSet: vi.fn().mockResolvedValue() };
});

// FleetTab now reaches into Supabase for per-truck compliance docs. Mock the
// db module so the test doesn't need a live connection. Each helper is a
// no-op resolving to an empty result — fine for the existing rendering
// tests, which don't exercise the doc upload flow.
vi.mock("../db", () => ({
  COMPLIANCE_DOC_TYPES: [
    { key: "registration", label: "Registration", appliesTo: "truck" },
    { key: "truck_insurance", label: "Truck Insurance", appliesTo: "truck" },
  ],
  fetchComplianceDocs: vi.fn().mockResolvedValue([]),
  insertComplianceDoc: vi.fn().mockResolvedValue({}),
  updateComplianceDoc: vi.fn().mockResolvedValue({}),
  deleteComplianceDoc: vi.fn().mockResolvedValue(true),
  uploadComplianceFile: vi.fn().mockResolvedValue({ filePath: "x", fileName: "x", fileSize: 0, fileMime: "" }),
  getComplianceFileUrl: vi.fn().mockResolvedValue("https://example.com/x"),
  deleteComplianceFile: vi.fn().mockResolvedValue(undefined),
  getComplianceStatus: () => ({ status: "no_date", daysUntilExpiry: null, severity: 0 }),
}));

import { FleetTab } from "./FleetTab";

describe("<FleetTab />", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);

  it("renders the Add unit button and the form fields", () => {
    render(<FleetTab fleet={[]} setFleet={vi.fn()} contacts={[]} onToast={vi.fn()} />);
    expect(screen.getByRole("button", { name: /add unit/i })).toBeInTheDocument();
    expect(screen.getByText(/Unit #/i)).toBeInTheDocument();
  });

  it("refuses to add a truck with no unit number and toasts a hint", async () => {
    const user = userEvent.setup();
    const setFleet = vi.fn();
    const onToast = vi.fn();
    render(<FleetTab fleet={[]} setFleet={setFleet} contacts={[]} onToast={onToast} />);
    await user.click(screen.getByRole("button", { name: /add unit/i }));
    expect(onToast).toHaveBeenCalled();
    expect(setFleet).not.toHaveBeenCalled();
  });

  it("renders existing trucks and lets user delete one (after confirm)", async () => {
    // The new FleetTab uses window.confirm before deleting — stub it true
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    const setFleet = vi.fn();
    const fleet = [
      { id: "t-1", unit: "T-01", type: "Super Dump", driver: "Alice", status: "available", notes: "" },
    ];
    render(<FleetTab fleet={fleet} setFleet={setFleet} contacts={[]} onToast={vi.fn()} />);
    expect(screen.getByText("T-01")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[buttons.length - 1]);  // row trash
    expect(confirmSpy).toHaveBeenCalled();
    expect(setFleet).toHaveBeenCalledTimes(1);
    expect(setFleet.mock.calls[0][0]).toHaveLength(0);
    confirmSpy.mockRestore();
  });
});

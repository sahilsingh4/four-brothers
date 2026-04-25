// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock db so the capability-statement button (which fetches projects +
// testimonials) doesn't try to reach Supabase.
vi.mock("../db", () => ({
  fetchPublicProjects: vi.fn().mockResolvedValue([]),
  fetchPublicTestimonials: vi.fn().mockResolvedValue([]),
}));

// Mock compressImage so logo-upload tests don't need a real File / canvas.
vi.mock("../utils", () => ({
  compressImage: vi.fn().mockResolvedValue("data:image/jpeg;base64,fake"),
}));

import { CompanyProfileModal } from "./CompanyProfileModal";

const baseCompany = {
  name: "4 Brothers Trucking",
  address: "Bay Point, CA",
  phone: "(555) 123-4567",
  email: "ops@example.com",
  usdot: "USDOT 1234567",
  ein: "12-3456789",
};

describe("<CompanyProfileModal />", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);

  it("renders all primary fields prefilled from the company prop", () => {
    render(<CompanyProfileModal company={baseCompany} onSave={vi.fn()} onClose={vi.fn()} onToast={vi.fn()} />);
    expect(screen.getByDisplayValue("4 Brothers Trucking")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Bay Point, CA")).toBeInTheDocument();
    expect(screen.getByDisplayValue("(555) 123-4567")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ops@example.com")).toBeInTheDocument();
    // Both the input value and an input placeholder contain "USDOT 1234567";
    // assert at least one element matches.
    expect(screen.getAllByDisplayValue(/^USDOT 1234567$/).length).toBeGreaterThan(0);
  });

  it("header X icon button calls onClose (regression test for missing-X-import bug class)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CompanyProfileModal company={baseCompany} onSave={vi.fn()} onClose={onClose} onToast={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    // Header X is the first button; CANCEL is later.
    await user.click(buttons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("CANCEL bottom button also calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CompanyProfileModal company={baseCompany} onSave={vi.fn()} onClose={onClose} onToast={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /^CANCEL$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("SAVE PROFILE persists draft, toasts, and closes", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue();
    const onClose = vi.fn();
    const onToast = vi.fn();
    render(<CompanyProfileModal company={baseCompany} onSave={onSave} onClose={onClose} onToast={onToast} />);
    // Edit the address before saving so we can confirm onSave gets the new draft.
    const addressInput = screen.getByDisplayValue("Bay Point, CA");
    await user.clear(addressInput);
    await user.type(addressInput, "Pittsburg, CA");
    await user.click(screen.getByRole("button", { name: /SAVE PROFILE/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].address).toBe("Pittsburg, CA");
    expect(onToast).toHaveBeenCalledWith("COMPANY PROFILE SAVED");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape calls onClose via the keyboard handler", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CompanyProfileModal company={baseCompany} onSave={vi.fn()} onClose={onClose} onToast={vi.fn()} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the capability-statement button is wired to the injected PDF helper", async () => {
    const user = userEvent.setup();
    const generatePDF = vi.fn();
    render(
      <CompanyProfileModal
        company={baseCompany}
        onSave={vi.fn()}
        onClose={vi.fn()}
        onToast={vi.fn()}
        generateCapabilityStatementPDF={generatePDF}
      />
    );
    await user.click(screen.getByRole("button", { name: /CAPABILITY STATEMENT/i }));
    // The click awaits two fetches before calling the PDF helper.
    await new Promise((r) => setTimeout(r, 30));
    expect(generatePDF).toHaveBeenCalledTimes(1);
    const arg = generatePDF.mock.calls[0][0];
    expect(arg.company).toEqual(expect.objectContaining({ name: "4 Brothers Trucking" }));
    expect(arg.publicProjects).toEqual([]);
    expect(arg.testimonials).toEqual([]);
  });
});

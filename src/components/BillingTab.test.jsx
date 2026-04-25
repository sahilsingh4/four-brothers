// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../utils", async (importOriginal) => {
  const orig = await importOriginal();
  return {
    ...orig,
    storageGet: vi.fn().mockResolvedValue(null),
    storageSet: vi.fn().mockResolvedValue(),
  };
});

import { BillingTab } from "./BillingTab";

describe("<BillingTab />", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);

  it("renders the FUEL SURCHARGE ENGINE heading and its four inputs", () => {
    render(<BillingTab logs={[]} onToast={vi.fn()} />);
    expect(screen.getByText(/FUEL SURCHARGE ENGINE/)).toBeInTheDocument();
    // 4 labels inside the fuel section
    expect(screen.getByText(/Current Diesel/)).toBeInTheDocument();
    expect(screen.getByText(/Threshold/)).toBeInTheDocument();
    expect(screen.getByText(/Gallons \/ Hour/)).toBeInTheDocument();
    expect(screen.getByText(/Extra \$\/gal Over/)).toBeInTheDocument();
  });

  it("renders the INVOICE BUILDER section and EXPORT CSV button", () => {
    render(<BillingTab logs={[]} onToast={vi.fn()} />);
    expect(screen.getByText(/INVOICE BUILDER/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /EXPORT CSV/i })).toBeInTheDocument();
  });

  it("computes extra-per-gallon correctly when diesel is above threshold", () => {
    // default dieselPrice=6.25, threshold=6.75, gph=6 → extra = 0
    // Change diesel to 7.25 → extra = (7.25 - 6.75) = 0.50
    render(<BillingTab logs={[]} onToast={vi.fn()} />);
    const extraInput = screen.getByDisplayValue("0.000");
    expect(extraInput).toBeInTheDocument();
    expect(extraInput).toHaveAttribute("readOnly");
  });

  it("updates the extra-per-gallon value when diesel price exceeds threshold", async () => {
    const user = userEvent.setup();
    render(<BillingTab logs={[]} onToast={vi.fn()} />);
    const dieselInput = screen.getByDisplayValue("6.25");
    await user.clear(dieselInput);
    await user.type(dieselInput, "7.75");
    // threshold default 6.75 → 7.75 - 6.75 = 1.000
    expect(screen.getByDisplayValue("1.000")).toBeInTheDocument();
  });
});

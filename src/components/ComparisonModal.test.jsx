// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ComparisonModal } from "./ComparisonModal";

const quarries = [
  {
    id: "q-1", name: "Cheap Pit", address: "111 Low Rd",
    materials: [
      { id: "m-1", name: "Class II Sand", pricePerTon: "10.00", updatedAt: "2025-06-15" },
    ],
  },
  {
    id: "q-2", name: "Expensive Pit", address: "999 Pricey Ln",
    materials: [
      { id: "m-2", name: "Class II Sand", pricePerTon: "15.00", updatedAt: "2025-06-15" },
      { id: "m-3", name: "Gravel", pricePerTon: "20.00", updatedAt: "2025-06-15" },
    ],
  },
  {
    id: "q-3", name: "Mid Pit", address: "555 Mid Ave",
    materials: [
      { id: "m-4", name: "sand grade A", pricePerTon: "12.50", updatedAt: "2025-06-15" },
    ],
  },
];

describe("<ComparisonModal />", () => {
  afterEach(cleanup);

  it("matches material name case-insensitively across all quarries", () => {
    render(<ComparisonModal quarries={quarries} materialSearch="SAND" onClose={() => {}} />);
    expect(screen.getByText("Cheap Pit")).toBeInTheDocument();
    expect(screen.getByText("Expensive Pit")).toBeInTheDocument();
    expect(screen.getByText("Mid Pit")).toBeInTheDocument();
  });

  it("sorts results ascending by price and tags the cheapest as BEST PRICE", () => {
    const { container } = render(<ComparisonModal quarries={quarries} materialSearch="sand" onClose={() => {}} />);
    expect(screen.getByText(/BEST PRICE/)).toBeInTheDocument();
    const html = container.innerHTML;
    expect(html.indexOf("Cheap Pit")).toBeLessThan(html.indexOf("Mid Pit"));
    expect(html.indexOf("Mid Pit")).toBeLessThan(html.indexOf("Expensive Pit"));
  });

  it("shows the empty-state when no material matches", () => {
    render(<ComparisonModal quarries={quarries} materialSearch="diamond" onClose={() => {}} />);
    expect(screen.getByText(/NO QUARRIES SELL "DIAMOND"/)).toBeInTheDocument();
  });

  it("returns no results for an empty search string", () => {
    render(<ComparisonModal quarries={quarries} materialSearch="   " onClose={() => {}} />);
    expect(screen.getByText(/NO QUARRIES SELL/)).toBeInTheDocument();
  });
});

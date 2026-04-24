// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TrackingHeader } from "./TrackingHeader";

describe("<TrackingHeader />", () => {
  afterEach(cleanup);

  it("uses the company name when provided", () => {
    render(<TrackingHeader company={{ name: "Acme Trucking" }} />);
    expect(screen.getByText("Acme Trucking")).toBeInTheDocument();
  });

  it("falls back to a default name when company prop is missing", () => {
    render(<TrackingHeader />);
    expect(screen.getByText(/4 BROTHERS TRUCKING/)).toBeInTheDocument();
  });

  it("renders the company logo image when logoDataUrl is set", () => {
    render(<TrackingHeader company={{ name: "X", logoDataUrl: "data:image/png;base64,abc" }} />);
    const img = screen.getByAltText("logo");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toMatch(/^data:image/);
  });

  it("renders the truck-tile fallback when no logoDataUrl is set", () => {
    const { container } = render(<TrackingHeader company={{ name: "X" }} />);
    // No <img alt="logo">, but the fallback tile is present (svg from lucide).
    expect(screen.queryByAltText("logo")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Logo } from "./Logo";

describe("<Logo />", () => {
  afterEach(cleanup);

  it("renders the wordmark and tagline at default size", () => {
    render(<Logo />);
    expect(screen.getByText("4 BROTHERS")).toBeInTheDocument();
    expect(screen.getByText(/TRUCKING/)).toBeInTheDocument();
  });

  it("scales the wordmark with size prop", () => {
    const { container: smContainer } = render(<Logo size="sm" />);
    const smWordmark = smContainer.querySelector(".fbt-display");
    expect(smWordmark.style.fontSize).toBe(`${18 * 0.75}px`);
    cleanup();

    const { container: lgContainer } = render(<Logo size="lg" />);
    const lgWordmark = lgContainer.querySelector(".fbt-display");
    expect(lgWordmark.style.fontSize).toBe(`${18 * 1.4}px`);
  });
});

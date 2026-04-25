// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QRCodeBlock } from "./QRCodeBlock";
import { qrServiceUrl } from "../utils";

describe("qrServiceUrl", () => {
  it("URL-encodes the data and embeds the size in WxW format", () => {
    const u = qrServiceUrl("https://example.com/path?x=1", 256);
    expect(u).toContain("size=256x256");
    expect(u).toContain("data=https%3A%2F%2Fexample.com%2Fpath%3Fx%3D1");
  });

  it("defaults size to 300 when omitted", () => {
    expect(qrServiceUrl("hi")).toContain("size=300x300");
  });

  it("uses brand colors (steel + cream) baked into the URL", () => {
    const u = qrServiceUrl("hi");
    expect(u).toContain("color=1C1917");
    expect(u).toContain("bgcolor=FAFAF9");
  });
});

describe("<QRCodeBlock />", () => {
  afterEach(cleanup);

  it("renders an <img> with the encoded QR URL at 2x the requested size", () => {
    render(<QRCodeBlock url="https://example.com/dispatch/A1" size={120} />);
    const img = screen.getByAltText("QR code");
    expect(img.getAttribute("src")).toContain("size=240x240");
    expect(img.getAttribute("src")).toContain("data=https%3A%2F%2Fexample.com%2Fdispatch%2FA1");
  });

  it("renders a SAVE PNG button", () => {
    render(<QRCodeBlock url="https://x.test" />);
    expect(screen.getByRole("button", { name: /SAVE PNG/i })).toBeInTheDocument();
  });

  it("falls back to the offline message when the image errors out", () => {
    render(<QRCodeBlock url="https://x.test" />);
    fireEvent.error(screen.getByAltText("QR code"));
    expect(screen.getByText(/QR SERVICE OFFLINE/i)).toBeInTheDocument();
    // SAVE PNG button is gone in the fallback view
    expect(screen.queryByRole("button", { name: /SAVE PNG/i })).not.toBeInTheDocument();
  });
});

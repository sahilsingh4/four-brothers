// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Lightbox } from "./Lightbox";

describe("<Lightbox />", () => {
  afterEach(cleanup);

  it("renders the image with the given src", () => {
    render(<Lightbox src="/photo.jpg" onClose={() => {}} />);
    const img = screen.getByAltText("Scale ticket");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("/photo.jpg");
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<Lightbox src="/photo.jpg" onClose={onClose} />);
    await user.click(container.querySelector(".modal-bg"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Lightbox src="/photo.jpg" onClose={onClose} />);
    // The close button is a borderless square — we find it by virtue of being
    // the only <button> in the lightbox.
    await user.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onClose when the image itself is clicked (so users can drag/zoom)", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Lightbox src="/photo.jpg" onClose={onClose} />);
    await user.click(screen.getByAltText("Scale ticket"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

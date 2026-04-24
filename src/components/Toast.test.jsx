// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toast } from "./Toast";

describe("<Toast />", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); cleanup(); });

  it("renders a string message", () => {
    render(<Toast msg="ORDER DELETED" onClose={() => {}} />);
    expect(screen.getByText(/ORDER DELETED/)).toBeInTheDocument();
  });

  it("auto-dismisses after 2.8s for a plain string toast", () => {
    const onClose = vi.fn();
    render(<Toast msg="HELLO" onClose={onClose} />);
    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2799);
    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders an action button when given an object payload", () => {
    const onUndo = vi.fn();
    render(
      <Toast
        msg={{ msg: "FB DELETED", action: { label: "UNDO", onClick: onUndo } }}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/FB DELETED/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /UNDO/ })).toBeInTheDocument();
  });

  it("uses a longer 6s duration when an action is present", () => {
    const onClose = vi.fn();
    render(
      <Toast
        msg={{ msg: "FB DELETED", action: { label: "UNDO", onClick: () => {} } }}
        onClose={onClose}
      />
    );
    vi.advanceTimersByTime(2800);
    expect(onClose).not.toHaveBeenCalled();  // would have fired for plain toast
    vi.advanceTimersByTime(3201);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking the action calls both onClick and onClose exactly once", async () => {
    vi.useRealTimers();  // user-event needs real timers
    const onUndo = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Toast
        msg={{ msg: "FB DELETED", action: { label: "UNDO", onClick: onUndo } }}
        onClose={onClose}
      />
    );
    await user.click(screen.getByRole("button", { name: /UNDO/ }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("respects a custom duration override", () => {
    const onClose = vi.fn();
    render(<Toast msg={{ msg: "STAY", duration: 10000 }} onClose={onClose} />);
    vi.advanceTimersByTime(9999);
    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

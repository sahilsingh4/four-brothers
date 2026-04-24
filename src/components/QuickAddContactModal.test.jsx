// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickAddContactModal } from "./QuickAddContactModal";

describe("<QuickAddContactModal />", () => {
  afterEach(cleanup);

  it("for kind=sub, shows the Company Name field and brokerage block", () => {
    render(<QuickAddContactModal kind="sub" onSave={() => {}} onCancel={() => {}} onToast={() => {}} />);
    expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Apply brokerage/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Person/i)).toBeInTheDocument();
  });

  it("for kind=driver, hides Company Name and brokerage", () => {
    render(<QuickAddContactModal kind="driver" onSave={() => {}} onCancel={() => {}} onToast={() => {}} />);
    expect(screen.queryByLabelText(/Company Name/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Apply brokerage/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Driver Name/i)).toBeInTheDocument();
  });

  it("toasts and skips save when no name is provided", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onToast = vi.fn();
    render(<QuickAddContactModal kind="driver" onSave={onSave} onCancel={() => {}} onToast={onToast} />);
    await user.click(screen.getByRole("button", { name: /SAVE \+ USE/i }));
    expect(onToast).toHaveBeenCalledWith("ENTER A NAME");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with a complete contact draft for a driver", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<QuickAddContactModal kind="driver" onSave={onSave} onCancel={() => {}} onToast={() => {}} />);
    await user.type(screen.getByLabelText(/Driver Name/i), "Alice Driver");
    await user.type(screen.getByLabelText(/Phone/i), "555-1234");
    await user.type(screen.getByLabelText(/Default Pay Rate/i), "75");
    await user.click(screen.getByRole("button", { name: /SAVE \+ USE/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const arg = onSave.mock.calls[0][0];
    expect(arg.contactName).toBe("Alice Driver");
    expect(arg.phone).toBe("555-1234");
    expect(arg.defaultPayRate).toBe(75);
    expect(arg.brokerageApplies).toBe(false);
    expect(arg.brokeragePercent).toBe(0);
    expect(arg.type).toBe("driver");
  });

  it("for sub, defaults brokerageApplies=true and brokeragePercent=10", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<QuickAddContactModal kind="sub" onSave={onSave} onCancel={() => {}} onToast={() => {}} />);
    await user.type(screen.getByLabelText(/Company Name/i), "ABC Trucking");
    await user.click(screen.getByRole("button", { name: /SAVE \+ USE/i }));
    const arg = onSave.mock.calls[0][0];
    expect(arg.brokerageApplies).toBe(true);
    expect(arg.brokeragePercent).toBe(10);
  });

  it("Escape key triggers onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<QuickAddContactModal kind="driver" onSave={() => {}} onCancel={onCancel} onToast={() => {}} />);
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpdateUser = vi.fn();
vi.mock("../supabase", () => ({
  supabase: { auth: { updateUser: (...args) => mockUpdateUser(...args) } },
}));

import { ChangePasswordModal } from "./ChangePasswordModal";

describe("<ChangePasswordModal />", () => {
  beforeEach(() => { mockUpdateUser.mockReset(); });
  afterEach(cleanup);

  const fillAndSubmit = async (user, pw, confirm) => {
    await user.type(screen.getByLabelText(/^New Password$/i), pw);
    if (confirm !== undefined) await user.type(screen.getByLabelText(/Confirm New Password/i), confirm);
    await user.click(screen.getByRole("button", { name: /UPDATE PASSWORD/i }));
  };

  it("rejects a weak password before hitting supabase", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordModal onClose={() => {}} onToast={() => {}} />);
    await fillAndSubmit(user, "short", "short");
    expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("requires the two password fields to match", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordModal onClose={() => {}} onToast={() => {}} />);
    await fillAndSubmit(user, "Tr0pic@lParr0tz", "Tr0pic@lParr0tzDIFFERENT");
    expect(screen.getByText(/don't match/i)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("toasts and closes on success", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onToast = vi.fn();
    mockUpdateUser.mockResolvedValueOnce({ error: null });
    render(<ChangePasswordModal onClose={onClose} onToast={onToast} />);
    await fillAndSubmit(user, "Tr0pic@lParr0tz", "Tr0pic@lParr0tz");
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "Tr0pic@lParr0tz" });
    expect(onToast).toHaveBeenCalledWith("PASSWORD CHANGED");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("surfaces supabase errors without closing", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockUpdateUser.mockResolvedValueOnce({ error: { message: "Same as old password" } });
    render(<ChangePasswordModal onClose={onClose} onToast={() => {}} />);
    await fillAndSubmit(user, "Tr0pic@lParr0tz", "Tr0pic@lParr0tz");
    expect(await screen.findByText(/Same as old password/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("clicking the X close icon calls onClose without saving", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ChangePasswordModal onClose={onClose} onToast={() => {}} />);
    // The X button has no accessible name — find it as the first button (header close).
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});

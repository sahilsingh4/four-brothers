// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the supabase module BEFORE importing the component.
const mockSignIn = vi.fn();
vi.mock("../supabase", () => ({
  supabase: { auth: { signInWithPassword: (...args) => mockSignIn(...args) } },
}));

import { LoginScreen } from "./LoginScreen";

describe("<LoginScreen />", () => {
  beforeEach(() => { mockSignIn.mockReset(); });
  afterEach(cleanup);

  it("rejects an invalid email format before hitting supabase", async () => {
    const user = userEvent.setup();
    render(<LoginScreen onSuccess={() => {}} onCancel={() => {}} />);
    await user.type(screen.getByLabelText(/Email/i), "not-an-email");
    await user.type(screen.getByLabelText(/Password/i), "anything");
    await user.click(screen.getByRole("button", { name: /SIGN IN/i }));
    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("requires a password", async () => {
    const user = userEvent.setup();
    render(<LoginScreen onSuccess={() => {}} onCancel={() => {}} />);
    await user.type(screen.getByLabelText(/Email/i), "a@b.co");
    await user.click(screen.getByRole("button", { name: /SIGN IN/i }));
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("calls onSuccess with the user when supabase returns success", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockSignIn.mockResolvedValueOnce({ data: { user: { id: "u-1" } }, error: null });
    render(<LoginScreen onSuccess={onSuccess} onCancel={() => {}} />);
    await user.type(screen.getByLabelText(/Email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/Password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /SIGN IN/i }));
    expect(mockSignIn).toHaveBeenCalledWith({ email: "alice@example.com", password: "secret123" });
    expect(onSuccess).toHaveBeenCalledWith({ id: "u-1" });
  });

  it("surfaces supabase error messages", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockSignIn.mockResolvedValueOnce({ data: null, error: { message: "Invalid login credentials" } });
    render(<LoginScreen onSuccess={onSuccess} onCancel={() => {}} />);
    await user.type(screen.getByLabelText(/Email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/Password/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /SIGN IN/i }));
    expect(await screen.findByText(/Invalid login credentials/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("clicking BACK calls onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<LoginScreen onSuccess={() => {}} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: /BACK TO PUBLIC SITE/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Enter on the password field submits the form", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockSignIn.mockResolvedValueOnce({ data: { user: { id: "u-1" } }, error: null });
    render(<LoginScreen onSuccess={onSuccess} onCancel={() => {}} />);
    await user.type(screen.getByLabelText(/Email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/Password/i), "secret123{Enter}");
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });
});

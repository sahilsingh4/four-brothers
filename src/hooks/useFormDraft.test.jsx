// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useFormDraft, FORM_DRAFT_PREFIX } from "./useFormDraft";

describe("useFormDraft", () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(cleanup);

  it("returns the initial value when no saved draft exists", () => {
    const { result } = renderHook(() => useFormDraft("test", { name: "" }));
    expect(result.current[0]).toEqual({ name: "" });
    expect(result.current[2]).toBe(false);  // wasRestored
  });

  it("restores from localStorage when a saved draft exists", async () => {
    localStorage.setItem(FORM_DRAFT_PREFIX + "test", JSON.stringify({ name: "Sahil" }));
    const { result } = renderHook(() => useFormDraft("test", { name: "" }));
    expect(result.current[0]).toEqual({ name: "Sahil" });
    // wasRestored flips via queueMicrotask — wait one microtask tick.
    await act(async () => {});
    expect(result.current[2]).toBe(true);
  });

  it("debounce-saves draft updates to localStorage after 500ms", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useFormDraft("test", { name: "" }));
    act(() => { result.current[1]({ name: "Sahil" }); });
    // Not yet — debounce
    expect(localStorage.getItem(FORM_DRAFT_PREFIX + "test")).toBe(null);
    act(() => { vi.advanceTimersByTime(501); });
    expect(JSON.parse(localStorage.getItem(FORM_DRAFT_PREFIX + "test"))).toEqual({ name: "Sahil" });
    vi.useRealTimers();
  });

  it("clearDraft removes the saved copy and resets wasRestored", async () => {
    localStorage.setItem(FORM_DRAFT_PREFIX + "test", JSON.stringify({ name: "X" }));
    const { result } = renderHook(() => useFormDraft("test", { name: "" }));
    await act(async () => {});
    expect(result.current[2]).toBe(true);
    act(() => { result.current[3](); });
    expect(localStorage.getItem(FORM_DRAFT_PREFIX + "test")).toBe(null);
    expect(result.current[2]).toBe(false);
  });

  it("does NOT persist when enabled=false", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useFormDraft("test", { name: "" }, false));
    act(() => { result.current[1]({ name: "Sahil" }); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(localStorage.getItem(FORM_DRAFT_PREFIX + "test")).toBe(null);
    vi.useRealTimers();
  });

  it("ignores a saved draft when enabled=false (uses initialValue instead)", () => {
    localStorage.setItem(FORM_DRAFT_PREFIX + "test", JSON.stringify({ name: "Saved" }));
    const { result } = renderHook(() => useFormDraft("test", { name: "Initial" }, false));
    expect(result.current[0]).toEqual({ name: "Initial" });
    expect(result.current[2]).toBe(false);
  });
});

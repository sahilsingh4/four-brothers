// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useNetworkStatus } from "./useNetworkStatus";

describe("useNetworkStatus", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("returns true when navigator.onLine is true", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(true);
  });

  it("returns false when navigator.onLine is false on mount", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(false);
  });

  it("flips to false when an offline event fires", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(true);
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(result.current).toBe(false);
  });

  it("flips back to true when an online event fires", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(false);
    act(() => { window.dispatchEvent(new Event("online")); });
    expect(result.current).toBe(true);
  });
});

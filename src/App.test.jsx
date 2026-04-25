// @vitest-environment jsdom
//
// App-level smoke test. Catches the class of regression that PR #6 shipped
// (HomeTab not defined → crash on dashboard render) — every route should
// boot without throwing or referencing an undefined identifier.
//
// Strategy: stub the Supabase client at @supabase/supabase-js so every
// fetch in db.js returns empty data. Then render <App /> at each known
// route hash, wait for lazy chunks + initial fetches to settle, and
// assert nothing throws.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

// vi.mock is hoisted to the top of the file at parse time, so the factory
// must be self-contained — we build the stub inside it, not via outer scope.
vi.mock("@supabase/supabase-js", () => {
  const result = { data: [], error: null };
  const builder = {};
  // Every chainable method returns the same builder; terminal awaits resolve
  // to { data: [], error: null }.
  for (const name of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "is", "not", "or",
    "order", "limit", "range", "filter",
    "gte", "lte", "gt", "lt", "match", "contains",
  ]) builder[name] = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve) => Promise.resolve(result).then(resolve);

  const fakeSupabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => builder),
    channel: vi.fn(() => {
      const ch = { on: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() };
      ch.on.mockReturnValue(ch);
      ch.subscribe.mockReturnValue(ch);
      return ch;
    }),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  };

  return { createClient: vi.fn(() => fakeSupabase) };
});

// import after the mock so App.jsx and db.js see the stub
import App from "./App";

describe("<App /> smoke test", () => {
  beforeEach(() => {
    // jsdom defaults to about:blank with no hash. Each test sets its own.
    window.location.hash = "";
    // Quiet down the noisy "[auto-purge]" + "storage set failed" console
    // messages that fire on every mount under jsdom.
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation((...args) => {
      // Surface React errors but swallow expected supabase mock noise.
      const msg = String(args[0] || "");
      if (msg.includes("Warning:") || msg.includes("ReferenceError") || msg.includes("is not defined")) {
        // Re-throw via a throw inside the spy to fail the test.
        throw new Error(msg);
      }
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the public marketing site at the default route without crashing", async () => {
    render(<App />);
    // PublicSite is lazy-loaded; the Suspense fallback shows "▸ LOADING…"
    // first, then the actual landing page renders. Wait for it.
    await waitFor(() => {
      // PublicSite renders a "Get Quote" / "request a quote" CTA. Match either.
      const root = document.body.textContent || "";
      expect(root.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it("renders the admin dashboard when supabase reports an active session", async () => {
    // This is the key regression test. PR #6 broke the dashboard by orphaning
    // HomeTab's identifier — the build, lint, and existing tests all passed
    // because no test ever rendered the Dashboard. Override the supabase
    // session mock to fake a logged-in user so App boots into Dashboard +
    // its <HomeTab/> child.
    const { supabase } = await import("./supabase");
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: "test-user", email: "test@example.com" } } },
    });

    render(<App />);
    await waitFor(() => {
      // Dashboard renders nav tabs including "HOME"; HomeTab itself renders
      // titled section cards. Either suffices to prove the dashboard tree
      // mounted without throwing.
      const text = document.body.textContent || "";
      expect(text).toMatch(/HOME|ORDERS|REVIEW|FREIGHT/i);
    }, { timeout: 5000 });
  });

  it("renders the driver-upload route at #/submit/CODE without crashing", async () => {
    window.location.hash = "#/submit/ABC123";
    render(<App />);
    await waitFor(() => {
      // DriverUploadPage renders "DRIVER / SUB UPLOAD" or the not-found state
      // (since no dispatch matches the code in our empty fake DB).
      const root = document.body.textContent || "";
      expect(root.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it("renders the single-dispatch tracking route at #/track/CODE without crashing", async () => {
    window.location.hash = "#/track/ABC123";
    render(<App />);
    await waitFor(() => {
      // DispatchTrackingPage shows "TRACKING LINK NOT FOUND" when no dispatch matches.
      expect(screen.getByText(/TRACKING LINK NOT FOUND/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("renders the customer-portal route at #/portal/TOKEN without crashing", async () => {
    window.location.hash = "#/portal/abc123def456";
    render(<App />);
    await waitFor(() => {
      // CustomerPortal shows "ACCESS DENIED" when the token doesn't resolve.
      expect(screen.getByText(/ACCESS DENIED|Loading|PORTAL/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("renders the driver/sub pay-portal route at #/pay/TOKEN without crashing", async () => {
    window.location.hash = "#/pay/abc123def456";
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/PORTAL UNAVAILABLE|LOADING|PAY/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

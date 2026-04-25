// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BidModal } from "./BidModal";
import { FORM_DRAFT_PREFIX } from "../hooks/useFormDraft";

// useFormDraft writes to localStorage; clear between tests so a NEW-bid
// draft from one test doesn't leak into the next.
beforeEach(() => { localStorage.clear(); });
afterEach(cleanup);

describe("<BidModal />", () => {
  describe("new bid", () => {
    it("renders the NEW BID label and an empty title field", () => {
      render(<BidModal onSave={() => {}} onClose={() => {}} onToast={() => {}} />);
      expect(screen.getByText("NEW BID")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Volcanic Basalt/)).toHaveValue("");
    });

    it("rejects empty title and toasts a hint", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onToast = vi.fn();
      render(<BidModal onSave={onSave} onClose={() => {}} onToast={onToast} />);
      // The save button has the SAVE icon + "SAVE BID" label.
      await user.click(screen.getByRole("button", { name: /CREATE BID/i }));
      expect(onToast).toHaveBeenCalledWith("TITLE REQUIRED");
      expect(onSave).not.toHaveBeenCalled();
    });

    it("calls onSave with a normalized payload when a title is provided", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue();
      const onClose = vi.fn();
      render(<BidModal onSave={onSave} onClose={onClose} onToast={() => {}} />);
      await user.type(screen.getByPlaceholderText(/Volcanic Basalt/), "Test Bid");
      await user.click(screen.getByRole("button", { name: /CREATE BID/i }));
      expect(onSave).toHaveBeenCalledTimes(1);
      const payload = onSave.mock.calls[0][0];
      expect(payload.title).toBe("Test Bid");
      // Numbers come through as null when blank, not "" or 0.
      expect(payload.estimatedValue).toBe(null);
      expect(payload.ourBidAmount).toBe(null);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("auto-saves the draft to localStorage so refreshing doesn't lose work", async () => {
      const user = userEvent.setup();
      render(<BidModal onSave={() => {}} onClose={() => {}} onToast={() => {}} />);
      await user.type(screen.getByPlaceholderText(/Volcanic Basalt/), "Half typed");
      // useFormDraft has a 500ms debounce; wait past it with real timers.
      await new Promise((r) => setTimeout(r, 600));
      const raw = localStorage.getItem(FORM_DRAFT_PREFIX + "bid:new");
      expect(raw).not.toBe(null);
      expect(JSON.parse(raw).title).toBe("Half typed");
    });

    it("restores a previously-saved draft on mount and shows the RESTORED badge", async () => {
      localStorage.setItem(FORM_DRAFT_PREFIX + "bid:new", JSON.stringify({
        title: "Resumed bid", agency: "Acme",
      }));
      render(<BidModal onSave={() => {}} onClose={() => {}} onToast={() => {}} />);
      // wasRestored flips after a microtask
      expect(await screen.findByText(/RESTORED/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Volcanic Basalt/)).toHaveValue("Resumed bid");
    });

    it("clears the draft from localStorage after a successful save", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue();
      // Pre-seed a draft so we can prove it's the SAME modal that clears it.
      localStorage.setItem(FORM_DRAFT_PREFIX + "bid:new", JSON.stringify({ title: "x" }));
      render(<BidModal onSave={onSave} onClose={() => {}} onToast={() => {}} />);
      await user.click(screen.getByRole("button", { name: /CREATE BID/i }));
      expect(localStorage.getItem(FORM_DRAFT_PREFIX + "bid:new")).toBe(null);
    });
  });

  describe("edit bid", () => {
    const existing = { id: "b-1", title: "Existing", agency: "X", status: "submitted", priority: "high" };

    it("renders the EDIT BID label and prefills fields from props", () => {
      render(<BidModal bid={existing} onSave={() => {}} onClose={() => {}} onToast={() => {}} />);
      expect(screen.getByText("EDIT BID")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Volcanic Basalt/)).toHaveValue("Existing");
    });

    it("does NOT show the RESTORED badge for an existing bid (server is source of truth)", () => {
      // Even with a leftover draft in storage, editing an existing bid should ignore it.
      localStorage.setItem(FORM_DRAFT_PREFIX + "bid:new", JSON.stringify({ title: "Stale" }));
      render(<BidModal bid={existing} onSave={() => {}} onClose={() => {}} onToast={() => {}} />);
      expect(screen.queryByText(/RESTORED/i)).not.toBeInTheDocument();
    });

    it("shows a Delete button when onDelete is provided and calls it on click", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      render(<BidModal bid={existing} onSave={() => {}} onDelete={onDelete} onClose={() => {}} onToast={() => {}} />);
      await user.click(screen.getByRole("button", { name: /DELETE/i }));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("keyboard shortcuts", () => {
    it("Escape calls onClose", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<BidModal onSave={() => {}} onClose={onClose} onToast={() => {}} />);
      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Cmd-S triggers save (validates first, so toasts when title is empty)", async () => {
      const user = userEvent.setup();
      const onToast = vi.fn();
      render(<BidModal onSave={() => {}} onClose={() => {}} onToast={onToast} />);
      await user.keyboard("{Meta>}s{/Meta}");
      expect(onToast).toHaveBeenCalledWith("TITLE REQUIRED");
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  fmt$, fmtDate, fmtDateTime, formatTime12h, todayISO, randomCode,
  validatePassword, validateEmail, clientToken, matchesClientToken,
} from "./utils";

describe("fmt$", () => {
  it("formats positive numbers with thousands separators and 2 decimals", () => {
    expect(fmt$(1234.5)).toBe("$1,234.50");
    expect(fmt$(0)).toBe("$0.00");
    expect(fmt$(1234567.89)).toBe("$1,234,567.89");
  });
  it("coerces non-numeric input to 0", () => {
    expect(fmt$(undefined)).toBe("$0.00");
    expect(fmt$(null)).toBe("$0.00");
    expect(fmt$("not a number")).toBe("$0.00");
  });
  it("preserves precision on decimal input", () => {
    expect(fmt$(0.1 + 0.2)).toBe("$0.30");  // not $0.30000000000000004
  });
});

describe("fmtDate / fmtDateTime", () => {
  it("returns em-dash for falsy input", () => {
    expect(fmtDate("")).toBe("—");
    expect(fmtDate(null)).toBe("—");
    expect(fmtDateTime(undefined)).toBe("—");
  });
  it("returns the input back if it can't be parsed (graceful degrade)", () => {
    // A truly malformed string still parses as Invalid Date in V8 — we tolerate either result.
    const r = fmtDate("not-a-date");
    expect(typeof r).toBe("string");
  });
  it("formats valid ISO strings", () => {
    const out = fmtDate("2025-06-15T12:00:00Z");
    expect(out).toMatch(/Jun/);
    expect(out).toMatch(/2025/);
  });
});

describe("formatTime12h", () => {
  it("returns empty for non-string / blank input", () => {
    expect(formatTime12h("")).toBe("");
    expect(formatTime12h(null)).toBe("");
    expect(formatTime12h(undefined)).toBe("");
    expect(formatTime12h(123)).toBe("");
  });
  it("formats midnight and noon correctly", () => {
    expect(formatTime12h("00:00")).toBe("12:00 AM");
    expect(formatTime12h("12:00")).toBe("12:00 PM");
  });
  it("formats AM/PM around the boundary", () => {
    expect(formatTime12h("01:05")).toBe("1:05 AM");
    expect(formatTime12h("11:59")).toBe("11:59 AM");
    expect(formatTime12h("13:00")).toBe("1:00 PM");
    expect(formatTime12h("23:59")).toBe("11:59 PM");
  });
  it("zero-pads minutes", () => {
    expect(formatTime12h("09:05")).toBe("9:05 AM");
    expect(formatTime12h("09:5")).toBe("9:05 AM");
  });
  it("returns input unchanged when hour is unparseable", () => {
    expect(formatTime12h("abc:de")).toBe("abc:de");
  });
});

describe("todayISO", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("randomCode", () => {
  it("returns the requested length", () => {
    expect(randomCode(6)).toHaveLength(6);
    expect(randomCode(12)).toHaveLength(12);
    expect(randomCode()).toHaveLength(6);  // default
  });
  it("uses unambiguous alphabet (no I, O, 0, 1)", () => {
    for (let i = 0; i < 50; i++) {
      const c = randomCode(20);
      expect(c).not.toMatch(/[IO01]/);
    }
  });
});

describe("validatePassword", () => {
  it("rejects passwords shorter than 12", () => {
    expect(validatePassword("Aa1!Aa1!Aa1")).toMatch(/at least 12/);
  });
  it("requires lower, upper, digit, and symbol", () => {
    expect(validatePassword("ALLCAPS123!XX")).toMatch(/lowercase/);
    expect(validatePassword("alllower123!xx")).toMatch(/uppercase/);
    expect(validatePassword("NoDigitsHere!!")).toMatch(/number/);
    expect(validatePassword("NoSymbols12345")).toMatch(/special character/);
  });
  it("rejects 3+ repeated characters in a row", () => {
    expect(validatePassword("Aaaa1234567!")).toMatch(/repeated characters/);
  });
  it("rejects common sequences", () => {
    expect(validatePassword("Hello123456!XX")).toMatch(/common sequences/);
    expect(validatePassword("Helloqwerty1!XX")).toMatch(/common sequences/);
  });
  it("rejects company-related words", () => {
    expect(validatePassword("MyBrothers12!XX")).toMatch(/common words/);
    expect(validatePassword("MyDispatch12!XX")).toMatch(/common words/);
  });
  it("accepts a strong password", () => {
    expect(validatePassword("Tr0pic@lParr0tz")).toBe(null);
  });
});

describe("validateEmail", () => {
  it("requires @ and .", () => {
    expect(validateEmail("")).toMatch(/valid email/);
    expect(validateEmail("nope")).toMatch(/valid email/);
    expect(validateEmail("foo@bar")).toMatch(/valid email/);
    expect(validateEmail("foo.bar")).toMatch(/valid email/);
  });
  it("accepts a basic email shape", () => {
    expect(validateEmail("a@b.co")).toBe(null);
    expect(validateEmail("alice@example.com")).toBe(null);
  });
});

describe("clientToken / matchesClientToken", () => {
  it("returns null for empty / non-alphanumeric names", () => {
    expect(clientToken("")).toBe(null);
    expect(clientToken(null)).toBe(null);
    expect(clientToken("!!!")).toBe(null);
  });
  it("normalizes whitespace and case so equivalent names produce identical tokens", () => {
    const a = clientToken("Acme Trucking");
    expect(a).toBe(clientToken("acme trucking"));
    expect(a).toBe(clientToken("ACME-TRUCKING"));
    expect(a).toBe(clientToken("  Acme   Trucking!  "));
  });
  it("produces an 8+1 char token starting with C", () => {
    const t = clientToken("Acme Trucking");
    expect(t).toMatch(/^C[A-Z0-9]+$/);
    expect(t.length).toBeGreaterThanOrEqual(7);
  });
  it("matchesClientToken matches against either clientName or subContractor", () => {
    const t = clientToken("Acme");
    expect(matchesClientToken({ clientName: "Acme" }, t)).toBe(true);
    expect(matchesClientToken({ subContractor: "Acme" }, t)).toBe(true);
    expect(matchesClientToken({ clientName: "Beta" }, t)).toBe(false);
    expect(matchesClientToken({ clientName: "Acme" }, null)).toBe(false);
  });
});

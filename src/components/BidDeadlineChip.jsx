import { bidDaysUntil } from "../utils";

// Color-coded deadline chip. Use on lists, home dashboard, customer portal.
// Tiers: overdue (dark red) → today (red) → ≤3d (red) → ≤7d (amber) → future (gray).
export const BidDeadlineChip = ({ dueAt, label = "DUE" }) => {
  if (!dueAt) return null;
  const days = bidDaysUntil(dueAt);
  const dateStr = new Date(dueAt).toLocaleDateString();
  let color, bg, text;
  if (days < 0) { color = "#FFF"; bg = "#991B1B"; text = `${label} ${Math.abs(days)}D AGO`; }
  else if (days === 0) { color = "#FFF"; bg = "var(--safety)"; text = `${label} TODAY`; }
  else if (days <= 3) { color = "#FFF"; bg = "var(--safety)"; text = `${label} IN ${days}D`; }
  else if (days <= 7) { color = "var(--steel)"; bg = "var(--hazard)"; text = `${label} IN ${days}D`; }
  else { color = "var(--steel)"; bg = "#F1F5F9"; text = `${label} ${dateStr}`; }
  return (
    <span className="fbt-mono" style={{ fontSize: 10, padding: "2px 6px", background: bg, color, fontWeight: 700, whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
};

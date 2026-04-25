import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fmt$, fmtDate, todayISO, storageSet } from "../utils";

export const HoursTab = ({ logs, setLogs, onToast }) => {
  const [draft, setDraft] = useState({ date: todayISO(), truck: "", driver: "", job: "", startTime: "", endTime: "", hours: "", rate: "142", notes: "" });
  const computeHours = (s, e) => { if (!s || !e) return ""; const [sh, sm] = s.split(":").map(Number); const [eh, em] = e.split(":").map(Number); const diff = (eh * 60 + em - sh * 60 - sm) / 60; return diff > 0 ? diff.toFixed(2) : ""; };

  const addLog = async () => {
    if (!draft.truck || !draft.driver) { onToast("TRUCK + DRIVER REQUIRED"); return; }
    const hrs = draft.hours || computeHours(draft.startTime, draft.endTime) || "0";
    const billable = Math.max(8, Number(hrs));
    const entry = { id: Date.now(), ...draft, hours: hrs, billableHours: billable, amount: billable * Number(draft.rate || 0) };
    const next = [entry, ...logs];
    setLogs(next);
    await storageSet("fbt:logs", next);
    setDraft({ ...draft, truck: "", driver: "", job: "", startTime: "", endTime: "", hours: "", notes: "" });
    onToast("LOG ADDED");
  };

  const removeLog = async (id) => { const next = logs.filter((l) => l.id !== id); setLogs(next); await storageSet("fbt:logs", next); onToast("LOG REMOVED"); };

  const totalHours = logs.reduce((s, l) => s + Number(l.billableHours || 0), 0);
  const totalDollars = logs.reduce((s, l) => s + Number(l.amount || 0), 0);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}><div className="stat-num">{logs.length}</div><div className="stat-label">Total Logs</div></div>
        <div className="fbt-card" style={{ padding: 20 }}><div className="stat-num">{totalHours.toFixed(1)}</div><div className="stat-label">Billable Hours</div></div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}><div className="stat-num">{fmt$(totalDollars)}</div><div className="stat-label">Gross Billing</div></div>
      </div>
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>NEW HOURS LOG</h3></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Date</label><input className="fbt-input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
          <div><label className="fbt-label">Truck #</label><input className="fbt-input" value={draft.truck} onChange={(e) => setDraft({ ...draft, truck: e.target.value })} placeholder="T-01" /></div>
          <div><label className="fbt-label">Driver</label><input className="fbt-input" value={draft.driver} onChange={(e) => setDraft({ ...draft, driver: e.target.value })} /></div>
          <div><label className="fbt-label">Job / Client</label><input className="fbt-input" value={draft.job} onChange={(e) => setDraft({ ...draft, job: e.target.value })} placeholder="MCI #91684" /></div>
          <div><label className="fbt-label">Start</label><input className="fbt-input" type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} /></div>
          <div><label className="fbt-label">End</label><input className="fbt-input" type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} /></div>
          <div><label className="fbt-label">Hours (override)</label><input className="fbt-input" type="number" step="0.25" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} placeholder="auto" /></div>
          <div><label className="fbt-label">Rate $/hr</label><input className="fbt-input" type="number" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="fbt-label">Notes</label><input className="fbt-input" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
        </div>
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button onClick={addLog} className="btn-primary"><Plus size={16} /> ADD LOG</button>
          <span className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)" }}>▸ 8-HR MIN AUTO-APPLIED · DEFAULT RATE $142 (MCI)</span>
        </div>
      </div>
      <div className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "2px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>LOG SHEET</h3></div>
        <div className="scroll-x">
          <table className="fbt-table">
            <thead><tr><th>Date</th><th>Truck</th><th>Driver</th><th>Job</th><th>Hrs</th><th>Billable</th><th>Rate</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {logs.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--concrete)" }}>No logs yet.</td></tr>}
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{fmtDate(l.date)}</td><td><strong>{l.truck}</strong></td><td>{l.driver}</td><td>{l.job || "—"}</td>
                  <td>{l.hours || "—"}</td><td><strong>{Number(l.billableHours).toFixed(2)}</strong></td>
                  <td>{fmt$(l.rate)}</td><td style={{ color: "var(--hazard-deep)", fontWeight: 700 }}>{fmt$(l.amount)}</td>
                  <td><button className="btn-danger" onClick={() => removeLog(l.id)}><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

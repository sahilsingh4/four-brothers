import { useState, useEffect } from "react";
import { Download, Fuel } from "lucide-react";
import { fmt$, todayISO, storageGet, storageSet } from "../utils";

export const BillingTab = ({ logs, onToast }) => {
  const [dieselPrice, setDieselPrice] = useState(6.25);
  const [threshold, setThreshold] = useState(6.75);
  const [gallonsPerHour, setGallonsPerHour] = useState(6);
  const [clientFilter, setClientFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => { (async () => { const s = await storageGet("fbt:billing"); if (s) { setDieselPrice(s.dieselPrice ?? 6.25); setThreshold(s.threshold ?? 6.75); setGallonsPerHour(s.gallonsPerHour ?? 6); } })(); }, []);
  useEffect(() => { storageSet("fbt:billing", { dieselPrice, threshold, gallonsPerHour }); }, [dieselPrice, threshold, gallonsPerHour]);

  const filtered = logs.filter((l) => {
    if (clientFilter && !(l.job || "").toLowerCase().includes(clientFilter.toLowerCase())) return false;
    if (fromDate && l.date < fromDate) return false;
    if (toDate && l.date > toDate) return false;
    return true;
  });

  const subtotal = filtered.reduce((s, l) => s + Number(l.amount || 0), 0);
  const totalBillableHours = filtered.reduce((s, l) => s + Number(l.billableHours || 0), 0);
  const surchargeActive = Number(dieselPrice) > Number(threshold);
  const extraPerGal = Math.max(0, Number(dieselPrice) - Number(threshold));
  const surchargePerHourClean = extraPerGal * Number(gallonsPerHour);
  const fuelSurcharge = surchargeActive ? totalBillableHours * surchargePerHourClean : 0;
  const total = subtotal + fuelSurcharge;

  const exportCSV = () => {
    const rows = [["Date", "Truck", "Driver", "Job", "Hours", "Billable Hrs", "Rate", "Amount", "Notes"], ...filtered.map((l) => [l.date, l.truck, l.driver, l.job, l.hours, l.billableHours, l.rate, l.amount, l.notes || ""])];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `4brothers-billing-${todayISO()}.csv`; a.click();
    URL.revokeObjectURL(url);
    onToast("CSV EXPORTED");
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Fuel size={22} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>FUEL SURCHARGE ENGINE</h3>
          <span className="fbt-mono" style={{ marginLeft: "auto", padding: "4px 10px", background: surchargeActive ? "var(--safety)" : "var(--good)", color: "var(--cream)", fontSize: 11, letterSpacing: "0.1em" }}>{surchargeActive ? "● ACTIVE" : "○ BELOW THRESHOLD"}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Current Diesel $/gal</label><input className="fbt-input" type="number" step="0.01" value={dieselPrice} onChange={(e) => setDieselPrice(e.target.value)} /></div>
          <div><label className="fbt-label">Threshold $/gal</label><input className="fbt-input" type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} /></div>
          <div><label className="fbt-label">Gallons / Hour</label><input className="fbt-input" type="number" step="0.1" value={gallonsPerHour} onChange={(e) => setGallonsPerHour(e.target.value)} /></div>
          <div><label className="fbt-label">Extra $/gal Over</label><input className="fbt-input" value={extraPerGal.toFixed(3)} readOnly style={{ background: "#F5F5F4" }} /></div>
        </div>
        <div style={{ marginTop: 16, padding: 14, background: "var(--steel)", color: "var(--cream)", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
          ▸ FORMULA: ( DIESEL − THRESHOLD ) × GAL/HR × BILLABLE_HRS<br />
          ▸ PER HOUR SURCHARGE: {fmt$(surchargePerHourClean)} · TRIGGERS ABOVE {fmt$(threshold)}/GAL
        </div>
      </div>
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>INVOICE BUILDER</h3></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Client / Job Contains</label><input className="fbt-input" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} placeholder="e.g. MCI" /></div>
          <div><label className="fbt-label">From</label><input className="fbt-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
          <div><label className="fbt-label">To</label><input className="fbt-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 24, border: "2px solid var(--steel)" }}>
          <table className="fbt-table">
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>LABOR · {filtered.length} LOGS · {totalBillableHours.toFixed(2)} HRS</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt$(subtotal)}</td></tr>
              <tr><td style={{ fontWeight: 600, color: surchargeActive ? "var(--rust)" : "var(--concrete)" }}>FUEL SURCHARGE {surchargeActive ? `· ${fmt$(surchargePerHourClean)}/HR` : "(inactive)"}</td><td style={{ textAlign: "right", fontWeight: 700, color: surchargeActive ? "var(--rust)" : "var(--concrete)" }}>{fmt$(fuelSurcharge)}</td></tr>
              <tr style={{ background: "var(--hazard)" }}><td style={{ fontWeight: 700, fontSize: 16, fontFamily: "Archivo Black, sans-serif" }}>TOTAL DUE</td><td style={{ textAlign: "right", fontWeight: 700, fontSize: 16, fontFamily: "Archivo Black, sans-serif" }}>{fmt$(total)}</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 20 }}><button onClick={exportCSV} className="btn-primary"><Download size={16} /> EXPORT CSV</button></div>
      </div>
    </div>
  );
};

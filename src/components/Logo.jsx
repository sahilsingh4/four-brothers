import { Truck } from "lucide-react";

// Brand mark: hazard-color tile + truck glyph + wordmark.
// `size` accepts "sm" | "md" | "lg" — everything scales linearly off the base.
export const Logo = ({ size = "md" }) => {
  const scale = size === "lg" ? 1.4 : size === "sm" ? 0.75 : 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 * scale }}>
      <div style={{ width: 44 * scale, height: 44 * scale, background: "var(--hazard)", border: `${3 * scale}px solid var(--steel)`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-3deg)" }}>
        <Truck size={22 * scale} strokeWidth={2.5} />
      </div>
      <div style={{ lineHeight: 1 }}>
        <div className="fbt-display" style={{ fontSize: 18 * scale, letterSpacing: "-0.03em" }}>4 BROTHERS</div>
        <div className="fbt-mono" style={{ fontSize: 10 * scale, color: "var(--concrete)", marginTop: 2 }}>TRUCKING · LLC · EST. BAY POINT CA</div>
      </div>
    </div>
  );
};

import { useState, useEffect } from "react";
import {
  ArrowRight, CheckCircle2, ClipboardList, FileDown, Fuel,
  Lock, Mountain, Phone, ShieldCheck, Truck, Wrench,
} from "lucide-react";
import { fetchPublicProjects, fetchPublicTestimonials } from "../db";

export const PublicSite = ({ onQuoteSubmit, onStaffLogin }) => {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", service: "hauling", pickup: "", dropoff: "", material: "", quantity: "", needDate: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // v21 Session S: Public portfolio
  const [publicProjects, setPublicProjects] = useState([]);
  // v22 Session T: Public testimonials
  const [publicTestimonials, setPublicTestimonials] = useState([]);
  useEffect(() => {
    fetchPublicProjects().then(setPublicProjects).catch(() => {});
    fetchPublicTestimonials().then(setPublicTestimonials).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      await onQuoteSubmit({ ...form, submittedAt: new Date().toISOString(), status: "new" });
      setSubmitted(true);
      setForm({ name: "", company: "", email: "", phone: "", service: "hauling", pickup: "", dropoff: "", material: "", quantity: "", needDate: "", notes: "" });
      setTimeout(() => setSubmitted(false), 6000);
    } catch (e) {
      console.error("Quote submit failed:", e);
      setError("Couldn't send your quote. Please try again or call us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  // Stock dump-truck photos from Unsplash (free-use). Easy to swap later with your own.
  const HERO_IMG = "https://images.unsplash.com/photo-1586864387634-2f33030dab41?auto=format&fit=crop&w=1600&q=80"; // dump truck hauling
  const FLEET_IMG_1 = "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?auto=format&fit=crop&w=800&q=80";
  const FLEET_IMG_2 = "https://images.unsplash.com/photo-1558818498-28c3b9d9fa56?auto=format&fit=crop&w=800&q=80";
  const FLEET_IMG_3 = "https://images.unsplash.com/photo-1615715874851-fac0f3e76064?auto=format&fit=crop&w=800&q=80";
  const ABOUT_IMG = "https://images.unsplash.com/photo-1560413538-d7c91c7712b4?auto=format&fit=crop&w=1200&q=80";

  // Scroll-to helper for internal anchor links
  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ background: "#FFF", color: "#1C1917", fontFamily: "'Inter', -apple-system, Arial, sans-serif" }}>
      {/* ===== TOP NAV ===== */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "#FFF", borderBottom: "1px solid #E7E5E4", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <a href="#top" onClick={scrollTo("top")} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", width: 48, height: 48, background: "#1C1917", color: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontFamily: "Arial, sans-serif", fontSize: 20, letterSpacing: "-0.06em", borderRadius: 2, boxShadow: "0 2px 4px rgba(28,25,23,0.15)" }}>
              4B
              <div style={{ position: "absolute", bottom: -4, left: 6, right: 6, height: 3, background: "#F59E0B" }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#1C1917", lineHeight: 1, letterSpacing: "-0.01em" }}>4 BROTHERS</div>
              <div style={{ fontSize: 10, color: "#78716C", marginTop: 3, fontWeight: 600 }}>TRUCKING, LLC</div>
            </div>
          </a>
          <div style={{ marginLeft: "auto", display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
            <a href="#services" onClick={scrollTo("services")} style={navLinkStyle}>Services</a>
            <a href="#fleet"    onClick={scrollTo("fleet")}    style={navLinkStyle}>Fleet</a>
            <a href="#about"    onClick={scrollTo("about")}    style={navLinkStyle}>About</a>
            <a href="#contact"  onClick={scrollTo("contact")}  style={navLinkStyle}>Contact</a>
            <a href="#quote"    onClick={scrollTo("quote")}    style={{ padding: "10px 20px", background: "#F59E0B", color: "#1C1917", fontWeight: 700, fontSize: 13, textDecoration: "none", borderRadius: 2 }}>GET A QUOTE</a>
            <button onClick={onStaffLogin} style={{ background: "transparent", border: "none", color: "#78716C", fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "6px 2px", display: "flex", alignItems: "center", gap: 4 }}>
              <Lock size={11} /> Staff
            </button>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section id="top" style={{ position: "relative", background: "#1C1917", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(28,25,23,0.55), rgba(28,25,23,0.75)), url(${HERO_IMG})`, backgroundSize: "cover", backgroundPosition: "center", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "120px 32px 140px", color: "#FFF" }}>
          <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, marginBottom: 20 }}>▸ SAN FRANCISCO BAY AREA · CENTRAL VALLEY</div>
          <h1 style={{ fontSize: "clamp(44px, 7vw, 84px)", fontWeight: 900, lineHeight: 1.02, margin: "0 0 24px", letterSpacing: "-0.02em", maxWidth: 900 }}>
            Construction trucking you can count on.
          </h1>
          <p style={{ fontSize: 19, color: "#D6D3D1", maxWidth: 620, lineHeight: 1.55, margin: "0 0 40px" }}>
            Aggregate supply, site support, and on-demand hauling with a modern fleet and a professional crew. Serving the Bay Area since 2022.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a href="#quote" onClick={scrollTo("quote")} style={{ padding: "16px 32px", background: "#F59E0B", color: "#1C1917", fontWeight: 800, fontSize: 14, textDecoration: "none", borderRadius: 2, display: "inline-flex", alignItems: "center", gap: 8 }}>
              REQUEST A QUOTE <ArrowRight size={16} />
            </a>
            <a href="tel:+16268145541" style={{ padding: "16px 32px", background: "transparent", color: "#FFF", border: "2px solid #FFF", fontWeight: 700, fontSize: 14, textDecoration: "none", borderRadius: 2, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Phone size={14} /> CALL DISPATCH
            </a>
            {/* v22 Session V: Capability statement download — for B2B/procurement visitors */}
            <a
              href="/capability-statement.pdf"
              download="4-Brothers-Trucking-Capability-Statement.pdf"
              style={{ padding: "16px 24px", background: "transparent", color: "#D6D3D1", border: "1px solid #57534E", fontWeight: 600, fontSize: 13, textDecoration: "none", borderRadius: 2, display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <FileDown size={13} /> CAPABILITY STATEMENT
            </a>
          </div>
        </div>
      </section>

      {/* ===== STATS STRIP ===== */}
      <section style={{ background: "#FAFAF9", borderBottom: "1px solid #E7E5E4" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32 }}>
          {[
            { n: "2022", l: "FOUNDED" },
            { n: "DBE · MBE", l: "CERTIFIED" },
            { n: "USDOT", l: "FULLY REGISTERED" },
            { n: "BAY AREA", l: "BASED IN BAY POINT, CA" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#1C1917", letterSpacing: "-0.02em" }}>{s.n}</div>
              <div style={{ fontSize: 11, color: "#78716C", marginTop: 4, fontWeight: 600 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SERVICES ===== */}
      <section id="services" style={{ background: "#FFF", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, marginBottom: 16 }}>▸ WHAT WE DO</div>
          <h2 style={{ fontSize: "clamp(32px, 4.5vw, 52px)", fontWeight: 900, margin: "0 0 20px", letterSpacing: "-0.02em", maxWidth: 900 }}>
            Full-service construction trucking.
          </h2>
          <p style={{ fontSize: 17, color: "#57534E", maxWidth: 720, lineHeight: 1.6, margin: "0 0 60px" }}>
            From aggregate delivery to public works subcontracting, we handle the hauling so your crews stay productive.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28 }}>
            {[
              { ico: <Truck size={28} />, t: "Aggregate Supply", d: "Basalt, rock, base material, sand and gravel — sourced, loaded, and delivered on schedule. Prime contractor capable on public agency bids." },
              { ico: <Wrench size={28} />, t: "Site Support", d: "On-call hauling for construction crews. Super trucks and end dumps, 8-hour minimums, demand-driven dispatch, no-show backup." },
              { ico: <ClipboardList size={28} />, t: "Subcontract Hauling", d: "Prime contractor, public works, or private subcontract. Clean paperwork, full DOT and EPA compliance, on-time delivery." },
              { ico: <Mountain size={28} />, t: "Dirt Import / Export", d: "Soil hauling, clean fill, demolition debris. We partner with Class 1, 2 & 3 landfills for proper disposal." },
              { ico: <Fuel size={28} />, t: "Fuel Surcharge Transparent", d: "Rates tied to the DOE/EIA California diesel index. You get a formal written fuel surcharge clause — no surprises." },
              { ico: <ShieldCheck size={28} />, t: "DBE / MBE / SB-PW Certified", d: "Minority-owned, Disadvantaged Business Enterprise, and Small Business Public Works certified. Helps you hit participation goals." },
            ].map((s, i) => (
              <div key={i} style={{ padding: 32, background: "#FAFAF9", border: "1px solid #E7E5E4", borderRadius: 2, transition: "transform 0.15s, box-shadow 0.15s" }}>
                <div style={{ color: "#F59E0B", marginBottom: 20 }}>{s.ico}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", color: "#1C1917" }}>{s.t}</h3>
                <p style={{ fontSize: 14, color: "#57534E", lineHeight: 1.6, margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FLEET ===== */}
      <section id="fleet" style={{ background: "#1C1917", color: "#FFF", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, marginBottom: 16 }}>▸ OUR FLEET</div>
          <h2 style={{ fontSize: "clamp(32px, 4.5vw, 52px)", fontWeight: 900, margin: "0 0 20px", letterSpacing: "-0.02em", maxWidth: 900 }}>
            Modern trucks. Professional drivers.
          </h2>
          <p style={{ fontSize: 17, color: "#D6D3D1", maxWidth: 720, lineHeight: 1.6, margin: "0 0 60px" }}>
            Late-model equipment maintained to the highest standards. Every driver is licensed, insured, and trained for safety-first hauling.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {[
              { t: "Super Dumps & Super Tens", d: "High-capacity rigs for aggregate and dirt hauling. Maximum payload per trip.", img: FLEET_IMG_1 },
              { t: "Transfer / End Dumps", d: "Flexible configurations for job site delivery in tight access areas.", img: FLEET_IMG_2 },
              { t: "10-Wheelers", d: "Nimble trucks for residential projects, small loads, and spec material delivery.", img: FLEET_IMG_3 },
            ].map((item, i) => (
              <div key={i} style={{ background: "#292524", border: "1px solid #44403C", overflow: "hidden" }}>
                <div style={{ height: 200, backgroundImage: `url(${item.img})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                <div style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: "#FFF" }}>{item.t}</h3>
                  <p style={{ fontSize: 14, color: "#A8A29E", lineHeight: 1.5, margin: 0 }}>{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section id="about" style={{ background: "#FFF", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 60, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, marginBottom: 16 }}>▸ ABOUT US</div>
            <h2 style={{ fontSize: "clamp(32px, 4.5vw, 46px)", fontWeight: 900, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
              Built by family. Run like a team.
            </h2>
            <p style={{ fontSize: 16, color: "#57534E", lineHeight: 1.7, margin: "0 0 16px" }}>
              4 Brothers Trucking, LLC is a family-run dump truck company based in Bay Point, California. We specialize in construction material hauling for public works, private contractors, and agency-led infrastructure projects across the Bay Area and Central Valley.
            </p>
            <p style={{ fontSize: 16, color: "#57534E", lineHeight: 1.7, margin: "0 0 24px" }}>
              What sets us apart: DBE, MBE, and SB-PW certified. Clean paperwork. On-time delivery. Fuel surcharge clauses spelled out in plain English. And a team that actually answers the phone when you call dispatch.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 32 }}>
              <div>
                <div style={{ fontSize: 11, color: "#78716C", fontWeight: 700, marginBottom: 4 }}>CERTIFICATIONS</div>
                <div style={{ fontSize: 14, color: "#1C1917", fontWeight: 600 }}>DBE · MBE · SB-PW</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#78716C", fontWeight: 700, marginBottom: 4 }}>AUTHORITY</div>
                <div style={{ fontSize: 14, color: "#1C1917", fontWeight: 600 }}>USDOT · CA MCP</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#78716C", fontWeight: 700, marginBottom: 4 }}>SERVICE AREA</div>
                <div style={{ fontSize: 14, color: "#1C1917", fontWeight: 600 }}>Bay Area · Central Valley</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#78716C", fontWeight: 700, marginBottom: 4 }}>INSURANCE</div>
                <div style={{ fontSize: 14, color: "#1C1917", fontWeight: 600 }}>Fully insured & bonded</div>
              </div>
            </div>
          </div>
          <div>
            <img src={ABOUT_IMG} alt="Construction site dump truck" style={{ width: "100%", height: 450, objectFit: "cover", borderRadius: 2 }} />
          </div>
        </div>
      </section>

      {/* ===== PORTFOLIO (v21 Session S) ===== */}
      {publicProjects.length > 0 && (
        <section id="portfolio" style={{ background: "#1C1917", color: "#FFF", padding: "100px 32px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 50 }}>
              <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, marginBottom: 16 }}>▸ SELECTED PROJECTS</div>
              <h2 style={{ fontSize: "clamp(32px, 4.5vw, 46px)", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-0.02em", color: "#FFF" }}>
                Work we've done.
              </h2>
              <p style={{ fontSize: 16, color: "#A8A29E", lineHeight: 1.6, margin: 0, maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
                A partial list of agencies, prime contractors, and public works projects we've supported with certified material hauling.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 2, background: "#44403C" }}>
              {publicProjects.map((proj) => {
                const customerName = proj.publicCustomer || "";  // opt-in uses publicCustomer, fall back to blank
                return (
                  <div key={proj.id} style={{ background: "#292524", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 10, minHeight: 140 }}>
                    {proj.completionYear && (
                      <div style={{ fontSize: 10, color: "#78716C", fontWeight: 700 }}>
                        ▸ {proj.completionYear}
                      </div>
                    )}
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#FFF", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
                      {proj.name}
                    </div>
                    {customerName && (
                      <div style={{ fontSize: 13, color: "#F59E0B", fontWeight: 600 }}>
                        {customerName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: "center", marginTop: 40 }}>
              <p style={{ fontSize: 13, color: "#78716C", margin: 0 }}>
                Looking for a reference? <a href="#quote" style={{ color: "#F59E0B", fontWeight: 700 }}>Reach out</a> and we'll connect you with a past customer.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ===== TESTIMONIALS (v22 Session T) ===== */}
      {publicTestimonials.length > 0 && (
        <section id="testimonials" style={{ background: "#FAFAF9", padding: "100px 32px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 50 }}>
              <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, marginBottom: 16 }}>▸ WHAT PARTNERS SAY</div>
              <h2 style={{ fontSize: "clamp(32px, 4.5vw, 46px)", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
                In their words.
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${publicTestimonials.length === 1 ? "400px" : "320px"}, 1fr))`, gap: 24 }}>
              {publicTestimonials.map((t) => (
                <div key={t.id} style={{ background: "#FFF", border: "2px solid #1C1917", padding: 32, position: "relative", display: "flex", flexDirection: "column", gap: 16, boxShadow: "6px 6px 0 #F59E0B" }}>
                  {/* Big decorative quote mark */}
                  <div aria-hidden="true" style={{ position: "absolute", top: 12, right: 20, fontSize: 96, lineHeight: 1, color: "#F59E0B", fontFamily: "Georgia, serif", fontWeight: 700, opacity: 0.25 }}>
                    "
                  </div>

                  {/* Star rating (only if set) */}
                  {t.rating > 0 && (
                    <div style={{ display: "flex", gap: 2 }} aria-label={`${t.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} style={{ fontSize: 16, color: n <= t.rating ? "#F59E0B" : "#E7E5E4" }}>★</span>
                      ))}
                    </div>
                  )}

                  {/* Quote text */}
                  <blockquote style={{ fontSize: 16, lineHeight: 1.6, color: "#1C1917", margin: 0, fontWeight: 500, flex: 1 }}>
                    {t.quoteText}
                  </blockquote>

                  {/* Attribution */}
                  <div style={{ borderTop: "1px solid #E7E5E4", paddingTop: 14, marginTop: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1C1917" }}>
                      {t.authorName}
                    </div>
                    {(t.authorRole || t.authorCompany) && (
                      <div style={{ fontSize: 12, color: "#78716C", marginTop: 2, fontWeight: 500 }}>
                        {[t.authorRole, t.authorCompany].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== QUOTE FORM ===== */}
      <section id="quote" style={{ background: "#FAFAF9", padding: "100px 32px", borderTop: "1px solid #E7E5E4", borderBottom: "1px solid #E7E5E4" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, marginBottom: 16 }}>▸ REQUEST A QUOTE</div>
            <h2 style={{ fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
              Tell us about your job.
            </h2>
            <p style={{ fontSize: 17, color: "#57534E", lineHeight: 1.6, margin: 0 }}>
              Fill out the form and we'll get back to you within 24 hours. Need it sooner? <a href="tel:+16268145541" style={{ color: "#F59E0B", fontWeight: 700 }}>Call dispatch.</a>
            </p>
          </div>
          {submitted ? (
            <div style={{ padding: "40px 32px", background: "#F0FDF4", border: "2px solid #16A34A", borderRadius: 2, textAlign: "center" }}>
              <CheckCircle2 size={44} style={{ color: "#16A34A", marginBottom: 16 }} />
              <h3 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", color: "#1C1917" }}>Quote request received.</h3>
              <p style={{ fontSize: 15, color: "#57534E", margin: 0 }}>We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <div style={{ background: "#FFF", padding: 40, border: "1px solid #E7E5E4", borderRadius: 2 }}>
              {error && (
                <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1.5px solid #DC2626", color: "#991B1B", marginBottom: 20, fontSize: 14, borderRadius: 2 }}>
                  ✗ {error}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {publicField("Name *", form.name, (v) => setForm({ ...form, name: v }), "John Smith")}
                {publicField("Company", form.company, (v) => setForm({ ...form, company: v }), "ACME Construction")}
                {publicField("Email *", form.email, (v) => setForm({ ...form, email: v }), "you@example.com", "email")}
                {publicField("Phone", form.phone, (v) => setForm({ ...form, phone: v }), "(555) 555-1234", "tel")}
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={publicLabelStyle}>Service needed</label>
                <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} style={publicInputStyle}>
                  <option value="hauling">Hauling / Site Support</option>
                  <option value="aggregate">Aggregate Supply</option>
                  <option value="dirt">Dirt Import / Export</option>
                  <option value="subcontract">Subcontract Hauling</option>
                  <option value="other">Other (specify below)</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                {publicField("Pickup location", form.pickup, (v) => setForm({ ...form, pickup: v }), "Quarry or address")}
                {publicField("Drop-off location", form.dropoff, (v) => setForm({ ...form, dropoff: v }), "Job site address")}
                {publicField("Material", form.material, (v) => setForm({ ...form, material: v }), "e.g. Basalt, Base Rock")}
                {publicField("Quantity", form.quantity, (v) => setForm({ ...form, quantity: v }), "e.g. 500 tons or 20 loads")}
                {publicField("Needed by", form.needDate, (v) => setForm({ ...form, needDate: v }), "", "date")}
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={publicLabelStyle}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything else we should know — special access, scheduling constraints, etc." style={{ ...publicInputStyle, minHeight: 100, resize: "vertical" }} />
              </div>
              <button onClick={handleSubmit} disabled={submitting} style={{ marginTop: 28, width: "100%", padding: "18px 32px", background: submitting ? "#A8A29E" : "#F59E0B", color: "#1C1917", fontWeight: 800, fontSize: 15, border: "none", cursor: submitting ? "wait" : "pointer", borderRadius: 2 }}>
                {submitting ? "SENDING..." : "SUBMIT QUOTE REQUEST"} <ArrowRight size={16} style={{ marginLeft: 8, verticalAlign: "middle" }} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ===== CONTACT ===== */}
      <section id="contact" style={{ background: "#FFF", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 40 }}>
          <div>
            <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, marginBottom: 16 }}>▸ GET IN TOUCH</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, margin: "0 0 20px", letterSpacing: "-0.02em" }}>Contact us.</h2>
            <p style={{ fontSize: 16, color: "#57534E", lineHeight: 1.6, margin: 0 }}>
              Dispatch is available during business hours. For urgent bids or after-hours work, leave a message and we'll get back to you fast.
            </p>
          </div>
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#78716C", fontWeight: 700, marginBottom: 8 }}>PHONE</div>
              <a href="tel:+16268145541" style={{ fontSize: 22, fontWeight: 800, color: "#1C1917", textDecoration: "none" }}>(626) 814-5541</a>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#78716C", fontWeight: 700, marginBottom: 8 }}>EMAIL</div>
              <a href="mailto:office@4brotherstruck.com" style={{ fontSize: 16, fontWeight: 600, color: "#1C1917", textDecoration: "none" }}>office@4brotherstruck.com</a>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#78716C", fontWeight: 700, marginBottom: 8 }}>ADDRESS</div>
              <div style={{ fontSize: 16, color: "#1C1917", fontWeight: 600, lineHeight: 1.5 }}>Bay Point, CA 94565</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#78716C", fontWeight: 700, marginBottom: 12 }}>HOURS</div>
            <div style={{ fontSize: 15, color: "#1C1917", lineHeight: 1.8 }}>
              <div><strong>Mon–Fri</strong> &nbsp;&nbsp; 6:00 AM – 6:00 PM</div>
              <div><strong>Sat</strong> &nbsp;&nbsp; By appointment</div>
              <div><strong>Sun</strong> &nbsp;&nbsp; Closed</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ background: "#1C1917", color: "#A8A29E", padding: "40px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: 36, height: 36, background: "#F59E0B", color: "#1C1917", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, letterSpacing: "-0.06em", fontFamily: "Arial, sans-serif", borderRadius: 2 }}>
              4B
            </div>
            <div style={{ fontSize: 12, color: "#D6D3D1" }}>© 2026 · 4 BROTHERS TRUCKING, LLC</div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={onStaffLogin} style={{ background: "transparent", border: "none", color: "#78716C", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Staff Login</button>
            <div style={{ fontSize: 11, color: "#78716C" }}>USDOT · DBE · MBE · SB-PW CERTIFIED</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Styles reused across PublicSite form
const navLinkStyle = { fontSize: 14, color: "#57534E", textDecoration: "none", fontWeight: 500, padding: "6px 2px" };
const publicLabelStyle = { display: "block", fontSize: 11, color: "#78716C", fontWeight: 700, marginBottom: 6 };
const publicInputStyle = { width: "100%", padding: "11px 14px", fontSize: 15, border: "1.5px solid #D6D3D1", borderRadius: 2, fontFamily: "inherit", color: "#1C1917", background: "#FFF" };
const publicField = (label, value, onChange, placeholder = "", type = "text") => (
  <div>
    <label style={publicLabelStyle}>{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={publicInputStyle} />
  </div>
);

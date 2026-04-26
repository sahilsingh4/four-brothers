import { useState } from "react";
import { AlertCircle, Camera, CheckCircle2, Clock, Plus, Trash2, Upload, X } from "lucide-react";
import { Lightbox } from "./Lightbox";
import { Logo } from "./Logo";
import { PreTripModal } from "./PreTripModal";
import { IncidentModal } from "./IncidentModal";
import { InstallAppButton } from "./InstallAppButton";
import { compressImage, fmtDate } from "../utils";
import { extractFromImage } from "../utils/ocr";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useFormDraft } from "../hooks/useFormDraft";

export const DriverUploadPage = ({ dispatch, onSubmitTruck, onBack, availableDrivers = [], assignment = null, assignmentContact = null, allDispatches = [], allFreightBills = [] }) => {
  // For driver-kind assignments, driver name is locked in (but editable via override)
  const lockedDriverName = assignment?.kind === "driver" ? assignment.name : null;
  // Prefill truck number — prefer the truck assigned on the order (fleet-synced at assignment time),
  // fall back to the contact's default truck number
  const prefillTruck = assignment?.kind === "driver"
    ? (assignment?.truckNumber || assignmentContact?.defaultTruckNumber || "")
    : "";

  // Auto-save the driver's in-progress freight-bill form to localStorage so a
  // browser refresh, accidental close, or expiring auth on cellular doesn't
  // wipe out a form they've been filling for several minutes. Key by dispatch
  // code + assignment ID so two drivers on the same phone (rare but possible)
  // don't clobber each other.
  const draftKey = `driver-upload:${dispatch?.code || "unknown"}:${assignment?.aid || "main"}`;
  const initialForm = {
    freightBillNumber: "",
    driverName: lockedDriverName || "",
    driverId: assignment?.kind === "driver" ? assignment.contactId : null,
    truckNumber: prefillTruck,
    material: dispatch?.material || "",
    tonnage: "", loadCount: "1",
    pickupTime: "", dropoffTime: "", notes: "",
    signedOutStatus: "", signedOutAt: "",
    extras: [],
  };
  const [form, setForm, formWasRestored, clearFormDraft] = useFormDraft(draftKey, initialForm);

  // Track which pre-filled fields the driver has unlocked for override
  const [unlockedFields, setUnlockedFields] = useState({});
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState({ current: 0, total: 0 });  // v18 Session E: progress for batch photo compression
  // Reactive online/offline state — drives the offline banner and the
  // "OFFLINE — QUEUING" submit-progress label. handleTruckSubmit also queues
  // submissions independently if navigator.onLine flips after we read it here.
  const isOnline = useNetworkStatus();
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(""); // stage text
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");  // v18 Session E: inline error so driver keeps their form on retry
  const [lightbox, setLightbox] = useState(null);
  const [lastFB, setLastFB] = useState("");
  // v20 Session P: spam defenses
  // Honeypot — bots that scrape forms typically fill every input. Hidden from humans via CSS.
  const [website, setWebsite] = useState("");  // must stay empty
  // Captcha — simple math challenge shown after suspicious activity
  const [captchaChallenge, setCaptchaChallenge] = useState(null);  // { a, b, answer } | null
  const [captchaInput, setCaptchaInput] = useState("");
  // Rate tracker: localStorage keyed by dispatch code
  const RATE_KEY = `fbt-submits:${dispatch?.code || "unknown"}`;
  const MAX_PER_HOUR = 25;  // generous limit — a real full day's FBs is usually <20
  const CAPTCHA_THRESHOLD = 3;  // show captcha after this many submissions in the last 30 min

  const getRecentSubmissions = () => {
    try {
      const raw = localStorage.getItem(RATE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      const cutoff = Date.now() - 60 * 60 * 1000;  // 1 hour window
      return (Array.isArray(arr) ? arr : []).filter((t) => t > cutoff);
    } catch { return []; }
  };

  const recordSubmission = () => {
    try {
      const recent = getRecentSubmissions();
      recent.push(Date.now());
      localStorage.setItem(RATE_KEY, JSON.stringify(recent));
    } catch { /* ignore storage errors */ }
  };

  const shouldShowCaptcha = () => {
    const cutoff = Date.now() - 30 * 60 * 1000;  // 30-min window
    return getRecentSubmissions().filter((t) => t > cutoff).length >= CAPTCHA_THRESHOLD;
  };

  const newCaptcha = () => {
    const a = Math.floor(Math.random() * 8) + 2;  // 2-9
    const b = Math.floor(Math.random() * 8) + 2;
    setCaptchaChallenge({ a, b, answer: a + b });
    setCaptchaInput("");
  };
  const [submissionSummary, setSubmissionSummary] = useState(null); // full details of what was submitted

  // DOT pre-trip inspection — gated per (dispatch, driver, day) via localStorage
  // so a driver doesn't get prompted again on their 2nd/3rd FB the same day.
  // The full inspection record is attached to the FIRST FB submission of the
  // day so the admin sees it on the dispatch.
  const todayKey = new Date().toISOString().slice(0, 10);
  const PRETRIP_KEY = `pretrip:${dispatch?.code || "unknown"}:${assignment?.aid || "main"}:${todayKey}`;
  const [pretripDone, setPretripDone] = useState(() => {
    try { return !!localStorage.getItem(PRETRIP_KEY); } catch { return false; }
  });
  const [pretripPending, setPretripPending] = useState(null); // inspection record awaiting next FB submit
  const [showPretrip, setShowPretrip] = useState(false);
  // Post-trip — same checklist, end-of-shift. Driver opens AFTER they're done
  // for the day. Stamped on the next FB submission like pre-trip; if there are
  // no more FBs, we just keep it cached locally for the admin to retrieve via
  // FB list (not implemented in this PR — future work).
  const POSTTRIP_KEY = `posttrip:${dispatch?.code || "unknown"}:${assignment?.aid || "main"}:${todayKey}`;
  const [posttripDone, setPosttripDone] = useState(() => {
    try { return !!localStorage.getItem(POSTTRIP_KEY); } catch { return false; }
  });
  const [posttripPending, setPosttripPending] = useState(null);
  const [showPosttrip, setShowPosttrip] = useState(false);
  // Incident — captured ad-hoc whenever something happens; attached to next FB
  // submit so the admin sees it in Review with full context.
  const [showIncident, setShowIncident] = useState(false);
  const [incidentPending, setIncidentPending] = useState(null);
  const onIncidentSubmit = (incident) => {
    setIncidentPending(incident);
    setShowIncident(false);
  };
  const onPretripSubmit = (inspection) => {
    try { localStorage.setItem(PRETRIP_KEY, JSON.stringify(inspection)); } catch { /* noop */ }
    setPretripDone(true);
    setPretripPending(inspection);
    setShowPretrip(false);
  };
  const onPosttripSubmit = (inspection) => {
    try { localStorage.setItem(POSTTRIP_KEY, JSON.stringify(inspection)); } catch { /* noop */ }
    setPosttripDone(true);
    setPosttripPending(inspection);
    setShowPosttrip(false);
  };

  const handlePhotos = async (files) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setUploading(true);
    setPhotoProgress({ current: 0, total: list.length });
    // Process each file individually and track per-photo status. Failed photos
    // stay in state with status:"failed" so the driver can retry just that one
    // instead of re-uploading the whole batch on cellular.
    let next = [...photos];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      setPhotoProgress({ current: i + 1, total: list.length });
      const id = Date.now() + Math.random();
      try {
        const dataUrl = await compressImage(f);
        next = [...next, { id, dataUrl, name: f.name, status: "done", category: "scale_ticket" }];
      } catch (e) {
        console.warn("Photo compress failed:", f.name, e);
        // Stash the File object so retryPhoto() can re-attempt without
        // asking the driver to pick the file again.
        next = [...next, { id, name: f.name, status: "failed", error: e?.message || "Compression failed", file: f }];
      }
      setPhotos(next);
    }
    setPhotoProgress({ current: 0, total: 0 });
    setUploading(false);
  };

  const retryPhoto = async (id) => {
    const target = photos.find((p) => p.id === id);
    if (!target?.file) return;
    setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, status: "compressing", error: undefined } : p));
    try {
      const dataUrl = await compressImage(target.file);
      setPhotos((prev) => prev.map((p) => p.id === id ? { id, dataUrl, name: target.name, status: "done", category: target.category || "scale_ticket" } : p));
    } catch (e) {
      console.warn("Photo retry failed:", target.name, e);
      setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, status: "failed", error: e?.message || "Compression failed" } : p));
    }
  };

  const removePhoto = (id) => setPhotos(photos.filter((p) => p.id !== id));

  const setPhotoCategory = (id, category) => {
    setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, category } : p));
  };

  // Run OCR on a photo (Tesseract.js, fully client-side). The OCR module
  // returns raw text + best-effort fbNumber / tonnage from regex parsing.
  // We display the suggestions inline; driver taps Apply to fill the form.
  const runOcrOn = async (id) => {
    const target = photos.find((p) => p.id === id);
    if (!target || target.status !== "done") return;
    setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, ocr: { status: "running" } } : p));
    try {
      const { text, fields } = await extractFromImage(target.dataUrl, { kind: target.category });
      setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, ocr: { status: "done", text, fields } } : p));
    } catch (e) {
      console.warn("OCR failed:", e);
      setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, ocr: { status: "error", error: e?.message || "OCR failed" } } : p));
    }
  };

  const submit = async () => {
    if (!form.freightBillNumber || !form.driverName || !form.truckNumber) {
      setSubmitError("Freight bill #, driver name, and truck # are required.");
      return;
    }
    // No internet? Don't block — handleTruckSubmit will queue the submission to
    // localStorage and the App-level flusher will replay it once we're back online.
    // We just clear any prior error so the user gets a clean run.
    if (!isOnline) {
      setSubmitError("");
    }
    // v20 Session P: spam defenses
    // 1. Honeypot check — bots typically fill every field including hidden ones.
    if (website) {
      // Silent fail (don't tell the bot what tripped the detector)
      console.warn("Honeypot triggered — submission blocked");
      setSubmitError("Submission blocked. Please reload the page and try again.");
      return;
    }
    // 2. Rate limit check — per-device, per-dispatch
    const recent = getRecentSubmissions();
    if (recent.length >= MAX_PER_HOUR) {
      setSubmitError(`Too many submissions in the last hour (${recent.length} / ${MAX_PER_HOUR}). Contact dispatch if you need to log more trucks.`);
      return;
    }
    // 3. Captcha check — if threshold hit, user must answer before submit
    if (shouldShowCaptcha()) {
      if (!captchaChallenge) {
        newCaptcha();
        setSubmitError("Quick verification required — please solve the math problem below.");
        return;
      }
      if (parseInt(captchaInput, 10) !== captchaChallenge.answer) {
        setSubmitError("Verification answer is wrong. Try again.");
        newCaptcha();  // rotate challenge
        return;
      }
      // Passed — clear challenge
      setCaptchaChallenge(null);
      setCaptchaInput("");
    }

    // Block submit if any photos are still failed — force the driver to either
    // retry them or remove them rather than silently dropping them.
    const failedCount = photos.filter((p) => p.status === "failed").length;
    if (failedCount > 0) {
      setSubmitError(`${failedCount} photo${failedCount !== 1 ? "s" : ""} failed to compress. Tap RETRY on each, or remove them, before submitting.`);
      return;
    }

    setSubmitError("");
    setSubmitting(true);
    try {
      setSubmitProgress("COMPRESSING PHOTOS…");
      await new Promise((r) => setTimeout(r, 100)); // UI tick

      setSubmitProgress(isOnline ? "UPLOADING TO DISPATCH…" : "OFFLINE — QUEUING FOR LATER…");
      const cleanExtras = (form.extras || []).filter((x) => Number(x.amount) > 0);
      const submittedAt = new Date().toISOString();
      // Only send photos that successfully compressed. status === "done" or
      // legacy photos without a status field (pre-B2) are both included.
      const photosToSend = photos
        .filter((p) => !p.status || p.status === "done")
        .map((p) => ({ id: p.id, dataUrl: p.dataUrl, name: p.name, category: p.category || "scale_ticket" }));
      const result = await onSubmitTruck({
        ...form,
        extras: cleanExtras,
        id: "temp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        dispatchId: dispatch.id,
        // Critical: stamp assignmentId so payroll can attribute this FB to the
        // correct driver/sub roster slot. Without this, a dispatch with
        // multiple assignments collapses every FB into a single bucket and
        // payroll can't tell whose load it was. Falls back to null when the
        // QR link didn't include /a/<aid> (legacy / generic submit code).
        assignmentId: assignment?.aid || null,
        photos: photosToSend,
        submittedAt,
        // Attach the pre-trip inspection only on the FIRST FB submission of
        // the day. Subsequent FBs the same shift don't carry it again.
        pretripInspection: pretripPending || undefined,
        posttripInspection: posttripPending || undefined,
        incidentReport: incidentPending || undefined,
      });
      if (pretripPending) setPretripPending(null);
      if (posttripPending) setPosttripPending(null);
      if (incidentPending) setIncidentPending(null);
      const wasQueued = result?.status === "queued";

      setSubmitProgress(wasQueued ? "✓ QUEUED" : "✓ SENT");
      await new Promise((r) => setTimeout(r, 400));

      // Save detailed submission summary for confirmation screen
      setSubmissionSummary({
        fbNumber: form.freightBillNumber,
        driverName: form.driverName,
        truckNumber: form.truckNumber,
        material: form.material,
        tonnage: form.tonnage,
        loadCount: form.loadCount,
        pickupTime: form.pickupTime,
        dropoffTime: form.dropoffTime,
        signedOutStatus: form.signedOutStatus,
        signedOutAt: form.signedOutAt,
        photoCount: photosToSend.length,
        photos: photosToSend.slice(0, 8),  // v18 Session E: keep thumbnails for confirmation screen
        extras: cleanExtras,
        extrasTotal: cleanExtras.reduce((s, x) => s + (Number(x.amount) || 0), 0),
        submittedAt,
        queued: wasQueued,
      });
      setLastFB(form.freightBillNumber);
      setSubmitted(true);
      clearFormDraft();
      // v20 Session P: record this submission in rate-limit tracker
      recordSubmission();
    } catch (e) {
      console.error(e);
      // v18 Session E: show inline retry-friendly error instead of blocking alert that destroys the form
      const msg = e?.message || String(e);
      setSubmitError(
        `Upload failed: ${msg}\n\nYour form is saved. Check your connection and hit SUBMIT to retry.`
      );
    } finally {
      setSubmitting(false);
      setSubmitProgress("");
    }
  };

  if (!dispatch) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", maxWidth: 400 }}>
          <AlertCircle size={48} style={{ color: "var(--safety)", marginBottom: 16 }} />
          <h2 className="fbt-display" style={{ fontSize: 24, margin: "0 0 12px" }}>LINK NOT FOUND</h2>
          <p style={{ color: "var(--concrete)", margin: "0 0 20px" }}>This upload link is invalid or has been removed. Check with dispatch for a new link.</p>
          <button className="btn-ghost" onClick={onBack}>← BACK</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const wasQueued = !!submissionSummary?.queued;
    const accentColor = wasQueued ? "var(--hazard-deep)" : "var(--good)";
    const accentBg = wasQueued ? "#FEF3C7" : "#F0FDF4";
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--cream)" }} className="texture-paper">
        <div className="fbt-card" style={{ padding: 32, textAlign: "center", maxWidth: 520, width: "100%" }}>
          <div style={{ width: 80, height: 80, background: accentColor, borderRadius: "50%", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {wasQueued ? <Clock size={44} color="#FFF" /> : <CheckCircle2 size={44} color="#FFF" />}
          </div>
          <div className="fbt-mono" style={{ fontSize: 11, color: accentColor, marginBottom: 4 }}>
            ▸ {wasQueued ? "QUEUED — WILL UPLOAD WHEN ONLINE" : "SENT TO DISPATCHER"}
          </div>
          <h2 className="fbt-display" style={{ fontSize: 28, margin: "0 0 8px" }}>FB #{lastFB}</h2>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 20 }}>
            {submissionSummary?.submittedAt ? new Date(submissionSummary.submittedAt).toLocaleString() : "—"}
          </div>

          {/* Summary block */}
          {submissionSummary && (
            <div style={{ background: accentBg, border: `2px solid ${accentColor}`, padding: 16, marginBottom: 20, textAlign: "left" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 10 }}>▸ WHAT YOU SUBMITTED</div>
              <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                <div><strong>DRIVER:</strong> {submissionSummary.driverName}</div>
                <div><strong>TRUCK:</strong> {submissionSummary.truckNumber}</div>
                {submissionSummary.material && <div><strong>MATERIAL:</strong> {submissionSummary.material}</div>}
                {submissionSummary.tonnage && <div><strong>TONNAGE:</strong> {submissionSummary.tonnage} tons</div>}
                {submissionSummary.loadCount && submissionSummary.loadCount !== "1" && <div><strong>LOADS:</strong> {submissionSummary.loadCount}</div>}
                {(submissionSummary.pickupTime || submissionSummary.dropoffTime) && (
                  <div><strong>TIMES:</strong> start {submissionSummary.pickupTime || "—"} → end {submissionSummary.dropoffTime || "—"}</div>
                )}
                {submissionSummary.signedOutStatus && submissionSummary.signedOutAt && (
                  <div><strong>SIGNED OUT:</strong> {submissionSummary.signedOutStatus} at {submissionSummary.signedOutAt}</div>
                )}
                <div><strong>PHOTOS:</strong> {submissionSummary.photoCount} scale ticket{submissionSummary.photoCount !== 1 ? "s" : ""} attached</div>
                {submissionSummary.extras.length > 0 && (
                  <div><strong>EXTRAS:</strong> {submissionSummary.extras.length} item{submissionSummary.extras.length !== 1 ? "s" : ""} · ${submissionSummary.extrasTotal.toFixed(2)}</div>
                )}
              </div>
              {/* v18 Session E: Show actual photo thumbnails so driver can verify what was sent */}
              {submissionSummary.photos && submissionSummary.photos.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--good)" }}>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>▸ PHOTOS UPLOADED</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {submissionSummary.photos.map((p) => (
                      <img
                        key={p.id}
                        src={p.dataUrl}
                        alt={p.name || "photo"}
                        style={{ width: 64, height: 64, objectFit: "cover", border: "1.5px solid var(--good)" }}
                      />
                    ))}
                    {submissionSummary.photoCount > submissionSummary.photos.length && (
                      <div style={{
                        width: 64, height: 64,
                        border: "1.5px dashed var(--concrete)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, color: "var(--concrete)",
                        
                      }}>
                        +{submissionSummary.photoCount - submissionSummary.photos.length}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn-primary" onClick={() => {
              setSubmitted(false);
              setSubmissionSummary(null);
              setSubmitError("");  // v18 Session E: clear any stale error
              setForm({ freightBillNumber: "", driverName: form.driverName, truckNumber: form.truckNumber, material: dispatch.material || "", tonnage: "", loadCount: "1", pickupTime: "", dropoffTime: "", signedOutStatus: "", signedOutAt: "", notes: "", extras: [] });
              setPhotos([]);
              // Clear per-field unlock flags — driver overrode lockedDriverName
              // on FB1, but the autofilled UI should re-show on FB2 so they
              // can confirm the truck/driver again.
              setUnlockedFields({});
              window.scrollTo(0, 0);
            }}><Plus size={16} /> LOG ANOTHER TRUCK</button>
            <button className="btn-ghost" onClick={onBack}>
              DONE — CLOSE
            </button>
          </div>
          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 16 }}>
            ▸ ORDER #{dispatch.code} · {dispatch.jobName}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }} className="texture-paper">
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      {showPretrip && (
        <PreTripModal
          truckNumber={form.truckNumber}
          driverName={form.driverName}
          onSubmit={onPretripSubmit}
          onClose={() => setShowPretrip(false)}
        />
      )}
      {showPosttrip && (
        <PreTripModal
          mode="posttrip"
          truckNumber={form.truckNumber}
          driverName={form.driverName}
          onSubmit={onPosttripSubmit}
          onClose={() => setShowPosttrip(false)}
        />
      )}
      {showIncident && (
        <IncidentModal
          truckNumber={form.truckNumber}
          driverName={form.driverName}
          onSubmit={onIncidentSubmit}
          onClose={() => setShowIncident(false)}
        />
      )}
      <div style={{ background: "var(--steel)", color: "var(--cream)", padding: "20px 24px", borderBottom: "3px solid var(--hazard)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Logo size="sm" />
          <InstallAppButton compact />
        </div>
      </div>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", marginBottom: 8 }}>
          ▸ DRIVER / SUB UPLOAD · ORDER #{dispatch.code}
        </div>
        <h1 className="fbt-display" style={{ fontSize: 32, margin: "0 0 8px", lineHeight: 1.1 }}>UPLOAD YOUR FREIGHT BILL</h1>
        <p style={{ color: "var(--concrete)", margin: "0 0 24px", fontSize: 15 }}>One submission per truck. Fill out the freight bill info and attach the scale ticket photos.</p>

        {/* Offline banner — submitting is fine, the FB is queued locally and
            uploaded automatically when the connection returns. */}
        {!isOnline && (
          <div className="fbt-card" style={{ padding: 16, marginBottom: 20, background: "var(--hazard-deep)", color: "#FFF", borderLeft: "6px solid var(--steel)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <AlertCircle size={26} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="fbt-display" style={{ fontSize: 16 }}>OFFLINE — SUBMIT WILL QUEUE</div>
              <div className="fbt-mono" style={{ fontSize: 11, marginTop: 2, opacity: 0.95 }}>
                FILL OUT THE FORM AND HIT SUBMIT — YOUR FB IS SAVED LOCALLY AND UPLOADS AUTOMATICALLY WHEN YOU'RE BACK ONLINE.
              </div>
            </div>
          </div>
        )}

        {/* Assignment-specific banner when using a sublink */}
        {assignment && (
          <div className="fbt-card" style={{ padding: 18, marginBottom: 20, background: "var(--steel)", color: "var(--cream)", borderLeft: "6px solid var(--hazard)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", marginBottom: 4 }}>
              ▸ {assignment.kind === "driver" ? "DRIVER LINK" : "SUB HAULER LINK"}
            </div>
            <div className="fbt-display" style={{ fontSize: 18, marginBottom: 6 }}>{assignment.name}</div>
            <div className="fbt-mono" style={{ fontSize: 12 }}>
              {dispatch.submittedCount} OF {dispatch.trucksExpected} TRUCK{dispatch.trucksExpected !== 1 ? "S" : ""} SUBMITTED
              {dispatch.submittedCount >= dispatch.trucksExpected && " · ✓ COMPLETE"}
            </div>
          </div>
        )}

        {/* "Your day at a glance" — every truck assigned to this driver/sub
            today across all dispatches. Helps a multi-truck driver/sub know
            how many uploads they have remaining without juggling SMS links. */}
        {(() => {
          const contactId = assignmentContact?.id;
          if (!contactId || !allDispatches?.length) return null;
          const todayStr = new Date().toISOString().slice(0, 10);
          const myAssignments = [];
          allDispatches.forEach((d) => {
            if (d.date !== todayStr) return;
            (d.assignments || []).forEach((a) => {
              if (a.contactId !== contactId) return;
              const submitted = (allFreightBills || []).some((fb) => fb.dispatchId === d.id && fb.assignmentId === a.aid);
              const isCurrent = d.id === dispatch.id && a.aid === assignment?.aid;
              myAssignments.push({ d, a, submitted, isCurrent });
            });
          });
          if (myAssignments.length <= 1) return null;
          const remaining = myAssignments.filter((m) => !m.submitted).length;
          return (
            <div className="fbt-card" style={{ padding: 16, marginBottom: 16, background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--steel)" }}>Your day at a glance</div>
                <div style={{ fontSize: 12, color: "var(--concrete)" }}>{myAssignments.length} truck{myAssignments.length !== 1 ? "s" : ""} · {remaining} left to upload</div>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {myAssignments.map(({ d, a, submitted, isCurrent }) => {
                  const url = `${window.location.origin}${window.location.pathname}#/submit/${d.code}/a/${a.aid}`;
                  return (
                    <a
                      key={`${d.id}-${a.aid}`}
                      href={isCurrent ? "#" : url}
                      onClick={(e) => { if (isCurrent) e.preventDefault(); }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 10,
                        alignItems: "center",
                        padding: "10px 12px",
                        background: isCurrent ? "var(--accent)" : "#FFF",
                        color: isCurrent ? "#FFF" : "var(--steel)",
                        border: `1px solid ${isCurrent ? "var(--accent-border)" : "var(--line)"}`,
                        borderRadius: 6,
                        textDecoration: "none",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.startTimes?.[0]?.time ? `${a.startTimes[0].time} · ` : ""}#{d.code} · {d.jobName || "—"}
                        </div>
                        <div style={{ fontSize: 11, opacity: isCurrent ? 0.85 : 0.7, marginTop: 2 }}>
                          {d.pickup ? `From ${d.pickup}` : ""}{d.pickup && d.dropoff ? " → " : ""}{d.dropoff || ""}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: submitted ? "var(--good-soft)" : isCurrent ? "rgba(255,255,255,0.25)" : "var(--warn-bg)", color: submitted ? "var(--good)" : isCurrent ? "#FFF" : "var(--warn-fg)" }}>
                        {submitted ? "✓ Done" : isCurrent ? "This one" : "Open"}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="fbt-card" style={{ padding: 20, marginBottom: 24, background: "#FEF3C7" }}>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 8 }}>JOB DETAILS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, fontSize: 13 }}>
            <div><strong>JOB:</strong> {dispatch.jobName}</div>
            {dispatch.clientName && <div><strong>CUSTOMER:</strong> {dispatch.clientName}</div>}
            <div><strong>DATE:</strong> {fmtDate(dispatch.date)}</div>
            {(assignment?.startTime || dispatch.baseStartTime) && (
              <div><strong>START TIME:</strong> {assignment?.startTime || dispatch.baseStartTime}</div>
            )}
            {dispatch.material && <div><strong>MATERIAL:</strong> {dispatch.material}</div>}
            {dispatch.pickup && <div><strong>PICKUP:</strong> {dispatch.pickup}</div>}
            {dispatch.dropoff && <div><strong>DROPOFF:</strong> {dispatch.dropoff}</div>}
            <div><strong>TRUCKS EXPECTED:</strong> {dispatch.trucksExpected}</div>
            <div><strong>SUBMITTED SO FAR:</strong> {dispatch.submittedCount}</div>
          </div>
          {dispatch.notes && <div style={{ marginTop: 10, fontSize: 13, color: "var(--concrete)" }}>{dispatch.notes}</div>}
        </div>
        <div className="fbt-card" style={{ padding: 24 }}>
          <div style={{ display: "grid", gap: 14 }}>
            {formWasRestored && !submitted && (
              <div style={{ padding: 10, background: "#F0FDF4", border: "1.5px solid var(--good)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--good)", fontWeight: 700 }}>
                  ▸ DRAFT RESTORED FROM YOUR LAST SESSION
                </div>
                <button
                  type="button"
                  onClick={() => { clearFormDraft(); setForm(initialForm); }}
                  className="btn-ghost"
                  style={{ padding: "4px 10px", fontSize: 10 }}
                  title="Discard the restored draft and start over"
                >
                  START OVER
                </button>
              </div>
            )}
            {/* DOT pre-trip — required ONCE per shift before submitting any FB.
                Shows a yellow banner if not yet done; flips to green confirmation
                once submitted (cached in localStorage so subsequent FBs the same
                day see the green state without re-prompting). */}
            <div style={{ padding: 12, border: `2px solid ${pretripDone ? "var(--good)" : "var(--hazard)"}`, background: pretripDone ? "#F0FDF4" : "#FEF3C7", borderRadius: 6 }}>
              {pretripDone ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <CheckCircle2 size={18} style={{ color: "var(--good)" }} />
                  <div style={{ flex: 1 }}>
                    <div className="fbt-mono" style={{ fontSize: 12, color: "var(--good)", fontWeight: 700 }}>
                      PRE-TRIP COMPLETE
                    </div>
                    <div style={{ fontSize: 11, color: "var(--concrete)" }}>
                      Today's inspection is on file for this dispatch.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <AlertCircle size={20} style={{ color: "var(--hazard-deep)" }} />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div className="fbt-mono" style={{ fontSize: 12, color: "var(--hazard-deep)", fontWeight: 700 }}>
                      DOT PRE-TRIP REQUIRED
                    </div>
                    <div style={{ fontSize: 11, color: "var(--steel)" }}>
                      Walk around your truck and check it before your first load. Takes ~2 min.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPretrip(true)}
                    className="btn-primary"
                    style={{ fontSize: 12 }}
                  >
                    Start pre-trip
                  </button>
                </div>
              )}
            </div>

            {/* Post-trip button — appears only AFTER the driver has submitted
                at least one FB today (lastFB stamped) and pre-trip is done.
                Once post-trip submitted, button flips to a green confirmation. */}
            {pretripDone && (lastFB || pretripDone) && (
              <div style={{ padding: 10, border: `1.5px solid ${posttripDone ? "var(--good)" : "var(--line)"}`, background: posttripDone ? "#F0FDF4" : "#F8FAFC", borderRadius: 6 }}>
                {posttripDone ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 size={16} style={{ color: "var(--good)" }} />
                    <div className="fbt-mono" style={{ fontSize: 11, color: "var(--good)", fontWeight: 700 }}>
                      POST-TRIP COMPLETE · Have a safe drive home.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--steel)", fontWeight: 700 }}>
                        DONE FOR THE DAY?
                      </div>
                      <div style={{ fontSize: 11, color: "var(--concrete)" }}>
                        Run a quick post-trip check before parking the truck.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPosttrip(true)}
                      className="btn-ghost"
                      style={{ fontSize: 11 }}
                    >
                      Start post-trip
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Incident quick-link — always available in case driver needs to
                report something mid-shift. Pending incident shows a chip until
                attached to next FB submit. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
              {incidentPending ? (
                <span className="chip" style={{ background: "var(--safety)", color: "#FFF", fontSize: 10, padding: "3px 8px", borderColor: "var(--safety)" }}>
                  ⚠ INCIDENT PENDING — attaches to your next submit
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowIncident(true)}
                  style={{ background: "transparent", border: "none", color: "var(--safety)", textDecoration: "underline", cursor: "pointer", fontSize: 11, padding: 0 }}
                >
                  ⚠ Report incident
                </button>
              )}
            </div>

            <div>
              <label className="fbt-label">Freight Bill # * <span style={{ color: "var(--concrete)", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(from the top of your paper bill)</span></label>
              <input className="fbt-input" value={form.freightBillNumber} onChange={(e) => setForm({ ...form, freightBillNumber: e.target.value })} placeholder="e.g. 45821" style={{ fontSize: 16 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
              <div>
                <label className="fbt-label">
                  Driver Name *
                  {lockedDriverName && unlockedFields.driverName && (
                    <span className="fbt-mono" style={{ fontSize: 9, color: "var(--safety)", marginLeft: 8, fontWeight: 700 }}>● OVERRIDDEN</span>
                  )}
                </label>
                {lockedDriverName && !unlockedFields.driverName ? (
                  <div>
                    <input
                      className="fbt-input"
                      value={form.driverName}
                      disabled
                      style={{ background: "#FEF3C7", fontWeight: 700 }}
                      title="This link is assigned to you"
                    />
                    <button
                      type="button"
                      onClick={() => setUnlockedFields({ ...unlockedFields, driverName: true })}
                      className="fbt-mono"
                      style={{ background: "transparent", border: "none", color: "var(--hazard-deep)", fontSize: 10, marginTop: 4, cursor: "pointer", padding: 0, textDecoration: "underline" }}
                    >
                      ▸ NOT YOU? TAP TO CHANGE
                    </button>
                  </div>
                ) : availableDrivers.length > 0 ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      className="fbt-select"
                      style={{ flex: 1, minWidth: 140 }}
                      value={form.driverId || ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) { setForm({ ...form, driverId: null, driverName: "" }); return; }
                        const d = availableDrivers.find((x) => String(x.id) === id);
                        if (d) setForm({ ...form, driverId: d.id, driverName: d.companyName || d.contactName });
                      }}
                    >
                      <option value="">— Select driver —</option>
                      {availableDrivers.map((d) => (
                        <option key={d.id} value={d.id}>{d.companyName || d.contactName}</option>
                      ))}
                      <option value="other">— Other (type below) —</option>
                    </select>
                    {(!form.driverId || form.driverId === "other") && (
                      <input
                        className="fbt-input"
                        style={{ flex: 1, minWidth: 140 }}
                        value={form.driverName}
                        onChange={(e) => setForm({ ...form, driverName: e.target.value, driverId: null })}
                        placeholder="Your full name"
                      />
                    )}
                  </div>
                ) : (
                  <input className="fbt-input" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="Your full name" />
                )}
              </div>
              <div>
                <label className="fbt-label">
                  Truck # *
                  {prefillTruck && !unlockedFields.truckNumber && form.truckNumber === prefillTruck && (
                    <span className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginLeft: 8 }}>● AUTOFILLED</span>
                  )}
                  {prefillTruck && unlockedFields.truckNumber && (
                    <span className="fbt-mono" style={{ fontSize: 9, color: "var(--safety)", marginLeft: 8, fontWeight: 700 }}>● CHANGED</span>
                  )}
                </label>
                <input
                  className="fbt-input"
                  value={form.truckNumber}
                  onChange={(e) => { setForm({ ...form, truckNumber: e.target.value }); if (prefillTruck && e.target.value !== prefillTruck) setUnlockedFields({ ...unlockedFields, truckNumber: true }); }}
                  placeholder="T-01 or plate"
                  style={prefillTruck && !unlockedFields.truckNumber ? { background: "#FEF3C7" } : {}}
                />
                {prefillTruck && !unlockedFields.truckNumber && (
                  <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginTop: 3 }}>
                    ▸ AUTOFILLED FROM YOUR CONTACT · TAP FIELD TO CHANGE
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
              <div><label className="fbt-label">Material</label><input className="fbt-input" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} /></div>
              <div><label className="fbt-label">Tonnage</label><input className="fbt-input" type="number" step="0.01" value={form.tonnage} onChange={(e) => setForm({ ...form, tonnage: e.target.value })} placeholder="e.g. 25.4" /></div>
              <div><label className="fbt-label">Load Count</label><input className="fbt-input" type="number" value={form.loadCount} onChange={(e) => setForm({ ...form, loadCount: e.target.value })} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
              <div>
                <label className="fbt-label">Start time</label>
                <input className="fbt-input" type="time" value={form.pickupTime} onChange={(e) => setForm({ ...form, pickupTime: e.target.value })} />
              </div>
              <div>
                <label className="fbt-label">End time</label>
                <input className="fbt-input" type="time" value={form.dropoffTime} onChange={(e) => setForm({ ...form, dropoffTime: e.target.value })} />
              </div>
            </div>

            {/* Signed-out status — separate from start/end time. Driver picks ONE
                of "loaded" or "empty" and stamps a single time. Independent of
                billing hours. Optional. */}
            <div>
              <label className="fbt-label">Signed out</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {["loaded", "empty"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setForm({ ...form, signedOutStatus: form.signedOutStatus === opt ? "" : opt })}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      border: `2px solid ${form.signedOutStatus === opt ? "var(--good)" : "var(--line)"}`,
                      background: form.signedOutStatus === opt ? "var(--good)" : "#FFF",
                      color: form.signedOutStatus === opt ? "#FFF" : "var(--steel)",
                      fontWeight: 700,
                      fontSize: 13,
                      textTransform: "capitalize",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  className="fbt-input"
                  style={{ flex: 1 }}
                  type="time"
                  value={form.signedOutAt}
                  onChange={(e) => setForm({ ...form, signedOutAt: e.target.value })}
                  disabled={!form.signedOutStatus}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={!form.signedOutStatus}
                  onClick={() => {
                    const now = new Date();
                    const hh = String(now.getHours()).padStart(2, "0");
                    const mm = String(now.getMinutes()).padStart(2, "0");
                    setForm({ ...form, signedOutAt: `${hh}:${mm}` });
                  }}
                  style={{ fontSize: 12, whiteSpace: "nowrap" }}
                >
                  Now
                </button>
              </div>
              {!form.signedOutStatus && (
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
                  ▸ Pick loaded or empty to enable the time field.
                </div>
              )}
            </div>
            <div><label className="fbt-label">Notes</label><textarea className="fbt-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything unusual about this load?" /></div>

            {/* Tolls / Dump Fees / Fuel / Other — per-FB extras */}
            <div style={{ padding: 12, background: "#FEF3C7", border: "2px solid var(--hazard)" }}>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 6, fontWeight: 700 }}>
                ▸ TOLLS · DUMP FEES · FUEL · OTHER {form.extras?.length > 0 ? `(${form.extras.length})` : "(OPTIONAL)"}
              </div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8, lineHeight: 1.4 }}>
                Add any out-of-pocket costs you paid for this load. Keep receipts. You'll be reimbursed.
              </div>
              {(form.extras || []).length > 0 && (
                <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
                  {form.extras.map((x, idx) => {
                    const hasQtyRate = (Number(x.qty) > 0) && (Number(x.rate) > 0);
                    return (
                      <div key={idx} style={{ border: "1px solid var(--concrete)", padding: 8, background: "#FFF" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 6, alignItems: "center", marginBottom: 6 }}>
                          <select
                            className="fbt-select"
                            style={{ padding: "6px 8px", fontSize: 11 }}
                            value={["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? x.label : "Other"}
                            onChange={(e) => {
                              const v = e.target.value;
                              const next = [...form.extras];
                              next[idx] = { ...next[idx], label: v === "Other" ? (next[idx].label || "") : v };
                              setForm({ ...form, extras: next });
                            }}
                          >
                            <option value="Tolls">Tolls</option>
                            <option value="Dump Fees">Dump Fees</option>
                            <option value="Fuel Surcharge">Fuel</option>
                            <option value="Other">Other</option>
                          </select>
                          <input
                            className="fbt-input"
                            style={{ padding: "6px 10px", fontSize: 12 }}
                            placeholder={["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? "Description (e.g. Bay Bridge)" : "Describe — specify type"}
                            value={x.label && !["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? x.label : (x.note || "")}
                            onChange={(e) => {
                              const next = [...form.extras];
                              const isOther = !["Tolls", "Dump Fees", "Fuel Surcharge"].includes(next[idx].label);
                              if (isOther) next[idx] = { ...next[idx], label: e.target.value };
                              else next[idx] = { ...next[idx], note: e.target.value };
                              setForm({ ...form, extras: next });
                            }}
                          />
                          <button
                            onClick={() => setForm({ ...form, extras: form.extras.filter((_, i) => i !== idx) })}
                            className="btn-danger"
                            style={{ padding: "6px 10px", fontSize: 11 }}
                            type="button"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, alignItems: "center" }}>
                          <div>
                            <label className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>QTY (OPTIONAL)</label>
                            <input
                              className="fbt-input"
                              type="number" step="0.01" min="0"
                              placeholder="e.g. 3"
                              style={{ padding: "5px 8px", fontSize: 11 }}
                              value={x.qty || ""}
                              onChange={(e) => {
                                const next = [...form.extras];
                                const newQty = e.target.value;
                                next[idx] = { ...next[idx], qty: newQty };
                                // Auto-compute amount if both qty + rate are set
                                if (newQty && next[idx].rate) {
                                  next[idx].amount = (Number(newQty) * Number(next[idx].rate)).toFixed(2);
                                }
                                setForm({ ...form, extras: next });
                              }}
                            />
                          </div>
                          <div>
                            <label className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>RATE $ (OPTIONAL)</label>
                            <input
                              className="fbt-input"
                              type="number" step="0.01" min="0"
                              placeholder="e.g. 8.50"
                              style={{ padding: "5px 8px", fontSize: 11 }}
                              value={x.rate || ""}
                              onChange={(e) => {
                                const next = [...form.extras];
                                const newRate = e.target.value;
                                next[idx] = { ...next[idx], rate: newRate };
                                // Auto-compute amount if both qty + rate are set
                                if (newRate && next[idx].qty) {
                                  next[idx].amount = (Number(next[idx].qty) * Number(newRate)).toFixed(2);
                                }
                                setForm({ ...form, extras: next });
                              }}
                            />
                          </div>
                          <div>
                            <label className="fbt-mono" style={{ fontSize: 9, color: hasQtyRate ? "var(--good)" : "var(--concrete)", fontWeight: 700 }}>
                              AMOUNT $ {hasQtyRate ? "(AUTO)" : ""}
                            </label>
                            <input
                              className="fbt-input"
                              type="number" step="0.01" min="0"
                              placeholder="$0.00"
                              style={{ padding: "5px 8px", fontSize: 11, background: hasQtyRate ? "#F0FDF4" : "#FFF", fontWeight: 700 }}
                              value={x.amount || ""}
                              onChange={(e) => {
                                const next = [...form.extras];
                                next[idx] = { ...next[idx], amount: e.target.value };
                                setForm({ ...form, extras: next });
                              }}
                              title={hasQtyRate ? "Auto-calculated — edit to override" : "Enter amount directly or use qty + rate"}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setForm({ ...form, extras: [...(form.extras || []), { label: "Tolls", amount: "", reimbursable: true }] })}>
                  <Plus size={11} style={{ marginRight: 3 }} /> TOLLS
                </button>
                <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setForm({ ...form, extras: [...(form.extras || []), { label: "Dump Fees", amount: "", reimbursable: true }] })}>
                  <Plus size={11} style={{ marginRight: 3 }} /> DUMP
                </button>
                <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setForm({ ...form, extras: [...(form.extras || []), { label: "Fuel Surcharge", amount: "", reimbursable: true }] })}>
                  <Plus size={11} style={{ marginRight: 3 }} /> FUEL
                </button>
                <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setForm({ ...form, extras: [...(form.extras || []), { label: "", amount: "", reimbursable: true }] })}>
                  <Plus size={11} style={{ marginRight: 3 }} /> OTHER
                </button>
              </div>
            </div>
            <div>
              <label className="fbt-label" style={{ fontSize: 14, marginBottom: 10 }}>Scale Tickets / Freight Bill Photos *</label>

              {/* BIG camera button — dominant for mobile/field use */}
              <label
                htmlFor="big-camera-input"
                style={{
                  cursor: "pointer",
                  padding: "32px 20px",
                  background: photos.length > 0 ? "var(--good)" : "var(--hazard)",
                  color: photos.length > 0 ? "#FFF" : "var(--steel)",
                  border: "3px solid " + (photos.length > 0 ? "var(--good)" : "var(--hazard-deep)"),
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 16,
                  minHeight: 120,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "transform 0.1s",
                  WebkitTapHighlightColor: "transparent",
                }}
                onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                onTouchEnd={(e) => { e.currentTarget.style.transform = ""; }}
              >
                <Camera size={48} />
                <div style={{ fontSize: 18 }}>
                  {uploading
                    ? (photoProgress.total > 0
                        ? `PROCESSING ${photoProgress.current} OF ${photoProgress.total}…`
                        : "PROCESSING…")
                    : photos.length === 0 ? "📷 TAKE PHOTO OF TICKETS" : `+ ADD MORE PHOTOS`}
                </div>
                {photos.length === 0 && (
                  <div style={{ fontSize: 11, opacity: 0.9 }}>
                    TAP TO USE YOUR CAMERA
                  </div>
                )}
                {photos.length > 0 && (
                  <div style={{ fontSize: 11, opacity: 0.95 }}>
                    {photos.length} ATTACHED · TAP TO ADD MORE
                  </div>
                )}
                <input id="big-camera-input" type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={(e) => { handlePhotos(e.target.files); e.target.value = ""; }} />
              </label>

              {/* Secondary gallery option */}
              <div style={{ marginTop: 8, textAlign: "center" }}>
                <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--concrete)", padding: "6px 10px" }}>
                  <Upload size={12} /> OR PICK FROM GALLERY
                  <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { handlePhotos(e.target.files); e.target.value = ""; }} />
                </label>
              </div>

              {photos.length > 0 && (
                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  {photos.map((p) => {
                    const isFailed = p.status === "failed";
                    const isCompressing = p.status === "compressing";
                    const isDone = p.status === "done";
                    const ocrRunning = p.ocr?.status === "running";
                    const ocrDone = p.ocr?.status === "done";
                    const ocrError = p.ocr?.status === "error";
                    return (
                      <div key={p.id} style={{ position: "relative", display: "flex", gap: 10, padding: 8, border: "1px solid var(--line)", background: "#FFF", borderRadius: 6 }}>
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          {isFailed || isCompressing ? (
                            <div style={{
                              width: 100, height: 100,
                              border: `2px solid ${isFailed ? "var(--safety)" : "var(--concrete)"}`,
                              background: isFailed ? "#FEF2F2" : "#F5F5F4",
                              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                              padding: 6, gap: 4, textAlign: "center",
                            }}>
                              {isFailed ? <AlertCircle size={20} style={{ color: "var(--safety)" }} /> : <Clock size={20} style={{ color: "var(--concrete)" }} />}
                              <div className="fbt-mono" style={{ fontSize: 9, color: isFailed ? "var(--safety)" : "var(--concrete)", fontWeight: 700, lineHeight: 1.2 }}>
                                {isFailed ? "FAILED" : "COMPRESSING…"}
                              </div>
                              <div style={{ fontSize: 9, color: "var(--concrete)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }} title={p.name}>
                                {p.name}
                              </div>
                              {isFailed && (
                                <button
                                  type="button"
                                  onClick={() => retryPhoto(p.id)}
                                  style={{ padding: "2px 8px", fontSize: 9, fontWeight: 700, background: "var(--safety)", color: "#FFF", border: "none", cursor: "pointer" }}
                                >
                                  RETRY
                                </button>
                              )}
                            </div>
                          ) : (
                            <img src={p.dataUrl} className="thumb" alt={p.name} onClick={() => setLightbox(p.dataUrl)} style={{ width: 100, height: 100, objectFit: "cover", border: "2px solid var(--steel)" }} />
                          )}
                          <button onClick={() => removePhoto(p.id)} style={{ position: "absolute", top: -8, right: -8, background: "var(--safety)", color: "#FFF", border: "2px solid var(--steel)", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, borderRadius: "50%" }}>
                            <X size={14} />
                          </button>
                        </div>

                        {/* Right column — category + OCR (only on successfully-uploaded photos) */}
                        {isDone && (
                          <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 6 }}>
                            <label className="fbt-label" style={{ fontSize: 10, marginBottom: 0 }}>Document type</label>
                            <select
                              className="fbt-select"
                              style={{ padding: "6px 8px", fontSize: 12 }}
                              value={p.category || "scale_ticket"}
                              onChange={(e) => setPhotoCategory(p.id, e.target.value)}
                            >
                              <option value="scale_ticket">Scale ticket</option>
                              <option value="freight_bill">Freight bill</option>
                              <option value="police_ticket">Police ticket</option>
                              <option value="other">Other</option>
                            </select>

                            {/* Extract button — only shown for scale tickets / freight bills */}
                            {(p.category === "scale_ticket" || p.category === "freight_bill") && !ocrDone && !ocrRunning && (
                              <button
                                type="button"
                                onClick={() => runOcrOn(p.id)}
                                className="btn-ghost"
                                style={{ padding: "6px 8px", fontSize: 11, justifySelf: "start" }}
                                title="Extract FB# and tonnage from this image (runs on your phone, no internet needed)"
                              >
                                🔍 Extract FB# + tonnage
                              </button>
                            )}
                            {ocrRunning && (
                              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>⏳ Reading image…</div>
                            )}
                            {ocrError && (
                              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--safety)" }}>⚠ {p.ocr.error || "OCR failed"}</div>
                            )}
                            {ocrDone && (
                              <div style={{ background: "#F0FDF4", border: "1px solid var(--good)", padding: 6, borderRadius: 4, display: "grid", gap: 4 }}>
                                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", fontWeight: 700 }}>
                                  ✓ EXTRACTED
                                </div>
                                {p.ocr.fields?.fbNumber && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, flexWrap: "wrap" }}>
                                    <span>FB# <strong>{p.ocr.fields.fbNumber}</strong></span>
                                    <button
                                      type="button"
                                      onClick={() => setForm({ ...form, freightBillNumber: p.ocr.fields.fbNumber })}
                                      className="btn-ghost"
                                      style={{ padding: "2px 6px", fontSize: 10 }}
                                    >
                                      Apply
                                    </button>
                                  </div>
                                )}
                                {p.ocr.fields?.tonnage != null && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, flexWrap: "wrap" }}>
                                    <span>Tonnage <strong>{p.ocr.fields.tonnage}</strong></span>
                                    <button
                                      type="button"
                                      onClick={() => setForm({ ...form, tonnage: String(p.ocr.fields.tonnage) })}
                                      className="btn-ghost"
                                      style={{ padding: "2px 6px", fontSize: 10 }}
                                    >
                                      Apply
                                    </button>
                                  </div>
                                )}
                                {!p.ocr.fields?.fbNumber && p.ocr.fields?.tonnage == null && (
                                  <div style={{ fontSize: 11, color: "var(--concrete)" }}>Couldn't find FB# or tonnage. Type them in by hand.</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit button with progress indicator */}
            {submitting ? (
              <div style={{ marginTop: 16, padding: 20, background: "var(--good)", color: "#FFF", textAlign: "center" }}>
                <div className="fbt-mono" style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                  {submitProgress || "SUBMITTING…"}
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#FFF", width: "50%", animation: "slide 1.2s linear infinite" }}></div>
                </div>
                <style>{`@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
              </div>
            ) : (
              <>
                {/* v18 Session E: Inline retry-friendly error message */}
                {submitError && (
                  <div style={{ marginTop: 14, padding: 14, background: "#FEF2F2", border: "2px solid var(--safety)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <AlertCircle size={20} style={{ color: "var(--safety)", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, fontSize: 13, color: "var(--steel)", whiteSpace: "pre-line", lineHeight: 1.4 }}>
                      {submitError}
                    </div>
                    <button
                      onClick={() => setSubmitError("")}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--safety)", flexShrink: 0, padding: 0 }}
                      title="Dismiss"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}

                {/* v20 Session P: Honeypot field — hidden from humans, visible to bots */}
                <div style={{ position: "absolute", left: "-9999px", top: "-9999px", height: 0, overflow: "hidden" }} aria-hidden="true">
                  <label>Website (leave blank):</label>
                  <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>

                {/* v20 Session P: Captcha challenge — shown when threshold hit */}
                {captchaChallenge && (
                  <div style={{ marginTop: 14, padding: 14, background: "#FEF3C7", border: "2px solid var(--hazard-deep)" }}>
                    <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", fontWeight: 700, marginBottom: 8 }}>
                      ▸ QUICK VERIFICATION — PROVE YOU'RE HUMAN
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {captchaChallenge.a} + {captchaChallenge.b} =
                      </div>
                      <input
                        type="number"
                        className="fbt-input"
                        style={{ width: 120, fontSize: 18, textAlign: "center" }}
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                        placeholder="?"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                <button onClick={submit} className="btn-primary" style={{ marginTop: 16, padding: "16px 24px", fontSize: 15 }} disabled={uploading}>
                  <CheckCircle2 size={18} /> {submitError ? "RETRY SUBMIT" : "SUBMIT FREIGHT BILL"}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="fbt-mono" style={{ marginTop: 20, fontSize: 11, color: "var(--concrete)", textAlign: "center" }}>▸ PROBLEM WITH THIS FORM? CONTACT DISPATCH.</div>
      </div>
    </div>
  );
};

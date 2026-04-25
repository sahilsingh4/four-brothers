import React from "react";

// Class component because React requires class for componentDidCatch +
// getDerivedStateFromError. Wraps a tree; if anything throws during render,
// shows a recoverable fallback instead of whitescreening the whole app.
//
// Past production crashes that would have been caught:
//   - PR #6 shipped CustomerPortal that bundled an out-of-scope HomeTab
//     reference → ReferenceError on render → blank page.
//   - PR pre-#13 used <X /> without importing it → JSX undefined →
//     ReferenceError on render → blank page.
// Both surfaced as user reports of "site won't load." With this boundary,
// the failure is contained to the wrapped subtree and the user sees a
// "something went wrong — reload" panel.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
    this.setState({ errorInfo });
  }

  reset = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || String(this.state.error);
      return (
        <div style={{ padding: 24, maxWidth: 720, margin: "40px auto", fontFamily: "Inter, sans-serif" }}>
          <div style={{ background: "#FFF", border: "1px solid var(--safety, #DC2626)", borderRadius: 10, padding: 24, boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ width: 10, height: 10, background: "var(--safety, #DC2626)", borderRadius: "50%" }} />
              <h2 style={{ fontSize: 18, margin: 0, fontWeight: 600, color: "var(--steel, #0F172A)" }}>Something went wrong</h2>
            </div>
            <p style={{ fontSize: 14, color: "var(--concrete, #64748B)", lineHeight: 1.5, margin: "0 0 16px" }}>
              The app hit an error rendering this view. Your data is safe — nothing was lost. Try reloading. If it keeps happening, share the error below with support.
            </p>
            <details style={{ background: "var(--surface, #F8FAFC)", border: "1px solid var(--line, #E2E8F0)", borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 12, color: "var(--steel, #0F172A)" }}>
              <summary style={{ cursor: "pointer", fontWeight: 500, marginBottom: 8 }}>Error details</summary>
              <code style={{ display: "block", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "Inter, monospace", fontSize: 11 }}>
                {msg}
                {this.state.errorInfo?.componentStack ? `\n\nComponent stack:${this.state.errorInfo.componentStack}` : ""}
              </code>
            </details>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => window.location.reload()}
                style={{ padding: "9px 16px", background: "var(--hazard, #3B82F6)", color: "#FFF", border: "1px solid var(--hazard-deep, #2563EB)", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                Reload page
              </button>
              <button
                onClick={this.reset}
                style={{ padding: "9px 16px", background: "#FFF", color: "var(--steel, #0F172A)", border: "1px solid var(--line, #E2E8F0)", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

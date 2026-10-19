import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react"
import { getStores } from "@/store"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"
import { RescueActions } from "@/app/status"

/** Never leave a blank page: show what broke and a way to reload. */
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep a trace Claude can read back (settings/lastError) to fix the bug.
    const report = {
      message: String(error?.message ?? error),
      stack: String(error?.stack ?? "").slice(0, 3000),
      componentStack: String(info?.componentStack ?? "").slice(0, 2000),
      at: new Date().toISOString(),
      ua: navigator.userAgent,
      hash: location.hash,
    }
    try {
      localStorage.setItem("hydro.lastError", JSON.stringify(report))
    } catch {
      /* ignore */
    }
    getStores()
      .then(({ docs }) => docs.set("settings/lastError", report))
      .catch(() => {})
  }
  render() {
    if (!this.state.error) return this.props.children
    const fr = document.documentElement.lang !== "en"
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 20 }}>{fr ? "Hydro n'a pas pu s'afficher" : "Hydro couldn't load"}</h1>
        <p style={{ opacity: 0.75, fontSize: 14 }}>{this.state.error.message}</p>
        <pre style={{ opacity: 0.6, fontSize: 10.5, whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 260, overflow: "auto" }}>
          {String(this.state.error.stack ?? "").split("\n").slice(0, 8).join("\n")}
        </pre>
        <button onClick={() => location.reload()} style={{ marginTop: 12, padding: "10px 16px", borderRadius: 999 }}>
          {fr ? "Recharger" : "Reload"}
        </button>
        <RescueActions />
      </div>
    )
  }
}

// Local (friends') version: works offline (installable). Persistent storage is asked once a grow exists (App).
if (import.meta.env.VITE_TARGET === "local") {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {})
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </StrictMode>,
)

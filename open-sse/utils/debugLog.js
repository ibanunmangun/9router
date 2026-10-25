// Debug logging utility — active in dev mode (NODE_ENV !== "production") or
// when explicitly forced via NINEROUTER_STREAM_DEBUG=1, independent of
// NODE_ENV so a production deploy can opt into stream-level debug lines for
// live troubleshooting without flipping NODE_ENV (which also gates cookie
// security and other production-only behavior).
const isDev = process.env.NODE_ENV !== "production" || process.env.NINEROUTER_STREAM_DEBUG === "1";

function ts() {
  return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function dbg(tag, msg) {
  if (!isDev) return;
  console.log(`[${ts()}] 🐛 [DBG:${tag}] ${msg}`);
}

export const isDebugEnabled = isDev;

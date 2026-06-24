// Serverless endpoint backing the Position Tracker with a Vercel KV (Upstash Redis) store.
//   GET  /api/data        -> { data: { positions, meta, ratings } | null }
//   POST /api/data {...}   -> { ok: true }   (body is the full state object)
//
// Credentials are injected automatically when you connect a KV / Upstash store
// to the Vercel project (Storage tab). We accept either naming convention.

const KEY = "positionTracker:state";

function creds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

// Run a single Redis command through the Upstash REST API (command-as-JSON-array form).
async function redis(url, token, args) {
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`KV request failed: ${r.status}`);
  return r.json();
}

function readRaw(req) {
  return new Promise((resolve) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => resolve(s));
    req.on("error", () => resolve(""));
  });
}

module.exports = async (req, res) => {
  const { url, token } = creds();
  if (!url || !token) {
    res.status(500).json({ error: "KV store is not configured. Connect a store in the Vercel Storage tab." });
    return;
  }

  try {
    if (req.method === "GET") {
      const out = await redis(url, token, ["GET", KEY]);
      const data = out && out.result ? JSON.parse(out.result) : null;
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ data });
      return;
    }

    if (req.method === "POST") {
      let body = req.body;
      if (body === undefined || body === null) body = await readRaw(req);
      const value = typeof body === "string" ? body : JSON.stringify(body);
      // sanity check it is valid JSON before persisting
      JSON.parse(value);
      const out = await redis(url, token, ["SET", KEY, value]);
      res.status(200).json({ ok: out && out.result === "OK" });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
};

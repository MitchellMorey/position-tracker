// Per-user data store. Requires a valid session; data is keyed by the signed-in email.
//   GET  /api/data       -> { data: { positions, meta, ratings } | null }
//   POST /api/data {...}  -> { ok: true }
const { redis, sessionEmail, readRaw, STATE_PREFIX } = require("./_lib.js");

module.exports = async (req, res) => {
  const email = sessionEmail(req);
  if (!email) { res.status(401).json({ error: "Not authenticated" }); return; }
  const KEY = STATE_PREFIX + email;

  try {
    if (req.method === "GET") {
      const out = await redis(["GET", KEY]);
      const data = out && out.result ? JSON.parse(out.result) : null;
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ data });
      return;
    }

    if (req.method === "POST") {
      let body = req.body;
      if (body === undefined || body === null) body = await readRaw(req);
      const value = typeof body === "string" ? body : JSON.stringify(body);
      JSON.parse(value); // validate
      const out = await redis(["SET", KEY, value]);
      res.status(200).json({ ok: out && out.result === "OK" });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
};

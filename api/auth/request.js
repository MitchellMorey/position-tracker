// POST /api/auth/request  { email }  -> emails a magic sign-in link if the address is allowed.
// Always responds { ok: true } so we don't reveal which addresses are permitted.
const crypto = require("crypto");
const { redis, allowedEmails, readRaw, TOKEN_PREFIX } = require("../_lib.js");

async function sendEmail(to, link) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY missing");
  const from = process.env.MAIL_FROM || "Position Tracker <onboarding@resend.dev>";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your Position Tracker sign-in link",
      html: `<p>Click below to sign in to Position Tracker:</p>
             <p><a href="${link}" style="background:#38bdf8;color:#06283d;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a></p>
             <p style="color:#666;font-size:13px">This link expires in 15 minutes. If you didn't request it, ignore this email.</p>`,
    }),
  });
  if (!r.ok) throw new Error(`Resend error: ${r.status} ${await r.text()}`);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  let body = req.body;
  if (body === undefined || body === null) body = await readRaw(req);
  if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }

  const email = String(body.email || "").trim().toLowerCase();
  if (email && allowedEmails().includes(email)) {
    try {
      const token = crypto.randomBytes(32).toString("hex");
      await redis(["SET", TOKEN_PREFIX + token, email, "EX", "900"]); // 15-minute expiry
      const proto = req.headers["x-forwarded-proto"] || "https";
      const link = `${proto}://${req.headers.host}/api/auth/verify?token=${token}`;
      await sendEmail(email, link);
    } catch (e) {
      res.status(500).json({ error: "Could not send sign-in link.", detail: String(e && e.message ? e.message : e) });
      return;
    }
  }
  res.status(200).json({ ok: true });
};

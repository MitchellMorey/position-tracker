// Shared helpers for the Position Tracker API (KV access, sessions, cookies).
// Files beginning with "_" are not exposed as routes by Vercel.
const crypto = require("crypto");

const STATE_PREFIX = "positionTracker:state:";
const TOKEN_PREFIX = "auth:token:";
const COOKIE = "pt_session";

function creds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

// Run one Redis command via the Upstash REST API (command-as-JSON-array form).
async function redis(args) {
  const { url, token } = creds();
  if (!url || !token) throw new Error("KV store is not configured.");
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`KV request failed: ${r.status}`);
  return r.json();
}

function allowedEmails() {
  return (process.env.ALLOWED_EMAILS || "mitchell.morey@gmail.com")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function secret() { return process.env.SESSION_SECRET || "dev-insecure-secret-change-me"; }

// Signed session value: base64url(email).hmac(email)
function sign(email) {
  const mac = crypto.createHmac("sha256", secret()).update(email).digest("hex");
  return Buffer.from(email).toString("base64url") + "." + mac;
}
function verify(value) {
  if (!value || value.indexOf(".") < 0) return null;
  const [b64, mac] = value.split(".");
  let email;
  try { email = Buffer.from(b64, "base64url").toString("utf8"); } catch { return null; }
  const expect = crypto.createHmac("sha256", secret()).update(email).digest("hex");
  if (!mac || mac.length !== expect.length) return null;
  try { if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null; }
  catch { return null; }
  return email;
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function sessionEmail(req) { return verify(parseCookies(req)[COOKIE]); }
function setSessionCookie(res, email) {
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(sign(email))}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
}
function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

function readRaw(req) {
  return new Promise((resolve) => {
    let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => resolve(s)); req.on("error", () => resolve(""));
  });
}

module.exports = {
  STATE_PREFIX, TOKEN_PREFIX, COOKIE,
  redis, allowedEmails, sign, verify, sessionEmail, setSessionCookie, clearSessionCookie, parseCookies, readRaw,
};

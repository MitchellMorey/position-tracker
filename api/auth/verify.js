// GET /api/auth/verify?token=...  -> validates the one-time token, sets the session cookie, redirects home.
const { redis, setSessionCookie, TOKEN_PREFIX } = require("../_lib.js");

function page(msg) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
  <div style="max-width:420px;text-align:center;padding:24px">${msg}</div></body>`;
}

module.exports = async (req, res) => {
  const token = (req.query && req.query.token) || "";
  if (!token) { res.status(400).send(page("Missing token.")); return; }
  try {
    const got = await redis(["GET", TOKEN_PREFIX + token]);
    const email = got && got.result;
    if (!email) {
      res.status(400).send(page("This sign-in link is invalid or has expired.<br><br><a style='color:#38bdf8' href='/'>Request a new one</a>"));
      return;
    }
    await redis(["DEL", TOKEN_PREFIX + token]); // single-use
    setSessionCookie(res, email);
    res.statusCode = 302;
    res.setHeader("Location", "/");
    res.end();
  } catch (e) {
    res.status(500).send(page("Sign-in error. Please try again."));
  }
};

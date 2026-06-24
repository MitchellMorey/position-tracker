// POST /api/auth/logout -> clears the session cookie.
const { clearSessionCookie } = require("../_lib.js");
module.exports = async (req, res) => {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
};

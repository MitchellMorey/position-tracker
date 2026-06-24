// GET /api/me -> { email } of the current session, or { email: null }.
const { sessionEmail } = require("./_lib.js");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ email: sessionEmail(req) || null });
};

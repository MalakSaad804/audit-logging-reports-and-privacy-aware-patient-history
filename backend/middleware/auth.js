/**
 * This project has no login system, so there's no real session to read a
 * user's identity from. As a stand-in, every request is expected to send:
 *   x-role:    "patient" | "doctor"
 *   x-user-id: the Mongo _id of that patient or doctor
 *
 * In a real app this middleware would instead verify a JWT/session and
 * pull the role and id from that - the rest of the app (audit logging,
 * the privacy check on patient history) doesn't care how the identity
 * got there, only that req.role and req.userId are set correctly.
 */
function identify(req, res, next) {
  req.role = req.headers["x-role"] || "unknown";
  req.userId = req.headers["x-user-id"] || null;
  next();
}

// Use on routes that must only be reachable by a doctor (e.g. reports)
function requireDoctor(req, res, next) {
  if (req.role !== "doctor") {
    return res.status(403).json({ error: "Only doctors can access this" });
  }
  next();
}

module.exports = { identify, requireDoctor };

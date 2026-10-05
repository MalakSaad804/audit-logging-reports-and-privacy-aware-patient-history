const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ["create", "update", "delete"], required: true },
    // Which collection this log entry is about: "Patient", "Doctor", "Visit"
    model: { type: String, required: true },
    // The _id of the document that was changed
    documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    // Who did it. In a real app this comes from a logged-in user/session;
    // here it comes from the x-user-id / x-role request headers (see middleware/auth.js).
    performedBy: { type: String, default: "unknown" },
    role: { type: String, default: "unknown" },
    // What changed - the new/updated fields for create & update, the whole doc for delete
    changes: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Fast "show me the history of this one document" lookups
auditSchema.index({ model: 1, documentId: 1, timestamp: -1 });
// Fast "show me recent activity" lookups
auditSchema.index({ timestamp: -1 });

module.exports = mongoose.model("Audit", auditSchema);

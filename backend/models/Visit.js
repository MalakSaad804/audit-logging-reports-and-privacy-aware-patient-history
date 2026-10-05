const mongoose = require("mongoose");
const { attachAuditLogging } = require("../middleware/auditLog");

const visitSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    // The appointment slot
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["booked", "completed", "cancelled"],
      default: "booked",
    },
    notes: { type: String, trim: true, default: "" },
    // URL returned by the upload endpoint, e.g. /uploads/prescriptions/xyz.png
    prescriptionUrl: { type: String, default: null },
  },
  { timestamps: true }
);

// Speeds up "find all visits for a doctor in a date range" and stops double-booking checks from scanning the whole collection
visitSchema.index({ doctor: 1, startTime: 1 });
visitSchema.index({ patient: 1, startTime: 1 });

attachAuditLogging(visitSchema, "Visit");

module.exports = mongoose.model("Visit", visitSchema);

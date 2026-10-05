const mongoose = require("mongoose");
const { attachAuditLogging } = require("../middleware/auditLog");

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    // Working hours used to generate available slots, e.g. "09:00" - "17:00"
    workStart: { type: String, default: "09:00" },
    workEnd: { type: String, default: "17:00" },
  },
  { timestamps: true }
);

doctorSchema.index({ specialization: 1 });

attachAuditLogging(doctorSchema, "Doctor");

module.exports = mongoose.model("Doctor", doctorSchema);

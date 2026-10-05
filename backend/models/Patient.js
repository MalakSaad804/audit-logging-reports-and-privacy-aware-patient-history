const mongoose = require("mongoose");
const { attachAuditLogging } = require("../middleware/auditLog");

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0 },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
  },
  { timestamps: true }
);

patientSchema.index({ phone: 1 });

attachAuditLogging(patientSchema, "Patient");

module.exports = mongoose.model("Patient", patientSchema);

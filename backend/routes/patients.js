const express = require("express");
const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const Visit = require("../models/Visit");

const router = express.Router();

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// POST /api/patients - add a patient
// Built with `new Patient()` + `.save()` (instead of `.create()`) so we can
// attach who's making the request to $locals before the audit "save" hook
// in middleware/auditLog.js fires and reads it.
router.post("/", async (req, res) => {
  try {
    const patient = new Patient(req.body);
    patient.$locals.performedBy = req.userId || "unknown";
    patient.$locals.role = req.role || "unknown";
    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/patients - list all patients
router.get("/", async (req, res) => {
  const patients = await Patient.find();
  res.status(200).json(patients);
});

// GET /api/patients/:id/history - this patient's full visit history
//
// Privacy rule (the "privacy-aware" part of the task):
//   - a doctor can view any patient's history
//   - a patient can only view their OWN history (req.userId must match :id)
//   - anyone else gets 403, not an empty list, so it's obvious access was denied
router.get("/:id/history", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ error: "Invalid patient id" });
    }

    const isOwner = req.role === "patient" && req.userId === id;
    const isDoctor = req.role === "doctor";
    if (!isOwner && !isDoctor) {
      return res.status(403).json({ error: "Not allowed to view this patient's history" });
    }

    const patient = await Patient.findById(id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const visits = await Visit.find({ patient: id })
      .populate("doctor", "name specialization")
      .sort({ startTime: -1 });

    res.status(200).json({ patient, visits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

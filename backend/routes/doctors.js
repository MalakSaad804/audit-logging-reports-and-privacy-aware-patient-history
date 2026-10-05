const express = require("express");
const Doctor = require("../models/Doctor");

const router = express.Router();

// POST /api/doctors - add a doctor
router.post("/", async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    doctor.$locals.performedBy = req.userId || "unknown";
    doctor.$locals.role = req.role || "unknown";
    await doctor.save();
    res.status(201).json(doctor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/doctors - list all doctors
router.get("/", async (req, res) => {
  const doctors = await Doctor.find();
  res.status(200).json(doctors);
});

module.exports = router;

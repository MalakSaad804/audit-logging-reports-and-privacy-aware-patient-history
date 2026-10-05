const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const Visit = require("../models/Visit");
const Doctor = require("../models/Doctor");
const { upload } = require("../middleware/upload");

const router = express.Router();

const SLOT_MINUTES = 30;

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// GET /api/visits/slots?doctorId=...&date=YYYY-MM-DD
// Returns every slot for that day, each marked available or booked.
// The frontend calendar uses this to show what a doctor can be booked for.
router.get("/slots", async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ error: "doctorId and date are required" });
    }
    if (!isValidId(doctorId)) {
      return res.status(400).json({ error: "Invalid doctorId" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    const [year, month, day] = date.split("-").map(Number);
    const [startH, startM] = doctor.workStart.split(":").map(Number);
    const [endH, endM] = doctor.workEnd.split(":").map(Number);

    const dayStart = new Date(year, month - 1, day, startH, startM, 0, 0);
    const dayEnd = new Date(year, month - 1, day, endH, endM, 0, 0);

    const existingVisits = await Visit.find({
      doctor: doctorId,
      status: { $ne: "cancelled" },
      startTime: { $gte: dayStart, $lt: dayEnd },
    });

    const slots = [];
    let cursor = new Date(dayStart);
    while (cursor < dayEnd) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + SLOT_MINUTES * 60000);

      const booked = existingVisits.find(
        (v) => v.startTime.getTime() === slotStart.getTime()
      );

      slots.push({
        start: slotStart,
        end: slotEnd,
        available: !booked,
        visitId: booked ? booked._id : null,
      });

      cursor = slotEnd;
    }

    res.status(200).json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/visits - list visits, optionally filtered by doctor and date range
// Used to populate the calendar with already-booked events.
router.get("/", async (req, res) => {
  try {
    const { doctorId, from, to } = req.query;
    const filter = {};
    if (doctorId) filter.doctor = doctorId;
    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) filter.startTime.$lte = new Date(to);
    }
    const visits = await Visit.find(filter)
      .populate("patient", "name phone")
      .populate("doctor", "name specialization")
      .sort({ startTime: 1 });
    res.status(200).json(visits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/visits/:id - a single visit's detail (patient, doctor, notes, prescription)
router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: "Invalid visit id" });
    }
    const visit = await Visit.findById(req.params.id)
      .populate("patient")
      .populate("doctor");
    if (!visit) return res.status(404).json({ error: "Visit not found" });
    res.status(200).json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/visits - schedule a new visit
// Rejects the request if the doctor already has a visit at that exact start time.
router.post("/", async (req, res) => {
  try {
    const { patient, doctor, startTime, endTime, notes } = req.body;

    if (!patient || !doctor || !startTime || !endTime) {
      return res
        .status(400)
        .json({ error: "patient, doctor, startTime and endTime are required" });
    }
    if (!isValidId(patient) || !isValidId(doctor)) {
      return res.status(400).json({ error: "Invalid patient or doctor id" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start) || isNaN(end) || end <= start) {
      return res.status(400).json({ error: "Invalid startTime/endTime" });
    }

    // Overlap check: does the doctor already have an active visit that overlaps this range?
    const clash = await Visit.findOne({
      doctor,
      status: { $ne: "cancelled" },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });
    if (clash) {
      return res.status(409).json({ error: "This slot is already booked" });
    }

    const visit = new Visit({
      patient,
      doctor,
      startTime: start,
      endTime: end,
      notes: notes || "",
    });
    visit.$locals.performedBy = req.userId || "unknown";
    visit.$locals.role = req.role || "unknown";
    await visit.save();

    res.status(201).json(visit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/visits/:id - update status/notes (e.g. mark completed, cancel, add visit notes)
router.patch("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: "Invalid visit id" });
    }
    const allowedUpdates = ["status", "notes", "startTime", "endTime"];
    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const visit = await Visit.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
      performedBy: req.userId || "unknown",
      role: req.role || "unknown",
    });
    if (!visit) return res.status(404).json({ error: "Visit not found" });
    res.status(200).json(visit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/visits/:id - cancel/remove a visit
router.delete("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: "Invalid visit id" });
    }
    const visit = await Visit.findByIdAndDelete(req.params.id, {
      performedBy: req.userId || "unknown",
      role: req.role || "unknown",
    });
    if (!visit) return res.status(404).json({ error: "Visit not found" });
    res.status(200).json({ message: "Visit deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/visits/:id/prescription - upload a prescription image for a visit
// multer's fileFilter + limits already reject the wrong type/size before this runs;
// this handler just has to catch that rejection and respond with a clean 400.
router.post("/:id/prescription", (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid visit id" });
  }

  upload.single("prescription")(req, res, async (err) => {
    if (err) {
      const message =
        err.message === "INVALID_FILE_TYPE"
          ? "Only PNG, JPG and WEBP images are allowed"
          : err.code === "LIMIT_FILE_SIZE"
          ? "File must be 5MB or smaller"
          : err.message;
      return res.status(400).json({ error: message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const url = `/uploads/prescriptions/${path.basename(req.file.path)}`;
      const visit = await Visit.findByIdAndUpdate(
        req.params.id,
        { prescriptionUrl: url },
        { new: true }
      );
      if (!visit) return res.status(404).json({ error: "Visit not found" });
      res.status(200).json({ url, visit });
    } catch (dbErr) {
      res.status(500).json({ error: dbErr.message });
    }
  });
});

module.exports = router;

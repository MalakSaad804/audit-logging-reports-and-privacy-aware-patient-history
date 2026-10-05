const express = require("express");
const mongoose = require("mongoose");
const Visit = require("../models/Visit");
const Audit = require("../models/Audit");
const { requireDoctor } = require("../middleware/auth");

const router = express.Router();

// Reports expose stats across every patient, so they're doctor-only -
// this is the other half of the "role-based data filtering" requirement
// (patient history in routes/patients.js is the patient-facing half).
router.use(requireDoctor);

// GET /api/reports/appointments-per-doctor?doctorId=&year=&month=
// Aggregated appointment counts, grouped by doctor and calendar month.
router.get("/appointments-per-doctor", async (req, res) => {
  try {
    const { doctorId, year, month } = req.query;

    const match = { status: { $ne: "cancelled" } };
    if (doctorId) {
      if (!mongoose.Types.ObjectId.isValid(doctorId)) {
        return res.status(400).json({ error: "Invalid doctorId" });
      }
      match.doctor = new mongoose.Types.ObjectId(doctorId);
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            doctor: "$doctor",
            year: { $year: "$startTime" },
            month: { $month: "$startTime" },
          },
          totalVisits: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          booked: {
            $sum: { $cond: [{ $eq: ["$status", "booked"] }, 1, 0] },
          },
        },
      },
    ];

    if (year) pipeline.push({ $match: { "_id.year": Number(year) } });
    if (month) pipeline.push({ $match: { "_id.month": Number(month) } });

    pipeline.push(
      {
        $lookup: {
          from: "doctors",
          localField: "_id.doctor",
          foreignField: "_id",
          as: "doctorInfo",
        },
      },
      { $unwind: "$doctorInfo" },
      {
        $project: {
          _id: 0,
          doctorId: "$_id.doctor",
          doctorName: "$doctorInfo.name",
          year: "$_id.year",
          month: "$_id.month",
          totalVisits: 1,
          completed: 1,
          booked: 1,
        },
      },
      { $sort: { year: -1, month: -1, totalVisits: -1 } }
    );

    const report = await Visit.aggregate(pipeline);
    res.status(200).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/audit-logs?model=&documentId=&limit=
// Lets a doctor inspect the audit trail - who created/changed/deleted what, and when.
router.get("/audit-logs", async (req, res) => {
  try {
    const { model, documentId, limit } = req.query;
    const filter = {};
    if (model) filter.model = model;
    if (documentId) {
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return res.status(400).json({ error: "Invalid documentId" });
      }
      filter.documentId = documentId;
    }

    const logs = await Audit.find(filter)
      .sort({ timestamp: -1 })
      .limit(Math.min(Number(limit) || 50, 200));

    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require("express");
const cors = require("cors");
const path = require("path");

const doctorRoutes = require("./routes/doctors");
const patientRoutes = require("./routes/patients");
const visitRoutes = require("./routes/visits");
const reportRoutes = require("./routes/reports");
const { identify } = require("./middleware/auth");

const app = express();

app.use(cors());
app.use(express.json());

// Reads x-role / x-user-id headers into req.role / req.userId (see middleware/auth.js)
app.use(identify);

// Serve uploaded prescription images so the frontend can show them as <img src="...">
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api/health", (req, res) => res.status(200).json({ status: "ok" }));

module.exports = app;

import React, { useEffect, useState } from "react";
import { getDoctors, getPatients } from "./api";
import AppointmentCalendar from "./components/AppointmentCalendar";

export default function App() {
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctorId, setDoctorId] = useState("");

  useEffect(() => {
    getDoctors().then((docs) => {
      setDoctors(docs);
      if (docs.length) setDoctorId(docs[0]._id);
    });
    getPatients().then(setPatients);
  }, []);

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "28px auto",
        padding: "0 20px 30px",
        fontFamily: "Inter, sans-serif",
        color: "#1f2937",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)",
          border: "1px solid #dbeafe",
          borderRadius: 18,
          padding: "20px 22px",
          marginBottom: 18,
          boxShadow: "0 10px 28px rgba(37, 99, 235, 0.08)",
        }}
      >
        <h1
          style={{
            margin: "0 0 14px",
            fontSize: 32,
            color: "#0f172a",
            letterSpacing: "-0.03em",
          }}
        >
          Appointment Calendar
        </h1>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontWeight: 700,
            color: "#334155",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 15 }}>Doctor:</span>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            style={{
              minWidth: 290,
              padding: "11px 14px",
              borderRadius: 12,
              border: "1px solid #bfdbfe",
              background: "#ffffff",
              fontSize: 15,
              color: "#0f172a",
              outline: "none",
              boxShadow: "0 0 0 3px rgba(59,130,246,0.08)",
            }}
          >
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} - {d.specialization}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p
        style={{
          fontSize: 13,
          color: "#475569",
          margin: "0 0 18px",
          lineHeight: 1.7,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "12px 14px",
        }}
      >
        Click an empty slot to book a visit. Drag or resize a booked visit to
        reschedule it. Click a visit to view details and upload a prescription.
      </p>

      {doctorId && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 14,
            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
          }}
        >
          <AppointmentCalendar doctorId={doctorId} patients={patients} />
        </div>
      )}
    </div>
  );
}

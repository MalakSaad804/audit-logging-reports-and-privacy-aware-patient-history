import React, { useState } from "react";
import { createVisit } from "../api";

export default function BookingModal({ slot, doctorId, patients, onClose, onBooked }) {
  const [patientId, setPatientId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const uniquePatients = Array.from(
    new Map((patients || []).map((p) => [p._id || p.name, p])).values()
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!patientId) {
      setError("Please choose a patient.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const visit = await createVisit({
        patient: patientId,
        doctor: doctorId,
        startTime: slot.start.toISOString(),
        endTime: slot.end.toISOString(),
        notes,
      });
      onBooked(visit);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not book this slot.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" style={backdropStyle}>
      <div className="modal" style={modalStyle}>
        <h3 style={{ margin: "0 0 10px", fontSize: 24, color: "#0f172a" }}>
          Book appointment
        </h3>
        <p style={{ fontSize: 13, color: "#475569", marginBottom: 16 }}>
          {slot.start.toLocaleString()} - {slot.end.toLocaleTimeString()}
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: 14, fontWeight: 600, color: "#334155" }}>
            Patient
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
              }}
            >
              <option value="">Select patient</option>
              {uniquePatients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", marginBottom: 14, fontWeight: 600, color: "#334155" }}>
            Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                resize: "vertical",
              }}
            />
          </label>

          {error && <p style={{ color: "#c0392b", margin: "0 0 12px" }}>{error}</p>}

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {saving ? "Booking..." : "Book slot"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#e2e8f0",
                color: "#0f172a",
                border: "none",
                borderRadius: 10,
                padding: "10px 14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalStyle = {
  background: "#fff",
  padding: 24,
  borderRadius: 16,
  width: 360,
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.18)",
};

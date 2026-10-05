import React, { useState } from "react";
import { updateVisit, deleteVisit } from "../api";
import PrescriptionUpload from "./PrescriptionUpload";

export default function VisitDetail({ visit, onClose, onChanged }) {
  const [current, setCurrent] = useState(visit);
  const [notes, setNotes] = useState(visit.notes || "");
  const [saving, setSaving] = useState(false);

  async function saveNotes() {
    setSaving(true);
    try {
      const updated = await updateVisit(current._id, { notes });
      setCurrent(updated);
      onChanged(updated);
    } finally {
      setSaving(false);
    }
  }

  async function markCompleted() {
    const updated = await updateVisit(current._id, { status: "completed" });
    setCurrent(updated);
    onChanged(updated);
  }

  async function cancelVisit() {
    await deleteVisit(current._id);
    onChanged(null, current._id);
    onClose();
  }

  return (
    <div className="modal-backdrop" style={backdropStyle}>
      <div className="modal" style={modalStyle}>
        <h3 style={{ margin: "0 0 12px", fontSize: 24, color: "#0f172a" }}>
          Visit details
        </h3>
        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, margin: "0 0 12px" }}>
          Patient: <strong>{current.patient?.name || "N/A"}</strong>
          <br />
          Status: <span style={{ fontWeight: 700 }}>{current.status}</span>
          <br />
          {new Date(current.startTime).toLocaleString()}
        </p>

        <label style={{ display: "block", margin: "10px 0 14px", fontWeight: 600, color: "#334155" }}>
          Visit notes
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
        <button
          onClick={saveNotes}
          disabled={saving}
          style={{
            width: "100%",
            background: "#0f172a",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 10,
          }}
        >
          {saving ? "Saving..." : "Save notes"}
        </button>

        <hr style={{ margin: "16px 0", border: "0", borderTop: "1px solid #e2e8f0" }} />

        <PrescriptionUpload visit={current} onUploaded={(v) => { setCurrent(v); onChanged(v); }} />

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {current.status !== "completed" && (
            <button
              onClick={markCompleted}
              style={{
                background: "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Mark completed
            </button>
          )}
          <button
            onClick={cancelVisit}
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              border: "none",
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel visit
          </button>
          <button
            onClick={onClose}
            style={{
              background: "#e2e8f0",
              color: "#0f172a",
              border: "none",
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.58)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalStyle = {
  background: "#fff",
  padding: 24,
  borderRadius: 18,
  width: 380,
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.18)",
};

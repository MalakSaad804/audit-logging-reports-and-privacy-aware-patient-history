import React, { useState } from "react";
import { uploadPrescription, fileUrl } from "../api";

// Keep these in sync with the backend's ALLOWED_TYPES / MAX_SIZE_BYTES in middleware/upload.js
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function PrescriptionUpload({ visit, onUploaded }) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(visit.prescriptionUrl || null);

  function validate(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Only PNG, JPG and WEBP images are allowed.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return "File must be 5MB or smaller.";
    }
    return "";
  }

  async function handleChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setUploading(true);
    try {
      const result = await uploadPrescription(visit._id, file);
      setPreview(result.url);
      if (onUploaded) onUploaded(result.visit);
    } catch (err) {
      setError(err?.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="prescription-upload">
      <label className="upload-label">
        {uploading ? "Uploading..." : "Upload prescription image"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleChange}
          disabled={uploading}
          style={{ display: "block", marginTop: 6 }}
        />
      </label>

      {error && <p className="upload-error" style={{ color: "#c0392b" }}>{error}</p>}

      {preview && (
        <div className="prescription-thumb" style={{ marginTop: 10 }}>
          <p style={{ fontSize: 12, marginBottom: 4 }}>Prescription:</p>
          <a href={preview.startsWith("http") ? preview : fileUrl(preview)} target="_blank" rel="noreferrer">
            <img
              src={preview.startsWith("http") ? preview : fileUrl(preview)}
              alt="Prescription thumbnail"
              style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 6, border: "1px solid #ddd" }}
            />
          </a>
        </div>
      )}
    </div>
  );
}

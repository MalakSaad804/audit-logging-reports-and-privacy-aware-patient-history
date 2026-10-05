import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const api = axios.create({ baseURL: BASE_URL });

export const getDoctors = () => api.get("/doctors").then((r) => r.data);

export const getPatients = () => api.get("/patients").then((r) => r.data);

export const getVisits = (doctorId) =>
  api
    .get("/visits", { params: doctorId ? { doctorId } : {} })
    .then((r) => r.data);

export const getSlots = (doctorId, date) =>
  api.get("/visits/slots", { params: { doctorId, date } }).then((r) => r.data);

export const createVisit = (payload) =>
  api.post("/visits", payload).then((r) => r.data);

export const updateVisit = (id, payload) =>
  api.patch(`/visits/${id}`, payload).then((r) => r.data);

export const deleteVisit = (id) =>
  api.delete(`/visits/${id}`).then((r) => r.data);

export const uploadPrescription = (visitId, file) => {
  const formData = new FormData();
  formData.append("prescription", file);
  return api
    .post(`/visits/${visitId}/prescription`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

// Turns a relative "/uploads/..." path from the backend into a full URL the <img> tag can load
export const fileUrl = (relativePath) => {
  const origin = BASE_URL.replace(/\/api$/, "");
  return `${origin}${relativePath}`;
};

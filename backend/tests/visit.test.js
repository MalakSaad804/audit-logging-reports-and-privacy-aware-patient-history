const request = require("supertest");
const app = require("../app");
const { connect, closeDatabase, clearDatabase } = require("./setup");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

async function makeDoctorAndPatient() {
  const doctor = await Doctor.create({
    name: "Dr. Aisha Khan",
    specialization: "Dermatology",
    phone: "0300-1111111",
    workStart: "09:00",
    workEnd: "12:00",
  });
  const patient = await Patient.create({
    name: "Malak Saad",
    age: 22,
    gender: "female",
    phone: "0300-2222222",
  });
  return { doctor, patient };
}

describe("Visit scheduling", () => {
  test("creates a visit with valid data", async () => {
    const { doctor, patient } = await makeDoctorAndPatient();

    const res = await request(app)
      .post("/api/visits")
      .send({
        patient: patient._id,
        doctor: doctor._id,
        startTime: "2026-10-01T09:00:00.000Z",
        endTime: "2026-10-01T09:30:00.000Z",
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("booked");
  });

  test("rejects a visit missing required fields", async () => {
    const res = await request(app).post("/api/visits").send({});
    expect(res.status).toBe(400);
  });

  test("rejects double-booking the same doctor at an overlapping time", async () => {
    const { doctor, patient } = await makeDoctorAndPatient();

    await request(app).post("/api/visits").send({
      patient: patient._id,
      doctor: doctor._id,
      startTime: "2026-10-01T09:00:00.000Z",
      endTime: "2026-10-01T09:30:00.000Z",
    });

    const clash = await request(app).post("/api/visits").send({
      patient: patient._id,
      doctor: doctor._id,
      startTime: "2026-10-01T09:15:00.000Z",
      endTime: "2026-10-01T09:45:00.000Z",
    });

    expect(clash.status).toBe(409);
  });

  test("GET /api/visits/slots marks booked slots correctly", async () => {
    const { doctor, patient } = await makeDoctorAndPatient();

    await request(app).post("/api/visits").send({
      patient: patient._id,
      doctor: doctor._id,
      startTime: "2026-10-01T09:00:00.000Z",
      endTime: "2026-10-01T09:30:00.000Z",
    });

    const res = await request(app)
      .get("/api/visits/slots")
      .query({ doctorId: doctor._id.toString(), date: "2026-10-01" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const bookedSlot = res.body.find((s) => s.available === false);
    expect(bookedSlot).toBeDefined();
  });

  test("PATCH updates visit status to completed", async () => {
    const { doctor, patient } = await makeDoctorAndPatient();
    const created = await request(app).post("/api/visits").send({
      patient: patient._id,
      doctor: doctor._id,
      startTime: "2026-10-01T09:00:00.000Z",
      endTime: "2026-10-01T09:30:00.000Z",
    });

    const res = await request(app)
      .patch(`/api/visits/${created.body._id}`)
      .send({ status: "completed" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
  });

  test("DELETE removes a visit", async () => {
    const { doctor, patient } = await makeDoctorAndPatient();
    const created = await request(app).post("/api/visits").send({
      patient: patient._id,
      doctor: doctor._id,
      startTime: "2026-10-01T09:00:00.000Z",
      endTime: "2026-10-01T09:30:00.000Z",
    });

    const res = await request(app).delete(`/api/visits/${created.body._id}`);
    expect(res.status).toBe(200);

    const check = await request(app).get(`/api/visits/${created.body._id}`);
    expect(check.status).toBe(404);
  });
});

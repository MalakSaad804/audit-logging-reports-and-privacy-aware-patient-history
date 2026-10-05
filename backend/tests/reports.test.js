const request = require("supertest");
const app = require("../app");
const { connect, closeDatabase, clearDatabase } = require("./setup");

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

const doctorHeaders = { "x-role": "doctor", "x-user-id": "tester-doctor" };
const patientHeaders = { "x-role": "patient", "x-user-id": "someone" };

async function seed() {
  const doctor = await request(app).post("/api/doctors").set(doctorHeaders).send({
    name: "Dr. Hina",
    specialization: "Cardiology",
    phone: "0300-9999999",
  });
  const patient = await request(app).post("/api/patients").set(doctorHeaders).send({
    name: "Report Patient",
    age: 35,
    gender: "female",
    phone: "0300-8888888",
  });

  // Two visits in the same month, one in a different month
  await request(app).post("/api/visits").set(doctorHeaders).send({
    patient: patient.body._id,
    doctor: doctor.body._id,
    startTime: "2026-11-05T09:00:00.000Z",
    endTime: "2026-11-05T09:30:00.000Z",
  });
  await request(app).post("/api/visits").set(doctorHeaders).send({
    patient: patient.body._id,
    doctor: doctor.body._id,
    startTime: "2026-11-10T09:00:00.000Z",
    endTime: "2026-11-10T09:30:00.000Z",
  });
  await request(app).post("/api/visits").set(doctorHeaders).send({
    patient: patient.body._id,
    doctor: doctor.body._id,
    startTime: "2026-12-01T09:00:00.000Z",
    endTime: "2026-12-01T09:30:00.000Z",
  });

  return { doctor, patient };
}

describe("Appointment reports", () => {
  test("groups and counts visits per doctor per month", async () => {
    const { doctor } = await seed();

    const res = await request(app)
      .get("/api/reports/appointments-per-doctor")
      .set(doctorHeaders);

    expect(res.status).toBe(200);
    const novEntry = res.body.find((r) => r.doctorId === doctor.body._id && r.month === 11);
    const decEntry = res.body.find((r) => r.doctorId === doctor.body._id && r.month === 12);

    expect(novEntry.totalVisits).toBe(2);
    expect(decEntry.totalVisits).toBe(1);
  });

  test("filters by doctorId and month query params", async () => {
    const { doctor } = await seed();

    const res = await request(app)
      .get("/api/reports/appointments-per-doctor")
      .query({ doctorId: doctor.body._id, month: 11, year: 2026 })
      .set(doctorHeaders);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].totalVisits).toBe(2);
  });

  test("rejects access from a non-doctor role", async () => {
    await seed();

    const res = await request(app)
      .get("/api/reports/appointments-per-doctor")
      .set(patientHeaders);

    expect(res.status).toBe(403);
  });

  test("audit-logs endpoint lists recent entries for a doctor", async () => {
    const { doctor } = await seed();

    const res = await request(app)
      .get("/api/reports/audit-logs")
      .query({ model: "Doctor", documentId: doctor.body._id })
      .set(doctorHeaders);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].model).toBe("Doctor");
  });
});

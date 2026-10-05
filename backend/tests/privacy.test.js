const request = require("supertest");
const app = require("../app");
const { connect, closeDatabase, clearDatabase } = require("./setup");

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

const doctorHeaders = { "x-role": "doctor", "x-user-id": "tester-doctor" };

async function seed() {
  const doctor = await request(app).post("/api/doctors").set(doctorHeaders).send({
    name: "Dr. Kamran",
    specialization: "Dermatology",
    phone: "0300-1212121",
  });
  const patientA = await request(app).post("/api/patients").set(doctorHeaders).send({
    name: "Patient A",
    age: 28,
    gender: "female",
    phone: "0300-3434343",
  });
  const patientB = await request(app).post("/api/patients").set(doctorHeaders).send({
    name: "Patient B",
    age: 45,
    gender: "male",
    phone: "0300-5656565",
  });
  await request(app).post("/api/visits").set(doctorHeaders).send({
    patient: patientA.body._id,
    doctor: doctor.body._id,
    startTime: "2026-11-15T09:00:00.000Z",
    endTime: "2026-11-15T09:30:00.000Z",
    notes: "Follow-up for patient A",
  });
  return { doctor, patientA, patientB };
}

describe("Patient history privacy", () => {
  test("a patient CAN view their own history", async () => {
    const { patientA } = await seed();

    const res = await request(app)
      .get(`/api/patients/${patientA.body._id}/history`)
      .set({ "x-role": "patient", "x-user-id": patientA.body._id });

    expect(res.status).toBe(200);
    expect(res.body.visits).toHaveLength(1);
  });

  test("a patient CANNOT view another patient's history", async () => {
    const { patientA, patientB } = await seed();

    const res = await request(app)
      .get(`/api/patients/${patientA.body._id}/history`)
      .set({ "x-role": "patient", "x-user-id": patientB.body._id });

    expect(res.status).toBe(403);
  });

  test("a doctor CAN view any patient's history", async () => {
    const { patientA } = await seed();

    const res = await request(app)
      .get(`/api/patients/${patientA.body._id}/history`)
      .set(doctorHeaders);

    expect(res.status).toBe(200);
    expect(res.body.visits).toHaveLength(1);
  });

  test("an unknown/missing role is rejected", async () => {
    const { patientA } = await seed();

    const res = await request(app).get(`/api/patients/${patientA.body._id}/history`);

    expect(res.status).toBe(403);
  });
});

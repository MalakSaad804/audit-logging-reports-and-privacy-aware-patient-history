const request = require("supertest");
const app = require("../app");
const { connect, closeDatabase, clearDatabase } = require("./setup");
const Audit = require("../models/Audit");

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

const doctorHeaders = { "x-role": "doctor", "x-user-id": "tester-doctor" };

describe("Audit logging", () => {
  test("creating a doctor writes a 'create' audit entry", async () => {
    const res = await request(app)
      .post("/api/doctors")
      .set(doctorHeaders)
      .send({ name: "Dr. Sana", specialization: "ENT", phone: "0300-1234567" });

    expect(res.status).toBe(201);

    const logs = await Audit.find({ model: "Doctor", documentId: res.body._id });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("create");
    expect(logs[0].performedBy).toBe("tester-doctor");
  });

  test("updating a visit writes an 'update' audit entry", async () => {
    const doctor = await request(app).post("/api/doctors").set(doctorHeaders).send({
      name: "Dr. Omar",
      specialization: "General",
      phone: "0300-1111111",
    });
    const patient = await request(app).post("/api/patients").set(doctorHeaders).send({
      name: "Test Patient",
      age: 25,
      gender: "male",
      phone: "0300-2222222",
    });
    const visit = await request(app).post("/api/visits").set(doctorHeaders).send({
      patient: patient.body._id,
      doctor: doctor.body._id,
      startTime: "2026-11-01T09:00:00.000Z",
      endTime: "2026-11-01T09:30:00.000Z",
    });

    await request(app)
      .patch(`/api/visits/${visit.body._id}`)
      .set(doctorHeaders)
      .send({ status: "completed" });

    const logs = await Audit.find({ model: "Visit", documentId: visit.body._id }).sort({
      timestamp: 1,
    });
    expect(logs.map((l) => l.action)).toEqual(["create", "update"]);
  });

  test("deleting a visit writes a 'delete' audit entry", async () => {
    const doctor = await request(app).post("/api/doctors").set(doctorHeaders).send({
      name: "Dr. Bilal",
      specialization: "General",
      phone: "0300-3333333",
    });
    const patient = await request(app).post("/api/patients").set(doctorHeaders).send({
      name: "Another Patient",
      age: 40,
      gender: "female",
      phone: "0300-4444444",
    });
    const visit = await request(app).post("/api/visits").set(doctorHeaders).send({
      patient: patient.body._id,
      doctor: doctor.body._id,
      startTime: "2026-11-02T09:00:00.000Z",
      endTime: "2026-11-02T09:30:00.000Z",
    });

    await request(app).delete(`/api/visits/${visit.body._id}`).set(doctorHeaders);

    const logs = await Audit.find({ model: "Visit", documentId: visit.body._id, action: "delete" });
    expect(logs).toHaveLength(1);
  });
});

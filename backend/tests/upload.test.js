const request = require("supertest");
const path = require("path");
const app = require("../app");
const { connect, closeDatabase, clearDatabase } = require("./setup");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Visit = require("../models/Visit");

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

async function makeVisit() {
  const doctor = await Doctor.create({
    name: "Dr. Bilal",
    specialization: "General",
    phone: "0300-3333333",
  });
  const patient = await Patient.create({
    name: "Test Patient",
    age: 30,
    gender: "male",
    phone: "0300-4444444",
  });
  return Visit.create({
    patient: patient._id,
    doctor: doctor._id,
    startTime: new Date("2026-10-02T09:00:00.000Z"),
    endTime: new Date("2026-10-02T09:30:00.000Z"),
  });
}

describe("Prescription upload", () => {
  test("accepts a valid PNG image and returns a URL", async () => {
    const visit = await makeVisit();

    const res = await request(app)
      .post(`/api/visits/${visit._id}/prescription`)
      .attach("prescription", path.join(__dirname, "fixtures/sample.png"));

    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/\/uploads\/prescriptions\//);

    const updated = await Visit.findById(visit._id);
    expect(updated.prescriptionUrl).toBe(res.body.url);
  });

  test("rejects a non-image file", async () => {
    const visit = await makeVisit();

    const res = await request(app)
      .post(`/api/visits/${visit._id}/prescription`)
      .attach("prescription", path.join(__dirname, "fixtures/sample.txt"));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/PNG|JPG|WEBP/i);
  });

  test("rejects an oversized file", async () => {
    const visit = await makeVisit();
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 1); // 6MB, over the 5MB limit

    const res = await request(app)
      .post(`/api/visits/${visit._id}/prescription`)
      .attach("prescription", bigBuffer, {
        filename: "big.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/5MB/);
  });

  test("returns 404 for an unknown visit id", async () => {
    const fakeId = "605c5f1f1f1f1f1f1f1f1f1f";
    const res = await request(app)
      .post(`/api/visits/${fakeId}/prescription`)
      .attach("prescription", path.join(__dirname, "fixtures/sample.png"));

    expect(res.status).toBe(404);
  });
});

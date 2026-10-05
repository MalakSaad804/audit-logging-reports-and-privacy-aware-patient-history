# Appointment Calendar + Visit Notes with Prescription Uploads

A small full-stack app: doctors have a calendar of appointment slots,
patients get booked into visits, and a prescription image can be
attached to each visit.

## Stack
- **Backend:** Node.js, Express, MongoDB (Mongoose), Multer for file uploads
- **Frontend:** React, `react-big-calendar` (with drag-and-drop), Axios

## Project structure
```
backend/
  models/        Patient, Doctor, Visit, Audit (Mongoose schemas)
  middleware/
    upload.js     multer config (file type + size validation)
    auditLog.js   attaches audit-logging hooks to a schema
    auth.js       reads x-role / x-user-id headers (stand-in for real login)
  routes/         doctors.js, patients.js, visits.js, reports.js
  tests/          Jest + Supertest, using an in-memory MongoDB
  app.js          Express app (exported for tests)
  server.js       connects to MongoDB and starts the server
frontend/
  src/
    api.js                        all HTTP calls to the backend
    App.jsx                       doctor picker + calendar
    components/
      AppointmentCalendar.jsx     the calendar (slots, drag-and-drop reschedule)
      BookingModal.jsx            form shown when you click an empty slot
      VisitDetail.jsx             visit info, notes, prescription upload
      PrescriptionUpload.jsx      file input with client-side validation + thumbnail
```

## Running it locally

### 1. Backend
```bash
cd backend
cp .env.example .env      # edit MONGO_URI if needed
npm install
npm run dev                # starts on http://localhost:5000
```
You need a MongoDB instance running locally (or an Atlas connection
string in `.env`).

Seed a doctor and a patient so the calendar has something to show
(there's no admin UI for this yet — use curl or Postman):
```bash
curl -X POST http://localhost:5000/api/doctors \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr. Aisha Khan","specialization":"Dermatology","phone":"0300-1111111"}'

curl -X POST http://localhost:5000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"name":"Malak Saad","age":22,"gender":"female","phone":"0300-2222222"}'
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env       # points at http://localhost:5000/api by default
npm install
npm start                  # opens http://localhost:3000
```

### 3. Tests
```bash
cd backend
npm test
```
Tests use `mongodb-memory-server`, which downloads a small MongoDB
binary the first time you run it — that needs an internet connection
but does not touch your real database.

## Identity headers (there's no login system)

This project has no sign-in flow, so instead of a real session/JWT,
every request carries two headers that stand in for "who's asking":

```
x-role:    patient | doctor
x-user-id: the Mongo _id of that patient or doctor
```

`middleware/auth.js` reads these into `req.role` / `req.userId`, and
that's what the audit log and the patient-history privacy check use.
For example, to view your own history as a patient:
```bash
curl http://localhost:5000/api/patients/<patientId>/history \
  -H "x-role: patient" -H "x-user-id: <patientId>"
```
...or as a doctor viewing any patient's history / the reports:
```bash
curl http://localhost:5000/api/reports/appointments-per-doctor \
  -H "x-role: doctor" -H "x-user-id: <doctorId>"
```
In a real app, a login system would set these from a verified
session instead of trusting whatever the client sends.

## API endpoints

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/doctors` | add a doctor |
| GET | `/api/doctors` | list doctors |
| POST | `/api/patients` | add a patient |
| GET | `/api/patients` | list patients |
| GET | `/api/visits?doctorId=&from=&to=` | list visits (for the calendar) |
| GET | `/api/visits/slots?doctorId=&date=YYYY-MM-DD` | 30-minute slots for a day, each marked available/booked |
| POST | `/api/visits` | book a visit `{ patient, doctor, startTime, endTime, notes }` — rejects overlapping bookings with `409` |
| GET | `/api/visits/:id` | one visit's full detail |
| PATCH | `/api/visits/:id` | update status/notes/time (e.g. mark completed, reschedule) |
| DELETE | `/api/visits/:id` | cancel a visit |
| POST | `/api/visits/:id/prescription` | upload a prescription image (`multipart/form-data`, field name `prescription`) — PNG/JPG/WEBP only, 5MB max |
| GET | `/api/patients/:id/history` | a patient's full visit history — requires `x-role`/`x-user-id`; a patient can only fetch their own (`403` otherwise), a doctor can fetch any |
| GET | `/api/reports/appointments-per-doctor?doctorId=&year=&month=` | doctor-only (`403` for non-doctors). Aggregated visit counts per doctor per month (total/completed/booked) |
| GET | `/api/reports/audit-logs?model=&documentId=&limit=` | doctor-only. Recent audit trail entries, newest first |

## How this meets the task's "done" checklist
- **Audit log records action, user, timestamp, and affected document** — `middleware/auditLog.js` hooks into every Patient/Doctor/Visit create, update and delete, writing an `Audit` document with `action`, `model`, `documentId`, `performedBy`, `role`, `changes`, and `timestamp` every time.
- **Reports endpoint returns aggregated counts per doctor per month** — `GET /api/reports/appointments-per-doctor` uses a Mongoose aggregation pipeline (`$group` by doctor + year + month, with a `$lookup` to attach the doctor's name).
- **Patient history endpoint filters data based on role** — `GET /api/patients/:id/history` lets a doctor view any patient, but a patient only their own record (`403` otherwise).
- **Tests verify audit entries and privacy filtering** — `tests/audit.test.js` (create/update/delete each log correctly) and `tests/privacy.test.js` (patient can view own history, blocked from others', doctor has full access, missing role is rejected).
- **Performance: queries use indexes and aggregation pipeline** — `Audit` is indexed on `{ model, documentId, timestamp }` and `{ timestamp }`; `Visit` was already indexed on `{ doctor, startTime }` and `{ patient, startTime }` from the previous task, which the report's aggregation and the history lookup both rely on.
- **Calendar shows slots and booked visits** — `AppointmentCalendar.jsx` loads visits for the selected doctor and renders them as events on a `react-big-calendar` week view; empty slots are clickable.
- **Scheduling endpoint creates a visit with proper validation** — `POST /api/visits` checks required fields, valid ObjectIds, valid time range, and rejects a doctor double-booking with `409 Conflict`.
- **File upload endpoint accepts image files, stores them, and returns a URL** — `POST /api/visits/:id/prescription` uses Multer to validate MIME type and size (rejecting bad files with `400` before they're saved), stores the file under `backend/uploads/prescriptions/`, and returns its URL.
- **Frontend displays uploaded prescription thumbnails** — `PrescriptionUpload.jsx` shows a 120x120 thumbnail (linking to the full image) right after a successful upload, and re-shows it if the visit already has one.
- **Tests cover scheduling and upload logic** — `tests/visit.test.js` (create, reject missing fields, reject double-booking, slot listing, update, delete) and `tests/upload.test.js` (valid image accepted, wrong type rejected, oversized file rejected, unknown visit id).

## What I did / what was hard / what I left out (Task 4: audit logging, reports, privacy)
Added an `Audit` model and a reusable `attachAuditLogging()` helper
that wires Mongoose pre/post hooks (`save`, `findOneAndUpdate`,
`findOneAndDelete`) onto Patient, Doctor, and Visit, so every create,
update, and delete is logged automatically without each route having
to remember to do it. Built an aggregation-pipeline report endpoint
for appointment counts per doctor per month, and a patient-history
endpoint that enforces role-based access (patients see only their own
record, doctors see everyone's). Since this project has no login
system, I simulated identity with `x-role`/`x-user-id` request headers
read by `middleware/auth.js` — documented above, and clearly marked as
a stand-in for real authentication. The hardest part was getting
`performedBy`/`role` from the route into the Mongoose middleware
without breaking the actual database call: passing them as extra
query options worked, but only after I stripped those custom keys
back out of the options object in a `pre` hook before the query
reaches the MongoDB driver, since some driver versions reject options
they don't recognize. I left out real authentication/JWT (the header
simulation stands in for it, as agreed above), and left report
filtering to `doctorId`/`year`/`month` query params rather than a
full date-range picker, since that covered what the checklist asked
for.

## What I did / what was hard / what I left out (earlier task: calendar + uploads)
Built the Patient/Doctor/Visit models, the scheduling API with
double-booking prevention, a Multer-based upload endpoint with type
and size limits, and a React calendar with drag-and-drop rescheduling,
slot booking, and prescription thumbnails. The trickiest part was the
double-booking check — comparing time ranges correctly (`startTime <
newEnd AND endTime > newStart`) rather than just checking exact
matches, since a naive check let overlapping-but-not-identical slots
through. I left out authentication (any user can currently hit any
endpoint), doctor/patient management screens in the UI (they're
API-only for now), and email/SMS reminders, since none of those were
part of the completion checklist.

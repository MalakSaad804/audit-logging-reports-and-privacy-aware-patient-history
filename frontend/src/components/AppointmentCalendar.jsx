import React, { useEffect, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

import { getVisits, updateVisit } from "../api";
import BookingModal from "./BookingModal";
import VisitDetail from "./VisitDetail";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

function visitToEvent(visit) {
  return {
    id: visit._id,
    title: `${visit.patient?.name || "Patient"} (${visit.status})`,
    start: new Date(visit.startTime),
    end: new Date(visit.endTime),
    resource: visit,
  };
}

export default function AppointmentCalendar({ doctorId, patients }) {
  const [events, setEvents] = useState([]);
  const [pendingSlot, setPendingSlot] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [error, setError] = useState("");

  const loadVisits = useCallback(async () => {
    if (!doctorId) return;
    const visits = await getVisits(doctorId);
    setEvents(visits.map(visitToEvent));
  }, [doctorId]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  function handleSelectSlot({ start, end }) {
    setPendingSlot({ start, end });
  }

  function handleSelectEvent(event) {
    setSelectedVisit(event.resource);
  }

  // Drag-and-drop reschedule: move an existing visit to a new start/end
  async function handleEventDrop({ event, start, end }) {
    setError("");
    try {
      const updated = await updateVisit(event.id, {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? visitToEvent({ ...updated, patient: event.resource.patient }) : e))
      );
    } catch (err) {
      setError(err?.response?.data?.error || "Could not move that visit (slot may be taken).");
      loadVisits(); // revert to the server's actual state
    }
  }

  async function handleEventResize({ event, start, end }) {
    return handleEventDrop({ event, start, end });
  }

  function handleBooked(visit) {
    setPendingSlot(null);
    loadVisits();
  }

  function handleVisitChanged(updated, deletedId) {
    if (deletedId) {
      setEvents((prev) => prev.filter((e) => e.id !== deletedId));
      return;
    }
    loadVisits();
  }

  return (
    <div>
      {error && <p style={{ color: "#c0392b" }}>{error}</p>}
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        selectable
        resizable
        style={{ height: 600 }}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        defaultView="week"
      />

      {pendingSlot && (
        <BookingModal
          slot={pendingSlot}
          doctorId={doctorId}
          patients={patients}
          onClose={() => setPendingSlot(null)}
          onBooked={handleBooked}
        />
      )}

      {selectedVisit && (
        <VisitDetail
          visit={selectedVisit}
          onClose={() => setSelectedVisit(null)}
          onChanged={handleVisitChanged}
        />
      )}
    </div>
  );
}

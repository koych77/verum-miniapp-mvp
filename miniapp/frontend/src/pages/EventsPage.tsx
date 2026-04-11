import { useState } from "react";

import { api, EventItem } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

export function EventsPage({ events }: { events: EventItem[] }) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  async function handleRegister(eventId: string, disciplineTitle: string) {
    const key = `${eventId}:${disciplineTitle}`;
    setPendingKey(key);
    setMessage("");
    try {
      const response = await api.registerForEvent(eventId, disciplineTitle);
      setMessage(response.status === "already_registered" ? "You are already registered for this discipline." : "Registration added successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to register.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <SectionCard title="Events" subtitle="Vertical list with exact date and registration status">
      {message ? <div className="status-banner">{message}</div> : null}
      <div className="event-column">
        {events.map((event) => (
          <article key={event.id} className="event-card">
            <img src={event.poster_url ?? "https://dummyimage.com/900x1200/111111/ff7a00&text=VERUM+EVENT"} alt={event.title} />
            <div className="event-card-body">
              <div className="event-meta">
                <span>{new Date(event.start_at).toLocaleDateString()}</span>
                <span>{event.status}</span>
              </div>
              <h3>{event.title}</h3>
              <p>{event.city}</p>
              <p className="event-address">{event.venue_address}</p>
              <div className="chip-row">
                {event.disciplines.map((discipline) => (
                  <button
                    key={`${event.id}-${discipline.title}`}
                    type="button"
                    className="chip chip-button"
                    onClick={() => void handleRegister(event.id, discipline.title)}
                    disabled={pendingKey === `${event.id}:${discipline.title}`}
                  >
                    {pendingKey === `${event.id}:${discipline.title}` ? "Registering..." : `Register: ${discipline.title}`}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

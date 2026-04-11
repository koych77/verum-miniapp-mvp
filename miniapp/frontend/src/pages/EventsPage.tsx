import { EventItem } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

export function EventsPage({ events }: { events: EventItem[] }) {
  return (
    <SectionCard title="Events" subtitle="Vertical list with exact date and registration status">
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
                  <span key={`${event.id}-${discipline.title}`} className="chip">
                    {discipline.title}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

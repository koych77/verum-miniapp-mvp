import { useState } from "react";

import { api, EventItem, EventResult } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

export function EventsPage({ events }: { events: EventItem[] }) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [resultsCache, setResultsCache] = useState<Record<string, EventResult[]>>({});

  async function handleRegister(eventId: string, disciplineTitle: string) {
    const key = `${eventId}:${disciplineTitle}`;
    setPendingKey(key);
    setMessage("");
    try {
      const response = await api.registerForEvent(eventId, disciplineTitle);
      setMessage(response.status === "already_registered" ? "Ты уже зарегистрирован в этой номинации." : "Регистрация успешно добавлена.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось зарегистрироваться.");
    } finally {
      setPendingKey(null);
    }
  }

  async function handleToggle(slug: string) {
    if (expandedSlug === slug) {
      setExpandedSlug(null);
      return;
    }
    setExpandedSlug(slug);
    if (!resultsCache[slug]) {
      try {
        const rows = await api.getEventResults(slug);
        setResultsCache((prev) => ({ ...prev, [slug]: rows }));
      } catch {
        setResultsCache((prev) => ({ ...prev, [slug]: [] }));
      }
    }
  }

  return (
    <SectionCard title="Мероприятия" subtitle="Точный список событий, адреса, статусы и результаты">
      {message ? <div className="status-banner">{message}</div> : null}
      <div className="event-column">
        {events.map((event) => {
          const expanded = expandedSlug === event.slug;
          const results = resultsCache[event.slug] ?? [];

          return (
            <article key={event.id} className="event-card">
              <img src={event.poster_url ?? "https://dummyimage.com/900x1200/111111/ff7a00&text=VERUM+EVENT"} alt={event.title} />
              <div className="event-card-body">
                <div className="event-meta">
                  <span>{new Date(event.start_at).toLocaleDateString("ru-RU")}</span>
                  <span>{event.registration_open ? "регистрация открыта" : "регистрация закрыта"}</span>
                </div>
                <h3>{event.title}</h3>
                <p>
                  {event.city} · {event.organizer_name}
                </p>
                <p className="event-address">{event.venue_address}</p>
                <p className="event-description">{event.description}</p>
                <div className="event-counters">
                  <span>{event.participants_count} участников</span>
                  <span>{event.results_count} результатов</span>
                </div>
                <div className="chip-row">
                  {event.disciplines.map((discipline) => (
                    <button
                      key={`${event.id}-${discipline.title}`}
                      type="button"
                      className="chip chip-button"
                      onClick={() => void handleRegister(event.id, discipline.title)}
                      disabled={!event.registration_open || pendingKey === `${event.id}:${discipline.title}`}
                    >
                      {pendingKey === `${event.id}:${discipline.title}` ? "Отправка..." : discipline.title}
                    </button>
                  ))}
                </div>

                <button type="button" className="secondary-button" onClick={() => void handleToggle(event.slug)}>
                  {expanded ? "Скрыть детали" : "Подробнее и результаты"}
                </button>

                {expanded ? (
                  <div className="event-expanded">
                    <div className="event-expanded-grid">
                      <div>
                        <strong>Дедлайн регистрации</strong>
                        <span>{new Date(event.registration_deadline).toLocaleString("ru-RU")}</span>
                      </div>
                      <div>
                        <strong>Статус события</strong>
                        <span>{event.status}</span>
                      </div>
                    </div>
                    <div className="results-list">
                      {results.length ? (
                        results.map((result) => (
                          <div key={`${event.slug}-${result.verum_global_id}-${result.discipline_title}`} className="result-row">
                            <div>
                              <strong>{result.full_name}</strong>
                              <span>
                                {result.discipline_title} · {result.nickname}
                              </span>
                            </div>
                            <div className="result-meta">
                              <span>{result.final_place ? `Место: ${result.final_place}` : "Без финала"}</span>
                              <strong>{result.awarded_points} баллов</strong>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-state">Результаты ещё не опубликованы.</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}

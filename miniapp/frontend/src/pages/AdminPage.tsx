import { AdminOverview, EventItem } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

type AdminPageProps = {
  overview: AdminOverview | null;
  events: EventItem[];
};

function formatSourceLabel(source: string) {
  if (source === "self") return "Самостоятельно";
  if (source === "coach") return "Через тренера";
  return source;
}

export function AdminPage({ overview, events }: AdminPageProps) {
  if (!overview) {
    return <SectionCard title="Админ-панель">Загружаем административную сводку...</SectionCard>;
  }

  const upcomingEvents = events.slice(0, 3);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-label">ADMIN MODE</span>
          <h1>Панель администратора VERUM</h1>
          <p>Здесь собраны ключевые показатели платформы, свежие регистрации и последние действия внутри системы.</p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{overview.stats.total_participants}</strong>
            <span>Участников в системе</span>
          </div>
          <div>
            <strong>{overview.stats.total_events}</strong>
            <span>Событий в календаре</span>
          </div>
          <div>
            <strong>{overview.stats.open_events}</strong>
            <span>С открытой регистрацией</span>
          </div>
        </div>
      </section>

      <SectionCard title="Быстрая сводка" subtitle="Главные показатели, которые удобно показать на презентации">
        <div className="overview-grid">
          <article className="overview-card">
            <strong>{overview.stats.total_registrations}</strong>
            <span>Всего регистраций</span>
          </article>
          <article className="overview-card">
            <strong>{overview.stats.total_partners}</strong>
            <span>Партнёров в экосистеме</span>
          </article>
          <article className="overview-card">
            <strong>{overview.stats.pending_email_verification}</strong>
            <span>Аккаунтов без подтверждённого email</span>
          </article>
        </div>
      </SectionCard>

      <SectionCard title="Ближайшие события" subtitle="Три ближайших события, которые уже видят участники">
        <div className="list-grid">
          {upcomingEvents.map((event) => (
            <article key={event.id} className="event-list-card">
              <div className="event-list-top">
                <div className="event-date">{new Date(event.start_at).toLocaleDateString("ru-RU")}</div>
                <div className={`status-pill ${event.registration_open ? "open" : ""}`}>
                  {event.registration_open ? "Регистрация открыта" : "Регистрация закрыта"}
                </div>
              </div>
              <div>
                <h3>{event.title}</h3>
                <p>
                  {event.city} · {event.organizer_name}
                </p>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Последние регистрации" subtitle="Свежие заявки, пришедшие через приложение">
        <div className="results-list">
          {overview.recent_registrations.length ? (
            overview.recent_registrations.map((item) => (
              <div key={`${item.participant_verum_global_id}-${item.created_at}-${item.discipline_title}`} className="result-row">
                <div>
                  <strong>{item.participant_name}</strong>
                  <span>
                    {item.participant_verum_global_id} · {item.event_title}
                  </span>
                </div>
                <div className="result-meta">
                  <span>{item.discipline_title}</span>
                  <strong>{formatSourceLabel(item.source)}</strong>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">Пока нет новых регистраций.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Последние действия" subtitle="Что недавно происходило в системе">
        <div className="results-list">
          {overview.recent_activity.length ? (
            overview.recent_activity.map((item) => (
              <div key={`${item.entity_type}-${item.action}-${item.created_at}`} className="result-row">
                <div>
                  <strong>{item.actor_label}</strong>
                  <span>
                    {item.entity_type} · {item.action}
                  </span>
                </div>
                <div className="result-meta">
                  <span>{new Date(item.created_at).toLocaleString("ru-RU")}</span>
                  <strong>Audit</strong>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">Журнал действий пока пуст.</div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

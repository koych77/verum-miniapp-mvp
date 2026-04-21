import { FormEvent, useState } from "react";

import { api, OrganizerOverview } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

type OrganizerPageProps = {
  overview: OrganizerOverview | null;
  onRefresh: () => void;
};

export function OrganizerPage({ overview, onRefresh }: OrganizerPageProps) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  if (!overview) {
    return <SectionCard title="Кабинет организатора">Загружаем события организатора...</SectionCard>;
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const disciplineLines = String(formData.get("disciplines") || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    setPending(true);
    setMessage("");
    try {
      await api.createOrganizerEvent({
        title: String(formData.get("title") || ""),
        city: String(formData.get("city") || ""),
        venue_address: String(formData.get("venue_address") || ""),
        start_at: String(formData.get("start_at") || ""),
        registration_deadline: String(formData.get("registration_deadline") || ""),
        poster_url: String(formData.get("poster_url") || "") || null,
        description: String(formData.get("description") || ""),
        disciplines: disciplineLines.map((title) => ({
          title,
          format: title.toLowerCase().includes("3x3") ? "3v3" : title.toLowerCase().includes("2x2") ? "2v2" : "1v1",
          nomination_label: title
        }))
      });
      event.currentTarget.reset();
      setMessage("Событие создано как черновик. Админ проверит и откроет регистрацию.");
      onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось создать событие.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-label">ORGANIZER MODE</span>
          <h1>Кабинет организатора</h1>
          <p>Организатор создаёт мероприятия, задаёт дисциплины и отправляет событие на проверку администратору.</p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{overview.events.length}</strong>
            <span>Моих событий</span>
          </div>
          <div>
            <strong>{overview.total_registrations}</strong>
            <span>Заявок на мои события</span>
          </div>
        </div>
      </section>

      {message ? <div className="status-banner">{message}</div> : null}

      <SectionCard title="Мои мероприятия" subtitle="Черновик видит организатор и админ, участникам он появится после открытия регистрации">
        <div className="list-grid">
          {overview.events.length ? (
            overview.events.map((event) => (
              <article key={event.id} className="event-list-card">
                <div className="event-list-top">
                  <div className="event-date">{new Date(event.start_at).toLocaleDateString("ru-RU")}</div>
                  <div className={`status-pill ${event.status === "registration_open" ? "open" : ""}`}>{event.status}</div>
                </div>
                <div>
                  <h3>{event.title}</h3>
                  <p>
                    {event.city} · {event.participants_count} заявок · {event.disciplines.length} дисциплин
                  </p>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">У тебя пока нет созданных событий.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Создать событие" subtitle="Заполни основные данные. После создания админ сможет открыть регистрацию">
        <form className="profile-form" onSubmit={(event) => void handleCreateEvent(event)}>
          <label>
            <span>Название</span>
            <input name="title" required />
          </label>
          <label>
            <span>Город</span>
            <input name="city" required />
          </label>
          <label className="profile-form-wide">
            <span>Адрес площадки</span>
            <input name="venue_address" required />
          </label>
          <label>
            <span>Дата и время старта</span>
            <input name="start_at" type="datetime-local" required />
          </label>
          <label>
            <span>Дедлайн регистрации</span>
            <input name="registration_deadline" type="datetime-local" required />
          </label>
          <label className="profile-form-wide">
            <span>Постер URL</span>
            <input name="poster_url" placeholder="Можно оставить пустым" />
          </label>
          <label className="profile-form-wide">
            <span>Описание</span>
            <textarea name="description" required rows={4} />
          </label>
          <label className="profile-form-wide">
            <span>Дисциплины, каждая с новой строки</span>
            <textarea name="disciplines" required rows={4} placeholder={"Breaking 1x1\nKids 1x1 до 13 лет\nCrew 3x3"} />
          </label>
          <button type="submit" className="primary-button profile-form-wide" disabled={pending}>
            {pending ? "Создаём..." : "Создать черновик события"}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}

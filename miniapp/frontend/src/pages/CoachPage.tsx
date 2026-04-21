import { FormEvent, useState } from "react";

import { api, CoachOverview, EventItem, ParticipantSummary } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

type CoachPageProps = {
  overview: CoachOverview | null;
  onRefresh: () => void;
};

function firstOpenDiscipline(event: EventItem) {
  return event.disciplines[0]?.title || "";
}

export function CoachPage({ overview, onRefresh }: CoachPageProps) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  if (!overview) {
    return <SectionCard title="Кабинет тренера">Загружаем учеников и события...</SectionCard>;
  }

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    try {
      await api.createCoachStudent({
        first_name: String(formData.get("first_name") || ""),
        last_name: String(formData.get("last_name") || ""),
        nickname: String(formData.get("nickname") || ""),
        birth_date: String(formData.get("birth_date") || "2012-01-01"),
        gender: String(formData.get("gender") || "not_set"),
        city: String(formData.get("city") || ""),
        team: String(formData.get("team") || ""),
        school_name: String(formData.get("school_name") || ""),
        phone: String(formData.get("phone") || ""),
        photo_url: String(formData.get("photo_url") || "") || null
      });
      event.currentTarget.reset();
      setMessage("Ученик добавлен в твою группу.");
      onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось добавить ученика.");
    } finally {
      setPending(false);
    }
  }

  async function handleRegister(student: ParticipantSummary, selectedEvent: EventItem) {
    const disciplineTitle = firstOpenDiscipline(selectedEvent);
    if (!disciplineTitle) {
      setMessage("У события пока нет дисциплин для регистрации.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const response = await api.coachRegisterStudent(selectedEvent.id, student.verum_global_id, disciplineTitle);
      setMessage(response.status === "already_registered" ? `${student.full_name} уже зарегистрирован.` : `${student.full_name} зарегистрирован на ${disciplineTitle}.`);
      onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось зарегистрировать ученика.");
    } finally {
      setPending(false);
    }
  }

  const mainEvent = overview.open_events[0];

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-label">COACH MODE</span>
          <h1>Кабинет тренера</h1>
          <p>Тренер ведёт список учеников, добавляет новые профили и подаёт групповые заявки на события.</p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{overview.students.length}</strong>
            <span>Учеников в группе</span>
          </div>
          <div>
            <strong>{overview.open_events.length}</strong>
            <span>Событий открыто</span>
          </div>
          <div>
            <strong>{overview.recent_registrations.length}</strong>
            <span>Последних заявок</span>
          </div>
        </div>
      </section>

      {message ? <div className="status-banner">{message}</div> : null}

      <SectionCard title="Мои ученики" subtitle="Нажми кнопку регистрации, чтобы подать заявку за ученика на ближайшее открытое событие">
        <div className="participant-list">
          {overview.students.length ? (
            overview.students.map((student) => (
              <article key={student.verum_global_id} className="participant-card">
                <img src={student.photo_url} alt={student.full_name} />
                <div>
                  <strong>{student.full_name}</strong>
                  <span>
                    {student.nickname} · {student.city}
                  </span>
                  <span>
                    {student.team} · {student.school_name}
                  </span>
                  {mainEvent ? (
                    <button type="button" className="secondary-button inline-action" disabled={pending} onClick={() => void handleRegister(student, mainEvent)}>
                      На {mainEvent.title}
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">Пока нет учеников. Добавь первого ученика ниже.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Добавить ученика" subtitle="Создаётся профиль участника с VERUM ID и привязкой к твоему тренерскому кабинету">
        <form className="profile-form" onSubmit={(event) => void handleCreateStudent(event)}>
          <label>
            <span>Имя</span>
            <input name="first_name" required />
          </label>
          <label>
            <span>Фамилия</span>
            <input name="last_name" required />
          </label>
          <label>
            <span>Nickname</span>
            <input name="nickname" required />
          </label>
          <label>
            <span>Дата рождения</span>
            <input name="birth_date" type="date" required />
          </label>
          <label>
            <span>Пол</span>
            <select name="gender" defaultValue="not_set">
              <option value="not_set">Не указан</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
          </label>
          <label>
            <span>Город</span>
            <input name="city" required />
          </label>
          <label>
            <span>Команда</span>
            <input name="team" required />
          </label>
          <label>
            <span>Школа</span>
            <input name="school_name" required />
          </label>
          <label>
            <span>Телефон</span>
            <input name="phone" required />
          </label>
          <label className="profile-form-wide">
            <span>Фото URL</span>
            <input name="photo_url" placeholder="Можно оставить пустым" />
          </label>
          <button type="submit" className="primary-button profile-form-wide" disabled={pending}>
            {pending ? "Сохраняем..." : "Добавить ученика"}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Последние заявки группы" subtitle="История регистраций, отправленных тренером или самими учениками">
        <div className="results-list">
          {overview.recent_registrations.length ? (
            overview.recent_registrations.map((item) => (
              <div key={`${item.participant_verum_global_id}-${item.created_at}-${item.discipline_title}`} className="result-row">
                <div>
                  <strong>{item.participant_name}</strong>
                  <span>
                    {item.event_title} · {item.discipline_title}
                  </span>
                </div>
                <div className="result-meta">
                  <span>{new Date(item.created_at).toLocaleDateString("ru-RU")}</span>
                  <strong>{item.source === "coach" ? "Тренер" : "Ученик"}</strong>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">Заявок по ученикам пока нет.</div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

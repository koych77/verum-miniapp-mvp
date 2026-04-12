import { FormEvent, useState } from "react";

import { api, AuthStatus, ParticipantHistoryItem, ParticipantProfile } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

type ProfilePageProps = {
  profile: ParticipantProfile | null;
  auth: AuthStatus | null;
  history: ParticipantHistoryItem[];
  onProfileUpdated: (profile: ParticipantProfile) => void;
  onAuthUpdated: (auth: AuthStatus) => void;
};

function computeAgeFromDate(birthDate: string) {
  const nextBirth = new Date(birthDate);
  const today = new Date();
  let nextAge = today.getFullYear() - nextBirth.getFullYear();
  if (today.getMonth() < nextBirth.getMonth() || (today.getMonth() === nextBirth.getMonth() && today.getDate() < nextBirth.getDate())) {
    nextAge -= 1;
  }
  return nextAge;
}

export function ProfilePage({ profile, auth, history, onProfileUpdated, onAuthUpdated }: ProfilePageProps) {
  const [status, setStatus] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [devCode, setDevCode] = useState("");

  if (!profile || !auth) {
    return <SectionCard title="Мой профиль">Загружаем профиль...</SectionCard>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextProfile = {
      first_name: String(formData.get("first_name") || ""),
      last_name: String(formData.get("last_name") || ""),
      nickname: String(formData.get("nickname") || ""),
      birth_date: String(formData.get("birth_date") || profile.birth_date),
      gender: String(formData.get("gender") || ""),
      city: String(formData.get("city") || ""),
      team: String(formData.get("team") || ""),
      coach_name: String(formData.get("coach_name") || ""),
      school_name: String(formData.get("school_name") || ""),
      phone: String(formData.get("phone") || ""),
      email: String(formData.get("email") || ""),
      photo_url: String(formData.get("photo_url") || "")
    };

    try {
      await api.updateProfile(nextProfile);
      onProfileUpdated({
        ...profile,
        ...nextProfile,
        verum_global_id: profile.verum_global_id,
        age: computeAgeFromDate(nextProfile.birth_date)
      });
      onAuthUpdated({ ...auth, email: nextProfile.email });
      setStatus("Профиль сохранён. Обновлённые данные уже доступны в приложении.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось сохранить профиль.");
    }
  }

  async function handleSendCode() {
    try {
      const response = await api.sendEmailCode(auth.email);
      setDevCode(response.code ?? "");
      setStatus(response.code ? `Код отправлен. Тестовый код: ${response.code}` : "Код подтверждения отправлен на email.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось отправить код.");
    }
  }

  async function handleVerifyCode() {
    try {
      await api.verifyEmailCode(auth.email, verificationCode);
      onAuthUpdated({ ...auth, email_verified: true });
      setStatus("Email успешно подтверждён.");
      setVerificationCode("");
      setDevCode("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось подтвердить код.");
    }
  }

  return (
    <div className="page-stack">
      <section className="profile-hero">
        <img src={profile.photo_url} alt={`${profile.first_name} ${profile.last_name}`} />
        <div>
          <span className="hero-label">МОЙ ПРОФИЛЬ</span>
          <h1>
            {profile.first_name} {profile.last_name}
          </h1>
          <p>
            {profile.nickname} · {profile.age} лет · {profile.city}
          </p>
          <div className="hero-badges">
            <span className="status-pill open">VERUM ID {profile.verum_global_id}</span>
            <span className={`status-pill ${auth.email_verified ? "open" : ""}`}>
              {auth.email_verified ? "Email подтверждён" : "Email не подтверждён"}
            </span>
          </div>
        </div>
      </section>

      <SectionCard title="Публичная карточка" subtitle="Эти данные видят организаторы и другие участники платформы">
        <div className="profile-grid">
          <div>
            <strong>Пол</strong>
            <span>{profile.gender}</span>
          </div>
          <div>
            <strong>Город</strong>
            <span>{profile.city}</span>
          </div>
          <div>
            <strong>Команда</strong>
            <span>{profile.team}</span>
          </div>
          <div>
            <strong>Тренер</strong>
            <span>{profile.coach_name}</span>
          </div>
          <div>
            <strong>Школа</strong>
            <span>{profile.school_name}</span>
          </div>
          <div>
            <strong>Никнейм</strong>
            <span>{profile.nickname}</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Приватные данные" subtitle="Эти поля видишь только ты и администратор платформы">
        <div className="profile-grid">
          <div>
            <strong>Email</strong>
            <span>{auth.email}</span>
          </div>
          <div>
            <strong>Телефон</strong>
            <span>{profile.phone}</span>
          </div>
          <div>
            <strong>Telegram</strong>
            <span>{auth.telegram_username || "Не указан"}</span>
          </div>
          <div>
            <strong>Дата рождения</strong>
            <span>{new Date(profile.birth_date).toLocaleDateString("ru-RU")}</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Подтверждение email" subtitle="Нужно для надёжной связи по заявкам и обновлениям профиля">
        {status ? <div className="status-banner">{status}</div> : null}
        <div className="verification-box">
          <button type="button" className="secondary-button" onClick={() => void handleSendCode()}>
            Отправить код на email
          </button>
          <div className="verification-row">
            <input
              className="search-input"
              placeholder="Введите код подтверждения"
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value)}
            />
            <button type="button" className="primary-button" onClick={() => void handleVerifyCode()}>
              Подтвердить
            </button>
          </div>
          {devCode ? <div className="helper-text">Тестовый код для текущей сборки: {devCode}</div> : null}
        </div>
      </SectionCard>

      <SectionCard title="История выступлений" subtitle="События, результаты и полученные баллы в сезоне">
        <div className="results-list">
          {history.length ? (
            history.map((item, index) => (
              <div key={`${item.event_slug}-${index}`} className="result-row">
                <div>
                  <strong>{item.event_title}</strong>
                  <span>
                    {item.discipline_title} · {item.date ? new Date(item.date).toLocaleDateString("ru-RU") : "Дата уточняется"}
                  </span>
                </div>
                <div className="result-meta">
                  <span>{item.final_place ? `Место: ${item.final_place}` : item.top_stage || "Отбор"}</span>
                  <strong>{item.awarded_points} баллов</strong>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">История выступлений пока пуста.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Редактирование профиля" subtitle="Проверь, чтобы данные были точными: их используют для рейтинга и заявок">
        <form className="profile-form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>Имя</span>
            <input name="first_name" defaultValue={profile.first_name} />
          </label>
          <label>
            <span>Фамилия</span>
            <input name="last_name" defaultValue={profile.last_name} />
          </label>
          <label>
            <span>Никнейм</span>
            <input name="nickname" defaultValue={profile.nickname} />
          </label>
          <label>
            <span>Дата рождения</span>
            <input name="birth_date" type="date" defaultValue={profile.birth_date} />
          </label>
          <label>
            <span>Пол</span>
            <select name="gender" defaultValue={profile.gender}>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
              <option value="not_set">Не указан</option>
            </select>
          </label>
          <label>
            <span>Город</span>
            <input name="city" defaultValue={profile.city} />
          </label>
          <label>
            <span>Команда</span>
            <input name="team" defaultValue={profile.team} />
          </label>
          <label>
            <span>Тренер</span>
            <input name="coach_name" defaultValue={profile.coach_name} />
          </label>
          <label>
            <span>Школа</span>
            <input name="school_name" defaultValue={profile.school_name} />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" defaultValue={auth.email} />
          </label>
          <label>
            <span>Телефон</span>
            <input name="phone" defaultValue={profile.phone} />
          </label>
          <label className="profile-form-wide">
            <span>Ссылка на фото</span>
            <input name="photo_url" defaultValue={profile.photo_url} />
          </label>
          <button type="submit" className="primary-button profile-form-wide">
            Сохранить профиль
          </button>
        </form>
      </SectionCard>
    </div>
  );
}

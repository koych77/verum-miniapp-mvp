import { AuthStatus, Partner, ParticipantSummary } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

type MorePageProps = {
  partners: Partner[];
  participants: ParticipantSummary[];
  auth: AuthStatus | null;
};

export function MorePage({ partners, participants, auth }: MorePageProps) {
  return (
    <div className="page-stack">
      <SectionCard title="Партнёры VERUM" subtitle="Отдельный блок с подробной информацией о поддерживающих брендах">
        <div className="list-grid">
          {partners.map((partner) => (
            <article key={partner.slug} className="partner-inline">
              <div>
                <strong>{partner.name}</strong>
                <p>{partner.description}</p>
              </div>
              <a href={partner.website_url} target="_blank" rel="noreferrer">
                Сайт
              </a>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Тренерский кабинет" subtitle="MVP-сценарий, который уже заложен в архитектуру">
        <ul className="flat-list">
          <li>Добавление учеников и сохранение их как черновиков</li>
          <li>Регистрация учеников на мероприятия</li>
          <li>Просмотр рейтинга и истории выступлений учеников</li>
        </ul>
      </SectionCard>

      <SectionCard title="Кабинет организатора" subtitle="Доступен только после подтверждения админом">
        <ul className="flat-list">
          <li>Создание карточек мероприятий</li>
          <li>Отправка событий на модерацию</li>
          <li>Работа со статусами публикации</li>
        </ul>
      </SectionCard>

      <SectionCard title="Админский контур" subtitle="Что видит и контролирует админ серии">
        <ul className="flat-list">
          <li>Регистрации участников и изменения профилей</li>
          <li>Публикация новостей и модерация мероприятий</li>
          <li>Импорт результатов и пересчёт рейтинга</li>
          <li>Настройка коэффициентов и журнал действий</li>
        </ul>
      </SectionCard>

      <SectionCard title="Участники платформы" subtitle="Список карточек, уже попавших в экосистему VERUM">
        <div className="participant-list">
          {participants.map((participant) => (
            <article key={participant.verum_global_id} className="participant-card">
              <img src={participant.photo_url} alt={participant.full_name} />
              <div>
                <strong>{participant.full_name}</strong>
                <span>
                  {participant.nickname} · {participant.city}
                </span>
                <span>
                  {participant.team} · {participant.school_name}
                </span>
              </div>
            </article>
          ))}
        </div>
        {auth ? <div className="helper-text">Текущая роль аккаунта: {auth.role}</div> : null}
      </SectionCard>
    </div>
  );
}

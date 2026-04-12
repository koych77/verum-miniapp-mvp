import { AuthStatus, Partner, ParticipantSummary } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

type MorePageProps = {
  partners: Partner[];
  participants: ParticipantSummary[];
  auth: AuthStatus | null;
};

export function MorePage({ partners, participants, auth }: MorePageProps) {
  const communityPreview = participants.slice(0, 6);

  return (
    <div className="page-stack">
      <SectionCard title="Как пользоваться VERUM" subtitle="Коротко о том, что уже можно делать в приложении">
        <ul className="flat-list">
          <li>Следить за ближайшими событиями и быстро открывать нужную карточку.</li>
          <li>Смотреть общий рейтинг сезона и искать участников по имени, городу или команде.</li>
          <li>Обновлять свой профиль, подтверждать email и хранить историю выступлений в одном месте.</li>
        </ul>
      </SectionCard>

      <SectionCard title="Партнёры VERUM" subtitle="Организации и бренды, которые поддерживают развитие платформы">
        <div className="list-grid">
          {partners.length ? (
            partners.map((partner) => (
              <article key={partner.slug} className="partner-inline">
                <div>
                  <strong>{partner.name}</strong>
                  <p>{partner.description}</p>
                </div>
                <a href={partner.website_url} target="_blank" rel="noreferrer">
                  Сайт
                </a>
              </article>
            ))
          ) : (
            <div className="empty-state">Информация о партнёрах скоро появится.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Сообщество" subtitle="Несколько участников, уже добавленных в экосистему VERUM">
        <div className="participant-list">
          {communityPreview.length ? (
            communityPreview.map((participant) => (
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
            ))
          ) : (
            <div className="empty-state">Список участников появится после первых регистраций.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Помощь и доступ" subtitle="Что важно знать перед показом приложения участникам">
        <ul className="flat-list">
          <li>Если контент обновился, просто закрой Mini App и открой снова из чата бота.</li>
          <li>Админ-доступ открывается отдельным кодом в чате бота и не мешает обычным участникам.</li>
          <li>Текущая роль аккаунта: {auth?.role === "admin" ? "администратор" : "участник"}.</li>
        </ul>
      </SectionCard>
    </div>
  );
}

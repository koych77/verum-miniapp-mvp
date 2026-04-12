import { SectionCard } from "../components/SectionCard";
import { EventItem, NewsItem, ParticipantProfile, Partner, RatingItem } from "../lib/api";

type HomePageProps = {
  partners: Partner[];
  news: NewsItem[];
  events: EventItem[];
  top10: RatingItem[];
  profile: ParticipantProfile | null;
};

export function HomePage({ partners, news, events, top10, profile }: HomePageProps) {
  const upcoming = events.slice(0, 3);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-label">VERUM MINI APP</span>
          <h1>Рейтинг, события и история выступлений в одном понятном интерфейсе.</h1>
          <p>Участнику не нужно искать информацию по чатам: личный профиль, ближайшие события, новости и рейтинг всегда под рукой.</p>
        </div>
        {profile ? (
          <div className="hero-stats">
            <div>
              <strong>{profile.verum_global_id}</strong>
              <span>Твой VERUM ID</span>
            </div>
            <div>
              <strong>{profile.team}</strong>
              <span>Команда</span>
            </div>
            <div>
              <strong>{profile.city}</strong>
              <span>Город</span>
            </div>
          </div>
        ) : null}
      </section>

      <SectionCard title="Ближайшие события" subtitle="Самое важное из календаря VERUM на ближайшее время">
        <div className="list-grid">
          {upcoming.length ? (
            upcoming.map((event) => (
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
            ))
          ) : (
            <div className="empty-state">События скоро появятся. Календарь ещё наполняется.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Новости VERUM" subtitle="Свежие обновления команды и серии мероприятий">
        <div className="list-grid">
          {news.length ? (
            news.map((item) => (
              <article key={item.id} className="news-card">
                <div className="news-meta">{new Date(item.published_at).toLocaleDateString("ru-RU")}</div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))
          ) : (
            <div className="empty-state">Пока нет опубликованных новостей.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Топ-10 сезона" subtitle="Лидеры текущего сезона VERUM по сумме очков">
        <div className="rating-list">
          {top10.length ? (
            top10.map((item) => (
              <div key={item.verum_global_id} className="rating-row">
                <div className="rating-rank">{item.rank}</div>
                <div className="rating-main">
                  <strong>{item.full_name}</strong>
                  <span>
                    {item.nickname} · {item.city} · {item.team}
                  </span>
                </div>
                <div className="rating-points">{item.points}</div>
              </div>
            ))
          ) : (
            <div className="empty-state">Рейтинг сезона пока не сформирован.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Партнёры" subtitle="Бренды и организации, которые поддерживают экосистему VERUM">
        <div className="partner-grid">
          {partners.length ? (
            partners.map((partner) => (
              <article key={partner.slug} className="partner-card">
                <img src={partner.logo_url} alt={partner.name} />
                <h3>{partner.name}</h3>
                <p>{partner.description}</p>
                <a href={partner.website_url} target="_blank" rel="noreferrer">
                  Открыть сайт партнёра
                </a>
              </article>
            ))
          ) : (
            <div className="empty-state">Список партнёров скоро появится.</div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

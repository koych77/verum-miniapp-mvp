import { EventItem, NewsItem, Partner, RatingItem } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

type HomePageProps = {
  partners: Partner[];
  news: NewsItem[];
  events: EventItem[];
  top10: RatingItem[];
};

export function HomePage({ partners, news, events, top10 }: HomePageProps) {
  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-label">VERUM MINI APP</span>
          <h1>Sport premium hub for rankings, events and athlete profiles.</h1>
          <p>Partners, upcoming events, news and the global top 10 are all in one Telegram experience.</p>
        </div>
      </section>

      <SectionCard title="Partners" subtitle="Core ecosystem supporters of VERUM">
        <div className="partner-grid">
          {partners.map((partner) => (
            <article key={partner.slug} className="partner-card">
              <img src={partner.logo_url} alt={partner.name} />
              <h3>{partner.name}</h3>
              <p>{partner.description}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Upcoming events" subtitle="Nearest confirmed dates">
        <div className="list-grid">
          {events.map((event) => (
            <article key={event.id} className="event-list-card">
              <div className="event-date">{new Date(event.start_at).toLocaleDateString()}</div>
              <div>
                <h3>{event.title}</h3>
                <p>{event.city}</p>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="News" subtitle="5 latest updates from admin">
        <div className="list-grid">
          {news.map((item) => (
            <article key={item.id} className="news-card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Top 10 global rating" subtitle="Current season leaders">
        <div className="rating-list">
          {top10.map((item) => (
            <div key={item.verum_global_id} className="rating-row">
              <div className="rating-rank">{item.rank}</div>
              <div className="rating-main">
                <strong>{item.full_name}</strong>
                <span>{item.nickname}</span>
              </div>
              <div className="rating-points">{item.points}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

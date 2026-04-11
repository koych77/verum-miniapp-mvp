import { RatingItem } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

export function RatingPage({ ratings }: { ratings: RatingItem[] }) {
  return (
    <SectionCard title="Global rating" subtitle="Unified ranking with future filters by gender, nomination and events">
      <div className="rating-list">
        {ratings.map((item) => (
          <div key={item.verum_global_id} className="rating-row rating-row-wide">
            <div className="rating-rank">{item.rank}</div>
            <div className="rating-main">
              <strong>{item.full_name}</strong>
              <span>
                {item.nickname} · {item.city} · {item.team}
              </span>
            </div>
            <div className="rating-points">{item.points}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

import { useMemo, useState } from "react";

import { RatingItem } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

export function RatingPage({ ratings }: { ratings: RatingItem[] }) {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ratings.filter((item) => {
      const matchesSearch =
        !query ||
        item.full_name.toLowerCase().includes(query) ||
        item.nickname.toLowerCase().includes(query) ||
        item.city.toLowerCase().includes(query) ||
        item.team.toLowerCase().includes(query);
      const matchesGender = gender === "all" || item.gender === gender;
      return matchesSearch && matchesGender;
    });
  }, [gender, ratings, search]);

  return (
    <SectionCard title="Общий рейтинг" subtitle="Поиск по имени, нику, городу или команде и фильтр по полу">
      <div className="filters-row">
        <input
          className="search-input"
          placeholder="Найти участника"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="segmented">
          <button className={gender === "all" ? "active" : ""} onClick={() => setGender("all")} type="button">
            Все
          </button>
          <button className={gender === "male" ? "active" : ""} onClick={() => setGender("male")} type="button">
            Парни
          </button>
          <button className={gender === "female" ? "active" : ""} onClick={() => setGender("female")} type="button">
            Девушки
          </button>
        </div>
      </div>

      <div className="rating-list">
        {filtered.length ? (
          filtered.map((item) => (
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
          ))
        ) : (
          <div className="empty-state">По текущему фильтру участников не найдено.</div>
        )}
      </div>
    </SectionCard>
  );
}

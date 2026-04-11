import { useEffect, useMemo, useState } from "react";

import { Layout } from "./components/Layout";
import { api, EventItem, initAuth, NewsItem, ParticipantProfile, Partner, RatingItem } from "./lib/api";
import { EventsPage } from "./pages/EventsPage";
import { HomePage } from "./pages/HomePage";
import { MorePage } from "./pages/MorePage";
import { ProfilePage } from "./pages/ProfilePage";
import { RatingPage } from "./pages/RatingPage";

type TabKey = "home" | "rating" | "events" | "profile" | "more";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [top10, setTop10] = useState<RatingItem[]>([]);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [profile, setProfile] = useState<ParticipantProfile | null>(null);

  useEffect(() => {
    async function boot() {
      await initAuth();
      const [partnerRows, newsRows, eventRows, topRows, ratingRows, profileRow] = await Promise.all([
        api.getPartners(),
        api.getNews(),
        api.getEvents(),
        api.getTop10(),
        api.getRatings(),
        api.getProfile()
      ]);
      setPartners(partnerRows);
      setNews(newsRows);
      setEvents(eventRows);
      setTop10(topRows);
      setRatings(ratingRows);
      setProfile(profileRow);
    }

    void boot();
  }, []);

  const ticker = useMemo(() => partners.map((partner) => partner.name), [partners]);

  let content = <HomePage partners={partners} news={news} events={events} top10={top10} />;
  if (activeTab === "rating") content = <RatingPage ratings={ratings} />;
  if (activeTab === "events") content = <EventsPage events={events} />;
  if (activeTab === "profile") content = <ProfilePage profile={profile} />;
  if (activeTab === "more") content = <MorePage />;

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} ticker={ticker.length ? ticker : ["VERUM", "PARTNERS", "MINI APP"]}>
      {content}
    </Layout>
  );
}

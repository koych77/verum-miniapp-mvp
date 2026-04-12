import { useEffect, useState } from "react";

import { Layout } from "./components/Layout";
import {
  api,
  AuthStatus,
  EventItem,
  initAuth,
  NewsItem,
  ParticipantHistoryItem,
  ParticipantProfile,
  ParticipantSummary,
  Partner,
  RatingItem
} from "./lib/api";
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
  const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
  const [profile, setProfile] = useState<ParticipantProfile | null>(null);
  const [history, setHistory] = useState<ParticipantHistoryItem[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function boot() {
      try {
        setLoading(true);
        await initAuth();
        const [authRow, partnerRows, newsRows, eventRows, topRows, ratingRows, profileRow, historyRows, participantRows] =
          await Promise.all([
            api.getAuthMe(),
            api.getPartners(),
            api.getNews(),
            api.getEvents(),
            api.getTop10(),
            api.getRatings(),
            api.getProfile(),
            api.getProfileHistory(),
            api.getParticipants()
          ]);
        setAuth(authRow);
        setPartners(partnerRows);
        setNews(newsRows);
        setEvents(eventRows);
        setTop10(topRows);
        setRatings(ratingRows);
        setProfile(profileRow);
        setHistory(historyRows);
        setParticipants(participantRows);
      } catch (appError) {
        const message = appError instanceof Error ? appError.message : "Ошибка запуска Mini App";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void boot();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelector(".page-content")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeTab]);

  const partnerLogos = partners
    .filter((partner) => partner.logo_url)
    .map((partner) => ({
      name: partner.name,
      logoUrl: partner.logo_url,
      websiteUrl: partner.website_url
    }));

  let content = <HomePage partners={partners} news={news} events={events} top10={top10} profile={profile} />;
  if (activeTab === "rating") content = <RatingPage ratings={ratings} />;
  if (activeTab === "events") content = <EventsPage events={events} />;
  if (activeTab === "profile")
    content = <ProfilePage profile={profile} auth={auth} history={history} onProfileUpdated={setProfile} onAuthUpdated={setAuth} />;
  if (activeTab === "more") content = <MorePage partners={partners} participants={participants} auth={auth} />;

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} partnerLogos={partnerLogos}>
      {loading ? <div className="loading-screen">Загружаем VERUM Mini App...</div> : error ? <div className="error-banner">{error}</div> : content}
    </Layout>
  );
}

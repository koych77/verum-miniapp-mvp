const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("verum-demo-token");
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type Partner = {
  name: string;
  slug: string;
  logo_url: string;
  description: string;
  website_url: string;
};

export type NewsItem = {
  id: string;
  title: string;
  body: string;
  image_url?: string | null;
  event_slug?: string | null;
  published_at: string;
};

export type RatingItem = {
  rank: number;
  verum_global_id: string;
  full_name: string;
  nickname: string;
  city: string;
  team: string;
  points: number;
};

export type EventDiscipline = {
  title: string;
  format: string;
  nomination_label: string;
};

export type EventItem = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue_address: string;
  start_at: string;
  registration_deadline: string;
  poster_url?: string | null;
  description: string;
  status: string;
  organizer_name: string;
  disciplines: EventDiscipline[];
};

export type ParticipantProfile = {
  verum_global_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  age: number;
  gender: string;
  city: string;
  team: string;
  coach_name: string;
  school_name: string;
  photo_url: string;
  email: string;
  phone: string;
};

export async function initAuth() {
  const existing = localStorage.getItem("verum-demo-token");
  if (existing) {
    return existing;
  }
  const data = await request<{ token: string }>("/auth/telegram/init", {
    method: "POST",
    body: JSON.stringify({ initData: "demo" })
  });
  localStorage.setItem("verum-demo-token", data.token);
  return data.token;
}

export const api = {
  getPartners: () => request<Partner[]>("/partners"),
  getPartnerTicker: () => request<Partner[]>("/partners/ticker"),
  getNews: () => request<NewsItem[]>("/news"),
  getTop10: () => request<RatingItem[]>("/ratings/global/top10"),
  getRatings: () => request<RatingItem[]>("/ratings/global"),
  getEvents: () => request<EventItem[]>("/events"),
  getProfile: () => request<ParticipantProfile>("/participants/me")
};

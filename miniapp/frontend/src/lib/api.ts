const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? `${window.location.origin.replace(/\/$/, "")}/api/v1`;

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
  gender: string;
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
  registration_open: boolean;
  participants_count: number;
  results_count: number;
  disciplines: EventDiscipline[];
};

export type EventResult = {
  participant_id: string;
  verum_global_id: string;
  full_name: string;
  nickname: string;
  discipline_title: string;
  qualifying_place?: number | null;
  top_stage?: string | null;
  final_place?: number | null;
  awarded_points: number;
};

export type ParticipantProfile = {
  verum_global_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  birth_date: string;
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

export type ParticipantSummary = {
  verum_global_id: string;
  full_name: string;
  nickname: string;
  gender: string;
  city: string;
  team: string;
  school_name: string;
  photo_url: string;
};

export type ParticipantHistoryItem = {
  event_title: string;
  event_slug: string;
  date?: string | null;
  discipline_title: string;
  qualifying_place?: number | null;
  top_stage?: string | null;
  final_place?: number | null;
  awarded_points: number;
};

export type ParticipantUpdate = {
  first_name: string;
  last_name: string;
  nickname: string;
  birth_date: string;
  gender: string;
  city: string;
  team: string;
  coach_name: string;
  school_name: string;
  phone: string;
  email: string;
  photo_url: string;
};

export type AuthStatus = {
  role: string;
  email: string;
  telegram_username?: string | null;
  email_verified: boolean;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        initData?: string;
      };
    };
  }
}

export async function initAuth() {
  const existing = localStorage.getItem("verum-demo-token");
  if (existing) {
    return existing;
  }

  const initData = window.Telegram?.WebApp?.initData || "demo";
  window.Telegram?.WebApp?.ready?.();
  window.Telegram?.WebApp?.expand?.();

  const data = await request<{ token: string }>("/auth/telegram/init", {
    method: "POST",
    body: JSON.stringify({ initData })
  });

  localStorage.setItem("verum-demo-token", data.token);
  return data.token;
}

export const api = {
  getAuthMe: () => request<AuthStatus>("/auth/me"),
  sendEmailCode: (email: string) =>
    request<{ ok: boolean; delivery: string; code?: string }>("/auth/email/send-code", {
      method: "POST",
      body: JSON.stringify({ email })
    }),
  verifyEmailCode: (email: string, code: string) =>
    request<{ ok: boolean }>("/auth/email/verify-code", {
      method: "POST",
      body: JSON.stringify({ email, code })
    }),
  getPartners: () => request<Partner[]>("/partners"),
  getPartnerTicker: () => request<Partner[]>("/partners/ticker"),
  getNews: () => request<NewsItem[]>("/news"),
  getTop10: () => request<RatingItem[]>("/ratings/global/top10"),
  getRatings: () => request<RatingItem[]>("/ratings/global"),
  getEvents: () => request<EventItem[]>("/events"),
  getEventResults: (slug: string) => request<EventResult[]>(`/events/${slug}/results`),
  getParticipants: () => request<ParticipantSummary[]>("/participants"),
  getProfile: () => request<ParticipantProfile>("/participants/me"),
  getProfileHistory: () => request<ParticipantHistoryItem[]>("/participants/me/history"),
  updateProfile: (payload: ParticipantUpdate) =>
    request<{ ok: boolean; auditLogged: boolean; adminNotified: boolean }>("/participants/me", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  registerForEvent: (eventId: string, disciplineTitle: string) =>
    request<{ ok: boolean; status: string }>(`/events/${eventId}/register-self`, {
      method: "POST",
      body: JSON.stringify({ discipline_title: disciplineTitle })
    })
};

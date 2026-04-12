const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? `${window.location.origin.replace(/\/$/, "")}/api/v1`;
const TOKEN_KEY = "verum-demo-token";
const APP_VERSION_KEY = "verum-app-version";
const APP_RELOAD_MARKER_KEY = "verum-app-reload-marker";
const VERSION_POLL_INTERVAL_MS = 45_000;

let reauthPromise: Promise<string> | null = null;
let versionWatcherStarted = false;

function getInitData() {
  return window.Telegram?.WebApp?.initData || "demo";
}

function currentUrlWithVersion(version: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("v", version.slice(0, 12));
  return url.toString();
}

async function syncAppVersion() {
  try {
    const response = await fetch(`${API_BASE}/meta`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache"
      }
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { appVersion?: string };
    const nextVersion = data.appVersion?.trim();
    if (!nextVersion) {
      return;
    }

    const previousVersion = localStorage.getItem(APP_VERSION_KEY);
    const reloadMarker = sessionStorage.getItem(APP_RELOAD_MARKER_KEY);

    if (previousVersion && previousVersion !== nextVersion && reloadMarker !== nextVersion) {
      sessionStorage.setItem(APP_RELOAD_MARKER_KEY, nextVersion);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.setItem(APP_VERSION_KEY, nextVersion);
      window.location.replace(currentUrlWithVersion(nextVersion));
      return;
    }

    localStorage.setItem(APP_VERSION_KEY, nextVersion);
    if (reloadMarker === nextVersion) {
      sessionStorage.removeItem(APP_RELOAD_MARKER_KEY);
    }
  } catch {
    // Version sync is best-effort and should never block the app bootstrap.
  }
}

function startVersionWatcher() {
  if (versionWatcherStarted) {
    return;
  }
  versionWatcherStarted = true;
  window.setInterval(() => {
    void syncAppVersion();
  }, VERSION_POLL_INTERVAL_MS);
}

function initTelegramWebApp() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) {
    return;
  }

  webApp.ready?.();
  webApp.expand?.();
  webApp.disableVerticalSwipes?.();

  try {
    const fullscreenResult = webApp.requestFullscreen?.();
    if (fullscreenResult && typeof (fullscreenResult as Promise<void>).catch === "function") {
      void (fullscreenResult as Promise<void>).catch(() => {
        webApp.expand?.();
      });
    }
  } catch {
    webApp.expand?.();
  }
}

function parseErrorMessage(raw: string, status: number) {
  try {
    const parsed = JSON.parse(raw) as { detail?: string };
    if (parsed.detail === "Invalid token") {
      return "Сессия обновляется. Попробуй ещё раз через секунду.";
    }
    return parsed.detail || raw || `HTTP ${status}`;
  } catch {
    return raw || `HTTP ${status}`;
  }
}

async function createSessionToken() {
  const response = await fetch(`${API_BASE}/auth/telegram/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ initData: getInitData() })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseErrorMessage(text, response.status));
  }

  const data = (await response.json()) as { token: string };
  localStorage.setItem(TOKEN_KEY, data.token);
  return data.token;
}

async function ensureSession(force = false) {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing && !force) {
    return existing;
  }

  if (!reauthPromise) {
    if (force) {
      localStorage.removeItem(TOKEN_KEY);
    }
    initTelegramWebApp();
    reauthPromise = createSessionToken().finally(() => {
      reauthPromise = null;
    });
  }

  return reauthPromise;
}

async function request<T>(path: string, init?: RequestInit, retryOnAuth = true): Promise<T> {
  const token = path === "/auth/telegram/init" ? null : await ensureSession();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (response.status === 401 && retryOnAuth && path !== "/auth/telegram/init") {
    await ensureSession(true);
    return request<T>(path, init, false);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseErrorMessage(text, response.status));
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
        requestFullscreen?: () => void | Promise<void>;
        disableVerticalSwipes?: () => void;
        initData?: string;
      };
    };
  }
}

export async function bootstrapMiniApp() {
  initTelegramWebApp();
  await syncAppVersion();
  initTelegramWebApp();
  startVersionWatcher();
}

export async function initAuth() {
  return ensureSession(true);
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

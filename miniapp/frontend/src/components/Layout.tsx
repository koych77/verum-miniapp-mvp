import { ReactNode } from "react";

type TabKey = "home" | "rating" | "events" | "profile" | "more";

type LayoutProps = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  ticker: string[];
  children: ReactNode;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "home", label: "Главная" },
  { key: "rating", label: "Рейтинг" },
  { key: "events", label: "События" },
  { key: "profile", label: "Профиль" },
  { key: "more", label: "Ещё" }
];

export function Layout({ activeTab, onTabChange, ticker, children }: LayoutProps) {
  return (
    <div className="app-shell">
      <header className="top-brand">
        <div className="brand-mark">V</div>
        <div>
          <strong>VERUM Connect</strong>
          <span>Mini App платформы рейтинга</span>
        </div>
      </header>

      <div className="ticker-wrap">
        <div className="ticker-track">
          {[...ticker, ...ticker].map((item, index) => (
            <span key={`${item}-${index}`} className="ticker-item">
              {item}
            </span>
          ))}
        </div>
      </div>

      <main className="page-content">{children}</main>

      <nav className="bottom-bar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`bottom-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => onTabChange(tab.key)}
          >
            <span className="tab-icon" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

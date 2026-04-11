import { ReactNode } from "react";

type TabKey = "home" | "rating" | "events" | "profile" | "more";

type LayoutProps = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  ticker: string[];
  children: ReactNode;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "rating", label: "Rating" },
  { key: "events", label: "Events" },
  { key: "profile", label: "Profile" },
  { key: "more", label: "More" }
];

export function Layout({ activeTab, onTabChange, ticker, children }: LayoutProps) {
  return (
    <div className="app-shell">
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

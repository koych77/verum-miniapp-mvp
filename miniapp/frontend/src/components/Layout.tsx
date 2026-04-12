import { ReactNode } from "react";

type TabKey = "home" | "rating" | "events" | "profile" | "more";

type PartnerLogo = {
  name: string;
  logoUrl: string;
  websiteUrl: string;
};

type LayoutProps = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  partnerLogos: PartnerLogo[];
  profileTabLabel?: string;
  children: ReactNode;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "home", label: "\u0413\u043b\u0430\u0432\u043d\u0430\u044f" },
  { key: "rating", label: "\u0420\u0435\u0439\u0442\u0438\u043d\u0433" },
  { key: "events", label: "\u0421\u043e\u0431\u044b\u0442\u0438\u044f" },
  { key: "profile", label: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c" },
  { key: "more", label: "\u0415\u0449\u0451" }
];

export function Layout({ activeTab, onTabChange, partnerLogos, profileTabLabel, children }: LayoutProps) {
  const resolvedTabs = tabs.map((tab) => (tab.key === "profile" && profileTabLabel ? { ...tab, label: profileTabLabel } : tab));
  const baseTickerItems = partnerLogos.length
    ? partnerLogos
    : [
        { name: "VERUM", logoUrl: "", websiteUrl: "#" },
        { name: "VERUM", logoUrl: "", websiteUrl: "#" },
        { name: "VERUM", logoUrl: "", websiteUrl: "#" },
        { name: "VERUM", logoUrl: "", websiteUrl: "#" }
      ];
  const tickerItems: PartnerLogo[] = [...baseTickerItems];
  while (tickerItems.length < 10) {
    tickerItems.push(...baseTickerItems);
  }
  const logoSrc = `${import.meta.env.BASE_URL}verum-wordmark.png`;

  return (
    <div className="app-shell">
      <header className="top-brand">
        <div className="top-brand-logo-frame">
          <img className="top-brand-logo" src={logoSrc} alt="VERUM" />
        </div>
      </header>

      <div className="ticker-wrap" aria-label="\u041f\u0430\u0440\u0442\u043d\u0451\u0440\u044b VERUM">
        <div className="ticker-marquee">
          <div className="ticker-track">
            {tickerItems.map((partner, index) => (
              <TickerCard key={`${partner.name}-${index}`} partner={partner} />
            ))}
          </div>
          <div className="ticker-track" aria-hidden="true">
            {tickerItems.map((partner, index) => (
              <TickerCard key={`${partner.name}-clone-${index}`} partner={partner} />
            ))}
          </div>
        </div>
      </div>

      <main className="page-content">{children}</main>

      <nav className="bottom-bar">
        {resolvedTabs.map((tab) => (
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

type TickerCardProps = {
  partner: PartnerLogo;
};

function TickerCard({ partner }: TickerCardProps) {
  const content = <span className="ticker-fallback">{partner.name || "VERUM"}</span>;

  if (!partner.websiteUrl || partner.websiteUrl === "#") {
    return <div className="ticker-logo-link ticker-logo-static">{content}</div>;
  }

  return (
    <a className="ticker-logo-link" href={partner.websiteUrl} target="_blank" rel="noreferrer" aria-label={partner.name}>
      {content}
    </a>
  );
}

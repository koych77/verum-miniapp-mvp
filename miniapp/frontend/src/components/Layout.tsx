import { ReactNode, useState } from "react";

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
  children: ReactNode;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "home", label: "\u0413\u043b\u0430\u0432\u043d\u0430\u044f" },
  { key: "rating", label: "\u0420\u0435\u0439\u0442\u0438\u043d\u0433" },
  { key: "events", label: "\u0421\u043e\u0431\u044b\u0442\u0438\u044f" },
  { key: "profile", label: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c" },
  { key: "more", label: "\u0415\u0449\u0451" }
];

export function Layout({ activeTab, onTabChange, partnerLogos, children }: LayoutProps) {
  const baseTickerItems = partnerLogos.length
    ? partnerLogos
    : [
        { name: "VERUM", logoUrl: "", websiteUrl: "#" },
        { name: "VERUM", logoUrl: "", websiteUrl: "#" },
        { name: "VERUM", logoUrl: "", websiteUrl: "#" },
        { name: "VERUM", logoUrl: "", websiteUrl: "#" }
      ];
  const tickerItems = [...baseTickerItems, ...baseTickerItems, ...baseTickerItems];
  const logoSrc = `${import.meta.env.BASE_URL}verum-logo-white.png`;

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

type TickerCardProps = {
  partner: PartnerLogo;
};

function TickerCard({ partner }: TickerCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showFallback = !partner.logoUrl || imageFailed;

  const content = showFallback ? (
    <span className="ticker-fallback">{partner.name || "VERUM"}</span>
  ) : (
    <img className="ticker-logo" src={partner.logoUrl} alt={partner.name} onError={() => setImageFailed(true)} />
  );

  if (!partner.websiteUrl || partner.websiteUrl === "#") {
    return <div className="ticker-logo-link ticker-logo-static">{content}</div>;
  }

  return (
    <a className="ticker-logo-link" href={partner.websiteUrl} target="_blank" rel="noreferrer" aria-label={partner.name}>
      {content}
    </a>
  );
}

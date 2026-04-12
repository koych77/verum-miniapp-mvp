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
  { key: "home", label: "Р“Р»Р°РІРЅР°СЏ" },
  { key: "rating", label: "Р РµР№С‚РёРЅРі" },
  { key: "events", label: "РЎРѕР±С‹С‚РёСЏ" },
  { key: "profile", label: "РџСЂРѕС„РёР»СЊ" },
  { key: "more", label: "Р•С‰С‘" }
];

export function Layout({ activeTab, onTabChange, partnerLogos, children }: LayoutProps) {
  const tickerItems = partnerLogos.length
    ? partnerLogos
    : [
        { name: "VERUM", logoUrl: "", websiteUrl: "#" },
        { name: "VERUM", logoUrl: "", websiteUrl: "#" },
        { name: "VERUM", logoUrl: "", websiteUrl: "#" },
        { name: "VERUM", logoUrl: "", websiteUrl: "#" }
      ];
  const logoSrc = `${import.meta.env.BASE_URL}verum-logo-white.png`;

  return (
    <div className="app-shell">
      <header className="top-brand">
        <div className="top-brand-logo-frame">
          <img className="top-brand-logo" src={logoSrc} alt="VERUM" />
        </div>
      </header>

      <div className="ticker-wrap" aria-label="РџР°СЂС‚РЅРµСЂС‹ VERUM">
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

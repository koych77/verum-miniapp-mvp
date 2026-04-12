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
  const tickerItems = partnerLogos.length ? [...partnerLogos, ...partnerLogos] : [];

  return (
    <div className="app-shell">
      <header className="top-brand">
        <img className="top-brand-logo" src="/verum-logo-white.png" alt="VERUM" />
      </header>

      <div className="ticker-wrap" aria-label="РџР°СЂС‚РЅРµСЂС‹ VERUM">
        <div className="ticker-track">
          {tickerItems.map((partner, index) => (
            <a
              key={`${partner.name}-${index}`}
              className="ticker-logo-link"
              href={partner.websiteUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={partner.name}
            >
              <img className="ticker-logo" src={partner.logoUrl} alt={partner.name} />
            </a>
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

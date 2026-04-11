import { SectionCard } from "../components/SectionCard";

export function MorePage() {
  return (
    <div className="page-stack">
      <SectionCard title="Partners">
        <p>Dedicated partner page, detailed brand stories and sponsor visibility live here.</p>
      </SectionCard>
      <SectionCard title="Coach">
        <p>Coach cabinet: add athletes, manage drafts and submit registrations.</p>
      </SectionCard>
      <SectionCard title="Organizer">
        <p>Organizer cabinet: draft events and submit them to admin moderation.</p>
      </SectionCard>
      <SectionCard title="Admin">
        <p>Admin panel: moderation, imports, ratings and system notifications.</p>
      </SectionCard>
    </div>
  );
}

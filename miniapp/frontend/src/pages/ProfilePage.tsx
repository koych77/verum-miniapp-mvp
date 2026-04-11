import { ParticipantProfile } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

export function ProfilePage({ profile }: { profile: ParticipantProfile | null }) {
  if (!profile) {
    return <SectionCard title="My profile">Loading profile...</SectionCard>;
  }

  return (
    <div className="page-stack">
      <section className="profile-hero">
        <img src={profile.photo_url} alt={`${profile.first_name} ${profile.last_name}`} />
        <div>
          <span className="hero-label">MY PROFILE</span>
          <h1>
            {profile.first_name} {profile.last_name}
          </h1>
          <p>
            {profile.nickname} · {profile.age} years · {profile.city}
          </p>
        </div>
      </section>

      <SectionCard title="Public card">
        <div className="profile-grid">
          <div><strong>Gender</strong><span>{profile.gender}</span></div>
          <div><strong>Team</strong><span>{profile.team}</span></div>
          <div><strong>Coach</strong><span>{profile.coach_name}</span></div>
          <div><strong>School</strong><span>{profile.school_name}</span></div>
        </div>
      </SectionCard>

      <SectionCard title="Private data">
        <div className="profile-grid">
          <div><strong>Email</strong><span>{profile.email}</span></div>
          <div><strong>Phone</strong><span>{profile.phone}</span></div>
          <div><strong>VERUM ID</strong><span>{profile.verum_global_id}</span></div>
        </div>
      </SectionCard>
    </div>
  );
}

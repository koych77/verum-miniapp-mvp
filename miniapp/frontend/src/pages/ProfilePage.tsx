import { FormEvent, useMemo, useState } from "react";

import { api, ParticipantProfile } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

type ProfilePageProps = {
  profile: ParticipantProfile | null;
  onProfileUpdated: (profile: ParticipantProfile) => void;
};

export function ProfilePage({ profile, onProfileUpdated }: ProfilePageProps) {
  const [status, setStatus] = useState<string>("");
  const birthDate = useMemo(() => profile?.birth_date ?? "", [profile]);

  if (!profile) {
    return <SectionCard title="My profile">Loading profile...</SectionCard>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextProfile = {
      first_name: String(formData.get("first_name") || ""),
      last_name: String(formData.get("last_name") || ""),
      nickname: String(formData.get("nickname") || ""),
      birth_date: String(formData.get("birth_date") || birthDate),
      gender: String(formData.get("gender") || ""),
      city: String(formData.get("city") || ""),
      team: String(formData.get("team") || ""),
      coach_name: String(formData.get("coach_name") || ""),
      school_name: String(formData.get("school_name") || ""),
      phone: String(formData.get("phone") || ""),
      email: String(formData.get("email") || ""),
      photo_url: String(formData.get("photo_url") || "")
    };

    try {
      await api.updateProfile(nextProfile);
      onProfileUpdated({
        ...profile,
        ...nextProfile,
        birth_date: nextProfile.birth_date,
        verum_global_id: profile.verum_global_id
      });
      setStatus("Profile saved. Admin has been notified.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Profile update failed.");
    }
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

      <SectionCard title="Edit profile" subtitle="Changes save immediately and go to admin moderation log">
        {status ? <div className="status-banner">{status}</div> : null}
        <form className="profile-form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>First name</span>
            <input name="first_name" defaultValue={profile.first_name} />
          </label>
          <label>
            <span>Last name</span>
            <input name="last_name" defaultValue={profile.last_name} />
          </label>
          <label>
            <span>Nickname</span>
            <input name="nickname" defaultValue={profile.nickname} />
          </label>
          <label>
            <span>Birth date</span>
            <input name="birth_date" type="date" defaultValue={birthDate} />
          </label>
          <label>
            <span>Gender</span>
            <input name="gender" defaultValue={profile.gender} />
          </label>
          <label>
            <span>City</span>
            <input name="city" defaultValue={profile.city} />
          </label>
          <label>
            <span>Team</span>
            <input name="team" defaultValue={profile.team} />
          </label>
          <label>
            <span>Coach</span>
            <input name="coach_name" defaultValue={profile.coach_name} />
          </label>
          <label>
            <span>School</span>
            <input name="school_name" defaultValue={profile.school_name} />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" defaultValue={profile.email} />
          </label>
          <label>
            <span>Phone</span>
            <input name="phone" defaultValue={profile.phone} />
          </label>
          <label className="profile-form-wide">
            <span>Photo URL</span>
            <input name="photo_url" defaultValue={profile.photo_url} />
          </label>
          <button type="submit" className="primary-button profile-form-wide">
            Save profile
          </button>
        </form>
      </SectionCard>
    </div>
  );
}

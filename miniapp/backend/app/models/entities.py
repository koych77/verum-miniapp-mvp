import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    role: Mapped[str] = mapped_column(String(32), default="participant")
    telegram_user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    telegram_username: Mapped[str | None] = mapped_column(String(128), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    participant: Mapped["Participant | None"] = relationship(back_populates="user", uselist=False)


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    verum_global_id: Mapped[str] = mapped_column(String(32), unique=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, unique=True)
    first_name: Mapped[str] = mapped_column(String(120))
    last_name: Mapped[str] = mapped_column(String(120))
    nickname: Mapped[str] = mapped_column(String(120))
    birth_date: Mapped[date] = mapped_column(Date)
    gender: Mapped[str] = mapped_column(String(16))
    city: Mapped[str] = mapped_column(String(120))
    team: Mapped[str] = mapped_column(String(120))
    coach_name: Mapped[str] = mapped_column(String(120))
    school_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(64))
    photo_url: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User | None"] = relationship(back_populates="participant")
    registrations: Mapped[list["EventRegistration"]] = relationship(back_populates="participant")
    results: Mapped[list["EventResult"]] = relationship(back_populates="participant")
    snapshots: Mapped[list["RatingSnapshot"]] = relationship(back_populates="participant")


class Partner(Base):
    __tablename__ = "partners"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    logo_url: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    website_url: Mapped[str] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class News(Base):
    __tablename__ = "news"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_slug: Mapped[str | None] = mapped_column(String(120), nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(120))
    venue_address: Mapped[str] = mapped_column(Text)
    start_at: Mapped[datetime] = mapped_column(DateTime)
    registration_deadline: Mapped[datetime] = mapped_column(DateTime)
    poster_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="registration_open")
    organizer_name: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    disciplines: Mapped[list["EventDiscipline"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    registrations: Mapped[list["EventRegistration"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    results: Mapped[list["EventResult"]] = relationship(back_populates="event", cascade="all, delete-orphan")


class EventDiscipline(Base):
    __tablename__ = "event_disciplines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id"))
    title: Mapped[str] = mapped_column(String(200))
    format: Mapped[str] = mapped_column(String(16))
    nomination_label: Mapped[str] = mapped_column(String(200))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    event: Mapped["Event"] = relationship(back_populates="disciplines")


class EventRegistration(Base):
    __tablename__ = "event_registrations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id"))
    participant_id: Mapped[str] = mapped_column(ForeignKey("participants.id"))
    discipline_title: Mapped[str] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(String(32), default="self")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    event: Mapped["Event"] = relationship(back_populates="registrations")
    participant: Mapped["Participant"] = relationship(back_populates="registrations")


class EventResult(Base):
    __tablename__ = "event_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id"))
    participant_id: Mapped[str] = mapped_column(ForeignKey("participants.id"))
    discipline_title: Mapped[str] = mapped_column(String(200))
    qualifying_place: Mapped[int | None] = mapped_column(Integer, nullable=True)
    top_stage: Mapped[str | None] = mapped_column(String(32), nullable=True)
    final_place: Mapped[int | None] = mapped_column(Integer, nullable=True)
    awarded_points: Mapped[float] = mapped_column(Float, default=0)

    event: Mapped["Event"] = relationship(back_populates="results")
    participant: Mapped["Participant"] = relationship(back_populates="results")


class RatingSnapshot(Base):
    __tablename__ = "rating_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    participant_id: Mapped[str] = mapped_column(ForeignKey("participants.id"))
    season_year: Mapped[int] = mapped_column(Integer, default=datetime.utcnow().year)
    total_points: Mapped[float] = mapped_column(Float, default=0)
    rank_global: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    participant: Mapped["Participant"] = relationship(back_populates="snapshots")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    entity_type: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(120))
    payload: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

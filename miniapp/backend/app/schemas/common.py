from datetime import date, datetime

from pydantic import BaseModel, EmailStr


class PartnerOut(BaseModel):
    name: str
    slug: str
    logo_url: str
    description: str
    website_url: str


class NewsOut(BaseModel):
    id: str
    title: str
    body: str
    image_url: str | None = None
    event_slug: str | None = None
    published_at: datetime


class DisciplineOut(BaseModel):
    title: str
    format: str
    nomination_label: str


class EventOut(BaseModel):
    id: str
    slug: str
    title: str
    city: str
    venue_address: str
    start_at: datetime
    registration_deadline: datetime
    poster_url: str | None = None
    description: str
    status: str
    organizer_name: str
    disciplines: list[DisciplineOut] = []


class RatingItemOut(BaseModel):
    rank: int
    verum_global_id: str
    full_name: str
    nickname: str
    city: str
    team: str
    points: float


class ParticipantPublicOut(BaseModel):
    verum_global_id: str
    first_name: str
    last_name: str
    nickname: str
    age: int
    gender: str
    city: str
    team: str
    coach_name: str
    school_name: str
    photo_url: str


class ParticipantPrivateOut(ParticipantPublicOut):
    birth_date: date
    email: EmailStr
    phone: str


class ParticipantUpdateIn(BaseModel):
    first_name: str
    last_name: str
    nickname: str
    birth_date: date
    gender: str
    city: str
    team: str
    coach_name: str
    school_name: str
    phone: str
    email: EmailStr
    photo_url: str


class EmailSendIn(BaseModel):
    email: EmailStr


class EmailVerifyIn(BaseModel):
    email: EmailStr
    code: str


class TelegramInitIn(BaseModel):
    initData: str | None = None


class RegisterEventIn(BaseModel):
    discipline_title: str


class AuthOut(BaseModel):
    token: str
    role: str
    profile_status: str

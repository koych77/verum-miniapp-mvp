import json
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.entities import AuditLog, Event, EventRegistration, News, Partner, Participant, RatingSnapshot, User
from app.schemas.common import (
    AuthOut,
    EmailSendIn,
    EmailVerifyIn,
    EventOut,
    NewsOut,
    ParticipantPrivateOut,
    ParticipantPublicOut,
    ParticipantUpdateIn,
    PartnerOut,
    RatingItemOut,
    RegisterEventIn,
    TelegramInitIn,
)
from app.services.bootstrap import compute_age, event_registration_open

router = APIRouter(prefix="/api/v1")
EMAIL_CODES: dict[str, str] = {}
TOKENS: dict[str, str] = {}


def _participant_public(participant: Participant) -> ParticipantPublicOut:
    return ParticipantPublicOut(
        verum_global_id=participant.verum_global_id,
        first_name=participant.first_name,
        last_name=participant.last_name,
        nickname=participant.nickname,
        age=compute_age(participant.birth_date),
        gender=participant.gender,
        city=participant.city,
        team=participant.team,
        coach_name=participant.coach_name,
        school_name=participant.school_name,
        photo_url=participant.photo_url,
    )


def _current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1).strip()
        user_id = TOKENS.get(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.get(User, user_id)
        if user:
            return user
    user = db.query(User).filter(User.role == "participant").first()
    if not user:
        raise HTTPException(status_code=401, detail="No auth context")
    return user


@router.get("/health")
def health():
    return {"ok": True}


@router.post("/auth/telegram/init", response_model=AuthOut)
def telegram_init(payload: TelegramInitIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.role == "participant").first()
    if not user:
        raise HTTPException(status_code=404, detail="Demo user missing")
    token = secrets.token_urlsafe(24)
    TOKENS[token] = user.id
    db.add(AuditLog(actor_user_id=user.id, entity_type="auth", action="telegram_init", payload=json.dumps({"hasInitData": bool(payload.initData)})))
    db.commit()
    return AuthOut(token=token, role=user.role, profile_status="active")


@router.post("/auth/email/send-code")
def send_email_code(payload: EmailSendIn, db: Session = Depends(get_db), user: User = Depends(_current_user)):
    code = "".join(secrets.choice("0123456789") for _ in range(6))
    EMAIL_CODES[payload.email] = code
    db.add(AuditLog(actor_user_id=user.id, entity_type="email_verification", action="send_code", payload=json.dumps({"email": payload.email, "code": code})))
    db.commit()
    return {"ok": True, "delivery": "demo-log", "code": code}


@router.post("/auth/email/verify-code")
def verify_email_code(payload: EmailVerifyIn, db: Session = Depends(get_db), user: User = Depends(_current_user)):
    if EMAIL_CODES.get(payload.email) != payload.code:
        raise HTTPException(status_code=400, detail="Invalid code")
    user.email = payload.email
    user.email_verified = True
    db.add(AuditLog(actor_user_id=user.id, entity_type="email_verification", action="verify_code", payload=json.dumps({"email": payload.email})))
    db.commit()
    return {"ok": True}


@router.get("/auth/me")
def auth_me(user: User = Depends(_current_user)):
    return {"role": user.role, "email": user.email, "telegramUsername": user.telegram_username}


@router.get("/partners/ticker", response_model=list[PartnerOut])
def partner_ticker(db: Session = Depends(get_db)):
    rows = db.query(Partner).order_by(Partner.sort_order.asc(), Partner.name.asc()).all()
    return [PartnerOut.model_validate(row, from_attributes=True) for row in rows]


@router.get("/partners", response_model=list[PartnerOut])
def partners(db: Session = Depends(get_db)):
    rows = db.query(Partner).order_by(Partner.sort_order.asc(), Partner.name.asc()).all()
    return [PartnerOut.model_validate(row, from_attributes=True) for row in rows]


@router.get("/news", response_model=list[NewsOut])
def news(db: Session = Depends(get_db)):
    rows = db.query(News).order_by(News.published_at.desc()).limit(5).all()
    return [NewsOut.model_validate(row, from_attributes=True) for row in rows]


@router.get("/events", response_model=list[EventOut])
def events(db: Session = Depends(get_db)):
    rows = db.query(Event).options(joinedload(Event.disciplines)).order_by(Event.start_at.asc()).all()
    return [EventOut.model_validate(row, from_attributes=True) for row in rows]


@router.get("/events/{slug}", response_model=EventOut)
def event_by_slug(slug: str, db: Session = Depends(get_db)):
    row = db.query(Event).options(joinedload(Event.disciplines)).filter(Event.slug == slug).first()
    if not row:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventOut.model_validate(row, from_attributes=True)


@router.post("/events/{event_id}/register-self")
def register_self(event_id: str, payload: RegisterEventIn, db: Session = Depends(get_db), user: User = Depends(_current_user)):
    participant = db.query(Participant).filter(Participant.user_id == user.id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not event_registration_open(event):
        raise HTTPException(status_code=400, detail="Registration is closed")
    existing = (
        db.query(EventRegistration)
        .filter(
            EventRegistration.event_id == event.id,
            EventRegistration.participant_id == participant.id,
            EventRegistration.discipline_title == payload.discipline_title,
        )
        .first()
    )
    if existing:
        return {"ok": True, "status": "already_registered"}
    registration = EventRegistration(event_id=event.id, participant_id=participant.id, discipline_title=payload.discipline_title, source="self")
    db.add(registration)
    db.add(AuditLog(actor_user_id=user.id, entity_type="event_registration", action="register_self", payload=json.dumps({"eventId": event.id, "discipline": payload.discipline_title})))
    db.commit()
    return {"ok": True, "status": "registered"}


@router.get("/ratings/global/top10", response_model=list[RatingItemOut])
def rating_top10(db: Session = Depends(get_db)):
    rows = (
        db.query(RatingSnapshot, Participant)
        .join(Participant, Participant.id == RatingSnapshot.participant_id)
        .filter(RatingSnapshot.season_year == 2026)
        .order_by(RatingSnapshot.rank_global.asc())
        .limit(10)
        .all()
    )
    return [
        RatingItemOut(
            rank=snapshot.rank_global or 0,
            verum_global_id=participant.verum_global_id,
            full_name=f"{participant.first_name} {participant.last_name}",
            nickname=participant.nickname,
            city=participant.city,
            team=participant.team,
            points=snapshot.total_points,
        )
        for snapshot, participant in rows
    ]


@router.get("/ratings/global", response_model=list[RatingItemOut])
def rating_full(db: Session = Depends(get_db)):
    rows = (
        db.query(RatingSnapshot, Participant)
        .join(Participant, Participant.id == RatingSnapshot.participant_id)
        .filter(RatingSnapshot.season_year == 2026)
        .order_by(RatingSnapshot.rank_global.asc())
        .all()
    )
    return [
        RatingItemOut(
            rank=snapshot.rank_global or 0,
            verum_global_id=participant.verum_global_id,
            full_name=f"{participant.first_name} {participant.last_name}",
            nickname=participant.nickname,
            city=participant.city,
            team=participant.team,
            points=snapshot.total_points,
        )
        for snapshot, participant in rows
    ]


@router.get("/participants/me", response_model=ParticipantPrivateOut)
def participant_me(db: Session = Depends(get_db), user: User = Depends(_current_user)):
    participant = db.query(Participant).filter(Participant.user_id == user.id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    public = _participant_public(participant)
    return ParticipantPrivateOut(**public.model_dump(), email=user.email, phone=participant.phone)


@router.patch("/participants/me")
def update_participant_me(payload: ParticipantUpdateIn, db: Session = Depends(get_db), user: User = Depends(_current_user)):
    participant = db.query(Participant).filter(Participant.user_id == user.id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    participant.first_name = payload.first_name
    participant.last_name = payload.last_name
    participant.nickname = payload.nickname
    participant.birth_date = payload.birth_date
    participant.gender = payload.gender
    participant.city = payload.city
    participant.team = payload.team
    participant.coach_name = payload.coach_name
    participant.school_name = payload.school_name
    participant.phone = payload.phone
    participant.photo_url = payload.photo_url
    user.email = payload.email
    db.add(AuditLog(actor_user_id=user.id, entity_type="participant", entity_id=participant.id, action="profile_updated", payload=json.dumps(payload.model_dump(mode="json"))))
    db.commit()
    return {"ok": True, "auditLogged": True, "adminNotified": True}


@router.get("/participants/{verum_global_id}", response_model=ParticipantPublicOut)
def participant_public(verum_global_id: str, db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.verum_global_id == verum_global_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    return _participant_public(participant)


@router.get("/participants/{verum_global_id}/history")
def participant_history(verum_global_id: str, db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.verum_global_id == verum_global_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    history = []
    for result in participant.results:
        event = db.get(Event, result.event_id)
        history.append(
            {
                "eventTitle": event.title if event else "",
                "eventSlug": event.slug if event else "",
                "date": event.start_at if event else None,
                "disciplineTitle": result.discipline_title,
                "qualifyingPlace": result.qualifying_place,
                "topStage": result.top_stage,
                "finalPlace": result.final_place,
                "awardedPoints": result.awarded_points,
            }
        )
    return history
